import { Fill, H2, Paragraph, XStack, YStack } from '@hanzo/ui'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'

import { SwarmBar } from '~/agents/SwarmBar'
import { ArtifactPanel } from '~/artifact/ArtifactPanel'
import { artifactStore } from '~/artifact/store'
import { brand } from '~/brand'
import { Compose } from '~/compose/Compose'
import { faulted, fold, opening, parts, spoken, stopped, type Part as Piece, type Reply } from '~/compose/frames'
import { useHandoff } from '~/compose/link'
import { run } from '~/compose/stream'
import { history, type Conversation, type Payload } from '~/compose/submit'
import { useChannels } from '~/channels/store'
import { client, ESTATE } from '~/data/origin'
import { useModels } from '~/data/config'
import { useConvo } from '~/data/convos'
import { requireLogin } from '~/data/gate'
import { keys } from '~/data/keys'
import { useTurns } from '~/data/messages'
import { invalidate } from '~/data/query'
import * as store from '~/data/store'
import type { Message, Part } from '~/data/types'
import { InviteModal } from '~/presence/InviteModal'
import { Model } from '~/settings/Model'
import { pick } from '~/settings/models'
import { model as preferred, usePref } from '~/settings/prefs'
import { Header } from '~/shell/Header'
import { useFrame } from '~/shell/Root'
import { useTitle } from '~/shell/title'
import { TerminalPanel } from '~/terminal/TerminalPanel'
import { BrowseChannelsModal } from '~/channels/BrowseChannelsModal'
import { ShortcutsModal } from '~/shortcuts/ShortcutsModal'
import { ThemeModal } from '~/theme/ThemeModal'
import { ExportModal } from '~/thread/ExportModal'
import { Thread } from '~/thread/Thread'

/**
 * One piece of a reply, in the wire's vocabulary.
 *
 * The composer folds a run into a `Reply`, which is shaped for FOLDING — sparse
 * slots keyed by the server's own index — and the thread renders a `Message`,
 * which is shaped for READING. This is the one crossing between them, and it is
 * here because here is where those two modules meet.
 */
const piece = (p: Piece): Part => {
  switch (p.kind) {
    case 'text':
      return { type: 'text', text: p.text }
    case 'think':
      return { type: 'think', think: p.text }
    case 'tool':
      return {
        type: 'tool_call',
        tool_call: { name: p.name, args: p.args, output: p.output, status: p.status },
      }
    case 'image':
      return { type: 'image_url', image_url: { url: p.url } }
    case 'fault':
      return { type: 'error', error: p.text }
  }
}

/**
 * The reply, as a turn in the thread.
 *
 * `messageId` is the LOCAL one and never the server's, even once the server has
 * named it. The store replaces a turn by id, so adopting a new id mid-run would
 * strand the half-written turn and paint the rest of the answer beneath it as a
 * second one.
 */
const answered = (reply: Reply, local: string, conversationId: string | null): Message => ({
  messageId: local,
  conversationId,
  parentMessageId: reply.askedBy || null,
  role: 'assistant',
  text: spoken(reply),
  content: parts(reply).map(piece),
  busy: reply.status === 'running',
  error: reply.status === 'error',
  unfinished: reply.status === 'cancelled',
})

/**
 * A refusal, as a turn.
 *
 * It goes IN the thread rather than in a toast, because it is the answer to the
 * question above it: a message that scrolls away takes the explanation with it
 * and leaves a conversation that appears to have simply stopped. It hangs from
 * the last turn rather than from nothing, so it is the end of the thread and
 * not a second root competing with it.
 */
const refusal = (code: string, text: string, after: string | null): Message => ({
  messageId: `refused:${code}`,
  conversationId: null,
  parentMessageId: after,
  role: 'assistant',
  text,
  error: true,
})

/**
 * A conversation — `/` before it has an id, `/c/:id` after.
 *
 * ONE screen for both, deliberately. Starting a conversation is not a different
 * page from continuing one: the composer, the thread and the bar above them are
 * the same, and the only difference is whether the address bar has caught up. A
 * `/c/new` that redirects would be a second name for `/` to keep in step with it.
 *
 * The screen holds no conversation CONTENT. The turns live in `data/store`,
 * which is where the composer writes them and the thread reads them. What is
 * here is the JOINING — the route's id, the tab's title, the layout, and the
 * run's lifecycle, which is a routing question as much as a network one: a
 * first turn mints an id, and an id belongs in the address bar.
 */
export const Chat = () => {
  const { id = null } = useParams()
  const { rail, setRail } = useFrame()
  const navigate = useNavigate()
  const { search } = useLocation()

  // FREE AI: models load for a guest too. `ai.ts` now names the tenant with the
  // brand's `pk-`, so `models.list` resolves on the anonymous lane instead of
  // throwing AuthError — the gate that made this signed-in-only is obsolete. A
  // signed-in session still layers its token on for private, billed use.
  const models = useModels(true)

  const record = useConvo(id)
  const served = useTurns(id)

  const messages = store.useAtom(store.turns)
  const busy = store.useAtom(store.busy)
  const stop = store.useAtom(store.stop)
  const failure = store.useAtom(store.failure)
  const held = store.useAtom(store.convo)

  const [address, choose] = usePref(preferred)

  const { selected, rooms } = useChannels()
  const activeRoom = rooms.find((r) => r.key === selected)

  const activeTitle = activeRoom
    ? `#${activeRoom.roomId} (${activeRoom.channel})`
    : (record.data?.title ?? held?.title ?? 'New chat')

  useTitle(activeTitle)

  /** The conversation the screen is currently showing. Written when it opens,
   *  and read by anything that answers later, to ask whether it still applies. */
  const opened = useRef<string | null>(null)

  /**
   * A question that arrived in the address bar — hanzo.ai's front page, a
   * shared link, the palette's ask row. Read HERE, because the address bar
   * belongs to the router and the composer knows nothing about URLs. Reading
   * strikes the parameters out, so a reload does not ask again and the back
   * button does not re-send.
   */
  const strip = useCallback(
    (rest: string) => navigate({ search: rest }, { replace: true }),
    [navigate],
  )
  const asked = useHandoff(search, strip)

  /**
   * Ask, and paint the answer as it arrives.
   *
   * Nothing about the reply's SHAPE is decided here — `fold` is the composer's,
   * and it is pure. What is here is the lifecycle: mark the screen busy, put
   * every fold into the store, and answer the four ways a stream can end.
   *
   * A refused session opens the gate. A failure becomes a part IN the reply
   * rather than a toast, because it is the answer to the question above it and
   * a message that scrolls away takes the explanation with it.
   */
  /**
   * Write the turn that just streamed.
   *
   * `/v1/chat/completions` is the vendor-compatible face and records nothing, so
   * a streamed conversation has an answer and no history until something writes
   * one. `threads.record` is that write, into the SAME store the rail reads —
   * without an id it opens a thread and answers the one it opened, which is how
   * a first turn earns the address the browser then moves to.
   *
   * A write that fails leaves the address alone on purpose. The turn is on
   * screen either way, and an id in the bar is what says this conversation was
   * filed; putting one there for a write that did not land would say it twice
   * and be wrong once.
   */
  const keep = useCallback(
    async (payload: Payload, reply: Reply) => {
      const said = spoken(reply)
      if (!said) return
      const thread = await client(ESTATE)
        .threads.record(
          [
            { role: 'user', content: payload.text },
            { role: 'assistant', content: said },
          ],
          id ?? undefined,
        )
        .catch(() => null)
      if (!thread) return
      invalidate(keys.convos)
      if (!id) navigate(`/c/${thread}`, { replace: true })
    },
    [id, navigate],
  )

  const ask = useCallback(
    (payload: Payload, said: readonly Message[]) => {
      const local = `${payload.messageId}~`
      let reply = opening(payload.messageId)

      const paint = () => store.put(answered(reply, local, payload.conversationId))

      store.busy.set(true)
      paint()

      const close = run(
        { model: payload.model, messages: history(said, payload) },
        {
          chunk: (c) => {
            reply = fold(reply, c)
            paint()
          },
          ended: (whyEnded, fault) => {
            if (whyEnded === 'denied') requireLogin('anonymous')
            if (whyEnded === 'failed') reply = faulted(reply, fault ?? 'The model did not answer.')
            if (whyEnded === 'stopped') reply = stopped(reply)
            paint()
            store.busy.set(false)
            store.stop.set(null)
            artifactStore.updateTelemetry({ outputSummary: spoken(reply).slice(0, 200) })
            if (whyEnded === 'done') void keep(payload, reply)
          },
        },
      )

      store.stop.set({ cancel: close })
    },
    [],
  )

  /**
   * Opening a conversation is a RESET, not a merge. Four values are one fact —
   * the turns, whether one is arriving, how to end it, and the last refusal —
   * and clearing three of them is how a conversation opens showing the previous
   * one's error under a caret that never stops.
   *
   * It waits for the turns before it clears, so an id landing in the bar does
   * not blank the conversation already on screen, and it keys off the id, so a
   * re-read of the same conversation cannot throw away a turn arriving in it.
   *
   * It no longer asks whether a run is still going. A completion IS its
   * response — there is no job on the server to rejoin — so a reload ends the
   * answer rather than resuming it.
   */
  useEffect(() => {
    if (opened.current === id) return
    if (store.busy.get()) {
      opened.current = id
      return
    }
    if (id && !served.data) return
    opened.current = id
    store.reset(record.data ?? null, served.data ?? [])
  }, [id, record.data, served.data])

  /**
   * The composer built the payload; this puts it on the wire.
   *
   * The thread is read HERE and handed to the ask, because a completion holds no
   * conversation: every turn carries everything said so far. The composer does
   * not have the thread and must not learn about the store to get it.
   *
   * `true` is answered so the box empties — the draft is kept only when the
   * turn is HELD, and nothing holds one here.
   */
  const send = useCallback(
    (payload: Payload) => {
      const said = store.turns.get()

      const userMsg: Message = {
        messageId: payload.messageId,
        conversationId: payload.conversationId,
        parentMessageId: payload.parentMessageId,
        role: 'user',
        text: payload.text,
        files: payload.files,
      }

      store.put(userMsg)
      store.failure.set(null)

      artifactStore.updateTelemetry({ inputSummary: payload.text, model: payload.model })

      ask(payload, said)
      return true
    },
    [ask],
  )

  const { model } = useMemo(() => pick(address), [address])

  const conversation = useMemo<Conversation>(
    () => ({ conversationId: id, model }),
    [id, model],
  )

  const last = messages.length ? messages[messages.length - 1].messageId : null

  const turns = useMemo(
    () => (failure ? [...messages, refusal(failure.code, failure.text, last)] : messages),
    [messages, failure, last],
  )

  return (
    <>
      <Header
        title={activeTitle}
        rail={rail}
        onRail={() => setRail(!rail)}
      />

      <XStack flex={1} minHeight={0}>
        <YStack flex={1} minWidth={0} minHeight={0}>
          {turns.length === 0 && !busy ? (
            /* Centered ChatGPT / lux.chat Hero View */
            <Fill
              scroll={false}
              alignItems="center"
              justifyContent="center"
              paddingHorizontal="$4"
              paddingVertical="$6"
            >
              <YStack
                width="100%"
                maxWidth={768}
                alignItems="center"
                gap="$3"
              >
                {/* Brand / Hero Heading */}
                <YStack alignItems="center" gap="$1" marginBottom="$1">
                  <H2
                    fontSize="$7"
                    fontWeight="700"
                    color="$ink"
                    textAlign="center"
                    letterSpacing="-0.02em"
                  >
                    What can I help you ship?
                  </H2>
                  <Paragraph fontSize="$3" color="$color10" textAlign="center">
                    Multi-agent swarms, luxury commerce, Next.js 16, and cloud infrastructure.
                  </Paragraph>
                </YStack>

                {/* Multi-Agent Swarm Selector */}
                <SwarmBar />

                {/* Centered Composer with Examples Below */}
                <Compose
                  conversation={conversation}
                  parent={last}
                  busy={busy}
                  empty={true}
                  link={asked}
                  model={
                    <Model
                      models={models.data}
                      value={address}
                      onChange={choose}
                      size="sm"
                    />
                  }
                  onSend={send}
                  onStop={() => stop?.cancel()}
                  onTrouble={(say) => store.failure.set({ code: 'local', text: say })}
                />
              </YStack>
            </Fill>
          ) : (
            /* Active Conversation Thread with Bottom Pinned Composer */
            <>
              <Fill scroll={false}>
                <Thread
                  messages={turns}
                  busy={busy}
                />
              </Fill>

              <YStack
                borderTopWidth={1}
                borderColor="$borderColor"
                padding="$3"
                $md={{ padding: '$4' }}
              >
                {/* Multi-Agent Swarm Selector & Status */}
                <SwarmBar />

                <Compose
                  conversation={conversation}
                  parent={last}
                  busy={busy}
                  empty={false}
                  link={asked}
                  model={
                    <Model
                      models={models.data}
                      value={address}
                      onChange={choose}
                      size="sm"
                    />
                  }
                  onSend={send}
                  onStop={() => stop?.cancel()}
                  onTrouble={(say) => store.failure.set({ code: 'local', text: say })}
                />

                {brand.footer ? (
                  <Paragraph fontSize="$1" color="$color11" textAlign="center" paddingTop="$2">
                    {brand.footer}
                  </Paragraph>
                ) : null}
              </YStack>
            </>
          )}
        </YStack>

        {/* Artifacts and Sandbox Runner Canvas */}
        <ArtifactPanel />

        {/* Interactive Terminal & Cloud Sandbox Panel */}
        <TerminalPanel />
      </XStack>

      {/* Multiplayer Room Invite & Team Access Modal */}
      <InviteModal conversationId={id} />

      {/* Global Channel Discovery & Follow Modal */}
      <BrowseChannelsModal />

      {/* Live Duplex Agent Voice Call Modal */}

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <ShortcutsModal />

      {/* Theme & Glassmorphism Customizer Modal */}
      <ThemeModal />

      {/* Conversation Export & Branching Modal */}
      <ExportModal />
    </>
  )
}

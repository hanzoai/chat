import { Fill, Paragraph, XStack, YStack } from '@hanzo/ui'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'

import { brand } from '~/brand'
import { Compose } from '~/compose/Compose'
import { faulted, fold, opening, parts, spoken, stopped, type Part as Piece, type Reply } from '~/compose/frames'
import { useHandoff } from '~/compose/link'
import { run } from '~/compose/stream'
import { history, type Conversation, type Payload } from '~/compose/submit'
import { useModels } from '~/data/config'
import { useConvo } from '~/data/convos'
import { requireLogin } from '~/data/gate'
import { useTurns } from '~/data/messages'
import { why } from '~/data/missing'
import { useSession } from '~/data/session'
import * as store from '~/data/store'
import type { Message, Part } from '~/data/types'
import { Model } from '~/settings/Model'
import { pick } from '~/settings/models'
import { model as preferred, usePref } from '~/settings/prefs'
import { Header } from '~/shell/Header'
import { useFrame } from '~/shell/Root'
import { useTitle } from '~/shell/title'
import { Greeting } from '~/thread/Greeting'
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

  const { standing } = useSession()
  const models = useModels(standing === 'live')

  const record = useConvo(id)
  const served = useTurns(id)

  const messages = store.useAtom(store.turns)
  const busy = store.useAtom(store.busy)
  const stop = store.useAtom(store.stop)
  const failure = store.useAtom(store.failure)
  const held = store.useAtom(store.convo)

  const [address, choose] = usePref(preferred)

  useTitle(record.data?.title ?? held?.title)

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
            if (whyEnded === 'failed') reply = faulted(reply, fault ?? why.write)
            if (whyEnded === 'stopped') reply = stopped(reply)
            paint()
            store.busy.set(false)
            store.stop.set(null)
          },
        },
      )

      store.stop.set(() => close())
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
      // Every route this client asks for needs a session, and the SDK refuses
      // before it sends when there is none — so the gate opens HERE, while the
      // question is still in the box. `false` keeps the draft, so signing in
      // returns somebody to the sentence they wrote rather than to an empty one.
      if (standing !== 'live') {
        requireLogin('anonymous')
        return false
      }

      const said = store.turns.get()

      store.put({
        messageId: payload.messageId,
        conversationId: payload.conversationId,
        parentMessageId: payload.parentMessageId,
        role: 'user',
        text: payload.text,
      })
      store.failure.set(null)

      ask(payload, said)
      return true
    },
    [ask, standing],
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

  const title = record.data?.title ?? held?.title ?? 'New chat'

  return (
    <>
      <Header
        title={title}
        rail={rail}
        onRail={() => setRail(!rail)}
      />

      <XStack flex={1} minHeight={0}>
        <YStack flex={1} minWidth={0} minHeight={0}>
          {/* `Thread` is the scroller AND the reading measure, so nothing here
              states a width for the turns — and it owns following the answer
              down, which is why no effect in this file touches the scroll. */}
          <Fill scroll={false}>
            <Thread
              messages={turns}
              busy={busy}
              greeting={
                <Greeting
                  hint={`Ask ${brand.title} anything.`}
                />
              }
            />
          </Fill>

          {/* `Compose` owns the box AND its measure — it caps itself at the same
              768 the thread reads at, so nothing here states a width. Stating
              one anyway is how a composer and the column it writes into end up
              agreeing today and eight pixels apart after one edit. What crosses
              here is the draft's context and where the turn goes. */}
          <YStack
            borderTopWidth={1}
            borderColor="$borderColor"
            padding="$3"
            $md={{ padding: '$4' }}
          >
            <Compose
              conversation={conversation}
              parent={last}
              busy={busy}
              empty={messages.length === 0}
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
              onStop={() => stop?.()}
              onTrouble={(say) => store.failure.set({ code: 'local', text: say })}
            />

            {/* A turn is answered by `/v1/chat/completions`, which persists
                nothing, and there is no route to record one — so a reader is
                told plainly rather than discovering it on their next visit.
                Shown once there is something that would have been saved. */}
            {messages.length > 0 ? (
              <Paragraph fontSize="$1" color="$color11" textAlign="center" paddingTop="$2">
                {why.write}
              </Paragraph>
            ) : null}

            {/* The brand's own line, when it has one. Inside the composer's
                block so it shares that measure rather than stating a second. */}
            {brand.footer ? (
              <Paragraph fontSize="$1" color="$color11" textAlign="center" paddingTop="$2">
                {brand.footer}
              </Paragraph>
            ) : null}
          </YStack>
        </YStack>

      </XStack>
    </>
  )
}

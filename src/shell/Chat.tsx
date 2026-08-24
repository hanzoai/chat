import { Fill, XStack, YStack } from '@hanzo/ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'

import { Compose } from '~/compose/Compose'
import { fold, opening, parts, spoken, type Part as Piece, type Reply } from '~/compose/frames'
import { useHandoff } from '~/compose/link'
import { listen, running, start, stop as halt } from '~/compose/stream'
import { AGENTS, type Conversation, type Payload } from '~/compose/submit'
import { useConfig, useEndpoints, useModels } from '~/data/config'
import { useConvo } from '~/data/convos'
import { refuse, requireLogin } from '~/data/gate'
import { Refused } from '~/data/http'
import { keys } from '~/data/keys'
import { useTurns } from '~/data/messages'
import { invalidate } from '~/data/query'
import { useSession } from '~/data/session'
import * as store from '~/data/store'
import { explain, type Message, type Part } from '~/data/types'
import { useNarrow } from '~/gui'
import { Model } from '~/settings/Model'
import { pick } from '~/settings/models'
import { model as preferred, usePref } from '~/settings/prefs'
import { Aside } from '~/shell/Aside'
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
  conversationId: reply.conversationId ?? conversationId,
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
  const narrow = useNarrow()

  const { standing } = useSession()
  const config = useConfig()
  const endpoints = useEndpoints()
  const models = useModels()

  const record = useConvo(id)
  const served = useTurns(id)

  const messages = store.useAtom(store.turns)
  const busy = store.useAtom(store.busy)
  const stop = store.useAtom(store.stop)
  const failure = store.useAtom(store.failure)
  const held = store.useAtom(store.convo)

  const [aside, setAside] = useState(false)
  const [address, choose] = usePref(preferred)

  useTitle(record.data?.title ?? held?.title, config.data?.appTitle)

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
   * Hear a run and paint it.
   *
   * The same three lines serve a turn just sent and a turn found already in
   * flight, which is the whole reason it is one function: a reload during a
   * long answer rejoins the stream with `resume`, and a rejoin that painted
   * differently from the original would be a second renderer of the same run.
   *
   * Nothing about the reply's SHAPE is decided here — `fold` is the composer's,
   * and it is pure. Three of the five ways a stream can end are answered
   * differently, which is why it is told which: a refused token opens the gate,
   * a connection that kept dropping is a sentence, and the rest are simply over.
   */
  const follow = useCallback(
    (streamId: string, local: string, askedBy: string, convoId: string | null, resume = false) => {
      let reply = opening(askedBy)
      store.busy.set(true)

      const finish = () => {
        store.busy.set(false)
        store.stop.set(null)
        const settled = reply.conversationId ?? convoId
        invalidate(keys.convos)
        if (settled) invalidate(keys.turns(settled))
      }

      const close = listen(
        streamId,
        {
          frame: (f) => {
            reply = fold(reply, f)
            store.put(answered(reply, local, convoId))
            // The id the server mints on a first turn belongs in the address
            // bar. `replace`, because the URL somebody arrived at and the URL
            // it became are one step, not two to press back through.
            if (!convoId && reply.conversationId) {
              navigate(`/c/${reply.conversationId}`, { replace: true })
            }
          },
          ended: (why) => {
            if (why === 'denied') requireLogin('anonymous')
            if (why === 'lost') {
              store.failure.set({
                code: 'lost',
                text: 'The connection kept dropping. The answer may still be running — reload to pick it up.',
              })
            }
            finish()
          },
        },
        { resume },
      )

      // Stopping ENDS THE RUN, which is not the same as closing the socket: the
      // server answers a stop by writing a closing frame, so the reply finishes
      // the way every other reply finishes — through the fold, in one place.
      store.stop.set(() => {
        void halt({ streamId, conversationId: convoId ?? undefined })
        close()
      })
    },
    [navigate],
  )

  /**
   * Opening a conversation is a RESET, not a merge. Five values are one fact —
   * the turns, whether one is arriving, how to end it, the record and the last
   * refusal — and clearing four of them is how a conversation opens showing the
   * previous one's error under a caret that never stops.
   *
   * It waits for the turns before it clears, so an id landing in the bar does
   * not blank the conversation already on screen, and it keys off the id, so a
   * re-read of the same conversation cannot throw away a turn arriving in it.
   *
   * Then it asks whether the server is still answering one. That question is
   * what makes the stream's `resume` worth having — an answer outlives the tab
   * that asked for it, so a reload picks it back up instead of showing a
   * finished-looking conversation with half an answer in it. It is asked HERE
   * rather than in an effect of its own so it cannot race the reset and be
   * wiped by it; the reply is checked against the conversation still open,
   * because a probe outlives the screen that sent it.
   */
  useEffect(() => {
    if (opened.current === id) return
    // A run already in flight has this conversation on screen, and its turns are
    // the live ones. This is exactly the moment a first turn mints an id and the
    // address bar catches up — resetting here would replace the reply being
    // written with the half of it the server has stored so far.
    if (store.busy.get()) {
      opened.current = id
      return
    }
    if (id && !served.data) return
    opened.current = id
    store.reset(record.data ?? null, served.data ?? [])
    if (!id) return
    void running(id).then((streamId) => {
      if (streamId && opened.current === id) follow(streamId, `${id}~live`, '', id, true)
    })
  }, [id, record.data, served.data, follow])

  /**
   * The composer built the payload; this puts it on the wire.
   *
   * `true` is answered so the box empties — the draft is kept only when the
   * turn is HELD, and nothing holds one here.
   */
  const send = useCallback(
    (payload: Payload) => {
      store.put({
        messageId: payload.messageId,
        conversationId: payload.conversationId,
        parentMessageId: payload.parentMessageId,
        role: 'user',
        text: payload.text,
        createdAt: payload.clientTimestamp,
      })
      store.failure.set(null)
      store.busy.set(true)

      void start(payload.endpoint, payload)
        .then((streamId) =>
          follow(streamId, `${payload.messageId}~`, payload.messageId, payload.conversationId),
        )
        .catch((error: unknown) => {
          store.busy.set(false)
          store.stop.set(null)
          // A spent preview and a lapsed session are the gate's — `refuse` says
          // which, and opens it. Everything else is a sentence in the thread,
          // read from the body's own code, never the upstream's own words.
          if (refuse(error)) return
          store.failure.set(explain(error instanceof Refused ? error.body : error))
        })

      return true
    },
    [follow],
  )

  const { endpoint, model } = useMemo(() => pick(address), [address])

  const conversation = useMemo<Conversation>(
    () => ({
      conversationId: id,
      endpoint: endpoint || record.data?.endpoint || AGENTS,
      model: model || record.data?.model || undefined,
      agent_id: record.data?.agent_id,
      spec: record.data?.spec,
    }),
    [id, endpoint, model, record.data],
  )

  const last = messages.length ? messages[messages.length - 1].messageId : null

  const turns = useMemo(
    () => (failure ? [...messages, refusal(failure.code, failure.text, last)] : messages),
    [messages, failure, last],
  )

  const title = record.data?.title ?? held?.title ?? config.data?.appTitle ?? 'New chat'
  const details = !narrow

  return (
    <>
      <Header
        title={title}
        id={id}
        rail={rail}
        onRail={() => setRail(!rail)}
        sharing={config.data?.sharedLinksEnabled === true && standing === 'live'}
        details={details}
        aside={aside}
        onAside={() => setAside((was) => !was)}
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
                  hint={config.data?.appTitle ? `Ask ${config.data.appTitle} anything.` : undefined}
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
              servers={Object.keys(config.data?.mcpServers ?? {})}
              model={
                <Model
                  endpoints={endpoints.data}
                  models={models.data}
                  specs={config.data?.modelSpecs?.list}
                  value={address}
                  onChange={choose}
                  size="sm"
                />
              }
              onSend={send}
              onStop={() => stop?.()}
              onTrouble={(say) => store.failure.set({ code: 'local', text: say })}
            />
          </YStack>
        </YStack>

        {/* Its own column, never an overlay — and not offered at all where
            there is no room for one beside the conversation. */}
        {aside && details ? (
          <Aside convo={record.data ?? held} onClose={() => setAside(false)} />
        ) : null}
      </XStack>
    </>
  )
}

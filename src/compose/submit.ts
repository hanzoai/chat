/**
 * The turn, as the server takes it.
 *
 * One function, and its whole job is to say what a send IS: the text, the files
 * riding with it, the tools it is allowed, and where it hangs in the thread.
 *
 * IT READS THE CONVERSATION, IT DOES NOT VALIDATE IT — the one rule this file
 * exists to hold. The shape it needs is a single string, and the version that
 * ran a whole-conversation schema parse to get it threw on every turn after the
 * first, because the schema declares `messages` as ids while an open thread
 * holds them populated. The throw escaped where nothing caught it: no request
 * was sent, no error path ran, and the composer hung with a thinking indicator
 * over a send the server never heard about. A validation whose only failure
 * mode is an unreadable hang, on a value nobody validates, is worse than none.
 */

/**
 * A file riding on this turn.
 *
 * It exists in the draft from the moment it is chosen, which is why `here` is
 * a field rather than an assumption: until the server holds the bytes, the
 * record is a promise about a file and the turn must not go out on it.
 */
export interface Attached {
  file_id: string
  filepath: string
  filename: string
  type: string
  height?: number
  width?: number
  /** The server has it. */
  here: boolean
}

/**
 * The tools this turn carries — fields on the turn's own throwaway agent.
 *
 * There is no second tool system: the menu writes these fields, the server
 * reads the same object and turns each one into a tool. That is why a
 * standalone plugins page could be deleted rather than rebuilt.
 */
export interface Tools {
  web_search?: boolean
  execute_code?: boolean
  file_search?: boolean
  /** MCP servers, by name. */
  mcp?: string[]
}

/** What the composer holds: everything the reader has put into the turn. */
export interface Draft {
  text: string
  files: Attached[]
  tools: Tools
}

/** An empty draft. The one place the empty value is spelled. */
export const blank: Draft = { text: '', files: [], tools: {} }

/**
 * Only the fields a payload reads off a conversation.
 *
 * Structural, so the store's own richer type passes without a cast and without
 * this file owning a second, drifting copy of it.
 */
export interface Conversation {
  conversationId?: string | null
  endpoint?: string | null
  model?: string | null
  agent_id?: string | null
  spec?: string | null
}

/** The id a first turn hangs from: the thread's root, not a missing parent. */
export const ROOT = '00000000-0000-0000-0000-000000000000'

/** The route family a turn is posted to. `/v1/chat/agents/chat/:endpoint`. */
export const AGENTS = 'agents'

export interface Payload {
  text: string
  /** Minted here so the turn can be drawn before the server answers. The
   *  server replies with its own id in the opening frame. */
  messageId: string
  parentMessageId: string
  conversationId: string | null
  endpoint: string
  model?: string
  agent_id?: string
  spec?: string
  /** The attachments, minus the two fields that are the composer's own. */
  files?: Omit<Attached, 'filename' | 'here'>[]
  ephemeralAgent?: Tools
  /** True only when finishing a reply that stopped short. */
  isContinued: boolean
  isRegenerate?: boolean
  /** A conversation that is never written down. */
  isTemporary?: boolean
  /** Which reply this turn replaces, when it replaces one. */
  responseMessageId?: string | null
  overrideParentMessageId?: string | null
  sender: 'User'
  isCreatedByUser: true
  /** The reader's own clock, so a turn sorts correctly before the server has
   *  stamped it. Local time in ISO shape, which is what the server stores. */
  clientTimestamp: string
}

export interface Send {
  draft: Draft
  conversation: Conversation | null
  /** The message this turn answers — the last one in the thread. Absent means
   *  this is the first, and it hangs from the root. */
  parent?: string | null
  /** Asking again for the same question. `parent` is the question, and the
   *  reply it replaces is named so the server overwrites rather than appends. */
  again?: { replaces: string }
  temporary?: boolean
}

const now = () => new Date().toLocaleString('sv').replace(' ', 'T')

/**
 * Drop the keys the server has no use for, so a payload reads as what it is
 * rather than as a form of empty fields.
 *
 * `undefined` and `''` go; `null` STAYS. The two are not the same claim: an
 * absent field was never set, while `conversationId: null` is this client
 * saying "there is no conversation yet — name one". Stripping the null asks
 * the server to guess, and it guesses the last one.
 */
const kept = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as T

/**
 * The draft, addressed.
 *
 * `conversationId` is null for a conversation that has none yet — that is the
 * signal the server names one, and it is NOT the string `new`, which is only
 * ever a route.
 */
export const payload = ({ draft, conversation, parent, again, temporary }: Send): Payload => {
  const tools = kept(draft.tools)
  // Typed on the way in rather than cast on the way out: a cast here would let
  // a field be renamed on one side of the wire and nowhere else.
  const turn: Payload = {
    text: draft.text.trim(),
    messageId: crypto.randomUUID(),
    parentMessageId: parent ?? ROOT,
    conversationId: conversation?.conversationId ?? null,
    endpoint: conversation?.endpoint ?? AGENTS,
    model: conversation?.model ?? undefined,
    agent_id: conversation?.agent_id ?? undefined,
    spec: conversation?.spec ?? undefined,
    // Only the fields the server reads. `filename` and `here` are the
    // composer's own — one to draw a chip with, one to know the bytes landed —
    // and a payload carrying them invites a server to start believing them.
    files:
      draft.files.length > 0
        ? draft.files.map(({ file_id, filepath, type, height, width }) => ({
            file_id,
            filepath,
            type,
            height,
            width,
          }))
        : undefined,
    ephemeralAgent: Object.keys(tools).length > 0 ? tools : undefined,
    isContinued: false,
    isRegenerate: again != null ? true : undefined,
    isTemporary: temporary === true ? true : undefined,
    responseMessageId: again?.replaces,
    overrideParentMessageId: again != null ? parent : undefined,
    sender: 'User',
    isCreatedByUser: true,
    clientTimestamp: now(),
  }
  return kept(turn)
}

/**
 * Whether a draft may go out.
 *
 * A file still arriving holds the turn — sending its id before the server has
 * the bytes gets the file dropped silently, which reads as the model ignoring
 * an attachment. `@hanzo/ui/chat`'s `ready` covers the text and the busy state;
 * this is the half that is about what the draft is CARRYING.
 */
export const settled = (draft: Draft): boolean => draft.files.every((f) => f.here)

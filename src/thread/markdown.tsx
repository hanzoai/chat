/**
 * Markdown, as gui elements.
 *
 * @hanzo/ui/chat deliberately ships no markdown: the plugin set differs per
 * surface, so a component library that picked one would either impose a parser
 * on a surface that cannot afford it or be routed around by one that needs more.
 * The map is therefore the app's, and this is it — the largest single piece of
 * the rebuild, and the only one with no counterpart to lean on.
 *
 * Two rules produce the whole file:
 *
 *   1. A BLOCK becomes a stack; an INLINE becomes a text host. `<p>` is a text
 *      host, so the string inside it is a string. A stack is not, and a bare
 *      string handed to one renders nothing at all and throws nothing — the
 *      paragraph is simply missing, which is why `block()` exists and why list
 *      items go through it.
 *   2. Nothing here spells a size, a colour or a family. `Paragraph`, `H1..H6`
 *      and `SizableText` carry the scale, so the whole product's prose moves
 *      from the theme rather than from this file.
 *
 * Fences are extracted at `pre` rather than at `code`, because react-markdown
 * stopped reporting `inline` and `pre` is the node that unambiguously means
 * "block": whatever `pre` contains is a fence, and everything reaching `code` is
 * therefore inline.
 */
import {
  Anchor,
  Em,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Image,
  Paragraph,
  Separator,
  SizableText,
  Strong,
  XStack,
  YStack,
} from '@hanzo/ui'
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Cite } from './Cite'
import { Fence } from './Fence'

/**
 * The anchor a model writes beside a claim — U+E202 then `turn0search1`, in the
 * Unicode private-use area so it cannot collide with prose.
 *
 * Both spellings, because models emit both: the instruction asks for the literal
 * six characters `\ue202` and some models answer with the character itself.
 */
const ANCHOR = /(?:\\ue202|\ue202)turn(\d+)(search|image|news|video|ref|file)(\d+)/g

/** The grouping and highlight marks around those anchors. Never shown. */
const NOISE = /\\ue20[0134568]|[\ue200\ue201\ue203\ue204\ue205\ue206\ue208]/g

const clean = (text: string) => text.replace(NOISE, '')

/**
 * One text run, with its citations lifted out.
 *
 * Returns the string itself when there is nothing to lift — which keeps a plain
 * paragraph a plain string inside its `<p>`, so the paragraph's own type scale
 * still applies to it. Wrapping every run in a `SizableText` "to be safe" is how
 * body copy quietly ends up at the wrong size.
 */
const mark = (text: string, key: number): ReactNode => {
  ANCHOR.lastIndex = 0
  if (!ANCHOR.test(text)) return clean(text)

  ANCHOR.lastIndex = 0
  const out: ReactNode[] = []
  let at = 0
  let hit: RegExpExecArray | null
  while ((hit = ANCHOR.exec(text)) !== null) {
    const before = clean(text.slice(at, hit.index))
    if (before) out.push(before)
    out.push(<Cite key={`${key}.${hit.index}`} anchor={`turn${hit[1]}${hit[2]}${hit[3]}`} />)
    at = hit.index + hit[0].length
  }
  const tail = clean(text.slice(at))
  if (tail) out.push(tail)
  return out
}

/** Children of a TEXT host: strings stay strings, citations become markers. */
const flow = (children: ReactNode): ReactNode =>
  Children.map(children, (child, i) => (typeof child === 'string' ? mark(child, i) : child))

/**
 * Children of a STACK: every bare string gets a text host of its own.
 *
 * Whitespace between block children is dropped rather than hosted — markdown
 * puts a newline between every pair, and each one would otherwise become a
 * visible empty line inside the item.
 */
const block = (children: ReactNode): ReactNode =>
  Children.map(children, (child, i) =>
    typeof child === 'string' || typeof child === 'number' ? (
      String(child).trim() ? (
        <SizableText>{mark(String(child), i)}</SizableText>
      ) : null
    ) : (
      child
    ),
  )

/** Everything under a node, flattened to text — how a fence gets its source. */
const source = (node: ReactNode): string =>
  Children.toArray(node)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') return String(child)
      if (isValidElement(child)) return source((child.props as { children?: ReactNode }).children)
      return ''
    })
    .join('')

/** A list item, carrying the mark its list decided on. */
type Item = { marker?: string }

const BULLET = '•'
const TICKED = '☑'
const UNTICKED = '☐'

/**
 * Whether a list item is a task, and whether it is done.
 *
 * The state is on the CHECKBOX, not on the item — a task item is marked only by
 * a class name, and reading `checked` off the item gets `undefined` for every
 * task list, so every one of them drew a bullet. Depth 1, because a loose item
 * wraps its checkbox in a paragraph while a tight one does not, and going deeper
 * would let a nested list's first task decide its parent's mark.
 */
const ticked = (children: ReactNode, depth = 0): boolean | null => {
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue
    const props = child.props as { type?: string; checked?: boolean; children?: ReactNode }
    if (props.type === 'checkbox') return props.checked === true
    if (depth === 0) {
      const inner = ticked(props.children, 1)
      if (inner != null) return inner
    }
  }
  return null
}

/** Numbers the items so an ordered list is ordered without a CSS counter. */
const enumerate = (children: ReactNode, mark_: (n: number) => string, from = 1) => {
  let n = from
  return Children.map(children, (child) =>
    isValidElement(child)
      ? cloneElement(child as ReactElement<Item>, { marker: mark_(n++) })
      : null,
  )
}

/**
 * Monospace for inline code. There is no `$mono` token — the set carries `$body`
 * and `$heading` — so it goes through `style`, where the host's own mono face is
 * honoured and the platform's is the fallback.
 */
const MONO = {
  fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
} as const

const map: Components = {
  p: ({ children }) => <Paragraph>{flow(children)}</Paragraph>,

  h1: ({ children }) => (
    <H1 size="$8" marginTop="$2">
      {flow(children)}
    </H1>
  ),
  h2: ({ children }) => (
    <H2 size="$7" marginTop="$2">
      {flow(children)}
    </H2>
  ),
  h3: ({ children }) => (
    <H3 size="$6" marginTop="$1">
      {flow(children)}
    </H3>
  ),
  h4: ({ children }) => <H4 size="$5">{flow(children)}</H4>,
  h5: ({ children }) => <H5 size="$4">{flow(children)}</H5>,
  h6: ({ children }) => <H6 size="$3">{flow(children)}</H6>,

  strong: ({ children }) => <Strong>{flow(children)}</Strong>,
  em: ({ children }) => <Em>{flow(children)}</Em>,
  del: ({ children }) => (
    <SizableText textDecorationLine="line-through" color="$quiet">
      {flow(children)}
    </SizableText>
  ),

  a: ({ href, children }) => {
    const url = typeof href === 'string' ? href : ''
    const away = /^https?:\/\//i.test(url)
    return (
      <Anchor
        href={url}
        color="$color12"
        textDecorationLine="underline"
        target={away ? '_blank' : undefined}
        rel={away ? 'noopener noreferrer' : undefined}
      >
        {flow(children)}
      </Anchor>
    )
  },

  ul: ({ children }) => (
    <YStack width="100%" gap="$1.5">
      {enumerate(children, () => BULLET)}
    </YStack>
  ),
  ol: ({ children, start }) => (
    <YStack width="100%" gap="$1.5">
      {enumerate(children, (n) => `${n}.`, typeof start === 'number' ? start : 1)}
    </YStack>
  ),
  li: ({ children, ...rest }) => {
    const tick = ticked(children)
    const glyph = tick == null ? ((rest as Item).marker ?? BULLET) : tick ? TICKED : UNTICKED
    return (
      <XStack width="100%" gap="$2" alignItems="flex-start">
        <SizableText color="$quiet" width={20} textAlign="right" flexShrink={0}>
          {glyph}
        </SizableText>
        <YStack flex={1} minWidth={0} gap="$2">
          {block(children)}
        </YStack>
      </XStack>
    )
  },
  /* remark-gfm puts a real checkbox in a task item; the item already drew it. */
  input: () => null,

  blockquote: ({ children }) => (
    <YStack width="100%" gap="$2" paddingLeft="$3" borderLeftWidth={2} borderColor="$borderColor">
      {block(children)}
    </YStack>
  ),

  hr: () => (
    <YStack width="100%" paddingVertical="$2">
      <Separator />
    </YStack>
  ),

  img: ({ src, alt }) => (
    <Image src={typeof src === 'string' ? src : ''} alt={alt ?? ''} maxWidth="100%" borderRadius="$4" />
  ),

  pre: ({ children }) => {
    const fence = Children.toArray(children).find(isValidElement) as
      | ReactElement<{ className?: string; children?: ReactNode }>
      | undefined
    const language = /language-([\w+#-]+)/.exec(fence?.props.className ?? '')?.[1]
    /* The parser keeps the newline that closed the fence; it is punctuation, not
       an empty last line of the program. */
    const body = source(fence ? fence.props.children : children).replace(/\n$/, '')
    return <Fence language={language} value={body} />
  },

  /* Only inline code reaches here — `pre` never renders its children. */
  code: ({ children }) => (
    <SizableText
      paddingHorizontal="$1.5"
      borderRadius="$2"
      backgroundColor="$panel"
      borderWidth={1}
      borderColor="$borderColor"
      style={MONO}
    >
      {children}
    </SizableText>
  ),

  table: ({ children }) => (
    <YStack
      width="100%"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      overflow="scroll"
      contain="content"
    >
      {children}
    </YStack>
  ),
  thead: ({ children }) => <YStack backgroundColor="$panel">{children}</YStack>,
  /* Pulls the last row's hairline under the frame's own edge, so the table does
     not finish on two lines a pixel apart. */
  tbody: ({ children }) => <YStack marginBottom={-1}>{children}</YStack>,
  tr: ({ children }) => (
    <XStack width="100%" borderBottomWidth={1} borderColor="$borderColor">
      {children}
    </XStack>
  ),
  th: ({ children }) => (
    <SizableText flex={1} minWidth={0} paddingHorizontal="$3" paddingVertical="$2" size="$1" fontWeight="500" textAlign="left">
      {flow(children)}
    </SizableText>
  ),
  td: ({ children }) => (
    <SizableText flex={1} minWidth={0} paddingHorizontal="$3" paddingVertical="$2" size="$2">
      {flow(children)}
    </SizableText>
  ),
}

export interface MarkdownProps {
  source: string
}

export const Markdown = ({ source: text }: MarkdownProps) => (
  /*
    `shrink` and `minW` together, and neither is optional.

    A gui view is a React-Native flex item, so it does not shrink by default and
    takes its max-content width — a paragraph renders as one unwrapped line and
    is clipped at the column edge, which reads as truncated text rather than as a
    box that never shrank. Allowing the shrink is only half: a flex item's
    automatic minimum is its own content, which pins the width straight back.
  */
  <YStack width="100%" maxWidth="100%" minWidth={0} flexShrink={1} gap="$3">
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={map}>
      {text}
    </ReactMarkdown>
  </YStack>
)

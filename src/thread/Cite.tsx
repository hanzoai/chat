/**
 * A citation in the prose, and the sources it points at.
 *
 * The model marks a claim with a private-use anchor — `turn0search1` —
 * and the strip of cards under the turn holds the sources those anchors name.
 * `Cited` puts the turn's sources where a marker deep inside a nested list can
 * still reach them; `Cite` is the marker itself.
 *
 * Context rather than a prop, because the marker is minted inside the markdown
 * tree: threading `sources` through paragraph -> list -> item -> emphasis means
 * every element in the map takes a prop it does not read.
 *
 * A marker naming a source that did not arrive renders NOTHING. The model
 * hallucinates anchors, and a dangling superscript reads as a citation the
 * reader cannot check.
 */
import { HoverCard, HoverCardContent, HoverCardTrigger, SizableText } from '@hanzo/ui'
import { SourceCard, type Source } from '@hanzo/ui/chat'
import { createContext, useContext, type ReactNode } from 'react'

const NONE: Source[] = []

const Sourced = createContext<Source[]>(NONE)

export interface CitedProps {
  sources?: Source[]
  children?: ReactNode
}

/** The sources a turn's prose may cite. */
export const Cited = ({ sources, children }: CitedProps) => (
  <Sourced.Provider value={sources ?? NONE}>{children}</Sourced.Provider>
)

/** Open a source the way a link would. */
export const visit = (source: Source) => {
  if (source.href) window.open(source.href, '_blank', 'noopener,noreferrer')
}

export interface CiteProps {
  /** The anchor the model wrote — `turn0search1`. Matched against `Source.id`. */
  anchor: string
}

export const Cite = ({ anchor }: CiteProps) => {
  const sources = useContext(Sourced)
  const at = sources.findIndex((source) => source.id === anchor)
  if (at < 0) return null
  const source = sources[at]

  return (
    <HoverCard>
      {/*
        `asChild`, so the marker IS the span it looks like. The trigger's own
        element is a box, and a box inside a paragraph is invalid markup the
        browser repairs by ENDING the paragraph — the sentence would break in
        half at every citation.
      */}
      <HoverCardTrigger asChild>
        <SizableText
          size="$1"
          color="$quiet"
          cursor="pointer"
          onPress={() => visit(source)}
          role="button"
          tabIndex={0}
          aria-label={source.title}
        >
          {` ${at + 1} `}
        </SizableText>
      </HoverCardTrigger>
      {/* The card already carries the panel, so the source inside it drops its
          own frame rather than drawing a second one a pixel inside the first. */}
      <HoverCardContent side="top">
        <SourceCard
          source={source}
          index={at + 1}
          onOpen={visit}
          width="100%"
          padding={0}
          borderWidth={0}
          backgroundColor="transparent"
        />
      </HoverCardContent>
    </HoverCard>
  )
}

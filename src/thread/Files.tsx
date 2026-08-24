/**
 * What was attached to a turn.
 *
 * A picture is shown, because the picture IS the content; anything else is a
 * chip with its name on it, because a spreadsheet has no useful thumbnail and a
 * grid of identical grey rectangles tells the reader nothing.
 */
import { Paperclip } from '@hanzogui/lucide-icons-2'
import { SizableText, XStack } from '@hanzo/ui'

import type { Attachment } from '~/data/types'
import { Picture } from './Picture'

const UNITS = ['B', 'KB', 'MB', 'GB']

/** Size at one decimal, in the largest unit that leaves a number under 1000. */
const weight = (bytes?: number): string => {
  if (bytes == null || bytes <= 0) return ''
  let n = bytes
  let unit = 0
  while (n >= 1000 && unit < UNITS.length - 1) {
    n /= 1024
    unit += 1
  }
  return `${unit === 0 ? n : n.toFixed(1)} ${UNITS[unit]}`
}

const looksLikeImage = (file: Attachment) => file.type?.startsWith('image/') === true

/** Where to open it: the local copy while it uploads, the server's after. */
const at = (file: Attachment) => file.preview ?? file.filepath ?? ''

export interface FilesProps {
  files: Attachment[]
}

export const Files = ({ files }: FilesProps) => {
  if (files.length === 0) return null

  const pictures = files.filter(looksLikeImage)
  const rest = files.filter((file) => !looksLikeImage(file))

  return (
    <>
      {rest.length > 0 ? (
        <XStack gap="$2" flexWrap="wrap">
          {rest.map((file, i) => {
            const href = at(file)
            const size = weight(file.bytes)
            const name = file.filename || 'Attachment'
            return (
              <XStack
                key={file.file_id || `${name}.${i}`}
                alignItems="center"
                gap="$2"
                paddingHorizontal="$3"
                paddingVertical="$2"
                borderRadius="$4"
                borderWidth={1}
                borderColor="$borderColor"
                backgroundColor="$panel"
                maxWidth={280}
                cursor={href ? 'pointer' : undefined}
                onPress={href ? () => window.open(href, '_blank', 'noopener,noreferrer') : undefined}
                role={href ? 'link' : undefined}
                tabIndex={href ? 0 : undefined}
                aria-label={name}
                hoverStyle={href ? { borderColor: '$dim' } : undefined}
              >
                <Paperclip size={13} color="$quiet" />
                <SizableText size="$1" color="$ink" numberOfLines={1} flexShrink={1}>
                  {name}
                </SizableText>
                {size ? (
                  <SizableText size="$1" color="$faint" flexShrink={0}>
                    {size}
                  </SizableText>
                ) : null}
              </XStack>
            )
          })}
        </XStack>
      ) : null}

      {pictures.map((file, i) => (
        <Picture key={file.file_id || `image.${i}`} src={at(file)} alt={file.filename} />
      ))}
    </>
  )
}

/**
 * An image in a turn, and the full-size look at it.
 *
 * The dialog is MOUNTED ONLY WHILE OPEN. @hanzo/ui's Dialog measures the
 * viewport whether or not it is showing, so one left mounted per image turns a
 * conversation with a dozen pictures into a dozen live media queries answering
 * every resize.
 */
import { Dialog, DialogContent, Image, YStack } from '@hanzo/ui'
import { useState } from 'react'

/** How wide a picture is allowed to be in the reading column. */
const INLINE = 384

/** How tall the full-size look is allowed to be, so its own frame stays on screen. */
const FULL = 640

export interface PictureProps {
  src: string
  alt?: string
}

export const Picture = ({ src, alt }: PictureProps) => {
  const [open, setOpen] = useState(false)
  const name = alt || 'Image'

  return (
    <>
      <YStack
        maxWidth={INLINE}
        alignSelf="flex-start"
        borderRadius="$4"
        overflow="hidden"
        borderWidth={1}
        borderColor="$borderColor"
        cursor="pointer"
        onPress={() => setOpen(true)}
        role="button"
        tabIndex={0}
        aria-label={name}
      >
        <Image src={src} alt={name} maxWidth="100%" />
      </YStack>

      {open ? (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent maxWidth={900} aria-label={name}>
            <Image src={src} alt={name} maxWidth="100%" maxHeight={FULL} objectFit="contain" />
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}

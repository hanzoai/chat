import { Button, Dialog, Input, XStack } from '@hanzo/ui'
import { AsideToggle, Header as Bar, HeaderButton, ShareButton } from '@hanzo/ui/chat'
import { CopyButton, DialogTemplate } from '@hanzo/ui/product'
import { PanelLeft } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'

import { useRefresh, useShare, useShareOf, useUnshare } from '~/data/share'
import { announce } from '~/shell/Announce'

export interface HeaderProps {
  title: string
  /** The conversation on screen. Absent until the server has given it an id. */
  id?: string | null
  rail: boolean
  onRail: () => void
  /** Whether this deployment publishes conversations at all. */
  sharing?: boolean
  /** Whether a details column is on offer — it is not, on a narrow window. */
  details?: boolean
  aside: boolean
  onAside: () => void
}

/** The public address of a published conversation, respecting `<base href>`. */
const linkTo = (shareId: string) => new URL(`share/${shareId}`, document.baseURI).toString()

/**
 * The bar above the conversation. It answers one question and offers three
 * things about the thread under it, and nothing else.
 *
 *   [ ☰ ]  Title                                   [ Share ] [ ⊞ ]
 *
 * What LEFT, and why each was a second answer rather than a feature: a New chat
 * button (the rail's compose control never leaves the screen, so this was a
 * second one beside it at every width); the window controls, which were chrome
 * for the WINDOW rather than for the conversation; and the preset and endpoint
 * menus, which are gone from the product rather than moved.
 *
 * The model picker is not here either, and that is the one that looks like an
 * omission. It sits in the composer's toolbar, beside the sentence it applies
 * to — which is where somebody decides it — and mounting a second copy up here
 * would give one setting two controls that have to be kept in step.
 *
 * Share and the details toggle appear only once there is something to share or
 * to describe, so an empty thread reads as a title and a rail toggle. The row
 * never shows a control that would do nothing.
 *
 * It carries no ground of its own beyond the hairline `Header` draws: the
 * darker material belongs where a real surface sits — the rail, the composer —
 * and every button here brings its own hover ground.
 */
export const Header = ({
  title,
  id,
  rail,
  onRail,
  sharing = false,
  details = false,
  aside,
  onAside,
}: HeaderProps) => {
  const [open, setOpen] = useState(false)

  // Asked only while the dialog is open: whether this conversation is ALREADY
  // published decides which dialog it is. Without that read, pressing Share a
  // second time quietly mints a second link, and the first keeps working with
  // the older half of the conversation on it.
  const held = useShareOf(open && id ? id : null)
  const publish = useShare()
  const refresh = useRefresh()
  const withdraw = useUnshare()

  const shareId = held.data?.shareId
  const busy = publish.pending || refresh.pending || withdraw.pending

  return (
    <>
      <Bar
        title={title}
        leading={
          <HeaderButton
            label={rail ? 'Hide conversations' : 'Show conversations'}
            onPress={onRail}
          >
            {/* ONE glyph for the left column, open or shut. Swapping in a
                "close" variant puts two different shapes on screen for the one
                idea "show or hide the column on your left". */}
            <PanelLeft size={16} />
          </HeaderButton>
        }
      >
        {sharing && id ? <ShareButton onPress={() => setOpen(true)} /> : null}
        {details && id ? (
          <AsideToggle label={aside ? 'Hide details' : 'Show details'} onPress={onAside} />
        ) : null}
      </Bar>

      {open && id ? (
        <Dialog open onOpenChange={setOpen}>
          <DialogTemplate
            title={shareId ? 'This conversation is shared' : 'Share this conversation'}
            description={
              shareId
                ? 'Anyone with the link can read it. Turns said since it was published are not on it until you update it.'
                : 'A link anyone can open, with no account. It is a snapshot: whatever you say afterwards stays private until you publish again.'
            }
            confirm={
              shareId
                ? {
                    label: 'Update link',
                    onPress: () => {
                      void refresh.send(shareId).then(() => announce('The shared copy is up to date.'))
                    },
                  }
                : {
                    label: 'Create link',
                    onPress: () => {
                      void publish.send({ conversationId: id }).then(() => announce('Link created.'))
                    },
                  }
            }
            cancelLabel={shareId ? 'Done' : 'Cancel'}
            leftActions={
              shareId ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onPress={() => {
                    void withdraw.send(shareId).then(() => {
                      announce('That link no longer works.')
                      setOpen(false)
                    })
                  }}
                >
                  Stop sharing
                </Button>
              ) : undefined
            }
            busy={busy}
          >
            {shareId ? (
              <XStack gap="$2" alignItems="center">
                {/* Read-only rather than plain text: a field can be selected,
                    tabbed to and read out, which a paragraph of URL cannot. */}
                <Input flex={1} value={linkTo(shareId)} readOnly />
                <CopyButton value={linkTo(shareId)} label="Copy link" id="share-link" />
              </XStack>
            ) : null}
          </DialogTemplate>
        </Dialog>
      ) : null}
    </>
  )
}

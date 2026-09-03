import {
  Anchor,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  Paragraph,
  SizableText,
  XStack,
  YStack,
} from '@hanzo/ui'
import { row, rows } from '@hanzo/ui/glass'
import { ConfirmDelete, DialogTemplate } from '@hanzo/ui/product'
import { useState } from 'react'

import { api } from '../data/api.ts'
import type { User } from '../data/types.ts'


export interface AccountProps {
  /** Who is signed in — `GET /v1/chat/user`. */
  person?: User
  /** Ends the session. `@hanzo/iam`'s verb, handed in by the shell. */
  onSignOut?: () => void
  /** `DELETE /v1/chat/convos/all`. */
  onClear?: () => Promise<void>
  /** `DELETE /v1/chat/user/delete`. */
  onDelete?: () => Promise<void>
}

/** What to call somebody, in the order the record answers it. */
const nameOf = (person?: User) => person?.name || person?.username || person?.email || ''

/** The initials to stand in for a picture nobody uploaded. */
const monogram = (person?: User) => {
  const parts = nameOf(person).split(/[\s@._-]+/).filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  )
}

/**
 * One irreversible action, and the sentence that says what it costs.
 *
 * The dialog is mounted only while it is open. `@hanzo/ui`'s Dialog measures
 * the viewport whether or not anything is on screen, so a shut one is work with
 * nothing to show for it.
 *
 * `ConfirmDelete` brings the confirm, the cancel and the honest inline error —
 * the panel stays open when the request fails, so the reason is readable rather
 * than swallowed by a dialog that shut on its own.
 */
function Danger({
  name,
  note,
  label,
  message,
  run,
}: {
  name: string
  note: string
  label: string
  message: string
  run: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <XStack {...row}>
      <YStack minWidth={0} rowGap="$1">
        <SizableText fontSize="$3" fontWeight="500" color="$color">
          {name}
        </SizableText>
        <Paragraph fontSize="$1" color="$color11">
          {note}
        </Paragraph>
      </YStack>
      <Button size="sm" variant="destructive" onPress={() => setOpen(true)}>
        {label}
      </Button>
      {open ? (
        <Dialog open modal onOpenChange={setOpen}>
          <DialogTemplate title={name} showCancel={false}>
            <ConfirmDelete
              message={message}
              confirmLabel={label}
              run={run}
              onDone={() => setOpen(false)}
            />
          </DialogTemplate>
        </Dialog>
      ) : null}
    </XStack>
  )
}

/**
 * You, your things, and the ways out.
 *
 * There is no picture editor here and there will not be one. The picture, the
 * name and the password belong to the identity, and the identity is Hanzo IAM's
 * — so this links to it. That is one fewer upload route, one fewer copy of a
 * person's face, and no chance of the two disagreeing about which is current.
 *
 * A balance and a spend breakdown are absent for the same shape of reason: they
 * are decided where money is decided, and a second rendering of one ledger is a
 * place for two numbers to differ.
 */
export function Account({ person, onSignOut, onClear, onDelete }: AccountProps) {
  return (
    <YStack rowGap="$5" paddingVertical="$2">
      <XStack alignItems="center" gap="$3">
        {/* The picture is decorative — the name is right beside it — so it
            carries no label of its own; a screen reader would otherwise read
            the same person twice. */}
        <Avatar size={44}>
          {person?.avatar ? <AvatarImage src={person.avatar} /> : null}
          <AvatarFallback>
            <SizableText fontSize="$4" fontWeight="600" color="$color12">
              {monogram(person)}
            </SizableText>
          </AvatarFallback>
        </Avatar>
        <YStack minWidth={0} rowGap="$1">
          <SizableText fontSize="$4" fontWeight="600" color="$color12" numberOfLines={1}>
            {nameOf(person) || 'Signed in'}
          </SizableText>
          {/* The address only when it is not already the line above it: a
              record with no name falls back to the email, and printing it
              twice reads as two facts about one person. */}
          {person?.email && person.email !== nameOf(person) ? (
            <SizableText fontSize="$2" color="$color11" numberOfLines={1}>
              {person.email}
            </SizableText>
          ) : null}
        </YStack>
      </XStack>

      <YStack {...rows}>
        <Anchor
          href={api.iam.account}
          target="_blank"
          rel="noopener noreferrer"
          textDecorationLine="none"
          {...row}
          hoverStyle={{ backgroundColor: '$color3' }}
        >
          <YStack minWidth={0} rowGap="$1">
            <SizableText fontSize="$3" fontWeight="500" color="$color">
              Your Hanzo identity
            </SizableText>
            <Paragraph fontSize="$1" color="$color11">
              Name, picture, password and second factor — set once, in force on every Hanzo surface.
            </Paragraph>
          </YStack>
          <SizableText fontSize="$3" color="$color11" aria-hidden>
            ↗
          </SizableText>
        </Anchor>
        {onSignOut ? (
          <XStack {...row}>
            <YStack minWidth={0} rowGap="$1">
              <SizableText fontSize="$3" fontWeight="500" color="$color">
                Session
              </SizableText>
              <Paragraph fontSize="$1" color="$color11">
                Signs this browser out. Your conversations stay where they are.
              </Paragraph>
            </YStack>
            <Button size="sm" variant="outline" onPress={onSignOut}>
              Sign out
            </Button>
          </XStack>
        ) : null}
      </YStack>

      {onClear || onDelete ? (
        <YStack {...rows}>
          {onClear ? (
            <Danger
              name="Delete every conversation"
              note="Removes all of them, archived ones included."
              label="Delete"
              message="Delete every conversation on this account? The messages, the archive and every shared link go with them, and none of it can be brought back."
              run={onClear}
            />
          ) : null}
          {onDelete ? (
            <Danger
              name="Delete this account"
              note="Closes the account and everything recorded against it."
              label="Delete account"
              message="Delete this account? Every conversation, file and shared link is removed and the account is closed. This cannot be undone."
              run={onDelete}
            />
          ) : null}
        </YStack>
      ) : null}
    </YStack>
  )
}

export default Account

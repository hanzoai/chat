/**
 * The org's roster.
 *
 * One read — `people.list({ owner })` — rendered as rows. What was here before
 * was a shareable room link carrying an invite code nothing mints, an
 * invite-by-email form that appended a row to an array in this browser, and a
 * per-row delete. None of the three had a route, and the closest thing to one,
 * SCIM's `DELETE /Users/{owner}/{name}`, deprovisions a person from the whole
 * organization — a trash icon in a chat panel is the wrong place to keep that.
 *
 * The name and the `conversationId` prop stay because `src/shell/Chat.tsx`
 * mounts it; the prop is unread, because nothing on this wire ties a person to
 * a conversation.
 */
import { APIError } from '@hanzo/ai'
import { Users, X } from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'

import { initial, label, tint } from './person.ts'
import { multiplayerStore, useMultiplayer } from './store.ts'

/** What an empty roster means. The refusal is the contract's own sentence. */
const nothing = (error: unknown, pending: boolean): string => {
  if (error instanceof APIError && error.status === 403)
    return 'Reading the whole directory takes an organization administrator.'
  if (error) return 'The directory could not be read.'
  return pending ? 'Reading the directory…' : 'Nobody else is in this organization.'
}

export const InviteModal = (_: { conversationId?: string | null }) => {
  const { isInviteOpen, participants, pending, error } = useMultiplayer()

  if (!isInviteOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
      onClick={() => multiplayerStore.closeInvite()}
    >
      <YStack
        width="100%"
        maxWidth={500}
        borderRadius="$4"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.12)"
        backgroundColor="#0c0c0e"
        padding="$5"
        gap="$4"
        style={{ boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)' }}
        onClick={(e: any) => e.stopPropagation()}
      >
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap="$2.5">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Users size={18} />
            </div>
            <YStack gap="$0.5">
              <SizableText size="$3" fontWeight="700" color="$ink" style={{ color: '#ffffff' }}>
                Your organization
              </SizableText>
              <SizableText size="$1" color="$faint" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                The people IAM answers for this organization.
              </SizableText>
            </YStack>
          </XStack>

          <button
            type="button"
            onClick={() => multiplayerStore.closeInvite()}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </XStack>

        <YStack gap="$2">
          {participants.length === 0 ? (
            <SizableText size="$1" color="$faint" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {nothing(error, pending)}
            </SizableText>
          ) : (
            <>
              <SizableText size="$1" fontWeight="600" color="$faint">
                {participants.length} {participants.length === 1 ? 'person' : 'people'}
              </SizableText>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  maxHeight: 280,
                  overflowY: 'auto',
                }}
              >
                {participants.map((p) => (
                  <XStack
                    key={p.id}
                    alignItems="center"
                    justifyContent="space-between"
                    padding="$2"
                    borderRadius="$2"
                    backgroundColor="rgba(255, 255, 255, 0.02)"
                  >
                    <XStack alignItems="center" gap="$2.5">
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 9999,
                          background: tint(p),
                          color: '#000000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          opacity: p.active === false ? 0.4 : 1,
                        }}
                      >
                        {initial(p)}
                      </div>
                      <div>
                        <SizableText size="$1" fontWeight="600" color="$ink">
                          {label(p)}
                        </SizableText>
                        {p.email && (
                          <SizableText size="$1" color="$faint" style={{ fontSize: 10.5 }}>
                            {p.email}
                          </SizableText>
                        )}
                      </div>
                    </XStack>

                    <XStack alignItems="center" gap="$2">
                      {p.admin && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'rgba(255, 255, 255, 0.65)',
                            textTransform: 'uppercase',
                          }}
                        >
                          admin
                        </span>
                      )}
                      {p.active === false && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'rgba(255, 255, 255, 0.45)',
                            textTransform: 'uppercase',
                          }}
                        >
                          disabled
                        </span>
                      )}
                    </XStack>
                  </XStack>
                ))}
              </div>
            </>
          )}
        </YStack>
      </YStack>
    </div>
  )
}

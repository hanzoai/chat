import { Palette as Bar, useCommandK, type Op } from '@hanzo/ui/product'
import { LogIn, LogOut, PanelLeft, Settings, SquarePen, UserRound } from '@hanzogui/lucide-icons-2'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { api } from '~/data/api'
import { useSession } from '~/data/session'

export interface PaletteProps {
  onSettings: () => void
  onRail: () => void
}

/**
 * ⌘K, on every route this app answers.
 *
 * It mounts in `Root` rather than in a header, because the CHORD is the
 * surface: a palette that only exists where a particular bar renders is a
 * palette people learn not to trust. Nothing paints until it is summoned.
 *
 * ONE palette holds the chord. Two would both bind ⌘K on the window, so the key
 * would open two overlays stacked on each other and which one you typed into
 * would come down to listener order — which is exactly what the tree this
 * replaces shipped, with a hand-rolled bar beside the shared one.
 *
 * It lists COMMANDS and nothing else. The chat rows the old palette carried are
 * gone on purpose: the rail has its own search over the whole list, so a second,
 * shorter list of the same conversations in a different place is two answers to
 * one question, and the shorter one is the one that goes stale.
 *
 * The ask row is where a palette stops being a menu. A command list is finite
 * and a question is not, so "no results" is never the right end of one — a query
 * nobody indexed goes to the composer as `?q=…&submit=true`, which is asked
 * rather than merely typed out. From `/c/:id` that starts a NEW conversation
 * with the question, which is what asking something unrelated means.
 */
export const Palette = ({ onSettings, onRail }: PaletteProps) => {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { standing, signIn, signOut } = useSession()

  useCommandK(useCallback(() => setOpen((was) => !was), []))

  const ops = useMemo<Op[]>(() => {
    const list: Op[] = [
      {
        id: 'new',
        group: 'Chat',
        label: 'New chat',
        hint: 'Start a conversation',
        icon: <SquarePen size={15} />,
      },
      {
        id: 'rail',
        group: 'Chat',
        label: 'Show conversations',
        hint: 'Open the left column',
        icon: <PanelLeft size={15} />,
      },
      {
        id: 'settings',
        group: 'You',
        label: 'Settings',
        hint: 'Model, appearance, account',
        icon: <Settings size={15} />,
      },
    ]

    if (standing === 'live') {
      list.push(
        {
          id: 'account',
          group: 'You',
          label: 'Account',
          hint: 'Manage your identity',
          icon: <UserRound size={15} />,
        },
        { id: 'signout', group: 'You', label: 'Log out', icon: <LogOut size={15} /> },
      )
    } else {
      list.push({ id: 'signin', group: 'You', label: 'Log in', icon: <LogIn size={15} /> })
    }

    return list
  }, [standing])

  /**
   * Running one closes the bar first, always — including the rows that navigate.
   * A palette left open over the screen it just moved you to is a palette you
   * have to dismiss before you can read the thing you asked for.
   */
  const run = useCallback(
    (op: Op) => {
      setOpen(false)
      switch (op.id) {
        case 'new':
          navigate('/')
          return
        case 'rail':
          onRail()
          return
        case 'settings':
          onSettings()
          return
        case 'account':
          window.open(api.iam.account, '_blank', 'noopener,noreferrer')
          return
        case 'signin':
          signIn()
          return
        case 'signout':
          signOut()
          return
      }
    },
    [navigate, onRail, onSettings, signIn, signOut],
  )

  const ask = useCallback(
    (question: string) => {
      setOpen(false)
      navigate(`/?q=${encodeURIComponent(question)}&submit=true`)
    },
    [navigate],
  )

  return (
    <Bar
      open={open}
      onOpenChange={setOpen}
      ops={ops}
      onRun={run}
      onAsk={ask}
      placeholder="Search commands, or ask anything"
      title="Commands"
    />
  )
}

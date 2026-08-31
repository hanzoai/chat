import { Header as Bar, HeaderButton } from '@hanzo/ui/chat'
import { PanelLeft } from '@hanzogui/lucide-icons-2'

export interface HeaderProps {
  title: string
  rail: boolean
  onRail: () => void
}

/**
 * The bar above the conversation. It answers one question and offers one thing.
 *
 *   [ ☰ ]  Title
 *
 * What LEFT, and why each was a second answer rather than a feature: a New chat
 * button (the rail's compose control never leaves the screen, so this was a
 * second one beside it at every width); the window controls, which were chrome
 * for the WINDOW rather than for the conversation; and the preset and endpoint
 * menus, which are gone from the product rather than moved.
 *
 * Share went with the routes behind it. Publishing a conversation was six calls
 * to a server that does not answer them, and there is no route on api.hanzo.ai
 * to replace them with — so the button is gone rather than disabled, because a
 * control that can never be pressed is a promise. The details toggle went the
 * same way: a thread on this wire carries an id, a title and its turns, and a
 * column describing the rest had nothing to describe.
 *
 * The model picker is not here either, and that is the one that looks like an
 * omission. It sits in the composer's toolbar, beside the sentence it applies
 * to — which is where somebody decides it — and mounting a second copy up here
 * would give one setting two controls that have to be kept in step.
 *
 * It carries no ground of its own beyond the hairline `Header` draws: the
 * darker material belongs where a real surface sits — the rail, the composer —
 * and every button here brings its own hover ground.
 */
export const Header = ({ title, rail, onRail }: HeaderProps) => (
  <Bar
    title={title}
    leading={
      <HeaderButton label={rail ? 'Hide conversations' : 'Show conversations'} onPress={onRail}>
        {/* ONE glyph for the left column, open or shut. Swapping in a "close"
            variant puts two different shapes on screen for the one idea "show
            or hide the column on your left". */}
        <PanelLeft size={16} />
      </HeaderButton>
    }
  />
)

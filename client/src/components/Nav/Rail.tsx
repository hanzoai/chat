import { Clock, Folder, Globe, Puzzle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Text, View } from '@hanzo/gui';
import { useLocalize } from '~/hooks';

/**
 * The sidebar's destinations — Projects, Sites, Scheduled, Plugins — one row
 * each between the compose strip and the conversation list. Each row is a
 * route inside the shell (`/projects`, …) so the sidebar stays put and the
 * view swaps, the way `/agents` already behaves.
 *
 * Styled with gui shorthands against the shared token ladder rather than
 * Tailwind: every value here sits on a rung (`$2` = 8px padding, `$2.5` = 10px
 * gap, `$3` = 8px radius and the 14/20 type step), so the row moves when the
 * scale moves instead of when someone edits a string. Colour still reads the
 * app's own CSS variables, which are the same custom properties the Tailwind
 * palette was aliasing — the token layer for colour is chat's, not gui's.
 */
const PLACES = [
  { path: '/projects', label: 'com_nav_projects', Icon: Folder },
  { path: '/sites', label: 'com_nav_sites', Icon: Globe },
  { path: '/scheduled', label: 'com_nav_scheduled', Icon: Clock },
  { path: '/plugins', label: 'com_nav_plugins', Icon: Puzzle },
] as const;

/**
 * `transition-colors duration-200`, restated.
 *
 * gui's `animation` prop drives ALL animatable properties off one named curve,
 * so it cannot say "these colour properties, over 0.2s" — a property-scoped
 * transition has no shorthand and no token. Stating the two declarations here
 * keeps the tween byte-identical to what shipped instead of quietly widening it
 * to every property the row owns.
 */
const COLOR_TRANSITION = {
  transitionProperty: 'color, background-color, border-color, text-decoration-color, fill, stroke',
  transitionDuration: '0.2s',
} as const;

/** The row's icon: `currentColor` on purpose, so the glyph tracks the same
 *  secondary ink the label sits beside. A third-party SVG is not a gui
 *  primitive, so its two style properties have nowhere to go but a style prop. */
const ICON = { flexShrink: 0, color: 'var(--text-secondary)' } as const;

export default function Rail({ toggleNav }: { toggleNav: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const localize = useLocalize();

  return (
    <View
      gap="$0.5"
      pb="$1"
      // gui components carry react-native's flex defaults, not the browser's:
      // every one of them lands `minWidth/minHeight: 0` and `flexShrink: 0`.
      // Restated here because this box is a flex item of the sidebar's own
      // column, where "may not shrink" is the difference between a foot that
      // gives way under pressure and one that pushes the scroll area off-screen.
      shrink={1}
      minW="auto"
      minH="auto"
      items="unset"
    >
      {PLACES.map(({ path, label, Icon }) => {
        const active = pathname === path;
        return (
          <Text
            key={path}
            // `render` picks the element. `tag` is the prop everyone reaches for
            // first and it is a SILENT no-op — it type-checks, it builds, and it
            // renders a div, which is how a converted button quietly stops being
            // focusable. gui's own Anchor is styled(SizableText, { render: 'a' }).
            render="button"
            // gui forwards HTML attributes but types none of them, so the one
            // that makes this element a button rather than a submit is spread.
            {...{ type: 'button' }}
            data-testid={`nav${path.replace('/', '-')}-button`}
            aria-current={active ? 'page' : undefined}
            display="flex"
            flexDirection="row"
            items="center"
            width="100%"
            gap="$2.5"
            rounded="$3"
            p="$2"
            fontSize="$3"
            lineHeight="$3"
            color="var(--text-primary)"
            // gui's Text defaults to `pre-wrap`; a browser button does not.
            whiteSpace="normal"
            bg={active ? 'var(--surface-active-alt)' : 'transparent'}
            hoverStyle={{ bg: 'var(--surface-active-alt)' }}
            style={COLOR_TRANSITION}
            onPress={() => {
              navigate(path);
              toggleNav();
            }}
          >
            <Icon size={16} style={ICON} aria-hidden="true" />
            <span>{localize(label)}</span>
          </Text>
        );
      })}
    </View>
  );
}

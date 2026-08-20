import { useAtomValue } from 'jotai';
import { Text } from '@hanzo/gui';
import store from '~/store';

/**
 * The visitor's sign-off, under the account row in the sidebar foot. One
 * truncated line, so every width — desktop rail or phone drawer — keeps it to
 * a whisper; the full text rides the title for anyone who hovers. Absent
 * entirely when unset (see the atom): the foot never reserves space for
 * silence. Set from Settings → General.
 *
 * `font-serif` used to sit in this class list and did nothing: chat's Tailwind
 * config REPLACES `theme.fontFamily` with `sans` and `mono` alone, so no
 * `.font-serif` rule was ever generated and the line has always rendered in the
 * UI face. It is dropped rather than reproduced — the conversion is not the
 * place to ship an italic serif nobody has seen.
 */
export default function Signature() {
  const signature = useAtomValue(store.signature).trim();
  if (!signature) {
    return null;
  }
  return (
    <Text
      // A block box, because the line centres itself inside the sidebar's width
      // and an inline span would only be as wide as its glyphs. `render` is the
      // prop that picks the element — `tag` type-checks and does nothing.
      render="div"
      // gui's Text sets `display: inline` on itself, which outranks the div's own
      // block box — without this the line shrinks to its glyphs and stops centring.
      display="block"
      data-testid="nav-signature"
      // Forwarded at runtime, typed by nothing — see Rail. The full sign-off on
      // hover is the only thing a truncated line gives back, so it stays.
      {...{ title: signature }}
      mx="$2"
      px="$2"
      pt="$0.5"
      pb="$1.5"
      text="center"
      fontStyle="italic"
      color="var(--text-secondary)"
      // 12/16 is NOT on the type ladder — it sits between `$1` (11/16) and `$2`
      // (13/18), so the step is stated in pixels. The alternative is resizing
      // the line, which is a design change wearing a migration's clothes.
      fontSize={12}
      lineHeight={16}
      // `truncate`, restated: gui has no shorthand for the ellipsis trio.
      whiteSpace="nowrap"
      overflow="hidden"
      textOverflow="ellipsis"
    >
      {signature}
    </Text>
  );
}

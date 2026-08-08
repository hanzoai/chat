import { useAtomValue } from 'jotai';
import store from '~/store';

/**
 * The visitor's sign-off, under the account row in the sidebar foot. One
 * truncated line, so every width — desktop rail or phone drawer — keeps it to
 * a whisper; the full text rides the title for anyone who hovers. Absent
 * entirely when unset (see the atom): the foot never reserves space for
 * silence. Set from Settings → General.
 */
export default function Signature() {
  const signature = useAtomValue(store.signature).trim();
  if (!signature) {
    return null;
  }
  return (
    <div
      data-testid="nav-signature"
      title={signature}
      className="mx-2 truncate px-2 pb-1.5 pt-0.5 text-center font-serif text-xs italic text-text-secondary"
    >
      {signature}
    </div>
  );
}

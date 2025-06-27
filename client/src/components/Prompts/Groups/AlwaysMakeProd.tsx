import { useRecoilState } from 'recoil';
import { Switch } from '~/components/ui';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';
import { atomWithLocalStorage } from '~/store/utils';

// Fallback atom in case store doesn't have it
const alwaysMakeProdAtom = store.alwaysMakeProd || atomWithLocalStorage('alwaysMakeProd', true);

export default function AlwaysMakeProd({
  onCheckedChange,
  className = '',
}: {
  onCheckedChange?: (value: boolean) => void;
  className?: string;
}) {
  const [alwaysMakeProd, setAlwaysMakeProd] = useRecoilState<boolean>(alwaysMakeProdAtom);
  const localize = useLocalize();

  const handleCheckedChange = (value: boolean) => {
    setAlwaysMakeProd(value);
    if (onCheckedChange) {
      onCheckedChange(value);
    }
  };

  return (
    <div className={cn('flex select-none items-center justify-end gap-2 text-xs', className)}>
      <Switch
        id="alwaysMakeProd"
        checked={alwaysMakeProd}
        onCheckedChange={handleCheckedChange}
        data-testid="alwaysMakeProd"
        aria-label="Always make prompt production"
      />
      <div>{localize('com_nav_always_make_prod')} </div>
    </div>
  );
}

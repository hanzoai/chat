import { useCallback } from 'react';
import { useSetRecoilState } from 'recoil';
import { useLocalize, useCustomLink } from '~/hooks';
import { Button } from '~/components/ui';
import { cn } from '~/utils';

import store from '~/store';
import { atomWithLocalStorage } from '~/store/utils';

export default function ManagePrompts({ className }: { className?: string }) {
  const localize = useLocalize();
  const promptsNameAtom = store.promptsName || atomWithLocalStorage('promptsName', '');
  const promptsCategoryAtom = store.promptsCategory || atomWithLocalStorage('promptsCategory', '');
  const setPromptsName = useSetRecoilState(promptsNameAtom);
  const setPromptsCategory = useSetRecoilState(promptsCategoryAtom);
  const clickCallback = useCallback(() => {
    setPromptsName('');
    setPromptsCategory('');
  }, [setPromptsName, setPromptsCategory]);

  const customLink = useCustomLink('/d/prompts', clickCallback);
  const clickHandler = (e: React.MouseEvent<HTMLButtonElement>) => {
    customLink(e as unknown as React.MouseEvent<HTMLAnchorElement>);
  };

  return (
    <Button
      variant="outline"
      className={cn(className, 'bg-transparent')}
      onClick={clickHandler}
      aria-label="Manage Prompts"
      role="button"
    >
      {localize('com_ui_manage')}
    </Button>
  );
}

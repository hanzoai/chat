import { forwardRef } from 'react';
import { CheckIcon } from 'lucide-react';
import { Spinner, Button, InfoHoverCard, ESide } from '@hanzochat/client';
import type { TDangerButtonProps } from '~/common';
import type { ForwardedRef } from 'react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const DangerButton = (props: TDangerButtonProps, ref: ForwardedRef<HTMLButtonElement>) => {
  const {
    id,
    onClick,
    mutation,
    disabled,
    confirmClear,
    infoTextCode,
    actionTextCode,
    className = '',
    showText = true,
    dataTestIdInitial,
    dataTestIdConfirm,
    infoDescriptionCode,
    confirmActionTextCode = 'com_ui_confirm_action',
  } = props;
  const localize = useLocalize();

  const renderMutation = (node: React.ReactNode | string) => {
    if (mutation && mutation.isLoading) {
      return <Spinner className="h-5 w-5" />;
    }
    return node;
  };

  return (
    <div className="flex items-center justify-between">
      {showText && (
        <div className={`flex items-center ${infoDescriptionCode ? 'space-x-2' : ''}`}>
          <div>{localize(infoTextCode)}</div>
          {infoDescriptionCode && <InfoHoverCard side={ESide.Bottom} text={infoDescriptionCode} />}
        </div>
      )}
      {/* Was `DialogButton`, the legacy dialog stack's one button. Its whole
          palette — border, fill, label, hover — was overridden by the red below
          at this, its only call site, so the wrapper contributed nothing but the
          layout and focus classes restated here. */}
      <Button
        id={id}
        ref={ref}
        variant="outline"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'mt-2 inline-flex h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0',
          'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-gray-400 dark:focus:ring-offset-gray-900',
          'btn relative border-none bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-700',
          className,
        )}
      >
        {confirmClear ? (
          <div
            className="flex w-full items-center justify-center gap-2"
            id={`${id}-text`}
            data-testid={dataTestIdConfirm}
          >
            {renderMutation(<CheckIcon className="h-5 w-5" aria-hidden="true" />)}
            {mutation && mutation.isLoading ? null : localize(confirmActionTextCode)}
          </div>
        ) : (
          <div
            className="flex w-full items-center justify-center gap-2"
            id={`${id}-text`}
            data-testid={dataTestIdInitial}
          >
            {renderMutation(localize(actionTextCode))}
          </div>
        )}
      </Button>
    </div>
  );
};

export default forwardRef(DangerButton);

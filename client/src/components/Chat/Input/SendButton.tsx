import React, { forwardRef } from 'react';
import { useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { SendIcon, TooltipAnchor } from '@hanzochat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

type SendButtonProps = {
  disabled: boolean;
  control: Control<{ text: string }>;
};

const SubmitButton = React.memo(
  forwardRef((props: { disabled: boolean }, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const localize = useLocalize();
    return (
      <TooltipAnchor
        description={localize('com_nav_send_message')}
        render={
          <button
            ref={ref}
            aria-label={localize('com_nav_send_message')}
            id="send-button"
            disabled={props.disabled}
            className={cn(
              // The raised pushbutton, same as every other primary control. It
              // was `bg-text-primary` — a white disc, the brightest object on
              // the page, sitting inside the one surface that already says
              // "type here" with the prism ring. hanzo.app's composer sends
              // from a dark button for exactly this reason.
              //
              // `size-9` + a 20px glyph is the composer's ONE control size — the
              // mic, attach and every other icon button measure exactly this. It
              // was a 24px glyph in loose padding, a filled disc visibly larger
              // than its ghost siblings; matched, the row reads as one set.
              'flex size-9 items-center justify-center rounded-full border border-surface-submit-hover bg-surface-submit text-white outline-offset-4 transition-all duration-200 disabled:cursor-not-allowed disabled:text-text-secondary disabled:opacity-10',
            )}
            data-testid="send-button"
            type="submit"
          >
            <span className="" data-state="closed">
              <SendIcon size={20} />
            </span>
          </button>
        }
      />
    );
  }),
);

const SendButton = React.memo(
  forwardRef((props: SendButtonProps, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const data = useWatch({ control: props.control });
    const content = data?.text?.trim();
    return <SubmitButton ref={ref} disabled={props.disabled || !content} />;
  }),
);

export default SendButton;

import { memo, useCallback } from 'react';
import { Wand2 } from 'lucide-react';
import { Button, TooltipAnchor } from '@hanzochat/client';
import type { ConversationImage } from '~/utils';
import useAttachImage from '~/hooks/Files/useAttachImage';
import useLocalize from '~/hooks/useLocalize';
import { cn } from '~/utils';

interface FixImageButtonProps {
  image: ConversationImage;
  /** `overlay` = pill over the message thumbnail; `toolbar` = action-bar icon in the fullscreen dialog. */
  variant?: 'overlay' | 'toolbar';
  onDone?: () => void;
  className?: string;
}

/**
 * "Fix" affordance for an AI-generated image: attaches the image to the composer
 * as a reference and seeds a "Fix this image: " prompt. Renders nothing outside a
 * live chat (e.g. shared/search views) where there is no composer to attach to.
 */
function FixImageButton({ image, variant = 'overlay', onDone, className }: FixImageButtonProps) {
  const localize = useLocalize();
  const { fixImage, canAttach } = useAttachImage();

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      fixImage(image);
      onDone?.();
    },
    [fixImage, image, onDone],
  );

  if (!canAttach) {
    return null;
  }

  if (variant === 'toolbar') {
    return (
      <TooltipAnchor
        description={localize('com_ui_fix_image')}
        render={
          <Button
            onClick={handleClick}
            variant="ghost"
            className={cn('h-10 w-10 p-0 text-white hover:bg-white/10', className)}
            aria-label={localize('com_ui_fix_image')}
          >
            <Wand2 className="size-5" aria-hidden="true" />
          </Button>
        }
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={localize('com_ui_fix_image')}
      title={localize('com_ui_fix_image')}
      className={cn(
        'absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-150',
        'hover:bg-black/80 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
        'group-hover/image:opacity-100',
        className,
      )}
    >
      <Wand2 className="size-3.5" aria-hidden="true" />
      {localize('com_ui_fix')}
    </button>
  );
}

export default memo(FixImageButton);

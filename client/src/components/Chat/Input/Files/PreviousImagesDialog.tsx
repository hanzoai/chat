import { useMemo } from 'react';
import { Constants } from '@hanzochat/data-provider';
import { OGDialog, OGDialogTemplate } from '@hanzochat/client';
import { useGetMessagesByConvoId } from '~/data-provider';
import { collectConversationImages, resolveImageUrl } from '~/utils';
import useAttachImage from '~/hooks/Files/useAttachImage';
import useLocalize from '~/hooks/useLocalize';

interface PreviousImagesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

/**
 * Picker that lists every image already in the CURRENT conversation (uploads and
 * AI generations). Selecting one attaches it to the composer by reference — no
 * re-upload — via `useAttachImage`.
 */
export default function PreviousImagesDialog({
  isOpen,
  onOpenChange,
  conversationId,
}: PreviousImagesDialogProps) {
  const localize = useLocalize();
  const { attachImage } = useAttachImage();

  const hasConversation = conversationId !== '' && conversationId !== Constants.NEW_CONVO;
  const { data: messages } = useGetMessagesByConvoId(conversationId, {
    enabled: isOpen && hasConversation,
  });

  /** Newest first — the image a user most likely wants to re-use. */
  const images = useMemo(() => collectConversationImages(messages).reverse(), [messages]);

  const handleSelect = (index: number) => {
    const image = images[index];
    if (image == null) {
      return;
    }
    if (attachImage(image)) {
      onOpenChange(false);
    }
  };

  return (
    <OGDialog open={isOpen} onOpenChange={onOpenChange}>
      <OGDialogTemplate
        title={localize('com_ui_previous_images')}
        className="w-11/12 sm:w-[520px] md:w-[560px]"
        main={
          images.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-secondary">
              {localize('com_ui_no_previous_images')}
            </div>
          ) : (
            <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3">
              {images.map((image, index) => (
                <button
                  key={image.file_id ?? image.filepath}
                  type="button"
                  onClick={() => handleSelect(index)}
                  aria-label={image.filename ?? localize('com_ui_previous_images')}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-border-light bg-surface-secondary transition-colors hover:border-border-heavy focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <img
                    src={resolveImageUrl(image.filepath)}
                    alt={image.filename ?? ''}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
          )
        }
      />
    </OGDialog>
  );
}

import { useCallback } from 'react';
import type { ExtendedFile } from '~/common';
import type { ConversationImage } from '~/utils';
import { resolveImageUrl, insertTextAtCursor, imageMimeFromName } from '~/utils';
import { useChatContext } from '~/Providers/ChatContext';
import { mainTextareaId } from '~/common';
import useUpdateFiles from './useUpdateFiles';
import useLocalize from '../useLocalize';

/**
 * Attach an existing image (a user upload or an AI generation) to the composer.
 *
 * The image already exists on the server, so it is attached BY REFERENCE: the
 * completed `ExtendedFile` is injected straight into the composer's file map
 * (`attached: true`, so removing it never deletes the original) and the send path
 * forwards `{file_id, filepath, type, width, height}` verbatim. No re-upload.
 *
 * `fixImage` additionally seeds the composer with a "Fix this image: " prompt and
 * focuses the input, so the user only has to describe the fix.
 */
export default function useAttachImage() {
  const localize = useLocalize();
  const { files, setFiles } = useChatContext();
  const { addFile } = useUpdateFiles(setFiles);

  /** True only inside a live chat where a composer exists to attach to. */
  const canAttach = typeof setFiles === 'function';

  const attachImage = useCallback(
    (image: ConversationImage): boolean => {
      if (!canAttach || image.file_id == null || image.file_id === '') {
        return false;
      }
      if (files?.has(image.file_id) === true) {
        return true;
      }
      const url = resolveImageUrl(image.filepath);
      if (!url) {
        return false;
      }

      const inferred = image.type ?? imageMimeFromName(image.filename);
      const attached: ExtendedFile = {
        file_id: image.file_id,
        filepath: image.filepath,
        filename: image.filename ?? 'image.png',
        type: inferred?.startsWith('image/') === true ? inferred : 'image/png',
        height: image.height,
        width: image.width,
        source: image.source,
        preview: url,
        size: 0,
        progress: 1,
        attached: true,
      };
      addFile(attached);
      return true;
    },
    [canAttach, files, addFile],
  );

  const fixImage = useCallback(
    (image: ConversationImage): boolean => {
      if (!attachImage(image)) {
        return false;
      }

      /** Seed the prompt only when empty so a user's in-progress text is never clobbered. */
      const el = document.getElementById(mainTextareaId) as HTMLTextAreaElement | null;
      if (el != null) {
        el.focus();
        if (el.value.trim() === '') {
          insertTextAtCursor(el, localize('com_ui_fix_image_prompt'));
        }
      }

      return true;
    },
    [attachImage, localize],
  );

  return { attachImage, fixImage, canAttach };
}

import { apiBaseUrl, ContentTypes, imageExtRegex, isServedImage } from '@hanzochat/data-provider';
import type { TMessage, TFile, TAttachment } from '@hanzochat/data-provider';

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

/** Best-effort `image/*` MIME from a filename's extension (composer preview only). */
export function imageMimeFromName(filename?: string | null): string | undefined {
  const ext = filename?.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_MIME_BY_EXT[ext];
}

/**
 * A minimal, re-attachable reference to an image that already exists on the
 * server (a user upload or an AI generation). Carries everything the composer
 * needs to attach it WITHOUT re-uploading (see `useAttachImage`).
 */
export interface ConversationImage {
  file_id?: string;
  filepath: string;
  filename?: string;
  /** MIME type, always `image/*`. */
  type?: string;
  height?: number;
  width?: number;
  source?: TFile['source'];
}

/**
 * Resolve an image `filepath` to an absolute URL. Server images live under
 * `imagesRoute`; for subdirectory deployments these must be prefixed with the
 * API base path. Absolute URLs and data URIs are returned untouched. This is the
 * single source of truth shared by the message `Image` renderer and the
 * attach-by-reference path.
 */
export function resolveImageUrl(imagePath?: string | null): string {
  if (!imagePath) {
    return '';
  }
  if (!isServedImage(imagePath)) {
    return imagePath;
  }
  return `${apiBaseUrl()}${imagePath}`;
}

const isImageType = (type?: string): boolean => type?.startsWith('image/') === true;

const isImageName = (filename?: string): boolean =>
  filename != null && imageExtRegex.test(filename);

const toImage = (file: Partial<TFile>): ConversationImage | null => {
  const filepath = file.filepath ?? '';
  if (!filepath) {
    return null;
  }
  const filename = file.filename ?? undefined;
  const type = isImageType(file.type) ? file.type : imageMimeFromName(filename ?? filepath);
  return {
    file_id: file.file_id,
    filepath,
    filename,
    type,
    height: file.height,
    width: file.width,
    source: file.source,
  };
};

/**
 * Walk a conversation's messages (chronological) and collect every image that
 * can be re-attached to the composer: user uploads (`message.files`), AI/tool
 * generations (`message.attachments`), and inline image content parts
 * (`content[].image_file`). Deduped by `file_id` (falling back to `filepath`),
 * keeping first occurrence.
 *
 * Pure and framework-free so it can be unit-tested and reused by any picker.
 */
export function collectConversationImages(messages?: TMessage[] | null): ConversationImage[] {
  if (!messages?.length) {
    return [];
  }

  const seen = new Set<string>();
  const images: ConversationImage[] = [];

  const push = (image: ConversationImage | null) => {
    if (!image) {
      return;
    }
    const key = image.file_id ?? image.filepath;
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    images.push(image);
  };

  for (const message of messages) {
    /* User-uploaded files (images carry an `image/*` type). */
    for (const file of message.files ?? []) {
      if (isImageType(file.type) || isImageName(file.filename)) {
        push(toImage(file));
      }
    }

    /* Tool/AI-generated outputs. Mirror the image predicate in `Attachment.tsx`. */
    for (const attachment of (message.attachments ?? []) as TAttachment[]) {
      const file = attachment as Partial<TFile>;
      if (
        isImageName(file.filename) &&
        file.width != null &&
        file.height != null &&
        file.filepath != null
      ) {
        push(toImage(file));
      }
    }

    /* Inline image content parts. */
    for (const part of message.content ?? []) {
      if (part?.type === ContentTypes.IMAGE_FILE) {
        push(toImage(part[ContentTypes.IMAGE_FILE] as Partial<TFile>));
      }
    }
  }

  return images;
}

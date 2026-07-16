import React, { useState, useRef, useMemo } from 'react';
import { Skeleton } from '@hanzochat/client';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import type { ConversationImage } from '~/utils';
import { cn, scaleImage, resolveImageUrl } from '~/utils';
import FixImageButton from './FixImageButton';
import DialogImage from './DialogImage';

const Image = ({
  imagePath,
  altText,
  height,
  width,
  placeholderDimensions,
  className,
  args,
  enableFix,
  fileId,
  fileType,
}: {
  imagePath: string;
  altText: string;
  height: number;
  width: number;
  placeholderDimensions?: {
    height?: string;
    width?: string;
  };
  className?: string;
  args?: {
    prompt?: string;
    quality?: 'low' | 'medium' | 'high';
    size?: string;
    style?: string;
    [key: string]: unknown;
  };
  /** Render the "Fix" affordance (AI-generated images only). */
  enableFix?: boolean;
  /** Server file id, so the image can be re-attached by reference (no re-upload). */
  fileId?: string;
  /** MIME type of the image, when known. */
  fileType?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleImageLoad = () => setIsLoaded(true);

  // Resolve image path to an absolute URL (base path for subdirectory deployments)
  const absoluteImageUrl = useMemo(() => resolveImageUrl(imagePath), [imagePath]);

  const fixImageRef = useMemo<ConversationImage>(
    () => ({
      file_id: fileId,
      filepath: imagePath,
      filename: altText,
      type: fileType,
      height,
      width,
    }),
    [fileId, imagePath, altText, fileType, height, width],
  );

  const { width: scaledWidth, height: scaledHeight } = useMemo(
    () =>
      scaleImage({
        originalWidth: Number(placeholderDimensions?.width?.split('px')[0] ?? width),
        originalHeight: Number(placeholderDimensions?.height?.split('px')[0] ?? height),
        containerRef,
      }),
    [placeholderDimensions, height, width],
  );

  const downloadImage = async () => {
    try {
      const response = await fetch(absoluteImageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = altText || 'image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      const link = document.createElement('a');
      link.href = absoluteImageUrl;
      link.download = altText || 'image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div ref={containerRef} className="group/image relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`View ${altText} in dialog`}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
        className={cn(
          'relative mt-1 flex h-auto w-full max-w-lg cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border-light text-text-secondary-alt shadow-md transition-shadow',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-primary',
          className,
        )}
      >
        <LazyLoadImage
          alt={altText}
          onLoad={handleImageLoad}
          visibleByDefault={true}
          className={cn(
            'opacity-100 transition-opacity duration-100',
            isLoaded ? 'opacity-100' : 'opacity-0',
          )}
          src={absoluteImageUrl}
          style={{
            width: `${scaledWidth}`,
            height: 'auto',
            color: 'transparent',
            display: 'block',
          }}
          placeholder={
            <Skeleton
              className={cn('h-auto w-full', `h-[${scaledHeight}] w-[${scaledWidth}]`)}
              aria-label="Loading image"
              aria-busy="true"
            />
          }
        />
      </button>
      {enableFix === true && isLoaded && <FixImageButton image={fixImageRef} variant="overlay" />}
      {isLoaded && (
        <DialogImage
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          src={absoluteImageUrl}
          downloadImage={downloadImage}
          args={args}
          triggerRef={triggerRef}
          fixImage={enableFix === true ? fixImageRef : undefined}
        />
      )}
    </div>
  );
};

export default Image;

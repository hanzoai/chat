import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  Constants,
  Providers,
  EModelEndpoint,
  isAssistantsEndpoint,
  isDocumentSupportedProvider,
} from '@hanzochat/data-provider';
import { FileUpload } from '@hanzochat/client';
import { useAgentToolPermissions, useFileHandling } from '~/hooks';
import { ephemeralAgentByConvoId } from '~/store';
import PreviousImagesDialog from './PreviousImagesDialog';

/**
 * Putting a file into this turn: one input, one gesture.
 *
 * There used to be a menu here — upload as an image, as OCR text, for file
 * search, for the code sandbox — and each row wrote a different
 * `EToolResources` onto the file. That is routing the server is in a better
 * position to do, and it was four ways to say "add this file". The turn's
 * tools are chosen among the tools now, which is where tools belong.
 *
 * `takes` is what the provider can actually read, so the caller NAMES the row
 * after it rather than greying a row out. `library` is what this conversation
 * already holds, and is null when there is nothing to draw on.
 *
 * `portals` (the hidden input, the library) must be rendered by exactly ONE
 * consumer, or there are two inputs.
 */

/** What the input accepts, by what the provider can read. */
const IMAGES = 'image/*,.heif,.heic';
const DOCUMENTS = `${IMAGES},.pdf,application/pdf`;
const MEDIA = `${DOCUMENTS},video/*,audio/*`;
/** Assistants take whatever they are given; they expose no per-file choice. */
const ANYTHING = '';

export type Takes = 'photos' | 'files' | 'both';

interface UploadProps {
  agentId?: string | null;
  endpoint?: string | null;
  conversationId: string;
  endpointType?: EModelEndpoint;
  useResponsesApi?: boolean;
}

export function useUpload({
  agentId,
  endpoint,
  endpointType,
  conversationId,
  useResponsesApi,
}: UploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const ephemeralAgent = useAtomValue(ephemeralAgentByConvoId(conversationId));
  const { handleFileChange } = useFileHandling();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const { provider } = useAgentToolPermissions(agentId, ephemeralAgent);

  const accept = useMemo(() => {
    if (isAssistantsEndpoint(endpoint)) {
      return ANYTHING;
    }
    let current = provider || endpoint;
    /** Providers comparisons are not yet case-insensitive across the board. */
    if (current?.toLowerCase() === Providers.OPENROUTER) {
      current = Providers.OPENROUTER;
    }
    /** Azure reads documents only through the Responses API. */
    const azureDocuments = current === EModelEndpoint.azureOpenAI && useResponsesApi === true;
    if (
      !isDocumentSupportedProvider(endpointType) &&
      !isDocumentSupportedProvider(current) &&
      !azureDocuments
    ) {
      return IMAGES;
    }
    return current === Providers.GOOGLE || current === Providers.OPENROUTER ? MEDIA : DOCUMENTS;
  }, [endpoint, endpointType, provider, useResponsesApi]);

  const takes: Takes = accept === IMAGES ? 'photos' : accept === ANYTHING ? 'files' : 'both';

  const add = useCallback(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    input.value = '';
    input.accept = accept;
    input.click();
    input.accept = '';
  }, [accept]);

  /** A conversation that has not started has nothing to draw on. */
  const library = useMemo(
    () => (conversationId === Constants.NEW_CONVO ? null : () => setLibraryOpen(true)),
    [conversationId],
  );

  const portals = (
    <>
      <FileUpload ref={inputRef} handleFileChange={(e) => handleFileChange(e)}>
        <></>
      </FileUpload>
      {libraryOpen && (
        <PreviousImagesDialog
          isOpen={libraryOpen}
          onOpenChange={setLibraryOpen}
          conversationId={conversationId}
        />
      )}
    </>
  );

  return { add, takes, library, portals };
}

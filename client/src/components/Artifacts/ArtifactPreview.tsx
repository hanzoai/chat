import { memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { useMutation } from '@tanstack/react-query';
import { dataService } from '@hanzochat/data-provider';
import { Spinner } from '@hanzochat/client';
import type { ArtifactFiles } from '~/common';
import { project, type Template } from '~/utils/artifacts';

/**
 * The artifact, as the reader sees it running.
 *
 * ONE renderer: a document in a frame that has no origin of its own. Where the
 * document comes from is the only thing that varies, and it varies by one fact —
 * whether the artifact is already a document or is a program that has to be built.
 *
 *   page   the artifact IS the document. Nothing runs, nothing is fetched, and the
 *          frame paints as fast as the panel opens.
 *   react  the artifact is a program. It is built in the reader's own sandbox
 *          (`/v1/chat/artifacts/preview` onto cloud `/v1/sandboxes`), which HOLDS
 *          the project, so the second render of an edited file is a compile and
 *          not an install.
 *
 * # The frame's privileges are zero, and that is deliberate
 *
 * `sandbox="allow-scripts"` WITHOUT `allow-same-origin` gives the document an
 * opaque origin: it can run its own code and touch nothing of chat's — no DOM, no
 * storage, no cookies, no bearer. `srcDoc` keeps it a local document, so there is
 * no origin to allow in `frame-src` and no third party in the render path at all.
 * The document the sandbox builds is self-contained for exactly this reason: one
 * that had to fetch its script would need somewhere to fetch it from.
 */
export type PreviewHandle = {
  /** Re-run the artifact from scratch: reload a page, rebuild a program. */
  refresh: () => void;
};

/** How long to let an edit settle before spending a build on it. */
const SETTLE_MS = 400;

const FRAME_PERMISSIONS = 'allow-scripts allow-forms allow-modals allow-popups allow-downloads';

export const ArtifactPreview = memo(function ArtifactPreview({
  files,
  fileKey,
  type,
  template,
  previewRef,
  currentCode,
}: {
  files: ArtifactFiles;
  fileKey: string;
  type: string;
  template: Template;
  previewRef: MutableRefObject<PreviewHandle | undefined>;
  currentCode?: string;
}) {
  /* The editor's unsaved text wins over the streamed content, which is what makes
   * an edit in the code tab show up here. */
  const source = useMemo(() => {
    const code = currentCode ?? '';
    return code ? { ...files, [fileKey]: code } : files;
  }, [currentCode, files, fileKey]);

  const [generation, setGeneration] = useState(0);
  useImperativeHandle(previewRef, () => ({ refresh: () => setGeneration((n) => n + 1) }), []);

  const { mutate, data, error, isPending } = useMutation({
    mutationFn: (payload: { files: Record<string, string>; sandbox?: string }) =>
      dataService.buildArtifact(payload),
  });

  /* The sandbox the last build used. Sent with the next one so a project is
   * rebuilt where its dependencies already are. */
  const sandbox = useRef<string | undefined>(undefined);

  /* Serialised, so the effect below fires on a CHANGE in the sources rather than
   * on every render that rebuilt an equal object. */
  const sources = useMemo(
    () =>
      template === 'react' ? JSON.stringify(project(source as Record<string, string>, type)) : '',
    [template, source, type],
  );

  useEffect(() => {
    if (!sources) {
      return;
    }
    const timer = setTimeout(() => {
      mutate(
        { files: JSON.parse(sources), sandbox: sandbox.current },
        {
          onSuccess: (result) => {
            sandbox.current = result.sandbox;
          },
        },
      );
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [sources, generation, mutate]);

  if (Object.keys(source).length === 0) {
    return null;
  }

  if (template === 'page') {
    return <Frame html={String(source[fileKey] ?? '')} generation={generation} />;
  }

  if (!isPending && data?.html != null) {
    return <Frame html={data.html} generation={generation} />;
  }

  if (!isPending && error != null) {
    return <Failure error={error} />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner />
    </div>
  );
});

/** `key` is the generation, so a refresh REPLACES the document instead of mutating
 *  it: a frame handed the same `srcDoc` again is not guaranteed to re-run it. */
const Frame = ({ html, generation }: { html: string; generation: number }) => (
  <iframe
    key={generation}
    title="artifact"
    srcDoc={html}
    sandbox={FRAME_PERMISSIONS}
    className="h-full w-full border-0 bg-white"
  />
);

/** What the sandbox said, verbatim. A build failure is usually the artifact's own
 *  compiler error, and paraphrasing it would take away the one thing that tells
 *  the reader which line is wrong. */
const Failure = ({ error }: { error: unknown }) => {
  const detail =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (error as Error)?.message ??
    String(error);
  return (
    <pre className="h-full w-full overflow-auto whitespace-pre-wrap p-4 text-xs text-text-secondary">
      {detail}
    </pre>
  );
};

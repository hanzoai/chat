import { useMemo, useState } from 'react';
import { useSetAtom } from 'jotai';
import { video } from '~/components/Chat/Backdrop';
import { useLocalize } from '~/hooks';
import store from '~/store';

/**
 * A `hanzo-setting` fence, rendered as the card it promises.
 *
 * The model PROPOSES a change ({backdropVideo, showBackdrop, voice} — the
 * contract lives in api/server/services/guide.js); nothing here runs until the
 * user presses Apply. Voice proposals show the browser's real voice list,
 * because the model can only guess at names the browser never told it.
 */
type Proposal = { backdropVideo?: string; showBackdrop?: boolean; voice?: string };

function parse(content: string): Proposal | null {
  try {
    const raw = JSON.parse(content) as Record<string, unknown>;
    const p: Proposal = {};
    if (typeof raw.backdropVideo === 'string') {
      p.backdropVideo = raw.backdropVideo;
    }
    if (typeof raw.showBackdrop === 'boolean') {
      p.showBackdrop = raw.showBackdrop;
    }
    if (typeof raw.voice === 'string') {
      p.voice = raw.voice;
    }
    return Object.keys(p).length ? p : null;
  } catch {
    return null;
  }
}

export default function Adjust({ content }: { content: string }) {
  const localize = useLocalize();
  const setVideo = useSetAtom(store.backdropVideo);
  const setShow = useSetAtom(store.showBackdrop);
  const setVoice = useSetAtom(store.voice);
  const [done, setDone] = useState(false);

  const proposal = useMemo(() => parse(content), [content]);
  const voices = useMemo(
    () => (proposal?.voice != null ? window.speechSynthesis?.getVoices() ?? [] : []),
    [proposal],
  );
  const [pickedVoice, setPickedVoice] = useState<string | null>(null);

  if (!proposal) {
    return <code className="text-sm text-text-secondary">{content}</code>;
  }

  const apply = () => {
    if (proposal.backdropVideo != null) {
      setVideo(video(proposal.backdropVideo));
      setShow(true);
    }
    if (proposal.showBackdrop != null) {
      setShow(proposal.showBackdrop);
    }
    if (proposal.voice != null) {
      const name = pickedVoice ?? proposal.voice;
      setVoice(voices.find((v) => v.name === name)?.name ?? name);
    }
    setDone(true);
  };

  return (
    <span className="not-prose my-2 flex flex-col gap-2 rounded-xl border border-border-light bg-surface-primary-alt p-3 text-sm">
      <span className="font-medium text-text-primary">{localize('com_ui_adjust_title')}</span>
      {proposal.backdropVideo != null && (
        <span className="text-text-secondary">
          {localize('com_ui_adjust_backdrop')}{' '}
          <code className="text-text-primary">{video(proposal.backdropVideo)}</code>
        </span>
      )}
      {proposal.showBackdrop != null && (
        <span className="text-text-secondary">
          {proposal.showBackdrop
            ? localize('com_ui_adjust_backdrop_on')
            : localize('com_ui_adjust_backdrop_off')}
        </span>
      )}
      {proposal.voice != null && (
        <label className="flex items-center gap-2 text-text-secondary">
          {localize('com_ui_adjust_voice')}
          <select
            className="rounded-md border border-border-light bg-surface-primary px-2 py-1 text-text-primary"
            value={pickedVoice ?? proposal.voice}
            onChange={(e) => setPickedVoice(e.target.value)}
          >
            {!voices.some((v) => v.name === (pickedVoice ?? proposal.voice)) && (
              <option value={proposal.voice}>{proposal.voice}</option>
            )}
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <span>
        <button
          type="button"
          onClick={apply}
          disabled={done}
          className="rounded-lg bg-surface-submit px-3 py-1.5 font-medium text-white transition-colors hover:bg-surface-submit-hover disabled:opacity-60"
        >
          {done ? localize('com_ui_adjust_applied') : localize('com_ui_adjust_apply')}
        </button>
      </span>
    </span>
  );
}

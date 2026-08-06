import { useMemo, useState } from 'react';
import { useSetAtom } from 'jotai';
import { merge, videoId } from '~/utils/backdrop';
import { useLocalize } from '~/hooks';
import store from '~/store';

/**
 * A `hanzo-setting` fence, rendered as the card it promises.
 *
 * The model PROPOSES a change ({backdrop, voice} — the contract lives in
 * api/server/services/guide.js); nothing here runs until the user presses
 * Apply. Voice proposals show the browser's real voice list, because the model
 * can only guess at names the browser never told it.
 *
 * WHAT A PROPOSAL MAY ASK FOR IS DELIBERATELY NARROWER THAN WHAT THE VIEWER CAN
 * SET. A fence is model output, and model output can be dictated by a web page
 * it read or a file it was handed — so it may only turn the backdrop off or
 * name a YouTube video. It may NOT set a photo: an arbitrary image URL is a
 * beacon that would fetch from a stranger's host on every page load thereafter,
 * and nothing about "change my background" requires the model to choose the
 * host. Photos come from the viewer's own upload or their own typed URL.
 *
 * Even inside that narrow window nothing is believed: the fields are handed to
 * `merge` (utils/backdrop), the one validated write path, which drops anything
 * it cannot make sense of and keeps the current value.
 */
type Proposal = { source?: 'off' | 'video'; video?: string; voice?: string };

function parse(content: string): Proposal | null {
  try {
    const raw = JSON.parse(content) as Record<string, unknown>;
    const backdrop = (raw.backdrop ?? {}) as Record<string, unknown>;
    const p: Proposal = {};
    if (backdrop.source === 'off' || backdrop.source === 'video') {
      p.source = backdrop.source;
    }
    if (typeof backdrop.video === 'string' && videoId(backdrop.video)) {
      p.video = backdrop.video;
      p.source = 'video';
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
  const setBackdrop = useSetAtom(store.backdrop);
  const setVoice = useSetAtom(store.voice);
  const [done, setDone] = useState(false);

  const proposal = useMemo(() => parse(content), [content]);
  const voices = useMemo(
    () => (proposal?.voice != null ? window.speechSynthesis?.getVoices() ?? [] : []),
    [proposal],
  );
  const [pickedVoice, setPickedVoice] = useState<string | null>(null);

  if (!proposal) {
    return <code className="text-sm text-gray-600 dark:text-gray-300">{content}</code>;
  }

  const apply = () => {
    if (proposal.source != null) {
      setBackdrop((current) =>
        merge(current, { source: proposal.source, video: proposal.video }),
      );
    }
    if (proposal.voice != null) {
      const name = pickedVoice ?? proposal.voice;
      setVoice(voices.find((v) => v.name === name)?.name ?? name);
    }
    setDone(true);
  };

  return (
    <span className="not-prose my-2 flex flex-col gap-2 rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-100">
      <span className="font-medium">{localize('com_ui_adjust_title')}</span>
      {proposal.video != null && (
        <span className="text-gray-600 dark:text-gray-300">
          {localize('com_ui_adjust_backdrop')}{' '}
          {/* The id, not the pasted string: what the player will actually be
              asked for is what the viewer is being asked to agree to. */}
          <code className="font-mono">{videoId(proposal.video)}</code>
        </span>
      )}
      {proposal.video == null && proposal.source != null && (
        <span className="text-gray-600 dark:text-gray-300">
          {proposal.source === 'off'
            ? localize('com_ui_adjust_backdrop_off')
            : localize('com_ui_adjust_backdrop_on')}
        </span>
      )}
      {proposal.voice != null && (
        <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          {localize('com_ui_adjust_voice')}
          <select
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-gray-100"
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

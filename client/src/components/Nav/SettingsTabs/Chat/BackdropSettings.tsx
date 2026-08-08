/**
 * The Background section of the Chat settings.
 *
 * It lives here, inside the Chat tab, rather than as a tab of its own: what
 * the canvas paints is chat appearance, and it sits with font size and chat
 * direction because that is where the ambient backdrop's switch already was.
 * A tab would also mean widening `SettingsTabValues`, an enum published from
 * @hanzochat/data-provider — a cross-package release for a browser-local
 * preference.
 *
 * The source selector IS the on/off switch. There is no separate enable
 * toggle beside it, because two controls that can each mean "nothing" make
 * states that differ without looking different.
 *
 * A link nothing can embed — Netflix, and every other DRM service — is listed
 * plainly as unplayable with a link out. We do not pretend, and we never ask
 * anyone for a provider password: a members-only or age-gated stream plays
 * because the viewer is already signed in to that provider in this browser and
 * the embed rides their own session.
 */
import { useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { v4 } from 'uuid';
import { Dropdown, InfoHoverCard, ESide, useToastContext } from '@hanzochat/client';
import type { Backdrop, Link, Source } from '~/utils/backdrop';
import { merge, link, playable, picture, web } from '~/utils/backdrop';
import { useUploadFileMutation } from '~/data-provider';
import ToggleSwitch from '../ToggleSwitch';
import { useLocalize } from '~/hooks';
import store from '~/store';

const FIELD =
  'w-full rounded-md border border-border-medium bg-surface-primary px-2 py-1 text-sm text-text-primary placeholder:text-text-secondary';

const BUTTON =
  'rounded-md border border-border-medium px-2 py-1 text-sm text-text-primary hover:bg-surface-hover disabled:opacity-50';

/** A URL field that reports its value only when it is a usable one, so a
 *  half-typed address never becomes the backdrop. */
function Url({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    if (draft.trim() !== '' && draft !== value) {
      onCommit(draft.trim());
    }
  };
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-text-secondary">{label}</span>
      <input
        type="url"
        className={FIELD}
        value={draft}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
        }}
      />
    </label>
  );
}

/** One row of the playlist. A link we cannot embed says so and offers the only
 *  thing that does work: opening it where it belongs. */
function Row({ entry, onRemove, remove }: { entry: Link; onRemove: () => void; remove: string }) {
  const localize = useLocalize();
  const canPlay = playable(entry);
  return (
    <li className="flex items-center gap-2 py-1">
      <span
        className={
          canPlay
            ? 'shrink-0 rounded bg-surface-tertiary px-1.5 py-0.5 text-xs capitalize text-text-secondary'
            : 'shrink-0 rounded bg-surface-tertiary px-1.5 py-0.5 text-xs text-text-secondary'
        }
      >
        {canPlay ? entry.provider : localize('com_nav_backdrop_blocked')}
      </span>
      {canPlay ? (
        <span className="truncate text-xs text-text-secondary">{entry.url}</span>
      ) : (
        <a
          href={entry.url}
          target="_blank"
          rel="noreferrer noopener"
          className="truncate text-xs text-text-secondary underline"
        >
          {entry.url}
        </a>
      )}
      <button type="button" onClick={onRemove} className={`${BUTTON} ml-auto shrink-0`}>
        {remove}
      </button>
    </li>
  );
}

export default function BackdropSettings() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [config, setConfig] = useAtom(store.backdrop);
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  /** The one write path. Everything validates through `merge`, so a value the
   *  canvas could not paint never reaches the atom in the first place. */
  const set = (change: Partial<Backdrop>) => setConfig((current) => merge(current, change));

  const upload = useUploadFileMutation({
    onSuccess: (file) => {
      setUploading(false);
      // The path as served, not resolved against this origin: the app answers
      // to several brands' domains and a stored absolute origin is wrong on all
      // but the one it was saved from. `picture` normalises it.
      set({ source: 'photo', photo: file.filepath });
    },
    onError: () => {
      setUploading(false);
      showToast({ message: localize('com_error_files_upload'), status: 'error' });
    },
  });

  const choose = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }
    setUploading(true);
    // Measured first because the upload route serves images only when the
    // request carries their dimensions — the same shape the composer sends.
    const preview = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const body = new FormData();
      body.append('endpoint', 'default');
      body.append('file', file, encodeURIComponent(file.name));
      body.append('file_id', v4());
      body.append('width', String(image.width));
      body.append('height', String(image.height));
      body.append('message_file', 'true');
      upload.mutate(body);
      URL.revokeObjectURL(preview);
    };
    image.onerror = () => {
      setUploading(false);
      URL.revokeObjectURL(preview);
      showToast({ message: localize('com_error_files_upload'), status: 'error' });
    };
    image.src = preview;
  };

  const add = () => {
    const entry = link(draft);
    if (!entry) {
      return;
    }
    set({ source: 'playlist', playlist: [...config.playlist, entry] });
    setDraft('');
  };

  const sources = [
    { value: 'off', label: localize('com_nav_backdrop_off') },
    { value: 'photo', label: localize('com_nav_backdrop_photo') },
    { value: 'video', label: localize('com_nav_backdrop_video') },
    { value: 'playlist', label: localize('com_nav_backdrop_playlist') },
  ];

  const labelId = 'backdrop-source-label';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center space-x-2">
          <div id={labelId}>{localize('com_nav_backdrop')}</div>
          <InfoHoverCard side={ESide.Bottom} text={localize('com_nav_backdrop_info')} />
        </div>
        <Dropdown
          value={config.source}
          options={sources}
          onChange={(value: string) => set({ source: value as Source })}
          testId="backdrop-source"
          sizeClasses="w-[150px]"
          className="z-50"
          aria-labelledby={labelId}
        />
      </div>

      {config.source === 'photo' && (
        <div className="flex flex-col gap-2">
          <input
            ref={picker}
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="backdrop-photo-file"
            onChange={(event) => {
              choose(event.target.files);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            className={`${BUTTON} self-start`}
            disabled={uploading}
            onClick={() => picker.current?.click()}
          >
            {uploading ? localize('com_nav_backdrop_uploading') : localize('com_nav_backdrop_upload')}
          </button>
          <Url
            label={localize('com_nav_backdrop_photo_url')}
            value={config.photo}
            placeholder="/images/…"
            onCommit={(value) =>
              picture(value)
                ? set({ photo: value })
                : showToast({ message: localize('com_nav_backdrop_photo_refused'), status: 'error' })
            }
          />
          <p className="text-xs text-text-secondary">
            {localize('com_nav_backdrop_photo_note')}
          </p>
        </div>
      )}

      {config.source === 'video' && (
        <Url
          label={localize('com_nav_backdrop_video_url')}
          value={config.video}
          placeholder="https://www.youtube.com/watch?v=…"
          onCommit={(value) => set({ video: value })}
        />
      )}

      {config.source === 'playlist' && (
        <div className="flex flex-col gap-2">
          {config.playlist.length === 0 ? (
            <p className="text-xs text-text-secondary">{localize('com_nav_backdrop_empty')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border-light">
              {config.playlist.map((entry, index) => (
                <Row
                  key={`${entry.url}-${index}`}
                  entry={entry}
                  remove={localize('com_nav_backdrop_remove')}
                  onRemove={() =>
                    set({ playlist: config.playlist.filter((_, at) => at !== index) })
                  }
                />
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <input
              type="url"
              className={FIELD}
              value={draft}
              placeholder="https://…"
              aria-label={localize('com_nav_backdrop_add')}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  add();
                }
              }}
            />
            <button type="button" className={BUTTON} disabled={!web(draft)} onClick={add}>
              {localize('com_nav_backdrop_add')}
            </button>
          </div>
          <ToggleSwitch
            stateAtom={store.backdropLoop}
            localizationKey="com_nav_backdrop_loop"
            switchId="backdropLoop"
            hoverCardText="com_nav_backdrop_loop_info"
          />
        </div>
      )}

      {/* Sound belongs to whichever source can carry it, so it sits outside both
          blocks above rather than being written twice. A photo is silent and
          `off` plays nothing, so neither offers a switch that would do nothing. */}
      {(config.source === 'video' || config.source === 'playlist') && (
        <ToggleSwitch
          stateAtom={store.backdropSound}
          localizationKey="com_nav_backdrop_sound"
          switchId="backdropSound"
          hoverCardText="com_nav_backdrop_sound_info"
        />
      )}

      {config.source !== 'off' && (
        <p className="text-xs text-text-secondary">{localize('com_nav_backdrop_signin')}</p>
      )}
    </div>
  );
}

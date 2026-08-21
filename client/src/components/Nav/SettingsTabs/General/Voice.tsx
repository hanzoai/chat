import { useAtomValue } from 'jotai';
import { BrowserVoiceDropdown, ExternalVoiceDropdown } from '~/components/Audio/Voices';
import ToggleSwitch from '../ToggleSwitch';
import { TTSEndpoints } from '~/common';
import store from '~/store';

const dropdowns = {
  [TTSEndpoints.browser]: BrowserVoiceDropdown,
  [TTSEndpoints.external]: ExternalVoiceDropdown,
};

/**
 * Reading replies out loud, and in whose voice.
 *
 * All that survives of a Speech tab that ran to eighteen controls behind a
 * Simple/Advanced split. Most of the rest was unreadable by anything: the
 * speech-to-text switch, the eighty-four-entry dictation language list, the
 * decibel threshold, the auto-send delay and conversation mode were written by
 * the settings screen and by the config initializer, and read by NOTHING — the
 * microphone renders whatever they say. The engines, the playback rate, the
 * cache and the cloud-voices switch do have readers, and every one of them
 * answers a question about how the audio pipeline is wired rather than what the
 * reader wants; each keeps its default.
 *
 * The voice list only appears once reading aloud is on, because otherwise there
 * is nothing for the choice to change. Which list it is follows the engine the
 * deployment configured.
 */
export default function Voice() {
  const engine = useAtomValue<string>(store.engineTTS);
  const speaking = useAtomValue(store.textToSpeech);
  const Dropdown = dropdowns[engine];

  return (
    <div className="flex flex-col gap-3">
      <ToggleSwitch
        stateAtom={store.textToSpeech}
        localizationKey="com_nav_text_to_speech"
        switchId="TextToSpeech"
      />
      {speaking && Dropdown && <Dropdown />}
    </div>
  );
}

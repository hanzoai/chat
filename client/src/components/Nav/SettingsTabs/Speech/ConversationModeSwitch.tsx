import { useAtom, useAtomValue } from 'jotai';
import ToggleSwitch from '../ToggleSwitch';
import store from '~/store';

export default function ConversationModeSwitch({
  onCheckedChange,
}: {
  onCheckedChange?: (value: boolean) => void;
}) {
  const speechToText = useAtomValue(store.speechToText);
  const textToSpeech = useAtomValue(store.textToSpeech);
  const [, setAutoSendText] = useAtom(store.autoSendText);
  const [, setDecibelValue] = useAtom(store.decibelValue);
  const [, setAutoTranscribeAudio] = useAtom<boolean>(store.autoTranscribeAudio);

  const handleCheckedChange = (value: boolean) => {
    setAutoTranscribeAudio(value);
    setAutoSendText(3);
    setDecibelValue(-45);
    if (onCheckedChange) {
      onCheckedChange(value);
    }
  };

  return (
    <ToggleSwitch
      stateAtom={store.conversationMode}
      localizationKey={'com_nav_conversation_mode' as const}
      switchId="ConversationMode"
      onCheckedChange={handleCheckedChange}
      disabled={!textToSpeech || !speechToText}
      strongLabel={true}
    />
  );
}

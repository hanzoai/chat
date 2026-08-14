import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { Tabs } from '@hanzo/ui/primitives/Tabs';
import { TabsList } from '@hanzo/ui/primitives/TabsList';
import { TabsTrigger } from '@hanzo/ui/primitives/TabsTrigger';
import { TabsContent } from '@hanzo/ui/primitives/TabsContent';
import { Lightbulb, Cog } from 'lucide-react';
import { useOnClickOutside, useMediaQuery } from '@hanzochat/client';
import { useGetCustomConfigSpeechQuery } from '@hanzochat/data-provider/react-query';
import {
  CloudBrowserVoicesSwitch,
  AutomaticPlaybackSwitch,
  TextToSpeechSwitch,
  EngineTTSDropdown,
  CacheTTSSwitch,
  VoiceDropdown,
  PlaybackRate,
} from './TTS';
import {
  AutoTranscribeAudioSwitch,
  LanguageSTTDropdown,
  SpeechToTextSwitch,
  AutoSendTextSelector,
  EngineSTTDropdown,
  DecibelSelector,
} from './STT';
import ConversationModeSwitch from './ConversationModeSwitch';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

function Speech() {
  const localize = useLocalize();

  const [confirmClear, setConfirmClear] = useState(false);
  const { data } = useGetCustomConfigSpeechQuery();
  const isSmallScreen = useMediaQuery('(max-width: 767px)');

  const [sttExternal, setSttExternal] = useState(false);
  const [ttsExternal, setTtsExternal] = useState(false);
  const [advancedMode, setAdvancedMode] = useAtom(store.advancedMode);
  const [autoTranscribeAudio, setAutoTranscribeAudio] = useAtom(store.autoTranscribeAudio);
  const [conversationMode, setConversationMode] = useAtom(store.conversationMode);
  const [speechToText, setSpeechToText] = useAtom(store.speechToText);
  const [textToSpeech, setTextToSpeech] = useAtom(store.textToSpeech);
  const [cacheTTS, setCacheTTS] = useAtom(store.cacheTTS);
  const [engineSTT, setEngineSTT] = useAtom<string>(store.engineSTT);
  const [languageSTT, setLanguageSTT] = useAtom<string>(store.languageSTT);
  const [decibelValue, setDecibelValue] = useAtom(store.decibelValue);
  const [autoSendText, setAutoSendText] = useAtom(store.autoSendText);
  const [engineTTS, setEngineTTS] = useAtom<string>(store.engineTTS);
  const [voice, setVoice] = useAtom(store.voice);
  const [cloudBrowserVoices, setCloudBrowserVoices] = useAtom<boolean>(store.cloudBrowserVoices);
  const [languageTTS, setLanguageTTS] = useAtom<string>(store.languageTTS);
  const [automaticPlayback, setAutomaticPlayback] = useAtom(store.automaticPlayback);
  const [playbackRate, setPlaybackRate] = useAtom(store.playbackRate);

  const updateSetting = useCallback(
    (key: string, newValue: string | number) => {
      const settings = {
        sttExternal: { value: sttExternal, setFunc: setSttExternal },
        ttsExternal: { value: ttsExternal, setFunc: setTtsExternal },
        conversationMode: { value: conversationMode, setFunc: setConversationMode },
        advancedMode: { value: advancedMode, setFunc: setAdvancedMode },
        speechToText: { value: speechToText, setFunc: setSpeechToText },
        textToSpeech: { value: textToSpeech, setFunc: setTextToSpeech },
        cacheTTS: { value: cacheTTS, setFunc: setCacheTTS },
        engineSTT: { value: engineSTT, setFunc: setEngineSTT },
        languageSTT: { value: languageSTT, setFunc: setLanguageSTT },
        autoTranscribeAudio: { value: autoTranscribeAudio, setFunc: setAutoTranscribeAudio },
        decibelValue: { value: decibelValue, setFunc: setDecibelValue },
        autoSendText: { value: autoSendText, setFunc: setAutoSendText },
        engineTTS: { value: engineTTS, setFunc: setEngineTTS },
        voice: { value: voice, setFunc: setVoice },
        cloudBrowserVoices: { value: cloudBrowserVoices, setFunc: setCloudBrowserVoices },
        languageTTS: { value: languageTTS, setFunc: setLanguageTTS },
        automaticPlayback: { value: automaticPlayback, setFunc: setAutomaticPlayback },
        playbackRate: { value: playbackRate, setFunc: setPlaybackRate },
      };

      const setting = settings[key];
      if (setting) {
        setting.setFunc(newValue);
      }
    },
    [
      sttExternal,
      ttsExternal,
      conversationMode,
      advancedMode,
      speechToText,
      textToSpeech,
      cacheTTS,
      engineSTT,
      languageSTT,
      autoTranscribeAudio,
      decibelValue,
      autoSendText,
      engineTTS,
      voice,
      cloudBrowserVoices,
      languageTTS,
      automaticPlayback,
      playbackRate,
      setSttExternal,
      setTtsExternal,
      setConversationMode,
      setAdvancedMode,
      setSpeechToText,
      setTextToSpeech,
      setCacheTTS,
      setEngineSTT,
      setLanguageSTT,
      setAutoTranscribeAudio,
      setDecibelValue,
      setAutoSendText,
      setEngineTTS,
      setVoice,
      setCloudBrowserVoices,
      setLanguageTTS,
      setAutomaticPlayback,
      setPlaybackRate,
    ],
  );

  useEffect(() => {
    if (data && data.message !== 'not_found') {
      Object.entries(data).forEach(([key, value]) => {
        // Only apply config values as defaults if no user preference exists in localStorage
        const existingValue = localStorage.getItem(key);
        if (existingValue === null && key !== 'sttExternal' && key !== 'ttsExternal') {
          updateSetting(key, value);
        } else if (key === 'sttExternal' || key === 'ttsExternal') {
          updateSetting(key, value);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Reset engineTTS if it is set to a removed/invalid value (e.g., 'edge')
  // TODO: remove this once the 'edge' engine is fully deprecated
  useEffect(() => {
    const validEngines = ['browser', 'external'];
    if (!validEngines.includes(engineTTS)) {
      setEngineTTS('browser');
    }
  }, [engineTTS, setEngineTTS]);

  const contentRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(contentRef, () => confirmClear && setConfirmClear(false), []);

  return (
    <Tabs
      defaultValue={'simple'}
      orientation="horizontal"
      value={advancedMode ? 'advanced' : 'simple'}
      onValueChange={(value) => setAdvancedMode(value === 'advanced')}
      gap={0}
    >
      <div className="sticky -top-1 z-50 mb-4 bg-white dark:bg-gray-700">
        {/* TabsList and TabsTrigger paint a pill before they spread, and gui's
            runtime sheet is appended after the Tailwind sheet, so at equal
            specificity its values beat the classes below. Each style prop here
            restates the class it would otherwise silently replace; the ones set
            to 0/auto undo a value this surface never asked for. */}
        <TabsList
          className="flex justify-center bg-background"
          height="auto"
          padding={0}
          gap={0}
          borderRadius={0}
          backgroundColor="var(--background)"
        >
          <TabsTrigger
            className={cn(
              'group m-1 flex items-center justify-center gap-2 bg-transparent px-4 py-2 text-sm text-text-secondary transition-all duration-200 ease-in-out radix-state-active:bg-secondary radix-state-active:text-foreground radix-state-active:shadow-lg',
              isSmallScreen ? 'flex-row rounded-lg' : 'rounded-xl',
              'w-full',
            )}
            value="simple"
            style={{ userSelect: 'none' }}
            flexDirection="row"
            height="auto"
            paddingHorizontal={16}
            gap={8}
            borderRadius={isSmallScreen ? 8 : 12}
            hoverStyle={{}}
            focusStyle={{}}
          >
            <Lightbulb aria-hidden="true" />
            <span>{localize('com_ui_simple')}</span>
          </TabsTrigger>
          <TabsTrigger
            className={cn(
              'group m-1 flex items-center justify-center gap-2 bg-transparent px-4 py-2 text-sm text-text-secondary transition-all duration-200 ease-in-out radix-state-active:bg-secondary radix-state-active:text-foreground radix-state-active:shadow-lg',
              isSmallScreen ? 'flex-row rounded-lg' : 'rounded-xl',
              'w-full',
            )}
            value="advanced"
            style={{ userSelect: 'none' }}
            flexDirection="row"
            height="auto"
            paddingHorizontal={16}
            gap={8}
            borderRadius={isSmallScreen ? 8 : 12}
            hoverStyle={{}}
            focusStyle={{}}
          >
            <Cog aria-hidden="true" />
            <span>{localize('com_ui_advanced')}</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value={'simple'} tabIndex={-1}>
        <div className="flex flex-col gap-3 text-sm text-text-primary">
          <SpeechToTextSwitch />
          <EngineSTTDropdown external={sttExternal} />
          <LanguageSTTDropdown />
          <div className="h-px bg-border-medium" role="none" />
          <TextToSpeechSwitch />
          <EngineTTSDropdown external={ttsExternal} />
          <VoiceDropdown />
        </div>
      </TabsContent>

      <TabsContent value={'advanced'} tabIndex={-1}>
        <div className="flex flex-col gap-3 text-sm text-text-primary">
          <ConversationModeSwitch />
          <div className="mt-2 h-px bg-border-medium" role="none" />
          <SpeechToTextSwitch />

          <EngineSTTDropdown external={sttExternal} />

          <LanguageSTTDropdown />
          <div className="pb-2">
            <AutoTranscribeAudioSwitch />
          </div>
          {autoTranscribeAudio && (
            <div className="pb-2">
              <DecibelSelector />
            </div>
          )}
          <div className="pb-2">
            <AutoSendTextSelector />
          </div>
          <div className="h-px bg-border-medium" role="none" />
          <div className="pb-3">
            <TextToSpeechSwitch />
          </div>
          <AutomaticPlaybackSwitch />
          <EngineTTSDropdown external={ttsExternal} />
          <VoiceDropdown />
          {engineTTS === 'browser' && (
            <div className="pb-2">
              <CloudBrowserVoicesSwitch />
            </div>
          )}
          <div className="pb-2">
            <PlaybackRate />
          </div>
          <CacheTTSSwitch />
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default React.memo(Speech);

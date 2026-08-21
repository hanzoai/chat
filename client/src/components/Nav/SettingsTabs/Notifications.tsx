import { memo } from 'react';
import ToggleSwitch from './ToggleSwitch';
import store from '~/store';

/**
 * Being told the answer has landed.
 *
 * Two things do that today and both are real: the reply can read itself out as
 * it streams (`StreamAudio`, which needs read-aloud on in General), and the
 * screen can be held awake while the reply is being written
 * (`System/WakeLockManager`, which watches the same submit state).
 *
 * Push and email are NOT here because this app cannot send either — there is no
 * subscription, no worker and no route behind them. A switch that stores a
 * preference nothing acts on is worse than the absence of the switch.
 */
function Notifications() {
  return (
    <div className="flex flex-col gap-3 p-1 text-sm text-text-primary">
      <div className="pb-3">
        <ToggleSwitch
          stateAtom={store.automaticPlayback}
          localizationKey="com_nav_automatic_playback"
          switchId="AutomaticPlayback"
        />
      </div>
      <div className="pb-3">
        <ToggleSwitch
          stateAtom={store.keepScreenAwake}
          localizationKey="com_nav_keep_screen_awake"
          switchId="keepScreenAwake"
        />
      </div>
    </div>
  );
}

export default memo(Notifications);

import * as artifacts from './artifacts';
import families from './families';
import endpoints from './endpoints';
import user from './user';
import text from './text';
import toast from './toast';
import submission from './submission';
import search from './search';
import preset from './preset';
import prompts from './prompts';
import lang from './language';
import settings from './settings';
import misc from './misc';
import isTemporary from './temporary';
import modelsConfig from './modelsConfig';
export * from './agents';

// Compose the actual store
const storeObject = {
  ...artifacts,
  ...families,
  ...endpoints,
  ...user,
  ...text,
  ...toast,
  ...submission,
  ...search,
  ...prompts,
  ...preset,
  ...lang,
  ...settings,
  ...misc,
  ...isTemporary,
  ...modelsConfig,
};

// Proxy: logs on first missing key
const debugStore = new Proxy(storeObject, {
  get(target, key) {
    const val = target[key];
    if (typeof key === 'string' && val === undefined) {
      // Only log this ONCE per missing key, then silence
      if (!(window && window.__recoilMissingKeys && window.__recoilMissingKeys.has(key))) {
        window.__recoilMissingKeys = window.__recoilMissingKeys || new Set();
        window.__recoilMissingKeys.add(key);

        console.error(`[RECOIL STORE PROXY] Missing atom/selector:`, key);
      }
    }
    return val;
  },
});

export default debugStore;

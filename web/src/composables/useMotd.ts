/**
 * MOTD (Message of the Day) composable
 * Loads MOTD from YAML config
 */

import { ref } from 'vue';
import { STORAGE_KEYS } from '../constants/index';
import { loadWebConfig } from '../utils/yamlLoader';

// Cached MOTD
const motdContent = ref<string | null>(null);
const isLoaded = ref(false);

/**
 * Load MOTD from YAML config
 */
async function loadMotd(): Promise<void> {
  if (isLoaded.value) {
    return;
  }

  const webConfig = await loadWebConfig();
  if (webConfig?.motd) {
    motdContent.value = webConfig.motd.trim();
  }
  isLoaded.value = true;
}

export function useMotd() {
  // §10 Offline Doctrine: check for a pending PWA update notice.
  // If the flag is set (by src-pwa/register-service-worker.ts updated() hook),
  // append one plain-text line to the MOTD and clear the flag immediately so
  // it only appears on the first visit after an update. No toast, no banner
  // (§3 F-tier). The line is styled identically to other MOTD lines.
  const getMotd = (): string => {
    const base = motdContent.value || '';
    if (localStorage.getItem(STORAGE_KEYS.pwaUpdatePending) === '1') {
      localStorage.removeItem(STORAGE_KEYS.pwaUpdatePending);
      return base ? base + '\nSystem updated.' : 'System updated.';
    }
    return base;
  };

  return {
    getMotd,
    loadMotd,
    isLoaded,
  };
}

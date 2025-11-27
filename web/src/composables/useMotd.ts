/**
 * MOTD (Message of the Day) composable
 * Loads MOTD from YAML config
 */

import { ref } from 'vue';
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
  const getMotd = (): string => {
    return motdContent.value || '';
  };

  return {
    getMotd,
    loadMotd,
    isLoaded,
  };
}

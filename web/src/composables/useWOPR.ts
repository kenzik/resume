/**
 * useWOPR - WOPR simulator integration for terminal
 *
 * Implements a WarGames (1983) style WOPR computer terminal experience.
 * This is a skeleton for Phase 1 - WASM integration comes in Phase 3.
 *
 * "Shall we play a game?"
 */

import { ref, onUnmounted } from 'vue';

// Game configuration
export const WOPR_CONFIG = {
  // Typing speed for WOPR responses (characters per second)
  typingSpeed: 30,
  // Delay before WOPR responds (ms)
  responseDelay: 500,
};

// Available games in WOPR
export const WOPR_GAMES: Record<string, string> = {
  wopr: 'WOPR',
  falken: 'FALKEN\'S MAZE',
  ttt: 'TIC-TAC-TOE',
  war: 'GLOBAL THERMONUCLEAR WAR',
};

// Game display titles for UI
export const WOPR_TITLES: Record<string, string> = {
  wopr: 'WOPR',
};

// Singleton state for the composable
const isActive = ref(false);
const isLoading = ref(false);
const loadProgress = ref(0);
const output = ref<string[]>([]);
const isWaitingForInput = ref(false);
const error = ref<string | null>(null);
const currentGame = ref<string | null>(null);

/**
 * useWOPR composable
 * Provides reactive state and methods for WOPR simulator integration
 */
export function useWOPR() {
  /**
   * Start the WOPR simulator
   */
  const startGame = async (game: string = 'wopr'): Promise<boolean> => {
    isLoading.value = true;
    loadProgress.value = 0;
    error.value = null;

    try {
      // Simulate loading progress
      loadProgress.value = 25;
      await new Promise(resolve => setTimeout(resolve, 200));

      loadProgress.value = 50;
      await new Promise(resolve => setTimeout(resolve, 200));

      loadProgress.value = 75;
      await new Promise(resolve => setTimeout(resolve, 200));

      loadProgress.value = 100;

      // Initialize state
      currentGame.value = game;
      isActive.value = true;
      isLoading.value = false;
      isWaitingForInput.value = true;
      output.value = [];

      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      error.value = msg;
      isLoading.value = false;
      console.error('[WOPR] Failed to start:', e);
      return false;
    }
  };

  /**
   * Send input to the WOPR simulator
   * For Phase 1, this is a placeholder that will be implemented in Phase 3
   */
  const sendInput = (line: string): boolean => {
    if (!isActive.value || !isWaitingForInput.value) {
      return false;
    }

    // Echo the user's input
    output.value.push(`> ${line}`);

    // Placeholder response - real logic comes in Phase 3
    isWaitingForInput.value = false;

    // Simulate WOPR "thinking"
    setTimeout(() => {
      output.value.push('');
      output.value.push('WOPR SYSTEM ACTIVE');
      output.value.push('');
      output.value.push('LOGON: ');
      isWaitingForInput.value = true;
    }, WOPR_CONFIG.responseDelay);

    return true;
  };

  /**
   * Quit the WOPR simulator and clean up
   */
  const quit = (): void => {
    // Reset state
    isActive.value = false;
    isLoading.value = false;
    loadProgress.value = 0;
    currentGame.value = null;
    error.value = null;
    output.value = [];
    isWaitingForInput.value = false;
  };

  /**
   * Get all output as a single string
   */
  const getOutputText = (): string => {
    return output.value.join('\n');
  };

  /**
   * Clear output buffer
   */
  const clearOutput = (): void => {
    output.value = [];
  };

  /**
   * Get available games
   */
  const getAvailableGames = (): string[] => {
    return Object.keys(WOPR_GAMES);
  };

  // Cleanup on component unmount
  onUnmounted(() => {
    if (isActive.value) {
      quit();
    }
  });

  return {
    // State (reactive)
    isActive,
    isLoading,
    loadProgress,
    output,
    isWaitingForInput,
    error,
    currentGame,

    // Methods
    startGame,
    sendInput,
    quit,
    getOutputText,
    clearOutput,
    getAvailableGames,

    // Config
    config: WOPR_CONFIG,
  };
}

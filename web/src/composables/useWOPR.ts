/**
 * useWOPR - WOPR simulator integration for terminal
 *
 * Implements a WarGames (1983) style WOPR computer terminal experience.
 * Uses TypeScript implementation with state machine for dialogue flow.
 *
 * "Shall we play a game?"
 *
 * Based on zompiexx/wargames - Original Author: Andy Glenn
 */

import { ref, readonly, onUnmounted, type Ref } from 'vue';
import { WOPRStateMachine } from '../games/wopr/WOPRStateMachine';
import { WOPRState, type WOPROutput } from '../games/wopr/types';

// Game configuration
export const WOPR_CONFIG = {
  // Typing speed for WOPR responses (ms per character)
  typingSpeed: 8,
  // Delay before WOPR responds (ms)
  responseDelay: 100,
};

// Available games in WOPR
export const WOPR_GAMES: Record<string, string> = {
  wopr: 'WOPR',
  ttt: 'TIC-TAC-TOE',
  war: 'GLOBAL THERMONUCLEAR WAR',
};

// Game display titles for UI
export const WOPR_TITLES: Record<string, string> = {
  wopr: 'WOPR',
};

/**
 * Output line for display
 */
export interface WOPROutputLine {
  text: string;
  typewriter: boolean;
  delay: number;
  className?: string;
  timestamp: number;
}

// Singleton state for the composable
const isActive = ref(false);
const isLoading = ref(false);
const loadProgress = ref(0);
const output: Ref<WOPROutputLine[]> = ref([]);
const isWaitingForInput = ref(false);
const error = ref<string | null>(null);
const currentGame = ref<string | null>(null);
const currentPrompt = ref<string>('');
const currentState = ref<WOPRState>(WOPRState.CONNECTING);
const hasEnded = ref(false);

// State machine instance
let stateMachine: WOPRStateMachine | null = null;

/**
 * useWOPR composable
 * Provides reactive state and methods for WOPR simulator integration
 */
export function useWOPR() {
  /**
   * Handle output from state machine
   */
  const handleOutput = (woprOutput: WOPROutput): void => {
    output.value.push({
      text: woprOutput.text,
      typewriter: woprOutput.typewriter ?? true,
      delay: woprOutput.delay ?? WOPR_CONFIG.typingSpeed,
      className: woprOutput.className,
      timestamp: Date.now(),
    });
  };

  /**
   * Handle prompt change from state machine
   */
  const handlePrompt = (prompt: string): void => {
    currentPrompt.value = prompt;
    isWaitingForInput.value = true;
  };

  /**
   * Handle state change from state machine
   */
  const handleStateChange = (state: WOPRState): void => {
    currentState.value = state;

    if (state === WOPRState.QUITTING) {
      hasEnded.value = true;
      isWaitingForInput.value = false;
    }
  };

  /**
   * Start the WOPR simulator
   */
  const startGame = async (game: string = 'wopr'): Promise<boolean> => {
    isLoading.value = true;
    loadProgress.value = 0;
    error.value = null;
    hasEnded.value = false;
    output.value = [];

    try {
      // Simulate loading progress (dialup experience)
      loadProgress.value = 25;
      await new Promise((resolve) => setTimeout(resolve, 150));

      loadProgress.value = 50;
      await new Promise((resolve) => setTimeout(resolve, 150));

      loadProgress.value = 75;
      await new Promise((resolve) => setTimeout(resolve, 150));

      loadProgress.value = 100;

      // Create state machine
      stateMachine = new WOPRStateMachine(
        handleOutput,
        handlePrompt,
        handleStateChange
      );

      // Initialize state
      currentGame.value = game;
      isActive.value = true;
      isLoading.value = false;
      isWaitingForInput.value = false;

      // Start the WOPR simulation
      await stateMachine.start();

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
   */
  const sendInput = async (line: string): Promise<boolean> => {
    if (!isActive.value || !stateMachine) {
      return false;
    }

    // Disable input while processing
    isWaitingForInput.value = false;

    try {
      // Process the input through state machine
      await stateMachine.processInput(line);

      // Check if session ended
      if (stateMachine.hasEnded()) {
        hasEnded.value = true;
      }

      return true;
    } catch (e) {
      console.error('[WOPR] Error processing input:', e);
      isWaitingForInput.value = true;
      return false;
    }
  };

  /**
   * Quit the WOPR simulator and clean up
   */
  const quit = (): void => {
    stateMachine = null;

    // Reset state
    isActive.value = false;
    isLoading.value = false;
    loadProgress.value = 0;
    currentGame.value = null;
    error.value = null;
    output.value = [];
    isWaitingForInput.value = false;
    currentPrompt.value = '';
    currentState.value = WOPRState.CONNECTING;
    hasEnded.value = false;
  };

  /**
   * Get all output as a single string
   */
  const getOutputText = (): string => {
    return output.value.map((line) => line.text).join('\n');
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

  /**
   * Get the latest output lines (for scrolling)
   */
  const getRecentOutput = (count: number = 50): WOPROutputLine[] => {
    return output.value.slice(-count);
  };

  /**
   * Check if a specific state is active
   */
  const isInState = (state: WOPRState): boolean => {
    return currentState.value === state;
  };

  // Cleanup on component unmount
  onUnmounted(() => {
    if (isActive.value) {
      quit();
    }
  });

  return {
    // State (reactive, readonly where appropriate)
    isActive: readonly(isActive),
    isLoading: readonly(isLoading),
    loadProgress: readonly(loadProgress),
    output: readonly(output),
    isWaitingForInput: readonly(isWaitingForInput),
    error: readonly(error),
    currentGame: readonly(currentGame),
    currentPrompt: readonly(currentPrompt),
    currentState: readonly(currentState),
    hasEnded: readonly(hasEnded),

    // Methods
    startGame,
    sendInput,
    quit,
    getOutputText,
    clearOutput,
    getAvailableGames,
    getRecentOutput,
    isInState,

    // Config
    config: WOPR_CONFIG,

    // State enum for external use
    WOPRState,
  };
}

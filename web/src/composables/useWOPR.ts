/**
 * useWOPR - WOPR simulator integration for terminal
 *
 * Implements a WarGames (1983) style WOPR computer terminal experience.
 * Supports both WASM (compiled C) and TypeScript implementations.
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
  // WASM module path
  wasmPath: '/games/wopr/wopr.js',
  // Whether to prefer WASM over TypeScript
  preferWasm: true,
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

/**
 * WASM module interface
 */
interface WOPRWasmModule {
  ccall: (
    name: string,
    returnType: string | null,
    argTypes: string[],
    args: (string | number)[]
  ) => string | number | null;
  cwrap: (
    name: string,
    returnType: string | null,
    argTypes: string[]
  ) => (...args: (string | number)[]) => string | number | null;
  UTF8ToString: (ptr: number) => string;
  allocateUTF8?: (str: string) => number;
  stringToUTF8?: (str: string, outPtr: number, maxBytesToWrite: number) => void;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
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
const usingWasm = ref(false);

// Implementation instances
let stateMachine: WOPRStateMachine | null = null;
let wasmModule: WOPRWasmModule | null = null;

// WASM function wrappers
let wasmInit: (() => void) | null = null;
let wasmInput: ((input: string) => string) | null = null;
let wasmGetState: (() => number) | null = null;
let wasmHasEnded: (() => number) | null = null;

/**
 * Check if WASM is available
 */
async function checkWasmAvailable(): Promise<boolean> {
  try {
    const response = await fetch(WOPR_CONFIG.wasmPath, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Load WASM module via script tag (required for Vite /public files)
 */
async function loadWasmModule(): Promise<boolean> {
  try {
    // Load Emscripten glue code via script tag (can't use import() for /public files)
    const createWOPR = await new Promise<
      (moduleArg?: object) => Promise<WOPRWasmModule>
    >((resolve, reject) => {
      // Check if already loaded
      if ((window as unknown as Record<string, unknown>).createWOPR) {
        resolve(
          (window as unknown as Record<string, unknown>).createWOPR as (
            moduleArg?: object
          ) => Promise<WOPRWasmModule>
        );
        return;
      }

      const script = document.createElement('script');
      script.src = WOPR_CONFIG.wasmPath;
      script.async = true;

      script.onload = () => {
        const factory = (window as unknown as Record<string, unknown>)
          .createWOPR as
          | ((moduleArg?: object) => Promise<WOPRWasmModule>)
          | undefined;
        if (factory) {
          resolve(factory);
        } else {
          reject(new Error('createWOPR not found after script load'));
        }
      };

      script.onerror = () => {
        reject(new Error('Failed to load WOPR WASM script'));
      };

      document.head.appendChild(script);
    });

    wasmModule = await createWOPR();

    if (!wasmModule) {
      throw new Error('WASM module failed to initialize');
    }

    // Create function wrappers
    wasmInit = () => {
      wasmModule!.ccall('wopr_init', null, [], []);
    };

    wasmInput = (input: string): string => {
      const resultPtr = wasmModule!.ccall(
        'wopr_input',
        'number',
        ['string'],
        [input]
      ) as number;
      return wasmModule!.UTF8ToString(resultPtr);
    };

    wasmGetState = () => {
      return wasmModule!.ccall('wopr_get_state', 'number', [], []) as number;
    };

    wasmHasEnded = () => {
      return wasmModule!.ccall('wopr_has_ended', 'number', [], []) as number;
    };

    return true;
  } catch (e) {
    console.warn('[WOPR] WASM load failed, falling back to TypeScript:', e);
    wasmModule = null;
    wasmInit = null;
    wasmInput = null;
    wasmGetState = null;
    wasmHasEnded = null;
    return false;
  }
}

/**
 * Map WASM state number to WOPRState enum
 */
function mapWasmState(wasmState: number): WOPRState {
  const stateMap: Record<number, WOPRState> = {
    0: WOPRState.CONNECTING,
    1: WOPRState.LOGON,
    2: WOPRState.GREETING,
    3: WOPRState.ASK_PLAY,
    4: WOPRState.GAME_LIST,
    5: WOPRState.PLAYING_TTT,
    6: WOPRState.PLAYING_GTW,
    7: WOPRState.LESSON_LEARNED,
    8: WOPRState.IDLE,
    9: WOPRState.QUITTING,
  };
  return stateMap[wasmState] ?? WOPRState.IDLE;
}

/**
 * Parse WASM output into lines
 */
function parseWasmOutput(text: string): void {
  const lines = text.split('\n');
  for (const line of lines) {
    output.value.push({
      text: line,
      typewriter: true,
      delay: WOPR_CONFIG.typingSpeed,
      timestamp: Date.now(),
    });
  }
}

/**
 * useWOPR composable
 * Provides reactive state and methods for WOPR simulator integration
 */
export function useWOPR() {
  /**
   * Handle output from TypeScript state machine
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
   * Handle prompt change from TypeScript state machine
   */
  const handlePrompt = (prompt: string): void => {
    currentPrompt.value = prompt;
    isWaitingForInput.value = true;
  };

  /**
   * Handle state change from TypeScript state machine
   */
  const handleStateChange = (state: WOPRState): void => {
    currentState.value = state;

    if (state === WOPRState.QUITTING) {
      hasEnded.value = true;
      isWaitingForInput.value = false;
    }
  };

  /**
   * Start the WOPR simulator (WASM or TypeScript)
   */
  const startGame = async (game: string = 'wopr'): Promise<boolean> => {
    isLoading.value = true;
    loadProgress.value = 0;
    error.value = null;
    hasEnded.value = false;
    output.value = [];
    usingWasm.value = false;

    try {
      // Simulate dialup loading experience
      loadProgress.value = 10;
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to load WASM if preferred
      let useWasm = false;
      if (WOPR_CONFIG.preferWasm) {
        loadProgress.value = 20;
        const wasmAvailable = await checkWasmAvailable();

        if (wasmAvailable) {
          loadProgress.value = 40;
          useWasm = await loadWasmModule();
        }
      }

      loadProgress.value = 60;
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (useWasm && wasmInit && wasmInput) {
        // Use WASM implementation
        console.log('[WOPR] Using WASM implementation');
        usingWasm.value = true;

        loadProgress.value = 80;

        // Initialize WASM
        wasmInit();

        // Get initial output
        const initialOutput = wasmModule!.ccall(
          'wopr_get_output',
          'number',
          [],
          []
        ) as number;
        const initialText = wasmModule!.UTF8ToString(initialOutput);
        if (initialText) {
          parseWasmOutput(initialText);
        }

        // Update state
        if (wasmGetState) {
          currentState.value = mapWasmState(wasmGetState());
        }

        isWaitingForInput.value = true;
      } else {
        // Use TypeScript implementation
        console.log('[WOPR] Using TypeScript implementation');

        loadProgress.value = 80;

        // Create state machine
        stateMachine = new WOPRStateMachine(
          handleOutput,
          handlePrompt,
          handleStateChange
        );

        // Start the WOPR simulation
        await stateMachine.start();
      }

      loadProgress.value = 100;

      // Initialize state
      currentGame.value = game;
      isActive.value = true;
      isLoading.value = false;

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
    if (!isActive.value) {
      return false;
    }

    // Disable input while processing
    isWaitingForInput.value = false;

    try {
      if (usingWasm.value && wasmInput && wasmGetState && wasmHasEnded) {
        // WASM implementation
        const responseText = wasmInput(line);

        if (responseText) {
          parseWasmOutput(responseText);
        }

        // Update state
        currentState.value = mapWasmState(wasmGetState());

        // Check if ended
        if (wasmHasEnded() === 1) {
          hasEnded.value = true;
          currentState.value = WOPRState.QUITTING;
        } else {
          isWaitingForInput.value = true;
        }
      } else if (stateMachine) {
        // TypeScript implementation
        await stateMachine.processInput(line);

        // Check if session ended
        if (stateMachine.hasEnded()) {
          hasEnded.value = true;
        }
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
    wasmModule = null;
    wasmInit = null;
    wasmInput = null;
    wasmGetState = null;
    wasmHasEnded = null;

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
    usingWasm.value = false;
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
    usingWasm: readonly(usingWasm),

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

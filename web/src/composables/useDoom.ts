/**
 * useDoom - DOOM game integration for terminal using js-dos
 * 
 * Uses js-dos (DOSBox in WebAssembly) to run the original DOS DOOM.EXE.
 * This is more reliable than custom WASM ports and runs the authentic game.
 * 
 * @see https://js-dos.com/
 */

import { ref, onUnmounted } from 'vue';

// Game configuration
export const DOOM_CONFIG = {
  // FreeDoom bundle - 100% legal open-source DOOM replacement
  // BSD licensed, safe for commercial use
  localBundlePath: '/games/doom/freedoom.jsdos',
  // Canvas dimensions
  width: 640,
  height: 400,
};

// Game display titles for UI
export const DOOM_TITLES: Record<string, string> = {
  doom1: 'DOOM',
  doom: 'DOOM',
};

// js-dos types
interface DosInstance {
  stop: () => void;
  layers: {
    setScale: (scale: number) => void;
  };
}

interface DosFactoryType {
  (container: HTMLElement, options?: DosOptions): Promise<DosInstance>;
}

interface DosOptions {
  url?: string;
  dosboxConf?: string;
  noCloud?: boolean;
  noNetworking?: boolean;
  noSocialBlade?: boolean;
  withExperimentalApi?: boolean;
  autoStart?: boolean;
}

// Extend Window to include Dos
declare global {
  interface Window {
    Dos?: DosFactoryType;
    emulators?: {
      pathPrefix: string;
    };
  }
}

// Singleton state for the composable
const isActive = ref(false);
const isLoading = ref(false);
const isPaused = ref(false);
const loadProgress = ref(0);
const error = ref<string | null>(null);
const currentGame = ref<string | null>(null);
const audioEnabled = ref(true);

// Instance references
let dosInstance: DosInstance | null = null;
let containerElement: HTMLElement | null = null;
let scriptsLoaded = false;

/**
 * Load js-dos scripts from CDN
 */
async function loadJsDosScripts(): Promise<void> {
  if (scriptsLoaded && window.Dos) {
    return;
  }
  
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.Dos) {
      scriptsLoaded = true;
      resolve();
      return;
    }
    
    // Load CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://v8.js-dos.com/latest/js-dos.css';
    document.head.appendChild(cssLink);
    
    // Load JS
    const script = document.createElement('script');
    script.src = 'https://v8.js-dos.com/latest/js-dos.js';
    script.async = true;
    
    script.onload = () => {
      scriptsLoaded = true;
      // Give it a moment to initialize - check multiple times with increasing delays
      let attempts = 0;
      const maxAttempts = 10;
      const checkInterval = 100;
      
      const checkReady = () => {
        attempts++;
        if (window.Dos) {
          resolve();
        } else if (attempts < maxAttempts) {
          setTimeout(checkReady, checkInterval);
        } else {
          reject(new Error('js-dos loaded but Dos function not available after initialization'));
        }
      };
      
      setTimeout(checkReady, checkInterval);
    };
    
    script.onerror = (event) => {
      const errorMsg = event instanceof ErrorEvent ? event.message : 'Unknown error';
      reject(new Error(`Failed to load js-dos script: ${errorMsg}. Check browser console and CSP settings.`));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * useDoom composable
 * Provides reactive state and methods for DOOM game integration via js-dos
 */
export function useDoom() {
  /**
   * Start the game
   */
  const startGame = async (
    _game: string = 'doom1',
    container: HTMLElement
  ): Promise<boolean> => {
    isLoading.value = true;
    loadProgress.value = 0;
    error.value = null;
    containerElement = container;

    try {
      // Load js-dos scripts
      loadProgress.value = 10;
      console.log('[DOOM] Loading js-dos...');
      await loadJsDosScripts();
      loadProgress.value = 30;
      
      if (!window.Dos) {
        throw new Error('js-dos not available');
      }
      
      console.log('[DOOM] Starting DOSBox...');
      loadProgress.value = 50;
      
      // Initialize js-dos with the FreeDoom bundle
      dosInstance = await window.Dos(container, {
        url: DOOM_CONFIG.localBundlePath,
        noCloud: true,
        noNetworking: true,
        noSocialBlade: true,
        autoStart: true,  // Auto-start the game instead of showing player UI
      });
      
      loadProgress.value = 100;
      console.log('[DOOM] Game started!');
      
      // Initialize state
      currentGame.value = 'doom1';
      isActive.value = true;
      isLoading.value = false;
      isPaused.value = false;
      
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      error.value = msg;
      isLoading.value = false;
      console.error('[DOOM] Failed to start:', e);
      return false;
    }
  };

  /**
   * Pause the game
   */
  const pause = (): void => {
    isPaused.value = true;
    // js-dos doesn't have a native pause - we overlay a modal
  };

  /**
   * Resume the game
   */
  const resume = (): void => {
    isPaused.value = false;
    
    // Refocus container for input capture
    if (containerElement) {
      const canvas = containerElement.querySelector('canvas');
      if (canvas) {
        canvas.focus();
      }
    }
  };

  /**
   * Quit the game and clean up
   */
  const quit = (): void => {
    // Stop the DOS instance
    if (dosInstance) {
      try {
        dosInstance.stop();
      } catch (e) {
        console.warn('[DOOM] Error stopping instance:', e);
      }
      dosInstance = null;
    }
    
    // Clear container
    if (containerElement) {
      containerElement.innerHTML = '';
      containerElement = null;
    }
    
    // Reset state
    isActive.value = false;
    isLoading.value = false;
    isPaused.value = false;
    loadProgress.value = 0;
    currentGame.value = null;
    error.value = null;
  };

  /**
   * Toggle audio on/off
   */
  const toggleAudio = (): void => {
    audioEnabled.value = !audioEnabled.value;
    // Note: js-dos audio control would require more advanced API access
    console.log('[DOOM] Audio toggled:', audioEnabled.value);
  };

  /**
   * Handle keyboard input (forwarded from component)
   * js-dos handles its own keyboard capture, but we prevent defaults
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!isActive.value || isPaused.value) return;
    
    // Prevent browser shortcuts for game keys
    const gameKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'Space', 'ControlLeft', 'ControlRight',
      'ShiftLeft', 'ShiftRight',
      'Enter', 'Tab',
      'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7',
    ];
    
    if (gameKeys.includes(event.code)) {
      event.preventDefault();
    }
  };

  /**
   * Handle keyboard release
   */
  const handleKeyUp = (_event: KeyboardEvent): void => {
    // js-dos handles key release internally
  };

  /**
   * Get available games
   */
  const getAvailableGames = (): string[] => {
    return ['doom1'];
  };

  /**
   * Check if game assets exist (for pre-flight check)
   */
  const checkAssets = async (): Promise<boolean> => {
    try {
      const response = await fetch(DOOM_CONFIG.localBundlePath, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
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
    isPaused,
    loadProgress,
    error,
    currentGame,
    audioEnabled,
    
    // Methods
    startGame,
    pause,
    resume,
    quit,
    toggleAudio,
    handleKeyDown,
    handleKeyUp,
    getAvailableGames,
    checkAssets,
    
    // Config
    config: DOOM_CONFIG,
  };
}

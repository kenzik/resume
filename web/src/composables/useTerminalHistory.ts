/**
 * Terminal History Composable
 *
 * Manages command history for the terminal, including:
 * - Command history array with up/down navigation
 * - History persistence to localStorage
 * - Max history limit (default: 50 commands)
 */

import { ref, computed } from 'vue';
import { LocalStorage } from 'quasar';
import { TERMINAL_CONFIG, STORAGE_KEYS } from '../constants';

// =============================================================================
// Configuration
// =============================================================================

const MAX_HISTORY_LENGTH = TERMINAL_CONFIG.commandHistoryMaxLength;
const STORAGE_KEY = `${STORAGE_KEYS.font}-command-history`; // Reuse font key prefix pattern

// =============================================================================
// Singleton Reactive State
// Shared across all uses of this composable
// =============================================================================

// Command history array (most recent at the end)
const commandHistory = ref<string[]>([]);

// Current position in history navigation (-1 = not navigating, at current input)
const historyIndex = ref(-1);

// Saved input when user starts navigating history
const savedInput = ref('');

// Track if history has been loaded from storage
let historyLoaded = false;

// =============================================================================
// Persistence Functions
// =============================================================================

/**
 * Load command history from localStorage
 */
function loadHistory(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = LocalStorage.getItem<string[]>(STORAGE_KEY);
    if (Array.isArray(stored)) {
      // Ensure all items are strings and limit to max length
      return stored
        .filter((item): item is string => typeof item === 'string')
        .slice(-MAX_HISTORY_LENGTH);
    }
  } catch (e) {
    console.warn('Failed to load command history:', e);
  }
  return [];
}

/**
 * Save command history to localStorage
 */
function saveHistory(history: string[]) {
  if (typeof window === 'undefined') return;

  try {
    LocalStorage.set(STORAGE_KEY, history.slice(-MAX_HISTORY_LENGTH));
  } catch (e) {
    console.warn('Failed to save command history:', e);
  }
}

/**
 * Initialize history from storage (idempotent)
 */
function initializeHistory() {
  if (historyLoaded || typeof window === 'undefined') return;

  commandHistory.value = loadHistory();
  historyLoaded = true;
}

// =============================================================================
// Composable Export
// =============================================================================

export function useTerminalHistory() {
  // Initialize on first use
  initializeHistory();

  // ==========================================================================
  // Command History Management
  // ==========================================================================

  /**
   * Add a command to history
   * - Skips empty commands
   * - Avoids duplicating the last command
   * - Trims to max length
   * - Persists to localStorage
   */
  const addCommand = (command: string) => {
    // Skip empty commands
    if (!command.trim()) return;

    // Avoid duplicating the last command
    if (commandHistory.value[commandHistory.value.length - 1] === command) {
      return;
    }

    // Add to history
    commandHistory.value.push(command);

    // Trim to max length
    if (commandHistory.value.length > MAX_HISTORY_LENGTH) {
      commandHistory.value.shift();
    }

    // Persist to storage
    saveHistory(commandHistory.value);
  };

  /**
   * Navigate through command history (up/down arrows)
   *
   * @param direction -1 for up (older), 1 for down (newer)
   * @param currentInput The current input value before navigation
   * @returns The new input value to display, or null if no change
   */
  const navigateHistory = (direction: number, currentInput: string): string | null => {
    if (commandHistory.value.length === 0) return null;

    // Save current input when starting to navigate (going up from -1)
    if (historyIndex.value === -1 && direction === -1) {
      savedInput.value = currentInput;
    }

    // Calculate new index
    // direction -1 = up (older), direction 1 = down (newer)
    const newIndex = historyIndex.value - direction;

    if (newIndex < -1) {
      // Past the newest entry - stay at current input
      return null;
    } else if (newIndex >= commandHistory.value.length) {
      // Past the oldest entry - stay at oldest
      return null;
    }

    historyIndex.value = newIndex;

    if (historyIndex.value === -1) {
      // Back to current input (not in history)
      return savedInput.value;
    } else {
      // Show command from history (most recent is at end of array)
      return commandHistory.value[commandHistory.value.length - 1 - historyIndex.value];
    }
  };

  /**
   * Reset navigation state (call after command execution)
   */
  const resetNavigation = () => {
    historyIndex.value = -1;
    savedInput.value = '';
  };

  /**
   * Get formatted history for display (numbered list like bash)
   */
  const getFormattedHistory = (): string => {
    if (commandHistory.value.length === 0) {
      return '';
    }

    return commandHistory.value
      .map((cmd, index) => `  ${String(index + 1).padStart(4)}  ${cmd}`)
      .join('\n');
  };

  /**
   * Clear command history
   * Note: This clears both in-memory and persisted history
   */
  const clearHistory = () => {
    commandHistory.value = [];
    historyIndex.value = -1;
    savedInput.value = '';
    saveHistory([]);
  };

  /**
   * Get the number of commands in history
   */
  const historyLength = computed(() => commandHistory.value.length);

  /**
   * Check if currently navigating history
   */
  const isNavigating = computed(() => historyIndex.value !== -1);

  return {
    // State (readonly)
    history: computed(() => [...commandHistory.value]),
    historyLength,
    isNavigating,

    // Actions
    addCommand,
    navigateHistory,
    resetNavigation,
    getFormattedHistory,
    clearHistory,
  };
}

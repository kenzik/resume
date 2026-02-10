/**
 * Terminal Modes Composable
 *
 * Manages terminal mode state (normal, pager, zmachine, doom, wopr)
 * and mode-specific transition logic.
 */

import { ref, computed } from 'vue';

/**
 * Terminal mode types
 */
export type TerminalMode = 'normal' | 'pager' | 'zmachine' | 'doom' | 'wopr';

/**
 * CRT transition effect types
 */
export type TransitionType = 'smack' | 'roll';

/**
 * Pager mode state
 */
export interface PagerState {
  command: string;
  rawContent: string;
}

// =============================================================================
// Singleton Reactive State
// Shared across all uses of this composable
// =============================================================================

// Pager mode state
const pagerMode = ref(false);
const pagerCommand = ref('');
const pagerRawContent = ref('');

// Z-Machine mode state
const zmachineMode = ref(false);
const zmachineTransitioning = ref(false);
const zmachineTransitionType = ref<TransitionType>('smack');
const showZMachineQuitModal = ref(false);

// DOOM mode state
const doomMode = ref(false);
const doomTransitioning = ref(false);
const doomTransitionType = ref<TransitionType>('smack');
const showDoomPauseModal = ref(false);

// WOPR mode state
const woprMode = ref(false);
const woprTransitioning = ref(false);
const woprTransitionType = ref<TransitionType>('smack');
const showWOPRQuitModal = ref(false);

// =============================================================================
// Composable Export
// =============================================================================

export function useTerminalModes() {
  // ==========================================================================
  // Computed Properties
  // ==========================================================================

  /**
   * Current active terminal mode
   */
  const currentMode = computed<TerminalMode>(() => {
    if (pagerMode.value) return 'pager';
    if (zmachineMode.value) return 'zmachine';
    if (doomMode.value) return 'doom';
    if (woprMode.value) return 'wopr';
    return 'normal';
  });

  /**
   * Whether any special mode is active (not normal terminal)
   */
  const isSpecialModeActive = computed(() => currentMode.value !== 'normal');

  /**
   * Whether any transition animation is active
   */
  const isTransitioning = computed(() =>
    zmachineTransitioning.value ||
    doomTransitioning.value ||
    woprTransitioning.value
  );

  /**
   * Current transition type (if transitioning)
   */
  const currentTransitionType = computed<TransitionType | null>(() => {
    if (zmachineTransitioning.value) return zmachineTransitionType.value;
    if (doomTransitioning.value) return doomTransitionType.value;
    if (woprTransitioning.value) return woprTransitionType.value;
    return null;
  });

  // ==========================================================================
  // Pager Mode Functions
  // ==========================================================================

  /**
   * Enter pager mode with content
   */
  const enterPagerMode = (command: string, rawContent: string) => {
    pagerCommand.value = command;
    pagerRawContent.value = rawContent;
    pagerMode.value = true;
  };

  /**
   * Exit pager mode
   */
  const exitPagerMode = () => {
    pagerMode.value = false;
    pagerCommand.value = '';
    pagerRawContent.value = '';
  };

  // ==========================================================================
  // Z-Machine Mode Functions
  // ==========================================================================

  /**
   * Begin Z-Machine transition (before entering mode)
   */
  const beginZMachineTransition = (): TransitionType => {
    zmachineTransitionType.value = Math.random() > 0.5 ? 'smack' : 'roll';
    zmachineTransitioning.value = true;
    return zmachineTransitionType.value;
  };

  /**
   * Enter Z-Machine mode (after transition completes)
   */
  const enterZMachineMode = () => {
    zmachineMode.value = true;
    zmachineTransitioning.value = false;
  };

  /**
   * Exit Z-Machine mode
   */
  const exitZMachineMode = () => {
    zmachineMode.value = false;
    showZMachineQuitModal.value = false;
  };

  /**
   * Show Z-Machine quit confirmation modal
   */
  const showZMachineQuit = () => {
    showZMachineQuitModal.value = true;
  };

  /**
   * Hide Z-Machine quit confirmation modal
   */
  const hideZMachineQuit = () => {
    showZMachineQuitModal.value = false;
  };

  // ==========================================================================
  // DOOM Mode Functions
  // ==========================================================================

  /**
   * Begin DOOM transition (before entering mode)
   */
  const beginDoomTransition = (): TransitionType => {
    doomTransitionType.value = Math.random() > 0.5 ? 'smack' : 'roll';
    doomTransitioning.value = true;
    return doomTransitionType.value;
  };

  /**
   * Enter DOOM mode (after transition completes)
   */
  const enterDoomMode = () => {
    doomMode.value = true;
    doomTransitioning.value = false;
  };

  /**
   * Exit DOOM mode
   */
  const exitDoomMode = () => {
    doomMode.value = false;
    showDoomPauseModal.value = false;
  };

  /**
   * Show DOOM pause modal
   */
  const showDoomPause = () => {
    showDoomPauseModal.value = true;
  };

  /**
   * Hide DOOM pause modal
   */
  const hideDoomPause = () => {
    showDoomPauseModal.value = false;
  };

  // ==========================================================================
  // WOPR Mode Functions
  // ==========================================================================

  /**
   * Begin WOPR transition (before entering mode)
   */
  const beginWOPRTransition = (): TransitionType => {
    woprTransitionType.value = Math.random() > 0.5 ? 'smack' : 'roll';
    woprTransitioning.value = true;
    return woprTransitionType.value;
  };

  /**
   * Enter WOPR mode (after transition completes)
   */
  const enterWOPRMode = () => {
    woprMode.value = true;
    woprTransitioning.value = false;
  };

  /**
   * Exit WOPR mode
   */
  const exitWOPRMode = () => {
    woprMode.value = false;
    showWOPRQuitModal.value = false;
  };

  /**
   * Show WOPR quit confirmation modal
   */
  const showWOPRQuit = () => {
    showWOPRQuitModal.value = true;
  };

  /**
   * Hide WOPR quit confirmation modal
   */
  const hideWOPRQuit = () => {
    showWOPRQuitModal.value = false;
  };

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  /**
   * Reset terminal transform after animation
   * Call this with the terminal element after transition completes
   */
  const resetTransformAfterTransition = (terminalEl: HTMLElement | null) => {
    if (terminalEl) {
      terminalEl.style.transform = '';
    }
  };

  /**
   * Get transition duration in milliseconds
   * Both smack and roll effects have 3 escalating phases totaling ~1.8s
   */
  const getTransitionDuration = (): number => {
    return 1800;
  };

  /**
   * Exit all special modes (for clear command)
   */
  const exitAllModes = () => {
    exitPagerMode();
    // Note: Z-Machine, DOOM, and WOPR mode exits should be handled by their
    // respective composables (useZMachine, useDoom, useWOPR) to properly clean up
  };

  return {
    // Current mode state
    currentMode,
    isSpecialModeActive,
    isTransitioning,
    currentTransitionType,

    // Pager mode
    pagerMode: computed(() => pagerMode.value),
    pagerCommand: computed(() => pagerCommand.value),
    pagerRawContent: computed(() => pagerRawContent.value),
    enterPagerMode,
    exitPagerMode,

    // Z-Machine mode
    zmachineMode: computed(() => zmachineMode.value),
    zmachineTransitioning: computed(() => zmachineTransitioning.value),
    zmachineTransitionType: computed(() => zmachineTransitionType.value),
    showZMachineQuitModal: computed(() => showZMachineQuitModal.value),
    beginZMachineTransition,
    enterZMachineMode,
    exitZMachineMode,
    showZMachineQuit,
    hideZMachineQuit,

    // DOOM mode
    doomMode: computed(() => doomMode.value),
    doomTransitioning: computed(() => doomTransitioning.value),
    doomTransitionType: computed(() => doomTransitionType.value),
    showDoomPauseModal: computed(() => showDoomPauseModal.value),
    beginDoomTransition,
    enterDoomMode,
    exitDoomMode,
    showDoomPause,
    hideDoomPause,

    // WOPR mode
    woprMode: computed(() => woprMode.value),
    woprTransitioning: computed(() => woprTransitioning.value),
    woprTransitionType: computed(() => woprTransitionType.value),
    showWOPRQuitModal: computed(() => showWOPRQuitModal.value),
    beginWOPRTransition,
    enterWOPRMode,
    exitWOPRMode,
    showWOPRQuit,
    hideWOPRQuit,

    // Utilities
    resetTransformAfterTransition,
    getTransitionDuration,
    exitAllModes,
  };
}

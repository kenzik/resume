<template>
  <div class="terminal" :class="{
      'pager-active': modes.pagerMode.value,
      'zmachine-active': modes.zmachineMode.value,
      'doom-active': modes.doomMode.value,
      'wopr-active': modes.woprMode.value,
      'crt-smack': (modes.zmachineTransitioning.value && modes.zmachineTransitionType.value === 'smack') || (modes.doomTransitioning.value && modes.doomTransitionType.value === 'smack') || (modes.woprTransitioning.value && modes.woprTransitionType.value === 'smack'),
      'crt-roll': (modes.zmachineTransitioning.value && modes.zmachineTransitionType.value === 'roll') || (modes.doomTransitioning.value && modes.doomTransitionType.value === 'roll') || (modes.woprTransitioning.value && modes.woprTransitionType.value === 'roll')
    }" ref="terminalRef">
    <!-- Z-Machine Quit Confirmation Modal -->
    <ZMachineQuitModal
      v-model="modes.showZMachineQuitModal.value"
      :game-title="currentGameTitle"
      @confirm="confirmZMachineQuit"
      @cancel="cancelZMachineQuit"
    />

    <!-- WOPR Quit Confirmation Modal -->
    <WOPRQuitModal
      v-model="modes.showWOPRQuitModal.value"
      @confirm="confirmWOPRQuit"
      @cancel="cancelWOPRQuit"
    />

    <!-- DOOM Pause Modal -->
    <DoomPauseModal
      v-model="modes.showDoomPauseModal.value"
      :audio-enabled="doom.audioEnabled.value"
      @resume="handleDoomResume"
      @quit="handleDoomQuit"
      @toggle-sound="handleDoomToggleSound"
    />

    <!-- Normal terminal output - hidden during pager mode, zmachine mode, doom mode, or wopr mode -->
    <!-- Desktop: Use QScrollArea for smooth scrolling -->
    <q-scroll-area
      v-if="!isMobile && !modes.pagerMode.value && !modes.zmachineMode.value && !modes.doomMode.value && !modes.woprMode.value"
      class="terminal-output"
      ref="scrollAreaRef"
      :thumb-style="{ display: 'none' }"
      :bar-style="{ display: 'none' }"
    >
      <template v-for="(entry, index) in history" :key="index">
        <div v-if="!entry.isStartup" class="terminal-line">
          <TerminalPrompt />
          <span class="terminal-command">{{ entry.command }}</span>
        </div>
        <div v-if="entry.output" class="terminal-output-text" v-html="entry.output"></div>
        <div v-else-if="isTyping && index === history.length - 1" class="terminal-output-text">
          <span class="typing-indicator">▋</span>
        </div>
      </template>

      <div class="terminal-line terminal-input-line">
        <TerminalPrompt />
        <div class="input-wrapper" ref="inputWrapperRef">
          <input
            ref="inputRef"
            v-model="currentInput"
            @input="updateCursorPosition"
            @keydown.enter="executeCommand"
            @keydown.up="handleHistoryNavigation(-1)"
            @keydown.down="handleHistoryNavigation(1)"
            class="terminal-input"
            type="text"
            autofocus
            spellcheck="false"
        />
          <span
            class="cursor"
            :style="{ left: cursorLeft + 'px' }"
          >█</span>
        </div>
      </div>
    </q-scroll-area>

    <!-- Mobile: Use native scroll for better iOS Chrome compatibility -->
    <div
      v-if="isMobile && !modes.pagerMode.value && !modes.zmachineMode.value && !modes.doomMode.value && !modes.woprMode.value"
      class="terminal-output terminal-output-native"
      ref="nativeScrollRef"
      @scroll.passive="handleNativeScroll"
    >
      <template v-for="(entry, index) in history" :key="'m-' + index">
        <div v-if="!entry.isStartup" class="terminal-line">
          <TerminalPrompt />
          <span class="terminal-command">{{ entry.command }}</span>
        </div>
        <div v-if="entry.output" class="terminal-output-text" v-html="entry.output"></div>
        <div v-else-if="isTyping && index === history.length - 1" class="terminal-output-text">
          <span class="typing-indicator">▋</span>
        </div>
      </template>

      <div class="terminal-line terminal-input-line">
        <TerminalPrompt />
        <div class="input-wrapper" ref="inputWrapperRefMobile">
          <input
            ref="inputRefMobile"
            v-model="currentInput"
            @input="updateCursorPosition"
            @keydown.enter="executeCommand"
            @keydown.up="handleHistoryNavigation(-1)"
            @keydown.down="handleHistoryNavigation(1)"
            @focus="handleMobileInputFocus"
            @blur="handleMobileInputBlur"
            class="terminal-input"
            type="text"
            autofocus
            spellcheck="false"
        />
          <span
            class="cursor"
            :style="{ left: cursorLeft + 'px' }"
          >█</span>
        </div>
      </div>
    </div>

    <!-- Scroll indicators - show when content extends beyond visible area (mobile only) -->
    <ScrollIndicators
      v-if="isMobile && !modes.pagerMode.value && !modes.zmachineMode.value && !modes.doomMode.value && !modes.woprMode.value"
      :show-top="hasScrollableContentAbove"
      :show-bottom="hasScrollableContentBelow"
    />

    <!-- Pager mode - separate scrollable area with keyboard navigation -->
    <TerminalPager
      :active="modes.pagerMode.value"
      :command="modes.pagerCommand.value"
      :raw-content="modes.pagerRawContent.value"
      @exit="handlePagerExit"
    />

    <!-- Z-Machine mode - full terminal takeover for game -->
    <TerminalZMachine
      ref="zmachineRef"
      :active="modes.zmachineMode.value"
      :game-title="currentGameTitle"
      :output-lines="zmachineOutput"
      :typing-line="zmachineTypingLine"
      v-model="zmachineInput"
      @submit="handleZMachineSubmit"
    />

    <!-- WOPR mode - full terminal takeover for WarGames simulator -->
    <TerminalWOPR
      ref="woprRef"
      :active="modes.woprMode.value"
      :output-lines="woprOutput"
      :typing-line="woprTypingLine"
      v-model="woprInput"
      @submit="handleWOPRSubmit"
    />

    <!-- DOOM mode - full terminal takeover for FPS game -->
    <DoomCanvas
      v-if="modes.doomMode.value"
      ref="doomRef"
      :active="modes.doomMode.value"
      :game-id="doom.currentGame.value || 'doom1'"
      @pause="handleDoomPause"
      @quit="handleDoomQuit"
      @ready="handleDoomReady"
      @error="handleDoomError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { QScrollArea, useQuasar } from 'quasar';
import { useCommands } from '../composables/useCommands';
import { useTerminalModes } from '../composables/useTerminalModes';
import { useTerminalHistory } from '../composables/useTerminalHistory';
import type { HistoryEntry } from '../commands/types';
import { isNavigationCommand, getNavigationPath, isZMachineCommand, getZMachineGameId, isDoomCommand, getDoomGameId, isWOPRCommand, getWOPRGameId } from '../commands/types';
import { useTypewriter } from '../composables/useTypewriter';
import { useZMachine, GAME_TITLES } from '../composables/useZMachine';
import { useDoom, DOOM_TITLES } from '../composables/useDoom';
import { useWOPR, WOPR_TITLES } from '../composables/useWOPR';
import { hasPipe, parsePipeline, executePipeline } from '../composables/usePipeline';
import { ansiToHtml } from '../utils/ansiToHtml';
import TerminalPrompt from './TerminalPrompt.vue';
import ZMachineQuitModal from './ZMachineQuitModal.vue';
import WOPRQuitModal from './WOPRQuitModal.vue';
import DoomCanvas from './DoomCanvas.vue';
import DoomPauseModal from './DoomPauseModal.vue';
import ScrollIndicators from './terminal/ScrollIndicators.vue';
import TerminalPager from './terminal/TerminalPager.vue';
import TerminalZMachine from './terminal/TerminalZMachine.vue';
import TerminalWOPR from './terminal/TerminalWOPR.vue';
import {
  TYPEWRITER_SPEEDS,
  TERMINAL_CONFIG,
} from '../constants';

const router = useRouter();

// Commands to run automatically on startup (single code path for all commands)
const startupCommands = ['motd'];

const terminalRef = ref<HTMLElement | null>(null);
const scrollAreaRef = ref<InstanceType<typeof QScrollArea> | null>(null);
const nativeScrollRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const inputRefMobile = ref<HTMLInputElement | null>(null);
const zmachineRef = ref<InstanceType<typeof TerminalZMachine> | null>(null);
const zmachineInput = ref('');  // Separate input state for Z-Machine mode
const inputWrapperRef = ref<HTMLElement | null>(null);
const inputWrapperRefMobile = ref<HTMLElement | null>(null);
const cursorLeft = ref(0);

// Mobile detection using Quasar Platform (no resize listener needed)
const $q = useQuasar();
const isMobile = computed(() => $q.platform.is.mobile || $q.screen.lt.md);

// =============================================================================
// Composables
// =============================================================================
const modes = useTerminalModes();
const terminalHistory = useTerminalHistory();

// =============================================================================
// Scroll Indicators - show when content extends beyond visible area
// =============================================================================
const hasScrollableContentAbove = ref(false);
const hasScrollableContentBelow = ref(false);

// Debounce scroll indicator updates for performance
// Uses trailing-edge debounce: always processes the last call after delay
let scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const updateScrollIndicators = (scrollEl: HTMLElement | null, immediate: boolean = false) => {
  if (!scrollEl) return;

  const doUpdate = () => {
    if (!scrollEl) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollEl;
    const scrollBuffer = 5; // Buffer zone to prevent flickering at edges

    // Check if content extends above visible area
    hasScrollableContentAbove.value = scrollTop > scrollBuffer;

    // Check if content extends below visible area
    hasScrollableContentBelow.value = scrollTop + clientHeight < scrollHeight - scrollBuffer;
  };

  // Immediate mode skips debounce (used after programmatic scrolls)
  if (immediate) {
    if (scrollDebounceTimer) {
      clearTimeout(scrollDebounceTimer);
      scrollDebounceTimer = null;
    }
    doUpdate();
    return;
  }

  // Debounced mode for scroll events
  if (scrollDebounceTimer) {
    clearTimeout(scrollDebounceTimer);
  }

  scrollDebounceTimer = setTimeout(() => {
    scrollDebounceTimer = null;
    doUpdate();
  }, TERMINAL_CONFIG.scrollDebounceMs);
};

// Handle scroll events on the native scroll container
const handleNativeScroll = (event: Event) => {
  const target = event.target as HTMLElement;

  // Immediately reset any horizontal scroll - this is a safety net
  if (target.scrollLeft !== 0) {
    target.scrollLeft = 0;
  }

  updateScrollIndicators(target);
};

const currentInput = ref('');
const history = ref<HistoryEntry[]>([]);
const commandQueue = ref<string[]>([]);
const isExecutingCommand = ref(false);

// Z-Machine mode state
const zmachineOutput = ref<string[]>([]);   // Game output lines (fully typed)
const zmachineTypingLine = ref('');          // Currently typing line
const zmachineIsTyping = ref(false);         // Whether typewriter is active

// DOOM mode state
const doomRef = ref<InstanceType<typeof DoomCanvas> | null>(null);

// WOPR mode state
const woprRef = ref<InstanceType<typeof TerminalWOPR> | null>(null);
const woprInput = ref('');                    // Separate input state for WOPR mode
const woprOutput = ref<string[]>([]);         // WOPR output lines (fully typed)
const woprTypingLine = ref('');               // Currently typing line
const woprIsTyping = ref(false);              // Whether typewriter is active

const { execute: executeCmd, executeRaw, renderForDisplay } = useCommands();
const { typeText, isTyping } = useTypewriter();
const zmachine = useZMachine();
const doom = useDoom();
const wopr = useWOPR();

// Current game title for display (Z-Machine)
const currentGameTitle = computed(() => {
  const gameId = zmachine.currentGame.value;
  return GAME_TITLES[gameId || ''] || gameId?.toUpperCase() || 'GAME';
});

// Current DOOM title for display
const currentDoomTitle = computed(() => {
  const gameId = doom.currentGame.value;
  return DOOM_TITLES[gameId || ''] || 'DOOM';
});

// Current WOPR title for display
const currentWOPRTitle = computed(() => {
  const gameId = wopr.currentGame.value;
  return WOPR_TITLES[gameId || ''] || 'WOPR';
});

// Click handler stored at module level for proper cleanup
let terminalClickHandler: (() => void) | null = null;

// Cached canvas for text measurement (performance optimization)
let measureCanvas: HTMLCanvasElement | null = null;
let measureContext: CanvasRenderingContext2D | null = null;
let cachedFontString: string | null = null;

// Typewriter speeds are defined in constants/index.ts


/**
 * Helper to type output into a history entry with ANSI conversion
 * Consolidates the repeated typewriter logic across processCommand, processPipeline, etc.
 */
const typeOutputToHistory = async (
  entryIndex: number,
  output: string,
  config: { delay: number; charsPerTick: number } = TYPEWRITER_SPEEDS.default
) => {
  if (!output) return;

  // Pre-detect ANSI codes once for efficiency
  const hasAnsi = output.includes('\x1b[');

  await typeText(output, {
    delay: config.delay,
    charsPerTick: config.charsPerTick,
    onChar: (text) => {
      // Only run conversion if we know there are ANSI codes
      const htmlOutput = hasAnsi ? ansiToHtml(text) : text;
      history.value[entryIndex].output = htmlOutput;
      scrollToBottom();
    },
  });

  // Final ANSI conversion to ensure complete processing
  if (hasAnsi) {
    history.value[entryIndex].output = ansiToHtml(output);
  }

  // Ensure final scroll after typewriter completes
  scrollToBottom();
};

// Handle pager exit (called by TerminalPager component)
const handlePagerExit = () => {
  // Add command to history without output (like real `more` - output was already displayed)
  addHistoryEntry(modes.pagerCommand.value, '');

  // Reset pager state via composable
  modes.exitPagerMode();

  // Refocus input
  nextTick(() => {
    inputRef.value?.focus();
    scrollToBottom();
  });
};

// =============================================================================
// Z-Machine Mode Functions
// =============================================================================

/**
 * Enter Z-Machine mode - start the game
 */
const enterZMachineMode = async (gameId: string = 'zork1') => {
  // Don't add command to history - the magic word just vanishes mysteriously
  history.value.push({
    command: '',
    output: '<em>Loading game...</em>',
    isStartup: true
  });
  const loadingIdx = history.value.length - 1;
  scrollToBottom();

  // Start the game
  const success = await zmachine.startGame(gameId);

  if (!success) {
    history.value[loadingIdx].output = `<span style="color: var(--terminal-error)">Failed to load game: ${zmachine.error.value}</span>`;
    return;
  }

  // Clear the loading message
  history.value[loadingIdx].output = '<em>Starting game...</em>';

  // Begin CRT transition effect via composable
  modes.beginZMachineTransition();

  // Wait for transition
  const transitionDuration = modes.getTransitionDuration();
  await new Promise(resolve => setTimeout(resolve, transitionDuration));

  // Enter Z-Machine mode AFTER transition completes
  modes.enterZMachineMode();
  zmachineOutput.value = [];
  zmachineTypingLine.value = '';

  // Explicitly reset transform after animation to prevent layout issues on mobile
  modes.resetTransformAfterTransition(terminalRef.value);

  // Focus Z-Machine input
  nextTick(() => {
    zmachineRef.value?.focus();
  });

  // Get any initial output from game startup and type it out
  const initialOutput = zmachine.getOutputText();
  if (initialOutput) {
    zmachine.clearOutput();
    await typeZMachineOutput(initialOutput);
  }

  // Refocus after typing completes
  nextTick(() => {
    zmachineRef.value?.focus();
  });
};

/**
 * Exit Z-Machine mode - clean up and redirect to home for clean state
 */
const exitZMachineMode = () => {
  zmachine.quit();
  modes.exitZMachineMode();
  zmachineOutput.value = [];

  // Redirect to home page for a clean terminal state
  // This avoids mobile layout bugs that occur when switching modes
  router.push('/');
};

/**
 * Handle Z-Machine quit command - show confirmation
 */
const handleZMachineQuit = () => {
  modes.showZMachineQuit();
};

/**
 * Confirm Z-Machine quit
 */
const confirmZMachineQuit = () => {
  exitZMachineMode();
};

/**
 * Cancel Z-Machine quit - return to game
 */
const cancelZMachineQuit = () => {
  modes.hideZMachineQuit();
  nextTick(() => {
    const input = isMobile.value ? inputRefMobile.value : inputRef.value;
    input?.focus();
  });
};

// =============================================================================
// DOOM Mode Functions
// =============================================================================

/**
 * Enter DOOM mode - start the game
 */
const enterDoomMode = async (gameId: string = 'doom1') => {
  // Don't add command to history - the cheat code just vanishes mysteriously
  history.value.push({
    command: '',
    output: '<em>Initializing DOOM...</em>',
    isStartup: true
  });
  const loadingIdx = history.value.length - 1;
  scrollToBottom();

  // Begin CRT transition effect via composable
  modes.beginDoomTransition();

  // Wait for transition
  const transitionDuration = modes.getTransitionDuration();
  await new Promise(resolve => setTimeout(resolve, transitionDuration));

  // Clear the loading message
  history.value[loadingIdx].output = '';

  // Enter DOOM mode AFTER transition completes
  modes.enterDoomMode();

  // Explicitly reset transform after animation
  modes.resetTransformAfterTransition(terminalRef.value);

  // Focus DOOM canvas
  nextTick(() => {
    doomRef.value?.focus();
  });
};

/**
 * Exit DOOM mode - clean up and return to terminal
 */
const exitDoomMode = () => {
  doom.quit();
  modes.exitDoomMode();

  // Redirect to home page for a clean terminal state
  router.push('/');
};

/**
 * Handle DOOM pause - show pause modal
 */
const handleDoomPause = () => {
  doom.pause();
  modes.showDoomPause();
};

/**
 * Handle DOOM resume from pause modal
 */
const handleDoomResume = () => {
  modes.hideDoomPause();
  doom.resume();
  nextTick(() => {
    doomRef.value?.focus();
  });
};

/**
 * Handle DOOM quit from pause modal
 */
const handleDoomQuit = () => {
  exitDoomMode();
};

/**
 * Handle DOOM audio toggle
 */
const handleDoomToggleSound = () => {
  doom.toggleAudio();
};

/**
 * Handle DOOM ready event (game loaded successfully)
 */
const handleDoomReady = () => {
  // Game is ready, focus canvas
  nextTick(() => {
    doomRef.value?.focus();
  });
};

/**
 * Handle DOOM error
 */
const handleDoomError = (message: string) => {
  console.error('DOOM error:', message);
  // Exit DOOM mode on error
  modes.exitDoomMode();
  doom.quit();

  // Show error in terminal
  history.value.push({
    command: '',
    output: `<span style="color: var(--terminal-error)">DOOM failed to load: ${message}</span>`,
    isStartup: true,
  });
  scrollToBottom();
};

/**
 * Send input to Z-Machine
 */
const sendZMachineInput = (input: string) => {
  // Check for quit commands
  const lowerInput = input.toLowerCase().trim();
  if (lowerInput === 'quit' || lowerInput === 'q') {
    handleZMachineQuit();
    return;
  }

  // Add input to output display
  zmachineOutput.value.push(`> ${input}`);

  // Send to game
  zmachine.sendInput(input);

  // Scroll to bottom
  scrollZMachineToBottom();
};

/**
 * Scroll Z-Machine output to bottom
 */
const scrollZMachineToBottom = () => {
  nextTick(() => {
    zmachineRef.value?.scrollToBottom();
  });
};

/**
 * Handle Z-Machine command submission from component
 */
const handleZMachineSubmit = (command: string) => {
  if (command) {
    sendZMachineInput(command);
  }
};

/**
 * Type Z-Machine output through the typewriter effect
 */
const typeZMachineOutput = async (text: string) => {
  if (!text) return;

  zmachineIsTyping.value = true;

  // Split into lines and type each one
  const lines = text.split('\n');

  for (const line of lines) {
    if (!modes.zmachineMode.value) break; // Exit if user quit during typing

    // Type this line
    await typeText(line, {
      ...TYPEWRITER_SPEEDS.zmachine,
      onChar: (partialText) => {
        zmachineTypingLine.value = partialText;
        scrollZMachineToBottom();
      },
    });

    // Move completed line to output array (skip empty prompts like ">")
    const isEmptyPrompt = /^>\s*$/.test(line);
    if (!isEmptyPrompt) {
      zmachineOutput.value.push(line);
    }
    zmachineTypingLine.value = '';
  }

  zmachineIsTyping.value = false;
  scrollZMachineToBottom();
};

// Watch Z-Machine output length (not deep) to sync to display with typewriter
watch(() => zmachine.output.value.length, async (newLength) => {
  if (modes.zmachineMode.value && newLength > 0) {
    // Get new output (the composable accumulates)
    const text = zmachine.getOutputText();
    if (text) {
      zmachine.clearOutput();
      await typeZMachineOutput(text);
    }
  }
});

// =============================================================================
// WOPR Mode Functions
// =============================================================================

/**
 * Enter WOPR mode - start the WOPR simulator
 */
const enterWOPRMode = async (gameId: string = 'wopr') => {
  // Don't add command to history - the magic word just vanishes mysteriously
  history.value.push({
    command: '',
    output: '<em>Establishing connection...</em>',
    isStartup: true
  });
  const loadingIdx = history.value.length - 1;
  scrollToBottom();

  // Start the WOPR simulator
  const success = await wopr.startGame(gameId);

  if (!success) {
    history.value[loadingIdx].output = `<span style="color: var(--terminal-error)">Connection failed: ${wopr.error.value}</span>`;
    return;
  }

  // Clear the loading message
  history.value[loadingIdx].output = '<em>Connected to WOPR...</em>';

  // Begin CRT transition effect via composable
  modes.beginWOPRTransition();

  // Wait for transition
  const transitionDuration = modes.getTransitionDuration();
  await new Promise(resolve => setTimeout(resolve, transitionDuration));

  // Enter WOPR mode AFTER transition completes
  modes.enterWOPRMode();
  woprOutput.value = [];
  woprTypingLine.value = '';

  // Explicitly reset transform after animation to prevent layout issues on mobile
  modes.resetTransformAfterTransition(terminalRef.value);

  // Focus WOPR input
  nextTick(() => {
    woprRef.value?.focus();
  });

  // Get any initial output from WOPR startup and type it out
  const initialOutput = wopr.getOutputText();
  if (initialOutput) {
    wopr.clearOutput();
    await typeWOPROutput(initialOutput);
  }

  // Refocus after typing completes
  nextTick(() => {
    woprRef.value?.focus();
  });
};

/**
 * Exit WOPR mode - clean up and redirect to home for clean state
 */
const exitWOPRMode = () => {
  wopr.quit();
  modes.exitWOPRMode();
  woprOutput.value = [];

  // Redirect to home page for a clean terminal state
  router.push('/');
};

/**
 * Handle WOPR quit command - show confirmation
 */
const handleWOPRQuit = () => {
  modes.showWOPRQuit();
};

/**
 * Confirm WOPR quit
 */
const confirmWOPRQuit = () => {
  exitWOPRMode();
};

/**
 * Cancel WOPR quit - return to simulator
 */
const cancelWOPRQuit = () => {
  modes.hideWOPRQuit();
  nextTick(() => {
    woprRef.value?.focus();
  });
};

/**
 * Send input to WOPR
 */
const sendWOPRInput = (input: string) => {
  // Check for quit commands
  const lowerInput = input.toLowerCase().trim();
  if (lowerInput === 'quit' || lowerInput === 'q' || lowerInput === 'disconnect') {
    handleWOPRQuit();
    return;
  }

  // Add input to output display
  woprOutput.value.push(`> ${input}`);

  // Send to WOPR simulator
  wopr.sendInput(input);

  // Scroll to bottom
  scrollWOPRToBottom();
};

/**
 * Scroll WOPR output to bottom
 */
const scrollWOPRToBottom = () => {
  nextTick(() => {
    woprRef.value?.scrollToBottom();
  });
};

/**
 * Handle WOPR command submission from component
 */
const handleWOPRSubmit = (command: string) => {
  if (command) {
    sendWOPRInput(command);
  }
};

/**
 * Type WOPR output through the typewriter effect
 */
const typeWOPROutput = async (text: string) => {
  if (!text) return;

  woprIsTyping.value = true;

  // Split into lines and type each one
  const lines = text.split('\n');

  for (const line of lines) {
    if (!modes.woprMode.value) break; // Exit if user quit during typing

    // Type this line
    await typeText(line, {
      ...TYPEWRITER_SPEEDS.zmachine,
      onChar: (partialText) => {
        woprTypingLine.value = partialText;
        scrollWOPRToBottom();
      },
    });

    // Move completed line to output array (skip empty prompts like ">")
    const isEmptyPrompt = /^>\s*$/.test(line);
    if (!isEmptyPrompt) {
      woprOutput.value.push(line);
    }
    woprTypingLine.value = '';
  }

  woprIsTyping.value = false;
  scrollWOPRToBottom();
};

// Watch WOPR output length (not deep) to sync to display with typewriter
watch(() => wopr.output.value.length, async (newLength) => {
  if (modes.woprMode.value && newLength > 0) {
    // Get new output (the composable accumulates)
    const text = wopr.getOutputText();
    if (text) {
      wopr.clearOutput();
      await typeWOPROutput(text);
    }
  }
});

// Process a startup command (output only, no prompt shown)
const processStartupCommand = async (command: string) => {
  // Execute command through the same path as user commands
  const rawOutput = await executeCmd(command);
  const output = await renderForDisplay(rawOutput);

  // Add entry with isStartup flag (prompt won't be shown)
  history.value.push({ command, output: '', isStartup: true });
  const entryIndex = history.value.length - 1;

  // Type out output with typewriter effect
  await typeOutputToHistory(entryIndex, output);
  scrollToBottom();
};

// Run startup commands on mount
onMounted(async () => {
  // Run all startup commands through the standard command path
  for (const command of startupCommands) {
    await processStartupCommand(command);
  }

  // Cursor blinking is handled by CSS animation

  // Focus input after startup commands complete
  nextTick(() => {
    focusInputSafely();
    updateCursorPosition();

    // Initialize scroll indicators on mobile (immediate mode)
    if (isMobile.value && nativeScrollRef.value) {
      updateScrollIndicators(nativeScrollRef.value, true);
    }
  });
});

// Process the history command - outputs command history and pipes to more
const processHistoryCommand = async () => {
  const formattedHistory = terminalHistory.getFormattedHistory();

  if (!formattedHistory) {
    addHistoryEntry('history', '');
    const output = await renderForDisplay('*No commands in history*');
    history.value[history.value.length - 1].output = output;
    scrollToBottom();
    return;
  }

  // Pipe to more (enter pager mode)
  modes.enterPagerMode('history', '```\n' + formattedHistory + '\n```');
};

// Process a single command (may be a pipeline)
const processCommand = async (command: string) => {
  // Handle clear command specially
  if (command.toLowerCase() === 'clear') {
    clearTerminal();
    return;
  }

  // Handle history command specially (needs access to commandHistory state)
  if (command.toLowerCase() === 'history') {
    await processHistoryCommand();
    return;
  }

  // Check if this is a pipeline (contains |)
  if (hasPipe(command)) {
    await processPipeline(command);
    return;
  }

  // Single command - execute and display
  const rawOutput = await executeCmd(command);

  // Check if this is a navigation command
  if (isNavigationCommand(rawOutput)) {
    const targetPath = getNavigationPath(rawOutput);
    // Add command to history with navigation message
    addHistoryEntry(command, '');
    const entryIndex = history.value.length - 1;
    const navMessage = await renderForDisplay(`Navigating to **${targetPath}**...`);
    history.value[entryIndex].output = navMessage;

    // Navigate after a brief delay for visual feedback
    setTimeout(() => {
      router.push(targetPath);
    }, 500);
    return;
  }

  // Check if this is a Z-Machine command (hidden Easter egg)
  if (isZMachineCommand(rawOutput)) {
    const gameId = getZMachineGameId(rawOutput);
    await enterZMachineMode(gameId);
    return;
  }

  // Check if this is a DOOM command (hidden Easter egg)
  if (isDoomCommand(rawOutput)) {
    const gameId = getDoomGameId(rawOutput);
    await enterDoomMode(gameId);
    return;
  }

  // Check if this is a WOPR command (hidden Easter egg)
  if (isWOPRCommand(rawOutput)) {
    const gameId = getWOPRGameId(rawOutput);
    await enterWOPRMode(gameId);
    return;
  }

  const output = await renderForDisplay(rawOutput);

  // Add command to history first (without output)
  addHistoryEntry(command, '');
  const entryIndex = history.value.length - 1;

  // Type out output with typewriter effect
  await typeOutputToHistory(entryIndex, output);
  scrollToBottom();
};

// Process a pipeline command (e.g., "resume | more")
const processPipeline = async (command: string) => {
  const segments = parsePipeline(command);

  // Execute pipeline
  const result = await executePipeline(segments, async (cmd, args, stdin) => {
    return executeRaw(cmd, args, stdin);
  });

  // Check if we should enter pager mode
  if (result.pagerMode && result.pagerContent) {
    modes.enterPagerMode(command, result.pagerContent);
    return;
  }

  // Normal output - render and display
  const output = await renderForDisplay(result.output);

  // Add command to history
  addHistoryEntry(command, '');
  const entryIndex = history.value.length - 1;

  // Type out output with typewriter effect
  await typeOutputToHistory(entryIndex, output);
  scrollToBottom();
};

// Process the command queue
const processCommandQueue = async () => {
  if (isExecutingCommand.value || commandQueue.value.length === 0) {
    return;
  }

  isExecutingCommand.value = true;

  while (commandQueue.value.length > 0) {
    const command = commandQueue.value.shift();
    if (command) {
      await processCommand(command);
    }
  }

  isExecutingCommand.value = false;

  // On desktop: refocus input for continued typing
  // On mobile: keyboard was already dismissed in executeCommand, don't refocus
  if (!isMobile.value) {
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
};

// Execute command (entry point - queues if needed)
// Note: Z-Machine mode has its own input handled by TerminalZMachine component
const executeCommand = async () => {
  const command = currentInput.value.trim();

  // Empty input - just add blank line, keep keyboard open
  if (!command) {
    addHistoryEntry('', '');
    currentInput.value = '';
    updateCursorPosition();
    scrollToBottom();
    return;
  }

  // Valid command: on mobile, dismiss keyboard immediately so user can see output
  if (isMobile.value) {
    inputRefMobile.value?.blur();
  }

  // Add to command history via composable
  terminalHistory.addCommand(command);

  // Clear input
  currentInput.value = '';
  terminalHistory.resetNavigation();
  updateCursorPosition();

  // If a command is currently executing, queue this one
  if (isExecutingCommand.value) {
    commandQueue.value.push(command);
    return;
  }

  // Otherwise, add to queue and start processing
  commandQueue.value.push(command);
  await processCommandQueue();
};

// Add entry to history
const addHistoryEntry = (command: string, output: string) => {
  history.value.push({ command, output });
};

// Navigate command history (up/down arrows - shell-like behavior)
const handleHistoryNavigation = (direction: number) => {
  const newInput = terminalHistory.navigateHistory(direction, currentInput.value);

  if (newInput !== null) {
    currentInput.value = newInput;

    nextTick(() => {
      updateCursorPosition();
      // Move cursor to end of input
      if (inputRef.value) {
        inputRef.value.selectionStart = inputRef.value.value.length;
        inputRef.value.selectionEnd = inputRef.value.value.length;
      }
    });
  }
};

/**
 * Update cached font string from input element styles
 * Only called when font settings change (not on every keystroke)
 */
const updateCachedFont = () => {
  const inputEl = isMobile.value ? inputRefMobile.value : inputRef.value;
  if (inputEl) {
    const styles = window.getComputedStyle(inputEl);
    cachedFontString = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
  }
};

// Update cursor position based on input text width
const updateCursorPosition = () => {
  nextTick(() => {
    // Get the appropriate input ref based on mode and mobile detection
    // Z-Machine mode uses native caret, skip cursor position update
    if (modes.zmachineMode.value) {
      return;
    }

    const currentInputEl = isMobile.value ? inputRefMobile.value : inputRef.value;

    if (currentInputEl) {
      // Initialize canvas cache on first use
      if (!measureCanvas) {
        measureCanvas = document.createElement('canvas');
        measureContext = measureCanvas.getContext('2d');
      }

      // Initialize font cache if needed
      if (!cachedFontString) {
        updateCachedFont();
      }

      // Use cached Canvas API for fast measurement (no getComputedStyle on each keystroke)
      if (measureContext && cachedFontString) {
        measureContext.font = cachedFontString;
        const textWidth = measureContext.measureText(currentInputEl.value).width;
        cursorLeft.value = textWidth;
        return;
      }

      // Fallback: use hidden span to measure text width (slower)
      const styles = window.getComputedStyle(currentInputEl);
      const measureSpan = document.createElement('span');
      measureSpan.style.visibility = 'hidden';
      measureSpan.style.position = 'absolute';
      measureSpan.style.whiteSpace = 'pre';
      measureSpan.style.fontFamily = styles.fontFamily;
      measureSpan.style.fontSize = styles.fontSize;
      measureSpan.style.fontWeight = styles.fontWeight;
      measureSpan.style.fontStyle = styles.fontStyle;
      measureSpan.textContent = currentInputEl.value || '';

      document.body.appendChild(measureSpan);
      cursorLeft.value = measureSpan.offsetWidth;
      document.body.removeChild(measureSpan);
    } else {
      cursorLeft.value = 0;
    }
  });
};

// Scroll to bottom - different strategies for desktop vs mobile
const scrollToBottom = () => {
  nextTick(() => {
    if (isMobile.value) {
      // Mobile: More aggressive scrolling for Chrome iOS compatibility
      // Use requestAnimationFrame to ensure DOM is painted before scrolling
      requestAnimationFrame(() => {
        if (nativeScrollRef.value) {
          nativeScrollRef.value.scrollTop = nativeScrollRef.value.scrollHeight;
          // Always reset horizontal scroll on mobile to prevent left-shift bug
          nativeScrollRef.value.scrollLeft = 0;
        }
        if (terminalRef.value) {
          terminalRef.value.scrollLeft = 0;
        }
        // Double RAF for Chrome iOS - ensures scroll happens after paint
        requestAnimationFrame(() => {
          if (nativeScrollRef.value) {
            nativeScrollRef.value.scrollTop = nativeScrollRef.value.scrollHeight;
            nativeScrollRef.value.scrollLeft = 0; // Reset again after second RAF
            // Update scroll indicators after scrolling completes (immediate mode)
            updateScrollIndicators(nativeScrollRef.value, true);
          }
          // Don't use scrollIntoView on mobile - it causes unwanted horizontal scrolling
          // The terminal's own scroll handling is sufficient
        });
      });
    } else {
      // Desktop: Use QScrollArea API
      if (scrollAreaRef.value) {
        const scrollTarget = scrollAreaRef.value.getScrollTarget();
        scrollAreaRef.value.setScrollPosition('vertical', scrollTarget.scrollHeight, 0);
        // Update scroll indicators for desktop too
        requestAnimationFrame(() => {
          if (scrollTarget instanceof HTMLElement) {
            updateScrollIndicators(scrollTarget, true);
          }
        });
      }
    }
  });
};

// Clear terminal
const clearTerminal = () => {
  history.value = [];
  currentInput.value = '';
  terminalHistory.resetNavigation();
  // Note: command history is preserved across clears (like a real shell)

  // Exit pager mode if active
  if (modes.pagerMode.value) {
    modes.exitPagerMode();
  }

  // Exit Z-Machine mode if active
  if (modes.zmachineMode.value) {
    exitZMachineMode();
  }

  // Exit DOOM mode if active
  if (modes.doomMode.value) {
    exitDoomMode();
  }

  // Exit WOPR mode if active
  if (modes.woprMode.value) {
    exitWOPRMode();
  }

  updateCursorPosition();
  nextTick(() => {
    inputRef.value?.focus();
    scrollToBottom();
  });
};

// Handle keyboard shortcuts (Z-Machine mode, DOOM mode, WOPR mode, and global shortcuts)
// Note: Pager mode keyboard handling is in TerminalPager component
const handleKeyDown = (e: KeyboardEvent) => {
  // Z-Machine quit modal is handled by the modal component itself
  if (modes.showZMachineQuitModal.value) {
    return;
  }

  // DOOM pause modal is handled by the modal component itself
  if (modes.showDoomPauseModal.value) {
    return;
  }

  // WOPR quit modal is handled by the modal component itself
  if (modes.showWOPRQuitModal.value) {
    return;
  }

  // Pager mode handles its own keyboard events
  if (modes.pagerMode.value) {
    return;
  }

  // DOOM mode - let game handle input, Escape triggers pause
  if (modes.doomMode.value) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleDoomPause();
      return;
    }
    // Let DOOM handle all other keys
    return;
  }

  // Z-Machine mode - let normal input through, but handle Ctrl+L
  if (modes.zmachineMode.value) {
    if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      // Clear Z-Machine output but stay in game
      zmachineOutput.value = [];
      return;
    }
    // Ensure Z-Machine input is focused for all other keys
    const zmInput = zmachineRef.value?.inputRef;
    if (zmInput && document.activeElement !== zmInput) {
      zmachineRef.value?.focus();
    }
    return;
  }

  // WOPR mode - let normal input through, but handle Ctrl+L
  if (modes.woprMode.value) {
    if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      // Clear WOPR output but stay in simulator
      woprOutput.value = [];
      return;
    }
    // Ensure WOPR input is focused for all other keys
    const woprInputEl = woprRef.value?.inputRef;
    if (woprInputEl && document.activeElement !== woprInputEl) {
      woprRef.value?.focus();
    }
    return;
  }

  // Normal mode: Ctrl+L to clear (works globally)
  if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
    e.preventDefault();
    clearTerminal();
  }
};

/**
 * Reset horizontal scroll - simplified version
 * CSS now handles overflow:hidden on all containers, so we just need
 * to reset the window scroll position as a safety net
 */
const resetHorizontalScroll = () => {
  // Reset window scroll (CSS handles container overflow)
  window.scrollTo(0, window.scrollY);

  // Reset input scroll if needed
  const input = isMobile.value ? inputRefMobile.value : inputRef.value;
  if (input) {
    input.scrollLeft = 0;
  }
};

/**
 * Handle mobile input focus - reset horizontal scroll after focus
 * CSS overflow:hidden does most of the work; this is a safety net
 */
const handleMobileInputFocus = (event: FocusEvent) => {
  const input = event.target as HTMLInputElement;
  if (input) {
    input.scrollLeft = 0;
  }

  // Single RAF to reset after browser processes focus
  requestAnimationFrame(() => {
    resetHorizontalScroll();
  });
};

/**
 * Handle mobile input blur - scroll to bottom when keyboard dismisses
 */
const handleMobileInputBlur = () => {
  // Wait for keyboard to dismiss, then scroll to bottom
  setTimeout(() => {
    if (nativeScrollRef.value) {
      nativeScrollRef.value.scrollTop = nativeScrollRef.value.scrollHeight;
    }
    window.scrollTo(0, 0);
  }, 100);
};

/**
 * Focus input with scroll protection
 */
const focusInputSafely = () => {
  if (modes.zmachineMode.value) {
    zmachineRef.value?.focus();
    return;
  }

  if (modes.woprMode.value) {
    woprRef.value?.focus();
    return;
  }

  const input = isMobile.value ? inputRefMobile.value : inputRef.value;

  if (input) {
    if (isMobile.value) {
      input.focus();
      // Single RAF for horizontal scroll reset
      requestAnimationFrame(() => resetHorizontalScroll());
    } else {
      input.focus({ preventScroll: true });
    }
  }
};

// Touch handler to prevent horizontal scroll on mobile
let terminalTouchHandler: ((e: TouchEvent) => void) | null = null;

// Watch for terminal focus to refocus input
watch(() => terminalRef.value, (newEl, oldEl) => {
  // Cleanup old listeners
  if (oldEl) {
    if (terminalClickHandler) {
      oldEl.removeEventListener('click', terminalClickHandler);
    }
    if (terminalTouchHandler) {
      oldEl.removeEventListener('touchstart', terminalTouchHandler);
    }
  }

  // Add new listeners
  if (newEl) {
    terminalClickHandler = () => {
      if (!modes.pagerMode.value) {
        focusInputSafely();
      }
    };
    newEl.addEventListener('click', terminalClickHandler);

    // Touch handler - immediately reset any horizontal scroll on touch
    terminalTouchHandler = () => {
      // Reset horizontal scroll on any touch to prevent left-shift bug
      resetHorizontalScroll();
    };
    newEl.addEventListener('touchstart', terminalTouchHandler, { passive: true });
  }
}, { immediate: true });

// Watch input changes to update cursor position
watch(currentInput, () => {
  updateCursorPosition();
});

// Invalidate font cache when mobile mode changes (different input elements)
watch(isMobile, () => {
  cachedFontString = null;
});

// Watch history length (not deep) to update scroll indicators when entries added
watch(() => history.value.length, () => {
  // Debounced update after content changes
  nextTick(() => {
    requestAnimationFrame(() => {
      const scrollEl = isMobile.value
        ? nativeScrollRef.value
        : (scrollAreaRef.value?.getScrollTarget() as HTMLElement | null);
      if (scrollEl instanceof HTMLElement) {
        updateScrollIndicators(scrollEl, true);
      }
    });
  });
});

// Add global keyboard event listener
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

// Cleanup
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  if (terminalRef.value) {
    if (terminalClickHandler) {
      terminalRef.value.removeEventListener('click', terminalClickHandler);
      terminalClickHandler = null;
    }
    if (terminalTouchHandler) {
      terminalRef.value.removeEventListener('touchstart', terminalTouchHandler);
      terminalTouchHandler = null;
    }
  }
  // Clear scroll debounce timer
  if (scrollDebounceTimer) {
    clearTimeout(scrollDebounceTimer);
    scrollDebounceTimer = null;
  }
});
</script>

<style lang="scss" scoped>
.terminal {
  position: relative;
  width: 100%;
  max-width: 100%; // Prevent overflow
  height: 100%;  // Fill the 4:3 body container
  background-color: var(--color-background, #1e1e1e);
  color: var(--color-foreground, #d4d4d4);
  font-family: var(--font-family, monospace);
  font-size: var(--font-size, 14px);
  font-weight: var(--font-weight, 400);
  line-height: var(--font-line-height, 1.6);
  padding: var(--spacing-padding, 20px);
  overflow: hidden;
  overflow-x: hidden; // Explicitly prevent horizontal scroll
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  border-radius: 12px;

  // CRT screen glow
  box-shadow:
    inset 0 0 100px rgba(0, 20, 20, 0.3),     // Inner dark vignette
    inset 0 0 50px rgba(0, 150, 120, 0.02);   // Subtle green tint

  // Mobile-specific overrides to prevent horizontal scrolling issues
  @media (max-width: 768px) {
    overflow: hidden !important;
    overflow-x: hidden !important;
    touch-action: pan-y;
    overscroll-behavior-x: none;
    transform: translateZ(0); // Force GPU layer on mobile to prevent scroll glitches
  }

  // Note: Scanlines and vignette are provided by CRTFrame.vue wrapper
  // This avoids double-rendering of effects

  // =============================================================================
  // CRT "Smack" Transition Effect - Three escalating hits
  // Used when entering Z-Machine mode
  // =============================================================================
  &.crt-smack {
    animation: crt-smack-triple 1.8s ease-out forwards;
  }

  // =============================================================================
  // CRT "Roll" Transition Effect - Three attempts to sync vertical hold
  // Used when entering Z-Machine mode
  // =============================================================================
  &.crt-roll {
    animation: crt-roll-triple 1.8s ease-out forwards;
  }
}

// =============================================================================
// CRT Triple Smack Keyframe Animations
// =============================================================================

// Three escalating smacks - like hitting a stubborn CRT multiple times
// Hit 1: 0-20% (light tap)
// Hit 2: 20-50% (medium smack)
// Hit 3: 50-100% (hard whack that finally works)
@keyframes crt-smack-triple {
  // === HIT 1: Light tap (0-20%) ===
  0% {
    transform: translate(0, 0) skewX(0deg);
    filter: brightness(1) contrast(1) saturate(1);
  }
  2% {
    transform: translate(-6px, 2px) skewX(-0.5deg);
    filter: brightness(1.2) contrast(1.15) saturate(1.1);
  }
  4% {
    transform: translate(8px, -2px) skewX(0.6deg);
    filter: brightness(0.75) contrast(1.2) saturate(0.9);
  }
  7% {
    transform: translate(-4px, 1px) skewX(-0.3deg);
    filter: brightness(1.1) contrast(1.05) saturate(1);
  }
  10% {
    transform: translate(3px, -1px) skewX(0.2deg);
    filter: brightness(0.9) contrast(1) saturate(1);
  }
  15% {
    transform: translate(-1px, 0) skewX(0deg);
    filter: brightness(1.02) contrast(1) saturate(1);
  }
  20% {
    transform: translate(0, 0) skewX(0deg);
    filter: brightness(1) contrast(1) saturate(1);
  }

  // === HIT 2: Medium smack (20-50%) ===
  22% {
    transform: translate(-12px, 4px) skewX(-1deg);
    filter: brightness(1.35) contrast(1.25) saturate(1.15);
  }
  25% {
    transform: translate(16px, -5px) skewX(1.3deg);
    filter: brightness(0.55) contrast(1.35) saturate(0.8);
  }
  28% {
    transform: translate(-10px, 6px) skewX(-0.9deg);
    filter: brightness(1.25) contrast(1.15) saturate(1.1);
  }
  32% {
    transform: translate(12px, -4px) skewX(0.7deg);
    filter: brightness(0.7) contrast(1.2) saturate(0.9);
  }
  38% {
    transform: translate(-6px, 2px) skewX(-0.4deg);
    filter: brightness(1.1) contrast(1.05) saturate(1);
  }
  44% {
    transform: translate(3px, -1px) skewX(0.2deg);
    filter: brightness(0.95) contrast(1) saturate(1);
  }
  50% {
    transform: translate(0, 0) skewX(0deg);
    filter: brightness(1) contrast(1) saturate(1);
  }

  // === HIT 3: Hard whack - the one that works! (50-100%) ===
  52% {
    transform: translate(-20px, 6px) skewX(-1.8deg);
    filter: brightness(1.5) contrast(1.4) saturate(1.3);
  }
  55% {
    transform: translate(25px, -8px) skewX(2deg);
    filter: brightness(0.4) contrast(1.5) saturate(0.7);
  }
  58% {
    transform: translate(-18px, 10px) skewX(-1.5deg);
    filter: brightness(1.4) contrast(1.3) saturate(1.2);
  }
  62% {
    transform: translate(20px, -6px) skewX(1.2deg);
    filter: brightness(0.5) contrast(1.4) saturate(0.8);
  }
  67% {
    transform: translate(-12px, 5px) skewX(-0.8deg);
    filter: brightness(1.25) contrast(1.2) saturate(1.1);
  }
  73% {
    transform: translate(8px, -3px) skewX(0.5deg);
    filter: brightness(0.8) contrast(1.1) saturate(0.95);
  }
  80% {
    transform: translate(-4px, 2px) skewX(-0.25deg);
    filter: brightness(1.1) contrast(1.05) saturate(1);
  }
  87% {
    transform: translate(2px, -1px) skewX(0.1deg);
    filter: brightness(0.95) contrast(1) saturate(1);
  }
  94% {
    transform: translate(-1px, 0) skewX(0deg);
    filter: brightness(1.02) contrast(1) saturate(1);
  }
  100% {
    transform: translate(0, 0) skewX(0deg);
    filter: brightness(1) contrast(1) saturate(1);
  }
}

// =============================================================================
// CRT Triple Roll Keyframe Animations
// =============================================================================

// Three attempts to sync vertical hold - like adjusting the V-hold knob
// Roll 1: 0-25% (partial roll, almost catches)
// Roll 2: 25-55% (bigger roll, nearly syncs but slips)
// Roll 3: 55-100% (full dramatic roll that finally locks in)
@keyframes crt-roll-triple {
  // === ROLL 1: Partial roll, almost catches (0-25%) ===
  0% {
    transform: translateY(0) scaleY(1);
    filter: brightness(1) contrast(1);
  }
  3% {
    transform: translateY(-15%) scaleY(0.98);
    filter: brightness(0.8) contrast(1.15);
  }
  6% {
    transform: translateY(-35%) scaleY(0.96);
    filter: brightness(0.6) contrast(1.25);
  }
  9% {
    transform: translateY(-20%) scaleY(0.97);
    filter: brightness(0.75) contrast(1.15);
  }
  12% {
    transform: translateY(-8%) scaleY(0.99);
    filter: brightness(0.9) contrast(1.08);
  }
  18% {
    transform: translateY(-3%) scaleY(1);
    filter: brightness(0.97) contrast(1.02);
  }
  25% {
    transform: translateY(0) scaleY(1);
    filter: brightness(1) contrast(1);
  }

  // === ROLL 2: Bigger roll, nearly syncs but slips (25-55%) ===
  28% {
    transform: translateY(-25%) scaleY(0.96);
    filter: brightness(0.7) contrast(1.2);
  }
  32% {
    transform: translateY(-55%) scaleY(0.93);
    filter: brightness(0.5) contrast(1.35);
  }
  36% {
    transform: translateY(-75%) scaleY(0.91);
    filter: brightness(0.35) contrast(1.45);
  }
  // Almost wraps around!
  38% {
    transform: translateY(-90%) scaleY(0.89);
    filter: brightness(0.25) contrast(1.5);
  }
  // Catches just in time, bounces back
  40% {
    transform: translateY(-70%) scaleY(0.92);
    filter: brightness(0.4) contrast(1.4);
  }
  43% {
    transform: translateY(-40%) scaleY(0.95);
    filter: brightness(0.6) contrast(1.25);
  }
  47% {
    transform: translateY(-15%) scaleY(0.98);
    filter: brightness(0.8) contrast(1.12);
  }
  52% {
    transform: translateY(-5%) scaleY(0.99);
    filter: brightness(0.95) contrast(1.05);
  }
  55% {
    transform: translateY(0) scaleY(1);
    filter: brightness(1) contrast(1);
  }

  // === ROLL 3: Full dramatic roll that finally locks in (55-100%) ===
  58% {
    transform: translateY(-30%) scaleY(0.94);
    filter: brightness(0.6) contrast(1.3);
  }
  62% {
    transform: translateY(-60%) scaleY(0.9);
    filter: brightness(0.4) contrast(1.45);
  }
  66% {
    transform: translateY(-90%) scaleY(0.87);
    filter: brightness(0.2) contrast(1.6);
  }
  // Full wrap-around!
  68% {
    transform: translateY(-100%) scaleY(0.85);
    filter: brightness(0.15) contrast(1.7);
  }
  68.01% {
    transform: translateY(100%) scaleY(0.85);
    filter: brightness(0.15) contrast(1.7);
  }
  71% {
    transform: translateY(70%) scaleY(0.88);
    filter: brightness(0.3) contrast(1.5);
  }
  75% {
    transform: translateY(40%) scaleY(0.92);
    filter: brightness(0.5) contrast(1.35);
  }
  79% {
    transform: translateY(20%) scaleY(0.95);
    filter: brightness(0.7) contrast(1.2);
  }
  83% {
    transform: translateY(8%) scaleY(0.98);
    filter: brightness(0.85) contrast(1.1);
  }
  87% {
    transform: translateY(-4%) scaleY(0.99);
    filter: brightness(0.95) contrast(1.05);
  }
  91% {
    transform: translateY(2%) scaleY(1);
    filter: brightness(1.02) contrast(1.02);
  }
  95% {
    transform: translateY(-1%) scaleY(1);
    filter: brightness(1) contrast(1);
  }
  100% {
    transform: translateY(0) scaleY(1);
    filter: brightness(1) contrast(1);
  }
}

.terminal-output {
  flex: 1;
  overflow: hidden; // QScrollArea handles overflow internally
  padding-right: 10px;
  position: relative;
  z-index: 10;  // Ensure content is above any background effects
  min-height: 0; // Allow flex shrinking

  // QScrollArea handles scrollbar hiding via thumb-style and bar-style props
}

// Native scroll variant for mobile (Chrome iOS compatibility)
.terminal-output-native {
  overflow-y: auto;
  overflow-x: hidden !important; // Force no horizontal scroll
  -webkit-overflow-scrolling: touch; // Smooth scrolling on iOS

  // Scroll containment - prevents scroll chaining to parent/page
  // This stops the "bounce" effect and address bar toggling when hitting scroll boundaries
  overscroll-behavior: contain;
  overscroll-behavior-y: contain;
  overscroll-behavior-x: none !important; // Absolutely no horizontal overscroll

  // Restrict touch actions to vertical pan only
  // Prevents accidental horizontal swipes from triggering navigation
  touch-action: pan-y;

  // Prevent scroll when child elements get focus
  scroll-padding: 0;

  // CSS containment for layout optimization
  contain: layout style;

  // Hide scrollbar but keep scroll functionality
  scrollbar-width: none;  // Firefox
  -ms-overflow-style: none;  // IE/Edge

  &::-webkit-scrollbar {
    display: none;  // Chrome/Safari/Opera
  }

  // Ensure all children respect container width
  > * {
    max-width: 100%;
    overflow-wrap: break-word;
    word-break: break-word;
  }
}

.terminal-line {
  display: flex;
  align-items: flex-start;
  margin-bottom: 0.5rem;
  min-height: 1.6em;
  word-wrap: break-word;
  word-break: break-word; // Allow breaking long words
  white-space: pre-wrap;
  overflow-wrap: break-word; // Modern property for word breaking
  max-width: 100%; // Ensure lines don't exceed container
}

.terminal-command {
  color: var(--terminal-command, #3b8eea);
  flex: 1;
}

.terminal-input-line {
  display: flex;
  align-items: center;
  position: relative;
  // Override terminal-line margin for input line
  margin-bottom: 0 !important;
  min-width: 0; // Allow flex item to shrink
  max-width: 100%; // Prevent overflow
  overflow-x: hidden; // Prevent horizontal scroll
}

.input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  position: relative;
  min-width: 0; // Allow flex item to shrink below content size
  max-width: 100%; // Prevent overflow
  overflow: hidden !important; // Force hide any overflow
  overflow-x: hidden !important; // Explicitly prevent horizontal scroll

  // Mobile: Ensure no scroll-into-view behavior
  @media (max-width: 768px) {
    // Contain the input to prevent focus scroll
    contain: layout style;
  }
}

.terminal-input {
  flex: 1;
  width: 100%;
  max-width: 100%; // Prevent input from exceeding container
  background: transparent;
  border: none;
  outline: none;
  color: var(--terminal-command, #3b8eea);
  font-family: var(--font-family, monospace);
  font-size: var(--font-size, 14px);
  line-height: var(--font-line-height, 1.6);
  padding: 0;
  margin: 0;
  caret-color: transparent; // Hide native input caret (desktop)

  // Force lowercase display
  text-transform: lowercase;

  // Prevent auto-scroll on focus (mobile browsers)
  scroll-margin: 0;
  scroll-padding: 0;

  &::placeholder {
    color: var(--color-brightBlack, #666666);
  }

  // Mobile: Use native caret instead of custom cursor
  // This prevents horizontal scroll issues caused by cursor positioning
  @media (max-width: 768px) {
    caret-color: var(--terminal-command, #3b8eea); // Show native caret on mobile

    // CRITICAL: Font size must be >= 16px to prevent iOS auto-zoom on focus
    font-size: 16px !important;

    // Prevent the input from having any internal scroll
    overflow: hidden;
    text-overflow: clip;

    // Disable any scroll-into-view behavior
    scroll-margin: 0 !important;
    scroll-padding: 0 !important;

    // Try to prevent browser focus scrolling
    scroll-snap-type: none;
    overscroll-behavior: none;
  }
}

.cursor {
  position: absolute;
  color: var(--color-cursor, #aeafad);
  animation: blink 1s infinite;
  pointer-events: none;
  flex-shrink: 0;

  // Mobile: Hide custom cursor, use native caret instead
  @media (max-width: 768px) {
    display: none !important;
  }
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.terminal-output-text {
  color: var(--terminal-output, #d4d4d4);
  margin-top: 0;
  margin-bottom: 0.5rem;
  margin-left: 0;
  padding: 0;
  width: 100%;
  max-width: 100%; // Prevent overflow
  display: block;
  white-space: normal;
  line-height: var(--font-line-height, 1.6);
  clear: both;
  overflow-wrap: break-word; // Allow long words to break
  word-break: break-word; // Break long words if needed

  :deep(pre) {
    margin: 0;
    font-family: var(--font-family, monospace);
    line-height: var(--font-line-height, 1.8);
    white-space: pre-wrap;
  }

  :deep(code) {
    font-family: var(--font-family, monospace);
    background: var(--color-brightBlack, #666666);
    padding: 2px 6px;
    border-radius: 3px;
    color: var(--terminal-command, #3b8eea);
    display: inline-block;
    vertical-align: middle;
    line-height: 1.2;
    margin: .125rem 0;
  }

  :deep(strong) {
    color: var(--terminal-success, #23d18b);
    font-weight: bold;
  }

  :deep(p) {
    margin: .75em 0 .5em 0;
    padding: 0;
    line-height: inherit;
  }

  :deep(div) {
    margin: 0;
    padding: 0;
  }

  :deep(br) {
    line-height: 1.5;
  }

  :deep(h1) {
    font-size: 1.4em;
    line-height: inherit;
    font-weight: bold;
    color: var(--terminal-success, #23d18b);
    margin: 0.75em 0 0.5em 0;
  }

  :deep(h2) {
    font-size: 1em;
    line-height: inherit;
    font-weight: bold;
    color: var(--terminal-success, #23d18b);
    margin: 0.75em 0 0.5em 0;
  }

  :deep(h3) {
    font-size: .75em;
    line-height: inherit;
    font-weight: bold;
    color: var(--terminal-info, #29b8db);
    margin: 0.4em 0 0.2em 0;
    // text-transform: uppercase;
  }

  :deep(h4), :deep(h5), :deep(h6) {
    font-size: 1em;
    font-weight: bold;
    color: var(--terminal-info, #29b8db);
    margin: 0.3em 0 0.15em 0;
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid var(--color-brightBlack, #666666);
    margin: 0.5em 0;
  }

  :deep(ul), :deep(ol) {
    margin: 0.25em 0;
    padding-left: 1.5em;
    list-style-position: inside;
  }

  :deep(li) {
    margin: 0.1em 0;
    line-height: inherit;
  }
}

.typing-indicator {
  color: var(--terminal-info, #29b8db);
  animation: blink 1s infinite;
}

// Note: Pager styles are in TerminalPager.vue
// Note: Z-Machine styles are in TerminalZMachine.vue

// Default line-height for all terminal text
// Only apply to direct children, not nested elements
.terminal-output {
  line-height: var(--font-line-height, 1.8);

  // Apply line-height to direct children only
  > .terminal-line {
    line-height: inherit;
  }
}

// Note: Scroll indicator styles are in ScrollIndicators.vue

// =============================================================================
// Mobile Responsive Styles
// Uses CSS variables from app.scss for row-based sizing
// =============================================================================
@media (max-width: 768px) {
  .terminal {
    padding: 14px;
    // Use mobile font variables for consistent row height calculation
    font-size: var(--mobile-font-size, 15px);
    line-height: var(--mobile-line-height, 1.5);
    border-radius: 8px;
  }

  .terminal-input {
    font-size: var(--mobile-font-size, 15px);
    line-height: var(--mobile-line-height, 1.5);
  }

  .terminal-output-text {
    line-height: var(--mobile-line-height, 1.5);

    :deep(h1) {
      font-size: 1.2em;
    }

    :deep(h2) {
      font-size: 0.95em;
    }

    :deep(h3) {
      font-size: 0.7em;
    }
  }
}

// Extra small screens
@media (max-width: 480px) {
  .terminal {
    padding: 10px;
    // Use mobile font variables (overridden in app.scss for 480px)
    font-size: var(--mobile-font-size, 14px);
    line-height: var(--mobile-line-height, 1.4);
    border-radius: 6px;
  }

  .terminal-input {
    font-size: var(--mobile-font-size, 14px);
    line-height: var(--mobile-line-height, 1.4);
  }

  .terminal-line {
    // Consistent 0.5rem gap
    margin-bottom: 0.5rem;
  }

  .terminal-output-text {
    // Consistent 0.5rem gap for all screen sizes
    margin-top: 0;
    margin-bottom: 0.5rem;
    line-height: var(--mobile-line-height, 1.4);

    :deep(p) {
      margin: 0.5em 0 0.35em 0;
    }

    :deep(ul), :deep(ol) {
      padding-left: 1.2em;
    }
  }
}

// =============================================================================
// Mobile Landscape Orientation
// Compact styling for phones held horizontally
// =============================================================================
@media (orientation: landscape) and (max-height: 500px) {
  .terminal {
    padding: 8px 12px;
    font-size: var(--mobile-font-size, 13px);
    line-height: var(--mobile-line-height, 1.3);
    border-radius: 4px;
  }

  .terminal-input {
    font-size: var(--mobile-font-size, 13px);
    line-height: var(--mobile-line-height, 1.3);
  }

  .terminal-line {
    // Tighter spacing for landscape
    margin-bottom: 0.35rem;
    min-height: 1.3em;
  }

  .terminal-output-text {
    margin-top: 0;
    margin-bottom: 0.35rem;
    line-height: var(--mobile-line-height, 1.3);

    :deep(p) {
      margin: 0.3em 0 0.2em 0;
    }

    :deep(h1) {
      font-size: 1.1em;
      margin: 0.4em 0 0.25em 0;
    }

    :deep(h2) {
      font-size: 0.9em;
      margin: 0.35em 0 0.2em 0;
    }

    :deep(h3) {
      font-size: 0.65em;
      margin: 0.25em 0 0.15em 0;
    }

    :deep(ul), :deep(ol) {
      margin: 0.15em 0;
      padding-left: 1em;
    }

    :deep(li) {
      margin: 0.05em 0;
    }
  }
}
</style>

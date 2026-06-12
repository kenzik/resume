<template>
  <div class="terminal" :class="{
      'pager-active': pagerMode,
      'zmachine-active': zmachineMode,
      'doom-active': doomMode,
      'wopr-active': woprMode,
      'crt-smack': (zmachineTransitioning && zmachineTransitionType === 'smack') || (doomTransitioning && doomTransitionType === 'smack') || (woprTransitioning && woprTransitionType === 'smack'),
      'crt-roll': (zmachineTransitioning && zmachineTransitionType === 'roll') || (doomTransitioning && doomTransitionType === 'roll') || (woprTransitioning && woprTransitionType === 'roll')
    }" ref="terminalRef">
    <!-- Z-Machine Quit Confirmation Modal -->
    <ZMachineQuitModal
      v-model="showZMachineQuitModal"
      :game-title="currentGameTitle"
      @confirm="confirmZMachineQuit"
      @cancel="cancelZMachineQuit"
    />

    <!-- WOPR Quit Confirmation Modal -->
    <WOPRQuitModal
      v-model="showWOPRQuitModal"
      @confirm="confirmWOPRQuit"
      @cancel="cancelWOPRQuit"
    />

    <!-- DOOM Pause Modal -->
    <DoomPauseModal
      v-model="showDoomPauseModal"
      :audio-enabled="doom.audioEnabled.value"
      @resume="handleDoomResume"
      @quit="handleDoomQuit"
      @toggle-sound="handleDoomToggleSound"
    />
    
    <!--
      Screen reader announcer — fires exactly once per completed command output.
      DESIGN_GUIDE_2026-2.md §7: the output scroll containers carry role="log" +
      aria-live="off" so the typewriter per-tick innerHTML swaps do not trigger
      per-character announcements (WAI-ARIA: aria-live="off" overrides the
      implicit aria-live="polite" that role="log" would otherwise imply). This
      element receives a plain-text update only after each typewriter pass
      finishes, giving screen readers one clean announcement per result.
      Cannot be verified with headless VoiceOver; static analysis confirms the
      typewriter replaces innerHTML on every tick (remove + add text nodes),
      which would chatter under a polite live region on the main container.
      Note: although this div never paints (clip-rect), its text content makes
      linux Chromium/FreeType reshade ~102px of glyph-edge antialiasing in the
      MOTD line (invariant to DOM position, font, and paint scheduling);
      dark-home-linux.png was rebased on this commit's rendering by
      design-director sign-off (DESIGN_GUIDE_2026-2.md §11.1).
    -->
    <div
      class="sr-only"
      aria-live="polite"
      aria-atomic="true"
    >{{ announcement }}</div>

    <!-- Normal terminal output - hidden during pager mode, zmachine mode, doom mode, or wopr mode -->
    <!-- Desktop: Use QScrollArea for smooth scrolling -->
    <q-scroll-area
      v-if="!isMobile && !pagerMode && !zmachineMode && !doomMode && !woprMode"
      class="terminal-output"
      ref="scrollAreaRef"
      :thumb-style="{ display: 'none' }"
      :bar-style="{ display: 'none' }"
      role="log"
      aria-live="off"
      aria-label="Terminal output"
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
            @keydown.up="navigateHistory(-1)"
            @keydown.down="navigateHistory(1)"
            class="terminal-input"
            type="text"
            aria-label="Terminal command input"
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
      v-if="isMobile && !pagerMode && !zmachineMode && !doomMode && !woprMode"
      class="terminal-output terminal-output-native"
      ref="nativeScrollRef"
      @scroll.passive="handleNativeScroll"
      role="log"
      aria-live="off"
      aria-label="Terminal output"
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
            @keydown.up="navigateHistory(-1)"
            @keydown.down="navigateHistory(1)"
            @focus="handleMobileInputFocus"
            @blur="handleMobileInputBlur"
            class="terminal-input"
            type="text"
            aria-label="Terminal command input"
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
      v-if="isMobile && !pagerMode && !zmachineMode && !doomMode && !woprMode"
      :show-top="hasScrollableContentAbove"
      :show-bottom="hasScrollableContentBelow"
    />
    
    <!-- Pager mode - separate scrollable area with keyboard navigation -->
    <TerminalPager
      :active="pagerMode"
      :command="pagerCommand"
      :raw-content="pagerRawContent"
      @exit="handlePagerExit"
    />
    
    <!-- Z-Machine mode - full terminal takeover for game -->
    <TerminalZMachine
      ref="zmachineRef"
      :active="zmachineMode"
      :game-title="currentGameTitle"
      :output-lines="zmachineOutput"
      :typing-line="zmachineTypingLine"
      v-model="zmachineInput"
      @submit="handleZMachineSubmit"
    />

    <!-- WOPR mode - full terminal takeover for WarGames simulator -->
    <TerminalWOPR
      ref="woprRef"
      :active="woprMode"
      :output-lines="woprOutput"
      :typing-line="woprTypingLine"
      v-model="woprInput"
      @submit="handleWOPRSubmit"
    />

    <!-- DOOM mode - full terminal takeover for FPS game -->
    <DoomCanvas
      v-if="doomMode"
      ref="doomRef"
      :active="doomMode"
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
  CRT_TRANSITION_TIMINGS,
} from '../constants';

const router = useRouter();

/**
 * Reduced-motion preference (DESIGN_GUIDE_2026-2.md §8.2). When set, the
 * smack/roll easter-egg transitions are suppressed in CSS (crt-effects.scss),
 * so the JS must not wait on them — the egg cuts directly to its mode.
 * Read live (not cached) so a mid-session OS toggle is respected.
 */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Duration to hold the smack/roll CRT transition before entering a game mode.
 * Collapses to 0 under reduced motion so the mode switch is immediate.
 */
const crtTransitionDuration = () =>
  prefersReducedMotion()
    ? CRT_TRANSITION_TIMINGS.reducedMotionMs
    : CRT_TRANSITION_TIMINGS.durationMs;

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

/**
 * Plain-text content for the sr-only aria-live announcer (§7).
 * Updated once per completed typewriter pass so screen readers hear each
 * command result exactly once without per-tick chatter.
 */
const announcement = ref('');

// Command history settings (for up/down arrow navigation)
const commandHistory = ref<string[]>([]);
const commandHistoryIndex = ref(-1);
const savedInput = ref(''); // Saves current input when starting to navigate

// Pager mode state (UI logic handled by TerminalPager component)
const pagerMode = ref(false);
const pagerCommand = ref('');           // The command that triggered pager mode
const pagerRawContent = ref('');        // Raw markdown content for pager

// Z-Machine mode state
const zmachineMode = ref(false);
const zmachineOutput = ref<string[]>([]);   // Game output lines (fully typed)
const zmachineTypingLine = ref('');          // Currently typing line
const zmachineIsTyping = ref(false);         // Whether typewriter is active
const showZMachineQuitModal = ref(false);   // Quit confirmation modal

// CRT transition effects for Z-Machine mode
const zmachineTransitioning = ref(false);
const zmachineTransitionType = ref<'smack' | 'roll'>('smack'); // 'smack' = horizontal glitch, 'roll' = vertical roll

// DOOM mode state
const doomMode = ref(false);
const doomRef = ref<InstanceType<typeof DoomCanvas> | null>(null);
const showDoomPauseModal = ref(false);

// CRT transition effects for DOOM mode (reuses same animation types)
const doomTransitioning = ref(false);
const doomTransitionType = ref<'smack' | 'roll'>('smack');

// WOPR mode state
const woprMode = ref(false);
const woprRef = ref<InstanceType<typeof TerminalWOPR> | null>(null);
const woprInput = ref('');                    // Separate input state for WOPR mode
const woprOutput = ref<string[]>([]);         // WOPR output lines (fully typed)
const woprTypingLine = ref('');               // Currently typing line
const woprIsTyping = ref(false);              // Whether typewriter is active
const showWOPRQuitModal = ref(false);         // Quit confirmation modal

// CRT transition effects for WOPR mode (reuses same animation types)
const woprTransitioning = ref(false);
const woprTransitionType = ref<'smack' | 'roll'>('smack');

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

  // Update the aria-live announcer with the completed plain-text result (§7).
  // Strip HTML tags so the screen reader receives clean text, not markup.
  const finalHtml = history.value[entryIndex].output || '';
  announcement.value = finalHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Ensure final scroll after typewriter completes
  scrollToBottom();
};

// Enter pager mode with content
const enterPagerMode = (command: string, rawContent: string) => {
  pagerCommand.value = command;
  pagerRawContent.value = rawContent;
  pagerMode.value = true;
};

// Handle pager exit (called by TerminalPager component)
const handlePagerExit = () => {
  // Add command to history without output (like real `more` - output was already displayed)
  addHistoryEntry(pagerCommand.value, '');
  
  // Reset pager state
  pagerMode.value = false;
  pagerCommand.value = '';
  pagerRawContent.value = '';
  
  // Restore focus to terminal input — covers desktop + mobile (§7 focus restoration).
  nextTick(() => {
    focusInputSafely();
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
  
  // Randomly choose CRT transition effect
  zmachineTransitionType.value = Math.random() > 0.5 ? 'smack' : 'roll';
  
  // Trigger CRT transition effect
  zmachineTransitioning.value = true;
  
  // Wait for transition, then enter Z-Machine mode
  // Both effects now have 3 escalating phases totaling ~1.8s
  // (collapses to 0 under reduced motion — cut directly to the mode, §8.2)
  const transitionDuration = crtTransitionDuration();
  await new Promise(resolve => setTimeout(resolve, transitionDuration));
  
  // Enter Z-Machine mode AFTER transition completes
  zmachineMode.value = true;
  zmachineOutput.value = [];
  zmachineTypingLine.value = '';
  zmachineTransitioning.value = false;
  
  // Explicitly reset transform after animation to prevent layout issues on mobile
  if (terminalRef.value) {
    terminalRef.value.style.transform = '';
  }
  
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
  zmachineMode.value = false;
  zmachineOutput.value = [];
  showZMachineQuitModal.value = false;
  
  // Redirect to home page for a clean terminal state
  // This avoids mobile layout bugs that occur when switching modes
  router.push('/');
};

/**
 * Handle Z-Machine quit command - show confirmation
 */
const handleZMachineQuit = () => {
  showZMachineQuitModal.value = true;
};

/**
 * Confirm Z-Machine quit
 */
const confirmZMachineQuit = () => {
  exitZMachineMode();
};

/**
 * Cancel Z-Machine quit - return to game.
 * Restores focus to the Z-Machine input (not the terminal input — we are staying
 * in game mode). §7 focus restoration: the terminal input is restored only on
 * paths that return to the prompt (confirm/quit paths redirect to home, which
 * remounts the terminal and calls focusInputSafely() in onMounted).
 */
const cancelZMachineQuit = () => {
  showZMachineQuitModal.value = false;
  nextTick(() => {
    zmachineRef.value?.focus();
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
  
  // Randomly choose CRT transition effect
  doomTransitionType.value = Math.random() > 0.5 ? 'smack' : 'roll';
  
  // Trigger CRT transition effect
  doomTransitioning.value = true;
  
  // Wait for transition (collapses to 0 under reduced motion, §8.2)
  const transitionDuration = crtTransitionDuration();
  await new Promise(resolve => setTimeout(resolve, transitionDuration));
  
  // Clear the loading message
  history.value[loadingIdx].output = '';
  
  // Enter DOOM mode AFTER transition completes
  doomMode.value = true;
  doomTransitioning.value = false;
  
  // Explicitly reset transform after animation
  if (terminalRef.value) {
    terminalRef.value.style.transform = '';
  }
  
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
  doomMode.value = false;
  showDoomPauseModal.value = false;
  
  // Redirect to home page for a clean terminal state
  router.push('/');
};

/**
 * Handle DOOM pause - show pause modal
 */
const handleDoomPause = () => {
  doom.pause();
  showDoomPauseModal.value = true;
};

/**
 * Handle DOOM resume from pause modal
 */
const handleDoomResume = () => {
  showDoomPauseModal.value = false;
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
  doomMode.value = false;
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
    if (!zmachineMode.value) break; // Exit if user quit during typing
    
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
  if (zmachineMode.value && newLength > 0) {
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

  // Randomly choose CRT transition effect
  woprTransitionType.value = Math.random() > 0.5 ? 'smack' : 'roll';

  // Trigger CRT transition effect
  woprTransitioning.value = true;

  // Wait for transition, then enter WOPR mode
  // (collapses to 0 under reduced motion — cut directly to the mode, §8.2)
  const transitionDuration = crtTransitionDuration();
  await new Promise(resolve => setTimeout(resolve, transitionDuration));

  // Enter WOPR mode AFTER transition completes
  woprMode.value = true;
  woprOutput.value = [];
  woprTypingLine.value = '';
  woprTransitioning.value = false;

  // Explicitly reset transform after animation to prevent layout issues on mobile
  if (terminalRef.value) {
    terminalRef.value.style.transform = '';
  }

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
  woprMode.value = false;
  woprOutput.value = [];
  showWOPRQuitModal.value = false;

  // Redirect to home page for a clean terminal state
  router.push('/');
};

/**
 * Handle WOPR quit command - show confirmation
 */
const handleWOPRQuit = () => {
  showWOPRQuitModal.value = true;
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
  showWOPRQuitModal.value = false;
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
    if (!woprMode.value) break; // Exit if user quit during typing

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
  if (woprMode.value && newLength > 0) {
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
  if (commandHistory.value.length === 0) {
    addHistoryEntry('history', '');
    const output = await renderForDisplay('*No commands in history*');
    history.value[history.value.length - 1].output = output;
    scrollToBottom();
    return;
  }

  // Format history like bash: numbered list
  const historyOutput = commandHistory.value
    .map((cmd, index) => `  ${String(index + 1).padStart(4)}  ${cmd}`)
    .join('\n');

  // Pipe to more (enter pager mode)
  await enterPagerMode('history', '```\n' + historyOutput + '\n```');
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
    await enterPagerMode(command, result.pagerContent);
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

  // Add to command history (avoid duplicating the last command)
  if (commandHistory.value[commandHistory.value.length - 1] !== command) {
    commandHistory.value.push(command);
    // Trim to max length
    if (commandHistory.value.length > TERMINAL_CONFIG.commandHistoryMaxLength) {
      commandHistory.value.shift();
    }
  }

  // Clear input
  currentInput.value = '';
  commandHistoryIndex.value = -1;
  savedInput.value = '';
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
const navigateHistory = (direction: number) => {
  if (commandHistory.value.length === 0) return;
  
  // Save current input when starting to navigate
  if (commandHistoryIndex.value === -1 && direction === -1) {
    savedInput.value = currentInput.value;
  }
  
  // Calculate new index
  // direction -1 = up (older), direction 1 = down (newer)
  const newIndex = commandHistoryIndex.value - direction;
  
  if (newIndex < -1) {
    // Past the newest entry - stay at current input
    return;
  } else if (newIndex >= commandHistory.value.length) {
    // Past the oldest entry - stay at oldest
    return;
  }
  
  commandHistoryIndex.value = newIndex;
  
  if (commandHistoryIndex.value === -1) {
    // Back to current input (not in history)
    currentInput.value = savedInput.value;
  } else {
    // Show command from history (most recent is at end of array)
    currentInput.value = commandHistory.value[commandHistory.value.length - 1 - commandHistoryIndex.value];
  }
  
  nextTick(() => {
    updateCursorPosition();
    // Move cursor to end of input
    if (inputRef.value) {
      inputRef.value.selectionStart = inputRef.value.value.length;
      inputRef.value.selectionEnd = inputRef.value.value.length;
    }
  });
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
    if (zmachineMode.value) {
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
  commandHistoryIndex.value = -1;
  savedInput.value = '';
  // Note: commandHistory is preserved across clears (like a real shell)
  
  // Exit pager mode if active
  if (pagerMode.value) {
    pagerMode.value = false;
    pagerCommand.value = '';
    pagerRawContent.value = '';
  }
  
  // Exit Z-Machine mode if active
  if (zmachineMode.value) {
    exitZMachineMode();
  }
  
  // Exit DOOM mode if active
  if (doomMode.value) {
    exitDoomMode();
  }

  // Exit WOPR mode if active
  if (woprMode.value) {
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
  if (showZMachineQuitModal.value) {
    return;
  }

  // DOOM pause modal is handled by the modal component itself
  if (showDoomPauseModal.value) {
    return;
  }

  // WOPR quit modal is handled by the modal component itself
  if (showWOPRQuitModal.value) {
    return;
  }

  // Pager mode handles its own keyboard events
  if (pagerMode.value) {
    return;
  }

  // DOOM mode - let game handle input, Escape triggers pause
  if (doomMode.value) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleDoomPause();
      return;
    }
    // Let DOOM handle all other keys
    return;
  }

  // Z-Machine mode - let normal input through, but handle Ctrl+L
  if (zmachineMode.value) {
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
  if (woprMode.value) {
    if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      // Clear WOPR output but stay in simulator
      woprOutput.value = [];
      return;
    }
    // Ensure WOPR input is focused for all other keys
    const woprInput = woprRef.value?.inputRef;
    if (woprInput && document.activeElement !== woprInput) {
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
  if (zmachineMode.value) {
    zmachineRef.value?.focus();
    return;
  }

  if (woprMode.value) {
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
      if (!pagerMode.value) {
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
@import '../css/terminal.scss';
@import '../css/crt-effects.scss';
</style>

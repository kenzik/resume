<template>
  <div class="terminal" :class="{ 
      'pager-active': pagerMode, 
      'zork-active': zorkMode,
      'crt-smack': zorkTransitioning && zorkTransitionType === 'smack',
      'crt-roll': zorkTransitioning && zorkTransitionType === 'roll'
    }" ref="terminalRef">
    <!-- Zork Quit Confirmation Modal -->
    <ZorkQuitModal 
      v-model="showZorkQuitModal"
      @confirm="confirmZorkQuit"
      @cancel="cancelZorkQuit"
    />
    
    <!-- Normal terminal output - hidden during pager mode or zork mode -->
    <!-- Desktop: Use QScrollArea for smooth scrolling -->
    <q-scroll-area 
      v-if="!isMobile && !pagerMode && !zorkMode" 
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
            @keydown.up="navigateHistory(-1)"
            @keydown.down="navigateHistory(1)"
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
      v-if="isMobile && !pagerMode && !zorkMode" 
      class="terminal-output terminal-output-native"
      ref="nativeScrollRef"
      @scroll="handleNativeScroll"
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
    <div 
      v-if="isMobile && !pagerMode && !zorkMode"
      class="scroll-indicator scroll-indicator--top"
      :class="{ 'scroll-indicator--visible': hasScrollableContentAbove }"
      aria-hidden="true"
    />
    <div 
      v-if="isMobile && !pagerMode && !zorkMode"
      class="scroll-indicator scroll-indicator--bottom"
      :class="{ 'scroll-indicator--visible': hasScrollableContentBelow }"
      aria-hidden="true"
    />
    
    <!-- Pager mode - separate scrollable area with fixed prompt at bottom -->
    <div v-show="pagerMode" class="pager-wrapper">
      <!-- Prompt first in DOM, appears last due to column-reverse -->
      <div class="pager-prompt">
        {{ pagerPromptText }}
      </div>
      <div class="pager-content-area" ref="pagerContentRef">
        <div class="terminal-output-text pager-content" v-html="pagerContent"></div>
      </div>
    </div>
    
    <!-- Zork mode - full terminal takeover for game -->
    <div v-show="zorkMode" class="zork-wrapper">
      <div class="zork-header">
        <span class="zork-title">ZORK I</span>
        <span class="zork-hint">Type 'quit' to exit</span>
      </div>
      <div class="zork-output-area" ref="zorkScrollRef">
        <div 
          v-for="(line, index) in zorkOutput" 
          :key="index" 
          class="zork-line"
          :class="{ 'zork-input-line': line.startsWith('>') }"
        >{{ line }}</div>
        <!-- Currently typing line (typewriter effect) -->
        <div v-if="zorkTypingLine" class="zork-line zork-typing">{{ zorkTypingLine }}<span class="typing-cursor">█</span></div>
      </div>
      <div class="zork-input-line terminal-line">
        <span class="zork-prompt">&gt;</span>
        <div class="input-wrapper" ref="zorkInputWrapperRef">
          <input
            ref="zorkInputRef"
            v-model="currentInput"
            @keydown.enter="executeCommand"
            class="terminal-input zork-input zork-native-caret"
            type="text"
            spellcheck="false"
            placeholder="What do you want to do?"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { QScrollArea } from 'quasar';
import { useCommands } from '../composables/useCommands';
import { useTypewriter } from '../composables/useTypewriter';
import { useZork } from '../composables/useZork';
import { hasPipe, parsePipeline, executePipeline } from '../composables/usePipeline';
import { ansiToHtml } from '../utils/ansiToHtml';
import TerminalPrompt from './TerminalPrompt.vue';
import ZorkQuitModal from './ZorkQuitModal.vue';
import { PAGER_CONFIG } from '../config';

// Navigation prefix for commands that trigger page navigation
const NAV_PREFIX = '__NAV__';
// Zork prefix for hidden game commands
const ZORK_PREFIX = '__Z__';

const router = useRouter();

// Commands to run automatically on startup (single code path for all commands)
const startupCommands = ['motd'];

const terminalRef = ref<HTMLElement | null>(null);
const scrollAreaRef = ref<InstanceType<typeof QScrollArea> | null>(null);
const nativeScrollRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const inputRefMobile = ref<HTMLInputElement | null>(null);
const zorkInputRef = ref<HTMLInputElement | null>(null);
const zorkInputWrapperRef = ref<HTMLElement | null>(null);
const inputWrapperRef = ref<HTMLElement | null>(null);
const inputWrapperRefMobile = ref<HTMLElement | null>(null);
const cursorLeft = ref(0);

// Mobile detection for native scroll fallback (Chrome iOS has issues with QScrollArea)
const MOBILE_BREAKPOINT = 768;
const isMobile = ref(false);

// Detect mobile on mount and window resize
const updateMobileDetection = () => {
  isMobile.value = typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
};

// =============================================================================
// Scroll Indicators - show when content extends beyond visible area
// =============================================================================
const hasScrollableContentAbove = ref(false);
const hasScrollableContentBelow = ref(false);

// Debounce scroll indicator updates for performance
// Uses trailing-edge debounce: always processes the last call after delay
let scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SCROLL_DEBOUNCE_MS = 50;

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
  }, SCROLL_DEBOUNCE_MS);
};

// Handle scroll events on the native scroll container
const handleNativeScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  updateScrollIndicators(target);
};

const currentInput = ref('');
const history = ref<Array<{ command: string; output: string; isStartup?: boolean }>>([]);
const commandQueue = ref<string[]>([]);
const isExecutingCommand = ref(false);

// Command history settings (for up/down arrow navigation)
const COMMAND_HISTORY_MAX_LENGTH = 50;
const commandHistory = ref<string[]>([]);
const commandHistoryIndex = ref(-1);
const savedInput = ref(''); // Saves current input when starting to navigate

// Pager mode state
const pagerMode = ref(false);
const pagerContent = ref('');           // Full HTML content to display
const pagerCommand = ref('');           // The command that triggered pager mode
const pagerAtEnd = ref(false);          // True when scrolled to bottom
const pagerContentRef = ref<HTMLElement | null>(null);

// Zork mode state
const zorkMode = ref(false);
const zorkOutput = ref<string[]>([]);   // Game output lines (fully typed)
const zorkTypingLine = ref('');          // Currently typing line
const zorkIsTyping = ref(false);         // Whether typewriter is active
const showZorkQuitModal = ref(false);   // Quit confirmation modal
const zorkScrollRef = ref<HTMLElement | null>(null);

// CRT transition effects for Zork mode
const zorkTransitioning = ref(false);
const zorkTransitionType = ref<'smack' | 'roll'>('smack'); // 'smack' = horizontal glitch, 'roll' = vertical roll

// Zork typewriter config (slightly faster for game feel)
const zorkTypewriterConfig = {
  delay: 3,
  charsPerTick: 8,
};

const { execute: executeCmd, executeRaw, renderForDisplay } = useCommands();
const { typeText, isTyping, stopTyping } = useTypewriter();
const zork = useZork();

// Click handler stored at module level for proper cleanup
let terminalClickHandler: (() => void) | null = null;

// Cached canvas for text measurement (performance optimization)
let measureCanvas: HTMLCanvasElement | null = null;
let measureContext: CanvasRenderingContext2D | null = null;

// Typewriter speed configuration
// Speed = charsPerTick / delay (chars per ms)
const typewriterConfig = ref({
  delay: 5,         // ms between ticks (browser minimum is ~4ms)
  charsPerTick: 5, // characters per tick - increase for faster output
});

// Faster typewriter for pager mode (large content)
const pagerTypewriterConfig = {
  delay: 2,
  charsPerTick: 50, // Much faster for paging
};

/**
 * Helper to type output into a history entry with ANSI conversion
 * Consolidates the repeated typewriter logic across processCommand, processPipeline, etc.
 */
const typeOutputToHistory = async (
  entryIndex: number,
  output: string,
  config: { delay: number; charsPerTick: number } = typewriterConfig.value
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
};

// Check if pager is showing resume content (for download shortcut)
const pagerShowingResume = computed(() => {
  const cmd = pagerCommand.value.toLowerCase();
  // Match "resume" command or "resume | more" pipeline
  return cmd === 'resume' || cmd.startsWith('resume |') || cmd.startsWith('resume|');
});

// Compute pager prompt text based on scroll position and content
const pagerPromptText = computed(() => {
  const downloadHint = pagerShowingResume.value ? ', d to download' : '';
  if (pagerAtEnd.value) {
    return pagerShowingResume.value 
      ? '(END) d to download, any other key to exit'
      : '(END) Press any key to exit';
  }
  return `-- Press a key for next page${downloadHint}, q to quit --`;
});

// Check if pager is at the end (can't scroll further)
const checkPagerAtEnd = () => {
  if (pagerContentRef.value) {
    const el = pagerContentRef.value;
    // Allow 5px tolerance for floating point issues
    pagerAtEnd.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 5;
  }
};

// Scroll pager content by one viewport
const pagerPageDown = () => {
  if (pagerContentRef.value) {
    const el = pagerContentRef.value;
    
    // Get the inner content element for accurate line-height measurement
    const contentEl = el.querySelector('.terminal-output-text');
    let overlap = 150; // Default fallback
    
    if (contentEl) {
      const computedStyle = window.getComputedStyle(contentEl);
      const fontSize = parseFloat(computedStyle.fontSize) || 14;
      const lineHeightStr = computedStyle.lineHeight;
      
      // Calculate actual line height in pixels
      let lineHeight: number;
      if (lineHeightStr === 'normal') {
        lineHeight = fontSize * 1.6;
      } else {
        lineHeight = parseFloat(lineHeightStr) || fontSize * 1.6;
      }
      
      // Keep 5-6 lines of overlap to ensure no content is lost
      overlap = Math.max(lineHeight * 6, 150);
    }
    
    const pageHeight = Math.max(el.clientHeight - overlap, 50); // Ensure we scroll at least 50px
    el.scrollBy({ top: pageHeight, behavior: 'instant' });
    
    // Check if we've reached the end after scrolling
    nextTick(() => {
      checkPagerAtEnd();
    });
  }
};

// Exit pager mode
const exitPager = () => {
  // Add command to history without output (like real `more` - output was already displayed)
  addHistoryEntry(pagerCommand.value, '');
  
  // Reset pager state
  pagerMode.value = false;
  pagerContent.value = '';
  pagerCommand.value = '';
  pagerAtEnd.value = false;
  
  // Refocus input
  nextTick(() => {
    inputRef.value?.focus();
    scrollToBottom();
  });
};

// Enter pager mode with content
const enterPagerMode = async (command: string, rawContent: string) => {
  pagerCommand.value = command;
  pagerAtEnd.value = false;
  pagerMode.value = true;
  
  // Render markdown to HTML
  const htmlContent = await renderForDisplay(rawContent);
  
  // Type out content with faster pager typewriter
  await typeText(htmlContent, {
    delay: pagerTypewriterConfig.delay,
    charsPerTick: pagerTypewriterConfig.charsPerTick,
    onChar: (text) => {
      pagerContent.value = text;
    },
  });
  
  // After typewriter, check if content fits in viewport (no paging needed)
  nextTick(() => {
    checkPagerAtEnd();
  });
};

// =============================================================================
// Zork Mode Functions
// =============================================================================

/**
 * Enter Zork mode - start the game
 */
const enterZorkMode = async (gameId: string = 'zork1') => {
  // Don't add command to history - the magic word just vanishes mysteriously
  history.value.push({ 
    command: '', 
    output: '<em>Loading the Great Underground Empire...</em>', 
    isStartup: true 
  });
  const loadingIdx = history.value.length - 1;
  scrollToBottom();
  
  // Start the game
  const success = await zork.startGame(gameId);
  
  if (!success) {
    history.value[loadingIdx].output = `<span style="color: var(--terminal-error)">Failed to load game: ${zork.error.value}</span>`;
    return;
  }
  
  // Clear the loading message
  history.value[loadingIdx].output = '<em>Entering the Great Underground Empire...</em>';
  
  // Randomly choose CRT transition effect
  zorkTransitionType.value = Math.random() > 0.5 ? 'smack' : 'roll';
  
  // Trigger CRT transition effect
  zorkTransitioning.value = true;
  
  // Wait for transition, then enter Zork mode
  // Both effects now have 3 escalating phases totaling ~1.8s
  const transitionDuration = 1800;
  await new Promise(resolve => setTimeout(resolve, transitionDuration));
  
  // Enter zork mode AFTER transition completes
  zorkMode.value = true;
  zorkOutput.value = [];
  zorkTypingLine.value = '';
  zorkTransitioning.value = false;
  
  // Focus Zork input
  nextTick(() => {
    zorkInputRef.value?.focus();
  });
  
  // Get any initial output from game startup and type it out
  const initialOutput = zork.getOutputText();
  if (initialOutput) {
    zork.clearOutput();
    await typeZorkOutput(initialOutput);
  }
  
  // Refocus after typing completes and reset cursor
  nextTick(() => {
    zorkInputRef.value?.focus();
    updateCursorPosition();
  });
};

/**
 * Exit Zork mode - clean up and return to terminal
 */
const exitZorkMode = (showMessage: boolean = true) => {
  zork.quit();
  zorkMode.value = false;
  zorkOutput.value = [];
  showZorkQuitModal.value = false;
  
  if (showMessage) {
    addHistoryEntry('', '');
    const idx = history.value.length - 1;
    history.value[idx].output = '<em>You have left the Great Underground Empire.</em>';
    history.value[idx].isStartup = true; // Don't show prompt for this line
  }
  
  // Refocus input
  nextTick(() => {
    const input = isMobile.value ? inputRefMobile.value : inputRef.value;
    input?.focus();
    scrollToBottom();
  });
};

/**
 * Handle Zork quit command - show confirmation
 */
const handleZorkQuit = () => {
  showZorkQuitModal.value = true;
};

/**
 * Confirm Zork quit
 */
const confirmZorkQuit = () => {
  exitZorkMode(true);
};

/**
 * Cancel Zork quit - return to game
 */
const cancelZorkQuit = () => {
  showZorkQuitModal.value = false;
  nextTick(() => {
    const input = isMobile.value ? inputRefMobile.value : inputRef.value;
    input?.focus();
  });
};

/**
 * Send input to Zork
 */
const sendZorkInput = (input: string) => {
  // Check for quit commands
  const lowerInput = input.toLowerCase().trim();
  if (lowerInput === 'quit' || lowerInput === 'q') {
    handleZorkQuit();
    return;
  }
  
  // Add input to output display
  zorkOutput.value.push(`> ${input}`);
  
  // Send to game
  zork.sendInput(input);
  
  // Scroll to bottom
  scrollZorkToBottom();
};

/**
 * Scroll Zork output to bottom
 */
const scrollZorkToBottom = () => {
  nextTick(() => {
    if (zorkScrollRef.value) {
      zorkScrollRef.value.scrollTop = zorkScrollRef.value.scrollHeight;
    }
  });
};

/**
 * Type Zork output through the typewriter effect
 */
const typeZorkOutput = async (text: string) => {
  if (!text) return;
  
  zorkIsTyping.value = true;
  
  // Split into lines and type each one
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (!zorkMode.value) break; // Exit if user quit during typing
    
    // Type this line
    await typeText(line, {
      ...zorkTypewriterConfig,
      onChar: (partialText) => {
        zorkTypingLine.value = partialText;
        scrollZorkToBottom();
      },
    });
    
    // Move completed line to output array
    zorkOutput.value.push(line);
    zorkTypingLine.value = '';
  }
  
  zorkIsTyping.value = false;
  scrollZorkToBottom();
};

// Watch Zork output and sync to display with typewriter
watch(() => zork.output.value, async (newOutput) => {
  if (zorkMode.value && newOutput.length > 0) {
    // Get new output (the composable accumulates)
    const text = zork.getOutputText();
    if (text) {
      zork.clearOutput();
      await typeZorkOutput(text);
    }
  }
}, { deep: true });

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
  // Detect mobile for native scroll fallback
  updateMobileDetection();
  window.addEventListener('resize', updateMobileDetection);
  
  // Run all startup commands through the standard command path
  for (const command of startupCommands) {
    await processStartupCommand(command);
  }
  
  // Cursor blinking is handled by CSS animation
  
  // Focus input after startup commands complete
  nextTick(() => {
    // Focus the appropriate input based on mobile detection
    const input = isMobile.value ? inputRefMobile.value : inputRef.value;
    if (input) {
      input.focus({ preventScroll: true }); // Prevent auto-scroll on focus
    }
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
  if (rawOutput.startsWith(NAV_PREFIX)) {
    const targetPath = rawOutput.slice(NAV_PREFIX.length);
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
  
  // Check if this is a Zork command (hidden Easter egg)
  if (rawOutput.startsWith(ZORK_PREFIX)) {
    const gameId = rawOutput.slice(ZORK_PREFIX.length);
    await enterZorkMode(gameId);
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
  
  // Refocus input after all commands are processed
  nextTick(() => {
    inputRef.value?.focus();
  });
};

// Execute command (entry point - queues if needed)
const executeCommand = async () => {
  const command = currentInput.value.trim();
  
  // If in Zork mode, send input to game instead
  if (zorkMode.value) {
    if (command) {
      sendZorkInput(command);
    }
    currentInput.value = '';
    updateCursorPosition();
    return;
  }
  
  if (!command) {
    addHistoryEntry('', '');
    currentInput.value = '';
    updateCursorPosition();
    scrollToBottom();
    return;
  }

  // Add to command history (avoid duplicating the last command)
  if (commandHistory.value[commandHistory.value.length - 1] !== command) {
    commandHistory.value.push(command);
    // Trim to max length
    if (commandHistory.value.length > COMMAND_HISTORY_MAX_LENGTH) {
      commandHistory.value.shift();
    }
  }

  // Clear input immediately
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

// Update cursor position based on input text width
const updateCursorPosition = () => {
  nextTick(() => {
    // Get the appropriate input ref based on mode and mobile detection
    let currentInputEl: HTMLInputElement | null;
    let currentWrapper: HTMLElement | null;
    
    if (zorkMode.value) {
      currentInputEl = zorkInputRef.value;
      currentWrapper = zorkInputWrapperRef.value;
    } else if (isMobile.value) {
      currentInputEl = inputRefMobile.value;
      currentWrapper = inputWrapperRefMobile.value;
    } else {
      currentInputEl = inputRef.value;
      currentWrapper = inputWrapperRef.value;
    }
    
    if (currentInputEl && currentWrapper) {
      // Initialize canvas cache on first use
      if (!measureCanvas) {
        measureCanvas = document.createElement('canvas');
        measureContext = measureCanvas.getContext('2d');
      }
      
      // Try cached Canvas API first for accurate measurement
      if (measureContext && currentInputEl) {
        const styles = window.getComputedStyle(currentInputEl);
        measureContext.font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
        const textWidth = measureContext.measureText(currentInputEl.value).width;
        cursorLeft.value = textWidth;
        return;
      }
      
      // Fallback: use hidden span to measure text width
      const measureSpan = document.createElement('span');
      measureSpan.style.visibility = 'hidden';
      measureSpan.style.position = 'absolute';
      measureSpan.style.whiteSpace = 'pre';
      measureSpan.style.fontFamily = window.getComputedStyle(currentInputEl).fontFamily;
      measureSpan.style.fontSize = window.getComputedStyle(currentInputEl).fontSize;
      measureSpan.style.fontWeight = window.getComputedStyle(currentInputEl).fontWeight;
      measureSpan.style.fontStyle = window.getComputedStyle(currentInputEl).fontStyle;
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
        }
        // Double RAF for Chrome iOS - ensures scroll happens after paint
        requestAnimationFrame(() => {
          if (nativeScrollRef.value) {
            nativeScrollRef.value.scrollTop = nativeScrollRef.value.scrollHeight;
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
    pagerContent.value = '';
    pagerCommand.value = '';
    pagerAtEnd.value = false;
  }
  
  // Exit zork mode if active
  if (zorkMode.value) {
    exitZorkMode(false);
  }
  
  updateCursorPosition();
  nextTick(() => {
    inputRef.value?.focus();
    scrollToBottom();
  });
};

// Handle keyboard shortcuts (including pager mode and zork mode)
const handleKeyDown = (e: KeyboardEvent) => {
  // Zork quit modal is handled by the modal component itself
  if (showZorkQuitModal.value) {
    return;
  }
  
  // Zork mode - let normal input through, but handle Ctrl+L
  if (zorkMode.value) {
    if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      // Clear zork output but stay in game
      zorkOutput.value = [];
      return;
    }
    // Ensure Zork input is focused for all other keys
    if (zorkInputRef.value && document.activeElement !== zorkInputRef.value) {
      zorkInputRef.value.focus();
    }
    return;
  }
  
  // Pager mode key handling
  if (pagerMode.value) {
    e.preventDefault();
    
    // Check for download key (d) - only when viewing resume
    if ((e.key === 'd' || e.key === 'D') && pagerShowingResume.value) {
      exitPager();
      router.push('/resume/download/pdf');
      return;
    }
    
    // At end of content - any key exits
    if (pagerAtEnd.value) {
      exitPager();
      return;
    }
    
    // Check for exit keys (q, Escape)
    if (PAGER_CONFIG.exitKeys.includes(e.key)) {
      exitPager();
      return;
    }
    
    // Check for next page keys (space, Enter, etc.)
    if (PAGER_CONFIG.nextPageKeys.includes(e.key)) {
      pagerPageDown();
      return;
    }
    
    return;
  }
  
  // Normal mode: Ctrl+L to clear (works globally)
  if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
    e.preventDefault();
    clearTerminal();
  }
};

// Watch for terminal focus to refocus input
watch(() => terminalRef.value, (newEl, oldEl) => {
  // Cleanup old listener
  if (oldEl && terminalClickHandler) {
    oldEl.removeEventListener('click', terminalClickHandler);
  }
  
  // Add new listener
  if (newEl) {
    terminalClickHandler = () => {
      if (!pagerMode.value) {
        // Focus the appropriate input based on mode
        if (zorkMode.value) {
          zorkInputRef.value?.focus();
        } else {
          const input = isMobile.value ? inputRefMobile.value : inputRef.value;
          input?.focus();
        }
      }
    };
    newEl.addEventListener('click', terminalClickHandler);
  }
}, { immediate: true });

// Watch input changes to update cursor position
watch(currentInput, () => {
  updateCursorPosition();
});

// Watch history changes to update scroll indicators
watch(history, () => {
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
}, { deep: true });

// Add global keyboard event listener
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

// Cleanup
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('resize', updateMobileDetection);
  if (terminalRef.value && terminalClickHandler) {
    terminalRef.value.removeEventListener('click', terminalClickHandler);
    terminalClickHandler = null;
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
  
  // Scanlines overlay - z-index 1 to stay behind content
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.20) 0px,
      rgba(0, 0, 0, 0.20) 1px,
      transparent 1px,
      transparent 3px
    );
    pointer-events: none;
    z-index: 1;
    border-radius: 12px;
  }
  
  // Vignette effect (darker at edges) - z-index 0 behind scanlines
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      ellipse at center,
      transparent 50%,
      rgba(0, 0, 0, 0.25) 100%
    );
    pointer-events: none;
    z-index: 0;
    border-radius: 12px;
  }
  
  // =============================================================================
  // CRT "Smack" Transition Effect - Three escalating hits
  // =============================================================================
  &.crt-smack {
    animation: crt-smack-triple 1.8s ease-out;
    
    // Intensify scanlines during smacks
    &::before {
      animation: crt-smack-scanlines-triple 1.8s ease-out !important;
    }
  }
  
  // =============================================================================
  // CRT "Roll" Transition Effect - Three attempts to sync vertical hold
  // =============================================================================
  &.crt-roll {
    animation: crt-roll-triple 1.8s ease-out;
    
    // Intensify scanlines during rolls
    &::before {
      animation: crt-roll-scanlines-triple 1.8s ease-out !important;
    }
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

// Scanline intensity pulse during triple smack
@keyframes crt-smack-scanlines-triple {
  // Hit 1
  0% { opacity: 1; }
  2% { opacity: 0.4; }
  5% { opacity: 0.9; }
  10% { opacity: 0.6; }
  20% { opacity: 1; }
  // Hit 2
  22% { opacity: 0.3; }
  26% { opacity: 0.8; }
  32% { opacity: 0.4; }
  40% { opacity: 0.7; }
  50% { opacity: 1; }
  // Hit 3
  52% { opacity: 0.15; }
  56% { opacity: 0.7; }
  62% { opacity: 0.25; }
  70% { opacity: 0.6; }
  80% { opacity: 0.8; }
  90% { opacity: 0.95; }
  100% { opacity: 1; }
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

// Scanline distortion during triple roll
@keyframes crt-roll-scanlines-triple {
  // Roll 1
  0% { opacity: 1; }
  5% { opacity: 0.5; }
  10% { opacity: 0.7; }
  20% { opacity: 0.9; }
  25% { opacity: 1; }
  // Roll 2
  30% { opacity: 0.35; }
  38% { opacity: 0.2; }
  45% { opacity: 0.5; }
  55% { opacity: 1; }
  // Roll 3
  60% { opacity: 0.25; }
  68% { opacity: 0.1; }
  75% { opacity: 0.35; }
  83% { opacity: 0.6; }
  90% { opacity: 0.85; }
  100% { opacity: 1; }
}

.terminal-output {
  flex: 1;
  overflow: hidden; // QScrollArea handles overflow internally
  padding-right: 10px;
  position: relative;
  z-index: 10;  // Above scanlines (1) and vignette (0)
  min-height: 0; // Allow flex shrinking
  
  // QScrollArea handles scrollbar hiding via thumb-style and bar-style props
}

// Native scroll variant for mobile (Chrome iOS compatibility)
.terminal-output-native {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; // Smooth scrolling on iOS
  
  // Scroll containment - prevents scroll chaining to parent/page
  // This stops the "bounce" effect and address bar toggling when hitting scroll boundaries
  overscroll-behavior: contain;
  overscroll-behavior-y: contain;
  
  // Restrict touch actions to vertical pan only
  // Prevents accidental horizontal swipes from triggering navigation
  touch-action: pan-y;
  
  // Prevent scroll when child elements get focus
  scroll-padding: 0;
  
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
}

.input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  position: relative;
  min-width: 0; // Allow flex item to shrink below content size
  max-width: 100%; // Prevent overflow
  overflow: hidden; // Hide any overflow
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
  caret-color: transparent; // Hide native input caret
  
  // Force lowercase display
  text-transform: lowercase;
  
  // Prevent auto-scroll on focus (mobile browsers)
  scroll-margin: 0;
  
  &::placeholder {
    color: var(--color-brightBlack, #666666);
  }
}

.cursor {
  position: absolute;
  color: var(--color-cursor, #aeafad);
  animation: blink 1s infinite;
  pointer-events: none;
  flex-shrink: 0;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.terminal-output-text {
  color: var(--terminal-output, #d4d4d4);
  margin-top: 0.25rem;
  margin-bottom: 0.75rem;
  margin-left: 0;
  padding: 0;
  width: 100%;
  max-width: 100%; // Prevent overflow
  display: block;
  white-space: normal;
  line-height: 1.6;
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
    line-height: 1.4;
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
    line-height: 1.6;
    font-weight: bold;
    color: var(--terminal-success, #23d18b);
    margin: 0.75em 0 0.5em 0;
  }

  :deep(h2) {
    font-size: 1em;
    line-height: 1.4;
    font-weight: bold;
    color: var(--terminal-success, #23d18b);
    margin: 0.75em 0 0.5em 0;
  }

  :deep(h3) {
    font-size: .75em;
    line-height: 1.4;
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
    line-height: 1.4;
  }
}

.typing-indicator {
  color: var(--terminal-info, #29b8db);
  animation: blink 1s infinite;
}

// Pager styles - wrapper takes remaining space, prompt at top
.pager-wrapper {
  flex: 1;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
}

.pager-content-area {
  flex: 1 1 0;  // Grow AND shrink
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;  // Allow shrinking below content size
  
  // Scroll containment for mobile
  overscroll-behavior: contain;
  touch-action: pan-y;
  
  // Hide scrollbar
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

.pager-content {
  // Inherits terminal-output-text styles
}

.pager-prompt {
  flex-shrink: 0;
  width: 100%;
  color: var(--terminal-info, #29b8db);
  background: var(--color-background, #1e1e1e);
  padding: 0.5rem 0;
  font-weight: bold;
  border-bottom: 1px solid var(--color-brightBlack, #444);
  z-index: 10;
  margin-bottom: 0.5rem;
  text-align: center;
  box-sizing: border-box;
}

// =============================================================================
// Zork Mode Styles
// =============================================================================
.zork-wrapper {
  flex: 1;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
}

.zork-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-brightBlack, #444);
  margin-bottom: 0.75rem;
}

.zork-title {
  color: var(--terminal-success, #23d18b);
  font-weight: bold;
  font-size: 1.1em;
  letter-spacing: 0.1em;
}

.zork-hint {
  color: var(--color-brightBlack, #666);
  font-size: 0.85em;
  font-style: italic;
}

.zork-output-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  padding-right: 10px;
  
  // Scroll containment for mobile
  overscroll-behavior: contain;
  touch-action: pan-y;
  
  // Hide scrollbar
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

.zork-line {
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.5;
  margin-bottom: 0.25rem;
  color: var(--color-foreground, #d4d4d4);
  
  &.zork-input-line {
    color: var(--terminal-command, #3b8eea);
    font-weight: bold;
  }
}

.zork-prompt {
  color: var(--terminal-success, #23d18b);
  font-weight: bold;
  margin-right: 0.5rem;
}

.zork-input {
  color: var(--terminal-command, #3b8eea);
  
  // Force lowercase display (consistent with terminal input)
  text-transform: lowercase;
  
  &::placeholder {
    color: var(--color-brightBlack, #555);
    font-style: italic;
  }
}

// Use native browser caret for Zork input (simpler than custom cursor)
.zork-native-caret {
  caret-color: var(--terminal-success, #23d18b);
}

.zork-typing {
  display: inline;
}

.typing-cursor {
  color: var(--terminal-success, #23d18b);
  animation: blink 1s step-end infinite;
}

// Default line-height for all terminal text
// Only apply to direct children, not nested elements
.terminal-output {
  line-height: var(--font-line-height, 1.8);
  
  // Apply line-height to direct children only
  > .terminal-line {
    line-height: inherit;
  }
}

// =============================================================================
// Scroll Indicators - visual cue when content extends beyond visible area
// =============================================================================
.scroll-indicator {
  position: absolute;
  left: 10px;
  right: 10px;
  height: 28px;
  pointer-events: none;
  z-index: 20; // Above content (10), above scanlines on Terminal
  
  // Default: hidden, show when content is scrollable
  // Note: opacity transitions in when hasScrollableContentAbove/Below is true
  opacity: 0;
  transition: opacity 0.25s ease;
  
  &.scroll-indicator--visible {
    opacity: 1;
  }
}

.scroll-indicator--top {
  top: 10px;
  background: linear-gradient(
    to bottom,
    rgba(0, 150, 120, 0.25) 0%,
    rgba(0, 100, 80, 0.12) 50%,
    transparent 100%
  );
  border-radius: 6px 6px 0 0;
  
  // Subtle top accent line
  border-top: 2px solid rgba(35, 209, 139, 0.35);
}

.scroll-indicator--bottom {
  bottom: 10px;
  background: linear-gradient(
    to top,
    rgba(0, 150, 120, 0.25) 0%,
    rgba(0, 100, 80, 0.12) 50%,
    transparent 100%
  );
  border-radius: 0 0 6px 6px;
  
  // Subtle bottom accent line
  border-bottom: 2px solid rgba(35, 209, 139, 0.35);
}

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
    margin-bottom: 0.35rem;
  }
  
  .terminal-output-text {
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
</style>

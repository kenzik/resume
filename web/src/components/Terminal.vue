<template>
  <div class="terminal" :class="{ 'pager-active': pagerMode }" ref="terminalRef">
    <!-- Normal terminal output - hidden during pager mode -->
    <div v-show="!pagerMode" class="terminal-output" ref="outputRef">
      <template v-for="(entry, index) in history" :key="index">
        <!-- Command line (skip for startup commands - output only) -->
        <div v-if="!entry.isStartup" class="terminal-line">
          <div class="terminal-prompt">
            <span class="prompt-user">dave@resume</span>
            <span class="prompt-separator">:</span>
            <span class="prompt-path">~</span>
            <span class="prompt-separator">$</span>
          </div>
          <span class="terminal-command">{{ entry.command }}</span>
        </div>
        <!-- Output on new line -->
        <div v-if="entry.output" class="terminal-output-text" v-html="entry.output"></div>
        <div v-else-if="isTyping && index === history.length - 1" class="terminal-output-text">
          <span class="typing-indicator">▋</span>
        </div>
      </template>
      
      <!-- Current input line -->
      <div class="terminal-line terminal-input-line">
        <div class="terminal-prompt">
          <span class="prompt-user">dave@resume</span>
          <span class="prompt-separator">:</span>
          <span class="prompt-path">~</span>
          <span class="prompt-separator">$</span>
        </div>
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
    </div>
    
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useCommands } from '../composables/useCommands';
import { useTypewriter } from '../composables/useTypewriter';
import { usePipeline, hasPipe, parsePipeline, executePipeline } from '../composables/usePipeline';
import { ansiToHtml } from '../utils/ansiToHtml';
import { PAGER_CONFIG, formatPagerProgress } from '../config';

// Commands to run automatically on startup (single code path for all commands)
const startupCommands = ['motd'];

const terminalRef = ref<HTMLElement | null>(null);
const outputRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const inputWrapperRef = ref<HTMLElement | null>(null);
const cursorLeft = ref(0);

const currentInput = ref('');
const history = ref<Array<{ command: string; output: string; isStartup?: boolean }>>([]);
const historyIndex = ref(-1);
const showCursor = ref(true);
const commandQueue = ref<string[]>([]);
const isExecutingCommand = ref(false);

// Pager mode state
const pagerMode = ref(false);
const pagerContent = ref('');           // Full HTML content to display
const pagerCommand = ref('');           // The command that triggered pager mode
const pagerAtEnd = ref(false);          // True when scrolled to bottom
const pagerContentRef = ref<HTMLElement | null>(null);

const { execute: executeCmd, executeRaw, renderForDisplay } = useCommands();
const { typeText, isTyping, stopTyping } = useTypewriter();

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

// Compute pager prompt text based on scroll position
const pagerPromptText = computed(() => {
  if (pagerAtEnd.value) {
    return PAGER_CONFIG.endPrompt;
  }
  return PAGER_CONFIG.morePrompt;
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

// Process a startup command (output only, no prompt shown)
const processStartupCommand = async (command: string) => {
  // Execute command through the same path as user commands
  const rawOutput = await executeCmd(command);
  const output = await renderForDisplay(rawOutput);
  
  // Add entry with isStartup flag (prompt won't be shown)
  history.value.push({ command, output: '', isStartup: true });
  const entryIndex = history.value.length - 1;
  
  // Type out output with typewriter effect
  if (output) {
    await typeText(output, {
      delay: typewriterConfig.value.delay,
      charsPerTick: typewriterConfig.value.charsPerTick,
      onChar: (text) => {
        const htmlOutput = text.includes('\x1b[') ? ansiToHtml(text) : text;
        history.value[entryIndex].output = htmlOutput;
        scrollToBottom();
      },
    });
    
    // Final conversion of ANSI codes
    if (output.includes('\x1b[')) {
      history.value[entryIndex].output = ansiToHtml(output);
    }
  }
  
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
    inputRef.value?.focus();
    updateCursorPosition();
  });
});

// Process a single command (may be a pipeline)
const processCommand = async (command: string) => {
  // Handle clear command specially
  if (command.toLowerCase() === 'clear') {
    clearTerminal();
    return;
  }

  // Check if this is a pipeline (contains |)
  if (hasPipe(command)) {
    await processPipeline(command);
    return;
  }

  // Single command - execute and display
  const rawOutput = await executeCmd(command);
  const output = await renderForDisplay(rawOutput);
  
  // Add command to history first (without output)
  addHistoryEntry(command, '');
  
  // Type out output with typewriter effect
  if (output) {
    let typedOutput = '';
    await typeText(output, {
      delay: typewriterConfig.value.delay,
      charsPerTick: typewriterConfig.value.charsPerTick,
      onChar: (text) => {
        typedOutput = text;
        // Update the last history entry with current output
        if (history.value.length > 0) {
          // Convert ANSI to HTML for display
          const htmlOutput = typedOutput.includes('\x1b[') 
            ? ansiToHtml(typedOutput) 
            : typedOutput;
          history.value[history.value.length - 1].output = htmlOutput;
        }
        scrollToBottom();
      },
    });
    
    // Final conversion of ANSI codes to HTML
    if (typedOutput.includes('\x1b[')) {
      history.value[history.value.length - 1].output = ansiToHtml(typedOutput);
    }
  }
  
  // Scroll to bottom
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
  
  // Type out output with typewriter effect
  if (output) {
    let typedOutput = '';
    await typeText(output, {
      delay: typewriterConfig.value.delay,
      charsPerTick: typewriterConfig.value.charsPerTick,
      onChar: (text) => {
        typedOutput = text;
        if (history.value.length > 0) {
          const htmlOutput = typedOutput.includes('\x1b[') 
            ? ansiToHtml(typedOutput) 
            : typedOutput;
          history.value[history.value.length - 1].output = htmlOutput;
        }
        scrollToBottom();
      },
    });
    
    if (typedOutput.includes('\x1b[')) {
      history.value[history.value.length - 1].output = ansiToHtml(typedOutput);
    }
  }
  
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
  if (!command) {
    addHistoryEntry('', '');
    currentInput.value = '';
    updateCursorPosition();
    scrollToBottom();
    return;
  }

  // Clear input immediately
  currentInput.value = '';
  historyIndex.value = -1;
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

// Navigate command history
const navigateHistory = (direction: number) => {
  if (history.value.length === 0) return;
  
  historyIndex.value += direction;
  
  if (historyIndex.value < -1) {
    historyIndex.value = -1;
    currentInput.value = '';
  } else if (historyIndex.value >= history.value.length) {
    historyIndex.value = history.value.length - 1;
  }
  
  if (historyIndex.value >= 0) {
    currentInput.value = history.value[history.value.length - 1 - historyIndex.value].command;
  }
  nextTick(() => {
    updateCursorPosition();
  });
};

// Update cursor position based on input text width
const updateCursorPosition = () => {
  nextTick(() => {
    if (inputRef.value && inputWrapperRef.value) {
      // Try Canvas API first for accurate measurement
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (context && inputRef.value) {
        const styles = window.getComputedStyle(inputRef.value);
        context.font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
        const textWidth = context.measureText(inputRef.value.value).width;
        cursorLeft.value = textWidth;
        return;
      }
      
      // Fallback: use hidden span to measure text width
      const measureSpan = document.createElement('span');
      measureSpan.style.visibility = 'hidden';
      measureSpan.style.position = 'absolute';
      measureSpan.style.whiteSpace = 'pre';
      measureSpan.style.fontFamily = window.getComputedStyle(inputRef.value).fontFamily;
      measureSpan.style.fontSize = window.getComputedStyle(inputRef.value).fontSize;
      measureSpan.style.fontWeight = window.getComputedStyle(inputRef.value).fontWeight;
      measureSpan.style.fontStyle = window.getComputedStyle(inputRef.value).fontStyle;
      measureSpan.textContent = inputRef.value.value || '';
      
      document.body.appendChild(measureSpan);
      cursorLeft.value = measureSpan.offsetWidth;
      document.body.removeChild(measureSpan);
    } else {
      cursorLeft.value = 0;
    }
  });
};

// Scroll to bottom - use scrollIntoView on input for reliability
const scrollToBottom = () => {
  nextTick(() => {
    if (outputRef.value) {
      outputRef.value.scrollTop = outputRef.value.scrollHeight;
    }
  });
};

// Clear terminal
const clearTerminal = () => {
  history.value = [];
  currentInput.value = '';
  historyIndex.value = -1;
  
  // Exit pager mode if active
  if (pagerMode.value) {
    pagerMode.value = false;
    pagerContent.value = '';
    pagerCommand.value = '';
    pagerAtEnd.value = false;
  }
  
  updateCursorPosition();
  nextTick(() => {
    inputRef.value?.focus();
    scrollToBottom();
  });
};

// Handle keyboard shortcuts (including pager mode)
const handleKeyDown = (e: KeyboardEvent) => {
  // Pager mode key handling
  if (pagerMode.value) {
    e.preventDefault();
    
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
watch(() => terminalRef.value, (el) => {
  if (el) {
    el.addEventListener('click', () => {
      if (!pagerMode.value) {
        inputRef.value?.focus();
      }
    });
  }
}, { immediate: true });

// Watch input changes to update cursor position
watch(currentInput, () => {
  updateCursorPosition();
});

// Add global keyboard event listener
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

// Cleanup
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style lang="scss" scoped>
.terminal {
  position: relative;
  width: 100%;
  height: 100%;  // Fill the 4:3 body container
  background-color: var(--color-background, #1e1e1e);
  color: var(--color-foreground, #d4d4d4);
  font-family: var(--font-family, monospace);
  font-size: var(--font-size, 14px);
  font-weight: var(--font-weight, 400);
  line-height: var(--font-line-height, 1.6);
  padding: var(--spacing-padding, 20px);
  overflow: hidden;
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
}

.terminal-output {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 10px;
  position: relative;
  z-index: 10;  // Above scanlines (1) and vignette (0)
  min-height: 0; // Allow flex shrinking
  
  // Hide scrollbar but keep scroll functionality
  scrollbar-width: none;  // Firefox
  -ms-overflow-style: none;  // IE/Edge
  
  &::-webkit-scrollbar {
    display: none;  // Chrome/Safari/Opera
  }
}

.terminal-line {
  display: flex;
  align-items: flex-start;
  margin-bottom: 0.5rem;
  min-height: 1.6em;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.terminal-prompt {
  display: inline-flex;
  align-items: center;
  margin-right: 8px;
  flex-shrink: 0;
  
  .prompt-user {
    color: var(--terminal-prompt, #0dbc79);
    font-weight: 500;
  }
  
  .prompt-separator {
    color: var(--color-foreground, #d4d4d4);
    margin: 0 2px;
  }
  
  .prompt-path {
    color: var(--terminal-info, #29b8db);
  }
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
}

.input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  position: relative;
}

.terminal-input {
  flex: 1;
  width: 100%;
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
  display: block;
  white-space: normal;
  line-height: 1.6;
  clear: both;
  
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
    font-weight: normal;
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

// Default line-height for all terminal text
// Only apply to direct children, not nested elements
.terminal-output {
  line-height: var(--font-line-height, 1.8);
  
  // Apply line-height to direct children only
  > .terminal-line {
    line-height: inherit;
  }
}
</style>

<template>
  <div class="terminal" ref="terminalRef">
    <div class="terminal-output" ref="outputRef">
      <!-- MOTD -->
      <div v-if="showMotd">
        <div class="motd motd-banner">{{ formattedMotdBanner }}</div>
        <div class="motd motd-text">{{ formattedMotdText }}</div>
      </div>
      
      <!-- Command history -->
      <template v-for="(entry, index) in history" :key="index">
        <!-- Command line -->
        <div class="terminal-line">
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
        <input
          ref="inputRef"
          v-model="currentInput"
          @keydown.enter="executeCommand"
          @keydown.up="navigateHistory(-1)"
          @keydown.down="navigateHistory(1)"
          class="terminal-input"
          type="text"
          autofocus
          spellcheck="false"
        />
        <span class="cursor" v-if="showCursor">█</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useMotd } from '../composables/useMotd';
import { useCommands } from '../composables/useCommands';
import { useTypewriter } from '../composables/useTypewriter';
import { ansiToHtml } from '../utils/ansiToHtml';

const terminalRef = ref<HTMLElement | null>(null);
const outputRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

const currentInput = ref('');
const history = ref<Array<{ command: string; output: string }>>([]);
const historyIndex = ref(-1);
const showCursor = ref(true);
const motdBanner = ref('');
const motdText = ref('');
const showMotd = ref(true);

const { getMotd } = useMotd();
const { execute: executeCmd } = useCommands();
const { typeText, isTyping } = useTypewriter();

// Typewriter delay configuration (milliseconds per character)
const typewriterDelay = ref(0.25); // Very fast typing speed - configurable

// Format MOTD - plain text, no ANSI colors for old-school terminal vibe
const formattedMotdBanner = computed(() => {
  // Plain text, no HTML conversion needed
  return motdBanner.value;
});

const formattedMotdText = computed(() => {
  // Plain text, no HTML conversion needed
  return motdText.value;
});

// Load MOTD on mount with typewriter effect
onMounted(async () => {
  const { banner, text } = getMotd();
  
  // Type out ASCII art banner first (fast, no delay needed)
  motdBanner.value = banner;
  
  // Type out MOTD text with typewriter effect
  await typeText(text, {
    delay: typewriterDelay.value,
    onChar: (typedText) => {
      motdText.value = typedText;
      scrollToBottom();
    },
  });
  
  // Blink cursor
  setInterval(() => {
    showCursor.value = !showCursor.value;
  }, 530);
  
  // Focus input after MOTD is done
  nextTick(() => {
    inputRef.value?.focus();
  });
});

// Execute command
const executeCommand = async () => {
  const command = currentInput.value.trim();
  if (!command) {
    addHistoryEntry('', '');
    currentInput.value = '';
    scrollToBottom();
    return;
  }

  // Handle clear command specially
  if (command.toLowerCase() === 'clear') {
    clearTerminal();
    return;
  }

  // Execute command and get output
  let output = await executeCmd(command);
  
  // Add command to history first (without output)
  addHistoryEntry(command, '');
  
  // Type out output with typewriter effect
  if (output) {
    let typedOutput = '';
    await typeText(output, {
      delay: typewriterDelay.value,
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
  
  // Clear input and reset history navigation
  currentInput.value = '';
  historyIndex.value = -1;
  
  // Scroll to bottom
  scrollToBottom();
  
  // Refocus input
  nextTick(() => {
    inputRef.value?.focus();
  });
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
};

// Scroll to bottom
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
  showMotd.value = false;
  currentInput.value = '';
  historyIndex.value = -1;
  nextTick(() => {
    inputRef.value?.focus();
    scrollToBottom();
  });
};

// Handle keyboard shortcuts
const handleKeyDown = (e: KeyboardEvent) => {
  // Ctrl+L to clear (works globally)
  if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
    e.preventDefault();
    clearTerminal();
  }
};

// Watch for terminal focus to refocus input
watch(() => terminalRef.value, (el) => {
  if (el) {
    el.addEventListener('click', () => {
      inputRef.value?.focus();
    });
  }
}, { immediate: true });

// Add global keyboard event listener for Ctrl+L
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
  width: 100%;
  height: 100vh;
  background-color: var(--color-background, #1e1e1e);
  color: var(--color-foreground, #d4d4d4);
  font-family: var(--font-family, monospace);
  font-size: var(--font-size, 14px);
  line-height: var(--font-line-height, 1.6);
  padding: var(--spacing-padding, 20px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.terminal-output {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 10px;
  
  // Custom scrollbar
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--color-background, #1e1e1e);
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--color-brightBlack, #666666);
    border-radius: 4px;
    
    &:hover {
      background: var(--color-white, #e5e5e5);
    }
  }
}

.terminal-line {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
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

.terminal-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--terminal-command, #3b8eea);
  font-family: var(--font-family, monospace);
  font-size: var(--font-size, 14px);
  line-height: var(--font-line-height, 1.6);
  padding: 0;
  margin: 0;
  width: 100%;
  
  &::placeholder {
    color: var(--color-brightBlack, #666666);
  }
}

.cursor {
  color: var(--color-cursor, #aeafad);
  animation: blink 1s infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.terminal-output-text {
  color: var(--terminal-output, #d4d4d4);
  margin-top: 8px;
  margin-bottom: 20px;
  margin-left: 0;
  padding: 0;
  width: 100%;
  display: block;
  white-space: pre-wrap;
  line-height: var(--font-line-height, 1.8);
  clear: both;
  
  :deep(pre) {
    margin: 0;
    font-family: var(--font-family, monospace);
    line-height: 1.6;
  }
  
  :deep(code) {
    font-family: var(--font-family, monospace);
    background: var(--color-brightBlack, #666666);
    padding: 2px 6px;
    border-radius: 3px;
    color: var(--terminal-command, #3b8eea);
  }
  
  :deep(strong) {
    color: var(--terminal-success, #23d18b);
    font-weight: bold;
  }
  
  :deep(p) {
    margin: 0;
    padding: 0;
    line-height: 1.6;
  }
  
  :deep(div) {
    margin: 0;
    padding: 0;
  }
  
  :deep(br) {
    line-height: 1.6;
  }
}

.typing-indicator {
  color: var(--terminal-info, #29b8db);
  animation: blink 1s infinite;
}

// Default line-height for all terminal text
.terminal-output {
  line-height: var(--font-line-height, 1.8);
  
  * {
    line-height: inherit;
  }
}

.motd {
  color: var(--terminal-output, #d4d4d4);
  white-space: pre-wrap;
  font-family: var(--font-family, monospace);
  font-size: var(--font-size, 14px);
}

// ASCII art banner - tight spacing
.motd-banner {
  margin-bottom: 20px;
  margin-top: 0;
  line-height: 1.0 !important; // Tight spacing for ASCII art, override inherited line-height
}

// MOTD text content - comfortable spacing
.motd-text {
  margin-bottom: 20px;
  line-height: var(--font-line-height, 1.8); // Comfortable spacing for text
}
</style>


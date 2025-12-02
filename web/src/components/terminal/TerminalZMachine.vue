<template>
  <div v-show="active" class="zmachine-wrapper">
    <div class="zmachine-header">
      <span class="zmachine-title">{{ gameTitle }}</span>
      <span class="zmachine-hint">Type 'quit' to exit</span>
    </div>
    <div class="zmachine-output-area" ref="outputRef">
      <div 
        v-for="(line, index) in outputLines" 
        :key="index" 
        class="zmachine-line"
        :class="{ 'zmachine-command-echo': line.startsWith('>') }"
      >{{ line }}</div>
      <!-- Currently typing line (typewriter effect) -->
      <div v-if="typingLine" class="zmachine-line zmachine-typing">
        {{ typingLine }}<span class="typing-cursor">█</span>
      </div>
    </div>
    <div class="zmachine-input-line terminal-line">
      <span class="zmachine-prompt">&gt;</span>
      <div class="input-wrapper" ref="inputWrapperRef">
        <input
          ref="inputRef"
          :value="modelValue"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          @keydown.enter="handleSubmit"
          class="terminal-input zmachine-input zmachine-native-caret"
          type="text"
          spellcheck="false"
          placeholder="What do you want to do?"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * TerminalZMachine - Z-Machine game mode UI
 * 
 * Renders the game output with typewriter effect and handles input.
 * Game logic is handled by useZMachine composable in the parent.
 */
import { ref, nextTick, watch } from 'vue';

const props = defineProps<{
  active: boolean;
  gameTitle: string;
  outputLines: string[];
  typingLine: string;
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'submit', command: string): void;
}>();

const outputRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const inputWrapperRef = ref<HTMLElement | null>(null);

// Handle command submission
const handleSubmit = () => {
  const command = props.modelValue.trim();
  emit('submit', command);
  emit('update:modelValue', '');
};

// Scroll to bottom when output changes
const scrollToBottom = () => {
  if (outputRef.value) {
    outputRef.value.scrollTop = outputRef.value.scrollHeight;
  }
};

// Watch for output changes to auto-scroll
watch(() => props.outputLines.length, () => {
  nextTick(scrollToBottom);
});

watch(() => props.typingLine, () => {
  nextTick(scrollToBottom);
});

// Focus input when activated
watch(() => props.active, (isActive) => {
  if (isActive) {
    nextTick(() => {
      inputRef.value?.focus({ preventScroll: true });
    });
  }
});

// Expose refs for parent component focus management
defineExpose({
  inputRef,
  inputWrapperRef,
  outputRef,
  scrollToBottom,
  focus: () => inputRef.value?.focus({ preventScroll: true }),
});
</script>

<style lang="scss" scoped>
.zmachine-wrapper {
  flex: 1;
  width: 100%;
  max-width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
  overflow: hidden;
  
  // Ensure input line within zmachine wrapper is properly constrained
  .terminal-line {
    min-width: 0 !important;
    max-width: 100% !important;
    width: 100%;
    overflow: hidden;
    
    .input-wrapper {
      min-width: 0 !important;
      max-width: 100% !important;
      overflow: hidden;
    }
  }
}

.zmachine-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-brightBlack, #444);
  margin-bottom: 0.75rem;
  max-width: 100%;
}

.zmachine-title {
  color: var(--color-yellow, #b5ba00);
  font-weight: bold;
  letter-spacing: 0.1em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.zmachine-hint {
  color: var(--color-brightBlack, #666);
  font-size: 0.8em;
  font-style: italic;
  white-space: nowrap;
  flex-shrink: 0;
}

.zmachine-output-area {
  flex: 1 1 0;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  padding-bottom: 0.5rem;
  max-width: 100%;
  
  // Hide scrollbar
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
  
  // Scroll containment for mobile
  overscroll-behavior: contain;
  touch-action: pan-y;
}

.zmachine-line {
  white-space: pre-wrap;
  word-wrap: break-word;
  max-width: 100%;
  overflow-wrap: anywhere;
  line-height: 1.5;
  
  &.zmachine-command-echo {
    color: var(--color-brightCyan, #29b8db);
    margin-top: 0.3em;
    
    &::before {
      content: none;
    }
  }
  
  &.zmachine-typing {
    color: var(--color-foreground, #d4d4d4);
  }
}

.zmachine-input-line {
  display: flex;
  align-items: center;
  position: relative;
  margin-bottom: 0 !important;
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
  flex-shrink: 0;
  border-top: 1px solid var(--color-brightBlack, #333);
  padding-top: 0.5rem;
}

.zmachine-prompt {
  color: var(--color-brightCyan, #29b8db);
  margin-right: 0.5em;
  flex-shrink: 0;
  font-weight: bold;
}

.input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  position: relative;
  min-width: 0;
  max-width: 100%;
  overflow: hidden !important;
  overflow-x: hidden !important;
}

.zmachine-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-foreground, #d4d4d4);
  font-family: inherit;
  font-size: inherit;
  width: 100%;
  min-width: 0;
  caret-color: var(--terminal-cursor, #23d18b);
  
  &::placeholder {
    color: var(--color-brightBlack, #666);
    font-style: italic;
    opacity: 0.7;
  }
}

.typing-cursor {
  color: var(--terminal-cursor, #23d18b);
  animation: blink 0.8s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

// Mobile responsive
@media (max-width: 768px) {
  .zmachine-header {
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  
  .zmachine-hint {
    width: 100%;
    text-align: center;
    font-size: 0.75em;
  }
  
  .zmachine-input {
    font-size: 16px !important; // Prevent iOS zoom
  }
}
</style>


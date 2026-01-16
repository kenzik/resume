<template>
  <div v-show="active" class="wopr-wrapper">
    <div class="wopr-header">
      <span class="wopr-title">WOPR</span>
      <span class="wopr-hint">Type 'quit' to disconnect</span>
    </div>
    <div class="wopr-output-area" ref="outputRef">
      <div
        v-for="(line, index) in outputLines"
        :key="index"
        class="wopr-line"
        :class="{ 'wopr-command-echo': line.startsWith('>') }"
      >{{ line }}</div>
      <!-- Currently typing line (typewriter effect) -->
      <div v-if="typingLine" class="wopr-line wopr-typing">
        {{ typingLine }}<span class="typing-cursor">_</span>
      </div>
    </div>
    <div class="wopr-input-line terminal-line">
      <span class="wopr-prompt">></span>
      <div class="input-wrapper" ref="inputWrapperRef">
        <input
          ref="inputRef"
          :value="modelValue"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          @keydown.enter="handleSubmit"
          class="terminal-input wopr-input wopr-native-caret"
          type="text"
          spellcheck="false"
          placeholder=""
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * TerminalWOPR - WOPR simulator mode UI
 *
 * Renders the WOPR output with typewriter effect and handles input.
 * Game logic is handled by useWOPR composable in the parent.
 *
 * Styled to match the WarGames (1983) WOPR terminal aesthetic.
 */
import { ref, nextTick, watch } from 'vue';

const props = defineProps<{
  active: boolean;
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
.wopr-wrapper {
  flex: 1;
  width: 100%;
  max-width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
  overflow: hidden;

  // WOPR green-on-black aesthetic
  --wopr-green: #33ff33;
  --wopr-green-dim: #1a991a;
  --wopr-green-glow: rgba(51, 255, 51, 0.3);

  // Ensure input line within wopr wrapper is properly constrained
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

.wopr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--wopr-green-dim);
  margin-bottom: 0.75rem;
  max-width: 100%;
}

.wopr-title {
  color: var(--wopr-green);
  font-weight: bold;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-shadow: 0 0 10px var(--wopr-green-glow);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wopr-hint {
  color: var(--wopr-green-dim);
  font-size: 0.8em;
  font-style: italic;
  white-space: nowrap;
  flex-shrink: 0;
}

.wopr-output-area {
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

.wopr-line {
  white-space: pre-wrap;
  word-wrap: break-word;
  max-width: 100%;
  overflow-wrap: anywhere;
  line-height: 1.5;
  color: var(--wopr-green);
  text-shadow: 0 0 5px var(--wopr-green-glow);
  font-family: var(--font-family, monospace);
  text-transform: uppercase;

  &.wopr-command-echo {
    color: var(--wopr-green-dim);
    margin-top: 0.3em;

    &::before {
      content: none;
    }
  }

  &.wopr-typing {
    color: var(--wopr-green);
  }
}

.wopr-input-line {
  display: flex;
  align-items: center;
  position: relative;
  margin-bottom: 0 !important;
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
  flex-shrink: 0;
  border-top: 1px solid var(--wopr-green-dim);
  padding-top: 0.5rem;
}

.wopr-prompt {
  color: var(--wopr-green);
  margin-right: 0.5em;
  flex-shrink: 0;
  font-weight: bold;
  text-shadow: 0 0 5px var(--wopr-green-glow);
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

.wopr-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--wopr-green);
  font-family: inherit;
  font-size: inherit;
  width: 100%;
  min-width: 0;
  caret-color: var(--wopr-green);
  text-transform: uppercase;
  text-shadow: 0 0 5px var(--wopr-green-glow);

  &::placeholder {
    color: var(--wopr-green-dim);
    font-style: italic;
    opacity: 0.5;
  }
}

.typing-cursor {
  color: var(--wopr-green);
  text-shadow: 0 0 10px var(--wopr-green-glow);
  animation: blink 0.7s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

// Mobile responsive
@media (max-width: 768px) {
  .wopr-header {
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .wopr-hint {
    width: 100%;
    text-align: center;
    font-size: 0.75em;
  }

  .wopr-input {
    font-size: 16px !important; // Prevent iOS zoom
  }
}
</style>

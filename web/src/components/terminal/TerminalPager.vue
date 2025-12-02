<template>
  <div v-show="active" class="pager-wrapper">
    <!-- Prompt at top -->
    <div class="pager-prompt">
      {{ promptText }}
    </div>
    <!-- Scrollable content area -->
    <div class="pager-content-area" ref="contentRef">
      <div class="terminal-output-text pager-content" v-html="displayContent"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * TerminalPager - Pager mode for viewing long content (like Unix `more`)
 * 
 * Displays content with typewriter effect, handles paging with keyboard,
 * and provides download shortcut when viewing resume content.
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useCommands } from '../../composables/useCommands';
import { useTypewriter } from '../../composables/useTypewriter';
import { PAGER_CONFIG } from '../../config';
import { TYPEWRITER_SPEEDS } from '../../constants';

const props = defineProps<{
  active: boolean;
  command: string;
  rawContent: string;
}>();

const emit = defineEmits<{
  (e: 'exit'): void;
}>();

const router = useRouter();
const { renderForDisplay } = useCommands();
const { typeText } = useTypewriter();

// Internal state
const contentRef = ref<HTMLElement | null>(null);
const displayContent = ref('');
const atEnd = ref(false);

// Check if viewing resume content (for download shortcut)
const showingResume = computed(() => {
  const cmd = props.command.toLowerCase();
  return cmd === 'resume' || cmd.startsWith('resume |') || cmd.startsWith('resume|');
});

// Dynamic prompt text
const promptText = computed(() => {
  const downloadHint = showingResume.value ? ', d to download' : '';
  if (atEnd.value) {
    return showingResume.value 
      ? '(END) d to download, any other key to exit'
      : '(END) Press any key to exit';
  }
  return `-- Press a key for next page${downloadHint}, q to quit --`;
});

// Check if scrolled to bottom
const checkAtEnd = () => {
  if (contentRef.value) {
    const el = contentRef.value;
    atEnd.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 5;
  }
};

// Scroll down one page
const pageDown = () => {
  if (!contentRef.value) return;
  
  const el = contentRef.value;
  const contentEl = el.querySelector('.terminal-output-text');
  let overlap = 150;
  
  if (contentEl) {
    const computedStyle = window.getComputedStyle(contentEl);
    const fontSize = parseFloat(computedStyle.fontSize) || 14;
    const lineHeightStr = computedStyle.lineHeight;
    
    let lineHeight: number;
    if (lineHeightStr === 'normal') {
      lineHeight = fontSize * 1.6;
    } else {
      lineHeight = parseFloat(lineHeightStr) || fontSize * 1.6;
    }
    
    overlap = Math.max(lineHeight * 6, 150);
  }
  
  const pageHeight = Math.max(el.clientHeight - overlap, 50);
  el.scrollBy({ top: pageHeight, behavior: 'instant' });
  
  nextTick(() => checkAtEnd());
};

// Keyboard handler
const handleKeyDown = (e: KeyboardEvent) => {
  if (!props.active) return;
  
  e.preventDefault();
  
  // Download key (d) - only when viewing resume
  if ((e.key === 'd' || e.key === 'D') && showingResume.value) {
    emit('exit');
    router.push('/resume/download/pdf');
    return;
  }
  
  // At end - any key exits
  if (atEnd.value) {
    emit('exit');
    return;
  }
  
  // Exit keys (q, Escape)
  if (PAGER_CONFIG.exitKeys.includes(e.key)) {
    emit('exit');
    return;
  }
  
  // Next page keys (space, Enter, etc.)
  if (PAGER_CONFIG.nextPageKeys.includes(e.key)) {
    pageDown();
  }
};

// Watch for activation to type content
watch(() => props.active, async (isActive) => {
  if (isActive && props.rawContent) {
    atEnd.value = false;
    displayContent.value = '';
    
    // Render markdown to HTML
    const htmlContent = await renderForDisplay(props.rawContent);
    
    // Type out with pager speed
    await typeText(htmlContent, {
      delay: TYPEWRITER_SPEEDS.pager.delay,
      charsPerTick: TYPEWRITER_SPEEDS.pager.charsPerTick,
      onChar: (text) => {
        displayContent.value = text;
      },
    });
    
    // Check if content fits in viewport
    nextTick(() => checkAtEnd());
  }
});

// Watch for content changes when already active
watch(() => props.rawContent, async (newContent) => {
  if (props.active && newContent) {
    atEnd.value = false;
    displayContent.value = '';
    
    const htmlContent = await renderForDisplay(newContent);
    
    await typeText(htmlContent, {
      delay: TYPEWRITER_SPEEDS.pager.delay,
      charsPerTick: TYPEWRITER_SPEEDS.pager.charsPerTick,
      onChar: (text) => {
        displayContent.value = text;
      },
    });
    
    nextTick(() => checkAtEnd());
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style lang="scss" scoped>
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
  flex: 1 1 0;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  
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

// Content inherits terminal-output-text styles from parent
// We define minimal overrides here
.pager-content {
  color: var(--terminal-output, #d4d4d4);
  line-height: 1.6;
}
</style>


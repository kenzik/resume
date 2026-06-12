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
  border-bottom: 1px solid var(--color-brightBlack, #333333);
  z-index: 10;
  margin-bottom: 0.5rem;
  text-align: center;
  box-sizing: border-box;
}

// Terminal output text styles (must be defined here since scoped styles don't penetrate)
.pager-content {
  color: var(--terminal-output, #d4d4d4);
  margin-top: 0.25rem;
  margin-bottom: 0.75rem;
  margin-left: 0;
  padding: 0;
  width: 100%;
  max-width: 100%;
  display: block;
  white-space: normal;
  line-height: 1.6;
  clear: both;
  overflow-wrap: break-word;
  word-break: break-word;
  
  :deep(pre) {
    margin: 0;
    font-family: var(--font-family, monospace);
    line-height: var(--font-line-height, 1.8);
    white-space: pre-wrap;
  }
  
  :deep(code) {
    font-family: var(--font-family, monospace);
    background: var(--color-brightBlack, #333333);
    padding: 2px 6px;
    border-radius: 3px;
    color: var(--terminal-command, #929292);
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
  }

  :deep(h4), :deep(h5), :deep(h6) {
    font-size: 1em;
    font-weight: bold;
    color: var(--terminal-info, #29b8db);
    margin: 0.3em 0 0.15em 0;
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid var(--color-brightBlack, #333333);
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

// Mobile responsive styles for pager content
@media (max-width: 768px) {
  .pager-content {
    line-height: var(--mobile-line-height, 1.5);
    
    :deep(h1) {
      font-size: 1.2em;
    }
    
    :deep(h2) {
      font-size: 0.95em;
    }
    
    :deep(p) {
      margin: 0.5em 0 0.35em 0;
    }
    
    :deep(ul), :deep(ol) {
      padding-left: 1.2em;
    }
  }
}
</style>


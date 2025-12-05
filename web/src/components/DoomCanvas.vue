<template>
  <div 
    class="doom-wrapper"
    ref="wrapperRef"
  >
    <!-- Loading overlay -->
    <div v-if="isLoading" class="doom-loading-overlay">
      <div class="doom-loading-content">
        <pre class="doom-logo">
██████╗  ██████╗  ██████╗ ███╗   ███╗
██╔══██╗██╔═══██╗██╔═══██╗████╗ ████║
██║  ██║██║   ██║██║   ██║██╔████╔██║
██║  ██║██║   ██║██║   ██║██║╚██╔╝██║
██████╔╝╚██████╔╝╚██████╔╝██║ ╚═╝ ██║
╚═════╝  ╚═════╝  ╚═════╝ ╚═╝     ╚═╝</pre>
        <div class="loading-text">LOADING...</div>
        <div class="loading-bar">
          <div 
            class="loading-progress" 
            :style="{ width: loadProgress + '%' }"
          ></div>
        </div>
        <div class="loading-percent">{{ loadProgress }}%</div>
      </div>
    </div>

    <!-- Error overlay -->
    <div v-if="error" class="doom-error-overlay" @click="handleErrorClick" @keydown="handleErrorClick">
      <div class="doom-error-content">
        <div class="error-title">GAME OVER</div>
        <div class="error-message">{{ error }}</div>
        <div class="error-hint">Press any key to return to terminal</div>
      </div>
    </div>

    <!-- js-dos container - js-dos creates its own canvas here -->
    <div 
      ref="containerRef"
      class="doom-container"
      :class="{ 'doom-hidden': isLoading || error }"
    ></div>

    <!-- Scanlines overlay for CRT effect -->
    <div class="doom-scanlines" v-if="!isLoading && !error"></div>

    <!-- Controls hint (shown briefly on start) -->
    <Transition name="fade">
      <div v-if="showControls && !isLoading && !error" class="doom-controls-hint">
        <div class="controls-title">CONTROLS</div>
        <div class="controls-grid">
          <span>WASD/Arrows</span><span>Move</span>
          <span>Ctrl</span><span>Fire</span>
          <span>Space</span><span>Use/Open</span>
          <span>Shift</span><span>Run</span>
          <span>1-7</span><span>Weapons</span>
          <span>ESC</span><span>Pause</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useDoom } from '../composables/useDoom';

const props = defineProps<{
  active: boolean;
  gameId?: string;
}>();

const emit = defineEmits<{
  (e: 'pause'): void;
  (e: 'quit'): void;
  (e: 'ready'): void;
  (e: 'error', message: string): void;
}>();

const wrapperRef = ref<HTMLDivElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const showControls = ref(false);

const doom = useDoom();
const { 
  isLoading, 
  isPaused, 
  loadProgress, 
  error, 
  startGame,
} = doom;

// Global keyboard listener for Escape key only
const handleGlobalKeyDown = (event: KeyboardEvent) => {
  // Only capture Escape for pause menu
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('pause');
  }
  // All other keys pass through to js-dos
};

// Handle click on error overlay to quit
const handleErrorClick = () => {
  emit('quit');
};

// Start game when component mounts
onMounted(async () => {
  await nextTick();
  
  // Add global Escape key listener
  window.addEventListener('keydown', handleGlobalKeyDown);
  
  if (!containerRef.value) {
    console.error('[DOOM] Container ref not available');
    emit('error', 'Container not available');
    return;
  }
  
  console.log('[DOOM] Starting game...');
  const success = await startGame(props.gameId || 'doom1', containerRef.value);
  
  if (success) {
    emit('ready');
    
    // Show controls hint briefly
    showControls.value = true;
    setTimeout(() => {
      showControls.value = false;
    }, 5000);
    
    // Focus the js-dos canvas for keyboard input
    setTimeout(() => {
      const canvas = containerRef.value?.querySelector('canvas');
      if (canvas) {
        canvas.focus();
      }
    }, 500);
  } else {
    console.error('[DOOM] Failed to start:', error.value);
    emit('error', error.value || 'Failed to start DOOM');
  }
});

// Clean up on unmount
onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown);
  doom.quit();
});

// Expose focus method for parent
defineExpose({
  focus: () => wrapperRef.value?.focus(),
});
</script>

<style lang="scss" scoped>
.doom-wrapper {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
  
  // Capture keyboard focus
  outline: none;
  
  &:focus {
    outline: none;
  }
}

.doom-container {
  // js-dos container - takes full size
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.doom-hidden {
    visibility: hidden;
  }
  
  // Style the canvas that js-dos creates
  :deep(canvas) {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    
    // Crisp pixel scaling (no blur)
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
  
  // Hide js-dos UI elements we don't want
  :deep(.jsdos-player-layers) {
    // Keep the canvas layer
  }
  
  :deep(.jsdos-player-button) {
    display: none !important;
  }
  
  :deep(.jsdos-fullscreen-button),
  :deep(.jsdos-save-button),
  :deep(.jsdos-networking-button) {
    display: none !important;
  }
}

// CRT scanlines effect
.doom-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  z-index: 10;
}

// Loading overlay
.doom-loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.95);
  z-index: 20;
}

.doom-loading-content {
  text-align: center;
  color: var(--color-foreground, #d4d4d4);
  font-family: var(--font-family, monospace);
}

.doom-logo {
  font-size: 8px;
  line-height: 1;
  color: #b22222; // DOOM red
  margin-bottom: 2rem;
  text-shadow: 0 0 10px rgba(178, 34, 34, 0.5);
  
  @media (min-width: 640px) {
    font-size: 12px;
  }
}

.loading-text {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--terminal-info, #29b8db);
  animation: blink 1s infinite;
}

.loading-bar {
  width: 200px;
  height: 8px;
  background: var(--color-brightBlack, #666666);
  border-radius: 4px;
  overflow: hidden;
  margin: 0 auto 0.5rem;
}

.loading-progress {
  height: 100%;
  background: linear-gradient(90deg, #b22222, #ff4444);
  transition: width 0.3s ease;
}

.loading-percent {
  font-size: 0.9rem;
  color: var(--color-brightBlack, #666666);
}

// Error overlay
.doom-error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.95);
  z-index: 20;
  cursor: pointer;
}

.doom-error-content {
  text-align: center;
  color: var(--color-foreground, #d4d4d4);
  font-family: var(--font-family, monospace);
  padding: 2rem;
}

.error-title {
  font-size: 2rem;
  color: #b22222;
  margin-bottom: 1rem;
  text-shadow: 0 0 10px rgba(178, 34, 34, 0.5);
}

.error-message {
  font-size: 1rem;
  color: var(--terminal-error, #f14c4c);
  margin-bottom: 1.5rem;
  max-width: 400px;
}

.error-hint {
  font-size: 0.9rem;
  color: var(--color-brightBlack, #666666);
  animation: blink 1.5s infinite;
}

// Controls hint overlay
.doom-controls-hint {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid var(--color-brightBlack, #666666);
  border-radius: 8px;
  padding: 1rem;
  font-family: var(--font-family, monospace);
  font-size: 0.75rem;
  z-index: 15;
  pointer-events: none;
}

.controls-title {
  color: var(--terminal-info, #29b8db);
  font-weight: bold;
  margin-bottom: 0.5rem;
  text-align: center;
}

.controls-grid {
  display: grid;
  grid-template-columns: auto auto;
  gap: 0.25rem 1rem;
  
  span:nth-child(odd) {
    color: var(--terminal-command, #3b8eea);
    text-align: right;
  }
  
  span:nth-child(even) {
    color: var(--color-foreground, #d4d4d4);
  }
}

// Animations
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.5; }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

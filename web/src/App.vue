<template>
  <div class="app-wrapper">
    <router-view v-slot="{ Component }">
      <transition 
        name="pixelate" 
        mode="out-in"
        @before-leave="onBeforeLeave"
        @after-enter="onAfterEnter"
      >
        <component :is="Component" :key="$route.path" />
      </transition>
    </router-view>
    
    <!-- Pixelation overlay for transition effect -->
    <div 
      class="pixelate-overlay" 
      :class="{ active: isTransitioning }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTheme } from './composables/useTheme';
import { useFont } from './composables/useFont';

// Initialize theme system
const theme = useTheme();

// Initialize font system
useFont();

// Transition state
const isTransitioning = ref(false);

const onBeforeLeave = () => {
  isTransitioning.value = true;
};

const onAfterEnter = () => {
  // Small delay to let the pixelation effect complete
  setTimeout(() => {
    isTransitioning.value = false;
  }, 100);
};

// Debug theme initialization
onMounted(() => {
  console.log('Theme initialized:', {
    currentTheme: theme.currentTheme.value.name,
    themeName: theme.currentThemeName.value,
    isAuto: theme.isAuto.value
  });
});
</script>

<style lang="scss">
// Global styles will be applied via CSS variables from theme
// Apply to body and html for full coverage
body, html {
  font-family: var(--font-family, monospace);
  font-size: var(--font-size, 14px);
  line-height: var(--font-line-height, 1.6);
  background-color: var(--color-background, #1e1e1e);
  color: var(--color-foreground, #d4d4d4);
  // Height constraints are set in app.scss - don't override with min-height
  transition: background-color 0.3s ease, color 0.3s ease;
}

#q-app {
  height: 100%;
  overflow: hidden;
}

// App wrapper for transition overlay
.app-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

// ============================================
// Pixelated CRT Transition Effect
// ============================================

// Pixelation overlay - creates the blocky CRT effect
.pixelate-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0;
  
  // Create a grid pattern for pixelation effect
  background: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 4px,
      rgba(0, 0, 0, 0.1) 4px,
      rgba(0, 0, 0, 0.1) 8px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 4px,
      rgba(0, 0, 0, 0.1) 4px,
      rgba(0, 0, 0, 0.1) 8px
    );
  
  transition: opacity 0.15s ease;
  
  &.active {
    opacity: 1;
  }
}

// Transition classes for the pixelated fade effect
.pixelate-enter-active,
.pixelate-leave-active {
  transition: all 0.6s ease;
}

// Leave transition - pixelate out
.pixelate-leave-active {
  animation: pixelateOut 0.6s ease forwards;
}

// Enter transition - pixelate in
.pixelate-enter-active {
  animation: pixelateIn 0.6s ease forwards;
}

.pixelate-enter-from {
  opacity: 0;
  filter: brightness(1.3) contrast(0.7);
  transform: scale(0.98);
}

.pixelate-leave-to {
  opacity: 0;
  filter: brightness(0) contrast(2);
  transform: scale(1.02);
}

// Keyframe animations for pixelated effect
@keyframes pixelateOut {
  0% {
    opacity: 1;
    filter: brightness(1) contrast(1) blur(0);
    transform: scale(1);
  }
  30% {
    filter: brightness(1.15) contrast(1.2) blur(0);
  }
  60% {
    filter: brightness(0.5) contrast(1.5) blur(1px);
    transform: scale(1.01);
  }
  100% {
    opacity: 0;
    filter: brightness(0) contrast(2) blur(2px);
    transform: scale(1.02);
  }
}

@keyframes pixelateIn {
  0% {
    opacity: 0;
    filter: brightness(1.5) contrast(0.5) blur(2px);
    transform: scale(0.98);
  }
  30% {
    opacity: 0.5;
    filter: brightness(1.3) contrast(0.7) blur(1px);
  }
  60% {
    filter: brightness(1.1) contrast(1.1) blur(0);
    transform: scale(0.99);
  }
  100% {
    opacity: 1;
    filter: brightness(1) contrast(1) blur(0);
    transform: scale(1);
  }
}

// Add scanline flicker during transition
.pixelate-leave-active::before,
.pixelate-enter-active::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 100;
  animation: scanlineFlicker 0.1s steps(2) infinite;
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 2px,
    rgba(0, 0, 0, 0.15) 2px,
    rgba(0, 0, 0, 0.15) 4px
  );
}

@keyframes scanlineFlicker {
  0% { opacity: 0.5; }
  50% { opacity: 0.3; }
  100% { opacity: 0.5; }
}
</style>

<template>
  <CRTFrame>
    <template #default>
      <router-view v-slot="{ Component }">
        <transition name="screen-pixelate" mode="out-in">
          <component :is="Component" :key="$route.path" />
        </transition>
      </router-view>
    </template>
  </CRTFrame>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { useFont } from './composables/useFont';
import CRTFrame from './components/CRTFrame.vue';

// Theme is initialized via boot/theme.ts and provided to the app
// Access via inject if needed for reactive references
const theme = inject('theme') as ReturnType<typeof import('./composables/useTheme').useTheme> | undefined;

// Initialize font system
useFont();

// Theme debug logging now happens in boot/theme.ts
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

// ============================================
// Screen Pixelate Transition (global)
// Applied only to the screen content, not the CRT frame
// ============================================

.screen-pixelate-enter-active,
.screen-pixelate-leave-active {
  transition: all 0.5s ease;
}

.screen-pixelate-leave-active {
  animation: screenOut 0.5s ease forwards;
}

.screen-pixelate-enter-active {
  animation: screenIn 0.5s ease forwards;
}

@keyframes screenOut {
  0% {
    opacity: 1;
    filter: brightness(1) contrast(1) blur(0);
  }
  30% {
    filter: brightness(1.1) contrast(1.1) blur(0);
  }
  70% {
    filter: brightness(0.4) contrast(1.3) blur(1px);
  }
  100% {
    opacity: 0;
    filter: brightness(0) contrast(1.5) blur(2px);
  }
}

@keyframes screenIn {
  0% {
    opacity: 0;
    filter: brightness(1.3) contrast(0.6) blur(2px);
  }
  30% {
    opacity: 0.6;
    filter: brightness(1.2) contrast(0.8) blur(1px);
  }
  70% {
    filter: brightness(1.05) contrast(1.05) blur(0);
  }
  100% {
    opacity: 1;
    filter: brightness(1) contrast(1) blur(0);
  }
}
</style>

<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useTheme } from './composables/useTheme';
import { useFont } from './composables/useFont';

// Initialize theme system
const theme = useTheme();

// Initialize font system
useFont();

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
</style>


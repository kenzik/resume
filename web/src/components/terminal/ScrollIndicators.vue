<template>
  <div 
    class="scroll-indicator scroll-indicator--top"
    :class="{ 'scroll-indicator--visible': showTop }"
    aria-hidden="true"
  />
  <div 
    class="scroll-indicator scroll-indicator--bottom"
    :class="{ 'scroll-indicator--visible': showBottom }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
/**
 * ScrollIndicators - Visual cues showing content extends beyond visible area
 * 
 * These gradient overlays appear at top/bottom edges when content is scrollable,
 * providing a subtle hint to users that they can scroll for more content.
 * 
 * Only used on mobile where scrollbar is hidden.
 */
defineProps<{
  showTop: boolean;
  showBottom: boolean;
}>();
</script>

<style lang="scss" scoped>
.scroll-indicator {
  position: absolute;
  left: 10px;
  right: 10px;
  height: 28px;
  pointer-events: none;
  z-index: 20; // Above content (10)
  
  // Default: hidden, show when content is scrollable
  opacity: 0;
  transition: opacity 0.25s ease;
  
  &.scroll-indicator--visible {
    opacity: 1;
  }
}

.scroll-indicator--top {
  top: 10px;
  background: linear-gradient(
    to bottom,
    rgba(0, 150, 120, 0.25) 0%,
    rgba(0, 100, 80, 0.12) 50%,
    transparent 100%
  );
  border-radius: 6px 6px 0 0;
  
  // Subtle top accent line
  border-top: 2px solid rgba(35, 209, 139, 0.35);
}

.scroll-indicator--bottom {
  bottom: 10px;
  background: linear-gradient(
    to top,
    rgba(0, 150, 120, 0.25) 0%,
    rgba(0, 100, 80, 0.12) 50%,
    transparent 100%
  );
  border-radius: 0 0 6px 6px;
  
  // Subtle bottom accent line
  border-bottom: 2px solid rgba(35, 209, 139, 0.35);
}
</style>


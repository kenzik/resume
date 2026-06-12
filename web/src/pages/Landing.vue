<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="landing-page">
        <div class="crt-container" :class="animationClass">
          <!-- The "screen" that powers on -->
          <div class="crt-screen">
            <!-- Horizontal line that expands -->
            <div class="power-line"></div>
            
            <!-- Phosphor glow overlay -->
            <div class="phosphor-glow"></div>
            
            <!-- Flashing cursor (appears after power-on) -->
            <div class="startup-cursor">█</div>
          </div>
          <!-- Note: Scanlines and vignette are provided by CRTFrame.vue wrapper -->
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMeta, useTimeout } from 'quasar';
import { BOOT_TIMINGS } from '../constants';

useMeta({
  title: 'Dave Kenzik - Resume',
  meta: {
    description: { name: 'description', content: 'Dave Kenzik - Cloud-Native Architect & Senior Technical Leader' },
  }
});

const router = useRouter();
const animationClass = ref('power-off');

// Need separate useTimeout instances for concurrent timers (each instance supports only 1 timer)
const { registerTimeout: setAnimationStart } = useTimeout();
const { registerTimeout: setPoweredOn } = useTimeout();
const { registerTimeout: setRedirect } = useTimeout();

onMounted(() => {
  // Start the power-on animation after a brief delay
  setAnimationStart(() => {
    animationClass.value = 'powering-on';
  }, 100);

  // Transition to "powered on" state after animation completes (~3s)
  setPoweredOn(() => {
    animationClass.value = 'powered-on';
  }, BOOT_TIMINGS.poweredOnMs);

  // Redirect to /resume after power-on delay (env-overridable via VITE_POWER_ON_DELAY_MS)
  setRedirect(() => {
    router.push('/resume');
  }, BOOT_TIMINGS.redirectMs);
});
</script>

<style lang="scss" scoped>
.landing-page {
  padding: 0;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.crt-container {
  position: relative;
  width: 100%;
  height: 100%;
  // Darker "off" background - blacker than the normal terminal
  background-color: #0a0a0a;
  border-radius: 12px;
  overflow: hidden;
  
  // CRT screen glow (inherited from Terminal.vue style)
  box-shadow: 
    inset 0 0 100px rgba(0, 20, 20, 0.3),
    inset 0 0 50px rgba(0, 150, 120, 0.02);
  
  // Transition for the background color fade
  transition: background-color 1s ease-out;
}

.crt-screen {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

// The horizontal line that expands vertically
.power-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    transparent 49.5%,
    var(--terminal-success, #23d18b) 49.5%,
    var(--terminal-success, #23d18b) 50.5%,
    transparent 50.5%,
    transparent 100%
  );
  transform: scaleY(0);
  opacity: 0;
}

// Phosphor glow effect
.phosphor-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
    ellipse at center,
    rgba(35, 209, 139, 0.15) 0%,
    rgba(35, 209, 139, 0.05) 40%,
    transparent 70%
  );
  opacity: 0;
}

// Flashing cursor - appears in top-left after power-on
.startup-cursor {
  position: absolute;
  top: var(--spacing-padding, 20px);
  left: var(--spacing-padding, 20px);
  color: var(--color-cursor, #aeafad);
  font-family: var(--font-family, monospace);
  font-size: var(--font-size, 14px);
  line-height: var(--font-line-height, 1.6);
  opacity: 0;
  z-index: 20;
}

// Note: Scanlines and vignette are provided by CRTFrame.vue wrapper

// ============================================
// Animation States
// ============================================

// Initial "off" state
.power-off {
  .power-line {
    transform: scaleY(0);
    opacity: 0;
  }
  
  .phosphor-glow {
    opacity: 0;
  }
}

// Power-on animation sequence
.powering-on {
  // Phase 1: Line appears (0-0.5s)
  .power-line {
    animation: powerLineAppear var(--crt-line-ignite, 0.5s) ease-out forwards,
               powerLineExpand var(--crt-bloom, 2s) ease-out 0.5s forwards,
               powerLineFlicker var(--crt-line-flicker, 0.1s) ease-in-out 0.2s 3;
  }
  
  // Phase 2: Phosphor glow builds up
  .phosphor-glow {
    animation: phosphorWarmup var(--crt-phosphor-warmup, 2s) ease-out 0.3s forwards;
  }
  
  // Phase 3: Screen brightness increases
  .crt-screen {
    animation: screenWarmup var(--crt-screen-warmup, 2s) ease-out 0.5s forwards;
  }
}

// Powered on state - terminal "on" color
.powered-on {
  background-color: var(--color-background, #1e1e1e);
  
  .power-line {
    transform: scaleY(1);
    opacity: 1;
    background: var(--color-background, #1e1e1e);
  }
  
  .phosphor-glow {
    opacity: 0.1;
  }
  
  .crt-screen {
    filter: brightness(1) saturate(1);
  }
  
  // Show blinking cursor after power-on
  .startup-cursor {
    opacity: 1;
    animation: cursorBlink 1s infinite;
  }
}

// Cursor blink animation (same as Terminal.vue)
@keyframes cursorBlink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

// ============================================
// Keyframe Animations
// ============================================

// Line appears as a thin bright horizontal stripe
@keyframes powerLineAppear {
  0% {
    transform: scaleY(0);
    opacity: 0;
    filter: brightness(0);
  }
  50% {
    transform: scaleY(0.005);
    opacity: 1;
    filter: brightness(2);
  }
  100% {
    transform: scaleY(0.01);
    opacity: 1;
    filter: brightness(1.5);
  }
}

// Line expands to fill the screen
@keyframes powerLineExpand {
  0% {
    transform: scaleY(0.01);
    background: linear-gradient(
      to bottom,
      transparent 0%,
      transparent 49%,
      var(--terminal-success, #23d18b) 49%,
      var(--terminal-success, #23d18b) 51%,
      transparent 51%,
      transparent 100%
    );
  }
  100% {
    transform: scaleY(1);
    background: linear-gradient(
      to bottom,
      var(--color-background, #1e1e1e) 0%,
      var(--color-background, #1e1e1e) 100%
    );
  }
}

// Subtle flicker during power-on
@keyframes powerLineFlicker {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

// Phosphor glow warmup
@keyframes phosphorWarmup {
  0% {
    opacity: 0;
  }
  30% {
    opacity: 0.8;
  }
  100% {
    opacity: 0.3;
  }
}

// Overall screen brightness warmup
@keyframes screenWarmup {
  0% {
    filter: brightness(0.5) saturate(0.5);
  }
  50% {
    filter: brightness(1.2) saturate(1.2);
  }
  100% {
    filter: brightness(1) saturate(1);
  }
}

// =============================================================================
// Mobile Responsive Styles
// =============================================================================
@media (max-width: 768px) {
  .crt-container {
    border-radius: 8px;
  }
  
  .startup-cursor {
    top: 14px;
    left: 14px;
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .crt-container {
    border-radius: 6px;
  }
  
  .startup-cursor {
    top: 10px;
    left: 10px;
    font-size: 14px;
  }
}
</style>


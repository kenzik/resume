<template>
  <div class="crt-frame">
    <!-- Curved bezel layers -->
    <div class="crt-bezel-outer"></div>
    <div class="crt-bezel-inner"></div>
    <div class="crt-glass-curve"></div>
    
    <!-- Static CRT effects that don't transition -->
    <div class="crt-scanlines"></div>
    <div class="crt-vignette"></div>
    
    <!-- Screen content area -->
    <div class="crt-screen">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// Static frame component - no logic needed
</script>

<style lang="scss" scoped>
.crt-frame {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  
  // Subtle 3D perspective for curved screen effect
  perspective: 1000px;
  transform-style: preserve-3d;
}

// Outer bezel - dark frame with curved edges
.crt-bezel-outer {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border-radius: 20px;
  pointer-events: none;
  z-index: 50;
  
  // Layered shadows to create depth and curvature illusion
  box-shadow:
    // Inner edge highlight (simulates curved glass edge catching light)
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    inset 1px 0 0 rgba(255, 255, 255, 0.02),
    // Curved edge shadows (creates the barrel effect)
    inset 4px 4px 8px rgba(0, 0, 0, 0.4),
    inset -4px -4px 8px rgba(0, 0, 0, 0.4),
    inset 8px 8px 16px rgba(0, 0, 0, 0.2),
    inset -8px -8px 16px rgba(0, 0, 0, 0.2);
}

// Inner bezel - the recessed area where screen sits
.crt-bezel-inner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 16px;
  pointer-events: none;
  z-index: 51;
  
  // Create the recessed screen area effect
  box-shadow:
    // Top-left shadow (light source from top-left)
    inset 3px 3px 6px rgba(0, 0, 0, 0.5),
    inset 1px 1px 2px rgba(0, 0, 0, 0.3),
    // Bottom-right highlight
    inset -2px -2px 4px rgba(60, 60, 60, 0.15),
    // Deeper inner shadow for depth
    inset 6px 6px 12px rgba(0, 0, 0, 0.3),
    inset -3px -3px 6px rgba(40, 40, 40, 0.1);
}

// Glass curve effect - simulates the convex CRT glass
.crt-glass-curve {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 16px;
  pointer-events: none;
  z-index: 52;
  
  // Gradient overlay to simulate curved glass reflection
  background: 
    // Top-left highlight (main reflection)
    radial-gradient(
      ellipse 120% 80% at 20% 15%,
      rgba(255, 255, 255, 0.04) 0%,
      transparent 50%
    ),
    // Subtle center bulge highlight
    radial-gradient(
      ellipse 80% 60% at 50% 50%,
      rgba(255, 255, 255, 0.01) 0%,
      transparent 70%
    ),
    // Edge darkening (barrel distortion simulation)
    radial-gradient(
      ellipse 100% 100% at 50% 50%,
      transparent 60%,
      rgba(0, 0, 0, 0.15) 100%
    );
}

// Scanlines overlay - stays static during transitions
.crt-scanlines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 100;
  border-radius: 16px;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
}

// Vignette overlay - enhanced for curved screen effect
.crt-vignette {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 99;
  border-radius: 16px;
  
  // Stronger vignette at edges to enhance curved look
  background: radial-gradient(
    ellipse 85% 85% at 50% 50%,
    transparent 40%,
    rgba(0, 0, 0, 0.25) 75%,
    rgba(0, 0, 0, 0.5) 100%
  );
}

// Screen content area
.crt-screen {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 1;
  border-radius: 16px;
  overflow: hidden;
  
  // Subtle transform to enhance the curved glass illusion
  transform: translateZ(-2px);
}

// =============================================================================
// Responsive adjustments for mobile
// =============================================================================
@media (max-width: 768px) {
  .crt-bezel-outer {
    top: -3px;
    left: -3px;
    right: -3px;
    bottom: -3px;
    border-radius: 14px;
    
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.02),
      inset 3px 3px 6px rgba(0, 0, 0, 0.35),
      inset -3px -3px 6px rgba(0, 0, 0, 0.35);
  }
  
  .crt-bezel-inner {
    border-radius: 10px;
    
    box-shadow:
      inset 2px 2px 4px rgba(0, 0, 0, 0.4),
      inset -1px -1px 3px rgba(50, 50, 50, 0.1);
  }
  
  .crt-glass-curve {
    border-radius: 10px;
  }
  
  .crt-scanlines,
  .crt-vignette,
  .crt-screen {
    border-radius: 10px;
  }
}

@media (max-width: 480px) {
  .crt-bezel-outer {
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border-radius: 10px;
    
    box-shadow:
      inset 2px 2px 4px rgba(0, 0, 0, 0.3),
      inset -2px -2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .crt-bezel-inner {
    border-radius: 8px;
    
    box-shadow:
      inset 1px 1px 3px rgba(0, 0, 0, 0.35),
      inset -1px -1px 2px rgba(50, 50, 50, 0.08);
  }
  
  .crt-glass-curve {
    border-radius: 8px;
  }
  
  .crt-scanlines,
  .crt-vignette,
  .crt-screen {
    border-radius: 8px;
  }
}
</style>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div 
        v-if="modelValue" 
        class="doom-modal-overlay" 
        @click.self="handleResume" 
        tabindex="-1"
      >
        <div 
          class="doom-modal" 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="doom-modal-title" 
          tabindex="-1"
        >
          <div class="modal-border top" tabindex="-1"></div>
          <div class="modal-content" tabindex="-1">
            <!-- DOOM ASCII Logo -->
            <pre class="doom-logo">
██████╗  ██████╗  ██████╗ ███╗   ███╗
██╔══██╗██╔═══██╗██╔═══██╗████╗ ████║
██║  ██║██║   ██║██║   ██║██╔████╔██║
██║  ██║██║   ██║██║   ██║██║╚██╔╝██║
██████╔╝╚██████╔╝╚██████╔╝██║ ╚═╝ ██║
╚═════╝  ╚═════╝  ╚═════╝ ╚═╝     ╚═╝</pre>
            
            <h2 id="doom-modal-title" class="modal-title">
              PAUSED
            </h2>
            
            <div class="modal-actions">
              <button 
                ref="resumeButtonRef"
                class="modal-btn modal-btn-resume" 
                @click="handleResume"
              >
                [R] Resume Game
              </button>
              <button 
                class="modal-btn modal-btn-sound" 
                @click="handleToggleSound"
              >
                [S] Sound: {{ audioEnabled ? 'ON' : 'OFF' }}
              </button>
              <button 
                ref="quitButtonRef"
                class="modal-btn modal-btn-quit" 
                @click="handleQuit"
              >
                [Q] Quit to Terminal
              </button>
            </div>
            
            <p class="modal-hint">
              Press ESC to resume
            </p>
          </div>
          <div class="modal-border bottom" tabindex="-1"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useTimeout } from 'quasar';

const props = defineProps<{
  modelValue: boolean;
  audioEnabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'resume'): void;
  (e: 'quit'): void;
  (e: 'toggleSound'): void;
}>();

// Quasar's useTimeout auto-cleans up on unmount
const { registerTimeout, removeTimeout } = useTimeout();

const resumeButtonRef = ref<HTMLButtonElement | null>(null);
const quitButtonRef = ref<HTMLButtonElement | null>(null);
const acceptingInput = ref(false);

const handleResume = () => {
  emit('update:modelValue', false);
  emit('resume');
};

const handleQuit = () => {
  emit('update:modelValue', false);
  emit('quit');
};

const handleToggleSound = () => {
  emit('toggleSound');
};

// Keyboard handler for shortcuts and focus trap
const handleKeyDown = (e: KeyboardEvent) => {
  if (!props.modelValue) return;
  
  const key = e.key.toLowerCase();
  
  // Focus trap - keep Tab within the modal
  if (e.key === 'Tab') {
    e.preventDefault();
    const activeEl = document.activeElement;
    if (e.shiftKey) {
      // Shift+Tab: go backwards
      if (activeEl === resumeButtonRef.value) {
        quitButtonRef.value?.focus();
      } else {
        resumeButtonRef.value?.focus();
      }
    } else {
      // Tab: go forwards
      if (activeEl === quitButtonRef.value) {
        resumeButtonRef.value?.focus();
      } else if (activeEl) {
        (activeEl.nextElementSibling as HTMLElement)?.focus?.();
      }
    }
    return;
  }
  
  if (!acceptingInput.value) return;
  
  if (key === 'r' || key === 'escape') {
    e.preventDefault();
    handleResume();
  } else if (key === 's') {
    e.preventDefault();
    handleToggleSound();
  } else if (key === 'q') {
    e.preventDefault();
    handleQuit();
  }
};

// Focus management - delay input acceptance
watch(() => props.modelValue, (isOpen) => {
  removeTimeout();
  
  if (isOpen) {
    acceptingInput.value = false;
    registerTimeout(() => {
      resumeButtonRef.value?.focus();
      acceptingInput.value = true;
    }, 100);
  } else {
    acceptingInput.value = false;
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
.doom-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.doom-modal {
  background: var(--color-background, #1e1e1e);
  border: 2px solid #b22222;
  border-radius: 4px;
  min-width: 360px;
  max-width: 90vw;
  font-family: var(--font-family, monospace);
  box-shadow: 
    0 0 60px rgba(178, 34, 34, 0.3),
    0 0 20px rgba(178, 34, 34, 0.2);
  
  // Subtle DOOM-red glow
  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(
      45deg,
      transparent 40%,
      rgba(178, 34, 34, 0.05) 50%,
      transparent 60%
    );
    pointer-events: none;
    border-radius: 4px;
  }
}

.modal-border {
  height: 4px;
  background: linear-gradient(
    90deg,
    #333 0%,
    #b22222 30%,
    #ff4444 50%,
    #b22222 70%,
    #333 100%
  );
  
  &.top {
    border-radius: 2px 2px 0 0;
  }
  
  &.bottom {
    border-radius: 0 0 2px 2px;
  }
}

.modal-content {
  padding: 24px 32px;
  text-align: center;
}

.doom-logo {
  font-size: 7px;
  line-height: 1;
  color: #b22222;
  margin-bottom: 1rem;
  text-shadow: 0 0 10px rgba(178, 34, 34, 0.5);
  
  @media (min-width: 480px) {
    font-size: 9px;
  }
}

.modal-title {
  font-size: 1.3em;
  font-weight: bold;
  color: #ff4444;
  margin: 0 0 20px 0;
  letter-spacing: 0.2em;
  text-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.modal-btn {
  font-family: var(--font-family, monospace);
  font-size: 0.95em;
  padding: 10px 24px;
  border: 1px solid var(--color-brightBlack, #444);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: rgba(0, 0, 0, 0.3);
  text-align: left;
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px #b22222;
  }
  
  &:hover {
    background: rgba(178, 34, 34, 0.15);
    transform: translateX(4px);
  }
}

.modal-btn-resume {
  color: var(--terminal-success, #23d18b);
  border-color: var(--terminal-success, #23d18b);
  
  &:hover {
    background: rgba(35, 209, 139, 0.1);
  }
}

.modal-btn-sound {
  color: var(--terminal-info, #29b8db);
  border-color: var(--terminal-info, #29b8db);
  
  &:hover {
    background: rgba(41, 184, 219, 0.1);
  }
}

.modal-btn-quit {
  color: #ff4444;
  border-color: #b22222;
  
  &:hover {
    background: rgba(178, 34, 34, 0.15);
  }
}

.modal-hint {
  font-size: 0.8em;
  color: var(--color-brightBlack, #666);
  margin: 0;
  opacity: 0.7;
}

// Transition
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .doom-modal,
.modal-fade-leave-active .doom-modal {
  transition: transform 0.2s ease;
}

.modal-fade-enter-from .doom-modal,
.modal-fade-leave-to .doom-modal {
  transform: scale(0.95);
}

// Mobile adjustments
@media (max-width: 480px) {
  .doom-modal {
    min-width: 300px;
  }
  
  .modal-content {
    padding: 20px 24px;
  }
  
  .doom-logo {
    font-size: 6px;
  }
  
  .modal-title {
    font-size: 1.1em;
  }
  
  .modal-btn {
    padding: 12px 20px;
  }
}
</style>


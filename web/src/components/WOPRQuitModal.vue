<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="wopr-modal-overlay" @click.self="handleNo" tabindex="-1">
        <div class="wopr-modal" role="dialog" aria-modal="true" aria-labelledby="wopr-modal-title" tabindex="-1">
          <div class="modal-border top" tabindex="-1"></div>
          <div class="modal-content" tabindex="-1">
            <h2 id="wopr-modal-title" class="modal-title">
              DISCONNECT FROM WOPR?
            </h2>
            <p class="modal-subtitle">
              Connection will be terminated.
            </p>
            <div class="modal-actions">
              <button
                ref="yesButtonRef"
                class="modal-btn modal-btn-yes"
                @click="handleYes"
              >
                [Y]es, disconnect
              </button>
              <button
                ref="noButtonRef"
                class="modal-btn modal-btn-no"
                @click="handleNo"
              >
                [N]o, stay connected
              </button>
            </div>
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
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

// Quasar's useTimeout auto-cleans up on unmount
const { registerTimeout, removeTimeout } = useTimeout();

const yesButtonRef = ref<HTMLButtonElement | null>(null);
const noButtonRef = ref<HTMLButtonElement | null>(null);
const acceptingInput = ref(false);

const handleYes = () => {
  emit('update:modelValue', false);
  emit('confirm');
};

const handleNo = () => {
  emit('update:modelValue', false);
  emit('cancel');
};

// Keyboard handler for Y/N keys and focus trap
const handleKeyDown = (e: KeyboardEvent) => {
  if (!props.modelValue) return;

  const key = e.key.toLowerCase();

  // Focus trap - keep Tab within the modal
  if (e.key === 'Tab') {
    e.preventDefault();
    const activeEl = document.activeElement;
    if (e.shiftKey) {
      // Shift+Tab: go backwards
      if (activeEl === yesButtonRef.value) {
        noButtonRef.value?.focus();
      } else {
        yesButtonRef.value?.focus();
      }
    } else {
      // Tab: go forwards
      if (activeEl === noButtonRef.value) {
        yesButtonRef.value?.focus();
      } else {
        noButtonRef.value?.focus();
      }
    }
    return;
  }

  if (!acceptingInput.value) return;

  if (key === 'y') {
    e.preventDefault();
    handleYes();
  } else if (key === 'n' || key === 'escape') {
    e.preventDefault();
    handleNo();
  }
  // Enter key is handled natively by the focused button
};

// Focus management - delay input acceptance to prevent Enter key from quit command triggering immediate confirm
watch(() => props.modelValue, (isOpen) => {
  // Clear any pending timer
  removeTimeout();

  if (isOpen) {
    acceptingInput.value = false;
    // Focus the No button when modal opens (safer default)
    registerTimeout(() => {
      noButtonRef.value?.focus();
      // Start accepting keyboard input after the Enter key from "quit" command has passed
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
  // useTimeout auto-cleans up, but we remove listener manually
});
</script>

<style lang="scss" scoped>
// WOPR green aesthetic
$wopr-green: #33ff33;
$wopr-green-dim: #1a991a;
$wopr-green-glow: rgba(51, 255, 51, 0.3);
$wopr-red: #ff3333;
$wopr-red-glow: rgba(255, 51, 51, 0.3);

.wopr-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.wopr-modal {
  background: #0a0a0a;
  border: 2px solid $wopr-green-dim;
  border-radius: 4px;
  min-width: 320px;
  max-width: 90vw;
  font-family: var(--font-family, monospace);
  box-shadow:
    0 0 40px rgba(0, 0, 0, 0.5),
    0 0 20px $wopr-green-glow;

  // Subtle CRT glow
  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(
      45deg,
      transparent 40%,
      $wopr-green-glow 50%,
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
    $wopr-green-dim 0%,
    $wopr-green 50%,
    $wopr-green-dim 100%
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

.modal-title {
  font-size: 1.1em;
  font-weight: bold;
  color: $wopr-green;
  text-shadow: 0 0 10px $wopr-green-glow;
  margin: 0 0 8px 0;
  line-height: 1.4;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.modal-subtitle {
  font-size: 0.9em;
  color: $wopr-green-dim;
  opacity: 0.8;
  margin: 0 0 24px 0;
  text-transform: uppercase;
}

.modal-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.modal-btn {
  font-family: var(--font-family, monospace);
  font-size: 0.95em;
  padding: 8px 20px;
  border: 1px solid $wopr-green-dim;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: transparent;
  text-transform: uppercase;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px $wopr-green;
  }

  &:hover {
    transform: translateY(-1px);
  }
}

.modal-btn-yes {
  color: $wopr-red;
  border-color: $wopr-red;
  text-shadow: 0 0 5px $wopr-red-glow;

  &:hover {
    background: rgba(255, 51, 51, 0.1);
  }
}

.modal-btn-no {
  color: $wopr-green;
  border-color: $wopr-green;
  text-shadow: 0 0 5px $wopr-green-glow;

  &:hover {
    background: rgba(51, 255, 51, 0.1);
  }
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

.modal-fade-enter-active .wopr-modal,
.modal-fade-leave-active .wopr-modal {
  transition: transform 0.2s ease;
}

.modal-fade-enter-from .wopr-modal,
.modal-fade-leave-to .wopr-modal {
  transform: scale(0.95);
}

// Mobile adjustments
@media (max-width: 480px) {
  .wopr-modal {
    min-width: 280px;
  }

  .modal-content {
    padding: 20px 24px;
  }

  .modal-title {
    font-size: 1em;
  }

  .modal-actions {
    flex-direction: column;
    gap: 12px;
  }

  .modal-btn {
    width: 100%;
  }
}
</style>

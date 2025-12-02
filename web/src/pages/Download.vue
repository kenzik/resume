<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="download-page">
        <div class="download-container">
          <div class="download-content">
            <!-- Download Complete State -->
            <template v-if="downloadComplete">
              <div class="download-icon success">✓</div>
              <h1 class="download-title">Download Started</h1>
              <p class="download-format">{{ formatLabel }} format</p>
              <p class="download-fallback">
                If the download didn't start,
                <a :href="downloadUrl" :download="filename">click here to try again</a>.
              </p>
              <div class="download-formats">
                <p>Other formats:</p>
                <div class="format-links">
                  <a 
                    v-for="fmt in otherFormats" 
                    :key="fmt.ext"
                    :href="`/resume/download/${fmt.ext}`"
                    class="format-link"
                  >
                    {{ fmt.label }}
                  </a>
                </div>
              </div>
            </template>
            
            <!-- Loading State -->
            <template v-else-if="!error">
              <div class="download-icon">⬇</div>
              <h1 class="download-title">Downloading Resume</h1>
              <p class="download-format">{{ formatLabel }} format</p>
              <q-spinner-dots color="positive" size="40px" class="q-my-md" />
              <p class="download-fallback">
                If the download doesn't start automatically,
                <a :href="downloadUrl" :download="filename">click here</a>.
              </p>
            </template>
            
            <!-- Error State -->
            <template v-else>
              <div class="download-icon error">✕</div>
              <h1 class="download-title">Invalid Format</h1>
              <p class="download-error">{{ error }}</p>
              <div class="download-formats">
                <p>Available formats:</p>
                <div class="format-links">
                  <a 
                    v-for="fmt in validFormats" 
                    :key="fmt.ext"
                    :href="`/resume/download/${fmt.ext}`"
                    class="format-link"
                  >
                    {{ fmt.label }}
                  </a>
                </div>
              </div>
            </template>
            
            <!-- Back Link -->
            <router-link to="/resume" class="back-link">
              ← Back to Terminal
            </router-link>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useMeta } from 'quasar';

const route = useRoute();

// Valid formats configuration
const validFormats = [
  { ext: 'pdf', label: 'PDF', mime: 'application/pdf' },
  { ext: 'docx', label: 'Word (DOCX)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { ext: 'md', label: 'Markdown', mime: 'text/markdown' },
  { ext: 'rtf', label: 'Rich Text (RTF)', mime: 'application/rtf' },
];

// Resume filename base from env (default: kenzik-resume)
const filenameBase = import.meta.env.VITE_RESUME_FILENAME_BASE || 'kenzik-resume';

// Get format from route param (default: pdf)
const format = computed(() => {
  const param = route.params.format as string;
  return param?.toLowerCase() || 'pdf';
});

// Validate format
const formatConfig = computed(() => {
  return validFormats.find(f => f.ext === format.value);
});

// Other formats (for showing alternatives after download)
const otherFormats = computed(() => {
  return validFormats.filter(f => f.ext !== format.value);
});

const error = ref<string | null>(null);
const downloadComplete = ref(false);

// Computed properties for download
const filename = computed(() => `${filenameBase}.${format.value}`);
const downloadUrl = computed(() => `/downloads/${filename.value}`);
const formatLabel = computed(() => formatConfig.value?.label || format.value.toUpperCase());

// Dynamic meta tags based on format
useMeta(() => ({
  title: `Download Resume - ${formatLabel.value}`,
  meta: {
    robots: { name: 'robots', content: 'noindex' } // Don't index download pages
  }
}));

// Trigger download on mount
onMounted(() => {
  if (!formatConfig.value) {
    error.value = `"${format.value}" is not a valid format.`;
    return;
  }
  
  // Wait for page transition to complete before triggering download
  setTimeout(() => {
    triggerDownload();
  }, 2000);
});

function triggerDownload() {
  // Create a temporary link and click it
  const link = document.createElement('a');
  link.href = downloadUrl.value;
  link.download = filename.value;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Mark download as complete after a brief moment
  setTimeout(() => {
    downloadComplete.value = true;
  }, 300);
}
</script>

<style lang="scss" scoped>
.download-page {
  padding: 0;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.download-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: var(--color-background, #1e1e1e);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  // CRT glow effect (scanlines and vignette provided by CRTFrame.vue wrapper)
  box-shadow: 
    inset 0 0 100px rgba(0, 20, 20, 0.3),
    inset 0 0 50px rgba(0, 150, 120, 0.02);
}

.download-content {
  position: relative;
  z-index: 10;
  text-align: center;
  padding: 2rem;
  font-family: var(--font-family, monospace);
}

.download-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  animation: bounce 1s ease-in-out infinite;
  
  &.error {
    color: var(--terminal-error, #f14c4c);
    animation: none;
  }
  
  &.success {
    color: var(--terminal-success, #23d18b);
    animation: none;
  }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.download-title {
  color: var(--terminal-success, #23d18b);
  font-size: 1.5rem;
  font-weight: normal;
  margin: 0 0 0.5rem 0;
}

.download-format {
  color: var(--terminal-info, #29b8db);
  font-size: 1rem;
  margin: 0 0 1.5rem 0;
}

.download-fallback {
  color: var(--color-foreground, #d4d4d4);
  font-size: 0.9rem;
  
  a {
    color: var(--terminal-info, #29b8db);
    text-decoration: underline;
    
    &:hover {
      color: var(--color-brightYellow, #f5f543);
    }
  }
}

.download-error {
  color: var(--terminal-error, #f14c4c);
  margin: 0 0 1.5rem 0;
}

.download-formats {
  margin-bottom: 1.5rem;
  
  p {
    color: var(--color-foreground, #d4d4d4);
    margin: 0 0 0.75rem 0;
  }
}

.format-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.format-link {
  color: var(--terminal-info, #29b8db);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-brightBlack, #666);
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: var(--color-brightBlack, #333);
    border-color: var(--terminal-info, #29b8db);
  }
}

.back-link {
  display: inline-block;
  margin-top: 2rem;
  color: var(--terminal-prompt, #929292);
  text-decoration: none;
  font-size: 0.9rem;
  
  &:hover {
    color: var(--terminal-success, #23d18b);
  }
}

// Mobile responsive
@media (max-width: 768px) {
  .download-container {
    border-radius: 8px;
  }
  
  .download-content {
    padding: 1.5rem;
  }
  
  .download-icon {
    font-size: 2.5rem;
  }
  
  .download-title {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .download-container {
    border-radius: 6px;
  }
  
  .download-content {
    padding: 1rem;
  }
  
  .download-icon {
    font-size: 2rem;
  }
  
  .download-title {
    font-size: 1.1rem;
  }
  
  .format-links {
    flex-direction: column;
  }
}
</style>


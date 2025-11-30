<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="terminal-page">
        <Terminal />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import Terminal from '../components/Terminal.vue';

useMeta({
  title: 'Dave Kenzik - Resume',
  meta: {
    description: { name: 'description', content: 'Interactive terminal-style resume for Dave Kenzik - Cloud-Native Architect, AI Infrastructure & Strategy, Full-Stack Engineer' },
    ogTitle: { property: 'og:title', content: 'Dave Kenzik - Terminal Resume' },
    ogDescription: { property: 'og:description', content: 'Explore my resume through an interactive retro terminal interface' },
    ogImage: { property: 'og:image', content: '/og-image.png' },
    ogType: { property: 'og:type', content: 'website' },
  }
});
</script>

<style lang="scss" scoped>
.terminal-page {
  padding: 0;
  height: 100%;      // Use 100% to respect parent's constrained height (not 100vh)
  min-height: 0;     // Allow flex shrinking
  display: flex;
  flex-direction: column;
  overflow: hidden;  // Prevent content from overflowing the CRT bezel
}
</style>


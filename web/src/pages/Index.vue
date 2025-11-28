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
import Terminal from '../components/Terminal.vue';
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


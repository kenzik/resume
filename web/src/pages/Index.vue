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
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>


<template>
  <div class="terminal-prompt">
    <span class="prompt-user">{{ user }}@{{ host }}</span>
    <span class="prompt-separator">:</span>
    <span class="prompt-path">{{ path }}</span>
    <span class="prompt-separator">$</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  user?: string;
  host?: string;
  path?: string;
}>(), {
  user: 'dave',
  host: 'resume',
  path: '~'
});
</script>

<style lang="scss" scoped>
.terminal-prompt {
  display: inline-flex;
  align-items: center;
  margin-right: 8px;
  flex-shrink: 0;
  
  .prompt-user {
    color: var(--terminal-prompt, #0dbc79);
    font-weight: 500;
  }
  
  .prompt-separator {
    color: var(--color-foreground, #d4d4d4);
    margin: 0 2px;
  }
  
  .prompt-path {
    color: var(--terminal-info, #29b8db);
  }
}
</style>


/**
 * Core Commands
 * 
 * Basic terminal commands: help, clear, history, motd
 */

import type { CommandRegistry } from './types';

export const coreCommands: CommandRegistry = {
  help: {
    handler: async () => {
      // Dynamically import to avoid circular dependency
      const { generateHelpText } = await import('./index');
      return generateHelpText();
    },
    description: 'Show available commands',
  },

  clear: {
    handler: async () => {
      // Handled by Terminal.vue
      return '';
    },
    description: 'Clear the terminal screen',
  },

  history: {
    handler: async () => {
      // Handled by Terminal.vue (needs access to command history state)
      return '';
    },
    description: 'Show command history',
  },

  motd: {
    handler: async () => {
      const { useMotd } = await import('../composables/useMotd');
      const { getMotd, loadMotd } = useMotd();
      await loadMotd();
      return getMotd();
    },
    description: 'Show message of the day',
  },
};


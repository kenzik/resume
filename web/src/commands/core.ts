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
    description: 'View the command reference',
  },

  clear: {
    handler: async () => {
      // Handled by Terminal.vue
      return '';
    },
    description: 'Clear the terminal canvas',
  },

  history: {
    handler: async () => {
      // Handled by Terminal.vue (needs access to command history state)
      return '';
    },
    description: 'Browse your command history',
  },

  motd: {
    handler: async () => {
      const { useMotd } = await import('../composables/useMotd');
      const { getMotd, loadMotd } = useMotd();
      await loadMotd();
      return getMotd();
    },
    description: 'See the welcome message again',
  },
};


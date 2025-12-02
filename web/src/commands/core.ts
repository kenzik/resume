/**
 * Core Commands
 * 
 * Basic terminal commands: help, clear, history, motd
 */

import type { CommandDefinition, CommandRegistry } from './types';

export const coreCommands: CommandRegistry = {
  help: {
    handler: async () => {
      return `#### Available commands

- **help** - Show this help message
- **clear** - Clear the terminal
- **history** - Show command history
- **resume** - Display full resume
- **skills** - List technical skills
- **experience** - Show work experience
- **experience [company]** - Show experience for specific company
- **motd** - Show message of the day
- **font** - Show available fonts or change font

#### Pipe commands (use with \`|\`)

- **more** - Page through output (e.g., \`resume | more\`)
- **grep <pattern>** - Filter lines matching pattern
- **head [n]** - Show first n lines (default: 10)
- **tail [n]** - Show last n lines (default: 10)

Commands support regex patterns and are case-insensitive.

#### Examples:

- \`experience /five9/i\` - Find experience matching "five9"
- \`skills /gcp/i\` - Find skills matching "gcp"
- \`resume | more\` - Page through full resume
- \`download pdf\` - Download resume as PDF`;
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


import { marked } from 'marked';

export interface CommandResult {
  output: string;
  error?: boolean;
}

/**
 * Command system composable
 * Handles command execution with regex and case-insensitive matching
 */
export function useCommands() {
  const commands: Record<string, (args: string[]) => Promise<string>> = {
    help: async () => {
      return `**Available commands:**

- **help** - Show this help message
- **clear** - Clear the terminal
- **resume** - Display full resume
- **skills** - List technical skills
- **experience** - Show work experience
- **experience [company]** - Show experience for specific company
- **contact** - Display contact information
- **motd** - Show message of the day
- **theme** - List and change themes
- **font** - Show available fonts or change font

Commands support regex patterns and are case-insensitive.

**Examples:**

- \`experience /five9/i\` - Find experience matching "five9"
- \`skills /gcp/i\` - Find skills matching "gcp"`;
    },

    clear: async () => {
      // This will be handled by the component
      return '';
    },

    resume: async () => {
      const { useResume } = await import('./useResume');
      const resume = useResume();
      await resume.loadResume();
      if (resume.error.value) {
        return `Error: ${resume.error.value}`;
      }
      return resume.getFullResume();
    },

    skills: async () => {
      const { useResume } = await import('./useResume');
      const resume = useResume();
      await resume.loadResume();
      if (resume.error.value) {
        return `Error: ${resume.error.value}`;
      }
      return resume.getSkills();
    },

    experience: async (args: string[]) => {
      const { useResume } = await import('./useResume');
      const resume = useResume();
      await resume.loadResume();
      if (resume.error.value) {
        return `Error: ${resume.error.value}`;
      }
      const filter = args.length > 0 ? args.join(' ') : undefined;
      return resume.getExperience(filter);
    },

    contact: async () => {
      const { useResume } = await import('./useResume');
      const resume = useResume();
      await resume.loadResume();
      if (resume.error.value) {
        return `Error: ${resume.error.value}`;
      }
      return resume.getContact();
    },

    motd: async () => {
      const { useMotd } = await import('./useMotd');
      const { getMotd, loadMotd } = useMotd();
      await loadMotd();
      return getMotd();
    },

    theme: async (args: string[]) => {
      const { useTheme } = await import('./useTheme');
      const { themes } = await import('../themes');
      const theme = useTheme();
      
      if (args.length === 0) {
        // List all available themes
        const current = theme.currentThemeName.value;
        const themeList = Object.entries(themes).map(([key, themeData]) => {
          const isCurrent = current === key || (current === 'auto' && key === (theme.systemPrefersDark.value ? 'dark' : 'light'));
          const marker = isCurrent ? '- **\\*** ' : '- ';
          return `${marker}**${key}** - ${themeData.displayName}`;
        });
        
        // Add 'auto' option
        const autoMarker = current === 'auto' ? '- **\\*** ' : '- ';
        themeList.unshift(`${autoMarker}**auto** - Follow system preference (currently: ${theme.systemPrefersDark.value ? 'dark' : 'light'})`);
        
        return `Current theme: **${current === 'auto' ? `auto (${theme.systemPrefersDark.value ? 'dark' : 'light'})` : current}**

**Available themes:**

${themeList.join('\n')}

**Usage:**

- \`theme <name>\` - Switch to a theme (dark, light, or auto)
- \`theme toggle\` - Toggle between dark and light

**Examples:**

- \`theme dark\`
- \`theme light\`
- \`theme auto\`
- \`theme toggle\``;
      }
      
      // Handle toggle command
      if (args[0].toLowerCase() === 'toggle') {
        theme.toggleTheme();
        const newTheme = theme.currentThemeName.value;
        const displayName = newTheme === 'auto'
          ? `auto (${theme.systemPrefersDark.value ? 'dark' : 'light'})`
          : themes[newTheme]?.displayName || newTheme;
        return `Theme toggled to: **${displayName}**`;
      }
      
      // Handle theme name
      const themeName = args[0].toLowerCase();
      if (themeName === 'dark' || themeName === 'light' || themeName === 'auto') {
        theme.setTheme(themeName as 'dark' | 'light' | 'auto');
        const displayName = themeName === 'auto' 
          ? `auto (${theme.systemPrefersDark.value ? 'dark' : 'light'})`
          : themes[themeName]?.displayName || themeName;
        return `Theme changed to: **${displayName}**`;
      } else {
        return `Invalid theme: "${args[0]}". Available themes: dark, light, auto. Type \`theme\` to see details.`;
      }
    },

    font: async (args: string[]) => {
      const { useFont } = await import('./useFont');
      const font = useFont();
      
      if (args.length === 0) {
        // List fonts and show current settings
        const fonts = font.listFonts();
        const current = font.getCurrentFont();
        const lineHeight = font.getLineHeight();
        
        const fontList = fonts.map(f => f === current ? `- **\\*** **${f}**` : `- ${f}`);
        
        return `Current font: **${current}**

Current line height: **${lineHeight}**

**Available fonts:**

${fontList.join('\n')}

**Usage:**

- \`font <name>\` - Change font (immediate visual feedback)
- \`font spacing <value>\` - Change line height (0.5 - 3.0)

**Examples:**

- \`font "JetBrains Mono"\`
- \`font spacing 2.0\``;
      }
      
      // Handle spacing command
      if (args[0].toLowerCase() === 'spacing' && args.length > 1) {
        const lineHeight = parseFloat(args[1]);
        if (isNaN(lineHeight) || lineHeight <= 0 || lineHeight > 3) {
          return `Invalid line height: "${args[1]}". Must be between 0.5 and 3.0.`;
        }
        const result = font.setLineHeight(lineHeight);
        if (result) {
          return `Line height changed to: **${font.getLineHeight()}**`;
        }
        return `Failed to set line height.`;
      }
      
      // Handle font name
      const fontName = args.join(' ');
      const result = font.setFont(fontName);
      if (result) {
        return `Font changed to: **${font.getCurrentFont()}**`;
      } else {
        return `Font not found: "${fontName}". Type \`font\` to see available fonts.`;
      }
    },
  };

  /**
   * Execute a command with regex and case-insensitive support
   */
  const execute = async (input: string): Promise<string> => {
    if (!input.trim()) {
      return '';
    }

    // Parse command and arguments
    const parts = input.trim().split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Find matching command (case-insensitive)
    const commandKey = Object.keys(commands).find(
      (key) => key.toLowerCase() === commandName
    );

    if (commandKey) {
      try {
        const result = await commands[commandKey](args);
        if (!result) return '';
        // Process all output through marked for consistent rendering
        return await marked(result, { breaks: false, gfm: true }) as string;
      } catch (error) {
        return `Error executing command: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    // Command not found
    return `Command not found: ${commandName}. Type \`help\` for available commands.`;
  };

  return {
    execute,
  };
}


import { marked } from 'marked';

export interface CommandResult {
  output: string;
  error?: boolean;
}

/**
 * Command context passed to command handlers
 */
export interface CommandContext {
  args: string[];
  stdin?: string;  // Piped input from previous command
}

/**
 * Command handler function signature
 */
type CommandHandler = (ctx: CommandContext) => Promise<string>;

// Cache the resume module to avoid repeated dynamic imports
let resumeModule: typeof import('./useResume') | null = null;

/**
 * Helper to execute a function with a loaded resume
 * Handles loading and error checking with caching
 */
async function withResume<T>(fn: (resume: ReturnType<typeof import('./useResume').useResume>) => T): Promise<T | string> {
  if (!resumeModule) {
    resumeModule = await import('./useResume');
  }
  const resume = resumeModule.useResume();
  await resume.loadResume();
  if (resume.error.value) {
    return `Error: ${resume.error.value}`;
  }
  return fn(resume);
}

/**
 * Command system composable
 * Handles command execution with regex and case-insensitive matching
 * Supports piped input (stdin) for pipeline operations
 * 
 * - **download [format]** - Download resume (pdf, docx, md, rtf)
 *
 */
export function useCommands() {
  const commands: Record<string, CommandHandler> = {
    help: async () => {
      return `#### Available commands

- **help** - Show this help message
- **clear** - Clear the terminal
- **history** - Show command history
- **resume** - Display full resume
- **skills** - List technical skills
- **experience** - Show work experience
- **experience [company]** - Show experience for specific company
- **contact** - Display contact information
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

    clear: async () => {
      // This will be handled by the component
      return '';
    },

    history: async () => {
      // This will be handled by the component (needs access to command history state)
      return '';
    },

    resume: async () => withResume(r => r.getFullResume()),

    skills: async () => withResume(r => r.getSkills()),

    experience: async (ctx: CommandContext) => {
      const filter = ctx.args.length > 0 ? ctx.args.join(' ') : undefined;
      return withResume(r => r.getExperience(filter));
    },

    contact: async () => withResume(r => r.getContact()),

    motd: async () => {
      const { useMotd } = await import('./useMotd');
      const { getMotd, loadMotd } = useMotd();
      await loadMotd();
      return getMotd();
    },

    theme: async (ctx: CommandContext) => {
      const { useTheme } = await import('./useTheme');
      const { themes } = await import('../themes');
      const theme = useTheme();
      
      if (ctx.args.length === 0) {
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
      if (ctx.args[0].toLowerCase() === 'toggle') {
        theme.toggleTheme();
        const newTheme = theme.currentThemeName.value;
        const displayName = newTheme === 'auto'
          ? `auto (${theme.systemPrefersDark.value ? 'dark' : 'light'})`
          : themes[newTheme]?.displayName || newTheme;
        return `Theme toggled to: **${displayName}**`;
      }
      
      // Handle theme name
      const themeName = ctx.args[0].toLowerCase();
      if (themeName === 'dark' || themeName === 'light' || themeName === 'auto') {
        theme.setTheme(themeName as 'dark' | 'light' | 'auto');
        const displayName = themeName === 'auto' 
          ? `auto (${theme.systemPrefersDark.value ? 'dark' : 'light'})`
          : themes[themeName]?.displayName || themeName;
        return `Theme changed to: **${displayName}**`;
      } else {
        return `Invalid theme: "${ctx.args[0]}". Available themes: dark, light, auto. Type \`theme\` to see details.`;
      }
    },

    font: async (ctx: CommandContext) => {
      const { useFont } = await import('./useFont');
      const font = useFont();
      
      if (ctx.args.length === 0) {
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
      if (ctx.args[0].toLowerCase() === 'spacing' && ctx.args.length > 1) {
        const lineHeight = parseFloat(ctx.args[1]);
        if (isNaN(lineHeight) || lineHeight <= 0 || lineHeight > 3) {
          return `Invalid line height: "${ctx.args[1]}". Must be between 0.5 and 3.0.`;
        }
        const result = font.setLineHeight(lineHeight);
        if (result) {
          return `Line height changed to: **${font.getLineHeight()}**`;
        }
        return `Failed to set line height.`;
      }
      
      // Handle font name
      const fontName = ctx.args.join(' ');
      const result = font.setFont(fontName);
      if (result) {
        return `Font changed to: **${font.getCurrentFont()}**`;
      } else {
        return `Font not found: "${fontName}". Type \`font\` to see available fonts.`;
      }
    },

    // =========================================================================
    // Pipe-friendly commands (work with stdin from previous command)
    // =========================================================================

    /**
     * grep - Filter lines matching a pattern
     * Usage: command | grep <pattern>
     */
    grep: async (ctx: CommandContext) => {
      const pattern = ctx.args[0];
      if (!pattern) {
        return 'Usage: grep <pattern>\nExample: resume | grep kubernetes';
      }
      
      const content = ctx.stdin || '';
      if (!content) {
        return 'grep: no input. Use with pipe: command | grep <pattern>';
      }
      
      try {
        // Support regex patterns like /pattern/i
        let regex: RegExp;
        const regexMatch = pattern.match(/^\/(.+)\/([gimsu]*)$/);
        if (regexMatch) {
          regex = new RegExp(regexMatch[1], regexMatch[2] || 'i');
        } else {
          regex = new RegExp(pattern, 'i');
        }
        
        const lines = content.split('\n');
        const matched = lines.filter(line => regex.test(line));
        
        if (matched.length === 0) {
          return `No matches found for: ${pattern}`;
        }
        
        return matched.join('\n');
      } catch (e) {
        return `Invalid pattern: ${pattern}`;
      }
    },

    /**
     * head - Show first n lines
     * Usage: command | head [n]
     */
    head: async (ctx: CommandContext) => {
      const n = parseInt(ctx.args[0]) || 10;
      const content = ctx.stdin || '';
      
      if (!content) {
        return 'head: no input. Use with pipe: command | head [n]';
      }
      
      const lines = content.split('\n');
      return lines.slice(0, n).join('\n');
    },

    /**
     * tail - Show last n lines
     * Usage: command | tail [n]
     */
    tail: async (ctx: CommandContext) => {
      const n = parseInt(ctx.args[0]) || 10;
      const content = ctx.stdin || '';
      
      if (!content) {
        return 'tail: no input. Use with pipe: command | tail [n]';
      }
      
      const lines = content.split('\n');
      return lines.slice(-n).join('\n');
    },

    /**
     * wc - Count lines, words, characters
     * Usage: command | wc
     */
    wc: async (ctx: CommandContext) => {
      const content = ctx.stdin || '';
      
      if (!content) {
        return 'wc: no input. Use with pipe: command | wc';
      }
      
      const lines = content.split('\n').length;
      const words = content.split(/\s+/).filter(w => w.length > 0).length;
      const chars = content.length;
      
      return `${lines} lines, ${words} words, ${chars} characters`;
    },

    /**
     * more - Page through content (handled specially by pipeline)
     * This is a placeholder - actual paging is handled in Terminal.vue
     */
    more: async (ctx: CommandContext) => {
      // This command is handled specially by the pipeline executor
      // It should never reach here in normal operation
      return ctx.stdin || 'Usage: command | more';
    },

    /**
     * less - Page through content (alias for more)
     */
    less: async (ctx: CommandContext) => {
      return ctx.stdin || 'Usage: command | less';
    },

    /**
     * download - Download resume in specified format
     * Usage: download [format]
     * Formats: pdf, docx, md, rtf (default: pdf)
     */
    download: async (ctx: CommandContext) => {
      const validFormats = ['pdf', 'docx', 'md', 'rtf'];
      const format = ctx.args[0]?.toLowerCase() || 'pdf';
      
      if (!validFormats.includes(format)) {
        return `Invalid format: "${ctx.args[0]}"\n\nAvailable formats: ${validFormats.join(', ')}\n\nUsage: \`download [format]\`\nExample: \`download pdf\``;
      }
      
      // Return special navigation marker
      // Terminal.vue will detect this and navigate
      return `__NAV__/resume/download/${format}`;
    },

    // =========================================================================
    // Hidden Easter Egg Commands
    // =========================================================================

    /**
     * xyzzy - Classic IF magic word, launches Zork
     * Hidden command - not shown in help
     */
    xyzzy: async () => {
      // Return special marker that Terminal.vue will detect
      // Format: __ZORK__<game_id>
      return '__ZORK__zork1';
    },

    /**
     * plugh - Another classic IF magic word
     * Hidden command - alias for xyzzy
     */
    plugh: async () => {
      return '__ZORK__zork1';
    },
  };

  /**
   * Execute a single command with optional stdin
   * Returns RAW output (not markdown-processed)
   */
  const executeRaw = async (
    commandName: string,
    args: string[] = [],
    stdin?: string
  ): Promise<string> => {
    if (!commandName.trim()) {
      return '';
    }

    const cmdLower = commandName.toLowerCase();

    // Find matching command (case-insensitive)
    const commandKey = Object.keys(commands).find(
      (key) => key.toLowerCase() === cmdLower
    );

    if (commandKey) {
      try {
        const ctx: CommandContext = { args, stdin };
        const result = await commands[commandKey](ctx);
        return result || '';
      } catch (error) {
        return `Error executing command: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    // Command not found
    return `Command not found: ${commandName}. Type \`help\` for available commands.`;
  };

  /**
   * Execute a command string (legacy interface for simple commands)
   * Parses input and executes, returning RAW output
   */
  const execute = async (input: string, stdin?: string): Promise<string> => {
    if (!input.trim()) {
      return '';
    }

    // Parse command and arguments
    const parts = input.trim().split(/\s+/);
    const commandName = parts[0];
    const args = parts.slice(1);

    return executeRaw(commandName, args, stdin);
  };

  /**
   * Render raw command output to HTML via markdown
   * Call this only for final display (not for intermediate pipe steps)
   */
  const renderForDisplay = async (output: string): Promise<string> => {
    if (!output) return '';
    return await marked(output, { breaks: false, gfm: true }) as string;
  };

  return {
    execute,
    executeRaw,
    renderForDisplay,
  };
}

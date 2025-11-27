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
      return `Available commands:
  <strong>help</strong>              - Show this help message
  <strong>clear</strong>              - Clear the terminal
  <strong>resume</strong>             - Display full resume
  <strong>skills</strong>            - List technical skills
  <strong>experience</strong>        - Show work experience
  <strong>experience [company]</strong> - Show experience for specific company
  <strong>contact</strong>           - Display contact information
  <strong>motd</strong>              - Show message of the day
  <strong>theme</strong>             - Toggle theme (dark/light)
  <strong>font</strong>              - Show available fonts or change font
  <strong>font [name]</strong>       - Change terminal font

Commands support regex patterns and are case-insensitive.
Examples:
  <code>experience /five9/i</code>  - Find experience matching "five9" (case-insensitive)
  <code>skills /gcp/i</code>        - Find skills matching "gcp"`;
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
      const { getMotd } = useMotd();
      return getMotd();
    },

    theme: async () => {
      return 'Theme toggle coming soon...';
    },

    font: async (args: string[]) => {
      const { useFont } = await import('./useFont');
      const font = useFont();
      
      if (args.length === 0) {
        // List fonts and show current settings
        const fonts = font.listFonts();
        const current = font.getCurrentFont();
        const lineHeight = font.getLineHeight();
        
        return `Current font: <strong>${current}</strong>
Current line height: <strong>${lineHeight}</strong>

Available fonts:
${fonts.map(f => `  ${f === current ? `<strong>* ${f}</strong>` : `  ${f}`}`).join('\n')}

Usage:
  <code>font &lt;name&gt;</code>           - Change font (immediate visual feedback)
  <code>font spacing &lt;value&gt;</code> - Change line height (0.5 - 3.0)
  
Examples:
  <code>font "JetBrains Mono"</code>
  <code>font spacing 2.0</code>`;
      }
      
      // Handle spacing command
      if (args[0].toLowerCase() === 'spacing' && args.length > 1) {
        const lineHeight = parseFloat(args[1]);
        if (isNaN(lineHeight) || lineHeight <= 0 || lineHeight > 3) {
          return `Invalid line height: "${args[1]}". Must be between 0.5 and 3.0.`;
        }
        const result = font.setLineHeight(lineHeight);
        if (result) {
          return `Line height changed to: <strong>${font.getLineHeight()}</strong>`;
        }
        return `Failed to set line height.`;
      }
      
      // Handle font name
      const fontName = args.join(' ');
      const result = font.setFont(fontName);
      if (result) {
        return `Font changed to: <strong>${font.getCurrentFont()}</strong>`;
      } else {
        return `Font not found: "${fontName}". Type <code>font</code> to see available fonts.`;
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
        // If result already contains HTML tags, don't process with markdown
        if (result.includes('<strong>') || result.includes('<code>') || result.includes('<em>') || result.includes('<p>')) {
          return result;
        }
        // Convert markdown to HTML if needed
        if (result.includes('**') || result.includes('`') || result.includes('#')) {
          return await marked(result, { breaks: true, gfm: true }) as string;
        }
        return result;
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


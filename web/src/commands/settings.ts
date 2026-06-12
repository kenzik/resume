/**
 * Settings Commands
 * 
 * Commands for customizing terminal appearance: theme, font
 */

import type { CommandRegistry } from './types';

export const settingsCommands: CommandRegistry = {
  theme: {
    handler: async (ctx) => {
      const { useTheme } = await import('../composables/useTheme');
      const { themes, isValidThemeName } = await import('../themes');
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

- \`theme <name>\` - Switch to a theme
- \`theme toggle\` - Toggle between dark and light

**Examples:**

- \`theme dark\`
- \`theme light\`
- \`theme amber\`
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

      // Handle theme name — single validator from the registry (§9.3)
      const themeName = ctx.args[0].toLowerCase();
      if (isValidThemeName(themeName)) {
        theme.setTheme(themeName);
        const displayName = themeName === 'auto'
          ? `auto (${theme.systemPrefersDark.value ? 'dark' : 'light'})`
          : themes[themeName]?.displayName || themeName;
        return `Theme changed to: **${displayName}**`;
      } else {
        return `Invalid theme: "${ctx.args[0]}". Type \`theme\` to see available themes.`;
      }
    },
    description: 'Change terminal theme',
    usage: 'theme [name|toggle]',
    examples: ['theme', 'theme dark', 'theme toggle'],
  },

  font: {
    handler: async (ctx) => {
      const { useFont } = await import('../composables/useFont');
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
    description: 'Change terminal font',
    usage: 'font [name|spacing <value>]',
    examples: ['font', 'font "JetBrains Mono"', 'font spacing 1.8'],
  },
};


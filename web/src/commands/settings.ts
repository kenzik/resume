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
        // Auto-toggle scanlines for bitmap fonts
        const { useScanlines } = await import('../composables/useScanlines');
        const { getFont } = await import('../config');
        const scanlines = useScanlines();
        const fontConfig = getFont(font.getCurrentFont());

        if (fontConfig?.bitmap) {
          // Disable scanlines for bitmap fonts (cleaner pixel look)
          scanlines.setEnabled(false);
        } else {
          // Re-enable scanlines for vector fonts
          scanlines.setEnabled(true);
        }

        return `Font changed to: **${font.getCurrentFont()}**`;
      } else {
        return `Font not found: "${fontName}". Type \`font\` to see available fonts.`;
      }
    },
    description: 'Change terminal font',
    usage: 'font [name|spacing <value>]',
    examples: ['font', 'font "JetBrains Mono"', 'font spacing 1.8'],
  },

  set: {
    handler: async (ctx) => {
      const { useScanlines } = await import('../composables/useScanlines');
      const scanlines = useScanlines();

      if (ctx.args.length === 0) {
        return `**set** - Configure terminal settings

**Available settings:**

- \`set scanlines on|off\` - Toggle CRT scanlines effect

**Current values:**

- scanlines: **${scanlines.isEnabled() ? 'on' : 'off'}**`;
      }

      const setting = ctx.args[0].toLowerCase();

      if (setting === 'scanlines') {
        if (ctx.args.length < 2) {
          return `Scanlines: **${scanlines.isEnabled() ? 'on' : 'off'}**

Usage: \`set scanlines on|off\``;
        }

        const value = ctx.args[1].toLowerCase();
        if (value === 'on' || value === 'true' || value === '1') {
          scanlines.setEnabled(true);
          return `Scanlines: **on**`;
        } else if (value === 'off' || value === 'false' || value === '0') {
          scanlines.setEnabled(false);
          return `Scanlines: **off**`;
        } else {
          return `Invalid value: "${ctx.args[1]}". Use \`on\` or \`off\`.`;
        }
      }

      return `Unknown setting: "${setting}". Type \`set\` to see available settings.`;
    },
    description: 'Configure terminal settings',
    usage: 'set [setting] [value]',
    hidden: true,
  },
};


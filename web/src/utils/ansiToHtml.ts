/**
 * Convert ANSI escape codes to HTML spans
 * This allows us to display colored terminal text
 */
export function ansiToHtml(text: string): string {
  // ANSI color code mappings
  const colorMap: Record<string, string> = {
    '0': 'reset',
    '1': 'bright',
    '2': 'dim',
    '31': 'red',
    '32': 'green',
    '33': 'yellow',
    '34': 'blue',
    '35': 'magenta',
    '36': 'cyan',
    '37': 'white',
  };

  const cssColorMap: Record<string, string> = {
    reset: 'var(--color-foreground, #d4d4d4)',
    bright: 'var(--color-foreground, #d4d4d4)',
    dim: 'var(--color-brightBlack, #666666)',
    red: 'var(--terminal-error, #f14c4c)',
    green: 'var(--terminal-success, #23d18b)',
    yellow: 'var(--terminal-warning, #f5f543)',
    blue: 'var(--terminal-info, #29b8db)',
    magenta: 'var(--color-brightMagenta, #d670d6)',
    cyan: 'var(--terminal-info, #29b8db)',
    white: 'var(--color-foreground, #d4d4d4)',
  };

  // Match ANSI escape sequences
  const ansiRegex = /\x1b\[([0-9;]+)m/g;
  let result = text;
  const replacements: Array<{ index: number; length: number; replacement: string }> = [];
  let match;

  // Find all ANSI codes and their positions
  while ((match = ansiRegex.exec(text)) !== null) {
    const codes = match[1].split(';');
    const startIndex = match.index;
    const length = match[0].length;
    
    let styles: string[] = [];
    let isReset = false;
    
    for (const code of codes) {
      if (code === '0') {
        isReset = true;
        break;
      }
      
      const colorName = colorMap[code];
      if (colorName) {
        const cssColor = cssColorMap[colorName];
        if (cssColor) {
          if (colorName === 'bright') {
            styles.push('font-weight: bold');
          } else if (colorName === 'dim') {
            styles.push('opacity: 0.7');
          } else {
            styles.push(`color: ${cssColor}`);
          }
        }
      }
    }
    
    if (isReset) {
      replacements.push({
        index: startIndex,
        length,
        replacement: '</span>',
      });
    } else if (styles.length > 0) {
      replacements.push({
        index: startIndex,
        length,
        replacement: `<span style="${styles.join('; ')}">`,
      });
    } else {
      // Unknown code, just remove it
      replacements.push({
        index: startIndex,
        length,
        replacement: '',
      });
    }
  }

  // Apply replacements in reverse order to maintain indices
  replacements.sort((a, b) => b.index - a.index);
  
  for (const replacement of replacements) {
    result =
      result.slice(0, replacement.index) +
      replacement.replacement +
      result.slice(replacement.index + replacement.length);
  }

  return result;
}


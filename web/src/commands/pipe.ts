/**
 * Pipe Commands
 *
 * Commands designed to work with piped input: grep, head, tail, wc, more, less
 */

import type { CommandRegistry } from './types';

// =============================================================================
// ReDoS Protection Constants
// =============================================================================

/** Maximum allowed regex pattern length */
const MAX_REGEX_LENGTH = 200;

/** Maximum time (ms) allowed for regex execution */
const REGEX_TIMEOUT_MS = 100;

/**
 * Patterns that indicate potentially catastrophic backtracking
 * These patterns can cause exponential time complexity
 */
const DANGEROUS_PATTERNS = [
  /\(\.\*\)\+/,           // (.*)+
  /\(\.\+\)\+/,           // (.+)+
  /\(\.\*\)\*/,           // (.*)*
  /\(\.\+\)\*/,           // (.+)*
  /\([^)]*\|[^)]*\)\+/,   // (a|b)+ with alternatives
  /\([^)]*\|[^)]*\)\*/,   // (a|b)* with alternatives
  /\(\.\{[^}]+\}\)\+/,    // (.{n,m})+
  /\[\^?\w*\]\+\[\^?\w*\]\+/, // [a]+[b]+ nested quantifiers
];

/**
 * Validate regex pattern for potential ReDoS vulnerabilities
 * Returns an error message if the pattern is problematic, null if safe
 */
function validateRegexPattern(pattern: string): string | null {
  // Check length
  if (pattern.length > MAX_REGEX_LENGTH) {
    return `Pattern too long (max ${MAX_REGEX_LENGTH} chars). Simplify your regex.`;
  }

  // Check for dangerous patterns that could cause catastrophic backtracking
  for (const dangerous of DANGEROUS_PATTERNS) {
    if (dangerous.test(pattern)) {
      return 'Pattern may cause performance issues. Avoid nested quantifiers like (.*)+';
    }
  }

  // Check for excessive quantifier nesting
  const quantifierCount = (pattern.match(/[+*?]|\{\d+,?\d*\}/g) || []).length;
  if (quantifierCount > 10) {
    return 'Too many quantifiers in pattern. Simplify your regex.';
  }

  return null;
}

/**
 * Execute regex with timeout protection
 * Returns matched lines or throws on timeout
 */
function executeRegexWithTimeout(
  regex: RegExp,
  lines: string[],
  timeoutMs: number
): string[] {
  const startTime = performance.now();
  const matched: string[] = [];

  for (const line of lines) {
    // Check timeout before each line
    if (performance.now() - startTime > timeoutMs) {
      throw new Error('timeout');
    }

    if (regex.test(line)) {
      matched.push(line);
    }
  }

  return matched;
}

export const pipeCommands: CommandRegistry = {
  grep: {
    handler: async (ctx) => {
      const pattern = ctx.args[0];
      if (!pattern) {
        return 'Usage: grep <pattern>\nExample: resume | grep kubernetes';
      }

      const content = ctx.stdin || '';
      if (!content) {
        return 'grep: no input. Use with pipe: command | grep <pattern>';
      }

      try {
        // Extract regex pattern and flags
        let regexPattern: string;
        let flags: string;
        const regexMatch = pattern.match(/^\/(.+)\/([gimsu]*)$/);
        if (regexMatch) {
          regexPattern = regexMatch[1];
          flags = regexMatch[2] || 'i';
        } else {
          regexPattern = pattern;
          flags = 'i';
        }

        // Validate pattern for ReDoS vulnerabilities
        const validationError = validateRegexPattern(regexPattern);
        if (validationError) {
          return `grep: ${validationError}`;
        }

        // Create regex
        const regex = new RegExp(regexPattern, flags);
        const lines = content.split('\n');

        // Execute with timeout protection
        let matched: string[];
        try {
          matched = executeRegexWithTimeout(regex, lines, REGEX_TIMEOUT_MS);
        } catch (e) {
          if (e instanceof Error && e.message === 'timeout') {
            return `grep: Pattern took too long to execute (>${REGEX_TIMEOUT_MS}ms). Try a simpler pattern.`;
          }
          throw e;
        }

        if (matched.length === 0) {
          return `No matches found for: ${pattern}`;
        }

        return matched.join('\n');
      } catch {
        return `Invalid pattern: ${pattern}`;
      }
    },
    description: 'Filter lines matching a pattern',
    usage: 'grep <pattern>',
    examples: ['resume | grep kubernetes', 'skills | grep cloud'],
    requiresStdin: true,
  },

  head: {
    handler: async (ctx) => {
      const n = parseInt(ctx.args[0]) || 10;
      const content = ctx.stdin || '';
      
      if (!content) {
        return 'head: no input. Use with pipe: command | head [n]';
      }
      
      const lines = content.split('\n');
      return lines.slice(0, n).join('\n');
    },
    description: 'Show first n lines',
    usage: 'head [n]',
    examples: ['history | head', 'history | head 5'],
    requiresStdin: true,
  },

  tail: {
    handler: async (ctx) => {
      const n = parseInt(ctx.args[0]) || 10;
      const content = ctx.stdin || '';
      
      if (!content) {
        return 'tail: no input. Use with pipe: command | tail [n]';
      }
      
      const lines = content.split('\n');
      return lines.slice(-n).join('\n');
    },
    description: 'Show last n lines',
    usage: 'tail [n]',
    examples: ['history | tail', 'history | tail 5'],
    requiresStdin: true,
  },

  wc: {
    handler: async (ctx) => {
      const content = ctx.stdin || '';
      
      if (!content) {
        return 'wc: no input. Use with pipe: command | wc';
      }
      
      const lines = content.split('\n').length;
      const words = content.split(/\s+/).filter(w => w.length > 0).length;
      const chars = content.length;
      
      return `${lines} lines, ${words} words, ${chars} characters`;
    },
    description: 'Count lines, words, and characters',
    usage: 'wc',
    examples: ['resume | wc'],
    requiresStdin: true,
  },

  more: {
    handler: async (ctx) => {
      // This command is handled specially by the pipeline executor
      // It should never reach here in normal operation
      return ctx.stdin || 'Usage: command | more';
    },
    description: 'Page through output',
    usage: 'more',
    examples: ['resume | more'],
    requiresStdin: true,
  },

  less: {
    handler: async (ctx) => {
      // Alias for more
      return ctx.stdin || 'Usage: command | less';
    },
    description: 'Page through output (alias for more)',
    usage: 'less',
    examples: ['resume | less'],
    requiresStdin: true,
    aliases: ['more'],
  },
};


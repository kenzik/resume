/**
 * Pipe Commands
 * 
 * Commands designed to work with piped input: grep, head, tail, wc, more, less
 */

import type { CommandRegistry } from './types';

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
      } catch {
        return `Invalid pattern: ${pattern}`;
      }
    },
    description: 'Filter lines matching a pattern',
    usage: 'grep <pattern>',
    examples: ['resume | grep kubernetes', 'skills | grep /gcp/i'],
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


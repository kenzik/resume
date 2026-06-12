/**
 * Unit tests for the command registry (src/commands/index.ts).
 * Tests generateHelpText, hasCommand, getCommand, executeCommand.
 *
 * Commands that shell out to composables (theme, font) are invoked with mocked
 * Quasar LocalStorage already in place via vitest-setup.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  commands,
  generateHelpText,
  hasCommand,
  getCommand,
  executeCommand,
} from '../../src/commands/index';

describe('commands registry', () => {
  describe('structure', () => {
    it('exports a non-empty commands object', () => {
      expect(Object.keys(commands).length).toBeGreaterThan(0);
    });

    it('every command has a handler function and description', () => {
      for (const [name, def] of Object.entries(commands)) {
        expect(typeof def.handler, `${name}.handler`).toBe('function');
        expect(typeof def.description, `${name}.description`).toBe('string');
        expect(def.description.length, `${name}.description is non-empty`).toBeGreaterThan(0);
      }
    });

    it('registers the expected core commands', () => {
      const expected = ['help', 'clear', 'history', 'motd'];
      for (const cmd of expected) {
        expect(hasCommand(cmd), `command "${cmd}" exists`).toBe(true);
      }
    });

    it('registers pipe-filter commands', () => {
      const expected = ['grep', 'head', 'tail', 'wc', 'more'];
      for (const cmd of expected) {
        expect(hasCommand(cmd), `command "${cmd}" exists`).toBe(true);
      }
    });

    it('registers settings commands', () => {
      expect(hasCommand('theme')).toBe(true);
      expect(hasCommand('font')).toBe(true);
    });
  });

  describe('hasCommand', () => {
    it('returns true for known commands', () => {
      expect(hasCommand('help')).toBe(true);
      expect(hasCommand('resume')).toBe(true);
    });

    it('returns false for unknown commands', () => {
      expect(hasCommand('unknown-cmd-xyz')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(hasCommand('HELP')).toBe(true);
      expect(hasCommand('Resume')).toBe(true);
    });
  });

  describe('getCommand', () => {
    it('returns the command definition for a known command', () => {
      const def = getCommand('help');
      expect(def).toBeDefined();
      expect(def?.description).toBeTruthy();
    });

    it('returns undefined for an unknown command', () => {
      expect(getCommand('nope')).toBeUndefined();
    });
  });

  describe('generateHelpText', () => {
    it('returns a non-empty string', () => {
      const text = generateHelpText();
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    });

    it('includes section headers', () => {
      const text = generateHelpText();
      expect(text).toContain('General');
      expect(text).toContain('Resume');
      expect(text).toContain('Settings');
    });

    it('includes pipe command section with usage note', () => {
      const text = generateHelpText();
      expect(text).toContain('Pipe');
    });

    it('includes an Examples section', () => {
      const text = generateHelpText();
      expect(text).toContain('Examples');
    });
  });

  describe('executeCommand', () => {
    it('returns "command not found" for unknown commands', async () => {
      const result = await executeCommand('unknown-xyz');
      expect(result).toContain('Command not found');
      expect(result).toContain('help');
    });

    it('executes help command and returns help text', async () => {
      const result = await executeCommand('help');
      expect(result).toContain('General');
    });

    it('executes grep with piped stdin', async () => {
      const result = await executeCommand('grep', ['AI'], 'Machine Learning\nAI Research\nCloud');
      expect(result).toContain('AI');
      expect(result).not.toContain('Machine Learning');
      expect(result).not.toContain('Cloud');
    });

    it('grep returns "no matches" message when pattern absent', async () => {
      const result = await executeCommand('grep', ['xyz123'], 'hello\nworld');
      expect(result).toContain('No matches found');
    });

    it('executes head command', async () => {
      const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n');
      const result = await executeCommand('head', ['5'], lines);
      const outputLines = result.split('\n').filter(Boolean);
      expect(outputLines).toHaveLength(5);
      expect(outputLines[0]).toBe('line 1');
    });

    it('executes tail command', async () => {
      const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n');
      const result = await executeCommand('tail', ['3'], lines);
      const outputLines = result.split('\n').filter(Boolean);
      expect(outputLines).toHaveLength(3);
      expect(outputLines[2]).toBe('line 20');
    });

    it('executes wc command', async () => {
      const result = await executeCommand('wc', [], 'hello world\nfoo bar');
      expect(result).toContain('lines');
      expect(result).toContain('words');
    });
  });
});

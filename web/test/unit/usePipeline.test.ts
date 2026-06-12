/**
 * Unit tests for the pipeline composable (usePipeline.ts).
 * Pure-function tests — no quasar or DOM dependencies.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  parsePipeline,
  hasPipe,
  isPagerCommand,
  executePipeline,
} from '../../src/composables/usePipeline';

describe('parsePipeline', () => {
  it('returns empty array for empty input', () => {
    expect(parsePipeline('')).toEqual([]);
    expect(parsePipeline('   ')).toEqual([]);
  });

  it('parses a single command with no arguments', () => {
    const result = parsePipeline('resume');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ command: 'resume', args: [] });
  });

  it('parses a command with arguments', () => {
    const result = parsePipeline('experience google');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ command: 'experience', args: ['google'] });
  });

  it('parses a two-stage pipeline', () => {
    const result = parsePipeline('resume | grep AI');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ command: 'resume', args: [] });
    expect(result[1]).toEqual({ command: 'grep', args: ['AI'] });
  });

  it('parses a three-stage pipeline', () => {
    const result = parsePipeline('resume | grep AI | head 5');
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ command: 'head', args: ['5'] });
  });

  it('normalises command to lowercase', () => {
    const result = parsePipeline('RESUME | GREP ai');
    expect(result[0].command).toBe('resume');
    expect(result[1].command).toBe('grep');
  });

  it('handles quoted arguments', () => {
    const result = parsePipeline("grep 'hello world'");
    expect(result[0].args).toEqual(['hello world']);
  });

  it('handles double-quoted arguments', () => {
    const result = parsePipeline('grep "foo bar"');
    expect(result[0].args).toEqual(['foo bar']);
  });

  it('trims extra whitespace around pipes', () => {
    const result = parsePipeline('resume   |   grep AI');
    expect(result).toHaveLength(2);
    expect(result[0].command).toBe('resume');
  });

  it('filters out empty segments', () => {
    // Trailing/leading pipes shouldn't produce empty commands
    const result = parsePipeline('resume | grep AI');
    expect(result.every(s => s.command !== '')).toBe(true);
  });
});

describe('hasPipe', () => {
  it('returns true when pipe symbol is present', () => {
    expect(hasPipe('resume | grep foo')).toBe(true);
  });

  it('returns false when no pipe symbol', () => {
    expect(hasPipe('resume')).toBe(false);
  });
});

describe('isPagerCommand', () => {
  it('recognises "more" as a pager', () => {
    expect(isPagerCommand('more')).toBe(true);
  });

  it('recognises "less" as a pager', () => {
    expect(isPagerCommand('less')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isPagerCommand('MORE')).toBe(true);
  });

  it('returns false for regular commands', () => {
    expect(isPagerCommand('grep')).toBe(false);
    expect(isPagerCommand('head')).toBe(false);
  });
});

describe('executePipeline', () => {
  it('returns empty output for empty segments', async () => {
    const executor = vi.fn();
    const result = await executePipeline([], executor);
    expect(result.output).toBe('');
    expect(executor).not.toHaveBeenCalled();
  });

  it('executes a single command', async () => {
    const executor = vi.fn().mockResolvedValue('hello world');
    const result = await executePipeline(
      [{ command: 'resume', args: [] }],
      executor,
    );
    expect(result.output).toBe('hello world');
    expect(executor).toHaveBeenCalledWith('resume', [], undefined);
  });

  it('pipes stdout of first command to stdin of second', async () => {
    const executor = vi.fn()
      .mockResolvedValueOnce('line1\nline2\nline3')
      .mockResolvedValueOnce('line1');

    const segments = parsePipeline('cmd | grep line1');
    const result = await executePipeline(segments, executor);

    // Second call receives the output of the first as stdin
    expect(executor).toHaveBeenNthCalledWith(2, 'grep', ['line1'], 'line1\nline2\nline3');
    expect(result.output).toBe('line1');
  });

  it('enters pager mode when "more" is the last segment', async () => {
    const executor = vi.fn().mockResolvedValue('lots of content');
    const segments = parsePipeline('resume | more');
    const result = await executePipeline(segments, executor);

    expect(result.pagerMode).toBe(true);
    expect(result.pagerContent).toBe('lots of content');
    expect(result.output).toBe('');
  });

  it('returns error message when pager receives no stdin', async () => {
    const executor = vi.fn();
    const result = await executePipeline(
      [{ command: 'more', args: [] }],
      executor,
    );
    expect(result.output).toContain('requires piped input');
    expect(result.pagerMode).toBeUndefined();
  });

  it('catches executor errors and returns an error message', async () => {
    const executor = vi.fn().mockRejectedValue(new Error('command failed'));
    const segments = parsePipeline('bad-cmd');
    const result = await executePipeline(segments, executor);
    expect(result.output).toContain('command failed');
  });
});

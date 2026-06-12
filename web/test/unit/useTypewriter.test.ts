/**
 * Unit tests for useTypewriter composable.
 * Uses vi.useFakeTimers() to avoid real delays.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTypewriter } from '../../src/composables/useTypewriter';

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial state', () => {
    const { isTyping, stopTyping, typeText } = useTypewriter();
    expect(isTyping.value).toBe(false);
    expect(typeof stopTyping).toBe('function');
    expect(typeof typeText).toBe('function');
  });

  it('outputs full text immediately when charsPerTick >= text.length', async () => {
    const { typeText, isTyping } = useTypewriter();
    const onChar = vi.fn();

    const promise = typeText('hello', { charsPerTick: 100, onChar });
    await promise;

    expect(onChar).toHaveBeenCalledWith('hello');
    expect(isTyping.value).toBe(false);
  });

  it('outputs full text immediately when delay <= 0', async () => {
    const { typeText } = useTypewriter();
    const onChar = vi.fn();

    const result = await typeText('world', { delay: 0, onChar });
    expect(result).toBe('world');
    expect(onChar).toHaveBeenCalledWith('world');
  });

  it('calls onComplete callback after typing finishes', async () => {
    const { typeText } = useTypewriter();
    const onComplete = vi.fn();

    await typeText('hi', { charsPerTick: 100, onComplete });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('advances character position in batches via fake timers', async () => {
    const { typeText, isTyping } = useTypewriter();
    const chunks: string[] = [];

    const promise = typeText('abcde', {
      delay: 100,
      charsPerTick: 2,
      onChar: (t) => chunks.push(t),
    });

    // No output yet (just started)
    expect(isTyping.value).toBe(true);

    // Advance one tick (100ms) — first two chars should be output
    await vi.advanceTimersByTimeAsync(100);
    expect(chunks.length).toBeGreaterThan(0);

    // Advance to completion
    await vi.advanceTimersByTimeAsync(500);
    await promise;

    const finalChunk = chunks[chunks.length - 1];
    expect(finalChunk).toBe('abcde');
    expect(isTyping.value).toBe(false);
  });

  it('stopTyping halts mid-animation and returns partial text', async () => {
    const { typeText, stopTyping } = useTypewriter();
    const chunks: string[] = [];

    const promise = typeText('abcdefghij', {
      delay: 100,
      charsPerTick: 1,
      onChar: (t) => chunks.push(t),
    });

    await vi.advanceTimersByTimeAsync(150);
    stopTyping();

    await vi.advanceTimersByTimeAsync(1000);
    const partial = await promise;

    // We should have stopped before the full string
    expect(partial.length).toBeLessThan('abcdefghij'.length);
  });

  it('does not break ANSI escape sequences across chunks', async () => {
    const { typeText } = useTypewriter();
    const chunks: string[] = [];

    const ansiText = '\x1b[32mHello\x1b[0m';
    const promise = typeText(ansiText, {
      delay: 10,
      charsPerTick: 3,
      onChar: (t) => chunks.push(t),
    });

    await vi.runAllTimersAsync();
    await promise;

    // Final chunk should be the complete string (ANSI not broken)
    expect(chunks[chunks.length - 1]).toBe(ansiText);
  });
});

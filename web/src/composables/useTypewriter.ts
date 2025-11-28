import { ref } from 'vue';

export interface TypewriterOptions {
  delay?: number; // Delay between ticks in milliseconds (min ~4ms due to browser limits)
  charsPerTick?: number; // Characters to type per tick (increase for faster output)
  onChar?: (text: string) => void; // Callback with current text
  onComplete?: () => void; // Callback when complete
}

/**
 * Typewriter effect composable
 * Simulates old modem/terminal typing speed
 * 
 * Speed is controlled by two factors:
 * - delay: milliseconds between ticks (browser minimum is ~4ms)
 * - charsPerTick: how many characters to output per tick
 * 
 * For very fast output, increase charsPerTick rather than decreasing delay.
 * Example: charsPerTick=10 at delay=4 = ~2500 chars/second
 */
export function useTypewriter() {
  const isTyping = ref(false);
  
  // Cancel token for stopping typewriter mid-animation
  let cancelRequested = false;
  
  /**
   * Stop the current typewriter animation
   */
  const stopTyping = () => {
    cancelRequested = true;
  };
  
  /**
   * Type out text with batched character output
   */
  const typeText = async (
    text: string,
    options: TypewriterOptions = {}
  ): Promise<string> => {
    // Reset cancel flag at start of new animation
    cancelRequested = false;
    const {
      delay = 4, // Minimum practical delay (browser clamps to ~4ms anyway)
      charsPerTick = 5, // Characters per tick - increase for faster output
      onChar,
      onComplete,
    } = options;

    // For zero/negative delay or very large charsPerTick, just output immediately
    if (delay <= 0 || charsPerTick >= text.length) {
      isTyping.value = true;
      if (onChar) {
        onChar(text);
      }
      isTyping.value = false;
      if (onComplete) {
        onComplete();
      }
      return text;
    }

    isTyping.value = true;
    let i = 0;

    while (i < text.length) {
      // Check for cancellation
      if (cancelRequested) {
        isTyping.value = false;
        return text.substring(0, i);
      }
      
      // Calculate end of this chunk
      let chunkEnd = Math.min(i + charsPerTick, text.length);
      
      // Extend chunk to include complete ANSI sequences
      while (chunkEnd < text.length) {
        // Check if we're in the middle of an ANSI sequence
        const chunk = text.substring(i, chunkEnd);
        const lastEsc = chunk.lastIndexOf('\x1b');
        if (lastEsc !== -1) {
          // Find the 'm' that ends this sequence
          const seqStart = i + lastEsc;
          let seqEnd = seqStart + 1;
          while (seqEnd < text.length && text[seqEnd] !== 'm') {
            seqEnd++;
          }
          if (seqEnd < text.length && seqEnd >= chunkEnd) {
            // Extend chunk to include the full ANSI sequence
            chunkEnd = seqEnd + 1;
          }
        }
        break;
      }

      // Output the chunk
      const result = text.substring(0, chunkEnd);
      if (onChar) {
        onChar(result);
      }

      i = chunkEnd;

      // Delay before next chunk (skip if we're done)
      if (i < text.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    isTyping.value = false;
    
    if (onComplete) {
      onComplete();
    }

    return text;
  };

  return {
    typeText,
    isTyping,
    stopTyping,
  };
}


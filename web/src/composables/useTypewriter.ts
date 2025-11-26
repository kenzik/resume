import { ref } from 'vue';

export interface TypewriterOptions {
  delay?: number; // Delay between characters in milliseconds
  onChar?: (char: string) => void; // Callback for each character
  onComplete?: () => void; // Callback when complete
}

/**
 * Typewriter effect composable
 * Simulates old modem/terminal typing speed
 */
export function useTypewriter() {
  const isTyping = ref(false);
  
  /**
   * Type out text character by character
   */
  const typeText = async (
    text: string,
    options: TypewriterOptions = {}
  ): Promise<string> => {
    const {
      delay = 10, // Default 10ms per character (fast modem speed)
      onChar,
      onComplete,
    } = options;

    isTyping.value = true;
    let result = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      result += char;
      
      if (onChar) {
        onChar(result);
      }

      // Handle ANSI escape sequences - don't delay for them
      if (char === '\x1b') {
        // Find the end of the ANSI sequence
        let j = i + 1;
        while (j < text.length && text[j] !== 'm') {
          j++;
        }
        if (j < text.length) {
          // Include the entire ANSI sequence
          result = text.substring(0, j + 1);
          i = j;
          if (onChar) {
            onChar(result);
          }
          continue;
        }
      }

      // Delay between characters (except for ANSI codes)
      if (i < text.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    isTyping.value = false;
    
    if (onComplete) {
      onComplete();
    }

    return result;
  };

  return {
    typeText,
    isTyping,
  };
}


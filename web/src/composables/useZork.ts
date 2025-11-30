/**
 * useZork - Z-machine game integration for terminal
 * 
 * Bridges ifvms.js Z-machine interpreter to Vue reactive state.
 * Implements a minimal Glk adapter for text I/O.
 */

import { ref, shallowRef } from 'vue';

// Game registry - extensible for future games
const GAMES: Record<string, string> = {
  zork1: '/games/zork1.z3',
  // zork2: '/games/zork2.z3',
  // zork3: '/games/zork3.z3',
};

// Types for the VM and Glk
interface ZVM {
  prepare(storyData: Uint8Array, options: VMOptions): void;
  init(): void;
  resume(arg?: unknown): void;
  quit?: boolean;
}

interface VMOptions {
  Glk: MinimalGlk;
}

interface GlkWindow {
  write: (text: string) => void;
}

interface RefStruct {
  fields: unknown[];
  push_field: (val: unknown) => void;
  get_field: (index: number) => unknown;
}

/**
 * Minimal Glk implementation for terminal output
 * Only implements what's needed for basic Z-machine games
 */
class MinimalGlk {
  private outputBuffer: string[] = [];
  private inputCallback: ((line: string) => void) | null = null;
  private inputBuffer: string | null = null;
  private mainWindow: GlkWindow | null = null;
  private onOutput: (text: string) => void;
  private onWaitingForInput: (waiting: boolean) => void;
  private vm: ZVM | null = null;
  
  // Glk constants
  readonly wintype_TextBuffer = 3;
  readonly evtype_LineInput = 3;
  readonly gestalt_LineInput = 2;

  constructor(
    onOutput: (text: string) => void,
    onWaitingForInput: (waiting: boolean) => void
  ) {
    this.onOutput = onOutput;
    this.onWaitingForInput = onWaitingForInput;
  }

  setVM(vm: ZVM) {
    this.vm = vm;
  }

  // Initialize Glk with VM options
  init(options: { vm: ZVM }) {
    this.vm = options.vm;
    this.vm.init();
  }

  // RefStruct for event handling
  RefStruct = class implements RefStruct {
    fields: unknown[] = [];
    push_field(val: unknown) {
      this.fields.push(val);
    }
    get_field(index: number) {
      return this.fields[index];
    }
  };

  // Window management (simplified)
  glk_window_open(): GlkWindow {
    this.mainWindow = {
      write: (text: string) => {
        this.outputBuffer.push(text);
      }
    };
    return this.mainWindow;
  }

  glk_window_get_size(): void {
    // No-op for our terminal
  }

  glk_set_window(): void {
    // No-op - single window
  }

  glk_window_clear(): void {
    this.outputBuffer = [];
  }

  // Text output
  glk_put_char(ch: number): void {
    this.outputBuffer.push(String.fromCharCode(ch));
  }

  glk_put_char_stream(): void {
    // No-op for our implementation
  }

  glk_put_string(str: string): void {
    this.outputBuffer.push(str);
  }

  glk_put_string_stream(): void {
    // No-op
  }

  // Style (ignored for terminal)
  glk_set_style(): void {}
  glk_set_style_stream(): void {}
  glk_stylehint_set(): void {}

  // Input handling
  glk_request_line_event(
    _win: GlkWindow,
    buf: Uint8Array,
    _initlen: number
  ): void {
    // Flush output before waiting for input
    this.flushOutput();
    this.onWaitingForInput(true);
    
    this.inputCallback = (line: string) => {
      // Write input to the buffer
      const bytes = new TextEncoder().encode(line);
      for (let i = 0; i < bytes.length && i < buf.length; i++) {
        buf[i] = bytes[i];
      }
      this.inputBuffer = line;
    };
  }

  glk_select(event: RefStruct): void {
    // Signal that we need input
    if (this.inputBuffer !== null) {
      // We have input ready
      event.push_field(this.evtype_LineInput); // event type
      event.push_field(this.mainWindow); // window
      event.push_field(this.inputBuffer.length); // length
      event.push_field(this.inputBuffer); // the actual input
      this.inputBuffer = null;
      this.inputCallback = null;
    }
  }

  // Cancel pending input
  glk_cancel_line_event(): { result?: string } {
    this.inputCallback = null;
    this.onWaitingForInput(false);
    return {};
  }

  // Feature queries
  glk_gestalt(sel: number): number {
    if (sel === this.gestalt_LineInput) return 1;
    return 0;
  }

  glk_gestalt_ext(): number {
    return 0;
  }

  // Stream management (minimal)
  glk_stream_set_current(): void {}
  glk_stream_get_current(): null { return null; }
  glk_stream_open_memory(): null { return null; }
  glk_stream_close(): void {}

  // Character input (for single-key prompts)
  glk_request_char_event(): void {
    this.flushOutput();
    this.onWaitingForInput(true);
  }

  glk_cancel_char_event(): void {
    this.onWaitingForInput(false);
  }

  // Flush buffered output
  flushOutput(): void {
    if (this.outputBuffer.length > 0) {
      const text = this.outputBuffer.join('');
      this.outputBuffer = [];
      if (text.trim()) {
        this.onOutput(text);
      }
    }
  }

  // Update display (called after VM operations)
  update(): void {
    this.flushOutput();
  }

  // Error handling
  fatal_error(error: Error | string): void {
    const msg = error instanceof Error ? error.message : error;
    this.onOutput(`\n[FATAL ERROR: ${msg}]\n`);
    console.error('Glk fatal error:', error);
  }

  // Provide input from terminal
  provideInput(line: string): boolean {
    if (this.inputCallback) {
      this.inputCallback(line);
      this.onWaitingForInput(false);
      
      // Resume VM with input
      if (this.vm) {
        this.vm.resume();
      }
      return true;
    }
    return false;
  }
}

// Singleton state for the composable
const isActive = ref(false);
const output = ref<string[]>([]);
const isWaitingForInput = ref(false);
const currentGame = ref<string | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

// VM and Glk instances
let vm: ZVM | null = null;
let glk: MinimalGlk | null = null;

/**
 * useZork composable
 * Provides reactive state and methods for Zork game integration
 */
export function useZork() {
  /**
   * Start a game
   */
  const startGame = async (game: string = 'zork1'): Promise<boolean> => {
    const gamePath = GAMES[game];
    if (!gamePath) {
      error.value = `Unknown game: ${game}`;
      return false;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // Dynamically import ifvms to avoid bundling if not used
      const { ZVM } = await import('ifvms');
      
      // Fetch the story file
      const response = await fetch(gamePath);
      if (!response.ok) {
        throw new Error(`Failed to load ${gamePath}: ${response.status}`);
      }
      
      const storyData = new Uint8Array(await response.arrayBuffer());
      
      // Create Glk adapter
      glk = new MinimalGlk(
        (text: string) => {
          // Append output
          output.value = [...output.value, text];
        },
        (waiting: boolean) => {
          isWaitingForInput.value = waiting;
        }
      );
      
      // Create and prepare VM
      vm = new ZVM() as ZVM;
      glk.setVM(vm);
      
      vm.prepare(storyData, { Glk: glk });
      
      // Initialize
      currentGame.value = game;
      output.value = [];
      isActive.value = true;
      isLoading.value = false;
      
      // Start the VM
      glk.init({ vm });
      
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      error.value = msg;
      isLoading.value = false;
      console.error('Failed to start Zork:', e);
      return false;
    }
  };

  /**
   * Send input to the game
   */
  const sendInput = (line: string): boolean => {
    if (!isActive.value || !glk || !isWaitingForInput.value) {
      return false;
    }
    
    return glk.provideInput(line);
  };

  /**
   * Quit the game and clean up
   */
  const quit = (): void => {
    if (vm) {
      vm.quit = true;
    }
    vm = null;
    glk = null;
    isActive.value = false;
    isWaitingForInput.value = false;
    currentGame.value = null;
    output.value = [];
  };

  /**
   * Get all output as a single string
   */
  const getOutputText = (): string => {
    return output.value.join('');
  };

  /**
   * Clear output buffer (e.g., after displaying)
   */
  const clearOutput = (): void => {
    output.value = [];
  };

  /**
   * Get available games
   */
  const getAvailableGames = (): string[] => {
    return Object.keys(GAMES);
  };

  return {
    // State (reactive)
    isActive,
    output,
    isWaitingForInput,
    currentGame,
    isLoading,
    error,
    
    // Methods
    startGame,
    sendInput,
    quit,
    getOutputText,
    clearOutput,
    getAvailableGames,
  };
}


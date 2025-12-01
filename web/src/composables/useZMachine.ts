/**
 * useZMachine - Z-machine game integration for terminal
 * 
 * Bridges ifvms.js Z-machine interpreter to Vue reactive state.
 * Implements a minimal Glk adapter for text I/O.
 * 
 * Supports any Z-machine compatible game (.z3, .z5, .z8 files).
 */

import { ref } from 'vue';

// Game registry - extensible for future games
const GAMES: Record<string, string> = {
  zork1: '/games/zork1.z3',
  // zork2: '/games/zork2.z3',
  // zork3: '/games/zork3.z3',
};

// Game display titles for UI
export const GAME_TITLES: Record<string, string> = {
  zork1: 'ZORK I',
  zork2: 'ZORK II',
  zork3: 'ZORK III',
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
  private pendingEvent: RefStruct | null = null;  // Store pending event for input
  private inputLineBuffer: Uint8Array | null = null;  // Store input buffer reference
  
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

  // RefBox for single value references
  RefBox = class {
    value: unknown = 0;
    set_value(val: unknown) {
      this.value = val;
    }
    get_value() {
      return this.value;
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

  glk_window_close(): void {
    // No-op - we don't actually close windows
  }

  glk_window_get_size(): void {
    // No-op for our terminal
  }

  glk_window_get_root(): GlkWindow | null {
    return this.mainWindow;
  }

  glk_window_iterate(): null {
    return null;
  }

  glk_set_window(): void {
    // No-op - single window
  }

  glk_window_clear(): void {
    this.outputBuffer = [];
  }

  glk_window_move_cursor(): void {
    // No-op
  }

  glk_window_get_type(): number {
    return this.wintype_TextBuffer;
  }

  glk_window_get_parent(): null {
    return null;
  }

  glk_window_get_sibling(): null {
    return null;
  }

  glk_window_get_rock(): number {
    return 0;
  }

  glk_window_set_arrangement(): void {}
  glk_window_get_arrangement(): void {}
  glk_window_set_echo_stream(): void {}
  glk_window_get_echo_stream(): null { return null; }
  glk_window_get_stream(): unknown { return {}; }
  glk_set_echo_line_event(): void {}
  
  // Mouse input (not supported)
  glk_request_mouse_event(): void {}
  glk_cancel_mouse_event(): void {}

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

  // ifvms-specific: output JavaScript string directly
  glk_put_jstring(str: string): void {
    this.outputBuffer.push(str);
  }

  glk_put_jstring_stream(): void {
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
    
    // Store buffer reference for later
    this.inputLineBuffer = buf;
    
    this.inputCallback = (line: string) => {
      // Write input to the VM's buffer
      if (this.inputLineBuffer) {
        const bytes = new TextEncoder().encode(line);
        for (let i = 0; i < bytes.length && i < this.inputLineBuffer.length; i++) {
          this.inputLineBuffer[i] = bytes[i];
        }
      }
      this.inputBuffer = line;
    };
  }

  glk_select(event: RefStruct): void {
    // Check if we have pending input
    if (this.inputBuffer !== null) {
      // We have input ready - populate the event
      event.push_field(this.evtype_LineInput); // event type (3)
      event.push_field(this.mainWindow); // window
      event.push_field(this.inputBuffer.length); // input length
      event.push_field(0); // unused
      this.inputBuffer = null;
      this.inputCallback = null;
      this.inputLineBuffer = null;
    } else {
      // No input yet - store event reference and signal we're waiting
      this.pendingEvent = event;
      this.onWaitingForInput(true);  // Signal that we're waiting for input
      this.flushOutput();  // Flush any pending output
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
  glk_stream_open_memory_uni(): null { return null; }
  glk_stream_close(): void {}
  glk_stream_iterate(): null { return null; }
  glk_stream_get_rock(): number { return 0; }
  glk_stream_set_position(): void {}
  glk_stream_get_position(): number { return 0; }
  glk_get_char_stream(): number { return -1; }
  glk_get_line_stream(): number { return 0; }
  glk_get_buffer_stream(): number { return 0; }
  glk_put_char_stream_uni(): void {}
  glk_put_string_stream_uni(): void {}
  glk_put_buffer_stream(): void {}
  glk_put_buffer_stream_uni(): void {}
  glk_get_char_stream_uni(): number { return -1; }
  glk_get_buffer_stream_uni(): number { return 0; }
  glk_get_line_stream_uni(): number { return 0; }
  
  // File operations (not supported)
  glk_fileref_create_temp(): null { return null; }
  glk_fileref_create_by_name(): null { return null; }
  glk_fileref_create_by_prompt(): null { return null; }
  glk_fileref_destroy(): void {}
  glk_fileref_iterate(): null { return null; }
  glk_fileref_get_rock(): number { return 0; }
  glk_fileref_delete_file(): void {}
  glk_fileref_does_file_exist(): boolean { return false; }
  glk_fileref_create_from_fileref(): null { return null; }
  glk_stream_open_file(): null { return null; }
  glk_stream_open_file_uni(): null { return null; }
  
  // Sound (not supported)
  glk_schannel_create(): null { return null; }
  glk_schannel_destroy(): void {}
  glk_schannel_iterate(): null { return null; }
  glk_schannel_get_rock(): number { return 0; }
  glk_schannel_play(): boolean { return false; }
  glk_schannel_play_ext(): boolean { return false; }
  glk_schannel_stop(): void {}
  glk_schannel_set_volume(): void {}
  glk_sound_load_hint(): void {}
  
  // Image (not supported)
  glk_image_get_info(): boolean { return false; }
  glk_image_draw(): boolean { return false; }
  glk_image_draw_scaled(): boolean { return false; }
  glk_window_flow_break(): void {}
  glk_window_erase_rect(): void {}
  glk_window_fill_rect(): void {}
  glk_window_set_background_color(): void {}
  
  // Timer
  glk_request_timer_events(): void {}
  
  // Hyperlinks (not supported)
  glk_set_hyperlink(): void {}
  glk_set_hyperlink_stream(): void {}
  glk_request_hyperlink_event(): void {}
  glk_cancel_hyperlink_event(): void {}
  
  // Unicode
  glk_buffer_to_lower_case_uni(): number { return 0; }
  glk_buffer_to_upper_case_uni(): number { return 0; }
  glk_buffer_to_title_case_uni(): number { return 0; }
  glk_buffer_canon_decompose_uni(): number { return 0; }
  glk_buffer_canon_normalize_uni(): number { return 0; }
  glk_put_char_uni(): void {}
  glk_put_string_uni(): void {}
  glk_put_buffer_uni(): void {}
  glk_request_char_event_uni(): void {}
  
  glk_request_line_event_uni(
    _win: GlkWindow,
    buf: number[],  // Unicode version uses number array
    _initlen: number
  ): void {
    // Flush output before waiting for input
    this.flushOutput();
    
    // Store buffer reference for later
    this.unicodeInputBuffer = buf;
    
    this.inputCallback = (line: string) => {
      // Write input to the VM's buffer as unicode codepoints
      if (this.unicodeInputBuffer) {
        for (let i = 0; i < line.length && i < this.unicodeInputBuffer.length; i++) {
          this.unicodeInputBuffer[i] = line.charCodeAt(i);
        }
      }
    };
  }
  
  private unicodeInputBuffer: number[] | null = null;

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
    if (this.pendingEvent) {
      // Call the callback to write to VM's buffer (handles both regular and unicode)
      if (this.inputCallback) {
        this.inputCallback(line);
      }
      
      this.onWaitingForInput(false);
      
      // Populate the pending event with input data
      this.pendingEvent.push_field(this.evtype_LineInput); // event type (3)
      this.pendingEvent.push_field(this.mainWindow); // window
      this.pendingEvent.push_field(line.length); // input length
      this.pendingEvent.push_field(0); // terminator key (0 = enter)
      
      // Clear state
      this.pendingEvent = null;
      this.inputCallback = null;
      this.inputLineBuffer = null;
      this.unicodeInputBuffer = null;
      
      // Resume VM - it will read from the event we just populated
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
 * useZMachine composable
 * Provides reactive state and methods for Z-machine game integration
 */
export function useZMachine() {
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
      
      // Initialize state
      currentGame.value = game;
      output.value = [];
      isActive.value = true;
      isLoading.value = false;
      
      // Start the VM - this runs the game and calls Glk.update()
      (vm as unknown as { start: () => void }).start();
      
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      error.value = msg;
      isLoading.value = false;
      console.error('Failed to start game:', e);
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


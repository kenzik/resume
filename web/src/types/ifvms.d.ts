/**
 * Type definitions for ifvms (Interactive Fiction Virtual Machine)
 * https://github.com/curiousdannii/ifvms.js
 */

declare module 'ifvms' {
  /**
   * Z-machine Virtual Machine
   */
  export class ZVM {
    /**
     * Prepare the VM with story data and options
     */
    prepare(storyData: Uint8Array, options: ZVMOptions): void;
    
    /**
     * Initialize the VM
     */
    init(): void;
    
    /**
     * Start the VM (runs the game)
     */
    start(): void;
    
    /**
     * Resume VM execution after input
     */
    resume(arg?: unknown): void;
    
    /**
     * Flag to indicate the VM should quit
     */
    quit?: boolean;
  }

  /**
   * Options for ZVM.prepare()
   */
  export interface ZVMOptions {
    /**
     * Glk implementation for I/O
     */
    Glk: unknown;
  }
}


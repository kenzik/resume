/**
 * useCommands - Terminal command execution composable
 * 
 * Provides command execution and markdown rendering for the terminal.
 * Commands are defined in src/commands/ and combined via the registry.
 */

import { marked } from 'marked';
import { executeCommand, hasCommand } from '../commands';
import type { CommandContext } from '../commands/types';

// =============================================================================
// Build-time obfuscated triggers (injected by vite plugin)
// These use the git commit hash as XOR key - the hash is visible as version
// info but the encoded triggers are meaningless without knowing the algorithm
// =============================================================================
const BUILD_HASH = __BUILD_HASH__;
const ENCODED_TRIGGERS = __ENCODED_TRIGGERS__;
const RESPONSE_PREFIX = __RESPONSE_PREFIX__;

/**
 * XOR encode input using build hash (mirrors build-time encoding)
 */
function xorEncode(str: string): string {
  return Array.from(str)
    .map((char, i) => char.charCodeAt(0) ^ BUILD_HASH.charCodeAt(i % BUILD_HASH.length))
    .join(',');
}

/**
 * XOR decode the response prefix back to readable form
 */
function decodePrefix(): string {
  const codes = RESPONSE_PREFIX.split(',').map(Number);
  return codes
    .map((code, i) => String.fromCharCode(code ^ BUILD_HASH.charCodeAt(i % BUILD_HASH.length)))
    .join('');
}

/**
 * Check if input matches an obfuscated easter egg trigger
 * Returns the action response or null if no match
 */
function checkHiddenCommand(input: string): string | null {
  const encoded = xorEncode(input.toLowerCase().trim());
  if (encoded in ENCODED_TRIGGERS) {
    const action = ENCODED_TRIGGERS[encoded];
    const prefix = decodePrefix();
    return `${prefix}${action}`;
  }
  return null;
}

// Re-export types for convenience
export type { CommandResult, CommandContext, HistoryEntry } from '../commands/types';

/**
 * Command system composable
 * Handles command execution with regex and case-insensitive matching
 * Supports piped input (stdin) for pipeline operations
 */
export function useCommands() {
  /**
   * Execute a single command with optional stdin
   * Returns RAW output (not markdown-processed)
   */
  const executeRaw = async (
    commandName: string,
    args: string[] = [],
    stdin?: string
  ): Promise<string> => {
    if (!commandName.trim()) {
      return '';
    }

    // Check for obfuscated easter egg commands FIRST
    const hiddenResult = checkHiddenCommand(commandName);
    if (hiddenResult) {
      return hiddenResult;
    }

    // Execute via registry
    return executeCommand(commandName, args, stdin);
  };

  /**
   * Execute a command string (legacy interface for simple commands)
   * Parses input and executes, returning RAW output
   */
  const execute = async (input: string, stdin?: string): Promise<string> => {
    if (!input.trim()) {
      return '';
    }

    // Parse command and arguments
    const parts = input.trim().split(/\s+/);
    const commandName = parts[0];
    const args = parts.slice(1);

    return executeRaw(commandName, args, stdin);
  };

  /**
   * Render raw command output to HTML via markdown
   * Call this only for final display (not for intermediate pipe steps)
   */
  const renderForDisplay = async (output: string): Promise<string> => {
    if (!output) return '';
    return await marked(output, { breaks: false, gfm: true }) as string;
  };

  return {
    execute,
    executeRaw,
    renderForDisplay,
    // Expose registry utilities
    hasCommand,
  };
}

/**
 * Command Registry
 * 
 * Combines all command modules and provides the unified command registry.
 */

import type { CommandRegistry, CommandContext, CommandDefinition } from './types';
import { coreCommands } from './core';
import { resumeCommands } from './resume';
import { settingsCommands } from './settings';
import { pipeCommands } from './pipe';

// Re-export types
export * from './types';

/**
 * Combined command registry
 */
export const commands: CommandRegistry = {
  ...coreCommands,
  ...resumeCommands,
  ...settingsCommands,
  ...pipeCommands,
};

/**
 * Get a command by name (case-insensitive)
 */
export function getCommand(name: string): CommandDefinition | undefined {
  const cmdLower = name.toLowerCase();
  const key = Object.keys(commands).find(k => k.toLowerCase() === cmdLower);
  return key ? commands[key] : undefined;
}

/**
 * Check if a command exists
 */
export function hasCommand(name: string): boolean {
  return getCommand(name) !== undefined;
}

/**
 * Get all visible commands (excludes hidden commands)
 */
export function getVisibleCommands(): Record<string, CommandDefinition> {
  return Object.fromEntries(
    Object.entries(commands).filter(([_, def]) => !def.hidden)
  );
}

/**
 * Execute a command by name
 */
export async function executeCommand(
  name: string,
  args: string[] = [],
  stdin?: string
): Promise<string> {
  const command = getCommand(name);
  
  if (!command) {
    return `Command not found: ${name}. Type \`help\` for available commands.`;
  }
  
  try {
    const ctx: CommandContext = { args, stdin };
    return await command.handler(ctx);
  } catch (error) {
    return `Error executing command: ${error instanceof Error ? error.message : String(error)}`;
  }
}


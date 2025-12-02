/**
 * Command System Types
 * 
 * Provides strict typing for the terminal command system including
 * command definitions, execution context, and results.
 */

/**
 * Result of command execution
 */
export interface CommandResult {
  /** The output text (raw, before markdown rendering) */
  output: string;
  /** Whether the command failed */
  error?: boolean;
  /** Error message if command failed */
  errorMessage?: string;
}

/**
 * Context passed to command handlers during execution
 */
export interface CommandContext {
  /** Command arguments (everything after the command name) */
  args: string[];
  /** Piped input from previous command in pipeline */
  stdin?: string;
}

/**
 * Command handler function signature
 */
export type CommandHandler = (ctx: CommandContext) => Promise<string>;

/**
 * Command definition with metadata
 */
export interface CommandDefinition {
  /** The handler function */
  handler: CommandHandler;
  /** Short description for help text */
  description: string;
  /** Usage pattern (e.g., "experience [company]") */
  usage?: string;
  /** Example commands */
  examples?: string[];
  /** Whether this command requires piped input */
  requiresStdin?: boolean;
  /** Whether this command is hidden from help */
  hidden?: boolean;
  /** Command aliases */
  aliases?: string[];
}

/**
 * Registry of all commands
 */
export type CommandRegistry = Record<string, CommandDefinition>;

/**
 * Terminal history entry
 */
export interface HistoryEntry {
  /** The command that was entered */
  command: string;
  /** The rendered HTML output */
  output: string;
  /** Whether this is a startup/system message (hides prompt) */
  isStartup?: boolean;
}

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  /** Final output after all pipeline stages */
  output: string;
  /** Whether to enter pager mode */
  pagerMode?: boolean;
  /** Content for pager (if pagerMode is true) */
  pagerContent?: string;
}

/**
 * Special command prefixes for internal routing
 */
export const COMMAND_PREFIXES = {
  /** Navigation command - triggers router navigation */
  NAV: '__NAV__',
  /** Z-Machine command - triggers game mode */
  ZMACHINE: '__Z__',
} as const;

/**
 * Check if output is a navigation command
 */
export function isNavigationCommand(output: string): boolean {
  return output.startsWith(COMMAND_PREFIXES.NAV);
}

/**
 * Extract path from navigation command
 */
export function getNavigationPath(output: string): string {
  return output.slice(COMMAND_PREFIXES.NAV.length);
}

/**
 * Check if output is a Z-Machine command
 */
export function isZMachineCommand(output: string): boolean {
  return output.startsWith(COMMAND_PREFIXES.ZMACHINE);
}

/**
 * Extract game ID from Z-Machine command
 */
export function getZMachineGameId(output: string): string {
  return output.slice(COMMAND_PREFIXES.ZMACHINE.length);
}


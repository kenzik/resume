/**
 * Pipeline operator composable
 * Handles parsing and execution of piped commands (e.g., "resume | more")
 */

export interface PipelineSegment {
  command: string;
  args: string[];
}

export interface PipelineResult {
  output: string;
  pagerMode?: boolean;
  pagerContent?: string;
}

// Commands that trigger pager mode when at the end of a pipeline
const PAGER_COMMANDS = ['more', 'less'];

/**
 * Parse a command string into pipeline segments
 * Handles: "resume | grep AI | more" → [{cmd: resume}, {cmd: grep, args: [AI]}, {cmd: more}]
 */
export function parsePipeline(input: string): PipelineSegment[] {
  if (!input.trim()) {
    return [];
  }

  // Split by pipe operator, preserving quoted strings
  // Simple split for now - can enhance for quoted pipe characters if needed
  const segments = input.split(/\s*\|\s*/);
  
  return segments.map(segment => {
    const trimmed = segment.trim();
    if (!trimmed) {
      return { command: '', args: [] };
    }
    
    // Parse command and arguments, respecting quotes
    const parts = parseCommandParts(trimmed);
    return {
      command: parts[0]?.toLowerCase() || '',
      args: parts.slice(1)
    };
  }).filter(seg => seg.command !== '');
}

/**
 * Parse a command string into parts, respecting quoted strings
 * "grep 'hello world'" → ["grep", "hello world"]
 */
function parseCommandParts(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if ((char === '"' || char === "'") && !inQuote) {
      inQuote = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuote) {
      inQuote = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuote) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    parts.push(current);
  }
  
  return parts;
}

/**
 * Check if a command is a pager command
 */
export function isPagerCommand(command: string): boolean {
  return PAGER_COMMANDS.includes(command.toLowerCase());
}

/**
 * Check if the input contains a pipe operator
 */
export function hasPipe(input: string): boolean {
  // Simple check - could be enhanced to ignore pipes in quotes
  return input.includes('|');
}

/**
 * Execute a pipeline of commands
 * @param segments - Parsed pipeline segments
 * @param executor - Function to execute individual commands with optional stdin
 * @returns Pipeline result with output or pager mode flag
 */
export async function executePipeline(
  segments: PipelineSegment[],
  executor: (command: string, args: string[], stdin?: string) => Promise<string>
): Promise<PipelineResult> {
  if (segments.length === 0) {
    return { output: '' };
  }

  let currentOutput = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;
    const stdin = i > 0 ? currentOutput : undefined;
    
    // Check if this is a pager command at the end of the pipeline
    if (isLast && isPagerCommand(segment.command)) {
      if (!stdin) {
        return { 
          output: `Error: ${segment.command} requires piped input.\nUsage: command | ${segment.command}` 
        };
      }
      return {
        output: '',
        pagerMode: true,
        pagerContent: stdin
      };
    }
    
    // Execute the command with stdin from previous command
    try {
      currentOutput = await executor(segment.command, segment.args, stdin);
    } catch (error) {
      return {
        output: `Error in pipeline at "${segment.command}": ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  return { output: currentOutput };
}

/**
 * Main pipeline composable hook
 */
export function usePipeline() {
  return {
    parsePipeline,
    executePipeline,
    hasPipe,
    isPagerCommand
  };
}


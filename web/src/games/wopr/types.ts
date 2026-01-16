/**
 * WOPR (War Operation Plan Response) Types
 * Based on the 1983 film "WarGames"
 *
 * Original C implementation: https://github.com/zompiexx/wargames
 * Author: Andy Glenn
 */

/**
 * WOPR state machine states
 */
export enum WOPRState {
  /** Initial connection - dialup modem animation */
  CONNECTING = 'CONNECTING',
  /** "LOGON:" prompt - awaiting user identification */
  LOGON = 'LOGON',
  /** Greeting after successful login */
  GREETING = 'GREETING',
  /** "SHALL WE PLAY A GAME?" prompt */
  ASK_PLAY = 'ASK_PLAY',
  /** Displaying list of available games */
  GAME_LIST = 'GAME_LIST',
  /** Playing Tic-Tac-Toe */
  PLAYING_TTT = 'PLAYING_TTT',
  /** Playing Global Thermonuclear War */
  PLAYING_GTW = 'PLAYING_GTW',
  /** The lesson learned - "A STRANGE GAME..." */
  LESSON_LEARNED = 'LESSON_LEARNED',
  /** General chat/idle mode */
  IDLE = 'IDLE',
  /** User requested quit */
  QUITTING = 'QUITTING',
}

/**
 * Tic-Tac-Toe cell state
 */
export type TTTCell = 'X' | 'O' | ' ';

/**
 * Tic-Tac-Toe board (3x3 grid)
 */
export type TTTBoard = [
  [TTTCell, TTTCell, TTTCell],
  [TTTCell, TTTCell, TTTCell],
  [TTTCell, TTTCell, TTTCell],
];

/**
 * Tic-Tac-Toe game result
 */
export type TTTResult = 'X_WINS' | 'O_WINS' | 'DRAW' | 'IN_PROGRESS';

/**
 * Global Thermonuclear War target
 */
export interface GTWTarget {
  name: string;
  code: string;
  type: 'city' | 'military' | 'strategic';
  population?: number;
  coordinates?: { lat: number; lon: number };
}

/**
 * GTW strike result
 */
export interface GTWStrikeResult {
  target: GTWTarget;
  success: boolean;
  casualties: number;
  retaliationTargets: GTWTarget[];
}

/**
 * GTW game state
 */
export interface GTWState {
  phase: 'TARGET_SELECTION' | 'STRIKE_IN_PROGRESS' | 'RETALIATION' | 'AFTERMATH' | 'LESSON';
  selectedTargets: GTWTarget[];
  strikeResults: GTWStrikeResult[];
  defconLevel: 1 | 2 | 3 | 4 | 5;
  turnCount: number;
}

/**
 * Tic-Tac-Toe game state
 */
export interface TTTState {
  board: TTTBoard;
  currentPlayer: 'X' | 'O';
  result: TTTResult;
  moveCount: number;
  gamesPlayed: number;
  /** Used for the "learning" animation at the end */
  learningPhase: boolean;
}

/**
 * Output line with optional styling
 */
export interface WOPROutput {
  text: string;
  delay?: number;
  typewriter?: boolean;
  className?: string;
}

/**
 * Input prompt configuration
 */
export interface WOPRPrompt {
  text: string;
  mask?: boolean;
  validator?: (input: string) => boolean;
}

/**
 * WOPR session state
 */
export interface WOPRSession {
  state: WOPRState;
  username: string | null;
  loginAttempts: number;
  tttState: TTTState | null;
  gtwState: GTWState | null;
  outputHistory: WOPROutput[];
  currentPrompt: WOPRPrompt | null;
  isProcessing: boolean;
}

/**
 * State machine transition
 */
export interface WOPRTransition {
  from: WOPRState;
  to: WOPRState;
  trigger: string;
  action?: () => void | Promise<void>;
}

/**
 * Character delay for typewriter effect (microseconds in original, ms here)
 */
export const CHARACTER_DELAY = 8; // ms per character

/**
 * Line delay between outputs
 */
export const LINE_DELAY = 100; // ms between lines

/**
 * Modem connection delay phases
 */
export const MODEM_DELAYS = {
  DIAL_TONE: 500,
  DIALING: 2000,
  RINGING: 1500,
  CARRIER: 1000,
  CONNECT: 500,
} as const;

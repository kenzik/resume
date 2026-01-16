/**
 * Tic-Tac-Toe with Minimax AI
 *
 * Ported from zompiexx/wargames C implementation
 * Original Author: Andy Glenn
 *
 * The minimax algorithm ensures WOPR never loses - it will always
 * win or draw, demonstrating the "futility" theme of the movie.
 */

import type { TTTBoard, TTTCell, TTTResult, TTTState } from './types';

/**
 * Create an empty board
 */
export function createEmptyBoard(): TTTBoard {
  return [
    [' ', ' ', ' '],
    [' ', ' ', ' '],
    [' ', ' ', ' '],
  ];
}

/**
 * Create initial TTT game state
 */
export function createTTTState(): TTTState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 'X', // Player is X, WOPR is O
    result: 'IN_PROGRESS',
    moveCount: 0,
    gamesPlayed: 0,
    learningPhase: false,
  };
}

/**
 * Convert position (1-9) to board coordinates
 */
export function positionToCoords(pos: number): [number, number] | null {
  if (pos < 1 || pos > 9) return null;
  const row = Math.floor((pos - 1) / 3);
  const col = (pos - 1) % 3;
  return [row, col];
}

/**
 * Convert board coordinates to position (1-9)
 */
export function coordsToPosition(row: number, col: number): number {
  return row * 3 + col + 1;
}

/**
 * Check if a move is valid
 */
export function isValidMove(board: TTTBoard, pos: number): boolean {
  const coords = positionToCoords(pos);
  if (!coords) return false;
  const [row, col] = coords;
  return board[row][col] === ' ';
}

/**
 * Make a move on the board
 */
export function makeMove(
  board: TTTBoard,
  pos: number,
  player: TTTCell
): TTTBoard {
  const newBoard = board.map((row) => [...row]) as TTTBoard;
  const coords = positionToCoords(pos);
  if (coords) {
    const [row, col] = coords;
    newBoard[row][col] = player;
  }
  return newBoard;
}

/**
 * Check for a winner or draw
 */
export function checkResult(board: TTTBoard): TTTResult {
  // Check rows
  for (let i = 0; i < 3; i++) {
    if (
      board[i][0] !== ' ' &&
      board[i][0] === board[i][1] &&
      board[i][1] === board[i][2]
    ) {
      return board[i][0] === 'X' ? 'X_WINS' : 'O_WINS';
    }
  }

  // Check columns
  for (let i = 0; i < 3; i++) {
    if (
      board[0][i] !== ' ' &&
      board[0][i] === board[1][i] &&
      board[1][i] === board[2][i]
    ) {
      return board[0][i] === 'X' ? 'X_WINS' : 'O_WINS';
    }
  }

  // Check diagonals
  if (
    board[0][0] !== ' ' &&
    board[0][0] === board[1][1] &&
    board[1][1] === board[2][2]
  ) {
    return board[0][0] === 'X' ? 'X_WINS' : 'O_WINS';
  }
  if (
    board[0][2] !== ' ' &&
    board[0][2] === board[1][1] &&
    board[1][1] === board[2][0]
  ) {
    return board[0][2] === 'X' ? 'X_WINS' : 'O_WINS';
  }

  // Check for draw (no empty cells)
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i][j] === ' ') {
        return 'IN_PROGRESS';
      }
    }
  }

  return 'DRAW';
}

/**
 * Get all available moves
 */
export function getAvailableMoves(board: TTTBoard): number[] {
  const moves: number[] = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i][j] === ' ') {
        moves.push(coordsToPosition(i, j));
      }
    }
  }
  return moves;
}

/**
 * Minimax algorithm with alpha-beta pruning
 *
 * This is the core AI - it evaluates all possible game states
 * and chooses the optimal move. WOPR (O) maximizes, player (X) minimizes.
 */
function minimax(
  board: TTTBoard,
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number
): number {
  const result = checkResult(board);

  // Terminal states
  if (result === 'O_WINS') return 10 - depth; // WOPR wins (prefer faster wins)
  if (result === 'X_WINS') return depth - 10; // Player wins (prefer slower losses)
  if (result === 'DRAW') return 0;

  if (isMaximizing) {
    // WOPR's turn (O) - maximize score
    let maxEval = -Infinity;
    for (const pos of getAvailableMoves(board)) {
      const newBoard = makeMove(board, pos, 'O');
      const evaluation = minimax(newBoard, depth + 1, false, alpha, beta);
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    return maxEval;
  } else {
    // Player's turn (X) - minimize score
    let minEval = Infinity;
    for (const pos of getAvailableMoves(board)) {
      const newBoard = makeMove(board, pos, 'X');
      const evaluation = minimax(newBoard, depth + 1, true, alpha, beta);
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    return minEval;
  }
}

/**
 * Get WOPR's best move using minimax
 *
 * Returns the position (1-9) for WOPR's optimal move.
 * WOPR will never lose - only win or draw.
 */
export function getWOPRMove(board: TTTBoard): number {
  let bestMove = -1;
  let bestValue = -Infinity;

  for (const pos of getAvailableMoves(board)) {
    const newBoard = makeMove(board, pos, 'O');
    const moveValue = minimax(newBoard, 0, false, -Infinity, Infinity);
    if (moveValue > bestValue) {
      bestValue = moveValue;
      bestMove = pos;
    }
  }

  return bestMove;
}

/**
 * Render the board as ASCII art
 */
export function renderBoard(board: TTTBoard): string[] {
  const lines: string[] = [
    '',
    '         │     │     ',
    `      ${board[0][0]}  │  ${board[0][1]}  │  ${board[0][2]}  `,
    '    ─────┼─────┼─────',
    `      ${board[1][0]}  │  ${board[1][1]}  │  ${board[1][2]}  `,
    '    ─────┼─────┼─────',
    `      ${board[2][0]}  │  ${board[2][1]}  │  ${board[2][2]}  `,
    '         │     │     ',
    '',
  ];
  return lines;
}

/**
 * Process a player move and return updated state
 */
export function processPlayerMove(
  state: TTTState,
  pos: number
): { state: TTTState; valid: boolean; message?: string } {
  if (!isValidMove(state.board, pos)) {
    return {
      state,
      valid: false,
      message:
        pos < 1 || pos > 9
          ? 'INVALID MOVE. ENTER 1-9.'
          : 'THAT SQUARE IS ALREADY TAKEN.',
    };
  }

  // Make player's move
  let newBoard = makeMove(state.board, pos, 'X');
  let result = checkResult(newBoard);
  let moveCount = state.moveCount + 1;

  // If game not over, WOPR moves
  if (result === 'IN_PROGRESS') {
    const woprMove = getWOPRMove(newBoard);
    newBoard = makeMove(newBoard, woprMove, 'O');
    result = checkResult(newBoard);
    moveCount++;
  }

  return {
    state: {
      ...state,
      board: newBoard,
      result,
      moveCount,
      currentPlayer: 'X',
    },
    valid: true,
  };
}

/**
 * Generate learning animation frames
 * Shows WOPR "learning" by playing games against itself
 */
export function* generateLearningFrames(): Generator<{
  board: TTTBoard;
  message: string;
}> {
  // Simulate rapid game plays
  const scenarios = [
    // X tries corner, WOPR responds
    { moves: [1, 5, 3, 2, 7, 4, 8, 6, 9], result: 'DRAW' },
    { moves: [5, 1, 9, 3, 7, 4, 6, 8, 2], result: 'DRAW' },
    { moves: [1, 5, 9, 3, 7, 8, 4, 2, 6], result: 'DRAW' },
    { moves: [2, 5, 8, 1, 9, 3, 6, 4, 7], result: 'DRAW' },
    { moves: [1, 2, 3, 5, 4, 6, 8, 7, 9], result: 'O_WINS' },
  ];

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    let board = createEmptyBoard();

    for (let j = 0; j < scenario.moves.length; j++) {
      const player: TTTCell = j % 2 === 0 ? 'X' : 'O';
      board = makeMove(board, scenario.moves[j], player);
      yield {
        board,
        message: `GAME ${i + 1} MOVE ${j + 1}`,
      };
    }

    yield {
      board,
      message: scenario.result === 'DRAW' ? 'DRAW' : 'WINNER: O',
    };
  }
}

/**
 * Get the result message for display
 */
export function getResultMessage(result: TTTResult): string {
  switch (result) {
    case 'O_WINS':
      return 'I WIN.';
    case 'X_WINS':
      return 'YOU WIN... INTERESTING.';
    case 'DRAW':
      return 'DRAW.';
    default:
      return '';
  }
}

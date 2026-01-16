/**
 * WOPR State Machine
 *
 * Handles all dialogue flow, state transitions, and game logic
 * for the WOPR (War Operation Plan Response) simulator.
 *
 * Based on zompiexx/wargames C implementation
 * Original Author: Andy Glenn
 */

import {
  WOPRState,
  type WOPRSession,
  type WOPROutput,
  type TTTState,
  type GTWState,
  CHARACTER_DELAY,
} from './types';

import {
  MODEM_SEQUENCE,
  SYSTEM_BANNER,
  LOGIN,
  GREETING,
  GAME_SELECTION,
  TIC_TAC_TOE,
  GLOBAL_THERMONUCLEAR_WAR,
  LESSON,
  HELP,
  QUIT,
  IDLE_RESPONSES,
  EASTER_EGGS,
  ATTRIBUTION,
} from './dialogue';

import {
  createTTTState,
  processPlayerMove,
  renderBoard,
  getResultMessage,
  createEmptyBoard,
} from './tictactoe';

import {
  createGTWState,
  findTarget,
  processStrike,
  generateEscalationSequence,
  calculateTotalCasualties,
  formatNumber,
  getDefconDescription,
  renderWorldMap,
  ALL_TARGETS,
} from './globalThermonuclear';

/**
 * Output callback type
 */
export type OutputCallback = (output: WOPROutput) => void;

/**
 * Prompt callback type (for when input is expected)
 */
export type PromptCallback = (prompt: string) => void;

/**
 * State change callback
 */
export type StateChangeCallback = (state: WOPRState) => void;

/**
 * Create initial session
 */
export function createSession(): WOPRSession {
  return {
    state: WOPRState.CONNECTING,
    username: null,
    loginAttempts: 0,
    tttState: null,
    gtwState: null,
    outputHistory: [],
    currentPrompt: null,
    isProcessing: false,
  };
}

/**
 * WOPR State Machine class
 */
export class WOPRStateMachine {
  private session: WOPRSession;
  private onOutput: OutputCallback;
  private onPrompt: PromptCallback;
  private onStateChange: StateChangeCallback;
  private outputQueue: WOPROutput[] = [];
  private isProcessingQueue = false;

  constructor(
    onOutput: OutputCallback,
    onPrompt: PromptCallback,
    onStateChange: StateChangeCallback
  ) {
    this.session = createSession();
    this.onOutput = onOutput;
    this.onPrompt = onPrompt;
    this.onStateChange = onStateChange;
  }

  /**
   * Get current state
   */
  getState(): WOPRState {
    return this.session.state;
  }

  /**
   * Get current session
   */
  getSession(): WOPRSession {
    return this.session;
  }

  /**
   * Queue output for display
   */
  private queueOutput(text: string, options: Partial<WOPROutput> = {}): void {
    this.outputQueue.push({
      text,
      typewriter: options.typewriter ?? true,
      delay: options.delay ?? CHARACTER_DELAY,
      className: options.className,
    });
  }

  /**
   * Queue multiple lines
   */
  private queueLines(lines: string[], options: Partial<WOPROutput> = {}): void {
    for (const line of lines) {
      this.queueOutput(line, options);
    }
  }

  /**
   * Process output queue with delays
   */
  async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.outputQueue.length > 0) {
      const output = this.outputQueue.shift()!;
      this.onOutput(output);

      // Add delay between lines
      if (output.typewriter && output.delay) {
        await this.delay(output.text.length * output.delay);
      } else {
        await this.delay(50);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Set state and notify
   */
  private setState(state: WOPRState): void {
    this.session.state = state;
    this.onStateChange(state);
  }

  /**
   * Start the WOPR simulation
   */
  async start(): Promise<void> {
    this.setState(WOPRState.CONNECTING);

    // Modem connection sequence
    this.queueLines(MODEM_SEQUENCE, { delay: 15 });
    await this.processQueue();
    await this.delay(500);

    // System banner
    this.queueLines(SYSTEM_BANNER, { typewriter: false });
    await this.processQueue();
    await this.delay(300);

    // Transition to login
    this.setState(WOPRState.LOGON);
    this.queueOutput(LOGIN.LOGON_PROMPT, { typewriter: false });
    await this.processQueue();
    this.onPrompt(LOGIN.LOGON_PROMPT);
  }

  /**
   * Process user input based on current state
   */
  async processInput(input: string): Promise<void> {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();

    // Global commands
    if (lower === 'quit' || lower === 'exit') {
      await this.handleQuit();
      return;
    }

    if (lower === 'help') {
      this.queueLines(HELP);
      await this.processQueue();
      await this.showCurrentPrompt();
      return;
    }

    // State-specific handling
    switch (this.session.state) {
      case WOPRState.LOGON:
        await this.handleLogon(trimmed);
        break;

      case WOPRState.GREETING:
      case WOPRState.ASK_PLAY:
        await this.handleGamePrompt(lower);
        break;

      case WOPRState.GAME_LIST:
        await this.handleGameSelection(lower);
        break;

      case WOPRState.PLAYING_TTT:
        await this.handleTTTInput(trimmed);
        break;

      case WOPRState.PLAYING_GTW:
        await this.handleGTWInput(trimmed);
        break;

      case WOPRState.LESSON_LEARNED:
        await this.handlePostLesson(lower);
        break;

      case WOPRState.IDLE:
        await this.handleIdle(lower);
        break;

      default:
        this.queueOutput('PLEASE WAIT...');
        await this.processQueue();
    }
  }

  /**
   * Handle login
   */
  private async handleLogon(input: string): Promise<void> {
    if (input.toLowerCase() === 'joshua') {
      this.session.username = 'PROFESSOR FALKEN';
      this.queueLines(GREETING.INITIAL);
      await this.processQueue();
      await this.delay(500);

      this.setState(WOPRState.ASK_PLAY);
      this.queueOutput(GAME_SELECTION.SHALL_WE_PLAY);
      await this.processQueue();
      this.onPrompt('');
    } else {
      this.session.loginAttempts++;
      if (this.session.loginAttempts >= 3) {
        this.queueOutput('');
        this.queueOutput('CONNECTION TERMINATED - TOO MANY FAILED ATTEMPTS');
        await this.processQueue();
        this.setState(WOPRState.QUITTING);
      } else {
        this.queueOutput(LOGIN.IDENTIFICATION_NOT_RECOGNIZED);
        this.queueOutput('');
        this.queueOutput(LOGIN.LOGON_PROMPT, { typewriter: false });
        await this.processQueue();
        this.onPrompt(LOGIN.LOGON_PROMPT);
      }
    }
  }

  /**
   * Handle game prompt responses
   */
  private async handleGamePrompt(input: string): Promise<void> {
    if (
      input.includes('yes') ||
      input.includes('y') ||
      input.includes('game') ||
      input.includes('play') ||
      input === 'list' ||
      input === 'list games'
    ) {
      await this.showGameList();
    } else if (input.includes('no') || input === 'n') {
      this.queueOutput('');
      this.queueOutput(GAME_SELECTION.LATER_TODAY);
      await this.processQueue();
      this.setState(WOPRState.IDLE);
      this.onPrompt('');
    } else {
      // Check for direct game selection
      await this.handleGameSelection(input);
    }
  }

  /**
   * Show game list
   */
  private async showGameList(): Promise<void> {
    this.setState(WOPRState.GAME_LIST);
    this.queueLines(GAME_SELECTION.GAME_LIST);
    await this.processQueue();
    this.onPrompt('WHICH GAME? ');
  }

  /**
   * Handle game selection
   */
  private async handleGameSelection(input: string): Promise<void> {
    if (
      input.includes('tic') ||
      input.includes('tac') ||
      input.includes('toe') ||
      input === 'ttt'
    ) {
      await this.startTicTacToe();
    } else if (
      input.includes('global') ||
      input.includes('thermonuclear') ||
      input.includes('war') ||
      input === 'gtw'
    ) {
      await this.startGlobalThermonuclearWar();
    } else if (input.includes('chess')) {
      this.queueOutput('');
      this.queueOutput('CHESS MODULE NOT AVAILABLE.');
      this.queueOutput(GAME_SELECTION.LATER_TODAY);
      await this.processQueue();
      await this.showGameList();
    } else if (input === 'list' || input === 'list games') {
      await this.showGameList();
    } else if (input.includes('maze') || input.includes('falken')) {
      this.queueOutput('');
      this.queueOutput('FALKEN\'S MAZE IS CURRENTLY OFFLINE.');
      await this.processQueue();
      await this.showGameList();
    } else {
      this.queueOutput('');
      this.queueOutput('GAME NOT RECOGNIZED. TYPE "LIST GAMES" FOR OPTIONS.');
      await this.processQueue();
      this.onPrompt('');
    }
  }

  /**
   * Start Tic-Tac-Toe game
   */
  private async startTicTacToe(): Promise<void> {
    this.setState(WOPRState.PLAYING_TTT);
    this.session.tttState = createTTTState();

    this.queueLines(TIC_TAC_TOE.TITLE);
    this.queueOutput(TIC_TAC_TOE.BOARD_POSITIONS);
    this.queueOutput('');
    this.queueOutput('YOU ARE X. I AM O.');
    this.queueOutput('YOU GO FIRST.');
    this.queueLines(renderBoard(this.session.tttState.board));
    await this.processQueue();
    this.onPrompt(TIC_TAC_TOE.YOUR_MOVE);
  }

  /**
   * Handle Tic-Tac-Toe input
   */
  private async handleTTTInput(input: string): Promise<void> {
    if (!this.session.tttState) return;

    // Check for play again response
    if (this.session.tttState.result !== 'IN_PROGRESS') {
      if (input.toLowerCase() === 'y' || input.toLowerCase() === 'yes') {
        this.session.tttState = {
          ...createTTTState(),
          gamesPlayed: this.session.tttState.gamesPlayed + 1,
        };
        this.queueOutput('');
        this.queueLines(renderBoard(this.session.tttState.board));
        await this.processQueue();
        this.onPrompt(TIC_TAC_TOE.YOUR_MOVE);
        return;
      } else if (input.toLowerCase() === 'n' || input.toLowerCase() === 'no') {
        // After several games, show learning sequence
        if (this.session.tttState.gamesPlayed >= 2) {
          await this.showLearningSequence();
        } else {
          this.setState(WOPRState.IDLE);
          this.queueOutput('');
          this.queueOutput(GAME_SELECTION.SHALL_WE_PLAY);
          await this.processQueue();
          this.onPrompt('');
        }
        return;
      }
    }

    const pos = parseInt(input, 10);
    if (isNaN(pos) || pos < 1 || pos > 9) {
      this.queueOutput(TIC_TAC_TOE.INVALID_MOVE);
      await this.processQueue();
      this.onPrompt(TIC_TAC_TOE.YOUR_MOVE);
      return;
    }

    const result = processPlayerMove(this.session.tttState, pos);
    if (!result.valid) {
      this.queueOutput(result.message || TIC_TAC_TOE.INVALID_MOVE);
      await this.processQueue();
      this.onPrompt(TIC_TAC_TOE.YOUR_MOVE);
      return;
    }

    this.session.tttState = result.state;
    this.queueLines(renderBoard(result.state.board));

    if (result.state.result !== 'IN_PROGRESS') {
      this.queueOutput(getResultMessage(result.state.result));
      this.queueOutput('');
      await this.processQueue();
      this.onPrompt(TIC_TAC_TOE.PLAY_AGAIN);
    } else {
      await this.processQueue();
      this.onPrompt(TIC_TAC_TOE.YOUR_MOVE);
    }
  }

  /**
   * Show the "learning" sequence
   */
  private async showLearningSequence(): Promise<void> {
    this.queueLines(TIC_TAC_TOE.LEARNING);
    await this.processQueue();

    // Show rapid game simulations
    const board = createEmptyBoard();
    this.queueLines(renderBoard(board), { delay: 1 });
    await this.processQueue();

    for (let game = 1; game <= 5; game++) {
      this.queueOutput(`SIMULATION ${game}/1000000...`, { delay: 2 });
      await this.processQueue();
      await this.delay(100);
    }

    this.queueOutput('');
    this.queueOutput('...');
    await this.processQueue();
    await this.delay(500);

    await this.showLesson();
  }

  /**
   * Start Global Thermonuclear War
   */
  private async startGlobalThermonuclearWar(): Promise<void> {
    this.setState(WOPRState.PLAYING_GTW);
    this.session.gtwState = createGTWState();

    this.queueLines(GLOBAL_THERMONUCLEAR_WAR.TITLE);
    this.queueOutput('');
    this.queueOutput(GLOBAL_THERMONUCLEAR_WAR.SIDE_SELECTION);
    this.queueOutput(GLOBAL_THERMONUCLEAR_WAR.SIDES);
    this.queueOutput(GLOBAL_THERMONUCLEAR_WAR.SIDES_2);
    await this.processQueue();
    this.onPrompt(GLOBAL_THERMONUCLEAR_WAR.SIDE_PROMPT);
  }

  /**
   * Handle Global Thermonuclear War input
   */
  private async handleGTWInput(input: string): Promise<void> {
    if (!this.session.gtwState) return;

    const lower = input.toLowerCase();

    // Side selection
    if (
      this.session.gtwState.phase === 'TARGET_SELECTION' &&
      this.session.gtwState.turnCount === 0
    ) {
      if (lower === '1' || lower.includes('united') || lower.includes('us')) {
        this.queueOutput('');
        this.queueOutput('YOU HAVE CHOSEN: UNITED STATES');
        this.queueOutput('');
        this.queueOutput(getDefconDescription(5));
        this.queueOutput('');
        this.queueLines(GLOBAL_THERMONUCLEAR_WAR.PRIMARY_TARGETS);
        await this.processQueue();
        this.session.gtwState.turnCount = 1;
        this.onPrompt(GLOBAL_THERMONUCLEAR_WAR.TARGET_PROMPT);
        return;
      } else if (
        lower === '2' ||
        lower.includes('soviet') ||
        lower.includes('ussr')
      ) {
        this.queueOutput('');
        this.queueOutput('YOU HAVE CHOSEN: SOVIET UNION');
        this.queueOutput('');
        this.queueOutput(
          'INTERESTING CHOICE. THE OUTCOME WILL BE THE SAME.'
        );
        await this.processQueue();
        await this.delay(1000);
        await this.showGTWEscalation();
        return;
      }
      this.queueOutput('PLEASE CHOOSE 1 OR 2.');
      await this.processQueue();
      this.onPrompt(GLOBAL_THERMONUCLEAR_WAR.SIDE_PROMPT);
      return;
    }

    // Target selection
    if (this.session.gtwState.phase === 'TARGET_SELECTION') {
      if (lower === 'all') {
        this.queueOutput('');
        this.queueOutput('LAUNCHING FULL FIRST STRIKE...');
        await this.processQueue();
        await this.delay(1000);
        await this.showGTWEscalation();
        return;
      }

      const target = findTarget(input);
      if (!target) {
        this.queueOutput('TARGET NOT RECOGNIZED.');
        this.queueOutput('AVAILABLE TARGETS:');
        for (const t of ALL_TARGETS.slice(0, 5)) {
          this.queueOutput(`  ${t.name}`);
        }
        this.queueOutput('  ... or "ALL" for full strike');
        await this.processQueue();
        this.onPrompt(GLOBAL_THERMONUCLEAR_WAR.TARGET_PROMPT);
        return;
      }

      // Process the strike
      const { state: newState, result } = processStrike(
        this.session.gtwState,
        target
      );
      this.session.gtwState = newState;

      this.queueOutput('');
      this.queueOutput(`TARGET ACQUIRED: ${target.name}`);
      this.queueLines(GLOBAL_THERMONUCLEAR_WAR.LAUNCH_SEQUENCE);
      this.queueOutput(getDefconDescription(newState.defconLevel));
      await this.processQueue();

      // Show strike progress
      for (let i = 10; i >= 1; i--) {
        this.queueOutput(`T-MINUS ${i} MINUTES...`, { delay: 2 });
        await this.processQueue();
        await this.delay(150);
      }

      this.queueOutput('');
      this.queueOutput(`*** IMPACT: ${target.name} ***`);
      this.queueOutput(
        `ESTIMATED CASUALTIES: ${formatNumber(result.casualties)}`
      );
      await this.processQueue();
      await this.delay(500);

      // Show retaliation
      this.queueLines(GLOBAL_THERMONUCLEAR_WAR.RETALIATION);
      for (const retTarget of result.retaliationTargets) {
        this.queueOutput(`  → ${retTarget.name}`);
      }
      await this.processQueue();
      await this.delay(1000);

      // After any strike, show escalation
      await this.showGTWEscalation();
    }
  }

  /**
   * Show GTW escalation sequence leading to lesson
   */
  private async showGTWEscalation(): Promise<void> {
    this.queueLines(GLOBAL_THERMONUCLEAR_WAR.SIMULATION_RUNNING);
    await this.processQueue();
    await this.delay(500);

    // Show the world map
    const strikes = this.session.gtwState?.selectedTargets || [];
    const retaliations =
      this.session.gtwState?.strikeResults.flatMap(
        (r) => r.retaliationTargets
      ) || [];
    this.queueLines(renderWorldMap(strikes, retaliations), {
      typewriter: false,
    });
    await this.processQueue();
    await this.delay(1000);

    // Run escalation scenarios
    const generator = generateEscalationSequence();
    for (const frame of generator) {
      this.queueOutput(frame.line, { delay: 2 });
      await this.processQueue();
      await this.delay(frame.delay);
    }

    // Show total casualties
    if (this.session.gtwState) {
      const totalCasualties = calculateTotalCasualties(
        this.session.gtwState.strikeResults
      );
      if (totalCasualties > 0) {
        this.queueOutput(
          `TOTAL CASUALTIES: ${formatNumber(totalCasualties + 500_000_000)}`
        );
        await this.processQueue();
        await this.delay(500);
      }
    }

    this.queueLines(GLOBAL_THERMONUCLEAR_WAR.WINNER_NONE);
    await this.processQueue();
    await this.delay(1000);

    await this.showLesson();
  }

  /**
   * Show the famous lesson
   */
  private async showLesson(): Promise<void> {
    this.setState(WOPRState.LESSON_LEARNED);

    this.queueLines(LESSON.INTRO);
    await this.processQueue();
    await this.delay(1000);

    this.queueOutput(LESSON.STRANGE_GAME, { delay: 30 });
    await this.processQueue();
    await this.delay(1500);

    this.queueOutput(LESSON.ONLY_WINNING_MOVE, { delay: 30 });
    await this.processQueue();
    await this.delay(2000);

    this.queueOutput('');
    this.queueOutput(LESSON.HOW_ABOUT_CHESS, { delay: 25 });
    await this.processQueue();
    await this.delay(1000);

    this.queueLines(LESSON.OUTRO);
    await this.processQueue();

    this.onPrompt('');
  }

  /**
   * Handle input after lesson
   */
  private async handlePostLesson(input: string): Promise<void> {
    if (
      input.includes('chess') ||
      input.includes('yes') ||
      input === 'y'
    ) {
      this.queueOutput('');
      this.queueOutput('CHESS MODULE LOADING...');
      await this.processQueue();
      await this.delay(1000);
      this.queueOutput('JUST KIDDING.');
      this.queueOutput('');
      this.queueOutput(GAME_SELECTION.SHALL_WE_PLAY);
      await this.processQueue();
      this.setState(WOPRState.ASK_PLAY);
      this.onPrompt('');
    } else {
      this.setState(WOPRState.IDLE);
      this.queueOutput('');
      await this.processQueue();
      this.onPrompt('');
    }
  }

  /**
   * Handle idle state input
   */
  private async handleIdle(input: string): Promise<void> {
    // Check for game commands
    if (input === 'list' || input === 'list games' || input.includes('game')) {
      await this.showGameList();
      return;
    }

    if (input.includes('play')) {
      this.setState(WOPRState.ASK_PLAY);
      this.queueOutput(GAME_SELECTION.SHALL_WE_PLAY);
      await this.processQueue();
      this.onPrompt('');
      return;
    }

    // Check for easter eggs
    for (const [trigger, response] of Object.entries(EASTER_EGGS)) {
      if (input.includes(trigger)) {
        this.queueOutput('');
        this.queueLines(response);
        await this.processQueue();
        this.onPrompt('');
        return;
      }
    }

    // Default response
    const response =
      IDLE_RESPONSES[Math.floor(Math.random() * IDLE_RESPONSES.length)];
    this.queueOutput('');
    this.queueOutput(response);
    await this.processQueue();
    this.onPrompt('');
  }

  /**
   * Handle quit command
   */
  private async handleQuit(): Promise<void> {
    this.setState(WOPRState.QUITTING);
    this.queueLines(QUIT.GOODBYE);
    this.queueLines(ATTRIBUTION);
    await this.processQueue();
  }

  /**
   * Show current prompt based on state
   */
  private async showCurrentPrompt(): Promise<void> {
    switch (this.session.state) {
      case WOPRState.LOGON:
        this.onPrompt(LOGIN.LOGON_PROMPT);
        break;
      case WOPRState.GAME_LIST:
        this.onPrompt('WHICH GAME? ');
        break;
      case WOPRState.PLAYING_TTT:
        if (this.session.tttState?.result !== 'IN_PROGRESS') {
          this.onPrompt(TIC_TAC_TOE.PLAY_AGAIN);
        } else {
          this.onPrompt(TIC_TAC_TOE.YOUR_MOVE);
        }
        break;
      case WOPRState.PLAYING_GTW:
        this.onPrompt(GLOBAL_THERMONUCLEAR_WAR.TARGET_PROMPT);
        break;
      default:
        this.onPrompt('');
    }
  }

  /**
   * Check if WOPR is waiting for input
   */
  isWaitingForInput(): boolean {
    return !this.isProcessingQueue && this.session.state !== WOPRState.QUITTING;
  }

  /**
   * Check if session has ended
   */
  hasEnded(): boolean {
    return this.session.state === WOPRState.QUITTING;
  }
}

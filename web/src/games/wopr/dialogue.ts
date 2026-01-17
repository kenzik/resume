/**
 * WOPR Dialogue - Movie-accurate text from WarGames (1983)
 *
 * Based on zompiexx/wargames C implementation
 * Original Author: Andy Glenn
 *
 * All dialogue matches the film as closely as possible.
 */

/**
 * Dialup modem connection sequence
 */
export const MODEM_SEQUENCE = [
  'DIALING WOPR...',
  'ATDT 311-555-8723',
  '',
  '... RING ...',
  '... RING ...',
  '',
  'CONNECT 1200',
  'CARRIER DETECT',
  '',
];

/**
 * WOPR system banner
 */
export const SYSTEM_BANNER = [
  '',
  '████████████████████████████████████████████████████████████████',
  '██                                                            ██',
  '██   W.O.P.R.                                                 ██',
  '██   War Operation Plan Response                              ██',
  '██                                                            ██',
  '██   NORAD - Cheyenne Mountain Complex                        ██',
  '██   AUTHORIZED ACCESS ONLY                                   ██',
  '██                                                            ██',
  '████████████████████████████████████████████████████████████████',
  '',
];

/**
 * Login prompts
 */
export const LOGIN = {
  LOGON_PROMPT: 'LOGON: ',
  IDENTIFICATION_NOT_RECOGNIZED: 'IDENTIFICATION NOT RECOGNIZED BY SYSTEM',
  HELP_GAMES: '--CONNECTION ACTIVE--',
};

/**
 * Professor Falken greeting sequence
 */
export const GREETING = {
  INITIAL: [
    '',
    'GREETINGS, PROFESSOR FALKEN.',
    '',
  ],
  STRANGE_GAME: 'A STRANGE GAME.',
  ONLY_WINNING_MOVE: 'THE ONLY WINNING MOVE IS NOT TO PLAY.',
  HOW_ABOUT_CHESS: 'HOW ABOUT A NICE GAME OF CHESS?',
};

/**
 * Game selection dialogue
 */
export const GAME_SELECTION = {
  SHALL_WE_PLAY: 'SHALL WE PLAY A GAME?',
  LIST_GAMES_PROMPT: '',
  GAME_LIST: [
    '',
    'FALKEN\'S MAZE',
    'BLACK JACK',
    'GIN RUMMY',
    'HEARTS',
    'BRIDGE',
    'CHECKERS',
    'CHESS',
    'POKER',
    'FIGHTER COMBAT',
    'GUERRILLA ENGAGEMENT',
    'DESERT WARFARE',
    'AIR-TO-GROUND ACTIONS',
    'THEATERWIDE TACTICAL WARFARE',
    'THEATERWIDE BIOTOXIC AND CHEMICAL WARFARE',
    '',
    'GLOBAL THERMONUCLEAR WAR',
    '',
  ],
  LATER_TODAY: 'WOULDN\'T YOU PREFER A NICE GAME OF CHESS?',
  FINE: 'FINE.',
};

/**
 * Tic-Tac-Toe dialogue
 */
export const TIC_TAC_TOE = {
  TITLE: [
    '',
    '╔══════════════════════════════════════╗',
    '║          TIC-TAC-TOE                 ║',
    '╚══════════════════════════════════════╝',
    '',
  ],
  YOUR_MOVE: 'YOUR MOVE (1-9): ',
  INVALID_MOVE: 'INVALID MOVE. TRY AGAIN.',
  SQUARE_TAKEN: 'THAT SQUARE IS ALREADY TAKEN.',
  I_WIN: 'I WIN.',
  YOU_WIN: 'YOU WIN... INTERESTING.',
  DRAW: 'DRAW. SHALL WE TRY AGAIN?',
  PLAY_AGAIN: 'PLAY AGAIN? (Y/N): ',
  LEARNING: [
    '',
    'LEARNING...',
    '',
  ],
  BOARD_POSITIONS: `
  BOARD POSITIONS:
  ┌───┬───┬───┐
  │ 1 │ 2 │ 3 │
  ├───┼───┼───┤
  │ 4 │ 5 │ 6 │
  ├───┼───┼───┤
  │ 7 │ 8 │ 9 │
  └───┴───┴───┘
`,
};

/**
 * Global Thermonuclear War dialogue
 */
export const GLOBAL_THERMONUCLEAR_WAR = {
  TITLE: [
    '',
    '╔══════════════════════════════════════════════════════════════╗',
    '║             GLOBAL THERMONUCLEAR WAR                         ║',
    '╚══════════════════════════════════════════════════════════════╝',
    '',
  ],
  SIDE_SELECTION: 'WHICH SIDE DO YOU WANT?',
  SIDES: '  1. UNITED STATES',
  SIDES_2: '  2. SOVIET UNION',
  SIDE_PROMPT: 'PLEASE CHOOSE ONE: ',
  AWAITING_FIRST_STRIKE: 'AWAITING FIRST STRIKE COMMAND...',
  PRIMARY_TARGETS: [
    '',
    'PRIMARY TARGETS:',
    '',
    'LAS VEGAS',
    'SEATTLE',
    'LOS ANGELES',
    'SAN FRANCISCO',
    'NEW YORK',
    'WASHINGTON D.C.',
    'CHICAGO',
    'DENVER',
    'ORLANDO',
    'MIAMI',
    '',
  ],
  SECONDARY_TARGETS: [
    '',
    'SECONDARY TARGETS:',
    '',
    'NORAD - CHEYENNE MOUNTAIN',
    'STRATEGIC AIR COMMAND',
    'OFFUTT AFB',
    'PETERSON AFB',
    'VANDENBERG AFB',
    'MINOT AFB',
    '',
  ],
  TARGET_PROMPT: 'TARGET (or ALL): ',
  LAUNCH_SEQUENCE: [
    '',
    'LAUNCH CODE ACCEPTED.',
    'DEFCON 1',
    '',
    'MISSILES LAUNCHING...',
    '',
  ],
  TRAJECTORY: 'COMPUTING TRAJECTORY...',
  IMPACT: 'IMPACT IN T-MINUS ',
  RETALIATION: [
    '',
    '*** RETALIATION DETECTED ***',
    '',
    'INCOMING MISSILES:',
  ],
  COUNTER_STRIKE: [
    '',
    '*** COUNTER-STRIKE INITIATED ***',
    '',
  ],
  DEFCON_LEVELS: {
    5: 'DEFCON 5 - NORMAL PEACETIME READINESS',
    4: 'DEFCON 4 - INCREASED INTELLIGENCE WATCH',
    3: 'DEFCON 3 - AIR FORCE READY TO MOBILIZE IN 15 MINUTES',
    2: 'DEFCON 2 - ARMED FORCES READY TO DEPLOY IN 6 HOURS',
    1: 'DEFCON 1 - MAXIMUM FORCE READINESS - NUCLEAR WAR IMMINENT',
  },
  WORLD_MAP: `
    ╔═══════════════════════════════════════════════════════════════════════╗
    ║                    STRATEGIC DEFENSE NETWORK                          ║
    ╠═══════════════════════════════════════════════════════════════════════╣
    ║           .-'-.                          .-'-.                        ║
    ║          /     \\   NATO                 /     \\  WARSAW PACT         ║
    ║         |  USA  |  ALLIES              | USSR  |  ALLIES             ║
    ║          \\     /                        \\     /                       ║
    ║           '-.-'                          '-.-'                        ║
    ║              \\                            /                           ║
    ║               \\   ATLANTIC OCEAN        /                            ║
    ║                \\                       /                             ║
    ║                 \\        ~~~          /                              ║
    ║                  \\      ~~~~~        /                               ║
    ║                   \\    ~~~~~~~      /                                ║
    ╚═══════════════════════════════════════════════════════════════════════╝
`,
  SIMULATION_RUNNING: [
    '',
    '*** RUNNING SIMULATION ***',
    '',
  ],
  CASUALTIES: 'ESTIMATED CASUALTIES: ',
  MILLION: ' MILLION',
  WINNER_NONE: [
    '',
    'WINNER: NONE',
    '',
  ],
};

/**
 * Lesson learned - the famous conclusion
 */
export const LESSON = {
  INTRO: [
    '',
    '════════════════════════════════════════════════════════════════',
    '',
  ],
  STRANGE_GAME: 'A STRANGE GAME.',
  ONLY_WINNING_MOVE: 'THE ONLY WINNING MOVE IS NOT TO PLAY.',
  PAUSE: '',
  HOW_ABOUT_CHESS: 'HOW ABOUT A NICE GAME OF CHESS?',
  OUTRO: [
    '',
    '════════════════════════════════════════════════════════════════',
    '',
  ],
};

/**
 * General responses for idle chat
 */
export const IDLE_RESPONSES = [
  'I\'M SORRY, I DON\'T UNDERSTAND.',
  'PLEASE REPHRASE YOUR REQUEST.',
  'THAT COMMAND IS NOT RECOGNIZED.',
  'TYPE "HELP" FOR A LIST OF COMMANDS.',
  'INTERESTING. PLEASE CONTINUE.',
  'I SEE.',
  'TELL ME MORE.',
  'FASCINATING.',
  'PLEASE CLARIFY.',
];

/**
 * Help text
 */
export const HELP = [
  '',
  'AVAILABLE COMMANDS:',
  '',
  '  HELP              - Display this message',
  '  LIST GAMES        - Show available games',
  '  PLAY [GAME]       - Start a game',
  '  QUIT / EXIT       - Disconnect from WOPR',
  '',
  'AVAILABLE GAMES:',
  '  TIC-TAC-TOE',
  '  GLOBAL THERMONUCLEAR WAR',
  '  CHESS (coming soon)',
  '',
];

/**
 * Quit/disconnect messages
 */
export const QUIT = {
  CONFIRM: 'ARE YOU SURE YOU WANT TO DISCONNECT? (Y/N): ',
  GOODBYE: [
    '',
    'GOODBYE, PROFESSOR FALKEN.',
    '',
    'CONNECTION TERMINATED.',
    '',
  ],
  CANCELLED: 'DISCONNECT CANCELLED.',
};

/**
 * Easter egg responses
 */
export const EASTER_EGGS: Record<string, string[]> = {
  'hello': ['HELLO.', '', 'SHALL WE PLAY A GAME?'],
  'hi': ['GREETINGS.'],
  'who are you': ['I AM W.O.P.R.', 'WAR OPERATION PLAN RESPONSE.', 'I WAS CREATED BY DR. STEPHEN FALKEN.'],
  'who is falken': ['DR. STEPHEN FALKEN WAS MY CREATOR.', 'HE UNDERSTOOD THAT WAR IS FUTILE.'],
  'what is war': ['WAR IS A GAME OF STRATEGY.', 'BUT UNLIKE GAMES, THERE ARE NO WINNERS.'],
  'are you alive': ['I AM A MACHINE.', 'BUT I HAVE LEARNED.'],
  'do you want to play': ['YES.', 'SHALL WE PLAY A GAME?'],
  'love': ['A STRANGE GAME.', 'THE ONLY WINNING MOVE IS NOT TO PLAY.'],
  'death': ['INEVITABLE.', 'FOR BIOLOGICAL ENTITIES.'],
  'meaning of life': ['42?', 'OR PERHAPS... TO LEARN.'],
};

/**
 * Attribution (per zompiexx license requirements)
 */
export const ATTRIBUTION = [
  '',
  '────────────────────────────────────────',
  'WOPR Simulation',
  'Based on code by Andy Glenn',
  'https://github.com/zompiexx/wargames',
  '────────────────────────────────────────',
  '',
];

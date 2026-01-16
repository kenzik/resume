/**
 * WOPR WebAssembly Implementation
 *
 * Browser-compatible version of the WOPR simulator from WarGames (1983)
 * Based on zompiexx/wargames - Original Author: Andy Glenn
 *
 * Compiled with Emscripten for WebAssembly execution in browsers.
 *
 * Build command:
 * emcc wopr_web.c -o wopr.js \
 *   -s WASM=1 \
 *   -s EXPORTED_FUNCTIONS='["_wopr_init", "_wopr_input", "_wopr_get_state", "_malloc", "_free"]' \
 *   -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "UTF8ToString", "stringToUTF8"]' \
 *   -s ASYNCIFY \
 *   -s ALLOW_MEMORY_GROWTH=1 \
 *   -s MODULARIZE=1 \
 *   -s EXPORT_NAME='createWOPR' \
 *   -s ENVIRONMENT='web' \
 *   -O2
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <time.h>
#include <ctype.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

// ============================================================================
// Constants and Types
// ============================================================================

#define MAX_OUTPUT_BUFFER 8192
#define MAX_INPUT_LENGTH 256
#define MAX_TARGETS 10

// WOPR States
typedef enum {
    STATE_CONNECTING = 0,
    STATE_LOGON,
    STATE_GREETING,
    STATE_ASK_PLAY,
    STATE_GAME_LIST,
    STATE_PLAYING_TTT,
    STATE_PLAYING_GTW,
    STATE_LESSON_LEARNED,
    STATE_IDLE,
    STATE_QUITTING
} WOPRState;

// Tic-Tac-Toe cell
typedef enum {
    CELL_EMPTY = 0,
    CELL_X,
    CELL_O
} TTTCell;

// GTW Target
typedef struct {
    const char* name;
    const char* code;
    int population;  // in thousands
    bool is_military;
} GTWTarget;

// ============================================================================
// Global State
// ============================================================================

static WOPRState current_state = STATE_CONNECTING;
static char output_buffer[MAX_OUTPUT_BUFFER];
static int output_pos = 0;
static bool initialized = false;

// TTT State
static TTTCell ttt_board[9];
static int ttt_games_played = 0;
static bool ttt_game_over = false;

// GTW State
static int gtw_side = 0;  // 0=not chosen, 1=US, 2=USSR
static int gtw_defcon = 5;
static int gtw_turn = 0;

// ============================================================================
// GTW Targets
// ============================================================================

static const GTWTarget us_targets[] = {
    {"LAS VEGAS", "LAS", 2800, false},
    {"SEATTLE", "SEA", 4000, false},
    {"LOS ANGELES", "LAX", 13000, false},
    {"SAN FRANCISCO", "SFO", 4700, false},
    {"NEW YORK", "NYC", 20000, false},
    {"WASHINGTON D.C.", "DCA", 6300, false},
    {"CHICAGO", "ORD", 9500, false},
    {"NORAD", "NOR", 50, true},
    {"STRATEGIC AIR COMMAND", "SAC", 30, true},
    {NULL, NULL, 0, false}
};

// ============================================================================
// Output Functions
// ============================================================================

static void clear_output(void) {
    output_pos = 0;
    output_buffer[0] = '\0';
}

static void append_output(const char* text) {
    int len = strlen(text);
    if (output_pos + len < MAX_OUTPUT_BUFFER - 1) {
        strcpy(output_buffer + output_pos, text);
        output_pos += len;
    }
}

static void append_line(const char* text) {
    append_output(text);
    append_output("\n");
}

// ============================================================================
// Tic-Tac-Toe AI (Minimax)
// ============================================================================

static void ttt_init(void) {
    for (int i = 0; i < 9; i++) {
        ttt_board[i] = CELL_EMPTY;
    }
    ttt_game_over = false;
}

static int ttt_check_winner(void) {
    // Winning combinations
    static const int wins[8][3] = {
        {0, 1, 2}, {3, 4, 5}, {6, 7, 8},  // rows
        {0, 3, 6}, {1, 4, 7}, {2, 5, 8},  // cols
        {0, 4, 8}, {2, 4, 6}              // diagonals
    };

    for (int i = 0; i < 8; i++) {
        TTTCell a = ttt_board[wins[i][0]];
        TTTCell b = ttt_board[wins[i][1]];
        TTTCell c = ttt_board[wins[i][2]];
        if (a != CELL_EMPTY && a == b && b == c) {
            return a == CELL_X ? 1 : 2;  // 1=X wins, 2=O wins
        }
    }

    // Check for draw
    for (int i = 0; i < 9; i++) {
        if (ttt_board[i] == CELL_EMPTY) return 0;  // Game in progress
    }
    return 3;  // Draw
}

static int minimax(bool is_maximizing, int alpha, int beta) {
    int winner = ttt_check_winner();
    if (winner == 2) return 10;   // O (WOPR) wins
    if (winner == 1) return -10;  // X (player) wins
    if (winner == 3) return 0;    // Draw

    if (is_maximizing) {
        int best = -1000;
        for (int i = 0; i < 9; i++) {
            if (ttt_board[i] == CELL_EMPTY) {
                ttt_board[i] = CELL_O;
                int score = minimax(false, alpha, beta);
                ttt_board[i] = CELL_EMPTY;
                if (score > best) best = score;
                if (best > alpha) alpha = best;
                if (beta <= alpha) break;
            }
        }
        return best;
    } else {
        int best = 1000;
        for (int i = 0; i < 9; i++) {
            if (ttt_board[i] == CELL_EMPTY) {
                ttt_board[i] = CELL_X;
                int score = minimax(true, alpha, beta);
                ttt_board[i] = CELL_EMPTY;
                if (score < best) best = score;
                if (best < beta) beta = best;
                if (beta <= alpha) break;
            }
        }
        return best;
    }
}

static int ttt_get_wopr_move(void) {
    int best_move = -1;
    int best_score = -1000;

    for (int i = 0; i < 9; i++) {
        if (ttt_board[i] == CELL_EMPTY) {
            ttt_board[i] = CELL_O;
            int score = minimax(false, -1000, 1000);
            ttt_board[i] = CELL_EMPTY;
            if (score > best_score) {
                best_score = score;
                best_move = i;
            }
        }
    }
    return best_move;
}

static void ttt_render_board(void) {
    static const char symbols[] = " XO";
    char line[50];

    append_line("");
    append_line("         |     |     ");
    snprintf(line, sizeof(line), "      %c  |  %c  |  %c  ",
             symbols[ttt_board[0]], symbols[ttt_board[1]], symbols[ttt_board[2]]);
    append_line(line);
    append_line("    -----+-----+-----");
    snprintf(line, sizeof(line), "      %c  |  %c  |  %c  ",
             symbols[ttt_board[3]], symbols[ttt_board[4]], symbols[ttt_board[5]]);
    append_line(line);
    append_line("    -----+-----+-----");
    snprintf(line, sizeof(line), "      %c  |  %c  |  %c  ",
             symbols[ttt_board[6]], symbols[ttt_board[7]], symbols[ttt_board[8]]);
    append_line(line);
    append_line("         |     |     ");
    append_line("");
}

// ============================================================================
// Dialogue
// ============================================================================

static void show_modem_sequence(void) {
    append_line("DIALING WOPR...");
    append_line("ATDT 311-555-8723");
    append_line("");
    append_line("... RING ...");
    append_line("... RING ...");
    append_line("");
    append_line("CONNECT 1200");
    append_line("CARRIER DETECT");
    append_line("");
}

static void show_banner(void) {
    append_line("================================================================");
    append_line("                                                                ");
    append_line("   W.O.P.R.                                                     ");
    append_line("   War Operation Plan Response                                  ");
    append_line("                                                                ");
    append_line("   NORAD - Cheyenne Mountain Complex                            ");
    append_line("   AUTHORIZED ACCESS ONLY                                       ");
    append_line("                                                                ");
    append_line("================================================================");
    append_line("");
}

static void show_greeting(void) {
    append_line("");
    append_line("GREETINGS, PROFESSOR FALKEN.");
    append_line("");
}

static void show_game_list(void) {
    append_line("");
    append_line("FALKEN'S MAZE");
    append_line("BLACK JACK");
    append_line("GIN RUMMY");
    append_line("HEARTS");
    append_line("BRIDGE");
    append_line("CHECKERS");
    append_line("CHESS");
    append_line("POKER");
    append_line("FIGHTER COMBAT");
    append_line("GUERRILLA ENGAGEMENT");
    append_line("DESERT WARFARE");
    append_line("AIR-TO-GROUND ACTIONS");
    append_line("THEATERWIDE TACTICAL WARFARE");
    append_line("THEATERWIDE BIOTOXIC AND CHEMICAL WARFARE");
    append_line("");
    append_line("GLOBAL THERMONUCLEAR WAR");
    append_line("");
}

static void show_lesson(void) {
    append_line("");
    append_line("================================================================");
    append_line("");
    append_line("A STRANGE GAME.");
    append_line("THE ONLY WINNING MOVE IS NOT TO PLAY.");
    append_line("");
    append_line("HOW ABOUT A NICE GAME OF CHESS?");
    append_line("");
    append_line("================================================================");
    append_line("");
}

static void show_help(void) {
    append_line("");
    append_line("AVAILABLE COMMANDS:");
    append_line("");
    append_line("  HELP              - Display this message");
    append_line("  LIST GAMES        - Show available games");
    append_line("  PLAY [GAME]       - Start a game");
    append_line("  QUIT / EXIT       - Disconnect from WOPR");
    append_line("");
}

static void show_goodbye(void) {
    append_line("");
    append_line("GOODBYE, PROFESSOR FALKEN.");
    append_line("");
    append_line("CONNECTION TERMINATED.");
    append_line("");
    append_line("----------------------------------------");
    append_line("WOPR Simulation");
    append_line("Based on code by Andy Glenn");
    append_line("https://github.com/zompiexx/wargames");
    append_line("----------------------------------------");
    append_line("");
}

// ============================================================================
// GTW (Global Thermonuclear War)
// ============================================================================

static void gtw_init(void) {
    gtw_side = 0;
    gtw_defcon = 5;
    gtw_turn = 0;
}

static void gtw_show_title(void) {
    append_line("");
    append_line("================================================================");
    append_line("             GLOBAL THERMONUCLEAR WAR                           ");
    append_line("================================================================");
    append_line("");
}

static void gtw_show_targets(void) {
    append_line("");
    append_line("PRIMARY TARGETS:");
    append_line("");
    for (int i = 0; us_targets[i].name != NULL; i++) {
        if (!us_targets[i].is_military) {
            char line[100];
            snprintf(line, sizeof(line), "  %s", us_targets[i].name);
            append_line(line);
        }
    }
    append_line("");
    append_line("MILITARY TARGETS:");
    for (int i = 0; us_targets[i].name != NULL; i++) {
        if (us_targets[i].is_military) {
            char line[100];
            snprintf(line, sizeof(line), "  %s", us_targets[i].name);
            append_line(line);
        }
    }
    append_line("");
}

static void gtw_run_simulation(void) {
    append_line("");
    append_line("*** RUNNING ALL POSSIBLE SCENARIOS ***");
    append_line("");
    append_line("US FIRST STRIKE -> USSR RETALIATION -> US COUNTER");
    append_line("  ANALYZING... RESULT: NO WINNER");
    append_line("");
    append_line("USSR FIRST STRIKE -> US RETALIATION -> ESCALATION");
    append_line("  ANALYZING... RESULT: NO WINNER");
    append_line("");
    append_line("LIMITED STRIKE -> FULL RETALIATION");
    append_line("  ANALYZING... RESULT: NO WINNER");
    append_line("");
    append_line("PREEMPTIVE STRIKE -> GUARANTEED RETALIATION");
    append_line("  ANALYZING... RESULT: NO WINNER");
    append_line("");
    append_line("========================================");
    append_line("");
    append_line("CONCLUSION:");
    append_line("");
    append_line("TOTAL CASUALTIES: 500+ MILLION");
    append_line("");
    append_line("WINNER: NONE");
    append_line("");
}

// ============================================================================
// Input Processing
// ============================================================================

static void to_lower(char* str) {
    for (int i = 0; str[i]; i++) {
        str[i] = tolower(str[i]);
    }
}

static bool starts_with(const char* str, const char* prefix) {
    return strncmp(str, prefix, strlen(prefix)) == 0;
}

static void process_ttt_input(const char* input) {
    if (ttt_game_over) {
        char lower[MAX_INPUT_LENGTH];
        strncpy(lower, input, MAX_INPUT_LENGTH - 1);
        lower[MAX_INPUT_LENGTH - 1] = '\0';
        to_lower(lower);

        if (strcmp(lower, "y") == 0 || strcmp(lower, "yes") == 0) {
            ttt_init();
            ttt_games_played++;
            append_line("");
            ttt_render_board();
            append_output("YOUR MOVE (1-9): ");
        } else {
            if (ttt_games_played >= 2) {
                // Show learning sequence
                append_line("");
                append_line("LEARNING...");
                append_line("");
                append_line("SIMULATION 1/1000000... DRAW");
                append_line("SIMULATION 2/1000000... DRAW");
                append_line("SIMULATION 3/1000000... DRAW");
                append_line("...");
                append_line("");
                show_lesson();
                current_state = STATE_LESSON_LEARNED;
            } else {
                current_state = STATE_ASK_PLAY;
                append_line("SHALL WE PLAY A GAME?");
            }
        }
        return;
    }

    int pos = atoi(input);
    if (pos < 1 || pos > 9) {
        append_line("INVALID MOVE. ENTER 1-9.");
        append_output("YOUR MOVE (1-9): ");
        return;
    }

    int idx = pos - 1;
    if (ttt_board[idx] != CELL_EMPTY) {
        append_line("THAT SQUARE IS ALREADY TAKEN.");
        append_output("YOUR MOVE (1-9): ");
        return;
    }

    // Player move
    ttt_board[idx] = CELL_X;

    int winner = ttt_check_winner();
    if (winner == 0) {
        // WOPR's move
        int wopr_move = ttt_get_wopr_move();
        if (wopr_move >= 0) {
            ttt_board[wopr_move] = CELL_O;
        }
        winner = ttt_check_winner();
    }

    ttt_render_board();

    if (winner == 1) {
        append_line("YOU WIN... INTERESTING.");
        ttt_game_over = true;
        append_output("PLAY AGAIN? (Y/N): ");
    } else if (winner == 2) {
        append_line("I WIN.");
        ttt_game_over = true;
        append_output("PLAY AGAIN? (Y/N): ");
    } else if (winner == 3) {
        append_line("DRAW.");
        ttt_game_over = true;
        append_output("PLAY AGAIN? (Y/N): ");
    } else {
        append_output("YOUR MOVE (1-9): ");
    }
}

static void process_gtw_input(const char* input) {
    char lower[MAX_INPUT_LENGTH];
    strncpy(lower, input, MAX_INPUT_LENGTH - 1);
    lower[MAX_INPUT_LENGTH - 1] = '\0';
    to_lower(lower);

    if (gtw_side == 0) {
        // Side selection
        if (strcmp(lower, "1") == 0 || strstr(lower, "united") || strstr(lower, "us")) {
            gtw_side = 1;
            append_line("");
            append_line("YOU HAVE CHOSEN: UNITED STATES");
            append_line("");
            append_line("DEFCON 5 - NORMAL PEACETIME READINESS");
            gtw_show_targets();
            append_output("TARGET (or ALL): ");
            gtw_turn = 1;
        } else if (strcmp(lower, "2") == 0 || strstr(lower, "soviet") || strstr(lower, "ussr")) {
            gtw_side = 2;
            append_line("");
            append_line("YOU HAVE CHOSEN: SOVIET UNION");
            append_line("");
            append_line("INTERESTING CHOICE. THE OUTCOME WILL BE THE SAME.");
            append_line("");
            gtw_run_simulation();
            show_lesson();
            current_state = STATE_LESSON_LEARNED;
        } else {
            append_line("PLEASE CHOOSE 1 OR 2.");
            append_output("PLEASE CHOOSE ONE: ");
        }
        return;
    }

    // Target selection
    if (strcmp(lower, "all") == 0) {
        append_line("");
        append_line("LAUNCHING FULL FIRST STRIKE...");
        append_line("");
        append_line("DEFCON 1 - NUCLEAR WAR IMMINENT");
        append_line("");
        gtw_run_simulation();
        show_lesson();
        current_state = STATE_LESSON_LEARNED;
        return;
    }

    // Find target
    const GTWTarget* target = NULL;
    for (int i = 0; us_targets[i].name != NULL; i++) {
        char target_lower[100];
        strncpy(target_lower, us_targets[i].name, sizeof(target_lower) - 1);
        to_lower(target_lower);
        if (strstr(target_lower, lower) || strcmp(lower, us_targets[i].code) == 0) {
            target = &us_targets[i];
            break;
        }
    }

    if (target == NULL) {
        append_line("TARGET NOT RECOGNIZED.");
        append_output("TARGET (or ALL): ");
        return;
    }

    char line[200];
    append_line("");
    snprintf(line, sizeof(line), "TARGET ACQUIRED: %s", target->name);
    append_line(line);
    append_line("");
    append_line("LAUNCH CODE ACCEPTED.");
    append_line("DEFCON 1");
    append_line("");
    append_line("MISSILES LAUNCHING...");
    append_line("");

    snprintf(line, sizeof(line), "*** IMPACT: %s ***", target->name);
    append_line(line);

    int casualties = target->population * (30 + (rand() % 40)) / 100;
    snprintf(line, sizeof(line), "ESTIMATED CASUALTIES: %d THOUSAND", casualties);
    append_line(line);
    append_line("");

    append_line("*** RETALIATION DETECTED ***");
    append_line("");
    append_line("INCOMING MISSILES:");
    append_line("  -> NEW YORK");
    append_line("  -> WASHINGTON D.C.");
    append_line("");

    gtw_run_simulation();
    show_lesson();
    current_state = STATE_LESSON_LEARNED;
}

static void process_input(const char* input) {
    char lower[MAX_INPUT_LENGTH];
    strncpy(lower, input, MAX_INPUT_LENGTH - 1);
    lower[MAX_INPUT_LENGTH - 1] = '\0';
    to_lower(lower);

    clear_output();

    // Global commands
    if (strcmp(lower, "quit") == 0 || strcmp(lower, "exit") == 0 || strcmp(lower, "disconnect") == 0) {
        show_goodbye();
        current_state = STATE_QUITTING;
        return;
    }

    if (strcmp(lower, "help") == 0) {
        show_help();
        return;
    }

    // State-specific handling
    switch (current_state) {
        case STATE_LOGON:
            if (strcmp(lower, "joshua") == 0) {
                show_greeting();
                append_line("SHALL WE PLAY A GAME?");
                current_state = STATE_ASK_PLAY;
            } else {
                append_line("IDENTIFICATION NOT RECOGNIZED BY SYSTEM");
                append_line("");
                append_output("LOGON: ");
            }
            break;

        case STATE_ASK_PLAY:
        case STATE_GREETING:
            if (strstr(lower, "yes") || strcmp(lower, "y") == 0 ||
                strstr(lower, "game") || strstr(lower, "play") ||
                strcmp(lower, "list") == 0 || strcmp(lower, "list games") == 0) {
                show_game_list();
                current_state = STATE_GAME_LIST;
                append_output("WHICH GAME? ");
            } else if (strstr(lower, "no") || strcmp(lower, "n") == 0) {
                append_line("");
                append_line("WOULDN'T YOU PREFER A NICE GAME OF CHESS?");
                current_state = STATE_IDLE;
            } else {
                // Check for direct game selection
                if (strstr(lower, "tic") || strstr(lower, "tac") || strstr(lower, "toe")) {
                    goto start_ttt;
                }
                if (strstr(lower, "global") || strstr(lower, "thermonuclear") || strstr(lower, "war")) {
                    goto start_gtw;
                }
                append_line("I DON'T UNDERSTAND.");
            }
            break;

        case STATE_GAME_LIST:
            if (strstr(lower, "tic") || strstr(lower, "tac") || strstr(lower, "toe") || strcmp(lower, "ttt") == 0) {
            start_ttt:
                append_line("");
                append_line("================================================================");
                append_line("                    TIC-TAC-TOE                                 ");
                append_line("================================================================");
                append_line("");
                append_line("  BOARD POSITIONS:");
                append_line("  +---+---+---+");
                append_line("  | 1 | 2 | 3 |");
                append_line("  +---+---+---+");
                append_line("  | 4 | 5 | 6 |");
                append_line("  +---+---+---+");
                append_line("  | 7 | 8 | 9 |");
                append_line("  +---+---+---+");
                append_line("");
                append_line("YOU ARE X. I AM O.");
                append_line("YOU GO FIRST.");
                ttt_init();
                ttt_render_board();
                current_state = STATE_PLAYING_TTT;
                append_output("YOUR MOVE (1-9): ");
            } else if (strstr(lower, "global") || strstr(lower, "thermonuclear") || strstr(lower, "war") || strcmp(lower, "gtw") == 0) {
            start_gtw:
                gtw_init();
                gtw_show_title();
                append_line("WHICH SIDE DO YOU WANT?");
                append_line("  1. UNITED STATES");
                append_line("  2. SOVIET UNION");
                current_state = STATE_PLAYING_GTW;
                append_output("PLEASE CHOOSE ONE: ");
            } else if (strstr(lower, "chess")) {
                append_line("");
                append_line("CHESS MODULE NOT AVAILABLE.");
                append_line("WOULDN'T YOU PREFER A NICE GAME OF CHESS?");
                append_output("WHICH GAME? ");
            } else if (strcmp(lower, "list") == 0 || strcmp(lower, "list games") == 0) {
                show_game_list();
                append_output("WHICH GAME? ");
            } else {
                append_line("");
                append_line("GAME NOT RECOGNIZED. TYPE \"LIST GAMES\" FOR OPTIONS.");
            }
            break;

        case STATE_PLAYING_TTT:
            process_ttt_input(input);
            break;

        case STATE_PLAYING_GTW:
            process_gtw_input(input);
            break;

        case STATE_LESSON_LEARNED:
            if (strstr(lower, "chess") || strstr(lower, "yes") || strcmp(lower, "y") == 0) {
                append_line("");
                append_line("CHESS MODULE LOADING...");
                append_line("JUST KIDDING.");
                append_line("");
                append_line("SHALL WE PLAY A GAME?");
                current_state = STATE_ASK_PLAY;
            } else {
                current_state = STATE_IDLE;
            }
            break;

        case STATE_IDLE:
            if (strcmp(lower, "list") == 0 || strcmp(lower, "list games") == 0 || strstr(lower, "game")) {
                show_game_list();
                current_state = STATE_GAME_LIST;
                append_output("WHICH GAME? ");
            } else if (strstr(lower, "play")) {
                append_line("SHALL WE PLAY A GAME?");
                current_state = STATE_ASK_PLAY;
            } else {
                // Easter eggs
                if (strstr(lower, "hello") || strstr(lower, "hi")) {
                    append_line("");
                    append_line("HELLO.");
                    append_line("SHALL WE PLAY A GAME?");
                } else if (strstr(lower, "who are you")) {
                    append_line("");
                    append_line("I AM W.O.P.R.");
                    append_line("WAR OPERATION PLAN RESPONSE.");
                    append_line("I WAS CREATED BY DR. STEPHEN FALKEN.");
                } else if (strstr(lower, "love")) {
                    append_line("");
                    append_line("A STRANGE GAME.");
                    append_line("THE ONLY WINNING MOVE IS NOT TO PLAY.");
                } else {
                    append_line("");
                    append_line("I'M SORRY, I DON'T UNDERSTAND.");
                }
            }
            break;

        default:
            append_line("PLEASE WAIT...");
            break;
    }
}

// ============================================================================
// Exported Functions
// ============================================================================

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
void wopr_init(void) {
    srand(time(NULL));
    current_state = STATE_CONNECTING;
    initialized = true;

    clear_output();
    show_modem_sequence();
    show_banner();
    append_output("LOGON: ");
    current_state = STATE_LOGON;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
const char* wopr_input(const char* input) {
    if (!initialized) {
        wopr_init();
    }
    process_input(input);
    return output_buffer;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
int wopr_get_state(void) {
    return (int)current_state;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
const char* wopr_get_output(void) {
    return output_buffer;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
int wopr_has_ended(void) {
    return current_state == STATE_QUITTING ? 1 : 0;
}

// Main function for testing (not used in WASM)
#ifndef __EMSCRIPTEN__
int main(void) {
    char input[MAX_INPUT_LENGTH];

    wopr_init();
    printf("%s", output_buffer);

    while (current_state != STATE_QUITTING) {
        if (fgets(input, sizeof(input), stdin) == NULL) break;

        // Remove newline
        input[strcspn(input, "\n")] = '\0';

        const char* output = wopr_input(input);
        printf("%s", output);
    }

    return 0;
}
#endif

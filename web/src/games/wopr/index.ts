/**
 * WOPR (War Operation Plan Response) Game Module
 *
 * A TypeScript implementation of the WOPR computer from WarGames (1983).
 *
 * Based on zompiexx/wargames C implementation
 * Original Author: Andy Glenn
 * https://github.com/zompiexx/wargames
 */

export * from './types';
export * from './dialogue';
export * from './tictactoe';
export * from './globalThermonuclear';
export { WOPRStateMachine, createSession } from './WOPRStateMachine';

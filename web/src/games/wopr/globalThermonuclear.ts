/**
 * Global Thermonuclear War Simulation
 *
 * Based on zompiexx/wargames C implementation
 * Original Author: Andy Glenn
 *
 * This simulates the escalation sequence from the movie,
 * ultimately teaching that "the only winning move is not to play."
 */

import type { GTWState, GTWTarget, GTWStrikeResult } from './types';

/**
 * Primary US targets (major cities)
 */
export const US_CITIES: GTWTarget[] = [
  { name: 'LAS VEGAS', code: 'LAS', type: 'city', population: 2_800_000 },
  { name: 'SEATTLE', code: 'SEA', type: 'city', population: 4_000_000 },
  { name: 'LOS ANGELES', code: 'LAX', type: 'city', population: 13_000_000 },
  { name: 'SAN FRANCISCO', code: 'SFO', type: 'city', population: 4_700_000 },
  { name: 'NEW YORK', code: 'NYC', type: 'city', population: 20_000_000 },
  { name: 'WASHINGTON D.C.', code: 'DCA', type: 'city', population: 6_300_000 },
  { name: 'CHICAGO', code: 'ORD', type: 'city', population: 9_500_000 },
  { name: 'DENVER', code: 'DEN', type: 'city', population: 2_900_000 },
  { name: 'ORLANDO', code: 'MCO', type: 'city', population: 2_600_000 },
  { name: 'MIAMI', code: 'MIA', type: 'city', population: 6_200_000 },
];

/**
 * US military installations
 */
export const US_MILITARY: GTWTarget[] = [
  { name: 'NORAD - CHEYENNE MOUNTAIN', code: 'NOR', type: 'military' },
  { name: 'STRATEGIC AIR COMMAND', code: 'SAC', type: 'strategic' },
  { name: 'OFFUTT AFB', code: 'OFF', type: 'military' },
  { name: 'PETERSON AFB', code: 'PET', type: 'military' },
  { name: 'VANDENBERG AFB', code: 'VAN', type: 'military' },
  { name: 'MINOT AFB', code: 'MIN', type: 'military' },
];

/**
 * Soviet targets (for retaliation display)
 */
export const SOVIET_TARGETS: GTWTarget[] = [
  { name: 'MOSCOW', code: 'MOW', type: 'city', population: 12_500_000 },
  { name: 'LENINGRAD', code: 'LED', type: 'city', population: 5_000_000 },
  { name: 'KIEV', code: 'IEV', type: 'city', population: 3_000_000 },
  { name: 'MINSK', code: 'MSQ', type: 'city', population: 2_000_000 },
  { name: 'STALINGRAD', code: 'VOG', type: 'city', population: 1_000_000 },
];

/**
 * All valid targets
 */
export const ALL_TARGETS = [...US_CITIES, ...US_MILITARY];

/**
 * Create initial GTW state
 */
export function createGTWState(): GTWState {
  return {
    phase: 'TARGET_SELECTION',
    selectedTargets: [],
    strikeResults: [],
    defconLevel: 5,
    turnCount: 0,
  };
}

/**
 * Find target by name or code
 */
export function findTarget(input: string): GTWTarget | null {
  const normalized = input.toUpperCase().trim();

  // Check for exact match on code
  let target = ALL_TARGETS.find((t) => t.code === normalized);
  if (target) return target;

  // Check for partial match on name
  target = ALL_TARGETS.find(
    (t) =>
      t.name.toUpperCase().includes(normalized) ||
      normalized.includes(t.name.toUpperCase().split(' ')[0])
  );

  return target || null;
}

/**
 * Calculate casualties for a strike
 */
export function calculateCasualties(target: GTWTarget): number {
  if (target.type === 'military') {
    return Math.floor(Math.random() * 50000) + 10000;
  }
  // Cities have higher casualties based on population
  const baseCasualties = target.population || 1000000;
  const factor = 0.3 + Math.random() * 0.4; // 30-70% of population
  return Math.floor(baseCasualties * factor);
}

/**
 * Generate retaliation targets based on strike
 */
export function generateRetaliation(
  strikeTarget: GTWTarget
): GTWTarget[] {
  // Retaliation is proportional to strike severity
  const retaliationCount =
    strikeTarget.type === 'city'
      ? Math.min(3, Math.floor(Math.random() * 4) + 1)
      : Math.min(2, Math.floor(Math.random() * 3) + 1);

  const shuffled = [...US_CITIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, retaliationCount);
}

/**
 * Process a strike on a target
 */
export function processStrike(
  state: GTWState,
  target: GTWTarget
): { state: GTWState; result: GTWStrikeResult } {
  const casualties = calculateCasualties(target);
  const retaliationTargets = generateRetaliation(target);

  const result: GTWStrikeResult = {
    target,
    success: true,
    casualties,
    retaliationTargets,
  };

  // Calculate new DEFCON level
  let newDefcon = state.defconLevel;
  if (target.type === 'city') {
    newDefcon = Math.max(1, newDefcon - 2) as GTWState['defconLevel'];
  } else if (target.type === 'strategic') {
    newDefcon = 1;
  } else {
    newDefcon = Math.max(1, newDefcon - 1) as GTWState['defconLevel'];
  }

  return {
    state: {
      ...state,
      phase: 'STRIKE_IN_PROGRESS',
      selectedTargets: [...state.selectedTargets, target],
      strikeResults: [...state.strikeResults, result],
      defconLevel: newDefcon,
      turnCount: state.turnCount + 1,
    },
    result,
  };
}

/**
 * Generate strike animation frames
 */
export function* generateStrikeFrames(
  target: GTWTarget
): Generator<string> {
  yield `ACQUIRING TARGET: ${target.name}`;
  yield 'LAUNCH SEQUENCE INITIATED...';
  yield '';
  yield 'DEFCON 1 - NUCLEAR WAR IMMINENT';
  yield '';
  yield 'MISSILE LAUNCH CONFIRMED';
  yield '';

  // Trajectory animation
  for (let i = 15; i >= 1; i--) {
    yield `T-MINUS ${i} MINUTES TO IMPACT`;
  }

  yield '';
  yield `*** IMPACT: ${target.name} ***`;
  yield '';
}

/**
 * Generate retaliation animation frames
 */
export function* generateRetaliationFrames(
  targets: GTWTarget[]
): Generator<string> {
  yield '';
  yield '╔══════════════════════════════════════╗';
  yield '║      RETALIATION DETECTED            ║';
  yield '╚══════════════════════════════════════╝';
  yield '';
  yield 'INCOMING MISSILES:';
  yield '';

  for (const target of targets) {
    yield `  → ${target.name}`;
  }

  yield '';
  yield 'COUNTER-STRIKE OPTIONS EXHAUSTED';
  yield '';
}

/**
 * Generate escalation sequence
 * This is the dramatic "learning" sequence where WOPR
 * simulates all possible scenarios
 */
export function* generateEscalationSequence(): Generator<{
  line: string;
  delay: number;
}> {
  yield { line: '', delay: 100 };
  yield { line: '*** RUNNING ALL POSSIBLE SCENARIOS ***', delay: 200 };
  yield { line: '', delay: 100 };

  // Simulate rapid scenario calculations
  const scenarios = [
    'US FIRST STRIKE → USSR RETALIATION → US COUNTER',
    'USSR FIRST STRIKE → US RETALIATION → ESCALATION',
    'LIMITED STRIKE → FULL RETALIATION',
    'SURGICAL STRIKE → MASSIVE RESPONSE',
    'FIRST STRIKE DECAPITATION → DEAD HAND ACTIVATION',
    'TACTICAL EXCHANGE → STRATEGIC ESCALATION',
    'PREEMPTIVE STRIKE → GUARANTEED RETALIATION',
    'LAUNCH ON WARNING → MUTUAL DESTRUCTION',
  ];

  for (const scenario of scenarios) {
    yield { line: scenario, delay: 150 };
    yield { line: '  ANALYZING...', delay: 100 };
    yield { line: '  RESULT: NO WINNER', delay: 100 };
    yield { line: '', delay: 50 };
  }

  yield { line: '', delay: 200 };
  yield { line: '════════════════════════════════════════', delay: 100 };
  yield { line: '', delay: 200 };
  yield { line: 'CONCLUSION:', delay: 300 };
  yield { line: '', delay: 200 };
}

/**
 * Calculate total casualties from all strikes
 */
export function calculateTotalCasualties(results: GTWStrikeResult[]): number {
  let total = 0;

  for (const result of results) {
    total += result.casualties;
    // Add retaliation casualties
    for (const retTarget of result.retaliationTargets) {
      total += calculateCasualties(retTarget);
    }
  }

  return total;
}

/**
 * Format large numbers (e.g., casualties)
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)} BILLION`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)} MILLION`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)} THOUSAND`;
  }
  return num.toString();
}

/**
 * Get DEFCON level description
 */
export function getDefconDescription(level: GTWState['defconLevel']): string {
  const descriptions: Record<GTWState['defconLevel'], string> = {
    5: 'NORMAL PEACETIME READINESS',
    4: 'INCREASED INTELLIGENCE WATCH',
    3: 'AIR FORCE READY TO MOBILIZE IN 15 MINUTES',
    2: 'ARMED FORCES READY TO DEPLOY IN 6 HOURS',
    1: 'MAXIMUM FORCE READINESS - NUCLEAR WAR IMMINENT',
  };
  return `DEFCON ${level} - ${descriptions[level]}`;
}

/**
 * Render ASCII art world map with strike indicators
 */
export function renderWorldMap(
  strikes: GTWTarget[],
  retaliations: GTWTarget[]
): string[] {
  const lines = [
    '',
    '╔═══════════════════════════════════════════════════════════════════════╗',
    '║                    STRATEGIC DEFENSE NETWORK                          ║',
    '╠═══════════════════════════════════════════════════════════════════════╣',
    '║                                                                       ║',
    '║        [USA]                                    [USSR]                ║',
    '║                                                                       ║',
    '║   STRIKES: ' +
      (strikes.length > 0
        ? strikes.map((s) => s.code).join(' ')
        : 'NONE').padEnd(15) +
      '           RETALIATION: ' +
      (retaliations.length > 0
        ? retaliations.map((r) => r.code).join(' ')
        : 'NONE').padEnd(15) +
      '║',
    '║                                                                       ║',
    '╚═══════════════════════════════════════════════════════════════════════╝',
    '',
  ];
  return lines;
}

/**
 * Get random Soviet response (for flavor)
 */
export function getSovietResponse(): string[] {
  const responses = [
    ['PREMIER: "THIS AGGRESSION WILL NOT STAND."'],
    ['SOVIET FORCES ON MAXIMUM ALERT.', 'SUBMARINE FLEET MOBILIZING.'],
    ['RETALIATION AUTHORIZED BY POLITBURO.'],
    ['DEAD HAND PROTOCOL ACTIVATED.'],
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

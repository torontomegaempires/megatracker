import type { BlockId, Credits, ExtraCredit, GoalId } from '../data';
import { COLORS, rulesFor } from '../data';
import { costSummary, freePickMatches, fundsBreakdown } from './selectors';

export type FilterId = 'unowned' | 'affordable' | 'almostAffordable' | 'goal' | 'owned' | 'all';
export type SortId = 'alpha' | 'cost' | 'vp' | 'economy' | 'discount' | 'color' | 'chains';
export type GoalOption = GoalId | 'ast';
export type AstMode = 'off' | 'basic' | 'expert';
/** A free advance being taken: Anatomy's cheap science, or Primal Philosophy's 1-VP advance. */
export type FreePick = 'cheapScience' | 'oneVP';

/** What the player can spend on Advances: commodity cards in hand and treasury tokens. */
export interface Funding {
  /** Commodity id -> number of cards held. */
  hand: Record<string, number>;
  /** Commodities kept for next turn: not counted in funds and not turned in when buying. */
  held: string[];
  treasury: number;
}

/** A pending choice of extra credits, or the face credits waiting to be added after those choices. */
export type QueueItem =
  | { kind: 'choice'; source: string; amount: ExtraCredit; cancelable: boolean }
  | { kind: 'face'; credits: Credits };

export interface ViewSettings {
  filter: FilterId;
  goal: GoalOption;
  sort: SortId;
  ast: AstMode;
  calamities: { minor: boolean; major: boolean; unowned: boolean };
}

export interface GameState {
  schema: 1;
  block: BlockId;
  /**
   * Number of players: a PLAYER_COUNTS value, where 7 stands for 7–8, 10 for 10–11, 13 for
   * 13–14 and 15 for 15–18. Games saved before those bands used 7 for 7–11 and 13 for 13+.
   * 0 is a legacy "other" from games saved before any of those choices existed.
   */
  playerCount: number;
  owned: string[];
  credits: Credits;
  funding: Funding;
  considering: string[];
  view: ViewSettings;
  freePick: FreePick | null;
  queue: QueueItem[];
  /**
   * `tokens` is always the count on the map. `tokensAsReserve` only changes how it is
   * entered: as the number left in reserve out of the 55-token pool.
   */
  board: { cities: number; tokens: number; tokensAsReserve: boolean };
}

/** Population tokens each player has in all. */
export const TOKEN_POOL = 55;

/**
 * Player count choices. Ranges are grouped by the trade card deck they use (3–8, 9, 10–11,
 * 12–14, 15–18), with 3–6 and 12 on their own for starting credits; the value is the
 * lowest count in the range.
 */
export const PLAYER_COUNTS = [
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
  { value: 7, label: '7–8' },
  { value: 9, label: '9' },
  { value: 10, label: '10–11' },
  { value: 12, label: '12' },
  { value: 13, label: '13–14' },
  { value: 15, label: '15–18' },
] as const;

export function zeroCredits(): Credits {
  return { blue: 0, green: 0, orange: 0, red: 0, yellow: 0 };
}

export function emptyFunding(): Funding {
  return { hand: {}, held: [], treasury: 0 };
}

/** Funding from a saved game; games saved before the commodity hand keep only their treasury. */
export function loadFunding(saved: unknown): Funding {
  const f = (saved ?? {}) as Partial<Funding>;
  const treasury = typeof f.treasury === 'number' ? f.treasury : 0;
  if (!f.hand || typeof f.hand !== 'object' || !Array.isArray(f.held)) return { ...emptyFunding(), treasury };
  return { hand: { ...f.hand }, held: f.held.filter((id) => (f.hand![id] ?? 0) > 0), treasury };
}

export function startingCredits(playerCount: number): number {
  if (playerCount === 4 || playerCount === 6 || playerCount === 12) return 5;
  if (playerCount === 3 || playerCount === 5) return 10;
  return 0;
}

export function newGame(block: BlockId, playerCount: number): GameState {
  const c = startingCredits(playerCount);
  return {
    schema: 1,
    block,
    playerCount,
    owned: [],
    credits: { blue: c, green: c, orange: c, red: c, yellow: c },
    funding: emptyFunding(),
    considering: [],
    view: {
      filter: 'unowned',
      goal: 'advances',
      sort: 'alpha',
      ast: 'off',
      calamities: { minor: false, major: true, unowned: false },
    },
    freePick: null,
    queue: [],
    board: { cities: 0, tokens: 1, tokensAsReserve: false },
  };
}

export type Action =
  | { type: 'toggleConsider'; name: string }
  | { type: 'clearConsider' }
  | { type: 'buy' }
  | { type: 'skipFreePick' }
  | { type: 'setView'; view: Partial<ViewSettings> }
  | { type: 'setCommodity'; id: string; count: number }
  | { type: 'toggleHeld'; id: string }
  | { type: 'setTreasury'; treasury: number }
  | { type: 'clearHand' }
  | { type: 'resolveChoice'; delta: Credits }
  | { type: 'cancelChoice' }
  | { type: 'activateSpecial'; activation: 'gain10' | '10for10' | 'oneVPAdvance'; source: string }
  | { type: 'setBoard'; board: Partial<GameState['board']> };

function addCredits(a: Credits, b: Partial<Credits>): Credits {
  const out = { ...a };
  for (const c of COLORS) out[c] += b[c] ?? 0;
  return out;
}

/** Apply any face credits at the front of the queue; stop at the first choice the player must make. */
function drainQueue(state: GameState): GameState {
  let { credits, queue } = state;
  while (queue.length && queue[0].kind === 'face') {
    credits = addCredits(credits, queue[0].credits);
    queue = queue.slice(1);
  }
  return { ...state, credits, queue };
}

export function isBarred(state: GameState, name: string): boolean {
  const a = rulesFor(state.block).byName.get(name);
  return !!a?.warningTFA && COLORS.every((c) => state.credits[c] < 10);
}

function buy(state: GameState): GameState {
  const rules = rulesFor(state.block);
  const purchases = state.considering.map((n) => rules.byName.get(n)!).filter(Boolean);
  if (purchases.length === 0) return state;

  const owned = [...state.owned, ...purchases.map((a) => a.name)];
  const face = purchases.reduce((acc, a) => addCredits(acc, a.credits), zeroCredits());

  // The Four Arts must be resolved first: it needs 10 credits in a color before new credits arrive.
  const choices: QueueItem[] = purchases
    .filter((a) => a.extraCredit !== undefined)
    .sort((a, b) => Number(!!b.warningTFA) - Number(!!a.warningTFA))
    .map((a) => ({ kind: 'choice', source: a.name, amount: a.extraCredit!, cancelable: false }));

  let freePick: FreePick | null = null;
  if (purchases.some((a) => a.name === 'Anatomy' && rules.rules === 'we')) {
    const available = rules.advances.some((a) => !owned.includes(a.name) && freePickMatches(a, 'cheapScience'));
    if (available) freePick = 'cheapScience';
  }

  // Turn in every commodity that isn't held, then only as much treasury as the rest of the cost needs.
  const f = fundsBreakdown(state);
  const due = Math.max(0, costSummary(state).total - f.cards);
  const treasury = Math.max(0, state.funding.treasury - Math.ceil(due / f.treasuryMultiplier));
  const hand = Object.fromEntries(state.funding.held.map((id) => [id, state.funding.hand[id] ?? 0]).filter(([, n]) => n));

  const filter = state.view.filter === 'affordable' || state.view.filter === 'almostAffordable' ? 'unowned' : state.view.filter;

  return drainQueue({
    ...state,
    owned,
    considering: [],
    funding: { hand, held: [], treasury },
    freePick,
    queue: [...state.queue, ...choices, { kind: 'face', credits: face }],
    view: { ...state.view, filter },
  });
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'toggleConsider': {
      const { name } = action;
      if (state.owned.includes(name) || isBarred(state, name)) return state;
      if (state.considering.includes(name)) {
        return { ...state, considering: state.considering.filter((n) => n !== name) };
      }
      if (state.freePick) {
        const a = rulesFor(state.block).byName.get(name);
        if (!a || !freePickMatches(a, state.freePick)) return state;
        return { ...state, considering: [name] };
      }
      return { ...state, considering: [...state.considering, name] };
    }
    case 'clearConsider':
      return { ...state, considering: [] };
    case 'buy':
      return buy(state);
    case 'skipFreePick':
      return { ...state, freePick: null, considering: [] };
    case 'setView':
      return { ...state, view: { ...state.view, ...action.view } };
    case 'setCommodity': {
      const count = Math.max(0, Math.floor(action.count));
      const hand = { ...state.funding.hand };
      if (count > 0) hand[action.id] = count;
      else delete hand[action.id];
      const held = count > 0 ? state.funding.held : state.funding.held.filter((id) => id !== action.id);
      return { ...state, funding: { ...state.funding, hand, held } };
    }
    case 'toggleHeld': {
      const { held, hand } = state.funding;
      if (!hand[action.id]) return state;
      const next = held.includes(action.id) ? held.filter((id) => id !== action.id) : [...held, action.id];
      return { ...state, funding: { ...state.funding, held: next } };
    }
    case 'setTreasury':
      return { ...state, funding: { ...state.funding, treasury: Math.max(0, Math.floor(action.treasury)) } };
    case 'clearHand':
      return { ...state, funding: { ...state.funding, hand: {}, held: [] } };
    case 'resolveChoice': {
      if (state.queue[0]?.kind !== 'choice') return state;
      return drainQueue({ ...state, credits: addCredits(state.credits, action.delta), queue: state.queue.slice(1) });
    }
    case 'cancelChoice': {
      const head = state.queue[0];
      if (head?.kind !== 'choice' || !head.cancelable) return state;
      return drainQueue({ ...state, queue: state.queue.slice(1) });
    }
    case 'activateSpecial': {
      if (action.activation === 'oneVPAdvance') {
        return { ...state, freePick: 'oneVP', considering: [] };
      }
      const amount: ExtraCredit = action.activation === 'gain10' ? -10 : '10for10';
      return { ...state, queue: [...state.queue, { kind: 'choice', source: action.source, amount, cancelable: true }] };
    }
    case 'setBoard':
      return { ...state, board: { ...state.board, ...action.board } };
  }
}

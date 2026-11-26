import type { BlockId, BuildingEra, Credits, ExtraCredit } from '../data';
import { buildingById, COLORS, rulesFor } from '../data';
import { buildingsOn, freePickMatches, payment } from './selectors';

export type FilterId = 'unowned' | 'affordable' | 'almostAffordable' | 'goal' | 'owned' | 'all';
export type SortId = 'alpha' | 'cost' | 'vp' | 'economy' | 'discount' | 'color' | 'chains';
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

/** The Special Buildings expansion (West/East only). Buildings are named by their civilization's id. */
export interface BuildingsState {
  enabled: boolean;
  /** Your civilization: controlling its historic building is worth 2 more VP. */
  civ: string | null;
  /** Your succession marker's era on the A.S.T., which sets what a building costs. */
  era: BuildingEra;
  /** The building in your own region. You own it whether or not you control it. */
  owned: string | null;
  /** Buildings you control (a city or token majority in their area), including your own if you do. */
  controlled: string[];
  /** A building to construct with this turn's purchase of Advances. */
  considering: string | null;
  /** Controlled buildings to sacrifice as commodity cards when buying. */
  sacrificing: string[];
}

/** A pending choice of extra credits, or the face credits waiting to be added after those choices. */
export type QueueItem =
  | { kind: 'choice'; source: string; amount: ExtraCredit; cancelable: boolean }
  | { kind: 'face'; credits: Credits };

export interface ViewSettings {
  filter: FilterId;
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
  /** Advances the player plans to buy over the game, in the order they were added. */
  goal: string[];
  view: ViewSettings;
  freePick: FreePick | null;
  queue: QueueItem[];
  /**
   * `tokens` is always the count on the map. `tokensAsReserve` only changes how it is
   * entered: as the number left in reserve out of the 55-token pool. `astPosition` is the
   * space your succession marker is on, from 1 (the start) up.
   */
  board: { cities: number; tokens: number; tokensAsReserve: boolean; astPosition: number };
  buildings: BuildingsState;
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

export function newBuildings(): BuildingsState {
  return { enabled: false, civ: null, era: 'bronze', owned: null, controlled: [], considering: null, sacrificing: [] };
}

/** Special buildings from a saved game, dropping anything unknown; games saved before them start with the expansion off. */
export function loadBuildings(saved: unknown): BuildingsState {
  const fresh = newBuildings();
  const b = (saved ?? {}) as Partial<BuildingsState>;
  const known = (id: unknown): id is string => typeof id === 'string' && !!buildingById(id);
  const list = (ids: unknown) => (Array.isArray(ids) ? [...new Set(ids.filter(known))] : []);
  const controlled = list(b.controlled);
  const owned = known(b.owned) ? b.owned : null;
  return {
    enabled: b.enabled === true,
    civ: known(b.civ) ? b.civ : null,
    era: b.era === 'lateBronze' || b.era === 'iron' ? b.era : fresh.era,
    owned,
    controlled,
    considering: !owned && known(b.considering) && !controlled.includes(b.considering) ? b.considering : null,
    sacrificing: list(b.sacrificing).filter((id) => controlled.includes(id)),
  };
}

/** View settings from a saved game, dropping the Goal tab's old idea themes (`strategy`, or `goal` before that). */
export function loadView(saved: unknown, fresh: ViewSettings): ViewSettings {
  const { goal: _goal, strategy: _strategy, ...v } = (saved ?? {}) as Partial<ViewSettings> & { goal?: unknown; strategy?: unknown };
  return { ...fresh, ...v };
}

/** The goal list from a saved game, keeping only Advances in this block. */
export function loadGoal(saved: unknown, block: BlockId): string[] {
  if (!Array.isArray(saved)) return [];
  const rules = rulesFor(block);
  return [...new Set(saved.filter((n): n is string => typeof n === 'string' && rules.byName.has(n)))];
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
    goal: [],
    view: {
      filter: 'unowned',
      sort: 'alpha',
      ast: 'off',
      calamities: { minor: false, major: true, unowned: false },
    },
    freePick: null,
    queue: [],
    board: { cities: 0, tokens: 1, tokensAsReserve: false, astPosition: 1 },
    buildings: newBuildings(),
  };
}

export type Action =
  | { type: 'toggleConsider'; name: string }
  | { type: 'clearConsider' }
  | { type: 'buy' }
  | { type: 'toggleGoal'; name: string }
  | { type: 'clearGoal' }
  | { type: 'skipFreePick' }
  | { type: 'setView'; view: Partial<ViewSettings> }
  | { type: 'setCommodity'; id: string; count: number }
  | { type: 'toggleHeld'; id: string }
  | { type: 'setTreasury'; treasury: number }
  | { type: 'clearHand' }
  | { type: 'resolveChoice'; delta: Credits }
  | { type: 'cancelChoice' }
  | { type: 'activateSpecial'; activation: 'gain10' | '10for10' | 'oneVPAdvance'; source: string }
  | { type: 'setBoard'; board: Partial<GameState['board']> }
  | { type: 'setBuildings'; buildings: Partial<Pick<BuildingsState, 'enabled' | 'civ' | 'era'>> }
  | { type: 'considerBuilding'; id: string | null }
  | { type: 'setOwnedBuilding'; id: string }
  | { type: 'toggleControl'; id: string }
  | { type: 'toggleSacrifice'; id: string }
  | { type: 'sacrificeBuilding'; id: string };

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
  const on = buildingsOn(state);
  const building = on ? state.buildings.considering : null;
  if (purchases.length === 0 && !building) return state;

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

  // Turn in every commodity that isn't kept, then only as much treasury as the rest of the cost needs.
  const treasury = state.funding.treasury - payment(state).treasury;
  const hand = Object.fromEntries(state.funding.held.map((id) => [id, state.funding.hand[id] ?? 0]).filter(([, n]) => n));

  const filter = state.view.filter === 'affordable' || state.view.filter === 'almostAffordable' ? 'unowned' : state.view.filter;

  // Sacrificed buildings leave the board; a new one is owned and, standing by your city, controlled.
  let buildings = state.buildings;
  if (on) {
    const gone = buildings.sacrificing.filter((id) => buildings.controlled.includes(id));
    const controlled = buildings.controlled.filter((id) => !gone.includes(id));
    const owned = buildings.owned && gone.includes(buildings.owned) ? null : buildings.owned;
    buildings = {
      ...buildings,
      owned: building ?? owned,
      controlled: building ? [...controlled, building] : controlled,
      considering: null,
      sacrificing: [],
    };
  }

  return drainQueue({
    ...state,
    buildings,
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
    case 'toggleGoal': {
      const { name } = action;
      if (state.goal.includes(name)) return { ...state, goal: state.goal.filter((n) => n !== name) };
      if (!rulesFor(state.block).byName.has(name)) return state;
      return { ...state, goal: [...state.goal, name] };
    }
    case 'clearGoal':
      return { ...state, goal: [] };
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
    case 'setBuildings': {
      const { civ } = action.buildings;
      if (civ != null && !buildingById(civ)) return state;
      const buildings = { ...state.buildings, ...action.buildings };
      // Nothing is planned while the expansion is off.
      if (!buildings.enabled) Object.assign(buildings, { considering: null, sacrificing: [] });
      return { ...state, buildings };
    }
    case 'considerBuilding': {
      const b = state.buildings;
      const { id } = action;
      if (id === null) return { ...state, buildings: { ...b, considering: null } };
      // One building in your own region, built from those still in the supply, not as a free pick.
      if (!buildingsOn(state) || b.owned || state.freePick || !buildingById(id) || b.controlled.includes(id)) return state;
      return { ...state, buildings: { ...b, considering: id } };
    }
    case 'setOwnedBuilding': {
      // A building already standing in your region, for games tracked from partway through.
      const b = state.buildings;
      if (!buildingsOn(state) || b.owned || !buildingById(action.id)) return state;
      const controlled = b.controlled.includes(action.id) ? b.controlled : [...b.controlled, action.id];
      return { ...state, buildings: { ...b, owned: action.id, controlled, considering: null } };
    }
    case 'toggleControl': {
      const b = state.buildings;
      if (!buildingById(action.id) || b.considering === action.id) return state;
      if (b.controlled.includes(action.id)) {
        const controlled = b.controlled.filter((id) => id !== action.id);
        return { ...state, buildings: { ...b, controlled, sacrificing: b.sacrificing.filter((id) => id !== action.id) } };
      }
      return { ...state, buildings: { ...b, controlled: [...b.controlled, action.id] } };
    }
    case 'toggleSacrifice': {
      const b = state.buildings;
      if (b.sacrificing.includes(action.id)) return { ...state, buildings: { ...b, sacrificing: b.sacrificing.filter((id) => id !== action.id) } };
      if (!b.controlled.includes(action.id)) return state;
      return { ...state, buildings: { ...b, sacrificing: [...b.sacrificing, action.id] } };
    }
    case 'sacrificeBuilding': {
      const b = state.buildings;
      const keep = (ids: string[]) => ids.filter((id) => id !== action.id);
      return {
        ...state,
        buildings: { ...b, owned: b.owned === action.id ? null : b.owned, controlled: keep(b.controlled), sacrificing: keep(b.sacrificing) },
      };
    }
  }
}

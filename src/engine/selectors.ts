import type { Advance, Calamity, Commodity, RuleData, TradePower } from '../data';
import { buildingById, buildingCost, SPECIAL_BUILDING_VP, commoditiesFor, commodityById, rulesFor, setValue } from '../data';
import type { AstMode, BuildingsState, FilterId, FreePick, GameState, SortId } from './game';

/** Whether this game uses the Special Buildings expansion. */
export function buildingsOn(state: GameState): boolean {
  return state.buildings.enabled;
}

export function freePickMatches(a: Advance, pick: FreePick): boolean {
  if (pick === 'cheapScience') return a.price < 100 && a.colors.includes('green');
  return a.price < 100;
}

export function owns(state: GameState, name: string): boolean {
  return state.owned.includes(name);
}

/** Discount from owning the previous card in this card's chain. */
export function chainDiscount(state: GameState, a: Advance): number {
  if (!a.prev || !owns(state, a.prev)) return 0;
  const prev = rulesFor(state.block).byName.get(a.prev)!;
  return 10 * (1 + Math.floor(prev.price / 100));
}

export function creditFor(state: GameState, a: Advance): number {
  return Math.max(0, ...a.colors.map((c) => state.credits[c]));
}

export function cost(state: GameState, a: Advance): number {
  return Math.max(0, a.price - creditFor(state, a) - chainDiscount(state, a));
}

export function victoryPoints(state: GameState): number {
  const rules = rulesFor(state.block);
  return state.owned.reduce((t, n) => t + (rules.byName.get(n)?.vp ?? 0), 0);
}

export interface BuildingPoints {
  /** 2 for owning a special building. */
  owned: number;
  /** 1 for each special building you control. */
  controlled: number;
  /** 2 more for controlling your civilization's historic building. */
  historic: number;
  total: number;
}

/** Victory points from special buildings, or null when the game doesn't use them. */
export function buildingPoints(state: GameState): BuildingPoints | null {
  return buildingsOn(state) ? pointsForBuildings(state.buildings) : null;
}

/** 2 VP for owning a building, 1 for each one controlled, and 2 more for controlling your civilization's own. */
export function pointsForBuildings({ owned, controlled, civ }: Pick<BuildingsState, 'owned' | 'controlled' | 'civ'>): BuildingPoints {
  const p = { owned: owned ? 2 : 0, controlled: controlled.length, historic: civ && controlled.includes(civ) ? 2 : 0 };
  return { ...p, total: p.owned + p.controlled + p.historic };
}

export interface FundsBreakdown {
  /** Value of the commodity cards that will be turned in (not held), including any substitution. */
  cards: number;
  /** Value of the commodity cards held for next turn. */
  held: number;
  heldCards: number;
  /** Treasury tokens count double with Mining (West/East) or Treasure Voyages (Far East). */
  treasuryMultiplier: 1 | 2;
  treasuryValue: number;
  /** The card counted as part of another set, when Trade Empire or Silk Routes adds value. */
  substitution: Substitution | null;
  /** Special buildings being sacrificed as commodity cards, when any are. */
  buildingCards: BuildingCards | null;
  total: number;
}

/** Sacrificed special buildings, each counted as 1 missing card of an incomplete set. */
export interface BuildingCards {
  /** Buildings being sacrificed. */
  sacrificed: number;
  /** How many of them found a set to join; the rest add nothing. */
  used: number;
  /** The sets they join and how many each. */
  sets: { set: Commodity; cards: number }[];
  /** Funds gained over counting the sets without them. */
  gain: number;
}

/** One commodity card counted as a missing card of another, incomplete, set. */
export interface Substitution {
  /** The advance that allows it. */
  advance: string;
  /** The commodity whose card stands in. */
  substitute: Commodity;
  /** The commodity whose incomplete set it joins. */
  set: Commodity;
  /** Funds gained over counting every set as it is. */
  gain: number;
}

/**
 * The substitution that adds the most to funds, or null without the advance or a gain.
 * Only cards being turned in take part: a held set neither gains nor gives a card. A set is
 * incomplete while you hold fewer cards than its commodity has in this game's deck.
 */
export function bestSubstitution(state: GameState): Substitution | null {
  return substitutions(state).reduce<Substitution | null>((best, s) => (s.gain > (best?.gain ?? 0) ? s : best), null);
}

interface Pile {
  c: Commodity;
  n: number;
}

/** Commodity cards being turned in (not held), with this game's deck for the most of each. */
function turnedIn(state: GameState): { deck: Map<string, Commodity>; piles: Pile[] } {
  const { hand, held } = state.funding;
  const deck = new Map(commoditiesFor(state.block, state.playerCount).map((c) => [c.id, c]));
  const piles = Object.entries(hand)
    .filter(([id, n]) => n > 0 && !held.includes(id))
    .map(([id, n]) => ({ c: deck.get(id) ?? commodityById(id), n }))
    .filter((x): x is Pile => !!x.c);
  return { deck, piles };
}

/** Every substitution the owned advance allows, whether or not it gains anything on its own. */
function substitutions(state: GameState): Substitution[] {
  const { advance, higherOnly } = rulesFor(state.block).setSubstitute;
  if (!owns(state, advance)) return [];
  const { deck, piles } = turnedIn(state);
  const out: Substitution[] = [];
  for (const set of piles) {
    if (!deck.has(set.c.id) || set.n >= set.c.max) continue;
    const added = setValue(set.c.value, set.n + 1) - setValue(set.c.value, set.n);
    for (const sub of piles) {
      if (sub.c.id === set.c.id) continue;
      if (higherOnly ? sub.c.value <= set.c.value : sub.c.value < set.c.value) continue;
      const gain = added - (setValue(sub.c.value, sub.n) - setValue(sub.c.value, sub.n - 1));
      out.push({ advance, substitute: sub.c, set: set.c, gain });
    }
  }
  return out;
}

/**
 * The best way to add up to `count` building cards to incomplete sets being turned in. A set
 * gains more with each card added, so every split is tried (sets by number of cards).
 */
function placeBuildingCards(deck: Map<string, Commodity>, piles: Pile[], count: number): Omit<BuildingCards, 'sacrificed'> {
  const open = piles.filter((p) => p.n > 0 && deck.has(p.c.id) && p.n < p.c.max);
  // best[i][r]: the most gained from sets i.. with r cards to place, and how many go to set i.
  const best: { gain: number; take: number }[][] = Array.from({ length: open.length + 1 }, () =>
    Array.from({ length: count + 1 }, () => ({ gain: 0, take: 0 })),
  );
  for (let i = open.length - 1; i >= 0; i--) {
    const { c, n } = open[i];
    for (let r = 0; r <= count; r++) {
      let top = best[i + 1][r];
      let take = 0;
      for (let k = 1; k <= Math.min(r, c.max - n); k++) {
        const gain = setValue(c.value, n + k) - setValue(c.value, n) + best[i + 1][r - k].gain;
        if (gain > top.gain) {
          top = { gain, take: k };
          take = k;
        }
      }
      best[i][r] = { gain: top.gain, take };
    }
  }
  const sets: BuildingCards['sets'] = [];
  let r = count;
  open.forEach((p, i) => {
    const { take } = best[i][r];
    if (take > 0) sets.push({ set: p.c, cards: take });
    r -= take;
  });
  return { used: count - r, sets, gain: best[0][count].gain };
}

/** Sacrificed buildings this purchase can use: only ones you control. */
function sacrificing(state: GameState): string[] {
  if (!buildingsOn(state)) return [];
  const { sacrificing: ids, controlled } = state.buildings;
  return ids.filter((id) => controlled.includes(id));
}

/**
 * The substitution (if any) and building cards that together add the most to funds. Trade
 * Empire and sacrificed buildings may both be used, so each substitution is tried with the
 * buildings placed around it.
 */
function bestCardBonuses(state: GameState): { substitution: Substitution | null; buildingCards: BuildingCards | null } {
  const sacrificed = sacrificing(state).length;
  if (sacrificed === 0) return { substitution: bestSubstitution(state), buildingCards: null };
  const { deck, piles } = turnedIn(state);
  let top: { substitution: Substitution | null; buildingCards: BuildingCards; total: number } | null = null;
  for (const sub of [null, ...substitutions(state)]) {
    const adjusted = piles.map((p) => ({ c: p.c, n: p.n + (p.c.id === sub?.set.id ? 1 : 0) - (p.c.id === sub?.substitute.id ? 1 : 0) }));
    const placed = placeBuildingCards(deck, adjusted, sacrificed);
    const total = (sub?.gain ?? 0) + placed.gain;
    if (!top || total > top.total) top = { substitution: sub, buildingCards: { sacrificed, ...placed }, total };
  }
  return top!;
}

export function fundsBreakdown(state: GameState): FundsBreakdown {
  const { hand, held: heldIds, treasury } = state.funding;
  let cards = 0;
  let held = 0;
  let heldCards = 0;
  for (const [id, n] of Object.entries(hand)) {
    const value = setValue(commodityById(id)?.value ?? 0, n);
    if (heldIds.includes(id)) {
      held += value;
      heldCards += n;
    } else cards += value;
  }
  const { substitution, buildingCards } = bestCardBonuses(state);
  cards += (substitution?.gain ?? 0) + (buildingCards?.gain ?? 0);
  const treasuryMultiplier = owns(state, rulesFor(state.block).treasuryDoubler) ? 2 : 1;
  const treasuryValue = treasury * treasuryMultiplier;
  return { cards, held, heldCards, treasuryMultiplier, treasuryValue, substitution, buildingCards, total: cards + treasuryValue };
}

export interface Payment {
  /** Commodity sets turned in, with what each counts for (substitution and buildings included). */
  sets: { commodity: Commodity; value: number }[];
  /** Treasury tokens spent. */
  treasury: number;
  /** What those tokens count for: double with Mining (West/East) or Treasure Voyages (Far East). */
  treasuryValue: number;
}

/**
 * How buying the Advances being considered is paid for: every commodity set that isn't kept
 * is turned in, then only as many treasury tokens as the rest of the cost needs.
 */
export function payment(state: GameState): Payment {
  const f = fundsBreakdown(state);
  const sub = f.substitution;
  const sets = turnedIn(state)
    .piles.map(({ c, n }) => {
      const fromBuildings = f.buildingCards?.sets.find((s) => s.set.id === c.id)?.cards ?? 0;
      const counted = n + (sub?.set.id === c.id ? 1 : 0) - (sub?.substitute.id === c.id ? 1 : 0) + fromBuildings;
      return { commodity: c, value: setValue(c.value, counted) };
    })
    .filter((s) => s.value > 0)
    .sort((a, b) => a.commodity.value - b.commodity.value || a.commodity.name.localeCompare(b.commodity.name));
  const due = Math.max(0, costSummary(state).total - f.cards);
  const treasury = Math.min(state.funding.treasury, Math.ceil(due / f.treasuryMultiplier));
  return { sets, treasury, treasuryValue: treasury * f.treasuryMultiplier };
}

/** Value available for Advances this turn: commodities not held, plus treasury. */
export function funds(state: GameState): number {
  return fundsBreakdown(state).total;
}

export interface CostLine {
  advance: Advance;
  cost: number;
  free: boolean;
}

export interface CostSummary {
  lines: CostLine[];
  libraryDiscount: number;
  /** A special building being constructed in the same purchase. */
  building: { cost: number } | null;
  total: number;
}

export function costSummary(state: GameState): CostSummary {
  const rules = rulesFor(state.block);
  let freeUsed = false;
  let maxOther = 0;
  let hasLibrary = false;
  const lines: CostLine[] = state.considering.map((n) => {
    const a = rules.byName.get(n)!;
    const c = cost(state, a);
    let free = false;
    if (state.freePick && !freeUsed && freePickMatches(a, state.freePick)) {
      free = freeUsed = true;
    }
    if (a.name === 'Library') hasLibrary = true;
    else maxOther = Math.max(maxOther, c);
    return { advance: a, cost: c, free };
  });
  const building = buildingsOn(state) && state.buildings.considering ? { cost: buildingCost(state.buildings.era) } : null;
  // A building is bought as if it were an Advance, so Library can discount it too.
  const libraryDiscount = hasLibrary ? Math.min(Math.max(maxOther, building?.cost ?? 0), 40) : 0;
  const total = lines.reduce((t, l) => t + (l.free ? 0 : l.cost), 0) - libraryDiscount + (building?.cost ?? 0);
  return { lines, libraryDiscount, building, total };
}

/** What the Advances list shows: an Advance, or the Special Building you can buy alongside them. */
export type ListItem =
  | { kind: 'advance'; advance: Advance }
  | { kind: 'building'; cost: number }
  /** A building you control: owned (in your region) or not. Its VP is what it is worth to you, and stays out of the Advances total. */
  | { kind: 'controlled'; id: string; vp: number; owned: boolean };

/** What a controlled building is worth to you: 1 for controlling it, 2 more if it is the one you own, 2 more if it is your nation's own. */
export function controlledBuildingValue(state: GameState, id: string): number {
  const { owned, civ } = state.buildings;
  return 1 + (owned === id ? 2 : 0) + (civ === id ? 2 : 0);
}

export const SPECIAL_BUILDING_NAME = 'Special Building';

export interface AdvanceListing {
  advances: Advance[];
  /** The Advances plus the Special Building, in the chosen order. */
  items: ListItem[];
  /** Names of advances that start a new strategic chain (shown with a divider). */
  chainStarts: Set<string>;
  sort: SortId | 'revCost';
  filter: FilterId | FreePick;
}

export function visibleAdvances(state: GameState): AdvanceListing {
  const rules = rulesFor(state.block);
  const f: FilterId | FreePick = state.freePick ?? state.view.filter;
  const s: SortId | 'revCost' = state.freePick === 'oneVP' ? 'revCost' : state.freePick ? 'alpha' : state.view.sort;
  const summary = costSummary(state);
  const available = funds(state);
  let cap = (available || 9999) + (f === 'almostAffordable' ? 50 : 0) - summary.total;
  if (state.considering.includes('Library')) {
    // Raise the cap while the Library discount has not been fully used.
    const costliest = summary.lines.filter((l) => l.advance.name !== 'Library').reduce((m, l) => Math.max(m, l.cost), summary.building?.cost ?? 0);
    if (costliest < 40) cap += 40 - costliest;
  }

  const advances = rules.advances.filter((a) => {
    const isOwned = owns(state, a.name);
    if (f === 'all') return true;
    if (f === 'owned') return isOwned;
    if (state.considering.includes(a.name)) return true;
    if (isOwned) return false;
    switch (f) {
      case 'unowned':
        return true;
      case 'cheapScience':
      case 'oneVP':
        return freePickMatches(a, f);
      case 'goal':
        return onGoal(state, a.name);
      default:
        return cost(state, a) <= cap;
    }
  });

  // The Special Building sits among the Advances until you own one.
  const buildingCostNow = buildingCost(state.buildings.era);
  const showBuilding =
    buildingsOn(state) &&
    !state.buildings.owned &&
    !state.freePick &&
    (state.buildings.considering || f === 'all' || f === 'unowned' || (f === 'goal' && state.buildings.goal) || ((f === 'affordable' || f === 'almostAffordable') && buildingCostNow <= cap));
  const list: ListItem[] = advances.map((advance) => ({ kind: 'advance', advance }));
  if (showBuilding) list.push({ kind: 'building', cost: buildingCostNow });

  // Buildings you control are listed with the Advances you own.
  if (buildingsOn(state) && !state.freePick && (f === 'owned' || f === 'all')) {
    for (const id of state.buildings.controlled) {
      list.push({ kind: 'controlled', id, vp: controlledBuildingValue(state, id), owned: state.buildings.owned === id });
    }
  }

  const c = (a: Advance) => cost(state, a);
  const key = {
    name: (i: ListItem) => (i.kind === 'advance' ? i.advance.name : i.kind === 'controlled' ? buildingById(i.id)?.name ?? i.id : SPECIAL_BUILDING_NAME),
    cost: (i: ListItem) => (i.kind === 'advance' ? c(i.advance) : i.kind === 'building' ? i.cost : 0),
    price: (i: ListItem) => (i.kind === 'advance' ? i.advance.price : i.kind === 'building' ? i.cost : 0),
    // The Special Building counts as 5 VP here, though it shows 3/5.
    vp: (i: ListItem) => (i.kind === 'advance' ? i.advance.vp : i.kind === 'building' ? SPECIAL_BUILDING_VP.high : i.vp),
    discount: (i: ListItem) => (i.kind === 'advance' ? i.advance.price - c(i.advance) : 0),
    color: (i: ListItem) => (i.kind === 'advance' ? i.advance.color : 'grey'),
    chain: (i: ListItem) => (i.kind === 'advance' ? i.advance.chain : Infinity),
  };
  const chainStarts = new Set<string>();
  switch (s) {
    case 'cost':
      list.sort((a, b) => key.cost(a) - key.cost(b));
      break;
    case 'revCost':
      list.sort((a, b) => key.price(b) - key.price(a));
      break;
    case 'vp':
      list.sort((a, b) => key.vp(b) - key.vp(a) || key.cost(a) - key.cost(b));
      break;
    case 'economy':
      list.sort((a, b) => key.cost(a) / key.vp(a) - key.cost(b) / key.vp(b) || key.cost(a) - key.cost(b));
      break;
    case 'color':
      list.sort((a, b) => key.color(a).localeCompare(key.color(b)));
      break;
    case 'discount':
      list.sort((a, b) => key.discount(b) - key.discount(a));
      break;
    case 'chains':
      list.sort((a, b) => (key.chain(a) === key.chain(b) ? 0 : key.chain(a) - key.chain(b)) || key.price(a) - key.price(b));
      list.forEach((a, i) => {
        if (i > 0 && key.chain(list[i - 1]) !== key.chain(a)) chainStarts.add(key.name(a));
      });
      break;
    case 'alpha': {
      // Advances keep their listed order; the building goes in by name.
      const at = list.findIndex((i) => i.kind === 'advance' && i.advance.name.localeCompare(SPECIAL_BUILDING_NAME) > 0);
      if (showBuilding && at >= 0) list.splice(at, 0, list.pop()!);
      break;
    }
  }
  return {
    advances: list.flatMap((i) => (i.kind === 'advance' ? [i.advance] : [])),
    items: list,
    chainStarts,
    sort: s,
    filter: f,
  };
}

// ---------------------------------------------------------------------------
// Goal: the Advances a player plans to buy over the game

export function onGoal(state: GameState, name: string): boolean {
  return state.goal.includes(name);
}

export interface GoalProgress {
  /** Goal Advances still to buy, cheapest first at today's costs. */
  toBuy: Advance[];
  /** Goal Advances already owned, in the order they were added to the goal. */
  bought: Advance[];
  /** What the Advances still to buy cost now, before chain discounts or credits they give each other. */
  costLeft: number;
  /** VP the Advances still to buy are worth. */
  vpLeft: number;
}

export function goalProgress(state: GameState): GoalProgress {
  const rules = rulesFor(state.block);
  const advances = state.goal.map((n) => rules.byName.get(n)).filter((a): a is Advance => !!a);
  const toBuy = advances.filter((a) => !owns(state, a.name)).sort((a, b) => cost(state, a) - cost(state, b) || a.price - b.price);
  const bought = advances.filter((a) => owns(state, a.name));
  return {
    toBuy,
    bought,
    costLeft: toBuy.reduce((t, a) => t + cost(state, a), 0),
    vpLeft: toBuy.reduce((t, a) => t + a.vp, 0),
  };
}

// ---------------------------------------------------------------------------
// Archaeological Succession Table guide

export interface AstAge {
  abbr: string;
  name: string;
  text: string;
  /** Cities needed on the map. */
  cities: number;
  /** Advances needed within the price range, and VP needed (0 = none). */
  cards: number;
  minPrice: number;
  maxPrice: number;
  vp: number;
}

const age = (abbr: string, name: string, text: string, cities: number, cards = 0, minPrice = 0, maxPrice = 999, vp = 0): AstAge => ({
  abbr,
  name,
  text,
  cities,
  cards,
  minPrice,
  maxPrice,
  vp,
});

export const AST: Record<Exclude<AstMode, 'off'>, AstAge[]> = {
  basic: [
    age('SA', 'Stone Age', 'No requirement', 0),
    age('EBA', 'Early Bronze Age', '2 cities', 2),
    age('MBA', 'Middle Bronze Age', '3 cities, 3 Advances', 3, 3),
    age('LBA', 'Late Bronze Age', '3 cities, 3 Advances priced 100+', 3, 3, 100, 999),
    age('EIA', 'Early Iron Age', '4 cities, 2 Advances priced 200+', 4, 2, 200, 999),
    age('LIA', 'Late Iron Age', '5 cities, 3 Advances priced 200+', 5, 3, 200, 999),
  ],
  expert: [
    age('SA', 'Stone Age', 'No requirement', 0),
    age('EBA', 'Early Bronze Age', '3 cities', 3),
    age('MBA', 'Middle Bronze Age', '3 cities, 5 VP', 3, 0, 0, 999, 5),
    age('LBA', 'Late Bronze Age', '4 cities, 12 Advances', 4, 12),
    age('EIA', 'Early Iron Age', '5 cities, 10 Advances priced under 100, 38 VP', 5, 10, 0, 99, 38),
    age('LIA', 'Late Iron Age', '6 cities, all 17 Advances priced under 100, 56 VP', 6, 17, 0, 99, 56),
  ],
};

/** Progress toward an age as a fraction 0..1, counting only Advances (cities are not tracked). */
export function ageProgress(a: AstAge, advances: Advance[]): number {
  if (a.cards === 0 && a.vp === 0) return 1;
  const cards = Math.max(1, a.cards);
  const vpNeeded = Math.max(1, a.vp);
  let cc = 0;
  let vp = 0;
  for (const x of advances) {
    vp += x.vp;
    if (x.price >= a.minPrice && x.price <= a.maxPrice) cc++;
  }
  return Math.min(1, cc / cards, vp / vpNeeded);
}

export interface AstStatus {
  mode: Exclude<AstMode, 'off'>;
  current: AstAge;
  /** Next age to reach, or null when every age's Advance requirement is met. */
  next: AstAge | null;
  owned: number;
  withConsidering: number;
}

export function astStatus(state: GameState): AstStatus | null {
  if (state.view.ast === 'off') return null;
  const rules = rulesFor(state.block);
  const ages = AST[state.view.ast];
  const owned = state.owned.map((n) => rules.byName.get(n)!);
  const considering = state.considering.map((n) => rules.byName.get(n)!);
  let current = ages[0];
  for (const a of ages) {
    if (ageProgress(a, owned) < 1) {
      return {
        mode: state.view.ast,
        current,
        next: a,
        owned: ageProgress(a, owned),
        withConsidering: ageProgress(a, [...owned, ...considering]),
      };
    }
    current = a;
  }
  return { mode: state.view.ast, current, next: null, owned: 1, withConsidering: 1 };
}

// ---------------------------------------------------------------------------
// City building

export type CityEstimate = { lacking: true } | { lacking: false; build: number; spare: number };

export function potentialCities(state: GameState): CityEstimate {
  const { cities, tokens } = state.board;
  const has = (n: string) => owns(state, n);
  if (rulesFor(state.block).rules === 'we') {
    const arch = has('Architecture') ? 3 : 0;
    const support = has('Cultural Ascendancy') ? 3 : 2;
    const surplus = tokens - cities * support;
    if (surplus < 0) return { lacking: true };
    const build = Math.max(0, Math.min(9 - cities, Math.floor((surplus + arch) / (6 + support))));
    const spare = surplus + (build > 0 ? arch : 0) - (6 + support) * build;
    return { lacking: false, build, spare };
  }
  const support = 2;
  const freeSupport = has('School of Principle') ? 2 : 0;
  let available = tokens - support * Math.max(0, cities - freeSupport);
  if (available < 0) return { lacking: true };
  let build = 0;
  let cityCost = 6 + (has('Paddy Field Farming') ? 1 : 0) - (has('Standardization') ? 1 : 0) - (has('Temple Construction') ? 1 : 0);
  while (available >= cityCost && cities + build < freeSupport) {
    build++;
    available -= cityCost;
  }
  cityCost += support;
  while (available >= cityCost && cities + build < 9) {
    build++;
    available -= cityCost;
  }
  return { lacking: false, build, spare: available };
}

/** Advances that change the city calculation, for showing what was taken into account. */
export function cityModifiers(state: GameState): string[] {
  const names =
    rulesFor(state.block).rules === 'we'
      ? ['Architecture', 'Cultural Ascendancy']
      : ['School of Principle', 'Paddy Field Farming', 'Standardization', 'Temple Construction'];
  return names.filter((n) => owns(state, n));
}

// ---------------------------------------------------------------------------
// Trade cards, special abilities, calamities

export function fewPlayers(state: GameState): boolean {
  return state.playerCount === 3 || state.playerCount === 4;
}

export function ownedTradePowers(state: GameState): TradePower[] {
  return rulesFor(state.block).tradePowers.filter((t) => {
    if (t.onlyFewPlayers) return fewPlayers(state) || state.playerCount === 0;
    return t.advance === null || owns(state, t.advance);
  });
}

export function tradeCardCost(state: GameState, tokens: number): number {
  const literature = rulesFor(state.block).rules === 'fe' && owns(state, 'Literature');
  return literature && tokens > 1 ? tokens - 1 : tokens;
}

export interface SpecialAbility {
  advance: Advance;
  text: string;
}

export function specialAbilities(state: GameState): SpecialAbility[] {
  const rules: RuleData = rulesFor(state.block);
  return state.owned
    .map((n) => rules.byName.get(n)!)
    .filter((a) => a.special)
    .sort((a, b) => a.price - b.price)
    .map((a) => ({
      advance: a,
      text: a.special!.replace(
        'you are the single player with the fewest Civilization Advances',
        `your number of Advances (${state.owned.length}) is less than everyone else's`,
      ),
    }));
}

export function calamityDescription(state: GameState, c: Calamity): string {
  return fewPlayers(state) && c.descriptionFewPlayers ? c.descriptionFewPlayers : c.description;
}

export function visibleCalamities(state: GameState): Calamity[] {
  const { minor, major, unowned } = state.view.calamities;
  return rulesFor(state.block)
    .calamities.filter((c) => (c.category === 'minor' ? minor : major))
    .map((c) => ({ ...c, advances: c.advances.filter((i) => unowned || owns(state, i.advance)) }));
}

/**
 * Calamities your owned Advances make worse on balance: more owned Advances hinder you
 * against it than help. An unowned Advance that helps against one of these is worth flagging.
 */
export function worsenedCalamities(state: GameState): Set<string> {
  const worse = new Set<string>();
  for (const c of rulesFor(state.block).calamities) {
    let net = 0;
    for (const i of c.advances) if (owns(state, i.advance)) net += i.direction === 'advantage' ? 1 : -1;
    if (net < 0) worse.add(c.name);
  }
  return worse;
}

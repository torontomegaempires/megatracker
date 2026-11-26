import type { Advance, Calamity, Commodity, RuleData, TradePower } from '../data';
import { commoditiesFor, commodityById, rulesFor, setValue } from '../data';
import type { AstMode, FilterId, FreePick, GameState, SortId, StrategyOption } from './game';

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
  total: number;
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
  const { advance, higherOnly } = rulesFor(state.block).setSubstitute;
  if (!owns(state, advance)) return null;
  const { hand, held } = state.funding;
  const deck = new Map(commoditiesFor(state.block, state.playerCount).map((c) => [c.id, c]));
  const cards = Object.entries(hand)
    .filter(([id, n]) => n > 0 && !held.includes(id))
    .map(([id, n]) => ({ c: deck.get(id) ?? commodityById(id), n }))
    .filter((x): x is { c: Commodity; n: number } => !!x.c);

  let best: Substitution | null = null;
  for (const set of cards) {
    if (!deck.has(set.c.id) || set.n >= set.c.max) continue;
    const added = setValue(set.c.value, set.n + 1) - setValue(set.c.value, set.n);
    for (const sub of cards) {
      if (sub.c.id === set.c.id) continue;
      if (higherOnly ? sub.c.value <= set.c.value : sub.c.value < set.c.value) continue;
      const gain = added - (setValue(sub.c.value, sub.n) - setValue(sub.c.value, sub.n - 1));
      if (gain > (best?.gain ?? 0)) best = { advance, substitute: sub.c, set: set.c, gain };
    }
  }
  return best;
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
  const substitution = bestSubstitution(state);
  cards += substitution?.gain ?? 0;
  const treasuryMultiplier = owns(state, rulesFor(state.block).treasuryDoubler) ? 2 : 1;
  const treasuryValue = treasury * treasuryMultiplier;
  return { cards, held, heldCards, treasuryMultiplier, treasuryValue, substitution, total: cards + treasuryValue };
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
  const libraryDiscount = hasLibrary ? Math.min(maxOther, 40) : 0;
  const total = lines.reduce((t, l) => t + (l.free ? 0 : l.cost), 0) - libraryDiscount;
  return { lines, libraryDiscount, total };
}

export interface AdvanceListing {
  advances: Advance[];
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
    const costliest = summary.lines.filter((l) => l.advance.name !== 'Library').reduce((m, l) => Math.max(m, l.cost), 0);
    if (costliest < 40) cap += 40 - costliest;
  }

  const list = rules.advances.filter((a) => {
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

  const c = (a: Advance) => cost(state, a);
  const chainStarts = new Set<string>();
  switch (s) {
    case 'cost':
      list.sort((a, b) => c(a) - c(b));
      break;
    case 'revCost':
      list.sort((a, b) => b.price - a.price);
      break;
    case 'vp':
      list.sort((a, b) => b.vp - a.vp || c(a) - c(b));
      break;
    case 'economy':
      list.sort((a, b) => c(a) / a.vp - c(b) / b.vp || c(a) - c(b));
      break;
    case 'color':
      list.sort((a, b) => a.color.localeCompare(b.color));
      break;
    case 'discount':
      list.sort((a, b) => b.price - c(b) - (a.price - c(a)));
      break;
    case 'chains':
      list.sort((a, b) => a.chain - b.chain || a.price - b.price);
      list.forEach((a, i) => {
        if (i > 0 && list[i - 1].chain !== a.chain) chainStarts.add(a.name);
      });
      break;
    case 'alpha':
      break;
  }
  return { advances: list, chainStarts, sort: s, filter: f };
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

/** Whether an Advance fits a theme: one of its goal tags, or helping reach the next AST age. */
export function matchesStrategy(state: GameState, a: Advance, strategy: StrategyOption): boolean {
  if (strategy === 'ast') return !!astStatus(state)?.next?.filter(a);
  return !!a.goals?.[strategy];
}

/** Unowned Advances not yet on the goal that fit the chosen theme, cheapest first. */
export function goalSuggestions(state: GameState): Advance[] {
  const { strategy } = state.view;
  return rulesFor(state.block)
    .advances.filter((a) => !owns(state, a.name) && !onGoal(state, a.name) && matchesStrategy(state, a, strategy))
    .sort((a, b) => cost(state, a) - cost(state, b) || a.price - b.price);
}

// ---------------------------------------------------------------------------
// Archaeological Succession Table guide

export interface AstAge {
  abbr: string;
  name: string;
  text: string;
  /** Advances needed within the price range, and VP needed (0 = none). */
  cards: number;
  minPrice: number;
  maxPrice: number;
  vp: number;
  /** Which advances help reach this age (for the "AST advancement" goal). */
  filter: (a: Advance) => boolean;
}

const any = () => true;
const age = (abbr: string, name: string, text: string, cards = 0, minPrice = 0, maxPrice = 999, vp = 0, filter: (a: Advance) => boolean = any): AstAge => ({ abbr, name, text, cards, minPrice, maxPrice, vp, filter });

export const AST: Record<Exclude<AstMode, 'off'>, AstAge[]> = {
  basic: [
    age('SA', 'Stone Age', 'No requirement'),
    age('EBA', 'Early Bronze Age', '2 cities'),
    age('MBA', 'Middle Bronze Age', '3 cities, 3 Advances', 3),
    age('LBA', 'Late Bronze Age', '3 cities, 3 Advances priced 100+', 3, 100, 999, 0, (a) => a.price >= 100),
    age('EIA', 'Early Iron Age', '4 cities, 2 Advances priced 200+', 2, 200, 999, 0, (a) => a.price >= 200),
    age('LIA', 'Late Iron Age', '5 cities, 3 Advances priced 200+', 3, 200, 999, 0, (a) => a.price >= 200),
  ],
  expert: [
    age('SA', 'Stone Age', 'No requirement'),
    age('EBA', 'Early Bronze Age', '3 cities'),
    age('MBA', 'Middle Bronze Age', '3 cities, 5 VP', 0, 0, 999, 5),
    age('LBA', 'Late Bronze Age', '4 cities, 12 Advances', 12),
    age('EIA', 'Early Iron Age', '5 cities, 10 Advances priced under 100, 38 VP', 10, 0, 99, 38),
    age('LIA', 'Late Iron Age', '6 cities, all 17 Advances priced under 100, 56 VP', 17, 0, 99, 56),
  ],
};

/** Progress toward an age as a fraction 0..1, counting only Advances (cities are not tracked). */
function ageProgress(a: AstAge, advances: Advance[]): number {
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

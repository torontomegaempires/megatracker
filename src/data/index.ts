import { advancesFarEast } from './advances-fe';
import { advancesWestEast } from './advances-we';
import { calamitiesFarEast } from './calamities-fe';
import { calamitiesWestEast } from './calamities-we';
import { interactions } from './interactions';
import type { AdvanceDef, CalamityDef, Color, InteractionDef } from './types';
import { COLORS } from './types';

export * from './types';
export * from './commodities';

export type BlockId = 'west' | 'east' | 'fareast';
export type RuleSet = 'we' | 'fe';

export const BLOCKS: Record<BlockId, { name: string; rules: RuleSet; blurb: string }> = {
  west: { name: 'The West', rules: 'we', blurb: '51 Advances, West/East rules' },
  east: { name: 'The East', rules: 'we', blurb: 'Same rules as The West' },
  fareast: { name: 'The Far East', rules: 'fe', blurb: '45 Advances, Far East rules' },
};

export interface Advance extends AdvanceDef {
  description: string;
  colors: Color[];
  vp: 1 | 3 | 6;
  /** Strategic chain number: each cheap card and the two cards it leads to. */
  chain: number;
  prev?: string;
  next?: string;
  calamities: InteractionDef[];
}

export interface Calamity extends CalamityDef {
  advances: InteractionDef[];
}

export interface TradePower {
  stack: number | string;
  tokens: number;
  text: string | null;
  /** Advance granting the power, or null for powers everyone has. */
  advance: string | null;
  /** Shown instead of an advance name for powers everyone has. */
  label?: string;
  onlyFewPlayers?: boolean;
}

export interface RuleData {
  rules: RuleSet;
  advances: Advance[];
  byName: Map<string, Advance>;
  calamities: Calamity[];
  tradePowers: TradePower[];
  /** Advance that doubles treasury value when buying advances. */
  treasuryDoubler: string;
}

export function vpForPrice(price: number): 1 | 3 | 6 {
  return price >= 200 ? 6 : price >= 100 ? 3 : 1;
}

/** Main rules text; trade, special and bonus effects are shown separately. */
function defaultDescription(a: AdvanceDef): string {
  return a.description ?? a.shortDescription ?? '';
}

function build(rules: RuleSet, defs: AdvanceDef[], calDefs: CalamityDef[]): RuleData {
  const advances: Advance[] = defs.map((d) => ({
    ...d,
    description: defaultDescription(d),
    colors: d.color.split('_').filter((c): c is Color => (COLORS as readonly string[]).includes(c)),
    vp: vpForPrice(d.price),
    chain: 0,
    calamities: [],
  }));
  const byName = new Map(advances.map((a) => [a.name, a]));

  for (const a of advances) {
    if (!a.nextname) continue;
    const next = byName.get(a.nextname);
    if (!next) throw new Error(`Unknown next advance ${a.nextname}`);
    a.next = next.name;
    next.prev = a.name;
  }

  // Chains start at each card priced under 100 and run through its next two cards.
  let chain = 1;
  for (const a of advances) {
    if (a.price >= 100) continue;
    a.chain = chain++;
    let n = a.next ? byName.get(a.next) : undefined;
    for (let i = 0; i < 2 && n; i++) {
      n.chain = a.chain;
      n = n.next ? byName.get(n.next) : undefined;
    }
  }

  const calamities: Calamity[] = calDefs.map((c) => ({ ...c, advances: [] }));
  const calByName = new Map(calamities.map((c) => [c.name, c]));
  for (const i of interactions.filter((x) => x.block === rules)) {
    const a = byName.get(i.advance);
    const c = calByName.get(i.calamity);
    if (!a || !c) throw new Error(`Bad interaction ${i.advance} / ${i.calamity}`);
    a.calamities.push(i);
    c.advances.push(i);
  }

  const tradePowers: TradePower[] = [{ stack: 9, tokens: 15, text: null, advance: null, label: 'everyone' }];
  if (rules === 'fe') {
    tradePowers.push({ stack: '0 (water)', tokens: 2, text: null, advance: null, label: '3–4 players', onlyFewPlayers: true });
  }
  for (const a of advances) {
    if (!a.trade) continue;
    if (typeof a.trade === 'string') {
      tradePowers.push({ stack: 10, tokens: -1, text: a.trade, advance: a.name });
    } else {
      for (const t of a.trade) tradePowers.push({ stack: t.stack, tokens: t.tokens, text: t.extra ?? null, advance: a.name });
    }
  }
  // Numbered stacks in order; text stacks starting with "0" go first, other text stacks last.
  const rank = (t: TradePower) => (typeof t.stack === 'number' ? t.stack : t.stack.startsWith('0') ? -1 : 99);
  tradePowers.sort((t1, t2) => rank(t1) - rank(t2));

  return {
    rules,
    advances,
    byName,
    calamities,
    tradePowers,
    treasuryDoubler: rules === 'we' ? 'Mining' : 'Treasure Voyages',
  };
}

export const RULES: Record<RuleSet, RuleData> = {
  we: build('we', advancesWestEast, calamitiesWestEast),
  fe: build('fe', advancesFarEast, calamitiesFarEast),
};

export function rulesFor(block: BlockId): RuleData {
  return RULES[BLOCKS[block].rules];
}

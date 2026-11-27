// Commodity trade cards, from the trade card division tables in the official Mega Empires
// rulebooks: The West (chapter 12), The East (chapter 10) and its Scenarios book (10-18
// players), and The Far East (chapter 14). Hand-written: the original calculator has no
// commodity data.
import { contrastRatio } from './buildings';
import type { BlockId } from './index';

export interface Commodity {
  /** Unique across editions. West and East cards share ids; Far East ids start "fe-". */
  id: string;
  name: string;
  /** Face value, which is also the stack the card is in. */
  value: number;
  /** Cards of this commodity in your deck: the most one player can hold. */
  max: number;
  /** The main colour of the printed card's background, as #rrggbb. */
  color: string;
  /** Text colour that reads on `color`. */
  onColor: string;
}

type Row = [name: string, value: number, max: number];

/**
 * Card colours. West and East colours are read from photos of the printed cards; the Far East has
 * no full photo set yet, so its colours are guessed from what each commodity looks like.
 */
// prettier-ignore
const COLORS: Record<string, string> = {
  // West and East
  ochre: '#c9962e', flax: '#4e8a3a', clay: '#7a86a0', hides: '#5a4030', bone: '#e6dfbc',
  papyri: '#f0d9c4', stone: '#8c8c88', iron: '#b0602a', furs: '#9a9088', wax: '#f09a28',
  fish: '#6e7378', timber: '#a86e3c', fruit: '#e2532a', salt: '#c8c0d0', ceramics: '#d9a08a',
  wool: '#e4ded4', cotton: '#d6d4d0', oil: '#c8d82a', sugar: '#b8893a', grain: '#c79a4a',
  wine: '#d2302e', lacquer: '#8e2a2a', textiles: '#8c7a5a', livestock: '#7a5236', glass: '#2e6fb8',
  tin: '#9ca0ac', silver: '#d4d4d4', copper: '#c06a2a', bronze: '#7e7464', lead: '#55565c',
  resin: '#c8a050', jade: '#9cb88a', incense: '#1e2a48', spice: '#4a4440', herbs: '#5c7a2e',
  marble: '#e8eaf0', dye: '#a82a6a', gemstones: '#3aa8d0', tea: '#7ab030', obsidian: '#2a2a2c',
  ivory: '#e8e0cc', silk: '#ededed', gold: '#f0b020', pearls: '#b4b8c0', amber: '#c88418',
  // The Far East (guessed)
  'fe-fish': '#6e7378', 'fe-meat': '#b04848', 'fe-bamboo': '#9ab848', 'fe-stone': '#8c8c88',
  'fe-terracotta': '#c0643c', 'fe-charcoal': '#333436', 'fe-beans': '#7a3a2a', 'fe-grain': '#c79a4a',
  'fe-horses': '#8a5a34', 'fe-buffalo': '#4a4038', 'fe-silver': '#d4d4d4', 'fe-copper': '#c06a2a',
  'fe-tea': '#7ab030', 'fe-incense': '#1e2a48', 'fe-jade': '#4fa07a', 'fe-dye': '#a82a6a',
  'fe-porcelain': '#2f5aa8', 'fe-silk': '#ededed', 'fe-fruit': '#e2532a', 'fe-lumber': '#a86e3c',
  'fe-paper': '#efe6d2', 'fe-oil': '#c8d82a', 'fe-swine': '#e0a0a0', 'fe-mercury': '#a8b0b8',
  'fe-cinnamon': '#8b4a22', 'fe-marble': '#e8eaf0', 'fe-ivory': '#e8e0cc',
};

const ON_DARK = '#ffffff';
const ON_LIGHT = '#17181a';

const c = ([name, value, max]: Row, id = name.toLowerCase()): Commodity => {
  const color = COLORS[id];
  const onColor = contrastRatio(color, ON_DARK) >= contrastRatio(color, ON_LIGHT) ? ON_DARK : ON_LIGHT;
  return { id, name, value, max, color, onColor };
};

/**
 * West and East decks. Each column is the number of cards in one deck (0 = not used):
 * The West / The East with 3-8 players, with 9 players (the West's 9-player deck is also the
 * deck for 10-11 players), and the West and East split decks of 12-14 and 15-18 player games.
 */
const WE_DECKS = ['west', 'east', 'west9', 'east9', 'west12', 'east12', 'west15', 'east15'] as const;
type WestEastDeck = (typeof WE_DECKS)[number];

// prettier-ignore
const WE_TABLE: [name: string, value: number, ...counts: number[]][] = [
  //               W  E  W9 E9 W12 E12 W15 E15
  ['Ochre',     1, 9, 0, 9, 0, 9, 0, 9, 0],
  ['Flax',      1, 0, 9, 0, 9, 0, 9, 0, 9],
  ['Clay',      1, 9, 0, 9, 0, 5, 4, 5, 4],
  ['Hides',     1, 0, 9, 0, 9, 4, 5, 4, 5],
  ['Bone',      1, 0, 0, 8, 8, 0, 0, 4, 4],
  ['Papyri',    2, 8, 0, 8, 0, 8, 0, 8, 0],
  ['Stone',     2, 0, 8, 0, 8, 0, 8, 0, 8],
  ['Iron',      2, 8, 0, 8, 0, 4, 4, 4, 4],
  ['Furs',      2, 0, 8, 0, 8, 4, 4, 4, 4],
  ['Wax',       2, 0, 0, 8, 8, 0, 0, 4, 4],
  ['Fish',      3, 8, 0, 8, 0, 8, 0, 8, 0],
  ['Timber',    3, 0, 8, 0, 8, 0, 8, 0, 8],
  ['Fruit',     3, 9, 0, 9, 0, 5, 4, 5, 4],
  ['Salt',      3, 0, 9, 0, 9, 4, 5, 4, 5],
  ['Ceramics',  3, 0, 0, 8, 8, 0, 0, 4, 4],
  ['Wool',      4, 7, 0, 7, 0, 7, 0, 7, 0],
  ['Cotton',    4, 0, 7, 0, 7, 0, 7, 0, 7],
  ['Oil',       4, 8, 0, 8, 0, 4, 4, 4, 4],
  ['Sugar',     4, 0, 8, 0, 8, 4, 4, 4, 4],
  ['Grain',     4, 0, 0, 8, 8, 0, 0, 4, 4],
  ['Wine',      5, 6, 0, 6, 0, 6, 0, 6, 0],
  ['Lacquer',   5, 0, 6, 0, 6, 0, 6, 0, 6],
  ['Textiles',  5, 7, 0, 7, 0, 4, 3, 4, 3],
  ['Livestock', 5, 0, 7, 0, 7, 3, 4, 3, 4],
  ['Glass',     5, 0, 0, 6, 6, 0, 0, 3, 3],
  ['Tin',       6, 5, 0, 5, 0, 5, 0, 5, 0],
  ['Silver',    6, 0, 5, 0, 5, 0, 5, 0, 5],
  ['Copper',    6, 6, 0, 6, 0, 3, 3, 3, 3],
  ['Bronze',    6, 0, 6, 0, 6, 3, 3, 3, 3],
  ['Lead',      6, 0, 0, 6, 6, 0, 0, 3, 3],
  ['Resin',     7, 5, 0, 5, 0, 5, 0, 5, 0],
  ['Jade',      7, 0, 5, 0, 5, 0, 5, 0, 5],
  ['Incense',   7, 6, 0, 6, 0, 3, 3, 3, 3],
  ['Spice',     7, 0, 6, 0, 6, 3, 3, 3, 3],
  ['Herbs',     7, 0, 0, 6, 6, 0, 0, 3, 3],
  ['Marble',    8, 4, 0, 4, 0, 4, 0, 4, 0],
  ['Dye',       8, 0, 4, 0, 4, 0, 4, 0, 4],
  ['Gemstones', 8, 5, 0, 5, 0, 3, 2, 3, 2],
  ['Tea',       8, 0, 5, 0, 5, 2, 3, 2, 3],
  ['Obsidian',  8, 0, 0, 4, 4, 0, 0, 2, 2],
  ['Ivory',     9, 4, 0, 4, 0, 4, 0, 4, 0],
  ['Silk',      9, 0, 4, 0, 4, 0, 4, 0, 4],
  ['Gold',      9, 5, 0, 5, 0, 3, 2, 3, 2],
  ['Pearls',    9, 0, 5, 0, 5, 2, 3, 2, 3],
  ['Amber',     9, 0, 0, 4, 4, 0, 0, 2, 2],
];

/** Cards per commodity in one deck, or in several decks combined. */
function westEastDeck(...decks: WestEastDeck[]): Commodity[] {
  const cols = decks.map((d) => WE_DECKS.indexOf(d));
  const count = (counts: number[]) => cols.reduce((n, col) => n + counts[col], 0);
  return WE_TABLE.map(([name, value, ...counts]) => c([name, value, count(counts)])).filter((x) => x.max > 0);
}

/**
 * Which West/East decks make up a game's cards. Player counts are the PLAYER_COUNTS values: 7 is 7-8,
 * 10 is 10-11, 13 is 13-14, 15 is 15-18, and 0 is an old "other" game (9-player deck).
 */
function westEastDecksFor(block: 'west' | 'east' | 'mega', playerCount: number): WestEastDeck[] {
  // 12+ players split the cards into a West and an East deck, but that only decides where a card
  // is drawn: every card is in play for both blocks, so a hand can hold either deck's cards.
  if (playerCount >= 15) return ['west15', 'east15'];
  if (playerCount >= 12) return ['west12', 'east12'];
  if (playerCount >= 10) return ['west9']; // 10-11 players use the West's 9-player deck
  if (playerCount === 9 || playerCount === 0 || block === 'mega') return [block === 'east' ? 'east9' : 'west9'];
  return [block];
}

/**
 * The Far East has its own cards: some share a name with a West/East commodity but not its
 * face value (Fish, Tea, Jade), so its ids carry an "fe-" prefix.
 */
const FAR_EAST: Commodity[] = (
  [
    ['Fish', 1, 9],
    ['Meat', 1, 10],
    ['Bamboo', 2, 8],
    ['Stone', 2, 8],
    ['Terracotta', 3, 9],
    ['Charcoal', 3, 8],
    ['Beans', 4, 7],
    ['Grain', 4, 8],
    ['Horses', 5, 7],
    ['Buffalo', 5, 6],
    ['Silver', 6, 5],
    ['Copper', 6, 6],
    ['Tea', 7, 5],
    ['Incense', 7, 6],
    ['Jade', 8, 5],
    ['Dye', 8, 4],
    ['Porcelain', 9, 5],
    ['Silk', 9, 4],
  ] as Row[]
).map((r) => c(r, `fe-${r[0].toLowerCase()}`));

/** The Far East's extra set per stack, used only with 9-11 players. */
const FAR_EAST_ADDITIONAL: Commodity[] = (
  [
    ['Fruit', 1, 10],
    ['Lumber', 2, 8],
    ['Paper', 3, 8],
    ['Oil', 4, 8],
    ['Swine', 5, 6],
    ['Mercury', 6, 6],
    ['Cinnamon', 7, 6],
    ['Marble', 8, 4],
    ['Ivory', 9, 4],
  ] as Row[]
).map((r) => c(r, `fe-${r[0].toLowerCase()}`));

const ALL = new Map<string, Commodity>(
  [...WE_TABLE.map(([name, value]) => c([name, value, 0])), ...FAR_EAST, ...FAR_EAST_ADDITIONAL].map((x) => [x.id, x]),
);

export function commodityById(id: string): Commodity | undefined {
  return ALL.get(id);
}

/** Commodities in this game's deck, by value. */
export function commoditiesFor(block: BlockId, playerCount: number): Commodity[] {
  if (block === 'fareast') {
    // The Far East adds its extra sets with 9-11 players; its table stops at 11.
    const extra = playerCount === 0 || playerCount >= 9;
    return extra ? [...FAR_EAST, ...FAR_EAST_ADDITIONAL].sort((a, b) => a.value - b.value) : FAR_EAST;
  }
  return westEastDeck(...westEastDecksFor(block, playerCount));
}

/** A set of identical commodities is worth face value × cards². */
export function setValue(value: number, count: number): number {
  return value * count * count;
}

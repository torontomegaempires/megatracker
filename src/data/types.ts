export const COLORS = ['blue', 'green', 'orange', 'red', 'yellow'] as const;
export type Color = (typeof COLORS)[number];
export type Credits = Record<Color, number>;

/** The five Civilization Advance groups, keyed by card color. */
export const COLOR_NAMES: Record<Color, string> = {
  blue: 'Arts',
  green: 'Sciences',
  orange: 'Crafts',
  red: 'Civics',
  yellow: 'Religion',
};

export type GoalId =
  | 'treasury'
  | 'trade'
  | 'advances'
  | 'bend'
  | 'tokens'
  | 'mobility'
  | 'cities'
  | 'sea'
  | 'aggression'
  | 'defense';

export interface TradeOffer {
  /** Usually a stack number; a few powers use text such as "0 (water) up to twice". */
  stack: number | string;
  tokens: number;
  extra?: string;
}

/**
 * Extra credits chosen by the player when an Advance is bought (or a special
 * ability is used):
 * - positive n: n credits in any mix of colors, in steps of 5
 * - negative n: |n| credits, all in one color
 * - '10for40': give up 10 credits in one color, gain 10 in each of the others
 * - '10for10': move 10 credits from one color to another
 */
export type ExtraCredit = number | '10for40' | '10for10';

export type SpecialActivation = 'gain10' | '10for10' | 'oneVPAdvance';

export interface AdvanceDef {
  name: string;
  price: number;
  /** One color, or two joined by "_" for dual-color cards (e.g. "blue_green"). */
  color: string;
  description?: string;
  shortDescription?: string;
  credits: Partial<Credits>;
  goals?: Partial<Record<GoalId, boolean>>;
  nextname?: string;
  bonus?: string;
  trade?: string | TradeOffer[];
  special?: string;
  extraCredit?: ExtraCredit;
  activate?: SpecialActivation;
  warningTFA?: boolean;
}

export type CalamityCategory = 'minor' | 'tradeable' | 'nontradeable';

export interface CalamityDef {
  name: string;
  category: CalamityCategory;
  stack: number;
  /** Description for 5+ players (or for every player count when there is no variant). */
  description: string;
  /** Far East only: a different text when playing with 3–4 players. */
  descriptionFewPlayers?: string;
  secondaryVictims: boolean;
  beneficiary: null | 'trader' | 'mostCitiesInStock';
}

export interface InteractionDef {
  advance: string;
  block: 'we' | 'fe';
  calamity: string;
  direction: 'advantage' | 'hindrance';
  effect: string;
}

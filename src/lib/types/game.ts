// ─── Enums & Primitive Types ─────────────────────────────────────────────────

export type GameVariant = 'Western' | 'Eastern' | 'Full';
export type GameStatus = 'lobby' | 'active' | 'ended';
export type ConnectionStatus = 'connected' | 'disconnected' | 'removed';
export type CardGroup = 'Arts' | 'Crafts' | 'Sciences' | 'Religion' | 'Civics';
export type CardDeck = 'Western' | 'Eastern';
export type CalamityType = 'tradeable' | 'non-tradeable';
export type VpTier = 1 | 3 | 6;

/** All commodity types in the game */
export type CommodityType =
	| 'Ochre'
	| 'Hides'
	| 'Iron'
	| 'Papyrus'
	| 'Salt'
	| 'Timber'
	| 'Grain'
	| 'Oil'
	| 'Cloth'
	| 'Wine'
	| 'Bronze'
	| 'Silver'
	| 'Spices'
	| 'Resin'
	| 'Dye'
	| 'Gold'
	| 'Ivory'
	| 'Gems';

/** All commodity types as a readonly array for iteration */
export const COMMODITY_TYPES: readonly CommodityType[] = [
	'Ochre',
	'Hides',
	'Iron',
	'Papyrus',
	'Salt',
	'Timber',
	'Grain',
	'Oil',
	'Cloth',
	'Wine',
	'Bronze',
	'Silver',
	'Spices',
	'Resin',
	'Dye',
	'Gold',
	'Ivory',
	'Gems'
] as const;

// ─── Game Session ─────────────────────────────────────────────────────────────

export interface GameSession {
	sessionId: string;
	sessionName: string;
	variant: GameVariant;
	status: GameStatus;
	hostPeerId: string;
	hostPlayerId: string;
	players: Player[];
	/** Phase number 1–12 */
	currentPhase: number;
	currentTurn: number;
	actionLog: ActionEntry[];
	createdAt: number;
	endedAt?: number;
}

// ─── Player ───────────────────────────────────────────────────────────────────

export interface Player {
	playerId: string;
	playerName: string;
	civilisationId: string;
	civilisationName: string;
	/** 1–18, fixed, lower = higher priority (tiebreaker) */
	astRanking: number;
	colorHex: string;
	isHost: boolean;
	peerJsId: string;

	// ── Token pool — INVARIANT: populationOnBoard + populationInStock + inTreasury === 55
	populationOnBoard: number;
	populationInStock: number;
	inTreasury: number;

	// ── Cities and ships (NOT part of the 55-token pool)
	citiesOnBoard: number; // max 9
	citiesInStock: number;
	shipsOnBoard: number; // max 4
	shipsInStock: number;

	/** Quantity per commodity (0–9 each) */
	commodityHand: Record<CommodityType, number>;
	ownedCardIds: string[];
	astPosition: number;
	victoryPoints: number;
	connectionStatus: ConnectionStatus;
}

// ─── Civilisation Card ────────────────────────────────────────────────────────

export interface CardCredit {
	targetCardId: string;
	creditAmount: number;
}

export interface CalamityModifier {
	calamityId: string;
	description: string;
}

export interface CivilisationCard {
	cardId: string;
	name: string;
	deck: CardDeck;
	group: CardGroup;
	baseCost: number;
	/** 1 if cost<100; 3 if 100–199; 6 if ≥200 */
	vpTier: VpTier;
	description: string;
	specialAbilityDescription: string;
	/** Credits this card gives toward other cards */
	credits: CardCredit[];
	calamityModifiers: CalamityModifier[];
}

// ─── Calamity ─────────────────────────────────────────────────────────────────

export interface Calamity {
	calamityId: string;
	name: string;
	type: CalamityType;
	severity: number;
	description: string;
	resolutionSteps: string;
	affectedStats: string[];
	mitigatingCardIds: string[];
}

// ─── Action Log ───────────────────────────────────────────────────────────────

export interface ActionEntry {
	entryId: string;
	timestamp: number;
	phase: number;
	/** playerId or 'host' */
	initiatedBy: string;
	actionType: string;
	description: string;
	previousValue: unknown;
	newValue: unknown;
	affectedPlayerId: string;
}

// ─── Token Transfer ───────────────────────────────────────────────────────────

/** The three buckets that make up the 55-token pool */
export type TokenBucket = 'populationOnBoard' | 'populationInStock' | 'inTreasury';

/** A validated bucket-to-bucket transfer */
export interface TokenTransfer {
	from: TokenBucket;
	to: TokenBucket;
	amount: number;
}

// ─── Phase Definitions ────────────────────────────────────────────────────────

export interface PhaseDefinition {
	phase: number;
	name: string;
	description: string;
}

export const PHASES: readonly PhaseDefinition[] = [
	{ phase: 1, name: 'Tax Collection', description: 'Collect 2 treasury per city.' },
	{ phase: 2, name: 'Population Expansion', description: 'Move tokens from stock to board.' },
	{ phase: 3, name: 'Ship Construction', description: 'Build and maintain ships.' },
	{ phase: 4, name: 'Conflict', description: 'Resolve battles and losses.' },
	{ phase: 5, name: 'City Construction', description: 'Build cities on board.' },
	{
		phase: 6,
		name: 'Trade Card Acquisition',
		description: 'Acquire trade cards; extra cost 15 each.'
	},
	{ phase: 7, name: 'Trade', description: 'Trade commodity cards with other players.' },
	{ phase: 8, name: 'Calamity Selection', description: 'Draw and assign calamity cards.' },
	{ phase: 9, name: 'Calamity Resolution', description: 'Resolve calamity effects.' },
	{
		phase: 10,
		name: 'AST Advancement Eligibility',
		description: 'Check eligibility for AST advancement.'
	},
	{ phase: 11, name: 'AST Advancement', description: 'Advance on the AST track.' },
	{ phase: 12, name: 'Civilisation Advances', description: 'Purchase civilisation cards.' }
] as const;

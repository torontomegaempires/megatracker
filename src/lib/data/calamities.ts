import type { Calamity } from '../types/game.js';

export const CALAMITIES: readonly Calamity[] = [
	// ─── Non-tradeable calamities ─────────────────────────────────────────────

	{
		calamityId: 'epidemic',
		name: 'Epidemic',
		type: 'non-tradeable',
		severity: 2,
		description: 'A devastating plague sweeps through your population.',
		resolutionSteps:
			'Reduce population on board by half (round down). Tokens move to inStock. Cities are unaffected.',
		affectedStats: ['populationOnBoard'],
		mitigatingCardIds: ['medicine']
	},
	{
		calamityId: 'civil-war',
		name: 'Civil War',
		type: 'non-tradeable',
		severity: 2,
		description: 'Internal conflict tears your civilization apart.',
		resolutionSteps:
			'The player with the most tokens on the board may take up to half of your treasury tokens (round down). If tied, the player with the lowest AST ranking takes. Those tokens move to treasury of the winning player.',
		affectedStats: ['inTreasury'],
		mitigatingCardIds: ['democracy', 'law']
	},
	{
		calamityId: 'famine',
		name: 'Famine',
		type: 'non-tradeable',
		severity: 2,
		description: 'Crop failures lead to widespread starvation.',
		resolutionSteps:
			'Reduce populationOnBoard by 2 per city you own. Tokens move to inStock. If insufficient tokens on board, reduce cities instead (1 city lost per 5 remaining shortfall).',
		affectedStats: ['populationOnBoard', 'citiesOnBoard'],
		mitigatingCardIds: ['agriculture', 'granary']
	},
	{
		calamityId: 'flood',
		name: 'Flood',
		type: 'non-tradeable',
		severity: 2,
		description: 'Devastating floods destroy your settlements.',
		resolutionSteps:
			'Lose up to 5 population tokens from the board (owner\'s choice of areas). Move those tokens to inStock. Then lose 2 treasury tokens to inStock.',
		affectedStats: ['populationOnBoard', 'inTreasury'],
		mitigatingCardIds: ['engineer']
	},
	{
		calamityId: 'earthquake',
		name: 'Earthquake',
		type: 'non-tradeable',
		severity: 2,
		description: 'A catastrophic earthquake destroys cities and infrastructure.',
		resolutionSteps:
			'Lose 2 cities (citiesOnBoard → citiesInStock). Lose all population tokens in those city areas (onBoard → inStock). Lose 2 treasury tokens to inStock.',
		affectedStats: ['citiesOnBoard', 'populationOnBoard', 'inTreasury'],
		mitigatingCardIds: ['engineer']
	},
	{
		calamityId: 'volcanic-eruption',
		name: 'Volcanic Eruption',
		type: 'non-tradeable',
		severity: 2,
		description: 'A volcanic eruption obliterates one of your cities.',
		resolutionSteps:
			'Lose 1 city (citiesOnBoard → citiesInStock) plus all population in that area (onBoard → inStock). Lose 5 treasury tokens to inStock.',
		affectedStats: ['citiesOnBoard', 'populationOnBoard', 'inTreasury'],
		mitigatingCardIds: []
	},
	{
		calamityId: 'barbarian-hordes',
		name: 'Barbarian Hordes',
		type: 'non-tradeable',
		severity: 2,
		description: 'Barbarian tribes overrun your lands.',
		resolutionSteps:
			'Lose population tokens equal to the number of areas you occupy (onBoard → inStock). If a city is in a contested area, it is also lost (citiesOnBoard → citiesInStock).',
		affectedStats: ['populationOnBoard', 'citiesOnBoard'],
		mitigatingCardIds: ['military']
	},
	{
		calamityId: 'drought',
		name: 'Drought',
		type: 'non-tradeable',
		severity: 2,
		description: 'A prolonged drought devastates agriculture.',
		resolutionSteps:
			'Lose 3 population tokens from board (onBoard → inStock). Lose 3 treasury tokens to inStock. You may not build cities this turn.',
		affectedStats: ['populationOnBoard', 'inTreasury'],
		mitigatingCardIds: ['agriculture', 'irrigation']
	},

	// ─── Tradeable calamities ─────────────────────────────────────────────────

	{
		calamityId: 'squandered-wealth',
		name: 'Squandered Wealth',
		type: 'tradeable',
		severity: 1,
		description: 'Your treasury is depleted through mismanagement.',
		resolutionSteps:
			'Lose half your treasury tokens (round down, inTreasury → inStock). If you have fewer than 2 treasury tokens, lose all of them.',
		affectedStats: ['inTreasury'],
		mitigatingCardIds: ['banking', 'coinage']
	},
	{
		calamityId: 'superstition',
		name: 'Superstition',
		type: 'tradeable',
		severity: 1,
		description: 'Religious fear grips your people.',
		resolutionSteps:
			'Lose 1 city (citiesOnBoard → citiesInStock). Lose 5 treasury tokens to inStock. You may not purchase Civilization Advances this turn.',
		affectedStats: ['citiesOnBoard', 'inTreasury'],
		mitigatingCardIds: ['philosophy', 'theology']
	},
	{
		calamityId: 'slave-revolt',
		name: 'Slave Revolt',
		type: 'tradeable',
		severity: 1,
		description: 'Enslaved populations rise up against your rule.',
		resolutionSteps:
			'Lose 5 population tokens from board (onBoard → inStock). Lose 2 treasury tokens to inStock.',
		affectedStats: ['populationOnBoard', 'inTreasury'],
		mitigatingCardIds: ['law', 'democracy']
	},
	{
		calamityId: 'city-revolt',
		name: 'City Revolt',
		type: 'tradeable',
		severity: 1,
		description: 'Citizens rebel and seize control of a city.',
		resolutionSteps:
			'Lose 1 city (citiesOnBoard → citiesInStock). That city\'s population tokens remain on board but are now contested.',
		affectedStats: ['citiesOnBoard'],
		mitigatingCardIds: ['democracy', 'law']
	},
	{
		calamityId: 'piracy',
		name: 'Piracy',
		type: 'tradeable',
		severity: 1,
		description: 'Pirates raid your coastal settlements and trade routes.',
		resolutionSteps:
			'Lose 3 treasury tokens to inStock. Lose 1 ship (shipsOnBoard → shipsInStock). If you have no ships, lose 3 additional treasury tokens instead.',
		affectedStats: ['inTreasury', 'shipsOnBoard'],
		mitigatingCardIds: ['naval-power']
	},
	{
		calamityId: 'tempest',
		name: 'Tempest',
		type: 'tradeable',
		severity: 1,
		description: 'A violent storm destroys your fleet and coastal areas.',
		resolutionSteps:
			'Lose all ships (shipsOnBoard → shipsInStock). Lose 2 population tokens from coastal areas (onBoard → inStock).',
		affectedStats: ['shipsOnBoard', 'populationOnBoard'],
		mitigatingCardIds: ['engineer']
	},
	{
		calamityId: 'tribal-conflict',
		name: 'Tribal Conflict',
		type: 'tradeable',
		severity: 1,
		description: 'Internal tribal conflicts weaken your civilization.',
		resolutionSteps:
			'Lose 4 population tokens from board (onBoard → inStock). Lose 2 treasury tokens to inStock.',
		affectedStats: ['populationOnBoard', 'inTreasury'],
		mitigatingCardIds: ['military', 'law']
	},
	{
		calamityId: 'regression',
		name: 'Regression',
		type: 'tradeable',
		severity: 2,
		description: 'Your civilization loses a step on the AST track.',
		resolutionSteps:
			'Reduce astPosition by 1 (minimum 0). Lose any Civilization Advance cards purchased this turn.',
		affectedStats: ['astPosition'],
		mitigatingCardIds: ['philosophy', 'education']
	}
] as const;

export const CALAMITY_MAP: Map<string, Calamity> = new Map(
	CALAMITIES.map((c) => [c.calamityId, c])
);

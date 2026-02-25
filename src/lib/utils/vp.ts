import type { Player, CivilisationCard } from '../types/game.js';

// ─── Credit System ────────────────────────────────────────────────────────────

/**
 * Calculate the net cost of a card after applying credits from owned cards.
 * Net cost = baseCost − sum(creditAmount for each owned card that credits this card).
 * Minimum net cost is 0.
 */
export function calcNetCardCost(card: CivilisationCard, ownedCards: CivilisationCard[]): number {
	let discount = 0;
	for (const owned of ownedCards) {
		for (const credit of owned.credits) {
			if (credit.targetCardId === card.cardId) {
				discount += credit.creditAmount;
			}
		}
	}
	return Math.max(0, card.baseCost - discount);
}

// ─── VP Tier Calculation ──────────────────────────────────────────────────────

/**
 * Returns the VP tier for a card based on its base cost.
 * 1 if cost < 100; 3 if 100–199; 6 if ≥ 200.
 */
export function cardVpTier(baseCost: number): 1 | 3 | 6 {
	if (baseCost >= 200) return 6;
	if (baseCost >= 100) return 3;
	return 1;
}

// ─── Victory Point Calculation ────────────────────────────────────────────────

export interface VpBreakdown {
	cities: number;
	cardVp1: number; // count of cards with baseCost < 100
	cardVp3: number; // count of cards with baseCost 100–199
	cardVp6: number; // count of cards with baseCost ≥ 200
	astVp: number;
	lateIronAgeBonus: number;
	total: number;
}

/**
 * Calculate victory points for a player.
 *
 * VP = citiesOnBoard
 *    + (1 VP × cards with baseCost < 100)
 *    + (3 VP × cards with baseCost 100–199)
 *    + (6 VP × cards with baseCost ≥ 200)
 *    + (5 VP × AST steps advanced)
 *    + 5 bonus VP if exactly one player enters Late Iron Age era
 *
 * Treasury and commodity sets do NOT contribute to VP.
 */
export function calcVictoryPoints(
	player: Pick<Player, 'citiesOnBoard' | 'ownedCardIds' | 'astPosition'>,
	cardLookup: Map<string, CivilisationCard>,
	hasLateIronAgeBonus: boolean
): VpBreakdown {
	const cities = player.citiesOnBoard;

	let cardVp1 = 0;
	let cardVp3 = 0;
	let cardVp6 = 0;

	for (const cardId of player.ownedCardIds) {
		const card = cardLookup.get(cardId);
		if (!card) continue;
		const tier = cardVpTier(card.baseCost);
		if (tier === 1) cardVp1++;
		else if (tier === 3) cardVp3++;
		else cardVp6++;
	}

	const astVp = Math.max(0, (player.astPosition - 1) * 5);
	const lateIronAgeBonus = hasLateIronAgeBonus ? 5 : 0;

	const total =
		cities + cardVp1 * 1 + cardVp3 * 3 + cardVp6 * 6 + astVp + lateIronAgeBonus;

	return { cities, cardVp1, cardVp3, cardVp6, astVp, lateIronAgeBonus, total };
}

/**
 * Determine which player (if any) gets the Late Iron Age bonus (exactly one).
 * Returns the playerId of the sole player in Late Iron Age, or null.
 */
export function getLateIronAgeBonusPlayerId(players: Pick<Player, 'playerId' | 'astPosition'>[]): string | null {
	// Late Iron Age is tracked externally (requires AST knowledge).
	// This stub returns null — will be implemented with AST data in Phase 3.
	void players;
	return null;
}

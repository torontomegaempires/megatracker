import { describe, it, expect } from 'vitest';
import { calcNetCardCost, cardVpTier, calcVictoryPoints } from './vp.js';
import type { CivilisationCard } from '../types/game.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCard(overrides: Partial<CivilisationCard> = {}): CivilisationCard {
	return {
		cardId: 'test-card',
		name: 'Test Card',
		deck: 'Western',
		group: 'Arts',
		baseCost: 50,
		vpTier: 1,
		description: '',
		specialAbilityDescription: '',
		credits: [],
		calamityModifiers: [],
		...overrides
	};
}

function cardLookupFrom(cards: CivilisationCard[]): Map<string, CivilisationCard> {
	return new Map(cards.map((c) => [c.cardId, c]));
}

// ─── cardVpTier ───────────────────────────────────────────────────────────────

describe('cardVpTier', () => {
	it('returns 1 for cards under 100', () => {
		expect(cardVpTier(0)).toBe(1);
		expect(cardVpTier(50)).toBe(1);
		expect(cardVpTier(99)).toBe(1);
	});

	it('returns 3 for cards 100–199', () => {
		expect(cardVpTier(100)).toBe(3);
		expect(cardVpTier(150)).toBe(3);
		expect(cardVpTier(199)).toBe(3);
	});

	it('returns 6 for cards ≥200', () => {
		expect(cardVpTier(200)).toBe(6);
		expect(cardVpTier(300)).toBe(6);
		expect(cardVpTier(1000)).toBe(6);
	});
});

// ─── calcNetCardCost ──────────────────────────────────────────────────────────

describe('calcNetCardCost', () => {
	it('returns baseCost when no owned cards', () => {
		const card = makeCard({ baseCost: 100 });
		expect(calcNetCardCost(card, [])).toBe(100);
	});

	it('applies credit from owned card', () => {
		const target = makeCard({ cardId: 'target', baseCost: 120 });
		const owned = makeCard({
			cardId: 'owned',
			baseCost: 60,
			credits: [{ targetCardId: 'target', creditAmount: 20 }]
		});
		expect(calcNetCardCost(target, [owned])).toBe(100);
	});

	it('applies credits from multiple owned cards', () => {
		const target = makeCard({ cardId: 'target', baseCost: 150 });
		const owned1 = makeCard({
			cardId: 'o1',
			baseCost: 60,
			credits: [{ targetCardId: 'target', creditAmount: 20 }]
		});
		const owned2 = makeCard({
			cardId: 'o2',
			baseCost: 80,
			credits: [{ targetCardId: 'target', creditAmount: 30 }]
		});
		expect(calcNetCardCost(target, [owned1, owned2])).toBe(100);
	});

	it('does not apply credits for non-matching card IDs', () => {
		const target = makeCard({ cardId: 'target', baseCost: 100 });
		const owned = makeCard({
			cardId: 'owned',
			baseCost: 60,
			credits: [{ targetCardId: 'other-card', creditAmount: 50 }]
		});
		expect(calcNetCardCost(target, [owned])).toBe(100);
	});

	it('clamps net cost at 0 — cannot be negative', () => {
		const target = makeCard({ cardId: 'target', baseCost: 50 });
		const owned = makeCard({
			cardId: 'owned',
			baseCost: 60,
			credits: [{ targetCardId: 'target', creditAmount: 100 }]
		});
		expect(calcNetCardCost(target, [owned])).toBe(0);
	});

	it('handles a card with multiple credits to different targets', () => {
		const target1 = makeCard({ cardId: 't1', baseCost: 80 });
		const target2 = makeCard({ cardId: 't2', baseCost: 120 });
		const owned = makeCard({
			cardId: 'owned',
			credits: [
				{ targetCardId: 't1', creditAmount: 10 },
				{ targetCardId: 't2', creditAmount: 20 }
			]
		});
		expect(calcNetCardCost(target1, [owned])).toBe(70);
		expect(calcNetCardCost(target2, [owned])).toBe(100);
	});
});

// ─── calcVictoryPoints ────────────────────────────────────────────────────────

describe('calcVictoryPoints', () => {
	it('counts VP from cities only', () => {
		const player = { citiesOnBoard: 4, ownedCardIds: [], astPosition: 1 };
		const result = calcVictoryPoints(player, new Map(), false);
		expect(result.cities).toBe(4);
		expect(result.total).toBe(4);
	});

	it('scores tier-1 cards correctly', () => {
		const card = makeCard({ cardId: 'c1', baseCost: 50 });
		const player = { citiesOnBoard: 0, ownedCardIds: ['c1'], astPosition: 1 };
		const result = calcVictoryPoints(player, cardLookupFrom([card]), false);
		expect(result.cardVp1).toBe(1);
		expect(result.total).toBe(1);
	});

	it('scores tier-3 cards correctly', () => {
		const card = makeCard({ cardId: 'c1', baseCost: 150 });
		const player = { citiesOnBoard: 0, ownedCardIds: ['c1'], astPosition: 1 };
		const result = calcVictoryPoints(player, cardLookupFrom([card]), false);
		expect(result.cardVp3).toBe(1);
		expect(result.total).toBe(3);
	});

	it('scores tier-6 cards correctly', () => {
		const card = makeCard({ cardId: 'c1', baseCost: 200 });
		const player = { citiesOnBoard: 0, ownedCardIds: ['c1'], astPosition: 1 };
		const result = calcVictoryPoints(player, cardLookupFrom([card]), false);
		expect(result.cardVp6).toBe(1);
		expect(result.total).toBe(6);
	});

	it('scores multiple cards across tiers', () => {
		const cards = [
			makeCard({ cardId: 'c1', baseCost: 50 }),   // tier 1 → 1 VP
			makeCard({ cardId: 'c2', baseCost: 50 }),   // tier 1 → 1 VP
			makeCard({ cardId: 'c3', baseCost: 120 }),  // tier 3 → 3 VP
			makeCard({ cardId: 'c4', baseCost: 250 })   // tier 6 → 6 VP
		];
		const player = { citiesOnBoard: 0, ownedCardIds: ['c1', 'c2', 'c3', 'c4'], astPosition: 1 };
		const result = calcVictoryPoints(player, cardLookupFrom(cards), false);
		expect(result.cardVp1).toBe(2);
		expect(result.cardVp3).toBe(1);
		expect(result.cardVp6).toBe(1);
		expect(result.total).toBe(11);
	});

	it('scores AST advances at 5 VP per step above starting position', () => {
		// astPosition 1 = start = 0 AST VP; position 3 = 2 steps advanced = 10 VP
		const player = { citiesOnBoard: 0, ownedCardIds: [], astPosition: 3 };
		const result = calcVictoryPoints(player, new Map(), false);
		expect(result.astVp).toBe(10);
		expect(result.total).toBe(10);
	});

	it('awards 0 AST VP at starting position (1)', () => {
		const player = { citiesOnBoard: 0, ownedCardIds: [], astPosition: 1 };
		const result = calcVictoryPoints(player, new Map(), false);
		expect(result.astVp).toBe(0);
		expect(result.total).toBe(0);
	});

	it('adds 5 VP Late Iron Age bonus when eligible', () => {
		const player = { citiesOnBoard: 0, ownedCardIds: [], astPosition: 1 };
		const result = calcVictoryPoints(player, new Map(), true);
		expect(result.lateIronAgeBonus).toBe(5);
		expect(result.total).toBe(5);
	});

	it('does not add Late Iron Age bonus when not eligible', () => {
		const player = { citiesOnBoard: 0, ownedCardIds: [], astPosition: 1 };
		const result = calcVictoryPoints(player, new Map(), false);
		expect(result.lateIronAgeBonus).toBe(0);
	});

	it('calculates full combined VP correctly', () => {
		const cards = [
			makeCard({ cardId: 'c1', baseCost: 50 }),  // 1 VP
			makeCard({ cardId: 'c2', baseCost: 200 })  // 6 VP
		];
		const player = { citiesOnBoard: 3, ownedCardIds: ['c1', 'c2'], astPosition: 2 };
		const result = calcVictoryPoints(player, cardLookupFrom(cards), true);
		// 3 (cities) + 1 (tier-1) + 6 (tier-6) + 5 (AST pos 2 = 1 step) + 5 (late iron) = 20
		expect(result.total).toBe(20);
	});

	it('ignores unknown card IDs silently', () => {
		const player = { citiesOnBoard: 0, ownedCardIds: ['unknown-id'], astPosition: 1 };
		const result = calcVictoryPoints(player, new Map(), false);
		expect(result.total).toBe(0);
	});

	it('returns zero total for a player with nothing', () => {
		const player = { citiesOnBoard: 0, ownedCardIds: [], astPosition: 1 };
		const result = calcVictoryPoints(player, new Map(), false);
		expect(result.total).toBe(0);
	});
});

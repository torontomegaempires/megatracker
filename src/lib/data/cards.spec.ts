import { describe, it, expect } from 'vitest';
import { CARDS, CARD_MAP } from './cards.js';
import { CALAMITY_MAP } from './calamities.js';
import { cardVpTier } from '../utils/vp.js';

describe('cards data integrity', () => {
	it('CARD_MAP has the same count as CARDS array', () => {
		expect(CARD_MAP.size).toBe(CARDS.length);
	});

	it('all card IDs are unique', () => {
		const ids = CARDS.map((c) => c.cardId);
		const unique = new Set(ids);
		expect(unique.size).toBe(ids.length);
	});

	it('all cardId values are kebab-case non-empty strings', () => {
		for (const card of CARDS) {
			expect(card.cardId).toMatch(/^[a-z][a-z0-9-]*$/);
		}
	});

	it('all baseCost values are positive integers', () => {
		for (const card of CARDS) {
			expect(card.baseCost).toBeGreaterThan(0);
			expect(Number.isInteger(card.baseCost)).toBe(true);
		}
	});

	it('vpTier matches baseCost via cardVpTier()', () => {
		for (const card of CARDS) {
			const expected = cardVpTier(card.baseCost);
			expect(card.vpTier).toBe(expected);
		}
	});

	it('all credit targetCardIds reference existing cards', () => {
		for (const card of CARDS) {
			for (const credit of card.credits) {
				const target = CARD_MAP.get(credit.targetCardId);
				expect(
					target,
					`Card "${card.cardId}" credits unknown target "${credit.targetCardId}"`
				).toBeDefined();
			}
		}
	});

	it('no card credits itself', () => {
		for (const card of CARDS) {
			for (const credit of card.credits) {
				expect(
					credit.targetCardId,
					`Card "${card.cardId}" credits itself`
				).not.toBe(card.cardId);
			}
		}
	});

	it('all credit amounts are positive', () => {
		for (const card of CARDS) {
			for (const credit of card.credits) {
				expect(credit.creditAmount).toBeGreaterThan(0);
			}
		}
	});

	it('all calamityModifier calamityIds reference existing calamities', () => {
		for (const card of CARDS) {
			for (const mod of card.calamityModifiers) {
				const calamity = CALAMITY_MAP.get(mod.calamityId);
				expect(
					calamity,
					`Card "${card.cardId}" references unknown calamity "${mod.calamityId}"`
				).toBeDefined();
			}
		}
	});

	it('deck is Western or Eastern', () => {
		for (const card of CARDS) {
			expect(['Western', 'Eastern']).toContain(card.deck);
		}
	});

	it('group is one of the five valid groups', () => {
		const validGroups = ['Arts', 'Crafts', 'Sciences', 'Religion', 'Civics'];
		for (const card of CARDS) {
			expect(validGroups).toContain(card.group);
		}
	});

	it('required card IDs from calamities.ts all exist in CARD_MAP', () => {
		// These IDs are referenced in calamities.ts mitigatingCardIds and must exist
		const required = [
			'medicine',
			'democracy',
			'law',
			'agriculture',
			'granary',
			'engineer',
			'military',
			'irrigation',
			'banking',
			'coinage',
			'philosophy',
			'theology',
			'naval-power',
			'education'
		];
		for (const id of required) {
			expect(CARD_MAP.get(id), `Required card "${id}" is missing from CARD_MAP`).toBeDefined();
		}
	});

	it('CARD_MAP lookup returns correct card', () => {
		for (const card of CARDS) {
			expect(CARD_MAP.get(card.cardId)).toBe(card);
		}
	});

	it('Western deck contains expected key cards', () => {
		const westernIds = CARDS.filter((c) => c.deck === 'Western').map((c) => c.cardId);
		const expected = ['pottery', 'democracy', 'monotheism', 'trade-empire', 'calendar', 'drama-poetry'];
		for (const id of expected) {
			expect(westernIds).toContain(id);
		}
	});

	it('Eastern deck contains expected key cards', () => {
		const easternIds = CARDS.filter((c) => c.deck === 'Eastern').map((c) => c.cardId);
		const expected = ['granary', 'banking', 'education', 'buddhism', 'silk'];
		for (const id of expected) {
			expect(easternIds).toContain(id);
		}
	});

	it('soft warning: cross-deck credit references are logged', () => {
		// This test does not fail — it only collects cross-deck credits for review
		const crossDeckCredits: string[] = [];
		for (const card of CARDS) {
			for (const credit of card.credits) {
				const target = CARD_MAP.get(credit.targetCardId);
				if (target && target.deck !== card.deck) {
					crossDeckCredits.push(`${card.deck}/${card.cardId} → ${target.deck}/${credit.targetCardId}`);
				}
			}
		}
		if (crossDeckCredits.length > 0) {
			console.info('[cards] Cross-deck credits (verify against physical cards):');
			crossDeckCredits.forEach((s) => console.info(' ', s));
		}
		// Always passes — just informational
		expect(true).toBe(true);
	});
});

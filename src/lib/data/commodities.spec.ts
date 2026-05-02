import { describe, it, expect } from 'vitest';
import { COMMODITIES, COMMODITY_MAP, calcCommoditySetValue, calcHandValue } from './commodities.js';
import type { CommodityType } from '../types/game.js';
import { COMMODITY_TYPES } from '../types/game.js';

describe('COMMODITIES data', () => {
	it('has 18 commodities', () => {
		expect(COMMODITIES).toHaveLength(18);
	});

	it('COMMODITY_MAP has same count as COMMODITIES', () => {
		expect(COMMODITY_MAP.size).toBe(COMMODITIES.length);
	});

	it('all COMMODITY_TYPES have a definition', () => {
		for (const type of COMMODITY_TYPES) {
			expect(COMMODITY_MAP.has(type)).toBe(true);
		}
	});

	it('face values range from 1 to 9', () => {
		for (const c of COMMODITIES) {
			expect(c.faceValue).toBeGreaterThanOrEqual(1);
			expect(c.faceValue).toBeLessThanOrEqual(9);
		}
	});

	it('commodities come in pairs of matching face values', () => {
		const valueCounts = new Map<number, number>();
		for (const c of COMMODITIES) {
			valueCounts.set(c.faceValue, (valueCounts.get(c.faceValue) ?? 0) + 1);
		}
		// Each face value 1–9 should appear exactly twice
		for (let v = 1; v <= 9; v++) {
			expect(valueCounts.get(v)).toBe(2);
		}
	});
});

describe('calcCommoditySetValue', () => {
	it('returns f * n^2 for a set', () => {
		expect(calcCommoditySetValue(3, 4)).toBe(48); // 3 * 16
	});

	it('returns 0 for count of 0', () => {
		expect(calcCommoditySetValue(5, 0)).toBe(0);
	});

	it('returns face value for count of 1', () => {
		expect(calcCommoditySetValue(7, 1)).toBe(7);
	});

	it('calculates correctly for max set (n=9, f=9)', () => {
		expect(calcCommoditySetValue(9, 9)).toBe(729); // 9 * 81
	});

	it('Gems x3 = 9 * 9 = 81', () => {
		expect(calcCommoditySetValue(9, 3)).toBe(81);
	});

	it('Ochre x2 = 1 * 4 = 4', () => {
		expect(calcCommoditySetValue(1, 2)).toBe(4);
	});
});

describe('calcHandValue', () => {
	function emptyHand(): Record<CommodityType, number> {
		return Object.fromEntries(COMMODITY_TYPES.map((t) => [t, 0])) as Record<CommodityType, number>;
	}

	it('returns 0 for empty hand', () => {
		expect(calcHandValue(emptyHand())).toBe(0);
	});

	it('calculates single commodity type correctly', () => {
		const hand = emptyHand();
		hand.Gold = 3; // face 8, set = 8 * 9 = 72
		expect(calcHandValue(hand)).toBe(72);
	});

	it('sums multiple commodity types', () => {
		const hand = emptyHand();
		hand.Ochre = 2; // 1 * 4 = 4
		hand.Iron = 3; // 2 * 9 = 18
		expect(calcHandValue(hand)).toBe(22);
	});

	it('ignores commodities with 0 count', () => {
		const hand = emptyHand();
		hand.Gems = 1; // 9 * 1 = 9
		expect(calcHandValue(hand)).toBe(9);
	});

	it('handles a full hand', () => {
		const hand = emptyHand();
		hand.Ochre = 1; // 1*1 = 1
		hand.Gold = 2; // 8*4 = 32
		hand.Gems = 3; // 9*9 = 81
		expect(calcHandValue(hand)).toBe(114);
	});
});

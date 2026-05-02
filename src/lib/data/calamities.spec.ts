import { describe, it, expect } from 'vitest';
import { CALAMITIES, CALAMITY_MAP } from './calamities.js';
import { CARDS } from './cards.js';

const cardIds = new Set(CARDS.map((c) => c.cardId));

describe('CALAMITIES data', () => {
	it('has 16 calamities', () => {
		expect(CALAMITIES).toHaveLength(16);
	});

	it('CALAMITY_MAP matches CALAMITIES count', () => {
		expect(CALAMITY_MAP.size).toBe(CALAMITIES.length);
	});

	it('all calamityIds are unique', () => {
		const ids = CALAMITIES.map((c) => c.calamityId);
		expect(new Set(ids).size).toBe(CALAMITIES.length);
	});

	it('all calamityIds are kebab-case', () => {
		for (const c of CALAMITIES) {
			expect(c.calamityId).toMatch(/^[a-z][a-z0-9-]*$/);
		}
	});

	it('type is either tradeable or non-tradeable', () => {
		for (const c of CALAMITIES) {
			expect(['tradeable', 'non-tradeable']).toContain(c.type);
		}
	});

	it('has both tradeable and non-tradeable calamities', () => {
		const types = new Set(CALAMITIES.map((c) => c.type));
		expect(types.has('tradeable')).toBe(true);
		expect(types.has('non-tradeable')).toBe(true);
	});

	it('non-tradeable (major) calamities have severity 2', () => {
		for (const c of CALAMITIES) {
			if (c.type === 'non-tradeable') {
				expect(c.severity).toBe(2);
			}
		}
	});

	it('all mitigatingCardIds reference existing cards', () => {
		for (const c of CALAMITIES) {
			for (const cardId of c.mitigatingCardIds) {
				expect(cardIds.has(cardId)).toBe(true);
			}
		}
	});

	it('all calamities have non-empty description and resolutionSteps', () => {
		for (const c of CALAMITIES) {
			expect(c.description.length).toBeGreaterThan(0);
			expect(c.resolutionSteps.length).toBeGreaterThan(0);
		}
	});

	it('all calamities have at least one affectedStat', () => {
		for (const c of CALAMITIES) {
			expect(c.affectedStats.length).toBeGreaterThan(0);
		}
	});

	it('affectedStats reference valid player fields', () => {
		const validStats = new Set([
			'populationOnBoard',
			'populationInStock',
			'inTreasury',
			'citiesOnBoard',
			'shipsOnBoard',
			'astPosition'
		]);
		for (const c of CALAMITIES) {
			for (const stat of c.affectedStats) {
				expect(validStats.has(stat)).toBe(true);
			}
		}
	});

	it('key calamities exist', () => {
		const ids = new Set(CALAMITIES.map((c) => c.calamityId));
		expect(ids.has('epidemic')).toBe(true);
		expect(ids.has('civil-war')).toBe(true);
		expect(ids.has('famine')).toBe(true);
		expect(ids.has('flood')).toBe(true);
		expect(ids.has('piracy')).toBe(true);
	});
});

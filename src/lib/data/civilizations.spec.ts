import { describe, it, expect } from 'vitest';
import { CIVILIZATIONS, CIVILIZATION_MAP, getCivilization } from './civilizations.js';

describe('CIVILIZATIONS data', () => {
	it('has 18 civilizations', () => {
		expect(CIVILIZATIONS).toHaveLength(18);
	});

	it('CIVILIZATION_MAP matches CIVILIZATIONS count', () => {
		expect(CIVILIZATION_MAP.size).toBe(18);
	});

	it('all IDs are unique', () => {
		const ids = CIVILIZATIONS.map((c) => c.id);
		expect(new Set(ids).size).toBe(18);
	});

	it('AST rankings are 1 through 18 with no gaps', () => {
		const rankings = CIVILIZATIONS.map((c) => c.astRanking).sort((a, b) => a - b);
		expect(rankings).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
	});

	it('odd AST rankings are Western, even are Eastern', () => {
		for (const c of CIVILIZATIONS) {
			if (c.astRanking % 2 === 1) {
				expect(c.deck).toBe('Western');
			} else {
				expect(c.deck).toBe('Eastern');
			}
		}
	});

	it('all civilizations have valid hex colors', () => {
		for (const c of CIVILIZATIONS) {
			expect(c.colorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
		}
	});

	it('CSS vars follow --color-{id} pattern', () => {
		for (const c of CIVILIZATIONS) {
			expect(c.cssVar).toBe(`--color-${c.id}`);
		}
	});

	it('ordered by AST ranking', () => {
		for (let i = 0; i < CIVILIZATIONS.length; i++) {
			expect(CIVILIZATIONS[i].astRanking).toBe(i + 1);
		}
	});
});

describe('getCivilization', () => {
	it('returns civilization by ID', () => {
		const civ = getCivilization('minoa');
		expect(civ).toBeDefined();
		expect(civ!.name).toBe('Minoa');
		expect(civ!.astRanking).toBe(1);
	});

	it('returns undefined for unknown ID', () => {
		expect(getCivilization('atlantis')).toBeUndefined();
	});
});

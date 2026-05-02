import { describe, it, expect } from 'vitest';
import {
	generateRoomCode,
	isValidRoomCode,
	normalizeRoomCode,
	roomCodeToPeerId,
	playerPeerId
} from './room-code.js';

describe('generateRoomCode', () => {
	it('returns a 4-character string', () => {
		const code = generateRoomCode();
		expect(code).toHaveLength(4);
	});

	it('contains only valid alphabet characters (no 0, 1, O, I)', () => {
		// Run many times to increase confidence
		for (let i = 0; i < 100; i++) {
			const code = generateRoomCode();
			expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
		}
	});

	it('generates different codes (not deterministic)', () => {
		const codes = new Set(Array.from({ length: 50 }, () => generateRoomCode()));
		// With 32^4 = 1M possibilities, 50 codes should all be unique
		expect(codes.size).toBeGreaterThan(1);
	});
});

describe('isValidRoomCode', () => {
	it('accepts a valid 4-char room code', () => {
		expect(isValidRoomCode('AB3K')).toBe(true);
	});

	it('accepts all valid characters', () => {
		expect(isValidRoomCode('ABCD')).toBe(true);
		expect(isValidRoomCode('2345')).toBe(true);
		expect(isValidRoomCode('XY89')).toBe(true);
	});

	it('rejects codes with ambiguous characters', () => {
		expect(isValidRoomCode('A0BC')).toBe(false); // 0 (zero)
		expect(isValidRoomCode('A1BC')).toBe(false); // 1 (one)
		expect(isValidRoomCode('AOBC')).toBe(false); // O (oh)
		expect(isValidRoomCode('AIBC')).toBe(false); // I (eye)
	});

	it('rejects codes that are too short', () => {
		expect(isValidRoomCode('AB3')).toBe(false);
	});

	it('rejects codes that are too long', () => {
		expect(isValidRoomCode('AB3KX')).toBe(false);
	});

	it('rejects empty string', () => {
		expect(isValidRoomCode('')).toBe(false);
	});

	it('rejects lowercase characters', () => {
		expect(isValidRoomCode('ab3k')).toBe(false);
	});
});

describe('normalizeRoomCode', () => {
	it('uppercases lowercase input', () => {
		expect(normalizeRoomCode('ab3k')).toBe('AB3K');
	});

	it('strips non-alphanumeric characters', () => {
		expect(normalizeRoomCode('A-B 3.K')).toBe('AB3K');
	});

	it('truncates to 4 characters', () => {
		expect(normalizeRoomCode('ABCDEF')).toBe('ABCD');
	});

	it('handles empty input', () => {
		expect(normalizeRoomCode('')).toBe('');
	});
});

describe('roomCodeToPeerId', () => {
	it('produces megatrkr- prefixed lowercase ID', () => {
		expect(roomCodeToPeerId('AB3K')).toBe('megatrkr-ab3k');
	});

	it('lowercases the room code', () => {
		expect(roomCodeToPeerId('XY89')).toBe('megatrkr-xy89');
	});
});

describe('playerPeerId', () => {
	it('produces megatrkr-{code}-{playerId prefix} format', () => {
		const id = playerPeerId('AB3K', 'abcdefgh-1234-5678');
		expect(id).toBe('megatrkr-ab3k-abcdefgh');
	});

	it('uses first 8 chars of playerId', () => {
		const id = playerPeerId('AB3K', '12345678extra');
		expect(id).toBe('megatrkr-ab3k-12345678');
	});

	it('handles short playerIds', () => {
		const id = playerPeerId('AB3K', 'short');
		expect(id).toBe('megatrkr-ab3k-short');
	});
});

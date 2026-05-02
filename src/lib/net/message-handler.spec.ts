import { describe, it, expect } from 'vitest';
import { parseMessage } from './message-handler.js';

function validMessage(overrides: Record<string, unknown> = {}) {
	return {
		type: 'ACTION',
		playerId: 'player-1',
		timestamp: Date.now(),
		sequenceId: 1,
		payload: { actionType: 'JOIN_REQUEST' },
		...overrides
	};
}

describe('parseMessage', () => {
	it('accepts a valid ACTION message', () => {
		const result = parseMessage(validMessage());
		expect(result.ok).toBe(true);
	});

	it('accepts all valid message types', () => {
		for (const type of ['ACTION', 'STATE_PATCH', 'STATE_SNAPSHOT', 'BROADCAST', 'PHASE_CHANGE']) {
			const result = parseMessage(validMessage({ type }));
			expect(result.ok).toBe(true);
		}
	});

	it('returns the message when valid', () => {
		const msg = validMessage();
		const result = parseMessage(msg);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.message).toBe(msg);
		}
	});

	// ── Invalid inputs ──

	it('rejects null', () => {
		const result = parseMessage(null);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/not an object/i);
	});

	it('rejects undefined', () => {
		const result = parseMessage(undefined);
		expect(result.ok).toBe(false);
	});

	it('rejects a string', () => {
		const result = parseMessage('not an object');
		expect(result.ok).toBe(false);
	});

	it('rejects a number', () => {
		const result = parseMessage(42);
		expect(result.ok).toBe(false);
	});

	it('rejects an array', () => {
		const result = parseMessage([1, 2, 3]);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/type/i);
	});

	// ── Missing/invalid fields ──

	it('rejects unknown message type', () => {
		const result = parseMessage(validMessage({ type: 'UNKNOWN' }));
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/unknown message type/i);
	});

	it('rejects missing type', () => {
		const msg = validMessage();
		delete (msg as Record<string, unknown>).type;
		const result = parseMessage(msg);
		expect(result.ok).toBe(false);
	});

	it('rejects non-string playerId', () => {
		const result = parseMessage(validMessage({ playerId: 123 }));
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/playerId/i);
	});

	it('rejects missing playerId', () => {
		const msg = validMessage();
		delete (msg as Record<string, unknown>).playerId;
		const result = parseMessage(msg);
		expect(result.ok).toBe(false);
	});

	it('rejects non-number timestamp', () => {
		const result = parseMessage(validMessage({ timestamp: '2024-01-01' }));
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/timestamp/i);
	});

	it('rejects missing timestamp', () => {
		const msg = validMessage();
		delete (msg as Record<string, unknown>).timestamp;
		const result = parseMessage(msg);
		expect(result.ok).toBe(false);
	});

	it('rejects non-number sequenceId', () => {
		const result = parseMessage(validMessage({ sequenceId: 'abc' }));
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/sequenceId/i);
	});

	it('rejects missing sequenceId', () => {
		const msg = validMessage();
		delete (msg as Record<string, unknown>).sequenceId;
		const result = parseMessage(msg);
		expect(result.ok).toBe(false);
	});

	it('rejects missing payload', () => {
		const msg = validMessage();
		delete (msg as Record<string, unknown>).payload;
		const result = parseMessage(msg);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/payload/i);
	});

	it('accepts null payload (payload key exists but value is null)', () => {
		const result = parseMessage(validMessage({ payload: null }));
		expect(result.ok).toBe(true);
	});

	it('accepts empty object payload', () => {
		const result = parseMessage(validMessage({ payload: {} }));
		expect(result.ok).toBe(true);
	});
});

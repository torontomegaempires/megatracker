import { describe, it, expect, beforeEach } from 'vitest';
import { nextSeq, setSeq, resetSeq } from './sequence.js';

describe('sequence counter', () => {
	beforeEach(() => {
		resetSeq();
	});

	it('starts at 1 after reset', () => {
		expect(nextSeq()).toBe(1);
	});

	it('increments monotonically', () => {
		expect(nextSeq()).toBe(1);
		expect(nextSeq()).toBe(2);
		expect(nextSeq()).toBe(3);
	});

	it('resetSeq resets to 0 (next call returns 1)', () => {
		nextSeq();
		nextSeq();
		resetSeq();
		expect(nextSeq()).toBe(1);
	});

	it('setSeq advances counter when n is higher', () => {
		setSeq(100);
		expect(nextSeq()).toBe(101);
	});

	it('setSeq does not go backwards', () => {
		setSeq(50);
		setSeq(10); // should be ignored
		expect(nextSeq()).toBe(51);
	});

	it('setSeq with exact current value is a no-op', () => {
		nextSeq(); // _seq = 1
		setSeq(1); // should not change (n > _seq is false)
		expect(nextSeq()).toBe(2);
	});
});

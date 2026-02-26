import { describe, it, expect } from 'vitest';
import {
	TOKEN_POOL_TOTAL,
	tokenPoolTotal,
	isTokenPoolValid,
	applyTransfer,
	applyTransfers,
	createDefaultTokenPool,
	buildTaxTransfer,
	buildCityConstructionTransfer,
	buildCardPurchaseTransfer,
	bucketLabel
} from './token-pool.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pool(onBoard: number, inStock: number, inTreasury: number) {
	return { populationOnBoard: onBoard, populationInStock: inStock, inTreasury };
}

// ─── tokenPoolTotal ───────────────────────────────────────────────────────────

describe('tokenPoolTotal', () => {
	it('sums all three buckets', () => {
		expect(tokenPoolTotal(pool(10, 35, 10))).toBe(55);
	});

	it('returns 0 when all buckets are 0', () => {
		expect(tokenPoolTotal(pool(0, 0, 0))).toBe(0);
	});

	it('returns correct sum for arbitrary values', () => {
		expect(tokenPoolTotal(pool(20, 20, 15))).toBe(55);
	});
});

// ─── isTokenPoolValid ─────────────────────────────────────────────────────────

describe('isTokenPoolValid', () => {
	it('returns true when pool sums to 55', () => {
		expect(isTokenPoolValid(pool(10, 30, 15))).toBe(true);
	});

	it('returns false when pool is less than 55', () => {
		expect(isTokenPoolValid(pool(10, 30, 14))).toBe(false);
	});

	it('returns false when pool exceeds 55', () => {
		expect(isTokenPoolValid(pool(20, 20, 20))).toBe(false);
	});

	it('returns true for default pool (all in stock)', () => {
		expect(isTokenPoolValid(createDefaultTokenPool())).toBe(true);
	});
});

// ─── createDefaultTokenPool ───────────────────────────────────────────────────

describe('createDefaultTokenPool', () => {
	it('creates pool with 1 on board and 54 in stock', () => {
		const p = createDefaultTokenPool();
		expect(p.populationOnBoard).toBe(1);
		expect(p.populationInStock).toBe(TOKEN_POOL_TOTAL - 1);
		expect(p.inTreasury).toBe(0);
	});

	it('passes invariant check', () => {
		expect(isTokenPoolValid(createDefaultTokenPool())).toBe(true);
	});
});

// ─── applyTransfer ────────────────────────────────────────────────────────────

describe('applyTransfer', () => {
	it('transfers tokens between buckets successfully', () => {
		const p = pool(0, 55, 0);
		const result = applyTransfer(p, { from: 'populationInStock', to: 'inTreasury', amount: 10 });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.player.populationInStock).toBe(45);
		expect(result.player.inTreasury).toBe(10);
		expect(result.player.populationOnBoard).toBe(0);
	});

	it('does not mutate the original player object', () => {
		const p = pool(0, 55, 0);
		applyTransfer(p, { from: 'populationInStock', to: 'inTreasury', amount: 10 });
		expect(p.populationInStock).toBe(55);
		expect(p.inTreasury).toBe(0);
	});

	it('maintains the 55-token invariant after transfer', () => {
		const p = pool(10, 35, 10);
		const result = applyTransfer(p, { from: 'populationOnBoard', to: 'populationInStock', amount: 5 });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(tokenPoolTotal(result.player)).toBe(55);
	});

	it('rejects transfer with amount 0', () => {
		const p = pool(0, 55, 0);
		const result = applyTransfer(p, { from: 'populationInStock', to: 'inTreasury', amount: 0 });
		expect(result.ok).toBe(false);
	});

	it('rejects transfer with negative amount', () => {
		const p = pool(0, 55, 0);
		const result = applyTransfer(p, { from: 'populationInStock', to: 'inTreasury', amount: -5 });
		expect(result.ok).toBe(false);
	});

	it('rejects transfer when source has insufficient tokens', () => {
		const p = pool(0, 5, 0);
		const result = applyTransfer(p, { from: 'populationInStock', to: 'inTreasury', amount: 10 });
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error).toContain('Insufficient');
	});

	it('rejects transfer when source and destination are the same', () => {
		const p = pool(0, 55, 0);
		const result = applyTransfer(p, { from: 'populationInStock', to: 'populationInStock', amount: 5 });
		expect(result.ok).toBe(false);
	});

	it('allows full transfer of a bucket', () => {
		const p = pool(0, 55, 0);
		const result = applyTransfer(p, { from: 'populationInStock', to: 'populationOnBoard', amount: 55 });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.player.populationOnBoard).toBe(55);
		expect(result.player.populationInStock).toBe(0);
	});

	it('allows transfer across all three buckets in sequence', () => {
		const p = pool(0, 55, 0);

		// stock → treasury
		const r1 = applyTransfer(p, { from: 'populationInStock', to: 'inTreasury', amount: 20 });
		expect(r1.ok).toBe(true);
		if (!r1.ok) return;
		expect(r1.player.populationInStock).toBe(35);
		expect(r1.player.inTreasury).toBe(20);

		// treasury → onBoard
		const r2 = applyTransfer(r1.player, { from: 'inTreasury', to: 'populationOnBoard', amount: 5 });
		expect(r2.ok).toBe(true);
		if (!r2.ok) return;
		expect(r2.player.inTreasury).toBe(15);
		expect(r2.player.populationOnBoard).toBe(5);
		expect(tokenPoolTotal(r2.player)).toBe(55);
	});
});

// ─── applyTransfers ───────────────────────────────────────────────────────────

describe('applyTransfers', () => {
	it('applies multiple transfers successfully', () => {
		const p = pool(0, 55, 0);
		const result = applyTransfers(p, [
			{ from: 'populationInStock', to: 'inTreasury', amount: 10 },
			{ from: 'populationInStock', to: 'populationOnBoard', amount: 20 }
		]);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.player.populationInStock).toBe(25);
		expect(result.player.inTreasury).toBe(10);
		expect(result.player.populationOnBoard).toBe(20);
		expect(tokenPoolTotal(result.player)).toBe(55);
	});

	it('rolls back if any transfer fails', () => {
		const p = pool(0, 5, 0);
		const result = applyTransfers(p, [
			{ from: 'populationInStock', to: 'inTreasury', amount: 3 },
			{ from: 'populationInStock', to: 'populationOnBoard', amount: 10 } // will fail
		]);
		expect(result.ok).toBe(false);
	});

	it('handles empty transfer list gracefully', () => {
		const p = pool(10, 35, 10);
		const result = applyTransfers(p, []);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.player).toEqual(p);
	});
});

// ─── Phase-specific helpers ───────────────────────────────────────────────────

describe('buildTaxTransfer', () => {
	it('creates correct transfer for 3 cities', () => {
		const transfer = buildTaxTransfer(3);
		expect(transfer.from).toBe('populationInStock');
		expect(transfer.to).toBe('inTreasury');
		expect(transfer.amount).toBe(6);
	});

	it('creates zero-amount transfer for 0 cities', () => {
		const transfer = buildTaxTransfer(0);
		expect(transfer.amount).toBe(0);
	});

	it('validates against a pool with enough stock', () => {
		const p = pool(0, 55, 0);
		const transfer = buildTaxTransfer(5); // 10 tokens
		const result = applyTransfer(p, transfer);
		expect(result.ok).toBe(true);
	});

	it('fails when stock is insufficient for tax', () => {
		const p = pool(50, 2, 3);
		const transfer = buildTaxTransfer(3); // needs 6
		const result = applyTransfer(p, transfer);
		expect(result.ok).toBe(false);
	});
});

describe('buildCityConstructionTransfer', () => {
	it('creates onBoard → inStock transfer', () => {
		const transfer = buildCityConstructionTransfer(6);
		expect(transfer.from).toBe('populationOnBoard');
		expect(transfer.to).toBe('populationInStock');
		expect(transfer.amount).toBe(6);
	});
});

describe('buildCardPurchaseTransfer', () => {
	it('creates inTreasury → inStock transfer', () => {
		const transfer = buildCardPurchaseTransfer(120);
		expect(transfer.from).toBe('inTreasury');
		expect(transfer.to).toBe('populationInStock');
		expect(transfer.amount).toBe(120);
	});
});

// ─── bucketLabel ──────────────────────────────────────────────────────────────

describe('bucketLabel', () => {
	it('returns readable labels for all buckets', () => {
		expect(bucketLabel('populationOnBoard')).toBe('Population');
		expect(bucketLabel('populationInStock')).toBe('In Stock');
		expect(bucketLabel('inTreasury')).toBe('Treasury');
	});
});

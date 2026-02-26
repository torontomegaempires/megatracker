import type { Player, TokenBucket, TokenTransfer } from '../types/game.js';

export const TOKEN_POOL_TOTAL = 55;

// ─── Invariant Validation ─────────────────────────────────────────────────────

/**
 * Returns the current sum of the three token pool buckets.
 * Must always equal TOKEN_POOL_TOTAL (55).
 */
export function tokenPoolTotal(player: Pick<Player, 'populationOnBoard' | 'populationInStock' | 'inTreasury'>): number {
	return player.populationOnBoard + player.populationInStock + player.inTreasury;
}

/**
 * Returns true if the player's 55-token pool invariant holds.
 */
export function isTokenPoolValid(player: Pick<Player, 'populationOnBoard' | 'populationInStock' | 'inTreasury'>): boolean {
	return tokenPoolTotal(player) === TOKEN_POOL_TOTAL;
}

// ─── Transfer Result ──────────────────────────────────────────────────────────

export type TransferResult =
	| { ok: true; player: Pick<Player, 'populationOnBoard' | 'populationInStock' | 'inTreasury'> }
	| { ok: false; error: string };

// ─── Core Transfer Function ───────────────────────────────────────────────────

/**
 * Apply a token transfer between two buckets.
 *
 * Validates:
 * - amount > 0
 * - source bucket has sufficient tokens
 * - resulting pool still totals 55
 *
 * Returns the updated pool values on success, or an error string on failure.
 * Does NOT mutate the player object — returns a new partial.
 */
export function applyTransfer(
	player: Pick<Player, 'populationOnBoard' | 'populationInStock' | 'inTreasury'>,
	transfer: TokenTransfer
): TransferResult {
	const { from, to, amount } = transfer;

	if (amount <= 0) {
		return { ok: false, error: 'Transfer amount must be positive.' };
	}
	if (from === to) {
		return { ok: false, error: 'Source and destination buckets must differ.' };
	}

	const currentFrom = player[from];
	if (currentFrom < amount) {
		return {
			ok: false,
			error: `Insufficient tokens in ${bucketLabel(from)}: have ${currentFrom}, need ${amount}.`
		};
	}

	const updated = {
		populationOnBoard: player.populationOnBoard,
		populationInStock: player.populationInStock,
		inTreasury: player.inTreasury
	};
	updated[from] -= amount;
	updated[to] += amount;

	if (tokenPoolTotal(updated) !== TOKEN_POOL_TOTAL) {
		// Should never happen due to the bucket-transfer model, but guard defensively.
		return { ok: false, error: 'Token pool invariant violated after transfer.' };
	}

	return { ok: true, player: updated };
}

/**
 * Apply multiple sequential transfers. Rolls back all if any fails.
 */
export function applyTransfers(
	player: Pick<Player, 'populationOnBoard' | 'populationInStock' | 'inTreasury'>,
	transfers: TokenTransfer[]
): TransferResult {
	let current = { ...player };
	for (const transfer of transfers) {
		const result = applyTransfer(current, transfer);
		if (!result.ok) return result;
		current = { ...current, ...result.player };
	}
	return { ok: true, player: current };
}

// ─── Phase-Specific Transfer Helpers ─────────────────────────────────────────

/**
 * Phase 1 — Tax Collection: 2 tokens per city from inStock → inTreasury.
 * Returns error if stock is insufficient (tax revolt condition).
 */
export function buildTaxTransfer(citiesOnBoard: number): TokenTransfer {
	return { from: 'populationInStock', to: 'inTreasury', amount: 2 * citiesOnBoard };
}

/**
 * Phase 5 — City Construction: tokens spent to build a city.
 * onBoard → inStock (tokens in city area returned), citiesInStock → citiesOnBoard handled separately.
 * Returns the transfer for the tokens returned to stock.
 */
export function buildCityConstructionTransfer(tokensInArea: number): TokenTransfer {
	return { from: 'populationOnBoard', to: 'populationInStock', amount: tokensInArea };
}

/**
 * Phase 12 — Civilization Advances: pay cost from inTreasury → inStock.
 */
export function buildCardPurchaseTransfer(cost: number): TokenTransfer {
	return { from: 'inTreasury', to: 'populationInStock', amount: cost };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function bucketLabel(bucket: TokenBucket): string {
	switch (bucket) {
		case 'populationOnBoard':
			return 'Population';
		case 'populationInStock':
			return 'In Stock';
		case 'inTreasury':
			return 'Treasury';
	}
}

/**
 * Create a default empty token pool (all 55 in stock).
 */
export function createDefaultTokenPool(): Pick<Player, 'populationOnBoard' | 'populationInStock' | 'inTreasury'> {
	return {
		populationOnBoard: 1,
		populationInStock: TOKEN_POOL_TOTAL - 1,
		inTreasury: 0
	};
}

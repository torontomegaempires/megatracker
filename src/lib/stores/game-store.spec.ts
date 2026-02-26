import { describe, it, expect, beforeEach } from 'vitest';

// We test the pure functions used by the store directly since
// module-level $state can't be reset between tests in Vitest without
// re-importing. We test the functions through exported store interface
// after calling setSession + setMyPlayerId.

// Helper to create a minimal Player object
import type { Player, GameSession, CommodityType } from '../types/game.js';
import { COMMODITY_TYPES } from '../types/game.js';

function makePlayer(overrides: Partial<Player> = {}): Player {
	const defaultHand = Object.fromEntries(COMMODITY_TYPES.map((t) => [t, 0])) as Record<
		CommodityType,
		number
	>;
	return {
		playerId: 'player-1',
		playerName: 'Alice',
		civilizationId: 'minoa',
		civilizationName: 'Minoa',
		astRanking: 1,
		colorHex: '#7CB342',
		isHost: false,
		peerJsId: '',
		populationOnBoard: 20,
		populationInStock: 30,
		inTreasury: 5,
		citiesOnBoard: 2,
		citiesInStock: 7,
		shipsOnBoard: 1,
		shipsInStock: 3,
		commodityHand: defaultHand,
		ownedCardIds: [],
		astPosition: 1,
		victoryPoints: 0,
		connectionStatus: 'connected',
		...overrides
	};
}

function makeSession(players: Player[]): GameSession {
	return {
		sessionId: 'session-1',
		sessionName: 'Test',
		variant: 'Western',
		status: 'active',
		hostPeerId: 'host-peer',
		hostPlayerId: players[0]?.playerId ?? '',
		players,
		currentPhase: 1,
		currentTurn: 1,
		actionLog: [],
		createdAt: Date.now()
	};
}

// ─── updatePlayerFields (via store) ──────────────────────────────────────────

// Since game.svelte.ts uses module-level $state, we import fresh each time.
// We test the exported mutation directly.

describe('gameStore.updatePlayerFields', async () => {
	const { gameStore } = await import('./game.svelte.js');

	beforeEach(() => {
		const player = makePlayer();
		gameStore.setSession(makeSession([player]));
		gameStore.setMyPlayerId('player-1');
	});

	it('updates city count without affecting token pool', () => {
		const before = gameStore.session!.players[0];
		const poolBefore = {
			onBoard: before.populationOnBoard,
			inStock: before.populationInStock,
			treasury: before.inTreasury
		};

		const err = gameStore.updatePlayerFields('player-1', { citiesOnBoard: 5, citiesInStock: 4 });
		expect(err).toBeNull();

		const after = gameStore.session!.players[0];
		expect(after.citiesOnBoard).toBe(5);
		expect(after.citiesInStock).toBe(4);

		// Token pool must be unchanged
		expect(after.populationOnBoard).toBe(poolBefore.onBoard);
		expect(after.populationInStock).toBe(poolBefore.inStock);
		expect(after.inTreasury).toBe(poolBefore.treasury);
	});

	it('returns error when player not found', () => {
		const err = gameStore.updatePlayerFields('nonexistent-id', { citiesOnBoard: 1 });
		expect(err).not.toBeNull();
		expect(err).toMatch(/not found/i);
	});

	it('returns error when no session', () => {
		gameStore.clearSession();
		const err = gameStore.updatePlayerFields('player-1', { citiesOnBoard: 1 });
		expect(err).not.toBeNull();
	});

	it('updates commodity hand', () => {
		const defaultHand = Object.fromEntries(COMMODITY_TYPES.map((t) => [t, 0])) as Record<
			CommodityType,
			number
		>;
		const newHand = { ...defaultHand, Iron: 3, Gold: 2 };

		const err = gameStore.updatePlayerFields('player-1', { commodityHand: newHand });
		expect(err).toBeNull();

		const after = gameStore.session!.players[0];
		expect(after.commodityHand.Iron).toBe(3);
		expect(after.commodityHand.Gold).toBe(2);
		expect(after.commodityHand.Ochre).toBe(0);
	});

	it('updates AST position', () => {
		const err = gameStore.updatePlayerFields('player-1', { astPosition: 5 });
		expect(err).toBeNull();
		expect(gameStore.session!.players[0].astPosition).toBe(5);
	});

	it('updates ship counts', () => {
		const err = gameStore.updatePlayerFields('player-1', { shipsOnBoard: 3, shipsInStock: 1 });
		expect(err).toBeNull();
		const after = gameStore.session!.players[0];
		expect(after.shipsOnBoard).toBe(3);
		expect(after.shipsInStock).toBe(1);
	});
});

// ─── Ship construction transfer helpers ──────────────────────────────────────

import { applyTransfers, applyTransfer } from '../utils/token-pool.js';

describe('ship construction transfers', () => {
	function pool(onBoard: number, inStock: number, treasury: number) {
		return { populationOnBoard: onBoard, populationInStock: inStock, inTreasury: treasury };
	}

	it('option A: 2 treasury → stock reduces treasury by 2', () => {
		const p = pool(20, 25, 10);
		const result = applyTransfer(p, { from: 'inTreasury', to: 'populationInStock', amount: 2 });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.player.inTreasury).toBe(8);
		expect(result.player.populationInStock).toBe(27);
	});

	it('option B: 1 treasury + 1 board → stock (two transfers)', () => {
		const p = pool(10, 40, 5);
		const result = applyTransfers(p, [
			{ from: 'inTreasury', to: 'populationInStock', amount: 1 },
			{ from: 'populationOnBoard', to: 'populationInStock', amount: 1 }
		]);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.player.inTreasury).toBe(4);
		expect(result.player.populationOnBoard).toBe(9);
		expect(result.player.populationInStock).toBe(42);
	});

	it('option C: 2 board → stock', () => {
		const p = pool(15, 35, 5);
		const result = applyTransfer(p, {
			from: 'populationOnBoard',
			to: 'populationInStock',
			amount: 2
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.player.populationOnBoard).toBe(13);
		expect(result.player.populationInStock).toBe(37);
	});

	it('ship maintenance: 1 per ship from treasury → stock', () => {
		// Pool must sum to 55: 20 + 25 + 10 = 55
		const p = pool(20, 25, 10);
		const shipsOnBoard = 3;
		const result = applyTransfer(p, {
			from: 'inTreasury',
			to: 'populationInStock',
			amount: shipsOnBoard
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.player.inTreasury).toBe(7);
		expect(result.player.populationInStock).toBe(28);
	});

	it('ship construction option A fails when treasury < 2', () => {
		const p = pool(20, 34, 1);
		const result = applyTransfer(p, { from: 'inTreasury', to: 'populationInStock', amount: 2 });
		expect(result.ok).toBe(false);
	});

	it('ship construction option C fails when board < 2', () => {
		const p = pool(1, 49, 5);
		const result = applyTransfer(p, {
			from: 'populationOnBoard',
			to: 'populationInStock',
			amount: 2
		});
		expect(result.ok).toBe(false);
	});
});

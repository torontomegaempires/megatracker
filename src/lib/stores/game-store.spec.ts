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

// ─── advancePhase / rewindPhase ─────────────────────────────────────────────

describe('gameStore.advancePhase', async () => {
	const { gameStore } = await import('./game.svelte.js');

	beforeEach(() => {
		const host = makePlayer({ playerId: 'host-1', isHost: true });
		gameStore.setSession(makeSession([host]));
		gameStore.setMyPlayerId('host-1');
	});

	it('increments phase from 1 to 2', () => {
		gameStore.advancePhase();
		expect(gameStore.session!.currentPhase).toBe(2);
	});

	it('wraps from phase 12 to phase 1 and increments turn', () => {
		const session = gameStore.session!;
		session.currentPhase = 12;
		session.currentTurn = 1;
		gameStore.advancePhase();
		expect(session.currentPhase).toBe(1);
		expect(session.currentTurn).toBe(2);
	});

	it('advances through all 12 phases sequentially', () => {
		for (let i = 2; i <= 12; i++) {
			gameStore.advancePhase();
			expect(gameStore.session!.currentPhase).toBe(i);
		}
	});
});

describe('gameStore.rewindPhase', async () => {
	const { gameStore } = await import('./game.svelte.js');

	beforeEach(() => {
		const host = makePlayer({ playerId: 'host-1', isHost: true });
		const session = makeSession([host]);
		session.currentPhase = 5;
		gameStore.setSession(session);
		gameStore.setMyPlayerId('host-1');
	});

	it('decrements phase from 5 to 4', () => {
		gameStore.rewindPhase();
		expect(gameStore.session!.currentPhase).toBe(4);
	});

	it('does not go below phase 1', () => {
		gameStore.session!.currentPhase = 1;
		gameStore.rewindPhase();
		expect(gameStore.session!.currentPhase).toBe(1);
	});
});

// ─── addPlayer / removePlayer ───────────────────────────────────────────────

describe('gameStore.addPlayer', async () => {
	const { gameStore } = await import('./game.svelte.js');

	beforeEach(() => {
		const host = makePlayer({ playerId: 'host-1', isHost: true });
		gameStore.setSession(makeSession([host]));
		gameStore.setMyPlayerId('host-1');
	});

	it('adds a player to the session', () => {
		const newPlayer = makePlayer({ playerId: 'player-2', playerName: 'Bob' });
		gameStore.addPlayer(newPlayer);
		expect(gameStore.session!.players).toHaveLength(2);
		expect(gameStore.session!.players[1].playerName).toBe('Bob');
	});

	it('does nothing when no session', () => {
		gameStore.clearSession();
		const newPlayer = makePlayer({ playerId: 'player-2' });
		gameStore.addPlayer(newPlayer); // should not throw
		expect(gameStore.session).toBeNull();
	});
});

describe('gameStore.removePlayer', async () => {
	const { gameStore } = await import('./game.svelte.js');

	beforeEach(() => {
		const host = makePlayer({ playerId: 'host-1', isHost: true });
		const p2 = makePlayer({ playerId: 'player-2', playerName: 'Bob' });
		gameStore.setSession(makeSession([host, p2]));
		gameStore.setMyPlayerId('host-1');
	});

	it('removes a player by ID', () => {
		gameStore.removePlayer('player-2');
		expect(gameStore.session!.players).toHaveLength(1);
		expect(gameStore.session!.players[0].playerId).toBe('host-1');
	});

	it('does nothing for nonexistent player', () => {
		gameStore.removePlayer('nonexistent');
		expect(gameStore.session!.players).toHaveLength(2);
	});
});

// ─── setPlayerConnectionStatus ──────────────────────────────────────────────

describe('gameStore.setPlayerConnectionStatus', async () => {
	const { gameStore } = await import('./game.svelte.js');

	beforeEach(() => {
		const host = makePlayer({ playerId: 'host-1', isHost: true });
		const p2 = makePlayer({ playerId: 'player-2', connectionStatus: 'connected' });
		gameStore.setSession(makeSession([host, p2]));
		gameStore.setMyPlayerId('host-1');
	});

	it('updates connection status to disconnected', () => {
		gameStore.setPlayerConnectionStatus('player-2', 'disconnected');
		expect(gameStore.session!.players[1].connectionStatus).toBe('disconnected');
	});

	it('updates connection status back to connected', () => {
		gameStore.setPlayerConnectionStatus('player-2', 'disconnected');
		gameStore.setPlayerConnectionStatus('player-2', 'connected');
		expect(gameStore.session!.players[1].connectionStatus).toBe('connected');
	});

	it('does nothing for unknown player', () => {
		gameStore.setPlayerConnectionStatus('nonexistent', 'disconnected');
		// No crash, existing players unchanged
		expect(gameStore.session!.players[1].connectionStatus).toBe('connected');
	});
});

// ─── applyStatePatch ────────────────────────────────────────────────────────

describe('gameStore.applyStatePatch', async () => {
	const { gameStore } = await import('./game.svelte.js');

	beforeEach(() => {
		const host = makePlayer({ playerId: 'host-1', isHost: true });
		const p2 = makePlayer({ playerId: 'player-2', citiesOnBoard: 2 });
		gameStore.setSession(makeSession([host, p2]));
		gameStore.setMyPlayerId('host-1');
	});

	it('applies patch to affected player', () => {
		gameStore.applyStatePatch({
			affectedPlayerId: 'player-2',
			patch: { citiesOnBoard: 5 },
			actionEntry: {
				entryId: 'entry-1',
				timestamp: Date.now(),
				phase: 1,
				initiatedBy: 'host-1',
				actionType: 'CITY_BUILD',
				description: 'Built 3 cities',
				previousValue: 2,
				newValue: 5,
				affectedPlayerId: 'player-2'
			}
		});
		expect(gameStore.session!.players[1].citiesOnBoard).toBe(5);
	});

	it('appends action entry to log', () => {
		const entry = {
			entryId: 'entry-1',
			timestamp: Date.now(),
			phase: 1,
			initiatedBy: 'host-1',
			actionType: 'TEST',
			description: 'test',
			previousValue: null,
			newValue: null,
			affectedPlayerId: 'player-2'
		};
		gameStore.applyStatePatch({ affectedPlayerId: 'player-2', patch: {}, actionEntry: entry });
		expect(gameStore.session!.actionLog).toHaveLength(1);
		expect(gameStore.session!.actionLog[0].entryId).toBe('entry-1');
	});
});

// ─── hostSetPlayerState ─────────────────────────────────────────────────────

describe('gameStore.hostSetPlayerState', async () => {
	const { gameStore } = await import('./game.svelte.js');

	beforeEach(() => {
		const host = makePlayer({
			playerId: 'host-1',
			isHost: true,
			populationOnBoard: 20,
			populationInStock: 30,
			inTreasury: 5
		});
		const p2 = makePlayer({
			playerId: 'player-2',
			populationOnBoard: 20,
			populationInStock: 30,
			inTreasury: 5
		});
		gameStore.setSession(makeSession([host, p2]));
		gameStore.setMyPlayerId('host-1');
	});

	it('allows valid state fix that maintains 55-token invariant', () => {
		const err = gameStore.hostSetPlayerState('player-2', {
			populationOnBoard: 25,
			populationInStock: 25,
			inTreasury: 5
		});
		expect(err).toBeNull();
		expect(gameStore.session!.players[1].populationOnBoard).toBe(25);
	});

	it('rejects state fix that violates 55-token invariant', () => {
		const err = gameStore.hostSetPlayerState('player-2', {
			populationOnBoard: 30,
			populationInStock: 30,
			inTreasury: 5
		});
		expect(err).not.toBeNull();
		expect(err).toMatch(/invariant/i);
	});

	it('rejects when player not found', () => {
		const err = gameStore.hostSetPlayerState('nonexistent', { populationOnBoard: 20 });
		expect(err).toMatch(/not found/i);
	});

	it('rejects when no session', () => {
		gameStore.clearSession();
		const err = gameStore.hostSetPlayerState('player-2', { populationOnBoard: 20 });
		expect(err).not.toBeNull();
	});
});

// ─── appendActionEntry ──────────────────────────────────────────────────────

describe('gameStore.appendActionEntry', async () => {
	const { gameStore } = await import('./game.svelte.js');

	beforeEach(() => {
		const host = makePlayer({ playerId: 'host-1', isHost: true });
		gameStore.setSession(makeSession([host]));
		gameStore.setMyPlayerId('host-1');
	});

	it('appends entry to action log', () => {
		gameStore.appendActionEntry({
			entryId: 'e1',
			timestamp: Date.now(),
			phase: 1,
			initiatedBy: 'host-1',
			actionType: 'TAX',
			description: 'Collected tax',
			previousValue: 0,
			newValue: 4,
			affectedPlayerId: 'host-1'
		});
		expect(gameStore.session!.actionLog).toHaveLength(1);
	});

	it('preserves existing entries (append-only)', () => {
		gameStore.appendActionEntry({
			entryId: 'e1',
			timestamp: 1,
			phase: 1,
			initiatedBy: 'host-1',
			actionType: 'A',
			description: 'first',
			previousValue: null,
			newValue: null,
			affectedPlayerId: 'host-1'
		});
		gameStore.appendActionEntry({
			entryId: 'e2',
			timestamp: 2,
			phase: 1,
			initiatedBy: 'host-1',
			actionType: 'B',
			description: 'second',
			previousValue: null,
			newValue: null,
			affectedPlayerId: 'host-1'
		});
		expect(gameStore.session!.actionLog).toHaveLength(2);
		expect(gameStore.session!.actionLog[0].entryId).toBe('e1');
		expect(gameStore.session!.actionLog[1].entryId).toBe('e2');
	});
});

// ─── setSessionStatus ───────────────────────────────────────────────────────

describe('gameStore.setSessionStatus', async () => {
	const { gameStore } = await import('./game.svelte.js');

	beforeEach(() => {
		const host = makePlayer({ playerId: 'host-1', isHost: true });
		const session = makeSession([host]);
		session.status = 'lobby';
		gameStore.setSession(session);
		gameStore.setMyPlayerId('host-1');
	});

	it('transitions from lobby to active', () => {
		gameStore.setSessionStatus('active');
		expect(gameStore.session!.status).toBe('active');
		expect(gameStore.isActive).toBe(true);
	});

	it('transitions from active to ended', () => {
		gameStore.setSessionStatus('active');
		gameStore.setSessionStatus('ended');
		expect(gameStore.session!.status).toBe('ended');
	});
});

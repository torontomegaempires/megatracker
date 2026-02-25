import type { DataConnection } from 'peerjs';
import { peerNet } from './peer.svelte.js';
import { nextSeq } from './sequence.js';
import { gameStore } from '../stores/game.svelte.js';
import { sessionMetaStore } from '../stores/session-meta.svelte.js';
import { buildActionEntry } from '../utils/action-builder.js';
import { generateRoomCode, roomCodeToPeerId, playerPeerId } from '../utils/room-code.js';
import { generateId } from '../utils/uuid.js';
import { applyTransfers } from '../utils/token-pool.js';
import { CIVILISATIONS } from '../data/civilisations.js';
import { COMMODITY_TYPES } from '../types/game.js';
import { createDefaultTokenPool } from '../utils/token-pool.js';
import type { GameSession, Player, GameVariant } from '../types/game.js';
import { CARD_MAP } from '../data/cards.js';
import { calcNetCardCost } from '../utils/vp.js';
import type {
	TypedMessage,
	StatePatchPayload,
	StateSnapshotPayload,
	PhaseChangePayload,
	JoinRequestPayload,
	TokenTransferActionPayload,
	PlayerFieldUpdatePayload,
	CardPurchasePayload
} from '../types/messages.js';
import type { TokenTransfer } from '../types/game.js';

// ─── State ────────────────────────────────────────────────────────────────────

/** Map from PeerJS peer ID → player ID (for identifying who sent an action) */
let _peerToPlayer = new Map<string, string>();
/** Map from player ID → PeerJS peer ID */
let _playerToPeer = new Map<string, string>();

// ─── Message factory helpers ──────────────────────────────────────────────────

function makeSnapshot(): TypedMessage {
	return {
		type: 'STATE_SNAPSHOT',
		playerId: 'host',
		timestamp: Date.now(),
		sequenceId: nextSeq(),
		payload: { session: gameStore.session } as StateSnapshotPayload
	};
}

function makeStatePatch(patchPayload: StatePatchPayload): TypedMessage {
	return {
		type: 'STATE_PATCH',
		playerId: 'host',
		timestamp: Date.now(),
		sequenceId: nextSeq(),
		payload: patchPayload
	};
}

function makePhaseChange(prev: number, next: number, turn: number): TypedMessage {
	return {
		type: 'PHASE_CHANGE',
		playerId: 'host',
		timestamp: Date.now(),
		sequenceId: nextSeq(),
		payload: { previousPhase: prev, newPhase: next, turn } as PhaseChangePayload
	};
}

function makeBroadcast(message: string): TypedMessage {
	return {
		type: 'BROADCAST',
		playerId: 'host',
		timestamp: Date.now(),
		sequenceId: nextSeq(),
		payload: { message }
	};
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function handleIncomingConnection(conn: DataConnection): void {
	// Connection wired in peer.svelte.ts — nothing extra needed here
	void conn;
}

function handleDisconnect(peerId: string): void {
	const playerId = _peerToPlayer.get(peerId);
	if (!playerId) return;
	gameStore.setPlayerConnectionStatus(playerId, 'disconnected');
	// Keep the slot for reconnection
}

function handleMessage(conn: DataConnection, msg: TypedMessage): void {
	if (msg.type !== 'ACTION') return;

	const payload = msg.payload as Record<string, unknown>;
	const actionType = payload?.actionType as string;

	if (actionType === 'JOIN_REQUEST') {
		handleJoinRequest(conn, payload as unknown as JoinRequestPayload);
	} else if (actionType === 'RECONNECT') {
		handleReconnect(conn, payload as { playerId: string; sessionId: string });
	} else if (actionType === 'TOKEN_TRANSFER') {
		const senderId = _peerToPlayer.get(conn.peer);
		if (!senderId) return;
		handleTokenTransfer(senderId, payload as unknown as TokenTransferActionPayload);
	} else if (actionType === 'PLAYER_FIELD_UPDATE') {
		const senderId = _peerToPlayer.get(conn.peer);
		if (!senderId) return;
		handlePlayerFieldUpdate(senderId, payload as unknown as PlayerFieldUpdatePayload);
	} else if (actionType === 'SET_CIV') {
		const senderId = _peerToPlayer.get(conn.peer);
		if (!senderId) return;
		handleSetCiv(senderId, payload as { civId: string });
	} else if (actionType === 'PURCHASE_CARD') {
		const senderId = _peerToPlayer.get(conn.peer);
		if (!senderId) return;
		handleCardPurchase(senderId, payload as unknown as CardPurchasePayload);
	} else if (actionType === 'SET_READY') {
		const senderId = _peerToPlayer.get(conn.peer);
		if (!senderId) return;
		// Just re-broadcast snapshot so everyone sees updated ready state
		peerNet.sendTo(conn.peer, makeSnapshot());
	}
}

// ─── Action handlers ──────────────────────────────────────────────────────────

function handleJoinRequest(conn: DataConnection, req: JoinRequestPayload): void {
	const session = gameStore.session;
	if (!session || session.status !== 'lobby') {
		peerNet.send(conn, makeBroadcast('Session is not accepting new players.'));
		return;
	}

	// Check if this player is already in the session (reconnect case)
	const existing = session.players.find((p) => p.playerId === req.playerId);
	if (existing) {
		// Treat as reconnect
		_peerToPlayer.set(conn.peer, existing.playerId);
		_playerToPeer.set(existing.playerId, conn.peer);
		gameStore.setPlayerConnectionStatus(existing.playerId, 'connected');
		peerNet.send(conn, makeSnapshot());
		return;
	}

	const civDef = CIVILISATIONS.find((c) => c.id === req.civId) ?? CIVILISATIONS[0];
	const defaultHand = Object.fromEntries(COMMODITY_TYPES.map((t) => [t, 0])) as Record<
		(typeof COMMODITY_TYPES)[number],
		number
	>;

	const player: Player = {
		playerId: req.playerId,
		playerName: req.playerName,
		civilisationId: civDef.id,
		civilisationName: civDef.name,
		astRanking: civDef.astRanking,
		colorHex: civDef.colorHex,
		isHost: false,
		peerJsId: conn.peer,
		...createDefaultTokenPool(),
		citiesOnBoard: 0,
		citiesInStock: 9,
		shipsOnBoard: 0,
		shipsInStock: 4,
		commodityHand: defaultHand,
		ownedCardIds: [],
		astPosition: 1,
		victoryPoints: 0,
		connectionStatus: 'connected'
	};

	// Register peer mapping
	_peerToPlayer.set(conn.peer, player.playerId);
	_playerToPeer.set(player.playerId, conn.peer);

	// Add player to game state
	gameStore.addPlayer(player);

	const actionEntry = buildActionEntry({
		actionType: 'JOIN',
		description: `${player.playerName} joined as ${player.civilisationName}.`,
		initiatedBy: player.playerId,
		affectedPlayerId: player.playerId,
		previousValue: null,
		newValue: player
	});
	gameStore.appendActionEntry(actionEntry);

	// Send snapshot to new joiner
	peerNet.send(conn, makeSnapshot());

	// Broadcast player-joined patch to all OTHER clients
	const patchPayload: StatePatchPayload = {
		affectedPlayerId: player.playerId,
		patch: player,
		actionEntry
	};
	// Send to all connections except the new joiner
	for (const [peerId, c] of peerNet.connections) {
		if (peerId !== conn.peer && c.open) c.send(makeStatePatch(patchPayload));
	}
}

function handleReconnect(conn: DataConnection, req: { playerId: string; sessionId: string }): void {
	const session = gameStore.session;
	if (!session || session.sessionId !== req.sessionId) return;

	const player = session.players.find((p) => p.playerId === req.playerId);
	if (!player) return;

	// Update peer mapping
	const oldPeerId = _playerToPeer.get(req.playerId);
	if (oldPeerId) _peerToPlayer.delete(oldPeerId);
	_peerToPlayer.set(conn.peer, req.playerId);
	_playerToPeer.set(req.playerId, conn.peer);

	gameStore.setPlayerConnectionStatus(req.playerId, 'connected');
	peerNet.send(conn, makeSnapshot());
}

function handleTokenTransfer(playerId: string, payload: TokenTransferActionPayload): void {
	const session = gameStore.session;
	if (!session) return;

	const player = session.players.find((p) => p.playerId === playerId);
	if (!player) return;

	const transfers = (payload.transfers ?? []) as TokenTransfer[];
	const result = applyTransfers(player, transfers);
	if (!result.ok) {
		const peerId = _playerToPeer.get(playerId);
		if (peerId) peerNet.sendTo(peerId, makeBroadcast(`Transfer failed: ${result.error}`));
		return;
	}

	const previousValue = {
		populationOnBoard: player.populationOnBoard,
		populationInStock: player.populationInStock,
		inTreasury: player.inTreasury
	};

	// Apply to store
	gameStore.applyPlayerTransfers(playerId, transfers);

	const updatedPlayer = session.players.find((p) => p.playerId === playerId)!;
	const actionEntry = buildActionEntry({
		actionType: 'TOKEN_TRANSFER',
		description: `${player.playerName} moved ${transfers.map((t) => `${t.amount} ${t.from}→${t.to}`).join(', ')}.`,
		initiatedBy: playerId,
		affectedPlayerId: playerId,
		previousValue,
		newValue: {
			populationOnBoard: updatedPlayer.populationOnBoard,
			populationInStock: updatedPlayer.populationInStock,
			inTreasury: updatedPlayer.inTreasury
		}
	});
	gameStore.appendActionEntry(actionEntry);

	const patchPayload: StatePatchPayload = {
		affectedPlayerId: playerId,
		patch: {
			populationOnBoard: updatedPlayer.populationOnBoard,
			populationInStock: updatedPlayer.populationInStock,
			inTreasury: updatedPlayer.inTreasury
		},
		actionEntry
	};
	peerNet.broadcast(makeStatePatch(patchPayload));
}

function handlePlayerFieldUpdate(playerId: string, payload: PlayerFieldUpdatePayload): void {
	const session = gameStore.session;
	if (!session || session.status !== 'active') return;

	const player = session.players.find((p) => p.playerId === playerId);
	if (!player) return;

	const previousValue = { ...player };
	gameStore.updatePlayerFields(playerId, payload.patch);

	const actionEntry = buildActionEntry({
		actionType: 'PLAYER_FIELD_UPDATE',
		description: payload.description,
		initiatedBy: playerId,
		affectedPlayerId: playerId,
		previousValue,
		newValue: payload.patch
	});
	gameStore.appendActionEntry(actionEntry);

	const patchPayload: StatePatchPayload = {
		affectedPlayerId: playerId,
		patch: payload.patch,
		actionEntry
	};
	peerNet.broadcast(makeStatePatch(patchPayload));
}

function handleCardPurchase(playerId: string, payload: CardPurchasePayload): void {
	const session = gameStore.session;
	if (!session || session.status !== 'active') return;
	if (session.currentPhase !== 12) {
		const peerId = _playerToPeer.get(playerId);
		if (peerId) peerNet.sendTo(peerId, makeBroadcast('Card purchases are only allowed during Phase 12.'));
		return;
	}

	const player = session.players.find((p) => p.playerId === playerId);
	if (!player) return;

	const card = CARD_MAP.get(payload.cardId);
	if (!card) {
		const peerId = _playerToPeer.get(playerId);
		if (peerId) peerNet.sendTo(peerId, makeBroadcast(`Unknown card: ${payload.cardId}`));
		return;
	}

	if (player.ownedCardIds.includes(payload.cardId)) {
		const peerId = _playerToPeer.get(playerId);
		if (peerId) peerNet.sendTo(peerId, makeBroadcast(`You already own ${card.name}.`));
		return;
	}

	// Host re-validates net cost independently — ignores client's claimed value
	const ownedCards = player.ownedCardIds
		.map((id) => CARD_MAP.get(id))
		.filter((c): c is NonNullable<typeof c> => c !== undefined);
	const trueNetCost = calcNetCardCost(card, ownedCards);

	if (player.inTreasury < trueNetCost) {
		const peerId = _playerToPeer.get(playerId);
		if (peerId)
			peerNet.sendTo(
				peerId,
				makeBroadcast(
					`Insufficient treasury for ${card.name}: need ${trueNetCost}, have ${player.inTreasury}.`
				)
			);
		return;
	}

	const previousTreasury = player.inTreasury;
	const previousOwnedCardIds = [...player.ownedCardIds];

	// Apply treasury payment (inTreasury → inStock)
	if (trueNetCost > 0) {
		gameStore.applyPlayerTransfers(playerId, [
			{ from: 'inTreasury', to: 'populationInStock', amount: trueNetCost }
		]);
	}

	// Add card to owned list
	gameStore.updatePlayerFields(playerId, {
		ownedCardIds: [...player.ownedCardIds, payload.cardId]
	});

	const updatedPlayer = session.players.find((p) => p.playerId === playerId)!;

	const actionEntry = buildActionEntry({
		actionType: 'PURCHASE_CARD',
		description: `${player.playerName} purchased ${card.name} for ${trueNetCost} treasury.`,
		initiatedBy: playerId,
		affectedPlayerId: playerId,
		previousValue: { inTreasury: previousTreasury, ownedCardIds: previousOwnedCardIds },
		newValue: { inTreasury: updatedPlayer.inTreasury, ownedCardIds: updatedPlayer.ownedCardIds }
	});
	gameStore.appendActionEntry(actionEntry);

	const patchPayload: StatePatchPayload = {
		affectedPlayerId: playerId,
		patch: {
			inTreasury: updatedPlayer.inTreasury,
			populationInStock: updatedPlayer.populationInStock,
			ownedCardIds: [...updatedPlayer.ownedCardIds]
		},
		actionEntry
	};
	peerNet.broadcast(makeStatePatch(patchPayload));
}

function handleSetCiv(playerId: string, payload: { civId: string }): void {
	const session = gameStore.session;
	if (!session || session.status !== 'lobby') return;

	const civDef = CIVILISATIONS.find((c) => c.id === payload.civId);
	if (!civDef) return;

	const player = session.players.find((p) => p.playerId === playerId);
	if (!player) return;

	const patch: Partial<Player> = {
		civilisationId: civDef.id,
		civilisationName: civDef.name,
		astRanking: civDef.astRanking,
		colorHex: civDef.colorHex
	};

	const actionEntry = buildActionEntry({
		actionType: 'SET_CIV',
		description: `${player.playerName} chose ${civDef.name}.`,
		initiatedBy: playerId,
		affectedPlayerId: playerId,
		previousValue: player.civilisationId,
		newValue: civDef.id
	});

	// Apply locally
	Object.assign(player, patch);
	gameStore.appendActionEntry(actionEntry);

	const patchPayload: StatePatchPayload = { affectedPlayerId: playerId, patch, actionEntry };
	peerNet.broadcast(makeStatePatch(patchPayload));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CreateSessionOpts {
	sessionName: string;
	variant: GameVariant;
	hostPlayerName: string;
	hostCivId: string;
}

export const hostNet = {
	/**
	 * Create a new game session as host.
	 * Returns the room code on success.
	 */
	async createSession(opts: CreateSessionOpts): Promise<string> {
		const { sessionName, variant, hostPlayerName, hostCivId } = opts;

		// Generate room code, retry on collision
		let roomCode = generateRoomCode();
		let attempts = 0;
		while (attempts < 5) {
			try {
				await peerNet.openAsPeer(roomCodeToPeerId(roomCode));
				break;
			} catch (err: unknown) {
				const e = err as { type?: string };
				if (e?.type === 'unavailable-id') {
					roomCode = generateRoomCode();
					attempts++;
				} else {
					throw err;
				}
			}
		}

		const hostPlayerId = generateId();
		const civDef = CIVILISATIONS.find((c) => c.id === hostCivId) ?? CIVILISATIONS[0];
		const defaultHand = Object.fromEntries(COMMODITY_TYPES.map((t) => [t, 0])) as Record<
			(typeof COMMODITY_TYPES)[number],
			number
		>;

		const hostPlayer: Player = {
			playerId: hostPlayerId,
			playerName: hostPlayerName,
			civilisationId: civDef.id,
			civilisationName: civDef.name,
			astRanking: civDef.astRanking,
			colorHex: civDef.colorHex,
			isHost: true,
			peerJsId: roomCodeToPeerId(roomCode),
			...createDefaultTokenPool(),
			citiesOnBoard: 0,
			citiesInStock: 9,
			shipsOnBoard: 0,
			shipsInStock: 4,
			commodityHand: defaultHand,
			ownedCardIds: [],
			astPosition: 1,
			victoryPoints: 0,
			connectionStatus: 'connected'
		};

		const session: GameSession = {
			sessionId: generateId(),
			sessionName,
			variant,
			status: 'lobby',
			hostPeerId: roomCodeToPeerId(roomCode),
			hostPlayerId,
			players: [hostPlayer],
			currentPhase: 1,
			currentTurn: 1,
			actionLog: [],
			createdAt: Date.now()
		};

		gameStore.setSession(session);
		gameStore.setMyPlayerId(hostPlayerId);
		sessionMetaStore.setRole('host');
		sessionMetaStore.setRoomCode(roomCode);

		// Register networking handlers
		peerNet.onConnection(handleIncomingConnection);
		peerNet.onMessage(handleMessage);
		peerNet.onDisconnect(handleDisconnect);

		return roomCode;
	},

	/**
	 * Start the game — transitions lobby → active and broadcasts to all clients.
	 */
	startGame(): void {
		const session = gameStore.session;
		if (!session || session.status !== 'lobby') return;

		gameStore.setSessionStatus('active');
		peerNet.broadcast(makeSnapshot());
	},

	/**
	 * Process an action initiated by the host player themselves (bypasses network send).
	 */
	handleLocalAction(actionType: string, payload: unknown): void {
		const msg = {
			type: 'ACTION' as const,
			playerId: gameStore.myPlayerId ?? 'host',
			timestamp: Date.now(),
			sequenceId: nextSeq(),
			payload: { actionType, ...(payload as object) }
		};
		handleMessage(
			// Fake conn for host's own actions — never used for sending
			{ peer: '__host__' } as unknown as DataConnection,
			msg
		);
	},

	/**
	 * Apply a host-initiated token transfer locally and broadcast to all clients.
	 * Used when the host player moves their own tokens.
	 */
	applyHostTransfer(transfers: TokenTransfer[]): string | null {
		const playerId = gameStore.myPlayerId;
		if (!playerId) return 'Not in a session.';

		const session = gameStore.session;
		if (!session) return 'No active session.';

		const player = session.players.find((p) => p.playerId === playerId);
		if (!player) return 'Player not found.';

		const result = applyTransfers(player, transfers);
		if (!result.ok) return result.error;

		const previousValue = {
			populationOnBoard: player.populationOnBoard,
			populationInStock: player.populationInStock,
			inTreasury: player.inTreasury
		};

		gameStore.applyPlayerTransfers(playerId, transfers);
		const updated = session.players.find((p) => p.playerId === playerId)!;

		const actionEntry = buildActionEntry({
			actionType: 'TOKEN_TRANSFER',
			description: `${player.playerName} moved tokens.`,
			initiatedBy: playerId,
			affectedPlayerId: playerId,
			previousValue,
			newValue: {
				populationOnBoard: updated.populationOnBoard,
				populationInStock: updated.populationInStock,
				inTreasury: updated.inTreasury
			}
		});
		gameStore.appendActionEntry(actionEntry);

		const patchPayload: StatePatchPayload = {
			affectedPlayerId: playerId,
			patch: {
				populationOnBoard: updated.populationOnBoard,
				populationInStock: updated.populationInStock,
				inTreasury: updated.inTreasury
			},
			actionEntry
		};
		peerNet.broadcast(makeStatePatch(patchPayload));
		return null;
	},

	/**
	 * Apply a card purchase initiated by the host player themselves.
	 * Same validation as handleCardPurchase but uses the host's own playerId.
	 */
	applyHostCardPurchase(cardId: string): string | null {
		const playerId = gameStore.myPlayerId;
		if (!playerId) return 'Not in a session.';

		const session = gameStore.session;
		if (!session) return 'No active session.';
		if (session.status !== 'active') return 'Session is not active.';
		if (session.currentPhase !== 12) return 'Card purchases are only allowed during Phase 12.';

		const player = session.players.find((p) => p.playerId === playerId);
		if (!player) return 'Player not found.';

		const card = CARD_MAP.get(cardId);
		if (!card) return `Unknown card: ${cardId}`;

		if (player.ownedCardIds.includes(cardId)) return `You already own ${card.name}.`;

		const ownedCards = player.ownedCardIds
			.map((id) => CARD_MAP.get(id))
			.filter((c): c is NonNullable<typeof c> => c !== undefined);
		const trueNetCost = calcNetCardCost(card, ownedCards);

		if (player.inTreasury < trueNetCost)
			return `Insufficient treasury for ${card.name}: need ${trueNetCost}, have ${player.inTreasury}.`;

		const previousTreasury = player.inTreasury;
		const previousOwnedCardIds = [...player.ownedCardIds];

		if (trueNetCost > 0) {
			gameStore.applyPlayerTransfers(playerId, [
				{ from: 'inTreasury', to: 'populationInStock', amount: trueNetCost }
			]);
		}

		gameStore.updatePlayerFields(playerId, {
			ownedCardIds: [...player.ownedCardIds, cardId]
		});

		const updatedPlayer = session.players.find((p) => p.playerId === playerId)!;

		const actionEntry = buildActionEntry({
			actionType: 'PURCHASE_CARD',
			description: `${player.playerName} purchased ${card.name} for ${trueNetCost} treasury.`,
			initiatedBy: playerId,
			affectedPlayerId: playerId,
			previousValue: { inTreasury: previousTreasury, ownedCardIds: previousOwnedCardIds },
			newValue: { inTreasury: updatedPlayer.inTreasury, ownedCardIds: updatedPlayer.ownedCardIds }
		});
		gameStore.appendActionEntry(actionEntry);

		const patchPayload: StatePatchPayload = {
			affectedPlayerId: playerId,
			patch: {
				inTreasury: updatedPlayer.inTreasury,
				populationInStock: updatedPlayer.populationInStock,
				ownedCardIds: [...updatedPlayer.ownedCardIds]
			},
			actionEntry
		};
		peerNet.broadcast(makeStatePatch(patchPayload));
		return null;
	},

	/**
	 * Apply a host-initiated field update (non-token fields) locally and broadcast.
	 */
	applyHostFieldUpdate(patch: Parameters<typeof handlePlayerFieldUpdate>[1]['patch'], description: string): string | null {
		const playerId = gameStore.myPlayerId;
		if (!playerId) return 'Not in a session.';

		const session = gameStore.session;
		if (!session) return 'No active session.';

		const player = session.players.find((p) => p.playerId === playerId);
		if (!player) return 'Player not found.';

		const previousValue = { ...player };
		gameStore.updatePlayerFields(playerId, patch);

		const actionEntry = buildActionEntry({
			actionType: 'PLAYER_FIELD_UPDATE',
			description,
			initiatedBy: playerId,
			affectedPlayerId: playerId,
			previousValue,
			newValue: patch
		});
		gameStore.appendActionEntry(actionEntry);

		const patchPayload: StatePatchPayload = {
			affectedPlayerId: playerId,
			patch,
			actionEntry
		};
		peerNet.broadcast(makeStatePatch(patchPayload));
		return null;
	},

	/**
	 * Advance to next phase and broadcast to all clients.
	 */
	advancePhase(): void {
		const session = gameStore.session;
		if (!session) return;
		const prev = session.currentPhase;
		gameStore.advancePhase();
		const next = session.currentPhase;
		peerNet.broadcast(makePhaseChange(prev, next, session.currentTurn));
	},

	/**
	 * Rewind to previous phase and broadcast to all clients.
	 */
	rewindPhase(): void {
		const session = gameStore.session;
		if (!session) return;
		const prev = session.currentPhase;
		gameStore.rewindPhase();
		const next = session.currentPhase;
		peerNet.broadcast(makePhaseChange(prev, next, session.currentTurn));
	},

	/**
	 * Remove a player from the session (host only).
	 */
	removePlayer(playerId: string): void {
		const session = gameStore.session;
		if (!session) return;

		const player = session.players.find((p) => p.playerId === playerId);
		if (!player) return;

		// Close their connection
		const peerId = _playerToPeer.get(playerId);
		if (peerId) {
			peerNet.sendTo(peerId, makeBroadcast('You have been removed from the session.'));
		}

		gameStore.removePlayer(playerId);
		_playerToPeer.delete(playerId);
		if (peerId) _peerToPlayer.delete(peerId);

		// Broadcast snapshot so everyone sees the updated player list
		peerNet.broadcast(makeSnapshot());
	},

	/** Clean up all host state. */
	destroy(): void {
		_peerToPlayer = new Map();
		_playerToPeer = new Map();
		peerNet.destroy();
	}
};

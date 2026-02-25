import type { GameSession, Player, ActionEntry } from './game.js';

// ─── Message Types ────────────────────────────────────────────────────────────

export type MessageType =
	| 'ACTION'
	| 'STATE_PATCH'
	| 'STATE_SNAPSHOT'
	| 'BROADCAST'
	| 'PHASE_CHANGE';

export interface Message {
	type: MessageType;
	playerId: string;
	timestamp: number;
	/** Monotonically increasing — used for ordering and deduplication */
	sequenceId: number;
	payload: unknown;
}

// ─── Typed Payloads ───────────────────────────────────────────────────────────

export interface StatePatchPayload {
	affectedPlayerId: string;
	patch: Partial<Player>;
	actionEntry: ActionEntry;
}

export interface StateSnapshotPayload {
	session: GameSession;
}

export interface PhaseChangePayload {
	previousPhase: number;
	newPhase: number;
	turn: number;
}

export interface BroadcastPayload {
	message: string;
}

// ─── Action Payload Types ─────────────────────────────────────────────────────

export interface JoinRequestPayload {
	/** Client-generated UUID for this player */
	playerId: string;
	playerName: string;
	civId: string;
}

export interface ReconnectPayload {
	playerId: string;
	sessionId: string;
}

export interface TokenTransferActionPayload {
	transfers: Array<{ from: string; to: string; amount: number }>;
}

export interface PlayerFieldUpdatePayload {
	patch: Partial<
		Pick<
			Player,
			| 'citiesOnBoard'
			| 'citiesInStock'
			| 'shipsOnBoard'
			| 'shipsInStock'
			| 'commodityHand'
			| 'ownedCardIds'
			| 'astPosition'
		>
	>;
	description: string;
}

export interface CardPurchasePayload {
	cardId: string;
	/** Client-calculated net cost — host re-validates independently */
	netCost: number;
}

// ─── Typed Messages ───────────────────────────────────────────────────────────

export type ActionMessage = Message & { type: 'ACTION'; payload: unknown };
export type StatePatchMessage = Message & { type: 'STATE_PATCH'; payload: StatePatchPayload };
export type StateSnapshotMessage = Message & {
	type: 'STATE_SNAPSHOT';
	payload: StateSnapshotPayload;
};
export type BroadcastMessage = Message & { type: 'BROADCAST'; payload: BroadcastPayload };
export type PhaseChangeMessage = Message & { type: 'PHASE_CHANGE'; payload: PhaseChangePayload };

export type TypedMessage =
	| ActionMessage
	| StatePatchMessage
	| StateSnapshotMessage
	| BroadcastMessage
	| PhaseChangeMessage;

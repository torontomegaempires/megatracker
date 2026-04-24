import type { GameSession, Player, ActionEntry, ConnectionStatus } from '../types/game.js';
import { applyTransfer, applyTransfers, isTokenPoolValid } from '../utils/token-pool.js';
import type { TokenTransfer } from '../types/game.js';
import type { StatePatchPayload } from '../types/messages.js';
import { saveSession, loadSession, loadSessionMeta, clearSessionMeta } from './persistence.js';

// ─── State ────────────────────────────────────────────────────────────────────

let session = $state<GameSession | null>(null);
let myPlayerId = $state<string | null>(null);

// ─── Derived ──────────────────────────────────────────────────────────────────

const myPlayer = $derived(
	session && myPlayerId ? (session.players.find((p) => p.playerId === myPlayerId) ?? null) : null
);

const currentPhase = $derived(session?.currentPhase ?? 0);
const currentTurn = $derived(session?.currentTurn ?? 0);
const isHost = $derived(myPlayer?.isHost ?? false);
const isActive = $derived(session?.status === 'active');

// ─── Persistence ─────────────────────────────────────────────────────────────

/** Fire-and-forget save. Only persists when the local player is the host. */
function persistIfHost() {
	if (!session || !myPlayerId) return;
	const player = session.players.find((p) => p.playerId === myPlayerId);
	if (player?.isHost) {
		saveSession(session).catch(() => {});
	}
}

// ─── Mutations ────────────────────────────────────────────────────────────────

function setSession(s: GameSession) {
	session = s;
	persistIfHost();
}

function clearSession() {
	session = null;
	myPlayerId = null;
	clearSessionMeta();
}

function setMyPlayerId(id: string) {
	myPlayerId = id;
	persistIfHost(); // now that isHost is derivable, do initial save
}

async function restoreFromStorage(): Promise<boolean> {
	const meta = loadSessionMeta();
	if (!meta) return false;
	const s = await loadSession(meta.sessionId);
	if (!s) return false;
	session = s;
	myPlayerId = meta.myPlayerId;
	return true;
}

/**
 * Apply a token bucket transfer to a specific player.
 * Validates the 55-token invariant before committing.
 * Returns an error string if the transfer is invalid.
 */
function applyPlayerTransfer(playerId: string, transfer: TokenTransfer): string | null {
	if (!session) return 'No active session.';

	const idx = session.players.findIndex((p) => p.playerId === playerId);
	if (idx === -1) return `Player ${playerId} not found.`;

	const player = session.players[idx];
	const result = applyTransfer(player, transfer);
	if (!result.ok) return result.error;

	// Patch the player in-place (Svelte 5 fine-grained reactivity)
	session.players[idx] = { ...player, ...result.player };
	persistIfHost();
	return null;
}

/**
 * Apply multiple token bucket transfers to a specific player atomically.
 */
function applyPlayerTransfers(playerId: string, transfers: TokenTransfer[]): string | null {
	if (!session) return 'No active session.';

	const idx = session.players.findIndex((p) => p.playerId === playerId);
	if (idx === -1) return `Player ${playerId} not found.`;

	const player = session.players[idx];
	const result = applyTransfers(player, transfers);
	if (!result.ok) return result.error;

	session.players[idx] = { ...player, ...result.player };
	persistIfHost();
	return null;
}

/**
 * Update non-token-pool player fields (cities, ships, commodities, AST position).
 * Does NOT validate the 55-token invariant — these fields are outside the pool.
 * Returns an error string if the player is not found.
 */
function updatePlayerFields(playerId: string, patch: Partial<Player>): string | null {
	if (!session) return 'No active session.';
	const idx = session.players.findIndex((p) => p.playerId === playerId);
	if (idx === -1) return `Player ${playerId} not found.`;
	session.players[idx] = { ...session.players[idx], ...patch };
	persistIfHost();
	return null;
}

/**
 * Append an entry to the action log (append-only, never edits existing entries).
 */
function appendActionEntry(entry: ActionEntry) {
	if (!session) return;
	session.actionLog = [...session.actionLog, entry];
	persistIfHost();
}

/**
 * Update a player's data directly (Host Fix Game State only).
 * Still validates the 55-token invariant — blocks if violated.
 */
function hostSetPlayerState(playerId: string, patch: Partial<Player>): string | null {
	if (!session) return 'No active session.';
	if (!isHost) return 'Only the host can use Fix Game State.';

	const idx = session.players.findIndex((p) => p.playerId === playerId);
	if (idx === -1) return `Player ${playerId} not found.`;

	const updated = { ...session.players[idx], ...patch };
	if (!isTokenPoolValid(updated)) {
		const total = updated.populationOnBoard + updated.populationInStock + updated.inTreasury;
		return `Token pool invariant violated: total is ${total}, must be 55.`;
	}

	session.players[idx] = updated;
	persistIfHost();
	return null;
}

/**
 * Apply a STATE_PATCH received from the host.
 * Updates the affected player's state and appends the action entry.
 */
function applyStatePatch(patch: StatePatchPayload): void {
	if (!session) return;
	const idx = session.players.findIndex((p) => p.playerId === patch.affectedPlayerId);
	if (idx !== -1) {
		session.players[idx] = { ...session.players[idx], ...patch.patch };
	}
	session.actionLog = [...session.actionLog, patch.actionEntry];
	persistIfHost();
}

/**
 * Add a player to the session (e.g. when a client joins in the lobby).
 */
function addPlayer(player: Player): void {
	if (!session) return;
	session.players = [...session.players, player];
	persistIfHost();
}

/**
 * Remove a player from the session (host only).
 */
function removePlayer(playerId: string): void {
	if (!session) return;
	session.players = session.players.filter((p) => p.playerId !== playerId);
	persistIfHost();
}

/**
 * Update a player's connection status (used on disconnect/reconnect events).
 */
function setPlayerConnectionStatus(playerId: string, status: ConnectionStatus): void {
	if (!session) return;
	const idx = session.players.findIndex((p) => p.playerId === playerId);
	if (idx !== -1) {
		session.players[idx] = { ...session.players[idx], connectionStatus: status };
	}
	persistIfHost();
}

/**
 * Update the session status (e.g. 'lobby' → 'active').
 */
function setSessionStatus(status: GameSession['status']): void {
	if (!session) return;
	session.status = status;
	persistIfHost();
}

function advancePhase() {
	if (!session || !isHost) return;
	if (session.currentPhase < 12) {
		session.currentPhase += 1;
	} else {
		session.currentPhase = 1;
		session.currentTurn += 1;
	}
	persistIfHost();
}

function rewindPhase() {
	if (!session || !isHost) return;
	if (session.currentPhase > 1) {
		session.currentPhase -= 1;
	}
	persistIfHost();
}

// ─── Exported Store Interface ─────────────────────────────────────────────────

export const gameStore = {
	// State accessors (reactive via $state)
	get session() {
		return session;
	},
	get myPlayerId() {
		return myPlayerId;
	},
	get myPlayer() {
		return myPlayer;
	},
	get currentPhase() {
		return currentPhase;
	},
	get currentTurn() {
		return currentTurn;
	},
	get isHost() {
		return isHost;
	},
	get isActive() {
		return isActive;
	},

	// Mutations
	setSession,
	clearSession,
	setMyPlayerId,
	restoreFromStorage,
	applyPlayerTransfer,
	applyPlayerTransfers,
	updatePlayerFields,
	appendActionEntry,
	hostSetPlayerState,
	advancePhase,
	rewindPhase,
	// Phase 2 additions
	applyStatePatch,
	addPlayer,
	removePlayer,
	setPlayerConnectionStatus,
	setSessionStatus
};

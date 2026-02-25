import type { DataConnection } from 'peerjs';
import { peerNet } from './peer.svelte.js';
import { nextSeq, setSeq } from './sequence.js';
import { gameStore } from '../stores/game.svelte.js';
import { sessionMetaStore } from '../stores/session-meta.svelte.js';
import { toastStore } from '../stores/toast.svelte.js';
import { roomCodeToPeerId, playerPeerId, isValidRoomCode } from '../utils/room-code.js';
import { generateId } from '../utils/uuid.js';
import type { TypedMessage, StatePatchPayload, PhaseChangePayload } from '../types/messages.js';
import type { Player, TokenTransfer } from '../types/game.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _myPlayerId: string | null = null;
let _hostConn: DataConnection | null = null;

// Callback invoked when the client has received a snapshot and is ready to navigate
let _onReadyToNavigate: ((destination: string) => void) | null = null;

// Auto-reconnect state
const RECONNECT_DELAYS = [2000, 4000, 8000, 16000, 30000];
let _reconnectAttempts = 0;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Message handling ─────────────────────────────────────────────────────────

function handleMessage(_conn: DataConnection, msg: TypedMessage): void {
	switch (msg.type) {
		case 'STATE_SNAPSHOT': {
			const payload = msg.payload as { session: typeof gameStore.session };
			if (!payload?.session) return;
			setSeq(msg.sequenceId);
			gameStore.setSession(payload.session);
			if (_myPlayerId) gameStore.setMyPlayerId(_myPlayerId);
			// Navigate to lobby if session is in lobby, or dashboard if active
			const dest = payload.session.status === 'active' ? '/dashboard' : '/lobby';
			_onReadyToNavigate?.(dest);
			break;
		}

		case 'STATE_PATCH': {
			const patch = msg.payload as StatePatchPayload;
			gameStore.applyStatePatch(patch);
			break;
		}

		case 'PHASE_CHANGE': {
			const pc = msg.payload as PhaseChangePayload;
			const session = gameStore.session;
			if (!session) return;
			session.currentPhase = pc.newPhase;
			session.currentTurn = pc.turn;
			// If the session just became active (game started), navigate to dashboard
			if (session.status === 'active') {
				_onReadyToNavigate?.('/dashboard');
			}
			break;
		}

		case 'BROADCAST': {
			const { message } = msg.payload as { message: string };
			toastStore.add(message, 'info');
			break;
		}
	}
}

function handleDisconnect(_peerId: string): void {
	if (sessionMetaStore.role !== 'client') return;
	sessionMetaStore.setStatus('disconnected');
	scheduleReconnect();
}

function scheduleReconnect(): void {
	if (_reconnectAttempts >= RECONNECT_DELAYS.length) {
		sessionMetaStore.setStatus('error');
		toastStore.add('Could not reconnect. Please rejoin manually.', 'error');
		return;
	}
	const delay = RECONNECT_DELAYS[_reconnectAttempts++];
	_reconnectTimer = setTimeout(async () => {
		try {
			await clientNet.reconnect();
			_reconnectAttempts = 0;
			toastStore.add('Reconnected to session.', 'success');
		} catch {
			scheduleReconnect();
		}
	}, delay);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const clientNet = {
	/**
	 * Called by the UI to react to navigation events from the network layer
	 * (e.g. snapshot received → go to lobby).
	 */
	onReadyToNavigate(fn: (destination: string) => void) {
		_onReadyToNavigate = fn;
	},

	/**
	 * Join a session by room code.
	 * Resolves when the connection to the host is open and the JOIN_REQUEST sent.
	 * The UI should await this, then wait for `onReadyToNavigate` to fire.
	 */
	async joinSession(opts: {
		roomCode: string;
		playerName: string;
		civId: string;
	}): Promise<void> {
		const { roomCode, playerName, civId } = opts;

		if (!isValidRoomCode(roomCode)) {
			throw new Error(`Invalid room code: ${roomCode}`);
		}

		_myPlayerId = generateId();
		const myPeerJsId = playerPeerId(roomCode, _myPlayerId);

		await peerNet.openAsPeer(myPeerJsId);

		sessionMetaStore.setRole('client');
		sessionMetaStore.setRoomCode(roomCode);
		sessionMetaStore.setHostPeerId(roomCodeToPeerId(roomCode));

		// Connect to host
		_hostConn = await peerNet.connect(roomCodeToPeerId(roomCode));

		// Register message handler
		peerNet.onMessage(handleMessage);
		peerNet.onDisconnect(handleDisconnect);

		// Send join request
		peerNet.send(_hostConn, {
			type: 'ACTION',
			playerId: _myPlayerId,
			timestamp: Date.now(),
			sequenceId: nextSeq(),
			payload: {
				actionType: 'JOIN_REQUEST',
				playerId: _myPlayerId,
				playerName,
				civId
			}
		});
	},

	/**
	 * Send a game action to the host.
	 * The host validates, applies, and broadcasts the result back as STATE_PATCH.
	 */
	sendAction(actionType: string, payload: Record<string, unknown> = {}): void {
		if (!_hostConn?.open || !_myPlayerId) {
			console.warn('[clientNet] Cannot send action — not connected.');
			return;
		}
		peerNet.send(_hostConn, {
			type: 'ACTION',
			playerId: _myPlayerId,
			timestamp: Date.now(),
			sequenceId: nextSeq(),
			payload: { actionType, ...payload }
		});
	},

	/**
	 * Send a token transfer action to the host.
	 */
	sendTokenTransfer(transfers: TokenTransfer[]): void {
		this.sendAction('TOKEN_TRANSFER', { transfers });
	},

	/**
	 * Send a player field update (non-token fields) to the host for validation.
	 */
	sendPlayerFieldUpdate(patch: Partial<Player>, description: string): void {
		this.sendAction('PLAYER_FIELD_UPDATE', { patch, description });
	},

	/**
	 * Send a civilisation change to the host (lobby only).
	 */
	sendSetCiv(civId: string): void {
		this.sendAction('SET_CIV', { civId });
	},

	/**
	 * Attempt to reconnect to the host after a disconnect.
	 */
	async reconnect(): Promise<void> {
		const roomCode = sessionMetaStore.roomCode;
		if (!roomCode || !_myPlayerId) return;

		try {
			const myPeerJsId = playerPeerId(roomCode, _myPlayerId);
			await peerNet.openAsPeer(myPeerJsId);
			_hostConn = await peerNet.connect(roomCodeToPeerId(roomCode));

			// Re-send join to get fresh snapshot
			peerNet.send(_hostConn, {
				type: 'ACTION',
				playerId: _myPlayerId,
				timestamp: Date.now(),
				sequenceId: nextSeq(),
				payload: {
					actionType: 'RECONNECT',
					playerId: _myPlayerId,
					sessionId: gameStore.session?.sessionId ?? ''
				}
			});
		} catch (err) {
			console.error('[clientNet] Reconnect failed:', err);
		}
	},

	/** Clean up client state. */
	destroy(): void {
		_myPlayerId = null;
		_hostConn = null;
		_onReadyToNavigate = null;
		_reconnectAttempts = 0;
		if (_reconnectTimer !== null) {
			clearTimeout(_reconnectTimer);
			_reconnectTimer = null;
		}
		peerNet.destroy();
	}
};

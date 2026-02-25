import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { parseMessage } from './message-handler.js';
import { sessionMetaStore } from '../stores/session-meta.svelte.js';
import type { TypedMessage } from '../types/messages.js';

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageHandler = (conn: DataConnection, msg: TypedMessage) => void;
type ConnectionHandler = (conn: DataConnection) => void;
type DisconnectHandler = (peerId: string) => void;

// ─── State ────────────────────────────────────────────────────────────────────

let _peer: Peer | null = null;
let _connections = $state(new Map<string, DataConnection>());
let _reconnectAttempts = 0;
const MAX_RECONNECT = 3;

// Event handlers (set by host/client modules)
let _onMessage: MessageHandler | null = null;
let _onConnection: ConnectionHandler | null = null;
let _onDisconnect: DisconnectHandler | null = null;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function wireConnection(conn: DataConnection): void {
	conn.on('open', () => {
		_connections = new Map(_connections.set(conn.peer, conn));
		_onConnection?.(conn);
	});

	conn.on('data', (raw) => {
		const result = parseMessage(raw);
		if (!result.ok) {
			console.warn('[peerNet] Bad message:', result.error, raw);
			return;
		}
		_onMessage?.(conn, result.message);
	});

	conn.on('close', () => {
		const peerId = conn.peer;
		_connections.delete(peerId);
		_connections = new Map(_connections);
		_onDisconnect?.(peerId);
	});

	conn.on('error', (err) => {
		console.error('[peerNet] Connection error:', err);
	});
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const peerNet = {
	get connections(): Map<string, DataConnection> {
		return _connections;
	},

	/** Register the handler called when a new inbound connection is fully open. */
	onConnection(fn: ConnectionHandler) {
		_onConnection = fn;
	},

	/** Register the handler called when any message is received. */
	onMessage(fn: MessageHandler) {
		_onMessage = fn;
	},

	/** Register the handler called when a connection closes. */
	onDisconnect(fn: DisconnectHandler) {
		_onDisconnect = fn;
	},

	/**
	 * Create (or re-open) a PeerJS Peer with the given peer ID.
	 * Returns a promise that resolves when the peer is open, or rejects on error.
	 */
	openAsPeer(peerId: string): Promise<string> {
		return new Promise((resolve, reject) => {
			sessionMetaStore.setStatus('connecting');
			sessionMetaStore.setError(null);

			const p = new Peer(peerId, {
				host: '0.peerjs.com',
				port: 443,
				secure: true,
				path: '/',
				config: {
					iceServers: [
						{ urls: 'stun:stun.l.google.com:19302' },
						{ urls: 'stun:global.stun.twilio.com:3478' }
					]
				}
			});

			p.on('open', (id) => {
				_peer = p;
				_reconnectAttempts = 0;
				sessionMetaStore.setStatus('open');
				sessionMetaStore.setMyPeerId(id);
				resolve(id);
			});

			p.on('connection', (conn) => {
				wireConnection(conn);
			});

			p.on('disconnected', () => {
				sessionMetaStore.setStatus('disconnected');
				if (_reconnectAttempts < MAX_RECONNECT) {
					_reconnectAttempts++;
					p.reconnect();
				}
			});

			p.on('error', (err) => {
				sessionMetaStore.setStatus('error');
				sessionMetaStore.setError(err.message);
				// 'unavailable-id' means room code collision — caller should retry
				reject(err);
			});
		});
	},

	/**
	 * Connect to a remote peer (client → host).
	 * Returns a promise that resolves with the open DataConnection.
	 */
	connect(remotePeerId: string): Promise<DataConnection> {
		return new Promise((resolve, reject) => {
			if (!_peer) {
				reject(new Error('Peer not initialised.'));
				return;
			}

			const conn = _peer.connect(remotePeerId, { reliable: true });

			conn.on('open', () => {
				_connections = new Map(_connections.set(conn.peer, conn));
				conn.on('data', (raw) => {
					const result = parseMessage(raw);
					if (!result.ok) {
						console.warn('[peerNet] Bad message:', result.error);
						return;
					}
					_onMessage?.(conn, result.message);
				});
				conn.on('close', () => {
					const peerId = conn.peer;
					_connections.delete(peerId);
					_connections = new Map(_connections);
					_onDisconnect?.(peerId);
				});
				conn.on('error', (err) => console.error('[peerNet] Connection error:', err));
				resolve(conn);
			});

			conn.on('error', (err) => reject(err));

			// Timeout if connection takes too long
			setTimeout(() => reject(new Error('Connection timeout.')), 15000);
		});
	},

	/** Send a typed message on a specific connection. */
	send(conn: DataConnection, msg: TypedMessage): void {
		if (conn.open) {
			conn.send(msg);
		} else {
			console.warn('[peerNet] Tried to send on closed connection.');
		}
	},

	/** Broadcast a message to all open connections. */
	broadcast(msg: TypedMessage): void {
		for (const conn of _connections.values()) {
			if (conn.open) conn.send(msg);
		}
	},

	/** Send a message to one specific peer by their PeerJS ID. */
	sendTo(peerId: string, msg: TypedMessage): void {
		const conn = _connections.get(peerId);
		if (conn?.open) conn.send(msg);
	},

	/** Tear down the peer and all connections. */
	destroy(): void {
		_peer?.destroy();
		_peer = null;
		_connections = new Map();
		_onMessage = null;
		_onConnection = null;
		_onDisconnect = null;
		_reconnectAttempts = 0;
		sessionMetaStore.reset();
	}
};

import type { ConnectionMeta, SessionRole, PeerStatus } from '../types/net.js';

let meta = $state<ConnectionMeta>({
	role: 'none',
	roomCode: null,
	myPeerId: null,
	hostPeerId: null,
	status: 'idle',
	error: null
});

export const sessionMetaStore = {
	get role(): SessionRole {
		return meta.role;
	},
	get roomCode(): string | null {
		return meta.roomCode;
	},
	get myPeerId(): string | null {
		return meta.myPeerId;
	},
	get hostPeerId(): string | null {
		return meta.hostPeerId;
	},
	get status(): PeerStatus {
		return meta.status;
	},
	get error(): string | null {
		return meta.error;
	},
	get isConnected(): boolean {
		return meta.status === 'open';
	},

	setRole(r: SessionRole) {
		meta.role = r;
	},
	setRoomCode(c: string | null) {
		meta.roomCode = c;
	},
	setMyPeerId(id: string | null) {
		meta.myPeerId = id;
	},
	setHostPeerId(id: string | null) {
		meta.hostPeerId = id;
	},
	setStatus(s: PeerStatus) {
		meta.status = s;
	},
	setError(e: string | null) {
		meta.error = e;
	},
	reset() {
		meta = {
			role: 'none',
			roomCode: null,
			myPeerId: null,
			hostPeerId: null,
			status: 'idle',
			error: null
		};
	}
};

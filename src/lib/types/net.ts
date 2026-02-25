export type PeerStatus = 'idle' | 'connecting' | 'open' | 'error' | 'disconnected';

export type SessionRole = 'host' | 'client' | 'none';

export interface ConnectionMeta {
	role: SessionRole;
	roomCode: string | null;
	myPeerId: string | null;
	hostPeerId: string | null;
	status: PeerStatus;
	error: string | null;
}

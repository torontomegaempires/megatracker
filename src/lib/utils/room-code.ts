// 32-character alphabet — no ambiguous chars (0, 1, O, I)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

export function generateRoomCode(): string {
	return Array.from(
		{ length: CODE_LENGTH },
		() => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
	).join('');
}

export function isValidRoomCode(code: string): boolean {
	if (code.length !== CODE_LENGTH) return false;
	return [...code].every((c) => ALPHABET.includes(c));
}

export function normalizeRoomCode(raw: string): string {
	return raw.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, CODE_LENGTH);
}

/** PeerJS peer ID for the host. e.g. 'AB3K' → 'megatrkr-ab3k' */
export function roomCodeToPeerId(roomCode: string): string {
	return `megatrkr-${roomCode.toLowerCase()}`;
}

/** PeerJS peer ID for a client player. Unique per session+player. */
export function playerPeerId(roomCode: string, playerId: string): string {
	return `megatrkr-${roomCode.toLowerCase()}-${playerId.slice(0, 8)}`;
}

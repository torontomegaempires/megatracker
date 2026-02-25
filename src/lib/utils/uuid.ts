/**
 * Generates a UUID v4.
 * Falls back to a Math.random-based implementation when `crypto.randomUUID`
 * is unavailable (e.g. HTTP on a LAN IP — non-secure context).
 */
export function generateId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	// RFC 4122 v4 fallback
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

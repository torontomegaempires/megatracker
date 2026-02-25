import type { TypedMessage } from '../types/messages.js';

export type ParseResult =
	| { ok: true; message: TypedMessage }
	| { ok: false; error: string };

const VALID_TYPES = new Set([
	'ACTION',
	'STATE_PATCH',
	'STATE_SNAPSHOT',
	'BROADCAST',
	'PHASE_CHANGE'
]);

export function parseMessage(raw: unknown): ParseResult {
	if (typeof raw !== 'object' || raw === null) {
		return { ok: false, error: 'Message is not an object.' };
	}

	const m = raw as Record<string, unknown>;

	if (!VALID_TYPES.has(m.type as string)) {
		return { ok: false, error: `Unknown message type: ${m.type}` };
	}
	if (typeof m.playerId !== 'string') {
		return { ok: false, error: 'Missing or invalid playerId.' };
	}
	if (typeof m.timestamp !== 'number') {
		return { ok: false, error: 'Missing or invalid timestamp.' };
	}
	if (typeof m.sequenceId !== 'number') {
		return { ok: false, error: 'Missing or invalid sequenceId.' };
	}
	if (!('payload' in m)) {
		return { ok: false, error: 'Missing payload.' };
	}

	return { ok: true, message: raw as TypedMessage };
}

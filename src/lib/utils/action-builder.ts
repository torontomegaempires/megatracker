import type { ActionEntry } from '../types/game.js';
import { gameStore } from '../stores/game.svelte.js';
import { generateId } from './uuid.js';

export function buildActionEntry(opts: {
	actionType: string;
	description: string;
	initiatedBy: string; // playerId or 'host'
	affectedPlayerId: string;
	previousValue: unknown;
	newValue: unknown;
}): ActionEntry {
	return {
		entryId: generateId(),
		timestamp: Date.now(),
		phase: gameStore.currentPhase,
		...opts
	};
}

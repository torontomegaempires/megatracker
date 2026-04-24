import { openDB, type IDBPDatabase } from 'idb';
import type { GameSession } from '../types/game.js';

const DB_NAME = 'megatracker';
const DB_VERSION = 1;
const STORE_SESSIONS = 'sessions';

interface MegaTrackerDB {
	sessions: {
		key: string;
		value: GameSession;
		indexes: { byCreatedAt: number };
	};
}

let dbPromise: Promise<IDBPDatabase<MegaTrackerDB>> | null = null;

function getDb(): Promise<IDBPDatabase<MegaTrackerDB>> {
	if (!dbPromise) {
		dbPromise = openDB<MegaTrackerDB>(DB_NAME, DB_VERSION, {
			upgrade(db) {
				const store = db.createObjectStore(STORE_SESSIONS, { keyPath: 'sessionId' });
				store.createIndex('byCreatedAt', 'createdAt');
			}
		});
	}
	return dbPromise;
}

export async function saveSession(session: GameSession): Promise<void> {
	const db = await getDb();
	await db.put(STORE_SESSIONS, session);
}

export async function loadSession(sessionId: string): Promise<GameSession | undefined> {
	const db = await getDb();
	return db.get(STORE_SESSIONS, sessionId);
}

export async function listRecentSessions(limit = 10): Promise<GameSession[]> {
	const db = await getDb();
	// Retrieve all sessions sorted by createdAt descending
	const all = await db.getAllFromIndex(STORE_SESSIONS, 'byCreatedAt');
	return all.reverse().slice(0, limit);
}

export async function deleteSession(sessionId: string): Promise<void> {
	const db = await getDb();
	await db.delete(STORE_SESSIONS, sessionId);
}

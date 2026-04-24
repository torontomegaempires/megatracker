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
	// Unwrap Svelte 5 reactive proxies before passing to IndexedDB's structured clone
	await db.put(STORE_SESSIONS, JSON.parse(JSON.stringify(session)));
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

// ─── Session meta (localStorage) ─────────────────────────────────────────────

const SESSION_META_KEY = 'megatracker:session-meta';

export interface SessionMeta {
	sessionId: string;
	myPlayerId: string;
	role: 'host' | 'client' | 'none';
	roomCode: string | null;
}

export function saveSessionMeta(meta: SessionMeta): void {
	try {
		localStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
	} catch {}
}

export function loadSessionMeta(): SessionMeta | null {
	try {
		const raw = localStorage.getItem(SESSION_META_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function clearSessionMeta(): void {
	try {
		localStorage.removeItem(SESSION_META_KEY);
	} catch {}
}

// The shared-game API: /api/games and everything under it. See server/handler.ts.
import { AblyLive } from '../../server/ablyLive';
import { handle, type Live } from '../../server/handler';
import { NeonStore } from '../../server/neonStore';
import { FileStore } from '../../server/fileStore';
import type { GameStore } from '../../server/store';

let store: GameStore | null = null;
let live: Live | undefined;

function getStore(): GameStore | null {
  if (store) return store;
  const url = process.env.NETLIFY_DATABASE_URL ?? process.env.DATABASE_URL;
  if (url) store = new NeonStore(url);
  else if (process.env.NETLIFY_DEV === 'true') {
    console.warn('No NETLIFY_DATABASE_URL or DATABASE_URL: shared games are kept in .netlify/shared-games.json.');
    store = new FileStore(`${process.cwd()}/.netlify/shared-games.json`);
  }
  return store;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async (req: Request) => {
  const s = getStore();
  if (!live && process.env.ABLY_API_KEY) live = new AblyLive(process.env.ABLY_API_KEY);
  if (!s) return json(503, { error: 'Shared games aren’t set up on this server yet.' });
  const url = new URL(req.url);
  const auth = req.headers.get('authorization') ?? '';
  let body: unknown = null;
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'Expected a JSON body.' });
    }
  }
  try {
    const res = await handle(s, {
      method: req.method,
      path: url.pathname.replace(/^\/api\/games/, ''),
      token: auth.startsWith('Bearer ') ? auth.slice(7) : null,
      body,
    }, live);
    return json(res.status, res.body);
  } catch (e) {
    console.error(e);
    return json(500, { error: 'Something went wrong on the server. Try again.' });
  }
};

export const config = { path: ['/api/games', '/api/games/*'] };

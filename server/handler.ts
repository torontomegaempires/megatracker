import type { BlockId } from '../src/data';
import { BLOCKS } from '../src/data';
import { PLAYER_COUNTS } from '../src/engine/game';
import type { SharedAstMode } from '../src/engine/standings';
import { cleanSnapshot, standings } from '../src/engine/standings';
import type { GameView, SeatGrant } from '../src/shared/api';
import { CODE_ALPHABET, CODE_LENGTH, NAME_MAX, normalizeCode } from '../src/shared/api';
import type { GameRow, GameStore, NewSeat, SeatRow } from './store';

export interface ApiRequest {
  method: string;
  /** The path after /api/games, e.g. "" or "/K7QX/seats/12". */
  path: string;
  /** The bearer token from the Authorization header, if any. */
  token: string | null;
  body: unknown;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

const ok = (body: unknown, status = 200): ApiResponse => ({ status, body });
const fail = (status: number, error: string): ApiResponse => ({ status, body: { error } });

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function text(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().replace(/\s+/g, ' ');
  return t.length > 0 && t.length <= NAME_MAX ? t : null;
}

function view(game: GameRow, seats: SeatRow[]): GameView {
  const updated = new Map(seats.map((s) => [s.id, s]));
  const rows = standings(
    game.block,
    game.astMode,
    seats.map((s) => ({ id: s.id, name: s.name, nation: s.nation, snapshot: s.snapshot })),
  );
  return {
    code: game.code,
    block: game.block,
    playerCount: game.playerCount,
    astMode: game.astMode,
    status: game.status,
    createdAt: game.createdAt,
    endedAt: game.endedAt,
    standings: rows.map((r) => ({
      seatId: r.id,
      name: r.name,
      nation: r.nation,
      host: updated.get(r.id)!.host,
      rank: r.rank,
      score: r.score,
      updatedAt: updated.get(r.id)!.updatedAt,
    })),
  };
}

async function newSeat(block: BlockId, body: Record<string, unknown>): Promise<{ seat: NewSeat; token: string } | ApiResponse> {
  const name = text(body.name);
  const nation = text(body.nation);
  if (!name) return fail(400, `Enter your name (up to ${NAME_MAX} characters).`);
  if (!nation) return fail(400, `Enter your nation (up to ${NAME_MAX} characters).`);
  const token = randomToken();
  return { seat: { name, nation, tokenHash: await hashToken(token), snapshot: cleanSnapshot(block, body.snapshot) }, token };
}

/** The seat a request's token belongs to, in this game. */
async function seatFor(seats: SeatRow[], token: string | null): Promise<SeatRow | null> {
  if (!token) return null;
  const hash = await hashToken(token);
  return seats.find((s) => s.tokenHash === hash) ?? null;
}

export async function handle(store: GameStore, req: ApiRequest): Promise<ApiResponse> {
  const parts = req.path.split('/').filter(Boolean);
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;

  // POST /api/games: create a game and its host's seat.
  if (parts.length === 0) {
    if (req.method !== 'POST') return fail(405, 'Method not allowed.');
    const block = body.block as BlockId;
    if (typeof block !== 'string' || !(block in BLOCKS)) return fail(400, 'Unknown block.');
    if (!PLAYER_COUNTS.some((p) => p.value === body.playerCount)) return fail(400, 'Unknown player count.');
    if (body.astMode !== 'basic' && body.astMode !== 'expert') return fail(400, 'Choose the Basic or Expert A.S.T.');
    const made = await newSeat(block, body);
    if ('status' in made) return made;
    for (let attempt = 0; attempt < 8; attempt++) {
      const created = await store.createGame(
        { code: randomCode(), block, playerCount: body.playerCount as number, astMode: body.astMode as SharedAstMode },
        made.seat,
      );
      if (created) {
        const grant: SeatGrant = { seatId: created.seat.id, token: made.token, game: view(created.game, [created.seat]) };
        return ok(grant, 201);
      }
    }
    return fail(503, 'Could not find a free game code. Try again.');
  }

  const code = normalizeCode(parts[0]);
  const game = await store.findGame(code);
  if (!game) return fail(404, `No game with the code ${code}.`);
  const seats = await store.seats(game.id);

  // GET /api/games/:code
  if (parts.length === 1) {
    if (req.method !== 'GET') return fail(405, 'Method not allowed.');
    return ok(view(game, seats));
  }

  // POST /api/games/:code/end: the host ends the game and the results are kept.
  if (parts.length === 2 && parts[1] === 'end') {
    if (req.method !== 'POST') return fail(405, 'Method not allowed.');
    const me = await seatFor(seats, req.token);
    if (!me?.host) return fail(403, 'Only the host can end the game.');
    if (game.status === 'ended') return ok(view(game, seats));
    const final = view(game, seats);
    await store.endGame(
      game.id,
      final.standings.map((s) => ({ seatId: s.seatId, rank: s.rank, score: s.score })),
    );
    return ok({ ...final, status: 'ended', endedAt: new Date().toISOString() });
  }

  if (parts[1] !== 'seats' || parts.length > 3) return fail(404, 'Not found.');

  // POST /api/games/:code/seats: join.
  if (parts.length === 2) {
    if (req.method !== 'POST') return fail(405, 'Method not allowed.');
    if (game.status === 'ended') return fail(409, 'This game has ended.');
    const made = await newSeat(game.block, body);
    if ('status' in made) return made;
    const seat = await store.addSeat(game.id, made.seat);
    if (!seat) return fail(409, `Someone is already playing ${made.seat.nation} in this game.`);
    const grant: SeatGrant = { seatId: seat.id, token: made.token, game: view(game, [...seats, seat]) };
    return ok(grant, 201);
  }

  // PUT or DELETE /api/games/:code/seats/:id
  const target = seats.find((s) => s.id === parts[2]);
  if (!target) return fail(404, 'That seat is no longer in the game.');
  const me = await seatFor(seats, req.token);

  if (req.method === 'PUT') {
    if (me?.id !== target.id) return fail(403, 'You can only update your own nation.');
    if (game.status === 'ended') return fail(409, 'This game has ended.');
    const snapshot = cleanSnapshot(game.block, body.snapshot);
    await store.updateSnapshot(target.id, snapshot);
    return ok(view(game, seats.map((s) => (s.id === target.id ? { ...s, snapshot, updatedAt: new Date().toISOString() } : s))));
  }

  if (req.method === 'DELETE') {
    // Players can leave; the host can remove anyone else (a duplicate or a mistaken join).
    if (!me || (me.id !== target.id && !me.host)) return fail(403, 'Only the host can remove another nation.');
    if (target.host) return fail(409, 'The host can’t leave. End the game instead.');
    if (game.status === 'ended') return fail(409, 'This game has ended.');
    await store.removeSeat(target.id);
    return ok(view(game, seats.filter((s) => s.id !== target.id)));
  }

  return fail(405, 'Method not allowed.');
}

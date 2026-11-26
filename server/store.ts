import type { BlockId } from '../src/data';
import type { SeatScore, SeatSnapshot, SharedAstMode } from '../src/engine/standings';
import type { GameStatus } from '../src/shared/api';

export interface GameRow {
  id: string;
  code: string;
  block: BlockId;
  playerCount: number;
  astMode: SharedAstMode;
  status: GameStatus;
  createdAt: string;
  endedAt: string | null;
}

export interface SeatRow {
  id: string;
  gameId: string;
  name: string;
  nation: string;
  host: boolean;
  tokenHash: string;
  snapshot: SeatSnapshot;
  updatedAt: string;
}

export type NewGame = Pick<GameRow, 'code' | 'block' | 'playerCount' | 'astMode'>;
export type NewSeat = Pick<SeatRow, 'name' | 'nation' | 'tokenHash' | 'snapshot'>;

/** A seat's final result, stored when the game ends, in the shape the group website records. */
export interface FinalResult {
  seatId: string;
  rank: number;
  score: SeatScore;
}

/** Where shared games live: Neon in production, memory for local development and tests. */
export interface GameStore {
  /** Creates a game with its host's seat, or returns null if the code is already used. */
  createGame(game: NewGame, host: NewSeat): Promise<{ game: GameRow; seat: SeatRow } | null>;
  findGame(code: string): Promise<GameRow | null>;
  seats(gameId: string): Promise<SeatRow[]>;
  /** Adds a seat, or returns null if another seat already plays that nation. */
  addSeat(gameId: string, seat: NewSeat): Promise<SeatRow | null>;
  updateSnapshot(seatId: string, snapshot: SeatSnapshot): Promise<void>;
  removeSeat(seatId: string): Promise<void>;
  /** Marks the game ended and stores each seat's final result. */
  endGame(gameId: string, results: FinalResult[]): Promise<void>;
}

const now = () => new Date().toISOString();

/** Keeps games in memory: for `netlify dev` without a database, and for tests. */
export class MemoryStore implements GameStore {
  protected games = new Map<string, GameRow>();
  protected seatRows = new Map<string, SeatRow>();
  readonly results = new Map<string, FinalResult>();
  protected nextId = 1;

  async createGame(game: NewGame, host: NewSeat) {
    if ([...this.games.values()].some((g) => g.code === game.code)) return null;
    const row: GameRow = { ...game, id: String(this.nextId++), status: 'active', createdAt: now(), endedAt: null };
    this.games.set(row.id, row);
    const seat: SeatRow = { ...host, id: String(this.nextId++), gameId: row.id, host: true, updatedAt: now() };
    this.seatRows.set(seat.id, seat);
    return { game: { ...row }, seat: { ...seat } };
  }

  async findGame(code: string) {
    const g = [...this.games.values()].find((x) => x.code === code);
    return g ? { ...g } : null;
  }

  async seats(gameId: string) {
    return [...this.seatRows.values()].filter((s) => s.gameId === gameId).map((s) => ({ ...s }));
  }

  async addSeat(gameId: string, seat: NewSeat) {
    const taken = [...this.seatRows.values()].some((s) => s.gameId === gameId && s.nation.toLowerCase() === seat.nation.toLowerCase());
    if (taken) return null;
    const row: SeatRow = { ...seat, id: String(this.nextId++), gameId, host: false, updatedAt: now() };
    this.seatRows.set(row.id, row);
    return { ...row };
  }

  async updateSnapshot(seatId: string, snapshot: SeatSnapshot) {
    const s = this.seatRows.get(seatId);
    if (s) Object.assign(s, { snapshot, updatedAt: now() });
  }

  async removeSeat(seatId: string) {
    this.seatRows.delete(seatId);
  }

  async endGame(gameId: string, results: FinalResult[]) {
    const g = this.games.get(gameId);
    if (g) Object.assign(g, { status: 'ended', endedAt: now() });
    for (const r of results) this.results.set(r.seatId, r);
  }
}

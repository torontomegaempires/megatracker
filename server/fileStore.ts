import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SeatSnapshot } from '../src/engine/standings';
import type { FinalResult, GameRow, NewGame, NewSeat, SeatRow } from './store';
import { MemoryStore } from './store';

interface Saved {
  nextId: number;
  games: GameRow[];
  seats: SeatRow[];
  results: FinalResult[];
}

/**
 * For `netlify dev` without a database: games in a JSON file, since each request may load the
 * function afresh. Not for production; it has no locking.
 */
export class FileStore extends MemoryStore {
  constructor(private file: string) {
    super();
  }

  private load() {
    try {
      const d = JSON.parse(readFileSync(this.file, 'utf8')) as Saved;
      this.nextId = d.nextId;
      this.games = new Map(d.games.map((g) => [g.id, g]));
      this.seatRows = new Map(d.seats.map((s) => [s.id, s]));
      this.results.clear();
      for (const r of d.results) this.results.set(r.seatId, r);
    } catch {
      // No file yet: start empty.
    }
  }

  private save() {
    const d: Saved = { nextId: this.nextId, games: [...this.games.values()], seats: [...this.seatRows.values()], results: [...this.results.values()] };
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(d, null, 2));
  }

  private async around<T>(fn: () => Promise<T>, write: boolean): Promise<T> {
    this.load();
    const result = await fn();
    if (write) this.save();
    return result;
  }

  override createGame(game: NewGame, host: NewSeat) {
    return this.around(() => super.createGame(game, host), true);
  }
  override findGame(code: string) {
    return this.around(() => super.findGame(code), false);
  }
  override seats(gameId: string) {
    return this.around(() => super.seats(gameId), false);
  }
  override addSeat(gameId: string, seat: NewSeat) {
    return this.around(() => super.addSeat(gameId, seat), true);
  }
  override updateSnapshot(seatId: string, snapshot: SeatSnapshot) {
    return this.around(() => super.updateSnapshot(seatId, snapshot), true);
  }
  override removeSeat(seatId: string) {
    return this.around(() => super.removeSeat(seatId), true);
  }
  override endGame(gameId: string, results: FinalResult[]) {
    return this.around(() => super.endGame(gameId, results), true);
  }
}

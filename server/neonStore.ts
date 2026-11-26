import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { SeatSnapshot } from '../src/engine/standings';
import { SCHEMA } from './schema';
import type { FinalResult, GameRow, GameStore, NewGame, NewSeat, SeatRow } from './store';

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));

const gameRow = (r: Row): GameRow => ({
  id: String(r.id),
  code: r.code as string,
  block: r.block as GameRow['block'],
  playerCount: Number(r.player_count),
  astMode: r.ast_mode as GameRow['astMode'],
  status: r.status as GameRow['status'],
  createdAt: iso(r.created_at)!,
  endedAt: iso(r.ended_at),
});

const seatRow = (r: Row): SeatRow => ({
  id: String(r.id),
  gameId: String(r.game_id),
  name: r.name as string,
  nation: r.nation as string,
  host: r.host === true,
  tokenHash: r.token_hash as string,
  snapshot: r.snapshot as SeatSnapshot,
  updatedAt: iso(r.updated_at)!,
});

/** Shared games in Neon Postgres, over its HTTP driver (one round trip per query, no pool). */
export class NeonStore implements GameStore {
  private sql: NeonQueryFunction<false, false>;
  private ready: Promise<unknown> | null = null;

  constructor(url: string) {
    this.sql = neon(url);
  }

  private init() {
    this.ready ??= this.sql.transaction(SCHEMA.map((s) => this.sql.query(s))).catch((e) => {
      this.ready = null;
      throw e;
    });
    return this.ready;
  }

  async createGame(game: NewGame, host: NewSeat) {
    await this.init();
    const rows = await this.sql`
      with g as (
        insert into shared_game (code, block, player_count, ast_mode)
        values (${game.code}, ${game.block}, ${game.playerCount}, ${game.astMode})
        on conflict (code) do nothing
        returning *
      ), s as (
        insert into shared_seat (game_id, name, nation, host, token_hash, snapshot)
        select id, ${host.name}, ${host.nation}, true, ${host.tokenHash}, ${JSON.stringify(host.snapshot)}::jsonb from g
        returning *
      )
      select row_to_json(g) as game, row_to_json(s) as seat from g, s`;
    if (rows.length === 0) return null;
    return { game: gameRow(rows[0].game as Row), seat: seatRow(rows[0].seat as Row) };
  }

  async findGame(code: string) {
    await this.init();
    const rows = await this.sql`select * from shared_game where code = ${code}`;
    return rows.length ? gameRow(rows[0]) : null;
  }

  async seats(gameId: string) {
    await this.init();
    const rows = await this.sql`select * from shared_seat where game_id = ${gameId} order by id`;
    return rows.map(seatRow);
  }

  async addSeat(gameId: string, seat: NewSeat) {
    await this.init();
    const rows = await this.sql`
      insert into shared_seat (game_id, name, nation, token_hash, snapshot)
      values (${gameId}, ${seat.name}, ${seat.nation}, ${seat.tokenHash}, ${JSON.stringify(seat.snapshot)}::jsonb)
      on conflict do nothing
      returning *`;
    return rows.length ? seatRow(rows[0]) : null;
  }

  async updateSnapshot(seatId: string, snapshot: SeatSnapshot) {
    await this.init();
    await this.sql`update shared_seat set snapshot = ${JSON.stringify(snapshot)}::jsonb, updated_at = now() where id = ${seatId}`;
  }

  async removeSeat(seatId: string) {
    await this.init();
    await this.sql`delete from shared_seat where id = ${seatId}`;
  }

  async endGame(gameId: string, results: FinalResult[]) {
    await this.init();
    await this.sql.transaction([
      this.sql`update shared_game set status = 'ended', ended_at = now() where id = ${gameId}`,
      ...results.map(
        ({ seatId, rank, score: s }) => this.sql`
          update shared_seat set
            final_rank = ${rank}, score = ${s.total}, cities = ${s.cities}, ast_pos = ${s.astPosition},
            num_civ_adv_1vp = ${s.advances.vp1}, num_civ_adv_3vp = ${s.advances.vp3}, num_civ_adv_6vp = ${s.advances.vp6},
            building_vp = ${s.buildingVP}, special_building = ${s.controlsBuilding}, special_building_own = ${s.ownsBuilding},
            bonus_vp = ${s.soloAstBonus > 0}
          where id = ${seatId}`,
      ),
    ]);
  }
}

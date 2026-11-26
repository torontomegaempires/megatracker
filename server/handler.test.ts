import { describe, expect, it } from 'vitest';
import type { SeatSnapshot } from '../src/engine/standings';
import type { GameView, SeatGrant } from '../src/shared/api';
import { handle } from './handler';
import { MemoryStore } from './store';

const snap = (over: Partial<SeatSnapshot> = {}): SeatSnapshot => ({ owned: [], cities: 0, astPosition: 1, buildings: null, ...over });

async function setup() {
  const store = new MemoryStore();
  const call = (method: string, path: string, body: unknown = null, token: string | null = null) => handle(store, { method, path, body, token });
  const created = await call('POST', '', { block: 'west', playerCount: 9, astMode: 'basic', name: 'Rob', nation: 'Rome', snapshot: snap({ cities: 3 }) });
  expect(created.status).toBe(201);
  const host = created.body as SeatGrant;
  return { store, call, host, code: host.game.code };
}

describe('shared game API', () => {
  it('creates a game with a four-character code and the host seated', async () => {
    const { host, code } = await setup();
    expect(code).toMatch(/^[2-9A-HJKMNP-Z]{4}$/);
    expect(host.token.length).toBeGreaterThan(20);
    expect(host.game.standings).toHaveLength(1);
    expect(host.game.standings[0]).toMatchObject({ name: 'Rob', nation: 'Rome', host: true, rank: 1 });
  });

  it('lets others join with the code, in any case, but not as a nation already taken', async () => {
    const { call, code } = await setup();
    const joined = await call('POST', `/${code.toLowerCase()}/seats`, { name: 'Don', nation: 'Egypt', snapshot: snap({ cities: 5 }) });
    expect(joined.status).toBe(201);
    expect((joined.body as SeatGrant).game.standings.map((s) => s.nation)).toEqual(['Egypt', 'Rome']);
    const dup = await call('POST', `/${code}/seats`, { name: 'Kent', nation: 'egypt', snapshot: snap() });
    expect(dup.status).toBe(409);
    expect((await call('POST', '/ZZZZ/seats', { name: 'Kent', nation: 'Hatti' })).status).toBe(404);
  });

  it('rejects a missing name or nation', async () => {
    const { call, code } = await setup();
    expect((await call('POST', `/${code}/seats`, { name: '  ', nation: 'Hatti' })).status).toBe(400);
    expect((await call('POST', `/${code}/seats`, { name: 'Kent' })).status).toBe(400);
  });

  it('only lets a seat update itself, and scores what the server cleans', async () => {
    const { call, code, host } = await setup();
    const other = (await call('POST', `/${code}/seats`, { name: 'Don', nation: 'Egypt', snapshot: snap() })).body as SeatGrant;
    const path = `/${code}/seats/${host.seatId}`;
    expect((await call('PUT', path, { snapshot: snap({ cities: 9 }) }, other.token)).status).toBe(403);
    expect((await call('PUT', path, { snapshot: snap({ cities: 9 }) })).status).toBe(403);
    const res = await call('PUT', path, { snapshot: { ...snap({ astPosition: 16 }), cities: 50 } }, host.token);
    expect(res.status).toBe(200);
    const rome = (res.body as GameView).standings.find((s) => s.nation === 'Rome')!;
    expect(rome.score.cities).toBe(9);
    expect(rome.score.soloAstBonus).toBe(5);
    expect(rome.score.total).toBe(9 + 75 + 5);
  });

  it('lets a player leave and the host remove a seat, but not the reverse', async () => {
    const { call, code, host } = await setup();
    const a = (await call('POST', `/${code}/seats`, { name: 'Don', nation: 'Egypt', snapshot: snap() })).body as SeatGrant;
    const b = (await call('POST', `/${code}/seats`, { name: 'Kent', nation: 'Hatti', snapshot: snap() })).body as SeatGrant;
    expect((await call('DELETE', `/${code}/seats/${b.seatId}`, null, a.token)).status).toBe(403);
    expect((await call('DELETE', `/${code}/seats/${host.seatId}`, null, a.token)).status).toBe(403);
    expect((await call('DELETE', `/${code}/seats/${a.seatId}`, null, a.token)).status).toBe(200);
    const res = await call('DELETE', `/${code}/seats/${b.seatId}`, null, host.token);
    expect((res.body as GameView).standings.map((s) => s.nation)).toEqual(['Rome']);
  });

  it('lets only the host end the game, keeps the results and stops updates', async () => {
    const { store, call, code, host } = await setup();
    const a = (await call('POST', `/${code}/seats`, { name: 'Don', nation: 'Egypt', snapshot: snap() })).body as SeatGrant;
    expect((await call('POST', `/${code}/end`, {}, a.token)).status).toBe(403);
    const ended = await call('POST', `/${code}/end`, {}, host.token);
    expect((ended.body as GameView).status).toBe('ended');
    expect(store.results.get(host.seatId)).toMatchObject({ rank: 1, score: { total: 3 } });
    expect((await call('PUT', `/${code}/seats/${a.seatId}`, { snapshot: snap() }, a.token)).status).toBe(409);
    expect((await call('POST', `/${code}/seats`, { name: 'Kent', nation: 'Hatti', snapshot: snap() })).status).toBe(409);
    expect(((await call('GET', `/${code}`)).body as GameView).status).toBe('ended');
  });

  it('validates new games', async () => {
    const store = new MemoryStore();
    const base = { block: 'west', playerCount: 9, astMode: 'basic', name: 'Rob', nation: 'Rome' };
    const post = (body: object) => handle(store, { method: 'POST', path: '', body, token: null });
    expect((await post({ ...base, block: 'north' })).status).toBe(400);
    expect((await post({ ...base, playerCount: 8 })).status).toBe(400);
    expect((await post({ ...base, astMode: 'off' })).status).toBe(400);
  });
});

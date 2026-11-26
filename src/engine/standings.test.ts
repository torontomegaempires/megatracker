import { describe, expect, it } from 'vitest';
import { RULES } from '../data';
import { newGame, reducer } from './game';
import type { SeatSnapshot } from './standings';
import { cleanSnapshot, qualifiedAge, scoreSeat, snapshotOf, standings } from './standings';

const we = RULES.we.advances;
const byPrice = (min: number, max: number) => we.filter((a) => a.price >= min && a.price <= max);
const names = (list: { name: string }[], n: number) => list.slice(0, n).map((a) => a.name);

const snap = (over: Partial<SeatSnapshot> = {}): SeatSnapshot => ({ owned: [], cities: 0, astPosition: 1, buildings: null, ...over });
const seat = (nation: string, over: Partial<SeatSnapshot> = {}) => ({ id: nation, name: nation, nation, snapshot: snap(over) });

describe('shared game scores', () => {
  it('adds Advance VP, cities and 5 for each A.S.T. space moved', () => {
    const owned = [...names(byPrice(0, 99), 2), ...names(byPrice(100, 199), 1), ...names(byPrice(200, 999), 1)];
    const s = scoreSeat('west', 'basic', snap({ owned, cities: 6, astPosition: 17 }));
    expect(s.advances).toEqual({ vp1: 2, vp3: 1, vp6: 1 });
    expect(s.advanceVP).toBe(11);
    expect(s.astVP).toBe(80);
    expect(s.total).toBe(11 + 6 + 80);
  });

  it('matches a recorded game: 80 Advance VP, 6 cities, A.S.T. 17, own and control the historic building', () => {
    const owned = [...names(byPrice(0, 99), 17), ...names(byPrice(100, 199), 9), ...names(byPrice(200, 999), 6)];
    const buildings = { civ: 'rome', owned: 'rome', controlled: ['rome'] };
    const s = scoreSeat('west', 'basic', snap({ owned, cities: 6, astPosition: 17, buildings }));
    expect(s.advanceVP).toBe(80);
    expect(s.buildingVP).toBe(5);
    expect(s.total).toBe(171);
  });

  it('counts each controlled building and the historic bonus', () => {
    const s = scoreSeat('west', 'basic', snap({ buildings: { civ: 'rome', owned: null, controlled: ['egypt', 'rome'] } }));
    expect(s.buildingVP).toBe(4);
    expect(s.ownsBuilding).toBe(false);
    expect(s.controlsBuilding).toBe(true);
  });
});

describe('solo A.S.T. bonus', () => {
  it('gives 5 VP to the only nation in the Late Iron Age', () => {
    const rows = standings('west', 'basic', [seat('Rome', { astPosition: 16 }), seat('Egypt', { astPosition: 15 })]);
    expect(rows[0].nation).toBe('Rome');
    expect(rows[0].score.soloAstBonus).toBe(5);
    expect(rows[0].score.total).toBe(75 + 5);
    expect(rows[1].score.soloAstBonus).toBe(0);
  });

  it('gives no bonus when two nations reach it', () => {
    const rows = standings('west', 'basic', [seat('Rome', { astPosition: 16 }), seat('Egypt', { astPosition: 17 })]);
    expect(rows.every((r) => r.score.soloAstBonus === 0)).toBe(true);
  });

  it('gives no bonus when nobody reaches it', () => {
    const rows = standings('west', 'basic', [seat('Rome', { astPosition: 15 })]);
    expect(rows[0].score.soloAstBonus).toBe(0);
  });
});

describe('standings', () => {
  it('ranks by score, with ties sharing a rank', () => {
    const rows = standings('west', 'basic', [seat('Rome', { cities: 2 }), seat('Egypt', { cities: 5 }), seat('Hatti', { cities: 2 })]);
    expect(rows.map((r) => [r.nation, r.rank])).toEqual([
      ['Egypt', 1],
      ['Hatti', 2],
      ['Rome', 2],
    ]);
  });
});

describe('A.S.T. era reached', () => {
  const adv = (list: string[]) => list.map((n) => we.find((a) => a.name === n)!);

  it('needs the cities as well as the Advances', () => {
    const three = adv(names(byPrice(0, 99), 3));
    expect(qualifiedAge('basic', three, 2).abbr).toBe('EBA');
    expect(qualifiedAge('basic', three, 3).abbr).toBe('MBA');
    expect(qualifiedAge('basic', [], 0).abbr).toBe('SA');
  });

  it('stops at the first age not met', () => {
    // Three Advances priced 200+ meet the later ages' Advance needs, but 2 cities stop at EBA.
    const big = adv(names(byPrice(200, 999), 3));
    expect(qualifiedAge('basic', big, 2).abbr).toBe('EBA');
    expect(qualifiedAge('basic', big, 5).abbr).toBe('LIA');
  });

  it('uses the expert table', () => {
    expect(qualifiedAge('expert', [], 2).abbr).toBe('SA');
    expect(qualifiedAge('expert', [], 3).abbr).toBe('EBA');
  });
});

describe('snapshots', () => {
  it('shares only owned Advances, cities, A.S.T. position and buildings', () => {
    let g = newGame('west', 9);
    g = reducer(g, { type: 'setBoard', board: { cities: 4, astPosition: 7 } });
    g = reducer(g, { type: 'setBuildings', buildings: { enabled: true, civ: 'rome' } });
    expect(snapshotOf(g)).toEqual({ owned: [], cities: 4, astPosition: 7, buildings: { civ: 'rome', owned: null, controlled: [] } });
    expect(snapshotOf(newGame('fareast', 5)).buildings).toBeNull();
  });

  it('cleans what a phone sends', () => {
    const real = we[0].name;
    const s = cleanSnapshot('west', { owned: [real, real, 'Not an Advance', 3], cities: 99, astPosition: -4, buildings: { civ: 'atlantis', owned: 'rome', controlled: ['rome', 'nowhere'] } });
    expect(s).toEqual({ owned: [real], cities: 9, astPosition: 1, buildings: { civ: null, owned: 'rome', controlled: ['rome'] } });
    expect(cleanSnapshot('fareast', { buildings: { owned: 'rome', controlled: [] } }).buildings).toBeNull();
    expect(cleanSnapshot('west', null)).toEqual(snap());
  });
});

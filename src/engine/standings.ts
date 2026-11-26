import type { Advance, BlockId } from '../data';
import { buildingIn, rulesFor } from '../data';
import type { GameState } from './game';
import type { AstAge } from './selectors';
import { AST, ageProgress, buildingsOn, pointsForBuildings } from './selectors';

/** The A.S.T. guide a shared game scores eras with. */
export type SharedAstMode = 'basic' | 'expert';

/** Succession marker positions run from 1 (the start of the Stone Age) up. */
export const AST_START = 1;
export const AST_MAX = 20;
/** The first space of the Late Iron Age: reaching it alone earns the solo A.S.T. bonus. */
export const LATE_IRON_AGE_POSITION = 16;
export const SOLO_AST_BONUS = 5;
export const MAX_CITIES = 9;

/** What a player's phone shares with the rest of the table: only what the score and era need. */
export interface SeatSnapshot {
  owned: string[];
  cities: number;
  astPosition: number;
  /** The player's special buildings, or null when the game doesn't use them. */
  buildings: { civ: string | null; owned: string | null; controlled: string[] } | null;
}

export function snapshotOf(state: GameState): SeatSnapshot {
  const { civ, owned, controlled } = state.buildings;
  return {
    owned: [...state.owned],
    cities: state.board.cities,
    astPosition: state.board.astPosition,
    buildings: buildingsOn(state) ? { civ, owned, controlled: [...controlled] } : null,
  };
}

const clampInt = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : fallback;

/** A snapshot sent by a phone, keeping only Advances, buildings and numbers that make sense for this block. */
export function cleanSnapshot(block: BlockId, raw: unknown): SeatSnapshot {
  const s = (raw ?? {}) as Partial<Record<keyof SeatSnapshot, unknown>>;
  const rules = rulesFor(block);
  const owned = Array.isArray(s.owned) ? [...new Set(s.owned.filter((n): n is string => typeof n === 'string' && rules.byName.has(n)))] : [];
  let buildings: SeatSnapshot['buildings'] = null;
  if (s.buildings && typeof s.buildings === 'object') {
    const b = s.buildings as Record<string, unknown>;
    const known = (id: unknown): id is string => !!buildingIn(block, id);
    buildings = {
      civ: known(b.civ) ? b.civ : null,
      owned: known(b.owned) ? b.owned : null,
      controlled: Array.isArray(b.controlled) ? [...new Set(b.controlled.filter(known))] : [],
    };
  }
  return {
    owned,
    cities: clampInt(s.cities, 0, MAX_CITIES, 0),
    astPosition: clampInt(s.astPosition, AST_START, AST_MAX, AST_START),
    buildings,
  };
}

/**
 * The latest age whose requirements are met, cities included. Ages are taken in order, as the
 * succession marker moves: an age only counts once every earlier one is met.
 */
export function qualifiedAge(mode: SharedAstMode, advances: Advance[], cities: number): AstAge {
  const ages = AST[mode];
  let reached = ages[0];
  for (const a of ages) {
    if (cities < a.cities || ageProgress(a, advances) < 1) break;
    reached = a;
  }
  return reached;
}

export interface SeatScore {
  /** Advance VP, and how many Advances of each VP value. */
  advanceVP: number;
  advances: { vp1: number; vp3: number; vp6: number };
  cities: number;
  astPosition: number;
  /** 5 for each space the succession marker has moved. */
  astVP: number;
  /** Special-building VP, or 0 when the game doesn't use them. */
  buildingVP: number;
  ownsBuilding: boolean;
  controlsBuilding: boolean;
  /** Set by the standings: 5 when this player alone reached the Late Iron Age. */
  soloAstBonus: number;
  total: number;
  age: AstAge;
}

export function scoreSeat(block: BlockId, mode: SharedAstMode, snap: SeatSnapshot): SeatScore {
  const rules = rulesFor(block);
  const advances = snap.owned.map((n) => rules.byName.get(n)).filter((a): a is Advance => !!a);
  const count = (vp: number) => advances.filter((a) => a.vp === vp).length;
  const advanceVP = advances.reduce((t, a) => t + a.vp, 0);
  const astVP = 5 * (snap.astPosition - AST_START);
  const buildingVP = snap.buildings ? pointsForBuildings(snap.buildings).total : 0;
  return {
    advanceVP,
    advances: { vp1: count(1), vp3: count(3), vp6: count(6) },
    cities: snap.cities,
    astPosition: snap.astPosition,
    astVP,
    buildingVP,
    ownsBuilding: !!snap.buildings?.owned,
    controlsBuilding: (snap.buildings?.controlled.length ?? 0) > 0,
    soloAstBonus: 0,
    total: advanceVP + snap.cities + astVP + buildingVP,
    age: qualifiedAge(mode, advances, snap.cities),
  };
}

export interface SeatInput {
  id: string;
  name: string;
  nation: string;
  snapshot: SeatSnapshot;
}

export interface Standing extends SeatInput {
  /** 1 for the leader; tied scores share a rank. */
  rank: number;
  score: SeatScore;
}

/** Every seat scored, with the solo A.S.T. bonus applied, highest score first. */
export function standings(block: BlockId, mode: SharedAstMode, seats: SeatInput[]): Standing[] {
  const scored = seats.map((s) => ({ ...s, rank: 0, score: scoreSeat(block, mode, s.snapshot) }));
  const late = scored.filter((s) => s.score.astPosition >= LATE_IRON_AGE_POSITION);
  if (late.length === 1) {
    const solo = late[0].score;
    solo.soloAstBonus = SOLO_AST_BONUS;
    solo.total += SOLO_AST_BONUS;
  }
  scored.sort((a, b) => b.score.total - a.score.total || a.nation.localeCompare(b.nation));
  scored.forEach((s, i) => {
    s.rank = i > 0 && scored[i - 1].score.total === s.score.total ? scored[i - 1].rank : i + 1;
  });
  return scored;
}

// What the shared-game API sends and receives. Used by the app and by the server
// (netlify/functions/games.mts), so both agree on the shape.
import type { BlockId } from '../data';
import type { SeatScore, SeatSnapshot, SharedAstMode } from '../engine/standings';

export type GameStatus = 'active' | 'ended';

export interface StandingView {
  seatId: string;
  name: string;
  nation: string;
  host: boolean;
  rank: number;
  score: SeatScore;
  updatedAt: string;
}

export interface GameView {
  code: string;
  block: BlockId;
  playerCount: number;
  astMode: SharedAstMode;
  status: GameStatus;
  createdAt: string;
  endedAt: string | null;
  /** When the server built this view: phones ignore a view older than the one they show. */
  asOf: string;
  standings: StandingView[];
}

export interface CreateGameRequest {
  block: BlockId;
  playerCount: number;
  astMode: SharedAstMode;
  name: string;
  nation: string;
  snapshot: SeatSnapshot;
}

export interface JoinGameRequest {
  name: string;
  nation: string;
  snapshot: SeatSnapshot;
}

export interface UpdateSeatRequest {
  snapshot: SeatSnapshot;
}

/** Returned when creating or joining: the token is the only way to update this seat later. */
export interface SeatGrant {
  seatId: string;
  token: string;
  game: GameView;
}

export interface ApiError {
  error: string;
}

/** Join codes: four characters without look-alikes (no 0/O, 1/I/L). */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LENGTH = 4;
export const NAME_MAX = 30;

/** The Ably channel a game's standings are published on. */
export function liveChannel(code: string): string {
  return `megatracker:game:${code}`;
}

/** The Ably message name for a new GameView. */
export const STANDINGS_EVENT = 'standings';

export function normalizeCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, CODE_LENGTH);
}

import type { ApiError, CreateGameRequest, GameView, JoinGameRequest, SeatGrant, UpdateSeatRequest } from './api';

/** An API failure; `status` is 0 when the server couldn't be reached at all. */
export class ApiFailure extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/games${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiFailure('Can’t reach the Megatracker server. Check your connection.', 0);
  }
  const data = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok || data === null) {
    const msg = data && typeof data === 'object' && 'error' in data ? data.error : 'Shared games aren’t available right now.';
    throw new ApiFailure(msg, res.status);
  }
  return data as T;
}

export const api = {
  create: (req: CreateGameRequest) => call<SeatGrant>('POST', '', req),
  get: (code: string) => call<GameView>('GET', `/${encodeURIComponent(code)}`),
  join: (code: string, req: JoinGameRequest) => call<SeatGrant>('POST', `/${encodeURIComponent(code)}/seats`, req),
  update: (code: string, seatId: string, token: string, req: UpdateSeatRequest) =>
    call<GameView>('PUT', `/${encodeURIComponent(code)}/seats/${seatId}`, req, token),
  remove: (code: string, seatId: string, token: string) => call<GameView>('DELETE', `/${encodeURIComponent(code)}/seats/${seatId}`, undefined, token),
  end: (code: string, token: string) => call<GameView>('POST', `/${encodeURIComponent(code)}/end`, {}, token),
};

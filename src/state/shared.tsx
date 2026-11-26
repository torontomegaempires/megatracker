import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SeatSnapshot, SharedAstMode } from '../engine/standings';
import { snapshotOf } from '../engine/standings';
import type { GameView } from '../shared/api';
import { api, ApiFailure } from '../shared/client';
import { connectLive } from '../shared/live';
import { useStore } from './store';

const SEAT_KEY = 'megatracker:shared';
const NAME_KEY = 'megatracker:playerName';
/** How long after a change the phone waits before sending it, so a run of taps sends once. */
const SEND_DELAY = 800;
const RETRY_DELAY = 10_000;
const POLL_INTERVAL = 8_000;

/** This phone's seat in a shared game: the token is what lets it update the seat. */
export interface Seat {
  code: string;
  seatId: string;
  token: string;
  host: boolean;
}

export type SyncStatus = 'saved' | 'saving' | 'offline';

interface Shared {
  seat: Seat | null;
  view: GameView | null;
  status: SyncStatus;
  /** Whether standings arrive live (Ably) rather than by polling. */
  live: boolean;
  /** Something to tell the player, e.g. that the host removed them. */
  notice: string | null;
  clearNotice: () => void;
  create: (name: string, nation: string, astMode: SharedAstMode) => Promise<void>;
  join: (code: string, name: string, nation: string, snapshot: SeatSnapshot) => Promise<GameView>;
  /** Leaves the game on the server (players) and forgets it on this phone. */
  leave: () => Promise<void>;
  /** Forgets the game on this phone only. */
  forget: () => void;
  end: () => Promise<void>;
  remove: (seatId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the seat lasts for this session only.
  }
}

/** The code from a join link (?join=CODE), removed from the address so a reload doesn't reopen it. */
export function takeJoinCode(): string | null {
  const url = new URL(location.href);
  const code = url.searchParams.get('join');
  if (!code) return null;
  url.searchParams.delete('join');
  history.replaceState(null, '', url);
  return code;
}

export function savedPlayerName(): string {
  return read<string>(NAME_KEY) ?? '';
}

const SharedContext = createContext<Shared | null>(null);

export function SharedProvider({ children }: { children: ReactNode }) {
  const { game } = useStore();
  const [seat, setSeatState] = useState<Seat | null>(() => read<Seat>(SEAT_KEY));
  const [view, setView] = useState<GameView | null>(null);
  const [status, setStatus] = useState<SyncStatus>('saved');
  const [notice, setNotice] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [live, setLive] = useState(false);
  /** The snapshot the server last accepted, as JSON. */
  const sent = useRef<string | null>(null);
  /** When the shown view was built: an older one arriving late (poll or live) is ignored. */
  const shownAsOf = useRef('');

  const show = useCallback((v: GameView) => {
    if (v.asOf < shownAsOf.current) return;
    shownAsOf.current = v.asOf;
    setView(v);
  }, []);

  const setSeat = useCallback((s: Seat | null) => {
    setSeatState(s);
    write(SEAT_KEY, s);
    shownAsOf.current = '';
    if (!s) {
      setView(null);
      sent.current = null;
    }
  }, []);

  /** The seat is gone on the server (removed, or the game no longer exists). */
  const lost = useCallback(
    (message: string) => {
      setSeat(null);
      setNotice(message);
    },
    [setSeat],
  );

  const accept = useCallback(
    (v: GameView, s: Seat) => {
      if (!v.standings.some((r) => r.seatId === s.seatId)) lost(`You’re no longer in game ${s.code}: the host removed your nation.`);
      else show(v);
    },
    [lost, show],
  );

  const failed = useCallback(
    (e: unknown, s: Seat) => {
      if (e instanceof ApiFailure && (e.status === 404 || e.status === 403)) lost(`You’re no longer in game ${s.code}.`);
      else setStatus('offline');
    },
    [lost],
  );

  // Starting a new game on this phone leaves the shared one behind.
  useEffect(() => {
    if (!game && seat) setSeat(null);
  }, [game, seat, setSeat]);

  const snapshot = game ? JSON.stringify(snapshotOf(game)) : null;

  // Send this phone's snapshot shortly after it changes, and retry while offline.
  useEffect(() => {
    if (!seat || !snapshot || snapshot === sent.current) return;
    if (view?.status === 'ended') return;
    setStatus('saving');
    const timer = setTimeout(
      () => {
        api
          .update(seat.code, seat.seatId, seat.token, { snapshot: JSON.parse(snapshot) as SeatSnapshot })
          .then((v) => {
            sent.current = snapshot;
            setStatus('saved');
            accept(v, seat);
          })
          .catch((e) => {
            if (e instanceof ApiFailure && e.status === 409) {
              // The game has ended: nothing more to send.
              sent.current = snapshot;
              setStatus('saved');
              return;
            }
            failed(e, seat);
            setTimeout(() => setRetry((n) => n + 1), RETRY_DELAY);
          });
      },
      retry > 0 && status === 'offline' ? 0 : SEND_DELAY,
    );
    return () => clearTimeout(timer);
    // `status` only picks the delay, so it isn't a dependency.
  }, [seat, snapshot, retry, view?.status, accept, failed]);

  const refresh = useCallback(async () => {
    if (!seat) return;
    try {
      accept(await api.get(seat.code), seat);
      if (status === 'offline' && snapshot === sent.current) setStatus('saved');
    } catch (e) {
      failed(e, seat);
    }
  }, [seat, accept, failed, status, snapshot]);

  const create = useCallback(
    async (name: string, nation: string, astMode: SharedAstMode) => {
      if (!game) return;
      const snap = snapshotOf(game);
      const grant = await api.create({ block: game.block, playerCount: game.playerCount, astMode, name, nation, snapshot: snap });
      write(NAME_KEY, name);
      sent.current = JSON.stringify(snap);
      setSeat({ code: grant.game.code, seatId: grant.seatId, token: grant.token, host: true });
      show(grant.game);
      setStatus('saved');
    },
    [game, setSeat, show],
  );

  const join = useCallback(
    async (code: string, name: string, nation: string, snap: SeatSnapshot) => {
      const grant = await api.join(code, { name, nation, snapshot: snap });
      write(NAME_KEY, name);
      sent.current = JSON.stringify(snap);
      setSeat({ code: grant.game.code, seatId: grant.seatId, token: grant.token, host: false });
      show(grant.game);
      setStatus('saved');
      return grant.game;
    },
    [setSeat, show],
  );

  const leave = useCallback(async () => {
    if (!seat) return;
    if (!seat.host && view?.status !== 'ended') {
      try {
        await api.remove(seat.code, seat.seatId, seat.token);
      } catch (e) {
        if (!(e instanceof ApiFailure && e.status === 404)) throw e;
      }
    }
    setSeat(null);
  }, [seat, view?.status, setSeat]);

  const end = useCallback(async () => {
    if (!seat) return;
    show(await api.end(seat.code, seat.token));
  }, [seat, show]);

  const remove = useCallback(
    async (seatId: string) => {
      if (!seat) return;
      show(await api.remove(seat.code, seatId, seat.token));
    },
    [seat, show],
  );

  // Live standings over Ably while the game is on. Without it (not set up, or blocked), polling carries on.
  const code = seat?.code ?? null;
  const ended = view?.status === 'ended';
  const acceptRef = useRef(accept);
  acceptRef.current = accept;
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    if (!code || ended) return;
    let closed = false;
    let close = () => {};
    void connectLive(code, {
      onView: (v) => {
        const s = read<Seat>(SEAT_KEY);
        if (s?.code === code) acceptRef.current(v, s);
      },
      onConnected: (connected) => {
        setLive(connected);
        // Catch up on anything sent while the connection was down.
        if (connected) void refreshRef.current();
      },
    }).then((stop) => {
      if (closed) stop();
      else close = stop;
    });
    return () => {
      closed = true;
      close();
      setLive(false);
    };
  }, [code, ended]);

  const forget = useCallback(() => setSeat(null), [setSeat]);
  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo(
    () => ({ seat, view, status, live, notice, clearNotice, create, join, leave, forget, end, remove, refresh }),
    [seat, view, status, live, notice, clearNotice, create, join, leave, forget, end, remove, refresh],
  );
  return <SharedContext.Provider value={value}>{children}</SharedContext.Provider>;
}

export function useShared(): Shared {
  const s = useContext(SharedContext);
  if (!s) throw new Error('useShared outside SharedProvider');
  return s;
}

/** Keeps the standings fresh while a screen showing them is open and the page is visible. */
export function useStandingsPolling(active: boolean) {
  const { seat, view, live, refresh } = useShared();
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const ended = view?.status === 'ended';
  useEffect(() => {
    if (!active || !seat) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void refreshRef.current();
    };
    tick();
    if (ended || live) return;
    const timer = setInterval(tick, POLL_INTERVAL);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [active, seat, ended, live]);
}

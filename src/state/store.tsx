import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { BlockId } from '../data';
import { BLOCKS } from '../data';
import type { Action, GameState } from '../engine/game';
import { loadFunding, newGame, reducer as gameReducer } from '../engine/game';

const STORAGE_KEY = 'megatracker:game';

type RootAction = Action | { type: 'start'; block: BlockId; playerCount: number } | { type: 'reset' };

function rootReducer(state: GameState | null, action: RootAction): GameState | null {
  if (action.type === 'start') return newGame(action.block, action.playerCount);
  if (action.type === 'reset') return null;
  if (!state) return state;
  return gameReducer(state, action);
}

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GameState;
    if (data?.schema !== 1 || !(data.block in BLOCKS)) return null;
    // Fill in any settings added since the game was saved.
    const fresh = newGame(data.block, data.playerCount);
    return {
      ...fresh,
      ...data,
      view: { ...fresh.view, ...data.view },
      board: { ...fresh.board, ...data.board },
      funding: loadFunding(data.funding),
    };
  } catch {
    return null;
  }
}

function save(state: GameState | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode, blocked): the app still works for this session.
  }
}

interface Store {
  game: GameState | null;
  dispatch: (action: RootAction) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [game, dispatch] = useReducer(rootReducer, undefined, load);
  useEffect(() => save(game), [game]);
  const value = useMemo(() => ({ game, dispatch }), [game]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

/** For screens that only render during a game. */
export function useGame(): { game: GameState; dispatch: (action: RootAction) => void } {
  const { game, dispatch } = useStore();
  if (!game) throw new Error('No game in progress');
  return { game, dispatch };
}

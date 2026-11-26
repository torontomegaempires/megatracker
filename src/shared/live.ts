import type { GameView } from './api';
import { liveChannel, STANDINGS_EVENT } from './api';
import { api } from './client';

interface LiveHandlers {
  onView: (view: GameView) => void;
  onConnected: (connected: boolean) => void;
}

/**
 * Subscribes to a game's standings over Ably. Returns a function that disconnects. Does nothing
 * when the server has no Ably key: the first token request fails and the caller keeps polling.
 * Ably's modular build is loaded only here, so players outside shared games never download it.
 */
export async function connectLive(code: string, { onView, onConnected }: LiveHandlers): Promise<() => void> {
  let first: unknown;
  try {
    first = await api.liveToken(code);
  } catch {
    return () => {};
  }
  const { BaseRealtime, WebSocketTransport, FetchRequest } = await import('ably/modular');
  const client = new BaseRealtime({
    plugins: { WebSocketTransport, FetchRequest },
    authCallback: (_params, callback) => {
      // Use the token request already fetched, then ask the server for fresh ones as they expire.
      const pending = first !== undefined ? Promise.resolve(first) : api.liveToken(code);
      first = undefined;
      pending.then(
        (t) => callback(null, t as Parameters<typeof callback>[1]),
        (e: unknown) => callback(e instanceof Error ? e.message : 'Token request failed', null),
      );
    },
  });
  client.connection.on((change) => onConnected(change.current === 'connected'));
  void client.channels.get(liveChannel(code)).subscribe(STANDINGS_EVENT, (message) => onView(message.data as GameView));
  return () => client.close();
}

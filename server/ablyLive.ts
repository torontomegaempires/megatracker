import { Rest } from 'ably';
import type { GameView } from '../src/shared/api';
import { STANDINGS_EVENT } from '../src/shared/api';
import type { Live } from './handler';

/** Tokens last an hour; the Ably client asks for a new one before then. */
const TOKEN_TTL = 60 * 60 * 1000;

/** Live updates over Ably's REST API: the function publishes, phones only subscribe. */
export class AblyLive implements Live {
  private rest: Rest;

  constructor(key: string) {
    this.rest = new Rest({ key });
  }

  tokenRequest(channel: string) {
    return this.rest.auth.createTokenRequest({ capability: { [channel]: ['subscribe'] }, ttl: TOKEN_TTL });
  }

  async publish(channel: string, view: GameView) {
    await this.rest.channels.get(channel).publish(STANDINGS_EVENT, view);
  }
}

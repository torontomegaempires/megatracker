import { useId, useState } from 'react';
import { BLOCKS, buildingById, buildingsIn } from '../data';
import type { GameState } from '../engine/game';
import { newGame, playerCountLabel } from '../engine/game';
import type { SharedAstMode } from '../engine/standings';
import { AST_MAX, AST_START, LATE_IRON_AGE_POSITION, MAX_CITIES, snapshotOf } from '../engine/standings';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { NationSwatch, Segmented, Stepper } from '../components/ui';
import type { GameView, StandingView } from '../shared/api';
import { CODE_LENGTH, normalizeCode } from '../shared/api';
import { api } from '../shared/client';
import { savedPlayerName, useShared, useStandingsPolling } from '../state/shared';
import { useGame, useStore } from '../state/store';

const astLabel = (m: SharedAstMode) => (m === 'basic' ? 'Basic A.S.T.' : 'Expert A.S.T.');
const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.');

/** The Game tab: create or join a shared game, then the table's standings. */
export function SharedGameView({ joinCode, onJoinHandled }: { joinCode: string | null; onJoinHandled: () => void }) {
  const { seat, view, notice, clearNotice } = useShared();
  const [sheet, setSheet] = useState<null | 'create' | 'join'>(joinCode && !seat ? 'join' : null);
  useStandingsPolling(true);

  const close = () => {
    setSheet(null);
    onJoinHandled();
  };

  return (
    <>
      {notice && (
        <div className="notice notice-accent" role="status">
          <span className="grow">{notice}</span>
          <button type="button" className="btn btn-quiet" onClick={clearNotice}>
            OK
          </button>
        </div>
      )}
      {seat ? (
        view ? (
          <Standings view={view} />
        ) : (
          <p className="empty">Loading game {seat.code}…</p>
        )
      ) : (
        <>
          <div className="page-head">
            <h2>Game</h2>
          </div>
          <p className="goal-intro muted">
            Share your score with the table. One player creates a game and reads out its code; everyone else joins with it. Each
            phone then shows every nation’s score, rank and A.S.T. era as the game goes on.
          </p>
          <div className="shared-actions">
            <button type="button" className="btn btn-primary btn-block" onClick={() => setSheet('create')}>
              Create a shared game
            </button>
            <button type="button" className="btn btn-block" onClick={() => setSheet('join')}>
              Join with a code
            </button>
          </div>
        </>
      )}
      {sheet === 'create' && <CreateSheet onClose={close} />}
      {sheet === 'join' && <JoinSheet initialCode={joinCode ?? ''} onClose={close} />}
    </>
  );
}

function Standings({ view }: { view: GameView }) {
  const { game, dispatch } = useGame();
  const { seat, status, live, leave, end, remove, forget } = useShared();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ended = view.status === 'ended';
  const isHost = !!seat?.host;

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <h2>{ended ? 'Final standings' : 'Game'}</h2>
        <ShareCode code={view.code} />
      </div>
      <p className="shared-meta muted">
        {BLOCKS[view.block].name} · {playerCountLabel(view.block, view.playerCount)} players · {astLabel(view.astMode)}
        {view.block !== game.block && ` · This phone is tracking ${BLOCKS[game.block].name}`}
      </p>

      {!ended && (
        <div className="panel shared-me">
          <div className="field">
            <label htmlFor="ast-position">
              A.S.T. position
              <span className="hint">Your succession marker’s space: 1 at the start, {LATE_IRON_AGE_POSITION} for the Late Iron Age.</span>
            </label>
            <Stepper
              label="A.S.T. position"
              editable
              value={game.board.astPosition}
              min={AST_START}
              max={AST_MAX}
              onChange={(astPosition) => dispatch({ type: 'setBoard', board: { astPosition } })}
            />
          </div>
          <div className="field">
            <label>Cities on the map</label>
            <Stepper label="cities" value={game.board.cities} min={0} max={MAX_CITIES} onChange={(cities) => dispatch({ type: 'setBoard', board: { cities } })} />
          </div>
          <p className={`shared-sync${status === 'offline' ? ' is-offline' : ''}`} role="status">
            {status === 'saving' && 'Sending your score…'}
            {status === 'saved' && (live ? 'Your score is shared. Standings update live.' : 'Your score is shared. Standings refresh every few seconds.')}
            {status === 'offline' && 'Offline. Your changes will be sent when the connection is back.'}
          </p>
        </div>
      )}

      <ol className="standings" aria-label="Standings">
        {view.standings.map((s) => (
          <StandingRow
            key={s.seatId}
            row={s}
            mine={s.seatId === seat?.seatId}
            onRemove={
              isHost && !ended && !s.host
                ? () => {
                    if (window.confirm(`Remove ${s.nation} (${s.name}) from the game?`)) void act(() => remove(s.seatId));
                  }
                : undefined
            }
          />
        ))}
      </ol>
      <p className="muted shared-formula">Score: Advance VP + cities + 5 per A.S.T. space moved + special-building VP + 5 for reaching the Late Iron Age alone.</p>

      {error && (
        <p className="shared-error" role="alert">
          {error}
        </p>
      )}
      <div className="shared-actions">
        {ended ? (
          <button type="button" className="btn btn-block" onClick={forget}>
            Close this game
          </button>
        ) : isHost ? (
          <button
            type="button"
            className="btn btn-block btn-danger"
            disabled={busy}
            onClick={() => {
              if (window.confirm('End the game for everyone? The final standings are saved and no one can change their score after this.'))
                void act(end);
            }}
          >
            End the game
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-quiet btn-danger btn-block"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Leave game ${view.code}? Your nation is removed from the standings. Your own tracking stays on this phone.`))
                void act(leave);
            }}
          >
            Leave the game
          </button>
        )}
      </div>
    </>
  );
}

function StandingRow({ row, mine, onRemove }: { row: StandingView; mine: boolean; onRemove?: () => void }) {
  const s = row.score;
  const parts = [`Advances ${s.advanceVP}`, `Cities ${s.cities}`, `A.S.T. ${s.astPosition} (+${s.astVP})`];
  if (s.buildingVP) parts.push(`Buildings ${s.buildingVP}`);
  return (
    <li className={`standing${mine ? ' is-mine' : ''}`}>
      <span className="standing-rank num" aria-label={`Rank ${row.rank}`}>
        {row.rank}
      </span>
      <div className="standing-main">
        <div className="standing-title">
          <span className="standing-nation">
            <NationSwatch nation={row.nation} />
            {row.nation}
          </span>
          <span className="standing-era" title={s.age.name}>
            {s.age.abbr}
          </span>
          {s.soloAstBonus > 0 && <span className="standing-bonus">Solo A.S.T. +{s.soloAstBonus}</span>}
        </div>
        <div className="standing-meta">
          {row.name}
          {mine && ' (you)'}
          {row.host && ' · host'}
        </div>
        <div className="standing-meta">{parts.join(' · ')}</div>
      </div>
      <span className="standing-score num" aria-label={`${s.total} points`}>
        {s.total}
      </span>
      {onRemove && (
        <button type="button" className="icon-btn standing-remove" aria-label={`Remove ${row.nation}`} onClick={onRemove}>
          <Icon name="close" />
        </button>
      )}
    </li>
  );
}

function ShareCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}/?join=${code}`;
  return (
    <button
      type="button"
      className="share-code"
      aria-label={`Game code ${code.split('').join(' ')}. Share a link to join`}
      onClick={async () => {
        try {
          if (navigator.share) await navigator.share({ title: 'Join my Megatracker game', text: `Game code ${code}`, url: link });
          else {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        } catch {
          // Share cancelled or clipboard blocked: the code is on screen to read out.
        }
      }}
    >
      <span className="share-code-label">{copied ? 'Link copied' : 'Code'}</span>
      <span className="share-code-value">{code}</span>
    </button>
  );
}

/** Nations to suggest: the civilizations of this game. */
function nationOptions(block: GameState['block']): string[] {
  return buildingsIn(block).map((b) => b.civ).sort();
}

function PlayerFields({
  name,
  nation,
  setName,
  setNation,
  block,
  taken,
}: {
  name: string;
  nation: string;
  setName: (v: string) => void;
  setNation: (v: string) => void;
  block: GameState['block'];
  taken: string[];
}) {
  const id = useId();
  const takenLower = taken.map((t) => t.toLowerCase());
  const options = nationOptions(block).filter((n) => !takenLower.includes(n.toLowerCase()));
  return (
    <>
      <div className="field stack">
        <label htmlFor={`${id}-name`}>Your name</label>
        <input id={`${id}-name`} value={name} maxLength={30} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field stack">
        <label htmlFor={`${id}-nation`}>Your nation</label>
        <input id={`${id}-nation`} value={nation} maxLength={30} list={`${id}-nations`} autoComplete="off" onChange={(e) => setNation(e.target.value)} />
        <datalist id={`${id}-nations`}>
          {options.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        {taken.length > 0 && <span className="hint">Already playing: {taken.join(', ')}</span>}
      </div>
    </>
  );
}

function defaultNation(game: GameState | null): string {
  const civ = game?.buildings.civ;
  return civ ? (buildingById(civ)?.civ ?? '') : '';
}

function CreateSheet({ onClose }: { onClose: () => void }) {
  const { game, dispatch } = useGame();
  const { create } = useShared();
  const [name, setName] = useState(savedPlayerName);
  const [nation, setNation] = useState(() => defaultNation(game));
  const [astMode, setAstMode] = useState<SharedAstMode>(game.view.ast === 'expert' ? 'expert' : 'basic');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await create(name.trim(), nation.trim(), astMode);
      dispatch({ type: 'setView', view: { ast: astMode } });
      onClose();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Create a shared game"
      subtitle={`${BLOCKS[game.block].name} · ${playerCountLabel(game.block, game.playerCount)} players`}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary" disabled={busy || !name.trim() || !nation.trim()} onClick={submit}>
          Create
        </button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <PlayerFields name={name} nation={nation} setName={setName} setNation={setNation} block={game.block} taken={[]} />
        <div className="field stack">
          <label>A.S.T. for everyone’s era</label>
          <Segmented<SharedAstMode>
            label="A.S.T."
            value={astMode}
            onChange={setAstMode}
            options={[
              { value: 'basic', label: 'Basic' },
              { value: 'expert', label: 'Expert' },
            ]}
          />
        </div>
        {error && (
          <p className="shared-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

/** Join a game by its code. Used on the Game tab and on the setup screen (where there is no game yet). */
export function JoinSheet({ initialCode, onClose }: { initialCode: string; onClose: () => void }) {
  const { game, dispatch } = useStore();
  const { join } = useShared();
  const [code, setCode] = useState(normalizeCode(initialCode));
  const [found, setFound] = useState<GameView | null>(null);
  const [name, setName] = useState(savedPlayerName);
  const [nation, setNation] = useState(() => defaultNation(game));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeId = useId();
  const differentBlock = !!game && !!found && found.block !== game.block;

  const find = async () => {
    setBusy(true);
    setError(null);
    try {
      const v = await api.get(code);
      if (v.status === 'ended') setError(`Game ${v.code} has ended.`);
      else setFound(v);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!found) return;
    if (differentBlock && !window.confirm(`Game ${found.code} is ${BLOCKS[found.block].name}. Joining starts a new game on this phone and clears your Advances and credits.`))
      return;
    setBusy(true);
    setError(null);
    const fresh = !game || differentBlock;
    try {
      const snapshot = fresh ? snapshotOf(newGame(found.block, found.playerCount)) : snapshotOf(game);
      const v = await join(found.code, name.trim(), nation.trim(), snapshot);
      if (fresh) dispatch({ type: 'start', block: v.block, playerCount: v.playerCount });
      dispatch({ type: 'setView', view: { ast: v.astMode } });
      onClose();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={found ? `Join game ${found.code}` : 'Join a shared game'}
      subtitle={found ? `${BLOCKS[found.block].name} · ${playerCountLabel(found.block, found.playerCount)} players · ${astLabel(found.astMode)}` : undefined}
      onClose={onClose}
      footer={
        found ? (
          <button type="button" className="btn btn-primary" disabled={busy || !name.trim() || !nation.trim()} onClick={submit}>
            Join
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={busy || code.length !== CODE_LENGTH} onClick={find}>
            Find game
          </button>
        )
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void (found ? submit() : code.length === CODE_LENGTH && find());
        }}
      >
        {!found ? (
          <div className="field stack">
            <label htmlFor={codeId}>Game code</label>
            <input
              id={codeId}
              className="code-input"
              value={code}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              placeholder="K7QX"
              onChange={(e) => setCode(normalizeCode(e.target.value))}
            />
            <span className="hint">Ask the host for the {CODE_LENGTH}-character code on their Game tab.</span>
          </div>
        ) : (
          <>
            <PlayerFields
              name={name}
              nation={nation}
              setName={setName}
              setNation={setNation}
              block={found.block}
              taken={found.standings.map((s) => s.nation)}
            />
            {differentBlock && <p className="hint">This phone is tracking {BLOCKS[game!.block].name}: joining starts a new game for {BLOCKS[found.block].name}.</p>}
          </>
        )}
        {error && (
          <p className="shared-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

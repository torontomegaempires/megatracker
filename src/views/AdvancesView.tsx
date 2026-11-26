import type { ReactNode } from 'react';
import type { Advance } from '../data';
import { COLOR_NAMES, COLORS } from '../data';
import type { FilterId, GameState, SortId } from '../engine/game';
import { isBarred } from '../engine/game';
import { chainDiscount, cost, costSummary, funds, onGoal, visibleAdvances } from '../engine/selectors';
import { Icon } from '../components/Icon';
import { advanceColors } from '../components/ui';
import { useGame } from '../state/store';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'unowned', label: 'Unowned' },
  { id: 'affordable', label: 'Affordable' },
  { id: 'almostAffordable', label: 'Within reach' },
  { id: 'goal', label: 'Goal' },
  { id: 'owned', label: 'Owned' },
  { id: 'all', label: 'All' },
];

export const SORTS: { id: SortId; label: string }[] = [
  { id: 'alpha', label: 'Name' },
  { id: 'cost', label: 'Cost' },
  { id: 'vp', label: 'VP' },
  { id: 'economy', label: 'VP per cost' },
  { id: 'discount', label: 'Discount' },
  { id: 'color', label: 'Color' },
  { id: 'chains', label: 'Chains' },
];

const FREE_PICK_TEXT = {
  cheapScience: { source: 'Anatomy', text: 'Take one Science advance priced under 100 for free.' },
  oneVP: { source: 'Primal Philosophy', text: 'Take one 1-VP advance for free.' },
};

export function AdvancesView({ onOpen, onFunds }: { onOpen: (name: string) => void; onFunds: () => void }) {
  const { game, dispatch } = useGame();
  const listing = visibleAdvances(game);
  const available = funds(game);
  const setView = (view: Partial<GameState['view']>) => dispatch({ type: 'setView', view });

  return (
    <>
      {game.freePick ? (
        <div className="notice notice-accent" role="status">
          <Icon name="specials" />
          <div className="grow">
            <strong>{FREE_PICK_TEXT[game.freePick].source}:</strong> {FREE_PICK_TEXT[game.freePick].text}
          </div>
          <button type="button" className="btn btn-quiet" onClick={() => dispatch({ type: 'skipFreePick' })}>
            Skip
          </button>
        </div>
      ) : (
        <div className="toolbar">
          <label className="picker">
            <span className="picker-label">Show</span>
            <select aria-label="Show" value={game.view.filter} onChange={(e) => setView({ filter: e.target.value as FilterId })}>
              {FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" />
          </label>
          <label className="picker">
            <span className="picker-label">Sort</span>
            <select aria-label="Sort" value={game.view.sort} onChange={(e) => setView({ sort: e.target.value as SortId })}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" />
          </label>
          <button
            type="button"
            className="picker picker-funds"
            aria-label={available > 0 ? `Funds to spend ${available}. Edit your hand` : 'Add your trade cards and treasury'}
            onClick={onFunds}
          >
            <span className="picker-label">Funds</span>
            <span className="picker-value num">{available > 0 ? available : 'Add'}</span>
            <Icon name="wallet" />
          </button>
        </div>
      )}

      {listing.advances.length === 0 ? (
        <p className="empty">{emptyMessage(listing.filter, available, game.goal.length > 0)}</p>
      ) : (
        <ul className="adv-list">
          {listing.advances.map((a) => (
            <AdvanceRow key={a.name} game={game} advance={a} chainStart={listing.chainStarts.has(a.name)} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </>
  );
}

function emptyMessage(filter: string, available: number, hasGoal: boolean) {
  if (filter === 'owned') return 'You have not bought any Advances yet.';
  if (filter === 'goal')
    return hasGoal ? 'You own every Advance on your goal.' : 'Your goal is empty. Add Advances on the Goal tab, or from an Advance’s details.';
  if ((filter === 'affordable' || filter === 'almostAffordable') && available > 0)
    return 'Nothing fits your remaining funds.';
  return 'No Advances to show.';
}

export function AdvanceRow({
  game,
  advance: a,
  chainStart = false,
  onOpen,
  action,
  goalMark = true,
}: {
  game: GameState;
  advance: Advance;
  chainStart?: boolean;
  onOpen: (n: string) => void;
  /** A button at the end of the row, such as adding or removing it from the goal. */
  action?: ReactNode;
  /** Flag the row when it is on the goal (not needed in the goal list itself). */
  goalMark?: boolean;
}) {
  const { dispatch } = useGame();
  const owned = game.owned.includes(a.name);
  const goal = goalMark && !owned && onGoal(game, a.name);
  const barred = !owned && isBarred(game, a.name);
  const picked = game.considering.includes(a.name);
  const c = cost(game, a);
  const discount = a.price - c;
  const fromChain = chainDiscount(game, a);
  const credits = COLORS.filter((col) => a.credits[col]);
  const classes = ['adv', owned && 'owned', barred && 'barred', chainStart && 'chain-start'].filter(Boolean).join(' ');

  return (
    <li className={classes} style={advanceColors(a)}>
      <button
        type="button"
        className="adv-field"
        aria-pressed={owned || picked}
        disabled={owned || barred}
        aria-label={owned ? `${a.name}, owned` : barred ? `${a.name} needs 10 credits in one color` : `${picked ? 'Remove' : 'Add'} ${a.name}, cost ${c}`}
        onClick={() => dispatch({ type: 'toggleConsider', name: a.name })}
      >
        <span className="coin">{owned ? <Icon name="check" /> : barred ? <Icon name="lock" /> : c}</span>
      </button>
      <button type="button" className="adv-body" onClick={() => onOpen(a.name)}>
        <span className="adv-main">
          <span className="adv-name">
            {goal && (
              <span className="adv-goal">
                <Icon name="flag" label="On your goal:" />
              </span>
            )}
            {a.name}
          </span>
          {(credits.length > 0 || a.calamities.length > 0) && (
            <span className="adv-tags">
              {credits.length > 0 && (
                <span className="adv-credits">
                  {credits.map((col) => (
                    <span key={col} className={`adv-credit c-${col}`} aria-label={`${COLOR_NAMES[col]} credit ${a.credits[col]}`}>
                      {a.credits[col]}
                    </span>
                  ))}
                </span>
              )}
              {a.calamities.map((i) => (
                <span key={i.calamity} className={`tag tag-${i.direction}`}>
                  <Icon name={i.direction === 'advantage' ? 'up' : 'down'} />
                  {i.calamity}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="adv-meta">
          <span className="adv-vp">
            {a.vp}
            <small>VP</small>
          </span>
          {owned ? (
            <span className="adv-price">Owned</span>
          ) : (
            discount > 0 && (
              <span className="adv-price">
                {fromChain > 0 && <span className="adv-chain">{a.prev}</span>}
                <span className="adv-discount">−{discount}</span>
              </span>
            )
          )}
        </span>
      </button>
      {action}
    </li>
  );
}

export function Cart() {
  const { game, dispatch } = useGame();
  const summary = costSummary(game);
  const building = summary.building;
  if (summary.lines.length === 0 && !building) return null;
  const available = funds(game);
  const remaining = available - summary.total;
  const notes: string[] = [];
  for (const l of summary.lines) {
    if (l.advance.bonus) notes.push(l.advance.bonus);
    if (l.advance.warningTFA && COLORS.some((c) => game.credits[c] < 10))
      notes.push('Your credit exchange choices with The Four Arts will be limited.');
  }

  return (
    <section className="cart" aria-label="Advances you are considering">
      <div className="cart-items">
        {summary.lines.map((l) => (
          <span key={l.advance.name} className="cart-item" style={advanceColors(l.advance)}>
            <span className="cart-field">
              <b className="mini-coin num">{l.free ? 'Free' : l.cost}</b>
            </span>
            <span className="cart-name">{l.advance.name}</span>
            <button type="button" aria-label={`Remove ${l.advance.name}`} onClick={() => dispatch({ type: 'toggleConsider', name: l.advance.name })}>
              <Icon name="close" />
            </button>
          </span>
        ))}
        {building && (
          <span className="cart-item cart-building">
            <span className="cart-field">
              <b className="mini-coin num">{building.cost}</b>
            </span>
            <span className="cart-name">{building.building.name}</span>
            <button type="button" aria-label={`Remove ${building.building.name}`} onClick={() => dispatch({ type: 'considerBuilding', id: null })}>
              <Icon name="close" />
            </button>
          </span>
        )}
      </div>
      <div className="cart-row">
        <div className="cart-total">
          <strong>{summary.total}</strong> <span className="sub">total</span>
          <div className="sub">
            {summary.libraryDiscount > 0 && <>Library saves {summary.libraryDiscount}. </>}
            {available > 0 && (
              <span className={remaining < 0 ? 'bad' : undefined}>
                {remaining < 0 ? `${-remaining} over your funds` : `${remaining} left over`}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            dispatch({ type: 'clearConsider' });
            dispatch({ type: 'considerBuilding', id: null });
          }}
        >
          Clear
        </button>
        <button type="button" className="btn btn-primary btn-buy" onClick={() => dispatch({ type: 'buy' })}>
          {game.freePick ? 'Take' : `Buy ${summary.lines.length + (building ? 1 : 0)}`}
        </button>
      </div>
      {(notes.length > 0 || !game.freePick) && (
        <p className="cart-warn">
          {notes.join(' ')}
          {!game.freePick && notes.length === 0 && 'Buy once per turn: add everything you want first.'}
        </p>
      )}
    </section>
  );
}

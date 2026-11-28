import type { CSSProperties, ReactNode } from 'react';
import type { Advance } from '../data';
import { buildingById, COLOR_NAMES, COLORS, SPECIAL_BUILDING_VP } from '../data';
import type { FilterId, GameState, SortId } from '../engine/game';
import { isBarred } from '../engine/game';
import { chainDiscount, cost, costSummary, funds, onGoal, payment, SPECIAL_BUILDING_NAME, visibleAdvances, worsenedCalamities } from '../engine/selectors';
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

      {listing.items.length === 0 ? (
        <p className="empty">{emptyMessage(listing.filter, available, game.goal.length > 0)}</p>
      ) : (
        <ul className="adv-list">
          {listing.items.map((item) =>
            item.kind === 'building' ? (
              <SpecialBuildingRow key={SPECIAL_BUILDING_NAME} cost={item.cost} chainStart={listing.chainStarts.has(SPECIAL_BUILDING_NAME)} />
            ) : (
            <AdvanceRow
              key={item.advance.name}
              game={game}
              advance={item.advance}
              chainStart={listing.chainStarts.has(item.advance.name)}
              onOpen={onOpen}
              goalMark={listing.filter !== 'goal'}
              action={
                listing.filter === 'goal' ? (
                  <button
                    type="button"
                    className="adv-action"
                    aria-label={`Remove ${item.advance.name} from your goal`}
                    onClick={() => dispatch({ type: 'toggleGoal', name: item.advance.name })}
                  >
                    <Icon name="close" />
                  </button>
                ) : undefined
              }
            />
            ),
          )}
        </ul>
      )}
    </>
  );
}

function emptyMessage(filter: string, available: number, hasGoal: boolean) {
  if (filter === 'owned') return 'You have not bought any Advances yet.';
  if (filter === 'goal')
    return hasGoal ? 'You own every Advance on your goal.' : 'Your goal is empty. Add Advances with “Add to goal” in an Advance’s details.';
  if ((filter === 'affordable' || filter === 'almostAffordable') && available > 0)
    return 'Nothing fits your remaining funds.';
  return 'No Advances to show.';
}

/** The Special Building has no card color, so its field is grey. */
const GREY: CSSProperties = {
  '--swatch-a': '#7b8088',
  '--swatch-b': '#7b8088',
  '--on-a': '#ffffff',
  '--on-b': '#ffffff',
} as CSSProperties;

/** The Special Building, bought with the Advances. Which building it is gets chosen after the purchase. */
function SpecialBuildingRow({ cost: price, chainStart }: { cost: number; chainStart: boolean }) {
  const { game, dispatch } = useGame();
  const picked = game.buildings.considering;
  const own = game.buildings.civ ? buildingById(game.buildings.civ) : undefined;
  const toggle = () => dispatch({ type: 'toggleSpecialBuilding' });
  return (
    <li className={`adv${chainStart ? ' chain-start' : ''}`} style={GREY}>
      <button type="button" className="adv-field" aria-pressed={picked} aria-label={`${picked ? 'Remove' : 'Add'} ${SPECIAL_BUILDING_NAME}, cost ${price}`} onClick={toggle}>
        <span className="coin">{price}</span>
      </button>
      <button type="button" className="adv-body" onClick={toggle}>
        <span className="adv-main">
          <span className="adv-name">{SPECIAL_BUILDING_NAME}</span>
          <span className="adv-tags">
            <span className="muted" style={{ fontSize: 13 }}>
              {own ? `${own.name} for ${own.civ}` : 'Choose the building after buying'}
            </span>
          </span>
        </span>
        <span className="adv-meta">
          <span className="adv-vp" aria-label={`${SPECIAL_BUILDING_VP.low} or ${SPECIAL_BUILDING_VP.high} victory points`}>
            {SPECIAL_BUILDING_VP.low}/{SPECIAL_BUILDING_VP.high}
            <small>VP</small>
          </span>
        </span>
      </button>
    </li>
  );
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
  const worse = owned ? new Set<string>() : worsenedCalamities(game);
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
              {a.calamities.map((i) => {
                const mitigates = i.direction === 'advantage' && worse.has(i.calamity);
                return (
                  <span
                    key={i.calamity}
                    className={`tag tag-${i.direction}${mitigates ? ' tag-mitigates' : ''}`}
                    title={mitigates ? `Offsets the ${i.calamity} penalty from Advances you own` : undefined}
                  >
                    <Icon name={i.direction === 'advantage' ? 'plus' : 'minus'} />
                    {i.calamity}
                  </span>
                );
              })}
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
  const paid = payment(game);
  const paidWith = [
    ...paid.sets.map((s) => `${s.commodity.name} ${s.value}`),
    ...(paid.treasury > 0 ? [`Treasury ${paid.treasury}${paid.treasuryValue !== paid.treasury ? ` (worth ${paid.treasuryValue})` : ''}`] : []),
  ];
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
            <span className="cart-name">{SPECIAL_BUILDING_NAME}</span>
            <button type="button" aria-label={`Remove ${SPECIAL_BUILDING_NAME}`} onClick={() => dispatch({ type: 'toggleSpecialBuilding' })}>
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
            if (building) dispatch({ type: 'toggleSpecialBuilding' });
          }}
        >
          Clear
        </button>
        <button type="button" className="btn btn-primary btn-buy" onClick={() => dispatch({ type: 'buy' })}>
          {game.freePick ? 'Take' : `Buy ${summary.lines.length + (building ? 1 : 0)}`}
        </button>
      </div>
      {summary.total > 0 && remaining >= 0 && paidWith.length > 0 && <p className="cart-pay">Pay with {paidWith.join(', ')}</p>}
      {(notes.length > 0 || !game.freePick) && (
        <p className="cart-warn">
          {notes.join(' ')}
          {!game.freePick && notes.length === 0 && 'Buy once per turn: add everything you want first.'}
        </p>
      )}
    </section>
  );
}

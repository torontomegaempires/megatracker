import { useEffect, useRef, useState } from 'react';
import type { Commodity } from '../data';
import { buildingById, commoditiesFor, commodityById, rulesFor, setValue } from '../data';
import { buildingsOn, calamityDescription, cityModifiers, fundsBreakdown, ownedTradePowers, potentialCities, specialAbilities, tradeCardCost, visibleCalamities } from '../engine/selectors';
import { Icon } from '../components/Icon';
import { RulesText, Segmented, Stepper } from '../components/ui';
import { TOKEN_POOL } from '../engine/game';
import { useGame } from '../state/store';
import { BuildingsView, confirmSacrifice } from './BuildingsView';

function BoardInputs() {
  const { game, dispatch } = useGame();
  return (
    <div className="panel">
      <div className="field">
        <label>Cities on the map</label>
        <Stepper label="cities" value={game.board.cities} min={0} max={9} onChange={(cities) => dispatch({ type: 'setBoard', board: { cities } })} />
      </div>
      <TokenInput />
    </div>
  );
}

/** Population tokens, entered either as the count on the map or as what's left in reserve. */
function TokenInput() {
  const { game, dispatch } = useGame();
  const { tokens, tokensAsReserve: reserve } = game.board;
  const shown = reserve ? TOKEN_POOL - tokens : tokens;
  const other = TOKEN_POOL - tokens;
  return (
    <div className="field stack">
      <label>
        Population tokens
        <span className="hint num">
          {reserve ? `${tokens} on the map` : `${other} in reserve`} of {TOKEN_POOL}
        </span>
      </label>
      <div className="token-entry">
        <Segmented
          label="Count tokens"
          value={reserve ? 'reserve' : 'map'}
          options={[
            { value: 'map', label: 'On map' },
            { value: 'reserve', label: 'In reserve' },
          ]}
          onChange={(m) => dispatch({ type: 'setBoard', board: { tokensAsReserve: m === 'reserve' } })}
        />
        <Stepper
          editable
          label={reserve ? 'tokens in reserve' : 'tokens on the map'}
          value={shown}
          min={0}
          max={TOKEN_POOL}
          onChange={(n) => dispatch({ type: 'setBoard', board: { tokens: reserve ? TOKEN_POOL - n : n } })}
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- cities

export function CitiesView({ onPurchase }: { onPurchase: () => void }) {
  const { game } = useGame();
  const est = potentialCities(game);
  const mods = cityModifiers(game);
  return (
    <>
      <div className="page-head">
        <h2>Build cities</h2>
      </div>
      <BoardInputs />
      <div className="panel" aria-live="polite">
        {est.lacking ? (
          <div className="result">
            <div className="big bad">!</div>
            <div className="label">You don't have enough tokens to support the cities you already have.</div>
          </div>
        ) : (
          <div className="result">
            <div className="big">{est.build}</div>
            <div className="label">
              new {est.build === 1 ? 'city' : 'cities'} at best, with {est.spare} {est.spare === 1 ? 'token' : 'tokens'} to spare
            </div>
          </div>
        )}
        <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
          {mods.length ? `Includes ${mods.join(', ')}.` : 'No owned Advances change this.'} Assumes tokens are where you need them.
        </p>
      </div>
      {buildingsOn(game) && <BuildingsView onPurchase={onPurchase} />}
    </>
  );
}

// ------------------------------------------------------------------ trade

export function TradeView({ focusHand, onFocused }: { focusHand?: boolean; onFocused?: () => void }) {
  const handRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!focusHand || !handRef.current) return;
    // The header is sticky, so scroll the hand to just below it.
    const header = document.querySelector<HTMLElement>('.topbar')?.offsetHeight ?? 0;
    window.scrollTo({ top: handRef.current.getBoundingClientRect().top + window.scrollY - header - 8 });
    onFocused?.();
  }, [focusHand, onFocused]);

  return (
    <>
      <div className="page-head">
        <h2>Trade</h2>
      </div>
      <h3 className="group-head" id="hand" ref={handRef}>
        Your hand
      </h3>
      <FundsSummary />
      <TreasuryInput />
      <HandList />
      <BuildingSacrifice />
      <CommodityPicker />
    </>
  );
}

/** Trade card stacks you may buy extra cards from, for the Specials tab. */
function TradeStacks() {
  const { game } = useGame();
  const powers = ownedTradePowers(game);
  const literature = rulesFor(game.block).rules === 'fe' && game.owned.includes('Literature');
  return (
    <>
      <div className="page-head">
        <h2>Extra trade cards</h2>
      </div>
      <p className="muted" style={{ margin: '0 2px 8px', fontSize: 14 }}>
        After all players have drawn trade cards, you may buy more from these stacks, paying from your treasury ({game.funding.treasury}).
      </p>
      <ul className="rows">
        {powers.map((t, i) => (
          <li key={i} className="trade-row">
            <div className="row-main">
              {typeof t.stack === 'number' && t.stack === 10 ? (
                <RulesText html={t.text ?? ''} />
              ) : (
                <>
                  <div className="row-title">
                    <RulesText as="span" html={`Stack ${t.stack}`} />
                  </div>
                  {t.text && <p className="muted" style={{ fontSize: 14 }}>{t.text}</p>}
                </>
              )}
              <div className="row-meta">
                <span className="badge">{t.advance ?? t.label}</span>
              </div>
            </div>
            {!(typeof t.stack === 'number' && t.stack === 10) && (
              <div className="price">
                <strong>{tradeCardCost(game, t.tokens)}</strong>
                tokens
              </div>
            )}
          </li>
        ))}
      </ul>
      {literature && <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>Prices include the Literature discount.</p>}
    </>
  );
}

function FundsSummary() {
  const { game } = useGame();
  const f = fundsBreakdown(game);
  const doubler = rulesFor(game.block).treasuryDoubler;
  const parts = [`cards ${f.cards}`, f.treasuryMultiplier === 2 ? `treasury ${f.treasuryValue} (doubled by ${doubler})` : `treasury ${f.treasuryValue}`];
  return (
    <div className="funds-total" aria-live="polite">
      <div className="funds-total-row">
        <span>Funds to spend</span>
        <strong>{f.total}</strong>
      </div>
      <div className="funds-total-sub">
        {parts.join(' + ')}
        {f.heldCards > 0 && (
          <>
            <br />
            Keeping {f.heldCards} {f.heldCards === 1 ? 'card' : 'cards'} worth {f.held} for next turn
          </>
        )}
        {f.substitution && (
          <>
            <br />
            Counting 1 {f.substitution.substitute.name} as {f.substitution.set.name} ({f.substitution.advance}) adds {f.substitution.gain}
          </>
        )}
        {f.buildingCards && f.buildingCards.used > 0 && (
          <>
            <br />
            Sacrificing {f.buildingCards.used === 1 ? '1 building' : `${f.buildingCards.used} buildings`} as{' '}
            {f.buildingCards.sets.map((s) => `${s.cards} ${s.set.name}`).join(' and ')} adds {f.buildingCards.gain}
          </>
        )}
      </div>
    </div>
  );
}

function TreasuryInput() {
  const { game, dispatch } = useGame();
  const doubler = rulesFor(game.block).treasuryDoubler;
  const doubled = game.owned.includes(doubler);
  return (
    <div className="panel">
      <div className="field">
        <label>
          Treasury
          <span className="hint">{doubled ? `Counts double for Advances (${doubler})` : 'Tokens in your treasury'}</span>
        </label>
        <Stepper
          editable
          label="treasury tokens"
          value={game.funding.treasury}
          min={0}
          max={TOKEN_POOL}
          onChange={(treasury) => dispatch({ type: 'setTreasury', treasury })}
        />
      </div>
    </div>
  );
}

/** Commodity cards can be kept after buying Advances up to this many. */
const HAND_LIMIT = 8;

function HandList() {
  const { game, dispatch } = useGame();
  const { hand, held } = game.funding;
  // Use this game's deck for the most cards of each commodity; other ids fall back to any edition.
  const deck = new Map(commoditiesFor(game.block, game.playerCount).map((c) => [c.id, c]));
  const items = Object.entries(hand)
    .map(([id, n]) => ({ c: deck.get(id) ?? commodityById(id), n }))
    .filter((x): x is { c: Commodity; n: number } => !!x.c)
    .sort((a, b) => a.c.value - b.c.value || a.c.name.localeCompare(b.c.name));
  const f = fundsBreakdown(game);

  if (items.length === 0) {
    return <p className="hand-empty">No commodity cards yet. Pick the ones you have below.</p>;
  }
  return (
    <>
      <ul className="rows hand-list" aria-label="Commodity cards in your hand">
        {items.map(({ c, n }) => {
          const isHeld = held.includes(c.id);
          const sub = f.substitution;
          const fromBuildings = f.buildingCards?.sets.find((s) => s.set.id === c.id)?.cards ?? 0;
          const counted = (sub?.set.id === c.id ? n + 1 : sub?.substitute.id === c.id ? n - 1 : n) + fromBuildings;
          return (
            <li key={c.id} className={`hand-row${isHeld ? ' is-held' : ''}`}>
              <span className="stack-num card-tile" style={{ background: c.color, color: c.onColor }} aria-label={`Face value ${c.value}`}>
                {c.value}
              </span>
              <span className="row-main">
                <span className="row-title">{c.name}</span>
                <span className="hand-worth">
                  {isHeld ? 'Kept · ' : ''}worth <b className="num">{setValue(c.value, counted)}</b>
                  {sub?.set.id === c.id && <> +1 {sub.substitute.name}</>}
                  {sub?.substitute.id === c.id && <> · 1 as {sub.set.name}</>}
                  {fromBuildings > 0 && <> +{fromBuildings === 1 ? '1 building' : `${fromBuildings} buildings`}</>}
                </span>
              </span>
              <Stepper label={`${c.name} cards`} value={n} min={0} max={Math.max(c.max, n)} onChange={(count) => dispatch({ type: 'setCommodity', id: c.id, count })} />
              <button type="button" className="chip hold-chip" aria-pressed={isHeld} onClick={() => dispatch({ type: 'toggleHeld', id: c.id })}>
                {isHeld ? 'Kept' : 'Keep'}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="hand-foot">
        <span className="muted">
          Keep a set for next turn; it won't count toward funds.
          {f.heldCards > HAND_LIMIT && (
            <strong className="bad"> You can keep only {HAND_LIMIT} commodity cards after buying.</strong>
          )}
        </span>
        <button type="button" className="btn btn-quiet" onClick={() => dispatch({ type: 'clearHand' })}>
          Clear
        </button>
      </div>
    </>
  );
}

/** Controlled special buildings to sacrifice as commodity cards with this purchase. */
function BuildingSacrifice() {
  const { game, dispatch } = useGame();
  if (!buildingsOn(game) || game.buildings.controlled.length === 0) return null;
  const { controlled, sacrificing } = game.buildings;
  const cards = fundsBreakdown(game).buildingCards;
  const unused = cards ? cards.sacrificed - cards.used : 0;
  return (
    <div className="panel picker">
      <h4 className="picker-head">Sacrifice special buildings</h4>
      <p className="muted" style={{ fontSize: 13, margin: '0 0 8px' }}>
        Each counts as 1 card of an incomplete set you turn in, and leaves the board when you buy. You lose its VP.
      </p>
      <div className="chips">
        {controlled.map((id) => (
          <button key={id} type="button" className="chip" aria-pressed={sacrificing.includes(id)} onClick={() => dispatch({ type: 'toggleSacrifice', id })}>
            {buildingById(id)!.name}
          </button>
        ))}
      </div>
      {unused > 0 && (
        <p className="bad" style={{ fontSize: 13, marginTop: 8 }}>
          {cards!.used === 0
            ? 'No incomplete set to add to: these buildings would add nothing.'
            : `Only ${cards!.used} can join an incomplete set; the other ${unused === 1 ? 'adds' : `${unused} add`} nothing.`}
        </p>
      )}
    </div>
  );
}

function CommodityPicker() {
  const { game, dispatch } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const list = commoditiesFor(game.block, game.playerCount);
  const stacks = [...new Set(list.map((c) => c.value))];
  const hand = game.funding.hand;
  return (
    <div className="panel picker">
      <h4 className="picker-head">Add commodity cards</h4>
      {stacks.map((value) => {
        const here = list.filter((c) => c.value === value);
        const picked = here.find((c) => c.id === open);
        return (
          <div key={value} className="picker-stack">
            <div className="picker-row">
              <span className="stack-num" aria-label={`Face value ${value}`}>
                {value}
              </span>
              <div className="chips">
                {here.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="chip"
                    aria-expanded={open === c.id}
                    aria-pressed={open === c.id}
                    onClick={() => setOpen(open === c.id ? null : c.id)}
                  >
                    <span className="card-swatch" style={{ background: c.color }} aria-hidden="true" />
                    {c.name}
                    {hand[c.id] ? <span className="chip-count num">×{hand[c.id]}</span> : null}
                  </button>
                ))}
              </div>
            </div>
            {picked && (
              <div className="qty" role="group" aria-label={`How many ${picked.name} cards?`}>
                <div className="qty-head">How many {picked.name}?</div>
                <div className="qty-grid">
                  {Array.from({ length: picked.max + (hand[picked.id] ? 1 : 0) }, (_, i) => (hand[picked.id] ? i : i + 1)).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="qty-btn"
                      aria-pressed={(hand[picked.id] ?? 0) === n}
                      onClick={() => {
                        dispatch({ type: 'setCommodity', id: picked.id, count: n });
                        setOpen(null);
                      }}
                    >
                      <span className="qty-n num">{n === 0 ? 'None' : n}</span>
                      {n > 0 && <span className="qty-v num">{setValue(picked.value, n)}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------- calamities

export function CalamitiesView({ onOpen }: { onOpen: (name: string) => void }) {
  const { game, dispatch } = useGame();
  const v = game.view.calamities;
  const toggle = (k: keyof typeof v) => dispatch({ type: 'setView', view: { calamities: { ...v, [k]: !v[k] } } });
  const list = visibleCalamities(game);
  return (
    <>
      <div className="page-head">
        <h2>Calamities</h2>
      </div>
      <CalamityBuilding />
      <div className="toggles" role="group" aria-label="Show">
        <button type="button" className="chip" aria-pressed={v.major} onClick={() => toggle('major')}>
          Major
        </button>
        <button type="button" className="chip" aria-pressed={v.minor} onClick={() => toggle('minor')}>
          Minor
        </button>
        <button type="button" className="chip" aria-pressed={v.unowned} onClick={() => toggle('unowned')}>
          Include unowned Advances
        </button>
      </div>
      {list.length === 0 ? (
        <p className="empty">Choose Major or Minor to list calamities.</p>
      ) : (
        <ul className="rows">
          {list.map((c) => (
            <li key={c.name} className={`cat-${c.category}`}>
              <button type="button" className="row-btn" onClick={() => onOpen(c.name)}>
                <span className="stack-num" aria-label={`Stack ${c.stack}`}>
                  {c.stack}
                </span>
                <span className="row-main">
                  <span className="row-title">{c.name}</span>
                  {c.category === 'minor' ? (
                    <span className="muted" style={{ display: 'block', fontSize: 14 }}>
                      <RulesText as="span" html={calamityDescription(game, c)} />
                    </span>
                  ) : (
                    <span className="adv-tags">
                      {c.advances.map((i) => (
                        <span key={i.advance} className={`tag tag-${i.direction}${game.owned.includes(i.advance) ? '' : ' tag-unowned'}`}>
                          <Icon name={i.direction === 'advantage' ? 'plus' : 'minus'} />
                          {i.advance}
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="row-meta">
                    {c.category === 'tradeable' && <span className="badge">Tradeable</span>}
                    {c.secondaryVictims && <span className="badge">Secondary victims</span>}
                    {c.beneficiary === 'trader' && <span className="badge">Trader benefits</span>}
                    {c.beneficiary === 'mostCitiesInStock' && <span className="badge">Most cities in stock benefits</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** The building you own and control can be sacrificed to soften one calamity. */
function CalamityBuilding() {
  const { game, dispatch } = useGame();
  const { owned, controlled } = game.buildings;
  if (!buildingsOn(game) || !owned || !controlled.includes(owned)) return null;
  const b = buildingById(owned)!;
  return (
    <div className="notice">
      <div className="grow">
        <strong>{b.name}:</strong> sacrifice it against one calamity to prevent up to 10 damage, the reduction of up to 2 cities, or 1 step
        of Regression.
      </div>
      <button type="button" className="btn" onClick={() => confirmSacrifice(b) && dispatch({ type: 'sacrificeBuilding', id: b.id })}>
        Sacrifice
      </button>
    </div>
  );
}

// --------------------------------------------------------------- specials

export function SpecialsView({ onActivated }: { onActivated: (goToAdvances: boolean) => void }) {
  const { game, dispatch } = useGame();
  const list = specialAbilities(game);
  return (
    <>
      <TradeStacks />
      <div className="page-head page-head-later">
        <h2>Special abilities</h2>
        <span className="muted">after calamities</span>
      </div>
      {list.length === 0 ? (
        <p className="empty">
          <Icon name="specials" />
          <br />
          None yet. Advances with special abilities show up here once you own them.
        </p>
      ) : (
        <ul className="rows">
          {list.map((s) => (
            <li key={s.advance.name} className="trade-row">
              <div className="row-main">
                <div className="row-title">{s.advance.name}</div>
                <p className="muted" style={{ fontSize: 14 }}>
                  {s.text}
                </p>
              </div>
              {s.advance.activate && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    dispatch({ type: 'activateSpecial', activation: s.advance.activate!, source: s.advance.name });
                    onActivated(s.advance.activate === 'oneVPAdvance');
                  }}
                >
                  Use
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

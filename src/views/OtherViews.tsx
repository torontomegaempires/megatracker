import { rulesFor } from '../data';
import { calamityDescription, cityModifiers, ownedTradePowers, potentialCities, specialAbilities, tradeCardCost, visibleCalamities } from '../engine/selectors';
import { Icon } from '../components/Icon';
import { RulesText, Segmented, Stepper } from '../components/ui';
import { TOKEN_POOL } from '../engine/game';
import { useGame } from '../state/store';

function BoardInputs({ tokens = true }: { tokens?: boolean }) {
  const { game, dispatch } = useGame();
  return (
    <div className="panel">
      <div className="field">
        <label>
          Cities on the map
          <span className="hint">Shared with the Trade tab</span>
        </label>
        <Stepper label="cities" value={game.board.cities} min={0} max={9} onChange={(cities) => dispatch({ type: 'setBoard', board: { cities } })} />
      </div>
      {tokens && <TokenInput />}
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

export function CitiesView() {
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
    </>
  );
}

// ------------------------------------------------------------------ trade

export function TradeView() {
  const { game } = useGame();
  const powers = ownedTradePowers(game);
  const cities = game.board.cities;
  return (
    <>
      <div className="page-head">
        <h2>Trade cards</h2>
      </div>
      <BoardInputs tokens={false} />
      <p className="muted" style={{ margin: '14px 2px 10px', fontSize: 14 }}>
        {cities > 0 ? `Besides drawing 1 card from ${cities === 1 ? 'stack 1' : `stacks 1–${cities}`}, after` : 'After'} all players have drawn
        trade cards, you may buy more from:
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
      {rulesFor(game.block).rules === 'fe' && game.owned.includes('Literature') && (
        <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>Prices include the Literature discount.</p>
      )}
    </>
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
                          <Icon name={i.direction === 'advantage' ? 'up' : 'down'} />
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

// --------------------------------------------------------------- specials

export function SpecialsView({ onActivated }: { onActivated: (goToAdvances: boolean) => void }) {
  const { game, dispatch } = useGame();
  const list = specialAbilities(game);
  return (
    <>
      <div className="page-head">
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

import { useState } from 'react';
import type { Calamity, Credits } from '../data';
import { COLOR_NAMES, COLORS, rulesFor } from '../data';
import { choiceCanTap, choicePrompt, choiceReady, choiceTap } from '../engine/credits';
import { isBarred, zeroCredits } from '../engine/game';
import { calamityDescription, chainDiscount, cost, creditFor } from '../engine/selectors';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { advanceColors, colorNames, CreditPills, RulesText } from '../components/ui';
import { useGame } from '../state/store';

// --------------------------------------------------------------- advance

export function AdvanceSheet({ name, onClose, onNavigate }: { name: string; onClose: () => void; onNavigate: (name: string) => void }) {
  const { game, dispatch } = useGame();
  const a = rulesFor(game.block).byName.get(name)!;
  const owned = game.owned.includes(a.name);
  const picked = game.considering.includes(a.name);
  const barred = !owned && isBarred(game, a.name);
  const goal = game.goal.includes(a.name);
  const c = cost(game, a);
  const fromCredits = Math.min(a.price, creditFor(game, a));
  const fromChain = chainDiscount(game, a);

  return (
    <Sheet
      title={a.name}
      subtitle={`${colorNames(a)} · ${a.vp} VP · price ${a.price}`}
      band={advanceColors(a)}
      onClose={onClose}
      footer={
        owned ? (
          <span className="muted" style={{ margin: 'auto' }}>
            <Icon name="check" /> You own this Advance
          </span>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-goal"
              aria-pressed={goal}
              onClick={() => dispatch({ type: 'toggleGoal', name: a.name })}
            >
              <Icon name="flag" />
              {goal ? 'On goal' : 'Add to goal'}
            </button>
            <button
              type="button"
              className={`btn ${picked ? '' : 'btn-primary'}`}
              disabled={barred}
              onClick={() => {
                dispatch({ type: 'toggleConsider', name: a.name });
                onClose();
              }}
            >
              {picked ? 'Remove from purchase' : barred ? 'Needs 10 credits in one color' : `Consider buying for ${c}`}
            </button>
          </>
        )
      }
    >
      {!owned && (
        <div className="section">
          <div className="facts">
            <div className="fact">
              <div className="label">Your cost</div>
              <div className="value">{c}</div>
            </div>
            <div className="fact">
              <div className="label">Credits</div>
              <div className="value">{fromCredits ? `−${fromCredits}` : 0}</div>
            </div>
            <div className="fact">
              <div className="label">Chain discount</div>
              <div className="value">{fromChain ? `−${fromChain}` : 0}</div>
            </div>
          </div>
        </div>
      )}

      {a.description && (
        <div className="section prose">
          <h3>Effect</h3>
          <RulesText html={a.description} />
        </div>
      )}

      {a.trade && (
        <div className="section prose">
          <h3>Trade cards</h3>
          {typeof a.trade === 'string' ? (
            <RulesText html={a.trade} />
          ) : (
            a.trade.map((t) => (
              <RulesText key={t.stack} html={`Buy cards from stack ${t.stack} for ${t.tokens} tokens each.${t.extra ? ` ${t.extra}` : ''}`} />
            ))
          )}
        </div>
      )}

      {a.special && (
        <div className="section prose">
          <h3>Special ability · after calamities</h3>
          <p>{a.special}</p>
        </div>
      )}

      {a.bonus && (
        <div className="section prose">
          <h3>On purchase</h3>
          <p>{a.bonus}</p>
        </div>
      )}

      {a.calamities.length > 0 && (
        <div className="section">
          <h3>Calamities</h3>
          <ul className="effects">
            {a.calamities.map((i) => (
              <li key={i.calamity}>
                <span className={`effect-dot ${i.direction}`} aria-hidden>
                  <Icon name={i.direction === 'advantage' ? 'plus' : 'minus'} />
                </span>
                <span className="who">
                  {i.calamity} <span className="visually-hidden">({i.direction})</span>
                </span>
                <span className="what">{i.effect}.</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="section">
        <h3>Gives credits</h3>
        <CreditPills credits={a.credits} />
      </div>

      {(a.prev || a.next) && (
        <div className="section">
          <h3>Strategic chain</h3>
          <div className="chain-nav">
            {a.prev ? (
              <button type="button" className="link-btn" onClick={() => onNavigate(a.prev!)}>
                <Icon name="chevronLeft" /> {a.prev}
              </button>
            ) : (
              <span />
            )}
            {a.next && (
              <button type="button" className="link-btn" onClick={() => onNavigate(a.next!)}>
                {a.next} <Icon name="chevronRight" />
              </button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

// -------------------------------------------------------------- calamity

const CATEGORY = { minor: 'Minor', tradeable: 'Major · tradeable', nontradeable: 'Major · non-tradeable' };

export function CalamitySheet({ name, onClose, onOpenAdvance }: { name: string; onClose: () => void; onOpenAdvance: (n: string) => void }) {
  const { game } = useGame();
  const c: Calamity = rulesFor(game.block).calamities.find((x) => x.name === name)!;
  return (
    <Sheet title={c.name} subtitle={`Stack ${c.stack} · ${CATEGORY[c.category]}`} onClose={onClose}>
      <div className="section prose">
        <RulesText html={calamityDescription(game, c)} />
      </div>
      {(c.secondaryVictims || c.beneficiary) && (
        <div className="section">
          <div className="row-meta">
            {c.secondaryVictims && <span className="badge">Secondary victims</span>}
            {c.beneficiary === 'trader' && <span className="badge">Beneficiary: the player who traded it</span>}
            {c.beneficiary === 'mostCitiesInStock' && <span className="badge">Beneficiary: most cities in stock</span>}
          </div>
        </div>
      )}
      {c.advances.length > 0 && (
        <div className="section">
          <h3>Advances that change it</h3>
          <ul className="effects">
            {c.advances.map((i) => {
              const owned = game.owned.includes(i.advance);
              return (
                <li key={i.advance} style={{ opacity: owned ? 1 : 0.7 }}>
                  <span className={`effect-dot ${i.direction}`} aria-hidden>
                    <Icon name={i.direction === 'advantage' ? 'plus' : 'minus'} />
                  </span>
                  <span className="who">
                    <button type="button" className="link-btn" style={{ padding: 0 }} onClick={() => onOpenAdvance(i.advance)}>
                      {i.advance}
                    </button>
                    {owned && <span className="badge" style={{ marginLeft: 6 }}>Owned</span>}
                  </span>
                  <span className="what">{i.effect}.</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Sheet>
  );
}

// -------------------------------------------------------- credit choice

export function CreditChoiceSheet() {
  const { game } = useGame();
  const head = game.queue[0];
  if (head?.kind !== 'choice') return null;
  // Keyed so each queued choice starts from a clean slate.
  return <CreditChoice key={`${game.queue.length}:${head.source}`} />;
}

function CreditChoice() {
  const { game, dispatch } = useGame();
  const head = game.queue[0] as Extract<(typeof game.queue)[number], { kind: 'choice' }>;
  const [delta, setDelta] = useState<Credits>(zeroCredits);
  const ready = choiceReady(head.amount, delta);
  const title = head.amount === '10for40' || head.amount === '10for10' ? 'Exchange credits' : 'Choose extra credits';

  return (
    <Sheet
      title={title}
      subtitle={`From ${head.source}`}
      onClose={head.cancelable ? () => dispatch({ type: 'cancelChoice' }) : undefined}
      footer={
        <>
          <button type="button" className="btn" onClick={() => setDelta(zeroCredits())}>
            Reset
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!ready}
            onClick={() => dispatch({ type: 'resolveChoice', delta })}
          >
            Done
          </button>
        </>
      }
    >
      <p className="prose" style={{ marginBottom: 14 }}>
        {choicePrompt(head.amount)}
      </p>
      <div className="chooser">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`c-${c}`}
            disabled={!choiceCanTap(head.amount, game.credits, delta, c)}
            onClick={() => setDelta(choiceTap(head.amount, game.credits, delta, c))}
          >
            <span className="name">{COLOR_NAMES[c]}</span>
            <span className={`delta ${delta[c] < 0 ? 'bad' : ''}`}>{delta[c] > 0 ? `+${delta[c]}` : delta[c]}</span>
            <span className="have">have {game.credits[c]}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

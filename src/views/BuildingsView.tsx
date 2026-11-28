import { useState } from 'react';
import type { SpecialBuilding } from '../data';
import { buildingById, buildingCost, buildingsIn } from '../data';
import { buildingPoints } from '../engine/selectors';
import { Icon } from '../components/Icon';
import { NationSwatch } from '../components/ui';
import { useGame } from '../state/store';

const byCiv = (b: SpecialBuilding) => `${b.civ} · ${b.name}`;

/** Asks before sacrificing a building outside a purchase, since it can't be taken back. */
export function confirmSacrifice(b: SpecialBuilding): boolean {
  return window.confirm(`Sacrifice the ${b.name}? It leaves the board, and you lose its VP.`);
}

/** Your special building, the others you control and their VP, below city building on the Cities tab. */
export function BuildingsView({ onPurchase }: { onPurchase: () => void }) {
  const { game } = useGame();
  const points = buildingPoints(game)!;

  return (
    <>
      <div className="page-head page-head-later">
        <h2>Special buildings</h2>
        <span className="muted num">{points.total} VP</span>
      </div>

      <h3 className="group-head">In your region</h3>
      <OwnBuilding onPurchase={onPurchase} />

      <h3 className="group-head">Others you control</h3>
      <OtherBuildings />
    </>
  );
}

function OwnBuilding({ onPurchase }: { onPurchase: () => void }) {
  const { game, dispatch } = useGame();
  const b = game.buildings;
  const cost = buildingCost(b.era);
  // Anything not already on the board can be built; suggest your own civilization's first.
  const available = buildingsIn(game.block).filter((x) => !b.controlled.includes(x.id));
  const [picked, setPick] = useState('');
  const pick = picked || (b.civ && available.some((x) => x.id === b.civ) ? b.civ : '');
  const chosen = available.find((x) => x.id === pick);

  if (b.owned) {
    const owned = buildingById(b.owned)!;
    const controlled = b.controlled.includes(owned.id);
    return (
      <ul className="rows">
        <li className="trade-row">
          <div className="row-main">
            <div className="row-title">{owned.name}</div>
            <div className="row-meta">
              <span className="badge">
                <NationSwatch nation={owned.civ} />
                {owned.civ}
              </span>
              <span className="badge">Owned</span>
              {!controlled && <span className="badge">Not controlled</span>}
            </div>
          </div>
          <button type="button" className="chip" aria-pressed={controlled} onClick={() => dispatch({ type: 'toggleControl', id: owned.id })}>
            Controlled
          </button>
          {controlled && (
            <button type="button" className="btn btn-quiet" onClick={() => confirmSacrifice(owned) && dispatch({ type: 'sacrificeBuilding', id: owned.id })}>
              Sacrifice
            </button>
          )}
        </li>
      </ul>
    );
  }

  if (b.considering) {
    return (
      <ul className="rows">
        <li className="trade-row">
          <div className="row-main">
            <div className="row-title">Special Building</div>
            <div className="row-meta">
              <span className="badge">In your purchase · {cost}</span>
            </div>
          </div>
          <button type="button" className="btn btn-quiet" onClick={() => dispatch({ type: 'toggleSpecialBuilding' })}>
            Remove
          </button>
        </li>
      </ul>
    );
  }

  return (
    <div className="panel">
      <div className="field stack">
        <label htmlFor="building-pick">
          Build one
          <span className="hint">Add it to your purchase and choose the building afterwards, or pick the one already standing in your region and tap Already built.</span>
        </label>
        <span className="select-wrap">
          <select id="building-pick" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Choose a building</option>
            {available.map((x) => (
              <option key={x.id} value={x.id}>
                {byCiv(x)}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" />
        </span>
        <div className="building-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!!game.freePick}
            onClick={() => {
              dispatch({ type: 'toggleSpecialBuilding' });
              onPurchase();
            }}
          >
            Add to purchase · {cost}
          </button>
          <button type="button" className="btn" disabled={!chosen} onClick={() => dispatch({ type: 'setOwnedBuilding', id: pick })}>
            Already built
          </button>
        </div>
      </div>
    </div>
  );
}

function OtherBuildings() {
  const { game, dispatch } = useGame();
  const b = game.buildings;
  const others = b.controlled.filter((id) => id !== b.owned).map((id) => buildingById(id)!);
  const addable = buildingsIn(game.block).filter((x) => !b.controlled.includes(x.id) && x.id !== b.owned);

  return (
    <>
      {others.length > 0 && (
        <ul className="rows" style={{ marginBottom: 10 }}>
          {others.map((x) => (
            <li key={x.id} className="trade-row">
              <div className="row-main">
                <div className="row-title">{x.name}</div>
                <div className="row-meta">
                  <span className="badge">
                    <NationSwatch nation={x.civ} />
                    {x.civ}
                  </span>
                </div>
              </div>
              <button type="button" className="btn btn-quiet" onClick={() => dispatch({ type: 'toggleControl', id: x.id })}>
                Lost control
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="panel">
        <div className="field stack">
          <label htmlFor="building-control">
            Add a building you control
            <span className="hint">You have a city or token majority in its area</span>
          </label>
          <span className="select-wrap">
            <select
              id="building-control"
              value=""
              onChange={(e) => e.target.value && dispatch({ type: 'toggleControl', id: e.target.value })}
            >
              <option value="">Choose a building</option>
              {addable.map((x) => (
                <option key={x.id} value={x.id}>
                  {byCiv(x)}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" />
          </span>
        </div>
      </div>
    </>
  );
}

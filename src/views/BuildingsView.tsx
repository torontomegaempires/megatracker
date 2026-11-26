import { useState } from 'react';
import type { SpecialBuilding } from '../data';
import { BUILDING_ERAS, buildingById, buildingCost, buildingsIn } from '../data';
import type { BuildingEra } from '../data';
import { buildingPoints } from '../engine/selectors';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/ui';
import { useGame } from '../state/store';

const byCiv = (b: SpecialBuilding) => `${b.civ} · ${b.name}`;

/** Asks before sacrificing a building outside a purchase, since it can't be taken back. */
export function confirmSacrifice(b: SpecialBuilding): boolean {
  return window.confirm(`Sacrifice the ${b.name}? It leaves the board, and you lose its VP.`);
}

/** Your special building, the others you control and their VP, below city building on the Cities tab. */
export function BuildingsView({ onPurchase }: { onPurchase: () => void }) {
  const { game, dispatch } = useGame();
  const b = game.buildings;
  const points = buildingPoints(game)!;
  const civ = b.civ ? buildingById(b.civ) : undefined;

  return (
    <>
      <div className="page-head page-head-later">
        <h2>Special buildings</h2>
        <span className="muted num">{points.total} VP</span>
      </div>

      <div className="panel">
        <div className="field">
          <label htmlFor="building-civ">
            Your civilization
            <span className="hint">Its building is worth 2 more VP to you</span>
          </label>
          <span className="select-wrap">
            <select
              id="building-civ"
              value={b.civ ?? ''}
              onChange={(e) => dispatch({ type: 'setBuildings', buildings: { civ: e.target.value || null } })}
            >
              <option value="">Choose</option>
              {buildingsIn(game.block).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.civ}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" />
          </span>
        </div>
        <div className="field stack">
          <label>
            Your era on the A.S.T.
            <span className="hint">Sets what a building costs: 30, 40 or 50</span>
          </label>
          <Segmented<BuildingEra>
            label="Your era on the A.S.T."
            value={b.era}
            onChange={(era) => dispatch({ type: 'setBuildings', buildings: { era } })}
            options={BUILDING_ERAS.map((e) => ({ value: e.id, label: e.label }))}
          />
        </div>
      </div>

      <h3 className="group-head">In your region</h3>
      <OwnBuilding onPurchase={onPurchase} />

      <h3 className="group-head">Others you control</h3>
      <OtherBuildings />

      <h3 className="group-head">Points and benefits</h3>
      <div className="panel prose buildings-rules">
        <p>
          <b>VP:</b> 2 for owning a building ({points.owned}), 1 for each you control ({points.controlled}), and 2 more for controlling{' '}
          {civ ? `the ${civ.name}` : 'your civilization’s'} ({points.historic}). Ties go first to whoever owns and controls their
          civilization’s building, then to whoever owns one.
        </p>
        <p>
          <b>Tax:</b> each building you control pays tax as if it were a city. <b>Population:</b> a city with a building supports 1 more
          token; an area without a city and a limit of 1 or 2 holds 1 more.
        </p>
        <p>
          <b>Calamities:</b> sacrifice the building you own and control to prevent up to 10 damage, the reduction of up to 2 cities, or 1
          step of Regression, against one calamity.
        </p>
        <p>
          <b>Trade:</b> sacrifice any you control as 1 card each of incomplete sets when buying (on the Trade tab).
        </p>
      </div>
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
              <span className="badge">{owned.civ}</span>
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
    const considering = buildingById(b.considering)!;
    return (
      <ul className="rows">
        <li className="trade-row">
          <div className="row-main">
            <div className="row-title">{considering.name}</div>
            <div className="row-meta">
              <span className="badge">{considering.civ}</span>
              <span className="badge">In your purchase · {cost}</span>
            </div>
          </div>
          <button type="button" className="btn btn-quiet" onClick={() => dispatch({ type: 'considerBuilding', id: null })}>
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
          <span className="hint">With your Advances, if one of your cities is in your own region</span>
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
            disabled={!chosen || !!game.freePick}
            onClick={() => {
              dispatch({ type: 'considerBuilding', id: pick });
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
  const addable = buildingsIn(game.block).filter((x) => !b.controlled.includes(x.id) && x.id !== b.owned && x.id !== b.considering);

  return (
    <>
      {others.length > 0 && (
        <ul className="rows" style={{ marginBottom: 10 }}>
          {others.map((x) => (
            <li key={x.id} className="trade-row">
              <div className="row-main">
                <div className="row-title">{x.name}</div>
                <div className="row-meta">
                  <span className="badge">{x.civ}</span>
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

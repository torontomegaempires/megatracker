import type { GoalId } from '../data';
import type { StrategyOption } from '../engine/game';
import { goalProgress, goalSuggestions, totalVictoryPoints } from '../engine/selectors';
import { Icon } from '../components/Icon';
import { useGame } from '../state/store';
import { AdvanceRow } from './AdvancesView';

const STRATEGIES: { id: GoalId; label: string }[] = [
  { id: 'advances', label: 'Cheaper Advances' },
  { id: 'treasury', label: 'More treasury' },
  { id: 'trade', label: 'Trade cards' },
  { id: 'bend', label: 'Bend the rules' },
  { id: 'tokens', label: 'More tokens on the map' },
  { id: 'mobility', label: 'Token mobility' },
  { id: 'cities', label: 'Build or hold cities' },
  { id: 'sea', label: 'Sea power' },
  { id: 'aggression', label: 'Aggression' },
  { id: 'defense', label: 'Defense' },
];

/** The Advances the player plans to buy over the game, and themed ideas for adding more. */
export function GoalView({ onOpen }: { onOpen: (name: string) => void }) {
  const { game, dispatch } = useGame();
  const progress = goalProgress(game);
  const suggestions = goalSuggestions(game);
  const total = game.goal.length;
  const toggle = (name: string) => dispatch({ type: 'toggleGoal', name });

  return (
    <>
      <div className="page-head">
        <h2>Goal</h2>
        {total > 0 && (
          <span className="muted">
            <span className="num">{progress.bought.length}</span> of <span className="num">{total}</span> bought
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className="goal-intro muted">
          Plan the Advances you want to buy over the game. They are flagged on the Advances tab, and the Goal filter there shows just
          them. Add them from the ideas below, or from any Advance’s details.
        </p>
      ) : (
        <>
          {progress.toBuy.length > 0 ? (
            <div className="facts goal-facts">
              <div className="fact">
                <div className="label">To buy</div>
                <div className="value">{progress.toBuy.length}</div>
              </div>
              <div className="fact">
                <div className="label">Cost today</div>
                <div className="value">{progress.costLeft}</div>
              </div>
              <div className="fact">
                <div className="label">VP when done</div>
                <div className="value">{totalVictoryPoints(game) + progress.vpLeft}</div>
              </div>
            </div>
          ) : (
            <p className="goal-intro">You own every Advance on your goal.</p>
          )}
          {progress.toBuy.length > 0 && (
            <ul className="adv-list">
              {progress.toBuy.map((a) => (
                <AdvanceRow
                  key={a.name}
                  game={game}
                  advance={a}
                  onOpen={onOpen}
                  goalMark={false}
                  action={<GoalButton name={a.name} on onClick={() => toggle(a.name)} />}
                />
              ))}
            </ul>
          )}
          {progress.bought.length > 0 && (
            <>
              <h3 className="group-head">Bought</h3>
              <ul className="adv-list">
                {progress.bought.map((a) => (
                  <AdvanceRow key={a.name} game={game} advance={a} onOpen={onOpen} />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <h3 className="group-head">Ideas</h3>
      <label className="select goal-theme">
        For
        <span className="select-wrap">
          <select value={game.view.strategy} onChange={(e) => dispatch({ type: 'setView', view: { strategy: e.target.value as StrategyOption } })}>
            {game.view.ast !== 'off' && <option value="ast">Reach the next AST age</option>}
            {STRATEGIES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" />
        </span>
      </label>
      {suggestions.length === 0 ? (
        <p className="empty">Every unowned Advance for this is already on your goal.</p>
      ) : (
        <ul className="adv-list">
          {suggestions.map((a) => (
            <AdvanceRow key={a.name} game={game} advance={a} onOpen={onOpen} action={<GoalButton name={a.name} on={false} onClick={() => toggle(a.name)} />} />
          ))}
        </ul>
      )}

      {total > 0 && (
        <button
          type="button"
          className="btn btn-quiet btn-danger btn-block goal-clear"
          onClick={() => {
            if (window.confirm('Clear your goal? This removes every Advance from it.')) dispatch({ type: 'clearGoal' });
          }}
        >
          Clear goal
        </button>
      )}
    </>
  );
}

function GoalButton({ name, on, onClick }: { name: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className="adv-action" aria-label={on ? `Remove ${name} from your goal` : `Add ${name} to your goal`} onClick={onClick}>
      <Icon name={on ? 'close' : 'plus'} />
    </button>
  );
}

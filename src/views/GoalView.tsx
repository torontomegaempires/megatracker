import { goalProgress, victoryPoints } from '../engine/selectors';
import { Icon } from '../components/Icon';
import { useGame } from '../state/store';
import { AdvanceRow } from './AdvancesView';

/** The Advances the player plans to buy over the game. */
export function GoalView({ onOpen }: { onOpen: (name: string) => void }) {
  const { game, dispatch } = useGame();
  const progress = goalProgress(game);
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
          Plan the Advances you want to buy over the game. Add them with “Add to goal” in any Advance’s details. They are flagged
          on the Advances tab, and the Goal filter there shows just them.
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
                <div className="value">{victoryPoints(game) + progress.vpLeft}</div>
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

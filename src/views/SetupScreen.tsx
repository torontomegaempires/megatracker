import { useState } from 'react';
import type { BlockId } from '../data';
import { BLOCKS } from '../data';
import { PLAYER_COUNTS, startingCredits } from '../engine/game';
import { Segmented } from '../components/ui';
import { useStore } from '../state/store';
import { versionLabel } from '../version';

const MARKS: Record<BlockId, string> = { west: 'W', east: 'E', fareast: 'FE' };

export function SetupScreen() {
  const { dispatch } = useStore();
  const [block, setBlock] = useState<BlockId | null>(null);
  const [players, setPlayers] = useState<number | null>(null);
  const credits = players === null ? 0 : startingCredits(players);

  return (
    <main className="setup">
      <header className="setup-hero">
        <h1>Megatracker</h1>
        <p>Your Civilization Advances, credits, trade and calamities for Mega Empires.</p>
      </header>

      <h2 id="block-heading">Which block are you playing?</h2>
      <div className="block-options" role="group" aria-labelledby="block-heading">
        {(Object.keys(BLOCKS) as BlockId[]).map((id) => (
          <button key={id} type="button" className="block-option" aria-pressed={block === id} onClick={() => setBlock(id)}>
            <span className="mark" aria-hidden>
              {MARKS[id]}
            </span>
            <span>
              <span className="name">{BLOCKS[id].name}</span>
              <br />
              <span className="blurb">{BLOCKS[id].blurb}</span>
            </span>
          </button>
        ))}
      </div>

      <h2>How many players?</h2>
      <Segmented
        label="Player count"
        value={players ?? -1}
        onChange={setPlayers}
        options={PLAYER_COUNTS.map((p) => ({ value: p.value as number, label: p.label }))}
      />
      {players !== null && (
        <p className="setup-note">
          {credits > 0 ? `Everyone starts with ${credits} credits in each color.` : 'No starting credits.'}
          {block === 'fareast' && (players === 3 || players === 4) && ' Remember to take Cultural Heritage.'}
        </p>
      )}

      <div className="setup-cta">
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!block || players === null}
          onClick={() => block && players !== null && dispatch({ type: 'start', block, playerCount: players })}
        >
          Start the game
        </button>
      </div>

      <p className="credit-foot">
        Based on the Mega Empires Calculator by{' '}
        <a href="https://crawdad.neocities.org/MCA2/about.html" target="_blank" rel="noreferrer">
          Matt Crawford
        </a>
        . Megatracker {versionLabel}.
      </p>
    </main>
  );
}

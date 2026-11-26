import { useState } from 'react';
import type { BlockId } from '../data';
import { BLOCKS } from '../data';
import { startingCredits } from '../engine/game';
import { Segmented } from '../components/ui';
import { useStore } from '../state/store';
import { JoinSheet } from './SharedGameView';
import { versionLabel } from '../version';

export function SetupScreen({ joinCode, onJoinHandled }: { joinCode: string | null; onJoinHandled: () => void }) {
  const { dispatch } = useStore();
  const [joining, setJoining] = useState(!!joinCode);
  const [block, setBlock] = useState<BlockId | null>(null);
  const [players, setPlayers] = useState<number | null>(null);
  const [buildings, setBuildings] = useState(false);
  const credits = players === null ? 0 : startingCredits(players);
  const counts = block ? BLOCKS[block].playerCounts : [];

  // Each game has its own player counts, so a count from another game is cleared.
  const pickGame = (id: BlockId) => {
    setBlock(id);
    if (!BLOCKS[id].playerCounts.some((p) => p.value === players)) setPlayers(null);
  };

  return (
    <main className="setup">
      <header className="setup-hero">
        <h1>Megatracker</h1>
        <p>Your Civilization Advances, credits, trade and calamities for Mega Empires.</p>
      </header>

      <h2 id="block-heading">Which game are you playing?</h2>
      <div className="block-options" role="group" aria-labelledby="block-heading">
        {(Object.keys(BLOCKS) as BlockId[]).map((id) => (
          <button key={id} type="button" className={`block-option block-${id}`} aria-pressed={block === id} onClick={() => pickGame(id)}>
            <span className="mark" aria-hidden>
              {BLOCKS[id].mark}
            </span>
            <span className="name">{BLOCKS[id].name}</span>
          </button>
        ))}
      </div>

      <h2>How many players?</h2>
      {block ? (
        <Segmented
          label="Player count"
          columns={counts.length}
          value={players ?? -1}
          onChange={setPlayers}
          options={counts.map((p) => ({ value: p.value, label: p.label }))}
        />
      ) : (
        <p className="setup-note">Choose a game to see its player counts.</p>
      )}
      {players !== null && (
        <p className="setup-note">
          {credits > 0 ? `Everyone starts with ${credits} credits in each color.` : 'No starting credits.'}
          {block === 'fareast' && (players === 3 || players === 4) && ' Remember to take Cultural Heritage.'}
        </p>
      )}

      <h2>Special Buildings?</h2>
      <Segmented<'off' | 'on'>
        label="Special Buildings expansion"
        value={buildings ? 'on' : 'off'}
        onChange={(v) => setBuildings(v === 'on')}
        options={[
          { value: 'off', label: 'Off' },
          { value: 'on', label: 'On' },
        ]}
      />
      <p className="setup-note">Adds special buildings and their VP to the Cities tab. You can change this later in the menu.</p>

      <div className="setup-cta">
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!block || players === null}
          onClick={() => block && players !== null && dispatch({ type: 'start', block, playerCount: players, buildings })}
        >
          Start the game
        </button>
      </div>

      <div className="setup-join">
        <span className="muted">Playing with others using Megatracker?</span>
        <button type="button" className="btn btn-block" onClick={() => setJoining(true)}>
          Join a shared game
        </button>
      </div>
      {joining && (
        <JoinSheet
          initialCode={joinCode ?? ''}
          onClose={() => {
            setJoining(false);
            onJoinHandled();
          }}
        />
      )}

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

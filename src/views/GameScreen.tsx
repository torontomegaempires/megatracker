import { useState } from 'react';
import { BLOCKS, COLOR_NAMES, COLORS } from '../data';
import type { AstMode } from '../engine/game';
import { astStatus, costSummary, specialAbilities, victoryPoints } from '../engine/selectors';
import { Icon, type IconName } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { Segmented } from '../components/ui';
import { useGame } from '../state/store';
import { AdvancesView, Cart } from './AdvancesView';
import { CalamitiesView, CitiesView, SpecialsView, TradeView } from './OtherViews';
import { AdvanceSheet, CalamitySheet, CreditChoiceSheet, FundsSheet } from './Sheets';

type Tab = 'advances' | 'cities' | 'trade' | 'calamities' | 'specials';
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'advances', label: 'Advances', icon: 'advances' },
  { id: 'cities', label: 'Cities', icon: 'cities' },
  { id: 'trade', label: 'Trade', icon: 'trade' },
  { id: 'calamities', label: 'Calamities', icon: 'calamities' },
  { id: 'specials', label: 'Specials', icon: 'specials' },
];

type Overlay = null | { kind: 'menu' } | { kind: 'about' } | { kind: 'funds' } | { kind: 'advance'; name: string } | { kind: 'calamity'; name: string };

export function GameScreen() {
  const { game } = useGame();
  const [tab, setTab] = useState<Tab>('advances');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const close = () => setOverlay(null);
  const showCart = tab === 'advances' && costSummary(game).lines.length > 0;
  const specials = specialAbilities(game).length;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-row">
          <button type="button" className="icon-btn" aria-label="Menu" onClick={() => setOverlay({ kind: 'menu' })} style={{ marginLeft: -10 }}>
            <Icon name="menu" />
          </button>
          <div className="brand">
            <span className="brand-name">{BLOCKS[game.block].name}</span>
            <span className="brand-sub">{game.playerCount ? `${game.playerCount} players` : 'Custom game'}</span>
          </div>
          <div className="topbar-spacer" />
          <div className="vp" aria-label={`${victoryPoints(game)} victory points from Advances`}>
            <strong>{victoryPoints(game)}</strong>
            <span>VP</span>
          </div>
        </div>
        <div className="credits" aria-label="Your credits">
          {COLORS.map((c) => (
            <div key={c} className={`credit c-${c}`}>
              <span className="credit-value">{game.credits[c]}</span>
              <span className="credit-name">{COLOR_NAMES[c]}</span>
            </div>
          ))}
        </div>
        <AstBar />
      </header>

      <main className={`main${showCart ? ' has-cart' : ''}`}>
        {tab === 'advances' && <AdvancesView onOpen={(name) => setOverlay({ kind: 'advance', name })} onFunds={() => setOverlay({ kind: 'funds' })} />}
        {tab === 'cities' && <CitiesView />}
        {tab === 'trade' && <TradeView />}
        {tab === 'calamities' && <CalamitiesView onOpen={(name) => setOverlay({ kind: 'calamity', name })} />}
        {tab === 'specials' && <SpecialsView onActivated={(toAdvances) => toAdvances && setTab('advances')} />}
      </main>

      <div className="bottom">
        {showCart && <Cart />}
        <nav className="tabbar" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} />
              {t.label}
              {t.id === 'specials' && specials > 0 && <span className="tab-badge">{specials}</span>}
            </button>
          ))}
        </nav>
      </div>

      {overlay?.kind === 'advance' && (
        <AdvanceSheet key={overlay.name} name={overlay.name} onClose={close} onNavigate={(name) => setOverlay({ kind: 'advance', name })} />
      )}
      {overlay?.kind === 'calamity' && (
        <CalamitySheet name={overlay.name} onClose={close} onOpenAdvance={(name) => setOverlay({ kind: 'advance', name })} />
      )}
      {overlay?.kind === 'funds' && <FundsSheet onClose={close} />}
      {overlay?.kind === 'menu' && <MenuSheet onClose={close} onAbout={() => setOverlay({ kind: 'about' })} />}
      {overlay?.kind === 'about' && <AboutSheet onClose={close} />}
      <CreditChoiceSheet />
    </div>
  );
}

function AstBar() {
  const { game } = useGame();
  const ast = astStatus(game);
  if (!ast) return null;
  if (!ast.next) {
    return (
      <div className="ast">
        <div className="ast-need">AST: Advance requirements met for every age ({ast.current.abbr}).</div>
      </div>
    );
  }
  return (
    <div className="ast" aria-label={`Archaeological Succession Table progress toward ${ast.next.name}`}>
      <div className="ast-row">
        <span className="ast-age">{ast.current.abbr}</span>
        <div
          className="ast-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ast.owned * 100)}
          aria-valuetext={`${Math.round(ast.owned * 100)}% of the Advances needed for ${ast.next.name}`}
        >
          <div className="ast-plan" style={{ width: `${ast.withConsidering * 100}%` }} />
          <div className="ast-fill" style={{ width: `${ast.owned * 100}%` }} />
        </div>
        <span className="ast-age" style={{ textAlign: 'right' }}>
          {ast.next.abbr}
        </span>
      </div>
      <div className="ast-need">
        {ast.next.name}: {ast.next.text}
      </div>
    </div>
  );
}

function MenuSheet({ onClose, onAbout }: { onClose: () => void; onAbout: () => void }) {
  const { game, dispatch } = useGame();
  return (
    <Sheet title="Menu" onClose={onClose}>
      <div className="section">
        <h3>Archaeological Succession Table guide</h3>
        <Segmented<AstMode>
          label="AST guide"
          value={game.view.ast}
          onChange={(ast) => dispatch({ type: 'setView', view: { ast, goal: ast === 'off' && game.view.goal === 'ast' ? 'advances' : game.view.goal } })}
          options={[
            { value: 'off', label: 'Off' },
            { value: 'basic', label: 'Basic' },
            { value: 'expert', label: 'Expert' },
          ]}
        />
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          Tracks the Advance and VP requirements for each age. Cities are not tracked.
        </p>
      </div>
      <div className="section menu-list">
        <h3>Game</h3>
        <button type="button" className="btn btn-block" onClick={onAbout}>
          <Icon name="info" /> About and credits
        </button>
        <button
          type="button"
          className="btn btn-block btn-danger"
          onClick={() => {
            if (window.confirm('Start over? This clears your Advances and credits for this game.')) dispatch({ type: 'reset' });
          }}
        >
          Start a new game
        </button>
      </div>
    </Sheet>
  );
}

function AboutSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="About Megatracker" subtitle="Toronto Mega Empires group" onClose={onClose}>
      <div className="prose">
        <p>
          Megatracker is built on the{' '}
          <a href="https://calculator.mega-empires.com/" target="_blank" rel="noreferrer">
            Mega Empires Calculator
          </a>{' '}
          by{' '}
          <a href="https://crawdad.neocities.org/MCA2/about.html" target="_blank" rel="noreferrer">
            Matt Crawford
          </a>
          . Its rules data and calculations are adapted here with a new interface.
        </p>
        <p>
          The calculator is licensed to Colossus Games for commercial purposes and to users under the{' '}
          <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">
            Creative Commons Attribution-NonCommercial-ShareAlike 4.0
          </a>{' '}
          license. Megatracker is shared under the same license.
        </p>
        <p className="muted">Your game is saved on this device only.</p>
      </div>
    </Sheet>
  );
}

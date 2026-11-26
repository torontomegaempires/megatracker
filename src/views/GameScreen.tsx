import { useCallback, useState } from 'react';
import { BLOCKS, COLOR_NAMES, COLORS, rulesFor } from '../data';
import type { AstMode } from '../engine/game';
import { astStatus, buildingsOn, costSummary, specialAbilities, victoryPoints } from '../engine/selectors';
import { GitHubIcon, Icon, type IconName } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { Segmented } from '../components/ui';
import { useGame } from '../state/store';
import { APP_BUILT_AT, APP_COMMIT, APP_VERSION, versionLabel } from '../version';
import { AdvancesView, Cart } from './AdvancesView';
import { GoalView } from './GoalView';
import { SharedGameView } from './SharedGameView';
import { CalamitiesView, CitiesView, SpecialsView, TradeView } from './OtherViews';
import { AdvanceSheet, CalamitySheet, CreditChoiceSheet } from './Sheets';

type Tab = 'advances' | 'cities' | 'trade' | 'calamities' | 'goal' | 'specials' | 'game';
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'advances', label: 'Advances', icon: 'advances' },
  { id: 'cities', label: 'Cities', icon: 'cities' },
  { id: 'trade', label: 'Trade', icon: 'trade' },
  { id: 'calamities', label: 'Calamities', icon: 'calamities' },
  { id: 'goal', label: 'Goal', icon: 'flag' },
  { id: 'specials', label: 'Specials', icon: 'specials' },
  { id: 'game', label: 'Game', icon: 'standings' },
];

type Overlay = null | { kind: 'menu' } | { kind: 'about' } | { kind: 'advance'; name: string } | { kind: 'calamity'; name: string };

export function GameScreen({ joinCode, onJoinHandled }: { joinCode: string | null; onJoinHandled: () => void }) {
  const { game } = useGame();
  const [tab, setTab] = useState<Tab>(joinCode ? 'game' : 'advances');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [focusHand, setFocusHand] = useState(false);
  const clearFocusHand = useCallback(() => setFocusHand(false), []);
  const close = () => setOverlay(null);
  const summary = costSummary(game);
  const showCart = (tab === 'advances' || tab === 'goal') && (summary.lines.length > 0 || !!summary.building);
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
          </div>
          <div className="topbar-spacer" />
          <span className="vp-label" aria-hidden>
            Advances
          </span>
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
        {tab === 'advances' && (
          <AdvancesView
            onOpen={(name) => setOverlay({ kind: 'advance', name })}
            onFunds={() => {
              setTab('trade');
              setFocusHand(true);
            }}
          />
        )}
        {tab === 'goal' && <GoalView onOpen={(name) => setOverlay({ kind: 'advance', name })} />}
        {tab === 'cities' && <CitiesView onPurchase={() => setTab('advances')} />}
        {tab === 'trade' && <TradeView focusHand={focusHand} onFocused={clearFocusHand} />}
        {tab === 'calamities' && <CalamitiesView onOpen={(name) => setOverlay({ kind: 'calamity', name })} />}
        {tab === 'game' && <SharedGameView joinCode={joinCode} onJoinHandled={onJoinHandled} />}
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
          onChange={(ast) => dispatch({ type: 'setView', view: { ast } })}
          options={[
            { value: 'off', label: 'Off' },
            { value: 'basic', label: 'Basic' },
            { value: 'expert', label: 'Expert' },
          ]}
        />
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          Tracks the Advance and VP requirements for each age. Cities are not tracked here; the Game tab counts them for shared games.
        </p>
      </div>
      {rulesFor(game.block).rules === 'we' && (
        <div className="section">
          <h3>The Special Buildings expansion</h3>
          <Segmented<'off' | 'on'>
            label="Special Buildings expansion"
            value={game.buildings.enabled ? 'on' : 'off'}
            onChange={(v) => dispatch({ type: 'setBuildings', buildings: { enabled: v === 'on' } })}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'on', label: 'On' },
            ]}
          />
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            {buildingsOn(game)
              ? 'Build and track special buildings, and their VP, on the Cities tab.'
              : 'Adds special buildings and their VP to the Cities tab, and their price to your purchase.'}
          </p>
        </div>
      )}
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
        <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
          Megatracker {versionLabel}
        </p>
      </div>
    </Sheet>
  );
}

const REPO_URL = 'https://github.com/torontomegaempires/megatracker';
const ISSUES_URL = `${REPO_URL}/issues`;
/** The bug report form, with the version field filled in (issue forms accept field ids as query parameters). */
const BUG_REPORT_URL = `${ISSUES_URL}/new?template=bug_report.yml&version=${encodeURIComponent(
  `${APP_VERSION} · build ${APP_COMMIT}`,
)}`;

function AboutSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="About Megatracker" onClose={onClose}>
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
          The calculator is licensed to users under the{' '}
          <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">
            Creative Commons Attribution-NonCommercial-ShareAlike 4.0
          </a>{' '}
          license. Megatracker is © 2026 Rob McArthur and is shared under the same license.
        </p>
        <p>
          The full source code is available on GitHub. Something wrong? Report a problem there, or{' '}
          <a href={`${ISSUES_URL}/new/choose`} target="_blank" rel="noreferrer">
            pick another form
          </a>{' '}
          for wrong rules data or ideas.
        </p>
        <p>
          <a className="github-link" href={REPO_URL} target="_blank" rel="noreferrer">
            <GitHubIcon /> torontomegaempires/megatracker
          </a>
        </p>
        <p>
          <a className="github-link" href={BUG_REPORT_URL} target="_blank" rel="noreferrer">
            <GitHubIcon /> Report a problem
          </a>
        </p>
        <p className="muted">Your game is saved on this device only.</p>
        <p className="muted">
          Version {APP_VERSION} · build {APP_COMMIT} · {new Date(APP_BUILT_AT).toLocaleDateString()}
        </p>
      </div>
    </Sheet>
  );
}

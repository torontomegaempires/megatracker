import { describe, expect, it } from 'vitest';
import { RULES, rulesFor } from '../data';
import { choiceReady, choiceTap } from './credits';
import type { GameState } from './game';
import { newGame, reducer, zeroCredits } from './game';
import { astStatus, cost, costSummary, funds, potentialCities, specialAbilities, tradeCardCost, victoryPoints, visibleAdvances } from './selectors';

const adv = (s: GameState, n: string) => rulesFor(s.block).byName.get(n)!;
const consider = (s: GameState, ...names: string[]) => names.reduce((g, name) => reducer(g, { type: 'toggleConsider', name }), s);
const buy = (s: GameState, ...names: string[]) => reducer(consider(s, ...names), { type: 'buy' });

describe('data', () => {
  it('links every advance into a chain of three', () => {
    for (const rules of Object.values(RULES)) {
      const counts = new Map<number, number>();
      for (const a of rules.advances) {
        expect(a.chain).toBeGreaterThan(0);
        counts.set(a.chain, (counts.get(a.chain) ?? 0) + 1);
      }
      expect([...counts.values()].every((n) => n === 3)).toBe(true);
    }
  });

  it('has the expected card counts', () => {
    expect(RULES.we.advances).toHaveLength(51);
    expect(RULES.fe.advances).toHaveLength(45);
    expect(RULES.we.calamities).toHaveLength(24);
  });
});

describe('setup', () => {
  it('gives starting credits by player count', () => {
    expect(newGame('west', 5).credits.red).toBe(10);
    expect(newGame('west', 6).credits.blue).toBe(5);
    expect(newGame('west', 0).credits.blue).toBe(0);
  });
});

describe('costs', () => {
  it('subtracts credits, using the better color for dual-color cards', () => {
    const g = { ...newGame('west', 0), credits: { ...zeroCredits(), blue: 15, green: 25 } };
    expect(cost(g, adv(g, 'Mathematics'))).toBe(adv(g, 'Mathematics').price - 25);
  });

  it('discounts a card when the previous card in its chain is owned', () => {
    let g = newGame('west', 0);
    const base = cost(g, adv(g, 'Democracy'));
    g = { ...g, owned: ['Agriculture'] }; // Agriculture (120) -> Democracy
    expect(cost(g, adv(g, 'Democracy'))).toBe(base - 20);
  });

  it('applies the Library discount to the most expensive other purchase, up to 40', () => {
    const g = consider(newGame('west', 0), 'Library', 'Pottery');
    const { total } = costSummary(g);
    expect(total).toBe(cost(g, adv(g, 'Library')) + cost(g, adv(g, 'Pottery')) - Math.min(40, cost(g, adv(g, 'Pottery'))));
  });

  it('values trade card sets as rank x qty squared, doubling treasury with Mining', () => {
    let g = newGame('west', 0);
    g = reducer(g, { type: 'setFunding', funding: { sets: [{ rank: 3, qty: 4 }], misc: 2, treasury: 10 } });
    expect(funds(g)).toBe(48 + 2 + 10);
    g = { ...g, owned: ['Mining'] };
    expect(funds(g)).toBe(48 + 2 + 20);
  });
});

describe('buying', () => {
  it('adds face credits and VP, and clears the purchase list and funds', () => {
    let g = newGame('west', 0);
    g = reducer(g, { type: 'setFunding', funding: { sets: [], misc: 50, treasury: 0 } });
    g = buy(g, 'Pottery');
    expect(g.owned).toEqual(['Pottery']);
    expect(g.considering).toEqual([]);
    expect(funds(g)).toBe(0);
    expect(victoryPoints(g)).toBe(1);
    const face = adv(g, 'Pottery').credits;
    expect(g.credits.orange).toBe(face.orange ?? 0);
  });

  it('queues an extra-credit choice before face credits', () => {
    let g = buy(newGame('west', 0), 'Written Record');
    expect(g.queue[0]).toMatchObject({ kind: 'choice', source: 'Written Record', amount: 10 });
    expect(g.credits.green).toBe(0); // face credits wait for the choice
    g = reducer(g, { type: 'resolveChoice', delta: { ...zeroCredits(), blue: 10 } });
    expect(g.queue).toEqual([]);
    expect(g.credits.blue).toBe(10);
    expect(g.credits.green).toBe(5);
  });

  it('offers a free cheap science after Anatomy, then returns to normal', () => {
    let g = buy(newGame('west', 0), 'Anatomy');
    expect(g.freePick).toBe('cheapScience');
    expect(visibleAdvances(g).advances.every((a) => a.price < 100 && a.colors.includes('green'))).toBe(true);
    g = consider(g, 'Astronavigation');
    expect(costSummary(g).total).toBe(0);
    g = reducer(g, { type: 'buy' });
    expect(g.freePick).toBeNull();
    expect(g.owned).toContain('Astronavigation');
  });

  it('bars The Four Arts without 10 credits in some color', () => {
    const g = consider(newGame('fareast', 0), 'The Four Arts');
    expect(g.considering).toEqual([]);
    const rich = consider(newGame('fareast', 3), 'The Four Arts');
    expect(rich.considering).toEqual(['The Four Arts']);
  });
});

describe('extra credit choices', () => {
  const credits = { ...zeroCredits(), red: 10 };
  it('handles any-mix choices in steps of 5', () => {
    let d = zeroCredits();
    d = choiceTap(10, credits, d, 'blue');
    expect(choiceReady(10, d)).toBe(false);
    d = choiceTap(10, credits, d, 'green');
    expect(choiceReady(10, d)).toBe(true);
    expect(choiceTap(10, credits, d, 'red')).toBe(d);
  });
  it('handles single-color choices', () => {
    const d = choiceTap(-10, credits, zeroCredits(), 'yellow');
    expect(d.yellow).toBe(10);
    expect(choiceReady(-10, d)).toBe(true);
  });
  it('handles 10-for-40 only from a color with 10 credits', () => {
    expect(choiceTap('10for40', credits, zeroCredits(), 'blue')).toEqual(zeroCredits());
    const d = choiceTap('10for40', credits, zeroCredits(), 'red');
    expect(d).toEqual({ blue: 10, green: 10, orange: 10, red: -10, yellow: 10 });
  });
  it('handles 10-for-10 moves and undo', () => {
    let d = choiceTap('10for10', credits, zeroCredits(), 'red');
    expect(choiceReady('10for10', d)).toBe(false);
    expect(choiceTap('10for10', credits, d, 'red')).toEqual(zeroCredits());
    d = choiceTap('10for10', credits, d, 'green');
    expect(choiceReady('10for10', d)).toBe(true);
  });
});

describe('guides', () => {
  it('tracks the basic AST', () => {
    let g = reducer(newGame('west', 0), { type: 'setView', view: { ast: 'basic' } });
    expect(astStatus(g)?.next?.abbr).toBe('MBA');
    g = { ...g, owned: ['Pottery', 'Masonry', 'Mysticism'] };
    expect(astStatus(g)?.next?.abbr).toBe('LBA');
  });

  it('estimates cities in the West', () => {
    let g = reducer(newGame('west', 0), { type: 'setBoard', board: { cities: 2, tokens: 20 } });
    // 20 tokens, 4 support existing cities, 16 left, 8 per new city
    expect(potentialCities(g)).toEqual({ lacking: false, build: 2, spare: 0 });
    g = reducer(g, { type: 'setBoard', board: { tokens: 3 } });
    expect(potentialCities(g)).toEqual({ lacking: true });
  });

  it('reduces Far East trade card costs with Literature', () => {
    const g = { ...newGame('fareast', 0), owned: ['Literature'] };
    expect(tradeCardCost(g, 5)).toBe(4);
    expect(tradeCardCost(g, 1)).toBe(1);
  });

  it('personalises the Primal Philosophy special', () => {
    const g = { ...newGame('fareast', 0), owned: ['Primal Philosophy'] };
    expect(specialAbilities(g)[0].text).toContain('number of Advances (1)');
  });
});

import { describe, expect, it } from 'vitest';
import { BLOCKS, buildingsIn, commoditiesFor, nationByName, RULES, rulesFor, SPECIAL_BUILDINGS } from '../data';
import { choiceReady, choiceTap } from './credits';
import type { GameState } from './game';
import { loadBuildings, loadFunding, loadGoal, loadView, newGame, PLAYER_COUNTS, playerCountLabel, reducer, zeroCredits } from './game';
import { astStatus, bestSubstitution, buildingPoints, cost, costSummary, funds, fundsBreakdown, goalProgress, payment, potentialCities, specialAbilities, tradeCardCost, victoryPoints, visibleAdvances, worsenedCalamities } from './selectors';

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
    for (const n of [7, 9, 10, 13, 15]) expect(newGame('west', n).credits.blue).toBe(0); // 7–8 up to 15–18, apart from 12
    expect(newGame('west', 12).credits.blue).toBe(5);
  });

  it('offers each game its own player counts', () => {
    const labels = (block: keyof typeof BLOCKS) => BLOCKS[block].playerCounts.map((p) => p.label);
    expect(labels('west')).toEqual(['3', '4', '5', '6', '7–8', '9']);
    expect(labels('east')).toEqual(labels('west'));
    expect(labels('fareast')).toEqual(['3', '4', '5', '6–8', '9–11']);
    expect(labels('mega')).toEqual(['10–11', '12', '13–14', '15–18']);
    // Every choice is one the shared game server accepts.
    for (const b of Object.values(BLOCKS)) for (const p of b.playerCounts) expect(PLAYER_COUNTS.some((x) => x.value === p.value)).toBe(true);
    expect(playerCountLabel('fareast', 6)).toBe('6–8');
    expect(playerCountLabel('west', 6)).toBe('6');
    expect(playerCountLabel('west', 13)).toBe('13–14'); // games saved before Mega Empires was its own choice
  });

  it('can start with the Special Buildings expansion on', () => {
    expect(newGame('mega', 12, true).buildings.enabled).toBe(true);
    expect(newGame('fareast', 3).buildings.enabled).toBe(false);
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

  it('values each commodity as face value x cards squared, doubling treasury with Mining', () => {
    let g = newGame('west', 5);
    g = reducer(g, { type: 'setCommodity', id: 'fish', count: 4 }); // 3 x 16
    g = reducer(g, { type: 'setCommodity', id: 'ochre', count: 2 }); // 1 x 4
    g = reducer(g, { type: 'setCommodity', id: 'gold', count: 1 }); // 9
    g = reducer(g, { type: 'setTreasury', treasury: 10 });
    expect(funds(g)).toBe(48 + 4 + 9 + 10);
    g = { ...g, owned: ['Mining'] };
    expect(funds(g)).toBe(48 + 4 + 9 + 20);
  });
});

describe('buying', () => {
  it('adds face credits and VP, and clears the purchase list and funds', () => {
    let g = newGame('west', 0);
    g = reducer(g, { type: 'setCommodity', id: 'fish', count: 5 }); // 75
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

describe('goal', () => {
  const toggle = (s: GameState, ...names: string[]) => names.reduce((g, name) => reducer(g, { type: 'toggleGoal', name }), s);

  it('adds and removes Advances, ignoring names not in the block', () => {
    let g = toggle(newGame('west', 0), 'Pottery', 'Democracy', 'Not An Advance');
    expect(g.goal).toEqual(['Pottery', 'Democracy']);
    g = toggle(g, 'Pottery');
    expect(g.goal).toEqual(['Democracy']);
    expect(reducer(g, { type: 'clearGoal' }).goal).toEqual([]);
  });

  it('keeps bought Advances on the goal and totals what is left', () => {
    let g = toggle(newGame('west', 0), 'Democracy', 'Pottery', 'Agriculture');
    g = buy(g, 'Agriculture');
    const p = goalProgress(g);
    expect(p.bought.map((a) => a.name)).toEqual(['Agriculture']);
    expect(p.toBuy.map((a) => a.name)).toEqual(['Pottery', 'Democracy']); // cheapest first
    expect(p.costLeft).toBe(cost(g, adv(g, 'Pottery')) + cost(g, adv(g, 'Democracy')));
    expect(p.vpLeft).toBe(adv(g, 'Pottery').vp + adv(g, 'Democracy').vp);
  });

  it('filters the Advances tab to unowned goal Advances', () => {
    let g = toggle(newGame('west', 0), 'Pottery', 'Democracy');
    g = buy(g, 'Pottery');
    g = reducer(g, { type: 'setView', view: { filter: 'goal' } });
    expect(visibleAdvances(g).advances.map((a) => a.name)).toEqual(['Democracy']);
  });

  it('loads saved games, dropping the Goal tab’s old idea themes', () => {
    const fresh = newGame('west', 0).view;
    expect(loadView({ filter: 'goal', goal: 'trade', ast: 'basic' }, fresh)).toEqual({ ...fresh, filter: 'goal', ast: 'basic' });
    expect(loadView({ strategy: 'treasury', sort: 'cost' }, fresh)).toEqual({ ...fresh, sort: 'cost' });
    expect(loadView(undefined, fresh)).toEqual(fresh);
    expect(loadGoal(undefined, 'west')).toEqual([]);
    expect(loadGoal(['Pottery', 'Pottery', 'Nope', 3], 'west')).toEqual(['Pottery']);
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

describe('trade hand', () => {
  const hand = (g: GameState, counts: Record<string, number>) =>
    Object.entries(counts).reduce((s, [id, count]) => reducer(s, { type: 'setCommodity', id, count }), g);

  it('uses the trade card deck for the block and player count', () => {
    const deck = (block: 'west' | 'east', n: number) => Object.fromEntries(commoditiesFor(block, n).map((c) => [c.name, c.max]));
    expect(Object.keys(deck('west', 5))).toHaveLength(18);
    expect(deck('west', 5)).toMatchObject({ Ochre: 9, Clay: 9, Gold: 5 });
    expect(deck('west', 7).Bone).toBeUndefined(); // 7–8
    expect(deck('east', 3)).toMatchObject({ Flax: 9, Silk: 4 });
    expect(deck('west', 9)).toMatchObject({ Bone: 8, Amber: 4 });
    expect(deck('east', 9)).toMatchObject({ Bone: 8, Flax: 9 });
    expect(deck('east', 10)).toEqual(deck('west', 9)); // 10–11 use the West's 9-player deck
    // 12–14: the West and East split decks only set where cards are drawn; both blocks hold all of them
    expect(deck('west', 12)).toMatchObject({ Ochre: 9, Flax: 9, Clay: 9, Hides: 9, Iron: 8, Gold: 5, Pearls: 5, Silk: 4 });
    expect(deck('east', 12)).toEqual(deck('west', 12));
    expect(deck('west', 13).Bone).toBeUndefined();
    expect(Object.keys(deck('west', 12))).toHaveLength(36);
    // 15–18 adds the extra sets
    expect(deck('east', 15)).toMatchObject({ Iron: 8, Bone: 8, Amber: 4, Pearls: 5 });
    expect(deck('west', 15)).toEqual(deck('east', 15));
    expect(Object.keys(deck('west', 15))).toHaveLength(45);
    expect(commoditiesFor('west', 15).every((c, i, a) => i === 0 || a[i - 1].value <= c.value)).toBe(true);
    // Mega Empires uses the same decks as West/East games of that size
    for (const n of [10, 12, 13, 15]) expect(commoditiesFor('mega', n)).toEqual(commoditiesFor('west', n));
  });

  it('gives the Far East its own commodities, even where names match West/East cards', () => {
    const fe = commoditiesFor('fareast', 5);
    expect(fe).toHaveLength(18);
    expect(fe.find((c) => c.name === 'Fish')).toMatchObject({ id: 'fe-fish', value: 1, max: 9 });
    expect(commoditiesFor('west', 5).find((c) => c.name === 'Fish')?.value).toBe(3);
    expect(fe.map((c) => c.name)).not.toContain('Fruit');
    expect(commoditiesFor('fareast', 7).map((c) => c.name)).not.toContain('Fruit'); // 7–8
    expect(commoditiesFor('fareast', 10).map((c) => c.name)).toContain('Fruit'); // 10–11

    let g = newGame('fareast', 5);
    g = reducer(g, { type: 'setCommodity', id: 'fe-jade', count: 2 }); // 8 x 4
    expect(funds(g)).toBe(32);
  });

  it('leaves held commodities out of funds', () => {
    let g = hand(newGame('west', 5), { fish: 3, gold: 2 }); // 27 + 36
    g = reducer(g, { type: 'toggleHeld', id: 'gold' });
    expect(fundsBreakdown(g)).toMatchObject({ cards: 27, held: 36, heldCards: 2, total: 27 });
    g = reducer(g, { type: 'toggleHeld', id: 'gold' });
    expect(funds(g)).toBe(63);
  });

  it('forgets a held commodity once none are left', () => {
    let g = hand(newGame('west', 5), { fish: 3 });
    g = reducer(g, { type: 'toggleHeld', id: 'fish' });
    g = reducer(g, { type: 'setCommodity', id: 'fish', count: 0 });
    expect(g.funding).toEqual({ hand: {}, held: [], treasury: 0 });
    expect(reducer(g, { type: 'toggleHeld', id: 'fish' })).toBe(g);
  });

  it('counts 1 card as a missing card of an incomplete set with Trade Empire', () => {
    let g = hand(newGame('west', 5), { iron: 3, fruit: 1 }); // 18 + 3
    expect(funds(g)).toBe(21);
    g = { ...g, owned: ['Trade Empire'] };
    expect(fundsBreakdown(g)).toMatchObject({ cards: 32, total: 32 }); // 2 x 16
    expect(bestSubstitution(g)).toMatchObject({ substitute: { id: 'fruit' }, set: { id: 'iron' }, gain: 11 });
    // A card of the same face value can stand in too.
    expect(bestSubstitution(hand({ ...newGame('west', 5), owned: ['Trade Empire'] }, { iron: 3, papyri: 1 }))?.gain).toBe(12);
  });

  it('substitutes only a card worth at least the set, into an incomplete set, for a gain', () => {
    const te = (counts: Record<string, number>) => bestSubstitution(hand({ ...newGame('west', 5), owned: ['Trade Empire'] }, counts));
    expect(te({ fish: 3, ochre: 1 })).toBeNull(); // Ochre is worth less than Fish
    expect(te({ marble: 4, gold: 1 })).toBeNull(); // 4 Marble is the whole set
    expect(te({ fruit: 3, wool: 4 })).toBeNull(); // a 5th Fruit adds 21, a Wool from the set costs 28
    expect(te({ iron: 3, gold: 2, fish: 1 })).toMatchObject({ substitute: { id: 'fish' }, set: { id: 'iron' } });
  });

  it('leaves held sets out of substitution', () => {
    let g = hand({ ...newGame('west', 5), owned: ['Trade Empire'] }, { iron: 3, fruit: 1 });
    g = reducer(g, { type: 'toggleHeld', id: 'iron' });
    expect(bestSubstitution(g)).toBeNull();
    expect(fundsBreakdown(g)).toMatchObject({ cards: 3, held: 18 });
  });

  it('needs a higher face value for Silk Routes in the Far East', () => {
    const sr = (counts: Record<string, number>) => bestSubstitution(hand({ ...newGame('fareast', 5), owned: ['Silk Routes'] }, counts));
    expect(sr({ 'fe-bamboo': 3, 'fe-stone': 1 })).toBeNull();
    expect(sr({ 'fe-bamboo': 3, 'fe-terracotta': 1 })).toMatchObject({ advance: 'Silk Routes', gain: 11 });
    expect(bestSubstitution(hand({ ...newGame('fareast', 5), owned: ['Trade Empire'] }, { 'fe-bamboo': 3, 'fe-terracotta': 1 }))).toBeNull();
  });

  it('turns in unheld cards when buying, keeps held ones, and spends only the treasury needed', () => {
    let g = hand(newGame('west', 0), { fish: 2, gold: 2 }); // 12 + 36 held
    g = reducer(g, { type: 'toggleHeld', id: 'gold' });
    g = reducer(g, { type: 'setTreasury', treasury: 50 });
    const price = costSummary(consider(g, 'Pottery')).total;
    g = buy(g, 'Pottery');
    expect(g.funding.hand).toEqual({ gold: 2 });
    expect(g.funding.held).toEqual([]);
    expect(g.funding.treasury).toBe(50 - (price - 12));
  });

  it('shows how a purchase is paid: every set not kept, then the treasury needed', () => {
    let g = hand(newGame('west', 0), { fish: 2, gold: 2 }); // 12 + 36 kept
    g = reducer(g, { type: 'toggleHeld', id: 'gold' });
    g = reducer(g, { type: 'setTreasury', treasury: 50 });
    g = consider(g, 'Pottery');
    const price = costSummary(g).total;
    const paid = payment(g);
    expect(paid.sets.map((s) => [s.commodity.id, s.value])).toEqual([['fish', 12]]);
    expect(paid.treasury).toBe(price - 12);
    expect(paid.treasuryValue).toBe(price - 12);
  });

  it('counts doubled treasury in the payment and spends none when cards cover it', () => {
    let g = { ...newGame('west', 0), owned: ['Mining'] };
    g = reducer(g, { type: 'setTreasury', treasury: 40 });
    g = consider(g, 'Pottery');
    const price = costSummary(g).total;
    expect(payment(g)).toMatchObject({ sets: [], treasury: Math.ceil(price / 2), treasuryValue: Math.ceil(price / 2) * 2 });
    g = hand(g, { gold: 3 });
    expect(payment(g)).toMatchObject({ treasury: 0, treasuryValue: 0 });
    expect(payment(g).sets[0].value).toBe(fundsBreakdown(g).cards);
  });

  it('spends doubled treasury at half the tokens, rounding up', () => {
    let g = { ...newGame('west', 0), owned: ['Mining'] };
    g = reducer(g, { type: 'setTreasury', treasury: 40 });
    const price = costSummary(consider(g, 'Pottery')).total;
    g = buy(g, 'Pottery');
    expect(g.funding.treasury).toBe(40 - Math.ceil(price / 2));
  });

  it('keeps only the treasury from games saved before the hand existed', () => {
    expect(loadFunding({ sets: [{ rank: 3, qty: 2 }], misc: 4, treasury: 12 })).toEqual({ hand: {}, held: [], treasury: 12 });
    expect(loadFunding(undefined)).toEqual({ hand: {}, held: [], treasury: 0 });
    expect(loadFunding({ hand: { fish: 2 }, held: ['fish', 'gold'], treasury: 3 })).toEqual({ hand: { fish: 2 }, held: ['fish'], treasury: 3 });
  });
});

describe('special buildings', () => {
  const withBuildings = (block: 'west' | 'fareast' = 'west', players = 5) =>
    reducer(newGame(block, players), { type: 'setBuildings', buildings: { enabled: true } });
  const control = (g: GameState, ...ids: string[]) => ids.reduce((s, id) => reducer(s, { type: 'toggleControl', id }), g);
  const hand = (g: GameState, counts: Record<string, number>) =>
    Object.entries(counts).reduce((s, [id, count]) => reducer(s, { type: 'setCommodity', id, count }), g);

  it('is off in new games and offers each game only its own nations’ buildings', () => {
    expect(newGame('west', 5).buildings.enabled).toBe(false);
    expect(buildingsIn('west')).toHaveLength(18);
    expect(buildingsIn('mega')).toEqual(buildingsIn('west'));
    expect(buildingsIn('fareast').map((b) => b.civ)).toContain('Heian');
    expect(buildingsIn('fareast')).toHaveLength(12);
    expect(buildingsIn('fareast').find((b) => b.id === 'ming')?.name).toBe('Forbidden City of Beijing');
    const fe = reducer(withBuildings('fareast'), { type: 'considerBuilding', id: 'hellas' });
    expect(fe.buildings.considering).toBeNull();
    expect(reducer(fe, { type: 'considerBuilding', id: 'heian' }).buildings.considering).toBe('heian');
    expect(buildingPoints(fe)).not.toBeNull();
    expect(reducer(newGame('west', 5), { type: 'setBuildings', buildings: { civ: 'tang' } }).buildings.civ).toBeNull();
  });

  it('gives every nation a token color and finds nations as players type them', () => {
    for (const b of SPECIAL_BUILDINGS) expect(b.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(nationByName('rome')?.color).toBe('#eb0585');
    expect(nationByName(' Dai  Viet ')?.id).toBe('daiviet');
    expect(nationByName('The Celt')?.id).toBe('celt');
    expect(nationByName('Atlantis')).toBeUndefined();
  });

  it('costs 30, 40 or 50 by A.S.T. era and is bought with the Advances', () => {
    let g = reducer(withBuildings(), { type: 'considerBuilding', id: 'hellas' });
    expect(costSummary(g).total).toBe(30);
    g = reducer(g, { type: 'setBuildings', buildings: { era: 'iron' } });
    g = consider(g, 'Pottery');
    expect(costSummary(g).total).toBe(50 + cost(g, adv(g, 'Pottery')));
    g = reducer(g, { type: 'buy' });
    expect(g.owned).toEqual(['Pottery']);
    expect(g.buildings).toMatchObject({ owned: 'hellas', controlled: ['hellas'], considering: null });
  });

  it('can be discounted by Library, as if it were an Advance', () => {
    let g = reducer(withBuildings(), { type: 'considerBuilding', id: 'hellas' });
    g = consider(g, 'Library');
    expect(costSummary(g)).toMatchObject({ libraryDiscount: 30, total: cost(g, adv(g, 'Library')) });
    g = reducer(g, { type: 'setBuildings', buildings: { era: 'iron' } });
    expect(costSummary(g)).toMatchObject({ libraryDiscount: 40, total: cost(g, adv(g, 'Library')) + 10 });
  });

  it('can be bought without any Advances, paying from the treasury', () => {
    let g = reducer(withBuildings(), { type: 'setBuildings', buildings: { era: 'lateBronze' } });
    g = reducer(reducer(g, { type: 'considerBuilding', id: 'rome' }), { type: 'setTreasury', treasury: 50 });
    g = reducer(g, { type: 'buy' });
    expect(g.buildings.owned).toBe('rome');
    expect(g.funding.treasury).toBe(10);
  });

  it('allows only one owned building, from those not already on the board', () => {
    let g = reducer(withBuildings(), { type: 'setOwnedBuilding', id: 'minoa' });
    expect(reducer(g, { type: 'considerBuilding', id: 'rome' }).buildings.considering).toBeNull();
    g = control(withBuildings(), 'hatti');
    expect(reducer(g, { type: 'considerBuilding', id: 'hatti' }).buildings.considering).toBeNull();
    expect(reducer(newGame('west', 5), { type: 'considerBuilding', id: 'rome' }).buildings.considering).toBeNull();
  });

  it('scores the rulesheet example', () => {
    // Joel (Hellas) owns and controls the Parthenon.
    let joel = reducer(withBuildings(), { type: 'setBuildings', buildings: { civ: 'hellas' } });
    joel = reducer(joel, { type: 'setOwnedBuilding', id: 'hellas' });
    expect(buildingPoints(joel)).toEqual({ owned: 2, controlled: 1, historic: 2, total: 5 });
    // Rob (Hatti) owns the Hattusan City Walls but lost control of them.
    let rob = reducer(withBuildings(), { type: 'setBuildings', buildings: { civ: 'hatti' } });
    rob = control(reducer(rob, { type: 'setOwnedBuilding', id: 'hatti' }), 'hatti');
    expect(buildingPoints(rob)?.total).toBe(2);
    // Linda (Minoa) owns the Great Palace without controlling it, and controls the Hattusan City Walls.
    let linda = reducer(withBuildings(), { type: 'setBuildings', buildings: { civ: 'minoa' } });
    linda = control(reducer(linda, { type: 'setOwnedBuilding', id: 'minoa' }), 'minoa', 'hatti');
    expect(buildingPoints(linda)?.total).toBe(3);
    // Building VP stay apart from Advance VP.
    expect(victoryPoints(buy(linda, 'Pottery'))).toBe(1);
  });

  it('counts sacrificed buildings as missing cards of incomplete sets', () => {
    let g = control(withBuildings(), 'hellas', 'rome');
    g = hand(g, { resin: 4 }); // 112
    g = reducer(g, { type: 'toggleSacrifice', id: 'hellas' });
    expect(fundsBreakdown(g)).toMatchObject({ cards: 175, buildingCards: { sacrificed: 1, used: 1, gain: 63 } });
    g = reducer(hand(g, { resin: 3 }), { type: 'toggleSacrifice', id: 'rome' });
    expect(fundsBreakdown(g).cards).toBe(175); // 3 Resin + 2 buildings, as on the rulesheet
    // A complete set has no room: 5 Resin is every card in the deck.
    g = hand(g, { resin: 5 });
    expect(fundsBreakdown(g)).toMatchObject({ cards: 175, buildingCards: { used: 0, gain: 0 } });
  });

  it('puts building cards where they add the most, alongside Trade Empire', () => {
    let g = control({ ...withBuildings(), owned: ['Trade Empire'] }, 'hellas', 'rome');
    g = hand(g, { iron: 3, fruit: 1, gold: 1 }); // 18 + 3 + 9
    g = reducer(reducer(g, { type: 'toggleSacrifice', id: 'hellas' }), { type: 'toggleSacrifice', id: 'rome' });
    // Best: both buildings to Gold (9 x 9 = 81, +72) and Fruit standing in for Iron (+11).
    const f = fundsBreakdown(g);
    expect(f.buildingCards?.sets).toEqual([{ set: expect.objectContaining({ id: 'gold' }), cards: 2 }]);
    expect(f.substitution).toMatchObject({ substitute: { id: 'fruit' }, set: { id: 'iron' } });
    expect(f.cards).toBe(30 + 72 + 11);
  });

  it('removes sacrificed buildings when buying, and ownership with them', () => {
    let g = reducer(withBuildings(), { type: 'setOwnedBuilding', id: 'hellas' });
    g = control(g, 'rome');
    g = hand(g, { resin: 4 });
    g = reducer(g, { type: 'toggleSacrifice', id: 'hellas' });
    g = buy(g, 'Pottery');
    expect(g.buildings).toMatchObject({ owned: null, controlled: ['rome'], sacrificing: [] });
  });

  it('sacrifices an owned building to soften a calamity', () => {
    let g = reducer(withBuildings(), { type: 'setOwnedBuilding', id: 'hellas' });
    g = reducer(g, { type: 'sacrificeBuilding', id: 'hellas' });
    expect(g.buildings).toMatchObject({ owned: null, controlled: [] });
  });

  it('stops planning a sacrifice once control is lost, and drops plans when switched off', () => {
    let g = control(withBuildings(), 'rome');
    g = reducer(g, { type: 'toggleSacrifice', id: 'rome' });
    expect(control(g, 'rome').buildings.sacrificing).toEqual([]);
    g = reducer(g, { type: 'considerBuilding', id: 'hellas' });
    g = reducer(g, { type: 'setBuildings', buildings: { enabled: false } });
    expect(g.buildings).toMatchObject({ considering: null, sacrificing: [], controlled: ['rome'] });
    expect(costSummary(g).total).toBe(0);
  });

  it('loads saved buildings, starting older games with the expansion off', () => {
    expect(loadBuildings(undefined, 'west')).toEqual(newGame('west', 5).buildings);
    expect(loadBuildings({ enabled: true, owned: 'rome', controlled: ['rome', 'tang'] }, 'fareast')).toMatchObject({ owned: null, controlled: ['tang'] });
    expect(
      loadBuildings({ enabled: true, civ: 'atlantis', era: 'iron', owned: 'rome', controlled: ['rome', 'rome', 'nowhere'], considering: 'hellas', sacrificing: ['rome', 'hellas'] }, 'west'),
    ).toEqual({ enabled: true, civ: null, era: 'iron', owned: 'rome', controlled: ['rome'], considering: null, sacrificing: ['rome'] });
  });
});

describe('calamities', () => {
  it('flags calamities that owned Advances make worse on balance', () => {
    const g = newGame('west', 5);
    expect(worsenedCalamities(g).has('Famine')).toBe(false);
    const withAgriculture = { ...g, owned: ['Agriculture'] };
    expect(worsenedCalamities(withAgriculture).has('Famine')).toBe(true);
    expect(worsenedCalamities({ ...g, owned: ['Agriculture', 'Pottery'] }).has('Famine')).toBe(false);
    expect(worsenedCalamities({ ...g, owned: ['Calendar'] }).has('Famine')).toBe(false);
  });
});

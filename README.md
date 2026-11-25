# Megatracker

A phone-friendly purchase and game tracker for the **Toronto Mega Empires** group.

It starts from the [Mega Empires Calculator](https://calculator.mega-empires.com/) by
[Matt Crawford](https://crawdad.neocities.org/MCA2/about.html) — same rules data and
calculations — with a new interface. Group-specific enhancements will be added on top.

## What it does

- **Advances** — pick your block (West, East, Far East) and player count; see every
  Civilization Advance with your current cost after credits and chain discounts. Filter by
  unowned / affordable / nearly affordable / goal, sort by cost, VP, value, chains and more.
  Add Advances to a purchase, see the total (including Library's discount) against the funds
  you entered, then buy once per turn.
- **Credits and VP** — face credits are added automatically; extra-credit choices
  (Monument, Written Record, The Four Arts, Literature, Paper Money, Movable Type Printing)
  and free picks (Anatomy, Primal Philosophy) are walked through step by step.
- **Funds** — trade card sets (value × cards²), odd commodities and treasury
  (doubled with Mining / Treasure Voyages).
- **Cities** — how many cities you can build and support from your tokens.
- **Trade** — which trade card stacks you can buy from, and for how many tokens.
- **Calamities** — every calamity with the Advances that help or hurt you.
- **Specials** — your owned special abilities, with one-tap use where the app can help.
- **AST guide** — optional Basic/Expert Archaeological Succession Table progress.

The game is saved in the browser on each device (localStorage).

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # rules engine tests (Vitest)
npm run build    # type-check and build to dist/
```

- `src/data/` — Advance, calamity and interaction data, generated from the original
  calculator by `scripts/import-calculator-data.mjs`; `index.ts` links it into chains etc.
- `src/engine/` — pure game logic (state, reducer, costs, filters, guides) with tests.
- `src/state/` — React store and persistence.
- `src/views/`, `src/components/` — UI.

Deployed as a static site on Netlify (`netlify.toml`).

## License

Megatracker adapts the Mega Empires Calculator, which is licensed to users under
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Megatracker is
released under the same license — see [LICENSE.md](LICENSE.md). Mega Empires is a game by
Mega Empires / Colossus Games; this is an unofficial fan tool.

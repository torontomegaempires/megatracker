# Megatracker

A phone-friendly purchase and game tracker for the **Toronto Mega Empires** group.

It starts from the [Mega Empires Calculator](https://calculator.mega-empires.com/) by
[Matt Crawford](https://crawdad.neocities.org/MCA2/about.html) — same rules data and
calculations — with a new interface. Group-specific enhancements will be added on top.

## What it does

- **Advances** — pick your block (West, East, Far East) and player count; see every
  Civilization Advance with your current cost after credits and chain discounts. Filter by
  unowned / affordable / nearly affordable / goal, sort by cost, VP, value, chains and more.
  Advances on your goal are flagged.
  Add Advances to a purchase, see the total (including Library's discount) against the funds
  you entered, then buy once per turn.
- **Credits and VP** — face credits are added automatically; extra-credit choices
  (Monument, Written Record, The Four Arts, Literature, Paper Money, Movable Type Printing)
  and free picks (Anatomy, Primal Philosophy) are walked through step by step.
- **Funds** — the commodity cards in your hand (value × cards² per commodity) and treasury (doubled with Mining / Treasure Voyages), minus any sets kept for next turn.
- **Cities** — how many cities you can build and support from your tokens. With the Special
  Buildings expansion on (West/East), also your special building and the ones you control.
- **Trade** — your hand of commodity cards, treasury and kept sets.
- **Calamities** — every calamity with the Advances that help or hurt you.
- **Goal** — the Advances you plan to buy over the game: how many are left, what they cost
  today and the VP you'll have when done. Add to it from any Advance's details.
- **Specials** — which trade card stacks you can buy extra cards from and for how many tokens, and
  your owned special abilities, with one-tap use where the app can help.
- **Special buildings** — optional (West/East), on the Cities tab: build one with your Advances,
  track the ones you control and their VP, and sacrifice them for funds or against a calamity.
- **AST guide** — optional Basic/Expert Archaeological Succession Table progress.
- **Game** — shared games: one player creates a game and the rest join with its code. Every
  phone shows each nation's score (Advance VP + cities + 5 per A.S.T. space moved +
  special-building VP + the 5 VP solo Late Iron Age bonus), rank and A.S.T. era.

Each player's game is saved in the browser on their device (localStorage). Shared games also
send a summary (owned Advances, cities, A.S.T. position, special buildings) to the server.

## Development

```bash
npm install
npm run dev      # http://localhost:5173 (no shared games)
netlify dev      # http://localhost:8888, the app plus the shared-game API
npm test         # rules engine and API tests (Vitest)
npm run build    # type-check and build to dist/
```

Shared games run on a Netlify Function (`netlify/functions/games.mts`, logic in `server/`)
backed by Neon Postgres. The function reads the database URL from `NETLIFY_DATABASE_URL`
(set by Netlify DB) or `DATABASE_URL`, and creates its tables on first use
(`server/schema.ts`). With `ABLY_API_KEY` set, every change is published on the game's Ably
channel (`megatracker:game:CODE`) and phones subscribe with subscribe-only tokens from
`/api/games/CODE/live-token`; without it, the Game tab polls every 8 seconds instead. Under
`netlify dev` with no database URL set, games are kept in
`.netlify/shared-games.json` instead. When a game ends, each seat's final score, cities,
A.S.T. position, 1/3/6 VP Advance counts and building flags are stored in the same shape as the
group website's `game_player_nation` table.

- `src/data/` — Advance, calamity and interaction data, generated from the original
  calculator by `scripts/import-calculator-data.mjs`; `index.ts` links it into chains etc.
- `src/engine/` — pure game logic (state, reducer, costs, filters, guides) with tests.
- `src/state/` — React store and persistence.
- `src/views/`, `src/components/` — UI.
- `src/engine/standings.ts` — shared-game scoring, ranking and A.S.T. eras; `src/shared/` —
  the API's types and client; `server/` and `netlify/functions/` — the API.

Deployed on Netlify (`netlify.toml`) from two branches:

- `production` deploys https://megatracker.torontomegaempires.com. It only moves when a release
  merges, so players see new features once they are released.
- `main` deploys the staging site, https://main--megatracker.netlify.app, as soon as a pull
  request merges. Use it to try changes before releasing them. It uses Netlify's Branch deploys
  environment variables, so point its `DATABASE_URL` at a Neon branch other than production's.

## Versions and releases

Megatracker uses [semantic versioning](https://semver.org/); the version lives in
`package.json` and is stamped into each build with the git commit it came from.

- In the app: Menu shows `Megatracker v1.2.3 (abc1234)`; About shows the build date too.
- From the command line: `curl https://megatracker.torontomegaempires.com/version.json`

## Making changes

`main` is protected: every change goes through a pull request. Before it can merge, the
branch must be up to date with `main` and the **Test and build** check (tests, type check
and production build) must pass. Merging deploys to the staging site, not to players.

1. `git fetch origin`, then branch from `origin/main`. Make the change, and add a line under
   `[Unreleased]` in `CHANGELOG.md` if players will notice it.
2. Push the branch and open a pull request (`gh pr create`).
3. Merge it once the check passes. If GitHub says the branch is out of date, update it
   (the **Update branch** button, or rebase onto `origin/main`) and let the check run again.

If a release merges while your branch is open, it renames `[Unreleased]`, and your changelog
line can merge into the released section without a conflict. The check fails a pull request
whose changelog lines end up outside `[Unreleased]`; move them back under it.

Instructions for coding agents are in [CLAUDE.md](CLAUDE.md).

To release what has merged since the last version, run one of these from a clean checkout:

```bash
npm run release:patch   # fixes, small tweaks      0.1.0 -> 0.1.1
npm run release:minor   # new features              0.1.0 -> 0.2.0
npm run release:major   # breaks saved games etc.   0.1.0 -> 1.0.0
```

Each cuts a `release/vX.Y.Z` branch from `origin/main`, runs the tests and type check,
bumps `package.json`, dates the `[Unreleased]` section of the changelog, commits
"Release vX.Y.Z", pushes, and opens a pull request. When it merges, the Tag release workflow
tags `vX.Y.Z` on `main` and moves the `production` branch to it, which deploys the release to
players. Nobody pushes to `production` by hand; it is protected so only that workflow can.

## Reporting problems

Found a bug, a wrong Advance or calamity value, or have an idea? Open an issue with one of
the [issue forms](https://github.com/torontomegaempires/megatracker/issues/new/choose); the
About sheet in the app links there too. Include the app version from the Menu or About.
Contributions are shared under the same [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
licence as the rest of Megatracker (see [CONTRIBUTING.md](CONTRIBUTING.md) for pull requests).

## License

Megatracker adapts the Mega Empires Calculator, which is licensed to users under
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Megatracker is
released under the same license — see [LICENSE.md](LICENSE.md). Megatracker © 2026 Rob McArthur;
portions adapted from the calculator © Matt Crawford. Mega Empires is a game by
Mega Empires / Colossus Games; this is an unofficial fan tool.

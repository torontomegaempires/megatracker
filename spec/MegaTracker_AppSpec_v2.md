# MegaTracker — App Specification v2

Companion PWA for **Mega Empires** (board game). Supports up to 18 players over local Wi-Fi via WebRTC peer-to-peer. No SSR — runs as a SPA.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | SvelteKit 2.x, SPA mode, TypeScript, Svelte 5 |
| Styling | Tailwind CSS 4.x |
| Networking | PeerJS 1.x (WebRTC RTCDataChannel wrapper) |
| Persistence | IndexedDB via `idb` library |
| PWA | `@vite-plugin-pwa` (Workbox) |
| Testing | Vitest (unit), Playwright (e2e) |
| Build | Vite (bundled with SvelteKit) |

---

## Architecture

- **Topology**: Star. All peers connect to Host only; players do not connect to each other.
- **Authority**: Host is the single authoritative source of truth. Clients submit actions; Host validates, updates state, and broadcasts `STATE_PATCH` to all peers.
- **Networking abstraction**: the networking layer is behind a store interface — transport can be swapped without touching game logic.
- **Offline**: app shell + reference data cached via Service Worker after first load. PeerJS Cloud signalling requires internet at session start only.
- **Persistence**: Host persists canonical game state to IndexedDB after every state change. All clients cache the action log locally.

---

## Message Protocol

All messages are JSON over PeerJS data connections:

```ts
interface Message {
  type: 'ACTION' | 'STATE_PATCH' | 'STATE_SNAPSHOT' | 'BROADCAST' | 'PHASE_CHANGE';
  playerId: string;
  timestamp: number;       // Unix ms
  sequenceId: number;      // monotonically increasing, for ordering & dedup
  payload: unknown;
}
```

On reconnect: Host sends full `STATE_SNAPSHOT`. Normal operation: incremental `STATE_PATCH`.

---

## Roles

- **Host**: creates session, participates as a player, is the authoritative WebRTC peer. Exclusive: advance/rewind phases, Fix Game State (unrestricted write to any player's state), remove/reconnect players, end session.
- **Player**: manages own nation, views all other nations (full visibility), accesses card market and rules reference.

---

## Core Data Models

### GameSession

```ts
interface GameSession {
  sessionId: string;
  sessionName: string;
  variant: 'Western' | 'Eastern' | 'Full';
  status: 'lobby' | 'active' | 'ended';
  hostPeerId: string;
  hostPlayerId: string;
  players: Player[];
  currentPhase: number;   // 1–12 (see Phase table)
  currentTurn: number;
  actionLog: ActionEntry[];
  createdAt: number;
  endedAt?: number;
}
```

### Player

```ts
interface Player {
  playerId: string;
  playerName: string;
  civilisationId: string;
  civilisationName: string;
  astRanking: number;      // 1–18, fixed, used as tiebreaker (lower = higher priority)
  colorHex: string;
  isHost: boolean;
  peerJsId: string;        // changes on reconnect

  // Token pool — INVARIANT: populationOnBoard + populationInStock + inTreasury === 55
  populationOnBoard: number;
  populationInStock: number;
  inTreasury: number;

  // Cities and ships are NOT part of the 55-token pool
  citiesOnBoard: number;   // max 9
  citiesInStock: number;
  shipsOnBoard: number;    // max 4
  shipsInStock: number;

  commodityHand: Record<CommodityType, number>;  // quantity per commodity (0–9 each)
  ownedCardIds: string[];
  astPosition: number;     // starts at 1; advances during Phase 11
  victoryPoints: number;
  connectionStatus: 'connected' | 'disconnected' | 'removed';
}
```

### CivilisationCard

```ts
interface CivilisationCard {
  cardId: string;
  name: string;
  deck: 'Western' | 'Eastern';
  group: 'Arts' | 'Crafts' | 'Sciences' | 'Religion' | 'Civics';
  baseCost: number;
  vpTier: 1 | 3 | 6;   // 1 if cost<100; 3 if 100–199; 6 if ≥200
  description: string;
  specialAbilityDescription: string;
  credits: CardCredit[];          // { targetCardId, creditAmount }
  calamityModifiers: CalamityModifier[];
}
```

### Calamity

```ts
interface Calamity {
  calamityId: string;
  name: string;
  type: 'tradeable' | 'non-tradeable';
  severity: number;
  description: string;
  resolutionSteps: string;
  affectedStats: string[];
  mitigatingCardIds: string[];
}
```

### ActionEntry

```ts
interface ActionEntry {
  entryId: string;
  timestamp: number;
  phase: number;
  initiatedBy: string;   // playerId or 'host'
  actionType: string;
  description: string;
  previousValue: unknown;
  newValue: unknown;
  affectedPlayerId: string;
}
```

---

## Critical Invariants

### 55-Token Pool

`populationOnBoard + populationInStock + inTreasury === 55` at all times for every player.

Every state mutation is a **bucket transfer** with an explicit source and destination. The app validates before applying and rejects any operation that violates the invariant. The only override is Host's Fix Game State screen (which still displays the running total and blocks save if ≠ 55).

Cities and ships are separate — they are NOT counted in the 55.

### AST Position

- Initial value: **1** (all players start at AST position 1)
- Advances by 1 per Phase 11 advancement
- Minimum value: 1 (cannot go below starting position)

### Token Movements by Phase

| Phase | Transfer |
|---|---|
| 1 — Tax Collection | `inStock → inTreasury` (2 per city). Pre-fill amount. If inStock insufficient → tax revolt flag. |
| 2 — Population Expansion | `inStock → onBoard`. Player enters count; must expand as many as possible. |
| 3 — Ship Construction | (a) 2 `inTreasury→inStock`; (b) 1 `inTreasury→inStock` + 1 `onBoard→inStock`; (c) 2 `onBoard→inStock`. Maintenance: 1 per ship from treasury→stock. |
| 4 — Conflict | Losses: `onBoard→inStock`. City attack win: defender 6 `inStock→onBoard`; attacker up to 3 `inStock→inTreasury`. |
| 5 — City Construction | Tokens in area: `onBoard→inStock`; `citiesInStock→citiesOnBoard`. |
| 6 — Trade Card Acquisition | Extra cards: 15 `inTreasury→inStock` per card. Block if `inTreasury < 15`. |
| 9 — Calamity Resolution | Population loss: `onBoard→inStock`. Treasury loss: `inTreasury→inStock`. City loss: `citiesOnBoard→citiesInStock`. |
| 12 — Civ Advances | Cost paid: `inTreasury→inStock`. Cannot overpay; excess commodity value forfeited. |

### Credit System

Net card cost = `baseCost − sum(creditAmount for each owned card that credits this card)`. Calculated in real time (Svelte derived stores). Must complete in < 100ms for full card set — profile before release.

### Victory Points

```
VP = citiesOnBoard
   + (1 VP × cards with baseCost < 100)
   + (3 VP × cards with baseCost 100–199)
   + (6 VP × cards with baseCost ≥ 200)
   + (5 VP × (astPosition − 1))
   + 5 bonus VP if exactly one player enters Late Iron Age era
```

**Note:** AST VP formula is `5 × (astPosition − 1)`. A player at starting position (1) earns 0 AST VP. Each advance beyond position 1 earns 5 VP.

Treasury and commodity sets do NOT contribute to final score.

### Commodity Set Value

A set of `n` identical commodities with face value `f` is worth `f × n²`.

### Trade Card Dealing Order

Phase 6/7: lowest `citiesOnBoard` first; `astRanking` (lower = higher priority) breaks ties.

---

## Civilisations Reference

Odd AST-Ranking = West; Even = East. Colour variables are CSS custom properties on `:root`.

| Rank | Nation | Hex | CSS var |
|---|---|---|---|
| 1 | Minoa | #7CB342 | --color-minoa |
| 2 | Saba | #E57373 | --color-saba |
| 3 | Assyria | #42A5F5 | --color-assyria |
| 4 | Maurya | #F44336 | --color-maurya |
| 5 | Celt | #388E3C | --color-celt |
| 6 | Babylon | #757575 | --color-babylon |
| 7 | Carthage | #FF9800 | --color-carthage |
| 8 | Dravidia | #1A237E | --color-dravidia |
| 9 | Hatti | #E91E63 | --color-hatti |
| 10 | Kushan | #8D6E63 | --color-kushan |
| 11 | Rome | #E91E63 | --color-rome |
| 12 | Persia | #673AB7 | --color-persia |
| 13 | Iberia | #757575 | --color-iberia |
| 14 | Nubia | #26A69A | --color-nubia |
| 15 | Hellas | #FFEB3B | --color-hellas |
| 16 | Indus | #2E7D32 | --color-indus |
| 17 | Egypt | #D7CCC8 | --color-egypt |
| 18 | Parthia | #689F38 | --color-parthia |

**Convention**: every UI element identifying a nation (dashboard headers, scoreboard rows, action log entries, token pool displays, list items) MUST use the nation's `--color-*` CSS variable as its primary visual identifier.

---

## Key Screens

| Screen | Notes |
|---|---|
| Home / Landing | Create or join session; recent sessions from IndexedDB |
| Lobby | Room code + QR, civilisation assignments, ready states, Host starts game |
| Nation Dashboard | Primary screen. Token pool (onBoard/inStock/inTreasury + running total), cities, ships, commodity hand, owned cards, VP. Phase-appropriate action buttons trigger bucket transfers directly. |
| Phase Banner | Persistent top bar — current phase + turn. Tappable for detail. Phase advance/rewind controls visible to host only inside the drawer. |
| Phase Actions | Below the Nation Dashboard. Phase-specific action UI for all 12 phases. |
| Other Nations | Full state view for every player (all values visible to all). Read-only token pools, cities, ships, AST position, commodity count, connection status. |
| Card Market | Grid of civ cards, costs with real-time credits, group filters. Purchase active only during phase 12. |
| My Cards | Owned cards with ability descriptions |
| Scoreboard | Live VP leaderboard. Sorted by total VP desc, then astRanking asc (lower = higher priority) as tiebreaker. VP breakdown shown per player (cities / cards / AST). |
| Action Log | Append-only, filterable by phase and player. Export as JSON download. |
| Rules Reference | Offline, searchable, bookmarkable. All civ cards, calamities, AST, trade tables, phase summary. |
| Connection Status | Persistent indicator top-right; shows reconnecting state. |
| Host: Fix Game State | Host-only. Any field, any player. Logs all changes. Blocks save if pool ≠ 55. |
| Host: Phase Control | Advance/rewind phase, remove players, end game. Located in Phase Banner detail drawer. |

---

## Navigation

Bottom tab bar visible during active game sessions (4 tabs):

| Tab | Route | Icon |
|---|---|---|
| My Nation | /dashboard | ⚔ |
| Nations | /nations | ⊞ |
| Scores | /scoreboard | ★ |
| Log | /action-log | ☰ |

---

## Conventions

- **SPA mode only** — no SSR. Configure `adapter-static` or `adapter-auto` with `prerender = false`.
- **Svelte 5 runes** — use `$state`, `$derived`, `$effect` etc. (not legacy `writable`/`derived` stores) unless integrating with PeerJS which requires imperative setup.
- **State mutations are bucket transfers** — never mutate a token bucket directly. Always use a transfer function that validates the invariant.
- **Action log is append-only** — never delete or edit entries.
- **All reference data** (civ cards, calamities, AST table, commodity values) is static JSON bundled with the app, not fetched at runtime.
- **Nation colours** always via CSS custom properties — never hardcode hex in component markup.
- **Reconnection**: preserve player slot for 10 minutes; on reconnect Host sends `STATE_SNAPSHOT`; Host may manually remove absent player. Client auto-reconnects with backoff (2s / 4s / 8s / 16s / 30s).
- **Screen Wake Lock**: request on session join; fail gracefully on iOS < 16.4.
- **18 copies of each civ card** — no need to track market stock; only track which cards each player owns.

---

## Phased Delivery Plan

| Phase | Scope | Status |
|---|---|---|
| 1 — Foundation | SvelteKit SPA setup, TypeScript types, Svelte stores, Nation Dashboard UI + token pool controls, Vitest unit tests for invariants | ✅ Complete |
| 2 — Networking | PeerJS integration, session create/join, room code/QR, lobby, STATE_SNAPSHOT/PATCH, action log | ✅ Complete |
| 3 — Game Modules | Phase-specific action buttons for all 12 phases, calamity data & logging, scoreboard, nations view, action log UI, auto-reconnect, toast notifications | ✅ Complete |
| 4 — Civ Cards | Card database JSON, credit system, card market UI, purchase flow | ⬜ Next |
| 5 — PWA & Reference | Service Worker, Web App Manifest, offline cache, rules reference + search/bookmarks, Screen Wake Lock | ⬜ |
| 6 — Polish & iOS QA | iOS Safari WebRTC regression (browser + standalone), UI refinement, Playwright e2e | ⬜ |
| 7 — Release | Perf profiling on mid-range Android, a11y, 18-device QA, production deploy | ⬜ |

---

## Changelog

### v2 (2026-02-24)
- **AST Position initial value**: changed from 0 to **1**. All players start at AST position 1.
- **VP formula — AST component**: changed from `5 × astPosition` to **`5 × (astPosition − 1)`**. A player at the starting position (1) earns 0 AST VP; each step advanced beyond position 1 earns 5 VP.

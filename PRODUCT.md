# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Players in the Toronto Mega Empires group, mostly experienced regulars who know the rules. Each player keeps Megatracker open on their own phone at the table during an in-person game, glancing at it between turns while handling trade cards, tokens and the board.

## Product Purpose

Megatracker tracks one player's civilization through a game of Mega Empires: which Civilization Advances they own, their credits in each color, victory points from Advances, and what they can afford to buy this turn. It also answers rules questions that come up mid-game: how many cities they can build, which trade card stacks they can buy from, how calamities affect them, and which special abilities they hold. Success is a player making their once-per-turn purchase quickly and correctly without slowing the table.

## Positioning

A rebuild of Matt Crawford's Mega Empires Calculator (calculator.mega-empires.com) with a better phone interface, maintained by and for the Toronto group so group-specific enhancements can be added over time. An earlier "megatracker" project exists and is not a reference for this one.

## Operating Context

- Used in person, one phone per player, during multi-hour games; attention is split with the physical game.
- Games: The West and The East (same rules, 3–9 players), The Far East (3–11) and Mega Empires (The West and The East together, 10–18), each with its own player count choices; the Special Buildings expansion is optional in all of them.
- Core loop per turn: enter funds (trade card sets, odd commodities, treasury), pick Advances, buy once, resolve any extra-credit choices or free picks.
- Game state is saved on the device only.

## Capabilities and Constraints

- React + TypeScript + Vite static site, hosted on Netlify; phone-first, also usable on larger screens.
- Rules data and calculations come from the original calculator; the five Advance colors (Arts blue, Sciences green, Crafts orange, Civics red, Religion yellow) are game facts and must stay identifiable.
- Undecided: group-specific enhancements, shared/multi-player state, offline install.

## Brand Commitments

- Name: Megatracker, for the Toronto Mega Empires group. The app is free to have its own look, independent of the group website.
- Must credit Matt Crawford's Mega Empires Calculator and stay under CC BY-NC-SA 4.0.

## Evidence on Hand

- No screenshots, testimonials or usage data yet. Do not invent any.

## Product Principles

1. The table comes first: every interaction should be glanceable and fast so the game keeps moving.
2. Density over explanation for experienced players; full rules text one tap away.
3. Never lose a player's game state or let a mis-tap silently corrupt it.
4. Card colors carry game meaning and must read instantly.

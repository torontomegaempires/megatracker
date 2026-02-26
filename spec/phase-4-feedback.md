# Changes from Phase 4 Completion

This document is only to be used to update the CLAUDE.md specification based on feedback after phase 4 completion.

Use 'civilization' not 'civilisation' in all screens and code.
The OnBoard value starts at 1.
onBoard should be called population.
Phase 11 AST Advancement should be after Civilzation Advances

The commodities display should show the value of each commoditie set held (`f x n^2`), the value and the number of cards. 

# Turn Phases

## Phase 1 Tax Collection
If no players have cities, skip Phase 1 Tax Collection

## Phase 2 Population Expansion
The initial value for the Expand Population action should be the onBoard value

## Phase 3 Movement

Phase 3 should be called 'Movement'
The Ship Construction UI needs to offer these options:
- Build Ship: 2 population, 1 population + 1 treasury or 2 treasury
- Maintain Ship: 1 population, 1 treasury
- Destory Ship.

A destroyed ship goes back into the ship stock.

In the UI you don't have to show where the tokens move, just which tokens are affected.

On a turn, the player can do one of these actions per ship. 
If a ship is in the ship stock they may either build it or do nothing. 
If the ship is already built then they MUST either maintain it or destroy it back to stock. 
You cannot destroy a ship and then build it again. 
You cannot build a ship and then maintain or destory it.
You cannot maintain a ship and then destroy it. 

## Phase 4 Conflict

The Phase 4 Actions should present preset options and a variable option.

Buttons with fixed loss numbers:
1,2,3,4,5,6
a variable amount
Plunder City (+3 treasury)
City Loss (-1 city)

The UI should show the totals losses (and gain from plunder)  in the Phase 4 action section and not make the actual changes until a "Confirm" button is pressed or the host moves to the next phase.

## Phase 5 Build Cities

There should be two buttons only:
- 'Build City' - add a city and move 6 population to stock
- 'Wilderness City' - add a city and move 12 population to stock

## Phase 6 Trade Card Acquisition

The Phase 6 Actions should show how many commodities cards the player is eligible to receive (1 per city).
The purchase of extra cards should be a single button 'Buy Gold'. 15 gold will be move from treasury to stock and 1 gold commodity added to the player's hand.

## Phase 7 Trade

The commodities shown should indicate their rank (1 to 9) and as players add them, they should see the total value of that commodity set as well as the total value.

The player should also indicate here what calamities they have, not in Phase 8

## Phase 8 Calamity Selection

If no player has more than the calamity limit, skip this phase.
The calamity limit is:
- 1-8 players - 2 calamities
- 9-18 players - 3 calamities, no more than 2 of which can be Major Calamities.

If a player has more than the calamity limit, then they are presented with an option to choose which calamity was removed (not done in the app). They continue to remove cards until they are at the calamity limit.

The players that are not at the calamity limit will see a dialog saying to wait for the other players over the calamity limit.



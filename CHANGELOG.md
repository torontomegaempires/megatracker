# Changelog

All notable changes to Megatracker. Versions follow [Semantic Versioning](https://semver.org/):

- **major**: a change that breaks saved games or removes something players rely on
- **minor**: a new feature or screen
- **patch**: fixes and small tweaks

The live version shows in the app (Menu, and About) and at `/version.json` on the site.

## [Unreleased]

### Added
- Commodity cards on the Trade tab show the colour of the printed card. The Far East's colours are a best guess until we can check them against the cards.

## [0.5.0] - 2026-11-26

### Changed
- Advances are sorted by cost unless you pick another order.
- The tabs are now in the order Advances, Goal, Cities, Trade, Calamities, Specials, Game.
- The special buildings' Trade benefit is its own paragraph on the Cities tab.
- Calamity effects show as a red − (worse) or a green + (better) instead of arrows.
- The start screen asks which game you're playing: The West, The East, The Far East or Mega Empires (10–18 players), each with its own player counts. The Far East offers 3, 4, 5, 6–8 and 9–11.

### Added
- Turn on the Special Buildings expansion when you start a game, in any game, including The Far East's 12 nations and their buildings.
- Nations show their token color next to their name in a shared game's standings and on the Cities tab.
- The header shows your nation's name on a pill in its color instead of the game's name once you've joined a shared game, or picked your civilization for Special Buildings.
- An Advance's green + calamity tag is filled in when it would help against a calamity your owned Advances currently make worse.

### Fixed
- With 12 or more players (the Mega Empires split decks), every trade card counts toward both the West and East blocks' sets, so Iron goes up to 8 cards rather than 4. The split only decides where a card is drawn.

## [0.4.0] - 2026-11-26

### Added
- Shared games: one player creates a game on the new Game tab and everyone else joins with its four-character code or a join link. Each phone shows every nation's score, rank and the A.S.T. era it has reached, updated live as players change them, and the host ends the game to save the final standings.
- Enter your A.S.T. position on the Game tab. Scores are Advance VP + cities + 5 per A.S.T. space moved + special-building VP, plus 5 VP for the only nation to reach the Late Iron Age.

### Changed
- The About page links to Megatracker's source code on GitHub and drops the group subtitle and the note about commercial licensing.
- About now has a "Report a problem" link that opens Megatracker's GitHub issue forms, with your app version filled in.

## [0.3.0] - 2026-11-26

### Added
- Your purchase now shows how it is paid for, such as "Pay with Fruit 24, Treasury 7": every set you aren't keeping, then the treasury tokens still needed.
- The Special Buildings expansion (The West and The East): turn it on in the Menu. On the Cities tab, below city building, pick your civilization and A.S.T. era, add a building to your purchase (30, 40 or 50, and Library can discount it) or mark one already built, and track the buildings you control. Their VP (2 for owning, 1 per building controlled, 2 more for your civilization's) are shown there, apart from your Advances VP. On the Trade tab you can sacrifice controlled buildings as cards of incomplete sets, placed where they add the most alongside Trade Empire; the Calamities tab offers your building's sacrifice against a calamity.

### Changed
- The VP at the top of the screen now says "Advances" beside it: it counts only your Advances.
- Extra trade cards (the stacks you can buy from and their token prices) moved from the Trade tab to the top of the Specials tab, without the cities count; the Trade tab now starts with your hand.
- Commodity sets you save for next turn are now "kept" rather than "held": tap Keep on the Trade tab.

### Removed
- The Goal tab's Ideas (Advances suggested by theme, such as Cheaper Advances or the next AST age). Add Advances to your goal with "Add to goal" in an Advance's details.

## [0.2.0] - 2026-11-26

### Added
- Goal tab: plan the Advances you want to buy over the game. It shows how many are left, what they cost today and the VP you'll have when done, and you can buy them from there. Ideas by theme (Cheaper Advances, More treasury, Trade cards, the next AST age and the rest) help you add to it, as does "Add to goal" on any Advance's details. Advances on your goal are flagged on the Advances tab.
- Advance rows show the credits each card gives as small boxes in its colours, under the name.
- Trade Empire (West/East) and Silk Routes (Far East) now count toward funds: the Trade tab counts the 1 commodity card that adds the most as a missing card of an incomplete set, and says which card it used.

### Changed
- Advances tab: Show, Sort and Funds now share one row at the top, so the list starts much higher on the screen. "Nearly affordable" is now "Within reach", and the sort names are shorter.
- Advances tab: the "By goal" filter is now "Goal" and shows the unowned Advances on your goal. Its themes moved to the Goal tab as ideas.
- Trade tab redesigned: alongside the extra stacks you can buy from, pick the commodity cards in your hand by name and count, enter your treasury, and hold sets back for next turn. Funds to spend on Advances are worked out from these, replacing the Funds sheet; buying turns in the cards you didn't hold and only the treasury still needed.
- Player count choices are now 3, 4, 5, 6, 7–8, 9, 10–11, 12, 13–14 and 15–18, one per trade card deck, so the Trade tab lists the commodities your block actually uses. Starting credits are unchanged.
- Advances tab: discounted advances now show the discount in red (e.g. −15) instead of the crossed-out original price, with the owned chain card's name beside it when a chain discount applies.

### Fixed
- The line under the selected tab no longer jumps up into the icon when Chrome on Android hides its bottom bar as you scroll.

## [0.1.2] - 2026-11-25

### Changed
- Cities tab: population tokens can now be typed in, and counted either on the map or as what's left in reserve out of 55, whichever is quicker to count.

## [0.1.1] - 2026-11-25

### Changed
- Player count choices are now 3, 4, 5, 6, 7–11, 12 and 13+ (replacing "Other"); 7–11 and 13+ start with no credits.
- The header shows only the block name; the player count / "Custom game" text after it is gone.

## [0.1.0] - 2026-11-25

### Added
- First release: rebuild of the Mega Empires Calculator for the Toronto group, with West/East and Far East rules.
- Advances list with costs after credits and chain discounts, filters, sorting, purchase bar and once-per-turn buying.
- Extra-credit choices, Anatomy and Primal Philosophy free picks, funds entry, AST guide.
- Cities, Trade, Calamities and Specials tabs; game saved on the device.
- "Card Face" design, light and dark schemes.
- Version number and build commit shown in the app and published at `/version.json`.

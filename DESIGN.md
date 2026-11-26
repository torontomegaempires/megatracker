---
name: Megatracker
description: A phone-at-the-table tracker for Mega Empires, where every Advance is the edge of its printed card.
colors:
  advance-blue: "#2463b5"
  advance-green: "#1f8546"
  advance-orange: "#df6c1d"
  advance-red: "#c42e27"
  advance-yellow: "#ebc01f"
  on-swatch: "#ffffff"
  on-yellow: "#1d1a0c"
  stock: "#ffffff"
  stock-ink: "#17181a"
  blue-tint: "#dfe9f6"
  green-tint: "#dcefe2"
  orange-tint: "#fbe6d6"
  red-tint: "#f7dedc"
  yellow-tint: "#faf0c8"
  table-mat: "#dcdfe2"
  table-mat-deep: "#cfd3d7"
  card: "#ffffff"
  card-hover: "#f1f2f3"
  card-sunk: "#e4e6e8"
  ink: "#17181a"
  ink-muted: "#4c5157"
  line: "#d3d6da"
  line-strong: "#b4b9bf"
  on-ink: "#ffffff"
  focus: "#1a5fd6"
  good: "#1d7a40"
  bad: "#bf2b23"
  table-mat-dark: "#121315"
  table-mat-deep-dark: "#202226"
  card-dark: "#2f3236"
  card-hover-dark: "#393c41"
  card-sunk-dark: "#44484e"
  ink-dark: "#f2f3f4"
  ink-muted-dark: "#aab0b7"
  line-dark: "#3a3e43"
  line-strong-dark: "#5a5f66"
  on-ink-dark: "#101113"
  focus-dark: "#79aaff"
  good-dark: "#5fcf86"
  bad-dark: "#ff7f74"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.01em"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.01em"
  numeral:
    fontFamily: "Barlow Condensed, Arial Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    letterSpacing: "0.02em"
  section-label:
    fontFamily: "Barlow Condensed, Arial Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  card: "7px"
  ui: "10px"
  sheet: "14px"
  coin: "50%"
spacing:
  hairline: "4px"
  tight: "6px"
  gutter: "14px"
  tap: "44px"
  colour-field: "62px"
  bar: "62px"
components:
  button:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.ui}"
    padding: "0 16px"
    height: "44px"
  button-hover:
    backgroundColor: "{colors.card-hover}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.ui}"
    padding: "0 16px"
    height: "44px"
  chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.ui}"
    padding: "0 12px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
  advance-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.card}"
    padding: "7px 12px"
    height: "58px"
  cost-coin:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.stock-ink}"
    rounded: "{rounded.coin}"
    size: "44px"
  cost-coin-picked:
    backgroundColor: "{colors.stock-ink}"
    textColor: "{colors.stock}"
  credit-tile:
    backgroundColor: "{colors.advance-blue}"
    textColor: "{colors.on-swatch}"
    typography: "{typography.numeral}"
    rounded: "{rounded.card}"
  vp-tile:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.numeral}"
    rounded: "{rounded.card}"
    padding: "0 10px"
    height: "36px"
  select:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.ui}"
    padding: "0 34px 0 10px"
    height: "38px"
  sheet:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
  tab:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-muted}"
    height: "62px"
  tab-active:
    textColor: "{colors.ink}"
---

# Design System: Megatracker

## Overview

**Creative North Star: "Card Face"**

Every Civilization Advance in the list is the edge of the real printed card, recognised by its colour before its name is read. The screen is a card table: a cool grey table mat underneath, white card stock on top, and the five Advance colours printed at full strength as flat fields. Near-black ink carries the text, the selected states and the one primary action. Condensed card titling (Barlow Condensed) sets every name and every number; the system sans is kept for rules text and small explanatory lines.

The density is that of a hand of cards held close: rows four pixels apart, one row per Advance, nothing sparse. Players are glancing between turns, so recognition beats explanation. Colour is the first read, the cost coin the second, the name the third. Cards behave physically: a picked card slides out of the stack with a deeper shadow and an ink outline, an owned card reads as played, its colour knocked back and its coin showing a check.

Dark mode is a deliberate, user-confirmed exception to "white card stock": the cards turn dark grey on a near-black mat because it is easier on the eyes in a dim room. What stays printed in both schemes is what belongs to the physical card: the five Advance colours, the white cost coins, the white name plate on the Advance sheet and the white coins in the hand.

**Key Characteristics:**
- Five Advance colours at full printed strength, identical in light and dark schemes.
- Flat colour fields only; dual-colour cards split into two equal flat halves.
- Condensed uppercase card titling for headings, labels and all numbers, tabular figures.
- White card stock on a cool grey mat (dark cards on a near-black mat in dark mode).
- Near-black ink as the single action and selection colour; no brand accent.
- Physical state: picked cards lift and shift, owned cards are played and desaturated.

## Colors

A table-mat neutral system that gives all the chroma to the five printed Advance colours, with near-black ink as the only other strong voice.

### Primary
- **Arts Blue** (advance-blue): Arts Advances, credit tile and filter fields. White text on it.
- **Sciences Green** (advance-green): Sciences Advances. White text on it (4.66:1).
- **Crafts Orange** (advance-orange): Crafts Advances. Ink text on it (about 5.3:1), never white.
- **Civics Red** (advance-red): Civics Advances. White text on it.
- **Religion Yellow** (advance-yellow): Religion Advances. Ink text on it.
- **Print Ink** (on-yellow): The text colour on orange and yellow fields.

Each colour also has a pale wash (blue-tint through yellow-tint, darkened to deep washes in dark mode) for small supporting surfaces. The printed colours themselves never change between schemes.

### Secondary
- **Card Stock** (stock) and **Stock Ink** (stock-ink): The printed card material. Cost coins, the hand-chip coins and the Advance sheet's name plate are always white stock with near-black text, whatever the scheme.

### Neutral
- **Table Mat** (table-mat; dark: table-mat-dark): The page ground behind every card, including the sticky header.
- **Deep Mat** (table-mat-deep): Track backgrounds such as the age progress bar.
- **Card** (card; dark: card-dark): Rows, panels, sheets, tab bar, the hand tray.
- **Card Hover** (card-hover) and **Sunk Card** (card-sunk): Hover on card bodies, fact tiles, segmented-control trough, badges, and the colour the owned field is mixed toward.
- **Ink** (ink; dark: ink-dark): All primary text, the VP tile, selected chips, the primary button, active tab marker, the picked outline.
- **Muted Ink** (ink-muted): Secondary text, prices, unselected chips and tabs, section labels.
- **Line** and **Strong Line**: Dividers, and the 1px outline on buttons, chips, selects and steppers.
- **Focus Blue** (focus): Focus rings, text links, caret.
- **Good** and **Bad**: Calamity help and harm, owned price, over-funds warnings, non-tradeable stack numbers.

### Named Rules
**The Printed Colour Rule.** The five Advance colours are game facts. Use them only to mean their Advance colour, at full strength, as flat fields. They are the same values in light and dark mode.

**The On-Colour Rule.** White on blue, green and red; print ink on orange and yellow. Compute it from the colour, never choose per screen.

**The One Ink Rule.** Ink is the only selection and action colour: selected chip, Buy, VP tile, picked outline, active tab. There is no brand accent hue.

## Typography

**Display Font:** Barlow Condensed 500/600/700 (with Arial Narrow, system sans)
**Body Font:** System UI sans (ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto)

**Character:** The condensed face is the card's printed titling: tall, narrow, uppercase for headings and labels, mixed case for Advance names. The system sans stays out of the way for rules text so it reads like the rulebook, not the card.

### Hierarchy
- **Display** (700, 56px, 0.9): Setup screen title only.
- **Headline** (700, 28px, 1, uppercase): Page heads and sheet titles; 32px on the Advance sheet's name plate.
- **Title** (600, 20px, 1.1, mixed case): Advance names in rows and list row titles.
- **Numeral** (700, 22 to 32px, tabular): Credits, VP, funds, cart total (32px), fact values; 80px for the single result figure on calculator sheets.
- **Body** (400, 15px, 1.4): Rules text, max 68ch; supporting lines at 13 to 14px in muted ink.
- **Label** (600, 14 to 17px, 0.02 to 0.03em, uppercase): Buttons, chips, tabs, selects.
- **Section Label** (700, 15px, 0.06em, uppercase, muted ink): The heading of each section inside a sheet ("Effect", "Calamities").

### Named Rules
**The Every-Number Rule.** Every number a player reads (cost, credit, VP, total, count) is set in Barlow Condensed with tabular figures.

**The Rulebook Rule.** Rules prose and explanatory sentences are system sans, never condensed and never uppercase.

## Layout

A single phone column, max 760px wide and centred on larger screens, with a 14px gutter. The header is sticky on the table mat: a 44px row with the menu, the block name ("THE WEST") in condensed uppercase with the player count beside it, and the VP ink tile at the right; below it five equal credit tiles across the full width, then the age track. The block name replaces the app name in the header because "Megatracker" truncated at phone width; the app name lives in the document title and setup screen.

Under the header, filter chips wrap onto as many rows as they need so the active filter is always visible, followed by the styled Sort select and the funds strip. Then the stack: card rows 4px apart, with 12px extra above the start of each strategic chain. The bottom is fixed: a 62px six-tab bar, and when cards are picked (on the Advances or Goal tab) the hand tray sits above it with horizontally scrolling hand chips, the total, Clear and Buy. Sheets rise from the bottom on phones (max 600px wide) and centre as dialogs from 700px.

Touch targets are 44px minimum throughout; the row colour field is 62px wide to hold the 44px coin with margins and keep the tap target generous.

## Elevation & Depth

Cards sit on the mat with a soft two-layer contact shadow; nothing else floats. Depth is physical, not decorative: a picked card lifts to a higher shadow and slides 6px right with a 2px ink outline. The hand tray throws one upward shadow over the stack. Dark mode deepens the same shadows rather than adding glows.

### Shadow Vocabulary
- **Resting card** (`0 1px 1px rgb(20 24 28 / 10%), 0 2px 6px rgb(20 24 28 / 8%)`): Rows, panels, credit tiles, notices, the funds strip, the sheet name plate.
- **Lifted card** (`0 2px 4px rgb(20 24 28 / 14%), 0 10px 22px rgb(20 24 28 / 18%)`): Picked rows and selected block options (with `0 0 0 2px` ink), sheets.
- **Hand tray** (`0 -10px 24px rgb(20 24 28 / 12%)`): The purchase tray over the stack.

### Named Rules
**The Lift Means Picked Rule.** The high shadow plus ink outline plus 6px shift is reserved for "in this turn's hand" (and the chosen block on setup). Do not use it for hover or decoration.

## Shapes

Cards have a slight printed-card corner (7px); controls (buttons, chips, selects, steppers) a slightly softer 10px; sheets 14px on their top corners (all corners when centred). Cost coins are true circles; the hand-chip coin is a pill. Colour fields are clipped by the row's corner and never carry their own radius. Dual-colour cards split into two equal flat halves at a hard 50% stop, with no blend.

## Components

### Buttons
Condensed uppercase card titling on a 44px bar.
- **Shape:** Softened corners (10px), 1px strong-line border.
- **Default:** Card background, ink text, 17px label.
- **Primary:** Ink fill, on-ink text. Used once per context (Buy, setup start).
- **Hover / Active:** Card-hover fill (primary mixes ink 86% toward card); presses down 1px. Disabled at 40% opacity.
- **Quiet / Danger:** Borderless transparent; danger uses bad red text.

### Chips
- **Style:** Card background, strong-line border, muted ink, 16px condensed uppercase, 36px tall.
- **State:** Selected is ink fill with on-ink text. Chips wrap to more rows on phones; never horizontally scroll the filter set.

### Advance Row (signature)
The edge of the card. A 62px flat colour field on the left (two equal halves for dual-colour cards) holds a 44px white stock coin with the cost; the white card body holds the name (Title), calamity marks, and at the right the VP and printed price (struck through when discounted).
- **Pick:** Tapping the colour field toggles the card into the hand; the coin turns ink with a white ring and the row lifts.
- **Owned:** The field mixes 30% colour into the sunk card colour; the coin shows a green check; the name goes muted and the price reads "Owned" in green.
- **Calamity marks:** Up arrow plus green for help, down arrow plus red for harm; unowned effects at 55% opacity.
- **On the goal:** A small filled ink flag before the name of an unowned Advance on the player's goal. It is not shown in the goal list itself.
- **Row action:** An optional 48px button after the body, with a hairline divider (add to or remove from the goal on the Goal tab).

### Credit Tiles and Chooser
Five equal tiles in the printed colours, numeral over an uppercase colour name, resting shadow, on-colour text. The credit chooser in sheets reuses the same tiles.

### Hand Chips
A 38px card with the same flat colour field (two halves when dual) holding a stock pill coin, then the name and a remove button.

### Advance Sheet Header
The card's colour field in equal flat halves across the full header. The name and subline sit on a white stock name plate (resting shadow) so no text crosses the seam; the close icon takes the right half's on-colour.

### Inputs / Fields
- **Style:** Card background, 1px strong-line border, 10px radius, 38px tall.
- **Selects:** Native arrow removed; Barlow Condensed uppercase 17px with an ink chevron icon at the right.
- **Stepper / Segmented:** Stepper is a bordered group with 44px buttons and a 22px condensed numeral; segmented sits in a sunk trough with the selected segment in ink.
- **Focus:** 2px focus-blue outline, 2px offset, everywhere.

### Navigation
Bottom tab bar on card with a top hairline, six equal 62px tabs of icon over 14px condensed uppercase label (13px under 400px wide, 12px under 340px, so "Calamities" fits). Inactive in muted ink; active in ink with a 3px ink bar near the bottom. Badges are small ink pills.

### Icons
Inline 24-unit stroke SVGs, 2px round stroke, 22px default, currentColor.

## Do's and Don'ts

### Do:
- **Do** paint Advance colour as a full-strength flat field the player can recognise before reading.
- **Do** split dual-colour cards into two equal flat halves everywhere (row field, hand chip, sheet header) and keep text off the seam.
- **Do** set the on-colour by colour: white on blue, green and red; ink (#1d1a0c) on orange and yellow.
- **Do** keep cost coins, hand coins and the sheet name plate white stock with near-black text in both schemes.
- **Do** set every number in Barlow Condensed with tabular figures.
- **Do** pair green and red with an up or down arrow for calamity help and harm.
- **Do** keep every tap target at least 44px.

### Don't:
- **Don't** reduce an Advance colour to a thin accent stripe on a tinted row.
- **Don't** use gradients or blended colour transitions on card fields.
- **Don't** change the five printed colours between light and dark mode.
- **Don't** signal state or effect with colour alone.
- **Don't** introduce an accent hue for actions or selection; ink is the action colour.
- **Don't** set rules prose in the condensed face or in uppercase.

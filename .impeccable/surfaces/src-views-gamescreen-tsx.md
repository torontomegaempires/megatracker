---
version: 1
slug: "src-views-gamescreen-tsx"
primary_target: "src/views/GameScreen.tsx"
related_targets: ["src/styles/app.css","src/views/AdvancesView.tsx"]
---

# Surface: Megatracker game screen (whole app shell)

Scope: the in-game app (header, Advances list, purchase bar, detail sheets, other tabs, setup). Mode: Operate.
Audience: experienced Toronto group players, own phone at the table, glancing between turns. Job: make the once-per-turn purchase fast and correctly; look up rules effects. Constraint: keep one row per Advance; never feel sparse.

## Direction contract

THESIS: Every Advance row is the edge of the real Civilization Advance card in its full printed colour, recognised before it is read. Refuses the generic tinted list with a thin colour accent.

OWN-WORLD: White card stock on a cool grey table-mat ground; the five Advance colours at full printed strength as flat fields (no gradients; dual-colour cards split into two flat halves); near-black ink; condensed card titling (Barlow Condensed) for names and every number, tabular; system sans for rules text. Picked cards lift out of the stack (shadow, ink outline); owned cards read as played (desaturated field, check).

STORY: The player sees their credits as five card-colour tiles, scans the stack by colour, taps a card's colour field to pull it into this turn's hand, sees the total against funds, buys once.

FIRST VIEWPORT: Top: brand line with VP as an ink tile; five saturated credit tiles full width. Then filter chips and sort. Then the card stack: each row = colour field (56px) holding the cost in a white circle, white card body with name, calamity marks, VP and printed price at right. Purchase bar above bottom tabs when cards are picked; Buy is the ink button.

FORM: Card Face (my #1 grounded candidate, chosen by the user as the pick), seed 526b58c1.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

# 104 · A cell meets a template's main parameter only where the copy reads it as what it is

**Date:** 2026-11-23 · **Status:** accepted (the owner on #920, 2026-11-23: option 1, "but potentially also 2)"; then, on the note and the song forms it left, "1, generalize") · Issues: #920, #902 · Amends [075](075-a-name-is-only-a-name.md) (a fit takes the one cell that meets the main parameter)

## Context

A fit with no argument named takes, as a template's main argument, the one cell of the workbench that meets the parameter (075). "Meets" meant that the copy compiled over it with nothing new said. That is any cell that compiles in the parameter's place.
- **On a plain meter line,** `&bar meter("4/4") step=120bpm`, a query at Bossa nova's point fitted 165 of 234 fragments: forms taking the bar as their phrase, performers as their part, harmonies and motifs as their key (#920).
- **The old meter template hid it:** its extra cells (`&grouping`, `&swing`) made several candidates, so none was taken.
- **#902's `bar` removes those cells,** and the looseness showed for a meter, for a lone note (`&tonic D` as a key) and for a text cell.

## Decision

1. **A cell meets a parameter only where the copy reads it as what it is:** its kind (`kinds.ts`) against each read of it (`reads.ts`, its path), in `readAsItIs` (`repository/fit.ts`).
   - **A meter** only as a clock (`step=&bar`, `&bar:beat`) or its levels as values in an expression (a count's `[.9 + &bar * -.3]`), and somewhere. Its levels are values only at its own steps: not in an expression a splice holds a step long (decision 097), as a section plan holds its kinds' sums a section each, to any depth of sums (#920, below). Not as a key, a phrase or a part, nor read nowhere. A meter here is the root meter (a tempo of its own, 095), or a braid written `meter(…)`: not a scale (a scan reads as a meter too), nor a clock of the wall (a law's day).
   - **A lone note** (steps of one, `&tonic D`) only as a tonic: no key, phrase, part or value.
   - **A text cell** never: a generator's argument alone (101).
   - **As a table** (`over=`): a table, a line, a blank or steps.
   - **As a part** (a gate's `play=`): a line or steps. `reads.ts` doesn't list `play=` yet (#825), so the rule reads it from the parameter.
2. **Compiling clean is still needed:** the rule is a second condition, not a replacement.

## Why

- **A fit is a guess at what the workbench means;** a guess that takes the bar for a chord is worse than none. The template already says how it reads its argument, so the cell must be one that can be read so.
- **One rule by kind,** not a list of fragments, and never by name (075).

**Why not** a meter that meets only a clock: the counts read the bar's levels as values (`fragments/counts/`).
**Why not** the workbench saying what it offers (the owner's option 2): it works today (a signature's heads) and stays the way to settle what this rule can't. It is a frontend's to write.

## Consequences

- **A plain meter line fits 75 fragments at Bossa nova's point, not 165:** the rhythms, the layers, the open fragments, the counts and the song forms (68 since #920: not the song forms, below).
- **The song forms no longer take the bar as their intensity** (#920, amended 2026-11-24): their section kinds read the main argument in a sum, and the song form splices those sums as its plan's steps, so each holds one value a section; a meter's levels are a value a step of the meter, so they meet only an expression no splice holds (a count's, multiplied into its clicks). A plain meter line fits 68 fragments at Bossa nova's point. A workbench that offers its `&song`, or a host that names it, still names it outright.
- **Jambot's bench** of a meter, a key and a harmony: the meter no longer meets a walking bass's `&harm`. The key and the harmony still do, so one is offered or named, as before.
- **Its cost is the reading's, found once a template:** how a template reads its main argument is the template's and its arguments', whatever the workbench, so it is kept across queries and asked before the copy is compiled over a cell. `timing.slow.test.ts`'s three fitting queries take what they took before it (6.1–6.4 s here against `main`'s 6.4 s; 9.1 s when it read each cell's copy anew).
- `firstguess.ts` judges a part's clock with a harmony standing in for its main argument, where the bar stood in by accident.
- Tests: `fit.test.ts`, `fitsas.test.ts`.

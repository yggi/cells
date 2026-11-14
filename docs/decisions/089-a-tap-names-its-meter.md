# 089 · A tap names its meter where a piece has several

**Date:** 2026-11-14 · **Status:** proposed (the owner asked for #757 next, 2026-11-14; which of its options is his to rule: this is option A, as recommended) · Issues: #757

*Amends [040](040-pulse-beat-and-laps.md) (a tap reads the piece's main meter). Read with [075](075-a-name-is-only-a-name.md) (no name is the piece's by convention).*

## Context

A tap that names no meter (`step=4n`, `step=pulse`) reads the piece's main meter, which was "the first meter in the text with a tempo of its own" (040). So the order of two lines changed what a text played, and said nothing (on `main`, 3b2b23e):

```cells-fragment
&b2 meter("3/4") step=60bpm
&bar meter("4/4") step=120bpm
&t step=4n 0 2 4 5            # a step a second; with the two lines above swapped, two a second
```

Line order means nothing anywhere else in a text: a fragment's lines are a union, the tools reorder freely, and a `from` line's copy lands where the expansion puts it. Decision 075 retired every name the piece has by convention; the main meter was the same kind of thing, by position.

Measured over the 89 examples, with their `from` lines written in:

| | examples |
|---|---:|
| no meter | 8 |
| one meter | 76 |
| a second meter that taps the first (`rhythm`, `bossa`, `bell`): the order never mattered | 3 |
| two meters with a tempo of their own, every tap naming its meter (`breve`) | 1 |
| four clocks of the wall (`daytime`), one bare tap, which read the first | 1 |

So the order mattered in two examples, and one bare tap leaned on it.

## Decision

1. **The main meter is the meter with a tempo of its own**: a rate (`step=120bpm`) or a tempo cell's (`step=&tempo`), wherever it is written. A lap of the wall clock (`loop=1d`) only where no meter steps, as before.
2. **A meter that taps another is never the main one**, wherever it is written (`&clave scan(3 3 4 3 3) step=pulse*5/4`): it keeps the first's time. It was so already, by the order the compiler happened to read the clocks in; it is now by rule, the meters gathered before any tap is read.
3. **Where a piece has several meters with a tempo of their own, none is the main one by its place in the text.** A tap there names its meter (`step=&waltz:4n`), and a bare one is an error that lists them and writes the first's tap.
4. **Migrate writes the meter the tap read**: the first in the text, `step=4n` → `step=&minute:4n` (`migrate/mainmeter.ts`), checked by sound against the old way of reading it.
5. **`CompileResult.mainMeter` stays** the first of them, for a host that shows one tempo (a MIDI file's, a clock's); `CompileResult.meters` lists them where there is more than one. Whether a host's choice among several should be said in the text is open.

**Why not** a word that declares the main meter (option B): a new form for a case two examples have, and a tap that names its meter already says it.
**Why not** a warning alone (option C): the order would still change what plays.

## Consequences

- **A text that compiled is an error** where it has several meters with a tempo of their own and a bare tap. Migrate rewrites it; it plays the same.
- **`daytime`** writes `&tick step=&minute:4n`; its events don't move. No other example and no seed fragment changes.
- A time parameter that reads a tap (`delaytime=8n`) in such a piece names its meter too.
- **Normalise** names a bare tap's meter last, after it folds a second clock into the main meter (`tapClock`, `shadowMeter`, #668): a piece left with one meter keeps its taps bare, and one that still has several has them named. Its readers folded onto a meter of several are written by its name (`daytime`'s kept rewrite: `step=&minute:1m`).
- **Open:** what a host that needs one tempo reads in a piece of several meters (5); and whether Normalise writes a tap that names the piece's one meter bare (`step=&bar:4n` → `step=4n`), a row of the canonical table (#27).

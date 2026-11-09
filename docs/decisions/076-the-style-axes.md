# 076 · The style point is `sync harm drive bright`; energy leaves it as intensity, an offset from the style; entropy is the reach

**Date:** 2026-11-07 · **Status:** accepted (the owner on #539, 2026-11-07: the nudges "darker–brighter, on the beat – offbeat, static – moving, 'stabby' – 'paddy'"; energy as an offset "relative to the style") · Issues: #539, #536 (the style epic) · Amends [063](063-the-score-and-the-band.md) §3 (the table of axes) and [041](041-fragments-by-style.md) (what a point is written on)

## Context

A style is a point on cells' table of axes, `AXES`: `sync`, `harm`, `artic`, `energy` (decision 063 §3; swing left them for the meter, decision 043 §6).
#539's measurement ([notes/539-axes.md](../notes/539-axes.md), `tools/axes.ts`), over the eleven styles of #537 and the library's 179 association points, found:

- **Articulation and energy carry one direction between them.** They correlate 0.84 over the presets and 0.74 over the library. The presets' fourth principal direction carries 1.3 % of their spread. Merging the two keeps the presets' distances (r 0.978) and moves the nearest preset of 5 of 179 library points.
- **What tells styles apart is often off the point.** Places by hand, measured as the repository measures:
  - doom metal and Kinderlied are 0.09 apart;
  - a jazz ballad and Spooky 0.08;
  - ska and Funk 0.06;
  - the presets Synth-pop and Deep house 0.090, told apart only by their tempo and their meter's swing.
- **The mode tells apart what the four crowd.** A brightness from the mode (a scale's degrees above locrian's, over lydian's six) raises the median gap from a preset to its nearest from 0.154 to 0.187, and moves a jazz ballad from Spooky to Swing jazz.
- **Energy reads as a place what is often a moment.** A jazz ballad and bebop are 0.47 apart, though one is the other played softly and sparsely.
  - Jambot already plays energy as a moment: its sections move it from the style's (`ENERGY_OFFSET` in `packages/engine/src/form.ts`: a breakdown −0.45, a drop +0.3, a build ramping −0.15 to +0.30).

## Decision

1. **The style point is four axes, in this order: `sync`, `harm`, `drive`, `bright`.** Each runs 0 to 1, with a label and the words at its ends, the owner's nudges:

   | axis | label | 0 | 1 | what it measures |
   |---|---|---|---|---|
   | `sync` | Syncopation | on the beat | offbeat | where the accents fall |
   | `harm` | Harmony | static | moving | how the harmony moves |
   | `drive` | Drive | paddy | stabby | sustained, few onsets, to short, many onsets: articulation and density as one |
   | `bright` | Brightness | darker | brighter | the mode's brightness |

   `sync` and `harm` keep their slots, so a positional `map=style` keeps its first two values.
2. **`bright` is written by rule where a fragment has a mode, and left out where it makes no claim.**
   - A mode fragment's `bright` is its scale's: its degrees above the tonic summed, the third and the sixth counted twice, from locrian's sum (0) to lydian's (1) (`BRIGHTNESS`, `src/engine/style.ts`): locrian 0, phrygian 1/8, aeolian 2/8, harmonic minor 3/8, dorian 4/8, mixolydian 6/8, ionian 7/8, lydian 1.
     - #572 took this rule over the plain sum (the rule above, each degree once), which puts harmonic minor level with dorian (3/6): the third alone can't part them, both minor, but the sixth does. Over the eleven styles it keeps the median gap from a style to its nearest (0.187) and raises the smallest from 0.112 to 0.142, and Spooky and Electro swing, both harmonic minor, sit darker than Funk and Deep house (dorian).
   - A tonal fragment (harmony, bass, motif, stab, instrument) takes the `bright` of the mode the repository finds at its point as its first value. Use and hand move it after.
   - A meter, a rhythm, a performer, a module or a form leaves `bright` out: a point names the axes it speaks to (decision 041), and a distance runs over the axes both points have.
3. **Energy is not a style axis. It is intensity:** how hard a style is played at a moment, density, layers, velocity, register and timbre together.
   - Intensity is an offset relative to the style: a break is a section with lower intensity than its style's.
   - How it is written, at which scales, and what it drives, is #571's.
4. **Entropy is the reach, not a place:** how far the style may wander and how novel its parts may be. It is never on a point and never in a query, as today.
5. **Tempo stays off the point** (decision 037, D6). A preset's default tempo is its style cell's `step=` (#537).

**Why not** keep the four and add `bright` as a fifth: the presets use three directions, not four, and a fifth axis costs every frontend another nudge for 1.3 % of the spread.
**Why not** the principal components: their axes are blends with no words, and they move each time a style is added.
**Why not** energy redefined as intensity on the point: intensity changes within a piece, section by section. A point that moves with every breakdown is no longer where the style is, and the composer's queries would wander with it.

## Consequences

- **One migration** (#572) does all of this together:
  - `AXES` changes and `SLOTS.style` follows;
  - every association point moves by rule: `drive` the mean of `artic` and `energy`, `bright` as (2), `artic` and `energy` dropped;
  - every style cell in `styles` moves the same way;
  - Migrate gains a rule for a text that writes `map=style` with the old four, by position or by name, and for a pick of `[artic]` or `[energy]`.
- **What a piece sounds like moves where it reads the style.** The default band's instruments read `&style[artic]` (the bass's and the lead's cutoff, the keys' and the pad's envelope) and `&style[energy]` (the lead's cutoff).
  - Read as `&style[drive]`, they play differently wherever a style's articulation and energy differ.
  - The migration names each moved snapshot, and the owner accepts them there.
  - A reading of intensity, where #571 gives one, may take the lead's cutoff instead.
- **Jambot follows at its pin.**
  - Its `Style` becomes `{ point, tempo, reach }`, with intensity at section rate (yggi/jambot#597).
  - Its four nudges are these axes.
  - Its section offsets move from `energy` to intensity.
  - Its Style sheet is the map of yggi/jambot#598, its axes these.
- **The library's own work** follows on these axes:
  - #540 (associations complete);
  - #541 (the reader: `bright` from the chords read back);
  - #542 (more styles: at least one dark one, since today's darkest presets are aeolian).
- **Open:** intensity's spelling and scales are #571's. (The brightness rule was #572's, measured and taken there: §2.)

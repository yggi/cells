# 087 · A mix cell's sort from what it holds: a named product with no voice is its parentheses

**Date:** 2026-11-12 · **Status:** accepted (the owner on #740's question, 2026-11-12: "yes, option 1") · Issues: #740, #691

*Amends [006](006-mix-algebra.md) (the mix algebra: a factor's sort comes from the cell). Read with [075](075-a-name-is-only-a-name.md) (a name is only a name), [079](079-a-sum-of-cells-and-a-window.md) (a mix with no voice is a sum of values) and [085](085-plugin-fragments.md) (plugin-fragments, whose head this spells).*

## Context

Decision 006 types a mix over sorts: pitch, volume, signal (sound), wave and plain. Each cell's sort is inferred from its own line, never from where it is read. But for a cell whose braid is a mix, the inference read the line's *shape*: any such cell was a signal (an instrument), unless 079 read it as a sum of values. So a group of factors could be parenthesised and not named:

| text (on `main`, 17deb47) | before |
|---|---|
| `[(&notes * &level) * &glass * .3]` | plays, as the flat product does |
| `&cycle [&notes * &level]`, then `[&cycle * &glass * .3]` | **error:** "has no voice" and "Two sounds can't multiply" |

That goes against the mix algebra's own laws (grouping doesn't matter), 075 and L9 (a copy is its template written in). It blocked a plugin-fragment's head (085, rung 1's finding) and a score's part with its levels handed to a performer (063).

## Decision

1. **A mix cell's sort is inferred from what it holds**, still from its own line:
   - with a sound in it (a voice, an instrument, a gate, a kit read, a tape's read head, a wave): a **signal**, as before;
   - with no sound, a sum of values: **079's value**, as before;
   - **with no sound, a product with a pitch in it: notes with their levels.** Its sort is *pitch*: it is what a voice plays.
2. **In a product with a sound, notes with their levels are their own product,** as in parentheses: `[&cycle * &glass]` plays `[(&notes * &level) * &glass]`. Compile writes it so before typing a mix (`inlineNotes`), names inside names in turn.
3. **Named whole:** `&cycle[<<]`, `&cycle^2` or a hit's level on it are errors for now ("named whole in a mix"). Moving notes with their levels is a later question.
4. **Elsewhere it says what it is:**
   - read as a value (a parameter's factor), it is an error naming it;
   - alone, with no voice (a card's channel, `[&cycle * .3]`), its product's own message ("has no voice", with the hint of which cell was perhaps meant as one) or "multiply them by a voice".
5. **Not a voiceless gate.** `&x play=&notes level=&level` with no voice stays an error: gates are the performer (058), and one spelling (L5) is the product.
6. **079 first.** One line of plain numbers (read through no table) times numbers, named, is 079's weighted value, as it was. That is the one shape both could read, and 079 keeps it.

**The law, L17:** naming a sub-product plays as its parentheses do, but for 079's weighted values. `src/engine/naming.test.ts` names every voiceless group (two factors or more, a pitch among them) of every example's one-chord mixes: 104 groups in 56 examples play note for note what they played (11 in 8 when first measured: the test skipped every example with a `from` line until rung 5 wrote them out, #691). 57 groups are 079's, and are left as written.

## Why

- **Grouping by a name is grouping.** The algebra already promised that grouping doesn't matter; a name is only a name (075). Inferring the sort from content makes the two agree, with no new sort the frontends see and no new syntax.
- **It costs one rule, not a type system.** The algebra already had the type, its `Act`: pitches and volumes gathered, not yet applied to a signal. A cell can now be one.
- **It spells what was missing:** a plugin-fragment's head (`&cycle [&notes * &level]`, played on the piece's voice) and a score's part for a performer.

## Rejected

- **A voiceless gate** (`play=` and `level=` with no voice): a second spelling of the same thing, and it would blur the gate as the performer.
- **The voice as a fragment's argument** (`&cycle from fiveto12(voice=&glass) &day`): no language change, but the head couldn't be played on another voice, and naming would still differ from parentheses everywhere else.
- **Context typing** (a cell's sort from where it is read, as a wave's half is): 006's rule that a sort comes from the cell holds; the inference only reads the line more closely.
- **079 yielding** (a weighted line of numbers as notes): it would change what 079's examples mean.

## Consequences

- No example changes how it sounds: the event snapshots don't move.
- A text that was an error compiles: a frontend may see a cell it refused before (`changes/740-named-products.md`).
- The reference's sorts list gains the rule; the tutorial's ladder holds its form pending until a piece shows it (fiveto12's head, rung 5 of #691).
- The graph draws a named product as the cells it names; the cell itself mixes nothing (as a gate's stack).

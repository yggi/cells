# 075 · A name is only a name: rename every name a text defines, and it plays, says and is read as it did

**Date:** 2026-11-07 · **Status:** accepted (the owner, 2026-11-06, on the work for #387: "make cells-language fully immune to alpha substitution, which should be tested and stated as core property of the language"; on #570, 2026-11-08: "75 accepted", the silent line "should not be a heuristic or based on a name", and for the fit "better pick nothing, we should avoid magic names anywhere"; the gaps' rulings are open, #556) · Issues: #560 (the road), #387, #454, #556 · Amends [047](047-fragments-are-files.md) point 2, [063](063-the-score-and-the-band.md) §3 (since #560's rung 3c–e), [060](060-the-key-is-named.md) point 1, [065](065-fragments-take-arguments.md) points 4 and 8, [069](069-compile-writes-the-core.md) (minify)

## Context

A cell is named so that other lines can read it: `&tune over=&key`. Before decision 065, fragments had no other way to meet a piece than by name. A union of lines (047) shared the names everyone agreed on, the interface names (`&bar`, `&tempo`, `&key`, `&tonic`, `&harm`, later `&style`: `INTERFACE_NAMES`), and renamed the rest apart. So `&bar` meant the piece's meter because it was called `&bar`. Decision 065 gave a template a signature and a `from` line its arguments, which made the convention unnecessary for templates, and rung 4 (#454) gave the repository a fit by signature (`useOn`, `fitsAs`).

Renaming was measured on #387, over every example (`src/engine/alpha.test.ts`; S1, the diagnostics renamed back, and the part the default performer reads each event as). Every name a text defines was renamed to a fresh one: `&bar`, `&key` and `&tempo`, the drums, the parts. Once the compiler and the repository read no interface name, 72 of the 83 examples keep all three, written in and as written. The 11 that don't break in three ways, each where a name carries a meaning of its own:

| where | what the name is | examples |
|---|---|---|
| a drum on a MIDI card (054) | its note: `&bd` sends 36 | `midi-out` |
| the default performer (063 §2, `contracts/feel`) | a part (`&bass`, `&pad`, `&stab`, `&lead`), a drum role (`&kick`, `&hat`), a role cell's role (061) | 11, written in |
| the library | a collection's cells by name, a performer's heads by name, a collection's lines reading what they don't define (a groove's drums, the band's parts, the instruments' `&style`) | `electroswing`, `spooky`, `kinderlied`, as written |

## Decision

1. **Alpha substitution is a property of the language.**
   - **The renaming:** rename every name a text defines, consistently, everywhere it is written (labels and comments too), to names it doesn't write.
   - **What stays the same:** the text plays what it played (S1, decision 070), says what it said (its diagnostics, the names renamed back), and the default performer reads each event as the same part.
   - **What a cell means:** its line, never its name. It is invariant **I10** of #26: *a name is only a name*.
2. **Some names are not the text's to rename.**
   - **Free names:** what a text uses and doesn't define, `&bd` in a groove, is a hole. It is filled by whatever the using text binds to it.
   - **Keywords:** a template's keyword is its parameter's name. `swing=` binds `&swing` (065 §2), as an argument's name does in a call. A text that defines the template may rename it. A text that uses the template writes it as the template does.
   - **Ids:** fragment ids are the library's names, not cells.
3. **No name is the piece's by convention.**
   - **The interface names retire:**
     - The compiler, the fit and the learned layer read none of them.
     - The old `use` line keeps the old rule while it is read (`CompileOptions.old`).
     - `INTERFACE_NAMES`, `unionOf` and `fitOf` are kept a minor and then go (#454).
   - **Normalise writes `&bar`, `&tempo`, `&key` and `&tonic` for people** (#196). That is a convention of the tool's, which nothing reads.
   - **Identity numbers every name a text defines** (`canonicalText`). The exception is what a template's signature declares, its interface.
   - **Minify renames every name, `&bar` too** (amends 069).
4. **Two checks, one property.**
   - **Written in** (every `from` line expanded): the language alone.
   - **As written** (every name the text binds itself): the language with its library.
   - `alpha.test.ts` runs both over every example. It lists each example where the property doesn't hold yet, by name and with why, and an example that starts to hold fails until it leaves the list. The list only shrinks.
5. **A text's interface is declared, never inferred.** A text says what it offers its readers by a signature of heads
   alone: `&harm, &key from`, a score offering its band the harmony and the key. Two things read that and nothing else:
   - **The "nothing plays it" info** (decision 063 §4) is said of every line, in a piece with performers, that steps on a
     clock and that nothing plays or reads. That is the reach the core fold deletes by (069, #561), with no exemption
     by kind or by name. The one line it isn't said of is one the text offers.
   - **The fit's main argument found without being named** (`useOn`, `fitsAs`) is the one cell, of what the workbench
     offers or else of all its cells, that the template's copy compiles over with nothing new said. None or several,
     and nothing is picked: the fit is `missing` the parameter, and the host names the argument. A meter, a key and a
     harmony all read as tables, so a workbench with all three offers one, or the host names it.
6. **What breaks it is a bug against this decision**, each fixed by its own ruling (#560's rungs; the options are on #556):
   - a drum's note on a MIDI card;
   - the feel's parts and roles, which are the hub's (`contracts/feel`, a twin issue there);
   - the names the library binds.

   None is ruled here. Each changes what a name means in a written piece, so each is the owner's to rule, with its
   migration. Until each is ruled, it stays a listed exception.

## Consequences

- #454's rung (branch `ccr-926a164a-olcwdz`):
  - `useOn` and `fitsAs`;
  - `INTERFACE_NAMES` read nowhere;
  - the silent line said by reach, a text's offered heads (`ParseResult.offers`) aside;
  - `useOn` picking a main argument only where one cell meets it;
  - `alpha.test.ts` and [language/overview.md](../language/overview.md#a-name-is-only-a-name).

  No event snapshot moves.
- A filed fragment that differs from a held one only by an interface name's spelling is now that fragment renamed (`sameText`).
- Jambot reads `holesOf(text).uses` for `&tonic` and merges by `unionOf`. It moves to `holesOf(text).signature` and `useOn` (yggi/jambot#562) before the old exports go.
- 065 point 8 ("`&key` stays the key's name, by convention now") is now the whole of it: nothing in cells reads `&key` as the key.
- The repository's queries still fit by `fitOf` until #560's rung 4.
- §6's gaps as the owner ruled them on #556 (2026-11-08), each a rung of #560:
  - a drum's note is its `note=` (rung 1, #626);
  - a `from` line renames what it takes, `&new=old` on its left side (rung 3a–b): `&kick=bd from gm_kit`, `&bass2=bass, &bassOut2=bassOut from bass_performer &line2`. The fragment's name is a word of the line, as a keyword is (point 2), so `alpha.test.ts` renames every name a `from` line takes. Nothing migrates: nothing written before changes meaning.
  - every fragment reads only what it defines or declares, and 065 §4's exception for sounds goes (rung 3c–e), built in three rungs. **The instruments** that read the section's style declare it, `&bassV from (&style)`, its default the centre, `&style map=style .5 .5 .5 .5` (the ruling's `&style style=&(map=style .5 .5 .5 .5)` read the same, and this spelling has no inline cell for a fragment's core to name, #590); the performers declare their instrument and the style (`&bass, &bassOut from (&bassLevel, &bassV, &style) &bassline`); the band takes each instrument itself and passes it. This amends 063 §3: the style is still the composer's, which a score writes, and a fragment that reads it declares it, its default the centre. Read the old way, a piece that gave a performer its voice or its style by name still does (`BOUND_BY_NAME`), and Migrate's `arguments` rule writes the argument. **The band** declares the score's five parts, their levels and the style (`* from band(bassline=&bassline, …, style=&style)`), each part a tacet by default, so a part a score doesn't pass rests and nothing is said (063 §4's info goes with the name it was said of). **The grooves** follow.

# 075 · A name is only a name: rename every name a text defines, and it plays, says and is read as it did

**Date:** 2026-11-07 · **Status:** proposed (the owner, 2026-11-06, on the work for #387: "make cells-language fully immune to alpha substitution, which should be tested and stated as core property of the language"; the gaps' rulings are open, #556) · Issues: #560 (the road), #387, #454, #556 · Amends [047](047-fragments-are-files.md) point 2, [060](060-the-key-is-named.md) point 1, [065](065-fragments-take-arguments.md) points 4 and 8, [069](069-compile-writes-the-core.md) (minify)

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
   - **What a cell means:** its line, never its name. This is proposed as invariant **I10** of #26: *a name is only a name*.
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
5. **What breaks it is a bug against this decision**, each fixed by its own ruling (#560's rungs; the options are on #556):
   - a drum's note on a MIDI card;
   - the feel's parts and roles, which are the hub's (`contracts/feel`, a twin issue there);
   - the names the library binds.

   None is ruled here. Each changes what a name means in a written piece, so each is the owner's to rule, with its migration. Until each is ruled, it stays a listed exception.

## Consequences

- #454's rung (branch `ccr-926a164a-olcwdz`):
  - `useOn` and `fitsAs`;
  - `INTERFACE_NAMES` read nowhere;
  - a harmony nothing reads, told by its chords, not by `&harm`;
  - `alpha.test.ts` and [language/overview.md](../language/overview.md#a-name-is-only-a-name).

  No event snapshot moves.
- A filed fragment that differs from a held one only by an interface name's spelling is now that fragment renamed (`sameText`).
- Jambot reads `holesOf(text).uses` for `&tonic` and merges by `unionOf`. It moves to `holesOf(text).signature` and `useOn` (yggi/jambot#562) before the old exports go.
- 065 point 8 ("`&key` stays the key's name, by convention now") is now the whole of it: nothing in cells reads `&key` as the key.
- The repository's queries still fit by `fitOf` until #560's rung 4.

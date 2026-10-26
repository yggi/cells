# 060 · The key is named: `over=&key`, and `over=key` is the old way; a tonic is a cell, stepped or left free

**Date:** 2026-10-26 · **Status:** accepted (owner, 2026-10-26: "yes, retire over=key, and stepped / free tonic. go for the implementation right away") · Amends [047](047-fragments-are-files.md)'s interface names and [059](059-named-use.md)'s closure · Issues: #301, #290, #124, #81

## Context

`over=key` ([#124](https://github.com/yggi/cells/issues/124), the owner's ruling on #117) reads the piece's **main key**: the first cell in the text whose braid is `scale(…)`, whatever its name, as a bare tap reads the main meter. It was made so that a fragment could leave its key to the text that uses it.
[#290](https://github.com/yggi/cells/issues/290) then gave a fragment two more open values, each a hole read by name: the tempo (`step=&tempo`) and the tonic (`scale(dorian, &tonic)`).
Measured on #300's branch (f2c3f32):

- **`over=key` says nothing `over=&<name>` doesn't.** The main key is always a named cell, never `&( … )` or a copy, so every `over=key` has an exact rewrite: `over=&` and the main key's name.
- **The fragments lose nothing.** The five seed modes name their head `&key`. With the five harmonies on `over=&key`, 1,592 tests pass, and the 5 that fail expect the hole's name `key` where it is now `&key`: every fit, every union of a bass line over a vamp over a mode, Normalise and Vary are the same.
- **Jambot** writes `over=key` in 6 places in its source and always names its key `&key` (yggi/jambot @ 24a528b).
- **A tonic was one note**, and a key plan modulates.

## Decision

1. **The key is named.** A line over the key writes `over=&key`. `&key` is an interface name in place of `key` (`INTERFACE_NAMES`: `&bar`, `&tempo`, `&key`, `&tonic`, `&harm`), a hole like any name: `holesOf` lists `&key`, and the fit asks for it.
2. **`over=key` is the old way, for one release.** It reads the main key as it did, and warns at the word, naming it: "over=key is the old way: name the key, over=&key". Normalise writes `over=&<the main key's name>` (`normalise/mainkey.ts`). With no main key it is an error, as before. `CompileResult.mainKey` stays while the old way reads.
3. **A named use leaves an interface name the piece defines to the piece.** Decision 059's closure took nothing a line reads without writing (the main meter, the main key). Named, the key is written, so it would be taken, and where the piece defines it too, the clash would be an error. An interface name the piece defines is the piece's instead: the taken line reads it, as it read the main key, with no error. A helper that is no interface name still clashes.
4. **A stepped tonic.** `&tonic step=1m/8 D F` holds a note a step, held or repeated as any braid. The key's shift is the tonic's note in force (`shiftsAt`), so every line over the key, and over a harmony over it, plays as if the key were written out for each section. Its first note is the key's static shift, so a host that reads static shifts reads the first key. Its notes are pitch classes: the octave is the voice's.
5. **A free tonic.** `&tonic free(D)` is a braid left to the performer (decision 018): D until a take is held in its place, and the take is the tonic. Stepped, `&tonic step=1m free(D F)`. No new form: `free(…)` around a braid already read note names.

## Consequences

- No example's event snapshot moves, and a text with `over=key` plays the same events as before, with a warning a line.
- The seed harmonies read `over=&key`; their hashes move.
- Head-named modes (`use &aeolian`, #296) read by their own name (`over=&aeolian`), or are used as the key (`use &key from aeolian`).
- **Not done:** removing `over=key` (and `MAIN_KEY`, `mainKeyOf`, `CompileResult.mainKey`, the hole `key`) is the release after the next, once the frontends have migrated (Jambot's section text and its `mode-repository.ts`).
- A stepped tonic moves by pitch class, not by the nearest way: B to C goes down eleven semitones, as `scale(…, B)` then `scale(…, C)` written out would. Moving by the nearest way is not a form yet.

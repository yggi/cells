# Migrate's and Normalise's retired forms: an inventory (#643)

> **Status (2026-11-23):** all of it went: the 18 rules in #877, and `arguments`, the one left, in the PR that followed #882 (the seed band passed its style, so the rule had no case). Migrate holds no rule until 1.0.0.


Read on `main` @ a90fb30d, 2026-11-22. The inventory #643 asks for before anything is removed: each rule, the form it serves, when it retired, where the compiler still reads the form, and what still writes it. Counts at the foot.

## What the issue assumed, and what is there

#643 says Normalise "still carries rules, branches and old-way readings for forms that have retired". **Normalise carries none of its own.** Its five rule files write the current language's canonical form, and none serves a retired spelling:

| file | lines | what it writes |
|---|---|---|
| `aliases.ts` | 54 | Strudel's and dough's other names for a parameter as ours (`cutoff=` is `lpf=`, decision 027): live forms |
| `names.ts` | 150 | the interface names `&bar &tempo &key &tonic` (decisions 059, 060) |
| `narrowest.ts` | 61 | `* from gm_kit` as the cells the piece uses |
| `library.ts` | 331 | a piece's line that is a fragment's line as `&name from <id>` |
| `meter.ts` | 299 | a hand-built meter (an even scan, a swing clock, a folded second clock) as the meter it is (#645) |

What Normalise has of the retired is one call: `normalise/index.ts` runs every Migrate rule before its own (decision 049's order, Migrate then Normalise), compiling the text with `old: true`. So the cruft is **Migrate's 19 rules and the compiler's old-way readers that serve them**; removing a rule removes Normalise's pre-pass for that form too.

## Migrate's rules

One rule a file in `src/engine/migrate/`; the rule files hold 1,118 lines of the 1,472 in the folder (`index.ts` 120, three test files 234). `fixtures/migrations/<rule>/` holds each rule's witness pair (2 to 6 files). **Current readers:** I ran every rule over the 90 examples' sources and the seed library's fragments, compiled with `old: true`. **18 of the 19 rules find nothing to rewrite in any of them.** The one that does is `arguments`, on four lines of the seed `band` (below), and it is live.

| rule | form it serves (decision, issue) | retired | the compiler still reads it, with a warning | fixtures | current readers |
|---|---|---|---|---|---|
| `gate` (48 lines) | a gate written `trigger=`, `velocity=`, `gate=`, `gain=` as `play=` and `level=` (023) | v0.6.0 and later | `compiler/declare.ts:526–594`, `attributes.ts:264` | 4 | none |
| `tap` (59) | a line stepped by a meter cell's own steps (`step=&bar*2`) as a tap (`step=8n`, 040) | v0.20.0 | `compiler/clocks.ts:316` (an error unless `old`) | 6 | none |
| `swing` (42) | a bare `swing=.67` on a meter as `swing=8n:.67` (#18) | v0.18.0 | `compiler/clocks.ts:127` (an error unless `old`) | 2 | none |
| `main key` (37) | `over=key` as `over=&key` (060, #124, #301) | v0.16.0 | `parser/cell.ts:139–142` (a live warning, an error with a pick), `compiler/declare.ts:423–436` | 2 | none |
| `moved` (48) | a seed fragment a piece took as its part, `&twinkle from twinkle &key` as `from kinderlied &key` (082) | v0.25.0 | `engine/renamed.ts:109` (the old id read as the part when `old`) | 2 | none |
| `forwarded` (71) | a `from` line of a retired id, `* from "core kit"`, as the line it forwards to (#338) | v0.16.0 | `repository/library.ts:105` (`RETIRED`, 2 ids) | 2 | none |
| `grid` (34) | a grid's size `cycle=19 map=edo` as the map's, `map=edo(19)` (040, #75) | v0.16.0 | `compiler/checks.ts:255–262` | 2 | none |
| `laps` (37) | a turning table's `cycle=` in steps as laps, `cycle=24` on a 12 as `cycle=2` (040, #75) | v0.16.0 | `compiler/checks.ts:211` | 6 | none (Jambot writes `cycle=` on taps, which means bars: the current form) |
| `renamed` (56) | a seed id that became a word, `"harmonic minor"` as `harmonic_minor` (#387, #443) | v0.16.0 | `use.ts:995`, `engine/renamed.ts` (`RENAMED_IDS`, 80 ids, read by `learned.ts`, `library.ts`, `fragments.ts`) | 4 | none: `RENAMED_IDS` is also how a learned layer filed under an old id still finds its fragment |
| `oneshot` (38) | the bare line word `oneshot` as `oneshot=1` (068, #440) | v0.17.0 | `parser/cell.ts:999` | 2 | none |
| `beats` (88) | `beat=n` as the meter that counts those beats (#502) | v0.19.0 | `parser/index.ts:111–120` (an error unless `old`) | 4 | none |
| `pairs` (42) | a swing's `:pairs` dropped, what every swing does now (071, #15) | v0.21.0 | `parser/cell.ts:554–564` | 2 | none |
| `notes` (45) | a drum named as General MIDI's, no `note=`, written `&bd note=36` (075) | v0.22.0 | `compiler/checks.ts:36`, `compiler/resolve.ts:237` (the name gives a note when `old`) | 2 | none |
| `arguments` (69) | a `from` line of a fragment that reads a name it declares, passing the piece's cell: `bass_performer(bassV=&bassV)` (075, #560) | v0.23.0 | `engine/byname.ts` | 6 | the seed `band`: 4 lines (below) |
| `parts` (56) | a role cell or line named as a part, a drum line as a role, written `part=bass`, `role=kick` (075) | v0.24.0 | `compiler/checks.ts:39–49` (when `old`) | 2 | none |
| `axes` (209) | a style on the axes `sync harm artic energy` as on `sync harm bite mood` (076, #572) | v0.23.0 | `parser/index.ts:56–62`, `parser/cell.ts:882`, `compiler/slots.ts:32` | 6 | none |
| `main meter` (42) | a tap naming no meter, in a piece with several meters with tempos, written with the first's name (091, #757) | v0.26.0 | `compiler/clocks.ts:188–195` (when `old`) | 2 | none |
| `one root` (44) | a second meter with a tempo of its own as a tap that says its tempo (095, #778) | v0.26.0 | `compiler/clocks.ts:168` | 2 | none |
| `law` (53) | `law=fiveto12 over=&day` as `&cycle from five_to_twelve &day` (085) | v0.26.0 | `compile.ts:46–98`, `attributes.ts:298` | 2 | none |

"Retired" is the version whose CHANGELOG first names the form's retirement or the rule's addition; the files of the oldest rules date from one move in v0.23.0 (`86c18a26`), so their own history doesn't say.

**Frontends' pins.** I read Jambot's `main` (packages and apps, `.ts`, `.tsx`, `.md`) for 13 of the forms: none writes `trigger=`, `velocity=`, `gate=`, `over=key`, `step=&bar*`, `beat=n`, a bare `oneshot`, `law=`, `swing=.67`, a `use` line or `"core kit"`. `artic=` appears in two files and `:pairs` in one; I did not trace them. Cell studio's repository I could not read; its pin-move issue should be checked for each form at the release that removes one.

## The one rule that fires on current text: `arguments`, on the seed `band`

It finds four lines of `fragments/bands/01-band.md`, each a performer's `from` line (`bass_performer`, `pad_performer`, `stab_performer`, `lead_performer`) that doesn't pass `style=&style`, which the performer declares as an optional parameter. Its rewrite would add `style=&style` to each.

That is **not a retired form the seed writes the old way**. The rule fires because the performer reads a cell the band also declares, and the band leaves it to the performer's default (the centre of style space, decision 065). Whether the band means its performers to read the section's style is the band's decision (063, 096), and passing it would change what the band plays. So it is a question for the owner (is the band's omission intended?), not cruft, and it means `arguments` is a live rule (decision 075, #560): it stays, and what it does for a text that names a cell a fragment now declares is not retired.

## Counts

| | now |
|---|---|
| Migrate rules | 19 |
| lines in the rule files (`migrate/*.ts`, not tests, not the index) | 1,118 |
| lines in `migrate/` with tests and the index | 1,472 |
| witness pairs, `fixtures/migrations/` | 19 folders, 60 files |
| old-way reading sites in the parser and compiler | about 25 (the table's column; some rules have two or three) |
| rules firing on an example or a seed fragment | 1 (`arguments`, 4 lines of `band`: a live rule, not a retired form) |
| `RENAMED_IDS` entries, `RETIRED` ids | 80, 2 |
| Normalise's own rules for retired forms | 0 |

## A proposal, for the owner

Removing a rule means three things: its file, its fixtures and tests, and the compiler's old-way reading, so the form becomes the error `use` became (#588). That is the owner's ruling from 2026-11-09 ("remove all the cruft from normalize at some point"; saved pieces don't bind the language before 1.0, decision 027). It changes what a text means (a form that read with a warning is an error), so by AGENTS.md it needs the owner's word per group, and it is a minor version with the migration named.

Three groups, in the order I would do them, each its own pull request:

1. **The forms nothing writes and a frontend's pin could not**: `gate`, `tap`, `swing`, `beats`, `oneshot`, `forwarded`, `grid`, `laps`, `notes`, `parts`, `moved`: 11 rules, the oldest and the ones the parser already makes an error unless `old`.
2. **The forms still read with a warning** that a frontend might still write: `main key`, `pairs`, `axes`, `law`, `main meter`, `one root`. These need Cell studio's pin checked first. `arguments` is in neither group: it serves a live form (a fragment that declares a name it used to read, 075), and stays.
3. **`renamed` and `RENAMED_IDS`** last: the learned layer reads them as well, so removing them changes how a filed layer finds its fragments, a decision of its own.

Each removal's bound is the issue's: 0 event snapshots move, every example and seed file normalises to what it does today, and a count before and after.

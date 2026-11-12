# 086 · The view lives in Cell studio: cells is text in, events out

**Date:** 2026-11-11 · **Status:** proposed; its table measured by #724's audit (2026-11-12). The direction is ruled: the owner on #691, 2026-11-11, "view moves to studio. it will handle an eventual split into a separate ui lib on its own". Which module goes where is proposed, and rung 2 of #691 confirms it. · Issues: #691, #724 (the API a frontend calls: its Cell studio half is this decision's audit)

*Read with 085 (plugin-fragments, #694), Cell studio's [011](https://github.com/yggi/cell-studio/blob/main/docs/decisions/011-plugins.md) (show plugins) and its [architecture page](https://github.com/yggi/cell-studio/blob/main/docs/architecture.md) (the app imports cells' modules by path).*

## Context

Cells is the language as a package: text in, events out, with no host of its own (AGENTS.md). When the engine left Cell studio, everything under its `src/engine/` came along, including what only a drawing needs.

**The audit** (#724, Cell studio's half, 2026-11-12; Cell studio `64d1317`, pinning v0.24.0):
- **Cell studio imports 76 module paths of cells, none from the root index:** 283 distinct symbols in 146 app files.
- **Jambot imports 27.** It imports none of the view below: a code search of yggi/jambot on 2026-11-11 found no `writtenGraph`, `GraphModel`, `liveAt`, `routing`, `positionHue`, `freqHue`, `splitPlugins`, `BUILTIN_PLUGINS` or `SHOW_MEANING`, while the control, `compileSource`, had five hits.

Sorted by what each module is *for*:

| | modules | Cell studio's app files | users inside cells |
|---|---|---|---|
| **drawing only** | `routing.ts` (node and edge states, 409 lines), `live.ts` ("for drawing", 275), the show plugins (`plugins.ts`' show half, `builtinPlugins.ts`, `parser/showMeaning.ts`, the parser's `SHOWS`) | 13 | `live.ts` reads `routing.ts`; the parser and compile read the plugins' names |
| **drawing inside a language module** | `graph.ts`'s layout (depth rings, petals, turntables: 91 mentions in 877 lines); the hues (`helix.ts`' `positionHue`, `positionOctave`, `freqHue`; `theory/modes`' `pitchHue`) | 55 | none for the layout and the hues |
| **facts about a piece, read today by Studio alone** | the written graph (which cell reads which, the nets); `values.ts`, `stats.ts`, `fm.ts`, `transform.ts`; `time/*` | (in the language's 99) | `outs`, `stats` and `transform` build on the written graph; the snapshot test reads `values`; `time/cycles.ts` is `findMeter`, recognition; `time/span` serves the exporters |
| **shared vocabulary** | `ids.ts` (node and edge ids) | 17 | `realize` and `render` name outputs with it; Studio's audio uses it |

## Decision

### 1. Cells is the language; the view is Cell studio's

- **The line:** geometry, colour and display state move; what a piece *is* stays, however many frontends read it. One frontend reading a module today is not what makes it view.
- **Cell studio takes** what is only drawing:
  - `routing.ts` and `live.ts`;
  - the show plugins (`builtinPlugins.ts`, the show half of `plugins.ts`, `showMeaning.ts`, `SHOWS`);
  - `graph.ts`'s layout (its depth rings, petals and turntables), split from its written graph;
  - the hues (`positionHue`, `positionOctave`, `freqHue`, `pitchHue`).
- **Cells keeps** what any frontend of the language may need:
  - parse, compile, realize, time, what sounds and where it goes (`flows`, `plays`, `outs`);
  - the tools over a text (Migrate, Normalise, Shorten, the folder, edit and patch);
  - MIDI, the repository, the ids;
  - the **written graph** (cells and the links the text writes, its nets), `values`, `stats`, `fm` and `time/*`, as facts about a piece.
- **Studio decides** whether and when its view becomes a UI library between the two. Cells makes no UI library and keeps no view for one.

### 2. `show=` and `label=` stay in the text, as annotations

- **The text is the truth, so a piece's `show=sun` and `label="…"` stay words of its text.** Cells parses them, keeps them through every rewrite (Normalise, Migrate, edit), and gives them no meaning.
- **Which words `show=` takes is the frontend's.** Compile stops saying that a `show=` is none of the shows; Cell studio's editor says it. The reference lists `show=` as a word the frontend draws, and the list of shows and their meanings moves to Cell studio's docs.
- **What a plugin-fragment gives a frontend is data** (its fills, its sections, `lawOf`), which a frontend's wheel may read. Drawing it is the frontend's.

### 3. One move, one minor version

- The modules move in one pull request per side. Cells deletes them and names the migration in `changes/`: the imports Cell studio takes over. Cell studio adds them under its `src/` in the same move as its pin.
- Each moved file says where it came from: `Lifted from yggi/cells <path> @ <commit>`.
- Purity is unaffected. The modules are pure TypeScript and stay pure where they land (Cell studio's `layout/` rule).

## Why

- **One reason to change per package.** A new wheel, a colour or a petal is a release of cells today, and a pin move in Studio for a change that no piece hears. After this, a release of cells is a change to the language.
- **Jambot isn't asked to carry it.** It imports none of these modules, so the view in cells is weight it carries for nothing.
- **The source of truth is untouched.** What a piece says about how it is shown stays in its text; only the meaning of those words moves to the frontend that draws them.

## Rejected

- **A UI library now, between cells and Studio:** a third package, its own releases and pins, with one consumer. Studio can split it out when it has a reason to (the owner, 2026-11-11).
- **Keeping the view in cells for a future frontend:** Jambot, the second frontend, doesn't use it, and a view written for Studio's wheels would bind a third frontend to Studio's drawing anyway.
- **Dropping `show=` from the language:** a piece's wish for how it is shown would leave its text, against the source-of-truth rule.

## Consequences

- **#691 rung 2 is this audit** (#724, 2026-11-12). **Rung 8** is the move: a cells pull request and its twin in yggi/cell-studio, with the pin. `graph.ts` is split in it: its written graph stays, its layout goes.
- **#724's API work** names the entry points the rest is reached through (the types; `edit`; `inspect`; `midi`; `time`; `library`). Nothing moved by this decision is among them.
- **Cell studio's decision 011** and its architecture page are amended by the move: the show plugins are wholly the workbench's.
- **`docs/language/display.md`** keeps `label=`, sentences, the card and scopes (language). Its `show=` section shrinks to "a word the frontend draws", with a link to Studio's list.
- **A frontend notices:** Cell studio's imports of the moved modules (13 app files whole, 55 in part) break at the pin that drops them. That is the migration named in `changes/`; Jambot imports none of them.

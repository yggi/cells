# 086 · The view lives in Cell studio: cells is text in, events out

**Date:** 2026-11-11 · **Status:** proposed. The direction is ruled: the owner on #691, 2026-11-11, "view moves to studio. it will handle an eventual split into a separate ui lib on its own". Which module goes where is proposed, and rung 2 of #691 confirms it. · Issues: #691

*Read with [085](085-plugin-fragments.md) (plugin-fragments: a stream's `view` is data; drawing it is the frontend's), Cell studio's [011](https://github.com/yggi/cell-studio/blob/main/docs/decisions/011-plugins.md) (show plugins) and its [architecture page](https://github.com/yggi/cell-studio/blob/main/docs/architecture.md) (the app imports cells' modules by path).*

## Context

Cells is the language as a package: text in, events out, with no host of its own (AGENTS.md). When the engine left Cell studio, everything under its `src/engine/` came along, including what only a drawing needs:

| module | what it is | importers in Cell studio | users inside cells |
|---|---|---|---|
| `builtinPlugins.ts` | the sun's SVG drawing, as a string, and its sky colours | (through compile) | the parser and compile: reserved names |
| `plugins.ts` | `=== plugin ===` blocks; the show manifest (size, rim, dial, colour tokens) | 5 | the parser, compile, `program.ts` |
| `parser/showMeaning.ts` | what each `show=` value looks like | 0 (the reference, the editor) | the reference |
| `graph.ts` | the graph as nodes and edges, depth rings, petals, turntables, nets | 45 | `outs.ts`, `stats.ts`, `routing.ts` |
| `routing.ts` | the graph's states: which nodes and edges sound | 12 | `live.ts` |
| `live.ts` | "what plays at a moment, for drawing": playheads, glyphs | 21 | none |
| `helix.ts` (`positionHue`, `freqHue`) | positions as colours | via `helix` (14) | none (the rest of `helix.ts`, pitches, is realize's) |

Jambot, the other frontend, imports none of them. A GitHub code search of yggi/jambot on 2026-11-11 found no hits for `writtenGraph`, `GraphModel`, `liveAt`, `routing`, `positionHue`, `freqHue`, `splitPlugins`, `BUILTIN_PLUGINS` or `SHOW_MEANING`, while `compileSource`, the control, had five.

## Decision

### 1. Cells is the language; the view is Cell studio's

- **Cells keeps** what any frontend of the language needs: parse, compile, realize, time, what sounds and where it goes (`flows.ts`, `outs.ts`, `plays.ts`), the tools over a text (Migrate, Normalise, Shorten, the folder), and the repository.
- **Cell studio takes** what is there to be drawn:
  - the show plugins (`builtinPlugins.ts`, the show half of `plugins.ts`);
  - the meanings of `show=` (`showMeaning.ts`);
  - the graph's view model (`graph.ts`'s depth, rings, petals, turntables; `routing.ts`; `live.ts`);
  - the colours of `helix.ts`.
- **What is split:** `graph.ts`'s *written graph* (the cells and the links the text writes) is a fact of the text, and `outs.ts` and `stats.ts` read it. If rung 2 finds they need it, it stays in cells as data; its layout parts move.
- **Studio decides** whether and when its view becomes a UI library between the two. Cells makes no UI library and keeps no view for one.

### 2. `show=` and `label=` stay in the text, as annotations

- **The text is the truth, so a piece's `show=sun` and `label="…"` stay words of its text.** Cells parses them, keeps them through every rewrite (Normalise, Migrate, edit), and gives them no meaning.
- **Which words `show=` takes is the frontend's.** Compile stops saying that a `show=` is none of the shows; Cell studio's editor says it. The reference lists `show=` as a word the frontend draws, and the list of shows and their meanings moves to Cell studio's docs.
- **A plugin-fragment's `view` (085 §3) is data**, which a frontend's wheel may read. Drawing it is the frontend's.

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

- **#691 rung 2** confirms the table, module by module, `graph.ts`'s split included. **Rung 8** is the move: a cells pull request and its twin in yggi/cell-studio, with the pin.
- **Cell studio's decision 011** and its architecture page are amended by the move: the show plugins are wholly the workbench's.
- **`docs/language/display.md`** keeps `label=`, sentences, the card and scopes (language). Its `show=` section shrinks to "a word the frontend draws", with a link to Studio's list.
- **A frontend notices:** Cell studio's imports of the moved modules break at the pin that drops them. That is the migration named in `changes/`.

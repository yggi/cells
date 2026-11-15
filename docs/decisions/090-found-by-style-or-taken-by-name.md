# 090 · A fragment is found by its style or taken by its name: a style is optional, a kind is not; built-in plugins are fragment files

**Date:** 2026-11-14 · **Status:** accepted (the owner on #691, 2026-11-14: "the built-in plugins should be fragments also, just like an external plugin. cleaner architecture. we should revisit the requirement for style-association for fragments (proposal: only fragments to be discovered by the composer need a style. a fragment without one won't be queried by the composer. it is to be manually used in another piece, e.g. in cell-studio (or it could be used in another fragment with a style association …))"; on the order, "(a) as suggested") · Issues: #777, #691, #540

*Amends #765's ranking of a fragment of no style (unreleased), [085](085-plugin-fragments.md) §6 (a built-in plugin-fragment) and, while it is open, 089 §5 (#766). Read with [046](046-facets-and-co-use.md) (facets) and [047](047-fragments-are-files.md) (fragments are files).*

## Context

A fragment's association did two jobs. Its **facet** said what kind of part the fragment fills (a meter, a rhythm, a module), and its **points** placed it in style space for the composer's queries. #765 (2026-11-13) let a fragment name a facet and no point (`association: - facet: module`) and found it at `ANY_DISTANCE`, behind every placed fragment, at every style alike. So the 8 modules and the 2 expressions still came back from queries, last.

Rung 5 of #691 met the question from the other side. `fiveto12`, a day-long law, is no style's and no query's, so it was held in cells' code rather than in a fragment file, where an association was required.

## Decision

1. **A fragment has a kind and may have a style.**
   - **The kind** is its facet: the part it fills. Every fragment has one: its folder under 089, today a facet-only entry (`- facet: module`). Cell studio reads it (`layout/modules.ts` finds its modules by kind).
   - **The style** is its association's points. It is **optional**.
2. **No style, no query.**
   - A fragment with no styled point (one that names an axis) is never returned by a query: `query`, its ranking and its fit, and `npm run coverage` alike (`styledPointsOf`).
   - It is taken by its name: `from id` in a piece (Cell studio's modules, a patch), or in another fragment that has a style. The owner's example is a generic drum-pattern generator with no style, used with parameters by styled grooves.
   - `ANY_DISTANCE` (#765, unreleased) goes.
3. **Built-in plugin-fragments are fragment files,** like external ones (085 §6 amended).
   - A built-in's file says `runtime: builtin` in its frontmatter (an external one says `runtime: wasm`, with its module). It is resolved by the host's library and pinned by the same hash as any fragment.
   - Cells keeps only its code: `fill()` per built-in id.
   - `fiveto12` is `fragments/laws/fiveto12.md`, of the kind `law`, with no style.
   - **Two steps (the owner's "(a)"):** at first its block is its signature and its head's line (`&cycle law=fiveto12 over=&day`). Rung 6 replaces that line with the real fill block, when fills play in a piece's expansion, built-in and external alike.
4. **089 §5** reads: no `style=` means no style, never queried; the kind is the folder's.

## Why

- **The composer's search and a piece's choice are different acts.** A query asks "what fits this style"; a name says "this one". A fragment no style owns (a filter, a vibrato, a day's law, a generator) has no answer to the first. Ranking it last at every style answered with noise.
- **One form for every fragment.** A built-in plugin is a fragment that cells happens to run. Its file, its hash, its resolver and its kind are a fragment's, and only the runtime differs. That's the cleaner architecture the owner asked for, and it removes "`from` resolves a built-in before the host".
- **Style-free building blocks become possible:** a parametrised generator, held once, used by many styled fragments.

## Rejected

- **Found last at `ANY_DISTANCE`** (#765): a fragment that fits no style would still be offered to every query.
- **Built-ins resolved by cells before the host** (rung 5's first draft, #772): a second resolution path, and a built-in that no library, no lockfile entry and no file describes.
- **An association required with an invented point:** a style the fragment doesn't have.

## Consequences

- **What a query returns changes only by the 10 no-style fragments, which leave every result.** `npm run coverage` before and after differs only in the `expression` and `module` columns (`1.000=` to `–`). No event snapshot moves.
- #772 (rung 5) is reshaped: `fiveto12` as `fragments/laws/fiveto12.md`, resolved by the library.
- **Jambot and Cell studio:** neither queries `module` or `expression`. Cell studio's modules are found by kind, which stays.

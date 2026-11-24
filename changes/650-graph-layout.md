### Removed

- **The graph's drawing moves to Cell studio** (decision 086, rung 8 of #691, step 3 of yggi/cell-studio#650):
  - `writtenGraph`'s nodes carry no `depth` (their ring) and no `petalOf` or `reach`;
  - its edges carry no `belt`, `bulb` or `bulbAt`;
  - `GraphModel`, `isTurntable` and `structureKey` are gone.
  - **For a frontend, the migration:** Cell studio works these out in its `layout/graph.ts` (yggi/cell-studio#708). Jambot reads none of them.

### Changed

- **`netsOf` stays the language's, and takes how its caller cuts it** (the owner, 2026-11-24): `netsOf(nodes, edges, { part, apart })`.
  - `part(e)` names the part of its source an edge leaves from (a section drawn on its table: Cell studio's bulb). Its readers make a sub-net, and the net says its `part`, where it said `bulb` and `bulbAt`.
  - `apart(e)` keeps an edge out of every net (a step drawn as a belt).
  - With neither, the nets are as before for a graph with no bulbs and no belts.
  - `GraphNet` and `NetOptions` are on `@yggi/cells/inspect`.
- **`pieceStats(result, graph, text)`** takes any graph with `edges` and `nets`.
- **`outs`** reads a bulb an edge may carry, from a drawn graph.
- **`splitPlugins` and `PLUGIN_SYNTAX`** are on `@yggi/cells/inspect`, for a frontend's own plugin bundle.

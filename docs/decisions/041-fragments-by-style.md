# 041 · A fragment is cells text, an id and an association; a query ranks fragments by a weighted distance over the axes it shares with each

**Date:** 2026-10-17 · **Status:** accepted (the format the owner set in #82: "an id, the text, and an association … a list of weighted style points, where each point maps axis names to numbers"; the distance's details are the implementer's, named here) · Issues: #82, #81 (rung 5), #49 (its first step)

## Context

[#81](https://github.com/yggi/cells/issues/81)'s concept makes the repository the source of every part the composer plays: it asks for a meter, rhythms, progressions, each found by its place in style space.
A fragment's place is not read off its text: a meter has nothing to read on most axes, so its place is an **association**, the style points it is found at, written by hand first and moved by use later.
Jambot owns the axes ([decision 037](037-the-handshake-with-jambot.md)), and they change: swing leaves the style vector for the meter card (yggi/jambot#360).
[#49](https://github.com/yggi/cells/issues/49)'s first step asks for the format, with a test that fails on a malformed entry; its hash and canonical form come later.

## Decision

- **A fragment is cells text and an index entry:** `{ id, text, association }` (`src/repository/fragments.ts`).
  - `id`: a string, unique in its repository, never empty.
  - `text`: cells text, never blank. A meter's is one line, `&bar meter(…)`, open on its tempo: the host sets `step=` (`setTiming` in `engine/edit.ts`), since a fragment's style has no tempo (037's D6).
  - `association`: one or more **weighted style points**, `{ point, weight }`. A **style point** maps axis names to finite numbers, at least one; a weight is a number > 0.
  - Anything else is malformed: `fragmentProblems` names each problem, and `createRepository` throws on any, or on an id given twice.
- **The repository doesn't know the axes.** It compares names: a distance runs over the axes a query and a point share, so an axis no fragment has is ignored, and a frontend can query with every axis it has.
- **The distance:**
  - between two points, the root of the weighted mean of the squared differences over the axes both have, so a point isn't farther for sharing more axes; infinite when they share none;
  - each axis weighs 1 unless the query says (`axisWeights`): the frontend knows its tempo is not on the scale of its other axes;
  - from a fragment to a point, the nearest of its association's points, each distance divided by that point's weight: a stronger association reaches farther.
- **A query** takes a point and k and returns the k nearest fragments with their distances, nearest first, ties by id (by code point, the same on every host).
- **In memory only:** no hash, no canonical form, no persistence, no server; those are #49's later steps.

**Why not** a mean over an association's points: a meter used in eight styles would be found at their middle, where none of them is.
**Why not** a distance summed over the shared axes: a point that names fewer axes would be nearer for naming less.
**Why not** the axes' ranges in the repository: it would have to know Jambot's axes; the query's weights carry them instead.

## Consequences

- The first library is the meters (`src/repository/meters.ts`, `METER_FRAGMENTS`): thirteen. Nine need no swing (4/4, 4/4 alla breve, 2/4, 3/4, 6/8, 12/8, 5/4, 7/8, 10/8); four are 4/4s that swing as Jambot's presets do, each one entry whose association is the presets that play its swing:
  - `4/4 swung on 8n` (`swing=8n:2/3`): Swing jazz; a meter swung on `8n` brings in Jambot's jazz kit (yggi/jambot#360), so its id says so;
  - `4/4 leaning on 16n` (`16n:.65`): Lo-fi hip hop;
  - `4/4 leaning lightly on 16n` (`16n:.6`): Deep house and Funk;
  - `4/4 leaning faintly on 16n` (`16n:31/60`): Ambient;
  - straight `4/4`: Synth-pop, Techno, Bossa nova.
- A swung meter's shares are Jambot's `swingShares` at its presets' swing, written as the shortest decimal that is that number, so it plays every onset where Jambot's `leanMap` does (to 1e-9). Two presets share a swung meter when their shares move no onset by 1e-9 or more, which today means equal.
- With the presets split over five meters, a point halfway between two presets returns the meter of the preset nearest it, which is a third preset's for 11 of the 28 pairs (halfway between Synth-pop and Bossa nova is nearer Lo-fi hip hop); no other meter takes such a point.
- Use moving weights, how often fragments are used together and queries that take the workbench's parts are later rungs of #81, on this format.
- A fragment's id is a name, not its identity: the hash over the canonical form will be ([decision 037](037-the-handshake-with-jambot.md)'s D3).

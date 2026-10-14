# Convert to cells, watched: the story and how calmly the graph follows it (#390)

Date: 2026-10-13 · Status: open (#390) · Issue: #390

The owner's direction: a MIDI file's graph (the MIDI machine), a hero button **Convert to cells**, and a replay of the
conversion that can be followed: cells coming in one at a time, the layout reflowing gently, nothing jumping. It is
done by editing the code a frame at a time, with no animation engine; the engine and the layout do the rest.

## The story, not the search

The folder's own moves (`Watch`) are its search: it folds up to four times (in tracks and in voices, in semitones and in
degrees) and starts over each time, and each pair it makes has a β move that may take it back. On the Minuet in F
(Anh. 113) that is 694 steps (174 pairs, 171 taken back) to reach 19 cells. The replay used to show that search.

The **story** (`engine/fold/story.ts`) is told from the **result**. β's own move (`inline`) undoes the fold one cell
at a time, from the top, and the frames are read backwards. So the cells come lowest first: motifs, then the
phrases made of them, then sections and copies (`base=`). Each frame is printed with the names the finished fold gives
its cells, so a cell keeps its name, and its node, from the frame it comes in to the end. Every frame plays the same
notes (`fold/story.slow.test.ts`, three files, each frame against the first). It runs 12 to 60 frames for the library's
files (Anh. 113: 13, Invention 1: 12, WTC I/1 prelude: 19, WTC I/2 fugue: 17), and 25 to 60 KB of text in all.

## The graph following it (`tools/probe/story-motion.test.ts`)

Each story is replayed through the layout as the app replays it. The MIDI machine is laid out first (500 ticks), then
each frame is set as an edit and run for a frame's time at speed 1 (54 ticks: 0.9 s at 60 fps). Eight files (two of
each collection), 172 frames, three seeds:

| variant | fresh frames | most moved in a frame (px, max) | mean of each frame's most (px) | largest step in a tick (px) | crossings at the end |
|---|---|---|---|---|---|
| flow, today | 0 | 648 | 177 | 12.0 (mean 12.0) | 15.6 |
| tower, today | 0 | 648 | 165 | 19.0 (mean 13.7) | 12.9 |
| **flow, gentle** | 0 | **162** | **92** | **3.0** (mean 3.0) | 16.8 |
| tower, gentle | 0 | 162 | 108 | 7.3 (mean 4.1) | 14.4 |
| tower, gentle, nothing held | 0 | 205 | 110 | 36.4 (mean 8.3) | 12.3 |

Run again on `main` after #393 (its tower changes: a flat selector, tables at their readers, looms): every number
the same. A converted piece has no selector, loom or table read by several, so nothing #393 changed reaches it.

- **No frame lays the graph out afresh**, even today: a story adds one cell to a graph of many.
- **Today, a growing graph never settles.** Each frame reheats it (α 0.7), and the nodes then move at the cap
  (`CALM`, 12 px a tick) for the whole frame, 648 px in a frame on the longer stories.
- **Gentle** (`setGraph(…, { gentle })`, while a story plays): reheated to 0.25 and capped at 3 px a tick
  (`GENTLE_HEAT`, `GENTLE_CALM`). A quarter of the motion at the same crossings (one seed against four heats and caps:
  the cap is what calms it; the heat matters little). `GraphLayout.sync` doesn't settle a gentle version at once
  either (its 220 ticks before paint for a mostly new graph).
- **The tower layout crosses less (14.4 against 16.8) but moves more.** It sets heights, and a socket's x, directly
  rather than through the speed (held heights, `socketsAbove`, strata), so its steps reach 7 px. Drawing every height
  as a spring makes it worse (36 px: what is left is the strata's clamp). In the app the tower also drifts out of view
  between frames, and its end state is denser:
  [flow](conversion-flow.jpg), [tower](conversion-tower.jpg) (Invention 1: the machine, frames 4, 9 and 12). **The flow layout stays the conversion's default**;
  the tower layout works the same, a click away.

## In the app

- `state/convert.svelte.ts`: the replay. It sets the code on a timer (0.9 s a frame at speed 1; ¼× to 4×, kept in
  this browser), and the last frame keeps its time before the end. It stops when the code is edited under it.
- `ConvertStrip.svelte`: the progress bar (to and fro while folding), what the frame did, the speed, Skip to end, Stop.
- A cell or a wire coming into the graph fades and grows in (`app.css`, `--cell-in`). A cell leaving has no fade
  out: a story only adds cells (the test checks it). Only the first frame changes a line (tracks into voices).
- `FitView` with `calm`: the view is framed again only when something is out of view (checked at each frame and once a
  second), over 0.9 s.

## Next

- A cell spliced into one braid only is a bulb on it (decision 014). When it comes into use in a second place it
  becomes a node of its own, and the bulb goes. That is a change of drawing the replay can't smooth from the text alone.
- The tower layout's direct placements (strata, held heights) could go through the speed cap while gentle.

# Plugins

A **plugin** is a `show=` wheel beyond a frontend's own, drawn by code a piece carries. Drawing is the frontend's (decision 086): this page says only what the language reads of a plugin, a block of the piece's text. What a frontend does with it, its manifest's keys, how it draws and when it may run code: Cell studio's [decision 011](https://github.com/yggi/cell-studio/blob/main/docs/decisions/011-plugins.md) and its [`ui/plugin.ts`](https://github.com/yggi/cell-studio/blob/main/src/ui/plugin.ts). A frontend's own plugins (Cell studio's sun, `show=sun`) are its own, as its shows are.

## A block of your own

```
=== plugin ring ===
{ "fits": ["meter"], "size": 160, "tokens": { "ring": "#e3a25a" } }
function draw(view, h) {
  const R = view.size / 2;
  return [
    h('circle', { cx: R, cy: R, r: R - 4, fill: 'none', stroke: view.tokens.ring, 'stroke-width': 3 }),
    h('text', { x: R, y: R, 'text-anchor': 'middle', fill: view.tokens.ring }, Math.floor(view.time.seconds) + ' s'),
  ];
}
=== end ===
```

The name is lower-case letters (not one of the shows or the built-in plugins). The block is blanked before the cells are read, so a cell's line numbers don't move. Then `show=ring` on a cell it fits draws that cell as the plugin does:

```cells
&bar meter("4/4") step=&tempo show=ring
&tempo step=90bpm
&v s=sine loop=C4
&tune step=4n 0 4 7 4
&out postgain=.251 loop=SAMPLE_RATE map=sample [&tune * &v * .3]
=== plugin ring ===
{ "fits": ["meter"], "size": 160, "tokens": { "ring": "#e3a25a" } }
function draw(view, h) {
  const R = view.size / 2;
  return [h('circle', { cx: R, cy: R, r: R - 4, fill: 'none', stroke: view.tokens.ring, 'stroke-width': 3 }), h('text', { x: R, y: R, 'text-anchor': 'middle', fill: view.tokens.ring }, Math.floor(view.time.seconds) + ' s')];
}
=== end ===
```

A plugin's show is a wheel for its own cell: it isn't passed down to the cells below it as `notes` or `do` are, and it applies only to the kinds of cell it says it fits: on another kind it is drawn as that kind, and the editor warns.

## What the language reads

- **The block is text.** The parser cuts each block out of the text before it reads the cells, blanking its lines, so a cell's line numbers stay the piece's. A block not closed, or an `=== end ===` with no block, is an error that names the line.
- **Its manifest** (the first `{ … }`, JSON) is read as data and handed on with the code: a compile's `plugins`, by name (`ShowPlugin`). Cells never runs the code.
- **A block no cell shows** is a warning on its first line: `the piece carries the plugin "…", but no cell says show=…`.


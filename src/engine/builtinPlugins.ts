/**
 * The plugins the app ships: a bundle of `show=` wheels any piece can name without carrying code (decision 011). Each is
 * a block as a piece would carry it (engine/plugins.ts: a JSON manifest, then `draw`), so a bundle from a file of
 * its own will be the same text. They are trusted: they are part of the app, and a piece can't take their names.
 *
 * The code lives here, in the engine, as plain data: compile has to know every plugin's manifest wherever it runs
 * (node, the worker, the build); only the UI runs the drawing (ui/plugin.ts).
 */
import { splitPlugins, type ShowPlugin } from './plugins';

// (String.raw: the drawings are written as they run; no backtick or `${` in them)
const BUNDLE = String.raw`
=== plugin sun ===
{
  "fits": ["meter"],
  "size": 220,
  "rim": false,
  "meaning": "a day meter as the sun: a 24-hour dial, noon at the top",
  "dial": { "label": "The day", "turn": 86400, "key": 3600 },
  "tokens": {
    "sky-day": "#3d6fa8",
    "sky-dusk": "#e3a25a",
    "sky-dusk-night": "#2a1c3a",
    "sky-night": "#070912",
    "ink": "#fff",
    "ink-halo": "rgb(0 0 0 / 0.6)",
    "mark": "rgb(255 255 255 / 0.85)",
    "tick": "rgb(255 255 255 / 0.55)",
    "horizon": "rgb(255 255 255 / 0.35)",
    "sun": "#ffd84a",
    "sun-edge": "#fff3b0",
    "sun-glow": "#ffcf3a",
    "sun-night": "#8a7a40",
    "sun-night-edge": "#b8aa70"
  }
}
// The sun: a day of 24 hours as the sky turns it. Noon (S) at the top, midnight (N) at the bottom, sunrise (E) on the
// left, sunset (W) on the right, the horizon through the middle. Round the rim, the law's twelve blocks, each as
// bright as its mode. The sun stands where the piece is in its day. Stopped, turning it moves where play starts.
const mod = (a, n) => ((a % n) + n) % n;
// anchor=11.55 is 11:55
const clock = (hh) => Math.floor(hh) * 3600 + Math.round((hh % 1) * 100) * 60;
function where(view) {
  const { law } = view;
  const anchor = typeof view.params.anchor === 'number' ? clock(view.params.anchor) : 0;
  const ofDay = mod(anchor + view.time.seconds, 86400);
  const hhmm = Math.floor(ofDay / 3600) + ':' + String(Math.floor((ofDay % 3600) / 60)).padStart(2, '0');
  if (!law) return { ofDay, hhmm, block: null, mode: null, tonic: null };
  const d = mod(anchor - law.start + view.time.seconds, 86400);
  const block = Math.floor(d / law.blockSeconds);
  const key = Math.floor((d % law.blockSeconds) / law.keySeconds);
  return { ofDay, hhmm, block, mode: law.blocks[block].mode, tonic: law.tonics[block][key] };
}
function describe(view) {
  const w = where(view);
  const law = view.law;
  return {
    text: w.hhmm + (law ? ', ' + law.modeNames[w.mode] + ', key of ' + law.noteNames[w.tonic] : ''),
    now: Math.floor(w.ofDay / 60),
    min: 0,
    max: 1439,
  };
}
function draw(view, h, g) {
  const { law, tokens: T, size: S } = view;
  const R = S / 2;
  const w = where(view);
  // a time of day, in turns: noon at the top, turning clockwise (east, south, west)
  const turns = (sec) => (sec / 3600 - 12) / 24;
  const at = (sec, r) => g.polar(R, R, r, turns(sec));
  const ink = 'fill:' + T.ink + ';paint-order:stroke;stroke:' + T['ink-halo'] + ';stroke-width:3px;text-anchor:middle;';
  const sky = view.uid + 'sky';
  const blocks = law
    ? law.blocks.map((b, i) =>
        h('path', {
          d: g.ringSegment(R, R, R * 0.82, R - 3, turns(law.start + i * law.blockSeconds), turns(law.start + (i + 1) * law.blockSeconds)),
          fill: g.blockColour(b.brightness),
          stroke: 'rgba(0,0,0,.45)',
          'stroke-width': 1,
        }, h('title', null, law.modeNames[b.mode] + ' · ' + law.blockNames[i])),
      )
    : [];
  const ticks = Array.from({ length: 24 }, (_, hr) => {
    const [x1, y1] = at(hr * 3600, R * 0.82);
    const [x2, y2] = at(hr * 3600, R * (hr % 6 === 0 ? 0.72 : 0.77));
    return h('line', { x1, y1, x2, y2, stroke: T.tick, 'stroke-width': 1.4 });
  });
  const cardinal = (letter, x, y) => h('text', { x, y, style: 'fill:' + T.mark + ';font:800 13px var(--font-ui);text-anchor:middle' }, letter);
  const [sx, sy] = at(w.ofDay, R * 0.62);
  const up = w.ofDay > 6 * 3600 && w.ofDay < 18 * 3600;
  return [
    h('defs', null,
      h('linearGradient', { id: sky, x1: 0, y1: 0, x2: 0, y2: 1 },
        h('stop', { offset: 0, 'stop-color': T['sky-day'] }),
        h('stop', { offset: 0.48, 'stop-color': T['sky-dusk'] }),
        h('stop', { offset: 0.52, 'stop-color': T['sky-dusk-night'] }),
        h('stop', { offset: 1, 'stop-color': T['sky-night'] }))),
    h('circle', { cx: R, cy: R, r: R - 2, fill: 'url(#' + sky + ')', style: 'filter:drop-shadow(0 8px 11px rgba(0,0,0,.5))' }),
    ...blocks,
    ...ticks,
    h('line', { x1: 10, y1: R, x2: S - 10, y2: R, stroke: T.horizon, 'stroke-dasharray': '3 4' }),
    cardinal('S', R, 40),
    cardinal('N', R, S - 30),
    cardinal('E', 32, R + 4),
    cardinal('W', S - 32, R + 4),
    // the sun (below the horizon: the night's sun, dimmed)
    h('circle', up
      ? { cx: sx, cy: sy, r: 11, fill: T.sun, stroke: T['sun-edge'], 'stroke-width': 2, style: 'filter:drop-shadow(0 0 8px ' + T['sun-glow'] + ')' }
      : { cx: sx, cy: sy, r: 11, fill: T['sun-night'], stroke: T['sun-night-edge'], 'stroke-width': 2, opacity: 0.7 }),
    h('text', { x: R, y: R - 8, style: ink + 'font:800 17px var(--font-code)' }, w.hhmm),
    law && h('text', { x: R, y: R + 10, style: ink + 'font:700 10px var(--font-ui)' }, law.modeNames[w.mode] + ' · ' + law.noteNames[w.tonic]),
    law && h('text', { x: R, y: R + 24, style: ink + 'font:italic 500 10px var(--font-ui)' }, law.blockNames[w.block]),
  ];
}
=== end ===
`;

/** Every built-in plugin (the sun …), in the bundle's order. */
export const BUILTIN_PLUGINS: readonly ShowPlugin[] = Object.freeze(
  splitPlugins(BUNDLE, [], true).plugins.map((p) => Object.freeze({ ...p, tokens: Object.freeze({ ...p.tokens }) })),
);

/**
 * How long a piece is: if it ends (laps=), when; if it loops, its cycle — how long
 * until every layer (melodies, meters, what oscillates, what selects, what turns)
 * is back at its start together: the least common multiple of their periods. With
 * chance, the notes still differ every time round. Estimates, at the tempo as set.
 */
import { BLOCK_NAMES, DAY_MODES, MODE_NAMES } from './fiveto12';
import { codeShifts, type CompileResult } from './program';
import type { FreeSpec } from './ast';
import { clocking, selects } from './clocking';
import { plan } from './realize';

export interface PieceTime {
  /** It ends: after this many seconds (laps=). */
  readonly ends: number | null;
  /** It loops: every layer back together after this many seconds (Infinity: astronomically long). */
  readonly cycle: number | null;
  /** Chance plays a part: no two times round are the same. */
  readonly chance: boolean;
  /** The longest single layer's period, in seconds (null: nothing repeats). */
  readonly longest: number | null;
}

/** The span to move around in: the whole piece if it ends; its cycle, if that's half an hour at most; else its longest layer. */
export function mainLength(t: PieceTime): number | null {
  if (t.ends !== null) return t.ends;
  if (t.cycle !== null && Number.isFinite(t.cycle) && t.cycle <= 1800) return t.cycle;
  return t.longest;
}

/** x as a fraction n/d (continued fractions, d ≤ 10000). */
function fraction(x: number): [bigint, bigint] {
  let [h0, h1, k0, k1] = [0n, 1n, 1n, 0n];
  let v = x;
  for (let i = 0; i < 32; i++) {
    const a = BigInt(Math.floor(v));
    [h0, h1] = [h1, a * h1 + h0];
    [k0, k1] = [k1, a * k1 + k0];
    if (k1 > 10000n) return [h0, k0];
    const r = v - Math.floor(v);
    if (r < 1e-9 || Math.abs(Number(h1) / Number(k1) - x) < 1e-9 * Math.max(1, x)) break;
    v = 1 / r;
  }
  return [h1, k1];
}
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));

export function pieceTime(result: CompileResult, seen?: number[]): PieceTime {
  // a law's piece (law=fiveto12): exactly one day
  if ([...result.cells.values()].some((c) => c.params.law === 'fiveto12')) return { ends: 86400, cycle: 86400, chance: false, longest: 86400 };
  const statics = codeShifts(result);
  const p = plan(result, statics);
  const clk = clocking(result, statics);
  const secondsOf = (clock: string | null, steps: number) => {
    if (!clock) return null;
    const tm = clk.map(clock);
    const s = tm.q(steps) - tm.q(0);
    return Number.isFinite(s) && s > 1e-6 ? s : null;
  };
  const periods: number[] = [];
  let chance = false;
  for (const t of p.tracks) {
    const lap = secondsOf(t.clock, t.period / t.rate);
    if (lap) periods.push(lap);
    if (t.events.some((e) => e.chance !== undefined || e.options)) chance = true;
    for (const m of [...t.mods, ...t.levels, ...t.selects.map((x) => x.series)]) {
      const s = m.clock ? secondsOf(m.clock, m.period / m.rate) : null;
      if (s) periods.push(s);
    }
  }
  for (const params of p.voiceParams.values())
    for (const prm of Object.values(params))
      for (const m of prm.series) {
        const s = m.clock ? secondsOf(m.clock, m.period / m.rate) : null;
        if (s) periods.push(s);
      }
  // tables that turn (stride=, cycle=): back where they began after cycle / gcd(cycle, stride) turns
  // (only what something reads as a table turns: a selector steps, it doesn't)
  const played = new Set(result.outputs.map((o) => o.cell));
  const read = new Set([...result.cells.values()].flatMap((c) => (c.over ? [c.over] : [])));
  for (const c of result.cells.values()) {
    if (!read.has(c.name) || !c.step || !c.clock || played.has(c.name) || c.loops || result.clocks.has(c.name) || !c.cycle) continue;
    const turn = secondsOf(c.clock, 1 / c.rate);
    if (!turn) continue;
    const stride = Math.max(1, Math.abs(Math.round(c.stride || 1)));
    // (where its turns wrap: its cycle=, else its own number of steps — as shiftsAt turns it)
    const wrap = Math.max(1, Math.round(c.wrap ?? (c.units.length || c.cycle)));
    const turns = wrap / Number(gcd(BigInt(wrap), BigInt(stride)));
    periods.push(turn * turns);
  }
  seen?.push(...periods);
  // (the plan's end: laps=, or where a clock that runs down comes to rest)
  const ends = Number.isFinite(p.end) ? p.end : null;
  const longest = periods.length ? Math.max(...periods) : null;
  if (periods.length === 0) return { ends, cycle: null, chance, longest };
  // the least common multiple of the periods, as fractions: lcm(numerators) / gcd(denominators)
  let num = 1n;
  let den = 0n;
  for (const s of periods) {
    const [n, d] = fraction(s);
    if (n === 0n) continue;
    num = (num / gcd(num, n)) * n;
    den = den === 0n ? d : gcd(den, d);
  }
  const cycle = den === 0n ? null : num / den > 10n ** 18n ? Infinity : Number(num) / Number(den);
  return { ends, cycle, chance, longest };
}

/** A duration in words: 0:13, 5:20, 3 h 12 min, 4 days, 2,300 years, 10^14 years. */
export function durationText(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'longer than the universe has been around';
  const s = Math.round(seconds);
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`;
  const days = s / 86400;
  if (days < 365) return `${Math.round(days)} day${Math.round(days) === 1 ? '' : 's'}`;
  const years = days / 365.25;
  if (years < 1e6) return `${Math.round(years).toLocaleString('en')} years`;
  return `10^${Math.floor(Math.log10(years))} years`;
}

/**
 * The piece's sections, if an arrangement plays it (a selector: a cell reading a table of taps, `selects`):
 * where each begins (seconds, within one lap) and what it's called — from the selector's label,
 * split at ·, when the names match the sections; else numbered.
 */
export function sections(result: CompileResult): { at: number; label: string }[] | null {
  // a day's law: its twelve blocks, each a mode and a moment of the day
  if ([...result.cells.values()].some((c) => c.params.law === 'fiveto12')) return DAY_MODES.map((m, b) => ({ at: b * 7200, label: `${MODE_NAMES[m]} · ${BLOCK_NAMES[b]}` }));
  const statics = codeShifts(result);
  const clk = clocking(result, statics);
  for (const c of result.cells.values()) {
    if (!selects(result, c.name) || !c.clock || !c.steps) continue;
    const tm = clk.map(c.clock);
    const t0 = tm.q(0);
    const names = (c.label ?? '')
      .split('·')
      .map((x) => x.trim().replace(/\{[^}]*\}/g, ''))
      .filter(Boolean);
    const out: { at: number; label: string }[] = [];
    for (let i = 0; i < c.steps; i++) out.push({ at: tm.q(i / c.rate) - t0, label: names.length === c.steps ? names[i] : String(i + 1) });
    return out;
  }
  return null;
}

/** The meter that drives the piece, and its free() tempo if it has one (the transport's tempo slider). */
export function mainTempo(result: CompileResult): { cell: string; free: FreeSpec } | null {
  const statics = codeShifts(result);
  const first = plan(result, statics).tracks[0];
  if (!first?.clock) return null;
  // the clock's own root: follow step drivers up to the meter that has a tempo
  for (let name: string | undefined = first.clock, guard = 0; name && guard < 8; guard++) {
    const c = result.cells.get(name);
    if (!c) break;
    const free = c.frees.find((f) => f.key === 'step');
    if (free) return { cell: name, free };
    name = c.step?.driver;
  }
  return null;
}

/** A piece anchored to the clock (anchor=11.55, hours.minutes): where the day stands in it at `now`, in seconds; null without an anchor. */
export function anchoredAt(result: CompileResult, now: Date): number | null {
  // (a clock's anchor: one left on a law is ignored there, with a warning, so it doesn't move the cursor either)
  const anchor = [...result.cells.values()].find((c) => typeof c.params.anchor === 'number' && c.params.law === undefined)?.params.anchor as number | undefined;
  if (anchor === undefined) return null;
  const sec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const at = Math.floor(anchor) * 3600 + Math.round((anchor % 1) * 100) * 60;
  return (((sec - at) % 86400) + 86400) % 86400;
}

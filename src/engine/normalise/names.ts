/**
 * The interface names (#196, the owner's ruling; decisions 059 and 060): a piece's main meter is `&bar`, its rate
 * `&tempo`, its main key `&key` and the key's tonic `&tonic`, the names the seed library's fragments read, so a piece
 * written in them takes a fragment as it is. Each is written only where the piece names it unambiguously:
 *
 *  - `&bar`: the piece's one meter, of its own lines (`CompileResult.mainMeter`, no other meter beside it), if it is a bar:
 *    its beats at 40 to 300 bpm (`BAR_BPM`, the owner's bounds), where a band plays; a clock that laps a day
 *    (fiveto12's `&day`) or a scan of slow durations (studie's `&time`, 24 bpm) is a meter and no bar;
 *  - `&tempo`: a bar's rate written as a value (`step=120bpm`) becomes a cell of its own, `step=&tempo` reading it;
 *  - `&key`: the piece's one key, the one cell of its own lines whose braid is `scale(…)` (`CompileResult.mainKey`);
 *  - `&tonic`: `&key`'s tonic written as a note (`scale(minor, A)`) becomes a cell of its own, `scale(minor, &tonic)`.
 *
 * None is written where the name is taken already, or the line runs on to the next; and a cell that has an interface
 * name of its own keeps it (BWV 847's tempo map is `&tempo`, and a meter: it isn't renamed `&bar`). A rename rewrites every reference,
 * and a hole reads the value it was written with, so each plays the same by construction; `rewriteAll` keeps one only
 * where it sounds identical (S1) all the same.
 */
import { attrsOf, declLine, declWords, renameCell, setAttr, spansLines, splitComment } from '../edit';
import { parse } from '../parser';
import { clocking } from '../clocking';
import { codeShifts, INTERFACE_NAMES, type CompileResult } from '../program';
import { plan } from '../realize';
import type { Rewrite } from '../rewrite';

type Rule = 'bar' | 'tempo' | 'key' | 'tonic';

const rewrite = (rule: Rule, title: string, before: string, after: string, apply: (src: string) => string): Rewrite<Rule> => ({
  id: `${rule}:${before}`,
  tool: 'normalise',
  rule,
  title,
  before,
  after,
  apply,
});

/** A line added right after &name's declaration. */
const after = (source: string, name: string, line: string): string => {
  const lines = source.split('\n');
  const i = declLine(source, name);
  const indent = /^\s*/.exec(lines[i]!)![0];
  lines.splice(i + 1, 0, `${indent}${line}`);
  return lines.join('\n');
};

/** The beats a minute a meter is a bar at (the owner's bounds, #196): where a band plays. */
export const BAR_BPM = { from: 40, to: 300 } as const;

/** Is the meter a bar: its first four beats, through its time map, at a mean tempo within `BAR_BPM`? */
function isBar(result: CompileResult, meter: string): boolean {
  const beat = result.cells.get(meter)?.beat || 1;
  const map = clocking(result, plan(result, codeShifts(result)).statics).map(meter);
  const seconds = (map.q(4 * beat) - map.q(0)) / 4;
  const bpm = 60 / seconds;
  return Number.isFinite(bpm) && bpm >= BAR_BPM.from && bpm <= BAR_BPM.to;
}

/** Does &name have an interface name already? */
const named = (name: string) => INTERFACE_NAMES.includes(`&${name}`);

/** Is &name free in the piece: neither its own line nor a used one defines it? */
const free = (source: string, result: CompileResult, name: string) => declLine(source, name) < 0 && !result.cells.has(name);

/** Each interface name the piece's main meter and main key aren't written in yet, where they are unambiguous. */
export function interfaceNames(source: string, result: CompileResult): Rewrite<Rule>[] {
  const own = new Set(parse(source).cells.map((d) => d.name));
  const out: Rewrite<Rule>[] = [];
  // (a meter, as the compiler reads one: a scan with a clock of its own; a key's scan has none)
  const meters = [...own].filter((n) => result.clocks.has(n) && result.cells.get(n)?.meter);
  const meter = result.mainMeter;
  if (meter && own.has(meter) && meters.length === 1 && !spansLines(source, meter) && isBar(result, meter)) {
    if (!named(meter) && free(source, result, 'bar')) out.push(rewrite('bar', `&${meter} is the piece's meter: &bar`, `&${meter}`, '&bar', (src) => renameCell(src, meter, 'bar')));
    const rate = attrsOf(source, meter).get('step');
    if (meter === 'bar' && rate && !rate.startsWith('&') && free(source, result, 'tempo'))
      out.push(
        rewrite('tempo', `&bar's rate is its tempo: step=&tempo, &tempo step=${rate}`, `step=${rate}`, 'step=&tempo', (src) =>
          after(setAttr(src, 'bar', 'step', '&tempo'), 'bar', `&tempo step=${rate}`),
        ),
      );
  }
  const keys = [...own].filter((n) => declWords(source, n)?.braid[0]?.startsWith('scale('));
  const key = result.mainKey;
  if (key && own.has(key) && keys.length === 1 && !spansLines(source, key)) {
    if (!named(key) && free(source, result, 'key')) out.push(rewrite('key', `&${key} is the piece's key: &key`, `&${key}`, '&key', (src) => renameCell(src, key, 'key')));
    const braid = declWords(source, key)!.braid;
    const tonic = braid.length === 1 ? /^scale\(\s*([^,()\s]+)\s*,\s*([A-Ga-g][#b♯♭]*-?\d*)\s*\)$/.exec(braid[0]!) : null;
    if (key === 'key' && tonic && free(source, result, 'tonic'))
      out.push(
        rewrite('tonic', `&key's tonic is a cell: scale(${tonic[1]}, &tonic), &tonic ${tonic[2]}`, braid[0]!, `scale(${tonic[1]}, &tonic)`, (src) =>
          after(replaceInDecl(src, 'key', braid[0]!, `scale(${tonic[1]}, &tonic)`), 'key', `&tonic ${tonic[2]}`),
        ),
      );
  }
  return out;
}

/** The meter of four beats a scan writes, `scan(1 1 1 1)`, as the meter it is: `meter("4/4")` (#196, the owner's row). */
export function fourFour(source: string, result: CompileResult): Rewrite<'meter'>[] {
  const meter = result.mainMeter;
  if (!meter || spansLines(source, meter)) return [];
  const braid = declWords(source, meter)?.braid ?? [];
  if (braid.length !== 1 || !/^scan\(\s*1\s+1\s+1\s+1\s*\)$/.test(braid[0]!)) return [];
  return [
    {
      id: `meter:${meter}`,
      tool: 'normalise',
      rule: 'meter',
      title: `&${meter}: ${braid[0]} is meter("4/4")`,
      before: braid[0]!,
      after: 'meter("4/4")',
      apply: (src) => replaceInDecl(src, meter, braid[0]!, 'meter("4/4")'),
    },
  ];
}

/** One word of &name's declaration replaced, its attributes, spacing and comment kept. */
function replaceInDecl(source: string, name: string, from: string, to: string): string {
  const lines = source.split('\n');
  const i = declLine(source, name);
  if (i < 0) return source;
  const [code, comment] = splitComment(lines[i]!);
  const at = code.indexOf(from);
  if (at < 0) return source;
  lines[i] = code.slice(0, at) + to + code.slice(at + from.length) + comment;
  return lines.join('\n');
}

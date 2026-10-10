/**
 * Arrange at the input (decision 016): a selector of mixes (`&parts &keysPart &drumPart`, `&song over=&parts …`,
 * `&out … &song`) rewritten as a selector of taps of its meter's bus (`&parts step=&bar &keysBar &drumBar`), each part's
 * cells stepped by its tap instead of the bus, the parts' sound straight into the sound card. The rewrite is offered only
 * when it plays the same notes (checked here); otherwise it says why not, each reason a case the input side can't say
 * yet (a part's sound not stepped from the bus is the gate node's: docs/notes/gate-node.md).
 */
import { compileSource } from '../compile';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';
import { SELECTOR_OF_MIXES } from '../compiler/checks';

export interface Arranged {
  /** The rewritten piece, or null when it can't be rewritten (see `why`). */
  readonly source: string | null;
  /** Why not, a reason per selector it couldn't rewrite (empty when it could). */
  readonly why: readonly string[];
}

/** A cell stepped from the bus in more than one part. */
const SHARED = -1;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The line that declares `&name` (its first line), by index. */
const lineOf = (lines: string[], name: string) => lines.findIndex((l) => new RegExp(`^&${esc(name)}(\\s|$)`).test(l));

/** Every selector of mixes in a piece rewritten at the input, checked note for note; or why it can't be. */
export function arrangeAtInput(source: string): Arranged {
  const r = compileSource(source);
  // (the old arrangement is an error of its own: the only one the rewrite takes)
  if (r.diagnostics.some((d) => d.severity === 'error' && !d.message.startsWith(SELECTOR_OF_MIXES))) return { source: null, why: ['the piece has errors'] };
  const cells = r.cells;
  const isMix = (n: string) => !!cells.get(n)?.mix && !cells.get(n)?.sink;
  const selectors = [...cells.values()].filter((c) => {
    const t = c.over ? cells.get(c.over) : undefined;
    return !!t && t.units.length > 0 && t.units.every((u) => u.atom.kind === 'ref' && isMix(u.atom.name));
  });
  if (!selectors.length) return { source: null, why: ['no selector of mixes'] };
  const why: string[] = [];
  const lines = source.split('\n');
  const taken = new Set(cells.keys());
  for (const s of selectors) {
    const bus = s.step?.driver;
    const table = s.over!;
    const parts = cells.get(table)!.units.map((u) => (u.atom.kind === 'ref' ? u.atom.name : ''));
    if (!bus) {
      why.push(`&${s.name} has a clock of its own, not a meter's bus to tap`);
      continue;
    }
    // each part's cells: up their step chains to the one the bus steps (that link becomes the part's tap)
    const link = new Map<string, number>();
    const users = new Map<string, { entry: number; direct: boolean }[]>();
    const problems: string[] = [];
    for (const o of r.outputs) {
      const sel = o.select.find((x) => x.cell === s.name);
      let c = cells.get(o.cell);
      for (let guard = 0; c?.step && c.step.driver !== bus && guard < 32; guard++) c = cells.get(c.step.driver);
      if (!sel) {
        if (c?.step?.driver === bus && link.has(c.name)) problems.push(`&${c.name} plays inside a part and outside the arrangement`);
        continue;
      }
      if (c?.step?.driver !== bus) problems.push(`&${o.cell} (in &${parts[sel.entry]}) isn't stepped from &${bus}: its sound would need a gate`);
      else {
        link.set(c.name, link.has(c.name) && link.get(c.name) !== sel.entry ? SHARED : sel.entry);
        users.set(c.name, [...(users.get(c.name) ?? []), { entry: sel.entry, direct: c.name === o.cell }]);
      }
    }
    // a melody played in two parts (Korobeiniki's bass in A and B, over different changes): one clock can't be two
    // taps, so it becomes a motif, played in each part by a cell of its own stepped by that part's tap (a splice plays
    // at its splicer's clock). Only when it is the term in its parts' products (else what it steps would need splitting).
    for (const [name, entry] of link) if (entry === SHARED && users.get(name)!.some((u) => !u.direct)) problems.push(`&${name} steps cells in two parts`);
    // (a cell stepped from the bus that plays outside the arrangement too, found after the parts are known)
    for (const o of r.outputs) {
      if (o.select.some((x) => x.cell === s.name)) continue;
      let c = cells.get(o.cell);
      for (let guard = 0; c?.step && c.step.driver !== bus && guard < 32; guard++) c = cells.get(c.step.driver);
      if (c && link.has(c.name)) problems.push(`&${c.name} plays inside a part and outside the arrangement`);
    }
    // where the selector's sound goes: a sound card, by its name alone
    const outs = [...cells.values()].filter((c) => c.units.some((u) => u.atom.kind === 'ref' && u.atom.name === s.name) && c.name !== table);
    if (!outs.length || outs.some((c) => !c.sink)) problems.push(`&${s.name}'s sound goes somewhere other than a sound card`);
    if (problems.length) {
      why.push(...[...new Set(problems)]);
      continue;
    }
    // the taps: a name per part (keysPart, bar → keysBar), not one already taken
    const cap = bus[0].toUpperCase() + bus.slice(1);
    const taps = parts.map((p) => {
      let n = `${p.replace(/Part$/, '')}${cap}`;
      while (taken.has(n)) n += '_';
      taken.add(n);
      return n;
    });
    // each linked cell stepped by its part's tap; a shared one a motif, played in each part by a cell of its own
    for (const [name, entry] of link) {
      const i = lineOf(lines, name);
      if (entry !== SHARED) {
        lines[i] = lines[i].replace(new RegExp(`step=&${esc(bus)}(?![\\w])`), `step=&${taps[entry]}`);
        continue;
      }
      const step = new RegExp(` step=&${esc(bus)}((?:[*/][\\d.]+)*)(?![\\w])`).exec(lines[i]);
      if (!step) continue;
      lines[i] = lines[i].replace(step[0], '');
      const players: string[] = [];
      for (const k of [...new Set(users.get(name)!.map((u) => u.entry))]) {
        let player = `${parts[k].replace(/Part$/, '')}${name[0].toUpperCase()}${name.slice(1)}`;
        while (taken.has(player)) player += '_';
        taken.add(player);
        // (in its motif's cluster: its tags=)
        const tags = / tags="[^"]*"/.exec(lines[i])?.[0] ?? '';
        players.push(`&${player}${tags} step=&${taps[k]}${step[1]} &${name}`);
        const pi = lineOf(lines, parts[k]);
        lines[pi] = lines[pi].replace(new RegExp(`&${esc(name)}(?![\\w])`, 'g'), `&${player}`);
      }
      lines.splice(i + 1, 0, ...players);
    }
    // the table: taps of the bus
    const ti = lineOf(lines, table);
    let line = lines[ti].replace(new RegExp(`^&${esc(table)}`), `&${table} step=&${bus}`);
    parts.forEach((p, k) => (line = line.replace(new RegExp(`&${esc(p)}(?![\\w])`), `&${taps[k]}`)));
    lines[ti] = line;
    // the sound card: the parts' sound, straight
    for (const o of outs) {
      const oi = lineOf(lines, o.name);
      lines[oi] = lines[oi].replace(new RegExp(`&${esc(s.name)}(?![\\w])`), `[${parts.map((p) => '&' + p).join(', ')}]`);
    }
  }
  if (why.length) return { source: null, why };
  const next = lines.join('\n');
  const same = sameNotes(source, next);
  return same === true ? { source: next, why: [] } : { source: null, why: [same] };
}

/** True when two pieces play the same notes (start, length, voice, pitch, level) to their ends; else what differs. */
function sameNotes(a: string, b: string): true | string {
  const notes = (src: string) => {
    const r = compileSource(src);
    // (the old arrangement, as it played before it was an error: what the rewrite must sound like)
    const old = !r.ok && r.diagnostics.every((d) => d.severity !== 'error' || d.message.startsWith(SELECTOR_OF_MIXES));
    if (!r.ok && !old) return null;
    const p = plan(old ? { ...r, ok: true } : r, codeShifts(r));
    const end = Number.isFinite(p.end) ? p.end : 120;
    return eventsBetween(p, 0, end + 1).map((e) => `${e.at.toFixed(4)} ${e.dur.toFixed(4)} ${e.voice} ${e.freq.toFixed(3)} ${e.gains.map((g) => g.toFixed(4))}`);
  };
  const x = notes(a);
  const y = notes(b);
  if (!y) return `the rewrite doesn't compile: ${compileSource(b).diagnostics.find((d) => d.severity === 'error')?.message ?? ''}`;
  if (!x || x.length !== y.length) return `the rewrite plays ${y.length} notes, the piece ${x?.length ?? 0}`;
  const i = x.findIndex((n, k) => n !== y[k]);
  return i < 0 ? true : `the rewrite differs from note ${i + 1}: ${x[i]} → ${y[i]}`;
}

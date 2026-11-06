/**
 * Migrate (#502): `beat=n`, retired, as the meter that counts those beats. A meter written as a signature or sizes is
 * written as the signature of its n beats where one names them (`meter("4/4") beat=2` → `meter("2/2", 2)`), else as
 * levels written out, a mark at each beat, with its step's note value (`meter("3/4") beat=1` → `meter("*..", 4n)`); a
 * scan, as the note value of its entries that counts n beats (`scan(1!64) beat=4` → `scan(1!64) pulse=64n`). Each is
 * offered where it plays the same (S1, checked here): a line on `step=pulse` under it may step otherwise, and then the
 * author decides.
 */
import { declLine, declWords, splitComment } from '../edit';
import { groupingOf, meterLevels } from '../parser/generators';
import { soundsIdentical } from '../sameness';
import type { CompileOptions, CompileResult as Result } from '../program';
import type { Rewrite } from '../rewrite';

const powerOfTwo = (x: number) => Number.isInteger(x) && x >= 1 && Number.isInteger(Math.log2(x));

/** The braids and attributes that count n beats as `braid` with beat=n did, in the order they are tried. */
function candidates(braid: string, n: number): { braid?: string; pulse?: string }[] {
  const meter = /^meter\("([^"]+)"(?:,\s*([1-8]))?\)$/.exec(braid);
  if (meter) {
    const [, sig, written] = meter;
    const sub = Number(written ?? 1);
    const g = groupingOf(sig!);
    const out: { braid: string }[] = [];
    if (g && g.pulses % n === 0) {
      const per = g.pulses / n;
      // (n beats of `per` pulses: the signature n/d where a beat is a 1/d note, its steps as many as before)
      const d = g.unit / per;
      if (powerOfTwo(d)) out.push({ braid: `meter("${n}/${d}"${sub * per > 1 ? `, ${sub * per}` : ''})` });
    }
    const levels = meterLevels(sig!, sub);
    if (levels && levels.length % n === 0 && g && powerOfTwo(g.unit * sub)) {
      const step = levels.length / n;
      const marked = [...levels].map((ch, i) => (i === 0 ? '*' : i % step === 0 ? '+' : ch === ',' ? ',' : '.')).join('');
      out.push({ braid: `meter("${marked}", ${g.unit * sub}n)` });
    }
    return out;
  }
  const scan = /^scan\((.*)\)$/.exec(braid);
  if (scan) {
    // (its entries' count, a run x!k as k)
    const entries = scan[1]!
      .trim()
      .split(/\s+/)
      .reduce((a, w) => a + (/!(\d+)$/.exec(w) ? Number(/!(\d+)$/.exec(w)![1]) : 1), 0);
    const per = (4 * entries) / n;
    return powerOfTwo(per) ? [{ pulse: `${per}n` }] : [];
  }
  return [];
}

/** Each meter with a beat=: the meter that counts its beats, where it plays the same. */
export function beats(source: string, result: Result, options: CompileOptions = {}): Rewrite<'beats'>[] {
  const out: Rewrite<'beats'>[] = [];
  for (const c of result.cells.values()) {
    const n = c.params.beat;
    const words = typeof n === 'number' && declLine(source, c.name) >= 0 ? declWords(source, c.name) : null;
    if (!words || typeof n !== 'number' || !(n >= 1) || !c.meter) continue;
    for (const k of candidates(words.braid.join(' '), Math.round(n))) {
      // (in place, the line laid out as written: the braid where it was, pulse= where beat= was)
      const braid = words.braid.join(' ');
      const apply = (s: string) => {
        const i = declLine(s, c.name);
        if (i < 0) return s;
        const lines = s.split('\n');
        const [code, comment] = splitComment(lines[i]!);
        let next = k.braid ? code.replace(braid, k.braid) : code;
        next = next.replace(/(\s)beat=\S+/, k.pulse ? `$1pulse=${k.pulse}` : '');
        lines[i] = next + comment;
        return lines.join('\n');
      };
      const next = apply(source);
      if (next === source || !soundsIdentical(source, next, undefined, options)) continue;
      const at = declLine(source, c.name);
      out.push({
        id: `beats:${c.name}`,
        tool: 'migrate',
        rule: 'beats',
        title: `beat= is retired: &${c.name} counts its beats as ${k.braid ?? `pulse=${k.pulse}`} does (#502)`,
        before: source.split('\n')[at]!.trim(),
        after: next.split('\n')[at]!.trim(),
        apply,
      });
      break;
    }
  }
  return out;
}

// Moved from yggi/cell-studio tools/probe/canonical.test.ts @ 4036a0b.
// A probe of #151's families of equal spellings, measured over the library
// (docs/notes/151-canonical-table.md). Each family is a list of spellings of one meaning; for each spelling, how often
// it is written and in how many pieces. Spelling comes from the text (the parser forgets it: `_`, `!n`, units), meaning
// from the parser's cells (which cells are voices, what a braid holds).
// It runs in `npm test`, which checks that it still reads the library; PROBE=out.txt writes its tally:
// PROBE=out.txt npx vitest run tools/canonical.test.ts
import { describe, expect, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { PRESETS } from '../src/engine/presets';
import { parse } from '../src/engine/parser/index';
import { stripComment } from '../src/engine/parser/scanner';
import { VOICE_PARAMS } from '../src/engine/attributes';
import { SCALES } from '../src/theory/modes';
import type { CellDecl, Expr, Token } from '../src/engine/ast';

const log = (t: string) => process.env.PROBE && appendFileSync(process.env.PROBE, t + '\n');

type Tally = Map<string, Map<string, { n: number; pieces: Set<string> }>>;
const tally: Tally = new Map();
const add = (family: string, spelling: string, piece: string, n = 1) => {
  if (n <= 0) return;
  const f = tally.get(family) ?? new Map();
  const s = f.get(spelling) ?? { n: 0, pieces: new Set<string>() };
  s.n += n;
  s.pieces.add(piece);
  f.set(spelling, s);
  tally.set(family, f);
};
const examples = new Map<string, string[]>();
const example = (key: string, text: string) => {
  const xs = examples.get(key) ?? [];
  if (xs.length < 4) xs.push(text);
  examples.set(key, xs);
};

/** Logical lines as the parser joins them: comments stripped, continuation lines joined, labels blanked. */
const logical = (source: string): string[] => {
  const out: string[] = [];
  let carry: string | null = null;
  for (const raw of source.split('\n')) {
    const text = stripComment(raw);
    carry = carry === null ? text : carry + ' ' + text;
    if (!/[+*,[]\s*$/.test(carry)) {
      out.push(carry.replace(/"[^"]*"/g, '""'));
      carry = null;
    }
  }
  if (carry !== null) out.push(carry);
  return out.filter((l) => l.trim());
};

const isVoice = (d: CellDecl | undefined) => !!d && (Object.keys(d.params).some((k) => VOICE_PARAMS.has(k)) || 'body' in d.params);
const same = (a: Token, b: Token) => JSON.stringify({ ...a, span: 0 }) === JSON.stringify({ ...b, span: 0 });
const plain = (t: Token) => t.repeat === 1 && t.subdivide === 1 && t.elongate === 1 && t.chance == null && t.level == null;
const rotations = (xs: readonly number[]) => xs.map((_, i) => [...xs.slice(i), ...xs.slice(0, i)].join(' '));
const modeOf = new Map<string, string>();
for (const [name, { steps }] of Object.entries(SCALES)) modeOf.has(steps.join(' ')) || modeOf.set(steps.join(' '), name);
for (const [name, { steps }] of Object.entries(SCALES)) rotations(steps).forEach((r, i) => modeOf.has(r) || modeOf.set(r, `${name}+${i}`));
const euclids = new Map<string, string>();
for (let n = 3; n <= 32; n++)
  for (let k = 2; k < n; k++)
    for (let r = 0; r < n; r++) {
      const d = parse(`&e euclid(${k}, ${n}, ${r})`).cells[0];
      if (d.braid.kind !== 'list') continue;
      const key = d.braid.tokens.map((t) => (t.atom.kind === 'rest' ? '.' : 'x')).join('');
      if (!euclids.has(key)) euclids.set(key, `euclid(${k}, ${n}${r ? `, ${r}` : ''})`);
    }
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const exprRefs = (e: Expr): string[] => (e.k === 'ref' ? [e.ref.name] : e.k === 'num' ? [] : e.k === 'sum' ? e.items.flatMap((i) => exprRefs(i.e)) : e.factors.flatMap(exprRefs));
const walk = (tokens: readonly Token[], f: (t: Token) => void) =>
  tokens.forEach((t) => {
    f(t);
    if (t.atom.kind === 'seq') t.atom.layers.forEach((l) => walk(l, f));
  });

describe('#151: families of equal spellings', () => {
  it('counts each spelling over the library', () => {
    const pieces = Object.entries(PRESETS);
    for (const [key, { source }] of pieces) {
      const { cells } = parse(source);
      const decls = new Map(cells.map((d) => [d.name, d]));
      const lines = logical(source);
      const lineOf = new Map<string, string>();
      for (const l of lines) {
        const m = /^\s*&(\w+)/.exec(l);
        if (m) lineOf.set(m[1], l);
      }
      // (a cell read in a product with a voice: its name beside a `*` on a mix line, or play= on a gate)
      const products = new Set<string>();
      const spliced = new Map<string, number>();
      const read = new Set(cells.flatMap((d) => (d.over ? [d.over.name] : [])));
      for (const d of cells) {
        if (d.braid.kind !== 'list') continue;
        const taps = read.has(d.name) && d.braid.tokens.every((t) => t.atom.kind === 'ref');
        walk(d.braid.tokens, (t) => {
          if (t.atom.kind === 'mix')
            for (const e of t.atom.exprs) {
              const names = exprRefs(e);
              if (names.some((n) => isVoice(decls.get(n)))) names.forEach((n) => products.add(n));
              if (e.k === 'prod' && names.some((n) => isVoice(decls.get(n)))) add('gate vs product', 'a product with a voice in a mix ([&x * &v])', key);
              if (e.k === 'prod' && names.some((n) => isVoice(decls.get(n)))) {
                if (e.factors.some((f) => f.k === 'ref' && decls.get(f.ref.name)?.map?.kind === 'adsr'))
                  add("a voice's own volume and pitch", 'an envelope as a factor (* &env)', key);
                const vib = (f: Expr): boolean => f.k === 'sum' && f.items.some((i) => i.e.k === 'ref' && !!decls.get(i.e.ref.name)?.step?.whole);
                if (e.factors.some(vib)) add("a voice's own volume and pitch", 'a moving pitch in the sum ((&x + &vib) * &v)', key);
              }
            }
          if (!taps && t.atom.kind === 'ref' && !isVoice(decls.get(t.atom.name))) spliced.set(t.atom.name, (spliced.get(t.atom.name) ?? 0) + 1);
        });
      }

      for (const line of lines) {
        const name = /^\s*&(\w+)/.exec(line)?.[1] ?? '';
        const d = decls.get(name);
        const voice = isVoice(d);
        // ---- dilate: rates and their units
        for (const m of line.matchAll(/\b(step|loop)=(free\()?(-?[\d.]+)(bpm|hz|k|min|h|d|wk)?\b/g)) {
          const v = Number(m[3]);
          const unit = m[4] ?? '';
          if (unit === 'bpm') add('tempo', `${m[1]}=Nbpm`, key);
          else if (unit === 'hz') add(voice || v >= 20 ? 'pitch as a rate' : 'tempo', `${m[1]}=Nhz`, key);
          else if (unit === '') add(voice || v >= 20 ? 'pitch as a rate' : 'tempo', `${m[1]}=N (plain)`, key);
          else add('rate units (wall clock, k)', `${m[1]}=N${unit}`, key);
          if (unit === '' && !voice && v < 20) example(`tempo plain ${m[1]}`, `${key}: ${m[0]}`);
        }
        for (const m of line.matchAll(/\b(step|loop)=free\((largo|larghetto|adagio|andante|moderato|allegro|vivace|presto)\)/g)) add('tempo', `${m[1]}=free(marking)`, key);
        for (const m of line.matchAll(/\bloop=([A-G](?:#|b)?-?\d)\b/g)) add('pitch as a rate', 'loop=NOTE (A4, C2)', key, m ? 1 : 0);
        if (/\bloop=SAMPLE_RATE\b/.test(line)) add('rate units (wall clock, k)', 'loop=SAMPLE_RATE', key);
        // ---- dilate: a chain on a clock
        for (const m of line.matchAll(/\b(step|loop|delaytime|length|at)=(cycle\()?&\w+\)?((?:[*/][\d.]+)*)/g)) {
          const ops = [...m[3].matchAll(/([*/])([\d.]+)/g)].map((o) => o[1] + o[2]);
          const shape = ops.map((o) => o[0] + 'n').join('') || '(none)';
          add('a rate on a clock', `${m[1] === 'step' || m[1] === 'loop' ? m[1] : 'param'}=&x${shape === '(none)' ? '' : shape}${m[2] ? ' (cycle)' : ''}`, key);
          if (ops.length >= 2) {
            example(`chain ${shape}`, `${key}: ${m[0]}`);
            const mul = ops.filter((o) => o[0] === '*').reduce((a, o) => a * Number(o.slice(1)), 1);
            const div = ops.filter((o) => o[0] === '/').reduce((a, o) => a * Number(o.slice(1)), 1);
            if (Number.isInteger(mul) && Number.isInteger(div) && gcd(mul, div) > 1) add('a rate on a clock', 'a chain that reduces (*4/2)', key);
          }
        }
        // ---- dilate: step= against loop= on a cell below hearing (not a voice)
        if (d && !voice && d.step && d.braid.kind !== 'blank' && d.map?.kind !== 'sample' && d.map?.kind !== 'midi') {
          const slow = d.step.kind === 'driven' || (d.step.kind === 'rate' && d.step.perSecond < 20);
          if (slow) {
            add(
              'step= vs loop= (below hearing)',
              d.step.whole ? `loop= (${d.step.kind === 'driven' ? 'a clock' : 'a rate'})` : `step= (${d.step.kind === 'driven' ? 'a clock' : 'a rate'})`,
              key,
            );
            if (d.step.whole) example('loop below hearing', `${key}: ${line.trim().slice(0, 90)}`);
          }
        }
        // ---- the bar and the mode: scans by what they are
        for (const m of line.matchAll(/\bscan\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)) {
          const raw = m[1].trim();
          const nums = raw.split(/\s+/).flatMap((t) => {
            const r = /^([\d.]+)!(\d+)$/.exec(t);
            return r ? Array(Number(r[2])).fill(Number(r[1])) : [Number(t)];
          });
          const mode = nums.every(Number.isFinite) ? modeOf.get(nums.join(' ')) : undefined;
          if (mode) {
            add('a mode', mode.includes('+') ? 'scan(…) a rotation of a named scale' : 'scan(…) a named scale', key);
            example('mode scan', `${key}: scan(${raw}) = ${mode}${d?.shift ? ` shift=${d.shift}` : ''}`);
            add('a mode: scans by name', `${mode}${/\bshift=/.test(line) ? ' with shift=' : ''}`, key);
          } else if (nums.every(Number.isFinite) && nums.length > 1 && nums.every((x) => x === nums[0])) {
            add('the bar', /!/.test(raw) ? `scan(a!n) (even, as a repeat)` : `scan(a a a …) (even, written out)`, key);
            add('the bar: even scans by content', `scan(${raw})`, key);
            example(`bar even ${raw}`, key);
          } else if (nums.length === 2 && nums.every(Number.isFinite)) {
            add('swing', 'a swing clock scan(a b)', key);
            example('swing clock', `${key}: scan(${raw})`);
          } else {
            add('the bar', 'scan(…) uneven (a bent bar, a tempo map, a rhythm)', key);
            add('the bar: uneven scans by content', `scan(${raw})${d?.step?.kind === 'rate' ? ' (a meter)' : ''}`, key);
            example('bar uneven', `${key}: scan(${raw})`);
          }
        }
        for (const m of line.matchAll(/\bmeter\(("[^"]*"|[^)]*)/g)) add('the bar', /\//.test(m[1]) || m[1] === '""' ? 'meter("sig")' : 'meter(free…)', key);
        if (/\bbeat=/.test(line)) add('the bar', 'beat= (steps a beat)', key);
        if (/\bswing=/.test(line)) add('swing', 'swing= on a meter', key);
        for (const m of line.matchAll(/\bscale\(([^)]*)\)/g)) {
          add('a mode', m[1].startsWith('"') ? 'scale("tonic:name") (Strudel)' : /,/.test(m[1]) ? 'scale(name, tonic)' : 'scale(name)', key);
          if (/^\d/.test(m[1].trim())) add('a mode', 'scale(t, p) (legacy)', key);
        }
        if (/\bover=scale\(/.test(line)) add('inline or named (β)', 'over=scale(…) inline', key);
        if (/^\s*&\w+\s.*\bscale\(/.test(line) && !/\bover=scale\(/.test(line)) add('inline or named (β)', '&key scale(…) a cell, over=&key', key);
        // ---- shift with carry
        if (/\bshift=/.test(line)) add('a table turned', d && !d.step ? 'shift=n on the table' : 'shift=n on a stepped cell', key);
        for (const m of line.matchAll(/\bover=&\w+\[(<<|>>)\d*\]/g)) add('a table turned', `over=&t[${m[1]}n]`, key);
        for (const m of line.matchAll(/&\w+\[(<<|>>)\d*\]/g)) if (!line.slice(Math.max(0, m.index - 5), m.index).endsWith('over=')) add('a delay', `&x[${m[1]}n] in a braid`, key);
        if (/\bstride=/.test(line)) add('a table walked', 'stride=n', key);
        if (/\bfifths\(/.test(line)) add('a table walked', 'fifths()', key);
        for (const m of line.matchAll(/&\w+\^(\$?)-?\d+/g)) add('transposing a splice', m[1] ? '&x^$n (grid steps)' : '&x^n (degrees)', key);
        for (const _ of line.matchAll(/\bdegree\(/g)) add('transposing a splice', 'degree(&x, n)', key);
        for (const _ of line.matchAll(/\binverse\(/g)) add('transposing a splice', 'inverse(&x)', key);
        // accidentals, outside attribute values
        const braidText = line.replace(/\b\w+=("[^"]*"|\S+)/g, ' ');
        for (const m of braidText.matchAll(/(?<![\w.&$^])-?\d+(#+|b+|s+|f+|[#bsf]{2,})(?![\w])/g)) add('accidentals', /[sf]/.test(m[1]) ? 'ns / nf (Strudel)' : 'n# / nb', key);
        for (const m of braidText.matchAll(/(?<![\w&])[A-G](?:#|b|s|f)?-?\d?(?=[\s,\]@!*?]|$)/g))
          add('a pitch by name or number', 'a note name in a braid (C E G)', key, m ? 1 : 0);
        // ---- spellings of steps (text: the parser merges them)
        for (const m of braidText.matchAll(/(?<=\S)@([\d.]+)/g)) add('hold', m[1] === '2' ? 'x@2' : 'x@n (n ≠ 2)', key);
        for (const _ of braidText.matchAll(/(?<=\s|\[)_(?=\s|\]|$)/g)) add('hold', 'x _ (elongation)', key);
        for (const m of braidText.matchAll(/(?<=[\w\]~])!(\d+)/g)) add('repeat', m[1] === '2' ? 'x!2' : 'x!n (n ≥ 3)', key);
        for (const _ of braidText.matchAll(/(?<=[\w\]~])\*\d+/g)) add('ratchet', 'x*n', key);
        if (/\bbase=/.test(line)) {
          add('a changed copy', 'base=&x (with =)', key);
          example('base', `${key}: ${line.trim().slice(0, 80)}`);
        }
        for (const m of line.matchAll(/\[(\s*-?[\d.]+[#bsf]?\s*(?:,\s*-?[\d.]+[#bsf]?\s*)+)\]/g)) add('chords', /,\s/.test(m[1]) ? '[0, 2, 4] (spaced)' : '[0,2,4] (tight)', key);
        for (const _ of line.matchAll(/\beuclid\(/g)) add('a rhythm', 'euclid(k, n)', key);
        if (/\bchance=/.test(line)) add('chance', 'chance=p (with x?)', key);
        for (const _ of braidText.matchAll(/\?(?=[\d.])/g)) add('chance', 'x?p', key);
        for (const _ of braidText.matchAll(/\?(?![\d.])/g)) add('chance', 'x? (bare)', key);
        // ---- combine: loudness
        for (const m of line.matchAll(/\bmap=(amp|db|lin)\b/g)) add('loudness', `map=${m[1]}`, key);
        if (/\blevel=/.test(line)) add('loudness', 'level= (a gate)', key);
        if (/\bgain=/.test(line) && !/\bpostgain=/.test(line.replace(/\bpostgain=\S+/g, ''))) if (/(^|\s)gain=/.test(line)) add('loudness', 'gain= (a voice)', key);
        if (/\bpostgain=/.test(line)) add('loudness', 'postgain= (the card)', key);
        for (const _ of line.matchAll(/&\w+:\d+:[\d.]+/g)) add('loudness', '&x:0:g (a hit gain)', key);
        if (/\bpan=/.test(line)) add('stereo', 'pan=', key);
        if (/\benv=/.test(line)) add("a voice's own volume and pitch", 'env= on the voice', key);
        if (/\bpitch=&/.test(line)) add("a voice's own volume and pitch", 'pitch=&x on the voice', key);
        if (/\bpitch=-?[\d.]+\.\./.test(line)) add("a voice's own volume and pitch", 'pitch=lo..hi * &shape on the voice', key);
        for (const _ of line.matchAll(/&\(/g)) add('inline or named (β)', '&( … ) an unnamed cell', key);
        for (const _ of braidText.matchAll(/\[[^\]|]*\|[^\]]*\]/g)) add('chance', '[a|b] a choice', key);
        for (const _ of braidText.matchAll(/\[(?:~\|[^\]]+|[^\]]+\|~)\]/g)) add('chance', '[x|~] a choice with a rest', key);
        if (/\bfm=/.test(line)) add('FM', 'fm=&op', key);
        if (d?.map?.kind === 'sample') {
          add('the card name', `&${name}`, key);
          const chords = d.braid.kind === 'list' ? d.braid.tokens.length : 0;
          if (chords === 2) add('stereo', 'two chords on the card', key);
        }
        if (/\bplay=&/.test(line) && d?.braid.kind === 'list' && d.braid.tokens.length > 0) add('gate vs product', 'a gate (play= with a braid)', key);
        if (/\b(trigger|velocity)=/.test(line)) add('gate vs product', 'old gate spelling (trigger=/velocity=)', key);
        // ---- parameters with two names
        for (const m of line.matchAll(/\bs=(tri|triangle|saw|sawtooth)\b/g)) add('sound source names', `s=${m[1]}`, key);
        // ---- comments
      }
      for (const raw of source.split('\n')) {
        if (/(^|\s)#\s/.test(raw)) add('comments', '# …', key);
        if (/\/\//.test(raw)) add('comments', '// …', key);
      }

      // ---- meaning from the parser
      for (const d of cells) {
        if (d.braid.kind !== 'list' || !d.step) continue;
        const toks = d.braid.tokens;
        // a drum hit's spellings
        const voiceHits = toks.some(
          (t) =>
            (t.atom.kind === 'ref' && isVoice(decls.get(t.atom.name))) ||
            (t.atom.kind === 'seq' && t.atom.layers.flat().some((u) => u.atom.kind === 'ref' && isVoice(decls.get(u.atom.name)))),
        );
        const values = new Set<number>();
        let onlyNotes = true;
        walk(toks, (t) => {
          if (t.atom.kind === 'note') values.add(t.atom.value);
          else if (t.atom.kind !== 'rest' && t.atom.kind !== 'seq') onlyNotes = false;
        });
        const kitOver = d.over ? decls.get(d.over.name) : undefined;
        const kit =
          kitOver &&
          kitOver.braid.kind === 'list' &&
          kitOver.braid.tokens.length > 0 &&
          kitOver.braid.tokens.every((t) => t.atom.kind === 'ref' && isVoice(decls.get(t.atom.name)));
        if (voiceHits) add('a drum hit', 'a groove of voices (step= &bd ~ &sd)', key);
        else if (kit) add('a drum hit', 'a pattern read through a kit (over=&kit 0 1)', key);
        else if (onlyNotes && values.size === 1 && values.has(1) && d.map?.kind === 'amp' && products.has(d.name))
          add('a drum hit', 'a volume pattern of ones (map=amp 1 ~ 1)', key);
        else if (onlyNotes && values.size === 1 && values.has(0) && !d.over && !d.map && products.has(d.name))
          add('a drum hit', 'a pitch pattern of zeros (0 ~ 0) times a voice', key);
        // euclid written out: one value or rests, plain tokens (repeats expanded)
        if (toks.every((t) => (t.atom.kind === 'note' || t.atom.kind === 'rest') && t.subdivide === 1 && t.elongate === 1 && t.chance == null) && values.size === 1) {
          const pat = toks.flatMap((t) => Array(t.repeat).fill(t.atom.kind === 'rest' ? '.' : 'x')).join('');
          const k = pat.split('x').length - 1;
          const e = euclids.get(pat);
          if (e && !/^euclid/.test((lineOf.get(d.name) ?? '').split(/\s/).find((w) => w.startsWith('euclid')) ?? '') && !/euclid\(/.test(lineOf.get(d.name) ?? '')) {
            const even = pat.length % k === 0;
            add('a rhythm', even ? 'a written list that is an even euclid (0 ~ 0 ~)' : 'a written list that is an uneven euclid (tresillo …)', key);
            if (!even) example('written euclid', `${key}: &${d.name} = ${e}`);
          }
        }
        // repeats written out, ratchets as subsequences
        let run = 1;
        for (let i = 1; i <= toks.length; i++) {
          if (i < toks.length && plain(toks[i]) && plain(toks[i - 1]) && same(toks[i], toks[i - 1])) run++;
          else {
            if (run >= 2) add('repeat', `${toks[i - 1].atom.kind === 'rest' ? '~ ~ (rests written out)' : 'x x (written out)'}, ${run === 2 ? 'two' : 'three or more'}`, key);
            run = 1;
          }
        }
        walk(toks, (t) => {
          if (t.atom.kind === 'seq' && t.atom.layers.length === 1) {
            const l = t.atom.layers[0];
            if (l.length >= 2 && l.every((u) => plain(u) && same(u, l[0]))) add('ratchet', '[x x] (a subsequence of one step)', key);
          }
          if (t.atom.kind === 'seq' && t.atom.layers.length > 1) {
            const singles = t.atom.layers.every((l) => l.length === 1 && l[0].atom.kind === 'note');
            add('chords', singles ? 'a stack of single notes (= a chord)' : 'a stack of sequences [0 2, 4]', key);
          }
          if (t.atom.kind === 'seq' && t.atom.layers.length === 1) add('one isometry at any scale', '[a b] inline', key);
          if (t.subdivide > 1) add('one isometry at any scale', 'x*n inline', key);
        });
      }
      for (const [, n] of spliced) add('inline or named (β)', n === 1 ? 'a named cell spliced once' : 'a named cell spliced twice or more', key);
    }

    // every piece parses, and the families the note's table cites are found in the library
    for (const [key, { source }] of pieces) expect(parse(source).diagnostics, key).toEqual([]);
    expect([...tally.keys()]).toEqual(expect.arrayContaining(['gate vs product', 'tempo', 'loudness', 'chords', 'inline or named (β)']));
    log(`# #151 families over the library: ${pieces.length} pieces\n`);
    for (const [family, spellings] of tally) {
      log(`## ${family}`);
      for (const [s, { n, pieces: p }] of [...spellings].sort((a, b) => b[1].n - a[1].n)) log(`- ${s}: ${n} × in ${p.size} pieces${p.size <= 4 ? ` (${[...p].join(', ')})` : ''}`);
      log('');
    }
    log('## examples');
    for (const [k, xs] of examples) log(`- ${k}: ${xs.join(' | ')}`);
  }, 120_000);
});

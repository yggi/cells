// Alpha substitution (decision 075, #560; the core property): a cell's name is a name and nothing else. Rename every name a text
// defines, consistently and to names it doesn't write, and it plays what it played (S1), says what it said (its
// diagnostics, the names renamed), and the default performer reads each event as the same part (the feel, decision 063
// §2). Checked over every example twice: its `from` lines written in (the language alone), and as written (the language
// and the library together, where a `from` line can rename only what it binds). What still breaks it is listed by
// name, each with why and its issue: a list a passing example must leave (the test fails when one starts to pass).
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { FAMILIES } from './core';
import { parse, readFrom } from './parser';
import { splitComment } from './edit';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { readerOf } from './perform/feel';
import { soundsIdentical } from './sameness';
import { expansion, signatureOf } from './use';
import { isAttribute, topTokens } from './parser/use';
import { EXAMPLES } from './examples';
import { resolveSeed } from '../repository/library';

const O = { resolve: resolveSeed };
const NAME = /&([A-Za-z_][A-Za-z0-9_]*)(?![A-Za-z0-9_])/g;

/**
 * A text's `from` lines written so that each says what it takes by the fragment's name (decision 075 §3a–b): a
 * collection's `&bd` as `&bd=bd`, a template's several heads likewise, and a `*` as the names it gave, but those the
 * text defines itself. A template of one head is renamed by its line already (`&x from dorian D`). It plays as written;
 * renamed, `&bd=bd` is `&zq0=bd`, the fragment's word kept. With the names each such line binds.
 */
function explicit(text: string): { text: string; names: string[] } {
  if (!/\sfrom(\s|$)/.test(text)) return { text, names: [] };
  const x = expansion(text, O);
  const mine = new Set(own(text));
  const names: string[] = [];
  const out = text.split('\n').map((raw, i) => {
    const [code, comment] = splitComment(raw);
    const f = readFrom(code.trim().split(/\s+/).join(' '));
    if (f?.kind !== 'use') return raw;
    const t = resolveSeed(f.id);
    const s = t === null ? null : signatureOf(t);
    if (s && s.names.length === 1) return raw;
    const gave = x.takes.find((u) => u.span.line === i + 1)?.gave ?? [];
    const pairs = f.names ? f.names.map((n, k) => [n, f.takes![k]!] as const) : (s ? s.names : gave.filter((n) => !mine.has(n.slice(1)))).map((n) => [n, n] as const);
    names.push(...pairs.map(([n]) => n.slice(1)));
    // (\`&bd=bd\`, written out even where the two are one: renamed, it is \`&zq0=bd\`)
    const left = pairs.map(([n, t]) => `${n}=${t.slice(1)}`).join(', ');
    const at = topTokens(code).find((w) => w.text === 'from')!.at;
    const attributes = topTokens(code.slice(0, at)).flatMap((w) => (isAttribute(w.text) ? [w.text] : []));
    return `${/^\s*/.exec(code)![0]}${[left, ...attributes].join(' ')} ${code.slice(at)}${comment}`;
  });
  return { text: out.join('\n'), names };
}

/** The text with each of `names` renamed to a fresh name (`&zq0` …), everywhere it is written: what the renaming was, and the text. */
function renamed(whole: string, names: readonly string[]): { text: string; back: (s: string) => string } {
  const text = explicit(whole).text;
  const written = new Set([...text.matchAll(NAME)].map((m) => m[1]!));
  const to = new Map<string, string>();
  let k = 0;
  for (const n of names) {
    let fresh = `zq${k++}`;
    while (written.has(fresh)) fresh = `zq${k++}`;
    to.set(n, fresh);
  }
  const from = new Map([...to].map(([a, b]) => [b, a]));
  const swap = (m: ReadonlyMap<string, string>) => (s: string) => s.replace(NAME, (w, n: string) => (m.has(n) ? `&${m.get(n)}` : w));
  return { text: swap(to)(text), back: swap(from) };
}

/** What a text says, sorted, each message read back through `back` (the renaming undone). */
const said = (text: string, back: (s: string) => string = (s) => s) =>
  compileSource(text, undefined, O)
    .diagnostics.map((d) => `${d.severity}: ${back(d.message)}`)
    .sort();

/** The part the default performer reads each event as, in order (the feel's `readerOf`): the first 8 seconds. */
function parts(text: string): string[] {
  const r = compileSource(text, undefined, O);
  const read = readerOf(r);
  return eventsBetween(plan(r, codeShifts(r)), 0, 8, true).map((e) => {
    const p = read(e.output);
    return p ? `${p.part}${p.role ? `:${p.role}` : ''}` : '-';
  });
}

/** Does the renamed text play, say and get read as the text does? Each that doesn't, by its name. */
function broken(text: string, names: readonly string[]): string[] {
  const r = renamed(text, names);
  return [
    ...(soundsIdentical(text, r.text, undefined, O) ? [] : ['sound']),
    ...(JSON.stringify(said(text)) === JSON.stringify(said(r.text, r.back)) ? [] : ['diagnostics']),
    ...(JSON.stringify(parts(text)) === JSON.stringify(parts(r.text)) ? [] : ['feel']),
  ];
}

const own = (text: string) => [...new Set(parse(text).cells.map((d) => d.name))].filter((n) => !n.startsWith('λ'));
const written = FAMILIES.find((f) => f.key === 'from')!.rewrite;

/**
 * The default performer (the feel, decision 063 §2; yggi/music-commons `contracts/feel`) reads an event's part off the
 * names its output id carries (`readingOf`: a line named `&bass`, `&pad`, `&stab` or `&lead` is that part, a kit's line
 * `&kick` or `&hat` that drum role) and off a role cell's name (`&bass map=role &bassOut`, decision 061). Renamed, the
 * line plays the same notes and the performer plays them as written.
 */
const FEEL = ['clock', 'voice', 'effects', 'variations', 'midi-out', 'idm', 'cellscape', 'electroswing', 'spooky', 'kinderlied', 'soundtape', 'radio', 'circle'];

/**
 * Where renaming still changes what a piece is (#560). Written in, a name alone means something only where the language
 * gives it a meaning of its own: the feel's parts and roles (`FEEL`). A drum's note is its `note=` since #560's rung 1,
 * so `&bd note=36` renamed sends 36 still.
 */
const WRITTEN_IN: Readonly<Record<string, readonly string[]>> = {
  ...Object.fromEntries(FEEL.map((k) => [k, ['feel']])),
};

/**
 * As written, every name a `from` line takes is renamed too (`&bd` is `&zq0=bd`, decision 075 §3a–b: a collection's
 * cells, a template's several heads, a `*` written out by name), so the feel's parts are renamed with them. The
 * instruments, the performers and the band read only what they declare (#560 rung 3c–e: `bass_performer(bassV=&bassV)`,
 * `* from band(bassline=&bassline, …, style=&style)`), so only the feel (rung 2) is left.
 */
const AS_WRITTEN: Readonly<Record<string, readonly string[]>> = Object.fromEntries(FEEL.map((k) => [k, ['feel']]));

/** The names a text binds itself: its own lines' and every name its `from` lines take (decision 075 §3a–b). */
function bound(text: string): string[] {
  const heads: string[] = [];
  for (const raw of text.split('\n')) {
    const f = readFrom(splitComment(raw)[0].trim().split(/\s+/).join(' '));
    if (f?.kind !== 'use' || f.names?.length !== 1) continue;
    const t = resolveSeed(f.id);
    const s = t === null ? null : signatureOf(t);
    if (s && s.names.length === 1) heads.push(f.names[0]!.slice(1));
  }
  return [...new Set([...own(text), ...heads, ...explicit(text).names])];
}

describe('alpha substitution: every name a text defines renamed, it plays, says and reads as it did', () => {
  describe('the language: each example with its from lines written in, every name renamed', () => {
    it.each(Object.entries(EXAMPLES))('%s', (key, p) => {
      const text = written(p.source, O);
      expect(broken(text, own(text))).toEqual(WRITTEN_IN[key] ?? []);
    });
  });

  describe('the language and its library: each example as written, every name it binds renamed', () => {
    it.each(Object.entries(EXAMPLES))('%s', (key, p) => {
      const text = p.source;
      expect(broken(text, bound(text))).toEqual(AS_WRITTEN[key] ?? []);
    });
  });

  it('the meter, the key, the tempo, the tonic and the harmony have no names of their own', () => {
    const text = [
      '&bar from meter &tempo',
      '&tempo step=96bpm',
      '&key from diatonic(mode=dorian) &tonic',
      '&tonic D',
      '&harm over=&key step=1m [0,2,4] [3,5,7]',
      '&walk from walking_bass &harm',
      '&v s=saw loop=C2',
      '&out map=sample [&walk * &v]',
    ].join('\n');
    expect(said(text)).toEqual([]);
    expect(broken(text, bound(text))).toEqual([]);
    expect(renamed(text, bound(text)).text).not.toMatch(/&(bar|tempo|key|tonic|harm|walk)\b/);
  });

  it('a from line renames what it takes: a collection’s cells, a `*`, a template’s several heads (decision 075 §3a–b)', () => {
    const text = [
      '&bar from meter &tempo',
      '&tempo step=120bpm',
      '&bd, &sd from gm_kit',
      '* from envelopes',
      '&beat step=8n &bd ~ &sd ~',
      '&out map=sample [&beat]',
      '&key from diatonic(mode=ionian) C',
      '&line over=&key step=4n 0 2 4 2',
      '&bass, &bassOut from bass_performer &line',
    ].join('\n');
    expect(said(text).filter((d) => d.startsWith('error'))).toEqual([]);
    expect(broken(text, bound(text))).toEqual([]);
    const r = renamed(text, bound(text)).text;
    expect(r).toMatch(/^&zq\d+=bd, &zq\d+=sd from gm_kit$/m);
    expect(r).not.toMatch(/^\* from/m);
    expect(r).toMatch(/^&zq\d+=bass, &zq\d+=bassOut from bass_performer &zq\d+$/m);
    expect(r).not.toMatch(/&(bd|sd|beat|bass|bassOut)\b/);
  });
});

/**
 * Open fragments (#22): a fragment that leaves `&bar` and `&key` to the host. Each way of filling one is tried on three
 * cases, and the filled fragment's events are compared with the same text written whole. A probe for the proposal in
 * docs/notes/22-open-fragments.md: it builds no form. An option that would need a change to `src/` is emulated here, on
 * the text or on the parsed cells, and the note says what the change would be.
 *
 *   node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/open-fragments.ts
 *
 * prints the note's tables as Markdown. The options:
 * - **taps** (no form): the fragment taps (`step=16n`) and names no meter, so the host's `&bar` line, added to the text,
 *   is its main meter (decision 040); a fragment over a key names `&key`, and the host's line declares it.
 * - **env**: the host passes cells beside the numbers of `Env`; compile adds those the fragment doesn't declare.
 *   Emulated on the parsed cells, since `Env` holds numbers only.
 * - **declared**: the fragment says what it leaves open, `&bar host`, with a default after it (`&key host scale(dorian, D)`);
 *   the host's line takes its place, else the default, else an error. Emulated on the text, since `host` doesn't parse.
 * - **imported**: the host's text names a fragment by its id (`&drums use="funk drums"`, its hash later, #49): its text
 *   comes in with every cell it declares renamed under the name it is used as, and what it only reads left to the host.
 *   Emulated on the text, since `use=` doesn't parse.
 *
 * The texts are lifted from yggi/jambot packages/score/experiments/bar-in-cells.ts @ d225286 (E33's bar 0 of Funk in
 * 4/4 and of Synth-pop in 4/4 and 7/8, seed 0, entropy 0.3), split into the host's lines and the fragments'.
 */
import { pathToFileURL } from 'node:url';
import type { CellDecl, Diagnostic } from '../src/engine/ast';
import { compileSource } from '../src/engine/compile';
import { compile } from '../src/engine/compiler';
import { renameCell, setAttr, usersOf } from '../src/engine/edit';
import { parse } from '../src/engine/parser';
import { gmDrumNote } from '../src/engine/midi';
import { DEFAULT_ENV, codeShifts, type CompileResult } from '../src/engine/program';
import { eventsBetween, plan } from '../src/engine/realize';
import type { Fragment } from '../src/repository/fragments';
import { METER_FRAGMENTS } from '../src/repository/meters';

const lines = (...xs: string[]) => xs.join('\n');

/** Funk's drums in 4/4 (E31's richest bar: every role, the rim a Euclid on `1m`), on `16n` taps: no meter named. */
export const FUNK_DRUMS = lines(
  '&kick step=16n &bd:0:.502201 ~ ~ ~ ~ ~ ~ ~ ~ ~ &bd:0:.339513 &bd:0:.339513 ~ ~ ~ ~',
  '&backbeat step=16n ~ ~ ~ ~ &sd:0:.406783 ~ ~ ~ ~ ~ ~ ~ &sd:0:.458553 ~ ~ ~',
  '&ghost step=16n ~ ~ ~ &sd:0:.084878 ~ ~ ~ &sd:0:.084878 ~ ~ ~ ~ ~ ~ ~ &sd:0:.084878',
  '&hat step=16n &hh:0:.246078 ~ &oh:0:.174158 ~ &hh:0:.246078 ~ &oh:0:.174158 ~ &hh:0:.246078 ~ ~ ~ &hh:0:.246078 ~ ~ ~',
  '&euclid step=1m &rim(5,16,5)',
  '&drums [&kick, &backbeat, &ghost, &hat, &euclid * .208568]',
  '&bd s=white',
  '&hh s=white',
  '&rim s=white',
  '&oh s=white',
  '&sd s=white',
);
/** Synth-pop's drums in 4/4: the same roles' names and voices as Funk's, so the two collide when layered. */
export const POP_DRUMS = lines(
  '&kick step=16n &bd:0:.427119 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~',
  '&backbeat step=16n ~ ~ ~ ~ &sd:0:.339513 ~ ~ ~ ~ ~ ~ ~ &sd:0:.377209 ~ ~ ~',
  '&hat step=16n ~ ~ &oh:0:.148862 ~ &hh:0:.208568 ~ &hh:0:.148862 ~ ~ ~ ~ ~ &hh:0:.208568 ~ ~ ~',
  '&drums [&kick, &backbeat, &hat]',
  '&bd s=white',
  '&oh s=white',
  '&sd s=white',
  '&hh s=white',
);
/** Funk's bass in 4/4: degrees of `&key` from C1, on `16n` taps; it names `&key` and declares none. */
export const FUNK_BASS = lines(
  '&bass over=&key step=16n 7@10 14@3 7@3',
  '&bassLevel map=amp step=16n .458553@10 .321409@3 .321409@3',
  '&bassOut play=&bass level=&bassLevel &bassV',
  '&bassV loop=C1',
);

/** E33's witness, Synth-pop's bar 0 in 7/8 (3+2+2), as Jambot wrote it whole. */
export const POP_78_WHOLE = lines(
  '&bar meter("7/8") step=108bpm',
  '&key scale(aeolian, A)',
  '&harm over=&key step=1m [0,2,4]',
  '&kick step=16n &bd:0:.427119 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~',
  '&backbeat step=16n ~ ~ ~ ~ ~ ~ &sd:0:.339513 ~ ~ ~ &sd:0:.377209 ~ ~ ~',
  '&hat step=16n ~ ~ &oh:0:.148862 ~ &hh:0:.148862 ~ &hh:0:.208568 ~ ~ ~ ~ ~ &hh:0:.148862 ~',
  '&drums [&kick, &backbeat, &hat]',
  '&bd s=white',
  '&oh s=white',
  '&hh s=white',
  '&sd s=white',
  '&bass over=&key step=16n 7@8 7@6',
  '&bassLevel map=amp step=16n .406783@8 .286689@6',
  '&bassOut play=&bass level=&bassLevel &bassV',
  '&bassV loop=C1',
  '&pad over=&key step=16n [0,2,4]@14',
  '&padOut play=&pad level=.18755 &compV',
  '&compV loop=C3',
  '&out map=midi ~ &bassOut &padOut ~!6 &drums',
);
const popLines = POP_78_WHOLE.split('\n');
/** The same bar split: the host's lines (the meter, the key, the harmony, the card) and three fragments that tap and name `&key`. */
export const POP_78_HOST = lines(popLines[0]!, popLines[1]!, popLines[2]!, popLines[18]!);
export const POP_78_DRUMS = popLines.slice(3, 11).join('\n');
export const POP_78_BASS = popLines.slice(11, 15).join('\n');
export const POP_78_COMP = popLines.slice(15, 18).join('\n');

/** The library the imported option reads: the repository's meters and these fragments, by id. */
export const LIBRARY: readonly Fragment[] = [
  ...METER_FRAGMENTS,
  ...(
    [
      ['funk drums', FUNK_DRUMS],
      ['pop drums', POP_DRUMS],
      ['funk bass', FUNK_BASS],
      ['pop 7/8 drums', POP_78_DRUMS],
      ['pop 7/8 bass', POP_78_BASS],
      ['pop 7/8 comp', POP_78_COMP],
    ] as const
  ).map(([id, text]) => ({ id, text, association: [{ point: { energy: 0.5 }, weight: 1 }] })),
];

/** A fragment filled: what compiled, the option's own problems (before compile), and how its voices map back to the whole text's names. */
export interface Filled {
  readonly result: CompileResult;
  readonly problems: readonly string[];
  readonly voices?: ReadonlyMap<string, string>;
}

const errorsOf = (diagnostics: readonly Diagnostic[]) => diagnostics.filter((d) => d.severity === 'error').map((d) => d.message);
const declared = (text: string): string[] => parse(text).cells.map((c) => c.name);

/** Taps (no form): the fragments' text, then the host's lines after it, as one text. */
export function byTaps(fragments: readonly string[], host: string): Filled {
  return { result: compileSource(lines(...fragments, host)), problems: [] };
}

/**
 * Env: the host passes its cells beside `Env`'s numbers, and compile adds each the fragments don't declare, ahead of
 * theirs (so the host's meter is the first, the main one). Emulated: the host's text is parsed on its own and its cells
 * joined to the fragments' parsed cells; compile reads them as one piece.
 */
export function byEnv(fragments: readonly string[], host: string): Filled {
  const own = parse(lines(...fragments));
  const given = parse(host);
  const names = new Set(own.cells.map((c) => c.name));
  const added: CellDecl[] = given.cells.filter((c) => !names.has(c.name));
  const shadowed = given.cells.filter((c) => names.has(c.name)).map((c) => `&${c.name} is the fragment's own: the host's is not read`);
  const result = compile(
    { cells: [...added, ...own.cells], diagnostics: [...given.diagnostics, ...own.diagnostics], broken: [...(given.broken ?? []), ...(own.broken ?? [])] },
    DEFAULT_ENV,
  );
  return { result, problems: shadowed };
}

/** A line that leaves a cell to the host: `&bar host`, or `&key host <default>`. */
const HOST_LINE = /^&([A-Za-z_][A-Za-z0-9_]*)\s+host(?:\s+(.*))?$/;

/**
 * Declared: each `&name host [default]` line of the fragments takes the host's line for &name, else `&name <default>`,
 * else it is a problem (an error the compiler would give). The host's other lines join the text after the fragments.
 */
export function byDeclaration(fragments: readonly string[], host: string): Filled {
  const hostLines = host.split('\n').filter((l) => l.trim());
  const hostLineOf = new Map(hostLines.map((l) => [/^&([A-Za-z_][A-Za-z0-9_]*)/.exec(l)?.[1] ?? '', l]));
  const used = new Set<string>();
  const problems: string[] = [];
  const text = lines(...fragments)
    .split('\n')
    .map((line) => {
      const m = HOST_LINE.exec(line.trim());
      if (!m) return line;
      const [, name, fallback] = m;
      const given = hostLineOf.get(name!);
      if (given) {
        used.add(name!);
        return given;
      }
      if (fallback?.trim()) return `&${name} ${fallback.trim()}`;
      problems.push(`&${name} is left to the host, and the host gave none`);
      return '';
    });
  const rest = hostLines.filter((l) => !used.has(/^&([A-Za-z_][A-Za-z0-9_]*)/.exec(l)?.[1] ?? ''));
  return { result: compileSource(lines(...text, ...rest)), problems };
}

/** A line that imports a fragment: `&name use="<id>" [key=value …]`. */
const USE_LINE = /^&([A-Za-z_][A-Za-z0-9_]*)\s+use="([^"]*)"(.*)$/;

/**
 * A fragment's text under the name it is used as: the cell no other of its cells reads (its output) takes that name,
 * every other cell it declares is prefixed with it (`drums_kick`), and what it reads but doesn't declare (`&key`) is
 * left as it is, for the host to fill. With `keepVoices`, its voices keep their names too: a voice is an instrument the
 * fragments share (`&bd s=white`), and MIDI out reads a drum's note off its name (`gmDrumNote`). Null when it has no
 * single output.
 */
export function namespaced(text: string, as: string, keepVoices = false): { text: string; voices: Map<string, string> } | null {
  const names = declared(text);
  const outputs = names.filter((n) => usersOf(text, n).length === 0);
  if (outputs.length !== 1) return null;
  const compiled = compileSource(text).cells;
  let out = text;
  const voices = new Map<string, string>();
  for (const n of names) {
    if (keepVoices && compiled.get(n)?.voice && n !== outputs[0]) continue;
    const to = n === outputs[0] ? as : `${as}_${n}`;
    out = renameCell(out, n, to);
    voices.set(to, n);
  }
  return { text: out, voices };
}

/**
 * Imported: each `&name use="<id>"` line of the host's text takes the library's fragment of that id, namespaced under
 * &name, with the line's other attributes set on its output (a meter's `step=`: a meter fragment is open on its tempo).
 * With `keepVoices`, voices keep their names, and a line that comes in word for word twice (two fragments' `&bd s=white`)
 * is one line.
 */
export function byImport(host: string, keepVoices = false, library: readonly Fragment[] = LIBRARY): Filled {
  const problems: string[] = [];
  const voices = new Map<string, string>();
  const text = host.split('\n').map((line) => {
    const m = USE_LINE.exec(line.trim());
    if (!m) return line;
    const [, name, id, rest] = m;
    const fragment = library.find((f) => f.id === id);
    const spaced = fragment && namespaced(fragment.text, name!, keepVoices);
    if (!spaced) {
      problems.push(fragment ? `"${id}" has no single output to name &${name}` : `no fragment "${id}" in the library`);
      return '';
    }
    for (const [k, v] of spaced.voices) voices.set(k, v);
    let source = spaced.text;
    for (const [, key, value] of rest!.matchAll(/([a-z]+)=(\S+)/g)) source = setAttr(source, name!, key!, value!);
    return source;
  });
  const all = lines(...text).split('\n');
  const once = keepVoices ? all.filter((l, i) => !l.trim() || all.indexOf(l) === i) : all;
  return { result: compileSource(lines(...once)), problems, voices };
}

/** A note as the comparison reads it: voice, onset, length, pitch, level, gains, the MIDI entries it goes out on, its drum note; numbers to 9 digits. */
export interface Note {
  readonly voice: string;
  readonly at: number;
  readonly dur: number;
  readonly freq: number;
  /** Its level at the start (MIDI out strikes it at 127·√level), and its channel gains. */
  readonly level: number;
  readonly gains: string;
  readonly midi: string;
  /** The General MIDI drum note MIDI out reads off the voice's own name, or null (then the kit's next free note). */
  readonly gm: number | null;
}

const round = (x: number) => +x.toPrecision(9);

/** A piece's notes over its first `seconds`, each voice named as the whole text names it. */
export function notesOf(result: CompileResult, seconds: number, voices: ReadonlyMap<string, string> = new Map()): Note[] {
  if (!result.ok) return [];
  return eventsBetween(plan(result, codeShifts(result), result.off), 0, seconds)
    .map((e) => ({
      voice: voices.get(e.voice) ?? e.voice,
      at: round(e.at),
      dur: round(e.dur),
      freq: round(e.freq),
      level: round(e.levels[0]?.level ?? 1),
      gains: e.gains.map(round).join(' '),
      midi: JSON.stringify(e.midi ?? null),
      gm: gmDrumNote(e.voice),
    }))
    .sort((a, b) => a.at - b.at || (a.voice < b.voice ? -1 : a.voice > b.voice ? 1 : 0) || a.freq - b.freq);
}

/** What a comparison found: equal or not, the notes each side plays, the errors of the filled side. */
export interface Compared {
  readonly equal: boolean;
  readonly notes: number;
  readonly whole: number;
  /** Notes at the same place in both lists that differ in anything (the shorter list's length). */
  readonly differing: number;
  readonly errors: readonly string[];
}

/** The filled fragment against the text written whole, over `seconds`. */
export function compare(filled: Filled, whole: string, seconds: number): Compared {
  const a = notesOf(filled.result, seconds, filled.voices);
  const wholeResult = compileSource(whole);
  if (!wholeResult.ok) throw new Error(`the whole text doesn't compile: ${errorsOf(wholeResult.diagnostics).join('; ')}`);
  const b = notesOf(wholeResult, seconds);
  const errors = [...filled.problems, ...errorsOf(filled.result.diagnostics)];
  const differing = a.filter((n, i) => JSON.stringify(n) !== JSON.stringify(b[i])).length;
  return { equal: errors.length === 0 && a.length > 0 && a.length === b.length && differing === 0, notes: a.length, whole: b.length, differing, errors };
}

/**
 * What a fragment leaves open, compiled alone: the main meter when a line taps one without naming it (its step, or a
 * time read as a tap, `delaytime=8n`) and the fragment has none, read off the parsed cells; and each cell it names and doesn't declare, read off
 * the compiler's "Unknown cell" errors. The meter is read off the parse because its error is not said for a line that
 * already failed (a line over a missing `&key` doesn't also say it has no meter).
 */
export function openNames(fragment: string): string[] {
  const tapsMain = parse(fragment).cells.some((c) => (c.step?.kind === 'tap' && !c.step.meter) || Object.values(c.paramClocks ?? {}).some((st) => st.kind === 'tap' && !st.meter));
  const compiled = compileSource(fragment);
  const errors = errorsOf(compiled.diagnostics);
  const cells = [...new Set(errors.flatMap((e) => [...e.matchAll(/Unknown cell &([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => `&${m[1]}`)))];
  return [...(tapsMain && !compiled.mainMeter ? ['(the main meter)'] : []), ...cells];
}

/** The share of `bars` bars of a piece's main meter whose downbeat a voice strikes. */
export function downbeats(result: CompileResult, voice: string, bars: number): number {
  const meter = result.mainMeter ? result.cells.get(result.mainMeter) : undefined;
  const clock = result.mainMeter ? result.clocks.get(result.mainMeter) : undefined;
  if (!meter?.meter || !clock) return NaN;
  const bar = meter.meter.levels.length / clock.perSecond;
  const onsets = notesOf(result, bars * bar - 1e-6).filter((n) => n.voice === voice);
  let struck = 0;
  for (let k = 0; k < bars; k++) if (onsets.some((n) => Math.abs(n.at - k * bar) < 1e-6)) struck++;
  return struck / bars;
}

/** One measured row: a case, its fill, an option, and what the comparison found. */
export interface Row extends Compared {
  readonly case: string;
  readonly fill: string;
  readonly option: string;
}

/** The options, in the tables' order. */
export const OPTIONS = ['taps', 'env', 'declared', 'imported', 'imported, voices kept'] as const;

/** The meters case 1 is filled by: 4/4, 7/8 (3+2+2) and 7/8 as 2+2+3, written as levels (no signature names it). */
export const FILLS_1: readonly { readonly fill: string; readonly bar: string; readonly id: string | null }[] = [
  { fill: '4/4', bar: '&bar meter("4/4") step=104bpm', id: '4/4' },
  { fill: '7/8 (3+2+2)', bar: '&bar meter("7/8") step=104bpm', id: '7/8' },
  { fill: '7/8 (2+2+3)', bar: '&bar meter("*.+.+..") step=104bpm', id: null },
];
/** The keys case 2 is filled by: Funk's own, and another. */
export const FILLS_2: readonly string[] = ['scale(dorian, D)', 'scale(aeolian, A)'];

/** How long each comparison listens: 8 bars of 4/4 at 104 bpm, about 18 s (about 10 bars of 7/8). */
export const SECONDS = (8 * 4 * 60) / 104;

/** Every case under every option. */
export function measure(): Row[] {
  const rows: Row[] = [];
  const row = (c: string, fill: string, option: (typeof OPTIONS)[number], compared: Compared) => rows.push({ case: c, fill, option, ...compared });
  // 1. a drum fragment with &bar open; the imported option takes the host's meter from the repository too, where it has one
  for (const { fill, bar, id } of FILLS_1) {
    const whole = lines(bar, FUNK_DRUMS);
    const workbench = lines(id ? `&bar use="${id}" step=104bpm` : bar, '&drums use="funk drums"');
    row('1 drums', fill, 'taps', compare(byTaps([FUNK_DRUMS], bar), whole, SECONDS));
    row('1 drums', fill, 'env', compare(byEnv([FUNK_DRUMS], bar), whole, SECONDS));
    row('1 drums', fill, 'declared', compare(byDeclaration([lines('&bar host', FUNK_DRUMS)], bar), whole, SECONDS));
    row('1 drums', fill, 'imported', compare(byImport(workbench), whole, SECONDS));
    row('1 drums', fill, 'imported, voices kept', compare(byImport(workbench, true), whole, SECONDS));
  }
  // 2. a bass line with &key open (and &bar, since it taps)
  const bar44 = FILLS_1[0]!.bar;
  for (const key of FILLS_2) {
    const host = lines(bar44, `&key ${key}`);
    const whole = lines(host, FUNK_BASS);
    row('2 bass', key, 'taps', compare(byTaps([FUNK_BASS], host), whole, SECONDS));
    row('2 bass', key, 'env', compare(byEnv([FUNK_BASS], host), whole, SECONDS));
    row('2 bass', key, 'declared', compare(byDeclaration([lines('&bar host', '&key host', FUNK_BASS)], host), whole, SECONDS));
    row('2 bass', key, 'imported', compare(byImport(lines(host, '&bassOut use="funk bass"')), whole, SECONDS));
    row('2 bass', key, 'imported, voices kept', compare(byImport(lines(host, '&bassOut use="funk bass"'), true), whole, SECONDS));
  }
  // 3. three fragments sharing one host &bar (and &key): E33's witness, rebuilt from its parts
  const parts = [POP_78_DRUMS, POP_78_BASS, POP_78_COMP];
  const workbench = lines(POP_78_HOST, '&drums use="pop 7/8 drums"', '&bassOut use="pop 7/8 bass"', '&padOut use="pop 7/8 comp"');
  row('3 shared', '7/8 (E33)', 'taps', compare(byTaps(parts, POP_78_HOST), POP_78_WHOLE, SECONDS));
  row('3 shared', '7/8 (E33)', 'env', compare(byEnv(parts, POP_78_HOST), POP_78_WHOLE, SECONDS));
  row('3 shared', '7/8 (E33)', 'declared', compare(byDeclaration([lines('&bar host', '&key host'), ...parts], POP_78_HOST), POP_78_WHOLE, SECONDS));
  row('3 shared', '7/8 (E33)', 'imported', compare(byImport(workbench), POP_78_WHOLE, SECONDS));
  row('3 shared', '7/8 (E33)', 'imported, voices kept', compare(byImport(workbench, true), POP_78_WHOLE, SECONDS));
  return rows;
}

/**
 * Two drum fragments layered over one host &bar: Funk's and Synth-pop's share their roles' and voices' names. Written
 * whole as a person would: the roles renamed apart, the voices (the kit) once.
 */
export function layered(): Row[] {
  const host = FILLS_1[0]!.bar;
  const all = lines(host, namespaced(FUNK_DRUMS, 'funk', true)!.text, namespaced(POP_DRUMS, 'pop', true)!.text).split('\n');
  const whole = lines(...all.filter((l, i) => all.indexOf(l) === i));
  const rows: Row[] = [];
  const row = (option: (typeof OPTIONS)[number], filled: Filled) => rows.push({ case: '3 layered', fill: '4/4', option, ...compare(filled, whole, SECONDS) });
  const workbench = lines(host, '&funk use="funk drums"', '&pop use="pop drums"');
  row('taps', byTaps([FUNK_DRUMS, POP_DRUMS], host));
  row('env', byEnv([FUNK_DRUMS, POP_DRUMS], host));
  row('declared', byDeclaration([lines('&bar host', FUNK_DRUMS), POP_DRUMS], host));
  row('imported', byImport(workbench));
  row('imported, voices kept', byImport(workbench, true));
  return rows;
}

/** Each option with nothing from the host, and with a default where the option has one: the bass fragment, open on both. */
export function unfilled(): { option: string; errors: string[]; plays: boolean }[] {
  const run = (option: string, filled: Filled) => {
    const errors = [...filled.problems, ...errorsOf(filled.result.diagnostics)];
    return { option, errors: [...new Set(errors)], plays: errors.length === 0 && notesOf(filled.result, SECONDS).length > 0 };
  };
  return [
    run('taps', byTaps([FUNK_BASS], '')),
    run('env', byEnv([FUNK_BASS], '')),
    run('declared', byDeclaration([lines('&bar host', '&key host', FUNK_BASS)], '')),
    run('declared, with defaults', byDeclaration([lines('&bar host meter("4/4") step=104bpm', '&key host scale(dorian, D)', FUNK_BASS)], '')),
    run('imported', byImport('&bassOut use="funk bass"')),
  ];
}

/** What a comparison found, in a cell of a table. */
const verdict = (r: Compared) =>
  r.equal
    ? `equal, ${r.notes} notes`
    : r.errors.length
      ? `${r.errors.length} errors`
      : r.notes === r.whole
        ? `differs: ${r.differing} of ${r.notes} notes`
        : `differs: ${r.notes} notes against ${r.whole}`;

/** The options' heads in the tables. */
const HEADS: Readonly<Record<(typeof OPTIONS)[number], string>> = {
  taps: '(t) taps',
  env: '(a) env',
  declared: '(b) declared',
  imported: '(c) imported',
  'imported, voices kept': '(c) imported, voices kept',
};

/** The tables, as Markdown. */
export function report(): string {
  const rows = [...measure(), ...layered()];
  const keys = [...new Set(rows.map((r) => `${r.case} | ${r.fill}`))];
  const table = [
    `| case | fill | ${OPTIONS.map((o) => HEADS[o]).join(' | ')} |`,
    `|---|---|${OPTIONS.map(() => '---').join('|')}|`,
    ...keys.map((k) => `| ${k} | ${OPTIONS.map((o) => verdict(rows.find((r) => `${r.case} | ${r.fill}` === k && r.option === o)!)).join(' | ')} |`),
  ].join('\n');
  const sits = FILLS_1.map(({ fill, bar }) => `${fill} ${downbeats(compileSource(lines(bar, FUNK_DRUMS)), 'bd', 14).toFixed(2)}`).join(', ');
  const open = (
    [
      ['funk drums', FUNK_DRUMS],
      ['funk bass', FUNK_BASS],
      ['pop 7/8 comp', POP_78_COMP],
    ] as const
  ).map(([id, text]) => `${id}: ${openNames(text).join(' ') || 'nothing'}`);
  return [
    table,
    '',
    '| unfilled | errors | plays |',
    '|---|---|---|',
    ...unfilled().map((u) => `| ${u.option} | ${u.errors.map((e) => `"${e}"`).join('; ') || 'none'} | ${u.plays ? 'yes' : 'no'} |`),
    '',
    `Open: ${open.join('; ')}`,
    `Of 14 bars, the share whose downbeat Funk's 16-step kick strikes: ${sits}`,
  ].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) console.log(report());

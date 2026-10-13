// The disassembler's bench (docs/notes/disassembler.md, the workspace): every file of the MIDI library through the
// folder, measured against what is known about it. Not a gate (the ratchets are: src/engine/fold/midiRatchet.ts and
// ratchet.slow.test.ts); a table to decide by. Each row a file:
// - **size**: the score flat and folded (fold/score.ts `bare`), and whether the fold was taken (it plays the notes);
// - **key**: the key the folder reads (`bestKey`, one for the piece) against the one its index names (`tonality`);
// - **voices found** (`fold/voices.ts`, `byVoice`): how many, and how far they agree with the voices written (pairs of
//   notes one after the other in a voice: precision / recall, `voiceAgreement`);
// - **voices**: the voices its typesetter wrote (midi/<set>/voices/, `tools/mutopia.py voice`), and the same notes
//   folded a line a voice instead of a line a hand: what a perfect voice separation would do to the size;
// - **higher order**: runs of one cell spliced at moving bases the fold leaves (`higher.ts`: a sequence, a canon per
//   tonos), what they cost written out and what a path of transpositions would;
// - **heard** (HEARD=1, slower): the fold's phrases of 4 s or more against the swells its sound has (`heard.ts`, #286):
//   precision, recall and chance;
// - **time**: the fold's, in ms.
// Run: BENCH=out.md [ONLY=fugue,ricercar] [SET=wtc] npx vitest run tools/disasm/bench.test.ts
import { describe, it } from 'vitest';
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { readMidi } from '../../src/engine/midifile';
import { byVoice, cellsFromMidi } from '../../src/engine/midiimport';
import { bare } from '../../src/engine/fold/score';
import { keyOfNotes, sameKey, truthOf, voiceAgreement } from './truth';
import { isArithmetic, pathCost, pathsOf } from './higher';
import { heardFold } from './heard';

const log = (t: string) => appendFileSync(process.env.BENCH!, t + '\n');

interface Row {
  set: string;
  key: string;
  notes: number;
  flat: number;
  folded: number;
  taken: boolean;
  keyOk: boolean | null;
  voices: number;
  clean: boolean;
  byVoice: number | null;
  found: number;
  agree: { precision: number; recall: number } | null;
  paths: number;
  arithmetic: number;
  pathChars: number;
  pathSaves: number;
  heard: ReturnType<typeof heardFold>;
  ms: number;
}

describe.runIf(process.env.BENCH)('the disassembler bench', () => {
  it('measures the MIDI library', () => {
    const only = process.env.ONLY?.split(',');
    const files = readdirSync('midi')
      .filter((s) => !process.env.SET || s === process.env.SET)
      .flatMap((set) => (JSON.parse(readFileSync(`midi/${set}/index.json`, 'utf8')) as { key: string; title: string; tonality?: string }[]).map((m) => ({ set, ...m })))
      .filter((m) => !only || only.some((o) => m.key.includes(o)));
    const rows: Row[] = [];
    for (const m of files) {
      const smf = readMidi(new Uint8Array(readFileSync(`midi/${m.set}/${m.key}.mid`)));
      const flat = cellsFromMidi(smf, m.title);
      const t0 = performance.now();
      const made = cellsFromMidi(smf, m.title, { shorten: true });
      const ms = performance.now() - t0;
      const found = keyOfNotes(smf);
      const truthPath = `midi/${m.set}/voices/${m.key}.mid`;
      const truth = existsSync(truthPath) ? truthOf(readMidi(new Uint8Array(readFileSync(truthPath)))) : null;
      // (the same notes a line a voice: only where the voices are clean, a voice a track for the whole piece)
      const written = truth?.clean ? bare(cellsFromMidi(truth.smf, m.title, { shorten: true, split: 'tracks' }).source) : null;
      const paths = pathsOf(made.source);
      const apart = byVoice(smf);
      rows.push({
        set: m.set,
        key: m.key,
        notes: flat.notes,
        flat: bare(flat.source),
        folded: bare(made.source),
        taken: made.folded,
        keyOk: m.tonality && found ? sameKey(found, m.tonality) : null,
        voices: truth?.voices ?? 0,
        clean: truth?.clean ?? false,
        byVoice: written,
        found: apart?.tracks.length ?? 0,
        agree: apart && truth?.clean ? voiceAgreement(apart, truth.smf) : null,
        paths: paths.length,
        arithmetic: paths.filter(isArithmetic).length,
        pathChars: paths.reduce((a, p) => a + p.chars, 0),
        pathSaves: paths.reduce((a, p) => a + Math.max(0, p.chars - pathCost(p)), 0),
        heard: process.env.HEARD ? heardFold(made.source) : null,
        ms,
      });
    }
    // (the mean over the files the fold's phrases could be scored on)
    const heardMean = (rs: Row[]) => {
      const h = rs.flatMap((r) => (r.heard ? [r.heard] : []));
      if (!h.length) return '';
      const mean = (f: (x: (typeof h)[number]) => number) => Math.round((100 * h.reduce((a, x) => a + f(x), 0)) / h.length);
      return `${mean((x) => x.precision)} / ${mean((x) => x.recall)} (${mean((x) => x.chance)}), ${h.length} files`;
    };
    const agreeMean = (rs: Row[]) => {
      const a = rs.flatMap((r) => (r.agree ? [r.agree] : []));
      return a.length
        ? `${Math.round((100 * a.reduce((x, y) => x + y.precision, 0)) / a.length)} / ${Math.round((100 * a.reduce((x, y) => x + y.recall, 0)) / a.length)} (${a.length})`
        : '';
    };
    const pct = (a: number, b: number) => `${((100 * a) / b).toFixed(1)} %`;
    log(`# The disassembler bench (${new Date().toISOString().slice(0, 10)})\n`);
    log('| set | file | notes | flat | folded | taken | key | voices | found (P / R) | by voice | paths | heard P / R (chance) | ms |');
    log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of rows)
      log(
        `| ${r.set} | ${r.key} | ${r.notes} | ${r.flat} | ${r.folded} (${pct(r.folded, r.flat)}) | ${r.taken ? 'yes' : 'no'} | ${r.keyOk === null ? '' : r.keyOk ? 'ok' : 'no'} | ${r.voices}${r.clean ? '' : ' (not clean)'} | ${r.found ? `${r.found}${r.agree ? ` (${Math.round(100 * r.agree.precision)} / ${Math.round(100 * r.agree.recall)})` : ''}` : ''} | ${r.byVoice === null ? '' : `${r.byVoice} (${pct(r.byVoice, r.folded)} of folded)`} | ${r.paths ? `${r.paths} (${r.arithmetic} arithmetic): ${r.pathChars} chars, −${r.pathSaves}` : ''} | ${r.heard ? `${Math.round(100 * r.heard.precision)} / ${Math.round(100 * r.heard.recall)} (${Math.round(100 * r.heard.chance)})` : ''} | ${Math.round(r.ms)} |`,
      );
    // the sums, a set at a time and over all
    log(
      '\n| set | files | notes | flat | folded | taken | keys right | voices found P / R | clean voices: folded by hand | by voice | paths | path chars | a path would save | heard P / R (chance) | fold s |',
    );
    log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    const sets = [...new Set(rows.map((r) => r.set)), 'all'];
    for (const s of sets) {
      const rs = rows.filter((r) => s === 'all' || r.set === s);
      const sum = (f: (r: Row) => number) => rs.reduce((a, r) => a + f(r), 0);
      const keyed = rs.filter((r) => r.keyOk !== null);
      const clean = rs.filter((r) => r.byVoice !== null);
      log(
        `| ${s} | ${rs.length} | ${sum((r) => r.notes)} | ${sum((r) => r.flat)} | ${sum((r) => r.folded)} (${pct(
          sum((r) => r.folded),
          sum((r) => r.flat),
        )}) | ${rs.filter((r) => r.taken).length} | ${keyed.filter((r) => r.keyOk).length} of ${keyed.length} | ${agreeMean(rs)} | ${clean.reduce((a, r) => a + r.folded, 0)} (${clean.length}) | ${clean.reduce(
          (a, r) => a + r.byVoice!,
          0,
        )} | ${sum((r) => r.paths)} (${sum((r) => r.arithmetic)} arithmetic) | ${sum((r) => r.pathChars)} | ${sum((r) => r.pathSaves)} | ${heardMean(rs)} | ${(sum((r) => r.ms) / 1000).toFixed(1)} |`,
      );
    }
  }, 1_800_000);
});

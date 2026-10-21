import { secondsAt } from "./midifile.js";
import { fold, printFolded } from "./fold/index.js";
import { storyOf } from "./fold/story.js";
import { useOrder } from "./fold/print.js";
import { bestKey, inDegrees, keyName, scaleText } from "./fold/degrees.js";
import { cutLines, keyAreas } from "./fold/sections.js";
import { voicesOf } from "./fold/voices.js";
import { compileSource } from "./compile.js";
import { MAX_REPS } from "./parser/scanner.js";
import { codeShifts } from "./program.js";
import { eventsBetween, plan } from "./realize.js";
import { GM_KIT, gmDrumNote, kitNotes } from "./midi.js";
import { INSTRUMENT_FRAGMENTS } from "../repository/instruments.js";
const DIVISIONS = [1, 2, 3, 4, 6, 8, 12, 16];
const ON_GRID = 0.995;
const DRUM_OF = Object.fromEntries(GM_KIT.map((d) => [d.note, d.name]));
const DRUMS = Object.fromEntries(INSTRUMENT_FRAGMENTS.find((f) => f.id === 'gm kit')
    .text.split('\n')
    .flatMap((line) => {
    const m = /^&(\w+) (.*)$/.exec(line);
    return m ? [[m[1], m[2]]] : [];
}));
const TUNED = 's=sine env=&(map=adsr 0 .3 0 .05)';
const NOISE = 's=white hpf=6000 env=&(map=adsr 0 .1 0 .05)';
function kitOf(name, notes) {
    const words = (name ?? '').trim().split(/\s+/);
    const members = [];
    for (const w of words) {
        const m = /^([A-Za-z][A-Za-z0-9]*)(?:\(([A-G][#b]?-?\d|\d+(?:\.\d+)?)\))?$/.exec(w);
        if (!m)
            return null;
        members.push({ member: m[1], pitch: m[2] ?? null });
    }
    const keys = kitNotes(members.map((m) => m.member));
    const out = new Map();
    for (const { member, pitch } of members) {
        const key = keys.get(member);
        if (key === undefined)
            continue;
        const gm = gmDrumNote(member);
        const own = gm === null ? undefined : DRUMS[DRUM_OF[gm] ?? ''];
        const sound = own ? own.replace(/ ?loop=\S+/, '') : pitch ? TUNED : NOISE;
        out.set(key, { member, sound: pitch ? sound.replace(/^(s=\S+)/, `$1 loop=${pitch}`) : sound });
    }
    return notes.every((n) => out.has(n.key)) ? out : null;
}
const TAKEN = new Set(['out', 'piece', 'tempo', ...Object.keys(DRUMS)]);
const short = (x, digits = 5) => String(Number(x.toPrecision(digits)));
function nameOf(raw, fallback) {
    const words = (raw ?? '')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean);
    let name = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w[0].toLowerCase() + w.slice(1))).join('');
    if (!name || !/^[A-Za-z]/.test(name))
        name = fallback;
    return name.slice(0, 24);
}
function gridOf(ppq, starts) {
    const off = (step) => {
        const tol = Math.min(Math.max(1, ppq / 96), step / 8);
        return starts.filter((t) => Math.abs(t - Math.round(t / step) * step) > tol).length;
    };
    for (const d of DIVISIONS) {
        const step = ppq / d;
        const moved = off(step);
        if (starts.length - moved >= ON_GRID * starts.length)
            return { step, perQuarter: d, moved };
    }
    return { step: ppq / 4, perQuarter: 4, moved: off(ppq / 4) };
}
function braidOf(chords, length) {
    const out = [];
    let now = 0;
    const rest = (n) => {
        for (; n > MAX_REPS; n -= MAX_REPS)
            out.push(`~@${MAX_REPS}`);
        if (n > 0)
            out.push(n === 1 ? '~' : `~@${n}`);
    };
    for (const c of chords) {
        rest(c.at - now);
        const v = c.values.length === 1 ? c.values[0] : `[${c.values.join(',')}]`;
        out.push(c.dur === 1 ? v : `${v}@${c.dur}`);
        now = c.at + c.dur;
    }
    rest(length - now);
    return out.join(' ');
}
export function cellsFromMidi(smf, title, { free = true, shorten = false, credit = [], pitches = 'auto', split = 'auto', watch, story = false, } = {}) {
    if (shorten && split !== 'tracks') {
        const apart = byVoice(smf);
        const told = (how) => watch && ((source, stage) => stage.tool !== 'done' && watch(source, how ? { ...stage, tool: `${stage.tool}, ${how}` } : stage));
        const options = { free, shorten, credit, pitches, story, split: 'tracks' };
        const inTracks = split === 'voices' && apart ? null : cellsFromMidi(smf, title, { ...options, watch: told('') });
        const inVoices = apart && cellsFromMidi(apart, title, { ...options, watch: told('in voices') });
        const taken = inVoices?.folded && (!inTracks || !inTracks.folded || inVoices.source.length < inTracks.source.length) ? inVoices : inTracks;
        watch?.(() => taken.source, { tool: 'done', round: 0 });
        return taken;
    }
    const parts = [];
    smf.tracks.forEach((t, i) => {
        const channels = [...new Set(t.notes.map((n) => n.channel))].sort((a, b) => a - b);
        for (const c of channels) {
            const base = nameOf(t.name, `track${i + 1}`);
            const notes = t.notes.filter((n) => n.channel === c);
            const kit = c === 10 ? kitOf(t.name, notes) : null;
            const name = kit ? nameOf([...new Set([...kit.values()].map((k) => k.member))].join(' '), `track${i + 1}`) : base;
            parts.push({ name: channels.length > 1 ? `${name}Ch${c}` : name, drums: c === 10, notes, kit });
        }
    });
    const all = parts.flatMap((p) => p.notes);
    const { step, perQuarter, moved } = gridOf(smf.ppq, [...all.map((n) => n.tick)]);
    const at = (tick) => Math.round(tick / step);
    const length = Math.max(1, ...all.map((n) => Math.max(at(n.tick) + 1, at(n.end))));
    const lengths = Array.from({ length }, (_, k) => secondsAt(smf, (k + 1) * step) - secondsAt(smf, k * step));
    const counts = new Map();
    for (const l of lengths)
        counts.set(short(l, 6), (counts.get(short(l, 6)) ?? 0) + 1);
    const common = Number([...counts].sort((a, b) => b[1] - a[1])[0][0]);
    const weights = lengths.map((l) => short(l / common));
    const runs = [];
    for (let k = 0; k < length;) {
        let n = 1;
        while (k + n < length && weights[k + n] === weights[k])
            n++;
        runs.push(n === 1 ? weights[k] : `${weights[k]}!${n}`);
        k += n;
    }
    const total = lengths.reduce((a, b) => a + b, 0);
    const bpm = (60 * length) / (total * perQuarter);
    const unit = 4 * perQuarter;
    const pow2 = (x) => Number.isInteger(x) && Number.isInteger(Math.log2(x));
    const pulse = unit === 4 ? '' : pow2(unit) ? ` pulse=${unit}n` : pow2((2 * unit) / 3) ? ` pulse=${(2 * unit) / 3}t` : ` pulse=${unit}n`;
    const rate = free ? `free(${short(bpm, 6)}bpm, ${Math.floor(bpm * 0.6)}..${Math.ceil(bpm * 1.5)})` : `${short(bpm, 6)}bpm`;
    const tempo = `&tempo scan(${runs.join(' ')})${pulse} step=${rate} laps=1`;
    const taken = new Set(TAKEN);
    const unique = (name) => {
        let n = name;
        for (let i = 2; taken.has(n); i++)
            n = `${name}${i}`;
        taken.add(n);
        return n;
    };
    const lines = [];
    const mix = [];
    const voices = [];
    const drumsUsed = new Set();
    const members = new Map();
    const gmToo = parts.some((p) => p.drums && !p.kit);
    const memberVoice = (member, sound) => {
        for (const [name, def] of members)
            if (def === sound && name.replace(/\d+$/, '') === member)
                return name;
        let name = member;
        for (let i = 2; members.has(name) || (taken.has(name) && (gmToo || !(name in DRUMS))); i++)
            name = `${member}${i}`;
        taken.add(name);
        members.set(name, sound);
        return name;
    };
    const kits = parts.map((p) => (p.kit ? new Map([...p.kit].map(([key, k]) => [key, memberVoice(k.member, k.sound)])) : null));
    let dropped = 0;
    let count = 0;
    for (const [pi, p] of parts.entries()) {
        const layers = [];
        const kit = kits[pi];
        const legato = p.drums ? null : legatoOf(p.notes, smf);
        for (const n of legato?.notes ?? [...p.notes].sort((a, b) => a.tick - b.tick || a.key - b.key)) {
            const value = kit ? kit.get(n.key) : p.drums ? DRUM_OF[n.key] : String(n.key - 60);
            if (value === undefined) {
                dropped++;
                continue;
            }
            if (p.drums && !kit)
                drumsUsed.add(value);
            const s = at(n.tick);
            const dur = Math.max(1, at(n.end) - s);
            const token = p.drums ? `&${value}` : value;
            const layer = layers.find((l) => {
                const last = l[l.length - 1];
                return (last.at === s && last.dur === dur && !last.values.includes(token)) || last.at + last.dur <= s;
            });
            const last = layer?.[layer.length - 1];
            if (layer && last.at === s && last.dur === dur)
                layer[layer.length - 1] = { ...last, values: [...last.values, token] };
            else if (layer)
                layer.push({ at: s, dur, values: [token] });
            else
                layers.push([{ at: s, dur, values: [token] }]);
            count++;
        }
        if (!layers.length)
            continue;
        const voice = p.drums ? null : unique(`${p.name}Voice`);
        const names = layers.map(() => unique(p.name));
        layers.forEach((chords, i) => lines.push({ name: names[i], chords, length }));
        if (voice)
            voices.push(`&${voice} s=tri loop=C4${legato ? ` glide=${legato.glide}` : ''} env=&(map=adsr .005 .2 .6 .15)`);
        for (const n of names)
            mix.push(voice ? `&${n} * &${voice} * .25` : `&${n} * .4`);
    }
    const describing = new Map();
    const write = (body, how) => {
        const label = `Opened from a MIDI file: ${count} notes in ${lines.length} line${lines.length === 1 ? '' : 's'}, ${perQuarter} step${perQuarter === 1 ? '' : 's'} a quarter note, ${how}.`;
        const text = [
            ...(credit.length ? [...credit.map((l) => `# ${l}`), ''] : []),
            `# the file's tempo map: a step each ${perQuarter === 4 ? 'sixteenth' : `1/${perQuarter} of a quarter note`}; laps=1, so the piece ends`,
            tempo,
            '',
            ...body,
            '',
            ...voices,
            ...[...drumsUsed].sort().map((d) => `&${d} ${DRUMS[d]}`),
            ...[...members].map(([name, sound]) => `&${name} ${sound}`),
            `&out map=sample [${mix.join(', ')}]`,
            '',
        ].join('\n');
        describing.set(text, label);
        return text;
    };
    const flat = write([
        '# every note, a line a track (and one beside for notes that overlap); melodies as semitones from C4',
        ...lines.map((l) => `&${l.name} step=pulse ${braidOf(l.chords, l.length)}`),
    ], 'written out in full: Shorten folds it');
    let source = flat;
    let folded = false;
    let inKey = null;
    let told;
    if (shorten && lines.length) {
        const label = (tool, round, how) => (tool === 'done' ? 'folded' : round ? `${tool}, ${how}` : tool);
        const printed = (f, fixed) => {
            const { defs, lines: braids, scales } = printFolded(f, 'm', 'pulse', '^$', fixed);
            return write([
                '# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^$n: n semitones up',
                ...defs,
                '',
                '# every note, a line a track; melodies as semitones from C4',
                ...lines.map((l) => `&${l.name} step=pulse${scales.get(l.name) === 1 ? '' : `/${scales.get(l.name)}`} ${braids.get(l.name)}`),
            ], 'folded (engine/fold)');
        };
        const candidates = [];
        if (pitches === 'auto' || pitches === 'semitones') {
            const folds = fold(lines, watch && ((now, stage) => watch(() => printed(now()), { ...stage, tool: label(stage.tool, stage.round, 'in semitones') })));
            candidates.push({ source: printed(folds), key: null, from: lines, folded: folds, print: printed, how: 'Every note written out, as semitones from C4' });
        }
        const key = bestKey(lines);
        if (pitches !== 'semitones' && key && lines.some((l) => l.chords.some((c) => c.values.some((v) => !v.startsWith('&'))))) {
            const name = unique('key');
            const printedIn = (f, fixed) => {
                const { defs, lines: braids, scales } = printFolded(f, 'm', 'pulse', '^', fixed);
                return write([
                    `# the key: the lines read through it, a note its degree (0 the tonic; 6# the seventh raised a semitone)`,
                    `&${name} ${scaleText(key)}`,
                    '',
                    '# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^n: n degrees up',
                    ...defs,
                    '',
                    `# every note, a line a track; melodies as degrees of ${keyName(key)}`,
                    ...lines.map((l) => `&${l.name} step=pulse${scales.get(l.name) === 1 ? '' : `/${scales.get(l.name)}`}${l.chords.some((c) => c.values.some((v) => !v.startsWith('&'))) ? ` over=&${name}` : ''} ${braids.get(l.name)}`),
                ], `folded in degrees of ${keyName(key)} (engine/fold)`);
            };
            if (pitches === 'auto' || pitches === 'degrees') {
                const tune = inDegrees(lines, key);
                const folds = fold(tune, watch && ((now, stage) => watch(() => printedIn(now()), { ...stage, tool: label(stage.tool, stage.round, `in degrees of ${keyName(key)}`) })), {
                    degrees: true,
                });
                candidates.push({ source: printedIn(folds), key: keyName(key), from: tune, folded: folds, print: printedIn, how: `Every note written out, as degrees of ${keyName(key)}` });
            }
            const meter = smf.meters[0] ?? { num: 4, den: 4 };
            const bar = Math.max(1, Math.round((perQuarter * 4 * meter.num) / meter.den));
            const sections = pitches === 'auto' || pitches === 'sections' ? keyAreas(lines, bar) : [];
            if (sections.length > 1) {
                const parts = cutLines(lines, sections, bar);
                const tune = parts.map((p) => inDegrees([p.part], sections[p.section].key)[0]);
                const keys = [...new Set(sections.map((x) => scaleText(x.key)))];
                const keyNames = new Map(keys.map((k, i) => [k, unique(`key${i + 1}`)]));
                const partNames = new Map();
                const printedSections = (f, fixed) => {
                    const { defs, lines: braids, scales } = printFolded(f, 'm', 'pulse', '^', fixed);
                    const cells = new Map();
                    const sectionDefs = [];
                    const spliced = new Map(lines.map((l) => [l.name, []]));
                    for (const p of parts) {
                        const braid = braids.get(p.part.name);
                        const scale = scales.get(p.part.name) ?? 1;
                        const stretched = scale === 1 ? '' : `@${scale}`;
                        if (/^~(@\d+)?(!\d+)?$/.test(braid)) {
                            const steps = spliced.get(p.line);
                            const before = /^~(?:@(\d+))?$/.exec(steps[steps.length - 1] ?? '');
                            const n = p.part.length + (before ? Number(before[1] ?? 1) : 0);
                            if (before)
                                steps.pop();
                            steps.push(n === 1 ? '~' : `~@${n}`);
                            continue;
                        }
                        const over = keyNames.get(scaleText(sections[p.section].key));
                        const id = `${over} ${braid}`;
                        let name = cells.get(id);
                        if (!name) {
                            name = partNames.get(`${p.line}§${p.section}`) ?? unique(`${p.line}${String.fromCharCode(65 + (p.section % 26))}`);
                            partNames.set(`${p.line}§${p.section}`, name);
                            cells.set(id, name);
                            sectionDefs.push(`&${name} over=&${over} ${braid}`);
                        }
                        spliced.get(p.line).push(`&${name}${stretched}`);
                    }
                    return write([
                        `# the keys: a section a key, cut where the key changes; a note its degree (0 the tonic; 6# the seventh raised a semitone)`,
                        ...keys.map((k) => `&${keyNames.get(k)} ${k}`),
                        '',
                        '# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^n: n degrees up',
                        ...defs,
                        '',
                        `# the sections, a cell each part of a line, read through its section's key: ${sections.map((x) => keyName(x.key)).join(', ')}`,
                        ...sectionDefs,
                        '',
                        '# every note, a line a track: its sections in order',
                        ...lines.map((l) => `&${l.name} step=pulse ${runsOf(spliced.get(l.name))}`),
                    ], `folded in ${sections.length} sections by key (engine/fold)`);
                };
                const sectioned = fold(tune, watch && ((now, stage) => watch(() => printedSections(now()), { ...stage, tool: label(stage.tool, stage.round, `in ${sections.length} sections by key`) })), { degrees: true });
                candidates.push({
                    allowance: SECTIONS,
                    source: printedSections(sectioned),
                    key: `${sections.length} sections by key (${sections.map((x) => keyName(x.key)).join(', ')})`,
                    from: tune,
                    folded: sectioned,
                    print: printedSections,
                    how: `Every note written out, in ${sections.length} sections by key`,
                });
            }
        }
        const tell = (c) => {
            const fixed = new Map(useOrder(c.folded).map((k, i) => [k, `m${i + 1}`]));
            return storyOf(c.from, c.folded).map((fr, i) => {
                const r = fr.came === null ? null : c.folded.rules.get(fr.came);
                const places = `in ${fr.uses} place${fr.uses === 1 ? '' : 's'}`;
                const says = !r
                    ? i === 0
                        ? c.how
                        : 'The lines on their own clocks, figures read over chords'
                    : r.of
                        ? `&${fixed.get(fr.came)} · a copy of &${fixed.get(r.of)}, changed · ${places}`
                        : `&${fixed.get(fr.came)} · ${r.kids.length} steps · ${places}`;
                return { source: c.print(fr.folded, fixed), says };
            });
        };
        for (const c of candidates.sort((a, b) => a.source.length / (a.allowance ?? 1) - b.source.length / (b.allowance ?? 1)))
            if (c.source.length < flat.length && sameNotes(flat, c.source)) {
                [source, folded, inKey] = [c.source, true, c.key];
                if (story)
                    told = tell(c);
                break;
            }
        const taken = source;
        watch?.(() => taken, { tool: 'done', round: 0 });
    }
    return {
        source,
        frontmatter: { title, tags: ['midi'], description: describing.get(source) },
        notes: count,
        lines: lines.length,
        perQuarter,
        moved,
        dropped,
        folded,
        inKey,
        ...(story ? { story: told ?? [{ source, says: 'Every note written out' }] } : {}),
    };
}
function legatoOf(notes, smf) {
    const ns = [...notes].sort((a, b) => a.tick - b.tick || a.key - b.key);
    if (ns.some((n, i) => i > 0 && n.tick === ns[i - 1].tick))
        return null;
    const sec = (tick) => secondsAt(smf, tick);
    const overlaps = ns.flatMap((n, i) => {
        const next = ns[i + 1];
        if (!next || n.end <= next.tick)
            return [];
        const after = ns[i + 2];
        const room = (after && after.tick < next.end ? sec(after.tick) : sec(next.end)) - sec(next.tick);
        return [{ i, by: sec(n.end) - sec(next.tick), room }];
    });
    if (overlaps.length < 2)
        return null;
    const slide = Math.max(...overlaps.map((o) => o.by));
    if (!overlaps.every((o) => Math.abs(o.by - Math.min(slide, o.room)) <= LEGATO_EPS))
        return null;
    const at = new Set(overlaps.map((x) => x.i));
    return { notes: ns.map((n, i) => (at.has(i) ? { ...n, end: ns[i + 1].tick } : n)), glide: Math.round(slide * 1000) / 1000 };
}
const LEGATO_EPS = 0.004;
const VOICE_NAMES = {
    2: ['upper', 'lower'],
    3: ['upper', 'middle', 'lower'],
    4: ['soprano', 'alto', 'tenor', 'bass'],
};
const MOST_VOICES = 8;
export function byVoice(smf) {
    const melodic = smf.tracks.map((t) => t.notes.filter((n) => n.channel !== 10)).filter((ns) => ns.length);
    const programs = new Set(smf.tracks.filter((t) => t.notes.some((n) => n.channel !== 10)).map((t) => t.programs[0]?.program ?? 0));
    if (programs.size > 1 || melodic.some((ns) => legatoOf(ns, smf)))
        return null;
    const notes = melodic.flat().sort((a, b) => a.tick - b.tick || b.key - a.key);
    const { voice, count } = voicesOf(notes.map((n) => ({ start: n.tick, end: n.end, key: n.key })));
    if (count <= melodic.length || count > MOST_VOICES)
        return null;
    const names = VOICE_NAMES[count] ?? Array.from({ length: count }, (_, v) => `voice${v + 1}`);
    const channel = notes[0].channel;
    const voices = names.map((name, v) => ({ name, notes: notes.filter((_, i) => voice[i] === v).map((n) => ({ ...n, channel })), bends: [], programs: [] }));
    const drums = smf.tracks.flatMap((t) => (t.notes.some((n) => n.channel === 10) ? [{ ...t, notes: t.notes.filter((n) => n.channel === 10) }] : []));
    return { ...smf, tracks: [...voices.filter((v) => v.notes.length), ...drums] };
}
const SECTIONS = 1.15;
function runsOf(steps) {
    const out = [];
    for (let i = 0; i < steps.length;) {
        let n = 1;
        while (i + n < steps.length && steps[i + n] === steps[i])
            n++;
        out.push(n === 1 ? steps[i] : `${steps[i]}!${n}`);
        i += n;
    }
    return out.join(' ');
}
function sameNotes(a, b) {
    const notes = (s) => {
        const r = compileSource(s);
        if (!r.ok)
            return null;
        const p = plan(r, codeShifts(r), r.off);
        return eventsBetween(p, 0, p.end)
            .map((e) => `${e.at.toFixed(3)} ${e.dur.toFixed(3)} ${e.voice} ${e.freq.toFixed(2)}`)
            .sort();
    };
    const [x, y] = [notes(a), notes(b)];
    return !!x && !!y && x.length === y.length && x.every((n, i) => n === y[i]);
}

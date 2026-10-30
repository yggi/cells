import { refLabel } from "../ast.js";
import { MAIN_KEY, MAX_SPLICE_DEPTH, ROOT } from "../program.js";
import { SCALE_KEY } from "../parser/generators.js";
import { VOICE_PARAMS } from "../attributes.js";
import { IMPLICIT, isRootDecl, tableOf } from "./tables.js";
import { leaves } from "../subseq.js";
import { overdub } from "../parser/base.js";
import { diatonicSteps, mod } from "../../theory/modes.js";
export function declare(ctx) {
    const { parsed, error, unknownCell } = ctx;
    const decls = new Map();
    const implicit = new Set();
    for (const c of parsed.cells) {
        if (decls.has(c.name))
            error(`&${c.name} is already defined on line ${decls.get(c.name).span.line}`, c.span);
        else
            decls.set(c.name, c);
    }
    const mainKey = mainKeyOf(ctx, decls);
    tonics(ctx, decls);
    modes(ctx, decls);
    swings(ctx, decls);
    const sections = sectionTables(decls, error);
    const stacks = gates(decls, implicit, error);
    mixSelectors(ctx, decls);
    const implicitRoot = !decls.has(ROOT);
    for (const name of decls.keys())
        if (name.startsWith('key:') || name.startsWith('scale:'))
            implicit.add(name);
    const grooves = voiceGrooves(decls);
    if (grooves) {
        decls.set(VOICE_KIT, {
            name: VOICE_KIT,
            span: grooves.voices[0].span,
            over: null,
            shift: null,
            off: false,
            step: null,
            map: null,
            stride: null,
            cycle: null,
            params: {},
            paramSpans: {},
            braid: {
                kind: 'list',
                tokens: grooves.voices.map((v) => ({ atom: { kind: 'ref', name: v.name, pick: null, shift: 0 }, repeat: 1, subdivide: 1, elongate: 1, span: v.span })),
            },
        });
        for (const [name, tokens] of grooves.cells)
            decls.set(name, { ...decls.get(name), over: { name: VOICE_KIT, pick: null, shift: 0, span: decls.get(name).span }, braid: { kind: 'list', tokens } });
        implicit.add(VOICE_KIT);
    }
    if (implicitRoot)
        decls.set(ROOT, {
            name: ROOT,
            span: IMPLICIT,
            over: null,
            shift: null,
            off: false,
            step: null,
            map: { kind: 'edo', period: 2, span: IMPLICIT },
            stride: null,
            cycle: 12,
            params: {},
            paramSpans: {},
            braid: { kind: 'blank' },
        });
    const rootDecl = decls.get(ROOT);
    if (!isRootDecl(rootDecl))
        error(`&${ROOT} is the default grid: give it only cycle= and shift=`, rootDecl.span);
    const overOk = new Map();
    const checkOver = (name, seen) => {
        if (overOk.has(name))
            return overOk.get(name);
        const d = decls.get(name);
        const o = tableOf(d);
        let ok = true;
        if (o !== null) {
            if (!decls.has(o)) {
                unknownCell(o, d.over.span);
                ok = false;
            }
            else if (seen.includes(o)) {
                error(`over= loops: ${[...seen.slice(seen.indexOf(o)), name, o].map((n) => '&' + n).join(' → ')}`, d.over?.span ?? d.span);
                ok = false;
            }
            else
                ok = checkOver(o, [...seen, name]);
        }
        overOk.set(name, ok);
        return ok;
    };
    for (const name of decls.keys())
        checkOver(name, []);
    return { decls, implicit, implicitRoot, overOk, sections, stacks, ...(mainKey ? { mainKey } : {}) };
}
function tonics(ctx, decls) {
    for (const [name, d] of decls) {
        if (!d.tonic)
            continue;
        const t = decls.get(d.tonic.name);
        if (!t) {
            ctx.unknownCell(d.tonic.name, d.tonic.span);
            continue;
        }
        const tokens = t.braid.kind === 'list' ? t.braid.tokens : [];
        const notes = tokens.every((k) => k.subdivide === 1 && k.atom.kind === 'note' && Number.isInteger(k.atom.value)) ? tokens : [];
        const first = notes[0]?.atom;
        if (first?.kind !== 'note' || (!t.step && (notes.length !== 1 || notes[0].repeat !== 1))) {
            ctx.error(t.step
                ? `&${t.name} holds a key's tonic (scale(…, &${t.name})), stepped: write a note a step, a name or a pitch class (&${t.name} step=1m/8 D F)`
                : `&${t.name} holds a key's tonic (scale(…, &${t.name})): write one note, a name or a pitch class (&${t.name} D, &${t.name} 2), or step it (&${t.name} step=1m/8 D F)`, t.span);
            continue;
        }
        decls.set(name, { ...d, shift: mod(first.value + first.alter, 12) });
    }
}
function modes(ctx, decls) {
    for (const [name, d] of decls) {
        if (d.braid.kind !== 'scan' || !d.braid.mode)
            continue;
        const m = decls.get(d.braid.mode.name);
        if (!m) {
            ctx.unknownCell(d.braid.mode.name, d.braid.mode.span);
            continue;
        }
        const tokens = m.braid.kind === 'list' ? m.braid.tokens : [];
        const atom = tokens.length === 1 && tokens[0].repeat === 1 && tokens[0].subdivide === 1 ? tokens[0].atom : null;
        const phase = atom?.kind === 'note' && !atom.pitched && atom.alter === 0 ? atom.value : null;
        if (m.step || phase === null || !Number.isInteger(phase) || phase < 0 || phase > 6) {
            ctx.error(m.step
                ? `&${m.name} holds a scale's mode (scale(&${m.name}, …)): a stepped mode is not yet a form; write one (&${m.name} dorian)`
                : `&${m.name} holds a scale's mode (scale(&${m.name}, …)): write one, a name or its phase from the darkest (&${m.name} major, &${m.name} dorian, &${m.name} 3)`, m.span);
            continue;
        }
        decls.set(name, { ...d, braid: { ...d.braid, steps: diatonicSteps(phase) } });
    }
}
function swings(ctx, decls) {
    for (const [name, d] of decls) {
        const pc = d.paramCells?.swing;
        if (!pc)
            continue;
        const [ref] = pc.factors;
        const t = ref && decls.get(ref.name);
        const { swing: _, ...cells } = d.paramCells;
        const unswung = () => decls.set(name, { ...d, paramCells: cells });
        if (pc.factors.length !== 1 || pc.range || ref.pick || ref.shift) {
            ctx.error(`swing= reads one cell, a swing alone: swing=&swing, with &swing swing=8n:2/3`, pc.span);
            unswung();
            continue;
        }
        if (!t) {
            ctx.unknownCell(ref.name, ref.span);
            unswung();
            continue;
        }
        const alone = t.braid.kind === 'blank' && !t.step && !t.over && !t.map && typeof t.params.swing === 'number' && Object.keys(t.params).every((k) => k === 'swing' || k === 'label');
        if (!alone) {
            ctx.error(`&${t.name} holds a meter's swing (swing=&${t.name}): write a swing alone, &${t.name} swing=8n:2/3`, t.span);
            unswung();
            continue;
        }
        decls.set(name, {
            ...d,
            params: { ...d.params, swing: t.params.swing },
            paramSpans: { ...d.paramSpans, swing: pc.span },
            paramCells: cells,
            ...(t.swing ? { swing: t.swing } : {}),
            swingFrom: ref,
        });
    }
}
function mainKeyOf(ctx, decls) {
    const main = [...decls.values()].find((d) => !d.lambda && !d.base && d.over?.name.startsWith(SCALE_KEY))?.name ?? null;
    for (const d of [...decls.values()]) {
        if (d.over?.name !== MAIN_KEY)
            continue;
        if (main) {
            ctx.warn(`over=key is the old way: name the key, over=&${main}`, d.over.span);
            decls.set(d.name, { ...d, over: { ...d.over, name: main } });
        }
        else {
            ctx.error(`over=key is the old way, and the piece has no main key (the first scale(…) in the text) for it to read: name a key, over=&key, and write it (&key scale(major, C))`, d.over.span);
            ctx.broken.add(MAIN_KEY);
        }
    }
    return main;
}
export const VOICE_KIT = 'kit:voices';
export function voiceGrooves(decls) {
    const sounds = (d) => Object.keys(d?.params ?? {}).some((k) => VOICE_PARAMS.has(k));
    const isVoiceDecl = (n) => sounds(decls.get(n));
    const plain = (r) => !r.pick && !r.shift && !r.transpose && !r.degree && !r.values;
    const asTable = new Set([...decls.values()].flatMap((d) => (d.over ? [d.over.name] : [])));
    const shape = (d, seen) => {
        if (!d || d.over || d.map || sounds(d) || d.braid.kind !== 'list' || d.braid.tokens.length === 0 || seen.length > MAX_SPLICE_DEPTH || seen.includes(d.name))
            return false;
        let voiced = false;
        for (const a of d.braid.tokens.flatMap((t) => leaves(t.atom))) {
            if (a.kind === 'rest')
                continue;
            if (a.kind === 'ref' && isVoiceDecl(a.name) && plain(a))
                voiced = true;
            else if (a.kind === 'ref' && !a.shift && !a.transpose && !a.values && motif(a.name, [...seen, d.name]))
                voiced = true;
            else if (a.kind === 'mix' && a.exprs.every((e) => e.k === 'ref' && isVoiceDecl(e.ref.name) && plain(e.ref)))
                voiced = true;
            else
                return false;
        }
        return voiced;
    };
    const motifs = new Map();
    const motif = (name, seen) => {
        if (motifs.has(name))
            return motifs.get(name);
        const d = decls.get(name);
        const mix = d?.braid.kind === 'list' && d.braid.tokens.length === 1 && d.braid.tokens[0].atom.kind === 'mix';
        const is = !!d && !d.step && !mix && !asTable.has(name) && shape(d, seen);
        if (seen.length === 0 || is)
            motifs.set(name, is);
        return is;
    };
    const grooves = [...decls.values()].filter((d) => d.step && shape(d, []));
    if (!grooves.length)
        return null;
    const voices = [];
    const index = (name, span) => {
        const i = voices.findIndex((v) => v.name === name);
        return i >= 0 ? i : voices.push({ name, pick: null, shift: 0, span }) - 1;
    };
    const cells = new Map();
    const rewrite = (d) => {
        if (cells.has(d.name) || d.braid.kind !== 'list')
            return;
        cells.set(d.name, []);
        const step = (t) => {
            const a = t.atom;
            let atom = a;
            if (a.kind === 'ref' && isVoiceDecl(a.name))
                atom = { kind: 'note', value: index(a.name, t.span), alter: 0 };
            else if (a.kind === 'ref')
                rewrite(decls.get(a.name));
            else if (a.kind === 'mix') {
                const refs = a.exprs;
                const notes = refs.map((e) => index(e.ref.name, t.span));
                const levels = refs.some((e) => e.level !== undefined) ? refs.map((e) => e.level ?? 1) : undefined;
                atom = { kind: 'chord', notes, alters: notes.map(() => 0), ...(levels ? { levels } : {}) };
            }
            else if (a.kind === 'seq')
                atom = { ...a, layers: a.layers.map((l) => l.map(step)) };
            return { ...t, atom };
        };
        const tokens = d.braid.tokens.map(step);
        cells.set(d.name, tokens);
    };
    for (const d of [...decls.values()])
        if (grooves.includes(d))
            rewrite(d);
    return { voices, cells };
}
function gates(decls, implicit, error) {
    const stacks = new Set();
    const ref = (name, span) => ({ k: 'ref', ref: { name, pick: null, shift: 0, span } });
    const grooves = voiceGrooves(decls);
    for (const d of [...decls.values()]) {
        const p = d.params;
        const tokens = d.braid.kind === 'list' ? d.braid.tokens : [];
        const old = typeof p.trigger === 'string';
        const notes = old ? p.trigger : typeof p.play === 'string' && tokens.length ? p.play : null;
        if (notes === null)
            continue;
        const port = old ? 'trigger' : 'play';
        const notesSpan = d.paramSpans[port] ?? d.span;
        const move = old ? undefined : d.playMove;
        const plain = (a) => a.kind === 'ref' && !a.pick && !a.shift && !a.transpose && !a.values;
        const chord = tokens.length === 1 && tokens[0].atom.kind === 'mix' && tokens[0].atom.exprs.every((e) => e.k === 'ref' && !e.ref.pick) ? tokens[0].atom.exprs : null;
        const bare = tokens.every((t) => plain(t.atom) && t.repeat === 1 && t.subdivide === 1 && t.elongate === 1);
        if (!chord && !bare) {
            error(`&${d.name} is a gate (${port}=): its braid is what it plays: a voice, a kit, a chord of voices [&lead, &bell], or voices to pick from (&${d.name} ${port}=&${notes} &lead)`, d.span);
            continue;
        }
        const named = chord
            ? chord.flatMap((e) => (e.k === 'ref' ? [{ name: e.ref.name, span: e.ref.span }] : []))
            : tokens.flatMap((t) => (t.atom.kind === 'ref' ? [{ name: t.atom.name, span: t.span }] : []));
        let played = named;
        if (!chord && !old && named.length > 1) {
            const kit = `${d.name}:kit`;
            decls.set(kit, {
                name: kit,
                span: d.span,
                over: null,
                shift: null,
                off: false,
                step: null,
                map: null,
                stride: null,
                cycle: null,
                params: {},
                paramSpans: {},
                braid: d.braid,
            });
            implicit.add(kit);
            played = [{ name: kit, span: d.span }];
        }
        const levels = old
            ? ['velocity', 'gate'].flatMap((k) => (typeof p[k] === 'string' ? [{ name: p[k], port: k, span: d.paramSpans[k] ?? d.span }] : []))
            : (d.paramCells?.level?.factors ?? []).map((f) => ({ name: f.name, port: 'level', span: f.span }));
        const gainOf = old ? p.gain : p.level;
        const gain = typeof gainOf === 'number' ? gainOf : 1;
        const gainSpan = d.paramSpans[old ? 'gain' : 'level'] ?? d.span;
        const moved = (line, span) => {
            const of = decls.get(line);
            if (!move || !of)
                return line;
            const plays = `${line}${refLabel({ pick: null, shift: 0, ...move })}`;
            const stub = {
                name: plays,
                span: d.span,
                over: null,
                shift: null,
                off: false,
                step: null,
                map: null,
                stride: null,
                cycle: null,
                params: {},
                paramSpans: {},
                braid: { kind: 'blank' },
            };
            const splice = {
                kind: 'ref',
                name: line,
                pick: null,
                shift: 0,
                ...(move.transpose ? { transpose: move.transpose } : {}),
                ...(move.degree ? { values: { mul: 1, add: move.degree } } : {}),
            };
            if (!decls.has(plays))
                decls.set(plays, {
                    ...overdub(stub, of, { name: line, pick: null, shift: 0, span }, (m) => error(m, span)),
                    shift: null,
                    laps: of.laps ?? null,
                    braid: { kind: 'list', tokens: [{ atom: splice, repeat: 1, subdivide: 1, elongate: 1, span }] },
                });
            implicit.add(plays);
            return plays;
        };
        const stack = stackOf(decls, decls.get(notes), error);
        if (stack)
            stacks.add(notes);
        const lines = (stack ?? [{ line: { name: notes, pick: null, shift: 0, span: notesSpan }, by: [] }]).map(({ line, by }) => ({
            line: line.name,
            plays: moved(line.name, line.span),
            ref: line,
            by,
            span: line.span,
        }));
        const grooveVoices = (line) => (grooves?.cells.has(line) ? voicesIn(decls, line) : null);
        const exprs = lines.flatMap((l) => {
            const of = decls.get(l.line);
            const voices = grooveVoices(l.line);
            return played.map((r) => {
                const members = kitMembers(decls.get(r.name));
                const missing = voices && members ? voices.filter((v) => !members.includes(v)) : [];
                if (missing.length)
                    error(`&${l.line} plays ${missing.map((v) => '&' + v).join(', ')}, which &${r.name} doesn't hold: a kit's lines play its own voices`, l.span);
                return {
                    k: 'prod',
                    span: r.span,
                    factors: [
                        { k: 'ref', ref: { ...l.ref, name: l.plays } },
                        ...l.by,
                        ...levels.map((x) => ref(x.name, x.span)),
                        ...(of?.over?.name === r.name || (voices && members) ? [] : [ref(r.name, r.span)]),
                        ...(gain !== 1 ? [{ k: 'num', value: gain, span: gainSpan }] : []),
                    ],
                };
            });
        });
        const params = Object.fromEntries(Object.entries(p).filter(([k]) => !['play', 'trigger', 'velocity', 'gate', 'gain', 'level'].includes(k)));
        const paramCells = Object.fromEntries(Object.entries(d.paramCells ?? {}).filter(([k]) => k !== 'level'));
        decls.set(d.name, {
            ...d,
            params,
            paramCells,
            gate: {
                notes,
                ...(move ? { move } : {}),
                plays: lines[0].plays,
                ...(stack ? { lines: lines.map(({ line, plays }) => ({ line, plays })) } : {}),
                port,
                levels: levels.map(({ name, port }) => ({ name, port })),
                gain,
                receivers: named.map((r) => r.name),
            },
            braid: { kind: 'list', tokens: [{ atom: { kind: 'mix', exprs, gate: d.name }, repeat: 1, subdivide: 1, elongate: 1, span: d.span }] },
        });
    }
    const playedBy = new Map([...decls.values()].flatMap((d) => (d.gate?.lines ? [[d.gate.notes, d.name]] : [])));
    const refsIn = (e) => (e.k === 'ref' ? [e.ref] : e.k === 'sum' ? e.items.flatMap((x) => refsIn(x.e)) : e.k === 'prod' ? e.factors.flatMap(refsIn) : []);
    for (const d of decls.values()) {
        if (d.gate || d.braid.kind !== 'list')
            continue;
        for (const a of d.braid.tokens.flatMap((t) => leaves(t.atom))) {
            const refs = a.kind === 'ref' ? [{ name: a.name, span: d.span }] : a.kind === 'mix' ? a.exprs.flatMap(refsIn) : [];
            for (const r of refs)
                if (playedBy.has(r.name))
                    error(`&${r.name} is the part &${playedBy.get(r.name)} plays, a stack of lines and no sound: mix or send &${playedBy.get(r.name)}`, r.span);
        }
    }
    return stacks;
}
function stackOf(decls, d, error) {
    if (!d || d.map || d.gate || Object.keys(d.params).length || d.braid.kind !== 'list' || d.braid.tokens.length !== 1)
        return null;
    const a = d.braid.tokens[0].atom;
    if (a.kind !== 'mix' || a.gate || !a.exprs.length)
        return null;
    const member = (e) => {
        if (e.k === 'ref')
            return 'level' in e && e.level !== undefined ? null : { line: e.ref, by: [] };
        if (e.k !== 'prod' || e.factors[0]?.k !== 'ref' || !e.factors.slice(1).every((f) => f.k === 'num' || (f.k === 'ref' && !f.ref.pick && !f.ref.shift)))
            return null;
        return { line: e.factors[0].ref, by: e.factors.slice(1) };
    };
    const members = a.exprs.map(member);
    if (!members.every((m) => m !== null))
        return null;
    const sound = (n) => {
        const x = decls.get(n);
        return (!!x &&
            (!!x.gate || Object.keys(x.params).some((k) => VOICE_PARAMS.has(k)) || (x.braid.kind === 'list' && x.braid.tokens.length === 1 && x.braid.tokens[0].atom.kind === 'mix')));
    };
    return members.map((m) => ({
        line: m.line,
        by: m.by.filter((f) => {
            if (f.k !== 'ref' || !sound(f.ref.name))
                return true;
            error(`&${d.name} is a stack of lines, each times its levels: &${f.ref.name} is a sound, not a level (a cell with map=amp, map=db or map=lin, or a number)`, f.ref.span);
            return false;
        }),
    }));
}
function kitMembers(d) {
    if (!d || d.map || d.gate || d.braid.kind !== 'list' || !d.braid.tokens.length)
        return null;
    const names = d.braid.tokens.flatMap((t) => (t.atom.kind === 'ref' ? [t.atom.name] : []));
    return names.length === d.braid.tokens.length ? names : null;
}
function voicesIn(decls, name, seen = []) {
    const d = decls.get(name);
    if (!d || seen.includes(name) || d.braid.kind !== 'list')
        return [];
    const sounds = (n) => Object.keys(decls.get(n)?.params ?? {}).some((k) => VOICE_PARAMS.has(k));
    const out = new Set();
    for (const a of d.braid.tokens.flatMap((t) => leaves(t.atom))) {
        const refs = a.kind === 'ref' ? [a.name] : a.kind === 'mix' ? a.exprs.flatMap((e) => (e.k === 'ref' ? [e.ref.name] : [])) : [];
        for (const r of refs)
            for (const v of sounds(r) ? [r] : voicesIn(decls, r, [...seen, name]))
                out.add(v);
    }
    return [...out];
}
function mixSelectors(ctx, decls) {
    const isMix = (d) => !!d && !d.gate && d.map?.kind !== 'sample' && d.map?.kind !== 'midi' && d.braid.kind === 'list' && d.braid.tokens.length === 1 && d.braid.tokens[0].atom.kind === 'mix';
    for (const d of decls.values()) {
        const t = d.over ? decls.get(d.over.name) : undefined;
        if (!t || t.braid.kind !== 'list' || !t.braid.tokens.length || !t.braid.tokens.every((x) => x.atom.kind === 'ref' && isMix(decls.get(x.atom.name))))
            continue;
        ctx.error(`A selector switches sections (decision 016): &${d.name} over=&${t.name} reads mixes. Write &${t.name} step=4n with a section per part (&${t.name} step=4n &keysBar &drumBar), step each part's cells by its section (step=&keysBar), and play the parts straight into the sound card`, d.over.span);
        ctx.broken.add(d.name);
    }
}
function sectionTables(decls, error) {
    const sections = new Map();
    const clocks = new Set([...decls.values()].flatMap((d) => (d.step?.kind === 'driven' ? [d.step.driver.name] : [])));
    const bare = (k) => !!k && !k.step && !k.over && !k.map && (k.braid.kind === 'blank' || (k.braid.kind === 'list' && !k.braid.tokens.length));
    for (const d of [...decls.values()]) {
        if (!d.step || d.over || d.map || d.braid.kind !== 'list' || !d.braid.tokens.length)
            continue;
        const names = [];
        for (const t of d.braid.tokens) {
            const a = t.atom;
            if (a.kind !== 'ref' || a.pick || a.shift || a.transpose || a.values || t.repeat !== 1 || t.subdivide !== 1 || t.elongate !== 1)
                break;
            const known = decls.get(a.name);
            if (known && !bare(known) && (!known.step || sections.has(a.name))) {
                const rest = d.braid.tokens.map((x) => (x.atom.kind === 'ref' ? x.atom.name : '')).filter((n) => n !== a.name);
                if (known.step || !rest.some((n) => n && !decls.has(n) && clocks.has(n)))
                    break;
                error(`&${a.name} is a section of &${d.name}, so its line can carry attributes only (off, label=, tags=, show=, size=, shift=, restart=), not steps or a table of its own`, known.span);
                decls.set(a.name, { ...known, over: null, map: null, braid: { kind: 'blank' } });
            }
            names.push(a.name);
        }
        if (names.length !== d.braid.tokens.length || names.every((n) => decls.has(n) && !bare(decls.get(n))) || !names.some((n) => clocks.has(n)))
            continue;
        for (const [i, name] of names.entries()) {
            sections.set(name, d.name);
            const own = decls.get(name);
            if (own && !bare(own))
                continue;
            const span = d.braid.tokens[i].span;
            const braid = { kind: 'list', tokens: [{ atom: { kind: 'note', value: 0, alter: 0 }, repeat: 1, subdivide: 1, elongate: 1, span }] };
            decls.set(name, own
                ? { ...own, step: d.step, braid }
                : { name, span, over: null, shift: null, off: false, step: d.step, map: null, stride: null, cycle: null, params: {}, paramSpans: {}, braid });
        }
        decls.set(d.name, { ...d, step: null });
    }
    return sections;
}

import { leaves } from "../subseq.js";
import { CV_LAPS } from "../program.js";
import { memberParams, VOICE_MAKERS } from "../attributes.js";
import { AlgebraError, distribute } from "../algebra.js";
import { inlineNotes, notesProductOf, valueSumOf } from "../valuesum.js";
import { syntax } from "../parser/syntax.js";
import { noSound } from "./band.js";
const isMixDecl = (d) => !!d && d.map?.kind !== 'sample' && d.map?.kind !== 'midi' && d.braid.kind === 'list' && d.braid.tokens.length === 1 && d.braid.tokens[0].atom.kind === 'mix';
const isKitDecl = (d, { decls }) => !!d &&
    !Object.keys(d.params).some((k) => VOICE_MAKERS.has(k)) &&
    d.braid.kind === 'list' &&
    d.braid.tokens.length > 0 &&
    d.braid.tokens.every((t) => t.atom.kind === 'ref' && memberParams(decls.get(t.atom.name)?.params ?? {}));
const turns = (d, { rateOf }) => {
    if (!d.step || d.step.kind === 'driven' || d.step.kind === 'tap')
        return null;
    const r = rateOf(d.step);
    const b = d.braid;
    const k = b.kind === 'list' ? b.tokens.length : b.kind === 'scan' ? b.steps.length : b.kind === 'wave' ? b.n : 1;
    return r === null ? null : d.step.whole ? r : r / Math.max(1, k);
};
const over = (d, { decls }) => (d.over ? decls.get(d.over.name) : undefined);
const isSoundHead = (d, { decls }) => {
    const tape = typeof d.params.play === 'string' ? decls.get(d.params.play) : undefined;
    return !!tape && typeof tape.params.write === 'string' && isMixDecl(decls.get(tape.params.write));
};
const soundNotMix = (seen) => (n) => {
    const d = seen.decls.get(n);
    return !!d && (!!d.gate || Object.keys(d.params).some((k) => VOICE_MAKERS.has(k)) || isKitDecl(over(d, seen), seen) || isSoundHead(d, seen) || (turns(d, seen) ?? 0) >= CV_LAPS);
};
const isNotesDecl = (d, seen) => notesProductOf(d.name, seen.decls, soundNotMix(seen)) !== null;
export const SORT_RULES = [
    {
        sort: 'signal',
        is: 'A sound parameter (s=, lpf= …): a voice.',
        example: ['&lead s=saw loop=C4'],
        holds: (d) => Object.keys(d.params).some((k) => VOICE_MAKERS.has(k)),
    },
    {
        sort: 'pitch',
        is: 'A product with no sound in it and a pitch: notes with their levels (decision 087). In a product with a sound it is its own product, as written in parentheses: [&cycle * &glass] plays [(&notes * &level) * &glass].',
        example: ['&notes step=2 0 4', '&level map=amp step=2 1 .5', '&cycle [&notes * &level]'],
        holds: isNotesDecl,
    },
    {
        sort: 'signal',
        is: 'A mix: an instrument.',
        example: ['&a s=saw loop=C4', '&b s=sine loop=C3', '&organ [&a, &b]'],
        holds: (d, { decls }) => isMixDecl(d) && valueSumOf(d.name, decls) === null,
    },
    {
        sort: 'signal',
        is: 'A pattern read through a kit (a table of voices).',
        example: ['&bd s=sine loop=A1', '&hh s=white', '&kit &bd &hh', '&drums over=&kit step=4 0 1 0 1'],
        holds: (d, seen) => isKitDecl(over(d, seen), seen),
    },
    {
        sort: 'signal',
        is: 'A read head of a sound tape (a tape that records a mix).',
        example: ['&lead s=saw loop=C4', '&mix [&lead]', '&tape write=&mix step=1 length=4', '&head play=&tape at=1'],
        holds: isSoundHead,
    },
    {
        sort: 'wave',
        is: 'A braid turning at an audio rate (20 Hz and up) with no sound of its own. Alone in a product it is the sound (a waveform); in a pitch sum, or beside a sound, a pitch that moves at audio rate (FM). One that plays as a voice in the piece is a sound everywhere.',
        example: ['&square loop=220 0 1'],
        holds: (d, seen) => (turns(d, seen) ?? 0) >= CV_LAPS,
    },
    {
        sort: 'volume',
        is: 'map=amp, map=db or map=adsr (an envelope).',
        example: ['&accent map=amp step=2 1 .5'],
        holds: (d) => d.map?.kind === 'amp' || d.map?.kind === 'db' || d.map?.kind === 'adsr',
    },
    {
        sort: 'plain',
        is: "map=lin: as a number, it takes its operator's sort — a volume in a product, a pitch in a sum.",
        example: ['&swell map=lin loop=.25 .2 1'],
        holds: (d) => d.map?.kind === 'lin',
    },
    {
        sort: 'pitch',
        is: 'Anything else: a melody, a cell reading a table, a loop below hearing (a vibrato). In semitones.',
        example: ['&vibrato loop=5 0 .1 -.1'],
        holds: () => true,
    },
];
export const SORT_SYNTAX = SORT_RULES.map((r) => syntax('sort', r.sort, r.is, [r.example[r.example.length - 1]], 'mix.md'));
const refsIn = (e) => (e.k === 'ref' ? [e.ref] : e.k === 'sum' ? e.items.flatMap((x) => refsIn(x.e)) : e.k === 'prod' ? e.factors.flatMap(refsIn) : []);
const refsOf = (e) => refsIn(e).map((r) => r.name);
export function notesCells(ctx, decls) {
    const seen = { decls, rateOf: ctx.rateOf };
    return (name) => {
        const d = decls.get(name);
        return !!d && isNotesDecl(d, seen);
    };
}
export function sortOfCells(ctx, decls) {
    const seen = { decls, rateOf: ctx.rateOf };
    return (name) => {
        const d = decls.get(name);
        return d ? SORT_RULES.find((r) => r.holds(d, seen)).sort : 'pitch';
    };
}
export function sorts(ctx, decls) {
    const { error } = ctx;
    const seen = { decls, rateOf: ctx.rateOf };
    const sortOf = sortOfCells(ctx, decls);
    const noVoice = (names) => {
        const name = names[names.length - 1];
        const d = decls.get(name);
        if (!d)
            return null;
        if (d.braid.kind === 'list') {
            const voiceRef = (t) => t.atom.kind === 'ref' && Object.keys(decls.get(t.atom.name)?.params ?? {}).some((k) => VOICE_MAKERS.has(k));
            const odd = (t) => t.atom.kind === 'note' || (t.atom.kind === 'ref' && voiceRef(t) && (t.atom.pick || t.atom.shift || t.atom.transpose || t.atom.values));
            const steps = d.braid.tokens.flatMap((t) => leaves(t.atom).map((atom) => ({ atom })));
            if (steps.some(voiceRef) && steps.some(odd))
                return `&${name} mixes voices with numbers or picks: a groove holds only voices, rests and chords of voices (&bd &hh ~ [&bd, &hh]); to play numbers through voices, read them with over= a kit`;
        }
        if (d.map?.kind === 'midi')
            return `&${name} is a MIDI card: it sends what it names to a device, and is no sound to mix or play`;
        if (isKitDecl(d, seen))
            return `&${name} is a kit, a table of voices: read a pattern through it (&drums over=&${name}) and mix that`;
        const r = turns(d, seen);
        if (r !== null && r < 20)
            return `&${name} loops at ${+r.toFixed(2)} Hz, below hearing: a pitch. A voice loops at an audio rate (loop=C4) or has a sound (s=saw)`;
        if (!d.step)
            return `&${name} has no loop=: a voice loops at an audio rate (loop=C4) or has a sound (s=saw)`;
        return null;
    };
    const typedMixes = new WeakMap();
    const typed = (atom) => {
        let out = typedMixes.get(atom);
        if (out)
            return out;
        out = [];
        const sort = atom.gate ? (n) => (isKitDecl(decls.get(n), seen) ? 'signal' : sortOf(n)) : sortOf;
        const spec = atom.gate ? decls.get(atom.gate)?.gate : undefined;
        const ref = (name) => atom.exprs.flatMap(refsIn).find((r) => r.name === name);
        const sound = (n) => {
            const d = decls.get(n);
            return !!d && (!!d.gate || (isMixDecl(d) && valueSumOf(n, decls) === null && !isNotesDecl(d, seen)) || Object.keys(d.params).some((k) => VOICE_MAKERS.has(k)));
        };
        const notes = spec ? (spec.lines?.map((l) => l.line) ?? [spec.notes]).map((name) => ({ name, port: spec.port })) : [];
        const sounding = spec && [...notes, ...spec.levels].find((x) => sound(x.name));
        if (spec && sounding) {
            const wants = notes.some((x) => x.name === sounding.name) ? 'the notes it plays (a melody, &tune)' : 'a level (a volume: a cell with map=amp, map=db or map=lin)';
            error(`${sounding.port}=&${sounding.name}: a gate's ${sounding.port}= takes ${wants}, and &${sounding.name} is a sound (${decls.get(sounding.name)?.gate ? 'a gate' : isMixDecl(decls.get(sounding.name)) ? 'a mix' : 'a voice'})`, ref(sounding.name)?.span ?? decls.get(atom.gate).span);
            typedMixes.set(atom, out);
            return out;
        }
        const role = (n) => decls.get(n)?.map?.kind === 'role';
        const roleIn = [...notes.map((x) => x.name), ...atom.exprs.flatMap(refsOf)].find(role);
        if (roleIn) {
            error(noSound(roleIn), ref(roleIn)?.span ?? decls.get(atom.gate ?? roleIn).span);
            typedMixes.set(atom, out);
            return out;
        }
        for (const written of atom.exprs)
            try {
                const unknown = refsIn(written).filter((r) => !decls.has(r.name));
                if (unknown.length) {
                    for (const r of unknown)
                        ctx.unknownCell(r.name, r.span);
                    continue;
                }
                const found = { named: [], moved: [] };
                const e = inlineNotes(written, decls, soundNotMix(seen), found);
                if (found.moved.length) {
                    for (const m of found.moved)
                        error(`&${m.ref.name} is notes with their levels (a product with no voice): it is named whole in a mix, not picked, moved or given a level (decision 087)`, m.ref.span);
                    continue;
                }
                let bs;
                try {
                    bs = distribute(e, sort, noVoice);
                }
                catch (x) {
                    if (x instanceof AlgebraError && found.named.length && !refsIn(e).some((r) => sort(r.name) === 'signal' || sort(r.name) === 'wave'))
                        throw new AlgebraError(`&${found.named[0]} is notes with their levels: multiply them by a voice ([&${found.named[0]} * &lead]) (decision 087)`, written.k === 'ref' ? written.ref.span : written.span);
                    throw x;
                }
                const kit = bs.flatMap((b) => b.pitches).find((t) => isKitDecl(decls.get(t.ref.name), seen));
                if (kit)
                    error(`&${kit.ref.name} is a kit, a table of voices: a pattern read through it is the sound — mix the pattern alone`, kit.ref.span);
                else
                    out.push(...bs);
            }
            catch (x) {
                if (!(x instanceof AlgebraError))
                    throw x;
                if (!refsOf(written).some((n) => ctx.broken.has(n)))
                    error(x.message, x.span);
            }
        typedMixes.set(atom, out);
        return out;
    };
    return typed;
}

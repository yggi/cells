import { pickLabel } from "../ast.js";
import { leaves } from "../subseq.js";
import { adsrOf, balance, pickedUnits, pickProblem, pickSteps } from "../program.js";
import { IMPLICIT } from "./tables.js";
import { VOICE_PARAMS } from "../attributes.js";
export function outputsOf(ctx, decls, cells, clocks, { sinks, cards, bindings, soundHead }) {
    const { parsed, error, warn, unknownCell } = ctx;
    const outputs = [];
    const returns = [];
    const resonances = [];
    const articulates = (c) => !!c.clock && decls.get(c.name)?.step?.whole === false;
    const stepsPerSecond = (c) => (clocks.get(c.clock)?.perSecond ?? 0) * c.rate;
    const finest = (xs) => {
        const by = [...xs].sort((a, b) => stepsPerSecond(b.c) - stepsPerSecond(a.c));
        const [a, b] = [stepsPerSecond(by[0].c), stepsPerSecond(by[1].c)];
        return a - b > 1e-9 * Math.max(a, b) ? by[0] : null;
    };
    for (const { b, span, gains, via, parts, through, silent, midi } of bindings) {
        const known = (r) => {
            if (decls.has(r.name))
                return true;
            unknownCell(r.name, r.span);
            return false;
        };
        if (![b.voice, ...b.pitches.map((t) => t.ref)].every(known))
            continue;
        if ([b.voice, ...b.pitches.map((t) => t.ref)].some((r) => ctx.broken.has(r.name)))
            continue;
        if (soundHead(b.voice.name) && b.pitches.length === 0) {
            returns.push({ head: b.voice.name, tape: cells.get(b.voice.name).params.play, gains: [gains[0], gains[1]], parts, through: [...through] });
            continue;
        }
        const voice = cells.get(b.voice.name);
        if (!voice)
            continue;
        if (typeof voice.params.body === 'string' && b.pitches.length === 0) {
            const [pl, pr] = balance(voice.params.pan);
            resonances.push({
                cell: voice.name,
                gains: [gains[0] * pl, gains[1] * pr],
                parts: parts.map((x) => ({ ...x, gains: [x.gains[0] * pl, x.gains[1] * pr] })),
                through: [...through],
            });
            continue;
        }
        const gateNotes = [...via, ...through]
            .flatMap((n) => {
            const g = cells.get(n)?.gate;
            return g ? (g.lines?.map((l) => l.plays) ?? [g.plays]) : [];
        })
            .find((n) => b.pitches.some((t) => t.ref.name === n));
        const kitRead = voice.kit ? b.pitches.find((t) => decls.get(t.ref.name)?.over?.name === voice.name || t.ref.name === gateNotes) : undefined;
        if (voice.kit && !kitRead) {
            error(`A kit is a table of voices: read the pattern through it, &drums over=&${voice.name}, and mix &drums`, b.voice.span);
            continue;
        }
        if (voice.root) {
            error(`&${voice.name} is a grid, not a voice`, b.voice.span);
            continue;
        }
        if (b.voice.pick || b.voice.shift) {
            error(`Pick or shift the melody, not the voice: &theme[0] * &${voice.name}`, b.voice.span);
            continue;
        }
        if (decls.get(voice.name)?.step?.kind === 'driven' || decls.get(voice.name)?.step?.kind === 'tap') {
            error(`&${voice.name} moves with step=&…, so it can't be a voice: a voice moves at a rate, its pitch (loop=C4)`, b.voice.span);
            continue;
        }
        if (!voice.params.s && voice.freq < 20)
            warn(`&${voice.name} loops at ${+voice.freq.toFixed(2)} Hz, below hearing — is it a pitch? Then leave out its sound parameters: (&theme + &${voice.name}) * &lead`, b.voice.span);
        const own = [
            ...(voice.env ? [{ ref: decls.get(voice.name).env, sign: 1, inSum: false }] : []),
            ...(voice.pitch ? [{ ref: decls.get(voice.name).pitch, sign: 1, inSum: true }] : []),
        ];
        const moved = b.pitches.find((t) => t.ref.transpose || t.ref.degree);
        if (moved?.ref.transpose)
            error(`&${moved.ref.name}^$${moved.ref.transpose}: transposing (^$) is for braids — in a mix, add pitch: &${moved.ref.name} + ${moved.ref.transpose}`, moved.ref.span);
        else if (moved)
            error(`&${moved.ref.name}^${moved.ref.degree}: moving by degrees (^) is for braids — in a mix, write a cell that plays it: &u step=&bar &${moved.ref.name}^${moved.ref.degree}`, moved.ref.span);
        const tapeOf = new Map();
        const terms = [...b.pitches, ...own]
            .map((t) => {
            let c = cells.get(t.ref.name);
            const tp = c && typeof c.params.play === 'string' ? cells.get(c.params.play) : undefined;
            const src = tp && typeof tp.params.write === 'string' ? cells.get(tp.params.write) : undefined;
            if (c && tp && src) {
                tapeOf.set(t, {
                    head: c.name,
                    tape: tp.name,
                    at: typeof c.params.at === 'number' ? c.params.at : 0,
                    length: typeof tp.params.length === 'number' ? tp.params.length : 0,
                    erase: typeof tp.params.erase === 'number' ? Math.min(1, Math.max(0, tp.params.erase)) : 1,
                });
                c = src;
            }
            return { t, c };
        })
            .filter((x) => x.c);
        const voiced = terms.filter((x) => x.c.voice);
        if (voiced.length) {
            error(`Two sounds can't multiply (&${voiced[0].c.name} * &${voice.name}): &${voiced[0].c.name} plays as a voice — mix them with + or ,`, voiced[0].t.ref.span);
            continue;
        }
        const isEnvelope = (x) => x.c.map?.kind === 'adsr';
        const isLevel = (x) => x.c.map?.kind === 'amp' || x.c.map?.kind === 'db' || (x.c.map?.kind === 'lin' && !x.t.inSum);
        const envelopes = terms.filter(isEnvelope);
        const pitches = terms.filter((x) => !isLevel(x) && !isEnvelope(x));
        const levels = terms.filter((x) => isLevel(x));
        if (envelopes.length > 1) {
            error(`One envelope per note: &${envelopes[0].c.name} and &${envelopes[1].c.name} both shape &${voice.name}`, envelopes[1].t.ref.span);
            continue;
        }
        const envBad = envelopes.find((x) => x.t.inSum || x.t.sign < 0);
        if (envBad) {
            error(`&${envBad.c.name} is an envelope (map=adsr): a volume, it multiplies — keep it out of pitch sums`, envBad.t.ref.span);
            continue;
        }
        const env = envelopes[0] ? adsrOf(envelopes[0].c) : null;
        const negLevel = levels.find((x) => x.t.sign < 0);
        if (negLevel) {
            error(`&${negLevel.c.name} is a volume (map=amp): it multiplies, it can't be subtracted`, negLevel.t.ref.span);
            continue;
        }
        let lead = pitches.filter((x) => articulates(x.c));
        const gate = lead.length === 0;
        if (gate)
            lead = levels.filter((x) => articulates(x.c));
        const [pl, pr] = voice.kit ? [1, 1] : balance(voice.params.pan);
        const term = (x) => ({
            cell: x.c.name,
            pick: x.t.ref.pick,
            shift: x.t.ref.shift,
            sign: x.t.sign,
            ...(x.t === kitRead ? { picks: true } : {}),
        });
        const common = {
            voice: voice.name,
            kit: voice.kit,
            offset: b.offset,
            gains: [gains[0] * pl, gains[1] * pr],
            parts: parts.map((x) => ({ ...x, gains: [x.gains[0] * pl, x.gains[1] * pr] })),
            select: [],
            ...(silent ? { silent: true } : {}),
            ...(midi?.length ? { midi } : {}),
            through: [...through],
            envelope: env,
            envelopeCell: envelopes[0]?.c.name ?? null,
            via: [...via],
            span,
        };
        const ownTerms = new Set(own);
        if (lead.length === 0 && !voice.kit && pitches.every((x) => ownTerms.has(x.t))) {
            outputs.push({
                id: `${voice.name}:${voice.name}:${b.voice.span.line}:${b.voice.span.col}`,
                ...common,
                cell: voice.name,
                pick: null,
                shift: 0,
                sign: 1,
                gate: false,
                drone: true,
                mods: pitches.map(term),
                levels: levels.map(term),
            });
            continue;
        }
        if (lead.length === 0) {
            error(terms.length
                ? `Nothing starts notes on &${voice.name}: give a pitch or a volume (map=amp) step= timing (step=4n); loop= terms only bend`
                : `&${voice.name} has nothing to play: a melody goes before it, like &melody * &${voice.name}`, span);
            continue;
        }
        if (lead.length > 1) {
            const first = finest(lead);
            if (!first) {
                error(`Both &${lead[0].c.name} and &${lead[1].c.name} would start notes on &${voice.name}, at the same rate — make one coarser (it then holds under the other) or loop= (it then bends or shapes them)`, lead[1].t.ref.span);
                continue;
            }
            lead = [first];
        }
        const { t, c: cell } = lead[0];
        const badPick = terms.find((x) => pickSteps(x.c, x.t.ref.pick) === null);
        if (badPick) {
            error(pickProblem(badPick.c.name, badPick.t.ref.pick, badPick.c.units.length), badPick.t.ref.span);
            continue;
        }
        if (pickSteps(cell, t.ref.pick) === 0) {
            error(`&${cell.name} has no steps to play`, t.ref.span);
            continue;
        }
        if (!tapeOf.has(t) && onlyRests(cells, cell, t.ref.pick))
            warn(`&${cell.name}${t.ref.pick ? pickLabel(t.ref.pick) : ''} plays only rests (~): nothing sounds on &${voice.name}`, t.ref.span);
        outputs.push({
            id: `${voice.name}:${cell.name}:${t.ref.span.line}:${t.ref.span.col}`,
            ...common,
            cell: cell.name,
            pick: t.ref.pick,
            shift: t.ref.shift,
            sign: t.sign,
            gate,
            mods: pitches.filter((x) => x !== lead[0]).map(term),
            levels: levels.filter((x) => x !== lead[0]).map(term),
            ...(tapeOf.has(t) ? { tape: tapeOf.get(t) } : {}),
        });
    }
    const heardVoice = (v) => outputs.some((o) => o.voice === v && (o.parts.length || o.silent));
    const sentOnly = outputs.find((o) => o.midi && !o.parts.length && !o.silent && !o.kit && !heardVoice(o.voice) && Object.keys(decls.get(o.voice)?.params ?? {}).some((k) => VOICE_PARAMS.has(k)));
    if (sentOnly) {
        const d = decls.get(sentOnly.voice);
        const sound = Object.keys(d.params).filter((k) => VOICE_PARAMS.has(k));
        warn(`&${sentOnly.voice} is only on a MIDI card: its sound (${sound.map((k) => `${k}=`).join(' ')}) is heard here but isn't sent — MIDI carries its notes, velocity and bends; the device makes its own`, d.paramSpans[sound[0]] ?? d.span);
    }
    if (sinks.length === 0 && cards.length === 0 && parsed.cells.length > 0 && !parsed.broken?.length)
        warn('Nothing plays yet — write a sound: a voice alone plays its own pitch (&a loop=A4), a melody plays on one ([&melody * &a])', IMPLICIT);
    return { outputs, returns, resonances };
}
function onlyRests(cells, c, pick, seen = []) {
    if (seen.includes(c.name) || c.frees.some((f) => f.key === 'braid'))
        return false;
    const idx = pickedUnits(c.units.length, pick, c.shift);
    if (!idx?.length)
        return false;
    const rest = (a) => {
        if (a.kind === 'rest')
            return true;
        if (a.kind === 'seq')
            return leaves(a).every(rest);
        const child = a.kind === 'ref' ? cells.get(a.name) : undefined;
        return !!child && a.kind === 'ref' && onlyRests(cells, child, a.pick, [...seen, c.name]);
    };
    return idx.every((i) => rest(c.units[i].atom));
}

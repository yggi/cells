import { DOUGH_SOURCES } from "../dough-params.js";
import { ATTRIBUTES, VOICE_PARAMS } from "../attributes.js";
import { canonicalTag, TUTORIAL } from "../tags.js";
import { isMidiCard } from "../program.js";
export function bindVoices(ctx, decls, given, typed) {
    const { error, warn, unknownCell } = ctx;
    const cells = new Map(given);
    const hasParams = (n) => Object.keys(decls.get(n)?.params ?? {}).length > 0;
    const isKit = (c) => c.units.length > 0 && c.units.every((u) => u.atom.kind === 'ref' && hasParams(u.atom.name));
    for (const c of [...cells.values()])
        if (!c.voice && !c.root && isKit(c))
            cells.set(c.name, { ...c, kit: true });
    const sinks = [...cells.values()].filter((c) => c.sink);
    for (const [name, d] of decls) {
        const c = cells.get(name);
        if (c && !c.mix && !isMidiCard(c) && c.units.some((u) => u.atom.kind === 'mix'))
            error(c.sink ? `A sound card's channels are all mixes: [left …] [right …], or &left &right` : `A mix is one chord of sounds: &${name} [&a * &v, &b * &w]`, d.span);
    }
    const expand = (b, through = []) => {
        const v = cells.get(b.voice.name);
        if (!v?.mix || v.sink)
            return [{ b, through }];
        if (through.includes(v.name) || through.length > 16) {
            error(`&${v.name} plays itself through its mixes`, v.span);
            return [];
        }
        return v.mix.flatMap((inner) => expand({ voice: inner.voice, pitches: [...b.pitches, ...inner.pitches], offset: b.offset + inner.offset, gain: b.gain * inner.gain }, [...through, v.name]));
    };
    const gathered = new Map();
    const termKey = (b) => [b.voice.name, b.offset, ...b.pitches.map((t) => `${t.sign}${t.ref.name}${JSON.stringify(t.ref.pick)}${t.ref.shift}`)].join('|');
    for (const sink of sinks) {
        const d = decls.get(sink.name);
        const channels = sink.units;
        if (channels.length === 0 || channels.length > 2) {
            error(`The sound card takes one channel (mono) or two (left, right): &${sink.name} map=sample &left &right`, d.span);
            continue;
        }
        channels.forEach((u, ch) => {
            const inPlace = u.atom.kind === 'mix' ? typed(u.atom) : null;
            const mix = u.atom.kind === 'ref' ? cells.get(u.atom.name) : inPlace ? sink : undefined;
            const bindings = inPlace ?? (u.atom.kind === 'ref' && mix?.mix && !mix.sink ? mix.mix : null);
            if (!mix || !bindings) {
                if (u.atom.kind === 'ref' && ctx.broken.has(u.atom.name))
                    return;
                error(`A channel of the sound card is a mix: &mix, or [&theme * &lead] written in place`, d.span);
                return;
            }
            for (const { b, through, top } of bindings.flatMap((x) => expand(x).map((e) => ({ ...e, top: x })))) {
                const key = termKey(b);
                let g = gathered.get(key);
                const span = sink.implicit ? top.voice.span : mix.span;
                if (!g)
                    gathered.set(key, (g = { b, span, gains: [0, 0], via: new Set(), parts: [], through: new Set() }));
                for (const t of through)
                    g.through.add(t);
                const part = channels.length === 1 ? [b.gain, b.gain] : ch === 0 ? [b.gain, 0] : [0, b.gain];
                g.gains[0] += part[0];
                g.gains[1] += part[1];
                g.parts.push({ mix: mix.name, sink: sink.name, gains: part });
                g.via.add(mix.name).add(sink.name);
            }
        });
    }
    const throughKit = (name) => {
        const t = decls.get(name)?.over?.name;
        return t && cells.get(t)?.kit ? t : null;
    };
    {
        const heard = new Set([...gathered.values()].flatMap((g) => g.parts.map((p) => p.mix)));
        const sends = new Set();
        for (const d of decls.values())
            for (const k of ['excite', 'write']) {
                const m = d.params[k];
                if (typeof m === 'string' && cells.get(m)?.mix && !heard.has(m))
                    sends.add(m);
            }
        for (const name of sends) {
            const mix = cells.get(name);
            for (const { b, through } of mix.mix.flatMap((x) => expand(x))) {
                if (typeof cells.get(b.voice.name)?.params.play === 'string')
                    continue;
                const key = 'send:' + termKey(b);
                if (gathered.has(key) || [...gathered.values()].some((g) => termKey(g.b) === termKey(b)))
                    continue;
                gathered.set(key, { b, span: mix.span, gains: [b.gain, b.gain], via: new Set([name]), parts: [], through: new Set(through), silent: true });
            }
        }
    }
    const cards = [...cells.values()].filter((c) => isMidiCard(c));
    for (const card of cards) {
        const d = decls.get(card.name);
        const map = card.map;
        if (d.step)
            error(`A MIDI card doesn't turn: leave out ${d.step.whole ? 'loop' : 'step'}= (&${card.name} map=midi …)`, d.step.span);
        const toks = d.braid.kind === 'list' ? d.braid.tokens : [];
        const bad = card.units.findIndex((u) => u.subdivide !== 1 || u.elongate !== 1);
        if (bad >= 0) {
            error(`A MIDI card's entries are channels: x!n repeats one on n channels, but * and @ mean nothing here`, toks[bad]?.span ?? d.span);
            continue;
        }
        const count = card.units.reduce((n, u) => n + u.repeat, 0);
        if (map.channel === null && count > 16) {
            error(`A MIDI card has 16 channels, and &${card.name} names ${count}: ~ skips one, map=midi(10) puts them all on one`, d.span);
            continue;
        }
        if (count === 0)
            warn(`&${card.name} is a MIDI card with no channels: write what goes on each, map=midi [&theme * &reed] ~ &groove`, d.map.span);
        let at = 0;
        card.units.forEach((u, i) => {
            const span = toks[i]?.span ?? d.span;
            const first = at;
            at += u.repeat;
            if (u.atom.kind === 'rest')
                return;
            let entry;
            if (u.atom.kind === 'mix')
                entry = { bindings: card.chords?.[i] ?? [], mix: null };
            else if (u.atom.kind === 'ref') {
                const name = u.atom.name;
                const c = cells.get(name);
                if (!c)
                    return;
                const alone = { voice: { name, pick: u.atom.pick, shift: u.atom.shift, span }, pitches: [], offset: 0, gain: 1 };
                if (c.mix && !c.sink)
                    entry = { bindings: c.mix, mix: name };
                else if (throughKit(name) || c.voice || c.kit)
                    entry = { bindings: [alone], mix: null };
                else {
                    error(isMidiCard(c)
                        ? `&${name} is a MIDI card: a card's entries are what it sends (a mix, a mix cell, a pattern read through a kit), not another card — name &${name}'s entries here`
                        : `&${name} is a melody without a voice: a MIDI channel plays notes on a voice, [&${name} * &voice]`, span);
                    return;
                }
            }
            else {
                error(`A MIDI card's entries are channels: a mix ([&theme * &reed]), a mix cell, a pattern read through a kit, or ~ to skip one`, span);
                return;
            }
            const { bindings: named, mix } = entry;
            for (let k = 0; k < u.repeat; k++) {
                const channel = map.channel ?? first + k + 1;
                for (const { b, through } of named.flatMap((x) => expand(x))) {
                    const key = termKey(b);
                    let g = gathered.get(key) ?? [...gathered.values()].find((x) => termKey(x.b) === key);
                    if (!g)
                        gathered.set(key, (g = { b, span: card.span, gains: [0, 0], via: new Set(), parts: [], through: new Set() }));
                    for (const t of through)
                        g.through.add(t);
                    (g.midi ??= []).push({ card: card.name, mix, channel, port: map.port, gain: b.gain });
                    g.via.add(card.name);
                    if (mix)
                        g.via.add(mix);
                }
            }
        });
    }
    const bindings = [...gathered.values()].map((g) => {
        const kit = throughKit(g.b.voice.name);
        return kit ? { ...g, b: { ...g.b, voice: { name: kit, pick: null, shift: 0, span: g.b.voice.span }, pitches: [{ ref: g.b.voice, sign: 1 }, ...g.b.pitches] } } : g;
    });
    const soundHead = (name) => {
        const h = cells.get(name);
        const t = h && typeof h.params.play === 'string' ? cells.get(h.params.play) : undefined;
        const src = t && typeof t.params.write === 'string' ? cells.get(t.params.write) : undefined;
        return !!src?.mix && !src.sink;
    };
    for (const { b } of bindings) {
        const v = cells.get(b.voice.name);
        if (v && !v.root && !v.kit && !soundHead(v.name) && !b.pitches.some((t) => t.ref.name === v.name))
            cells.set(v.name, { ...v, voice: true });
    }
    const card = [...decls].find(([, d]) => d.title)?.[0];
    for (const [name, d] of decls) {
        const c = cells.get(name);
        if (!c)
            continue;
        if (c.map?.kind === 'table' && !decls.has(c.map.table))
            unknownCell(c.map.table, d.map.span);
        if (d.base && !decls.has(d.base.name))
            unknownCell(d.base.name, d.base.span);
        if (d.about) {
            if (!c.note)
                error('about= belongs on a note: a cell with a label= (or title=) and nothing else', d.about[0].span);
            for (const r of d.about)
                if (!decls.has(r.name))
                    unknownCell(r.name, r.span);
        }
        if (d.tier != null && d.title && !(d.tags ?? '').split(',').some((t) => canonicalTag(t.trim()) === TUTORIAL))
            warn('tier= puts a piece in a tier of the tutorial; without tags="tutorial" it is ignored', d.paramSpans.tier ?? d.span);
        if (d.tier != null && !d.title)
            error('tier= belongs on a piece’s card: the note with its title=', d.paramSpans.tier ?? d.span);
        if (name === card && c.note) {
            const moved = ['title', 'tags', 'tier'].filter((k) => d[k] != null);
            const list = (forms) => (forms.length > 1 ? `${forms.slice(0, -1).join(', ')} and ${forms.at(-1)}` : forms[0]);
            const many = moved.length > 1;
            warn(`${list(moved.map((k) => `${k}=`))} on the piece’s card ${many ? 'go' : 'goes'} in its file’s frontmatter now (${moved.map((k) => `${k}:`).join(' ')}): Shorten moves ${many ? 'them' : 'it'} there (decision 047)`, d.paramSpans.title ?? d.span);
        }
        if (!c.voice)
            continue;
        const src = d.params.s;
        if (src !== undefined && !(String(src) in DOUGH_SOURCES))
            error(`Unknown sound '${src}' (${Object.keys(DOUGH_SOURCES).join(', ')})`, d.paramSpans.s ?? d.span);
        if (src !== undefined && d.braid.kind !== 'blank')
            warn(`s=${src} plays a built-in waveform; the braid is ignored`, d.paramSpans.s);
        for (const [k, v] of Object.entries(d.params))
            if (ATTRIBUTES[k]?.value === 'number' && typeof v !== 'number')
                error(`${k}= takes a number`, d.paramSpans[k]);
        const made = Object.keys(d.params).find((k) => VOICE_PARAMS.has(k));
        const why = made ? ` (${made}= makes &${name} a voice; a meter takes none)` : '';
        if (d.step?.kind === 'driven' || d.step?.kind === 'tap')
            error(`A voice moves at a rate — its pitch, like loop=C4${why}`, d.step.span);
        else if (d.step && !d.step.whole)
            error(`A voice's pitch is loop= (one turn of its braid per cycle): loop=C4${why}`, d.step.span);
    }
    return { cells: cells, sinks, cards, bindings, soundHead };
}

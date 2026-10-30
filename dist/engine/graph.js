import { isMidiCard, keepsTime } from "./program.js";
import { leaves } from "./subseq.js";
import { cellId, clockTapId, edgeId, junctionId, stepEdgeId } from "./ids.js";
import { VOICE_KIT } from "./compiler/declare.js";
import { refsOf } from "./readers.js";
export const isCellNode = (n) => n.kind !== 'junction';
const STRUCTURE = new Set(['over', 'braid', 'step', 'mix', 'midi', 'is', 'about', 'base']);
export const feeds = (e) => !STRUCTURE.has(e.port) && e.band !== 'sync';
const AS_IS = [[]];
function refTransform(r) {
    return [
        ...(r.pick ? [{ kind: 'pick', pick: r.pick }] : []),
        ...(r.shift ? [{ kind: 'delay', by: -r.shift, unit: 'step' }] : []),
        ...(r.values && r.values.mul < 0 ? [{ kind: 'inverse' }] : []),
        ...(r.values?.add ? [{ kind: 'degree', by: r.values.add }] : []),
        ...(r.transpose ? [{ kind: 'transpose', by: r.transpose, unit: 'grid' }] : []),
        ...(r.sign === -1 ? [{ kind: 'negate' }] : []),
    ];
}
export const isTurntable = (c) => typeof c.params.motor === 'number' || typeof c.params.belt === 'number' || typeof c.params.write === 'string' || typeof c.params.body === 'string';
export function writtenGraph(result, { card = false } = {}) {
    const edges = [];
    const depth = new Map();
    const meters = new Set([...result.clocks.keys()].filter((name) => keepsTime(result, name)));
    const playedBy = new Map();
    const from = (o) => (o.tape ? o.tape.head : o.cell);
    for (const o of result.outputs)
        if (!o.drone)
            playedBy.set(o.voice, [...(playedBy.get(o.voice) ?? []), from(o)]);
    const depthOf = (name, guard = 0) => {
        const hit = depth.get(name);
        if (hit !== undefined)
            return hit;
        const c = result.cells.get(name);
        let d = 1;
        if (c && guard < 64) {
            if (c.root)
                d = 0;
            else if (c.mix) {
                for (const b of c.mix)
                    d = Math.max(d, depthOf(b.voice.name, guard + 1) + 1);
            }
            else if (c.chords) {
                for (const b of c.chords.flatMap((x) => x ?? []))
                    d = Math.max(d, depthOf(b.voice.name, guard + 1) + 1);
                for (const k of c.children.keys())
                    d = Math.max(d, depthOf(k, guard + 1) + 1);
            }
            else if (c.voice || c.kit) {
                for (const p of playedBy.get(name) ?? [])
                    d = Math.max(d, depthOf(p, guard + 1) + 1);
                for (const o of result.outputs)
                    if (o.voice === name) {
                        for (const m of [...o.mods, ...o.levels])
                            d = Math.max(d, depthOf(m.cell, guard + 1) + 1);
                        if (o.envelopeCell)
                            d = Math.max(d, depthOf(o.envelopeCell, guard + 1) + 1);
                    }
                for (const k of c.children.keys())
                    d = Math.max(d, depthOf(k, guard + 1) + 1);
            }
            else {
                d = depthOf(c.over ?? c.context, guard + 1) + 1;
                for (const k of c.children.keys())
                    d = Math.max(d, depthOf(k, guard + 1) + 1);
            }
        }
        depth.set(name, d);
        return d;
    };
    const kitOfGate = (o) => o.through.some((m) => result.cells.get(m)?.gate?.receivers.some((r) => result.cells.get(r)?.kit));
    const voiceKitPlayed = result.outputs.filter((o) => o.voice === VOICE_KIT);
    const voiceKitShown = !voiceKitPlayed.length || !voiceKitPlayed.every(kitOfGate);
    const shown = (name) => !result.cells.get(name)?.implicit || (name === VOICE_KIT && voiceKitShown) || (card && name === result.builtinCard);
    const nodes = [];
    const seen = new Set();
    const buses = new Set();
    const link = (e) => {
        if (seen.has(e.id) || !shown(e.target.slice('cell:'.length)))
            return;
        seen.add(e.id);
        edges.push(e);
    };
    const wire = (port, band, source, target, width = 1, back = false, pointer = false) => ({
        port,
        band,
        pointer,
        width,
        from: back ? target : source,
        to: back ? source : target,
    });
    const chord = chordWidth(result);
    const through = new Set();
    const soundsItself = (c) => c.voice || !!c.mix || c.kit || result.tapes.some((t) => t.name === c.name) || result.returns.some((r) => r.head === c.name);
    const spliced = (c) => {
        const kit = c.over ? result.cells.get(c.over) : undefined;
        return [...c.children.keys(), ...(kit?.implicit && kit.kit ? refsOf(kit) : [])];
    };
    const heard = new Set([...result.cells.values()].filter(soundsItself).map((c) => c.name));
    for (let grew = true; grew;) {
        grew = false;
        for (const c of result.cells.values())
            if (!heard.has(c.name) && c.map?.kind !== 'role' && spliced(c).some((k) => heard.has(k))) {
                heard.add(c.name);
                grew = true;
            }
    }
    const sounds = (name) => heard.has(name);
    const soundOf = (name, seen = new Set()) => {
        const c = result.cells.get(name);
        if (!c || seen.has(name))
            return undefined;
        if (soundsItself(c))
            return name;
        seen.add(name);
        for (const k of spliced(c))
            if (heard.has(k))
                return soundOf(k, seen);
        return undefined;
    };
    const spliceBand = (child) => (sounds(child) ? 'audio' : 'cv');
    const spliceSound = (child) => {
        const sound = sounds(child) ? soundOf(child) : undefined;
        return sound && sound !== child ? { sound } : {};
    };
    for (const c of result.cells.values()) {
        if (!shown(c.name))
            continue;
        const id = cellId(c.name);
        if (c.voice)
            nodes.push({ id, kind: 'voice', depth: depthOf(c.name), cell: c });
        else
            nodes.push({ id, kind: 'cell', depth: depthOf(c.name), cell: c, isMeter: meters.has(c.name) });
        if (c.over && c.over !== VOICE_KIT)
            link({
                id: edgeId(id, cellId(c.over)),
                source: id,
                target: cellId(c.over),
                count: 1,
                transforms: [c.overShift ? [{ kind: 'delay', by: -c.overShift, unit: 'step' }] : []],
                ...wire('over', 'cv', id, cellId(c.over), entries(result, c.over), true, true),
            });
        const voiceKit = c.over ? result.cells.get(c.over) : undefined;
        if (voiceKit?.implicit && voiceKit.kit) {
            const members = voiceKit.units.map((u) => (u.atom.kind === 'ref' ? u.atom.name : ''));
            const written = new Map();
            for (const a of c.units.flatMap((u) => leaves(u.atom)))
                for (const i of a.kind === 'note' ? [a.value] : a.kind === 'chord' ? a.notes : [])
                    written.set(members[i], (written.get(members[i]) ?? 0) + 1);
            for (const [child, count] of written)
                link({
                    id: edgeId(id, cellId(child)),
                    source: id,
                    target: cellId(child),
                    count,
                    transforms: Array.from({ length: count }, () => []),
                    ...spliceSound(child),
                    ...wire('braid', spliceBand(child), id, cellId(child), 1, true, true),
                });
        }
        if (typeof c.params.couple === 'string' && result.cells.has(c.params.couple))
            link({
                id: edgeId(id, cellId(c.params.couple)),
                source: id,
                target: cellId(c.params.couple),
                count: 1,
                transforms: AS_IS,
                ...wire('couple', 'audio', id, cellId(c.params.couple), 1, true),
            });
        if (typeof c.params.excite === 'string' && result.cells.has(c.params.excite))
            link({
                id: edgeId(cellId(c.params.excite), id),
                source: cellId(c.params.excite),
                target: id,
                count: 1,
                transforms: AS_IS,
                ...wire('excite', 'audio', cellId(c.params.excite), id),
            });
        if (typeof c.params.write === 'string' && result.cells.has(c.params.write))
            link({
                id: edgeId(cellId(c.params.write), id),
                source: cellId(c.params.write),
                target: id,
                count: 1,
                transforms: AS_IS,
                ...wire('write', sounds(c.params.write) ? 'audio' : 'cv', cellId(c.params.write), id, chord(c.params.write)),
            });
        if (typeof c.params.play === 'string' && result.cells.has(c.params.play))
            link({
                id: edgeId(cellId(c.params.play), id),
                source: cellId(c.params.play),
                target: id,
                count: 1,
                transforms: typeof c.params.at === 'number' ? [[{ kind: 'delay', by: c.params.at, unit: 'second' }]] : AS_IS,
                ...wire('play', sounds(c.params.play) ? 'audio' : 'cv', cellId(c.params.play), id, chord(c.params.play)),
            });
        for (const [port, own] of [
            ['env', c.env],
            ['pitch', c.pitch],
        ])
            if (own && result.cells.has(own))
                link({ id: edgeId(cellId(own), id), source: cellId(own), target: id, count: 1, transforms: AS_IS, ...wire(port, 'cv', cellId(own), id, chord(own)) });
        if (c.map?.kind === 'table' && result.cells.has(c.map.table)) {
            const table = cellId(c.map.table);
            link({
                id: clockTapId(table, id, 'map'),
                source: table,
                target: id,
                count: 1,
                transforms: AS_IS,
                ...wire('map', 'cv', table, id, entries(result, c.map.table), false, true),
            });
        }
        if (typeof c.params.fm === 'string' && result.cells.has(c.params.fm))
            link({ id: edgeId(cellId(c.params.fm), id), source: cellId(c.params.fm), target: id, count: 1, transforms: AS_IS, ...wire('fm', 'audio', cellId(c.params.fm), id) });
        for (const [key, pc] of Object.entries(c.paramCells ?? {}))
            for (const f of pc.factors)
                if (result.cells.has(f))
                    link({ id: edgeId(cellId(f), id), source: cellId(f), target: id, count: 1, transforms: AS_IS, ...wire(key, 'cv', cellId(f), id) });
        for (const [child, count] of c.children) {
            if (isMidiCard(c)) {
                link({ id: edgeId(id, cellId(child)), source: id, target: cellId(child), count, transforms: AS_IS, ...wire('midi', 'cv', id, cellId(child), 1, true) });
                continue;
            }
            if (c.map?.kind === 'role') {
                link({ id: edgeId(id, cellId(child)), source: id, target: cellId(child), count, transforms: AS_IS, ...wire('braid', 'none', id, cellId(child), 1, true, true) });
                continue;
            }
            const gate = result.cells.get(child);
            if (gate?.gate && spliceBand(child) === 'audio') {
                through.add(edgeId(id, cellId(child)));
                for (const r of gateVoices(result, gate)) {
                    const v = cellId(r.name);
                    link({
                        id: edgeId(id, v),
                        source: id,
                        target: v,
                        count,
                        transforms: AS_IS,
                        sound: r.name,
                        routes: [[edgeId(cellId(r.via), cellId(child))], [edgeId(id, cellId(child))]],
                        ...wire('braid', 'audio', id, v, 1, true),
                    });
                }
                continue;
            }
            link({
                id: edgeId(id, cellId(child)),
                source: id,
                target: cellId(child),
                count,
                transforms: c.units.flatMap((u) => leaves(u.atom).flatMap((a) => (a.kind === 'ref' && a.name === child ? [refTransform(a)] : []))),
                ...spliceSound(child),
                ...wire('braid', spliceBand(child), id, cellId(child), chord(child), true, true),
            });
        }
        const scale = c.over ? result.cells.get(c.over) : undefined;
        const tonic = c.tonic ?? (scale?.implicit ? scale.tonic : undefined);
        if (tonic && result.cells.has(tonic) && shown(tonic))
            link({
                id: edgeId(id, cellId(tonic)),
                source: id,
                target: cellId(tonic),
                count: 1,
                transforms: AS_IS,
                ...wire('braid', 'cv', id, cellId(tonic), 1, true, true),
            });
        for (const target of c.about)
            if (result.cells.has(target))
                link({ id: edgeId(id, cellId(target)), source: id, target: cellId(target), count: 1, transforms: AS_IS, ...wire('about', 'none', id, cellId(target)) });
        if (c.base && result.cells.has(c.base.name)) {
            const from = cellId(c.base.name);
            const ref = {
                pick: null,
                shift: 0,
                ...(c.base.transpose ? { transpose: c.base.transpose } : {}),
                ...(c.base.degree ? { values: { mul: 1, add: c.base.degree } } : {}),
            };
            link({ id: edgeId(from, id), source: from, target: id, count: 1, transforms: [refTransform(ref)], ...wire('base', 'none', from, id, 1, false, true) });
        }
        const table = result.sections?.get(c.name);
        if (c.step && table && !buses.has(table)) {
            buses.add(table);
            link({
                id: stepEdgeId(cellId(table), cellId(c.step.driver)),
                source: cellId(table),
                target: cellId(c.step.driver),
                count: 1,
                transforms: [rateOf(c)],
                ...wire('step', 'sync', cellId(table), cellId(c.step.driver), 1, true),
            });
        }
        else if (c.step && !table)
            link({
                id: stepEdgeId(id, cellId(c.step.driver)),
                source: id,
                target: cellId(c.step.driver),
                count: 1,
                transforms: [rateOf(c)],
                ...beltOf(c, result.cells.get(c.step.driver)),
                ...wire('step', 'sync', id, cellId(c.step.driver), 1, true),
            });
        for (const [key, k] of Object.entries(c.paramClocks))
            if (result.cells.has(k.driver))
                link({
                    id: clockTapId(id, cellId(k.driver), key),
                    source: id,
                    target: cellId(k.driver),
                    count: 1,
                    transforms: [rateTransform(k)],
                    ...wire(key, 'sync', id, cellId(k.driver), 1, true),
                });
    }
    const junctions = [];
    const stacks = new Set();
    for (const c of result.cells.values()) {
        const g = c.gate;
        if (!g)
            continue;
        const into = cellId(c.name);
        const receivers = gateVoices(result, c);
        const flows = [...new Set(receivers.map((r) => edgeId(cellId(r.via), into)))];
        for (const f of flows)
            through.add(f);
        const stack = g.lines?.length ? result.cells.get(g.notes) : undefined;
        const members = stack ? g.lines.map((l) => l.line).filter((n) => result.cells.has(n)) : [];
        const pairsOf = (name) => receivers.flatMap((r) => soundsOf(result, r.via).map((v) => edgeId(cellId(name), cellId(v))));
        const intoVoices = (name) => receivers.flatMap((r) => [r.name, ...(result.cells.get(r.name)?.kit ? [VOICE_KIT] : [])].map((v) => edgeId(cellId(name), cellId(v))));
        const intoGate = members.map((m) => edgeId(cellId(m), into));
        for (const id of intoGate)
            through.add(id);
        for (const { name, port } of [{ name: g.notes, port: g.port }, ...g.levels]) {
            if (!result.cells.has(name))
                continue;
            const pairs = [...pairsOf(name), ...(name === g.notes ? members.flatMap((m) => [...pairsOf(m), ...intoVoices(m)]) : [])];
            for (const id of pairs)
                through.add(id);
            link({
                id: edgeId(cellId(name), into),
                source: cellId(name),
                target: into,
                count: 1,
                transforms: AS_IS,
                ...(receivers[0] ? { sound: receivers[0].name } : {}),
                routes: [pairs, name === g.notes ? [...flows, ...intoGate] : flows],
                ...wire(port, 'cv', cellId(name), into, name === g.notes ? chord(name) : 1),
            });
        }
        if (stack && !stacks.has(stack.name)) {
            stacks.add(stack.name);
            const lines = new Set(g.lines.map((l) => l.line));
            const into = cellId(stack.name);
            for (const u of stack.units) {
                if (u.atom.kind !== 'mix')
                    continue;
                for (const e of u.atom.exprs)
                    for (const r of e.k === 'ref' ? [e.ref] : e.k === 'prod' ? e.factors.flatMap((f) => (f.k === 'ref' ? [f.ref] : [])) : []) {
                        if (!result.cells.has(r.name))
                            continue;
                        const port = lines.has(r.name) ? 'play' : 'level';
                        const from = cellId(r.name);
                        for (const id of [...pairsOf(r.name), ...intoVoices(r.name)])
                            through.add(id);
                        link({
                            id: edgeId(from, into),
                            source: from,
                            target: into,
                            count: 1,
                            transforms: [refTransform(r)],
                            routes: [[...pairsOf(r.name), ...intoVoices(r.name), ...(port === 'play' ? [edgeId(from, cellId(c.name))] : [])]],
                            ...wire(port, 'cv', from, into, port === 'play' ? chord(r.name) : 1),
                        });
                    }
            }
        }
        const notes = result.cells.has(g.notes) ? g.notes : null;
        for (const r of receivers) {
            const v = cellId(r.name);
            const pairs = notes ? [notes, ...members].flatMap((n) => soundsOf(result, r.via).map((x) => edgeId(cellId(n), cellId(x)))) : [];
            link({
                id: edgeId(into, v),
                source: into,
                target: v,
                count: 1,
                transforms: AS_IS,
                sound: r.name,
                ...(notes ? { notes } : {}),
                routes: pairs.length ? [pairs, [edgeId(cellId(r.via), into), ...intoGate]] : [[edgeId(cellId(r.via), into), ...intoGate]],
                ...wire('voice', 'cv', into, v, notes ? chord(notes) : 1),
            });
        }
    }
    const product = (c, b, entry, port) => {
        if (!result.cells.has(b.voice.name))
            return;
        const voice = cellId(b.voice.name);
        const into = cellId(c.name);
        const width = c.sink && c.units.length === 2 ? 2 : 1;
        const band = port === 'midi' ? 'cv' : 'audio';
        const gain = [b.gain !== 1 ? [{ kind: 'gain', by: b.gain }] : []];
        const flow = edgeId(voice, into);
        const terms = b.pitches.filter((t) => result.cells.has(t.ref.name));
        const gate = result.cells.get(b.voice.name);
        if (!terms.length && port === 'mix' && gate.gate) {
            through.add(flow);
            for (const r of gateVoices(result, gate)) {
                const v = cellId(r.name);
                link({
                    id: edgeId(v, into),
                    source: v,
                    target: into,
                    count: 1,
                    transforms: gain,
                    sound: r.name,
                    routes: [[edgeId(cellId(r.via), voice), ...(gate.gate.lines ?? []).map((l) => edgeId(cellId(l.line), voice))], [flow]],
                    ...wire(port, band, v, into, width),
                });
            }
            return;
        }
        if (!terms.length) {
            link({ id: flow, source: voice, target: into, count: 1, transforms: gain, ...wire(port, band, voice, into, width) });
            return;
        }
        const j = junctionId(c.name, entry);
        const tags = c.tags.length ? c.tags : (result.cells.get(b.voice.name)?.tags ?? []);
        through.add(flow);
        const sound = b.voice.name;
        const voices = soundsOf(result, b.voice.name);
        const byTerm = new Map();
        for (const t of terms)
            byTerm.set(t.ref.name, [...(byTerm.get(t.ref.name) ?? []), t]);
        const startsAt = (t) => result.outputs.some((o) => {
            const at = `${o.voice}:${o.cell}:${t.ref.span.line}:${t.ref.span.col}`;
            return o.id === at || o.id.startsWith(at + '@');
        });
        const starter = terms.find(startsAt) ?? terms.find((t) => result.outputs.some((o) => voices.includes(o.voice) && (o.tape?.head ?? o.cell) === t.ref.name && !o.gate));
        const portOf = (name, inSum) => {
            const c0 = result.cells.get(name);
            return starter?.ref.name === name ? 'voice' : c0.map?.kind === 'adsr' ? 'env' : isLevel(c0, inSum) ? 'level' : 'pitch';
        };
        const levels = [...byTerm].flatMap(([name, ts]) => (portOf(name, !!ts[0].inSum) === 'level' ? [name] : []));
        junctions.push({
            id: j,
            kind: 'junction',
            depth: depthOf(b.voice.name),
            mix: c.name,
            entry,
            voice: b.voice.name,
            tags,
            notes: starter?.ref.name ?? null,
            levels,
            gain: b.gain,
        });
        for (const [name, ts] of byTerm) {
            const t = ts[0];
            const lead = !!starter && starter.ref.name === name;
            const port = portOf(name, !!t.inSum);
            const pairs = voices.map((v) => edgeId(cellId(name), cellId(v)));
            for (const id of pairs)
                through.add(id);
            link({
                id: edgeId(cellId(name), j),
                source: cellId(name),
                target: j,
                count: ts.length,
                transforms: ts.map((x) => [
                    ...refTransform({ ...x.ref, sign: port === 'level' || port === 'env' ? 1 : x.sign }),
                    ...(lead && x === t && b.offset ? [{ kind: 'transpose', by: b.offset, unit: 'semitone' }] : []),
                ]),
                sound,
                routes: [pairs, [flow]],
                ...wire(port, port === 'pitch' && isWave(result, name) ? 'audio' : 'cv', cellId(name), j, lead ? tines(result, b.voice.name) || chord(name) : port === 'env' ? 1 : chord(name)),
            });
        }
        const notesWidth = starter ? tines(result, b.voice.name) || chord(starter.ref.name) : 1;
        link({
            id: edgeId(j, voice),
            source: j,
            target: voice,
            count: 1,
            transforms: AS_IS,
            sound,
            ...(starter ? { notes: starter.ref.name } : {}),
            routes: [[flow]],
            ...wire('is', 'cv', j, voice, notesWidth),
        });
        const twins = (port === 'midi' ? (c.chords ?? []).flatMap((bs) => bs ?? []) : (c.mix ?? [])).filter((x) => x.voice.name === b.voice.name).length;
        through.delete(flow);
        link({ id: flow, source: voice, target: into, count: 1, transforms: twins > 1 ? AS_IS : gain, sound, routes: [[flow]], ...wire(port, band, voice, into) });
    };
    for (const c of result.cells.values()) {
        if (!c.gate)
            (c.mix ?? []).forEach((b, entry) => product(c, b, entry, 'mix'));
        (c.chords ?? []).flatMap((bs) => bs ?? []).forEach((b, entry) => product(c, b, entry, 'midi'));
    }
    const sounding = (o) => o.through[0] ?? o.voice;
    const pans = new Map();
    result.outputs.forEach((o) => {
        const g = pans.get(sounding(o)) ?? [0, 0];
        pans.set(sounding(o), [g[0] + o.gains[0], g[1] + o.gains[1]]);
    });
    const order = [...new Set(result.outputs.map(sounding))];
    const placed = nodes.map((n) => {
        if (!n.cell || !pans.has(n.cell.name))
            return n;
        const [l, r] = pans.get(n.cell.name);
        return { ...n, pan: l + r > 0 ? (r - l) / (l + r) : 0, order: Math.max(0, order.indexOf(n.cell.name)) };
    });
    return { nodes: [...placed, ...junctions], edges, through };
}
const isLevel = (c, inSum) => c.map?.kind === 'amp' || c.map?.kind === 'db' || (c.map?.kind === 'lin' && !inSum);
function gateVoices(result, c) {
    const vias = new Set((c.mix ?? []).map((b) => b.voice.name));
    const kit = `${c.name}:kit`;
    const via = (name) => vias.has(name) ? name : vias.has(kit) ? kit : result.cells.get(name)?.kit && [...vias].some((v) => soundsOf(result, v).includes(VOICE_KIT)) ? VOICE_KIT : name;
    return (c.gate?.receivers ?? []).filter((r) => result.cells.has(r)).map((name) => ({ name, via: via(name) }));
}
function soundsOf(result, name, guard = 0) {
    const c = result.cells.get(name);
    if (c?.mix && !c.sink && guard < 16)
        return c.mix.flatMap((b) => soundsOf(result, b.voice.name, guard + 1));
    const kit = c?.over ? result.cells.get(c.over) : undefined;
    return [kit?.kit ? kit.name : name];
}
const rateOf = (c) => rateTransform(c.step, typeof c.params.belt === 'number' ? c.params.belt : undefined);
function rateTransform(s, belt) {
    if (!s.chain.length && !s.cycle && !s.whole && belt === undefined)
        return [];
    const tap = belt !== undefined ? s.tap : undefined;
    return [{ kind: 'rate', by: s.chain, per: s.cycle ? 'cycle' : 'step', whole: s.whole, ...(belt !== undefined ? { belt } : {}), ...(tap ? { tap } : {}) }];
}
function beltOf(driven, driver) {
    if (typeof driven.params.belt === 'number')
        return { belt: 'spring' };
    return driver && isTurntable(driven) && isTurntable(driver) ? { belt: 'rigid' } : {};
}
const tines = (result, name) => {
    const c = result.cells.get(name);
    return typeof c?.params.body === 'string' && (c.exciters?.length ?? 0) > 1 ? c.exciters.length : 0;
};
function chordWidth(result) {
    const memo = new Map();
    const of = (name, guard = 0) => {
        const hit = memo.get(name);
        if (hit !== undefined)
            return hit;
        const width = (a) => a.kind === 'chord'
            ? a.notes.length
            : a.kind === 'ref' && guard < 64
                ? of(a.name, guard + 1)
                : a.kind === 'seq'
                    ? a.layers.reduce((n, l) => n + Math.max(1, ...l.map((t) => width(t.atom))), 0)
                    : 1;
        let w = 1;
        for (const u of result.cells.get(name)?.units ?? [])
            w = Math.max(w, width(u.atom));
        memo.set(name, w);
        return w;
    };
    return (name) => of(name);
}
const entries = (result, name) => {
    const c = result.cells.get(name);
    return Math.max(1, c?.cycle || c?.units.length || 1);
};
const isWave = (result, name) => {
    const c = result.cells.get(name);
    return !!c && !c.voice && !c.step && [...result.clocks.values()].some((k) => k.cell === name) && c.freq >= 20;
};
const BUS_PORTS = new Set(['over', 'voice', 'mix']);
const DELAY_PORTS = new Set(['braid', 'play']);
const isDelayed = (e) => e.transforms.some((t) => t.some((s) => s.kind === 'delay'));
export function netsOf(nodes, edges) {
    const meters = new Set(nodes.flatMap((n) => (n.kind === 'cell' && n.isMeter ? [n.id] : [])));
    const groups = new Map();
    for (const e of edges) {
        const port = BUS_PORTS.has(e.port) || DELAY_PORTS.has(e.port) ? e.port : e.band === 'sync' && !e.belt && (meters.has(e.target) || (e.bulb && e.port === 'step')) ? 'step' : null;
        if (!port)
            continue;
        const at = `${e.from}|${port}|${e.bulb ?? ''}`;
        const g = groups.get(at) ?? { port, readers: [] };
        g.readers.push(e);
        groups.set(at, g);
    }
    return [...groups.values()]
        .filter(({ port, readers }) => (readers.length > 1 || port === 'step') && (!DELAY_PORTS.has(port) || readers.some(isDelayed)))
        .map(({ port, readers }) => {
        const { bulb, bulbAt } = readers[0];
        return {
            id: `net:${readers[0].from}:${port}${bulb ? `:${bulb}` : ''}`,
            owner: readers[0].from,
            port,
            band: readers[0].band,
            readers: readers.map((e) => e.id),
            delayed: readers.some(isDelayed),
            ...(bulb ? { bulb } : {}),
            ...(bulbAt ? { bulbAt } : {}),
        };
    });
}
export function structureKey(model) {
    return [...model.nodes.map((n) => n.id).sort(), '|', ...model.edges.map((e) => e.id).sort()].join(' ');
}

import { BAR_4_4 } from "./style.js";
export const QUALITY_STACKS = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    diminished: [0, 3, 6],
    augmented: [0, 4, 8],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    '5': [0, 7],
    '6': [0, 4, 7, 9],
    m6: [0, 3, 7, 9],
    '7': [0, 4, 7, 10],
    maj7: [0, 4, 7, 11],
    m7: [0, 3, 7, 10],
    mMaj7: [0, 3, 7, 11],
    m7b5: [0, 3, 6, 10],
    dim7: [0, 3, 6, 9],
    '9': [0, 4, 7, 10, 14],
    maj9: [0, 4, 7, 11, 14],
    m9: [0, 3, 7, 10, 14],
    add9: [0, 4, 7, 14],
};
const pc = (note) => ((note % 12) + 12) % 12;
const QUALITIES = Object.entries(QUALITY_STACKS).map(([name, stack]) => ({ name, tones: new Set(stack.map((x) => x % 12)), size: stack.length }));
export function chordOf(pcs, bass) {
    const roots = [...(bass !== null && pcs.has(bass) ? [bass] : []), ...[...pcs].filter((r) => r !== bass)];
    let best = null;
    roots.forEach((root, order) => {
        const offsets = new Set([...pcs].map((x) => pc(x - root)));
        for (const { name, tones, size } of QUALITIES) {
            if ([...offsets].some((x) => !tones.has(x)))
                continue;
            const absent = [...tones].filter((x) => !offsets.has(x));
            if (absent.some((x) => x !== 7))
                continue;
            const found = { chord: { root, quality: name }, missing: absent.length, size, order };
            if (!best || found.missing < best.missing || (found.missing === best.missing && (found.order < best.order || (found.order === best.order && found.size > best.size))))
                best = found;
        }
    });
    return best ? best.chord : null;
}
export function readChords(notes, bar = BAR_4_4) {
    const half = bar.steps / 2;
    const anticipationFrom = bar.steps - 2;
    const pitched = notes.filter((n) => n.note !== undefined);
    const chords = [];
    for (const h of [0, 1]) {
        const inHalf = (n) => Math.floor(n.step / half) === h;
        const comp = pitched.filter((n) => (n.part === 'pad' || n.part === 'stab') && inHalf(n) && n.step < anticipationFrom);
        if (comp.length === 0) {
            chords.push(h === 1 ? (chords[0] ?? null) : null);
            continue;
        }
        const bass = pitched.filter((n) => n.part === 'bass' && inHalf(n)).sort((a, b) => a.step - b.step)[0];
        chords.push(chordOf(new Set(comp.map((n) => pc(n.note))), bass ? pc(bass.note) : null));
    }
    return chords;
}
const FULL_RATE = 2;
export function readHarm(notes, previous, bar = BAR_4_4) {
    const chords = readChords(notes, bar).filter((c) => c !== null);
    if (chords.length === 0)
        return undefined;
    const line = previous ? [previous, ...chords] : chords;
    const changes = line.slice(1).filter((c, i) => c.root !== line[i].root || c.quality !== line[i].quality);
    const rate = Math.min(1, changes.length / FULL_RATE);
    const richness = chords.reduce((sum, c) => sum + Math.min(1, (QUALITY_STACKS[c.quality].length - 3) / 2), 0) / chords.length;
    return { harm: (rate + richness) / 2, chords };
}

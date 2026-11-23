import { planOf } from "./host.js";
import { declarations } from "../repository/fit.js";
import { noteOf } from "./midi.js";
import { eventsBetween } from "./realize.js";
const unused = (taken, base) => {
    let name = base;
    for (let k = 2; taken.has(name); k++)
        name = `${base}${k}`;
    return name;
};
function readingFor(text, chord, readChord = true) {
    const taken = new Set(declarations(text).map((l) => l.name));
    const tap = unused(taken, '_barTap');
    const barV = unused(taken, '_barV');
    const chordV = unused(taken, '_chordV');
    const bars = unused(taken, '_bars');
    const chords = unused(taken, '_chords');
    const cell = chord?.replace(/^&/, '');
    const read = readChord && cell !== undefined;
    const lines = [
        `&${tap} step=1m 0`,
        `&${barV} loop=C4`,
        `&${bars} map=sample [&${tap} * &${barV}]`,
        ...(read ? [`&${chordV} loop=C4`, `&${chords} map=sample [&${cell} * &${chordV}]`] : []),
    ];
    return { lines, barV, chordV, read };
}
export function readBack(text, { to, chord, resolve }) {
    const compile = (readChord) => {
        const reading = readingFor(text, chord, readChord);
        return { ...reading, plan: planOf([text, ...reading.lines].join('\n'), undefined, resolve ? { resolve } : {}) };
    };
    let made = compile(true);
    if (made.read && made.plan.result.unknown.some((u) => `&${u.name}` === `&${chord.replace(/^&/, '')}`))
        made = compile(false);
    const { plan, barV, chordV, read } = made;
    const events = eventsBetween(plan, 0, to, true).filter((e) => e.voice === barV || (read && e.voice === chordV));
    const barStarts = [...new Set(events.filter((e) => e.voice === barV).map((e) => e.at))].sort((a, b) => a - b);
    const byAt = new Map();
    for (const e of events)
        if (e.voice === chordV)
            byAt.set(e.at, [...(byAt.get(e.at) ?? []), noteOf(e.freq).note]);
    return {
        plan,
        barStarts,
        chords: [...byAt].sort(([a], [b]) => a - b).map(([at, notes]) => ({ at, notes: notes.sort((a, b) => a - b) })),
    };
}

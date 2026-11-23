import { channelTable, midiNote, router, routesOf } from "./midi.js";
import { readerOf } from "./perform/feel.js";
import { windowAt } from "./schedule.js";
export function notesOf(p, { from = 0, to, outputs }) {
    const route = router(p.result, channelTable(p.result, outputs));
    const read = readerOf(p.result);
    return windowAt(p, from, to - from).events.flatMap((e) => routesOf(route(e)).flatMap((r) => {
        const note = midiNote(e, r);
        return note ? [{ ...note, output: e.output, voice: e.voice, reading: read(e.output) }] : [];
    }));
}

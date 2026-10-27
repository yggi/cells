import { BASS_FRAGMENTS } from "./bass.js";
import { HARMONY_FRAGMENTS } from "./harmony.js";
import { INSTRUMENT_FRAGMENTS } from "./instruments.js";
import { METER_FRAGMENTS } from "./meters.js";
import { MODE_FRAGMENTS } from "./modes.js";
import { PERFORMER_FRAGMENTS } from "./performers.js";
import { RHYTHM_FRAGMENTS } from "./rhythms.js";
import { STAB_FRAGMENTS } from "./stab.js";
import { MOTIF_FRAGMENTS } from "./motifs.js";
import { FORM_FRAGMENTS } from "./forms.js";
export const LIBRARY = [
    ...METER_FRAGMENTS,
    ...RHYTHM_FRAGMENTS,
    ...BASS_FRAGMENTS,
    ...HARMONY_FRAGMENTS,
    ...INSTRUMENT_FRAGMENTS,
    ...MODE_FRAGMENTS,
    ...PERFORMER_FRAGMENTS,
    ...STAB_FRAGMENTS,
    ...MOTIF_FRAGMENTS,
    ...FORM_FRAGMENTS,
];
const BY_ID = new Map(LIBRARY.map((f) => [f.id, f.text]));
export const resolveSeed = (id) => BY_ID.get(id) ?? null;

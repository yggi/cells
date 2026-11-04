import { RENAMED_IDS } from "../engine/renamed.js";
import { SEED } from "./seed.js";
import { BASS_FRAGMENTS } from "./bass.js";
import { HARMONY_FRAGMENTS } from "./harmony.js";
import { EXPRESSION_FRAGMENTS } from "./expression.js";
import { INSTRUMENT_FRAGMENTS } from "./instruments.js";
import { METER_FRAGMENTS } from "./meters.js";
import { MODE_FRAGMENTS } from "./modes.js";
import { PERFORMER_FRAGMENTS } from "./performers.js";
import { RHYTHM_FRAGMENTS } from "./rhythms.js";
import { STAB_FRAGMENTS } from "./stab.js";
import { MOTIF_FRAGMENTS } from "./motifs.js";
import { FORM_FRAGMENTS } from "./forms.js";
import { BAND_FRAGMENTS } from "./bands.js";
import { STYLE_FRAGMENTS } from "./styles.js";
export const LIBRARY = [
    ...METER_FRAGMENTS,
    ...RHYTHM_FRAGMENTS,
    ...BASS_FRAGMENTS,
    ...HARMONY_FRAGMENTS,
    ...INSTRUMENT_FRAGMENTS,
    ...EXPRESSION_FRAGMENTS,
    ...MODE_FRAGMENTS,
    ...PERFORMER_FRAGMENTS,
    ...STAB_FRAGMENTS,
    ...MOTIF_FRAGMENTS,
    ...FORM_FRAGMENTS,
    ...BAND_FRAGMENTS,
    ...STYLE_FRAGMENTS,
];
export const RETIRED = new Map([
    ['core kit', 'use &bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit'],
    ['gm kit', 'use * from gm_kit'],
]);
const CURRENT = new Map([...SEED.map((f) => [f.fragment.id, f.fragment.text]), ...LIBRARY.map((f) => [f.id, f.text])]);
const RENAMED = [...RENAMED_IDS].map(([old, word]) => [old, CURRENT.get(word)]);
const BY_ID = new Map([...CURRENT, ...RENAMED, ...RETIRED]);
export const resolveSeed = (id) => BY_ID.get(id) ?? null;

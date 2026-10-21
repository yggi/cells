import { BASS_FRAGMENTS } from "./bass.js";
import { HARMONY_FRAGMENTS } from "./harmony.js";
import { INSTRUMENT_FRAGMENTS } from "./instruments.js";
import { METER_FRAGMENTS } from "./meters.js";
import { MODE_FRAGMENTS } from "./modes.js";
import { RHYTHM_FRAGMENTS } from "./rhythms.js";
export const LIBRARY = [...METER_FRAGMENTS, ...RHYTHM_FRAGMENTS, ...BASS_FRAGMENTS, ...HARMONY_FRAGMENTS, ...INSTRUMENT_FRAGMENTS, ...MODE_FRAGMENTS];

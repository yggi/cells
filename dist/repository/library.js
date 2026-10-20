import { BASS_FRAGMENTS } from "./bass.js";
import { HARMONY_FRAGMENTS } from "./harmony.js";
import { METER_FRAGMENTS } from "./meters.js";
import { RHYTHM_FRAGMENTS } from "./rhythms.js";
export const LIBRARY = [...METER_FRAGMENTS, ...RHYTHM_FRAGMENTS, ...BASS_FRAGMENTS, ...HARMONY_FRAGMENTS];

const axis = (name, range, label, ends) => ({
    name,
    range,
    label,
    ends,
    sentence: `${ends[0][0].toUpperCase()}${ends[0].slice(1)} (${range[0]}) to ${ends[1]} (${range[1]}).`,
});
export const AXES = [
    axis('sync', [0, 1], 'Syncopation', ['on the beat', 'offbeat']),
    axis('harm', [0, 1], 'Harmony', ['static', 'moving']),
    axis('bite', [0, 1], 'Bite', ['paddy', 'stabby']),
    axis('mood', [0, 1], 'Mood', ['darker', 'brighter']),
];
export const BRIGHTNESS = {
    lydian: 1,
    ionian: 0.875,
    mixolydian: 0.75,
    dorian: 0.5,
    harmonic_minor: 0.375,
    aeolian: 0.25,
    phrygian: 0.125,
    locrian: 0,
};
export const MOOD_TENSION = 0.25;
export const moodOf = (mode, tension = MOOD_TENSION) => Math.round((0.6 * BRIGHTNESS[mode] + 0.4 * (1 - tension)) * 1e6) / 1e6;
export const AXIS_NAMES = AXES.map((a) => a.name);
export const SLOTS = {
    adsr: ['attack', 'decay', 'sustain', 'release'],
    style: AXIS_NAMES,
};
export const STYLE = 'style';
export const CENTRE = AXES.map((a) => (a.range[0] + a.range[1]) / 2);

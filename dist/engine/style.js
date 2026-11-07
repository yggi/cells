const axis = (name, range, label, ends) => ({
    name,
    range,
    label,
    ends,
    sentence: `${ends[0][0].toUpperCase()}${ends[0].slice(1)} (${range[0]}) to ${ends[1]} (${range[1]}).`,
});
export const AXES = [
    axis('sync', [0, 1], 'Syncopation', ['on the beat', 'off the beat']),
    axis('harm', [0, 1], 'Harmony', ['a static vamp', 'moving, rich harmony']),
    axis('artic', [0, 1], 'Articulation', ['legato', 'staccato']),
    axis('energy', [0, 1], 'Energy', ['sparse', 'dense']),
];
export const AXIS_NAMES = AXES.map((a) => a.name);
export const SLOTS = {
    adsr: ['attack', 'decay', 'sustain', 'release'],
    style: AXIS_NAMES,
};
export const STYLE = 'style';
export const CENTRE = AXES.map((a) => (a.range[0] + a.range[1]) / 2);

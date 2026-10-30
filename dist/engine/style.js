export const AXES = [
    { name: 'sync', range: [0, 1], sentence: 'On the beat (0) to off the beat (1).' },
    { name: 'harm', range: [0, 1], sentence: 'A static vamp (0) to moving, rich harmony (1).' },
    { name: 'artic', range: [0, 1], sentence: 'Legato (0) to staccato (1).' },
    { name: 'energy', range: [0, 1], sentence: 'Sparse (0) to dense (1).' },
];
export const AXIS_NAMES = AXES.map((a) => a.name);
export const SLOTS = {
    adsr: ['attack', 'decay', 'sustain', 'release'],
    style: AXIS_NAMES,
};

export const cellId = (name) => `cell:${name}`;
export const edgeId = (source, target) => `${source}->${target}`;
export const stepEdgeId = (source, target) => `${source}~>${target}`;
export const clockTapId = (source, target, key) => `${source}~${key}>${target}`;
export const junctionId = (mix, entry) => `junction:${mix}:${entry}`;
export const isJunction = (id) => id.startsWith('junction:');

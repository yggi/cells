import { seedFragments } from "./seed.js";
export const SECTION_KINDS = seedFragments('sections').map((f) => f.id);
export const isSectionKind = (v) => typeof v === 'string' && SECTION_KINDS.includes(v);

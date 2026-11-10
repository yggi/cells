import { headsOf, playedHeadsOf } from "./audition.js";
export const drumCard = (...parts) => {
    const heads = parts.flatMap((p) => (typeof p === 'string' ? playedHeadsOf(p) : p));
    return heads.length ? `&drumCard map=midi(10) [${heads.map((h) => `&${h}`).join(', ')}]` : '';
};
export const bassCards = (part, head = headsOf(part)[0]) => `&bassCard map=midi(2) [&${head} * &bassV]\n&bassSound map=sample [&${head} * &bassV]`;

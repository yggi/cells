import { AXIS_NAMES } from "./style.js";
const PLACED = /&?(scale:|key:)?λ(\d+)_(\d+)/g;
const AXIS = /&?λ([A-Za-z_][A-Za-z0-9_]*)_(\d+)/g;
export function spoken(message) {
    if (!message.includes('λ'))
        return message;
    return message
        .replace(PLACED, (_, kind, line, col) => `the ${kind ? 'scale' : 'cell'} at line ${line}, column ${col}`)
        .replace(AXIS, (_, style, i) => `&${style}'s ${AXIS_NAMES[Number(i)] ?? `axis ${i}`}`);
}

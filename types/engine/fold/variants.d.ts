/**
 * A disentangler (docs/notes/fold.md): lifting's predict and update. A long phrase that comes back nearly the same — a
 * step changed, the last note held longer, transposed or not — is the phrase (the prediction) and what differs there
 * (the residual): written once as a cell of its own, the phrase at its own length, and at each return as that cell
 * spliced (`&m1^$-12`) or, where steps differ, a copy of it with the steps that do (`&v1 base=&m1 =!3 12@2`, decision
 * 026). BWV 847's subject, entered seven times, each a little bent.
 */
import type { Tool } from './ir';
/** Each line's steps compared in shape: the key, and the base against the first pitched step's. */
export declare const variants: Tool;

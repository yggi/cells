/**
 * Wrappers: a cell whose only job is to read motifs through a shifted table (&mid over=&scale[>>] &down)
 * is those motifs moved by degrees where it is used: degree(&down, 1). Offered when every cell that
 * splices it reads the same table unshifted, and it has nothing else to say (no label, no step).
 */
import { declWords, deleteCell, setBraid, spansLines } from '../edit';
import { measured, samePiece, type Result, type Suggestion } from './harness';

const PLAIN_REF = /^&([A-Za-z_][A-Za-z0-9_]*)$/;

export function wrappers(source: string, result: Result): Suggestion[] {
  const out: Suggestion[] = [];
  for (const w of result.cells.values()) {
    if (!w.over || !w.overShift || w.step || w.label || w.voice || w.mix || w.implicit) continue;
    // its body: an over= and plain references to motifs that read their reader's table
    const body = w.lambda ?? (declWords(source, w.name) ? [...declWords(source, w.name)!.attrs, ...declWords(source, w.name)!.braid].join(' ') : null);
    if (!body || spansLines(source, w.name)) continue;
    const words = body.split(/\s+/).filter(Boolean);
    const motifs = words.filter((x) => !x.startsWith('over='));
    if (words.length - motifs.length !== 1 || motifs.length === 0) continue;
    if (!motifs.every((x) => PLAIN_REF.test(x) && !result.cells.get(PLAIN_REF.exec(x)![1])?.over)) continue;
    const k = w.overShift;
    const moved = motifs.map((x) => `degree(${x}, ${k})`);
    // where it is spliced: every user reads w's table unshifted, and writes it as a step of its own
    const token = w.lambda ? `&(${w.lambda})` : `&${w.name}`;
    const users = [...result.cells.values()].filter((u) => u.units.some((x) => x.atom.kind === 'ref' && x.atom.name === w.name));
    if (!users.length || users.some((u) => u.over !== w.over || u.overShift !== 0 || u.lambda || spansLines(source, u.name))) continue;
    if ([...result.cells.values()].some((c) => c.over === w.name || c.step?.driver === w.name)) continue;
    const apply = (src: string) => {
      let next = src;
      for (const u of users) {
        const braid = declWords(next, u.name)!.braid.flatMap((x) => {
          if (!x.startsWith(token)) return [x];
          const mods = x.slice(token.length);
          if (mods && !/^[!*@?0-9.]+$/.test(mods)) return [x];
          if (mods && moved.length > 1) throw new Error('modifiers on a group');
          return mods ? [moved[0] + mods] : moved;
        });
        next = setBraid(next, u.name, braid);
      }
      return w.lambda ? next : deleteCell(next, w.name);
    };
    const s = measured(source, {
      id: `degree:${w.name}`,
      kind: 'degree',
      title: `${w.lambda ? token : `&${w.name}`} only reads ${motifs.join(' ')} through &${w.over} moved ${k > 0 ? 'up' : 'down'} ${Math.abs(k)}: write ${moved.join(' ')} where it is used`,
      before: token.length > 40 ? token.slice(0, 39) + '…' : token,
      after: moved.join(' '),
      apply,
    });
    if (s && samePiece(source, s.apply(source))) out.push(s);
  }
  return out;
}

// What an attribute acts on (`Role`, attributes.ts), over every cell of every example: the sets of roles the cells have,
// counted. Held so that how they are worked out can change (from the table of kinds, #782 rung 2) and what they are
// can't: a count that moves is a cell an attribute now acts on, or no longer does.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { EXAMPLES } from '../examples';
import { rolesOf } from './roles';
import { resolveSeed } from '../../repository/library';

describe('the roles an attribute acts on, over every example (#782)', () => {
  it('each set of roles, and how many cells have it', () => {
    const count = new Map<string, number>();
    for (const p of Object.values(EXAMPLES)) {
      const result = compileSource(p.source, undefined, { resolve: resolveSeed });
      const roles = rolesOf({ cells: result.cells, clocks: result.clocks, sections: result.sections ?? new Map() });
      for (const c of result.cells.values()) {
        if (c.implicit || c.name === result.builtinCard) continue;
        const key = [...roles(c)].sort().join(' + ') || '(none)';
        count.set(key, (count.get(key) ?? 0) + 1);
      }
    }
    expect(Object.fromEntries([...count].sort())).toMatchInlineSnapshot(`
      {
        "(none)": 833,
        "card": 87,
        "card + clock": 1,
        "carrier + voice": 12,
        "clock": 135,
        "clock + driven": 75,
        "clock + driven + motor": 3,
        "clock + law": 2,
        "clock + motor": 5,
        "driven": 383,
        "driven + section": 65,
        "driven + selector": 12,
        "driven + tape": 6,
        "gate": 20,
        "head": 15,
        "modulator + voice": 11,
        "note": 196,
        "resonator + voice": 15,
        "scope": 10,
        "voice": 346,
      }
    `);
  });
});

/** Phase 8: attributes where they do nothing — each acts on some roles only (attributes.ts): warnings. */
import type { Span } from '../ast';
import { ATTRIBUTES, rolesText, type Role } from '../attributes';
import type { ResolvedCell } from '../compile';
import type { Ctx } from './context';

export function checkRoles(ctx: Ctx): void {
  const { decls, cells, clocks, implicit, warn } = ctx;
  // ---- attributes where they do nothing: each acts on some roles only (attributes.ts)
  const modulators = new Set([...cells.values()].flatMap((c) => (typeof c.params.fm === 'string' ? [c.params.fm] : [])));
  const roles = (c: ResolvedCell): Set<Role> => {
    const r = new Set<Role>();
    if (c.voice) r.add('voice');
    if (clocks.get(c.name) && !clocks.get(c.name)!.belt) r.add('clock');
    if (c.step) r.add('driven');
    if (typeof c.params.motor === 'number') r.add('motor');
    if (typeof c.params.write === 'string') r.add('tape');
    if (typeof c.params.play === 'string') r.add('head');
    if (typeof c.params.body === 'string') r.add('resonator');
    if (typeof c.params.scope === 'string') r.add('scope');
    if (typeof c.params.law === 'string') r.add('law');
    if (c.sink) r.add('card');
    if (c.note) r.add('note');
    if (typeof c.params.fm === 'string') r.add('carrier');
    if (modulators.has(c.name)) r.add('modulator');
    return r;
  };
  for (const d of decls.values()) {
    const c = cells.get(d.name);
    if (!c || implicit.has(d.name)) continue;
    const has = roles(c);
    const written: [string, Span][] = [
      ...Object.keys(d.params).map((k): [string, Span] => [k, d.paramSpans[k] ?? d.span]),
      ...Object.entries(d.paramCells ?? {}).map(([k, pc]): [string, Span] => [k, pc.span]),
      ...Object.entries(d.paramClocks ?? {}).map(([k, st]): [string, Span] => [k, st.span]),
      ...(['env', 'pitch', 'title'] as const).filter((k) => d[k]).map((k): [string, Span] => [k, k === 'title' ? d.span : d[k]!.span]),
    ];
    for (const [k, span] of written) {
      const a = ATTRIBUTES[k];
      if (a?.on && !a.on.some((r) => has.has(r))) warn(`${k}= acts on ${rolesText(a.on)}: on &${d.name} it does nothing`, span);
      else if (a?.value === 'number' && !c.voice && typeof d.params[k] === 'string') warn(`${k}= takes a number: '${d.params[k]}' does nothing`, span);
    }
    // swing pairs the steps of a list; a scan places its own
    if (typeof d.params.swing === 'number' && has.has('clock') && clocks.get(d.name)?.positional)
      warn(`swing= swings a meter written as a list or meter(…); a scan(…) places its steps itself — write the swing into it`, d.paramSpans.swing ?? d.span);
  }
}

/** Phase 5: what the physical and sounding cells refer to, and what their values say — resonators, tapes, FM, moving parameters, envelopes, grids. */
import { BODIES } from '../program';
import { MOVING_PARAMS } from '../attributes';
import type { CellDecl } from '../ast';
import type { Cells, Ctx } from './context';

export function checkCells(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, cells: Cells): void {
  const { error, warn, unknownCell } = ctx;
  // resonators: body= one of the known bodies; couple= another resonator; excite= a mix
  for (const c of cells.values()) {
    const span = (k: string) => decls.get(c.name)?.paramSpans?.[k] ?? decls.get(c.name)!.span;
    if (typeof c.params.body === 'string' && !(c.params.body in BODIES)) error(`body=${c.params.body}: one of ${Object.keys(BODIES).join(', ')}`, span('body'));
    if (typeof c.params.board === 'string' && c.params.board !== 'none' && !(c.params.board in BODIES))
      error(`board=${c.params.board}: none, or one of ${Object.keys(BODIES).join(', ')}`, span('board'));
    if (typeof c.params.couple === 'string') {
      const o = cells.get(c.params.couple);
      if (!o) unknownCell(c.params.couple, span('couple'));
      else if (typeof o.params.body !== 'string') error(`couple=&${o.name}: it couples to another resonator (a cell with body=)`, span('couple'));
    }
    if (typeof c.params.excite === 'string' && !cells.get(c.params.excite)?.mix) error(`excite=&${c.params.excite}: a resonator is driven by sound — a mix`, span('excite'));
  }
  // show=mix:&grid names the grid a mix's colours follow (layout/show.ts heardGrid)
  for (const c of cells.values()) {
    const named = c.show?.startsWith('mix:&') ? c.show.slice('mix:&'.length) : null;
    if (named === null) continue;
    const span = decls.get(c.name)!.span;
    const g = cells.get(named);
    if (!g) unknownCell(named, span);
    else if (!g.root) warn(`show=mix:&${named}: a mix's colours follow a grid (a cell with cycle= or map=edo), not &${named}`, span);
  }
  // tapes: write= names what it records (not a voice); play= names a tape (a cell with write=)
  for (const c of cells.values()) {
    const span = (k: string) => decls.get(c.name)?.paramSpans?.[k] ?? decls.get(c.name)!.span;
    if (typeof c.params.write === 'string') {
      const w = cells.get(c.params.write);
      if (!w) unknownCell(c.params.write, span('write'));
      else if (w.voice) error(`write=&${w.name}: a tape records what plays — a melody, not a voice`, span('write'));
    }
    if (typeof c.params.play === 'string') {
      const t = cells.get(c.params.play);
      if (!t) unknownCell(c.params.play, span('play'));
      else if (typeof t.params.write !== 'string') error(`play=&${t.name}: a read head plays a tape — a cell with write= (what it records)`, span('play'));
    }
  }
  // FM: fm= names a voice; a chain of modulators may not come back round to where it began
  for (const c of cells.values()) {
    const first = c.params.fm;
    if (typeof first !== 'string') continue;
    const span = decls.get(c.name)?.paramSpans?.fm ?? decls.get(c.name)!.span;
    const m = cells.get(first);
    if (!m) unknownCell(first, span);
    else if (!m.voice) error(`fm=&${first}: a modulator is a voice (s=sine ratio=…)`, span);
    else {
      const seen = new Set([c.name]);
      for (let at: string | undefined = first; at; at = typeof cells.get(at)?.params.fm === 'string' ? (cells.get(at)!.params.fm as string) : undefined) {
        if (seen.has(at)) {
          error(`fm=&${first}: the modulators come back round to &${at} — FM chains can't loop`, span);
          break;
        }
        seen.add(at);
      }
    }
  }
  // parameters that move: only those that can, through cells that exist; one envelope at most
  for (const d of decls.values())
    for (const [key, pc] of Object.entries(d.paramCells ?? {})) {
      if (!MOVING_PARAMS.has(key)) error(`${key}= can't move: it takes a number (these can: ${[...MOVING_PARAMS].join(' ')})`, pc.span);
      if (pc.range && !(pc.range[0] >= 0 && pc.range[1] >= 0)) error(`${key}=: a range of positive values, low..high`, pc.span);
      let envs = 0;
      for (const f of pc.factors) {
        const fc = cells.get(f.name);
        if (!fc) unknownCell(f.name, f.span);
        else if (fc.map?.kind === 'adsr') envs++;
      }
      if (envs > 1) error(`${key}=: one envelope (map=adsr) at most — the other factors scale it`, pc.span);
      if (envs && !pc.range) error(`${key}=&env: an envelope runs 0 to 1 — give it a range: ${key}=200..3000 * &env`, pc.span);
    }
  for (const d of decls.values()) if (d.stride !== null && d.step?.kind !== 'driven') warn(`stride= only matters with step=&cell`, d.span);
  for (const d of decls.values()) {
    for (const [key, r] of [
      ['env', d.env],
      ['pitch', d.pitch],
    ] as const) {
      if (!r) continue;
      const t = cells.get(r.name);
      if (!t) unknownCell(r.name, r.span);
      else if (key === 'env' && t.map?.kind !== 'adsr' && t.map?.kind !== 'amp' && t.map?.kind !== 'lin' && t.map?.kind !== 'db')
        error(`env= takes a volume: a cell with map=adsr (an envelope), map=amp, map=db or map=lin`, r.span);
      else if (key === 'pitch' && (t.map?.kind === 'adsr' || t.map?.kind === 'amp' || t.map?.kind === 'db'))
        error(`pitch= takes a pitch (a vibrato, map=lin to glide), not a volume`, r.span);
    }
  }
  for (const d of decls.values()) {
    if (d.map?.kind !== 'adsr') continue;
    const vals = d.braid.kind === 'list' ? d.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN)) : [];
    if (vals.length !== 4 || vals.some((v) => !(v >= 0)) || vals[2] > 1)
      error(`map=adsr takes four numbers: attack decay sustain release — seconds, and sustain a level 0…1 (map=adsr .01 .3 .5 .4)`, d.map.span);
  }
  for (const d of decls.values()) {
    if (d.map?.kind !== 'ratios') continue;
    const vals = d.braid.kind === 'list' ? d.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN)) : [];
    if (d.over !== null) error(`A grid (map=ratios) reads nothing: its braid is its tones`, d.map.span);
    else if (vals.length < 2 || vals.some((v, i) => !(v > 0) || (i > 0 && !(v > vals[i - 1]))))
      error(`map=ratios lists one period's tones as rising ratios, the last the period: map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2`, d.map.span);
  }
  for (const d of decls.values())
    if (d.map?.kind === 'edo' && (d.over !== null || d.braid.kind !== 'blank'))
      error(`A grid (map=edo, map=ed(r)) reads nothing and has no braid: &${d.name} cycle=19 map=edo`, d.map.span);
  // a table is its numbers: cells spliced into one are skipped when it is read (over=), unless it is a
  // kit (a table of voices) or a selector's parts (a table of mixes)
  for (const d of decls.values()) {
    const t = d.over ? cells.get(d.over.name) : undefined;
    if (!t || t.kit) continue;
    const refs = t.units.flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : []));
    if (!refs.length || refs.every((r) => cells.get(r)?.mix && !cells.get(r)?.sink)) continue;
    const listed = [...new Set(refs)].map((r) => '&' + r).join(' ');
    warn(
      `&${t.name} is read as a table, but its cells (${listed}) aren't entries: a table is its numbers. To play cells one after another, splice them into a braid (&${d.name} ${listed}); choosing a melody per step isn't built yet (#29)`,
      d.over!.span,
    );
  }
}

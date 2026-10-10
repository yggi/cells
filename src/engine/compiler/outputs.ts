/** Phase 6: the outputs — one per voice binding, articulated (the finest step= term starts notes; the others and loop= terms bend or hold). */
import { type CellDecl, type Span } from '../ast';
import { adsrOf, balance, pickProblem, pickSteps, type Clock, type Output, type Resonance, type ResolvedCell, type TapeReturn } from '../program';
import { IMPLICIT } from './tables';
import { VOICE_PARAMS } from '../attributes';
import type { Bound } from './bindings';
import type { Cells, Ctx } from './context';

export function outputsOf(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, cells: Cells, clocks: ReadonlyMap<string, Clock>, { sinks, cards, bindings, soundHead }: Bound) {
  const { parsed, error, warn, unknownCell } = ctx;
  // ---- outputs: one per voice binding. Articulation (rule 2): the step= term
  // starts notes — of several, the finest (a melody over its harmony: the coarser
  // ones hold, as loop= terms do); loop= terms bend them; terms that don't move hold.
  const outputs: Output[] = [];
  const returns: TapeReturn[] = [];
  const resonances: Resonance[] = [];
  const articulates = (c: ResolvedCell) => !!c.clock && decls.get(c.name)?.step?.whole === false;
  /** Steps a second (at the code's tempo): what "finer" compares. */
  const stepsPerSecond = (c: ResolvedCell) => (clocks.get(c.clock!)?.perSecond ?? 0) * c.rate;
  /** Of several terms that would start notes, the finest one; null when two share the finest rate. */
  const finest = <T extends { c: ResolvedCell }>(xs: T[]): T | null => {
    const by = [...xs].sort((a, b) => stepsPerSecond(b.c) - stepsPerSecond(a.c));
    const [a, b] = [stepsPerSecond(by[0].c), stepsPerSecond(by[1].c)];
    return a - b > 1e-9 * Math.max(a, b) ? by[0] : null;
  };
  for (const { b, span, gains, via, parts, through, select, silent, midi } of bindings) {
    const known = (r: { name: string; span: Span }) => {
      if (decls.has(r.name)) return true;
      unknownCell(r.name, r.span);
      return false;
    };
    if (![b.voice, ...b.pitches.map((t) => t.ref)].every(known)) continue;
    // (a term whose line failed, or that uses one: its own error says why; nothing more about this product)
    if ([b.voice, ...b.pitches.map((t) => t.ref)].some((r) => ctx.broken.has(r.name))) continue;
    // a sound tape's read head in a mix: its tap returns to the sound card at these levels
    if (soundHead(b.voice.name) && b.pitches.length === 0) {
      returns.push({ head: b.voice.name, tape: cells.get(b.voice.name)!.params.play as string, gains: [gains[0], gains[1]], parts, through: [...through] });
      continue;
    }
    const voice = cells.get(b.voice.name);
    if (!voice) continue;
    // a resonator alone in a mix: heard ringing (from a hand, a neighbour, what drives it)
    if (typeof voice.params.body === 'string' && b.pitches.length === 0) {
      // (its pan= in the gains and in each part, so muting a mix takes its share away at the same balance)
      const [pl, pr] = balance(voice.params.pan);
      resonances.push({
        cell: voice.name,
        gains: [gains[0] * pl, gains[1] * pr],
        parts: parts.map((x) => ({ ...x, gains: [x.gains[0] * pl, x.gains[1] * pr] as [number, number] })),
        through: [...through],
      });
      continue;
    }
    if (voice.kit && !b.pitches.some((t) => decls.get(t.ref.name)?.over?.name === voice.name)) {
      error(`A kit is a table of voices: read the pattern through it, &drums over=&${voice.name}, and mix &drums`, b.voice.span);
      continue;
    }
    if (voice.root) {
      error(`&${voice.name} is a grid, not a voice`, b.voice.span);
      continue;
    }
    if (b.voice.pick || b.voice.shift) {
      error(`Pick or shift the melody, not the voice: &theme[0] * &${voice.name}`, b.voice.span);
      continue;
    }
    if (decls.get(voice.name)?.step?.kind === 'driven') {
      error(`&${voice.name} moves with step=&…, so it can't be a voice: a voice moves at a rate, its pitch (loop=C4)`, b.voice.span);
      continue;
    }
    if (!voice.params.s && voice.freq < 20)
      warn(
        `&${voice.name} loops at ${+voice.freq.toFixed(2)} Hz, below hearing — is it a pitch? Then leave out its sound parameters: (&theme + &${voice.name}) * &lead`,
        b.voice.span,
      );
    // the voice's own env= (a volume) and pitch= (added, as in a pitch sum) join every product it's in
    const own = [
      ...(voice.env ? [{ ref: decls.get(voice.name)!.env!, sign: 1 as const, inSum: false }] : []),
      ...(voice.pitch ? [{ ref: decls.get(voice.name)!.pitch!, sign: 1 as const, inSum: true }] : []),
    ];
    const moved = b.pitches.find((t) => t.ref.transpose || t.ref.degree);
    if (moved?.ref.transpose)
      error(`&${moved.ref.name}^$${moved.ref.transpose}: transposing (^$) is for braids — in a mix, add pitch: &${moved.ref.name} + ${moved.ref.transpose}`, moved.ref.span);
    else if (moved)
      error(
        `&${moved.ref.name}^${moved.ref.degree}: moving by degrees (^) is for braids — in a mix, write a cell that plays it: &u step=&bar &${moved.ref.name}^${moved.ref.degree}`,
        moved.ref.span,
      );
    // a read head plays its tape: what the tape's write head recorded, retimed through the tape
    const tapeOf = new Map<unknown, NonNullable<Output['tape']>>();
    const terms = [...b.pitches, ...own]
      .map((t) => {
        let c = cells.get(t.ref.name)!;
        const tp = c && typeof c.params.play === 'string' ? cells.get(c.params.play) : undefined;
        const src = tp && typeof tp.params.write === 'string' ? cells.get(tp.params.write) : undefined;
        if (c && tp && src) {
          tapeOf.set(t, {
            head: c.name,
            tape: tp.name,
            at: typeof c.params.at === 'number' ? c.params.at : 0,
            length: typeof tp.params.length === 'number' ? tp.params.length : 0,
            erase: typeof tp.params.erase === 'number' ? Math.min(1, Math.max(0, tp.params.erase)) : 1,
          });
          c = src;
        }
        return { t, c };
      })
      .filter((x) => x.c);
    const voiced = terms.filter((x) => x.c.voice);
    if (voiced.length) {
      // (a braid at audio rate beside a sound reads as a pitch, FM: unless it plays as a voice in the piece,
      // then it is a sound here too)
      error(`Two sounds can't multiply (&${voiced[0].c.name} * &${voice.name}): &${voiced[0].c.name} plays as a voice — mix them with + or ,`, voiced[0].t.ref.span);
      continue;
    }
    // volume streams: map=amp cells in the product are levels, not pitches
    // amp: a volume; lin: a volume as a bare factor, a pitch inside a pitch sum (a smooth vibrato)
    const isEnvelope = (x: (typeof terms)[number]) => x.c.map?.kind === 'adsr';
    const isLevel = (x: (typeof terms)[number]) => x.c.map?.kind === 'amp' || x.c.map?.kind === 'db' || (x.c.map?.kind === 'lin' && !x.t.inSum);
    const envelopes = terms.filter(isEnvelope);
    const pitches = terms.filter((x) => !isLevel(x) && !isEnvelope(x));
    const levels = terms.filter((x) => isLevel(x));
    if (envelopes.length > 1) {
      error(`One envelope per note: &${envelopes[0].c.name} and &${envelopes[1].c.name} both shape &${voice.name}`, envelopes[1].t.ref.span);
      continue;
    }
    const envBad = envelopes.find((x) => x.t.inSum || x.t.sign < 0);
    if (envBad) {
      error(`&${envBad.c.name} is an envelope (map=adsr): a volume, it multiplies — keep it out of pitch sums`, envBad.t.ref.span);
      continue;
    }
    const env = envelopes[0] ? adsrOf(envelopes[0].c) : null;
    const negLevel = levels.find((x) => x.t.sign < 0);
    if (negLevel) {
      error(`&${negLevel.c.name} is a volume (map=amp): it multiplies, it can't be subtracted`, negLevel.t.ref.span);
      continue;
    }
    // notes start on a pitch's steps; with none, on a volume stream's (a gate)
    let lead = pitches.filter((x) => articulates(x.c));
    const gate = lead.length === 0;
    if (gate) lead = levels.filter((x) => articulates(x.c));
    if (lead.length === 0) {
      error(
        terms.length
          ? `Nothing starts notes on &${voice.name}: give a pitch or a volume (map=amp) step= timing (step=&bar); loop= terms only bend`
          : `&${voice.name} has nothing to play: a melody goes before it, like &melody * &${voice.name}`,
        span,
      );
      continue;
    }
    if (lead.length > 1) {
      const first = finest(lead);
      if (!first) {
        error(
          `Both &${lead[0].c.name} and &${lead[1].c.name} would start notes on &${voice.name}, at the same rate — make one coarser (it then holds under the other) or loop= (it then bends or shapes them)`,
          lead[1].t.ref.span,
        );
        continue;
      }
      lead = [first];
    }
    const { t, c: cell } = lead[0];
    const badPick = terms.find((x) => pickSteps(x.c, x.t.ref.pick) === null);
    if (badPick) {
      error(pickProblem(badPick.c.name, badPick.t.ref.pick, badPick.c.units.length), badPick.t.ref.span);
      continue;
    }
    if (pickSteps(cell, t.ref.pick) === 0) {
      error(`&${cell.name} has no steps to play`, t.ref.span);
      continue;
    }
    // pan= on the voice: its channel gains (a kit's members are placed note by note, in realize)
    const [pl, pr] = voice.kit ? [1, 1] : balance(voice.params.pan);
    outputs.push({
      id: `${voice.name}:${cell.name}:${t.ref.span.line}:${t.ref.span.col}${select.map((x) => `@${x.cell}:${x.entry}`).join('')}`,
      voice: voice.name,
      kit: voice.kit,
      cell: cell.name,
      pick: t.ref.pick,
      shift: t.ref.shift,
      sign: t.sign,
      gate,
      mods: pitches.filter((x) => x !== lead[0]).map((x) => ({ cell: x.c.name, pick: x.t.ref.pick, shift: x.t.ref.shift, sign: x.t.sign })),
      levels: levels.filter((x) => x !== lead[0]).map((x) => ({ cell: x.c.name, pick: x.t.ref.pick, shift: x.t.ref.shift, sign: x.t.sign })),
      offset: b.offset,
      gains: [gains[0] * pl, gains[1] * pr],
      parts: parts.map((x) => ({ ...x, gains: [x.gains[0] * pl, x.gains[1] * pr] as [number, number] })),
      select,
      ...(tapeOf.has(t) ? { tape: tapeOf.get(t)! } : {}),
      ...(silent ? { silent: true } : {}),
      ...(midi?.length ? { midi } : {}),
      through: [...through],
      envelope: env,
      envelopeCell: envelopes[0]?.c.name ?? null,
      via: [...via],
      span,
    });
  }
  // (not when a line failed: that may be the sound card's own, and its error says what's wrong)
  // a voice only on MIDI cards: its sound isn't sent (MIDI carries notes, velocity and bends), said once for the piece
  const heardVoice = (v: string) => outputs.some((o) => o.voice === v && (o.parts.length || o.silent));
  const sentOnly = outputs.find(
    (o) => o.midi && !o.parts.length && !o.silent && !o.kit && !heardVoice(o.voice) && Object.keys(decls.get(o.voice)?.params ?? {}).some((k) => VOICE_PARAMS.has(k)),
  );
  if (sentOnly) {
    const d = decls.get(sentOnly.voice)!;
    const sound = Object.keys(d.params).filter((k) => VOICE_PARAMS.has(k));
    warn(
      `&${sentOnly.voice} is only on a MIDI card: its sound (${sound.map((k) => `${k}=`).join(' ')}) isn't sent — MIDI carries its notes, velocity and bends; the device makes the sound`,
      d.paramSpans[sound[0]] ?? d.span,
    );
  }
  if (sinks.length === 0 && cards.length === 0 && parsed.cells.length > 0 && !parsed.broken?.length)
    warn('Nothing plays yet — add a mix and the sound card: &mix [&melody * &voice] and &out loop=SAMPLE_RATE map=sample &mix &mix', IMPLICIT);
  return { outputs, returns, resonances };
}

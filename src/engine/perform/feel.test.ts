// The default performer (decision 063 §2, #392): the feel contract (yggi/music-commons `contracts/feel`, version 1,
// minor 1) run against cells' own, its vectors in fixtures/contracts/feel.json (its `lifted` line naming the hub and the
// commit; the hub's own, what it lifted from Jambot, kept as `liftedByTheHub`). Every vector runs, none recorded; a
// performer's widths at 1 play as the contract, at 0 exactly as written; a gate's licence= and accents= are its widths.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { channelTable, router } from '../midi';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';
import { CONTRACT_WIDTHS, feelOf, played, readerOf, readingOf, type FeelEvent, type FeelFrame } from './feel';
import { perform, widthsOf } from './perform';
import { swungAt, writtenAt, type SwingLevel } from './swing';

interface Vector {
  readonly preset: string;
  readonly meter: string;
  readonly frame: FeelFrame;
  readonly feel: number;
  readonly events: readonly (FeelEvent & { readonly onset: number })[];
  readonly played: readonly { readonly velocity: number; readonly length: number }[];
}
interface Contract {
  readonly lifted: string;
  readonly liftedByTheHub: string;
  readonly contract: string;
  readonly version: number;
  readonly minor: number;
  readonly reading: readonly { readonly output: string; readonly reads: { readonly part: string; readonly role?: string } | null }[];
  readonly vectors: readonly Vector[];
}
const fixture = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../../../fixtures/contracts/${name}.json`, import.meta.url), 'utf8'));
const contract = fixture<Contract>('feel');
const name = (v: Vector) => `${v.preset} ${v.meter} seed ${v.frame.seed} bar ${v.frame.bar}`;

describe('the feel contract (music-commons contracts/feel, version 1, minor 1)', () => {
  it('is the version met, lifted with its source named: 256 bars from Jambot', () => {
    expect([contract.contract, contract.version, contract.minor]).toEqual(['feel', 1, 1]);
    expect(contract.lifted).toMatch(/^Lifted from yggi\/music-commons contracts\/feel\/vectors\.json @ [0-9a-f]{7}/);
    expect(contract.liftedByTheHub).toMatch(/^Lifted from yggi\/jambot @ [0-9a-f]{7}/);
    expect(contract.vectors).toHaveLength(256);
  });

  it('the feel of every bar is the vector’s', () => {
    for (const v of contract.vectors) expect(feelOf(v.frame), name(v)).toBe(v.feel);
  });

  it('every event plays at the vector’s velocity and length, equal: 7,140 of 7,140, none recorded (Jambot’s, over its sections)', () => {
    let events = 0;
    for (const v of contract.vectors) {
      expect(
        v.events.map((e) => played(v.frame, e)),
        name(v),
      ).toEqual(v.played);
      events += v.events.length;
    }
    expect(events).toBe(7140);
  });

  it('reads each output a host’s text names an event by as the vector’s part and role, or none: 17 of 17', () => {
    expect(contract.reading).toHaveLength(17);
    for (const r of contract.reading) expect(readingOf(r.output), r.output).toEqual(r.reads);
    expect(readingOf(undefined)).toBeNull();
  });
});

describe('a performer’s widths', () => {
  const events = contract.vectors.flatMap((v) => v.events.map((e) => [v, e] as const));

  it('at 1, the contract’s: every event the same bits', () => {
    for (const [v, e] of events) expect(played(v.frame, e, undefined, { licence: 1, accents: 1 })).toEqual(played(v.frame, e));
    expect(CONTRACT_WIDTHS).toEqual({ licence: 1, accents: 1 });
  });

  it('at 0, exactly as written: every event at the velocity and length cells states, 7,140 of 7,140', () => {
    for (const [v, e] of events) expect(played(v.frame, e, undefined, { licence: 0, accents: 0 }), name(v)).toEqual({ velocity: e.velocity, length: e.length });
  });

  it('is shown firing: at 0 the played differs from the contract’s on most events, and each width moves its own part', () => {
    const moved = events.filter(([v, e]) => played(v.frame, e).velocity !== e.velocity).length;
    expect(moved / events.length).toBeGreaterThan(0.5);
    const [v, e] = events.find(([v, e]) => feelOf(v.frame) > 0.3 && e.step % 2 === 1)!;
    expect(played(v.frame, e, undefined, { licence: 0, accents: 1 }).length).toBe(e.length);
    expect(played(v.frame, e, undefined, { licence: 1, accents: 0 }).length).toBe(played(v.frame, e).length);
  });

  it('are a gate’s licence= and accents=, each 1 where unwritten, and may be free()', () => {
    const r = compileSource(
      [
        '&bar meter("4/4") step=120bpm',
        '&tune step=4n 0 2 4 7',
        '&v s=saw loop=C4',
        '&leadOut play=&tune licence=.5 accents=free(0, 0..1) &v',
        '&lead map=role &leadOut',
        '&padV s=tri loop=C3',
        '&padOut play=&tune &padV',
        '&out map=sample [&leadOut, &padOut]',
      ].join('\n'),
    );
    expect(r.diagnostics).toEqual([]);
    const widths = widthsOf(r);
    const [lead, pad] = r.outputs.map((o) => widths(o.id));
    expect(lead).toEqual({ licence: 0.5, accents: 0 });
    expect(pad).toEqual(CONTRACT_WIDTHS);
    expect(widths(undefined)).toEqual(CONTRACT_WIDTHS);
  });
});

describe('the default performer on cells’ events', () => {
  const frame: FeelFrame = {
    seed: 1,
    bar: 3,
    groups: [2, 2, 2, 2],
    section: 'groove',
    style: { entropy: 0.6, artic: 0.2, sync: 0.4 },
    swing: { level: '16n', share: 0.5 },
    energy: 0.7,
  };
  const text = (widths: string) =>
    [
      '&bar meter("4/4") step=120bpm',
      '&leadline step=8n 0 2 4 7 4 2 0 ~',
      '&leadV s=saw loop=C4',
      `&leadOut play=&leadline ${widths} &leadV`,
      '&lead map=role &leadOut',
      '&out map=midi(1) &leadOut',
    ].join('\n');
  const performed = (widths: string) => {
    const r = compileSource(text(widths));
    const route = router(r, channelTable(r));
    return eventsBetween(plan(r, codeShifts(r)), 0, 2 - 1e-9, true).map((e) => perform(e, route, { bar: 3, frame, start: 0, seconds: 2 }, readerOf(r), widthsOf(r)).performance);
  };

  it('reads each event’s part from its performer’s role, and plays it with the feel; at widths 0, as cells sends it', () => {
    const plain = performed('licence=0 accents=0');
    expect(plain).toHaveLength(7);
    expect(plain.every((p) => p?.part === 'lead')).toBe(true);
    expect(plain.map((p) => p!.length)).toEqual(Array<number>(7).fill(2));
    const felt = performed('');
    expect(felt.map((p) => p!.step)).toEqual(plain.map((p) => p!.step));
    expect(felt.map((p) => p!.velocity)).not.toEqual(plain.map((p) => p!.velocity));
  });
});

describe('a bar’s swing (music-commons contracts/swing, version 1): a written step played, and back', () => {
  const swing = fixture<{ vectors: readonly { name: string; groups: readonly number[]; swing: readonly SwingLevel[]; onsets: readonly number[] }[] }>('swing');

  it('plays every step of every vector at its onset, and reads it back, within 1e-9', () => {
    expect(swing.vectors.length).toBeGreaterThan(100);
    for (const v of swing.vectors)
      v.onsets.forEach((onset, step) => {
        expect(Math.abs(swungAt(step, v.groups, v.swing) - onset), `${v.name} step ${step}`).toBeLessThan(1e-9);
        expect(Math.abs(writtenAt(onset, v.groups, v.swing) - step), `${v.name} step ${step}`).toBeLessThan(1e-9);
      });
  });
});

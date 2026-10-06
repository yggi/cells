import { describe, expect, it } from 'vitest';
import { codeShifts, compileSource } from './compile';
import { eventsBetween, plan } from './realize';

const base = (tape: string, head: string, mix: string) =>
  `&bar step=120bpm 0 0 0 0\n&tune step=&bar 0 4 7 ~ ~ ~ ~ ~\n${tape}\n${head}\n&v s=sine loop=C4\n&w s=tri loop=C4\n&out loop=SAMPLE_RATE map=sample [${mix}]`;
const notes = (src: string, to = 8) => {
  const r = compileSource(src);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r)), 0, to);
};

describe('tapes: a write head records, read heads play it back — through the tape', () => {
  it('an echo: a read head half a tape-second on plays each note half a second later', () => {
    const ev = notes(base('&tape write=&tune', '&echo play=&tape at=.5', '&tune * &v, &echo * &w'), 4);
    const dry = ev.filter((e) => e.voice === 'v').map((e) => +e.at.toFixed(6));
    const wet = ev.filter((e) => e.voice === 'w').map((e) => +e.at.toFixed(6));
    expect(dry.slice(0, 3)).toEqual([0, 0.5, 1]);
    expect(wet.slice(0, 3)).toEqual([0.5, 1, 1.5]);
  });
  it('a loop: again every length, (1 − erase) as loud each pass — ghosts', () => {
    // (the tune once only — laps=1 — so each pass of its C is the only C then)
    const ev = notes(base('&tape write=&tune length=2 erase=.5', '&echo play=&tape at=.5', '&echo * &w').replace('&tune step=&bar ', '&tune step=&bar laps=1 '), 6).filter((e) => Math.abs(e.freq - 261.63) < 0.5);
    // the first note (C) at 0: passes the read head at .5, 2.5, 4.5 … each half as loud
    const at = ev.map((e) => [+e.at.toFixed(6), +e.gains[0].toFixed(6)]);
    expect(at.slice(0, 3).map((x) => x[0])).toEqual([0.5, 2.5, 4.5].map((x) => +x.toFixed(6)));
    expect(at[1][1] / at[0][1]).toBeCloseTo(0.5, 6);
    expect(at[2][1] / at[0][1]).toBeCloseTo(0.25, 6);
  });
  it('an open reel (no length): once only', () => {
    const ev = notes(base('&tape write=&tune', '&echo play=&tape at=.5', '&echo * &w'), 8).filter((e) => Math.abs(e.freq - 261.63) < 0.5);
    // &tune loops every 4 s itself: its C at 0 and 4 — each echoed once, at .5 and 4.5
    expect(ev.map((e) => +e.at.toFixed(6))).toEqual([0.5, 4.5]);
  });
  it('on a reel that spins up: the echo comes later at first, then settles', () => {
    const src = base('&reel step=120bpm motor=2 mass=1 0\n&tape step=&reel write=&tune', '&echo play=&tape at=.5', '&tune * &v, &echo * &w');
    const ev = notes(src, 20);
    const dry = ev.filter((e) => e.voice === 'v').map((e) => e.at);
    const wet = ev.filter((e) => e.voice === 'w').map((e) => e.at);
    expect(wet[0] - dry[0]).toBeGreaterThan(0.5); // spinning up: the tape slow, the echo late
    expect(wet[wet.length - 1] - dry[dry.length - 1]).toBeCloseTo(0.5, 2); // up to speed: half a second
  });
  it('varispeed: recorded slow, played at speed — higher', () => {
    const src = base('&reel step=120bpm motor=1 mass=1 0\n&tape step=&reel write=&tune varispeed=1', '&echo play=&tape at=1', '&echo * &w');
    const first = notes(src, 6).filter((e) => e.voice === 'w')[0];
    expect(first.freq).toBeGreaterThan(261.63 * 1.05);
  });
  it('says what’s wrong', () => {
    const msgs = (code: string) => compileSource(code).diagnostics.map((d) => d.message).join(' | ');
    expect(msgs(base('&tape 0', '&echo play=&tape at=.5', '&echo * &w'))).toMatch(/a read head plays a tape/);
    expect(msgs(base('&tape write=&v', '&echo play=&tape', '&echo * &w'))).toMatch(/a tape records what plays/);
  });
});

describe('sound tapes: write= a mix — a delay network, the heads returns', () => {
  const src = `&bar step=96bpm 0 0 0 0
&tune step=&bar 0 4 7 ~
&v s=tri loop=C4
&dry [&tune * &v]
&tape write=&dry length=4 erase=.35 tone=3200 drive=.3 hiss=.01
&h1 play=&tape at=.5
&h2 play=&tape at=1.25
&out loop=SAMPLE_RATE map=sample [&dry, &h1 * .4] [&dry, &h2 * .3]`;
  it('the tape is listed with its loop and colour; each head in a mix returns, left and right', () => {
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.tapes).toEqual([
      {
        name: 'tape',
        source: 'dry',
        length: 4,
        erase: 0.35,
        tone: 3200,
        drive: 0.3,
        hiss: 0.01,
        print: 0,
        printgap: 0.6,
        dropout: 0,
        heads: [
          { head: 'h1', at: 0.5, wander: 0, wanderhz: 0.2 },
          { head: 'h2', at: 1.25, wander: 0, wanderhz: 0.2 },
        ],
      },
    ]);
    expect(r.returns).toEqual([
      { head: 'h1', tape: 'tape', gains: [0.4, 0] },
      { head: 'h2', tape: 'tape', gains: [0, 0.3] },
    ]);
    expect(r.cells.get('h1')!.voice).toBe(false); // (sound already: not a voice)
  });
  it('print-through, dropouts, a flying head: read from the code', () => {
    const r = compileSource(src.replace('hiss=.01', 'hiss=.01 print=.04 printgap=.5 dropout=.3').replace('&h1 play=&tape at=.5', '&h1 play=&tape at=.5 wander=.08 wanderhz=.3'));
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.tapes[0]).toMatchObject({ print: 0.04, printgap: 0.5, dropout: 0.3 });
    expect(r.tapes[0].heads[0]).toEqual({ head: 'h1', at: 0.5, wander: 0.08, wanderhz: 0.3 });
  });
  it('an elastic tape: belt= on the tape, and its echoes lag and swing as the strip stretches', () => {
    const tight = compileSource(base('&tape write=&tune', '&echo play=&tape at=.5', '&echo * &w'));
    const slack = compileSource(base('&tape step=&bar belt=15 write=&tune', '&echo play=&tape at=.5', '&echo * &w'));
    const at = (r: typeof tight) => eventsBetween(plan(r, codeShifts(r)), 0, 4).filter((e) => e.voice === 'w').map((e) => e.at);
    expect(at(slack)[0]).toBeGreaterThan(at(tight)[0] + 0.02); // the strip stretches as it starts: the echo comes late
  });
  it('a tape of a melody stays a value tape (not a sound tape)', () => {
    const r = compileSource(base('&tape write=&tune', '&echo play=&tape at=.5', '&echo * &w'));
    expect(r.tapes).toEqual([]);
  });
});

describe('tapes in the graph: their heads and reels are on the way to the sound card', () => {
  it('a note tape and a sound tape: head, tape and reel all routed (not dimmed)', async () => {
    const { PRESETS } = await import('./presets');
    const { routing } = await import('./routing');
    for (const [k, cells] of [
      ['echotape', ['near', 'mid', 'far', 'tape', 'reel']],
      ['testtones', ['first', 'second', 'third', 'loop', 'reel', 'bench']],
    ] as const) {
      const r = compileSource((PRESETS as Record<string, { source: string }>)[k].source);
      const routed = routing(r, r.off).nodes;
      for (const c of cells) expect(routed.has(`cell:${c}`), `${k}: &${c}`).toBe(true);
    }
  });
});

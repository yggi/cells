import { describe, expect, it } from 'vitest';
import { parse, pieceMeta } from './parser';
import { pickLabel, refLabel } from './ast';

const one = (src: string) => {
  const r = parse(src);
  expect(r.diagnostics).toEqual([]);
  return r.cells[0];
};

describe('parse: cells', () => {
  it('reads the design examples', () => {
    const r = parse(`&meter scan(27 23 26 24)
&scale shift=1 over=&key scan(2 1 2 2 1 2 2) # Bresenham phase 2
&theme over=&scale 0 2 4 5 6# 7
&leadB over=&down &m1 &m2 &lead[0] &lead[-2:]`);
    expect(r.diagnostics).toEqual([]);
    expect(r.cells.map((c) => c.name)).toEqual(['meter', 'scale', 'theme', 'leadB']);
    expect(r.cells[1]).toMatchObject({ shift: 1, over: { name: 'key', pick: null }, braid: { kind: 'scan', steps: [2, 1, 2, 2, 1, 2, 2] } });
    expect(r.cells[3].over).toMatchObject({ name: 'down', pick: null });
    if (r.cells[3].braid.kind !== 'list') throw new Error();
    expect(r.cells[3].braid.tokens.slice(2).map((t) => t.atom)).toEqual([
      { kind: 'ref', name: 'lead', pick: { kind: 'at', i: 0 }, shift: 0 },
      { kind: 'ref', name: 'lead', pick: { kind: 'slice', from: -2, to: null }, shift: 0 },
    ]);
  });

  it('reads atoms, shifted refs, decimals, accidentals and modifiers', () => {
    const c = one('&A 0 -12 ~ [0, 4,7] &B!3*2@4 &bar[-1] &bar[1:]!2 3.24 6#@2 [0,2#,4bb]');
    if (c.braid.kind !== 'list') throw new Error();
    expect(c.braid.tokens.map((t) => t.atom)).toEqual([
      { kind: 'note', value: 0, alter: 0 },
      { kind: 'note', value: -12, alter: 0 },
      { kind: 'rest' },
      { kind: 'chord', notes: [0, 4, 7], alters: [0, 0, 0] },
      { kind: 'ref', name: 'B', pick: null, shift: 0 },
      { kind: 'ref', name: 'bar', pick: { kind: 'at', i: -1 }, shift: 0 },
      { kind: 'ref', name: 'bar', pick: { kind: 'slice', from: 1, to: null }, shift: 0 },
      { kind: 'note', value: 3.24, alter: 0 },
      { kind: 'note', value: 6, alter: 1 },
      { kind: 'chord', notes: [0, 2, 4], alters: [0, 1, -2] },
    ]);
    expect(c.braid.tokens[4]).toMatchObject({ repeat: 3, subdivide: 2, elongate: 4 });
    expect(c.braid.tokens[6].repeat).toBe(2);
  });

  it('scan(…) reads intervals, spaces or commas, any positive numbers', () => {
    expect(one('&s scan(2 2 1 2 2 2 1)').braid).toMatchObject({ kind: 'scan', steps: [2, 2, 1, 2, 2, 2, 1] });
    expect(one('&s scan(3, 3, 2)').braid).toMatchObject({ steps: [3, 3, 2] });
    expect(one('&s scan(27 23.5 26 23.5)').braid).toMatchObject({ steps: [27, 23.5, 26, 23.5] });
    expect(parse('&s scan(2 0 1)').diagnostics[0].message).toMatch(/positive intervals/);
  });

  it('even() and agogic() are gone: each says exactly which scan to write', () => {
    expect(parse('&s even(7,12,2)').diagnostics[0].message).toMatch(/write scan\(2 1 2 2 1 2 2\)/);
    expect(parse('&s even(3,8,2)').diagnostics[0].message).toMatch(/write scan\(3 3 2\)/);
    expect(parse('&bar agogic(4,4)').diagnostics[0].message).toMatch(/scan\(27 23 26 24\)/);
    expect(parse('&bar agogic(3,4)').diagnostics[0].message).toMatch(/scan\(28 37 35\)/);
  });

  it('points old syntax at the new one', () => {
    const msg = (s: string) => parse(s).diagnostics[0]?.message ?? '';
    expect(msg('&a init=2')).toMatch(/now shift=/);
    expect(msg('&a 0 out=lead')).toMatch(/now a command/);
    expect(msg('&a(&b) 0')).toMatch(/is gone/);
    expect(msg('&a map=1')).toMatch(/map= takes amp, lin, db, adsr, sample, edo, ed\(r\), ratios or a table/);
    expect(msg('cell &a 0')).toMatch(/cell keyword is gone/);
    expect(msg('&v s=saw gain=.5')).toMatch(/set the level in the mix/);
    expect(msg('&v s=saw pan=.2')).toMatch(/two mixes/);
    expect(msg('out = &a * &b')).toMatch(/out is a cell now/);
    expect(msg('&a step={&b} 0')).toMatch(/cycle\(&x\)/);
    expect(msg('&a[1] 0')).toMatch(/where a cell is used/);
    expect(msg('&a[<<] 0')).toMatch(/use shift= here/);
  });

  it('records 1-based positions and keeps going after errors', () => {
    const c = one('&A 0 7!2');
    if (c.braid.kind !== 'list') throw new Error();
    expect(c.braid.tokens[1].span).toEqual({ line: 1, col: 6, len: 3 });
    const r = parse(`&A 0 x 2\n&B 1\nfoo &C\n&D 1!0\n&E scan(1 2 2 1 2 2 2) 3`);
    expect(r.cells.map((c) => c.name)).toEqual(['B']);
    expect(r.diagnostics.map((d) => d.span.line)).toEqual([1, 3, 4, 5]);
  });
});

describe('parse: rates, stride and voices', () => {
  it('step= takes a rate in steps per second, bpm or hz', () => {
    const r = parse('&m step=1.5\n&n step=84bpm\n&o step=261.63hz\n&p step=.5');
    expect(r.diagnostics).toEqual([]);
    expect(r.cells.map((c) => (c.step?.kind === 'rate' ? c.step.perSecond : null))).toEqual([1.5, 1.4, 261.63, 0.5]);
  });

  it('reads stride=', () => {
    expect(one('&key step=cycle(&theme) stride=7').stride).toBe(7);
  });

  it('reads dough parameters on voices, with aliases', () => {
    const c = one('&lead s=saw step=261.63 lpf=1800 lpq=2 reverb=.4');
    expect(c.params).toEqual({ s: 'saw', lpf: 1800, lpq: 2, room: 0.4 });
    // envelopes are cells now
    for (const k of ['attack', 'decay', 'sustain', 'release'])
      expect(parse(`&lead s=saw ${k}=.3`).diagnostics[0].message).toMatch(new RegExp(`${k}= is gone: an envelope is a cell.*map=adsr`));
    expect(parse('&a lpf=1 cutoff=2').diagnostics[0].message).toMatch(/twice/);
    expect(parse('&a fmh=2').diagnostics[0].message).toMatch(/Unknown attribute fmh=/);
  });
});

describe('parse: off', () => {
  it('reads the off flag anywhere', () => {
    expect(parse('&a off 0 1').cells[0].off).toBe(true);
    expect(parse('&a 0 1 off').cells[0].off).toBe(true);
    expect(parse('&a 0 1').cells[0].off).toBe(false);
    expect(parse('&a off off').diagnostics[0].message).toMatch(/twice/);
  });
});

describe('parse: loop, cycle(), map and sums', () => {
  it('reads the six step / loop forms', () => {
    const r = parse(`&a step=1\n&b loop=1\n&c step=&x\n&d loop=&x\n&e step=cycle(&x)\n&f loop=cycle(&x)*2\n&g step=&x/5`);
    expect(r.diagnostics).toEqual([]);
    expect(r.cells.map((c) => [c.step?.whole, c.step?.kind, c.step?.kind === 'driven' ? [c.step.cycle, c.step.label || null, c.step.ratio] : null])).toEqual([
      [false, 'rate', null],
      [true, 'rate', null],
      [false, 'driven', [false, null, 1]],
      [true, 'driven', [false, null, 1]],
      [false, 'driven', [true, null, 1]],
      [true, 'driven', [true, '×2', 0.5]],
      [false, 'driven', [false, '÷5', 5]],
    ]);
    expect(parse('&a step=1 loop=2').diagnostics[0].message).toMatch(/two ways/);
  });

  it('reads ratio chains, left to right, any positive number', () => {
    const ratio = (t: string) => {
      const c = one(`&a step=${t} 0`);
      return c.step?.kind === 'driven' ? [c.step.ratio, c.step.label] : null;
    };
    expect(ratio('&x*2/3')).toEqual([1.5, '×2÷3']); // three per two
    expect(ratio('&x/3*2')).toEqual([1.5, '÷3×2']);
    expect(ratio('&x*1.5')).toEqual([1 / 1.5, '×1.5']);
    expect(parse('&a step=&x*0 0').diagnostics[0].message).toMatch(/positive number/);
  });

  it('reads map=', () => {
    expect(parse('&v loop=440 map=sin').diagnostics[0].message).toMatch(/map=sin is gone.*sin\(12\)/);
    expect(one('&v loop=440 map=amp 0 1').map).toMatchObject({ kind: 'amp' });
    expect(one('&v loop=440 map=&curve').map).toMatchObject({ kind: 'table', table: { name: 'curve' } });
  });

  it('reads decimals without a leading zero', () => {
    const c = one('&vib 0 .1 -.15');
    if (c.braid.kind !== 'list') throw new Error();
    expect(c.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : null))).toEqual([0, 0.1, -0.15]);
  });
});

describe('parse: mixes', () => {
  const voices = (src: string) => {
    const r = parse(src);
    expect(r.diagnostics).toEqual([]);
    const a = r.cells[0].braid.kind === 'list' ? r.cells[0].braid.tokens[0].atom : null;
    if (a?.kind !== 'mix') throw new Error('not a mix');
    return a.bindings.map(
      (b) =>
        `${b.voice.name}<${b.pitches.map((t) => (t.sign > 0 ? '' : '-') + t.ref.name + refLabel(t.ref)).join(' ')}${b.offset ? ' ' + b.offset : ''}>${b.gain !== 1 ? '×' + b.gain : ''}`,
    );
  };

  it('a chord of sounds is a mix; numbers in a product are gains', () => {
    expect(voices('&mix [&theme * &lead * 1.2, &pedal * &bass * 0.8]')).toEqual(['lead<theme>×1.2', 'bass<pedal>×0.8']);
    expect(voices('&mix [(&theme + &vibrato) * &lead]')).toEqual(['lead<theme vibrato>']);
    expect(voices('&mix [0.5 * &john[<<] * &v2]')).toEqual(['v2<john[<<]>×0.5']);
  });

  it('numbers inside a pitch sum transpose', () => {
    expect(voices('&mix [(&pedal + 12) * &bass]')).toEqual(['bass<pedal 12>']);
    expect(voices('&mix [(&alto[<<] - 7) * &cello]')).toEqual(['cello<alto[<<] -7>']);
  });

  it('(a + b) * s = a * (b * s), a * (s + t) = a * s + a * t', () => {
    expect(voices('&mix [(&theme + &vibrato) * &lead]')).toEqual(voices('&mix [&theme * &vibrato * &lead]'));
    expect(voices('&mix [&theme * (&lead + &organ)]')).toEqual(['lead<theme>', 'organ<theme>']);
    expect(voices('&mix [&theme * (&lead + &organ) * 0.5]')).toEqual(['lead<theme>×0.5', 'organ<theme>×0.5']);
  });

  it('a mix can span lines: a line ending in , or [ continues', () => {
    expect(voices('&mix [&a * &v,   # one\n      &b * &w]')).toEqual(['v<a>', 'w<b>']);
    expect(voices('&mix [\n  &a * &v]')).toEqual(['v<a>']);
  });

  it('plain numbers are still a chord', () => {
    const c = one('&c [0, 4, 7]');
    if (c.braid.kind !== 'list') throw new Error();
    expect(c.braid.tokens[0].atom.kind).toBe('chord');
  });

  it('the sound card: map=sample, loop in k', () => {
    const c = one('&out loop=44k map=sample &mix &mix');
    expect(c.map).toMatchObject({ kind: 'sample' });
    expect(c.step).toMatchObject({ whole: true, kind: 'rate', perSecond: 44000 });
  });

  it('type errors say what to write', () => {
    const msg = (s: string) => parse(s).diagnostics[0]?.message ?? '';
    expect(msg('&m [&theme * (&lead * &vibrato) * &x]')).toMatch(/A pitch acts on a voice/);
    expect(msg('&m [&lead - &bass]')).toMatch(/no subtracting a voice/);
    expect(msg('&m [&a * 2 * 3, 12]')).toMatch(/needs a voice/);
    expect(msg('&m [gate(&r) * &theme * &lead]')).toMatch(/planned/);
    expect(msg('&m [&a * &b &c]')).toMatch(/',' or '\]'/);
  });
});

describe('parse: picks', () => {
  it('&x[i] and &x[a:b], Python-style, with spaces allowed', () => {
    const picks = (src: string) => {
      const c = one(src);
      if (c.braid.kind !== 'list') throw new Error();
      return c.braid.tokens.map((t) => (t.atom.kind === 'ref' ? pickLabel(t.atom.pick) : ''));
    };
    expect(picks('&a &x[0] &x[-1] &x[1:3] &x[:-1] &x[-2:] &x[ 2 ] &x[:]')).toEqual(['[0]', '[-1]', '[1:3]', '[:-1]', '[-2:]', '[2]', '[:]']);
    expect(parse('&a &x[]').diagnostics[0].message).toMatch(/an index like/);
  });

  it('the glued form explains both readings', () => {
    const msg = parse('&a 0 &b-1').diagnostics[0].message;
    expect(msg).toMatch(/&b - 1 to add pitch/);
    expect(msg).toMatch(/&b\[…\] to pick/);
  });

  it('picks belong where a braid is used, not on tables, drivers or voices', () => {
    const msg = (s: string) => parse(s).diagnostics[0]?.message ?? '';
    expect(msg('&a step=&m[0] 0')).toMatch(/whole cell/);
    expect(msg('&a map=&t[0]')).toMatch(/whole table/);
  });

  it('pitch arithmetic and picks read apart', () => {
    const c = one('&m [(&tenor[1:] - 7) * &cello]');
    const a = c.braid.kind === 'list' ? c.braid.tokens[0].atom : null;
    expect(a?.kind === 'mix' && a.bindings[0]).toMatchObject({ voice: { name: 'cello' }, pitches: [{ ref: { name: 'tenor', pick: { kind: 'slice', from: 1 } } }], offset: -7 });
  });
});

describe('parse: shifts in brackets', () => {
  const ref = (src: string) => {
    const c = one(src);
    if (c.braid.kind !== 'list') throw new Error();
    const a = c.braid.tokens[0].atom;
    return a.kind === 'ref' ? [a.pick, a.shift] : null;
  };
  it('[<<n] shifts back, [>>n] forward, n defaults to 1', () => {
    expect(ref('&a &x[<<]')).toEqual([null, -1]);
    expect(ref('&a &x[<<3]')).toEqual([null, -3]);
    expect(ref('&a &x[>>]')).toEqual([null, 1]);
    expect(ref('&a &x[ >> 2 ]')).toEqual([null, 2]);
  });
  it('shifts are fine on over= (a transposed table), not on step= or map=', () => {
    expect(one('&a over=&s[<<] 0').over).toMatchObject({ name: 's', shift: -1 });
    expect(parse('&a over=&s[0] 0').diagnostics[0].message).toMatch(/shifting it is fine/);
    expect(parse('&a step=&m[<<] 0').diagnostics[0].message).toMatch(/whole cell/);
  });
  it('the short form reads as written', () => {
    const c = one('&m [(&alto[<<] - 7) * &cello]');
    const a = c.braid.kind === 'list' ? c.braid.tokens[0].atom : null;
    expect(a?.kind === 'mix' && a.bindings[0]).toMatchObject({ pitches: [{ ref: { name: 'alto', shift: -1, pick: null } }], offset: -7 });
  });
  it('the glued form now offers all four readings', () => {
    expect(parse('&a 0 &b-1').diagnostics[0].message).toMatch(/&b\^-1 to transpose it \(in a braid\), &b - 1 to add pitch \(in a mix\), &b\[<<\] to shift it/);
  });
});

describe('scan(x!n)', () => {
  it('repeats an interval, as braids do', () => {
    const c = parse('&t scan(1!3 2 .5!2)').cells[0];
    expect(c.braid.kind === 'scan' && c.braid.steps).toEqual([1, 1, 1, 2, 0.5, 0.5]);
    expect(parse('&t scan(1!0)').diagnostics[0].message).toMatch(/repeats an interval/);
  });
});

describe('a piece’s card: title= and tags= on a note', () => {
  it('the first note with a title is the card: title, description (plain), tags', () => {
    const src = `# a comment
&other label="not the card"
&piece title="Swing blues" tags="Jazz, blues, swing, jazz" label="A **12-bar** blues in C, *swung* — key {&key:tonic}.\\nTwo scales."
&bar step=120bpm 0`;
    expect(pieceMeta(src)).toEqual({
      title: 'Swing blues',
      description: 'A 12-bar blues in C, swung — key . Two scales.',
      tags: ['Jazz', 'blues', 'swing'], // (as written, once each whatever the case)
      cell: 'piece',
    });
    expect(pieceMeta('&bar step=1 0')).toBeNull();
    expect(parse('&p title=hello').diagnostics[0].message).toMatch(/title= takes a text in quotes/);
  });
});

describe('euclid(k, n, shift): Bjorklund’s rhythms', () => {
  const hits = (src: string) => {
    const b = parse(`&t ${src}`).cells[0].braid;
    return b.kind === 'list' ? b.tokens.map((t) => (t.atom.kind === 'rest' ? '.' : 'x')).join('') : '?';
  };
  it('k hits as evenly as they go: the tresillo, the cinquillo, the bossa’s bell', () => {
    expect(hits('euclid(3, 8)')).toBe('x..x..x.');
    expect(hits('euclid(5, 8)')).toBe('x.xx.xx.');
    expect(hits('euclid(4, 12)')).toBe('x..x..x..x..');
    expect(hits('euclid(0, 4)')).toBe('....');
    expect(hits('euclid(4, 4)')).toBe('xxxx');
  });
  it('shift turns it', () => {
    expect(hits('euclid(3, 8, 1)')).toBe('..x..x.x');
  });
  it('a written braid like any other: steps to read through a kit, or to play', () => {
    expect(parse('&t step=4 euclid(3, 8)').diagnostics).toEqual([]);
    expect(parse('&t euclid(9, 8)').diagnostics[0].message).toMatch(/euclid\(k, n\)/);
    expect(parse('&t even(3, 8)').diagnostics[0].message).toMatch(/euclid\(3, 8\)/);
  });
});

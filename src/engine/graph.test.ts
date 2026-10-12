import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { compileSource } from './compile';
import { type GraphModel } from './graph';
import { buildGraph } from '../layout/drawn';
import { cellId, edgeId, stepEdgeId } from './ids';
import { transformLabel } from './transform';
import { PRESETS } from './presets';
import { TIME_PARAMS } from './attributes';

/** The edge between two cells along the flow; through a product's junction (graph.ts) when they meet there: into a product whose voice is `to`, out of one whose voice is `from`. */
const between = (model: GraphModel, from: string, to: string) => {
  const voiceOf = (id: string) => model.nodes.flatMap((n) => (n.id === id && n.kind === 'junction' ? [n.voice] : []))[0];
  return (
    model.edges.find((x) => x.from === `cell:${from}` && x.to === `cell:${to}`) ??
    model.edges.find((x) => x.from === `cell:${from}` && voiceOf(x.to) === to) ??
    model.edges.find((x) => voiceOf(x.from) === from && x.to === `cell:${to}`)
  );
};

// An edge as a wire (docs/notes/nets.md): its port, band, width and the way the values flow.
const wireOf = (model: GraphModel, from: string, to: string) => {
  const e = between(model, from, to);
  return e && { port: e.port, band: e.band, width: e.width, pointer: e.pointer };
};

describe('edges as wires', () => {
  const g = buildGraph(compileSource(readFileSync('tools/gallery/golden/golden.cells', 'utf8')));

  it('flow from what is read to the cell that reads it, whichever way the edge points', () => {
    expect(wireOf(g, 'bar', 'theme')).toMatchObject({ port: 'step', band: 'sync' }); // step=&bar
    expect(wireOf(g, 'mode', 'theme')).toMatchObject({ port: 'over', band: 'cv', pointer: true }); // over=&mode
    expect(g.bulbs.get('walkBar')).toBe('parts'); // &parts … &walkBar: a tap, a bulb on its table (decision 016)
    expect(wireOf(g, 'bar', 'parts')).toMatchObject({ port: 'step', band: 'sync' }); // &parts step=&bar: the bus, once
    expect(between(g, 'parts', 'walk')).toMatchObject({ port: 'step', band: 'sync', bulb: 'walkBar' }); // step=&walkBar: from its bulb
    expect(g.bulbs.get('up')).toBe('tune'); // &tune … &up &up: read there only, a bulb on its track (#221)
    expect(wireOf(g, 'capstan', 'tape')).toMatchObject({ port: 'step', band: 'sync' });
  });

  it('a table a cell reads twice (map= and pitch=) is two wires, each with its own id (#182)', () => {
    const r = compileSource(['&t 0 1 .3 -1', '&bar step=1', '&mel step=&bar 0 2', '&v loop=C4 map=&t pitch=&t 0 1 2 3', '&out loop=SAMPLE_RATE map=sample [&mel * &v]'].join('\n'));
    const from = buildGraph(r).edges.filter((x) => x.from === 'cell:t' && x.to === 'cell:v');
    expect(from.map((x) => x.port).sort()).toEqual(['map', 'pitch']);
    expect(new Set(from.map((x) => x.id)).size).toBe(2);
  });

  it('take their band from the port: values, ticks or sound', () => {
    expect(wireOf(g, 'motif', 'tape')).toMatchObject({ port: 'write', band: 'cv' }); // a tape of notes
    // (a read head is a bulb on its tape, decision 021: every cell its own node, the wire)
    expect(wireOf(buildGraph(compileSource(readFileSync('tools/gallery/golden/golden.cells', 'utf8')), { bulbs: false }), 'tape', 'near')).toMatchObject({
      port: 'play',
      band: 'cv',
    });
    expect(wireOf(g, 'tape', 'near')).toBeUndefined();
    expect(wireOf(g, 'accent', 'flute')).toMatchObject({ port: 'level', band: 'cv' });
    expect(wireOf(g, 'vibrato', 'flute')).toMatchObject({ port: 'pitch', band: 'cv' });
    expect(wireOf(g, 'theme', 'flute')).toMatchObject({ port: 'voice', band: 'cv' });
    expect(wireOf(g, 'up', 'tune')).toBeUndefined(); // (a bulb's splice is its host's track, not a wire)
    expect(wireOf(g, 'hh', 'out')).toMatchObject({ port: 'mix', band: 'audio', pointer: false });
    expect(wireOf(g, 'piece', 'out')).toMatchObject({ port: 'about', band: 'none' });
  });

  it('are as wide as the values they carry at once: a table its entries, a chord its notes', () => {
    expect(wireOf(g, 'mode', 'theme')?.width).toBe(7);
    expect(wireOf(g, 'blues', 'walk')?.width).toBe(6);
    const chords = buildGraph(compileSource('&c step=1 [0,4,7] 2\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&c * &v]'));
    expect(wireOf(chords, 'c', 'v')).toMatchObject({ port: 'voice', width: 3 });
  });

  it('into a resonator with tines: as wide as its tines (a note picks one)', () => {
    const tines =
      '&bar scan(1 1 1 1) step=92bpm\n&notes 0 2 4 7 9 12 14 16\n&tune over=&notes step=&bar*2 0 2 4\n&k body=tine loop=C4 0 2 4 7 9 12 14 16\n&out loop=SAMPLE_RATE map=sample [&tune * &k * .5]';
    expect(wireOf(buildGraph(compileSource(tines)), 'tune', 'k')).toMatchObject({ port: 'voice', width: 8 });
    // the Kalimba reads through its tines and plays them: one wire between them (the same id), its tines wide
    expect(wireOf(buildGraph(compileSource(PRESETS.kalimba.source)), 'kalimba', 'tune')).toMatchObject({ port: 'over', width: 8 });
  });

  it('carry sound where the source is a sound: a mix written to tape, a modulator, a wave in a pitch sum (FM)', () => {
    const sound = buildGraph(compileSource(PRESETS.soundtape.source), { bulbs: false }).edges;
    expect(wireOf(buildGraph(compileSource(PRESETS.soundtape.source)), 'dry', 'tape')).toMatchObject({ port: 'write', band: 'audio' });
    expect(sound.filter((e) => e.port === 'play').map((e) => e.band)).toEqual(expect.arrayContaining(['audio']));
    expect(sound.filter((e) => e.port === 'play' && e.band !== 'audio')).toEqual([]);
    const notes = buildGraph(compileSource(PRESETS.echotape.source)).edges;
    expect(notes.filter((e) => e.port === 'write' || e.port === 'play').map((e) => e.band)).toEqual(expect.arrayContaining(['cv']));
    expect(notes.filter((e) => (e.port === 'write' || e.port === 'play') && e.band !== 'cv')).toEqual([]);
    const fm = buildGraph(compileSource('&t step=1 0 2\n&op loop=40 0 1 0 -1\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [(&t + &op) * &v]'));
    expect(wireOf(fm, 'op', 'v')).toMatchObject({ port: 'pitch', band: 'audio' });
  });

  it('a gate: a note bus out to its voices, their sound out of their own wheels into the mix (#234)', () => {
    const r = compileSource(PRESETS.gate.source);
    const m = buildGraph(r);
    expect(wireOf(m, 'leadOut', 'lead')).toMatchObject({ port: 'voice', band: 'cv' });
    expect(wireOf(m, 'leadOut', 'bell')).toMatchObject({ port: 'voice', band: 'cv' });
    expect(between(m, 'leadOut', 'out')).toBeUndefined();
    expect(between(m, 'lead', 'out')).toMatchObject({ port: 'mix', band: 'audio', sound: 'lead' });
    expect(between(m, 'bell', 'out')).toMatchObject({ port: 'mix', band: 'audio', sound: 'bell' });
    expect(between(m, 'kit', 'out')).toMatchObject({ port: 'mix', band: 'audio', sound: 'kit' });
    // (one net: the gate's notes to every voice it plays)
    expect(m.nets.find((n) => n.id === 'net:cell:leadOut:voice')?.taps).toHaveLength(2);
    // (a gate's voices keep their nodes; a kit's, played by it only, are bulbs on it)
    expect(['lead', 'bell'].map((v) => m.bulbs.get(v))).toEqual([undefined, undefined]);
    expect(['bd', 'sd', 'hh'].map((v) => m.bulbs.get(v))).toEqual(['kit', 'kit', 'kit']);
  });
  it('a table read by several is a net: one trunk, a tap for each reader', () => {
    const net = g.nets.find((n) => n.owner === 'cell:mode');
    expect(net).toMatchObject({ port: 'over', band: 'cv' });
    expect(net!.taps.map((id) => g.edges.find((e) => e.id === id)!.to).sort()).toEqual(['cell:comp', 'cell:motif', 'cell:theme']);
    // (a table read by one is an edge, not a net)
    expect(g.nets.some((n) => n.owner === 'cell:alpha')).toBe(false);
  });

  // docs/decisions/010-canon-copies.md: a canon's copies and a tape's heads are one net with taps at a delay
  const delays = (model: ReturnType<typeof buildGraph>, owner: string) => {
    const net = model.nets.find((n) => n.owner === `cell:${owner}`)!;
    return net.taps.map((id) => {
      const e = model.edges.find((x) => x.id === id)!;
      // (into a product: the voice it is)
      const to = model.nodes.find((n) => n.id === e.to);
      return [to?.kind === 'junction' ? to.voice : e.to.slice('cell:'.length), transformLabel(e.transforms[0])];
    });
  };

  it('a canon is one net from its leader, a tap at a delay for each copy (Frère Jacques)', () => {
    const canon = buildGraph(compileSource(PRESETS.canon.source));
    expect(canon.nets.find((n) => n.owner === 'cell:john')).toMatchObject({ port: 'voice', band: 'cv', delayed: true });
    // (each product written is a tap: the four voices in the left channel's mix, then in the right's)
    const copies = [
      ['v1', ''],
      ['v2', '[<<]'],
      ['v3', '[<<2]'],
      ['v4', '[<<3]'],
    ];
    expect(delays(canon, 'john')).toEqual([...copies, ...copies]);
  });

  it('copies spliced into several cells are a net too; plain refs stay edges of their own', () => {
    const src = (b: string) => `&m step=1 0 2 4\n&p &m\n&q ${b}\n&v s=sine loop=C4\n&w s=tri loop=C4\n&out loop=SAMPLE_RATE map=sample [&p * &v, &q * &w]`;
    const copies = buildGraph(compileSource(src('&m[<<1]')));
    expect(copies.nets.find((n) => n.owner === 'cell:m')).toMatchObject({ port: 'braid', delayed: true });
    expect(delays(copies, 'm')).toEqual([
      ['p', ''],
      ['q', '[<<]'],
    ]);
    expect(buildGraph(compileSource(src('&m'))).nets.some((n) => n.owner === 'cell:m')).toBe(false);
  });

  it('a tape’s heads are its net’s taps, each at its delay in seconds', () => {
    // (every cell its own node: drawn, the heads are bulbs on the tape — decision 021)
    const tape = buildGraph(compileSource(PRESETS.echotape.source), { bulbs: false });
    expect(tape.nets.find((n) => n.owner === 'cell:tape')).toMatchObject({ port: 'play', delayed: true });
    expect(delays(tape, 'tape')).toEqual([
      ['near', 'at=0.375'],
      ['mid', 'at=0.75'],
      ['far', 'at=1.5'],
    ]);
    // (a melody playing several voices as written, no delay: a bus, laid reader to reader)
    expect(g.nets.find((n) => n.owner === 'cell:mode')?.delayed).toBe(false);
  });

  it('into a sound card of two channels: a sound in both, a pair (L R); a product into one, one wire; into a mono one, one wire', () => {
    expect(wireOf(buildGraph(compileSource(PRESETS.soundtape.source)), 'dry', 'out')).toMatchObject({ port: 'mix', width: 2 }); // [&dry …] [&dry …]
    expect(wireOf(g, 'hh', 'out')).toMatchObject({ port: 'mix', width: 1 }); // [ … ] [ … &hats * &hh * .1]
    const mono = buildGraph(compileSource('&t step=1 0 2\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]'));
    expect(wireOf(mono, 'v', 'out')).toMatchObject({ port: 'mix', width: 1 });
  });

  it('every edge of every example has a port and a band, and its ends are the edge’s', () => {
    for (const [key, p] of Object.entries(PRESETS)) {
      for (const e of buildGraph(compileSource(p.source)).edges) {
        expect(e.port, `${key}: ${e.id}`).not.toBe('');
        expect(['sync', 'cv', 'audio', 'none']).toContain(e.band);
        expect(e.width, `${key}: ${e.id}`).toBeGreaterThanOrEqual(1);
        expect([e.source, e.target].sort()).toEqual([e.from, e.to].sort());
      }
    }
  });
});

describe('a tape’s read heads are bulbs on it (decision 021)', () => {
  it('a head that takes nothing but its tape: no node, its edges out leaving from its bulb, the tape turned with it', () => {
    const g = buildGraph(compileSource(PRESETS.echotape.source));
    expect(['near', 'mid', 'far'].map((h) => g.bulbs.get(h))).toEqual(['tape', 'tape', 'tape']);
    expect(g.nodes.some((n) => n.id === 'cell:near')).toBe(false);
    expect(g.edges.some((e) => e.port === 'play')).toBe(false); // (the tape into its head: inside the wheel)
    const out = g.edges.filter((e) => e.bulb === 'near');
    expect(out.length).toBeGreaterThan(0);
    for (const e of out) expect(e).toMatchObject({ from: 'cell:tape', bulbAt: { r: expect.any(Number) } });
    // (unturned, the write head on top: a head an eighth of the way round sits up and to the right, outside the rim)
    const at = out[0].bulbAt!;
    expect(at.y).toBeLessThan(0);
    expect(at.x).toBeGreaterThan(0);
    expect(Math.hypot(at.x, at.y)).toBeGreaterThan(70);
    expect(g.nodes.find((n) => n.id === 'cell:tape')).toMatchObject({ reach: { room: expect.any(Number) } });
  });

  it('a head that takes more than its tape, or reads at a clock, stays a node of its own', () => {
    const src = (head: string) =>
      ['&reel motor=1', '&mel step=1 0 2', '&v loop=C4', '&lfo loop=1 0 1', '&tape step=&reel write=&mel length=4', head, '&out loop=44k map=sample [&h * &v]'].join('\n');
    expect(buildGraph(compileSource(src('&h play=&tape at=1'))).bulbs.get('h')).toBe('tape');
    expect(buildGraph(compileSource(src('&h play=&tape at=1 level=&lfo'))).bulbs.has('h')).toBe(false);
    expect(buildGraph(compileSource(src('&h play=&tape at=&reel'))).bulbs.has('h')).toBe(false);
  });

  it('heads with no room for their bulbs stay nodes: two at one place, one on the write head, one the tape records', () => {
    const src = (...heads: string[]) =>
      [
        '&reel motor=1',
        '&mel step=1 0 2',
        '&v loop=C4',
        '&tape step=&reel write=&mel length=6',
        ...heads,
        `&out loop=44k map=sample [${heads.map((h) => `${h.split(' ')[0]} * &v`).join(', ')}]`,
      ].join('\n');
    // (a stereo pair at one place: the first a bulb, the second a node of its own, so each can be tapped)
    const pair = buildGraph(compileSource(src('&l play=&tape at=2', '&r play=&tape at=2')));
    expect([pair.bulbs.get('l'), pair.bulbs.has('r')]).toEqual(['tape', false]);
    expect(pair.edges.some((e) => e.port === 'play' && e.to === 'cell:r')).toBe(true);
    // (on the write head: at=0, or a whole length round)
    for (const at of ['0', '6']) expect(buildGraph(compileSource(src(`&h play=&tape at=${at}`))).bulbs.has('h')).toBe(false);
    // (a head the tape records, a loop: its write edge and its play edge are both drawn)
    const loop = buildGraph(
      compileSource(['&reel motor=1', '&v loop=C4', '&a play=&tape at=1', '&tape step=&reel write=&a length=4', '&out loop=44k map=sample [&a * &v]'].join('\n')),
    );
    expect(loop.bulbs.has('a')).toBe(false);
    expect(loop.edges.filter((e) => e.port === 'write' || e.port === 'play').map((e) => `${e.from}->${e.to}:${e.port}`)).toEqual(
      expect.arrayContaining(['cell:a->cell:tape:write', 'cell:tape->cell:a:play']),
    );
  });
});

describe('a product is a junction (docs/notes/nets.md, decision 2)', () => {
  const g = buildGraph(compileSource(readFileSync('tools/gallery/golden/golden.cells', 'utf8')));
  const junctionsOf = (model: GraphModel, voice: string) => model.nodes.filter((n) => n.kind === 'junction' && n.voice === voice);

  it('its terms go in, its notes go out to its voice (`is`), and the voice’s sound into the mix (#234: an unnamed gate)', () => {
    const m = buildGraph(compileSource('&t step=1 0 2\n&acc map=amp step=1 1 .5\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &acc * &v * .4]'));
    expect(m.nodes.filter((n) => n.kind === 'junction')).toEqual([
      expect.objectContaining({ id: 'junction:out:0', mix: 'out', entry: 0, voice: 'v', notes: 't', levels: ['acc'], gain: 0.4 }),
    ]);
    const wires = m.edges.map((e) => [e.from, e.to, e.port, e.band, transformLabel(e.transforms[0])]);
    expect(wires).toEqual(
      expect.arrayContaining([
        ['cell:t', 'junction:out:0', 'voice', 'cv', ''],
        ['cell:acc', 'junction:out:0', 'level', 'cv', ''],
        ['junction:out:0', 'cell:v', 'is', 'cv', ''],
        ['cell:v', 'cell:out', 'mix', 'audio', '×0.4'],
      ]),
    );
    expect(m.edges.some((e) => e.from === 'cell:t' && e.to === 'cell:v')).toBe(false);
    expect(m.edges.some((e) => e.from === 'junction:out:0' && e.to === 'cell:out')).toBe(false);
  });

  it('a voice is where sound leaves: in the golden graph &lead takes notes from each of its products, its sound into each mix once', () => {
    expect(g.edges.filter((e) => e.to === 'cell:lead').map((e) => e.port)).toEqual(['is', 'is', 'is', 'is', 'is']);
    // which melody goes to which mix: each product says
    for (const j of junctionsOf(g, 'lead'))
      expect(
        g.edges.filter((e) => e.to === j.id && e.port === 'voice'),
        j.id,
      ).toHaveLength(1);
    expect(
      junctionsOf(g, 'lead')
        .map((j) => (j.kind === 'junction' ? j.mix : ''))
        .sort(),
    ).toEqual(['leadA', 'leadB', 'out', 'out', 'out']);
    expect(
      g.edges
        .filter((e) => e.from === 'cell:lead' && e.port === 'mix')
        .map((e) => e.to)
        .sort(),
    ).toEqual(['cell:leadA', 'cell:leadB', 'cell:out']);
  });

  it('a voice in several mixes is a net of sound; a sound alone goes into its mix as it is', () => {
    // (each junction sits on its voice's rim: layout/junctions.ts)
    expect(g.nets.find((n) => n.owner === 'cell:lead')?.port).toBe('mix');
    expect(wireOf(g, 'leadA', 'out')).toMatchObject({ port: 'mix', band: 'audio' }); // [&leadA, …]
  });

  it('an instrument in a product is its voice; a kit’s pattern is its sound', () => {
    const w = buildGraph(compileSource(PRESETS.waveforms.source));
    expect(junctionsOf(w, 'bass')).toHaveLength(1);
    expect(wireOf(w, 'roots', 'bass')).toMatchObject({ port: 'voice' });
  });

  it('the routing’s pairs it stands for: the melody into each voice it plays on, the voice into the mix', () => {
    const e = between(g, 'theme', 'flute')!;
    expect(e.routes).toEqual([['cell:theme->cell:flute'], ['cell:flute->cell:out']]);
    expect(g.alias.get('cell:theme->cell:flute')).toBeUndefined();
    expect(g.alias.has('cell:theme->cell:flute')).toBe(true);
  });
});

describe('a parameter that takes a clock is a tap of it (delaytime=&bar*4/3, length=, at=)', () => {
  const tapOf = (model: GraphModel, from: string, to: string, port: string) => model.edges.find((e) => e.from === `cell:${from}` && e.to === `cell:${to}` && e.port === port);

  it('a sync wire from the clock to the cell, carrying its rate as written', () => {
    const acid = buildGraph(compileSource(PRESETS.acid.source));
    const e = tapOf(acid, 'bar', 'tb303', 'delaytime')!;
    expect(e).toMatchObject({ band: 'sync', width: 1, pointer: false });
    expect(e.transforms).toEqual([
      [
        {
          kind: 'rate',
          by: [
            { op: '×', n: 4 },
            { op: '÷', n: 3 },
          ],
          per: 'step',
          whole: false,
        },
      ],
    ]);
    expect(transformLabel(e.transforms[0])).toBe('×4÷3');
  });

  it('into a meter: a tap of its net (ground), as a step is, so it blinks with it and isn’t drawn as an edge of its own', () => {
    const acid = buildGraph(compileSource(PRESETS.acid.source));
    const net = acid.nets.find((n) => n.owner === 'cell:bar');
    expect(net).toMatchObject({ id: 'net:cell:bar:step', port: 'step', band: 'sync' });
    expect(net!.taps).toContain(tapOf(acid, 'bar', 'tb303', 'delaytime')!.id);
    // (only the clock tap: the voice isn't stepped)
    expect(acid.nets.filter((n) => n.port === 'delaytime')).toEqual([]);
  });

  it('beside a step from the same clock: a wire each', () => {
    const m = buildGraph(
      compileSource(
        '&bar scan(1 1 1 1) step=120bpm\n&t step=&bar 0 2\n&v s=sine loop=C4 delaytime=&bar*2 delay=.3\n&w step=&bar length=&bar/4 write=&t\n&h play=&w at=&bar\n&out loop=SAMPLE_RATE map=sample [&h * &v]',
      ),
    );
    expect(tapOf(m, 'bar', 'v', 'delaytime')?.transforms.map(transformLabel)).toEqual(['×2']);
    expect(tapOf(m, 'bar', 'w', 'step')).toBeDefined();
    expect(tapOf(m, 'bar', 'w', 'length')?.transforms.map(transformLabel)).toEqual(['÷4']);
    expect(tapOf(m, 'bar', 'h', 'at')?.transforms.map(transformLabel)).toEqual(['']);
    expect(m.nets.find((n) => n.owner === 'cell:bar')!.taps).toHaveLength(5);
  });

  it('from a clock that is not a meter: an edge drawn, not a net', () => {
    const m = buildGraph(compileSource('&lfo map=lin loop=2 0 1\n&t step=1 0 2\n&v s=sine loop=C4 delaytime=&lfo/2 delay=.3\n&out loop=SAMPLE_RATE map=sample [&t * &v]'));
    expect(tapOf(m, 'lfo', 'v', 'delaytime')).toMatchObject({ band: 'sync', transforms: [[{ kind: 'rate', by: [{ op: '÷', n: 2 }] }]] });
    expect(m.nets.some((n) => n.owner === 'cell:lfo')).toBe(false);
  });
});

describe('a wire carries its transform', () => {
  const edge = (src: string, from: string, to: string) => between(buildGraph(compileSource(src), { bulbs: false }), from, to)!;

  it('a canon: each voice its melody delayed, in steps, and its gain into the mix', () => {
    const src = PRESETS.canon.source;
    expect(edge(src, 'john', 'v1').transforms).toEqual([[]]);
    expect(edge(src, 'john', 'v2').transforms).toEqual([[{ kind: 'delay', by: 1, unit: 'step' }]]);
    expect(edge(src, 'john', 'v4').transforms).toEqual([[{ kind: 'delay', by: 3, unit: 'step' }]]);
    expect(edge(src, 'v2', 'left').transforms).toEqual([[{ kind: 'gain', by: 0.4 }]]);
  });

  it('a tape: each read head its delay, in tape-seconds', () => {
    const src = PRESETS.echotape.source;
    expect(edge(src, 'tape', 'near').transforms).toEqual([[{ kind: 'delay', by: 0.375, unit: 'second' }]]);
    expect(edge(src, 'tape', 'far').transforms).toEqual([[{ kind: 'delay', by: 1.5, unit: 'second' }]]);
    expect(edge(src, 'tune', 'tape').transforms).toEqual([[]]); // (the write head)
  });

  it('a pitch sum: a number transposes by semitones, a subtracted term is negated', () => {
    expect(edge(PRESETS.pertonos.source, 'alto', 'cello').transforms).toEqual([
      [
        { kind: 'delay', by: 1, unit: 'step' },
        { kind: 'transpose', by: -7, unit: 'semitone' },
      ],
    ]);
    const sum = '&t step=1 0 2\n&w loop=5 0 .2 0 -.2\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [(&t - &w[1:]) * &v]';
    expect(edge(sum, 'w', 'v')).toMatchObject({ port: 'pitch', transforms: [[{ kind: 'pick', pick: { kind: 'slice', from: 1, to: null } }, { kind: 'negate' }]] });
  });

  it('a step: its rate as written, per cycle, the whole braid, through a belt', () => {
    expect(edge(PRESETS.echotape.source, 'bar', 'tune').transforms).toEqual([[{ kind: 'rate', by: [{ op: '×', n: 2 }], per: 'step', whole: false }]]);
    expect(edge(PRESETS.fifths.source, 'tune', 'key').transforms).toEqual([[{ kind: 'rate', by: [], per: 'cycle', whole: false }]]);
    expect(edge(PRESETS.automaton.source, 'bar', 'bells').transforms).toEqual([[{ kind: 'rate', by: [{ op: '×', n: 2 }], per: 'step', whole: false, belt: 3000 }]]);
    expect(edge(PRESETS.waveforms.source, 'tune', 'pluck').transforms).toEqual([[{ kind: 'rate', by: [], per: 'step', whole: true }]]);
    expect(edge('&m step=1 0\n&t step=&m*3/2 0', 'm', 't').transforms).toEqual([
      [
        {
          kind: 'rate',
          by: [
            { op: '×', n: 3 },
            { op: '÷', n: 2 },
          ],
          per: 'step',
          whole: false,
        },
      ],
    ]);
  });

  it('a ref written several times: one transform each, in order', () => {
    const e = edge('&m 0 4\n&t step=1 &m &m^$7 &m[1:] &m[<<2] &m^2', 'm', 't');
    expect(e.count).toBe(5);
    expect(e.transforms).toEqual([
      [],
      [{ kind: 'transpose', by: 7, unit: 'grid' }],
      [{ kind: 'pick', pick: { kind: 'slice', from: 1, to: null } }],
      [{ kind: 'delay', by: 2, unit: 'step' }],
      [{ kind: 'degree', by: 2 }],
    ]);
    expect(edge('&s scan(2 2 1 2 2 2 1)\n&t over=&s[>>2] step=1 0', 's', 't').transforms).toEqual([[{ kind: 'delay', by: -2, unit: 'step' }]]);
  });
});

/** A `&name` written on a cell's line, read back from the text: where it is written, and the transform written with it, as a label spells it. */
interface Token {
  readonly name: string;
  /** The attribute it is the value of (`over`, `step`, `lpf` …), `braid` (a step of the cell) or `mix` (in a mix's brackets). */
  readonly where: string;
  readonly written: string;
}

/** The lines of a piece, each with the lines it continues onto (a line ending in +, *, a comma or [ goes on). */
function linesOf(source: string): Map<number, string> {
  const lines = source.split('\n');
  const out = new Map<number, string>();
  // (each line without its comment, so a comment on a line that goes on doesn't hide the next: strings blanked first)
  const bare = (line: string) => line.replace(/"[^"]*"/g, '""').replace(/#.*$/, '');
  for (let i = 0; i < lines.length; i++) {
    const start = i;
    let text = bare(lines[i]);
    while (/[+*,[]\s*$/.test(text) && i + 1 < lines.length) text += ' ' + bare(lines[++i]);
    out.set(start + 1, text);
  }
  return out;
}

/**
 * The tokens on a line, its own name aside. Strings, comments and unnamed cells (`&( … )`: their tokens are on their own
 * lines in the graph) are left out. Independent of the parser: a name the graph drops shows up here.
 */
function tokensOn(line: string): Token[] {
  let text = line.replace(/"[^"]*"/g, '""').replace(/#.*$/, '');
  for (let i = text.indexOf('&('); i >= 0; i = text.indexOf('&(')) {
    let depth = 0;
    let j = i + 1;
    for (; j < text.length; j++)
      if (text[j] === '(') depth++;
      else if (text[j] === ')' && --depth === 0) break;
    text = text.slice(0, i) + '_' + text.slice(j + 1);
  }
  const at = /\bat=([\d.]+)/.exec(text)?.[1];
  const belt = /\bbelt=/.test(text);
  const out: Token[] = [];
  const re = /((?:degree\(|inverse\()*)&([A-Za-z_][A-Za-z0-9_]*)(\[[^\]]*\])?(\^\$?-?\d+)?/g;
  let first = true;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (first && m.index === text.search(/\S/)) {
      first = false;
      continue;
    }
    first = false;
    // what is written after it: the operations' closing (innermost first), a rate's chain
    let rest = text.slice(m.index + m[0].length);
    let mul = 1;
    // (^n is a degree, as degree(&x, n): the innermost; ^$n a transposition after the tables)
    const degree = m[4] && !m[4].startsWith('^$');
    let add = degree ? +m[4].slice(1) : 0;
    for (const w of (m[1].match(/degree\(|inverse\(/g) ?? []).reverse()) {
      if (w === 'inverse(') {
        [mul, add] = [-mul, -add];
        rest = rest.replace(/^\s*\)/, '');
      } else {
        const n = /^\s*,\s*(-?\d+)\s*\)/.exec(rest);
        add += +(n?.[1] ?? 0);
        rest = rest.slice(n?.[0].length ?? 0);
      }
    }
    // where: the attribute whose value it is (through ranges, products and parentheses), else the braid or a mix
    let before = text.slice(0, m.index - m[1].length);
    let where: string | undefined;
    for (let guard = 0; guard < 20 && where === undefined; guard++) {
      const attr = /([a-z]+)=(?:[a-z]+\()?\(?$/.exec(before);
      if (attr) where = attr[1];
      else if (/[*+]\s*$/.test(before)) before = before.replace(/[^\s=]+\s*[*+]\s*$/, '');
      else if (/\b([a-z]+)=\([^)]*$/.test(before)) where = /\b([a-z]+)=\([^)]*$/.exec(before)![1];
      else break;
    }
    const inMix = (text.slice(0, m.index).match(/\[/g)?.length ?? 0) > (text.slice(0, m.index).match(/\]/g)?.length ?? 0);
    const shift = m[3] && /^\[(<<|>>)(\d*)\]$/.exec(m[3]);
    const chain = (/^([*/][\d.]+)+/.exec(rest.replace(/^\)/, ''))?.[0] ?? '').replace(/\*/g, '×').replace(/\//g, '÷');
    const cycle = /cycle\($/.test(text.slice(0, m.index));
    // (an argument of a generator, spell(…, &keys, …): the steps it makes are its, not written)
    const call = !['', 'degree', 'inverse', 'cycle'].includes(openCall(text.slice(0, m.index - m[1].length)) ?? '');
    where = inMix ? 'mix' : (where ?? (call ? 'generated' : 'braid'));
    const written =
      where === 'step' || where === 'loop'
        ? [where === 'loop' ? 'loop' : '', (cycle ? '⟳' : '') + chain, belt ? '· belt' : '']
        : TIME_PARAMS.has(where)
          ? [(cycle ? '⟳' : '') + chain]
          : [
              m[3] && !shift ? m[3] : '',
              shift ? `[${shift[1]}${shift[2] && shift[2] !== '1' ? shift[2] : ''}]` : '',
              mul < 0 ? 'inverse' : '',
              add ? `^${add}` : '',
              degree ? '' : (m[4] ?? ''),
              where === 'play' && at ? `at=${+at}` : '',
            ];
    out.push({ name: m[2], where, written: written.filter(Boolean).join(' ') });
  }
  return out;
}

/** The function whose parentheses are open at the end of a text (`spell(free(…), ` → spell; `about=(` → ''), if any. */
function openCall(text: string): string | undefined {
  let depth = 0;
  for (let i = text.length - 1; i >= 0; i--)
    if (text[i] === ')') depth++;
    else if (text[i] === '(' && depth-- === 0) return /[a-z]*$/.exec(text.slice(0, i))![0];
  return undefined;
}

/** The port a name written as the value of an attribute is read through. */
const PORT: Readonly<Record<string, string>> = { loop: 'step', generated: 'braid' };

describe('every name written is one wire carrying the transform it writes, and every wire a name written', () => {
  const all = { ...Object.fromEntries(Object.entries(PRESETS).map(([k, p]) => [k, p.source])), golden: readFileSync('tools/gallery/golden/golden.cells', 'utf8') };

  it.each(Object.entries(all))('%s', (_, source) => {
    const program = compileSource(source);
    const model = buildGraph(program);
    const lines = linesOf(source);
    const missing: string[] = [];
    // (a wire, by the line it is written on, the name written and the port: what the tokens matched)
    const matched = new Set<string>();
    const junctions = new Map(model.nodes.flatMap((n) => (n.kind === 'junction' ? [[n.id, n] as const] : [])));
    let wires = 0;
    for (const c of program.cells.values()) {
      if (c.lambda || c.implicit) continue;
      // (a tap its table declares has no line of its own: its name is written on the table's, decision 016)
      const table = program.taps?.get(c.name);
      if (table && program.cells.get(table)?.span.line === c.span.line) continue;
      // (in a groove or a drum motif, read through the voices' kit, a chord of voices [&bd, &hh] is steps of its braid, not a mix)
      const groove = c.over === 'kit:voices';
      const tokens = tokensOn(lines.get(c.span.line) ?? '')
        .map((t) => (groove && t.where === 'mix' ? { ...t, where: 'braid' } : t))
        .filter((t) => program.cells.has(t.name));
      // each place a name is written in the braid is one of its wire's transforms, in order
      const written = new Map<string, Token[]>();
      for (const t of tokens) {
        const port = PORT[t.where] ?? t.where;
        const key = `${t.name}|${port}`;
        written.set(key, [...(written.get(key) ?? []), t]);
      }
      for (const [key, ts] of written) {
        const [name, port] = key.split('|');
        if (port === 'mix') {
          // in a mix: a sound alone goes in as it is; in a product, each name is one wire into that product's junction
          // (its voice, `is`; a term, with the transform written on it), one for each product it is written in
          const into = model.edges.filter((x) => x.from === cellId(name) && junctions.get(x.to)?.mix === c.name);
          const alone = model.edges.find((x) => x.from === cellId(name) && x.to === cellId(c.name) && (x.port === 'mix' || x.port === 'midi'));
          // (a product's voice: its notes come from the product's junction, its sound goes into the mix once — #234)
          const asVoice = [...junctions.values()].filter(
            (j) => j.kind === 'junction' && j.mix === c.name && j.voice === name && model.edges.some((x) => x.from === j.id && x.to === cellId(name) && x.port === 'is'),
          );
          const count = into.reduce((a, x) => a + x.count, 0) + asVoice.length + (alone && !asVoice.length ? 1 : 0);
          // (a sound alone in both channels of a sound card is one wire, a pair: L R)
          const pair = alone && alone.width === 2 && ts.length === count + 1;
          // (no exceptions: only a cell show=off hides, and then it is not in the graph at all)
          // (a gate in a mix goes in as the voices it plays, each from its own wheel: #234)
          const gate = program.cells.get(name);
          const voices = gate?.gate?.receivers ?? [];
          if (voices.length)
            expect(
              voices.every((v) => model.edges.some((x) => x.from === cellId(v) && x.to === cellId(c.name))),
              `&${c.name}: &${name}'s voices`,
            ).toBe(true);
          // (a voice written on a gate's line, in a chord: the gate's notes go to it — its note bus)
          else if (c.gate?.receivers.includes(name)) {
            expect(
              model.edges.some((x) => x.from === cellId(c.name) && x.to === cellId(name) && x.port === 'voice'),
              `&${c.name} → &${name}`,
            ).toBe(true);
            matched.add(`${c.name}|${name}|mix`);
          } else if (count === 0 && model.nodes.some((n) => n.id === cellId(name))) missing.push(`&${c.name}: &${name} (in the mix)`);
          else if (count) expect(pair ? count + 1 : count, `&${c.name}: &${name}, written ${ts.length} times in the mix`).toBe(ts.length);
          // each wire carries what is written on the name in its product: a pick, a shift (a number in the sum is the
          // product's: its label goes on after it), each token's once
          const left = ts.map((t) => t.written);
          for (const l of into.flatMap((x) => x.transforms.map(transformLabel))) {
            const at = left.reduce((best, w, i) => (l.startsWith(w) && (best < 0 || w.length > left[best].length) ? i : best), -1);
            expect(at, `&${c.name}: &${name} → ${l}, written ${left.join(', ')}`).toBeGreaterThanOrEqual(0);
            left.splice(at, 1);
          }
          if (count) matched.add(`${c.name}|${name}|mix`);
          wires += count;
          continue;
        }
        // (along the flow: into the cell whose line it is, but a note's link points from the note)
        const [from, to] = port === 'about' ? [c.name, name] : [name, c.name];
        // (a cell named on a MIDI card is its entry: a note bus into it, #208)
        const as = port === 'braid' && c.map?.kind === 'midi' ? 'midi' : port;
        const e = model.edges.find((x) => x.from === cellId(from) && x.to === cellId(to) && x.port === as);
        if (!e) {
          // (drawn through a petal, hidden by show=off, or a name the graph reads elsewhere: a kit's voice)
          const ids = [edgeId(cellId(c.name), cellId(name)), edgeId(cellId(name), cellId(c.name)), stepEdgeId(cellId(c.name), cellId(name))];
          if (!ids.some((id) => model.alias.has(id))) missing.push(`&${c.name}: &${name} (${port})`);
          continue;
        }
        wires++;
        matched.add(`${c.name}|${name}|${as}`);
        const labels = e.transforms.map(transformLabel);
        if (ts[0].where === 'generated') continue;
        if (as === 'midi') continue;
        if (port === 'braid') expect(labels, `&${c.name}: &${name}`).toEqual(ts.map((t) => t.written));
        else expect(labels, `&${c.name}: ${port}=&${name}`).toEqual([ts[0].written]);
      }
    }
    expect(missing).toEqual([]);
    expect(wires).toBeGreaterThan(0);
    // the other way: every wire is a name written, on the line of the cell that reads it (a note's link: the note's;
    // into a product: its mix's). Not a name: a product's own sound into its mix (the product is the entry), and a wire
    // drawn for a petal (its names are inside the &( … )).
    const forPetals = new Set([...model.alias.values()].filter(Boolean));
    const nameOf = (id: string) => id.slice('cell:'.length);
    const unwritten = model.edges.flatMap((e) => {
      if (junctions.has(e.from) || forPetals.has(e.id)) return [];
      // (a gate's note bus is its braid as written, and a gate in a mix goes in as its voices: #234)
      const gateOf = (n: string) => !!program.cells.get(n)?.gate;
      if (e.port === 'voice' && gateOf(nameOf(e.from))) return [];
      const into = program.cells.get(nameOf(e.to));
      if (e.port === 'mix' && into?.mix?.some((b) => gateOf(b.voice.name) && program.cells.get(b.voice.name)!.gate!.receivers.includes(nameOf(e.from)))) return [];
      const key = junctions.has(e.to)
        ? `${junctions.get(e.to)!.mix}|${nameOf(e.from)}|mix`
        : e.port === 'about'
          ? `${nameOf(e.from)}|${nameOf(e.to)}|about`
          : `${nameOf(e.to)}|${nameOf(e.from)}|${e.port}`;
      // (a product's voice into a MIDI card: written in the card's products, as into a mix)
      const asEntry = e.port === 'midi' ? `${nameOf(e.to)}|${nameOf(e.from)}|mix` : key;
      return matched.has(key) || matched.has(asEntry) ? [] : [`${e.id} (${e.port})`];
    });
    expect(unwritten).toEqual([]);
  });
});

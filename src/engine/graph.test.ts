import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { compileSource } from './compile';
import { buildGraph, type GraphEdge } from './graph';
import { cellId, edgeId, stepEdgeId } from './ids';
import { transformLabel } from './transform';
import { PRESETS } from './presets';

// An edge as a wire (docs/notes/nets.md): its port, band, width and the way the values flow.
const wireOf = (edges: readonly GraphEdge[], from: string, to: string) => {
  const e = edges.find((x) => x.from === `cell:${from}` && x.to === `cell:${to}`);
  return e && { port: e.port, band: e.band, width: e.width, pointer: e.pointer };
};

describe('edges as wires', () => {
  const g = buildGraph(compileSource(readFileSync('tools/gallery/golden/golden.cells', 'utf8')));

  it('flow from what is read to the cell that reads it, whichever way the edge points', () => {
    expect(wireOf(g.edges, 'bar', 'theme')).toMatchObject({ port: 'step', band: 'sync' }); // step=&bar
    expect(wireOf(g.edges, 'mode', 'theme')).toMatchObject({ port: 'over', band: 'cv', pointer: true }); // over=&mode
    expect(wireOf(g.edges, 'up', 'tune')).toMatchObject({ port: 'braid', band: 'cv', pointer: true }); // &tune … &up &up
    expect(wireOf(g.edges, 'capstan', 'tape')).toMatchObject({ port: 'step', band: 'sync' });
  });

  it('take their band from the port: values, ticks or sound', () => {
    expect(wireOf(g.edges, 'motif', 'tape')).toMatchObject({ port: 'write', band: 'cv' }); // a tape of notes
    expect(wireOf(g.edges, 'tape', 'near')).toMatchObject({ port: 'play', band: 'cv' });
    expect(wireOf(g.edges, 'accent', 'flute')).toMatchObject({ port: 'level', band: 'cv' });
    expect(wireOf(g.edges, 'vibrato', 'flute')).toMatchObject({ port: 'pitch', band: 'cv' });
    expect(wireOf(g.edges, 'theme', 'flute')).toMatchObject({ port: 'voice', band: 'cv' });
    expect(wireOf(g.edges, 'leadA', 'parts')).toMatchObject({ port: 'braid', pointer: true });
    expect(wireOf(g.edges, 'hh', 'out')).toMatchObject({ port: 'mix', band: 'audio', pointer: false });
    expect(wireOf(g.edges, 'piece', 'out')).toMatchObject({ port: 'about', band: 'none' });
  });

  it('are as wide as the values they carry at once: a table its entries, a chord its notes', () => {
    expect(wireOf(g.edges, 'mode', 'theme')?.width).toBe(7);
    expect(wireOf(g.edges, 'blues', 'walk')?.width).toBe(6);
    const chords = buildGraph(compileSource('&c step=1 [0,4,7] 2\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&c * &v]'));
    expect(wireOf(chords.edges, 'c', 'v')).toMatchObject({ port: 'voice', width: 3 });
  });

  it('into a resonator with tines: as wide as its tines (a note picks one)', () => {
    const tines =
      '&bar scan(1 1 1 1) step=92bpm\n&notes 0 2 4 7 9 12 14 16\n&tune over=&notes step=&bar/2 0 2 4\n&k body=tine loop=C4 0 2 4 7 9 12 14 16\n&out loop=SAMPLE_RATE map=sample [&tune * &k * .5]';
    expect(wireOf(buildGraph(compileSource(tines)).edges, 'tune', 'k')).toMatchObject({ port: 'voice', width: 8 });
    // the Kalimba reads through its tines and plays them: one wire between them (the same id), its tines wide
    expect(wireOf(buildGraph(compileSource(PRESETS.kalimba.source)).edges, 'kalimba', 'tune')).toMatchObject({ port: 'over', width: 8 });
  });

  it('carry sound where the source is a sound: a mix written to tape, a modulator, a wave in a pitch sum (FM)', () => {
    const sound = buildGraph(compileSource(PRESETS.soundtape.source)).edges;
    expect(wireOf(sound, 'dry', 'tape')).toMatchObject({ port: 'write', band: 'audio' });
    expect(sound.filter((e) => e.port === 'play').map((e) => e.band)).toEqual(expect.arrayContaining(['audio']));
    expect(sound.filter((e) => e.port === 'play' && e.band !== 'audio')).toEqual([]);
    const notes = buildGraph(compileSource(PRESETS.echotape.source)).edges;
    expect(notes.filter((e) => e.port === 'write' || e.port === 'play').map((e) => e.band)).toEqual(expect.arrayContaining(['cv']));
    expect(notes.filter((e) => (e.port === 'write' || e.port === 'play') && e.band !== 'cv')).toEqual([]);
    const fm = buildGraph(compileSource('&t step=1 0 2\n&op loop=40 0 1 0 -1\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [(&t + &op) * &v]'));
    expect(wireOf(fm.edges, 'op', 'v')).toMatchObject({ port: 'pitch', band: 'audio' });
  });

  it('a table read by several is a net: one trunk, a tap for each reader', () => {
    const net = g.nets.find((n) => n.owner === 'cell:mode');
    expect(net).toMatchObject({ port: 'over', band: 'cv' });
    expect(net!.taps.map((id) => g.edges.find((e) => e.id === id)!.to).sort()).toEqual(['cell:motif', 'cell:theme']);
    // (a table read by one is an edge, not a net)
    expect(g.nets.some((n) => n.owner === 'cell:alpha')).toBe(false);
  });

  // docs/decisions/010-canon-copies.md: a canon's copies and a tape's heads are one net with taps at a delay
  const delays = (model: ReturnType<typeof buildGraph>, owner: string) => {
    const net = model.nets.find((n) => n.owner === `cell:${owner}`)!;
    return net.taps.map((id) => {
      const e = model.edges.find((x) => x.id === id)!;
      return [e.to.slice('cell:'.length), transformLabel(e.transforms[0])];
    });
  };

  it('a canon is one net from its leader, a tap at a delay for each copy (Frère Jacques)', () => {
    const canon = buildGraph(compileSource(PRESETS.canon.source));
    expect(canon.nets.find((n) => n.owner === 'cell:john')).toMatchObject({ port: 'voice', band: 'cv', delayed: true });
    expect(delays(canon, 'john')).toEqual([
      ['v1', ''],
      ['v2', '[<<]'],
      ['v3', '[<<2]'],
      ['v4', '[<<3]'],
    ]);
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
    const tape = buildGraph(compileSource(PRESETS.echotape.source));
    expect(tape.nets.find((n) => n.owner === 'cell:tape')).toMatchObject({ port: 'play', delayed: true });
    expect(delays(tape, 'tape')).toEqual([
      ['near', 'at=0.375'],
      ['mid', 'at=0.75'],
      ['far', 'at=1.5'],
    ]);
    // (a melody playing several voices as written, no delay: a bus, laid reader to reader)
    expect(g.nets.find((n) => n.owner === 'cell:mode')?.delayed).toBe(false);
  });

  it('into a sound card of two channels: a pair (L R); into a mono one, one wire', () => {
    expect(wireOf(g.edges, 'hh', 'out')).toMatchObject({ port: 'mix', width: 2 }); // [ … ] [ … ]
    const mono = buildGraph(compileSource('&t step=1 0 2\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]'));
    expect(wireOf(mono.edges, 'v', 'out')).toMatchObject({ port: 'mix', width: 1 });
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

describe('a wire carries its transform', () => {
  const edge = (src: string, from: string, to: string) => buildGraph(compileSource(src)).edges.find((e) => e.from === `cell:${from}` && e.to === `cell:${to}`)!;

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
    expect(edge(PRESETS.echotape.source, 'bar', 'tune').transforms).toEqual([[{ kind: 'rate', by: [{ op: '÷', n: 2 }], per: 'step', whole: false }]]);
    expect(edge(PRESETS.fifths.source, 'tune', 'key').transforms).toEqual([[{ kind: 'rate', by: [], per: 'cycle', whole: false }]]);
    expect(edge(PRESETS.automaton.source, 'bar', 'bells').transforms).toEqual([[{ kind: 'rate', by: [{ op: '÷', n: 2 }], per: 'step', whole: false, belt: 3000 }]]);
    expect(edge(PRESETS.waveforms.source, 'tune', 'pluck').transforms).toEqual([[{ kind: 'rate', by: [], per: 'step', whole: true }]]);
    expect(edge('&m step=1 0\n&t step=&m*2/3 0', 'm', 't').transforms).toEqual([
      [
        {
          kind: 'rate',
          by: [
            { op: '×', n: 2 },
            { op: '÷', n: 3 },
          ],
          per: 'step',
          whole: false,
        },
      ],
    ]);
  });

  it('a ref written several times: one transform each, in order', () => {
    const e = edge('&m 0 4\n&t step=1 &m &m^7 &m[1:] &m[<<2]', 'm', 't');
    expect(e.count).toBe(4);
    expect(e.transforms).toEqual([
      [],
      [{ kind: 'transpose', by: 7, unit: 'grid' }],
      [{ kind: 'pick', pick: { kind: 'slice', from: 1, to: null } }],
      [{ kind: 'delay', by: 2, unit: 'step' }],
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
  for (let i = 0; i < lines.length; i++) {
    const start = i;
    let text = lines[i];
    while (/[+*,[]\s*$/.test(text.replace(/#.*$/, '')) && i + 1 < lines.length) text += ' ' + lines[++i];
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
  const re = /((?:degree\(|inverse\()*)&([A-Za-z_][A-Za-z0-9_]*)(\[[^\]]*\])?(\^-?\d+)?/g;
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
    let add = 0;
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
        : [
            m[3] && !shift ? m[3] : '',
            shift ? `[${shift[1]}${shift[2] && shift[2] !== '1' ? shift[2] : ''}]` : '',
            mul < 0 ? 'inverse' : '',
            add ? `degree ${add > 0 ? '+' : ''}${add}` : '',
            m[4] ?? '',
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

/** Attributes that read a cell the graph doesn't draw yet: a delay's time from a clock (`delaytime=&bar*3/4`), a table its values are looked up in (`map=&curve`). */
const UNDRAWN = new Set(['delaytime', 'map']);

/** The port a name written as the value of an attribute is read through. */
const PORT: Readonly<Record<string, string>> = { loop: 'step', generated: 'braid' };

describe('every name written is a wire carrying the transform it writes', () => {
  const all = { ...Object.fromEntries(Object.entries(PRESETS).map(([k, p]) => [k, p.source])), golden: readFileSync('tools/gallery/golden/golden.cells', 'utf8') };

  it.each(Object.entries(all))('%s', (_, source) => {
    const program = compileSource(source);
    const model = buildGraph(program);
    const lines = linesOf(source);
    const missing: string[] = [];
    let wires = 0;
    for (const c of program.cells.values()) {
      if (c.lambda || c.implicit) continue;
      // (in a groove or a drum motif, read through the voices' kit, a chord of voices [&bd, &hh] is steps of its braid, not a mix)
      const groove = c.over === 'kit:voices';
      const tokens = tokensOn(lines.get(c.span.line) ?? '')
        .map((t) => (groove && t.where === 'mix' ? { ...t, where: 'braid' } : t))
        .filter((t) => t.where !== 'mix' && !UNDRAWN.has(t.where) && program.cells.has(t.name));
      // each place a name is written in the braid is one of its wire's transforms, in order
      const written = new Map<string, Token[]>();
      for (const t of tokens) {
        const port = PORT[t.where] ?? t.where;
        const key = `${t.name}|${port}`;
        written.set(key, [...(written.get(key) ?? []), t]);
      }
      for (const [key, ts] of written) {
        const [name, port] = key.split('|');
        // (along the flow: into the cell whose line it is, but a note's link points from the note)
        const [from, to] = port === 'about' ? [c.name, name] : [name, c.name];
        const e = model.edges.find((x) => x.from === cellId(from) && x.to === cellId(to) && x.port === port);
        if (!e) {
          // (drawn through a petal, hidden by show=off, or a name the graph reads elsewhere: a kit's voice, a sun's law)
          const ids = [edgeId(cellId(c.name), cellId(name)), edgeId(cellId(name), cellId(c.name)), stepEdgeId(cellId(c.name), cellId(name))];
          if (!ids.some((id) => model.alias.has(id))) missing.push(`&${c.name}: &${name} (${port})`);
          continue;
        }
        wires++;
        const labels = e.transforms.map(transformLabel);
        if (ts[0].where === 'generated') continue;
        if (port === 'braid') expect(labels, `&${c.name}: &${name}`).toEqual(ts.map((t) => t.written));
        else expect(labels, `&${c.name}: ${port}=&${name}`).toEqual([ts[0].written]);
      }
    }
    expect(missing).toEqual([]);
    expect(wires).toBeGreaterThan(0);
  });
});

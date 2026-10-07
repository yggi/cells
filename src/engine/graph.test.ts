import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { compileSource } from './compile';
import { buildGraph, type GraphEdge } from './graph';
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

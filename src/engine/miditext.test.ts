import { describe, expect, it } from 'vitest';
import { isMidiText, keyName, keyOf, midiText, parseMidiText } from './miditext';
import { readMidi, writeMidi, type Smf } from './midifile';
import { pieceMidi } from './midiexport';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { PRESETS } from './presets';

describe('a MIDI file as text', () => {
  it('names keys and reads them back, sharps and flats alike', () => {
    expect([60, 61, 63, 21, 127].map(keyName)).toEqual(['C4', 'C#4', 'Eb4', 'A0', 'G9']);
    expect(['C4', 'c#4', 'Db4', 'B#3', 'Cb4', '64', 'H4', 'C10'].map(keyOf)).toEqual([60, 61, 61, 60, 59, 64, null, null]);
  });

  it('is told from a piece by its first line', () => {
    expect(isMidiText('# a file\n\nmidi format=1 ppq=96\n')).toBe(true);
    expect(isMidiText('&piece title="midi"\n')).toBe(false);
    expect(isMidiText('# midi\n&bar scan(1)')).toBe(false);
  });

  it('places events in bars and beats, through the time signatures', () => {
    const smf: Smf = {
      format: 1,
      ppq: 96,
      tempos: [{ tick: 0, micros: 500_000 }],
      meters: [
        { tick: 0, num: 3, den: 4 },
        { tick: 576, num: 6, den: 8 },
      ],
      tracks: [
        {
          name: 'a',
          notes: [
            { channel: 1, key: 60, velocity: 90, tick: 300, end: 348 },
            { channel: 1, key: 62, velocity: 90, tick: 576 + 48 * 7, end: 576 + 48 * 8 },
          ],
          bends: [],
          programs: [],
        },
      ],
    };
    const text = midiText(smf);
    expect(text).toContain('meter 3:1:0 6/8');
    expect(text).toContain('2:1:12 ch1 C4 48 v90');
    expect(text).toContain('4:2:0 ch1 D4 48 v90');
    expect(parseMidiText(text).smf).toEqual(smf);
  });

  it('says which lines it cannot read, and reads the rest', () => {
    const { smf, diagnostics } = parseMidiText('midi format=1 ppq=96\ntrack "x"\n1:1:0 ch1 C4 96 v100\n1:2:0 ch1 X9 96\nhello\n1:3:0 ch17 C4 1');
    expect(smf.tracks[0].notes).toHaveLength(1);
    expect(diagnostics.map((d) => d.span.line)).toEqual([4, 5, 6]);
  });

  it('BWV 847: the file, as text and back, is the same file', () => {
    const result = compileSource(PRESETS.bwv847.source);
    const smf = readMidi(writeMidi(pieceMidi(result, codeShifts(result)).smf));
    const text = midiText(smf, 'bwv847.mid');
    expect(text.split('\n').length).toBeGreaterThan(1765);
    const back = parseMidiText(text);
    expect(back.diagnostics).toEqual([]);
    // (a tempo goes through beats a minute: back to the microsecond, or one off)
    expect(back.smf.tempos.every((t, i) => Math.abs(t.micros - smf.tempos[i].micros) <= 1)).toBe(true);
    expect({ ...back.smf, tempos: [] }).toEqual({ ...smf, tempos: [] });
  });
});

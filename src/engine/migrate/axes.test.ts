import { describe, expect, it } from 'vitest';
import { axes, newPoint, oldMode, OLD_MODES, restyled } from './axes';
import { compileSource } from '../compile';
import { BRIGHTNESS } from '../style';

const errors = (text: string, old = false) =>
  compileSource(text, undefined, { old })
    .diagnostics.filter((d) => d.severity !== 'info' && !d.message.startsWith('Nothing plays yet'))
    .map((d) => `${d.severity}: ${d.message}`);

describe('decision 076: a style on the old axes, sync harm artic energy, on the new, sync harm drive bright (#572)', () => {
  it('oldMode: each frozen mode point finds its own mode; a point between finds the nearest', () => {
    for (const m of OLD_MODES) expect(oldMode(m.point)).toBe(m.mode);
    // (Spooky's old point: harmonic minor's, exactly)
    expect(oldMode({ sync: 0.2, harm: 0.9, artic: 0.3, energy: 0.35 })).toBe('harmonic_minor');
    // (the centre: nearest Synth-pop's aeolian)
    expect(oldMode({ sync: 0.5, harm: 0.5, artic: 0.5, energy: 0.5 })).toBe('aeolian');
  });

  it('newPoint: sync and harm kept, drive the mean of articulation and energy, bright the mode’s brightness', () => {
    expect(newPoint({ sync: 1, harm: 0.12, artic: 0.85, energy: 0.75 })).toEqual({ sync: 1, harm: 0.12, drive: 0.8, bright: BRIGHTNESS.dorian });
    expect(newPoint({ sync: 0.35, harm: 1, artic: 0.3, energy: 0.6 })).toEqual({ sync: 0.35, harm: 1, drive: 0.45, bright: 0.875 });
    // (where a point makes no claim on the mode, a meter's, no bright)
    expect(newPoint({ sync: 0, harm: 0.1, artic: 1, energy: 0.6 }, false)).toEqual({ sync: 0, harm: 0.1, drive: 0.8 });
  });

  it('BRIGHTNESS: the church modes in order, harmonic minor between aeolian and dorian', () => {
    const order = ['locrian', 'phrygian', 'aeolian', 'harmonic_minor', 'dorian', 'mixolydian', 'ionian', 'lydian'];
    expect(order.map((m) => BRIGHTNESS[m])).toEqual([0, 0.125, 0.25, 0.375, 0.5, 0.75, 0.875, 1]);
  });

  it('restyled: by name, in order (written by name), inline, with a moving axis or a slider, and picks; a style on the new axes is left', () => {
    expect(restyled('&funk map=style label="Funk" step=104bpm sync=1 harm=.12 artic=.85 energy=.75')).toBe(
      '&funk map=style label="Funk" step=104bpm sync=1 harm=.12 drive=.8 bright=.5',
    );
    expect(restyled('&funk map=style .3 .45 .55 .55')).toBe('&funk map=style sync=.3 harm=.45 drive=.55 bright=.25');
    expect(restyled('&style style=&(map=style .5 .75 free(.35, 0..1) .5)')).toBe('&style style=&(map=style sync=.5 harm=.75 drive=free(.35, 0..1) bright=.25)');
    // (a moving axis keeps articulation's expression as drive's)
    expect(restyled('&mine map=style sync=.3 harm=.45 artic=.2..0.9 * &drift energy=.55')).toBe('&mine map=style sync=.3 harm=.45 drive=.2..0.9 * &drift bright=.875');
    expect(restyled('&v s=tri..square * &style[artic] lpf=1400..3600 * &style[energy]')).toBe('&v s=tri..square * &style[drive] lpf=1400..3600 * &style[drive]');
    expect(restyled('&x map=style sync=.3 harm=.45 drive=.5 bright=.5')).toBeNull();
    expect(restyled('&tape step=&reel write=&dry drive=.35')).toBeNull();
  });

  it('a rewrite per line, exact against the old meaning, so never Normalise’s; a comment is kept as written', () => {
    const found = axes('&funk map=style .3 .45 .55 .55 # artic energy\n&x 0');
    expect(found.map((r) => [r.rule, r.exact])).toEqual([['axes', true]]);
    expect(found[0]!.apply('&funk map=style .3 .45 .55 .55 # artic energy\n&x 0')).toBe('&funk map=style sync=.3 harm=.45 drive=.55 bright=.25 # artic energy\n&x 0');
  });

  it('now: artic= on a style and a pick of [artic] or [energy] are errors that name Migrate; read the old way, a warning', () => {
    const named = '&funk map=style sync=.3 harm=.45 artic=.55 energy=.55';
    expect(errors(named)).toEqual([expect.stringMatching(/^error: artic= is retired: a style's axes are sync harm drive bright.*Migrate rewrites it$/)]);
    expect(errors(named, true)).toEqual([expect.stringMatching(/^warning: a style on the axes before v0\.22\.0.*Migrate rewrites it$/)]);
    const picked = [
      '&bar meter("4/4") step=120bpm',
      '&funk map=style .3 .45 .55 .5',
      '&style style=&funk',
      '&line step=1m 0',
      '&v s=saw loop=C2 lpf=0..1000 * &style[energy]',
      '&out map=sample [&line * &v]',
    ].join('\n');
    expect(errors(picked)).toEqual([expect.stringMatching(/^error: &style\[energy\]: energy is retired.*Migrate rewrites it as &style\[drive\]$/)]);
    // (drive= elsewhere is a tape's or a ladder's, as it was)
    expect(errors('&funk map=style sync=.3 harm=.45 drive=.55 bright=.5')).toEqual([]);
  });
});

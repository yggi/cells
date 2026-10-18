/**
 * The rhythms: the repository's second facet (#138, decisions 041 and 043). Each fragment is open on its meter: its lines
 * tap the host's (`step=16n`, `step=1m`) and it holds no `&bar` of its own, so the host's `&bar` line, written first in the
 * same text, is its main meter and sets its tempo (#22's ruling: taps, no new form). Each carries its own MIDI card on
 * channel 10 and the voices it strikes, named so that General MIDI sends each as its drum note (`gmDrumNote`).
 *
 * The drum bars are Jambot's E31 (yggi/jambot#317): one bar the band writes for each preset, its drum part as cells text,
 * every role and every sound the band's drums play between them, 144 hits. Each is E31's text without its `&bar` line,
 * and is associated with its preset's point. Lifted from yggi/jambot packages/score/experiments/drums-in-cells.ts @
 * 327d6a8 (`fixtures/jambot-e31.json` holds E31's texts and hits).
 *
 * The claves are two bars each (`step=16n cycle=2`), five strokes on the eighths, struck as a side stick (`&rs`, General
 * MIDI's 37), as a drummer plays the clave on a kit; their names (`&clave`, `&claves`, `&rs`) are none of the drum bars',
 * so a clave layers on any of them in one text. Their associations are written by hand, near Bossa nova and Funk.
 */
import type { Fragment } from './fragments';
import { AMBIENT, at, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO, weighted } from './presets';

/** A fragment's text, a line each. */
const lines = (...each: string[]) => each.join('\n');

/** A clave's text: its two bars of sixteenths, played by the side stick at half the level (velocity 90). */
const clave = (strokes: string) => lines(`&clave step=16n cycle=2 ${strokes}`, '&claves map=midi(10) [&clave * .5]', '&rs s=white');

/** The rhythms built so far: E31's eight drum bars and four claves, of the facet `rhythm`. */
export const RHYTHM_FRAGMENTS: readonly Fragment[] = [
  {
    id: 'Synth-pop drums',
    text: lines(
      '&kick step=16n &bd:0:.547833 ~ ~ ~ ~ ~ ~ ~ &bd:0:.536239 ~ ~ ~ ~ ~ ~ ~',
      '&backbeat step=16n ~ ~ ~ ~ &sd:0:.458553 ~ ~ ~ ~ ~ ~ ~ &sd:0:.469279 ~ ~ ~',
      '&fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.161262 &sd:0:.303801 &sd:0:.386943',
      '&ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.048608 ~ ~ ~ ~ ~ ~ ~ ~',
      '&hat step=16n ~ ~ ~ ~ &hh:0:.278319 ~ ~ ~ &hh:0:.270073 ~ ~ ~ &hh:0:.253953 ~ &hh:0:.201438 ~',
      '&drums map=midi(10) [&kick, &backbeat, &fill, &ghost, &hat]',
      '&bd s=white',
      '&sd s=white',
      '&hh s=white',
    ),
    association: weighted(SYNTH_POP),
    facet: 'rhythm',
  },
  {
    id: 'Techno drums',
    text: lines(
      '&kick step=16n &bd:0:.763904 ~ ~ ~ &bd:0:.536239 ~ ~ ~ ~ ~ ~ ~ &bd:0:.524769 ~ ~ ~',
      '&backbeat step=16n ~ ~ ~ ~ &sd:0:.607663 ~ ~ ~ ~ ~ ~ ~ &sd:0:.696633 ~ ~ ~',
      '&fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.155 &sd:0:.201438 &sd:0:.261951 &sd:0:.321409 ~ &sd:0:.469279 &sd:0:.571393 &sd:0:.632463',
      '&hat step=16n &hh:0:.367599 &hh:0:.148862 &oh:0:.270073 &hh:0:.148862 &hh:0:.377209 &hh:0:.148862 &oh:0:.278319 &hh:0:.155 &hh:0:.367599 &hh:0:.148862 &oh:0:.278319 &hh:0:.148862 &hh:0:.377209 &hh:0:.148862 &oh:0:.270073 &hh:0:.148862',
      '&drums map=midi(10) [&kick, &backbeat, &fill, &hat]',
      '&bd s=white',
      '&hh s=white',
      '&oh s=white',
      '&sd s=white',
    ),
    association: weighted(TECHNO),
    facet: 'rhythm',
  },
  {
    id: 'Deep house drums',
    text: lines(
      '&kick step=16n &bd:0:.595449 ~ ~ ~ ~ ~ ~ ~ &bd:0:.571393 ~ ~ ~ ~ ~ ~ ~',
      '&backbeat step=16n ~ ~ ~ ~ &sd:0:.502201 ~ ~ ~ ~ ~ ~ ~ &sd:0:.491103 ~ ~ ~',
      '&fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.161262 &sd:0:.339513 &sd:0:.406783',
      '&ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.048608 ~ ~ ~ ~ ~ ~ ~ ~',
      '&hat step=16n &hh:0:.321409 ~ &hh:0:.253953 ~ &hh:0:.303801 ~ ~ ~ &hh:0:.286689 ~ ~ ~ &hh:0:.261951 &hh:0:.094302 &hh:0:.230702 ~',
      '&drums map=midi(10) [&kick, &backbeat, &fill, &ghost, &hat]',
      '&bd s=white',
      '&hh s=white',
      '&sd s=white',
    ),
    association: weighted(DEEP_HOUSE),
    facet: 'rhythm',
  },
  {
    id: 'Ambient drums',
    text: lines(
      '&kick step=16n &bd:0:.513423 ~ ~ ~ ~ ~ ~ ~ &bd:0:.502201 ~ ~ ~ ~ ~ ~ ~',
      '&backbeat step=16n ~ ~ ~ ~ &sd:0:.386943 ~ ~ ~ ~ ~ ~ ~ &sd:0:.458553 ~ ~ ~',
      '&fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.0992 &sd:0:.136958 &sd:0:.167648 &sd:0:.194432 ~ &sd:0:.303801 &sd:0:.416889 &sd:0:.396801',
      '&hat step=16n &hh:0:.238328 ~ &hh:0:.174158 ~ &hh:0:.261951 ~ ~ ~ &hh:0:.230702 ~ &hh:0:.201438 ~ &hh:0:.261951 ~ &hh:0:.2232 ~',
      '&drums map=midi(10) [&kick, &backbeat, &fill, &hat]',
      '&bd s=white',
      '&hh s=white',
      '&sd s=white',
    ),
    association: weighted(AMBIENT),
    facet: 'rhythm',
  },
  {
    id: 'Lo-fi hip hop drums',
    text: lines(
      '&kick step=16n &bd:0:.524769 ~ ~ &bd:0:.286689 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~',
      '&backbeat step=16n ~ ~ ~ ~ &sd:0:.458553 ~ ~ ~ ~ ~ ~ ~ &sd:0:.416889 ~ ~ ~',
      '&fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.12555 &sd:0:.321409 &sd:0:.358113',
      '&ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.041912 ~ ~ ~ ~ ~ ~ ~ ~',
      '&hat step=16n ~ ~ ~ ~ &hh:0:.278319 ~ ~ ~ &hh:0:.253953 ~ ~ ~ &hh:0:.2232 ~ &hh:0:.215822 ~',
      '&euclid step=1m &rim(5,16,4)',
      '&euclidLevel map=amp step=16n .201438 0 0 0 .215822 0 0 .161262 0 0 .230702 0 0 .194432 0 0',
      '&drums map=midi(10) [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]',
      '&bd s=white',
      '&rim s=white',
      '&sd s=white',
      '&hh s=white',
    ),
    association: weighted(LO_FI),
    facet: 'rhythm',
  },
  {
    id: 'Funk drums',
    text: lines(
      '&kick step=16n &bd:0:.645049 ~ ~ &bd:0:.386943 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~',
      '&backbeat step=16n ~ ~ ~ ~ &sd:0:.536239 ~ ~ ~ ~ ~ ~ ~ &sd:0:.536239 ~ ~ ~',
      '&fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.180792 &sd:0:.367599 &sd:0:.447951',
      '&ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.089528 ~ ~ ~ ~ ~ ~ ~ ~',
      '&hat step=16n &hh:0:.348751 ~ &oh:0:.253953 ~ &hh:0:.330399 &hh:0:.114638 &oh:0:.230702 ~ &hh:0:.312543 ~ ~ ~ &hh:0:.286689 &hh:0:.104222 &oh:0:.215822 ~',
      '&euclid step=1m &rim(7,16,0)',
      '&euclidLevel map=amp step=16n .253953 0 0 .270073 0 .270073 0 .230702 0 0 .278319 0 .270073 0 .295183 0',
      '&drums map=midi(10) [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]',
      '&bd s=white',
      '&rim s=white',
      '&hh s=white',
      '&oh s=white',
      '&sd s=white',
    ),
    association: weighted(FUNK),
    facet: 'rhythm',
  },
  {
    id: 'Bossa nova drums',
    text: lines(
      '&kick step=16n &bd:0:.502201 ~ ~ &bd:0:.312543 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~',
      '&backbeat step=16n ~ ~ ~ ~ &sd:0:.416889 ~ ~ ~ ~ ~ ~ ~ &sd:0:.427119 ~ ~ ~',
      '&fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.148862 &sd:0:.278319 &sd:0:.348751',
      '&ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.063488 ~ ~ ~ ~ ~ ~ ~ ~',
      '&hat step=16n ~ ~ ~ ~ ~ ~ ~ ~ &hh:0:.246078 ~ ~ ~ &hh:0:.230702 ~ &hh:0:.18755 ~',
      '&euclid step=1m &rim(5,16,4)',
      '&euclidLevel map=amp step=16n .201438 0 0 0 .208568 0 0 .180792 0 0 .215822 0 0 .201438 0 0',
      '&drums map=midi(10) [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]',
      '&bd s=white',
      '&rim s=white',
      '&sd s=white',
      '&hh s=white',
    ),
    association: weighted(BOSSA_NOVA),
    facet: 'rhythm',
  },
  {
    id: 'Swing jazz drums',
    text: lines(
      '&kick step=16n &bd:0:.559551 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~',
      '&backbeat step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.416889 ~ ~ ~',
      '&fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.109368 &sd:0:.386943 &sd:0:.367599',
      '&ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.030008 &sd:0:.0558 ~ ~ ~ ~ ~ ~ ~',
      '&hat step=16n &rd:0:.295183 ~ ~ ~ &rd:0:.278319 ~ ~ ~ &rd:0:.230702 ~ ~ ~ &rd:0:.253953 ~ &rd:0:.215822 ~',
      '&pedal step=16n ~ ~ ~ ~ &ph:0:.161262 ~ ~ ~ ~ ~ ~ ~ &ph:0:.201438 ~ ~ ~',
      '&drums map=midi(10) [&kick, &backbeat, &fill, &ghost, &hat, &pedal]',
      '&bd s=white',
      '&rd s=white',
      '&ph s=white',
      '&sd s=white',
    ),
    association: weighted(SWING_JAZZ),
    facet: 'rhythm',
  },
  // (the son clave, 3-2: x..x..x. ..x.x... over two bars of eighths. It is where the bossa nova clave and Funk's Bo
  // Diddley beat come from, and sits halfway between Bossa nova and Funk)
  { id: 'son clave 3-2', text: clave('&rs ~!5 &rs ~!5 &rs ~!7 &rs ~!3 &rs ~!7'), association: weighted(at(0.875, 0.485, 0.65, 0.6)), facet: 'rhythm' },
  // (the son clave from its other bar, 2-3: it starts off the downbeat, so it sits a step from 3-2 toward Funk, more off
  // the beat and plainer)
  { id: 'son clave 2-3', text: clave('~!4 &rs ~!3 &rs ~!7 &rs ~!5 &rs ~!5 &rs ~!3'), association: weighted(at(0.95, 0.35, 0.75, 0.65)), facet: 'rhythm' },
  // (the rumba clave, 3-2: the son's third stroke an eighth later, off the beat; drums and voices over a static harmony,
  // short and dense: near Funk)
  { id: 'rumba clave 3-2', text: clave('&rs ~!5 &rs ~!7 &rs ~!5 &rs ~!3 &rs ~!7'), association: weighted(at(1, 0.2, 0.75, 0.8)), facet: 'rhythm' },
  // (the bossa nova clave: the son's last stroke an eighth later. Bossa nova's harmony and articulation, a little more off
  // the beat and sparser than its drum bar: five strokes in two bars)
  { id: 'bossa nova clave', text: clave('&rs ~!5 &rs ~!5 &rs ~!7 &rs ~!5 &rs ~!5'), association: weighted(at(0.8, 0.85, 0.45, 0.35)), facet: 'rhythm' },
];

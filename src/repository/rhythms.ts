/**
 * The rhythms: the repository's second facet (#138, decisions 041 and 043). Each fragment is open on its meter: its lines
 * tap the host's (`step=16n`, `step=1m`) and it holds no `&bar` of its own, so the host's `&bar` line, written first in the
 * same text, is its main meter and sets its tempo (#22's ruling: taps, no new form). Each carries its own MIDI card on
 * channel 10 and the voices it strikes, named so that General MIDI sends each as its drum note (`gmDrumNote`).
 *
 * The drum bars are Jambot's E31 (yggi/jambot#317): one bar the band writes for each preset, its drum part as cells text,
 * every role and every sound the band's drums play between them, 144 hits. Each is E31's text without its `&bar` line,
 * and is associated with its preset's point; each file names where it was lifted from under `lifted:`
 * (`fixtures/jambot-e31.json` holds E31's texts and hits).
 *
 * The claves are five strokes each, struck as a clave (`&claves`, General MIDI's 75: yggi/cells#140), a sound of its own
 * beside a drum bar's rim: four over two bars of eighths (`step=16n cycle=2`), and the bossa nova clave also in one bar of sixteenths
 * (`step=16n`), the form that matches a bossa bar written in sixteenths, as Jambot's is. What a clave fits is the fit's
 * (`fit.ts`), read off its text: under the library's meters both fit each 4/4 and nothing else. Their names (`&clave`, `&percussion`,
 * `&claves`) are none of the drum bars', so a clave layers on any of them in one text. Their associations are written by
 * hand, near Bossa nova and Funk.
 *
 * Every point of a rhythm is associated as the facet `rhythm`: a hint a query names, not what the fragment can fill.
 * Each is a file of the seed library, `fragments/rhythms/*.md` (`seed.ts`), whose prose says what it is and where it sits.
 */
import type { Fragment } from './fragments';
import { seedFragments } from './seed';

/** The rhythms built so far: E31's eight drum bars and five claves, associated as the facet `rhythm`. */
export const RHYTHM_FRAGMENTS: readonly Fragment[] = seedFragments('rhythms');

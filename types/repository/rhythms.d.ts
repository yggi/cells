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
/** The rhythms built so far: E31's eight drum bars and four claves, of the facet `rhythm`. */
export declare const RHYTHM_FRAGMENTS: readonly Fragment[];

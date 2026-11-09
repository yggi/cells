/**
 * The tests' cards for a pattern fragment (#291, #640): a fragment carries no card, since where its notes go is the
 * workbench's and the performer's, so a test that hears one by itself writes one, here. It puts the fragment's heads
 * (`headsOf`: what it gives, read off its structure, never off a name it is expected to have, decision 075) on the
 * channel Jambot's band sends that part on, which the test names by choosing the card: a drum part on General MIDI's
 * drums, 10; a bass line on 2, through the bass instrument's voice (`&bassV`, the bass fragment's head), and on a sound
 * card beside it, since the bass has a sound of its own (#391), which MIDI doesn't send. A frontend hears a fragment
 * alone through `audition` instead. Pure.
 */
import { headsOf } from './audition';

/** The card that sends drum parts on General MIDI's drum channel: the heads of each text given, or of the names given. */
export const drumCard = (...parts: readonly (string | readonly string[])[]): string => {
  const heads = parts.flatMap((p) => (typeof p === 'string' ? headsOf(p) : p));
  return heads.length ? `&drumCard map=midi(10) [${heads.map((h) => `&${h}`).join(', ')}]` : '';
};

/** The cards that send a bass line on channel 2 through the bass instrument's voice, and sound it beside: its head, or the name given. */
export const bassCards = (part: string, head: string = headsOf(part)[0]!): string => `&bassCard map=midi(2) [&${head} * &bassV]\n&bassSound map=sample [&${head} * &bassV]`;

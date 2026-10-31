/**
 * The default performer's feel (decision 063 §2, #392; yggi/music-commons `contracts/feel`, version 1, minor 1): how a
 * performer plays the events cells plays for a bar, its velocity loosened and accented and its length gated, so every
 * frontend plays a session as its host does; and which part and drum role each event is (`readerOf`: its performer's
 * role, or its output's id, `readingOf`). The text says what is composed, and the playing is the player's (decision 037).
 * The hub's README is the rule; `feel.test.ts` meets its vectors. Lifted from yggi/cell-studio src/session/feel.ts @
 * d5e7634 (written there from the hub's page, with no import from Jambot), but its reading of a host's `bar` message, which
 * is the session's: a frontend makes the frame.
 *
 * A performer's widths (`Widths`, its gate's `licence=` and `accents=`) scale how far it plays from what is written: 1, as
 * the contract plays, by default; 0, exactly as written.
 *
 * The feel moves an event's velocity and length, never its onset. Every number is a double and every operation is in the
 * contract's order, so the same bits come out as the host's.
 */

/** A section's type, as a host's plan names it. */
export type SectionType = 'intro' | 'groove' | 'bridge' | 'build' | 'drop' | 'breakdown';

/** What the performer reads of a bar: the fields of a host's `bar` message the feel needs. */
export interface FeelFrame {
  readonly seed: number;
  readonly bar: number;
  /** The bar's meter in eighths, each group a pulse. */
  readonly groups: readonly number[];
  readonly section: SectionType;
  readonly style: { readonly entropy: number; readonly artic: number; readonly sync: number };
  readonly swing: { readonly level: '8n' | '16n'; readonly share: number };
  readonly energy: number;
}

/** A part as the feel keys it, in the order its draws number them. */
export type FeelPart = 'drums' | 'bass' | 'pad' | 'stab' | 'lead';
const PARTS: readonly FeelPart[] = ['drums', 'bass', 'pad', 'stab', 'lead'];

/** A drum hit's role in the groove. */
export type DrumRole = 'kick' | 'backbeat' | 'ghost' | 'hat' | 'pedal' | 'euclid' | 'clave' | 'fill';
const ROLES: ReadonlySet<string> = new Set<DrumRole>(['kick', 'backbeat', 'ghost', 'hat', 'pedal', 'euclid', 'clave', 'fill']);

/**
 * The part and drum role an event of a host's section text is, read off the output cells names it by
 * (`voice:cell:line:col`, split on `:`): a groove's member of the kit cells makes, `kit:voices:<role>:…`, is the drums,
 * its role the third field; any other output's part is its second field, the line its voice plays. Null for one that
 * names none of the feel's parts or roles: it plays as cells gives it. The fallback of a text's own reading (`readerOf`).
 */
export function readingOf(output: string | undefined): Reading | null {
  const [first, second, third] = (output ?? '').split(':');
  if (first === 'kit' && second === 'voices') return third !== undefined && ROLES.has(third) ? { part: 'drums', role: third as DrumRole } : null;
  return isPitched(second) ? { part: second } : null;
}

/** An event's part and drum role, as the feel reads them. */
export type Reading = { readonly part: FeelPart; readonly role?: DrumRole };
const isPitched = (name: string | undefined): name is Exclude<FeelPart, 'drums'> => name !== 'drums' && (PARTS as readonly string[]).includes(name!);

/**
 * How a compiled text's events read (feel v1.2, yggi/music-commons#35; #511): a pitched event's part is the role of the
 * performer whose gate plays it (cells' `performers`: the gate its output goes through, alone, `via`, or in a stack,
 * `through`), as Jambot's `lineOf` reads it, so `&bassOut play=&bassline^$-12 &bassV`, role `bass`, plays the bass.
 * A drum hit keeps its line's role, and an output no performer's role names reads by its id (`readingOf`).
 */
export function readerOf(result: {
  readonly outputs: readonly { readonly id: string; readonly via: readonly string[]; readonly through: readonly string[] }[];
  readonly performers: readonly { readonly name: string; readonly role?: string }[];
}): (output: string | undefined) => Reading | null {
  const roles = new Map(result.performers.flatMap((p) => (isPitched(p.role) ? [[p.name, p.role] as const] : [])));
  const parts = new Map<string, Reading>();
  for (const o of result.outputs) {
    const gate = [...o.via, ...o.through].find((name) => roles.has(name));
    if (gate !== undefined && readingOf(o.id)?.part !== 'drums') parts.set(o.id, { part: roles.get(gate)! });
  }
  return (output) => (output !== undefined && parts.get(output)) || readingOf(output);
}

/** One of cells' events in a bar: its line, a drum's role, the step it is written on (whole), its note, velocity and sounding length in steps. */
export interface FeelEvent {
  readonly part: FeelPart;
  readonly role?: DrumRole;
  readonly step: number;
  readonly note: number;
  readonly velocity: number;
  readonly length: number;
}

/** The streams the feel draws from (the contract's numbers). */
const VELOCITY: Record<FeelPart, number> = { drums: 4, bass: 17, pad: 18, stab: 19, lead: 20 };
const LENGTH: Record<FeelPart, number> = { drums: 21, bass: 22, pad: 23, stab: 24, lead: 25 };
const OWN_ACCENT = 27;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

/** A draw in [0, 1): the seed, then 0, the stream and the keys, each mixed in, then mulberry32's first number. */
function draw(seed: number, stream: number, ...keys: readonly number[]): number {
  let h = seed >>> 0;
  for (const k of [0, stream, ...keys]) h = Math.imul(h ^ (k | 0), 2654435761) >>> 0;
  const a = (h + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** How far the feel loosens a bar, 0 to 1: half its swing's weight, three tenths its entropy, a fifth its legato. */
export function feelOf({ style, swing }: FeelFrame): number {
  const weight = clamp01((swing.share - 0.5) * 6 * (swing.level === '8n' ? 1 : 0.5));
  return 0.5 * weight + 0.3 * style.entropy + 0.2 * (1 - style.artic);
}

/** The base an event's bar gives it, unrounded: only its fraction is read, the part MIDI's rounding took from the level cells states. */
function baseOf({ groups, section, style, energy }: FeelFrame, { part, role, step }: FeelEvent): number {
  const steps = 2 * sum(groups);
  const starts = groups.map((_, g) => 2 * sum(groups.slice(0, g)));
  const onBeat = starts.includes(step);
  const half = 2 * Math.floor(steps / 4);
  const backbeat = starts.filter((_, p) => (starts.length <= 3 ? p > 0 : p % 2 === 1)).at(-1);
  const accent = (): number => {
    if (section === 'breakdown') return role === 'fill' ? 45 + (step - half) * 9 : 55;
    switch (role) {
      case 'kick':
        return step === 0 || step === half ? 112 : 92;
      case 'backbeat':
        return step === backbeat ? 106 : 100;
      case 'ghost':
        return 32 + 14 * style.sync;
      case 'hat':
        return onBeat ? 78 : step % 2 === 0 ? 66 : 50;
      case 'pedal':
        return 58;
      case 'euclid':
      case 'clave':
        return 72;
      case 'fill': {
        const from = section === 'build' ? half : 2 * Math.floor((steps * 3) / 8);
        return 50 + (step - from) * (60 / (steps - from));
      }
      default:
        return NaN;
    }
  };
  switch (part) {
    case 'drums':
      return accent() * (0.65 + 0.35 * energy);
    case 'bass':
      return section === 'breakdown' ? 70 : (onBeat ? 100 : 84) * (0.75 + 0.25 * energy);
    case 'stab':
      return 70 + 20 * energy;
    case 'pad': {
      const quiet = section === 'breakdown' || energy < 0.3;
      const w = quiet ? Math.max(0.85, 1 - style.artic) : 1 - style.artic;
      return 48 + 30 * energy * (0.5 + w / 2);
    }
    case 'lead':
      return onBeat ? 100 : 82;
  }
}

/** How far a performer plays from what is written, each a share of the feel's: its licence (velocity and length) and its own accents. 1, as the contract; 0, as written. */
export interface Widths {
  readonly licence: number;
  readonly accents: number;
}

/** The contract's widths: a performer that plays as Jambot's does. */
export const CONTRACT_WIDTHS: Widths = { licence: 1, accents: 1 };

/** An event as the performers play it: its velocity loosened and accented, its length gated, by draws keyed by the bar and step (a drum's by its note too). */
export function played(frame: FeelFrame, event: FeelEvent, feel = feelOf(frame), widths: Widths = CONTRACT_WIDTHS): { velocity: number; length: number } {
  const { seed, bar } = frame;
  const { part, step, note } = event;
  const base = baseOf(frame, event);
  const level = event.velocity + (base - Math.round(base));
  const keys = part === 'drums' ? [bar, step, note] : [bar, step];
  // (a performer's widths scale the contract's numbers last: × 1 is the same double, so the contract's bits come out)
  const loose = (draw(seed, VELOCITY[part], ...keys) - 0.5) * feel * 24 * widths.licence;
  const d = draw(seed, OWN_ACCENT, PARTS.indexOf(part), ...keys);
  const own = (step % 2 === 1 ? -d * 14 * feel : step % 4 === 2 ? d * 10 * feel : (d - 0.5) * 2 * 4 * feel) * widths.accents;
  const total = part === 'drums' ? level + loose + own : level + (loose + own);
  return { velocity: Math.max(1, Math.min(127, Math.round(total))), length: event.length * (1 - draw(seed, LENGTH[part], ...keys) * feel * 0.15 * widths.licence) };
}

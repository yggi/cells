const core = (help, doc, on) => ({ help, doc, value: 'syntax', ...(on ? { on } : {}) });
const sound = (help, extra = {}) => ({ help, doc: 'sound.md', value: 'number', on: ['voice'], voice: true, ...extra });
const physics = (help, on, extra = {}) => ({ help, doc: 'physics.md', value: 'number', on, ...extra });
export const CORE = {
    over: core('the table its numbers read', 'tables.md'),
    base: core('the cell it is a copy of, changed where it says: its braid step by step over the base’s (= keeps a step), its attributes where it sets none', 'braid.md'),
    step: core('what moves it, step by step', 'time.md'),
    loop: core('what moves it, the whole braid at a time', 'time.md'),
    shift: core('how far it is turned', 'tables.md'),
    stride: core('how far each step turns it', 'time.md'),
    map: core('how its values sound', 'sound.md'),
    show: core('how it’s shown: notes, do, scale, pattern … (and everything below it)', 'display.md'),
    label: core('a name to show, in quotes — alone on a cell, a note in the graph', 'display.md'),
    env: core('a voice’s own volume on every note: an envelope', 'sound.md', ['voice']),
    pitch: { ...core('a voice’s own pitch on every note: a vibrato, or a shape in semitones (pitch=0..30 * &(map=adsr 0 .04 0 0): a drop)', 'sound.md', ['voice']), moves: true },
    cycle: core('where it wraps: turning past this many steps starts again (a grid’s size is map=edo)', 'tables.md'),
    size: core('how large it’s drawn, against the others: 2 twice, .5 half', 'display.md'),
    laps: core('how many laps it plays, then it ends', 'time.md'),
    chance: core('what a bare x? means here: the probability it is dropped, or free() for a slider', 'cell.md'),
    seed: core('a different sequence of chance', 'cell.md'),
    title: { ...core('on a note: the piece’s title (its card), the old spelling: its file’s frontmatter holds it', 'display.md', ['note']), old: 'title: in the frontmatter' },
    tags: core('on a cell: its clusters in the graph, comma-separated (on the piece’s card, the old spelling of its tags: its file’s frontmatter holds them)', 'display.md'),
    about: core('on a note: the cells it explains', 'display.md', ['note']),
    style: core('its style: a map=style cell, &(map=style …), or a mix of them by weight; or a range from one to another over its scope (style=&funk..&bossa). On the note &style, the section’s, read by axis (&style[artic])', 'style.md'),
    tier: {
        ...core('on a piece’s card: its tier of the tutorial (1 the first), the old spelling: its file’s frontmatter holds it', 'display.md', ['note']),
        old: 'tier: in the frontmatter',
    },
};
export const PARAMS = {
    s: sound('sound source: sine tri saw square pulse white pink brown', { value: 'word' }),
    lpf: sound('low-pass cutoff, Hz', { moves: true, hz: true }),
    lpq: sound('low-pass resonance', { moves: true }),
    hpf: sound('high-pass cutoff, Hz', { moves: true, hz: true }),
    hpq: sound('high-pass resonance', { moves: true }),
    room: sound('reverb send 0–1', { moves: true }),
    delay: sound('delay send 0–1', { moves: true }),
    delaytime: sound('echo time, seconds — or a clock: &bar*2 (an eighth at the tempo) — or a tap: 8n, 4n.', { clock: true }),
    delayfeedback: sound('echo feedback 0–1'),
    glide: {
        help: 'tied notes (each starting as the one before ends) play as one: its envelope once, each next a slide there over this many seconds (dough’s glide; 0 or none: each note its own)',
        doc: 'sound.md',
        value: 'number',
        on: ['voice'],
    },
    legato: {
        help: 'on a line: each note sounds its written length (@n, _) times this share, its end swung as its onset is, Strudel’s legato (.5 staccato, 1 as written, 1.5 into the next): a number, free(), or a cell of shares read at each onset (legato=&artic); nothing cuts a note at the bar line',
        doc: 'sound.md',
        value: 'number',
        on: ['clock', 'driven'],
        moves: true,
        form: 'legato=n · legato=free(n, lo..hi) · legato=&x · legato=lo..hi * &a * &b · on a meter, its lines’ default by level: legato=16n:r,4n:r',
    },
    pan: sound('where it sits in stereo: 0 left, .5 centre (as without it), 1 right — the far side fades'),
    distort: sound('distortion: 0 clean, .3 gritty, 1 and more harsh'),
    crush: sound('bit depth: 16 clean, 8 grainy, 3 and fewer: rubble'),
    fm: sound('frequency modulation: the voice that modulates this one (fm=&op); it may have its own fm=', { doc: 'physics.md', value: 'cell' }),
    ratio: sound('as a modulator: its frequency against its carrier’s (1 the same, 3.5 a bell)', { doc: 'physics.md', on: ['modulator'] }),
    index: sound('FM depth: how far the modulator swings the frequency (0 none … 10 bright); it can move', { doc: 'physics.md', on: ['carrier'], moves: true }),
    body: sound('a resonator: what its exciters are — fork, bell, bar, plate, box, tine, pipe, wire, spring; its braid lists them (semitones; the twelve by default), a note plucks the nearest', { doc: 'physics.md', value: 'word' }),
    ring: sound('a resonator: how long it rings, in seconds', { doc: 'physics.md' }),
    hard: sound('a resonator: the mallet — 0 felt (dark), 1 steel (bright)', { doc: 'physics.md' }),
    board: physics('a resonator: the body its exciters share (box by default, an octave below; none: no board)', ['resonator'], { value: 'word' }),
    couple: physics('a resonator: another it shares a table with (couple=&other) — each sets the other ringing', ['resonator'], { value: 'cell' }),
    coupling: physics('a resonator: how strongly it is coupled (.01 faint, .05 strong)', ['resonator']),
    excite: physics('a resonator: sound that drives it (excite=&mix) — it answers where the sound meets its modes', ['resonator'], { value: 'cell' }),
    postgain: {
        help: 'on the sound card: its master, a linear gain after everything (Strudel’s postgain: 1 as it is, .5 half, a negative one inverts the phase; free(.8, 0..1) a slider)',
        doc: 'mix.md',
        value: 'number',
        on: ['card'],
    },
    beat: { help: 'on a meter: how many beats it counts, equal (meter("4/4") beat=2: alla breve) — its bpm counts beats', doc: 'time.md', value: 'number', on: ['clock'] },
    pulse: {
        help: 'on a scan: the note value of its entries (pulse=16n: sixteenths) — its beats then count quarters, and its taps read note values by it',
        doc: 'time.md',
        value: 'word',
        on: ['clock', 'driven'],
    },
    swing: {
        help: 'on a meter: a level of its bar leans, named by note value — of each pair of its eighths (swing=8n:.67), the second comes this far through their beat (.5 straight, .67 triplet swing), a group of three leaning, or straight with :pairs (swing=8n:.67:pairs); every beat and bar line stays. Bare (swing=.6), on a list: pairs of its steps',
        doc: 'time.md',
        value: 'number',
        on: ['clock'],
        form: 'swing=8n:r · swing=8n:r:pairs · swing=8n:r,16n:r · swing=8n:free(r, lo..hi) · swing=r',
    },
    motor: physics('on a meter: it turns physically — a motor this strong pulls it to its tempo (from rest)', ['clock']),
    mass: physics('physics: how heavy it turns (inertia); on a cell a meter drives, load', ['clock', 'driven']),
    friction: physics('physics: drag — the meter sags below its tempo, more with more load', ['clock', 'driven']),
    wind: physics('on a meter with a motor: its spring runs down over this many seconds, and it coasts to a stop', ['motor']),
    wow: physics('on a meter with a motor: its speed swings slowly by this fraction (.01: a tape machine’s wow)', ['motor']),
    varispeed: physics('on a clock: its notes’ pitch follows its speed, as tape does (1 fully, 0 not)', ['clock', 'driven']),
    belt: physics('on a driven cell (step=&x): it follows through a belt this stiff (200 taut, 20 slack) — it lags, swings, catches up', ['driven']),
    damping: physics('a belt’s damping: how soon its swinging dies (0 rings on, high creeps)', ['driven']),
    slip: physics('a belt’s grip: past this pull it slips, and the cell falls behind for good', ['driven']),
    write: physics('a tape: what its write head records (write=&melody); it moves with its step=', ['tape'], { value: 'cell' }),
    length: physics('a tape: how long its loop is, in seconds of tape (or a clock: length=&bar/4, or a tap: length=1m); none, an open reel', ['tape'], { clock: true }),
    erase: physics('a tape: how much of what was there each pass under the write head wipes (1 all, .3 leaves ghosts)', ['tape']),
    tone: physics('a sound tape: its loss — each pass through the loop darker (Hz: 7000 bright, 1500 worn)', ['tape'], { hz: true }),
    drive: physics('a sound tape: how hard it saturates each pass (0 clean, .5 warm, 1 crushed)', ['tape']),
    hiss: physics('a sound tape: its noise floor (0 none, .02 a cassette)', ['tape']),
    print: physics('a sound tape: print-through — a faint pre-echo before each head (.03 a whisper)', ['tape']),
    printgap: physics('a sound tape: how far before each head the print-through sits (tape-seconds, .6)', ['tape']),
    dropout: physics('a sound tape: brief gaps in the playback, about this many a second', ['tape'], { hz: true }),
    play: physics('a read head: the tape it reads (play=&tape), at= tape-seconds after the write head; a gate: the notes it plays on the voices in its braid (play=&tune)', ['head', 'gate'], { value: 'cell' }),
    at: physics('a read head: how far after the write head it sits, in seconds of tape (or a clock: at=&bar, or a tap: at=4n)', ['head'], { clock: true }),
    wander: physics('a read head: how far it wanders either way (tape-seconds) — a flying head', ['head']),
    wanderhz: physics('a read head: how fast it wanders (times a second)', ['head'], { hz: true }),
    level: {
        help: 'on a gate: how loud, a product of level cells and a gain (level=&accent*&duck*.4)',
        doc: 'mix.md',
        value: 'number',
        on: ['gate'],
    },
    trigger: { help: 'a gate, the old spelling of play=: the notes it plays (trigger=&tune)', doc: 'mix.md', value: 'cell', on: ['gate'], old: 'play=' },
    gate: { help: 'a gate, the old spelling: a level over time, one factor of level= (gate=&duck)', doc: 'mix.md', value: 'cell', on: ['gate'], old: 'level=' },
    velocity: { help: 'a gate, the old spelling: a level, one factor of level= (velocity=&accent)', doc: 'mix.md', value: 'cell', on: ['gate'], old: 'level=' },
    gain: {
        help: 'on a voice: its own gain, dough’s, times every gain it is played at (1 by default, a negative one inverts the phase; a kit member’s balance); on a gate written the old way (trigger=): the number in level=',
        doc: 'sound.md',
        value: 'number',
        on: ['voice', 'gate'],
    },
    scope: {
        help: 'a scope: stack, split, xy (in time) — spectrum, waterfall (in frequency, or value); its braid lists its channels',
        doc: 'display.md',
        value: 'word',
        on: ['scope'],
    },
    fold: { help: 'a spectrum or waterfall: pitches folded by this stride into as many bins (12: by pitch class, the default)', doc: 'display.md', value: 'number', on: ['scope'] },
    bins: {
        help: 'a spectrum or waterfall without a fold: this many bands, low to high (1 a meter, 3 low-mid-high, 20 an equaliser)',
        doc: 'display.md',
        value: 'number',
        on: ['scope'],
    },
    channels: { help: 'a spectrum or waterfall: sum (one, the default) or split (each channel its own)', doc: 'display.md', value: 'word', on: ['scope'] },
    restart: {
        help: 'what switching a part on does to its time (on a selector: for all its sections) — restart (from its top, the default), resume (where it stopped), free (its time runs on, only its sound is switched; a performer’s default)',
        doc: 'time.md',
        value: 'word',
        on: ['section', 'performer', 'selector'],
        stub: true,
    },
    law: { help: 'a law that computes the notes (law=fiveto12: the 5 to 12 cycle, a day of music)', doc: 'time.md', value: 'word', on: ['law'] },
    anchor: {
        help: 'a clock (a day meter, loop=1d): the time of day it stands at when play starts (hours.minutes — 11.55); play begins where the clock stands',
        doc: 'time.md',
        value: 'number',
        on: ['clock'],
    },
};
export const PARAM_ALIASES = {
    sound: 's',
    cutoff: 'lpf',
    ctf: 'lpf',
    lp: 'lpf',
    resonance: 'lpq',
    hcutoff: 'hpf',
    hp: 'hpf',
    hresonance: 'hpq',
    verb: 'room',
    reverb: 'room',
    delayt: 'delaytime',
    dt: 'delaytime',
    delayfb: 'delayfeedback',
    dfb: 'delayfeedback',
    clip: 'legato',
};
export const canonicalParam = (key) => PARAM_ALIASES[key] ?? key;
export const ATTRIBUTES = { ...CORE, ...PARAMS };
export const CELL_PARAMS = new Set(Object.keys(PARAMS).filter((k) => PARAMS[k].value === 'cell'));
export const TIME_PARAMS = new Set(Object.keys(PARAMS).filter((k) => PARAMS[k].clock));
export const MOVING_PARAMS = new Set(Object.keys(ATTRIBUTES).filter((k) => ATTRIBUTES[k].moves));
export const VOICE_PARAMS = new Set(Object.keys(PARAMS).filter((k) => PARAMS[k].voice));
export const LINE_PARAMS = new Set(Object.keys(PARAMS).filter((k) => PARAMS[k].doc !== 'physics.md' && PARAMS[k].on?.every((r) => r === 'clock' || r === 'driven')));
export const memberParams = (params) => Object.keys(params).some((k) => !LINE_PARAMS.has(k));
export function rolesText(on) {
    const NAMES = {
        voice: 'a voice',
        clock: 'a meter (step= a rate)',
        driven: 'a driven cell (step=&x)',
        motor: 'a meter with a motor=',
        tape: 'a tape (write=)',
        head: 'a read head (play=)',
        resonator: 'a resonator (body=)',
        scope: 'a scope (scope=)',
        law: 'a law (law=)',
        card: 'the sound card (map=sample)',
        note: 'a note (a label= and nothing else)',
        carrier: 'a voice with fm=',
        modulator: 'a voice another’s fm= names',
        gate: 'a gate (play= with a braid)',
        section: 'a section (a name a stepped table of names declares)',
        performer: 'a performer (a gate or a role a band names)',
        selector: 'a selector (over= a table of sections, or a band)',
    };
    const ws = on.map((r) => NAMES[r]);
    return ws.length < 2 ? (ws[0] ?? '') : `${ws.slice(0, -1).join(', ')} or ${ws[ws.length - 1]}`;
}
export function nearestAttribute(word) {
    let best = null;
    let bestD = word.length < 5 ? 2 : 3;
    for (const k of Object.keys(ATTRIBUTES)) {
        const d = distance(word, k);
        if (d < bestD)
            [best, bestD] = [k, d];
    }
    return best;
}
function distance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++)
        d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++) {
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
    return d[a.length][b.length];
}

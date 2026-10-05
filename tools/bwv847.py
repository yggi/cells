"""
Write the BWV 847 example from the encoding, with its structure: the prelude's
figuration as one figure read through two turning tables of four notes a bar;
its later sections as cells; the fugue as its subject and countersubject,
entered in each voice at their transpositions, with the free counterpoint
between them as cells of their own. Writes the example's source and the
reference the tests check it against.
"""
import json, sys
from collections import Counter
sys.path.insert(0, 'tools')
from kern2cells import lines_of
from music21 import converter
from fractions import Fraction

PRE, BREATH, FUG = 609, 15, 496          # sixteenths; together 1120 = 70 bars, so turning tables realign each pass
F0 = PRE + BREATH

def notes(path):
    s = converter.parse(path).stripTies()
    parts = list(s.parts) if len(s.parts) > 1 else list(s.parts[0].voicesToParts().parts)
    out = []
    for p in parts:
        ev = []
        for n in p.recurse().notes:
            on = int(Fraction(n.getOffsetInHierarchy(p)).limit_denominator(64) * 4)
            d = int(Fraction(n.duration.quarterLength).limit_denominator(64) * 4)
            ps = sorted(x.midi - 60 for x in (n.pitches if n.isChord else [n.pitch]))
            ev.append((on, d, ps))
        out.append((sum(sum(x[2]) / len(x[2]) for x in ev) / len(ev), sorted(ev)))
    return [e for _, e in sorted(out, key=lambda x: -x[0])]

def tokens(ev, start, end):
    """Notes (onset, dur, pitches) in [start, end) as braid tokens, rests filled."""
    out, t = [], start
    for on, d, ps in ev:
        if on < start or on >= end: continue
        if on > t: out.append('~' if on - t == 1 else f'~@{on - t}')
        v = str(ps[0]) if len(ps) == 1 else '[' + ','.join(map(str, ps)) + ']'
        out.append(v if d == 1 else f'{v}@{d}')
        t = on + d
    if end > t: out.append('~' if end - t == 1 else f'~@{end - t}')
    return ' '.join(out)

rh, lh = notes('/tmp/bach-wtc/kern/wtc1p02.krn')
sop, alt, bas = notes('/tmp/bach-wtc/kern/wtc1f02.krn')

# ---- the prelude: bars 1–24 are one figure, twice a bar, in both hands
FIG = [0, 1, 2, 1, 3, 1, 2, 1]
def shapes(ev):
    g = {on: ps[0] for on, d, ps in ev}
    out = []
    for b in range(24):
        half = [g[b * 16 + k] for k in range(8)]
        assert [g[b * 16 + 8 + k] for k in range(8)] == half
        shape = [half[0], half[1], half[2], half[4]]
        assert [shape[i] for i in FIG] == half
        out += shape
    return out
rhS, lhS = shapes(rh), shapes(lh)
SECTIONS = [('Bars', 384, 432, 'bars 25–27'), ('Presto', 432, 528, '*Presto*'), ('Adagio', 528, 545, '*Adagio*'), ('Allegro', 545, 609, '*Allegro*, to the end')]

# ---- the fugue: subject and countersubject, found in every voice
V = {'soprano': sop, 'alto': alt, 'bass': bas}
mono = {v: [(on, d, ps[0]) for on, d, ps in ev] for v, ev in V.items()}
def occurrences(model, L, tol):
    rel = [(o - model[0][0], d) for o, d, _ in model]
    found = []
    for v, ns in mono.items():
        for i in range(len(ns) - L + 1):
            w = ns[i:i + L]
            if [(o - w[0][0], d) for o, d, _ in w[:-1]] != rel[:-1]: continue
            sh, n = Counter(a[2] - b[2] for a, b in zip(w, model)).most_common(1)[0]
            if L - n <= tol: found.append((v, w[0][0], w[-1][0] + w[-1][1], sh, L - n, i))
    return found
subject = mono['alto'][:20]
s0 = next(i for i, n in enumerate(mono['alto']) if n[0] >= 34)
counter = mono['alto'][s0:s0 + 16]
subs = occurrences(subject, 20, 3)
cnts = [c for c in occurrences(counter, 16, 2) if not any(c[0] == s[0] and c[1] < s[2] and s[1] < c[2] for s in subs)]

WHERE = {0: 'as first heard', 7: 'a fifth up', -5: 'a fourth down', 5: 'a fourth up', -7: 'a fifth down', 3: 'in E♭ major', -12: 'an octave down', -24: 'two octaves down', 12: 'an octave up'}
def shift_ref(sh):
    return '&tones' if sh == 0 else f'&tones[>>{sh}]' if sh > 0 else f'&tones[<<{-sh}]'

cells, lines = [], {}
for v in ['soprano', 'alto', 'bass']:
    segs = sorted([(s[1], s[2], 'subject', s) for s in subs if s[0] == v] + [(c[1], c[2], 'counter', c) for c in cnts if c[0] == v])
    parts, t, k = [], 0, 0
    def free(a, b):
        # free counterpoint, divided where the fugue divides: at every entry of the subject, in any voice
        global k
        # (a cut moves to this voice's next note boundary: never through a note it holds)
        def boundary(c):
            for on, d, _ in mono[v]:
                if on < c < on + d: return on + d
            return c
        cuts = sorted({a, b} | {boundary(s[1]) for s in subs if a < s[1] < b and a < boundary(s[1]) < b})
        for x, y in zip(cuts, cuts[1:]):
            if y <= x: continue
            body = tokens(V[v], x, y)
            if body.startswith('~') and ' ' not in body:   # only a rest: written in the line, not a cell
                parts.append(body)
                continue
            k += 1
            name = f'{v}{k}'
            bars = f'bar {x // 16 + 1}' if x // 16 == (y - 1) // 16 else f'bars {x // 16 + 1}–{(y - 1) // 16 + 1}'
            cells.append(f'&{name} tags="{v}" label="{v} · free, {bars}" {body}')
            parts.append(f'&{name}')
    for a, b, kind, occ in segs:
        free(t, a)
        bar = a // 16 + 1
        sh, bent = occ[3], occ[4]
        what = 'the subject' if kind == 'subject' else 'the countersubject'
        if v == 'soprano' and kind == 'subject' and bar == 3: what = 'the answer'
        name = f'{"s" if kind == "subject" else "c"}{bar}{v[0]}'
        model = subject if kind == 'subject' else counter
        exact = bent == 0 and mono[v][occ[5] + len(model) - 1][1] == model[-1][1]   # the last note as long, too
        if exact:
            # an exact entry: written where it enters, transposed in place (&subject^-12)
            parts.append(f'&{kind}' + (f'^{sh}' if sh else ''))
            t = b
            continue
        else:
            last = mono[v][occ[5] + len(model) - 1][1]
            why = 'bent' if bent else ('held longer' if last > model[-1][1] else 'cut short')
            cells.append(f'&{name} tags="{v}" label="bar {bar} · **{what[4:]}**\\n{v}, {WHERE.get(sh, f"{sh:+d}")} ({why})" {tokens(V[v], a, b)}')
        parts.append(f'&{name}')
        t = b
    free(t, FUG)
    lines[v] = parts

# the reference: every note, voice by voice, as played (fugue after the prelude and the breath)
ref = {
    'rh': [[on, d, p] for on, d, ps in rh for p in ps], 'lh': [[on, d, p] for on, d, ps in lh for p in ps],
    **{v: [[on + F0, d, p] for on, d, ps in V[v] for p in ps] for v in V},
}
json.dump(ref, open('src/engine/bwv847.reference.json', 'w'))

src = f"""# J. S. Bach, Prelude and Fugue in C minor, BWV 847 (The Well-Tempered Clavier I),
# in full — on an old-school synthesizer, after Wendy Carlos' Switched-On Bach.
# The notes: the CCARH Humdrum encoding (Bach-Gesellschaft edition, vol. xiv),
# as semitones from C4, a sixteenth a step; tools/bwv847.py writes this from it.
&about title="Bach, Prelude and Fugue in C minor: for Wendy" tags="classical, electronic, Bach, Wendy Carlos, tonal, counterpoint" label="**Prelude and Fugue in C minor**, BWV 847 — in full. The prelude: one figure, twice a bar in both hands, through 24 bars of changing chords; then it breaks free — *Presto*, *Adagio*, *Allegro*. The fugue, in three voices: the subject enters in the alto, is answered by the soprano, then the bass — and returns, in every voice, through the keys."

# one tempo map for both: a sixteenth a step, each section at its pace; laps=1 — the piece ends with the fugue
&tempo scan(1!432 .72!96 2!17 .86!64 1.6!15 1.5!496) step=free(89bpm, 60..120) beat=4 laps=1 label="tempo map: ♩=108 · *Presto* · *Adagio* · *Allegro* · fugue ♩=72"
&tacetFugue ~@{BREATH + FUG}
&tacetPrelude ~@{F0}

# ---- the prelude
&figure tags="figuration" 0 1 2 1 3 1 2 1                          # the figure: top, middle, low, middle, bottom, middle, low, middle
&rhShapes tags="figuration" step=&tempo*16 stride=4 cycle=280 show=notes label="right hand: four notes a bar" {' '.join(map(str, rhS))}
&lhShapes tags="figuration" step=&tempo*16 stride=4 cycle=280 show=notes label="left hand: four notes a bar" {' '.join(map(str, lhS))}
&rhFigure tags="right hand" over=&rhShapes label="bars 1–24, right hand: the figure, twice a bar" &figure!48
&lhFigure tags="left hand" over=&lhShapes label="bars 1–24, left hand" &figure!48
""" + '\n'.join(f'&rh{n} tags="right hand" label="right hand · {lab}" {tokens(rh, a, b)}' for n, a, b, lab in SECTIONS) + '\n' + \
     '\n'.join(f'&lh{n} tags="left hand" label="left hand · {lab}" {tokens(lh, a, b)}' for n, a, b, lab in SECTIONS) + f"""
&rh tags="right hand" step=&tempo label="prelude · right hand" &rhFigure {' '.join(f'&rh{n}' for n, *_ in SECTIONS)} &tacetFugue
&lh tags="left hand" step=&tempo label="prelude · left hand" &lhFigure {' '.join(f'&lh{n}' for n, *_ in SECTIONS)} &tacetFugue

# ---- the fugue: its subject and countersubject (as the alto first has them), entered at their transpositions —
#      exact entries in place (&subject^-12: an octave down), bent ones written out
&subject tags="subject" show=notes label="the subject" {tokens([(on - 2, d, [p]) for on, d, p in subject], 0, subject[-1][0] + subject[-1][1] - 2)}
&counter tags="subject" show=notes label="the countersubject" {tokens([(on - counter[0][0], d, [p]) for on, d, p in counter], 0, counter[-1][0] + counter[-1][1] - counter[0][0])}
""" + '\n'.join(cells) + f"""
&soprano tags="soprano" step=&tempo label="fugue · soprano" &tacetPrelude {' '.join(lines['soprano'])}
&alto tags="alto" step=&tempo label="fugue · alto" &tacetPrelude {' '.join(lines['alto'])}
&bass tags="bass" step=&tempo label="fugue · bass" &tacetPrelude {' '.join(lines['bass'])}

# the synthesizer: a voice for each line, as Carlos gave each its own patch
&saw s=saw loop=C4 lpf=2600 lpq=6 env=&(map=adsr .002 .15 .45 .12)
&pulse loop=C4 lpf=1800 env=&(map=adsr .002 .15 .5 .1) 0 0 0 1
&reed s=square loop=C4 lpf=2000 env=&(map=adsr .01 .2 .6 .15) pitch=&(map=lin loop=5 0 .1 0 -.1 0)
&brass s=saw loop=C4 lpf=1500 lpq=4 env=&(map=adsr .02 .2 .7 .15)
&moog s=saw loop=C4 lpf=700 lpq=10 env=&(map=adsr .005 .25 .5 .1)

&out level=10 loop=SAMPLE_RATE map=sample [&rh * &saw * .3, &lh * &pulse * .12, &soprano * &reed * .25, &alto * &brass * .12, &bass * &moog * .2] [
                                  &rh * &saw * .12, &lh * &pulse * .3, &soprano * &reed * .1, &alto * &brass * .22, &bass * &moog * .3]"""
# ---- a layout that shows the structure: the lines in a row, each line's parts below it in order (time reads
# downward), shared material where the parts that use it can reach it
X = {'rh': -4.4, 'lh': -2.3, 'soprano': 0.4, 'alto': 3.0, 'bass': 5.6}
layout = {'out': (0.6, 0), 'about': (5.4, -0.7), 'tempo': (-6.3, 2.0),
          'saw': (X['rh'], 1.3), 'pulse': (X['lh'], 1.3), 'reed': (X['soprano'], 1.3), 'brass': (X['alto'], 1.3), 'moog': (X['bass'], 1.3)}
for v in X: layout[v] = (X[v], 2.6)
def column(v, names, y0):
    for k, n in enumerate(names):
        layout[n] = (round(X[v] + (-0.55 if k % 2 == 0 else 0.55), 2), round(y0 + 0.74 * k, 2))
column('rh', ['rhFigure'] + [f'rh{n}' for n, *_ in SECTIONS], 3.9)
column('lh', ['lhFigure'] + [f'lh{n}' for n, *_ in SECTIONS], 3.9)
layout.update({'rhShapes': (-5.9, 3.9), 'lhShapes': (-1.0, 3.6), 'figure': (-3.35, 3.3), 'tacetFugue': (-3.35, 8.6), 'tacetPrelude': (1.7, 3.4)})
for v in ['soprano', 'alto', 'bass']:
    column(v, [x[1:] for x in lines[v] if x.startswith('&') and x[1:].split('^')[0] not in ('subject', 'counter')], 4.3)
deepest = max(y for _, y in layout.values())
layout.update({'subject': (2.1, deepest + 1.3), 'counter': (4.1, deepest + 1.2)})
json.dump({k: [round(x, 2), round(y, 2)] for k, (x, y) in layout.items()}, open('/tmp/bwv847.layout.json', 'w'))

print(src)
print('subjects:', [(s[0], s[1] // 16 + 1, s[3], s[4]) for s in subs], file=sys.stderr)
print('counters:', [(c[0], c[1] // 16 + 1, c[3], c[4]) for c in cnts], file=sys.stderr)

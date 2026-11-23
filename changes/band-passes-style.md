### Repository

- **The default band passes its `&style` to its four pitched performers** (the bass, pad, stab and lead lines of `fragments/bands/01-band.md`: `style=&style`): they declared `&style` but the band never filled it, so each read the centre of style space whatever style the score set. The drummer has no `&style` (its sounds are its kit's). **What a frontend sees at its next pin:** nothing at the band's own default style (the centre, `.5 .5 .5 .5`); a score that sets `&style` now plays its pitched performers at it, as their instruments already did.

### Added

- A meter derived from another (#778, rung 1): a `meter(…)` stepped by a tap of a meter, `&waltz meter("3/4") step=beat/2`, is a meter of its own, a step of the tap a beat of it, and lines read it by note value, beat or bar (`step=&waltz:4n`), where `step=&waltz:4n` was the error "is not a meter that keeps time". It plays as the same meter at the tempo the tap gives, and follows the meter it taps. A scan tapped is the clock it was.

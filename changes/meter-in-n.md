### Added

- **A meter counted in n beats** (decision 102, #902): `meter("4/4 in 2")` is alla breve, `meter("3/4 in 1")` a waltz in one, `meter("12/8 in 2")` 12/8 in half bars, the signature's tree counted in the beats of its tier with n nodes (bpm and `&bar:beat` follow); a count no tier has is an error naming those it has. `meter("4/4 in 2")` plays as `meter("2/2", 2)`. **What a frontend sees at its next pin:** a new spelling it may meet in a text; nothing it writes changes.

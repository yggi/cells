### Added

- **`fixedStepsOf(text, options)`** (#909): every line's fixed steps at every level, in the mask's own shape (a kick's every step, a bass line's roots, a progression's cadence, a form's first and last slot, a kept line's every step); handed back as `VaryOptions.fixed` it varies a fragment as no mask does. Vary reads every level's anchors through this one lookup; `anchorsOf` is unchanged.
- **`shift`, one slot moved n degrees at every scale** (#910, `SHIFT`): a pitched line's note (`shift &bass 2 1`), a progression's chord (its `third` is its shift by a third), a form's letter on a grid, a sequence (`shift &chorus 1 2`, `&a` to `&a^2`). Asked by name: **what a frontend sees at its next pin:** nothing it doesn't ask for, recognition's default included.

# The plugin wire

What a plugin-fragment's code is handed for its arguments: the **wire grammar**, version **1** (`wire: 1`, decision [085](https://github.com/yggi/cells/blob/main/docs/decisions/085-plugin-fragments.md) §8.3, [#749](https://github.com/yggi/cells/issues/749)). A plugin reads this much of the language and no more. Cells keeps this grammar stable: a change to what an argument may hold bumps the version, and a plugin whose fragment names a newer version than cells speaks is refused.

## An argument

Each argument of a braid fill is handed as text, under its parameter's name (`fill(name, lap, args, fuel)`, `args.subject`):

- **A number or a word** is handed as written: `12`, `3/4`, `-2`, `dorian`, `C`.
- **Anything else is its core:** the steps it plays, read where its `from` line stands (a default, where its fragment writes it). References are written in, and picks, shifts, `!`, `^n`, `^$n` and subsequences are applied. So `&m!2 &m^2`, with `&m 0 2 4`, is handed as `0 2 4 0 2 4 2 4 6`. A renamed text hands the same arguments (law L1).
- **The key:** an argument read over a key is handed that key too, as one more argument, `<parameter>:key`: its degrees' semitones from C, tonic first (`subject:key: "2 4 6 7 9 11 13"` for D major). A plugin holds no scale table.

## The grammar, version 1

An argument's core is a flat braid: steps separated by spaces, each step one of

| step | means |
|---|---|
| `4` | a degree (over the key handed with it, or a semitone where there is none) |
| `4#`, `4b`, `4##` | a degree raised or lowered by steps of the grid under its key (`^$n` written in) |
| `[0, 4, 7]` | a chord: degrees that start and end together |
| `~` | a rest |

Each step lasts one step of the argument, or as many as its `@n` says (`2@2`, `0@1/2`, `~@3`). A fraction is in lowest terms, up to 64ths. The steps add up to one lap of the argument.

```text
0 2 4 0 2 4 2 4 6          a melody, a step each
0@1/2 2@1/2 [4, 6] ~@2     two halves, a chord, a rest of two steps
```

## Refused

A braid fill is filled once, and its code can't draw cells' chance. So an argument that holds any of these **refuses the fill**, with a warning on the piece's `from` line (decision 085 §8.1):

- chance (`x?`, `[a|b]`);
- `free()`;
- a value that changes from lap to lap (`<a b>`, `x/n`) or moves while it lasts;
- a note by name over a key (write its degree);
- notes that overlap;
- more than one key;
- **a key that moves** (a stepped tonic or mode).

Not yet: **a fill as an argument**, handed as its answer in the order the fills depend on each other. It comes with each braid fill's answer in the lockfile (#792, 6d's second step).

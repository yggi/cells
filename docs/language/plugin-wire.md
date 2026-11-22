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

## A fill as an argument

A braid fill's answer is handed to another as text, like any argument: `&x from countercell3 &h`, where `&h` is filled by another plugin-fragment's `from` line, hands `&x`'s code the steps `&h` was answered with. The `from` lines are taken in the order their fills depend on each other, as written otherwise. Two that read each other's fills are an error naming both. A stream's fill (a law's laps) or a refused fill has no answer to hand, and is refused.

## In the lockfile

Each braid fill's answer is recorded in a piece file's frontmatter, beside its `uses` (decision 085 §8.2):

```yaml
answers:
  - id: countercell3
    fill: upper
    args: a1:…
    text: 7 9 11@2 9
```

`args` is a hash of the arguments as the wire hands them, so a renamed text keeps its answers. A piece opens playing its recorded answers without asking the code, and a host verifies them when it can. Arguments edited since are answered anew, and with no code, the fill stays unanswered. A frontend that reads no answers keeps its `uses` entries.

## For a host

Cells runs no foreign code. A host runs a plugin-fragment's code (in Cell studio, WASM in a worker) and hands it to each compile behind the interface the built-ins answer (`PluginFragment`, `engine/fills`):

```ts
compileSource(text, env, { resolve, plugins: [countercell3] });
```

- **The interface:** `fragment` (the id a `from` line names), `fills` (each fill's `lap` for a stream, none for a braid; its `fuel`), `origin`, `cycle` and `stepSeconds` (a stream's clock), `wire`, and `fill(name, lap, args, fuel)`, which answers text or `{ refused }`. It answers synchronously: a host fills ahead and answers from what it has.
- **Braid fills** are answered when the text is expanded. **Stream fills** are answered lap by lap as the piece plays: the program keeps the host's plugins (`pluginFragments`), so realize, `lawIn` and `lawAt` find them before the built-ins. A host's plugin of a built-in's id stands in for it.
- **Recorded answers:** a piece file's `answers:` (`answersOf(file)`) are handed as `compileSource(…, { answers })`, and each plays without its code being asked.
- **The deadline:** a braid fill gets 10 s of wall clock. Past it, the host answers a refusal and drops the instance, never a partial answer (decision 085 §8.2).

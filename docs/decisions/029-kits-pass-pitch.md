# 029 · A kit passes the product's pitch and speed to the voice it picks

**Date:** 2026-10-12 · **Status:** accepted (owner, #29 item 3, #151)

## Context

A pattern read through a kit (a table of voices) picks a member by number. In a product with another pitch term (`&theme * &orch`, `&orch` reading `&band &lead &organ`), every note played at the member's own pitch: the other terms were ignored. A kit drum also ignored varispeed (a tape stop bent the bass, not the kick; #10's examples pass, item 3).

## Decision

**A kit read only selects.** The rest of the product acts on the member it picks, as on any voice: its pitch terms transpose it, its volumes scale it, a clock's varispeed bends it. With no other pitch term (plain drums), nothing changes.

## Why

- Decision 006's law `x * (s + t) = x*s + x*t`: a pitch acting on a set of voices acts on each. A kit is a table of voices, so ignoring the pitch broke the law.
- In the multiscale reading, a kit read is a lookup: an index from below picks a voice, and the product's other factors contract with it as with any voice.
- Strudel does the same: `s("bd sd").note(…)` transposes what is picked.

## Consequences

- A piece whose kit read shares a product with a pitch term now hears it transposed. The examples are checked against the event snapshot when it is built, and any piece that changes is named (decision 027's clean cut).
- Orchestration (`&theme * &orch`, a melody played on a voice the notes choose) becomes writable.

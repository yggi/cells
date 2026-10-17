# 032 · A part switched on again: restart, resume or free, named and stubbed

**Date:** 2026-10-12 · **Status:** accepted (owner, #29 item 4); built in #53 (2026-10-17)

## Context

Decision 016 switches a section on by gating its time, and a part restarts from its top each time it is switched on. Two other behaviours are coherent, and nothing chooses between them yet.

## Decision

`restart=` names the policy, on the tap that switches the part (or the selector, for all its taps):

- **`restart`**: from its top (today's behaviour, the default);
- **`resume`**: its time paused while off, going on where it stopped;
- **`free`**: its time runs on global time, and only its sound is gated (Strudel's default; what the old selector of mixes did).

`resume` and `free` were named first and played as `restart` with a warning; #53 built both, for In C (Terry Riley), which needs `resume`. A tap's own `restart=` wins over its selector's; with several selectors on one part, the first that names a policy other than `restart` rules. Windows of a selector are as before: each entry that picks a part is one, so a part picked by two entries in a row restarts at the second under `restart`; `resume` and `free` don't notice the join.

## Why

They are one axis, what a switch does to a part's time (reset it, hold it, ignore it), so one attribute names it. Stubbing the names now keeps the vocabulary settled before anyone writes them by hand.

# 032 · A part switched on again: restart, resume or free, named and stubbed

**Date:** 2026-10-12 · **Status:** accepted (owner, #29 item 4); `resume` and `free` not yet implemented

## Context

Decision 016 switches a section on by gating its time, and a part restarts from its top each time it is switched on. Two other behaviours are coherent, and nothing chooses between them yet.

## Decision

`restart=` names the policy, on the tap that switches the part (or the selector, for all its taps):

- **`restart`**: from its top (today's behaviour, the default);
- **`resume`**: its time paused while off, going on where it stopped;
- **`free`**: its time runs on global time, and only its sound is gated (Strudel's default; what the old selector of mixes did).

`resume` and `free` parse and warn "not yet implemented: plays as restart", until a piece needs them.

## Why

They are one axis, what a switch does to a part's time (reset it, hold it, ignore it), so one attribute names it. Stubbing the names now keeps the vocabulary settled before anyone writes them by hand.

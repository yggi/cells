import { eventsBetween, plan } from "./realize.js";
import { createRenderer, loudness } from "./render.js";
import { retime, windowAt } from "./schedule.js";
import { spanOf } from "./span.js";
export function pieceAudio(result, shifts, options = {}) {
    const muted = options.muted ?? result.off;
    const p = plan(result, shifts, muted);
    const span = spanOf(result, p, options);
    const seconds = span.to - span.from;
    const r = createRenderer(result, shifts, { sampleRate: options.sampleRate, tracks: options.tracks, muted });
    if (span.from > 0)
        r.add(retime(windowAt(p, span.from, seconds, { begins: span.from, until: span.to }), 0, 1).events);
    else
        r.add(eventsBetween(p, 0, seconds, true, { until: seconds }));
    const out = r.render(Math.round((seconds + span.tail) * r.sampleRate));
    return {
        sampleRate: r.sampleRate,
        span,
        mix: out.mix,
        stems: r.stems.map((name) => ({ name, channels: out.stems.get(name) })),
        diagnostics: r.diagnostics,
        loudness: loudness(out.mix),
    };
}

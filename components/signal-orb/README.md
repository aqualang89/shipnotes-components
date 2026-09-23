# Signal Orb

A particle indicator with four states: listening, thinking, searching and done. Your application decides which state to show. The component does not use a microphone, call an AI service or perform a search.

**[Open the live demo](https://aqualang89.github.io/shipnotes-components/components/signal-orb/demo.html)**. It runs in the browser, phones included.

To run it locally, open `demo.html` next to `signal-orb.js`, or embed it:

```html
<script src="signal-orb.js" defer></script>
<signal-orb state="listening" level="0.5"></signal-orb>
```

Set `state` to `listening`, `thinking`, `searching` or `done`. Set `level` from 0 to 1 to vary the listening shape. The demo's level slider is manual input, not an audio signal.

The component is square and fits its parent's width. Particles are drawn with WebGL, no libraries. By default it uses 12,000 on desktop and 6,000 on touch devices, and cuts the count by itself if frames run slow. Set `particles` (200 to 20,000) to fix the number. Without WebGL it falls back to Canvas 2D with 1,000 particles. State transitions can be interrupted. Reduced motion shows a static shape and stops the animation loop.

```html
<signal-orb state="thinking" particles="4000"></signal-orb>
```

`renderAt(time, weights)` and the `recording` attribute are helpers for video production, not needed for ordinary use.

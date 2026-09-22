# Signal Orb

A particle indicator with four states: listening, thinking, searching and done. Your application decides which state to show. The component does not use a microphone, call an AI service or perform a search.

Open `demo.html` next to `signal-orb.js`, or embed it:

```html
<script src="signal-orb.js" defer></script>
<signal-orb state="listening" level="0.5"></signal-orb>
```

Set `state` to `listening`, `thinking`, `searching` or `done`. Set `level` from 0 to 1 to vary the listening shape. The demo's level slider is manual input, not an audio signal.

The component is square and fits its parent's width. It uses Canvas 2D with 1,000 deterministically placed particles and no libraries. State transitions can be interrupted. Reduced motion shows a static shape and stops the animation loop. Rendering cost varies with screen size and device.

`renderAt(time, weights)` and the `recording` attribute are helpers for video production, not needed for ordinary use.

# Voice Orb

A particle surface that reacts to sound. Bass bends the whole shape; higher frequencies ripple across it and throw sparks off the edge. Four states give it different movement and color.

**[Try it live](https://aqualang89.github.io/shipnotes-components/components/voice-orb/demo.html)** (or open `demo.html` next to `voice-orb.js` locally). Tap **Play sample** for synthesized vowels or **Play beat** for an eight-second beat with a break and a drop. **Talk to it** asks for microphone access. Stop releases the microphone.

The component makes no network requests, records nothing and calls no AI service. Your app chooses the state. Microphone permission is requested only by the demo's button, never by the component itself. Samples are generated locally, with no audio files.

## Embed

Put `voice-orb.js` next to your page:

```html
<script src="voice-orb.js" defer></script>
<voice-orb state="idle" style="width: 420px; max-width: 100%"></voice-orb>
```

It fills its parent's width and stays square. The background is transparent. Use a dark surface behind it. Change `width` to resize it.

| Attribute | Values | Default |
| --- | --- | --- |
| `state` | `idle`, `listening`, `thinking`, `speaking` | `idle` |
| `particles` | Integer, 200-20,000; omit for automatic quality | 12,000 desktop / 6,000 coarse pointer |
| `recording` | Boolean attribute; stops the internal animation loop | Absent |

Idle is a slow lilac sphere. Listening pulls waves inward in turquoise. Thinking twists the points through three amber belts. Speaking pushes waves outward in pink and violet. Live transitions blend over about 700 ms and can be interrupted. State and audio are separate: a sound source does not change the `state` attribute for you.

## Connect audio

Call `await orb.connect(source)` from a click or tap. It accepts a `MediaStream`, an `HTMLMediaElement` or an `AudioNode`. No AudioContext is created when the page loads. Browsers still apply their normal autoplay and microphone rules.

For an existing player:

```js
const orb = document.querySelector('voice-orb');
const player = document.querySelector('audio');

playButton.addEventListener('click', async () => {
  await orb.connect(player);
  orb.state = 'speaking';
  await player.play();
});
```

For a microphone, resume a context during the click, before awaiting permission:

```js
let micContext, stream;

talkButton.addEventListener('click', async () => {
  micContext ??= new AudioContext();
  await micContext.resume();
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  await orb.connect(micContext.createMediaStreamSource(stream));
  orb.state = 'listening';
});

stopButton.addEventListener('click', () => {
  orb.disconnect();
  stream?.getTracks().forEach(track => track.stop());
  orb.state = 'idle';
});
```

You can also pass an already available stream directly with `await orb.connect(stream)`. Microphone capture needs HTTPS or localhost. The sample buttons also work when `demo.html` is opened as a local file. Handle permission errors in your app; the demo shows them below the buttons.

An AudioNode is tapped for analysis without changing its existing playback connections. Connect it to your own destination if it should be audible. Microphone audio is never sent to the speakers by the orb. Connecting a different source detaches the previous analysis tap.

`orb.disconnect()` removes the tap. It does not stop caller-owned stream tracks, pause a media element or close a supplied node's context. A context created for a direct MediaStream is closed. Removing the element also disconnects its audio.

For HTML media, the component caches one source node per element and keeps its playback route connected when analysis stops. If you have already created a MediaElementAudioSourceNode yourself, pass that node instead of the media element. For remote media, use a CORS-enabled source. `orb.audioContext` exposes the current context; `orb.bands` returns a copy of the three smoothed levels.

### What drives the surface

The analyser uses an FFT size of 2,048. Band energy comes from summed FFT power, then a compressive gain and separate envelopes. These levels are visual controls, not calibrated loudness measurements.

| Band | Frequency | Attack / release | Movement |
| --- | --- | --- | --- |
| Low | 45-250 Hz | 12 / 200 ms | Broad deformation, bass pressure |
| Mid | 250-2,400 Hz | 28 / 150 ms | Traveling folds |
| High | 2,400-12,000 Hz | 6 / 85 ms | Fine noise, edge sparks |

A bass onset compares incoming energy with a fast 60 ms baseline, so a rolling 808 line cancels out and the kick on top of it still reads as a hit. Its burst decays over 180 ms. On a 140 BPM phonk track with a bass note on most sixteenths, this catches 16 kicks out of 16; the earlier 140 ms baseline caught 3. The demo beat is 112 BPM, with a break before the stronger return.

## Frames for video

`renderAt()` takes seconds. Set `recording` and a fixed particle count before seeking:

```html
<voice-orb recording particles="12000"></voice-orb>
```

```js
await customElements.whenDefined('voice-orb');
const orb = document.querySelector('voice-orb');

orb.renderAt(4.25, {
  weights: [0, 0, 0, 1], // idle, listening, thinking, speaking
  bands: [0.86, 0.78, 0.63], // low, mid, high
  onset: 0.62 // optional transient, 0-1; defaults to zero
});
```

Weights are normalized. Bands and onset are clamped to 0-1. Zero weights fall back to idle. With just `time`, weights come from the state attribute and audio levels are zero.

The required `{weights, bands}` API works on its own. `onset` is an extra control for kicks: pass your precomputed transient envelope to get the same burst as live audio. Feed smoothed bands from your analysis file; `renderAt()` does not smooth or read Web Audio. In a 60 fps export, use `time = frame / 60`.

Seeking out of order gives the same pixels for the same arguments, particle count and canvas size on the same renderer. The shader uses fixed point seeds and absolute time. It does not read a wall clock or call rAF. WebGL implementations can differ in floating-point results, so this is not a cross-GPU pixel guarantee.

`recording` also stops the loop when added after startup. Removing it resumes live rendering. For browser screenshots, let two animation frames pass after `renderAt()` so the compositor presents the new canvas. This wait does not advance the orb. Resize preserves the last supplied recording frame.

For a transition, supply intermediate weights yourself. A `.6-.8` second eased crossfade works well. The live loop uses exponential smoothing with a `.24` second time constant.

## Performance and accessibility

WebGL draws the points in one call. Positions and coherent noise run in the vertex shader; particle data is uploaded only when the count changes. Device pixel ratio is capped at 2.

Automatic quality steps down by 30% after sustained slow frames, to a minimum of 800 points. A fixed `particles` attribute disables this adjustment. Without WebGL, Canvas 2D draws a simpler version with 1,000 points by default and a 1,500-point cap. The fallback keeps state colors and audio response, with simpler surface detail.

Hidden tabs stop the visual loop. Reduced motion shows a static state and stops live motion, including audio-driven movement. Explicit `renderAt()` remains available for exports. The host has an accessible state label; the demo uses native buttons with touch targets of at least 44 px.

## Checked on 2026-09-26

One functional browser pass, then a targeted visual correction and capture check. No video was rendered.

- 12,000 points at 720 x 720: **60.0 fps**, median 16.7 ms, p95 16.7 ms, over 180 measured frames with strong audio levels. Headless Chromium 149 used ANGLE SwiftShader, a software renderer. This is a local measurement, not a performance promise for every device.
- No console errors. All state buttons worked; synthesized vowels and the beat drove the analyser. The beat's onset reached 1.0 after the quiet section.
- Identical recording arguments produced identical pixels after unrelated seeks. Recording mode held the frame without rAF.
- At 390 px: document width **390 px**, 6,000 points. Canvas fallback and reduced motion also passed.
- All three source types connected. Reconnecting an HTMLMediaElement reused its context. Microphone interaction used Chromium's fake capture device; physical microphone quality and Safari were not tested.

The full results are in `verification.json`. `shots/` contains four isolated 1080 x 1080 state captures and a 390 px demo capture. Shots use supplied audio levels for a clear view of each state. Audio was checked numerically, not auditioned.

## Design references

[VoiceOrbs, Particles Orb](https://voiceorbs.vercel.app/) supplied the particle-sphere baseline. [Agus Cruiz's Voice Orb](https://github.com/aguscruiz/voiceorb/blob/main/app.js) separates state from audio and uses normal displacement with edge lighting. [Vapi Blocks' orb](https://www.vapiblocks.com/components/3d-orb) was the third reference from the brief. This implementation uses its own shaders and the local Signal Orb's web-component structure; it does not load those projects or Three.js.

The sources were inspected through their pages and available code. Direct browser capture of VoiceOrbs failed with a connection reset; no timing measurement of that site is claimed. Lazyweb was not available in this tool session.

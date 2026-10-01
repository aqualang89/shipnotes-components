# Speaking Orb

A face for your voice assistant. Signal Orb's 12,000 particles, plus a fifth state: while the assistant talks, the sphere swells with the voice, every syllable sends a lit ring from the bottom to the top, and each word flies out of the orb as particles and lands as a live caption. One file, no libraries, no network.

**[Open the live demo](https://aqualang89.github.io/shipnotes-components/components/speaking-orb/demo.html)**. Tap a line and it speaks with your browser's own voice.

## Use

```html
<script src="speaking-orb.js" defer></script>
<speaking-orb id="jarvis" state="listening"></speaking-orb>
<script>
  const orb = document.querySelector('#jarvis');
  orb.say('Good morning. You have three meetings today.');
</script>
```

States: `listening`, `thinking`, `searching`, `speaking`, `done`. Set them with the `state` attribute or `orb.state = 'thinking'`. When a line ends the orb goes back to `listening`, or to whatever you put in the `rest` attribute, and fires an `end` event.

`say()` has three modes:

- `orb.say(text)` speaks with the browser's `speechSynthesis` and follows its word events. It picks the best English voice the browser has (natural and neural voices first), or pass `{voice}` with one from `speechSynthesis.getVoices()`. The browser doesn't expose that audio, so the swell is estimated from syllables.
- `orb.say(text, {audio})` with an `<audio>` element playing your own TTS (OpenAI, ElevenLabs, anything): the sphere follows the real signal through Web Audio.
- Add `words: [{w, start, end}]` (seconds from the audio start) and captions land exactly on each word. Most TTS APIs can return these timings.

`await orb.listen()` asks for the microphone and drives the `listening` shape from your voice. It returns a function that stops the mic. Without it, set `level` from 0 to 1 yourself.

## Captions

Each word of the assistant is built from particles first, sampled from the caption font, and the real text appears exactly where they land, so it stays sharp and readable. The caption itself is real text in the component's shadow DOM, `aria-live="polite"`, so screen readers get the words too. Lines from the user (`who: 'user'` in `renderAt`) show as plain text. A line splits into subtitle-sized groups at sentence ends and commas. The spoken word is bright, earlier words dim, the layout of a group doesn't move while it fills in. Style with `--cap` (colour) and `--cap-font`. The size follows the component width (18 to 34px).

## Performance

WebGL points. 12,000 particles on desktop, 6,000 on touch devices, and the count drops by itself if frames run slow. Set `particles` (200 to 20,000) to fix it. Without WebGL it falls back to Canvas 2D. Reduced motion keeps the captions and freezes the sphere.

## Video

`renderAt(time, {weights, env, onsets, words, lineTime})` draws an exact frame for video capture, with the `recording` attribute set so the live loop stays off. `env` is the voice envelope from 0 to 1 at that moment, `onsets` are syllable times in seconds.

Based on [Signal Orb](../signal-orb/). MIT.

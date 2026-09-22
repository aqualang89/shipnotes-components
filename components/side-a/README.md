# Side A

A working audio player with a vinyl record, moving tonearm and a sliding album insert. Press Play and the platter picks up speed. Pause it and the arm returns while the record coasts to a stop.

Built with Codex for Ship Notes. HTML, CSS and JavaScript. No libraries, build step or remote assets required for the demo.

## Try it

Download `demo.html`, `side-a.js` and `demo-track.js` into the same folder, then open `demo.html` in a modern browser. Press Play: browsers require a user gesture before audio playback.

The demo generates a 24-second instrumental called After Hours locally. It uses synthesized tones, with no third-party samples or vinyl hiss. It is a short demonstration track, not a commercial recording. The code and demo audio are provided under the MIT license below.

## Bring your own music

```html
<side-a-player
  src="./audio/your-track.mp3"
  track-title="Your track"
  artist="Your name"
></side-a-player>
<script src="side-a.js"></script>
```

Put your audio file at that path, or use a direct HTTPS audio URL. A Spotify or streaming-service webpage is not a direct media source. Use music you own or have permission to share. You do not need `demo-track.js` for your own audio.

The component uses the browser's HTMLAudioElement. Format support, seeking on remote servers and streaming behavior depend on the browser and server. No network requests are made until you provide a source; the supplied demo uses a local Blob URL. HTTP, HTTPS, Blob and File URL schemes are accepted; others are rejected. File URLs are for local use, not hosted pages.

## Controls

Play/Pause, playback position and volume are native keyboard-accessible controls. Sleeve notes slides out the illustrated album insert. Metadata duration comes from the loaded audio. Errors and blocked playback are reported in the status line.

The platter has visual acceleration and deceleration. That does not change audio playback speed or pitch. The amber meter is decorative, not a waveform or live audio analyzer. The illustrated cover and record label are the built-in After Hours artwork; edit their markup/CSS for a different visual identity. Track title and artist below the deck are configurable.

Reduced-motion mode keeps the record still and changes the arm state without continuous rotation. The short demo is not set to loop; it ends normally. On removal from the document, audio is paused and the animation frame is stopped.

## API

| Member | Use |
| --- | --- |
| `src` | Set the direct audio URL as a property or HTML attribute |
| `track-title`, `artist` | Text attributes shown below the turntable |
| `play()` | Request playback; handles rejection with an on-screen status |
| `pause()` | Pause audio and let the visual platter coast |
| `seek(seconds)` | Seek within a finite loaded track |
| `toggleSleeve(true/false)` | Open or close the illustrated insert |
| `audio` | Underlying HTMLAudioElement for events, volume and integration |
| `recording` attribute | Disable interactive animation for deterministic video capture |
| `pose(angle, arm, sleeve, time, duration, energy)` | Set a recording pose; never starts audio |

Tested with real playback in Chromium, including keyboard Play, Pause, seek, volume and a 390px layout. Safari and Firefox have not been checked. Styling uses shadow DOM. The UI artwork is CSS and inline SVG, not a 3D model or physical simulation.

## License

MIT License

Copyright (c) 2026 Ship Notes

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

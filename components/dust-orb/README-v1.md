# Dust Orb

A moving cloud of dust for your assistant. Five states, light inside the cloud, a pulse on click and rotation on drag.

**Free source, MIT licence.** Use and adapt it in personal and commercial projects. Keep the licence notices. This is the public edition of the original Dust Orb; version 2 is being developed separately.

[Live demo](https://aqualang89.github.io/shipnotes-components/components/dust-orb/demo.html)

## Start

Copy this directory. Run `python -m http.server 8080` inside it and open `http://localhost:8080/demo.html`.

To embed it, load the bundled Three.js before the component. Give its container a height:

```html
<script src="vendor/three-r180.js" defer></script>
<script src="dust-orb.js" defer></script>
<dust-orb id="orb" style="display:block;width:100%;height:420px"></dust-orb>
<script>
  customElements.whenDefined('dust-orb').then(() => {
    document.getElementById('orb').setState('listening');
  });
</script>
```

No build step, CDN, account or API key. The demo itself makes no AI calls and requests no microphone access.

## Control it

| Method | Use |
| --- | --- |
| `setState(name)` | `idle`, `listening`, `thinking`, `speaking`, `agitated` |
| `setVoiceLevel(level)` | Voice loudness from your app, 0 to 1 |
| `pulse()` | Send a brief impulse through the cloud |
| `setEnergy(level)` | Motion strength, 0 to 1 |
| `setLight(level)` | Inner light, 0 to 1 |
| `setQuality(value)` | `'auto'`, `16000`, `40000`, `80000`, `140000`, `200000` |
| `pause(true/false)` | Pause or resume motion |
| `stats` | Particle count, measured fps, quality, device and fallback status |
| `destroy()` | Release listeners and graphics resources; removal also calls this |

State aliases: `alert` and `error` map to `agitated`; `talking` to `speaking`; `processing` to `thinking`; `waiting` to `idle`. `setVoice()` aliases `setVoiceLevel()`.

Events: `statechange`, `qualitychange`, `performance`. Data is in `event.detail`.

```js
orb.setState('thinking');
// When your app starts playing its answer:
orb.setState('speaking');
orb.setVoiceLevel(0.6);
// Once playback ends:
orb.setVoiceLevel(0);
orb.setState('idle');
```

## Rendering

WebGL 2 via bundled Three.js r180. The GPU draws up to 200,000 dust particles and 1,400 soft light particles. Automatic quality adjusts density to measured frame time. Actual performance depends on the device and canvas size; lower the density on slower hardware.

When WebGL cannot be created, a simpler Canvas 2D fallback draws 5,000 points. It preserves basic interaction and state colours, with less visual detail. Reduced motion is respected. Rendering stops while the document is hidden. No audio is included.

For repeatable capture, set the `recording` attribute and call `renderAt(seconds, {state:'listening'})`. Remove the attribute to return to live rendering.

Three.js has its own MIT notice in `vendor/THREE-LICENSE.txt`.

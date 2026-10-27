# Bat Swarm

A little Halloween colony for your desktop or website. They follow your cursor,
hang from window edges and wake up when you move their perch. One wrapped bat
takes a little longer.

**[Download for Windows x64](https://github.com/aqualang89/shipnotes-components/releases/download/bat-swarm-v2.3.0/Bat-Swarm-Windows-x64.zip)** · **[Try the web demo](https://aqualang89.github.io/shipnotes-components/components/bat-swarm/demo.html)**

## Windows app

1. Download the Windows ZIP and extract the whole folder.
2. Start `Bat Swarm.exe`. Keep the other files beside it.
3. Right-click the bat in the system tray to change the colony, pause or quit.
   The icon may be under the small up arrow.

The bats sit on real application windows. The overlay passes clicks through,
so you can keep using your apps. The default colony has 28 bats; the tray offers
18, 28, 38 or 60. Wing sounds start off.

Windows 10/11, x64, portable folder. No installer, administrator access or
account required. This build is unsigned, so Windows may show an unknown-publisher
warning. It was tested on one display at 150% scaling; mixed-DPI physical
monitors still need a hardware test.

The local helper reads window rectangles, window classes and cursor position.
It does not read window titles, typed keys, documents or clipboard contents,
and it makes no network requests.

[Windows source and build instructions](desktop/README.md).

## Web component

**[Try it live](https://aqualang89.github.io/shipnotes-components/components/bat-swarm/demo.html)**, including touch controls.
Canvas 2D and plain JavaScript, no runtime dependencies.

Copy `swarm-core.js` and `bat-swarm.js` together. `demo.html` opens locally too.

```html
<script src="swarm-core.js"></script>
<script src="bat-swarm.js"></script>

<section data-perch>Your content</section>
<bat-swarm count="38" size="1" seed="31"></bat-swarm>
```

Mark elements where bats can hang with `data-perch`. Their top edge must be
inside the viewport. The overlay does not intercept clicks or prevent scrolling.
Move a marked element and its bats let go. Move close to a sleeping bat to wake
it, or click/tap to scatter the colony.

`count`: 1-150, default 38. `size`: scale, default 1. `seed`: reproducible colony.
It respects `prefers-reduced-motion` and pauses in hidden tabs.

```js
const bats = document.querySelector('bat-swarm');
bats.scatter(300, 200);
bats.perchOn(document.querySelector('[data-perch]'));
bats.renderAt(3.2); // deterministic frame for recording/testing
bats.play();
```

`sound.js` is optional and is used by the demo's sound button. The component
itself is silent. The Windows app and web component share `swarm-core.js`.

Application code and bat artwork: MIT, Ship Notes / aqualang89. Electron has
its own bundled licenses; keep them with the Windows download. Version 2.3.0.

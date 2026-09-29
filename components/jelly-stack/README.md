# Jelly Stack

**[Try it live](https://aqualang89.github.io/shipnotes-components/components/jelly-stack/demo.html)** (or open `demo.html` next to `jelly-stack.js` locally). On a phone, pull a corner, then tap the card peeking out behind.

Pull the front card by a corner and let go. Project Stack, but the three cards are soft glossy jelly: they bend, stretch, overshoot and wobble, and the text bends with them. Dependency-free Web Component, WebGL1, one file. The sample projects and links are placeholders.

## Use

Copy jelly-stack.js. Load it with `<script src="jelly-stack.js" defer></script>`, then copy the `<jelly-stack>` block from demo.html and edit the three JSON entries: title, tag, description, href. Add `"accent": "#rrggbb"` to an entry to recolor that jelly (body, rim, side wall and shadow all follow it). Keep exactly three entries. Text goes in as plain text, links allow HTTP(S) only.

Attributes:

- `intro` drops the three cards onto the page one after another when it loads.
- `active="1"` picks the starting card.
- `recording` stops the component's own loop (for video capture, see below).

The parent controls the width, the default max is 460px, the height follows the width. The card title uses `--jelly-serif` (demo.html sets Instrument Serif from Google Fonts), the rest uses `--jelly-sans`. Both fall back to system fonts. Built for light pages; the cream background is the page's, not the component's.

## What you can do with it

- Tabs work with a mouse, touch, Left/Right, Home and End. Tap a card peeking out of the stack to bring it forward.
- Grab the front card anywhere and pull: it stretches with a rubber band feel. A slow hand lets go softly, a flick makes it whip.
- Tap it or call `poke()` and it jiggles. With a mouse, the cursor presses a small dent into the surface.

JavaScript: `select(i)`, `poke(u, v)` (fractions of the card, both optional), `drop()`, and a `change` event with `detail.index`.

## Video

`renderAt(time, events)` draws the frame at `time` seconds, deterministic: the same arguments always give the same frame, whatever order or rate you call it in. The physics runs on a fixed 240 Hz step from zero. Coordinates are fractions of the card box.

```js
el.renderAt(1.25, [
  {t: 0, type: 'drop'},
  {t: 1.4, type: 'select', index: 2},
  {t: 2.6, type: 'drag', from: [.84, .16], to: [1.16, -.1], dur: .14, hold: 0},
  {t: 3.8, type: 'poke', at: [.35, .4]},
  {t: 4.4, type: 'hover', from: [.2, .5], to: [.8, .5], dur: 1.2}
]);
```

## How it works

Each card is a 9x9 grid of points. Neighbours are tied with springs, the whole grid is pulled back to its own best rigid fit (shape matching), and to its slot in the stack: hard in the middle, loose at the corners. That's why corners lag, overshoot and flap. A second grid carries a wave for the surface height, the jelly keeps its volume, so a dent in one place is a bulge in another, and squeezing the card makes it thicker. The mesh is drawn smooth between the points (Catmull-Rom) with the card face as a texture: rounded bevel, a pillow dome, gloss from two softboxes, a side wall, a coloured soft shadow. The face texture is refracted by the surface slope, so text wobbles under a ripple.

## Accessibility and fallbacks

Real tabs and tabpanels, only the active panel's link is focusable, titles and descriptions are in the DOM for screen readers. Reduced motion: no wobble, cards just slide. No WebGL: plain CSS cards with the same tabs and links. The deck takes touch drags for itself (`touch-action: none`), so on a phone the page scrolls from outside the cards.

## Performance

Measured in Chrome on an Intel Iris Xe laptop, 1280px wide at DPR 2, while poking and switching cards non-stop: 60 fps, JS 1.6 ms per frame (p95 3.7 ms). With CPU throttled x4 in DevTools: 59.7 fps, JS 6.9 ms (p95 11.7 ms). A card at rest costs nothing, and when all three settle the loop stops completely.

## Design choices

| Before | After |
| --- | --- |
| Cards slide as flat rectangles | Cards are soft bodies that bend with their content |
| Selection swaps z-index and eases | The picked card hops out of the stack, lands and splats, the stack under it flinches |
| Nothing to touch | Pull, flick, poke, hover dent, tap a peeking card |
| Flat surface | Bevel, gloss that slides over the ripples, side wall, coloured shadow |
| CSS transitions only | Deterministic `renderAt` for frame-exact video |

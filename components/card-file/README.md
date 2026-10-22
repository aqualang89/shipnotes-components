# Card File

A shelf for your projects that you can flip through. Cards slide past, the one in the middle steps forward and its picture comes alive, the rest fall back into the room. Six worlds: Ember (gold on black glass), Oxide (red on bone paper), Frozen Vault (ice on a steel rail), Rain Terminal (wet neon glass), Grid Blackout (an orange power console) and Ghost Market (violet panels in a night market). Made for [Ship Notes](https://www.instagram.com/shipnotesai/).

## Try it

**[Open the live demo](https://aqualang89.github.io/shipnotes-components/components/card-file/demo.html)**, works on a phone too.

To run it locally, open `demo.html` through any local server (WebGL won't load textures from `file://`):

```
python -m http.server 8000
```

Then go to `http://localhost:8000/demo.html`. Drag, swipe, scroll or use the arrow keys. Click the middle card (or press Enter) to open its dossier, Escape closes it. The buttons at the bottom switch worlds.

Two more demo modes: `demo.html?art=images` puts real screenshots on the cards, `demo.html?art=generated` shows the drawing a card gets when it has no picture. Add `&theme=ghost-market` to open a world directly.

Plain HTML, CSS and JavaScript. No libraries, no build step.

## Use it on your site

Keep the JS and CSS files together with the `fonts`, `art`, `surfaces` and `backplates` folders. A world downloads only its own pictures, about 1 MB, when you open it.

```html
<link rel="stylesheet" href="./card-file.css">
<div id="projects"></div>
<script src="./motion.js"></script>
<script src="./card-motion.js"></script>
<script src="./card-art.js"></script>
<script src="./card-file.js"></script>
<script>
  const shelf = CardFile.mount(document.querySelector('#projects'), {
    theme: 'rain-terminal',
    items: [
      { title: 'My app', kind: 'WEB APP', status: 'LIVE', image: './shots/my-app.jpg',
        description: 'What it does in one line.', href: 'https://my-app.com' },
      { title: 'Side project', kind: 'CLI', status: 'OPEN SOURCE',
        href: 'https://github.com/me/side-project' }
    ]
  });
</script>
```

The second project has no `image`, so it gets a drawing of light ribbons in the colours of the world. The same title always draws the same picture.

`card-art.js` is optional: without it (or without WebGL) the pictures stay still. With it, the picture on the middle card moves in the style of the world: Ember shimmers, Rain ripples, Ghost glitches when a card lands.

## Card fields

| Field | What it is |
| --- | --- |
| `title` | big name on the card |
| `number` | small number in the corner, defaults to the position |
| `kind` | short label under the title, like `WEB APP` |
| `status` | line at the bottom of the card |
| `description` | text in the dossier |
| `href` | link in the dossier, `http` and `https` only |
| `image` | your picture: a URL, a path next to the page, or a `data:` image. Pictures from another site need CORS headers to animate, otherwise they stay still |
| `id` | stable key, keeps the selected card when you call `setItems` |
| `art` | one of the bundled demo pictures: `iris`, `dust`, `signal`, `garden`, `contact`, `fold`, `noct` |

## Options

| Option | Default | Values |
| --- | --- | --- |
| `items` | `[]` | the cards above |
| `theme` | first of `themes` | `ember`, `oxide`, `frozen-vault`, `rain-terminal`, `grid-blackout`, `ghost-market` |
| `themes` | all six | which worlds the buttons offer |
| `startIndex` | middle card | which card is in front on load |
| `muted` | `false` | interface sounds off |

## Controller

| Method | Action |
| --- | --- |
| `next()` / `prev()` | flip one card |
| `select(index)` | fly to a card |
| `open()` / `close()` | the dossier of the middle card |
| `setTheme(id)` / `getTheme()` | switch worlds without rebuilding |
| `setItems(items)` | replace the cards |
| `destroy()` | remove everything and stop the loop |

## Events

The element you mounted on fires `cardfile:move`, `cardfile:focus`, `cardfile:open`, `cardfile:close` and `cardfile:theme`. `event.detail` has the card `id` and its `index`, and for `theme` the `from` and `to` worlds.

```js
document.querySelector('#projects').addEventListener('cardfile:open', e => {
  console.log('opened', e.detail.id);
});
```

## Sound and motion

Sounds are synthesized in the browser, no audio files. They start after the first click or key press, as browsers require. `prefers-reduced-motion` turns off the flying, the moving pictures and the light sweeps; the cards just switch.

## Credits

Fonts: Archivo, Instrument Serif and Geist Mono, all under the SIL Open Font License 1.1, license files in `fonts/`. World and card pictures were made for this component. Code under MIT.

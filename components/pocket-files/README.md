# Pocket Files

A small glass pocket for three project files. Open the fan, pick a card and it unfolds into a two-page preview. Close it and the card goes back to its place.

Built with Codex for Ship Notes. HTML, CSS and JavaScript, with inline SVG artwork. No libraries or build step. MIT licensed.

## Try it

Download `demo.html`, `pocket-files.js` and `demo-data.js` into the same folder. Open `demo.html` in a modern browser.

The demo includes a text brief, JSON color tokens and an original SVG mark. Open file opens the actual sample in a new tab. All three are generated in your browser as Blob URLs; nothing is uploaded. Your browser decides whether to display or download a file.

## Use your own files

```html
<pocket-files id="files"></pocket-files>
<script src="pocket-files.js"></script>
<script>
  document.querySelector('#files').files = [
    {
      title: 'Project brief',
      type: 'TXT',
      meta: 'PROJECT NOTES',
      description: 'The plan for our next release.',
      href: './downloads/brief.txt'
    },
    {
      title: 'Color tokens',
      type: 'JSON',
      meta: 'DESIGN TOKENS',
      description: 'The colors used across the project.',
      href: './downloads/tokens.json'
    },
    {
      title: 'Brand mark',
      type: 'SVG',
      meta: 'VECTOR ARTWORK',
      description: 'Our mark in a scalable format.',
      href: './downloads/mark.svg'
    }
  ];
</script>
```

Create those files at the paths you use. Do not include `demo-data.js` in your real integration: it fills the dock with sample content. HTTPS links work too. Only link to files you trust and have permission to share.

This version expects exactly three records. Each card has an illustrated cover: brief, palette, then mark. These covers are code-generated graphics, not thumbnails extracted from your files. Titles, types, descriptions and links are configurable; replace the cover markup in the component if you want different artwork. It does not parse PDFs, inspect directories, upload files or check link availability.

Text is inserted as text, not HTML. The component rejects URL schemes other than HTTP, HTTPS, Blob and File. File URLs are for local demos; they will usually not work from a hosted website. Relative URLs resolve against the page. Links open in a new tab with `noopener noreferrer`.

## Controls

Click or tap Explore files to open the pocket. Select a card to read its preview. Hover lifts a card on pointer devices; touch does not depend on hover.

Keyboard: Tab to Explore files and press Enter. Tab through the cards, or use Left/Right, Home and End while a card is focused. Enter opens the preview. Escape closes it and returns focus to the selected file. Escape again closes the pocket. Preview controls keep keyboard focus within the preview interaction while it is open.

Reduced motion disables transitions. Narrow containers below 460px show a single larger preview page with touch-sized controls instead of squeezing the two-page view onto a phone. Styles are scoped with shadow DOM.

## API

| Member | Use |
| --- | --- |
| `files` | Set or read the three file records; getter returns copies |
| `toggle(true)` / `toggle(false)` | Open or close the pocket |
| `select(index)` | Open preview 0, 1 or 2 |
| `closePreview()` | Return the selected card to the fan |
| `filepreview` event | Bubbling event with `detail.index` and `detail.file` |
| `pose(open, index, detail, hover)` | Visual-only recording API; not an interactive state change |
| `recording` attribute | Turns off CSS transitions for deterministic capture |

Tested in Chromium on desktop and at a 390px viewport. Safari and Firefox have not been checked. Glass uses `backdrop-filter`; its translucent background remains if blur is unavailable. This is a UI component, not a file-hosting service.

## License

MIT License

Copyright (c) 2026 Ship Notes

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

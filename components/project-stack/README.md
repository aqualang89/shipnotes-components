# Project Stack

Three portfolio cards in a stack. Pick a tab or use the arrow keys and the next card comes forward. Built with Codex for [Ship Notes](https://x.com/shipnotesai).

**[Open the live demo](https://aqualang89.github.io/shipnotes-components/components/project-stack/demo.html)**. It runs in the browser, phones included.

To run it locally, open `demo.html` next to `project-stack.js`, or embed it:

```html
<script src="project-stack.js" defer></script>
<project-stack>
  <script type="application/json">[
    {"title": "Orbit", "tag": "BRAND & WEB", "description": "A home for your next big idea.", "href": "https://example.com", "accent": "#7ee0b8"},
    {"title": "Forma", "tag": "DESIGN SYSTEM", "description": "A small system for making things feel consistent.", "href": "https://example.com"},
    {"title": "Echo", "tag": "DIGITAL PRODUCT", "description": "A quieter place for your favourite sounds.", "href": "https://example.com"}
  ]</script>
</project-stack>
```

Keep exactly three entries. Each takes `title`, `tag`, `description` and `href`. Add `accent` (any `#rrggbb`) to recolor that card: the tag, planet and glow follow it. Without it, the cards keep their gold, blue and violet.

Load the script with `defer` so the JSON inside the tag is already on the page when the component starts. Titles and descriptions go in as plain text, and links accept HTTP(S) only. Keep descriptions short; the demo lengths fit.

The component is one JavaScript file in a Shadow DOM, with no libraries. Its parent sets the width, up to 460px. Tabs work with a mouse, touch, Left/Right, Home and End. Reduced motion turns the transitions off. The sample projects and links are placeholders.

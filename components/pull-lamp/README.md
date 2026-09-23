# Pull Lamp

A small desk lamp that works as a theme switch. Pull the brass cord, tap it, or focus it and press Enter or Space. Built with Codex for [Ship Notes](https://x.com/shipnotesai).

## Try it

**[Open the live demo](https://aqualang89.github.io/shipnotes-components/components/pull-lamp/demo.html)**. It runs in the browser, phones included.

To run it locally:

1. [Download the repository ZIP](https://github.com/aqualang89/shipnotes-components/archive/refs/heads/main.zip) and extract it.
2. Open `components/pull-lamp/demo.html` in a browser.
3. Drag the small brass handle down and release, tap it, or press Tab to focus it and use Enter or Space.

Keep `demo.html` and `pull-lamp.js` in the same folder. No libraries, terminal commands or build step. The demo works from a local file. The illustration is SVG included in the JavaScript file.

## Use it on your site

```html
<script src="pull-lamp.js" defer></script>
<pull-lamp></pull-lamp>
```

The component starts with the light off. Add the boolean `on` attribute to start with it on. Give its parent a width; the illustration scales with it.

The lamp emits `themechange` when the user activates it. Your page applies the theme. This complete example includes both parts; save it beside `pull-lamp.js` and open it:

```html
<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My theme switch</title>
  <script src="pull-lamp.js" defer></script>
  <style>
    :root { color-scheme: dark; background: #101b17; color: #f2eee0; }
    :root[data-theme="light"] { color-scheme: light; background: #f0e7d6; color: #263c30; }
    body { margin: 0; padding: 24px; font-family: system-ui, sans-serif; }
    pull-lamp { width: min(100%, 320px); }
  </style>
</head>
<body>
  <pull-lamp></pull-lamp>
  <p>Pull the cord to change the page theme.</p>
  <script>
    document.querySelector('pull-lamp').addEventListener('themechange', event => {
      document.documentElement.dataset.theme = event.detail.theme;
    });
  </script>
</body>
</html>
```

Replace the example colors with your site's theme styles. The event's `detail.theme` is `"light"` when the lamp is on and `"dark"` when it is off. To start in light mode, use both `<html data-theme="light">` and `<pull-lamp on>`.

Setting `on` programmatically updates the lamp without emitting a user event. You can sync it with your app's existing theme state without creating an event loop:

```js
const lamp = document.querySelector('pull-lamp');
const currentTheme = document.documentElement.dataset.theme;
lamp.toggleAttribute('on', currentTheme === 'light');
```

The demo deliberately does not store your preference. Add persistence or follow the system theme in your app if needed. The component does not change global page styles by itself.

## Interaction

The cord uses pointer capture for mouse, pen and touch. Pull it down beyond the threshold and release, or tap without dragging. A cancelled gesture returns the cord without switching the theme. The handle is a keyboard-accessible button with an updated accessible label and pressed state.

Cord return is a lightweight damped-spring animation, not a full rope simulation. Reduced-motion preferences disable the return animation and switch the light immediately. The demo also disables its page-color transition. Only the handle captures touch dragging, so the rest of the page can scroll.

Tested in Chrome 149 at desktop and a 390px viewport, including native touch input. Safari, Firefox and physical phones were not tested in this release check.

## License

[MIT](../../LICENSE). You can use and modify it in personal or commercial projects. Keep the license notice when redistributing the code.

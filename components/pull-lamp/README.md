# Pull Lamp

A small desk lamp that works as a theme switch. Pull the brass cord, tap it, or focus it and press Enter or Space. Built with Codex for [Ship Notes](https://x.com/shipnotesai).

## Try it

Keep `demo.html` and `pull-lamp.js` in the same folder and open the demo in a modern browser. No libraries or build step. The illustration is SVG, not an image or video.

## Use it on your site

```html
<script src="pull-lamp.js" defer></script>
<pull-lamp></pull-lamp>
```

The component starts with the light off. Add the boolean `on` attribute to start with it on. Give its parent a width; the illustration scales with it.

The lamp emits `themechange` when the user activates it. Your page applies the theme:

```js
document.querySelector('pull-lamp').addEventListener('themechange', event => {
  document.documentElement.dataset.theme = event.detail.theme;
});
```

Use `[data-theme="light"]` and `[data-theme="dark"]` to define your page colors, as shown in demo.html. Setting `on` programmatically updates the lamp without emitting a user event. This makes it possible to sync it with your app's existing theme state without creating an event loop.

```js
lamp.toggleAttribute('on', currentTheme === 'light');
```

The demo deliberately does not store your preference. Add persistence or follow the system theme in your app if needed. The component does not change global page styles by itself.

## Interaction

The cord uses pointer capture for mouse, pen and touch. Pull it down beyond the threshold and release, or tap without dragging. A cancelled gesture returns the cord without switching the theme. The handle is a keyboard-accessible button with an updated accessible label and pressed state.

Cord return is a lightweight damped-spring animation, not a full rope simulation. Reduced-motion preferences disable the return animation and switch the light immediately. The demo also disables its page-color transition. Only the handle captures touch dragging, so the rest of the page can scroll.

Tested in Chrome 149 at desktop and a 390px viewport. Other browsers and physical mobile devices have not been exhaustively tested.

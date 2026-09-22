# Engine Room

A mechanical throttle for an asynchronous control. The handle shows the request; the dial shows the last confirmed engine speed. The demo simulates the reply. It does not connect to hardware.

Open `demo.html` next to `engine-telegraph.js`. No build step or dependencies. Drag the orange handle, press the speed buttons, or focus the handle and use arrow keys, Home and End. With the demo interlock on, Full is refused and the handle returns to the previous speed.

## Embed

```html
<script src="engine-telegraph.js" defer></script>
<engine-telegraph manual></engine-telegraph>
```

Four fixed modes: Standby, Idle, Cruise, Full. Their display speeds are 0, 800, 2400 and 3600 RPM. These are illustrative targets, not measured telemetry. The rotor and bar strip are decorative. This version replaces the earlier plan-switcher API; it does not support configurable options.

With `manual`, listen for `order` and call the request's own `confirm()` or `reject(message)` after your application replies. `event.detail` includes `id`, `index`, `label` and an AbortSignal. Cancel obsolete work when that signal is aborted. Stale callbacks are ignored, including a repeated A-B-A selection. UI cancellation cannot undo work already performed by a server: applications must enforce their own request ordering.

```js
const engine = document.querySelector('engine-telegraph');
engine.addEventListener('order', event => {
  const {confirm, signal} = event.detail;
  // Example only: replace this timer with your application's operation.
  const timer = setTimeout(confirm, 900);
  signal.addEventListener('abort', () => clearTimeout(timer), {once: true});
});
engine.addEventListener('change', event => console.log(event.detail.index));
```

Without `manual`, the component automatically confirms after 900 ms. Set `reply-delay` to change this. No real network request is made. Repeating the pending selection does not restart or cancel its timer.

`change` fires on confirmation. `reject` includes the retained `index` and the rejected `requested` index. `cancel` fires when the user returns to the confirmed mode while waiting. Set `element.value = 2` or the `value` attribute to synchronize state without emitting an order. Removing the element invalidates pending callbacks and cancels its animation; reconnecting restores a non-pending state.

The component uses CSS, SVG and JavaScript. Reduced-motion preferences disable moving parts and interpolation. Tested in Chromium at desktop and 390px widths. Firefox, Safari and physical devices have not been tested. This is a UI experiment, not a controller for safety-critical equipment.

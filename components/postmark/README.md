# Postmark

A paper-folding send interaction for a contact form. Your note folds into thirds, slips into an envelope, gets sealed and turns over for its postmark. A paper receipt finishes the sequence.

Built with Codex for Ship Notes. HTML, CSS 3D and JavaScript, with a little inline SVG for the postal mark. No libraries, fonts to download or build step.

## Try it

Download `demo.html` and `postmark.js` into the same folder, then open `demo.html` in a modern browser. Edit the note and press Send this note. This demo simulates a successful response. It does not send email.

## Put it on your site

```html
<postmark-note id="note"></postmark-note>
<script src="postmark.js"></script>
```

Connect your existing send function:

```js
const note = document.querySelector('#note');
note.onSend = async message => {
  // Replace this with your existing application function.
  // It must resolve only after your server accepts the message.
  await sendMessageWithYourExistingService(message);
};
```

The component makes no network requests. A fulfilled callback starts the animation; a rejected callback or a returned `false` keeps the draft and shows an error. Check unsuccessful HTTP responses in your own handler before resolving it. A successful callback means accepted by your application, not delivered to an inbox. Do not put service credentials in browser code.

The message is plain text, limited to 1,200 characters. No email/address collection, persistence, spam protection or backend is included. Those belong to your application. The demo's message is sample copy; set `note.value` for your own starting text.

## API

| Member | Meaning |
| --- | --- |
| `onSend(message)` | Your asynchronous send handler; required |
| `value` | Read or replace the message as plain text |
| `send()` | Validate, wait for the handler, then animate |
| `reset()` | Reset the visual state, keep the draft and focus the input |
| `state` | `idle`, `pending`, `animating` or `sent` |
| `sendcomplete` | Bubbling event after the animation finishes |
| `senderror` | Bubbling event if the handler fails |
| `demo` attribute | Labels the simulation clearly; does not configure a handler |
| `pose(seconds)` | Deterministic visual pose for recordings, not a send operation |

Tab to the input or button. Ctrl+Enter or Cmd+Enter submits from the input. Native button keyboard controls work too. Pending sends block repeat submissions. Reduced-motion users get the result without the folding sequence. No animation plays on page load.

The full ceremony takes about six seconds after acceptance, so it suits a personal portfolio/contact experience more than a rapid-fire messaging app. Your integration must supply its own timeout and cancellation policy. Resetting the component cancels its animation, not an external request already in flight.

Tested in Chromium at desktop and 390px width. Other browsers have not been verified. The UI scales to its container; shadow DOM keeps the styles local. This is a visual component, not a complete contact-form service.

## License

MIT. Use it, change it, put it in a commercial project. Keep the license notice when redistributing the source.

Copyright (c) 2026 Ship Notes

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

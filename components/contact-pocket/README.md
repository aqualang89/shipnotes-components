# Contact Pocket

Open `demo.html`. The blue tab opens a contact card with links and an email-copy button.

```html
<script src="contact-pocket.js" defer></script>
<contact-pocket email="hello@example.com"
  github="https://github.com/YOUR-USERNAME"
  social="https://x.com/YOUR-USERNAME"
  website="https://example.com"></contact-pocket>
```

Replace the four attributes. The component uses Shadow DOM and has no dependencies. Set its parent width or `--cp-accent` to customize it.

Clipboard access requires a secure context, usually HTTPS or localhost, and browser permission. If copying fails, the address is selected for manual copying instead. Feedback says copied only after a successful write. Escape closes the card; hidden controls are inert. Reduced-motion preferences are respected.

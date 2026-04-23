# Chrome Capture

Capture any UI element from any website and reproduce it with ANY LLM (Claude, ChatGPT, Gemini, etc.).

![Chrome Capture on Stripe.com](docs/images/browser-full.png)

## Install (30 seconds)

1. Open [`dist/bookmarklet.txt`](dist/bookmarklet.txt) and copy everything (starts with `javascript:`)
2. Right-click your bookmarks bar → **Add page...**
3. Name it anything, paste as the **URL** → Save

That's it. No build, no extension, no dependencies.

## How to use

1. **Click the bookmark** on any page — a panel appears in the corner

![Chrome Capture panel](docs/images/widget-only.png)

2. **Click any element** to capture it — hover to preview what you'll get

![Capturing elements](docs/images/copy-from-any-site.png)

3. **Hit Copy**, paste into Claude, ChatGPT, Gemini, or any LLM — ask it to reproduce the component

![Paste into any LLM](docs/images/ask-any-llm-to-code.png)

### Tips

- **Esc** — stop picking
- **Alt+P** (Option+P on Mac) — toggle picker without clicking, keeps dropdowns/modals open
- **Mode toggle** (`all` / `structure` / `layout`) — click to cycle:
  - `all` — captures everything as-is (HTML, styles, CSS rules)
  - `structure` — strips text nodes and replaces complex inline SVGs with placeholders, keeping only the layout skeleton
  - `layout` — captures a spatial block tree of the entire subtree (just rectangles + names, no HTML/CSS). Click a container → get a geometry map → LLM builds a prototype with colored rectangles → you detail sections one by one
- **X** — remove individual captures before copying
- **Mixing modes** — you can capture some elements in `layout`, others in `all` or `structure` — each mode emits its own `<chrome-capture>` tag
- **Smaller is better** — the smaller the captured element, the more detail the LLM can work with. Start with `layout` on the whole page for the big picture, then capture individual components in `all` mode for full detail

## What gets captured

Clean HTML, computed styles, CSS rules with media queries, pseudo-states (`:hover`, `:focus`, etc.), CSS variables resolved to values, viewport context, accessibility data, and detected frameworks.

All the noise is stripped automatically: scripts, iframes, ads, trackers (Google/Facebook/Segment/Hotjar/etc.), framework internals (React/Vue/Angular/Svelte/Astro), inline event handlers, HTML comments.

See [docs/capture-format.md](docs/capture-format.md) for the full output spec.

## Limitations

- **CSP restrictions** — some sites (GitHub, Google) block bookmarklets. A Chrome extension would fix this.
- **Closed Shadow DOM** — elements inside closed shadow roots are not accessible.

## Development

```bash
npm run build
```

No external dependencies. Single file: `src/bookmarklet.js`.

## License

MIT

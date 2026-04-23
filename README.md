# Chrome Capture

Capture any UI element from any website as structured JSON. Paste into Claude, ChatGPT, Gemini, or any LLM to reproduce, analyze, or debug it.

![Chrome Capture on Stripe.com](docs/images/browser-full.png)

## Install (30 seconds)

1. Open [`dist/bookmarklet.txt`](dist/bookmarklet.txt) and copy everything (starts with `javascript:`)
2. Right-click your bookmarks bar → **Add page...**
3. Name it anything, paste as the **URL** → Save

No build, no extension, no dependencies.

## How to use

1. **Click the bookmark** on any page — a panel appears in the corner

![Chrome Capture panel](docs/images/widget-only.png)

2. **Click any element** to capture it — hover to preview what you'll get

![Capturing elements](docs/images/copy-from-any-site.png)

3. **Hit Copy**, paste into any LLM — ask it to reproduce the component

![Paste into any LLM](docs/images/ask-any-llm-to-code.png)

4. **Layout mode** — switch to `layout`, click a container to get the page structure, then ask the LLM to build a prototype

![Layout mode with Gemini](docs/images/gemini-example.png)

### Keyboard shortcuts

- **Esc** — stop picking
- **Alt+P** on Windows/Linux, **Option+P** on Mac — toggle picker without stealing focus (keeps dropdowns open)

## Three modes

| Mode | Output | Use for |
|------|--------|---------|
| `all` | HTML + styles + CSS rules + tokens + accessibility | Reproducing a component exactly |
| `structure` | HTML skeleton, no text, SVG placeholders | Understanding layout without noise |
| `layout` | Spatial block tree (rectangles + names) | Page-level prototyping, wireframes |

Mix modes freely — each emits its own `<chrome-capture>` tag.

## What it does

Captures clean HTML, computed styles, CSS rules with pseudo-states and media queries, CSS variable tokens, XPath, viewport context, accessibility data, developer hints (`data-testid`, `data-cy`), loaded fonts, landmark context, and element relationships.

Strips scripts, iframes, ads, trackers, framework internals (React/Vue/Angular/Svelte/Astro), Google JS attributes, event handlers, HTML comments, and base64 images.

Detects: Vue, React, Next.js, Nuxt, Angular, Svelte, jQuery, Tailwind, Bootstrap.

Full format spec: [docs/capture-format.md](docs/capture-format.md)

## Limitations

- **CSP** — some sites (GitHub, Google) block bookmarklets
- **Closed Shadow DOM** — not accessible
- **Cross-origin CSS** — re-fetched via `fetch()` if CORS allows, skipped otherwise

## Development

```bash
npm run build
```

No external dependencies. No strings attached.

## License

MIT

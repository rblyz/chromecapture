# Chrome Capture

Capture web elements with their computed styles and CSS rules, formatted for LLM-powered design reproduction.

**The problem:** You see a UI component on a website and want to reproduce it in your project. Copying HTML from DevTools gives you a mess of framework classes, minified CSS, and irrelevant markup. Chrome Capture extracts exactly what an LLM needs — the element's HTML structure, its final computed styles (not the raw CSS cascade), and matching CSS rules — in a compact, structured format.

**How it works:**
1. Click the bookmarklet on any page
2. Click elements to capture them — a highlight overlay shows what you'll get
3. Hit "Copy" and paste into Claude Code, ChatGPT, or any LLM
4. Ask the LLM to reproduce the component in your framework/design system

## Install

1. Run the build:

```bash
npm run build
```

2. Copy the contents of `dist/bookmarklet.txt`
3. Create a new bookmark in Chrome, paste the contents as the URL

Or manually: copy `dist/bookmarklet.txt` → New Bookmark → paste into URL field.

## Usage

Click the bookmarklet on any page. A panel appears in the bottom-right corner:

- **Pick mode** (default): hover over elements to see a highlight, click to capture
- **Esc**: stop picking
- **Copy**: copies all captures to clipboard wrapped in `<chrome-capture>` tags
- **X on items**: remove individual captures
- **Close (x)**: removes the panel entirely

### Example prompt

```
Here are the UI elements I want to reproduce:

<chrome-capture>[...paste here...]</chrome-capture>

Recreate these components using React + Tailwind CSS, matching the visual
appearance as closely as possible.
```

## Features

- **Cross-origin CSS fetching** — automatically fetches and injects stylesheets blocked by CSSOM CORS restrictions, so `cssRules` works on most sites even with external CSS
- **Pseudo-state capture** — detects `:hover`, `:focus`, `:active`, `:disabled` and other state-based CSS rules, tagged with a `"states"` field so the LLM knows which styles apply to which interaction state
- **Smart filtering** — strips universal selectors (`*`), Tailwind CSS variable resets, `prefers-reduced-motion` rules, and deduplicates identical rules to keep output compact
- **Responsive breakpoints** — preserves `@media` queries so the LLM can reproduce adaptive layouts
- **CSS variable resolution** — resolves `var(--token)` to actual values (e.g. `var(--color-17)` → `#f74068`), keeping token names in `css` and resolved values in `cssResolved`
- **Semantics & accessibility** — captures `role`, `accessibleName`, `aria-*` states, `formAction`, `formMethod`, and form fields when present (only added when non-empty)
- **HTML sanitization** — strips `<script>`, `<iframe>`, ads, tracking attributes from `outerHTML`, keeping only design-relevant markup

## Output Format

See [docs/capture-format.md](docs/capture-format.md) for the full specification.

Each capture includes:
- `outerHTML` — full DOM structure
- `computedStyles` — only non-default CSS properties (compact, no noise)
- `cssRules` — matching stylesheet rules with media queries and pseudo-states
- `rect` — bounding box dimensions
- `semantics` — accessible name, ARIA states, form context (when present)
- Page context (`url`, `title`, `timestamp`)

## Limitations

- **CSP restrictions**: Some sites (GitHub, Google, etc.) block inline scripts via Content-Security-Policy. The bookmarklet won't work on these sites. A Chrome extension version would bypass this.
- **Opaque CORS responses**: If a CDN blocks `fetch()` too (not just CSSOM), those rules remain inaccessible. Computed styles still work.
- **Shadow DOM**: Elements inside closed shadow roots are not accessible.

## Development

```bash
# Edit src/bookmarklet.js, then rebuild:
npm run build

# Output files:
# dist/bookmarklet.txt  — the javascript: URI to use as bookmark
# dist/bookmarklet.min.js — minified JS (for debugging)
```

The build script (`src/build.js`) strips comments, collapses whitespace, and URL-encodes the result. No external dependencies.

## License

MIT

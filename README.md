# Chrome Capture

Capture web elements with their computed styles, CSS rules, and semantics — formatted for LLM-powered design reproduction.

**The problem:** You see a UI component on a website and want to reproduce it in your project. Copying HTML from DevTools gives you a mess of framework classes, minified CSS, and irrelevant markup. Chrome Capture extracts exactly what an LLM needs — clean HTML structure, resolved styles, interaction states, and accessibility data — in a compact, structured format.

**How it works:**
1. Click the bookmarklet on any page
2. Click elements to capture them — a red highlight overlay shows what you'll get
3. Hit "Copy" and paste into Claude Code, ChatGPT, or any LLM
4. Ask the LLM to reproduce the component in your framework/design system

## Install

```bash
npm run build
```

Copy `dist/bookmarklet.txt` → create a new bookmark in Chrome → paste as URL.

## Usage

A panel appears in the bottom-right corner:

- **Pick mode** (default): hover to highlight, click to capture
- **Esc**: stop picking
- **Alt+P** (Option+P on Mac): toggle picker without clicking — keeps dropdowns/modals open
- **Mode toggle** (`all` / `structure`): switch capture mode in the header
- **Copy**: copies all captures wrapped in `<chrome-capture>` tags
- **X**: remove individual captures

Each captured element shows: `[tag] [mode] word-count dimensions`.

### Capture modes

| Mode | What's captured | Use case |
|------|----------------|----------|
| **all** | Full HTML with text, all SVGs | Design reproduction, content cloning |
| **structure** | HTML skeleton, no text nodes, complex SVGs replaced with `<svg data-placeholder="svg"/>` | Layout analysis, component structure |

Mode is stored per-capture — you can mix both in one session.

### Example prompt

```
Here are the UI elements I want to reproduce:

<chrome-capture frameworks="Vue">[...paste here...]</chrome-capture>

Recreate these components using React + Tailwind CSS, matching the visual
appearance as closely as possible.
```

## Features

- **Two capture modes** — `all` (full content) and `structure` (skeleton only, no text, simplified SVGs). Each capture stores its mode independently
- **Cross-origin CSS** — fetches external stylesheets via `fetch()` to bypass CSSOM CORS restrictions
- **Pseudo-state capture** — detects `:hover`, `:focus`, `:active`, `:disabled` CSS rules, tagged with `"states"` field
- **CSS variable resolution** — resolves `var(--token)` to computed values (e.g. `var(--color-17)` → `#f74068`), keeping both token name and resolved value
- **Framework detection** — auto-detects Vue, React, Next.js, Nuxt, Angular, Svelte, jQuery, Tailwind, Bootstrap. Added as `<chrome-capture frameworks="...">` attribute
- **Semantics & accessibility** — captures `role`, `accessibleName`, ARIA states, `formAction`, `formMethod`, form field inventory
- **Smart HTML sanitization**:
  - Strips `<script>`, `<iframe>`, `<noscript>`, ads (`adsbygoogle`)
  - Removes all ~70 inline event handlers (`on*` attributes)
  - Strips tracker data-attributes (Google, GTM, Facebook, Segment, Amplitude, Mixpanel, Hotjar, Heap, Intercom, Pendo, Clarity)
  - Strips framework internals (Astro island props, `data-astro-cid-*`, `data-v-*`, `data-hk`, `_ng*`, `data-svelte*`, `data-reactid`, etc.)
  - Removes HTML comments (`<!--v-if-->` etc.)
  - Excludes Chrome Capture's own panel from output
- **Smart CSS filtering** — strips universal selectors, Tailwind resets, `prefers-reduced-motion`, deduplicates rules
- **Responsive breakpoints** — preserves `@media` queries

## Output Format

See [docs/capture-format.md](docs/capture-format.md) for the full specification.

Each capture includes:
- `mode` — `"all"` or `"structure"`
- `outerHTML` — sanitized DOM structure
- `computedStyles` — only non-default CSS properties
- `cssRules` — matching rules with media queries, pseudo-states, resolved CSS variables
- `rect` — bounding box dimensions
- `semantics` — accessible name, ARIA states, form context (when present)
- Page context (`url`, `title`, `timestamp`)

## Limitations

- **CSP restrictions**: Some sites (GitHub, Google) block inline scripts via Content-Security-Policy. A Chrome extension version would bypass this.
- **Opaque CORS responses**: If a CDN blocks `fetch()` too (not just CSSOM), those rules remain inaccessible. Computed styles still work.
- **Shadow DOM**: Elements inside closed shadow roots are not accessible.

## Development

```bash
npm run build

# Output:
# dist/bookmarklet.txt    — javascript: URI for bookmark
# dist/bookmarklet.min.js — minified JS for debugging
```

No external dependencies.

## License

MIT

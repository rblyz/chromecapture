# Capture Format Specification

Chrome Capture outputs a JSON array wrapped in `<chrome-capture>` tags:

```
<chrome-capture frameworks="React, Tailwind">[...elements...]</chrome-capture>
```

The `frameworks` attribute lists auto-detected frameworks on the page (Vue, React, Next.js, Nuxt, Angular, Svelte, jQuery, Tailwind, Bootstrap). Omitted if none detected.

## Element Schema

Each captured element is a JSON object:

| Field | Type | Always present | Description |
|-------|------|:-:|-------------|
| `mode` | `string` | yes | `"all"` (full content) or `"structure"` (skeleton, no text) |
| `selector` | `string` | yes | Approximate CSS selector (`tag#id`, `tag.class`, or `tag`) |
| `tag` | `string` | yes | HTML tag name (lowercase) |
| `url` | `string` | yes | Page URL where element was captured |
| `title` | `string` | yes | Page title |
| `timestamp` | `string` | yes | ISO 8601 timestamp |
| `innerText` | `string` | yes | Text content of the element |
| `outerHTML` | `string` | yes | Sanitized HTML including children |
| `rect` | `object` | yes | Bounding box `{ x, y, width, height }` in px |
| `computedStyles` | `object` | yes | Key-value map of non-default computed CSS properties |
| `cssRules` | `array` | yes | Matching CSS rules from stylesheets |
| `viewport` | `object` | yes | Viewport context (see below) |
| `semantics` | `object` | no | Accessibility data (see below) |
| `pseudoElements` | `object` | no | Computed styles for `::before` / `::after` |
| `loadedFonts` | `array` | no | Font families used by the element that are loaded on the page |

### `computedStyles`

Only properties that differ from browser defaults are included. This keeps the output compact while preserving everything an LLM needs to reproduce the visual appearance.

Tracked properties: layout (`display`, `position`, `flex-*`, `grid-*`), sizing (`width`, `height`, `margin`, `padding`), visual (`background`, `color`, `border`, `border-radius`, `box-shadow`, `opacity`), typography (`font-*`, `line-height`, `letter-spacing`, `text-*`), and behavior (`overflow`, `z-index`, `transform`, `transition`, `cursor`).

### `cssRules`

Each entry:

```json
{
  "selector": ".btn:hover",
  "css": "background: var(--color-primary); color: #fff",
  "cssResolved": "background: #D97757; color: #fff",
  "media": "@media (min-width: 768px)",
  "states": ["hover"]
}
```

| Field | Always present | Description |
|-------|:-:|-------------|
| `selector` | yes | CSS selector text |
| `css` | yes | Rule body as written in the stylesheet |
| `cssResolved` | no | Same as `css` but with `var(--*)` resolved to computed values. Only present when `css` contains CSS variables |
| `media` | no | `@media` or `@supports` condition |
| `states` | no | Pseudo-class states this rule applies to (e.g. `["hover", "focus"]`). Present when the rule targets a state the element isn't currently in |

Rules are collected from all accessible stylesheets. Cross-origin stylesheets are fetched via `fetch()` and injected as `<style>` to bypass CSSOM CORS restrictions. Rules are deduplicated and junk-filtered (universal selectors, Tailwind resets, `prefers-reduced-motion`).

### `viewport`

```json
{
  "width": 1440,
  "height": 900,
  "mode": "desktop",
  "activeMedia": ["@media (min-width: 768px)"],
  "inactiveMedia": ["@media (max-width: 767px)"]
}
```

| Field | Always present | Description |
|-------|:-:|-------------|
| `width`, `height` | yes | `window.innerWidth` / `innerHeight` in px |
| `mode` | yes | `"mobile"` (<768), `"tablet"` (768-1023), or `"desktop"` (1024+) |
| `activeMedia` | no | Media queries from this element's CSS rules that currently match |
| `inactiveMedia` | no | Media queries that don't currently match |

### `semantics`

Present only when accessibility-relevant data exists on the element.

| Field | Description |
|-------|-------------|
| `role` | Explicit ARIA role |
| `accessibleName` | Computed accessible name |
| `disabled`, `checked`, `required`, `readOnly` | Interactive states (only when true) |
| `ariaHidden` | `true` when `aria-hidden="true"` |
| `ariaExpanded` | Boolean, from `aria-expanded` |
| `ariaPressed` | Value of `aria-pressed` |
| `formAction`, `formMethod` | From closest `<form>` or element's own `formAction` |
| `formFields` | Array of form field descriptors (up to 20): `{ tag, type, name, label }` |

### `pseudoElements`

Present only when `::before` or `::after` have non-empty `content`.

```json
{
  "::before": {
    "content": "\"→\"",
    "color": "rgb(0, 0, 0)",
    "font-size": "16px"
  }
}
```

### `loadedFonts`

Array of font family names that are both declared in the element's `font-family` and loaded via the Font Loading API. Example: `["Inter", "Roboto"]`.

## Why This Format?

1. **`<chrome-capture>` tags** — act as a sentinel so LLMs can reliably detect and parse the captured data in a conversation
2. **Computed styles over raw CSS** — raw stylesheets have cascading, specificity, and inheritance; computed styles show the final resolved values the browser actually uses
3. **CSS rules included too** — provide semantic context (class names, selectors, media queries) that computed styles alone don't carry
4. **`outerHTML` preserved** — lets the LLM see the actual DOM structure, attributes, and children
5. **Non-default filtering** — removes noise from hundreds of default CSS values, keeping only what defines the element's unique appearance

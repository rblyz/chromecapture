# Capture Format Specification

Chrome Capture outputs JSON wrapped in `<chrome-capture>` tags. The tag acts as a sentinel so LLMs can reliably detect captured data in a conversation.

There are two output shapes depending on mode:

```
<chrome-capture frameworks="React,Tailwind">{...envelope with elements[]...}</chrome-capture>
<chrome-capture mode="layout" frameworks="Vue">{...envelope with layouts[]...}</chrome-capture>
```

The `frameworks` attribute lists auto-detected frameworks (Vue, React, Next.js, Nuxt, Angular, Svelte, jQuery, Tailwind, Bootstrap). Omitted if none detected.

Mixed captures (some elements in `all`/`structure`, some in `layout`) produce multiple `<chrome-capture>` tags concatenated.

---

## Envelope (all / structure modes)

Page-level fields are hoisted to the envelope — not repeated per element.

```json
{
  "url": "https://example.com/page",
  "title": "Page Title",
  "timestamp": "2026-04-23T14:15:43.468Z",
  "viewport": { ... },
  "relationships": [ ... ],
  "elements": [ ... ],
  "cssRules": [ ... ]
}
```

| Field | Type | Always present | Description |
|-------|------|:-:|-------------|
| `url` | `string` | yes | Page URL |
| `title` | `string` | yes | Page title |
| `timestamp` | `string` | yes | ISO 8601 capture time |
| `viewport` | `object` | yes | Viewport context (see below) |
| `relationships` | `array` | no | DOM and spatial relationships between captured elements (see below) |
| `elements` | `array` | yes | Array of captured element objects |
| `cssRules` | `array` | no | Deduplicated CSS rule pool (see below) |

### CSS rule deduplication

When multiple elements share the same CSS rules, rules are stored once in the top-level `cssRules[]` array. Each element references its rules by index:

```json
{
  "elements": [
    { "selector": "button.primary", "cssRuleRefs": [0, 1, 3], ... },
    { "selector": "button.secondary", "cssRuleRefs": [0, 2, 3], ... }
  ],
  "cssRules": [
    { "selector": ".btn", "css": "padding: 8px 16px" },
    { "selector": ".btn.primary", "css": "background: #7C3AED" },
    { "selector": ".btn.secondary", "css": "background: #E5E7EB" },
    { "selector": ".btn:hover", "css": "opacity: 0.9", "states": ["hover"] }
  ]
}
```

If only one element is captured, `cssRuleRefs` may still be used. If no rules match, `cssRules` is omitted from the envelope entirely.

---

## Element Schema

Each object in `elements[]`:

| Field | Type | Always present | Description |
|-------|------|:-:|-------------|
| `mode` | `string` | yes | `"all"` or `"structure"` |
| `selector` | `string` | yes | Approximate CSS selector (`tag#id`, `tag.class`, or `tag`) |
| `xpath` | `string` | yes | XPath to the element. Stops at nearest `id` ancestor (e.g. `/header[@id="header"]/div[1]/button[2]`) |
| `tag` | `string` | yes | HTML tag name (lowercase) |
| `landmark` | `string` | no | Nearest landmark ancestor: `header`, `nav`, `main`, `aside`, `footer`, `section`, `article` |
| `innerText` | `string` | yes | Text content (truncated at 3000 chars with `… [truncated]`). In `structure` mode this comes from the original element (before text node removal) |
| `outerHTML` | `string` | yes | Sanitized HTML (see sanitization below) |
| `rect` | `object` | yes | Bounding box `{ x, y, width, height }` in viewport px |
| `computedStyles` | `object` | yes | Non-default computed CSS properties |
| `cssRuleRefs` | `array` | no | Indices into the envelope's `cssRules[]` pool |
| `tokens` | `object` | no | CSS variable dictionary: `{ "--color-primary": "#7413dc" }`. Collected from `var()` references in matched CSS rules |
| `semantics` | `object` | no | Accessibility and form data (see below) |
| `pseudoElements` | `object` | no | Computed styles for `::before` / `::after` |
| `loadedFonts` | `array` | no | Font families used by the element that are actually loaded on the page |

### `computedStyles`

Only properties that differ from browser defaults. Keeps the output compact while preserving what matters for reproduction.

Tracked properties: layout (`display`, `position`, `flex-*`, `grid-*`), sizing (`width`, `height`, `margin`, `padding`), visual (`background`, `color`, `border`, `border-radius`, `box-shadow`, `opacity`), typography (`font-*`, `line-height`, `letter-spacing`, `text-*`), and behavior (`overflow`, `z-index`, `transform`, `transition`, `cursor`, `object-fit`).

### `cssRules[]` entries

Each rule in the pool:

```json
{
  "selector": ".btn:hover",
  "css": "background: var(--color-primary); color: #fff",
  "cssResolved": "background: #D97757; color: #fff",
  "media": "(min-width: 768px)",
  "states": ["hover"]
}
```

| Field | Always present | Description |
|-------|:-:|-------------|
| `selector` | yes | CSS selector text |
| `css` | yes | Rule body as written in the stylesheet |
| `cssResolved` | no | `css` with `var(--*)` resolved to computed values. Only when CSS variables are present |
| `media` | no | `@media` or `@supports` condition string |
| `states` | no | Pseudo-class states (`["hover", "focus"]`). Present when the rule targets a state the element isn't currently in |

Rules are collected from all accessible stylesheets. Stylesheets that throw `SecurityError` on `.cssRules` access are re-fetched via `fetch()` and injected as inline `<style>` — this works for any CDN that serves CORS headers. Rules are deduplicated and junk-filtered (universal selectors, Tailwind variable resets, `prefers-reduced-motion`).

### `tokens`

A dictionary of CSS custom properties referenced by the element's matched CSS rules, resolved to their computed values:

```json
{
  "--color-57": "#7413dc",
  "--font-size-sm": "12px",
  "--spacing-4": "16px"
}
```

Collected during `var()` resolution — no extra DOM traversal. Shows the element's design token palette at a glance. Only present when CSS rules contain `var()` references.

### `viewport`

```json
{
  "width": 1440,
  "height": 900,
  "mode": "desktop",
  "activeMedia": ["(min-width: 768px)", "(hover: hover)"],
  "inactiveMedia": ["(max-width: 767px)"]
}
```

| Field | Always present | Description |
|-------|:-:|-------------|
| `width`, `height` | yes | `window.innerWidth` / `innerHeight` in px |
| `mode` | yes | `"mobile"` (<768), `"tablet"` (768-1023), or `"desktop"` (1024+) |
| `activeMedia` | no | Media queries from captured elements' CSS rules that currently match |
| `inactiveMedia` | no | Media queries that exist in CSS but don't currently match |

Media queries are merged across all captured elements — `activeMedia` and `inactiveMedia` are deduplicated sets.

### `semantics`

Present only when accessibility-relevant data exists on the element.

| Field | Description |
|-------|-------------|
| `role` | Explicit ARIA role |
| `accessibleName` | Computed from: `aria-labelledby` → `aria-label` → `alt` → `title` → `label[for]` → `placeholder` → `textContent` (if ≤80 chars) |
| `disabled`, `checked`, `required`, `readOnly` | Interactive states (only when true) |
| `ariaHidden` | `true` when `aria-hidden="true"` |
| `ariaExpanded` | Boolean, from `aria-expanded` |
| `ariaPressed` | Value of `aria-pressed` |
| `formAction`, `formMethod` | From closest `<form>` or element's own `formAction` |
| `formFields` | Array of form field descriptors (up to 20): `{ tag, type, name, placeholder, label, required }` |
| `hints` | Developer-assigned data attributes: `data-testid`, `data-test-id`, `data-test`, `data-cy`, `data-qa`, `data-atid`, `data-analytics-name`. Stored as `{ "testid": "search-submit", "atid": "nav-config" }` (with `data-` prefix stripped) |

### `pseudoElements`

Present only when `::before` or `::after` have non-empty `content`.

```json
{
  "::before": {
    "content": "\"\\2192\"",
    "color": "rgb(0, 0, 0)",
    "font-size": "16px"
  }
}
```

Properties tracked: `content`, `display`, `position`, `top`, `right`, `bottom`, `left`, `width`, `height`, `background`, `color`, `font-size`, `font-family`, `border`, `border-radius`. Only non-default values included.

### `loadedFonts`

Array of font family names that are both declared in the element's `font-family` and confirmed loaded via the Font Loading API. Example: `["Inter", "Roboto"]`.

### `relationships`

Present when 2+ elements are captured. Describes how they relate in the DOM and spatially.

```json
[
  {
    "elements": [0, 1],
    "dom": "parent-child",
    "spatial": "above"
  },
  {
    "elements": [0, 2],
    "dom": "siblings",
    "spatial": "left-of"
  }
]
```

| Field | Description |
|-------|-------------|
| `elements` | Pair of indices into `elements[]` |
| `dom` | `"parent-child"`, `"child-parent"`, or `"siblings"`. Omitted if elements are unrelated in DOM |
| `spatial` | `"above"`, `"below"`, `"left-of"`, `"right-of"`, or `"overlaps"` (20px tolerance) |

---

## Envelope (layout mode)

Layout mode captures a spatial block tree — rectangles with names and positions, no HTML or CSS. Designed for page-level prototyping.

```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "timestamp": "2026-04-23T14:18:53.495Z",
  "viewport": { "width": 1440, "height": 900, "mode": "desktop" },
  "layouts": [ ... ]
}
```

### `layouts[]` entries

Each layout capture:

```json
{
  "selector": "div.page-wrapper",
  "tag": "div",
  "rect": { "x": 0, "y": 0, "width": 1440, "height": 3200 },
  "tree": { ... }
}
```

### Layout tree nodes

The `tree` is a recursive structure. Each node:

```json
{
  "tag": "div",
  "name": ".sidebar",
  "rect": { "x": 0, "y": 73, "width": 280, "height": 900 },
  "children": [ ... ],
  "repeat": 12
}
```

| Field | Always present | Description |
|-------|:-:|-------------|
| `tag` | yes | HTML tag name |
| `name` | yes | Human-readable label: `role` → `aria-label` → `#id` → `.first-class` → `tag` |
| `rect` | yes | Position and size relative to the captured root element (not viewport) |
| `children` | no | Child nodes |
| `repeat` | no | When 3+ consecutive siblings have the same tag, class, and dimensions, only the first is walked. `repeat` indicates how many actual siblings exist |

**Tree construction rules:**

- Max depth: 8 levels
- Max nodes: 500
- Min size: 20px (both width and height) — smaller elements are skipped
- Hidden elements (`display: none`, `visibility: hidden`, zero-size) are skipped
- SVGs are treated as opaque leaf nodes (tag `svg`, name from `aria-label` or `"icon"`)
- Inline text elements (`span`, `a`, `em`, etc.) without children are skipped unless they're large (>100px wide or >40px tall)
- Single-child chains are collapsed: if a node has exactly one child with similar dimensions (within 10px), the parent is dropped and the child takes its place

---

## HTML sanitization

The `outerHTML` field is cleaned before output:

**Removed elements:** `script`, `iframe`, `noscript`, `ins.adsbygoogle`, ad containers, resize sensors, non-chromecap `<style>` tags, and the Chrome Capture panel itself (detected by z-index).

**Removed attributes:**
- Inline event handlers (`onclick`, `onmouseover`, etc.)
- Tracker data attributes: `data-ad-*`, `data-google-*`, `data-gtm-*`, `data-fb-*`, `data-analytics-*`, `data-track-*`, `data-segment-*`, `data-amplitude-*`, `data-mixpanel-*`, `data-hj-*`, `data-hotjar-*`, `data-heap-*`, `data-intercom-*`, `data-pendo-*`, `data-clarity-*`, `data-ga-*`
- Framework internals: `data-astro-cid-*`, `data-v-*`, `data-reactid`, `data-reactroot`, `data-svelte-*`, `ng-reflect-*`, and similar

**Replaced in HTML:** base64 data URIs in `src` attributes are replaced with `data:image/type;base64,[truncated, WxH]` preserving MIME type and dimensions from element attributes.

**Removed from HTML string:** all HTML comments (`<!-- ... -->`)

**Structure mode additionally:** removes all text nodes and replaces large SVGs (>500 chars) with placeholder `<svg>` elements retaining only `width`, `height`, `viewBox`, `class`, `aria-label`, and `aria-hidden`.

---

## Design decisions

1. **Envelope with hoisted fields** — `url`, `title`, `timestamp`, `viewport` are page-level facts, not per-element. Hoisting avoids repetition and makes the data model honest.

2. **CSS rule pool with refs** — a page with 50 CSS rules might match 20 of them across 5 captured elements. Without deduplication, those 20 rules get serialized 5 times. The pool stores each rule once; elements carry integer refs.

3. **Computed styles + CSS rules** — computed styles show the final resolved values the browser uses. CSS rules show the semantic context (class names, media queries, pseudo-states). Both are needed: computed for accuracy, rules for understanding responsive/interactive behavior.

4. **Non-default filtering** — browsers compute ~300 CSS properties per element, most at their default values. Only non-default values are included, cutting noise by ~90%.

5. **`<chrome-capture>` sentinel tags** — plain JSON in a conversation is ambiguous. The tag makes it unambiguous: this is captured UI data, not user text.

6. **LLM instruction hint** — a short instruction string is prepended to the JSON inside the tag. It guides the LLM on common tasks without requiring the user to write a prompt from scratch.

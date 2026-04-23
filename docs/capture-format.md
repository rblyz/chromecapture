# Capture Format Specification

Output is JSON wrapped in `<chrome-capture>` tags:

```
<chrome-capture frameworks="React,Tailwind">{...envelope...}</chrome-capture>
<chrome-capture mode="layout" frameworks="Vue">{...envelope...}</chrome-capture>
```

`frameworks` attribute: auto-detected frameworks (Vue, React, Next.js, Nuxt, Angular, Svelte, jQuery, Tailwind, Bootstrap). Omitted if none.

Mixed captures (some `all`/`structure`, some `layout`) produce multiple tags.

---

## Envelope (all / structure)

Page-level fields are hoisted — not repeated per element.

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

| Field | Type | Present | Description |
|-------|------|:-:|-------------|
| `url` | `string` | always | Page URL |
| `title` | `string` | always | Page title |
| `timestamp` | `string` | always | ISO 8601 |
| `viewport` | `object` | always | See below |
| `relationships` | `array` | 2+ elements | DOM + spatial relationships between elements |
| `elements` | `array` | always | Captured elements |
| `cssRules` | `array` | when rules exist | Deduplicated CSS rule pool |

### CSS rule deduplication

Rules shared across elements are stored once in the top-level `cssRules[]`. Elements reference them by index:

```json
{
  "elements": [
    { "selector": "button.primary", "cssRuleRefs": [0, 1, 3] },
    { "selector": "button.secondary", "cssRuleRefs": [0, 2, 3] }
  ],
  "cssRules": [
    { "selector": ".btn", "css": "padding: 8px 16px" },
    { "selector": ".btn.primary", "css": "background: #7C3AED" },
    { "selector": ".btn.secondary", "css": "background: #E5E7EB" },
    { "selector": ".btn:hover", "css": "opacity: 0.9", "states": ["hover"] }
  ]
}
```

---

## Element

Each object in `elements[]`:

| Field | Type | Present | Description |
|-------|------|:-:|-------------|
| `mode` | `string` | always | `"all"` or `"structure"` |
| `selector` | `string` | always | CSS selector with `:nth-of-type` when needed for uniqueness |
| `xpath` | `string` | always | XPath, stops at nearest `id` (e.g. `/header[@id="header"]/div[1]/button[2]`) |
| `tag` | `string` | always | Tag name |
| `landmark` | `string` | when found | Nearest landmark ancestor: `header`, `nav`, `main`, `aside`, `footer`, `section`, `article` |
| `innerText` | `string` | always | Text content, truncated at 3000 chars. In `structure` mode: from original element before text removal |
| `outerHTML` | `string` | always | Sanitized HTML |
| `rect` | `object` | always | `{ x, y, width, height }` in viewport px |
| `computedStyles` | `object` | always | Non-default computed CSS |
| `cssRuleRefs` | `array` | when rules match | Indices into envelope `cssRules[]` |
| `tokens` | `object` | when vars exist | CSS variable dictionary: `{ "--color-primary": "#7413dc" }` |
| `semantics` | `object` | when data exists | Accessibility, forms, developer hints |
| `pseudoElements` | `object` | when exist | `::before` / `::after` computed styles |
| `loadedFonts` | `array` | when detected | Actually loaded font families |

### `computedStyles`

Only non-default values. Tracked: `display`, `position`, `top/right/bottom/left`, `width`, `height`, `margin`, `padding`, `border`, `border-radius`, `box-sizing`, `box-shadow`, `background`, `color`, `opacity`, `font-*`, `line-height`, `letter-spacing`, `text-*`, `white-space`, `flex-*`, `justify-content`, `align-items`, `align-self`, `gap`, `grid-*`, `overflow`, `z-index`, `transform`, `transition`, `cursor`, `object-fit`.

### `cssRules[]` entries

```json
{
  "selector": ".btn:hover",
  "css": "background: var(--color-primary)",
  "cssResolved": "background: #D97757",
  "media": "(min-width: 768px)",
  "states": ["hover"]
}
```

- `css` — as written in the stylesheet
- `cssResolved` — with `var()` resolved. Only when variables present
- `media` — `@media` / `@supports` condition
- `states` — pseudo-class states the rule targets (e.g. `["hover", "focus"]`)

Stylesheets that throw `SecurityError` are re-fetched via `fetch()` (works when CDN serves CORS headers). Rules are deduplicated and junk-filtered (universal selectors, Tailwind resets, `prefers-reduced-motion`).

### `tokens`

CSS variables referenced by matched rules, resolved to computed values:

```json
{ "--color-57": "#7413dc", "--spacing-4": "16px" }
```

Collected during `var()` resolution — no extra traversal.

### `viewport`

```json
{
  "width": 1440, "height": 900, "mode": "desktop",
  "activeMedia": ["(min-width: 768px)"],
  "inactiveMedia": ["(max-width: 767px)"]
}
```

`mode`: `"mobile"` (<768), `"tablet"` (768-1023), `"desktop"` (1024+). Media queries merged and deduplicated across elements.

### `semantics`

| Field | Description |
|-------|-------------|
| `role` | Explicit ARIA role |
| `accessibleName` | `aria-labelledby` → `aria-label` → `alt` → `title` → `label[for]` → `placeholder` → `textContent` (≤80 chars) |
| `disabled`, `checked`, `required`, `readOnly` | When true |
| `ariaHidden`, `ariaExpanded`, `ariaPressed` | ARIA states |
| `formAction`, `formMethod` | From closest `<form>` |
| `formFields` | Up to 20 fields: `{ tag, type, name, placeholder, label, required }` |
| `hints` | Developer data-attributes: `data-testid`, `data-test-id`, `data-test`, `data-cy`, `data-qa`, `data-atid`, `data-analytics-name` — stored with `data-` stripped |

### `pseudoElements`

When `::before`/`::after` have non-empty `content`. Tracks: `content`, `display`, `position`, `top/right/bottom/left`, `width`, `height`, `background`, `color`, `font-size`, `font-family`, `border`, `border-radius`.

### `relationships`

Between each pair of captured elements:

```json
{ "elements": [0, 1], "dom": "parent-child", "spatial": "above" }
```

- `dom`: `"parent-child"`, `"child-parent"`, `"siblings"`, or omitted
- `spatial`: `"above"`, `"below"`, `"left-of"`, `"right-of"`, `"overlaps"` (20px tolerance)

---

## Envelope (layout)

Spatial block tree — rectangles with names, no HTML/CSS.

```json
{
  "url": "...", "title": "...", "timestamp": "...",
  "viewport": { "width": 1440, "height": 900, "mode": "desktop" },
  "layouts": [
    { "selector": "div.wrapper", "tag": "div", "rect": { ... }, "tree": { ... } }
  ]
}
```

### Tree nodes

```json
{ "tag": "div", "name": ".sidebar", "rect": { "x": 0, "y": 73, "width": 280, "height": 900 }, "children": [...], "repeat": 12 }
```

- `name`: `role` → `aria-label` → `#id` → `.first-class` → `tag`
- `rect`: relative to captured root
- `repeat`: 3+ identical consecutive siblings collapsed to first + count

**Limits:** max depth 8, max nodes 500, min size 20px. Hidden elements skipped. SVGs treated as leaf nodes. Single-child chains collapsed when dimensions match within 10px.

---

## HTML sanitization

**Removed elements:** `script`, `iframe`, `noscript`, ad containers, resize sensors, non-chromecap `<style>`, the capture panel itself.

**Removed attributes:** `on*` handlers, tracker attrs (`data-ad-*`, `data-google-*`, `data-gtm-*`, `data-fb-*`, `data-analytics-*`, `data-track-*`, `data-segment-*`, `data-amplitude-*`, `data-mixpanel-*`, `data-hj-*`, `data-heap-*`, `data-intercom-*`, `data-pendo-*`, `data-clarity-*`, `data-ga-*`, `data-ved`, `data-usg`, `data-ei`), framework internals (`data-v-*`, `data-reactid`, `data-svelte-*`, `data-astro-*`, `ng-*`), Google JS attrs (`jscontroller`, `jsaction`, `jsname`, `jsmodel`, `jsdata`, `jsshadow`, `jstcache`, `jsslot`).

**Replaced:** base64 `src` → `data:image/type;base64,[truncated, WxH]`

**Stripped:** HTML comments.

**Structure mode additionally:** removes text nodes, replaces large SVGs (>500 chars) with placeholders.

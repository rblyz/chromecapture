# Capture Format Specification

Chrome Capture outputs a JSON array wrapped in `<chrome-capture>` tags:

```
<chrome-capture>[...elements...]</chrome-capture>
```

## Element Schema

Each captured element is a JSON object:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique ID (`cap_<timestamp>_<random>`) |
| `selector` | `string` | Approximate CSS selector (`tag#id`, `tag.class`, or `tag`) |
| `label` | `string` | Human-readable label (first 40 chars of inner text, or selector) |
| `tag` | `string` | HTML tag name (lowercase) |
| `url` | `string` | Page URL where element was captured |
| `title` | `string` | Page title |
| `timestamp` | `string` | ISO 8601 timestamp |
| `innerText` | `string` | Text content of the element |
| `outerHTML` | `string` | Full HTML including children |
| `rect` | `object` | Bounding box `{ x, y, width, height }` in px |
| `computedStyles` | `object` | Key-value map of non-default computed CSS properties |
| `cssRules` | `array` | Matching CSS rules from stylesheets |

### `computedStyles`

Only properties that differ from browser defaults are included. This keeps the output compact while preserving everything an LLM needs to reproduce the visual appearance.

Tracked properties: layout (`display`, `position`, `flex-*`, `grid-*`), sizing (`width`, `height`, `margin`, `padding`), visual (`background`, `color`, `border`, `border-radius`, `box-shadow`, `opacity`), typography (`font-*`, `line-height`, `letter-spacing`, `text-*`), and behavior (`overflow`, `z-index`, `transform`, `transition`, `cursor`).

### `cssRules`

Each entry:

```json
{
  "selector": ".btn-primary",
  "css": "background: #D97757; color: #fff; ...",
  "media": "@media (min-width: 768px)"  // optional
}
```

Rules are collected from all accessible stylesheets (CORS-restricted sheets are skipped). Media queries and `@supports` conditions are preserved.

## Why This Format?

1. **`<chrome-capture>` tags** — act as a sentinel so LLMs can reliably detect and parse the captured data in a conversation
2. **Computed styles over raw CSS** — raw stylesheets have cascading, specificity, and inheritance; computed styles show the final resolved values the browser actually uses
3. **CSS rules included too** — provide semantic context (class names, selectors, media queries) that computed styles alone don't carry
4. **`outerHTML` preserved** — lets the LLM see the actual DOM structure, attributes, and children
5. **Non-default filtering** — removes noise from hundreds of default CSS values, keeping only what defines the element's unique appearance

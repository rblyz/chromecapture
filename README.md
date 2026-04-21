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

## Output Format

See [docs/capture-format.md](docs/capture-format.md) for the full specification.

Each capture includes:
- `outerHTML` — full DOM structure
- `computedStyles` — only non-default CSS properties (compact, no noise)
- `cssRules` — matching stylesheet rules with media queries
- `rect` — bounding box dimensions
- Page context (`url`, `title`, `timestamp`)

## Limitations

- **CSP restrictions**: Some sites (GitHub, Google, etc.) block inline scripts via Content-Security-Policy. The bookmarklet won't work on these sites. A Chrome extension version would bypass this — contributions welcome.
- **CORS stylesheets**: CSS from cross-origin stylesheets (CDNs without CORS headers) can't be read. Computed styles still work, but `cssRules` will be empty for those rules.
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

(() => {
  // Re-invoke: toggle picker instead of re-injecting.
  if (window.__chromeCap) { window.__chromeCap.toggle(); return; }

  // --- Theme ----------------------------------------------------------------
  const C = {
    bgApp:    '#FAF9F5',
    bgPanel:  '#F5F4ED',
    bgSurf:   '#FFFFFF',
    bgHover:  'rgba(15,12,8,0.04)',
    bgMuted:  '#F0EEE6',
    bdDef:    'rgba(15,12,8,0.14)',
    bdSub:    'rgba(15,12,8,0.08)',
    txPri:    'rgba(15,12,8,0.92)',
    txSec:    'rgba(15,12,8,0.64)',
    txTer:    'rgba(15,12,8,0.60)',
    accent:   '#7C3AED',
    accentHv: '#6D28D9',
    accentAc: '#5B21B6',
    shadow:   '0 10px 15px rgba(20,20,19,0.08), 0 4px 6px rgba(20,20,19,0.04)',
  };
  const FONT = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

  const captures = [];
  let picking = false;
  let hoverEl = null;
  let captureMode = 'all'; // 'all' | 'structure'

  const el = (tag, css, txt) => {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (txt != null) e.textContent = txt;
    return e;
  };

  // --- Highlight box --------------------------------------------------------
  const HL_COLOR = '#EF4444';
  const hl = el('div',
    'position:fixed;pointer-events:none;z-index:2147483646;' +
    'border:2px solid ' + HL_COLOR + ';background:rgba(239,68,68,.10);' +
    'border-radius:3px;box-sizing:border-box;display:none;' +
    'transition:all 40ms linear;');
  const hlLabel = el('div',
    'position:absolute;top:-22px;left:0;padding:2px 7px;' +
    'background:' + HL_COLOR + ';color:#fff;font:11px/1.4 ' + FONT + ';' +
    'border-radius:4px;white-space:nowrap;font-weight:500;');
  hl.appendChild(hlLabel);

  // --- Panel ----------------------------------------------------------------
  const panel = el('div',
    'position:fixed;bottom:20px;right:20px;width:340px;' +
    'z-index:2147483647;background:' + C.bgSurf + ';' +
    'border:1px solid ' + C.bdDef + ';border-radius:12px;' +
    'box-shadow:' + C.shadow + ';font:12px/1.4 ' + FONT + ';' +
    'color:' + C.txPri + ';overflow:hidden;');

  // Header
  const header = el('div',
    'padding:12px 14px;border-bottom:1px solid ' + C.bdSub + ';' +
    'display:flex;align-items:center;gap:10px;');
  const dot = el('div',
    'width:8px;height:8px;border-radius:50%;background:' + C.accent + ';' +
    'flex-shrink:0;');
  const title = el('div', 'font-weight:600;font-size:13px;flex:1;', 'Chrome Capture');
  const closeBtn = el('button',
    'width:22px;height:22px;border:0;border-radius:5px;background:transparent;' +
    'color:' + C.txTer + ';cursor:pointer;font:14px/1 ' + FONT + ';padding:0;', '\u2715');
  closeBtn.onmouseenter = () => closeBtn.style.background = C.bgHover;
  closeBtn.onmouseleave = () => closeBtn.style.background = 'transparent';
  const modeBtn = el('button',
    'padding:2px 8px;border:1px solid ' + C.bdDef + ';border-radius:5px;' +
    'background:' + C.bgPanel + ';color:' + C.txSec + ';cursor:pointer;' +
    'font:10px/1.4 ' + FONT + ';white-space:nowrap;');
  modeBtn.textContent = 'all';
  modeBtn.title = 'Toggle capture mode: all / structure (no text, simplified SVG)';
  modeBtn.onclick = () => {
    captureMode = captureMode === 'all' ? 'structure' : 'all';
    modeBtn.textContent = captureMode;
    modeBtn.style.background = captureMode === 'structure' ? C.accent : C.bgPanel;
    modeBtn.style.color = captureMode === 'structure' ? '#fff' : C.txSec;
  };
  header.append(dot, title, modeBtn, closeBtn);

  // Body
  const body = el('div', 'padding:14px;display:flex;flex-direction:column;gap:12px;');

  // Hint
  const hint = el('div',
    'font-size:11px;color:' + C.txSec + ';line-height:1.5;',
    'Click elements to capture. Esc = stop picking. Alt+P = toggle picker (keeps dropdowns open).');

  // Capture list
  const list = el('div',
    'display:flex;flex-direction:column;gap:5px;max-height:180px;overflow-y:auto;');
  const empty = el('div',
    'padding:18px;text-align:center;font-size:11px;color:' + C.txTer + ';' +
    'background:' + C.bgMuted + ';border-radius:8px;border:1px dashed ' + C.bdDef + ';',
    'No elements captured yet');
  list.appendChild(empty);

  // Output row: single-line readonly + copy
  const outRow = el('div', 'display:flex;gap:6px;align-items:stretch;');
  const out = el('input',
    'flex:1;min-width:0;padding:7px 10px;border:1px solid ' + C.bdDef + ';' +
    'border-radius:8px;background:' + C.bgPanel + ';color:' + C.txTer + ';' +
    'font:11px ui-monospace,Menlo,monospace;outline:none;');
  out.readOnly = true;
  out.placeholder = 'Capture output will appear here';
  out.onclick = () => out.select();
  const copyBtn = mkBtn('Copy', true);
  copyBtn.style.flexShrink = '0';
  outRow.append(out, copyBtn);

  // Paste-back hint
  const pasteHint = el('div',
    'font-size:11px;color:' + C.txTer + ';display:flex;align-items:center;gap:5px;');
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const arrow = document.createElementNS(SVG_NS, 'svg');
  arrow.setAttribute('width', '12'); arrow.setAttribute('height', '12');
  arrow.setAttribute('viewBox', '0 0 16 16'); arrow.setAttribute('fill', 'currentColor');
  const arrowP = document.createElementNS(SVG_NS, 'path');
  arrowP.setAttribute('d', 'M8 1L3 6h3v6h4V6h3L8 1z');
  arrowP.setAttribute('transform', 'rotate(180 8 8)');
  arrow.appendChild(arrowP);
  pasteHint.append(arrow, 'Paste into Claude Code or any LLM');

  // Pick toggle button
  const pickBtn = mkBtn('Stop picking', false);
  pickBtn.style.width = '100%';

  body.append(hint, list, outRow, pasteHint, pickBtn);
  panel.append(header, body);

  // Button factory
  function mkBtn(label, primary) {
    const b = el('button',
      'padding:7px 14px;border-radius:8px;font:12px/1 ' + FONT + ';' +
      'font-weight:500;cursor:pointer;transition:all .12s ease;' +
      'border:1px solid ' + (primary ? 'rgba(0,0,0,.15)' : C.bdDef) + ';' +
      'background:' + (primary ? C.accent : C.bgSurf) + ';' +
      'color:' + (primary ? '#FAF9F5' : C.txPri) + ';' +
      (primary ? 'box-shadow:0 1px 3px rgba(91,33,182,.35),inset 0 1px 0 rgba(255,255,255,.15);' : ''),
      label);
    b.onmouseenter = () => b.style.background = primary ? C.accentHv : C.bgHover;
    b.onmouseleave = () => b.style.background = primary ? C.accent : C.bgSurf;
    b.onmousedown  = () => b.style.background = primary ? C.accentAc : C.bgMuted;
    b.onmouseup    = () => b.style.background = primary ? C.accentHv : C.bgHover;
    return b;
  }

  // --- CSS rule extraction --------------------------------------------------
  const PSEUDO_RE = /:(hover|focus|focus-within|focus-visible|active|visited|disabled|checked|enabled|read-only|placeholder-shown|invalid|valid|required)(?![-(])/g;
  function matchesWithPseudo(target, selectorText) {
    // Direct match (current state)
    try { if (target.matches(selectorText)) return { match: true }; } catch {}
    // Try stripping pseudo-class states to find rules for other states
    if (PSEUDO_RE.test(selectorText)) {
      PSEUDO_RE.lastIndex = 0;
      const stripped = selectorText.replace(PSEUDO_RE, '').replace(/::?$/g, '');
      if (!stripped) return { match: false };
      try {
        if (target.matches(stripped)) {
          const pseudos = [];
          let m; PSEUDO_RE.lastIndex = 0;
          while ((m = PSEUDO_RE.exec(selectorText))) pseudos.push(m[1]);
          return { match: true, states: pseudos };
        }
      } catch {}
    }
    return { match: false };
  }
  function walkRules(rules, target, acc, media) {
    for (const r of rules) {
      try {
        if (r.selectorText) {
          const res = matchesWithPseudo(target, r.selectorText);
          if (res.match) {
            const entry = { selector: r.selectorText, css: r.style.cssText };
            if (media) entry.media = media;
            if (res.states) entry.states = res.states;
            acc.push(entry);
          }
        }
        if (r.styleSheet) {
          walkRules(r.styleSheet.cssRules, target, acc, (r.media && r.media.mediaText) || media);
        } else if (r.cssRules) {
          walkRules(r.cssRules, target, acc, r.conditionText || (r.media && r.media.mediaText) || media);
        }
      } catch {}
    }
  }
  function isJunkRule(selector, css, media) {
    // Universal selectors (CSS resets, Tailwind variable declarations)
    const sel = selector.replace(/\s+/g, ' ').trim();
    if (/^\*(\s*,\s*(::?\w+))*$/.test(sel)) return true;
    // CSS that only sets --tw- or --default- custom properties
    if (/^(--.+?:\s*[^;]*;\s*)+$/.test(css) && !css.replace(/--[\w-]+:\s*[^;]*;?\s*/g, '').trim()) return true;
    // prefers-reduced-motion rules
    if (media && /prefers-reduced-motion/.test(media)) return true;
    return false;
  }
  // Fetch cross-origin stylesheets and parse them into a temporary sheet
  // so we can read their rules via the CSSOM.
  let _corsFixed = false;
  async function fixCorsSheets() {
    if (_corsFixed) return;
    _corsFixed = true;
    const fetches = [];
    for (const sh of document.styleSheets) {
      try { sh.cssRules; continue; } catch {} // already accessible
      if (!sh.href) continue;
      fetches.push(
        fetch(sh.href).then(r => r.text()).then(css => {
          const s = document.createElement('style');
          s.dataset.chromecap = '1';
          s.textContent = css;
          document.head.appendChild(s);
        }).catch(() => {})
      );
    }
    await Promise.all(fetches);
  }
  // Resolve var(--xxx) references to their computed values
  function resolveVars(cssText, target) {
    const root = getComputedStyle(document.documentElement);
    const elCS = getComputedStyle(target);
    return cssText.replace(/var\(--[\w-]+(?:\s*,\s*[^)]+)?\)/g, m => {
      const name = m.match(/var\((--[\w-]+)/)[1];
      const val = elCS.getPropertyValue(name).trim() || root.getPropertyValue(name).trim();
      return val ? val : m;
    });
  }
  function getRules(target) {
    const acc = [];
    const seen = new Set();
    for (const sh of document.styleSheets) {
      let rules;
      try { rules = sh.cssRules; } catch { continue; }
      walkRules(rules, target, acc, (sh.media && sh.media.mediaText) || undefined);
    }
    return acc.filter(r => {
      if (isJunkRule(r.selector, r.css, r.media)) return false;
      const key = r.selector + '|' + r.css + '|' + (r.media || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(r => {
      if (r.css.includes('var(--')) {
        r.cssResolved = resolveVars(r.css, target);
      }
      return r;
    });
  }

  // --- Computed styles (curated) --------------------------------------------
  const PROPS = [
    'display','position','top','right','bottom','left','width','height',
    'margin','padding','border','border-radius','box-sizing','box-shadow',
    'background','color','opacity',
    'font-family','font-size','font-weight','font-style','line-height',
    'letter-spacing','text-align','text-decoration','text-transform','white-space',
    'flex','flex-direction','flex-wrap','justify-content','align-items','align-self','gap',
    'grid-template-columns','grid-template-rows','grid-column','grid-row',
    'overflow','z-index','transform','transition','cursor','object-fit',
  ];
  const DEFAULTS = {
    'display':'inline','position':'static','top':'auto','right':'auto','bottom':'auto','left':'auto',
    'width':'auto','height':'auto','margin':'0px','padding':'0px','border':'0px none rgb(0, 0, 0)',
    'border-radius':'0px','box-sizing':'content-box','box-shadow':'none',
    'color':'rgb(0, 0, 0)','opacity':'1','font-style':'normal','font-weight':'400',
    'letter-spacing':'normal','text-align':'start','text-decoration':'none solid rgb(0, 0, 0)',
    'text-transform':'none','white-space':'normal','flex':'0 1 auto','flex-direction':'row',
    'flex-wrap':'nowrap','justify-content':'normal','align-items':'normal','align-self':'auto',
    'gap':'normal','grid-template-columns':'none','grid-template-rows':'none',
    'grid-column':'auto','grid-row':'auto','overflow':'visible','z-index':'auto',
    'transform':'none','transition':'all 0s ease 0s','cursor':'auto','object-fit':'fill',
  };
  const SKIP = new Set(['none','normal','rgba(0, 0, 0, 0)']);
  function getComputed(target) {
    const cs = getComputedStyle(target);
    const m = {};
    for (const p of PROPS) {
      const v = cs.getPropertyValue(p);
      if (!v) continue;
      if (DEFAULTS[p] === v) continue;
      if (!(p in DEFAULTS) && SKIP.has(v)) continue;
      m[p] = v;
    }
    return m;
  }

  // --- Capture --------------------------------------------------------------
  function selApprox(target) {
    const tag = target.tagName.toLowerCase();
    if (target.id) return tag + '#' + target.id;
    const cls = (target.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean)[0];
    return cls ? tag + '.' + cls : tag;
  }
  // Clean outerHTML: remove elements that don't affect visual design
  const TRACKER_RE = /^data-(ad|google|adsbygoogle|load-complete|gtm|fb[-p]?|analytics|track|event|segment|amplitude|amp|mp|mixpanel|hj|hotjar|heap|intercom|pendo|clarity|ga4?)(-|$)/;
  const SVG_MAX = 200;
  function cleanHTML(el) {
    const clone = el.cloneNode(true);
    // Remove non-visual elements + our own panel
    clone.querySelectorAll(
      'script, iframe, noscript, ins.adsbygoogle, [data-ad-client], ' +
      '[data-google-container-id], style:not([data-chromecap])'
    ).forEach(n => n.remove());
    // Remove our own Chrome Capture panel if it got captured
    clone.querySelectorAll('[style*="z-index: 2147483647"], [style*="z-index:2147483647"], [style*="z-index: 2147483646"], [style*="z-index:2147483646"]').forEach(n => n.remove());
    // Strip framework island serialized data (Astro, Nuxt, etc.)
    clone.querySelectorAll('astro-island[props], [data-island-props]').forEach(n => {
      n.removeAttribute('props');
      n.removeAttribute('data-island-props');
    });
    // Strip inline event handlers, tracker attrs, and framework internals
    const FW_RE = /^(data-astro-cid|data-astro-source|data-v-|data-hk|data-svelte|data-sveltekit|data-reactid|data-reactroot|data-server-rendered|data-fetch-key|data-hydrate|data-ssr|data-lit|data-nscript|_ng|ng-reflect)/;
    clone.querySelectorAll('*').forEach(n => {
      for (const attr of [...n.attributes]) {
        if (attr.name.startsWith('on') || TRACKER_RE.test(attr.name) || FW_RE.test(attr.name)) {
          n.removeAttribute(attr.name);
        }
      }
    });
    // Structure mode: simplify SVGs and strip text nodes
    if (captureMode === 'structure') {
      clone.querySelectorAll('svg').forEach(svg => {
        if (svg.outerHTML.length > SVG_MAX) {
          const ph = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          for (const a of ['width', 'height', 'viewBox', 'class', 'aria-label', 'aria-hidden']) {
            if (svg.getAttribute(a)) ph.setAttribute(a, svg.getAttribute(a));
          }
          ph.setAttribute('data-placeholder', 'svg');
          svg.replaceWith(ph);
        }
      });
      const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach(n => n.remove());
    }
    // Strip HTML comments
    const html = clone.outerHTML.replace(/<!--[\s\S]*?-->/g, '');
    return html;
  }

  // --- Framework detection --------------------------------------------------
  function detectFrameworks() {
    const fw = [];
    // Vue
    if (window.__VUE__ || window.__vue_app__ || document.querySelector('[data-v-]') ||
        document.querySelector('[data-v-app]') || window.__VUE_DEVTOOLS_GLOBAL_HOOK__) fw.push('Vue');
    // React
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || window._reactRootContainer ||
        document.querySelector('[data-reactroot]') || document.querySelector('[data-reactid]')) fw.push('React');
    // Next.js
    if (window.__NEXT_DATA__ || document.querySelector('#__next')) fw.push('Next.js');
    // Nuxt
    if (window.__NUXT__ || document.querySelector('#__nuxt')) fw.push('Nuxt');
    // Angular
    if (window.ng || document.querySelector('[ng-version]') ||
        document.querySelector('[_nghost]') || document.querySelector('[_ngcontent]')) fw.push('Angular');
    // Svelte
    if (document.querySelector('[class*="svelte-"]')) fw.push('Svelte');
    // jQuery
    if (window.jQuery || window.$?.fn?.jquery) fw.push('jQuery');
    // Tailwind (utility classes)
    if (document.querySelector('[class*="tw-"]') ||
        document.querySelector('style[data-tw]') ||
        [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.selectorText && /^\.\!?-?(?:sm|md|lg|xl|2xl):/.test(r.selectorText)); } catch { return false; } })) fw.push('Tailwind');
    // Bootstrap
    if (document.querySelector('.container-fluid, .row .col-md-6, [class*="btn-primary"]') ||
        [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.selectorText === '.container-fluid'); } catch { return false; } })) fw.push('Bootstrap');
    return fw.length ? fw : undefined;
  }

  // --- Accessibility & semantics --------------------------------------------
  function getAccessibleName(el) {
    // aria-labelledby → aria-label → alt → title → label[for] → innerText (short)
    const lblBy = el.getAttribute('aria-labelledby');
    if (lblBy) {
      const txt = lblBy.split(/\s+/).map(id => {
        const ref = document.getElementById(id);
        return ref ? ref.textContent.trim() : '';
      }).filter(Boolean).join(' ');
      if (txt) return txt;
    }
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    if (el.alt) return el.alt;
    if (el.title) return el.title;
    if (el.id) {
      const lbl = document.querySelector('label[for="' + el.id + '"]');
      if (lbl) return lbl.textContent.trim();
    }
    if (el.placeholder) return el.placeholder;
    return '';
  }
  function getSemantics(target) {
    const s = {};
    // Role: explicit ARIA or implicit from tag
    const role = target.getAttribute('role');
    if (role) s.role = role;
    // Accessible name
    const name = getAccessibleName(target);
    if (name) s.accessibleName = name;
    // Interactive states (only non-default)
    if (target.disabled) s.disabled = true;
    if (target.getAttribute('aria-hidden') === 'true') s.ariaHidden = true;
    if (target.hasAttribute('aria-expanded')) s.ariaExpanded = target.getAttribute('aria-expanded') === 'true';
    if (target.hasAttribute('aria-pressed')) s.ariaPressed = target.getAttribute('aria-pressed');
    if (target.checked) s.checked = true;
    if (target.required) s.required = true;
    if (target.readOnly) s.readOnly = true;
    // Form context
    const form = target.closest('form');
    if (form) {
      s.formAction = form.action || undefined;
      s.formMethod = form.method || undefined;
    }
    if (target.formAction && target.formAction !== location.href) s.formAction = target.formAction;
    // Form fields (if target is or contains a form)
    const inputs = target.tagName === 'FORM'
      ? target.querySelectorAll('input, select, textarea')
      : target.querySelectorAll('form input, form select, form textarea');
    if (inputs.length) {
      s.formFields = [...inputs].slice(0, 20).map(inp => {
        const f = { tag: inp.tagName.toLowerCase() };
        if (inp.type && inp.type !== 'text') f.type = inp.type;
        if (inp.name) f.name = inp.name;
        if (inp.placeholder) f.placeholder = inp.placeholder;
        const an = getAccessibleName(inp);
        if (an) f.label = an;
        if (inp.required) f.required = true;
        return f;
      });
    }
    return Object.keys(s).length ? s : undefined;
  }

  async function capture(target) {
    await fixCorsSheets();
    const r = target.getBoundingClientRect();
    const semantics = getSemantics(target);
    const cap = {
      mode: captureMode,
      selector: selApprox(target),
      tag: target.tagName.toLowerCase(),
      url: location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      innerText: target.innerText || '',
      outerHTML: cleanHTML(target),
      rect: {
        x: Math.round(r.x), y: Math.round(r.y),
        width: Math.round(r.width), height: Math.round(r.height),
      },
      computedStyles: getComputed(target),
      cssRules: getRules(target),
    };
    if (semantics) cap.semantics = semantics;
    captures.push(cap);
    render();
  }

  // --- Render ---------------------------------------------------------------
  function render() {
    const json = JSON.stringify(captures);
    const fw = detectFrameworks();
    const fwAttr = fw ? ' frameworks="' + fw.join(',') + '"' : '';
    out.value = captures.length ? '<chrome-capture' + fwAttr + '>' + json + '</chrome-capture>' : '';

    list.replaceChildren();
    if (!captures.length) { list.appendChild(empty); return; }
    captures.forEach((cap, i) => {
      const row = el('div',
        'display:flex;align-items:center;gap:8px;padding:6px 8px;' +
        'background:' + C.bgPanel + ';border:1px solid ' + C.bdSub + ';' +
        'border-radius:6px;font-size:11px;');
      const chip = el('span',
        'padding:1px 6px;background:' + C.accent + ';color:#fff;' +
        'border-radius:4px;font-size:9px;font-weight:600;font-family:ui-monospace,Menlo,monospace;',
        cap.tag);
      const capJson = JSON.stringify(cap);
      const words = capJson.split(/\s+/).length;
      const modeTag = el('span',
        'padding:1px 4px;border-radius:3px;font-size:8px;font-weight:500;' +
        'font-family:ui-monospace,Menlo,monospace;' +
        'background:' + (cap.mode === 'structure' ? C.accent : C.bgMuted) + ';' +
        'color:' + (cap.mode === 'structure' ? '#fff' : C.txTer) + ';',
        cap.mode === 'structure' ? 'str' : 'all');
      const size = el('span',
        'flex:1;font-size:10px;color:' + C.txTer + ';font-family:ui-monospace,Menlo,monospace;white-space:nowrap;',
        words > 999 ? (words / 1000).toFixed(1) + 'k w' : words + ' w');
      const dim = el('span',
        'font-size:10px;color:' + C.txTer + ';font-family:ui-monospace,Menlo,monospace;white-space:nowrap;',
        cap.rect.width + '\u00d7' + cap.rect.height);
      const x = el('button',
        'width:18px;height:18px;border:0;border-radius:4px;background:transparent;' +
        'color:' + C.txTer + ';cursor:pointer;font:12px/1 ' + FONT + ';padding:0;flex-shrink:0;',
        '\u2715');
      x.onmouseenter = () => { x.style.background = C.bgHover; x.style.color = C.txPri; };
      x.onmouseleave = () => { x.style.background = 'transparent'; x.style.color = C.txTer; };
      x.onclick = () => { captures.splice(i, 1); render(); };
      row.append(chip, modeTag, size, dim, x);
      list.appendChild(row);
    });
  }

  // --- Picker mode ----------------------------------------------------------
  function onMove(e) {
    const t = e.target;
    if (panel.contains(t)) { hl.style.display = 'none'; hoverEl = null; return; }
    const r = t.getBoundingClientRect();
    hl.style.display = 'block';
    hl.style.top = r.top + 'px';
    hl.style.left = r.left + 'px';
    hl.style.width = r.width + 'px';
    hl.style.height = r.height + 'px';
    hlLabel.textContent = selApprox(t);
    hoverEl = t;
  }
  function onClick(e) {
    if (panel.contains(e.target)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (hoverEl) capture(hoverEl);
  }
  function onKey(e) { if (e.key === 'Escape') stop(); }

  function start() {
    picking = true;
    pickBtn.textContent = 'Stop picking';
    dot.style.animation = 'chromecap-pulse 1.2s ease-in-out infinite';
    document.body.appendChild(hl);
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
  }
  function stop() {
    picking = false;
    pickBtn.textContent = 'Pick more elements';
    dot.style.animation = '';
    hl.remove(); hl.style.display = 'none';
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
  }
  function destroy() {
    stop(); panel.remove(); style.remove();
    document.removeEventListener('keydown', onGlobalKey, true);
    delete window.__chromeCap;
  }

  // --- Wire up --------------------------------------------------------------
  // Global hotkey: Alt+P toggles picker without stealing focus or closing dropdowns
  // Uses e.code (physical key) so it works regardless of layout or macOS Option-symbol input
  function onGlobalKey(e) {
    if (e.altKey && e.code === 'KeyP') {
      e.preventDefault(); e.stopPropagation();
      picking ? stop() : start();
    }
  }
  document.addEventListener('keydown', onGlobalKey, true);

  pickBtn.onclick = () => picking ? stop() : start();
  copyBtn.onclick = () => {
    if (!out.value) return;
    const done = () => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy', 1200);
    };
    const fallback = () => { out.select(); document.execCommand('copy'); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(out.value).then(done, fallback);
    } else fallback();
  };
  closeBtn.onclick = destroy;

  // Pulse keyframe
  const style = el('style');
  style.textContent =
    '@keyframes chromecap-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}';
  document.head.appendChild(style);

  document.body.appendChild(panel);
  window.__chromeCap = { toggle: () => picking ? stop() : start(), destroy };
  start();
})();

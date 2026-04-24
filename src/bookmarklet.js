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
  let captureMode = 'all'; // 'all' | 'structure' | 'layout'

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
  modeBtn.title = 'Toggle capture mode: all / structure / layout';
  modeBtn.onclick = () => {
    captureMode = captureMode === 'all' ? 'structure' : captureMode === 'structure' ? 'layout' : 'all';
    modeBtn.textContent = captureMode;
    modeBtn.style.background = captureMode === 'all' ? C.bgPanel : C.accent;
    modeBtn.style.color = captureMode === 'all' ? C.txSec : '#fff';
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
  // Re-fetch stylesheets that throw SecurityError on .cssRules and inject
  // as inline <style>. Tries both same-origin and cross-origin (if CORS allows).
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
  function resolveVars(cssText, target, tokens) {
    const root = getComputedStyle(document.documentElement);
    const elCS = getComputedStyle(target);
    return cssText.replace(/var\(--[\w-]+(?:\s*,\s*[^)]+)?\)/g, m => {
      const name = m.match(/var\((--[\w-]+)/)[1];
      const val = elCS.getPropertyValue(name).trim() || root.getPropertyValue(name).trim();
      if (val && tokens) tokens[name] = val;
      return val ? val : m;
    });
  }
  function getRules(target, tokens) {
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
        r.cssResolved = resolveVars(r.css, target, tokens);
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
  // Pseudo-elements ::before/::after
  const PSEUDO_PROPS = ['content','display','position','top','right','bottom','left',
    'width','height','background','color','font-size','font-family','border','border-radius'];
  function getPseudos(target) {
    const result = {};
    for (const pseudo of ['::before', '::after']) {
      const cs = getComputedStyle(target, pseudo);
      const content = cs.getPropertyValue('content');
      if (!content || content === 'none' || content === 'normal') continue;
      const styles = { content };
      for (const p of PSEUDO_PROPS) {
        if (p === 'content') continue;
        const v = cs.getPropertyValue(p);
        if (v && !SKIP.has(v) && !(DEFAULTS[p] === v)) styles[p] = v;
      }
      result[pseudo] = styles;
    }
    return Object.keys(result).length ? result : undefined;
  }
  // Fonts used by element
  function getUsedFonts(target) {
    if (!document.fonts || !document.fonts.forEach) return undefined;
    const cs = getComputedStyle(target);
    const families = cs.fontFamily.split(',').map(f => f.trim().replace(/^[\x22\x27]|[\x22\x27]$/g, ''));
    const loaded = [];
    document.fonts.forEach(f => {
      if (f.status === 'loaded' && families.some(fam => fam.toLowerCase() === f.family.toLowerCase())) {
        const entry = f.family;
        if (!loaded.includes(entry)) loaded.push(entry);
      }
    });
    return loaded.length ? loaded : undefined;
  }

  // --- Helpers ---------------------------------------------------------------
  function mkViewport() {
    const w = window.innerWidth, h = window.innerHeight;
    return { width: w, height: h, mode: w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop' };
  }
  function mkRect(r) {
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  }
  function mkRelRect(r, origin) {
    return { x: Math.round(r.left - origin.left), y: Math.round(r.top - origin.top), width: Math.round(r.width), height: Math.round(r.height) };
  }

  // --- Capture --------------------------------------------------------------
  function selApprox(target) {
    const tag = target.tagName.toLowerCase();
    if (target.id && /^[a-zA-Z][\w-]*$/.test(target.id)) return tag + '#' + target.id;
    const cls = (target.getAttribute('class') || '').trim().split(/\s+/).filter(c => c && !/^[a-z]{1,3}-[\da-z]{4,8}$/.test(c))[0];
    const clsEsc = cls ? cls.replace(/([^a-zA-Z0-9_-])/g, '\\$1') : null;
    const base = clsEsc ? tag + '.' + clsEsc : tag;
    const parent = target.parentElement;
    if (parent) {
      try { parent.querySelectorAll(':scope > ' + base); } catch(e) { return tag; }
      const siblings = parent.querySelectorAll(':scope > ' + base);
      if (siblings.length > 1) {
        const idx = [...siblings].indexOf(target) + 1;
        return base + ':nth-of-type(' + idx + ')';
      }
    }
    return base;
  }
  function getXPath(target) {
    const parts = [];
    let node = target;
    while (node && node.nodeType === 1) {
      let tag = node.tagName.toLowerCase();
      if (node.id) { parts.unshift(tag + '[@id="' + node.id + '"]'); break; }
      let idx = 1;
      let sib = node.previousElementSibling;
      while (sib) {
        if (sib.tagName === node.tagName) idx++;
        sib = sib.previousElementSibling;
      }
      parts.unshift(tag + '[' + idx + ']');
      node = node.parentElement;
    }
    return '/' + parts.join('/');
  }
  // Clean outerHTML: remove elements that don't affect visual design
  const TRACKER_RE = /^data-(ad|google|adsbygoogle|load-complete|gtm|fb[-p]?|analytics|track|event|segment|amplitude|amp|mp|mixpanel|hj|hotjar|heap|intercom|pendo|clarity|ga4?)(-|$)/;
  const SVG_INLINE_MAX = 500;
  function cleanHTML(el) {
    const clone = el.cloneNode(true);
    // Remove non-visual elements + our own panel
    clone.querySelectorAll(
      'script, iframe, noscript, ins.adsbygoogle, [data-ad-client], ' +
      '[data-google-container-id], [data-sender], .resize-sensor, ' +
      'style:not([data-chromecap])'
    ).forEach(n => n.remove());
    // Remove our own Chrome Capture panel if it got captured
    clone.querySelectorAll('[style*="z-index: 2147483647"], [style*="z-index:2147483647"], [style*="z-index: 2147483646"], [style*="z-index:2147483646"]').forEach(n => n.remove());
    // Strip framework island serialized data (Astro, Nuxt, etc.)
    clone.querySelectorAll('astro-island[props], [data-island-props]').forEach(n => {
      n.removeAttribute('props');
      n.removeAttribute('data-island-props');
    });
    // Strip inline event handlers, tracker attrs, and framework internals
    const FW_RE = /^(data-astro-cid|data-astro-source|data-v-|data-hk|data-svelte|data-sveltekit|data-reactid|data-reactroot|data-server-rendered|data-fetch-key|data-hydrate|data-ssr|data-lit|data-nscript|_ng|ng-reflect|data-ved|data-usg|data-ei|data-hl|data-lk|data-s|data-iml|data-csiid|data-atf)/;
    const GOOGLE_JS_RE = /^(jscontroller|jsaction|jsname|jsmodel|jsdata|jsshadow|jstcache|jsslot)$/;
    clone.querySelectorAll('*').forEach(n => {
      for (const attr of [...n.attributes]) {
        if (attr.name.startsWith('on') || TRACKER_RE.test(attr.name) || FW_RE.test(attr.name) || GOOGLE_JS_RE.test(attr.name)) {
          n.removeAttribute(attr.name);
        }
      }
    });
    // Replace base64 data URIs with placeholder preserving dimensions
    clone.querySelectorAll('[src^="data:"]').forEach(n => {
      const m = n.getAttribute('src').match(/^data:(image\/[\w+]+)/);
      const type = m ? m[1] : 'image';
      const w = n.getAttribute('width');
      const h = n.getAttribute('height');
      const dim = w && h ? ', ' + w + 'x' + h : '';
      n.setAttribute('src', 'data:' + type + ';base64,[truncated' + dim + ']');
    });
    // Grab innerText: insert clone offscreen so browser computes spacing correctly
    clone.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
    document.body.appendChild(clone);
    const cleanText = clone.innerText || '';
    clone.remove();
    clone.style.cssText = '';
    // Structure mode: simplify SVGs and strip text nodes
    if (captureMode === 'structure') {
      clone.querySelectorAll('svg').forEach(svg => {
        if (svg.querySelector('use')) return;
        if (svg.outerHTML.length > SVG_INLINE_MAX) {
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
    const trimmedText = cleanText.length > 3000 ? cleanText.slice(0, 3000) + '\u2026 [truncated]' : cleanText;
    return { html, innerText: trimmedText };
  }

  // --- Framework detection --------------------------------------------------
  let _fwCache;
  function detectFrameworks() {
    if (_fwCache !== undefined) return _fwCache;
    const fw = [];
    const check = (cond, name) => { try { if (cond()) fw.push(name); } catch {} };
    check(() => window.__VUE__ || window.__vue_app__ || window.__VUE_DEVTOOLS_GLOBAL_HOOK__ || document.querySelector('[data-v-app]'), 'Vue');
    check(() => window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || document.querySelector('[data-reactroot]') || document.querySelector('[data-reactid]'), 'React');
    check(() => window.__NEXT_DATA__ || document.querySelector('#__next'), 'Next.js');
    check(() => window.__NUXT__ || document.querySelector('#__nuxt'), 'Nuxt');
    check(() => window.ng || document.querySelector('[ng-version]') || document.querySelector('[_nghost]') || document.querySelector('[_ngcontent]'), 'Angular');
    check(() => document.querySelector('[class*="svelte-"]'), 'Svelte');
    check(() => window.jQuery || window.$?.fn?.jquery, 'jQuery');
    check(() => document.querySelector('[class*="tw-"]') || document.querySelector('style[data-tw]') ||
      [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.selectorText && /^\.\!?-?(?:sm|md|lg|xl|2xl):/.test(r.selectorText)); } catch { return false; } }), 'Tailwind');
    check(() => [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.selectorText && /^\.col-md-\d+$/.test(r.selectorText)); } catch { return false; } }) ||
      (document.querySelector('.container-fluid') && document.querySelector('.row') && document.querySelector('[class^="col-"]')), 'Bootstrap');
    _fwCache = fw.length ? fw : null;
    return _fwCache;
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
    const txt = (el.textContent || '').trim();
    if (txt.length > 0 && txt.length <= 80) return txt;
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
    // Developer-assigned test/analytics hints
    const HINT_ATTRS = ['data-testid', 'data-test-id', 'data-test', 'data-cy', 'data-qa', 'data-atid', 'data-analytics-name'];
    const hints = {};
    HINT_ATTRS.forEach(a => { const v = target.getAttribute(a); if (v) hints[a.replace('data-', '')] = v; });
    if (Object.keys(hints).length) s.hints = hints;
    return Object.keys(s).length ? s : undefined;
  }

  // --- Layout mode -----------------------------------------------------------
  const LAYOUT_MAX_DEPTH = 8;
  const LAYOUT_MAX_NODES = 500;
  const LAYOUT_MIN_SIZE = 20;
  const LAYOUT_INLINE = new Set(['SPAN','A','EM','STRONG','B','I','U','S','SUB','SUP','SMALL','ABBR','CODE','MARK','Q','CITE','DFN','KBD','SAMP','VAR','TIME','BDO','BDI','WBR','LABEL']);

  function layoutName(el) {
    var role = el.getAttribute('role');
    if (role) return role;
    var label = el.getAttribute('aria-label');
    if (label) return label.slice(0, 40);
    if (el.id && !/^\d/.test(el.id) && el.id.length < 30) return '#' + el.id;
    var cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(function(c) { return c && !/^[a-z]{1,3}-[a-z0-9]{4,8}$/.test(c) && c.length < 30; })[0];
    if (cls) return '.' + cls;
    return el.tagName.toLowerCase();
  }

  function captureLayout(root) {
    var rootRect = root.getBoundingClientRect();
    var nodeCount = { n: 0 };

    function walk(el, depth) {
      if (nodeCount.n >= LAYOUT_MAX_NODES) return null;
      if (depth > LAYOUT_MAX_DEPTH) return null;
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return null;
      if (el.offsetWidth === 0 && el.offsetHeight === 0) return null;
      var r = el.getBoundingClientRect();
      if (r.width < LAYOUT_MIN_SIZE && r.height < LAYOUT_MIN_SIZE) return null;
      // Skip Chrome Capture panel
      if (panel.contains(el)) return null;
      // Don't recurse into SVGs — treat as opaque leaf blocks
      if (el.tagName === 'SVG' || el.closest('svg')) {
        nodeCount.n++;
        return {
          tag: 'svg',
          name: el.getAttribute('aria-label') || 'icon',
          rect: mkRelRect(r, rootRect),
        };
      }

      // Early repeat detection: before walking all children, find runs of same tag+class+size
      // and only walk the first of each run to save node budget
      var rawKids = el.children;
      var children = [];
      var sigs = [];
      for (var si = 0; si < rawKids.length; si++) {
        var cr = rawKids[si].getBoundingClientRect();
        sigs[si] = rawKids[si].tagName + '|' + (rawKids[si].getAttribute('class') || '').trim().split(/\s+/)[0] + '|' + Math.round(cr.width) + 'x' + Math.round(cr.height);
      }
      var ci = 0;
      while (ci < rawKids.length) {
        var csig = sigs[ci];
        var crun = 1;
        while (ci + crun < rawKids.length && sigs[ci + crun] === csig) crun++;
        if (crun >= 3) {
          // Walk only the first, mark with repeat count
          var first = walk(rawKids[ci], depth + 1);
          if (first) { first.repeat = crun; children.push(first); }
        } else {
          for (var ck = 0; ck < crun; ck++) {
            var child = walk(rawKids[ci + ck], depth + 1);
            if (child) children.push(child);
          }
        }
        ci += crun;
      }

      // Skip inline text elements unless they have significant block size or children
      if (LAYOUT_INLINE.has(el.tagName) && children.length === 0 && r.width < 100 && r.height < 40) return null;

      // Collapse single-child chains: if this node has exactly one child and similar dimensions, skip this level
      if (children.length === 1) {
        var cr = children[0].rect;
        var dw = Math.abs(r.width - cr.width - cr.x);
        var dh = Math.abs(r.height - cr.height - cr.y);
        if (dw < 10 && dh < 10) return children[0];
      }

      nodeCount.n++;
      var node = {
        tag: el.tagName.toLowerCase(),
        name: layoutName(el),
        rect: mkRelRect(r, rootRect),
      };
      if (children.length) node.children = children;
      return node;
    }

    return walk(root, 0);
  }

  async function capture(target) {
    // Layout mode: capture subtree geometry, auto-stop picker
    if (captureMode === 'layout') {
      var tree = captureLayout(target);
      if (!tree) return;
      var rootR = target.getBoundingClientRect();
      var layoutCap = {
        _el: target,
        mode: 'layout',
        selector: selApprox(target),
        tag: target.tagName.toLowerCase(),
        rect: mkRect(rootR),
        tree: tree,
      };
      captures.push(layoutCap);
      stop();
      render();
      return;
    }
    await fixCorsSheets();
    const r = target.getBoundingClientRect();
    const cleaned = cleanHTML(target);
    const semantics = getSemantics(target);
    const cap = {
      mode: captureMode,
      selector: selApprox(target),
      xpath: getXPath(target),
      tag: target.tagName.toLowerCase(),
      url: location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      innerText: cleaned.innerText,
      outerHTML: cleaned.html,
      rect: mkRect(r),
      computedStyles: getComputed(target),
    };
    const tokens = {};
    cap.cssRules = getRules(target, tokens);
    if (Object.keys(tokens).length) cap.tokens = tokens;
    if (semantics) cap.semantics = semantics;
    const pseudos = getPseudos(target);
    if (pseudos) cap.pseudoElements = pseudos;
    const fonts = getUsedFonts(target);
    if (fonts) cap.loadedFonts = fonts;
    // Viewport & media query context
    const vp = mkViewport();
    // Collect unique media queries from this element's cssRules and classify
    const mediaSet = new Set();
    (cap.cssRules || []).forEach(r => { if (r.media) mediaSet.add(r.media); });
    if (mediaSet.size) {
      const active = [], inactive = [];
      mediaSet.forEach(mq => {
        try { (window.matchMedia(mq).matches ? active : inactive).push(mq); } catch {}
      });
      if (active.length) vp.activeMedia = active;
      if (inactive.length) vp.inactiveMedia = inactive;
    }
    cap.viewport = vp;
    cap._el = target;
    cap._words = JSON.stringify(cap, (k, v) => k === '_el' ? undefined : v).split(/\s+/).length;
    captures.push(cap);
    render();
  }

  // --- Render ---------------------------------------------------------------
  function nearestLandmark(el) {
    var tags = ['HEADER','NAV','MAIN','ASIDE','FOOTER','SECTION','ARTICLE'];
    var n = el;
    while (n && n !== document.body) {
      if (tags.indexOf(n.tagName) !== -1) return n.tagName.toLowerCase();
      n = n.parentElement;
    }
    return null;
  }

  function spatialRelation(ra, rb) {
    // vertical: a ends before b starts (with 20px tolerance)
    if (ra.y + ra.height <= rb.y + 20) return 'above';
    if (rb.y + rb.height <= ra.y + 20) return 'below';
    // horizontal: side by side
    if (ra.x + ra.width <= rb.x + 20) return 'left-of';
    if (rb.x + rb.width <= ra.x + 20) return 'right-of';
    return 'overlaps';
  }

  function buildRelationships() {
    if (captures.length < 2) return undefined;
    var rels = [];
    for (var i = 0; i < captures.length; i++) {
      for (var j = i + 1; j < captures.length; j++) {
        var rel = { elements: [i, j] };
        try {
          var a = captures[i]._el, b = captures[j]._el;
          if (a && b && a.isConnected && b.isConnected) {
            if (a.contains(b)) rel.dom = 'parent-child';
            else if (b.contains(a)) rel.dom = 'child-parent';
            else if (a.parentElement && a.parentElement === b.parentElement) rel.dom = 'siblings';
          }
        } catch (e) {}
        rel.spatial = spatialRelation(captures[i].rect, captures[j].rect);
        rels.push(rel);
      }
    }
    return rels;
  }

  function countNodes(node) {
    var c = 1;
    if (node.children) node.children.forEach(function(ch) { c += countNodes(ch); });
    return c;
  }

  function render() {
    var fw = detectFrameworks();
    var fwAttr = fw ? ' frameworks="' + fw.join(',').replace(/&/g, '&amp;').replace(/\x22/g, '&quot;').replace(/</g, '&lt;') + '"' : '';
    if (!captures.length) { out.value = ''; list.replaceChildren(); list.appendChild(empty); return; }

    var parts = [];

    // Layout captures → separate <chrome-capture mode="layout">
    var layoutCaps = captures.filter(function(c) { return c.mode === 'layout'; });
    if (layoutCaps.length) {
      var layoutEnvelope = {
        url: location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        viewport: mkViewport(),
      };
      layoutEnvelope.layouts = layoutCaps.map(function(cap) {
        return { selector: cap.selector, tag: cap.tag, rect: cap.rect, tree: cap.tree };
      });
      var layoutHint = '[Spatial layout map. Each node: tag, name, rect (px relative to root). repeat=N means N identical siblings. '
        + 'Ask what to do: prototype as HTML, analyze structure, or capture sections in "all" mode for full styles.]\\n';
      parts.push('<chrome-capture mode="layout"' + fwAttr + '>' + layoutHint + JSON.stringify(layoutEnvelope) + '</chrome-capture>');
    }

    // Normal captures (all/structure) → separate <chrome-capture>
    var normalCaps = captures.filter(function(c) { return c.mode !== 'layout'; });
    if (normalCaps.length) {
    var hoisted = ['url', 'title', 'timestamp', 'viewport'];
    var mergedVp = mkViewport();
    var activeSet = new Set(), inactiveSet = new Set();
    normalCaps.forEach(function(cap) {
      if (cap.viewport) {
        (cap.viewport.activeMedia || []).forEach(function(m) { activeSet.add(m); });
        (cap.viewport.inactiveMedia || []).forEach(function(m) { inactiveSet.add(m); });
      }
    });
    if (activeSet.size) mergedVp.activeMedia = Array.from(activeSet);
    if (inactiveSet.size) mergedVp.inactiveMedia = Array.from(inactiveSet);
    var envelope = {
      url: location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      viewport: mergedVp,
    };
    var rels = buildRelationships();
    if (rels) envelope.relationships = rels;
    var rulePool = [];
    var ruleIndex = {};
    envelope.elements = normalCaps.map(function(cap) {
      var entry = {};
      var lm = cap._el && cap._el.isConnected ? nearestLandmark(cap._el) : null;
      if (lm) entry.landmark = lm;
      for (var k in cap) {
        if (k === '_el' || k === '_words' || hoisted.indexOf(k) !== -1) continue;
        entry[k] = cap[k];
      }
      if (entry.cssRules && entry.cssRules.length) {
        entry.cssRuleRefs = entry.cssRules.map(function(rule) {
          var key = JSON.stringify(rule);
          if (ruleIndex[key] === undefined) {
            ruleIndex[key] = rulePool.length;
            rulePool.push(rule);
          }
          return ruleIndex[key];
        });
        delete entry.cssRules;
      }
      return entry;
    });
    if (rulePool.length) envelope.cssRules = rulePool;
    var hint = '[Captured UI from a live webpage. cssRuleRefs are indices into the top-level cssRules array. '
      + 'tokens map CSS variables to resolved values. '
      + 'If no task specified, ask what to do: reproduce, restyle, debug, or capture more sections.]\\n';
    parts.push('<chrome-capture' + fwAttr + '>' + hint + JSON.stringify(envelope) + '</chrome-capture>');
    }

    out.value = parts.join('\\n');

    list.replaceChildren();
    captures.forEach((cap, i) => {
      const row = el('div',
        'display:flex;align-items:center;gap:8px;padding:6px 8px;' +
        'background:' + C.bgPanel + ';border:1px solid ' + C.bdSub + ';' +
        'border-radius:6px;font-size:11px;');
      const chip = el('span',
        'padding:1px 6px;background:' + C.accent + ';color:#fff;' +
        'border-radius:4px;font-size:9px;font-weight:600;font-family:ui-monospace,Menlo,monospace;',
        cap.tag);
      var words = cap._words || 0;
      var modeBg = cap.mode === 'all' ? C.bgMuted : C.accent;
      var modeFg = cap.mode === 'all' ? C.txTer : '#fff';
      var modeLabel = cap.mode === 'layout' ? 'lay' : cap.mode === 'structure' ? 'str' : 'all';
      const modeTag = el('span',
        'padding:1px 4px;border-radius:3px;font-size:8px;font-weight:500;' +
        'font-family:ui-monospace,Menlo,monospace;' +
        'background:' + modeBg + ';' +
        'color:' + modeFg + ';',
        modeLabel);
      var sizeText = cap.mode === 'layout'
        ? countNodes(cap.tree) + ' nodes'
        : words > 999 ? (words / 1000).toFixed(1) + 'k w' : words + ' w';
      const size = el('span',
        'flex:1;font-size:10px;color:' + C.txTer + ';font-family:ui-monospace,Menlo,monospace;white-space:nowrap;',
        sizeText);
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

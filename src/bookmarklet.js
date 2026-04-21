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
    accent:   '#D97757',
    accentHv: '#C46A4D',
    accentAc: '#B05E43',
    shadow:   '0 10px 15px rgba(20,20,19,0.08), 0 4px 6px rgba(20,20,19,0.04)',
  };
  const FONT = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

  const captures = [];
  let picking = false;
  let hoverEl = null;

  const el = (tag, css, txt) => {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (txt != null) e.textContent = txt;
    return e;
  };

  // --- Highlight box --------------------------------------------------------
  const hl = el('div',
    'position:fixed;pointer-events:none;z-index:2147483646;' +
    'border:2px solid ' + C.accent + ';background:rgba(217,119,87,.12);' +
    'border-radius:3px;box-sizing:border-box;display:none;' +
    'transition:all 40ms linear;');
  const hlLabel = el('div',
    'position:absolute;top:-22px;left:0;padding:2px 7px;' +
    'background:' + C.accent + ';color:#fff;font:11px/1.4 ' + FONT + ';' +
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
  header.append(dot, title, closeBtn);

  // Body
  const body = el('div', 'padding:14px;display:flex;flex-direction:column;gap:12px;');

  // Hint
  const hint = el('div',
    'font-size:11px;color:' + C.txSec + ';line-height:1.5;',
    'Click elements on the page to capture them. Press Esc to stop picking.');

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
      (primary ? 'box-shadow:0 1px 3px rgba(180,90,30,.35),inset 0 1px 0 rgba(255,255,255,.15);' : ''),
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
  function mkLabel(target) {
    const txt = (target.innerText || '').trim().replace(/\s+/g, ' ');
    if (txt) return txt.length > 40 ? txt.slice(0, 40) + '\u2026' : txt;
    return selApprox(target);
  }
  function uid() {
    return 'cap_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
  async function capture(target) {
    await fixCorsSheets();
    const r = target.getBoundingClientRect();
    captures.push({
      id: uid(),
      selector: selApprox(target),
      label: mkLabel(target),
      tag: target.tagName.toLowerCase(),
      url: location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      innerText: target.innerText || '',
      outerHTML: target.outerHTML,
      rect: {
        x: Math.round(r.x), y: Math.round(r.y),
        width: Math.round(r.width), height: Math.round(r.height),
      },
      computedStyles: getComputed(target),
      cssRules: getRules(target),
    });
    render();
  }

  // --- Render ---------------------------------------------------------------
  function render() {
    const json = JSON.stringify(captures);
    out.value = captures.length ? '<chrome-capture>' + json + '</chrome-capture>' : '';

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
      const name = el('span',
        'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;' +
        'white-space:nowrap;color:' + C.txPri + ';', cap.label);
      const dim = el('span',
        'font-size:10px;color:' + C.txTer + ';font-family:ui-monospace,Menlo,monospace;',
        cap.rect.width + '\u00d7' + cap.rect.height);
      const x = el('button',
        'width:18px;height:18px;border:0;border-radius:4px;background:transparent;' +
        'color:' + C.txTer + ';cursor:pointer;font:12px/1 ' + FONT + ';padding:0;flex-shrink:0;',
        '\u2715');
      x.onmouseenter = () => { x.style.background = C.bgHover; x.style.color = C.txPri; };
      x.onmouseleave = () => { x.style.background = 'transparent'; x.style.color = C.txTer; };
      x.onclick = () => { captures.splice(i, 1); render(); };
      row.append(chip, name, dim, x);
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
    stop(); panel.remove(); style.remove(); delete window.__chromeCap;
  }

  // --- Wire up --------------------------------------------------------------
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

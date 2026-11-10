javascript:(async () => {
  const C = { retries: 5, longPress: 600, pickerWait: 700, afterReact: 300, nextWait: 380, loopDelay: 60, debug: true };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log = (...a) => C.debug && console.log('[fb-heart]', ...a);
  const lbl = e => (e?.getAttribute?.('aria-label') || e?.textContent || '').trim();

  // visible interactive elements (short cache)
  let cache = null, cacheT = 0;
  const vis = () => {
    const t = performance.now();
    if (cache && t - cacheT < 30) return cache;
    cacheT = t;
    return cache = [...document.querySelectorAll('div[role="button"],button,[role="button"],a,[aria-label]')].filter(e => {
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0;
    });
  };
  const flush = () => { cache = null; };
  const box = e => e.getBoundingClientRect();
  const cy = e => { const r = box(e); return (r.top + r.bottom) / 2; };
  const cx = e => { const r = box(e); return (r.left + r.right) / 2; };

  const fire = (e, type) => {
    if (!e) return;
    const r = box(e), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const o = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, buttons: 1, button: 0 };
    e.dispatchEvent(/^pointer/.test(type) ? new PointerEvent(type, { ...o, pointerId: 1, pointerType: 'mouse', isPrimary: true }) : new MouseEvent(type, o));
  };
  const until = async (fn, ms = 700, step = 40) => {
    const t = Date.now();
    while (Date.now() - t < ms) { const v = fn(); if (v) return v; await sleep(step); }
    return null;
  };

  // ---- label matching (current FB wording: "React with Like to X's post", "React to X's post") ----
  const ROW = /^(React with \w+ to |React to |Change \w+ reaction|Remove \w+ reaction|React$|Like$|Unlike$|Share\b|Actions for this post$|Menu$)/;
  const LOVE_STATE = /^(Remove|Change) Love reaction|^Love reaction/i;
  const LIKE_STATE = /^(Remove|Change) Like reaction|^Unlike$/;
  const NONE_STATE = /^React with \w+ to |^React to |^React$|^Like$/;
  const LOVE_OPT = /^(React with )?Love( to .*)?$/;
  // preference when choosing which element to press-and-hold
  const PRESS = [/^React with \w+ to /, /^(Change|Remove) \w+ reaction/, /^React to /, /^React$/, /^Like$/, /^Unlike$/];

  const KIND = {
    reel:  { prev: 'Previous card',  next: 'Next card',  tol: 120, xw: 0.35 },
    photo: { prev: 'Previous photo', next: 'Next photo', tol: 140, xw: 0.25 },
  };
  const nav = k => {
    const v = vis();
    return {
      prev: v.find(e => lbl(e) === KIND[k].prev),
      next: v.find(e => lbl(e) === KIND[k].next) || v.find(e => lbl(e).startsWith(KIND[k].next)),
    };
  };
  const kind = () => {
    if (/\/reel\//.test(location.pathname)) return 'reel';
    if (/\/photo/.test(location.pathname)) return 'photo';
    const v = vis();
    if (v.some(e => lbl(e) === 'Next card' || lbl(e) === 'Previous card')) return 'reel';
    if (v.some(e => lbl(e) === 'Next photo' || lbl(e) === 'Previous photo')) return 'photo';
    return null;
  };

  // photo viewer: only consider buttons above the "Comments" heading
  let commentsTop = null;
  const getCommentsTop = () => {
    if (commentsTop !== null) return commentsTop;
    const h = [...document.querySelectorAll('h1,h2,h3,h4,div,span')].find(e => (e.textContent || '').trim() === 'Comments' && e.getBoundingClientRect().height > 0);
    return commentsTop = h ? box(h).top : Infinity;
  };

  const rowItems = k => {
    const limit = k === 'photo' ? getCommentsTop() : Infinity;
    return vis().filter(e => ROW.test(lbl(e)) && box(e).top < limit)
      .map(e => ({ el: e, label: lbl(e), cx: cx(e), cy: cy(e) }))
      .sort((a, b) => a.cy - b.cy);
  };
  const clusters = (items, tol) => {
    const out = [];
    for (const it of items) {
      const g = out.find(g => Math.abs(it.cy - g.reduce((s, x) => s + x.cy, 0) / g.length) <= tol);
      g ? g.push(it) : out.push([it]);
    }
    return out;
  };
  const bestCluster = k => {
    const { prev, next } = nav(k), P = KIND[k];
    const ty = next ? cy(next) : prev ? cy(prev) : innerHeight / 2;
    const tx = next ? cx(next) : prev ? cx(prev) : innerWidth * (k === 'reel' ? 0.75 : 0.7);
    const cl = clusters(rowItems(k), P.tol);
    if (!cl.length) return null;
    const scored = cl.map(g => {
      const ay = g.reduce((s, x) => s + x.cy, 0) / g.length, ax = g.reduce((s, x) => s + x.cx, 0) / g.length;
      const labels = g.map(x => x.label);
      let score = Math.abs(ay - ty) + Math.abs(ax - tx) * P.xw;
      if (labels.some(l => /^React with \w+ to |^React to /.test(l))) score -= 200; // looks like a real reaction row
      if (labels.some(l => LIKE_STATE.test(l) || /^Like$/.test(l))) score -= 80;
      if (labels.some(l => LOVE_STATE.test(l))) score += 60;
      return { group: g, labels, avgY: ay, avgX: ax, score };
    }).sort((a, b) => a.score - b.score);
    log(k + ' clusters', scored.map(s => ({ labels: s.labels, y: Math.round(s.avgY), x: Math.round(s.avgX), score: Math.round(s.score) })));
    return scored[0];
  };
  const stateOf = c => {
    if (!c) return 'none';
    if (c.labels.some(l => LOVE_STATE.test(l))) return 'love';
    if (c.labels.some(l => LIKE_STATE.test(l))) return 'like';
    if (c.labels.some(l => NONE_STATE.test(l))) return 'none';
    return 'unknown';
  };
  const pressTarget = c => {
    for (const re of PRESS) { const f = c.group.find(x => re.test(x.label)); if (f) return f.el; }
    return c.group[0]?.el || null;
  };
  const findLove = (c, k) => {
    const y = c?.avgY ?? innerHeight / 2, x = c?.avgX ?? innerWidth * 0.7;
    const limit = k === 'photo' ? getCommentsTop() : Infinity;
    return vis().filter(e => LOVE_OPT.test(lbl(e)) && box(e).top < limit)
      .map(e => ({ el: e, d: Math.abs(cy(e) - y) + Math.abs(cx(e) - x) * 0.25 }))
      .sort((a, b) => a.d - b.d)[0]?.el || null;
  };

  const longPress = async e => {
    ['pointerover', 'mouseover', 'pointerenter', 'mouseenter'].forEach(t => fire(e, t));
    await sleep(50);
    fire(e, 'pointerdown'); fire(e, 'mousedown');
    await sleep(C.longPress);
    fire(e, 'pointerup'); fire(e, 'mouseup');
    flush();
  };

  async function reactLove(k) {
    commentsTop = null;
    let c = await until(() => { flush(); return bestCluster(k); }, 1500, 60);
    if (!c) { log(k + ' cluster never rendered'); return false; }
    if (stateOf(c) === 'love') return true;
    for (let i = 1; i <= C.retries; i++) {
      flush(); commentsTop = null;
      c = await until(() => { flush(); return bestCluster(k); }, 800, 40);
      if (!c) return false;
      const before = c.labels.join('|');
      const st = stateOf(c);
      log(k + ' state', st, c.labels);
      if (st === 'love') return true;
      const target = pressTarget(c);
      if (!target) return false;
      await longPress(target);
      let opt = await until(() => { flush(); return findLove(c, k); }, C.pickerWait, 40);
      if (!opt) { target.click(); await sleep(180); opt = await until(() => { flush(); return findLove(c, k); }, C.pickerWait, 40); }
      if (opt) {
        ['pointerover', 'mouseover', 'mouseenter'].forEach(t => fire(opt, t));
        await sleep(70);
        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(t => fire(opt, t));
        await sleep(C.afterReact);
        flush(); commentsTop = null;
        c = bestCluster(k);
        const after = stateOf(c);
        log(k + ' post-react', after, c?.labels);
        if (after === 'love') return true;
        // fallback: label changed and it is no longer a plain Like/React state
        if (c && c.labels.join('|') !== before && !c.labels.some(l => NONE_STATE.test(l) || LIKE_STATE.test(l))) return true;
      }
      await sleep(200 + i * 80);
    }
    return false;
  }

  async function goNext(k) {
    const n = await until(() => { flush(); return nav(k).next; }, 1200, 50);
    if (n) { n.click(); flush(); commentsTop = null; await sleep(C.nextWait); return true; }
    if (k === 'reel') { scrollBy({ top: Math.round(innerHeight * 0.9), behavior: 'smooth' }); await sleep(800); return true; }
    return false;
  }

  const seen = new Set();
  let repeats = 0;
  while (true) {
    flush();
    const k = kind();
    if (!k) { log('Unsupported page type'); break; }
    commentsTop = null;
    const c = await until(() => { flush(); return bestCluster(k); }, 1500, 60);
    const key = k + '|' + location.href + '|' + (c?.labels || []).join(',') + '|' + Math.round(c?.avgY || 0);
    if (!seen.has(key)) {
      seen.add(key);
      const ok = await reactLove(k);
      log(k + ' final', ok);
      await goNext(k);
      repeats = 0;
    } else {
      repeats++;
      await goNext(k);
    }
    if (repeats > 8) { log('stop repeated'); break; }
    await sleep(C.loopDelay);
  }
})();

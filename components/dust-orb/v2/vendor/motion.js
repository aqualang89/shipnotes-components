/* craft motion engine. Everything is a pure function of time: renderAt(t) stays seekable,
   frames come out identical on every render. Copy this file next to the scene and load it with
   <script src="motion.js"></script>; it sets globalThis.Motion.
   Born on FLY v2 (05.10.2026), Max: "на ИИ не похоже абсолютли". Recipes: kit/engine.md */
(() => {
  const TAU = Math.PI * 2
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
  const mix = (a, b, p) => a + (b - a) * p
  const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10) }
  const gate = (t, a, b) => smooth((t - a) / (b - a))
  const outCubic = x => 1 - Math.pow(1 - clamp(x), 3)

  // landing with overshoot: 0 at tau=0, crosses 1 at ~period/4, ~7% over, settled by ~period
  const spring = (tau, decay = .11, period = .6) => tau <= 0 ? 0 : 1 - Math.exp(-tau / decay) * Math.cos(TAU * tau / period)
  // squash/stretch after an impact: 1 -> squash -> small stretch -> rest. multiply heights by (1 - k*s)
  const impact = (tau, decay = .07, period = .26) => tau <= 0 ? 0 : Math.exp(-tau / decay) * Math.cos(TAU * tau / period)
  // start time of the i-th element, a fixed gap reads as a cascade, not a crowd
  const stagger = (i, start, step = .055) => start + i * step
  // light event: jumps to 1 at te, decays exponentially
  const flash = (t, te, len = .28) => t >= te ? Math.exp(-(t - te) / len) : 0
  // pulse on every beat of a grid, for glow riding the music
  const beatPulse = (t, beat, offset = 0, len = .16) => { const p = ((t - offset) % beat + beat) % beat; return Math.exp(-p / len) }

  const centroid = p => { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1] } return [x / p.length, y / p.length] }
  const area = p => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1] }, 0)) / 2
  // numeric velocity of any position function pos(t) -> [x, y]
  const velocity = (pos, t, h = 1 / 240) => { const a = pos(t - h), b = pos(t + h); return [(b[0] - a[0]) / (2 * h), (b[1] - a[1]) / (2 * h)] }
  // how stretched a shape should be at speed v (px/s); 1 = at rest
  const smearK = (v, from = 700, span = 3600, max = .85) => 1 + clamp((Math.hypot(v[0], v[1]) - from) / span, 0, max)

  // stretch a local outline (around 0,0) along v, area kept
  function smear(pts, v, k) {
    if (k <= 1.001) return pts
    const sp = Math.hypot(v[0], v[1]), ux = v[0] / sp, uy = v[1] / sp, kp = 1 / Math.sqrt(k)
    return pts.map(q => { const a = (q[0] * ux + q[1] * uy) * k, b = (-q[0] * uy + q[1] * ux) * kp; return [a * ux - b * uy, a * uy + b * ux] })
  }
  // fast flight: the stroke melts into a drop of the same area, long axis along v. amount 0..1
  function blob(pts, v, k, amount) {
    if (amount <= .001) return pts
    const A = area(pts), sp = Math.hypot(v[0], v[1]) || 1, ux = v[0] / sp, uy = v[1] / sp
    const ratio = Math.max(1, k * k), b = Math.sqrt(A / (Math.PI * ratio)), a = b * ratio
    return pts.map(q => {
      const r = Math.hypot(q[0], q[1]) || 1e-6, cx = q[0] / r, cy = q[1] / r
      const ca = cx * ux + cy * uy, sa = -cx * uy + cy * ux
      // teardrop: fuller at the head, thinner tail
      const R = a * b / Math.sqrt((b * ca) ** 2 + (a * sa) ** 2) * (1 + .18 * ca)
      return [mix(q[0], cx * R, amount), mix(q[1], cy * R, amount)]
    })
  }

  // asymmetric wingbeat / any flap: slow up, snap down past rest, settle.
  // f: 0 rest .. amp folded (negative = past rest), bob: body jolt (px), hit: decaying impulse after each snap
  function wingbeat(t, hits, o = {}) {
    const { up = .19, down = .09, settle = .14, amp = .82, over = -.07, jolt = 24, sink = 7 } = o
    let f = 0, bob = 0, hit = 0
    for (const T of hits) {
      const a = T - .03 - up, b = T - .03, c = b + down, e = c + settle
      if (t > a && t <= b) { f = amp * smooth((t - a) / up); bob += sink * smooth((t - a) / up) }
      else if (t > b && t <= c) f = mix(amp, over, smooth((t - b) / down))
      else if (t > c && t < e) f = over * (1 - smooth((t - c) / settle))
      if (t > b) { const k = t - b; bob += -jolt * Math.exp(-k / .13) * Math.sin(Math.min(k / .06, 1) * Math.PI / 2); hit += Math.exp(-k / .18) }
    }
    return { f, bob, hit }
  }

  // --- fitted to pronin.media (06.10), every curve matches the reference within 1-3 px ---
  const sineInOut = x => .5 - .5 * Math.cos(Math.PI * clamp(x))
  // overshoot once and come back with no wobble (unlike spring). s=2.4 gives ~8.6% over
  const backOut = (x, s = 2.4) => { x = clamp(x) - 1; return 1 + (s + 1) * x * x * x + s * x * x }
  // icon pop: scale s0 -> peak ~1.086 at ~.24s -> 1 at dur. content inside fades in ~.23s later
  const popIn = (tau, dur = .525, s0 = .45, s = 2.4) => tau <= 0 ? 0 : mix(s0, 1, backOut(tau / dur, s))
  // a line pushed by a newcomer: slow lead-in (amt of the way, sine.out), then the rest fast (cubic.out)
  const push = (tau, pre = .28, amt = .33, dur = .25) => tau <= 0 ? 0
    : tau < pre ? amt * Math.sin(Math.PI / 2 * tau / pre) : mix(amt, 1, outCubic((tau - pre) / dur))
  // text selection: handle pops in one frame, fill grows from the left edge. returns 0..1 of width
  const sweep = (tau, dur = .39) => sineInOut(tau / dur)
  // word in: blur and opacity in ~.1s. returns {o, blur(px)}
  const blurIn = (tau, dur = .1, from = 8) => { const p = outCubic(tau / dur); return { o: p, blur: from * (1 - p) } }

  // --- fitted to bentomotion (06.10), ring -> heart ---
  const quadIn = x => clamp(x) ** 2
  const cubicIn = x => clamp(x) ** 3
  const expoOut = x => { x = clamp(x); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x) }
  // trim path: show the part [a, b] (0..1) of an SVG path of length L. apply to stroke-dasharray/offset
  const dash = (L, a, b) => ({ array: `${Math.max(0, b - a) * L} ${L * 2}`, offset: -a * L })
  // relay: one stroke never disappears. the old shape shrinks accelerating (quad.in), at its shortest
  // the new shape takes over and writes itself decelerating (expo.out). returns {old, neu} lengths 0..1
  const relay = (tau, inDur = 1.12, outDur = 1.86) => tau < inDur
    ? { old: 1 - quadIn(tau / inDur), neu: 0 } : { old: 0, neu: expoOut((tau - inDur) / outDur) }
  // hit: fast rise to 1+amp, then smooth exponential settle, no wobble. 1 at rest
  const hitPop = (tau, amp = .19, rise = .12, decay = .21) => tau <= 0 ? 1
    : tau < rise ? 1 + amp * outCubic(tau / rise) : 1 + amp * Math.exp(-(tau - rise) / decay)
  // heartbeat: a hitPop every period from t0
  const heartbeat = (t, t0, period = .9, amp = .15) => t < t0 ? 1 : hitPop((t - t0) % period, amp)

  // --- fitted to the Gemini promo (06.10) ---
  // U-speed pan inside one shot: leaves the previous cut fast and brakes (k1), cruises, accelerates into
  // the next cut (k2). speeds in px/s, T = shot length (s). returns displacement in px. no zoom, no roll
  const uPan = (t, T, v0, vm, v1, k1 = .12, k2 = .1) => vm * t + (v0 - vm) * k1 * (1 - Math.exp(-t / k1))
    + (v1 - vm) * k2 * (Math.exp((t - T) / k2) - Math.exp(-T / k2))

  // keyframes measured off a reference: [[t, v], ...] sorted by t. smooth monotone cubic between keys
  // (Fritsch-Carlson), no overshoot between points. use when no named curve fits the measurement
  function keys(t, k) {
    const n = k.length
    if (t <= k[0][0]) return k[0][1]
    if (t >= k[n - 1][0]) return k[n - 1][1]
    const d = [], m = []
    for (let i = 0; i < n - 1; i++) d.push((k[i + 1][1] - k[i][1]) / (k[i + 1][0] - k[i][0]))
    m.push(d[0]); for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2); m.push(d[n - 2])
    for (let i = 0; i < n - 1; i++) if (d[i] === 0) { m[i] = m[i + 1] = 0 } else {
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b
      if (s > 9) { const q = 3 / Math.sqrt(s); m[i] = q * a * d[i]; m[i + 1] = q * b * d[i] }
    }
    let i = 0; while (t > k[i + 1][0]) i++
    const h = k[i + 1][0] - k[i][0], u = (t - k[i][0]) / h, u2 = u * u, u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * k[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * k[i + 1][1] + (u3 - u2) * h * m[i + 1]
  }

  // --- fitted to the Gemini promo (06.10), white frames cut the shot into windows ---
  // cubic-bezier ease like CSS / the AE speed graph: returns p -> value. y1/y2 may leave 0..1 (overshoot)
  function bezier(x1, y1, x2, y2) {
    const cx = u => 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u
    const cy = u => 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u
    return p => {
      p = clamp(p); let lo = 0, hi = 1
      for (let i = 0; i < 30; i++) { const u = (lo + hi) / 2; if (cx(u) < p) lo = u; else hi = u }
      return cy((lo + hi) / 2)
    }
  }
  // a value from v0 to v1 between t0 and t1 along an ease. tw = {v0, v1, t0, t1, bz:[x1,y1,x2,y2]} from a fit
  const tween = (t, tw) => { const e = tw.ease || (tw.ease = bezier(...tw.bz)); return mix(tw.v0, tw.v1, e((t - tw.t0) / (tw.t1 - tw.t0))) }
  // leaving the shot with a run-up: 0 before t0, dist covered at t0+dur, power p (4-6 = sits still, then gone)
  const exitIn = (t, ex) => t <= ex.t0 ? 0 : ex.dist * Math.pow((t - ex.t0) / ex.dur, ex.p)
  // camera zoom about a fixed point of the shot (an AE layer scaled around its anchor, not its centre)
  const zoomAbout = (P, s, x, y) => [P[0] + s * (x - P[0]), P[1] + s * (y - P[1])]
  // frame split: a vertical white bar at vx and a horizontal one at hy (from the vertical bar to the right
  // edge) cut a W x H shot into three windows. th = bar thickness. returns window rects and bar rects
  function frameSplit(W, H, vx, hy, th = 17) {
    const h = th / 2, xr = Math.max(0, vx + h)
    return {
      left: { x: 0, y: 0, w: Math.max(0, vx - h), h: H },
      top: { x: xr, y: 0, w: W - xr, h: Math.max(0, hy - h) },
      bottom: { x: xr, y: hy + h, w: W - xr, h: Math.max(0, H - hy - h) },
      vbar: { x: vx - h, y: 0, w: th, h: H },
      hbar: { x: xr, y: hy - h, w: W - xr, h: th }
    }
  }
  // motion blur like AE (shutter 180 = .5): gaussian sigma in px for a speed in px/frame
  const motionBlur = (vPerFrame, shutter = .5) => Math.abs(vPerFrame) * shutter / Math.sqrt(12)


  // --- Gemini promo, начало (06.10): текст на живом фоне и интерфейс, который строится на глазах ---
  // линейно между ключами [[t, v], ...]: ступеньки (слово стёрто за кадр), где кубик keys дал бы перелёт
  function lin(t, k) {
    if (t <= k[0][0]) return k[0][1]
    for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0])
    return k[k.length - 1][1]
  }
  // печать: n букв напечатано (дробное), k-я буква (с 0) проступает за ramp; свежая буква светится голубым и остывает за tau (кадры)
  const typed = (n, k, ramp = 1) => clamp((n - k) / ramp + 1)
  const glowDecay = (age, tau = 4.2) => age <= 0 ? 1 : Math.exp(-age / tau)
  // чип прыгает сверху: сдвиг dist гаснет по экспоненте tau (кадры), из размытия и прозрачности. f, ts в кадрах
  const chipPop = (f, ts, tau = 4.5, dist = 30) => { const a = f - ts; return { on: a > -.5, dy: -dist * Math.exp(-Math.max(0, a) / tau), o: clamp((a + .5) / 3.5), blur: 5 * clamp(1 - a / 6) } }
  // живой фон: сумма гауссовых пятен [cx, cy, sx, sy, r, g, b] на тёмной основе, рисуется в канвас малого размера
  // (браузер растягивает с интерполяцией). blobs берутся по кадру из подгонки (etudes/gemini-text/zamer/bgfit.py)
  function paintBlobs(canvas, blobs, base = [6.5, 4.5, 9.5], vw = 720, vh = 405) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height
    const img = canvas._img || (canvas._img = ctx.createImageData(W, H)), d = img.data
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = (i + .5) * vw / W, y = (j + .5) * vh / H; let r = base[0], g = base[1], b = base[2]
      for (const p of blobs) {
        const dx = (x - p[0]) / Math.max(Math.abs(p[2]), 8), dy = (y - p[1]) / Math.max(Math.abs(p[3]), 8), w = Math.exp(-.5 * (dx * dx + dy * dy))
        r += w * p[4]; g += w * p[5]; b += w * p[6]
      }
      const o = (j * W + i) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }
  // SVG-фильтр «срезы»: горизонтальные полосы со сдвигом и смаз по x. рывок камеры, стирание слова. set(amount 0..1, seed)
  function sliceFilter(defs, id, ns = 'http://www.w3.org/2000/svg') {
    const f = document.createElementNS(ns, 'filter')
    for (const [k, v] of Object.entries({ id, x: '-30%', y: '-40%', width: '160%', height: '180%', 'color-interpolation-filters': 'sRGB' })) f.setAttribute(k, v)
    const mk = (tag, attrs) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); f.appendChild(e); return e }
    const noise = mk('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.004 0.3', numOctaves: 1, seed: 1, result: 'n' })
    const disp = mk('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 0, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' })
    const blur = mk('feGaussianBlur', { in: 'd', stdDeviation: '0 0' })
    defs.appendChild(f)
    return { id, set(a, seed = 1) { noise.setAttribute('seed', seed); disp.setAttribute('scale', 34 * a); blur.setAttribute('stdDeviation', `${2.2 * a} 0`) } }
  }
  // SVG-фильтр «плавление»: шум сдвигает буквы, размытие и порог по альфе дробят их на искры; m 1 -> 0 собирает чистый текст
  function meltFilter(defs, id, ns = 'http://www.w3.org/2000/svg') {
    const f = document.createElementNS(ns, 'filter')
    for (const [k, v] of Object.entries({ id, x: '-10%', y: '-80%', width: '120%', height: '260%', 'color-interpolation-filters': 'sRGB' })) f.setAttribute(k, v)
    const mk = (tag, attrs, par = f) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); par.appendChild(e); return e }
    mk('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.1 0.13', numOctaves: 2, seed: 7, result: 'n' })
    const disp = mk('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 0, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' })
    const blur = mk('feGaussianBlur', { in: 'd', stdDeviation: 0, result: 'b' })
    const ct = mk('feComponentTransfer', { in: 'b' }), fa = mk('feFuncA', { type: 'linear', slope: 1, intercept: 0 }, ct)
    defs.appendChild(f)
    return { id, set(m) { disp.setAttribute('scale', 22 * m); blur.setAttribute('stdDeviation', .9 * m); fa.setAttribute('slope', 1 + 5 * m); fa.setAttribute('intercept', -4 * m) } }
  }
  // --- fitted to the Gemini promo (06.10, cloud), blurred gradients that no analytic model holds ---
  // measured colour field: G = {first, cols, rows, cell, frames:[[r,g,b,...] per frame]} (cell-median colours of the
  // reference, star/text/frames cut out). Draws frame f (fractional = linear mix of the neighbours) into ctx as a
  // W x H bicubic (Catmull-Rom) surface. For a 1:1 copy of an AE gradient/blur background: no curve to fit, no seams
  function fieldDraw(ctx, G, f, W = 720, H = 405) {
    const n = G.frames.length, fi = clamp(f - G.first, 0, n - 1), i0 = Math.floor(fi), i1 = Math.min(n - 1, i0 + 1), a = fi - i0
    const { cols, rows, cell } = G
    const wts = (size, count) => { // per output pixel: 4 clamped taps + Catmull-Rom weights
      const idx = new Int16Array(size * 4), w = new Float32Array(size * 4)
      for (let x = 0; x < size; x++) {
        const u = (x + .5) / cell - .5, b = Math.floor(u), t = u - b
        const k = [(-t * t * t + 2 * t * t - t) / 2, (3 * t * t * t - 5 * t * t + 2) / 2, (-3 * t * t * t + 4 * t * t + t) / 2, (t * t * t - t * t) / 2]
        for (let j = 0; j < 4; j++) { idx[x * 4 + j] = Math.max(0, Math.min(count - 1, b - 1 + j)); w[x * 4 + j] = k[j] }
      }
      return { idx, w }
    }
    const c = G._c && G._c.W === W && G._c.H === H ? G._c : (G._c = { W, H, X: wts(W, cols), Y: wts(H, rows), tmp: new Float32Array(rows * W * 3), img: ctx.createImageData(W, H) })
    const A = G.frames[i0], B = G.frames[i1], { X, Y, tmp, img } = c
    for (let r = 0; r < rows; r++) for (let x = 0; x < W; x++) for (let ch = 0; ch < 3; ch++) {
      let v = 0
      for (let j = 0; j < 4; j++) { const o = (r * cols + X.idx[x * 4 + j]) * 3 + ch; v += X.w[x * 4 + j] * (A[o] * (1 - a) + B[o] * a) }
      tmp[(r * W + x) * 3 + ch] = v
    }
    const d = img.data
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let ch = 0; ch < 3; ch++) {
      let v = 0
      for (let j = 0; j < 4; j++) v += Y.w[y * 4 + j] * tmp[(Y.idx[y * 4 + j] * W + x) * 3 + ch]
      d[(y * W + x) * 4 + ch] = v < 0 ? 0 : v > 255 ? 255 : v + .5
    }
    for (let i = 3; i < d.length; i += 4) d[i] = 255
    ctx.putImageData(img, 0, 0)
  }

  // --- fitted to the Gemini promo hub (06.10, cloud) ---
  // line that draws itself from both ends toward the middle (hub connectors): p 0..0.5 is the drawn share from each
  // end, L the path length. returns the stroke-dasharray string; at p >= .5 the line is whole
  const dashBoth = (L, p) => p >= .5 ? `${L} ${L}` : `${p * L} ${L - 2 * p * L} ${p * L} ${L}`
  // soft front of a left-to-right reveal: x1..x2 of a white -> black gradient (userSpaceOnUse) for a mask. edge = where
  // the text is fully gone, w = how wide the fade is. the typed/wiped text trails a glowing blur like the reference
  const softFront = (edge, w = 18) => ({ x1: edge - w, x2: edge + 1 })
  // camera zoom about a fixed point as an SVG transform (scene content stays in "gauge" units of the last shot)
  const camZoom = (s, cx, cy) => `translate(${cx} ${cy}) scale(${s.toFixed(4)}) translate(${-cx} ${-cy})`

  // breathing that loops exactly over a clip of length D: n whole cycles
  const breathe = (t, D, cycles = 6, phase = 0) => Math.sin(TAU * cycles / D * t + phase)

  // liquid outline (Gemini 06.10, zamery in etudes/etude-gemini-pushin/ZAMERY.md): a hit at the source xs sends a wave along the edge of a
  // glass field. displacement (px, inward positive) at x and time t: exp(-(xs-x)/L) * s(t - (xs-x)/c). w = {xs, c, L, s: keys [[t, v], ...]}
  // (t, c in one unit, e.g. frames and px/frame). Past the source the edge follows s(t) itself (the cap of the pill)
  const liquidEdge = (t, x, w) => { const d = Math.max(0, w.xs - x); return Math.exp(-d / w.L) * keys(t - d / w.c, w.s) }
  // outline of a rounded field (w x h, radius h/2) with the wave pushed in along the top, the bottom and the right cap (normal inward).
  // disp(x) -> px. returns an SVG path string in the field's own coordinates; the left cap stays round (the wave dies long before it)
  function liquidPill(w, h, disp, step = 4) {
    const r = h / 2, pts = [], cx = w - r
    for (let x = r; x <= cx; x += step) pts.push([x, disp(x)])
    for (let a = -90; a <= 90; a += 6) {   // right cap, clockwise
      const th = a * Math.PI / 180, nx = Math.cos(th), ny = Math.sin(th), x = cx + r * nx, d = disp(Math.min(x, w))
      pts.push([x - nx * d, r + r * ny - ny * d])
    }
    for (let x = cx; x >= r; x -= step) pts.push([x, h - disp(x)])
    const left = []; for (let a = 90; a <= 270; a += 6) { const th = a * Math.PI / 180; left.push([r + r * Math.cos(th), r + r * Math.sin(th)]) }
    return 'M' + pts.concat(left).map(p => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join('L') + 'Z'
  }
  // soft ring of light running out of a click: radius v*(t-t0), amplitude from keys a (any unit), asymmetric profile: the inner side is
  // soft (sin), the outer side falls off quickly (sout). returns {r, a, sin, sout}; a = 0 before t0
  const clickRing = (t, o) => t < o.t0 ? { r: 0, a: 0, sin: o.sin, sout: o.sout } : { r: o.v * (t - o.t0), a: keys(t, o.a), sin: o.sin, sout: o.sout }

  // SVG pixel glitch: <filter> that turns a shape into blocks. region = user space of the element
  // that uses it ({x,y,w,h}, e.g. a group translated to the centre: x:-540, y:-880, w:1080, h:1920).
  // returns {id, set(size)}; apply with filter="url(#id)" only while size > 0
  function pixelFilter(defs, id, region, ns = 'http://www.w3.org/2000/svg') {
    const f = document.createElementNS(ns, 'filter'), r = region
    for (const [k, v] of Object.entries({ id, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', x: r.x, y: r.y, width: r.w, height: r.h })) f.setAttribute(k, v)
    const mk = (tag, attrs) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); f.appendChild(e); return e }
    const flood = mk('feFlood', { 'flood-color': '#fff', width: 2, height: 2 })
    const comp = mk('feComposite', { x: r.x, y: r.y })
    mk('feTile', { result: 'grid' })
    mk('feComposite', { in: 'SourceGraphic', in2: 'grid', operator: 'in' })
    const morph = mk('feMorphology', { operator: 'dilate' })
    defs.appendChild(f)
    const set = size => {
      const s = Math.max(2, Math.round(size))
      flood.setAttribute('x', r.x + s / 2); flood.setAttribute('y', r.y + s / 2)
      comp.setAttribute('width', s); comp.setAttribute('height', s)
      morph.setAttribute('radius', s / 2)
    }
    set(10)
    return { id, set }
  }

  // --- bentomotion 07: веер iPhone -> лепестки -> спицы ---------------------------------------------------
  // веер: n одинаковых деталей по кругу вокруг (cx, cy). theta - общий поворот веера в градусах (деталь 0 стоит на этом угле,
  // отсчёт как в экране: 0 = вправо, по часовой), i-я идёт на 360*i/n дальше. деталь рисуют ОДИН раз в системе веера:
  // начало в центре веера, наружу = вверх (y < 0). возвращает {angle, transform} для <g> i-й детали.
  // свой разброс старта деталей это просто своя theta/своё t у i-й: передавать theta + stagger.
  function fan(i, n, theta, cx = 0, cy = 0) {
    const a = theta + 360 * i / n
    return { angle: a, transform: `translate(${cx} ${cy}) rotate(${(a + 90).toFixed(3)})` }
  }
  // таблица замера по кадрам, линейно между кадрами: tab = {f0, v:[...]}, v[j] число, массив или объект {поле: массив}.
  // с key берёт поле строки; нет поля ни слева, ни справа -> null, есть с одной стороны -> держит его.
  function frameTable(tab, f, key) {
    const i = f - tab.f0, n = tab.v.length - 1, j = clamp(Math.floor(i), 0, n), k = Math.min(j + 1, n), u = clamp(i - j, 0, 1)
    let a = tab.v[j], b = tab.v[k]
    if (key !== undefined) { a = a && a[key]; b = b && b[key] }
    if (a == null || b == null) return a == null ? (b == null ? null : b) : a
    return Array.isArray(a) ? a.map((x, q) => x + (b[q] - x) * u) : a + (b - a) * u
  }
  // замкнутый путь по точкам, Катмулл-Ром -> кубики
  function smoothClosed(P) {
    const n = P.length, f = q => q.map(v => v.toFixed(2)).join(' ')
    let d = `M${f(P[0])}`
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n]
      d += `C${f([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${f([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${f(p2)}`
    }
    return d + 'Z'
  }
  // контур формы по радиусам из центра: row = [cx, cy, r0 .. r(N-1)], луч i под углом -pi + 2 pi i / N. многоугольник (углы остаются острыми)
  // при N >= 64, smooth=true гладит кубиками для малого N. так лепесток-полудиск идёт по кадрам замера
  function polarPath(row, N = row.length - 2, smooth = false) {
    const P = []
    for (let i = 0; i < N; i++) { const a = -Math.PI + i * 2 * Math.PI / N, r = row[2 + i]; P.push([row[0] + r * Math.cos(a), row[1] + r * Math.sin(a)]) }
    return smooth ? smoothClosed(P) : 'M' + P.map(q => q.map(v => v.toFixed(2)).join(' ')).join('L') + 'Z'
  }
  // «форма в штрих»: лепесток сплющивается в линзу-спицу. L = [cx, cy, ux, uy, lo, hi, w0..w8, s0..s8]: ось (u) через центр,
  // lo..hi вдоль оси, w - ширина на 9 станциях, s - уход оси вбок. pad дорисовывает то, что порог замера съедает (концы +1,2 px, ширина +0,9)
  function lensPath(L, padEnd = 1.2, padW = .9) {
    const [cx, cy, ux, uy] = L, lo = L[4] - padEnd, hi = L[5] + padEnd, W = L.slice(6, 15), S = L.slice(15, 24), n = 9, nx = -uy, ny = ux, up = [], dn = []
    up.push([cx + ux * lo, cy + uy * lo])
    for (let i = 0; i < n; i++) {
      const t = lo + (hi - lo) * (i + .5) / n, c = [cx + ux * t + nx * S[i], cy + uy * t + ny * S[i]], hw = (Math.max(W[i], .2) + padW) / 2
      up.push([c[0] + nx * hw, c[1] + ny * hw]); dn.push([c[0] - nx * hw, c[1] - ny * hw])
    }
    up.push([cx + ux * hi, cy + uy * hi]); dn.reverse()
    return smoothClosed([...up, ...dn])
  }

  globalThis.Motion = { TAU, clamp, mix, smooth, gate, outCubic, spring, impact, stagger, flash, beatPulse,
    centroid, area, velocity, smearK, smear, blob, wingbeat, breathe, pixelFilter,
    sineInOut, backOut, popIn, push, sweep, blurIn,
    quadIn, cubicIn, expoOut, dash, relay, hitPop, heartbeat, keys, uPan,
    bezier, tween, exitIn, zoomAbout, frameSplit, motionBlur,
    lin, typed, glowDecay, chipPop, paintBlobs, sliceFilter, meltFilter,
    fieldDraw, dashBoth, softFront, camZoom,
    liquidEdge, liquidPill, clickRing,
    fan, frameTable, smoothClosed, polarPath, lensPath }
})()

// --- bentomotion 05, Mac из свечения (07.10): подмена через свет и морф скругления. Дописано в конец, чтобы не конфликтовать с параллельными задачами ---
;(() => {
  const { clamp, smooth, lin } = Motion
  // подмена через вспышку света: старая форма гаснет в свету (до середины), новая выходит из него (после середины).
  // tau = t - t0, dur = длина подмены. Возвращает {out, in, light}: непрозрачность старой, новой и сила света (колокол, пик в середине)
  const lightSwap = (tau, dur = .3, power = 1.4) => {
    const u = clamp(tau / dur)
    return { out: 1 - smooth(clamp(u * 2)), in: smooth(clamp(u * 2 - 1)), light: Math.pow(Math.sin(Math.PI * u), power) }
  }
  // морф скругления: прямоугольник -> капсула -> круг по ключам рамки. k = {x0, y0, x1, y1, r}: каждый канал [[t, v], ...] (линейно, ключи с замера по кадру).
  // r ограничен половиной меньшей стороны: когда r дорос, форма стала капсулой (w != h) или кругом (w == h)
  const roundMorph = (t, k) => {
    const x0 = lin(t, k.x0), y0 = lin(t, k.y0), x1 = lin(t, k.x1), y1 = lin(t, k.y1), w = x1 - x0, h = y1 - y0
    const rx = Math.min(lin(t, k.r), w / 2, h / 2)
    return { x: x0, y: y0, w, h, r: rx, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, round: rx / (Math.min(w, h) / 2) }
  }
  Object.assign(Motion, { lightSwap, roundMorph })
})()

// --- bentomotion Home -> отпечаток (cloud/06): загрузка по обводке, скруглённый квадрат, повтор трассы ---
;(() => {
  const M = globalThis.Motion
  // loadArc: бегущий кусок обводки-круга ("загрузка"). круг радиуса R из центра (0,0), идёт по часовой от угла a0 (град),
  // нарисован ДВА раза подряд, поэтому голова может обгонять старт. from/to в градусах по ходу (to может быть > 360).
  // d класть в path один раз, array/offset менять каждый кадр. хвост догоняет голову: from -> to
  const loadArc = (R, a0 = 0) => {
    const a = a0 * Math.PI / 180, p = k => [R * Math.cos(a + k * Math.PI), R * Math.sin(a + k * Math.PI)]
    const f = n => n.toFixed(3), P = k => p(k).map(f).join(' ')
    const d = `M${P(0)}A${R} ${R} 0 1 1 ${P(1)}A${R} ${R} 0 1 1 ${P(2)}A${R} ${R} 0 1 1 ${P(3)}A${R} ${R} 0 1 1 ${P(4)}`
    const L = 4 * Math.PI * R
    return { d, L, at: (from, to) => M.dash(L, from / 720, Math.max(from, to) / 720) }
  }
  // roundRect: скруглённый квадрат (центр cx,cy, полусторона h, скругление rc, поворот phi град). rc >= h даёт круг:
  // квадрат плавно становится кругом и обратно одной кривой (кнопка Home: круг -> квадрат за 18 кадров)
  const roundRect = (cx, cy, h, rc, phi = 0) => {
    rc = Math.max(.01, Math.min(rc, h)); const q = h - rc, a = phi * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
    const P = (x, y) => `${(cx + x * c - y * s).toFixed(2)} ${(cy + x * s + y * c).toFixed(2)}`
    const A = (x, y) => `A${rc} ${rc} 0 0 1 ${P(x, y)}`
    return `M${P(-q, -h)}L${P(q, -h)}${A(h, -q)}L${P(h, q)}${A(q, h)}L${P(-q, h)}${A(-h, q)}L${P(-h, -q)}${A(-q, -h)}Z`
  }
  // traceSync: повтор векторной трассы кадра. items = [[толщина, 'rrggbb', [x,y,x,y...]], ...] (скелет штрихов с кадра),
  // рисует их round-cap путями в группу g, лишние пути прячет. ключи прямо по замеру, когда штрихи рвутся и не отслеживаются
  const traceSync = (g, items) => {
    const ns = 'http://www.w3.org/2000/svg'
    while (g.children.length < items.length) {
      const p = document.createElementNS(ns, 'path'); p.setAttribute('fill', 'none')
      p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); g.appendChild(p)
    }
    for (let i = 0; i < g.children.length; i++) {
      const p = g.children[i], it = items[i]
      if (!it) { p.style.display = 'none'; continue }
      const a = it[2]; let d = `M${a[0]} ${a[1]}`
      if (a.length === 2) d += `l.01 0`; for (let j = 2; j < a.length; j += 2) d += `L${a[j]} ${a[j + 1]}`
      p.style.display = ''; p.setAttribute('d', d); p.setAttribute('stroke-width', it[0]); p.setAttribute('stroke', '#' + it[1])
    }
  }
  Object.assign(M, { loadArc, roundRect, traceSync })
})()

// --- game feel (13.10): тряска травмой, стоп-кадр, уровни силы, цифра на ударе.
// Из скилла game-feel (gamedev-skills, Apache-2.0), переложено на чистые функции времени ---
;(() => {
  const M = Motion, { clamp, mix, outCubic, backOut } = M
  // травма 0..1 к моменту t: удары [[t0, сила], ...] прибавляют, между ними тает на decay в секунду
  const trauma = (t, hits, decay = 1.2) => {
    let tr = 0, last = -1e9
    for (const [th, a] of [...hits].sort((p, q) => p[0] - q[0])) {
      if (th > t) break
      tr = Math.min(1, Math.max(0, tr - decay * (th - last)) + a); last = th
    }
    return Math.max(0, tr - decay * (t - last))
  }
  // тряска камеры: сила = травма^pow (мелкое почти не шевелит, крупное бьёт), качание суммой синусов, а не рандомом (рандом жужжит).
  // {x, y} px, rot в градусах, k = текущая сила. Двигать камеру/обёртку, не сам предмет
  const shake = (t, hits, { x = 12, y = 8, rot = 4, decay = 1.2, pow = 2, seed = 0 } = {}) => {
    const k = Math.pow(trauma(t, hits, decay), pow), n = s => .6 * Math.sin(t * 11 + s) + .4 * Math.sin(t * 23 + s * 2)
    return { x: x * k * n(seed + 1.3), y: y * k * n(seed + 7.1), rot: rot * k * n(seed + 3.7), k }
  }
  // стоп-кадр: время сцены почти встаёт на dur с момента t0 (scale доля скорости), потом идёт дальше с отставанием.
  // stops [[t0, dur, scale=.05], ...] в реальном времени ролика. renderAt(hitStop(t, stops)) вместо renderAt(t)
  const hitStop = (t, stops) => {
    let lt = t
    for (const [t0, dur, scale = .05] of stops) if (t > t0) lt -= (Math.min(t, t0 + dur) - t0) * (1 - scale)
    return lt
  }
  // уровни силы: один удар = пачка откликов за ~100 мс, сила по важности события. tick интерфейса не трясёт кадр как взрыв.
  // sfx = какой звук ставить (тот же уровень в звуковом движке)
  const TIERS = {
    small: { trauma: .15, stop: 0, flash: 0, zoom: 0, particles: 3, sfx: 'tick' },
    medium: { trauma: .4, stop: .05, flash: .6, zoom: .012, particles: 8, sfx: 'hit' },
    large: { trauma: .85, stop: .12, flash: 1, zoom: .03, particles: 30, sfx: 'boom' },
  }
  // всё сразу: events [[t0, 'small'|'medium'|'large'], ...] -> {t: время сцены после стоп-кадров, x, y, rot, flash, zoom}
  const juice = (t, events, opts = {}) => {
    const ev = events.map(([t0, tier]) => [t0, TIERS[tier] || tier])
    const s = shake(t, ev.map(([t0, p]) => [t0, p.trauma]), opts)
    let flash = 0, zoom = 1
    for (const [t0, p] of ev) if (t >= t0) { const a = t - t0; flash = Math.max(flash, p.flash * Math.exp(-a / .06)); zoom += p.zoom * Math.exp(-a / .12) }
    return { t: hitStop(t, ev.filter(([, p]) => p.stop).map(([t0, p]) => [t0, p.stop])), x: s.x, y: s.y, rot: s.rot, flash, zoom }
  }
  // цифра на ударе: выскакивает с перелётом, всплывает, гаснет; i задаёт свой разлёт вбок, пачка расходится веером. tau = t - t0
  const numberPop = (tau, i = 0, { rise = 60, drift = 26, dur = .9 } = {}) => {
    if (tau < 0 || tau > dur) return { on: false, x: 0, y: 0, s: 0, o: 0 }
    // чётные влево, нечётные вправо, разброс .45-1 от drift: соседи никогда не слипаются
    const u = tau / dur, h = Math.sin(i * 12.9898 + 4.1) * 43758.5453, side = (i % 2 ? 1 : -1) * (.45 + .55 * (h - Math.floor(h)))
    return { on: true, x: side * drift * outCubic(u), y: -rise * outCubic(u), s: mix(.4, 1, backOut(tau / .22)), o: clamp((1 - u) / .4) }
  }
  Object.assign(M, { trauma, shake, hitStop, TIERS, juice, numberPop })
})()

// --- наезд на ударное слово (15.10, замер IronOre @meilanunicorn, масштаб камеры ORB по кадрам) ---
// множитель масштаба камеры: за rise прыжок с перелётом, потом оседание экспонентой к 1+amt.
// soft = «нейронка?» 0,9 с: 1 -> 1.98 за 2 кадра -> 1.765 (settle .18), ошибка 0,006 масштаба.
// hard = 5,8 с: 1 -> 1.52 за кадр -> 1.45 за 3 кадра (settle .044), ошибка 0,002.
// Зумить вокруг неподвижной точки (у них лицо, ~0.47w x 0.45h): zoomAbout / camZoom. Удары складывать умножением
;(() => {
  const M = Motion, oc = x => 1 - Math.pow(1 - x, 3)
  const PUNCH = { soft: { amt: .765, over: .28, settle: .18, rise: 2 / 30 }, hard: { amt: .45, over: .15, settle: .044, rise: 1 / 30 } }
  const punchIn = (tau, opts = 'soft') => {
    const { amt, over, settle, rise } = typeof opts == 'string' ? PUNCH[opts] : { ...PUNCH.soft, ...opts }
    if (tau < 0) return 1
    if (tau < rise) return 1 + amt * (1 + over) * oc(tau / rise)
    return 1 + amt * (1 + over * Math.exp(-(tau - rise) / settle))
  }
  Object.assign(M, { PUNCH, punchIn })
})()

// Type Garden observation: extend, open, then reveal internal drawing.
// Durations are an authored interpretation of IMG_3012, not a pixel-fitted curve.
;(() => {
  const M=Motion;
  function botanicalGrowth(age,{duration=.95,attach=0}={}){
    const u=M.clamp(age/Math.max(.001,duration),0,1);
    return {
      stem:1-(1-u)**2,
      arrival:duration*(1-Math.sqrt(1-M.clamp(attach,0,1))),
      silhouette:M.smooth(M.clamp(age/.58,0,1)),
      fruit:M.smooth(M.clamp(age/.42,0,1)),
      blade:M.smooth(M.clamp((age-.08)/.56,0,1)),
      ink:M.smooth(M.clamp((age-.27)/.43,0,1))
    };
  }
  Object.assign(M,{botanicalGrowth});
})();

/* Hadal v2 / Ship Notes. Three.js r180, MIT. A scroll down to the bottom of the ocean. */
(() => {
  const T = window.THREE
  const cv = document.getElementById('sea')
  const RM = matchMedia('(prefers-reduced-motion: reduce)')
  const coarse = matchMedia('(pointer: coarse)').matches
  const $ = id => document.getElementById(id)

  const r = new T.WebGLRenderer({canvas: cv, antialias: true, powerPreference: 'high-performance'})
  r.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2))
  r.toneMapping = T.NeutralToneMapping
  const scene = new T.Scene()
  const cam = new T.PerspectiveCamera(50, 1, .1, 220)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }

  // ---------- depth <-> page position ----------
  const zones = [...document.querySelectorAll('.zone')].map(el => ({el, d0: +el.dataset.from, d1: +el.dataset.to, name: el.dataset.name}))
  let K = .01, eye = 0
  function layout() {
    for (const z of zones) { z.y0 = z.el.offsetTop; z.y1 = z.y0 + z.el.offsetHeight }
    eye = innerHeight * .5
    K = 2 * Math.tan(cam.fov * Math.PI / 360) * 10 / innerHeight // 1 px of scroll = K units at 10 units away
  }
  const depthAt = y => {
    for (const z of zones) if (y < z.y1) return z.d0 + (z.d1 - z.d0) * clamp((y - z.y0) / (z.y1 - z.y0), 0, 1)
    return zones.at(-1).d1
  }
  const yAt = d => {
    for (const z of zones) if (z.d1 > z.d0 && d <= z.d1) return z.y0 + (d - z.d0) / (z.d1 - z.d0) * (z.y1 - z.y0)
    return zones.at(-1).y0
  }
  const worldY = docY => -docY * K

  // ---------- light: pure water takes red first, blue last (per meter) ----------
  const KABS = [.36, .07, .023]
  const WATER = [.035, .3, .46]
  const tr = (d, i) => Math.exp(-KABS[i] * d)
  const water = new T.Color(), sun = new T.Color()
  function lightAt(d) {
    water.setRGB(...[0, 1, 2].map(i => WATER[i] * Math.pow(tr(d, i), .32) + [.002, .005, .008][i]), T.LinearSRGBColorSpace)
    sun.setRGB(...[0, 1, 2].map(i => Math.pow(tr(d, i), .5)), T.LinearSRGBColorSpace)
    return Math.max(tr(d, 0), tr(d, 1), tr(d, 2))
  }

  scene.fog = new T.FogExp2(0, .03)
  const hemi = new T.HemisphereLight(0xffffff, 0x000000, 1); scene.add(hemi)
  const sunL = new T.DirectionalLight(0xffffff, 2.4); sunL.position.set(.3, 1, .4); scene.add(sunL)
  const torch = new T.SpotLight(0xdfeeff, 0, 40, .36, .55, 1.2); scene.add(torch, torch.target)

  // ---------- marine snow ----------
  const N = coarse ? 90000 : 180000
  const BOX = new T.Vector3(34, 26, 30)
  const sg = new T.BufferGeometry(), pos = new Float32Array(N * 3), seed = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * BOX.x; pos[i * 3 + 1] = (Math.random() - .5) * BOX.y; pos[i * 3 + 2] = 2 - Math.random() * BOX.z
    seed[i] = Math.random()
  }
  sg.setAttribute('position', new T.BufferAttribute(pos, 3)); sg.setAttribute('aSeed', new T.BufferAttribute(seed, 1))
  sg.boundingSphere = new T.Sphere(new T.Vector3(), 1e4)
  const taps = Array.from({length: 6}, () => new T.Vector4(0, 0, 0, -99))
  const snowU = {
    uTime: {value: 0}, uCamY: {value: 0}, uBox: {value: BOX}, uVel: {value: 0},
    uRayO: {value: new T.Vector3()}, uRayD: {value: new T.Vector3(0, 0, -1)}, uPart: {value: 1.6},
    uSun: {value: new T.Color()}, uFlash: {value: 0}, uLightDir: {value: new T.Vector3(0, 0, -1)},
    uTaps: {value: taps}, uPx: {value: 300}, uFogD: {value: .03}, uMotion: {value: 1},
  }
  const snow = new T.Points(sg, new T.ShaderMaterial({
    uniforms: snowU, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    vertexShader: `
      uniform float uTime, uCamY, uVel, uPart, uFlash, uPx, uFogD, uMotion;
      uniform vec3 uBox, uRayO, uRayD, uSun, uLightDir;
      uniform vec4 uTaps[6];
      attribute float aSeed;
      varying vec3 vCol; varying float vStreak, vNear;
      void main() {
        vec3 p = position;
        float t = uTime * uMotion;
        p.y -= t * (.12 + aSeed * .22);
        p.y = uCamY + mod(p.y - uCamY + uBox.y * .5, uBox.y) - uBox.y * .5;
        p.x += sin(t * .23 + aSeed * 40.) * .35;
        // part around the pointer like a hand through water
        vec3 v = p - uRayO; float k = max(0., dot(v, uRayD));
        vec3 df = p - (uRayO + uRayD * k); float dl = length(df);
        p += df / max(dl, 1e-3) * smoothstep(uPart, 0., dl) * uPart * .75;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        float z = -mv.z;
        vStreak = clamp(abs(uVel) * .035, 0., 7.);
        vNear = smoothstep(4.5, 1.2, z);
        gl_PointSize = min(64., (.04 + aSeed * .06) * (1. + vStreak * 1.4) * (1. + vNear * 2.5) * uPx / z);
        vec3 dir = normalize(p - cameraPosition);
        float cone = smoothstep(.935, .99, dot(dir, uLightDir)) * uFlash * exp(-z * .06);
        float glow = 0.;
        for (int i = 0; i < 6; i++) {
          float a = uTime - uTaps[i].w;
          if (a > 0. && a < 5.) {
            float d = distance(p, uTaps[i].xyz), front = a * 3.2;
            glow += (exp(-(d - front) * (d - front) * 1.4) * exp(-a * .9) + exp(-d * d * .35) * exp(-a * 1.6)) * step(.55, fract(aSeed * 7.31));
          }
        }
        vCol = uSun * (.32 + aSeed * .35) + vec3(.8, .88, 1.) * cone * 1.5 + vec3(.2, .7, 1.) * glow * 1.6;
        vCol *= exp(-z * uFogD) * (.55 + .45 * smoothstep(.0, .2, aSeed)) * (1. - vNear * .65);
      }`,
    fragmentShader: `
      varying vec3 vCol; varying float vStreak, vNear;
      void main() {
        vec2 c = gl_PointCoord - .5;
        float a;
        if (vStreak > .25) { float w = .5 / (1. + vStreak * 1.6); a = smoothstep(w, 0., abs(c.x)) * smoothstep(.5, .3, abs(c.y)); }
        else a = smoothstep(.5, mix(.15, 0., vNear), length(c));
        if (a < .01) discard;
        gl_FragColor = vec4(vCol * a, 1.);
      }`,
  }))
  snow.frustumCulled = false
  scene.add(snow)

  // ---------- surface and god rays ----------
  const SURF = 3.2
  const surfU = {uTime: {value: 0}, uAmt: {value: 1}}
  const surf = new T.Mesh(new T.PlaneGeometry(260, 260), new T.ShaderMaterial({
    uniforms: surfU, transparent: true, depthWrite: false, side: T.DoubleSide, fog: false,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      uniform float uTime, uAmt; varying vec2 vP;
      float n(vec2 p){ return sin(p.x) * sin(p.y); }
      void main(){
        vec2 p = vP * .55; float t = uTime * .6;
        float c = n(p + vec2(t, t * .7)) + n(p * 1.7 - vec2(t * .8, -t)) * .6 + n(p * 3.1 + t) * .3;
        c = pow(abs(c) * .55, .6);
        float win = exp(-length(vP) * .045);
        vec3 col = mix(vec3(.05, .3, .42), vec3(.6, .9, 1.), c * .6 + win * .4) * (.3 + win * .9);
        gl_FragColor = vec4(col * uAmt, (.85 * win + .15) * uAmt * smoothstep(125., 50., length(vP)));
      }`,
  }))
  surf.rotation.x = Math.PI / 2; surf.position.y = SURF; scene.add(surf)

  const rayU = {uTime: {value: 0}, uAmt: {value: 1}}
  const rayMat = new T.ShaderMaterial({
    uniforms: rayU, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false,
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      uniform float uTime, uAmt; varying vec2 vU;
      void main(){
        float edge = smoothstep(0., .5, vU.x) * smoothstep(1., .5, vU.x);
        float fade = pow(max(0., vU.y), 2.2);
        float flick = .7 + .3 * sin(uTime * .9 + vU.y * 5.);
        gl_FragColor = vec4(vec3(.62, .9, 1.) * edge * fade * flick * .2 * uAmt, 1.);
      }`,
  })
  const rays = new T.Group(); scene.add(rays)
  for (let i = 0; i < 9; i++) {
    const w = .6 + Math.random() * 1.6, h = 34
    const m = new T.Mesh(new T.PlaneGeometry(w, h), rayMat)
    m.position.set((Math.random() - .5) * 22, SURF - h / 2, -6 - Math.random() * 16)
    m.rotation.z = .16 + (Math.random() - .5) * .05; m.userData.s = Math.random() * 6
    rays.add(m)
  }

  // ---------- the red can: same red the whole way down, only the light changes ----------
  const label = document.createElement('canvas'); label.width = 512; label.height = 256
  {
    const c = label.getContext('2d')
    c.fillStyle = '#d0121b'; c.fillRect(0, 0, 512, 256)
    c.fillStyle = '#f6f1ea'; c.font = '700 120px "Barlow Condensed", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText('COLA', 256, 134)
    c.fillRect(0, 22, 512, 6); c.fillRect(0, 228, 512, 6)
  }
  const labelTex = new T.CanvasTexture(label); labelTex.colorSpace = T.SRGBColorSpace
  const can = new T.Group()
  const body = new T.Mesh(new T.CylinderGeometry(.33, .33, 1.2, 48, 1, true), new T.MeshStandardMaterial({map: labelTex, roughness: .32, metalness: .35}))
  const lids = new T.MeshStandardMaterial({color: 0xc9ccd1, roughness: .3, metalness: .8})
  const lt = new T.Mesh(new T.CylinderGeometry(.3, .33, .08, 48), lids); lt.position.y = .64
  const lb = lt.clone(); lb.position.y = -.64; lb.rotation.x = Math.PI
  can.add(body, lt, lb); scene.add(can)
  can.rotation.z = .35
  let canDrop = null
  const _v = new T.Vector3()


  // ---------- life: jellies glow on their own, the torch lights them, a tap makes them flash ----------
  const lit = `
    uniform vec3 uLightDir; uniform float uFlash;
    float torchAt(vec3 wp) {
      vec3 d = wp - cameraPosition; float z = length(d);
      return smoothstep(.93, .985, dot(d / z, uLightDir)) * uFlash * exp(-z * .05);
    }`
  const shared = {uTime: snowU.uTime, uLightDir: snowU.uLightDir, uFlash: snowU.uFlash}
  const jellies = []
  function jelly(d, x, z, size, hue) {
    const g = new T.Group(), u = {...shared, uCol: {value: new T.Color().setHSL(hue, .7, .55)}, uGlow: {value: .5}, uBoom: {value: 0}, uPh: {value: Math.random() * 9}}
    const bell = new T.Mesh(new T.SphereGeometry(1, 48, 20, 0, Math.PI * 2, 0, Math.PI * .56), new T.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: lit + `
        uniform float uTime, uPh; varying vec3 vN, vW, vL; varying vec2 vU; varying float vT;
        void main() {
          float pulse = pow(max(0., .5 + .5 * sin(uTime * 1.6 + uPh)), 3.);
          vec3 p = position;
          float rim = 1. - uv.y;
          p.xz *= 1. - pulse * .16 * rim; p.y *= .72 + pulse * .1;
          vec4 w = modelMatrix * vec4(p, 1.);
          vW = w.xyz; vL = position; vU = uv; vN = normalize(mat3(modelMatrix) * normal);
          vT = torchAt(w.xyz);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        uniform vec3 uCol; uniform float uGlow, uBoom; varying vec3 vN, vW, vL; varying vec2 vU; varying float vT;
        void main() {
          vec3 v = normalize(cameraPosition - vW);
          float fr = pow(max(0., 1. - abs(dot(vN, v))), 2.2);
          float ang = atan(vL.z, vL.x);
          float canal = smoothstep(.9, 1., cos(ang * 8.)) * (1. - vU.y * .3);
          float rim = smoothstep(.16, 0., vU.y);
          vec3 c = uCol * (fr * .9 + canal * .35 + rim * 1.1) * (uGlow + uBoom * 2.5);
          c += vec3(.8, .9, 1.) * vT * (fr * .9 + .12);
          gl_FragColor = vec4(c, 1.);
        }`,
    }))
    g.add(bell)
    // tentacles: one line set per jelly, all motion in the shader
    const TN = 14, SEGS = 36, tp = []
    for (let k = 0; k < TN; k++) for (let i = 0; i < SEGS; i++) for (const j of [i, i + 1]) tp.push(k / TN * Math.PI * 2, j / SEGS, k)
    const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.Float32BufferAttribute(tp, 3))
    const tent = new T.LineSegments(tg, new T.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: lit + `
        uniform float uTime, uPh; varying float vA, vT;
        void main() {
          float a = position.x, s = position.y, k = position.z;
          float L = 2.6 + fract(k * .37) * 2.6;
          vec3 p = vec3(cos(a) * .78, -.05, sin(a) * .78) * (1. - s * .35);
          p.y -= s * L;
          p.x += sin(uTime * 1.1 + s * 5. + k + uPh) * s * .45;
          p.z += cos(uTime * .9 + s * 4. + k * 1.7) * s * .35;
          vec4 w = modelMatrix * vec4(p, 1.);
          vA = (1. - s) * .8; vT = torchAt(w.xyz);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `uniform vec3 uCol; uniform float uGlow, uBoom; varying float vA, vT;
        void main(){ gl_FragColor = vec4((uCol * (uGlow + uBoom * 2.) * .55 + vec3(.7, .8, .9) * vT * .7) * vA, 1.); }`,
    }))
    tent.frustumCulled = false
    g.add(tent)
    g.scale.setScalar(size)
    g.userData = {d, x, z, u, home: new T.Vector3(), off: new T.Vector3(), vel: new T.Vector3(), ph: u.uPh.value}
    scene.add(g); jellies.push(g)
  }
  // twilight: few and faint; midnight: more and brighter. Seeded, so every visit looks the same
  const R = (n => () => (n = (n * 16807) % 2147483647) / 2147483647)(7)
  for (let i = 0; i < 6; i++) jelly(320 + i * 110, (R() - .5) * 14, -9 - R() * 8, .7 + R() * .6, .55 + R() * .08)
  for (let i = 0; i < 14; i++) jelly(1150 + i * 190, (R() - .5) * 18, -8 - R() * 12, .6 + R() * 1.1, R() < .8 ? .47 + R() * .1 : .72 + R() * .05)

  // siphonophore: one creature as long as a blue whale, you scroll along it
  const SN = 520, sp = new Float32Array(SN * 3), sa = new Float32Array(SN)
  const sipU = {...shared, uPx: snowU.uPx, uBoom: {value: 0}}
  const sip = new T.Points(new T.BufferGeometry(), new T.ShaderMaterial({
    uniforms: sipU, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    vertexShader: lit + `
      uniform float uTime, uPx, uBoom; attribute float aI; varying vec3 vC;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.), mv = viewMatrix * w;
        gl_Position = projectionMatrix * mv;
        float wave = pow(max(0., .5 + .5 * sin(aI * .09 - uTime * 2.2)), 6.);
        gl_PointSize = (.09 + wave * .05) * uPx / -mv.z;
        vC = vec3(.35, .65, 1.) * (.25 + wave * 1.3 + uBoom * 2.) + vec3(.8, .9, 1.) * torchAt(w.xyz) * 1.5;
      }`,
    fragmentShader: `varying vec3 vC; void main(){ float a = smoothstep(.5, 0., length(gl_PointCoord - .5)); if (a < .01) discard; gl_FragColor = vec4(vC * a, 1.); }`,
  }))
  sip.frustumCulled = false; scene.add(sip)

  // sea floor: sediment that only the torch can show
  const floorU = {...shared, uBase: {value: new T.Color()}}
  const floor = new T.Mesh(new T.PlaneGeometry(160, 160, 1, 1), new T.ShaderMaterial({
    uniforms: floorU, transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: lit + `
      varying vec3 vW; uniform vec3 uBase;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + 1.), f.x), f.y); }
      void main(){
        float rip = .5 + .5 * sin(vW.x * 2.3 + n(vW.xz * .5) * 6.);
        float s = n(vW.xz * .7) * .45 + n(vW.xz * 3.1) * .25 + n(vW.xz * 13.) * .15 + rip * .15;
        float pebble = smoothstep(.93, .97, n(vW.xz * 6.));
        float t = torchAt(vW);
        gl_FragColor = vec4(vec3(.62, .6, .55) * (s * s * .75 + pebble * .35), clamp(t * 1.6, 0., 1.));
      }`,
  }))
  floor.rotation.x = -Math.PI / 2; scene.add(floor)

  function placeLife() {
    for (const j of jellies) { const u = j.userData; u.home.set(u.x, worldY(yAt(u.d)), u.z) }
    const top = worldY(yAt(2300)), bot = worldY(yAt(3900)), pts = []
    for (let i = 0; i < 9; i++) pts.push(new T.Vector3(Math.sin(i * 1.3) * 6 - 2, top + (bot - top) * i / 8, -13 + Math.cos(i * .9) * 3))
    const curve = new T.CatmullRomCurve3(pts)
    for (let i = 0; i < SN; i++) { const p = curve.getPoint(i / (SN - 1)); sp.set([p.x + Math.sin(i * 1.7) * .06, p.y, p.z], i * 3); sa[i] = i }
    sip.geometry.setAttribute('position', new T.BufferAttribute(sp, 3)); sip.geometry.setAttribute('aI', new T.BufferAttribute(sa, 1))
  }

  const _w = new T.Vector3()
  function life(t, dt, depth) {
    for (const j of jellies) {
      const u = j.userData, visible = Math.abs(depth - u.d) < 900
      j.visible = visible; if (!visible) continue
      // shy: drift out of the torch beam a little, then come back home
      const toRay = _v.copy(j.position).sub(ray.ray.origin), k = toRay.dot(ray.ray.direction)
      const off = toRay.sub(_w.copy(ray.ray.direction).multiplyScalar(k)), dl = off.length()
      if (snowU.uFlash.value > .2 && dl < 3) u.vel.addScaledVector(off.normalize(), (3 - dl) * dt * 1.2)
      u.vel.addScaledVector(u.off, -dt * .6).multiplyScalar(1 - dt * .9)
      u.off.addScaledVector(u.vel, dt)
      j.position.copy(u.home).add(u.off)
      j.position.y += Math.sin(t * .4 + u.ph) * .25
      j.rotation.z = Math.sin(t * .3 + u.ph) * .12
      u.u.uGlow.value = .18 + .5 * smooth(250, 1300, u.d)
      let boom = 0
      for (const tp of taps) { const a = snowU.uTime.value - tp.w; if (a > 0 && a < 5) { const dd = _w.set(tp.x, tp.y, tp.z).distanceTo(j.position); boom += Math.exp(-((a - dd / 3.2) ** 2) * 10) } }
      u.u.uBoom.value = boom
    }
    let sb = 0
    for (const tp of taps) { const a = snowU.uTime.value - tp.w; if (a > 0 && a < 4) sb += Math.exp(-((a - .5) ** 2) * 6) }
    sipU.uBoom.value = sb
    sip.visible = depth > 1800 && depth < 4400
  }


  // ---------- post: lens glow, a little color split at the edges, film grain ----------
  const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`
  const brightM = new T.ShaderMaterial({uniforms: {tSrc: {value: null}, uTh: {value: .5}}, vertexShader: VS, depthTest: false,
    fragmentShader: `uniform sampler2D tSrc; uniform float uTh; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tSrc, vUv).rgb; c = clamp(c, 0., 64.); float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uTh, uTh + .45, l), 1.); }`})
  const blurM = new T.ShaderMaterial({uniforms: {tSrc: {value: null}, uDir: {value: new T.Vector2()}}, vertexShader: VS, depthTest: false,
    fragmentShader: `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(tSrc, vUv).rgb * .227;
        c += (texture2D(tSrc, vUv + uDir * 1.385).rgb + texture2D(tSrc, vUv - uDir * 1.385).rgb) * .316;
        c += (texture2D(tSrc, vUv + uDir * 3.231).rgb + texture2D(tSrc, vUv - uDir * 3.231).rgb) * .07;
        gl_FragColor = vec4(c, 1.);
      }`})
  const compM = new T.ShaderMaterial({uniforms: {tSrc: {value: null}, tB1: {value: null}, tB2: {value: null}, uTime: {value: 0}, uRes: {value: new T.Vector2()}, uBloom: {value: 1}, uGrain: {value: 1}},
    vertexShader: VS, depthTest: false,
    fragmentShader: `uniform sampler2D tSrc, tB1, tB2; uniform float uTime, uBloom, uGrain; uniform vec2 uRes; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 d = vUv - .5; float r2 = dot(d, d);
        vec2 off = d * r2 * .014;
        vec3 c = vec3(texture2D(tSrc, vUv + off).r, texture2D(tSrc, vUv).g, texture2D(tSrc, vUv - off).b);
        c = clamp(c, 0., 64.);
        c += (texture2D(tB1, vUv).rgb * .75 + texture2D(tB2, vUv).rgb * 1.15) * uBloom;
        c *= 1. - r2 * .6;
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb += (h(vUv * uRes + fract(uTime * 7.31) * 113.) - .5) * .045 * uGrain;
      }`})
  const postScene = new T.Scene(), postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), compM); quad.frustumCulled = false; postScene.add(quad)
  let rtMain, rtA, rtB, rtC, rtD
  function makeTargets(w, h) {
    for (const t of [rtMain, rtA, rtB, rtC, rtD]) t?.dispose()
    const o = {type: T.HalfFloatType}
    rtMain = new T.WebGLRenderTarget(w, h, {...o, samples: 4})
    rtA = new T.WebGLRenderTarget(w >> 2, h >> 2, o); rtB = rtA.clone()
    rtC = new T.WebGLRenderTarget(w >> 3, h >> 3, o); rtD = rtC.clone()
    compM.uniforms.uRes.value.set(w, h)
  }
  function pass(m, u, target) {
    for (const k in u) m.uniforms[k].value = u[k]
    quad.material = m; r.setRenderTarget(target); r.render(postScene, postCam)
  }
  const _d = new T.Vector2()
  function renderPost(t) {
    r.setRenderTarget(rtMain); r.render(scene, cam)
    pass(brightM, {tSrc: rtMain.texture}, rtA)
    pass(blurM, {tSrc: rtA.texture, uDir: _d.set(1 / rtA.width, 0)}, rtB)
    pass(blurM, {tSrc: rtB.texture, uDir: _d.set(0, 1 / rtA.height)}, rtA)
    pass(blurM, {tSrc: rtA.texture, uDir: _d.set(1.5 / rtC.width, 0)}, rtC)
    pass(blurM, {tSrc: rtC.texture, uDir: _d.set(0, 1.5 / rtC.height)}, rtD)
    pass(blurM, {tSrc: rtD.texture, uDir: _d.set(2.5 / rtC.width, 0)}, rtC)
    pass(blurM, {tSrc: rtC.texture, uDir: _d.set(0, 2.5 / rtC.height)}, rtD)
    compM.uniforms.uTime.value = t
    pass(compM, {tSrc: rtMain.texture, tB1: rtA.texture, tB2: rtD.texture}, null)
  }

  // ---------- input ----------
  const ptr = new T.Vector2(.25, -.1), ptrS = ptr.clone(), ray = new T.Raycaster()
  let moved = false, tapN = 0
  addEventListener('pointermove', e => { ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); moved = true }, {passive: true})
  addEventListener('pointerdown', e => {
    if (e.target.closest('button,a')) return
    ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); moved = true
    ray.setFromCamera(ptr, cam)
    const p = ray.ray.at(9, new T.Vector3())
    taps[tapN++ % taps.length].set(p.x, p.y, p.z, snowU.uTime.value)
    ping(depth)
  }, {passive: true})

  // ---------- sound: deep wash that gets lower as you sink, sonar on tap ----------
  let ac, wash, washF, washG
  const btn = $('sound')
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true'
    btn.setAttribute('aria-pressed', on); btn.textContent = on ? 'Sound on' : 'Sound off'
    if (on && !ac) {
      ac = new AudioContext()
      const len = ac.sampleRate * 4, b = ac.createBuffer(2, len, ac.sampleRate)
      for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let last = 0; for (let i = 0; i < len; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5 } }
      wash = ac.createBufferSource(); wash.buffer = b; wash.loop = true
      washF = ac.createBiquadFilter(); washF.type = 'lowpass'; washF.frequency.value = 600
      washG = ac.createGain(); washG.gain.value = 0
      wash.connect(washF).connect(washG).connect(ac.destination); wash.start()
    }
    if (ac) { on ? ac.resume() : ac.suspend() }
  })
  let whaleDone = false
  function whale() {
    // far away whale: slow glide with a wobble, mostly reverb
    const t = ac.currentTime, o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain(), f = ac.createBiquadFilter()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(190, t); o.frequency.linearRampToValueAtTime(260, t + 1.4); o.frequency.linearRampToValueAtTime(120, t + 3.6)
    lfo.frequency.value = 5; lg.gain.value = 6; lfo.connect(lg).connect(o.frequency)
    f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 6
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.09, t + .9); g.gain.exponentialRampToValueAtTime(.0001, t + 3.8)
    const dl = ac.createDelay(1.5), fb = ac.createGain(); dl.delayTime.value = .45; fb.gain.value = .45
    o.connect(f).connect(g); g.connect(ac.destination); g.connect(dl); dl.connect(fb).connect(dl); dl.connect(ac.destination)
    o.start(t); lfo.start(t); o.stop(t + 4); lfo.stop(t + 4)
  }
  function ping(d) {
    if (!ac || ac.state !== 'running') return
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), dl = ac.createDelay(1), fb = ac.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(d > 1000 ? 1250 : 1700, t); o.frequency.exponentialRampToValueAtTime(d > 1000 ? 1150 : 1600, t + .6)
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + 1.1)
    dl.delayTime.value = .32; fb.gain.value = .38
    o.connect(g); g.connect(ac.destination); g.connect(dl); dl.connect(fb).connect(dl); dl.connect(ac.destination)
    o.start(t); o.stop(t + 1.2)
  }

  // ---------- copy reveal ----------
  const copies = zones.map(z => ({c: z.el.querySelector('.copy'), z}))
  function fadeCopy() {
    for (const {c, z} of copies) {
      const pr = (scrollY + innerHeight - z.y0) / (z.y1 - z.y0 + innerHeight * .2)
      const a = z === zones[0] ? 1 - smooth(.3, .55, scrollY / (z.y1 - z.y0)) : smooth(.18, .3, pr) * (z === zones.at(-1) ? 1 : 1 - smooth(.82, .95, pr))
      const o = a.toFixed(3)
      if (c._o !== o) { c._o = o; c.style.opacity = o; c.style.transform = `translateY(${((1 - a) * 14).toFixed(1)}px)` }
    }
  }
  if (coarse) document.querySelectorAll('.ptr').forEach(s => s.textContent = 'finger')

  // ---------- HUD ----------
  const hud = {d: $('depth'), z: $('zone'), a: $('atm'), l: $('light'), dot: $('dot')}
  const fmt = n => Math.round(n).toLocaleString('en-US')
  const pct = v => v >= .01 ? Math.round(v * 100) + '%' : v * 100 >= 1e-6 ? (v * 100).toPrecision(1).replace(/^(\d)e-(\d+)$/, (m, a, b) => '0.' + '0'.repeat(+b - 1) + a) + '%' : '0%'
  let last = {}
  function hudSet(d, light) {
    const z = zones.find(z => z.name && d >= z.d0 && d <= z.d1 && z.d1 > z.d0) || zones.at(-1)
    const v = {d: fmt(d), z: d >= 10930 ? 'Challenger Deep' : z.name || 'Surface', a: fmt(1 + d / 10.06), l: pct(light)}
    for (const k in v) if (v[k] !== last[k]) { hud[k].textContent = v[k]; last[k] = v[k] }
    hud.dot.style.top = (d / 10935 * 100) + '%'
  }

  // ---------- loop ----------
  let sY = scrollY, depth = 0, vel = 0, t = 0, prev = performance.now()
  function resize() {
    const w = innerWidth, h = innerHeight
    r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix()
    makeTargets(Math.round(w * r.getPixelRatio()), Math.round(h * r.getPixelRatio()))
    layout(); snowU.uPx.value = h * r.getPixelRatio() * .5; placeLife()
  }
  addEventListener('resize', resize); resize()
  document.fonts.ready.then(() => { layout(); placeLife(); labelTex.needsUpdate = true; const c = label.getContext('2d'); c.fillStyle = '#d0121b'; c.fillRect(0, 60, 512, 150); c.fillStyle = '#f6f1ea'; c.font = '700 120px "Barlow Condensed", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('COLA', 256, 134) })

  // recording: the page stops its own clock and a script steps it frame by frame
  let capturing = false
  function frame(now) {
    requestAnimationFrame(frame)
    const dt = Math.min(.05, (now - prev) / 1000); prev = now
    if (!capturing) step(dt)
  }
  function step(dt) {
    const motion = RM.matches ? 0 : 1
    t += dt
    const target = scrollY, before = sY
    sY += (target - sY) * Math.min(1, dt * 7)
    vel += ((sY - before) / Math.max(dt, 1e-3) * K - vel) * Math.min(1, dt * 10)
    depth = depthAt(sY + eye)
    const camY = worldY(sY + eye)
    const light = lightAt(depth)

    // camera: looks up at the surface at the start, levels out by ~40 m, sways with the pointer
    ptrS.lerp(ptr, Math.min(1, dt * 3))
    const pitch = .42 * (1 - smooth(0, 35, depth)) - .3 * smooth(10300, 10935, depth)
    cam.position.set(ptrS.x * .25 * motion, camY, 0)
    cam.rotation.set(pitch + ptrS.y * .03 * motion, -ptrS.x * .05 * motion, 0)
    cam.updateMatrixWorld()

    scene.background = water; scene.fog.color.copy(water)
    const fogD = .012 + .05 * smooth(0, 400, depth)
    scene.fog.density = fogD
    hemi.color.copy(sun).multiplyScalar(.55); hemi.groundColor.copy(water)
    sunL.color.copy(sun); sunL.intensity = 2.6 * (1 - smooth(150, 700, depth))
    surfU.uTime.value = t; surfU.uAmt.value = 1 - smooth(5, 90, depth)
    rayU.uTime.value = t; rayU.uAmt.value = 1 - smooth(30, 180, depth)
    rays.children.forEach(m => { m.scale.x = 1 + .25 * Math.sin(t * .5 + m.userData.s) * motion })

    // torch: the pointer is the light below ~1000 m; on touch it drifts until the finger takes over
    const flash = smooth(450, 1100, depth)
    if (coarse && !moved) ptr.set(Math.sin(t * .4) * .45, Math.cos(t * .31) * .25)
    ray.setFromCamera(ptrS, cam)
    torch.position.copy(cam.position); torch.target.position.copy(ray.ray.at(10, new T.Vector3())); torch.intensity = flash * 60
    snowU.uTime.value = t; snowU.uCamY.value = camY; snowU.uVel.value = vel * motion; snowU.uMotion.value = motion ? 1 : .15
    snowU.uRayO.value.copy(ray.ray.origin); snowU.uRayD.value.copy(ray.ray.direction)
    snowU.uLightDir.value.copy(ray.ray.direction); snowU.uFlash.value = flash
    snowU.uSun.value.copy(sun).multiplyScalar(1 - smooth(300, 900, depth) * .92).add(new T.Color(.025, .035, .05))
    snowU.uFogD.value = fogD * .9

    // the can rides along through the sunlight zone, then you leave it behind
    if (depth < 190) { can.position.copy(cam.localToWorld(_v.set(Math.min(1.75, Math.tan(cam.fov * Math.PI / 360) * 5.2 * cam.aspect * .55), (cam.aspect < .8 ? -1.15 : -.15) + Math.sin(t * .8) * .1, -5.2))); canDrop = null }
    else if (!canDrop) canDrop = can.position.clone()
    can.rotation.y += dt * .35 * motion; can.rotation.x = Math.sin(t * .5) * .15 * motion
    can.visible = depth < 420

    life(t, dt, depth)
    floorU.uBase.value.copy(water)
    floor.position.y = Math.min(worldY(yAt(10935)), camY) - 2.4
    fadeCopy()
    if (washG && ac.state === 'running') {
      // the deeper, the darker the rumble; scrolling fast pushes water past your ears
      const at = ac.currentTime
      washF.frequency.setTargetAtTime(70 + 900 * Math.exp(-depth / 1800) + Math.min(700, Math.abs(vel) * 40), at, .15)
      washG.gain.setTargetAtTime(.22 + Math.min(.3, Math.abs(vel) * .02), at, .2)
      if (!whaleDone && depth > 700 && depth < 1300) { whaleDone = true; whale() }
    }
    hudSet(depth, light)
    renderPost(t)
  }
  requestAnimationFrame(frame)
  window.hadal = {depthAt, yAt, get depth() { return depth },
    capture(on) { capturing = on; document.documentElement.classList.toggle('cap', on); layout() },
    step, ptr(x, y) { ptr.set(x, y); ptrS.set(x, y); moved = true },
    tap(x, y) { ptr.set(x, y); ray.setFromCamera(ptr, cam); const p = ray.ray.at(9, new T.Vector3()); taps[tapN++ % taps.length].set(p.x, p.y, p.z, snowU.uTime.value) }}
})()

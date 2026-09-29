// Jelly Stack: three project cards made of jelly. WebGL1, no dependencies.
(() => {
if (customElements.get('jelly-stack')) return;

const NX = 9, NY = 9, N = NX * NY, SUB = 3, RX = (NX - 1) * SUB + 1, RY = (NY - 1) * SUB + 1, NB = 200;
const DT = 1 / 240;
const KSM = 260, KH = 300, KS = 420, KD = 260, KB = 90, CS = 2.2, DAMP = 3.4;
const KG = 1200, CG = 30, KW = 3000, KZ = 70, DZ = 4.5;
const SLOTS = [[0, 0, 0, 1], [-17, -22, -6, .95], [19, -39, 7, .89]], DIMS = [1, .87, .76];
const JELLY = ['#e5344a', '#f28a1e', '#7658ec'];
const POKES = [[.3, .34], [.7, .3], [.52, .6], [.26, .68], [.74, .66]];
const DEFAULTS = [
  {title: 'Orbit', tag: 'BRAND & WEB', description: 'A home for your next big idea.', href: 'https://example.com/#orbit'},
  {title: 'Forma', tag: 'DESIGN SYSTEM', description: 'A small system for making things feel consistent.', href: 'https://example.com/#forma'},
  {title: 'Echo', tag: 'DIGITAL PRODUCT', description: 'A quieter place for your favourite sounds.', href: 'https://example.com/#echo'}
];

const lerp = (a, b, t) => a + (b - a) * t;
const eio = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const eout = t => 1 - (1 - t) ** 3;
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const palette = h => {
  const c = rgb(h);
  return {col: c, deep: c.map(v => v ** 1.7 * .72), glow: c.map(v => Math.min(1, v ** .6 * 1.1)), sh: c.map(v => v ** 1.5 * .35 + .08)};
};

const HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
const RR = 'float rr(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}\n';
const VS_TOP = `attribute vec2 a_uv;attribute vec4 a_p;attribute vec4 a_f;attribute vec2 a_h;
uniform vec2 u_res,u_org;
varying vec2 v_uv,v_p,v_s,v_tx,v_ty;varying float v_th,v_z;
void main(){v_uv=a_uv;v_p=a_p.xy;v_s=a_p.zw;v_tx=a_f.xy;v_ty=a_f.zw;v_th=a_h.x;v_z=a_h.y;
vec2 c=(a_p.xy-u_org)/u_res*2.-1.;gl_Position=vec4(c.x,-c.y,0.,1.);}`;
// top face: bevel from the rounded-rect SDF, gloss from a ceiling softbox, print refracted by the surface slope
const FS_TOP = `uniform sampler2D u_tex;
uniform vec2 u_size;uniform float u_rad,u_bev,u_T,u_aa,u_dim,u_al;
uniform vec3 u_col,u_deep,u_glow,u_cam;uniform vec4 u_b1,u_b2;
varying vec2 v_uv,v_p,v_s,v_tx,v_ty;varying float v_th,v_z;
float soft(vec2 p,vec4 b,float f){vec2 q=abs(p-b.xy)-b.zw;return 1.-smoothstep(-f,f,length(max(q,0.))+min(max(q.x,q.y),0.));}
void main(){
vec2 hs=u_size*.5,p=(v_uv-.5)*u_size;
float d=rr(p,hs,u_rad),m=clamp(.5-d/u_aa,0.,1.);
if(m<=0.)discard;
float t=clamp(1.+d/u_bev,0.,1.),hb=sqrt(1.-t*t);
vec2 g=vec2(rr(p+vec2(.5,0.),hs,u_rad)-rr(p-vec2(.5,0.),hs,u_rad),rr(p+vec2(0.,.5),hs,u_rad)-rr(p-vec2(0.,.5),hs,u_rad));
vec2 b=-g*(u_T/u_bev)*min(t/max(hb,.01),3.);
// a soft pillow dome on top, so the softboxes slide along the curve instead of sitting flat
vec2 uq=v_uv*2.-1.,u3=uq*uq*uq,u4=u3*uq;
float dome=u_T*.7*(1.-u4.x)*(1.-u4.y);
b+=u_T*.7*vec2(-4.*u3.x*(1.-u4.y)*2./u_size.x,-4.*u3.y*(1.-u4.x)*2./u_size.y);
vec2 s=v_s+b.x*v_tx+b.y*v_ty;
vec3 n=normalize(vec3(-s,1.));
vec3 P=vec3(v_p,v_z+u_T*hb+dome),V=normalize(u_cam-P),L=normalize(vec3(-.45,-.62,.64));
vec3 R=reflect(-V,n);
float env=.14;
if(R.z>.02){vec2 h=P.xy+R.xy*(u_cam.z-P.z)/R.z;env=.4+3.2*soft(h,u_b1,u_size.x*.22)+2.4*soft(h,u_b2,u_size.x*.08);}
float F=.05+.95*pow(1.-max(dot(n,V),0.),5.);
float th=hb*v_th;
vec3 body=mix(u_glow,u_col,smoothstep(.05,.75,th));
body=mix(body,u_deep,clamp((v_th-1.)*1.4+v_z/u_T*.3,0.,.6));
body=mix(body,u_glow,clamp(-v_z/u_T*.35,0.,.4));
body*=.86+.24*dot(n,L);
body+=u_glow*.45*(1.-hb)*max(-dot(n.xy,L.xy)*2.2,0.);
vec4 pr=texture2D(u_tex,v_uv+v_s*9./u_size);
vec3 col=body*(1.-pr.a*.95)+pr.rgb*.95*mix(vec3(1.),u_glow,.12);
col*=u_dim;
col+=F*env+pow(max(dot(n,normalize(L+V)),0.),30.)*.14;
float a=m*u_al*mix(.82,1.,smoothstep(0.,.45,hb));
gl_FragColor=vec4(min(col,vec3(1.))*a,a);}`;
const VS_WALL = `attribute vec4 a_w;uniform vec2 u_res,u_org;varying float v_k,v_f;
void main(){v_k=a_w.z;v_f=a_w.w;vec2 c=(a_w.xy-u_org)/u_res*2.-1.;gl_Position=vec4(c.x,-c.y,0.,1.);}`;
const FS_WALL = `uniform vec3 u_col,u_deep,u_glow;uniform float u_dim,u_al;varying float v_k,v_f;
void main(){vec3 c=mix(u_col,u_deep*.78,smoothstep(0.,1.,v_k));
c+=u_glow*(.4*(1.-v_k)*(1.-v_k)+.3*smoothstep(.7,1.,v_k))*(.35+.65*v_f);
c*=u_dim*(.78+.22*v_f);float a=.97*u_al;gl_FragColor=vec4(c*a,a);}`;
const VS_SH = `attribute vec4 a_s;uniform vec2 u_res,u_org;varying vec2 v_uv;
void main(){v_uv=a_s.zw;vec2 c=(a_s.xy-u_org)/u_res*2.-1.;gl_Position=vec4(c.x,-c.y,0.,1.);}`;
const FS_SH = `uniform vec2 u_size;uniform float u_rad,u_pad,u_blur,u_str;uniform vec3 u_shc;varying vec2 v_uv;
void main(){vec2 p=(v_uv-.5)*(u_size+2.*u_pad);float d=rr(p,u_size*.5,u_rad);
float a=u_str*(1.-smoothstep(-u_blur*.7,u_blur,d));gl_FragColor=vec4(u_shc*a,a);}`;

const CSS = `:host{display:block;width:min(100%,460px);color:#2b2521;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;position:relative}
*{box-sizing:border-box}
.deck{position:relative;margin:72px 0 36px;touch-action:none;-webkit-user-select:none;user-select:none;cursor:grab;-webkit-tap-highlight-color:transparent}
.deck.drag{cursor:grabbing}
canvas{position:absolute;display:block;pointer-events:none}
.hit{position:absolute;left:0;right:0;top:-64px;bottom:0}
.panel{position:absolute;inset:0;pointer-events:none}
.sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.visit{position:absolute;display:block;border-radius:12px;pointer-events:auto;color:inherit;-webkit-tap-highlight-color:transparent}
.visit:focus-visible{outline:2px solid #2b2521;outline-offset:3px}
.panel[inert] .visit{display:none}
.tabs{padding:6px;background:#ffffff94;border:1px solid #2b252114;border-radius:18px;display:flex;gap:5px;box-shadow:0 1px 0 #fff inset,0 12px 30px -20px #2b252166}
.tab{flex:1;min-width:0;min-height:48px;border:0;border-radius:13px;background:transparent;color:#7a7068;font:inherit;font-size:13px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background .25s,color .25s,transform .18s;-webkit-tap-highlight-color:transparent}
.tab[aria-selected=true]{background:#fff;color:#2b2521;box-shadow:0 2px 8px #2b25211f}
.tab:active{transform:scale(.96)}
.tab:focus-visible{outline:2px solid #2b2521;outline-offset:2px}
.tab b{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px;background:var(--dot);vertical-align:1px}
.help{text-align:center;font-size:10px;letter-spacing:1.6px;margin-top:16px;color:#978c82}
:host([recording]) .help{visibility:hidden}
.flat .panel{pointer-events:auto;border-radius:26px;background:var(--c);color:#fffbf6;padding:26px 28px 76px;box-shadow:0 22px 40px -22px #2b252199;transform-origin:50% 50%;display:flex;flex-direction:column;justify-content:flex-end}
.flat .sr{position:static;width:auto;height:auto;margin:0 0 10px;overflow:visible;clip:auto;white-space:normal}
.flat h2{font:400 44px/1 Georgia,serif}
.flat .visit{position:absolute;left:28px;bottom:24px;color:#fffbf6}
@media (prefers-reduced-motion:reduce){.tab{transition:none}}`;

function prog(gl, vs, fs) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, a = {};
  for (let i = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i--;) { const n = gl.getActiveUniform(p, i).name; u[n] = gl.getUniformLocation(p, n); }
  for (let i = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i--;) { const n = gl.getActiveAttrib(p, i).name; a[n] = gl.getAttribLocation(p, n); }
  return {p, u, a};
}
function grid(nx, ny) {
  const ix = new Uint16Array((nx - 1) * (ny - 1) * 6);
  let k = 0;
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i;
    ix.set([a, a + 1, a + nx, a + 1, a + nx + 1, a + nx], k); k += 6;
  }
  return ix;
}
// Catmull-Rom weights of the 4x4 nodes around (u, v), so the mesh bends smoothly between nodes
function weights(u, v, idx, w, o) {
  const cr = t => { const t2 = t * t, t3 = t2 * t; return [(-t3 + 2 * t2 - t) / 2, (3 * t3 - 5 * t2 + 2) / 2, (-3 * t3 + 4 * t2 + t) / 2, (t3 - t2) / 2]; };
  const fu = Math.max(0, Math.min(1, u)) * (NX - 1), fv = Math.max(0, Math.min(1, v)) * (NY - 1);
  const iu = Math.min(Math.floor(fu), NX - 2), iv = Math.min(Math.floor(fv), NY - 2), wu = cr(fu - iu), wv = cr(fv - iv);
  for (let b = 0; b < 4; b++) for (let a = 0; a < 4; a++) {
    const cx = Math.max(0, Math.min(NX - 1, iu - 1 + a)), cy = Math.max(0, Math.min(NY - 1, iv - 1 + b));
    idx[o] = cy * NX + cx; w[o++] = wu[a] * wv[b];
  }
}
function outline(W, H, r) {
  const hw = W / 2, hh = H / 2, sw = W - 2 * r, sh = H - 2 * r, arc = Math.PI * r / 2;
  const segs = [
    [sw, s => [-hw + r + s, -hh, 0, -1]], [arc, s => corner(hw - r, -hh + r, -Math.PI / 2 + s / r)],
    [sh, s => [hw, -hh + r + s, 1, 0]], [arc, s => corner(hw - r, hh - r, s / r)],
    [sw, s => [hw - r - s, hh, 0, 1]], [arc, s => corner(-hw + r, hh - r, Math.PI / 2 + s / r)],
    [sh, s => [-hw, hh - r - s, -1, 0]], [arc, s => corner(-hw + r, -hh + r, Math.PI + s / r)]
  ];
  function corner(cx, cy, a) { return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(a), Math.sin(a)]; }
  const per = segs.reduce((t, s) => t + s[0], 0), pts = [];
  for (let k = 0; k < NB; k++) {
    let s = k / NB * per, i = 0;
    while (s > segs[i][0] && i < 7) s -= segs[i++][0];
    pts.push(segs[i][1](s));
  }
  return pts;
}
function rrect(x, X, Y, w, h, r) {
  x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r);
  x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath();
}
function spaced(x, t, X, Y, ls) { for (const ch of t) { x.fillText(ch, X, Y); X += x.measureText(ch).width + ls; } }
const spacedW = (x, t, ls) => [...t].reduce((w, ch) => w + x.measureText(ch).width + ls, -ls);
function wrap(x, t, X, Y, max, lh, lines) {
  const words = t.split(/\s+/), out = [];
  let line = '';
  for (const wd of words) {
    const next = line ? line + ' ' + wd : wd;
    if (x.measureText(next).width > max && line) { out.push(line); line = wd; } else line = next;
  }
  if (line) out.push(line);
  if (out.length > lines) { out.length = lines; out[lines - 1] = out[lines - 1].replace(/\s*\S*$/, '') + '...'; }
  out.forEach((l, i) => x.fillText(l, X, Y + i * lh));
}
function art(x, i, f, ink) {
  const ring = (rx, ry, rot, a, lw) => { x.strokeStyle = ink(a); x.lineWidth = lw * f; x.beginPath(); x.ellipse(0, 0, rx * f, ry * f, rot, 0, 7); x.stroke(); };
  if (i % 3 === 0) {
    ring(64, 22, .44, .32, 2.5);
    const g = x.createRadialGradient(-12 * f, -14 * f, 2 * f, 0, 0, 40 * f);
    g.addColorStop(0, ink(1)); g.addColorStop(1, ink(.42));
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 36 * f, 0, 7); x.fill();
    ring(88, 30, -.42, .95, 4.5);
  } else if (i % 3 === 1) {
    x.save(); x.rotate(.3); x.strokeStyle = ink(.35); x.lineWidth = 1.5 * f; rrect(x, -66 * f, -46 * f, 132 * f, 92 * f, 26 * f); x.stroke(); x.restore();
    x.save(); x.rotate(-.35);
    x.fillStyle = 'rgba(70,20,0,.16)'; rrect(x, -28 * f, -24 * f, 72 * f, 72 * f, 18 * f); x.fill();
    const g = x.createLinearGradient(-36 * f, -36 * f, 36 * f, 36 * f);
    g.addColorStop(0, ink(1)); g.addColorStop(1, ink(.5));
    x.fillStyle = g; rrect(x, -38 * f, -36 * f, 72 * f, 72 * f, 18 * f); x.fill(); x.restore();
  } else {
    x.save(); x.rotate(.38); ring(76, 46, 0, .35, 1.5); x.restore();
    x.save(); x.rotate(-.28); rrect(x, -58 * f, -32 * f, 116 * f, 64 * f, 22 * f); x.clip();
    for (let k = 0; k < 11; k++) { x.fillStyle = ink(k % 2 ? .5 : .95); x.fillRect((-58 + k * 11) * f, -40 * f, 5 * f, 80 * f); }
    x.restore();
  }
}
function face(x, c, i, W, H, f, serif, sans) {
  const pad = 28 * f, ink = a => `rgba(255,251,246,${a})`;
  x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  x.font = `600 ${10 * f}px ${sans}`; x.fillStyle = ink(.75);
  spaced(x, 'SELECTED WORK', pad, pad + 13 * f, 1.8 * f);
  const tag = c.tag.toUpperCase(), tw = spacedW(x, tag, 1.6 * f) + 24 * f, th = 26 * f, tx = W - pad - tw;
  x.strokeStyle = ink(.55); x.lineWidth = 1.2 * f; rrect(x, tx, pad - 4 * f, tw, th, th / 2); x.stroke();
  x.fillStyle = ink(.92); spaced(x, tag, tx + 12 * f, pad + 13 * f, 1.6 * f);
  x.save(); x.translate(W / 2, pad + 108 * f); art(x, i, f, ink); x.restore();
  x.font = `${62 * f}px ${serif}`; x.fillStyle = ink(.98);
  x.fillText(c.title, pad - 2 * f, pad + 222 * f, W - 2 * pad);
  x.font = `${14 * f}px ${sans}`; x.fillStyle = ink(.86);
  wrap(x, c.desc, pad, pad + 252 * f, (W - 2 * pad) * .8, 21 * f, 2);
  const by = H - pad - 12 * f;
  x.fillStyle = ink(.35); x.fillRect(pad, by - 34 * f, W - 2 * pad, Math.max(1, f));
  x.font = `500 ${14 * f}px ${sans}`; x.fillStyle = ink(.96);
  x.fillText('View project', pad, by);
  const lw = x.measureText('View project').width, ax = pad + lw + 10 * f, ay = by - 5 * f, s = 5 * f;
  x.strokeStyle = ink(.96); x.lineWidth = 1.6 * f; x.lineCap = 'round';
  x.beginPath(); x.moveTo(ax, ay + s); x.lineTo(ax + 2 * s, ay - s); x.moveTo(ax + .5 * s, ay - s); x.lineTo(ax + 2 * s, ay - s); x.lineTo(ax + 2 * s, ay + .5 * s); x.stroke();
  x.font = `${11 * f}px ${sans}`; x.fillStyle = ink(.7); x.textAlign = 'right';
  x.fillText(`0${i + 1} / 03`, W - pad, by); x.textAlign = 'left';
  return {x: pad - 10 * f, y: by - 27 * f, w: lw + 44 * f, h: 38 * f};
}

class JellyStack extends HTMLElement {
  static get observedAttributes() { return ['recording']; }

  connectedCallback() {
    addEventListener('resize', this._onResize || (this._onResize = () => this._layout()));
    if (this.shadowRoot) { this._layout(); return; }
    const r = this.attachShadow({mode: 'open'});
    r.innerHTML = `<style>${CSS}</style><div class="deck"><div class="hit"></div><canvas aria-hidden="true"></canvas></div><div class="tabs" role="tablist" aria-label="Projects"></div><div class="help">PICK A PROJECT. GIVE IT A PULL.</div>`;
    this._deck = r.querySelector('.deck'); this._cv = r.querySelector('canvas'); this._tabs = r.querySelector('.tabs');
    let items = DEFAULTS;
    const src = this.querySelector('script[type="application/json"]');
    if (src) { try { const d = JSON.parse(src.textContent); if (Array.isArray(d) && d.length === 3) items = d; } catch (_) {} }
    this._start = Math.max(0, Math.min(2, parseInt(this.getAttribute('active'), 10) || 0));
    this.active = this._start; this._n = 0; this._pk = 0; this._acts = [];
    this.cards = items.map((it, i) => {
      const ac = String(it.accent || ''), hex = /^#[0-9a-f]{6}$/i.test(ac) ? ac : JELLY[i];
      let href = 'https://example.com';
      try { const u = new URL(it.href); if (u.protocol === 'https:' || u.protocol === 'http:') href = u.href; } catch (_) {}
      return {i, hex, pal: palette(hex), title: String(it.title || 'Project'), tag: String(it.tag || 'PROJECT'), desc: String(it.description || ''), href,
        x: new Float64Array(N), y: new Float64Array(N), vx: new Float64Array(N), vy: new Float64Array(N), z: new Float64Array(N), w: new Float64Array(N),
        fx: new Float64Array(N), fy: new Float64Array(N), th: new Float32Array(N), cx: 0, cy: 0, rot: 0};
    });
    this._panels = []; this._links = [];
    this.cards.forEach((c, i) => {
      const p = document.createElement('section');
      p.className = 'panel'; p.id = 'panel-' + i; p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', 'tab-' + i);
      p.style.setProperty('--c', c.hex);
      p.innerHTML = '<h2 class="sr"></h2><p class="sr"></p><a class="visit" target="_blank" rel="noopener noreferrer"><span class="sr">View project</span></a>';
      p.querySelector('h2').textContent = c.title;
      p.querySelector('p').textContent = c.tag + '. ' + c.desc;
      const a = p.querySelector('a');
      a.href = c.href;
      a.addEventListener('click', e => { if (this._dragged) e.preventDefault(); this._dragged = false; });
      this._deck.append(p); this._panels.push(p); this._links.push(a);
      const t = document.createElement('button');
      t.type = 'button'; t.className = 'tab'; t.id = 'tab-' + i; t.setAttribute('role', 'tab'); t.setAttribute('aria-controls', p.id);
      t.innerHTML = '<b></b><span></span>';
      t.querySelector('b').style.setProperty('--dot', c.hex);
      t.querySelector('span').textContent = c.title;
      t.addEventListener('click', () => this.select(i));
      this._tabs.append(t);
    });
    this._tabs.addEventListener('keydown', e => {
      let k = this.active;
      if (e.key === 'ArrowRight') k = (k + 1) % 3; else if (e.key === 'ArrowLeft') k = (k + 2) % 3;
      else if (e.key === 'Home') k = 0; else if (e.key === 'End') k = 2; else return;
      e.preventDefault(); this.select(k); this._tabs.children[k].focus();
    });
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    this._calm = mq.matches;
    mq.addEventListener?.('change', e => { this._calm = e.matches; });
    this._tick = now => this._frame(now);
    this._flat = !this._initGL();
    if (this._flat) this._deck.classList.add('flat');
    this._cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this._lost = true; cancelAnimationFrame(this._raf); this._raf = 0; });
    this._cv.addEventListener('webglcontextrestored', () => { this._lost = false; this._initGL(); this._W = 0; this._layout(); });
    const d = this._deck;
    d.addEventListener('pointerdown', e => this._down(e));
    d.addEventListener('pointermove', e => this._move(e));
    d.addEventListener('pointerup', e => this._up(e));
    d.addEventListener('pointercancel', e => this._up(e));
    d.addEventListener('pointerleave', e => {
      if (e.pointerType !== 'mouse' || this._ptr || !this._hover) return;
      this._hover = null; this.cards[this.active].calm = false; this._wake();
    });
    const cs = getComputedStyle(this);
    this._serif = cs.getPropertyValue('--jelly-serif').trim() || '"Instrument Serif", "Iowan Old Style", Georgia, serif';
    this._sans = cs.getPropertyValue('--jelly-sans').trim() || 'system-ui, -apple-system, "Segoe UI", sans-serif';
    this._hidden = this.hasAttribute('intro') && !this._calm && !this._flat;
    this._ro = new ResizeObserver(() => this._layout());
    this._ro.observe(this);
    this._layout();
    const fonts = document.fonts;
    const ready = () => { if (this._W) { this._paint(); this._draw(); } };
    if (fonts) {
      fonts.addEventListener?.('loadingdone', ready);
      Promise.race([Promise.all([fonts.load(`62px ${this._serif}`), fonts.load(`14px ${this._sans}`)]).catch(() => {}), new Promise(r => setTimeout(r, 900))])
        .then(() => { ready(); if (this._hidden) this.drop(); });
    } else if (this._hidden) this.drop();
  }

  disconnectedCallback() {
    removeEventListener('resize', this._onResize);
    cancelAnimationFrame(this._raf); this._raf = 0;
  }

  attributeChangedCallback(name) {
    if (name !== 'recording' || !this.cards) return;
    if (this.hasAttribute('recording')) { cancelAnimationFrame(this._raf); this._raf = 0; }
    else { this._manual = false; this._wake(); }
  }

  select(i) {
    i = Math.max(0, Math.min(2, i | 0));
    if (!this._W || this._manual) return;
    this._select(i, this._n * DT);
    this._wake();
  }

  poke(u, v) {
    if (!this._W || this._calm || this._manual) return;
    const at = u == null ? POKES[this._pk++ % POKES.length] : [u, v];
    this._poke(at[0] * this._W, at[1] * this._H, 1);
    this._wake();
  }

  drop() {
    if (!this._W || this._manual) return;
    this._hidden = false;
    this._drop(this._n * DT);
    this._wake();
  }

  // Deterministic frame for video capture: same (time, events) always gives the same picture.
  renderAt(time, events = []) {
    if (!this._W) return;
    cancelAnimationFrame(this._raf); this._raf = 0; this._manual = true;
    const key = JSON.stringify(events);
    if (key !== this._key || time < this._n * DT - 1e-9) {
      this._key = key; this.active = this._start; this._hidden = false;
      this._settle(); this._n = 0; this._pk = 0; this._acts = [];
      this._script = events.map(e => ({...e})).sort((a, b) => a.t - b.t); this._si = 0;
    }
    const n = Math.floor(time / DT + 1e-6);
    while (this._n < n) this._step();
    // events that land exactly on this frame show up in it, not one step later
    this._run(this._n * DT);
    this._draw();
    this._gl?.flush();
  }

  _initGL() {
    let gl;
    try { gl = this._cv.getContext('webgl', {alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: this.hasAttribute('recording')}); } catch (_) {}
    if (!gl) return false;
    try {
      this._pT = prog(gl, VS_TOP, HEAD + RR + FS_TOP);
      this._pW = prog(gl, VS_WALL, HEAD + FS_WALL);
      this._pS = prog(gl, VS_SH, HEAD + RR + FS_SH);
    } catch (err) { console.warn('jelly-stack:', err.message); return false; }
    this._gl = gl;
    const buf = (type, data, use) => { const b = gl.createBuffer(); gl.bindBuffer(type, b); gl.bufferData(type, data, use); return b; };
    const uv = new Float32Array(RX * RY * 2);
    for (let j = 0; j < RY; j++) for (let i = 0; i < RX; i++) { uv[(j * RX + i) * 2] = i / (RX - 1); uv[(j * RX + i) * 2 + 1] = j / (RY - 1); }
    this._uvB = buf(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    this._ixB = buf(gl.ELEMENT_ARRAY_BUFFER, grid(RX, RY), gl.STATIC_DRAW);
    this._sxB = buf(gl.ELEMENT_ARRAY_BUFFER, grid(NX, NY), gl.STATIC_DRAW);
    for (const c of this.cards) {
      c.top = new Float32Array(RX * RY * 10); c.topB = buf(gl.ARRAY_BUFFER, c.top, gl.DYNAMIC_DRAW);
      c.wall = new Float32Array((NB + 1) * 8); c.wallB = buf(gl.ARRAY_BUFFER, c.wall, gl.DYNAMIC_DRAW);
      c.shA = new Float32Array(N * 4); c.shAB = buf(gl.ARRAY_BUFFER, c.shA, gl.DYNAMIC_DRAW);
      c.shC = new Float32Array(N * 4); c.shCB = buf(gl.ARRAY_BUFFER, c.shC, gl.DYNAMIC_DRAW);
      c.tex = gl.createTexture();
    }
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }

  _layout() {
    if (!this._deck || this._lost) return;
    const W = Math.round(this._deck.clientWidth);
    if (!W) return;
    const H = Math.round(Math.max(360, W * .87));
    if (W !== this._W || H !== this._H) {
      this._W = W; this._H = H; this._sf = Math.max(.75, W / 460);
      this._deck.style.height = H + 'px';
      this._geo(); this._paint();
      if (this._manual && this._script) { const t = this._n * DT; this._key = null; this.renderAt(t, this._script); return; }
      this._settle();
    }
    if (this._flat) return this._draw();
    // the canvas reaches past the deck so cards can stretch out, but never past the viewport
    const rc = this._deck.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    const pl = Math.round(Math.max(0, Math.min(W * .3, rc.left))), pr = Math.round(Math.max(0, Math.min(W * .3, vw - rc.right)));
    const pt = Math.round(H * .55), pb = Math.round(H * .3), cw = W + pl + pr, ch = H + pt + pb, dpr = Math.min(2, devicePixelRatio || 1);
    const cv = this._cv, pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
    Object.assign(cv.style, {left: -pl + 'px', top: -pt + 'px', width: cw + 'px', height: ch + 'px'});
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    this._dpr = dpr; this._org = [-pl, -pt]; this._res = [cw, ch];
    this._draw();
  }

  _geo() {
    const W = this._W, H = this._H, qx = new Float64Array(N), qy = new Float64Array(N), kh = new Float64Array(N);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i, u = 2 * i / (NX - 1) - 1, v = 2 * j / (NY - 1) - 1;
      qx[k] = u * W / 2; qy[k] = v * H / 2;
      // the core holds on tight, corners are loose: that's where the flop comes from
      kh[k] = KH * (1 - .85 * (u * u + v * v) / 2);
    }
    const sp = [];
    const add = (a, b, k) => sp.push(a, b, Math.hypot(qx[b] - qx[a], qy[b] - qy[a]), k);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      if (i < NX - 1) add(k, k + 1, KS);
      if (j < NY - 1) add(k, k + NX, KS);
      if (i < NX - 1 && j < NY - 1) add(k, k + NX + 1, KD);
      if (i > 0 && j < NY - 1) add(k, k + NX - 1, KD);
      if (i < NX - 2) add(k, k + 2, KB);
      if (j < NY - 2) add(k, k + 2 * NX, KB);
    }
    const ri = new Int32Array(RX * RY * 16), rw = new Float64Array(RX * RY * 16);
    for (let j = 0; j < RY; j++) for (let i = 0; i < RX; i++) weights(i / (RX - 1), j / (RY - 1), ri, rw, (j * RX + i) * 16);
    const rad = 26 * this._sf, pts = outline(W - 1, H - 1, rad), bi = new Int32Array(NB * 16), bw = new Float64Array(NB * 16);
    pts.forEach((p, k) => weights(p[0] / W + .5, p[1] / H + .5, bi, bw, k * 16));
    this._g = {qx, qy, kh, sp: Float64Array.from(sp), ri, rw, pts, bi, bw, rad, A0: W / (NX - 1) * (H / (NY - 1)),
      nh: new Float64Array(N), cell: new Float64Array((NX - 1) * (NY - 1)),
      rX: new Float64Array(RX * RY), rY: new Float64Array(RX * RY), rH: new Float64Array(RX * RY), rT: new Float64Array(RX * RY)};
    this._lift = H * .2;
    for (const c of this.cards) if (c.home) c.home = this._slot(c.depth);
  }

  _paint() {
    const gl = this._gl;
    if (!gl || !this._W) return;
    const W = this._W, H = this._H, f = this._sf, q = Math.min(2, Math.max(1, devicePixelRatio || 1));
    const cv = this._tc || (this._tc = document.createElement('canvas'));
    cv.width = Math.round(W * q); cv.height = Math.round(H * q);
    const x = cv.getContext('2d');
    this.cards.forEach((c, i) => {
      x.setTransform(q, 0, 0, q, 0, 0); x.clearRect(0, 0, W, H);
      c.link = face(x, c, i, W, H, f, this._serif, this._sans);
      gl.bindTexture(gl.TEXTURE_2D, c.tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const L = c.link, a = this._links[i], {qx, qy} = this._g;
      Object.assign(a.style, {left: L.x + 'px', top: L.y + 'px', width: L.w + 'px', height: L.h + 'px'});
      let best = 0, bd = 1e9;
      for (let k = 0; k < N; k++) { const d = Math.hypot(W / 2 + qx[k] - L.x - L.w / 2, H / 2 + qy[k] - L.y - L.h / 2); if (d < bd) { bd = d; best = k; } }
      L.node = best;
    });
  }

  _slot(d) {
    const S = SLOTS[d], f = this._sf;
    return {x: this._W / 2 + S[0] * f, y: this._H / 2 + S[1] * f, a: S[2] * Math.PI / 180, s: S[3], e: 0, al: 1, dm: DIMS[d]};
  }

  _place(c, P) {
    const {qx, qy} = this._g, ca = Math.cos(P.a), sa = Math.sin(P.a);
    for (let k = 0; k < N; k++) {
      const ux = qx[k] * P.s, uy = qy[k] * P.s;
      c.x[k] = P.x + ca * ux - sa * uy; c.y[k] = P.y + sa * ux + ca * uy;
      c.vx[k] = c.vy[k] = c.z[k] = c.w[k] = 0;
    }
    c.cx = P.x; c.cy = P.y; c.rot = P.a; c.calm = true; c.meshOk = false;
  }

  _settle() {
    this.cards.forEach((c, k) => {
      c.depth = (k - this.active + 3) % 3; c.home = c.pose = this._slot(c.depth); c.anim = null;
      this._place(c, c.home);
    });
    this.order = [0, 1, 2].sort((a, b) => this.cards[b].depth - this.cards[a].depth);
    this._grab = this._hover = this._reorder = null;
    this._sync();
  }

  _sync() {
    [...this._tabs.children].forEach((t, i) => { t.setAttribute('aria-selected', String(i === this.active)); t.tabIndex = i === this.active ? 0 : -1; });
    this._panels.forEach((p, i) => { p.inert = i !== this.active; p.setAttribute('aria-hidden', String(i !== this.active)); });
  }

  _pose(c, t) {
    const A = c.anim;
    if (!A) return c.home;
    const p = Math.max(0, Math.min(1, (t - A.t0) / A.dur)), f = A.from, g = A.to;
    if (A.kind === 'hop') {
      const e = eio(p), arc = 4 * p * (1 - p);
      return {x: lerp(f.x, g.x, e), y: lerp(f.y, g.y, e) - this._lift * arc, a: lerp(f.a, g.a, e), s: lerp(f.s, g.s, e) + .06 * arc, e: arc, al: 1, dm: lerp(f.dm, g.dm, e)};
    }
    if (A.kind === 'drop') {
      const e = p * p;
      return {x: lerp(f.x, g.x, e), y: lerp(f.y, g.y, e), a: lerp(f.a, g.a, e), s: lerp(f.s, g.s, e), e: 1 - e, al: Math.min(1, p * 8), dm: g.dm};
    }
    const e = eout(p);
    return {x: lerp(f.x, g.x, e), y: lerp(f.y, g.y, e), a: lerp(f.a, g.a, e), s: lerp(f.s, g.s, e), e: 0, al: 1, dm: lerp(f.dm, g.dm, e)};
  }

  _select(i, t) {
    if (i === this.active) { this._poke(this._W / 2, this._H * .45, .45); return; }
    this._release(); this._grab = null; this.active = i;
    const calm = this._calm && !this._manual;
    this.cards.forEach((c, k) => {
      const d = (k - i + 3) % 3, from = this._pose(c, t), to = this._slot(d), hop = k === i && !calm;
      c.depth = d; c.home = to;
      c.anim = {t0: t, dur: hop ? .52 : .46, from, to, kind: hop ? 'hop' : 'slide', land: hop};
    });
    // the new card jumps on top right away, the other two swap while the hop covers them
    this.order = this.order.filter(k => k !== i).concat(i);
    this._reorder = {t: t + .22, order: [0, 1, 2].sort((a, b) => this.cards[b].depth - this.cards[a].depth)};
    this._sync();
    this.dispatchEvent(new CustomEvent('change', {detail: {index: i}}));
  }

  _drop(t) {
    if (this._calm && !this._manual) return;
    this.order.forEach((k, n) => {
      const c = this.cards[k], to = c.home, from = {...to, y: to.y - this._H * .42, s: to.s * 1.16, e: 1};
      c.anim = {t0: t + n * .16, dur: .42, from, to, kind: 'drop', land: true};
      this._place(c, from);
    });
  }

  _poke(px, py, amt) {
    if (this._calm && !this._manual) return;
    const c = this.cards[this.active], R = .24 * this._W, spin = (this._pk % 2 ? 1 : -1) * .8 * amt;
    for (let k = 0; k < N; k++) {
      const dx = c.x[k] - px, dy = c.y[k] - py, d = Math.hypot(dx, dy) || 1, g = Math.exp(-((d / R) ** 2));
      c.w[k] -= 700 * g * amt;
      c.vx[k] += dx / d * 420 * g * amt - (c.y[k] - c.cy) * spin;
      c.vy[k] += dy / d * 420 * g * amt + (c.x[k] - c.cx) * spin;
    }
    c.calm = false;
  }

  _land(c, amt) {
    const W2 = this._W * this._W / 4, H2 = this._H * this._H / 4;
    for (let k = 0; k < N; k++) {
      const dx = c.x[k] - c.cx, dy = c.y[k] - c.cy, r2 = dx * dx / W2 + dy * dy / H2;
      c.vx[k] += dx * 3.4 * amt; c.vy[k] += dy * 3.4 * amt;
      c.w[k] -= 260 * amt * Math.max(0, 1 - r2 * .6);
    }
    c.calm = false;
    for (const b of this.order) {
      if (b === c.i) break;
      const o = this.cards[b];
      for (let k = 0; k < N; k++) { o.vx[k] += (o.x[k] - o.cx) * .7 * amt; o.vy[k] += (o.y[k] - o.cy) * .7 * amt; o.w[k] -= 60 * amt; }
      o.calm = false;
    }
  }

  _grabAt(px, py) {
    const c = this.cards[this.active], R = .34 * Math.min(this._W, this._H), w = new Float64Array(N);
    for (let k = 0; k < N; k++) w[k] = Math.exp(-((c.x[k] - px) ** 2 + (c.y[k] - py) ** 2) / (R * R));
    this._grab = {c, w, x0: Float64Array.from(c.x), y0: Float64Array.from(c.y), px, py, dx: 0, dy: 0, pdx: 0, pdy: 0, vx: 0, vy: 0};
    c.calm = false;
  }

  _pull(px, py) {
    const g = this._grab;
    if (!g || g.out) return;
    let dx = px - g.px, dy = py - g.py;
    const L = .45 * this._W, d = Math.hypot(dx, dy);
    // rubber band: the further you pull, the harder it gets
    if (d > 0) { const k = L * Math.tanh(d / L) / d; dx *= k; dy *= k; }
    g.dx = dx; g.dy = dy;
  }

  _release() {
    const g = this._grab;
    if (!g || g.out) return;
    const sp = Math.min(1, Math.hypot(g.vx, g.vy) / 900), s = Math.min(1, Math.hypot(g.dx, g.dy) / (.3 * this._W));
    for (let k = 0; k < N; k++) g.c.w[k] -= 140 * s * (.3 + .7 * sp) * g.w[k];
    // a slow hand lets go softly, a flick lets go at once and the jelly whips
    g.out = true; g.fade = 1; g.rate = 1 / Math.max(.001, .2 * (1 - sp));
    g.c.calm = false;
  }

  _step() {
    const t = this._n * DT;
    if (this._script) this._run(t);
    if (this._reorder && t >= this._reorder.t) { this.order = this._reorder.order; this._reorder = null; }
    for (const c of this.cards) this._stepCard(c, t);
    this._n++;
  }

  _run(t) {
    const S = this._script;
    while (this._si < S.length && S[this._si].t <= t + 1e-9) {
      const e = S[this._si++];
      if (e.type === 'select') this._select(Math.max(0, Math.min(2, e.index | 0)), t);
      else if (e.type === 'poke') { const at = e.at || POKES[this._pk % POKES.length]; this._poke(at[0] * this._W, at[1] * this._H, e.strength ?? 1); this._pk++; }
      else if (e.type === 'drop') this._drop(t);
      else if (e.type === 'drag' || e.type === 'hover') this._acts.push({...e, on: false});
    }
    this._acts = this._acts.filter(a => {
      const p = Math.min(1, (t - a.t) / (a.dur || .001)), q = p * p * (3 - 2 * p);
      const x = lerp(a.from[0], a.to[0], q) * this._W, y = lerp(a.from[1], a.to[1], q) * this._H;
      if (a.type === 'hover') { this._hover = p < 1 ? [x, y] : null; this.cards[this.active].calm = false; return p < 1; }
      if (!a.on) { a.on = true; this._grabAt(x, y); }
      this._pull(x, y);
      if (t >= a.t + (a.dur || 0) + (a.hold || 0)) { this._release(); return false; }
      return true;
    });
  }

  _stepCard(c, t) {
    const A = c.anim;
    if (A && t >= A.t0 + A.dur) { if (A.land) this._land(c, A.kind === 'drop' ? .8 : 1); c.anim = null; }
    const P = c.pose = this._pose(c, t), {qx, qy, kh, sp} = this._g;
    const {x, y, vx, vy, z, w, fx, fy} = c;
    if (this._calm && !this._manual) { this._place(c, P); return; }
    const g = this._grab && this._grab.c === c ? this._grab : null;
    // a card that has come to rest costs nothing until something touches it
    if (c.calm && !A && !g) return;
    const ca = Math.cos(P.a), sa = Math.sin(P.a), s = P.s;
    let mx = 0, my = 0;
    for (let k = 0; k < N; k++) { mx += x[k]; my += y[k]; }
    mx /= N; my /= N;
    // shape matching: best rigid fit of the current blob, the jelly always wants back to it
    let a1 = 0, a2 = 0;
    for (let k = 0; k < N; k++) {
      const px = x[k] - mx, py = y[k] - my, ux = qx[k] * s, uy = qy[k] * s;
      a1 += px * ux + py * uy; a2 += py * ux - px * uy;
    }
    const r = Math.atan2(a2, a1), cr = Math.cos(r), sr = Math.sin(r);
    c.cx = mx; c.cy = my; c.rot = r;
    // the finger's own speed, so a flick throws the jelly instead of just letting it go
    if (g && !g.out) { g.vx += ((g.dx - g.pdx) / DT - g.vx) * .2; g.vy += ((g.dy - g.pdy) / DT - g.vy) * .2; g.pdx = g.dx; g.pdy = g.dy; }
    if (g && g.out && (g.fade -= g.rate * DT) <= 0) this._grab = null;
    const gf = g ? (g.out ? Math.max(0, g.fade) : 1) : 0;
    for (let k = 0; k < N; k++) {
      const ux = qx[k] * s, uy = qy[k] * s, gw = g ? g.w[k] * gf : 0, kk = kh[k] * (1 - .75 * gw);
      let ax = KSM * (mx + cr * ux - sr * uy - x[k]) + kk * (P.x + ca * ux - sa * uy - x[k]);
      let ay = KSM * (my + sr * ux + cr * uy - y[k]) + kk * (P.y + sa * ux + ca * uy - y[k]);
      if (gw > .01) { ax += KG * gw * (g.x0[k] + g.dx - x[k]) - CG * gw * (vx[k] - g.vx); ay += KG * gw * (g.y0[k] + g.dy - y[k]) - CG * gw * (vy[k] - g.vy); }
      fx[k] = ax; fy[k] = ay;
    }
    for (let q = 0; q < sp.length; q += 4) {
      const i = sp[q], j = sp[q + 1], dx = x[j] - x[i], dy = y[j] - y[i], len = Math.hypot(dx, dy) || 1e-6, ux = dx / len, uy = dy / len;
      const f = sp[q + 3] * (len - sp[q + 2] * s) + CS * ((vx[j] - vx[i]) * ux + (vy[j] - vy[i]) * uy);
      fx[i] += f * ux; fy[i] += f * uy; fx[j] -= f * ux; fy[j] -= f * uy;
    }
    const damp = Math.exp(-DAMP * DT);
    let vm = 0, am = 0;
    for (let k = 0; k < N; k++) {
      vx[k] = (vx[k] + fx[k] * DT) * damp; vy[k] = (vy[k] + fy[k] * DT) * damp;
      x[k] += vx[k] * DT; y[k] += vy[k] * DT;
      vm = Math.max(vm, Math.abs(vx[k]) + Math.abs(vy[k])); am = Math.max(am, Math.abs(fx[k]) + Math.abs(fy[k]));
    }
    // surface height: a damped wave on the same grid, pushed by pokes, landings and fingers
    const front = c.i === this.active, hv = front && this._hover, R2 = (.13 * this._W) ** 2;
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      const lap = z[i > 0 ? k - 1 : k + 1] + z[i < NX - 1 ? k + 1 : k - 1] + z[j > 0 ? k - NX : k + NX] + z[j < NY - 1 ? k + NX : k - NX] - 4 * z[k];
      let a = KW * lap - KZ * z[k] - DZ * w[k];
      if (hv) a -= 900 * Math.exp(-((x[k] - hv[0]) ** 2 + (y[k] - hv[1]) ** 2) / R2);
      if (g) a -= 500 * g.w[k] * gf;
      fx[k] = a;
    }
    // jelly keeps its volume: a dent here is a bulge somewhere else, never the whole slab bobbing
    let mz = 0, mw = 0, wm = 0, za = 0;
    for (let k = 0; k < N; k++) { w[k] += fx[k] * DT; z[k] += w[k] * DT; mz += z[k]; mw += w[k]; }
    mz /= N; mw /= N;
    for (let k = 0; k < N; k++) { z[k] -= mz; w[k] -= mw; wm = Math.max(wm, Math.abs(w[k])); za = Math.max(za, Math.abs(fx[k])); }
    c.calm = !g && vm < 3 && am < 40 && wm < 2 && za < 40;
    c.meshOk = false;
  }

  _frame(now) {
    this._raf = 0;
    if (this._manual || this._lost) return;
    this._acc = Math.min(.25, (this._acc || 0) + Math.min(.05, (now - this._last) / 1000));
    this._last = now;
    while (this._acc >= DT) { this._step(); this._acc -= DT; }
    this._draw();
    if (this._busy()) this._raf = requestAnimationFrame(this._tick);
  }

  _wake() {
    if (this._raf || this._manual || this._lost || !this._W || this.hasAttribute('recording')) return;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  }

  _busy() {
    return !!(this._grab || this._reorder || this.cards.some(c => c.anim || !c.calm));
  }

  _local(e) { const r = this._deck.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

  _inside(c, px, py) {
    const b = [];
    for (let i = 0; i < NX; i++) b.push(i);
    for (let j = 1; j < NY; j++) b.push(j * NX + NX - 1);
    for (let i = NX - 2; i >= 0; i--) b.push((NY - 1) * NX + i);
    for (let j = NY - 2; j > 0; j--) b.push(j * NX);
    let inside = false;
    for (let a = 0, p = b.length - 1; a < b.length; p = a++) {
      const xa = c.x[b[a]], ya = c.y[b[a]], xp = c.x[b[p]], yp = c.y[b[p]];
      if ((ya > py) !== (yp > py) && px < (xp - xa) * (py - ya) / (yp - ya) + xa) inside = !inside;
    }
    return inside;
  }

  _down(e) {
    if (this._manual || this.hasAttribute('recording') || e.button > 0 || this._ptr) return;
    const [px, py] = this._local(e), front = this.cards[this.active];
    this._dragged = false;
    this._ptr = {id: e.pointerId, x: px, y: py, moved: false, back: null};
    if (this._inside(front, px, py)) {
      if (!this._calm && !this._flat) { this._grabAt(px, py); this._hover = null; }
      try { this._deck.setPointerCapture(e.pointerId); } catch (_) {}
    } else {
      for (let n = this.order.length - 1; n >= 0; n--) {
        const k = this.order[n];
        if (k !== this.active && this._inside(this.cards[k], px, py)) { this._ptr.back = k; break; }
      }
    }
    this._wake();
  }

  _move(e) {
    const [px, py] = this._local(e), P = this._ptr;
    if (P && e.pointerId === P.id) {
      if (!P.moved && Math.hypot(px - P.x, py - P.y) > 6) { P.moved = true; this._deck.classList.add('drag'); }
      this._pull(px, py);
    } else if (!P && e.pointerType === 'mouse' && !this._calm) {
      const hv = this._inside(this.cards[this.active], px, py) ? [px, py] : null;
      if (hv || this._hover) this.cards[this.active].calm = false;
      this._hover = hv;
    }
    this._wake();
  }

  _up(e) {
    const P = this._ptr;
    if (!P || e.pointerId !== P.id) return;
    const [px, py] = this._local(e);
    this._release();
    if (!P.moved && e.type === 'pointerup') {
      if (P.back != null) this.select(P.back);
      else if (this._inside(this.cards[this.active], px, py)) this._poke(px, py, .6);
    }
    this._dragged = P.moved; this._ptr = null;
    this._deck.classList.remove('drag');
    this._wake();
  }

  _draw() {
    if (!this._W || this._lost) return;
    if (this._flat) return this._drawFlat();
    const gl = this._gl;
    gl.viewport(0, 0, this._cv.width, this._cv.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (!this._hidden) for (const k of this.order) this._drawCard(this.cards[k]);
    const c = this.cards[this.active], L = c.link, {qx, qy} = this._g;
    if (L) this._links[this.active].style.transform = `translate(${c.x[L.node] - this._W / 2 - qx[L.node]}px,${c.y[L.node] - this._H / 2 - qy[L.node]}px)`;
  }

  _drawFlat() {
    this.order.forEach((k, n) => {
      const c = this.cards[k], P = c.pose || c.home, p = this._panels[k];
      p.style.zIndex = n + 1;
      p.style.transform = `translate(${P.x - this._W / 2}px,${P.y - this._H / 2}px) rotate(${P.a}rad) scale(${P.s})`;
      p.style.filter = `brightness(${P.dm})`;
    });
  }

  _mesh(c) {
    const G = this._g, {qx, qy, ri, rw, nh, cell, rX, rY, rH, rT} = G, P = c.pose, s = P.s, x = c.x, y = c.y;
    const T = 16 * this._sf, A0 = G.A0 * s * s;
    // thickness from volume: squeeze the jelly and it gets taller, stretch it and it thins out
    for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
      const a = j * NX + i, b = a + 1, d = a + NX, e = d + 1;
      cell[j * (NX - 1) + i] = .5 * Math.abs((x[e] - x[a]) * (y[d] - y[b]) - (y[e] - y[a]) * (x[d] - x[b]));
    }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      let sum = 0, cnt = 0;
      for (let b = j - 1; b <= j; b++) for (let a = i - 1; a <= i; a++) if (a >= 0 && b >= 0 && a < NX - 1 && b < NY - 1) { sum += cell[b * (NX - 1) + a]; cnt++; }
      const k = j * NX + i, th = Math.max(.6, Math.min(1.8, A0 * cnt / (sum || 1)));
      c.th[k] = th; nh[k] = T * s * (th - 1) * .9 + c.z[k] * 2.2;
    }
    for (let r = 0, o = 0; r < RX * RY; r++) {
      let X = 0, Y = 0, Hh = 0, Th = 0;
      for (let q = 0; q < 16; q++, o++) { const k = ri[o], wv = rw[o]; X += wv * x[k]; Y += wv * y[k]; Hh += wv * nh[k]; Th += wv * c.th[k]; }
      rX[r] = X; rY[r] = Y; rH[r] = Hh; rT[r] = Th;
    }
    const top = c.top;
    for (let j = 0; j < RY; j++) for (let i = 0; i < RX; i++) {
      const r = j * RX + i, l = i ? r - 1 : r, rr = i < RX - 1 ? r + 1 : r, u = j ? r - RX : r, d = j < RY - 1 ? r + RX : r;
      const xu = rX[rr] - rX[l], yu = rY[rr] - rY[l], xv = rX[d] - rX[u], yv = rY[d] - rY[u], hu = rH[rr] - rH[l], hv = rH[d] - rH[u];
      const det = xu * yv - xv * yu;
      let sx = 0, sy = 0;
      if (Math.abs(det) > 1e-6) { sx = (hu * yv - hv * yu) / det; sy = (hv * xu - hu * xv) / det; }
      const sm = Math.hypot(sx, sy);
      if (sm > 2) { sx *= 2 / sm; sy *= 2 / sm; }
      const lu = Math.hypot(xu, yu) || 1, lv = Math.hypot(xv, yv) || 1, o = r * 10;
      top[o] = rX[r]; top[o + 1] = rY[r]; top[o + 2] = sx; top[o + 3] = sy;
      top[o + 4] = xu / lu; top[o + 5] = yu / lu; top[o + 6] = xv / lv; top[o + 7] = yv / lv;
      top[o + 8] = rT[r]; top[o + 9] = rH[r];
    }
    const {pts, bi, bw} = G, wall = c.wall, cr = Math.cos(c.rot), sr = Math.sin(c.rot), Tw = T * .95 * s;
    for (let n = 0; n <= NB; n++) {
      const k = n % NB, p = pts[k];
      let X = 0, Y = 0, Th = 0;
      for (let q = 0, o = k * 16; q < 16; q++, o++) { const m = bi[o], wv = bw[o]; X += wv * x[m]; Y += wv * y[m]; Th += wv * c.th[m]; }
      const f = Math.max(0, sr * p[2] + cr * p[3]), o = n * 8;
      wall[o] = X; wall[o + 1] = Y; wall[o + 2] = 0; wall[o + 3] = f;
      wall[o + 4] = X; wall[o + 5] = Y + Tw * Th; wall[o + 6] = 1; wall[o + 7] = f;
    }
    const e = P.e, f = this._sf, W2 = this._W / 2, H2 = this._H / 2;
    const shadow = (arr, pad, ox, oy) => {
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const k = j * NX + i, ex = qx[k] / W2 * pad * s, ey = qy[k] / H2 * pad * s, o = k * 4;
        arr[o] = x[k] + cr * ex - sr * ey + ox; arr[o + 1] = y[k] + sr * ex + cr * ey + oy;
        arr[o + 2] = i / (NX - 1); arr[o + 3] = j / (NY - 1);
      }
    };
    c.blurA = (34 + 40 * e) * f; c.blurC = (9 + 30 * e) * f;
    shadow(c.shA, c.blurA + 4, (6 + 18 * e) * f, (20 + 64 * e) * f);
    shadow(c.shC, c.blurC + 2, (1 + 6 * e) * f, (7 + 40 * e) * f);
  }

  _attrs(p, list) {
    const gl = this._gl;
    for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
    for (const [name, b, size, stride, off] of list) {
      const loc = p.a[name];
      if (loc == null || loc < 0) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off);
    }
  }

  _drawCard(c) {
    const gl = this._gl, P = c.pose, pal = c.pal, W = this._W, H = this._H, f = this._sf, G = this._g;
    if (P.al <= .001) return;
    const fresh = !(c.calm && c.meshOk);
    if (fresh) this._mesh(c);
    c.meshOk = true;
    const common = p => { gl.useProgram(p.p); gl.uniform2f(p.u.u_res, this._res[0], this._res[1]); gl.uniform2f(p.u.u_org, this._org[0], this._org[1]); };
    const sh = this._pS;
    common(sh);
    gl.uniform2f(sh.u.u_size, W, H); gl.uniform1f(sh.u.u_rad, G.rad); gl.uniform3fv(sh.u.u_shc, pal.sh);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._sxB);
    const e = P.e;
    for (const [arr, b, blur, str] of [[c.shA, c.shAB, c.blurA, (.2 - .07 * e) * P.al], [c.shC, c.shCB, c.blurC, (.34 * (1 - e) ** 2 + .06) * P.al]]) {
      if (fresh) { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr); }
      this._attrs(sh, [['a_s', b, 4, 16, 0]]);
      gl.uniform1f(sh.u.u_pad, blur + (arr === c.shA ? 4 : 2)); gl.uniform1f(sh.u.u_blur, blur); gl.uniform1f(sh.u.u_str, str);
      gl.drawElements(gl.TRIANGLES, (NX - 1) * (NY - 1) * 6, gl.UNSIGNED_SHORT, 0);
    }
    const wp = this._pW;
    common(wp);
    if (fresh) { gl.bindBuffer(gl.ARRAY_BUFFER, c.wallB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, c.wall); }
    this._attrs(wp, [['a_w', c.wallB, 4, 16, 0]]);
    gl.uniform3fv(wp.u.u_col, pal.col); gl.uniform3fv(wp.u.u_deep, pal.deep); gl.uniform3fv(wp.u.u_glow, pal.glow);
    gl.uniform1f(wp.u.u_dim, P.dm); gl.uniform1f(wp.u.u_al, P.al);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, (NB + 1) * 2);
    const tp = this._pT;
    common(tp);
    if (fresh) { gl.bindBuffer(gl.ARRAY_BUFFER, c.topB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, c.top); }
    this._attrs(tp, [['a_uv', this._uvB, 2, 8, 0], ['a_p', c.topB, 4, 40, 0], ['a_f', c.topB, 4, 40, 16], ['a_h', c.topB, 2, 40, 32]]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, c.tex); gl.uniform1i(tp.u.u_tex, 0);
    gl.uniform2f(tp.u.u_size, W, H); gl.uniform1f(tp.u.u_rad, G.rad); gl.uniform1f(tp.u.u_bev, 26 * f); gl.uniform1f(tp.u.u_T, 16 * f);
    gl.uniform1f(tp.u.u_aa, 1.2 / (P.s * this._dpr)); gl.uniform1f(tp.u.u_dim, P.dm); gl.uniform1f(tp.u.u_al, P.al);
    gl.uniform3fv(tp.u.u_col, pal.col); gl.uniform3fv(tp.u.u_deep, pal.deep); gl.uniform3fv(tp.u.u_glow, pal.glow);
    gl.uniform3f(tp.u.u_cam, W * .5, H * .4, 1000 * f);
    gl.uniform4f(tp.u.u_b1, -W * .8, -H * 1.2, W * .5, H * .35);
    gl.uniform4f(tp.u.u_b2, W * 2.3, H * .3, W * .08, H * .8);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._ixB);
    gl.drawElements(gl.TRIANGLES, (RX - 1) * (RY - 1) * 6, gl.UNSIGNED_SHORT, 0);
  }
}

customElements.define('jelly-stack', JellyStack);
})();

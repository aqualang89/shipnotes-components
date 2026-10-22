(function (global) {
  'use strict';

  const THEMES = Object.freeze({
    ember: { label: 'Ember', family: 'materials' },
    oxide: { label: 'Oxide', family: 'materials' },
    'frozen-vault': { label: 'Frozen Vault', family: 'materials' },
    'rain-terminal': { label: 'Rain Terminal', family: 'cyberpunk' },
    'grid-blackout': { label: 'Grid Blackout', family: 'cyberpunk' },
    'ghost-market': { label: 'Ghost Market', family: 'cyberpunk' }
  });
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const safeHref = value => {
    try {
      const url = new URL(value, location.href);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const safeImage = value => {
    if (!value) return '';
    if (/^(data:image\/|blob:)/i.test(value)) return value;
    try {
      const url = new URL(value, location.href);
      return ['https:', 'http:', 'file:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  // bundled demo art, 'iris' is the hero picture, the rest live in the theme atlas
  const SAMPLE_ART = ['dust', 'signal', 'garden', 'contact', 'fold', 'noct'];
  const itemData = (item, index) => ({
    id: String(item.id ?? index),
    number: String(item.number ?? index + 1).padStart(2, '0'),
    title: String(item.title ?? 'Untitled'),
    kind: String(item.kind ?? 'INTERACTIVE WORK'),
    status: String(item.status ?? 'ARCHIVED / OPEN'),
    description: String(item.description ?? 'An experiment in form, light and interaction.'),
    href: safeHref(item.href || ''),
    image: safeImage(item.image),
    seed: String(item.id ?? item.title ?? index),
    art: item.art === 'iris' || SAMPLE_ART.includes(item.art) ? item.art : ''
  });

  // seeded flow-field drawing, used when a card has no image
  const PALETTE = {
    ember: { mode: 'lighter', colors: ['#ffd38a', '#ff9d3d', '#fff1cf'] },
    oxide: { mode: 'source-over', colors: ['#a3111b', '#c81f27', '#2b2724'] },
    'frozen-vault': { mode: 'lighter', colors: ['#d9eeff', '#8fc3ea', '#ffffff'] },
    'rain-terminal': { mode: 'lighter', colors: ['#7ff5ff', '#2fd4e6', '#e6ffff'] },
    'grid-blackout': { mode: 'lighter', colors: ['#e8ece6', '#9aa59a', '#ffffff'] },
    'ghost-market': { mode: 'lighter', colors: ['#b77cff', '#ff5fa8', '#efe0ff'] }
  };
  const genCache = new Map();
  const generatedArt = (id, theme) => {
    const key = theme + ':' + id;
    if (genCache.has(key)) return genCache.get(key);
    let h = 2166136261;
    for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
    const S = 768, c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d'), pal = PALETTE[theme];
    // two or three twisting ribbons of fine strands, like a bundle of light fibres
    const glow = pal.mode === 'lighter';
    const bez = (p, t) => {
      const u = 1 - t;
      return [0, 1].map(k => u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]);
    };
    const ring = (r, a) => [.5 + Math.cos(a) * r, .5 + Math.sin(a) * r];
    ctx.globalCompositeOperation = pal.mode;
    ctx.lineCap = 'round';
    const ribbons = 1 + Math.floor(rnd() * 3);
    for (let r = 0; r < ribbons; r++) {
      // main ribbon sweeps across in an S, the others are thinner echoes
      const a0 = rnd() * 6.283, a1 = a0 + Math.PI + (rnd() - .5) * 1.6;
      const spine = [ring(.38, a0), ring(.25 + rnd() * .2, a0 + 1.2 + rnd() * 1.6), ring(.25 + rnd() * .2, a1 - 1.2 - rnd() * 1.6), ring(.36, a1)];
      const width = (.12 + rnd() * .12) * (r ? .55 : 1), twists = .8 + rnd() * 2.4, ph = rnd() * 6.283;
      const strands = r ? 80 : 190;
      for (let s = 0; s < strands; s++) {
        const q = s / (strands - 1) - .5, col = pal.colors[(s + r) % 3];
        ctx.strokeStyle = col;
        ctx.globalAlpha = glow ? .07 + rnd() * .12 : .14 + rnd() * .26;
        ctx.lineWidth = .7 + rnd() * (s % 11 ? .9 : 2.2);
        ctx.shadowColor = col; ctx.shadowBlur = glow && s % 4 === 0 ? 8 : 0;
        ctx.beginPath();
        for (let k = 0; k <= 140; k++) {
          const t = k / 140, p = bez(spine, t), p2 = bez(spine, Math.min(1, t + .002));
          let tx = p2[0] - p[0], ty = p2[1] - p[1];
          const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
          const taper = Math.pow(Math.sin(Math.PI * t), .55);
          const off = width * taper * q * Math.cos(Math.PI * twists * t + ph) + .004 * Math.sin(t * 23 + s * 1.7) * taper;
          const x = (p[0] - ty * off) * S, y = (p[1] + tx * off) * S;
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      for (let i = 0; i < 70; i++) {
        const p = bez(spine, rnd()), d = (rnd() - .5) * width * 2.4;
        ctx.globalAlpha = glow ? .3 + rnd() * .5 : .25 + rnd() * .35;
        ctx.fillStyle = pal.colors[2 - (i % 2)];
        ctx.beginPath(); ctx.arc((p[0] + d) * S, (p[1] - d * .6) * S, .6 + rnd() * 1.8, 0, 6.283); ctx.fill();
      }
    }
    const out = { canvas: c, url: c.toDataURL('image/png') };
    genCache.set(key, out);
    return out;
  };

  class CardFileView {
    constructor(root, options) {
      if (!(root instanceof HTMLElement)) throw new TypeError('CardFile.mount needs an HTMLElement');
      this.root = root;
      this.items = (options.items || []).map(itemData);
      this.allowedThemes = options.themes || Object.keys(THEMES);
      this.validateTheme(options.theme || this.allowedThemes[0]);
      this.theme = options.theme || this.allowedThemes[0];
      this.pos = clamp(options.startIndex ?? Math.floor(this.items.length / 2), 0, Math.max(0, this.items.length - 1));
      this.target = this.pos;
      this.velocity = 0;
      this.focused = Math.round(this.pos);
      this.opened = false;
      this.muted = options.muted ?? false;
      this.manual = false;
      this.clock = 0;
      this.lastTime = performance.now();
      this.drag = null;
      this.suppressClick = false;
      this.lastMoveEvent = 0;
      this.presentationArtIndex = -1;
      this.abort = new AbortController();
      this.build();
      this.bind();
      this.artRenderer=global.CardArt?new global.CardArt(this):null;
      this.render(0);
      this.emit('focus', { source: 'init' });
      this.tick = this.tick.bind(this);
      this.raf = requestAnimationFrame(this.tick);
    }

    validateTheme(theme) {
      if (!THEMES[theme] || !this.allowedThemes.includes(theme)) throw new RangeError(`Unknown CardFile theme: ${theme}`);
    }

    emit(name, extra = {}) {
      const index = clamp(Math.round(this.pos), 0, Math.max(0, this.items.length - 1));
      this.root.dispatchEvent(new CustomEvent(`cardfile:${name}`, {
        bubbles: true,
        detail: { id: this.items[index]?.id ?? null, index, time: this.clock, ...extra }
      }));
    }

    build() {
      this.root.classList.add('cf');
      this.root.dataset.theme = this.theme;
      this.root.innerHTML = `
        <div class="cf-world" aria-hidden="true">
          <div class="cf-architecture"></div><div class="cf-city"></div>
          <div class="cf-rain"></div><div class="cf-cables"></div>
          <div class="cf-floor"></div><div class="cf-rail-back"></div>
          <div class="cf-cabinet"><i></i><i></i><i></i><i></i></div>
          <div class="cf-power-hud"><header>VITALS STABLE <span>ID 01</span></header><div class="cf-hud-wave"></div><p>SYNC&nbsp;&nbsp; 100%<br>INTEGRITY 100%<br>ACCESS GRANTED</p></div>
          <div class="cf-machinery"><div class="cf-meter">RAIL PWR <b>▰▰▰▰▰▰▰▰▱▱</b><small>12.0 kV &nbsp; 240 A<br>STABLE</small></div><div class="cf-serial">ARCHIVE RAIL A-7<br>SERIAL 8847-33</div><div class="cf-access">ACCESS <b>GRANTED</b><small>MODE BROWSE<br>LINK ONLINE</small></div></div>
          <div class="cf-market-sign">幽霊市場<small>GHOST MARKET</small></div>
          <div class="cf-market-label"><strong>取引</strong><span>ASSET<br>EXCHANGE<br>PORT</span></div>
          <div class="cf-rain-status">PROJECT ARCHIVE <span>IDEAS / PROTOTYPES / SYSTEMS</span><b>● ONLINE &nbsp; ● SYNC</b></div>
        </div>
        <div class="cf-head"><div class="cf-brand"><span class="cf-brand-mark"></span><span>Card File</span><small>PROJECT ARCHIVE</small></div><span class="cf-head-right">Ship Notes</span></div>
        <div class="cf-stage" role="group" aria-label="Project card archive" tabindex="0">
          <div class="cf-cards"></div><div class="cf-foreground" aria-hidden="true"></div><div class="cf-rail-front" aria-hidden="true"></div>
        </div>
        <div class="cf-bottom"><div class="cf-readout"><span class="cf-readout-label">ACTIVE RECORD</span><strong class="cf-count"></strong><span class="cf-readout-line"></span><span class="cf-status">SYSTEM ONLINE</span></div>
          <div class="cf-nav"><button class="cf-prev" type="button" aria-label="Previous project">&#8592;</button><span class="cf-index"></span><button class="cf-next" type="button" aria-label="Next project">&#8594;</button></div>
        </div>
        <div class="cf-controls"><span class="cf-controls-title">MATERIAL / WORLD</span><div class="cf-theme-buttons" role="group" aria-label="Choose theme"></div><button class="cf-audio" type="button" aria-label="Mute sound">SOUND ON</button></div>
        <div class="cf-detail" aria-hidden="true"><div class="cf-detail-scrim"></div><section class="cf-detail-sheet" role="dialog" aria-modal="true" aria-label="Project details"><button class="cf-close" type="button" aria-label="Close details">&#215;</button><small class="cf-detail-number"></small><h2 class="cf-detail-title"></h2><p class="cf-detail-kind"></p><div class="cf-detail-art"></div><p class="cf-detail-description"></p><a class="cf-detail-link" target="_blank" rel="noopener noreferrer">OPEN PROJECT &#8599;</a></section></div>
      `;
      this.stage = this.root.querySelector('.cf-stage');
      this.rain = this.root.querySelector('.cf-rain');
      this.cardsHost = this.root.querySelector('.cf-cards');
      this.themeHost = this.root.querySelector('.cf-theme-buttons');
      this.detail = this.root.querySelector('.cf-detail');
      this.drawCards();
      for (const id of this.allowedThemes) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cf-theme-button';
        button.dataset.theme = id;
        button.textContent = THEMES[id].label;
        button.setAttribute('aria-pressed', String(id === this.theme));
        this.themeHost.append(button);
      }
      this.root.querySelector('.cf-audio').textContent = this.muted ? 'SOUND OFF' : 'SOUND ON';
    }

    drawCards() {
      this.cardsHost.replaceChildren();
      this.nodes = this.items.map((item, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'cf-card';
        card.dataset.index = index; card.dataset.art = item.image ? 'image' : item.art || 'generated';
        card.style.setProperty('--title-len', Math.max(1, item.title.length));
        card.setAttribute('aria-label', `Project ${item.number}: ${item.title}`);
        const number = document.createElement('span'); number.className = 'cf-card-number'; number.textContent = item.number;
        const title = document.createElement('strong'); title.className = 'cf-card-title'; title.textContent = item.title;
        const kind = document.createElement('span'); kind.className = 'cf-card-kind'; kind.textContent = item.kind;
        const art = document.createElement('span'); art.className = 'cf-card-art'; art.append(this.makeArt(index));
        const foot = document.createElement('span'); foot.className = 'cf-card-foot';
        const status = document.createElement('span'); status.textContent = item.status;
        const action = document.createElement('span'); action.className = 'cf-card-action'; action.textContent = 'Open project  →';
        foot.append(status, action);
        const glint = document.createElement('span'); glint.className = 'cf-card-glint'; glint.setAttribute('aria-hidden', 'true');
        card._glint = glint;
        const edge = document.createElement('span'); edge.className = 'cf-card-edge'; edge.setAttribute('aria-hidden', 'true');
        const hardware = document.createElement('span'); hardware.className = 'cf-hardware'; hardware.setAttribute('aria-hidden', 'true'); hardware.innerHTML = '<i></i><i></i><i></i><i></i>';
        const clip = document.createElement('span'); clip.className = 'cf-clip'; clip.setAttribute('aria-hidden', 'true');
        const mount = document.createElement('span'); mount.className = 'cf-mount'; mount.setAttribute('aria-hidden', 'true');
        const meta = document.createElement('span'); meta.className = 'cf-card-meta'; meta.textContent = 'VISUAL SYSTEMS / INTERACTIVE ARCHIVE';
        card.append(edge, number, title, kind, art, foot, glint, hardware, clip, mount, meta);
        card._art = art;
        const slot=document.createElement('div');slot.className='cf-card-slot';
        const shadow=document.createElement('span');shadow.className='cf-contact-shadow';shadow.setAttribute('aria-hidden','true');
        slot.append(shadow,card);card._slot=slot;card._shadow=shadow;this.cardsHost.append(slot);
        return card;
      });
    }

    makeArt(index) {
      const item = this.items[index];
      const wrap = document.createElement('span'), pic = document.createElement('span');
      wrap.className = 'cf-art-motion';
      if (item.image) {
        pic.className = 'cf-art-custom';
        pic.style.backgroundImage = `url(${JSON.stringify(item.image)})`;
      } else if (item.art === 'iris') pic.className = 'cf-art-hero';
      else if (item.art) {
        const cell = SAMPLE_ART.indexOf(item.art);
        pic.className = 'cf-art-secondary';
        pic.style.cssText = `--sprite-x:${(cell % 3) * 50}%;--sprite-y:${Math.floor(cell / 3) * 100}%`;
      } else {
        pic.className = 'cf-art-custom is-generated';
        pic.dataset.gen = item.seed;
        pic.style.backgroundImage = `url(${generatedArt(item.seed, this.theme).url})`;
      }
      wrap.append(pic);
      return wrap;
    }

    generated(id) { return generatedArt(id, this.theme); }

    refreshGenerated() {
      for (const el of this.root.querySelectorAll('[data-gen]')) el.style.backgroundImage = `url(${generatedArt(el.dataset.gen, this.theme).url})`;
    }

    bind() {
      const signal = this.abort.signal;
      this.root.querySelector('.cf-prev').addEventListener('click', () => this.prev('button'), { signal });
      this.root.querySelector('.cf-next').addEventListener('click', () => this.next('button'), { signal });
      this.root.querySelector('.cf-close').addEventListener('click', () => this.close('button'), { signal });
      this.root.querySelector('.cf-detail-scrim').addEventListener('click', () => this.close('scrim'), { signal });
      this.root.querySelector('.cf-audio').addEventListener('click', e => {
        this.muted = !this.muted;
        e.currentTarget.textContent = this.muted ? 'SOUND OFF' : 'SOUND ON';
        e.currentTarget.setAttribute('aria-label', this.muted ? 'Unmute sound' : 'Mute sound');
        if (!this.muted) this.sound('theme');
      }, { signal });
      this.themeHost.addEventListener('click', e => {
        const id = e.target.closest('[data-theme]')?.dataset.theme;
        if (id) this.setTheme(id, 'button');
      }, { signal });
      this.cardsHost.addEventListener('click', e => {
        const card = e.target.closest('.cf-card');
        if (!card || this.suppressClick) return;
        const index = +card.dataset.index;
        if (index === Math.round(this.target)) this.open('card');
        else this.select(index, 'card');
      }, { signal });
      this.stage.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') { e.preventDefault(); this.next('keyboard'); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev('keyboard'); }
        if (e.key === 'Enter' && !this.opened) { e.preventDefault(); this.open('keyboard'); }
        if (e.key === 'Escape') { e.preventDefault(); this.close('keyboard'); }
      }, { signal });
      this.root.addEventListener('keydown', e => { if (e.key === 'Escape' && this.opened) this.close('keyboard'); }, { signal });
      this.stage.addEventListener('wheel', e => {
        if (this.opened || this.items.length < 2) return;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if ((delta < 0 && this.target <= 0) || (delta > 0 && this.target >= this.items.length - 1)) return;
        e.preventDefault();
        this.motionEvent=null;
        this.target = clamp(this.target + delta / 320, 0, this.items.length - 1);
        clearTimeout(this.wheelTimer);
        this.wheelTimer = setTimeout(() => { this.target = Math.round(this.target); }, 100);
        if (performance.now() - this.lastMoveEvent >= 16) {
          this.emit('move', { position: this.pos, target: this.target, velocity: this.velocity, phase: 'drag', source: 'wheel' });
          this.lastMoveEvent = performance.now();
        }
        this.sound('move');
      }, { passive: false, signal });
      this.stage.addEventListener('pointerdown', e => {
        if (e.button !== 0 || this.opened) return;
        this.motionEvent=null;
        this.drag = { x: e.clientX, start: e.clientX, pos: this.pos, time: performance.now(), lastX: e.clientX, speed: 0 };
        this.stage.setPointerCapture(e.pointerId);
      }, { signal });
      this.stage.addEventListener('pointermove', e => {
        if (!this.drag) return;
        const d = this.drag;
        const dx = e.clientX - d.start;
        if (Math.abs(dx) < 6 && !d.active) return;
        d.active = true;
        d.speed = (e.clientX - d.lastX) / Math.max(1, performance.now() - d.time);
        d.lastX = e.clientX; d.time = performance.now();
        const step = this.stepSize();
        this.pos = clamp(d.pos - dx / step, 0, this.items.length - 1);
        this.target = this.pos; this.velocity = 0;
        this.render(this.clock);
        if (performance.now() - this.lastMoveEvent >= 16) {
          this.emit('move', { position: this.pos, target: this.target, velocity: d.speed, phase: 'drag', source: 'pointer' });
          this.lastMoveEvent = performance.now();
        }
      }, { signal });
      const release = () => {
        if (!this.drag) return;
        if (this.drag.active) {
          this.target = clamp(Math.round(this.pos - this.drag.speed * 170 / this.stepSize()), 0, this.items.length - 1);
          this.motionEvent={at:this.clock,from:this.pos,to:this.target};
          this.suppressClick = true; setTimeout(() => { this.suppressClick = false; }, 90);
          this.sound('move');
        }
        this.drag = null;
      };
      this.stage.addEventListener('pointerup', release, { signal });
      this.stage.addEventListener('pointercancel', release, { signal });
    }

    stepSize() { return Math.max(95, Math.min(265, this.stage.clientWidth * (this.stage.clientWidth < 620 ? .27 : .19))); }
    tick(now) {
      const dt = Math.min(.16, (now - this.lastTime) / 1000);
      this.lastTime = now;
      if (!this.manual && !this.drag) {
        this.clock += dt;
        if (reduced()) { this.pos = this.target; this.velocity = 0; }
        else if(this.motionEvent && this.clock-this.motionEvent.at<=CardMotion.profiles[this.theme].duration+.05){
          const previous=this.pos,e=this.motionEvent,age=this.clock-e.at;
          this.pos=clamp(e.from+(e.to-e.from)*CardMotion.progress(this.theme,age),0,this.items.length-1);
          this.velocity=age>=CardMotion.profiles[this.theme].duration?0:(this.pos-previous)/Math.max(dt,.001);
        } else {
          let left = dt;
          while (left > 0) {
            const step = Math.min(left, .016);
            const profile=global.CardMotion?.profiles[this.theme]||{k:90,c:17};
            const a = (this.target - this.pos) * profile.k - this.velocity * profile.c;
            this.velocity += a * step;
            this.pos += this.velocity * step;
            left -= step;
          }
          if (Math.abs(this.target - this.pos) < .012 && Math.abs(this.velocity) < .09) { this.pos = this.target; this.velocity = 0; }
        }
        if(this.motionEvent&&!this.motionEvent.sounded&&this.clock-this.motionEvent.at>=CardMotion.profiles[this.theme].duration*.68){
          this.motionEvent.sounded=true;if(this.motionEvent.from!==this.motionEvent.to)this.sound('land');
        }
        this.render(this.clock);
        if (!this.opened && this.velocity === 0 && Math.round(this.pos) !== this.focused) {
          const previousIndex = this.focused;
          this.focused = Math.round(this.pos);
          this.emit('focus', { previousIndex, source: 'settle' });
          if(!this.motionEvent?.sounded)this.sound('focus');
        }
      }
      this.raf = requestAnimationFrame(this.tick);
    }

    render(time) {
      const width = this.root.clientWidth, height = this.root.clientHeight;
      const mobile = width < 700, still = reduced();
      const family = THEMES[this.theme].family;
      const configs = {
        ember:[.73,.68,.466,7,.66],oxide:[.72,.68,.467,0,.66],
        'frozen-vault':[.72,.66,.466,13,.89],'rain-terminal':[.54,.62,.48,12,.91],
        'grid-blackout':[.46,.78,.48,0,.89],'ghost-market':[.65,.50,.425,10,.91]
      };
      const [hr,ratio,cy,angle,spread] = configs[this.theme];
      let ch = height*hr, cw = ch*ratio;
      if(mobile) { cw=Math.min(width*(this.theme==='ghost-market'?.66:.73),document.body.classList.contains('is-reel')?390:310); ch=Math.min(cw/ratio,height*(this.theme==='grid-blackout'?.49:.64)); cw=ch*ratio; }
      // Frozen's rail is measured in the 1586 x 992 backplate, then mapped
      // through the exact CSS background-size / background-position rules.
      const frozen=this.theme==='frozen-vault';
      const worldScale=mobile?Math.max(width/1586,height/992):height*1.06/992;
      const worldX=(width-1586*worldScale)/2,worldY=mobile?(height-992*worldScale)/2:0;
      const railSlope=81/1586,railLeft=worldY+707*worldScale-railSlope*worldX;
      const signature = [width,height,this.theme].join(':');
      if(this.layoutSignature !== signature) {
        this.root.style.setProperty('--cw',cw+'px'); this.root.style.setProperty('--ch',ch+'px');
        this.root.style.setProperty('--card-y',(mobile?(this.theme==='grid-blackout'?.51:.45):cy)*height+'px');
        this.root.dataset.family=family; this.layoutSignature=signature;
        if(frozen){
          this.root.style.setProperty('--frozen-rail-left',(railLeft-1)+'px');
          this.root.style.setProperty('--frozen-rail-right',(railLeft+railSlope*width-1)+'px');
        }
        this.root.querySelector('.cf-brand>span:nth-child(2)').textContent=family==='cyberpunk'?String(Object.keys(THEMES).indexOf(this.theme)+1).padStart(2,'0')+' / '+THEMES[this.theme].label:'Card File';
      }
      const centerY=(mobile?(this.theme==='grid-blackout'?.51:.45):cy)*height;
      this.root.style.setProperty('--floor-y',(centerY+ch*.49)+'px');
      const sweep=Motion.lightSweep(time%5,{s:[[0,-200],[3,600],[5,900]],w:45});
      const glint=`linear-gradient(112deg,transparent ${Math.max(0,sweep.s0/8-13)}%,rgba(225,240,255,.5) ${sweep.s0/8}%,transparent ${sweep.s0/8+13}%)`;
      for (let i = 0; i < this.nodes.length; i++) {
        const node=this.nodes[i];
        let position=this.pos;

        const d=i-position,ad=Math.abs(d),sign=Math.sign(d);
        const pose=reduced()?{x:0,y:0,z:0,rx:0,ry:0,rz:0,light:0,latch:0}:CardMotion.pose(this.theme,time,this.motionEvent,d);
        const passage=Math.sin(Math.PI*(this.pos-Math.floor(this.pos)))**2;
        const clearance=(this.theme==='ember'||this.theme==='oxide')?.40:this.theme==='frozen-vault'?0:.16;
        const travelSpread=spread+passage*clearance;
        const x=sign*cw*(Math.min(ad,1)*travelSpread+Math.max(0,ad-1)*(mobile?.48:(this.theme==='frozen-vault'?.44:family==='materials'?.30:this.theme==='grid-blackout'?.43:.48)));
        const scale=Math.max(.66,1-(this.theme==='ghost-market'?Math.min(ad,1)*.26+Math.max(0,ad-1)*.035:this.theme==='rain-terminal'?Math.min(ad,1)*.19+Math.max(0,ad-1)*.055:Math.min(ad,3)*.11));
        const slope=mobile?0:this.theme==='frozen-vault'?.046:this.theme==='ghost-market'?.04:this.theme==='rain-terminal'?-.012:0;
        let y=(1-scale)*ch*(this.theme==='ghost-market'?.16:.49)+x*slope+pose.y;
        const ry=angle-sign*Math.min(ad*(this.theme==='frozen-vault'?4:family==='materials'?37:5),family==='materials'?48:12),z=-Math.min(ad,3)*28;
        let rz=(mobile?0:this.theme==='frozen-vault'?1.4:this.theme==='rain-terminal'?1.8:this.theme==='ghost-market'?1:0)+pose.rz;
        if(frozen){
          // Both socket feet follow the same projected rail line. Compensate
          // perspective and rotation instead of letting scale lift the panel.
          const P=1500, originY=height*.48;
          const yaw=(ry+pose.ry)*Math.PI/180;
          const railCenter=railLeft+railSlope*width*.5+3;
          const roll=Math.atan(railSlope*Math.cos(yaw)+(railCenter-originY)*Math.sin(yaw)/P);
          rz=roll*180/Math.PI;
          const localY=ch*.493*scale;
          const px=-Math.sin(roll)*localY*Math.cos(yaw);
          const py=Math.cos(roll)*localY;
          const pz=Math.sin(roll)*localY*Math.sin(yaw);
          const projection=P/(P-z-pose.z-pz);
          const screenX=width*.5+(x+pose.x+px)*projection;
          const supportY=railLeft+railSlope*screenX+3;
          y=(supportY-originY)/projection-(centerY-originY)-py;
        }
        const transform=`translate(-50%,-50%) translate3d(${(x+pose.x).toFixed(2)}px,${y.toFixed(2)}px,${(z+pose.z).toFixed(2)}px) rotateY(${(ry+pose.ry).toFixed(2)}deg) rotateX(${pose.rx.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
        const opacity=ad>(mobile?2.5:3.5)?'0':'1';
        const layer=String(100-Math.round(ad*10)),focused=i===Math.round(this.pos);
        const fade=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
        const focus=1-fade(ad),detail=1-fade(ad/.38),artAlpha=1-fade(ad/.48);
        const sizes={ember:[.29,.17],oxide:[.20,.16],'frozen-vault':[.15,.12],'rain-terminal':[.20,.16],'grid-blackout':[.105,.09],'ghost-market':[.13,.12]}[this.theme];
        node.style.setProperty('--title-size',(sizes[1]+(sizes[0]-sizes[1])*focus).toFixed(5));
        node.style.setProperty('--detail-alpha',detail.toFixed(4));node.style.setProperty('--art-alpha',artAlpha.toFixed(4));
        node.style.setProperty('--focus-light',focus.toFixed(4));
        node.style.setProperty('--reflection-gap',(2-ch*.08-2*pose.y).toFixed(2)+'px');
        const side=d>.52?'right':d<-.52?'left':'center';
        if(node.dataset.side!==side)node.dataset.side=side;
        const brightness=`brightness(${(1-Math.min(ad,1)*.43).toFixed(3)})`;
        if(node._brightness!==brightness){node.style.filter=brightness;node._brightness=brightness;}
        if(node._transform!==transform){node.style.transform=transform;node._transform=transform;}
        if(node._opacity!==opacity){node.style.opacity=opacity;node._opacity=opacity;}
        if(node._layer!==layer){node._slot.style.zIndex=layer;node._layer=layer;}
        if(node._focused!==focused){node.classList.toggle('is-focused',focused);node._focused=focused;}
        node._glint.style.background=!still?glint:'none';
        node._glint.style.opacity=focused&&!still?String((.06+pose.light)*focus):'0';
        node.style.setProperty('--latch',pose.latch+'px');
        node.style.setProperty('--scan-y',this.theme==='grid-blackout'&&focused&&!still?((time*.13%1)*100).toFixed(2)+'%':'0%');
        if(node._art)node._art.style.transform='none';
        const baseY=centerY+(1-scale)*ch*.49+ch*.5*scale+x*slope;
        node._shadow.style.cssText=`left:calc(50% + ${x.toFixed(2)}px);top:${(baseY-2).toFixed(2)}px;width:${(cw*scale*.94).toFixed(2)}px;opacity:${((.35+.3*focus)*(1-Math.min(1,Math.abs(pose.y)/45)*.45)).toFixed(3)}`;
        const tabIndex=ad<1.6?0:-1;if(node.getAttribute('tabindex')!==String(tabIndex))node.tabIndex=tabIndex;
      }
      if(this.theme==='rain-terminal'||this.theme==='ghost-market')this.rain.style.transform=`translateY(${(still?0:time*38%90).toFixed(1)}px)`;
      const hud=this.root.querySelector('.cf-hud-wave');
      if(hud)hud.style.transform=`scaleY(${(still?1:1+Math.sin(time*1.8)*.06).toFixed(3)})`;
      this.artRenderer?.draw(time,reduced()?0:CardMotion.event(this.theme,time,this.motionEvent).hit);
      const focused = this.items[clamp(Math.round(this.pos), 0, Math.max(0, this.items.length - 1))];
      const index = focused?.number ?? '00';
      const total = String(this.items.length).padStart(2, '0');
      const indexText = `${index} / ${total}`;
      if (this.indexText !== indexText) { this.root.querySelector('.cf-index').textContent = indexText; this.indexText = indexText; }
      if (this.countText !== index) { this.root.querySelector('.cf-count').textContent = index; this.countText = index; }
      const statusText = focused ? `${focused.id.toUpperCase()} / ACCESS GRANTED` : 'NO RECORDS';
      if (this.statusText !== statusText) { this.root.querySelector('.cf-status').textContent = statusText; this.statusText = statusText; }
      this.root.querySelector('.cf-prev').disabled = this.target <= 0 || this.opened;
      this.root.querySelector('.cf-next').disabled = this.target >= this.items.length - 1 || this.opened;
    }

    select(index, source = 'api') {
      if (this.opened || !this.items.length) return;
      this.motionEvent={at:this.clock,from:this.pos,to:clamp(index,0,this.items.length-1)};
      this.target = clamp(index, 0, this.items.length - 1);
      this.emit('move', { position: this.pos, target: this.target, velocity: this.velocity, phase: 'settle', source });
      this.sound('move');
    }
    next(source) { this.select(Math.round(this.target) + 1, source); }
    prev(source) { this.select(Math.round(this.target) - 1, source); }
    open(source = 'api') {
      if (this.opened || !this.items.length) return;
      this.opened = true;
      const item = this.items[Math.round(this.pos)];
      this.root.querySelector('.cf-detail-number').textContent = `DOSSIER / ${item.number}`;
      this.root.querySelector('.cf-detail-title').textContent = item.title;
      this.root.querySelector('.cf-detail-kind').textContent = item.kind;
      this.root.querySelector('.cf-detail-description').textContent = item.description;
      this.root.querySelector('.cf-detail-art').replaceChildren(this.makeArt(Math.round(this.pos)));
      const link = this.root.querySelector('.cf-detail-link');
      link.hidden = !item.href;
      if (item.href) link.href = item.href;
      this.detail.classList.add('is-open');
      this.detail.setAttribute('aria-hidden', 'false');
      this.stage.inert = true;
      this.root.querySelector('.cf-bottom').inert = true;
      this.root.querySelector('.cf-controls').inert = true;
      this.root.querySelector('.cf-close').focus();
      this.emit('open', { source }); this.sound('open');
    }
    close(source = 'api') {
      if (!this.opened) return;
      this.opened = false;
      this.detail.classList.remove('is-open');
      this.detail.setAttribute('aria-hidden', 'true');
      this.stage.inert = false;
      this.root.querySelector('.cf-bottom').inert = false;
      this.root.querySelector('.cf-controls').inert = false;
      this.nodes[Math.round(this.pos)]?.focus();
      this.emit('close', { source }); this.sound('close');
    }
    setTheme(id, source = 'api') {
      this.validateTheme(id);
      if (id === this.theme) return;
      const from = this.theme;
      if(this.motionEvent)this.motionEvent={at:this.clock,from:this.pos,to:this.target};
      this.theme = id; this.root.dataset.theme = id; this.refreshGenerated(); this.artRenderer?.preload([id]); this.render(this.clock);
      for (const button of this.themeHost.children) button.setAttribute('aria-pressed', String(button.dataset.theme === id));
      this.emit('theme', { from, to: id, source }); this.sound('theme');
    }
    getTheme() { return this.theme; }
    setItems(items) {
      this.close();
      this.motionEvent = null; this.velocity = 0; this.drag = null;
      const id = this.items[Math.round(this.pos)]?.id;
      this.items = items.map(itemData);
      const found = this.items.findIndex(item => item.id === id);
      this.pos = this.target = found >= 0 ? found : clamp(this.pos, 0, Math.max(0, this.items.length - 1));
      this.drawCards(); this.artRenderer?.preload([this.theme]); this.render(this.clock);
    }
    present({ time = 0, position = this.pos, theme = this.theme, open = false, motion = null }) {
      this.manual = true;
      this.root.classList.add('cf-manual');
      this.validateTheme(theme);
      if (theme !== this.theme) {
        this.theme = theme; this.root.dataset.theme = theme; this.refreshGenerated();
        for (const button of this.themeHost.children) button.setAttribute('aria-pressed', String(button.dataset.theme === theme));
      }
      this.pos = this.target = clamp(position, 0, Math.max(0, this.items.length - 1));
      this.clock = time;
      open = open && this.items.length > 0;
      this.motionEvent = motion;
      this.detail.classList.toggle('is-open', open);
      this.detail.setAttribute('aria-hidden', String(!open));
      if (open) {
        const index = Math.round(this.pos);
        const item = this.items[index];
        this.root.querySelector('.cf-detail-number').textContent = `DOSSIER / ${item.number}`;
        this.root.querySelector('.cf-detail-title').textContent = item.title;
        this.root.querySelector('.cf-detail-kind').textContent = item.kind;
        this.root.querySelector('.cf-detail-description').textContent = item.description;
        if (this.presentationArtIndex !== index) this.root.querySelector('.cf-detail-art').replaceChildren(this.makeArt(index));
        this.presentationArtIndex = index;
      } else this.presentationArtIndex = -1;
      this.render(time);
    }
    sound(kind) {
      if (this.muted || this.manual) return;
      if(kind==='move' && performance.now()-(this.lastSoundAt||0)<65)return;
      this.lastSoundAt=performance.now();
      try {
        const Ctx = global.AudioContext || global.webkitAudioContext;
        if (!Ctx) return;
        this.audio ||= new Ctx();
        if (this.audio.state === 'suspended') this.audio.resume();
        const ctx = this.audio, at = ctx.currentTime;
        const families = { ember: [392, 587], oxide: [330, 494], 'frozen-vault': [440, 660], 'rain-terminal': [392, 784], 'grid-blackout': [247, 494], 'ghost-market': [349, 698] };
        let [base, high] = families[this.theme];
        if(this.theme==='grid-blackout'&&kind==='land')base=92;
        const freq = kind === 'close' ? base * .75 : kind === 'open' ? high : (kind === 'focus'||kind==='land') ? base : high * .75;
        const osc = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
        const mechanical=this.theme==='grid-blackout', glass=this.theme==='frozen-vault'||this.theme==='rain-terminal';
        osc.type = mechanical?'triangle':glass||kind==='move'?'sine':'triangle';
        osc.frequency.setValueAtTime(freq * (kind === 'open' ? .74 : 1.04), at);
        osc.frequency.exponentialRampToValueAtTime(freq, at + .095);
        filter.type = 'lowpass'; filter.frequency.value = kind === 'move' ? 1800 : 4000;
        gain.gain.setValueAtTime(.0001, at);
        gain.gain.exponentialRampToValueAtTime(kind === 'move' ? .025 : .07, at + .006);
        gain.gain.exponentialRampToValueAtTime(.0001, at + (kind === 'open' ? .42 : .22));
        osc.connect(filter).connect(gain).connect(ctx.destination);
        const delay = ctx.createDelay(.5), wet = ctx.createGain();
        delay.delayTime.value = .145;
        wet.gain.value = .22;
        gain.connect(delay).connect(wet).connect(ctx.destination);
        osc.start(at); osc.stop(at + .5);
        const profiles = {
          ember:[2100,.10,.012,1.5], oxide:[1300,.035,.024,2.4],
          'frozen-vault':[6200,.18,.010,3.1], 'rain-terminal':[3100,.065,.012,1.8],
          'grid-blackout':[750,.045,.033,.5], 'ghost-market':[4200,.075,.012,2.01]
        };
        const [band,tail,level,ratio]=profiles[this.theme];
        const buf=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*tail),ctx.sampleRate);
        const values=buf.getChannelData(0);
        for(let j=0;j<values.length;j++)values[j]=(Math.random()*2-1)*Math.exp(-j/values.length*7);
        const noise=ctx.createBufferSource(), tone=ctx.createBiquadFilter(), amp=ctx.createGain();
        noise.buffer=buf;tone.type='bandpass';tone.frequency.value=band;tone.Q.value=.9;
        amp.gain.value=level*(kind==='open'?1.4:1);
        noise.connect(tone).connect(amp).connect(ctx.destination);noise.start(at);
        const partial=ctx.createOscillator(), envelope=ctx.createGain();
        partial.type='sine';partial.frequency.setValueAtTime(freq*ratio,at);
        envelope.gain.setValueAtTime(.012,at);envelope.gain.exponentialRampToValueAtTime(.0001,at+tail*2);
        partial.connect(envelope).connect(ctx.destination);partial.start(at);partial.stop(at+tail*2+.01);

      } catch { /* visual interaction stays available without audio */ }
    }
    destroy() {
      this.artRenderer?.destroy();
      cancelAnimationFrame(this.raf);
      clearTimeout(this.wheelTimer);
      this.abort.abort();
      this.audio?.close();
      this.root.replaceChildren();
      this.root.classList.remove('cf');
    }
  }

  global.CardFile = Object.freeze({ THEMES, mount: (root, options) => new CardFileView(root, options || {}) });
})(window);

/* Bat Swarm, Ship Notes. MIT. Same simulation and painter on the web and desktop. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, DT = 1 / 60;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const mix = (a, b, p) => a + (b - a) * p;
  const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const rng = seed => () => { let t = seed += 0x6d2b79f5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const spring = t => 1 - Math.exp(-t * 11) * Math.cos(t * 10);
  // Fast downstroke, slow recovery. Deliberately different from a bird's sine flap.
  function wingbeat(t, phase, frequency) {
    const p = ((t * frequency + phase) % 1 + 1) % 1;
    return p < .27 ? mix(-.85, 1, ease(p / .27)) : mix(1, -.85, ease((p - .27) / .73));
  }
  // Independent appearance RNG leaves the accepted flight trajectories unchanged.
  function appearanceFor(i, seed = 31) {
    const r = rng(Math.imul((seed ^ (i + 1)) >>> 0, 0x45d9f3b));
    const kind = i % 3;
    const warm = r();
    return {
      kind, name: ['round', 'long-ears', 'wrapped'][kind],
      bodyW: [6.0, 3.7, 4.8][kind] * (.94 + r() * .12),
      bodyH: [8.3, 10.2, 9.5][kind], headW: [5.0, 3.9, 4.5][kind],
      earH: [7.0, 14.2, 8.7][kind] * (.92 + r() * .16),
      earW: [3.2, 2.25, 2.8][kind], earSplay: [.28, -.08, .12][kind] + (r()-.5)*.16,
      wing: [1.04, 1.15, .94][kind], belly: [.85, 1.05, 1.2][kind],
      coatW: [8.0, 5.6, 8.7][kind], eyeGap: [2.5, 2.0, 2.15][kind],
      eyeTilt: (r()-.5)*.25, gaze: (r()-.5)*.7, tuft: r()*6.28,
      furLight: warm>.5 ? '#9a8270' : '#827f78',
      furMid: warm>.5 ? '#69564b' : '#525454', furDark: '#24252b',
      membrane: warm>.5 ? '#59403d' : '#4a4145',
      membraneLight: warm>.5 ? '#79564b' : '#66545a',
      earInner: warm>.5 ? '#9a6b62' : '#876b70',
      sleep: kind===2 ? .74 : kind===0 ? .3 : .12
    };
  }
  class Swarm {
    constructor({ width = 1280, height = 800, count = 42, seed = 31, reduced = false, size = 1, initialPerches = [] } = {}) {
      this.w = width; this.h = height; this.size = size; this.seed = seed; this.reduced = reduced;
      this.t = 0; this.cursor = { x: width * .53, y: height * .44 }; this.lastMove = -9;
      this.perches = []; this.events = []; this.still = false;
      const r = rng(seed);
      this.bats = Array.from({ length: clamp(count | 0, 1, 150) }, (_, i) => {
        const a = r() * TAU, d = r() * width * .24;
        return { i, x: width * .5 + Math.cos(a) * d, y: height * .38 + Math.sin(a) * d * .5,
          vx: Math.cos(a) * 180, vy: Math.sin(a) * 140, rot: 0, phase: r(), frequency: 9 + r() * 5,
          scale: (.68 + r() * .65) * size, temper: r(), orbit: r() * TAU, mode: 'fly', since: 0,
          perch: null, ox: 0, px: 0, py: 0, fromX: 0, fromY: 0, fromRot: 0,
          oldX: 0, oldY: 0, release: -10, hist: [], eye: r(), shade: r(),
          clan: i % 4, solitary: i % 7 === 0, homeX: .12 + r() * .76, homeY: .18 + r() * .62,
          followX: width * .53, followY: height * .44, restDelay: 1.2 + r() * 1.65,
          reaction: .025 + r() * .16 + (i % 9 === 0 ? .19 : 0), pendingRelease: null,
          hangSkew: (r() - .5) * .15, nudgeTime: -10, nudgeDirection: 0 };
      });
      this.bats.forEach(b => {
        b.look = appearanceFor(b.i, seed); b.sleepy = b.i === 2;
        if (b.sleepy) b.reaction = 1.15;
        b.releaseFold = 1; b.wakeNoted = false;
      });
      this.setPerches(initialPerches);
      if (reduced) this.settle();
    }
    resize(w, h) { this.w = w; this.h = h; }
    move(x, y) {
      if (Math.hypot(x - this.cursor.x, y - this.cursor.y) > 2) {
        this.lastMove = this.t;
        this.cursor = { x, y };
        if(!this.reduced)for(const b of this.bats)if(b.mode==='hang'&&Math.hypot(b.x-x,b.y+15-y)<75)this.release(b);
      }
    }
    setPerches(rects) {
      const next = rects.filter(p => p.w >= 18).map(p => ({ ...p, id: String(p.id) }));
      const lookup = new Map(next.map(p => [p.id, p]));
      for (const b of this.bats) if (b.perch) {
        const p = lookup.get(b.perch.id);
        if (!p) this.release(b);
        else if (Math.abs(p.x - b.perch.x) > 1.5 || Math.abs(p.y - b.perch.y) > 1.5 || Math.abs(p.w - b.perch.w) > 1.5) {
          if (b.mode === 'hang' && !this.reduced) {
            // Feet keep hold while this bat notices the moving window.
            b.px += p.x - b.perch.x; b.py += p.y - b.perch.y;
            if (b.pendingRelease === null) { b.pendingRelease = this.t + b.reaction; b.wakeNoted = false; }
            b.perch = p;
          } else this.release(b);
        } else b.perch = p;
      }
      this.perches = next;
    }
    release(b, force = false) {
      const wake = b.sleepy && b.pendingRelease !== null ? ease((this.t - (b.pendingRelease - .24)) / .24) : 0;
      b.releaseFold = 1 - wake * .23; b.pendingRelease = null; b.wakeNoted = false;
      if (this.reduced) { b.perch = null; b.mode = 'quiet'; return; }
      b.mode = 'drop'; b.since = this.t; b.release = this.t;
      b.vx = (b.temper - .5) * 280; b.vy = 80; b.perch = null;
      if (force) { b.mode = 'fly'; b.vx *= 2; b.vy = -160 - b.temper * 160; }
    }
    scatter(x = this.cursor.x, y = this.cursor.y) {
      if (this.reduced) return;
      this.lastMove = this.t;
      for (const b of this.bats) {
        const a = Math.atan2(b.y - y, b.x - x) + (b.temper - .5) * .5;
        this.release(b, true); b.vx = Math.cos(a) * (300 + b.temper * 250); b.vy = Math.sin(a) * (280 + b.temper * 180);
      }
      this.events.push({ type: 'scatter', t: this.t, x, y });
    }
    slots() {
      const key = this.perches.map(p => [p.id,p.x,p.y,p.w].join(':')).join('|');
      if (key === this.slotKey) return this.slotCache;
      const slots = [];
      for (const p of this.perches) {
        let hash = this.seed;
        for (const ch of p.id) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
        const r = rng(hash), margin = Math.min(14 * this.size, p.w * .2);
        let x = margin + r() * 8 * this.size, inPocket = 0, pocketSize = 2 + Math.floor(r() * 3);
        while (x < p.w - margin) {
          slots.push({p, x:p.x+x, y:p.y+3});
          inPocket++;
          if (inPocket >= pocketSize) {
            x += (38 + r() * 28) * this.size; inPocket = 0; pocketSize = 2 + Math.floor(r() * 3);
          } else x += (20 + r() * 7) * this.size;
        }
        if (!slots.some(s => s.p === p)) slots.push({p,x:p.x+p.w*.5,y:p.y+3});
      }
      this.slotKey = key; this.slotCache = slots; return slots;
    }
    settle() {
      const slots = this.slots();
      this.bats.forEach((b, i) => {
        const s = slots[i];
        if (s) { b.perch = s.p; b.px = s.x; b.py = s.y; b.x = s.x; b.y = s.y; b.mode = 'hang'; b.rot = Math.PI; b.since = -5; }
        else b.mode = 'quiet';
      });
    }
    step(dt = DT) {
      this.t += dt;
      if (this.reduced) { this.settle(); return; }
      const t = this.t, idle = t - this.lastMove > 1.45, slots = idle ? this.slots() : [];
      if (slots.length) {
        const used = this.bats.filter(b => b.perch).map(b => ({x:b.px,y:b.py}));
        for (const b of this.bats) if (b.mode === 'fly' && t - this.lastMove > b.restDelay && t - b.release > 1.7 && t > .2 + b.i * .045) {
          let best = null, dist = Infinity;
          for (const s of slots) {
            if (used.some(u => Math.hypot(u.x - s.x, u.y - s.y) < 20 * this.size)) continue;
            const preference = (b.clan + .3 + b.temper * .4) / 4;
            const d = Math.hypot(b.x - s.x, b.y - s.y) * .65 + Math.abs((s.x-s.p.x)/s.p.w-preference) * 140 * this.size;
            if (d < dist) { dist = d; best = s; }
          }
          if (best) {
            b.perch = best.p; b.px = best.x; b.py = best.y;
            b.fromX = b.x; b.fromY = b.y; b.fromRot = b.rot; b.mode = 'land'; b.since = t;
            used.push(best);
          }
        }
      }
      for (const b of this.bats) {
        if (b.sleepy && b.pendingRelease !== null && !b.wakeNoted && t >= b.pendingRelease - .24) {
          b.wakeNoted = true; this.events.push({type:'wake',t,i:b.i,x:b.x,y:b.y});
        }
        if (b.pendingRelease !== null && t >= b.pendingRelease) this.release(b);
        b.oldX = b.x; b.oldY = b.y;
        if (b.mode === 'hang') {
          b.x = b.px; b.y = b.py; b.vx = b.vy = 0;
        } else if (b.mode === 'land') {
          const u = (t - b.since) / (1.05 + b.temper * .55), p = ease(u);
          b.x = mix(b.fromX, b.px, p);
          b.y = mix(b.fromY, b.py, p) - Math.sin(Math.PI * p) * (45 + b.temper * 55) * this.size;
          const flip = ease((u - .48) / .48);
          b.rot = mix(b.fromRot, Math.PI, flip);
          if (u >= 1) {
            b.mode = 'hang'; b.since = t; b.rot = Math.PI;
            for (const o of this.bats) if (o !== b && o.mode === 'hang' && o.perch?.id === b.perch?.id && Math.abs(o.px-b.px) < 43*this.size) {
              o.nudgeTime=t; o.nudgeDirection=Math.sign(o.px-b.px);
            }
            this.events.push({type:'land',t,x:b.x,y:b.y});
          }
        } else if (b.mode === 'drop') {
          const u = t - b.since;
          b.vy += 600 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
          b.rot = Math.PI * (1 - ease(u / .3));
          if (u > .22 + b.temper * .1) { b.mode = 'fly'; b.vy = -150 - b.temper * 140; this.events.push({type:'takeoff',t,x:b.x,y:b.y}); }
        } else if (b.mode === 'fly') {
          const age = t - b.release, free = clamp((age - .4) / .9);
          const follow = 1 - Math.exp(-dt * (1.0 + b.temper * 2.4));
          b.followX = mix(b.followX, this.cursor.x, follow); b.followY = mix(b.followY, this.cursor.y, follow);
          const a = t * (.43 + b.temper * .42) + b.orbit;
          const groupAngle = b.clan * 2.39996 + .28 * Math.sin(t * .21 + b.clan);
          const spreadX = Math.min(this.w * .3, 340 * this.size), spreadY = Math.min(this.h * .26, 210 * this.size);
          let cx = mix(this.w*.5, b.followX, .64) + Math.cos(groupAngle)*spreadX;
          let cy = mix(this.h*.45, b.followY, .58) + Math.sin(groupAngle)*spreadY;
          if (b.solitary) { cx=mix(this.w*b.homeX,b.followX,.22); cy=mix(this.h*b.homeY,b.followY,.2); }
          const radius = (28 + b.temper * 72) * this.size;
          const margin = Math.min(42*this.size,this.w*.1);
          const tx = clamp(cx + Math.cos(a)*radius,margin,this.w-margin);
          const ty = clamp(cy + Math.sin(a*1.4)*radius*.6,38*this.size,this.h-45*this.size);
          const zig = Math.sin(t * 11 + b.phase * 60) * Math.sin(t * 3.4 + b.i) * 400;
          let ax = (tx - b.x) * 5 + zig, ay = (ty - b.y) * 6 + Math.cos(t * 8 + b.i * 9) * 160;
          for (const o of this.bats) if (o !== b && o.mode === 'fly') {
            const dx = b.x - o.x, dy = b.y - o.y, d2 = dx * dx + dy * dy;
            const personal = (30 + (b.scale+o.scale)*5) * this.size;
            if (d2 < personal*personal && d2 > .01) {
              const d=Math.sqrt(d2), push=(1-d/personal)*1150;
              ax+=dx/d*push; ay+=dy/d*push;
            }
          }
          const damp = Math.exp(-1.9 * dt * free);
          b.vx = (b.vx + ax * dt * free) * damp; b.vy = (b.vy + ay * dt * free) * damp;
          const speed = Math.hypot(b.vx, b.vy), limit = 450 * this.size;
          if (speed > limit) { b.vx *= limit / speed; b.vy *= limit / speed; }
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.x < 15) { b.x = 15; b.vx = Math.abs(b.vx); } if (b.x > this.w - 15) { b.x = this.w - 15; b.vx = -Math.abs(b.vx); }
          if (b.y < 22) { b.y = 22; b.vy = Math.abs(b.vy); } if (b.y > this.h - 45) { b.y = this.h - 45; b.vy = -Math.abs(b.vy); }
          b.rot = mix(b.rot, clamp(b.vx / 550, -.95, .95), 1 - Math.exp(-dt * 10));
        }
        b.hist.unshift({x:b.oldX,y:b.oldY,rot:b.rot}); if (b.hist.length > 3) b.hist.length = 3;
      }
      this.still = this.bats.every(b => b.mode === 'hang' || b.mode === 'quiet');
      if (this.events.length > 300) this.events.splice(0, 150);
    }
  }
  function path(c, fn) { c.beginPath(); fn(); }
  function wing(c, side, f, fold, look, echo) {
    c.save(); c.scale(side, 1);
    const reach = mix((13.5 + (f+1)*8.2)*look.wing, 4, fold);
    const lift = mix(-5.5-f*10.5, 6, fold);
    const wrist={x:reach*.46,y:-8-f*2},tip={x:reach,y:lift};
    const ribs=[[tip.x,tip.y],[reach*.74,6+fold*10],[reach*.48,12*look.belly+fold*7],[reach*.24,16+fold*5]];
    path(c,()=>{
      c.moveTo(2,-5.5);c.quadraticCurveTo(wrist.x*.44,wrist.y-3.5,wrist.x,wrist.y);
      c.quadraticCurveTo(reach*.8,lift-5,tip.x,tip.y);
      c.quadraticCurveTo(reach*.76,lift+5.5,...ribs[1]);
      c.quadraticCurveTo(reach*.57,5,...ribs[2]);
      c.quadraticCurveTo(reach*.31,8,...ribs[3]);
      c.quadraticCurveTo(3,10,1,12);c.closePath();
    });
    if(echo){c.strokeStyle='rgba(171,148,141,.18)';c.lineWidth=.5;c.stroke();c.restore();return;}
    const g=c.createLinearGradient(1,-10,reach,17);
    g.addColorStop(0,'#292830');g.addColorStop(.45,look.membrane);
    g.addColorStop(.74,look.membraneLight);g.addColorStop(1,'#24232b');c.fillStyle=g;c.fill();
    // A thin dark edge, with light confined to the shoulder and finger ridges.
    c.strokeStyle='rgba(13,14,21,.38)';c.lineWidth=.55;c.stroke();
    if(fold<.9){
      for(let i=0;i<ribs.length;i++){
        const [x,y]=ribs[i];
        path(c,()=>{c.moveTo(wrist.x,wrist.y);c.quadraticCurveTo(x*.72,(wrist.y+y)*.4,x,y);});
        c.strokeStyle='rgba(17,15,23,.46)';c.lineWidth=.85;c.stroke();
        path(c,()=>{c.moveTo(wrist.x-.22,wrist.y);c.quadraticCurveTo(x*.72-.2,(wrist.y+y)*.4,x-.2,y-.15);});
        c.strokeStyle='rgba(201,168,145,.17)';c.lineWidth=.35;c.stroke();
      }
      path(c,()=>{c.moveTo(2,-5.5);c.quadraticCurveTo(wrist.x*.44,wrist.y-3.5,wrist.x,wrist.y);c.quadraticCurveTo(reach*.8,lift-5,tip.x,tip.y);});
      c.strokeStyle='rgba(203,178,155,.24)';c.lineWidth=.5;c.stroke();
    }
    c.restore();
  }
  function furryBody(c,look,t,phase){
    const breath=1+Math.sin(t*2+phase*TAU)*.025,w=look.bodyW*breath,h=look.bodyH;
    // A low-opacity outer mass softens the silhouette without a bright outline.
    c.fillStyle='rgba(98,86,79,.12)';path(c,()=>c.ellipse(0,.5,w*1.1,h*1.03,0,0,TAU));c.fill();
    path(c,()=>{
      for(let k=0;k<=36;k++){
        const a=k/36*TAU,tuft=1+Math.sin(k*2.8+look.tuft)*.055;
        const x=Math.cos(a)*w*tuft,y=.5+Math.sin(a)*h;
        if(!k)c.moveTo(x,y);else c.lineTo(x,y);
      }c.closePath();
    });
    const g=c.createRadialGradient(-w*.25,-h*.35,0,0,1,h*1.3);
    g.addColorStop(0,look.furLight);g.addColorStop(.42,look.furMid);g.addColorStop(1,look.furDark);c.fillStyle=g;c.fill();
    c.lineWidth=.38;
    for(const dark of [false,true]){
      c.beginPath();
      for(let k=0;k<14;k++){
        if((k%3===0)!==dark)continue;
        const a=k*2.39996+look.tuft,rad=.3+(k%4)*.14;
        const x=Math.cos(a)*w*rad,y=Math.sin(a)*h*.72;
        c.moveTo(x,y);c.quadraticCurveTo(x+.4,y+1,x*.92,y+1.8);
      }
      c.strokeStyle=dark?'rgba(18,19,25,.2)':'rgba(205,183,157,.13)';c.stroke();
    }
  }
  function coat(c,look,cover){
    c.save();c.globalAlpha*=cover;const w=look.coatW,hem=look.kind===2?-10.5:-6.2;
    const g=c.createLinearGradient(-w,0,w,0);g.addColorStop(0,look.membrane);g.addColorStop(.2,'#363039');g.addColorStop(.65,'#24252d');g.addColorStop(1,look.membraneLight);
    path(c,()=>{c.moveTo(-2,13);c.quadraticCurveTo(-w,7,-w,hem+4);c.quadraticCurveTo(-w*.8,hem-2,-2,hem);c.lineTo(.7,hem+2);c.lineTo(3,hem);c.quadraticCurveTo(w+1,hem,w*.88,3);c.quadraticCurveTo(w*.6,10,2,13);c.lineTo(0,11);c.closePath();});c.fillStyle=g;c.fill();
    c.strokeStyle='rgba(16,17,24,.4)';c.lineWidth=.55;c.stroke();
    path(c,()=>{c.moveTo(-1,11);c.quadraticCurveTo(-w*.5,2,-2,hem+1);c.moveTo(2,11);c.quadraticCurveTo(w*.5,3,2,hem+2);});c.strokeStyle='rgba(172,146,130,.15)';c.lineWidth=.4;c.stroke();
    c.restore();
  }
  function face(c,look,b,t,fold){
    const headY=-7.4,hw=look.headW;
    const earFill=c.createLinearGradient(0,headY,0,headY-look.earH);earFill.addColorStop(0,look.furDark);earFill.addColorStop(.7,look.furMid);earFill.addColorStop(1,look.furLight);
    for(const side of [-1,1]){
      const eh=look.earH*(side<0?1:.94),ew=look.earW,base=side*hw*.52,tip=base+side*(ew*.55+look.earSplay*eh);
      path(c,()=>{c.moveTo(base-side*1.1,headY-1);c.quadraticCurveTo(base-side*ew*.35,headY-eh*.7,tip,headY-eh);c.quadraticCurveTo(tip+side*ew*.8,headY-eh*.83,base+side*ew,headY-.3);c.closePath();});
      c.fillStyle=earFill;c.fill();
      path(c,()=>{c.moveTo(base+side*.5,headY-2);c.quadraticCurveTo(base+side*ew*.2,headY-eh*.65,tip,headY-eh+1.6);c.quadraticCurveTo(tip+side*ew*.25,headY-eh*.6,base+side*ew*.68,headY-1);});c.fillStyle=look.earInner;c.globalAlpha*=.54;c.fill();c.globalAlpha/=.54;
    }
    const g=c.createRadialGradient(-1,headY-2,0,0,headY,hw*1.55);g.addColorStop(0,look.furLight);g.addColorStop(.55,look.furMid);g.addColorStop(1,look.furDark);
    path(c,()=>c.ellipse(0,headY,hw,look.kind===0?4.7:4.2,0,0,TAU));c.fillStyle=g;c.fill();
    // Brows and tiny black eyes, not a pair of luminous dots.
    const blink=((t+b.eye*13)%4.9)<.11,sleepy=fold>.88?look.sleep:look.sleep*.16;
    c.beginPath();
    for(const side of [-1,1]){const ex=side*look.eyeGap,ey=headY-.65+side*look.eyeTilt;c.moveTo(ex+1.2,ey);c.ellipse(ex,ey,1.2,.94,0,0,TAU);}
    c.fillStyle='rgba(29,26,29,.48)';c.fill();
    if(!blink&&sleepy<.65){
      c.beginPath();for(const side of [-1,1]){const ex=side*look.eyeGap+look.gaze,ey=headY-.65+side*look.eyeTilt;c.moveTo(ex+.69,ey);c.ellipse(ex,ey,.69,Math.max(.2,.66-sleepy*.5),0,0,TAU);}c.fillStyle='#0e131a';c.fill();
      c.beginPath();for(const side of [-1,1]){const ex=side*look.eyeGap+look.gaze-.19,ey=headY-.88+side*look.eyeTilt;c.moveTo(ex+.2,ey);c.ellipse(ex,ey,.2,.18,0,0,TAU);}c.fillStyle='rgba(220,205,179,.8)';c.fill();
    }else{
      c.beginPath();for(const side of [-1,1]){const ex=side*look.eyeGap,ey=headY-.65+side*look.eyeTilt;c.moveTo(ex-1,ey);c.quadraticCurveTo(ex,ey+.75,ex+1,ey-.1);}c.lineWidth=.6;c.strokeStyle='#1a1b21';c.stroke();
    }
    c.beginPath();for(const side of [-1,1]){const ex=side*look.eyeGap,ey=headY-.65+side*look.eyeTilt;c.moveTo(ex-1.2,ey-1.4);c.quadraticCurveTo(ex,ey-1.6+sleepy,ex+1,ey-1.1+sleepy*.8);}c.lineWidth=.5;c.strokeStyle='rgba(159,139,119,.42)';c.stroke();
    path(c,()=>c.ellipse(0,headY+1.7,look.kind===0?2.7:2.1,1.45,0,0,TAU));c.fillStyle=look.furMid;c.fill();
    path(c,()=>{c.moveTo(-1,headY+1.1);c.quadraticCurveTo(0,headY+.6,1,headY+1.1);c.quadraticCurveTo(.3,headY+2.3,0,headY+2.1);c.closePath();});c.fillStyle='#24222a';c.fill();
    // The shy one pulls the membrane over the muzzle while sleeping.
    if(look.kind===2&&fold>.8){c.save();c.globalAlpha*=ease((fold-.8)/.2);path(c,()=>{c.moveTo(-look.coatW*.83,-5);c.quadraticCurveTo(-3,-7.5,0,-6.1);c.quadraticCurveTo(3,-8,look.coatW*.8,-5.5);c.lineTo(3,2);c.lineTo(-4,2);c.closePath();});c.fillStyle='#38313a';c.fill();path(c,()=>{c.moveTo(-look.coatW*.83,-5);c.quadraticCurveTo(-3,-7.5,0,-6.1);c.quadraticCurveTo(3,-8,look.coatW*.8,-5.5);});c.strokeStyle='rgba(171,143,127,.2)';c.lineWidth=.4;c.stroke();c.restore();}
  }
  function bat(c,b,t,{large=1,echo=false,alpha=1}={}){
    if(b.mode==='quiet')return;
    const look=b.look||appearanceFor(b.i||0),hang=b.mode==='hang',land=b.mode==='land';
    const u=land?(t-b.since)/(1.05+b.temper*.55):1;
    const wake=hang&&b.sleepy&&b.pendingRelease!==null?ease((t-(b.pendingRelease-.24))/.24):0;
    const fold=hang?1-wake*.23:land?ease((u-.58)/.42):b.mode==='drop'?(b.releaseFold??1)*(1-ease((t-b.since)/.3)):0;
    const f=wingbeat(t,b.phase,b.frequency),scale=b.scale*large;
    c.save();c.globalAlpha*=alpha;c.translate(b.x,b.y);
    const age=t-(b.nudgeTime??-10),nudge=hang&&age<.7?Math.sin(age*16)*Math.exp(-age*5)*.22*(b.nudgeDirection||1):0;
    const sway=hang?(b.hangSkew||0)+Math.sin(t*(1.2+b.temper)+b.phase*TAU)*.045+Math.exp(-(t-b.since)*5)*Math.sin((t-b.since)*13)*.2+nudge:0;
    c.rotate(b.rot+sway+Math.sin(wake*Math.PI)*.1);c.scale(scale,scale);
    c.translate(0,-16*ease((fold-.55)/.45));if(!hang)c.translate(0,f*.9);
    const wrap=ease((fold-.7)/.3);
    if(wrap<1){c.save();c.globalAlpha*=1-wrap;wing(c,-1,f+Math.sin(t*3+b.i)*.1,fold,look,echo);wing(c,1,f,fold,look,echo);c.restore();}
    if(!echo){
      path(c,()=>{c.moveTo(-3,7);c.lineTo(-2,16);c.lineTo(0,17.5);c.lineTo(2,16);c.lineTo(3,7);c.closePath();});c.fillStyle='#302c34';c.fill();
      if(wrap<1)furryBody(c,look,t,b.phase);if(wrap>0)coat(c,look,wrap);
      face(c,look,b,t,fold);
      c.lineWidth=.6;c.strokeStyle='rgba(149,131,112,.75)';
      for(const side of [-1,1]){path(c,()=>{c.moveTo(side*2,8);c.lineTo(side*2.7,16);c.lineTo(side*4.1,16.4);});c.stroke();}
    }
    c.restore();
  }
  class Painter {
    constructor(canvas) { this.canvas = canvas; this.c = canvas.getContext('2d', { alpha: true }); }
    resize(w, h, dpr = 1) { this.w=w;this.h=h;this.dpr=dpr;this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);this.canvas.style.width=w+'px';this.canvas.style.height=h+'px'; }
    draw(swarm, t = swarm.t) {
      const c=this.c; c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.w,this.h);
      for(const b of swarm.bats) {
        if(b.mode==='hang'||b.mode==='land') {
          c.save();c.translate(b.x+4*b.scale,b.y+21*b.scale);c.scale(b.scale,b.scale);
          const shadow=c.createRadialGradient(0,0,1,0,0,18);shadow.addColorStop(0,'rgba(0,0,0,.3)');shadow.addColorStop(1,'rgba(0,0,0,0)');
          c.fillStyle=shadow;c.fillRect(-20,-20,40,40);c.restore();
        }
      }
      const order=[...swarm.bats].sort((a,b)=>a.scale-b.scale);
      for(const b of order) {
        const speed=Math.hypot(b.vx,b.vy);
        if(b.mode==='fly'&&speed>220) for(const k of [2,1]) {
          const h=b.hist[k];if(h)bat(c,{...b,...h},t-k/60,{echo:true,alpha:.3/k});
        }
        bat(c,b,swarm.reduced?0:t);
      }
    }
  }
  root.BatSwarmCore={Swarm,Painter,bat,wingbeat,rng,DT,spring,appearanceFor,version:'2.3.0'};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.BatSwarmCore;
})(typeof globalThis!=='undefined'?globalThis:this);

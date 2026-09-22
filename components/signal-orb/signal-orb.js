// Signal Orb / Ship Notes. No dependencies, microphone or network requests.
(() => {
  if (customElements.get('signal-orb')) return;
  const names = ['listening', 'thinking', 'searching', 'done'];
  const colors = [[255,185,105],[178,151,255],[97,219,249],[136,239,194]];
  const count = 1000, tau = Math.PI * 2;
  const seeds = Array.from({length:count}, (_,i) => {
    const y = 1 - 2 * (i + .5) / count, a = i * 2.399963229728653;
    return {x:Math.cos(a)*Math.sqrt(1-y*y), y, z:Math.sin(a)*Math.sqrt(1-y*y), a, u:i/count};
  });
  class SignalOrb extends HTMLElement {
    static get observedAttributes() { return ['state','level']; }
    connectedCallback() {
      if (!this.shadowRoot) {
        this.attachShadow({mode:'open'}).innerHTML = `<style>:host{display:block;width:100%;aspect-ratio:1;contain:layout paint}canvas{width:100%;height:100%;display:block}</style><canvas aria-hidden="true"></canvas>`;
        this.canvas=this.shadowRoot.querySelector('canvas'); this.ctx=this.canvas.getContext('2d');
        this.setAttribute('role','img');
      }
      this.media=matchMedia('(prefers-reduced-motion: reduce)');
      this.weights=names.map(n=>n===this.state?1:0); this.time=0; this.last=0;
      this.resize=()=>{const size=Math.max(1,Math.round(this.getBoundingClientRect().width*Math.min(devicePixelRatio||1,2)));this.canvas.width=this.canvas.height=size;this.paint(this.media.matches?0:this.time,this.weights);};
      this.observer=new ResizeObserver(this.resize);this.observer.observe(this);this.resize();
      this.onMotion=()=>{cancelAnimationFrame(this.frame);this.last=0;this.paint(0,names.map(n=>n===this.state?1:0));if(!this.media.matches&&!this.hasAttribute('recording'))this.frame=requestAnimationFrame(this.tick);};
      this.media.addEventListener('change',this.onMotion);
      this.setAttribute('aria-label',`Assistant ${this.state}`);
      if(!this.hasAttribute('recording')&&!this.media.matches)this.frame=requestAnimationFrame(this.tick);
    }
    disconnectedCallback(){cancelAnimationFrame(this.frame);this.observer?.disconnect();this.media?.removeEventListener('change',this.onMotion);}
    get state(){const value=this.getAttribute('state');return names.includes(value)?value:'listening';}
    get level(){const n=Number(this.getAttribute('level')??'.5');return Number.isFinite(n)?Math.max(0,Math.min(1,n)):.5;}
    attributeChangedCallback(){if(!this.ctx)return;this.setAttribute('aria-label',`Assistant ${this.state}`);if(this.media?.matches){this.weights=names.map(n=>n===this.state?1:0);this.paint(0,this.weights);}}
    tick=(now)=>{
      const dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;this.time+=dt;
      const k=1-Math.exp(-dt*7);
      this.weights=this.weights.map((w,i)=>w+((names[i]===this.state?1:0)-w)*k);
      this.paint(this.time,this.weights);
      this.frame=requestAnimationFrame(this.tick);
    };
    // Absolute time and explicit weights make recording independent of frame order.
    renderAt(time,weights){this.paint(time,weights);}
    paint(t,w){
      const ctx=this.ctx,size=this.canvas.width;if(!size)return;
      const unit=size/720;ctx.setTransform(unit,0,0,unit,0,0);ctx.clearRect(0,0,720,720);
      const rgb=[0,1,2].map(c=>Math.round(colors.reduce((s,col,i)=>s+col[c]*w[i],0)));
      const color=rgb.join(',');
      const halo=ctx.createRadialGradient(360,360,10,360,360,305);
      halo.addColorStop(0,`rgba(${color},.075)`);halo.addColorStop(.57,`rgba(${color},.035)`);halo.addColorStop(1,`rgba(${color},0)`);
      ctx.fillStyle=halo;ctx.fillRect(0,0,720,720);
      const pts=seeds.map((p,i)=>{
        // Listening: an organic spherical membrane, displaced by supplied level.
        const spin=t*.23,cs=Math.cos(spin),sn=Math.sin(spin);
        const x=p.x*cs+p.z*sn,z=p.z*cs-p.x*sn;
        const r=192+Math.sin(p.y*11-t*3+p.a*.03)*(8+this.level*22)+Math.sin(p.a*.17+t*2)*5;
        const a=[x*r,p.y*r,z*r];
        // Thinking: a braided toroidal knot. The same points change topology.
        const theta=p.u*tau*3+t*.57,phi=p.u*tau*8-t*.48;
        const ring=137+41*Math.cos(phi),tube=24*Math.sin(p.a);
        const bx=(ring+tube)*Math.cos(theta),bz=(ring+tube)*Math.sin(theta),by=65*Math.sin(phi)+17*p.y;
        const b=[bx,by*.77-bz*.52,by*.52+bz*.77];
        // Searching: three tilted orbital bands with moving bright heads.
        const band=i%3,angle=p.u*tau*5+t*(.7+band*.2),radius=196+11*Math.sin(p.a);
        const sx=Math.cos(angle)*radius,sy=Math.sin(angle)*radius;
        const tilt=[.32,-.72,1.08][band],rot=[0,1.02,-.82][band];
        const sy2=sy*Math.cos(tilt+1),sz=sy*Math.sin(tilt+1);
        const c=[sx*Math.cos(rot)-sy2*Math.sin(rot),sx*Math.sin(rot)+sy2*Math.cos(rot),sz];
        // Done: a particle seal and a legible tick, not an implied task result.
        let d;
        if(i<650){const q=i/650*tau,rr=173+9*Math.sin(p.a);d=[Math.cos(q)*rr,Math.sin(q)*rr,8*Math.sin(p.a)];}
        else{const q=(i-650)/350,first=q<.38,v=first?q/.38:(q-.38)/.62;
          d=first?[-81+58*v,0+57*v,0]:[-23+116*v,57-133*v,0];d[0]+=6*Math.sin(p.a);d[1]+=6*Math.cos(p.a);}
        const v=[0,1,2].map(j=>a[j]*w[0]+b[j]*w[1]+c[j]*w[2]+d[j]*w[3]);
        const depth=(v[2]+240)/480,perspective=850/(850-v[2]);
        const sparkle=.75+.25*Math.sin(p.a+t*1.6);
        return {x:360+v[0]*perspective,y:360+v[1]*perspective,z:v[2],r:(.8+depth*1.35)*sparkle,alpha:.22+.72*depth};
      }).sort((a,b)=>a.z-b.z);
      ctx.globalCompositeOperation='lighter';
      for(const p of pts){
        ctx.fillStyle=`rgba(${color},${p.alpha*.065})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r*4.5,0,tau);ctx.fill();
        ctx.fillStyle=`rgba(${color},${p.alpha})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,tau);ctx.fill();
        if(p.z>75){ctx.fillStyle=`rgba(255,255,255,${(p.alpha-.5)*.75})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r*.45,0,tau);ctx.fill();}
      }
      ctx.globalCompositeOperation='source-over';
    }
  }
  customElements.define('signal-orb',SignalOrb);
})();

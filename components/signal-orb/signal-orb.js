// Signal Orb / Ship Notes. No dependencies, microphone or network requests.
(() => {
  if (customElements.get('signal-orb')) return;
  const names = ['listening', 'thinking', 'searching', 'done'];
  const colors = [[255,185,105],[178,151,255],[97,219,249],[136,239,194]];
  const tau = Math.PI * 2;
  const cache = new Map();
  const seedsFor = count => {
    // a dense Fibonacci sphere shows moire stripes, so past 1000 points each one gets a small fixed nudge
    const jitter = count > 1000 ? (1 - 1000 / count) * 1.6 / Math.sqrt(count) : 0;
    const rnd = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
    if (!cache.has(count)) cache.set(count, Array.from({length:count}, (_,i) => {
      const y0 = 1 - 2 * (i + .5) / count, a = i * 2.399963229728653 + (rnd(i) - .5) * jitter * 6;
      const y = Math.max(-1, Math.min(1, y0 + (rnd(i + .37) - .5) * jitter));
      return {x:Math.cos(a)*Math.sqrt(1-y*y), y, z:Math.sin(a)*Math.sqrt(1-y*y), a, u:i/count, sa:Math.sin(a), ca:Math.cos(a)};
    }));
    return cache.get(count);
  };
  // per band: cos/sin of the tilt, cos/sin of the rotation
  const bandTilt = [[.32,0],[-.72,1.02],[1.08,-.82]].map(([tilt,rot]) => [Math.cos(tilt+1),Math.sin(tilt+1),Math.cos(rot),Math.sin(rot)]);
  // Phones start lower; a slow live loop steps down on its own.
  const autoCount = () => matchMedia('(pointer: coarse)').matches ? 6000 : 12000;

  // One dot = solid core (to 20% of its radius), faint .065 halo, white spark in front. Same shape in both renderers.
  const VS = `attribute vec2 p;attribute vec3 d;uniform vec2 res;varying float a;varying float s;
    void main(){float size=max(d.x,2.0);float k=min(1.0,d.x*d.x/(size*size));a=d.y*k;s=d.z*k;
    gl_Position=vec4(p/res*2.0-1.0,0.0,1.0)*vec4(1,-1,1,1);gl_PointSize=size;}`;
  const FS = `precision mediump float;uniform vec3 col;varying float a;varying float s;
    void main(){float r=length(gl_PointCoord-.5)*2.0;if(r>1.0)discard;
    float dot=mix(1.0,.065,smoothstep(.17,.23,r))*(1.0-smoothstep(.9,1.0,r));
    float sp=mix(1.0,.065,smoothstep(.08,.12,r))*(1.0-smoothstep(.17,.2,r));
    gl_FragColor=vec4(col*dot*a+vec3(sp*s),min(1.0,dot*a+sp*s));}`;
  const setupGL = canvas => {
    const gl = canvas.getContext('webgl', {premultipliedAlpha:true, preserveDrawingBuffer:true, antialias:false});
    if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const lp = gl.getAttribLocation(prog, 'p'), ld = gl.getAttribLocation(prog, 'd');
    gl.enableVertexAttribArray(lp); gl.enableVertexAttribArray(ld);
    gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 20, 0); gl.vertexAttribPointer(ld, 3, gl.FLOAT, false, 20, 8);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    return {gl, res:gl.getUniformLocation(prog, 'res'), col:gl.getUniformLocation(prog, 'col')};
  };
  const sprite = (rgb, core) => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), grad = g.createRadialGradient(32,32,0,32,32,32);
    grad.addColorStop(0, `rgba(${rgb},1)`); grad.addColorStop(core, `rgba(${rgb},1)`);
    grad.addColorStop(core + .03, `rgba(${rgb},.065)`); grad.addColorStop(.94, `rgba(${rgb},.065)`); grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad; g.fillRect(0,0,64,64);
    return c;
  };

  class SignalOrb extends HTMLElement {
    static get observedAttributes() { return ['state','level','particles']; }
    connectedCallback() {
      if (!this.shadowRoot) {
        this.attachShadow({mode:'open'}).innerHTML = `<style>:host{display:block;width:100%;aspect-ratio:1;contain:layout paint;position:relative}canvas{position:absolute;inset:0;width:100%;height:100%;display:block}</style><canvas aria-hidden="true"></canvas><canvas aria-hidden="true"></canvas>`;
        const [halo, dots] = this.shadowRoot.querySelectorAll('canvas');
        this.canvas=halo; this.ctx=halo.getContext('2d'); this.dots=dots;
        this.gl=setupGL(dots); if(!this.gl) this.dctx=dots.getContext('2d');
        this.setAttribute('role','img');
      }
      this.media=matchMedia('(prefers-reduced-motion: reduce)');
      this.weights=names.map(n=>n===this.state?1:0); this.time=0; this.last=0; this.slow=0;
      this.resize=()=>{const size=Math.max(1,Math.round(this.getBoundingClientRect().width*Math.min(devicePixelRatio||1,2)));this.canvas.width=this.canvas.height=this.dots.width=this.dots.height=size;this.paint(this.media.matches?0:this.time,this.weights);};
      this.observer=new ResizeObserver(this.resize);this.observer.observe(this);this.resize();
      this.onMotion=()=>{cancelAnimationFrame(this.frame);this.last=0;this.paint(0,names.map(n=>n===this.state?1:0));if(!this.media.matches&&!this.hasAttribute('recording'))this.frame=requestAnimationFrame(this.tick);};
      this.media.addEventListener('change',this.onMotion);
      this.setAttribute('aria-label',`Assistant ${this.state}`);
      if(!this.hasAttribute('recording')&&!this.media.matches)this.frame=requestAnimationFrame(this.tick);
    }
    disconnectedCallback(){cancelAnimationFrame(this.frame);this.observer?.disconnect();this.media?.removeEventListener('change',this.onMotion);}
    get state(){const value=this.getAttribute('state');return names.includes(value)?value:'listening';}
    get level(){const n=Number(this.getAttribute('level')??'.5');return Number.isFinite(n)?Math.max(0,Math.min(1,n)):.5;}
    get particles(){const n=parseInt(this.getAttribute('particles'),10);return Number.isFinite(n)?Math.max(200,Math.min(20000,n)):(this.auto??=this.gl?autoCount():1000);}
    attributeChangedCallback(){if(!this.ctx)return;this.setAttribute('aria-label',`Assistant ${this.state}`);if(this.media?.matches){this.weights=names.map(n=>n===this.state?1:0);this.paint(0,this.weights);}}
    tick=(now)=>{
      const dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;this.time+=dt;
      // auto mode only: 30 slow frames in a row (under ~40 fps) cut the count by 40%
      if(!this.hasAttribute('particles')&&dt){this.slow=dt>.025?this.slow+1:0;if(this.slow>30&&this.auto>800){this.auto=Math.max(800,Math.round(this.auto*.6));this.slow=0;}}
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
      const rgb=[0,1,2].map(c=>Math.round(colors.reduce((s,col,i)=>s+col[c]*w[i],0))),color=rgb.join(',');
      const halo=ctx.createRadialGradient(360,360,10,360,360,305);
      halo.addColorStop(0,`rgba(${color},.075)`);halo.addColorStop(.57,`rgba(${color},.035)`);halo.addColorStop(1,`rgba(${color},0)`);
      ctx.fillStyle=halo;ctx.fillRect(0,0,720,720);
      const count=this.particles,seeds=seedsFor(count),ring=Math.round(count*.65);
      // more particles = finer and dimmer each, so the sphere gets denser instead of blown out
      const fine=Math.max(.5,Math.pow(1000/count,.55)),light=Math.min(1,Math.pow(1000/(count*fine*fine),.35));
      if(!this.buf||this.buf.length<count*5)this.buf=new Float32Array(count*5);
      const buf=this.buf,[w0,w1,w2,w3]=w,spin=t*.23,cs=Math.cos(spin),sn=Math.sin(spin),wave=8+this.level*22;
      for(let i=0;i<count;i++){
        const p=seeds[i];let vx=0,vy=0,vz=0;
        if(w0>.001){
          // Listening: an organic spherical membrane, displaced by supplied level.
          const x=p.x*cs+p.z*sn,z=p.z*cs-p.x*sn;
          const r=(192+Math.sin(p.y*11-t*3+p.a*.03)*wave+Math.sin(p.a*.17+t*2)*5)*w0;
          vx+=x*r;vy+=p.y*r;vz+=z*r;
        }
        if(w1>.001){
          // Thinking: a braided toroidal knot. The same points change topology.
          const theta=p.u*tau*3+t*.57,phi=p.u*tau*8-t*.48,rt=137+41*Math.cos(phi)+24*p.sa;
          const bx=rt*Math.cos(theta),bz=rt*Math.sin(theta),by=65*Math.sin(phi)+17*p.y;
          vx+=bx*w1;vy+=(by*.77-bz*.52)*w1;vz+=(by*.52+bz*.77)*w1;
        }
        if(w2>.001){
          // Searching: three tilted orbital bands with moving bright heads.
          const band=i%3,angle=p.u*tau*5+t*(.7+band*.2),radius=196+11*p.sa;
          const sx=Math.cos(angle)*radius,sy=Math.sin(angle)*radius;
          const sy2=sy*bandTilt[band][0],sz=sy*bandTilt[band][1],cr=bandTilt[band][2],sr=bandTilt[band][3];
          vx+=(sx*cr-sy2*sr)*w2;vy+=(sx*sr+sy2*cr)*w2;vz+=sz*w2;
        }
        if(w3>.001){
          // Done: a particle seal and a legible tick, not an implied task result.
          if(i<ring){const q=i/ring*tau,rr=173+9*p.sa;vx+=Math.cos(q)*rr*w3;vy+=Math.sin(q)*rr*w3;vz+=8*p.sa*w3;}
          else{const q=(i-ring)/(count-ring),first=q<.38,v=first?q/.38:(q-.38)/.62;
            vx+=((first?-81+58*v:-23+116*v)+6*p.sa)*w3;vy+=((first?57*v:57-133*v)+6*p.ca)*w3;}
        }
        const depth=(vz+240)/480,persp=850/(850-vz),alpha=.22+.72*depth;
        const r=(.8+depth*1.35)*(.75+.25*Math.sin(p.a+t*1.6))*fine,o=i*5;
        buf[o]=(360+vx*persp)*unit;buf[o+1]=(360+vy*persp)*unit;buf[o+2]=r*9*unit;
        buf[o+3]=Math.min(1,alpha*light);buf[o+4]=vz>75?(alpha-.5)*.75*light:0;
      }
      if(this.gl)this.drawGL(buf,count,rgb,size);else this.draw2D(buf,count,color,size);
    }
    drawGL(buf,count,rgb,size){
      const {gl,res,col}=this.gl;
      gl.viewport(0,0,size,size);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(res,size,size);gl.uniform3f(col,rgb[0]/255,rgb[1]/255,rgb[2]/255);
      gl.bufferData(gl.ARRAY_BUFFER,buf.subarray(0,count*5),gl.DYNAMIC_DRAW);gl.drawArrays(gl.POINTS,0,count);
    }
    // Fallback when WebGL is unavailable: same dots through 2D sprites, fine up to ~1000 points.
    draw2D(buf,count,color,size){
      const ctx=this.dctx;
      if(this.spriteColor!==color){this.spriteColor=color;this.dot=sprite(color,.2);this.spark=sprite('255,255,255',.5);}
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,size,size);ctx.globalCompositeOperation='lighter';
      for(let i=0;i<count;i++){
        const o=i*5,x=buf[o],y=buf[o+1],s=buf[o+2];
        ctx.globalAlpha=buf[o+3];ctx.drawImage(this.dot,x-s/2,y-s/2,s,s);
        if(buf[o+4]>0){const h=s*.2;ctx.globalAlpha=buf[o+4];ctx.drawImage(this.spark,x-h/2,y-h/2,h,h);}
      }
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    }
  }
  customElements.define('signal-orb',SignalOrb);
})();

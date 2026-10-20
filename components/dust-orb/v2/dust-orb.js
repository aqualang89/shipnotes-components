/* Dust Orb by Ship Notes (@shipnotesai). Visual study 2.0, MIT.
   Bundled Three.js r180 on window.THREE. See LICENSE and vendor/THREE-LICENSE.txt. */
(() => {
  'use strict';
  const MAX=200000,STATES=['idle','listening','thinking','speaking','agitated'];
  const ALIAS={alert:'agitated',error:'agitated',talking:'speaking',processing:'thinking',waiting:'idle'};
  const TIERS=[16000,40000,80000,140000,200000];
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
  const mix=(a,b,t)=>a+(b-a)*t;
  const rand=seed=>{let s=seed>>>0;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296}};
  const {vertex:VERTEX,fragment:FRAGMENT}=window.DustMaterial;
  class DustOrb extends HTMLElement{
    static get observedAttributes(){return ['recording'];}
    constructor(){super();this._events=[];this._state='idle';this._quality='auto';this._count=80000;this._tier=2;this._energy=.52;this._light=.67;this._time=0;this._last=0;this._frame=0;this._fps=null;this._samples=[];this._autoWait=0;this._paused=false;this._rotation={x:0,y:0};this._rotateGoal={x:0,y:0};this._visible=true;this._target={x:0,y:0};this._pointer={x:0,y:0};this._press=-100;this._destroyed=false;this._raf=this._raf.bind(this);}
    connectedCallback(){
      if(this.shadowRoot&&!this._destroyed){this._schedule();return;}
      this._destroyed=false;this._frame=0;this._last=0;this._fallback=false;this._lost=false;
      this._hover=false;this._attention=0;this._focus={x:0,y:0};this._lampTarget={x:0,y:0};this._trail={x:0,y:0};
      (this.shadowRoot||this.attachShadow({mode:'open'})).innerHTML=`<style>:host{display:block;position:relative;width:100%;height:100%;min-height:200px;contain:layout style}canvas{width:100%;height:100%;display:block;touch-action:pan-y;outline:none}canvas:focus-visible{outline:1px solid #b7b3a3;outline-offset:-8px;border-radius:8px}.message{position:absolute;bottom:10px;left:20px;right:20px;text-align:center;font:12px/1.5 system-ui;color:#b0aba0;pointer-events:none}</style><canvas tabindex="0" role="img" aria-label="Living dust cloud. Drag to rotate. Press Space to send a pulse."></canvas><div class="message" role="status"></div>`;
      this._canvas=this.shadowRoot.querySelector('canvas');this._message=this.shadowRoot.querySelector('.message');
      this._motion=matchMedia('(prefers-reduced-motion: reduce)');this._paused=this._motion.matches;
      this._abort=new AbortController();const signal=this._abort.signal;
      this._build();
      this._motion.addEventListener('change',()=>{this._paused=this._motion.matches;this._last=0;this._schedule()},{signal});
      document.addEventListener('visibilitychange',()=>{this._last=0;if(document.hidden){cancelAnimationFrame(this._frame);this._frame=0}else this._schedule()},{signal});
      this._canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this._lost=true;cancelAnimationFrame(this._frame);this._frame=0;this._message.textContent='Graphics paused. Waiting for the browser to restore them.'},{signal});
      this._canvas.addEventListener('webglcontextrestored',()=>{this._lost=false;this._message.textContent='';this._resize();this._schedule()},{signal});
      const locate=e=>{const r=this.getBoundingClientRect();this._target={x:(e.clientX-r.x)/r.width*2-1,y:1-(e.clientY-r.y)/r.height*2};this._hover=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;};
      this._canvas.addEventListener('pointerenter',e=>{locate(e);this._schedule()},{signal});
      this._canvas.addEventListener('pointerdown',e=>{locate(e);this._drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};this._canvas.setPointerCapture(e.pointerId);this._schedule()},{signal});
      this._canvas.addEventListener('pointermove',e=>{
        locate(e);
        if(this._drag){const dx=e.clientX-this._drag.lastX,dy=e.clientY-this._drag.lastY;this._rotateGoal.x+=dx*.005;this._rotateGoal.y=clamp(this._rotateGoal.y+dy*.003,-.7,.7);this._drag.lastX=e.clientX;this._drag.lastY=e.clientY;if(Math.hypot(e.clientX-this._drag.x,e.clientY-this._drag.y)>7)this._drag.moved=true;}this._schedule();
      },{signal});
      this._canvas.addEventListener('pointerup',e=>{locate(e);if(this._drag&&!this._drag.moved)this.pulse();this._drag=null;if(e.pointerType!=='mouse')this._hover=false;if(this._canvas.hasPointerCapture(e.pointerId))this._canvas.releasePointerCapture(e.pointerId);this._schedule()},{signal});
      this._canvas.addEventListener('pointercancel',()=>{this._drag=null;this._hover=false;this._schedule()},{signal});
      this._canvas.addEventListener('lostpointercapture',()=>{if(this._drag){this._drag=null;this._hover=false;this._schedule()}},{signal});
      this._canvas.addEventListener('pointerleave',()=>{this._hover=false;this._schedule()},{signal});
      this._canvas.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();this.pulse()}},{signal});
      this._intersection=new IntersectionObserver(entries=>{this._visible=entries[0].isIntersecting;this._last=0;if(this._visible)this._schedule();else{cancelAnimationFrame(this._frame);this._frame=0}},{threshold:.01});this._intersection.observe(this);
      this._observer=new ResizeObserver(()=>this._resize());this._observer.observe(this);this._resize();this._schedule();
    }
    disconnectedCallback(){this.destroy()}
    attributeChangedCallback(){if(this.hasAttribute('recording')){cancelAnimationFrame(this._frame);this._frame=0;}else{this._last=0;this._schedule();}}
    _build(){
      try{
        const T=window.THREE;if(!T)throw Error('Three.js is unavailable');
        this._renderer=new T.WebGLRenderer({canvas:this._canvas,alpha:true,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:true});
        this._renderer.setClearColor(0x000000,0);this._renderer.setPixelRatio(1);this._renderer.outputColorSpace=T.LinearSRGBColorSpace;
        this._scene=new T.Scene();this._camera=new T.PerspectiveCamera(43,1,.1,30);this._camera.position.z=4.9;
        const random=rand(1729),edge=32,data=new Uint8Array(edge*edge*edge*4);
        for(let i=0;i<data.length;i+=4){data[i]=random()*255;data[i+1]=random()*255;data[i+2]=random()*255;data[i+3]=255;}
        this._noise=new T.Data3DTexture(data,edge,edge,edge);this._noise.format=T.RGBAFormat;this._noise.type=T.UnsignedByteType;this._noise.minFilter=this._noise.magFilter=T.LinearFilter;this._noise.wrapS=this._noise.wrapT=this._noise.wrapR=T.RepeatWrapping;this._noise.unpackAlignment=1;this._noise.needsUpdate=true;
        const make=(count,gas)=>{
          const geometry=new T.BufferGeometry(),positions=new Float32Array(count*3),seeds=new Float32Array(count*4),random=rand(gas?9723:3481);
          for(let i=0;i<count;i++){
            const z=random()*2-1,a=random()*Math.PI*2,s=Math.sqrt(1-z*z),layer=random();
            let radius=gas?Math.pow(random(),.65)*.96:layer<.80?(.78+Math.floor(random()*3)*.15)+(random()-.5)*.055:layer<.94?Math.pow(random(),.4)*1.07:1.1+random()*.22;
            radius+=gas?0:.16*Math.sin(a*3+z*4)*Math.cos(z*5)+.045*Math.sin(a*7-z*9);
            positions.set([s*Math.cos(a)*radius,z*radius,s*Math.sin(a)*radius],i*3);seeds.set([random(),random(),random(),layer],i*4);
          }
          geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('aSeed',new T.BufferAttribute(seeds,4));
          const uniforms={uNoise:{value:this._noise},uTime:{value:0},uEnergy:{value:.52},uLight:{value:.67},uRatio:{value:1},uDensity:{value:1},uGas:{value:gas?1:0},uModes:{value:new T.Vector4()},uPointer:{value:new T.Vector2()},uRotate:{value:new T.Vector2()},uPulse:{value:0},uVoice:{value:0}};
          Object.assign(uniforms,{uAttention:{value:0},uCameraZ:{value:4.9},uLampTarget:{value:new T.Vector2()},uTrail:{value:new T.Vector2()}});
          const material=new T.RawShaderMaterial({glslVersion:T.GLSL3,vertexShader:VERTEX,fragmentShader:FRAGMENT,uniforms,transparent:true,depthTest:false,depthWrite:false,blending:T.AdditiveBlending});
          const points=new T.Points(geometry,material);points.frustumCulled=false;points.renderOrder=gas?0:1;this._scene.add(points);return {geometry,material,uniforms,points};
        };
        this._dust=make(MAX,false);this._gas=make(1400,true);this._dust.geometry.setDrawRange(0,this._count);this._gas.geometry.setDrawRange(0,this._count<=40000?650:1400);
        this._renderer.compile(this._scene,this._camera);
        const gl=this._renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');this._device=extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):'WebGL 2';
        if(/swiftshader|llvmpipe|software/i.test(this._device)){this._tier=0;this._setCount(TIERS[0]);}
      }catch(error){
        this._fallback=true;this._device='Canvas 2D fallback';this._count=5000;
        const old=this._canvas,fresh=old.cloneNode();old.replaceWith(fresh);this._canvas=fresh;this._ctx=fresh.getContext('2d');
        const random=rand(774);this._cpu=Array.from({length:5000},()=>{const z=random()*2-1,a=random()*Math.PI*2,r=1+(random()-.5)*.25;return{x:Math.sqrt(1-z*z)*Math.cos(a)*r,y:z*r,z:Math.sqrt(1-z*z)*Math.sin(a)*r,seed:random()}});
        this._message.textContent='Compatibility mode · 5,000 particles';console.warn('Dust Orb: using Canvas 2D compatibility mode.',error.message);
      }
    }
    _resize(){
      if(!this._canvas||this._destroyed)return;
      const r=this.getBoundingClientRect();if(!r.width||!r.height)return;this._w=r.width;this._h=r.height;
      if(this._fallback){this._canvas.width=r.width;this._canvas.height=r.height;}
      else{const ratio=Math.min(devicePixelRatio||1,this._count<=40000?1:1.35);this._ratio=ratio;this._renderer.setPixelRatio(ratio);this._renderer.setSize(r.width,r.height,false);this._camera.aspect=r.width/r.height;const aspect=r.width/r.height;this._camera.position.z=Math.max(r.width<500?4.7:4.35,1.7/(.394*aspect));this._camera.updateProjectionMatrix();}
      if(this.hasAttribute('recording')&&this._snapshot)this.renderAt(this._snapshot.time,this._snapshot.options);
      else this.renderAt(this._time,{events:this._events});
    }
    _schedule(){if(!this._frame&&!this._destroyed&&!this._lost&&this._visible&&!document.hidden&&!this.hasAttribute('recording'))this._frame=requestAnimationFrame(this._raf)}
    _raf(now){
      this._frame=0;if(this.hasAttribute('recording')||this._destroyed||this._lost||!this._visible||document.hidden)return;
      const elapsed=this._last?(now-this._last)/1000:1/60,dt=Math.min(.08,elapsed);this._last=now;
      if(!this._paused)this._time+=dt;
      const follow=1-Math.exp(-dt*5);this._rotation.x=mix(this._rotation.x,this._rotateGoal.x,1-Math.exp(-dt*7));this._rotation.y=mix(this._rotation.y,this._rotateGoal.y,1-Math.exp(-dt*7));this._pointer.x=mix(this._pointer.x,this._target.x,follow);this._pointer.y=mix(this._pointer.y,this._target.y,follow);
      this._stepAttention(dt,this._paused);
      this.renderAt(this._time,{events:this._events});
      if(!this._paused){this._samples.push(elapsed*1000);if(this._samples.length>=90)this._performance();this._schedule()}
    }
    _stepAttention(dt,instant=false){
      const halfHeight=(this._camera?.position.z||4.35)*Math.tan(43*Math.PI/360),aspect=this._w/this._h;
      let x=this._target.x*halfHeight*aspect,y=this._target.y*halfHeight;
      const distance=Math.hypot(x,y),falloff=clamp((distance-1.45)/.9);
      const goal=this._hover?(1-falloff*falloff*(3-2*falloff))*(this._drag?.moved ? .55 : 1):0;
      const limit=Math.min(1,2.05/(distance||1));x*=limit;y*=limit;
      const amount=rate=>instant?1:1-Math.exp(-dt*rate);
      // Hold the last position on leave so the fold relaxes in place, not across the core.
      if(this._hover){this._focus.x=mix(this._focus.x,x,amount(8));this._focus.y=mix(this._focus.y,y,amount(8));}
      this._attention=mix(this._attention,goal,amount(goal>this._attention?4.5:2.5));
      for(const axis of ['x','y']){
        this._lampTarget[axis]=mix(this._lampTarget[axis],this._focus[axis],amount(1.8));
        this._trail[axis]=mix(this._trail[axis],this._focus[axis],amount(2.4));
      }
    }
    _performance(){
      const sorted=this._samples.slice().sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];this._fps=Math.round(1000/median);this._samples=[];
      if(this._quality==='auto'&&!this._fallback){
        this._autoWait++;
        if(this._autoWait>=2&&median>23&&this._tier>0){this._tier--;this._setCount(TIERS[this._tier]);this._autoWait=0;}
        else if(this._autoWait>=5&&median<17.7&&this._tier<TIERS.length-1&&!/swiftshader|software/i.test(this._device)){this._tier++;this._setCount(TIERS[this._tier]);this._autoWait=0;}
      }
      this.dispatchEvent(new CustomEvent('performance',{detail:this.stats}));
    }
    _setCount(count){this._count=count;if(this._dust){this._dust.geometry.setDrawRange(0,count);this._gas.geometry.setDrawRange(0,count<=40000?650:1400);this._resize();}this.dispatchEvent(new CustomEvent('qualitychange',{detail:this.stats}));}
    get stats(){return {count:this._count,fps:this._fps,quality:this._quality,device:this._device||'initializing',fallback:!!this._fallback};}
    get state(){return this._state;}
    set state(value){this.setState(value)}
    setState(value){value=ALIAS[value]||value;if(!STATES.includes(value))throw new RangeError('Unknown orb state: '+value);if(value===this._state)return;this._state=value;this._events.push({t:this._time,state:value});if(this._events.length>64){const cut=this._events.length-32,at=this._events[cut].t,weights=this._weights(at,this._events.slice(0,cut));this._events=[{t:at,weights},...this._events.slice(cut)];}if(this._paused){this._events=[{t:0,state:value}];this._time=Math.max(this._time,2);}this._schedule();this.dispatchEvent(new CustomEvent('statechange',{detail:{state:value}}));}
    setEnergy(value){this._energy=clamp(value);this._schedule()}
    setLight(value){this._light=clamp(value);this._schedule()}
    setVoiceLevel(value){this._voice=clamp(value);this._schedule()}
    setVoice(value){this.setVoiceLevel(value)}
    setQuality(value){
      if(value!=='auto'&&![16000,40000,80000,140000,200000].includes(+value))throw new RangeError('Unsupported particle count');
      this._quality=value==='auto'?'auto':+value;this._autoWait=0;this._samples=[];
      if(!this._fallback){if(value==='auto'){this._tier=2;this._setCount(TIERS[this._tier])}else this._setCount(+value);}return this.stats;
    }
    pause(value=true){this._paused=!!value;this._last=0;this._schedule();return this._paused;}
    pulse(){this._press=this._time;this._schedule()}
    _weights(t,events){
      let weights=[1,0,0,0,0],start=weights.slice(),target=0,at=0;
      const sample=time=>start.map((v,i)=>mix(v,+(i===target),1-Math.exp(-Math.max(0,time-at)/.32)));
      for(const e of [...events].sort((a,b)=>a.t-b.t)){if(e.t>t)break;if(e.weights){start=e.weights.slice();target=STATES.indexOf(this._state);at=e.t;continue;}const index=STATES.indexOf(e.state);if(index<0)continue;weights=sample(e.t);start=weights;target=index;at=e.t;}
      return sample(t);
    }
    renderAt(time,{state,events,energy=this._energy,light=this._light,rotation=this._rotation,pointer=this._focus,attention=this._attention,lamp=this._lampTarget,trail=this._trail,pulse,voice=this._voice||0}={}){
      if(this._destroyed||!this._w||this._lost)return;
      this._snapshot={time,options:{state,events,energy,light,rotation:{...rotation},pointer:{...pointer},attention,lamp:{...lamp},trail:{...trail},pulse,voice}};
      const t=Math.max(0,+time||0),weights=state?STATES.map(s=>+(s===state)):this._weights(t,events??this._events);
      const age=t-this._press,impulse=pulse??(age>=0&&age<2?Motion.gate(age,0,.11)*Math.exp(-age*2.3)*(1+.08*(Motion.spring(age)-1)):0);
      if(this._fallback){this._renderCPU(t,weights,energy,light,pointer,attention,rotation);return {weights,count:5000,fallback:true};}
      const density=Math.pow(200000/this._count,.43);
      for(const layer of [this._dust,this._gas]){
        const u=layer.uniforms;u.uTime.value=t;u.uEnergy.value=clamp(energy);u.uLight.value=clamp(light);u.uRatio.value=this._ratio||1;u.uDensity.value=layer===this._dust?density:1;u.uModes.value.set(...weights.slice(1));u.uPointer.value.set(pointer.x,pointer.y);u.uRotate.value.set(rotation.x,rotation.y);u.uPulse.value=impulse;u.uVoice.value=clamp(voice);
        u.uAttention.value=clamp(attention);u.uLampTarget.value.set(lamp.x,lamp.y);u.uTrail.value.set(trail.x,trail.y);u.uCameraZ.value=this._camera.position.z;
      }
      this._renderer.render(this._scene,this._camera);
      if(this.hasAttribute('recording'))this._renderer.getContext().flush();
      return {weights,count:this._count,fallback:false};
    }
    _renderCPU(t,weights,energy,light,pointer,attention,rotation){
      const c=this._ctx,w=this._w,h=this._h,scale=Math.min(w,h)*.33;c.clearRect(0,0,w,h);
      const warm=weights[2]+weights[4],r=warm>0.3?220:155,g=weights[4]>.5?85:180,b=weights[4]>.5?65:193;
      const glow=c.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,scale);glow.addColorStop(0,`rgba(${r},${g},${b},${light*.08})`);glow.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=glow;c.fillRect(0,0,w,h);
      c.fillStyle=`rgba(${r},${g},${b},.34)`;
      for(const q of this._cpu){const n=Math.sin(q.y*5+t*.3)*Math.cos(q.z*4-t*.2)*(.12+energy*.10),a=t*.035+rotation.x,x=q.x*Math.cos(a)+q.z*Math.sin(a),z=-q.x*Math.sin(a)+q.z*Math.cos(a),perspective=3.5/(3.5-z);let px=x*(1+n)*perspective,py=-q.y*(1+n)*perspective;const dx=pointer.x-px,dy=pointer.y-py,pull=Math.exp(-(dx*dx+dy*dy)*2.5)*attention*.55;px+=dx*pull;py+=dy*pull;c.fillRect(w*.5+px*scale,h*.5-py*scale,1.1,1.1);}
    }
    destroy(){if(this._destroyed)return;this._destroyed=true;cancelAnimationFrame(this._frame);this._observer?.disconnect();this._intersection?.disconnect();this._abort?.abort();for(const item of [this._dust,this._gas]){item?.geometry.dispose();item?.material.dispose();}this._noise?.dispose();this._renderer?.dispose();}
  }
  customElements.define('dust-orb',DustOrb);
})();

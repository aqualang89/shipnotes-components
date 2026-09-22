// Pull Lamp / Ship Notes. Standalone SVG Web Component, no libraries.
(() => {
if(customElements.get('pull-lamp'))return;
class PullLamp extends HTMLElement {
 static get observedAttributes(){return ['on'];}
 connectedCallback(){
  if(this.shadowRoot){this.media.addEventListener('change',this.motionChange);this.updateLabel();this.animate();return;}
  const r=this.attachShadow({mode:'open'});
  r.innerHTML=`<style>
  :host{display:block;width:100%;aspect-ratio:480/560;--light:0;isolation:isolate}*{box-sizing:border-box}svg{display:block;width:100%;height:100%;overflow:visible}.art{position:relative;width:100%;height:100%}.lit{opacity:var(--light)}.handle{position:absolute;left:calc(350 / 480 * 100%);top:calc(329 / 560 * 100%);width:48px;height:48px;transform:translate(-50%,-50%);border:0;border-radius:50%;background:transparent;cursor:grab;touch-action:none;-webkit-tap-highlight-color:transparent}.handle:active{cursor:grabbing}.handle:focus-visible{outline:2px solid #c79551;outline-offset:2px;background:#d4a56815}.hint{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
  </style><div class="art"><svg viewBox="0 0 480 560" aria-hidden="true"><defs>
  <linearGradient id="metal"><stop stop-color="#4a3826"/><stop offset=".25" stop-color="#bf9c62"/><stop offset=".45" stop-color="#ffe4a5"/><stop offset=".6" stop-color="#a27d47"/><stop offset="1" stop-color="#49331f"/></linearGradient>
  <linearGradient id="enamel" x1="0" y1="0" x2="1" y2=".85"><stop stop-color="#99b9a4"/><stop offset=".15" stop-color="#436a58"/><stop offset=".43" stop-color="#254737"/><stop offset=".73" stop-color="#132d23"/><stop offset="1" stop-color="#0a1e16"/></linearGradient>
  <linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#476450"/><stop offset=".4" stop-color="#163627"/><stop offset="1" stop-color="#0a1c14"/></linearGradient>
  <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffd892" stop-opacity=".24"/><stop offset="1" stop-color="#ffd892" stop-opacity="0"/></linearGradient>
  <radialGradient id="pool"><stop stop-color="#ffd997" stop-opacity=".6"/><stop offset=".55" stop-color="#ffd28a" stop-opacity=".17"/><stop offset="1" stop-color="#ffd28a" stop-opacity="0"/></radialGradient>
  <radialGradient id="under"><stop stop-color="#fffde1"/><stop offset=".5" stop-color="#ffe6a2"/><stop offset="1" stop-color="#b17839"/></radialGradient>
  <radialGradient id="shadow"><stop stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="edge"><stop stop-color="#5a412b"/><stop offset=".5" stop-color="#eac98f"/><stop offset="1" stop-color="#795433"/></linearGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="11"/></filter>
  </defs>
  <ellipse cx="245" cy="496" rx="169" ry="29" fill="url(#shadow)"/>
  <g class="lit"><path d="M91 216 10 487 Q240 547 470 487L389 216Z" fill="url(#beam)"/><ellipse cx="240" cy="487" rx="225" ry="60" fill="url(#pool)"/></g>
  <path d="M320 487 Q410 507 456 492" fill="none" stroke="#0b1511" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="240" cy="477" rx="112" ry="25" fill="#0b1f16"/>
  <path d="M128 468 Q132 447 240 445 Q346 447 352 468L351 478Q240 518 129 478Z" fill="url(#base)"/>
  <ellipse cx="240" cy="467" rx="112" ry="23" fill="url(#enamel)"/>
  <path d="M140 465Q240 433 340 465" fill="none" stroke="#d2dec5" stroke-opacity=".22" stroke-width="1.5"/>
  <ellipse cx="240" cy="464" rx="28" ry="8" fill="url(#metal)"/>
  <rect x="230" y="213" width="20" height="249" rx="8" fill="url(#metal)"/>
  <path d="M233 225V451" stroke="#ffedc6" stroke-opacity=".35"/>
  <rect x="220" y="208" width="40" height="42" rx="12" fill="url(#metal)"/>
  <ellipse cx="240" cy="216" rx="153" ry="24" fill="#0b1810"/>
  <ellipse class="lit" cx="240" cy="224" rx="141" ry="23" fill="#ffcf77" filter="url(#soft)"/>
  <ellipse class="lit" cx="240" cy="220" rx="146" ry="18" fill="url(#under)"/>
  <path d="M86 216C92 151 139 110 206 103Q240 99 274 103C341 110 388 151 394 216Q240 244 86 216Z" fill="url(#enamel)"/>
  <path d="M102 188C123 140 159 118 208 113" fill="none" stroke="#d5e8d6" stroke-opacity=".32" stroke-width="3" stroke-linecap="round"/>
  <path d="M87 215Q240 246 393 215" fill="none" stroke="url(#edge)" stroke-width="4"/>
  <ellipse cx="240" cy="102" rx="16" ry="5" fill="url(#metal)"/>
  <path id="cord" d="M350 226Q350 274 350 329" fill="none" stroke="url(#metal)" stroke-width="2.5"/>
  <path id="beads" d="M350 226Q350 274 350 329" fill="none" stroke="#e5ca97" stroke-width="3.3" stroke-linecap="round" stroke-dasharray=".1 5.5"/>
  <g id="knob"><ellipse cx="350" cy="332" rx="7" ry="10" fill="url(#metal)"/><ellipse cx="348" cy="329" rx="1.5" ry="4" fill="#fff1c8" opacity=".65"/></g>
  </svg><button class="handle" type="button" aria-label="Switch to light theme" aria-pressed="false"></button><span class="hint">Pull the cord down, or press Enter or Space.</span></div>`;
  this.button=r.querySelector('button');this.pull=0;this.sway=0;this.velocity=0;this.sideVelocity=0;this.light=this.hasAttribute('on')?1:0;this.last=0;
  this.media=matchMedia('(prefers-reduced-motion: reduce)');
  this.motionChange=()=>{if(this.media.matches){cancelAnimationFrame(this.frame);this.frame=0;this.pull=this.sway=this.velocity=this.sideVelocity=0;this.light=this.hasAttribute('on')?1:0;this.pose(0,0,this.light);}};
  this.media.addEventListener('change',this.motionChange);
  this.button.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,scale:480/this.getBoundingClientRect().width};this.button.setPointerCapture(e.pointerId);this.moved=0;});
  this.button.addEventListener('pointermove',e=>{if(!this.drag||e.pointerId!==this.drag.id)return;const dx=(e.clientX-this.drag.x)*this.drag.scale,dy=(e.clientY-this.drag.y)*this.drag.scale;this.moved=Math.max(this.moved,Math.hypot(dx,dy));this.pull=Math.max(0,Math.min(65,dy));this.sway=Math.max(-24,Math.min(24,dx));this.pose(this.pull,this.sway,this.light);});
  this.button.addEventListener('pointerup',e=>this.release(e,false));
  this.button.addEventListener('pointercancel',e=>this.release(e,true));
  this.button.addEventListener('lostpointercapture',e=>{if(this.drag)this.release(e,true);});
  this.button.addEventListener('click',e=>{if(e.detail===0)this.toggle();});
  this.updateLabel();this.pose(0,0,this.light);
 }
 disconnectedCallback(){cancelAnimationFrame(this.frame);this.frame=0;this.media?.removeEventListener('change',this.motionChange);this.drag=null;}
 attributeChangedCallback(){if(!this.button)return;this.updateLabel();if(!this.hasAttribute('recording'))this.animate();}
 updateLabel(){const on=this.hasAttribute('on');this.button.setAttribute('aria-pressed',String(on));this.button.setAttribute('aria-label',on?'Switch to dark theme':'Switch to light theme');}
 release(e,cancelled){if(!this.drag||e.pointerId!==this.drag.id)return;const toggle=!cancelled&&(this.pull>16||this.moved<5);this.drag=null;if(this.button.hasPointerCapture(e.pointerId))this.button.releasePointerCapture(e.pointerId);if(toggle)this.toggle();this.animate();}
 toggle(){this.toggleAttribute('on');this.dispatchEvent(new CustomEvent('themechange',{detail:{theme:this.hasAttribute('on')?'light':'dark'},bubbles:true,composed:true}));}
 animate(){if(this.media.matches){this.pull=this.sway=0;this.light=this.hasAttribute('on')?1:0;this.pose(0,0,this.light);return;}if(!this.frame){this.last=0;this.frame=requestAnimationFrame(this.tick);}}
 tick=(now)=>{const dt=this.last?Math.min((now-this.last)/1000,.025):.016;this.last=now;
  if(!this.drag){this.velocity+=(-this.pull*220-this.velocity*19)*dt;this.pull+=this.velocity*dt;this.sideVelocity+=(-this.sway*100-this.sideVelocity*9)*dt;this.sway+=this.sideVelocity*dt;}
  const target=this.hasAttribute('on')?1:0;this.light+=(target-this.light)*(1-Math.exp(-dt*9));this.pose(this.pull,this.sway,this.light);
  if(Math.abs(this.pull)+Math.abs(this.velocity)+Math.abs(this.sway)+Math.abs(this.sideVelocity)+Math.abs(target-this.light)>.015||this.drag){this.frame=requestAnimationFrame(this.tick);}else{this.frame=0;this.pose(0,0,target);}
 };
 pose(pull=0,sway=0,light=0){const r=this.shadowRoot;if(!r)return;this.style.setProperty('--light',String(Math.max(0,Math.min(1,light))));const x=350+sway,y=329+pull,d='M350 226 Q'+(350+sway*.22)+' '+(277+pull*.45)+' '+x+' '+y;r.getElementById('cord').setAttribute('d',d);r.getElementById('beads').setAttribute('d',d);r.getElementById('knob').setAttribute('transform',`translate(${sway} ${pull})`);this.button.style.left=(x/480*100)+'%';this.button.style.top=((y+3)/560*100)+'%';}
}
customElements.define('pull-lamp',PullLamp);
})();

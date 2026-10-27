/* <bat-swarm> browser wrapper. Load swarm-core.js first. MIT. */
(() => {
  'use strict';
  class BatSwarm extends HTMLElement {
    static get observedAttributes(){return ['count','size'];}
    connectedCallback(){
      if(this.canvas)return;
      (this.shadowRoot||this.attachShadow({mode:'open'})).innerHTML='<style>:host{position:fixed;inset:0;pointer-events:none;z-index:9999}canvas{display:block}</style><canvas aria-hidden="true"></canvas>';
      this.canvas=this.shadowRoot.querySelector('canvas');this.painter=new BatSwarmCore.Painter(this.canvas);
      this.abort=new AbortController();const o={signal:this.abort.signal,passive:true};
      this.motion=matchMedia('(prefers-reduced-motion: reduce)');
      this.motion.addEventListener('change',()=>this.reset(),o);
      window.addEventListener('resize',()=>this.reset(),o);
      window.addEventListener('pointermove',e=>{if(!this.seeking)this.swarm.move(e.clientX,e.clientY);},o);
      window.addEventListener('pointerup',e=>{if(!this.seeking)this.scatter(e.clientX,e.clientY);},o);
      this.reset();this.play();
      document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(this.raf);this.prev=0;}else if(!this.seeking)this.play();},o);
    }
    disconnectedCallback(){cancelAnimationFrame(this.raf);this.abort?.abort();this.canvas=null;this.shadowRoot?.replaceChildren();}
    attributeChangedCallback(){if(this.canvas)this.reset();}
    rects(){return (this.forced?.isConnected?[this.forced]:[...document.querySelectorAll('[data-perch]')]).map((el,i)=>{const r=el.getBoundingClientRect();return {id:el.id||String(i),x:r.x,y:r.y,w:r.width,h:r.height};}).filter(r=>r.y>=0&&r.y<innerHeight-24);}
    reset(){
      const {Swarm}=BatSwarmCore;this.painter.resize(innerWidth,innerHeight,Math.min(devicePixelRatio,2));
      this.swarm=new Swarm({width:innerWidth,height:innerHeight,count:+this.getAttribute('count')||38,size:Math.max(.25,Math.min(4,+this.getAttribute('size')||1)),seed:+this.getAttribute('seed')||31,reduced:this.motion.matches,initialPerches:this.rects()});
      this.painter.draw(this.swarm);this.prev=0;
    }
    scatter(x,y){this.swarm.scatter(x,y);this.dispatchEvent(new CustomEvent('swarm-scatter'));}
    perchOn(el){this.forced=el;this.swarm.setPerches(this.rects());this.swarm.lastMove=-99;}
    play(){
      cancelAnimationFrame(this.raf);this.seeking=false;this.prev=0;
      const tick=now=>{
        if(this.seeking||document.hidden)return;
        const dt=this.prev?Math.min((now-this.prev)/1000,.083):1/60;this.prev=now;
        this.acc=(this.acc||0)+dt;this.swarm.setPerches(this.rects());
        while(this.acc>=1/60){this.swarm.step();this.acc-=1/60;}
        this.painter.draw(this.swarm);this.raf=requestAnimationFrame(tick);
      };this.raf=requestAnimationFrame(tick);
    }
    renderAt(t,script={}){
      cancelAnimationFrame(this.raf);this.seeking=true;this.reset();this.seeking=true;
      for(let f=0;f<Math.round(t*60);f++){
        const time=f/60, p=script.cursor?.(time);if(p)this.swarm.move(p.x,p.y);
        for(const click of script.clicks||[])if(Math.round(click.t*60)===f)this.swarm.scatter(click.x,click.y);
        this.swarm.step();
      }this.painter.draw(this.swarm);
    }
  }
  customElements.define('bat-swarm',BatSwarm);
})();

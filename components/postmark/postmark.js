/* Postmark by Ship Notes. MIT. HTML + CSS + JavaScript; no dependencies. */
(() => {
  const clamp = v => Math.max(0, Math.min(1, v));
  const ease = v => { v = clamp(v); return v * v * (3 - 2 * v); };
  const phase = (t,a,b) => ease((t-a)/(b-a));
  class Postmark extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode:'open'});
      this.shadowRoot.innerHTML = `<style>
        :host{display:block;width:100%;max-width:640px;aspect-ratio:640/760;color:#352638;font-family:Arial,sans-serif;-webkit-font-smoothing:antialiased}
        *{box-sizing:border-box} .viewport{position:relative;width:100%;height:100%} .stage{position:absolute;width:640px;height:760px;transform-origin:0 0;perspective:1400px}
        .ground{position:absolute;left:136px;top:560px;width:380px;height:65px;background:#07010b;border-radius:50%;filter:blur(27px);opacity:.4}
        .assembly{position:absolute;inset:0;transform-style:preserve-3d;transform-origin:320px 390px}
        .envelope{position:absolute;left:100px;top:310px;width:440px;height:270px;transform-style:preserve-3d;transform-origin:50% 50%}
        .face{position:absolute;inset:0;backface-visibility:hidden;transform-style:preserve-3d}
        .base{position:absolute;inset:0;background:linear-gradient(140deg,#b64d43,#8a332e);border-radius:5px;box-shadow:0 2px 2px #21081e44,0 15px 32px #10041355}
        .lining{position:absolute;inset:10px;background:repeating-linear-gradient(45deg,#df9980 0px,#df9980 2px,#b66152 2px,#b66152 8px);border-radius:2px}
        .paper{position:absolute;left:30px;top:-275px;width:380px;height:435px;transform-style:preserve-3d;transform-origin:50% 50%;transform:translateZ(4px)}
        .panel{position:absolute;width:380px;height:145px;background:#f5eedc;transform-style:preserve-3d}
        .panel:after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,#82664d06 0px,#82664d06 1px,transparent 1px,transparent 3px)}
        .top{top:0;transform-origin:50% 100%;background:linear-gradient(#fff9e9,#f3ebd8);border-radius:5px 5px 0 0}
        .middle{top:145px;background:linear-gradient(#f3ebd8,#f7f0df);box-shadow:inset 0 1px #6c523b1f,inset 0 -1px #6c523b1f}
        .bottom{top:290px;transform-origin:50% 0%;background:linear-gradient(#f7f0df,#e8dcc3);border-radius:0 0 5px 5px}
        .ink{position:absolute;inset:0;backface-visibility:hidden;transform:translateZ(.4px)}
        .letterhead{padding:24px 28px 0;display:flex;justify-content:space-between;font-size:10px;letter-spacing:2px;color:#77694f}
        .lettertitle{margin:20px 28px 0;font:italic 33px Georgia,serif;letter-spacing:-1px;color:#352638}
        .rule{margin:17px 28px 0;height:1px;background:#b6a88877}
        label{position:absolute;left:28px;top:13px;font-size:10px;letter-spacing:1.5px;color:#746752}
        textarea{position:absolute;left:28px;top:35px;width:324px;height:96px;border:0;background:transparent;resize:none;padding:0;font:19px/1.55 Georgia,serif;color:#352638;outline-offset:5px}
        textarea:focus-visible{outline:2px solid #8b6244;border-radius:2px}
        .signature{padding:24px 28px;font:italic 23px Georgia,serif;color:#776550}
        .signature small{display:block;margin-top:10px;font:10px Arial,sans-serif;letter-spacing:1.6px}
        .wing{position:absolute;inset:0;pointer-events:none}
        .left{background:linear-gradient(125deg,#da8d74,#bb6656);clip-path:polygon(0 0,53% 57%,0 100%);transform:translateZ(12px)}
        .right{background:linear-gradient(240deg,#d99178,#bc6a57);clip-path:polygon(100% 0,47% 57%,100% 100%);transform:translateZ(13px)}
        .pocket{background:linear-gradient(175deg,#e4a082,#cf8269);clip-path:polygon(0 100%,0 97%,50% 42%,100% 97%,100% 100%);transform:translateZ(14px);border-radius:0 0 5px 5px}
        .seams{position:absolute;inset:0;transform:translateZ(15px);pointer-events:none}
        .flap{position:absolute;left:0;top:-171px;width:440px;height:172px;transform-origin:50% 100%;transform-style:preserve-3d}
        .flap-inner,.flap-outer{position:absolute;inset:0;clip-path:polygon(0 100%,50% 0,100% 100%);backface-visibility:hidden}
        .flap-inner{background:repeating-linear-gradient(45deg,#df9980 0px,#df9980 2px,#b66152 2px,#b66152 8px)}
        .flap-outer{background:linear-gradient(0deg,#e1a58a,#c77d67);transform:rotateY(180deg)}
        .seal{position:absolute;left:184px;top:119px;width:72px;height:72px;border-radius:50%;background:radial-gradient(circle at 30% 18%,#f3d999,#b38540 52%,#6f4b21 89%);box-shadow:0 3px 1px #7a482d,0 7px 9px #54221566,inset 0 0 0 2px #eccf8799;display:grid;place-items:center;transform:translateZ(20px);opacity:0}
        .seal:before{content:'✦';font:42px Georgia,serif;color:#715020;text-shadow:0 1px #ffe2a4;position:absolute;border:1px solid #77592377;border-radius:50%;width:56px;height:56px;display:grid;place-items:center}
        .address{background:linear-gradient(135deg,#e8ac8f,#c9826e);border-radius:5px;transform:rotateY(180deg) translateZ(1px);box-shadow:0 12px 32px #10041355;overflow:hidden}
        .address:after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,#592b2307 0px,#592b2307 1px,transparent 1px,transparent 3px);pointer-events:none}
        .brand{position:absolute;left:30px;top:24px;font:10px Arial,sans-serif;letter-spacing:3px;color:#613e37}
        .to{position:absolute;left:36px;top:90px;font:italic 30px/1.18 Georgia,serif;color:#4b2d30;max-width:260px}
        .to small{display:block;margin-bottom:12px;font:9px Arial,sans-serif;letter-spacing:2px}
        .addressline{position:absolute;left:36px;bottom:45px;width:180px;height:1px;background:#83514455}
        .postage{position:absolute;right:25px;top:21px;width:74px;height:91px;background:#f6ecd7;outline:3px dotted #f6ecd7;outline-offset:1px;padding:5px;color:#7b544c}
        .stamp-art{height:62px;border:1px solid #bda784;display:grid;place-items:center;font:46px Georgia,serif;background:radial-gradient(ellipse,#e7baa0,#f6ecd7)}
        .postage small{display:block;text-align:center;margin-top:4px;font:7px Arial,sans-serif;letter-spacing:1.5px}
        .cancel{position:absolute;right:29px;top:25px;width:210px;height:100px;opacity:0;transform:rotate(-12deg);color:#5e4540}
        .cancel svg{width:100%;height:100%}
        .die{position:absolute;left:276px;top:300px;width:88px;height:170px;pointer-events:none;opacity:0;transform-origin:50% 100%;z-index:4}
        .handle{position:absolute;left:19px;top:0;width:50px;height:105px;border-radius:28px 28px 12px 12px;background:linear-gradient(90deg,#1d1121,#5a3f49 37%,#362132 65%,#1b1020);box-shadow:inset 3px 0 5px #ba8e8155,5px 6px 10px #130a2055}
        .collar{position:absolute;left:23px;top:98px;width:42px;height:25px;border-radius:5px;background:linear-gradient(90deg,#916334,#f3d4a0,#a27640)}
        .foot{position:absolute;left:0;top:118px;width:88px;height:43px;border-radius:45%;background:linear-gradient(90deg,#72502c,#edca88 30%,#a8783b 80%);box-shadow:inset 0 4px #f8dfa477,0 6px #644427,0 10px 14px #16091866}
        .receipt{position:absolute;left:130px;top:212px;width:380px;min-height:337px;background:#f5eddb;padding:39px 34px 32px;text-align:center;box-shadow:0 15px 50px #0b031a55;opacity:0;clip-path:polygon(0 0,100% 0,100% 97%,97% 100%,94% 97%,91% 100%,88% 97%,85% 100%,82% 97%,79% 100%,76% 97%,73% 100%,70% 97%,67% 100%,64% 97%,61% 100%,58% 97%,55% 100%,52% 97%,49% 100%,46% 97%,43% 100%,40% 97%,37% 100%,34% 97%,31% 100%,28% 97%,25% 100%,22% 97%,19% 100%,16% 97%,13% 100%,10% 97%,7% 100%,4% 97%,0 100%)}
        .receipt .check{margin:0 auto 19px;width:54px;height:54px;border:1px solid #927b50;border-radius:50%;display:grid;place-items:center;color:#6d754d;font-size:28px}
        .receipt h2{font:italic 37px Georgia,serif;margin:0 0 16px;color:#38283d}
        .receipt p{font:14px/1.5 Arial,sans-serif;color:#766650;margin:0}
        .receipt .divider{border-top:1px dashed #b7a58a;margin:25px 0 18px}
        .receipt small{font:9px Arial,sans-serif;letter-spacing:2px;color:#7d6b55}
        .controls{position:absolute;left:0;right:0;top:644px;text-align:center}
        button{min-height:52px;border:0;border-radius:28px;padding:0 25px;color:#392637;background:#f3e8d6;box-shadow:0 0 0 1px #fffae322,inset 0 1px #fff8ec,0 5px 20px #11071944;font:14px Arial,sans-serif;cursor:pointer;transition:scale .15s ease-out,background .15s ease-out}
        button:hover{background:#fff7e7}button:active{scale:.96}button:focus-visible{outline:2px solid #f0c989;outline-offset:5px}button:disabled{cursor:wait;opacity:.65}
        .button-icon{margin-left:18px}.status{margin:16px auto 0;max-width:490px;font:12px/1.5 Arial,sans-serif;color:#d7c5cf;min-height:36px}
        @media(prefers-reduced-motion:reduce){button{transition:none}}
      </style>
      <div class="viewport"><div class="stage">
        <div class="ground" aria-hidden="true"></div>
        <div class="receipt" aria-hidden="true"><div class="check">✓</div><h2>Beautifully sent.</h2><p>Your message is on its way.</p><div class="divider"></div><small>A LITTLE CARE GOES A LONG WAY</small></div>
        <div class="assembly"><div class="envelope">
          <div class="face front"><div class="base"></div><div class="lining"></div>
            <div class="paper">
              <div class="panel top"><div class="ink"><div class="letterhead"><span>PERSONAL NOTE</span><span>01 / 01</span></div><div class="lettertitle">Good things start here.</div><div class="rule"></div></div></div>
              <div class="panel middle"><div class="ink"><label for="message">YOUR MESSAGE</label><textarea id="message" maxlength="1200" aria-label="Your message" spellcheck="false">I've got a little idea.\nLet's make something good.</textarea></div></div>
              <div class="panel bottom"><div class="ink"><div class="signature">With a little care.<small>MADE TO BE OPENED</small></div></div></div>
            </div>
            <div class="wing left"></div><div class="wing right"></div><div class="wing pocket"></div>
            <svg class="seams" viewBox="0 0 440 270" aria-hidden="true"><path d="M0 263L220 115L440 263" stroke="#9f574655" fill="none"/><path d="M2 264L220 118L438 264" stroke="#ffcfac66" fill="none"/></svg>
            <div class="flap"><div class="flap-inner"></div><div class="flap-outer"></div></div><div class="seal"></div>
          </div>
          <div class="face address" aria-hidden="true"><div class="brand">POSTMARK / PERSONAL MAIL</div><div class="to"><small>TO</small>Someone worth<br>writing to.</div><div class="addressline"></div><div class="postage"><div class="stamp-art">✦</div><small>SHIP NOTES</small></div><div class="cancel"><svg viewBox="0 0 210 100"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="65" cy="50" r="40"/><circle cx="65" cy="50" r="34"/><path d="M103 30Q120 20 135 30T167 30T203 30M105 43Q122 33 137 43T169 43T205 43M105 56Q122 46 137 56T169 56T205 56M102 69Q119 59 134 69T166 69T202 69"/></g><text x="65" y="47" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="currentColor">WITH CARE</text><text x="65" y="61" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="currentColor">POSTMARK</text></svg></div></div>
        </div></div>
        <div class="die" aria-hidden="true"><div class="handle"></div><div class="collar"></div><div class="foot"></div></div>
        <div class="controls"><button type="button">Send this note<span class="button-icon">↗</span></button><p class="status" role="status" aria-live="polite">A small gesture. A proper send-off.</p></div>
      </div></div>`;
      this.$ = s => this.shadowRoot.querySelector(s);
      this.state = 'idle'; this._generation = 0; this._frame = 0;
      this._button = this.$('button'); this._text = this.$('textarea');
      this._button.addEventListener('click',()=> this.state === 'sent' ? this.reset() : this.send());
      this._text.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();this.send();}});
    }
    connectedCallback(){
      this._resize = new ResizeObserver(()=>this.resize()); this._resize.observe(this);this.resize();
      this._button.innerHTML='Send this note<span class="button-icon">↗</span>';this.removeAttribute('aria-busy');
      if(this.hasAttribute('demo'))this.$('.status').textContent='Interactive demo. No email is sent.';
      this.pose(0);
    }
    disconnectedCallback(){this._resize?.disconnect();cancelAnimationFrame(this._frame);this._generation++;this.state='idle';this._button.disabled=false;this._text.readOnly=false;}
    resize(){this.$('.stage').style.transform=`scale(${this.getBoundingClientRect().width/640})`;}
    get value(){return this._text.value;} set value(v){this._text.value=String(v);}
    async send(){
      if(this.state==='pending'||this.state==='animating'||this.state==='sent')return;
      if(!this.value.trim()){this.$('.status').textContent='Write a little note first.';this._text.focus();return;}
      if(typeof this.onSend!=='function'){this.$('.status').textContent='Connect an onSend handler before sending.';return;}
      const generation=++this._generation; this.state='pending';this._button.disabled=true;this._text.readOnly=true;
      this.setAttribute('aria-busy','true');this.$('.status').textContent='Sending your note…';
      try{
        const result=await this.onSend(this.value);
        if(generation!==this._generation)return;
        if(result===false)throw new Error('Not accepted');
        this.state='animating';this.$('.status').textContent=this.hasAttribute('demo')?'Demo accepted. Nothing was emailed.':'Message accepted.';
        if(matchMedia('(prefers-reduced-motion: reduce)').matches){this.pose(6);this.finish();return;}
        let start;
        const tick=now=>{if(generation!==this._generation)return;start??=now;const t=(now-start)/1000;this.pose(t);if(t<6)this._frame=requestAnimationFrame(tick);else this.finish();};
        this._frame=requestAnimationFrame(tick);
      }catch(error){
        if(generation!==this._generation)return;
        this.state='idle';this._button.disabled=false;this._text.readOnly=false;this.removeAttribute('aria-busy');
        this.$('.status').textContent='Not sent. Your draft is safe. Try again.';
        this.dispatchEvent(new CustomEvent('senderror',{bubbles:true,composed:true}));
      }
    }
    finish(){this.state='sent';this._button.disabled=false;this.removeAttribute('aria-busy');this._button.innerHTML='Write another<span class="button-icon">↗</span>';this.$('.status').textContent=this.hasAttribute('demo')?'Demo complete. No email was sent.':'Message accepted by your handler.';this.dispatchEvent(new CustomEvent('sendcomplete',{bubbles:true,composed:true}));}
    reset(){this._generation++;cancelAnimationFrame(this._frame);this.state='idle';this._button.disabled=false;this._text.readOnly=false;this.removeAttribute('aria-busy');this._button.innerHTML='Send this note<span class="button-icon">↗</span>';this.$('.status').textContent=this.hasAttribute('demo')?'Interactive demo. No email is sent.':'A small gesture. A proper send-off.';this.pose(0);this._text.focus();}
    // Deterministic pose in seconds. Used by the public demo and video recorder.
    pose(t){
      this.$('.paper').inert=t>0;
      const foldA=phase(t,.12,.88), foldB=phase(t,.64,1.38), tuck=phase(t,1.30,2.05), close=phase(t,2.05,2.62);
      const turn=phase(t,3.3,4.15), flight=phase(t,4.7,5.75), receive=phase(t,5.18,5.85);
      this.$('.top').style.transform=`rotateX(${-179.7*foldA}deg)`;
      this.$('.top').style.background=`linear-gradient(#fff9e9, rgb(${243-25*Math.sin(foldA*Math.PI)} ${235-27*Math.sin(foldA*Math.PI)} ${216-29*Math.sin(foldA*Math.PI)}))`;
      this.$('.bottom').style.transform=`translateZ(2px) rotateX(${179.6*foldB}deg)`;
      this.$('.bottom').style.background=`linear-gradient(#f7f0df, rgb(${232-32*Math.sin(foldB*Math.PI)} ${220-34*Math.sin(foldB*Math.PI)} ${195-37*Math.sin(foldB*Math.PI)}))`;
      this.$('.paper').style.transform=`translate3d(0,${180*tuck}px,4px)`;
      this.$('.flap').style.transform=`translateZ(${t<2.05?-2:17}px) rotateX(${179.9*close}deg)`;
      const seal=phase(t,2.82,3.0);this.$('.seal').style.opacity=seal;this.$('.seal').style.transform=`translateZ(20px) scale(${.9+.1*seal})`;
      const press=phase(t,2.56,2.91),lift=phase(t,3.02,3.38);
      this.$('.die').style.opacity=phase(t,2.5,2.62)*(1-phase(t,3.25,3.4));
      this.$('.die').style.transform=`translateY(${-240*(1-press)-260*lift}px) rotate(${-12*(1-press)+9*lift}deg) scale(${1-.04*press*(1-lift)})`;
      this.$('.envelope').style.transform=`rotateY(${180*turn}deg)`;
      const liftUp=Math.sin(turn*Math.PI)*26;
      const anticipate=phase(t,4.40,4.68)*(1-phase(t,4.70,4.9));
      const x=-22*anticipate+770*flight*flight,y=-liftUp+9*anticipate-650*flight*flight;
      this.$('.assembly').style.transform=`translate3d(${x}px,${y}px,${45*Math.sin(turn*Math.PI)}px) rotateZ(${-3+3*phase(t,0,.4)-7*Math.sin(turn*Math.PI)+4*anticipate-30*flight}deg) rotateX(${7*Math.sin(turn*Math.PI)}deg) scale(${1-.23*flight})`;
      this.$('.assembly').style.opacity=1-phase(t,5.50,5.75);
      this.$('.cancel').style.opacity=phase(t,4.21,4.32);this.$('.cancel').style.transform=`rotate(-12deg) scale(${1.18-.18*phase(t,4.18,4.34)})`;
      this.$('.ground').style.opacity=.4*(1-flight);this.$('.ground').style.transform=`scale(${1-.35*Math.sin(turn*Math.PI)-.5*flight})`;
      this.$('.receipt').style.opacity=receive;this.$('.receipt').style.transform=`translateY(${25*(1-receive)}px) rotate(${-4*(1-receive)}deg)`;
      this.$('.receipt p').textContent=this.hasAttribute('demo')?'Demo complete. No email was sent.':'Accepted. Thank you for your note.';
      this.$('.controls').style.opacity=1-phase(t,0,.22)+phase(t,5.45,5.85);
    }
  }
  if(!customElements.get('postmark-note'))customElements.define('postmark-note',Postmark);
})();

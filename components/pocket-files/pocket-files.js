/* Pocket Files by Ship Notes. MIT. No dependencies. */
(() => {
  const baseFiles = [
    {title:'The brief',type:'TXT',description:'A clear starting point. The idea, the audience and the things worth getting right.',meta:'PROJECT NOTES',kind:'brief'},
    {title:'Color story',type:'JSON',description:'Five colors, one direction. A small set of design tokens ready for your next project.',meta:'DESIGN TOKENS',kind:'palette'},
    {title:'Orbit mark',type:'SVG',description:'A little symbol for big ideas. Original vector artwork, ready to resize and make your own.',meta:'VECTOR ARTWORK',kind:'mark'}
  ];
  const artwork = `<svg viewBox="0 0 200 180" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="10"><ellipse cx="100" cy="90" rx="71" ry="30" transform="rotate(-40 100 90)"/><ellipse cx="100" cy="90" rx="71" ry="30" transform="rotate(40 100 90)"/></g><circle cx="100" cy="90" r="13" fill="currentColor"/></svg>`;
  const clamp=n=>Math.max(0,Math.min(1,n));
  class PocketFiles extends HTMLElement {
    constructor(){
      super();this.attachShadow({mode:'open'});this._files=baseFiles.map(x=>({...x}));this.opened=false;this.selected=-1;this.hovered=-1;
      this.shadowRoot.innerHTML=`<style>
        :host{display:block;max-width:640px;width:100%;aspect-ratio:640/760;font-family:Arial,sans-serif;color:#edf0f7;-webkit-font-smoothing:antialiased}
        *{box-sizing:border-box}.viewport{position:relative;width:100%;height:100%;overflow:clip}.stage{position:absolute;width:640px;height:760px;transform-origin:0 0;perspective:1400px}
        button,a{-webkit-tap-highlight-color:transparent}button{font:inherit}button:focus-visible,a:focus-visible{outline:3px solid #f4e7a0;outline-offset:5px}button:active{scale:.96}
        .floor{position:absolute;left:103px;top:581px;width:440px;height:49px;background:#010308;border-radius:50%;filter:blur(23px);opacity:.85;transition:opacity .55s}
        .back{position:absolute;left:102px;top:348px;width:436px;height:237px;border-radius:22px;background:linear-gradient(140deg,#455260,#202936 66%);box-shadow:inset 0 1px #d9ecff33,0 20px 40px #0006;transition:transform .7s cubic-bezier(.2,.8,.2,1),opacity .5s}
        .back:before{content:'';position:absolute;left:21px;top:-16px;width:124px;height:40px;background:linear-gradient(140deg,#455260,#303b49);border-radius:13px 13px 0 0;box-shadow:inset 0 1px #d9ecff33}
        .card{position:absolute;left:0;top:0;width:240px;height:300px;border-radius:14px;transform-origin:50% 90%;transform-style:preserve-3d;transition:transform .72s cubic-bezier(.2,.8,.2,1),opacity .36s;will-change:transform;--paper:#eee7d8;--ink:#493b31;color:var(--ink)}
        .card[data-kind=palette]{--paper:#c2b1ef;--ink:#453260}.card[data-kind=mark]{--paper:#bce2cc;--ink:#23463e}
        .front{position:absolute;inset:0;background:var(--paper);border-radius:14px;box-shadow:inset 0 1px #fff9,0 1px 2px #0003,0 12px 30px #0004;overflow:hidden;transform:translateZ(1px)}
        .front:after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,#fff3,transparent 40%,#00000008);pointer-events:none}
        .file-tab{position:absolute;top:0;left:25px;width:49px;height:8px;border-radius:0 0 6px 6px;background:currentColor;opacity:.3}
        .type{position:absolute;left:23px;top:26px;font:10px ui-monospace,monospace;letter-spacing:1.8px;opacity:.8}.corner{position:absolute;right:22px;top:24px;font-size:18px;opacity:.65}
        .title{position:absolute;left:23px;right:15px;bottom:46px;font-size:22px;letter-spacing:-.8px;font-weight:600}.file-meta{position:absolute;left:23px;bottom:27px;font-size:8px;letter-spacing:1.9px;opacity:.75}
        .art{position:absolute;left:22px;right:22px;top:61px;height:153px;overflow:hidden}
        .art svg{width:100%;height:100%}.palette-art{display:flex;align-items:center;justify-content:center;gap:5px;padding-top:8px}.swatch{width:33px;height:113px;border-radius:20px;box-shadow:inset 0 1px #fff8;transform:rotate(15deg)}.swatch:nth-child(2){height:135px}.swatch:nth-child(3){height:145px}.swatch:nth-child(4){height:128px}.swatch:nth-child(5){height:100px}
        .brief-art{padding:8px 4px}.brief-art b{display:block;font:italic 39px/.96 Georgia,serif;letter-spacing:-1.5px;margin-bottom:17px}.brief-art i{display:block;height:4px;background:#b3a58e66;margin-bottom:8px;border-radius:4px}.brief-art i:nth-child(3){width:78%}.brief-art i:nth-child(4){width:90%}
        .select{position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:14px;background:transparent;cursor:pointer;z-index:2;transition:scale .15s}.select:active{scale:1}.select:focus-visible{outline-offset:5px}
        .detail{position:absolute;left:238px;top:0;width:230px;height:300px;transform-origin:0 50%;transform:rotateY(-179deg);transform-style:preserve-3d;transition:transform .68s cubic-bezier(.22,.75,.2,1);backface-visibility:hidden;background:var(--paper);color:var(--ink);border-radius:0 14px 14px 0;box-shadow:inset 18px 0 20px -17px #0008,inset 0 1px #fff9,10px 12px 30px #0003;padding:27px 25px 22px}
        .detail:after{content:'';position:absolute;left:0;top:0;bottom:0;width:1px;background:#0002;pointer-events:none}
        .detail small{font-size:9px;letter-spacing:1.7px}.detail h2{font-size:25px;line-height:1.03;letter-spacing:-1px;margin:25px 0 14px;font-weight:500}.detail p{font-size:12px;line-height:1.55;margin:0;max-height:93px;overflow:auto;text-wrap:pretty}.file-link{position:absolute;left:25px;right:25px;bottom:24px;display:flex;justify-content:space-between;align-items:center;min-height:43px;padding:0 14px;background:var(--ink);color:var(--paper);border-radius:10px;text-decoration:none;font-size:11px;transition:scale .15s}.file-link:active{scale:.96}.file-link[aria-disabled=true]{opacity:.55;pointer-events:none}
        .pocket{position:absolute;left:91px;top:405px;width:458px;height:200px;z-index:20;border-radius:22px 22px 28px 28px;background:linear-gradient(118deg,#bcd9f524,#4f708521 35%,#98b4dc13 72%,#b6d9ff25);backdrop-filter:blur(15px) saturate(.8);-webkit-backdrop-filter:blur(15px) saturate(.8);box-shadow:inset 0 1px #d6edff80,inset 1px 0 #e8f4ff30,inset -1px 0 #e8f4ff33,inset 0 -1px #cde7ff44,0 20px 35px #0004;overflow:hidden;pointer-events:none;transition:transform .7s cubic-bezier(.2,.8,.2,1),opacity .5s}
        .pocket:before{content:'';position:absolute;inset:5px;border-radius:18px 18px 23px 23px;border:1px solid #e1f1ff0c}.pocket:after{content:'';position:absolute;left:-100px;top:-100px;width:120px;height:420px;background:linear-gradient(90deg,transparent,#eef8ff13,transparent);transform:rotate(28deg);transition:transform 1s}
        .pocket-label{position:absolute;left:28px;bottom:34px;color:#f1f6ff;display:flex;align-items:center;gap:13px;text-shadow:0 1px 3px #0009;font-size:19px;letter-spacing:-.3px}.folder-icon{width:28px;height:22px;border:1.4px solid #d0e1f4;border-radius:5px;position:relative}.folder-icon:before{content:'';position:absolute;top:-5px;left:3px;width:12px;height:5px;border:1.4px solid #d0e1f4;border-bottom:0;border-radius:3px 3px 0 0}.count{position:absolute;right:27px;bottom:30px;border:1px solid #b4d3ec33;border-radius:9px;width:34px;height:32px;display:grid;place-items:center;color:#d5e8fc;font-size:12px;background:#0a162530}
        .etched{position:absolute;left:29px;top:24px;font:9px ui-monospace,monospace;letter-spacing:3px;color:#c4d6e8aa}
        .close{position:absolute;right:27px;top:71px;width:44px;height:44px;border-radius:50%;background:#27313c;color:#e6edf9;border:1px solid #c4daee33;font-size:22px;z-index:60;cursor:pointer;opacity:0;transition:opacity .25s,scale .15s}
        .controls{position:absolute;left:0;right:0;top:666px;text-align:center}.toggle{border:1px solid #c2d7ed38;border-radius:28px;background:linear-gradient(#2d3743,#222a34);color:#eef5ff;min-height:52px;padding:0 26px;font-size:14px;cursor:pointer;box-shadow:inset 0 1px #edf7ff16,0 8px 25px #0004;transition:background .2s,scale .15s}.toggle span{display:inline-block;margin-left:18px;transition:transform .4s}.status{margin:16px 15px 0;color:#b2bdca;font-size:12px;line-height:1.4;min-height:20px}
        :host([compact]){aspect-ratio:640/850}:host([compact]) .stage{height:850px}:host([compact]) .detail{left:-28px;top:-20px;width:296px;height:360px;border-radius:14px;transform-origin:50% 50%;padding:28px}:host([compact]) .detail p{font-size:16px;max-height:160px}:host([compact]) .detail h2{font-size:30px}:host([compact]) .file-link{min-height:calc(44px * var(--readable) / 1.4);font-size:16px}:host([compact]) .toggle{min-height:calc(44px * var(--readable));font-size:calc(13px * var(--readable))}:host([compact]) .status{font-size:calc(12px * var(--readable))}:host([compact]) .close{width:calc(44px * var(--readable));height:calc(44px * var(--readable));font-size:calc(22px * var(--readable));right:18px;top:28px}
        :host([recording]) *{transition:none!important}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
        @media(prefers-reduced-motion:reduce){*{transition:none!important}}
      </style><div class="viewport"><div class="stage"><div class="floor" aria-hidden="true"></div><div class="back" aria-hidden="true"></div>
      ${baseFiles.map((f,i)=>`<article class="card" data-kind="${f.kind}" data-index="${i}"><div class="front"><div class="file-tab"></div><div class="type"></div><div class="corner" aria-hidden="true">↗</div><div class="art" aria-hidden="true">${i===0?'<div class="brief-art"><b>Make<br>room.</b><i></i><i></i><i></i></div>':i===1?'<div class="palette-art"><i class="swatch" style="background:#493660"></i><i class="swatch" style="background:#785eaa"></i><i class="swatch" style="background:#a389cc"></i><i class="swatch" style="background:#e2cce9"></i><i class="swatch" style="background:#f4e9dc"></i></div>':artwork}</div><div class="title"></div><div class="file-meta"></div><button class="select" type="button"></button></div><div class="detail" inert><small>INSIDE THE FILE</small><h2></h2><p></p><a class="file-link" target="_blank" rel="noopener noreferrer"><span>Open file</span><span aria-hidden="true">↗</span></a></div></article>`).join('')}
      <div class="pocket" aria-hidden="true"><div class="etched">A PLACE FOR THE GOOD STUFF</div><div class="pocket-label"><i class="folder-icon"></i><span>Project essentials</span></div><div class="count">03</div></div><button class="close" type="button" aria-label="Close file preview" inert>×</button><div class="controls"><button class="toggle" type="button" aria-expanded="false">Explore files<span aria-hidden="true">↑</span></button><p class="status" role="status" aria-live="polite">Three files. One little pocket.</p></div></div></div>`;
      this.$=s=>this.shadowRoot.querySelector(s);this.cards=[...this.shadowRoot.querySelectorAll('.card')];
      this.$('.toggle').addEventListener('click',()=>{if(this.selected>=0)this.closePreview();else this.toggle();});
      this.$('.close').addEventListener('click',()=>this.closePreview());
      this.shadowRoot.addEventListener('keydown',e=>this.keydown(e));
      this.cards.forEach((card,i)=>{const button=card.querySelector('.select');button.addEventListener('click',()=>this.select(i));button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'&&this.opened&&this.selected<0){this.hovered=i;this.draw();}});button.addEventListener('pointerleave',()=>{if(this.hovered===i){this.hovered=-1;this.draw();}});button.addEventListener('focus',()=>{if(this.opened&&this.selected<0){this.hovered=i;this.draw();}});button.addEventListener('blur',()=>{this.hovered=-1;if(this.selected<0)this.draw();});});
      this._applyFiles();this.draw();
    }
    connectedCallback(){this._resize=new ResizeObserver(()=>this.resize());this._resize.observe(this);this.resize();this.draw();}
    disconnectedCallback(){this._resize?.disconnect();}
    resize(){const width=this.getBoundingClientRect().width,scale=width/640;this.$('.stage').style.transform=`scale(${scale})`;this.style.setProperty('--readable',String(1/(scale||1)));this.toggleAttribute('compact',width<460);if(!this.hasAttribute('recording'))this.draw();}
    get files(){return this._files.map(f=>({...f}));}
    set files(value){
      if(!Array.isArray(value)||value.length!==3)throw new TypeError('Pocket Files expects exactly three file records.');
      const files=value.map((f,i)=>{if(!f||typeof f.title!=='string'||!f.title.trim())throw new TypeError('Each file needs a title.');
        let href=null;if(f.href){const u=new URL(String(f.href),document.baseURI);if(!['http:','https:','blob:','file:'].includes(u.protocol))throw new TypeError('Unsupported file URL scheme.');href=u.href;}
        return {title:f.title.slice(0,100),type:String(f.type||baseFiles[i].type).slice(0,12),description:String(f.description||'').slice(0,700),meta:String(f.meta||'PROJECT FILE').slice(0,50),kind:baseFiles[i].kind,href};});
      this._files=files;this._applyFiles();
    }
    _applyFiles(){this.cards.forEach((card,i)=>{const f=this._files[i];card.querySelector('.title').textContent=f.title;card.querySelector('.type').textContent=f.type;card.querySelector('.file-meta').textContent=f.meta;card.querySelector('.select').setAttribute('aria-label',`Preview ${f.title}`);card.querySelector('.detail h2').textContent=f.title;card.querySelector('.detail p').textContent=f.description;const a=card.querySelector('a');if(f.href){a.href=f.href;a.removeAttribute('aria-disabled');a.tabIndex=0;a.querySelector('span').textContent='Open file';}else{a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.tabIndex=-1;a.querySelector('span').textContent='Add a file URL';}});}
    toggle(force){if(this.selected>=0)this.closePreview();this.opened=typeof force==='boolean'?force:!this.opened;this.hovered=-1;this.draw();this._sync();}
    select(i){if(!Number.isInteger(i)||i<0||i>2)return;this.opened=true;this.hovered=-1;this.selected=i;this.draw();this._sync();this.$('.close').focus({preventScroll:true});this.dispatchEvent(new CustomEvent('filepreview',{detail:{index:i,file:{...this._files[i]}},bubbles:true,composed:true}));}
    closePreview(){const prev=this.selected;if(prev<0)return;this.selected=-1;this.hovered=-1;this.draw();this._sync();this.cards[prev].querySelector('.select').focus({preventScroll:true});}
    keydown(e){if(e.key==='Escape'){e.preventDefault();if(this.selected>=0)this.closePreview();else if(this.opened){this.toggle(false);this.$('.toggle').focus();}}
      if(this.selected>=0&&e.key==='Tab'){const a=this.cards[this.selected].querySelector('a'),items=[this.$('.close'),...(a.hasAttribute('href')?[a]:[]),this.$('.toggle')];const active=this.shadowRoot.activeElement;let next=items.indexOf(active)+(e.shiftKey?-1:1);next=(next+items.length)%items.length;e.preventDefault();items[next].focus();}
      if(this.opened&&this.selected<0&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){const i=this.cards.findIndex(c=>c.querySelector('.select')===this.shadowRoot.activeElement);if(i>=0){e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;this.cards[j].querySelector('.select').focus();}}
    }
    _sync(){this.$('.toggle').setAttribute('aria-expanded',String(this.opened));this.$('.toggle').firstChild.textContent=this.selected>=0?'Back to files':this.opened?'Tuck them away':'Explore files';this.$('.toggle span').style.transform=this.opened?'rotate(180deg)':'rotate(0deg)';this.$('.status').textContent=this.selected>=0?`${this._files[this.selected].title}. Open the file or press Escape to return.`:this.opened?'Pick a file. Take a closer look.':'Three files. One little pocket.';
      this.cards.forEach((c,i)=>{c.querySelector('.select').inert=!this.opened||this.selected>=0;c.querySelector('.detail').inert=this.selected!==i;});this.$('.close').inert=this.selected<0;
    }
    draw(){this.pose(this.opened?1:0,this.selected,this.selected>=0?1:0,this.hovered);this._sync();}
    // Recorder API: fan openness, selected index, unfolded progress, hovered index.
    pose(open=0,index=-1,detail=0,hover=-1){open=clamp(open);detail=clamp(detail);
      const closedX=[177,201,225],closedY=[247,234,243],closedR=[-9,0,9],fanX=[43,200,357],fanY=[164,116,164],fanR=[-15,0,15];
      this.cards.forEach((card,i)=>{const active=i===index;let x=closedX[i]+(fanX[i]-closedX[i])*open,y=closedY[i]+(fanY[i]-closedY[i])*open,r=closedR[i]+(fanR[i]-closedR[i])*open,s=1;
        if(i===hover&&index<0){y-=27;s=1.035;r*=.65;}
        const compact=this.hasAttribute('compact');
        if(active){x+=((compact?200:48)-x)*detail;y+=((compact?200:132)-y)*detail;r*=1-detail;s+=(compact?.4:.16)*detail;}
        else if(index>=0){y+=120*detail;r+=i===0?-6:6;}
        card.style.transform=`translate3d(${x}px,${y}px,0) rotate(${r}deg) scale(${s})`;
        card.style.opacity=active||index<0?1:1-detail;
        card.style.zIndex=active?50:i===hover?16:10+i;
        card.querySelector('.detail').style.transform=`translateZ(${compact?3:0}px) rotateY(${-179*(1-(active?detail:0))}deg)`;
        card.querySelector('.front').style.opacity=compact&&active?1-detail:1;
        card.querySelector('.front').style.borderRadius=active&&detail>.5?'14px 0 0 14px':'14px';
      });
      this.$('.back').style.transform=`translateY(${open*24+detail*44}px)`;this.$('.back').style.opacity=1-.65*detail;
      this.$('.pocket').style.transform=`translateY(${open*24+detail*44}px) rotateX(${open*5}deg)`;this.$('.pocket').style.opacity=1-.7*detail;
      this.$('.floor').style.opacity=.85-.5*detail;this.$('.close').style.opacity=detail;
    }
  }
  if(!customElements.get('pocket-files'))customElements.define('pocket-files',PocketFiles);
})();

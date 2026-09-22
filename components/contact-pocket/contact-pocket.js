// Contact Pocket: dependency-free, scoped Web Component.
// Configure with email, github, social and website attributes. No network calls.
(() => {
  if (customElements.get('contact-pocket')) return;
  if (window.CSS?.registerProperty) {
    try { CSS.registerProperty({name:'--cp-open', syntax:'<number>', inherits:true, initialValue:'0'}); } catch (_) {}
  }
  const icons = {
    github:'<path d="M9 19c-5 1-5-2-7-2m14 5v-4a3.5 3.5 0 0 0-1-3c3-.3 6-1.5 6-6a4.7 4.7 0 0 0-1.3-3.3A4.3 4.3 0 0 0 19.6 2S18.5 1.7 16 3a12 12 0 0 0-6 0C7.5 1.7 6.4 2 6.4 2a4.3 4.3 0 0 0-.1 3.7A4.7 4.7 0 0 0 5 9c0 4.5 3 5.7 6 6a3.5 3.5 0 0 0-1 3v4"/>',
    social:'<path d="m4 3 16 18M20 3 4 21M4 3h5l11 18h-5Z"/>',
    website:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
    arrow:'<path d="M6 18 18 6M6 6h12v12"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>'
  };
  const svg = key => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key]}</svg>`;
  class ContactPocket extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({mode:'open'});
      root.innerHTML = `<style>
      :host{--cp-open:0;--cp-accent:#315efb;display:block;width:min(100%,420px);font-family:system-ui,sans-serif;color:#182033;isolation:isolate;-webkit-font-smoothing:antialiased;transition:--cp-open .65s cubic-bezier(.2,.8,.2,1)}
      :host([open]){--cp-open:1}:host([recording]){transition:none}
      *{box-sizing:border-box}button,a{-webkit-tap-highlight-color:transparent;font:inherit}button{cursor:pointer}a{text-decoration:none;color:inherit}button:focus-visible,a:focus-visible{outline:3px solid #769cff;outline-offset:4px}svg{width:22px;height:22px;flex:none}
      .wallet{position:relative;perspective:1000px;padding-bottom:calc(var(--cp-open)*292px)}
      .stack{position:absolute;left:18px;right:18px;top:-8px;height:70px;border-radius:21px;background:#c9d5ff;box-shadow:0 -5px 0 -2px #e0e6fb;transform:translateY(calc(var(--cp-open)*9px))}
      .trigger{position:relative;z-index:3;width:100%;height:96px;padding:0 26px;display:flex;align-items:center;gap:17px;border:0;border-radius:24px;background:linear-gradient(145deg,#4779ff,var(--cp-accent) 52%,#2445bf);color:white;text-align:left;box-shadow:0 1px 1px #ffffff85 inset,0 -2px 1px #142b9866 inset,0 7px 0 #2344b3,0 8px 1px #a6baf1,0 18px 34px #203a7436;transition:transform .18s,box-shadow .25s}
      .trigger:active{transform:scale(.96)}.mark{font-size:25px;font-weight:650;letter-spacing:-1px;display:grid;place-items:center;width:43px;height:43px;border:1px solid #ffffff65;border-radius:13px;background:#ffffff0c}
      .title{font-size:24px;font-weight:600;letter-spacing:-.8px}.eyebrow{display:block;font-size:9px;letter-spacing:2px;margin-bottom:4px;opacity:.8}.toggle{margin-left:auto;display:grid;place-items:center;width:38px;height:38px;background:#11297942;border-radius:50%;transform:rotate(calc(var(--cp-open)*45deg))}.toggle svg{width:19px;height:19px}
      .paper{position:absolute;z-index:2;top:87px;left:10px;right:10px;padding:23px 15px 15px;border-radius:0 0 22px 22px;background:#fffefa;box-shadow:0 1px 0 #fff inset,0 0 0 1px #1920350b,0 17px 30px #2536551c;transform-origin:50% 0;transform:rotateX(calc((1 - var(--cp-open))*-82deg));opacity:clamp(0,calc(var(--cp-open)*4),1)}
      .intro{display:flex;justify-content:space-between;align-items:center;padding:0 7px 13px;color:#6a6f7b;font-size:10px;letter-spacing:1.1px}.dot{display:inline-block;width:6px;height:6px;background:#397a65;border-radius:50%;margin-right:6px}
      .links{display:flex;gap:8px}.link{position:relative;flex:1;min-width:0;height:102px;padding:14px 11px 10px;border-radius:13px;background:#f1f0ec;box-shadow:0 1px 0 #fff inset,0 0 0 1px #131c3110;display:flex;flex-direction:column;justify-content:space-between;transition:transform .3s cubic-bezier(.2,.8,.2,1),background .25s,color .25s,box-shadow .25s;transform:translateY(calc((1 - var(--cp-open))*24px)) rotateY(calc((1 - var(--cp-open))*-18deg))}
      .link:nth-child(2){transform:translateY(calc((1 - var(--cp-open))*37px))}.link:nth-child(3){transform:translateY(calc((1 - var(--cp-open))*50px))}
      .link:hover,.link:focus-visible,.link[data-hover]{background:#182237;color:#fff;transform:translateY(-8px) rotate(-3deg);box-shadow:0 10px 15px #17253a30}.link:nth-child(2):hover,.link:nth-child(2)[data-hover]{transform:translateY(-8px) rotate(2deg)}.link:nth-child(3):hover,.link:nth-child(3)[data-hover]{transform:translateY(-8px) rotate(3deg)}
      .link span{font-size:11px;font-weight:550}.mini{position:absolute;right:9px;top:13px;opacity:.45}.mini svg{width:13px;height:13px}
      .email{position:relative;margin-top:15px;width:100%;height:60px;border:1px dashed #c7c8ce;border-radius:12px;background:transparent;display:flex;align-items:center;text-align:left;padding:10px 13px;gap:10px;color:#29324a;transition:background .2s,transform .18s,border-color .2s}.email:hover,.email[data-hover]{background:#edf1ff;border-color:#718fff}.email:active{transform:scale(.96)}.email small{display:block;font-size:8px;letter-spacing:1.4px;color:#747b87;margin-bottom:4px}.address{display:block;font-size:13px;font-weight:550}.copy{margin-left:auto;position:relative;width:22px;height:22px}.copy svg{position:absolute;inset:0;transition:opacity .22s,transform .22s,filter .22s}.check{opacity:0;transform:scale(.25);filter:blur(4px);color:#176344}.email[data-copied]{background:#e8f4ed;border-color:#77a78b}.email[data-copied] .original{opacity:0;transform:scale(.25);filter:blur(4px)}.email[data-copied] .check{opacity:1;transform:scale(1);filter:blur(0)}
      .copy>span{position:absolute;inset:0;display:block;transition:opacity .22s,transform .22s,filter .22s}.foot{display:flex;justify-content:space-between;padding:14px 5px 0;font-size:8px;letter-spacing:1px;color:#80838a}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
      @media(prefers-reduced-motion:reduce){:host{transition:none}*,*::before,*::after{transition:none!important}.paper{transform:none}.link{transform:none!important}}
      </style>
      <div class="wallet"><div class="stack"></div><button class="trigger" aria-expanded="false" aria-controls="details"><span class="mark">↗</span><span><span class="eyebrow">A LITTLE CLOSER</span><span class="title">Let's talk.</span></span><span class="toggle">${svg('plus')}</span></button>
      <div class="paper" id="details" inert><div class="intro"><span>FIND ME HERE</span><span><i class="dot"></i>HELLO, INTERNET</span></div><div class="links">
      ${[['github','GitHub'],['social','Social'],['website','Website']].map(([key,label])=>`<a class="link" data-key="${key}" target="_blank" rel="noopener noreferrer">${svg(key)}<span class="mini">${svg('arrow')}</span><span>${label}</span></a>`).join('')}
      </div><button class="email" type="button"><span><small>OR COPY MY EMAIL</small><span class="address"></span></span><span class="copy"><span class="original">${svg('copy')}</span><span class="check">${svg('check')}</span></span></button><div class="foot"><span>NO FORMS. JUST A HELLO.</span><span>CONTACT / 01</span></div></div></div><span class="sr" role="status" aria-live="polite"></span>`;
      this.email = this.getAttribute('email') || 'hello@example.com';
      root.querySelector('.address').textContent = this.email;
      root.querySelector('.email').setAttribute('aria-label','Copy email '+this.email);
      for(const a of root.querySelectorAll('a')){
        const value = this.getAttribute(a.dataset.key) || 'https://example.com';
        try { const url = new URL(value); a.href = ['https:','http:'].includes(url.protocol) ? url.href : 'https://example.com'; } catch (_) { a.href='https://example.com'; }
      }
      root.querySelector('.trigger').addEventListener('click',()=>this.setOpen(!this.hasAttribute('open')));
      root.addEventListener('keydown',e=>{if(e.key==='Escape'){this.setOpen(false);root.querySelector('.trigger').focus();}});
      root.querySelector('.email').addEventListener('click',()=>this.copyEmail());
      this.setOpen(this.hasAttribute('open'));
    }
    setOpen(open){this.toggleAttribute('open',open);this.shadowRoot.querySelector('.trigger').setAttribute('aria-expanded',String(open));this.shadowRoot.querySelector('.paper').inert=!open;}
    async copyEmail(){
      this.shadowRoot.querySelector('.email').removeAttribute('data-copied');
      try {
        if(!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(this.email);
        this.shadowRoot.querySelector('.email').setAttribute('data-copied','');
        this.shadowRoot.querySelector('.email small').textContent='COPIED TO CLIPBOARD';
        this.shadowRoot.querySelector('[role=status]').textContent='Email copied';
      } catch (_) {
        this.shadowRoot.querySelector('.email small').textContent='SELECT EMAIL TO COPY';
        const range=document.createRange();range.selectNodeContents(this.shadowRoot.querySelector('.address'));
        const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
        this.shadowRoot.querySelector('[role=status]').textContent='Copy unavailable here. Select the email address and copy it manually.';
      }
    }
  }
  customElements.define('contact-pocket',ContactPocket);
})();

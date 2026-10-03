(() => {
  'use strict';
  const $=q=>document.querySelector(q),$$=q=>[...document.querySelectorAll(q)];
  const clamp=(x,a=0,b=1)=>x<a?a:x>b?b:x,mix=(a,b,t)=>a+(b-a)*t,smooth=(a,b,v)=>{const q=clamp((v-a)/(b-a));return q*q*(3-2*q)};

  const scene=new OceanScene($('#ocean'));
  const secs=$$('main > section').map(el=>({el,id:el.id,from:+el.dataset.from,to:+el.dataset.to,name:el.dataset.name,top:0,h:1,copy:el.querySelector('.frame > .copy')}));
  // Depth inside a section is eased: the first meters of the sunlight zone get more scroll, so you can watch red disappear.
  const EASE={sunlight:3,twilight:1.6};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let paused=reduced.matches,recording=false,frame=0,time=0,last=0,vh=innerHeight,maxScroll=1;
  let s=0,depth=0,lift=0,scan=false,frequency=174,audio=null,audioOn=false,lastY=scrollY,speed=0;
  const pointer={x:0,y:0},target={x:0,y:0},vel={x:0,y:0};
  const mouse={x:.66,y:.45},torch={x:.66,y:.45},tv={x:0,y:0};
  let lastMove=-99,manual=null,manualUntil=-99,angleSeen=0,whaleAt=null;

  function measure(){
    vh=innerHeight;for(const z of secs){z.top=z.el.offsetTop;z.h=z.el.offsetHeight}
    maxScroll=Math.max(1,document.documentElement.scrollHeight-vh);scene.resize();
    for(const a of $$('.rail a')){const z=secs.find(x=>'#'+x.id===a.getAttribute('href'));a.style.top=`${(z.id==='surface'?0:clamp((z.top-vh/2)/maxScroll))*100}%`}
    drawCards(true);update();
  }
  function locate(y){
    for(let i=0;i<secs.length;i++){const z=secs[i];if(y<z.top+z.h||i===secs.length-1){const k=clamp((y-z.top)/z.h);return {s:i+k,depth:z.from+(z.to-z.from)*Math.pow(k,EASE[z.id]||1),z}}}
  }
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  function lightText(d){const p=100*Math.exp(-.023*d);return d>=1000?'0%':p>=1?`${Math.round(p)}%`:p>=.01?`${p.toFixed(2)}%`:'<0.01%'}
  let lastAccent='',lastHud='';
  function update(){
    const y=scrollY,at=locate(y+vh/2);s=at.s;depth=at.depth;
    // the whale comes once per way down; climb back above 600 m and it can come again
    if(whaleAt===null&&depth>850&&s<3.4){whaleAt=time;if(audioOn)audio?.whale()}else if(whaleAt!==null&&depth<600&&time-whaleAt>9)whaleAt=null;
    const hud=`${fmt(depth)}|${at.z.name}`;
    if(hud!==lastHud){lastHud=hud;$('#depth').textContent=fmt(depth);$('#zone').textContent=at.z.name;const atm=1+depth/10.06;$('#atm').textContent=atm<10?atm.toFixed(1):fmt(atm);$('#light').textContent=lightText(depth)}
    const bot=secs.find(z=>z.id==='bottom');lift=Math.max(0,y-(bot.top+bot.h-vh));
    document.body.classList.toggle('scrolled',y>vh*.25);document.body.classList.toggle('past',s>7.95);
    // The interface is in the water too: its coral loses red with depth and comes back under the lander's lamps.
    const gone=smooth(2,26,depth)*(1-smooth(6.85,7.15,s)),acc=[mix(255,138,gone),mix(135,196,gone),mix(94,186,gone)].map(Math.round).join(',');
    if(acc!==lastAccent){lastAccent=acc;document.documentElement.style.setProperty('--accent',`rgb(${acc})`)}
    $('#rail-dot').style.top=`${clamp(y/maxScroll)*100}%`;
    const marks=$$('.rail a');let cur=0;marks.forEach((a,i)=>{if(y+2>=parseFloat(a.style.top)/100*maxScroll)cur=i});marks.forEach((a,i)=>i===cur?a.setAttribute('aria-current','location'):a.removeAttribute('aria-current'));
    for(const z of secs){
      // only the frame that is sliding in gets hidden, and it shows up as it lands: while it slides it would run over the depth counter
      if(!z.copy)continue;const q=(y-z.top)/Math.max(1,z.h-vh),a=q<-1?1:smooth(-.1,-.01,q),o=a.toFixed(3);
      if(z.copy._o!==o){z.copy._o=o;z.copy.style.opacity=o;z.copy.style.transform=reduced.matches?'none':`translateY(${((1-a)*18).toFixed(1)}px)`}
    }
    if(audio&&audioOn)audio.depth(depth,frequency);
  }
  function note(id,on){const el=$(id);if(el._on===on)return;el._on=on;el.style.transition=recording?'none':`opacity ${on?.4:.25}s var(--ease-out), transform ${on?.4:.25}s var(--ease-out)`;el.style.opacity=on?1:0;el.style.transform=on?'none':'translateY(8px)'}

  // The lamp: follows the mouse on a spring, otherwise goes looking for whoever lives on this screen.
  function torchGoal(){
    if(lastMove>time-2.5)return mouse;
    if(manual&&manualUntil>time)return manual;
    const h=scene.hot,c=h.angler||h.atolla||h.snail||h.bottom,w=scene.w||1,hh=scene.h||1;
    if(c)return {x:clamp(c.x/w+Math.sin(time*.5)*.09),y:clamp(c.y/hh+Math.sin(time*.37)*.07)};
    return {x:.5+Math.sin(time*.3)*.25,y:.48+Math.sin(time*.47)*.16};
  }
  function frameState(t){return {t,s,depth,lift,whaleAt,pointer:reduced.matches?{x:0,y:0}:pointer,torch,scan,frequency}}
  function animate(now){
    frame=0;if(document.hidden||recording)return;
    const dt=Math.min(.04,last?(now-last)/1000:1/60);last=now;if(!paused)time+=dt;
    for(const k of ['x','y']){vel[k]+=(target[k]-pointer[k])*60*dt-vel[k]*14*dt;pointer[k]+=vel[k]*dt}
    const g=torchGoal(),stiff=lastMove>time-2.5?140:22,damp=lastMove>time-2.5?22:9;
    for(const k of ['x','y']){tv[k]+=(g[k]-torch[k])*stiff*dt-tv[k]*damp*dt;torch[k]+=tv[k]*dt}
    speed=mix(speed,Math.abs(scrollY-lastY)/Math.max(dt,.001)/vh,.15);lastY=scrollY;
    scene.render(frameState(time));
    afterRender();
    if(audio&&audioOn)audio.motion(speed);
    if(!paused||Math.abs(vel.x)+Math.abs(vel.y)+Math.abs(tv.x)+Math.abs(tv.y)>.002)frame=requestAnimationFrame(animate);
  }
  function afterRender(){
    const h=scene.hot;
    note('#atolla-note',scene.alarmed&&s>3.05&&s<3.95);
    if(h.angler&&h.angler.near>.55)angleSeen=Math.min(1,angleSeen+.04);else angleSeen=Math.max(0,angleSeen-.02);
    note('#angler-note',angleSeen>.5&&s>4.05&&s<4.95);
    note('#amphipod-note',s>7.22&&s<7.92);
    note('#whale-note',whaleAt!==null&&time-whaleAt>1.2&&time-whaleAt<7.5&&s<3.3);
    if(s>4.9&&s<6.1)bars.forEach((b,i)=>{const sig=Math.exp(-Math.pow((frequency-232)/28,2));b.style.setProperty('--amp',(1+Math.abs(Math.sin(i*.7+time*2)*Math.cos(i*.2-time*.7))*(2+sig*8)).toFixed(2))});
  }
  function schedule(){if(!frame&&!recording&&!document.hidden)frame=requestAnimationFrame(animate)}

  addEventListener('scroll',()=>{if(recording)return;update();schedule()},{passive:true});
  addEventListener('resize',measure);
  addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;mouse.x=e.clientX/innerWidth;mouse.y=e.clientY/innerHeight;lastMove=time;
    if(!reduced.matches){target.x=(mouse.x-.5)*2;target.y=(mouse.y-.5)*2}schedule();
  },{passive:true});
  document.addEventListener('pointerleave',()=>{target.x=target.y=0;lastMove=-99;schedule()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;audio?.suspend()}else{if(audioOn)audio?.resume();schedule()}});

  function ping(x=.66,y=.5){scene.ping(time,x,y);audio?.ping(depth);$('#tool-hint').textContent='Listening for a reply';schedule()}
  function tap(x,y,touch){
    if(touch){manual={x,y};manualUntil=time+6}
    const a=scene.hot.atolla,px=x*scene.w,py=y*scene.h;
    if(a&&Math.hypot(px-a.x,py-a.y)<a.r){scene.alarm(time);audio?.alarm()}
    ping(x,y);
  }
  $('#sonar').addEventListener('click',()=>ping());
  let down=null;
  addEventListener('pointerdown',e=>{if(e.target.closest('a,button,input,dialog,.specimen'))return;down={x:e.clientX,y:e.clientY}});
  addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<9)tap(e.clientX/innerWidth,e.clientY/innerHeight,e.pointerType==='touch');down=null});
  addEventListener('pointercancel',()=>{down=null});
  addEventListener('keydown',e=>{if(e.code==='Space'&&!e.target.closest('a,button,input,dialog,textarea,select')){e.preventDefault();ping(.5,.5)}});

  function setMotionLabel(){$('#motion').setAttribute('aria-pressed',String(paused));$('#motion').setAttribute('aria-label',paused?'Resume ambient motion':'Pause ambient motion');$('#motion-icon').setAttribute('d',paused?'M8 5l10 7-10 7Z':'M9 5v14M15 5v14')}
  $('#motion').addEventListener('click',()=>{paused=!paused;setMotionLabel();last=0;schedule()});
  reduced.addEventListener('change',()=>{paused=reduced.matches;setMotionLabel();schedule()});
  function setScan(on){scan=on;$('#scan').setAttribute('aria-pressed',String(on));$('#scan').innerHTML=on?'Back to the living light <span aria-hidden="true">−</span>':'Reveal their structure <span aria-hidden="true">+</span>'}
  $('#scan').addEventListener('click',()=>{setScan(!scan);schedule()});
  const bars=Array.from({length:40},()=>{const e=document.createElement('i');$('.wave-meter').append(e);return e});
  function setFrequency(v){
    frequency=clamp(v,80,320);$('#frequency').value=frequency;$('#frequency-value').textContent=`${frequency} Hz`;
    const sig=Math.exp(-Math.pow((frequency-232)/28,2));
    $('#tuner-status').textContent=sig>.86?"That's our lander. About 6 km below you.":sig>.3?"Something's there. Keep turning.":'Static. Keep turning.';
    if(audioOn)audio?.depth(depth,frequency);
  }
  $('#frequency').addEventListener('input',e=>{setFrequency(+e.target.value);schedule()});
  const dialog=$('#field-notes');$('#about-open').addEventListener('click',()=>dialog.showModal());$('#about-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});

  // Sound is made here, in the browser: a wash that darkens with depth, one whale, sonar, the alarm, the lander's call.
  class OceanAudio{
    constructor(){
      const c=this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);
      const len=c.sampleRate*4,buf=c.createBuffer(2,len,c.sampleRate);
      for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);let n=0;for(let i=0;i<len;i++){n=(n+(Math.random()*2-1)*.025)/1.025;d[i]=n*2.4}}
      this.noise=c.createBufferSource();this.noise.buffer=buf;this.noise.loop=true;
      this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=700;this.filter.Q.value=.7;
      this.wash=c.createGain();this.wash.gain.value=.2;this.noise.connect(this.filter).connect(this.wash).connect(this.master);this.noise.start();
      this.drone=c.createOscillator();this.drone.type='sine';this.drone.frequency.value=58;this.droneGain=c.createGain();this.droneGain.gain.value=.04;this.drone.connect(this.droneGain).connect(this.master);this.drone.start();
      this.tone=c.createOscillator();this.tone.type='sine';this.tone.frequency.value=174;this.toneGain=c.createGain();this.toneGain.gain.value=0;this.tone.connect(this.toneGain).connect(this.master);this.tone.start();
      this.whaleDone=false;this.callAt=0;
    }
    async enable(on){if(on)await this.ctx.resume();this.master.gain.setTargetAtTime(on?.75:0,this.ctx.currentTime,.2)}
    depth(d,f){
      const c=this.ctx,t=c.currentTime,sig=Math.exp(-Math.pow((f-232)/28,2)),inAbyss=d>3900&&d<6100;
      this.filter.frequency.setTargetAtTime(90+800*Math.exp(-d/1800),t,.3);this.drone.frequency.setTargetAtTime(58-22*Math.min(1,d/10935),t,.5);
      this.droneGain.gain.setTargetAtTime(.03+.05*Math.min(1,d/4000),t,.5);
      this.tone.frequency.setTargetAtTime(f,t,.06);this.toneGain.gain.setTargetAtTime(inAbyss?.004+sig*.02:0,t,.15);
      if(inAbyss&&sig>.86&&t-this.callAt>2.4){this.callAt=t;this.call()}
    }
    motion(v){this.wash.gain.setTargetAtTime(.18+Math.min(.28,v*.35),this.ctx.currentTime,.2)}
    voice(type,f0,f1,dur,peak,delay=0,time=.3){
      const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain(),dl=c.createDelay(1),fb=c.createGain();
      o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      dl.delayTime.value=time;fb.gain.value=.36;o.connect(g);g.connect(this.master);g.connect(dl);dl.connect(fb).connect(dl);dl.connect(this.master);
      o.start(t);o.stop(t+dur+.05);o.onended=()=>{o.disconnect();g.disconnect();setTimeout(()=>{dl.disconnect();fb.disconnect()},4000)};
    }
    ping(d){if(audioOn)this.voice('sine',d>1000?1250:1700,d>1000?1150:1600,1.1,.16)}
    alarm(){if(!audioOn)return;[0,.12,.24,.36,.48,.6].forEach((dt,i)=>this.voice('sine',2100-i*140,1900-i*140,.5,.05,dt,.21));this.whoosh(.9)}
    // whatever answers the alarm: a low swell of moving water
    whoosh(delay){
      const c=this.ctx,t=c.currentTime+delay,src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
      src.buffer=this.noise.buffer;f.type='bandpass';f.Q.value=1.2;f.frequency.setValueAtTime(320,t);f.frequency.exponentialRampToValueAtTime(70,t+2.6);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.5,t+1.1);g.gain.exponentialRampToValueAtTime(.0001,t+3);
      src.connect(f).connect(g).connect(this.master);src.start(t);src.stop(t+3.1);src.onended=()=>{src.disconnect();f.disconnect();g.disconnect()};
    }
    call(){this.voice('sine',232*2,232*1.98,.7,.06,0,.4)}
    whale(){
      const c=this.ctx,t=c.currentTime,o=c.createOscillator(),lfo=c.createOscillator(),lg=c.createGain(),g=c.createGain(),f=c.createBiquadFilter(),dl=c.createDelay(1.5),fb=c.createGain();
      o.type='sawtooth';o.frequency.setValueAtTime(190,t);o.frequency.linearRampToValueAtTime(260,t+1.4);o.frequency.linearRampToValueAtTime(120,t+3.6);
      lfo.frequency.value=5;lg.gain.value=6;lfo.connect(lg).connect(o.frequency);f.type='lowpass';f.frequency.value=420;f.Q.value=6;
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.08,t+.9);g.gain.exponentialRampToValueAtTime(.0001,t+3.8);
      dl.delayTime.value=.45;fb.gain.value=.45;o.connect(f).connect(g);g.connect(this.master);g.connect(dl);dl.connect(fb).connect(dl);dl.connect(this.master);
      o.start(t);lfo.start(t);o.stop(t+4);lfo.stop(t+4);
    }
    suspend(){this.ctx.suspend()}
    resume(){this.ctx.resume()}
  }
  $('#sound').addEventListener('click',async()=>{
    try{if(!audio)audio=new OceanAudio();audioOn=!audioOn;await audio.enable(audioOn);audio.depth(depth,frequency);$('#sound').setAttribute('aria-pressed',String(audioOn));$('#sound-label').textContent=audioOn?'Sound on':'Sound off'}
    catch{audioOn=false;$('#sound-label').textContent='No sound here';$('#sound').setAttribute('aria-pressed','false')}
  });

  // Field guide: each card draws its animal once, and moves only while you're on it.
  const cards=$$('.specimen').map(el=>({el,kind:el.dataset.draw,canvas:el.querySelector('canvas'),live:false,t:2+Math.random()*3,raf:0}));
  for(const c of cards){const f=+c.el.dataset.from/10935*100,t=+c.el.dataset.to/10935*100,i=c.el.querySelector('.range i');i.style.setProperty('--from',`${f}%`);i.style.setProperty('--to',`${t}%`)}
  function drawCard(c){
    const cv=c.canvas,w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;const dpr=Math.min(devicePixelRatio||1,2);
    if(cv.width!==Math.round(w*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
    const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const ink=OceanScene.ink(ctx),t=c.t,m=Math.min(w,h*1.8);
    if(c.kind==='atolla'){const rim=ink.atolla(w*.5,h*.38,m*.22,t,{x:0,y:0});const age=(t%3.2);for(let i=0;i<rim.length;i++){const head=(age*1.6)%1,d=((i/rim.length-head)%1+1)%1,f=Math.exp(-d*d*90)+Math.exp(-(1-d)*(1-d)*90);if(c.live&&f>.03)ink.glow(rim[i].x,rim[i].y,5+f*10,[90,165,255],f)}}
    if(c.kind==='siphonophore')ink.siphonophore(w*.12,h*.42,w*.8,t);
    if(c.kind==='angler'){const g=ink.angler(w*.52,h*.52,m*.32,t,.25);ink.glow(g.lure[0],g.lure[1],m*.16,[150,230,255],.8);ink.glow(g.lure[0],g.lure[1],4,[235,250,255],1)}
    if(c.kind==='snailfish')ink.snailfish(w*.5,h*.5,m*.3,t);
    if(c.kind==='amphipod')ink.amphipods([{x:w*.5,y:h*.52,L:m*.5,ang:0,dir:1,ph:0}],t);
  }
  function drawCards(force){for(const c of cards)if(force||c.live)drawCard(c)}
  function wake(c,on){
    c.live=on;cancelAnimationFrame(c.raf);if(!on||reduced.matches){drawCard(c);return}
    let prev=0;const loop=now=>{const dt=prev?Math.min(.05,(now-prev)/1000):0;prev=now;c.t+=dt;drawCard(c);if(c.live)c.raf=requestAnimationFrame(loop)};c.raf=requestAnimationFrame(loop);
  }
  for(const c of cards){
    c.el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')wake(c,true)});
    c.el.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')wake(c,false)});
    c.el.addEventListener('click',()=>{wake(c,!c.live)});
  }

  // Numbers: one chart from the surface to the bottom, drawn as the section comes in.
  function buildChart(){
    const svg=$('#chart'),ns='http://www.w3.org/2000/svg',x0=62,x1=404,grid='rgba(214,232,222,.14)';
    const el=(n,a,txt)=>{const e=document.createElementNS(ns,n);for(const k in a)e.setAttribute(k,a[k]);if(txt)e.textContent=txt;svg.append(e);return e};
    const line=pts=>'M'+pts.map(p=>p.map(v=>v.toFixed(1)).join(' ')).join(' L');
    // Panel 1: sunlight over the first 1,000 m, linear, so the cliff is visible.
    const a0=40,a1=168,LX=d=>x0+d/1000*(x1-x0),LY=p=>a1-p/100*(a1-a0);
    el('text',{x:x0,y:16,class:'lbl-ink'},'Sunlight, first 1,000 m');
    el('line',{x1:x0,x2:x1,y1:a1,y2:a1,stroke:grid});el('line',{x1:x0,x2:x0,y1:a0,y2:a1,stroke:grid});
    el('text',{x:x0-8,y:a0+4,'text-anchor':'end'},'100%');el('text',{x:x0-8,y:a1+4,'text-anchor':'end'},'0');
    for(const [d,n] of [[0,'0 m'],[200,'200'],[1000,'1,000 m']])el('text',{x:LX(d),y:a1+20,'text-anchor':d===0?'start':d===1000?'end':'middle'},n);
    const sun=[];for(let d=0;d<=1000;d+=5)sun.push([LX(d),LY(100*Math.exp(-.023*d))]);
    el('path',{d:line(sun),fill:'none',stroke:'#cfe9c9','stroke-width':1.6,class:'draw'});
    el('circle',{cx:LX(200),cy:LY(1),r:3,fill:'#cfe9c9'});el('line',{x1:LX(200),x2:LX(200),y1:LY(1)-6,y2:a0+34,stroke:'rgba(207,233,201,.5)'});
    el('text',{x:LX(200)+8,y:a0+30},'1% left at 200 m');
    // Panel 2: the whole trench, true to scale, with Everest standing on the bottom.
    const y0=250,y1=702,Y=d=>y0+d/10935*(y1-y0);
    el('text',{x:x0,y:y0-22,class:'lbl-ink'},'The whole way down');
    el('line',{x1:x0,x2:x1,y1:y0,y2:y0,stroke:'rgba(214,232,222,.45)','stroke-dasharray':'3 4'});el('text',{x:x0-8,y:y0+4,'text-anchor':'end'},'0 m');
    for(const [d,n] of [[1000,'1,000'],[4000,'4,000'],[6000,'6,000']]){el('line',{x1:x0,x2:x1,y1:Y(d),y2:Y(d),stroke:grid});el('text',{x:x0-8,y:Y(d)+4,'text-anchor':'end'},n)}
    el('line',{x1:x0,x2:x1,y1:y1,y2:y1,stroke:'rgba(214,232,222,.55)'});el('text',{x:x0-8,y:y1+4,'text-anchor':'end',class:'lbl-ink'},'10,935');
    // v2's Everest outline: 243 units tall in its box = 8,849 m here
    const ky=8849*(y1-y0)/10935/243;
    const ev=[[18,300],[52,214],[66,226],[94,142],[108,150],[132,57],[146,92],[160,84],[186,170],[198,162],[232,300]].map(([x,y])=>[x0+24+(x-18)*1.3,y1-(300-y)*ky]);
    const peak=ev[5];el('path',{d:line(ev)+' Z',fill:'rgba(234,240,223,.05)',stroke:'rgba(234,240,223,.75)','stroke-width':1.2,'stroke-linejoin':'round',class:'draw'});
    el('line',{x1:peak[0],x2:peak[0],y1:y0,y2:peak[1],stroke:'#cfe9c9','stroke-width':1.2,'stroke-dasharray':'2 3'});
    el('text',{x:peak[0]+10,y:(y0+peak[1])/2-4,class:'lbl-ink'},'2,086 m of water');el('text',{x:peak[0]+10,y:(y0+peak[1])/2+14},'above the summit');
    el('text',{x:x0+40,y:y1-34,class:'lbl-ink'},'Everest');el('text',{x:x0+40,y:y1-16},'8,849 m');
    el('path',{d:`M${x0} ${y0} L${x1} ${y1}`,fill:'none',stroke:'var(--accent)','stroke-width':1.6,class:'draw'});
    el('text',{x:x1,y:y0+18,'text-anchor':'end'},'Pressure');
    el('text',{x:x1,y:y1-12,'text-anchor':'end',class:'lbl-ink'},'1,090 atm');
    for(const p of svg.querySelectorAll('.draw')){p.setAttribute('pathLength','1');p.style.strokeDasharray='1';p.style.strokeDashoffset='1'}
  }
  buildChart();
  function chartProgress(){const z=secs.find(x=>x.id==='data'),k=smooth(-.65,-.05,(scrollY-z.top)/vh);for(const p of $$('#chart .draw'))p.style.strokeDashoffset=(1-k).toFixed(3)}
  addEventListener('scroll',chartProgress,{passive:true});

  $('#save').addEventListener('click',async()=>{
    const b=$('#save');b.disabled=true;
    try{
      await document.fonts.ready;
      const W=1200,H=1600,card=document.createElement('canvas');card.width=W;card.height=H;const c=card.getContext('2d');
      c.drawImage(OceanScene.postcard(W,H,time+2),0,0);
      const g=c.createLinearGradient(0,0,0,H*.45);g.addColorStop(0,'rgba(2,7,11,.85)');g.addColorStop(1,'rgba(2,7,11,0)');c.fillStyle=g;c.fillRect(0,0,W,H*.45);
      const text=getComputedStyle(document.documentElement).getPropertyValue('--text').trim()||'sans-serif';
      c.fillStyle='#eaf0df';c.font='700 210px Display';c.fillText('10,935 m',72,250);
      c.font=`400 34px ${text}`;c.fillStyle='#a9c3bd';c.fillText('Challenger Deep. 1,090 atm. No sunlight.',78,320);
      c.fillStyle='#ff875e';c.fillText('A postcard from the bottom of the ocean.',78,372);
      c.font='700 46px Display';c.fillStyle='#eaf0df';c.fillText('hadal.',78,H-70);c.font=`400 26px ${text}`;c.fillStyle='#a9c3bd';c.textAlign='right';c.fillText('Ship Notes',W-78,H-78);
      const blob=await new Promise(r=>card.toBlob(r,'image/png'));if(!blob)throw Error('no blob');
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hadal-postcard.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
      $('#save-note').textContent='Saved. Keep it somewhere dark.';
    }catch{$('#save-note').textContent="Couldn't save this time. Try again."}finally{b.disabled=false}
  });

  // One timeline for the browser and for frame-by-frame capture.
  window.hadal={
    renderAt(t,y,{pointer:p={x:0,y:0},torch:tp=null,pings=[],alarms=[],scan:sc=false,frequency:f=174,whale=null}={}){
      recording=true;cancelAnimationFrame(frame);frame=0;document.body.classList.add('recording');
      scrollTo({top:y,behavior:'instant'});time=t;update();chartProgress();
      scene.pulses=pings.slice();scene.alarms=alarms.slice();scene.alarmed=alarms.some(a=>a<=t);setScan(sc);setFrequency(f);
      if(tp){torch.x=tp.x;torch.y=tp.y}
      whaleAt=whale;scene.render({t,s,depth,lift,whaleAt,pointer:p,torch,scan:sc,frequency:f});afterRender();
      return {s,depth,hot:scene.hot};
    },
    live(){recording=false;document.body.classList.remove('recording');scene.pulses=[];scene.alarms=[];last=0;update();schedule()},
    yAt(d){for(const z of secs){if(z.to>z.from&&d<=z.to){const k=Math.pow(clamp((d-z.from)/(z.to-z.from)),1/(EASE[z.id]||1));return z.top+k*z.h-vh/2}}return secs.find(z=>z.id==='bottom').top},
    top(id){return secs.find(z=>z.id===id).top},
    get state(){return {s,depth,time,paused,scan,frequency,audioOn,torch:{...torch},hot:scene.hot}},scene
  };
  setMotionLabel();setScan(false);setFrequency(174);measure();schedule();
  document.fonts.ready.then(()=>{measure();schedule()});
})();

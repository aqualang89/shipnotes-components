'use strict';
const canvas=document.getElementById('bats'),painter=new BatSwarmCore.Painter(canvas),audio=new BatSounds();
let swarm,config={count:38,sound:false},prev=0,acc=0,raf=0,sleepTimer=0,geometry={perches:[],cursor:{x:innerWidth*.5,y:innerHeight*.4}},active=true;
function reset(){painter.resize(innerWidth,innerHeight,Math.min(devicePixelRatio,2));swarm=new BatSwarmCore.Swarm({width:innerWidth,height:innerHeight,count:config.count,size:1,initialPerches:geometry.perches,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches});}
function tick(now){
  if(!active)return;acc+=prev?Math.min((now-prev)/1000,.2):1/60;prev=now;
  while(acc>=1/60){swarm.step();acc-=1/60;}
  painter.draw(swarm);
  const events=swarm.events.splice(0);for(const e of events){if(e.type==='takeoff')audio.takeoff();else if(e.type==='land')audio.land();}
  // A sleeping colony repaints at 10 Hz for breathing/blinks, not 60 Hz.
  if(swarm.still)sleepTimer=setTimeout(()=>{if(active)raf=requestAnimationFrame(tick);},100);else raf=requestAnimationFrame(tick);
}
window.desktopBats.onFrame(data=>{
  geometry=data;swarm.setPerches(data.perches);if(data.cursor)swarm.move(data.cursor.x,data.cursor.y);
  if(!active){active=true;prev=0;raf=requestAnimationFrame(tick);}
});
window.desktopBats.onConfig(async c=>{
  const countChanged=config.count!==c.count;config=c;
  if(countChanged)reset();await audio.enable(c.sound);
  if(c.paused){active=false;cancelAnimationFrame(raf);clearTimeout(sleepTimer);painter.c.clearRect(0,0,canvas.width,canvas.height);}
});
addEventListener('resize',reset);reset();raf=requestAnimationFrame(tick);

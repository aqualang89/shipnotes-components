/* Material motion choreography. Pure time functions for interactive and recorded views. */
(() => {
 const M=globalThis.Motion;
 const clamp=x=>Math.max(0,Math.min(1,x));
 const profiles={
  ember:{duration:.88,k:72,c:16,glow:.22},
  oxide:{duration:.76,k:108,c:23,glow:.12},
  'frozen-vault':{duration:1.05,k:52,c:14,glow:.28},
  'rain-terminal':{duration:.9,k:76,c:15,glow:.24},
  'grid-blackout':{duration:.62,k:170,c:27,glow:.35},
  'ghost-market':{duration:.78,k:100,c:18,glow:.28}
 };
 function progress(theme,age){
  if(age<=0)return 0;
  const p=clamp(age/profiles[theme].duration);
  if(p>=1)return 1;
  if(theme==='ember')return M.spring(age,.17,.93);
  if(theme==='oxide')return M.keys(p,[[0,0],[.14,.015],[.34,.24],[.65,1.018],[.83,.995],[1,1]]);
  if(theme==='frozen-vault')return M.bezier(.20,.02,.16,1)(p);
  if(theme==='rain-terminal')return M.spring(age,.19,1.12);
  if(theme==='grid-blackout')return M.keys(p,[[0,0],[.12,.025],[.38,.78],[.48,.78],[.70,1.012],[.82,.996],[1,1]]);
  return M.keys(p,[[0,0],[.12,0],[.29,.34],[.57,1.025],[.78,.992],[1,1]]);
 }
 function event(theme,time,e){
  const age=e?time-e.at:100, p=profiles[theme];
  const travel=age>=0&&age<p.duration?Math.sin(Math.PI*clamp(age/p.duration)):0;
  const landing=age-p.duration*.68;
  return {age,travel,landing,dir:Math.sign((e?.to||0)-(e?.from||0)),hit:M.flash(age,p.duration*.68,.16)};
 }
 function pose(theme,time,e,d){
  const q=event(theme,time,e), f=Math.max(0,1-Math.abs(d)), side=Math.sign(d), out={x:0,y:0,z:0,rx:0,ry:0,rz:0,light:0,latch:0};
  const settled=q.landing>=0?M.impact(q.landing,.09,.25):0;
  if(theme==='ember'){out.y=-7*q.travel*f;out.z=24*q.travel*f;out.ry=-q.dir*q.travel*5*f;out.rz=side*q.travel*.7;out.light=q.hit*.5;}
  if(theme==='oxide'){out.y=-22*q.travel*f+settled*3*f;out.rx=-q.travel*5*f;out.rz=-q.dir*q.travel*1.4*f;out.light=q.hit*.23;}
  if(theme==='frozen-vault'){out.z=22*q.travel*f;out.y=-2*q.travel;out.ry=q.dir*q.travel*2;out.light=q.hit*.7;}
  if(theme==='rain-terminal'){out.y=(-9*q.travel+Math.sin(time*1.1)*1.2)*f;out.rx=q.travel*2.5*f;out.rz=Math.sin(time*.7)*.15*f;out.light=q.hit*.35;}
  if(theme==='grid-blackout'){out.y=settled*2.3;out.x=q.landing>=0?Math.sin(q.landing*72)*Math.exp(-q.landing*22)*2:0;out.rx=settled*1.1;out.latch=q.travel*5;out.light=q.hit*.9;}
  if(theme==='ghost-market'){out.y=-8*q.travel*f;out.ry=-q.dir*q.travel*4;out.rz=Math.sin(time*.55+d)*.16*f;out.light=q.hit*.6;out.x=q.age>.2&&q.age<.26?Math.sin(q.age*120)*2.5*f:0;}
  return out;
 }
 globalThis.CardMotion={profiles,progress,event,pose};
})();

/* HADAL v3 / one ocean, one light model. Line drawings on Canvas 2D, no images, no libraries. */
(() => {
  const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v,mix=(a,b,t)=>a+(b-a)*t;
  const smooth=(a,b,v)=>{const q=clamp((v-a)/(b-a));return q*q*(3-2*q)};
  const hash=n=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v)};
  const rgba=(r,g,b,a=1)=>`rgba(${r|0},${g|0},${b|0},${clamp(a).toFixed(3)})`;

  // Pure water absorption per meter (red, green, blue). Red is gone in 10-20 m, blue reaches ~1% at 200 m.
  const KABS=[.36,.07,.023];
  const tr=(d,i)=>Math.exp(-KABS[i]*Math.max(0,d));
  const sunAt=d=>tr(d,2);
  const ambAt=d=>d<=0?1:Math.pow(clamp(1+Math.log10(Math.max(1e-30,sunAt(d)))/5),1.4);
  const tintAt=d=>{const t=[tr(d,0),tr(d,1),tr(d,2)],m=Math.max(t[0],t[1],t[2]);return t.map(v=>Math.sqrt(v/m))};

  // Catmull-Rom through points, as cubic beziers.
  function spline(ctx,pts,closed=true){
    const n=pts.length,last=closed?n:n-1;ctx.moveTo(pts[0][0],pts[0][1]);
    for(let i=0;i<last;i++){
      const p1=pts[i],p2=pts[(i+1)%n],p0=closed?pts[(i-1+n)%n]:pts[Math.max(0,i-1)],p3=closed?pts[(i+2)%n]:pts[Math.min(n-1,i+2)];
      ctx.bezierCurveTo(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6,p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6,p2[0],p2[1]);
    }
    if(closed)ctx.closePath();
  }

  let sprite=null;
  function glowSprite(){
    if(sprite)return sprite;
    sprite=document.createElement('canvas');sprite.width=sprite.height=64;
    const c=sprite.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.18,'rgba(255,255,255,.55)');g.addColorStop(.5,'rgba(255,255,255,.12)');g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.fillRect(0,0,64,64);return sprite;
  }
  const tinted={};
  function glowOf(r,g,b){
    const key=`${r},${g},${b}`;if(tinted[key])return tinted[key];
    const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
    x.drawImage(glowSprite(),0,0);x.globalCompositeOperation='source-in';x.fillStyle=`rgb(${r},${g},${b})`;x.fillRect(0,0,64,64);
    return tinted[key]=c;
  }

  const bokehs={};
  function bokehOf(col){
    const q=col.map(v=>Math.min(255,v&~15)),key=q.join(',');if(bokehs[key])return bokehs[key];
    const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,`rgba(${key},.5)`);g.addColorStop(.72,`rgba(${key},.55)`);g.addColorStop(.88,`rgba(${key},.85)`);g.addColorStop(1,`rgba(${key},0)`);
    x.fillStyle=g;x.fillRect(0,0,64,64);return bokehs[key]=c;
  }

  // Everything that can be drawn. T tints reflected color by the light that reaches it, k fades the whole layer.
  class Ink{
    constructor(ctx){this.ctx=ctx;this.T=[1,1,1];this.k=1;this.w=1;this.pulses=[]}
    c(r,g,b,a=1){const T=this.T;return rgba(r*T[0],g*T[1],b*T[2],a*this.k)}
    glow(x,y,r,col,a){const c=this.ctx;c.globalAlpha=clamp(a*this.k);c.drawImage(glowOf(...col),x-r,y-r,r*2,r*2);c.globalAlpha=1}

    // Astra's jellyfish, unchanged in shape. Colors now go through the light model.
    jelly(cx,cy,size,tilt,t,alpha,color,scan,pointer){
      const ctx=this.ctx,C=this.c.bind(this);ctx.save();ctx.globalAlpha=alpha;
      const pulse=1+Math.sin(t*1.65)*.042;
      let response=0;for(const ping of this.pulses){const age=t-ping.t;if(age>=0&&age<2)response+=Math.sin(age*8)*Math.exp(-age*2)*.10}
      const scale=size*(pulse+response),rot=t*.045,cr=Math.cos(rot),sr=Math.sin(rot),cp=Math.cos(-.27),sp=Math.sin(-.27),ct=Math.cos(tilt),st=Math.sin(tilt);
      const project=(x,y,z)=>{const xx=x*cr-z*sr,zz=x*sr+z*cr,yy=y*cp-zz*sp,z2=y*sp+zz*cp,pr=3.8/(3.8+z2);return {x:cx+(xx*ct-yy*st)*scale*pr,y:cy+(xx*st+yy*ct)*scale*pr,z:z2}};
      const bell=(u,v)=>{const a=u*TAU,scallop=1+.022*Math.cos(a*20)*Math.pow(v,8),r=Math.sin(v*Math.PI*.5)*scallop;return project(r*Math.cos(a),-.76*Math.cos(v*Math.PI*.5)+.10*Math.pow(v,8)*Math.sin(a*10+t*.7),r*Math.sin(a))};
      const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,scale*1.55);glow.addColorStop(0,C(color[0],color[1],color[2],scan?.025:.075));glow.addColorStop(.5,C(62,184,172,.025));glow.addColorStop(1,'rgba(7,52,65,0)');ctx.fillStyle=glow;ctx.fillRect(cx-scale*1.6,cy-scale*1.6,scale*3.2,scale*3.2);
      const strands=this.w<700?24:34;
      for(let j=0;j<strands;j++){
        const a=j/strands*TAU,startR=.76+.13*hash(j*7),length=1.8+hash(j*11)*1.8,path=new Path2D();let tip;
        for(let k=0;k<=40;k++){
          const q=k/40,flow=q*q;
          const xx=Math.cos(a)*startR*(1-q*.38)+Math.sin(q*6-t*.9+j*.8)*(.025+q*.20)+pointer.x*flow*.27;
          const zz=Math.sin(a)*startR*(1-q*.35)+Math.cos(q*7-t*.68+j)*q*.20;
          const v=project(xx,q*length+Math.sin(q*8-t+j)*.02,zz);k?path.lineTo(v.x,v.y):path.moveTo(v.x,v.y);tip=v;
        }
        ctx.strokeStyle=C(74,195,186,scan?.22:.055);ctx.lineWidth=3.5;ctx.stroke(path);
        ctx.strokeStyle=j%4===0?C(color[0],color[1],color[2],.43):C(106,210,201,.35);ctx.lineWidth=j%4===0?1.1:.6;ctx.stroke(path);
        if(j%4===0){ctx.beginPath();ctx.arc(tip.x,tip.y,1,0,TAU);ctx.fillStyle=C(169,236,215,.66);ctx.fill()}
      }
      for(let arm=0;arm<4;arm++){
        const a=arm/4*TAU+t*.06,path=new Path2D();
        for(let side=0;side<2;side++)for(let k=0;k<=30;k++){
          const q=side?1-k/30:k/30,width=(1-q)*(.13+.04*Math.sin(q*32+t));
          const v=project(Math.cos(a)*.20+Math.sin(q*6.5-t*.75+arm)*q*.34+(side?width:-width),q*2.3-.1,Math.sin(a)*.26+Math.cos(q*8-t+arm)*q*.14);
          (!side&&!k)?path.moveTo(v.x,v.y):path.lineTo(v.x,v.y);
        }
        path.closePath();ctx.fillStyle=C(color[0],color[1]*.7,color[2]*.7,scan?.03:.08);ctx.fill(path);ctx.strokeStyle=C(color[0],color[1],color[2],.18);ctx.lineWidth=.6;ctx.stroke(path);
      }
      const cols=size<100?16:28,rows=14;
      const grid=Array.from({length:cols+1},(_,i)=>Array.from({length:rows+1},(_,j)=>bell(i/cols,j/rows)));
      const strips=Array.from({length:cols},(_,i)=>({i,z:grid[i].reduce((s,v)=>s+v.z,0)/rows})).sort((a,b)=>b.z-a.z);
      if(!scan)for(const strip of strips){
        const i=strip.i,light=.5+.5*Math.sin(i/cols*TAU-.6);
        ctx.beginPath();grid[i].forEach((q,j)=>j?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));for(let j=rows;j>=0;j--){const q=grid[i+1][j];ctx.lineTo(q.x,q.y)}ctx.closePath();
        const skin=ctx.createLinearGradient(cx,cy-scale*.9,cx,cy+scale*.35);
        skin.addColorStop(0,C(color[0],color[1],color[2],.05+light*.12));skin.addColorStop(.55,C(color[0]*.8,color[1]*.85,color[2],.10+light*.12));skin.addColorStop(1,C(112,218,197,.12+light*.16));
        ctx.fillStyle=skin;ctx.fill();
      }
      if(scan)for(let j=2;j<=rows;j+=2){ctx.beginPath();for(let i=0;i<=cols;i++){const q=grid[i][j];i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)}ctx.strokeStyle=C(125,228,206,.24);ctx.lineWidth=.5;ctx.stroke()}
      for(let j=0;j<24;j++){
        const path=new Path2D();for(let k=0;k<=24;k++){const q=bell(j/24,k/24);k?path.lineTo(q.x,q.y):path.moveTo(q.x,q.y)}
        ctx.strokeStyle=C(color[0],color[1]+30,color[2]+40,j%2===0?.36:.14);ctx.lineWidth=j%2===0?1.2:.6;ctx.stroke(path);
        const bulb=bell(j/24,.96);ctx.beginPath();ctx.arc(bulb.x,bulb.y,1.2+size/250,0,TAU);ctx.fillStyle=C(197,246,218,.7);ctx.fill();
      }
      for(let ring=0;ring<3;ring++){ctx.beginPath();for(let k=0;k<=120;k++){const q=bell(k/120,1-ring*.025);k?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)}ctx.strokeStyle=C(129+ring*35,230,208,.48-ring*.12);ctx.lineWidth=ring===0?1.8:.6;ctx.stroke()}
      ctx.globalCompositeOperation='screen';
      for(let j=0;j<8;j++){const a=j/8*TAU,p=project(Math.cos(a)*.31,-.25,Math.sin(a)*.31),r=scale*.16,g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,C(color[0],color[1]+25,color[2],scan?.07:.28));g.addColorStop(.22,C(color[0],color[1],color[2],scan?.04:.16));g.addColorStop(1,'rgba(250,145,106,0)');ctx.fillStyle=g;ctx.fillRect(p.x-r,p.y-r,r*2,r*2)}
      ctx.restore();
    }

    // Atolla wyvillei: flat red bell, deep coronal groove, 22 lappets, one long trailing tentacle.
    // Returns its rim in screen space so the alarm can be drawn as light later.
    atolla(cx,cy,R,t,pointer){
      const ctx=this.ctx,C=this.c.bind(this);ctx.save();
      const pulse=Math.pow(Math.max(0,Math.sin(t*1.25)),2);cy+=pulse*R*.05;const beat=1-.1*pulse,rot=t*.06,cr=Math.cos(rot),sr=Math.sin(rot),tilt=.62,ct=Math.cos(tilt),st=Math.sin(tilt);
      const project=(x,y,z)=>{const xx=x*cr-z*sr,zz=x*sr+z*cr,yy=y*ct-zz*st,z2=y*st+zz*ct,pr=4/(4+z2);return {x:cx+xx*R*pr,y:cy+yy*R*pr,z:z2}};
      const bell=(u,v)=>{
        const a=u*TAU,groove=Math.exp(-Math.pow((v-.58)/.05,2)),lap=v>.82?(Math.pow(Math.abs(Math.cos(a*11)),.7)-.55)*(v-.82)/.18:0;
        const r=Math.sin(v*Math.PI*.5)*(1-groove*.05)*(1+lap*.09)*beat;
        return project(r*Math.cos(a),-.40*Math.cos(v*Math.PI*.5)+groove*.05+lap*.05,r*Math.sin(a));
      };
      const halo=ctx.createRadialGradient(cx,cy,0,cx,cy,R*1.7);halo.addColorStop(0,C(160,20,50,.16));halo.addColorStop(1,'rgba(160,20,50,0)');ctx.fillStyle=halo;ctx.fillRect(cx-R*1.8,cy-R*1.8,R*3.6,R*3.6);
      // tentacles first, they hang behind the bell
      ctx.lineCap='round';
      const tent=new Path2D(),tips=[];
      for(let j=0;j<22;j++){
        const a=(j+.5)/22*TAU,len=.55+hash(j*5)*.35;
        for(let k=0;k<=14;k++){
          const q=k/14,rr=1.02+q*.18;
          const v=project(Math.cos(a)*rr+Math.sin(q*4-t*.8+j)*.04*q+pointer.x*q*.05,.02-q*len*(.4+.6*Math.sin(j*1.7+t*.3)**2)+q*q*.3,Math.sin(a)*rr);
          k?tent.lineTo(v.x,v.y):tent.moveTo(v.x,v.y);if(k===14)tips.push(v);
        }
      }
      ctx.strokeStyle=C(225,95,90,.1);ctx.lineWidth=2.6;ctx.stroke(tent);ctx.strokeStyle=C(235,110,100,.42);ctx.lineWidth=.7;ctx.stroke(tent);
      ctx.fillStyle=C(255,160,140,.6);for(const v of tips){ctx.beginPath();ctx.arc(v.x,v.y,1.1,0,TAU);ctx.fill()}
      const longT=new Path2D();
      for(let k=0;k<=60;k++){const q=k/60,a=.9,v=project(Math.cos(a)*(1-q*.2)+Math.sin(q*5-t*.7)*.25*q+pointer.x*q*.3,.05+q*5.2,Math.sin(a)*(1-q*.3)+Math.cos(q*4-t*.5)*.2*q);k?longT.lineTo(v.x,v.y):longT.moveTo(v.x,v.y)}
      ctx.strokeStyle=C(235,110,100,.12);ctx.lineWidth=3;ctx.stroke(longT);ctx.strokeStyle=C(240,120,110,.55);ctx.lineWidth=1;ctx.stroke(longT);
      // bell skin in strips, back to front
      const cols=32,rows=12,grid=Array.from({length:cols+1},(_,i)=>Array.from({length:rows+1},(_,j)=>bell(i/cols,j/rows)));
      const strips=Array.from({length:cols},(_,i)=>({i,z:grid[i].reduce((s,v)=>s+v.z,0)})).sort((a,b)=>b.z-a.z);
      for(const {i} of strips){
        ctx.beginPath();grid[i].forEach((q,j)=>j?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));for(let j=rows;j>=0;j--){const q=grid[i+1][j];ctx.lineTo(q.x,q.y)}ctx.closePath();
        const light=.5+.5*Math.sin(i/cols*TAU+.8);ctx.fillStyle=C(150+light*50,18,30,.2+light*.12);ctx.fill();
      }
      // stomach, the darker heart of the bell
      ctx.beginPath();for(let k=0;k<=40;k++){const q=bell(k/40,.42);k?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)}ctx.closePath();ctx.fillStyle=C(95,10,38,.55);ctx.fill();
      const stri=new Path2D();for(let k=0;k<88;k++){const a=bell(k/88,.62),b=bell(k/88,.8);stri.moveTo(a.x,a.y);stri.lineTo(b.x,b.y)}ctx.strokeStyle=C(255,140,130,.11);ctx.lineWidth=.5;ctx.stroke(stri);
      for(let j=0;j<22;j++){const p=new Path2D();for(let k=0;k<=18;k++){const q=bell((j+.5)/22,.3+k/18*.7);k?p.lineTo(q.x,q.y):p.moveTo(q.x,q.y)}ctx.strokeStyle=C(255,120,110,j%2?.16:.3);ctx.lineWidth=j%2?.5:.9;ctx.stroke(p);const bu=bell((j+.5)/22,.9);ctx.beginPath();ctx.arc(bu.x,bu.y,1.2+R/200,0,TAU);ctx.fillStyle=C(255,175,155,.6);ctx.fill()}
      for(const v of [.58,.6]){ctx.beginPath();for(let k=0;k<=110;k++){const q=bell(k/110,v);k?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)}ctx.strokeStyle=C(255,150,135,v===.58?.55:.2);ctx.lineWidth=v===.58?1.2:.5;ctx.stroke()}
      const rim=[];ctx.beginPath();for(let k=0;k<=176;k++){const q=bell(k/176,1);k?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)}ctx.strokeStyle=C(255,160,140,.7);ctx.lineWidth=1.4;ctx.stroke();
      for(let j=0;j<22;j++)rim.push(bell((j+.5)/22,.98));
      ctx.globalCompositeOperation='screen';
      for(let j=0;j<6;j++){const a=j/6*TAU+t*.05,q=project(Math.cos(a)*.3,-.22,Math.sin(a)*.3),r=R*.22,g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,r);g.addColorStop(0,C(230,60,110,.22));g.addColorStop(1,'rgba(230,60,110,0)');ctx.fillStyle=g;ctx.fillRect(q.x-r,q.y-r,r*2,r*2)}
      ctx.restore();return rim;
    }

    // Volume the way the jellyfish has it: rings of points along a spine, seen from three quarters.
    // top/bot/side give the half-sizes of each cross-section, wave bends the spine, sway swings it sideways.
    tube({cx,cy,S,dir=1,yaw=.32,pitch=.1,len=2,top,bot,side,wave=()=>0,sway=()=>0,nu=40,nt=18}){
      const cyw=Math.cos(yaw),syw=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
      const proj=(x,y,z)=>{const x1=x*cyw-z*syw,z1=x*syw+z*cyw,y1=y*cp-z1*sp,z2=y*sp+z1*cp,pr=6/(6+z2);return {x:cx+x1*S*pr*dir,y:cy+y1*S*pr,z:z2}};
      const g=[];
      for(let j=0;j<nt;j++){
        const th=j/nt*TAU,ct=Math.cos(th),st=Math.sin(th),row=[];
        for(let i=0;i<=nu;i++){const u=i/nu,x=-1+len*u;row.push(proj(x,wave(u)-(ct>0?top(u):bot(u))*ct,side(u)*st+sway(u)))}
        g.push(row);
      }
      // silhouette: per station the highest and the lowest point on screen
      const upE=[],dnE=[];
      for(let i=0;i<=nu;i++){let a=g[0][i],b=g[0][i];for(let j=1;j<nt;j++){const q=g[j][i];if(q.y<a.y)a=q;if(q.y>b.y)b=q}upE.push([a.x,a.y]);dnE.push([b.x,b.y])}
      return {g,upE,dnE,proj,nu,nt,len};
    }
    // Strips back to front, lit from above, then the lines that wrap the form: wide and soft under thin and bright.
    skin(T,{fill,line,lineFront=.3,lineBack=.06,rings=6,ringA=.08}){
      const ctx=this.ctx,C=this.c.bind(this),{g,nu,nt}=T,strips=[];
      for(let j=0;j<nt;j++){const a=g[j],b=g[(j+1)%nt];let z=0;for(let i=0;i<=nu;i+=4)z+=a[i].z+b[i].z;strips.push({j,z})}
      strips.sort((p,q)=>q.z-p.z);
      for(const {j} of strips){
        const a=g[j],b=g[(j+1)%nt],l=.5+.5*Math.cos((j+.5)/nt*TAU-.5);
        ctx.beginPath();a.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));for(let i=nu;i>=0;i--)ctx.lineTo(b[i].x,b[i].y);ctx.closePath();
        ctx.fillStyle=fill(l,j);ctx.fill();
      }
      for(let j=0;j<nt;j++){
        const row=g[j];let z=0;for(let i=0;i<=nu;i+=4)z+=row[i].z;const front=z<0,p=new Path2D();
        row.forEach((q,i)=>i?p.lineTo(q.x,q.y):p.moveTo(q.x,q.y));
        if(front){ctx.strokeStyle=C(...line,lineFront*.22);ctx.lineWidth=3;ctx.stroke(p)}
        ctx.strokeStyle=C(...line,front?lineFront:lineBack);ctx.lineWidth=front?.8:.5;ctx.stroke(p);
      }
      for(let r=1;r<=rings;r++){const i=Math.round(r/(rings+1)*nu),p=new Path2D();for(let j=0;j<=nt;j++){const q=g[j%nt][i];j?p.lineTo(q.x,q.y):p.moveTo(q.x,q.y)}ctx.strokeStyle=C(...line,ringA);ctx.lineWidth=.6;ctx.stroke(p)}
    }
    // A fin like the jellyfish's fringe: thin membrane, double-stroked rays, a bead on every other tip.
    fanFin(bases,tips,col,a=1){
      const ctx=this.ctx,C=this.c.bind(this),n=tips.length,mem=new Path2D(),rays=new Path2D(),edge=new Path2D();
      spline(mem,[...tips,...bases.slice().reverse()],true);
      for(let i=0;i<n;i++){const b=bases[i],e=tips[i];rays.moveTo(b[0],b[1]);rays.quadraticCurveTo((b[0]+e[0])/2+(e[1]-b[1])*.08,(b[1]+e[1])/2-(e[0]-b[0])*.08,e[0],e[1])}
      ctx.fillStyle=C(...col,.07*a);ctx.fill(mem);
      ctx.strokeStyle=C(...col,.11*a);ctx.lineWidth=2.4;ctx.stroke(rays);
      ctx.strokeStyle=C(...col,.42*a);ctx.lineWidth=.6;ctx.stroke(rays);
      spline(edge,tips,false);ctx.strokeStyle=C(...col,.3*a);ctx.stroke(edge);
      ctx.fillStyle=C(...col,.7*a);for(let i=0;i<n;i+=2){ctx.beginPath();ctx.arc(tips[i][0],tips[i][1],1.1,0,TAU);ctx.fill()}
    }

    // Humpback anglerfish, three quarters, facing left. S = half the body length in px. open 0..1 drops the jaw.
    angler(cx,cy,S,t,open){
      const ctx=this.ctx,C=this.c.bind(this);ctx.save();
      // globular: deepest just behind the eye, a short narrow tail stock
      const env=u=>Math.pow(Math.sin(Math.PI*Math.min(1,.06+u)),.55);
      const top=u=>Math.max(.12,mix(.1,.68*env(u),smooth(0,.25,u))),bot=u=>Math.max(.12,mix(.1,.62*Math.pow(Math.sin(Math.PI*Math.min(1,.1+u)),.6),smooth(0,.15,u)));
      const side=u=>.55*Math.pow(env(u),.8)+.05;
      const sway=u=>Math.sin(t*1.6)*.3*Math.pow(Math.max(0,u-.5),2);
      const T=this.tube({cx,cy,S,dir:1,yaw:.3,pitch:.1,len:1.72,top,bot,side,wave:()=>-.03,sway,nu:40,nt:18});
      const {upE,dnE,proj,nu}=T,X=u=>-1+1.72*u;
      // tail fin and a small dorsal behind the body
      const tb=[],tt=[];for(let i=0;i<9;i++){const k=i/8,e0=upE[nu],e1=dnE[nu],b=[mix(e0[0],e1[0],.2+k*.6),mix(e0[1],e1[1],.2+k*.6)],a=-.55+k*1.1+Math.sin(t*1.6)*.12,l=S*(.34+.06*Math.sin(k*Math.PI));tb.push(b);tt.push([b[0]+Math.cos(a)*l,b[1]+Math.sin(a)*l])}
      this.fanFin(tb,tt,[215,195,175],.9);
      const db=[],dt=[];for(let i=31;i<=36;i++){const b=upE[i];db.push(b);dt.push([b[0]+S*.06,b[1]-S*(.07+.04*Math.sin((i-31)/5*Math.PI))])}this.fanFin(db,dt,[215,195,175],.7);
      this.skin(T,{fill:l=>C(12+l*18,10+l*13,13+l*12,.96),line:[215,195,175],lineFront:.26,lineBack:.05,rings:8,ringA:.06});
      // skin pores along a few lines
      ctx.fillStyle=C(225,205,185,.35);for(let j=10;j<17;j+=3)for(let i=6;i<nu-4;i+=3){const q=T.g[j][i];if(q.z<0){ctx.beginPath();ctx.arc(q.x,q.y,.9,0,TAU);ctx.fill()}}
      // the mouth: a dark gap on the near side, the lower lip drops as it opens
      const nz=u=>-side(u)*.55,L=(x,y,u)=>{const q=proj(x,y,nz(u));return [q.x,q.y]};
      const corner=L(-.36,.06,.38),upLip=[L(-.97,-.1,.02),L(-.66,-.03,.2),corner],dnLip=[L(-1.05,.05+open*.12,.02),L(-.72,.13+open*.2,.17),corner];
      const mouth=new Path2D();spline(mouth,[...upLip,...dnLip.slice(0,2).reverse()],true);ctx.fillStyle=C(6,4,6,.96);ctx.fill(mouth);
      ctx.strokeStyle=C(230,210,190,.75);ctx.lineWidth=1.1;const ul=new Path2D();spline(ul,upLip,false);ctx.stroke(ul);const dl=new Path2D();spline(dl,dnLip,false);ctx.stroke(dl);
      ctx.fillStyle=C(244,236,214,.92);
      const teeth=(a,b,n,dirY,lenMax,seed)=>{for(let i=0;i<n;i++){const f=clamp((i+.5+(hash(seed+i*7)-.5)*.6)/n),x=mix(a[0],b[0],f),y=mix(a[1],b[1],f),len=S*(lenMax*(.35+.65*hash(seed+i*3))*(1-f*.55)+.02),w=S*(.006+(1-f)*.004),bend=S*.06*(1-f);ctx.beginPath();ctx.moveTo(x-w,y);ctx.quadraticCurveTo(x+bend*.5,y+dirY*len*.6,x+bend,y+dirY*len);ctx.lineTo(x+w,y);ctx.closePath();ctx.fill()}};
      teeth(upLip[0],corner,7,1,.24,11);teeth(dnLip[0],corner,6,-1,.22,37);
      // eye: a glossy lens that catches your lamp
      const e=proj(-.57,-.3,nz(.25));ctx.beginPath();ctx.arc(e.x,e.y,S*.046,0,TAU);ctx.fillStyle=C(10,10,12,1);ctx.fill();ctx.strokeStyle=C(230,220,200,.75);ctx.lineWidth=1;ctx.stroke();
      ctx.beginPath();ctx.arc(e.x,e.y,S*.07,-2.4,-1.2);ctx.strokeStyle=C(230,220,200,.3);ctx.stroke();
      ctx.beginPath();ctx.arc(e.x-S*.013,e.y-S*.013,Math.max(1,S*.01),0,TAU);ctx.fillStyle=C(255,255,255,.95);ctx.fill();
      // pectoral fin on the near side
      const pb=proj(-.02,.18,nz(.55)),pt=[];for(let i=0;i<10;i++){const a=1.75+i/9*1+Math.sin(t*2+i*.5)*.06,l=S*(.26+.08*Math.sin(i/9*Math.PI));pt.push([pb.x+Math.cos(a)*l,pb.y+Math.sin(a)*l])}this.fanFin(pt.map(()=>[pb.x,pb.y]),pt,[220,200,180],1);
      ctx.strokeStyle=C(232,212,192,.8);ctx.lineWidth=1.3;const out=new Path2D();spline(out,[...upE.slice(2),...dnE.slice(2).reverse()],false);ctx.stroke(out);
      // the rod, with fine filaments around the lure the way real escas have them
      const sw=Math.sin(t*.9)*.05,rb=[proj(-.6,-.6,0).x,proj(-.6,-.6,0).y],rc=[proj(-.86,-1.04,0).x,proj(-.86,-1.04,0).y],lq=proj(-1.13+sw,-.76+Math.cos(t*.9)*.02,-.05),lure=[lq.x,lq.y];
      const rod=new Path2D();rod.moveTo(...rb);rod.quadraticCurveTo(...rc,...lure);ctx.strokeStyle=C(225,205,185,.7);ctx.lineWidth=1.1;ctx.stroke(rod);
      ctx.strokeStyle=C(200,230,240,.35);ctx.lineWidth=.6;for(let i=0;i<4;i++){const a=1.2+i*.5+Math.sin(t*1.3+i)*.2,l=S*(.05+.03*hash(i+3));ctx.beginPath();ctx.moveTo(...lure);ctx.quadraticCurveTo(lure[0]+Math.cos(a)*l*.6,lure[1]+Math.sin(a)*l*.3,lure[0]+Math.cos(a)*l,lure[1]+Math.sin(a)*l);ctx.stroke()}
      ctx.restore();return {lure,eye:[e.x,e.y],rod:[rb,rc,lure]};
    }

    // Hadal snailfish: half water. You see its spine and gut through the skin.
    snailfish(cx,cy,S,t){
      const ctx=this.ctx,C=this.c.bind(this);ctx.save();
      const hw=u=>u<.22?.36*Math.pow(Math.sin(u/.22*Math.PI*.5),.5):u<.5?mix(.36,.13,smooth(.22,.5,u)):.13*Math.pow(1-(u-.5)/.5,1.2)+.006;
      const sway=u=>Math.sin(u*5-t*2.2)*(.01+.14*u*u);
      const T=this.tube({cx,cy,S,dir:1,yaw:.38,pitch:.12,top:hw,bot:u=>hw(u)*.92,side:u=>hw(u)*(u<.3?.85:.55),sway,nu:40,nt:16});
      const {upE,dnE,proj,nu}=T;
      const gl=ctx.createRadialGradient(cx-S*.45,cy,0,cx-S*.45,cy,S*1.1);gl.addColorStop(0,C(240,170,185,.09));gl.addColorStop(1,'rgba(240,170,185,0)');ctx.fillStyle=gl;ctx.fillRect(cx-S*1.6,cy-S,S*2.6,S*2);
      const ft=(E,from,to,dir,len)=>{const b=[],tp=[];for(let i=from;i<=to;i+=2){const [x,y]=E[i],u=i/nu,l=len*S*Math.sin(Math.PI*Math.min(1,(i-from)/(to-from)*.9+.1))*(1+.15*Math.sin(t*3-u*9));b.push([x,y]);tp.push([x+S*.03,y+dir*l])}this.fanFin(b,tp,[245,205,210],1)};
      ft(upE,16,nu,-1,.17);ft(dnE,19,nu,1,.15);
      this.skin(T,{fill:l=>C(240,180,190,.035+l*.07),line:[245,210,215],lineFront:.3,lineBack:.08,rings:7,ringA:.07});
      const sp=new Path2D();for(let i=8;i<=nu;i++){const u=i/nu,q=proj(-1+2*u,0,sway(u));i>8?sp.lineTo(q.x,q.y):sp.moveTo(q.x,q.y)}
      ctx.strokeStyle=C(250,215,220,.12);ctx.lineWidth=3;ctx.stroke(sp);ctx.strokeStyle=C(250,220,225,.45);ctx.lineWidth=.9;ctx.stroke(sp);
      const my=new Path2D();for(let i=11;i<nu-2;i+=3){const u=i/nu,q=proj(-1+2*u,0,sway(u)),h=hw(u)*S*.75;my.moveTo(q.x-h*.25,q.y-h);my.quadraticCurveTo(q.x+h*.2,q.y,q.x-h*.25,q.y+h)}ctx.strokeStyle=C(245,200,210,.09);ctx.lineWidth=.6;ctx.stroke(my);
      const gut=proj(-.42,.08,0);ctx.beginPath();ctx.ellipse(gut.x,gut.y,S*.15,S*.09,.1,0,TAU);ctx.fillStyle=C(240,150,170,.16);ctx.fill();ctx.strokeStyle=C(250,190,200,.25);ctx.lineWidth=.7;ctx.stroke();
      const br=proj(-.66,-.12,0);ctx.beginPath();ctx.ellipse(br.x,br.y,S*.07,S*.05,0,0,TAU);ctx.strokeStyle=C(250,200,210,.18);ctx.stroke();
      const pb=proj(-.5,.16,-.22),pt=[];for(let i=0;i<10;i++){const a=1.5+i/9*1.15+Math.sin(t*2.2+i*.4)*.07,l=S*(.2+(i/9)*.24);pt.push([pb.x+Math.cos(a)*l,pb.y+Math.sin(a)*l])}this.fanFin(pt.map(()=>[pb.x,pb.y]),pt,[245,215,220],1.1);
      const e=proj(-.8,-.1,-.2);ctx.beginPath();ctx.arc(e.x,e.y,S*.034,0,TAU);ctx.fillStyle=C(16,10,14,.95);ctx.fill();ctx.strokeStyle=C(250,225,225,.7);ctx.lineWidth=.9;ctx.stroke();
      ctx.beginPath();ctx.arc(e.x-S*.01,e.y-S*.01,Math.max(1,S*.009),0,TAU);ctx.fillStyle=C(255,255,255,.9);ctx.fill();
      const mo=proj(-.99,.05,-.1),mc=proj(-.86,.09,-.18);ctx.beginPath();ctx.moveTo(mo.x,mo.y);ctx.quadraticCurveTo((mo.x+mc.x)/2,mo.y+S*.01,mc.x,mc.y);ctx.strokeStyle=C(245,215,215,.45);ctx.lineWidth=.8;ctx.stroke();
      const out=new Path2D();spline(out,[...upE,...dnE.slice().reverse()],true);ctx.strokeStyle=C(250,220,225,.75);ctx.lineWidth=1.2;ctx.stroke(out);
      ctx.restore();
    }

    // A swarm of hadal amphipods, all strokes in one path.
    amphipods(list,t,scale=1){
      const ctx=this.ctx,C=this.c.bind(this),body=new Path2D(),seg=new Path2D(),fine=new Path2D();
      // arched back, tail tucked under: the classic amphipod C
      const spineY=u=>-.2*Math.sin(Math.PI*Math.min(1,u*1.05))+(u>.72?Math.pow((u-.72)/.28,2)*.3:0);
      const thick=u=>u<.12?.07+u*.6:u<.55?.14:.14*(1-(u-.55)/.45)+.035;
      for(const a of list){
        const L=a.L*scale,dir=a.dir,ca=Math.cos(a.ang),sa=Math.sin(a.ang),kick=Math.sin(t*9+a.ph);
        const P=(u,v)=>{const x=(u-.5)*L*dir,y=v*L;return [a.x+x*ca-y*sa,a.y+x*sa+y*ca]};
        const back=[],belly=[];
        for(let i=0;i<=10;i++){const u=i/10,y=spineY(u),h=thick(u);back.push(P(u,y-h*.45));belly.push(P(u,y+h*.55))}
        spline(body,[...back,...belly.slice().reverse()],true);
        for(let i=1;i<10;i++){const u=i/10,y=spineY(u),h=thick(u);seg.moveTo(...P(u,y-h*.45));seg.quadraticCurveTo(...P(u+.025,y),...P(u,y+h*.55))}
        // coxal plates: a skirt of rounded flaps under the front half
        for(let i=1;i<=4;i++){const u=.1+i*.1,y=spineY(u)+thick(u)*.55;seg.moveTo(...P(u-.045,y));seg.quadraticCurveTo(...P(u-.04,y+.1),...P(u+.03,y+.06))}
        // seven pairs of jointed legs, the back ones kicking
        for(let i=0;i<7;i++){const u=.14+i*.085,y=spineY(Math.min(u,.9))+thick(u)*.55+(i<4?.07:0),k=i>3?kick*.04:0,j=P(u-.02+k,y+.12),f=P(u-.09+k*1.5,y+.2);fine.moveTo(...P(u,y));fine.lineTo(...j);fine.lineTo(...f)}
        // antennae: one pair up and forward, one pair forward and down
        const h0=P(.02,spineY(.02)-.03);fine.moveTo(...h0);fine.quadraticCurveTo(...P(-.25,-.34),...P(-.55,-.3+kick*.02));
        fine.moveTo(...P(.03,spineY(.03)+.03));fine.quadraticCurveTo(...P(-.25,.02),...P(-.48,.14+kick*.02));
        // uropods at the tucked tail
        const tt=spineY(1);for(let i=-1;i<=1;i++){fine.moveTo(...P(.97,tt+.02));fine.lineTo(...P(1.05,tt+.07+i*.05))}
        const e=P(.07,spineY(.07)-.02);fine.moveTo(e[0]+L*.018,e[1]);fine.arc(e[0],e[1],L*.018,0,TAU);
      }
      ctx.fillStyle=C(235,215,190,.1);ctx.fill(body);ctx.strokeStyle=C(242,224,200,.75);ctx.lineWidth=.9;ctx.stroke(body);
      ctx.strokeStyle=C(235,215,190,.32);ctx.lineWidth=.55;ctx.stroke(seg);
      ctx.strokeStyle=C(235,215,190,.5);ctx.stroke(fine);
    }

    // A side-view body from two half-height profiles. u runs nose (0) to tail stock (u1); dir 1 faces left.
    profile(cx,cy,S,dir,top,bot,wave,u1,n=28){
      const P=(x,y)=>[cx+x*S*dir,cy+y*S],up=[],dn=[];
      for(let i=0;i<=n;i++){const u=i/n*u1,x=-1+2*u,c=wave(u);up.push(P(x,c-top(u)));dn.push(P(x,c+bot(u)))}
      return {P,up,dn};
    }
    // Cuvier's beaked whale. Huge next to everything else here, and mostly seen by the plankton it lights up.
    whale(cx,cy,S,t){
      const ctx=this.ctx,C=this.c.bind(this),k=u=>Math.pow(Math.sin(Math.PI*Math.min(1,u/.86)),.75),nose=u=>u<.07?.35+.65*u/.07:1;
      const top=u=>(k(u)*.25+.045*Math.exp(-(((u-.11)/.05)**2)))*nose(u),bot=u=>k(u)*.23*nose(u);
      const wave=u=>u>.45?Math.sin(t*1.5)*.08*(((u-.45)/.55)**2):0;
      const {P,up,dn}=this.profile(cx,cy,S,1,top,bot,wave,.86),wt=wave(1);
      const pts=[...up,P(.94,wt-.035),P(1.12,wt-.012),P(1.12,wt+.012),P(.94,wt+.035),...dn.slice().reverse()],o=new Path2D();spline(o,pts,true);
      ctx.fillStyle=C(26,34,40,.9);ctx.fill(o);ctx.strokeStyle=C(195,212,218,.55);ctx.lineWidth=1.2;ctx.stroke(o);
      const f=new Path2D();
      f.moveTo(...P(.32,wave(.66)-top(.66)));f.quadraticCurveTo(...P(.42,wave(.68)-top(.68)-.1),...P(.46,wave(.7)-top(.7)));
      f.moveTo(...P(-.5,bot(.25)));f.quadraticCurveTo(...P(-.42,bot(.25)+.12),...P(-.32,bot(.27)+.02));
      f.moveTo(...P(-1,.012));f.lineTo(...P(-.86,.035));
      // the long pale scars these whales carry
      for(let i=0;i<7;i++){const x=-.55+hash(i*9+1)*1.1,y=-.12+hash(i*9+2)*.22,l=.08+hash(i*9+3)*.12,a=-.3+hash(i*9+4)*.6;f.moveTo(...P(x,y));f.lineTo(...P(x+Math.cos(a)*l,y+Math.sin(a)*l))}
      ctx.strokeStyle=C(200,215,220,.3);ctx.lineWidth=.8;ctx.stroke(f);
      const e=P(-.79,-.03);ctx.beginPath();ctx.arc(e[0],e[1],Math.max(1.5,S*.012),0,TAU);ctx.fillStyle=C(220,230,232,.7);ctx.fill();
      return pts;
    }
    // Something bigger, answering the alarm. Shaped like a sleeper shark, left unnamed on purpose.
    predator(cx,cy,S,t,dir){
      const ctx=this.ctx,C=this.c.bind(this);
      const top=u=>(u<.12?.2*Math.sqrt(u/.12):.2)*Math.pow(Math.max(0,1-Math.max(0,u-.35)/.5),1.1)+.025;
      const bot=u=>(u<.12?.17*Math.sqrt(u/.12):.17)*Math.pow(Math.max(0,1-Math.max(0,u-.4)/.45),1.2)+.02;
      const wave=u=>Math.sin(u*4-t*3)*.015*u;
      const {P,up,dn}=this.profile(cx,cy,S,dir,top,bot,wave,.84),wt=wave(.84);
      const pts=[...up,P(.92,wt-.28),P(1.04,wt-.3),P(.96,wt+.02),P(.9,wt+.12),...dn.slice().reverse()],o=new Path2D();spline(o,pts,true);
      ctx.fillStyle=C(6,8,10,.96);ctx.fill(o);
      // its back catches the light from above, the belly stays black
      ctx.save();ctx.clip(o);const yb=Math.min(...up.map(p=>p[1])),fl=ctx.createLinearGradient(0,yb,0,yb+S*.32);fl.addColorStop(0,C(140,165,175,.32));fl.addColorStop(1,'rgba(140,165,175,0)');ctx.fillStyle=fl;ctx.fillRect(cx-S*1.3,yb,S*2.6,S*.4);ctx.restore();
      ctx.strokeStyle=C(190,210,220,.18);ctx.lineWidth=4;ctx.stroke(o);ctx.strokeStyle=C(195,215,225,.88);ctx.lineWidth=1.6;ctx.stroke(o);
      const f=new Path2D();
      for(const [u,hg] of [[.44,.11],[.62,.08]]){const x=-1+2*u,y=wave(u)-top(u);f.moveTo(...P(x-.06,y));f.quadraticCurveTo(...P(x+.02,y-hg),...P(x+.07,y-hg*.9));f.lineTo(...P(x+.06,y))}
      const py=wave(.26)+bot(.26);f.moveTo(...P(-.52,py));f.quadraticCurveTo(...P(-.38,py+.18),...P(-.28,py+.16));
      ctx.fillStyle=C(6,8,10,.96);ctx.fill(f);ctx.stroke(f);
      const e=P(-.82,-.04);ctx.beginPath();ctx.arc(e[0],e[1],Math.max(2,S*.02),0,TAU);ctx.fillStyle=C(120,170,160,.8);ctx.fill();
      return pts;
    }

    // The expedition's lander, a wire frame seen from three quarters. Straight lines on purpose: the only made thing down here.
    lander(x,y,H,t){
      const ctx=this.ctx,C=this.c.bind(this),yaw=-.3,pitch=.13,cw=Math.cos(yaw),sw=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
      const P=(a,b,c)=>{const x1=a*cw-c*sw,z1=a*sw+c*cw,y1=b*cp-z1*sp,z2=b*sp+z1*cp,pr=5/(5+z2);return [x+x1*H*pr,y+y1*H*pr,z2]};
      const near=new Path2D(),far=new Path2D(),edge=(a,b)=>{const p=a[2]+b[2]>0?far:near;p.moveTo(a[0],a[1]);p.lineTo(b[0],b[1])};
      const k=.26,lv=[-.4,-.62,-.96],cor=[[-1,-1],[1,-1],[1,1],[-1,1]];
      for(const yy of lv)for(let i=0;i<4;i++){const [a,b]=cor[i],[c,d]=cor[(i+1)%4];edge(P(a*k,yy,b*k),P(c*k,yy,d*k))}
      for(const [a,b] of cor){edge(P(a*k,-.4,b*k),P(a*k,-.96,b*k));edge(P(a*k,-.4,b*k),P(a*.34,0,b*.34));edge(P(a*.29,0,b*.34),P(a*.39,0,b*.34))}
      for(let i=0;i<4;i++){const [a,b]=cor[i],[c,d]=cor[(i+1)%4];edge(P(a*k,-.4,b*k),P(c*k,-.62,d*k))}
      const q=.1;for(const yy of [0,-.16])for(let i=0;i<4;i++){const [a,b]=cor[i],[c,d]=cor[(i+1)%4];edge(P(a*q,yy,b*q),P(c*q,yy,d*q))}
      for(const [a,b] of cor)edge(P(a*q,0,b*q),P(a*q,-.16,b*q));
      for(let i=1;i<4;i++)edge(P(-q+i*q/2,0,-q),P(-q+i*q/2,-.16,-q));
      // camera housing and the two lamps on the near face
      const cam=[P(-.08,-.69,-k-.01),P(.08,-.69,-k-.01),P(.08,-.79,-k-.01),P(-.08,-.79,-k-.01)];for(let i=0;i<4;i++)edge(cam[i],cam[(i+1)%4]);
      const lamps=[];for(const sx of [-1,1]){const a=P(sx*.2,-.47,-k-.02),b=P(sx*.2,-.42,-k-.06);edge(a,b);lamps.push([b[0],b[1]])}
      const bc=[P(.3,-.86,.12),P(.3,-1.06,.12)];edge(bc[0],bc[1]);const ant=P(.3,-1.14,.12);edge(bc[1],ant);
      ctx.save();ctx.lineCap='round';
      ctx.strokeStyle=C(200,205,198,.22);ctx.lineWidth=.8;ctx.stroke(far);
      ctx.strokeStyle=C(215,220,212,.1);ctx.lineWidth=3.2;ctx.stroke(near);
      ctx.strokeStyle=C(220,225,216,.82);ctx.lineWidth=1.2;ctx.stroke(near);
      const lc=P(-.08,-.74,-k-.01);ctx.beginPath();ctx.ellipse(lc[0],lc[1],H*.035,H*.03,0,0,TAU);ctx.moveTo(lc[0]+H*.018,lc[1]);ctx.ellipse(lc[0],lc[1],H*.018,H*.015,0,0,TAU);ctx.strokeStyle=C(220,225,216,.7);ctx.lineWidth=.9;ctx.stroke();
      // three syntactic-foam floats: spheres drawn the jellyfish way, latitude and longitude lines
      for(const fx of [-.17,0,.17]){
        const c=P(fx,-1.07,0),r=.1*H*(5/(5+c[2]));
        ctx.beginPath();ctx.arc(c[0],c[1],r,0,TAU);ctx.fillStyle=C(255,120,80,.18);ctx.fill();ctx.strokeStyle=C(255,145,105,.12);ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle=C(255,145,105,.85);ctx.lineWidth=1.1;ctx.stroke();
        ctx.save();ctx.beginPath();ctx.arc(c[0],c[1],r,0,TAU);ctx.clip();ctx.lineWidth=.6;
        for(let l=-2;l<=2;l++){const yy=l/3,rr=Math.sqrt(1-yy*yy);ctx.beginPath();ctx.ellipse(c[0],c[1]+yy*r*cp,r*rr,r*rr*sp*1.6,0,0,TAU);ctx.strokeStyle=C(255,170,135,l?.22:.35);ctx.stroke()}
        for(let m=0;m<4;m++){const a=m/4*Math.PI+t*.02+yaw;ctx.beginPath();ctx.ellipse(c[0],c[1],Math.abs(Math.cos(a))*r,r,0,0,TAU);ctx.strokeStyle=C(255,170,135,.2);ctx.stroke()}
        ctx.restore();
        ctx.beginPath();ctx.arc(c[0]-r*.3,c[1]-r*.3,r*.45,Math.PI*1.05,Math.PI*1.6);ctx.strokeStyle=C(255,225,205,.7);ctx.lineWidth=1;ctx.stroke();
      }
      ctx.restore();
      return {lamps,beacon:[ant[0],ant[1]],bait:[P(0,-.08,0)[0],P(0,-.08,0)[1]]};
    }

    // Sediment seen at a low angle, plus one sunken branch.
    floor(fy,w,h,t,branchX){
      const ctx=this.ctx,C=this.c.bind(this);
      ctx.fillStyle=C(16,14,12,.9);ctx.fillRect(0,fy,w,h-fy+2);
      const p=new Path2D();
      for(let i=0;i<16;i++){const z=i/15,y=fy+Math.pow(z,1.7)*(h-fy+30);for(let j=0;j<=40;j++){const x=j/40*w,yy=y+Math.sin(x*.011+i*1.7)*(1.2+z*3)+Math.sin(x*.031+i)*(.6+z);j?p.lineTo(x,yy):p.moveTo(x,yy)}}
      ctx.strokeStyle=C(205,195,175,.26);ctx.lineWidth=.7;ctx.stroke(p);
      ctx.beginPath();ctx.moveTo(0,fy);ctx.lineTo(w,fy);ctx.strokeStyle=C(205,195,175,.3);ctx.stroke();
      const b=new Path2D(),bx=branchX,by=fy+(h-fy)*.32;
      b.moveTo(bx-90,by+6);b.bezierCurveTo(bx-40,by-6,bx+30,by+10,bx+110,by-2);b.moveTo(bx-20,by+2);b.quadraticCurveTo(bx-6,by-26,bx+12,by-34);b.moveTo(bx+50,by+3);b.quadraticCurveTo(bx+70,by+18,bx+96,by+24);
      ctx.strokeStyle=C(200,170,130,.65);ctx.lineWidth=2;ctx.stroke(b);ctx.strokeStyle=C(230,205,170,.35);ctx.lineWidth=.6;ctx.stroke(b);
    }

    // Giant siphonophore, for the field guide: a stem of repeating units under two swimming bells.
    siphonophore(x,y,len,t,horizontal=true){
      const ctx=this.ctx,C=this.c.bind(this),pts=[];
      for(let i=0;i<=60;i++){const q=i/60;pts.push(horizontal?[x+q*len,y+Math.sin(q*6-t*1.3)*len*.03*q+Math.sin(q*2+t*.4)*len*.02]:[x+Math.sin(q*6-t*1.3)*len*.03*q,y+q*len])}
      const stem=new Path2D();spline(stem,pts,false);ctx.strokeStyle=C(150,225,215,.65);ctx.lineWidth=1.3;ctx.stroke(stem);
      const bells=new Path2D();for(const k of [-1,1]){const [bx,by]=pts[0];bells.ellipse(bx-len*.05,by+k*len*.034,len*.065,len*.04,k*.3,0,TAU);bells.ellipse(bx-len*.05,by+k*len*.034,len*.035,len*.02,k*.3,0,TAU)}
      ctx.fillStyle=C(150,225,215,.08);ctx.fill(bells);ctx.strokeStyle=C(170,235,225,.7);ctx.lineWidth=1;ctx.stroke(bells);
      const parts=new Path2D(),dots=[];
      for(let i=3;i<60;i+=2){const [px,py]=pts[i],tl=len*(.08+hash(i)*.08),sw=Math.sin(t*2+i)*3,ex=px-2+sw,ey=py+tl;parts.moveTo(px,py);parts.quadraticCurveTo(px+3,py+tl*.5,ex,ey);for(let k=1;k<4;k++){const q=k/4,qx=mix(px,ex,q),qy=mix(py,ey,q);parts.moveTo(qx,qy);parts.lineTo(qx+5+sw*.3,qy+4)}parts.moveTo(px+6,py-3);parts.ellipse(px+3,py-3,4,2.5,-.3,0,TAU);if(i%4===1)dots.push([px+3,py-3])}
      ctx.strokeStyle=C(150,225,215,.35);ctx.lineWidth=.6;ctx.stroke(parts);
      ctx.fillStyle=C(255,150,110,.7);for(const [dx,dy] of dots){ctx.beginPath();ctx.arc(dx,dy,1.6,0,TAU);ctx.fill()}
    }

    // Astra's sonar rings, used here as the hydrophone's view.
    sonarField(x,y,r,t,alpha,tuning){
      const c=this.ctx;c.save();c.globalAlpha=alpha*this.k;c.strokeStyle='rgba(160,220,204,.16)';c.lineWidth=.6;
      for(let j=1;j<=5;j++){c.beginPath();c.ellipse(x,y,r*j/5,r*j/5*.76,-.17,0,TAU);c.stroke()}
      c.translate(x,y);c.rotate(-.17);
      for(let k=0;k<96;k++){const a=k/96*TAU,rr=r*(1+Math.sin(a*8+t*(.8+tuning))*tuning*.028),long=k%8===0;c.beginPath();c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr*.76);c.lineTo(Math.cos(a)*(rr+(long?9:3)),Math.sin(a)*(rr+(long?9:3))*.76);c.strokeStyle=rgba(126,208,193,long?.55:.22);c.stroke()}
      const a=t*.28;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*r,Math.sin(a)*r*.76);c.strokeStyle='rgba(176,234,209,.3)';c.stroke();c.restore();
    }
  }

  const floorOn=(s,lift,h)=>s>6.55&&lift<h*1.4;
  class OceanScene{
    constructor(canvas,opt={}){
      this.canvas=canvas;this.opt=opt;this.ctx=canvas.getContext('2d',{alpha:false});
      this.layer=document.createElement('canvas');this.lctx=this.layer.getContext('2d');
      this.map=document.createElement('canvas');this.mctx=this.map.getContext('2d');
      this.ink=new Ink(this.ctx);this.inkL=new Ink(this.lctx);
      this.pulses=[];this.alarms=[];this.hot={};this.alarmed=false;
      this.snow=Array.from({length:190},(_,i)=>({x:hash(i*3),y:hash(i*3+1),z:.25+hash(i*3+2),size:.4+hash(i+900)*1.6}));
      this.sparks=Array.from({length:70},(_,i)=>({x:hash(i*5+7),y:hash(i*5+8),z:.3+hash(i*5+9)*.7,rate:.25+hash(i*5+10)*.6,ph:hash(i*5+11)*TAU,col:hash(i*13)>.25?[110,215,255]:[120,255,200]}));
      this.far=Array.from({length:150},(_,i)=>({x:hash(i*7+300),y:hash(i*7+301),z:hash(i*7+302)}));
      this.near=Array.from({length:16},(_,i)=>({x:hash(i*11+500),y:hash(i*11+501),r:7+hash(i*11+502)*18,a:.5+hash(i*11+503)*.5,sp:.7+hash(i*11+504)*.6}));
      this.bugs=Array.from({length:46},(_,i)=>({r:hash(i*7+1),w:(.25+hash(i*7+2)*.55)*(hash(i*7+3)>.5?1:-1),ph:hash(i*7+4)*TAU,L:8+hash(i*7+5)*11,yb:hash(i*7+6)}));
      this.last=null;this.resize();
    }
    resize(){
      const o=this.opt;this.w=o.width||this.canvas.clientWidth;this.h=o.height||this.canvas.clientHeight;
      this.dpr=o.dpr||Math.min(devicePixelRatio||1,this.w<700?1.6:1.5);
      for(const c of [this.canvas,this.layer]){c.width=Math.round(this.w*this.dpr);c.height=Math.round(this.h*this.dpr)}
      this.map.width=Math.ceil(this.w/6);this.map.height=Math.ceil(this.h/6);
      this.ink.w=this.inkL.w=this.w;
      if(this.last)this.render(this.last);
    }
    ping(t,x=.66,y=.5){this.pulses.push({t,x,y});if(this.pulses.length>6)this.pulses.shift()}
    alarm(t){this.alarms.push(t);if(this.alarms.length>4)this.alarms.shift();this.alarmed=true}

    // State in, frame out. s: section coordinate (0 hero, 1 sunlight ... 7 bottom, 8+ after the bottom).
    render(st){
      this.last=st;
      const {t,s,depth,pointer={x:0,y:0},scan=false,frequency=174,lift=0,card=false}=st,ctx=this.ctx,w=this.w,h=this.h,m=w<700;if(!w||!h)return;
      const tuning=Math.exp(-Math.pow((frequency-232)/28,2));
      this.ink.pulses=this.inkL.pulses=this.pulses;
      ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      const amb=ambAt(depth),dark=smooth(500,1100,depth),landerOn=smooth(6.82,7.12,s)*(floorOn(s,lift,h)?1:0);
      const torch=st.torch&&dark>.01&&s<8.05?{x:st.torch.x*w,y:st.torch.y*h,a:dark*(1-smooth(7.1,7.5,s)*.6)*(1-smooth(7.8,8.05,s))}:null;
      const R=m?w*.46:Math.min(w,h)*.32;
      this.landerGeo=floorOn(s,lift,h)?this.landerGeo:null;

      // water
      const lg=Math.log10(1+Math.max(0,depth)),bg=ctx.createLinearGradient(0,0,w*.35,h);
      const top=[mix(16,4,smooth(0,2.4,lg)),mix(66,20,smooth(0,2.4,lg)),mix(74,42,smooth(1.4,2.5,lg))].map((v,i)=>mix(v,[2,7,12][i],smooth(2.4,3.1,lg)));
      const bot=[mix(4,2,smooth(0,2.5,lg)),mix(22,9,smooth(0,2.5,lg)),mix(30,20,smooth(0,2.5,lg))].map((v,i)=>mix(v,[1,4,8][i],smooth(2.5,3.1,lg)));
      bg.addColorStop(0,rgba(...top));bg.addColorStop(1,rgba(...bot));ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      if(depth<260)this.rays(depth,t,amb);
      if(s<1.7)this.snell(s,t);
      this.drawFar(s,depth,t,pointer,amb);this.school(s,depth,t,pointer,amb);

      // which drawing lives where on the way down
      const hero=s<2.2,twi=s>1.7&&s<3.3,atolla=s>2.85&&s<4.2,angler=s>3.85&&s<5.2,abyss=s>4.85&&s<6.15,snail=s>5.8&&s<7.15,floor=s>6.55&&lift<h*1.4;
      const useLayer=!!torch||landerOn>.01;
      const ink=useLayer?this.inkL:this.ink;
      if(useLayer){this.lctx.setTransform(1,0,0,1,0,0);this.lctx.clearRect(0,0,this.layer.width,this.layer.height);this.lctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.lctx.globalCompositeOperation='source-over'}
      const T=tintAt(depth),lit=Math.max(torch?torch.a:0,landerOn),warm=[1,.9,.76];
      ink.T=T.map((v,i)=>mix(mix(v,1,torch?torch.a:0),warm[i],landerOn));ink.k=useLayer?1:amb;

      this.drawSnow(s,depth,t,pointer,amb,torch,R,landerOn);
      this.hot={};
      // the whale passes once you cross ~850 m (app sets whaleAt), behind everything else
      const wa=st.whaleAt==null?-1:t-st.whaleAt;this.whaleGeo=null;
      if(wa>=0&&wa<9&&s>2.3&&s<4.4){const p=wa/9,S=m?w*.8:w*.5,x=mix(w+S*1.2,-S*1.3,p),y=h*(.3+p*.18)-(s-3)*h*.25;this.whaleGeo={pts:ink.whale(x,y,S,t),a:smooth(0,1,wa)*(1-smooth(8,9,wa))}}
      if(hero){
        let x=m?w*.64:w*.72,y=(m?h*.8:h*.43)-Math.min(s,1)*h*.03-Math.max(0,s-1.15)*h*(m?.6:.62),size=m?w*.34:Math.min(w*.22,h*.27);
        x+=pointer.x*(m?12:23)+Math.sin(t*.47)*9;y+=pointer.y*12+Math.sin(t*.68)*7;
        ink.jelly(x,y,size,.1+Math.sin(t*.22)*.13,t,1,[250,155,111],false,pointer);
      }
      if(atolla){
        const x=(m?w*.6:w*.66)+pointer.x*10+Math.sin(t*.3)*8,y=h*((m?.58:.47)+(3.5-s)*.62)+Math.sin(t*.5)*6,r=m?w*.2:Math.min(w*.12,h*.17);
        this.hot.atolla={x,y:y+r*.1,r:r*1.15};this.rim=ink.atolla(x,y,r,t,pointer);
        // a second after the alarm, something bigger crosses the light
        const tA=this.alarms.length?this.alarms[this.alarms.length-1]:null,pa=tA==null?-1:t-tA-.9;this.predGeo=null;
        if(pa>=0&&pa<3.4){const p=pa/3.4,S=m?w*.66:w*.44,px=mix(-S*1.2,w+S*1.2,p),py=y-r*.25+Math.sin(p*Math.PI)*r*.15;this.predGeo=ink.predator(px,py,S,t,-1)}
      }else this.predGeo=null;
      if(angler){
        const x=(m?w*.5:w*.47)+Math.sin(t*.21)*w*.012,y=h*((m?.6:.47)+(4.5-s)*.55)+Math.sin(t*.37)*8,S=m?w*.36:Math.min(w*.2,h*.3);
        const near=torch?torch.a*(1-smooth(S*.5,S*1.6,Math.hypot(torch.x-x,torch.y-y))):0;
        this.hot.angler={x,y,r:S,near};this.anglerGeo=ink.angler(x,y,S,t,.12+.55*near);
      }
      if(snail){
        const x=(m?w*.5:w*.3)+Math.sin(t*.25)*w*.015,y=h*((m?.66:.5)+(6.47-s)*.6)+Math.sin(t*.4)*6,S=m?w*.34:Math.min(w*.15,h*.22);
        this.hot.snail={x,y,r:S};ink.snailfish(x,y,S,t);
      }
      let lamps=null;
      if(floor){
        const fy=h*(card?.8:.86)+Math.max(0,7.25-s)*h*1.25-lift,H=card?h*.36:m?h*.26:h*.3,lx=card?w*.5:m?w*.56:w*.5;
        this.H=H;
        ink.floor(fy,w,h,t,lx+H*.85);
        const g=ink.lander(lx,fy,H,t);lamps=g.lamps;this.landerGeo=g;
        if(s<9.3){const bait=g.bait,list=this.bugs.map((b,i)=>{const rr=(18+b.r*150)*(H/320),a=b.ph+t*b.w,x=bait[0]+Math.cos(a)*rr,y=bait[1]-H*.05+Math.sin(a)*rr*.4+Math.sin(t*1.3+i)*5-b.yb*H*.12;return {x,y,L:b.L*(H/320),ang:Math.sin(a)*.25*Math.sign(b.w),dir:Math.cos(a)*b.w>0?-1:1,ph:b.ph}});ink.amphipods(list,t)}
        this.hot.bottom={x:lx,y:fy-H*.5,r:H*.6};
      }
      if(useLayer){
        const mc=this.mctx,k=6;mc.setTransform(1,0,0,1,0,0);mc.globalCompositeOperation='copy';mc.fillStyle=`rgba(0,0,0,${amb.toFixed(3)})`;mc.fillRect(0,0,this.map.width,this.map.height);mc.globalCompositeOperation='lighter';
        const light=(x,y,r,a,inner=0)=>{const g=mc.createRadialGradient(x/k,y/k,inner/k,x/k,y/k,r/k);g.addColorStop(0,`rgba(0,0,0,${clamp(a).toFixed(3)})`);g.addColorStop(.5,`rgba(0,0,0,${clamp(a*.6).toFixed(3)})`);g.addColorStop(1,'rgba(0,0,0,0)');mc.fillStyle=g;mc.fillRect(0,0,this.map.width,this.map.height)};
        if(torch)light(torch.x,torch.y,R,torch.a*1.1);
        if(lamps&&landerOn>.01){const H=this.H;for(const [lx,ly] of lamps)light(lx,ly+H*.25,H*1.15,landerOn*.8);light(lamps[0][0]*.5+lamps[1][0]*.5,lamps[0][1]-H*.4,H*.9,landerOn*.55)}
        for(const p of this.pulses){const age=t-p.t;if(age<0||age>3)continue;const rr=age*Math.max(w,h)*.47,g=mc.createRadialGradient(p.x*w/k,p.y*h/k,Math.max(0,rr-50)/k,p.x*w/k,p.y*h/k,(rr+50)/k);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.5,`rgba(0,0,0,${(.5*(1-age/3)).toFixed(3)})`);g.addColorStop(1,'rgba(0,0,0,0)');mc.fillStyle=g;mc.fillRect(0,0,this.map.width,this.map.height)}
        const l=this.lctx;l.setTransform(1,0,0,1,0,0);l.globalCompositeOperation='destination-in';l.imageSmoothingEnabled=true;l.drawImage(this.map,0,0,this.layer.width,this.layer.height);
        ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(this.layer,0,0);ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      }

      // light that animals make themselves, never tinted, never masked
      const self=this.ink;self.T=[1,1,1];self.k=1;
      this.farJellies(s,t);
      if(this.whaleGeo){const {pts,a}=this.whaleGeo,n=pts.length,c=this.ctx,o=new Path2D();spline(o,pts,true);c.strokeStyle=`rgba(110,215,255,${(.34*a).toFixed(3)})`;c.lineWidth=1.6;c.stroke(o);
        for(let i=0;i<n;i++){const u=i<29?i/28:Math.max(0,(n-1-i)/28),f=(.15+.85*Math.pow(Math.max(0,Math.sin(t*5+hash(i*3.7)*TAU)),10))*(1.15-.6*u);self.glow(pts[i][0],pts[i][1],5+f*11,[110,215,255],f*a)}const tl=pts[Math.floor(pts.length/2)];for(let k=1;k<14;k++){const f=Math.pow(Math.max(0,Math.sin(t*4-k*.6+hash(k)*3)),10)*(1-k/14);if(f>.05)self.glow(tl[0]+k*w*.025,tl[1]+Math.sin(k*1.7+t)*10,4+f*6,[120,240,220],f*a)}}
      if(twi){
        const x=m?w*.5:w*.34,y=h*((m?.68:.52)+(2.5-s)*(m?.9:.75)),size=m?w*.3:Math.min(w*.17,h*.21),ang=.15+Math.sin(t*.22)*.13;
        self.jelly(x+pointer.x*16,y+pointer.y*10,size,ang,t,1,[120,200,235],scan,pointer);
        self.jelly(x-(m?w*.3:w*.16),y+(m?-h*.2:h*.24),size*.42,ang-.2,t+3.2,.75,[104,230,210],scan,pointer);
        self.jelly(x+(m?w*.3:w*.13),y-(m?h*.31:h*.26),size*.3,ang+.25,t+5.1,.6,[145,187,243],scan,pointer);
      }
      this.drawSparks(s,depth,t);
      if(atolla&&this.rim)this.drawAlarm(t);
      if(this.predGeo&&this.hot.atolla){const a=this.hot.atolla,pts=this.predGeo;for(let i=0;i<pts.length;i+=2){const f=1-smooth(a.r*.6,a.r*1.8,Math.hypot(pts[i][0]-a.x,pts[i][1]-a.y));if(f>.05)self.glow(pts[i][0],pts[i][1],3+f*5,[90,165,255],f*.6)}}
      if(angler&&this.anglerGeo){const [lx,ly]=this.anglerGeo.lure,f=.75+.25*Math.sin(t*2.1)+.15*Math.sin(t*5.3),[rb,rc]=this.anglerGeo.rod,q=(a,b,c,u)=>(1-u)*(1-u)*a+2*(1-u)*u*b+u*u*c,c=this.ctx;c.beginPath();for(let i=0;i<=12;i++){const u=.55+i/12*.45,x=q(rb[0],rc[0],lx,u),y=q(rb[1],rc[1],ly,u);i?c.lineTo(x,y):c.moveTo(x,y)}c.strokeStyle=`rgba(170,225,240,${(.45*f).toFixed(3)})`;c.lineWidth=1.1;c.stroke();self.glow(lx,ly,(m?40:56)*f,[150,230,255],.85);self.glow(lx,ly,8,[235,250,255],1)}
      if(abyss){const vis=smooth(4.85,5.15,s)*(1-smooth(5.85,6.15,s)),x=m?w*.62:w*.68,y=h*(m?.74:.52),r=Math.min(w,h)*(m?.34:.3);self.sonarField(x,y,r,t,vis,tuning);if(tuning>.86){const age=(t%2.4)/2.4,rr=r*.15+age*r*.9;const c=this.ctx;c.save();c.globalAlpha=vis*(1-age);c.strokeStyle='rgba(255,170,130,.8)';c.lineWidth=1.2;c.beginPath();c.ellipse(x,y+r*.55,rr,rr*.3,0,0,TAU);c.stroke();c.restore();self.glow(x,y+r*.55,14,[255,170,130],vis)}}
      if(lamps&&landerOn>.01){
        for(const [lx,ly] of lamps){self.glow(lx,ly,(m?26:34),[255,214,170],landerOn);self.glow(lx,ly,6,[255,245,230],landerOn)}
        const H=this.H,c=this.ctx;c.save();c.globalCompositeOperation='screen';for(const [lx,ly] of lamps){const g=c.createLinearGradient(lx,ly,lx,ly+H*.5);g.addColorStop(0,`rgba(255,205,160,${(.07*landerOn).toFixed(3)})`);g.addColorStop(1,'rgba(255,205,160,0)');c.fillStyle=g;c.beginPath();c.moveTo(lx-6,ly);c.lineTo(lx+6,ly);c.lineTo(lx+H*.3,ly+H*.45);c.lineTo(lx-H*.3,ly+H*.45);c.closePath();c.fill()}c.restore();
        const [bx,by]=this.landerGeo.beacon,blink=Math.pow(Math.max(0,Math.sin(t*2.2)),30);self.glow(bx,by,18,[255,150,110],blink*landerOn);
      }
      if(torch){const c=this.ctx,g=c.createRadialGradient(torch.x,torch.y,0,torch.x,torch.y,R*1.1);g.addColorStop(0,`rgba(150,190,205,${(.07*torch.a).toFixed(3)})`);g.addColorStop(1,'rgba(150,190,205,0)');c.fillStyle=g;c.fillRect(torch.x-R*1.1,torch.y-R*1.1,R*2.2,R*2.2)}
      this.drawNear(s,depth,t,pointer,amb,torch,R,landerOn);
      for(const pulse of this.pulses){
        const age=t-pulse.t;if(age<0||age>3.5)continue;const rr=age*Math.max(w,h)*.47;
        ctx.save();ctx.globalCompositeOperation='screen';for(let k=0;k<3;k++){ctx.beginPath();ctx.ellipse(pulse.x*w,pulse.y*h,Math.max(1,rr-k*12),Math.max(1,(rr-k*12)*.65),0,0,TAU);ctx.strokeStyle=rgba(123,229,218,(1-age/3.5)*(.22-k*.065));ctx.lineWidth=k===0?1.5:.6;ctx.stroke()}ctx.restore();
      }
    }

    rays(depth,t,amb){
      const ctx=this.ctx,w=this.w,h=this.h,k=(1-smooth(0,240,depth))*.85,T=tintAt(depth);if(k<.005)return;
      ctx.save();ctx.globalCompositeOperation='screen';
      for(let i=0;i<9;i++){
        const x=w*(.29+i*.08)+Math.sin(t*.12+i)*w*.03,g=ctx.createLinearGradient(x,0,x-w*.3,h);
        g.addColorStop(0,rgba(109*T[0]+40,189*T[1],170*T[2],k*(.035+hash(i)*.04)));g.addColorStop(.7,rgba(47,106*T[1],110*T[2],k*.018));g.addColorStop(1,'rgba(8,34,42,0)');
        ctx.beginPath();ctx.moveTo(x,-20);ctx.lineTo(x+w*.05,-20);ctx.lineTo(x-w*.24,h);ctx.lineTo(x-w*.65,h);ctx.closePath();ctx.fillStyle=g;ctx.fill();
      }
      const light=ctx.createRadialGradient(w*.66,-h*.12,0,w*.66,-h*.12,w*.75);light.addColorStop(0,rgba(110,204*T[1],172*T[2],k*.24));light.addColorStop(1,'rgba(0,38,48,0)');ctx.fillStyle=light;ctx.fillRect(0,0,w,h);ctx.restore();
    }
    // Snell's window: from under water the whole sky is squeezed into a ~97 degree circle overhead, edge rippling.
    snell(s,t){
      const ctx=this.ctx,w=this.w,h=this.h,m=w<700,a=1-smooth(.5,1.6,s);if(a<.01)return;
      const cx=w*(m?.55:.6),cy=-h*.04-Math.max(0,s-.5)*h*.6,rx=w*(m?.9:.6),ry=h*(m?.17:.22);
      const edge=k=>{const p=[];for(let i=0;i<=96;i++){const an=i/96*TAU,r=1+.022*Math.sin(an*13+t*1.1)+.012*Math.sin(an*29-t*1.7)+k;p.push([cx+Math.cos(an)*rx*r,cy+Math.sin(an)*ry*r])}return p};
      const path=pts=>{const p=new Path2D();pts.forEach((q,i)=>i?p.lineTo(...q):p.moveTo(...q));p.closePath();return p};
      ctx.save();ctx.globalAlpha=a;
      const win=path(edge(0)),g=ctx.createRadialGradient(cx+rx*.12,cy,0,cx,cy,Math.max(rx,ry));
      g.addColorStop(0,'rgba(225,248,240,.42)');g.addColorStop(.6,'rgba(150,215,205,.2)');g.addColorStop(1,'rgba(90,170,170,.1)');ctx.fillStyle=g;ctx.fill(win);
      // caustics: wavy lines out of phase, so they cross into a net instead of a grid
      ctx.save();ctx.clip(win);ctx.strokeStyle='rgba(230,250,245,.1)';ctx.lineWidth=1;
      for(let j=0;j<18;j++){ctx.beginPath();const ph=hash(j+70)*TAU;for(let i=0;i<=36;i++){const u=i/36,x=cx-rx+u*rx*2,y=cy-ry*.2+j/17*ry*1.25+Math.sin(u*11+ph+t*.8)*ry*.13+Math.sin(u*27-t*1.3+j)*ry*.03;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}
      ctx.restore();
      for(const [k,al,lw] of [[0,.55,1.2],[.03,.18,.6],[-.035,.14,.6]]){ctx.strokeStyle=`rgba(225,250,245,${al})`;ctx.lineWidth=lw;ctx.stroke(path(edge(k)))}
      const sx=cx+rx*.18,sy=cy+ry*.3,sg=ctx.createRadialGradient(sx,sy,0,sx,sy,ry*.7);sg.addColorStop(0,'rgba(255,255,240,.5)');sg.addColorStop(1,'rgba(255,255,240,0)');ctx.fillStyle=sg;ctx.fillRect(sx-ry,sy-ry,ry*2,ry*2);
      ctx.restore();
    }
    // Far snow: tiny, slow, never touched by your lamp. Depth starts here.
    drawFar(s,depth,t,pointer,amb){
      if(amb<.02)return;const ctx=this.ctx,w=this.w,h=this.h,T=tintAt(depth);
      ctx.fillStyle=rgba(140*T[0]+50,200*T[1],200*T[2],1);
      for(let i=0;i<this.far.length;i++){const q=this.far[i],x=((q.x*w+Math.sin(t*.05+i)*6+pointer.x*3)%w+w)%w,y=((q.y*h+t*1.4-s*h*.38)%h+h)%h;ctx.globalAlpha=amb*(.06+q.z*.1);ctx.fillRect(x,y,1+q.z,1+q.z)}
      ctx.globalAlpha=1;
    }
    // A bait ball far off near the surface.
    school(s,depth,t,pointer,amb){
      const k=smooth(.3,.9,s)*(1-smooth(1.8,2.3,s));if(k<.01||amb<.05)return;
      const ctx=this.ctx,w=this.w,h=this.h,m=w<700,T=tintAt(depth),cx=w*(m?.3:.22)-pointer.x*6+Math.sin(t*.13)*w*.03,cy=h*(m?.66:.8)-(s-1.2)*h*.35,R=m?w*.14:w*.065,p=new Path2D();
      for(let i=0;i<70;i++){const r=R*Math.sqrt(hash(i*5+1))*(1+.15*Math.sin(t*.7+i)),a=hash(i*5+2)*TAU+t*(.35+hash(i*5+3)*.15),x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.45+Math.sin(t+i)*2,dx=-Math.sin(a),dy=Math.cos(a)*.45,l=Math.hypot(dx,dy)||1,ux=dx/l*4.5,uy=dy/l*4.5;p.moveTo(x-ux,y-uy);p.lineTo(x+ux,y+uy);p.moveTo(x-ux,y-uy);p.lineTo(x-ux*1.5-uy*.6,y-uy*1.5+ux*.6)}
      ctx.strokeStyle=rgba(170*T[0]+40,215*T[1],210*T[2],k*amb*.45);ctx.lineWidth=1;ctx.stroke(p);
    }
    // Small jellies far behind the twilight group, glowing faintly.
    farJellies(s,t){
      const k=smooth(1.9,2.3,s)*(1-smooth(2.9,3.3,s));if(k<.01)return;
      const c=this.ctx,w=this.w,h=this.h,m=w<700;c.lineWidth=.8;
      for(let i=0;i<4;i++){
        const x=w*(.18+i*.22+hash(i+40)*.08),y=((hash(i+41)*h*1.2+t*3-s*h*.5)%(h*1.2)+h*1.2)%(h*1.2)-h*.1,r=(m?7:9)+hash(i+42)*6;
        this.ink.glow(x,y,r*3.2,[120,200,235],k*.18);c.strokeStyle=rgba(150,215,240,k*.35);c.beginPath();c.arc(x,y,r,Math.PI,TAU);
        for(let j=0;j<5;j++){const bx=x-r+j*r/2;c.moveTo(bx,y);c.quadraticCurveTo(bx+Math.sin(t+j)*3,y+r*1.5,bx+Math.sin(t*.8+j)*4,y+r*3)}c.stroke();
      }
    }
    // Snow right in front of the lens: big, soft, fast. It is what makes everything else look far away.
    drawNear(s,depth,t,pointer,amb,torch,R,landerOn){
      const w=this.w,h=this.h,T=tintAt(depth),lamps=this.landerGeo&&landerOn>.01?this.landerGeo.lamps:null,c=this.ctx;
      for(let i=0;i<this.near.length;i++){
        const q=this.near[i],W=w+160,H=h+260,x=((q.x*W-pointer.x*36*q.sp+Math.sin(t*.1+i)*20)%W+W)%W-80,y=((q.y*H+t*9*q.sp-s*h*2.6*q.sp)%H+H)%H-130;
        let L=amb*.1*q.a;
        if(torch)L+=torch.a*.16*q.a*(1-smooth(R*.3,R*1.3,Math.hypot(x-torch.x,y-torch.y)));
        if(lamps)for(const [lx,ly] of lamps)L+=landerOn*.12*q.a*(1-smooth(0,320,Math.hypot(x-lx,y-ly)));
        if(L<.008)continue;
        const col=torch||lamps?[215,225,225]:[Math.round(150*T[0]+60),Math.round(210*T[1]),Math.round(215*T[2])];
        c.globalAlpha=clamp(L);c.drawImage(bokehOf(col),x-q.r,y-q.r,q.r*2,q.r*2);
      }
      c.globalAlpha=1;
    }
    // Marine snow. Seen by sunlight near the top, by your lamp and the lander's lamps further down.
    drawSnow(s,depth,t,pointer,amb,torch,R,landerOn){
      const ctx=this.ctx,w=this.w,h=this.h,T=tintAt(depth),lamps=this.landerGeo&&landerOn>.01?this.landerGeo.lamps:null;
      for(const q of this.snow){
        const x=((q.x*w+Math.sin(t*.08+q.y*10)*17+pointer.x*q.z*14)%w+w)%w;
        const y=((q.y*h+t*(3+q.z*5)-s*h*(.7+q.z*1.3))%h+h)%h;
        let L=amb*(.08+q.z*.19);
        if(torch){const d=Math.hypot(x-torch.x,y-torch.y);L+=torch.a*.55*(1-smooth(0,R,d))}
        if(lamps){for(const [lx,ly] of lamps){const d=Math.hypot(x-lx,y-ly-40);L+=landerOn*.4*(1-smooth(0,260,d))}}
        if(L<.012)continue;
        const c=torch||lamps?[205,215,215]:[124*T[0]+40,191*T[1],191*T[2]];
        ctx.fillStyle=rgba(...c,L);ctx.beginPath();ctx.ellipse(x,y,q.size,q.size*1.25,0,0,TAU);ctx.fill();
      }
    }
    // Bioluminescent sparks: short blinks, more of them from the twilight zone down.
    drawSparks(s,depth,t){
      const density=smooth(180,600,depth)*(1-.65*smooth(5000,9000,depth))*(1-smooth(7.6,8.4,s)*.7);if(density<.01)return;
      const ctx=this.ctx,w=this.w,h=this.h,n=Math.round(this.sparks.length*density);
      for(let i=0;i<n;i++){
        const q=this.sparks[i],x=((q.x*w+Math.sin(t*.1+i)*20)%w+w)%w,y=((q.y*h+t*2-s*h*(.6+q.z))%h+h)%h;
        const f=Math.pow(Math.max(0,Math.sin(t*q.rate+q.ph)),22);if(f<.02)continue;
        this.ink.glow(x,y,4+q.z*10,q.col,f*.9);
      }
    }
    // Atolla's burglar alarm: blue light runs around the rim in a pinwheel, for a few seconds.
    drawAlarm(t){
      const rim=this.rim,n=rim.length;let any=false;
      for(const t0 of this.alarms){
        const age=t-t0;if(age<0||age>4.2)continue;any=true;
        const env=smooth(0,.15,age)*(1-smooth(2.8,4.2,age));
        for(let i=0;i<n;i++){
          for(let arm=0;arm<3;arm++){
            const head=(age*1.6+arm/3)%1,d=((i/n-head)%1+1)%1,f=Math.exp(-d*d*90)+Math.exp(-(1-d)*(1-d)*90);
            if(f>.03)this.ink.glow(rim[i].x,rim[i].y,6+f*14,[90,165,255],env*f);
          }
        }
      }
      return any;
    }
    // A postcard of the bottom, drawn by its own scene at print size.
    static postcard(W,H,t){
      const c=document.createElement('canvas'),sc=new OceanScene(c,{width:W,height:H,dpr:1});
      sc.render({t,s:7.55,depth:10935,pointer:{x:0,y:0},card:true});return c;
    }
    static ink(ctx){const k=new Ink(ctx);return k}
  }
  window.OceanScene=OceanScene;
  window.HadalLight={ambAt,tintAt,sunAt};
})();

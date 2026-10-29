/* ASCII Ghost 2.0.0 - Ship Notes / aqualang89. MIT. */
(() => {
"use strict";
const TAU=Math.PI*2, clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453123;return x-Math.floor(x)};

const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10)};
const vertex=String.raw`#version 300 es
precision highp float;
const float TAU=6.28318530718;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 aData;
layout(location=3) in vec2 aMotion;
layout(location=4) in vec4 aHome;
layout(location=5) in vec4 aTravel;
uniform float uTime,uYaw,uAspect,uZoom,uReturnAge,uEye;
uniform vec2 uViewport,uCenter,uGaze;
out vec2 vUV;
out vec3 vColor;
out float vOpacity;
flat out float vGlyph;
float hash(float n){return fract(sin(n*127.1+311.7)*43758.5453);}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float pulse(float age){return exp(-age*6.5)*sin(age*22.0);}
void main(){
 vec2 corners[6]=vec2[6](vec2(-.5,-.5),vec2(.5,-.5),vec2(-.5,.5),vec2(-.5,.5),vec2(.5,-.5),vec2(.5,.5));
 vec2 q=corners[gl_VertexID];vUV=q+0.5;
 vec3 p=aPosition,n=aNormal;
 float seed=aData.x,layer=aData.y,group=aData.w;
 float period=.68+hash(group+3.0)*1.02;
 float age=mod(uTime+hash(group)*period,period);
 float beat=exp(-age*5.5)*sin(age*19.0);
 float patchActive=1.0-smoothstep(.13,.44,age);
 float localCycle=floor(uTime*(4.0+hash(group+9.0)*7.0)+hash(group+5.0)*17.0);
 float phase=hash(group+1.0)*TAU;
 float regionalSize=aMotion.y;
 // Each warped Voronoi island has its own rhythm, direction and amount of separation.
 vec3 direction=vec3((hash(group+2.0)-.5)*1.35,(hash(group+4.0)-.5)*.9,(hash(group+8.0)-.28)*1.4);
 float separation=(.038+.105*pow(hash(group+6.0),1.8))*regionalSize;
 p+=direction*beat*separation;
 p+=vec3(sin(uTime*(3.1+hash(group)*2.4)+phase),
         cos(uTime*4.3+phase)*.55,
         sin(uTime*3.7+phase*2.0))*(.004+.006*regionalSize);
 // Individual letters fray the boundary of each island and keep its contour uneven.
 float fringe=aMotion.x;
 p+=vec3(sin(uTime*13.0+seed*53.0),
         sin(uTime*11.0+seed*91.0)*.68,
         cos(uTime*12.0+seed*73.0))*(.0018+fringe*.009)*( .35+patchActive*.65);
 float lower=1.0-smoothstep(-.35,.65,p.y);
 p.x+=sin(p.y*3.1+uTime*2.3+p.z*2.0)*.026*lower;
 p.z+=sin(p.y*4.0-uTime*2.1+p.x*3.0)*.042*lower;
 p.y+=sin(uTime*2.0)*.032;


 // Drifting fragments keep the broken contour spatial, including off-silhouette pieces.
 if(layer>2.5){
  p+=vec3(sin(seed*TAU+uTime*1.4),cos(seed*32.0+uTime)*.3,cos(seed*TAU+uTime*1.4))*.12;
 }
 p.xz=rot(uYaw)*p.xz;n.xz=rot(uYaw)*n.xz;
 p.yz=rot(-.065)*p.yz;n.yz=rot(-.065)*n.yz;
 p.xy=rot(-.024+sin(uTime*.8)*.014)*p.xy;
 float distance=5.6-p.z;
 float focal=3.14*uZoom;
 float size=(.034+seed*.004)*(layer<.5?1.0:.90);
 float twirl=beat*.13+(layer>2.5?sin(seed*44.0+uTime)*.24:0.0);
 vec2 offset=rot(twirl)*(q*vec2(size,size*1.46));
 gl_Position=vec4((p.x+offset.x)*focal/uAspect,(p.y+offset.y+.02)*focal,
 ((30.0+.1)/(30.0-.1))*distance-2.0*30.0*.1/(30.0-.1),distance);
 float light=max(0.0,dot(normalize(n),normalize(vec3(-.6,.65,1.0))));
 float rim=pow(1.0-abs(n.z),3.0);
 vec3 ice=vec3(.86,.99,1.0),cyan=vec3(.08,.79,.87),violet=vec3(.49,.34,.85);
 float depth=clamp((aPosition.z+.62)/1.24,0.0,1.0);
 vec3 surface=mix(violet,cyan,smoothstep(.12,.60,depth));
 surface=mix(surface,ice,smoothstep(.55,.95,depth));
 vec3 inner=mix(violet,cyan,smoothstep(.05,.85,depth));
 vColor=mix(surface,inner,clamp(layer,0.0,1.0));
 vColor*=.27+light*.76+rim*.14+patchActive*.13;
 vOpacity=layer<.5?.90:(layer<1.5?.39:(layer<2.5?.25:.67));
 if(layer>2.5)vColor=mix(cyan,ice,seed)*(.55+patchActive*.4);
 float shedding=step(.74,hash(seed*17.0+group))*patchActive;
 vOpacity*=1.0-shedding*.78;
 vOpacity*=.96+.04*sin(uTime*(4.0+hash(group+11.0)*4.0)+phase);
 vGlyph=mod(aData.z+localCycle*(2.0+floor(hash(group+2.0)*11.0))+floor(seed*19.0)*floor(patchActive*2.0),36.0);

 // Real page coordinates drive both departure and homing; cloned body glyphs fade during transit.
 float primary=aTravel.z;
 float localDelay=aTravel.x+(1.0-primary)*max(0.0,-aPosition.y)*.60;
 float assembled=smoothstep(localDelay,localDelay+mix(1.25,1.62,primary),uTime);
 vec2 home=vec2(aHome.x/uViewport.x*2.0-1.0,1.0-aHome.y/uViewport.y*2.0);
 vec2 homeQuad=home+q*vec2(aHome.w*1.05/uViewport.x*2.0,aHome.w*1.55/uViewport.y*2.0);
 vec2 body=gl_Position.xy/gl_Position.w+vec2(uCenter.x/uViewport.x*2.0-1.0,1.0-uCenter.y/uViewport.y*2.0);
 float burstAge=max(0.0,uReturnAge);
 float boo=smoothstep(0.0,.10,burstAge)*(1.0-smoothstep(.20,.44,burstAge))*step(0.0,uReturnAge);
 body=(body-vec2(uCenter.x/uViewport.x*2.0-1.0,1.0-uCenter.y/uViewport.y*2.0))*(1.0+boo*.26)+vec2(uCenter.x/uViewport.x*2.0-1.0,1.0-uCenter.y/uViewport.y*2.0);
 vec2 flight=body-homeQuad;
 vec2 travel=mix(homeQuad,body,assembled);
 travel+=vec2(sin(seed*21.0)*.13,.12+seed*.13)*sin(assembled*3.14159265);
 travel+=normalize(flight+vec2(.0001))*q.y*.012*sin(assembled*3.14159265);
 float cloneIn=smoothstep(.30,.88,assembled);
 vOpacity*=mix(cloneIn,1.0,primary)*step(aTravel.x+.02,uTime);
 vColor=mix(vec3(.74,.86,.88),vColor,smoothstep(.15,.92,assembled));
 vGlyph=primary>.5&&assembled<.94?aHome.z:vGlyph;
 if(uReturnAge>=0.0){
  float scatter=smoothstep(.18,.70,burstAge);
  vec2 blast=vec2(cos(seed*TAU),sin(seed*TAU))*(.14+hash(seed*17.0)*.33)*scatter;
  float back=smoothstep(.50+aTravel.y,.50+aTravel.y+aTravel.w,burstAge);
  travel=mix(body+blast,homeQuad,back);
  travel+=vec2(sin(seed*35.0)*.16,.12+hash(seed*4.0)*.13)*sin(back*3.14159265);
  travel+=normalize(homeQuad-body+vec2(.0001))*q.y*.011*sin(back*3.14159265);
  vOpacity*=mix(1.0-smoothstep(.30,1.05,burstAge),1.0,primary)*(1.0-step(.998,back));
  vColor=mix(vColor,vec3(.76,.85,.86),back);
  if(primary>.5&&back>.15)vGlyph=aHome.z;
 }
 // Eye and mouth openings remain actual empty columns through all three shells.
 float eyeOpen=max(.045,uEye),mouthOpen=1.0+boo*1.55;
 vec2 gaze=uGaze*vec2(.048,-.028);
 float eyeL=pow((aPosition.x+.285-gaze.x)/.183,2.0)+pow((aPosition.y-.58-gaze.y)/(.315*eyeOpen),2.0);
 float eyeR=pow((aPosition.x-.295-gaze.x)/.176,2.0)+pow((aPosition.y-.615-gaze.y)/(.295*eyeOpen),2.0);
 float mouth=pow(aPosition.x/(.108*mouthOpen),2.0)+pow((aPosition.y+.018)/(.169*mouthOpen),2.0);
 float cavity=step(1.0+(hash(seed*7.0)-.5)*.09,min(min(eyeL,eyeR),mouth));
 vOpacity*=mix(1.0,cavity,smoothstep(.85,1.0,assembled)*(1.0-step(.4,burstAge)));
 gl_Position.xy=travel*gl_Position.w;

}`;
const fragment=String.raw`#version 300 es
precision highp float;
uniform sampler2D uAtlas;
uniform vec2 uTiles;
in vec2 vUV;
in vec3 vColor;
in float vOpacity;
flat in float vGlyph;
out vec4 outColor;
void main(){
 vec2 tile=vec2(mod(vGlyph,12.0),floor(vGlyph/12.0));
 vec2 uv=(tile+vec2(vUV.x,1.0-vUV.y))/uTiles;
 float ink=texture(uAtlas,uv).a;
 if(ink<.08||vOpacity<.03)discard;
 outColor=vec4(vColor,ink*vOpacity);
}`;
const screenVertex=String.raw`#version 300 es
precision highp float;
out vec2 vUV;
void main(){
 vec2 q=vec2((gl_VertexID<<1)&2,gl_VertexID&2);
 vUV=q;gl_Position=vec4(q*2.0-1.0,0.0,1.0);
}`;
const screenFragment=String.raw`#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform float uCover;
uniform vec2 uResolution;
in vec2 vUV;
out vec4 outColor;
void main(){
 vec3 ink=texture(uScene,vUV).rgb;
 vec2 px=1.0/uResolution;
 vec3 halo=vec3(0.0);
 for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){
  float w=exp(-float(x*x+y*y)*.27);
  halo+=texture(uScene,vUV+vec2(x,y)*px*4.0).rgb*w;
 }
 halo/=10.8;
 float vignette=exp(-length((vUV-.5)*vec2(1.1,.7))*3.0);
 vec3 bg=mix(vec3(.003,.006,.012),vec3(.011,.023,.031),vignette);
 vec4 scene=texture(uScene,vUV);
 float alpha=clamp(uCover+(1.0-uCover)*scene.a+max(max(halo.r,halo.g),halo.b)*.22,0.0,1.0);
 vec3 color=ink+halo*.29+bg*uCover*(1.0-scene.a);
 outColor=vec4(color/max(alpha,.0001),alpha);
}`;
class LetterStorm{
 constructor(canvas,source){
  this.canvas=canvas;this.source=source;this.sources=[];
  this.gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,depth:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  if(!this.gl)throw Error('WebGL 2 is unavailable');
  const gl=this.gl;
  this.program=this.programFor(vertex,fragment);this.screen=this.programFor(screenVertex,screenFragment);
  this.sceneUniforms=Object.fromEntries(['uTime','uYaw','uAspect','uZoom','uAtlas','uReturnAge','uEye','uViewport','uCenter','uGaze','uTiles'].map(n=>[n,gl.getUniformLocation(this.program,n)]));
  this.screenUniforms=Object.fromEntries(['uScene','uResolution','uCover'].map(n=>[n,gl.getUniformLocation(this.screen,n)]));
  this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
  this.makeGeometry();this.makeAtlas();
  this.screenVao=gl.createVertexArray();
  this.texture=gl.createTexture();this.depth=gl.createRenderbuffer();this.fbo=gl.createFramebuffer();
  this.resize();this.offset=0;this.paused=false;this.raf=0;this.drag=0;
  this.onResize=()=>this.resize();
 }
 programFor(vs,fs){
  const gl=this.gl,p=gl.createProgram();
  for(const [type,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
   const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
   if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
   gl.attachShader(p,s);gl.deleteShader(s);
  }
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  return p;
 }
 makeGeometry(){
  const values=[],counts=[0,0,0,0],layers=[1,.79,.56];
  const add=(x,y,z,nx,ny,nz,seed,layer,index,group)=>{
   values.push(x,y,z,nx,ny,nz,seed,layer,index%36,group);counts[layer]++;
  };
  let index=0;
  for(let layer=0;layer<3;layer++){
   const scale=layers[layer],step=.033+(layer*.001);
   for(let row=0,y=-1.65;y<1.56;y+=.034,row++){
    const head=(y-.53)/1.03;
    let radius=y>.53?.84*Math.sqrt(Math.max(0,1-head*head)):(.80+.06*Math.cos((y-.53)*1.4));
    if(radius<.035)continue;
    radius*=scale;
    const circumference=TAU*radius,cols=Math.max(12,Math.round(circumference/step));
    for(let col=0;col<cols;col++){
     const seed=hash(index+layer*991),angle=(col+.5*(row%2))/cols*TAU;
     const sx=Math.sin(angle),cz=Math.cos(angle);
     const x=sx*radius,y0=y+(seed-.5)*.009,z=cz*radius*.69;
     const hem=-1.22-.28*(.5+.5*Math.cos(x*12.0+z*3.0))-.11*Math.sin(x*19.0-z*9.0);
     if(y0<hem){index++;continue}
     // Cut the eye columns through the nested layers. Their inner edges have real depth.
     const eyeL=((x+.285)/.183)**2+((y0-.58)/.315)**2;
     const eyeR=((x-.295)/.176)**2+((y0-.615)/.295)**2;
     const mouth=(x/.108)**2+((y0+.018)/.169)**2;

     const nx=sx,ny=y>.53?head*.9:.06,nz=cz/ .69,norm=Math.hypot(nx,ny,nz);
     const group=0; // Region identities are assigned from the curved shell below.
     add(x,y0,z,nx/norm,ny/norm,nz/norm,seed,layer,index,group);
     // Detached chips are sampled from the outer surface; no arbitrary confetti.
     if(layer===0&&((Math.abs(sx)>.86&&seed>.86)||(y0<-.9&&seed>.91))){
      const spread=.04+hash(index*7)*.15;
      add(x+Math.sign(x)*spread,y0-.03-hash(index*9)*.09,z+(seed-.5)*.22,nx/norm,ny/norm,nz/norm,hash(index*5),3,index+11,group);
     }
     index++;
    }
   }
  }
  // Build domains on each actual 3D shell. A warped metric gives torn, non-grid borders.
  const warp=(x,y,z)=>[
   x+.026*Math.sin(y*27+z*11)+.010*Math.sin(z*47-y*19),
   y+.024*Math.sin(x*31-z*15)+.008*Math.cos(x*57+z*23),
   z+.020*Math.sin(y*29+x*17)
  ];
  const pools=[[],[],[]],coordinates=[];
  for(let i=0;i<values.length/10;i++){
   const o=i*10;coordinates[i]=warp(values[o],values[o+1],values[o+2]);
   if(values[o+7]<3)pools[values[o+7]].push(i);
  }
  const domains=[],assignment=new Int32Array(values.length/10),fringes=new Float32Array(values.length/10);
  const anchorSets=[];
  for(let layer=0;layer<3;layer++){
   const pool=pools[layer],target=[610,445,285][layer],nearest=new Float32Array(pool.length).fill(Infinity),anchors=[];
   let chosen=Math.floor(hash(layer+77)*pool.length);
   // Farthest-point sampling bounds the largest island while a smooth density field varies sizes.
   for(let n=0;n<target;n++){
    const sample=pool[chosen],c=coordinates[sample],domain=domains.length;
    domains.push({count:0,layer,seed:domain*1.731+layer*977.3});
    anchors.push({c,domain,weight:.78+hash(domain+193)*.48});
    let best=-1;
    for(let j=0;j<pool.length;j++){
     const q=coordinates[pool[j]],dx=q[0]-c[0],dy=q[1]-c[1],dz=q[2]-c[2],d=dx*dx+dy*dy+dz*dz;
     if(d<nearest[j])nearest[j]=d;
     const density=.80+.34*Math.sin(q[1]*3.7+q[0]*5.1+q[2]*2.4);
     const score=nearest[j]*density;
     if(score>best){best=score;chosen=j}
    }
   }
   anchorSets[layer]=anchors;
  }
  for(let i=0;i<coordinates.length;i++){
   const o=i*10,layer=values[o+7],q=coordinates[i],anchors=anchorSets[Math.min(layer,2)];
   let first=Infinity,second=Infinity,winner=0;
   for(const a of anchors){
    const dx=q[0]-a.c[0],dy=q[1]-a.c[1],dz=q[2]-a.c[2],d=(dx*dx+dy*dy+dz*dz)/(a.weight*a.weight);
    if(d<first){second=first;first=d;winner=a.domain}else if(d<second)second=d;
   }
   assignment[i]=winner;
   fringes[i]=1-clamp((Math.sqrt(second)-Math.sqrt(first))/.022);
   if(layer<3)domains[winner].count++;
  }
  const packed=[];
  for(let i=0;i<coordinates.length;i++){
   const o=i*10,domain=domains[assignment[i]];
   packed.push(...values.slice(o,o+9),domain.seed,fringes[i],clamp(Math.sqrt(domain.count)/5.2,.36,1.45));
  }
  const sizes=domains.map(d=>d.count).filter(Boolean).sort((a,b)=>a-b);
  this.regionStats={count:sizes.length,min:sizes[0],median:sizes[Math.floor(sizes.length/2)],max:sizes[sizes.length-1],boundaries:'warped 3D Voronoi'};
  this.count=values.length/10;this.layerCounts=counts;this.geometry=new Float32Array(packed);
  const gl=this.gl,b=gl.createBuffer();this.buffer=b;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(packed),gl.STATIC_DRAW);
  for(const [loc,size,offset] of [[0,3,0],[1,3,12],[2,4,24],[3,2,40]]){
   gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,48,offset);gl.vertexAttribDivisor(loc,1);
  }

 }

 setSources(sources){
  this.sources=sources;this.makeAtlas();
  const gl=this.gl,g=this.geometry,front=[];
  for(let i=0;i<this.count;i++)if(g[i*12+7]<.5&&g[i*12+2]>.10)front.push(i);
  const primary=new Map();sources.forEach((s,i)=>primary.set(front[Math.floor((i+.5)*front.length/sources.length)],i));
  const data=new Float32Array(this.count*8);
  for(let i=0;i<this.count;i++){
   const exact=primary.has(i),owner=exact?primary.get(i):Math.floor(hash(i+912)*sources.length),s=sources[owner],o=i*8;
   data.set([s.home.x,s.home.y,this.chars.indexOf(s.char),s.size,s.delay,s.returnDelay,exact?1:0,s.returnDuration],o);
  }
  if(!this.homeBuffer)this.homeBuffer=gl.createBuffer();
  gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.homeBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
  for(const [loc,offset] of [[4,0],[5,16]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,4,gl.FLOAT,false,32,offset);gl.vertexAttribDivisor(loc,1)}
  this.sourceCount=sources.length;
 }

 makeAtlas(){
  const text=this.source.textContent;
  this.chars=[...new Set([...text].filter(c=>/[!-~]/.test(c)))].slice(0,36);
  if(!this.chars.length)throw Error('The source article is empty');
  const available=this.chars.slice();while(this.chars.length<36)this.chars.push(available[this.chars.length%available.length]);
  for(const s of this.sources)if(!this.chars.includes(s.char))this.chars.push(s.char);
  const a=document.createElement('canvas');a.width=12*48;a.height=Math.ceil(this.chars.length/12)*70;
  const c=a.getContext('2d');c.font='400 54px "Ghost JetBrains",ui-monospace,monospace';c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle='#fff';
  this.chars.forEach((ch,i)=>c.fillText(ch,(i%12)*48+24,Math.floor(i/12)*70+53));
  const gl=this.gl;if(this.atlas)gl.deleteTexture(this.atlas);this.atlas=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.atlas);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,a);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 }
 resize(){
  const gl=this.gl;this.width=innerWidth;this.height=innerHeight;this.dpr=Math.min(devicePixelRatio,2);
  this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,this.canvas.width,this.canvas.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.bindRenderbuffer(gl.RENDERBUFFER,this.depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,this.canvas.width,this.canvas.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.texture,0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,this.depth);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete scene framebuffer');
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  if(this.time!==undefined)this.draw(this.time);
 }

 draw(t,options={}){
  const start=performance.now(),gl=this.gl;this.time=t;
  const age=options.age??-1,gaze=options.gaze||[0,0],yaw=options.yaw??(-.12+Math.sin(t*1.08-.48)*.49+gaze[0]*.09);
  const aspect=this.width/this.height,zoom=Math.min(.92,aspect/.5625*.92)*(options.scale??1);
  const blink=options.eye??(()=>{for(const b of [3.16,5.8,6.03,10.8,14.2]){const x=t-b;if(x>=0&&x<.18)return 1-Math.sin(x/.18*Math.PI)*.96}return 1})();
  const cover=options.cover??(.93*Math.min(1,Math.max(0,(t-.8)/1.2))*(age<0?1:1-smooth(Math.max(0,(age-.30)/1.45))));
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo);gl.viewport(0,0,this.canvas.width,this.canvas.height);
  gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);
  gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(this.program);gl.bindVertexArray(this.vao);
  const u=this.sceneUniforms;
  gl.uniform1f(u.uTime,t);gl.uniform1f(u.uYaw,yaw);gl.uniform1f(u.uAspect,aspect);gl.uniform1f(u.uZoom,zoom);
  gl.uniform1f(u.uReturnAge,age);gl.uniform1f(u.uEye,blink);gl.uniform2f(u.uGaze,...gaze);
  gl.uniform2f(u.uViewport,this.width,this.height);gl.uniform2f(u.uCenter,...(options.center||[this.width*.5,this.height*.5]));
  gl.uniform2f(u.uTiles,12,Math.ceil(this.chars.length/12));
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.atlas);gl.uniform1i(u.uAtlas,0);
  gl.drawArraysInstanced(gl.TRIANGLES,0,6,this.count);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
  gl.useProgram(this.screen);gl.bindVertexArray(this.screenVao);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(this.screenUniforms.uScene,1);
  gl.uniform2f(this.screenUniforms.uResolution,this.canvas.width,this.canvas.height);gl.uniform1f(this.screenUniforms.uCover,cover);
  gl.drawArrays(gl.TRIANGLES,0,3);
  this.metrics={letters:this.count,sources:this.sourceCount,layers:this.layerCounts,regions:this.regionStats,yaw,drawCalls:2,cpuMs:performance.now()-start,glError:gl.getError()};
  return this.metrics;
 }
 renderAt(t,options={}){cancelAnimationFrame(this.raf);this.paused=true;return this.draw(t,options)}
 play(){
  cancelAnimationFrame(this.raf);this.paused=false;this.origin=performance.now()/1000-(this.time||0);
  const tick=()=>{if(this.paused)return;this.draw(performance.now()/1000-this.origin);this.raf=requestAnimationFrame(tick)};this.raf=requestAnimationFrame(tick);
 }
 pause(){this.paused=true;cancelAnimationFrame(this.raf)}
 destroy(){
  this.pause();window.removeEventListener('resize',this.onResize);const g=this.gl;
  g.deleteBuffer(this.buffer);if(this.homeBuffer)g.deleteBuffer(this.homeBuffer);for(const x of [this.atlas,this.texture])g.deleteTexture(x);
  g.deleteFramebuffer(this.fbo);g.deleteRenderbuffer(this.depth);g.deleteVertexArray(this.vao);g.deleteVertexArray(this.screenVao);
  g.deleteProgram(this.program);g.deleteProgram(this.screen);
 }
}

 const EXCLUDE='input,textarea,select,button,a,label,code,pre,script,style,noscript,svg,canvas,ascii-ghost,[contenteditable]:not([contenteditable="false"]),[data-ghost-ignore],[aria-hidden="true"]';
 let nextId=0;
 class AsciiGhost extends HTMLElement{
  static get observedAttributes(){return ['target','idle','max-letters','until','once','trigger']}
  constructor(){
   super();this.attachShadow({mode:'open'});
   this.shadowRoot.innerHTML='<style>:host{position:fixed;inset:0;display:block;pointer-events:none;z-index:var(--ghost-z,100);contain:style}canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}button{position:absolute;inset:8% 12%;border:0;border-radius:45%;background:transparent;color:transparent;pointer-events:none;touch-action:pan-y;cursor:pointer;opacity:0}button[data-live]{pointer-events:auto}button:focus-visible{opacity:1;outline:2px solid #a8eff3;outline-offset:4px}.quiet{position:absolute;right:24px;bottom:24px;font:14px/1.25 ui-monospace,monospace;white-space:pre;color:#bceff2;display:none}.quiet[data-on]{display:block}</style><canvas aria-hidden="true"></canvas><button type="button" aria-label="Boo! Send the letters home" tabindex="-1"></button><span class="quiet" aria-hidden="true"> .---.\n/ o o \\\n|  ~  |\n/_/\\_\\</span>';
   this._canvas=this.shadowRoot.querySelector('canvas');this._hit=this.shadowRoot.querySelector('button');
   this._id='ascii-ghost-'+(++nextId);this._letters=[];this._raf=0;this._timer=0;this._token=0;this._mode='idle';this._time=0;this._pointer={x:-9999,y:-9999};
   this._metrics={state:'idle',hidden:0,letters:0,frames:0};this._lastHidden='';this._connected=false;this._generation=0;
  }
  connectedCallback(){
   this._connected=true;this._autoUsed=false;this._typedBoo='';
   if(this._expired())return;
   this._seen=this._readSeen();if(this._blocked())return;
   this._abort=new AbortController();const signal=this._abort.signal;
   const on=(target,event,fn,opts={})=>target.addEventListener(event,fn,{...opts,signal});
   this._reduced=matchMedia('(prefers-reduced-motion: reduce)');
   this._supported=!!(window.Highlight&&window.CSS?.highlights);
   this._style=document.createElement('style');this._style.textContent='::highlight('+this._id+'){color:transparent;text-shadow:none}';document.head.append(this._style);
   on(window,'resize',()=>{this._renderer?.resize();this._dirtyHomes=true;if(this._mode==='manual')this.renderAt(this._time,this._options)});
   on(window,'scroll',()=>{this._dirtyHomes=true},{passive:true});
   if(window.visualViewport)on(visualViewport,'resize',()=>{this._renderer?.resize();this._dirtyHomes=true},{passive:true});
   on(document,'pointermove',e=>{this._pointer={x:e.clientX,y:e.clientY};if(this._mode==='idle')this._schedule()},{passive:true});
   on(document,'pointerdown',e=>{this._pointer={x:e.clientX,y:e.clientY};if(this._mode==='idle')this._schedule()},{passive:true});
   on(this._hit,'click',()=>this.boo());
   on(document,'keydown',e=>{
    if(e.key==='Escape'||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f')){this._typedBoo='';this.banish();return}
    const editing=document.designMode==='on'||e.composedPath().some(n=>n instanceof Element&&(n.isContentEditable||n.matches('input,textarea,select')));
    if(editing||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||e.repeat){this._typedBoo='';return}
    if(this.getAttribute('trigger')?.toLowerCase()==='boo'){
     this._typedBoo=e.key.length===1?(this._typedBoo+e.key.toLowerCase()).slice(-3):'';
     if(this._typedBoo==='boo'){this._typedBoo='';if(this._mode==='idle')this.summon();return}
    }
    if(this._mode==='idle')this._schedule();
   });
   on(document,'selectionchange',()=>{if(!getSelection().isCollapsed){clearTimeout(this._timer);if(this._mode!=='idle')this.banish()}});
   on(document,'visibilitychange',()=>{
    if(document.hidden){this._pausedAt=performance.now();cancelAnimationFrame(this._raf);this._raf=0;clearTimeout(this._timer)}
    else if(this._pausedAt){this._started+=performance.now()-this._pausedAt;this._pausedAt=0;if(this._mode==='live')this._loop();else if(this._mode==='idle')this._schedule()}
   });
   on(this._reduced,'change',()=>{this.banish();if(this._reduced.matches)this._static()});
   on(this._canvas,'webglcontextlost',e=>{e.preventDefault();this._contextLost=true;this.banish();this._static();this._emit('error',{message:'Graphics context was lost. Your text is restored.'})});
   on(this._canvas,'webglcontextrestored',()=>{this._renderer?.destroy();this._renderer=null;this._contextLost=false;this.banish()});
   if(this._reduced.matches||!this._supported){this._static();this._remember()}else this._schedule();
  }
  disconnectedCallback(){this._connected=false;this._deactivate()}
  _deactivate(){
   this._generation++;this._preparing=null;this._token++;this._mutation?.disconnect();this._abort?.abort();this._abort=null;clearTimeout(this._timer);this._timer=0;cancelAnimationFrame(this._raf);this._raf=0;this._clearHighlight();this._style?.remove();
   this._renderer?.destroy();this._renderer=null;this._letters=[];this._mode='idle';this._metrics.state='idle';this._canvas.style.opacity='0';
   this._hit.removeAttribute('data-live');this._hit.tabIndex=-1;this.shadowRoot.querySelector('.quiet').removeAttribute('data-on');
  }
  attributeChangedCallback(name,before,after){
   if(before===after||!this.isConnected||!this._connected)return;
   if(name==='until'||name==='once'){this._deactivate();this.connectedCallback();return}
   this._typedBoo='';if(name!=='idle')this.banish();this._schedule();
  }
  get state(){return this._metrics.state}
  get metrics(){return {...this._metrics,mode:this._mode,supported:this._supported,reducedMotion:this._reduced?.matches||false,...(this._renderer?{renderer:this._renderer.metrics}: {})}}
  get letterInventory(){return this._letters.map(l=>({character:l.char,source:l.node.data.slice(l.start,l.end),connected:l.node.isConnected}))}
  _root(){
   const target=this.getAttribute('target');
   if(target){try{return document.querySelector(target)}catch{return null}}
   return document.querySelector('main')||document.querySelector('article')||document.body;
  }
  _expired(){
   const value=this.getAttribute('until');if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;
   const [y,m,d]=value.split('-').map(Number),date=new Date(0);date.setFullYear(y,m-1,d);date.setHours(0,0,0,0);
   return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d&&Date.now()>=date.getTime();
  }
  _readSeen(){if(!this.hasAttribute('once'))return false;try{return localStorage.getItem('ascii-ghost:seen:v1')==='1'}catch{return false}}
  _remember(){if(this.hasAttribute('once')){this._seen=true;try{localStorage.setItem('ascii-ghost:seen:v1','1')}catch{}}}
  _blocked(){return this._expired()||(this.hasAttribute('once')&&this._seen)}
  _emit(name,detail={}){this.dispatchEvent(new CustomEvent('ghost:'+name,{bubbles:true,composed:true,detail}))}
  _schedule(){
   clearTimeout(this._timer);this._timer=0;
   if(this._expired()){this._deactivate();return}
   const delay=Number(this.getAttribute('idle')??4000);
   if(this._blocked()||this._autoUsed||this._mode!=='idle'||document.hidden||!this.isConnected||this._reduced?.matches||!this._supported||!Number.isFinite(delay)||delay<0||!getSelection().isCollapsed)return;
   this._timer=setTimeout(()=>{this._timer=0;this.summon()},Math.max(250,delay));
  }
  _collect(){
   if(this._expired())return false;
   const root=this._root();if(!root){this._emit('error',{message:'The target element was not found.'});return false}
   const max=clamp(Number(this.getAttribute('max-letters'))||600,24,1200),candidates=[];
   const seg=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
   const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{
    if(!n.data.trim()||n.parentElement?.closest(EXCLUDE))return NodeFilter.FILTER_REJECT;
    const style=getComputedStyle(n.parentElement);return style.display==='none'||style.visibility==='hidden'?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;
   }});
   while(walk.nextNode()){
    const node=walk.currentNode,style=getComputedStyle(node.parentElement),size=parseFloat(style.fontSize)||18;
    const segments=seg?Array.from(seg.segment(node.data),s=>({char:s.segment,start:s.index})):(()=>{let start=0;return Array.from(node.data,char=>{const item={char,start};start+=char.length;return item})})();
    for(const s of segments){
     if(!s.char.trim())continue;
     const range=new Range();range.setStart(node,s.start);range.setEnd(node,s.start+s.char.length);
     const r=range.getClientRects()[0];if(!r||r.width<.1||r.height<.1||r.bottom<8||r.top>innerHeight-8||r.right<0||r.left>innerWidth)continue;
     candidates.push({char:s.char,node,start:s.start,end:s.start+s.char.length,range,size,home:{x:r.x+r.width/2,y:r.y+r.height*.50}});
    }
   }
   this._letters=candidates.filter((l,i)=>hash(i+431)<.20).slice(0,max);
   if(this._letters.length<Math.min(12,candidates.length))this._letters=candidates.filter((l,i)=>i%3===0).slice(0,max);
   if(!this._letters.length){this._emit('error',{message:'No visible text was found inside the target.'});return false}
   this._letters.forEach((l,i)=>{l.delay=.025+hash(i+3)*.52;l.returnDelay=i===0?2.30:hash(i+8)*.55;l.returnDuration=i===0?2.05:1.45+hash(i+61)*.35});
   this._dirtyHomes=false;this._lastHidden='';this._metrics.letters=this._letters.length;
   this._mutation?.disconnect();this._mutation=new MutationObserver(()=>{if(this._mode!=='idle')this.banish(false)});this._mutation.observe(root,{childList:true,subtree:true,characterData:true});
   return true;
  }
  _refreshHomes(){
   for(const l of this._letters){
    if(!l.node.isConnected||l.node.data.slice(l.start,l.end)!==l.char){this.banish();return false}
    const r=l.range.getClientRects()[0];if(r)l.home={x:r.x+r.width/2,y:r.y+r.height*.50};
   }
   this._renderer?.setSources(this._letters);this._dirtyHomes=false;return true;
  }
  async prepare(){
   if(this._blocked()){if(this._expired())this._deactivate();return false}
   if(this._renderer||this._reduced?.matches||!this._supported||this._contextLost)return !!this._renderer;
   if(this._preparing)return this._preparing;
   const generation=this._generation;
   const preparing=(async()=>{
    try{
     await document.fonts.ready;
     if(!this.isConnected||this._blocked()||generation!==this._generation)return false;
     this._renderer=new LetterStorm(this._canvas,this._root()||document.body);this._canvas.style.opacity='0';return true;
    }catch(e){this._emit('error',{message:e.message});this._static();return false}
    finally{if(this._preparing===preparing)this._preparing=null}
   })();this._preparing=preparing;return preparing;
  }
  async summon(){
   if(this._blocked()){if(this._expired())this._deactivate();return false}
   const token=++this._token;this.banish(false);this._token=token;
   if(this._reduced?.matches||!this._supported||this._contextLost){this._static();this._remember();return false}
   if(!await this.prepare()||token!==this._token||!this.isConnected)return false;
   if(!this._collect())return false;
   this._autoUsed=true;this._remember();
   this._renderer.setSources(this._letters);this._booAt=Infinity;this._mode='live';this._started=performance.now();this._time=0;
   this._metrics.state='summoning';this._emit('summon',{letters:this._letters.length});this._loop();return true;
  }
  boo(){
   if(this._mode==='static'){this.banish();return}
   if(this._mode==='idle'||this._booAt!==Infinity)return;
   const wasManual=this._mode==='manual';
   this._booAt=this._time;this._emit('boo',{letters:this._letters.length});this._mode='live';
   this._started=performance.now()-this._time*1000;if(wasManual||!this._raf)this._loop();
  }
  banish(schedule=false){
   this._mutation?.disconnect();
   this._token++;cancelAnimationFrame(this._raf);this._raf=0;clearTimeout(this._timer);this._timer=0;this._clearHighlight();this._canvas.style.opacity='0';
   this.shadowRoot.querySelector('.quiet').removeAttribute('data-on');this._hit.removeAttribute('data-live');this._hit.tabIndex=-1;
   this._mode='idle';this._metrics.state='idle';this._letters=[];this._booAt=Infinity;this._emit('banish');if(schedule)this._schedule();
  }
  _clearHighlight(){if(window.CSS?.highlights)CSS.highlights.delete(this._id);this._metrics.hidden=0;this._lastHidden=''}
  _static(){
   if(this._expired()){this._deactivate();return}
   this._clearHighlight();this._canvas.style.opacity='0';this.shadowRoot.querySelector('.quiet').setAttribute('data-on','');
   this._mode='static';this._metrics.state='static';this._hit.style.inset='auto 12px 12px auto';this._hit.style.width='120px';this._hit.style.height='110px';this._hit.setAttribute('data-live','');this._hit.tabIndex=0;
  }
  _loop(){
   cancelAnimationFrame(this._raf);
   const frame=now=>{
    if(this._expired()){this._deactivate();return}
    if(this._mode!=='live'||document.hidden||!this.isConnected){this._raf=0;return}
    const t=(now-this._started)/1000;this._draw(t,{booAt:this._booAt,pointer:this._pointer});
    if(Number.isFinite(this._booAt)&&t-this._booAt>5.05){this.banish(false);this._emit('home');this._raf=0;return}
    this._raf=requestAnimationFrame(frame);
   };this._raf=requestAnimationFrame(frame);
  }
  _draw(t,options={}){
   if(this._expired()){this._deactivate();return this.metrics}
   if(!this._renderer||!this._letters.length)return this.metrics;
   if(this._dirtyHomes&&!this._refreshHomes())return this.metrics;
   const booAt=options.booAt??7.4,elapsed=Number.isFinite(booAt)?t-booAt:-1;
   const rate=Number.isFinite(options.returnRate)&&options.returnRate>0?options.returnRate:1;
   const age=elapsed<=.40||rate===1?elapsed:.40+(elapsed-.40)*rate,hidden=[],ids=[];
   for(let i=0;i<this._letters.length;i++){
    const l=this._letters[i],left=t>l.delay+.02,home=age>=.50+l.returnDelay+l.returnDuration;
    if(left&&!home){hidden.push(l.range);ids.push(i)}
   }
   const key=ids.join(',');
   if(key!==this._lastHidden){if(hidden.length)CSS.highlights.set(this._id,new Highlight(...hidden));else CSS.highlights.delete(this._id);this._lastHidden=key}
   this._metrics.hidden=hidden.length;this._time=t;this._booAt=booAt;
   this._metrics.state=age>=0?(age<.42?'boo':hidden.length?'returning':'idle'):t<2.1?'summoning':'alive';
   const pointer=options.pointer||this._pointer,px=Array.isArray(pointer)?pointer[0]:pointer.x,py=Array.isArray(pointer)?pointer[1]:pointer.y;
   const near=px>-1000&&py>-1000;
   const gaze=near?[clamp((px/innerWidth-.5)*1.7,-1,1),clamp((py/innerHeight-.5)*1.7,-1,1)]:[0,0];
   const center=options.center||[innerWidth*.5,innerHeight*.51];
   this._canvas.style.opacity=hidden.length||t<2.1?'1':'0';
   this._renderer.draw(t,{...options,center,age,gaze,scale:options.scale??.96});
   const live=age<0&&t>1.8;this._hit.toggleAttribute('data-live',live);this._hit.tabIndex=live?0:-1;
   const size=Math.min(innerHeight*.79,innerWidth*1.50)*(options.scale??.96);
   this._hit.style.inset='auto';this._hit.style.left=(center[0]-size*.28)+'px';this._hit.style.top=(center[1]-size*.44)+'px';this._hit.style.width=(size*.56)+'px';this._hit.style.height=(size*.82)+'px';
   this._metrics.frames++;return this.metrics;
  }
  renderAt(t,options={}){
   if(this._expired()){this._deactivate();return this.metrics}
   if(this.hasAttribute('once')&&this._seen&&this._mode==='idle')return this.metrics;
   cancelAnimationFrame(this._raf);this._raf=0;clearTimeout(this._timer);
   if(this._reduced?.matches||!this._supported||this._contextLost){this._static();return this.metrics}
   if(!this._renderer)return this.metrics;
   if(!this._letters.length){if(!this._collect())return this.metrics;this._renderer.setSources(this._letters)}
   this._mode='manual';this._options=options;return this._draw(Math.max(0,Number(t)||0),options);
  }
 }
 if(!customElements.get('ascii-ghost'))customElements.define('ascii-ghost',AsciiGhost);
})();
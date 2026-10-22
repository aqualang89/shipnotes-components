/* One WebGL renderer per component. Original art remains the fallback. */
(() => {
 const specs={ember:['ember',0],oxide:['oxide',1],'frozen-vault':['frozen',2],'rain-terminal':['rain',3],'grid-blackout':['grid',4],'ghost-market':['ghost',5]};
 const vert=`attribute vec2 aPosition;varying vec2 v;void main(){v=(aPosition+1.0)*.5;gl_Position=vec4(aPosition,0.,1.);}`;
 const frag=`precision highp float;
 varying vec2 v;uniform sampler2D uImage;uniform float uTime,uKind,uHit,uAtlas;uniform vec2 uFit,uCell;
 vec4 tex(vec2 p){if(min(p.x,p.y)<0.||max(p.x,p.y)>1.)return vec4(0.);return texture2D(uImage,uAtlas>.5?(p+uCell)/vec2(3.,2.):p);}
 void main(){
  vec2 uv=vec2(v.x,1.-v.y), p=(uv-.5)*uFit+.5;float t=uTime;
  vec2 shift=vec2(0.);float light=1.;float chroma=0.;
  if(uKind<.5){
   shift.x=.009*sin(p.y*8.-t*.65)+.003*sin(p.y*21.+t*.4);
   shift.y=.005*sin(p.x*9.+t*.45);light=1.+.11*sin(p.y*7.-t*.9);
  }else if(uKind<1.5){
   float a=sin(t*.65)*.018;vec2 c=p-.5;p=mat2(cos(a),-sin(a),sin(a),cos(a))*c+.5;
   p.x=.5+(p.x-.5)/(1.+.018*sin(t*.7));light=.98+.08*sin(t*.65+p.x*2.4);
  }else if(uKind<2.5){
   shift.x=.004*sin(p.y*12.+t*.7);shift.y=.003*sin(p.x*10.-t*.5);
   float sweep=fract(t*.11)*1.8-.4;light=1.+.23*exp(-pow((p.x-p.y*.38-sweep)/.08,2.));chroma=0.;
  }else if(uKind<3.5){
   vec2 c=p-vec2(.49,.53);float r=length(c);shift=normalize(c+.0001)*(.0045*sin(r*43.-t*2.5)+.002*sin(r*77.+t));
   shift.x+=sin(p.y*9.-t)*.004;light=1.+.07*cos(r*30.-t*2.5);chroma=.0004;
  }else if(uKind<4.5){
   shift.y=.012*sin(p.x*11.+t*1.4)*sin(p.y*3.14159);shift.x=.004*sin(p.y*17.-t*.8);
   float scan=fract(t*.28);light=1.+.28*exp(-pow((uv.y-scan)/.018,2.));
  }else{
   shift.x=.009*sin(p.y*9.+t*.8);shift.y=.007*cos(p.x*8.-t*.9);
   float band=step(.94,sin(floor(p.y*42.)*19.+floor(t*18.)))*uHit;
   shift.x+=band*.019;chroma=.0006+uHit*.002;light=1.+.04*sin(p.y*800.+t*3.)+uHit*.08;
  }
  vec4 c=tex(p+shift);if(chroma>0.){c.r=tex(p+shift+vec2(chroma,0.)).r;c.b=tex(p+shift-vec2(chroma,0.)).b;}
  c.rgb*=light;gl_FragColor=c;
 }`;
 const ATLAS=['dust','signal','garden','contact','fold','noct'];
 const base=(document.currentScript?.src||location.href).replace(/[^/]*$/,'');
 class CardArt{
  constructor(owner){
   this.owner=owner;this.canvas=document.createElement('canvas');this.canvas.className='cf-art-canvas';this.canvas.setAttribute('aria-hidden','true');this.textures=new Map();this.loading=new Map();
   const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});this.gl=gl;
   this.canvas.addEventListener('webglcontextlost',()=>{this.available=false;this.host?.classList.remove('cf-live-art');});
   this.available=gl?this.init():false;
   this.ready=this.available?this.preload([owner.theme]):Promise.resolve(false);
  }
  init(){
   const gl=this.gl;
   const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
   try{
    const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vert));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,frag));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);this.program=p;
    const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(p,'aPosition');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    this.u=Object.fromEntries(['Image','Time','Kind','Hit','Atlas','Fit','Cell'].map(n=>[n,gl.getUniformLocation(p,'u'+n)]));
    return true;
   }catch(e){this.error=e.message;return false;}
  }
  upload(key,source){
   const gl=this.gl,texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
   const entry={texture,w:source.width,h:source.height};this.textures.set(key,entry);return entry;
  }
  load(key,src){
   if(this.textures.has(key))return Promise.resolve(this.textures.get(key));
   if(!this.loading.has(key))this.loading.set(key,(async()=>{
    const im=new Image();if(!src.startsWith('data:')&&!src.startsWith('blob:'))im.crossOrigin='anonymous';im.src=src;
    try{await im.decode();return this.upload(key,im);}catch{this.textures.set(key,null);return null;}
   })());
   return this.loading.get(key);
  }
  // what the focused card shows: {key, src|canvas, atlas, cell, fit}
  source(item,theme){
   if(item.image)return {key:'img:'+item.image,src:item.image,fit:'cover'};
   if(item.art==='iris')return {key:theme+':iris',src:base+`art/${specs[theme][0]}-iris.webp`,fit:'hero'};
   if(item.art)return {key:theme+':atlas',src:base+`art/${specs[theme][0]}-atlas.webp`,atlas:true,cell:ATLAS.indexOf(item.art)};
   return {key:'gen:'+theme+':'+item.seed,canvas:this.owner.generated(item.seed).canvas,fit:'contain'};
  }
  texture(s){
   if(s.canvas){if(!this.textures.has(s.key))this.upload(s.key,s.canvas);return this.textures.get(s.key);}
   if(this.textures.has(s.key))return this.textures.get(s.key);
   this.load(s.key,s.src);return undefined;
  }
  preload(themes){
   if(!this.available)return Promise.resolve(false);
   const jobs=[];
   for(const theme of themes)for(const item of this.owner.items){const s=this.source(item,theme);if(!s.canvas)jobs.push(this.load(s.key,s.src));}
   return Promise.all(jobs).then(()=>true);
  }
  draw(time,hit=0){
   if(!this.available)return;
   const o=this.owner,index=Math.round(o.pos),node=o.nodes[index];if(!node?._art)return;
   const item=o.items[index],s=this.source(item,o.theme),entry=this.texture(s);
   if(!entry){if(this.host){this.host.classList.remove('cf-live-art');this.host=null;this.key=null;}return;}
   const host=node._art,key=s.key+':'+(s.cell??'')+':'+o.layoutSignature;
   if(this.host!==host){this.host?.classList.remove('cf-live-art');host.append(this.canvas);this.host=host;host.classList.add('cf-live-art');}
   const gl=this.gl;
   if(key!==this.key){
    const w=host.clientWidth,h=host.clientHeight,dpr=Math.min(2,devicePixelRatio||1);this.canvas.width=Math.max(1,Math.round(w*dpr));this.canvas.height=Math.max(1,Math.round(h*dpr));gl.viewport(0,0,this.canvas.width,this.canvas.height);
    let fit=[1,1];
    if(s.fit==='hero'){const style=getComputedStyle(host.querySelector('.cf-art-hero')),parts=style.backgroundSize.split(' ');let dw,dh;
     if(parts[0]==='contain'){const k=Math.min(w/entry.w,h/entry.h);dw=entry.w*k;dh=entry.h*k;}
     else if(parts[0]==='auto'){dh=h*parseFloat(parts[1])/100;dw=dh*entry.w/entry.h;}
     else{dw=w*parseFloat(parts[0])/100;dh=dw*entry.h/entry.w;}fit=[w/dw,h/dh];
    }else if(s.fit==='cover'||s.fit==='contain'){
     const k=(s.fit==='cover'?Math.max:Math.min)(w/entry.w,h/entry.h);fit=[w/(entry.w*k),h/(entry.h*k)];
    }
    const cell=Math.max(0,s.cell??0);gl.uniform2f(this.u.Fit,...fit);gl.uniform2f(this.u.Cell,cell%3,Math.floor(cell/3));gl.uniform1f(this.u.Atlas,s.atlas?1:0);gl.uniform1f(this.u.Kind,specs[o.theme][1]);gl.uniform1i(this.u.Image,0);this.key=key;
   }
   // uploads of other textures rebind TEXTURE_2D, so bind ours every frame
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,entry.texture);
   gl.uniform1f(this.u.Time,matchMedia('(prefers-reduced-motion: reduce)').matches?0:time);gl.uniform1f(this.u.Hit,hit);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  destroy(){this.host?.classList.remove('cf-live-art');this.canvas.remove();for(const e of this.textures.values())if(e)this.gl?.deleteTexture(e.texture);this.gl?.getExtension('WEBGL_lose_context')?.loseContext();}
 }
 globalThis.CardArt=CardArt;
})();

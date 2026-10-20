(()=>{'use strict';
const db=value=>value<=0?0:10**((-30+30*Math.min(100,value)/100)/20);
class IrisSound{
 constructor(orb){
  this.orb=orb;this.ctx=null;this.on=false;this.disposed=false;this.mic=null;this.token=0;
  this.buffers={};this.voices=new Set();this.variation={};this.ambience=80;this.responses=100;
  this.stateHandler=()=>this.stateChanged();this.paletteHandler=()=>this.playCue('palette');
  this.visibilityHandler=()=>document.hidden?this.suspend():this.resume();
  orb.host.addEventListener('iris:statechange',this.stateHandler);orb.host.addEventListener('iris:palettechange',this.paletteHandler);
  document.addEventListener('visibilitychange',this.visibilityHandler);
 }
 async init(){
  if(this.disposed)throw new Error('Iris sound is disposed');
  if(!this.ctx){
   this.ctx=new (window.AudioContext||window.webkitAudioContext)();
   this.master=this.ctx.createGain();this.master.gain.value=0;
   this.limiter=this.ctx.createDynamicsCompressor();this.limiter.threshold.value=-7;this.limiter.knee.value=3;this.limiter.ratio.value=12;this.limiter.attack.value=.003;this.limiter.release.value=.18;
   this.master.connect(this.limiter);this.limiter.connect(this.ctx.destination);
   this.ambientBus=this.ctx.createGain();this.effectsBus=this.ctx.createGain();
   this.ambientBus.connect(this.master);this.effectsBus.connect(this.master);
  }
  await this.ctx.resume();
  if(!this.loading)this.loading=Promise.all(Object.entries(window.IRIS_AUDIO_BANK).map(async([name,asset])=>{
   const str=atob(asset.data),bytes=new Uint8Array(str.length);for(let i=0;i<str.length;i++)bytes[i]=str.charCodeAt(i);
   this.buffers[name]=await this.ctx.decodeAudioData(bytes.buffer);
  })).catch(e=>{this.loading=null;throw e});
  await this.loading;
  if(this.disposed)return;
  if(!this.source){this.source=this.ctx.createBufferSource();this.source.buffer=this.buffers['air-bed'];this.source.loop=true;this.source.connect(this.ambientBus);this.source.start();}
  this.mix();
 }
 ramp(param,value,time=.08){const now=this.ctx.currentTime;if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);else{param.cancelScheduledValues(now);param.setValueAtTime(param.value,now)}param.setTargetAtTime(value,now,time)}
 mix(){
  if(!this.ctx||this.disposed)return;
  const duck=this.mic||this.orb.state==='speaking'?10**(-12/20):1;
  this.ramp(this.ambientBus.gain,db(this.ambience)*duck,.3);this.ramp(this.effectsBus.gain,db(this.responses),.04);
 }
 setAmbience(value){this.ambience=Math.max(0,Math.min(100,Number(value)||0));this.mix()}
 setResponses(value){this.responses=Math.max(0,Math.min(100,Number(value)||0));this.mix()}
 async toggle(){
  if(this.toggling)return this.on;this.toggling=true;
  try{
   if(this.on){this.on=false;clearTimeout(this.thoughtTimer);this.fadeVoices();this.ramp(this.master.gain,0,.08);return false}
   await this.init();if(this.disposed)return false;this.on=true;this.ramp(this.master.gain,.4,.12);
   if(!document.hidden){this.playCue('wake');this.scheduleThought()}else this.suspend();
   return true;
  }finally{this.toggling=false}
 }
 canPlay(){return this.on&&!this.disposed&&!document.hidden&&!this.orb.paused&&this.ctx?.state==='running'}
 fadeVoices(duration=.12){
  for(const voice of this.voices){if(voice.stopping)continue;voice.stopping=true;this.ramp(voice.gain.gain,0,duration/4);voice.source.stop(this.ctx.currentTime+duration)}
 }
 playCue(kind){
  if(!this.canPlay())return;
  if(kind==='palette'&&this.ctx.currentTime-(this.lastPalette??-1)<.12)return;
  if(kind==='palette')this.lastPalette=this.ctx.currentTime;
  const previous=this.variation[kind]??-1,variant=(previous+1+Math.floor(Math.random()*2))%3;
  this.variation[kind]=variant;
  const buffer=this.buffers[kind+'-'+variant];if(!buffer)return;
  if(this.voices.size>=8){const old=this.voices.values().next().value;old.source.onended=null;old.source.stop();old.source.disconnect();old.gain.disconnect();this.voices.delete(old)}
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;
  source.playbackRate.value=.992+Math.random()*.016;gain.gain.value=.96+Math.random()*.04;
  source.connect(gain);gain.connect(this.effectsBus);
  const voice={source,gain,kind,stopping:false};this.voices.add(voice);
  source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice)};source.start();
 }
 stateChanged(){
  clearTimeout(this.thoughtTimer);this.mix();if(!this.canPlay())return;
  this.fadeVoices(.16);this.playCue({idle:'rest',listening:'listen',thinking:'think',speaking:'speak',agitated:'grain'}[this.orb.state]);this.scheduleThought();
 }
 scheduleThought(){
  clearTimeout(this.thoughtTimer);if(!this.canPlay()||this.orb.state!=='thinking')return;
  this.thoughtTimer=setTimeout(()=>{if(this.canPlay()&&this.orb.state==='thinking'){this.playCue('grain');this.scheduleThought()}},1050+Math.random()*700);
 }
 async startMic(){
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone needs localhost or HTTPS. The state buttons work offline.');
  const token=++this.token;const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  try{
   if(token!==this.token||this.disposed||document.hidden){stream.getTracks().forEach(t=>t.stop());return false}
   await this.init();
   if(token!==this.token||this.disposed||document.hidden){stream.getTracks().forEach(t=>t.stop());return false}
   this.mic=stream;this.input=this.ctx.createMediaStreamSource(stream);this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=1024;
   this.input.connect(this.analyser);this.data=new Float32Array(1024);this.orb.setState('listening');this.mix();this.poll();this.notifyMic();return true;
  }catch(e){stream.getTracks().forEach(t=>t.stop());throw e}
 }
 notifyMic(){this.orb.host.dispatchEvent(new CustomEvent('iris:microphonechange',{detail:{active:!!this.mic}}))}
 poll(){if(!this.mic)return;this.analyser.getFloatTimeDomainData(this.data);let sum=0;for(const v of this.data)sum+=v*v;const rms=Math.sqrt(sum/this.data.length);this.orb.setLevel(Math.min(1,Math.max(0,(rms-.008)*12)));this.micRAF=requestAnimationFrame(()=>this.poll())}
 stopMic(){++this.token;cancelAnimationFrame(this.micRAF);this.mic?.getTracks().forEach(t=>t.stop());this.input?.disconnect();this.analyser?.disconnect();this.input=null;this.analyser=null;const hadMic=!!this.mic;this.mic=null;if(hadMic){this.orb.setLevel(null);this.notifyMic()}this.mix()}
 suspend(){
  clearTimeout(this.thoughtTimer);clearTimeout(this.suspendTimer);this.stopMic();
  if(!this.ctx||this.disposed)return;this.fadeVoices(.06);this.ramp(this.master.gain,0,.015);
  this.suspendTimer=setTimeout(()=>{if(!this.disposed)this.ctx.suspend()},80);
 }
 async resume(){
  clearTimeout(this.suspendTimer);if(!this.ctx||this.disposed||document.hidden||!this.on)return;
  try{await this.ctx.resume();if(this.disposed||document.hidden)return;this.ramp(this.master.gain,.4,.2);this.mix();this.scheduleThought()}catch(e){console.warn('Iris audio resume:',e.message)}
 }
 dispose(){
  if(this.disposed)return;this.stopMic();this.disposed=true;clearTimeout(this.thoughtTimer);clearTimeout(this.suspendTimer);
  this.orb.host.removeEventListener('iris:statechange',this.stateHandler);this.orb.host.removeEventListener('iris:palettechange',this.paletteHandler);document.removeEventListener('visibilitychange',this.visibilityHandler);
  for(const v of this.voices){v.source.onended=null;v.source.stop();v.source.disconnect();v.gain.disconnect()}this.voices.clear();this.source?.stop();this.source?.disconnect();this.ctx?.close();
 }
}
window.IrisSound=IrisSound;
})();

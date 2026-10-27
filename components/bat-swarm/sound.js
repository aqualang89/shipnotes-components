/* Optional, local Web Audio foley. No files or network. Off until explicitly enabled. */
(() => {
class BatSounds {
  constructor(){this.on=false;this.last=-10;}
  async enable(on){
    this.on=on;
    if(on){this.ctx ||= new (window.AudioContext||window.webkitAudioContext)();await this.ctx.resume();}
    else if(this.ctx)await this.ctx.suspend();
  }
  takeoff(){
    if(!this.on||!this.ctx||this.ctx.state!=='running')return;
    const c=this.ctx,t=c.currentTime;if(t-this.last<.24)return;this.last=t;
    const n=c.createBuffer(1,c.sampleRate*.3,c.sampleRate),a=n.getChannelData(0);
    let low=0;for(let i=0;i<a.length;i++){low=low*.72+(Math.random()*2-1)*.28;a[i]=low*Math.sin(Math.PI*i/a.length)**2;}
    const src=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();src.buffer=n;
    filter.type='lowpass';filter.frequency.value=1700;g.gain.value=.075;
    src.connect(filter).connect(g).connect(c.destination);src.start();
  }
  land(){
    if(!this.on||!this.ctx||this.ctx.state!=='running')return;
    const c=this.ctx,t=c.currentTime;if(t-this.last<.15)return;this.last=t;
    const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(165,t+.15);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.018,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.25);
    o.connect(g).connect(c.destination);o.start(t);o.stop(t+.26);
  }
}window.BatSounds=BatSounds;
})();

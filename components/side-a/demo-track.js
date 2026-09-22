/* After Hours: original synthetic demo by Ship Notes. MIT. No samples. */
(function(root){
  function makeTrack(){
    const rate=44100,duration=24,count=rate*duration,samples=new Float32Array(count),tau=Math.PI*2;
    const freq=m=>440*Math.pow(2,(m-69)/12);
    const chords=[[48,55,59,64],[45,52,55,60],[41,48,52,57],[43,50,55,60]];
    function note(m,start,length,gain,soft){const f=freq(m),begin=Math.floor(start*rate),n=Math.floor(length*rate);for(let j=0;j<n&&begin+j<count;j++){if(begin+j<0)continue;const t=j/rate,a=Math.min(1,t/(soft?.4:.012)),release=Math.min(1,(length-t)/.35),env=soft?a*release:a*release*Math.exp(-t/1.3);samples[begin+j]+=gain*env*(Math.sin(tau*f*t)+.16*Math.sin(tau*f*2*t)*Math.exp(-t*2)+.06*Math.sin(tau*f*3*t)*Math.exp(-t*3));}}
    for(let bar=0;bar<4;bar++){const c=chords[bar];c.forEach(m=>note(m,bar*6,6.5,.048,true));note(c[0]-12,bar*6,5.9,.072,true);for(let k=0;k<16;k++){const m=c[[0,2,1,3,2,1,3,2][k%8]]+12;note(m,bar*6+k*.375,1.7,.09,false);note(m,bar*6+k*.375+.28,1.6,.018,false);}}
    let peak=0;for(let i=0;i<count;i++){const t=i/rate;samples[i]*=Math.min(1,t/.3,(duration-t)/.75);peak=Math.max(peak,Math.abs(samples[i]));}
    const out=new ArrayBuffer(44+count*2),v=new DataView(out);const str=(p,s)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i))};str(0,'RIFF');v.setUint32(4,36+count*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,count*2,true);for(let i=0;i<count;i++)v.setInt16(44+i*2,Math.round(samples[i]/peak*.34*32767),true);return out;
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=makeTrack;else root.makeSideATrack=makeTrack;
})(typeof window!=='undefined'?window:globalThis);

(()=>{'use strict';
const $=s=>document.querySelector(s),orb=$('#orb');window.dust=orb;
const captions={idle:'A quiet presence.',listening:'All attention.',thinking:'A thought taking shape.',speaking:'A voice in the dust.',agitated:'Something needs your attention.'};
// The approved Air + glass player accepts this small component adapter.
const adapter={host:orb,get state(){return orb.state},get paused(){return orb._paused},setState:s=>orb.setState(s),setLevel:v=>orb.setVoiceLevel(v??0)};
const sound=new IrisSound(adapter);window.dustSound=sound;let timers=[],voiceFrame=0;
function voice(){cancelAnimationFrame(voiceFrame);if(orb.state==='speaking'&&!orb._paused&&!document.hidden){const t=orb._time;orb.setVoiceLevel((Math.sin(t*8.3)*.5+.5)**3*(.28+.55*(Math.sin(t*2.4)*.5+.5)));voiceFrame=requestAnimationFrame(voice)}else orb.setVoiceLevel(0)}
orb.addEventListener('statechange',()=>{document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state===orb.state)));$('#state-label').textContent=captions[orb.state];orb.dispatchEvent(new Event('iris:statechange'));voice()});
function stop(){timers.forEach(clearTimeout);timers=[];$('#sequence').setAttribute('aria-pressed','false');$('#sequence').textContent='Play sequence'}
document.querySelectorAll('[data-state]').forEach(b=>b.addEventListener('click',()=>{stop();orb.setState(b.dataset.state)}));
$('#sequence').onclick=()=>{if(timers.length){stop();return}orb.pause(false);syncPause();$('#sequence').setAttribute('aria-pressed','true');$('#sequence').textContent='Stop sequence';orb.setState('listening');[['thinking',2200],['speaking',4800],['agitated',7600],['idle',9200]].forEach(([s,t])=>timers.push(setTimeout(()=>orb.setState(s),t)));timers.push(setTimeout(stop,9600))};
function syncPause(){$('#pause').setAttribute('aria-pressed',String(orb._paused));$('#pause').textContent=orb._paused?'Resume':'Pause'}syncPause();
$('#pause').onclick=()=>{orb.pause(!orb._paused);syncPause();voice();if(orb._paused)sound.suspend();else sound.resume()};
$('#sound').onclick=async()=>{const b=$('#sound');b.disabled=true;try{const on=await sound.toggle();b.setAttribute('aria-pressed',String(on));b.textContent=on?'Sound on':'Sound off';$('#notice').textContent=on?'Air + glass. Change a state.':'Drag to turn. Touch to stir.'}catch{$('#notice').textContent='Sound could not start. Try again.'}finally{b.disabled=false}};
$('#settings-toggle').onclick=()=>{const open=$('#settings').hidden;$('#settings').hidden=!open;$('#settings-toggle').setAttribute('aria-expanded',String(open))};
$('#energy').oninput=e=>orb.setEnergy(e.target.value);$('#light').oninput=e=>orb.setLight(e.target.value);$('#quality').onchange=e=>orb.setQuality(e.target.value);
function stats(){const s=orb.stats;$('#stats').textContent=`${s.count.toLocaleString('en-US')} particles · ${s.fps?s.fps+' fps':'measuring'}${s.fallback?' · compatibility mode':''}`}orb.addEventListener('performance',stats);orb.addEventListener('qualitychange',stats);stats();
document.addEventListener('visibilitychange',voice);matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',()=>{syncPause();voice()});
window.renderAt=(t,s='idle')=>{stop();cancelAnimationFrame(voiceFrame);orb.setAttribute('recording','');orb.renderAt(t,{state:s,voice:s==='speaking'?.55:0});$('#state-label').textContent=captions[s];document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state===s)))};
addEventListener('pagehide',e=>{stop();cancelAnimationFrame(voiceFrame);if(e.persisted)sound.suspend();else sound.dispose()});addEventListener('pageshow',e=>{if(e.persisted){sound.resume();voice()}});
})();

'use strict';
(async()=>{
 await customElements.whenDefined('ascii-ghost');await document.fonts.load('54px "Ghost JetBrains"');
 const ghost=window.ghost=document.querySelector('ascii-ghost'),button=document.querySelector('#summon'),status=document.querySelector('#status');
 await ghost.prepare();window.ghostReady=true;
 button.addEventListener('click',async()=>{button.disabled=true;button.textContent='Summoning…';try{await ghost.summon()}finally{button.disabled=false;button.innerHTML='Summon the ghost <span aria-hidden="true">↗</span>'}});
 for(const [event,text] of [['summon','These letters were in the story.'],['boo','You startled it.'],['home','Every letter found its way home.'],['banish','Your words are all here. For now.']])ghost.addEventListener('ghost:'+event,()=>status.textContent=text);
 ghost.addEventListener('ghost:error',e=>status.textContent=e.detail.message);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)status.textContent='A quiet visitor. Your words stay where they are.';
})();
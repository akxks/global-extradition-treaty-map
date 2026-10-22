/* Appearance values follow Wikimedia Codex semantic color tokens. */
(function(){
'use strict';
const key='extradition-appearance';
let mode='auto';try{mode=localStorage.getItem(key)||'auto';}catch(_){}
if(!['auto','light','dark'].includes(mode))mode='auto';
const apply=()=>{document.documentElement.dataset.theme=mode;};apply();
document.addEventListener('DOMContentLoaded',()=>{const control=document.getElementById('appearance');if(!control)return;control.value=mode;control.addEventListener('change',()=>{mode=control.value;apply();try{localStorage.setItem(key,mode);}catch(_){};});});
})();

import {loadState,saveState} from './storage.js';

const VERSION='1.3.0';

export function renderReleaseNotice(root){
  if(!root)return;
  const state=loadState();
  const dismissed=state.app?.dismissedUpdates||[];
  if(dismissed.includes(VERSION)){root.innerHTML='';return}
  root.innerHTML=`<aside class="release-notice">
    <div><b>Next Level 10 V1.3</b><span>NOVA Coach : mission quotidienne, bilan sur 7 jours et conversation enrichie.</span></div>
    <button class="release-dismiss" aria-label="Fermer">×</button>
  </aside>`;
  root.querySelector('.release-dismiss').onclick=()=>{
    const latest=loadState();
    latest.app=latest.app||{};
    latest.app.dismissedUpdates=[...(latest.app.dismissedUpdates||[]),VERSION];
    saveState(latest);
    root.innerHTML='';
  };
}

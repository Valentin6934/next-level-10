import {loadState,saveState} from './storage.js';
import {planFor,normalizedDate} from './data.js';

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toISOString().slice(0,10);
const present=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v));

function uiState(){const s=loadState();s.ui={focusMode:true,lastPage:'home',...s.ui};return s}
export function rememberPage(page){const s=uiState();s.ui.lastPage=page;saveState(s)}
export function preferredPage(){return uiState().ui.lastPage||'home'}

function todayState(){
 const s=loadState(),d=today(),c=s.checkins?.[d]||{},p=s.pain?.[d]||{},plan=planFor(normalizedDate());
 const sleep=present(c.sleep)?Number(c.sleep):null,fatigue=present(c.fatigue)?Number(c.fatigue):null,motivation=present(c.motivation)?Number(c.motivation):null;
 const painKnown=Object.keys(p).length>0;
 const painAlert=painKnown&&(p.swelling||p.instability||p.locking||(present(p.run)&&Number(p.run)>=5)||p.trend==='Pire');
 const missing=[]; if(sleep===null)missing.push('sommeil'); if(fatigue===null)missing.push('fatigue'); if(!painKnown)missing.push('douleur');
 let mode='Données manquantes',tone='unknown',detail='NOVA ne déduit rien tant que ton check-in n’est pas complété.';
 if(painAlert){mode='Récupération',tone='danger',detail='Un signal douleur important est enregistré. Évite les efforts intenses.'}
 else if(!missing.length){
  if(sleep<6.5||fatigue>=8){mode='Alléger',tone='danger',detail='Récupération ou technique légère seulement.'}
  else if(sleep<8||fatigue>=6){mode='Adapter',tone='warning',detail='Réduis le volume et augmente les pauses.'}
  else{mode='Prêt',tone='ready',detail='Les données saisies sont compatibles avec la séance prévue.'}
 }
 return{s,d,c,p,plan,sleep,fatigue,motivation,painKnown,painAlert,missing,mode,tone,detail};
}

export function renderPersonalCockpit(root,{openPage,openConversation}={}){
 if(!root)return;
 const x=todayState();
 root.innerHTML=`<section class="personal-cockpit ${x.tone}">
  <div class="cockpit-top"><div><div class="eyebrow">NOVA • PRIORITÉ DU JOUR</div><h2>${esc(x.mode)}</h2><p>${esc(x.detail)}</p></div><span class="cockpit-status">${x.missing.length?x.missing.length+' donnée(s)':'ANALYSÉ'}</span></div>
  <div class="cockpit-session"><small>SÉANCE PRÉVUE</small><strong>${esc(x.plan.title)}</strong><span>${esc(String(x.plan.mins||'—'))} min • ${esc(x.plan.kind||'Entraînement')}</span></div>
  <div class="cockpit-actions">
   <button class="primary" data-cockpit="session">▶ LANCER LA SÉANCE</button>
   <button data-cockpit="talk">◉ PARLER À NOVA</button>
   <button data-cockpit="checkin">＋ CHECK-IN</button>
  </div>
  <div class="cockpit-facts">
   <span><small>SOMMEIL</small><b>${x.sleep===null?'Non renseigné':x.sleep+' h'}</b></span>
   <span><small>FATIGUE</small><b>${x.fatigue===null?'Non renseignée':x.fatigue+'/10'}</b></span>
   <span><small>DOULEUR</small><b>${!x.painKnown?'Non renseignée':x.painAlert?'Alerte':'Renseignée'}</b></span>
  </div>
 </section>`;
 root.querySelectorAll('[data-cockpit]').forEach(b=>b.onclick=()=>{
  const a=b.dataset.cockpit;
  if(a==='session')openPage?.('session');
  if(a==='talk')openConversation?.();
  if(a==='checkin')window.dispatchEvent(new CustomEvent('nl10:open-quick-checkin'));
 });
}

export function installPersonalUX({showPage,openConversation,showProfilePanel}={}){
 document.body.classList.add('personal-edition');
 document.addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.querySelector('.nova-fab')?.click()}
  if(e.key==='Escape')document.querySelector('.nova-hub-close:not(.hidden)')?.click();
 });
 document.querySelectorAll('[data-profile-target]').forEach(b=>b.addEventListener('click',()=>showProfilePanel?.(b.dataset.profileTarget)));
 const check=document.getElementById('homeOpenCheckin');if(check)check.onclick=()=>window.dispatchEvent(new CustomEvent('nl10:open-quick-checkin'));
 const resume=document.getElementById('resumeLastPage');if(resume)resume.onclick=()=>showPage?.(preferredPage());
}

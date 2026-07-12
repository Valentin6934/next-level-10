import {loadState,saveState} from './storage.js';
import {planFor,normalizedDate} from './data.js';
import {displayName} from './player.js';

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{
 const n=Number(v);
 return v!==''&&v!==null&&v!==undefined&&Number.isFinite(n)?n:null;
};
const today=()=>{
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

function ensureUi(state){
 state.ui={focusMode:true,novaHubSeen:false,...(state.ui||{})};
 return state.ui;
}

function context(state){
 const date=today(),check=state.checkins?.[date]||{},pain=state.pain?.[date]||null;
 const plan=planFor(normalizedDate());
 const sleep=num(check.sleep),fatigue=num(check.fatigue),motivation=num(check.motivation);
 const danger=!!(pain&&(pain.swelling||pain.instability||pain.locking||num(pain.run)>=5||pain.trend==='Pire'));
 const missing=[];
 if(sleep===null)missing.push('sommeil');
 if(fatigue===null)missing.push('fatigue');
 if(!pain)missing.push('douleurs');
 let status='À compléter',message='Renseigne tes données pour obtenir une recommandation fiable.';
 if(danger){status='Récupération';message='Un signal douleur important est enregistré : pas de travail intense.'}
 else if(sleep!==null&&fatigue!==null){
   if(sleep<6.5||fatigue>=8){status='Alléger';message='Récupération ou technique légère uniquement.'}
   else if(sleep<8||fatigue>=6){status='Adapter';message='Garde la séance, mais réduis le volume et augmente les pauses.'}
   else{status='Prêt';message='Tes données sont compatibles avec la séance prévue.'}
 }
 return{date,plan,sleep,fatigue,motivation,pain,danger,missing,status,message};
}

function applyFocusMode(enabled){
 document.body.classList.toggle('focus-mode',!!enabled);
}

export function renderInterfaceSettings(root){
 if(!root)return;
 const state=loadState(),ui=ensureUi(state);
 applyFocusMode(ui.focusMode);
 root.innerHTML=`<article class="panel interface-settings-card">
  <div class="actions between">
   <div><div class="eyebrow">INTERFACE</div><h3>Mode essentiel</h3><p>Masque les blocs secondaires pour garder NOVA, la séance et le planning au premier plan.</p></div>
   <label class="switch"><input class="focus-mode-toggle" type="checkbox" ${ui.focusMode?'checked':''}><span></span></label>
  </div>
 </article>`;
 root.querySelector('.focus-mode-toggle').onchange=e=>{
  const latest=loadState();ensureUi(latest).focusMode=e.target.checked;saveState(latest);
  applyFocusMode(e.target.checked);
 };
}

export function renderNovaHub(root,{openPage,openProfile,openConversation,refreshApp}={}){
 if(!root)return;
 const state=loadState(),ui=ensureUi(state),ctx=context(state),name=displayName(state.player);
 applyFocusMode(ui.focusMode);

 root.innerHTML=`<button class="nova-fab" aria-label="Ouvrir NOVA">
   <span>N</span><i></i>
  </button>
  <div class="nova-hub-backdrop hidden"></div>
  <aside class="nova-hub-drawer hidden" aria-hidden="true">
   <header>
    <div class="nova-hub-title">
     <div class="nova-hub-orb">N</div>
     <div><small>NOVA • COACH PERSONNEL</small><h2>${esc(name)}</h2></div>
    </div>
    <button class="nova-hub-close" aria-label="Fermer">×</button>
   </header>

   <section class="nova-hub-brief">
    <div><small>ÉTAT DU JOUR</small><strong>${ctx.status}</strong></div>
    <p>${ctx.message}</p>
    <span>${esc(ctx.plan.title)}</span>
   </section>

   <div class="nova-hub-actions">
    <button data-hub-action="talk"><span>◉</span><b>Parler avec NOVA</b><small>Conversation et voix</small></button>
    <button data-hub-action="session"><span>▶</span><b>Lancer la séance</b><small>${esc(ctx.plan.title)}</small></button>
    <button data-hub-action="checkin"><span>＋</span><b>Check-in rapide</b><small>Sommeil, fatigue, douleur</small></button>
    <button data-hub-action="planning"><span>▦</span><b>Voir le planning</b><small>Calendrier et journée</small></button>
   </div>

   <section class="nova-hub-data">
    <div><small>SOMMEIL</small><b>${ctx.sleep===null?'—':ctx.sleep+' h'}</b></div>
    <div><small>FATIGUE</small><b>${ctx.fatigue===null?'—':ctx.fatigue+'/10'}</b></div>
    <div><small>DOULEUR</small><b>${ctx.pain?(ctx.danger?'Alerte':'Renseignée'):'—'}</b></div>
   </section>

   ${ctx.missing.length?`<p class="nova-hub-missing">Il manque : ${ctx.missing.join(', ')}.</p>`:''}

   <footer>
    <button class="ghost-button" data-hub-action="profile">PROFIL</button>
    <button class="ghost-button" data-hub-action="refresh">RÉANALYSER</button>
   </footer>
  </aside>`;

 const fab=root.querySelector('.nova-fab');
 const drawer=root.querySelector('.nova-hub-drawer');
 const backdrop=root.querySelector('.nova-hub-backdrop');
 const open=()=>{
  drawer.classList.remove('hidden');backdrop.classList.remove('hidden');
  drawer.setAttribute('aria-hidden','false');
 };
 const close=()=>{
  drawer.classList.add('hidden');backdrop.classList.add('hidden');
  drawer.setAttribute('aria-hidden','true');
 };
 fab.onclick=open;
 backdrop.onclick=close;
 root.querySelector('.nova-hub-close').onclick=close;
 root.querySelectorAll('[data-hub-action]').forEach(button=>button.onclick=()=>{
  const action=button.dataset.hubAction;
  close();
  if(action==='talk')openConversation?.();
  if(action==='session')openPage?.('session');
  if(action==='checkin')window.dispatchEvent(new CustomEvent('nl10:open-quick-checkin'));
  if(action==='planning')openPage?.('calendar');
  if(action==='profile')openProfile?.('settings');
  if(action==='refresh')refreshApp?.();
 });
}

export function renderQuickCheckin(root,{onSaved}={}){
 if(!root)return;
 const state=loadState(),date=today(),check=state.checkins?.[date]||{},pain=state.pain?.[date]||{};
 root.innerHTML=`<div class="quick-checkin-overlay hidden">
  <section class="quick-checkin-card">
   <div class="actions between">
    <div><div class="eyebrow">CHECK-IN RAPIDE</div><h2>Comment tu te sens ?</h2></div>
    <button class="quick-checkin-close">×</button>
   </div>
   <div class="quick-checkin-grid">
    <label>Sommeil (h)<input id="quickSleep" type="number" min="0" max="14" step=".25" value="${esc(check.sleep||'')}"></label>
    <label>Fatigue /10<input id="quickFatigue" type="number" min="0" max="10" value="${esc(check.fatigue||'')}"></label>
    <label>Motivation /10<input id="quickMotivation" type="number" min="0" max="10" value="${esc(check.motivation||'')}"></label>
    <label>Douleur en courant /10<input id="quickPainRun" type="number" min="0" max="10" value="${esc(pain.run||'')}"></label>
   </div>
   <div class="quick-safety">
    <label class="check"><input id="quickSwelling" type="checkbox" ${pain.swelling?'checked':''}>Gonflement</label>
    <label class="check"><input id="quickInstability" type="checkbox" ${pain.instability?'checked':''}>Instabilité</label>
    <label class="check"><input id="quickLocking" type="checkbox" ${pain.locking?'checked':''}>Blocage</label>
   </div>
   <button class="primary quick-checkin-save">ENREGISTRER ET RÉANALYSER</button>
  </section>
 </div>`;

 const overlay=root.querySelector('.quick-checkin-overlay');
 const close=()=>overlay.classList.add('hidden');
 root.querySelector('.quick-checkin-close').onclick=close;
 overlay.onclick=e=>{if(e.target===overlay)close()};
 window.addEventListener('nl10:open-quick-checkin',()=>overlay.classList.remove('hidden'));

 root.querySelector('.quick-checkin-save').onclick=()=>{
  const latest=loadState();
  latest.checkins=latest.checkins||{};
  latest.pain=latest.pain||{};
  latest.checkins[date]={
   ...(latest.checkins[date]||{}),
   sleep:root.querySelector('#quickSleep').value,
   fatigue:root.querySelector('#quickFatigue').value,
   motivation:root.querySelector('#quickMotivation').value
  };
  latest.pain[date]={
   ...(latest.pain[date]||{}),
   run:root.querySelector('#quickPainRun').value,
   swelling:root.querySelector('#quickSwelling').checked,
   instability:root.querySelector('#quickInstability').checked,
   locking:root.querySelector('#quickLocking').checked,
   trend:latest.pain[date]?.trend||'Stable'
  };
  saveState(latest);
  close();
  onSaved?.();
  window.dispatchEvent(new CustomEvent('nl10:checkin-saved'));
 };
}

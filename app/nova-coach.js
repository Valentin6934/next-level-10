import {loadState,saveState} from './storage.js';
import {planFor,normalizedDate} from './data.js';
import {analyzeRecovery} from './recovery-intelligence.js';

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const num=v=>{const n=Number(v);return v!==''&&v!==null&&v!==undefined&&Number.isFinite(n)?n:null};
const average=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;

function missionFor(state){
 const date=dayKey(),check=state.checkins?.[date]||{},plan=planFor(normalizedDate()),recovery=analyzeRecovery(state,date);
 const fatigue=num(check.fatigue),sleep=num(check.sleep);
 if(recovery.status==='STOP')return{kind:'recovery',priority:1,title:'Stop intensité',detail:`${recovery.recommendation} ${recovery.signals.length?'Signaux : '+recovery.signals.join(', ')+'.':''}`,xp:10};
 if(recovery.missing)return{kind:'checkin',priority:1,title:'Compléter ton check-in',detail:'Renseigne sommeil, fatigue et courbatures pour débloquer une recommandation fiable.',xp:5};
 if(recovery.status==='RÉCUPÉRER')return{kind:'recovery',priority:1,title:'Récupération active',detail:'15 minutes de mobilité douce, hydratation et coucher avancé. Aucun travail maximal.',xp:10};
 if(recovery.status==='ADAPTER')return{kind:'light',priority:2,title:'Séance maîtrisée',detail:`Effectue « ${plan.title} » à environ 70–80 % du volume. ${recovery.workload.message}`,xp:20};
 const focus=(state.player?.position||'milieu').toLowerCase().includes('moc')?'prise d’information avant contrôle':'qualité du premier contrôle';
 return{kind:'training',priority:3,title:'Mission terrain',detail:`Pendant « ${plan.title} », concentre-toi sur la ${focus}. Termine par un débrief de 2 minutes.`,xp:25};
}

function weeklyReport(state){
 const dates=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);dates.push(dayKey(d))}
 const checks=dates.map(d=>state.checkins?.[d]).filter(Boolean);
 const sleeps=checks.map(x=>num(x.sleep)).filter(x=>x!==null),fatigues=checks.map(x=>num(x.fatigue)).filter(x=>x!==null);
 const done=dates.filter(d=>Object.keys(state.done||{}).some(k=>k.startsWith(d)&&state.done[k])).length;
 const recovery=analyzeRecovery(state,dayKey());
 const avgSleep=average(sleeps),avgFatigue=average(fatigues);
 let headline='Historique insuffisant',advice='Complète au moins trois check-ins pour obtenir une tendance.';
 if(checks.length>=3){
  if(recovery.signals.includes('signal douleur')){headline='Priorité récupération';advice='Un signal douleur important est présent aujourd’hui.'}
  else if((avgSleep!==null&&avgSleep<7)||(avgFatigue!==null&&avgFatigue>=7)){headline='Charge à surveiller';advice='Ta récupération moyenne invite à réduire le volume et à protéger le sommeil.'}
  else{headline='Semaine stable';advice=recovery.workload.message}
 }
 return{checks:checks.length,done,avgSleep,avgFatigue,headline,advice,recovery};
}

function ensureCoach(state){state.novaCoach={missions:{},...state.novaCoach};return state.novaCoach}
export function renderNovaCoach(root,{openPage}={}){
 if(!root)return;
 const state=loadState(),coach=ensureCoach(state),date=dayKey(),generated=missionFor(state);
 const previous=coach.missions[date]||{};
 coach.missions[date]={...generated,completed:!!previous.completed};saveState(state);
 const mission=coach.missions[date],report=weeklyReport(state),complete=!!mission.completed;
 root.innerHTML=`<section class="nova-coach-v13 nova-coach-s31">
  <div class="coach-v13-head"><div><div class="eyebrow">NOVA COACH • SPRINT 3.1</div><h2>Ton plan d’action priorisé</h2></div><span>${complete?'MISSION TERMINÉE':'PRIORITÉ '+mission.priority}</span></div>
  <article class="daily-mission ${complete?'completed':''}">
   <div class="mission-check">${complete?'✓':'0'+mission.priority}</div><div><small>MISSION DU JOUR</small><h3>${esc(mission.title)}</h3><p>${esc(mission.detail)}</p></div>
   <button class="primary" data-coach="mission">${complete?'ANNULER':'TERMINER'} • ${mission.xp} XP</button>
  </article>
  <div class="coach-v13-grid">
   <article><small>BILAN 7 JOURS</small><h3>${esc(report.headline)}</h3><p>${esc(report.advice)}</p><div class="weekly-facts"><span><b>${report.checks}</b> check-ins</span><span><b>${report.done}</b> jours actifs</span><span><b>${report.avgSleep===null?'—':report.avgSleep.toFixed(1)+' h'}</b> sommeil</span><span><b>${report.recovery.score}/100</b> récupération</span></div></article>
   <article><small>FIABILITÉ NOVA</small><h3>${report.recovery.confidence}</h3><p>${report.recovery.missing?'Ajoute les données manquantes pour fiabiliser la décision.':'Décision basée sur ton état du jour et ta charge sur 28 jours.'}</p><button data-coach="next">${report.recovery.missing?'OUVRIR LE CHECK-IN':'VOIR LA PROGRESSION'}</button></article>
  </div>
 </section>`;
 root.querySelector('[data-coach="mission"]').onclick=()=>{
  const latest=loadState(),c=ensureCoach(latest),m=c.missions[date]||generated;m.completed=!m.completed;c.missions[date]=m;
  if(m.completed)latest.xp=(Number(latest.xp)||0)+Number(m.xp||0);else latest.xp=Math.max(0,(Number(latest.xp)||0)-Number(m.xp||0));
  saveState(latest);renderNovaCoach(root,{openPage});window.dispatchEvent(new CustomEvent('nl10:coach-updated'));
 };
 root.querySelector('[data-coach="next"]').onclick=()=>report.recovery.missing?window.dispatchEvent(new CustomEvent('nl10:open-quick-checkin')):openPage?.('progress');
}

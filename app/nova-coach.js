import {loadState,saveState} from './storage.js';
import {planFor,normalizedDate} from './data.js';

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const num=v=>{const n=Number(v);return v!==''&&v!==null&&v!==undefined&&Number.isFinite(n)?n:null};
const average=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;

function painRisk(p){return !!(p&&(p.swelling||p.instability||p.locking||num(p.run)>=5||p.trend==='Pire'))}
function missionFor(state){
 const date=dayKey(),check=state.checkins?.[date]||{},pain=state.pain?.[date]||null,plan=planFor(normalizedDate());
 const fatigue=num(check.fatigue),sleep=num(check.sleep);
 if(painRisk(pain))return{kind:'recovery',title:'Protéger ta récupération',detail:'Pas d’intensité. Fais 10 minutes de mobilité douce et note l’évolution de la douleur.',xp:10};
 if(sleep===null||fatigue===null)return{kind:'checkin',title:'Compléter ton check-in',detail:'Renseigne ton sommeil et ta fatigue pour débloquer une recommandation fiable.',xp:5};
 if(sleep<6.5||fatigue>=8)return{kind:'recovery',title:'Récupération active',detail:'15 minutes de mobilité, hydratation et coucher avancé. Aucun travail maximal.',xp:10};
 if(sleep<8||fatigue>=6)return{kind:'light',title:'Séance maîtrisée',detail:`Effectue « ${plan.title} » à environ 70 % du volume prévu.`,xp:20};
 const focus=(state.player?.position||'milieu').toLowerCase().includes('moc')?'prise d’information avant contrôle':'qualité du premier contrôle';
 return{kind:'training',title:'Mission terrain',detail:`Pendant « ${plan.title} », concentre-toi sur la ${focus}.`,xp:25};
}

function weeklyReport(state){
 const dates=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);dates.push(dayKey(d))}
 const checks=dates.map(d=>state.checkins?.[d]).filter(Boolean);
 const sleeps=checks.map(x=>num(x.sleep)).filter(x=>x!==null),fatigues=checks.map(x=>num(x.fatigue)).filter(x=>x!==null);
 const done=dates.filter(d=>Object.keys(state.done||{}).some(k=>k.startsWith(d)&&state.done[k])).length;
 const painAlerts=dates.filter(d=>painRisk(state.pain?.[d])).length;
 const avgSleep=average(sleeps),avgFatigue=average(fatigues);
 let headline='Historique insuffisant',advice='Complète au moins trois check-ins pour obtenir une tendance.';
 if(checks.length>=3){
  if(painAlerts){headline='Priorité récupération';advice=`${painAlerts} jour(s) avec signal douleur important cette semaine.`}
  else if((avgSleep!==null&&avgSleep<7)||(avgFatigue!==null&&avgFatigue>=7)){headline='Charge à surveiller';advice='Ta récupération moyenne invite à réduire le volume et à protéger le sommeil.'}
  else{headline='Semaine stable';advice='Tes données récentes ne montrent pas de signal majeur. Continue sans ajouter de charge inutile.'}
 }
 return{checks:checks.length,done,painAlerts,avgSleep,avgFatigue,headline,advice};
}

function ensureCoach(state){state.novaCoach={missions:{},...state.novaCoach};return state.novaCoach}
export function renderNovaCoach(root,{openPage}={}){
 if(!root)return;
 const state=loadState(),coach=ensureCoach(state),date=dayKey(),generated=missionFor(state);
 coach.missions[date]={...generated,...(coach.missions[date]||{})};saveState(state);
 const mission=coach.missions[date],report=weeklyReport(state),complete=!!mission.completed;
 root.innerHTML=`<section class="nova-coach-v13">
  <div class="coach-v13-head"><div><div class="eyebrow">NOVA COACH • V1.3</div><h2>Ton plan d’action</h2></div><span>${complete?'MISSION TERMINÉE':'EN COURS'}</span></div>
  <article class="daily-mission ${complete?'completed':''}">
   <div class="mission-check">${complete?'✓':'01'}</div><div><small>MISSION DU JOUR</small><h3>${esc(mission.title)}</h3><p>${esc(mission.detail)}</p></div>
   <button class="primary" data-coach="mission">${complete?'ANNULER':'TERMINER'} • ${mission.xp} XP</button>
  </article>
  <div class="coach-v13-grid">
   <article><small>BILAN 7 JOURS</small><h3>${esc(report.headline)}</h3><p>${esc(report.advice)}</p><div class="weekly-facts"><span><b>${report.checks}</b> check-ins</span><span><b>${report.done}</b> jours actifs</span><span><b>${report.avgSleep===null?'—':report.avgSleep.toFixed(1)+' h'}</b> sommeil</span></div></article>
   <article><small>PROCHAINE ACTION</small><h3>${report.checks<3?'Créer un historique':'Analyser ta progression'}</h3><p>${report.checks<3?'Complète ton check-in chaque jour.':'Consulte tes tendances et tes tests pour décider du prochain axe de travail.'}</p><button data-coach="next">${report.checks<3?'OUVRIR LE CHECK-IN':'VOIR LA PROGRESSION'}</button></article>
  </div>
 </section>`;
 root.querySelector('[data-coach="mission"]').onclick=()=>{
  const latest=loadState(),c=ensureCoach(latest),m=c.missions[date]||generated;m.completed=!m.completed;c.missions[date]=m;
  if(m.completed)latest.xp=(Number(latest.xp)||0)+Number(m.xp||0);else latest.xp=Math.max(0,(Number(latest.xp)||0)-Number(m.xp||0));
  saveState(latest);renderNovaCoach(root,{openPage});window.dispatchEvent(new CustomEvent('nl10:coach-updated'));
 };
 root.querySelector('[data-coach="next"]').onclick=()=>report.checks<3?window.dispatchEvent(new CustomEvent('nl10:open-quick-checkin')):openPage?.('progress');
}

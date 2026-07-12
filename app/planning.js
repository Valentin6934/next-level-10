import {loadState,saveState} from './storage.js';
import {planFor,menuFor,normalizedDate,club} from './data.js';

const localDate=()=>{
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const pad=n=>String(n).padStart(2,'0');
const toMin=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};
const toClock=m=>`${pad(Math.floor((m+1440)%1440/60))}:${pad((m+1440)%60)}`;

function loadScore(state,days=3){
 let total=0,d=new Date();
 for(let i=0;i<days;i++){
  const key=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const c=state.checkins?.[key]||{};
  total+=(+c.rpe||0)*(+c.minutes||0);
  d.setDate(d.getDate()-1);
 }
 return total;
}

function painLevel(state,date){
 const p=state.pain?.[date]||{};
 if(p.swelling||p.instability||p.locking||+p.run>=5||p.trend==='Pire')return'high';
 if(+p.run>=2||+p.post>=2||+p.rest>=2)return'mid';
 return'low';
}

function clubTime(date){
 const text=club?.[date]||'';
 const match=text.match(/(\d{1,2}) h(?: (\d{1,2}))?/);
 if(!match)return null;
 return `${pad(+match[1])}:${pad(+(match[2]||0))}`;
}

function chooseTrainingTime({date,plan,temp,humidity,rain,wind,state}){
 const fixed=clubTime(date);
 if(fixed)return{time:fixed,fixed:true,reason:'Horaire imposé par le club'};
 const pain=painLevel(state,date),check=state.checkins?.[date]||{};
 const fatigue=+check.fatigue||0,sleep=+check.sleep||0;
 let time='10:00',reason='Conditions normales';
 if(plan.kind==='Repos'||plan.kind==='Récupération')return{time:'10:30',fixed:false,reason:'Créneau léger de récupération'};
 if(temp>=35||(temp>=32&&humidity>=60)){time='08:00';reason:'Très forte chaleur : séance tôt le matin'}
 else if(temp>=30||(temp>=27&&humidity>=70)){time='08:30';reason:'Chaleur/humidité élevées'}
 else if(rain>=70){time='17:30';reason:'Pluie probable : créneau décalé et solution abritée'}
 else if(wind>=45){time='16:30';reason:'Vent fort : horaire plus calme si possible'}
 else if(sleep&&sleep<7){time='17:00';reason:'Nuit courte : récupération supplémentaire avant la séance'}
 else if(fatigue>=7||pain==='mid'){time='16:30';reason:'Fatigue/douleur modérée : journée plus progressive'}
 return{time,fixed:false,reason};
}

function adaptationLevel({state,date,temp,humidity,rain,wind,plan}){
 const check=state.checkins?.[date]||{},pain=painLevel(state,date);
 const sleep=+check.sleep||0,fatigue=+check.fatigue||0,soreness=+check.soreness||0,load3=loadScore(state,3);
 let level='normal',volume=100,reasons=[],indoor=false;
 if(pain==='high'){
  level='recovery';volume=35;reasons.push('douleur ou signal articulaire important');
 }else if((sleep&&sleep<6.5)||fatigue>=8||soreness>=8||temp>=35){
  level='recovery';volume=45;reasons.push('récupération insuffisante');
 }else{
  if((sleep&&sleep<8)||fatigue>=6||soreness>=6||load3>1500||temp>=30){
   level='reduced';volume=70;
  }
  if(sleep&&sleep<8)reasons.push(`sommeil ${sleep} h`);
  if(fatigue>=6)reasons.push(`fatigue ${fatigue}/10`);
  if(soreness>=6)reasons.push(`courbatures ${soreness}/10`);
  if(load3>1500)reasons.push(`charge 3 jours ${load3}`);
  if(temp>=30)reasons.push(`chaleur ${temp} °C`);
 }
 if(rain>=70||wind>=45){indoor=true;reasons.push(rain>=70?'pluie probable':'vent fort')}
 if(!reasons.length)reasons.push('données compatibles avec la séance prévue');
 return{level,volume,reasons,indoor};
}

function hydrationTarget(temp,plan){
 let liters=2.0;
 if(plan.mins>=60)liters+=0.3;
 if(temp>=28)liters+=0.4;
 if(temp>=32)liters+=0.3;
 return Math.round(liters*10)/10;
}

function buildSchedule({date,plan,menu,time,adapt,temp,humidity,rain,wind}){
 const start=toMin(time);
 const effectiveMins=Math.max(25,Math.round(plan.mins*adapt.volume/100));
 const sessionEnd=start+effectiveMins;
 const videoStart=sessionEnd+15;
 const mealAfter=Math.max(videoStart+20,19*60+30);
 const breakfast='08:15';
 const lunch='12:30';
 const snack=toClock(Math.max(15*60+15,start-90));
 const wake='08:00';
 const bedtime=adapt.level==='recovery'?'22:15':'22:30';
 const items=[
  [wake,'Réveil','Eau, lumière naturelle et check-in rapide.','routine'],
  [breakfast,'Petit-déjeuner',menu.breakfast,'meal'],
  [lunch,'Déjeuner',menu.lunch,'meal'],
  [snack,'Collation',menu.snack,'meal'],
  [time,'Séance',`${plan.title} • volume ${adapt.volume}%`,'training'],
  [toClock(sessionEnd),'Retour au calme','Marche, hydratation et débrief.','recovery'],
  [toClock(videoStart),'Analyse vidéo','Mission liée au thème de la séance.','video'],
  [toClock(mealAfter),'Dîner / récupération',menu.dinner,'meal'],
  ['21:30','Routine du soir','Préparer le sac, réduire les écrans et relâcher le corps.','routine'],
  [bedtime,'Coucher','Objectif : environ 8 à 10 heures.','sleep']
 ].sort((a,b)=>a[0].localeCompare(b[0]));
 return{items,effectiveMins,sessionEnd,videoStart};
}

export function computeSmartPlan(){
 const state=loadState(),date=normalizedDate(),plan=planFor(date),menu=menuFor(date);
 state.weather=state.weather||{};
 const temp=+state.weather.temp||24;
 const humidity=+state.weather.humidity||50;
 const rain=+state.weather.rain||0;
 const wind=+state.weather.wind||0;
 const timing=chooseTrainingTime({date,plan,temp,humidity,rain,wind,state});
 const adapt=adaptationLevel({state,date,temp,humidity,rain,wind,plan});
 const schedule=buildSchedule({date,plan,menu,time:timing.time,adapt,temp,humidity,rain,wind});
 return{
  date,plan,menu,temp,humidity,rain,wind,timing,adapt,schedule,
  water:hydrationTarget(temp,plan),
  indoorAlternative:adapt.indoor?'Technique petit espace, mobilité et passes contre cible à l’abri.':'Non nécessaire'
 };
}

function statusText(level){
 if(level==='recovery')return['ROUGE','Récupération / technique légère uniquement'];
 if(level==='reduced')return['ORANGE','Séance maintenue avec volume réduit'];
 return['VERT','Séance prévue autorisée'];
}

export function applySmartPlan(){
 const result=computeSmartPlan(),state=loadState();
 state.smartPlanning=state.smartPlanning||{};
 state.smartPlanning[result.date]={
  accepted:true,
  time:result.timing.time,
  volume:result.adapt.volume,
  level:result.adapt.level,
  indoor:result.adapt.indoor,
  items:result.schedule.items,
  water:result.water,
  acceptedAt:new Date().toISOString()
 };
 saveState(state);
 return result;
}

export function renderSmartPlanning(root,compact=false){
 try{
  const result=computeSmartPlan(),state=loadState();
  const accepted=state.smartPlanning?.[result.date]?.accepted;
  const [status,label]=statusText(result.adapt.level);
  if(compact){
   root.innerHTML=`<article class="smart-plan-home">
    <div><div class="eyebrow">PLANNING INTELLIGENT</div><h3>${label}</h3><p>${result.timing.time} • ${result.adapt.volume}% du volume • ${result.water} L d’eau cible</p></div>
    <button class="secondary open-smart-day">VOIR</button>
   </article>`;
   root.querySelector('.open-smart-day').onclick=()=>window.dispatchEvent(new CustomEvent('nl10:open-smart-day'));
   return;
  }

  root.innerHTML=`<article class="smart-plan-card level-${result.adapt.level}">
   <div class="actions between">
    <div><div class="eyebrow">PLANNING INTELLIGENT</div><h2>${label}</h2></div>
    <span class="pill">${status}</span>
   </div>
   <div class="smart-plan-grid">
    <div><small>HEURE SÉANCE</small><strong>${result.timing.time}</strong><span>${result.timing.reason}</span></div>
    <div><small>VOLUME</small><strong>${result.adapt.volume}%</strong><span>${result.adapt.reasons.join(' • ')}</span></div>
    <div><small>HYDRATATION</small><strong>${result.water} L</strong><span>Objectif quotidien indicatif</span></div>
    <div><small>ALTERNATIVE</small><strong>${result.adapt.indoor?'INTÉRIEUR':'EXTÉRIEUR'}</strong><span>${result.indoorAlternative}</span></div>
   </div>
   <div class="smart-plan-actions">
    <button class="primary accept-smart-plan">${accepted?'PLANNING ACCEPTÉ ✓':'ACCEPTER CE PLANNING'}</button>
    <button class="secondary keep-original-plan">GARDER LE PLANNING DE BASE</button>
   </div>
   <p class="muted">L’application explique ses choix et ne modifie jamais un horaire du club.</p>
  </article>`;

  root.querySelector('.accept-smart-plan').onclick=()=>{
   applySmartPlan();
   renderSmartPlanning(root,false);
   window.dispatchEvent(new CustomEvent('nl10:smart-plan-updated'));
  };
  root.querySelector('.keep-original-plan').onclick=()=>{
   const latest=loadState();
   latest.smartPlanning=latest.smartPlanning||{};
   latest.smartPlanning[result.date]={accepted:false,rejectedAt:new Date().toISOString()};
   saveState(latest);
   renderSmartPlanning(root,false);
   window.dispatchEvent(new CustomEvent('nl10:smart-plan-updated'));
  };
 }catch(error){
  console.error('Planning intelligent indisponible:',error);
  root.innerHTML='<div class="notice"><b class="warn">PLANNING INTELLIGENT TEMPORAIREMENT INDISPONIBLE</b><p>Le planning de base reste disponible.</p></div>';
 }
}

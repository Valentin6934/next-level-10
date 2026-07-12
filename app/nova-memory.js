import {loadState,saveState} from './storage.js';
import {planFor,normalizedDate} from './data.js';

const pad=n=>String(n).padStart(2,'0');
const localDate=()=>{
 const d=new Date();
 return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};
const num=v=>{
 const n=Number(v);
 return v!==''&&v!==null&&v!==undefined&&Number.isFinite(n)?n:null;
};
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;

function lastDates(days){
 const out=[],d=new Date();
 for(let i=0;i<days;i++){
  out.unshift(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
  d.setDate(d.getDate()-1);
 }
 return out;
}

function buildTrends(state,days=14){
 const dates=lastDates(days);
 const points=dates.map(date=>{
  const c=state.checkins?.[date]||{};
  const r=state.reviews?.[date]||{};
  const meals=Object.values(state.nutrition?.[date]?.meals||{}).filter(x=>x.validated).length;
  return{
   date,
   sleep:num(c.sleep),
   fatigue:num(c.fatigue),
   motivation:num(c.motivation),
   soreness:num(c.soreness),
   rpe:num(c.rpe),
   minutes:num(c.minutes),
   tech:num(r.tech),
   focus:num(r.focus),
   meals,
   done:!!state.done?.[date]
  };
 });
 const first=points.slice(0,Math.ceil(points.length/2));
 const second=points.slice(Math.ceil(points.length/2));
 const metric=(list,key)=>avg(list.map(x=>x[key]).filter(v=>v!==null));
 const delta=(key)=>{
  const a=metric(first,key),b=metric(second,key);
  return a===null||b===null?null:b-a;
 };
 return{
  dates,points,
  sleep:metric(second,'sleep'),
  fatigue:metric(second,'fatigue'),
  motivation:metric(second,'motivation'),
  tech:metric(second,'tech'),
  focus:metric(second,'focus'),
  load:second.reduce((s,x)=>s+(x.rpe||0)*(x.minutes||0),0),
  completion:Math.round(second.filter(x=>x.done).length/second.length*100),
  meals:second.reduce((s,x)=>s+x.meals,0),
  deltas:{
   sleep:delta('sleep'),
   fatigue:delta('fatigue'),
   tech:delta('tech'),
   focus:delta('focus')
  }
 };
}

function generateInsights(state,trends){
 const insights=[];
 if(trends.deltas.sleep!==null){
  if(trends.deltas.sleep>=.4)insights.push({type:'up',title:'Sommeil en hausse',text:`+${trends.deltas.sleep.toFixed(1)} h par rapport à la semaine précédente.`});
  if(trends.deltas.sleep<=-.4)insights.push({type:'down',title:'Sommeil en baisse',text:`${trends.deltas.sleep.toFixed(1)} h par rapport à la semaine précédente.`});
 }
 if(trends.deltas.fatigue!==null){
  if(trends.deltas.fatigue>=1)insights.push({type:'down',title:'Fatigue en hausse',text:`+${trends.deltas.fatigue.toFixed(1)} point sur la période récente.`});
  if(trends.deltas.fatigue<=-1)insights.push({type:'up',title:'Fatigue mieux maîtrisée',text:`${trends.deltas.fatigue.toFixed(1)} point sur la période récente.`});
 }
 if(trends.deltas.tech!==null){
  if(trends.deltas.tech>=.7)insights.push({type:'up',title:'Technique en progression',text:`+${trends.deltas.tech.toFixed(1)} point sur tes débriefs.`});
  if(trends.deltas.tech<=-.7)insights.push({type:'down',title:'Technique à relancer',text:`${trends.deltas.tech.toFixed(1)} point sur tes débriefs.`});
 }
 if(trends.completion>=80)insights.push({type:'up',title:'Régularité solide',text:`${trends.completion}% des journées prévues terminées récemment.`});
 if(trends.completion<50)insights.push({type:'down',title:'Régularité fragile',text:`Seulement ${trends.completion}% des journées prévues terminées récemment.`});
 if(!insights.length)insights.push({type:'neutral',title:'Pas assez de recul',text:'Continue à remplir tes check-ins et débriefs pour faire apparaître de vraies tendances.'});
 return insights.slice(0,4);
}

function smartGoals(state,trends){
 const goals=[];
 if(trends.sleep!==null&&trends.sleep<8)goals.push({scope:'Aujourd’hui',title:'Récupération',target:'Préparer un coucher permettant 8 h ou plus.',why:'Ton sommeil récent est sous le niveau conseillé.'});
 if(trends.fatigue!==null&&trends.fatigue>=6)goals.push({scope:'Aujourd’hui',title:'Qualité avant volume',target:'Arrêter une série si la qualité technique baisse.',why:'Ta fatigue récente est élevée.'});
 if(trends.meals<14)goals.push({scope:'Cette semaine',title:'Nutrition régulière',target:'Valider au moins 3 repas par jour sur 5 jours.',why:'La régularité alimentaire manque encore de preuves.'});
 if(trends.completion<75)goals.push({scope:'Cette semaine',title:'Régularité',target:'Terminer 5 journées prévues sur 7.',why:'La constance est le levier principal avant d’ajouter de la charge.'});
 if(trends.tech!==null&&trends.tech<7)goals.push({scope:'Cette semaine',title:'Technique propre',target:'Obtenir au moins 7/10 sur 3 débriefs.',why:'La qualité technique doit progresser avant la quantité.'});
 if(!goals.length)goals.push({scope:'Cette semaine',title:'Maintenir le niveau',target:'Conserver la régularité sans ajouter de séance bonus.',why:'Les indicateurs récents sont cohérents.'});
 goals.push({scope:'Avant la reprise',title:'Profil numéro 10',target:'Associer contrôle orienté, scan et première accélération dans les séances clés.',why:'C’est le lien direct avec ton objectif U18 R1.'});
 return goals.slice(0,4);
}

export function buildNovaMemory(state=loadState()){
 const trends=buildTrends(state,14);
 const insights=generateInsights(state,trends);
 const goals=smartGoals(state,trends);
 const summary={
  sessions:Object.values(state.done||{}).filter(Boolean).length,
  tests:(state.tests||[]).length,
  videos:(state.videoAnalyses||[]).length,
  conversation:(state.novaConversation||[]).length,
  avgSleep:trends.sleep,
  avgFatigue:trends.fatigue,
  completion:trends.completion,
  load:trends.load
 };
 return{trends,insights,goals,summary};
}

export function refreshNovaMemory(){
 const state=loadState();
 state.novaMemory=buildNovaMemory(state);
 state.novaMemory.updatedAt=new Date().toISOString();
 saveState(state);
 return state.novaMemory;
}

export function renderNovaMemory(root){
 try{
  const memory=refreshNovaMemory();
  root.innerHTML=`<section class="nova-memory-card">
   <div class="actions between">
    <div><div class="eyebrow">NOVA MEMORY ENGINE</div><h2>Ce que NOVA retient de ta progression</h2></div>
    <span class="pill">${memory.summary.sessions} séances</span>
   </div>

   <div class="memory-kpis">
    <div><small>SOMMEIL MOYEN</small><strong>${memory.summary.avgSleep===null?'—':memory.summary.avgSleep.toFixed(1)+' h'}</strong></div>
    <div><small>FATIGUE MOYENNE</small><strong>${memory.summary.avgFatigue===null?'—':memory.summary.avgFatigue.toFixed(1)+'/10'}</strong></div>
    <div><small>RÉGULARITÉ</small><strong>${memory.summary.completion}%</strong></div>
    <div><small>CHARGE RÉCENTE</small><strong>${memory.summary.load}</strong></div>
   </div>

   <div class="grid two gap">
    <article class="panel">
     <div class="eyebrow">TENDANCES DÉTECTÉES</div>
     <div class="memory-insights">
      ${memory.insights.map(i=>`<div class="${i.type}"><span>${i.type==='up'?'↗':i.type==='down'?'↘':'•'}</span><section><b>${i.title}</b><p>${i.text}</p></section></div>`).join('')}
     </div>
    </article>

    <article class="panel">
     <div class="eyebrow">OBJECTIFS INTELLIGENTS</div>
     <div class="memory-goals">
      ${memory.goals.map(g=>`<div><small>${g.scope}</small><b>${g.title}</b><p>${g.target}</p><em>${g.why}</em></div>`).join('')}
     </div>
    </article>
   </div>

   <article class="memory-proof-strip">
    <span><b>${memory.summary.tests}</b> tests</span>
    <span><b>${memory.summary.videos}</b> analyses vidéo</span>
    <span><b>${memory.summary.conversation}</b> messages NOVA</span>
    <span><b>${memory.summary.sessions}</b> séances validées</span>
   </article>
  </section>`;
 }catch(error){
  console.error('Mémoire NOVA indisponible:',error);
  root.innerHTML='<div class="notice"><b class="warn">MÉMOIRE NOVA TEMPORAIREMENT INDISPONIBLE</b><p>Le reste de l’application fonctionne normalement.</p></div>';
 }
}

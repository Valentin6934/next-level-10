import {calculateRatings,RATING_NAMES} from './ratings.js';

const iso=d=>d.toISOString().slice(0,10);
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;

function datesBack(days){const out=[];const d=new Date();for(let i=days-1;i>=0;i--){const x=new Date(d);x.setDate(d.getDate()-i);out.push(iso(x))}return out}
function weekKey(date){const d=new Date(date+'T12:00:00');const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return iso(d)}
function groupByWeek(dates){const map={};for(const d of dates){const k=weekKey(d);(map[k]||=[]).push(d)}return map}
function spark(values,width=320,height=90){if(!values.length)return'';const max=Math.max(...values,1),min=Math.min(...values,0),range=Math.max(1,max-min),pts=values.map((v,i)=>`${i*(width/(Math.max(1,values.length-1)))},${height-((v-min)/range)*(height-12)-6}`).join(' ');return `<svg class="perf-spark" viewBox="0 0 ${width} ${height}" role="img" aria-label="Évolution sur plusieurs semaines"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`}

export function buildPerformance(state){
 const dates=datesBack(35),weeks=groupByWeek(dates),ratings=calculateRatings(state);
 const weekly=Object.entries(weeks).map(([week,ds])=>{
   const sessions=ds.filter(d=>state.done?.[d]).length;
   const load=ds.reduce((n,d)=>{const c=state.checkins?.[d]||{};return n+(+c.rpe||0)*(+c.minutes||0)},0);
   const sleepVals=ds.map(d=>+state.checkins?.[d]?.sleep).filter(Boolean);
   const meals=ds.reduce((n,d)=>n+Object.values(state.nutrition?.[d]?.meals||{}).filter(x=>x.validated).length,0);
   const fatigueVals=ds.map(d=>+state.checkins?.[d]?.fatigue).filter(Boolean);
   return{week,sessions,load,sleep:avg(sleepVals),meals,fatigue:avg(fatigueVals)};
 });
 const totalMinutes=Object.values(state.checkins||{}).reduce((n,c)=>n+(+c.minutes||0),0);
 const totalLoad=Object.values(state.checkins||{}).reduce((n,c)=>n+(+c.minutes||0)*(+c.rpe||0),0);
 const sleepAll=Object.values(state.checkins||{}).map(c=>+c.sleep).filter(Boolean);
 const mealsAll=Object.values(state.nutrition||{}).reduce((n,d)=>n+Object.values(d.meals||{}).filter(x=>x.validated).length,0);
 const reviewTech=Object.values(state.reviews||{}).map(r=>+r.tech).filter(Boolean);
 const focus=Object.values(state.reviews||{}).map(r=>+r.focus).filter(Boolean);
 const strongest=Object.entries(ratings.ratings).sort((a,b)=>b[1]-a[1])[0];
 const weakest=Object.entries(ratings.ratings).sort((a,b)=>a[1]-b[1])[0];
 const labels=Object.fromEntries(RATING_NAMES);
 const form=clamp(100-(weekly.at(-1)?.fatigue||0)*6-(Math.max(0,7-(weekly.at(-1)?.sleep||7.5))*8)+Math.min(12,(weekly.at(-1)?.meals||0)*.6));
 return{weekly,totalMinutes,totalLoad,avgSleep:avg(sleepAll),mealsAll,avgTech:avg(reviewTech),avgFocus:avg(focus),strongest:{key:strongest[0],label:labels[strongest[0]],value:strongest[1]},weakest:{key:weakest[0],label:labels[weakest[0]],value:weakest[1]},form:Math.round(form),ratings};
}

export function renderPerformance(root,state){
 const p=buildPerformance(state),w=p.weekly;
 const sessionTrend=w.map(x=>x.sessions),loadTrend=w.map(x=>x.load),sleepTrend=w.map(x=>+x.sleep.toFixed(1));
 root.innerHTML=`
 <section class="perf-center">
   <div class="actions between"><div><div class="eyebrow">PERFORMANCE CENTER</div><h2>Ta préparation en chiffres</h2></div><span class="pill">5 dernières semaines</span></div>
   <div class="perf-metrics">
     <div><small>ENTRAÎNEMENT</small><strong>${Math.floor(p.totalMinutes/60)} h ${p.totalMinutes%60} min</strong><span>${Object.values(state.done||{}).filter(Boolean).length} séances validées</span></div>
     <div><small>CHARGE TOTALE</small><strong>${Math.round(p.totalLoad)}</strong><span>RPE × minutes</span></div>
     <div><small>SOMMEIL MOYEN</small><strong>${p.avgSleep?p.avgSleep.toFixed(1):'—'} h</strong><span>${p.mealsAll} repas validés</span></div>
     <div><small>FORME ACTUELLE</small><strong>${p.form}%</strong><span>Indépendante des XP</span></div>
   </div>
   <div class="perf-grid">
     <article class="panel perf-chart"><div class="eyebrow">SÉANCES / SEMAINE</div>${spark(sessionTrend)}<div class="perf-values">${w.map(x=>`<span>${x.sessions}</span>`).join('')}</div></article>
     <article class="panel perf-chart"><div class="eyebrow">CHARGE / SEMAINE</div>${spark(loadTrend)}<div class="perf-values">${w.map(x=>`<span>${Math.round(x.load)}</span>`).join('')}</div></article>
     <article class="panel perf-chart"><div class="eyebrow">SOMMEIL / SEMAINE</div>${spark(sleepTrend)}<div class="perf-values">${w.map(x=>`<span>${x.sleep?x.sleep.toFixed(1):'—'}</span>`).join('')}</div></article>
   </div>
   <div class="grid two gap">
     <article class="panel"><div class="eyebrow">QUALITÉ LA PLUS FORTE</div><div class="perf-quality good"><strong>${p.strongest.value}</strong><div><b>${p.strongest.label}</b><span>Continue à l’entretenir sans négliger les autres qualités.</span></div></div></article>
     <article class="panel"><div class="eyebrow">QUALITÉ À RELANCER</div><div class="perf-quality watch"><strong>${p.weakest.value}</strong><div><b>${p.weakest.label}</b><span>Concentre-toi sur des preuves mesurables dans les prochains tests.</span></div></div></article>
   </div>
   <article class="panel gap"><div class="eyebrow">LECTURE RAPIDE</div><div class="perf-insights">
     <div><b>${p.avgTech?p.avgTech.toFixed(1):'—'}/10</b><span>Technique moyenne après séance</span></div>
     <div><b>${p.avgFocus?p.avgFocus.toFixed(1):'—'}/10</b><span>Concentration moyenne</span></div>
     <div><b>${w.at(-1)?.fatigue?w.at(-1).fatigue.toFixed(1):'—'}/10</b><span>Fatigue moyenne cette semaine</span></div>
   </div></article>
 </section>`;
}


import {calculateRatings,RATING_NAMES} from './ratings.js';

const TARGET={
 technique:75,vision:76,control:74,weakFoot:65,
 explosiveness:71,endurance:72,mental:78,discipline:80,recovery:76
};
const LABELS=Object.fromEntries(RATING_NAMES);
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));

export function buildCareer(state){
 const ratings=calculateRatings(state);
 const gaps=Object.entries(TARGET).map(([key,target])=>({
   key,label:LABELS[key],current:ratings.ratings[key],target,
   gap:Math.max(0,target-ratings.ratings[key])
 })).sort((a,b)=>b.gap-a.gap);

 const progress=clamp(
   Object.entries(TARGET).reduce((sum,[k,t])=>sum+Math.min(1,ratings.ratings[k]/t),0)
   /Object.keys(TARGET).length*100
 );

 const done=Object.values(state.done||{}).filter(Boolean).length;
 const tests=(state.tests||[]).length;
 const meals=Object.values(state.nutrition||{}).reduce(
   (n,d)=>n+Object.values(d.meals||{}).filter(x=>x.validated).length,0
 );
 const sleeps=Object.values(state.checkins||{}).filter(x=>+x.sleep>=8).length;
 const scout=clamp(
   ratings.overall*.62+
   ratings.ratings.discipline*.15+
   ratings.ratings.mental*.12+
   ratings.ratings.recovery*.11
 );

 const badges=[
   ['⚽','Première séance',done>=1,`${done} séance(s)`],
   ['🏅','10 séances',done>=10,`${done}/10`],
   ['⏱','Premier test',tests>=1,`${tests} test(s)`],
   ['🥗','Nutrition régulière',meals>=21,`${meals}/21 repas`],
   ['😴','Sommeil solide',sleeps>=5,`${sleeps}/5 nuits`],
   ['⭐','1000 XP',(state.xp||0)>=1000,`${state.xp||0}/1000 XP`]
 ];

 let comment='Continue à remplir tes tests et tes débriefs pour rendre l’évaluation plus fiable.';
 if(gaps[0]){
   comment=`Priorité actuelle : ${gaps[0].label.toLowerCase()} (${gaps[0].gap} points d’écart avec le repère cible).`;
 }

 return {ratings,gaps,progress,scout,badges,comment};
}

export function renderCareer(root,state){
 const c=buildCareer(state);
 root.innerHTML=`
 <div class="career-card-stable">
   <div class="career-score">${c.ratings.overall}</div>
   <div>
     <div class="eyebrow">MODE CARRIÈRE</div>
     <h2>Valentin</h2>
     <p>FC Domtac • MOC / N°10 • Objectif U18 R1</p>
   </div>
   <div class="career-progress-stable"><strong>${c.progress}%</strong><span>vers l’objectif</span></div>
 </div>

 <div class="grid two gap">
   <article class="panel">
     <div class="eyebrow">ÉCARTS AVEC LE REPÈRE U18 R1</div>
     <div class="career-gap-list">
       ${c.gaps.map(x=>`<div><span>${x.label}</span><b>${x.current}</b><i>→</i><strong>${x.target}</strong><em>${x.gap?`−${x.gap}`:'OK'}</em></div>`).join('')}
     </div>
   </article>
   <article class="panel">
     <div class="eyebrow">PRIORITÉS</div>
     ${c.gaps.slice(0,3).map((x,i)=>`<div class="career-priority"><span>${i+1}</span><div><b>${x.label}</b><small>Écart : ${x.gap} points</small></div></div>`).join('')}
   </article>
 </div>

 <div class="grid two gap">
   <article class="panel">
     <div class="actions between"><div><div class="eyebrow">SCOUT SCORE</div><h2>Rapport personnel</h2></div><strong class="scout-stable">${c.scout}/100</strong></div>
     <p>${c.comment}</p>
     <p class="muted">Indicateur personnel, non officiel.</p>
   </article>
   <article class="panel">
     <div class="eyebrow">BADGES</div>
     <div class="badges-stable">${c.badges.map(b=>`<div class="${b[2]?'on':'off'}"><span>${b[2]?b[0]:'🔒'}</span><b>${b[1]}</b><small>${b[3]}</small></div>`).join('')}</div>
   </article>
 </div>`;
}

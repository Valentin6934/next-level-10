import {loadState,saveState} from './storage.js';
import {normalizedDate,planFor} from './data.js';
import {nutritionTarget} from './nutrition-intelligence.js';
import {ACHIEVEMENTS,evaluateAchievements} from './achievements.js';
import {buildPerformance} from './performance.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const dateKey=()=>normalizedDate();

function trainingDay(date){return planFor(date).kind!=='Repos'}
function mealMoment(hour,training){
 if(hour<10)return ['breakfast','Petit-déjeuner','🌅'];
 if(hour<12)return ['snack-am','Collation matin','🍎'];
 if(hour<15)return ['lunch','Déjeuner','🍽️'];
 if(hour<18)return [training?'pre-training':'snack-pm',training?'Pré-entraînement':'Goûter',training?'⚡':'🥪'];
 if(hour<22)return ['dinner',training?'Dîner récupération':'Dîner','🌙'];
 return ['sleep','Avant sommeil','😴'];
}
function mealPlan(key,target,training){
 const plans={
  breakfast:['Pain complet ou flocons d’avoine','2 œufs ou yaourt riche en protéines','1 fruit','400–500 ml d’eau'],
  'snack-am':['1 fruit','1 yaourt ou poignée d’amandes','300 ml d’eau'],
  lunch:['Riz, pâtes ou pommes de terre','Poulet, poisson, œufs ou légumineuses','Légumes','500 ml d’eau'],
  'pre-training':['Banane ou compote','Pain + miel ou céréales simples','400–500 ml d’eau'],
  'snack-pm':['Fruit','Produit laitier','300 ml d’eau'],
  dinner:['Féculent','Protéine','Légumes cuits','Fruit ou yaourt','500 ml d’eau'],
  sleep:['Eau selon la soif','Collation légère uniquement si faim']
 };
 const list=plans[key]||plans.dinner;
 return {list,tip:key==='pre-training'?'Mange 60 à 90 minutes avant la séance et évite le gras.':training&&key==='dinner'?'Mange dans les 90 minutes après l’effort.':`Objectif journalier : ${target.water} L d’eau, ${target.protein} g de protéines, ${target.carbs} g de glucides.`};
}
function shoppingFor(items){
 const map={'Pain complet ou flocons d’avoine':'Pain complet / avoine','2 œufs ou yaourt riche en protéines':'Œufs / yaourts','1 fruit':'Fruits','400–500 ml d’eau':'Eau','1 yaourt ou poignée d’amandes':'Yaourts / amandes','Riz, pâtes ou pommes de terre':'Riz / pâtes / pommes de terre','Poulet, poisson, œufs ou légumineuses':'Poulet / poisson / œufs / légumineuses','Légumes':'Légumes','Banane ou compote':'Bananes / compotes','Pain + miel ou céréales simples':'Pain / miel / céréales','Fruit':'Fruits','Produit laitier':'Produits laitiers','Féculent':'Féculents','Protéine':'Protéines','Légumes cuits':'Légumes','Fruit ou yaourt':'Fruits / yaourts'};
 return [...new Set(items.map(x=>map[x]).filter(Boolean))];
}
function badgeProgress(a,state){
 const sessions=Object.values(state.done||{}).filter(Boolean).length;
 const checkins=Object.keys(state.checkins||{}).length;
 const mealDays=Object.values(state.nutrition||{}).filter(d=>Object.values(d.meals||{}).filter(m=>m.validated).length>=3).length;
 const xp=+state.xp||0;
 const values={'first-checkin':[checkins,1],'three-sessions':[sessions,3],'nutrition-day':[mealDays,1],'xp-100':[xp,100]};
 const [value,target]=values[a.id]||[0,1];return{value,target,pct:clamp(Math.round(value/target*100),0,100)};
}
function ensureAchievements(state){const result=evaluateAchievements(state);saveState(result.state);return result}
function weeklyDelta(values){if(values.length<2)return null;const a=values.at(-2),b=values.at(-1);if(!a&&!b)return 0;return Math.round(((b-a)/(Math.abs(a)||1))*100)}

export function renderSprintThreeTwo(root,{openPage,toast}={}){
 if(!root)return;
 const state=loadState(),date=dateKey(),hour=new Date().getHours(),training=trainingDay(date),target=nutritionTarget(state,date);
 const [mealKey,mealName,mealIcon]=mealMoment(hour,training),meal=mealPlan(mealKey,target,training),shopping=shoppingFor(meal.list);
 const evaluation=ensureAchievements(state),fresh=loadState(),perf=buildPerformance(fresh),weeks=perf.weekly;
 const loadDelta=weeklyDelta(weeks.map(w=>w.load)),sleepDelta=weeklyDelta(weeks.map(w=>w.sleep||0));
 const currentShopping=fresh.sprintThree?.shopping||{};
 root.innerHTML=`<section class="s32-shell">
  <article class="panel s32-nutrition-hero">
   <div><div class="eyebrow">NUTRITION INTELLIGENTE • MAINTENANT</div><h2>${mealIcon} ${esc(mealName)}</h2><p>${esc(meal.tip)}</p></div>
   <div class="s32-targets"><span><b>${target.water} L</b><small>eau</small></span><span><b>${target.protein} g</b><small>protéines</small></span><span><b>${target.carbs} g</b><small>glucides</small></span></div>
  </article>
  <div class="s32-grid">
   <article class="panel"><div class="eyebrow">TON ASSIETTE</div><ul class="s32-meal-list">${meal.list.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><button class="primary" data-s32-meal>VALIDER CE REPAS</button></article>
   <article class="panel"><div class="actions between"><div><div class="eyebrow">LISTE DE COURSES</div><h3>${shopping.length} essentiels</h3></div><span class="pill">sauvegardée</span></div><div class="s32-shopping">${shopping.map((x,i)=>`<label><input type="checkbox" data-shop="${i}" ${currentShopping[x]?'checked':''}> <span>${esc(x)}</span></label>`).join('')}</div></article>
   <article class="panel s32-stats"><div class="eyebrow">STATISTIQUES AVANCÉES</div><div class="s32-stat-grid">
    <span><b>${perf.form}%</b><small>forme</small></span><span><b>${perf.consistency}%</b><small>régularité</small></span><span><b>${perf.workload.ratio??'—'}</b><small>ratio charge</small></span><span><b>${perf.recovery.score}</b><small>récupération</small></span>
   </div><div class="s32-trends"><p><b>Charge :</b> ${loadDelta===null?'données insuffisantes':`${loadDelta>=0?'+':''}${loadDelta}% vs semaine précédente`}</p><p><b>Sommeil :</b> ${sleepDelta===null?'données insuffisantes':`${sleepDelta>=0?'+':''}${sleepDelta}% vs semaine précédente`}</p><p><b>Point fort :</b> ${esc(perf.strongest.label)} (${perf.strongest.value})</p></div><button class="secondary" data-s32-page="progress">VOIR LE DÉTAIL</button></article>
   <article class="panel s32-badges"><div class="actions between"><div><div class="eyebrow">BADGES ACTIFS</div><h3>${evaluation.unlocked.length}/${ACHIEVEMENTS.length} débloqués</h3></div><span class="s32-badge-count">🏆</span></div><div class="s32-badge-list">${ACHIEVEMENTS.map(a=>{const p=badgeProgress(a,fresh),on=fresh.achievements.includes(a.id);return`<div class="s32-badge ${on?'unlocked':''}"><span>${a.icon}</span><div><b>${esc(a.name)}</b><small>${on?'Débloqué':`${p.value}/${p.target}`}</small><i><em style="width:${p.pct}%"></em></i></div></div>`}).join('')}</div></article>
  </div>
 </section>`;
 root.querySelector('[data-s32-meal]')?.addEventListener('click',()=>{
  const s=loadState();s.nutrition[date]=s.nutrition[date]||{meals:{}};s.nutrition[date].meals=s.nutrition[date].meals||{};s.nutrition[date].meals[mealKey]={validated:true,validatedAt:new Date().toISOString(),name:mealName};s.xp=(+s.xp||0)+10;saveState(s);const r=ensureAchievements(loadState());toast?.(`Repas validé +10 XP${r.newly.length?` • Badge ${r.newly[0].name}`:''}`);renderSprintThreeTwo(root,{openPage,toast});
 });
 root.querySelectorAll('[data-shop]').forEach(input=>input.addEventListener('change',()=>{const s=loadState();s.sprintThree=s.sprintThree||{shopping:{}};s.sprintThree.shopping=s.sprintThree.shopping||{};s.sprintThree.shopping[shopping[+input.dataset.shop]]=input.checked;saveState(s)}));
 root.querySelectorAll('[data-s32-page]').forEach(btn=>btn.addEventListener('click',()=>openPage?.(btn.dataset.s32Page)));
 if(evaluation.newly.length)toast?.(`Nouveau badge : ${evaluation.newly.map(x=>x.name).join(', ')}`);
}

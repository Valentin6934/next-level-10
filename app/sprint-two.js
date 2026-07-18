import {loadState,saveState} from './storage.js';
import {normalizedDate,planFor} from './data.js';
import {analyzeRecovery} from './recovery-intelligence.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

function mealForHour(hour,training){
  if(hour<10)return {name:'Petit-déjeuner',icon:'🌅',plate:['Flocons d’avoine ou pain complet','Yaourt / lait ou 2 œufs','1 fruit','400–500 ml d’eau'],tip:'Commence par l’eau, puis mange sans te presser.'};
  if(hour<12)return {name:'Collation',icon:'🍌',plate:['1 fruit','1 yaourt ou une poignée d’oléagineux','300 ml d’eau'],tip:'Une collation simple suffit.'};
  if(hour<15)return {name:'Déjeuner',icon:'🍽️',plate:['Féculent : riz, pâtes ou pommes de terre','Protéine : poulet, poisson, œufs ou légumineuses','Légumes','500 ml d’eau'],tip:training?'Garde une portion généreuse de féculents pour la séance.':'Assiette équilibrée, sans surcharge.'};
  if(hour<18)return {name:training?'Collation pré-entraînement':'Goûter',icon:'⚡',plate:training?['Banane ou compote','Pain + miel ou céréales simples','400 ml d’eau']:['Fruit','Produit laitier','300 ml d’eau'],tip:training?'Évite les aliments très gras juste avant la séance.':'Reste léger et régulier.'};
  if(hour<22)return {name:'Dîner récupération',icon:'🌙',plate:['Féculent','Protéine','Légumes cuits','Fruit ou yaourt','500 ml d’eau'],tip:training?'Mange dans les 90 minutes après l’effort.':'Prépare une nuit de qualité.'};
  return {name:'Avant sommeil',icon:'😴',plate:['Eau selon la soif','Collation légère seulement si faim'],tip:'Pas de repas lourd : priorité au sommeil.'};
}

function performance(state){
  const dates=Object.keys(state.checkins||{}).sort().slice(-7);
  const sessions=Object.keys(state.done||{}).filter(k=>state.done[k]).length;
  const loads=dates.map(d=>{const c=state.checkins[d]||{};return (+c.rpe||0)*(+c.minutes||0)});
  const weeklyLoad=loads.reduce((a,b)=>a+b,0);
  const sleep=dates.map(d=>+state.checkins[d]?.sleep||0).filter(Boolean);
  const avgSleep=sleep.length?sleep.reduce((a,b)=>a+b,0)/sleep.length:0;
  const completed=Object.values(state.dailyObjectives||{}).reduce((sum,day)=>sum+Object.values(day||{}).filter(Boolean).length,0);
  return {sessions,weeklyLoad,avgSleep,completed,xp:+state.xp||0};
}

function novaInsight(state,date,recovery,perf){
  const plan=planFor(date);
  const c=state.checkins?.[date]||{};
  if(recovery.score<45)return {tone:'red',title:'NOVA protège ta progression',text:'Ta récupération est basse. Réduis l’intensité, privilégie mobilité, hydratation et sommeil.',action:'Ouvrir mon check-in'};
  if((+c.sleep||0)<7&&c.sleep)return {tone:'orange',title:'Sommeil à rattraper',text:'La séance peut rester technique, mais évite le volume inutile et vise une nuit plus longue.',action:'Ajuster ma récupération'};
  if(plan.kind==='Repos')return {tone:'blue',title:'Construis sans forcer',text:'Aujourd’hui, consolide : marche, mobilité, hydratation et analyse de tes dernières séances.',action:'Voir mon plan'};
  if(perf.weeklyLoad>1800)return {tone:'orange',title:'Charge élevée cette semaine',text:'Garde la qualité, retire une série sur les blocs intenses et arrête si la technique baisse.',action:'Voir la séance'};
  return {tone:'green',title:'Feu vert maîtrisé',text:`Tu peux suivre « ${plan.title||plan.kind} ». Ta priorité : précision, décisions rapides et récupération après l’effort.`,action:'Commencer'};
}

function shoppingList(meal){
  const map={
    'Petit-déjeuner':['Flocons d’avoine / pain complet','Œufs ou yaourts','Fruits','Lait ou boisson végétale'],
    'Collation':['Fruits','Yaourts','Amandes / noix'],
    'Déjeuner':['Riz / pâtes / pommes de terre','Poulet / poisson / œufs','Légumes','Fruits'],
    'Collation pré-entraînement':['Bananes','Compotes','Pain','Miel'],
    'Goûter':['Fruits','Yaourts','Pain complet'],
    'Dîner récupération':['Féculents','Protéines','Légumes','Yaourts / fruits'],
    'Avant sommeil':['Eau','Yaourt nature']
  };
  return map[meal.name]||[];
}

export function renderSprintTwo(root,{openPage}={}){
  if(!root)return;
  const state=loadState(),date=normalizedDate(),now=new Date();
  const recovery=analyzeRecovery(state,date),perf=performance(state),plan=planFor(date);
  const training=plan.kind!=='Repos';
  const meal=mealForHour(now.getHours(),training),insight=novaInsight(state,date,recovery,perf);
  const today=state.checkins?.[date]||{};
  const list=shoppingList(meal);
  root.innerHTML=`<section class="s2-shell">
    <article class="panel s2-hero s2-${insight.tone}">
      <div><div class="eyebrow">NOVA COACH 2.0</div><h2>${esc(insight.title)}</h2><p>${esc(insight.text)}</p></div>
      <button class="primary" data-s2-action="${insight.action==='Commencer'?'session':'tracking'}">${esc(insight.action)}</button>
    </article>
    <div class="s2-grid">
      <article class="panel s2-recovery">
        <div class="actions between"><div><div class="eyebrow">RECOVERY LIVE • FIABILITÉ ${recovery.confidence}</div><h3>${recovery.score}/100 • ${esc(recovery.status)}</h3><small>${recovery.sleepTrend==='down'?'Sommeil en baisse':recovery.sleepTrend==='up'?'Sommeil en progression':'Sommeil stable'} • Charge ${esc(recovery.workload.band.toLowerCase())}</small></div><span class="s2-score">${recovery.score}</span></div>
        <label>Sommeil <b data-value="sleep">${today.sleep||8} h</b><input data-s2-input="sleep" type="range" min="4" max="12" step="0.5" value="${today.sleep||8}"></label>
        <label>Fatigue <b data-value="fatigue">${today.fatigue||4}/10</b><input data-s2-input="fatigue" type="range" min="1" max="10" value="${today.fatigue||4}"></label>
        <label>Courbatures <b data-value="soreness">${today.soreness||3}/10</b><input data-s2-input="soreness" type="range" min="1" max="10" value="${today.soreness||3}"></label>
        <p class="s2-recovery-advice">${esc(recovery.recommendation)}</p><button class="secondary" data-s2-save>ENREGISTRER MON ÉTAT</button>
      </article>
      <article class="panel s2-nutrition">
        <div class="eyebrow">À MANGER MAINTENANT</div><h3>${meal.icon} ${esc(meal.name)}</h3><p>${esc(meal.tip)}</p>
        <ul>${meal.plate.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
        <details><summary>Liste de courses</summary><div class="s2-shopping">${list.map(x=>`<label><input type="checkbox"> ${esc(x)}</label>`).join('')}</div></details>
        <button class="secondary" data-s2-action="nutrition">OUVRIR NUTRITION</button>
      </article>
      <article class="panel s2-performance">
        <div class="eyebrow">PERFORMANCE DASHBOARD</div><div class="s2-metrics">
          <span><b>${perf.sessions}</b><small>séances</small></span><span><b>${perf.weeklyLoad}</b><small>charge 7 j</small></span><span><b>${perf.avgSleep?perf.avgSleep.toFixed(1):'—'}</b><small>sommeil moy.</small></span><span><b>${perf.xp}</b><small>XP</small></span>
        </div><div class="s2-load"><i style="width:${clamp(perf.weeklyLoad/24,4,100)}%"></i></div><p>${perf.weeklyLoad>1800?'Charge forte : vise une séance plus courte.':perf.weeklyLoad>900?'Charge équilibrée : conserve la qualité.':'Charge légère : progresse sans brûler les étapes.'}</p>
        <button class="secondary" data-s2-action="progress">VOIR MA PROGRESSION</button>
      </article>
      <article class="panel s2-badges"><div class="eyebrow">PROGRESSION</div><h3>${perf.completed} objectifs validés</h3><p>Chaque action utile compte. Les badges se débloquent avec la régularité, pas avec une journée parfaite.</p><div class="s2-badge-row"><span>🔥 Régularité</span><span>💧 Hydratation</span><span>⚽ Séances</span></div></article>
    </div>
  </section>`;
  root.querySelectorAll('[data-s2-input]').forEach(input=>input.addEventListener('input',()=>{
    const out=root.querySelector(`[data-value="${input.dataset.s2Input}"]`);if(out)out.textContent=input.value+(input.dataset.s2Input==='sleep'?' h':'/10');
  }));
  root.querySelector('[data-s2-save]')?.addEventListener('click',()=>{
    const latest=loadState();latest.checkins[date]={...(latest.checkins[date]||{})};
    root.querySelectorAll('[data-s2-input]').forEach(input=>latest.checkins[date][input.dataset.s2Input]=+input.value);
    saveState(latest);renderSprintTwo(root,{openPage});
  });
  root.querySelectorAll('[data-s2-action]').forEach(btn=>btn.addEventListener('click',()=>openPage?.(btn.dataset.s2Action)));
}

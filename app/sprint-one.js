import {loadState,saveState} from './storage.js';
import {normalizedDate} from './data.js';
import {analyzeRecovery} from './recovery-intelligence.js';
import {buildDailyObjectives,toggleDailyObjective} from './daily-objectives.js';
import {evaluateAchievements} from './achievements.js';
import {nutritionTarget} from './nutrition-intelligence.js';

export function renderSprintOne(root){
  if(!root)return;
  const state=loadState(),date=normalizedDate(),recovery=analyzeRecovery(state,date),nutrition=nutritionTarget(state,date);
  const evaluated=evaluateAchievements(state);saveState(evaluated.state);
  const objectives=buildDailyObjectives(evaluated.state,date);
  root.innerHTML=`<section class="v16-grid">
    <article class="panel v16-card"><div class="eyebrow">RECOVERY INTELLIGENCE</div><div class="v16-score"><strong>${recovery.score}</strong><span>/100</span></div><h3>${recovery.status}</h3><p>${recovery.recommendation}</p></article>
    <article class="panel v16-card"><div class="eyebrow">OBJECTIFS DU JOUR</div><div class="v16-objectives">${objectives.map(o=>`<label><input type="checkbox" data-objective="${o.id}" ${o.complete?'checked':''}><span>${o.label}</span><b>+${o.xp} XP</b></label>`).join('')}</div></article>
    <article class="panel v16-card"><div class="eyebrow">NUTRITION INTELLIGENCE</div><h3>${nutrition.water} L d’eau</h3><p>${nutrition.message}</p></article>
    <article class="panel v16-card"><div class="eyebrow">ACHIEVEMENTS</div><div class="v16-badges">${evaluated.unlocked.length?evaluated.unlocked.map(a=>`<span title="${a.name}">${a.icon} ${a.name}</span>`).join(''):'<span>Aucun badge débloqué pour le moment.</span>'}</div></article>
  </section>`;
  root.querySelectorAll('[data-objective]').forEach(input=>input.addEventListener('change',()=>{
    const latest=loadState();toggleDailyObjective(latest,date,input.dataset.objective);saveState(latest);renderSprintOne(root);
  }));
}

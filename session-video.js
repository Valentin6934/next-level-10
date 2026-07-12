import {loadState,saveState} from './storage.js';
import {videoForPlan} from './video-catalog.js';

const localDate=()=>{
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function isVideoComplete(state,date=localDate()){
 return !!state.sessionVideo?.[date]?.completed;
}

export function renderSessionVideo(root,plan,onComplete){
 try{
  const state=loadState(),date=localDate();
  state.sessionVideo=state.sessionVideo||{};
  const saved=state.sessionVideo[date]||{};
  const video=videoForPlan(plan);
  const answers=saved.answers||[];

  root.innerHTML=`<article class="session-video-card ${saved.completed?'completed':''}">
   <div class="actions between">
    <div>
     <div class="eyebrow">ANALYSE VIDÉO INTÉGRÉE</div>
     <h2>${video.title}</h2>
     <p>${video.player} • ${video.duration} min</p>
    </div>
    <span class="pill">${saved.completed?'Terminée ✓':'À faire'}</span>
   </div>

   <div class="video-session-intro">
    <div><b>Consigne</b><p>${video.instruction}</p></div>
    <div><b>Pourquoi maintenant ?</b><p>Cette analyse reprend directement le thème de ta séance du jour.</p></div>
   </div>

   <label>Lien vidéo
    <input id="sessionVideoUrl" type="url" value="${esc(saved.url||video.url)}">
   </label>
   <div class="actions">
    <button id="openSessionVideo" class="primary">OUVRIR LA VIDÉO</button>
    <button id="resetSessionVideoUrl" class="secondary">REMETTRE LE LIEN CONSEILLÉ</button>
   </div>

   <div class="video-session-questions">
    ${video.questions.map((q,i)=>`<label><span>${i+1}. ${q}</span><textarea data-session-video-answer="${i}" placeholder="Observation précise...">${esc(answers[i]||'')}</textarea></label>`).join('')}
   </div>

   <div class="fields">
    <label>Qualité de l’analyse /10<input id="sessionVideoScore" type="number" min="1" max="10" value="${esc(saved.score||'')}"></label>
    <label>Scans observés<input id="sessionVideoScans" type="number" min="0" value="${esc(saved.scans||'')}"></label>
   </div>

   <label>Leçon à retenir
    <textarea id="sessionVideoLesson" placeholder="Ex. scanner juste avant la passe du partenaire...">${esc(saved.lesson||'')}</textarea>
   </label>

   <div class="actions">
    <button id="saveSessionVideoDraft" class="secondary">SAUVEGARDER</button>
    <button id="completeSessionVideo" class="primary">${saved.completed?'ANALYSE VALIDÉE ✓':'TERMINER • +35 XP'}</button>
   </div>
   <p class="muted">Validation : au moins deux réponses, une leçon et une note.</p>
  </article>`;

  const collect=()=>({
   missionId:video.id,
   title:video.title,
   url:root.querySelector('#sessionVideoUrl').value.trim(),
   answers:[...root.querySelectorAll('[data-session-video-answer]')].map(x=>x.value.trim()),
   score:root.querySelector('#sessionVideoScore').value,
   scans:root.querySelector('#sessionVideoScans').value,
   lesson:root.querySelector('#sessionVideoLesson').value.trim()
  });

  root.querySelector('#openSessionVideo').onclick=()=>{
   const draft=collect();
   if(!/^https?:\/\//i.test(draft.url)){alert('Ajoute un lien complet commençant par https://');return}
   const latest=loadState();
   latest.sessionVideo=latest.sessionVideo||{};
   latest.sessionVideo[date]={...(latest.sessionVideo[date]||{}),...draft,planTitle:plan.title};
   saveState(latest);
   window.open(draft.url,'_blank','noopener');
  };

  root.querySelector('#resetSessionVideoUrl').onclick=()=>{
   root.querySelector('#sessionVideoUrl').value=video.url;
  };

  root.querySelector('#saveSessionVideoDraft').onclick=()=>{
   const latest=loadState(),draft=collect();
   latest.sessionVideo=latest.sessionVideo||{};
   latest.sessionVideo[date]={...(latest.sessionVideo[date]||{}),...draft,planTitle:plan.title};
   saveState(latest);
   root.querySelector('#saveSessionVideoDraft').textContent='SAUVEGARDÉ ✓';
  };

  root.querySelector('#completeSessionVideo').onclick=()=>{
   const latest=loadState(),draft=collect();
   const validAnswers=draft.answers.filter(Boolean).length;
   if(validAnswers<2){alert('Réponds au moins à deux questions.');return}
   if(!draft.lesson){alert('Ajoute une leçon à retenir.');return}
   if(!draft.score){alert('Ajoute une note de qualité.');return}

   latest.sessionVideo=latest.sessionVideo||{};
   const previous=latest.sessionVideo[date]||{};
   const firstCompletion=!previous.completed;

   latest.sessionVideo[date]={
    ...previous,...draft,
    planTitle:plan.title,
    completed:true,
    completedAt:previous.completedAt||new Date().toISOString()
   };

   latest.nextMission={
    sourceDate:date,
    text:video.nextMission,
    source:'Analyse vidéo',
    createdAt:new Date().toISOString()
   };

   latest.videoAnalyses=latest.videoAnalyses||[];
   const existingIndex=latest.videoAnalyses.findIndex(x=>x.source==='session'&&x.date===date);
   const historyItem={
    id:`session_${date}`,
    source:'session',
    date,
    missionId:video.id,
    title:video.title,
    quality:'Vision',
    url:draft.url,
    subject:plan.title,
    minutes:video.duration,
    answers:draft.answers,
    scans:+draft.scans||0,
    score:Math.max(1,Math.min(10,+draft.score||1)),
    lesson:draft.lesson,
    completedAt:new Date().toISOString()
   };
   if(existingIndex>=0)latest.videoAnalyses[existingIndex]=historyItem;
   else latest.videoAnalyses.push(historyItem);

   if(firstCompletion)latest.xp=(latest.xp||0)+35;
   saveState(latest);

   window.dispatchEvent(new CustomEvent('nl10:session-video-completed',{detail:{date,firstCompletion}}));
   renderSessionVideo(root,plan,onComplete);
   if(typeof onComplete==='function')onComplete(latest.sessionVideo[date],firstCompletion);
  };
 }catch(error){
  console.error('Analyse vidéo de séance indisponible:',error);
  root.innerHTML='<div class="notice"><b class="warn">ANALYSE VIDÉO TEMPORAIREMENT INDISPONIBLE</b><p>La séance terrain reste enregistrée et le reste de l’application fonctionne.</p></div>';
 }
}

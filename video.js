import {loadState,saveState} from './storage.js';

const today=()=>{
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const MISSIONS=[
 {
  id:'scan',
  title:'Scanner avant de recevoir',
  icon:'👀',
  quality:'Vision',
  instruction:'Observe uniquement ce qui se passe avant la réception du ballon.',
  questions:[
   'Combien de scans le joueur effectue-t-il avant de recevoir ?',
   'Regarde-t-il derrière une ou deux épaules ?',
   'À quel moment fait-il son dernier scan ?',
   'Son contrôle correspond-il à l’information récupérée ?'
  ]
 },
 {
  id:'body',
  title:'Orientation du corps',
  icon:'↗️',
  quality:'Contrôle',
  instruction:'Observe l’angle du bassin, des épaules et du pied d’appui.',
  questions:[
   'Le joueur reçoit-il face au jeu ou dos au jeu ?',
   'Son corps est-il ouvert avant le contact ?',
   'Quel pied utilise-t-il pour contrôler ?',
   'Combien de touches lui faut-il pour jouer vers l’avant ?'
  ]
 },
 {
  id:'decision',
  title:'Décision et passe finale',
  icon:'🎯',
  quality:'Vision',
  instruction:'Observe ce qui déclenche la passe, pas seulement la passe elle-même.',
  questions:[
   'Quelles options étaient disponibles ?',
   'Pourquoi choisit-il cette passe ?',
   'Fixe-t-il un adversaire avant de donner le ballon ?',
   'Aurait-il pu jouer plus vite ou plus simplement ?'
  ]
 },
 {
  id:'movement',
  title:'Déplacement sans ballon',
  icon:'🏃',
  quality:'Intelligence de jeu',
  instruction:'Suis le joueur même quand il ne touche pas le ballon.',
  questions:[
   'Comment se rend-il disponible entre les lignes ?',
   'Change-t-il de rythme pour se démarquer ?',
   'Se déplace-t-il après avoir passé le ballon ?',
   'Son déplacement ouvre-t-il un espace pour un partenaire ?'
  ]
 }
];

function escapeHtml(value=''){
 return String(value).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 }[c]));
}

function currentMission(id){
 return MISSIONS.find(m=>m.id===id)||MISSIONS[0];
}

function analysisStats(state){
 const list=state.videoAnalyses||[];
 const completed=list.length;
 const totalMinutes=list.reduce((n,x)=>n+(+x.minutes||0),0);
 const avgScore=completed?Math.round(list.reduce((n,x)=>n+(+x.score||0),0)/completed):0;
 const qualities=[...new Set(list.map(x=>x.quality).filter(Boolean))];
 return{completed,totalMinutes,avgScore,qualities};
}

export function renderVideoAnalysis(root){
 try{
  const state=loadState();
  state.videoAnalyses=state.videoAnalyses||[];
  state.videoDraft=state.videoDraft||{};
  const draft=state.videoDraft;
  const selected=currentMission(draft.missionId);
  const stats=analysisStats(state);

  root.innerHTML=`
   <div class="actions between">
    <div>
     <div class="eyebrow">ANALYSE VIDÉO GUIDÉE</div>
     <h2>Apprends à voir le jeu comme un numéro 10</h2>
     <p class="muted">Utilise un extrait de match, une compilation ou une vidéo de toi. L’application guide ton observation sans prétendre analyser automatiquement l’image.</p>
    </div>
    <span class="pill">${stats.completed} analyse(s)</span>
   </div>

   <div class="video-stats">
    <div><small>ANALYSES</small><strong>${stats.completed}</strong></div>
    <div><small>MINUTES OBSERVÉES</small><strong>${stats.totalMinutes}</strong></div>
    <div><small>QUALITÉ MOYENNE</small><strong>${stats.avgScore||'—'}/10</strong></div>
    <div><small>PREUVES VISION</small><strong>${stats.qualities.length}</strong></div>
   </div>

   <div class="grid two gap">
    <article class="panel">
     <div class="eyebrow">1. CHOISIS TA MISSION</div>
     <div class="video-missions">
      ${MISSIONS.map(m=>`<button class="${m.id===selected.id?'active':''}" data-mission="${m.id}"><span>${m.icon}</span><b>${m.title}</b><small>${m.quality}</small></button>`).join('')}
     </div>
     <div class="video-instruction"><b>${selected.title}</b><p>${selected.instruction}</p></div>
    </article>

    <article class="panel">
     <div class="eyebrow">2. CHOISIS LA VIDÉO</div>
     <label>Lien de la vidéo
      <input id="videoUrl" type="url" placeholder="https://www.youtube.com/..." value="${escapeHtml(draft.url||'')}">
     </label>
     <label>Joueur ou match observé
      <input id="videoSubject" placeholder="Ex. milieu offensif, match, ma propre vidéo..." value="${escapeHtml(draft.subject||'')}">
     </label>
     <label>Durée observée (minutes)
      <input id="videoMinutes" type="number" min="1" max="120" value="${escapeHtml(draft.minutes||10)}">
     </label>
     <div class="actions">
      <button id="openVideoLink" class="primary">OUVRIR LA VIDÉO</button>
      <button id="saveVideoDraft" class="secondary">SAUVEGARDER LE BROUILLON</button>
     </div>
     <p class="muted">Le lien s’ouvre dans un nouvel onglet. Reviens ensuite dans l’application pour répondre.</p>
    </article>
   </div>

   <article class="panel gap">
    <div class="eyebrow">3. OBSERVE ET RÉPONDS</div>
    <div class="video-questions">
     ${selected.questions.map((q,i)=>`<label><span>${i+1}. ${q}</span><textarea data-answer="${i}" placeholder="Écris une observation précise...">${escapeHtml(draft.answers?.[i]||'')}</textarea></label>`).join('')}
    </div>
    <div class="fields">
     <label>Nombre de scans observés<input id="videoScans" type="number" min="0" value="${escapeHtml(draft.scans||'')}"></label>
     <label>Contrôles orientés réussis<input id="videoControls" type="number" min="0" value="${escapeHtml(draft.controls||'')}"></label>
     <label>Décisions vers l’avant<input id="videoForward" type="number" min="0" value="${escapeHtml(draft.forward||'')}"></label>
     <label>Qualité de ton analyse /10<input id="videoScore" type="number" min="1" max="10" value="${escapeHtml(draft.score||'')}"></label>
    </div>
    <label>La leçon à appliquer à ma prochaine séance
     <textarea id="videoLesson" placeholder="Ex. scanner juste avant la passe du partenaire...">${escapeHtml(draft.lesson||'')}</textarea>
    </label>
    <div class="actions">
     <button id="completeVideoAnalysis" class="primary">TERMINER L’ANALYSE • +35 XP</button>
     <button id="clearVideoDraft" class="secondary">EFFACER LE BROUILLON</button>
    </div>
   </article>

   <article class="panel gap">
    <div class="eyebrow">HISTORIQUE</div>
    <div class="video-history">
     ${state.videoAnalyses.length?state.videoAnalyses.slice().reverse().slice(0,12).map(a=>`
      <div>
       <span class="video-history-icon">${currentMission(a.missionId).icon}</span>
       <section><b>${escapeHtml(a.title)}</b><small>${escapeHtml(a.date)} • ${a.minutes} min • ${escapeHtml(a.subject||'Vidéo non nommée')}</small><p>${escapeHtml(a.lesson||'Aucune leçon renseignée.')}</p></section>
       <strong>${a.score}/10</strong>
      </div>`).join(''):'<p class="muted">Aucune analyse terminée.</p>'}
    </div>
   </article>`;

  const saveDraft=()=>{
   const latest=loadState();
   latest.videoDraft={
    missionId:selected.id,
    url:root.querySelector('#videoUrl').value.trim(),
    subject:root.querySelector('#videoSubject').value.trim(),
    minutes:root.querySelector('#videoMinutes').value,
    answers:[...root.querySelectorAll('[data-answer]')].map(x=>x.value.trim()),
    scans:root.querySelector('#videoScans').value,
    controls:root.querySelector('#videoControls').value,
    forward:root.querySelector('#videoForward').value,
    score:root.querySelector('#videoScore').value,
    lesson:root.querySelector('#videoLesson').value.trim()
   };
   saveState(latest);
  };

  root.querySelectorAll('[data-mission]').forEach(button=>{
   button.addEventListener('click',()=>{
    saveDraft();
    const latest=loadState();
    latest.videoDraft.missionId=button.dataset.mission;
    saveState(latest);
    renderVideoAnalysis(root);
   });
  });

  root.querySelector('#openVideoLink').addEventListener('click',()=>{
   const url=root.querySelector('#videoUrl').value.trim();
   if(!/^https?:\/\//i.test(url)){
    alert('Ajoute un lien complet commençant par https://');
    return;
   }
   saveDraft();
   window.open(url,'_blank','noopener');
  });

  root.querySelector('#saveVideoDraft').addEventListener('click',()=>{
   saveDraft();
   root.querySelector('#saveVideoDraft').textContent='BROUILLON SAUVEGARDÉ ✓';
  });

  root.querySelector('#clearVideoDraft').addEventListener('click',()=>{
   const latest=loadState();
   latest.videoDraft={missionId:selected.id};
   saveState(latest);
   renderVideoAnalysis(root);
  });

  root.querySelector('#completeVideoAnalysis').addEventListener('click',()=>{
   saveDraft();
   const latest=loadState();
   const draftNow=latest.videoDraft||{};
   const answered=(draftNow.answers||[]).filter(Boolean).length;
   if(answered<2){
    alert('Réponds au moins à deux questions avant de terminer.');
    return;
   }
   if(!draftNow.lesson||!draftNow.score){
    alert('Ajoute une leçon à retenir et une note de qualité.');
    return;
   }
   const id=`${Date.now()}_${selected.id}`;
   latest.videoAnalyses=latest.videoAnalyses||[];
   latest.videoAnalyses.push({
    id,
    date:today(),
    missionId:selected.id,
    title:selected.title,
    quality:selected.quality,
    url:draftNow.url||'',
    subject:draftNow.subject||'',
    minutes:+draftNow.minutes||10,
    answers:draftNow.answers||[],
    scans:+draftNow.scans||0,
    controls:+draftNow.controls||0,
    forward:+draftNow.forward||0,
    score:Math.max(1,Math.min(10,+draftNow.score||1)),
    lesson:draftNow.lesson,
    completedAt:new Date().toISOString()
   });
   latest.xp=(latest.xp||0)+35;
   latest.videoDraft={missionId:selected.id};
   saveState(latest);
   const xp=document.getElementById('homeXp');if(xp)xp.textContent=latest.xp;
   window.dispatchEvent(new CustomEvent('nl10:video-completed'));
   renderVideoAnalysis(root);
  });
 }catch(error){
  console.error('Analyse vidéo indisponible:',error);
  root.innerHTML='<div class="notice"><b class="warn">ANALYSE VIDÉO TEMPORAIREMENT INDISPONIBLE</b><p>Le reste de l’application continue normalement.</p></div>';
 }
}

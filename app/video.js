import {loadState,saveState} from './storage.js';
import {VIDEO_CATALOG,videoById} from './video-catalog.js';

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const SKILLS=['Vision','Contrôle','Décision','Jeu sans ballon','Explosivité'];

function ensureVideoState(state){
 state.videoAnalyses=state.videoAnalyses||[];
 state.videoDraft=state.videoDraft||{};
 state.videoFieldMissions=state.videoFieldMissions||{};
 return state;
}
function skillMap(state){
 const map=Object.fromEntries(SKILLS.map(s=>[s,{sum:0,count:0}]));
 for(const a of state.videoAnalyses||[]){
  const skill=a.skill||'Vision'; if(!map[skill])map[skill]={sum:0,count:0};
  map[skill].sum+=Number(a.autoScore||a.score||0);map[skill].count++;
 }
 return Object.fromEntries(Object.entries(map).map(([k,v])=>[k,v.count?Math.round(v.sum/v.count):0]));
}
function stats(state){
 const list=state.videoAnalyses||[],scores=list.map(a=>Number(a.autoScore||a.score||0)).filter(Boolean);
 return{count:list.length,minutes:list.reduce((n,a)=>n+(Number(a.minutes)||0),0),average:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0,missions:Object.values(state.videoFieldMissions||{}).filter(Boolean).length};
}
function scoreDraft(draft,video){
 const answers=(draft.answers||[]).map(x=>String(x||'').trim());
 const answered=answers.filter(x=>x.length>=18).length;
 const precision=answers.filter(x=>/\b(parce que|avant|après|espace|épaule|pied|pression|partenaire|adversaire|rythme|contrôle|scan)\b/i.test(x)).length;
 const lesson=String(draft.lesson||'').trim();
 const evidence=[draft.scans,draft.controls,draft.forward].filter(v=>v!==''&&v!==null&&v!==undefined).length;
 let score=2+answered*1.35+precision*.45+evidence*.35+(lesson.length>=25?1:0);
 return clamp(Math.round(score),1,10);
}
function feedback(score,draft,video){
 const answered=(draft.answers||[]).filter(x=>String(x||'').trim().length>=18).length;
 const good=[];const improve=[];
 if(answered>=3)good.push('Observation complète sur plusieurs séquences.');else improve.push('Réponds avec davantage de détails sur au moins trois questions.');
 if(String(draft.lesson||'').trim().length>=25)good.push('Leçon terrain clairement formulée.');else improve.push('Transforme ton observation en consigne concrète pour la prochaine séance.');
 if(score>=8)good.push(`Très bonne lecture sur l’axe « ${video.skill} ».`);
 if(!good.length)good.push('Première preuve enregistrée : continue à construire ton historique.');
 if(!improve.length)improve.push('Lors de la prochaine analyse, cite le moment exact qui déclenche la décision.');
 return{good,improve};
}
function renderSkills(map){
 return Object.entries(map).map(([name,value])=>`<div class="video-skill"><span><b>${esc(name)}</b><small>${value?value+'/10':'—'}</small></span><i><em style="width:${value*10}%"></em></i></div>`).join('');
}
function catalogCards(selected,filter){
 return VIDEO_CATALOG.filter(v=>filter==='all'||v.category===filter).map(v=>`<button class="video-library-card ${v.id===selected.id?'active':''}" data-video-id="${v.id}"><span>${v.icon}</span><div><small>${esc(v.category.toUpperCase())}</small><b>${esc(v.title)}</b><p>${esc(v.focus)}</p></div><strong>${v.duration} min</strong></button>`).join('');
}

export function renderVideoAnalysis(root){
 try{
  const state=ensureVideoState(loadState()),draft=state.videoDraft;
  const selected=videoById(draft.videoId)||VIDEO_CATALOG[0];
  const filter=draft.filter||'all',summary=stats(state),skills=skillMap(state);
  const last=state.videoAnalyses[state.videoAnalyses.length-1];
  root.innerHTML=`<section class="video-lab-v14">
   <div class="actions between"><div><div class="eyebrow">NOVA VIDEO LAB • V1.4</div><h2>Observe, comprends, applique</h2><p class="muted">NOVA structure ton analyse à partir de tes réponses. Aucun contenu de la vidéo n’est inventé.</p></div><span class="pill">${summary.count} analyse(s)</span></div>
   <div class="video-stats video-stats-v14"><div><small>ANALYSES</small><strong>${summary.count}</strong></div><div><small>MINUTES</small><strong>${summary.minutes}</strong></div><div><small>SCORE MOYEN</small><strong>${summary.average||'—'}/10</strong></div><div><small>MISSIONS TERRAIN</small><strong>${summary.missions}</strong></div></div>
   <div class="video-lab-grid gap">
    <article class="panel video-library"><div class="actions between"><div><div class="eyebrow">BIBLIOTHÈQUE</div><h3>Choisis un axe</h3></div><select id="videoFilter"><option value="all">Tous</option><option value="technique">Technique</option><option value="tactique">Tactique</option><option value="physique">Physique</option><option value="auto">Ma vidéo</option></select></div><div class="video-library-list">${catalogCards(selected,filter)}</div></article>
    <article class="panel video-focus-card"><div class="video-focus-icon">${selected.icon}</div><small>${esc(selected.category.toUpperCase())} • ${esc(selected.skill)}</small><h3>${esc(selected.title)}</h3><p>${esc(selected.instruction)}</p><div class="video-focus-tags">${selected.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><label>Lien de la vidéo<input id="videoUrl" type="url" placeholder="https://..." value="${esc(draft.url||selected.url||'')}"></label><label>Joueur ou match<input id="videoSubject" value="${esc(draft.subject||'')}" placeholder="Ex. mon match, milieu offensif..."></label><label>Minutes observées<input id="videoMinutes" type="number" min="1" max="120" value="${esc(draft.minutes||selected.duration)}"></label><div class="actions"><button id="openVideoLink" class="primary">OUVRIR</button><button id="saveVideoDraft" class="secondary">SAUVEGARDER</button></div></article>
   </div>
   <article class="panel gap"><div class="actions between"><div><div class="eyebrow">ANALYSE GUIDÉE</div><h3>${esc(selected.focus)}</h3></div><span class="pill">4 questions</span></div><div class="video-questions">${selected.questions.map((q,i)=>`<label><span>${i+1}. ${esc(q)}</span><textarea data-answer="${i}" placeholder="Décris précisément ce que tu as vu...">${esc(draft.answers?.[i]||'')}</textarea></label>`).join('')}</div><div class="fields"><label>Scans observés<input id="videoScans" type="number" min="0" value="${esc(draft.scans||'')}"></label><label>Contrôles orientés<input id="videoControls" type="number" min="0" value="${esc(draft.controls||'')}"></label><label>Décisions vers l’avant<input id="videoForward" type="number" min="0" value="${esc(draft.forward||'')}"></label><label>Confiance dans ton observation /10<input id="videoConfidence" type="number" min="1" max="10" value="${esc(draft.confidence||'')}"></label></div><label>Leçon à appliquer sur le terrain<textarea id="videoLesson" placeholder="Ex. scanner derrière mon épaule juste avant la passe...">${esc(draft.lesson||'')}</textarea></label><div class="actions"><button id="completeVideoAnalysis" class="primary">FAIRE CORRIGER PAR NOVA • +40 XP</button><button id="clearVideoDraft" class="secondary">EFFACER</button></div></article>
   ${last?`<article class="panel gap video-feedback"><div class="actions between"><div><div class="eyebrow">DERNIÈRE CORRECTION NOVA</div><h3>${esc(last.title)}</h3></div><strong>${last.autoScore}/10</strong></div><div class="grid two"><div><b class="ok">POINTS VALIDÉS</b>${last.feedback.good.map(x=>`<p>✓ ${esc(x)}</p>`).join('')}</div><div><b class="warn">À AMÉLIORER</b>${last.feedback.improve.map(x=>`<p>→ ${esc(x)}</p>`).join('')}</div></div><div class="video-field-mission"><div><small>MISSION TERRAIN</small><b>${esc(last.fieldMission)}</b></div><button data-field-mission="${last.id}" class="${state.videoFieldMissions[last.id]?'secondary':'primary'}">${state.videoFieldMissions[last.id]?'TERMINÉE ✓':'VALIDER SUR LE TERRAIN'}</button></div></article>`:''}
   <article class="panel gap"><div class="eyebrow">PROGRESSION PAR COMPÉTENCE</div><div class="video-skills">${renderSkills(skills)}</div></article>
   <article class="panel gap"><div class="eyebrow">HISTORIQUE</div><div class="video-history">${state.videoAnalyses.length?state.videoAnalyses.slice().reverse().slice(0,10).map(a=>`<div><span class="video-history-icon">${videoById(a.videoId)?.icon||'▶'}</span><section><b>${esc(a.title)}</b><small>${esc(a.date)} • ${a.minutes} min • ${esc(a.skill)}</small><p>${esc(a.lesson)}</p></section><strong>${a.autoScore}/10</strong></div>`).join(''):'<p class="muted">Aucune analyse terminée.</p>'}</div></article>
  </section>`;

  const capture=()=>{const latest=ensureVideoState(loadState());latest.videoDraft={videoId:selected.id,filter:root.querySelector('#videoFilter').value,url:root.querySelector('#videoUrl').value.trim(),subject:root.querySelector('#videoSubject').value.trim(),minutes:root.querySelector('#videoMinutes').value,answers:[...root.querySelectorAll('[data-answer]')].map(x=>x.value.trim()),scans:root.querySelector('#videoScans').value,controls:root.querySelector('#videoControls').value,forward:root.querySelector('#videoForward').value,confidence:root.querySelector('#videoConfidence').value,lesson:root.querySelector('#videoLesson').value.trim()};saveState(latest);return latest.videoDraft};
  root.querySelector('#videoFilter').value=filter;
  root.querySelector('#videoFilter').onchange=e=>{const latest=ensureVideoState(loadState());latest.videoDraft={...latest.videoDraft,filter:e.target.value};saveState(latest);renderVideoAnalysis(root)};
  root.querySelectorAll('[data-video-id]').forEach(b=>b.onclick=()=>{capture();const latest=ensureVideoState(loadState());latest.videoDraft.videoId=b.dataset.videoId;latest.videoDraft.answers=[];saveState(latest);renderVideoAnalysis(root)});
  root.querySelector('#openVideoLink').onclick=()=>{const d=capture();if(!/^https?:\/\//i.test(d.url)){alert('Ajoute un lien complet commençant par https://');return}window.open(d.url,'_blank','noopener')};
  root.querySelector('#saveVideoDraft').onclick=()=>{capture();root.querySelector('#saveVideoDraft').textContent='SAUVEGARDÉ ✓'};
  root.querySelector('#clearVideoDraft').onclick=()=>{const latest=ensureVideoState(loadState());latest.videoDraft={videoId:selected.id,filter};saveState(latest);renderVideoAnalysis(root)};
  root.querySelector('#completeVideoAnalysis').onclick=()=>{const d=capture(),answered=d.answers.filter(x=>x.length>=18).length;if(answered<2){alert('Décris au moins deux observations précises.');return}if(d.lesson.length<15){alert('Ajoute une leçon concrète à appliquer sur le terrain.');return}const latest=ensureVideoState(loadState()),autoScore=scoreDraft(d,selected),fb=feedback(autoScore,d,selected),id=`video_${Date.now()}`;latest.videoAnalyses.push({id,date:dayKey(),videoId:selected.id,title:selected.title,category:selected.category,skill:selected.skill,subject:d.subject||'Vidéo non nommée',url:d.url,minutes:Number(d.minutes)||selected.duration,answers:d.answers,scans:Number(d.scans)||0,controls:Number(d.controls)||0,forward:Number(d.forward)||0,confidence:Number(d.confidence)||null,lesson:d.lesson,autoScore,feedback:fb,fieldMission:selected.fieldMission,completedAt:new Date().toISOString()});latest.xp=(Number(latest.xp)||0)+40;latest.videoDraft={videoId:selected.id,filter};saveState(latest);window.dispatchEvent(new CustomEvent('nl10:video-completed',{detail:{skill:selected.skill,score:autoScore}}));renderVideoAnalysis(root)};
  root.querySelectorAll('[data-field-mission]').forEach(b=>b.onclick=()=>{const latest=ensureVideoState(loadState());const id=b.dataset.fieldMission;latest.videoFieldMissions[id]=!latest.videoFieldMissions[id];if(latest.videoFieldMissions[id])latest.xp=(Number(latest.xp)||0)+15;else latest.xp=Math.max(0,(Number(latest.xp)||0)-15);saveState(latest);window.dispatchEvent(new CustomEvent('nl10:video-mission-updated'));renderVideoAnalysis(root)});
 }catch(error){console.error(error);root.innerHTML='<div class="notice"><b class="warn">VIDEO LAB TEMPORAIREMENT INDISPONIBLE</b><p>Le reste de l’application continue normalement.</p></div>'}
}

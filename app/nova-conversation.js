import {loadState,saveState} from './storage.js';
import {planFor,normalizedDate} from './data.js';

const localDate=()=>{
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{
 const n=Number(v);
 return v!==''&&v!==null&&v!==undefined&&Number.isFinite(n)?n:null;
};

function todayContext(state){
 const date=localDate();
 const check=state.checkins?.[date]||{};
 const pain=state.pain?.[date]||null;
 const nutrition=state.nutrition?.[date]||null;
 const plan=planFor(normalizedDate());
 const meals=nutrition?Object.values(nutrition.meals||{}).filter(x=>x.validated).length:0;
 const water=nutrition?num(nutrition.water ?? nutrition.review?.water):null;
 return{
  date,plan,
  sleep:num(check.sleep),
  fatigue:num(check.fatigue),
  motivation:num(check.motivation),
  soreness:num(check.soreness),
  knee:num(check.knee),
  rpe:num(check.rpe),
  minutes:num(check.minutes),
  pain,
  meals,
  water,
  weather:state.weather||{},
  nextMission:state.nextMission?.text||null
 };
}

function missing(ctx){
 const list=[];
 if(ctx.sleep===null)list.push('sommeil');
 if(ctx.fatigue===null)list.push('fatigue');
 if(!ctx.pain)list.push('douleurs');
 if(ctx.meals===0&&ctx.water===null)list.push('nutrition');
 return list;
}

function safety(ctx){
 const p=ctx.pain||{};
 const high=!!(p.swelling||p.instability||p.locking||num(p.run)>=5||p.trend==='Pire');
 const mid=!high&&[p.run,p.post,p.rest].map(num).filter(v=>v!==null).some(v=>v>=2);
 return{high,mid};
}

function memorySummary(state){
 const checks=Object.values(state.checkins||{});
 const recent=checks.slice(-7);
 const sleeps=recent.map(x=>num(x.sleep)).filter(v=>v!==null);
 const fatigues=recent.map(x=>num(x.fatigue)).filter(v=>v!==null);
 const avg=a=>a.length?(a.reduce((x,y)=>x+y,0)/a.length):null;
 const completed=Object.values(state.done||{}).filter(Boolean).length;
 const videos=(state.videoAnalyses||[]).length;
 const tests=(state.tests||[]).length;
 return{
  avgSleep:avg(sleeps),
  avgFatigue:avg(fatigues),
  completed,videos,tests,
  hasHistory:recent.length>0||completed>0||videos>0||tests>0
 };
}

function classify(text){
 const t=text.toLowerCase();
 if(/bonjour|salut|hello|bonsoir/.test(t))return'greeting';
 if(/mal|douleur|genou|cheville|adducteur|ischio|mollet/.test(t))return'pain';
 if(/fatigu|épuis|crevé|sommeil|dormi/.test(t))return'recovery';
 if(/séance|entrain|entraîn|programme|aujourd/.test(t))return'session';
 if(/mange|repas|nutrition|boire|eau|hydrat/.test(t))return'nutrition';
 if(/progr|niveau|note|r1|fort|faible/.test(t))return'progress';
 if(/vidéo|video|analyse|scan|contrôle/.test(t))return'video';
 if(/demain|prochaine/.test(t))return'tomorrow';
 if(/merci/.test(t))return'thanks';
 return'unknown';
}

function responseFor(text,state){
 const ctx=todayContext(state),kind=classify(text),miss=missing(ctx),risk=safety(ctx),mem=memorySummary(state);
 const evidence=[];
 if(ctx.sleep!==null)evidence.push(`sommeil ${ctx.sleep} h`);
 if(ctx.fatigue!==null)evidence.push(`fatigue ${ctx.fatigue}/10`);
 if(ctx.meals)evidence.push(`${ctx.meals} repas validé(s)`);
 if(ctx.water!==null)evidence.push(`${ctx.water} L d’eau`);
 if(ctx.weather?.temp!==undefined)evidence.push(`${ctx.weather.temp} °C`);

 if(kind==='greeting'){
  return `Salut Valentin. ${miss.length?`Il me manque encore ${miss.join(', ')} pour un conseil complet.`:`J’ai assez de données pour t’aider aujourd’hui.`}`;
 }
 if(kind==='pain'){
  if(!ctx.pain)return `Je n’ai aucune donnée douleur aujourd’hui. Ouvre Santé et indique la zone, l’intensité et les éventuels signaux comme gonflement, blocage ou instabilité.`;
  if(risk.high)return `Arrête le travail intense aujourd’hui. Un signal important est enregistré. Parle-en à un adulte et demande un avis médical si cela persiste ou s’aggrave.`;
  if(risk.mid)return `La douleur est à surveiller. Garde uniquement du travail technique léger, sans sprint maximal ni changement de direction violent.`;
  return `Aucun signal important n’est enregistré dans ton suivi douleur aujourd’hui. Reste attentif pendant l’échauffement.`;
 }
 if(kind==='recovery'){
  if(ctx.sleep===null&&ctx.fatigue===null)return `Je ne peux pas juger ta récupération sans ton sommeil et ta fatigue. Renseigne-les dans le check-in.`;
  const parts=[];
  if(ctx.sleep!==null)parts.push(`tu as déclaré ${ctx.sleep} h de sommeil`);
  if(ctx.fatigue!==null)parts.push(`une fatigue de ${ctx.fatigue}/10`);
  let advice='la séance prévue reste possible';
  if((ctx.sleep!==null&&ctx.sleep<6.5)||(ctx.fatigue!==null&&ctx.fatigue>=8))advice='je conseille récupération ou technique légère seulement';
  else if((ctx.sleep!==null&&ctx.sleep<8)||(ctx.fatigue!==null&&ctx.fatigue>=6))advice='réduis le volume et augmente les récupérations';
  return `${parts.join(' et ')}. Donc ${advice}.`;
 }
 if(kind==='session'){
  if(risk.high)return `Non pour l’intensité aujourd’hui : un signal douleur important est enregistré.`;
  if(miss.includes('sommeil')||miss.includes('fatigue'))return `Ta séance prévue est « ${ctx.plan.title} », mais je ne peux pas la valider sérieusement sans ton sommeil et ta fatigue.`;
  if((ctx.sleep<6.5)||(ctx.fatigue>=8))return `Ta séance prévue est « ${ctx.plan.title} ». Avec ${ctx.sleep} h de sommeil et une fatigue de ${ctx.fatigue}/10, fais une version récupération ou technique légère.`;
  if((ctx.sleep<8)||(ctx.fatigue>=6)||risk.mid)return `Ta séance prévue est « ${ctx.plan.title} ». Maintiens-la avec environ 70 % du volume et plus de récupération.`;
  return `Ta séance prévue est « ${ctx.plan.title} ». Tes données actuelles sont compatibles avec la séance, sans ajouter de travail bonus.`;
 }
 if(kind==='nutrition'){
  if(ctx.meals===0&&ctx.water===null)return `Je n’ai aucune donnée nutrition aujourd’hui. Valide tes repas et indique ton eau pour que je puisse t’aider.`;
  const bits=[];
  if(ctx.meals)bits.push(`${ctx.meals} repas validé(s)`);
  if(ctx.water!==null)bits.push(`${ctx.water} L d’eau`);
  let advice='continue régulièrement';
  if(ctx.water!==null&&ctx.water<1.5)advice='augmente progressivement l’hydratation avant la séance';
  if(ctx.meals<2)advice+=' et assure un repas complet avant l’effort';
  return `${bits.join(' et ')}. Je te conseille de ${advice}.`;
 }
 if(kind==='progress'){
  if(!mem.hasHistory)return `Je n’ai pas encore assez d’historique pour parler de progression réelle. Continue les séances, tests et débriefs.`;
  const bits=[`${mem.completed} séance(s) terminée(s)`,`${mem.tests} test(s)`,`${mem.videos} analyse(s) vidéo`];
  if(mem.avgSleep!==null)bits.push(`sommeil moyen ${mem.avgSleep.toFixed(1)} h`);
  return `Voici les preuves disponibles : ${bits.join(', ')}. Les notes restent des repères personnels, pas une évaluation officielle.`;
 }
 if(kind==='video'){
  if(!(state.videoAnalyses||[]).length)return `Tu n’as pas encore terminé d’analyse vidéo enregistrée. Commence par une mission liée au thème de ta séance.`;
  const last=state.videoAnalyses[state.videoAnalyses.length-1];
  return `Ta dernière analyse portait sur « ${last.title} ». La leçon enregistrée est : ${last.lesson||'aucune leçon saisie'}.`;
 }
 if(kind==='tomorrow'){
  return ctx.nextMission?`Ta mission suivante est : ${ctx.nextMission}`:`Aucune mission précise n’est encore enregistrée pour demain. Termine le débrief ou l’analyse vidéo pour en créer une.`;
 }
 if(kind==='thanks')return`Avec plaisir. Je reste transparent : je te conseille seulement à partir des données enregistrées.`;
 return `Je peux t’aider sur ta séance, ta récupération, tes douleurs, ta nutrition, ta progression ou l’analyse vidéo. ${miss.length?`Il me manque actuellement : ${miss.join(', ')}.`:''}`;
}

function starterMessage(state){
 const ctx=todayContext(state),miss=missing(ctx);
 if(miss.length)return `Bonjour Valentin. Avant de te conseiller, il me manque : ${miss.join(', ')}.`;
 return `Bonjour Valentin. J’ai analysé tes données du jour. Pose-moi une question sur ta séance ou ta récupération.`;
}

export function renderNovaConversation(root){
 try{
  const state=loadState();
  state.novaConversation=state.novaConversation||[];
  const history=state.novaConversation.slice(-40);
  root.innerHTML=`<section class="nova-conversation-shell">
   <div class="nova-conversation-memory">
    <div><span class="nova-orb small"><span>N</span><i></i></span><section><b>NOVA</b><small>Coach local • aucune donnée inventée</small></section></div>
    <button id="clearNovaConversation" class="ghost-button">EFFACER</button>
   </div>
   <div id="novaConversationMessages" class="nova-conversation-messages">
    ${history.length?history.map(m=>`<div class="conversation-message ${m.role}"><span>${m.role==='nova'?'N':'V'}</span><p>${esc(m.text)}</p></div>`).join(''):`<div class="conversation-message nova"><span>N</span><p>${esc(starterMessage(state))}</p></div>`}
   </div>
   <div class="nova-suggested-prompts">
    <button>Est-ce que je peux faire ma séance ?</button>
    <button>Comment est ma récupération ?</button>
    <button>Que sais-tu de ma progression ?</button>
    <button>Quelle est ma mission suivante ?</button>
   </div>
   <form id="novaConversationForm" class="nova-conversation-form">
    <textarea id="novaConversationInput" placeholder="Écris à NOVA…" rows="2"></textarea>
    <button type="submit" class="primary">ENVOYER</button>
   </form>
   <p class="muted nova-local-note">Cette version fonctionne avec des règles locales. Elle ne remplace pas un entraîneur, un médecin ou un professionnel de santé.</p>
  </section>`;

  const messages=root.querySelector('#novaConversationMessages');
  const input=root.querySelector('#novaConversationInput');
  const scroll=()=>{messages.scrollTop=messages.scrollHeight};
  scroll();

  const send=text=>{
   const cleaned=text.trim();
   if(!cleaned)return;
   const latest=loadState();
   latest.novaConversation=latest.novaConversation||[];
   latest.novaConversation.push({role:'user',text:cleaned,at:new Date().toISOString()});
   const answer=responseFor(cleaned,latest);
   latest.novaConversation.push({role:'nova',text:answer,at:new Date().toISOString()});
   saveState(latest);
   messages.insertAdjacentHTML('beforeend',`<div class="conversation-message user"><span>V</span><p>${esc(cleaned)}</p></div><div class="conversation-message nova"><span>N</span><p>${esc(answer)}</p></div>`);
   input.value='';
   scroll();
  };

  root.querySelector('#novaConversationForm').onsubmit=e=>{e.preventDefault();send(input.value)};
  root.querySelectorAll('.nova-suggested-prompts button').forEach(b=>b.onclick=()=>send(b.textContent));
  root.querySelector('#clearNovaConversation').onclick=()=>{
   const latest=loadState();
   latest.novaConversation=[];
   saveState(latest);
   renderNovaConversation(root);
  };
 }catch(error){
  console.error('Conversation NOVA indisponible:',error);
  root.innerHTML='<div class="notice"><b class="warn">CONVERSATION TEMPORAIREMENT INDISPONIBLE</b><p>Le reste de l’application fonctionne normalement.</p></div>';
 }
}

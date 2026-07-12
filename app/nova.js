import {loadState,saveState} from './storage.js';

const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(n)));
const localDate=()=>{
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

function valueOrNull(v){
 const n=Number(v);
 return v!=='' && v!==null && v!==undefined && Number.isFinite(n) ? n : null;
}

function painRisk(state,date){
 const p=state.pain?.[date];
 if(!p)return{known:false,level:'unknown',score:null,label:'Non renseigné'};
 if(p.swelling||p.instability||p.locking||valueOrNull(p.run)>=5||p.trend==='Pire')
  return{known:true,level:'high',score:20,label:'Alerte'};
 const levels=[p.run,p.post,p.rest].map(valueOrNull).filter(v=>v!==null);
 if(levels.some(v=>v>=2))return{known:true,level:'mid',score:65,label:'À surveiller'};
 return{known:true,level:'low',score:100,label:'OK'};
}

function nutritionData(state,date){
 const n=state.nutrition?.[date];
 if(!n)return{known:false,score:null,meals:0,water:null};
 const meals=Object.values(n.meals||{}).filter(x=>x.validated).length;
 const water=valueOrNull(n.water ?? n.review?.water);
 return{
  known:meals>0||water!==null,
  meals,water,
  score:clamp(meals*18+(water===null?0:Math.min(28,water*12)))
 };
}

function analyze(state){
 const date=localDate(),check=state.checkins?.[date]||{};
 const sleep=valueOrNull(check.sleep);
 const fatigue=valueOrNull(check.fatigue);
 const motivation=valueOrNull(check.motivation);
 const soreness=valueOrNull(check.soreness);
 const pain=painRisk(state,date);
 const nutrition=nutritionData(state,date);
 const weather=state.weather||{};
 const temp=valueOrNull(weather.temp);
 const humidity=valueOrNull(weather.humidity);

 const components=[];
 if(sleep!==null)components.push({key:'sleep',label:'Sommeil',value:clamp(sleep/9*100),weight:.27,display:`${sleep} h`});
 if(fatigue!==null)components.push({key:'fatigue',label:'Fatigue',value:clamp(100-fatigue*8),weight:.23,display:`${fatigue}/10`});
 if(pain.known)components.push({key:'pain',label:'Douleurs',value:pain.score,weight:.23,display:pain.label});
 if(nutrition.known)components.push({key:'nutrition',label:'Nutrition',value:nutrition.score,weight:.14,display:`${nutrition.meals}/4 repas`});
 if(motivation!==null)components.push({key:'motivation',label:'Motivation',value:clamp(motivation*10),weight:.08,display:`${motivation}/10`});
 if(soreness!==null)components.push({key:'soreness',label:'Courbatures',value:clamp(100-soreness*8),weight:.05,display:`${soreness}/10`});

 const weightTotal=components.reduce((sum,c)=>sum+c.weight,0);
 const score=weightTotal ? clamp(components.reduce((sum,c)=>sum+c.value*c.weight,0)/weightTotal) : null;
 const required=[
  ['sleep','ton sommeil',sleep],
  ['fatigue','ta fatigue',fatigue],
  ['pain','tes douleurs',pain.known?1:null],
  ['nutrition','ton alimentation',nutrition.known?1:null]
 ];
 const missing=required.filter(x=>x[2]===null).map(x=>x[1]);

 return{date,sleep,fatigue,motivation,soreness,pain,nutrition,temp,humidity,components,score,missing,confidence:components.length};
}

function greeting(){
 const h=new Date().getHours();
 return h<12?'Bonjour':h<18?'Bon après-midi':'Bonsoir';
}

function recommendations(r){
 const recs=[];
 if(r.missing.length)recs.push({icon:'＋',title:'Données à compléter',text:`Il me manque ${r.missing.slice(0,2).join(' et ')} pour te conseiller correctement.`});
 if(r.pain.level==='high')recs.unshift({icon:'⛔',title:'Pas de travail intense',text:'Un signal important est enregistré. Récupère et parle-en à un adulte si cela persiste.'});
 else if(r.pain.level==='mid')recs.push({icon:'⚠',title:'Impacts réduits',text:'Technique légère, sans sprint maximal ni changement de direction violent.'});
 if(r.sleep!==null&&r.sleep<7)recs.push({icon:'💤',title:'Récupération prioritaire',text:`${r.sleep} h de sommeil : réduis le volume et couche-toi plus tôt.`});
 if(r.fatigue!==null&&r.fatigue>=7)recs.push({icon:'🔋',title:'Charge à réduire',text:`Fatigue ${r.fatigue}/10 : enlève la dernière série si la qualité baisse.`});
 if(r.nutrition.water!==null&&r.nutrition.water<1.5)recs.push({icon:'💧',title:'Hydratation à renforcer',text:'Bois progressivement avant la séance.'});
 if(r.temp!==null&&r.temp>=30)recs.push({icon:'🌡️',title:'Évite la chaleur',text:`${r.temp} °C renseignés : privilégie le matin ou la soirée.`});
 if(!recs.length)recs.push({icon:'✓',title:'Données cohérentes',text:'Reste attentif à la qualité et n’ajoute pas de volume inutile.'});
 return recs.slice(0,3);
}

function status(r){
 if(r.score===null)return{label:'À COMPLÉTER',className:'unknown',message:'Je ne vais pas inventer tes données.'};
 if(r.confidence<3)return{label:'DONNÉES LIMITÉES',className:'unknown',message:'Mon estimation est provisoire.'};
 if(r.score>=82)return{label:'PRÊT',className:'ready',message:'Tes données permettent la séance prévue.'};
 if(r.score>=65)return{label:'À ADAPTER',className:'adapt',message:'La séance reste possible avec des ajustements.'};
 return{label:'RÉCUPÉRER',className:'recover',message:'La récupération passe avant la performance.'};
}

export function renderNovaDashboard(root){
 try{
  const state=loadState(),r=analyze(state),s=status(r),recs=recommendations(r);
  if(r.score!==null){
   state.novaHistory=state.novaHistory||{};
   state.novaHistory[r.date]={score:r.score,confidence:r.confidence,createdAt:new Date().toISOString()};
   saveState(state);
  }

  root.innerHTML=`<article class="nova-card nova-ux ${s.className}">
   <div class="nova-glow"></div>
   <div class="nova-top">
    <div class="nova-identity">
     <div class="nova-orb"><span>N</span><i></i></div>
     <div><div class="eyebrow">NOVA</div><h2>${greeting()} Valentin</h2><p>${s.message}</p></div>
    </div>
    <span class="nova-status">${s.label}</span>
   </div>

   <div class="nova-ux-main">
    <div class="nova-score ${r.score===null?'score-unknown':''}" style="--nova-score:${(r.score||0)*3.6}deg">
     <div>${r.score===null?'<strong>—</strong><span>Données</span>':`<strong>${r.score}</strong><span>/100</span>`}</div>
    </div>
    <div class="nova-ux-brief">
     <small>BRIEFING DU JOUR</small>
     <h3>${r.missing.length?'J’ai besoin de quelques informations.':recs[0].title}</h3>
     <p>${r.missing.length?`Renseigne ${r.missing.join(', ')}. Ensuite je recalculerai ton état.`:recs[0].text}</p>
     <div class="nova-data-chips">
      ${r.components.map(c=>`<span><b>${c.label}</b>${c.display}</span>`).join('')}
      ${r.missing.map(m=>`<span class="missing"><b>Manquant</b>${m}</span>`).join('')}
     </div>
    </div>
   </div>

   <div class="nova-priorities">
    ${recs.map(x=>`<div class="nova-priority"><span>${x.icon}</span><section><b>${x.title}</b><p>${x.text}</p></section></div>`).join('')}
   </div>

   <div class="nova-actions nova-actions-main">
    <button class="primary nova-chat">PARLER AVEC NOVA</button>
    <button class="secondary nova-complete">COMPLÉTER MES DONNÉES</button>
    <button class="ghost-button nova-refresh">RÉANALYSER</button>
   </div>

   <div class="nova-chat-panel hidden">
    <div class="nova-chat-head"><b>NOVA</b><button class="nova-close">×</button></div>
    <div class="nova-chat-messages">
     <div class="nova-message nova">${r.missing.length?`Je n’invente rien : renseigne d’abord ${r.missing.join(', ')}.`:'Pose-moi une question sur ta séance ou ta récupération.'}</div>
    </div>
    <div class="nova-quick-prompts">
     <button data-q="session">Puis-je faire la séance ?</button>
     <button data-q="missing">Que dois-je renseigner ?</button>
     <button data-q="pain">Que faire si j’ai mal ?</button>
    </div>
   </div>
  </article>`;

  const panel=root.querySelector('.nova-chat-panel');
  root.querySelector('.nova-chat').onclick=()=>panel.classList.remove('hidden');
  root.querySelector('.nova-close').onclick=()=>panel.classList.add('hidden');
  root.querySelector('.nova-refresh').onclick=()=>renderNovaDashboard(root);
  root.querySelector('.nova-complete').onclick=()=>window.dispatchEvent(new CustomEvent('nl10:open-checkin'));

  root.querySelectorAll('[data-q]').forEach(btn=>btn.onclick=()=>{
   let answer;
   if(btn.dataset.q==='missing')answer=r.missing.length?`Il me manque ${r.missing.join(', ')}.`:'Les données essentielles sont renseignées.';
   else if(btn.dataset.q==='pain')answer=r.pain.level==='high'?'Arrête l’intensité. Si gonflement, blocage ou instabilité : parle-en à un adulte et demande un avis médical.':r.pain.level==='mid'?'Évite les impacts et surveille l’évolution.':'Aucune douleur importante n’est enregistrée.';
   else answer=r.score===null?'Je ne peux pas répondre sérieusement tant que les données essentielles ne sont pas renseignées.':s.className==='ready'?'Oui, sans ajouter de séance bonus.':s.className==='adapt'?'Oui, avec moins de volume et plus de récupération.':'Pas d’intensité aujourd’hui.';
   root.querySelector('.nova-chat-messages').insertAdjacentHTML('beforeend',`<div class="nova-message user">${btn.textContent}</div><div class="nova-message nova">${answer}</div>`);
  });
 }catch(error){
  console.error('NOVA indisponible:',error);
  root.innerHTML='<div class="notice"><b class="warn">NOVA TEMPORAIREMENT INDISPONIBLE</b><p>Le reste de l’application fonctionne normalement.</p></div>';
 }
}

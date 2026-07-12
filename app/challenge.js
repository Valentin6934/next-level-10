import {loadState,saveState} from './storage.js';
import {planFor,normalizedDate} from './data.js';

const localDate=()=>{
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const CHALLENGES={
 technique:[
  {title:'Contrôles orientés propres',target:120,unit:'contrôles',quality:'Contrôle',xp:30,description:'Effectue des contrôles orientés en alternant les sorties droite et gauche. Le regard doit se lever avant le contact.'},
  {title:'Passe pied gauche',target:100,unit:'passes réussies',quality:'Pied faible',xp:30,description:'Vise une porte de cônes. Compte uniquement les passes au sol qui traversent proprement la cible.'},
  {title:'Scan avant réception',target:60,unit:'réceptions avec scan',quality:'Vision',xp:30,description:'Avant chaque réception, regarde derrière une épaule puis contrôle vers l’espace libre.'}
 ],
 speed:[
  {title:'Premiers appuis explosifs',target:6,unit:'accélérations propres',quality:'Explosivité',xp:30,description:'Six départs sur 10 m à haute qualité, avec récupération complète. Arrête si la vitesse baisse.'},
  {title:'Changements de rythme',target:12,unit:'accélérations après geste',quality:'Explosivité',xp:30,description:'Après un contrôle ou un crochet, accélère franchement sur 3 à 5 mètres.'}
 ],
 endurance:[
  {title:'Allure parfaitement maîtrisée',target:1,unit:'séance sans dépassement',quality:'Endurance',xp:30,description:'Respecte exactement l’allure Domtac. La réussite est de rester régulier, pas d’aller plus vite.'}
 ],
 recovery:[
  {title:'Journée récupération complète',target:4,unit:'actions validées',quality:'Récupération',xp:25,description:'Valide : hydratation régulière, mobilité douce, repas complet et coucher préparé.'},
  {title:'Routine sommeil',target:1,unit:'routine complète',quality:'Récupération',xp:25,description:'Écrans coupés, sac préparé et coucher permettant environ 8 à 10 heures.'}
 ],
 test:[
  {title:'Protocole identique',target:5,unit:'résultats enregistrés',quality:'Preuve réelle',xp:35,description:'Réalise les tests dans les mêmes conditions et enregistre sprint, passes, slalom, jongles et ressenti.'}
 ]
};

function category(plan,state,date){
 const pain=state.pain?.[date]||{};
 const check=state.checkins?.[date]||{};
 if(pain.swelling||pain.instability||pain.locking||+pain.run>=4||+check.fatigue>=8)return'recovery';
 const text=`${plan.kind} ${plan.title}`.toLowerCase();
 if(text.includes('test'))return'test';
 if(text.includes('repos')||text.includes('récup'))return'recovery';
 if(text.includes('domtac')||text.includes('course')||text.includes('endurance'))return'endurance';
 if(text.includes('explos')||text.includes('vitesse')||text.includes('accél'))return'speed';
 return'technique';
}

function hashDate(date){
 return [...date].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0);
}

function getChallenge(date,state){
 const plan=planFor(normalizedDate());
 const group=CHALLENGES[category(plan,state,date)];
 return group[Math.abs(hashDate(date))%group.length];
}

function currentStreak(challenges){
 const dates=Object.entries(challenges||{}).filter(([,v])=>v.completed).map(([d])=>d).sort().reverse();
 if(!dates.length)return 0;
 let cursor=new Date(localDate()+'T12:00:00'),count=0;
 for(let i=0;i<60;i++){
  const key=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;
  if(challenges?.[key]?.completed)count++;
  else if(i>0)break;
  cursor.setDate(cursor.getDate()-1);
 }
 return count;
}

export function renderDailyChallenge(root){
 try{
  const state=loadState(),date=localDate(),challenge=getChallenge(date,state);
  state.dailyChallenges=state.dailyChallenges||{};
  const saved=state.dailyChallenges[date]||{};
  const progress=Math.max(0,Number(saved.progress||0));
  const percent=Math.min(100,Math.round(progress/challenge.target*100));
  const streak=currentStreak(state.dailyChallenges);

  root.innerHTML=`<article class="daily-challenge-card ${saved.completed?'completed':''}">
   <div class="actions between">
    <div>
     <div class="eyebrow">DÉFI DU JOUR</div>
     <h2>${challenge.title}</h2>
    </div>
    <div class="challenge-reward"><b>+${challenge.xp} XP</b><span>${challenge.quality}</span></div>
   </div>
   <p>${challenge.description}</p>
   <div class="challenge-progress-head"><span>${progress} / ${challenge.target} ${challenge.unit}</span><strong>${percent}%</strong></div>
   <div class="challenge-progress"><i style="width:${percent}%"></i></div>
   <div class="challenge-controls">
    <button class="secondary challenge-minus">−10</button>
    <input class="challenge-value" type="number" min="0" value="${progress}">
    <button class="secondary challenge-plus">+10</button>
    <button class="primary challenge-complete">${saved.completed?'DÉFI VALIDÉ ✓':'VALIDER LE DÉFI'}</button>
   </div>
   <div class="challenge-footer"><span>🔥 Série défis : <b>${streak} jour(s)</b></span><span>${saved.completed?'Récompense déjà obtenue':'La qualité compte avant la quantité.'}</span></div>
  </article>`;

  const input=root.querySelector('.challenge-value');
  const persist=()=>{
   const latest=loadState();
   latest.dailyChallenges=latest.dailyChallenges||{};
   latest.dailyChallenges[date]={...(latest.dailyChallenges[date]||{}),progress:Math.max(0,+input.value||0),title:challenge.title,quality:challenge.quality};
   saveState(latest);
   renderDailyChallenge(root);
  };
  root.querySelector('.challenge-minus').onclick=()=>{input.value=Math.max(0,(+input.value||0)-10);persist()};
  root.querySelector('.challenge-plus').onclick=()=>{input.value=(+input.value||0)+10;persist()};
  input.onchange=persist;
  root.querySelector('.challenge-complete').onclick=()=>{
   const latest=loadState();
   latest.dailyChallenges=latest.dailyChallenges||{};
   const previous=latest.dailyChallenges[date]||{};
   if(!previous.completed){
    latest.xp=(latest.xp||0)+challenge.xp;
    latest.dailyChallenges[date]={...previous,progress:Math.max(challenge.target,+input.value||0),completed:true,completedAt:new Date().toISOString(),title:challenge.title,quality:challenge.quality,xp:challenge.xp};
    saveState(latest);
    const xp=document.getElementById('homeXp');if(xp)xp.textContent=latest.xp;
    window.dispatchEvent(new CustomEvent('nl10:challenge-completed'));
   }
   renderDailyChallenge(root);
  };
 }catch(error){
  console.error('Défi quotidien indisponible:',error);
  root.innerHTML='<div class="notice"><b class="warn">DÉFI TEMPORAIREMENT INDISPONIBLE</b><p>Le reste de l’application continue normalement.</p></div>';
 }
}

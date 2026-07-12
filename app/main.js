import {loadState,saveState,clearState,exportState,importState} from './storage.js';
import {normalizedDate,planFor,menuFor,club,TEST_DAYS,START,END} from './data.js';
import {readiness,advice,currentWeather} from './weather.js';
import {diagram} from './diagram.js';
import {mealTypes,putPhoto,getPhoto,validateMeal,saveFoodReview} from './nutrition.js';
import * as notify from './notifications.js';
import {calculateRatings,RATING_NAMES,ratingReason} from './ratings.js';
import {buildTimerPlan,normalizePlan} from './timer.js';

const $=id=>document.getElementById(id);
const toast=t=>{const e=$('toast');e.textContent=t;e.style.display='block';setTimeout(()=>e.style.display='none',2200)};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const fr=s=>new Date(s+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const iso=d=>d.toISOString().slice(0,10);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function datesBetween(a,b){const out=[],d=new Date(a+'T12:00:00'),end=new Date(b+'T12:00:00');while(d<=end){out.push(iso(d));d.setDate(d.getDate()+1)}return out}
function dayNutritionCount(state,date){return Object.values(state.nutrition?.[date]?.meals||{}).filter(x=>x.validated).length}
function isCompleteDay(state,date){const plan=planFor(date),sessionOk=plan.kind==='Repos'||!!state.done[date],trackingOk=!!state.checkins[date],nutritionOk=dayNutritionCount(state,date)>=3;return sessionOk&&trackingOk&&nutritionOk}
function preparationStreak(state){let d=new Date((today()>END?END:today()<START?START:today())+'T12:00:00'),count=0;for(let i=0;i<60;i++){const key=iso(d);if(isCompleteDay(state,key))count++;else if(i>0)break;d.setDate(d.getDate()-1);if(key<=START)break}return count}

const objectiveList=[
['SCAN FIRST','Regarde derrière une épaule avant chaque réception.'],
['PIED GAUCHE','Précision avant puissance sur chaque passe du pied faible.'],
['PLAY SIMPLE','Décide avant de recevoir et joue en une ou deux touches.'],
['CHANGE OF PACE','Après un geste réussi, accélère sur trois à cinq mètres.']
];
function objective(){const w=Math.max(0,Math.floor((new Date(normalizedDate())-new Date('2026-07-23'))/(7*86400000)));return objectiveList[w%objectiveList.length]}
function showPage(name){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));$('page-'+name).classList.add('active');document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===name));scrollTo({top:0,behavior:'smooth'})}
function painLevel(state){const p=state.pain[today()]||{};if(p.swelling||p.instability||p.locking||+p.run>=5||p.trend==='Pire')return'high';if(+p.run>=2||+p.post>=2)return'mid';return'low'}

function recentDates(count){const out=[];const d=new Date();for(let i=0;i<count;i++){out.push(d.toISOString().slice(0,10));d.setDate(d.getDate()-1)}return out}
function loadScore(state,days=7){return recentDates(days).reduce((sum,d)=>{const c=state.checkins[d]||{};return sum+(+c.rpe||0)*(+c.minutes||0)},0)}
function average(values){const v=values.filter(x=>Number.isFinite(x)&&x>0);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0}
function coachAnalysis(){
 const s=loadState(),c=s.checkins[today()]||{},p=s.pain[today()]||{},w=s.weather,plan=planFor(normalizedDate());
 const sleep=+c.sleep||0,fatigue=+c.fatigue||0,soreness=+c.soreness||0,motivation=+c.motivation||0;
 const load3=loadScore(s,3),load7=loadScore(s,7),pain=painLevel(s);
 const reasons=[],actions=[],status=[];
 let level='VERT',headline='Tu peux suivre la séance prévue.';
 if(pain==='high'){level='ROUGE';headline='Aujourd’hui, on protège ton corps.';reasons.push('Douleur ou signal articulaire important');actions.push(['Intensité','Aucun sprint, saut ou course dure']);actions.push(['Séance','Récupération et technique sans douleur']);actions.push(['À faire','Préviens un adulte ou le staff si cela persiste'])}
 else if(sleep&&sleep<6.5){level='ROUGE';headline='La récupération est insuffisante.';reasons.push(`Seulement ${sleep} h de sommeil`);actions.push(['Volume','Réduction d’environ 50 %']);actions.push(['Vitesse','Suppression des efforts maximaux']);actions.push(['Priorité','Sommeil et hydratation'])}
 else{
   if((sleep&&sleep<8)||fatigue>=6||soreness>=6||load3>1500){level='ORANGE';headline='On garde la qualité, mais on réduit la charge.'}
   if(sleep&&sleep<8){reasons.push(`Sommeil court : ${sleep} h`);actions.push(['Échauffement','Ajoute 3 minutes de mobilité douce'])}
   if(fatigue>=6){reasons.push(`Fatigue ${fatigue}/10`);actions.push(['Volume','Retire la dernière série de chaque bloc intense'])}
   if(soreness>=6){reasons.push(`Courbatures ${soreness}/10`);actions.push(['Explosivité','Pas de répétition supplémentaire'])}
   if(load3>1500){reasons.push(`Charge élevée sur 3 jours : ${load3}`);actions.push(['Récupération','Repos complet entre les répétitions'])}
   if(w.temp>=30){reasons.push(`Chaleur : ${w.temp} °C`);actions.push(['Horaire',`Séance conseillée à ${trainingTime()}`]);actions.push(['Hydratation','Petites prises régulières'])}
   if(!reasons.length){reasons.push('Sommeil, fatigue, douleur et charge compatibles');actions.push(['Objectif','Exécute la séance avec qualité']);actions.push(['Technique',objective()[1]]);actions.push(['Récupération','Débrief et repas après la séance'])}
 }
 if(motivation&&motivation<=4){reasons.push(`Motivation basse : ${motivation}/10`);actions.push(['Mental','Commence par un seul bloc, puis réévalue'])}
 const message=`${reasons.join(' • ')}. ${headline}`;
 return{level,headline,message,actions:actions.slice(0,6),load3,load7,plan};
}
function renderCoach(){
 const headline=$('coachHeadline'),status=$('coachStatus'),message=$('coachMessage'),adjustments=$('coachAdjustments');
 if(!headline||!status||!message||!adjustments)return;
 const a=coachAnalysis();
 headline.textContent=a.headline;
 status.textContent=a.level;
 status.className='pill '+(a.level==='VERT'?'ok':a.level==='ORANGE'?'warn':'bad');
 message.textContent=a.message;
 adjustments.innerHTML=a.actions.map(x=>`<div class="coach-adjustment"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
}
function postSessionCoachMessage(){
 const s=loadState(),r=s.reviews[today()]||{},c=s.checkins[today()]||{},lines=[];
 const tech=+r.tech||0,focus=+r.focus||0,pain=+r.pain||+c.knee||0;
 if(tech>=8)lines.push('Ta qualité technique est très bonne aujourd’hui.');
 else if(tech>0&&tech<6)lines.push('La prochaine séance doit être plus lente et plus propre techniquement.');
 if(focus>=8)lines.push('Ta concentration est un vrai point fort.');
 else if(focus>0&&focus<6)lines.push('Réduis les distractions et fixe une seule mission technique.');
 if(pain>=4)lines.push('La douleur impose de supprimer le travail intense demain.');
 else if(+c.fatigue>=7)lines.push('Demain doit être une journée légère ou de récupération.');
 if(!lines.length)lines.push('Séance enregistrée. Complète ton débrief pour obtenir une analyse plus précise.');
 return lines;
}

function adaptedPlan(){const s=loadState(),p=structuredClone(planFor(normalizedDate())),r=readiness(s,s.weather.temp,s.weather.humidity),pain=painLevel(s);if(r.red||pain==='high'){p.kind='Récupération';p.title+=' — mode récupération';p.mins=30;p.blocks=[{title:'Séance remplacée',min:30,setup:'Aucun matériel.',actions:['Pas de sprint, saut ou course intense.','Marche légère uniquement sans douleur.','Mobilité douce.','Hydratation, repas et sommeil.'],reps:'1 passage',rest:'—',position:'Aucune position douloureuse.',key:'Faire redescendre la fatigue.',diagram:'recovery'}]}else if(r.orange||pain==='mid'){p.title+=' — volume réduit';p.mins=Math.round(p.mins*.7);p.blocks=p.blocks.map(b=>({...b,min:Math.max(5,Math.round(b.min*.7))}))}return p}
function equipmentFor(p){const set=new Set(['Eau','Téléphone / chronomètre']);for(const b of p.blocks){const t=(b.setup||'').toLowerCase();if(t.includes('ballon'))set.add('Ballon');if(t.includes('cône')||t.includes('porte'))set.add('Cônes');if(t.includes('ligne'))set.add('Espace de course');if(t.includes('mur'))set.add('Mur');}return[...set]}
function trainingTime(){const s=loadState(),p=adaptedPlan(),t=s.weather.temp,h=s.weather.humidity;if(club[normalizedDate()]){const m=club[normalizedDate()].match(/(\d{1,2}) h(?: (\d{1,2}))?/);if(m)return m[1].padStart(2,'0')+':'+(m[2]||'00').padStart(2,'0')}if(p.kind==='Repos'||p.kind==='Récupération')return'10:30';if(t>=35||(t>=32&&h>=60))return'08:00';if(t>=30||(t>=27&&h>=70))return'08:30';if(t>=26)return'09:00';return'10:00'}
function timelineItems(){const p=adaptedPlan(),m=menuFor(normalizedDate()),tr=trainingTime();const [h,mi]=tr.split(':').map(Number);const endMinutes=h*60+mi+p.mins+10;const videoMinutes=endMinutes+5;const videoTime=`${String(Math.floor(videoMinutes/60)%24).padStart(2,'0')}:${String(videoMinutes%60).padStart(2,'0')}`;return[['08:00','Réveil','Eau et lumière naturelle.'],['08:15','Petit-déjeuner',m.breakfast],['12:30','Déjeuner',m.lunch],['15:30','Collation',m.snack],[tr,'Séance',p.title],[videoTime,'Analyse vidéo','15 minutes liées au thème de la séance.'],['19:45','Dîner',m.dinner],['21:30','Routine du soir','Sac, lumière basse et calme.'],['22:30','Coucher','Objectif : environ 8 à 10 heures.']].sort((a,b)=>a[0].localeCompare(b[0]))}
function renderHome(){const s=loadState(),p=adaptedPlan(),rr=calculateRatings(s),obj=objective(),r=readiness(s,s.weather.temp,s.weather.humidity);$('homeDate').textContent=fr(normalizedDate());$('overallRating').textContent=rr.overall;$('homeXp').textContent=s.xp;$('homeSessions').textContent=Object.values(s.done).filter(Boolean).length;const c=s.checkins[today()]||{};$('recoveryStatus').textContent=(+c.sleep>=8&&+c.fatigue<=5)?'BON':(+c.fatigue>=7?'FAIBLE':'MOYEN');$('homeSessionTitle').textContent=p.title;$('homeSessionSummary').textContent=p.blocks[0].actions[0];$('homeObjective').innerHTML=`<b>${obj[0]}</b><span>${s.nextMission?.text||obj[1]}</span>`;$('homeReadiness').innerHTML=r.red?'<b class="bad">ROUGE</b><p>Récupération uniquement.</p>':r.orange?'<b class="warn">ORANGE</b><p>Volume réduit.</p>':'<b class="ok">VERT</b><p>Séance prévue autorisée.</p>';const n=s.nutrition[today()]||{meals:{}};$('dailyChecklist').innerHTML=[['Séance',!!s.done[normalizedDate()]],['Check-in',!!s.checkins[today()]],['Débrief',!!s.reviews[today()]],['3 repas',Object.values(n.meals||{}).filter(x=>x.validated).length>=3]].map(x=>`<div><span>${x[0]}</span><b>${x[1]?'✓':'○'}</b></div>`).join('');$('homeTimeline').innerHTML=timelineItems().slice(0,4).map(x=>`<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
const videoDone=!!s.sessionVideo?.[today()]?.completed;
const terrainDone=!!s.done[normalizedDate()];
const reviewDone=!!s.reviews[today()];
const mealsDone=Object.values((s.nutrition[today()]||{}).meals||{}).filter(x=>x.validated).length>=3;
const completeCount=[terrainDone,reviewDone,videoDone,mealsDone].filter(Boolean).length;
$('dayCompletionBar').innerHTML=`<div class="day-completion-head"><span>Journée complète</span><strong>${completeCount}/4</strong></div><div class="day-completion-track"><i style="width:${completeCount/4*100}%"></i></div>`;

renderWeather();renderCoach();loadNovaDashboard()}
function renderWeather(){const s=loadState(),a=advice(s.weather.temp,s.weather.humidity);$('weatherTemp').value=s.weather.temp;$('weatherHumidity').value=s.weather.humidity;$('weatherAdvice').innerHTML=`<b class="${a.level==='green'?'ok':a.level==='orange'?'warn':'bad'}">${a.title}</b><p>${a.text}</p>`}

let calendarView=new Date(normalizedDate()+'T12:00:00');
let calendarSelected=normalizedDate();
function calendarCategory(date,state){const p=planFor(date),clubText=club[date]||'';if(TEST_DAYS[date])return'test';if(/match|championnat/i.test(clubText))return'match';if(p.kind==='Repos')return'rest';if(p.kind==='Récupération')return'recovery';return'training'}
function dayDifference(from,to){return Math.round((new Date(to+'T12:00:00')-new Date(from+'T12:00:00'))/86400000)}
function calendarStatusLabel(date,state){const category=calendarCategory(date,state),delta=dayDifference(today(),date),done=!!state.done[date];if(done)return category==='match'?'Match terminé':category==='test'?'Tests terminés':category==='recovery'?'Récupération terminée':'Séance terminée';if(delta===0)return category==='match'?"Match aujourd’hui":category==='test'?"Tests aujourd’hui":category==='recovery'?"Récupération aujourd’hui":category==='rest'?"Repos aujourd’hui":"Séance aujourd’hui";if(delta===1)return category==='match'?'Match demain':category==='test'?'Tests demain':category==='recovery'?'Récupération demain':category==='rest'?'Repos demain':'Séance demain';return({training:'Séance prévue',recovery:'Récupération',match:'Match',test:'Journée de tests',rest:'Repos'})[category]}
function calendarXp(date,state){let xp=state.done[date]?50:0;xp+=dayNutritionCount(state,date)*20;xp+=(state.tests||[]).filter(t=>t.date===date).length*10;return xp}
function renderCalendar(){
 const state=loadState(),month=calendarView.getMonth(),year=calendarView.getFullYear(),first=new Date(year,month,1,12),last=new Date(year,month+1,0,12);
 $('calendarMonthLabel').textContent=first.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
 const prepNow=new Date(normalizedDate()+'T12:00:00'),start=new Date(START+'T12:00:00'),end=new Date(END+'T12:00:00'),total=Math.max(1,(end-start)/86400000),elapsed=clamp((prepNow-start)/86400000,0,total),percent=Math.round(elapsed/total*100);
 $('calendarProgressValue').textContent=percent+' %';$('calendarProgressBar').style.width=percent+'%';$('calendarDaysLeft').textContent=Math.max(0,Math.ceil((end-prepNow)/86400000));
 const all=datesBetween(START,END),remaining=all.filter(d=>d>=normalizedDate()&&planFor(d).kind!=='Repos'&&!state.done[d]).length;$('calendarSessionsLeft').textContent=remaining;$('calendarStreak').textContent=preparationStreak(state);
 const offset=(first.getDay()+6)%7,cells=[];for(let i=0;i<offset;i++)cells.push('<div class="calendar-empty"></div>');
 for(let day=1;day<=last.getDate();day++){
   const d=new Date(year,month,day,12),key=iso(d),inside=key>=START&&key<=END,category=inside?calendarCategory(key,state):'outside',p=inside?planFor(key):null,selected=key===calendarSelected?' selected':'',done=inside&&state.done[key],isToday=inside&&key===today(),isNext=inside&&!isToday&&dayDifference(today(),key)===1;
   const modifiers=`${selected}${done?' completed':''}${isToday?' is-today':''}${isNext?' is-next':''}`;
   cells.push(`<button class="calendar-day ${category}${modifiers}" data-date="${key}" ${inside?'':'disabled'}><span class="calendar-number">${day}</span>${inside?`<span class="calendar-type-dot" aria-hidden="true"></span>${done?'<span class="calendar-check" aria-label="Terminé">✓</span>':''}${isToday?'<span class="calendar-relative">Aujourd’hui</span>':isNext?'<span class="calendar-relative">Demain</span>':''}<small>${p.title}</small>`:''}</button>`)
 }
 $('calendarGrid').innerHTML=cells.join('');document.querySelectorAll('.calendar-day[data-date]:not([disabled])').forEach(b=>b.onclick=()=>{calendarSelected=b.dataset.date;renderCalendar();renderCalendarDetail(calendarSelected);setTimeout(()=>$('calendarDetail').scrollIntoView({behavior:'smooth',block:'start'}),50)});renderCalendarDetail(calendarSelected)
}
function renderCalendarDetail(date){
 const state=loadState(),p=planFor(date),m=menuFor(date),c=state.checkins[date]||{},r=state.reviews[date]||{},pain=state.pain[date]||{},nutrition=dayNutritionCount(state,date),category=calendarCategory(date,state),xp=calendarXp(date,state),status=calendarStatusLabel(date,state),test=TEST_DAYS[date];
 const coachText=r.priority?`Priorité : ${r.priority}`:r.good?`Point positif : ${r.good}`:date>today()?'Le coach adaptera cette journée avec tes données de sommeil, fatigue, douleur et météo.':'Aucun débrief enregistré.';
 $('calendarDetail').innerHTML=`<div class="calendar-detail-head"><div><div class="eyebrow">${status.toUpperCase()}</div><h2>${fr(date)}</h2><p>${p.title}</p></div><span class="calendar-status ${category}">${status}</span></div><div class="calendar-detail-grid"><div class="calendar-info"><b>SÉANCE</b><span>${p.mins} min • ${p.blocks.length} blocs</span></div><div class="calendar-info"><b>SOMMEIL</b><span>${c.sleep||'—'} h</span></div><div class="calendar-info"><b>FATIGUE</b><span>${c.fatigue||'—'}/10</span></div><div class="calendar-info"><b>NUTRITION</b><span>${nutrition}/4 repas validés</span></div><div class="calendar-info"><b>DOULEUR</b><span>${pain.zone||'Aucune'} ${pain.run?`• course ${pain.run}/10`:''}</span></div><div class="calendar-info"><b>XP DU JOUR</b><span>${xp} XP</span></div></div>${test?`<div class="calendar-callout"><b>PROTOCOLE ${test.phase.toUpperCase()}</b><span>Sprint 10 m, précision, slalom, jongles et ressenti Domtac.</span></div>`:''}<div class="calendar-day-columns"><div><div class="eyebrow">MENU</div><p><b>Petit-déjeuner :</b> ${m.breakfast}</p><p><b>Déjeuner :</b> ${m.lunch}</p><p><b>Collation :</b> ${m.snack}</p><p><b>Dîner :</b> ${m.dinner}</p></div><div><div class="eyebrow">COACH / DÉBRIEF</div><p>${coachText}</p>${r.bad?`<p><b>Difficulté :</b> ${r.bad}</p>`:''}${c.notes?`<p><b>Notes :</b> ${c.notes}</p>`:''}</div></div><div class="actions">${date===normalizedDate()?'<button id="calendarOpenSession" class="primary">OUVRIR LA SÉANCE</button>':''}<button id="calendarOpenDay" class="secondary">VOIR MA JOURNÉE</button></div>`;
 if($('calendarOpenSession'))$('calendarOpenSession').onclick=()=>showPage('session');$('calendarOpenDay').onclick=()=>{showPage('profile');showProfilePanel('day')}
}
function openCalendar(date=normalizedDate()){calendarSelected=date;calendarView=new Date(date+'T12:00:00');showPage('calendar');renderCalendar()}

let sessionConfig={plans:[],equipment:[]},run={block:0,segment:0,left:0,id:null,start:null};
function renderSession(){const p=adaptedPlan(),s=loadState(),obj=objective(),equipment=equipmentFor(p),saved=s.equipment[normalizedDate()]||{},test=TEST_DAYS[normalizedDate()];$('sessionDate').textContent=fr(normalizedDate());$('sessionDuration').textContent=p.mins+' MIN';$('sessionObjective').innerHTML='';$('sessionTestNotice').innerHTML=test?`<div class="notice"><b class="ok">JOUR DE TEST — PHASE ${test.phase.toUpperCase()}</b><p>Pas de séance intense supplémentaire. Utilise exactement le même protocole aux trois dates.</p></div>`:'';sessionConfig.equipment=equipment;sessionConfig.plans=p.blocks.map(b=>normalizePlan(buildTimerPlan(b)));$('sessionSetup').classList.remove('hidden');$('sessionSetup').innerHTML=`<article class="setup-card"><div class="eyebrow">1. PRÉPARE TON MATÉRIEL</div><div class="equipment-grid">${equipment.map(x=>`<label><input class="equip" data-item="${x}" type="checkbox" ${saved[x]?'checked':''}>${x}</label>`).join('')}</div></article>`;document.querySelectorAll('.equip').forEach(e=>e.onchange=()=>{const st=loadState();st.equipment[normalizedDate()]=st.equipment[normalizedDate()]||{};st.equipment[normalizedDate()][e.dataset.item]=e.checked;saveState(st)});$('sessionOverview').classList.remove('hidden');$('sessionRunner').classList.add('hidden');$('sessionEvaluation').classList.add('hidden');$('sessionVideoStep').classList.add('hidden');$('postSessionCoach').classList.add('hidden');$('sessionOverview').innerHTML=`<article class="launch"><div class="eyebrow">2. LANCE TA SÉANCE</div><h2>${p.title}</h2><p class="muted">Les temps de travail et de récupération sont déjà calés. Pendant la séance, tu pourras ajouter ou retirer du temps directement avec des boutons.</p><div class="facts"><div class="fact"><b>BLOCS</b>${p.blocks.length}</div><div class="fact"><b>DURÉE</b>${p.mins} min</div><div class="fact"><b>XP</b>+50</div><div class="fact"><b>MISSION</b>${obj[0]}</div></div><button id="startSession" class="primary">LANCER MA SÉANCE</button></article>`;$('startSession').onclick=startSession}
function startSession(){run={block:0,segment:0,left:0,id:null,start:Date.now()};$('sessionSetup').classList.add('hidden');$('sessionOverview').classList.add('hidden');$('sessionRunner').classList.remove('hidden');showSegment()}
function showSegment(){clearInterval(run.id);run.id=null;const p=adaptedPlan(),b=p.blocks[run.block],segments=sessionConfig.plans[run.block],seg=segments[run.segment];run.left=seg.seconds;const doneSegments=sessionConfig.plans.slice(0,run.block).reduce((a,x)=>a+x.length,0)+run.segment,total=sessionConfig.plans.reduce((a,x)=>a+x.length,0),pct=doneSegments/total*100;$('sessionRunner').innerHTML=`<article class="runner"><div class="actions between"><span class="pill">Bloc ${run.block+1}/${p.blocks.length}</span><span class="pill">Étape ${run.segment+1}/${segments.length}</span></div><div class="runner-progress"><span style="width:${pct}%"></span></div><div class="phase-label">${seg.type==='rest'?'RÉCUPÉRATION':'TRAVAIL'}</div><h2>${seg.label}</h2><div class="fact"><b>BLOC</b>${b.title}</div><ol class="do-list">${b.actions.map(x=>`<li>${x}</li>`).join('')}</ol><div class="diagram">${diagram(b.diagram)}<div class="legend"><span><i class="lg-player"></i>Joueur</span><span><i class="lg-ball"></i>Ballon</span><span><i class="lg-cone"></i>Cône</span><span><i class="lg-arrow"></i>Trajet</span></div></div><div id="runnerClock" class="runner-clock">${format(run.left)}</div><div class="quick-time"><button data-seconds="-15">−15 s</button><button data-seconds="15">+15 s</button><button data-seconds="30">+30 s</button><button data-rest="30">AJOUTER 30 s DE RÉCUP</button><button data-rest="60">AJOUTER 1 MIN DE RÉCUP</button></div><div class="actions"><button id="backSegment" class="secondary">PRÉCÉDENT</button><button id="toggleTimer" class="secondary">DÉMARRER</button><button id="nextSegment" class="primary">SUIVANT</button></div></article>`;$('backSegment').onclick=prevSegment;$('toggleTimer').onclick=toggleTimer;$('nextSegment').onclick=nextSegment;document.querySelectorAll('[data-seconds]').forEach(b=>b.onclick=()=>adjustCurrentTime(+b.dataset.seconds));document.querySelectorAll('[data-rest]').forEach(b=>b.onclick=()=>insertRecovery(+b.dataset.rest))}
const format=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
function toggleTimer(){if(run.id){clearInterval(run.id);run.id=null;$('toggleTimer').textContent='REPRENDRE';return}$('toggleTimer').textContent='PAUSE';run.id=setInterval(()=>{run.left--;$('runnerClock').textContent=format(Math.max(0,run.left));if(run.left<=0){clearInterval(run.id);run.id=null;navigator.vibrate?.([250,100,250]);setTimeout(nextSegment,600)}},1000)}
function adjustCurrentTime(delta){run.left=Math.max(0,run.left+delta);$('runnerClock').textContent=format(run.left);toast(delta>0?`${delta} secondes ajoutées`:`${Math.abs(delta)} secondes retirées`)}
function insertRecovery(seconds){clearInterval(run.id);run.id=null;const current=sessionConfig.plans[run.block];current.splice(run.segment+1,0,{label:`Récupération ajoutée ${seconds}s`,seconds,type:'rest'});toast('Récupération ajoutée après cette étape')}
function nextSegment(){clearInterval(run.id);run.id=null;const p=adaptedPlan();if(run.segment<sessionConfig.plans[run.block].length-1){run.segment++;showSegment()}else if(run.block<p.blocks.length-1){run.block++;run.segment=0;showSegment()}else finishSession()}
function prevSegment(){if(run.segment>0){run.segment--;showSegment()}else if(run.block>0){run.block--;run.segment=sessionConfig.plans[run.block].length-1;showSegment()}}
function finishSession(){const s=loadState(),k=normalizedDate();s.done[k]=true;s.sessionRuns[k]={elapsed:Math.max(1,Math.round((Date.now()-run.start)/60000)),completedAt:new Date().toISOString()};s.xp+=50;saveState(s);$('sessionRunner').classList.add('hidden');$('sessionEvaluation').classList.remove('hidden');$('sessionEvaluation').innerHTML=`<article class="evaluation"><div class="eyebrow">SÉANCE TERMINÉE • +50 XP</div><h2>Évalue ta séance</h2><div class="fields"><label>Technique /10<input id="evalTech" type="number"></label><label>Concentration /10<input id="evalFocus" type="number"></label><label>Fatigue /10<input id="evalFatigue" type="number"></label><label>Douleur /10<input id="evalPain" type="number"></label></div><label>Ce qui a été bien<textarea id="evalGood"></textarea></label><label>Ce qui a été difficile<textarea id="evalBad"></textarea></label><label>Priorité suivante<input id="evalPriority"></label><button id="saveEvaluation" class="primary">ENREGISTRER</button></article>`;$('saveEvaluation').onclick=saveEvaluation;if(TEST_DAYS[k]){$('sessionEvaluation').insertAdjacentHTML('beforeend','<button id="openTestResults" class="secondary gap">ENREGISTRER MES RÉSULTATS DE TEST</button>');$('openTestResults').onclick=()=>{showPage('progress');setTimeout(()=>$('testPhase').value=TEST_DAYS[k].phase,50)}}renderHome();renderProgress()}
function saveEvaluation(){
 const s=loadState(),k=today();
 s.reviews[k]={
  good:$('evalGood').value,bad:$('evalBad').value,priority:$('evalPriority').value,
  tech:$('evalTech').value,focus:$('evalFocus').value,pain:$('evalPain').value
 };
 s.checkins[k]=s.checkins[k]||{};
 s.checkins[k].fatigue=$('evalFatigue').value;
 saveState(s);
 $('sessionEvaluation').classList.add('hidden');
 loadIntegratedSessionVideo(adaptedPlan(),()=>{
  const latest=loadState();
  $('postSessionCoach').classList.remove('hidden');
  $('postSessionCoach').innerHTML=`<article class="panel coach-card"><div class="eyebrow">SYNTHÈSE DU COACH</div><h2>Ce qu’il faut retenir aujourd’hui</h2><p>${latest.sessionVideo?.[k]?.lesson||'Analyse terminée.'}</p><div class="objective"><b>MISSION POUR LA PROCHAINE SÉANCE</b><span>${latest.nextMission?.text||'Rester simple et propre techniquement.'}</span></div><button id="finishWholeDay" class="primary">TERMINER LA JOURNÉE</button></article>`;
  $('finishWholeDay').onclick=()=>{renderAll();showPage('home')};
 });
 toast('Débrief enregistré — passe à l’analyse vidéo');
}
function renderProgress(){setTimeout(loadCareerStable,0);setTimeout(loadPerformanceCenter,0);
setTimeout(loadDailyChallenge,0);
setTimeout(loadVideoAnalysis,0);
setTimeout(loadSmartPlanning,0);
setTimeout(loadNovaDashboard,0);
setTimeout(loadPerformanceCenter,0);const s=loadState(),r=calculateRatings(s);$('ratingConfidence').textContent=`Confiance ${r.confidence} • ${r.evidence} preuves`;$('playerCard').innerHTML=`<div class="overall-badge"><div><strong>${r.overall}</strong><span>N°10</span></div></div><div><div class="eyebrow">PROFIL RÉEL</div><h2>Milieu offensif droitier</h2><p class="muted">Les notes ne montent pas avec les XP seuls. Elles utilisent tes tests, ta régularité, tes débriefs, ton sommeil et ta nutrition.</p></div>`;$('ratingsGrid').innerHTML=RATING_NAMES.map(([k,n])=>`<div class="rating-card"><div class="rating-top"><b>${n}</b><strong>${r.ratings[k]}</strong></div><div class="rating-bar"><i style="width:${r.ratings[k]}%"></i></div><small>${ratingReason(k,s)}</small></div>`).join('');const start=new Date(normalizedDate()+'T12:00:00'),day=(start.getDay()+6)%7;start.setDate(start.getDate()-day);const dates=Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d.toISOString().slice(0,10)}),load=dates.reduce((a,d)=>{const c=s.checkins[d]||{};return a+(+c.rpe||0)*(+c.minutes||0)},0);$('weekSummary').innerHTML=`<div class="facts"><div class="fact"><b>SÉANCES</b>${dates.filter(d=>s.done[d]).length}/7</div><div class="fact"><b>CHARGE</b>${load}</div><div class="fact"><b>CHECK-INS</b>${dates.filter(d=>s.checkins[d]).length}</div><div class="fact"><b>OBJECTIF</b>${objective()[0]}</div></div>`;$('ratingRules').innerHTML='<ul><li>Les tests donnent les preuves les plus fortes.</li><li>Les séances et débriefs renforcent la confiance des notes.</li><li>Le sommeil et l’alimentation influencent surtout récupération et discipline.</li><li>Une semaine manquée ne fait pas chuter brutalement les notes.</li></ul>';renderTests()}
function renderTests(){const s=loadState(),scheduled=TEST_DAYS[normalizedDate()];$('testDate').value=today();if(scheduled)$('testPhase').value=scheduled.phase;$('testsHistory').innerHTML=(s.tests||[]).slice().reverse().map(t=>`<div class="test-row"><b>${t.phase} — ${t.name}</b><p>${t.date} • ${t.value} ${t.unit||''}</p><small>${t.conditions||''}</small></div>`).join('')||'<p class="muted">Aucun test enregistré.</p>'}
function renderDay(){
 const s=loadState(),m=menuFor(normalizedDate()),smart=s.smartPlanning?.[normalizedDate()];
 const items=smart?.accepted&&Array.isArray(smart.items)?smart.items:timelineItems();
 $('timeline').innerHTML=items.map(x=>`<div class="time-row"><div class="time">${x[0]}</div><div class="dot"></div><div class="time-card"><b>${x[1]}</b><span>${x[2]}</span></div></div>`).join('');
 $('dayMenu').innerHTML=[['Petit-déjeuner',m.breakfast],['Déjeuner',m.lunch],['Collation',m.snack],['Dîner',m.dinner]].map(x=>`<div class="menu-row"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
}
async function renderNutrition(){const s=loadState(),k=today(),day=s.nutrition[k]||{meals:{},review:{}},m=menuFor(normalizedDate()),done=mealTypes.filter(x=>day.meals?.[x.id]?.validated).length;$('nutritionXp').textContent=s.xp;$('nutritionMetrics').innerHTML=`<article><small>REPAS</small><strong>${done}/4</strong></article><article><small>XP JOUR</small><strong>${done*20}</strong></article><article><small>EAU</small><strong>${day.review?.water||'—'} L</strong></article><article><small>ÉNERGIE</small><strong>${day.review?.energy||'—'}/10</strong></article>`;const cards=[];for(const mt of mealTypes){const d=day.meals?.[mt.id]||{},blob=await getPhoto(k+'_'+mt.id),url=blob?URL.createObjectURL(blob):'';cards.push(`<article class="meal-card"><div class="meal-photo">${url?`<img src="${url}">`:`<div class="meal-placeholder">${mt.icon}</div>`}</div><div class="meal-body"><div class="eyebrow">${mt.name.toUpperCase()}</div><h3>${m[mt.id]}</h3><p>${mt.role}</p><div class="meal-checks"><label><input id="${mt.id}_carb" type="checkbox" ${d.carb?'checked':''}>Glucides</label><label><input id="${mt.id}_protein" type="checkbox" ${d.protein?'checked':''}>Protéines</label><label><input id="${mt.id}_color" type="checkbox" ${d.color?'checked':''}>Fruit/légumes</label><label><input id="${mt.id}_water" type="checkbox" ${d.water?'checked':''}>Eau</label></div><label class="secondary">PHOTO<input class="photo-input" data-meal="${mt.id}" type="file" accept="image/*" capture="environment"></label><button class="primary validate-meal" data-meal="${mt.id}">${d.validated?'VALIDÉ':'VALIDER • +20 XP'}</button></div></article>`)}$('mealCards').innerHTML=cards.join('');document.querySelectorAll('.photo-input').forEach(x=>x.onchange=async e=>{const f=e.target.files[0];if(f){await putPhoto(k+'_'+e.target.dataset.meal,f);renderNutrition()}});document.querySelectorAll('.validate-meal').forEach(x=>x.onclick=()=>{const id=x.dataset.meal;validateMeal(id,{carb:$(id+'_carb').checked,protein:$(id+'_protein').checked,color:$(id+'_color').checked,water:$(id+'_water').checked});renderNutrition();renderHome();renderProgress()});$('foodEnergy').value=day.review?.energy||'';$('foodDigestion').value=day.review?.digestion||'';$('foodHunger').value=day.review?.hunger||'';$('foodWater').value=day.review?.water||'';$('foodNotes').value=day.review?.notes||''}
function renderTracking(){const s=loadState(),c=s.checkins[today()]||{},r=s.reviews[today()]||{};[['trackSleep','sleep'],['trackSleepQ','sleepQ'],['trackFatigue','fatigue'],['trackMotivation','motivation'],['trackKnee','knee'],['trackSoreness','soreness'],['trackRpe','rpe'],['trackMinutes','minutes'],['trackNotes','notes']].forEach(([id,k])=>$(id).value=c[k]||'');[['reviewGood','good'],['reviewBad','bad'],['reviewPriority','priority'],['reviewTech','tech'],['reviewFocus','focus'],['reviewPain','pain'],['reviewPride','pride']].forEach(([id,k])=>$(id).value=r[k]||'');const dates=[...new Set([...Object.keys(s.checkins),...Object.keys(s.reviews)])].sort().reverse().slice(0,10);$('trackingHistory').innerHTML=dates.map(d=>`<div class="history-item"><b>${fr(d)}</b><p class="muted">Sommeil ${s.checkins[d]?.sleep||'—'} h • Fatigue ${s.checkins[d]?.fatigue||'—'}/10 • Genou ${s.checkins[d]?.knee||0}/10</p><p>${s.reviews[d]?.good||''}</p></div>`).join('')||'<p class="muted">Aucune donnée.</p>'}
function renderPain(){const s=loadState(),p=s.pain[today()]||{};[['painZone','zone'],['painRest','rest'],['painRun','run'],['painStairs','stairs'],['painPost','post'],['painTrend','trend']].forEach(([id,k])=>$(id).value=p[k]??(id==='painTrend'?'Stable':''));$('painSwelling').checked=!!p.swelling;$('painInstability').checked=!!p.instability;$('painLocking').checked=!!p.locking;const l=painLevel(s);$('painDecision').innerHTML=l==='high'?'<b class="bad">ARRÊT DU TRAVAIL INTENSE</b><p>Préviens un adulte et le staff.</p>':l==='mid'?'<b class="warn">SÉANCE RÉDUITE</b><p>Technique légère et surveillance.</p>':'<b class="ok">AUCUN SIGNAL IMPORTANT</b><p>Tu peux suivre le plan si les sensations restent bonnes.</p>'}
function showProfilePanel(name){document.querySelectorAll('.profile-panel').forEach(x=>x.classList.remove('active'));$('profile-'+name).classList.add('active');document.querySelectorAll('#profileTabs button').forEach(x=>x.classList.toggle('active',x.dataset.panel===name))}
function renderNotifications(){const s=loadState(),n=s.notifications;$('notifyTraining').checked=n.training;$('notifyMeals').checked=n.meals;$('notifySleep').checked=n.sleep;$('notifyLead').value=n.lead;$('notificationStatus').innerHTML=!notify.supported()?'<b class="warn">NON DISPONIBLE</b>':Notification.permission==='granted'?'<b class="ok">AUTORISÉES</b>':'<b class="warn">À ACTIVER</b>'}
function buildCoach(){const s=loadState(),c=s.checkins[today()]||{},r=s.reviews[today()]||{},p=adaptedPlan(),rr=calculateRatings(s);$('coachText').value=`Bilan joueur — ${fr(today())}\nSéance : ${p.title}\nNote générale : ${rr.overall}\nSommeil : ${c.sleep||'—'} h\nFatigue : ${c.fatigue||'—'}/10\nGenou : ${c.knee||0}/10\nRéussi : ${r.good||'—'}\nDifficulté : ${r.bad||'—'}\nPriorité : ${r.priority||'—'}\n\nAdapte la prochaine séance avec prudence.`}
function bind(){document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>showPage(b.dataset.page));document.querySelectorAll('[data-open-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.openPage));document.querySelectorAll('#profileTabs button').forEach(b=>b.onclick=()=>showProfilePanel(b.dataset.panel));$('openDayPlanner').onclick=()=>{showPage('profile');showProfilePanel('day')};$('openCalendar').onclick=()=>openCalendar();$('openCalendarFromProfile').onclick=()=>openCalendar();$('calendarBack').onclick=()=>showPage('home');$('calendarPrev').onclick=()=>{calendarView.setMonth(calendarView.getMonth()-1);renderCalendar()};$('calendarNext').onclick=()=>{calendarView.setMonth(calendarView.getMonth()+1);renderCalendar()};if($('refreshCoach'))$('refreshCoach').onclick=()=>{renderCoach();toast('Analyse mise à jour')};$('weatherTemp').onchange=$('weatherHumidity').onchange=()=>{const s=loadState();s.weather={temp:+$('weatherTemp').value,humidity:+$('weatherHumidity').value};saveState(s);renderAll()};$('weatherLocation').onclick=async()=>{try{const w=await currentWeather(),s=loadState();s.weather=w;saveState(s);renderAll();toast('Météo mise à jour')}catch{toast('Météo indisponible')}};$('rebuildDay').onclick=()=>{renderDay();toast(`Journée recalculée : séance à ${trainingTime()}`)};$('saveTracking').onclick=()=>{const s=loadState();s.checkins[today()]={sleep:$('trackSleep').value,sleepQ:$('trackSleepQ').value,fatigue:$('trackFatigue').value,motivation:$('trackMotivation').value,knee:$('trackKnee').value,soreness:$('trackSoreness').value,rpe:$('trackRpe').value,minutes:$('trackMinutes').value,notes:$('trackNotes').value};saveState(s);renderAll();toast('Suivi enregistré')};$('saveReview').onclick=()=>{const s=loadState();s.reviews[today()]={good:$('reviewGood').value,bad:$('reviewBad').value,priority:$('reviewPriority').value,tech:$('reviewTech').value,focus:$('reviewFocus').value,pain:$('reviewPain').value,pride:$('reviewPride').value};saveState(s);renderAll();toast('Débrief enregistré')};$('savePain').onclick=()=>{const s=loadState();s.pain[today()]={zone:$('painZone').value,rest:$('painRest').value,run:$('painRun').value,stairs:$('painStairs').value,post:$('painPost').value,swelling:$('painSwelling').checked,instability:$('painInstability').checked,locking:$('painLocking').checked,trend:$('painTrend').value};saveState(s);renderAll();toast('Douleur enregistrée')};$('saveTest').onclick=()=>{const s=loadState(),entry={phase:$('testPhase').value,date:$('testDate').value,name:$('testName').value,value:$('testValue').value,unit:$('testUnit').value,conditions:$('testConditions').value};if(!entry.value)return toast('Ajoute un résultat');const duplicate=s.tests.some(t=>t.phase===entry.phase&&t.name===entry.name);s.tests.push(entry);if(!duplicate)s.xp+=10;saveState(s);renderProgress();renderHome();toast(duplicate?'Test mis à jour dans l’historique':'Test enregistré • +10 XP')};$('saveFoodReview').onclick=()=>{saveFoodReview({energy:$('foodEnergy').value,digestion:$('foodDigestion').value,hunger:$('foodHunger').value,water:$('foodWater').value,notes:$('foodNotes').value});renderNutrition();toast('Bilan nutrition enregistré')};$('enableNotifications').onclick=async()=>{try{await notify.enable();renderNotifications()}catch{toast('Notifications indisponibles')}};$('saveNotifications').onclick=()=>{notify.saveSettings({training:$('notifyTraining').checked,meals:$('notifyMeals').checked,sleep:$('notifySleep').checked,lead:+$('notifyLead').value});toast('Préférences enregistrées')};$('testNotifications').onclick=()=>notify.send('Next Level 10','Notification de test');$('buildCoach').onclick=buildCoach;$('copyCoach').onclick=async()=>{buildCoach();await navigator.clipboard.writeText($('coachText').value);toast('Bilan copié')};$('exportData').onclick=exportState;$('importData').onchange=async e=>{if(e.target.files[0]){await importState(e.target.files[0]);location.reload()}};$('resetData').onclick=()=>{if(confirm('Effacer toutes les données ?')){clearState();location.reload()}}}







async function loadNovaDashboard(){
 const root=$('novaDashboardRoot');if(!root)return;
 try{const mod=await import('./nova.js');mod.renderNovaDashboard(root)}catch(error){console.error('NOVA indisponible:',error);root.innerHTML='<div class="notice"><b class="warn">NOVA TEMPORAIREMENT INDISPONIBLE</b></div>'}
}

async function loadSmartPlanning(){
 const dayRoot=$('smartPlanningRoot'),homeRoot=$('smartPlanningHome');
 try{
   const mod=await import('./planning.js');
   if(dayRoot)mod.renderSmartPlanning(dayRoot,false);
   if(homeRoot)mod.renderSmartPlanning(homeRoot,true);
 }catch(error){
   console.error('Planning intelligent indisponible:',error);
   if(dayRoot)dayRoot.innerHTML='<div class="notice"><b class="warn">PLANNING INTELLIGENT INDISPONIBLE</b><p>Le planning de base reste actif.</p></div>';
 }
}

async function loadIntegratedSessionVideo(plan,onComplete){
 const root=$('sessionVideoStep');
 if(!root)return;
 try{
   const mod=await import('./session-video.js');
   root.classList.remove('hidden');
   mod.renderSessionVideo(root,plan,onComplete);
 }catch(error){
   console.error('Analyse vidéo intégrée indisponible:',error);
   root.classList.remove('hidden');
   root.innerHTML='<div class="notice"><b class="warn">ANALYSE VIDÉO TEMPORAIREMENT INDISPONIBLE</b><p>Le reste de l’application continue normalement.</p></div>';
 }
}

async function loadVideoAnalysis(){
 const root=$('videoAnalysisRoot');
 if(!root)return;
 try{
   const mod=await import('./video.js');
   mod.renderVideoAnalysis(root);
 }catch(error){
   console.error('Analyse vidéo indisponible:',error);
   root.innerHTML='<div class="notice"><b class="warn">ANALYSE VIDÉO TEMPORAIREMENT INDISPONIBLE</b><p>Les autres fonctions restent disponibles.</p></div>';
 }
}

async function loadDailyChallenge(){
 const root=$('dailyChallengeRoot');
 if(!root)return;
 try{
   const mod=await import('./challenge.js');
   mod.renderDailyChallenge(root);
 }catch(error){
   console.error('Défi quotidien indisponible:',error);
   root.innerHTML='<div class="notice"><b class="warn">DÉFI TEMPORAIREMENT INDISPONIBLE</b><p>Les autres fonctions restent disponibles.</p></div>';
 }
}

async function loadPerformanceCenter(){
 const root=$('performanceCenterRoot');
 if(!root)return;
 try{
   const mod=await import('./performance.js');
   mod.renderPerformance(root,loadState());
 }catch(error){
   console.error('Performance Center indisponible:',error);
   root.innerHTML='<div class="notice"><b class="warn">PERFORMANCE CENTER TEMPORAIREMENT INDISPONIBLE</b><p>Le reste de l’application continue de fonctionner.</p></div>';
 }
}

async function loadCareerStable(){
 const root=$('careerStableRoot');
 if(!root)return;
 try{
   const mod=await import('./career.js');
   mod.renderCareer(root,loadState());
 }catch(error){
   console.error('Mode Carrière indisponible:',error);
   root.innerHTML='<div class="notice"><b class="warn">MODE CARRIÈRE TEMPORAIREMENT INDISPONIBLE</b><p>Le reste de l’application continue de fonctionner normalement.</p></div>';
 }
}

function renderAll(){renderHome();renderSession();renderProgress();renderDay();renderCalendar();renderNutrition().catch(console.error);renderTracking();renderPain();renderNotifications();buildCoach();renderCoach()}
window.addEventListener('error',e=>{$('fatalError').classList.remove('hidden');$('fatalError').innerHTML=`<h2>Erreur détectée</h2><p>${e.message}</p><p>Recharge la page : tes données restent sauvegardées.</p>`});
bind();renderAll();if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(console.error);
setTimeout(loadCareerStable,0);
window.addEventListener('nl10:challenge-completed',()=>{try{renderHome();renderProgress()}catch(e){console.error(e)}});

window.addEventListener('nl10:video-completed',()=>{try{renderHome();renderProgress();loadCareerStable();loadPerformanceCenter()}catch(e){console.error(e)}});

window.addEventListener('nl10:session-video-completed',()=>{try{renderHome();renderProgress();renderDay()}catch(e){console.error(e)}});

window.addEventListener('nl10:open-smart-day',()=>{
 try{showPage('profile');showProfilePanel('day');setTimeout(loadSmartPlanning,0)}catch(e){console.error(e)}
});
window.addEventListener('nl10:smart-plan-updated',()=>{
 try{renderDay();renderHome();loadSmartPlanning()}catch(e){console.error(e)}
});

window.addEventListener('nl10:smart-plan-updated',()=>{try{loadNovaDashboard()}catch(e){console.error(e)}});

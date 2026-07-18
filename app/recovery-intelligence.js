const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,value));
const finite=value=>{const n=Number(value);return value!==''&&value!==null&&value!==undefined&&Number.isFinite(n)?n:null};
const average=values=>{const valid=values.filter(Number.isFinite);return valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null};
const isoLocal=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const dateKeys=(count=28,end=new Date())=>{const out=[];const cursor=new Date(end);for(let i=0;i<count;i++){out.push(isoLocal(cursor));cursor.setDate(cursor.getDate()-1)}return out};
const sessionLoad=checkin=>(finite(checkin?.rpe)||0)*(finite(checkin?.minutes)||0);

function painPenalty(pain={}){
  let penalty=0;
  if(pain.swelling)penalty+=18;
  if(pain.instability)penalty+=18;
  if(pain.locking)penalty+=18;
  const running=finite(pain.run),after=finite(pain.post);
  if(running!==null)penalty+=Math.max(0,running-2)*5;
  if(after!==null)penalty+=Math.max(0,after-2)*3;
  if(pain.trend==='Pire')penalty+=16;
  return Math.min(45,penalty);
}

export function recoveryHistory(state,count=28){
  return dateKeys(count).map(date=>{
    const checkin=state.checkins?.[date]||{};
    return{date,sleep:finite(checkin.sleep),fatigue:finite(checkin.fatigue),soreness:finite(checkin.soreness),motivation:finite(checkin.motivation),load:sessionLoad(checkin)};
  });
}

export function workloadBalance(state){
  const history=recoveryHistory(state,28);
  const acute=history.slice(0,7).reduce((sum,item)=>sum+item.load,0);
  const chronic=history.reduce((sum,item)=>sum+item.load,0)/4;
  const ratio=chronic>0?acute/chronic:null;
  let band='INCONNU',message='Ajoute plusieurs séances avec durée et RPE pour suivre ta charge.';
  if(ratio!==null){
    if(ratio>1.5){band='ÉLEVÉE';message='Hausse rapide de charge : retire du volume et protège la récupération.'}
    else if(ratio>1.25){band='À SURVEILLER';message='Charge en progression rapide : garde une séance maîtrisée.'}
    else if(ratio<0.65&&chronic>150){band='BASSE';message='Charge récente faible : reprends progressivement, sans rattraper en une fois.'}
    else{band='STABLE';message='La charge récente reste cohérente avec les dernières semaines.'}
  }
  return{acute:Math.round(acute),chronic:Math.round(chronic),ratio:ratio===null?null:Number(ratio.toFixed(2)),band,message};
}

export function analyzeRecovery(state,date=isoLocal(new Date())){
  const checkin=state.checkins?.[date]||{};
  const pain=state.pain?.[date]||{};
  const sleep=finite(checkin.sleep),fatigue=finite(checkin.fatigue),soreness=finite(checkin.soreness),motivation=finite(checkin.motivation);
  const known=[sleep,fatigue,soreness].filter(Number.isFinite).length;
  const workload=workloadBalance(state);
  let score=known?100:55;
  if(sleep!==null)score-=Math.max(0,8-sleep)*9;
  if(fatigue!==null)score-=Math.max(0,fatigue-3)*6;
  if(soreness!==null)score-=Math.max(0,soreness-3)*5;
  if(motivation!==null&&motivation<5)score-=(5-motivation)*3;
  score-=painPenalty(pain);
  if(workload.ratio!==null&&workload.ratio>1.25)score-=Math.min(18,(workload.ratio-1.25)*30);
  score=clamp(Math.round(score));

  const status=score>=80?'PRÊT':score>=60?'ADAPTER':score>=40?'RÉCUPÉRER':'STOP';
  const history=recoveryHistory(state,14);
  const recentSleep=average(history.slice(0,7).map(item=>item.sleep));
  const previousSleep=average(history.slice(7,14).map(item=>item.sleep));
  const sleepTrend=recentSleep===null||previousSleep===null?'stable':recentSleep>previousSleep+.25?'up':recentSleep<previousSleep-.25?'down':'stable';
  const confidence=known===3?'ÉLEVÉE':known===2?'MOYENNE':'FAIBLE';
  const recommendation=status==='PRÊT'?'Séance prévue, priorité à la qualité.':status==='ADAPTER'?'Réduis le volume de 20 % et garde une exécution propre.':status==='RÉCUPÉRER'?'Technique légère, mobilité et récupération active.':'Pas d’intensité : parle à un adulte ou au staff si la douleur persiste.';
  const signals=[];
  if(sleep!==null&&sleep<7)signals.push('sommeil court');
  if(fatigue!==null&&fatigue>=7)signals.push('fatigue élevée');
  if(soreness!==null&&soreness>=7)signals.push('courbatures élevées');
  if(painPenalty(pain)>=18)signals.push('signal douleur');
  if(workload.ratio!==null&&workload.ratio>1.25)signals.push('charge en hausse');
  return{score,status,recommendation,averageSleep:recentSleep,previousAverageSleep:previousSleep,sleepTrend,confidence,missing:known<3,signals,workload};
}

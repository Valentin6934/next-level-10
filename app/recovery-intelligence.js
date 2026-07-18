const average=values=>{const valid=values.filter(Number.isFinite);return valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null};
const dateKeys=(count=7)=>{const out=[];const d=new Date();for(let i=0;i<count;i++){out.push(d.toISOString().slice(0,10));d.setDate(d.getDate()-1)}return out};

export function analyzeRecovery(state,date=new Date().toISOString().slice(0,10)){
  const checkin=state.checkins?.[date]||{};
  const pain=state.pain?.[date]||{};
  const sleep=Number(checkin.sleep),fatigue=Number(checkin.fatigue),soreness=Number(checkin.soreness);
  const known=[sleep,fatigue,soreness].filter(Number.isFinite).length;
  let score=known?100:55;
  if(Number.isFinite(sleep))score-=Math.max(0,8-sleep)*9;
  if(Number.isFinite(fatigue))score-=Math.max(0,fatigue-3)*6;
  if(Number.isFinite(soreness))score-=Math.max(0,soreness-3)*5;
  if(pain.swelling||pain.instability||pain.locking)score-=35;
  if(Number(pain.run)>=5||pain.trend==='Pire')score-=25;
  score=Math.max(0,Math.min(100,Math.round(score)));
  const status=score>=80?'PRÊT':score>=60?'ADAPTER':score>=40?'RÉCUPÉRER':'STOP';
  const trend=average(dateKeys(7).map(key=>Number(state.checkins?.[key]?.sleep)).filter(Number.isFinite));
  const recommendation=status==='PRÊT'?'Séance prévue, priorité à la qualité.':status==='ADAPTER'?'Réduis le volume de 20 % et garde une exécution propre.':status==='RÉCUPÉRER'?'Technique légère, mobilité et récupération active.':'Pas d’intensité : parle à un adulte ou au staff si la douleur persiste.';
  return{score,status,recommendation,averageSleep:trend,missing:known<3};
}

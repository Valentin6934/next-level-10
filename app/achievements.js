export const ACHIEVEMENTS=[
  {id:'first-checkin',name:'Premier signal',icon:'📡',test:s=>Object.keys(s.checkins||{}).length>=1},
  {id:'three-sessions',name:'Régularité',icon:'🔥',test:s=>Object.keys(s.done||{}).filter(k=>s.done[k]).length>=3},
  {id:'nutrition-day',name:'Carburant complet',icon:'🥗',test:s=>Object.values(s.nutrition||{}).some(d=>Object.values(d.meals||{}).filter(m=>m.validated).length>=3)},
  {id:'xp-100',name:'Niveau supérieur',icon:'⚡',test:s=>(s.xp||0)>=100}
];
export function evaluateAchievements(state){
  const unlocked=new Set(state.achievements||[]),newly=[];
  ACHIEVEMENTS.forEach(a=>{if(a.test(state)&&!unlocked.has(a.id)){unlocked.add(a.id);newly.push(a)}});
  state.achievements=[...unlocked];
  return{state,newly,unlocked:ACHIEVEMENTS.filter(a=>unlocked.has(a.id))};
}

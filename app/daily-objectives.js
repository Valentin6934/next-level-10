import {planFor,normalizedDate} from './data.js';
import {analyzeRecovery} from './recovery-intelligence.js';

export function buildDailyObjectives(state,date=normalizedDate()){
  const recovery=analyzeRecovery(state,date),plan=planFor(date),done=state.dailyObjectives?.[date]||{};
  const objectives=[
    {id:'checkin',label:'Compléter le check-in',xp:10,complete:!!state.checkins?.[date]},
    {id:'session',label:plan.kind==='Repos'?'Faire 10 min de mobilité':`Terminer : ${plan.title||plan.kind}`,xp:30,complete:!!state.done?.[date]},
    {id:'nutrition',label:'Valider au moins 3 repas',xp:15,complete:Object.values(state.nutrition?.[date]?.meals||{}).filter(x=>x.validated).length>=3}
  ];
  if(recovery.status==='STOP')objectives[1]={id:'recovery',label:'Protéger la zone douloureuse et prévenir le staff',xp:20,complete:!!done.recovery};
  return objectives.map(item=>({...item,complete:item.complete||!!done[item.id]}));
}

export function toggleDailyObjective(state,date,id){
  state.dailyObjectives=state.dailyObjectives||{};
  state.dailyObjectives[date]={...(state.dailyObjectives[date]||{}),[id]:!state.dailyObjectives[date]?.[id]};
  return state;
}

export function nutritionTarget(state,date=new Date().toISOString().slice(0,10)){
  const player=state.player||{},checkin=state.checkins?.[date]||{},weight=Number(player.weightKg)||50;
  const minutes=Number(checkin.minutes)||60,rpe=Number(checkin.rpe)||5,temp=Number(state.weather?.temp)||22;
  const water=Math.max(1.5,Math.round((weight*0.035+minutes*0.008+(temp>=28?0.5:0))*10)/10);
  const protein=Math.round(weight*1.6);
  const carbs=Math.round(weight*(rpe>=7?6:rpe>=4?5:4));
  return{water,protein,carbs,message:`Objectif du jour : ${water} L d’eau, environ ${protein} g de protéines et ${carbs} g de glucides.`};
}

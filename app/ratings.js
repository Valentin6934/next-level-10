export const RATING_NAMES=[
['technique','Technique'],['vision','Vision du jeu'],['control','Contrôle orienté'],['weakFoot','Pied faible'],['explosiveness','Explosivité'],['endurance','Endurance'],['mental','Mental'],['discipline','Discipline'],['recovery','Récupération']
];
const clamp=x=>Math.max(35,Math.min(99,Math.round(x)));
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
export function calculateRatings(state){
 const checks=Object.values(state.checkins||{}),reviews=Object.values(state.reviews||{}),tests=state.tests||[],done=Object.values(state.done||{}).filter(Boolean).length;
 const nutritionDays=Object.values(state.nutrition||{}),mealCount=nutritionDays.reduce((n,d)=>n+Object.values(d.meals||{}).filter(x=>x.validated).length,0);
 const sleep=avg(checks.map(x=>+x.sleep).filter(Boolean)),mot=avg(checks.map(x=>+x.motivation).filter(Boolean)),fat=avg(checks.map(x=>+x.fatigue).filter(Boolean));
 const techReview=avg(reviews.map(x=>+x.tech).filter(Boolean)),focus=avg(reviews.map(x=>+x.focus).filter(Boolean));
 const passTests=tests.filter(x=>x.name==='Précision de passe /20').map(x=>+x.value);
 const weakTests=tests.filter(x=>x.name==='Jongles pied gauche').map(x=>+x.value);
 const sprintTests=tests.filter(x=>x.name==='Sprint 10 m').map(x=>+x.value);
 const domtac=tests.filter(x=>x.name==='Ressenti course Domtac /10').map(x=>+x.value);
 const disciplineEvidence=Math.min(18,done*.8+Object.keys(state.reviews||{}).length*.5+Object.keys(state.checkins||{}).length*.4);
 const base=50;
 const ratings={
  technique:clamp(base+done*.35+(techReview?techReview*1.6:0)+(passTests.length?Math.max(...passTests)*.7:0)),
  vision:clamp(base+done*.25+(focus?focus*1.7:0)+Object.keys(state.reviews||{}).length*.3),
  control:clamp(base+done*.3+(techReview?techReview*1.4:0)+(passTests.length?Math.max(...passTests)*.6:0)),
  weakFoot:clamp(base+done*.18+(weakTests.length?Math.min(20,Math.log10(Math.max(...weakTests)+1)*10):0)),
  explosiveness:clamp(base+done*.12+(sprintTests.length?Math.max(0,25-Math.min(...sprintTests)*8):0)),
  endurance:clamp(base+done*.28+(domtac.length?Math.max(...domtac)*1.5:0)),
  mental:clamp(base+(mot?mot*1.5:0)+(focus?focus*1.2:0)+Object.keys(state.reviews||{}).length*.35),
  discipline:clamp(base+disciplineEvidence),
  recovery:clamp(base+(sleep?Math.min(16,(sleep-6)*8):0)+Math.min(12,mealCount*.35)-Math.max(0,(fat-6)*2))
 };
 const overall=clamp(Object.values(ratings).reduce((a,b)=>a+b,0)/Object.keys(ratings).length);
 const evidence=done+checks.length+reviews.length+tests.length+Math.floor(mealCount/4);
 const confidence=evidence<10?'Faible':evidence<30?'Moyenne':'Bonne';
 return{ratings,overall,confidence,evidence};
}
export function ratingReason(key,state){
 const map={
  technique:'Séances techniques, auto-évaluation et précision de passe.',
  vision:'Concentration, débriefs et régularité des séances.',
  control:'Qualité technique, précision et séances réalisées.',
  weakFoot:'Jongles pied gauche et travail régulier.',
  explosiveness:'Tests 10 m et séances vitesse réalisées.',
  endurance:'Courses Domtac et ressenti d’endurance.',
  mental:'Motivation, concentration et débriefs.',
  discipline:'Régularité du suivi et des séances.',
  recovery:'Sommeil, fatigue et repas validés.'
 };return map[key];
}
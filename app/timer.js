function seg(label,seconds,type='work'){return{label,seconds,type}}
export function buildTimerPlan(block){
 const t=block.title.toLowerCase();
 if(t.includes('mise en route articulaire'))return[seg('Marche sur place',60),seg('Chevilles',60),seg('Genoux',60),seg('Hanches',120),seg('Petits appuis 1',20),seg('Récupération',20,'rest'),seg('Petits appuis 2',20),seg('Récupération',20,'rest'),seg('Petits appuis 3',20),seg('Transition',100,'rest')];
 if(t.includes('maîtrise de balle'))return[seg('Conduite libre',120),seg('Semelles 1',45),seg('Repos',30,'rest'),seg('Semelles 2',45),seg('Repos',30,'rest'),seg('Intérieur-intérieur',180),seg('Extérieur-intérieur',180),seg('Conduite avec scans',300)];
 if(t.includes('échauffement'))return[seg('Trottinement',180),seg('Gammes',240),seg('Accélération 60 %',20),seg('Marche retour',40,'rest'),seg('Accélération 70 %',20),seg('Marche retour',40,'rest'),seg('Accélération 80 %',20),seg('Transition',160,'rest')];
 if(t.includes('départs'))return Array.from({length:6},(_,i)=>[seg(`Sprint ${i+1}`,10),seg('Récupération',i===2?180:80,'rest')]).flat();
 if(t.includes('scan')||t.includes('contrôle orienté'))return Array.from({length:6},(_,i)=>[seg(`Série ${i+1}`,90),seg('Récupération',60,'rest')]).flat();
 if(t.includes('prévention'))return[seg('Exercice 1',60),seg('Transition',20,'rest'),seg('Exercice 2',60),seg('Transition',20,'rest'),seg('Exercice 3',60),seg('Transition',20,'rest'),seg('Exercice 4',60),seg('Repos entre tours',60,'rest')];
 if(t.includes('sprint 10 m'))return[seg('Essai de familiarisation',10),seg('Récupération',180,'rest'),seg('Essai chronométré 1',10),seg('Récupération complète',180,'rest'),seg('Essai chronométré 2',10)];
 if(t.includes('précision de passe'))return[seg('10 passes pied droit',180),seg('Récupération',60,'rest'),seg('10 passes pied gauche',180)];
 if(t.includes('slalom chronométré'))return[seg('Essai de familiarisation',30),seg('Récupération',120,'rest'),seg('Essai chronométré 1',30),seg('Récupération',120,'rest'),seg('Essai chronométré 2',30)];
 if(t.includes('jongles et bilan'))return[seg('Jongles pied droit',90),seg('Repos',60,'rest'),seg('Jongles pied gauche',90),seg('Saisie des résultats',180)];
 if(t.includes('course domtac'))return[seg('Course — suis le programme Domtac',block.min*60)];
 if(t.includes('retour au calme')||t.includes('récupération'))return[seg('Marche lente',180),seg('Respiration',120),seg('Mobilité douce',Math.max(60,block.min*60-300))];
 const count=Math.max(1,block.actions.length),total=block.min*60,each=Math.floor(total/count);
 return block.actions.map((a,i)=>seg(a.slice(0,45),i===count-1?total-each*(count-1):each));
}
export function normalizePlan(plan){return plan.map(x=>({...x,seconds:Math.max(5,Math.round(+x.seconds||0))}))}
export const START='2026-07-23',END='2026-09-06';
export const TEST_DAYS={
'2026-07-25':{phase:'Début',label:'Tests de début de préparation'},
'2026-08-09':{phase:'Milieu',label:'Tests de milieu de préparation'},
'2026-08-30':{phase:'Fin',label:'Tests de fin de préparation'}
};

export const club={'2026-07-24':'2 × 25 min à 12 km/h + circuit bas du corps','2026-07-27':'35 min à 13 km/h + circuit training','2026-07-29':'2 × 25 min à 13 km/h + circuit haut du corps','2026-07-30':'2 × 25 min à 13 km/h + circuit bas du corps','2026-08-01':'60 min à 12 km/h','2026-08-03':'40 min à 13,5 km/h + circuit training','2026-08-05':'2 × 25 min à 13,5 km/h + circuit haut du corps','2026-08-06':'2 × 30 min à 13,5 km/h + circuit bas du corps','2026-08-08':'2 × 30 min à 13,5 km/h + circuit training','2026-08-10':'Entraînement collectif 18 h–20 h','2026-08-11':'Entraînement collectif 18 h–20 h','2026-08-13':'Entraînement collectif 18 h–20 h','2026-08-14':'Entraînement collectif 18 h–20 h','2026-08-15':'Match amical sur convocation','2026-08-17':'Entraînement collectif 18 h–20 h','2026-08-18':'Entraînement collectif 18 h–20 h','2026-08-19':'Séance ou match','2026-08-20':'Entraînement collectif 18 h–20 h','2026-08-21':'Entraînement collectif 18 h–20 h','2026-08-22':'Match amical sur convocation','2026-08-24':'Entraînement collectif 18 h–20 h','2026-08-25':'Entraînement collectif 18 h–20 h','2026-08-26':'Séance ou match','2026-08-27':'Entraînement collectif 18 h–20 h','2026-08-28':'Match amical sur convocation','2026-08-31':'Entraînement collectif 19 h 15–20 h 45','2026-09-02':'Match amical sur convocation','2026-09-04':'Entraînement collectif 19 h 30–21 h','2026-09-05':'Reprise du championnat'};
export const menus=[
{breakfast:'Flocons d’avoine, lait ou yaourt, banane, pain complet et œufs.',lunch:'Riz, poulet ou œufs, légumes et fruit.',snack:'Yaourt, banane et tartine avec miel.',dinner:'Pommes de terre, poisson ou omelette, légumes et fruit.'},
{breakfast:'Pain complet, yaourt, fruit et œufs.',lunch:'Pâtes, viande maigre ou lentilles, légumes et fruit.',snack:'Compote, laitage et pain.',dinner:'Semoule, poulet ou pois chiches, légumes et yaourt.'},
{breakfast:'Muesli peu sucré, lait, fruit et tartine.',lunch:'Pommes de terre, poisson, légumes et fruit.',snack:'Banane, lait ou yaourt et pain.',dinner:'Riz, omelette, légumes et fruit.'},
{breakfast:'Porridge banane, yaourt et tartine.',lunch:'Pâtes, poulet, légumes et fruit.',snack:'Fromage blanc, céréales simples et fruit.',dinner:'Semoule, poisson ou œufs, légumes et yaourt.'},
{breakfast:'Pain, œufs brouillés, yaourt et fruit.',lunch:'Riz, thon ou poulet, légumes et fruit.',snack:'Compote, tartine avec miel et laitage.',dinner:'Pâtes, viande maigre ou lentilles, légumes.'},
{breakfast:'Flocons d’avoine, lait, banane et tartine.',lunch:'Semoule, poulet, légumes et yaourt.',snack:'Fruit, fromage blanc et pain.',dinner:'Pommes de terre, omelette, légumes et fruit.'},
{breakfast:'Pain complet, yaourt, fruit et omelette.',lunch:'Pâtes, poisson, légumes et fruit.',snack:'Banane et laitage.',dinner:'Riz, poulet ou tofu, légumes et compote.'}
];
const E=(title,min,setup,actions,reps,rest,position,key,diagram)=>({title,min,setup,actions,reps,rest,position,key,diagram});
export function normalizedDate(){const d=new Date(),s=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return s<START?START:s>END?END:s}
export function planFor(s){const d=new Date(s+'T12:00:00'),dow=d.getDay(),collective=s>='2026-08-10';

if(TEST_DAYS[s])return{kind:'Tests',title:TEST_DAYS[s].label,mins:65,testPhase:TEST_DAYS[s].phase,blocks:[
E('Échauffement standardisé',15,'Terrain plat, 4 cônes, eau et téléphone.',[
'Trottine 4 minutes très tranquillement.',
'Réalise 2 × 20 m de montées de genoux légères.',
'Réalise 2 × 20 m de pas chassés de chaque côté.',
'Fais 3 accélérations progressives sur 20 m à 60 %, 70 % et 80 %.',
'Marche 2 minutes avant le premier test.'
],'1 passage','Marche retour','Buste relâché et appuis sous le corps.','Toujours utiliser le même échauffement aux trois dates.','run'),
E('Sprint 10 m',12,'Deux cônes précisément espacés de 10 m. Téléphone posé de côté ou une personne pour chronométrer.',[
'Place-toi toujours dans la même position de départ.',
'Effectue un premier essai à environ 90 % pour te familiariser.',
'Réalise ensuite 2 essais rapides.',
'Récupère complètement entre les essais.',
'Garde le meilleur temps et note aussi le type de terrain.'
],'2 essais chronométrés','3 min entre les essais','Corps légèrement incliné et poussée forte sur les premiers appuis.','Même protocole à chaque phase.','sprint'),
E('Précision de passe',12,'Une porte de 1 m de largeur à 6 m et 20 ballons/passes au total.',[
'Effectue 10 passes pied droit puis 10 passes pied gauche.',
'Le ballon doit traverser complètement la porte.',
'Compte une réussite uniquement si la passe reste au sol et traverse la porte.',
'Note le score droit, gauche et total sur 20.',
'Ne change pas la distance entre les trois phases.'
],'20 passes','60 s entre les deux pieds','Pied d’appui dirigé vers la cible.','Précision avant puissance.','pass'),
E('Slalom chronométré',12,'6 cônes espacés de 1,5 m sur une ligne.',[
'Démarre ballon arrêté à 2 m du premier cône.',
'Slalome entre les 6 cônes puis accélère sur 5 m.',
'Réalise un essai de familiarisation.',
'Réalise ensuite 2 essais chronométrés.',
'Garde le meilleur temps sans renverser de cône.'
],'2 essais chronométrés','2 min entre les essais','Bassin bas et ballon proche dans le slalom.','Même pied de départ et même parcours à chaque phase.','square'),
E('Jongles et bilan',8,'Ballon et espace calme.',[
'Fais un essai pied droit uniquement et note ton record.',
'Fais un essai pied gauche uniquement et note ton record.',
'Note ton ressenti course Domtac sur 10.',
'Enregistre tous les résultats dans l’onglet Progression.',
'Termine par 3 minutes de marche.'
],'1 essai par pied','1 min','Reste relâché et ne recommence pas dix fois.','Les tests servent à mesurer, pas à te fatiguer.','recovery'),
E('Retour au calme',6,'Aucun matériel.',[
'Marche lentement 3 minutes.',
'Bois progressivement.',
'Note toute douleur ou gêne.',
'Pas de séance intense supplémentaire ce jour-là.'
],'1 passage','—','Épaules relâchées.','Préserver la qualité des mesures.','recovery')
]};

if(s==='2026-07-23')return{kind:'Récupération',title:'Retour de vacances — remise en route',mins:55,blocks:[
E('Mise en route articulaire',8,'Espace de 3 × 3 m.',[
'Marche sur place 60 secondes en balançant les bras.','10 cercles de cheville dans chaque sens et sur chaque pied.','10 flexions/extensions légères de genou.','8 ouvertures puis 8 fermetures de hanche par côté.','3 × 20 secondes de petits pas rapides avec 20 secondes de marche.'],'1 passage','Aucune','Buste droit et genoux souples.','Finir chaud sans être essoufflé.','warmup'),
E('Maîtrise de balle',22,'Carré de 4 × 4 m avec 4 cônes.',[
'2 minutes de conduite libre avec les deux pieds.','4 × 45 secondes de semelles alternées.','4 × 45 secondes intérieur-intérieur.','4 × 45 secondes extérieur-intérieur.','5 minutes de conduite avec un scan avant chaque changement.'],'Blocs indiqués','30 secondes','Ballon proche et regard relevé.','Qualité avant vitesse.','square'),
E('Prévention genou',18,'Mur et sol plat.',[
'Chaise 25 secondes.','Pont fessier 12 répétitions.','Mollets 15 répétitions.','Équilibre une jambe 30 secondes par côté.','Faire un second tour seulement sans douleur.'],'1 à 2 tours','60 secondes','Genou aligné avec le pied.','Zéro douleur vive.','strength'),
E('Retour au calme',7,'Aucun matériel.',[
'Marche lente 3 minutes.','Respire 4 secondes puis expire 6 secondes pendant 2 minutes.','Mobilité douce 2 minutes.','Bois progressivement.'],'1 passage','—','Épaules relâchées.','Terminer calme.','recovery')]};
if(club[s])return{kind:'Domtac',title:club[s].includes('Match')?'Match / convocation':'Programme Domtac',mins:75,blocks:[
E('Échauffement',12,'Ligne de 20 m.',[
'Trottine 3 minutes.','2 × 20 m montées de genoux légères.','2 × 20 m talons-fesses légers.','2 × 20 m pas chassés.','3 accélérations progressives à 60 %, 70 %, 80 %.'],'1 passage','Marche retour','Buste relâché.','Être chaud sans fatigue.','run'),
E('Course Domtac',45,club[s],[ 'Lance le chrono après l’échauffement.','Respecte exactement l’allure demandée.','Sur deux blocs, marche ou trottine pendant la récupération.','Contrôle l’allure toutes les 5 minutes.','Arrête en cas de douleur vive ou vertige.'],'Selon Domtac','Selon Domtac','Foulée relâchée.','Ne pas dépasser l’objectif.','run'),
E('Complément ballon',12,'3 cônes et 1 ballon.',[
'Conduis vers le cône central.','Scanne derrière l’épaule avant d’arriver.','Sors du côté opposé avec le pied faible.','Reviens et inverse.','6 × 60 secondes.'],'6 × 60 s','45 s','Corps de profil.','Le regard précède le contrôle.','scan'),
E('Récupération',6,'Eau et repas.',[
'Marche 3 minutes.','Bois par petites prises.','Prends une collation ou un repas complet.','Note ton RPE et ton genou.'],'1 passage','—','Reste relâché.','Faire redescendre progressivement.','recovery')]};
if(collective)return{kind:'Entretien',title:'Entretien léger',mins:38,blocks:[
E('Mobilité',8,'Espace calme.',[
'10 cercles de cheville par sens.','8 ouvertures de hanche par côté.','8 rotations thoraciques par côté.','2 × 20 secondes de petits appuis.'],'1 passage','—','Amplitude confortable.','Se sentir plus mobile.','warmup'),
E('Contrôle orienté pied gauche',18,'Deux portes de cônes.',[
'Place-toi à 2 m de la porte.','Simule une passe en poussant le ballon.','Scanne derrière l’épaule droite.','Contrôle du pied gauche à travers la porte.','Conduis 3 touches puis passe dans la seconde porte.'],'5 × 6 répétitions','60 s','Corps ouvert.','Premier contact vers l’espace libre.','scan'),
E('Prévention',12,'Sol plat.',[
'Split squat 2 × 8 par jambe.','Pont fessier 2 × 12.','Mollets 2 × 15.','Équilibre 2 × 25 secondes.'],'2 séries','45 s','Genou aligné.','Rester loin de l’échec.','strength')]};
if(dow===2)return{kind:'Explosivité',title:'Accélération + technique n°10',mins:82,blocks:[
E('Échauffement vitesse',15,'Ligne de 20 m.',[
'Trottine 3 minutes.','2 × 20 m marche dynamique.','2 × 20 m montées de genoux.','2 × 20 m pas chassés.','3 accélérations à 60 %, 70 %, 80 %.'],'1 passage','Marche retour','Buste légèrement incliné au départ.','Se sentir rapide avant le bloc.','run'),
E('Départs 10 m',18,'Deux cônes à 10 m.',[
'Un pied légèrement devant.','Penche le corps légèrement en avant.','Pousse fort sur les 3 premiers appuis.','Cours au cône puis ralentis progressivement.','Réalise 2 séries de 3 sprints.'],'2 × 3','75–90 s','Bras actifs et tête neutre.','Chaque sprint doit rester propre.','sprint'),
E('Scan, contrôle et passe',25,'Deux portes de cônes.',[
'Place la première porte à 2 m.','Scanne derrière l’épaule.','Contrôle à travers la première porte.','Fais au maximum deux touches.','Passe dans la deuxième porte.'],'6 × 90 s','60 s','Corps ouvert à 45°.','Décider avant le contact.','scan')]};
if(dow===4)return{kind:'Technique',title:'Technique intensive petit espace',mins:76,blocks:[
E('Mise en route ballon',10,'Carré de 4 × 4 m.',[
'2 minutes conduite libre.','2 minutes intérieur/extérieur droit.','2 minutes intérieur/extérieur gauche.','2 minutes semelles.','2 minutes avec scan toutes les deux touches.'],'5 × 2 min','15 s','Ballon proche.','Qualité du contact.','square'),
E('Contrôle orienté',20,'Deux portes et un ballon.',[
'Place-toi de profil.','Pousse le ballon légèrement.','Scanne derrière chaque épaule.','Contrôle du pied arrière à travers la porte.','Accélère sur 3 touches.'],'3 × 10 répétitions','75 s','Pied d’appui orienté vers la sortie.','Gagner du terrain au premier contact.','control'),
E('Pied gauche cible',16,'Porte de 80 cm à 4–6 m.',[
'Pied d’appui à côté du ballon.','Verrouille la cheville gauche.','Frappe avec l’intérieur.','Compte 20 passes.','Fais 3 séries.'],'3 × 20','60 s','Buste au-dessus du ballon.','Précision avant puissance.','pass')]};
if(dow===0)return{kind:'Repos',title:'Repos complet',mins:20,blocks:[E('Récupération',20,'Aucun matériel.',[
'Marche 10 minutes seulement si agréable.','Mobilité douce 5 minutes.','Complète ton suivi.','Prépare la semaine.'],'1 passage','—','Aucune intensité.','Te sentir mieux à la fin.','recovery')]};
return{kind:'Technique',title:'Technique + prévention',mins:62,blocks:[
E('Ballon petit espace',30,'Carré 4 × 4 m.',[
'5 minutes conduite deux pieds.','5 minutes semelles.','5 minutes pied gauche.','5 minutes contrôles orientés.','5 minutes jongles.','5 minutes avec scan.'],'6 × 5 min','30 s','Ballon proche.','Rester propre.','square'),
E('Prévention',20,'Sol plat.',[
'Split squat 3 × 8.','Pont fessier 3 × 12.','Mollets 3 × 15.','Gainage latéral 3 × 25 s.','Équilibre 2 × 30 s.'],'Séries indiquées','45–60 s','Mouvement lent.','Deux répétitions en réserve.','strength')]}
}
export function menuFor(s){return menus[new Date(s+'T12:00:00').getDay()]}

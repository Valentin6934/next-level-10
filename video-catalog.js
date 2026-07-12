export const VIDEO_CATALOG=[
 {
  id:'scan_10',
  themes:['vision','scan','technique'],
  title:'Prise d’information avant réception',
  player:'Milieu offensif — observation libre',
  url:'https://www.youtube.com/results?search_query=midfielder+scanning+before+receiving+football',
  duration:15,
  instruction:'Observe uniquement ce qui se passe avant la réception : scans, orientation du corps et dernier regard.',
  questions:[
   'Combien de scans sont faits avant de recevoir ?',
   'Le dernier scan arrive-t-il juste avant la passe du partenaire ?',
   'Le contrôle part-il vers l’espace libre ?',
   'Le joueur peut-il jouer en une ou deux touches ?'
  ],
  nextMission:'Scanner deux fois avant chaque contrôle orienté.'
 },
 {
  id:'control_10',
  themes:['control','technique','ball'],
  title:'Orientation du corps et premier contrôle',
  player:'Milieu offensif — premier contrôle',
  url:'https://www.youtube.com/results?search_query=football+first+touch+midfielder+body+orientation',
  duration:15,
  instruction:'Observe l’angle du bassin, le pied utilisé et la direction du premier contrôle.',
  questions:[
   'Le corps est-il ouvert avant la réception ?',
   'Quel pied contrôle le ballon ?',
   'Le premier contact gagne-t-il du terrain ?',
   'Combien de touches avant la passe suivante ?'
  ],
  nextMission:'Ouvrir le corps avant chaque réception et jouer vers l’avant.'
 },
 {
  id:'speed_10',
  themes:['speed','explosiveness','sprint'],
  title:'Changement de rythme et premiers appuis',
  player:'Milieu offensif — accélération',
  url:'https://www.youtube.com/results?search_query=football+attacking+midfielder+acceleration+change+of+pace',
  duration:12,
  instruction:'Observe le moment exact où le joueur déclenche son accélération.',
  questions:[
   'Quel geste déclenche le changement de rythme ?',
   'Combien d’appuis sont vraiment explosifs ?',
   'Le joueur accélère-t-il avec ou sans ballon ?',
   'Comment utilise-t-il ses bras ?'
  ],
  nextMission:'Après un geste réussi, accélérer franchement sur trois appuis.'
 },
 {
  id:'movement_10',
  themes:['endurance','domtac','run','recovery'],
  title:'Déplacements et disponibilité',
  player:'Milieu offensif — jeu sans ballon',
  url:'https://www.youtube.com/results?search_query=attacking+midfielder+off+the+ball+movement+analysis',
  duration:15,
  instruction:'Suis le joueur même quand il ne touche pas le ballon.',
  questions:[
   'Comment se rend-il disponible entre les lignes ?',
   'Quand ralentit-il ou accélère-t-il ?',
   'Se déplace-t-il après avoir passé ?',
   'Comment économise-t-il ses courses ?'
  ],
  nextMission:'Bouger après chaque passe pour recréer une ligne de soutien.'
 },
 {
  id:'test_10',
  themes:['test'],
  title:'Comparer le geste et le protocole',
  player:'Auto-analyse des tests',
  url:'https://www.youtube.com/results?search_query=football+10m+sprint+test+technique+slalom+passing+accuracy',
  duration:10,
  instruction:'Observe la régularité du protocole et les détails techniques du geste.',
  questions:[
   'La position de départ est-elle identique ?',
   'Le chronométrage commence-t-il toujours au même moment ?',
   'Le parcours est-il strictement identique ?',
   'Quel détail technique peut améliorer la qualité sans fausser le test ?'
  ],
  nextMission:'Répéter exactement le même protocole au prochain test.'
 }
];

export function videoForPlan(plan){
 const text=`${plan.kind||''} ${plan.title||''} ${(plan.blocks||[]).map(b=>b.title).join(' ')}`.toLowerCase();
 let theme='technique';
 if(/test/.test(text))theme='test';
 else if(/explos|vitesse|sprint|accél/.test(text))theme='speed';
 else if(/scan|vision/.test(text))theme='vision';
 else if(/domtac|course|endurance|récup|repos/.test(text))theme='endurance';
 else if(/contrôle|technique|ballon/.test(text))theme='control';
 return VIDEO_CATALOG.find(v=>v.themes.includes(theme))||VIDEO_CATALOG[0];
}

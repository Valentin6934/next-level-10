const KEY='nextLevel10_2_0';
const SCHEMA_VERSION=3;

const defaultPlayer={
  firstName:'Valentin',
  lastName:'',
  birthYear:2010,
  age:16,
  club:'FC Domtac',
  category:'U17',
  position:'MOC / N°10',
  strongFoot:'Droit',
  heightCm:168,
  weightKg:50,
  currentLevel:'District',
  objective:'U18 R1',
  target:'Centre de formation',
  onboardingComplete:false
};

const defaults={
  schemaVersion:SCHEMA_VERSION,
  player:defaultPlayer,
  checkins:{},reviews:{},done:{},sessionRuns:{},nutrition:{},tests:[],pain:{},
  equipment:{},timerPreferences:{},xp:0,weather:{temp:24,humidity:50},
  notifications:{training:true,meals:true,sleep:true,lead:20,sent:{}},
  app:{installedAt:null,lastVersion:'1.6.0',dismissedUpdates:[]},
  dailyObjectives:{},achievements:[],sprintTwo:{shopping:{},lastRecoverySave:null}
};

const clone=value=>{
  if(typeof structuredClone==='function')return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

function migrate(raw){
  const s=raw&&typeof raw==='object'?raw:{};
  const migrated={
    ...clone(defaults),
    ...s,
    schemaVersion:SCHEMA_VERSION,
    player:{...clone(defaultPlayer),...(s.player||{})},
    app:{...clone(defaults.app),...(s.app||{}),lastVersion:'1.6.0'},
    checkins:s.checkins||{},
    reviews:s.reviews||{},
    done:s.done||{},
    sessionRuns:s.sessionRuns||{},
    nutrition:s.nutrition||{},
    tests:Array.isArray(s.tests)?s.tests:[],
    pain:s.pain||{},
    equipment:s.equipment||{},
    timerPreferences:s.timerPreferences||{},
    notifications:{...clone(defaults.notifications),...(s.notifications||{})},
    dailyObjectives:s.dailyObjectives||{},
    achievements:Array.isArray(s.achievements)?s.achievements:[],
    sprintTwo:{...clone(defaults.sprintTwo),...(s.sprintTwo||{})}
  };
  if(!migrated.app.installedAt)migrated.app.installedAt=new Date().toISOString();
  return migrated;
}

export function loadState(){
  try{
    const raw=localStorage.getItem(KEY);
    const state=migrate(raw?JSON.parse(raw):null);
    if(!raw||state.schemaVersion!==JSON.parse(raw||'{}').schemaVersion)saveState(state);
    return state;
  }catch(error){
    console.error('Lecture des données impossible:',error);
    return migrate(null);
  }
}

export function saveState(state){
  const safe=migrate(state);
  localStorage.setItem(KEY,JSON.stringify(safe));
}

export function clearState(){localStorage.removeItem(KEY)}

export function exportState(){
  const payload={
    product:'Next Level 10',
    version:'1.6.0',
    exportedAt:new Date().toISOString(),
    state:loadState()
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download=`next_level_10_v1_6_${new Date().toISOString().slice(0,10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function importState(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const parsed=JSON.parse(reader.result);
        const state=parsed?.state||parsed;
        saveState(state);
        resolve(loadState());
      }catch(error){reject(error)}
    };
    reader.onerror=reject;
    reader.readAsText(file);
  });
}

export function getDefaultState(){return clone(defaults)}
export function getSchemaVersion(){return SCHEMA_VERSION}

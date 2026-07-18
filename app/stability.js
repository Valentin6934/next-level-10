const SESSION_KEY='nl10_stability_session';
const MAX_LOGS=20;

function safeText(value){
  return String(value??'Erreur inconnue').replace(/[<>]/g,'').slice(0,240);
}

function readLogs(){
  try{return JSON.parse(localStorage.getItem('nl10_error_log')||'[]')}catch{return[]}
}

function record(kind,message,source='application'){
  try{
    const logs=readLogs();
    logs.unshift({kind,message:safeText(message),source:safeText(source),at:new Date().toISOString()});
    localStorage.setItem('nl10_error_log',JSON.stringify(logs.slice(0,MAX_LOGS)));
  }catch{}
}

function showRecoveryNotice(message){
  const root=document.getElementById('fatalError');
  if(!root)return;
  root.classList.remove('hidden');
  root.innerHTML=`<h2>Un module a rencontré un problème</h2><p>${safeText(message)}</p><div class="actions"><button id="nl10SafeReload" class="primary">RECHARGER</button><button id="nl10DismissError" class="secondary">CONTINUER</button></div>`;
  document.getElementById('nl10SafeReload')?.addEventListener('click',()=>location.reload());
  document.getElementById('nl10DismissError')?.addEventListener('click',()=>root.classList.add('hidden'));
}

function storageHealth(){
  try{
    const probe='__nl10_probe__';
    localStorage.setItem(probe,'1');
    localStorage.removeItem(probe);
    return true;
  }catch{return false}
}

export function runStartupChecks(){
  const checks={
    storage:storageHealth(),
    modules:typeof Promise!=='undefined'&&typeof fetch==='function',
    serviceWorker:'serviceWorker' in navigator,
    online:navigator.onLine
  };
  document.documentElement.dataset.nl10Ready=checks.storage&&checks.modules?'true':'degraded';
  try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({...checks,at:new Date().toISOString()}))}catch{}
  if(!checks.storage)showRecoveryNotice('Le stockage local est indisponible. Vérifie le mode privé ou l’espace disponible.');
  return checks;
}

export function installStabilityGuard(){
  window.addEventListener('error',event=>{
    record('error',event.message,event.filename||'window');
    showRecoveryNotice(event.message);
  });
  window.addEventListener('unhandledrejection',event=>{
    const message=event.reason?.message||event.reason||'Promesse rejetée';
    record('promise',message,'async');
    showRecoveryNotice(message);
  });
  window.addEventListener('storage',event=>{
    if(event.key&&event.key.startsWith('nextLevel10'))window.dispatchEvent(new CustomEvent('nl10:external-state-change'));
  });
}

export function getStabilityReport(){
  let startup=null;
  try{startup=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{}
  return{startup,errors:readLogs()};
}

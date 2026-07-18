const UPDATE_EVENT='nl10:pwa-update';
let deferredInstall=null;

function announce(message,type='info'){
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT,{detail:{message,type}}));
}

export function installPwaUX(){
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredInstall=event;
    document.documentElement.dataset.pwaInstallable='true';
    announce('Next Level 10 peut être installé sur cet appareil.','install');
  });
  window.addEventListener('appinstalled',()=>{
    deferredInstall=null;
    delete document.documentElement.dataset.pwaInstallable;
    announce('Application installée.','success');
  });
  window.addEventListener('online',()=>announce('Connexion rétablie.','success'));
  window.addEventListener('offline',()=>announce('Mode hors-ligne actif.','offline'));
}

export async function requestPwaInstall(){
  if(!deferredInstall)return false;
  deferredInstall.prompt();
  const result=await deferredInstall.userChoice;
  deferredInstall=null;
  return result.outcome==='accepted';
}

export async function registerServiceWorker(){
  if(!('serviceWorker' in navigator))return null;
  const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
  registration.addEventListener('updatefound',()=>{
    const worker=registration.installing;
    if(!worker)return;
    worker.addEventListener('statechange',()=>{
      if(worker.state==='installed'&&navigator.serviceWorker.controller){
        announce('Une mise à jour est prête. Recharge l’application.','update');
      }
    });
  });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(sessionStorage.getItem('nl10-sw-reloaded'))return;
    sessionStorage.setItem('nl10-sw-reloaded','1');
    location.reload();
  });
  return registration;
}

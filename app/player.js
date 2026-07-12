import {loadState,saveState} from './storage.js';

const $=id=>document.getElementById(id);
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function getPlayer(){
  return loadState().player||{};
}

export function displayName(player=getPlayer()){
  return player.firstName?.trim()||'Joueur';
}

export function applyPlayerIdentity(){
  const player=getPlayer(),name=displayName(player);
  document.querySelectorAll('[data-player-name]').forEach(node=>node.textContent=name);
  document.documentElement.style.setProperty('--player-initial',(name[0]||'J').toUpperCase());
}

function profileFields(player){
  return `
    <div class="fields player-fields">
      <label>Prénom<input data-player-field="firstName" value="${esc(player.firstName||'')}"></label>
      <label>Nom<input data-player-field="lastName" value="${esc(player.lastName||'')}"></label>
      <label>Âge<input data-player-field="age" type="number" min="8" max="45" value="${esc(player.age||'')}"></label>
      <label>Club<input data-player-field="club" value="${esc(player.club||'')}"></label>
      <label>Catégorie<input data-player-field="category" value="${esc(player.category||'')}"></label>
      <label>Poste<input data-player-field="position" value="${esc(player.position||'')}"></label>
      <label>Pied fort<select data-player-field="strongFoot">
        ${['Droit','Gauche','Deux pieds'].map(x=>`<option ${player.strongFoot===x?'selected':''}>${x}</option>`).join('')}
      </select></label>
      <label>Niveau actuel<input data-player-field="currentLevel" value="${esc(player.currentLevel||'')}"></label>
      <label>Objectif principal<input data-player-field="objective" value="${esc(player.objective||'')}"></label>
      <label>Rêve à long terme<input data-player-field="target" value="${esc(player.target||'')}"></label>
    </div>`;
}

function collect(root,base){
  const player={...base};
  root.querySelectorAll('[data-player-field]').forEach(input=>{
    const key=input.dataset.playerField;
    player[key]=input.type==='number'?(input.value?Number(input.value):null):input.value.trim();
  });
  return player;
}

export function renderPlayerSettings(root){
  if(!root)return;
  const player=getPlayer();
  root.innerHTML=`<article class="panel gap player-settings-card">
    <div class="actions between">
      <div><div class="eyebrow">IDENTITÉ JOUEUR</div><h2>${esc(displayName(player))}</h2></div>
      <span class="player-avatar">${esc((displayName(player)[0]||'J').toUpperCase())}</span>
    </div>
    ${profileFields(player)}
    <div class="actions">
      <button class="primary save-player-profile">ENREGISTRER LE PROFIL</button>
      <button class="secondary reopen-onboarding">REFAIRE L’ACCUEIL</button>
    </div>
  </article>`;
  root.querySelector('.save-player-profile').onclick=()=>{
    const state=loadState();
    state.player={...collect(root,state.player),onboardingComplete:true};
    saveState(state);
    applyPlayerIdentity();
    root.querySelector('.save-player-profile').textContent='PROFIL ENREGISTRÉ ✓';
    window.dispatchEvent(new CustomEvent('nl10:player-updated'));
  };
  root.querySelector('.reopen-onboarding').onclick=()=>{
    const state=loadState();
    state.player.onboardingComplete=false;
    saveState(state);
    renderOnboarding($('onboardingRoot'),true);
  };
}

export function renderOnboarding(root,force=false){
  if(!root)return;
  const state=loadState(),player=state.player||{};
  if(player.onboardingComplete&&!force){root.innerHTML='';return}
  let step=1;
  root.innerHTML=`<div class="onboarding-overlay">
    <section class="onboarding-card">
      <div class="onboarding-progress"><i style="width:33%"></i></div>
      <div class="onboarding-step" data-step="1">
        <div class="brand-mark onboarding-logo">10</div>
        <div class="eyebrow">NEXT LEVEL 10 • V1.0</div>
        <h1>Ton coach commence par te connaître.</h1>
        <p>Crée ton profil joueur. Tu pourras tout modifier plus tard.</p>
        <button class="primary onboarding-next">COMMENCER</button>
      </div>
      <div class="onboarding-step hidden" data-step="2">
        <div class="eyebrow">ÉTAPE 1/2</div>
        <h2>Qui es-tu ?</h2>
        ${profileFields(player)}
        <div class="actions">
          <button class="secondary onboarding-back">RETOUR</button>
          <button class="primary onboarding-next">CONTINUER</button>
        </div>
      </div>
      <div class="onboarding-step hidden" data-step="3">
        <div class="eyebrow">ÉTAPE 2/2</div>
        <h2>Règles de confiance</h2>
        <div class="trust-list">
          <p><b>✓ Données locales</b><span>Le profil reste dans ton navigateur.</span></p>
          <p><b>✓ Aucune donnée inventée</b><span>NOVA signale ce qui manque.</span></p>
          <p><b>✓ Sécurité d’abord</b><span>Une douleur importante passe avant la performance.</span></p>
        </div>
        <label class="check"><input class="onboarding-consent" type="checkbox">J’ai compris que l’application ne remplace pas un entraîneur ou un professionnel de santé.</label>
        <div class="actions">
          <button class="secondary onboarding-back">RETOUR</button>
          <button class="primary onboarding-finish" disabled>ENTRER DANS NEXT LEVEL</button>
        </div>
      </div>
    </section>
  </div>`;

  const show=n=>{
    step=n;
    root.querySelectorAll('.onboarding-step').forEach(x=>x.classList.toggle('hidden',Number(x.dataset.step)!==n));
    root.querySelector('.onboarding-progress i').style.width=`${n/3*100}%`;
  };
  root.querySelectorAll('.onboarding-next').forEach(button=>button.onclick=()=>{
    if(step===2){
      const current=collect(root,player);
      if(!current.firstName||!current.position||!current.objective){
        alert('Renseigne au minimum ton prénom, ton poste et ton objectif.');
        return;
      }
    }
    show(Math.min(3,step+1));
  });
  root.querySelectorAll('.onboarding-back').forEach(button=>button.onclick=()=>show(Math.max(1,step-1)));
  const consent=root.querySelector('.onboarding-consent');
  const finish=root.querySelector('.onboarding-finish');
  consent.onchange=()=>finish.disabled=!consent.checked;
  finish.onclick=()=>{
    const latest=loadState();
    latest.player={...collect(root,latest.player),onboardingComplete:true};
    saveState(latest);
    root.innerHTML='';
    applyPlayerIdentity();
    window.dispatchEvent(new CustomEvent('nl10:player-updated'));
  };
}

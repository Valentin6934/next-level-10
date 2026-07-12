import {loadState,saveState} from './storage.js';

const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
const canRecognize=!!SpeechRecognition;
const canSpeak='speechSynthesis' in window;

function getVoiceSettings(){
 const state=loadState();
 state.voiceSettings=state.voiceSettings||{
  enabled:true,
  autoSpeak:false,
  rate:1,
  pitch:1,
  volume:1,
  preferredVoice:''
 };
 return state.voiceSettings;
}

function saveVoiceSettings(settings){
 const state=loadState();
 state.voiceSettings={...getVoiceSettings(),...settings};
 saveState(state);
}

function chooseFrenchVoice(settings){
 const voices=speechSynthesis.getVoices();
 if(settings.preferredVoice){
  const exact=voices.find(v=>v.name===settings.preferredVoice);
  if(exact)return exact;
 }
 return voices.find(v=>/^fr[-_]/i.test(v.lang))||
        voices.find(v=>/French|Français/i.test(v.name))||
        voices[0]||null;
}

export function speakText(text,{force=false}={}){
 if(!canSpeak||!text)return false;
 const settings=getVoiceSettings();
 if(!settings.enabled&&!force)return false;
 speechSynthesis.cancel();
 const utterance=new SpeechSynthesisUtterance(text);
 utterance.lang='fr-FR';
 utterance.rate=Number(settings.rate||1);
 utterance.pitch=Number(settings.pitch||1);
 utterance.volume=Number(settings.volume||1);
 const voice=chooseFrenchVoice(settings);
 if(voice)utterance.voice=voice;
 speechSynthesis.speak(utterance);
 return true;
}

export function stopSpeaking(){
 if(canSpeak)speechSynthesis.cancel();
}

export function renderVoiceControls(root,{onTranscript,onSubmit,onSpeakLast,getLastNovaMessage}={}){
 try{
  const settings=getVoiceSettings();
  const voices=canSpeak?speechSynthesis.getVoices().filter(v=>/^fr[-_]/i.test(v.lang)||/French|Français/i.test(v.name)):[];
  root.innerHTML=`<section class="voice-panel">
   <div class="voice-panel-head">
    <div>
     <div class="eyebrow">MODE VOCAL — BÊTA</div>
     <h3>Parle à NOVA</h3>
     <p>${canRecognize?'Reconnaissance vocale disponible sur ce navigateur.':'La reconnaissance vocale n’est pas disponible ici.'}</p>
    </div>
    <span class="voice-capability ${canRecognize?'ok':'warn'}">${canRecognize?'MICRO PRÊT':'TEXTE UNIQUEMENT'}</span>
   </div>

   <div class="voice-main-controls">
    <button class="voice-mic ${canRecognize?'':'disabled'}" ${canRecognize?'':'disabled'} aria-label="Activer le micro">
     <span class="voice-mic-icon">🎙</span>
     <b>Maintenir pour parler</b>
     <small class="voice-status">Prêt</small>
    </button>
    <div class="voice-side-actions">
     <button class="secondary voice-read-last" ${canSpeak?'':'disabled'}>LIRE LA DERNIÈRE RÉPONSE</button>
     <button class="ghost-button voice-stop">ARRÊTER LA VOIX</button>
    </div>
   </div>

   <div class="voice-transcript hidden">
    <small>TRANSCRIPTION</small>
    <p></p>
    <button class="primary voice-send-transcript">ENVOYER À NOVA</button>
   </div>

   <details class="voice-settings">
    <summary>Réglages vocaux</summary>
    <div class="fields">
     <label class="check"><input class="voice-enabled" type="checkbox" ${settings.enabled?'checked':''}>Voix activée</label>
     <label class="check"><input class="voice-auto" type="checkbox" ${settings.autoSpeak?'checked':''}>Lire automatiquement les réponses</label>
     <label>Vitesse<input class="voice-rate" type="range" min=".7" max="1.4" step=".1" value="${settings.rate}"></label>
     <label>Hauteur<input class="voice-pitch" type="range" min=".7" max="1.3" step=".1" value="${settings.pitch}"></label>
     <label>Voix<select class="voice-select">
      <option value="">Automatique</option>
      ${voices.map(v=>`<option value="${v.name}" ${settings.preferredVoice===v.name?'selected':''}>${v.name}</option>`).join('')}
     </select></label>
    </div>
   </details>
   <p class="muted">Le micro est traité par les fonctions du navigateur. Cette version ne transmet pas encore l’audio à un serveur d’IA.</p>
  </section>`;

  const mic=root.querySelector('.voice-mic');
  const transcriptBox=root.querySelector('.voice-transcript');
  const transcriptText=transcriptBox.querySelector('p');
  const status=root.querySelector('.voice-status');
  let recognition=null;
  let transcript='';

  if(canRecognize){
   recognition=new SpeechRecognition();
   recognition.lang='fr-FR';
   recognition.interimResults=true;
   recognition.continuous=false;

   recognition.onstart=()=>{
    mic.classList.add('listening');
    status.textContent='J’écoute…';
   };
   recognition.onresult=event=>{
    transcript='';
    for(let i=event.resultIndex;i<event.results.length;i++){
     transcript+=event.results[i][0].transcript;
    }
    transcriptText.textContent=transcript;
    transcriptBox.classList.remove('hidden');
    if(typeof onTranscript==='function')onTranscript(transcript);
   };
   recognition.onerror=event=>{
    mic.classList.remove('listening');
    status.textContent=event.error==='not-allowed'?'Micro refusé':'Erreur micro';
   };
   recognition.onend=()=>{
    mic.classList.remove('listening');
    status.textContent=transcript?'Transcription prête':'Prêt';
   };

   const start=event=>{
    event.preventDefault();
    transcript='';
    transcriptText.textContent='';
    try{recognition.start()}catch(_){}
   };
   const stop=event=>{
    event.preventDefault();
    try{recognition.stop()}catch(_){}
   };
   mic.addEventListener('touchstart',start,{passive:false});
   mic.addEventListener('touchend',stop,{passive:false});
   mic.addEventListener('mousedown',start);
   mic.addEventListener('mouseup',stop);
   mic.addEventListener('mouseleave',stop);
  }

  root.querySelector('.voice-send-transcript').onclick=()=>{
   if(!transcript.trim())return;
   if(typeof onSubmit==='function')onSubmit(transcript.trim());
   transcript='';
   transcriptBox.classList.add('hidden');
  };

  root.querySelector('.voice-read-last').onclick=()=>{
   const text=typeof getLastNovaMessage==='function'?getLastNovaMessage():'';
   if(text)speakText(text,{force:true});
   else if(typeof onSpeakLast==='function')onSpeakLast();
  };
  root.querySelector('.voice-stop').onclick=stopSpeaking;

  const persist=()=>{
   saveVoiceSettings({
    enabled:root.querySelector('.voice-enabled').checked,
    autoSpeak:root.querySelector('.voice-auto').checked,
    rate:+root.querySelector('.voice-rate').value,
    pitch:+root.querySelector('.voice-pitch').value,
    preferredVoice:root.querySelector('.voice-select').value
   });
  };
  root.querySelectorAll('.voice-settings input,.voice-settings select').forEach(el=>el.onchange=persist);
 }catch(error){
  console.error('Mode vocal indisponible:',error);
  root.innerHTML='<div class="notice"><b class="warn">MODE VOCAL INDISPONIBLE</b><p>La conversation texte reste utilisable.</p></div>';
 }
}

export function shouldAutoSpeak(){
 return !!getVoiceSettings().autoSpeak;
}

import {loadState,saveState} from './storage.js';
export function supported(){return 'Notification' in window&&'serviceWorker' in navigator}
export function settings(){const s=loadState();return s.notifications}
export async function enable(){if(!supported())throw new Error('Notifications non disponibles');return await Notification.requestPermission()}
export function saveSettings(v){const s=loadState();s.notifications={...s.notifications,...v};saveState(s)}
export async function send(title,body){if(!supported()||Notification.permission!=='granted')return false;const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,icon:'icon.svg',badge:'icon.svg',tag:'nl10'});return true}

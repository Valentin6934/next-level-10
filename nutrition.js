import {loadState,saveState} from './storage.js';
const DB='nl10_photos',STORE='photos';
function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function putPhoto(key,file){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(file,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
export async function getPhoto(key){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(STORE).objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
export const mealTypes=[{id:'breakfast',name:'Petit-déjeuner',icon:'🥣',role:'Recharge l’énergie après la nuit et prépare la concentration.'},{id:'lunch',name:'Déjeuner',icon:'🍝',role:'Recharge les réserves et soutient la croissance.'},{id:'snack',name:'Collation',icon:'🍌',role:'Évite le coup de fatigue avant ou après la séance.'},{id:'dinner',name:'Dîner',icon:'🍚',role:'Soutient la récupération pendant la nuit.'}];
export function dayNutrition(){const s=loadState(),k=new Date().toISOString().slice(0,10);s.nutrition[k]=s.nutrition[k]||{meals:{},review:{}};return{s,key,day:s.nutrition[k]}}
export function validateMeal(id,data){const {s,key,day}=dayNutrition();const old=day.meals[id]?.validated;day.meals[id]={...(day.meals[id]||{}),...data,validated:true};if(!old)s.xp+=20;saveState(s)}
export function saveFoodReview(review){const {s,day}=dayNutrition();day.review=review;saveState(s)}

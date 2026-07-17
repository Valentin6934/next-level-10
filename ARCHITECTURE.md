# Architecture V1

## Interface
- `index.html`
- `style.css`
- modules ES dans `app/`

## Données
- localStorage, clé historique conservée pour ne pas perdre les données ;
- schéma versionné et migration automatique ;
- export/import JSON.

## Modules principaux
- `main.js` : navigation et orchestration ;
- `player.js` : profil et onboarding ;
- `nova.js`, `nova-conversation.js`, `nova-memory.js`, `voice.js` ;
- `planning.js`, `timer.js`, `weather.js` ;
- `nutrition.js`, `video.js`, `session-video.js` ;
- `ratings.js`, `performance.js`, `career.js`.

## Limites V1
- aucune synchronisation cloud ;
- aucune IA serveur ;
- aucune analyse automatique du contenu vidéo ;
- reconnaissance vocale dépendante du navigateur.

# 🧠 MOTORMAGEDDON - MÉMOIRE DU PROJET & JOURNAL DES MODIFICATIONS

## ÉTAT DU SYSTÈME & JALONS TERMINÉS

### ✅ 1. MOTEUR 3D & CORE (THREE.JS + VITE)
- Scène 3D optimisée pour smartphones avec éclairage doux et ombres douces PCF.
- Caméra arcade dynamique de poursuite fluide qui anticipe les virages et amortit les secousses.
- Caméra cinématique 360° pour les menus, l'écran de démarrage et le garage.
- Résolution haute-DPI plafonnée à 2.0x pour une efficacité thermique maximale sur mobile.

### ✅ 2. MODÉLISATION 3D, ACCIDENTS & RELÈVEMENT COMIQUE
- **4 Motos uniques** : *La Guêpe 50cc*, *Foudre Noire 1000*, *Le Chopper Paname*, *Le Trike Turbo*.
- **Pilote cartoon articulé** : béret tricolore, lunettes, écharpe flottante, compensation d'inclinaison.
- **Animation d'accident burlesque en 3 phases** lors d'une collision au feu rouge :
  1. Chute sur le flanc.
  2. Le pilote s'assied et secoue comiquement la tête (effet étourdi).
  3. Rebond élastique, moto redressée et reprise de course avec 2s d'immunité clignotante.
- Correction mathématique de la direction inversée (droite = droite écran, gauche = gauche écran).

### ✅ 3. SYSTÈME DE FREINAGE COMPLET (ARRÊT & REPRISE)
- Bouton tactile HUD "FREIN" et touches clavier (Flèche Bas / Touche S).
- Décélération progressive jusqu'à l'arrêt complet (0 km/h).
- Allumage des feux stop, moteur au ralenti feutré, circulation qui continue, réaccélération fluide au relâchement.

### ✅ 4. RUES & AVENUES SINUEUSES (VIRAGES GAUCHE/DROITE)
- Courbure dynamique de la chaussée calculée selon `getRoadCenterX(z)` et `getRoadAngle(z)`.
- La moto, les décors, les carrefours, l'arche d'arrivée et les piétons épousent parfaitement la trajectoire des virages.

### ✅ 5. CARREFOURS, FEUX TRICOLORES & TRAFIC TRANSVERSAL
- Carrefours à feux et ronds-points avec pelouse et fontaine.
- Feux de signalisation qui passent au rouge à l'approche de la moto.
- Franchir un feu rouge déclenche un véhicule transversal (taxi, camionnette, citadine) percutant la moto.

### ✅ 6. PIÉTONS DIVERSIFIÉS & IMPACTS BURLESQUES ÉQUILIBRÉS
- Piétons enrichis : Papy avec canne, Parent avec poussette, Groupe de flâneurs, Parisien pressé, Touriste égaré.
- Projection aérienne équilibrée (4,5 à 6 mètres de haut).
- Gouttelettes et discrète marque au sol rouge cartoon.

### ✅ 7. LIGNE D'ARRIVÉE 3D & CÉLÉBRATION DE VICTOIRE
- Arche 3D monumentale avec banderole à damier, drapeaux français et oriflammes.
- Franchissement déclenchant une pluie de confettis multicolores, fanfare de victoire et transition vers les résultats.

### ✅ 8. 10 VILLES FRANÇAISES & CARTE SVG RÉALISTE
- Paris, Lyon, Marseille, Chamonix, Annecy, Millau, Nice, Bordeaux, Saint-Malo, Strasbourg.
- Carte SVG réaliste de France avec reliefs, contours côtiers et transition cinématique de zoom d'entrée.

### ✅ 9. SECTION PROFIL JOUEUR & NAVIGATION ANDROID
- Profil joueur avec stats persistantes (score cumulé, piétons heurtés, villes débloquées, distance totale, feux grillés, titre honorifique).
- Gestion de la touche retour matérielle Android (fermeture des modales ouvertes, puis confirmation avant de quitter sur l'écran d'accueil).
- Correction du Garage (sortie fluide et tabs élargis sans coupure de texte).

### ✅ 10. CYCLE DE VIE AUDIO, MÉMOIRE & EXTINCTION COMPLÈTE
- Intégration de `@capacitor/app` avec écouteurs `appStateChange`, `pause`, `resume`.
- Écouteurs `visibilitychange`, `pagehide`, `beforeunload`.
- Déconnexion systématique de tous les nœuds audio éphémères (`osc.disconnect()`, `gain.disconnect()`) sur `osc.onended`.
- Fermeture et suspension immédiate du contexte WebAudio (`ctx.close()`, `ctx.suspend()`) lors de la sortie pour éliminer toute persistance sonore et fuite mémoire.
- Volume moteur adouci en un ronronnement agréable.

### ✅ 11. VERSIONNAGE COMPLET & SIGNATURE PERMANENTE (RÉSOLUTION MISE À JOUR IMPOSSIBLE)
- **Origine du problème de mise à jour** : Les runners GitHub Actions utilisaient un keystore temporaire aléatoire différent à chaque compilation (signatures SHA-256 divergentes), et le `versionCode` restait bloqué à 1.
- **Résolution définitive** :
  - **Keystore permanent** `android/app/motormageddon.keystore` (RSA 2048, 10 000 jours, EOMedia) versionné dans le dépôt Git.
  - Toutes les compilations (locales et GitHub Actions) partagent la **même signature cryptographique**.
  - `versionCode` incrémenté à **3** et `versionName` à **1.2.0**.
  - Single source of truth : `version.json` et `src/core/Version.js`.
  - Nom d'APK généré automatiquement : `Motormageddon-v1.2.0-b3-debug.apk` (et copie `app-debug.apk`).
  - Script d'incrémentation : `npm run version:patch`, `version:minor`, `version:major`.
  - Affichage de la version `${FULL_VERSION}` sur l'écran titre, dans les options et dans les mentions légales.
- *(Rappel transition : Si une version antérieure temporaire avec une ancienne clé était installée sur l'appareil, la désinstaller une fois. Dès cette version v1.2.0 installée, toutes les futures mises à jour s'installeront directement par-dessus sans aucune désinstallation).*

### ✅ 12. VALIDATION DU BUILD ANDROID & GITHUB ACTIONS
- **Compilation locale APK réussie** : `android/app/build/outputs/apk/debug/Motormageddon-v1.2.0-b3-debug.apk` et `app-debug.apk` (8.16 Mo).
- **GitHub Actions CI/CD (Run #8)** : Workflow `42044299313` terminé avec succès (`conclusion: success`).
- **Artefact GitHub disponible** : `Motormageddon-Debug-APK` (id: `13424022571`, 8.16 Mo) prêt au téléchargement sur GitHub Actions.
- **Dépôt officiel** : `https://github.com/hafedhhelali/Motormageddon`

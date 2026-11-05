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

### ✅ 11. VERSIONNAGE COMPLET, CANAL BETA & GITHUB ACTIONS
- **Canal officiel** : **BETA** (`1.2.1-beta`, Build 4).
- **Intégration GitHub Actions consolidée** :
  - **1 seule exécution par push** (déclencheur unique `push: branches: [main]`, concurrency activée).
  - **1 seul APK officiel** généré et publié : `Motormageddon-v1.2.1-beta-b4-debug.apk` (sans doublon).
  - Extraction dynamique de la version depuis `version.json` dans GitHub Actions (`APP_VERSION`, `VERSION_CODE`, `CHANNEL`).
  - Nom d'artefact GitHub dynamique : `Motormageddon-v1.2.1-beta-b4-APK`.
  - Releases GitHub configurées en Pre-release (`prerelease: true`) marquées **[BETA]**.
  - Badge BETA distinctif rouge/rose sur le Splash Screen et dans les mentions légales de l'application.
- **Keystore permanent** : `android/app/motormageddon.keystore` (RSA 2048, 10 000 jours, EOMedia) garantissant l'identité de signature SHA-256 sur toutes les versions.
- **Script d'incrémentation** : `npm run version:patch`, `version:minor`, `version:major` configurés pour préserver automatiquement le canal `-beta`.

### ✅ 12. NOUVEAUTÉS DE LA VERSION 1.2.1-BETA
- **Carrefours Réalistes** : Remplacement complet des ronds-points par de vrais carrefours urbains français (4 voies, trottoirs arrondis en granit, feux tricolores avec potence et répétiteur bas deux-roues, passages piétons zébrés, barrières Croix de Saint-André, plaques de rue émaillées, circulation transversale fluide avec bonus d'arrêt au feu).
- **Ergonomie du Frein (3 Zones)** : Pédale de frein sport grand format en bas à gauche (pouce gauche), compteur centré dégagé avec jauge, klaxon en bas à droite (pouce droit).
- **Réactions Vocales Réalistes aux Heurts** : Synthèse WebAudio de voix humaine différenciée pour enfant (cri aigu), vieux (râle chevrotant + canne en bois), femme (cri perçant), homme (grognement viril) + thud corporel.
- **Piétons Expressifs & IA de Fuite** : Modèles 3D détaillés et IA paniquée ("Ils tentent de s'enfuir !") : les piétons crient, agitent les bras et sprintent vers le trottoir quand la moto approche.
- **Carte Haute Fidélité & Zéro Scroll** : Décalage sous la barre d'état du téléphone, suppression totale du défilement horizontal, géographie française exacte, rivières et pays frontaliers réels (Espagne 🇪🇸, Italie 🇮🇹, Suisse 🇨🇭, Allemagne 🇩🇪, Belgique 🇧🇪, Royaume-Uni 🇬🇧).

### ✅ 13. VALIDATION DU BUILD ANDROID & GITHUB ACTIONS
- **Compilation locale & cloud APK** : `android/app/build/outputs/apk/debug/Motormageddon-v1.2.1-beta-b4-debug.apk`.
- **Dépôt officiel** : `https://github.com/hafedhhelali/Motormageddon`

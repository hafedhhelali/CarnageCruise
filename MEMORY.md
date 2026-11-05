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
- **Canal officiel** : **BETA** (`1.2.4-beta`, Build 7).
- **Intégration GitHub Actions consolidée** :
  - **1 seule exécution par push** (déclencheur unique `push: branches: [main]`, concurrency activée).
  - **1 seul APK officiel** généré et publié : `Motormageddon-v1.2.4-beta-b7-debug.apk` (sans doublon).
  - Extraction dynamique de la version depuis `version.json` dans GitHub Actions (`APP_VERSION`, `VERSION_CODE`, `CHANNEL`).
  - Nom d'artefact GitHub dynamique : `Motormageddon-v1.2.3-beta-b6-APK`.
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
- **Compilation locale & cloud APK** : `android/app/build/outputs/apk/debug/Motormageddon-v1.2.3-beta-b6-debug.apk`.
- **Dépôt officiel** : `https://github.com/hafedhhelali/Motormageddon`

### ✅ 14. NOUVEAUTÉS DE LA VERSION 1.2.2-BETA
- **Contenu Abaissé sur Tous les Écrans** : `calc(env(safe-area-inset-top, 36px) + 36px)` appliqué à Splash, Carte, Garage, HUD et Modales pour dégager l'encoche et la barre d'état.
- **Résolution du Score à 0 & Entête HUD Prestige** : Swept collision anti-tunneling, accumulation continue de points de conduite au volant, bonus Frôlement (+75 PTS x combo), badge score LED or et carte d'objectif dynamique avec jauge et points restants.
- **Carte 3D Somptueuse & Alignement Parfait** : Ratio 540x500 calé 1:1, métropole vert émeraude de luxe avec halo côtier turquoise, océan bleu nuit avec boussole dorée, tracé or étincelant et médaillons dorés 3D officiels.
- **Garage Ultra-Simple, Modèles Hard & Retour Carte** :
  - Flèches géantes ◀ et ▶ pour naviguer sans effort entre les modèles.
  - 3 nouveaux bolides hard : *Nitro V8 Dragster* (blower géant, flammes zoomies, NOS), *Diablo Hypersport* (treillis rouge, winglets MotoGP), *Ravageur 750* (rallye-raid tout-terrain blindé).
  - Bouton équiper renvoyant automatiquement à la carte.
- **Compte à Rebours 3-2-1-GO & Moto à l'Arrêt** : Moto strictement arrêtée (speed = 0) au ralenti à l'arrivée en ville, séquence 3... 2... 1... GO ! avec bips sonores et fanfare triomphale avant démarrage en trombe.
- **Animations Enrichies** : Drapeaux français 🇫🇷 flottant au vent sur les monuments et l'arche, IA de fuite rééquilibrée et vivante.

### ✅ 15. NOUVEAUTÉS DE LA VERSION 1.2.3-BETA
- **Correction Débordement Bouton Bas Écran Map** :
  - Le conteneur du bouton d'action `#city-detail` a été refondu avec `.city-detail-actions` en pleine largeur (`width: 100%`, `box-sizing: border-box`).
  - Suppression de `white-space: nowrap` qui causait le débordement sur la gauche sur les écrans mobiles étroits.
  - Bouton responsive et centré : `🚀 DÉPART • ÉTAPE X : NOM_VILLE`.
- **En-tête Map Allégée & Boutons Icônes Prestige** :
  - Remplacement des boutons texte encombrants par des boutons circulaires d'action `.btn-round-action` (`🏠` pour l'accueil, `🏍️` avec lueur dorée pour le garage).
  - Badge étoiles compact (`★ X / 30 ÉTOILES`) et pilule de monnaie (`🪙 X`) harmonieuse.
- **Aperçu 3D en Temps Réel dans le Garage** :
  - Émission de `PREVIEW_BIKE` dès l'ouverture du garage.
  - Lorsque le joueur fait défiler les véhicules avec ◀ et ▶, le bolide 3D dans la scène Three.js se reconstruit instantanément avec la peinture et les détails du bolide sélectionné.
  - Le retour à la carte ou à l'accueil réinitialise proprement la 3D sur le bolide actuellement équipé.
- **Amélioration Globale des Boutons et Textes** :
  - Retouche de `.btn-arcade`, `.btn-secondary`, `.btn-accent`, `.btn-ghost` : micro-relief, biseau intérieur, ombres portées douces, état `:active` dynamique (translation `translateY(2px)` + échelle amortie).
  - Typographie nette et lisible sans texte coupé.

### ✅ 16. NOUVEAUTÉS DE LA VERSION 1.2.4-BETA
- **Règle Stricte du Score à l'Arrêt** : Le score de conduite ne progresse sous aucun prétexte à l'arrêt ou lors du freinage.
- **Pénalité de Score aux Chocs Véhicules (-350 PTS)** :
  - Déduction immédiate de 350 pts sur le score en cas de collision avec un véhicule au carrefour.
  - Flash écran rouge sang, pop-up animée `💥 -350 PTS !`, clignotement rouge du compteur et buzzer sonore de pénalité.
- **Extension Internationale (15 Villes d'Europe)** :
  - Ajout des capitales et métropoles frontalières : Bruxelles 🇧🇪, Londres 🇬🇧, Barcelone 🇪🇸, Milan 🇮🇹, Genève 🇨🇭.
- **Carte d'Europe Scrollable en 2D & Nettoyage** :
  - Suppression du bandeau supérieur des villes.
  - Viewport panoramique scrollable et tactile avec centrage automatique sur l'étape choisie.
- **Effet de Déplacement Animé de Ville en Ville** :
  - Jeton motard voyageur filant sur la carte avec traînée d'échappement, trait néon actif et bruitage d'accélération.
- **Monuments 3D Réalistes dans Chaque Ville** :
  - Tour Eiffel, Arc de Triomphe, Big Ben, Atomium, Sagrada Família, Duomo de Milan, Jet d'Eau de Genève, etc. modélisés en 3D cartoon dans la scène de course.

### ✅ 17. NOUVEAUTÉS DE LA VERSION 1.2.5-BETA
- **Monture Pur-Sang / Étalon Sauvage (`cheval`)** :
  - Modélisation 3D d'étalon noble (robe alezane, crinière et longue queue animée, selle d'équitation et étriers).
  - Animation de galop à 4 pattes articulées synchronisée avec la vitesse.
  - Pilote équipé d'un fouet/cravache (whip) 3D avec mouvement de fouettement rythmé.
  - Effet sonore burlesque : claquement sec de fouet suivi du hennissement réaliste de l'étalon (`playHorseWhinny()`).
- **Titan Compresseur 50T (`rouleau`)** :
  - Cylindre avant broyeur lourd en rotation continue sur son axe.
  - Châssis industriel avec arceau de sécurité, gyrophare rotatif orange et cheminée diesel.
  - Klaxon industriel de chantier ultra-lourd (`playSteamrollerHorn()`).
- **Conformité & Éthique Stores Mobiles** :
  - Remplacement de l'arme à feu par la cravache équestre et le compresseur de chantier pour respecter strictement les directives Google Play / App Store (rejet des armes à feu réelles ciblant des piétons).

### ✅ 18. NOUVEAUTÉS DE LA VERSION 1.2.6-BETA (REFONTE GRAPHIQUE & ARCHITECTURALE)
- **Rendu Three.js sRGB & ACES Filmic Tone Mapping** : Couleurs vives, saturées et éclatantes sans pâleur. Éclairage hémisphérique bicolore et lumière de contre-jour (rim light) cyan cartoon.
- **Piétons Expressifs & Visages Complets** : Yeux blancs et pupilles noires brillantes, sourcils articulés, bouche s'ouvrant en grand cri lors de la panique, regard terrifié en arrière et halo d'étoiles de vertige (dizzy stars) à l'impact.
- **VFX Cartoon Nouvelle Génération & Zéro Fuite Mémoire** : Pooling strict de géométries et matériaux partagés dans `Particles.js`. Ondes de choc circulaires (`shockwave rings`), volutes de fumée d'échappement volumétriques et fumée de dérapage de pneus au freinage (`spawnSkidSmoke`).
- **Décors Urbains & Architecture Vivante** : Fenêtres d'immeubles illuminées, balcons en fer forgé haussmanniens, arbres étagés multi-sphères, colonnes Morris parisiennes et réverbères éclatants.
- **Boutons 3D Arcade & UI Polie** : Boutons de borne d'arcade japonaise avec biseau lumineux, micro-ressort haptique et barre de progression à scintillement dynamique (shimmer).


# 🏍️ MOTORMAGEDDON : TOUR DE FRANCE ARCADE 3D
## DOCUMENT TECHNIQUE DE TRANSMISSION STUDIO (HANDOFF)

Ce document fournit l'ensemble des informations de conception, d'architecture logicielle, de déploiement et de versionnage pour **Motormageddon**.

---

## 1. VISION DU PROJET & SPÉCIFICATIONS

- **Genre** : Jeu de course d'arcade urbain / Runner 3D burlesque
- **Version actuelle** : **1.2.3-beta** (Build / versionCode 6 - Canal BETA)
- **Signature & Clé** : Keystore permanent dédié `android/app/motormageddon.keystore` (validité 10 000 jours, EOMedia Paris)
- **Plateforme cible** : Android (Smartphones & Tablettes) + WebGL Mobile/Desktop
- **Direction artistique** : Cartoon 3D éclatant, physique burlesque (slapstick), animations hilarantes et dynamiques, identité française affirmée.
- **Moteur & Technologies** :
  - **Moteur 3D** : Three.js (WebGL Toon/Gouraud optimisé mobile)
  - **Packaging Android** : Capacitor 8.6 + Android Gradle Plugin + Java 17 (SDK 36 / Android 15/14/13/12+)
  - **Moteur Audio** : Synthétiseur procédural WebAudio API avec gestion mémoire et cycle de vie Android strict (Background/Pause/Exit/Resume)
  - **Build Tooling** : Vite + Gradle Wrapper + GitHub Actions CI/CD (génération automatique d'APK versionné à chaque push)

---

## 2. NOUVEAUTÉS DE LA VERSION 1.2.0

### A. Vrais Ronds-Points Français Monumentaux (Sens Giratoire)
- **Anneau giratoire large** : Anneau d'asphalte (diamètre 24m) avec marquages circulaires pointillés au sol.
- **Îlot central monumental** : Bordure biseautée bicolore, pelouse surélevée, massif floral tricolore (bleu, blanc, rouge), fontaine en pierre avec vasque d'eau turquoise et obélisque classique.
- **Signalisation officielle** : Panneaux circulaires bleus B21f "Sens giratoire obligatoire" avec flèches en boucle aux entrées et sorties.
- **Véhicules circulant en rotation** : Deux voitures (2CV vintage et citadine compacte) tournent en continu dans le rond-point avec leurs roues animées.
- **Physique de collision** : Détection burlesque en cas d'impact avec l'un des véhicules circulants ou si le joueur tente de couper tout droit à travers le terre-plein central.

### B. Direction Progressive & Conduite Amortie (Adoucissement Brutalité)
- Filtrage exponentiel d'inertie : `this.smoothedSteer += (steerInput - this.smoothedSteer) * Math.min(1.0, delta * 7.5)`.
- Vitesse latérale modérée à 8.2 m/s (au lieu de 12 m/s saccadé).
- Inclinaison du bolide plafonnée à ~18° doux et naturel (`smoothedSteer * 0.32`).
- Zone morte tactile (deadzone 4px) et sensibilité ajustée à 0.0045 dans `main.js` pour filtrer les micro-tremblements du pouce.

### C. Effets d'Impact Réduits et Teintés en Orange Vif
- Remplacement des gros éléments jaunes par des étincelles et étoiles compactes couleur orange mandarine / carotte (`0xff6b00` et `0xff9f1a`).
- Taille réduite de 50% pour ne pas obstruer la vision du joueur.
- Durée de vie raccourcie à 0.55s pour un feedback punchy et net.

### D. Carrefours Urbains Réalistes & Véhicules Transversaux Détaillés
- Avenues perpendiculaires larges avec passages piétons zébrés et lignes d'arrêt continues.
- Feux de circulation tricolores synchronisés passant au rouge lors de l'approche du joueur.
- Véhicules transversaux détaillés : Taxis parisiens avec enseigne de toit "TAXI", camionnettes de livraison blanches, citadines sport avec rotation des roues 3D en temps réel.
- Animation de chute burlesque en 3 phases lors de collision au feu rouge.

### E. Amélioration Visuelle & Interactive de la Carte de France
- Tracé néon doré du Tour de France reliant les 10 étapes en séquence avec animation d'impulsion continue.
- 10 emblèmes thématiques pour chaque ville : 🗼 Paris, 🦁 Lyon, ⚓ Marseille, 🏔️ Chamonix, ⛵ Annecy, 🌉 Millau, 🌴 Nice, 🍇 Bordeaux, 🏰 Saint-Malo, 🥨 Strasbourg.
- Barre de défilement horizontal rapide des étapes (`stage-pill`) au-dessus de la carte pour naviguer instantanément d'une étape à l'autre.
- Fiche étape grand format avec record, étoiles, type de parcours et bouton "DÉPART DU TOUR".

### F. Ergonomie Repensée du Garage
- Suppression définitive des articles "La" et "Le" dans les boutons.
- Navigation par flèches carrousel tactiles ◀ et ▶ pour faire défiler les bolides en 3D en toute fluidité.
- Pilules de catégories explicites avec icônes : 🛵 SCOOTER, ⚡ SUPERBIKE, 🏍️ CHOPPER, 🏎️ MONSTER TRIKE.
- Jauges de performances proportionnelles (Vitesse, Maniabilité, Accélération).
- Nuancier de peinture élargi et bouton d'action pleine largeur ("ÉQUIPER CE BOLIDE" ou "DÉBLOQUER").

### G. Intégration CI/CD GitHub Actions & Canal BETA
- Keystore cryptographique permanent `android/app/motormageddon.keystore` (RSA 2048, valide 27 ans, EOMedia) garantissant l'identité de signature SHA-256 sur toutes les versions.
- Pipeline CI/CD consolidé : déclenchement unique sur `push: branches: [main]` (aucune double exécution lors des tags).
- Publication unique : un seul APK officiel produit et publié (`Motormageddon-v1.2.0-beta-b3-debug.apk`), sans doublon générique `app-debug.apk`.
- Gestion de concurrence (`concurrency: cancel-in-progress`) pour éviter tout build superflus en parallèle.
- Pre-release GitHub Release automatique étiquetée **[BETA]** avec `prerelease: true`.
- Badge BETA élégant affiché sur le Splash Screen et dans les mentions légales de l'application.
- `versionCode` : 4, `versionName` : 1.2.1-beta.
- Scripts d'incrémentation : `npm run version:patch`, `version:minor`, `version:major` (gérant automatiquement le suffixe `-beta`).

---

## 3. NOUVEAUTÉS DE LA VERSION 1.2.1-BETA

### A. Remplacement Total des Ronds-Points par des Carrefours Urbains Réalistes
- **Suppression définitive des ronds-points** inadaptés au gameplay d'arcade linéaire.
- **Grands carrefours réalistes** : chaussée perpendiculaire de 54m de long x 16m de large, bordures de trottoir arrondies en granit clair (`0x95a5a6`), passages piétons zébrés normalisés sur les 4 branches, lignes d'arrêt continues.
- **Feux tricolores haute fidélité** : mât acier laqué anthracite avec potence surplombante, visières pare-soleil, optiques fonctionnelles (Rouge, Orange, Vert), **répétiteur bas pour deux-roues** à 1.6m de haut et plaques de rue émaillées parisiennes ("BD SAINT-GERMAIN", "AVENUE MONTAIGNE", etc.).
- **Mobilier urbain authentique** : barrières de protection piétons **Croix de Saint-André** vert impérial aux 4 angles et candélabres d'éclairage.
- **Trafic transversal dynamique** : Taxis avec enseigne lumineuse de toit, camionnettes de livraison blanches, compactes sport et berlines.
- **Bonus de civisme** : Si le joueur freine et s'arrête avant la ligne de stop au feu rouge, le trafic défile devant lui et il reçoit `+250 PTS` avant que le feu ne repasse au vert !

### B. Ergonomie Optimisée du Frein (Disposition 3 Zones Équilibrée)
- **Pédale de FREIN (Pouce gauche)** : Pédale sport grand format (88px x 68px) dans le coin inférieur gauche avec rainures antidérapantes, bordure rouge néon et retour haptique/visuel au maintien.
- **Compteur de Vitesse (Centre)** : Afficheur numérique centré, totalement dégagé des pouces, avec jauge de vitesse dynamique (`hud-speed-gauge`).
- **Klaxon (Pouce droit)** : Bouton klaxon ergonomique (68px x 68px) dans le coin inférieur droit.

### C. Réactions Sonores Réalistes Différenciées selon la Personne Heurtée
- Synthèse procédurale WebAudio dédiée selon la catégorie du piéton :
  - **Enfant (`child`)** : Cri aigu surpris (680Hz ➔ 460Hz, filtre formant à 1450Hz).
  - **Vieux (`elderly`)** : Râle rauque chevrotant (165Hz ➔ 95Hz, tremolo 8Hz "Oh là là !") + claquement sec de la canne en bois.
  - **Femme (`woman`)** : Cri perçant surpris (520Hz ➔ 320Hz, formant à 1850Hz "Aaaaah !").
  - **Homme (`man`)** : Grognement / râle baryton viril (210Hz ➔ 85Hz, formant à 620Hz "Wooooh !").
- Choc corporel physique réaliste (thud sub-bass 110Hz ➔ 35Hz) sous-jacent.

### D. Graphismes et Animations Piétons Améliorés + IA de Fuite ("Ils tentent de s'enfuir !")
- Modèles 3D enrichis : jambes et bras articulés avec mains et chaussures, têtes expressives, coiffures, casquettes, sacs à main, trottinettes, poussettes avec bébé.
- **IA de Fuite Paniquée** : Quand la moto approche à moins de 26m, le piéton panique, tourne la tête, lève les bras au ciel en criant et sprint à toute allure (vitesse x 2.8) vers le trottoir le plus proche !
- S'il atteint le trottoir à temps, il esquive l'impact ; sinon, collision burlesque.

### E. Écran Carte du Tour : Zéro Scroll Horizontal, Décalage Encoche & Pays Frontaliers Réalistes
- **Décalage vers le bas** : `padding: calc(env(safe-area-inset-top, 28px) + 28px)` pour ne plus empiéter sur la barre d'état et l'encoche du téléphone.
- **Suppression intégrale du défilement horizontal** : `overflow-x: hidden !important; max-width: 100vw; box-sizing: border-box;`.
- **SVG Cartographique Haute Définition** :
  - Contours géographiques précis de la France (Bretagne, Cotentin, Golfe de Gascogne, Côte d'Azur, Corse).
  - Pays frontaliers réels intégrés avec frontières et drapeaux : 🇪🇸 **ESPAGNE**, 🇮🇹 **ITALIE**, 🇨🇭 **SUISSE**, 🇩🇪 **ALLEMAGNE**, 🇧🇪 **BELGIQUE**, 🇬🇧 **ROYAUME-UNI**.
  - Rivières majeures (Seine, Loire, Rhône, Garonne) et typographie marine (Océan Atlantique, Mer Méditerranée, La Manche).

---

## 4. NOUVEAUTÉS DE LA VERSION 1.2.2-BETA

### A. Décalage Vers le Bas sur Tous les Écrans (Encoches & Barre d'État Mobile)
- Application systématique d'une marge haute confortable (`calc(env(safe-area-inset-top, 36px) + 36px)`) sur l'ensemble des écrans :
  - Écran de lancement (`.screen-splash`)
  - Carte de France 3D (`.screen-map`)
  - Garage et personnalisation (`.screen-garage`)
  - Interface de pilotage HUD (`.screen-hud`)
  - Fenêtres modales et dialogues (`.modal-overlay`, `.modal-card`)
- Les caméras poinçons (punch-hole) et encoches d'écran ne recouvrent plus aucun titre ni bouton.

### B. Refonte Majeure de l'Entête Score / Objectif & Résolution du Score à 0
- **Résolution du Score à 0** :
  - Élimination complète du problème de tunneling grâce à une détection de collision balayée (*swept collision box*) adaptée à la vitesse de frame.
  - Ajout de points continus de conduite arcade : piloter à haute vitesse fait monter le score en direct.
  - Ajout du bonus de **Frôlement / Near-Miss (+75 PTS x combo)** quand un piéton est évité de justesse, avec effet sonore dédié et particules.
  - Synchronisation temps réel de `#hud-score-val` à chaque tick de course (`stats_tick`).
- **Nouvel Entête HUD Prestige** :
  - Badge Score arcade avec bordure or lumineuse et compteur LED dynamique.
  - Carte d'objectif centrale avec nom de la ville, cible en points, jauge de progression bicolore avec pourcentage et calcul du reste à marquer.
  - Badge combo avec flamme animée et bouton pause chromé.

### C. Carte de France 3D Somptueuse & Alignement Parfait des Étapes
- Conteneur cartographique calé au ratio exact du SVG (540x500) pour un alignement géographique 1:1 sans dérive.
- Dégradé de la métropole en vert émeraude prestige avec halo côtier turquoise (`#00cec9`).
- Océan bleu nuit profond avec vagues et **rose des sables dorée (boussole nautique)** dans le Golfe de Gascogne.
- Tracé officiel du Tour de France en néon or éclatant (`#ffd700`) avec pulsation dynamique.
- Médaillons 3D dorés pour chaque ville avec numéro d'étape officiel (`#1` à `#10`), emblème et halo de sélection.
- Raccourci direct vers le Garage depuis l'entête de la carte.

### D. Ergonomie du Garage, Modèles "Hard" & Retour Direct à la Carte
- **Navigation ultra-simple par flèches gauche / droite ◀ et ▶** : boutons grand format flottants permettant de basculer instantanément d'un modèle 3D à l'autre sans friction.
- **3 Nouveaux Modèles Badass / Hard** :
  - 💀 **Nitro V8 Dragster** (Pneu dragster slick 300mm, compresseur soufflant géant blower, échappements zoomies à 45° cracheurs de flammes, bonbonne de NOS bleue).
  - 😈 **Diablo Hypersport** (Streetfighter italienne brutale, cadre treillis tubulaire rouge sang, ailerons winglets MotoGP carbone, double pot sous selle).
  - ⛓️ **Ravageur Apocalypse 750** (Rallye-raid blindé, roues à crampons tout-terrain, pare-buffles tubulaire cage et sabot moteur).
- **Retour automatique à la carte** : cliquer sur "ÉQUIPER" ou sur un véhicule déjà équipé renvoie immédiatement à l'écran de la carte du Tour.

### E. Séquence de Départ en Ville : Moto à l'Arrêt & Compte à Rebours 3 - 2 - 1 - GO !
- À l'arrivée dans une étape, la moto est **strictement à l'arrêt** (`speed = 0`, ralenti moteur ronronnant).
- Compte à rebours animé plein écran avec pops d'échelle et sons électroniques dédiés :
  - **3** (Rouge intense, son bip court)
  - **2** (Orange vif, son bip court)
  - **1** (Ambre clair, son bip court)
  - **GO ! PLEIN GAZ !** (Vert éclatant, fanfare triomphale et ouverture immédiate de l'accélérateur).

### F. Animations Enrichies (Environnement, Rues & Piétons)
- Drapeaux français 🇫🇷 animés flottant au vent sur l'arche d'arrivée et les façades de la ville.
- IA de fuite ajustée : foulées comiques, bras levés et trajectoire vers les trottoirs laissant la possibilité au bolide de les intercepter s'il braque vers eux.

---

## 4. NOUVEAUTÉS DE LA VERSION 1.2.3-BETA

### A. Correction Débordement Bouton Bas Écran Map
- Remplacement de l'agencement flex avec bouton garage redondant par un conteneur pleine largeur `.city-detail-actions`.
- Suppression de `white-space: nowrap` qui causait le débordement hors de l'écran à gauche sur mobile.
- Bouton unique pleine largeur et responsive : `🚀 DÉPART • ÉTAPE X : NOM_VILLE` avec wrapping propre du texte.

### B. En-tête Map avec Boutons Icônes Modernes
- Remplacement des anciens boutons avec texte moche (`← ACCUEIL`, `🏍️ GARAGE`) par des boutons circulaires d'arcade épurés (`.btn-round-action`) avec icônes `🏠` et `🏍️` (halo doré néon pour le garage).
- Badge étoiles du Tour et pilule de monnaie dorée (`.currency-pill`) compacts et élégants.

### C. Aperçu 3D Temps Réel dans le Garage
- Émission immédiate de l'événement `PREVIEW_BIKE` dès l'ouverture du Garage.
- Défilement instantané via les flèches ◀ et ▶ mettant à jour en temps réel le modèle 3D Three.js dans la scène.
- Restitution automatique du bolide équipé lors du retour à la Carte si l'utilisateur n'a pas équipé le modèle prévisualisé.

### D. Refonte Visuelle des Boutons et Textes de l'Application
- Modernisation de tous les boutons (`.btn-arcade`, `.btn-secondary`, `.btn-accent`, `.btn-ghost`) : biseau intérieur, ombrage lumineux arcade, retour tactile `:active` avec translation douce, typographie punchy sans débordement de texte.


# 🏍️ CarnageCruise : TOUR DE FRANCE ARCADE 3D
## DOCUMENT TECHNIQUE DE TRANSMISSION STUDIO (HANDOFF)

Ce document fournit l'ensemble des informations de conception, d'architecture logicielle, de déploiement et de versionnage pour **CarnageCruise**.

---

## 1. VISION DU PROJET & SPÉCIFICATIONS

- **Genre** : Jeu de course d'arcade urbain / Runner 3D burlesque
- **Version actuelle** : **0.9.47-beta** (Build / versionCode 57 - Canal 0.x.x BETA)
- **Signature & Clé** : Keystore permanent dédié `android/app/CarnageCruise.keystore` (validité 10 000 jours, EOMedia Paris)
- **Plateforme cible** : Android (Smartphones & Tablettes) + WebGL Mobile/Desktop
- **Direction artistique** : Cartoon 3D éclatant, physique burlesque (slapstick), animations hilarantes et dynamiques, identité française affirmée.
- **Moteur & Technologies** :
  - **Moteur 3D** : Three.js r187 (WebGL Toon/Gouraud optimisé mobile)
  - **Packaging Android** : Capacitor 8.6 + Android Gradle Plugin + Java 17 (SDK 36 / Android 15/14/13/12+)
  - **Moteur Audio** : Synthèse procédurale WebAudio **+ banque d'échantillons réels CC0 (`SampleBank.js`, packs Kenney)** avec repli procédural automatique
  - **Motion & Cinématiques** : PixiJS v8 (rendu GPU) + GSAP (motion design) + @tweenjs/tween.js
  - **Build Tooling** : Vite + Gradle Wrapper + GitHub Actions CI/CD (génération automatique d'APK **Release signé** versionné à chaque push)

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
- Keystore cryptographique permanent `android/app/CarnageCruise.keystore` (RSA 2048, valide 27 ans, EOMedia) garantissant l'identité de signature SHA-256 sur toutes les versions.
- Pipeline CI/CD consolidé : déclenchement unique sur `push: branches: [main]` (aucune double exécution lors des tags).
- Publication unique : un seul APK officiel produit et publié (`CarnageCruise-v1.2.0-beta-b3-debug.apk`), sans doublon générique `app-debug.apk`.
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

---

## 5. NOUVEAUTÉS DE LA VERSION 1.2.4-BETA

### A. Règle Stricte du Score à l'Arrêt
- Le score de conduite continue n'avance **jamais à l'arrêt** : condition stricte `speed > 3.5 m/s (~13 km/h)`, sans freinage et hors accident.
- Remise à zéro immédiate de l'accumulateur lors du freinage ou de l'arrêt complet.

### B. Pénalité de Score aux Heurts Véhicules avec Effets Visuels et Sonores
- Lors d'une collision avec un véhicule transversal (carrefour) : pénalité de score `-350 PTS` (avec plancher à 0).
- Réinitialisation du combo à x1.
- Effets visuels arcade percutants : flash vignette rouge sang sur l'écran (`.hud-penalty-flash`), pop-up flottante rouge vif animée (`💥 -350 PTS !`), secousse et clignotement rouge du compteur de score.
- Effet sonore dédié : buzzer de pénalité bitonal dissonant (`playPenaltyBuzzer()`).

### C. Extension Internationale du Grand Tour (15 Villes d'Europe)
- Intégration de 5 métropoles frontalières majeures :
  - **Bruxelles 🇧🇪** : L'Atomium en acier chromé et la Grand-Place.
  - **Londres 🇬🇧** : Big Ben, cabines téléphoniques rouges et Westminster Bridge.
  - **Barcelone 🇪🇸** : La Sagrada Família (tours paraboliques ajourées de Gaudí) et palmiers.
  - **Milan 🇮🇹** : Duomo di Milano en marbre blanc éclatant avec forêt de pinacles et Madonnina d'or.
  - **Genève 🇨🇭** : Le Jet d'Eau monumental de 140m sur le lac Léman.
- 15 étapes consécutives réparties géographiquement avec progression calibrée.

### D. Carte d'Europe Scrollable en 2D & Suppression des Villes au-dessus
- Suppression définitive du bandeau `.stages-carousel-bar` au-dessus de la carte pour libérer l'espace visuel.
- Viewport cartographique scrollable et panoramique en 2D (`.europe-map-scroll-viewport`) avec carte SVG haute fidélité (960x820) représentant l'Europe occidentale (France, UK, Belgique, Allemagne, Suisse, Italie, Espagne).
- Centrage automatique fluide (`smooth scrollTo`) sur la ville sélectionnée à l'ouverture et lors des changements d'étape.

### E. Effet de Déplacement Animé de Ville en Ville
- Jeton voyageur motard animé (`.moto-traveler`) filant de la ville de départ à la ville d'arrivée le long d'un tracé doré avec traînée d'échappement.
- Son de vrombissement et souffle d'accélération (`playTravelWhoosh()`).
- Onde de choc dorée circulaire (`pinRippleWave`) à l'arrivée sur le médaillon de la ville cible.

### F. Monuments 3D Emblématiques Dédiés dans Chaque Ville
- Construction 3D personnalisée de chaque monument dans la scène Three.js : Tour Eiffel et Arc de Triomphe (Paris), Big Ben et cabine rouge (Londres), Atomium chromé (Bruxelles), Sagrada Família (Barcelone), Duomo de marbre blanc (Milan), Jet d'Eau de 140m (Genève), Cathédrale de grès rose (Strasbourg), Fourvière (Lyon), Notre-Dame de la Garde et Negresco (Marseille / Nice), Mont-Blanc et Aiguille du Midi (Chamonix), Viaduc suspendu (Millau), etc.
- Affichage du monument dans la fiche descriptive et lors de la cinématique de bienvenue.

---

## 6. NOUVEAUTÉS DE LA VERSION 1.2.5-BETA

### A. Monture Pur-Sang / Étalon Sauvage (`cheval`)
- **Modélisation 3D complète** : Corps de cheval puissant, poitrail bombé, encolure courbée, tête expressive avec naseaux et oreilles dressées, crinière et longue queue soyeuse animée.
- **Selle et étriers d'équitation de luxe** : Tapis de selle tricolore, étriers métalliques, rênes souples.
- **Cinématique de galop en temps réel** : 4 membres articulés (2 antérieurs et 2 postérieurs) oscillant en opposition de phase au rythme de la vitesse de course.
- **Cavalier avec cravache / fouet (whip)** : Le motard devient cavalier, équipé d'une cravache d'équitation 3D avec manche tressé, virole dorée, lanière souple incurvée et pompon rouge sang. Animation de fouettement rythmée au galop.
- **Effet sonore exclusif** : Hennissement d'étalon réaliste et burlesque (`playHorseWhinny()`) précédé d'un claquement sec de fouet via synthèse WebAudio FM.

### B. Titan Compresseur 50T (`rouleau`)
- **Modélisation 3D industrielle** : Cylindre avant broyeur lourd en acier trempé avec boulons d'axe géants et grattoir de bitume, capot moteur blindé avec stries de ventilation, pare-chocs de chantier rayé noir et jaune sécurité.
- **Cabine de conduite & gyrophare** : Arceau de sécurité tubulaire, siège baquet surélevé, gyrophare orange rotatif clignotant sur le toit et cheminée d'échappement diesel verticale.
- **Animation de roulement** : Le cylindre broyeur tourne en continu autour de son axe horizontal à vitesse proportionnelle à la progression de l'engin.
- **Klaxon industriel lourd** : Avertisseur sonore de chantier ultra-grave 55Hz / 110Hz / 138Hz (`playSteamrollerHorn()`).

### C. Respect des Politiques des Stores Mobiles (Conformité & Éthique)
- Remplacement du concept d'arme à feu réelle (Kalachnikov sur piétons, prohibé sur le Google Play Store et l'Apple App Store en vertu des règles de lutte contre la violence armée et les fusillades de rue) par des éléments d'arcade slapstick loufoques (cravache équestre, cylindre compresseur de chantier), garantissant l'acceptation sans réserve et la certification PEGI / ESRB du jeu.

---

## 7. NOUVEAUTÉS DE LA VERSION 1.2.6-BETA (REFONTE GRAPHIQUE & ARCHITECTURALE MAJEURE)

### A. Rendu 3D & Colorimétrie Haute Fidélité
- **Espace Colorimétrique sRGB & ACES Filmic Tone Mapping** : Intégration de `THREE.SRGBColorSpace` et `THREE.ACESFilmicToneMapping` (exposition 1.25) dans `Engine.js`, éliminant les teintes délavées pour des couleurs saturées et éclatantes dignes des productions d'arcade japonaises.
- **Éclairage Bicolore Hémisphérique & Contre-Jour (Rim Light)** : Remplacement de l'éclairage ambiant plat par un `HemisphereLight` (ciel bleu azur / rebond doré du bitume) combiné à une lumière de rim cyan pastel (`0x81ecec`) pour détacher la silhouette du motard et de sa monture.
- **Ombres Filtrées PCF Soft & Bias Calibré** : Élimination totale de l'effet d'acné d'ombre (`normalBias: 0.025`).

### B. Piétons Expressifs & Visages Cartoon Vivants
- **Traits de Visage Complets** : Finis les mannequins sphériques aveugles ! Chaque piéton dispose d'yeux expressifs blancs à pupilles noires brillantes, de sourcils inclinés et d'une bouche animée.
- **Réactions de Panique Hystérique** : Lorsque le bolide approche, la bouche s'ouvre en grand cri béant "O", les sourcils s'arquent, les bras moulinent frénétiquement en l'air et la tête se tourne en arrière avec terreur.
- **Voltige Burlesque avec Étoiles de Vertige (Dizzy Stars)** : Lors d'un impact, 3 étoiles cartoon dorées tourbillonnent en halo au-dessus de la tête du personnage projeté en l'air.

### C. Système de Particules & VFX Nouvelle Génération
- **Zéro Garbage Collection (Architecture Propre)** : Pooling strict des géométries (`sharedGeos`) et matériaux partagés (`sharedMats`) dans `Particles.js` évitant toute instanciation éphémère et chute de framerate.
- **Ondes de Choc (Shockwave Rings)** : Anneaux d'onde de choc s'étendant au sol lors des heurts et départs en trombe.
- **Volutes d'Échappement & Fumée de Dérapage** : Nuages volumétriques de fumée avec grossissement et fondu alpha fluide, et crissement de gomme avec fumée blanche (`spawnSkidSmoke`) lors des freinages violents.

### D. Urbanisme & Décors Haussmanniens Enrichis
- **Façades Vivantes** : Fenêtres alternant pièces illuminées chaleureuses (`0xfff2a3`) et volets fermés, gardes-corps de balcons en fer forgé haussmanniens sur les étages nobles, et stores bannes de bistrots colorés.
- **Végétation Cartoon Volumétrique** : Arbres touffus étagés multi-sphères avec dégradés de verts printaniers.
- **Mobilier Urbain Parisien** : Colonnes Morris vert empire avec affiches colorées, réverbères parisiens avec lanternes chaleureuses.

### E. Boutons d'Arcade 3D & UI Polie
- **Boutons 3D Relief & Brillance Double-Couche** : Design tactile haute finition avec biseau lumineux supérieur, ombre portée colorée profonde et retour haptique visuel élastique au clic.
- **Jauge d'Objectif avec Shimmer Lumineux** : Effet de brillance scintillante animée traversant la barre de progression en continu.

---

## 8. NOUVEAUTÉS DE LA VERSION 0.9.0-BETA (CANAL 0.X.X BETA & SAUT QUALITATIF VISUEL)

### A. Intégration de Nouvelles Bibliothèques Graphiques & Post-Processing
- **Suite Post-Processing Three.js Addons (`EffectComposer`, `RenderPass`, `UnrealBloomPass`, `OutputPass`)** : Intégration d'un bloom arcade subtil (seuil 0.88, force 0.35) illuminant avec panache les phares des bolides, feux stop, gyrophares, pièces d'or et étincelles sans éblouir l'écran.
- **Bibliothèque `@tweenjs/tween.js` (v25)** : Moteur d'interpolation fluide pour les animations procédurales, transitions de caméra et effets d'impact cartoon squash-and-stretch.

### B. Usine de Textures Procédurales Haute Définition (`TextureFactory.js`)
- **Asphalte de Course HD** : Bitume granuleux avec traces d'usure des pneumatiques et vibreurs latéraux de course bicolores (rouge et blanc) sur les bordures de virages.
- **Trottoirs Pavés Parisiens** : Pavés imbriqués biseautés avec joints de mortier et variations de teintes naturelles.
- **Façades Haussmanniennes Riches** : Pierre de taille avec lignes de refend, toitures zinc mansardées, corniches moulurées, fenêtres avec croisillons bois et vitres rétroéclairées avec rideaux, et commerces de rez-de-chaussée (« Café de Paris »).
- **Stores Bannes Rayés & Terrasses de Bistrot** : Toiles rayées avec ombrage de drapé réaliste.
- **Ombres de Contact Douces au Sol (*Ground Contact Shadows*)** : Disques d'ombre radiale douce sous chaque moto, cheval, rouleau compresseur, piéton et véhicule transversal, supprimant l'effet de flottaison géométrique et ancrant les objets avec un réalisme saisissant.

### C. Dôme Céleste & Nuages Flottants Procéduraux (`SkyDome.js`)
- **Dôme Hémisphérique avec Dégradé Zénithal** : Shader personnalisé interpolant les teintes célestes et atmosphériques selon l'étape visitée.
- **Nuages 3D Cartoon Vaporeux Dérivants** : Amas volumétriques de nuages dérivant avec parallaxe au-dessus des métropoles.

### D. Rigueur Architecturale & Code Clean (Audit Lead Dev)
- **Certification Clean Code & SOLID** : 12/12 tests automatisés validés via `npm test` (`scripts/verify-architecture.js`).
- **Alignement Strict du Canal 0.x.x Beta** : Synchronisation exacte de `version.json`, `package.json`, `Version.js` sur `0.9.0-beta` (Build 10).

---

## 9. SYNTHÈSE DES ÉVOLUTIONS MAJEURES v0.9.1 → v0.9.33

### A. Contenu & Monde (v0.9.1 → v0.9.15)
- **17 villes** : extension Madrid 🇪🇸 et Lisbonne 🇵🇹 ; landmarks 3D dédiés par ville.
- **Circulation 3D & piétons vivants** : véhicules double sens, piétons trottoirs/passages avec IA de fuite, montée sur trottoir.
- **Arsenal** : Battle Tank (obus 120mm), Aero-Jet (vol + airstrike), véhicules cataclysme (Hovercraft, Rad-Rover, Snowmobile).
- **Worldmageddon** : 4 vecteurs d'extermination (Street, Nucléaire, Barrage & Déluge, Montagne & Avalanche) avec dépopulation mondiale tracée.
- **Empire Tycoon Clandestin** : QG, 6 infrastructures, gains hors-ligne, sauvegarde cloud Google Play Games.

### B. Spectacle & Polish (v0.9.16 → v0.9.28)
- **PixiJS v8 + GSAP** : cinématiques WMD plein écran GPU, textes de combat flottants, haptique.
- **Bande-son sadique procédurale** : cris différenciés, verbalisation feu rouge, boing-fwump, shatter des props.
- **Célébration de victoire**, ruban de navigation villes, cockpit ergonomique, sensibilité KH-12.

### C. Qualité audiovisuelle (v0.9.29 — valeurs calibrées FIGÉES)
- **Rendu (jour)** : dirLight **1.15** / hemi **0.6** / ambient **0.3** / exposure **1.0** / fog `FogExp2(0xd8e8f8, 0.0008)` / bloom **0.28 / rayon 0.16 / seuil 1.25** / IBL dôme ciel dégradé `environmentIntensity 0.6` / `PCFShadowMap`.
- **Émissifs** : feux tricolores et dégâts SOUS le seuil de bloom (lampes ≤ 1.0, éclats 1.3–1.5 max) — toute valeur HDR > 1.25 déclenche un halo.
- **Marquage routier** : `MeshStandardMaterial` éclairé (jamais `MeshBasicMaterial` blanc pur) — reçoit lumière, ombres et brume.
- **Audio** : `SampleBank.js` charge ~90 OGG CC0 depuis `public/audio/` (interface, impact, scifi, casino, ui) avec pitch/variations et couches probabilitées ; éq « présence » (+3 dB @ 3.2 kHz, shelf +4 dB @ 2.4 kHz) ; repli synthèse procédurale si décodage impossible.
- **Monétisation** : `AdManager.ADS_ENABLED = false` (aucune pub affichée/chargée) ; architecture Google Ads + CMP RGPD conservée pour réactivation (3 lignes à décommenter) ; balise AdSense commentée dans `index.html`.

### D. Boucle de jeu (v0.9.30 → v0.9.33)
- Suppression définitive de l'accident de croisement, fumée de tir réduite, barème pièces calibré.
- Retour carte instantané à 100%, carte victoire persistante, pilule zoom dockée haut-droite, boisson énergétique (canettes limitées), contrôles tactiles bas d'écran, retour forcé compte à rebours.

---

## 10. AMBIANCE JOUR/NUIT & EFFETS DE SURFACE (v0.9.34)

### A. Mode Nuit Aléatoire (~35% des courses)
- **Tirage** : `main.js` à `START_RUN` → `this.isNightRun = Math.random() < 0.35` → `engine.applyNightAtmosphere(night)` + `traffic.setNightMode(night)` + toast `🌙 COURSE DE NUIT`.
- **Calibrage nuit (figé)** : dirLight **0.22** (`0xbfd0ff` lune froide) / ambient **0.14** (`0x8fa3c8`) / hemi **0.22** (`0x9fb8e8`/`0x1a2030`) / rim **0.55** (`0x48dbfb`) / exposure **0.95** / fog **`0x0a0f1e` densité 0.0012** / background `0x05070f` / dôme ciel `0x0a1030`→`0x151d33` / nuages ardoise `0x39415c` (`SkyDome.setNight`).
- **Retour jour** : les valeurs calibrées jour de la section 9.C sont restaurées à l'identique.
- **Véhicules la nuit** (`Traffic.setNightMode`) : faisceaux opacité **0.22** (0.10 le jour), underglow 0.3, optiques avant `emissiveIntensity 1.15` / arrière 1.05.

### B. Phares de Véhicules (géométrie corrigée)
- Faisceau = `ConeGeometry(1.3, 5.6)` orienté **apex ARRIÈRE** (`rotation.x = -π/2`, position `z = 5.1`) : étroit à la lampe (z≈2.3), évasé au loin (z≈7.9). L'ancien cône de 12m orienté pointe-en-avant rendait un triangle inversé « bizarre ».

### C. Effets de Surface (main.js, boucle PLAYING)
- **Montée de trottoir** (|x| > 4.25 m, franchissement détecté) : 6 étincelles de bordure + `spawnSkidSmoke` + secousse 0.12 + `Haptic.impactLight()`.
- **Frôlement des façades** (|x| > 5.45 m) : gerbe d'étincelles continue côté mur (throttle 55 ms), grincement ~22%, secousse 0.05.
- **Ralentisseur** : poussière latérale triple au contact + secousse `0.1 + vitesse/60` (avant le gros shake Air Time existant).

---

## 11. RÉTENTION, IDENTITÉ & CONTENU (v0.9.35)

### A. Missions Quotidiennes & Calendrier de Connexion
- **`DailyMissions.js`** : 15 missions pool, 3 tirées par jour (sélection déterministe par date), progression par type, récompenses en pièces, panneau UI sur le splash avec boutons RÉCLAMER.
- **Abonnement** aux événements `gameState` : `kill_updated`, `score_updated` (combo, near-miss, pièces), `nitro_activated`, `run_ended`.
- **Calendrier 7 jours** : streak avec récompenses croissantes (20→250 pièces, bonus nitro J3, booster J7), reset si jour manqué, claim automatique au lancement avec toast.
- **Combo « Risk it all »** : timer de décroissance accélère à chaque kill (3.8s → plancher 2.0s), récupération au reset.

### B. Logo & Identité Visuelle
- **`public/logo.svg`** (512×512) : moto de guerre stylisée + onde de choc + étincelles radiales + titre arcade ; intégré au splash (`game-logo-img`) et favicon dans `index.html`.

### C. Nouvelles Villes Différenciées
- **Reykjavik 🇮🇸** (glace/neige, brouillard épais, route droite, trafic faible), **Rio 🇧🇷** (tropical, soleil éclatant, route sinueuse, trafic dense), **Route 66 🇺🇸** (désert, ligne droite infinie, poussière).
- **Champs optionnels** `trafficDensity`, `fogDensity`, `roadStraight`, `propsSet`, `elevation` dans le schéma cityDef ; consommés par `getRoadCenterX` et `applyCityAtmosphere`.

### D. Rééquilibrage du Score
- Cibles et seuils d'étoiles ×1.25, quotas de kills ×1.5, points par piéton ×0.7, conduite 1.6→1.0, near-miss 75→50, air time 150+8→100+5. Le score n'est plus triviallement atteignable.







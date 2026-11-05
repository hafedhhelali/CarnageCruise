# 🏍️ MOTORMAGEDDON : TOUR DE FRANCE ARCADE 3D
## DOCUMENT TECHNIQUE DE TRANSMISSION STUDIO (HANDOFF)

Ce document fournit l'ensemble des informations de conception, d'architecture logicielle, de déploiement et d'extension pour **Motormageddon**.

---

## 1. VISION DU PROJET & SPÉCIFICATIONS

- **Genre** : Jeu de course d'arcade urbain / Runner 3D burlesque
- **Plateforme cible** : Android (Smartphones & Tablettes) + WebGL Mobile/Desktop
- **Direction artistique** : Cartoon 3D éclatant, physique burlesque (slapstick), animations hilarantes et dynamiques, identité française affirmée.
- **Moteur & Technologies** :
  - **Moteur 3D** : Three.js (WebGL Toon/Gouraud optimisé mobile)
  - **Packaging Android** : Capacitor 8.6 + Android Gradle Plugin + Java 17 (SDK 36 / Android 15/14/13/12+)
  - **Moteur Audio** : Synthétiseur procédural WebAudio API haute fidélité avec gestion mémoire et cycle de vie Android strict (Background/Pause/Exit/Resume)
  - **Build Tooling** : Vite + Gradle Wrapper + GitHub Actions CI/CD (génération automatique d'APK à chaque push)

---

## 2. ARBORESCENCE DU PROJET

```text
Motormageddon/
├── .github/
│   └── workflows/
│       └── build-apk.yml          # Pipeline CI/CD GitHub Actions pour compiler et livrer l'APK
├── android/                       # Projet natif Android Studio complet
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml # Plein écran immersif, accélération matérielle, verrouillage portrait
│   │   │   ├── assets/public/     # Distribution WebGL compilée injectée dans l'APK
│   │   │   └── res/               # Icônes adaptatives personnalisées, styles, écrans de démarrage
│   │   └── build.gradle           # Configuration Gradle du module applicatif
│   ├── build.gradle               # Configuration racine du projet Android
│   ├── local.properties           # Pointeur vers le SDK Android local
│   └── gradlew / gradlew.bat      # Wrappers Gradle exécutables
├── dist/                          # Fichiers de production compilés (HTML/CSS/JS minifié)
├── scripts/
│   └── generate-icons.ps1         # Générateur haute définition des icônes de l'application
├── src/
│   ├── audio/
│   │   └── SoundManager.js        # Moteur sonore procédural (cycle de vie, libération mémoire, SFX, musique)
│   ├── core/
│   │   ├── Engine.js              # Rendu Three.js, éclairage dynamique, caméra arcade poursuite/secousse
│   │   ├── GameState.js           # Machine à états, scores, combos, seuils de déblocage des 10 villes, freinage
│   │   └── Storage.js             # Système de sauvegarde v2 (stats complètes, titres honorifiques, profil)
│   ├── entities/
│   │   ├── Bike.js                # Modélisation 3D (4 motos), pilote cartoon articulé, physique d'inclinaison, animation de chute comique et relèvement
│   │   ├── Characters.js          # Piétons (Parisien, Touriste, Papy canne, Poussette, Groupe) et catapultage
│   │   ├── Environment.js         # Générateur de ville infini avec virages sinueux, monuments et arche d'arrivée 3D
│   │   ├── Intersections.js       # Carrefours, feux tricolores réactifs, ronds-points, voitures transversales
│   │   └── Particles.js           # Fumée d'échappement, sang cartoon modéré, étincelles de crash, confettis
│   ├── ui/
│   │   ├── style.css              # Interface mobile-first cartoon & néon, carte de France SVG réaliste
│   │   └── UIManager.js           # Carte interactive, Garage, Profil, HUD avec bouton de frein, Mentions légales
│   └── main.js                    # Point d'entrée de l'application et boucle de jeu 60 FPS
├── capacitor.config.json          # Configuration du conteneur Capacitor Android
├── index.html                     # Balise mobile viewport sans zoom involontaire
├── package.json                   # Dépendances et scripts de build
├── vite.config.js                 # Configuration du bundler Vite
├── MEMORY.md                      # Mémoire active du projet
└── HANDOFF.md                     # Ce document
```

---

## 3. AMÉLIORATIONS MAJEURES RÉALISÉES

### A. Correction de la persistance sonore & Fuites mémoire (Sound Lifecycle)
- **Problème résolu** : Le son persistait en tâche de fond lors de la minimisation de l'application ou lors de la sortie.
- **Solution technique** :
  - Intégration de `@capacitor/app` avec écoute native des événements `appStateChange`, `pause`, `resume`.
  - Écouteurs `document.visibilitychange`, `window.pagehide`, `window.beforeunload`.
  - Suspension immédiate du contexte WebAudio (`AudioContext.suspend()`) lors de la mise en arrière-plan.
  - Déconnexion systématique de tous les nœuds audio éphémères (`osc.disconnect()`, `gain.disconnect()`) via `osc.onended` pour garantir le garbage collection par le moteur V8 / Android WebView.
  - Méthode `destroy()` appelée avant `App.exitApp()`, fermant le contexte audio (`ctx.close()`) et annulant les boucles de timers.

### B. Système de Freinage Complet (Arrêt & Reprise)
- Bouton HUD tactile "FREIN" et touches clavier (Flèche Bas / Touche S).
- Décélération fluide jusqu'à 0 km/h avec allumage des feux stop.
- Au point mort (0 km/h), le moteur tourne au ralenti discret, la circulation et les piétons continuent d'évoluer, et la moto peut repartir instantanément dès le relâchement du frein.

### C. Rues & Avenues Sinueuses (Virages Gauche / Droite)
- Courbure mathématique procédurale (`getRoadCenterX` et `getRoadAngle`).
- La moto, les décors, les carrefours, l'arche d'arrivée et les piétons s'alignent dynamiquement sur la trajectoire courbe de la chaussée.
- La caméra de poursuite anticipe l'angle du virage pour une sensation de conduite arcade immersive.

### D. Carrefours, Ronds-points & Feux Rouges Grillés
- Apparition périodique de carrefours urbains et ronds-points avec pelouse et fontaine.
- Feux de circulation tricolores qui passent au rouge à l'approche de la moto.
- En cas de franchissement du feu rouge : déclenchement d'un véhicule transversal (taxi, camionnette, citadine) percutant le motard.
- **Animation de chute et relèvement comique** :
  1. Glissade burlesque sur le flanc.
  2. Le pilote s'assied et secoue comiquement la tête (effet étourdi).
  3. Rebond élastique, la moto se redresse et repart avec 2 secondes d'immunité clignotante.

### E. Nouveaux Piétons & Effet de Sang Cartoon Modéré
- Ajout de :
  - **Papy et sa canne** (+160 pts)
  - **Parent et sa poussette** (+240 pts)
  - **Groupe de flâneurs** (+300 pts)
- Éjection aérienne équilibrée (4,5 à 6 mètres de haut) avec quelques gouttelettes et une discrète marque au sol rouge cartoon.

### F. Ligne d'Arrivée 3D & Célébration
- Arche métallique tridimensionnelle avec banderole à damier, drapeaux tricolores français et oriflammes.
- Franchissement déclenchant une pluie de confettis multicolores, fanfare de victoire et transition vers l'écran de résultats.

### G. 10 Villes Françaises & Carte Réaliste
- Paris, Lyon, Marseille, Chamonix, Annecy, Millau, Nice, Bordeaux, Saint-Malo, Strasbourg.
- Carte SVG réaliste avec reliefs, contours côtiers et zoom cinématique d'entrée.

### H. Identité Visuelle, Icône de l'Application & Mentions Légales
- Génération d'icônes haute définition pour toutes les résolutions Android (`mipmap-mdpi` à `mipmap-xxxhdpi`) avec casque arcade, ruban tricolore et emblème "M".
- Section Mentions Légales et copyright : **© 2026 EOMedia. Tous droits réservés.**

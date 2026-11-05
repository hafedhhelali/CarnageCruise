# 🏍️ MOTORMAGEDDON : TOUR DE FRANCE ARCADE 3D
## DOCUMENT TECHNIQUE DE TRANSMISSION STUDIO (HANDOFF)

Ce document fournit l'ensemble des informations de conception, d'architecture logicielle, de déploiement et d'extension pour **Motormageddon**.

---

## 1. VISION DU PROJET & SPÉCIFICATIONS

- **Genre** : Jeu de course d'arcade urbain / Runner 3D humoristique
- **Plateforme cible** : Android (Smartphones & Tablettes) + WebGL Mobile/Desktop
- **Direction artistique** : Cartoon 3D éclatant, physique burlesque (slapstick), animations exagérées, identité française affirmée.
- **Moteur & Technologies** :
  - **Moteur 3D** : Three.js (WebGL / WebGPU-ready, shaders Toon/Gouraud optimisés mobiles)
  - **Packaging Android** : Capacitor 8.6 + Android Gradle Plugin + Java 17 (SDK 36 / Android 15/14/13/12+)
  - **Moteur Audio** : Synthétiseur procédural WebAudio API (zéro dépendance de fichiers lourds, réactivité moteur dynamique en temps réel)
  - **Build Tooling** : Vite + Gradle Wrapper + GitHub Actions CI/CD

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
│   │   │   └── res/               # Icônes adaptatives, styles, écrans de démarrage
│   │   └── build.gradle           # Configuration Gradle du module applicatif
│   ├── build.gradle               # Configuration racine du projet Android
│   ├── local.properties           # Pointeur vers le SDK Android local
│   └── gradlew / gradlew.bat      # Wrappers Gradle exécutables
├── dist/                          # Fichiers de production compilés (HTML/CSS/JS minifié)
├── src/
│   ├── audio/
│   │   └── SoundManager.js        # Moteur sonore procédural (bruit moteur réactif, SFX cartoon, musique)
│   ├── core/
│   │   ├── Engine.js              # Rendu Three.js, éclairage dynamique, caméra arcade poursuite/secousse
│   │   ├── GameState.js           # Machine à états, scores, combos, seuils de déblocage des villes
│   │   └── Storage.js             # Système de sauvegarde persistant (LocalStorage / IndexedDB / Android)
│   ├── entities/
│   │   ├── Bike.js                # Modélisation 3D (4 motos), pilote cartoon articulé, physique d'inclinaison
│   │   ├── Characters.js          # Librairie de piétons (6 archétypes) et catapultage slapstick
│   │   ├── Environment.js         # Générateur de ville procédural infini (Paris, Lyon, Marseille, Nice, Bordeaux...)
│   │   └── Particles.js           # Fumée d'échappement, étoiles burlesques, pièces de monnaie, vitesse
│   ├── ui/
│   │   ├── style.css              # Interface mobile-first néon & cartoon (100vw/100vh)
│   │   └── UIManager.js           # Écran titre, Carte de France, Garage, HUD, Modales Pause/Résultats
│   └── main.js                    # Point d'entrée de l'application et boucle de jeu 60 FPS
├── capacitor.config.json          # Configuration du conteneur Capacitor Android
├── index.html                     # Balise mobile viewport sans zoom involontaire
├── package.json                   # Dépendances et scripts de build
├── vite.config.js                 # Configuration du bundler Vite
└── HANDOFF.md                     # Ce document
```

---

## 3. SYSTÈMES DE GAMEPLAY

### A. Pilotage de la Moto & Physique Arcade
- **Contrôles tactiles** :
  - Glissement horizontal continu du doigt sur l'écran pour diriger la moto de gauche à droite.
  - Détection automatique clavier (`Q`/`A`/`Flèche Gauche` & `D`/`Flèche Droite`) pour tests rapides.
- **Dynamique du véhicule** :
  - La moto s'incline jusqu'à 25° dans les virages proportionnellement au braquage.
  - La fourche avant tourne avec le guidon.
  - Les suspensions réagissent aux micro-aspérités de la chaussée.
  - Le pilote compense l'inclinaison et tourne la tête vers la direction de course.
  - Les roues avant et arrière tournent selon la vitesse réelle de déplacement.

### B. Collisions Burlesques (Slapstick Cartoon)
- **Non-violence** : Toutes les collisions sont traitées comme des sketches de dessin animé comique.
- **Physique d'éjection** :
  - Impulsion verticale haute (`flyVelY: 12 à 19 m/s`).
  - Vrilles et rotations acrobatiques tridimensionnelles.
  - Les personnages écartent les bras et les jambes de stupeur.
  - Projection de pièces d'or et d'étoiles dorées tournoyantes.
  - Secousse de caméra arcade (`Engine.triggerCameraShake`).

### C. Bibliothèque de Personnages
1. **Le Parisien Pressé** : Costume élégant, béret noir, baguette sous le bras (+150 pts).
2. **Le Touriste Égaré** : Chemise hawaïenne corail, bob de soleil, appareil photo (+120 pts).
3. **Le Trader en Retard** : Costume sombre, cravate flottante, mallette en cuir (+180 pts).
4. **Le Jogger Fluo** : Tenue néon cyan/magenta, bandeau éponge, foulée rapide (+200 pts).
5. **Le Garçon de Café** : Chemise blanche, tablier noir, plateau garni d'une tasse (+220 pts).
6. **Mamie et son Caddie** : Gilet pastel, chignon argenté, caddie à roulettes (+140 pts).

### D. Multiplicateurs & Combos
- Enchaîner des interactions dans un délai de 3,5 secondes fait grimper le multiplicateur (x1 jusqu'à x10).
- Des titres de combo humoristiques s'affichent : *"PAS MAL !"*, *"OUH LÀ LÀ !"*, *"STRIKE DE BAGUETTE !"*, *"C'EST LA PANURGE !"*.
- Les pièces collectées permettent de débloquer de nouveaux bolides au Garage.

---

## 4. LES VILLES ET ENVIRONNEMENTS

Chaque ville dispose d'une identité propre (couleurs du ciel, brouillard, teintes architecturales, monuments lointains) :
- **Paris** : Façades en pierre de taille haussmanniennes, toits mansardés en zinc/ardoise, terrasses de bistrot avec parasols rouges, boîtes aux lettres jaunes La Poste, et Tour Eiffel sur l'horizon.
- **Lyon** : Façades ocres et rouges chaudes, ruelles pavées stylisées, lanternes traditionnelles.
- **Marseille** : Façades pastel ensoleillées, mer azur, voiliers en arrière-plan, palmiers et ambiance méditerranéenne.
- **Nice** : Style Promenade des Anglais, rangées de palmiers côtiers, ciel bleu azur intense.
- **Bordeaux** : Architecture néoclassique élégante, pierres blondes, arches monumentales.
- **Strasbourg** : Maisons traditionnelles à colombages, toits pointus en tuiles rouges.

Le monde est généré par un système de **chunks modulaires de 60 mètres** recyclés en boucle devant le joueur, assurant une consommation mémoire constante et 60 FPS garantis.

---

## 5. LE GARAGE

Quatre motos uniques modélisées en 3D avec caractéristiques distinctes :
1. **La Guêpe 50cc** : Scooter rétro italien/français vintage. Agile (Maniabilité 5/5), vitesse modérée (3/5). Débloqué d'office.
2. **Foudre Noire 1000** : Superbike carénée, double optique avant, double échappement racing. Vitesse maximale (5/5). Coût : 800 pièces.
3. **Le Chopper Paname** : Guidon Ape-Hanger haut, grand empattement avant, moteur V-Twin chromé. Vitesse 4/5, style cruiser inimitable. Coût : 1500 pièces.
4. **Le Trike Turbo** : Bolide à 3 roues avec train arrière élargi et spoiler massif. Stabilité et puissance (4/5). Coût : 2500 pièces.

Le joueur peut repeindre sa moto en temps réel grâce à la palette de couleurs (Rouge Vif, Bleu Azur, Jaune Soleil, Vert Émeraude, Violet Néon, etc.).

---

## 6. SAUVEGARDE ET PERSISTANCE

Le module `src/core/Storage.js` gère la persistance automatique locale :
- Villes débloquées et progression par étape.
- Meilleurs scores et étoiles (1 à 3 étoiles par ville).
- Pièces accumulées.
- Moto actuellement équipée et couleur personnalisée choisie.
- Préférences audio (SFX / Musique).

La sauvegarde est immédiatement synchronisée dans le stockage persistant à chaque fin de course ou achat au garage.

---

## 7. MOTEUR SONORE PROCÉDURAL (WEBAUDIO)

Au lieu de charger des fichiers MP3 volumineux susceptibles d'échouer ou de ralentir le chargement mobile, `src/audio/SoundManager.js` génère les sons dynamiquement par synthèse sonore native :
- **Son du moteur** : Oscillateur en dent de scie filtré par passe-bas, dont la fréquence fondamentale s'accélère dynamiquement selon la vitesse de la moto (de 65 Hz à 190 Hz).
- **SFX Cartoon Boing** : Modulation exponentielle de fréquence pour les collisions burlesques.
- **SFX Pièces & Combo** : Carillons harmoniques étincelants.
- **Klaxon bi-ton** : Sonorité rétro italienne activable par bouton dédié.
- **Musique Arcade Énergique** : Séquenceur d'accords pop-arcade à 132 BPM avec ligne de basse synthétique, lead enjoué et percussions hi-hat.

---

## 8. INSTRUCTIONS DE COMPILATION ET DÉPLOIEMENT

### A. Lancement en Développement Local
```bash
# Installer les dépendances
npm install

# Démarrer le serveur local de test
npm run dev
```

### B. Compilation du Bundle WebGL
```bash
npm run build
```

### C. Synchronisation avec Android
```bash
npx cap sync android
```

### D. Compilation de l'APK Android (Debug)
```bash
cd android
./gradlew assembleDebug --no-daemon
```
L'APK installable se trouve dans :
`android/app/build/outputs/apk/debug/app-debug.apk`.

### E. Compilation Automatique via GitHub Actions
- **Dépôt GitHub** : [https://github.com/hafedhhelali/Motormageddon](https://github.com/hafedhhelali/Motormageddon)
- **Pipeline CI/CD Actions** : [https://github.com/hafedhhelali/Motormageddon/actions](https://github.com/hafedhhelali/Motormageddon/actions)
Le dépôt contient le workflow `.github/workflows/build-apk.yml`.
À chaque `git push` sur `main` ou création d'un tag `v*` (ou lancement manuel dans l'onglet Actions), GitHub compile automatiquement l'APK Android et le publie dans les artefacts téléchargeables et la page Releases.

---

## 9. GUIDE D'EXTENSION DU JEU

### Ajouter une nouvelle ville
Ouvrir `src/core/GameState.js` et ajouter un objet dans le tableau `CITIES` :
```javascript
{
  id: 'toulouse',
  name: 'Toulouse',
  subtitle: 'La Ville Rose',
  description: 'Briques roses, places animées et accent chantant !',
  targetScore: 20000,
  starThresholds: [20000, 32000, 50000],
  unlockScoreRequired: 16000,
  skyColor: 0xffab91,
  fogColor: 0xfbe9e7,
  ambientColor: 0xffffff,
  roadColor: 0x3e2723,
  buildingColors: [0xff8a65, 0xd84315, 0xffab91],
  roofColor: 0xbf360c,
  accentColor: 0xff7043,
  unlockedByDefault: false,
  mapCoords: { x: 44, y: 76 }
}
```

### Ajouter une nouvelle moto
1. Déclarer la moto dans `BIKES` dans `src/core/GameState.js`.
2. Implémenter la géométrie 3D correspondante dans `src/entities/Bike.js` sous une méthode dédiée (ex: `buildCustomRacer()`).

---

**Équipe de développement Motormageddon Studio AAA**
*Projet livré avec code source complet, documentation technique, projet Android natif et pipeline GitHub Actions.*

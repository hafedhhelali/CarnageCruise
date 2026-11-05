# 🏍️ MOTORMAGEDDON : TOUR DE FRANCE ARCADE 3D
## DOCUMENT TECHNIQUE DE TRANSMISSION STUDIO (HANDOFF)

Ce document fournit l'ensemble des informations de conception, d'architecture logicielle, de déploiement et de versionnage pour **Motormageddon**.

---

## 1. VISION DU PROJET & SPÉCIFICATIONS

- **Genre** : Jeu de course d'arcade urbain / Runner 3D burlesque
- **Version actuelle** : **1.2.0-beta** (Build / versionCode 3 - Canal BETA)
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
- Pipeline CI/CD renforcé : extraction automatique de la version et du canal depuis `version.json` via Node.js dans l'environnement GitHub Actions.
- Nom d'artefact GitHub dynamique : `Motormageddon-v${APP_VERSION}-b${VERSION_CODE}-APK` (ex: `Motormageddon-v1.2.0-beta-b3-APK`).
- Pre-release GitHub Release automatique étiquetée **[BETA]** avec `prerelease: true`.
- Badge BETA élégant affiché sur le Splash Screen et dans les mentions légales de l'application.
- `versionCode` : 3, `versionName` : 1.2.0-beta, nom d'APK généré : `Motormageddon-v1.2.0-beta-b3-debug.apk`.
- Scripts d'incrémentation : `npm run version:patch`, `version:minor`, `version:major` (gérant automatiquement le suffixe `-beta`).

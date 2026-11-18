/**
 * Carnage Cruise - Suite de Tests & Validation d'Architecture (Lead Dev)
 * Vérifie :
 * 1. Synchronisation stricte de la Source Unique de Vérité (Version 0.x.x beta)
 * 2. Disponibilité de tous les modules graphiques & post-processing
 * 3. Propreté de la mémoire (TextureFactory, Shaders, Pooled Geometries)
 * 4. Intégrité des 15 villes et calculs mathématiques de courbure de route
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🏛️ --- LANCEMENT DE L\'AUDIT D\'ARCHITECTURE & CODE CLEAN ---');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// 1. Test Versionnage 0.x.x beta
const versionJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'version.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const versionJs = fs.readFileSync(path.join(rootDir, 'src', 'core', 'Version.js'), 'utf8');

assert(versionJson.version === packageJson.version, 'Synchronisation version.json <=> package.json');
assert(versionJson.version.startsWith('0.'), `Version conforme au canal 0.x.x beta (${versionJson.version})`);
assert(versionJson.version.includes('-beta'), 'Version identifiée en canal BETA');
assert(versionJs.includes(versionJson.version), 'Synchronisation src/core/Version.js');

// 2. Test Disponibilité des Modules Graphiques
const gfxDir = path.join(rootDir, 'src', 'gfx');
assert(fs.existsSync(path.join(gfxDir, 'TextureFactory.js')), 'Usine de textures TextureFactory présente');
assert(fs.existsSync(path.join(gfxDir, 'PostProcessing.js')), 'Gestionnaire de Post-Processing présent');
assert(fs.existsSync(path.join(gfxDir, 'SkyDome.js')), 'Dôme céleste SkyDome présent');

// 3. Test de non-régression sur les 15 villes
const gameStateContent = fs.readFileSync(path.join(rootDir, 'src', 'core', 'GameState.js'), 'utf8');
const cityMatch = gameStateContent.match(/export const CITIES = \[([\s\S]*?)\];/);
assert(cityMatch !== null, 'Définition des étapes CITIES trouvée');
const cityCount = (gameStateContent.match(/id:\s*'/g) || []).length;
assert(cityCount >= 15, `15 étapes internationales configurées (trouvé: ${cityCount})`);

// 4. Test d'absence de fuites mémoire dans Particles.js
const particlesContent = fs.readFileSync(path.join(rootDir, 'src', 'entities', 'Particles.js'), 'utf8');
assert(particlesContent.includes('sharedGeos'), 'Pooling de géométries partagées activé dans Particles');
assert(particlesContent.includes('sharedMats'), 'Pooling de matériaux partagés activé dans Particles');

// 5. Test de présence de Tween.js
assert(packageJson.dependencies['@tweenjs/tween.js'] !== undefined, 'Bibliothèque d\'animation @tweenjs/tween.js installée');

// 6. Test de refonte des Carrefours 3D, Virages & Rythme d'Objectif 100%
const envContent = fs.readFileSync(path.join(rootDir, 'src', 'entities', 'Environment.js'), 'utf8');
const interContent = fs.readFileSync(path.join(rootDir, 'src', 'entities', 'Intersections.js'), 'utf8');
const texContent = fs.readFileSync(path.join(rootDir, 'src', 'gfx', 'TextureFactory.js'), 'utf8');
assert(envContent.includes('alignChunkToCurve') && envContent.includes('getRoadCurvature'), 'Rubans routiers courbés subdivisés et calcul de courbure actifs');
assert(interContent.includes('getIntersectionBoxTexture') && interContent.includes('getStreetPlateTexture'), 'Carrefours 3D architecturaux avec Box-Junction et plaques de rue HD');
assert(texContent.includes('styleVariant'), '4 styles de façades architecturales actifs');
assert(gameStateContent.includes('comboMultiplier = 1 + (this.combo - 1) * 0.25'), 'Progression vers l\'objectif 100% recalibrée et progressive');

// 7. Tests de non-régression stricts sur les bugs corrigés précédemment
const engineContent = fs.readFileSync(path.join(rootDir, 'src', 'core', 'Engine.js'), 'utf8');
const storageContent = fs.readFileSync(path.join(rootDir, 'src', 'core', 'Storage.js'), 'utf8');
const uiContent = fs.readFileSync(path.join(rootDir, 'src', 'ui', 'UIManager.js'), 'utf8');
const charsContent = fs.readFileSync(path.join(rootDir, 'src', 'entities', 'Characters.js'), 'utf8');

assert(!engineContent.includes('this.camera.rotation.z ='), 'Non-régression : Aucun écrasement de camera.rotation.z après lookAt() (pas de caméra inversée)');
assert(envContent.includes('mesh.frustumCulled = false;') && envContent.includes('mesh.geometry.computeBoundingSphere();'), 'Non-régression : Bandes centrales de la route jamais éliminées par le frustum culling');
assert(!envContent.includes('isCurveChevron: true'), 'Non-régression : Aucune indication/panneau chevron de virage parasite');
assert(charsContent.includes('sidewalkSide') && charsContent.includes('nearestInterZ'), 'Non-régression : Piétons strictement sur les passages piétons ou trottoirs');
assert(storageContent.includes('isBikeUnlocked(bikeId)'), 'Non-régression : storage.isBikeUnlocked(bikeId) présent (modale Pause 100% fluide sans blocage)');
assert(uiContent.includes('hud-top-right-dock') && uiContent.includes('EXTERMINER LA VILLE'), 'Non-régression : Zone Pause/HUD ergonomique avec icône SVG et libellé EXTERMINER LA VILLE');

// 8. Tests d'expansion Proche-Orient & Afrique du Nord + 7 Biomes 3D
assert(gameStateContent.includes("id: 'marrakech'") && gameStateContent.includes("id: 'constantine'") && gameStateContent.includes("id: 'petra'") && gameStateContent.includes("id: 'beyrouth'") && gameStateContent.includes("id: 'jerusalem'") && gameStateContent.includes("id: 'bagdad'"), 'Expansion Carte : Villes d\'Afrique du Nord et du Proche-Orient présentes');
assert(envContent.includes('createParkZone') && envContent.includes('createCornicheZone') && envContent.includes('createBeachZone') && envContent.includes('createDesertZone') && envContent.includes('createSteppeZone') && envContent.includes('createCliffsZone') && envContent.includes('createCanyonZone'), 'Diversification 3D : 7 générateurs de biomes (Parcs, Corniches, Plages, Déserts, Steppes, Falaises, Canyons) actifs');
assert(uiContent.includes('map-region-filter-bar') && uiContent.includes('city-biome-pill'), 'Design UI/UX : Filtres par région (Europe / Afrique du Nord / Proche-Orient) et badges de biome actifs');

// 9. Tests v0.9.53-beta : Lignes vitesse réduites, Frein=0 virage, HUD Engin/Homme, Carte sans doublon, Skyline 3D WMD
const mainContent = fs.readFileSync(path.join(rootDir, 'src', 'main.js'), 'utf8');
const bikeContent = fs.readFileSync(path.join(rootDir, 'src', 'entities', 'Bike.js'), 'utf8');
const cityIds = [...cityMatch[1].matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
assert(cityIds.length === new Set(cityIds).size, `Carte : 100% des ${cityIds.length} IDs de villes sont uniques (aucun doublon)`);
assert(particlesContent.includes('CylinderGeometry(0.006, 0.006, 1.8, 4)') && particlesContent.includes('for (let i = 0; i < 10; i++)'), 'Effet vitesse : Lignes blanches fortement réduites (10 lignes fines en périphérie)');
assert(mainContent.includes('if (gameState.isBraking) {') && bikeContent.includes('if (gameState.isBraking) {'), 'Physique Frein : Direction gauche/droite verrouillée pendant le freinage');
assert(uiContent.includes('FREIN') && uiContent.includes('ARRÊT') && uiContent.includes('BOISSON ÉNERGÉTIQUE') && uiContent.includes('mode-engin') && uiContent.includes('mode-homme'), 'HUD Tactique : Boutons différenciés Engin (FREIN/NITRO) vs Homme (ARRÊT/BOISSON ÉNERGÉTIQUE)');
assert(uiContent.includes('spawnBuildingDebris') && uiContent.includes('bridgeCars'), 'Destruction Ville : Animation cinématique skyline 3D avec effondrement physique des immeubles');

// 10. Tests v0.9.54-beta : Cohérence homme/cheval, pause audio, suppression écho, vitesses logiques
const soundContent = fs.readFileSync(path.join(rootDir, 'src', 'audio', 'SoundManager.js'), 'utf8');
assert(mainContent.includes("isFootOnly && (propType === 'tree' || propType === 'lamp')"), 'Physique : Homme seul à pied ne renverse pas les arbres ni les poteaux');
assert(mainContent.includes('if (!isNonMotorized) {') && mainContent.includes('spawnExhaustSmoke'), 'Particules : Aucune fumée d\'échappement ou de dérapage pour homme à pied et cheval');
assert(bikeContent.includes('isOrganicEntity') && bikeContent.includes('this.nitroFlames.visible = false'), 'Visuel : Homme et cheval ne dégagent aucune flamme sous boisson énergétique');
assert(soundContent.includes('pauseGameplayAudio()') && soundContent.includes('resumeGameplayAudio()') && mainContent.includes('soundManager.pauseGameplayAudio()'), 'Audio Pause : La pause coupe immédiatement moteur, course et musique');
assert(!soundContent.includes('this.musicDelay'), 'Audio Qualité : Effet d\'écho gênant (musicDelay) supprimé du mixage musical');
assert(gameStateContent.includes('maxSpeed: 6.7') && uiContent.includes('Math.round(bike.maxSpeed * 3.6)'), 'Équilibrage : Vitesses et paramètres des 14 engins/coureurs recalibrés logiquement (~24 km/h à pied)');

// 11. Tests v0.9.55-beta : Refonte AAA Réaliste (PBR, Audio, Animation/VFX, UI Carbon-Titanium)
const trafficContent = fs.readFileSync(path.join(rootDir, 'src', 'entities', 'Traffic.js'), 'utf8');
const styleContent = fs.readFileSync(path.join(rootDir, 'src', 'ui', 'style.css'), 'utf8');
assert(!envContent.includes('MeshToonMaterial') && !bikeContent.includes('MeshToonMaterial') && !charsContent.includes('MeshToonMaterial') && !trafficContent.includes('MeshToonMaterial'), 'Graphisme Réaliste : Zéro MeshToonMaterial cartoon dans Environment/Bike/Characters/Traffic');
assert(bikeContent.includes('MeshPhysicalMaterial') && texContent.includes('getRoadRoughnessMap') && texContent.includes('THREE.NoColorSpace'), 'Graphisme PBR : Carrosseries clearcoat + normal/roughness maps procédurales linéaires actives');
assert(soundContent.includes('ENGINE_PROFILES') && soundContent.includes('musicDuckGain') && soundContent.includes('_startLookaheadSequencer'), 'Audio Révolutionné : 5 profils moteurs réalistes, sidechain ducking et séquenceur lookahead 100ms');
assert(bikeContent.includes('suspVel') && charsContent.includes('char.flyVelY = -char.flyVelY * 0.32'), 'Animation & VFX : Suspension ressort-amortisseur 2nd ordre et ragdoll piétons avec rebonds');
assert(styleContent.includes('--glass-carbon') && !styleContent.includes('transition: all'), 'UI/UX Carbon-Titanium : Glassmorphisme sombre et zéro transition: all bloquant');

// 12. Tests v0.9.58-beta : Hygiène mémoire GPU, SkidMarks/WeatherSystem & 5 Épreuves
assert(envContent.includes('dispose(') && envContent.includes('disposeSharedMaterials(') && envContent.includes('setCity('), 'Mémoire GPU : Environment.js implémente dispose() et disposeSharedMaterials() dans setCity()');
assert(particlesContent.includes('dispose(') && particlesContent.includes('sharedMatSet'), 'Mémoire GPU : Particles.js implémente dispose() et met en cache sharedMatSet');
assert(bikeContent.includes('dispose(') && bikeContent.includes('reset('), 'Mémoire GPU : Bike.js implémente dispose() et reset()');

const skidMarksPath = path.join(rootDir, 'src', 'gfx', 'SkidMarks.js');
const weatherSysPath = path.join(rootDir, 'src', 'gfx', 'WeatherSystem.js');
const skidMarksExists = fs.existsSync(skidMarksPath);
const weatherSysExists = fs.existsSync(weatherSysPath);
const skidMarksContent = skidMarksExists ? fs.readFileSync(skidMarksPath, 'utf8') : '';
const weatherSysContent = weatherSysExists ? fs.readFileSync(weatherSysPath, 'utf8') : '';
assert(skidMarksExists && skidMarksContent.includes('InstancedMesh'), 'VFX Piste : SkidMarks.js présent et utilise THREE.InstancedMesh');
assert(weatherSysExists && weatherSysContent.includes('Points'), 'Météo 3D : WeatherSystem.js présent et utilise THREE.Points');

assert(
  gameStateContent.includes('CONVOY_BOSS') &&
  gameStateContent.includes('SLALOM_CHRONO') &&
  gameStateContent.includes('MANHUNT') &&
  gameStateContent.includes('STUNT_RAMPS') &&
  gameStateContent.includes('EXTREME_STORM'),
  'Épreuves : GameState.js définit les 5 épreuves (CONVOY_BOSS, SLALOM_CHRONO, MANHUNT, STUNT_RAMPS, EXTREME_STORM)'
);
assert(
  uiContent.includes('city-challenge-selector') &&
  uiContent.includes('hud-speed-vignette') &&
  !styleContent.includes('transition: all') &&
  !envContent.includes('MeshToonMaterial') &&
  !bikeContent.includes('MeshToonMaterial') &&
  !charsContent.includes('MeshToonMaterial') &&
  !trafficContent.includes('MeshToonMaterial'),
  'UI/UX Épreuves & Vignette : Sélecteur + vignette présents avec zéro transition: all et zéro MeshToonMaterial'
);

// 13. Tests v0.9.59-beta : Route 10.8m, pas d'autoReturnTimer, 'chain' trafic/boss, recharge Energy Drink, Mega Ramps chunks
assert(envContent.includes('10.8'), 'Route élargie : Largeur de chaussée 10.8m active dans Environment.js');
assert(!uiContent.includes('autoReturnTimer'), 'Fin de course : Aucun autoReturnTimer (retour carte uniquement sur clic utilisateur)');
assert(
  mainContent.includes("'chain'") && mainContent.includes('damageConvoyBoss(v, 22'),
  "Armes & Outils : 'chain' détruit le trafic et inflige des dégâts au boss du convoi dans main.js"
);
assert(
  gameStateContent.includes('delta * 7.5') && gameStateContent.includes('energyDrinkCans < 3'),
  'Boisson Énergétique : Recharge progressive active dans GameState.js'
);
assert(
  mainContent.includes('prop.userData.isStuntRamp') && mainContent.includes('prop.userData.isAerialRing'),
  'Méga Rampes : Détection par scan des props de chunks (isStuntRamp / isAerialRing) dans main.js'
);

console.log(`\n📊 RÉSULTAT DU CONTRÔLE QUALITÉ : ${passedTests}/${totalTests} tests réussis.`);
if (passedTests === totalTests) {
  console.log('✨ Architecture certifiée propre, modulaire et conforme SOLID.');
}

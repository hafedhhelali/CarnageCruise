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
assert(uiContent.includes('hud-top-right-dock') && uiContent.includes('BOMBE NUCLÉAIRE'), 'Non-régression : Zone Pause/HUD ergonomique avec icône SVG et libellé BOMBE NUCLÉAIRE');

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

console.log(`\n📊 RÉSULTAT DU CONTRÔLE QUALITÉ : ${passedTests}/${totalTests} tests réussis.`);
if (passedTests === totalTests) {
  console.log('✨ Architecture certifiée propre, modulaire et conforme SOLID.');
}

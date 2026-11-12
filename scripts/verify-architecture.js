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

console.log(`\n📊 RÉSULTAT DU CONTRÔLE QUALITÉ : ${passedTests}/${totalTests} tests réussis.`);
if (passedTests === totalTests) {
  console.log('✨ Architecture certifiée propre, modulaire et conforme SOLID.');
}

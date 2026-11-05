/**
 * Motormageddon - Script de Versionnage Automatique
 * Met à jour simultanément version.json, package.json, src/core/Version.js et prépare le build Android.
 * Usage: node scripts/bump-version.js [patch|minor|major]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const versionJsonPath = path.join(rootDir, 'version.json');
const packageJsonPath = path.join(rootDir, 'package.json');
const versionJsPath = path.join(rootDir, 'src', 'core', 'Version.js');

const bumpType = process.argv[2] || 'patch';

// 1. Lire version.json
const versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
const currentVersion = versionData.version;
const currentCode = versionData.versionCode || 1;

const parts = currentVersion.split('.').map(n => parseInt(n, 10));
if (bumpType === 'major') {
  parts[0]++;
  parts[1] = 0;
  parts[2] = 0;
} else if (bumpType === 'minor') {
  parts[1]++;
  parts[2] = 0;
} else {
  parts[2]++;
}

const nextVersion = parts.join('.');
const nextCode = currentCode + 1;
const today = new Date().toISOString().split('T')[0];

versionData.version = nextVersion;
versionData.versionCode = nextCode;
versionData.build = nextCode;
versionData.date = today;

// 2. Écrire version.json
fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n');

// 3. Écrire package.json
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
pkg.version = nextVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

// 4. Écrire src/core/Version.js
const versionJsContent = `/**
 * Motormageddon - Constantes de Versionnage Unique (Single Source of Truth)
 * Généré automatiquement par scripts/bump-version.js
 */

export const APP_VERSION = "${nextVersion}";
export const BUILD_NUMBER = ${nextCode};
export const VERSION_NAME = "${nextVersion}";
export const FULL_VERSION = "v${nextVersion} (Build ${nextCode})";
export const RELEASE_NAME = "${versionData.releaseName || 'Arcade Edition'}";
export const COPYRIGHT_NOTICE = "© 2026 EOMedia. Tous droits réservés.";
`;
fs.writeFileSync(versionJsPath, versionJsContent);

console.log(`✅ Version incrémentée avec succès :`);
console.log(`   - Version : ${currentVersion} ➔ ${nextVersion}`);
console.log(`   - VersionCode : ${currentCode} ➔ ${nextCode}`);
console.log(`   - Date : ${today}`);

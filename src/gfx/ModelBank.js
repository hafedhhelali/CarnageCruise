/**
 * Carnage Cruise - Banque de Modèles 3D GLTF/GLB (CC0)
 * Précharge, normalise et met en cache les 13 modèles GLB pour clonage instantané.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const MODEL_KEYS = [
  'building-garage',
  'building-small-a',
  'building-small-b',
  'building-small-c',
  'building-small-d',
  'grass-trees-tall',
  'grass-trees',
  'pavement-fountain',
  'vehicle-motorcycle',
  'vehicle-truck-green',
  'vehicle-truck-purple',
  'vehicle-truck-red',
  'vehicle-truck-yellow'
];

export class ModelBank {
  constructor() {
    this._loader = new GLTFLoader();
    this._cache = new Map();
    this._pending = new Map();
    this._preloadPromise = null;
  }

  _getBaseUrl() {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) {
      return import.meta.env.BASE_URL;
    }
    return '/';
  }

  /**
   * Normalise un modèle chargé :
   * - Centre X et Z à 0, aligne box.min.y sur 0
   * - Calcule et stocke baseSize
   * - Active castShadow/receiveShadow et envMapIntensity = 1.2
   * - Marque meshes, géométries et matériaux avec userData.isSharedModelBank = true
   */
  _normalizeModel(sceneRoot) {
    sceneRoot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(sceneRoot);
    const center = box.getCenter(new THREE.Vector3());
    const baseSize = box.getSize(new THREE.Vector3());

    // Protéger contre les axes dégénérés
    baseSize.x = Math.max(baseSize.x, 1e-4);
    baseSize.y = Math.max(baseSize.y, 1e-4);
    baseSize.z = Math.max(baseSize.z, 1e-4);

    // Recentrer X/Z et poser la base à Y = 0 dans un groupe conteneur propre
    sceneRoot.position.x -= center.x;
    sceneRoot.position.y -= box.min.y;
    sceneRoot.position.z -= center.z;

    const normalizedGroup = new THREE.Group();
    normalizedGroup.userData.isSharedModelBank = true;
    normalizedGroup.add(sceneRoot);

    normalizedGroup.traverse((node) => {
      node.userData.isSharedModelBank = true;
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.geometry) {
          node.geometry.userData = node.geometry.userData || {};
          node.geometry.userData.isSharedModelBank = true;
        }
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const mat of materials) {
          if (!mat) continue;
          mat.userData = mat.userData || {};
          mat.userData.isSharedModelBank = true;
          if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
            const lowerName = (node.name || '').toLowerCase();
            if (lowerName.includes('wheel') || lowerName.includes('tire') || lowerName.includes('underside')) {
              mat.roughness = 0.88;
              mat.metalness = 0.05;
              mat.envMapIntensity = 0.65;
            } else {
              mat.roughness = Math.min(mat.roughness ?? 0.35, 0.32);
              mat.metalness = Math.max(mat.metalness ?? 0.2, 0.35);
              mat.envMapIntensity = 1.35;
            }
          }
        }
      }
    });

    return { root: normalizedGroup, baseSize };
  }

  /**
   * Charge un modèle unique par clé (mis en cache et dédupliqué).
   */
  load(key) {
    if (this._cache.has(key)) {
      return Promise.resolve(this._cache.get(key));
    }
    if (this._pending.has(key)) {
      return this._pending.get(key);
    }

    const url = `${this._getBaseUrl()}models/${key}.glb`;
    const promise = new Promise((resolve) => {
      this._loader.load(
        url,
        (gltf) => {
          const entry = this._normalizeModel(gltf.scene);
          this._cache.set(key, entry);
          this._pending.delete(key);
          resolve(entry);
        },
        undefined,
        (err) => {
          console.warn(`[ModelBank] Échec chargement ${url}:`, err);
          this._pending.delete(key);
          resolve(null);
        }
      );
    });

    this._pending.set(key, promise);
    return promise;
  }

  /**
   * Précharge l'ensemble des 13 modèles CC0 en parallèle.
   */
  preloadAll() {
    if (!this._preloadPromise) {
      this._preloadPromise = Promise.all(MODEL_KEYS.map((key) => this.load(key)));
    }
    return this._preloadPromise;
  }

  /**
   * Indique si le modèle est prêt dans le cache.
   */
  has(key) {
    return this._cache.has(key);
  }

  /**
   * Clone le modèle normalisé et l'ajuste uniformément à targetHeight (si fourni).
   * Retourne null si le modèle n'est pas encore chargé.
   */
  cloneNormalized(key, targetHeight = null) {
    const entry = this._cache.get(key);
    if (!entry) return null;

    const clone = entry.root.clone(true);
    if (typeof targetHeight === 'number' && targetHeight > 0) {
      const scale = targetHeight / entry.baseSize.y;
      clone.scale.setScalar(scale);
    }
    return clone;
  }

  /**
   * Clone le modèle normalisé et l'adapte aux dimensions cibles (largeur, hauteur, profondeur).
   * Retourne null si le modèle n'est pas encore chargé.
   */
  cloneToFootprint(key, targetWidth, targetHeight, targetDepth) {
    const entry = this._cache.get(key);
    if (!entry) return null;

    const clone = entry.root.clone(true);
    const sx = typeof targetWidth === 'number' && targetWidth > 0 ? targetWidth / entry.baseSize.x : 1;
    const sy = typeof targetHeight === 'number' && targetHeight > 0 ? targetHeight / entry.baseSize.y : 1;
    const sz = typeof targetDepth === 'number' && targetDepth > 0 ? targetDepth / entry.baseSize.z : 1;
    clone.scale.set(sx, sy, sz);
    return clone;
  }
}

export const modelBank = new ModelBank();

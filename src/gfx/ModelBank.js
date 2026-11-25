/**
 * Carnage Cruise - Banque de Modèles 3D GLTF/GLB + Draco + Animations Squelettiques + LOD
 * Précharge, décompresse localement (offline APK), normalise et met en cache tous les modèles 3D.
 * Supporte le clonage squelettique (SkeletonUtils.clone) et l'AnimationMixer pour personnages/véhicules animés.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const MODEL_KEYS = [
  // Animés CC0 haute qualité
  'Horse',
  'Parrot',
  'q_tank',
  'q_cyber_char',
  'q_casual_man',
  'q_casual_woman',
  'q_swat',
  'q_jet',
  'q_rover',
  // Architecture & environnement détaillés CC0
  'q_bldg_tall',
  'q_bldg_wide',
  'q_bldg_balcony',
  'q_house1',
  'q_pinetree',
  'q_tree',
  'q_palm',
  'q_streetlight',
  'q_trafficlight',
  // Modèles urbains/véhicules compacts existants
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
    try {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(`${this._getBaseUrl()}libs/draco/gltf/`);
      this._loader.setDRACOLoader(dracoLoader);
      this._dracoLoader = dracoLoader;
    } catch (err) {
      console.warn('[ModelBank] DRACOLoader fallback:', err);
    }
    this._cache = new Map();
    this._pending = new Map();
    this._preloadPromise = null;
  }

  _getBaseUrl() {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) {
      return import.meta.env.BASE_URL;
    }
    return './';
  }

  /**
   * Normalise un modèle chargé :
   * - Centre X et Z à 0, aligne box.min.y sur 0
   * - Calcule et stocke baseSize + hasSkins + animations
   * - Calibre les matériaux PBR (pneus/peau/feuillage mats vs carrosserie/métal brillants)
   * - Marque meshes, géométries et matériaux avec userData.isSharedModelBank = true
   */
  _normalizeModel(sceneRoot, animations = []) {
    sceneRoot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(sceneRoot);
    const center = box.getCenter(new THREE.Vector3());
    const baseSize = box.getSize(new THREE.Vector3());

    baseSize.x = Math.max(baseSize.x, 1e-4);
    baseSize.y = Math.max(baseSize.y, 1e-4);
    baseSize.z = Math.max(baseSize.z, 1e-4);

    // Pour les squelettes animés, décaler dans un groupe conteneur sans casser les os internes
    sceneRoot.position.x -= center.x;
    sceneRoot.position.y -= box.min.y;
    sceneRoot.position.z -= center.z;

    const normalizedGroup = new THREE.Group();
    normalizedGroup.userData.isSharedModelBank = true;
    normalizedGroup.add(sceneRoot);

    let hasSkins = false;

    normalizedGroup.traverse((node) => {
      node.userData.isSharedModelBank = true;
      if (node.isSkinnedMesh) {
        hasSkins = true;
        node.frustumCulled = false; // Évite la disparition de personnages animés hors BBox repos
      }
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
            const lowerName = `${node.name || ''} ${mat.name || ''}`.toLowerCase();
            if (
              lowerName.includes('wheel') ||
              lowerName.includes('tire') ||
              lowerName.includes('underside') ||
              lowerName.includes('skin') ||
              lowerName.includes('hair') ||
              lowerName.includes('tree') ||
              lowerName.includes('leaf') ||
              lowerName.includes('bark')
            ) {
              mat.roughness = 0.85;
              mat.metalness = 0.04;
              mat.envMapIntensity = 0.55;
            } else {
              mat.roughness = Math.min(mat.roughness ?? 0.38, 0.36);
              mat.metalness = Math.min(0.65, Math.max(mat.metalness ?? 0.15, 0.22));
              mat.envMapIntensity = 1.25;
            }
          }
        }
      }
    });

    return { root: normalizedGroup, baseSize, animations: animations || [], hasSkins };
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
          const entry = this._normalizeModel(gltf.scene, gltf.animations);
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
   * Précharge en priorité les modèles du joueur & personnages, puis l'architecture.
   */
  preloadAll() {
    if (!this._preloadPromise) {
      const priorityKeys = [
        'Horse',
        'q_tank',
        'q_jet',
        'q_rover',
        'q_cyber_char',
        'q_casual_man',
        'q_casual_woman',
        'q_swat',
        'Parrot',
        'vehicle-motorcycle',
        'vehicle-truck-red',
        'vehicle-truck-green',
        'vehicle-truck-yellow',
        'vehicle-truck-purple'
      ];
      const secondaryKeys = MODEL_KEYS.filter((k) => !priorityKeys.includes(k));
      this._preloadPromise = Promise.all(priorityKeys.map((k) => this.load(k))).then(() =>
        Promise.all(secondaryKeys.map((k) => this.load(k)))
      );
    }
    return this._preloadPromise;
  }

  has(key) {
    return this._cache.has(key);
  }

  getAnimations(key) {
    return this._cache.get(key)?.animations || [];
  }

  _instantiate(entry) {
    return entry.hasSkins ? SkeletonUtils.clone(entry.root) : entry.root.clone(true);
  }

  cloneNormalized(key, targetHeight = null) {
    const entry = this._cache.get(key);
    if (!entry) return null;

    const clone = this._instantiate(entry);
    if (typeof targetHeight === 'number' && targetHeight > 0) {
      const scale = targetHeight / entry.baseSize.y;
      clone.scale.setScalar(scale);
    }
    return clone;
  }

  cloneToFootprint(key, targetWidth, targetHeight, targetDepth) {
    const entry = this._cache.get(key);
    if (!entry) return null;

    const clone = this._instantiate(entry);
    const sx = typeof targetWidth === 'number' && targetWidth > 0 ? targetWidth / entry.baseSize.x : 1;
    const sy = typeof targetHeight === 'number' && targetHeight > 0 ? targetHeight / entry.baseSize.y : 1;
    const sz = typeof targetDepth === 'number' && targetDepth > 0 ? targetDepth / entry.baseSize.z : 1;
    clone.scale.set(sx, sy, sz);
    return clone;
  }

  /**
   * Construit un objet THREE.LOD (détail élevé proche, maillage simple lointain) pour 60 FPS Android.
   */
  createLodObject(highDetailObj, lowDetailObj, switchDistance = 55) {
    const lod = new THREE.LOD();
    if (highDetailObj) lod.addLevel(highDetailObj, 0);
    if (lowDetailObj) lod.addLevel(lowDetailObj, switchDistance);
    return lod;
  }
}

export const modelBank = new ModelBank();

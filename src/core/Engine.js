/**
 * Carnage Cruise - Moteur de Rendu 3D Three.js & Caméra Arcade Dynamique
 * Optimisé pour smartphones (60 FPS visés, gestion thermique, DPI contrôlé).
 */

import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { PostProcessingManager } from '../gfx/PostProcessing.js';
import { SkyDome } from '../gfx/SkyDome.js';

const PRESET_HDRI_MAP = {
  DAY_CLEAR: 'pedestrian_overpass_1k.hdr',
  OVERCAST_WET: 'pedestrian_overpass_1k.hdr',
  GOLDEN_DUSK: 'venice_sunset_1k.hdr',
  NIGHT_NEON: 'moonless_golf_1k.hdr'
};

const HDRI_FILES = [
  'pedestrian_overpass_1k.hdr',
  'venice_sunset_1k.hdr',
  'moonless_golf_1k.hdr'
];

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;

    // Scène
    this.scene = new THREE.Scene();

    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.perfTier = 0; // 0 = Qualité max, 1 = Équilibré, 2 = Ultra-fluide (zéro stagnation)
    this._perfAccum = 0;
    this._perfFrames = 0;

    // Rendu WebGL haute performance mobile & colorimétrie dynamique
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: !this.isMobile,
        stencil: false,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      console.warn('[Engine] WebGL high-performance failed, trying default:', e);
      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: false,
          stencil: false,
          powerPreference: 'default'
        });
      } catch (e2) {
        console.error('[Engine] WebGL context creation failed:', e2);
        throw new Error('WebGL context creation failed: ' + e2.message);
      }
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.0 : 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0; // Calibrage validé : exposition fidèle sans voile
    this.renderer.shadowMap.enabled = !this.isMobile;
    // PCFSoftShadowMap a été retiré de Three.js r0.187 : PCF filtré natif
    // (le normalBias calibré anti-acné fait déjà le travail soft)
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // Éclairage d'image (IBL) : environnement procédural « ciel dégradé » PMREM.
    // Fini le RoomEnvironment blanc cassé : ses gros rectangles lumineux se
    // reflétaient en taches bizarres sur les carrosseries. Un dôme bleu ciel /
    // sol taupe + un soleil compact donnent des reflets colorés et crédibles.
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);

      const envScene = new THREE.Scene();
      const domeGeo = new THREE.SphereGeometry(60, 24, 16);
      const domeMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          groundColor: { value: new THREE.Color(0x4a443f) },
          horizonColor: { value: new THREE.Color(0xcfe3f5) },
          zenithColor: { value: new THREE.Color(0x6ba8e5) }
        },
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vDir;
          uniform vec3 groundColor;
          uniform vec3 horizonColor;
          uniform vec3 zenithColor;
          void main() {
            float y = vDir.y;
            vec3 col = y < 0.0
              ? mix(horizonColor, groundColor, smoothstep(0.0, -0.35, y))
              : mix(horizonColor, zenithColor, smoothstep(0.0, 0.55, y));
            gl_FragColor = vec4(col, 1.0);
          }
        `
      });
      envScene.add(new THREE.Mesh(domeGeo, domeMat));

      // Soleil : point compact et chaud (reflet ponctuel, pas de patch géant)
      const sun = new THREE.Mesh(
        new THREE.SphereGeometry(5, 12, 8),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(5.5, 5.0, 4.2) })
      );
      sun.position.set(20, 34, 18); // Cohérent avec la direction de la dirLight
      envScene.add(sun);

      this.scene.environment = pmrem.fromScene(envScene, 0.04).texture;
      domeGeo.dispose();
      domeMat.dispose();
      sun.geometry.dispose();
      sun.material.dispose();
      pmrem.dispose();
      this.scene.environmentIntensity = 0.65;
    } catch (err) {
      console.warn('IBL PMREM indisponible, rendu standard conservé :', err);
      this.scene.environment = null;
    }

    // Caméra perspective grand angle arcade (near=0.65 pour précision Z-buffer optimale sans clignotement)
    this.baseFov = 72;
    this.camera = new THREE.PerspectiveCamera(
      72,
      window.innerWidth / window.innerHeight,
      0.65,
      this.isMobile ? 320 : 500
    );

    // Pool de PointLights dynamiques pour flashs d'armes et d'explosions (Zéro lag mobile)
    this.dynamicLights = [];
    for (let i = 0; i < 4; i++) {
      const pl = new THREE.PointLight(0xffa502, 0, 22, 2.0);
      pl.castShadow = false; // Ombres désactivées sur PointLights pour garantir 60 FPS constants
      this.scene.add(pl);
      this.dynamicLights.push({ light: pl, active: false, timer: 0, duration: 0, peakIntensity: 0 });
    }

    // Éclairage naturel rééquilibré : l'ambiance ne lave plus le volume du modelé,
    // la lumière clé (soleil) affirme les ombres portées et le contraste arcade
    this.ambientLight = new THREE.AmbientLight(0xcfe8ff, 0.3);
    this.scene.add(this.ambientLight);

    // Lumière hémisphérique pour des reflets de ciel et sol riches sur les modèles 3D
    this.hemiLight = new THREE.HemisphereLight(0xdff9fb, 0x535c68, 0.6);
    this.scene.add(this.hemiLight);

    // Lumière solaire principale naturelle (ombres désactivées sur mobile pour 60 FPS constants)
    this.dirLight = new THREE.DirectionalLight(0xfffdf7, 1.15);
    this.dirLight.position.set(22, 42, 22);
    this.dirLight.castShadow = !this.isMobile;
    const shadowRes = this.isMobile ? 512 : 1024;
    this.dirLight.shadow.mapSize.width = shadowRes;
    this.dirLight.shadow.mapSize.height = shadowRes;
    this.dirLight.shadow.camera.near = 1.0;
    this.dirLight.shadow.camera.far = 110;
    this.dirLight.shadow.camera.left = -14;
    this.dirLight.shadow.camera.right = 14;
    this.dirLight.shadow.camera.top = 24;
    this.dirLight.shadow.camera.bottom = -10;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.035;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Lumière rasante de silhouette (Rim Light / Kicker) douce et naturelle
    this.rimLight = new THREE.DirectionalLight(0x9ec5ff, 0.22);
    this.rimLight.position.set(0, 6, 25);
    this.scene.add(this.rimLight);
    this.scene.add(this.rimLight.target);

    // Brouillard atmosphérique exponentiel : profondeur cinématique douce,
    // brume au loin qui masque le streaming des chunks sans laver la ville proche
    this.scene.fog = new THREE.FogExp2(0xd8e8f8, 0.0008); // Brume très discrète : profondeur aérienne sans voile

    // Dôme Céleste & Nuages Cartoon Dérivants
    this.skyDome = new SkyDome(this.scene);

    // Post-Processing Arcade (UnrealBloom) : halo néon sur phares, gyrophares,
    // détonations, flammes nitro, émissifs et piéces d'or. Dégradé doux sur GPU limité.
    const isTouchDevice = navigator.maxTouchPoints > 0 && window.innerWidth < 900;
    try {
      this.postProcessing = new PostProcessingManager(this.renderer, this.scene, this.camera);
      if (isTouchDevice && this.postProcessing.bloomPass) {
        this.postProcessing.setBaseStrength(0.3); // Budget thermique mobile
      }
    } catch (err) {
      console.warn('Bloom arcade indisponible sur ce périphérique :', err);
      this.postProcessing = null;
    }

    // Propriétés de caméra dynamique (Zoom-out panoramique arcade équilibré & ultra-fluide)
    this.cameraTarget = new THREE.Vector3(0, 1.4, 0);
    this.lookAtCurrent = new THREE.Vector3(0, 1.2, 16.0);
    this.cameraOffset = new THREE.Vector3(0, 5.2, -11.2); // Position arcade reculée et surélevée offrant une visibilité dégagée
    this.shakeIntensity = 0;
    this.shakeDecay = 6.5;
    this.shakeTime = 0;
    this.cameraRoll = 0;
    this.nitroFovBoost = 0;

    // Caméra cinématique pour le menu / garage
    this.cinematicAngle = 0;

    // État atmosphère & micro Hit-Stop / Éclair d'orage
    this.isNight = false;
    this._currentCityDef = null;
    this._currentPreset = 'DAY_CLEAR';
    this._isRuinsAtmosphere = false;
    this.timeScale = 1.0;
    this.hitStopTimer = 0;
    this.hitStopCooldown = 0;
    this._lightningFlashTimer = 0;
    this._lightningFlashDuration = 0.22;
    this._baseAmbientIntensity = 0.3;
    this._baseExposure = 1.0;

    // Préchargement & cache des HDRIs 1K CC0 pour Skybox + IBL PMREM photoréaliste
    this._hdrCache = new Map();
    this._hdrPending = new Map();
    try {
      this._rgbeLoader = new RGBELoader();
      this._pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this._pmremGenerator.compileEquirectangularShader();
      this._preloadAllHdris();
      this._applyHdriForPreset(this._currentPreset);
    } catch (err) {
      console.warn('[Engine] Initialisation RGBELoader/HDRI indisponible :', err);
      this._rgbeLoader = null;
      this._pmremGenerator = null;
    }

    // Gestion du redimensionnement
    window.addEventListener('resize', () => this.onResize());
  }

  _getBaseUrl() {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) {
      return import.meta.env.BASE_URL;
    }
    return '/';
  }

  _getBackgroundIntensity(preset) {
    if (preset === 'NIGHT_NEON') return 0.42;
    if (preset === 'OVERCAST_WET') return 0.55;
    return 0.64;
  }

  _setSkyDomeVisible(visible) {
    if (!this.skyDome) return;
    if (this.skyDome.mesh) {
      this.skyDome.mesh.visible = visible;
    }
    if (this.skyDome.group) {
      this.skyDome.group.visible = visible;
    }
  }

  _loadHdri(filename) {
    if (this._hdrCache.has(filename)) {
      return Promise.resolve(this._hdrCache.get(filename));
    }
    if (this._hdrPending.has(filename)) {
      return this._hdrPending.get(filename);
    }
    if (!this._rgbeLoader || !this._pmremGenerator) {
      return Promise.resolve(null);
    }

    const url = `${this._getBaseUrl()}hdr/${filename}`;
    const promise = new Promise((resolve) => {
      this._rgbeLoader.load(
        url,
        (hdrTex) => {
          hdrTex.mapping = THREE.EquirectangularReflectionMapping;
          const envTex = this._pmremGenerator.fromEquirectangular(hdrTex).texture;
          const entry = { hdrTex, envTex };
          this._hdrCache.set(filename, entry);
          this._hdrPending.delete(filename);
          resolve(entry);
        },
        undefined,
        (err) => {
          console.warn(`[Engine] Échec chargement HDRI ${url}:`, err);
          this._hdrPending.delete(filename);
          resolve(null);
        }
      );
    });

    this._hdrPending.set(filename, promise);
    return promise;
  }

  _preloadAllHdris() {
    if (this.isMobile) return; // Sur mobile, l'IBL procédural + SkyDome évitent le lag et les passes HDR 1K
    for (const filename of HDRI_FILES) {
      this._loadHdri(filename);
    }
  }

  _applyHdriForPreset(preset) {
    if (this.isMobile) {
      this._setSkyDomeVisible(true);
      this.scene.backgroundBlurriness = 0;
      return;
    }
    const filename = PRESET_HDRI_MAP[preset] || PRESET_HDRI_MAP.DAY_CLEAR;
    const applyEntry = (entry) => {
      if (!entry || this._isRuinsAtmosphere || this._currentPreset !== preset) return;
      this.scene.environment = entry.envTex;
      this.scene.background = entry.hdrTex;
      this.scene.backgroundBlurriness = 0;
      this.scene.backgroundIntensity = this._getBackgroundIntensity(preset);
      this._setSkyDomeVisible(false);
    };

    const cached = this._hdrCache.get(filename);
    if (cached) {
      applyEntry(cached);
      return;
    }

    this._loadHdri(filename).then(applyEntry);
  }

  /**
   * Applique un preset d'atmosphère complet tout en préservant le brouillard de la ville.
   * Presets supportés : 'DAY_CLEAR', 'GOLDEN_DUSK', 'OVERCAST_WET', 'NIGHT_NEON'.
   */
  applyAtmospherePreset(cityDef, preset = 'DAY_CLEAR') {
    if (cityDef) {
      this._currentCityDef = cityDef;
    }
    const def = cityDef || this._currentCityDef || {};
    this._currentPreset = preset;
    this._isRuinsAtmosphere = false;

    if (preset === 'NIGHT_NEON') {
      this.isNight = true;
      this.ambientLight.intensity = 0.42;
      this.ambientLight.color.setHex(0x9eb8e8);
      this.hemiLight.intensity = 0.58;
      this.hemiLight.color.setHex(0xb4ccff);
      this.hemiLight.groundColor.setHex(0x2c3652);
      this.dirLight.intensity = 0.62;
      this.dirLight.color.setHex(0xd0e0ff);
      this.rimLight.intensity = 0.38;
      this.rimLight.color.setHex(0x6ea8ff);
      this.scene.environmentIntensity = 0.38;
      this.renderer.toneMappingExposure = 1.14;
      this.scene.fog.color.setHex(0x0a0f1e);
      this.scene.fog.density = def.fogDensity ? Math.min(def.fogDensity, 0.0008) : 0.0008;
      this.scene.background = new THREE.Color(0x05070f);
      if (this.skyDome) {
        this.skyDome.setColors(0x0a1030, 0x151d33);
        this.skyDome.setNight(true);
      }
    } else if (preset === 'GOLDEN_DUSK') {
      this.isNight = false;
      this.ambientLight.intensity = 0.32;
      this.ambientLight.color.setHex(0xffd2a6);
      this.hemiLight.intensity = 0.58;
      this.hemiLight.color.setHex(0xffb87a);
      this.hemiLight.groundColor.setHex(def.ambientColor !== undefined ? def.ambientColor : 0x4a3525);
      this.dirLight.intensity = 1.2;
      this.dirLight.color.setHex(0xffa959);
      this.rimLight.color.setHex(0xff6b4a);
      this.rimLight.intensity = def.isNuclearMission ? 0.75 : 0.45;
      this.scene.environmentIntensity = 0.65;
      this.renderer.toneMappingExposure = 1.02;
      const duskSky = 0xff9f68;
      const duskFog = def.fogColor !== undefined ? def.fogColor : 0xd9805f;
      this.scene.background = new THREE.Color(duskSky);
      this.scene.fog.color.setHex(duskFog);
      this.scene.fog.density = def.fogDensity || 0.0011;
      if (this.skyDome) {
        this.skyDome.setColors(duskSky, duskFog);
        this.skyDome.setNight(false);
      }
    } else if (preset === 'OVERCAST_WET') {
      this.isNight = false;
      this.ambientLight.intensity = 0.36;
      this.ambientLight.color.setHex(0xb8c8d8);
      this.hemiLight.intensity = 0.52;
      this.hemiLight.color.setHex(0x9fb3c8);
      this.hemiLight.groundColor.setHex(def.ambientColor !== undefined ? def.ambientColor : 0x3b4450);
      this.dirLight.intensity = 0.75;
      this.dirLight.color.setHex(0xdce6f2);
      this.rimLight.color.setHex(def.accentColor !== undefined ? def.accentColor : 0x74b9ff);
      this.rimLight.intensity = def.isNuclearMission ? 0.75 : 0.32;
      this.scene.environmentIntensity = 0.65;
      this.renderer.toneMappingExposure = 0.96;
      const wetSky = 0x7c8f9e;
      const wetFog = def.fogColor !== undefined ? def.fogColor : 0x8ea0b0;
      this.scene.background = new THREE.Color(wetSky);
      this.scene.fog.color.setHex(wetFog);
      this.scene.fog.density = def.fogDensity ? Math.max(def.fogDensity, 0.0018) : 0.0018;
      if (this.skyDome) {
        this.skyDome.setColors(wetSky, wetFog);
        this.skyDome.setNight(false);
      }
    } else {
      // 'DAY_CLEAR' (calibrage jour validé + conservation du fog ville)
      this.isNight = false;
      this.ambientLight.intensity = 0.3;
      this.ambientLight.color.setHex(0xcfe8ff);
      this.hemiLight.intensity = 0.6;
      if (def.skyColor !== undefined) {
        this.hemiLight.color.setHex(def.skyColor);
        this.scene.background = new THREE.Color(def.skyColor);
      } else {
        this.hemiLight.color.setHex(0xdff9fb);
      }
      if (def.ambientColor !== undefined) {
        this.hemiLight.groundColor.setHex(def.ambientColor);
      } else {
        this.hemiLight.groundColor.setHex(0x535c68);
      }
      this.dirLight.intensity = def.skyColor !== undefined ? 1.0 : 1.15;
      this.dirLight.color.setHex(0xfffdf7);
      this.rimLight.color.setHex(def.accentColor !== undefined ? def.accentColor : 0x9ec5ff);
      this.rimLight.intensity = def.isNuclearMission ? 0.75 : (def.skyColor !== undefined ? 0.45 : 0.22);
      this.scene.environmentIntensity = 0.65;
      this.renderer.toneMappingExposure = 1.0;
      if (def.fogColor !== undefined) {
        this.scene.fog.color.setHex(def.fogColor);
      } else {
        this.scene.fog.color.setHex(0xd8e8f8);
      }
      this.scene.fog.density = def.fogDensity || 0.0008;
      if (this.skyDome) {
        if (def.skyColor !== undefined && def.fogColor !== undefined) {
          this.skyDome.setColors(def.skyColor, def.fogColor);
        }
        this.skyDome.setNight(false);
      }
    }

    this._baseAmbientIntensity = this.ambientLight.intensity;
    this._baseExposure = this.renderer.toneMappingExposure;

    // Garder SkyDome visible en fallback instantané tant que l'HDRI du preset n'est pas prêt
    this._setSkyDomeVisible(true);
    this._applyHdriForPreset(preset);
  }

  applyCityAtmosphere(cityDef) {
    this.applyAtmospherePreset(cityDef, this.isNight ? 'NIGHT_NEON' : 'DAY_CLEAR');
  }

  applyRuinsAtmosphere() {
    this._isRuinsAtmosphere = true;
    this._setSkyDomeVisible(true);
    const ruinsSky = 0x120302;
    const ruinsFog = 0x1a0604;
    this.scene.background = new THREE.Color(ruinsSky);
    this.scene.fog.color = new THREE.Color(ruinsFog);
    this.scene.fog.density = 0.016;
    if (this.skyDome) {
      this.skyDome.setColors(ruinsSky, ruinsFog);
    }
    if (this.hemiLight) {
      this.hemiLight.color = new THREE.Color(0x400c08);
      this.hemiLight.groundColor = new THREE.Color(0x100201);
    }
    if (this.dirLight) {
      this.dirLight.color = new THREE.Color(0xff3311);
      this.dirLight.intensity = 1.45;
    }
    if (this.rimLight) {
      this.rimLight.color = new THREE.Color(0xff4757);
      this.rimLight.intensity = 0.95;
    }
    this._baseAmbientIntensity = this.ambientLight.intensity;
    this._baseExposure = this.renderer.toneMappingExposure;
  }

  /**
   * MODE NUIT ALÉATOIRE : bascule complète jour/nuit de l'ambiance 3D.
   * Délègue à applyAtmospherePreset pour préserver le brouillard de la ville.
   */
  applyNightAtmosphere(night = false) {
    this.applyAtmospherePreset(this._currentCityDef, night ? 'NIGHT_NEON' : 'DAY_CLEAR');
  }

  /**
   * Micro Hit-Stop : ralentit brièvement l'échelle temporelle sur impact lourd.
   */
  triggerHitStop(duration = 0.045, scale = 0.08) {
    if (this.hitStopCooldown > 0) return;
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
    this.timeScale = THREE.MathUtils.clamp(scale, 0.02, 1.0);
    this.hitStopCooldown = duration + 0.14;
  }

  updateTimeScale(rawDelta) {
    const dt = Math.min(rawDelta, 0.05);
    if (this.hitStopCooldown > 0) {
      this.hitStopCooldown = Math.max(0, this.hitStopCooldown - dt);
    }
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      if (this.hitStopTimer <= 0) {
        this.hitStopTimer = 0;
        this.timeScale = 1.0;
      }
    }
    return this.timeScale;
  }

  getTimeScale() {
    return this.timeScale;
  }

  /**
   * Flash d'éclair pour le mode EXTREME_STORM.
   */
  triggerLightningFlash() {
    this._lightningFlashTimer = this._lightningFlashDuration;
    if (this.postProcessing) {
      this.postProcessing.triggerBloomFlash(1.35, 0.18);
    }
  }

  triggerCameraShake(intensity = 0.15) {
    this.shakeIntensity = Math.max(this.shakeIntensity, Math.min(intensity, 0.22));
  }

  triggerDynamicLight(position, colorHex = 0xffa502, intensity = 4.8, duration = 0.25) {
    if (!this.dynamicLights) return;
    const item = this.dynamicLights.find(l => !l.active) || this.dynamicLights[0];
    item.light.color.setHex(colorHex);
    item.light.position.copy(position);
    item.light.position.y += 0.8;
    item.light.intensity = intensity;
    item.peakIntensity = intensity;
    item.duration = duration;
    item.timer = duration;
    item.active = true;

    // Flash de Bloom Arcade sur fortes détonations lumineuses
    if (this.postProcessing && intensity >= 4.0) {
      this.postProcessing.triggerBloomFlash(Math.min(1.45, 0.5 + intensity * 0.15), duration);
    }
  }

  updateDynamicLights(delta) {
    if (this._lightningFlashTimer > 0) {
      this._lightningFlashTimer = Math.max(0, this._lightningFlashTimer - delta);
      if (this._lightningFlashTimer <= 0) {
        this.ambientLight.intensity = this._baseAmbientIntensity;
        this.renderer.toneMappingExposure = this._baseExposure;
      } else {
        const p = this._lightningFlashTimer / this._lightningFlashDuration;
        const flicker = Math.sin(p * Math.PI * 3.0) * 0.5 + 0.5;
        const boost = p * (0.4 + 0.6 * flicker);
        this.ambientLight.intensity = this._baseAmbientIntensity + boost * 1.15;
        this.renderer.toneMappingExposure = this._baseExposure + boost * 0.45;
      }
    }
    if (!this.dynamicLights) return;
    for (let l of this.dynamicLights) {
      if (!l.active) continue;
      l.timer -= delta;
      if (l.timer <= 0) {
        l.light.intensity = 0;
        l.active = false;
      } else {
        const prog = l.timer / l.duration;
        l.light.intensity = l.peakIntensity * Math.pow(prog, 2.2);
      }
    }
  }

  setNitroFovBoost(active) {
    this.nitroFovBoost = active ? 5.0 : 0.0;
  }

  updateCameraGameplay(delta, bikePosition, bikeSpeed, lookAheadRoadX = null, roadAngle = 0, isNitroActive = false) {
    delta = Math.min(delta, 0.05);
    const safeSpeed = Number.isFinite(bikeSpeed) ? Math.max(0, bikeSpeed) : 0;
    this.updateDynamicLights(delta);

    // Mise à jour du dôme céleste
    if (this.skyDome) {
      this.skyDome.update(delta, bikePosition.z);
    }

    // Suivi de la lumière solaire et de la rim-light le long du tracé (zéro coupure d'ombres)
    if (this.dirLight) {
      this.dirLight.position.set(bikePosition.x + 22, 42, bikePosition.z + 22);
      this.dirLight.target.position.set(bikePosition.x, 0, bikePosition.z);
    }
    if (this.rimLight) {
      if (this.isNight) {
        this.rimLight.intensity = 0.0;
      } else {
        this.rimLight.position.set(bikePosition.x + 12, 12, bikePosition.z - 12);
        this.rimLight.target.position.set(bikePosition.x, 1.2, bikePosition.z);
      }
    }

    // Amortissement exponentiel indépendant du framerate (zéro saccade, confort visuel optimal)
    const dampX = 1.0 - Math.exp(-13.5 * delta);
    const dampY = 1.0 - Math.exp(-9.5 * delta);
    const dampZ = 1.0 - Math.exp(-18.0 * delta);

    // Placement caméra parfaitement centré dans l'axe du véhicule
    const targetCamX = bikePosition.x - Math.sin(roadAngle * 0.28) * 1.85;
    const targetCamY = bikePosition.y + this.cameraOffset.y;
    const targetCamZ = bikePosition.z + this.cameraOffset.z;

    this.camera.position.x += (targetCamX - this.camera.position.x) * dampX;
    this.camera.position.y += (targetCamY - this.camera.position.y) * dampY;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * dampZ;

    // Micro-secousse trauma à décroissance exponentielle (sin/cos stratifiés)
    this.shakeTime += delta;
    if (this.shakeIntensity > 0.001) {
      const t = this.shakeTime;
      const shakeX = (Math.sin(t * 47.0) * 0.6 + Math.cos(t * 83.0) * 0.4) * this.shakeIntensity * 0.08;
      const shakeY = (Math.cos(t * 53.0) * 0.6 + Math.sin(t * 79.0) * 0.4) * this.shakeIntensity * 0.05;
      this.camera.position.x += shakeX;
      this.camera.position.y += shakeY;
      this.shakeIntensity *= Math.exp(-this.shakeDecay * 1.6 * delta);
    } else {
      this.shakeIntensity = 0;
    }

    // LookAt lissé dans l'axe naturel du bolide (zéro rotation parasite en crabe)
    const lookAheadZ = 16.5 + Math.min(4.5, (safeSpeed / 28.0) * 3.5);
    const lookTargetX = lookAheadRoadX !== null
      ? (bikePosition.x * 0.78 + lookAheadRoadX * 0.22)
      : bikePosition.x * 0.96;
    const lookTargetY = bikePosition.y + 1.25;
    const lookTargetZ = bikePosition.z + lookAheadZ;

    const dampLook = 1.0 - Math.exp(-15.0 * delta);
    this.lookAtCurrent.x += (lookTargetX - this.lookAtCurrent.x) * dampLook;
    this.lookAtCurrent.y += (lookTargetY - this.lookAtCurrent.y) * dampLook;
    this.lookAtCurrent.z = lookTargetZ;

    // Roulis de banking fluide via camera.up (jamais de rotation.z après lookAt)
    const targetRoll = THREE.MathUtils.clamp(-roadAngle * 0.14, -0.09, 0.09);
    const dampRoll = 1.0 - Math.exp(-8.0 * delta);
    this.cameraRoll += (targetRoll - this.cameraRoll) * dampRoll;
    this.camera.up.set(Math.sin(this.cameraRoll), Math.cos(this.cameraRoll), 0);
    this.camera.lookAt(this.lookAtCurrent.x, this.lookAtCurrent.y, this.lookAtCurrent.z);

    // Élargissement dynamique et progressif du champ de vision (FOV) selon la vitesse + boost Nitro
    const speedBonusFov = Math.min(11.0, (safeSpeed / 30.0) * 9.5);
    const nitroBonusFov = isNitroActive ? 5.0 : (this.nitroFovBoost || 0);
    const targetFov = this.baseFov + speedBonusFov + nitroBonusFov;
    const dampFov = 1.0 - Math.exp(-6.0 * delta);
    const prevFov = this.camera.fov;
    this.camera.fov += (targetFov - this.camera.fov) * dampFov;
    if (Math.abs(prevFov - this.camera.fov) > 0.05) {
      this.camera.updateProjectionMatrix();
    }
  }

  updateCameraCinematic(delta, bikePosition) {
    if (this.skyDome) {
      this.skyDome.update(delta, bikePosition.z);
    }

    // Rotation fluide showroom 360° autour du véhicule pour l'Accueil et le Garage
    this.cinematicAngle += delta * 0.48;
    const radius = 4.35;
    const height = 1.65 + Math.sin(this.cinematicAngle * 0.75) * 0.22;

    this.camera.position.x = bikePosition.x + Math.sin(this.cinematicAngle) * radius;
    this.camera.position.y = bikePosition.y + height;
    this.camera.position.z = bikePosition.z + Math.cos(this.cinematicAngle) * radius;

    this.camera.lookAt(bikePosition.x, bikePosition.y + 0.78, bikePosition.z);
    this.camera.fov = 54;
    this.camera.updateProjectionMatrix();

    this.dirLight.position.set(12, 26, 12);
  }

  /**
   * Caméra cinématique réaliste pour la simulation complète d'arrestation policière (plan bas côté conducteur)
   */
  updateCameraArrest(delta, bikePosition, elapsed = 0) {
    if (this.skyDome) {
      this.skyDome.update(delta, bikePosition.z);
    }
    const t = Math.min(1.0, elapsed / 4.3);
    const orbitAngle = THREE.MathUtils.lerp(-0.85, -2.05, t);
    const radius = THREE.MathUtils.lerp(6.8, 4.9, t);
    const height = THREE.MathUtils.lerp(2.15, 1.55, t);

    const targetCamX = bikePosition.x + Math.sin(orbitAngle) * radius;
    const targetCamY = bikePosition.y + height;
    const targetCamZ = bikePosition.z + 1.6 + Math.cos(orbitAngle) * radius;

    const damp = 1.0 - Math.exp(-5.0 * delta);
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, damp);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, damp);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, damp);

    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(bikePosition.x - 0.35, bikePosition.y + 1.05, bikePosition.z + 1.6);
    if (Math.abs(this.camera.fov - 52) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 52, damp);
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Gouverneur adaptatif de performances : ajuste dynamiquement la résolution et les effets
   * selon la puissance réelle du téléphone pour garantir 0 stagnation.
   */
  updatePerformanceGovernor(rawDelta) {
    this._perfAccum = (this._perfAccum || 0) + rawDelta;
    this._perfFrames = (this._perfFrames || 0) + 1;
    if (this._perfFrames < 30) return this.perfTier;

    const avgMs = (this._perfAccum / this._perfFrames) * 1000;
    this._perfAccum = 0;
    this._perfFrames = 0;

    let nextTier = this.perfTier;
    if (avgMs > 24.5 && this.perfTier < 2) {
      nextTier = this.perfTier + 1;
    } else if (avgMs < 15.5 && this.perfTier > 0) {
      nextTier = this.perfTier - 1;
    }

    if (nextTier !== this.perfTier) {
      this.perfTier = nextTier;
      const dprCap = this.isMobile
        ? (nextTier === 0 ? 1.0 : (nextTier === 1 ? 0.85 : 0.72))
        : (nextTier === 0 ? 1.5 : 1.15);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
    }
    return this.perfTier;
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.perfTier = 0; // 0 = Qualité max, 1 = Équilibré, 2 = Ultra-fluide (zéro stagnation)
    this._perfAccum = 0;
    this._perfFrames = 0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.0 : 1.5));
    if (this.postProcessing) {
      this.postProcessing.setSize(window.innerWidth, window.innerHeight);
    }
  }

  render() {
    if (this.postProcessing) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

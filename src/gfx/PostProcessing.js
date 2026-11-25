/**
 * Carnage Cruise - Post-Processing GPU Haute Performance (pmndrs/postprocessing)
 * Pipeline mono-passe fusionné (RenderPass + EffectPass) :
 * - BloomEffect avec mipmapBlur hardware (actif sur Desktop ET Mobile AUTO/HIGH)
 * - ToneMappingEffect ACES Filmic (sans double tone-mapping sur le WebGLRenderer)
 * - VignetteEffect & ChromaticAberrationEffect dynamique sur Nitro / Explosions
 * - Bypass complet en mode ÉCO pour économie batterie maximale
 */

import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  ChromaticAberrationEffect,
  BlendFunction
} from 'postprocessing';

export class PostProcessingManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = true;
    this.composer = null;
    this.bloomEffect = null;
    this.chromaticEffect = null;
    this.vignetteEffect = null;

    const hasTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const minViewport = typeof window !== 'undefined' ? Math.min(window.innerWidth, window.innerHeight) : 1080;
    this.isMobile = hasTouch && minViewport < 900;
    this._flashToken = 0;
    this.qualityTier = 0;
    this.baseStrength = this.isMobile ? 0.52 : 0.68;
    this._baseChromaOffset = new THREE.Vector2(0.0, 0.0);

    try {
      this.initComposer();
    } catch (err) {
      console.warn('[PostProcessing] Pipeline pmndrs indisponible, repli standard:', err);
      this.enabled = false;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    }
  }

  initComposer() {
    const width = Math.max(1, window.innerWidth || 390);
    const height = Math.max(1, window.innerHeight || 844);

    // Le ToneMapping ACES s'exécute uniquement en fin de chaîne post-process (évite le double ACES)
    this.renderer.toneMapping = THREE.NoToneMapping;

    const createComposer = (frameBufferType, multisampling) => {
      const comp = new EffectComposer(this.renderer, { frameBufferType, multisampling });
      comp.setSize(width, height);
      return comp;
    };

    try {
      this.composer = createComposer(THREE.HalfFloatType, this.isMobile ? 0 : 2);
    } catch (_err) {
      this.composer = createComposer(THREE.UnsignedByteType, 0);
    }

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // 1. Bloom hardware mipmapBlur : rapide sur Adreno/Mali, halo propre sur émissifs HDR (> 1.0)
    this.bloomEffect = new BloomEffect({
      mipmapBlur: true,
      luminanceThreshold: 1.02,
      luminanceSmoothing: 0.22,
      intensity: this.baseStrength,
      radius: 0.62
    });

    // 2. Légère aberration chromatique dynamique lors du Nitro ou d'explosions
    this.chromaticEffect = new ChromaticAberrationEffect({
      offset: this._baseChromaOffset,
      radialModulation: true,
      modulationOffset: 0.25
    });

    // 3. Vignettage cinématique discret
    this.vignetteEffect = new VignetteEffect({
      eskil: false,
      offset: 0.26,
      darkness: 0.34,
      blendFunction: BlendFunction.NORMAL
    });

    // 4. ToneMapping ACES Filmic unifié en bout de passe
    const toneMappingEffect = new ToneMappingEffect({
      mode: ToneMappingMode.ACES_FILMIC
    });

    // Fusion en une seule passe GPU (Single-Pass Shader Merging)
    const effectPass = new EffectPass(
      this.camera,
      this.bloomEffect,
      this.chromaticEffect,
      this.vignetteEffect,
      toneMappingEffect
    );
    this.composer.addPass(effectPass);
  }

  setQualityTier(tier = 0) {
    this.qualityTier = tier;
    if (tier >= 2) {
      // Mode ECO : rendu direct natif sans post-process
      this.enabled = false;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      return;
    }
    this.enabled = !!this.composer;
    if (this.enabled) {
      this.renderer.toneMapping = THREE.NoToneMapping;
      if (this.bloomEffect) {
        this.baseStrength = tier === 0
          ? (this.isMobile ? 0.58 : 0.72)
          : (this.isMobile ? 0.42 : 0.54);
        this.bloomEffect.intensity = this.baseStrength;
      }
    } else {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    }
  }

  setBaseStrength(strength = 0.55) {
    this.baseStrength = strength;
    if (this.bloomEffect) {
      this.bloomEffect.intensity = this.baseStrength;
    }
  }

  setChromaticPulse(amount = 0) {
    if (!this.chromaticEffect) return;
    const v = Math.max(0, Math.min(0.0045, amount));
    this.chromaticEffect.offset.set(v, v * 0.5);
  }

  triggerBloomFlash(peakStrength = 1.35, duration = 0.35) {
    if (!this.bloomEffect || !this.enabled) return;
    const token = ++this._flashToken;
    this.bloomEffect.intensity = peakStrength;
    this.setChromaticPulse(0.0022);
    const baseStrength = this.baseStrength;
    const start = performance.now();
    const durMs = Math.max(80, duration * 1000);

    const animateBloom = (now) => {
      if (token !== this._flashToken || !this.bloomEffect) return;
      const progress = Math.min(1.0, (now - start) / durMs);
      const ease = 1.0 - Math.pow(progress, 2);
      this.bloomEffect.intensity = baseStrength + (peakStrength - baseStrength) * ease;
      this.setChromaticPulse(0.0022 * ease);
      if (progress < 1.0) {
        requestAnimationFrame(animateBloom);
      } else {
        this.bloomEffect.intensity = baseStrength;
        this.setChromaticPulse(0);
      }
    };
    requestAnimationFrame(animateBloom);
  }

  setSize(width, height) {
    if (this.composer && width > 0 && height > 0) {
      this.composer.setSize(width, height);
    }
  }

  render() {
    if (this.enabled && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
}

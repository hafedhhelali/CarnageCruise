/**
 * Motormageddon - Gestionnaire de Post-Processing Arcade Hautes Performances
 * Intègre EffectComposer, UnrealBloomPass (halo néon subtil) et OutputPass.
 * Architecture résiliente et adaptive : ajustement selon la résolution mobile pour 60 FPS garantis.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class PostProcessingManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = true;

    try {
      this.initComposer();
    } catch (err) {
      console.warn('PostProcessing non supporté sur ce périphérique, repli standard:', err);
      this.enabled = false;
    }
  }

  initComposer() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Composer
    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(width, height);

    // 2. Passe de rendu de base de la scène
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // 3. Passe de Bloom Arcade Subtil (lueur néon sur phares, gyrophares, pièces d'or et feux)
    const bloomResolution = new THREE.Vector2(width / 2, height / 2); // 1/2 résolution pour perf mobile maximale
    this.bloomPass = new UnrealBloomPass(
      bloomResolution,
      0.35,  // force subtile et élégante
      0.22,  // rayon
      0.88   // seuil élevé : seuls les éléments très lumineux émettent une lueur
    );
    this.composer.addPass(this.bloomPass);

    // 4. Passe de sortie avec gestion de l'espace colorimétrique sRGB et ToneMapping ACES Filmic
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  triggerBloomFlash(peakStrength = 1.25, duration = 0.4) {
    if (!this.bloomPass || !this.enabled) return;
    const baseStrength = 0.35;
    this.bloomPass.strength = peakStrength;
    const start = performance.now();
    const durMs = duration * 1000;

    const animateBloom = (now) => {
      const progress = Math.min(1.0, (now - start) / durMs);
      const ease = 1.0 - Math.pow(progress, 2);
      this.bloomPass.strength = baseStrength + (peakStrength - baseStrength) * ease;
      if (progress < 1.0) {
        requestAnimationFrame(animateBloom);
      } else {
        this.bloomPass.strength = baseStrength;
      }
    };
    requestAnimationFrame(animateBloom);
  }

  setSize(width, height) {
    if (this.composer) {
      this.composer.setSize(width, height);
      if (this.bloomPass) {
        this.bloomPass.resolution.set(width / 2, height / 2);
      }
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
      this.composer.passes.forEach(pass => {
        if (pass.dispose) pass.dispose();
      });
    }
  }
}

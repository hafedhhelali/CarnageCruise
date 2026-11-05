/**
 * Motormageddon - Moteur de Rendu 3D Three.js & Caméra Arcade Dynamique
 * Optimisé pour smartphones (60 FPS visés, gestion thermique, DPI contrôlé).
 */

import * as THREE from 'three';
import { PostProcessingManager } from '../gfx/PostProcessing.js';
import { SkyDome } from '../gfx/SkyDome.js';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;

    // Scène
    this.scene = new THREE.Scene();

    // Rendu WebGL haute performance mobile & colorimétrie dynamique
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Caméra
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.baseFov = 60;

    // Éclairage de studio cartoon multi-sources & rebond lumineux (Hemisphere)
    this.hemiLight = new THREE.HemisphereLight(0xe8f4f8, 0x7c8a78, 1.05);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Lumière solaire principale dorée avec ombres douces filtrées
    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.55);
    this.dirLight.position.set(22, 42, 22);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 130;
    this.dirLight.shadow.camera.left = -16;
    this.dirLight.shadow.camera.right = 16;
    this.dirLight.shadow.camera.top = 22;
    this.dirLight.shadow.camera.bottom = -16;
    this.dirLight.shadow.bias = -0.0004;
    this.dirLight.shadow.normalBias = 0.025;
    this.scene.add(this.dirLight);

    // Lumière de contre-jour (Rim light cartoon bleu pastel) pour détacher la silhouette
    this.rimLight = new THREE.DirectionalLight(0x81ecec, 0.45);
    this.rimLight.position.set(-15, 12, -20);
    this.scene.add(this.rimLight);

    // Brouillard atmosphérique doux et profond
    this.scene.fog = new THREE.Fog(0xd8e8f8, 45, 220);

    // Dôme Céleste & Nuages Cartoon Dérivants
    this.skyDome = new SkyDome(this.scene);

    // Post-Processing Arcade (EffectComposer & Bloom subtil)
    this.postProcessing = new PostProcessingManager(this.renderer, this.scene, this.camera);

    // Propriétés de caméra dynamique
    this.cameraTarget = new THREE.Vector3(0, 1.2, 0);
    this.cameraOffset = new THREE.Vector3(0, 3.2, -6.2); // Position arcade derrière la moto
    this.shakeIntensity = 0;
    this.shakeDecay = 6.0;

    // Caméra cinématique pour le menu / garage
    this.cinematicAngle = 0;

    // Gestion du redimensionnement
    window.addEventListener('resize', () => this.onResize());
  }

  applyCityAtmosphere(cityDef) {
    this.scene.background = new THREE.Color(cityDef.skyColor);
    this.scene.fog.color = new THREE.Color(cityDef.fogColor);
    if (this.skyDome) {
      this.skyDome.setColors(cityDef.skyColor, cityDef.fogColor);
    }
    if (this.hemiLight) {
      this.hemiLight.color = new THREE.Color(cityDef.skyColor);
      this.hemiLight.groundColor = new THREE.Color(cityDef.ambientColor);
    }
    if (this.dirLight) {
      this.dirLight.color = new THREE.Color(0xfffaed);
    }
  }

  triggerCameraShake(intensity = 0.3) {
    this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 0.8);
  }

  updateCameraGameplay(delta, bikePosition, bikeSpeed) {
    // Mise à jour du dôme céleste
    if (this.skyDome) {
      this.skyDome.update(delta, bikePosition.z);
    }

    // Calcul de la secousse d'impact comique
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * delta);
    }

    // Suivi fluide amorti de la moto
    const targetCamX = bikePosition.x * 0.45 + shakeX;
    const targetCamY = bikePosition.y + this.cameraOffset.y + shakeY;
    const targetCamZ = bikePosition.z + this.cameraOffset.z;

    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1.0, delta * 8.0);
    this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1.0, delta * 8.0);
    this.camera.position.z += (targetCamZ - this.camera.position.z) * Math.min(1.0, delta * 15.0);

    // LookAt dynamique légèrement devant la moto
    const lookTargetX = bikePosition.x * 0.7;
    const lookTargetY = bikePosition.y + 1.2;
    const lookTargetZ = bikePosition.z + 10.0;
    this.camera.lookAt(lookTargetX, lookTargetY, lookTargetZ);

    // Élargissement du champ de vision (FOV) selon la vitesse pour booster les sensations
    const speedBonusFov = (bikeSpeed / 30.0) * 12.0;
    const targetFov = this.baseFov + speedBonusFov;
    this.camera.fov += (targetFov - this.camera.fov) * delta * 4.0;
    this.camera.updateProjectionMatrix();

    // La lumière directionnelle suit le joueur pour un rendu d'ombres parfait
    this.dirLight.position.set(bikePosition.x + 15, 35, bikePosition.z + 20);
    this.dirLight.target.position.set(bikePosition.x, 0, bikePosition.z);
    this.dirLight.target.updateMatrixWorld();
  }

  updateCameraCinematic(delta, bikePosition) {
    if (this.skyDome) {
      this.skyDome.update(delta, bikePosition.z);
    }

    // Rotation lente 360° cinématographique autour de la moto pour le Splash / Menu / Garage
    this.cinematicAngle += delta * 0.6;
    const radius = 4.2;
    const height = 1.6 + Math.sin(this.cinematicAngle * 0.8) * 0.3;

    this.camera.position.x = bikePosition.x + Math.sin(this.cinematicAngle) * radius;
    this.camera.position.y = bikePosition.y + height;
    this.camera.position.z = bikePosition.z + Math.cos(this.cinematicAngle) * radius;

    this.camera.lookAt(bikePosition.x, bikePosition.y + 0.8, bikePosition.z);
    this.camera.fov = 55;
    this.camera.updateProjectionMatrix();

    this.dirLight.position.set(10, 25, 10);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
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

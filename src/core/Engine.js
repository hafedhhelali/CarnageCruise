/**
 * Carnage Cruise - Moteur de Rendu 3D Three.js & Caméra Arcade Dynamique
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
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      console.warn('[Engine] WebGL high-performance failed, trying default:', e);
      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: false,
          powerPreference: 'default'
        });
      } catch (e2) {
        console.error('[Engine] WebGL context creation failed:', e2);
        throw new Error('WebGL context creation failed: ' + e2.message);
      }
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0; // Calibrage validé : exposition fidèle sans voile
    this.renderer.shadowMap.enabled = true;
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
          topColor: { value: new THREE.Color(0x8ec5f0) },
          bottomColor: { value: new THREE.Color(0x535c68) }
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
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          void main() {
            float h = vDir.y * 0.5 + 0.5;
            gl_FragColor = vec4(mix(bottomColor, topColor, smoothstep(0.35, 0.75, h)), 1.0);
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
      pmrem.dispose();
      this.scene.environmentIntensity = 0.6; // Environnement plus sombre => marge de remontée
    } catch (err) {
      console.warn('IBL PMREM indisponible, rendu standard conservé :', err);
      this.scene.environment = null;
    }

    // Caméra
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.baseFov = 60;

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

    // Lumière solaire principale naturelle avec ombres douces
    this.dirLight = new THREE.DirectionalLight(0xfffdf7, 1.15);
    this.dirLight.position.set(22, 42, 22);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 1.0;
    this.dirLight.shadow.camera.far = 110;
    this.dirLight.shadow.camera.left = -14;
    this.dirLight.shadow.camera.right = 14;
    this.dirLight.shadow.camera.top = 18;
    this.dirLight.shadow.camera.bottom = -14;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.035;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Lumière rasante de silhouette (Rim Light / Kicker) style studio AAA
    this.rimLight = new THREE.DirectionalLight(0x00d2d3, 0.55);
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
    // Densité de brume par ville (différenciation : glace épaisse, désert clair)
    if (cityDef.fogDensity) this.scene.fog.density = cityDef.fogDensity;
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
    if (this.rimLight) {
      this.rimLight.color = new THREE.Color(cityDef.accentColor || 0x00cec9);
      this.rimLight.intensity = cityDef.isNuclearMission ? 0.75 : 0.45;
    }
  }

  /**
   * MODE NUIT ALÉATOIRE : bascule complète jour/nuit de l'ambiance 3D.
   * La nuit, les phares, réverbères, fenêtres éclairées et feux tricolores
   * deviennent les sources lumineuses principales (le bloom fait le reste).
   * Les valeurs jour sont le calibrage validé — ne pas les modifier ici.
   */
  applyNightAtmosphere(night = false) {
    this.isNight = !!night;
    if (night) {
      // Clapotis lunaire froid : tout s'éteint sauf les émissifs urbains
      this.ambientLight.intensity = 0.14;
      this.ambientLight.color.setHex(0x8fa3c8);
      this.hemiLight.intensity = 0.22;
      this.hemiLight.color.setHex(0x9fb8e8);
      this.hemiLight.groundColor.setHex(0x1a2030);
      this.dirLight.intensity = 0.22;
      this.dirLight.color.setHex(0xbfd0ff); // Lune froide
      this.rimLight.intensity = 0.55;
      this.rimLight.color.setHex(0x48dbfb);
      this.renderer.toneMappingExposure = 0.95;
      this.scene.fog.color.setHex(0x0a0f1e);
      this.scene.fog.density = 0.0012;
      this.scene.background = new THREE.Color(0x05070f);
      if (this.skyDome) {
        this.skyDome.setColors(0x0a1030, 0x151d33);
        this.skyDome.setNight(true);
      }
    } else {
      // Retour au calibrage jour validé
      this.ambientLight.intensity = 0.3;
      this.ambientLight.color.setHex(0xcfe8ff);
      this.hemiLight.intensity = 0.6;
      this.dirLight.intensity = 1.15;
      this.dirLight.color.setHex(0xfffdf7);
      this.rimLight.intensity = 0.45;
      this.renderer.toneMappingExposure = 1.0;
      this.scene.fog.color.setHex(0xd8e8f8);
      this.scene.fog.density = 0.0008;
      if (this.skyDome) this.skyDome.setNight(false);
    }
  }

  triggerCameraShake(intensity = 0.3) {
    this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 0.8);
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

  updateCameraGameplay(delta, bikePosition, bikeSpeed) {
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
      this.rimLight.position.set(bikePosition.x, 6, bikePosition.z + 26);
      this.rimLight.target.position.set(bikePosition.x, 1.2, bikePosition.z);
    }

    // Calcul de la secousse d'impact comique
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * delta);
    }

    // Suivi fluide dynamique de la moto : la caméra suit parfaitement latéralement
    // pour garder le pilote 100% visible même à l'extrémité des trottoirs gauche et droite
    const targetCamX = bikePosition.x * 0.88 + shakeX;
    const targetCamY = bikePosition.y + this.cameraOffset.y + shakeY;
    const targetCamZ = bikePosition.z + this.cameraOffset.z;

    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1.0, delta * 9.5);
    this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1.0, delta * 8.0);
    this.camera.position.z += (targetCamZ - this.camera.position.z) * Math.min(1.0, delta * 15.0);

    // LookAt centré précisément sur le couloir du joueur pour cadrage optimal
    const lookTargetX = bikePosition.x;
    const lookTargetY = bikePosition.y + 1.2;
    const lookTargetZ = bikePosition.z + 10.0;
    this.camera.lookAt(lookTargetX, lookTargetY, lookTargetZ);

    // Élargissement du champ de vision (FOV) selon la vitesse pour booster les sensations
    const speedBonusFov = (bikeSpeed / 30.0) * 12.0;
    const targetFov = this.baseFov + speedBonusFov;
    this.camera.fov += (targetFov - this.camera.fov) * delta * 4.0;
    this.camera.updateProjectionMatrix();
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

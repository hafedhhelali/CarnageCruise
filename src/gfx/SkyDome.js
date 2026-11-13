/**
 * Carnage Cruise - Dôme Céleste & Nuages Flottants Procéduraux (SkyDome)
 * Dôme hémisphérique avec dégradé zénithal personnalisé selon la ville,
 * soleil rutilant et nuages 3D cartoon vaporeux dérivant au-dessus des étapes.
 */

import * as THREE from 'three';
import { textureFactory } from './TextureFactory.js';

export class SkyDome {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.clouds = [];
    this.animTime = 0;

    this.initDome();
    this.initClouds();
  }

  initDome() {
    // Dôme hémisphérique géant avec dégradé atmosphérique tri-bande et lueur d'horizon
    const domeGeo = new THREE.SphereGeometry(380, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2);
    
    const domeMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1e3799) },
        bottomColor: { value: new THREE.Color(0xdff9fb) },
        horizonGlow: { value: new THREE.Color(0x74b9ff) },
        offset: { value: 14 },
        exponent: { value: 0.58 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 horizonGlow;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = clamp(normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y, 0.0, 1.0);
          float curve = pow(h, exponent);
          vec3 skyGrad = mix(bottomColor, topColor, curve);
          float horizonBand = exp(-h * 9.0) * 0.28;
          gl_FragColor = vec4(skyGrad + horizonGlow * horizonBand, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.domeMesh = new THREE.Mesh(domeGeo, domeMat);
    this.group.add(this.domeMesh);
  }

  initClouds() {
    // Cel-shading 4 bandes partagé : crêtes d'ombre cartoon cohérentes avec le reste du jeu
    const cloudMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      gradientMap: textureFactory.getToonGradientMap()
    });
    this.cloudMat = cloudMat; // Teinté la nuit via setNight()

    const cloudCount = 14;
    for (let i = 0; i < cloudCount; i++) {
      const cloud = new THREE.Group();
      
      // Amas de 3 à 5 sphères formant un nuage cartoon
      const puffCount = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffCount; p++) {
        const radius = 6.0 + Math.random() * 5.0;
        const puffGeo = new THREE.SphereGeometry(radius, 8, 8);
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(
          (p - 1.5) * 6.5 + (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 4
        );
        cloud.add(puff);
      }

      cloud.position.set(
        (Math.random() - 0.5) * 220,
        45 + Math.random() * 25,
        Math.random() * 300
      );
      cloud.userData = {
        speed: 1.5 + Math.random() * 2.0,
        driftX: (Math.random() - 0.5) * 0.4,
        baseY: cloud.position.y,
        phase: Math.random() * Math.PI * 2
      };

      this.group.add(cloud);
      this.clouds.push(cloud);
    }
  }

  setColors(topColorHex, bottomColorHex) {
    if (this.domeMesh && this.domeMesh.material.uniforms) {
      this.domeMesh.material.uniforms.topColor.value.set(topColorHex);
      this.domeMesh.material.uniforms.bottomColor.value.set(bottomColorHex);
      if (this.domeMesh.material.uniforms.horizonGlow) {
        this.domeMesh.material.uniforms.horizonGlow.value.set(bottomColorHex).lerp(new THREE.Color(0x00f2fe), 0.18);
      }
    }
  }

  /** Mode nuit : nuages gris ardoise éteints au lieu de blanc éclatant */
  setNight(night = false) {
    this.isNight = !!night;
    if (this.cloudMat) {
      this.cloudMat.color.setHex(night ? 0x39415c : 0xffffff);
    }
  }

  update(delta, playerZ) {
    this.animTime += delta;
    this.group.position.z = playerZ * 0.85; // Suivi avec parallaxe atmosphérique

    this.clouds.forEach(cloud => {
      cloud.position.x += cloud.userData.driftX * delta;
      cloud.position.z += cloud.userData.speed * delta;
      if (cloud.userData.baseY !== undefined) {
        cloud.position.y = cloud.userData.baseY + Math.sin(this.animTime * 0.8 + cloud.userData.phase) * 0.65;
      }

      // Boucle infinie des nuages autour du joueur
      if (cloud.position.z > playerZ + 250) {
        cloud.position.z = playerZ - 80;
        cloud.position.x = (Math.random() - 0.5) * 220;
      }
    });
  }

  dispose() {
    this.scene.remove(this.group);
  }
}

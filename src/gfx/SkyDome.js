/**
 * Motormageddon - Dôme Céleste & Nuages Flottants Procéduraux (SkyDome)
 * Dôme hémisphérique avec dégradé zénithal personnalisé selon la ville,
 * soleil rutilant et nuages 3D cartoon vaporeux dérivant au-dessus des étapes.
 */

import * as THREE from 'three';

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
    // Dôme hémisphérique géant avec dégradé vertical
    const domeGeo = new THREE.SphereGeometry(380, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    
    // Shader de dégradé céleste doux
    const domeMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x3867d6) },
        bottomColor: { value: new THREE.Color(0xdff9fb) },
        offset: { value: 15 },
        exponent: { value: 0.6 }
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
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.domeMesh = new THREE.Mesh(domeGeo, domeMat);
    this.group.add(this.domeMesh);
  }

  initClouds() {
    const cloudMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      roughness: 0.2
    });

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
        driftX: (Math.random() - 0.5) * 0.4
      };

      this.group.add(cloud);
      this.clouds.push(cloud);
    }
  }

  setColors(topColorHex, bottomColorHex) {
    if (this.domeMesh && this.domeMesh.material.uniforms) {
      this.domeMesh.material.uniforms.topColor.value.set(topColorHex);
      this.domeMesh.material.uniforms.bottomColor.value.set(bottomColorHex);
    }
  }

  update(delta, playerZ) {
    this.animTime += delta;
    this.group.position.z = playerZ * 0.85; // Suivi avec parallaxe atmosphérique

    this.clouds.forEach(cloud => {
      cloud.position.x += cloud.userData.driftX * delta;
      cloud.position.z += cloud.userData.speed * delta;

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

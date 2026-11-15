/**
 * Carnage Cruise - Dôme Céleste & Nuages Flottants Procéduraux (SkyDome)
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
    this.isNight = false;
    this.sunDirection = new THREE.Vector3(-0.32, 0.42, 0.85).normalize();

    this.initDome();
    this.initCelestial();
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

  initCelestial() {
    // Disque solaire / lunaire + halo additif aligné sur sunDirection
    const discGeo = new THREE.CircleGeometry(15, 24);
    this.celestialDiscMat = new THREE.MeshBasicMaterial({
      color: 0xfff5d1,
      fog: false,
      depthWrite: false
    });
    this.celestialDisc = new THREE.Mesh(discGeo, this.celestialDiscMat);

    // Texture radiale douce pour le halo additif
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 64;
    haloCanvas.height = 64;
    const hctx = haloCanvas.getContext('2d');
    const grad = hctx.createRadialGradient(32, 32, 4, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 244, 200, 0.85)');
    grad.addColorStop(0.35, 'rgba(255, 224, 150, 0.35)');
    grad.addColorStop(1, 'rgba(255, 200, 120, 0)');
    hctx.fillStyle = grad;
    hctx.fillRect(0, 0, 64, 64);

    this.haloTexture = new THREE.CanvasTexture(haloCanvas);
    this.haloTexture.colorSpace = THREE.SRGBColorSpace;
    const haloGeo = new THREE.PlaneGeometry(96, 96);
    this.celestialHaloMat = new THREE.MeshBasicMaterial({
      map: this.haloTexture,
      color: 0xffdf9a,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    this.celestialHalo = new THREE.Mesh(haloGeo, this.celestialHaloMat);

    this.celestialAnchor = new THREE.Group();
    this.celestialAnchor.add(this.celestialHalo);
    this.celestialAnchor.add(this.celestialDisc);
    this.celestialDisc.position.z = 0.5;
    this.updateCelestialPosition();
    this.group.add(this.celestialAnchor);

    // Champ d'étoiles (120 sommets, visible uniquement la nuit)
    const starCount = 120;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.18 + Math.random() * 0.82); // hémisphère supérieur
      const r = 345;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xe6f0ff,
      size: 2.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      fog: false
    });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.stars.visible = false;
    this.group.add(this.stars);
  }

  updateCelestialPosition() {
    if (!this.celestialAnchor) return;
    const dist = 320;
    this.celestialAnchor.position.copy(this.sunDirection).multiplyScalar(dist);
    this.celestialAnchor.lookAt(0, 0, 0);
  }

  initClouds() {
    // Matériaux PBR multi-tons (sommet lumineux + base ombragée) pour nuages réalistes
    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.94,
      metalness: 0.0,
      envMapIntensity: 0.35
    });
    this.cloudUnderMat = new THREE.MeshStandardMaterial({
      color: 0xdce4f0,
      roughness: 0.96,
      metalness: 0.0,
      envMapIntensity: 0.25
    });

    const unitSphereGeo = new THREE.SphereGeometry(1, 8, 8);
    const cloudCount = 14;
    for (let i = 0; i < cloudCount; i++) {
      const cloud = new THREE.Group();

      // Amas multi-tons aplatis (scale.y = 0.42)
      const puffCount = 4 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffCount; p++) {
        const radius = 5.5 + Math.random() * 5.0;
        const isLower = p % 2 === 1;
        const puff = new THREE.Mesh(unitSphereGeo, isLower ? this.cloudUnderMat : this.cloudMat);
        puff.scale.setScalar(radius);
        puff.position.set(
          (p - 2.0) * 6.2 + (Math.random() - 0.5) * 3.0,
          isLower ? -1.4 : (Math.random() * 2.2),
          (Math.random() - 0.5) * 4.5
        );
        cloud.add(puff);
      }

      cloud.scale.set(1.15, 0.42, 1.0);
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
        this.domeMesh.material.uniforms.horizonGlow.value.set(bottomColorHex).lerp(new THREE.Color(0xfff3e0), 0.18);
      }
    }
  }

  /** Mode nuit : nuages gris ardoise, lune pâle et champ d'étoiles */
  setNight(night = false) {
    this.isNight = !!night;
    if (this.cloudMat) {
      this.cloudMat.color.setHex(this.isNight ? 0x39415c : 0xffffff);
    }
    if (this.cloudUnderMat) {
      this.cloudUnderMat.color.setHex(this.isNight ? 0x262c40 : 0xdce4f0);
    }
    if (this.stars) {
      this.stars.visible = this.isNight;
    }
    if (this.celestialDiscMat) {
      this.celestialDiscMat.color.setHex(this.isNight ? 0xe6eeff : 0xfff5d1);
    }
    if (this.celestialHaloMat) {
      this.celestialHaloMat.color.setHex(this.isNight ? 0x9cb8ff : 0xffdf9a);
      this.celestialHaloMat.opacity = this.isNight ? 0.32 : 0.48;
    }
  }

  /**
   * Configure un preset atmosphérique complet (jour/crépuscule/orage/nuit)
   * @param {string|object} preset
   * @param {boolean} isNight
   */
  setAtmospherePreset(preset, isNight = false) {
    this.setNight(isNight);

    const p = typeof preset === 'string' ? preset.toLowerCase() : null;
    if (p === 'sunset' || p === 'dusk' || p === 'golden') {
      this.setColors(isNight ? 0x161b33 : 0x2c3e78, isNight ? 0x3b2c4a : 0xff9f68);
      this.sunDirection.set(-0.45, isNight ? 0.38 : 0.2, 0.86).normalize();
      if (this.cloudMat) this.cloudMat.color.setHex(isNight ? 0x3d3a54 : 0xffd6ba);
      if (this.cloudUnderMat) this.cloudUnderMat.color.setHex(isNight ? 0x252338 : 0xc98a7c);
      if (this.celestialHaloMat && !isNight) {
        this.celestialHaloMat.color.setHex(0xff9b54);
        this.celestialHaloMat.opacity = 0.62;
      }
    } else if (p === 'storm' || p === 'rain' || p === 'overcast') {
      this.setColors(isNight ? 0x0b101d : 0x475569, isNight ? 0x1e293b : 0x94a3b8);
      if (this.cloudMat) this.cloudMat.color.setHex(isNight ? 0x242c3d : 0x9aa5b5);
      if (this.cloudUnderMat) this.cloudUnderMat.color.setHex(isNight ? 0x161b26 : 0x64748b);
      if (this.celestialHaloMat) this.celestialHaloMat.opacity = 0.16;
      if (this.stars) this.stars.visible = false;
    } else if (p === 'snow' || p === 'fog') {
      this.setColors(isNight ? 0x151e30 : 0x64748b, isNight ? 0x2c3e55 : 0xdbeafe);
      if (this.cloudMat) this.cloudMat.color.setHex(isNight ? 0x3f4a63 : 0xeff6ff);
      if (this.cloudUnderMat) this.cloudUnderMat.color.setHex(isNight ? 0x2b3347 : 0xcbd5e1);
      if (this.celestialHaloMat) this.celestialHaloMat.opacity = 0.25;
    } else if (preset && typeof preset === 'object') {
      if (preset.topColor !== undefined && preset.bottomColor !== undefined) {
        this.setColors(preset.topColor, preset.bottomColor);
      }
      if (preset.sunDir) {
        this.sunDirection.copy(preset.sunDir).normalize();
      }
      if (preset.cloudColor !== undefined && this.cloudMat) {
        this.cloudMat.color.set(preset.cloudColor);
      }
      if (preset.sunColor !== undefined && this.celestialDiscMat) {
        this.celestialDiscMat.color.set(preset.sunColor);
      }
    } else {
      this.sunDirection.set(-0.32, isNight ? 0.45 : 0.42, 0.85).normalize();
    }

    this.updateCelestialPosition();
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
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    if (this.haloTexture) {
      this.haloTexture.dispose();
      this.haloTexture = null;
    }
    this.scene.remove(this.group);
  }
}

/**
 * Carnage Cruise - Système Météo 3D (WeatherSystem)
 * Unique THREE.Points + BufferGeometry en boîte englobante relative caméra.
 * Zéro allocation par frame. Modes : NONE, RAIN, SANDSTORM, SNOW, RUINS_ASH.
 */

import * as THREE from 'three';

export class WeatherSystem {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    const isMobile = typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    this.maxParticles = isMobile ? 220 : 420;

    this.mode = 'NONE';
    this.wetness = 0.0;
    this.qualityFactor = 1.0;
    this.time = 0;

    this.boxWidth = 34;
    this.boxHeight = 18;
    this.boxDepth = 52;
    this.zBackOffset = -10;
    this.zFrontOffset = 42;

    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.velocities = new Float32Array(this.maxParticles * 3);
    this.phases = new Float32Array(this.maxParticles);

    for (let i = 0; i < this.maxParticles; i++) {
      const i3 = i * 3;
      this.positions[i3] = (Math.random() - 0.5) * this.boxWidth;
      this.positions[i3 + 1] = 0.2 + Math.random() * (this.boxHeight - 0.2);
      this.positions[i3 + 2] = this.zBackOffset + Math.random() * this.boxDepth;
      this.phases[i] = Math.random() * Math.PI * 2;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this._texture = typeof document !== 'undefined' ? this._createParticleTexture() : null;

    this.material = new THREE.PointsMaterial({
      size: 0.24,
      map: this._texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.points.name = 'WeatherSystemPoints';

    if (this.scene) {
      this.scene.add(this.points);
    }
  }

  _createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.75)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Détermine et applique le mode météo selon le biome, le mode ruines et la nuit.
   * @param {object} cityDef
   * @param {boolean} isRuinsMode
   * @param {boolean} isNight
   * @param {boolean} forceStorm
   * @returns {{ type: string, wetness: number }}
   */
  setBiome(cityDef = {}, isRuinsMode = false, isNight = false, forceStorm = false) {
    let nextMode = 'NONE';

    if (isRuinsMode) {
      nextMode = 'RUINS_ASH';
    } else if (cityDef && typeof cityDef.weather === 'string') {
      nextMode = cityDef.weather;
    } else {
      const biome = (cityDef?.biome || '').toLowerCase();
      const id = (cityDef?.id || '').toLowerCase();
      const isDesert = biome.includes('desert') || biome.includes('canyon') || biome.includes('steppe');
      const isCold = biome.includes('snow') || biome.includes('ice') || biome.includes('glacier') ||
        biome.includes('alpine') || id.includes('reykjavik') || id.includes('oslo') || id.includes('helsinki');

      if (forceStorm) {
        if (isDesert) nextMode = 'SANDSTORM';
        else if (isCold) nextMode = 'SNOW';
        else nextMode = 'RAIN';
      } else if (isCold) {
        nextMode = 'SNOW';
      } else if (isDesert && (cityDef?.fogDensity || 0) >= 0.002) {
        nextMode = 'SANDSTORM';
      } else if (isNight && (cityDef?.fogDensity || 0) >= 0.002) {
        nextMode = 'RAIN';
      } else if (Math.random() < 0.38) {
        // Mode pluie aléatoire dynamique sur les villes tempérées / côtières
        nextMode = 'RAIN';
      } else {
        nextMode = 'NONE';
      }
    }

    this.mode = nextMode;
    this.wetness = nextMode === 'RAIN' ? 0.85 : 0.0;
    this._configureModeParticles(nextMode, forceStorm);

    return {
      type: this.mode,
      wetness: this.wetness
    };
  }

  _configureModeParticles(mode, forceStorm) {
    if (mode === 'NONE') {
      this.points.visible = false;
      return;
    }

    this.points.visible = true;
    const stormMult = forceStorm ? 1.35 : 1.0;

    if (mode === 'RAIN') {
      this.material.size = 0.18;
      this.material.opacity = 0.72;
      this.material.blending = THREE.AdditiveBlending;
    } else if (mode === 'SANDSTORM') {
      this.material.size = 0.28;
      this.material.opacity = 0.55;
      this.material.blending = THREE.NormalBlending;
    } else if (mode === 'SNOW') {
      this.material.size = 0.26;
      this.material.opacity = 0.85;
      this.material.blending = THREE.NormalBlending;
    } else if (mode === 'RUINS_ASH') {
      this.material.size = 0.24;
      this.material.opacity = 0.85;
      this.material.blending = THREE.AdditiveBlending;
    }

    for (let i = 0; i < this.maxParticles; i++) {
      const i3 = i * 3;
      if (mode === 'RAIN') {
        this.velocities[i3] = -1.2 * stormMult;
        this.velocities[i3 + 1] = -(24.0 + Math.random() * 10.0) * stormMult;
        this.velocities[i3 + 2] = -4.0;
        this.colors[i3] = 0.72;
        this.colors[i3 + 1] = 0.86;
        this.colors[i3 + 2] = 1.0;
      } else if (mode === 'SANDSTORM') {
        this.velocities[i3] = (11.0 + Math.random() * 8.0) * stormMult;
        this.velocities[i3 + 1] = -1.2 - Math.random() * 1.4;
        this.velocities[i3 + 2] = -3.0 - Math.random() * 3.0;
        const warm = 0.82 + Math.random() * 0.18;
        this.colors[i3] = warm;
        this.colors[i3 + 1] = warm * 0.68;
        this.colors[i3 + 2] = warm * 0.36;
      } else if (mode === 'SNOW') {
        this.velocities[i3] = (Math.random() - 0.5) * 0.8;
        this.velocities[i3 + 1] = -(2.2 + Math.random() * 1.6);
        this.velocities[i3 + 2] = -0.6;
        this.colors[i3] = 0.94;
        this.colors[i3 + 1] = 0.97;
        this.colors[i3 + 2] = 1.0;
      } else if (mode === 'RUINS_ASH') {
        const isEmber = (i % 4) === 0;
        this.velocities[i3] = (Math.random() - 0.5) * 1.6;
        this.velocities[i3 + 1] = isEmber ? (1.2 + Math.random() * 2.0) : -(1.6 + Math.random() * 1.4);
        this.velocities[i3 + 2] = (Math.random() - 0.5) * 1.2;
        if (isEmber) {
          this.colors[i3] = 1.0;
          this.colors[i3 + 1] = 0.38 + Math.random() * 0.35;
          this.colors[i3 + 2] = 0.08;
        } else {
          const ash = 0.42 + Math.random() * 0.22;
          this.colors[i3] = ash;
          this.colors[i3 + 1] = ash * 0.9;
          this.colors[i3 + 2] = ash * 0.85;
        }
      }
    }
    this.geometry.attributes.color.needsUpdate = true;
  }

  setQualityFactor(factor = 1.0) {
    this.qualityFactor = Math.max(0.25, Math.min(1.0, factor));
    if (this.geometry) {
      this.geometry.setDrawRange(0, Math.floor(this.maxParticles * this.qualityFactor));
    }
  }

  /**
   * Met à jour les particules météo dans la boîte relative à bikeZ.
   * @param {number} delta
   * @param {number} bikeZ
   * @param {number} bikeSpeed
   */
  update(delta, bikeZ, bikeSpeed = 0) {
    if (this.mode === 'NONE' || !this.points.visible) return;
    const dt = Math.min(delta, 0.05);
    this.time += dt;

    const halfW = this.boxWidth * 0.5;
    const minY = 0.2;
    const maxY = this.boxHeight;
    const minZ = bikeZ + this.zBackOffset;
    const maxZ = bikeZ + this.zFrontOffset;
    const depth = this.boxDepth;
    const speedDrag = Math.min(18.0, Math.max(0, bikeSpeed) * 0.45);
    const isSnow = this.mode === 'SNOW';
    const isAsh = this.mode === 'RUINS_ASH';

    const pos = this.positions;
    const vel = this.velocities;
    const phases = this.phases;

    for (let i = 0; i < this.maxParticles; i++) {
      const i3 = i * 3;
      let x = pos[i3] + vel[i3] * dt;
      let y = pos[i3 + 1] + vel[i3 + 1] * dt;
      let z = pos[i3 + 2] + (vel[i3 + 2] - speedDrag) * dt;

      if (isSnow) {
        x += Math.sin(this.time * 2.1 + phases[i]) * 1.45 * dt;
      } else if (isAsh) {
        x += Math.cos(this.time * 1.5 + phases[i]) * 0.95 * dt;
      }

      if (x < -halfW) x += this.boxWidth;
      else if (x > halfW) x -= this.boxWidth;

      if (y < minY) y += (maxY - minY);
      else if (y > maxY) y -= (maxY - minY);

      if (z < minZ) {
        z += depth * Math.ceil((minZ - z) / depth);
      } else if (z > maxZ) {
        z -= depth * Math.ceil((z - maxZ) / depth);
      }

      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    if (this.scene && this.points) {
      this.scene.remove(this.points);
    }
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    if (this._texture) {
      this._texture.dispose();
    }
  }
}

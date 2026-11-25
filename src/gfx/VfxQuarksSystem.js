/**
 * Carnage Cruise - Système VFX GPU Instancié (three.quarks BatchedRenderer)
 * Regroupe explosions, trainées Nitro plasma, étincelles et gerbes en un minimum de draw calls.
 * Respecte le budget thermique mobile (AUTO / HIGH / ECO).
 */

import * as THREE from 'three';
import {
  BatchedRenderer,
  ParticleSystem as QuarksParticleSystem,
  IntervalValue,
  ConstantValue,
  ConstantColor,
  ColorRange,
  ColorOverLife,
  SizeOverLife,
  PiecewiseBezier,
  Bezier,
  SphereEmitter,
  ConeEmitter,
  RenderMode,
  Vector4
} from 'three.quarks';

export class VfxQuarksSystem {
  constructor(scene) {
    this.scene = scene;
    this.qualityTier = 0;
    this.enabled = true;
    this._glowTex = this._createGlowTexture();
    this._sparkTex = this._createSparkTexture();
    this._nitroAccum = 0;

    try {
      this.batchRenderer = new BatchedRenderer();
      this.batchRenderer.frustumCulled = false;
      this.scene.add(this.batchRenderer);
      this._initPools();
    } catch (err) {
      console.warn('[VfxQuarksSystem] Init fallback:', err);
      this.enabled = false;
      this.batchRenderer = null;
    }
  }

  _createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.35, 'rgba(255, 235, 180, 0.85)');
      grad.addColorStop(0.75, 'rgba(255, 140, 40, 0.28)');
      grad.addColorStop(1.0, 'rgba(255, 80, 0, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _createSparkTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 64, 64);
      const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 24);
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.4, 'rgba(180, 245, 255, 0.9)');
      grad.addColorStop(1.0, 'rgba(0, 180, 255, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _createAdditiveMat(map) {
    return new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  _initPools() {
    // 1. Pool d'explosions GPU (4 systèmes réutilisables, zéro allocation en jeu)
    this._explosionPool = [];
    const fireMat = this._createAdditiveMat(this._glowTex);
    const sparkMat = this._createAdditiveMat(this._sparkTex);

    for (let i = 0; i < 4; i++) {
      const firePs = new QuarksParticleSystem({
        duration: 0.75,
        looping: false,
        startLife: new IntervalValue(0.32, 0.65),
        startSpeed: new IntervalValue(4.5, 14.0),
        startSize: new IntervalValue(0.85, 2.1),
        startColor: new ColorRange(new Vector4(1.0, 0.85, 0.35, 1.0), new Vector4(1.0, 0.35, 0.08, 1.0)),
        worldSpace: true,
        maxParticle: 48,
        emissionOverTime: new ConstantValue(0),
        emissionBursts: [{ time: 0, count: new ConstantValue(18), cycle: 1, interval: 0.01, probability: 1 }],
        shape: new SphereEmitter({ radius: 0.6, thickness: 0.9 }),
        material: fireMat,
        renderMode: RenderMode.BillBoard,
        behaviors: [
          new SizeOverLife(new PiecewiseBezier([[new Bezier(0.4, 1.25, 1.0, 0.1), 0]])),
          new ColorOverLife(new ColorRange(new Vector4(1.2, 0.9, 0.4, 1.0), new Vector4(0.35, 0.08, 0.02, 0.0)))
        ]
      });
      firePs.emitter.name = `quarks_explosion_${i}`;
      firePs.stop();
      this.scene.add(firePs.emitter);
      this.batchRenderer.addSystem(firePs);
      this._explosionPool.push(firePs);
    }
    this._explosionIdx = 0;

    // 2. Pool de gerbes d'étincelles / carnage GPU (6 systèmes réutilisables)
    this._sparkPool = [];
    for (let i = 0; i < 6; i++) {
      const sparkPs = new QuarksParticleSystem({
        duration: 0.45,
        looping: false,
        startLife: new IntervalValue(0.22, 0.44),
        startSpeed: new IntervalValue(5.0, 15.0),
        startSize: new IntervalValue(0.22, 0.48),
        startColor: new ConstantColor(new Vector4(1.0, 0.85, 0.3, 1.0)),
        worldSpace: true,
        maxParticle: 36,
        emissionOverTime: new ConstantValue(0),
        emissionBursts: [{ time: 0, count: new ConstantValue(14), cycle: 1, interval: 0.01, probability: 1 }],
        shape: new ConeEmitter({ radius: 0.25, arc: Math.PI * 2, angle: Math.PI / 2.2 }),
        material: sparkMat,
        renderMode: RenderMode.StretchedBillBoard,
        speedFactor: 0.14,
        behaviors: [
          new SizeOverLife(new PiecewiseBezier([[new Bezier(1.0, 0.7, 0.3, 0.0), 0]]))
        ]
      });
      sparkPs.emitter.name = `quarks_spark_${i}`;
      sparkPs.stop();
      this.scene.add(sparkPs.emitter);
      this.batchRenderer.addSystem(sparkPs);
      this._sparkPool.push(sparkPs);
    }
    this._sparkIdx = 0;

    // 3. Système continu de traînée Nitro / Post-combustion
    this._nitroPs = new QuarksParticleSystem({
      duration: 1.0,
      looping: true,
      startLife: new IntervalValue(0.18, 0.32),
      startSpeed: new IntervalValue(4.0, 8.5),
      startSize: new IntervalValue(0.32, 0.62),
      startColor: new ColorRange(new Vector4(0.1, 0.95, 1.0, 0.95), new Vector4(0.0, 0.55, 1.0, 0.9)),
      worldSpace: true,
      maxParticle: 70,
      emissionOverTime: new ConstantValue(0),
      shape: new ConeEmitter({ radius: 0.18, arc: Math.PI * 2, angle: 0.28 }),
      material: sparkMat,
      renderMode: RenderMode.BillBoard,
      behaviors: [
        new SizeOverLife(new PiecewiseBezier([[new Bezier(0.8, 1.15, 0.6, 0.0), 0]])),
        new ColorOverLife(new ColorRange(new Vector4(0.4, 1.0, 1.0, 0.95), new Vector4(0.1, 0.3, 1.0, 0.0)))
      ]
    });
    this._nitroPs.emitter.name = 'quarks_nitro_trail';
    this._nitroPs.emitter.rotation.y = Math.PI;
    this.scene.add(this._nitroPs.emitter);
    this.batchRenderer.addSystem(this._nitroPs);
  }

  setQualityTier(tier = 0) {
    this.qualityTier = tier;
    this.enabled = tier < 2 && !!this.batchRenderer;
    if (!this.enabled && this._nitroPs) {
      this._nitroPs.emissionOverTime = new ConstantValue(0);
    }
  }

  emitExplosion(pos, scale = 1.0) {
    if (!this.enabled || !this._explosionPool?.length || !pos) return;
    const ps = this._explosionPool[this._explosionIdx];
    this._explosionIdx = (this._explosionIdx + 1) % this._explosionPool.length;
    ps.emitter.position.set(pos.x, Math.max(0.4, pos.y + 0.4), pos.z);
    ps.emitter.scale.setScalar(Math.max(0.6, Math.min(2.2, scale)));
    ps.restart();
  }

  emitImpactSparks(pos, isPlasma = false) {
    if (!this.enabled || !this._sparkPool?.length || !pos) return;
    const ps = this._sparkPool[this._sparkIdx];
    this._sparkIdx = (this._sparkIdx + 1) % this._sparkPool.length;
    ps.emitter.position.set(pos.x, Math.max(0.35, pos.y + 0.35), pos.z);
    ps.startColor = new ConstantColor(
      isPlasma ? new Vector4(0.2, 0.95, 1.0, 1.0) : new Vector4(1.0, 0.72, 0.25, 1.0)
    );
    ps.restart();
  }

  updateNitroTrail(active, pos, delta = 0.016) {
    if (!this.enabled || !this._nitroPs) return;
    if (active && pos) {
      this._nitroPs.emitter.position.set(pos.x, pos.y + 0.52, pos.z - 1.75);
      this._nitroAccum += delta;
      if (this._nitroAccum >= (this.qualityTier === 0 ? 0.025 : 0.045)) {
        this._nitroAccum = 0;
        const idx = this._sparkIdx;
        const ps = this._sparkPool[idx];
        this._sparkIdx = (idx + 1) % this._sparkPool.length;
        ps.emitter.position.set(pos.x + (Math.random() - 0.5) * 0.35, pos.y + 0.5, pos.z - 1.85);
        ps.startColor = new ConstantColor(new Vector4(0.15, 0.95, 1.0, 0.95));
        ps.restart();
      }
    }
  }

  update(delta) {
    if (!this.enabled || !this.batchRenderer) return;
    const safeDt = Math.min(Math.max(delta || 0, 0), 0.05);
    this.batchRenderer.update(safeDt);
  }

  dispose() {
    if (this.batchRenderer) {
      this.scene.remove(this.batchRenderer);
    }
    [...(this._explosionPool || []), ...(this._sparkPool || []), this._nitroPs].forEach((ps) => {
      if (ps && ps.emitter) {
        this.scene.remove(ps.emitter);
      }
      if (ps && typeof ps.dispose === 'function') {
        ps.dispose();
      }
    });
    if (this._glowTex) this._glowTex.dispose();
    if (this._sparkTex) this._sparkTex.dispose();
    this._explosionPool = [];
    this._sparkPool = [];
    this._nitroPs = null;
  }
}

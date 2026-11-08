/**
 * Motormageddon - Moteur de Rendu Tactique PixiJS (v8) GPU
 * Accélération matérielle WebGL2/WebGPU pour les simulations de frappes militaires d'extermination :
 * Filtres GPU natifs (Night Vision, Predator Thermal, Inversion Negative, Shaders de saturation),
 * Rendu additif (blendMode = 'add') pour halos et faisceaux d'énergie ionique,
 * et cycle de vie propre avec libération immédiate des contextes GPU.
 */

import { Application, Container, Graphics, ColorMatrixFilter, BlurFilter } from 'pixi.js';

export class WmdPixiRenderer {
  constructor() {
    this.app = null;
    this.stage = null;
    this.colorFilter = null;
    this.blurFilter = null;
    this.isReady = false;

    // Couches graphiques Pixi
    this.mapLayer = null;
    this.thermalLayer = null;
    this.fxLayer = null;
    this.filterContainer = null;

    this.civilians = [];
  }

  async init(parentContainer, width, height) {
    try {
      this.app = new Application();
      await this.app.init({
        width: width,
        height: height,
        resolution: Math.min(window.devicePixelRatio || 1, 1.25),
        autoDensity: true,
        backgroundAlpha: 1,
        backgroundColor: 0x050a14,
        preference: 'webgl'
      });

      if (this.app.canvas && parentContainer) {
        this.app.canvas.style.position = 'absolute';
        this.app.canvas.style.inset = '0';
        this.app.canvas.style.width = '100%';
        this.app.canvas.style.height = '100%';
        this.app.canvas.style.display = 'block';
        this.app.canvas.style.zIndex = '2'; // Au-dessus du canvas 2D fallback
        parentContainer.appendChild(this.app.canvas);
      }

      this.isReady = true;

      // 1. Conteneur principal avec filtres GPU
      this.filterContainer = new Container();
      this.colorFilter = new ColorMatrixFilter();
      this.colorFilter.night(0.65); // Mode vision nocturne militaire initiale
      this.filterContainer.filters = [this.colorFilter];

      this.app.stage.addChild(this.filterContainer);

      // 2. Couche Carte & Rues (GPU vectoriel)
      this.mapLayer = new Graphics();
      this.filterContainer.addChild(this.mapLayer);

      // 3. Couche Signatures Thermiques Civiles
      this.thermalLayer = new Graphics();
      this.filterContainer.addChild(this.thermalLayer);

      // 4. Couche Effets Spéciaux / Blast / Plasmas (Rendu Additif Lumineux)
      this.fxLayer = new Graphics();
      this.fxLayer.blendMode = 'add'; // Fusion additive GPU : les faisceaux et flammes brillent intensément
      this.filterContainer.addChild(this.fxLayer);

      // 5. Initialiser les signatures thermiques civiles
      this.initThermalSignatures(width, height);
      this.drawVectorMap(width, height);

      return true;
    } catch (err) {
      console.warn('WmdPixiRenderer init failed, falling back:', err);
      this.isReady = false;
      return false;
    }
  }

  initThermalSignatures(w, h) {
    this.civilians = [];
    const count = 420;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.48;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.65) * maxR;
      this.civilians.push({
        x: cx + Math.cos(angle) * dist + (Math.random() - 0.5) * 12,
        y: cy + Math.sin(angle) * dist + (Math.random() - 0.5) * 12,
        alive: true,
        distToCenter: dist,
        size: Math.random() < 0.25 ? 3.5 : 2.2,
        color: dist < maxR * 0.35 ? 0xff5252 : (dist < maxR * 0.7 ? 0xfffa65 : 0x00d2d3)
      });
    }
  }

  drawVectorMap(w, h) {
    if (!this.mapLayer) return;
    this.mapLayer.clear();

    const cx = w / 2;
    const cy = h / 2;

    // Fleuve sinueux avec berges
    this.mapLayer.circle(cx, cy, Math.min(w, h) * 0.46);
    this.mapLayer.fill({ color: 0x07111e, alpha: 0.95 });
    this.mapLayer.stroke({ color: 0x00d2d3, width: 2, alpha: 0.4 });

    // Riviere
    this.mapLayer.moveTo(0, cy + h * 0.22);
    this.mapLayer.bezierCurveTo(
      w * 0.35, cy - h * 0.15,
      w * 0.68, cy + h * 0.28,
      w, cy - h * 0.08
    );
    this.mapLayer.stroke({ color: 0x0984e3, width: 22, alpha: 0.55 });

    // Réseau de boulevards concentriques
    const rings = [0.15, 0.28, 0.42];
    rings.forEach(rFrac => {
      this.mapLayer.circle(cx, cy, Math.min(w, h) * rFrac);
      this.mapLayer.stroke({ color: 0x74b9ff, width: 1.5, alpha: 0.35 });
    });

    // Avenues radiales (8 rayons)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const rx = cx + Math.cos(a) * Math.min(w, h) * 0.45;
      const ry = cy + Math.sin(a) * Math.min(w, h) * 0.45;
      this.mapLayer.moveTo(cx, cy);
      this.mapLayer.lineTo(rx, ry);
      this.mapLayer.stroke({ color: 0x74b9ff, width: 1.2, alpha: 0.3 });
    }
  }

  renderFrame(phase, weaponType, progress, shockwaveRadius, w, h) {
    if (!this.isReady || !this.app) return;

    const cx = w / 2;
    const cy = h / 2;

    // 1. Mise à jour des filtres GPU dynamiques selon la phase
    if (this.colorFilter) {
      if (phase === 'COUNTDOWN') {
        this.colorFilter.night(0.7);
      } else if (phase === 'DETONATION' && shockwaveRadius < 90) {
        // Flash d'inversion négative aveuglante
        this.colorFilter.negative(true);
      } else if (phase === 'DETONATION') {
        // Vision thermique predator en pleine déflagration
        this.colorFilter.predator(0.85);
      } else if (phase === 'EXTERMINATED') {
        // Cendres et ruines en noir et blanc contrasté
        this.colorFilter.blackAndWhite(true);
      }
    }

    // 2. Mise à jour des signatures thermiques
    if (this.thermalLayer) {
      this.thermalLayer.clear();
      for (let c of this.civilians) {
        if (c.alive && shockwaveRadius > 0 && c.distToCenter <= shockwaveRadius) {
          c.alive = false;
        }

        if (c.alive) {
          this.thermalLayer.circle(c.x, c.y, c.size);
          this.thermalLayer.fill({ color: c.color, alpha: 0.88 });
        } else {
          // Point mort (cendre sombre)
          this.thermalLayer.circle(c.x, c.y, 1.2);
          this.thermalLayer.fill({ color: 0x2d3436, alpha: 0.45 });
        }
      }
    }

    // 3. Mise à jour des effets spéciaux GPU (fxLayer avec fusion additive)
    if (this.fxLayer) {
      this.fxLayer.clear();

      if (phase === 'COUNTDOWN') {
        // Réticule holographique de ciblage laser
        const pulseR = 38 + Math.sin(Date.now() * 0.008) * 6;
        this.fxLayer.circle(cx, cy, pulseR);
        this.fxLayer.stroke({ color: 0xff3838, width: 2, alpha: 0.85 });
        this.fxLayer.moveTo(cx - 50, cy); this.fxLayer.lineTo(cx + 50, cy);
        this.fxLayer.moveTo(cx, cy - 50); this.fxLayer.lineTo(cx, cy + 50);
        this.fxLayer.stroke({ color: 0xff4d4d, width: 1.5, alpha: 0.7 });
      }

      if (phase === 'DETONATION' || phase === 'EXTERMINATED') {
        if (weaponType === 'NUKE') {
          // Onde de choc circulaire incandescente
          this.fxLayer.circle(cx, cy, shockwaveRadius);
          this.fxLayer.stroke({ color: 0xfffa65, width: 8, alpha: Math.max(0, 1 - shockwaveRadius / (w * 0.6)) });

          // Halo thermique central
          this.fxLayer.circle(cx, cy, Math.min(shockwaveRadius * 0.7, 180));
          this.fxLayer.fill({ color: 0xff3838, alpha: Math.max(0, 0.75 - shockwaveRadius / (w * 0.8)) });

          // Cœur de plasma blanc solaire
          this.fxLayer.circle(cx, cy, Math.min(shockwaveRadius * 0.35, 75));
          this.fxLayer.fill({ color: 0xffffff, alpha: 0.95 });
        } else if (weaponType === 'ORBITAL') {
          // Pilier d'énergie ionique vertical pur
          const beamW = 60 + Math.sin(Date.now() * 0.04) * 8;
          this.fxLayer.rect(cx - beamW / 2, 0, beamW, h);
          this.fxLayer.fill({ color: 0x00cec9, alpha: 0.85 });
          this.fxLayer.rect(cx - beamW * 0.25, 0, beamW * 0.5, h);
          this.fxLayer.fill({ color: 0xffffff, alpha: 0.95 });

          // Anneaux d'arcs EMP de dispersion
          this.fxLayer.circle(cx, cy, shockwaveRadius);
          this.fxLayer.stroke({ color: 0x74b9ff, width: 5, alpha: 0.8 });
        } else if (weaponType === 'CARPET') {
          // Anneaux multiples d'explosions en chapelet
          for (let i = 0; i < 6; i++) {
            const ox = (i - 2.5) * 45;
            const oy = (i % 2 === 0 ? 1 : -1) * 25;
            this.fxLayer.circle(cx + ox, cy + oy, Math.max(8, (shockwaveRadius * 0.35) - i * 10));
            this.fxLayer.fill({ color: 0xff9f43, alpha: 0.65 });
            this.fxLayer.stroke({ color: 0xfffa65, width: 3, alpha: 0.8 });
          }
        } else if (weaponType === 'BIO') {
          // Nappes toxiques de gaz neuro-toxique vert émeraude
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
            const gx = cx + Math.cos(a) * (shockwaveRadius * 0.65);
            const gy = cy + Math.sin(a) * (shockwaveRadius * 0.65);
            this.fxLayer.circle(gx, gy, shockwaveRadius * 0.45);
            this.fxLayer.fill({ color: 0x2ed573, alpha: 0.45 });
          }
        }
      }
    }
  }

  destroy() {
    this.isReady = false;
    if (this.app) {
      try {
        if (this.app.canvas && this.app.canvas.parentNode) {
          this.app.canvas.parentNode.removeChild(this.app.canvas);
        }
        this.app.destroy(true, { children: true, texture: true, context: true });
      } catch (err) {
        console.warn('WmdPixiRenderer destroy error:', err);
      }
      this.app = null;
    }
    this.mapLayer = null;
    this.thermalLayer = null;
    this.fxLayer = null;
    this.filterContainer = null;
    this.civilians = [];
  }
}

/**
 * Carnage Cruise - Moteur de Rendu Tactique PixiJS (v8) GPU
 * Accélération matérielle WebGL2/WebGPU pour les simulations de frappes militaires d'extermination :
 * - Rendu Additif Lumineux GPU (blendMode = 'add') pour lasers, plasmas, ondes de choc et boules de feu.
 * - Filtres Shader GPU (Vision Nocturne militaire, Inversion Négative thermique, Predator, Noir & Blanc).
 * - Canvas transparent (backgroundAlpha = 0) au-dessus du canvas 2D tactique haute définition.
 * - Cycle de vie propre avec libération sécurisée de la mémoire GPU.
 */

import { Application, Container, Graphics, ColorMatrixFilter } from 'pixi.js';

export class WmdPixiRenderer {
  constructor() {
    this.app = null;
    this.stage = null;
    this.colorFilter = null;
    this.isReady = false;
    this.currentPhase = null;

    // Couches graphiques Pixi
    this.filterContainer = null;
    this.gridLayer = null;
    this.fxLayer = null;
  }

  async init(parentContainer, width, height) {
    try {
      this.app = new Application();
      await this.app.init({
        width: width,
        height: height,
        resolution: Math.min(window.devicePixelRatio || 1, 1.25),
        autoDensity: true,
        backgroundAlpha: 0, // Transparent pour laisser transparaître le canvas 2D haute fidélité
        preference: 'webgl'
      });

      if (this.app.canvas && parentContainer) {
        this.app.canvas.style.position = 'absolute';
        this.app.canvas.style.inset = '0';
        this.app.canvas.style.width = '100%';
        this.app.canvas.style.height = '100%';
        this.app.canvas.style.display = 'block';
        this.app.canvas.style.zIndex = '2'; // Juste au-dessus du canvas 2D tactique
        this.app.canvas.style.pointerEvents = 'none'; // Clics transparents pour l'interface HUD
        parentContainer.appendChild(this.app.canvas);
      }

      this.isReady = true;

      // 1. Conteneur principal avec filtres GPU
      this.filterContainer = new Container();
      this.colorFilter = new ColorMatrixFilter();
      this.colorFilter.night(0.6, false); // Mode vision nocturne militaire initiale
      this.currentPhase = 'APPROACH';
      this.filterContainer.filters = [this.colorFilter];

      this.app.stage.addChild(this.filterContainer);

      // 2. Couche Réticule Vectoriel & Radar KH-12
      this.gridLayer = new Graphics();
      this.filterContainer.addChild(this.gridLayer);

      // 3. Couche Effets Spéciaux / Plasmas / Lasers (Rendu Additif Lumineux)
      this.fxLayer = new Graphics();
      this.fxLayer.blendMode = 'add'; // Fusion additive GPU : halos et faisceaux brillent intensément
      this.filterContainer.addChild(this.fxLayer);

      this.drawVectorOverlay(width, height);

      return true;
    } catch (err) {
      console.warn('WmdPixiRenderer init failed, continuing in 2D canvas mode:', err);
      this.isReady = false;
      return false;
    }
  }

  drawVectorOverlay(w, h) {
    if (!this.gridLayer) return;
    try {
      this.gridLayer.clear();
      const cx = w / 2;
      const cy = h / 2;

      // Anneau radar de ciblage militaire
      this.gridLayer.circle(cx, cy, Math.min(w, h) * 0.44);
      this.gridLayer.stroke({ color: 0x00cec9, width: 1.5, alpha: 0.35 });

      this.gridLayer.circle(cx, cy, Math.min(w, h) * 0.22);
      this.gridLayer.stroke({ color: 0x00cec9, width: 1.0, alpha: 0.25 });

      // Réticule d'acquisition satellite KH-12
      const len = 35;
      this.gridLayer.moveTo(cx - len, cy);
      this.gridLayer.lineTo(cx + len, cy);
      this.gridLayer.moveTo(cx, cy - len);
      this.gridLayer.lineTo(cx, cy + len);
      this.gridLayer.stroke({ color: 0x00cec9, width: 1.2, alpha: 0.4 });
    } catch (e) {
      // Ignorer silencieusement si contexte restreint
    }
  }

  renderFrame(phase, weaponType, progress, shockwaveRadius, w, h) {
    if (!this.isReady || !this.app) return;

    try {
      const cx = w / 2;
      const cy = h / 2;

      // 1. Mise à jour des filtres GPU lors des transitions de phase
      if (this.colorFilter && this.currentPhase !== phase) {
        this.currentPhase = phase;
        if (phase === 'APPROACH' || phase === 'COUNTDOWN') {
          this.colorFilter.night(0.6, false);
        } else if (phase === 'DETONATION') {
          this.colorFilter.predator(0.7, false);
        } else if (phase === 'EXTERMINATED') {
          this.colorFilter.blackAndWhite(false);
        }
      }

      // 2. Mise à jour des effets spéciaux GPU (fxLayer avec fusion additive)
      if (this.fxLayer) {
        this.fxLayer.clear();

        // --- PHASE D'APPROCHE ---
        if (phase === 'APPROACH' || phase === 'COUNTDOWN') {
          const pulseR = 36 + Math.sin(Date.now() * 0.009) * 7;
          this.fxLayer.circle(cx, cy, pulseR);
          this.fxLayer.stroke({ color: 0xff3838, width: 2, alpha: 0.85 });

          // Croix de verrouillage laser
          this.fxLayer.moveTo(cx - 45, cy); this.fxLayer.lineTo(cx + 45, cy);
          this.fxLayer.moveTo(cx, cy - 45); this.fxLayer.lineTo(cx, cy + 45);
          this.fxLayer.stroke({ color: 0xff4d4d, width: 1.5, alpha: 0.75 });
        }

        // --- PHASE DE DÉTONATION ET EXTINCTION ---
        else if (phase === 'DETONATION' || phase === 'EXTERMINATED') {
          if (weaponType === 'NUKE') {
            // Onde de choc thermique circulaire incandescente
            if (shockwaveRadius > 0) {
              const ringAlpha = Math.max(0, 1 - (shockwaveRadius / (Math.max(w, h) * 0.85)));
              this.fxLayer.circle(cx, cy, shockwaveRadius);
              this.fxLayer.stroke({ color: 0xfffa65, width: 7, alpha: ringAlpha });

              // Halo thermique incandescent central
              const haloR = Math.min(shockwaveRadius * 0.65, 200);
              this.fxLayer.circle(cx, cy, haloR);
              this.fxLayer.fill({ color: 0xff3838, alpha: Math.max(0, 0.7 - (shockwaveRadius / (Math.max(w, h) * 0.9))) });

              // Cœur de plasma blanc solaire ultra-lumineux
              const coreR = Math.min(shockwaveRadius * 0.3, 70);
              this.fxLayer.circle(cx, cy, coreR);
              this.fxLayer.fill({ color: 0xffffff, alpha: 0.95 });
            }
          } else if (weaponType === 'ORBITAL') {
            // Faisceau ionique vertical pur (rendu additif éclatant)
            const beamW = 60 + Math.sin(Date.now() * 0.05) * 12;
            this.fxLayer.rect(cx - beamW / 2, 0, beamW, h);
            this.fxLayer.fill({ color: 0x00cec9, alpha: 0.85 });

            // Cœur de plasma blanc aveuglant
            this.fxLayer.rect(cx - beamW * 0.22, 0, beamW * 0.44, h);
            this.fxLayer.fill({ color: 0xffffff, alpha: 0.98 });

            // Anneaux d'onde EMP cyan en expansion
            if (shockwaveRadius > 0) {
              this.fxLayer.circle(cx, cy, shockwaveRadius);
              this.fxLayer.stroke({ color: 0x74b9ff, width: 5, alpha: 0.85 });
            }
          } else if (weaponType === 'CARPET') {
            // Éruptions multiples en cascade napalm/MOAB
            for (let i = 0; i < 6; i++) {
              const ox = (i - 2.5) * 48;
              const oy = (i % 2 === 0 ? 1 : -1) * 26;
              const subR = Math.max(6, (shockwaveRadius * 0.32) - i * 8);
              if (subR > 0) {
                this.fxLayer.circle(cx + ox, cy + oy, subR);
                this.fxLayer.fill({ color: 0xff9f43, alpha: 0.65 });
                this.fxLayer.stroke({ color: 0xfffa65, width: 2.5, alpha: 0.85 });
              }
            }
          } else if (weaponType === 'BIO') {
            // Halos néon de brumisation neuro-toxique
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
              const gx = cx + Math.cos(a) * (shockwaveRadius * 0.6);
              const gy = cy + Math.sin(a) * (shockwaveRadius * 0.6);
              this.fxLayer.circle(gx, gy, Math.max(10, shockwaveRadius * 0.4));
              this.fxLayer.fill({ color: 0x2ed573, alpha: 0.4 });
            }
          }
        }
      }
    } catch (err) {
      // Prévention absolue de crash pour garantir la continuité du cycle
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
    this.gridLayer = null;
    this.fxLayer = null;
    this.filterContainer = null;
  }
}

/**
 * Motormageddon - Banque d'échantillons audio réels (OGG CC0 Kenney).
 * Chargement différé + cache de décodage, lecture avec variations de pitch
 * aléatoires pour éviter la fatigue auditive, couches optionnelles enrichies.
 * Fallback : chaque appel SoundManager conserve sa synthèse procédurale
 * d'origine si l'échantillon n'est pas (encore) chargé ou pas décodable.
 */

// Génère une liste de noms de fichiers numérotés : pad('impactMetal_heavy', 0, 4) -> 5 entrées
function range(base, from, to, pad3 = 3) {
  const out = [];
  for (let i = from; i <= to; i++) {
    const n = String(i).padStart(pad3, '0');
    out.push(base.endsWith('.ogg') ? base.replace('.ogg', `_${n}.ogg`) : `${base}_${n}.ogg`);
  }
  return out;
}

// Manifeste : clé -> liste de couches { dir, files, vol, rate:[min,max], chance }
const SRC = (dir, names) => [{ dir, files: names }];

const IMPACT = 'impact', INTERFACE = 'interface', SCIFI = 'scifi',
  CASINO = 'casino', UI = 'ui';

export const SAMPLE_MANIFEST = {
  // --- UI ---
  click: { layers: SRC(INTERFACE, ['click_001.ogg', 'click_002.ogg', 'click_003.ogg', 'click_004.ogg', 'click_005.ogg']), vol: 0.55, rate: [0.95, 1.08] },
  clickAlt: { layers: SRC(UI, ['click1.ogg', 'click2.ogg', 'click3.ogg', 'click4.ogg']), vol: 0.5, rate: [0.95, 1.08] },
  clickGarage: { layers: SRC(INTERFACE, ['back_002.ogg', 'back_003.ogg', 'back_004.ogg']), vol: 0.6, rate: [0.95, 1.05] },
  clickHero: { layers: SRC(INTERFACE, ['confirmation_001.ogg', 'confirmation_002.ogg']), vol: 0.45, rate: [0.98, 1.05] },
  select: { layers: SRC(INTERFACE, ['select_002.ogg', 'select_003.ogg', 'select_004.ogg', 'select_005.ogg']), vol: 0.55, rate: [0.95, 1.08] },

  // --- Gameplay ---
  coin: { layers: [{ dir: CASINO, files: ['chips-stack-1.ogg', 'chips-stack-2.ogg', 'chips-stack-3.ogg', 'chips-stack-4.ogg', 'chips-stack-5.ogg', 'chips-stack-6.ogg'], vol: 0.55, rate: [1.05, 1.3] }] },
  tick: { layers: [{ dir: INTERFACE, files: ['tick_001.ogg', 'tick_002.ogg', 'tick_004.ogg'], vol: 0.4, rate: [1.0, 1.2] }] },
  confirm: { layers: SRC(INTERFACE, ['confirmation_001.ogg', 'confirmation_002.ogg', 'confirmation_003.ogg', 'confirmation_004.ogg']), vol: 0.6, rate: [0.95, 1.12] },
  victory: {
    layers: [
      { dir: INTERFACE, files: ['confirmation_001.ogg', 'confirmation_003.ogg', 'confirmation_004.ogg'], vol: 0.65, rate: [0.95, 1.05] },
      { dir: IMPACT, files: ['impactBell_heavy_000.ogg', 'impactBell_heavy_001.ogg', 'impactBell_heavy_002.ogg'], vol: 0.3, rate: [1.1, 1.3] }
    ]
  },
  error: { layers: SRC(INTERFACE, ['error_001.ogg', 'error_002.ogg', 'error_003.ogg', 'error_004.ogg']), vol: 0.55, rate: [0.9, 1.05] },

  // --- Impacts ---
  crash: {
    layers: [
      { dir: IMPACT, files: range('impactMetal_heavy', 0, 4), vol: 0.85, rate: [0.88, 1.08] },
      { dir: IMPACT, files: range('impactPunch_heavy', 0, 4), vol: 0.5, rate: [0.5, 0.62], chance: 0.7 },
      { dir: IMPACT, files: range('impactGlass_heavy', 0, 4), vol: 0.4, rate: [0.9, 1.1], chance: 0.45 },
      { dir: INTERFACE, files: ['glass_001.ogg', 'glass_002.ogg', 'glass_003.ogg', 'glass_004.ogg'], vol: 0.3, rate: [0.9, 1.15], chance: 0.3 }
    ]
  },
  smash: { layers: [{ dir: IMPACT, files: [...range('impactWood_heavy', 0, 4), ...range('impactGlass_heavy', 0, 4)], vol: 0.8, rate: [0.85, 1.1] }] },
  explosion: {
    layers: [
      { dir: SCIFI, files: range('explosionCrunch', 0, 4), vol: 0.9, rate: [0.85, 1.05] },
      { dir: SCIFI, files: ['lowFrequency_explosion_000.ogg', 'lowFrequency_explosion_001.ogg'], vol: 0.75, rate: [0.9, 1.05], chance: 0.55 }
    ]
  },
  cannon: {
    layers: [
      { dir: IMPACT, files: range('impactPlate_heavy', 0, 4), vol: 0.9, rate: [0.6, 0.72] },
      { dir: SCIFI, files: range('explosionCrunch', 0, 4), vol: 0.55, rate: [1.05, 1.25], chance: 0.6 }
    ]
  },
  thud: { layers: [{ dir: IMPACT, files: range('impactPunch_heavy', 0, 4), vol: 0.8, rate: [0.5, 0.62] }] },
  curb: {
    layers: [
      { dir: IMPACT, files: range('impactMetal_light', 0, 4), vol: 0.7, rate: [0.75, 0.95] },
      { dir: IMPACT, files: range('impactPunch_heavy', 0, 4), vol: 0.45, rate: [0.5, 0.6], chance: 0.5 }
    ]
  },
  avalanche: {
    layers: [
      { dir: IMPACT, files: range('impactMining', 0, 4), vol: 0.9, rate: [0.8, 1.0] },
      { dir: SCIFI, files: range('explosionCrunch', 0, 4), vol: 0.4, rate: [0.7, 0.9], chance: 0.35 }
    ]
  },
  thruster: { layers: [{ dir: SCIFI, files: ['thrusterFire_000.ogg', 'thrusterFire_001.ogg', 'thrusterFire_002.ogg'], vol: 0.75, rate: [1.0, 1.12] }] }
};

export class SampleBank {
  constructor(soundManager) {
    this.sm = soundManager;
    this.buffers = new Map();   // path -> AudioBuffer | null (null = échec décodage)
    this.loadPromise = null;
    this.playToggles = new Map(); // clé de rotation anti-redondance
  }

  preload() {
    if (this.loadPromise || !this.sm.ctx) return this.loadPromise || Promise.resolve();
    const paths = [];
    for (const key of Object.keys(SAMPLE_MANIFEST)) {
      for (const layer of SAMPLE_MANIFEST[key].layers) {
        for (const file of layer.files) paths.push(`${layer.dir}/${file}`);
      }
    }
    const unique = [...new Set(paths)];
    const base = `${import.meta.env.BASE_URL}audio/`;
    this.loadPromise = Promise.all(unique.map(async (p) => {
      try {
        const res = await fetch(base + p);
        if (!res.ok) throw new Error(res.status);
        const buf = await this.sm.ctx.decodeAudioData(await res.arrayBuffer());
        this.buffers.set(p, buf);
      } catch {
        this.buffers.set(p, null); // repli procédural pour ce son
      }
    }));
    return this.loadPromise;
  }

  isReady() {
    return !!this.loadPromise;
  }

  /**
   * Chaîne d'éq « présence » : les packs d'impact CC0 sont très proches du micro
   * (sourds). Un lift aigu + presence rend les échantillons clairs dans le mix
   * du moteur rugissant, sans toucher à la synthèse procédurale.
   */
  _ensureFilters() {
    if (this.presence || !this.sm.ctx) return;
    const ctx = this.sm.ctx;
    // 1. Bande de présence 3.2kHz (attaque/lisibilité)
    const peaking = ctx.createBiquadFilter();
    peaking.type = 'peaking';
    peaking.frequency.value = 3200;
    peaking.Q.value = 0.7;
    peaking.gain.value = 3.0;
    // 2. Shelf aigu global (brillance/clarté)
    const shelf = ctx.createBiquadFilter();
    shelf.type ='highshelf';
    shelf.frequency.value = 2400;
    shelf.gain.value = 4.0;
    peaking.connect(shelf);
    shelf.connect(this.sm.getMasterOutput());
    this.presence = peaking;
  }

  /**
   * Lecture synchrone si buffers prêts, sinon false (appelle la synthèse de secours).
   * opts : { volMul, rateMul, noVariation }
   */
  play(key, opts = {}) {
    const entry = SAMPLE_MANIFEST[key];
    if (!entry || !this.sm.ctx || this.sm.isDestroyed) return false;

    let allReady = true;
    for (const layer of entry.layers) {
      for (const file of layer.files) {
        if (!this.buffers.has(`${layer.dir}/${file}`)) { allReady = false; break; }
      }
    }
    if (!allReady) { this.preload(); return false; } // précharge, repli synthèse ce tour

    this._ensureFilters();
    const out = this.sm.getMasterOutput();
    const route = this.presence || out;
    if (!out) return false;
    const now = this.sm.ctx.currentTime;
    const rotation = (this.playToggles.get(key) || 0) + 1;
    this.playToggles.set(key, rotation);

    for (const layer of entry.layers) {
      if (layer.chance !== undefined && Math.random() > layer.chance) continue;
      const file = layer.files[(Math.random() * layer.files.length) | 0];
      const path = `${layer.dir}/${file}`;
      const buffer = this.buffers.get(path);
      if (!buffer) continue;

      const src = this.sm.ctx.createBufferSource();
      src.buffer = buffer;

      // vol/rate peuvent être définis au niveau de la le couche OU de la clé
      const vol = (layer.vol !== undefined ? layer.vol : entry.vol) ?? 0.6;
      const rateRange = layer.rate || entry.rate || [0.95, 1.05];
      const variation = opts.noVariation ? 1 : (rateRange[0] + Math.random() * (rateRange[1] - rateRange[0]));
      const rateMul = opts.rateMul || 1;
      src.playbackRate.value = Number.isFinite(variation * rateMul) ? variation * rateMul : 1;

      const gain = this.sm.ctx.createGain();
      gain.gain.value = Number.isFinite(vol * (opts.volMul || 1)) ? vol * (opts.volMul || 1) : 0.5;

      src.connect(gain);
      gain.connect(route);
      src.onended = () => {
        try { src.disconnect(); gain.disconnect(); } catch { /* nœud déjà libéré */ }
      };
      src.start(now);
    }
    return true;
  }
}

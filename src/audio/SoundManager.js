/**
 * Carnage Cruise - Moteur Audio Procédural WebAudio Haute Performance
 * Sons cartoon, ambiance moteur réactive et musique arcade rétro-dynamique.
 * Gestion mémoire stricte, déconnexion des nœuds audio et cycle de vie Android (Background/Pause/Exit).
 */

import { storage } from '../core/Storage.js';
import { App } from '@capacitor/app';
import { SampleBank } from './SampleBank.js';

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMutedSfx = !storage.data.settings.sfx;
    this.isMutedMusic = !storage.data.settings.music;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.musicPlaying = false;
    this.wasMusicPlaying = false;
    this.wasEnginePlaying = false;
    this.musicTimer = null;
    this.isDestroyed = false;
    this._sfxCooldowns = new Map();

    this.initContext();
    this.bindLifecycleEvents();

    // Échantillons audio réels (CC0) avec repli procédural automatique
    this.samples = new SampleBank(this);
    this.samples.preload();
  }

  canPlaySfx(key, minIntervalMs = 70) {
    const now = performance.now();
    const last = this._sfxCooldowns.get(key) || 0;
    if (now - last < minIntervalMs) return false;
    this._sfxCooldowns.set(key, now);
    return true;
  }

  /** Tente de jouer un échantillon réel ; false = la synthèse procédurale prend le relais */
  trySample(key, opts) {
    if (!this.canPlaySfx(key, opts?.cooldownMs || 65)) return true;
    if (!this.samples) return false;
    return this.samples.play(key, opts);
  }

  initContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass && !this.ctx) {
      this.ctx = new AudioContextClass();

      // Master Dynamics Compressor & Limiteur Studio pour un son pur, percutant et sans distorsion mobile
      this.masterCompressor = this.ctx.createDynamicsCompressor();
      this.masterCompressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.masterCompressor.knee.setValueAtTime(8, this.ctx.currentTime);
      this.masterCompressor.ratio.setValueAtTime(5, this.ctx.currentTime);
      this.masterCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.masterCompressor.release.setValueAtTime(0.12, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.92, this.ctx.currentTime);

      this.masterCompressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Bus musical d�di� avec r�verb/delay pour un son spatial et professionnel
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.setValueAtTime(1.0, this.ctx.currentTime);

      // Delay feedback (r�verb simple et l�g�re)
      this.musicDelay = this.ctx.createDelay(1.0);
      this.musicDelay.delayTime.setValueAtTime(0.28, this.ctx.currentTime);

      this.musicFeedback = this.ctx.createGain();
      this.musicFeedback.gain.setValueAtTime(0.35, this.ctx.currentTime);

      this.musicWetGain = this.ctx.createGain();
      this.musicWetGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

      this.musicDryGain = this.ctx.createGain();
      this.musicDryGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      // Routage : musicBus -> dry -> masterCompressor
      //           musicBus -> delay -> feedback -> delay (boucle) -> wet -> masterCompressor
      this.musicBus.connect(this.musicDryGain);
      this.musicDryGain.connect(this.masterCompressor);

      this.musicBus.connect(this.musicDelay);
      this.musicDelay.connect(this.musicFeedback);
      this.musicFeedback.connect(this.musicDelay);
      this.musicDelay.connect(this.musicWetGain);
      this.musicWetGain.connect(this.masterCompressor);
    }
  }

  getMasterOutput() {
    if (!this.ctx) this.initContext();
    return this.masterCompressor || (this.ctx ? this.ctx.destination : null);
  }

  getMusicOutput() {
    if (!this.ctx) this.initContext();
    if (!this.musicBus) this.initContext();
    return this.musicBus || this.getMasterOutput();
  }

  resumeContext() {
    if (this.isDestroyed) return;
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  bindLifecycleEvents() {
    // 1. Visibilité du document (changement d'onglet ou minimisation mobile)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleAppPause();
      } else {
        this.handleAppResume();
      }
    });

    // 2. Déchargement de page / fermeture d'app
    window.addEventListener('pagehide', () => this.destroy());
    window.addEventListener('beforeunload', () => this.destroy());

    // 3. Cycle de vie natif Capacitor (Android / iOS)
    try {
      App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          this.handleAppPause();
        } else {
          this.handleAppResume();
        }
      });
      App.addListener('pause', () => this.handleAppPause());
      App.addListener('resume', () => this.handleAppResume());
    } catch (e) {
      // Navigateur web classique
    }
  }

  handleAppPause() {
    if (this.isDestroyed) return;
    this.wasMusicPlaying = this.musicPlaying;
    this.wasEnginePlaying = !!this.engineOsc;

    this.stopEngine();
    this.stopMusic();

    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  handleAppResume() {
    if (this.isDestroyed) return;
    this.resumeContext();

    if (this.wasMusicPlaying && !this.isMutedMusic) {
      this.startMusic();
    }
  }

  destroy() {
    this.isDestroyed = true;
    this.stopEngine();
    this.stopMusic();

    if (this.ctx) {
      try {
        this.ctx.close().catch(() => {});
      } catch (e) {}
      this.ctx = null;
    }
  }

  // Utilitaire de nettoyage automatique des nœuds éphémères pour libérer la mémoire
  cleanupNodes(...nodes) {
    nodes.forEach(node => {
      if (node && typeof node.disconnect === 'function') {
        try {
          node.disconnect();
        } catch (e) {}
      }
    });
  }

  // --- EFFETS SONORES (SFX) ---

  playPedestrianReaction(category = 'man') {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    // Cri sadique d'effroi procédural (Horreur FM, Comique ou Burlesque)
    this.playSadisticScream();

    const now = this.ctx.currentTime;

    // 1. Choc physique réaliste (Bruit sourd d'impact corporel)
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(110, now);
    thudOsc.frequency.exponentialRampToValueAtTime(35, now + 0.12);
    thudGain.gain.setValueAtTime(0.5, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    thudOsc.connect(thudGain);
    thudGain.connect(this.ctx.destination);
    thudOsc.onended = () => this.cleanupNodes(thudOsc, thudGain);
    thudOsc.start(now);
    thudOsc.stop(now + 0.14);

    // 2. Réaction vocale humaine réaliste selon la catégorie
    const voiceOsc = this.ctx.createOscillator();
    const voiceGain = this.ctx.createGain();
    const formantFilter = this.ctx.createBiquadFilter();
    formantFilter.type = 'bandpass';

    if (category === 'child') {
      // ENFANT : Voix aiguë surprise (680Hz -> 460Hz)
      voiceOsc.type = 'sawtooth';
      voiceOsc.frequency.setValueAtTime(680, now);
      voiceOsc.frequency.exponentialRampToValueAtTime(460, now + 0.28);
      formantFilter.frequency.setValueAtTime(1450, now);
      formantFilter.Q.value = 3.2;

      voiceGain.gain.setValueAtTime(0.38, now);
      voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      voiceOsc.stop(now + 0.28);
    } else if (category === 'stroller') {
      // POUSSETTE : Cri bébé aigu ("Ouin !") + tintement hochet et carambolage de roues métalliques
      voiceOsc.type = 'sine';
      voiceOsc.frequency.setValueAtTime(880, now);
      voiceOsc.frequency.linearRampToValueAtTime(1120, now + 0.09);
      voiceOsc.frequency.exponentialRampToValueAtTime(620, now + 0.36);

      formantFilter.frequency.setValueAtTime(2200, now);
      formantFilter.Q.value = 4.2;

      voiceGain.gain.setValueAtTime(0.45, now);
      voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      voiceOsc.stop(now + 0.36);

      // Choc métallique vibrant du châssis de poussette qui rouleboule
      const metalOsc = this.ctx.createOscillator();
      const metalGain = this.ctx.createGain();
      metalOsc.type = 'sawtooth';
      metalOsc.frequency.setValueAtTime(1350, now + 0.02);
      metalOsc.frequency.exponentialRampToValueAtTime(260, now + 0.14);
      metalGain.gain.setValueAtTime(0.35, now + 0.02);
      metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      metalOsc.connect(metalGain);
      metalGain.connect(this.ctx.destination);
      metalOsc.onended = () => this.cleanupNodes(metalOsc, metalGain);
      metalOsc.start(now + 0.02);
      metalOsc.stop(now + 0.14);
    } else if (category === 'elderly') {
      // VIEUX (Papy / Mamie) : Voix rauque chevrotante ("Oh là là !" + impact de canne)
      voiceOsc.type = 'triangle';
      voiceOsc.frequency.setValueAtTime(165, now);
      voiceOsc.frequency.linearRampToValueAtTime(140, now + 0.12);
      voiceOsc.frequency.exponentialRampToValueAtTime(95, now + 0.38);

      formantFilter.frequency.setValueAtTime(750, now);
      formantFilter.Q.value = 2.5;

      voiceGain.gain.setValueAtTime(0.42, now);
      voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      voiceOsc.stop(now + 0.38);

      // Bruit sec de la canne en bois qui claque
      const caneOsc = this.ctx.createOscillator();
      const caneGain = this.ctx.createGain();
      caneOsc.type = 'square';
      caneOsc.frequency.setValueAtTime(800, now + 0.04);
      caneOsc.frequency.exponentialRampToValueAtTime(150, now + 0.09);
      caneGain.gain.setValueAtTime(0.3, now + 0.04);
      caneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      caneOsc.connect(caneGain);
      caneGain.connect(this.ctx.destination);
      caneOsc.onended = () => this.cleanupNodes(caneOsc, caneGain);
      caneOsc.start(now + 0.04);
      caneOsc.stop(now + 0.09);
    } else if (category === 'woman') {
      // FEMME : Cri aigu surpris perçant ("Aaaaah !")
      voiceOsc.type = 'sawtooth';
      voiceOsc.frequency.setValueAtTime(520, now);
      voiceOsc.frequency.linearRampToValueAtTime(580, now + 0.08);
      voiceOsc.frequency.exponentialRampToValueAtTime(320, now + 0.34);

      formantFilter.frequency.setValueAtTime(1850, now);
      formantFilter.Q.value = 3.8;

      voiceGain.gain.setValueAtTime(0.4, now);
      voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      voiceOsc.stop(now + 0.34);
    } else if (category === 'dog') {
      // CHIEN : Aboiement cartoon dynamique ("Ouaf ouaf !")
      this.playDogBark();
      return;
    } else if (category === 'cat') {
      // CHAT : Miaulement / feulement félin surpris ("Miaouuu !")
      this.playCatMeow();
      return;
    } else if (category === 'monkey') {
      // SINGE : Cri malicieux perçant ("Ouh ouh ah ah !")
      this.playMonkeyScreech();
      return;
    } else {
      // HOMME : Râle / grognement baryton vigoureux ("Wooooh !" / "Hé !")
      voiceOsc.type = 'sawtooth';
      voiceOsc.frequency.setValueAtTime(210, now);
      voiceOsc.frequency.exponentialRampToValueAtTime(85, now + 0.32);

      formantFilter.frequency.setValueAtTime(620, now);
      formantFilter.Q.value = 2.8;

      voiceGain.gain.setValueAtTime(0.45, now);
      voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      voiceOsc.stop(now + 0.32);
    }

    voiceOsc.connect(formantFilter);
    formantFilter.connect(voiceGain);
    voiceGain.connect(this.ctx.destination);

    voiceOsc.onended = () => this.cleanupNodes(voiceOsc, formantFilter, voiceGain);
    voiceOsc.start(now);
  }

  // --- ANIMAUX DE COMPAGNIE & PIGEONS (CHIEN, CHAT, SINGE, PIGEONS) ---
  playDogBark() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const dest = this.getMasterOutput();
    const now = this.ctx.currentTime;

    // Double aboiement vif et joyeux ("Ouaf ! Ouaf !")
    for (let i = 0; i < 2; i++) {
      const t = now + (i * 0.11);
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(i === 0 ? 460 : 520, t);
      osc.frequency.exponentialRampToValueAtTime(170, t + 0.08);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, t);
      filter.Q.value = 3.2;

      gain.gain.setValueAtTime(0.42, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.onended = () => this.cleanupNodes(osc, filter, gain);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  playCatMeow() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const dest = this.getMasterOutput();
    const now = this.ctx.currentTime;

    // Miaulement félin expressif à modulation sinusoïdale ("Miiiaaaooou !")
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    // Glissando mélodique typique du chat
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.linearRampToValueAtTime(740, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.36);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1350, now);
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.38, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.onended = () => this.cleanupNodes(osc, filter, gain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  playMonkeyScreech() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const dest = this.getMasterOutput();
    const now = this.ctx.currentTime;

    // Cri de singe cartoon malicieux ("Ouh-ouh-ah-ah !")
    for (let i = 0; i < 3; i++) {
      const t = now + (i * 0.075);
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(750 + (i * 90), t);
      osc.frequency.linearRampToValueAtTime(1450, t + 0.03);
      osc.frequency.exponentialRampToValueAtTime(580, t + 0.065);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.Q.value = 5.0;

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.onended = () => this.cleanupNodes(osc, filter, gain);
      osc.start(t);
      osc.stop(t + 0.065);
    }
  }

  playPigeonFlutter() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const dest = this.getMasterOutput();
    const now = this.ctx.currentTime;

    // Battement d'ailes précipité et envol d'oiseau (salves de souffle feutré)
    for (let i = 0; i < 5; i++) {
      const t = now + (i * 0.038);
      const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.04), this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let s = 0; s < data.length; s++) {
        data[s] = (Math.random() * 2 - 1) * Math.sin((s / data.length) * Math.PI);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650 + (i * 70), t);
      filter.Q.value = 2.2;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      noise.start(t);
    }

    // Petit roucoulement cartoon en vol
    const coo = this.ctx.createOscillator();
    const cooGain = this.ctx.createGain();
    coo.type = 'sine';
    coo.frequency.setValueAtTime(380, now + 0.12);
    coo.frequency.linearRampToValueAtTime(320, now + 0.28);
    cooGain.gain.setValueAtTime(0.18, now + 0.12);
    cooGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    coo.connect(cooGain);
    cooGain.connect(dest);
    coo.onended = () => this.cleanupNodes(coo, cooGain);
    coo.start(now + 0.12);
    coo.stop(now + 0.28);
  }

  playBoing() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playComicWhoosh() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playCountdownBeep(isGo = false) {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample(isGo ? 'confirm' : 'tick', isGo ? { rateMul: 1.15, volMul: 1.4 } : { rateMul: 1.1 })) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (isGo) {
      // Bip triomphal aigu pour "GO !"
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);
      osc.frequency.setValueAtTime(1760, now + 0.12);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.onended = () => this.cleanupNodes(osc, gain);
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      // Bip net et clair pour 3, 2, 1
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // Ré5
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.onended = () => this.cleanupNodes(osc, gain);
      osc.start(now);
      osc.stop(now + 0.16);
    }
  }

  playNearMiss() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1900, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playCoin() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample('coin')) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(987.77, now);
    osc1.frequency.setValueAtTime(1318.51, now + 0.08);

    osc2.frequency.setValueAtTime(987.77, now);
    osc2.frequency.setValueAtTime(1318.51, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.onended = () => this.cleanupNodes(osc1, osc2, gain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  playCrash() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample('crash')) return;

    const now = this.ctx.currentTime;

    // 1. Coup de basse sourd / punch de choc
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.4);

    // 2. Bruit blanc métallique / bris de verre cartoon
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.35);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2200, now);
    noiseFilter.Q.setValueAtTime(3.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.onended = () => this.cleanupNodes(noise, noiseFilter, noiseGain);
    noise.start(now);
  }

  playPenaltyBuzzer() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample('error')) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    // Dissonance comique sévère pour pénalité (fausse quinte)
    osc1.frequency.setValueAtTime(146.83, now); // D3
    osc1.frequency.exponentialRampToValueAtTime(73.41, now + 0.38);

    osc2.frequency.setValueAtTime(155.56, now); // Eb3 dissonant
    osc2.frequency.exponentialRampToValueAtTime(77.78, now + 0.38);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.onended = () => this.cleanupNodes(osc1, osc2, gain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.38);
    osc2.stop(now + 0.38);
  }

  playTravelWhoosh() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.55);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(2800, now + 0.25);
    filter.frequency.exponentialRampToValueAtTime(800, now + 0.55);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.onended = () => this.cleanupNodes(osc, filter, gain);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  playHorseWhinny() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;

    // 1. Claquement sec de FOUET (Whip Crack)
    const whipNoise = this.ctx.createBufferSource();
    const bufSize = Math.floor(this.ctx.sampleRate * 0.12);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
    }
    whipNoise.buffer = buf;
    const whipGain = this.ctx.createGain();
    whipGain.gain.setValueAtTime(0.4, now);
    whipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    whipNoise.connect(whipGain);
    whipGain.connect(this.ctx.destination);
    whipNoise.start(now);

    // 2. Hennissement burlesque de l'étalon (Horse Whinny)
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, now + 0.05);
    osc.frequency.linearRampToValueAtTime(1150, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.65);

    // Vibrato rapide
    lfo.frequency.setValueAtTime(24, now);
    lfoGain.gain.setValueAtTime(95, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start(now + 0.05);
    osc.start(now + 0.05);
    lfo.stop(now + 0.65);
    osc.stop(now + 0.65);
    osc.onended = () => this.cleanupNodes(osc, lfo, lfoGain, gain, whipNoise, whipGain);
  }

  playWhipCrack() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const whipNoise = this.ctx.createBufferSource();
    const bufSize = Math.floor(this.ctx.sampleRate * 0.15);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.015));
    }
    whipNoise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1400, now);

    const whipGain = this.ctx.createGain();
    whipGain.gain.setValueAtTime(0.65, now);
    whipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    whipNoise.connect(filter);
    filter.connect(whipGain);
    whipGain.connect(this.ctx.destination);

    whipNoise.onended = () => this.cleanupNodes(whipNoise, filter, whipGain);
    whipNoise.start(now);
  }

  playNitroBoost() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample('thruster')) return;

    const now = this.ctx.currentTime;

    // Souffle supersonique d'injection Nitro (NOS Whoosh)
    const noise = this.ctx.createBufferSource();
    const bufSize = Math.floor(this.ctx.sampleRate * 0.85);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.4));
    }
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(2800, now + 0.35);
    filter.Q.setValueAtTime(2.5, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.55, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);

    // Montée en fréquence foudroyante de turbine turbo (Jet Roar)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);

    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);

    osc.onended = () => this.cleanupNodes(noise, filter, noiseGain, osc, oscGain);
  }

  playChainsawRev() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(240, now + 0.12);
    osc.frequency.linearRampToValueAtTime(180, now + 0.35);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  playAk47Burst() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const shotTime = now + i * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(220, shotTime);
      osc.frequency.exponentialRampToValueAtTime(60, shotTime + 0.05);

      gain.gain.setValueAtTime(0.35, shotTime);
      gain.gain.exponentialRampToValueAtTime(0.001, shotTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(shotTime);
      osc.stop(shotTime + 0.05);
      if (i === 2) {
        osc.onended = () => this.cleanupNodes(osc, gain);
      }
    }
  }

  playAxeSlash() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    const bufSize = Math.floor(this.ctx.sampleRate * 0.2);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufSize) * Math.PI);
    }
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
    noise.onended = () => this.cleanupNodes(noise, filter, gain);
  }

  playTankCannon() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample('cannon')) return;

    const now = this.ctx.currentTime;

    // 1. Déflagration sub-bass percutante (140Hz -> 28Hz)
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(140, now);
    boomOsc.frequency.exponentialRampToValueAtTime(28, now + 0.38);

    boomGain.gain.setValueAtTime(0.9, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    boomOsc.connect(boomGain);
    boomGain.connect(this.ctx.destination);
    boomOsc.onended = () => this.cleanupNodes(boomOsc, boomGain);
    boomOsc.start(now);
    boomOsc.stop(now + 0.42);

    // 2. Éclatement de poudre & onde de choc supersonique
    const noise = this.ctx.createBufferSource();
    const bufSize = Math.floor(this.ctx.sampleRate * 0.35);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }
    noise.buffer = buf;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(3200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(250, now + 0.35);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.85, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);
    noise.onended = () => this.cleanupNodes(noise, noiseFilter, noiseGain);

    // 3. Cliquetis métallique de recul de culasse
    const breechOsc = this.ctx.createOscillator();
    const breechGain = this.ctx.createGain();
    breechOsc.type = 'triangle';
    breechOsc.frequency.setValueAtTime(950, now + 0.05);
    breechOsc.frequency.exponentialRampToValueAtTime(320, now + 0.18);
    breechGain.gain.setValueAtTime(0.3, now + 0.05);
    breechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    breechOsc.connect(breechGain);
    breechGain.connect(this.ctx.destination);
    breechOsc.onended = () => this.cleanupNodes(breechOsc, breechGain);
    breechOsc.start(now + 0.05);
    breechOsc.stop(now + 0.18);
  }

  playExplosion() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample('explosion')) return;

    const now = this.ctx.currentTime;
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'sawtooth';
    boomOsc.frequency.setValueAtTime(110, now);
    boomOsc.frequency.exponentialRampToValueAtTime(18, now + 0.55);

    boomGain.gain.setValueAtTime(0.85, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    boomOsc.connect(boomGain);
    boomGain.connect(this.ctx.destination);
    boomOsc.onended = () => this.cleanupNodes(boomOsc, boomGain);
    boomOsc.start(now);
    boomOsc.stop(now + 0.55);

    // Bruit blanc d'impact explosif
    const noise = this.ctx.createBufferSource();
    const bufSize = Math.floor(this.ctx.sampleRate * 0.4);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
    }
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.4);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);
    noise.onended = () => this.cleanupNodes(noise, filter, noiseGain);
  }

  playSuspensionThud() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample('thud')) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.16);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playAmbulanceSiren() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    // Sirène européenne deux-tons "PIN-PON ! PIN-PON !"
    const notes = [
      { freq: 580, time: 0.0, dur: 0.26 },
      { freq: 435, time: 0.28, dur: 0.26 },
      { freq: 580, time: 0.56, dur: 0.26 },
      { freq: 435, time: 0.84, dur: 0.26 }
    ];

    notes.forEach((note, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(note.freq * 1.5, now + note.time);
      filter.Q.value = 2.0;

      gain.gain.setValueAtTime(0.32, now + note.time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur);
      if (idx === notes.length - 1) {
        osc.onended = () => this.cleanupNodes(osc, filter, gain);
      }
    });
  }

  playWallScrape(side = 0) {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    if (!this.canPlaySfx('wall_scrape', 110)) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const dest = this.getMasterOutput();

    // Panning stéréo dynamique gauche (-1) / droite (+1)
    let targetNode = dest;
    let panner = null;
    if (this.ctx.createStereoPanner && side !== 0) {
      try {
        panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, side * 0.75)), now);
        panner.connect(dest);
        targetNode = panner;
      } catch (e) {
        targetNode = dest;
      }
    }

    // 1. Friction métallique réaliste (bruit filtré passe-bande résonant)
    const bufSize = Math.floor(this.ctx.sampleRate * 0.12);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 + Math.random() * 400, now);
    filter.Q.setValueAtTime(3.2, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(targetNode);
    noise.start(now);

    // 2. Choc sourd métallique de carrosserie
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(180, now);
    subOsc.frequency.exponentialRampToValueAtTime(50, now + 0.09);
    subGain.gain.setValueAtTime(0.22, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    subOsc.connect(subGain);
    subGain.connect(targetNode);
    subOsc.start(now);
    subOsc.stop(now + 0.09);

    noise.onended = () => {
      this.cleanupNodes(noise, filter, noiseGain, subOsc, subGain);
      if (panner) { try { panner.disconnect(); } catch (e) {} }
    };
  }

  playPlaneFlyby() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMasterOutput();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.65);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(2800, now + 0.3);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.65);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.65);
    osc.onended = () => this.cleanupNodes(osc, filter, gain);
  }

  playSupersonicJet() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMasterOutput();

    const bufferSize = Math.floor(this.ctx.sampleRate * 1.8);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.75;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(1350, now + 0.9);
    filter.frequency.exponentialRampToValueAtTime(280, now + 1.8);
    filter.Q.setValueAtTime(1.6, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.48, now + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(now);
    noise.stop(now + 1.8);
    noise.onended = () => this.cleanupNodes(noise, filter, gain);
  }

  playGeigerClick() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMasterOutput();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2200 + Math.random() * 800, now);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.012);
    osc.onended = () => this.cleanupNodes(osc, gain);
  }

  playCurbMount() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample('curb')) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playWaterGeyser() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    const bufSize = Math.floor(this.ctx.sampleRate * 0.6);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.min(1.0, (i / (bufSize * 0.3)));
    }
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(1800, now + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
    noise.onended = () => this.cleanupNodes(noise, filter, gain);
  }

  playPropSmash() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample('smash')) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.22);

    gain.gain.setValueAtTime(0.48, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playSteamrollerHorn() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const oscSub = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    oscSub.type = 'triangle';

    // Avertisseur industriel lourd 50 Tonnes (accord très grave et puissant)
    osc1.frequency.setValueAtTime(110, now); // A2
    osc2.frequency.setValueAtTime(138.59, now); // C#3
    oscSub.frequency.setValueAtTime(55, now); // A1 sub bass

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc1.connect(gain);
    osc2.connect(gain);
    oscSub.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.onended = () => this.cleanupNodes(osc1, osc2, oscSub, gain);
    osc1.start(now);
    osc2.start(now);
    oscSub.start(now);
    osc1.stop(now + 0.55);
    osc2.stop(now + 0.55);
    oscSub.stop(now + 0.55);
  }

  playHorn(bikeId = null) {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;

    if (bikeId === 'cheval') {
      this.playHorseWhinny();
      return;
    } else if (bikeId === 'rouleau') {
      this.playSteamrollerHorn();
      return;
    }

    this.resumeContext();

    // Klaxon bi-ton compresseur italien/français ultra-expressif ("POUËT-POUËT !")
    const now = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1150, now);
    filter.Q.setValueAtTime(3.0, now);

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.38, now);

    filter.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    // Double impulsion rythmique caractéristique (Pulse 1: 0.11s, Pause: 0.04s, Pulse 2: 0.18s)
    const bursts = [
      { start: now, duration: 0.11 },
      { start: now + 0.15, duration: 0.18 }
    ];

    bursts.forEach(b => {
      const o1 = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      const o3 = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();

      o1.type = 'sawtooth';
      o2.type = 'sawtooth';
      o3.type = 'square';

      // Accord brillant fanfare : Fondamentale A4 (440Hz), Tierce Majeure C#5 (554.37Hz), Quinte E5 (659Hz)
      o1.frequency.setValueAtTime(440, b.start);
      o2.frequency.setValueAtTime(554.37, b.start);
      o3.frequency.setValueAtTime(659.25, b.start);

      // Vibrato compresseur pneumatique
      o1.frequency.linearRampToValueAtTime(446, b.start + b.duration * 0.5);
      o1.frequency.linearRampToValueAtTime(440, b.start + b.duration);

      bGain.gain.setValueAtTime(0.001, b.start);
      bGain.gain.linearRampToValueAtTime(1.0, b.start + 0.015);
      bGain.gain.setValueAtTime(1.0, b.start + b.duration - 0.02);
      bGain.gain.exponentialRampToValueAtTime(0.001, b.start + b.duration);

      o1.connect(bGain);
      o2.connect(bGain);
      o3.connect(bGain);
      bGain.connect(filter);

      o1.start(b.start);
      o2.start(b.start);
      o3.start(b.start);
      o1.stop(b.start + b.duration);
      o2.stop(b.start + b.duration);
      o3.stop(b.start + b.duration);

      o1.onended = () => this.cleanupNodes(o1, o2, o3, bGain);
    });

    setTimeout(() => this.cleanupNodes(filter, masterGain), 450);
  }

  playComboFanfare(multiplier) {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample('confirm', { rateMul: 1 + Math.min(multiplier || 1, 5) * 0.04 })) return;

    const baseFreq = Math.min(440 + multiplier * 50, 1100);
    const now = this.ctx.currentTime;
    const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = now + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.2, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.onended = () => this.cleanupNodes(osc, gain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.15);
    });
  }

  playClick(type = 'default') {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const sampleKey = type === 'garage' ? 'clickGarage' : (type === 'hero' || type === 'play') ? 'clickHero' : (Math.random() < 0.5 ? 'click' : 'clickAlt');
    if (this.trySample(sampleKey)) return;

    const now = this.ctx.currentTime;
    const dest = this.getMasterOutput();

    if (type === 'hero' || type === 'play') {
      // Accord ascendant héroïque et brillant (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.2, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.22);
        osc.connect(gain);
        gain.connect(dest);
        osc.onended = () => this.cleanupNodes(osc, gain);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.22);
      });
    } else if (type === 'garage') {
      // Clang mécanique / verrouillage hydraulique
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.09);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(dest);
      osc.onended = () => this.cleanupNodes(osc, gain);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'nuclear') {
      this.playGeigerClick();
    } else {
      // Clic arcade vif et tactile
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.045);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.connect(gain);
      gain.connect(dest);
      osc.onended = () => this.cleanupNodes(osc, gain);
      osc.start(now);
      osc.stop(now + 0.045);
    }
  }

  playVictory() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample('victory')) return;

    const chords = [523.25, 659.25, 783.99, 1046.50];
    const now = this.ctx.currentTime;

    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.12;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.onended = () => this.cleanupNodes(osc, gain);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  // --- SONS SPÉCIAUX DE LA MISSION CATACLYSME NUCLÉAIRE & ÉVASION VOLANTE ---

  playGeigerClick() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample('tick', { rateMul: 1.8, volMul: 0.4, noVariation: false })) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2400 + (Math.random() - 0.5) * 800, now);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.015);
  }

  playRespiratorBreath() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    // Bruit de respiration pressurisée sous combinaison NBC
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.Q.value = 2.0;

    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(now);
  }

  playNuclearAlarm() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    // Sirène d'évacuation bicolore aiguë
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.35);
    osc.frequency.linearRampToValueAtTime(880, now + 0.7);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.75);
  }

  playNuclearBlast() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;

    // 1. Détonation sub-bass monumentale
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.exponentialRampToValueAtTime(22, now + 1.8);
    subGain.gain.setValueAtTime(0.85, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.onended = () => this.cleanupNodes(subOsc, subGain);
    subOsc.start(now);
    subOsc.stop(now + 2.2);

    // 2. Grondement de souffle thermique & onde de choc
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2.5, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.8));
    }
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(120, now + 2.0);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noiseSrc.start(now);
  }

  playRocketThrusters() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.8);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.9);
  }

  playRocketMissile() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.35);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  // --- CATACLYSMES MONDIAL WORLDMAGEDDON (BARRAGE & MONTAGNE) ---

  playDamBurst() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;

    // 1. Détonation fracassante de rupture du béton armé
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(24, now + 1.4);
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 1.6);
  }

  playWaterRush() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;

    // 2. Rugissement torrentiel du déluge aquatique (Bruit blanc filtré résonant)
    const bufferSize = this.ctx.sampleRate * 2.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 1.5));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.linearRampToValueAtTime(780, now + 1.2);
    filter.Q.value = 2.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playMountainExplosion() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample('explosion', { rateMul: 0.75, volMul: 1.3 })) return;
    const now = this.ctx.currentTime;

    // 1. Détonation sismique sourde basse fréquence
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(85, now);
    subOsc.frequency.exponentialRampToValueAtTime(18, now + 1.6);
    subGain.gain.setValueAtTime(0.85, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.onended = () => this.cleanupNodes(subOsc, subGain);
    subOsc.start(now);
    subOsc.stop(now + 1.9);
  }

  playRockAvalanche() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    if (this.trySample('avalanche')) return;
    const now = this.ctx.currentTime;

    // 2. Grondement prolongé d'avalanche rocheuse et chocs de blocs de granit
    const bufferSize = this.ctx.sampleRate * 3.0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 1.8));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);
    filter.frequency.linearRampToValueAtTime(90, now + 2.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  // --- SON DU MOTEUR (DYNAMIQUE) ---

  // --- MOTEUR AUDIO PROCÉDURAL MULTI-CORPS & SONS DE PILOTAGE EXPERTS ---
  startEngine() {
    if (this.engineOsc || !this.ctx || this.isMutedSfx || this.isDestroyed) return;
    this.resumeContext();

    const dest = this.getMasterOutput();
    const now = this.ctx.currentTime;

    // 1. Oscillateur Mid (Caractère mécanique et rugissement des cylindres)
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(48, now);

    // 2. Oscillateur Sub-bass (Corps et puissance des pistons dans le bas du spectre)
    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'sine';
    this.engineSubOsc.frequency.setValueAtTime(32, now);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(160, now);
    this.engineFilter.Q.value = 2.4;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.045, now);

    this.engineOsc.connect(this.engineFilter);
    this.engineSubOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(dest);

    this.engineOsc.start(now);
    this.engineSubOsc.start(now);
  }

  updateEngine(speedRatio) {
    if (!this.engineOsc || !this.ctx || this.isDestroyed) return;
    const now = this.ctx.currentTime;
    const clampedRatio = Math.max(0, Math.min(1.8, speedRatio));

    // Ramping de fréquence dynamique selon l'accélération
    const targetMidFreq = 48 + clampedRatio * 68;
    const targetSubFreq = 30 + clampedRatio * 42;
    this.engineOsc.frequency.setTargetAtTime(targetMidFreq, now, 0.06);
    if (this.engineSubOsc) {
      this.engineSubOsc.frequency.setTargetAtTime(targetSubFreq, now, 0.06);
    }

    if (this.engineFilter) {
      // Ouverture du filtre à haut régime pour révéler les harmoniques métalliques
      const filterCutoff = 160 + clampedRatio * 240;
      this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.06);
    }
  }

  stopEngine() {
    if (this.engineGain && this.ctx) {
      try {
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch (e) {}
    }
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
      } catch (e) {}
    }
    if (this.engineSubOsc) {
      try {
        this.engineSubOsc.stop();
      } catch (e) {}
    }
    this.cleanupNodes(this.engineOsc, this.engineSubOsc, this.engineFilter, this.engineGain);
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
  }

  // Coupe net et définitivement tous les sons de gameplay (moteur, musique de course, boucles)
  stopAllGameplaySounds() {
    this.stopEngine();
    this.stopMusic();
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicPlaying = false;
    this.currentTrack = null;
  }

  // Crépitement / Retour de flamme d'échappement (Pop & Crackle) à la décélération
  playExhaustBackfire() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const dest = this.getMasterOutput();
    const now = this.ctx.currentTime;

    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const t = now + (i * 0.07);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120 + Math.random() * 40, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.05);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(dest);
      osc.onended = () => this.cleanupNodes(osc, gain);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  }

  // Crissement de pneus sur asphalte lors d'un freinage appuyé
  playTireScreech() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const dest = this.getMasterOutput();
    const now = this.ctx.currentTime;

    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.28), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1250, now);
    filter.frequency.linearRampToValueAtTime(950, now + 0.28);
    filter.Q.value = 5.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(now);
  }

  // Sifflement de turbo-compresseur haute pression lors de l'activation du Nitro
  playTurboWhistle() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const dest = this.getMasterOutput();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(3200, now + 0.45);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.Q.value = 6.0;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.onended = () => this.cleanupNodes(osc, filter, gain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  // --- MOTEUR AUDIO & COMPOSITEUR MUSICAL PROCÉDURAL (SYNTHWAVE, FUNK & DARKSYNTH) ---

  startMusic(track = 'MENU') {
    if (this.isMutedMusic || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    if (this.musicPlaying && this.currentTrack === track) return;
    this.stopMusic();

    this.musicPlaying = true;
    this.currentTrack = track;

    if (track === 'MENU' || track === 'SPLASH') {
      this.playMenuSynthwaveTheme();
    } else if (track === 'NUCLEAR') {
      this.playNuclearDarksynthTheme();
    } else {
      this.playSadisticCarnageTheme(this.musicIntensity || 'TENSION');
    }
  }

  switchMusicTrack(track) {
    if (this.currentTrack === track && this.musicPlaying) return;
    this.startMusic(track);
  }

  // --- 1. THÈME D'ACCUEIL : FRENCH TOUCH & SYNTHWAVE DISCO-FUNK (122 BPM) ---
  playMenuSynthwaveTheme() {
    const tempo = 122;
    const beatDuration = 60 / tempo;
    const stepDuration = beatDuration / 2; // Croches
    let step = 0;

    // Ligne de basse disco-funk syncopée (Am7 -> Fmaj7 -> Cmaj7 -> G7)
    const bassGroove = [
      110.00, 0, 110.00, 164.81, 0, 110.00, 130.81, 146.83, // Am7 (A1, E2, C2, D2)
      87.31, 0, 87.31, 130.81, 0, 87.31, 110.00, 130.81,    // Fmaj7 (F1, C2, A1, C2)
      130.81, 0, 130.81, 196.00, 0, 130.81, 164.81, 146.83, // Cmaj7 (C2, G2, E2, D2)
      98.00, 0, 98.00, 146.83, 0, 98.00, 123.47, 146.83     // G7 (G1, D2, B1, D2)
    ];

    // Accords de nappes chaudes analogiques (chords pad)
    const chordProgression = [
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [196.00, 246.94, 293.66, 349.23]  // G7
    ];

    const playStep = () => {
      if (!this.musicPlaying || this.currentTrack !== 'MENU' || !this.ctx || this.isDestroyed) return;
      const now = this.ctx.currentTime;
      const dest = this.getMusicOutput();

      // 1. Basse Slap Synthwave punchy
      const bassFreq = bassGroove[step % bassGroove.length];
      if (bassFreq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(850, now);
        filter.frequency.exponentialRampToValueAtTime(140, now + stepDuration * 0.9);
        filter.Q.value = 4.0;

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.95);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        osc.onended = () => this.cleanupNodes(osc, filter, gain);
        osc.start(now);
        osc.stop(now + stepDuration * 0.95);
      }

      // 2. Nappe d'accords Daft Punk tous les 8 steps
      if (step % 8 === 0) {
        const chordIdx = Math.floor((step % 32) / 8);
        const chord = chordProgression[chordIdx];
        chord.forEach(freq => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1200, now);
          filter.Q.value = 2.5;

          gain.gain.setValueAtTime(0.035, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 7.5);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(dest);

          osc.onended = () => this.cleanupNodes(osc, filter, gain);
          osc.start(now);
          osc.stop(now + stepDuration * 7.5);
        });
      }

      // 3. Kick Disco rond et chaud (temps 0, 4, 8, 12...)
      if (step % 4 === 0) {
        this.playDiscoKick(now);
      }

      // 4. Claps Disco étincelants (temps 2, 6, 10, 14...)
      if (step % 4 === 2) {
        this.playDiscoClap(now);
      }

      // 5. Charleston / Hi-Hat swingant
      if (step % 2 === 1) {
        this.playHiHat(now);
      }

      step++;
      this.musicTimer = setTimeout(playStep, stepDuration * 1000);
    };

    playStep();
  }

  // --- 2. THÈME DE COURSE : ARCADE ADRENALINE CHASE (138 BPM) ---
  playGameplayArcadeTheme() {
    const tempo = 138;
    const beatDuration = 60 / tempo;
    const stepDuration = beatDuration / 2;
    let step = 0;

    const bassLine = [
      73.42, 73.42, 110.00, 73.42, 103.83, 73.42, 110.00, 146.83,
      73.42, 73.42, 87.31, 73.42, 110.00, 98.00, 87.31, 103.83,
      65.41, 65.41, 98.00, 65.41, 123.47, 65.41, 98.00, 130.81,
      69.30, 69.30, 103.83, 69.30, 138.59, 103.83, 92.50, 73.42
    ];

    const leadLine = [
      293.66, 0, 349.23, 415.30, 0, 440.00, 293.66, 0,
      349.23, 415.30, 0, 440.00, 587.33, 0, 415.30, 349.23,
      261.63, 0, 329.63, 392.00, 0, 523.25, 392.00, 0,
      277.18, 0, 349.23, 415.30, 554.37, 415.30, 349.23, 293.66
    ];

    const playStep = () => {
      if (!this.musicPlaying || this.currentTrack !== 'GAMEPLAY' || !this.ctx || this.isDestroyed) return;
      const now = this.ctx.currentTime;
      const dest = this.getMusicOutput();

      // 1. Basse Acide Résonante
      const bassFreq = bassLine[step % bassLine.length];
      if (bassFreq > 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, now);
        filter.frequency.exponentialRampToValueAtTime(160, now + stepDuration * 0.9);
        filter.Q.value = 4.5;

        bassGain.gain.setValueAtTime(0.19, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.95);

        bassOsc.connect(filter);
        filter.connect(bassGain);
        bassGain.connect(dest);

        bassOsc.onended = () => this.cleanupNodes(bassOsc, filter, bassGain);
        bassOsc.start(now);
        bassOsc.stop(now + stepDuration * 0.95);
      }

      // 2. Synth Lead Arpégé Héroïque (triangle filtré = plus chaud)
      const leadFreq = leadLine[step % leadLine.length];
      if (leadFreq > 0) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        const leadFilter = this.ctx.createBiquadFilter();
        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(leadFreq, now);

        leadFilter.type = 'lowpass';
        leadFilter.frequency.setValueAtTime(leadFreq * 2.5, now);
        leadFilter.frequency.exponentialRampToValueAtTime(leadFreq * 1.2, now + stepDuration * 0.85);
        leadFilter.Q.value = 1.5;

        leadGain.gain.setValueAtTime(0.09, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.85);

        leadOsc.connect(leadFilter);
        leadFilter.connect(leadGain);
        leadGain.connect(dest);

        leadOsc.onended = () => this.cleanupNodes(leadOsc, leadFilter, leadGain);
        leadOsc.start(now);
        leadOsc.stop(now + stepDuration * 0.85);
      }

      // 2b. Pad atmosphérique (note grave tenue pour la richesse harmonique)
      if (step % 4 === 0) {
        const padFreq = bassLine[step % bassLine.length] * 2;
        if (padFreq > 0) {
          const padOsc = this.ctx.createOscillator();
          const padGain = this.ctx.createGain();
          const padFilter = this.ctx.createBiquadFilter();
          padOsc.type = 'sine';
          padOsc.frequency.setValueAtTime(padFreq, now);
          padFilter.type = 'lowpass';
          padFilter.frequency.setValueAtTime(1200, now);
          padFilter.Q.value = 0.7;
          padGain.gain.setValueAtTime(0.04, now);
          padGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 3.8);
          padOsc.connect(padFilter);
          padFilter.connect(padGain);
          padGain.connect(dest);
          padOsc.onended = () => this.cleanupNodes(padOsc, padFilter, padGain);
          padOsc.start(now);
          padOsc.stop(now + stepDuration * 3.8);
        }
      }

      // 3. Percussions de Course
      if (step % 4 === 0) this.playIndustrialKick(now);
      if (step % 4 === 2) this.playMetalSnare(now);
      if (step % 2 === 1) this.playHiHat(now);

      step++;
      this.musicTimer = setTimeout(playStep, stepDuration * 1000);
    };

    playStep();
  }

  // --- 3. THÈME NUCLÉAIRE : DARKSYNTH APOCALYPTIQUE & ÉVASION (144 BPM) ---
  playNuclearDarksynthTheme() {
    const tempo = 144;
    const beatDuration = 60 / tempo;
    const stepDuration = beatDuration / 2;
    let step = 0;

    const nucBass = [
      58.27, 58.27, 82.41, 58.27, 77.78, 58.27, 87.31, 58.27,
      55.00, 55.00, 77.78, 55.00, 73.42, 55.00, 82.41, 55.00
    ];

    const playStep = () => {
      if (!this.musicPlaying || this.currentTrack !== 'NUCLEAR' || !this.ctx || this.isDestroyed) return;
      const now = this.ctx.currentTime;
      const dest = this.getMusicOutput();

      // Drone lourd saturé
      const freq = nucBass[step % nucBass.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, now);
      filter.Q.value = 5.0;

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.95);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.onended = () => this.cleanupNodes(osc, filter, gain);
      osc.start(now);
      osc.stop(now + stepDuration * 0.95);

      // Stabs d'alarme tous les 16 steps
      if (step % 16 === 0) {
        this.playNuclearAlarm();
      }

      if (step % 4 === 0) this.playIndustrialKick(now);
      if (step % 4 === 2) this.playMetalSnare(now);
      if (step % 2 === 1) this.playHiHat(now);

      step++;
      this.musicTimer = setTimeout(playStep, stepDuration * 1000);
    };

    playStep();
  }

  playDiscoKick(time) {
    if (!this.ctx || this.isDestroyed) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);

    gain.gain.setValueAtTime(0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(gain);
    gain.connect(this.getMusicOutput());

    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(time);
    osc.stop(time + 0.14);
  }

  playDiscoClap(time) {
    if (!this.ctx || this.isDestroyed) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.14);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1250, time);
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getMusicOutput());

    noise.onended = () => this.cleanupNodes(noise, filter, gain);
    noise.start(time);
  }

  // ============================================================================
  // COMPOSITION MUSICALE SADIQUE & DIABOLIQUE (138 BPM, PHRYGIEN & TRITON)
  // ============================================================================

  makeDistortionCurve(amount = 75) {
    const k = typeof amount === 'number' ? amount : 75;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  playSadisticCarnageTheme(intensity = 'TENSION') {
    if (this.isMutedMusic || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    this.stopMusic();
    this.musicPlaying = true;
    this.currentTrack = 'SADISTIC_CARNAGE';
    this.musicIntensity = intensity;

    const tempo = 138;
    const beatDuration = 60 / tempo;
    const stepDuration = beatDuration / 4; // Double-croches
    let step = 0;

    // Basse 303 en Ré Phrygien avec le Triton du Diable (D2, Eb2, Ab2, A2)
    const acidBassline = [
      73.42, 73.42, 0, 77.78,
      73.42, 0, 103.83, 73.42,
      73.42, 73.42, 110.00, 0,
      77.78, 103.83, 73.42, 65.41
    ];

    // Arpeggiator agressif dissonant
    const sadisticArp = [
      293.66, 311.13, 369.99, 415.30,
      587.33, 415.30, 369.99, 311.13,
      293.66, 415.30, 311.13, 369.99,
      622.25, 587.33, 415.30, 311.13
    ];

    const distortionCurve = this.makeDistortionCurve(75);

    const playStep = () => {
      if (!this.musicPlaying || this.currentTrack !== 'SADISTIC_CARNAGE' || !this.ctx || this.isDestroyed) return;
      const now = this.ctx.currentTime;
      const dest = this.getMusicOutput();
      const currentIntensity = this.musicIntensity || 'TENSION';

      // 1. Basse Acide 303 Distordue
      const bassFreq = acidBassline[step % acidBassline.length];
      if (bassFreq > 0 && (currentIntensity !== 'CALM' || step % 2 === 0)) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const shaper = this.ctx.createWaveShaper();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, now);

        filter.type = 'lowpass';
        const cutoffStart = currentIntensity === 'COMBO' ? 2400 : 1200;
        const cutoffEnd = currentIntensity === 'CALM' ? 120 : 180;
        filter.frequency.setValueAtTime(cutoffStart, now);
        filter.frequency.exponentialRampToValueAtTime(cutoffEnd, now + stepDuration * 0.85);
        filter.Q.value = currentIntensity === 'COMBO' ? 9.5 : 6.5;

        shaper.curve = distortionCurve;
        shaper.oversample = '2x';

        const bassVol = currentIntensity === 'COMBO' ? 0.26 : (currentIntensity === 'CALM' ? 0.14 : 0.20);
        gain.gain.setValueAtTime(bassVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.9);

        osc.connect(filter);
        filter.connect(shaper);
        shaper.connect(gain);
        gain.connect(dest);

        osc.onended = () => this.cleanupNodes(osc, filter, shaper, gain);
        osc.start(now);
        osc.stop(now + stepDuration * 0.9);
      }

      // 2. Arpeggiator Dissonant
      if (currentIntensity !== 'CALM') {
        const arpFreq = sadisticArp[step % sadisticArp.length];
        const arpOsc = this.ctx.createOscillator();
        const arpFilter = this.ctx.createBiquadFilter();
        const arpGain = this.ctx.createGain();

        arpOsc.type = 'sawtooth';
        arpOsc.frequency.setValueAtTime(arpFreq, now);

        arpFilter.type = 'bandpass';
        arpFilter.frequency.setValueAtTime(1600, now);
        arpFilter.Q.value = 4.0;

        const arpVol = currentIntensity === 'COMBO' ? 0.08 : 0.05;
        arpGain.gain.setValueAtTime(arpVol, now);
        arpGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.7);

        arpOsc.connect(arpFilter);
        arpFilter.connect(arpGain);
        arpGain.connect(dest);

        arpOsc.onended = () => this.cleanupNodes(arpOsc, arpFilter, arpGain);
        arpOsc.start(now);
        arpOsc.stop(now + stepDuration * 0.7);
      }

      // 3. Rythmique Industrielle
      if (step % 4 === 0) {
        if (currentIntensity !== 'CALM' || (step % 8 === 0)) {
          this.playHeavyIndustrialKick(now, currentIntensity === 'COMBO');
        }
      }

      if (step % 8 === 4 && currentIntensity !== 'CALM') {
        this.playRazorIndustrialSnare(now, currentIntensity === 'COMBO');
      }

      if (step % 2 === 1 && currentIntensity !== 'CALM') {
        this.playHiHat(now);
      }

      if (currentIntensity === 'COMBO' && step % 2 === 0) {
        this.playHiHat(now);
      }

      step++;
      this.musicTimer = setTimeout(playStep, stepDuration * 1000);
    };

    playStep();
  }

  setSadisticIntensity(level) {
    this.musicIntensity = level;
  }

  playHeavyIndustrialKick(time, isOverdrive = false) {
    if (!this.ctx || this.isDestroyed) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isOverdrive ? 185 : 155, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.16);

    gain.gain.setValueAtTime(isOverdrive ? 0.48 : 0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.getMusicOutput());

    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  playRazorIndustrialSnare(time, isOverdrive = false) {
    if (!this.ctx || this.isDestroyed) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.16);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isOverdrive ? 2200 : 1600, time);
    filter.Q.value = 3.2;

    const bodyOsc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(210, time);
    bodyOsc.frequency.exponentialRampToValueAtTime(80, time + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isOverdrive ? 0.32 : 0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    noise.connect(filter);
    filter.connect(gain);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(gain);
    gain.connect(this.getMusicOutput());

    noise.onended = () => this.cleanupNodes(noise, filter, bodyOsc, bodyGain, gain);
    noise.start(time);
    bodyOsc.start(time);
    bodyOsc.stop(time + 0.08);
  }

  // ============================================================================
  // CRIS SADIQUES PROCÉDURAUX DE PIÉTONS
  // ============================================================================

  playSadisticScreamHorror() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    const modOsc = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    modOsc.type = 'sine';
    modOsc.frequency.setValueAtTime(22, now);
    modGain.gain.setValueAtTime(140, now);

    const carrierOsc = this.ctx.createOscillator();
    carrierOsc.type = 'sawtooth';
    carrierOsc.frequency.setValueAtTime(920, now);
    carrierOsc.frequency.exponentialRampToValueAtTime(190, now + 0.45);

    modOsc.connect(carrierOsc.frequency);

    const formantFilter = this.ctx.createBiquadFilter();
    formantFilter.type = 'bandpass';
    formantFilter.frequency.setValueAtTime(1850, now);
    formantFilter.frequency.linearRampToValueAtTime(850, now + 0.45);
    formantFilter.Q.value = 4.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.48, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    carrierOsc.connect(formantFilter);
    formantFilter.connect(gain);
    gain.connect(dest);

    carrierOsc.onended = () => this.cleanupNodes(carrierOsc, modOsc, modGain, formantFilter, gain);
    modOsc.start(now);
    carrierOsc.start(now);
    modOsc.stop(now + 0.48);
    carrierOsc.stop(now + 0.48);
  }

  playSadisticScreamComic() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.linearRampToValueAtTime(1750, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.32);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.value = 5.0;

    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.onended = () => this.cleanupNodes(osc, filter, gain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  playSadisticScreamBurlesque() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(1250, now + 0.07);
    osc.frequency.linearRampToValueAtTime(950, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.42);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(dest);

    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  playSadisticScream() {
    const r = Math.random();
    if (r < 0.4) {
      this.playSadisticScreamHorror();
    } else if (r < 0.72) {
      this.playSadisticScreamComic();
    } else {
      this.playSadisticScreamBurlesque();
    }
  }

  // ============================================================================
  // EFFET DOS D'ÂNE CARTOON : "BOING-FWUMP"
  // ============================================================================

  playSpeedBumpBoingFwump(intensity = 1.0) {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    // 1. Ressort Cartoon BOING
    const springOsc = this.ctx.createOscillator();
    const springGain = this.ctx.createGain();
    const springFilter = this.ctx.createBiquadFilter();

    springOsc.type = 'sine';
    springOsc.frequency.setValueAtTime(130, now);
    springOsc.frequency.exponentialRampToValueAtTime(540, now + 0.14);
    springOsc.frequency.exponentialRampToValueAtTime(260, now + 0.32);

    springFilter.type = 'bandpass';
    springFilter.frequency.setValueAtTime(420, now);
    springFilter.Q.value = 6.0;

    springGain.gain.setValueAtTime(0.45 * intensity, now);
    springGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    springOsc.connect(springFilter);
    springFilter.connect(springGain);
    springGain.connect(dest);

    springOsc.onended = () => this.cleanupNodes(springOsc, springFilter, springGain);
    springOsc.start(now);
    springOsc.stop(now + 0.34);

    // 2. Écrasement Châssis FWUMP
    const fwumpTime = now + 0.04;
    const fwumpOsc = this.ctx.createOscillator();
    const fwumpGain = this.ctx.createGain();

    fwumpOsc.type = 'triangle';
    fwumpOsc.frequency.setValueAtTime(95, fwumpTime);
    fwumpOsc.frequency.exponentialRampToValueAtTime(26, fwumpTime + 0.22);

    fwumpGain.gain.setValueAtTime(0.55 * intensity, fwumpTime);
    fwumpGain.gain.exponentialRampToValueAtTime(0.001, fwumpTime + 0.24);

    fwumpOsc.connect(fwumpGain);
    fwumpGain.connect(dest);

    fwumpOsc.onended = () => this.cleanupNodes(fwumpOsc, fwumpGain);
    fwumpOsc.start(fwumpTime);
    fwumpOsc.stop(fwumpTime + 0.24);
  }

  // ============================================================================
  // ALERTE DE VERBALISATION FEU ROUGE
  // ============================================================================

  playRedLightViolation() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    // 1. Buzz strident d'infraction routière
    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    const buzzGain = this.ctx.createGain();

    oscA.type = 'sawtooth';
    oscB.type = 'sawtooth';
    oscA.frequency.setValueAtTime(440, now);
    oscB.frequency.setValueAtTime(466.16, now);

    buzzGain.gain.setValueAtTime(0.35, now);
    buzzGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    oscA.connect(buzzGain);
    oscB.connect(buzzGain);
    buzzGain.connect(dest);

    oscA.onended = () => this.cleanupNodes(oscA, oscB, buzzGain);
    oscA.start(now);
    oscB.start(now);
    oscA.stop(now + 0.22);
    oscB.stop(now + 0.22);

    // 2. Double tut-tut de contravention
    for (let i = 0; i < 2; i++) {
      const beepTime = now + 0.24 + (i * 0.11);
      const tutOsc = this.ctx.createOscillator();
      const tutGain = this.ctx.createGain();

      tutOsc.type = 'square';
      tutOsc.frequency.setValueAtTime(1046.50, beepTime);

      tutGain.gain.setValueAtTime(0.28, beepTime);
      tutGain.gain.exponentialRampToValueAtTime(0.001, beepTime + 0.08);

      tutOsc.connect(tutGain);
      tutGain.connect(dest);

      tutOsc.onended = () => this.cleanupNodes(tutOsc, tutGain);
      tutOsc.start(beepTime);
      tutOsc.stop(beepTime + 0.08);
    }
  }

  // Caisse enregistreuse dorée "Cha-Ching !" pour les pièces et bonus
  playCashRegister() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    // 1. Clochette aiguë "Ting !"
    const bellOsc = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(1975.53, now); // B6
    bellOsc.frequency.setValueAtTime(2637.02, now + 0.06); // E7

    bellGain.gain.setValueAtTime(0.28, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    bellOsc.connect(bellGain);
    bellGain.connect(dest);
    bellOsc.onended = () => this.cleanupNodes(bellOsc, bellGain);
    bellOsc.start(now);
    bellOsc.stop(now + 0.38);

    // 2. Choc de tiroir-caisse mécanique
    const drawerOsc = this.ctx.createOscillator();
    const drawerGain = this.ctx.createGain();
    drawerOsc.type = 'triangle';
    drawerOsc.frequency.setValueAtTime(320, now + 0.08);
    drawerOsc.frequency.exponentialRampToValueAtTime(90, now + 0.18);
    drawerGain.gain.setValueAtTime(0.2, now + 0.08);
    drawerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    drawerOsc.connect(drawerGain);
    drawerGain.connect(dest);
    drawerOsc.onended = () => this.cleanupNodes(drawerOsc, drawerGain);
    drawerOsc.start(now + 0.08);
    drawerOsc.stop(now + 0.18);
  }

  playIndustrialKick(time) {
    if (!this.ctx || this.isDestroyed) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.14);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(time);
    osc.stop(time + 0.16);
  }

  playMetalSnare(time) {
    if (!this.ctx || this.isDestroyed) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.onended = () => this.cleanupNodes(noise, filter, gain);
    noise.start(time);
  }

  // ============================================================================
  // COMPOSITION MUSICALE SADIQUE & DIABOLIQUE (138 BPM, PHRYGIEN & TRITON)
  // ============================================================================

  makeDistortionCurve(amount = 75) {
    const k = typeof amount === 'number' ? amount : 75;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  playSadisticCarnageTheme(intensity = 'TENSION') {
    if (this.isMutedMusic || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    this.stopMusic();
    this.musicPlaying = true;
    this.currentTrack = 'SADISTIC_CARNAGE';
    this.musicIntensity = intensity;

    const tempo = 138;
    const beatDuration = 60 / tempo;
    const stepDuration = beatDuration / 4; // Double-croches
    let step = 0;

    // Basse 303 en Ré Phrygien avec le Triton du Diable (D2, Eb2, Ab2, A2)
    const acidBassline = [
      73.42, 73.42, 0, 77.78,
      73.42, 0, 103.83, 73.42,
      73.42, 73.42, 110.00, 0,
      77.78, 103.83, 73.42, 65.41
    ];

    // Arpeggiator agressif dissonant
    const sadisticArp = [
      293.66, 311.13, 369.99, 415.30,
      587.33, 415.30, 369.99, 311.13,
      293.66, 415.30, 311.13, 369.99,
      622.25, 587.33, 415.30, 311.13
    ];

    const distortionCurve = this.makeDistortionCurve(75);

    const playStep = () => {
      if (!this.musicPlaying || this.currentTrack !== 'SADISTIC_CARNAGE' || !this.ctx || this.isDestroyed) return;
      const now = this.ctx.currentTime;
      const dest = this.getMusicOutput();
      const currentIntensity = this.musicIntensity || 'TENSION';

      // 1. Basse Acide 303 Distordue
      const bassFreq = acidBassline[step % acidBassline.length];
      if (bassFreq > 0 && (currentIntensity !== 'CALM' || step % 2 === 0)) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const shaper = this.ctx.createWaveShaper();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, now);

        filter.type = 'lowpass';
        const cutoffStart = currentIntensity === 'COMBO' ? 2400 : 1200;
        const cutoffEnd = currentIntensity === 'CALM' ? 120 : 180;
        filter.frequency.setValueAtTime(cutoffStart, now);
        filter.frequency.exponentialRampToValueAtTime(cutoffEnd, now + stepDuration * 0.85);
        filter.Q.value = currentIntensity === 'COMBO' ? 9.5 : 6.5;

        shaper.curve = distortionCurve;
        shaper.oversample = '2x';

        const bassVol = currentIntensity === 'COMBO' ? 0.26 : (currentIntensity === 'CALM' ? 0.14 : 0.20);
        gain.gain.setValueAtTime(bassVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.9);

        osc.connect(filter);
        filter.connect(shaper);
        shaper.connect(gain);
        gain.connect(dest);

        osc.onended = () => this.cleanupNodes(osc, filter, shaper, gain);
        osc.start(now);
        osc.stop(now + stepDuration * 0.9);
      }

      // 2. Arpeggiator Dissonant
      if (currentIntensity !== 'CALM') {
        const arpFreq = sadisticArp[step % sadisticArp.length];
        const arpOsc = this.ctx.createOscillator();
        const arpFilter = this.ctx.createBiquadFilter();
        const arpGain = this.ctx.createGain();

        arpOsc.type = 'sawtooth';
        arpOsc.frequency.setValueAtTime(arpFreq, now);

        arpFilter.type = 'bandpass';
        arpFilter.frequency.setValueAtTime(1600, now);
        arpFilter.Q.value = 4.0;

        const arpVol = currentIntensity === 'COMBO' ? 0.08 : 0.05;
        arpGain.gain.setValueAtTime(arpVol, now);
        arpGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.7);

        arpOsc.connect(arpFilter);
        arpFilter.connect(arpGain);
        arpGain.connect(dest);

        arpOsc.onended = () => this.cleanupNodes(arpOsc, arpFilter, arpGain);
        arpOsc.start(now);
        arpOsc.stop(now + stepDuration * 0.7);
      }

      // 3. Rythmique Industrielle
      if (step % 4 === 0) {
        if (currentIntensity !== 'CALM' || (step % 8 === 0)) {
          this.playHeavyIndustrialKick(now, currentIntensity === 'COMBO');
        }
      }

      if (step % 8 === 4 && currentIntensity !== 'CALM') {
        this.playRazorIndustrialSnare(now, currentIntensity === 'COMBO');
      }

      if (step % 2 === 1 && currentIntensity !== 'CALM') {
        this.playHiHat(now);
      }

      if (currentIntensity === 'COMBO' && step % 2 === 0) {
        this.playHiHat(now);
      }

      step++;
      this.musicTimer = setTimeout(playStep, stepDuration * 1000);
    };

    playStep();
  }

  setSadisticIntensity(level) {
    this.musicIntensity = level;
  }

  playHeavyIndustrialKick(time, isOverdrive = false) {
    if (!this.ctx || this.isDestroyed) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isOverdrive ? 185 : 155, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.16);

    gain.gain.setValueAtTime(isOverdrive ? 0.48 : 0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.getMusicOutput());

    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  playRazorIndustrialSnare(time, isOverdrive = false) {
    if (!this.ctx || this.isDestroyed) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.16);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isOverdrive ? 2200 : 1600, time);
    filter.Q.value = 3.2;

    const bodyOsc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(210, time);
    bodyOsc.frequency.exponentialRampToValueAtTime(80, time + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isOverdrive ? 0.32 : 0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    noise.connect(filter);
    filter.connect(gain);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(gain);
    gain.connect(this.getMusicOutput());

    noise.onended = () => this.cleanupNodes(noise, filter, bodyOsc, bodyGain, gain);
    noise.start(time);
    bodyOsc.start(time);
    bodyOsc.stop(time + 0.08);
  }

  // ============================================================================
  // CRIS SADIQUES PROCÉDURAUX DE PIÉTONS
  // ============================================================================

  playSadisticScreamHorror() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    const modOsc = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    modOsc.type = 'sine';
    modOsc.frequency.setValueAtTime(22, now);
    modGain.gain.setValueAtTime(140, now);

    const carrierOsc = this.ctx.createOscillator();
    carrierOsc.type = 'sawtooth';
    carrierOsc.frequency.setValueAtTime(920, now);
    carrierOsc.frequency.exponentialRampToValueAtTime(190, now + 0.45);

    modOsc.connect(carrierOsc.frequency);

    const formantFilter = this.ctx.createBiquadFilter();
    formantFilter.type = 'bandpass';
    formantFilter.frequency.setValueAtTime(1850, now);
    formantFilter.frequency.linearRampToValueAtTime(850, now + 0.45);
    formantFilter.Q.value = 4.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.48, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    carrierOsc.connect(formantFilter);
    formantFilter.connect(gain);
    gain.connect(dest);

    carrierOsc.onended = () => this.cleanupNodes(carrierOsc, modOsc, modGain, formantFilter, gain);
    modOsc.start(now);
    carrierOsc.start(now);
    modOsc.stop(now + 0.48);
    carrierOsc.stop(now + 0.48);
  }

  playSadisticScreamComic() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.linearRampToValueAtTime(1750, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.32);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.value = 5.0;

    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.onended = () => this.cleanupNodes(osc, filter, gain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  playSadisticScreamBurlesque() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(1250, now + 0.07);
    osc.frequency.linearRampToValueAtTime(950, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.42);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(dest);

    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  playSadisticScream() {
    const r = Math.random();
    if (r < 0.4) {
      this.playSadisticScreamHorror();
    } else if (r < 0.72) {
      this.playSadisticScreamComic();
    } else {
      this.playSadisticScreamBurlesque();
    }
  }

  // ============================================================================
  // EFFET DOS D'ÂNE CARTOON : "BOING-FWUMP"
  // ============================================================================

  playSpeedBumpBoingFwump(intensity = 1.0) {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    // 1. Ressort Cartoon BOING
    const springOsc = this.ctx.createOscillator();
    const springGain = this.ctx.createGain();
    const springFilter = this.ctx.createBiquadFilter();

    springOsc.type = 'sine';
    springOsc.frequency.setValueAtTime(130, now);
    springOsc.frequency.exponentialRampToValueAtTime(540, now + 0.14);
    springOsc.frequency.exponentialRampToValueAtTime(260, now + 0.32);

    springFilter.type = 'bandpass';
    springFilter.frequency.setValueAtTime(420, now);
    springFilter.Q.value = 6.0;

    springGain.gain.setValueAtTime(0.45 * intensity, now);
    springGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    springOsc.connect(springFilter);
    springFilter.connect(springGain);
    springGain.connect(dest);

    springOsc.onended = () => this.cleanupNodes(springOsc, springFilter, springGain);
    springOsc.start(now);
    springOsc.stop(now + 0.34);

    // 2. Écrasement Châssis FWUMP
    const fwumpTime = now + 0.04;
    const fwumpOsc = this.ctx.createOscillator();
    const fwumpGain = this.ctx.createGain();

    fwumpOsc.type = 'triangle';
    fwumpOsc.frequency.setValueAtTime(95, fwumpTime);
    fwumpOsc.frequency.exponentialRampToValueAtTime(26, fwumpTime + 0.22);

    fwumpGain.gain.setValueAtTime(0.55 * intensity, fwumpTime);
    fwumpGain.gain.exponentialRampToValueAtTime(0.001, fwumpTime + 0.24);

    fwumpOsc.connect(fwumpGain);
    fwumpGain.connect(dest);

    fwumpOsc.onended = () => this.cleanupNodes(fwumpOsc, fwumpGain);
    fwumpOsc.start(fwumpTime);
    fwumpOsc.stop(fwumpTime + 0.24);
  }

  // ============================================================================
  // ALERTE DE VERBALISATION FEU ROUGE
  // ============================================================================

  playRedLightViolation() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    // 1. Buzz strident d'infraction routière
    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    const buzzGain = this.ctx.createGain();

    oscA.type = 'sawtooth';
    oscB.type = 'sawtooth';
    oscA.frequency.setValueAtTime(440, now);
    oscB.frequency.setValueAtTime(466.16, now);

    buzzGain.gain.setValueAtTime(0.35, now);
    buzzGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    oscA.connect(buzzGain);
    oscB.connect(buzzGain);
    buzzGain.connect(dest);

    oscA.onended = () => this.cleanupNodes(oscA, oscB, buzzGain);
    oscA.start(now);
    oscB.start(now);
    oscA.stop(now + 0.22);
    oscB.stop(now + 0.22);

    // 2. Double tut-tut de contravention
    for (let i = 0; i < 2; i++) {
      const beepTime = now + 0.24 + (i * 0.11);
      const tutOsc = this.ctx.createOscillator();
      const tutGain = this.ctx.createGain();

      tutOsc.type = 'square';
      tutOsc.frequency.setValueAtTime(1046.50, beepTime);

      tutGain.gain.setValueAtTime(0.28, beepTime);
      tutGain.gain.exponentialRampToValueAtTime(0.001, beepTime + 0.08);

      tutOsc.connect(tutGain);
      tutGain.connect(dest);

      tutOsc.onended = () => this.cleanupNodes(tutOsc, tutGain);
      tutOsc.start(beepTime);
      tutOsc.stop(beepTime + 0.08);
    }
  }

  // Rire démoniaque et sadique lors des massacres
  playEvilLaugh() {
    if (!this.ctx || this.isMutedSfx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const laughNotes = [260, 220, 290, 210, 270, 180, 150];

    laughNotes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.085;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, noteTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.75, noteTime + 0.08);

      gain.gain.setValueAtTime(0.22, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.onended = () => this.cleanupNodes(osc, gain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.085);
    });
  }

  // Bruitage d'écrasement / démembrement sadique
  playSplatKill() {
    if (!this.ctx || this.isMutedSfx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playHiHat(time) {
    if (!this.ctx || this.isDestroyed) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.onended = () => this.cleanupNodes(noise, filter, gain);
    noise.start(time);
  }

  // ============================================================================
  // COMPOSITION MUSICALE SADIQUE & DIABOLIQUE (138 BPM, PHRYGIEN & TRITON)
  // ============================================================================

  makeDistortionCurve(amount = 75) {
    const k = typeof amount === 'number' ? amount : 75;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  playSadisticCarnageTheme(intensity = 'TENSION') {
    if (this.isMutedMusic || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    this.stopMusic();
    this.musicPlaying = true;
    this.currentTrack = 'SADISTIC_CARNAGE';
    this.musicIntensity = intensity;

    const tempo = 138;
    const beatDuration = 60 / tempo;
    const stepDuration = beatDuration / 4; // Double-croches
    let step = 0;

    // Basse 303 en Ré Phrygien avec le Triton du Diable (D2, Eb2, Ab2, A2)
    const acidBassline = [
      73.42, 73.42, 0, 77.78,
      73.42, 0, 103.83, 73.42,
      73.42, 73.42, 110.00, 0,
      77.78, 103.83, 73.42, 65.41
    ];

    // Arpeggiator agressif dissonant
    const sadisticArp = [
      293.66, 311.13, 369.99, 415.30,
      587.33, 415.30, 369.99, 311.13,
      293.66, 415.30, 311.13, 369.99,
      622.25, 587.33, 415.30, 311.13
    ];

    const distortionCurve = this.makeDistortionCurve(75);

    const playStep = () => {
      if (!this.musicPlaying || this.currentTrack !== 'SADISTIC_CARNAGE' || !this.ctx || this.isDestroyed) return;
      const now = this.ctx.currentTime;
      const dest = this.getMusicOutput();
      const currentIntensity = this.musicIntensity || 'TENSION';

      // 1. Basse Acide 303 Distordue
      const bassFreq = acidBassline[step % acidBassline.length];
      if (bassFreq > 0 && (currentIntensity !== 'CALM' || step % 2 === 0)) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const shaper = this.ctx.createWaveShaper();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, now);

        filter.type = 'lowpass';
        const cutoffStart = currentIntensity === 'COMBO' ? 2400 : 1200;
        const cutoffEnd = currentIntensity === 'CALM' ? 120 : 180;
        filter.frequency.setValueAtTime(cutoffStart, now);
        filter.frequency.exponentialRampToValueAtTime(cutoffEnd, now + stepDuration * 0.85);
        filter.Q.value = currentIntensity === 'COMBO' ? 9.5 : 6.5;

        shaper.curve = distortionCurve;
        shaper.oversample = '2x';

        const bassVol = currentIntensity === 'COMBO' ? 0.26 : (currentIntensity === 'CALM' ? 0.14 : 0.20);
        gain.gain.setValueAtTime(bassVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.9);

        osc.connect(filter);
        filter.connect(shaper);
        shaper.connect(gain);
        gain.connect(dest);

        osc.onended = () => this.cleanupNodes(osc, filter, shaper, gain);
        osc.start(now);
        osc.stop(now + stepDuration * 0.9);
      }

      // 2. Arpeggiator Dissonant
      if (currentIntensity !== 'CALM') {
        const arpFreq = sadisticArp[step % sadisticArp.length];
        const arpOsc = this.ctx.createOscillator();
        const arpFilter = this.ctx.createBiquadFilter();
        const arpGain = this.ctx.createGain();

        arpOsc.type = 'sawtooth';
        arpOsc.frequency.setValueAtTime(arpFreq, now);

        arpFilter.type = 'bandpass';
        arpFilter.frequency.setValueAtTime(1600, now);
        arpFilter.Q.value = 4.0;

        const arpVol = currentIntensity === 'COMBO' ? 0.08 : 0.05;
        arpGain.gain.setValueAtTime(arpVol, now);
        arpGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.7);

        arpOsc.connect(arpFilter);
        arpFilter.connect(arpGain);
        arpGain.connect(dest);

        arpOsc.onended = () => this.cleanupNodes(arpOsc, arpFilter, arpGain);
        arpOsc.start(now);
        arpOsc.stop(now + stepDuration * 0.7);
      }

      // 3. Rythmique Industrielle
      if (step % 4 === 0) {
        if (currentIntensity !== 'CALM' || (step % 8 === 0)) {
          this.playHeavyIndustrialKick(now, currentIntensity === 'COMBO');
        }
      }

      if (step % 8 === 4 && currentIntensity !== 'CALM') {
        this.playRazorIndustrialSnare(now, currentIntensity === 'COMBO');
      }

      if (step % 2 === 1 && currentIntensity !== 'CALM') {
        this.playHiHat(now);
      }

      if (currentIntensity === 'COMBO' && step % 2 === 0) {
        this.playHiHat(now);
      }

      step++;
      this.musicTimer = setTimeout(playStep, stepDuration * 1000);
    };

    playStep();
  }

  setSadisticIntensity(level) {
    this.musicIntensity = level;
  }

  playHeavyIndustrialKick(time, isOverdrive = false) {
    if (!this.ctx || this.isDestroyed) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isOverdrive ? 185 : 155, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.16);

    gain.gain.setValueAtTime(isOverdrive ? 0.48 : 0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.getMusicOutput());

    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  playRazorIndustrialSnare(time, isOverdrive = false) {
    if (!this.ctx || this.isDestroyed) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.16);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isOverdrive ? 2200 : 1600, time);
    filter.Q.value = 3.2;

    const bodyOsc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(210, time);
    bodyOsc.frequency.exponentialRampToValueAtTime(80, time + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isOverdrive ? 0.32 : 0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    noise.connect(filter);
    filter.connect(gain);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(gain);
    gain.connect(this.getMusicOutput());

    noise.onended = () => this.cleanupNodes(noise, filter, bodyOsc, bodyGain, gain);
    noise.start(time);
    bodyOsc.start(time);
    bodyOsc.stop(time + 0.08);
  }

  // ============================================================================
  // CRIS SADIQUES PROCÉDURAUX DE PIÉTONS
  // ============================================================================

  playSadisticScreamHorror() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    const modOsc = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    modOsc.type = 'sine';
    modOsc.frequency.setValueAtTime(22, now);
    modGain.gain.setValueAtTime(140, now);

    const carrierOsc = this.ctx.createOscillator();
    carrierOsc.type = 'sawtooth';
    carrierOsc.frequency.setValueAtTime(920, now);
    carrierOsc.frequency.exponentialRampToValueAtTime(190, now + 0.45);

    modOsc.connect(carrierOsc.frequency);

    const formantFilter = this.ctx.createBiquadFilter();
    formantFilter.type = 'bandpass';
    formantFilter.frequency.setValueAtTime(1850, now);
    formantFilter.frequency.linearRampToValueAtTime(850, now + 0.45);
    formantFilter.Q.value = 4.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.48, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    carrierOsc.connect(formantFilter);
    formantFilter.connect(gain);
    gain.connect(dest);

    carrierOsc.onended = () => this.cleanupNodes(carrierOsc, modOsc, modGain, formantFilter, gain);
    modOsc.start(now);
    carrierOsc.start(now);
    modOsc.stop(now + 0.48);
    carrierOsc.stop(now + 0.48);
  }

  playSadisticScreamComic() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.linearRampToValueAtTime(1750, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.32);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.value = 5.0;

    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.onended = () => this.cleanupNodes(osc, filter, gain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  playSadisticScreamBurlesque() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(1250, now + 0.07);
    osc.frequency.linearRampToValueAtTime(950, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.42);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(dest);

    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  playSadisticScream() {
    const r = Math.random();
    if (r < 0.4) {
      this.playSadisticScreamHorror();
    } else if (r < 0.72) {
      this.playSadisticScreamComic();
    } else {
      this.playSadisticScreamBurlesque();
    }
  }

  // ============================================================================
  // EFFET DOS D'ÂNE CARTOON : "BOING-FWUMP"
  // ============================================================================

  playSpeedBumpBoingFwump(intensity = 1.0) {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    // 1. Ressort Cartoon BOING
    const springOsc = this.ctx.createOscillator();
    const springGain = this.ctx.createGain();
    const springFilter = this.ctx.createBiquadFilter();

    springOsc.type = 'sine';
    springOsc.frequency.setValueAtTime(130, now);
    springOsc.frequency.exponentialRampToValueAtTime(540, now + 0.14);
    springOsc.frequency.exponentialRampToValueAtTime(260, now + 0.32);

    springFilter.type = 'bandpass';
    springFilter.frequency.setValueAtTime(420, now);
    springFilter.Q.value = 6.0;

    springGain.gain.setValueAtTime(0.45 * intensity, now);
    springGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    springOsc.connect(springFilter);
    springFilter.connect(springGain);
    springGain.connect(dest);

    springOsc.onended = () => this.cleanupNodes(springOsc, springFilter, springGain);
    springOsc.start(now);
    springOsc.stop(now + 0.34);

    // 2. Écrasement Châssis FWUMP
    const fwumpTime = now + 0.04;
    const fwumpOsc = this.ctx.createOscillator();
    const fwumpGain = this.ctx.createGain();

    fwumpOsc.type = 'triangle';
    fwumpOsc.frequency.setValueAtTime(95, fwumpTime);
    fwumpOsc.frequency.exponentialRampToValueAtTime(26, fwumpTime + 0.22);

    fwumpGain.gain.setValueAtTime(0.55 * intensity, fwumpTime);
    fwumpGain.gain.exponentialRampToValueAtTime(0.001, fwumpTime + 0.24);

    fwumpOsc.connect(fwumpGain);
    fwumpGain.connect(dest);

    fwumpOsc.onended = () => this.cleanupNodes(fwumpOsc, fwumpGain);
    fwumpOsc.start(fwumpTime);
    fwumpOsc.stop(fwumpTime + 0.24);
  }

  // ============================================================================
  // ALERTE DE VERBALISATION FEU ROUGE
  // ============================================================================

  playRedLightViolation() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    const now = this.ctx.currentTime;
    const dest = this.getMusicOutput();

    // 1. Buzz strident d'infraction routière
    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    const buzzGain = this.ctx.createGain();

    oscA.type = 'sawtooth';
    oscB.type = 'sawtooth';
    oscA.frequency.setValueAtTime(440, now);
    oscB.frequency.setValueAtTime(466.16, now);

    buzzGain.gain.setValueAtTime(0.35, now);
    buzzGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    oscA.connect(buzzGain);
    oscB.connect(buzzGain);
    buzzGain.connect(dest);

    oscA.onended = () => this.cleanupNodes(oscA, oscB, buzzGain);
    oscA.start(now);
    oscB.start(now);
    oscA.stop(now + 0.22);
    oscB.stop(now + 0.22);

    // 2. Double tut-tut de contravention
    for (let i = 0; i < 2; i++) {
      const beepTime = now + 0.24 + (i * 0.11);
      const tutOsc = this.ctx.createOscillator();
      const tutGain = this.ctx.createGain();

      tutOsc.type = 'square';
      tutOsc.frequency.setValueAtTime(1046.50, beepTime);

      tutGain.gain.setValueAtTime(0.28, beepTime);
      tutGain.gain.exponentialRampToValueAtTime(0.001, beepTime + 0.08);

      tutOsc.connect(tutGain);
      tutGain.connect(dest);

      tutOsc.onended = () => this.cleanupNodes(tutOsc, tutGain);
      tutOsc.start(beepTime);
      tutOsc.stop(beepTime + 0.08);
    }
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  toggleSfx(enabled) {
    this.isMutedSfx = !enabled;
    storage.updateSettings({ sfx: enabled });
    if (!enabled) {
      this.stopEngine();
    }
  }

  toggleMusic(enabled) {
    this.isMutedMusic = !enabled;
    storage.updateSettings({ music: enabled });
    if (!enabled) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
  }
}

export const soundManager = new SoundManager();

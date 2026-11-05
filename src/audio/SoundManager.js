/**
 * Motormageddon - Moteur Audio Procédural WebAudio Haute Performance
 * Sons cartoon, ambiance moteur réactive et musique arcade rétro-dynamique.
 * Gestion mémoire stricte, déconnexion des nœuds audio et cycle de vie Android (Background/Pause/Exit).
 */

import { storage } from '../core/Storage.js';
import { App } from '@capacitor/app';

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

    this.initContext();
    this.bindLifecycleEvents();
  }

  initContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass && !this.ctx) {
      this.ctx = new AudioContextClass();
    }
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

  playCoin() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

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

  playHorn() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(440, now); // A4
    osc2.frequency.setValueAtTime(554.37, now); // C#5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.onended = () => this.cleanupNodes(osc1, osc2, gain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  playComboFanfare(multiplier) {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

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

  playClick() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.onended = () => this.cleanupNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playVictory() {
    if (this.isMutedSfx || !this.ctx || this.isDestroyed) return;
    this.resumeContext();

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

  // --- SON DU MOTEUR (DYNAMIQUE) ---

  startEngine() {
    if (this.engineOsc || !this.ctx || this.isMutedSfx || this.isDestroyed) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'triangle';
    this.engineOsc.frequency.setValueAtTime(55, now);
    this.engineGain.gain.setValueAtTime(0.025, now);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(200, now);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start(now);
  }

  updateEngine(speedRatio) {
    if (!this.engineOsc || !this.ctx || this.isDestroyed) return;
    const now = this.ctx.currentTime;
    const clampedRatio = Math.max(0, Math.min(1.5, speedRatio));
    const targetFreq = 55 + clampedRatio * 55;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);

    if (this.engineFilter) {
      this.engineFilter.frequency.setTargetAtTime(180 + clampedRatio * 160, now, 0.08);
    }
  }

  stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.cleanupNodes(this.engineOsc, this.engineFilter, this.engineGain);
      } catch (e) {}
      this.engineOsc = null;
      this.engineGain = null;
      this.engineFilter = null;
    }
  }

  // --- MUSIQUE D'ARCADE ÉNERGIQUE PROCÉDURALE ---

  startMusic() {
    if (this.musicPlaying || this.isMutedMusic || !this.ctx || this.isDestroyed) return;
    this.resumeContext();
    this.musicPlaying = true;

    const tempo = 132;
    const beatDuration = 60 / tempo;
    const stepDuration = beatDuration / 2;
    let step = 0;

    const bassLine = [
      130.81, 130.81, 196.00, 130.81, 164.81, 130.81, 196.00, 261.63,
      110.00, 110.00, 164.81, 110.00, 146.83, 110.00, 164.81, 220.00,
      87.31, 87.31, 130.81, 87.31, 116.54, 87.31, 130.81, 174.61,
      98.00, 98.00, 146.83, 98.00, 123.47, 98.00, 146.83, 196.00
    ];

    const leadLine = [
      523.25, 0, 659.25, 783.99, 0, 659.25, 523.25, 0,
      440.00, 0, 523.25, 659.25, 0, 523.25, 440.00, 0,
      349.23, 0, 440.00, 523.25, 0, 440.00, 349.23, 0,
      392.00, 493.88, 587.33, 698.46, 783.99, 698.46, 587.33, 493.88
    ];

    const playStep = () => {
      if (!this.musicPlaying || !this.ctx || this.isDestroyed) return;
      const now = this.ctx.currentTime;

      // Note de basse
      const bassFreq = bassLine[step % bassLine.length];
      if (bassFreq > 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        bassGain.gain.setValueAtTime(0.12, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.9);

        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx.destination);

        bassOsc.onended = () => this.cleanupNodes(bassOsc, bassGain);
        bassOsc.start(now);
        bassOsc.stop(now + stepDuration * 0.9);
      }

      // Note de lead
      const leadFreq = leadLine[step % leadLine.length];
      if (leadFreq > 0) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'sine';
        leadOsc.frequency.setValueAtTime(leadFreq, now);

        leadGain.gain.setValueAtTime(0.08, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.75);

        leadOsc.connect(leadGain);
        leadGain.connect(this.ctx.destination);

        leadOsc.onended = () => this.cleanupNodes(leadOsc, leadGain);
        leadOsc.start(now);
        leadOsc.stop(now + stepDuration * 0.75);
      }

      // Charleston / Hi-Hat rythmique arcade sur chaque contre-temps
      if (step % 2 === 1) {
        this.playHiHat(now);
      }

      step++;
      this.musicTimer = setTimeout(playStep, stepDuration * 1000);
    };

    playStep();
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

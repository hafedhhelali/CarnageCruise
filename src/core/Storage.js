/**
 * Motormageddon - Système de Sauvegarde Persistante Robuste
 * Sauvegarde les scores, déblocages de villes, motos et paramètres.
 */

const STORAGE_KEY = 'motormageddon_save_v1';

const DEFAULT_SAVE = {
  version: 1,
  coins: 500, // Pièces de départ pour se faire plaisir
  unlockedCities: ['paris'],
  cityScores: {
    paris: { bestScore: 0, stars: 0, completed: false },
    lyon: { bestScore: 0, stars: 0, completed: false },
    marseille: { bestScore: 0, stars: 0, completed: false },
    nice: { bestScore: 0, stars: 0, completed: false },
    bordeaux: { bestScore: 0, stars: 0, completed: false },
    toulouse: { bestScore: 0, stars: 0, completed: false },
    lille: { bestScore: 0, stars: 0, completed: false },
    strasbourg: { bestScore: 0, stars: 0, completed: false }
  },
  unlockedBikes: ['scooter'],
  equippedBike: 'scooter',
  bikeColors: {
    scooter: '#e74c3c',
    sport: '#3498db',
    chopper: '#f39c12',
    trike: '#9b59b6'
  },
  equippedAccessories: {
    helmet: 'beret',
    glasses: 'shades'
  },
  settings: {
    sfx: true,
    music: true,
    vibration: true,
    controlMode: 'swipe' // 'swipe' ou 'buttons'
  },
  stats: {
    totalInteractions: 0,
    totalDistance: 0,
    totalRuns: 0
  }
};

export class Storage {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Fusion profonde avec le défaut pour garantir la compatibilité
        return {
          ...DEFAULT_SAVE,
          ...parsed,
          cityScores: { ...DEFAULT_SAVE.cityScores, ...(parsed.cityScores || {}) },
          bikeColors: { ...DEFAULT_SAVE.bikeColors, ...(parsed.bikeColors || {}) },
          settings: { ...DEFAULT_SAVE.settings, ...(parsed.settings || {}) },
          stats: { ...DEFAULT_SAVE.stats, ...(parsed.stats || {}) }
        };
      }
    } catch (e) {
      console.warn('[Storage] Impossible de lire localStorage, fallback mémoire', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SAVE));
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('[Storage] Échec de la sauvegarde', e);
    }
  }

  getCityData(cityId) {
    return this.data.cityScores[cityId] || { bestScore: 0, stars: 0, completed: false };
  }

  isCityUnlocked(cityId) {
    return this.data.unlockedCities.includes(cityId);
  }

  unlockCity(cityId) {
    if (!this.data.unlockedCities.includes(cityId)) {
      this.data.unlockedCities.push(cityId);
      this.save();
      return true;
    }
    return false;
  }

  recordRunResult(cityId, score, starsEarned, coinsEarned, interactionsCount, distance) {
    const city = this.data.cityScores[cityId] || { bestScore: 0, stars: 0, completed: false };
    const isNewBest = score > city.bestScore;
    if (isNewBest) {
      city.bestScore = score;
    }
    city.stars = Math.max(city.stars, starsEarned);
    if (starsEarned >= 1) city.completed = true;

    this.data.cityScores[cityId] = city;
    this.data.coins += coinsEarned;

    // Statistiques globales
    this.data.stats.totalInteractions += interactionsCount;
    this.data.stats.totalDistance += distance;
    this.data.stats.totalRuns += 1;

    this.save();
    return { isNewBest, previousBest: city.bestScore };
  }

  unlockBike(bikeId, cost) {
    if (!this.data.unlockedBikes.includes(bikeId)) {
      if (this.data.coins >= cost) {
        this.data.coins -= cost;
        this.data.unlockedBikes.push(bikeId);
        this.data.equippedBike = bikeId;
        this.save();
        return { success: true };
      }
      return { success: false, reason: 'Pas assez de pièces !' };
    }
    return { success: true, alreadyOwned: true };
  }

  equipBike(bikeId) {
    if (this.data.unlockedBikes.includes(bikeId)) {
      this.data.equippedBike = bikeId;
      this.save();
      return true;
    }
    return false;
  }

  setBikeColor(bikeId, colorHex) {
    this.data.bikeColors[bikeId] = colorHex;
    this.save();
  }

  getEquippedBike() {
    return this.data.equippedBike;
  }

  getBikeColor(bikeId) {
    return this.data.bikeColors[bikeId] || '#e74c3c';
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
  }

  resetAll() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    this.save();
  }
}

export const storage = new Storage();

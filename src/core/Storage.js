/**
 * Motormageddon - Système de Sauvegarde Persistante Robuste
 * Sauvegarde les scores, déblocages de villes, motos, paramètres et profil joueur.
 */

const STORAGE_KEY = 'motormageddon_save_v1';

const DEFAULT_SAVE = {
  version: 2,
  playerName: 'Pilote Express',
  coins: 5000, // Pièces de départ
  unlockedCities: [
    'paris', 'bruxelles', 'londres', 'saint-malo', 'bordeaux', 'barcelone',
    'madrid', 'lisbonne',
    'millau', 'marseille', 'nice', 'milan', 'geneve', 'chamonix',
    'annecy', 'lyon', 'strasbourg', 'rome', 'napoli', 'tunis', 'annaba', 'alger',
    'berlin', 'amsterdam', 'seville', 'casablanca', 'venise', 'flamanville-nuc', 'doel-nuc', 'asco-nuc', 'tchernobyl'
  ],
  cityScores: {
    paris: { bestScore: 0, stars: 0, completed: false },
    lyon: { bestScore: 0, stars: 0, completed: false },
    marseille: { bestScore: 0, stars: 0, completed: false },
    nice: { bestScore: 0, stars: 0, completed: false },
    bordeaux: { bestScore: 0, stars: 0, completed: false },
    strasbourg: { bestScore: 0, stars: 0, completed: false }
  },
  unlockedBikes: ['tank', 'scooter', 'chopper', 'decapotable', 'trottinette_hache', 'cheval', 'run_ak47', 'run_chainsaw', 'rouleau', 'dragster', 'aero_jet'],
  equippedBike: 'scooter',
  bikeColors: {
    tank: '#3d4f36',
    scooter: '#e74c3c',
    chopper: '#f39c12',
    decapotable: '#c0392b',
    trottinette_hache: '#2ecc71',
    cheval: '#8b4513',
    run_ak47: '#2c3e50',
    run_chainsaw: '#e67e22',
    rouleau: '#f1c40f',
    dragster: '#111111',
    aero_jet: '#00cec9'
  },
  equippedAccessories: {
    helmet: 'beret',
    glasses: 'shades'
  },
  settings: {
    sfx: true,
    music: true,
    vibration: true,
    controlMode: 'swipe'
  },
  stats: {
    totalScore: 0,
    totalInteractions: 0, // Personnes heurtées
    totalKills: 0, // Exterminations sadique / carnage
    totalDistance: 0,
    totalRuns: 0,
    maxCombo: 1,
    redLightsRun: 0,
    crashesSurvived: 0
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
        return {
          ...DEFAULT_SAVE,
          ...parsed,
          unlockedCities: Array.from(new Set([...DEFAULT_SAVE.unlockedCities, ...(parsed.unlockedCities || [])])),
          unlockedBikes: Array.from(new Set([...DEFAULT_SAVE.unlockedBikes, ...(parsed.unlockedBikes || [])])),
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

  recordRunResult(cityId, score, starsEarned, coinsEarned, interactionsCount, distance, maxCombo = 1) {
    const city = this.data.cityScores[cityId] || { bestScore: 0, stars: 0, completed: false };
    const isNewBest = score > city.bestScore;
    if (isNewBest) {
      city.bestScore = score;
    }
    city.stars = Math.max(city.stars, starsEarned);
    if (starsEarned >= 1) city.completed = true;

    this.data.cityScores[cityId] = city;
    this.data.coins += coinsEarned;

    // Statistiques globales de profil
    this.data.stats.totalScore = (this.data.stats.totalScore || 0) + score;
    this.data.stats.totalInteractions = (this.data.stats.totalInteractions || 0) + interactionsCount;
    this.data.stats.totalDistance = (this.data.stats.totalDistance || 0) + distance;
    this.data.stats.totalRuns = (this.data.stats.totalRuns || 0) + 1;
    this.data.stats.maxCombo = Math.max(this.data.stats.maxCombo || 1, maxCombo);

    this.save();
    return { isNewBest, previousBest: city.bestScore };
  }

  recordCrashRecovery(redLight = false) {
    this.data.stats.crashesSurvived = (this.data.stats.crashesSurvived || 0) + 1;
    if (redLight) {
      this.data.stats.redLightsRun = (this.data.stats.redLightsRun || 0) + 1;
    }
    this.save();
  }

  addCoins(amount = 20) {
    this.data.coins = (this.data.coins || 0) + amount;
    this.save();
    return this.data.coins;
  }

  incrementTotalKills(amount = 1) {
    if (!this.data.stats.totalKills) this.data.stats.totalKills = 0;
    this.data.stats.totalKills += amount;
    this.save();
  }

  getTotalStars() {
    return Object.values(this.data.cityScores).reduce((acc, c) => acc + (c.stars || 0), 0);
  }

  getPlayerTitle() {
    const totalScore = this.data.stats.totalScore || 0;
    if (totalScore < 3000) return 'Débutant du Guidon';
    if (totalScore < 10000) return 'Slalomeur des Trottoirs';
    if (totalScore < 25000) return 'Terreur des Boulevards';
    if (totalScore < 60000) return 'As du Pavé Français';
    return 'Légende du Motormageddon';
  }

  setPlayerName(name) {
    if (name && name.trim()) {
      this.data.playerName = name.trim().slice(0, 16);
      this.save();
    }
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

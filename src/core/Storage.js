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
  exterminatedCities: [],
  unlockedBikes: ['tank', 'aero_jet', 'hovercraft', 'rad_rover', 'snowmobile', 'scooter', 'chopper', 'decapotable', 'trottinette_hache', 'cheval', 'run_ak47', 'run_chainsaw', 'rouleau', 'dragster'],
  equippedBike: 'tank',
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
    aero_jet: '#00cec9',
    hovercraft: '#0984e3',
    rad_rover: '#6c5ce7',
    snowmobile: '#dfe6e9'
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
  googleAccount: {
    isConnected: false,
    email: null,
    displayName: 'Pilote Anonyme',
    avatarUrl: null,
    lastCloudSync: null,
    cloudSaveId: null
  },
  worldmageddon: {
    streetVictims: 0,
    nuclearVictims: 0,
    damVictims: 0,
    mountainVictims: 0,
    tierIndex: 0
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
          exterminatedCities: Array.from(new Set(parsed.exterminatedCities || [])),
          cityScores: { ...DEFAULT_SAVE.cityScores, ...(parsed.cityScores || {}) },
          bikeColors: { ...DEFAULT_SAVE.bikeColors, ...(parsed.bikeColors || {}) },
          settings: { ...DEFAULT_SAVE.settings, ...(parsed.settings || {}) },
          googleAccount: { ...DEFAULT_SAVE.googleAccount, ...(parsed.googleAccount || {}) },
          worldmageddon: { ...DEFAULT_SAVE.worldmageddon, ...(parsed.worldmageddon || {}) },
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
    if (!cityId) return false;
    return this.data.unlockedCities.includes(cityId) || DEFAULT_SAVE.unlockedCities.includes(cityId);
  }

  unlockCity(cityId) {
    if (!this.data.unlockedCities.includes(cityId)) {
      this.data.unlockedCities.push(cityId);
      this.save();
      return true;
    }
    return false;
  }

  isCityExterminated(cityId) {
    if (!cityId) return false;
    return Array.isArray(this.data.exterminatedCities) && this.data.exterminatedCities.includes(cityId);
  }

  markCityExterminated(cityId, victims = 1500000) {
    if (!cityId) return;
    if (!Array.isArray(this.data.exterminatedCities)) {
      this.data.exterminatedCities = [];
    }
    if (!this.data.exterminatedCities.includes(cityId)) {
      this.data.exterminatedCities.push(cityId);
    }
    
    if (!this.data.cityScores) this.data.cityScores = {};
    if (!this.data.cityScores[cityId]) {
      this.data.cityScores[cityId] = { bestScore: victims, stars: 3, completed: true };
    } else {
      this.data.cityScores[cityId].stars = 3;
      this.data.cityScores[cityId].completed = true;
      this.data.cityScores[cityId].bestScore = Math.max(this.data.cityScores[cityId].bestScore || 0, victims);
    }

    this.recordCataclysmKill(victims, 'WMD');
    this.save();
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
    if (!bikeId) return false;
    if (!this.data.unlockedBikes.includes(bikeId)) {
      this.data.unlockedBikes.push(bikeId);
    }
    this.data.equippedBike = bikeId;
    this.save();
    return true;
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

  // --- GESTION DU COMPTE GOOGLE / GOOGLE PLAY GAMES & CLOUD SAVE ---

  connectGoogleAccount(email = 'pilote.worldmageddon@gmail.com', displayName = 'Commander Worldmageddon') {
    this.data.googleAccount = {
      isConnected: true,
      email,
      displayName,
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      lastCloudSync: new Date().toISOString(),
      cloudSaveId: 'GPLAY-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    };
    this.data.playerName = displayName;
    this.save();
    return this.data.googleAccount;
  }

  disconnectGoogleAccount() {
    this.data.googleAccount = {
      isConnected: false,
      email: null,
      displayName: 'Pilote Anonyme',
      avatarUrl: null,
      lastCloudSync: null,
      cloudSaveId: null
    };
    this.save();
    return this.data.googleAccount;
  }

  syncCloudSave() {
    if (!this.data.googleAccount || !this.data.googleAccount.isConnected) {
      return { success: false, reason: 'Aucun compte Google connecté !' };
    }
    this.data.googleAccount.lastCloudSync = new Date().toISOString();
    this.save();
    return {
      success: true,
      syncTime: this.data.googleAccount.lastCloudSync,
      cloudId: this.data.googleAccount.cloudSaveId
    };
  }

  exportSaveString() {
    try {
      const json = JSON.stringify(this.data);
      return btoa(unescape(encodeURIComponent(json)));
    } catch (e) {
      return JSON.stringify(this.data);
    }
  }

  importSaveString(saveStr) {
    if (!saveStr) return { success: false, reason: 'Code de sauvegarde vide !' };
    try {
      let json = '';
      try {
        json = decodeURIComponent(escape(atob(saveStr.trim())));
      } catch (e) {
        json = saveStr.trim();
      }
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed === 'object') {
        this.data = {
          ...DEFAULT_SAVE,
          ...parsed,
          stats: { ...DEFAULT_SAVE.stats, ...(parsed.stats || {}) }
        };
        this.save();
        return { success: true };
      }
    } catch (e) {
      return { success: false, reason: 'Format de sauvegarde invalide.' };
    }
    return { success: false, reason: 'Erreur inconnue.' };
  }

  // --- STATISTIQUES & RANGS D'EXTERMINATION WORLDMAGEDDON ---

  recordCataclysmKill(amount, type = 'STREET') {
    if (!this.data.worldmageddon) {
      this.data.worldmageddon = { streetVictims: 0, nuclearVictims: 0, damVictims: 0, mountainVictims: 0, tierIndex: 0 };
    }
    if (type === 'NUCLEAR') this.data.worldmageddon.nuclearVictims += amount;
    else if (type === 'DAM') this.data.worldmageddon.damVictims += amount;
    else if (type === 'MOUNTAIN') this.data.worldmageddon.mountainVictims += amount;
    else this.data.worldmageddon.streetVictims += amount;

    this.incrementTotalKills(amount);
  }

  getWorldmageddonProgress() {
    const total = (this.data.stats && this.data.stats.totalKills) || 0;
    const worldPop = 8000000000;
    const remaining = Math.max(0, worldPop - total);
    const pct = ((total / worldPop) * 100).toFixed(5);
    
    let rank = 'Menace Urbaine';
    let rankIcon = '🩸';
    let badgeColor = '#ff4757';

    if (total >= 1000000000) {
      rank = 'MAÎTRE DE L\'EXTINCTION MONDIALE';
      rankIcon = '☠️';
      badgeColor = '#ff3838';
    } else if (total >= 250000000) {
      rank = 'Effondrement des Civilisations';
      rankIcon = '☣️';
      badgeColor = '#ff5252';
    } else if (total >= 50000000) {
      rank = 'Fléau Continental Absolu';
      rankIcon = '🌋';
      badgeColor = '#ff793f';
    } else if (total >= 10000000) {
      rank = 'Dévastateur des Nations';
      rankIcon = '💥';
      badgeColor = '#ff9f1a';
    } else if (total >= 2000000) {
      rank = 'Cataclysme Régional';
      rankIcon = '🌊';
      badgeColor = '#00d2d3';
    } else if (total >= 500000) {
      rank = 'Terreur Métropolitaine';
      rankIcon = '☢️';
      badgeColor = '#2ed573';
    }

    return {
      totalKills: total,
      remaining,
      worldPop,
      percentage: pct,
      rank,
      rankIcon,
      badgeColor,
      byVector: {
        street: (this.data.worldmageddon && this.data.worldmageddon.streetVictims) || 0,
        nuclear: (this.data.worldmageddon && this.data.worldmageddon.nuclearVictims) || 0,
        dam: (this.data.worldmageddon && this.data.worldmageddon.damVictims) || 0,
        mountain: (this.data.worldmageddon && this.data.worldmageddon.mountainVictims) || 0
      }
    };
  }

  resetScores() {
    this.data.cityScores = {};
    if (this.data.stats) {
      this.data.stats.totalScore = 0;
      this.data.stats.totalRuns = 0;
      this.data.stats.maxCombo = 1;
    }
    this.save();
    return true;
  }

  resetWorldmageddonProgression() {
    this.data.exterminatedCities = [];
    this.data.cityScores = {};
    this.data.worldmageddon = {
      streetVictims: 0,
      nuclearVictims: 0,
      damVictims: 0,
      mountainVictims: 0,
      tierIndex: 0
    };
    if (this.data.stats) {
      this.data.stats.totalScore = 0;
      this.data.stats.totalInteractions = 0;
      this.data.stats.totalKills = 0;
      this.data.stats.totalDistance = 0;
      this.data.stats.totalRuns = 0;
      this.data.stats.maxCombo = 1;
    }
    this.save();
    return true;
  }

  resetAll() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    this.save();
  }
}

export const storage = new Storage();

/**
 * Motormageddon - Gestionnaire de l'État du Jeu (GameState)
 * Gère le cycle de vie, les scores, les combos, la vitesse et les objectifs.
 */

import { storage } from './Storage.js';
import { soundManager } from '../audio/SoundManager.js';

export const CITIES = [
  {
    id: 'paris',
    name: 'Paris',
    subtitle: 'La Ville Lumière',
    description: 'Foncez le long des grands boulevards haussmanniens et esquivez les serveurs de café pressés !',
    targetScore: 1500,
    starThresholds: [1500, 3500, 6000],
    unlockScoreRequired: 0,
    skyColor: 0x87ceeb,
    fogColor: 0xd8e8f8,
    ambientColor: 0xffffff,
    roadColor: 0x333538,
    buildingColors: [0xf5e6c8, 0xecd5b3, 0xd4c2a5, 0xe2d7c0],
    roofColor: 0x4a5568,
    accentColor: 0x3498db,
    unlockedByDefault: true,
    mapCoords: { x: 50, y: 32 } // Coordonnées en % sur la carte de France
  },
  {
    id: 'lyon',
    name: 'Lyon',
    subtitle: 'Capitale des Gaules',
    description: 'Slalomez entre les bouchons traditionnels, les traboules et les gastronomes en balade.',
    targetScore: 3500,
    starThresholds: [3500, 6500, 10000],
    unlockScoreRequired: 1500,
    skyColor: 0x90caf9,
    fogColor: 0xfdebd0,
    ambientColor: 0xfff3e0,
    roadColor: 0x3d3a37,
    buildingColors: [0xe67e22, 0xd35400, 0xf39c12, 0xc0392b],
    roofColor: 0x962d22,
    accentColor: 0xe67e22,
    unlockedByDefault: false,
    mapCoords: { x: 68, y: 58 }
  },
  {
    id: 'marseille',
    name: 'Marseille',
    subtitle: 'La Cité Phocéenne',
    description: 'Plein soleil sur la Canebière et le Vieux-Port ! Ambiance pétanque, mouettes et touristes bronzés.',
    targetScore: 6000,
    starThresholds: [6000, 11000, 18000],
    unlockScoreRequired: 3500,
    skyColor: 0x4fc3f7,
    fogColor: 0xe0f7fa,
    ambientColor: 0xfffde7,
    roadColor: 0x424242,
    buildingColors: [0xfff9c4, 0xffe082, 0xffcc80, 0x80deea],
    roofColor: 0xd84315,
    accentColor: 0x00bcd4,
    unlockedByDefault: false,
    mapCoords: { x: 72, y: 84 }
  },
  {
    id: 'nice',
    name: 'Nice',
    subtitle: 'La Promenade des Anglais',
    description: 'Palmiers, soleil éclatant et baigneurs égarés sur le bitume azuréen.',
    targetScore: 9000,
    starThresholds: [9000, 15000, 24000],
    unlockScoreRequired: 6000,
    skyColor: 0x29b6f6,
    fogColor: 0xe1f5fe,
    ambientColor: 0xfff9c4,
    roadColor: 0x37474f,
    buildingColors: [0xf8bbd0, 0xffcdd2, 0xffe0b2, 0xb2dfdb],
    roofColor: 0xc2185b,
    accentColor: 0xff4081,
    unlockedByDefault: false,
    mapCoords: { x: 88, y: 81 }
  },
  {
    id: 'bordeaux',
    name: 'Bordeaux',
    subtitle: 'La Belle Endormie Réveillée',
    description: 'Architecture néoclassique majestueuse, miroirs d’eau et coursiers bordelais.',
    targetScore: 12500,
    starThresholds: [12500, 20000, 30000],
    unlockScoreRequired: 9000,
    skyColor: 0x81d4fa,
    fogColor: 0xe8eaf6,
    ambientColor: 0xf5f5f5,
    roadColor: 0x303841,
    buildingColors: [0xe0d6c3, 0xd0c4b0, 0xded5c0, 0xc7bcab],
    roofColor: 0x37474f,
    accentColor: 0x8e24aa,
    unlockedByDefault: false,
    mapCoords: { x: 30, y: 67 }
  },
  {
    id: 'strasbourg',
    name: 'Strasbourg',
    subtitle: 'Capitale Européenne',
    description: 'Maisons à colombages, canaux et cigognes qui observent vos cascades.',
    targetScore: 16000,
    starThresholds: [16000, 25000, 40000],
    unlockScoreRequired: 12500,
    skyColor: 0x80cbc4,
    fogColor: 0xe0f2f1,
    ambientColor: 0xfff8e1,
    roadColor: 0x3e2723,
    buildingColors: [0xd7ccc8, 0xbcaaa4, 0xffcc80, 0xa1887f],
    roofColor: 0xb71c1c,
    accentColor: 0xd32f2f,
    unlockedByDefault: false,
    mapCoords: { x: 86, y: 32 }
  }
];

export const BIKES = [
  {
    id: 'scooter',
    name: 'La Guêpe 50cc',
    type: 'Scooter Rétro',
    description: 'Le charme vintage à la française ! Léger, vif et passe-partout.',
    speedRating: 3,
    handlingRating: 5,
    bounceRating: 4,
    cost: 0,
    unlocked: true,
    scale: 1.0,
    maxSpeed: 24,
    accel: 15,
    steerSpeed: 16
  },
  {
    id: 'sport',
    name: 'Foudre Noire 1000',
    type: 'Superbike',
    description: 'Une bête de course carénée prête à pulvériser le bitume urbain.',
    speedRating: 5,
    handlingRating: 3,
    bounceRating: 5,
    cost: 800,
    unlocked: false,
    scale: 1.05,
    maxSpeed: 34,
    accel: 22,
    steerSpeed: 18
  },
  {
    id: 'chopper',
    name: 'Le Chopper Paname',
    type: 'Custom Cruiser',
    description: 'Guidon haut, chromes étincelants et bruit d’échappement noble.',
    speedRating: 4,
    handlingRating: 3,
    bounceRating: 5,
    cost: 1500,
    unlocked: false,
    scale: 1.15,
    maxSpeed: 28,
    accel: 14,
    steerSpeed: 14
  },
  {
    id: 'trike',
    name: 'Le Trike Turbo',
    type: 'Monster 3-Roues',
    description: 'Stabilité maximale et propulseur arrière démesuré pour bousculer la ville.',
    speedRating: 4,
    handlingRating: 4,
    bounceRating: 5,
    cost: 2500,
    unlocked: false,
    scale: 1.25,
    maxSpeed: 30,
    accel: 18,
    steerSpeed: 15
  }
];

export const COMBO_TITLES = [
  "PAS MAL !",
  "ENCORE !",
  "OUH LÀ LÀ !",
  "STRIKE DE BAGUETTE !",
  "C'EST LA PANURGE !",
  "CHAMPION !",
  "LÉGENDES DES PAVÉS !",
  "MOTORMAGEDDON !"
];

export class GameState {
  constructor() {
    this.currentMode = 'SPLASH'; // SPLASH, MENU, MAP, GARAGE, PLAYING, PAUSED, RESULTS
    this.selectedCity = CITIES[0];
    this.selectedBike = BIKES[0];

    // Variables de course
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.comboMax = 1;
    this.coinsEarned = 0;
    this.interactionsCount = 0;
    this.distance = 0;
    this.speed = 0;
    this.isGameOver = false;

    // Listeners pour l'interface
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event, payload) {
    this.listeners.forEach(fn => fn(event, payload));
  }

  selectCity(cityId) {
    const city = CITIES.find(c => c.id === cityId);
    if (city && storage.isCityUnlocked(cityId)) {
      this.selectedCity = city;
      this.notify('city_selected', city);
      return true;
    }
    return false;
  }

  selectBike(bikeId) {
    const bike = BIKES.find(b => b.id === bikeId);
    if (bike) {
      this.selectedBike = bike;
      storage.equipBike(bikeId);
      this.notify('bike_selected', bike);
    }
  }

  startRun() {
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.comboMax = 1;
    this.coinsEarned = 0;
    this.interactionsCount = 0;
    this.distance = 0;
    this.speed = this.selectedBike.maxSpeed * 0.5;
    this.isGameOver = false;
    this.currentMode = 'PLAYING';

    soundManager.startEngine();
    soundManager.startMusic();
    this.notify('run_started', { city: this.selectedCity, bike: this.selectedBike });
  }

  addInteraction(points = 100, itemType = 'person') {
    if (this.currentMode !== 'PLAYING') return;

    this.interactionsCount++;
    this.comboTimer = 3.5; // Temps pour enchaîner
    this.combo = Math.min(this.combo + 1, 10);
    this.comboMax = Math.max(this.comboMax, this.combo);

    const totalAdded = points * this.combo;
    this.score += totalAdded;

    const coinsFromHit = Math.floor(totalAdded / 50) + 1;
    this.coinsEarned += coinsFromHit;

    soundManager.playBoing();
    if (this.combo > 2) {
      soundManager.playComboFanfare(this.combo);
    }

    const titleIndex = Math.min(this.combo - 1, COMBO_TITLES.length - 1);
    const comboTitle = COMBO_TITLES[titleIndex];

    this.notify('score_updated', {
      score: this.score,
      added: totalAdded,
      combo: this.combo,
      comboTitle,
      coinsEarned: this.coinsEarned,
      itemType
    });

    // Vérifier si le joueur a franchi le palier pour débloquer la ville suivante
    this.checkNextCityUnlock();
  }

  checkNextCityUnlock() {
    const currentIndex = CITIES.findIndex(c => c.id === this.selectedCity.id);
    if (currentIndex < CITIES.length - 1) {
      const nextCity = CITIES[currentIndex + 1];
      if (!storage.isCityUnlocked(nextCity.id) && this.score >= this.selectedCity.targetScore) {
        storage.unlockCity(nextCity.id);
        soundManager.playVictory();
        this.notify('city_unlocked', nextCity);
      }
    }
  }

  update(delta) {
    if (this.currentMode !== 'PLAYING') return;

    // Décompte du combo
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.notify('combo_reset', {});
      }
    }

    // Distance parcourue
    this.distance += this.speed * delta;
    this.notify('stats_tick', {
      distance: Math.floor(this.distance),
      speed: Math.floor(this.speed * 3.6), // km/h arcade
      score: this.score,
      targetScore: this.selectedCity.targetScore,
      progressRatio: Math.min(1.0, this.score / this.selectedCity.targetScore)
    });
  }

  endRun() {
    if (this.currentMode !== 'PLAYING') return;

    this.currentMode = 'RESULTS';
    this.isGameOver = true;
    soundManager.stopEngine();

    // Calcul des étoiles
    let stars = 0;
    const thresholds = this.selectedCity.starThresholds;
    if (this.score >= thresholds[2]) stars = 3;
    else if (this.score >= thresholds[1]) stars = 2;
    else if (this.score >= thresholds[0]) stars = 1;

    // Enregistrement persistant
    const saveResult = storage.recordRunResult(
      this.selectedCity.id,
      this.score,
      stars,
      this.coinsEarned,
      this.interactionsCount,
      Math.floor(this.distance)
    );

    // Déblocage automatique de la ville suivante si objectif atteint
    const currentIndex = CITIES.findIndex(c => c.id === this.selectedCity.id);
    let newlyUnlockedCity = null;
    if (currentIndex < CITIES.length - 1) {
      const nextCity = CITIES[currentIndex + 1];
      if (!storage.isCityUnlocked(nextCity.id) && this.score >= this.selectedCity.targetScore) {
        storage.unlockCity(nextCity.id);
        newlyUnlockedCity = nextCity;
      }
    }

    this.notify('run_ended', {
      score: this.score,
      isNewBest: saveResult.isNewBest,
      stars,
      coinsEarned: this.coinsEarned,
      interactions: this.interactionsCount,
      distance: Math.floor(this.distance),
      maxCombo: this.comboMax,
      city: this.selectedCity,
      newlyUnlockedCity
    });
  }
}

export const gameState = new GameState();

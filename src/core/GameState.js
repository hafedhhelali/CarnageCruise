/**
 * Motormageddon - Gestionnaire de l'État du Jeu (GameState)
 * Villes françaises enrichies (Montagne, Corniche, Lac, Mer, Ponts, Monuments)
 * et objectifs calibrés pour un véritable challenge d'arcade.
 */

import { storage } from './Storage.js';
import { soundManager } from '../audio/SoundManager.js';

export const CITIES = [
  {
    id: 'paris',
    name: 'Paris',
    emblem: '🗼',
    subtitle: 'La Ville Lumière & Grands Boulevards',
    typeTag: 'Monument & Avenues',
    description: 'Slalomez à vive allure sur les boulevards haussmanniens sous le regard de la Tour Eiffel !',
    targetScore: 2500,
    starThresholds: [2500, 5000, 8500],
    unlockScoreRequired: 0,
    skyColor: 0x87ceeb,
    fogColor: 0xd8e8f8,
    ambientColor: 0xffffff,
    roadColor: 0x333538,
    buildingColors: [0xf5e6c8, 0xecd5b3, 0xd4c2a5, 0xe2d7c0],
    roofColor: 0x4a5568,
    accentColor: 0x3498db,
    unlockedByDefault: true,
    mapCoords: { x: 50, y: 28 }
  },
  {
    id: 'lyon',
    name: 'Lyon',
    emblem: '🦁',
    subtitle: 'Traboules & Ponts de la Saône',
    typeTag: 'Fleuves & Ponts',
    description: 'Franchissez les ponts entre Rhône et Saône et esquivez les gastronomes des bouchons lyonnais.',
    targetScore: 6000,
    starThresholds: [6000, 11000, 18000],
    unlockScoreRequired: 2500,
    skyColor: 0x90caf9,
    fogColor: 0xfdebd0,
    ambientColor: 0xfff3e0,
    roadColor: 0x3d3a37,
    buildingColors: [0xe67e22, 0xd35400, 0xf39c12, 0xc0392b],
    roofColor: 0x962d22,
    accentColor: 0xe67e22,
    unlockedByDefault: false,
    mapCoords: { x: 67, y: 55 }
  },
  {
    id: 'marseille',
    name: 'Marseille',
    emblem: '⚓',
    subtitle: 'La Corniche Kennedy & Le Vieux-Port',
    typeTag: 'Corniche & Mer',
    description: 'Plein gaz face aux calanques ! Vue plongeante sur les flots azuréens et voiliers du port.',
    targetScore: 10500,
    starThresholds: [10500, 18000, 28000],
    unlockScoreRequired: 6000,
    skyColor: 0x4fc3f7,
    fogColor: 0xe0f7fa,
    ambientColor: 0xfffde7,
    roadColor: 0x424242,
    buildingColors: [0xfff9c4, 0xffe082, 0xffcc80, 0x80deea],
    roofColor: 0xd84315,
    accentColor: 0x00bcd4,
    unlockedByDefault: false,
    mapCoords: { x: 68, y: 84 }
  },
  {
    id: 'chamonix',
    name: 'Chamonix',
    emblem: '🏔️',
    subtitle: 'Col Alpin & Vue sur le Mont-Blanc',
    typeTag: 'Montagneuse & Cols',
    description: 'Lacets serrés de haute montagne entre chalets en bois, sapins enneigés et pics rocheux vertigineux.',
    targetScore: 16000,
    starThresholds: [16000, 26000, 40000],
    unlockScoreRequired: 10500,
    skyColor: 0x74b9ff,
    fogColor: 0xedf2f7,
    ambientColor: 0xf7fafc,
    roadColor: 0x2d3436,
    buildingColors: [0x5d4037, 0x795548, 0x8d6e63, 0x4e342e],
    roofColor: 0xecf0f1,
    accentColor: 0x00cec9,
    unlockedByDefault: false,
    mapCoords: { x: 80, y: 52 }
  },
  {
    id: 'annecy',
    name: 'Annecy',
    emblem: '⛵',
    subtitle: 'La Venise des Alpes & Son Lac',
    typeTag: 'Vue sur Lac Alpin',
    description: 'Rivages scintillants du lac d’Annecy, pontons fleuris et canaux romantiques au pied des falaises.',
    targetScore: 23000,
    starThresholds: [23000, 36000, 54000],
    unlockScoreRequired: 16000,
    skyColor: 0x81ecec,
    fogColor: 0xe0f7fa,
    ambientColor: 0xe8f5e9,
    roadColor: 0x37474f,
    buildingColors: [0xffeaa7, 0xfdcb6e, 0xf8a5c2, 0x78e08f],
    roofColor: 0xb71540,
    accentColor: 0x0984e3,
    unlockedByDefault: false,
    mapCoords: { x: 74, y: 48 }
  },
  {
    id: 'millau',
    name: 'Millau',
    emblem: '🌉',
    subtitle: 'Le Grand Viaduc Suspendu',
    typeTag: 'Ponts & Gorges',
    description: 'Franchissez le viaduc des records défiant les nuages à 270 mètres au-dessus des gorges du Tarn !',
    targetScore: 31000,
    starThresholds: [31000, 48000, 72000],
    unlockScoreRequired: 23000,
    skyColor: 0x64b5f6,
    fogColor: 0xe3f2fd,
    ambientColor: 0xfffde7,
    roadColor: 0x263238,
    buildingColors: [0xcfcfcf, 0xb0bec5, 0x90a4ae, 0x78909c],
    roofColor: 0x37474f,
    accentColor: 0xff3838,
    unlockedByDefault: false,
    mapCoords: { x: 54, y: 72 }
  },
  {
    id: 'nice',
    name: 'Nice',
    emblem: '🌴',
    subtitle: 'La Promenade des Anglais & Riviera',
    typeTag: 'Corniche & Palmiers',
    description: 'Palmiers ondulants, chaleur méditerranéenne et slaloms effrénés le long des palaces de la Baie des Anges.',
    targetScore: 40000,
    starThresholds: [40000, 62000, 92000],
    unlockScoreRequired: 31000,
    skyColor: 0x29b6f6,
    fogColor: 0xe1f5fe,
    ambientColor: 0xfff9c4,
    roadColor: 0x37474f,
    buildingColors: [0xf8bbd0, 0xffcdd2, 0xffe0b2, 0xb2dfdb],
    roofColor: 0xc2185b,
    accentColor: 0xff4081,
    unlockedByDefault: false,
    mapCoords: { x: 86, y: 78 }
  },
  {
    id: 'bordeaux',
    name: 'Bordeaux',
    emblem: '🍇',
    subtitle: 'Pont de Pierre & Miroir d’Eau',
    typeTag: 'Monuments & Quais',
    description: 'Quais impériaux de la Garonne, arches de pierre majestueuses et élégance architecturale classique.',
    targetScore: 50000,
    starThresholds: [50000, 78000, 115000],
    unlockScoreRequired: 40000,
    skyColor: 0x81d4fa,
    fogColor: 0xe8eaf6,
    ambientColor: 0xf5f5f5,
    roadColor: 0x303841,
    buildingColors: [0xe0d6c3, 0xd0c4b0, 0xded5c0, 0xc7bcab],
    roofColor: 0x37474f,
    accentColor: 0x8e24aa,
    unlockedByDefault: false,
    mapCoords: { x: 28, y: 65 }
  },
  {
    id: 'saint-malo',
    name: 'Saint-Malo',
    emblem: '🏰',
    subtitle: 'Cité Corsaire & Remparts Océaniques',
    typeTag: 'Côte & Remparts Granit',
    description: 'Vents d’ouest iodés, phares côtiers et remparts de granit imprenables face aux rouleaux atlantiques.',
    targetScore: 62000,
    starThresholds: [62000, 95000, 140000],
    unlockScoreRequired: 50000,
    skyColor: 0x487eb0,
    fogColor: 0xdcdde1,
    ambientColor: 0xf5f6fa,
    roadColor: 0x2f3640,
    buildingColors: [0x718093, 0xdcdde1, 0x57606f, 0xa4b0be],
    roofColor: 0x2f3542,
    accentColor: 0x00a8ff,
    unlockedByDefault: false,
    mapCoords: { x: 22, y: 32 }
  },
  {
    id: 'strasbourg',
    name: 'Strasbourg',
    emblem: '🥨',
    subtitle: 'Canaux de l’Ill & Flèche Gothique',
    typeTag: 'Canaux & Colombages',
    description: 'Maisons historiques à pans de bois, canaux de la Petite France et beffroi gothique monumental.',
    targetScore: 76000,
    starThresholds: [76000, 115000, 170000],
    unlockScoreRequired: 62000,
    skyColor: 0x80cbc4,
    fogColor: 0xe0f2f1,
    ambientColor: 0xfff8e1,
    roadColor: 0x3e2723,
    buildingColors: [0xd7ccc8, 0xbcaaa4, 0xffcc80, 0xa1887f],
    roofColor: 0xb71c1c,
    accentColor: 0xd32f2f,
    unlockedByDefault: false,
    mapCoords: { x: 88, y: 28 }
  }
];

export const BIKES = [
  {
    id: 'scooter',
    name: 'Guêpe 50cc',
    shortName: 'Guêpe 50cc',
    category: 'SCOOTER',
    icon: '🛵',
    tagline: 'Léger & Agile en ville',
    type: 'Scooter Rétro',
    description: 'Le charme vintage à la française ! Léger, vif et parfait pour se faufiler entre les terrasses de café.',
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
    name: 'Foudre 1000',
    shortName: 'Foudre 1000',
    category: 'SUPERBIKE',
    icon: '⚡',
    tagline: 'Vitesse pure & Aérodynamisme',
    type: 'Superbike',
    description: 'Une bête de course carénée prête à pulvériser le bitume urbain avec des pointes de vitesse fulgurantes.',
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
    name: 'Paname V-Twin',
    shortName: 'Paname V-Twin',
    category: 'CHOPPER',
    icon: '🏍️',
    tagline: 'Son lourd & Chromes étincelants',
    type: 'Custom Cruiser',
    description: 'Guidon haut, chromes étincelants et gros moteur bi-cylindre pour rider avec une classe absolue.',
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
    name: 'Turbo Trike 3R',
    shortName: 'Turbo 3R',
    category: 'MONSTER TRIKE',
    icon: '🏎️',
    tagline: 'Stabilité colossale & Double train arrière',
    type: 'Monster 3-Roues',
    description: 'Stabilité maximale et propulseur arrière démesuré pour bousculer la ville sans jamais perdre l’équilibre.',
    speedRating: 4,
    handlingRating: 4,
    bounceRating: 5,
    cost: 2500,
    unlocked: false,
    scale: 1.25,
    maxSpeed: 30,
    accel: 18,
    steerSpeed: 15
  },
  {
    id: 'dragster',
    name: 'Nitro V8 Dragster',
    shortName: 'V8 Dragster',
    category: 'NITRO DRAGSTER',
    icon: '💀',
    tagline: 'V8 Blower & Double lance-flammes',
    type: 'Dragster Pro-Street',
    description: 'Pneu arrière dragster 300mm, compresseur soufflant géant et bonbonnes de protoxyde d’azote pour pulvériser le bitume.',
    speedRating: 5,
    handlingRating: 2,
    bounceRating: 5,
    cost: 3400,
    unlocked: false,
    scale: 1.28,
    maxSpeed: 38,
    accel: 28,
    steerSpeed: 13
  },
  {
    id: 'diablo',
    name: 'Diablo Hypersport',
    shortName: 'Diablo 1200',
    category: 'HYPERBIKE',
    icon: '😈',
    tagline: 'Cadre treillis rouge & Carbone brut',
    type: 'Streetfighter Brutale',
    description: 'Fureur mécanique dénudée taillée pour l’attaque avec ailerons déporteurs et double silencieux titane hurlant.',
    speedRating: 5,
    handlingRating: 4,
    bounceRating: 5,
    cost: 4900,
    unlocked: false,
    scale: 1.1,
    maxSpeed: 36,
    accel: 26,
    steerSpeed: 17
  },
  {
    id: 'ravageur',
    name: 'Ravageur Apocalypse 750',
    shortName: 'Ravageur 750',
    category: 'APOCALYPSE CROSS',
    icon: '⛓️',
    tagline: 'Blindage d’assaut & Pneus crampons',
    type: 'Rallye Raid Blindé',
    description: 'Garde au sol colossale, pare-buffles d’acier tubulaire et crampons tout-terrain capables de broyer tout obstacle.',
    speedRating: 4,
    handlingRating: 5,
    bounceRating: 5,
    cost: 6500,
    unlocked: false,
    scale: 1.18,
    maxSpeed: 33,
    accel: 24,
    steerSpeed: 18
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
    this.currentMode = 'SPLASH';
    this.selectedCity = CITIES[0];
    this.selectedBike = BIKES[0];

    this.score = 0;
    this.drivingScoreAccumulator = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.comboMax = 1;
    this.coinsEarned = 0;
    this.interactionsCount = 0;
    this.distance = 0;
    this.speed = 0;
    this.targetSpeed = 0;
    this.isBraking = false;
    this.isGameOver = false;

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
    this.drivingScoreAccumulator = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.comboMax = 1;
    this.coinsEarned = 0;
    this.interactionsCount = 0;
    this.distance = 0;
    // La moto est STRICTEMENT À L'ARRÊT au démarrage dans la ville
    this.speed = 0;
    this.targetSpeed = 0;
    this.isBraking = false;
    this.isGameOver = false;
    // Compte à rebours 3, 2, 1, GO !
    this.currentMode = 'COUNTDOWN';

    soundManager.startEngine();
    soundManager.updateEngine(0.08); // Ronronnement au ralenti à l'arrêt
    soundManager.startMusic();
    this.notify('run_started', { city: this.selectedCity, bike: this.selectedBike });
  }

  triggerGo() {
    this.currentMode = 'PLAYING';
    this.targetSpeed = this.selectedBike.maxSpeed;
    this.notify('countdown_go', {});
  }

  setBraking(braking) {
    this.isBraking = braking;
  }

  addInteraction(points = 100, itemType = 'person', category = 'man') {
    if (this.currentMode !== 'PLAYING') return;

    this.interactionsCount++;
    this.comboTimer = 3.5;
    this.combo = Math.min(this.combo + 1, 10);
    this.comboMax = Math.max(this.comboMax, this.combo);

    const totalAdded = points * this.combo;
    this.score += totalAdded;

    const coinsFromHit = Math.floor(totalAdded / 50) + 1;
    this.coinsEarned += coinsFromHit;

    // Réaction sonore réaliste selon la personne heurtée (enfant, vieux, femme, homme)
    soundManager.playPedestrianReaction(category);
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

    this.checkNextCityUnlock();
  }

  addNearMiss() {
    if (this.currentMode !== 'PLAYING') return;

    const nearMissPoints = 75 * this.combo;
    this.score += nearMissPoints;
    this.coinsEarned += 1;
    soundManager.playNearMiss();

    this.notify('score_updated', {
      score: this.score,
      added: nearMissPoints,
      combo: this.combo,
      comboTitle: 'FRÔLEMENT !',
      coinsEarned: this.coinsEarned,
      itemType: 'near_miss'
    });

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
    if (this.currentMode === 'COUNTDOWN') {
      this.speed = 0;
      soundManager.updateEngine(0.08);
      return;
    }
    if (this.currentMode !== 'PLAYING') return;

    // Gestion du frein et de la reprise de circulation
    if (this.isBraking) {
      // Décélération rapide jusqu'à l'arrêt complet
      this.speed = Math.max(0, this.speed - delta * 30.0);
    } else {
      // Réaccélération progressive vers la vitesse de croisière
      this.speed = Math.min(this.targetSpeed, this.speed + delta * 14.0);
    }

    // Points de conduite continue arcade : rouler vite fait monter le score !
    if (this.speed > 2.0) {
      this.drivingScoreAccumulator += this.speed * delta * 1.6;
      if (this.drivingScoreAccumulator >= 10) {
        const pts = Math.floor(this.drivingScoreAccumulator);
        this.score += pts;
        this.drivingScoreAccumulator -= pts;
        this.checkNextCityUnlock();
      }
    }

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
      speed: Math.floor(this.speed * 3.6),
      score: this.score,
      targetScore: this.selectedCity.targetScore,
      progressRatio: Math.min(1.0, this.score / this.selectedCity.targetScore),
      isBraking: this.isBraking
    });
  }

  endRun() {
    if (this.currentMode !== 'PLAYING') return;

    this.currentMode = 'RESULTS';
    this.isGameOver = true;
    soundManager.stopEngine();

    // Calcul des étoiles avec les nouveaux seuils
    let stars = 0;
    const thresholds = this.selectedCity.starThresholds;
    if (this.score >= thresholds[2]) stars = 3;
    else if (this.score >= thresholds[1]) stars = 2;
    else if (this.score >= thresholds[0]) stars = 1;

    const saveResult = storage.recordRunResult(
      this.selectedCity.id,
      this.score,
      stars,
      this.coinsEarned,
      this.interactionsCount,
      Math.floor(this.distance),
      this.comboMax
    );

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

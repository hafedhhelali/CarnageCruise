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
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '🗼',
    monument: 'Tour Eiffel & Arc de Triomphe',
    subtitle: 'La Ville Lumière & Grands Boulevards',
    typeTag: 'Monument & Avenues',
    description: 'Slalomez à vive allure sur les boulevards haussmanniens sous le regard de la Tour Eiffel et l’Arc de Triomphe !',
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
    mapCoords: { x: 46, y: 33 }
  },
  {
    id: 'bruxelles',
    name: 'Bruxelles',
    country: 'Belgique',
    countryFlag: '🇧🇪',
    emblem: '🇧🇪',
    monument: 'L’Atomium & Grand-Place',
    subtitle: 'Capitale Européenne & Pavés Dorés',
    typeTag: 'Grand-Place & Beffroi',
    description: 'Foncez entre les façades baroques à pignons dorés et l’impressionnante structure d’acier chromé de l’Atomium !',
    targetScore: 5500,
    starThresholds: [5500, 10000, 16000],
    unlockScoreRequired: 2500,
    skyColor: 0x90caf9,
    fogColor: 0xe3f2fd,
    ambientColor: 0xffffff,
    roadColor: 0x2f3542,
    buildingColors: [0xf6e58d, 0xffbe76, 0xdff9fb, 0xe056fd],
    roofColor: 0x2c3e50,
    accentColor: 0xf9ca24,
    unlockedByDefault: false,
    mapCoords: { x: 54, y: 19 }
  },
  {
    id: 'londres',
    name: 'Londres',
    country: 'Royaume-Uni',
    countryFlag: '🇬🇧',
    emblem: '🇬🇧',
    monument: 'Big Ben & Tower Bridge',
    subtitle: 'Big Ben, Tamise & Cabines Rouges',
    typeTag: 'Avenues Victoriennes & Beffroi',
    description: 'Slalomez sur Westminster Bridge sous les carillons légendaires de Big Ben, les cabines rouges et les bus à impériale !',
    targetScore: 10000,
    starThresholds: [10000, 17000, 26000],
    unlockScoreRequired: 5500,
    skyColor: 0x74b9ff,
    fogColor: 0xdfe4ea,
    ambientColor: 0xf1f2f6,
    roadColor: 0x1e272e,
    buildingColors: [0x8b0000, 0x808e9b, 0xced6e0, 0xd2dae2],
    roofColor: 0x1e272e,
    accentColor: 0xff4757,
    unlockedByDefault: false,
    mapCoords: { x: 35, y: 15 }
  },
  {
    id: 'saint-malo',
    name: 'Saint-Malo',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '🏰',
    monument: 'Fort National & Remparts Corsaires',
    subtitle: 'Cité Corsaire & Remparts Océaniques',
    typeTag: 'Côte & Remparts Granit',
    description: 'Vents d’ouest iodés, phares côtiers et remparts de granit imprenables face aux rouleaux atlantiques.',
    targetScore: 16000,
    starThresholds: [16000, 25000, 38000],
    unlockScoreRequired: 10000,
    skyColor: 0x487eb0,
    fogColor: 0xdcdde1,
    ambientColor: 0xf5f6fa,
    roadColor: 0x2f3640,
    buildingColors: [0x718093, 0xdcdde1, 0x57606f, 0xa4b0be],
    roofColor: 0x2f3542,
    accentColor: 0x00a8ff,
    unlockedByDefault: false,
    mapCoords: { x: 27, y: 36 }
  },
  {
    id: 'bordeaux',
    name: 'Bordeaux',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '🍇',
    monument: 'Place de la Bourse & Miroir d’Eau',
    subtitle: 'Pont de Pierre & Miroir d’Eau',
    typeTag: 'Monuments & Quais',
    description: 'Quais impériaux de la Garonne, arches de pierre majestueuses et élégance architecturale classique.',
    targetScore: 23000,
    starThresholds: [23000, 35000, 52000],
    unlockScoreRequired: 16000,
    skyColor: 0x81d4fa,
    fogColor: 0xe8eaf6,
    ambientColor: 0xf5f5f5,
    roadColor: 0x303841,
    buildingColors: [0xe0d6c3, 0xd0c4b0, 0xded5c0, 0xc7bcab],
    roofColor: 0x37474f,
    accentColor: 0x8e24aa,
    unlockedByDefault: false,
    mapCoords: { x: 33, y: 60 }
  },
  {
    id: 'barcelone',
    name: 'Barcelone',
    country: 'Espagne',
    countryFlag: '🇪🇸',
    emblem: '🇪🇸',
    monument: 'La Sagrada Família & Ramblas',
    subtitle: 'La Sagrada Família & Méditerranée',
    typeTag: 'Gaudí & Palmiers',
    description: 'Vitesse pure sous les flèches féeriques de Gaudí et les palmiers balayés par la brise marine catalane !',
    targetScore: 31000,
    starThresholds: [31000, 48000, 70000],
    unlockScoreRequired: 23000,
    skyColor: 0x48dbfb,
    fogColor: 0xfef9e7,
    ambientColor: 0xfff9c4,
    roadColor: 0x3d3d3d,
    buildingColors: [0xf8c291, 0xe77f67, 0xf7d794, 0x63cdda],
    roofColor: 0xb71540,
    accentColor: 0xe67e22,
    unlockedByDefault: false,
    mapCoords: { x: 45, y: 86 }
  },
  {
    id: 'millau',
    name: 'Millau',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '🌉',
    monument: 'Le Grand Viaduc Suspendu',
    subtitle: 'Le Grand Viaduc Suspendu',
    typeTag: 'Ponts & Gorges',
    description: 'Franchissez le viaduc des records défiant les nuages à 270 mètres au-dessus des gorges du Tarn !',
    targetScore: 40000,
    starThresholds: [40000, 60000, 88000],
    unlockScoreRequired: 31000,
    skyColor: 0x64b5f6,
    fogColor: 0xe3f2fd,
    ambientColor: 0xfffde7,
    roadColor: 0x263238,
    buildingColors: [0xcfcfcf, 0xb0bec5, 0x90a4ae, 0x78909c],
    roofColor: 0x37474f,
    accentColor: 0xff3838,
    unlockedByDefault: false,
    mapCoords: { x: 48, y: 66 }
  },
  {
    id: 'marseille',
    name: 'Marseille',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '⚓',
    monument: 'Notre-Dame de la Garde & Vieux-Port',
    subtitle: 'La Corniche Kennedy & Le Vieux-Port',
    typeTag: 'Corniche & Mer',
    description: 'Plein gaz face aux calanques ! Vue plongeante sur les flots azuréens, Notre-Dame de la Garde et voiliers.',
    targetScore: 50000,
    starThresholds: [50000, 74000, 108000],
    unlockScoreRequired: 40000,
    skyColor: 0x4fc3f7,
    fogColor: 0xe0f7fa,
    ambientColor: 0xfffde7,
    roadColor: 0x424242,
    buildingColors: [0xfff9c4, 0xffe082, 0xffcc80, 0x80deea],
    roofColor: 0xd84315,
    accentColor: 0x00bcd4,
    unlockedByDefault: false,
    mapCoords: { x: 58, y: 74 }
  },
  {
    id: 'nice',
    name: 'Nice',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '🌴',
    monument: 'Palace Le Negresco & Baie des Anges',
    subtitle: 'La Promenade des Anglais & Riviera',
    typeTag: 'Corniche & Palmiers',
    description: 'Palmiers ondulants, chaleur méditerranéenne et slaloms le long du célèbre dôme rose du Negresco.',
    targetScore: 61000,
    starThresholds: [61000, 90000, 130000],
    unlockScoreRequired: 50000,
    skyColor: 0x29b6f6,
    fogColor: 0xe1f5fe,
    ambientColor: 0xfff9c4,
    roadColor: 0x37474f,
    buildingColors: [0xf8bbd0, 0xffcdd2, 0xffe0b2, 0xb2dfdb],
    roofColor: 0xc2185b,
    accentColor: 0xff4081,
    unlockedByDefault: false,
    mapCoords: { x: 68, y: 72 }
  },
  {
    id: 'milan',
    name: 'Milan',
    country: 'Italie',
    countryFlag: '🇮🇹',
    emblem: '🇮🇹',
    monument: 'Duomo di Milano & Madonnina',
    subtitle: 'Le Dôme de Marbre & Galleria',
    typeTag: 'Marbre Gothique & Fashion',
    description: 'Vrombissez sur la Piazza del Duomo face à la forêt de pinacles en marbre blanc de Candoglia et la Madonnina dorée !',
    targetScore: 73000,
    starThresholds: [73000, 108000, 155000],
    unlockScoreRequired: 61000,
    skyColor: 0x00d2d3,
    fogColor: 0xf5f6fa,
    ambientColor: 0xffffff,
    roadColor: 0x2c3e50,
    buildingColors: [0xffffff, 0xf1f2f6, 0xced6e0, 0xffeedb],
    roofColor: 0x747d8c,
    accentColor: 0xff9f43,
    unlockedByDefault: false,
    mapCoords: { x: 77, y: 61 }
  },
  {
    id: 'geneve',
    name: 'Genève',
    country: 'Suisse',
    countryFlag: '🇨🇭',
    emblem: '🇨🇭',
    monument: 'Le Jet d’Eau 140m & Lac Léman',
    subtitle: 'Le Jet d’Eau 140m & Les Alpes',
    typeTag: 'Lac Léman & Jet d’Eau',
    description: 'Longez les rivages scintillants du lac Léman sous le panache monumental de 140 mètres du Jet d’Eau !',
    targetScore: 86000,
    starThresholds: [86000, 126000, 180000],
    unlockScoreRequired: 73000,
    skyColor: 0x48dbfb,
    fogColor: 0xe0f7fa,
    ambientColor: 0xf5f6fa,
    roadColor: 0x34495e,
    buildingColors: [0xffffff, 0xecf0f1, 0xbdc3c7, 0x74b9ff],
    roofColor: 0x2c3e50,
    accentColor: 0xeb4d4b,
    unlockedByDefault: false,
    mapCoords: { x: 63, y: 52 }
  },
  {
    id: 'chamonix',
    name: 'Chamonix',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '🏔️',
    monument: 'Mont-Blanc & Aiguille du Midi',
    subtitle: 'Col Alpin & Vue sur le Mont-Blanc',
    typeTag: 'Montagneuse & Cols',
    description: 'Lacets serrés de haute montagne entre chalets en bois, sapins enneigés et pics rocheux vertigineux.',
    targetScore: 100000,
    starThresholds: [100000, 145000, 210000],
    unlockScoreRequired: 86000,
    skyColor: 0x74b9ff,
    fogColor: 0xedf2f7,
    ambientColor: 0xf7fafc,
    roadColor: 0x2d3436,
    buildingColors: [0x5d4037, 0x795548, 0x8d6e63, 0x4e342e],
    roofColor: 0xecf0f1,
    accentColor: 0x00cec9,
    unlockedByDefault: false,
    mapCoords: { x: 68, y: 54 }
  },
  {
    id: 'annecy',
    name: 'Annecy',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '⛵',
    monument: 'Palais de l’Île & Canaux',
    subtitle: 'La Venise des Alpes & Son Lac',
    typeTag: 'Vue sur Lac Alpin',
    description: 'Rivages scintillants du lac d’Annecy, pontons fleuris et canaux romantiques au pied des falaises.',
    targetScore: 115000,
    starThresholds: [115000, 166000, 240000],
    unlockScoreRequired: 100000,
    skyColor: 0x81ecec,
    fogColor: 0xe0f7fa,
    ambientColor: 0xe8f5e9,
    roadColor: 0x37474f,
    buildingColors: [0xffeaa7, 0xfdcb6e, 0xf8a5c2, 0x78e08f],
    roofColor: 0xb71540,
    accentColor: 0x0984e3,
    unlockedByDefault: false,
    mapCoords: { x: 63, y: 56 }
  },
  {
    id: 'lyon',
    name: 'Lyon',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '🦁',
    monument: 'Basilique Notre-Dame de Fourvière',
    subtitle: 'Traboules & Ponts de la Saône',
    typeTag: 'Fleuves & Ponts',
    description: 'Franchissez les ponts entre Rhône et Saône et esquivez les gastronomes des bouchons lyonnais sous Fourvière.',
    targetScore: 132000,
    starThresholds: [132000, 190000, 275000],
    unlockScoreRequired: 115000,
    skyColor: 0x90caf9,
    fogColor: 0xfdebd0,
    ambientColor: 0xfff3e0,
    roadColor: 0x3d3a37,
    buildingColors: [0xe67e22, 0xd35400, 0xf39c12, 0xc0392b],
    roofColor: 0x962d22,
    accentColor: 0xe67e22,
    unlockedByDefault: false,
    mapCoords: { x: 56, y: 54 }
  },
  {
    id: 'strasbourg',
    name: 'Strasbourg',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '🥨',
    monument: 'Cathédrale de Strasbourg en Grès Rose',
    subtitle: 'Canaux de l’Ill & Flèche Gothique',
    typeTag: 'Canaux & Colombages',
    description: 'Maisons historiques à pans de bois, canaux de la Petite France et beffroi gothique monumental en grès rose.',
    targetScore: 150000,
    starThresholds: [150000, 215000, 310000],
    unlockScoreRequired: 132000,
    skyColor: 0x80cbc4,
    fogColor: 0xe0f2f1,
    ambientColor: 0xfff8e1,
    roadColor: 0x3e2723,
    buildingColors: [0xd7ccc8, 0xbcaaa4, 0xffcc80, 0xa1887f],
    roofColor: 0xb71c1c,
    accentColor: 0xd32f2f,
    unlockedByDefault: false,
    mapCoords: { x: 69, y: 34 }
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
  },
  {
    id: 'cheval',
    name: 'Pur-Sang du Tour',
    shortName: 'Étalon Sauvage',
    category: 'MONTURE PUR-SANG',
    icon: '🐎',
    tagline: 'Galop furieux & Cravache cinglante',
    type: 'Monture de Course',
    description: 'Pas de moteur thermique mais 1 cheval-vapeur furieux ! Le cavalier brandit sa cravache (whip) pour fouetter le bitume et écarter tout le monde.',
    speedRating: 4,
    handlingRating: 5,
    bounceRating: 5,
    cost: 7800,
    unlocked: false,
    scale: 1.12,
    maxSpeed: 32,
    accel: 25,
    steerSpeed: 20
  },
  {
    id: 'rouleau',
    name: 'Titan Compresseur 50T',
    shortName: 'Rouleau Titan',
    category: 'ENGIN LOURD',
    icon: '🚜',
    tagline: 'Cylindre broyeur d’acier & Fumée noire',
    type: 'Rouleau Compresseur Industriel',
    description: 'Cylindre avant géant de 50 tonnes en acier massif et cheminée diesel ! Rien ne lui résiste, il aplatit impitoyablement tout sur son passage.',
    speedRating: 3,
    handlingRating: 4,
    bounceRating: 5,
    cost: 9500,
    unlocked: false,
    scale: 1.25,
    maxSpeed: 27,
    accel: 16,
    steerSpeed: 14
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

  applyVehicleCrashPenalty(penalty = 350) {
    const previousScore = this.score;
    this.score = Math.max(0, this.score - penalty);
    const lostPoints = previousScore - this.score;
    this.combo = 1;
    this.comboTimer = 0;
    this.drivingScoreAccumulator = 0;
    this.speed = 0;

    this.notify('crash_penalty', {
      penalty: lostPoints,
      score: this.score
    });
    this.notify('combo_reset', {});
    this.notify('score_updated', {
      score: this.score,
      added: -lostPoints,
      combo: 1,
      comboTitle: '',
      coinsEarned: this.coinsEarned
    });
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
    // LE SCORE N'AVANCE PAS À L'ARRÊT : Strictement si la vitesse > 3.5 m/s (~13 km/h), sans freinage et hors crash
    if (this.speed > 3.5 && !this.isBraking) {
      this.drivingScoreAccumulator += this.speed * delta * 1.6;
      if (this.drivingScoreAccumulator >= 10) {
        const pts = Math.floor(this.drivingScoreAccumulator);
        this.score += pts;
        this.drivingScoreAccumulator -= pts;
        this.checkNextCityUnlock();
      }
    } else {
      // À l'arrêt ou freinage : remise à zéro de l'accumulateur (le score ne bouge pas d'un poil)
      this.drivingScoreAccumulator = 0;
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

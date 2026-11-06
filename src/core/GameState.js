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
    mapCoords: { x: 44.8, y: 40.2 }
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
    mapCoords: { x: 51.4, y: 31.4 }
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
    mapCoords: { x: 39.2, y: 27.0 }
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
    mapCoords: { x: 31.1, y: 39.9 }
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
    mapCoords: { x: 35.4, y: 54.7 }
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
    description: 'Vitesse pure sous les flèches féeriques de Gaudí et les palmiers balayés par la brise marine catalane en Espagne !',
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
    mapCoords: { x: 48.1, y: 65.2 }
  },
  {
    id: 'madrid',
    name: 'Madrid',
    country: 'Espagne',
    countryFlag: '🇪🇸',
    emblem: '🇪🇸',
    monument: 'Puerta de Alcalá & Gran Vía',
    subtitle: 'Capitale Royale & Palais de Cibeles',
    typeTag: 'Granit Royal & Terrasses Tapas',
    description: 'Franchissez à plein régime la monumentale Puerta de Alcalá et la Gran Vía sous le soleil éclatant de la Castille !',
    targetScore: 38000,
    starThresholds: [38000, 56000, 80000],
    unlockScoreRequired: 31000,
    skyColor: 0x38ada9,
    fogColor: 0xfef9e7,
    ambientColor: 0xfff9c4,
    roadColor: 0x2f3640,
    buildingColors: [0xf5cd79, 0xe77f67, 0xf8a5c2, 0xdfe4ea],
    roofColor: 0x962d3e,
    accentColor: 0xf1c40f,
    unlockedByDefault: false,
    mapCoords: { x: 27.8, y: 69.9 }
  },
  {
    id: 'lisbonne',
    name: 'Lisbonne',
    country: 'Portugal',
    countryFlag: '🇵🇹',
    emblem: '🇵🇹',
    monument: 'Tour de Belém & Tramway n°28',
    subtitle: 'Collines Dorées & Faïences Azulejos',
    typeTag: 'Manuélin & Océan Atlantique',
    description: 'Slalomez entre les collines pavées et le mythique tramway jaune n°28 face à l’estuaire du Tage et la Tour de Belém !',
    targetScore: 46000,
    starThresholds: [46000, 68000, 95000],
    unlockScoreRequired: 38000,
    skyColor: 0x00cec9,
    fogColor: 0xdff9fb,
    ambientColor: 0xffffff,
    roadColor: 0x353b48,
    buildingColors: [0xfffa65, 0x70a1ff, 0xffffff, 0xf1f2f6],
    roofColor: 0xd35400,
    accentColor: 0x2ed573,
    unlockedByDefault: false,
    mapCoords: { x: 8.5, y: 74.0 }
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
    mapCoords: { x: 49.1, y: 56.4 }
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
    mapCoords: { x: 55.2, y: 61.8 }
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
    mapCoords: { x: 61.8, y: 60.5 }
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
    mapCoords: { x: 64.2, y: 49.3 }
  },
  {
    id: 'geneve',
    name: 'Genève 🌊',
    country: 'Suisse',
    countryFlag: '🇨🇭',
    emblem: '🌊',
    monument: 'Barrage Hydroélectrique & Jet d’Eau',
    subtitle: 'Rupture de Barrage, Déferlante & Déluge',
    typeTag: 'Cataclysme : Rupture de Barrage & Déluge',
    description: 'Au cœur de la rade, le barrage hydroélectrique retient des millions de m³ d’eau. Faites sauter les vannes en béton au canon ou au missile pour noyer la ville sous une vague géante !',
    targetScore: 86000,
    starThresholds: [86000, 126000, 180000],
    unlockScoreRequired: 73000,
    skyColor: 0x48dbfb,
    fogColor: 0xe0f7fa,
    ambientColor: 0x00cec9,
    roadColor: 0x34495e,
    buildingColors: [0xffffff, 0xecf0f1, 0xbdc3c7, 0x74b9ff],
    roofColor: 0x0984e3,
    accentColor: 0x00d2d3,
    unlockedByDefault: false,
    disasterType: 'DAM',
    isDamMission: true,
    exterminationTarget: 550000,
    mapCoords: { x: 59.0, y: 49.7 }
  },
  {
    id: 'grande-dixence',
    name: 'Grande-Dixence 🌊',
    country: 'Suisse',
    countryFlag: '🇨🇭',
    emblem: '🌊',
    monument: 'Méga-Barrage Poids de 285m',
    subtitle: 'Plus Haut Barrage d’Europe & Raz-de-Marée',
    typeTag: 'Cataclysme : Rupture de Barrage Titanesque',
    description: '400 millions de m³ d’eau suspendus à 2360m d’altitude. Explosez la voûte colossale en béton armé et contemplez le déferlement apocalyptique qui submerge toute la vallée !',
    targetScore: 95000,
    starThresholds: [95000, 140000, 205000],
    unlockScoreRequired: 86000,
    skyColor: 0x22a6b3,
    fogColor: 0xc7ecee,
    ambientColor: 0x7ed6df,
    roadColor: 0x130f40,
    buildingColors: [0x535c68, 0x95afc0, 0x7ed6df],
    roofColor: 0x30336b,
    accentColor: 0x22a6b3,
    unlockedByDefault: false,
    disasterType: 'DAM',
    isDamMission: true,
    exterminationTarget: 750000,
    mapCoords: { x: 56.5, y: 52.8 }
  },
  {
    id: 'chamonix',
    name: 'Chamonix 🏔️',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '🏔️',
    monument: 'Mont-Blanc & Pylônes Sismiques',
    subtitle: 'Dynamitage de Paroi, Éboulement & Avalanche',
    typeTag: 'Cataclysme : Éboulement de Montagne',
    description: 'En contrebas du toit de l’Europe, pulvérisez les ancrages sismiques de la muraille rocheuse ! Des millions de tonnes de granit et de séracs s’effondrent sur la ville dans un fracas titanesque.',
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
    disasterType: 'MOUNTAIN',
    isMountainMission: true,
    exterminationTarget: 480000,
    mapCoords: { x: 59.9, y: 50.7 }
  },
  {
    id: 'innsbruck',
    name: 'Innsbruck 🏔️',
    country: 'Autriche',
    countryFlag: '🇦🇹',
    emblem: '🏔️',
    monument: 'Paroi Calcaire de la Nordkette & Pic Hafelekar',
    subtitle: 'Éboulement Rocheux & Avalanche Apocalyptique',
    typeTag: 'Cataclysme : Éboulement Alpin Autrichien',
    description: 'Dominée par les à-pics vertigineux des Alpes tyroliennes, la ville est à portée de tir. Déclenchez l’effondrement de la falaise rocheuse pour précipiter des blocs cyclopéens sur la cité !',
    targetScore: 110000,
    starThresholds: [110000, 155000, 225000],
    unlockScoreRequired: 100000,
    skyColor: 0x686de0,
    fogColor: 0xdff9fb,
    ambientColor: 0xffffff,
    roadColor: 0x30336b,
    buildingColors: [0xf6e58d, 0xffbe76, 0xff7979, 0xbadc58],
    roofColor: 0x4834d4,
    accentColor: 0xe056fd,
    unlockedByDefault: false,
    disasterType: 'MOUNTAIN',
    isMountainMission: true,
    exterminationTarget: 620000,
    mapCoords: { x: 67.5, y: 47.8 }
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
    mapCoords: { x: 58.5, y: 50.3 }
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
    mapCoords: { x: 52.8, y: 51.4 }
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
    mapCoords: { x: 62.3, y: 40.5 }
  },
  {
    id: 'rome',
    name: 'Rome',
    country: 'Italie',
    countryFlag: '🇮🇹',
    emblem: '🏛️',
    monument: 'Le Colisée Antique & Saint-Pierre',
    subtitle: 'La Cité Éternelle & Voie Appienne',
    typeTag: 'Monuments Antiques & Collines',
    description: 'Slalomez autour des arches millénaires du Colisée et des fontaines baroques sous le soleil romain !',
    targetScore: 170000,
    starThresholds: [170000, 240000, 350000],
    unlockScoreRequired: 150000,
    skyColor: 0x87ceeb,
    fogColor: 0xfff5e6,
    ambientColor: 0xffffff,
    roadColor: 0x2d3436,
    buildingColors: [0xf5cd79, 0xf78fb3, 0xf8a5c2, 0xe77f67],
    roofColor: 0xb71540,
    accentColor: 0xe67e22,
    unlockedByDefault: false,
    mapCoords: { x: 73.6, y: 62.5 }
  },
  {
    id: 'napoli',
    name: 'Napoli',
    country: 'Italie',
    countryFlag: '🇮🇹',
    emblem: '🌋',
    monument: 'Le Vésuve & Baie de Naples',
    subtitle: 'Ruelles Vivantes & Golfe Bleu Saphir',
    typeTag: 'Côte Volcanique & Balcons',
    description: 'Foncez le long du front de mer napolitain face au Vésuve fumant, entre linge aux balcons et ambiance volcanique !',
    targetScore: 195000,
    starThresholds: [195000, 280000, 400000],
    unlockScoreRequired: 170000,
    skyColor: 0x74b9ff,
    fogColor: 0xdff9fb,
    ambientColor: 0xffffff,
    roadColor: 0x353b48,
    buildingColors: [0xfbc531, 0x4cd137, 0xe84118, 0x00a8ff],
    roofColor: 0xc23616,
    accentColor: 0xe84118,
    unlockedByDefault: false,
    mapCoords: { x: 79.2, y: 67.6 }
  },
  {
    id: 'tunis',
    name: 'Tunis',
    country: 'Tunisie',
    countryFlag: '🇹🇳',
    emblem: '🇹🇳',
    monument: 'La Médina & Sidi Bou Saïd',
    subtitle: 'Portes Cloutées & Faïences Bleues',
    typeTag: 'Médina & Minaret',
    description: 'Traversez la grande mosquée Zitouna et les ruelles blanchies à la chaux et bleu azur de Sidi Bou Saïd !',
    targetScore: 225000,
    starThresholds: [225000, 320000, 460000],
    unlockScoreRequired: 195000,
    skyColor: 0x00d2d3,
    fogColor: 0xf7f1e3,
    ambientColor: 0xffffff,
    roadColor: 0x2f3542,
    buildingColors: [0xffffff, 0xf5f6fa, 0x48dbfb, 0xfeca57],
    roofColor: 0x0abde3,
    accentColor: 0xee5253,
    unlockedByDefault: false,
    mapCoords: { x: 69.3, y: 80.4 }
  },
  {
    id: 'annaba',
    name: 'Annaba',
    country: 'Algérie',
    countryFlag: '🇩🇿',
    emblem: '🇩🇿',
    monument: 'Basilique Saint-Augustin & Hippone',
    subtitle: 'La Coquette & Corniche d’Hippone',
    typeTag: 'Colline & Front de Mer',
    description: 'Virevoltez sur la corniche côtière sous le regard de la majestueuse basilique byzantine perchée sur la colline d’Hippone !',
    targetScore: 260000,
    starThresholds: [260000, 370000, 530000],
    unlockScoreRequired: 225000,
    skyColor: 0x48dbfb,
    fogColor: 0xf8efba,
    ambientColor: 0xffffff,
    roadColor: 0x2c2c54,
    buildingColors: [0xffffff, 0xf8f9fa, 0x2ed573, 0xffa502],
    roofColor: 0xb33939,
    accentColor: 0x20bf6b,
    unlockedByDefault: false,
    mapCoords: { x: 61.3, y: 80.7 }
  },
  {
    id: 'alger',
    name: 'Alger',
    country: 'Algérie',
    countryFlag: '🇩🇿',
    emblem: '🇩🇿',
    monument: 'Mémorial du Martyr & La Casbah Blanche',
    subtitle: 'Alger la Blanche & Baie Scintillante',
    typeTag: 'Monument des Martyrs & Baie',
    description: 'Apothéose du périple méditerranéen : les 3 palmes géantes de Maqam Echahid dominant la splendide baie d’Alger la Blanche !',
    targetScore: 300000,
    starThresholds: [300000, 430000, 620000],
    unlockScoreRequired: 260000,
    skyColor: 0x54a0ff,
    fogColor: 0xf1f2f6,
    ambientColor: 0xffffff,
    roadColor: 0x1e272e,
    buildingColors: [0xffffff, 0xf5f6fa, 0x2ed573, 0xdfe4ea],
    roofColor: 0x10ac84,
    accentColor: 0xeb4d4b,
    unlockedByDefault: false,
    mapCoords: { x: 40.6, y: 82.1 }
  },
  {
    id: 'berlin',
    name: 'Berlin',
    country: 'Allemagne',
    countryFlag: '🇩🇪',
    emblem: '🇩🇪',
    monument: 'Porte de Brandebourg & Fernsehturm',
    subtitle: 'Capitale Underground & Porte Monumentale',
    typeTag: 'Avenues Modernes & Histoire',
    description: 'Slalomez à travers Unter den Linden face aux colonnes néo-classiques de la Porte de Brandebourg et l’immense flèche de la Fernsehturm !',
    targetScore: 340000,
    starThresholds: [340000, 480000, 690000],
    unlockScoreRequired: 300000,
    skyColor: 0x70a1ff,
    fogColor: 0xdcdde1,
    ambientColor: 0xf5f6fa,
    roadColor: 0x2f3542,
    buildingColors: [0x747d8c, 0xa4b0be, 0xced6e0, 0x57606f],
    roofColor: 0x2f3542,
    accentColor: 0xffa502,
    unlockedByDefault: false,
    mapCoords: { x: 70.8, y: 32.4 }
  },
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    country: 'Pays-Bas',
    countryFlag: '🇳🇱',
    emblem: '🇳🇱',
    monument: 'Canaux Historiques & Façades Étroites',
    subtitle: 'Venise du Nord & Quais Fleuraux',
    typeTag: 'Canaux, Ponts & Vélos',
    description: 'Foncez le long des canaux pavés bordés de façades à pignons centenaires sous le regard des cyclistes médusés !',
    targetScore: 380000,
    starThresholds: [380000, 540000, 780000],
    unlockScoreRequired: 340000,
    skyColor: 0x74b9ff,
    fogColor: 0xdfe4ea,
    ambientColor: 0xffffff,
    roadColor: 0x2f3640,
    buildingColors: [0xd35400, 0x95a5a6, 0xbdc3c7, 0x7f8c8d],
    roofColor: 0x2c3e50,
    accentColor: 0xff7f50,
    unlockedByDefault: false,
    mapCoords: { x: 52.8, y: 25.0 }
  },
  {
    id: 'seville',
    name: 'Séville',
    country: 'Espagne',
    countryFlag: '🇪🇸',
    emblem: '🇪🇸',
    monument: 'Plaza de España & La Giralda',
    subtitle: 'Palais Mudéjar & Flamenco Enflammé',
    typeTag: 'Palais Céramique & Palmiers',
    description: 'Traversez le demi-cercle grandiose de la Plaza de España entre azulejos étincelants, ponts vénitiens et effluves d’orangers en fleurs !',
    targetScore: 430000,
    starThresholds: [430000, 610000, 880000],
    unlockScoreRequired: 380000,
    skyColor: 0x48dbfb,
    fogColor: 0xf6e58d,
    ambientColor: 0xfff9e6,
    roadColor: 0x2c3e50,
    buildingColors: [0xf5cd79, 0xf7d794, 0xe77f67, 0xffbe76],
    roofColor: 0xc44569,
    accentColor: 0xe15f41,
    unlockedByDefault: false,
    mapCoords: { x: 17.9, y: 80.7 }
  },
  {
    id: 'casablanca',
    name: 'Casablanca',
    country: 'Maroc',
    countryFlag: '🇲🇦',
    emblem: '🇲🇦',
    monument: 'Grande Mosquée Hassan II & Corniche',
    subtitle: 'Minaret de 210m & Flots Océaniques',
    typeTag: 'Front de Mer & Architecture Mauresque',
    description: 'Plein gaz sur le boulevard de la Corniche face aux rouleaux de l’Atlantique et le spectaculaire minaret de marbre bleu dominant l’océan !',
    targetScore: 480000,
    starThresholds: [480000, 680000, 980000],
    unlockScoreRequired: 430000,
    skyColor: 0x54a0ff,
    fogColor: 0xfffa65,
    ambientColor: 0xffffff,
    roadColor: 0x1e272e,
    buildingColors: [0xffffff, 0xf1f2f6, 0x1dd1a1, 0xee5253],
    roofColor: 0x10ac84,
    accentColor: 0xff6b6b,
    unlockedByDefault: false,
    mapCoords: { x: 15.1, y: 89.2 }
  },
  {
    id: 'venise',
    name: 'Venise',
    country: 'Italie',
    countryFlag: '🇮🇹',
    emblem: '🇮🇹',
    monument: 'Pont du Rialto & Palais des Doges',
    subtitle: 'Sérénissime, Lagune & Gondoles',
    typeTag: 'Palais Gothiques & Quais Flottants',
    description: 'Vrombissez sur les rivages de la Lagune entre palais gothiques en marbre rose, ponts d’arches en pierre blanche et gondoles de légende !',
    targetScore: 540000,
    starThresholds: [540000, 770000, 1100000],
    unlockScoreRequired: 480000,
    skyColor: 0x48dbfb,
    fogColor: 0xffcccc,
    ambientColor: 0xfff0f5,
    roadColor: 0x2c2c54,
    buildingColors: [0xffbe76, 0xff7979, 0xf8a5c2, 0xf5cd79],
    roofColor: 0xb33939,
    accentColor: 0xcd6133,
    unlockedByDefault: false,
    mapCoords: { x: 69.8, y: 50.0 }
  },
  {
    id: 'flamanville-nuc',
    name: 'Flamanville ☢️',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '☢️',
    monument: 'Centrale EPR & Falaises du Cotentin',
    subtitle: 'Réacteur EPR 1650MW & Manche Tempétueuse',
    typeTag: 'Centrale Nucléaire Côtière & Évasion',
    description: 'Bordée par les flots de la Manche, la centrale nucléaire de Flamanville entre en surchauffe critique ! Enfilez la combinaison antiradiation, déclenchez l\'alarme générale et évacuez à bord de l\'aéro-jet !',
    targetScore: 40000,
    starThresholds: [40000, 75000, 130000],
    unlockScoreRequired: 0,
    skyColor: 0x2c3e50,
    fogColor: 0x1a252f,
    ambientColor: 0x7bed9f,
    roadColor: 0x2f3640,
    buildingColors: [0x57606f, 0x747d8c, 0xa4b0be],
    roofColor: 0x2ed573,
    accentColor: 0x2ed573,
    unlockedByDefault: true,
    killQuota: 25,
    isNuclearMission: true,
    disasterType: 'NUCLEAR',
    exterminationTarget: 1200000,
    mapCoords: { x: 37.5, y: 36.8 }
  },
  {
    id: 'doel-nuc',
    name: 'Doel Nucléaire ☢️',
    country: 'Belgique',
    countryFlag: '🇧🇪',
    emblem: '☢️',
    monument: 'Tours de Refroidissement de Doel',
    subtitle: 'Tours Géantes 170m & Estuaire de l\'Escaut',
    typeTag: 'Complexe Atomique Belge & Évasion',
    description: 'Quatre réacteurs massifs dominant les brumes de l\'Escaut. L\'éruption thermique est imminente ! Foncez sous les sirènes stridentes et survolez le réacteur fumant.',
    targetScore: 65000,
    starThresholds: [65000, 110000, 180000],
    unlockScoreRequired: 0,
    skyColor: 0x1e272e,
    fogColor: 0x151d24,
    ambientColor: 0x2ed573,
    roadColor: 0x2f3542,
    buildingColors: [0x57606f, 0x4b6584, 0x778ca3],
    roofColor: 0x26de81,
    accentColor: 0x26de81,
    unlockedByDefault: true,
    killQuota: 30,
    isNuclearMission: true,
    disasterType: 'NUCLEAR',
    exterminationTarget: 1600000,
    mapCoords: { x: 50.8, y: 29.5 }
  },
  {
    id: 'asco-nuc',
    name: 'Ascó Nucléaire ☢️',
    country: 'Espagne',
    countryFlag: '🇪🇸',
    emblem: '☢️',
    monument: 'Double Réacteur d\'Ascó & Èbre',
    subtitle: 'Centrale Jumelée d\'Aragon-Catalogne',
    typeTag: 'Surchauffe Atomique Péninsulaire',
    description: 'Au cœur de la vallée de l\'Èbre, le complexe nucléaire d\'Ascó atteint une température critique. Déclenchez la réaction en chaîne et échappez-vous dans les cieux ibériques !',
    targetScore: 90000,
    starThresholds: [90000, 150000, 240000],
    unlockScoreRequired: 0,
    skyColor: 0x2d3436,
    fogColor: 0x1f2425,
    ambientColor: 0x00d2d3,
    roadColor: 0x2d3436,
    buildingColors: [0x636e72, 0x57606f, 0x747d8c],
    roofColor: 0x00cec9,
    accentColor: 0x00cec9,
    unlockedByDefault: true,
    killQuota: 30,
    isNuclearMission: true,
    disasterType: 'NUCLEAR',
    exterminationTarget: 1400000,
    mapCoords: { x: 33.5, y: 64.2 }
  },
  {
    id: 'tchernobyl',
    name: 'Tchernobyl ☢️',
    country: 'Zone d\'Exclusion',
    countryFlag: '☢️',
    emblem: '☣️',
    monument: 'Réacteurs & Tours de Refroidissement',
    subtitle: 'Tours Nucléaires, Combinaison NBC & Éruption',
    typeTag: 'Épreuve Ultime : Cataclysme & Évasion Volante',
    description: 'Enfilez la combinaison NBC antiradiation, bravez la zone des réacteurs radioactifs, déclenchez l\'éruption nucléaire cataclysmique et échappez-vous à bord de l\'aéro-jet volant pour contempler l\'apocalypse de loin !',
    targetScore: 250000,
    starThresholds: [250000, 500000, 900000],
    unlockScoreRequired: 0,
    skyColor: 0x1e272e,
    fogColor: 0x11161d,
    ambientColor: 0x55efc4,
    roadColor: 0x2d3436,
    buildingColors: [0x636e72, 0x2d3436, 0x57606f],
    roofColor: 0x0984e3,
    accentColor: 0x00cec9,
    unlockedByDefault: true,
    killQuota: 35,
    isNuclearMission: true,
    disasterType: 'NUCLEAR',
    exterminationTarget: 2500000,
    mapCoords: { x: 94.3, y: 33.8 }
  }
];

export const BIKES = [
  {
    id: 'tank',
    name: 'Char AMX-Titan 120mm 💥',
    shortName: 'Tank Blindé',
    category: 'CHAR D\'ASSAUT',
    icon: '🪖',
    tagline: 'Canon lourd 120mm & Doubles Chenilles',
    type: 'Char de Combat Blindé',
    description: 'Blindage réactif lourd, doubles chenilles à galets d\'acier rotatifs et tourelle orientable avec canon 120mm ! Tirez des projectiles perforants dévastateurs pour pulvériser voitures, obstacles et tout écraser !',
    speedRating: 4,
    handlingRating: 4,
    bounceRating: 5,
    cost: 0,
    unlocked: true,
    scale: 1.25,
    maxSpeed: 23,
    accel: 16,
    steerSpeed: 18,
    isTank: true
  },
  {
    id: 'aero_jet',
    name: 'Aéro-Jet Fusion 🚀',
    shortName: 'Aéro-Jet',
    category: 'ENGIN VOLANT',
    icon: '🚀',
    tagline: 'Propulseurs à Fusion & Ailes Delta',
    type: 'Vaisseau d’Évasion Sub-Orbital',
    description: 'Engin volant d’évasion supersonique à poussée vectorielle et ailes delta en titane ! Conçu spécialement pour s’arracher au sol et contempler les éruptions apocalyptiques depuis la stratosphère.',
    speedRating: 5,
    handlingRating: 5,
    bounceRating: 5,
    cost: 5000,
    unlocked: true,
    scale: 1.15,
    maxSpeed: 28,
    accel: 20,
    steerSpeed: 22,
    isFlyingCraft: true
  },
  {
    id: 'scooter',
    name: 'Guêpe 50cc',
    shortName: 'Guêpe 50cc',
    category: 'SCOOTER VINTAGE',
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
    maxSpeed: 17,
    accel: 11,
    steerSpeed: 16
  },
  {
    id: 'chopper',
    name: 'Paname V-Twin',
    shortName: 'Paname V-Twin',
    category: 'CUSTOM CRUISER',
    icon: '🏍️',
    tagline: 'Son lourd & Chromes étincelants',
    type: 'Custom Cruiser',
    description: 'Guidon haut, chromes étincelants et gros moteur bi-cylindre pour rider avec une classe absolue.',
    speedRating: 4,
    handlingRating: 3,
    bounceRating: 5,
    cost: 800,
    unlocked: false,
    scale: 1.15,
    maxSpeed: 19,
    accel: 13,
    steerSpeed: 14
  },
  {
    id: 'decapotable',
    name: 'Cabriolet Riviera 68',
    shortName: 'Décapotable Sport',
    category: 'VOITURE DÉCAPOTABLE',
    icon: '🚗',
    tagline: 'V8 Rugissant & Pare-brise Rétro',
    type: 'Cabriolet Sport',
    description: 'Fini les deux-roues ordinaires ! Installez-vous au volant d’un cabriolet sport décapotable rouge feu avec 4 roues motrices et échappements chromés.',
    speedRating: 5,
    handlingRating: 4,
    bounceRating: 5,
    cost: 1600,
    unlocked: false,
    scale: 1.22,
    maxSpeed: 23,
    accel: 15,
    steerSpeed: 16
  },
  {
    id: 'trottinette_hache',
    name: 'Trottinette Berserker',
    shortName: 'Trottinette Hache',
    category: 'TROTTINETTE & HACHE',
    icon: '🪓',
    tagline: 'Deck Urbain & Double Hache Viking',
    type: 'Trottinette d’Assaut',
    description: 'Le contraste ultime : une trottinette électrique compacte et maniable combinée à une redoutable double hache de guerre viking !',
    speedRating: 4,
    handlingRating: 5,
    bounceRating: 5,
    cost: 2600,
    unlocked: false,
    scale: 1.05,
    maxSpeed: 20,
    accel: 13,
    steerSpeed: 22
  },
  {
    id: 'cheval',
    name: 'Étalon Pur-Sang',
    shortName: 'Étalon Sauvage',
    category: 'MONTURE & FOUET',
    icon: '🐎',
    tagline: 'Galop furieux & Grand FOUET cinglant',
    type: 'Monture Sauvage',
    description: 'Pas de moteur thermique mais 1 pur-sang furieux au galop ! Le cavalier brandit son grand FOUET en cuir tressé pour cingler le bitume et balayer tout obstacle.',
    speedRating: 4,
    handlingRating: 5,
    bounceRating: 5,
    cost: 3800,
    unlocked: false,
    scale: 1.12,
    maxSpeed: 21,
    accel: 14,
    steerSpeed: 20
  },
  {
    id: 'run_ak47',
    name: 'Sprinteur Kalachnikov',
    shortName: 'Sprint Kalash',
    category: 'COURSE À PIED',
    icon: '🏃',
    tagline: 'Sprint d’athlète & AK-47 en rafale',
    type: 'Sprinteur Armé',
    description: 'Pas besoin de véhicule : courez à pleines jambes à vive allure avec une authentique Kalachnikov AK-47 à chargeur banane pour un délire d’arcade total !',
    speedRating: 5,
    handlingRating: 5,
    bounceRating: 5,
    cost: 5200,
    unlocked: false,
    scale: 1.08,
    maxSpeed: 22,
    accel: 15,
    steerSpeed: 24
  },
  {
    id: 'run_chainsaw',
    name: 'Sprinteur Tronçonneuse',
    shortName: 'Sprint Tronçonneuse',
    category: 'COURSE À PIED',
    icon: '🪚',
    tagline: 'Vrombissement 2-temps & Chaîne crantée',
    type: 'Sprinteur Tronçonneuse',
    description: 'Sprint effréné à pied armé d’une imposante tronçonneuse vrombissante ! Le rugissement du moteur deux-temps fait voler les quilles et les baguettes.',
    speedRating: 5,
    handlingRating: 5,
    bounceRating: 5,
    cost: 6800,
    unlocked: false,
    scale: 1.08,
    maxSpeed: 22,
    accel: 15,
    steerSpeed: 23
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
    cost: 8500,
    unlocked: false,
    scale: 1.25,
    maxSpeed: 18,
    accel: 11,
    steerSpeed: 14
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
    cost: 11000,
    unlocked: false,
    scale: 1.28,
    maxSpeed: 25,
    accel: 17,
    steerSpeed: 13
  }
];

export const COMBO_TITLES = [
  "PREMIER CONTACT !",
  "DOUBLE CARNAGE !",
  "TRIPLE STRIKE !",
  "EXTERMINATION !",
  "PAPY À CANNE FAUCHÉ !",
  "POUSSETTE BROYÉE !",
  "FOUET SANGLANT !",
  "BOUCHERIE URBAINE !",
  "HÉCATOMBE TOTALE !",
  "MOTORMAGEDDON SUPRÊME !"
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

    // Jauge de Nitro rechargeable (0 à 100%) et boost 5 secondes
    this.nitroGauge = 0;
    this.isNitroActive = false;
    this.nitroTimer = 0;
    this.nitroDuration = 5.0;

    // Mission Nucléaire : Approche Centrale, Explosion & Fuite Éperdue
    this.nuclearPhase = null; // 'APPROACH', 'ESCAPE', 'ESCAPED'
    this.nuclearEscapeTimer = 22.0;
    this.nuclearDetonated = false;

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
    this.killsCount = 0;
    this.killStreak = 0;
    this.worldPopulationEliminated = (storage.data.stats && storage.data.stats.totalKills) || 0;
    this.distance = 0;
    // La moto est STRICTEMENT À L'ARRÊT au démarrage dans la ville
    this.speed = 0;
    this.targetSpeed = 0;
    this.isBraking = false;
    this.isGameOver = false;
    this.nitroGauge = 0;
    this.isNitroActive = false;
    this.nitroTimer = 0;

    // Gestion des Cataclysmes & Modes d'Extermination Worldmageddon
    this.disasterType = this.selectedCity?.disasterType || (this.selectedCity?.isNuclearMission ? 'NUCLEAR' : (this.selectedCity?.isDamMission ? 'DAM' : (this.selectedCity?.isMountainMission ? 'MOUNTAIN' : 'STREET')));
    this.cataclysmDetonated = false;
    this.cataclysmPhase = (this.disasterType !== 'STREET') ? 'APPROACH' : null;
    this.cataclysmEscapeTimer = 22.0;

    // Rétrocompatibilité Mission Nucléaire
    this.nuclearPhase = this.disasterType === 'NUCLEAR' ? 'APPROACH' : null;
    this.nuclearEscapeTimer = 22.0;
    this.nuclearDetonated = false;

    // Compte à rebours 3, 2, 1, GO !
    this.currentMode = 'COUNTDOWN';

    soundManager.startEngine();
    soundManager.updateEngine(0.08); // Ronronnement au ralenti à l'arrêt
    const track = (this.disasterType !== 'STREET') ? 'NUCLEAR' : 'GAMEPLAY';
    soundManager.switchMusicTrack(track);
    this.notify('run_started', { city: this.selectedCity, bike: this.selectedBike });
  }

  triggerCataclysm(forcedType = null) {
    if (this.cataclysmDetonated) return false;
    this.cataclysmDetonated = true;
    this.cataclysmPhase = 'ESCAPE';
    this.cataclysmEscapeTimer = 22.0;

    const type = forcedType || this.disasterType;
    let victims = this.selectedCity.exterminationTarget || 500000;
    let bonusScore = 15000;

    if (type === 'NUCLEAR') {
      this.nuclearDetonated = true;
      this.nuclearPhase = 'ESCAPE';
      this.nuclearEscapeTimer = 22.0;
      soundManager.playNuclearBlast();
      soundManager.playNuclearAlarm();
      soundManager.switchMusicTrack('NUCLEAR');
    } else if (type === 'DAM') {
      soundManager.playDamBurst();
      soundManager.playWaterRush();
      soundManager.switchMusicTrack('NUCLEAR');
    } else if (type === 'MOUNTAIN') {
      soundManager.playMountainExplosion();
      soundManager.playRockAvalanche();
      soundManager.switchMusicTrack('NUCLEAR');
    }

    this.score += bonusScore;
    this.nitroGauge = 100; // Recharge nitro d'urgence pour s'enfuir
    this.worldPopulationEliminated += victims;
    storage.incrementTotalKills(victims);

    this.notify('cataclysm_triggered', {
      type,
      phase: this.cataclysmPhase,
      escapeTimer: this.cataclysmEscapeTimer,
      bonusScore,
      victims,
      worldTotal: this.worldPopulationEliminated
    });

    if (type === 'NUCLEAR') {
      this.notify('nuclear_detonated', {
        phase: this.nuclearPhase,
        escapeTimer: this.nuclearEscapeTimer,
        bonusScore
      });
    }

    return true;
  }

  triggerNuclearDetonation() {
    return this.triggerCataclysm('NUCLEAR');
  }

  refillNitro() {
    this.nitroGauge = 100;
    soundManager.playNearMiss();
    this.notify('nitro_ready', {});
    this.notify('nitro_updated', {
      gauge: 100,
      isActive: this.isNitroActive,
      timer: this.nitroTimer
    });
  }

  recordKill(points = 500, weapon = 'WEAPON', category = 'man') {
    if (this.currentMode !== 'PLAYING') return;

    this.killsCount++;
    this.killStreak++;
    this.worldPopulationEliminated++;
    storage.incrementTotalKills(1);

    // Rire sadique démoniaque tous les 5 kills consécutifs
    if (this.killStreak % 5 === 0) {
      soundManager.playEvilLaugh();
    } else {
      soundManager.playSplatKill();
    }

    this.addInteraction(points, weapon, category);
    this.notify('kill_updated', {
      kills: this.killsCount,
      quota: this.selectedCity.killQuota || 30,
      streak: this.killStreak,
      worldTotal: this.worldPopulationEliminated,
      category
    });
  }

  chargeNitro(amount) {
    if (this.currentMode !== 'PLAYING') return;
    const oldGauge = this.nitroGauge;
    this.nitroGauge = Math.min(100, this.nitroGauge + amount);
    if (oldGauge < 100 && this.nitroGauge >= 100) {
      soundManager.playNearMiss();
      this.notify('nitro_ready', {});
    }
    this.notify('nitro_updated', {
      gauge: Math.round(this.nitroGauge),
      isActive: this.isNitroActive,
      timer: this.nitroTimer
    });
  }

  activateNitro() {
    if (this.currentMode !== 'PLAYING') return false;
    if (this.isNitroActive) return false;
    if (this.nitroGauge < 100) return false;

    this.nitroGauge = 0;
    this.isNitroActive = true;
    this.nitroTimer = this.nitroDuration;
    soundManager.playNitroBoost();
    soundManager.playTurboWhistle();
    this.notify('nitro_activated', { duration: this.nitroDuration });
    return true;
  }

  triggerGo() {
    this.currentMode = 'PLAYING';
    this.targetSpeed = this.selectedBike.maxSpeed;
    this.notify('countdown_go', {});
  }

  setBraking(braking) {
    if (braking && !this.isBraking && this.speed > 8.0) {
      soundManager.playTireScreech();
    } else if (!braking && this.isBraking && this.speed > 12.0) {
      soundManager.playExhaustBackfire();
    }
    this.isBraking = braking;
  }

  addInteraction(points = 100, itemType = 'person', category = 'man') {
    if (this.currentMode !== 'PLAYING') return;

    this.interactionsCount++;
    this.comboTimer = 3.8;
    this.combo = Math.min(this.combo + 1, 10);
    this.comboMax = Math.max(this.comboMax, this.combo);

    // Bonus de catégorie spécialisé & popups de score dynamiques
    let categoryBonus = 0;
    let specialLabel = '';
    if (category === 'stroller') {
      categoryBonus = 180;
      specialLabel = '👶 POUSSETTE STRIKE !';
    } else if (category === 'elderly') {
      categoryBonus = 150;
      specialLabel = '👴 PAPY & CANNE RENVERSÉ !';
    } else if (category === 'child') {
      categoryBonus = 120;
      specialLabel = '🛴 ENFANT DÉBOULONNÉ !';
    } else if (itemType.startsWith('WEAPON_')) {
      categoryBonus = 100;
      specialLabel = '💥 ARME CARNAGE !';
    }

    const basePoints = points + categoryBonus;
    const totalAdded = basePoints * this.combo;
    this.score += totalAdded;

    const coinsFromHit = Math.floor(totalAdded / 35) + 1;
    this.coinsEarned += coinsFromHit;

    // Chaque interaction réussie booste la jauge de Nitro (+12%)
    this.chargeNitro(12);

    // Réaction sonore réaliste selon la personne heurtée (enfant, vieux, poussette, femme, homme)
    soundManager.playPedestrianReaction(category);
    if (this.combo > 2) {
      soundManager.playComboFanfare(this.combo);
    }

    const titleIndex = Math.min(this.combo - 1, COMBO_TITLES.length - 1);
    const comboTitle = specialLabel || COMBO_TITLES[titleIndex];

    this.notify('score_updated', {
      score: this.score,
      added: totalAdded,
      combo: this.combo,
      comboTitle,
      coinsEarned: this.coinsEarned,
      itemType,
      category
    });

    this.checkNextCityUnlock();
  }

  addNearMiss() {
    if (this.currentMode !== 'PLAYING') return;

    const nearMissPoints = 75 * this.combo;
    this.score += nearMissPoints;
    this.coinsEarned += 1;
    // Les frôlements risqués rechargent le Nitro plus rapidement (+15%)
    this.chargeNitro(15);
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
    if (this.isNitroActive) {
      this.isNitroActive = false;
      this.nitroTimer = 0;
    }

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

  update(delta, isCrashed = false) {
    if (this.currentMode === 'COUNTDOWN' || isCrashed) {
      this.speed = 0;
      this.drivingScoreAccumulator = 0;
      soundManager.updateEngine(0.08);
      this.notify('stats_tick', {
        distance: Math.floor(this.distance),
        speed: 0,
        score: this.score,
        targetScore: this.selectedCity.targetScore,
        progressRatio: Math.min(1.0, this.score / this.selectedCity.targetScore),
        isBraking: this.isBraking,
        nitroGauge: Math.round(this.nitroGauge),
        isNitroActive: this.isNitroActive,
        nitroTimer: Math.max(0, this.nitroTimer),
        kills: this.killsCount,
        killQuota: this.selectedCity.killQuota || 30,
        worldTotal: this.worldPopulationEliminated
      });
      return;
    }
    if (this.currentMode !== 'PLAYING') return;

    // 1. Gestion du Nitro 5 secondes
    if (this.isNitroActive) {
      this.nitroTimer -= delta;
      if (this.nitroTimer <= 0) {
        this.isNitroActive = false;
        this.nitroTimer = 0;
        soundManager.playExhaustBackfire();
        this.notify('nitro_ended', {});
      }
    } else if (this.speed > 5.0 && !this.isBraking) {
      // Rechargement passif au fil de la vitesse
      const oldVal = this.nitroGauge;
      this.nitroGauge = Math.min(100, this.nitroGauge + delta * 6.0);
      if (oldVal < 100 && this.nitroGauge >= 100) {
        this.notify('nitro_ready', {});
      }
    }

    // 2. Gestion du frein et de la reprise de circulation avec Nitro Boost (vitesse calibrée & contrôlable)
    const maxSpeedCap = this.isNitroActive ? (this.targetSpeed * 1.35) : this.targetSpeed;
    const accelRate = this.isNitroActive ? (this.selectedBike.accel * 1.6) : this.selectedBike.accel;

    if (this.isBraking) {
      // Décélération rapide jusqu'à l'arrêt complet
      this.speed = Math.max(0, this.speed - delta * 30.0);
    } else {
      // Réaccélération progressive vers la vitesse de croisière
      this.speed = Math.min(maxSpeedCap, this.speed + delta * accelRate);
    }

    // Points de conduite continue arcade : rouler vite fait monter le score (doublé sous Nitro) !
    // LE SCORE N'AVANCE PAS À L'ARRÊT : Strictement si la vitesse > 3.5 m/s (~13 km/h), sans freinage et hors crash
    if (this.speed > 3.5 && !this.isBraking) {
      const nitroScoreMult = this.isNitroActive ? 2.0 : 1.0;
      this.drivingScoreAccumulator += this.speed * delta * 1.6 * nitroScoreMult;
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

    // Décompte de la phase d'évasion (Nucléaire, Déluge, Avalanche)
    if (this.cataclysmPhase === 'ESCAPE') {
      this.cataclysmEscapeTimer = Math.max(0, this.cataclysmEscapeTimer - delta);
      this.nuclearEscapeTimer = this.cataclysmEscapeTimer;
    }

    // Distance parcourue
    this.distance += this.speed * delta;
    this.notify('stats_tick', {
      distance: Math.floor(this.distance),
      speed: Math.floor(this.speed * 3.6),
      score: this.score,
      targetScore: this.selectedCity.targetScore,
      progressRatio: Math.min(1.0, this.score / this.selectedCity.targetScore),
      isBraking: this.isBraking,
      nitroGauge: Math.round(this.nitroGauge),
      isNitroActive: this.isNitroActive,
      nitroTimer: Math.max(0, this.nitroTimer),
      kills: this.killsCount,
      killQuota: this.selectedCity.killQuota || 30,
      worldTotal: this.worldPopulationEliminated,
      disasterType: this.disasterType,
      cataclysmPhase: this.cataclysmPhase,
      cataclysmEscapeTimer: this.cataclysmEscapeTimer,
      nuclearPhase: this.nuclearPhase,
      nuclearEscapeTimer: this.nuclearEscapeTimer
    });
  }

  endRun() {
    if (this.currentMode !== 'PLAYING') return;

    this.currentMode = 'RESULTS';
    this.isGameOver = true;
    soundManager.stopEngine();
    soundManager.switchMusicTrack('MENU');

    // Extermination bonus de fin d'étape pour Worldmageddon
    const cityVictims = this.selectedCity.exterminationTarget || 35000;
    let runVictims = this.killsCount;
    if (this.disasterType === 'STREET' || !this.cataclysmDetonated) {
      this.worldPopulationEliminated += cityVictims;
      storage.incrementTotalKills(cityVictims);
      runVictims += cityVictims;
    } else {
      runVictims += (this.selectedCity.exterminationTarget || 500000);
    }

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
      kills: this.killsCount,
      runVictims,
      disasterType: this.disasterType,
      worldTotal: this.worldPopulationEliminated,
      distance: Math.floor(this.distance),
      maxCombo: this.comboMax,
      city: this.selectedCity,
      newlyUnlockedCity
    });
  }
}

export const gameState = new GameState();

/**
 * Carnage Cruise - Gestionnaire de l'État du Jeu (GameState)
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
    targetScore: 12000,
    starThresholds: [12000, 21600, 33600],
    unlockScoreRequired: 0,
    skyColor: 8900331,
    fogColor: 14215416,
    ambientColor: 16777215,
    roadColor: 3355960,
    buildingColors: [16115400, 15521203, 13943461, 14866368],
    roofColor: 4871528,
    accentColor: 3447003,
    unlockedByDefault: true,
    population: 2160000,
    exterminationTarget: 2160000,
    mapCoords: { x: 41.7, y: 55.1 }
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
    targetScore: 14500,
    starThresholds: [14500, 26100, 40600],
    unlockScoreRequired: 8400,
    skyColor: 9489145,
    fogColor: 14938877,
    ambientColor: 16777215,
    roadColor: 3093826,
    buildingColors: [16180621, 16760438, 14678523, 14702333],
    roofColor: 2899536,
    accentColor: 16370212,
    unlockedByDefault: false,
    population: 1220000,
    exterminationTarget: 1220000,
    mapCoords: { x: 44.6, y: 50.1 }
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
    targetScore: 17000,
    starThresholds: [17000, 30600, 47600],
    unlockScoreRequired: 10150,
    skyColor: 7649791,
    fogColor: 14673130,
    ambientColor: 15856374,
    roadColor: 1976110,
    buildingColors: [9109504, 8425115, 13555424, 13818594],
    roofColor: 1976110,
    accentColor: 16729943,
    unlockedByDefault: false,
    population: 8980000,
    exterminationTarget: 8980000,
    mapCoords: { x: 38, y: 48.4 }
  },
  {
    id: 'dublin',
    name: 'Dublin',
    country: 'Irlande',
    countryFlag: '🇮🇪',
    emblem: '🇮🇪',
    monument: 'Spire de Dublin & Temple Bar',
    subtitle: 'Liffy, Façades Géorgiennes & Pubs Mythiques',
    typeTag: 'Avenues Géorgiennes',
    description: 'Foncez le long de la Liffey sous la flèche d’acier de la Spire et les façades colorées du quartier historique de Temple Bar !',
    targetScore: 19500,
    starThresholds: [19500, 35100, 54600],
    unlockScoreRequired: 11900,
    skyColor: 6843872,
    fogColor: 13102318,
    ambientColor: 16119546,
    roadColor: 3094080,
    buildingColors: [15420747, 3069299, 16180621, 5463144],
    roofColor: 1249088,
    accentColor: 3069299,
    unlockedByDefault: false,
    population: 1250000,
    exterminationTarget: 1250000,
    mapCoords: { x: 29, y: 43.4 }
  },
  {
    id: 'newcastle',
    name: 'Newcastle',
    country: 'Royaume-Uni',
    countryFlag: '🇬🇧',
    emblem: '🇬🇧',
    monument: 'Tyne Bridge & Château Normand',
    subtitle: 'Cité Industrielle & Ponts Métalliques Géants',
    typeTag: 'Architecture Industrielle & Viaducs',
    description: 'Propulsez votre bolide sur les arches métalliques monumentales du Tyne Bridge et les viaducs victoriens de briques rouges !',
    targetScore: 22000,
    starThresholds: [22000, 39600, 61600],
    unlockScoreRequired: 13650,
    skyColor: 5726319,
    fogColor: 10793150,
    ambientColor: 14673130,
    roadColor: 3093826,
    buildingColors: [7634316, 5726319, 12597547, 3093826],
    roofColor: 1976110,
    accentColor: 16753922,
    unlockedByDefault: false,
    population: 820000,
    exterminationTarget: 820000,
    mapCoords: { x: 35.9, y: 38.9 }
  },
  {
    id: 'reykjavik',
    name: 'Reykjavik',
    country: 'Islande',
    countryFlag: '🇮🇸',
    emblem: '🇮🇸',
    monument: 'Hallgrímskirkja & Geysers d’Hiver',
    subtitle: 'Bord du Cercle Polaire & Aurores Boréales',
    typeTag: 'Glace, Volcans & Geysers',
    description: 'Défiez le blizzard arctique et les fumerolles volcaniques sous les orgues de basalte de la cathédrale Hallgrímskirkja !',
    targetScore: 24500,
    starThresholds: [24500, 44100, 68600],
    unlockScoreRequired: 15400,
    skyColor: 3426654,
    fogColor: 14678523,
    ambientColor: 16777215,
    roadColor: 1249088,
    buildingColors: [5460717, 7381503, 16777215, 13555424],
    roofColor: 3069299,
    accentColor: 52937,
    unlockedByDefault: false,
    population: 135000,
    exterminationTarget: 135000,
    mapCoords: { x: 6, y: 9.2 }
  },
  {
    id: 'oslo',
    name: 'Oslo',
    country: 'Norvège',
    countryFlag: '🇳🇴',
    emblem: '🇳🇴',
    monument: 'Opéra d’Oslo & Fjord Scintillant',
    subtitle: 'Marbre Blanc, Fjords & Forteresse d’Akershus',
    typeTag: 'Architecture Moderne & Fjords',
    description: 'Gravissez les pentes immaculées de l’Opéra plongeant dans les eaux glaciales du fjord au milieu des forêts boréales !',
    targetScore: 27000,
    starThresholds: [27000, 48600, 75600],
    unlockScoreRequired: 17150,
    skyColor: 4751024,
    fogColor: 16119546,
    ambientColor: 16777215,
    roadColor: 3094080,
    buildingColors: [16777215, 14474721, 7438483, 2571381],
    roofColor: 1649238,
    accentColor: 43263,
    unlockedByDefault: false,
    population: 697000,
    exterminationTarget: 697000,
    mapCoords: { x: 54, y: 23.9 }
  },
  {
    id: 'stockholm',
    name: 'Stockholm',
    country: 'Suède',
    countryFlag: '🇸🇪',
    emblem: '🇸🇪',
    monument: 'Palais Royal & Gamla Stan',
    subtitle: 'La Venise du Nord sur 14 Îles Fluviales',
    typeTag: 'Façades Ocre & Ponts Lacustres',
    description: 'Franchissez les ponts reliant les 14 îles de la capitale entre les bâtisses ocre du XVIe siècle et l’Hôtel de Ville de brique !',
    targetScore: 29500,
    starThresholds: [29500, 53100, 82600],
    unlockScoreRequired: 18900,
    skyColor: 4223902,
    fogColor: 14474721,
    ambientColor: 16119546,
    roadColor: 3488584,
    buildingColors: [14790956, 12727830, 16500017, 7438483],
    roofColor: 3094080,
    accentColor: 16500017,
    unlockedByDefault: false,
    population: 975000,
    exterminationTarget: 975000,
    mapCoords: { x: 64.8, y: 25.8 }
  },
  {
    id: 'copenhague',
    name: 'Copenhague',
    country: 'Danemark',
    countryFlag: '🇩🇰',
    emblem: '🇩🇰',
    monument: 'Canal de Nyhavn & Bourse Historique',
    subtitle: 'Maisons Colorées de Nyhavn & Pont de l’Øresund',
    typeTag: 'Canaux Portuaires & Briques Rouges',
    description: 'Traversez les quais pavés de Nyhavn bordés de navires historiques et de façades multicolores menant à la Bourse royale !',
    targetScore: 32000,
    starThresholds: [32000, 57600, 89600],
    unlockScoreRequired: 20650,
    skyColor: 4774907,
    fogColor: 13162213,
    ambientColor: 16777215,
    roadColor: 2240318,
    buildingColors: [16739179, 16697943, 4774907, 1954209],
    roofColor: 5727604,
    accentColor: 16739179,
    unlockedByDefault: false,
    population: 650000,
    exterminationTarget: 650000,
    mapCoords: { x: 56.7, y: 36.9 }
  },
  {
    id: 'helsinki',
    name: 'Helsinki',
    country: 'Finlande',
    countryFlag: '🇫🇮',
    emblem: '🇫🇮',
    monument: 'Cathédrale Blanche & Suomenlinna',
    subtitle: 'La Fille de la Baltique & Dômes Émeraude',
    typeTag: 'Néo-Classicisme & Granit Nordique',
    description: 'Slalomez sur la place du Sénat dominée par les colonnes de marbre blanc et les dômes émeraude de la cathédrale monumentale !',
    targetScore: 34500,
    starThresholds: [34500, 62100, 96600],
    unlockScoreRequired: 22400,
    skyColor: 5546239,
    fogColor: 14678523,
    ambientColor: 16777215,
    roadColor: 3093826,
    buildingColors: [16777215, 13102318, 9809856, 5463144],
    roofColor: 3069299,
    accentColor: 623843,
    unlockedByDefault: false,
    population: 660000,
    exterminationTarget: 660000,
    mapCoords: { x: 74.9, y: 23.1 }
  },
  {
    id: 'tallinn',
    name: 'Tallinn',
    country: 'Estonie',
    countryFlag: '🇪🇪',
    emblem: '🇪🇪',
    monument: 'Château de Toompea & Tours Fortifiées',
    subtitle: 'Remparts Médiévaux & Toits Pointus',
    typeTag: 'Cité Médiévale Balte & Forteresse',
    description: 'Foncez le long des remparts crénelés médiévaux et des ruelles pavées dominées par la tour légendaire du Gros Hermann !',
    targetScore: 37000,
    starThresholds: [37000, 66600, 103600],
    unlockScoreRequired: 24150,
    skyColor: 4946924,
    fogColor: 13752544,
    ambientColor: 16119546,
    roadColor: 3696598,
    buildingColors: [16234289, 15416154, 16417329, 7834787],
    roofColor: 10837738,
    accentColor: 3696598,
    unlockedByDefault: false,
    population: 440000,
    exterminationTarget: 440000,
    mapCoords: { x: 74.6, y: 25.5 }
  },
  {
    id: 'riga',
    name: 'Riga',
    country: 'Lettonie',
    countryFlag: '🇱🇻',
    emblem: '🇱🇻',
    monument: 'Maison des Têtes Noires & Daugava',
    subtitle: 'Joyau Art Nouveau & Flèches Gothiques',
    typeTag: 'Art Nouveau & Bords de Daugava',
    description: 'Slalomez entre les sculptures baroques de la Maison des Têtes Noires et les façades Art Nouveau mondialement célèbres !',
    targetScore: 39500,
    starThresholds: [39500, 71100, 110600],
    unlockScoreRequired: 25900,
    skyColor: 3696598,
    fogColor: 13752544,
    ambientColor: 16777215,
    roadColor: 2962486,
    buildingColors: [15416154, 16234289, 13752544, 4941188],
    roofColor: 2146155,
    accentColor: 15416154,
    unlockedByDefault: false,
    population: 615000,
    exterminationTarget: 615000,
    mapCoords: { x: 73.7, y: 33.2 }
  },
  {
    id: 'vilnius',
    name: 'Vilnius',
    country: 'Lituanie',
    countryFlag: '🇱🇹',
    emblem: '🇱🇹',
    monument: 'Tour de Gediminas & Église Sainte-Anne',
    subtitle: 'Baroque Flamboyant & Collines Boisées',
    typeTag: 'Briques Gothiques & Flèches Baroques',
    description: 'Déboulez au pied de la Tour de Gediminas dominant la Neris et les chefs-d’œuvre de brique rouge gothique de Sainte-Anne !',
    targetScore: 42000,
    starThresholds: [42000, 75600, 117600],
    unlockScoreRequired: 27650,
    skyColor: 2146155,
    fogColor: 10858946,
    ambientColor: 16119546,
    roadColor: 2962486,
    buildingColors: [16417329, 16234289, 15416154, 4941188],
    roofColor: 7834787,
    accentColor: 2146155,
    unlockedByDefault: false,
    population: 590000,
    exterminationTarget: 590000,
    mapCoords: { x: 75.4, y: 39.7 }
  },
  {
    id: 'saint_petersbourg',
    name: 'Saint-Pétersbourg',
    country: 'Russie',
    countryFlag: '🇷🇺',
    emblem: '🇷🇺',
    monument: 'Palais d’Hiver & Colonne d’Alexandre',
    subtitle: 'Venise du Nord Impériale & Neva Gelée',
    typeTag: 'Palais Baroques & Quais de la Neva',
    description: 'Franchissez la place du Palais d’Hiver aux façades turquoise et dorées avant d’enflammer les boulevards gelés de la perspective Nevski !',
    targetScore: 44500,
    starThresholds: [44500, 80100, 124600],
    unlockScoreRequired: 29400,
    skyColor: 703971,
    fogColor: 13162213,
    ambientColor: 16777215,
    roadColor: 1092740,
    buildingColors: [1092740, 703971, 16697943, 16777215],
    roofColor: 2240318,
    accentColor: 16697943,
    unlockedByDefault: false,
    population: 5400000,
    exterminationTarget: 5400000,
    mapCoords: { x: 82.9, y: 23.9 }
  },
  {
    id: 'moscou',
    name: 'Moscou',
    country: 'Russie',
    countryFlag: '🇷🇺',
    emblem: '🇷🇺',
    monument: 'Kremlin & Cathédrale Saint-Basile',
    subtitle: 'Place Rouge, Murailles Ocre & Bulbes Multicolores',
    typeTag: 'Murailles Impériales & Avenues Géantes',
    description: 'Foncez sur les pavés historiques de la Place Rouge devant les bulbes polychromes féeriques de la cathédrale Saint-Basile !',
    targetScore: 47000,
    starThresholds: [47000, 84600, 131600],
    unlockScoreRequired: 31150,
    skyColor: 15618643,
    fogColor: 16752451,
    ambientColor: 16777215,
    roadColor: 1976110,
    buildingColors: [12597547, 16752451, 16775781, 52937],
    roofColor: 8598641,
    accentColor: 16726072,
    unlockedByDefault: false,
    population: 13000000,
    exterminationTarget: 13000000,
    mapCoords: { x: 93.6, y: 36.7 }
  },
  {
    id: 'minsk',
    name: 'Minsk',
    country: 'Biélorussie',
    countryFlag: '🇧🇾',
    emblem: '🇧🇾',
    monument: 'Portes de Minsk & Place de la Victoire',
    subtitle: 'Néo-Classicisme Monumental & Grands Parcs',
    typeTag: 'Avenues Impériales Larges',
    description: 'Dominez l’avenue de l’Indépendance sous les tours jumelles des Portes de Minsk et les flèches commémoratives en granit !',
    targetScore: 49500,
    starThresholds: [49500, 89100, 138600],
    unlockScoreRequired: 32900,
    skyColor: 5727604,
    fogColor: 8623527,
    ambientColor: 13162213,
    roadColor: 2240318,
    buildingColors: [13162213, 8623527, 16697943, 5727604],
    roofColor: 1092740,
    accentColor: 16739179,
    unlockedByDefault: false,
    population: 2000000,
    exterminationTarget: 2000000,
    mapCoords: { x: 78.8, y: 41.9 }
  },
  {
    id: 'kiev',
    name: 'Kiev',
    country: 'Ukraine',
    countryFlag: '🇺🇦',
    emblem: '🇺🇦',
    monument: 'Laure des Grottes & Dniepr',
    subtitle: 'Dômes d’Or, Collines Boisées & Fleuve Majestueux',
    typeTag: 'Monastères & Fleuve',
    description: 'Franchissez les ponts colossaux sur le Dniepr sous la splendeur des dômes dorés de la Laure des Grottes et de Sainte-Sophie !',
    targetScore: 52000,
    starThresholds: [52000, 93600, 145600],
    unlockScoreRequired: 34650,
    skyColor: 3696598,
    fogColor: 16242580,
    ambientColor: 16777215,
    roadColor: 2899536,
    buildingColors: [16108921, 16242580, 5533157, 16777215],
    roofColor: 2146155,
    accentColor: 16765738,
    unlockedByDefault: false,
    population: 2950000,
    exterminationTarget: 2950000,
    mapCoords: { x: 83.1, y: 51.1 }
  },
  {
    id: 'varsovie',
    name: 'Varsovie',
    country: 'Pologne',
    countryFlag: '🇵🇱',
    emblem: '🇵🇱',
    monument: 'Palais de la Culture & Vieille Ville',
    subtitle: 'Gratte-Ciels de Verre & Reconstruction Baroque',
    typeTag: 'Gratte-ciels & Cité Historique',
    description: 'Foncez sur Marszałkowska sous l’immense flèche du Palais de la Culture et les reflets dorés des façades de la place du Marché !',
    targetScore: 54500,
    starThresholds: [54500, 98100, 152600],
    unlockScoreRequired: 36400,
    skyColor: 3696598,
    fogColor: 13752544,
    ambientColor: 16777215,
    roadColor: 3093826,
    buildingColors: [16729943, 16777215, 16169275, 4876733],
    roofColor: 1976110,
    accentColor: 16729943,
    unlockedByDefault: false,
    population: 1860000,
    exterminationTarget: 1860000,
    mapCoords: { x: 69.1, y: 46.5 }
  },
  {
    id: 'berlin',
    name: 'Berlin',
    country: 'Allemagne',
    countryFlag: '🇩🇪',
    emblem: '🇩🇪',
    monument: 'Porte de Brandebourg & Fernsehturm',
    subtitle: 'Unter den Linden & Tour TV Alexanderplatz',
    typeTag: 'Monuments Néo-Classiques & Tour TV',
    description: 'Pulvérisez vos records sous le quadrige de la Porte de Brandebourg et l’immense aiguille métallique de la Fernsehturm !',
    targetScore: 57000,
    starThresholds: [57000, 102600, 159600],
    unlockScoreRequired: 38150,
    skyColor: 4876733,
    fogColor: 14474721,
    ambientColor: 16777215,
    roadColor: 1976110,
    buildingColors: [13818594, 8425115, 16169275, 498066],
    roofColor: 2898503,
    accentColor: 16169275,
    unlockedByDefault: false,
    population: 3670000,
    exterminationTarget: 3670000,
    mapCoords: { x: 57.9, y: 45.7 }
  },
  {
    id: 'bonn',
    name: 'Bonn',
    country: 'Allemagne',
    countryFlag: '🇩🇪',
    emblem: '🇩🇪',
    monument: 'Bords du Rhin & Maison de Beethoven',
    subtitle: 'Ancienne Capitale Fédérale & Rives Rhénanes',
    typeTag: 'Boulevards Rhénans & Châteaux',
    description: 'Slalomez le long du Rhin en longeant le palais de Poppelsdorf et les avenues ombragées de la cité musicale de Beethoven !',
    targetScore: 59500,
    starThresholds: [59500, 107100, 166600],
    unlockScoreRequired: 39900,
    skyColor: 6982092,
    fogColor: 14678523,
    ambientColor: 16777215,
    roadColor: 3093826,
    buildingColors: [16302737, 15028281, 6333372, 4876733],
    roofColor: 671074,
    accentColor: 15028281,
    unlockedByDefault: false,
    population: 330000,
    exterminationTarget: 330000,
    mapCoords: { x: 48.7, y: 50.4 }
  },
  {
    id: 'francfort',
    name: 'Francfort',
    country: 'Allemagne',
    countryFlag: '🇩🇪',
    emblem: '🇩🇪',
    monument: 'Skyline Mainhattan & Place du Römer',
    subtitle: 'Cœur Financier, Verre Chromé & Maisons à Colombages',
    typeTag: 'Skyline & Ponts sur le Main',
    description: 'Foncez entre les tours de verre vertigineuses de la BCE et la place médiévale du Römer aux pignons à colombages sculptés !',
    targetScore: 62000,
    starThresholds: [62000, 111600, 173600],
    unlockScoreRequired: 41650,
    skyColor: 1980313,
    fogColor: 8572125,
    ambientColor: 16777215,
    roadColor: 795745,
    buildingColors: [4876733, 6333372, 7921807, 3714473],
    roofColor: 498066,
    accentColor: 7921807,
    unlockedByDefault: false,
    population: 760000,
    exterminationTarget: 760000,
    mapCoords: { x: 51, y: 52 }
  },
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    country: 'Pays-Bas',
    countryFlag: '🇳🇱',
    emblem: '🇳🇱',
    monument: 'Canaux du Dam & Rijksmuseum',
    subtitle: 'Ponts Levants, Vélos & Façades en Briques',
    typeTag: 'Canaux & Ponts Levants',
    description: 'Enchaînez les virages serrés le long des canaux concentriques enjambant les ponts levants et les rangées de péniches !',
    targetScore: 64500,
    starThresholds: [64500, 116100, 180600],
    unlockScoreRequired: 43400,
    skyColor: 3714473,
    fogColor: 12118420,
    ambientColor: 16777215,
    roadColor: 2898503,
    buildingColors: [11998528, 15028281, 16302737, 4876733],
    roofColor: 1980313,
    accentColor: 16739201,
    unlockedByDefault: false,
    population: 870000,
    exterminationTarget: 870000,
    mapCoords: { x: 45.4, y: 46.1 }
  },
  {
    id: 'anvers',
    name: 'Anvers',
    country: 'Belgique',
    countryFlag: '🇧🇪',
    emblem: '🇧🇪',
    monument: 'Gare Centrale & Quartier des Diamants',
    subtitle: 'Palais Ferroviaire & Rives de l’Escaut',
    typeTag: 'Architecture Flamande & Quais',
    description: 'Propulsez votre engin devant la majestueuse cathédrale de fer et de verre de la Gare Centrale et les quais de l’Escaut !',
    targetScore: 67000,
    starThresholds: [67000, 120600, 187600],
    unlockScoreRequired: 45150,
    skyColor: 4876733,
    fogColor: 14678523,
    ambientColor: 16777215,
    roadColor: 1976110,
    buildingColors: [16302737, 6333372, 16760438, 16742005],
    roofColor: 2899536,
    accentColor: 3714473,
    unlockedByDefault: false,
    population: 530000,
    exterminationTarget: 530000,
    mapCoords: { x: 44.7, y: 49.1 }
  },
  {
    id: 'cherbourg',
    name: 'Cherbourg',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '⚓',
    monument: 'Rade & Cité de la Mer',
    subtitle: 'La Grande Rade & Sous-Marin Redoutable',
    typeTag: 'Port & Digue Marine',
    description: 'Affrontez les embruns de la plus grande rade artificielle du monde devant la silhouette monumentale du sous-marin Redoutable !',
    targetScore: 69500,
    starThresholds: [69500, 125100, 194600],
    unlockScoreRequired: 46900,
    skyColor: 6333372,
    fogColor: 14678523,
    ambientColor: 16777215,
    roadColor: 3093826,
    buildingColors: [13555424, 7634316, 10793150, 5726319],
    roofColor: 1976110,
    accentColor: 3714473,
    unlockedByDefault: false,
    population: 80000,
    exterminationTarget: 80000,
    mapCoords: { x: 35.8, y: 53.2 }
  },
  {
    id: 'saint_malo',
    name: 'Saint-Malo',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '🏴‍☠️',
    monument: 'Remparts de Granit & Cité Corsaire',
    subtitle: 'La Cité Corsaire Face aux Vagues',
    typeTag: 'Remparts & Baie',
    description: 'Slalomez sur les remparts en granit gris battus par les marées géantes avec vue imprenable sur les forts insulaires !',
    targetScore: 72000,
    starThresholds: [72000, 129600, 201600],
    unlockScoreRequired: 48650,
    skyColor: 4876733,
    fogColor: 8572125,
    ambientColor: 16119546,
    roadColor: 2898503,
    buildingColors: [5726319, 7634316, 10793150, 13818594],
    roofColor: 1976110,
    accentColor: 52937,
    unlockedByDefault: false,
    population: 47000,
    exterminationTarget: 47000,
    mapCoords: { x: 35.3, y: 55.6 }
  },
  {
    id: 'bordeaux',
    name: 'Bordeaux',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '🍷',
    monument: 'Place de la Bourse & Pont de Pierre',
    subtitle: 'Miroir d’Eau, Garonne & Arcades Dorées',
    typeTag: 'Façades Classiques & Quais',
    description: 'Foncez sur les quais de la Garonne en traversant les reflets du Miroir d’Eau et les arches de briques du Pont de Pierre !',
    targetScore: 74500,
    starThresholds: [74500, 134100, 208600],
    unlockScoreRequired: 50400,
    skyColor: 16295362,
    fogColor: 16242580,
    ambientColor: 16777215,
    roadColor: 3160402,
    buildingColors: [16242580, 16108921, 15967875, 16295362],
    roofColor: 5533157,
    accentColor: 14769985,
    unlockedByDefault: false,
    population: 260000,
    exterminationTarget: 260000,
    mapCoords: { x: 37.4, y: 64.7 }
  },
  {
    id: 'lyon',
    name: 'Lyon',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '🦁',
    monument: 'Basilique de Fourvière & Passerelles',
    subtitle: 'La Confluence, Saône, Rhône & Traboules',
    typeTag: 'Ponts Fluviaux & Collines',
    description: 'Enchaînez les ponts au-dessus de la Saône et du Rhône sous le regard protecteur de la basilique de Fourvière !',
    targetScore: 77000,
    starThresholds: [77000, 138600, 215600],
    unlockScoreRequired: 52150,
    skyColor: 7834787,
    fogColor: 13752544,
    ambientColor: 16777215,
    roadColor: 2962486,
    buildingColors: [15416154, 16417329, 16234289, 13752544],
    roofColor: 4941188,
    accentColor: 15416154,
    unlockedByDefault: false,
    population: 520000,
    exterminationTarget: 520000,
    mapCoords: { x: 45.3, y: 62.6 }
  },
  {
    id: 'strasbourg',
    name: 'Strasbourg',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '🥨',
    monument: 'Cathédrale Notre-Dame & Petite France',
    subtitle: 'Grès Rose, Colombages & Ponts Couverts',
    typeTag: 'Gothique en Grès & Canaux de l’Ill',
    description: 'Prenez les virages en épingle entre les maisons à colombages de la Petite France et la flèche en grès rose de la cathédrale !',
    targetScore: 79500,
    starThresholds: [79500, 143100, 222600],
    unlockScoreRequired: 53900,
    skyColor: 4941188,
    fogColor: 10858946,
    ambientColor: 16777215,
    roadColor: 2962486,
    buildingColors: [15416154, 16234289, 13752544, 7834787],
    roofColor: 2146155,
    accentColor: 16417329,
    unlockedByDefault: false,
    population: 290000,
    exterminationTarget: 290000,
    mapCoords: { x: 49.6, y: 55.8 }
  },
  {
    id: 'geneve',
    name: 'Genève',
    country: 'Suisse',
    countryFlag: '🇨🇭',
    emblem: '🇨🇭',
    monument: 'Jet d’Eau & Mont-Blanc en Fond',
    subtitle: 'Palais des Nations & Rade Scintillante',
    typeTag: 'Lac, Jet d’Eau & Cimes',
    description: 'Frôlez le puissant panache de 140m du Jet d’Eau le long des quais fleuris bordés d’horlogeries de luxe !',
    targetScore: 82000,
    starThresholds: [82000, 147600, 229600],
    unlockScoreRequired: 55650,
    skyColor: 2270899,
    fogColor: 8312543,
    ambientColor: 16777215,
    roadColor: 1249088,
    buildingColors: [16777215, 13102318, 9809856, 16180621],
    roofColor: 3158891,
    accentColor: 2270899,
    unlockedByDefault: false,
    population: 200000,
    exterminationTarget: 200000,
    mapCoords: { x: 47.3, y: 61.5 }
  },
  {
    id: 'zurich',
    name: 'Zurich',
    country: 'Suisse',
    countryFlag: '🇨🇭',
    emblem: '🇨🇭',
    monument: 'Fraumünster & Quai de la Limmat',
    subtitle: 'La Limmat, Ponts Historiques & Banques',
    typeTag: 'Bords de Lac & Clochers Pointus',
    description: 'Fendez les quais de la Limmat sous les vitraux de Chagall et les reflets cristallins des cimes alpines dans le lac !',
    targetScore: 84500,
    starThresholds: [84500, 152100, 236600],
    unlockScoreRequired: 57400,
    skyColor: 623843,
    fogColor: 7649791,
    ambientColor: 16777215,
    roadColor: 2962486,
    buildingColors: [14673130, 15856374, 13555424, 7634316],
    roofColor: 52937,
    accentColor: 52937,
    unlockedByDefault: false,
    population: 420000,
    exterminationTarget: 420000,
    mapCoords: { x: 50.8, y: 58.7 }
  },
  {
    id: 'innsbruck',
    name: 'Innsbruck',
    country: 'Autriche',
    countryFlag: '🇦🇹',
    emblem: '🇦🇹',
    monument: 'Petit Toit d’Or & Tremplin de Bergisel',
    subtitle: 'La Capitale du Tyrol Cernée de Géants Rocheux',
    typeTag: 'Gorges Alpines & Toits Scintillants',
    description: 'Accélérez entre les sommets enneigés de la Nordkette et les reflets cuivrés du Petit Toit d’Or au cœur du Tyrol !',
    targetScore: 87000,
    starThresholds: [87000, 156600, 243600],
    unlockScoreRequired: 59150,
    skyColor: 4774907,
    fogColor: 14678523,
    ambientColor: 16777215,
    roadColor: 2240318,
    buildingColors: [16697943, 16752627, 5546239, 1954209],
    roofColor: 16739179,
    accentColor: 16697943,
    unlockedByDefault: false,
    population: 130000,
    exterminationTarget: 130000,
    mapCoords: { x: 55, y: 59 }
  },
  {
    id: 'prague',
    name: 'Prague',
    country: 'République Tchèque',
    countryFlag: '🇨🇿',
    emblem: '🇨🇿',
    monument: 'Pont Charles & Château de Prague',
    subtitle: 'La Ville aux Cent Clochers & Vltava Miroitante',
    typeTag: 'Gothique, Baroque & Statues de Pierre',
    description: 'Foncez sur les pavés du Pont Charles entre les trente statues de saints et la silhouette colossale du château dominant la Vltava !',
    targetScore: 89500,
    starThresholds: [89500, 161100, 250600],
    unlockScoreRequired: 60900,
    skyColor: 3415959,
    fogColor: 15618643,
    ambientColor: 16777215,
    roadColor: 2240318,
    buildingColors: [16697943, 16752451, 16739179, 5727604],
    roofColor: 1092740,
    accentColor: 16697943,
    unlockedByDefault: false,
    population: 1330000,
    exterminationTarget: 1330000,
    mapCoords: { x: 59.5, y: 52.1 }
  },
  {
    id: 'vienne',
    name: 'Vienne',
    country: 'Autriche',
    countryFlag: '🇦🇹',
    emblem: '🇦🇹',
    monument: 'Château de Schönbrunn & Ringstrasse',
    subtitle: 'Palais Impériaux des Habsbourg & Danube Bleu',
    typeTag: 'Palais Impériaux & Boulevards Larges',
    description: 'Dépassez les calèches impériales sur le célèbre Ring en passant devant le palais de la Hofburg et le Belvédère baroque !',
    targetScore: 92000,
    starThresholds: [92000, 165600, 257600],
    unlockScoreRequired: 62650,
    skyColor: 703971,
    fogColor: 16697943,
    ambientColor: 16777215,
    roadColor: 2240318,
    buildingColors: [16697943, 16777215, 16752451, 4774907],
    roofColor: 1092740,
    accentColor: 16752451,
    unlockedByDefault: false,
    population: 1980000,
    exterminationTarget: 1980000,
    mapCoords: { x: 62.3, y: 56.7 }
  },
  {
    id: 'bratislava',
    name: 'Bratislava',
    country: 'Slovaquie',
    countryFlag: '🇸🇰',
    emblem: '🇸🇰',
    monument: 'Château Blanc & Pont OVNI sur le Danube',
    subtitle: 'La Table Renversée & Tour Rétro-Futuriste',
    typeTag: 'Forteresse Médiévale & Pont OVNI',
    description: 'Franchissez le Danube sous la tour panoramique OVNI du pont SNP avec vue plongeante sur les quatre tours blanches du château !',
    targetScore: 94500,
    starThresholds: [94500, 170100, 264600],
    unlockScoreRequired: 64400,
    skyColor: 6236109,
    fogColor: 4774907,
    ambientColor: 16777215,
    roadColor: 3415959,
    buildingColors: [16777215, 13162213, 16697943, 15618643],
    roofColor: 1092740,
    accentColor: 53971,
    unlockedByDefault: false,
    population: 475000,
    exterminationTarget: 475000,
    mapCoords: { x: 63.4, y: 56.9 }
  },
  {
    id: 'budapest',
    name: 'Budapest',
    country: 'Hongrie',
    countryFlag: '🇭🇺',
    emblem: '🇭🇺',
    monument: 'Parlement Néo-Gothique & Pont des Chaînes',
    subtitle: 'La Perle du Danube entre Buda et Pest',
    typeTag: 'Palais Monumental & Ponts Suspendus',
    description: 'Slalomez à pleine vitesse sur le Pont des Chaînes flanqué de ses lions de pierre sous l’immense coupole dorée du Parlement !',
    targetScore: 97000,
    starThresholds: [97000, 174600, 271600],
    unlockScoreRequired: 66150,
    skyColor: 3049182,
    fogColor: 16697943,
    ambientColor: 16777215,
    roadColor: 2240318,
    buildingColors: [16775781, 16752451, 16777215, 15618643],
    roofColor: 1092740,
    accentColor: 16775781,
    unlockedByDefault: false,
    population: 1750000,
    exterminationTarget: 1750000,
    mapCoords: { x: 66.2, y: 58.4 }
  },
  {
    id: 'ljubljana',
    name: 'Ljubljana',
    country: 'Slovénie',
    countryFlag: '🇸🇮',
    emblem: '🇸🇮',
    monument: 'Pont des Dragons & Château Perché',
    subtitle: 'Capitale Verte, Canaux Émeraude & Dragons',
    typeTag: 'Ponts Sculptés & Colline Boisée',
    description: 'Passez en trombe sous les griffes des quatre dragons de bronze gardant la rivière Ljubljanica dominée par le château médiéval !',
    targetScore: 99500,
    starThresholds: [99500, 179100, 278600],
    unlockScoreRequired: 67900,
    skyColor: 1092740,
    fogColor: 1954209,
    ambientColor: 16777215,
    roadColor: 2240318,
    buildingColors: [1954209, 1092740, 16697943, 16777215],
    roofColor: 15618643,
    accentColor: 1954209,
    unlockedByDefault: false,
    population: 295000,
    exterminationTarget: 295000,
    mapCoords: { x: 59.6, y: 61.9 }
  },
  {
    id: 'zagreb',
    name: 'Zagreb',
    country: 'Croatie',
    countryFlag: '🇭🇷',
    emblem: '🇭🇷',
    monument: 'Toit Tuilé de Saint-Marc & Ville Haute',
    subtitle: 'Gornji Grad, Funiculaire & Flèches Jumelles',
    typeTag: 'Toits en Damier & Ruelles Pavées',
    description: 'Franchissez la place Saint-Marc sous son célèbre toit en damier rouge, blanc et bleu et les ruelles pavées de la Ville Haute !',
    targetScore: 102000,
    starThresholds: [102000, 183600, 285600],
    unlockScoreRequired: 69650,
    skyColor: 3415959,
    fogColor: 15618643,
    ambientColor: 16777215,
    roadColor: 2240318,
    buildingColors: [16729943, 16777215, 3049182, 16697943],
    roofColor: 16726072,
    accentColor: 3049182,
    unlockedByDefault: false,
    population: 800000,
    exterminationTarget: 800000,
    mapCoords: { x: 61.7, y: 62.4 }
  },
  {
    id: 'sarajevo',
    name: 'Sarajevo',
    country: 'Bosnie-Herzégovine',
    countryFlag: '🇧🇦',
    emblem: '🇧🇦',
    monument: 'Baščaršija & Pont Latin Historique',
    subtitle: 'La Jérusalem d’Europe entre Montagnes & Mosquées',
    typeTag: 'Minarets, Bazars & Gorges',
    description: 'Vrombissez le long de la Miljacka en contournant la fontaine Sebilj et le Pont Latin entouré par les sommets olympiques !',
    targetScore: 104500,
    starThresholds: [104500, 188100, 292600],
    unlockScoreRequired: 71400,
    skyColor: 15618643,
    fogColor: 16697943,
    ambientColor: 16777215,
    roadColor: 1976110,
    buildingColors: [16697943, 5727604, 16777215, 15618643],
    roofColor: 3069299,
    accentColor: 16752451,
    unlockedByDefault: false,
    population: 350000,
    exterminationTarget: 350000,
    mapCoords: { x: 65.3, y: 66.9 }
  },
  {
    id: 'belgrade',
    name: 'Belgrade',
    country: 'Serbie',
    countryFlag: '🇷🇸',
    emblem: '🇷🇸',
    monument: 'Forteresse de Kalemegdan & Confluence Danube-Save',
    subtitle: 'La Ville Blanche aux Portes des Balkans',
    typeTag: 'Forteresse Millénaire & Ponts Métalliques',
    description: 'Déboulez au pied des remparts millénaires de Kalemegdan dominant la confluence spectaculaire de la Save et du Danube !',
    targetScore: 107000,
    starThresholds: [107000, 192600, 299600],
    unlockScoreRequired: 73150,
    skyColor: 2240318,
    fogColor: 15618643,
    ambientColor: 16777215,
    roadColor: 795745,
    buildingColors: [16777215, 15618643, 3049182, 16697943],
    roofColor: 1092740,
    accentColor: 15618643,
    unlockedByDefault: false,
    population: 1400000,
    exterminationTarget: 1400000,
    mapCoords: { x: 68.3, y: 64.8 }
  },
  {
    id: 'podgorica',
    name: 'Podgorica',
    country: 'Monténégro',
    countryFlag: '🇲🇪',
    emblem: '🇲🇪',
    monument: 'Pont du Millénaire & Canyons de la Morača',
    subtitle: 'Canyons Sauvages, Pont Suspendu & Calcaire Blanc',
    typeTag: 'Canyons Vertigineux & Pont Suspendu',
    description: 'Franchissez le tablier futuriste du Pont du Millénaire suspendu au-dessus des eaux turquoise des gorges de la Morača !',
    targetScore: 109500,
    starThresholds: [109500, 197100, 306600],
    unlockScoreRequired: 74900,
    skyColor: 53971,
    fogColor: 5546239,
    ambientColor: 16777215,
    roadColor: 2240318,
    buildingColors: [16777215, 13162213, 5727604, 15618643],
    roofColor: 16726072,
    accentColor: 16752451,
    unlockedByDefault: false,
    population: 200000,
    exterminationTarget: 200000,
    mapCoords: { x: 66.6, y: 70.1 }
  },
  {
    id: 'tirana',
    name: 'Tirana',
    country: 'Albanie',
    countryFlag: '🇦🇱',
    emblem: '🇦🇱',
    monument: 'Place Skanderbeg & Pyramide de Tirana',
    subtitle: 'Façades Multicolores & Statue de Skanderbeg',
    typeTag: 'Places Monumentales & Édifices Colorés',
    description: 'Balayez la gigantesque place Skanderbeg au pied de la statue équestre de bronze et de la pyramide d’acier revitalisée !',
    targetScore: 112000,
    starThresholds: [112000, 201600, 313600],
    unlockScoreRequired: 76650,
    skyColor: 16729943,
    fogColor: 16739201,
    ambientColor: 16777215,
    roadColor: 3093826,
    buildingColors: [16729943, 16753922, 3069299, 2003199],
    roofColor: 3093826,
    accentColor: 16729943,
    unlockedByDefault: false,
    population: 560000,
    exterminationTarget: 560000,
    mapCoords: { x: 67.4, y: 72.5 }
  },
  {
    id: 'skopje',
    name: 'Skopje',
    country: 'Macédoine du Nord',
    countryFlag: '🇲🇰',
    emblem: '🇲🇰',
    monument: 'Pont de Pierre & Statue d’Alexandre le Grand',
    subtitle: 'Statues Monumentales & Vardar Scintillant',
    typeTag: 'Pont Ancien & Façades Néo-Classiques',
    description: 'Foncez sur le Pont de Pierre byzantin enjambant le Vardar sous les regards des dizaines de statues héroïques colossales !',
    targetScore: 114500,
    starThresholds: [114500, 206100, 320600],
    unlockScoreRequired: 78400,
    skyColor: 16752451,
    fogColor: 16697943,
    ambientColor: 16777215,
    roadColor: 2240318,
    buildingColors: [16777215, 16697943, 15618643, 5727604],
    roofColor: 12597547,
    accentColor: 16752451,
    unlockedByDefault: false,
    population: 550000,
    exterminationTarget: 550000,
    mapCoords: { x: 69.7, y: 71.1 }
  },
  {
    id: 'sofia',
    name: 'Sofia',
    country: 'Bulgarie',
    countryFlag: '🇧🇬',
    emblem: '🇧🇬',
    monument: 'Cathédrale Alexandre-Nevski & Mont Vitocha',
    subtitle: 'Dômes d’Or Scintillants & Montagne Vitocha',
    typeTag: 'Architecture Néo-Byzantine & Pavés Jaunes',
    description: 'Slalomez sur les célèbres pavés jaunes de la capitale bulgare sous la coupole étincelante de la cathédrale Alexandre-Nevski !',
    targetScore: 117000,
    starThresholds: [117000, 210600, 327600],
    unlockScoreRequired: 80150,
    skyColor: 1092740,
    fogColor: 16697943,
    ambientColor: 16777215,
    roadColor: 16697943,
    buildingColors: [16775781, 16777215, 1092740, 15618643],
    roofColor: 1954209,
    accentColor: 16775781,
    unlockedByDefault: false,
    population: 1300000,
    exterminationTarget: 1300000,
    mapCoords: { x: 72.5, y: 69.5 }
  },
  {
    id: 'bucarest',
    name: 'Bucarest',
    country: 'Roumanie',
    countryFlag: '🇷🇴',
    emblem: '🇷🇴',
    monument: 'Palais du Parlement Colossal & Arc de Triomphe',
    subtitle: 'Le Petit Paris des Balkans & Édifice Gigantesque',
    typeTag: 'Palais Cyclopéen & Boulevards Haussmanniens',
    description: 'Propulsez votre bolide sur le boulevard Unirii face au Palais du Parlement, deuxième plus grand bâtiment administratif au monde !',
    targetScore: 119500,
    starThresholds: [119500, 215100, 334600],
    unlockScoreRequired: 81900,
    skyColor: 3049182,
    fogColor: 15618643,
    ambientColor: 16777215,
    roadColor: 2240318,
    buildingColors: [16777215, 16697943, 15618643, 3049182],
    roofColor: 5727604,
    accentColor: 3049182,
    unlockedByDefault: false,
    population: 1830000,
    exterminationTarget: 1830000,
    mapCoords: { x: 76.6, y: 65.7 }
  },
  {
    id: 'chisinau',
    name: 'Chisinau',
    country: 'Moldavie',
    countryFlag: '🇲🇩',
    emblem: '🇲🇩',
    monument: 'Arc de Triomphe Moldave & Parcs Verdoyants',
    subtitle: 'La Ville aux Pierres Blanches & Vignobles Légendaires',
    typeTag: 'Calcaire Blanc & Parcs Ombragés',
    description: 'Franchissez l’avenue Ștefan cel Mare bordée de calcaire blanc immaculé devant l’Arc de Triomphe et la cathédrale de la Nativité !',
    targetScore: 122000,
    starThresholds: [122000, 219600, 341600],
    unlockScoreRequired: 83650,
    skyColor: 5546239,
    fogColor: 1954209,
    ambientColor: 16777215,
    roadColor: 3093826,
    buildingColors: [16777215, 13162213, 1954209, 16697943],
    roofColor: 1092740,
    accentColor: 5546239,
    unlockedByDefault: false,
    population: 530000,
    exterminationTarget: 530000,
    mapCoords: { x: 80.7, y: 59.6 }
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    country: 'Turquie',
    countryFlag: '🇹🇷',
    emblem: '🇹🇷',
    monument: 'Sainte-Sophie, Mosquée Bleue & Bosphore',
    subtitle: 'Le Carrefour des Mondes entre Europe et Asie',
    typeTag: 'Dômes Byzantins & Ponts Géants',
    description: 'Franchissez le pont suspendu du Bosphore entre deux continents sous le vol des mouettes et les minarets légendaires de Sainte-Sophie !',
    targetScore: 124500,
    starThresholds: [124500, 224100, 348600],
    unlockScoreRequired: 85400,
    skyColor: 15618643,
    fogColor: 16752451,
    ambientColor: 16777215,
    roadColor: 1976110,
    buildingColors: [16775781, 16752451, 16777215, 703971],
    roofColor: 1092740,
    accentColor: 16726072,
    unlockedByDefault: false,
    population: 15800000,
    exterminationTarget: 15800000,
    mapCoords: { x: 80.9, y: 73.2 }
  },
  {
    id: 'athenes',
    name: 'Athènes',
    country: 'Grèce',
    countryFlag: '🇬🇷',
    emblem: '🇬🇷',
    monument: 'L’Acropole & Le Parthénon de Marbre',
    subtitle: 'Berceau de la Civilisation & Colline Sacrée',
    typeTag: 'Temples Antiques & Ruelles de Plaka',
    description: 'Foncez au pied des colonnes de marbre du Parthénon dominant la mer Égée et les ruelles pittoresques de Plaka !',
    targetScore: 127000,
    starThresholds: [127000, 228600, 355600],
    unlockScoreRequired: 87150,
    skyColor: 52937,
    fogColor: 14678523,
    ambientColor: 16777215,
    roadColor: 3093826,
    buildingColors: [16777215, 16180621, 623843, 7649791],
    roofColor: 623843,
    accentColor: 52937,
    unlockedByDefault: false,
    population: 3150000,
    exterminationTarget: 3150000,
    mapCoords: { x: 73.1, y: 79.6 }
  },
  {
    id: 'crete',
    name: 'Crète',
    country: 'Grèce',
    countryFlag: '🇬🇷',
    emblem: '🇬🇷',
    monument: 'Palais Minoen de Knossos & Port Vénitien',
    subtitle: 'Héraklion, Forteresse de Koules & Eaux Émeraude',
    typeTag: 'Île Méditerranéenne & Port Vénitien',
    description: 'Déboulez sur les quais de la forteresse vénitienne de Koules cernée par les flots émeraude de la mer de Crète !',
    targetScore: 129500,
    starThresholds: [129500, 233100, 362600],
    unlockScoreRequired: 88900,
    skyColor: 623843,
    fogColor: 8514796,
    ambientColor: 16777215,
    roadColor: 2962486,
    buildingColors: [16777215, 8514796, 16180621, 16742005],
    roofColor: 623843,
    accentColor: 52937,
    unlockedByDefault: false,
    population: 630000,
    exterminationTarget: 630000,
    mapCoords: { x: 75.2, y: 85 }
  },
  {
    id: 'nicosie',
    name: 'Nicosie',
    country: 'Chypre',
    countryFlag: '🇨🇾',
    emblem: '🇨🇾',
    monument: 'Remparts Vénitiens en Étoile & Porte de Famagouste',
    subtitle: 'L’Île d’Aphrodite & Murailles Fortifiées',
    typeTag: 'Remparts Circulaires & Lauriers Roses',
    description: 'Slalomez autour des onze bastions en pointe de flèche des remparts vénitiens baignés par le soleil oriental !',
    targetScore: 132000,
    starThresholds: [132000, 237600, 369600],
    unlockScoreRequired: 90650,
    skyColor: 15965202,
    fogColor: 16180621,
    ambientColor: 16777215,
    roadColor: 2899536,
    buildingColors: [16242580, 16777215, 15967875, 16295362],
    roofColor: 15105570,
    accentColor: 15965202,
    unlockedByDefault: false,
    population: 330000,
    exterminationTarget: 330000,
    mapCoords: { x: 87.3, y: 85.3 }
  },
  {
    id: 'venise',
    name: 'Venise',
    country: 'Italie',
    countryFlag: '🇮🇹',
    emblem: '🎭',
    monument: 'Pont du Rialto & Place Saint-Marc',
    subtitle: 'La Sérénissime, Gondoles & Palais Flottants',
    typeTag: 'Lagune, Ponts & Marbre',
    description: 'Affrontez le Grand Canal sous les arcades du Pont du Rialto et les mosaïques byzantines de la basilique Saint-Marc !',
    targetScore: 134500,
    starThresholds: [134500, 242100, 376600],
    unlockScoreRequired: 92400,
    skyColor: 7649791,
    fogColor: 8514796,
    ambientColor: 16777215,
    roadColor: 2899536,
    buildingColors: [16742005, 16180621, 16777215, 14678523],
    roofColor: 623843,
    accentColor: 16742005,
    unlockedByDefault: false,
    population: 260000,
    exterminationTarget: 260000,
    mapCoords: { x: 56.3, y: 63.3 }
  },
  {
    id: 'milan',
    name: 'Milan',
    country: 'Italie',
    countryFlag: '🇮🇹',
    emblem: '🇮🇹',
    monument: 'Duomo Gothique & Galleria Vittorio Emanuele',
    subtitle: 'Capitale de la Mode & Flèches de Marbre Blanc',
    typeTag: 'Marbre Blanc & Grandes Galeries',
    description: 'Accélérez sous les mille flèches ciselées du Duomo de marbre blanc et les verrières fastueuses de la Galleria !',
    targetScore: 137000,
    starThresholds: [137000, 246600, 383600],
    unlockScoreRequired: 94150,
    skyColor: 7101671,
    fogColor: 10656766,
    ambientColor: 16777215,
    roadColor: 2962486,
    buildingColors: [16777215, 14673130, 13555424, 7634316],
    roofColor: 2962486,
    accentColor: 10656766,
    unlockedByDefault: false,
    population: 1370000,
    exterminationTarget: 1370000,
    mapCoords: { x: 51.7, y: 63.3 }
  },
  {
    id: 'rome',
    name: 'Rome',
    country: 'Italie',
    countryFlag: '🇮🇹',
    emblem: '🏛️',
    monument: 'Le Colisée & Forum Romain',
    subtitle: 'La Ville Éternelle, Voie Appienne & Arènes',
    typeTag: 'Arènes & Ruines Antiques',
    description: 'Pilotez comme un gladiateur moderne sur la via dei Fori Imperiali devant les arches cyclopéennes du Colisée !',
    targetScore: 139500,
    starThresholds: [139500, 251100, 390600],
    unlockScoreRequired: 95900,
    skyColor: 16752451,
    fogColor: 16697943,
    ambientColor: 16777215,
    roadColor: 3355960,
    buildingColors: [16242580, 16108921, 15967875, 16295362],
    roofColor: 12597547,
    accentColor: 16726072,
    unlockedByDefault: false,
    population: 2870000,
    exterminationTarget: 2870000,
    mapCoords: { x: 56.6, y: 71.3 }
  },
  {
    id: 'napoli',
    name: 'Napoli',
    country: 'Italie',
    countryFlag: '🇮🇹',
    emblem: '🌋',
    monument: 'Le Vésuve & Baie de Naples',
    subtitle: 'Spaccanapoli, Volcan & Mer Tyrrhénienne',
    typeTag: 'Bord de Mer & Volcan Actif',
    description: 'Dévalez les ruelles vibrantes du bord de mer avec en toile de fond le cône fumant du redoutable volcan Vésuve !',
    targetScore: 142000,
    starThresholds: [142000, 255600, 397600],
    unlockScoreRequired: 97650,
    skyColor: 15105570,
    fogColor: 13849600,
    ambientColor: 16777215,
    roadColor: 1976110,
    buildingColors: [15965202, 15158332, 15844367, 12436423],
    roofColor: 2899536,
    accentColor: 15158332,
    unlockedByDefault: false,
    population: 960000,
    exterminationTarget: 960000,
    mapCoords: { x: 59.2, y: 73.6 }
  },
  {
    id: 'nice',
    name: 'Nice',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '🌴',
    monument: 'Promenade des Anglais & Baie des Anges',
    subtitle: 'Palmiers, Mer Azur & Palaces de la Belle Époque',
    typeTag: 'Bord de Mer & Palmiers',
    description: 'Enflammer l’asphalte de la Promenade des Anglais le long des eaux turquoise de la Méditerranée et des palaces centenaires !',
    targetScore: 144500,
    starThresholds: [144500, 260100, 404600],
    unlockScoreRequired: 99400,
    skyColor: 52937,
    fogColor: 8514796,
    ambientColor: 16777215,
    roadColor: 2962486,
    buildingColors: [16632686, 16742005, 16777215, 14678523],
    roofColor: 14037041,
    accentColor: 623843,
    unlockedByDefault: false,
    population: 340000,
    exterminationTarget: 340000,
    mapCoords: { x: 48.9, y: 67.3 }
  },
  {
    id: 'marseille',
    name: 'Marseille',
    country: 'France',
    countryFlag: '🇫🇷',
    emblem: '⚓',
    monument: 'Notre-Dame de la Garde & Vieux-Port',
    subtitle: 'La Bonne Mère, Calanques & Vieux-Port',
    typeTag: 'Corniche & Port Historique',
    description: 'Frôlez les mâts des bateaux sur le Vieux-Port et montez la colline vers la Bonne Mère sous le soleil brûlant !',
    targetScore: 147000,
    starThresholds: [147000, 264600, 411600],
    unlockScoreRequired: 101150,
    skyColor: 623843,
    fogColor: 7649791,
    ambientColor: 16777215,
    roadColor: 2962486,
    buildingColors: [16180621, 16760438, 16777215, 13555424],
    roofColor: 15420747,
    accentColor: 52937,
    unlockedByDefault: false,
    population: 870000,
    exterminationTarget: 870000,
    mapCoords: { x: 46.1, y: 68.2 }
  },
  {
    id: 'barcelone',
    name: 'Barcelone',
    country: 'Espagne',
    countryFlag: '🇪🇸',
    emblem: '🇪🇸',
    monument: 'Sagrada Família & Les Ramblas',
    subtitle: 'Gaudi, Méditerranée & Avenues Vivantes',
    typeTag: 'Modernisme & Boulevards Méditerranéens',
    description: 'Traversez les boulevards géométriques de l’Eixample sous les tours organiques et féeriques de la Sagrada Família !',
    targetScore: 149500,
    starThresholds: [149500, 269100, 418600],
    unlockScoreRequired: 102900,
    skyColor: 16742005,
    fogColor: 16632686,
    ambientColor: 16777215,
    roadColor: 2962486,
    buildingColors: [16632686, 16742005, 52937, 16777215],
    roofColor: 7101671,
    accentColor: 16729943,
    unlockedByDefault: false,
    population: 1630000,
    exterminationTarget: 1630000,
    mapCoords: { x: 41.4, y: 72.4 }
  },
  {
    id: 'saragosse',
    name: 'Saragosse',
    country: 'Espagne',
    countryFlag: '🇪🇸',
    emblem: '🇪🇸',
    monument: 'Basilique du Pilar & Ébre Majestueux',
    subtitle: 'Ponts de Pierre sur l’Èbre & Dômes Mauresques',
    typeTag: 'Art Mudéjar & Fleuve',
    description: 'Enchaînez les courbes sur les ponts traversant l’Èbre dominés par les quatre clochers élancés de la basilique du Pilar !',
    targetScore: 152000,
    starThresholds: [152000, 273600, 425600],
    unlockScoreRequired: 104650,
    skyColor: 15965202,
    fogColor: 16242580,
    ambientColor: 16777215,
    roadColor: 2899536,
    buildingColors: [16108921, 15967875, 16295362, 16777215],
    roofColor: 12597547,
    accentColor: 15965202,
    unlockedByDefault: false,
    population: 680000,
    exterminationTarget: 680000,
    mapCoords: { x: 36.9, y: 71.8 }
  },
  {
    id: 'madrid',
    name: 'Madrid',
    country: 'Espagne',
    countryFlag: '🇪🇸',
    emblem: '👑',
    monument: 'Palais Royal & Gran Vía',
    subtitle: 'Gran Vía, Fontaine de Cybèle & Palais Royal',
    typeTag: 'Avenues Royales & Boulevards',
    description: 'Dévalez la Gran Vía sous les enseignes lumineuses avant de tourner devant la fontaine monumentale de la place de Cybèle !',
    targetScore: 154500,
    starThresholds: [154500, 278100, 432600],
    unlockScoreRequired: 106400,
    skyColor: 3714473,
    fogColor: 16302737,
    ambientColor: 16777215,
    roadColor: 1976110,
    buildingColors: [16777215, 16302737, 15028281, 4876733],
    roofColor: 795745,
    accentColor: 15028281,
    unlockedByDefault: false,
    population: 3220000,
    exterminationTarget: 3220000,
    mapCoords: { x: 32.8, y: 74.5 }
  },
  {
    id: 'seville',
    name: 'Séville',
    country: 'Espagne',
    countryFlag: '🇪🇸',
    emblem: '💃',
    monument: 'Place d’Espagne & Giralda',
    subtitle: 'Flamenco, Azulejos & Palais de l’Alcázar',
    typeTag: 'Architecture Mudéjare & Orangers',
    description: 'Slalomez autour des balustrades d’azulejos de la gigantesque Place d’Espagne et sous le minaret converti de la Giralda !',
    targetScore: 157000,
    starThresholds: [157000, 282600, 439600],
    unlockScoreRequired: 108150,
    skyColor: 15965202,
    fogColor: 15844367,
    ambientColor: 16777215,
    roadColor: 2899536,
    buildingColors: [15844367, 15105570, 16777215, 12436423],
    roofColor: 13849600,
    accentColor: 15158332,
    unlockedByDefault: false,
    population: 690000,
    exterminationTarget: 690000,
    mapCoords: { x: 29.4, y: 80.9 }
  },
  {
    id: 'lisbonne',
    name: 'Lisbonne',
    country: 'Portugal',
    countryFlag: '🇵🇹',
    emblem: '🇵🇹',
    monument: 'Tour de Belém & Pont du 25 Avril',
    subtitle: 'Tramway 28, Azulejos & Estuaire du Tage',
    typeTag: 'Collines, Tramways & Pont Suspendu',
    description: 'Dépassez les célèbres tramways jaunes gravissant les sept collines avant de traverser le géant rouge du Pont du 25 Avril !',
    targetScore: 159500,
    starThresholds: [159500, 287100, 446600],
    unlockScoreRequired: 109900,
    skyColor: 623843,
    fogColor: 7649791,
    ambientColor: 16777215,
    roadColor: 2962486,
    buildingColors: [16108921, 16242580, 16777215, 5533157],
    roofColor: 12597547,
    accentColor: 15844367,
    unlockedByDefault: false,
    population: 545000,
    exterminationTarget: 545000,
    mapCoords: { x: 24.8, y: 78.1 }
  },
  {
    id: 'casablanca',
    name: 'Casablanca',
    country: 'Maroc',
    countryFlag: '🇲🇦',
    emblem: '🇲🇦',
    monument: 'Mosquée Hassan II & Océan Atlantique',
    subtitle: 'Minaret Géant sur l’Eau & Corniche d’Aïn Diab',
    typeTag: 'Minaret sur l’Eau & Corniche Océanique',
    description: 'Fendez la Corniche d’Aïn Diab battue par l’Atlantique sous les 210 mètres de marbre et de laser vert de la mosquée Hassan II !',
    targetScore: 162000,
    starThresholds: [162000, 291600, 453600],
    unlockScoreRequired: 111650,
    skyColor: 703971,
    fogColor: 4774907,
    ambientColor: 16777215,
    roadColor: 2240318,
    buildingColors: [16777215, 16697943, 1092740, 5727604],
    roofColor: 1092740,
    accentColor: 703971,
    unlockedByDefault: false,
    population: 3750000,
    exterminationTarget: 3750000,
    mapCoords: { x: 27.1, y: 88.5 }
  },
  {
    id: 'alger',
    name: 'Alger',
    country: 'Algérie',
    countryFlag: '🇩🇿',
    emblem: '🇩🇿',
    monument: 'Mémorial du Martyr & Baie d’Alger',
    subtitle: 'Alger la Blanche, Casbah & Palmiers Méditerranéens',
    typeTag: 'Façades Blanches & Mémorial Monumental',
    description: 'Foncez sur les boulevards maritimes d’Alger la Blanche sous les trois feuilles de palmier en béton armé du Mémorial du Martyr !',
    targetScore: 164500,
    starThresholds: [164500, 296100, 460600],
    unlockScoreRequired: 113400,
    skyColor: 53971,
    fogColor: 5546239,
    ambientColor: 16777215,
    roadColor: 2240318,
    buildingColors: [16777215, 13162213, 1092740, 3049182],
    roofColor: 1092740,
    accentColor: 53971,
    unlockedByDefault: false,
    population: 2980000,
    exterminationTarget: 2980000,
    mapCoords: { x: 42.7, y: 82.2 }
  },
  {
    id: 'annaba',
    name: 'Annaba',
    country: 'Algérie',
    countryFlag: '🇩🇿',
    emblem: '🇩🇿',
    monument: 'Basilique Saint-Augustin & Corniche',
    subtitle: 'L’Antique Hippone, Baie Rocheuse & Phare',
    typeTag: 'Corniche Rocheuse & Basilique',
    description: 'Traversez la corniche rocheuse de Ras El Hamra sous les coupoles byzantines de la basilique Saint-Augustin dominant la mer !',
    targetScore: 167000,
    starThresholds: [167000, 300600, 467600],
    unlockScoreRequired: 115150,
    skyColor: 3049182,
    fogColor: 8623527,
    ambientColor: 16777215,
    roadColor: 2240318,
    buildingColors: [16777215, 16697943, 15618643, 1092740],
    roofColor: 5727604,
    accentColor: 3049182,
    unlockedByDefault: false,
    population: 460000,
    exterminationTarget: 460000,
    mapCoords: { x: 49.7, y: 81.9 }
  },
  {
    id: 'tunis',
    name: 'Tunis',
    country: 'Tunisie',
    countryFlag: '🇹🇳',
    emblem: '🇹🇳',
    monument: 'Médina de Tunis & Ruines de Carthage',
    subtitle: 'Carthage, Minaret de la Zitouna & Sidi Bou Saïd',
    typeTag: 'Médina Historique & Bord de Mer',
    description: 'Enchaînez les virages entre les colonnes antiques de Carthage et les façades bleu et blanc surplombant le golfe de Tunis !',
    targetScore: 169500,
    starThresholds: [169500, 305100, 474600],
    unlockScoreRequired: 116900,
    skyColor: 623843,
    fogColor: 7649791,
    ambientColor: 16777215,
    roadColor: 2962486,
    buildingColors: [16777215, 7649791, 16180621, 16742005],
    roofColor: 623843,
    accentColor: 15420747,
    unlockedByDefault: false,
    population: 1070000,
    exterminationTarget: 1070000,
    mapCoords: { x: 53.2, y: 82 }
  },
  {
    id: 'tripoli',
    name: 'Tripoli',
    country: 'Libye',
    countryFlag: '🇱🇾',
    emblem: '🇱🇾',
    monument: 'Château Rouge & Arc de Marc Aurèle',
    subtitle: 'La Mariée de la Méditerranée & Murailles de Pierre',
    typeTag: 'Forteresse Maritime & Palmiers',
    description: 'Foncez le long du front de mer méditerranéen dominé par les murailles ocre du Château Rouge et l’arc antique de Marc Aurèle !',
    targetScore: 172000,
    starThresholds: [172000, 309600, 481600],
    unlockScoreRequired: 118650,
    skyColor: 15965202,
    fogColor: 15844367,
    ambientColor: 16777215,
    roadColor: 2899536,
    buildingColors: [16242580, 16108921, 16777215, 15105570],
    roofColor: 13849600,
    accentColor: 2600544,
    unlockedByDefault: false,
    population: 1150000,
    exterminationTarget: 1150000,
    mapCoords: { x: 57.6, y: 89.8 }
  },
  {
    id: 'benghazi',
    name: 'Benghazi',
    country: 'Libye',
    countryFlag: '🇱🇾',
    emblem: '🇱🇾',
    monument: 'Phare de Benghazi & Baie Méditerranéenne',
    subtitle: 'Le Golfe de Syrte, Corniche & Palmiers Côtiers',
    typeTag: 'Corniche & Port de Mer',
    description: 'Dépassez la silhouette rayée de noir et blanc du grand phare sur la corniche ouverte sur les eaux chaudes du golfe de Syrte !',
    targetScore: 174500,
    starThresholds: [174500, 314100, 488600],
    unlockScoreRequired: 120400,
    skyColor: 15105570,
    fogColor: 15965202,
    ambientColor: 16777215,
    roadColor: 1976110,
    buildingColors: [16777215, 15965202, 13849600, 12436423],
    roofColor: 2899536,
    accentColor: 15105570,
    unlockedByDefault: false,
    population: 650000,
    exterminationTarget: 650000,
    mapCoords: { x: 67.7, y: 91.3 }
  },
  {
    id: 'le_caire',
    name: 'Le Caire',
    country: 'Égypte',
    countryFlag: '🇪🇬',
    emblem: '🇪🇬',
    monument: 'Pyramides de Gizeh & Nil Millénaire',
    subtitle: 'La Cité des Mille Minarets & Sphinx Éternel',
    typeTag: 'Pyramides Antiques & Bords du Nil',
    description: 'Terminez l’odyssée ultime sous le regard millénaire du Sphinx et des grandes pyramides de Gizeh bordant le Nil scintillant !',
    targetScore: 177000,
    starThresholds: [177000, 318600, 495600],
    unlockScoreRequired: 122150,
    skyColor: 15965202,
    fogColor: 16242580,
    ambientColor: 16777215,
    roadColor: 2899536,
    buildingColors: [16108921, 15967875, 16775781, 16777215],
    roofColor: 12597547,
    accentColor: 16765738,
    unlockedByDefault: false,
    population: 10000000,
    exterminationTarget: 10000000,
    mapCoords: { x: 84.2, y: 95.3 }
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
    maxSpeed: 17.5,
    accel: 8.5,
    steerSpeed: 14,
    accelProfile: 'heavy',
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
    maxSpeed: 36,
    accel: 25,
    steerSpeed: 23,
    accelProfile: 'supersonic',
    isFlyingCraft: true
  },
  {
    id: 'hovercraft',
    name: 'Hydro-Glisseur Vortex-Torpille 🌊',
    shortName: 'Hydro-Glisseur',
    category: 'AQUATIQUE & BARRAGE',
    icon: '🚤',
    tagline: 'Turbines Carénées & Lance-Torpilles',
    type: 'Aéroglisseur Fluvial d\'Assaut',
    description: 'Fini le bitume ! Conçu spécialement pour écumer les barrages, canaux fluviaux et lacs de retenue à 150 km/h sur coussin d\'air avec doubles hélices et lance-torpilles aquatiques.',
    speedRating: 5,
    handlingRating: 4,
    bounceRating: 5,
    cost: 3500,
    unlocked: true,
    scale: 1.2,
    maxSpeed: 27.5,
    accel: 16,
    steerSpeed: 20,
    accelProfile: 'glide',
    isHovercraft: true,
    terrainSpecialty: 'DAM'
  },
  {
    id: 'rad_rover',
    name: 'Blindé NRBC Rad-Buster 8x8 ☢️',
    shortName: 'Rover NRBC 8x8',
    category: 'DÉCONTAMINATION & CENTRALE',
    icon: '☣️',
    tagline: 'Blindage Plombé & Canon Ionique',
    type: 'Véhicule d\'Assaut Anti-Radiation',
    description: 'Armé pour résister aux pires irradiations des centrales nucléaires ! Châssis lourd 8x8 étanche, pare-buffle bélier, gyrophares orange et canon à impulsions ioniques perforantes.',
    speedRating: 4,
    handlingRating: 5,
    bounceRating: 5,
    cost: 4200,
    unlocked: true,
    scale: 1.25,
    maxSpeed: 21,
    accel: 12,
    steerSpeed: 17,
    accelProfile: 'heavy',
    isRadRover: true,
    terrainSpecialty: 'NUCLEAR'
  },
  {
    id: 'snowmobile',
    name: 'Motoneige Furieuse Alpine Yeti 🏔️',
    shortName: 'Motoneige Alpine',
    category: 'MONTAGNE & AVALANCHE',
    icon: '🛷',
    tagline: 'Skis Directeurs & Chenille Glace',
    type: 'Engin Chenillé Tout-Terrain',
    description: 'Fendez la poudreuse et les congères alpines à pleine vitesse ! Doubles patins avant en acier trempé, chenille arrière à crampons de tungstène et lance-roquettes sismiques pour provoquer l\'éboulement.',
    speedRating: 5,
    handlingRating: 5,
    bounceRating: 5,
    cost: 4500,
    unlocked: true,
    scale: 1.15,
    maxSpeed: 25,
    accel: 19,
    steerSpeed: 21,
    accelProfile: 'grip',
    isSnowmobile: true,
    terrainSpecialty: 'MOUNTAIN'
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
    maxSpeed: 14.5,
    accel: 14,
    steerSpeed: 25,
    accelProfile: 'peppy'
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
    maxSpeed: 22,
    accel: 13.5,
    steerSpeed: 15,
    accelProfile: 'torque'
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
    maxSpeed: 27,
    accel: 16.5,
    steerSpeed: 17,
    accelProfile: 'muscle'
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
    maxSpeed: 16,
    accel: 18,
    steerSpeed: 27,
    accelProfile: 'electric'
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
    maxSpeed: 19.5,
    accel: 17,
    steerSpeed: 23,
    accelProfile: 'gallop'
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
    maxSpeed: 16.5,
    accel: 20,
    steerSpeed: 29,
    accelProfile: 'sprint'
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
    maxSpeed: 16.5,
    accel: 20,
    steerSpeed: 28,
    accelProfile: 'sprint'
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
    maxSpeed: 13.5,
    accel: 6,
    steerSpeed: 11,
    accelProfile: 'titan'
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
    maxSpeed: 33,
    accel: 29,
    steerSpeed: 11,
    accelProfile: 'drag'
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
  "CARNAGE CRUISE SUPRÊME !"
];

export class GameState {
  constructor() {
    this.currentMode = 'SPLASH';
    this.selectedCity = CITIES[0];
    const savedBikeId = storage.getEquippedBike() || 'tank';
    this.selectedBike = BIKES.find(b => b.id === savedBikeId) || BIKES[0];

    this.score = 0;
    this.drivingScoreAccumulator = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.comboMax = 1;
    this.comboDecayBase = 3.8; // Base du timer de décroissance (accélère à chaque reset)
    this.comboDecayMin = 2.0;
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
    this.energyDrinkCans = 2; // Stock limité de 2 canettes pour la course (cheval / à pied)
    this.isRuinsMode = this.isRuinsMode || !!this.selectedCity?.isRuinsMode || (this.selectedCity?.id ? storage.isCityExterminated(this.selectedCity.id) : false);
    this.nitroDuration = 5.0; // Durée nitro standard




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
    const legacyMap = {
      'flamanville-nuc': 'cherbourg',
      'doel-nuc': 'anvers',
      'asco-nuc': 'saragosse',
      'tchernobyl': 'kiev',
      'grande-dixence': 'zurich'
    };
    const resolvedId = legacyMap[cityId] || cityId;
    const city = CITIES.find(c => c.id === resolvedId) || CITIES[0];
    this.selectedCity = city;
    storage.unlockCity(city.id);
    this.notify('city_selected', city);
    return true;
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
    this.comboDecayBase = 3.8;
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
    this.energyDrinkCans = 2; // Stock limité de 2 canettes pour la course (cheval / à pied)
    this.isRuinsMode = this.isRuinsMode || !!this.selectedCity?.isRuinsMode || (this.selectedCity?.id ? storage.isCityExterminated(this.selectedCity.id) : false);

    // Gestion des Cataclysmes & Modes d'Extermination Worldmageddon
    this.disasterType = this.selectedCity?.disasterType || (this.selectedCity?.isNuclearMission ? 'NUCLEAR' : (this.selectedCity?.isDamMission ? 'DAM' : (this.selectedCity?.isMountainMission ? 'MOUNTAIN' : 'STREET')));
    this.cataclysmDetonated = false;
    this.cataclysmPhase = (this.disasterType !== 'STREET') ? 'APPROACH' : null;
    this.cataclysmEscapeTimer = 22.0;

    // Rétrocompatibilité Mission Nucléaire
    this.nuclearPhase = this.disasterType === 'NUCLEAR' ? 'APPROACH' : null;
    this.nuclearEscapeTimer = 22.0;
    this.nuclearDetonated = false;

    // Démarrage : Reconnaissance immédiate en mode ruines ou compte à rebours 3, 2, 1, GO en course classique
    if (this.isRuinsMode) {
      this.currentMode = 'PLAYING';
      this.targetSpeed = 7.0; // Ballade tranquille à petite vitesse (25 km/h)
      this.speed = 7.0;
    } else {
      this.currentMode = 'COUNTDOWN';
    }

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
    let victims = this.selectedCity.population || this.selectedCity.exterminationTarget || 500000;
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
    const equippedBikeId = storage.getEquippedBike() || this.selectedBike?.id || 'tank';
    const isFootOrHorse = (equippedBikeId === 'cheval' || equippedBikeId === 'run_ak47' || equippedBikeId === 'run_chainsaw');
    if (isFootOrHorse) {
      // Pour cheval ou à pied : la boisson énergétique a un stock fini et n'est pas disponible tout le temps
      return;
    }
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

    const currentBikeId = storage.getEquippedBike() || this.selectedBike?.id || 'tank';
    const isFootOrHorse = (currentBikeId === 'cheval' || currentBikeId === 'run_ak47' || currentBikeId === 'run_chainsaw');

    if (isFootOrHorse) {
      // Pour cheval ou à pied : la boisson énergétique n'est pas disponible tout le temps (stock limité de canettes)
      if (this.energyDrinkCans <= 0) return false;
      this.energyDrinkCans--;
      this.isNitroActive = true;
      this.nitroTimer = this.nitroDuration;
      soundManager.playNitroBoost();
      this.notify('nitro_activated', { duration: this.nitroDuration, energyCans: this.energyDrinkCans });
      return true;
    }

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
    this.comboTimer = this.comboDecayBase;
    this.combo = Math.min(this.combo + 1, 10);
    this.comboMax = Math.max(this.comboMax, this.combo);
    // Accélération de la décroissance (Risk it all) : chaque kill accélère
    // le prochain reset du combo — plancher 2.0s pour rester jouable
    this.comboDecayBase = Math.max(this.comboDecayMin, this.comboDecayBase - 0.22);

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

    // Barème équilibré et gratifiant : 1 pièce par cible, 2 pièces si multi-kill / combo >= 3
    const coinsFromHit = (this.combo >= 3 ? 2 : 1);
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

    const nearMissPoints = 50 * this.combo;
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

    // 2. Mode Exploration Ruines : Ballade douce à petite vitesse sans compétition
    if (this.isRuinsMode) {
      const ruinsCruiseSpeed = 7.0;
      if (this.isBraking) {
        this.speed = Math.max(0, this.speed - delta * 15.0);
      } else {
        this.speed = Math.min(ruinsCruiseSpeed, this.speed + delta * 5.0);
      }
      this.distance += this.speed * delta;
      this.notify('stats_tick', {
        distance: Math.floor(this.distance),
        speed: Math.floor(this.speed * 3.6),
        score: this.score,
        targetScore: this.selectedCity.targetScore,
        scoreRatio: 1.0
      });
      return;
    }

    // 2b. Évolution dynamique de la vitesse selon le profil unique de chaque engin
    const maxSpeedCap = this.isNitroActive ? (this.targetSpeed * 1.35) : this.targetSpeed;
    let baseAccel = this.isNitroActive ? (this.selectedBike.accel * 1.6) : this.selectedBike.accel;

    if (this.isBraking) {
      // Décélération rapide jusqu'à l'arrêt complet
      this.speed = Math.max(0, this.speed - delta * 30.0);
    } else {
      const speedRatio = Math.max(0, Math.min(1.0, this.speed / Math.max(1, maxSpeedCap)));
      let curveFactor = 1.0;

      const profile = this.selectedBike.accelProfile || 'muscle';
      switch (profile) {
        case 'electric':
        case 'sprint':
        case 'peppy':
          // Couple immédiat à basse vitesse, s'adoucit à l'approche du plafond
          curveFactor = Math.max(0.35, 1.4 - speedRatio * 1.05);
          break;
        case 'drag':
        case 'supersonic':
          // Puissance phénoménale explosive soutenue
          curveFactor = Math.max(0.85, 1.6 - speedRatio * 0.4);
          break;
        case 'heavy':
        case 'titan':
          // Inertie colossale : départ progressif puis élan inarrêtable
          curveFactor = Math.max(0.45, 0.4 + speedRatio * 0.8);
          break;
        case 'torque':
        case 'muscle':
        case 'glide':
        case 'gallop':
        default:
          // Montée progressive avec crête de couple à mi-régime
          curveFactor = 0.75 + Math.sin(speedRatio * Math.PI) * 0.45;
          break;
      }

      const effectiveAccel = baseAccel * curveFactor;
      this.speed = Math.min(maxSpeedCap, this.speed + delta * effectiveAccel);
    }

    // Points de conduite continue arcade : rouler vite fait monter le score (doublé sous Nitro) !
    // LE SCORE N'AVANCE PAS À L'ARRÊT : Strictement si la vitesse > 3.5 m/s (~13 km/h), sans freinage et hors crash
    if (this.speed > 3.5 && !this.isBraking) {
      const nitroScoreMult = this.isNitroActive ? 2.0 : 1.0;
      this.drivingScoreAccumulator += this.speed * delta * 1.0 * nitroScoreMult;
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
        this.comboDecayBase = Math.min(3.8, this.comboDecayBase + 0.5); // récupération au reset
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
      energyCans: this.energyDrinkCans,
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
    soundManager.stopAllGameplaySounds(); // Coupe immédiatement tous les sons persistants de l'épreuve

    // Extermination proportionnelle à la vraie population de la métropole
    const cityPop = this.selectedCity.population || this.selectedCity.exterminationTarget || 500000;
    const carnageRatio = Math.min(1.0, Math.max(0.05, this.score / (this.selectedCity.targetScore || 2500)));
    const cityVictims = Math.round(cityPop * (this.cataclysmDetonated ? 1.0 : (carnageRatio * 0.15)));
    let runVictims = this.killsCount;
    this.worldPopulationEliminated += cityVictims;
    storage.incrementTotalKills(cityVictims);
    runVictims += cityVictims;

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

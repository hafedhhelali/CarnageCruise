/**
 * Motormageddon - TycoonManager.js
 * Moteur Économique & Tycoon de l'Apocalypse (Worldmageddon Tycoon)
 * 
 * Responsabilités :
 * - Gestion des 6 infrastructures clandestines d'extinction mondiale
 * - Calcul exponentiel des coûts et rendements avec paliers (Milestones)
 * - Calcul précis des gains passifs hors-ligne (Offline Earnings)
 * - Arbre de recherche technologique (4 branches)
 * - Synergies entre le pilotage actif (étoiles/cataclysmes) et la production passive
 * 
 * Conforme SOLID, Clean Code et zéro fuite mémoire.
 */

import { storage } from './Storage.js';

export const TYCOON_BUILDINGS = [
  {
    id: 'factory_arms',
    name: "Usine d'Armes Clandestine",
    icon: '🏭',
    tag: 'Production de Munitions & Béliers',
    baseCost: 100,
    baseCash: 0.01,
    baseKills: 0.5,
    lore: "Fabrication clandestine de munitions perforantes, éperons en acier trempé et renforts de châssis."
  },
  {
    id: 'intel_network',
    name: "Réseau d'Infiltrés Mondiaux",
    icon: '📡',
    tag: 'Corruption & Sabotage d’Urgence',
    baseCost: 1200,
    baseCash: 0.03,
    baseKills: 5,
    lore: "Piratage des lignes d'urgence, coupure des sirènes d'alerte urbaine et détournement de fonds."
  },
  {
    id: 'bio_lab',
    name: "Laboratoire de Neurotoxines",
    icon: '🧪',
    tag: 'Aérosols Incapacitants Urbains',
    baseCost: 15000,
    baseCash: 0.08,
    baseKills: 45,
    lore: "Synthèse d'agents chimiques diffusés dans la climatisation et les métros des capitales."
  },
  {
    id: 'drone_hive',
    name: "Ruche de Drones Autonomes",
    icon: '🛸',
    tag: 'Essaims IA à Basse Altitude',
    baseCost: 180000,
    baseCash: 0.22,
    baseKills: 420,
    lore: "Micro-drones tueurs guidés par algorithmes prédictifs pour traquer les fugitifs."
  },
  {
    id: 'missile_silo',
    name: "Silo Balistique Hypersonique",
    icon: '🚀',
    tag: 'Frappes de Croisière Mach 8',
    baseCost: 2500000,
    baseCash: 0.60,
    baseKills: 4800,
    lore: "Batteries de missiles hypersoniques balayant des corridors urbains entiers en quelques secondes."
  },
  {
    id: 'orbital_cannon',
    name: "Pulsar Orbital Stellaire",
    icon: '⚛️',
    tag: 'Faisceau d’Énergie Cinétique',
    baseCost: 40000000,
    baseCash: 1.5,
    baseKills: 65000,
    lore: "Satellite orbital concentrant des frappes cinétiques rasant des provinces pour achever les 8 milliards."
  }
];

export const RESEARCH_NODES = [
  // BRANCHE 1 : VITESSE & VÉHICULES
  {
    id: 'tech_nitro',
    branch: 'vehicles',
    name: 'Nitro Surpressurisée',
    icon: '🔥',
    desc: 'Prolonge la durée du boost Nitro de 5s à 8s en course.',
    cost: 500,
    unlockedByDefault: false
  },
  {
    id: 'tech_handling',
    branch: 'vehicles',
    name: 'Grip Céramique & Skis',
    icon: '🏎️',
    desc: '+25% de réactivité et maniabilité dans les virages serrés.',
    cost: 2500,
    unlockedByDefault: false
  },
  {
    id: 'tech_speed',
    branch: 'vehicles',
    name: 'Nitruration Moteur Titane',
    icon: '⚡',
    desc: '+15% de vitesse de pointe sur tous les véhicules.',
    cost: 12000,
    unlockedByDefault: false
  },
  // BRANCHE 2 : ARMEMENT LOURD
  {
    id: 'tech_ram',
    branch: 'weapons',
    name: 'Béliers Défonceurs',
    icon: '🛡️',
    desc: '+20% de points et pièces sur chaque véhicule heurté.',
    cost: 800,
    unlockedByDefault: false
  },
  {
    id: 'tech_plating',
    branch: 'weapons',
    name: 'Blindage Réactif d’Assaut',
    icon: '🪖',
    desc: 'Choc frontal réduit les pénalités de score de 60%.',
    cost: 4000,
    unlockedByDefault: false
  },
  {
    id: 'tech_shockwave',
    branch: 'weapons',
    name: 'Décharge Tellurique',
    icon: '💥',
    desc: 'Onde de choc pulvérisant les véhicules à proximité lors d’un virage au frein à main.',
    cost: 20000,
    unlockedByDefault: false
  },
  // BRANCHE 3 : CATACLYSMES MONDIAUX
  {
    id: 'tech_nuke_radius',
    branch: 'cataclysms',
    name: 'Cœur de Fission Enrichi',
    icon: '☢️',
    desc: 'Double les cibles éliminées lors de l’explosion de chaque centrale nucléaire.',
    cost: 5000,
    unlockedByDefault: false
  },
  {
    id: 'tech_dam_surge',
    branch: 'cataclysms',
    name: 'Cavitation Déflagrante',
    icon: '🌊',
    desc: 'Mégatsunami de barrage accéléré : double les pertes du déluge.',
    cost: 6500,
    unlockedByDefault: false
  },
  {
    id: 'tech_seismic_detonator',
    branch: 'cataclysms',
    name: 'Détonateurs Telluriques',
    icon: '🏔️',
    desc: 'Avalanche géante dévastatrice : double l’ampleur des éboulements.',
    cost: 8000,
    unlockedByDefault: false
  },
  // BRANCHE 4 : EMPIRE TYCOON
  {
    id: 'tech_synergy',
    branch: 'tycoon',
    name: 'Optimisation Logistique',
    icon: '📈',
    desc: '-15% sur le coût d’amélioration de tous les bâtiments Tycoon.',
    cost: 1500,
    unlockedByDefault: false
  },
  {
    id: 'tech_offline_8h',
    branch: 'tycoon',
    name: 'Générateurs Secours 8h',
    icon: '🔋',
    desc: 'Étend le plafond de production hors-ligne de 2h à 8h.',
    cost: 10000,
    unlockedByDefault: false
  },
  {
    id: 'tech_offline_24h',
    branch: 'tycoon',
    name: 'Autonomie Clandestine 24h',
    icon: '🌐',
    desc: 'Production hors-ligne active pendant 24 heures complètes.',
    cost: 50000,
    unlockedByDefault: false
  }
];

export class TycoonManager {
  constructor() {
    this.listeners = [];
    this.tickAccumulator = 0;
    this.lastSavedTimestamp = Date.now();
    this.initStorageDefaults();
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify(event, payload) {
    this.listeners.forEach(cb => {
      try {
        cb(event, payload);
      } catch (err) {
        console.error('TycoonManager listener error:', err);
      }
    });
  }

  initStorageDefaults() {
    if (!storage.data.tycoon) {
      storage.data.tycoon = {
        buildings: {
          factory_arms: 1, // Bâtiment 1 offert au niveau 1
          intel_network: 0,
          bio_lab: 0,
          drone_hive: 0,
          missile_silo: 0,
          orbital_cannon: 0
        },
        researchUnlocked: [],
        lastTimestamp: Date.now(),
        totalTycoonCashEarned: 0,
        totalTycoonKillsEarned: 0
      };
      storage.save();
    } else {
      // Vérifier que tous les bâtiments existent
      TYCOON_BUILDINGS.forEach(b => {
        if (storage.data.tycoon.buildings[b.id] === undefined) {
          storage.data.tycoon.buildings[b.id] = (b.id === 'factory_arms') ? 1 : 0;
        }
      });
      if (!Array.isArray(storage.data.tycoon.researchUnlocked)) {
        storage.data.tycoon.researchUnlocked = [];
      }
      if (!storage.data.tycoon.lastTimestamp) {
        storage.data.tycoon.lastTimestamp = Date.now();
      }
    }
  }

  // --- FORMULES ÉCONOMIQUES TYCOON ---

  getBuildingLevel(buildingId) {
    return (storage.data.tycoon?.buildings && storage.data.tycoon.buildings[buildingId]) || 0;
  }

  getCostMultiplier() {
    // Réduction de coût si la tech 'tech_synergy' est débloquée
    if (this.isResearchUnlocked('tech_synergy')) return 0.85;
    return 1.0;
  }

  getUpgradeCost(buildingId) {
    const building = TYCOON_BUILDINGS.find(b => b.id === buildingId);
    if (!building) return Infinity;
    const currentLvl = this.getBuildingLevel(buildingId);
    const rawCost = building.baseCost * Math.pow(1.15, currentLvl);
    return Math.floor(rawCost * this.getCostMultiplier());
  }

  getMilestoneMultiplier(level) {
    if (level >= 500) return 25;
    if (level >= 200) return 10;
    if (level >= 100) return 5;
    if (level >= 50) return 3;
    if (level >= 25) return 2;
    return 1;
  }

  getBuildingRates(buildingId) {
    const building = TYCOON_BUILDINGS.find(b => b.id === buildingId);
    if (!building) return { cashPerSec: 0, killsPerSec: 0 };
    const level = this.getBuildingLevel(buildingId);
    if (level <= 0) return { cashPerSec: 0, killsPerSec: 0 };

    const milestone = this.getMilestoneMultiplier(level);
    const cashRate = building.baseCash * level * milestone;
    const killsRate = building.baseKills * level * milestone;

    return { cashPerSec: cashRate, killsPerSec: killsRate };
  }

  getTotalRates() {
    let totalCash = 0;
    let totalKills = 0;

    TYCOON_BUILDINGS.forEach(b => {
      const rates = this.getBuildingRates(b.id);
      totalCash += rates.cashPerSec;
      totalKills += rates.killsPerSec;
    });

    // Synergie avec les étoiles de course : +5% par étoile remportée !
    const starsCount = this.getTotalStarsCount();
    const starMultiplier = 1.0 + (starsCount * 0.05);

    totalCash *= starMultiplier;
    totalKills *= starMultiplier;

    return {
      cashPerSec: Math.floor(totalCash * 10) / 10,
      killsPerSec: Math.floor(totalKills * 10) / 10,
      starBonusPct: Math.round(starsCount * 5)
    };
  }

  getTotalStarsCount() {
    if (!storage.data.cityScores) return 0;
    let stars = 0;
    Object.values(storage.data.cityScores).forEach(scoreDef => {
      if (scoreDef && typeof scoreDef === 'object' && scoreDef.stars) {
        stars += scoreDef.stars;
      }
    });
    return stars;
  }

  // --- AMÉLIORATION DES BÂTIMENTS ---

  upgradeBuilding(buildingId) {
    const cost = this.getUpgradeCost(buildingId);
    const currentCoins = storage.data.coins || 0;

    if (currentCoins < cost) {
      return { success: false, reason: "Fonds insuffisants !" };
    }

    // Déduire les pièces
    storage.data.coins -= cost;
    storage.data.tycoon.buildings[buildingId] = this.getBuildingLevel(buildingId) + 1;
    storage.save();

    const newLevel = storage.data.tycoon.buildings[buildingId];
    this.notify('building_upgraded', { buildingId, newLevel, cost });
    return { success: true, newLevel };
  }

  // --- RECHERCHE TECHNOLOGIQUE ---

  isResearchUnlocked(techId) {
    return Array.isArray(storage.data.tycoon?.researchUnlocked) &&
           storage.data.tycoon.researchUnlocked.includes(techId);
  }

  unlockResearch(techId) {
    const node = RESEARCH_NODES.find(n => n.id === techId);
    if (!node) return { success: false, reason: "Technologie inexistante." };
    if (this.isResearchUnlocked(techId)) return { success: false, reason: "Déjà débloquée." };

    const cost = node.cost;
    const currentCoins = storage.data.coins || 0;
    if (currentCoins < cost) {
      return { success: false, reason: "Fonds insuffisants !" };
    }

    storage.data.coins -= cost;
    if (!storage.data.tycoon.researchUnlocked) storage.data.tycoon.researchUnlocked = [];
    storage.data.tycoon.researchUnlocked.push(techId);
    storage.save();

    this.notify('research_unlocked', { techId, node });
    return { success: true, tech: node };
  }

  // --- CALCUL DES GAINS HORS-LIGNE (OFFLINE IDLE) ---

  getMaxOfflineHours() {
    if (this.isResearchUnlocked('tech_offline_24h')) return 24;
    if (this.isResearchUnlocked('tech_offline_8h')) return 8;
    return 2; // 2 heures de base
  }

  checkOfflineEarnings() {
    const lastTime = storage.data.tycoon?.lastTimestamp || Date.now();
    const now = Date.now();
    const elapsedSeconds = Math.max(0, (now - lastTime) / 1000);

    // Seuil minimal d'absence : 60 secondes
    if (elapsedSeconds < 60) {
      // Mettre à jour l'horodatage en continu
      storage.data.tycoon.lastTimestamp = now;
      return null;
    }

    const maxSeconds = this.getMaxOfflineHours() * 3600;
    const creditedSeconds = Math.min(elapsedSeconds, maxSeconds);
    const rates = this.getTotalRates();

    // Barème équilibré : pièces hors-ligne proportionnées évitant l'inflation démesurée
    const rawCash = rates.cashPerSec * creditedSeconds;
    const cashEarned = Math.min(300, Math.floor(rawCash * 0.45));
    const killsEarned = Math.floor(rates.killsPerSec * creditedSeconds);

    if (cashEarned <= 0 && killsEarned <= 0) {
      storage.data.tycoon.lastTimestamp = now;
      return null;
    }

    return {
      elapsedSeconds,
      creditedSeconds,
      maxHours: this.getMaxOfflineHours(),
      cashEarned,
      killsEarned,
      isCapped: elapsedSeconds > maxSeconds
    };
  }

  collectOfflineEarnings(earnings, doubleMultiplier = false) {
    if (!earnings) return;
    const factor = doubleMultiplier ? 2 : 1;
    const cash = earnings.cashEarned * factor;
    const kills = earnings.killsEarned * factor;

    storage.addCoins(cash);
    storage.recordCataclysmKill(kills, 'STREET'); // Incrémente le Worldmageddon global

    if (!storage.data.tycoon.totalTycoonCashEarned) storage.data.tycoon.totalTycoonCashEarned = 0;
    if (!storage.data.tycoon.totalTycoonKillsEarned) storage.data.tycoon.totalTycoonKillsEarned = 0;
    storage.data.tycoon.totalTycoonCashEarned += cash;
    storage.data.tycoon.totalTycoonKillsEarned += kills;

    storage.data.tycoon.lastTimestamp = Date.now();
    storage.save();

    this.notify('offline_collected', { cash, kills, doubled: doubleMultiplier });
  }

  // --- TICK TEMPS RÉEL (APPELÉ PAR LE CYCLE DE JEU) ---

  tick(deltaSeconds) {
    this.tickAccumulator += deltaSeconds;

    // Accumulation et versement par tranche de 1 seconde
    if (this.tickAccumulator >= 1.0) {
      const fullSeconds = Math.floor(this.tickAccumulator);
      this.tickAccumulator -= fullSeconds;

      const rates = this.getTotalRates();
      const cashGain = Math.floor(rates.cashPerSec * fullSeconds);
      const killsGain = Math.floor(rates.killsPerSec * fullSeconds);

      if (cashGain > 0 || killsGain > 0) {
        if (cashGain > 0) storage.addCoins(cashGain);
        if (killsGain > 0) storage.recordCataclysmKill(killsGain, 'STREET');

        storage.data.tycoon.lastTimestamp = Date.now();
        
        // Sauvegarder sur disque toutes les 15 secondes pour éviter le disk thrashing
        if (Date.now() - this.lastSavedTimestamp >= 15000) {
          this.lastSavedTimestamp = Date.now();
          storage.save();
        }

        this.notify('tycoon_tick', { rates, cashGain, killsGain });
      }
    }
  }
}

export const tycoonManager = new TycoonManager();

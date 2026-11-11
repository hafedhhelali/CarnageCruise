/**
 * Motormageddon - Missions quotidiennes & calendrier de connexion (rétention D1-D7).
 * État persisté dans storage.data ; aucune dépendance réseau.
 */

import { storage } from './Storage.js';

// --- POOL DE MISSIONS (critères mesurables pendant un run) ---
// type: 'kill' | 'nearMiss' | 'combo' | 'redLight' | 'distance' | 'airTime' | 'run' | 'coins'
export const MISSION_POOL = [
  { id: 'kill_50',       type: 'kill',      target: 50,   label: 'Écraser 50 piétons',           reward: 60 },
  { id: 'kill_120',      type: 'kill',      target: 120,  label: 'Carnage : 120 cibles',         reward: 120 },
  { id: 'nearmiss_8',    type: 'nearMiss',  target: 8,    label: '8 frôlements à pleine vitesse',  reward: 70 },
  { id: 'combo_15',      type: 'combo',     target: 15,   label: 'Combo x15',                    reward: 80 },
  { id: 'combo_30',      type: 'combo',     target: 30,   label: 'Combo x30 (« La Vague »)',      reward: 150 },
  { id: 'redlight_3',    type: 'redLight',  target: 3,    label: 'Griller 3 feux rouges',        reward: 60 },
  { id: 'distance_2000', type: 'distance',  target: 2000, label: 'Parcourir 2 000 m',            reward: 50 },
  { id: 'distance_4500', type: 'distance',  target: 4500, label: 'Marathon : 4 500 m',           reward: 110 },
  { id: 'airtime_3',     type: 'airTime',   target: 3,    label: '3 sauts sur dos d\'âne',        reward: 60 },
  { id: 'run_3',         type: 'run',       target: 3,    label: 'Terminer 3 courses',           reward: 90 },
  { id: 'run_1',         type: 'run',       target: 1,    label: 'Terminer 1 course',            reward: 30 },
  { id: 'coins_150',     type: 'coins',     target: 150,  label: 'Encaisser 150 pièces',         reward: 40 },
  { id: 'nitro_5',       type: 'nitro',     target: 5,    label: 'Activer le Nitro 5 fois',      reward: 50 },
  { id: 'prop_10',       type: 'prop',      target: 10,   label: 'Broyer 10 props urbains',      reward: 60 },
  { id: 'killstreak_5',  type: 'killStreak',target: 5,    label: 'Série de 5 kills d\'affilée',   reward: 70 }
];

const MISSIONS_PER_DAY = 3;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Sélection déterministe de 3 missions pour le jour, pondérée par la progression débloquée
function pickDailyIds(seed) {
  // pseudo-aléatoire stable par jour (pas de Math.random non déterministe pour la cohérence)
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const pool = [...MISSION_POOL];
  const picked = [];
  const used = new Set();
  let cursor = h;
  while (picked.length < MISSIONS_PER_DAY && pool.length > 0) {
    cursor = (cursor * 1103515245 + 12345) >>> 0;
    const idx = cursor % pool.length;
    if (used.has(idx)) { pool.splice(idx, 1); continue; }
    used.add(idx);
    picked.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  return picked;
}

function ensureState() {
  if (!storage.data.dailyMissions) {
    storage.data.dailyMissions = { date: null, ids: [], progress: [], claimed: [] };
  }
  const s = storage.data.dailyMissions;
  if (!Array.isArray(s.ids)) s.ids = [];
  if (!Array.isArray(s.progress)) s.progress = [];
  if (!Array.isArray(s.claimed)) s.claimed = [];
  return s;
}

function resetForToday() {
  const s = ensureState();
  const today = todayKey();
  if (s.date === today && s.ids.length === MISSIONS_PER_DAY) return s;
  const ids = pickDailyIds(today);
  s.date = today;
  s.ids = ids;
  s.progress = ids.map(() => 0);
  s.claimed = ids.map(() => false);
  storage.save();
  return s;
}

export const dailyMissions = {
  get state() { return resetForToday(); },

  list() {
    const s = resetForToday();
    return s.ids.map((id, i) => {
      const def = MISSION_POOL.find(m => m.id === id);
      return { ...def, progress: s.progress[i], claimed: s.claimed[i], slot: i };
    });
  },

  /** Avance une mission par type. amount = delta (kills, distance en m, etc.) */
  advance(type, amount = 1) {
    const s = resetForToday();
    let changed = false;
    s.ids.forEach((id, i) => {
      const def = MISSION_POOL.find(m => m.id === id);
      if (!def || def.type !== type || s.claimed[i]) return;
      s.progress[i] = Math.min(def.target, s.progress[i] + amount);
      changed = true;
    });
    if (changed) storage.save();
  },

  claim(slot) {
    const s = resetForToday();
    if (slot < 0 || slot >= s.ids.length) return 0;
    if (s.claimed[slot]) return 0;
    const def = MISSION_POOL.find(m => m.id === s.ids[slot]);
    if (!def || s.progress[slot] < def.target) return 0;
    s.claimed[slot] = true;
    storage.addCoins(def.reward);
    storage.save();
    return def.reward;
  },

  allClaimed() {
    const s = resetForToday();
    return s.claimed.every(Boolean);
  },

  // Raccourcis appelés depuis main.js / GameState
  onKill() { this.advance('kill', 1); },
  onNearMiss() { this.advance('nearMiss', 1); },
  onCombo(combo) { this.advance('combo', 0); /* géré par bestCombo */ },
  onBestCombo(combo) {
    const s = resetForToday();
    s.ids.forEach((id, i) => {
      const def = MISSION_POOL.find(m => m.id === id);
      if (!def || def.type !== 'combo' || s.claimed[i]) return;
      if (combo >= def.target) s.progress[i] = def.target;
    });
    storage.save();
  },
  onRedLight() { this.advance('redLight', 1); },
  onDistance(meters) { this.advance('distance', meters); },
  onAirTime() { this.advance('airTime', 1); },
  onRunComplete() { this.advance('run', 1); },
  onCoins(amount) { this.advance('coins', amount); },
  onNitro() { this.advance('nitro', 1); },
  onPropSmash() { this.advance('prop', 1); },
  onKillStreak(streak) {
    const s = resetForToday();
    s.ids.forEach((id, i) => {
      const def = MISSION_POOL.find(m => m.id === id);
      if (!def || def.type !== 'killStreak' || s.claimed[i]) return;
      if (streak >= def.target) s.progress[i] = def.target;
    });
    storage.save();
  }
};

// --- CALENDRIER DE CONNEXION (streak 7 jours) ---
const LOGIN_REWARDS = [
  { day: 1, coins: 20,  label: 'J1 — 20 pièces' },
  { day: 2, coins: 30,  label: 'J2 — 30 pièces' },
  { day: 3, coins: 50,  label: 'J3 — 50 pièces + Nitro x2', nitro: 2 },
  { day: 4, coins: 60,  label: 'J4 — 60 pièces' },
  { day: 5, coins: 80,  label: 'J5 — 80 pièces' },
  { day: 6, coins: 100, label: 'J6 — 100 pièces' },
  { day: 7, coins: 250, label: 'J7 — 250 pièces + 1 booster', booster: true }
];

function ensureLoginStreak() {
  if (!storage.data.loginStreak) {
    storage.data.loginStreak = { lastClaim: null, streak: 0, claimedToday: false };
  }
  return storage.data.loginStreak;
}

export const loginStreak = {
  get state() { return ensureLoginStreak(); },

  /** Retourne true si une récompense est à réclamer aujourd'hui */
  canClaim() {
    const s = ensureLoginStreak();
    const today = todayKey();
    if (s.lastClaim === today) return false;
    return true;
  },

  /** Réclame la récompense du jour. Retourne { day, coins, label, ... } ou null */
  claim() {
    const s = ensureLoginStreak();
    const today = todayKey();
    if (s.lastClaim === today) return null;

    // Streak : si hier claimé, on incrémente ; sinon reset à 1
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (s.lastClaim === yKey) {
      s.streak = Math.min(7, s.streak + 1);
    } else {
      s.streak = 1;
    }
    s.lastClaim = today;
    s.claimedToday = true;

    const day = s.streak;
    const reward = LOGIN_REWARDS[day - 1];
    storage.addCoins(reward.coins);
    if (reward.nitro) {
      // Crédit de canettes énergie pour les engins à pied/cheval
      storage.data.energyDrinkCans = (storage.data.energyDrinkCans || 0) + reward.nitro;
    }
    storage.save();
    return { day, ...reward };
  },

  /** Jour actuel du streak (1..7) */
  currentDay() {
    const s = ensureLoginStreak();
    return s.streak || 0;
  },

  /** Récompense du jour à afficher (sans claim) */
  todayReward() {
    const s = ensureLoginStreak();
    const day = s.lastClaim === todayKey() ? s.streak : Math.min(7, (s.streak || 0) + 1);
    return LOGIN_REWARDS[day - 1];
  }
};
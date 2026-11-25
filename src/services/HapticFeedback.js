/**
 * Carnage Cruise - Service Haptique Ultra-Léger (Zéro Dépendance)
 * Fournit un retour tactile déterministe et subtil sur Android/iOS (Web & Capacitor)
 */
import { storage } from '../core/Storage.js';

export const Haptic = {
  isSupported: typeof navigator !== 'undefined' && 'vibrate' in navigator,

  get enabled() {
    return storage?.data?.settings?.vibration !== false;
  },

  set enabled(val) {
    if (storage?.updateSettings) {
      storage.updateSettings({ vibration: !!val });
    }
  },

  // Clic net et sec pour boutons de menu et interactions standard
  tap() {
    if (this.isSupported && this.enabled) {
      try { navigator.vibrate(8); } catch (e) {}
    }
  },

  // Impact léger (frôlement, petit obstacle, dos d'âne)
  impactLight() {
    if (this.isSupported && this.enabled) {
      try { navigator.vibrate(14); } catch (e) {}
    }
  },

  // Déflagration lourde, tir de canon 120mm ou carambolage
  impactHeavy() {
    if (this.isSupported && this.enabled) {
      try { navigator.vibrate([24, 18, 36]); } catch (e) {}
    }
  },

  // Succès, amélioration d'engin ou récompense pièces d'or
  success() {
    if (this.isSupported && this.enabled) {
      try { navigator.vibrate([12, 28, 18]); } catch (e) {}
    }
  },

  // Série de carnage ou frappe WMD
  carnage() {
    if (this.isSupported && this.enabled) {
      try { navigator.vibrate([18, 12, 35, 15, 50]); } catch (e) {}
    }
  }
};

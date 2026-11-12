/**
 * Carnage Cruise - Gestionnaire de Publicités & Récompenses (AdManager)
 * Simulateur de publicités récompensées et interstitielles haute fidélité pour arcade mobile :
 * - +20 Pièces gratuites (Rewarded Video)
 * - Recharge instantanée Nitro 5s (Rewarded Video)
 * - Publicité de transition lors du passage d'une nouvelle ville (Interstitial)
 */

import { storage } from '../core/Storage.js';
import { gameState } from '../core/GameState.js';
import { soundManager } from '../audio/SoundManager.js';
import { cookieConsentManager } from './CookieConsentManager.js';

const REAL_GOOGLE_ADS = [
  {
    brand: "Google Pixel 9 Pro",
    advertiser: "Google Store",
    displayUrl: "store.google.com/pixel",
    destinationUrl: "https://store.google.com",
    tagline: "Le smartphone le plus puissant conçu par Google avec l'IA Gemini intégrée et téléobjectif pro.",
    cta: "Découvrir sur le Google Store ↗",
    badge: "Annonce Google Ads",
    color: "#4285f4",
    icon: "📱",
    bgGrad: "linear-gradient(135deg, #1a73e8, #0d47a1)"
  },
  {
    brand: "Google Cloud Platform",
    advertiser: "Google Cloud",
    displayUrl: "cloud.google.com/vertex-ai",
    destinationUrl: "https://cloud.google.com",
    tagline: "Accélérez vos déploiements d'IA à l'échelle mondiale avec Vertex AI et 300 $ de crédits offerts.",
    cta: "Démarrer l'essai gratuit ↗",
    badge: "Annonce Google Cloud",
    color: "#34a853",
    icon: "☁️",
    bgGrad: "linear-gradient(135deg, #1e8e3e, #0d652d)"
  },
  {
    brand: "YouTube Premium",
    advertiser: "YouTube",
    displayUrl: "youtube.com/premium",
    destinationUrl: "https://www.youtube.com/premium",
    tagline: "Toutes vos musiques et vidéos sans aucune coupure pub, en arrière-plan et hors connexion.",
    cta: "Essayer gratuitement ↗",
    badge: "Annonce YouTube Ads",
    color: "#ea4335",
    icon: "▶️",
    bgGrad: "linear-gradient(135deg, #d93025, #a50e0e)"
  },
  {
    brand: "Google Play Pass",
    advertiser: "Google Play",
    displayUrl: "play.google.com/pass",
    destinationUrl: "https://play.google.com",
    tagline: "Accédez à plus de 1 000 jeux et applications premium sans publicités ni micro-transactions.",
    cta: "Explorer le catalogue ↗",
    badge: "Annonce Google Play",
    color: "#fbbc04",
    icon: "🎮",
    bgGrad: "linear-gradient(135deg, #f29900, #b06000)"
  },
  {
    brand: "Google Workspace",
    advertiser: "Google Workspace",
    displayUrl: "workspace.google.com",
    destinationUrl: "https://workspace.google.com",
    tagline: "Gmail sécurisé, Drive professionnel, Meet et l'IA Gemini réunis dans une suite puissante.",
    cta: "Essayer 14 jours gratuits ↗",
    badge: "Annonce Google Ads",
    color: "#4285f4",
    icon: "💼",
    bgGrad: "linear-gradient(135deg, #1a73e8, #185abc)"
  }
];

export class AdManager {
  constructor() {
    this.adIndex = 0;
    /**
     * INTERRUPTEUR MAÎTRE DE MONÉTISATION.
     * false (état actuel) : AUCUNE publicité n'est affichée ni chargée —
     * les appels sont des no-ops silencieux qui n'écrasent pas l'UI.
     * true (futur) : réactive la chaîne Google Ads (récompenses, interstitiels,
     * consentement RGPD). Le pipeline complet est conservé ci-dessous.
     */
    this.ADS_ENABLED = false;
  }

  getNextAd() {
    const ad = REAL_GOOGLE_ADS[this.adIndex % REAL_GOOGLE_ADS.length];
    this.adIndex++;
    return ad;
  }

  /**
   * Lance une publicité récompensée Google Ads (+20 pièces ou Nitro plein).
   * ADS_ENABLED = false : pas de publicité — résolution immédiate et discrète,
   * sans overlay, sans badge « Annonce », sans compte à rebours.
   * Conforme RGPD, AdMob et Google Mobile Ads Standards quand réactivé.
   */
  showRewardedAd(type = 'COINS', onRewardCallback = null) {
    if (!this.ADS_ENABLED) {
      // Mode sans publicité : pas d'UI, pas de réseau, pas de consentement requis
      if (onRewardCallback) {
        onRewardCallback({ type, amount: type === 'COINS' ? 20 : 100, source: 'no-ad' });
      }
      return;
    }

    if (!cookieConsentManager.hasAnswered()) {
      cookieConsentManager.showConsentModal(false, () => {
        this.executeRewardedAd(type, onRewardCallback);
      });
      return;
    }

    this.executeRewardedAd(type, onRewardCallback);
  }

  executeRewardedAd(type = 'COINS', onRewardCallback = null) {
    if (!this.ADS_ENABLED) {
      // Garde-fou : ce chemin n'est atteignable que si ADS_ENABLED est réactivé
      if (onRewardCallback) {
        onRewardCallback({ type, amount: type === 'COINS' ? 20 : 100, source: 'no-ad' });
      }
      return;
    }
    const ad = this.getNextAd();
    const isCoins = type === 'COINS';
    const rewardTitle = isCoins ? '+20 PIÈCES 🪙' : 'NITRO PLEIN ⚡';

    soundManager.playClick();

    const overlay = document.createElement('div');
    overlay.className = 'ad-modal-overlay';
    overlay.innerHTML = `
      <div class="ad-modal-card google-ad-card">
        <div class="google-ad-top-bar">
          <div class="google-ad-badge-group">
            <span class="google-g-badge">G</span>
            <span class="ad-disclosure-text">Annonce • ${ad.displayUrl}</span>
          </div>
          <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" class="adchoices-pill" title="Gestion des préférences publicitaires Google">
            <span>AdChoices</span>
            <span class="adchoices-icon">ⓘ ▷</span>
          </a>
        </div>
        
        <div class="ad-sponsor-banner google-campaign-banner" style="background: ${ad.bgGrad};">
          <div class="ad-sponsor-icon">${ad.icon}</div>
          <div class="google-campaign-texts">
            <div class="google-advertiser-name">${ad.advertiser} <span class="verified-check">✓ Partenaire Google</span></div>
            <div class="ad-sponsor-brand">${ad.brand}</div>
            <div class="ad-sponsor-tagline">${ad.tagline}</div>
          </div>
        </div>

        <div class="google-ad-cta-row">
          <a href="${ad.destinationUrl}" target="_blank" rel="noopener noreferrer" class="btn-google-ad-cta">
            <span>${ad.cta}</span>
          </a>
        </div>

        <div class="ad-reward-preview">
          <span>Récompense Google Ads :</span>
          <strong class="ad-reward-pill">${rewardTitle}</strong>
        </div>

        <div class="ad-progress-container">
          <div class="ad-progress-bar" id="ad-progress"></div>
        </div>
        <div class="ad-countdown-text" id="ad-countdown">Validation de la récompense dans 4s...</div>

        <button class="ad-btn-skip" id="btn-ad-skip" disabled>
          <span>FERMER DANS 4s</span>
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const progressBar = overlay.querySelector('#ad-progress');
    const countdownText = overlay.querySelector('#ad-countdown');
    const skipBtn = overlay.querySelector('#btn-ad-skip');

    let secondsLeft = 4;
    progressBar.style.transition = 'width 4s linear';
    requestAnimationFrame(() => {
      progressBar.style.width = '100%';
    });

    const interval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        if (countdownText) countdownText.textContent = `Validation de la récompense dans ${secondsLeft}s...`;
        if (skipBtn) skipBtn.querySelector('span').textContent = `FERMER DANS ${secondsLeft}s`;
      } else {
        clearInterval(interval);
        if (countdownText) countdownText.textContent = `✨ Félicitations ! Récompense Google Ads validée !`;
        if (skipBtn) {
          skipBtn.disabled = false;
          skipBtn.classList.add('ready');
          skipBtn.querySelector('span').textContent = `RÉCUPÉRER ${rewardTitle} ✕`;
        }
      }
    }, 1000);

    const closeAndReward = () => {
      clearInterval(interval);
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }

      if (isCoins) {
        storage.addCoins(20);
        soundManager.playCoin();
      } else if (type === 'NITRO') {
        gameState.refillNitro();
        soundManager.playVictory();
      }

      if (onRewardCallback) {
        onRewardCallback({ type, amount: isCoins ? 20 : 100 });
      }
    };

    skipBtn.addEventListener('click', closeAndReward);
  }

  /**
   * Lance une publicité interstitielle Google Ads lors du passage d'étape.
   * ADS_ENABLED = false : transition directe sans aucun interstitiel.
   */
  showCityTransitionAd(city, onCompleteCallback) {
    if (!this.ADS_ENABLED) {
      // Mode sans publicité : entrée directe dans la ville
      if (onCompleteCallback) onCompleteCallback();
      return;
    }
    const ad = this.getNextAd();
    const overlay = document.createElement('div');
    overlay.className = 'ad-modal-overlay ad-transition-overlay';
    overlay.innerHTML = `
      <div class="ad-modal-card ad-card-transition google-ad-card">
        <div class="google-ad-top-bar">
          <div class="google-ad-badge-group">
            <span class="google-g-badge">G</span>
            <span class="ad-disclosure-text">Annonce • ${ad.displayUrl}</span>
          </div>
          <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" class="adchoices-pill">
            <span>AdChoices</span>
            <span class="adchoices-icon">ⓘ ▷</span>
          </a>
        </div>
        
        <div class="ad-sponsor-banner google-campaign-banner" style="background: ${ad.bgGrad};">
          <div class="ad-sponsor-icon">${ad.icon}</div>
          <div class="google-campaign-texts">
            <div class="google-advertiser-name">${ad.advertiser} <span class="verified-check">✓ Partenaire Google</span></div>
            <div class="ad-sponsor-brand">${ad.brand}</div>
            <div class="ad-sponsor-tagline">${ad.tagline}</div>
          </div>
        </div>

        <div class="google-ad-cta-row">
          <a href="${ad.destinationUrl}" target="_blank" rel="noopener noreferrer" class="btn-google-ad-cta">
            <span>${ad.cta}</span>
          </a>
        </div>

        <div style="margin: 14px 0; text-align: center;">
          <div style="font-size: 1.15rem; color: #fffa65; font-weight: 900;">
            ${city.countryFlag || '🌍'} Bienvenue en ${city.country ? city.country.toUpperCase() : 'Europe'} !
          </div>
          <div style="font-size: 0.82rem; color: #a4b0be; margin-top: 4px;">
            Préparation du départ pour <strong>${city.name.toUpperCase()}</strong>...
          </div>
        </div>

        <div class="ad-progress-container">
          <div class="ad-progress-bar" id="ad-transition-bar"></div>
        </div>

        <button class="ad-btn-skip ready" id="btn-ad-transition-skip">
          <span>ENTRER DANS LA VILLE (3s) ➔</span>
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const progressBar = overlay.querySelector('#ad-transition-bar');
    const skipBtn = overlay.querySelector('#btn-ad-transition-skip');

    progressBar.style.transition = 'width 3s linear';
    requestAnimationFrame(() => {
      progressBar.style.width = '100%';
    });

    let seconds = 3;
    const interval = setInterval(() => {
      seconds--;
      if (seconds > 0) {
        if (skipBtn) skipBtn.querySelector('span').textContent = `ENTRER DANS LA VILLE (${seconds}s) ➔`;
      } else {
        clearInterval(interval);
        finishTransition();
      }
    }, 1000);

    const finishTransition = () => {
      clearInterval(interval);
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      if (onCompleteCallback) onCompleteCallback();
    };

    skipBtn.addEventListener('click', finishTransition);
  }
}

export const adManager = new AdManager();

/**
 * Motormageddon - Gestionnaire de Publicités & Récompenses (AdManager)
 * Simulateur de publicités récompensées et interstitielles haute fidélité pour arcade mobile :
 * - +20 Pièces gratuites (Rewarded Video)
 * - Recharge instantanée Nitro 5s (Rewarded Video)
 * - Publicité de transition lors du passage d'une nouvelle ville (Interstitial)
 */

import { storage } from '../core/Storage.js';
import { gameState } from '../core/GameState.js';
import { soundManager } from '../audio/SoundManager.js';

const SPONSORS = [
  {
    brand: "⚡ NITRO OCTANE-X",
    tagline: "Le carburant des champions du bitume européen !",
    color: "#00d2d3",
    icon: "⚡",
    bgGrad: "linear-gradient(135deg, #0984e3, #00cec9)"
  },
  {
    brand: "🐎 LE FOUET D'OR RACING",
    tagline: "Équipements et sellerie de luxe pour motards intrépides",
    color: "#ffd700",
    icon: "👑",
    bgGrad: "linear-gradient(135deg, #f39c12, #d35400)"
  },
  {
    brand: "🏎️ MONTE-CARLO CASINO & TOURS",
    tagline: "Doublez vos gains sur les plus beaux circuits de la Méditerranée",
    color: "#ff4757",
    icon: "🪙",
    bgGrad: "linear-gradient(135deg, #e74c3c, #8e44ad)"
  },
  {
    brand: "🔧 MEGA-TUNING MOTORMAGEDDON",
    tagline: "Customisez vos bécanes, kalashnikovs et décapotables !",
    color: "#2ed573",
    icon: "🏍️",
    bgGrad: "linear-gradient(135deg, #27ae60, #2c3e50)"
  }
];

export class AdManager {
  constructor() {
    this.sponsorIndex = 0;
  }

  getNextSponsor() {
    const s = SPONSORS[this.sponsorIndex % SPONSORS.length];
    this.sponsorIndex++;
    return s;
  }

  /**
   * Lance une publicité récompensée (+20 pièces ou Nitro plein)
   */
  showRewardedAd(type = 'COINS', onRewardCallback = null) {
    const sponsor = this.getNextSponsor();
    const isCoins = type === 'COINS';
    const rewardTitle = isCoins ? '+20 PIÈCES 🪙' : 'NITRO PLEIN ⚡';

    soundManager.playClick();

    const overlay = document.createElement('div');
    overlay.className = 'ad-modal-overlay';
    overlay.innerHTML = `
      <div class="ad-modal-card">
        <div class="ad-modal-badge">📺 PUBLICITÉ RÉCOMPENSÉE • SPONSOR OFFICIEL</div>
        
        <div class="ad-sponsor-banner" style="background: ${sponsor.bgGrad};">
          <div class="ad-sponsor-icon">${sponsor.icon}</div>
          <div class="ad-sponsor-brand">${sponsor.brand}</div>
          <div class="ad-sponsor-tagline">${sponsor.tagline}</div>
        </div>

        <div class="ad-reward-preview">
          <span>Récompense à l'arrivée :</span>
          <strong class="ad-reward-pill">${rewardTitle}</strong>
        </div>

        <div class="ad-progress-container">
          <div class="ad-progress-bar" id="ad-progress"></div>
        </div>
        <div class="ad-countdown-text" id="ad-countdown">Récompense validée dans 4s...</div>

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
        if (countdownText) countdownText.textContent = `Récompense validée dans ${secondsLeft}s...`;
        if (skipBtn) skipBtn.querySelector('span').textContent = `FERMER DANS ${secondsLeft}s`;
      } else {
        clearInterval(interval);
        if (countdownText) countdownText.textContent = `✨ Félicitations ! Récompense accordée !`;
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
   * Lance une publicité interstitielle courte lors du passage à une nouvelle ville
   */
  showCityTransitionAd(city, onCompleteCallback) {
    const sponsor = this.getNextSponsor();
    const overlay = document.createElement('div');
    overlay.className = 'ad-modal-overlay ad-transition-overlay';
    overlay.innerHTML = `
      <div class="ad-modal-card ad-card-transition">
        <div class="ad-modal-badge">📺 SPONSOR DU GRAND TOUR D'EUROPE</div>
        
        <div class="ad-sponsor-banner" style="background: ${sponsor.bgGrad};">
          <div class="ad-sponsor-icon">🏁</div>
          <div class="ad-sponsor-brand">PASSAGE VERS ${city.name.toUpperCase()}</div>
          <div class="ad-sponsor-tagline">Présenté par ${sponsor.brand} : ${sponsor.tagline}</div>
        </div>

        <div style="margin: 16px 0; text-align: center;">
          <div style="font-size: 1.15rem; color: #fffa65; font-weight: 900;">
            ${city.countryFlag || '🌍'} Bienvenue en ${city.country ? city.country.toUpperCase() : 'Europe'} !
          </div>
          <div style="font-size: 0.82rem; color: #a4b0be; margin-top: 4px;">
            Nouvelle étape prête au départ. Bonne course !
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

/**
 * Motormageddon - Gestionnaire d'Interface Utilisateur (UIManager)
 * Écran titre, Carte de France interactive stylisée, Garage, HUD, Résultats et Modales.
 */

import { gameState, CITIES, BIKES } from '../core/GameState.js';
import { storage } from '../core/Storage.js';
import { soundManager } from '../audio/SoundManager.js';

export class UIManager {
  constructor(rootElement, onActionCallback) {
    this.root = rootElement;
    this.onAction = onActionCallback;

    this.currentScreen = 'SPLASH'; // SPLASH, MAP, GARAGE, HUD, PAUSE, RESULTS, SETTINGS
    this.selectedMapCity = gameState.selectedCity;
    this.selectedGarageBike = gameState.selectedBike;

    this.init();
    this.bindGameState();
  }

  init() {
    this.render();
  }

  bindGameState() {
    gameState.subscribe((event, data) => {
      if (event === 'score_updated') {
        this.updateHUDScore(data);
      } else if (event === 'stats_tick') {
        this.updateHUDStats(data);
      } else if (event === 'combo_reset') {
        this.resetHUDCombo();
      } else if (event === 'run_started') {
        this.setScreen('HUD');
      } else if (event === 'run_ended') {
        this.showResultsModal(data);
      } else if (event === 'city_unlocked') {
        this.showToastUnlock(data);
      }
    });
  }

  setScreen(screenName) {
    this.currentScreen = screenName;
    this.render();
  }

  render() {
    this.root.innerHTML = '';

    if (this.currentScreen === 'SPLASH') {
      this.renderSplashScreen();
    } else if (this.currentScreen === 'MAP') {
      this.renderMapScreen();
    } else if (this.currentScreen === 'GARAGE') {
      this.renderGarageScreen();
    } else if (this.currentScreen === 'HUD') {
      this.renderHUDScreen();
    }
  }

  // --- 1. ÉCRAN DE LANCEMENT (SPLASH SCREEN) ---
  renderSplashScreen() {
    const splash = document.createElement('div');
    splash.className = 'screen-splash interactive';

    splash.innerHTML = `
      <div class="logo-container">
        <h1 class="game-title">MOTORMAGEDDON</h1>
        <div class="game-subtitle">★ TOUR DE FRANCE ARCADE ★</div>
      </div>

      <div class="splash-footer">
        <button id="btn-splash-play" class="btn-arcade btn-play-pulse">
          <span>🚀 JOUER</span>
        </button>
        <div style="display: flex; gap: 12px;">
          <button id="btn-splash-garage" class="btn-arcade btn-secondary" style="font-size: 0.95rem; padding: 10px 20px;">
            <span>🏍️ GARAGE</span>
          </button>
          <button id="btn-splash-settings" class="btn-arcade btn-ghost" style="font-size: 0.95rem; padding: 10px 18px;">
            <span>⚙️ OPTIONS</span>
          </button>
        </div>
      </div>
    `;

    splash.querySelector('#btn-splash-play').addEventListener('click', () => {
      soundManager.playClick();
      soundManager.resumeContext();
      this.setScreen('MAP');
    });

    splash.querySelector('#btn-splash-garage').addEventListener('click', () => {
      soundManager.playClick();
      this.setScreen('GARAGE');
    });

    splash.querySelector('#btn-splash-settings').addEventListener('click', () => {
      soundManager.playClick();
      this.showSettingsModal();
    });

    this.root.appendChild(splash);
  }

  // --- 2. CARTE INTERACTIVE DE LA FRANCE ---
  renderMapScreen() {
    const mapScreen = document.createElement('div');
    mapScreen.className = 'screen-map interactive';

    const coins = storage.data.coins;

    mapScreen.innerHTML = `
      <div class="map-header">
        <button id="btn-map-back" class="btn-arcade btn-ghost" style="padding: 8px 16px; font-size: 0.9rem;">
          ← RETOUR
        </button>
        <h2 class="map-title">ÉTAPES DU TOUR</h2>
        <div class="currency-badge">
          <span>🪙 ${coins}</span>
        </div>
      </div>

      <div class="france-map-svg-container" id="france-container">
        <!-- SVG stylisé de la France hexagonale -->
        <svg class="france-svg" viewBox="0 0 500 450">
          <path d="M 120 40 L 320 30 L 440 100 L 470 240 L 380 410 L 260 430 L 140 400 L 60 280 L 40 160 Z"
                fill="#2c3e50" stroke="#34495e" stroke-width="4" />
          <path d="M 80 150 Q 140 110 240 130 T 400 110" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2" stroke-dasharray="5,5" />
          <path d="M 240 130 Q 300 240 350 360" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2" stroke-dasharray="5,5" />
        </svg>

        <!-- Pins interactifs des villes de France -->
        ${CITIES.map(city => {
          const unlocked = storage.isCityUnlocked(city.id);
          const cityData = storage.getCityData(city.id);
          const isSelected = this.selectedMapCity.id === city.id;

          return `
            <div class="city-pin ${unlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}"
                 data-city-id="${city.id}"
                 style="left: ${city.mapCoords.x}%; top: ${city.mapCoords.y}%;">
              <div class="city-pin-dot">
                ${unlocked ? '★' : '🔒'}
              </div>
              <div class="city-pin-label">${city.name}</div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="city-detail-card" id="city-detail">
        <!-- Rempli dynamiquement -->
      </div>
    `;

    // Attacher événements sur les pins de ville
    const pins = mapScreen.querySelectorAll('.city-pin');
    pins.forEach(pin => {
      pin.addEventListener('click', () => {
        const cityId = pin.getAttribute('data-city-id');
        const city = CITIES.find(c => c.id === cityId);
        if (city) {
          soundManager.playClick();
          this.selectedMapCity = city;
          pins.forEach(p => p.classList.remove('selected'));
          pin.classList.add('selected');
          this.updateCityDetail(mapScreen.querySelector('#city-detail'));
        }
      });
    });

    mapScreen.querySelector('#btn-map-back').addEventListener('click', () => {
      soundManager.playClick();
      this.setScreen('SPLASH');
    });

    this.root.appendChild(mapScreen);
    this.updateCityDetail(mapScreen.querySelector('#city-detail'));
  }

  updateCityDetail(detailCard) {
    const city = this.selectedMapCity;
    const unlocked = storage.isCityUnlocked(city.id);
    const cityData = storage.getCityData(city.id);

    const starsHtml = '★'.repeat(cityData.stars) + '☆'.repeat(3 - cityData.stars);

    detailCard.innerHTML = `
      <div class="city-detail-header">
        <div>
          <span class="city-detail-name">${city.name}</span>
          <span class="city-detail-subtitle"> — ${city.subtitle}</span>
        </div>
        <div class="city-stars">${starsHtml}</div>
      </div>

      <p class="city-description">${city.description}</p>

      <div class="city-target-info">
        <span>🏆 Record : <strong>${cityData.bestScore} pts</strong></span>
        <span>🎯 Objectif ville : <strong>${city.targetScore} pts</strong></span>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 6px;">
        ${unlocked ? `
          <button id="btn-launch-city" class="btn-arcade" style="flex: 1;">
            🏁 ROULER DANS ${city.name.toUpperCase()} !
          </button>
        ` : `
          <button class="btn-arcade btn-ghost" style="flex: 1; cursor: not-allowed;" disabled>
            🔒 DÉVERROUILLER À ${city.unlockScoreRequired} PTS
          </button>
        `}
        <button id="btn-quick-garage" class="btn-arcade btn-secondary" style="padding: 12px 18px;">
          🏍️
        </button>
      </div>
    `;

    if (unlocked) {
      detailCard.querySelector('#btn-launch-city').addEventListener('click', () => {
        soundManager.playClick();
        gameState.selectCity(city.id);
        if (this.onAction) this.onAction('START_RUN', city);
      });
    }

    detailCard.querySelector('#btn-quick-garage').addEventListener('click', () => {
      soundManager.playClick();
      this.setScreen('GARAGE');
    });
  }

  // --- 3. GARAGE ET PERSONNALISATION ---
  renderGarageScreen() {
    const garage = document.createElement('div');
    garage.className = 'screen-garage interactive';

    const coins = storage.data.coins;
    const equippedBike = storage.getEquippedBike();

    garage.innerHTML = `
      <div class="garage-header">
        <button id="btn-garage-back" class="btn-arcade btn-ghost" style="padding: 8px 16px; font-size: 0.9rem;">
          ← RETOUR
        </button>
        <h2 style="font-size: 1.5rem; font-weight: 800;">LE GARAGE</h2>
        <div class="currency-badge">
          <span>🪙 ${coins}</span>
        </div>
      </div>

      <div class="garage-bottom-panel">
        <div class="bikes-tabs">
          ${BIKES.map(b => `
            <div class="bike-tab ${this.selectedGarageBike.id === b.id ? 'active' : ''}" data-bike-id="${b.id}">
              ${b.name.split(' ')[0]}
            </div>
          `).join('')}
        </div>

        <div id="garage-bike-info">
          <!-- Rempli dynamiquement -->
        </div>
      </div>
    `;

    // Événements onglets motos
    const tabs = garage.querySelectorAll('.bike-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const bikeId = tab.getAttribute('data-bike-id');
        const bike = BIKES.find(b => b.id === bikeId);
        if (bike) {
          soundManager.playClick();
          this.selectedGarageBike = bike;
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          if (this.onAction) this.onAction('PREVIEW_BIKE', bike);
          this.updateGarageBikeInfo(garage.querySelector('#garage-bike-info'));
        }
      });
    });

    garage.querySelector('#btn-garage-back').addEventListener('click', () => {
      soundManager.playClick();
      this.setScreen('MAP');
    });

    this.root.appendChild(garage);
    this.updateGarageBikeInfo(garage.querySelector('#garage-bike-info'));
  }

  updateGarageBikeInfo(container) {
    const bike = this.selectedGarageBike;
    const isUnlocked = storage.data.unlockedBikes.includes(bike.id);
    const isEquipped = storage.getEquippedBike() === bike.id;
    const currentColor = storage.getBikeColor(bike.id);

    const colors = ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6', '#1abc9c', '#34495e'];

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <div>
          <h3 style="font-size: 1.3rem; font-weight: 800; color: #fff;">${bike.name}</h3>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${bike.type}</span>
        </div>
        <span style="font-size: 0.85rem; color: #ced6e0;">${bike.description}</span>
      </div>

      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-name">VITESSE</span>
          <span class="stat-rating">${'⚡'.repeat(bike.speedRating)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-name">MANIABILITÉ</span>
          <span class="stat-rating">${'🎯'.repeat(bike.handlingRating)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-name">REBOND CARTOON</span>
          <span class="stat-rating">${'💥'.repeat(bike.bounceRating)}</span>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
        <span style="font-size: 0.85rem; font-weight: 700;">PEINTURE :</span>
        <div class="color-picker-row">
          ${colors.map(col => `
            <div class="color-dot ${currentColor.toLowerCase() === col.toLowerCase() ? 'active' : ''}"
                 data-color="${col}"
                 style="background: ${col};">
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-top: 8px;">
        ${isEquipped ? `
          <button class="btn-arcade btn-secondary" style="width: 100%; cursor: default;">
            ✓ ÉQUIPÉE ACTUELLEMENT
          </button>
        ` : isUnlocked ? `
          <button id="btn-equip-bike" class="btn-arcade" style="width: 100%;">
            ÉQUIPER CE BOLIDE
          </button>
        ` : `
          <button id="btn-buy-bike" class="btn-arcade btn-accent" style="width: 100%;">
            DÉBLOQUER POUR 🪙 ${bike.cost} PIÈCES
          </button>
        `}
      </div>
    `;

    // Événement choix couleur
    const colorDots = container.querySelectorAll('.color-dot');
    colorDots.forEach(dot => {
      dot.addEventListener('click', () => {
        const hex = dot.getAttribute('data-color');
        storage.setBikeColor(bike.id, hex);
        soundManager.playClick();
        if (this.onAction) this.onAction('COLOR_CHANGED', { bikeId: bike.id, color: hex });
        this.updateGarageBikeInfo(container);
      });
    });

    if (!isEquipped && isUnlocked) {
      container.querySelector('#btn-equip-bike').addEventListener('click', () => {
        storage.equipBike(bike.id);
        gameState.selectBike(bike.id);
        soundManager.playClick();
        if (this.onAction) this.onAction('BIKE_EQUIPPED', bike);
        this.updateGarageBikeInfo(container);
      });
    } else if (!isUnlocked) {
      container.querySelector('#btn-buy-bike').addEventListener('click', () => {
        const res = storage.unlockBike(bike.id, bike.cost);
        if (res.success) {
          gameState.selectBike(bike.id);
          soundManager.playVictory();
          if (this.onAction) this.onAction('BIKE_EQUIPPED', bike);
          this.updateGarageBikeInfo(container);
        } else {
          soundManager.playBoing();
          alert(res.reason);
        }
      });
    }
  }

  // --- 4. HUD DE GAMEPLAY PENDANT LA COURSE ---
  renderHUDScreen() {
    const hud = document.createElement('div');
    hud.className = 'screen-hud';

    hud.innerHTML = `
      <div class="hud-top-bar">
        <div class="score-box">
          <span class="score-label">SCORE</span>
          <span class="score-value" id="hud-score-val">0</span>
          <div class="combo-badge" id="hud-combo-badge">
            <span>🔥</span>
            <span id="hud-combo-text">COMBO x1</span>
          </div>
        </div>

        <div class="progress-container">
          <span class="city-target-title" id="hud-city-name">${gameState.selectedCity.name.toUpperCase()}</span>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" id="hud-progress-fill"></div>
          </div>
          <span style="font-size: 0.65rem; color: #a4b0be; margin-top: 2px;" id="hud-target-text">
            Objectif: ${gameState.selectedCity.targetScore} pts
          </span>
        </div>

        <button class="btn-icon-pause" id="btn-hud-pause">
          ⏸️
        </button>
      </div>

      <div class="hud-bottom-controls">
        <div class="speedometer">
          <span class="speed-value" id="hud-speed-val">0</span>
          <span class="speed-unit">KM/H</span>
        </div>

        <button class="btn-horn" id="btn-hud-horn" title="Klaxon !">
          📢
        </button>
      </div>

      <div class="touch-hint">
        ← Glissez le doigt pour piloter la moto →
      </div>
    `;

    hud.querySelector('#btn-hud-pause').addEventListener('click', () => {
      soundManager.playClick();
      if (this.onAction) this.onAction('PAUSE');
      this.showPauseModal();
    });

    hud.querySelector('#btn-hud-horn').addEventListener('click', () => {
      soundManager.playHorn();
      if (this.onAction) this.onAction('HORN');
    });

    this.root.appendChild(hud);
  }

  updateHUDScore(data) {
    const scoreVal = this.root.querySelector('#hud-score-val');
    const comboBadge = this.root.querySelector('#hud-combo-badge');
    const comboText = this.root.querySelector('#hud-combo-text');

    if (scoreVal) {
      scoreVal.textContent = data.score;
      scoreVal.style.transform = 'scale(1.15)';
      setTimeout(() => { if (scoreVal) scoreVal.style.transform = 'scale(1)'; }, 100);
    }

    if (comboBadge && comboText) {
      if (data.combo > 1) {
        comboBadge.classList.add('active');
        comboText.textContent = `${data.comboTitle} x${data.combo}` ;
      } else {
        comboBadge.classList.remove('active');
      }
    }
  }

  resetHUDCombo() {
    const comboBadge = this.root.querySelector('#hud-combo-badge');
    if (comboBadge) comboBadge.classList.remove('active');
  }

  updateHUDStats(data) {
    const speedVal = this.root.querySelector('#hud-speed-val');
    const progressFill = this.root.querySelector('#hud-progress-fill');

    if (speedVal) speedVal.textContent = data.speed;
    if (progressFill) progressFill.style.width = `${Math.floor(data.progressRatio * 100)}%`;
  }

  // --- 5. MODALE DE RÉSULTATS ET PROGRESSION ---
  showResultsModal(data) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const starsHtml = '★'.repeat(data.stars) + '☆'.repeat(3 - data.stars);

    overlay.innerHTML = `
      <div class="modal-card">
        <h2 class="modal-title">${data.stars >= 1 ? '🎉 ÉTAPE RÉUSSIE !' : '💨 COURSE TERMINÉE'}</h2>

        <div class="stars-awarded">
          ${starsHtml}
        </div>

        <div class="results-stats">
          <div class="result-row">
            <span>Score Final :</span>
            <span style="color: #fffa65;">${data.score} pts ${data.isNewBest ? '🏆 NOUVEAU RECORD !' : ''}</span>
          </div>
          <div class="result-row">
            <span>Interactions Comiques :</span>
            <span>${data.interactions} percutés</span>
          </div>
          <div class="result-row">
            <span>Combo Maximum :</span>
            <span>x${data.maxCombo}</span>
          </div>
          <div class="result-row">
            <span>Distance Parcourue :</span>
            <span>${data.distance} mètres</span>
          </div>
          <div class="result-row" style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
            <span>Pièces Gagnées :</span>
            <span style="color: var(--gold);">🪙 +${data.coinsEarned}</span>
          </div>
        </div>

        ${data.newlyUnlockedCity ? `
          <div style="background: rgba(46, 213, 115, 0.2); border: 1px solid #2ed573; padding: 10px; border-radius: 14px; text-align: center;">
            <strong style="color: #2ed573;">✨ NOUVELLE VILLE DÉBLOQUÉE !</strong>
            <p style="font-size: 0.85rem; margin-top: 4px;">Vous pouvez maintenant explorer <strong>${data.newlyUnlockedCity.name}</strong> !</p>
          </div>
        ` : ''}

        <div class="modal-actions">
          <button id="btn-results-retry" class="btn-arcade">
            🔄 REJOUER CETTE ÉTAPE
          </button>
          <button id="btn-results-map" class="btn-arcade btn-secondary">
            🗺️ RETOUR À LA CARTE
          </button>
          <button id="btn-results-garage" class="btn-arcade btn-accent">
            🏍️ PASSER AU GARAGE
          </button>
        </div>
      </div>
    `;

    overlay.querySelector('#btn-results-retry').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      if (this.onAction) this.onAction('START_RUN', gameState.selectedCity);
    });

    overlay.querySelector('#btn-results-map').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.setScreen('MAP');
    });

    overlay.querySelector('#btn-results-garage').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.setScreen('GARAGE');
    });

    this.root.appendChild(overlay);
  }

  // --- 6. MODALE DE PAUSE ---
  showPauseModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-card">
        <h2 class="modal-title">PAUSE</h2>

        <div class="modal-actions">
          <button id="btn-pause-resume" class="btn-arcade">
            ▶️ REPRENDRE
          </button>
          <button id="btn-pause-restart" class="btn-arcade btn-accent">
            🔄 RECOMMENCER
          </button>
          <button id="btn-pause-map" class="btn-arcade btn-ghost">
            🗺️ QUITTER VERS LA CARTE
          </button>
        </div>
      </div>
    `;

    overlay.querySelector('#btn-pause-resume').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      if (this.onAction) this.onAction('RESUME');
    });

    overlay.querySelector('#btn-pause-restart').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      if (this.onAction) this.onAction('START_RUN', gameState.selectedCity);
    });

    overlay.querySelector('#btn-pause-map').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      gameState.currentMode = 'MAP';
      soundManager.stopEngine();
      this.setScreen('MAP');
    });

    this.root.appendChild(overlay);
  }

  // --- 7. MODALE DE PARAMÈTRES ---
  showSettingsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const sfxOn = storage.data.settings.sfx;
    const musicOn = storage.data.settings.music;

    overlay.innerHTML = `
      <div class="modal-card">
        <h2 class="modal-title">OPTIONS</h2>

        <div class="results-stats">
          <div class="result-row" style="align-items: center;">
            <span>Effets Sonores :</span>
            <button id="toggle-sfx" class="btn-arcade ${sfxOn ? 'btn-secondary' : 'btn-ghost'}" style="padding: 6px 16px; font-size: 0.85rem;">
              ${sfxOn ? 'OUI' : 'NON'}
            </button>
          </div>
          <div class="result-row" style="align-items: center;">
            <span>Musique Arcade :</span>
            <button id="toggle-music" class="btn-arcade ${musicOn ? 'btn-secondary' : 'btn-ghost'}" style="padding: 6px 16px; font-size: 0.85rem;">
              ${musicOn ? 'OUI' : 'NON'}
            </button>
          </div>
        </div>

        <button id="btn-settings-close" class="btn-arcade">
          VALIDER
        </button>
      </div>
    `;

    overlay.querySelector('#toggle-sfx').addEventListener('click', (e) => {
      const next = !storage.data.settings.sfx;
      soundManager.toggleSfx(next);
      e.target.textContent = next ? 'OUI' : 'NON';
      e.target.className = `btn-arcade ${next ? 'btn-secondary' : 'btn-ghost'}`;
    });

    overlay.querySelector('#toggle-music').addEventListener('click', (e) => {
      const next = !storage.data.settings.music;
      soundManager.toggleMusic(next);
      e.target.textContent = next ? 'OUI' : 'NON';
      e.target.className = `btn-arcade ${next ? 'btn-secondary' : 'btn-ghost'}`;
    });

    overlay.querySelector('#btn-settings-close').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
    });

    this.root.appendChild(overlay);
  }

  showToastUnlock(city) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: absolute;
      top: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #2ed573, #1e90ff);
      color: #fff;
      padding: 12px 24px;
      border-radius: 30px;
      font-weight: 800;
      box-shadow: 0 8px 25px rgba(46, 213, 115, 0.5);
      z-index: 100;
      animation: modalPop 0.4s ease;
    `;
    toast.innerHTML = `🔓 Ville débloquée : ${city.name} !`;
    this.root.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }
}

/**
 * Carnage Cruise - Gestionnaire d'Interface Utilisateur (UIManager)
 * Carte réaliste de France avec effets de transition cinématique,
 * Section Profil joueur, Système de freinage HUD, Gestionnaire de bouton retour Android,
 * et correction de la navigation du Garage.
 */

import { gameState, CITIES, BIKES, getCityBiomeInfo, getCityRegion } from '../core/GameState.js';
import { storage } from '../core/Storage.js';
import { dailyMissions, loginStreak } from '../core/DailyMissions.js';
import { soundManager } from '../audio/SoundManager.js';
import { App } from '@capacitor/app';
import { FULL_VERSION, APP_VERSION, COPYRIGHT_NOTICE, RELEASE_NAME, IS_BETA } from '../core/Version.js';
import { REAL_COUNTRY_PATHS } from './EuropeMapData.js';
import { adManager } from '../services/AdManager.js';
import { cookieConsentManager } from '../services/CookieConsentManager.js';
import { Haptic } from '../services/HapticFeedback.js';
import gsap from 'gsap';
import { WmdPixiRenderer } from './WmdPixiRenderer.js';

export class UIManager {
  constructor(rootElement, onActionCallback) {
    this.root = rootElement;
    this.onAction = onActionCallback;

    this.currentScreen = 'SPLASH'; // SPLASH, MAP, GARAGE, HUD
    this.previousScreen = 'SPLASH';
    this.selectedMapCity = gameState.selectedCity;
    this.selectedGarageBike = gameState.selectedBike;
    this.activeModals = []; // Pile des modales actives pour le bouton retour
    this.mapZoom = 1.0;

    this.init();
    this.bindGameState();
    this.bindBackButton();
  }

  init() {
    this.render();
    if (!cookieConsentManager.hasAnswered()) {
      setTimeout(() => {
        cookieConsentManager.showConsentModal();
      }, 700);
    }
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
      } else if (event === 'exit_ruins') {
        this.setScreen('MAP');
      } else if (event === 'run_ended') {
        this.showResultsModal(data);
      } else if (event === 'city_unlocked') {
        this.showToastUnlock(data);
      } else if (event === 'crash_penalty') {
        this.triggerCrashPenaltyUI(data.penalty);
      }
    });
  }

  bindBackButton() {
    // 1. Touche Échap sur PC
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleHardwareBack();
      }
    });

    // 2. Gestionnaire d'historique de navigation du navigateur
    window.addEventListener('popstate', () => {
      this.handleHardwareBack();
    });

    // 3. Bouton retour natif Android (Capacitor)
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.addListener('backButton', () => {
        this.handleHardwareBack();
      });
    }
  }

  handleHardwareBack() {
    // Si une modale est ouverte : la fermer en priorité
    if (this.activeModals.length > 0) {
      const topModal = this.activeModals.pop();
      const wasPauseModal = topModal && topModal.dataset && topModal.dataset.isPauseModal === 'true';
      if (topModal && topModal.parentNode) {
        topModal.remove();
      }
      if (wasPauseModal && this.onAction) {
        this.onAction('RESUME');
      }
      return;
    }

    // Si on est dans le Garage ou la Carte : retourner à l'écran précédent
    if (this.currentScreen === 'GARAGE') {
      this.setScreen(this.previousScreen || 'SPLASH');
      return;
    }
    if (this.currentScreen === 'MAP') {
      this.setScreen('SPLASH');
      return;
    }
    if (this.currentScreen === 'HUD') {
      // En mode exploration des ruines : retour direct et immédiat à la carte
      if (gameState.isRuinsMode) {
        gameState.isRuinsMode = false;
        if (this.onAction) this.onAction('EXIT_RUINS');
        else this.setScreen('MAP');
        return;
      }
      // Si la course est terminée ou en mode résultats, retour direct à la carte
      if (gameState.isGameOver || gameState.currentMode === 'RESULTS') {
        this.setScreen('MAP');
        return;
      }
      // En jeu : mettre en pause et afficher le menu de pause
      if (this.onAction) this.onAction('PAUSE');
      this.showPauseModal();
      return;
    }

    // Si on est sur l'écran d'accueil principal : ne pas quitter (rester dans l'application)
    if (this.currentScreen === 'SPLASH') {
      return;
    }
  }

  closeActiveModals() {
    if (Array.isArray(this.activeModals)) {
      while (this.activeModals.length > 0) {
        const modal = this.activeModals.pop();
        if (modal && modal.parentNode) {
          try { modal.remove(); } catch (e) {}
        }
      }
    }
  }

  setScreen(screenName) {
    if (this.currentScreen !== screenName) {
      this.previousScreen = this.currentScreen;
    }
    this.currentScreen = screenName;

    // Synchronisation du mode de jeu global
    if (screenName === 'MAP') {
      gameState.currentMode = 'MAP';
      gameState.isGameOver = false;
    } else if (screenName === 'SPLASH') {
      gameState.currentMode = 'SPLASH';
      gameState.isGameOver = false;
    } else if (screenName === 'GARAGE') {
      gameState.currentMode = 'GARAGE';
      gameState.isGameOver = false;
    }

    // Transition musicale dynamique selon l'écran
    if (screenName === 'SPLASH' || screenName === 'MAP' || screenName === 'GARAGE') {
      soundManager.switchMusicTrack('MENU');
    } else if (screenName === 'HUD') {
      const isNuc = gameState.selectedCity?.isNuclearMission;
      soundManager.switchMusicTrack(isNuc ? 'NUCLEAR' : 'GAMEPLAY');
    }

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

  // --- 1. ÉCRAN DE LANCEMENT ÉPIQUE & ERGONOMIQUE (SPLASH SCREEN AAA) ---
  renderSplashScreen() {
    const splash = document.createElement('div');
    splash.className = 'screen-splash interactive';

    const coins = storage.data.coins;
    const totalStars = storage.getTotalStars();
    const equippedBikeId = storage.getEquippedBike() || 'scooter';
    const equippedBike = BIKES.find(b => b.id === equippedBikeId) || BIKES[0];
    const isAudioOn = !soundManager.isMutedMusic || !soundManager.isMutedSfx;

    splash.innerHTML = `
      <!-- En-tête supérieur ergonomique avec statuts, pièces, étoiles et toggle audio -->
      <div class="splash-header-bar">
        <div class="splash-badge-version">
          ${IS_BETA ? '<span class="badge-beta-pill">BETA</span>' : ''}
          <span class="badge-version-text">${FULL_VERSION}</span>
        </div>
        <div class="splash-header-right">
          <!-- Pilule de monnaie simple (aucun appel publicitaire) -->
          <div class="currency-pill" title="Pièces d'or">
            <span>🪙 ${coins}</span>
          </div>
          <div class="stars-pill" title="Total d'étoiles gagnées">
            <span>★ ${totalStars}</span>
          </div>
          <button id="btn-splash-audio" type="button" class="btn-round-action btn-audio-quick" title="${isAudioOn ? 'Couper le Son' : 'Activer le Son'}" aria-label="Son">
            <span id="splash-audio-icon">${isAudioOn ? '🔊' : '🔇'}</span>
          </button>
        </div>
      </div>

      <!-- Hero Titre & Logo Cyber-Arcade Futuriste 3D -->
      <div class="logo-container">
        <div class="logo-glow-ring"></div>
        <img src="./logo.svg" alt="CarnageCruise" class="game-logo-img" width="210" height="210" />
        <h1 class="game-title">CARNAGE CRUISE</h1>
        <div class="game-subtitle">⚡ CYBER ARCADE & ASSAUT URBAIN ⚡</div>
      </div>

      <!-- Missions Quotidiennes (Rétention D1-D7) -->
      ${this.renderDailyMissionsPanel()}

      <!-- Carte d'Aperçu du Véhicule Équipé (Accès Rapide Garage) -->
      <div class="splash-vehicle-card clickable" id="btn-splash-quick-garage" title="Personnaliser et équiper dans le Garage">
        <div class="vehicle-card-badge">⚡ ENGIN PRÊT AU DÉPLOIEMENT</div>
        <div class="vehicle-card-main">
          <span class="vehicle-card-icon">${equippedBike.icon}</span>
          <div class="vehicle-card-text">
            <span class="vehicle-card-name">${equippedBike.name}</span>
            <span class="vehicle-card-tag">${equippedBike.tagline}</span>
          </div>
          <span class="vehicle-card-cta">GARAGE ➔</span>
        </div>
      </div>

      <!-- Zone Ergonomique Inférieure pour Pouces (Thumb Zone Mobile) -->
      <div class="splash-footer">
        <!-- Bouton Héros Principal de Lancement -->
        <button id="btn-splash-play" class="btn-arcade btn-play-pulse hero-play-btn">
          <span class="hero-play-icon">🚀</span>
          <span class="hero-play-label">LANCER L'ASSAUT</span>
          <span class="hero-play-arrow">▶</span>
        </button>

        <!-- Grille 2 Colonnes Tactile Ergonomique : Garage + Un seul bouton Profil & Options -->
        <div class="splash-action-grid">
          <button id="btn-splash-garage" class="btn-arcade btn-secondary btn-touch-target">
            <span class="btn-icon">🪖</span>
            <span class="btn-label">GARAGE & ARSENAL</span>
          </button>
          <button id="btn-splash-profile" class="btn-arcade btn-accent btn-touch-target">
            <span class="btn-icon">👤</span>
            <span class="btn-label">PROFIL & OPTIONS</span>
          </button>
        </div>

        <div class="splash-legal">
          <span>${COPYRIGHT_NOTICE}</span>
        </div>
      </div>
    `;

    const bindTap = (selector, handler) => {
      const el = splash.querySelector(selector);
      if (!el) return;
      let lastTrigger = 0;
      const invoke = (e) => {
        const now = performance.now();
        if (now - lastTrigger < 320) return;
        lastTrigger = now;
        handler(e);
      };
      el.addEventListener('touchstart', (e) => {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        invoke(e);
      }, { passive: false });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        invoke(e);
      });
    };

    bindTap('#btn-splash-play', () => {
      soundManager.playClick('hero');
      soundManager.resumeContext();
      soundManager.switchMusicTrack('MENU');
      this.setScreen('MAP');
    });

    bindTap('#btn-splash-garage', () => {
      soundManager.playClick('garage');
      this.previousScreen = 'SPLASH';
      this.setScreen('GARAGE');
    });

    bindTap('#btn-splash-quick-garage', () => {
      soundManager.playClick('garage');
      this.previousScreen = 'SPLASH';
      this.setScreen('GARAGE');
    });

    bindTap('#btn-splash-profile', () => {
      soundManager.playClick('default');
      this.showProfileModal();
    });

    bindTap('#btn-splash-audio', () => {
      soundManager.resumeContext();
      const nowOn = soundManager.toggleAllAudio();
      if (nowOn) {
        soundManager.playClick('default');
      }
      const btn = splash.querySelector('#btn-splash-audio');
      const iconEl = splash.querySelector('#splash-audio-icon');
      if (iconEl) iconEl.textContent = nowOn ? '🔊' : '🔇';
      if (btn) btn.title = nowOn ? 'Couper le Son' : 'Activer le Son';
    });

    this.root.appendChild(splash);

    // Listeners des boutons "RÉCLAMER" des missions quotidiennes
    splash.querySelectorAll('.daily-mission-claim').forEach(btn => {
      let handled = false;
      const onClaim = (e) => {
        e.stopPropagation();
        const slot = parseInt(btn.getAttribute('data-slot'), 10);
        const reward = dailyMissions.claim(slot);
        if (reward > 0) {
          soundManager.playCoin();
          this.showToastUnlock({ name: `🎯 MISSION ACCOMPLIE : +${reward} PIÈCES !` });
          this.render();
        }
      };
      btn.addEventListener('touchstart', (e) => {
        handled = true;
        if (e.cancelable) e.preventDefault();
        onClaim(e);
      }, { passive: false });
      btn.addEventListener('click', (e) => {
        if (handled) { handled = false; return; }
        onClaim(e);
      });
    });
  }

  // --- 2. CARTE RÉALISTE DE FRANCE & EFFETS DE TRANSITION ---
  renderMapScreen() {
    const mapScreen = document.createElement('div');
    mapScreen.className = 'screen-map interactive';

    const coins = storage.data.coins;
    const totalStars = storage.getTotalStars();
    const currentBikeId = storage.getEquippedBike() || gameState.selectedBike?.id || 'tank';
    const currentBike = BIKES.find(b => b.id === currentBikeId) || BIKES[0];

    mapScreen.innerHTML = `
      <!-- EN-TÊTE ÉPURÉ : NAVIGATION, ÉTOILES, MONNAIE & FILTRE PAR RÉGION -->
      <div class="map-header-redesign">
        <div class="map-top-bar">
          <button id="btn-map-back" class="map-top-btn" title="Retour Accueil">
            <span class="top-btn-icon">🏠</span>
            <span class="top-btn-text">ACCUEIL</span>
          </button>

          <div class="stars-pill" title="Étoiles de Campagne">
            <span>🗺️ ${CITIES.length} ÉTAPES • ★ ${totalStars}</span>
          </div>

          <!-- Pilule de monnaie simple -->
          <div class="currency-pill" title="Pièces d'or">
            <span>🪙 ${coins}</span>
          </div>
        </div>

        <!-- BARRE D'ONGLETS RÉGIONAUX UI/UX (EUROPE, AFRIQUE DU NORD, PROCHE-ORIENT) -->
        <div class="map-region-filter-bar" id="map-region-tabs">
          <button class="region-tab-pill active" data-region="ALL">🌍 TOUT (${CITIES.length})</button>
          <button class="region-tab-pill" data-region="EUROPE">🇪🇺 EUROPE</button>
          <button class="region-tab-pill" data-region="AFRIQUE DU NORD">🏜️ AFRIQUE DU NORD</button>
          <button class="region-tab-pill" data-region="PROCHE-ORIENT">🕌 PROCHE-ORIENT</button>
        </div>
      </div>

      <!-- CARTE D'EUROPE, AFRIQUE DU NORD & PROCHE-ORIENT HAUTE-FIDÉLITÉ AVEC ZOOM INTERACTIF -->
      <div class="europe-map-scroll-viewport" id="europe-viewport">
        <!-- CONTRÔLES DE ZOOM COMPACTS EN PILULE DOCKÉE EN HAUT À DROITE (ZÉRO CONFLIT ERGONOMIQUE) -->
        <div class="map-zoom-controls-pill">
          <button id="btn-zoom-out" class="btn-zoom-pill" title="Réduire (Zoom -)">➖</button>
          <span class="zoom-pill-badge" id="zoom-badge">${Math.round(this.mapZoom * 100)}%</span>
          <button id="btn-zoom-in" class="btn-zoom-pill" title="Agrandir (Zoom +)">➕</button>
          <button id="btn-zoom-reset" class="btn-zoom-pill" title="Recentrer la carte">🎯</button>
        </div>

        <div class="europe-map-canvas-container" id="europe-canvas">
          <svg class="europe-svg" viewBox="0 0 1200 1100">
            <defs>
              <!-- Dégradé de relief européen : Verts luxuriants, ocres et sommets -->
              <linearGradient id="franceLuxury" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#1b4d3e" />
                <stop offset="35%" stop-color="#163e32" />
                <stop offset="70%" stop-color="#102e24" />
                <stop offset="100%" stop-color="#0a1d17" />
              </linearGradient>

              <!-- Dégradé des pays européens -->
              <linearGradient id="neighborCountryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#182330" />
                <stop offset="100%" stop-color="#0e1722" />
              </linearGradient>

              <!-- Dégradé Afrique du Nord (Ocre Saharien & Atlas) -->
              <linearGradient id="maghrebGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#2e2318" />
                <stop offset="100%" stop-color="#1c140d" />
              </linearGradient>

              <!-- Dégradé Proche-Orient (Ambre du Levant & Mésopotamie) -->
              <linearGradient id="levantGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#2d1b24" />
                <stop offset="100%" stop-color="#1a1016" />
              </linearGradient>

              <!-- Dégradé des océans et mers -->
              <radialGradient id="oceanShading" cx="50%" cy="50%" r="75%">
                <stop offset="0%" stop-color="#0e2439" />
                <stop offset="55%" stop-color="#091827" />
                <stop offset="100%" stop-color="#03080e" />
              </radialGradient>

              <!-- Halo côtier turquoise -->
              <filter id="coastalGlow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#00cec9" flood-opacity="0.35" />
              </filter>
            </defs>

            <!-- Fond Océanique / Mers Européennes, Méditerranée & Mer Rouge -->
            <rect width="100%" height="100%" fill="url(#oceanShading)" />

            <!-- ================= GÉOGRAPHIE RÉALISTE EUROPE, AFRIQUE DU NORD & PROCHE-ORIENT ================= -->
            ${Object.entries(REAL_COUNTRY_PATHS).map(([code, country]) => {
              const isFrance = code === 'FRA';
              const isMaghreb = ['MAR', 'DZA', 'TUN', 'LBY', 'EGY'].includes(code);
              const isMiddleEast = ['TUR', 'CYP', 'SYR', 'LBN', 'ISR', 'JOR', 'IRQ', 'SAU'].includes(code);
              const strokeColor = isFrance ? '#00cec9' : (isMaghreb ? '#f59e0b' : (isMiddleEast ? '#fb7185' : '#2ed573'));
              const fillGrad = isFrance ? 'url(#franceLuxury)' : (isMaghreb ? 'url(#maghrebGrad)' : (isMiddleEast ? 'url(#levantGrad)' : 'url(#neighborCountryGrad)'));
              const strokeW = isFrance ? '2.4' : (isMaghreb || isMiddleEast ? '1.35' : '1.1');
              return `
                <path class="country-${code.toLowerCase()} ${isFrance ? 'france-mainland' : 'neighbor-country'}"
                      d="${country.d}"
                      fill="${fillGrad}"
                      stroke="${strokeColor}"
                      stroke-width="${strokeW}"
                      opacity="${isFrance ? '1.0' : '0.92'}"
                      filter="url(#coastalGlow)" />
              `;
            }).join('')}

            <!-- Noms Géographiques Clés (Europe, Afrique du Nord & Proche-Orient) -->
            <g text-anchor="middle" style="paint-order: stroke; stroke: #040a12; stroke-width: 3.5px; stroke-linejoin: round;">
              <text x="580" y="882" fill="#00cec9" font-size="14" font-weight="900" letter-spacing="4" opacity="0.55">MER MÉDITERRANÉE</text>
              <text x="775" y="315" fill="#00cec9" font-size="13" font-weight="900" letter-spacing="3" opacity="0.45">MER BALTIQUE</text>
              <text x="980" y="690" fill="#00cec9" font-size="13" font-weight="900" letter-spacing="3" opacity="0.45">MER NOIRE</text>
              <text x="505" y="645" fill="#00cec9" font-size="17" font-weight="900" letter-spacing="2.5" opacity="0.72">FRANCE 🇫🇷</text>
              <text x="395" y="835" fill="#74b9ff" font-size="14" font-weight="900" letter-spacing="2" opacity="0.65">ESPAGNE 🇪🇸</text>
              <text x="678" y="768" fill="#74b9ff" font-size="13" font-weight="900" letter-spacing="2" opacity="0.65">ITALIE 🇮🇹</text>
              <text x="635" y="520" fill="#74b9ff" font-size="13" font-weight="900" letter-spacing="2" opacity="0.65">ALLEMAGNE 🇩🇪</text>
              <text x="415" y="458" fill="#74b9ff" font-size="12" font-weight="900" letter-spacing="1.2" opacity="0.65">ROYAUME-UNI 🇬🇧</text>
              <!-- Afrique du Nord -->
              <text x="305" y="1005" fill="#fbbf24" font-size="14" font-weight="900" letter-spacing="2" opacity="0.78">MAROC 🇲🇦</text>
              <text x="495" y="988" fill="#fbbf24" font-size="15" font-weight="900" letter-spacing="2.5" opacity="0.78">ALGÉRIE 🇩🇿</text>
              <text x="625" y="948" fill="#fbbf24" font-size="12" font-weight="900" letter-spacing="1.5" opacity="0.75">TUNISIE 🇹🇳</text>
              <text x="765" y="1045" fill="#fbbf24" font-size="14" font-weight="900" letter-spacing="2.5" opacity="0.75">LIBYE 🇱🇾</text>
              <text x="995" y="1065" fill="#fbbf24" font-size="15" font-weight="900" letter-spacing="2.5" opacity="0.8">ÉGYPTE 🇪🇬</text>
              <!-- Proche-Orient -->
              <text x="1035" y="848" fill="#fb7185" font-size="15" font-weight="900" letter-spacing="2.5" opacity="0.8">TURQUIE 🇹🇷</text>
              <text x="1130" y="942" fill="#fb7185" font-size="12" font-weight="900" letter-spacing="1.5" opacity="0.78">SYRIE 🇸🇾</text>
              <text x="1055" y="968" fill="#fb7185" font-size="11" font-weight="900" letter-spacing="1.2" opacity="0.78">LIBAN 🇱🇧</text>
              <text x="1115" y="1028" fill="#fb7185" font-size="12" font-weight="900" letter-spacing="1.5" opacity="0.78">JORDANIE 🇯🇴</text>
              <text x="1175" y="975" fill="#fb7185" font-size="12" font-weight="900" letter-spacing="1.5" opacity="0.75">IRAK 🇮🇶</text>
            </g>
          </svg>

          <!-- Avion Voyageur Animé se déplaçant d'une ville à une autre (✈️) -->
          <div class="plane-traveler" id="plane-traveler" style="left: ${this.selectedMapCity ? this.selectedMapCity.mapCoords.x : 44.8}%; top: ${this.selectedMapCity ? this.selectedMapCity.mapCoords.y : 40.2}%;">
            <div class="plane-traveler-icon">✈️</div>
            <div class="plane-traveler-trail">💨</div>
          </div>

          <!-- Pins interactifs des villes d'Europe, Afrique du Nord et Proche-Orient -->
          ${CITIES.map((city, idx) => {
            const unlocked = storage.isCityUnlocked(city.id);
            const isExterminated = storage.isCityExterminated(city.id);
            const isSelected = this.selectedMapCity.id === city.id;
            const cityRegion = getCityRegion(city);

            return `
              <div class="city-pin ${unlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''} ${isExterminated ? 'exterminated-pin' : ''}"
                   data-city-id="${city.id}"
                   data-region="${cityRegion}"
                   style="left: ${city.mapCoords.x}%; top: ${city.mapCoords.y}%;">
                <div class="city-pulse-ring"></div>
                <div class="city-pin-dot">
                  <span class="pin-badge-idx">${isExterminated ? '☠️' : (idx + 1)}</span>
                  <span class="pin-emblem-icon">${isExterminated ? '💀' : (unlocked ? (city.countryFlag || city.emblem || '★') : '🔒')}</span>
                </div>
                <div class="city-pin-label ${isExterminated ? 'label-exterminated' : ''}">
                  ${city.name}${isExterminated ? ' (FERMÉE)' : ''}
                </div>
                ${isSelected ? (isExterminated ? '<div class="city-pin-closed-pill">☠️ FERMÉE</div>' : '<div class="city-pin-selected-pill">🎯 CIBLE ACTIVE</div>') : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="city-detail-card" id="city-detail">
        <!-- Rempli dynamiquement -->
      </div>
    `;

    // Moteur Pan & Pinch Zoom 60 FPS Hautes Performances (Accélération Matérielle transform3d)
    const canvasContainer = mapScreen.querySelector('#europe-canvas');
    const zoomBadge = mapScreen.querySelector('#zoom-badge');
    const viewportEl = mapScreen.querySelector('#europe-viewport');

    let panX = 0;
    let panY = 0;
    this.mapZoom = Math.max(0.26, Math.min(3.0, this.mapZoom || 0.85));

    const clampPan = (targetX, targetY, zoom) => {
      if (!viewportEl) return { x: targetX, y: targetY };
      const vw = viewportEl.clientWidth || 360;
      const vh = viewportEl.clientHeight || 400;
      const effectiveW = 1200 * zoom;
      const effectiveH = 1100 * zoom;

      let minX, maxX;
      if (effectiveW <= vw) {
        minX = maxX = (vw - effectiveW) / 2;
      } else {
        minX = vw - effectiveW - 40;
        maxX = 40;
      }

      let minY, maxY;
      if (effectiveH <= vh) {
        minY = maxY = (vh - effectiveH) / 2;
      } else {
        minY = vh - effectiveH - 40;
        maxY = 40;
      }

      return {
        x: Math.min(maxX, Math.max(minX, targetX)),
        y: Math.min(maxY, Math.max(minY, targetY))
      };
    };

    const applyTransform = (animate = false, durationMs = 380) => {
      if (!canvasContainer) return;
      if (animate) {
        canvasContainer.style.transition = `transform ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`;
      } else {
        canvasContainer.style.transition = 'none';
      }
      canvasContainer.style.transform = `translate3d(${panX.toFixed(1)}px, ${panY.toFixed(1)}px, 0) scale(${this.mapZoom.toFixed(3)})`;
      if (zoomBadge) {
        zoomBadge.textContent = `${Math.round(this.mapZoom * 100)}%`;
      }
    };

    const centerOnCity = (city, animate = true) => {
      if (!city || !viewportEl) return;
      const vw = viewportEl.clientWidth || 360;
      const vh = viewportEl.clientHeight || 400;
      const cityPxX = (city.mapCoords.x / 100) * 1200;
      const cityPxY = (city.mapCoords.y / 100) * 1100;
      const targetPanX = vw / 2 - cityPxX * this.mapZoom;
      const targetPanY = vh / 2 - cityPxY * this.mapZoom;
      const clamped = clampPan(targetPanX, targetPanY, this.mapZoom);
      panX = clamped.x;
      panY = clamped.y;
      applyTransform(animate, animate ? 420 : 0);
    };

    const zoomAtPoint = (newZoom, focalX, focalY, animate = false) => {
      const oldZoom = this.mapZoom;
      const clampedZoom = Math.max(0.26, Math.min(3.0, newZoom));
      if (Math.abs(clampedZoom - oldZoom) < 0.001) return;

      const ratio = clampedZoom / oldZoom;
      const targetPanX = focalX - (focalX - panX) * ratio;
      const targetPanY = focalY - (focalY - panY) * ratio;

      this.mapZoom = clampedZoom;
      const clamped = clampPan(targetPanX, targetPanY, this.mapZoom);
      panX = clamped.x;
      panY = clamped.y;
      applyTransform(animate, animate ? 300 : 0);
    };

    // Empêcher les gestes sur les boutons de zoom de parasiter le pan de la carte
    const zoomControls = mapScreen.querySelector('.map-zoom-controls-pill');
    if (zoomControls) {
      zoomControls.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      zoomControls.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
    }

    mapScreen.querySelector('#btn-zoom-in')?.addEventListener('click', (e) => {
      e?.stopPropagation();
      soundManager.playClick();
      const rect = viewportEl.getBoundingClientRect();
      zoomAtPoint(this.mapZoom + 0.35, rect.width / 2, rect.height / 2, true);
    });
    mapScreen.querySelector('#btn-zoom-out')?.addEventListener('click', (e) => {
      e?.stopPropagation();
      soundManager.playClick();
      const rect = viewportEl.getBoundingClientRect();
      zoomAtPoint(this.mapZoom - 0.35, rect.width / 2, rect.height / 2, true);
    });
    mapScreen.querySelector('#btn-zoom-reset')?.addEventListener('click', (e) => {
      e?.stopPropagation();
      soundManager.playClick();
      const vw = viewportEl.clientWidth || 360;
      const vh = viewportEl.clientHeight || 400;
      const fitZoom = Math.max(0.28, Math.min(0.55, Math.min(vw / 1060, vh / 1480) * 0.95));
      // Si déjà dézoomé, recentre à 100%, sinon bascule sur vue globale MAX CARTE !
      this.mapZoom = (this.mapZoom <= fitZoom + 0.05) ? 1.0 : fitZoom;
      centerOnCity(this.selectedMapCity, true);
    });

    if (viewportEl) {
      // Zoom molette pour ordinateurs
      viewportEl.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        const rect = viewportEl.getBoundingClientRect();
        zoomAtPoint(this.mapZoom + delta, e.clientX - rect.left, e.clientY - rect.top, false);
      }, { passive: false });

      // PINCH-TO-ZOOM MULTI-TOUCH 2 DOIGTS ET GLISSER TACTILE 60 FPS
      let isPinching = false;
      let isDragging = false;
      let startPinchDist = 0;
      let startZoom = 1.0;
      let lastTouchX = 0;
      let lastTouchY = 0;
      let lastTapTime = 0;

      const getTouchDist = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      viewportEl.addEventListener('touchstart', (e) => {
        canvasContainer.style.transition = 'none';

        if (e.touches.length === 2) {
          isPinching = true;
          isDragging = false;
          startPinchDist = getTouchDist(e.touches[0], e.touches[1]);
          startZoom = this.mapZoom;
          e.preventDefault();
        } else if (e.touches.length === 1) {
          const now = Date.now();
          if (now - lastTapTime < 320) {
            // Double-tap : bascule zoom 100% <=> 175%
            const targetZoom = this.mapZoom > 1.25 ? 1.0 : 1.75;
            const rect = viewportEl.getBoundingClientRect();
            zoomAtPoint(targetZoom, e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, true);
            lastTapTime = 0;
            e.preventDefault();
            return;
          }
          lastTapTime = now;
          isPinching = false;
          isDragging = false;
          touchMoveDistance = 0;
          lastTouchX = e.touches[0].clientX;
          lastTouchY = e.touches[0].clientY;
        }
      }, { passive: false });

      let touchMoveDistance = 0;
      viewportEl.addEventListener('touchmove', (e) => {
        if (isPinching && e.touches.length >= 2) {
          e.preventDefault();
          const currentDist = getTouchDist(e.touches[0], e.touches[1]);
          if (startPinchDist > 5) {
            const factor = currentDist / startPinchDist;
            const rect = viewportEl.getBoundingClientRect();
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
            zoomAtPoint(startZoom * factor, midX, midY, false);
          }
        } else if (e.touches.length === 1) {
          const dx = e.touches[0].clientX - lastTouchX;
          const dy = e.touches[0].clientY - lastTouchY;
          touchMoveDistance += Math.hypot(dx, dy);

          if (touchMoveDistance > 8) {
            isDragging = true;
            e.preventDefault(); // N'empêche le tap sur les pins que si l'utilisateur glisse vraiment la carte !
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;

            const clamped = clampPan(panX + dx, panY + dy, this.mapZoom);
            panX = clamped.x;
            panY = clamped.y;
            applyTransform(false);
          }
        }
      }, { passive: false });

      const endTouch = (e) => {
        if (e.touches.length < 2) {
          isPinching = false;
          if (e.touches.length === 1) {
            isDragging = true;
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
          } else {
            isDragging = false;
            touchMoveDistance = 0;
          }
        }
      };
      viewportEl.addEventListener('touchend', endTouch, { passive: true });
      viewportEl.addEventListener('touchcancel', endTouch, { passive: true });

      // Support glisser à la souris sur ordinateur
      let isMouseDown = false;
      let mouseStartX = 0;
      let mouseStartY = 0;

      viewportEl.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isMouseDown = true;
        canvasContainer.style.transition = 'none';
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;
      });

      window.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        const dx = e.clientX - mouseStartX;
        const dy = e.clientY - mouseStartY;
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;

        const clamped = clampPan(panX + dx, panY + dy, this.mapZoom);
        panX = clamped.x;
        panY = clamped.y;
        applyTransform(false);
      });

      window.addEventListener('mouseup', () => {
        isMouseDown = false;
      });
    }

    // Gestion du déplacement et de la sélection de ville
    const pins = mapScreen.querySelectorAll('.city-pin');
    const updateSelection = (cityId) => {
      const city = CITIES.find(c => c.id === cityId);
      if (!city) return;

      const previousCity = this.selectedMapCity;
      soundManager.playClick();

      // Déclenchement du vol en avion animé si la ville est différente (✈️)
      if (previousCity && previousCity.id !== city.id) {
        soundManager.playPlaneFlyby();

        const plane = mapScreen.querySelector('#plane-traveler');
        if (plane) {
          const fromCoords = previousCity.mapCoords;
          const toCoords = city.mapCoords;

          const angleDeg = Math.atan2(toCoords.y - fromCoords.y, toCoords.x - fromCoords.x) * (180 / Math.PI);
          plane.classList.add('flying');
          plane.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg) scale(1.4)`;
          plane.style.left = `${toCoords.x}%`;
          plane.style.top = `${toCoords.y}%`;

          setTimeout(() => {
            plane.classList.remove('flying');
            plane.style.transform = 'translate(-50%, -50%) scale(1.15)';
            setTimeout(() => {
              if (plane) plane.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 180);
          }, 650);
        }
      }

      this.selectedMapCity = city;
      gameState.selectCity(cityId);
      const isCityClosed = storage.isCityExterminated(cityId);

      pins.forEach(p => {
        const isCurrent = p.getAttribute('data-city-id') === cityId;
        p.classList.toggle('selected', isCurrent);
        const existingPill = p.querySelector('.city-pin-selected-pill, .city-pin-closed-pill');
        if (isCurrent && !existingPill) {
          const pill = document.createElement('div');
          pill.className = isCityClosed ? 'city-pin-closed-pill' : 'city-pin-selected-pill';
          pill.textContent = isCityClosed ? '☠️ FERMÉE' : '🎯 CIBLE ACTIVE';
          p.appendChild(pill);
        } else if (isCurrent && existingPill) {
          existingPill.className = isCityClosed ? 'city-pin-closed-pill' : 'city-pin-selected-pill';
          existingPill.textContent = isCityClosed ? '☠️ FERMÉE' : '🎯 CIBLE ACTIVE';
        } else if (!isCurrent && existingPill) {
          existingPill.remove();
        }
      });

      // Centrer automatiquement et fluidement sur la ville sélectionnée
      centerOnCity(city, true);

      const targetPin = mapScreen.querySelector(`.city-pin[data-city-id="${cityId}"]`);
      if (targetPin) {
        setTimeout(() => this.triggerCityPinRipple(targetPin), 300);
      }

      this.updateCityDetail(mapScreen.querySelector('#city-detail'));
    };
    this.selectCityById = updateSelection;

    // Navigation séquentielle fluide entre les villes (◀ / ▶) avec GSAP
    const navigateCity = (direction) => {
      soundManager.playClick();
      Haptic.tap();
      const currentId = this.selectedMapCity ? this.selectedMapCity.id : CITIES[0].id;
      let idx = CITIES.findIndex(c => c.id === currentId);
      if (idx === -1) idx = 0;
      const nextIdx = (idx + direction + CITIES.length) % CITIES.length;
      updateSelection(CITIES[nextIdx].id);

      const detailCard = mapScreen.querySelector('#city-detail');
      if (detailCard) {
        gsap.fromTo(detailCard,
          { x: direction > 0 ? 45 : -45, opacity: 0.25, scale: 0.94 },
          { x: 0, opacity: 1, scale: 1.0, duration: 0.32, ease: "power2.out" }
        );
      }
    };
    this.navigateMapCity = navigateCity;

    const handleCityAction = (cityId) => {
      const city = CITIES.find(c => c.id === cityId);
      if (!city) return;

      const isAlreadySelected = (this.selectedMapCity && this.selectedMapCity.id === cityId);

      if (isAlreadySelected) {
        if (storage.isCityExterminated(city.id)) {
          soundManager.playClick();
          this.showExterminatedCityView(city);
          return;
        }
        if (!storage.isCityUnlocked(city.id)) {
          soundManager.playCrash();
          this.showToastUnlock({ name: `🔒 Ville verrouillée : ${city.unlockScoreRequired.toLocaleString('fr-FR')} points requis sur le Tour !` });
          return;
        }
        // Clic sur ville déjà sélectionnée : ENTRÉE DIRECTE DANS LA COURSE !
        soundManager.playClick();
        gameState.selectCity(city.id);
        this.triggerCityEntryCinematic(city);
      } else {
        // Première sélection de la ville
        updateSelection(cityId);
      }
    };

    let lastPinTapTime = 0;
    pins.forEach(pin => {
      let pinTouchStartX = 0;
      let pinTouchStartY = 0;
      let pinTouchMoved = false;

      pin.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          pinTouchStartX = e.touches[0].clientX;
          pinTouchStartY = e.touches[0].clientY;
          pinTouchMoved = false;
        }
      }, { passive: true });

      pin.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          const dx = e.touches[0].clientX - pinTouchStartX;
          const dy = e.touches[0].clientY - pinTouchStartY;
          if (Math.hypot(dx, dy) > 10) {
            pinTouchMoved = true;
          }
        }
      }, { passive: true });

      pin.addEventListener('touchend', (e) => {
        if (!pinTouchMoved) {
          e.preventDefault();
          lastPinTapTime = Date.now();
          handleCityAction(pin.getAttribute('data-city-id'));
        }
      }, { passive: false });

      pin.addEventListener('click', () => {
        if (Date.now() - lastPinTapTime < 400) return; // Évite le double-déclenchement tactile (ghost click)
        handleCityAction(pin.getAttribute('data-city-id'));
      });
    });

    // Filtres rapides par Région (Europe, Afrique du Nord, Proche-Orient)
    const regionTabs = mapScreen.querySelectorAll('.region-tab-pill');
    regionTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        soundManager.playClick();
        Haptic.tap();

        const targetRegion = tab.getAttribute('data-region') || 'ALL';
        regionTabs.forEach(t => t.classList.toggle('active', t === tab));

        // Mettre en valeur les pins de la région sélectionnée
        pins.forEach(pin => {
          const pinRegion = pin.getAttribute('data-region');
          const matches = (targetRegion === 'ALL' || pinRegion === targetRegion);
          pin.classList.toggle('region-dimmed', !matches);
        });

        // Sélectionner et centrer sur une ville représentative de la région
        if (targetRegion === 'AFRIQUE DU NORD') {
          this.mapZoom = 1.15;
          const currentReg = getCityRegion(this.selectedMapCity);
          const focusCity = currentReg === 'AFRIQUE DU NORD'
            ? this.selectedMapCity
            : (CITIES.find(c => c.id === 'alger') || CITIES.find(c => getCityRegion(c) === 'AFRIQUE DU NORD'));
          if (focusCity) updateSelection(focusCity.id);
        } else if (targetRegion === 'PROCHE-ORIENT') {
          this.mapZoom = 1.45;
          const currentReg = getCityRegion(this.selectedMapCity);
          const focusCity = currentReg === 'PROCHE-ORIENT'
            ? this.selectedMapCity
            : (CITIES.find(c => c.id === 'beyrouth') || CITIES.find(c => getCityRegion(c) === 'PROCHE-ORIENT'));
          if (focusCity) updateSelection(focusCity.id);
        } else if (targetRegion === 'EUROPE') {
          this.mapZoom = 0.95;
          const currentReg = getCityRegion(this.selectedMapCity);
          const focusCity = currentReg === 'EUROPE'
            ? this.selectedMapCity
            : (CITIES.find(c => c.id === 'paris') || CITIES[0]);
          if (focusCity) updateSelection(focusCity.id);
        } else {
          this.mapZoom = 0.72;
          centerOnCity(this.selectedMapCity, true);
        }
      });
    });

    mapScreen.querySelector('#btn-map-back').addEventListener('click', () => {
      soundManager.playClick();
      this.setScreen('SPLASH');
    });

    const garageBtn = mapScreen.querySelector('#btn-map-garage');
    if (garageBtn) {
      garageBtn.addEventListener('click', () => {
        soundManager.playClick();
        this.previousScreen = 'MAP';
        this.setScreen('GARAGE');
      });
    }

    this.root.appendChild(mapScreen);
    this.updateCityDetail(mapScreen.querySelector('#city-detail'));

    // Centrage initial fluide de la vue sur la ville sélectionnée
    setTimeout(() => {
      if (this.selectedMapCity) {
        centerOnCity(this.selectedMapCity, false);
      }
    }, 60);
  }

  triggerCityPinRipple(pinElement) {
    const ring = pinElement.querySelector('.city-pulse-ring');
    if (ring) {
      ring.style.animation = 'none';
      void ring.offsetHeight; // Reflow
      ring.style.animation = 'pinRippleWave 0.8s ease-out';
    }
  }

  updateCityDetail(detailCard) {
    if (!detailCard) return;
    const city = this.selectedMapCity;
    if (!city) return;

    const currentBikeId = storage.getEquippedBike() || gameState.selectedBike?.id || 'tank';
    const currentBike = BIKES.find(b => b.id === currentBikeId) || BIKES[0];

    const stageIndex = CITIES.findIndex(c => c.id === city.id) + 1;
    const prevIdx = (stageIndex - 2 + CITIES.length) % CITIES.length;
    const nextIdx = stageIndex % CITIES.length;
    const prevCity = CITIES[prevIdx];
    const nextCity = CITIES[nextIdx];

    const unlocked = storage.isCityUnlocked(city.id);
    const isExterminated = storage.isCityExterminated(city.id);
    const cityDestruction = storage.getCityDestruction(city.id);
    const cityData = storage.getCityData(city.id);
    const starsHtml = isExterminated ? '★★★' : ('★'.repeat(cityData.stars) + '☆'.repeat(3 - cityData.stars));
    const biomeInfo = getCityBiomeInfo(city);
    const cityRegion = getCityRegion(city);

    detailCard.innerHTML = `
      <!-- 1. BARRE DE NAVIGATION PRÉCISE : CHEVRONS ERGONOMIQUES 44x44 & TITRE PLEINE LARGEUR (ZÉRO TEXTE COUPÉ) -->
      <div class="city-nav-bar">
        <button id="btn-card-prev-city" class="btn-nav-arrow" title="Étape précédente (${prevCity.name})" aria-label="Précédente">
          <span>◀</span>
        </button>
        <div class="city-nav-info">
          <div class="city-nav-top-meta">
            <span class="city-nav-step-badge">ÉTAPE ${stageIndex}/${CITIES.length} • ${cityRegion}</span>
            <span class="city-biome-pill" style="--biome-color: ${biomeInfo.badgeColor}; --biome-bg: ${biomeInfo.bgTint};">
              ${biomeInfo.icon} ${biomeInfo.label.toUpperCase()}
            </span>
            <span class="city-status-pill ${isExterminated ? 'status-ext' : (cityDestruction > 0 ? 'status-ext' : (unlocked ? 'status-unl' : 'status-loc'))}">
              ${isExterminated ? '☠️ CONDAMNÉE' : (cityDestruction > 0 ? `💥 ${cityDestruction}%` : (unlocked ? '⚡ LIBRE' : '🔒 VERR.'))}
            </span>
          </div>
          <div class="city-nav-title-row">
            <span class="city-nav-flag">${city.countryFlag || '🌍'}</span>
            <span class="city-nav-title" title="${city.name} (${city.country})">${city.name.toUpperCase()}</span>
          </div>
          <div class="city-nav-scenery-sub">${city.typeTag || city.monument || city.subtitle || ''}</div>
        </div>
        <button id="btn-card-next-city" class="btn-nav-arrow" title="Étape suivante (${nextCity.name})" aria-label="Suivante">
          <span>▶</span>
        </button>
      </div>

      <!-- 2. TÉLÉMÉTRIE ARCADE 3 PILIERS HAUTE LISIBILITÉ -->
      <div class="city-stats-grid">
        <div class="cstat-col">
          <span class="cstat-label">${cityDestruction > 0 ? '💥 DÉSTRUCTION' : '🎯 OBJECTIF'}</span>
          <span class="cstat-val ${cityDestruction > 0 ? 'text-red' : 'cstat-target'}">${cityDestruction > 0 ? `${cityDestruction}%` : `${city.targetScore.toLocaleString('fr-FR')} pts`}</span>
        </div>
        <div class="cstat-col">
          <span class="cstat-label">🏆 RECORD</span>
          <span class="cstat-val cstat-record">${cityData.bestScore ? cityData.bestScore.toLocaleString('fr-FR') + ' pts' : '0 pt'}</span>
        </div>
        <div class="cstat-col">
          <span class="cstat-label">⭐ ÉTOILES</span>
          <span class="cstat-val cstat-stars">${starsHtml}</span>
        </div>
      </div>

      <!-- 3. BANNIÈRE SÉLECTEUR D'ENGIN D'ASSAUT DÉDIÉE (PLEINE LARGEUR ET HAUTE VISIBILITÉ) -->
      <button id="btn-city-vehicle-shortcut" class="city-vehicle-dock-btn" title="Modifier votre bolide dans le Garage">
        <div class="veh-dock-left">
          <span class="veh-dock-icon">${currentBike.icon || '🪖'}</span>
          <div class="veh-dock-texts">
            <span class="veh-dock-sub">⚡ ENGIN D'ASSAUT ACTIF</span>
            <span class="veh-dock-name">${(currentBike.shortName || currentBike.name).toUpperCase()}</span>
          </div>
        </div>
        <span class="veh-dock-action">CHANGER ▾</span>
      </button>

      <!-- 4. DOCK D'ACTIONS PRINCIPAL ERGONOMIQUE HAUTE VISIBILITÉ -->
      <div class="city-main-actions-dock">
        ${isExterminated ? `
          <button id="btn-enter-ruins-3d" class="btn-arcade btn-enter-city-hero btn-city-ruins" title="Explorer les ruines de la métropole anéantie en 3D">
            <span class="btn-enter-hero-icon">☠️</span>
            <div class="btn-enter-hero-texts">
              <span class="btn-enter-hero-title">EXPLORER LES RUINES (3D) ▶</span>
              <span class="btn-enter-hero-desc">VISITER LA VILLE DÉVASTÉE (0 SURVIVANT)</span>
            </div>
          </button>
          <button id="btn-inspect-ruins-intel" class="btn-arcade btn-wmd-dock" title="Consulter le dossier d'extinction stratégique">
            <span class="wmd-dock-icon">📋</span>
            <div class="wmd-dock-texts">
              <span class="wmd-dock-title">DOSSIER</span>
              <span class="wmd-dock-sub">RAPPORT</span>
            </div>
          </button>
        ` : (unlocked ? `
          <button id="btn-enter-city-race" class="btn-arcade btn-enter-city-hero" title="Lancer l'assaut">
            <span class="btn-enter-hero-icon">⚡</span>
            <div class="btn-enter-hero-texts">
              <span class="btn-enter-hero-title">LANCER L'ASSAUT ▶</span>
              <span class="btn-enter-hero-desc">OBJECTIF : ${city.targetScore.toLocaleString('fr-FR')} PTS</span>
            </div>
          </button>
          <button id="btn-wmd-city" class="btn-arcade btn-wmd-dock" title="Lancer une Bombe Nucléaire ou Frappe Stratégique">
            <span class="wmd-dock-icon">☢️</span>
            <div class="wmd-dock-texts">
              <span class="wmd-dock-title">BOMBE NUCLÉAIRE</span>
              <span class="wmd-dock-sub">${cityDestruction > 0 ? `${cityDestruction}% DÉTRUITE` : 'FRAPPE MASSIVE'}</span>
            </div>
          </button>
        ` : `
          <button class="btn-arcade btn-enter-city-hero btn-enter-city-locked" disabled>
            <span class="btn-enter-hero-icon">🔒</span>
            <div class="btn-enter-hero-texts">
              <span class="btn-enter-hero-title">ÉTAPE VERROUILLÉE</span>
              <span class="btn-enter-hero-desc">${city.unlockScoreRequired.toLocaleString('fr-FR')} PTS REQUIS SUR LE TOUR</span>
            </div>
          </button>
        `)}
      </div>
    `;

    // Événements boutons Précédente / Suivante
    detailCard.querySelector('#btn-card-prev-city')?.addEventListener('click', (e) => {
      e?.stopPropagation();
      if (this.navigateMapCity) this.navigateMapCity(-1);
    });
    detailCard.querySelector('#btn-card-next-city')?.addEventListener('click', (e) => {
      e?.stopPropagation();
      if (this.navigateMapCity) this.navigateMapCity(1);
    });

    // Raccourci engin actif
    const cityVehBtn = detailCard.querySelector('#btn-city-vehicle-shortcut');
    if (cityVehBtn) {
      cityVehBtn.addEventListener('click', () => {
        this.showQuickVehicleModal();
      });
    }

    if (isExterminated) {
      detailCard.querySelector('#btn-enter-ruins-3d')?.addEventListener('click', () => {
        soundManager.playClick();
        gameState.selectCity(city.id);
        gameState.isRuinsMode = true;
        this.triggerCityEntryCinematic(city);
      });
      detailCard.querySelector('#btn-inspect-ruins-intel')?.addEventListener('click', () => {
        this.showExterminatedCityView(city);
      });
    } else if (unlocked) {
      const launchRun = () => {
        soundManager.playClick();
        gameState.selectCity(city.id);
        gameState.isRuinsMode = false;
        this.triggerCityEntryCinematic(city);
      };

      const launchBtn = detailCard.querySelector('#btn-enter-city-race');
      if (launchBtn) launchBtn.addEventListener('click', launchRun);

      const wmdBtn = detailCard.querySelector('#btn-wmd-city');
      if (wmdBtn) {
        wmdBtn.addEventListener('click', () => {
          this.showWmdStrikeModal(city);
        });
      }
    }
  }

  // --- VUE DÉTAILLÉE POST-APOCALYPTIQUE D'UNE VILLE EXTERMINÉE (INSPECTION SANS COURSE) ---
  showExterminatedCityView(city) {
    soundManager.playClick();
    this.closeActiveModals();

    const victimPop = city.population || city.exterminationTarget || 500000;
    const overlay = document.createElement('div');
    overlay.id = 'modal-city-ruins';
    overlay.className = 'ruins-view-overlay';
    this.activeModals.push(overlay);

    overlay.innerHTML = `
      <div class="ruins-view-container">
        <!-- Bannière d'alerte risque biologique / atomique maximal -->
        <div class="ruins-hazard-banner">
          <span class="hazard-stripes"></span>
          <span class="hazard-title">⚠️ ZONE SINISTRÉE INTERDITE • NIVEAU DE DANGER CRITIQUE ⚠️</span>
          <span class="hazard-stripes"></span>
        </div>

        <!-- Décor Apocalyptique Ciel Rouge & Ruines Urbaines -->
        <div class="ruins-skyline-card">
          <div class="ruins-ash-particles" id="ruins-ash-container"></div>
          <div class="ruins-smoke-layer"></div>
          <div class="ruins-skyline-art">
            <span class="ruins-icon-big">🏙️🔥🏚️☢️</span>
          </div>
          <div class="ruins-city-badge">
            <span class="ruins-flag">${city.countryFlag || '🌍'}</span>
            <div class="ruins-city-texts">
              <h2 class="ruins-city-name">${city.name.toUpperCase()}</h2>
              <span class="ruins-city-sub">${city.country || 'Europe'} • COORDONNÉES SATELLITE KH-12</span>
            </div>
            <span class="ruins-status-tag">CONDAMNÉE ☠️</span>
          </div>
        </div>

        <!-- Rapport Officiel d'Anéantissement Stratégique -->
        <div class="ruins-report-card">
          <div class="ruins-report-header">
            <span>💀</span>
            <h3>DOSSIER D'EXTINCTION STRATÉGIQUE</h3>
          </div>

          <div class="ruins-stats-grid">
            <div class="ruins-stat-box">
              <span class="ruins-stat-lbl">POPULATION SURVIVANTE</span>
              <span class="ruins-stat-val text-red">0 ÂME (ÉRADICATION 100%)</span>
            </div>
            <div class="ruins-stat-box">
              <span class="ruins-stat-lbl">VICTIMES VAPORISÉES</span>
              <span class="ruins-stat-val text-yellow">${victimPop.toLocaleString('fr-FR')} HABITANTS</span>
            </div>
            <div class="ruins-stat-box">
              <span class="ruins-stat-lbl">RADIATIONS RÉSIDUELLES</span>
              <span class="ruins-stat-val text-orange">480 Sv/h (LÉTALITÉ IMMÉDIATE)</span>
            </div>
            <div class="ruins-stat-box">
              <span class="ruins-stat-lbl">STATUT GÉOGRAPHIQUE</span>
              <span class="ruins-stat-val text-cyan">RUINES CONDAMNÉES & SCELLÉES</span>
            </div>
          </div>

          <div class="ruins-intel-text">
            Cette métropole a été intégralement détruite par frappe d'extinction massive. Les infrastructures routières, boulevards et circuits de compétition sont réduits en poussière radioactive stérile. Aucun assaut mécanique n'est possible dans ce secteur.
          </div>
        </div>

        <!-- Boutons d'Action : Visite 3D et Retour -->
        <div style="display: flex; gap: 10px; width: 100%; margin-top: 14px;">
          <button id="btn-ruins-enter-3d-modal" class="btn-arcade btn-enter-city-hero btn-city-ruins" style="flex: 1.5; margin: 0; padding: 12px 14px;">
            <span class="btn-enter-hero-icon">☠️</span>
            <div class="btn-enter-hero-texts">
              <span class="btn-enter-hero-title">ENTRER DANS LES RUINES (3D) ▶</span>
              <span class="btn-enter-hero-desc">PILOTER DANS LA VILLE DÉVASTÉE</span>
            </div>
          </button>
          <button id="btn-close-ruins-view" class="btn-arcade btn-ruins-back" style="flex: 1; margin: 0; padding: 12px 10px;">
            <span>◀ RETOUR CARTE</span>
          </button>
        </div>
      </div>
    `;

    this.root.appendChild(overlay);

    overlay.querySelector('#btn-ruins-enter-3d-modal')?.addEventListener('click', () => {
      soundManager.playClick();
      clearInterval(geigerInterval);
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      gameState.selectCity(city.id);
      gameState.isRuinsMode = true;
      this.triggerCityEntryCinematic(city);
    });

    // Audio d'ambiance compteur Geiger
    soundManager.playGeigerClick();
    const geigerInterval = setInterval(() => {
      if (!document.getElementById('modal-city-ruins')) {
        clearInterval(geigerInterval);
        return;
      }
      if (Math.random() < 0.6) {
        soundManager.playGeigerClick();
      }
    }, 450);

    // Particules de cendres flottantes
    const ashContainer = overlay.querySelector('#ruins-ash-container');
    if (ashContainer) {
      for (let i = 0; i < 24; i++) {
        const flake = document.createElement('div');
        flake.className = 'ash-flake';
        flake.style.left = `${Math.random() * 100}%`;
        flake.style.animationDuration = `${2.5 + Math.random() * 3.5}s`;
        flake.style.animationDelay = `${Math.random() * 2}s`;
        ashContainer.appendChild(flake);
      }
    }

    overlay.querySelector('#btn-close-ruins-view')?.addEventListener('click', () => {
      soundManager.playClick();
      clearInterval(geigerInterval);
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
    });
  }

  // --- SÉLECTEUR RAPIDE D'ENGIN D'ASSAUT DEPUIS LA CARTE ---
  showQuickVehicleModal() {
    soundManager.playClick();
    const existing = document.getElementById('modal-quick-vehicle');
    if (existing) existing.remove();

    const currentBikeId = storage.getEquippedBike() || gameState.selectedBike?.id || 'tank';

    const modal = document.createElement('div');
    modal.id = 'modal-quick-vehicle';
    modal.className = 'tactical-modal-overlay';

    modal.innerHTML = `
      <div class="tactical-modal-card quick-vehicle-modal-card">
        <div class="tactical-modal-header">
          <div class="tactical-modal-title">
            <span>🪖</span>
            <h3>ARSENAL & CHOIX D'ENGIN</h3>
          </div>
          <button id="btn-close-quick-veh" class="btn-close-modal">✕</button>
        </div>

        <p class="quick-veh-subtitle">
          Sélectionnez et chargez immédiatement votre bolide d'assaut lourd :
        </p>

        <div class="quick-vehicle-grid">
          ${BIKES.map(bike => {
            const isEquipped = bike.id === currentBikeId;
            return `
              <div class="quick-veh-item ${isEquipped ? 'equipped' : ''} unlocked"
                   data-bike-id="${bike.id}">
                <div class="quick-veh-icon">${bike.icon || '🏍️'}</div>
                <div class="quick-veh-details">
                  <div class="quick-veh-name-row">
                    <span class="quick-veh-name">${bike.shortName || bike.name}</span>
                    ${isEquipped ? '<span class="quick-veh-badge-equipped">ÉQUIPÉ ✅</span>' : ''}
                  </div>
                  <div class="quick-veh-category">${bike.category || 'VÉHICULE D\'ASSAUT'}</div>
                  <div class="quick-veh-weapon">💥 ${bike.tagline || bike.weaponName || 'Arme de carnage'}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="quick-veh-footer">
          <button id="btn-open-full-garage" class="btn-arcade btn-secondary" style="flex: 1; padding: 12px;">
            <span>🔧 OUVRIR LE GARAGE COMPLET (PEINTURES & STATS)</span>
          </button>
        </div>
      </div>
    `;

    this.root.appendChild(modal);

    modal.querySelector('#btn-close-quick-veh').addEventListener('click', () => {
      soundManager.playClick();
      modal.remove();
    });

    modal.querySelector('#btn-open-full-garage').addEventListener('click', () => {
      soundManager.playClick('garage');
      modal.remove();
      this.previousScreen = 'MAP';
      this.setScreen('GARAGE');
    });

    modal.querySelectorAll('.quick-veh-item').forEach(item => {
      item.addEventListener('click', () => {
        const bikeId = item.getAttribute('data-bike-id');
        storage.equipBike(bikeId);
        gameState.selectBike(bikeId);
        soundManager.playClick('garage');
        modal.remove();
        if (this.onAction) this.onAction('BIKE_EQUIPPED', bikeId);
        this.render();
        this.showToastUnlock({ name: `Engin équipé : ${gameState.selectedBike.shortName || gameState.selectedBike.name}` });
      });
    });
  }

  // --- MODAL DE RÉINITIALISATION DE L'AVANCEMENT WORLDMAGEDDON ---
  showResetProgressionModal() {
    soundManager.playClick();
    const existing = document.getElementById('modal-reset-progression');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-reset-progression';
    modal.className = 'tactical-modal-overlay';

    modal.innerHTML = `
      <div class="tactical-modal-card reset-modal-card">
        <div class="tactical-modal-header" style="border-bottom-color: #ff4757;">
          <div class="tactical-modal-title" style="color: #ff4757;">
            <span>⚠️</span>
            <h3>RÉINITIALISER L'AVANCEMENT ?</h3>
          </div>
          <button id="btn-close-reset-modal" class="btn-close-modal">✕</button>
        </div>

        <div style="padding: 16px; text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 8px;">🔄</div>
          <p style="font-size: 0.95rem; line-height: 1.5; color: #ced6e0; margin: 0 0 16px 0;">
            Voulez-vous vraiment <strong style="color: #ff4757;">réinitialiser toute la campagne Worldmageddon</strong> ?
          </p>
          <div style="background: rgba(255, 71, 87, 0.12); border: 1px solid rgba(255, 71, 87, 0.4); border-radius: 12px; padding: 12px; text-align: left; font-size: 0.85rem; color: #ff7675; margin-bottom: 20px; line-height: 1.6;">
            • Toutes les villes fermées et exterminées seront <strong>réouvertes</strong>.<br>
            • Les scores de villes et étoiles seront <strong>remis à zéro</strong>.<br>
            • Le compteur total de victimes sera <strong>réinitialisé</strong>.<br>
            • Vos pièces d'or et véhicules débloqués seront <em>conservés</em>.
          </div>

          <div style="display: flex; gap: 10px;">
            <button id="btn-cancel-reset" class="btn-arcade btn-secondary" style="flex: 1; padding: 12px;">
              <span>ANNULER</span>
            </button>
            <button id="btn-confirm-reset" class="btn-arcade" style="flex: 1.3; padding: 12px; background: linear-gradient(135deg, #eb4d4b, #c0392b); border-color: #ff7675; color: #ffffff;">
              <span>💥 CONFIRMER LE RESET</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.root.appendChild(modal);

    modal.querySelector('#btn-close-reset-modal').addEventListener('click', () => {
      soundManager.playClick();
      modal.remove();
    });

    modal.querySelector('#btn-cancel-reset').addEventListener('click', () => {
      soundManager.playClick();
      modal.remove();
    });

    modal.querySelector('#btn-confirm-reset').addEventListener('click', () => {
      storage.resetWorldmageddonProgression();
      soundManager.playExplosion();
      modal.remove();
      this.showToastUnlock({ name: '🔄 Campagne réinitialisée ! Toutes les villes sont réouvertes.' });
      this.render();
    });
  }

  // --- MODAL DE FRAPPE D'EXTINCTION MASSIVE (WMD) ---
  showWmdStrikeModal(city) {
    soundManager.playClick();
    const existing = document.getElementById('modal-wmd-strike');
    if (existing) existing.remove();

    const victimPop = city.population || city.exterminationTarget || 500000;

    const modal = document.createElement('div');
    modal.id = 'modal-wmd-strike';
    modal.className = 'tactical-modal-overlay';

    modal.innerHTML = `
      <div class="tactical-modal-card wmd-modal-card">
        <div class="tactical-modal-header" style="border-bottom-color: #ff3838;">
          <div class="tactical-modal-title" style="color: #ff3838;">
            <span>☢️</span>
            <h3>CENTRE DE FRAPPE D'EXTINCTION MASSIVE</h3>
          </div>
          <button id="btn-close-wmd-modal" class="btn-close-modal">✕</button>
        </div>

        <div class="wmd-target-banner">
          <div class="wmd-target-flag">${city.countryFlag || '🌍'}</div>
          <div class="wmd-target-details">
            <span class="wmd-target-name">${city.name.toUpperCase()} (${city.country || 'Europe'})</span>
            <span class="wmd-target-pop">Population Cible : <strong>${victimPop.toLocaleString('fr-FR')} âmes</strong></span>
          </div>
          <span class="wmd-target-badge">PRÊT AU TIR</span>
        </div>

        <p class="wmd-instructions">
          Choisissez l'arme stratégique pour anéantir cette ville et clore définitivement son accès :
        </p>

        <div class="wmd-weapons-grid">
          <!-- 1. Missile Thermonucléaire 50MT -->
          <div class="wmd-weapon-card weapon-nuke" data-weapon="NUKE">
            <div class="wmd-weapon-icon">☢️</div>
            <div class="wmd-weapon-body">
              <div class="wmd-weapon-name">MISSILE THERMONUCLÉAIRE 50MT</div>
              <div class="wmd-weapon-desc">Tête balistique ICBM lourde. Onde de choc cyclopéenne et blast atomique pulvérisant le centre urbain.</div>
              <div class="wmd-weapon-tag">💥 VAPORISATION TOTALE</div>
            </div>
            <button class="wmd-fire-btn btn-fire-nuke">DÉTONER ▶</button>
          </div>

          <!-- 2. Tapis de Bombardement Massif -->
          <div class="wmd-weapon-card weapon-carpet" data-weapon="CARPET">
            <div class="wmd-weapon-icon">🚀</div>
            <div class="wmd-weapon-body">
              <div class="wmd-weapon-name">TAPIS DE BOMBARDEMENT MASSIF</div>
              <div class="wmd-weapon-desc">Flotte de bombardiers lourds MOAB & Napalm. Tempête de feu incendiaire ininterrompue.</div>
              <div class="wmd-weapon-tag">🔥 TEMPÊTE DE FEU</div>
            </div>
            <button class="wmd-fire-btn btn-fire-carpet">PILONNER ▶</button>
          </div>

          <!-- 3. Rayon Orbital Pulsar -->
          <div class="wmd-weapon-card weapon-orbital" data-weapon="ORBITAL">
            <div class="wmd-weapon-icon">🛰️</div>
            <div class="wmd-weapon-body">
              <div class="wmd-weapon-name">CANON PARTICULAIRE ORBITAL</div>
              <div class="wmd-weapon-desc">Satellite en orbite basse. Faisceau laser ionique pulsé désintégrant chaque bloc urbain.</div>
              <div class="wmd-weapon-tag">⚡ DÉSINTÉGRATION IONIQUE</div>
            </div>
            <button class="wmd-fire-btn btn-fire-orbital">TIRER ▶</button>
          </div>

          <!-- 4. Aérosol Chimique Neuro-Toxique -->
          <div class="wmd-weapon-card weapon-bio" data-weapon="BIO">
            <div class="wmd-weapon-icon">☣️</div>
            <div class="wmd-weapon-body">
              <div class="wmd-weapon-name">AÉROSOL CHIMIQUE NEURO-TOXIQUE</div>
              <div class="wmd-weapon-desc">Brumisation aéroportée furtive. Agent létal foudroyant 100% de la biomasse en quelques secondes.</div>
              <div class="wmd-weapon-tag">☠️ ASYSTOLIE FOUDROYANTE</div>
            </div>
            <button class="wmd-fire-btn btn-fire-bio">DISPERSER ▶</button>
          </div>
        </div>

        <div class="wmd-modal-footer">
          <button id="btn-cancel-wmd" class="btn-arcade btn-secondary" style="width: 100%; padding: 12px;">
            <span>ANNULER L'ORDRE D'EXTINCTION</span>
          </button>
        </div>
      </div>
    `;

    this.root.appendChild(modal);

    modal.querySelector('#btn-close-wmd-modal').addEventListener('click', () => {
      soundManager.playClick();
      modal.remove();
    });

    modal.querySelector('#btn-cancel-wmd').addEventListener('click', () => {
      soundManager.playClick();
      modal.remove();
    });

    modal.querySelectorAll('.wmd-weapon-card').forEach(card => {
      card.addEventListener('click', () => {
        const weaponType = card.getAttribute('data-weapon');
        modal.remove();
        this.simulateWmdExtinction(city, weaponType, victimPop);
      });
    });
  }

  // --- SIMULATION TACTIQUE D'EXTINCTION MASSIVE APOCALYPTIQUE PLEIN ÉCRAN ---
  simulateWmdExtinction(city, weaponType, victimPop) {
    this.closeActiveModals();
    soundManager.playSupersonicJet();

    const initialDestruction = storage.getCityDestruction(city.id) || 0;
    let strikeDamage = 22;
    if (weaponType === 'NUKE') strikeDamage = 24;
    else if (weaponType === 'CARPET') strikeDamage = 20;
    else if (weaponType === 'ORBITAL') strikeDamage = 28;
    else if (weaponType === 'BIO') strikeDamage = 16;

    const targetDestruction = Math.min(100, initialDestruction + strikeDamage);
    const totalPop = city.population || city.exterminationTarget || 500000;
    const strikeVictims = Math.round(totalPop * (strikeDamage / 100));
    const initialSurvivors = Math.max(0, totalPop - Math.round(totalPop * (initialDestruction / 100)));

    const overlay = document.createElement('div');
    overlay.className = `wmd-simulation-overlay wmd-sim-${weaponType.toLowerCase()}`;
    overlay.style.cssText = `
      position: fixed; inset: 0; background: #02060d; z-index: 10000;
      overflow: hidden; font-family: 'Montserrat', sans-serif; pointer-events: auto;
    `;
    this.activeModals.push(overlay);

    let weaponTitle = '☢️ FRAPPE NUCLÉAIRE BALISTIQUE 50MT';
    let weaponColor = '#ff3838';
    let weaponIcon = '☢️';

    if (weaponType === 'CARPET') {
      weaponTitle = '🚀 TAPIS DE BOMBARDEMENT MASSIF B-52';
      weaponColor = '#ff9f43';
      weaponIcon = '🚀';
    } else if (weaponType === 'ORBITAL') {
      weaponTitle = '🛰️ RAYON IONIQUE SATELLITAIRE PULSAR';
      weaponColor = '#00cec9';
      weaponIcon = '🛰️';
    } else if (weaponType === 'BIO') {
      weaponTitle = '☣️ AÉROSOL CHIMIQUE NEURO-TOXIQUE';
      weaponColor = '#2ed573';
      weaponIcon = '☣️';
    }

    overlay.innerHTML = `
      <!-- CANVAS SATELLITE 60 FPS PLEIN ÉCRAN HAUTE FIDÉLITÉ -->
      <canvas id="wmd-tactical-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; display: block; z-index: 1;"></canvas>

      <!-- EFFETS CRT SCANLINES & FLASH THERMIQUE DE DÉTONATION -->
      <div class="wmd-crt-scanlines" style="position: absolute; inset: 0; pointer-events: none; z-index: 5;"></div>
      <div class="wmd-sim-flash" id="wmd-screen-flash" style="position: absolute; inset: 0; pointer-events: none; z-index: 6;"></div>

      <!-- INTERFACE HUD MILITAIRE RECON KH-12 FLOTTANTE SUR LE CANVAS -->
      <div style="position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; justify-content: space-between; padding: calc(env(safe-area-inset-top, 20px) + 8px) 14px calc(env(safe-area-inset-bottom, 20px) + 12px) 14px; box-sizing: border-box; pointer-events: none;">
        
        <!-- BANDEAU SUPÉRIEUR : TÉLÉMÉTRIE SATELLITE ORBITALE KH-12 -->
        <div class="wmd-sat-header" style="pointer-events: auto; width: 100%; max-width: 620px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; background: rgba(8, 14, 26, 0.92); backdrop-filter: blur(12px); border: 1.5px solid ${weaponColor}; border-radius: 14px; padding: 10px 14px; box-sizing: border-box; box-shadow: 0 4px 20px rgba(0,0,0,0.8);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.6rem;">🛰️</span>
            <div>
              <div style="font-size: 0.65rem; color: #a4b0be; font-weight: 800; letter-spacing: 1px;">SATELLITE RECON KH-12 CRYSTAL • ALT 380 KM</div>
              <div style="font-size: 0.95rem; font-weight: 950; color: #ffffff; letter-spacing: 0.5px;">${city.countryFlag || '🌍'} ${city.name.toUpperCase()} (CIBLE PRIORITAIRE)</div>
            </div>
          </div>
          <div style="text-align: right; display: flex; align-items: center; gap: 10px;">
            <div>
              <div style="font-size: 0.68rem; color: ${weaponColor}; font-weight: 950; letter-spacing: 0.8px;" id="wmd-status-phase">T-03 : ACQUISITION</div>
              <div style="font-size: 0.78rem; font-family: monospace; color: #fffa65; font-weight: 900;">POP : ${totalPop.toLocaleString('fr-FR')}</div>
            </div>
            <button id="btn-wmd-skip" style="background: rgba(255,255,255,0.14); border: 1.5px solid rgba(255,255,255,0.3); color: #fffa65; border-radius: 8px; padding: 5px 10px; font-size: 0.72rem; font-weight: 950; cursor: pointer; letter-spacing: 0.5px;">PASSER ⏩</button>
          </div>
        </div>

        <!-- BANNIÈRE CENTRALE DE PHASE D'ATTAQUE -->
        <div id="wmd-impact-banner" style="pointer-events: none; align-self: center; background: rgba(5, 10, 20, 0.9); backdrop-filter: blur(8px); border: 2px solid ${weaponColor}; color: #fffa65; padding: 6px 18px; border-radius: 20px; font-weight: 950; font-size: 0.88rem; letter-spacing: 1.2px; text-shadow: 0 0 12px rgba(255, 250, 101, 0.6); box-shadow: 0 4px 18px rgba(0,0,0,0.85);">
          🎯 VERROUILLAGE SATELLITE EN COURS...
        </div>

        <!-- BANDEAU INFÉRIEUR : COMPTEUR DE PERTES EN DIRECT & VALIDATION -->
        <div style="pointer-events: auto; width: 100%; max-width: 620px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px;">
          
          <div class="wmd-telemetry-card" style="background: rgba(8, 14, 26, 0.94); backdrop-filter: blur(14px); border: 1.5px solid rgba(255, 255, 255, 0.22); border-radius: 16px; padding: 12px 16px; box-sizing: border-box; display: flex; flex-direction: column; gap: 7px; box-shadow: 0 6px 24px rgba(0,0,0,0.85);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.72rem; color: #ced6e0; font-weight: 850; letter-spacing: 0.8px;">💀 BILAN ESTIMÉ DES PERTES HUMAINES</span>
              <span style="font-size: 0.76rem; color: #ff4757; font-weight: 950;" id="wmd-telemetry-destruction">DÉSTRUCTION : ${initialDestruction}%</span>
            </div>

            <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px;">
              <div id="wmd-live-counter" style="font-size: 1.5rem; font-weight: 950; color: #fffa65; font-family: monospace; letter-spacing: 0.5px; text-shadow: 0 0 18px rgba(255, 250, 101, 0.85);">
                +0 VICTIMES
              </div>
              <div id="wmd-survivors-counter" style="font-size: 0.95rem; font-weight: 900; color: #ff7675; font-family: monospace;">
                SURVIVANTS : ${initialSurvivors.toLocaleString('fr-FR')}
              </div>
            </div>

            <!-- Jauge d'anéantissement urbain -->
            <div style="width: 100%; height: 9px; background: rgba(255, 255, 255, 0.12); border-radius: 5px; overflow: hidden;">
              <div id="wmd-live-progress" style="width: ${initialDestruction}%; height: 100%; background: linear-gradient(90deg, #fffa65, #ff4757, #b71540); transition: width 0.08s linear;"></div>
            </div>

            <!-- Journal télémétrique en temps réel de destruction par secteurs -->
            <div id="wmd-sector-log" style="background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(255, 71, 87, 0.35); border-radius: 8px; padding: 6px 10px; font-family: monospace; font-size: 0.70rem; color: #2ed573; max-height: 50px; overflow: hidden; display: flex; flex-direction: column; gap: 2px;">
              <div>[T-0.0s] Cible verrouillée • Acquisition satellite KH-12</div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.70rem; color: #a4b0be; font-weight: 800;">
              <span>🔥 CHALEUR THERMIQUE : <strong id="wmd-rad-temp" style="color: #ff9f43;">22 °C</strong></span>
              <span>⚡ ÉTAT TACTIQUE : <strong style="color: #ff3838;">ZONE CONDAMNÉE</strong></span>
            </div>
          </div>

          <!-- BOUTON HÉRO DE CONDAMNATION FINALE -->
          <button id="btn-wmd-confirm-close" class="btn-arcade" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #eb4d4b, #c0392b); border: 2px solid #ff7675; color: #ffffff; font-weight: 950; font-size: 0.95rem; letter-spacing: 0.8px; opacity: 0.35; pointer-events: none; transition: opacity 0.3s, transform 0.15s; border-radius: 14px; box-shadow: 0 4px 20px rgba(235, 77, 75, 0.5);">
            <span>⏳ EXTERMINATION EN COURS...</span>
          </button>
        </div>
      </div>
    `;

    this.root.appendChild(overlay);

    // Reveal cinématique GSAP des éléments de télémétrie militaire
    const satHeader = overlay.querySelector('.wmd-sat-header');
    const telemetryCard = overlay.querySelector('.wmd-telemetry-card');
    const bannerEl = overlay.querySelector('#wmd-impact-banner');
    if (satHeader) gsap.from(satHeader, { y: -40, opacity: 0, duration: 0.45, ease: "power2.out" });
    if (telemetryCard) gsap.from(telemetryCard, { y: 40, opacity: 0, duration: 0.45, ease: "power2.out", delay: 0.1 });
    if (bannerEl) gsap.from(bannerEl, { scale: 0.6, opacity: 0, duration: 0.35, ease: "back.out(2)" });

    // Initialisation et boucle de rendu du Canvas Tactique Plein Écran (60 FPS Constant)
    const canvas = overlay.querySelector('#wmd-tactical-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(1.25, window.devicePixelRatio || 1); // Plafonné à 1.25x pour garantir 60 FPS sans chute GPU

    const resizeCanvas = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resizeCanvas();

    const w = window.innerWidth;
    const h = window.innerHeight;
    const centerX = w / 2;
    const centerY = h / 2;

    // Initialisation du Moteur PixiJS v8 Accéléré GPU (WebGL2 / WebGPU)
    const pixiRenderer = new WmdPixiRenderer();
    let usePixi = false;
    pixiRenderer.init(overlay, w, h).then(ok => {
      usePixi = ok;
    });

    // 1. GÉNÉRATION DE LA SKYLINE 3D DE LA MÉTROPOLE (IMMEUBLES, FENÊTRES, PONT, REFLETS)
    const horizonY = h * 0.62;
    const waterY = h * 0.66;

    // Étoiles nocturnes
    const stars = [];
    for (let s = 0; s < 75; s++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * (horizonY * 0.85),
        r: 0.6 + Math.random() * 1.4,
        twinkle: Math.random() * Math.PI * 2
      });
    }

    // Immeubles & Gratte-ciels multi-plans (arrière-plan + premier plan détaillé)
    const buildings = [];
    const buildLayer = (layerIdx, count, minH, maxH, minW, maxW, baseShade) => {
      let curX = -15;
      const step = (w + 30) / count;
      for (let i = 0; i < count; i++) {
        const bw = minW + Math.random() * (maxW - minW);
        const bh = minH + Math.random() * (maxH - minH);
        const bx = curX + (Math.random() - 0.5) * (step * 0.35);
        curX += step;
        const cols = Math.max(2, Math.floor(bw / 8));
        const rows = Math.max(3, Math.floor(bh / 10));
        const litWindows = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (Math.random() < (layerIdx === 0 ? 0.35 : 0.62)) {
              litWindows.push({
                rx: 4 + c * ((bw - 8) / cols),
                ry: 6 + r * ((bh - 10) / rows),
                color: Math.random() < 0.72 ? '#ffd369' : '#74b9ff',
                lit: true
              });
            }
          }
        }
        buildings.push({
          layer: layerIdx,
          x: bx,
          w: bw,
          h: bh,
          baseShade,
          hasSpire: Math.random() < 0.32,
          windows: litWindows,
          damage: 0, // 0..1
          collapseY: 0,
          tilt: 0,
          tiltDir: (bx + bw / 2 < centerX) ? -1 : 1,
          hit: false,
          fireSeeds: Array.from({ length: 3 }, () => ({
            ox: Math.random() * bw,
            phase: Math.random() * Math.PI * 2,
            size: 8 + Math.random() * 12
          }))
        });
      }
    };

    buildLayer(0, 26, h * 0.10, h * 0.25, 22, 44, '#0c1524'); // Arrière-plan
    buildLayer(1, 18, h * 0.14, h * 0.33, 28, 56, '#132033'); // Premier plan

    // Tour / Monument central emblématique
    buildings.push({
      layer: 2,
      x: centerX - 18,
      w: 36,
      h: h * 0.38,
      baseShade: '#1b2b44',
      hasSpire: true,
      isMonument: true,
      windows: Array.from({ length: 24 }, (_, k) => ({
        rx: 6 + (k % 3) * 9,
        ry: 14 + Math.floor(k / 3) * 14,
        color: '#fffa65',
        lit: true
      })),
      damage: 0,
      collapseY: 0,
      tilt: 0,
      tiltDir: 1,
      hit: false,
      fireSeeds: [
        { ox: 8, phase: 0.4, size: 16 },
        { ox: 18, phase: 1.9, size: 20 },
        { ox: 28, phase: 3.1, size: 15 }
      ]
    });

    // Voitures lumineuses sur le pont au premier plan
    const bridgeCars = [];
    for (let v = 0; v < 22; v++) {
      const dir = v % 2 === 0 ? 1 : -1;
      bridgeCars.push({
        x: Math.random() * w,
        dir,
        speed: (35 + Math.random() * 55) * dir,
        color: dir > 0 ? '#fffa65' : '#ff4757',
        alive: true
      });
    }

    // Projecteurs de défense aérienne balayant le ciel
    const searchlights = [
      { x: w * 0.18, phase: 0.2 },
      { x: w * 0.48, phase: 1.7 },
      { x: w * 0.82, phase: 3.1 }
    ];

    // 5. PARTICULES, DÉBRIS DE BÉTON ET BOULES DE FEU
    const particles = [];
    const spawnParticle = (x, y, vx, vy, color, size, life, decay, gravity = 0) => {
      if (particles.length > 420) return;
      particles.push({ x, y, vx, vy, color, size, life, maxLife: life, decay, gravity });
    };

    const spawnBuildingDebris = (bx, by, bw, colorBase) => {
      for (let d = 0; d < 14; d++) {
        const px = bx + Math.random() * bw;
        const py = by + Math.random() * 28;
        const vx = (Math.random() - 0.5) * 7.5;
        const vy = -2.5 - Math.random() * 7.0;
        const col = d % 3 === 0 ? '#ff9f43' : (d % 3 === 1 ? '#ff4757' : colorBase);
        spawnParticle(px, py, vx, vy, col, 2.5 + Math.random() * 4.5, 1.0 + Math.random() * 0.8, 0.016, 0.24);
      }
    };

    // Pour Carpet Bombing : vague de bombes sur toute la largeur de la skyline
    const carpetStrikes = [];
    if (weaponType === 'CARPET') {
      for (let s = 0; s < 22; s++) {
        const sx = (w * 0.06) + (s / 21) * (w * 0.88) + (Math.random() - 0.5) * 18;
        carpetStrikes.push({
          x: sx,
          y: horizonY - Math.random() * 26,
          delay: 1.65 + (s * 0.11),
          exploded: false,
          radius: 0
        });
      }
    }

    // Pour Laser Orbital : éclairs EMP le long de la skyline
    const empArcs = [];
    const createEmpArc = () => {
      const pts = [{ x: centerX, y: horizonY - 20 }];
      let curX = centerX;
      let curY = horizonY - 20;
      const dirX = Math.random() < 0.5 ? -1 : 1;
      const steps = 6 + Math.floor(Math.random() * 5);
      for (let step = 1; step <= steps; step++) {
        curX += dirX * (25 + Math.random() * 45);
        curY += (Math.random() - 0.55) * 38;
        pts.push({ x: curX, y: Math.min(waterY, curY) });
      }
      return { pts, life: 1.0 };
    };

    // Pour Aérosol Bio : nappes de gaz rampant dans les rues de la skyline
    const bioGasPuffs = [];
    if (weaponType === 'BIO') {
      for (let g = 0; g < 36; g++) {
        bioGasPuffs.push({
          x: centerX + (Math.random() - 0.5) * (w * 0.8),
          y: horizonY - 10 + (Math.random() - 0.5) * 70,
          vx: (Math.random() - 0.5) * 1.4,
          vy: (Math.random() - 0.6) * 0.6,
          radius: 26 + Math.random() * 35,
          targetRadius: 85 + Math.random() * 95,
          isViolet: (g % 2 === 0),
          opacity: 0
        });
      }
    }

    let startTime = performance.now();
    let simPhase = 'APPROACH';
    let shockwaveRadius = 0;
    let shockwaveMaxRadius = Math.hypot(w, h) * 0.85;
    let cameraShake = 0;
    let animFrameId = null;

    const impactBanner = overlay.querySelector('#wmd-impact-banner');
    const statusPhaseEl = overlay.querySelector('#wmd-status-phase');
    const liveCounterEl = overlay.querySelector('#wmd-live-counter');
    const survivorsEl = overlay.querySelector('#wmd-survivors-counter');
    const sectorLogEl = overlay.querySelector('#wmd-sector-log');
    const liveProgressEl = overlay.querySelector('#wmd-live-progress');
    const destrEl = overlay.querySelector('#wmd-telemetry-destruction');
    const radTempEl = overlay.querySelector('#wmd-rad-temp');
    const screenFlash = overlay.querySelector('#wmd-screen-flash');
    const confirmBtn = overlay.querySelector('#btn-wmd-confirm-close');

    let loggedMilestones = new Set();
    const addSectorLog = (msg) => {
      if (!sectorLogEl) return;
      const row = document.createElement('div');
      row.textContent = msg;
      sectorLogEl.appendChild(row);
      sectorLogEl.scrollTop = sectorLogEl.scrollHeight;
    };

    soundManager.playCountdownBeep(false);
    setTimeout(() => soundManager.playCountdownBeep(false), 550);
    setTimeout(() => soundManager.playCountdownBeep(true), 1100);

    let hasDetonated = false;
    let hasCompleted = false;

    const renderFrame = (now) => {
      try {
        const elapsed = (now - startTime) / 1000;

      // 1. PHASE D'APPROCHE (0s - 1.8s)
      if (elapsed < 1.8) {
        simPhase = 'APPROACH';
        const remainingT = Math.max(0, 1.8 - elapsed).toFixed(1);
        statusPhaseEl.textContent = `T-${remainingT}s : ACQUISITION`;

        if (weaponType === 'NUKE') {
          impactBanner.textContent = `☢️ OGIVE NUCLÉAIRE EN DESCENTE T-${remainingT}s`;
        } else if (weaponType === 'CARPET') {
          impactBanner.textContent = `✈️ ESCADRILLE B-52 SUR LA SKYLINE T-${remainingT}s`;
        } else if (weaponType === 'ORBITAL') {
          impactBanner.textContent = `🛰️ VERROUILLAGE FAISCEAU ORBITAL T-${remainingT}s`;
        } else if (weaponType === 'BIO') {
          impactBanner.textContent = `☣️ LARGAGE AÉROSOL TOXIQUE T-${remainingT}s`;
        }
      }
      // 2. PHASE DE DÉTONATION & IMPACT (1.8s - 4.6s)
      else if (elapsed >= 1.8 && !hasCompleted) {
        simPhase = 'DETONATION';
        if (!hasDetonated) {
          hasDetonated = true;
          if (screenFlash) {
            screenFlash.classList.add('flash-active');
            setTimeout(() => screenFlash.classList.remove('flash-active'), 800);
          }

          Haptic.carnage();
          cameraShake = (weaponType === 'NUKE' ? 28 : (weaponType === 'CARPET' ? 18 : (weaponType === 'ORBITAL' ? 22 : 10)));

          if (weaponType === 'NUKE') {
            soundManager.playNuclearAlarm();
            setTimeout(() => soundManager.playNuclearBlast(), 150);
          } else if (weaponType === 'CARPET') {
            soundManager.playExplosion();
            setTimeout(() => soundManager.playExplosion(), 250);
            setTimeout(() => soundManager.playExplosion(), 550);
            setTimeout(() => soundManager.playExplosion(), 850);
          } else if (weaponType === 'ORBITAL') {
            soundManager.playCrash();
            setTimeout(() => soundManager.playExplosion(), 200);
          } else {
            soundManager.playClick('nuclear');
            setTimeout(() => soundManager.playExplosion(), 300);
          }

          // Gerbe initiale de débris et d'étincelles depuis le centre-ville
          for (let p = 0; p < 140; p++) {
            const ang = -Math.PI * Math.random();
            const spd = 3.0 + Math.random() * 12.0;
            spawnParticle(
              centerX + (Math.random() - 0.5) * 40,
              horizonY - 10,
              Math.cos(ang) * spd,
              Math.sin(ang) * spd - 2.0,
              (p % 2 === 0 ? weaponColor : '#fffa65'),
              2.5 + Math.random() * 4.5,
              1.1 + Math.random() * 0.9,
              0.015,
              0.18
            );
          }
        }

        const detTime = elapsed - 1.8;
        const detDuration = 2.8;
        const detProgress = Math.min(1.0, detTime / detDuration);
        shockwaveRadius = detProgress * shockwaveMaxRadius;

        const currentDetPct = Math.round(initialDestruction + (targetDestruction - initialDestruction) * detProgress);
        const currentCasualties = Math.round(strikeVictims * Math.pow(detProgress, 0.65));
        const currentSurvivors = Math.max(0, totalPop - Math.round(totalPop * (currentDetPct / 100)));

        liveCounterEl.textContent = `+${currentCasualties.toLocaleString('fr-FR')} VICTIMES`;
        if (survivorsEl) survivorsEl.textContent = `SURVIVANTS : ${currentSurvivors.toLocaleString('fr-FR')}`;
        liveProgressEl.style.width = `${currentDetPct}%`;
        destrEl.textContent = `DÉSTRUCTION : ${currentDetPct}%`;
        radTempEl.textContent = `${Math.floor(22 + (currentDetPct / 100) * 5200)} °C`;

        if (detProgress >= 0.15 && !loggedMilestones.has('m1')) {
          loggedMilestones.add('m1');
          addSectorLog('[T+0.5s] 💥 Onde de choc : Façades & gratte-ciels éventrés');
        }
        if (detProgress >= 0.40 && !loggedMilestones.has('m2')) {
          loggedMilestones.add('m2');
          addSectorLog('[T+1.2s] 🔥 Tempête thermique : Effondrement du centre-ville');
        }
        if (detProgress >= 0.70 && !loggedMilestones.has('m3')) {
          loggedMilestones.add('m3');
          addSectorLog('[T+1.9s] ⚡ Blackout total : Ponts et réseaux pulvérisés');
        }

        impactBanner.textContent = (targetDestruction >= 100) ? `💥 ANÉANTISSEMENT DE ${city.name.toUpperCase()}...` : `💥 FRAPPE SUR ${city.name.toUpperCase()}...`;
        statusPhaseEl.textContent = `EXTINCTION : ${currentDetPct}%`;

        if (cameraShake > 0) cameraShake *= 0.93;

        if (detProgress >= 1.0) {
          hasCompleted = true;
          simPhase = (targetDestruction >= 100) ? 'EXTERMINATED' : 'DAMAGED';

          liveCounterEl.textContent = `+${strikeVictims.toLocaleString('fr-FR')} VICTIMES`;
          const finalSurvivors = Math.max(0, totalPop - Math.round(totalPop * (targetDestruction / 100)));
          if (survivorsEl) survivorsEl.textContent = `SURVIVANTS : ${finalSurvivors.toLocaleString('fr-FR')}`;
          liveProgressEl.style.width = `${targetDestruction}%`;
          destrEl.textContent = `DÉSTRUCTION : ${targetDestruction}%`;
          radTempEl.textContent = `${Math.floor(22 + (targetDestruction / 100) * 5200)} °C`;

          if (targetDestruction >= 100) {
            statusPhaseEl.textContent = `☠️ VILLE EXTERMINÉE`;
            impactBanner.textContent = `☠️ ${city.name.toUpperCase()} EN RUINES ET SCELLÉE (100%) !`;
            impactBanner.style.borderColor = '#ff4757';
            impactBanner.style.color = '#ff7675';

            if (!loggedMilestones.has('m4')) {
              loggedMilestones.add('m4');
              addSectorLog('[T+2.8s] ☠️ SKYLINE RASÉE • 0 SIGNAUX VITAUX');
            }

            soundManager.playEvilLaugh();
            soundManager.playVictory();
            Haptic.success();

            if (confirmBtn) {
              confirmBtn.style.opacity = '1';
              confirmBtn.style.pointerEvents = 'auto';
              confirmBtn.innerHTML = `<span>☠️ SCELLER ET CONDAMNER ${city.name.toUpperCase()} DÉFINITIVEMENT ▶</span>`;
            }
          } else {
            statusPhaseEl.textContent = `💥 FRAPPE RÉUSSIE (${targetDestruction}%)`;
            impactBanner.textContent = `💥 IMPACT CONFIRMÉ : ${city.name.toUpperCase()} DÉTRUITE À ${targetDestruction}% !`;
            impactBanner.style.borderColor = '#ff9f43';
            impactBanner.style.color = '#fffa65';

            if (!loggedMilestones.has('m4')) {
              loggedMilestones.add('m4');
              addSectorLog(`[T+2.8s] 💥 DÉGÂTS CONFIRMÉS : ${targetDestruction}% PULVÉRISÉ`);
            }

            soundManager.playVictory();
            Haptic.success();

            if (confirmBtn) {
              confirmBtn.style.opacity = '1';
              confirmBtn.style.pointerEvents = 'auto';
              confirmBtn.innerHTML = `<span>💥 VALIDER LA FRAPPE (${targetDestruction}% DÉTRUITE) ▶</span>`;
            }
          }
        }
      }

      // --- RENDU CINÉMATIQUE 3D SKYLINE (60 FPS) ---
      ctx.save();
      ctx.scale(dpr, dpr);

      if (cameraShake > 0.4) {
        ctx.translate((Math.random() - 0.5) * cameraShake, (Math.random() - 0.5) * cameraShake);
      }

      let currentProgress = 0;
      if (elapsed < 1.8) currentProgress = Math.min(1.0, elapsed / 1.8);
      else if (hasCompleted) currentProgress = 1.0;
      else currentProgress = Math.min(1.0, (elapsed - 1.8) / 2.8);

      // 1. CIEL DYNAMIQUE (Nuit étoilée -> Embrasement apocalypse -> Cendres rouges)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      if (simPhase === 'APPROACH') {
        skyGrad.addColorStop(0, '#04091a');
        skyGrad.addColorStop(0.55, '#0c1e3e');
        skyGrad.addColorStop(1, '#1e3557');
      } else {
        const burn = simPhase === 'EXTERMINATED' ? 0.65 : Math.min(1, currentProgress * 1.4);
        if (weaponType === 'ORBITAL') {
          skyGrad.addColorStop(0, '#030c1a');
          skyGrad.addColorStop(0.6, '#083358');
          skyGrad.addColorStop(1, '#00a8cc');
        } else if (weaponType === 'BIO') {
          skyGrad.addColorStop(0, '#091412');
          skyGrad.addColorStop(0.6, '#133329');
          skyGrad.addColorStop(1, '#2ed573');
        } else {
          skyGrad.addColorStop(0, '#120709');
          skyGrad.addColorStop(0.5, `rgba(${Math.round(45 + 140 * burn)}, ${Math.round(18 + 38 * burn)}, 16, 1)`);
          skyGrad.addColorStop(1, `rgba(${Math.round(110 + 135 * burn)}, ${Math.round(40 + 70 * burn)}, 18, 1)`);
        }
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, horizonY + 20);

      // Étoiles avant détonation
      if (simPhase === 'APPROACH') {
        ctx.fillStyle = '#ffffff';
        stars.forEach(st => {
          const tw = 0.35 + 0.55 * Math.abs(Math.sin(elapsed * 2.5 + st.twinkle));
          ctx.globalAlpha = tw;
          ctx.beginPath();
          ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Projecteurs de défense aérienne
        searchlights.forEach(sl => {
          const ang = -Math.PI / 2 + Math.sin(elapsed * 1.6 + sl.phase) * 0.48;
          const beamLen = horizonY * 0.9;
          const beamGrad = ctx.createLinearGradient(sl.x, horizonY, sl.x + Math.cos(ang) * beamLen, horizonY + Math.sin(ang) * beamLen);
          beamGrad.addColorStop(0, 'rgba(116, 185, 255, 0.25)');
          beamGrad.addColorStop(1, 'rgba(116, 185, 255, 0)');
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(sl.x - 4, horizonY);
          ctx.lineTo(sl.x + 4, horizonY);
          ctx.lineTo(sl.x + Math.cos(ang) * beamLen + 38, horizonY + Math.sin(ang) * beamLen);
          ctx.lineTo(sl.x + Math.cos(ang) * beamLen - 38, horizonY + Math.sin(ang) * beamLen);
          ctx.closePath();
          ctx.fill();
        });
      }

      // 2. MISE À JOUR & DESSIN DE LA SKYLINE (EFFONDREMENT PHYSIQUE DES IMMEUBLES)
      buildings.forEach(b => {
        const bxCenter = b.x + b.w / 2;
        if (simPhase === 'DETONATION' || simPhase === 'EXTERMINATED' || simPhase === 'DAMAGED') {
          let isImpacted = false;
          if (weaponType === 'CARPET') {
            for (const s of carpetStrikes) {
              if (s.exploded && Math.abs(bxCenter - s.x) < 62) {
                isImpacted = true;
                break;
              }
            }
          } else {
            const distFromCenter = Math.abs(bxCenter - centerX);
            isImpacted = distFromCenter <= shockwaveRadius * 0.92;
          }

          if (isImpacted) {
            if (!b.hit) {
              b.hit = true;
              spawnBuildingDebris(b.x, horizonY - b.h * 0.65, b.w, b.baseShade);
              b.windows.forEach(win => {
                if (Math.random() < 0.78) win.lit = false;
              });
            }
            const maxDmg = b.layer === 0 ? 0.55 : (weaponType === 'BIO' ? 0.25 : 0.72);
            b.damage = Math.min(maxDmg, b.damage + 0.018);
            if (weaponType !== 'BIO') {
              b.collapseY = b.h * b.damage * 0.78;
              b.tilt = b.tiltDir * b.damage * (b.isMonument ? 0.14 : 0.11);
            }
          }
        }

        ctx.save();
        const baseY = horizonY + (b.layer === 0 ? 0 : 6);
        ctx.translate(bxCenter, baseY);
        ctx.rotate(b.tilt);

        const visibleH = Math.max(12, b.h - b.collapseY);
        // Corps du bâtiment
        ctx.fillStyle = b.hit && weaponType !== 'BIO' ? '#171316' : b.baseShade;
        ctx.fillRect(-b.w / 2, -visibleH, b.w, visibleH);

        // Arête éclairée par l'explosion
        ctx.fillStyle = b.hit ? 'rgba(255, 118, 117, 0.35)' : 'rgba(116, 185, 255, 0.16)';
        ctx.fillRect(b.tiltDir > 0 ? -b.w / 2 : b.w / 2 - 2.5, -visibleH, 2.5, visibleH);

        // Antenne / flèche
        if (b.hasSpire && b.damage < 0.35) {
          ctx.strokeStyle = b.isMonument ? '#ffd369' : '#636e72';
          ctx.lineWidth = b.isMonument ? 3 : 1.6;
          ctx.beginPath();
          ctx.moveTo(0, -visibleH);
          ctx.lineTo(0, -visibleH - (b.isMonument ? 28 : 16));
          ctx.stroke();
          if (Math.floor(elapsed * 4) % 2 === 0) {
            ctx.fillStyle = '#ff3838';
            ctx.beginPath();
            ctx.arc(0, -visibleH - (b.isMonument ? 28 : 16), 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Fenêtres illuminées
        b.windows.forEach(win => {
          if (!win.lit || win.ry > visibleH - 6) return;
          ctx.fillStyle = win.color;
          ctx.fillRect(-b.w / 2 + win.rx, -visibleH + win.ry, 3.2, 4.5);
        });

        // Foyers d'incendie sur les bâtiments touchés
        if (b.hit && weaponType !== 'BIO') {
          b.fireSeeds.forEach(fs => {
            const flicker = 0.75 + 0.35 * Math.sin(elapsed * 16 + fs.phase);
            const fx = -b.w / 2 + fs.ox;
            const fy = -visibleH + 4;
            const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fs.size * flicker);
            fGrad.addColorStop(0, 'rgba(255, 250, 101, 0.92)');
            fGrad.addColorStop(0.45, 'rgba(255, 110, 48, 0.78)');
            fGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = fGrad;
            ctx.beginPath();
            ctx.arc(fx, fy, fs.size * flicker, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        ctx.restore();
      });

      // 3. EAU / BAIE AU PREMIER PLAN + REFLETS DE LA VILLE ET DES FLAMMES
      const waterGrad = ctx.createLinearGradient(0, horizonY, 0, h);
      waterGrad.addColorStop(0, simPhase === 'APPROACH' ? '#071426' : '#1b0d10');
      waterGrad.addColorStop(1, '#030710');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, horizonY, w, h - horizonY);

      // Lignes de reflets scintillants sur l'eau
      for (let r = 0; r < 18; r++) {
        const ry = horizonY + 8 + r * ((h - horizonY) / 20);
        const rw = 40 + Math.sin(elapsed * 4 + r) * 35 + (simPhase !== 'APPROACH' ? 80 : 0);
        ctx.fillStyle = simPhase === 'APPROACH'
          ? 'rgba(116, 185, 255, 0.10)'
          : (weaponType === 'ORBITAL' ? 'rgba(0, 206, 201, 0.16)' : (weaponType === 'BIO' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 118, 64, 0.18)'));
        ctx.fillRect(centerX - rw * (1 + r * 0.08) + Math.sin(elapsed * 2 + r) * 14, ry, rw * (2 + r * 0.15), 2);
      }

      // Pont routier traversant le premier plan + trafic automobile
      const bridgeY = horizonY + 14;
      ctx.fillStyle = '#0f1722';
      ctx.fillRect(0, bridgeY, w, 9);
      ctx.strokeStyle = 'rgba(255, 211, 105, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, bridgeY);
      ctx.lineTo(w, bridgeY);
      ctx.stroke();

      bridgeCars.forEach(car => {
        if (simPhase === 'APPROACH') {
          car.x += car.speed * (1 / 60);
          if (car.x > w + 10) car.x = -10;
          if (car.x < -10) car.x = w + 10;
        } else if (Math.abs(car.x - centerX) < shockwaveRadius) {
          car.alive = false;
        }
        if (car.alive) {
          ctx.fillStyle = car.color;
          ctx.fillRect(car.x - 2, bridgeY + 3, 4, 2.2);
        }
      });

      // Rendu PixiJS v8 Accéléré GPU (halos additifs)
      if (usePixi) {
        try {
          pixiRenderer.renderFrame(simPhase, weaponType, currentProgress, shockwaveRadius, w, h);
        } catch (pixiErr) {
          // Fallback silencieux vers le rendu 2D
        }
      }

      // =========================================================================
      // 4. ANIMATIONS SPÉCIFIQUES DES 4 ARMES SUR LA SKYLINE
      // =========================================================================

      // --- A. NUKE : B-2 + OGIVE PLONGEANTE -> CHAMPIGNON ATOMIQUE 3D SUR LA SKYLINE ---
      if (weaponType === 'NUKE') {
        if (simPhase === 'APPROACH') {
          const t = Math.min(1.0, elapsed / 1.8);
          const warheadX = w * 0.15 + (centerX - w * 0.15) * Math.pow(t, 1.35);
          const warheadY = -20 + (horizonY + 20) * Math.pow(t, 1.35);

          // Traînée incandescente de rentrée atmosphérique
          const trailGrad = ctx.createLinearGradient(w * 0.15, -20, warheadX, warheadY);
          trailGrad.addColorStop(0, 'rgba(255, 71, 87, 0)');
          trailGrad.addColorStop(0.7, 'rgba(255, 159, 67, 0.85)');
          trailGrad.addColorStop(1, '#ffffff');
          ctx.strokeStyle = trailGrad;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(w * 0.15, -20);
          ctx.lineTo(warheadX, warheadY);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(warheadX, warheadY, 5, 0, Math.PI * 2);
          ctx.fill();

          // Réticule de visée sur le centre-ville
          ctx.strokeStyle = '#ff3838';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(centerX, horizonY - 12, 34 - t * 14, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Onde de choc ovale en perspective sur la ville
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.ellipse(centerX, horizonY, shockwaveRadius, shockwaveRadius * 0.42, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Champignon atomique imposant montant dans le ciel
          const stemH = Math.min(h * 0.48, 80 + currentProgress * h * 0.42);
          const capY = horizonY - stemH;
          const capR = Math.min(w * 0.34, 48 + currentProgress * 125);

          // Base de feu au sol
          const baseFire = ctx.createRadialGradient(centerX, horizonY, 0, centerX, horizonY, capR * 0.9);
          baseFire.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          baseFire.addColorStop(0.35, 'rgba(255, 159, 67, 0.9)');
          baseFire.addColorStop(0.75, 'rgba(235, 77, 75, 0.6)');
          baseFire.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = baseFire;
          ctx.beginPath();
          ctx.ellipse(centerX, horizonY, capR * 0.9, capR * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();

          // Tige du champignon
          const stemW = capR * 0.28;
          const colGrad = ctx.createLinearGradient(centerX - stemW, horizonY, centerX + stemW, horizonY);
          colGrad.addColorStop(0, 'rgba(35, 35, 40, 0.88)');
          colGrad.addColorStop(0.5, 'rgba(255, 165, 60, 0.95)');
          colGrad.addColorStop(1, 'rgba(35, 35, 40, 0.88)');
          ctx.fillStyle = colGrad;
          ctx.fillRect(centerX - stemW, capY, stemW * 2, stemH);

          // Anneau de condensation blanc autour de la tige
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.ellipse(centerX, capY + stemH * 0.42, capR * 0.52, 12, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Chapeau volumétrique multicouche
          [-0.48, 0.48, -0.22, 0.22, 0].forEach((off, idx) => {
            const lx = centerX + off * capR;
            const ly = capY + Math.abs(off) * 18;
            const lr = idx === 4 ? capR * 0.72 : capR * 0.52;
            const lGrad = ctx.createRadialGradient(lx, ly - lr * 0.2, 0, lx, ly, lr);
            lGrad.addColorStop(0, 'rgba(255, 250, 140, 0.95)');
            lGrad.addColorStop(0.38, 'rgba(255, 110, 48, 0.9)');
            lGrad.addColorStop(0.75, 'rgba(42, 42, 48, 0.92)');
            lGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = lGrad;
            ctx.beginPath();
            ctx.ellipse(lx, ly, lr, lr * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();
          });

          // Éclairs volcaniques dans le nuage
          if (Math.random() < 0.4) {
            ctx.strokeStyle = '#dff9fb';
            ctx.lineWidth = 2;
            ctx.beginPath();
            let lx = centerX + (Math.random() - 0.5) * capR;
            let ly = capY;
            ctx.moveTo(lx, ly);
            for (let seg = 0; seg < 4; seg++) {
              lx += (Math.random() - 0.5) * 26;
              ly += 14 + Math.random() * 12;
              ctx.lineTo(lx, ly);
            }
            ctx.stroke();
          }
        }
      }

      // --- B. CARPET : ESCADRILLE B-52 + PLUIE DE BOMBES + MUR DE FEU SUR LA SKYLINE ---
      else if (weaponType === 'CARPET') {
        if (simPhase === 'APPROACH') {
          const t = elapsed / 1.8;
          const fleetX = -90 + (w + 180) * t;
          const fleetY = horizonY * 0.28;
          [-34, 0, 34].forEach((oy, idx) => {
            const bx = fleetX - idx * 36;
            const by = fleetY + oy;
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.moveTo(bx + 24, by);
            ctx.lineTo(bx - 18, by - 14);
            ctx.lineTo(bx - 28, by);
            ctx.lineTo(bx - 18, by + 14);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(bx - 16, by - 6); ctx.lineTo(bx - 110, by - 6);
            ctx.moveTo(bx - 16, by + 6); ctx.lineTo(bx - 110, by + 6);
            ctx.stroke();
          });
        } else {
          carpetStrikes.forEach(strike => {
            if (elapsed >= strike.delay) {
              if (!strike.exploded) {
                strike.exploded = true;
                cameraShake = Math.max(cameraShake, 12);
                soundManager.playExplosion();
                for (let p = 0; p < 18; p++) {
                  const ang = -Math.PI * Math.random();
                  const spd = 1.5 + Math.random() * 6.5;
                  spawnParticle(strike.x, strike.y, Math.cos(ang) * spd, Math.sin(ang) * spd, p % 2 === 0 ? '#ff9f43' : '#fffa65', 3, 0.8, 0.024, 0.16);
                }
              }
              strike.radius = Math.min(72, strike.radius + 3.2);
              const expGrad = ctx.createRadialGradient(strike.x, strike.y, 0, strike.x, strike.y, strike.radius);
              expGrad.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
              expGrad.addColorStop(0.32, 'rgba(255, 159, 67, 0.88)');
              expGrad.addColorStop(0.7, 'rgba(235, 77, 75, 0.55)');
              expGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = expGrad;
              ctx.beginPath();
              ctx.arc(strike.x, strike.y, strike.radius, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }
      }

      // --- C. ORBITAL : RAYON IONIQUE GIGANTESQUE DEPUIS L'ESPACE ---
      else if (weaponType === 'ORBITAL') {
        if (simPhase === 'APPROACH') {
          const t = Math.min(1.0, elapsed / 1.8);
          ctx.strokeStyle = `rgba(0, 206, 201, ${0.4 + 0.5 * t})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(centerX, 0);
          ctx.lineTo(centerX, horizonY);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.strokeStyle = '#00cec9';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(centerX, horizonY, 55 - t * 30, 20 - t * 10, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const beamWidth = Math.max(20, 72 * (1.0 - Math.min(0.75, (elapsed - 1.8) / 3.0)));
          const beamGrad = ctx.createLinearGradient(centerX - beamWidth, 0, centerX + beamWidth, 0);
          beamGrad.addColorStop(0, 'rgba(9, 132, 227, 0)');
          beamGrad.addColorStop(0.25, 'rgba(0, 206, 201, 0.92)');
          beamGrad.addColorStop(0.5, '#ffffff');
          beamGrad.addColorStop(0.75, 'rgba(0, 206, 201, 0.92)');
          beamGrad.addColorStop(1, 'rgba(9, 132, 227, 0)');
          ctx.fillStyle = beamGrad;
          ctx.fillRect(centerX - beamWidth, 0, beamWidth * 2, horizonY + 12);

          // Cratère de plasma au point d'impact
          const pGrad = ctx.createRadialGradient(centerX, horizonY, 0, centerX, horizonY, 120);
          pGrad.addColorStop(0, '#ffffff');
          pGrad.addColorStop(0.4, 'rgba(0, 206, 201, 0.85)');
          pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.ellipse(centerX, horizonY, 130, 42, 0, 0, Math.PI * 2);
          ctx.fill();

          if (Math.random() < 0.45 && empArcs.length < 10) empArcs.push(createEmpArc());
          for (let a = empArcs.length - 1; a >= 0; a--) {
            const arc = empArcs[a];
            arc.life -= 0.07;
            if (arc.life <= 0) { empArcs.splice(a, 1); continue; }
            ctx.strokeStyle = `rgba(129, 236, 236, ${arc.life})`;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(arc.pts[0].x, arc.pts[0].y);
            for (let i = 1; i < arc.pts.length; i++) ctx.lineTo(arc.pts[i].x, arc.pts[i].y);
            ctx.stroke();
          }
        }
      }

      // --- D. BIO : ÉPANDAGE + NUAGE NEURO-TOXIQUE ENGOUFFRANT LA SKYLINE ---
      else if (weaponType === 'BIO') {
        if (simPhase === 'APPROACH') {
          const t = Math.min(1.0, elapsed / 1.8);
          const planeX = -90 + (w + 180) * t;
          const planeY = horizonY * 0.34;
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.moveTo(planeX + 26, planeY);
          ctx.lineTo(planeX - 20, planeY - 16);
          ctx.lineTo(planeX - 12, planeY);
          ctx.lineTo(planeX - 20, planeY + 16);
          ctx.closePath();
          ctx.fill();
          const sprayGrad = ctx.createLinearGradient(planeX - 16, planeY, planeX - 160, planeY);
          sprayGrad.addColorStop(0, 'rgba(46, 213, 115, 0.85)');
          sprayGrad.addColorStop(1, 'rgba(46, 213, 115, 0)');
          ctx.fillStyle = sprayGrad;
          ctx.fillRect(planeX - 160, planeY - 12, 144, 24);
        } else {
          bioGasPuffs.forEach(puff => {
            puff.x += puff.vx;
            puff.y += puff.vy;
            puff.radius = Math.min(puff.targetRadius, puff.radius + 1.1);
            puff.opacity = Math.min(0.68, puff.opacity + 0.025);
            const gasGrad = ctx.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.radius);
            if (puff.isViolet) {
              gasGrad.addColorStop(0, `rgba(108, 92, 231, ${puff.opacity})`);
              gasGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            } else {
              gasGrad.addColorStop(0, `rgba(46, 213, 115, ${puff.opacity})`);
              gasGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            }
            ctx.fillStyle = gasGrad;
            ctx.beginPath();
            ctx.arc(puff.x, puff.y, puff.radius, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      // 5. PARTICULES, DÉBRIS DE BÉTON & ÉTINCELLES AVEC GRAVITÉ
      for (let i = particles.length - 1; i >= 0; i--) {
        const bp = particles[i];
        bp.x += bp.vx;
        bp.y += bp.vy;
        bp.vy += (bp.gravity || 0);
        bp.life -= bp.decay;
        if (bp.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, Math.min(1, bp.life / bp.maxLife));
        ctx.fillStyle = bp.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(bp.x - bp.size / 2, bp.y - bp.size / 2, bp.size, bp.size);
      }
      ctx.globalAlpha = 1.0;

      ctx.restore();
      } catch (frameErr) {
        console.error('[WMD Tactical Frame Error]:', frameErr);
      }

      animFrameId = requestAnimationFrame(renderFrame);
    };

    animFrameId = requestAnimationFrame(renderFrame);

    // Handler de validation de la frappe
    const handleClose = () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      pixiRenderer.destroy();
      const res = storage.addCityDestruction(city.id, strikeDamage, strikeVictims);
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.render();
      if (res.isNowExterminated) {
        this.showToastUnlock({ name: `☠️ ${city.name.toUpperCase()} EST DÉSORMAIS EXTERMINÉE ET CONDAMNÉE (100%) !` });
      } else {
        this.showToastUnlock({ name: `💥 FRAPPE RÉUSSIE : ${city.name.toUpperCase()} EST DÉTRUITE À ${res.newPct}% !` });
      }
    };

    // Bouton Passer (Accélérer l'extermination pour l'utilisateur pressé)
    const skipBtn = overlay.querySelector('#btn-wmd-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        soundManager.playClick();
        startTime = performance.now() - 5200; // Propulse immédiatement la simulation à son terme
      });
    }

    confirmBtn?.addEventListener('click', handleClose);
  }

  triggerCityEntryCinematic(city) {
    if (this.isEnteringCity) return;
    this.isEnteringCity = true;

    // Nettoyer toute transition orpheline préalable
    document.querySelectorAll('.city-entry-transition').forEach(el => el.remove());

    const isRuins = gameState.isRuinsMode;
    const overlay = document.createElement('div');
    overlay.className = `city-entry-transition ${isRuins ? 'city-entry-ruins' : ''}`;
    overlay.innerHTML = `
      <div class="city-entry-content">
        <div class="entry-sub">${isRuins ? '⚠️ ZONE SINISTRÉE INTERDITE • RECONNAISSANCE 3D' : `BIENVENUE EN ${city.country ? city.country.toUpperCase() : 'EUROPE'} • GRAND TOUR`}</div>
        <div class="entry-title">${isRuins ? '☠️ ' : (city.countryFlag || '')} ${city.name.toUpperCase()}</div>
        <div class="entry-tagline" style="color: ${isRuins ? '#ff4757' : '#ffd700'}; font-weight: 800; margin-top: 4px;">${isRuins ? '☢️ RADIATIONS 540 Sv/h • 0 SURVIVANT' : `🏛️ ${city.monument || city.subtitle}`}</div>
        <div style="font-size: 0.88rem; color: #ced6e0; margin-top: 4px;">${isRuins ? 'SECTEUR DÉTRUIT • VISITE DES RUINES' : city.subtitle}</div>
      </div>
    `;
    this.root.appendChild(overlay);

    if (isRuins) {
      soundManager.playGeigerClick();
    } else {
      soundManager.playVictory();
    }

    let launched = false;
    const launchNow = () => {
      if (launched) return;
      launched = true;
      try {
        overlay.classList.add('fade-out');
        if (this.onAction) {
          this.onAction('START_RUN', city);
        }
      } catch (err) {
        console.error('[UIManager] Erreur lors du lancement de START_RUN:', err);
      } finally {
        setTimeout(() => {
          overlay.remove();
          this.isEnteringCity = false;
        }, 180);
      }
    };

    overlay.addEventListener('click', launchNow);
    overlay.addEventListener('pointerdown', launchNow);
    setTimeout(launchNow, 550);
  }

  // --- 3. GARAGE ET PERSONNALISATION (NAVIGATION FLÈCHES ◀ ▶ ET RETOUR CARTE) ---
  renderGarageScreen() {
    const garage = document.createElement('div');
    garage.className = 'screen-garage interactive';

    const coins = storage.data.coins;
    if (!this.selectedGarageBike) {
      const equippedId = storage.getEquippedBike();
      this.selectedGarageBike = BIKES.find(b => b.id === equippedId) || BIKES[0];
    }
    let currentIdx = BIKES.findIndex(b => b.id === this.selectedGarageBike.id);
    if (currentIdx === -1) currentIdx = 0;

    // Déclencher immédiatement l'aperçu 3D en temps réel
    if (this.onAction) {
      this.onAction('PREVIEW_BIKE', this.selectedGarageBike);
    }

    garage.innerHTML = `
      <div class="garage-header">
        <button id="btn-garage-back" class="btn-arcade btn-ghost btn-sm" title="Retour">
          <span>← RETOUR</span>
        </button>
        <div style="text-align: center;">
          <h2 style="font-size: 1.45rem; font-weight: 900; margin: 0; color: #fffa65; letter-spacing: 1px;">LE GARAGE 3D</h2>
          <span style="font-size: 0.78rem; color: #7bed9f; font-weight: 800;" id="garage-bike-counter">
            BOLIDE ${currentIdx + 1} / ${BIKES.length} • ${this.selectedGarageBike.category || 'MOTO'}
          </span>
        </div>
        <div class="currency-group-garage">
          <div class="currency-badge currency-pill">
            <span>🪙 ${coins}</span>
          </div>
        </div>
      </div>

      <!-- Boutons Flèches Gauche / Droite GRAND FORMAT pour basculer facilement -->
      <div class="garage-carousel-overlay-nav">
        <button id="btn-prev-bike" class="btn-garage-arrow-large left" title="Bolide précédent">◀</button>
        <button id="btn-next-bike" class="btn-garage-arrow-large right" title="Bolide suivant">▶</button>
      </div>

      <div class="garage-bottom-panel">
        <div id="garage-bike-info">
          <!-- Rempli dynamiquement -->
        </div>
      </div>
    `;

    // Événements boutons flèches carrousel gauche / droite
    const changeBikeByIndex = (offset) => {
      let idx = BIKES.findIndex(b => b.id === this.selectedGarageBike.id);
      idx = (idx + offset + BIKES.length) % BIKES.length;
      const nextBike = BIKES[idx];
      this.selectedGarageBike = nextBike;
      soundManager.playClick();
      if (this.onAction) this.onAction('PREVIEW_BIKE', nextBike);
      
      const counterEl = garage.querySelector('#garage-bike-counter');
      if (counterEl) {
        counterEl.textContent = `BOLIDE ${idx + 1} / ${BIKES.length} • ${nextBike.category}`;
      }
      this.updateGarageBikeInfo(garage.querySelector('#garage-bike-info'));
    };

    garage.querySelector('#btn-prev-bike').addEventListener('click', () => changeBikeByIndex(-1));
    garage.querySelector('#btn-next-bike').addEventListener('click', () => changeBikeByIndex(1));

    // Retour propre vers MAP ou SPLASH en réinitialisant le bolide 3D au bolide équipé
    garage.querySelector('#btn-garage-back').addEventListener('click', () => {
      soundManager.playClick();
      const equippedId = storage.getEquippedBike();
      const equippedBike = BIKES.find(b => b.id === equippedId) || BIKES[0];
      this.selectedGarageBike = equippedBike;
      if (this.onAction) this.onAction('PREVIEW_BIKE', equippedBike);
      this.setScreen(this.previousScreen || 'MAP');
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
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
        <div>
          <div class="garage-category-tag">${bike.icon || '🏍️'} ${bike.category || 'MOTO'}</div>
          <h3 style="font-size: 1.35rem; font-weight: 900; color: #fff; margin: 2px 0;">${bike.name}</h3>
          <span style="font-size: 0.8rem; color: #fffa65; font-weight: 700;">${bike.tagline || bike.type}</span>
        </div>
        <div style="font-size: 0.78rem; color: #ced6e0; max-width: 48%; text-align: right; line-height: 1.3;">
          ${bike.description}
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-item">
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 800;">
            <span class="stat-name">VITESSE</span>
            <span style="color: #fffa65;">${bike.maxSpeed} km/h</span>
          </div>
          <div class="stat-gauge-bar">
            <div class="stat-gauge-fill" style="width: ${(bike.speedRating / 5) * 100}%;"></div>
          </div>
        </div>
        <div class="stat-item">
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 800;">
            <span class="stat-name">MANIABILITÉ</span>
            <span style="color: #38ada9;">${bike.handlingRating}/5</span>
          </div>
          <div class="stat-gauge-bar">
            <div class="stat-gauge-fill" style="width: ${(bike.handlingRating / 5) * 100}%; background: linear-gradient(90deg, #38ada9, #78e08f);"></div>
          </div>
        </div>
        <div class="stat-item">
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 800;">
            <span class="stat-name">ACCÉLÉRATION</span>
            <span style="color: #ff6348;">${bike.bounceRating}/5</span>
          </div>
          <div class="stat-gauge-bar">
            <div class="stat-gauge-fill" style="width: ${(bike.bounceRating / 5) * 100}%; background: linear-gradient(90deg, #ffa502, #ff6348);"></div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
        <span style="font-size: 0.8rem; font-weight: 800; color: #dfe4ea;">PEINTURE PERSONNALISÉE :</span>
        <div class="color-picker-row">
          ${colors.map(col => `
            <div class="color-dot ${currentColor.toLowerCase() === col.toLowerCase() ? 'active' : ''}"
                 data-color="${col}"
                 style="background: ${col};">
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-top: 10px;">
        ${isEquipped ? `
          <button id="btn-already-equipped" class="btn-arcade btn-secondary" style="width: 100%; padding: 13px; font-size: 1rem;">
            ✓ BOLIDE ÉQUIPÉ (RETOURNER AU TOUR)
          </button>
        ` : isUnlocked ? `
          <button id="btn-equip-bike" class="btn-arcade btn-play-pulse" style="width: 100%; padding: 13px; font-size: 1rem;">
            ⚡ ÉQUIPER ET ALLER AU TOUR
          </button>
        ` : `
          <button id="btn-buy-bike" class="btn-arcade btn-accent" style="width: 100%; padding: 13px; font-size: 1rem;">
            DÉBLOQUER CE VÉHICULE (🪙 ${bike.cost})
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

    if (isEquipped) {
      const alreadyBtn = container.querySelector('#btn-already-equipped');
      if (alreadyBtn) {
        alreadyBtn.addEventListener('click', () => {
          soundManager.playClick();
          this.setScreen('MAP');
        });
      }
    } else if (isUnlocked) {
      container.querySelector('#btn-equip-bike').addEventListener('click', () => {
        storage.equipBike(bike.id);
        gameState.selectBike(bike.id);
        soundManager.playClick();
        if (this.onAction) this.onAction('BIKE_EQUIPPED', bike);
        this.showToastUnlock({ name: `${bike.name} Équipé !` });
        // REVIENS DIRECTEMENT À LA CARTE DU TOUR !
        this.setScreen('MAP');
      });
    } else if (!isUnlocked) {
      const buyBtn = container.querySelector('#btn-buy-bike');
      if (buyBtn) {
        buyBtn.addEventListener('click', () => {
          const res = storage.unlockBike(bike.id, bike.cost);
          if (res.success) {
            storage.equipBike(bike.id);
            gameState.selectBike(bike.id);
            soundManager.playVictory();
            if (this.onAction) this.onAction('BIKE_EQUIPPED', bike);
            this.showToastUnlock({ name: `${bike.name} Débloqué & Équipé !` });
            this.setScreen('MAP');
          } else {
            soundManager.playBoing();
            alert(res.reason);
          }
        });
      }
    }
  }

  // --- 4. HUD DE GAMEPLAY AVEC FREIN, SCORE DYNAMIQUE ET COMPTE À REBOURS ---
  renderHUDScreen() {
    const hud = document.createElement('div');
    hud.className = 'screen-hud';

    const equippedBikeId = storage.getEquippedBike() || gameState.selectedBike?.id || 'tank';
    const equippedBikeObj = BIKES.find(b => b.id === equippedBikeId) || BIKES[0];
    const isFootOrHorse = (equippedBikeId === 'cheval' || equippedBikeId === 'run_ak47' || equippedBikeId === 'run_chainsaw');
    const brakeIcon = isFootOrHorse ? '✋' : '🛑';
    const brakeLabel = isFootOrHorse ? 'ARRÊT' : 'FREIN';
    const brakeTitle = isFootOrHorse ? 'Maintenir pour vous arrêter immédiatement (direction verrouillée)' : 'Maintenir la pédale de frein pour freiner (direction verrouillée)';
    const boostIcon = isFootOrHorse ? '🥤' : '🔥';
    const boostLabel = isFootOrHorse ? 'BOISSON ÉNERGÉTIQUE' : 'NITRO';
    const boostTitle = isFootOrHorse ? 'Boire une Boisson Énergétique pour sprinter à pleine vitesse !' : 'Activer le Nitro Boost 5s (Touche Espace / Shift)';

    let actionIcon = '📢';
    let actionLabel = 'KLAXON';
    let actionTitle = 'Klaxonner !';
    let isWeapon = false;

    if (equippedBikeId === 'cheval') {
      actionIcon = '💥';
      actionLabel = 'FOUET';
      actionTitle = 'Frapper au FOUET !';
      isWeapon = true;
    } else if (equippedBikeId === 'trottinette_hache') {
      actionIcon = '🪓';
      actionLabel = 'HACHE';
      actionTitle = 'Frapper à la Hache !';
      isWeapon = true;
    } else if (equippedBikeId === 'run_ak47') {
      actionIcon = '🔥';
      actionLabel = 'TIRER';
      actionTitle = 'Rafale Kalachnikov AK-47 !';
      isWeapon = true;
    } else if (equippedBikeId === 'run_chainsaw') {
      actionIcon = '⚡';
      actionLabel = 'TRONÇON';
      actionTitle = 'Tronçonner les obstacles !';
      isWeapon = true;
    } else if (equippedBikeId === 'tank') {
      actionIcon = '💥';
      actionLabel = 'CANON';
      actionTitle = 'Tirer un obus 120mm destructeur !';
      isWeapon = true;
    } else if (equippedBikeId === 'aero_jet') {
      actionIcon = '🚀';
      actionLabel = 'MISSILE';
      actionTitle = 'Tirer une salve de missiles plasma / frappe aérienne !';
      isWeapon = true;
    } else if (equippedBikeId === 'rad_rover') {
      actionIcon = '⚡';
      actionLabel = 'PLASMA';
      actionTitle = 'Décharge Plasma EMP !';
      isWeapon = true;
    } else if (equippedBikeId === 'hovercraft') {
      actionIcon = '🌊';
      actionLabel = 'TORPILLE';
      actionTitle = 'Lancer une torpille vortex !';
      isWeapon = true;
    } else if (equippedBikeId === 'snowmobile') {
      actionIcon = '❄️';
      actionLabel = 'CRYO';
      actionTitle = 'Tirer un missile cryogénique !';
      isWeapon = true;
    } else if (equippedBikeId === 'dragster') {
      actionIcon = '🔥';
      actionLabel = 'FLAMMES';
      actionTitle = 'Lance-flammes thermique !';
      isWeapon = true;
    } else if (equippedBikeId === 'decapotable') {
      actionIcon = '💥';
      actionLabel = 'CALIBRE 12';
      actionTitle = 'Tir de chevrotine !';
      isWeapon = true;
    } else if (equippedBikeId === 'chopper') {
      actionIcon = '⛓️';
      actionLabel = 'CHAÎNE';
      actionTitle = 'Fouetter à la chaîne lourde !';
      isWeapon = true;
    } else if (equippedBikeId === 'scooter') {
      actionIcon = '🔫';
      actionLabel = 'RAFALE';
      actionTitle = 'Rafale Uzi !';
      isWeapon = true;
    } else if (equippedBikeId === 'rouleau') {
      actionIcon = '🚜';
      actionLabel = 'ONDE CHOC';
      actionTitle = 'Onde de choc 50 Tonnes !';
      isWeapon = true;
    }

    hud.innerHTML = `
      <div class="hud-top-bar ${gameState.isRuinsMode ? 'hud-top-bar-ruins' : ''}">
        ${gameState.isRuinsMode ? `
          <div class="ruins-hud-banner" style="display: flex; align-items: center; gap: 8px; background: rgba(14, 8, 8, 0.94); border: 2px solid #ff4757; padding: 6px 12px; border-radius: 12px; box-shadow: 0 4px 18px rgba(0,0,0,0.85); pointer-events: auto; flex: 1; min-width: 0;">
            <span style="font-size: 1.3rem;">☢️</span>
            <div style="min-width: 0; overflow: hidden;">
              <div style="font-size: 0.78rem; font-weight: 950; color: #ff7675; letter-spacing: 0.5px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">EXPLORATION • ${gameState.selectedCity.name.toUpperCase()}</div>
              <div style="font-size: 0.62rem; color: #ced6e0; font-weight: 800;">Promenade libre • Zéro obstacle</div>
            </div>
          </div>
          <button id="btn-hud-exit-ruins" class="btn-arcade btn-ruins-exit-top interactive" style="background: linear-gradient(135deg, #eb4d4b, #c0392b); border: 2.5px solid #ff7675; color: #ffffff; font-weight: 950; font-size: 0.88rem; padding: 10px 14px; border-radius: 14px; cursor: pointer; box-shadow: 0 6px 20px rgba(235,77,75,0.7); pointer-events: auto !important; z-index: 99999; display: flex; align-items: center; gap: 6px; flex-shrink: 0;" title="Quitter la reconnaissance et retourner à la carte">
            <span>🗺️ QUITTER</span>
          </button>
        ` : `
          <!-- Badge Score Lumineux Arcade (Ergonomie Haut Gauche) -->
          <div class="score-box-arcade">
            <div class="score-badge-header">
              <span class="score-badge-icon">⚡</span>
              <span class="score-badge-label">SCORE</span>
            </div>
            <span class="score-value" id="hud-score-val">${gameState.score.toLocaleString('fr-FR')}</span>
            <div class="combo-badge" id="hud-combo-badge">
              <span class="combo-flame">🔥</span>
              <span id="hud-combo-text">COMBO x1</span>
            </div>
          </div>

          <!-- Carte d'Objectif et de Progression (Ergonomie Haut Centre, textes clairs et lisibles) -->
          <div class="progress-objective-compact" id="hud-objective-card">
            <div class="objective-header-row">
              <span class="city-target-title" id="hud-city-name">${gameState.selectedCity.isNuclearMission ? '☢️ ' + gameState.selectedCity.name.toUpperCase() : (gameState.selectedCity.emblem || '📍') + ' ' + gameState.selectedCity.name.toUpperCase()}</span>
              <span class="objective-target-pts" id="hud-target-pts">🎯 ${gameState.selectedCity.targetScore.toLocaleString('fr-FR')}</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" id="hud-progress-fill"></div>
              <span class="progress-pct-text" id="hud-progress-pct">OBJECTIF 0%</span>
            </div>
          </div>

          <!-- Dock de Contrôle Supérieur Droit (Retour Carte 100%, Sélecteur d'Engin & Pause Vectorielle) -->
          <div class="hud-top-right-dock">
            <button id="btn-hud-return-map-100" class="hud-btn-return-map-100" title="Objectif 100% accompli ! Retourner à la carte">
              <span>🗺️ CARTE</span>
            </button>

            <button type="button" class="btn-hud-bike-switch" id="btn-hud-bike-switch" title="Changer d'engin en course">
              <span class="hud-bike-switch-icon" id="hud-current-bike-icon">${equippedBikeObj.icon}</span>
              <span class="hud-bike-switch-badge" aria-hidden="true">↻</span>
            </button>

            <button type="button" class="btn-icon-pause" id="btn-hud-pause" title="Mettre en pause" aria-label="Pause">
              <svg class="pause-svg-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <rect x="5.5" y="4.5" width="4.5" height="15" rx="2.2" fill="currentColor" />
                <rect x="14" y="4.5" width="4.5" height="15" rx="2.2" fill="currentColor" />
              </svg>
            </button>
          </div>
        `}
      </div>

      <div class="hud-bottom-controls">
        <!-- Pédale de Frein (Engin) / Bouton d'Arrêt (Homme) ergonomique à gauche (pouce gauche) -->
        <button class="btn-pedal-brake ${isFootOrHorse ? 'mode-homme' : 'mode-engin'}" id="btn-hud-brake" title="${brakeTitle}">
          <div class="pedal-grip-ridges"></div>
          <span class="pedal-icon" id="hud-brake-icon">${brakeIcon}</span>
          <span class="pedal-label" id="hud-brake-label">${brakeLabel}</span>
        </button>

        <!-- Compteur de vitesse moderne centré & Carnage Pop exterminée -->
        <div class="speedometer-center">
          <div class="speed-dial">
            <span class="speed-value" id="hud-speed-val">0</span>
            <span class="speed-unit">KM/H</span>
          </div>
          <div class="speed-track-gauge">
            <div class="speed-fill-gauge" id="hud-speed-gauge"></div>
          </div>
${gameState.isRuinsMode ? '' : `          <div class="hud-carnage-badge" id="hud-carnage-badge" title="Victimes exterminées / Objectif de carnage">
            <span class="carnage-icon">💀</span>
            <span class="carnage-count" id="hud-kills-val">${gameState.killsCount || 0}</span>
            <span class="carnage-sep">/</span>
            <span class="carnage-quota" id="hud-quota-val">${gameState.selectedCity.killQuota || 30}</span>
          </div>`}
        </div>

        <!-- Groupe de commandes droit ergonomique -->
        <div class="hud-right-cluster">
${gameState.isRuinsMode ? `
          <!-- Bouton ergonomique pouce droit pour quitter le mode exploration -->
          <button class="btn-arcade btn-ruins-exit-thumb interactive" id="btn-hud-exit-ruins-thumb" style="width: 82px; height: 82px; border-radius: 50%; background: linear-gradient(135deg, #eb4d4b, #c0392b); border: 3px solid #ff7675; box-shadow: 0 8px 24px rgba(235,77,75,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: #ffffff; cursor: pointer; pointer-events: auto !important; z-index: 99999;" title="Quitter l'exploration et revenir à la carte">
            <span style="font-size: 1.6rem; line-height: 1;">🗺️</span>
            <span style="font-size: 0.68rem; font-weight: 950; letter-spacing: 0.5px;">QUITTER</span>
          </button>
` : `          <div class="hud-nitro-group">
            <button class="btn-nitro-pedal ${isFootOrHorse ? 'btn-energy-drink mode-homme' : 'mode-engin'} ${isFootOrHorse && gameState.energyDrinkCans > 0 ? 'ready' : ''}" id="btn-hud-nitro" title="${boostTitle}">
              <div class="nitro-fill-track">
                <div class="nitro-fill-bar ${isFootOrHorse ? 'energy-fill-bar' : ''}" id="hud-nitro-fill" style="width: ${isFootOrHorse ? (gameState.energyDrinkCans > 0 ? '100%' : '0%') : '0%'};"></div>
              </div>
              <span class="nitro-icon" id="hud-nitro-icon">${boostIcon}</span>
              <span class="nitro-label" id="hud-nitro-label">${boostLabel}</span>
              <span class="nitro-sub" id="hud-nitro-sub">${isFootOrHorse ? `${gameState.energyDrinkCans} DISPO` : '0%'}</span>
            </button>
          </div>`}

          ${(!gameState.isRuinsMode && isWeapon) ? `
            <!-- Bouton d'Attaque / Frappe / Tir Arme Spécifique (pouce droit) -->
            <button class="btn-horn-pedal btn-attack-pedal" id="btn-hud-horn" title="${actionTitle}">
              <span class="horn-icon">${actionIcon}</span>
              <span class="horn-label">${actionLabel}</span>
            </button>
          ` : ''}
        </div>
      </div>

      <div class="touch-hint auto-fade" id="hud-touch-hint">
        ← Glisser pour braquer | FREIN pour stopper | ⚡ NITRO ${isWeapon ? `| ${actionIcon} ${actionLabel}` : ''}
      </div>
    `;

    // Disparition automatique de l'aide tactile après 3.5 secondes pour ne pas encombrer l'écran
    const touchHint = hud.querySelector('#hud-touch-hint');
    if (touchHint) {
      setTimeout(() => {
        touchHint.style.opacity = '0';
        touchHint.style.transition = 'opacity 0.6s ease';
        setTimeout(() => touchHint.remove(), 600);
      }, 3500);
    }

    // Gestion du bouton de frein / arrêt (verrouille la direction gauche/droite)
    const brakeBtn = hud.querySelector('#btn-hud-brake');
    const startBraking = (e) => {
      if (e) e.stopPropagation();
      gameState.setBraking(true);
      brakeBtn.classList.add('active');
    };
    const stopBraking = (e) => {
      if (e) e.stopPropagation();
      gameState.setBraking(false);
      brakeBtn.classList.remove('active');
    };

    brakeBtn.addEventListener('pointerdown', startBraking);
    brakeBtn.addEventListener('pointerup', stopBraking);
    brakeBtn.addEventListener('pointerleave', stopBraking);
    brakeBtn.addEventListener('pointercancel', stopBraking);

    // Gestion du bouton Nitro / Energy Drink 5 secondes
    const nitroBtn = hud.querySelector('#btn-hud-nitro');
    if (nitroBtn) {
      const handleNitro = (e) => {
        if (e && e.type === 'touchstart') e.preventDefault();
        const ok = gameState.activateNitro();
        if (ok) {
          if (this.onAction) this.onAction('NITRO');
        }
      };
      nitroBtn.addEventListener('touchstart', handleNitro, { passive: false });
      nitroBtn.addEventListener('click', handleNitro);
    }

    const exitRuinsBtn = hud.querySelector('#btn-hud-exit-ruins');
    const exitRuinsThumbBtn = hud.querySelector('#btn-hud-exit-ruins-thumb');
    const handleExitRuins = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      soundManager.playClick();
      gameState.isRuinsMode = false;
      if (this.onAction) {
        this.onAction('EXIT_RUINS');
      } else {
        this.setScreen('MAP');
      }
    };

    if (exitRuinsBtn) {
      exitRuinsBtn.addEventListener('pointerdown', handleExitRuins);
      exitRuinsBtn.addEventListener('touchstart', handleExitRuins, { passive: false });
      exitRuinsBtn.addEventListener('click', handleExitRuins);
    }
    if (exitRuinsThumbBtn) {
      exitRuinsThumbBtn.addEventListener('pointerdown', handleExitRuins);
      exitRuinsThumbBtn.addEventListener('touchstart', handleExitRuins, { passive: false });
      exitRuinsThumbBtn.addEventListener('click', handleExitRuins);
    }

    const returnMap100 = hud.querySelector('#btn-hud-return-map-100');
    if (returnMap100) {
      const handleReturnToMap = (e) => {
        if (e && e.type === 'touchstart') e.preventDefault();
        soundManager.playClick();
        this.triggerReturnToMapCinematic(gameState.selectedCity);
        gameState.endRun();
      };
      returnMap100.addEventListener('touchstart', handleReturnToMap, { passive: false });
      returnMap100.addEventListener('click', handleReturnToMap);
    }

    const objectiveCard = hud.querySelector('#hud-objective-card');
    if (objectiveCard) {
      objectiveCard.addEventListener('click', () => {
        const pctEl = hud.querySelector('#hud-progress-pct');
        if (pctEl && pctEl.textContent.includes('100%')) {
          soundManager.playClick();
          this.triggerReturnToMapCinematic(gameState.selectedCity);
          gameState.endRun();
        }
      });
    }

    const openPauseMenu = (e) => {
      if (e) {
        if (e.type === 'touchstart') e.preventDefault();
        e.stopPropagation();
      }
      soundManager.playClick();
      if (this.onAction) this.onAction('PAUSE');
      this.showPauseModal();
    };

    const pauseBtn = hud.querySelector('#btn-hud-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('touchstart', openPauseMenu, { passive: false });
      pauseBtn.addEventListener('click', openPauseMenu);
    }

    const bikeSwitchBtn = hud.querySelector('#btn-hud-bike-switch');
    if (bikeSwitchBtn) {
      bikeSwitchBtn.addEventListener('touchstart', openPauseMenu, { passive: false });
      bikeSwitchBtn.addEventListener('click', openPauseMenu);
    }

    const hornAttackBtn = hud.querySelector('#btn-hud-horn');
    if (hornAttackBtn) {
      const triggerAction = (e) => {
        if (e && e.type === 'touchstart') e.preventDefault();
        if (this.onAction) this.onAction('ATTACK');
      };
      hornAttackBtn.addEventListener('touchstart', triggerAction, { passive: false });
      hornAttackBtn.addEventListener('click', triggerAction);
    }

    this.root.appendChild(hud);

    // Déclencher le compte à rebours 3-2-1-GO si on entre en course
    if (gameState.currentMode === 'COUNTDOWN') {
      this.triggerCountdown();
    }
  }

  triggerCountdown() {
    const existing = this.root.querySelector('.hud-countdown-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'hud-countdown-overlay';
    overlay.innerHTML = `
      <div class="countdown-pulse-box">
        <div class="countdown-number" id="countdown-display">3</div>
        <div class="countdown-sub" id="countdown-sub">MOTO À L’ARRÊT...</div>
      </div>
    `;
    this.root.appendChild(overlay);

    soundManager.playCountdownBeep(false);

    // 3 -> 2
    setTimeout(() => {
      if (!overlay.parentNode || gameState.currentMode === 'PAUSED') return;
      const display = overlay.querySelector('#countdown-display');
      const sub = overlay.querySelector('#countdown-sub');
      if (display) {
        display.textContent = '2';
        display.className = 'countdown-number pulse-pop';
        if (sub) sub.textContent = 'PRÉPAREZ-VOUS !';
        soundManager.playCountdownBeep(false);
      }
    }, 850);

    // 2 -> 1
    setTimeout(() => {
      if (!overlay.parentNode || gameState.currentMode === 'PAUSED') return;
      const display = overlay.querySelector('#countdown-display');
      const sub = overlay.querySelector('#countdown-sub');
      if (display) {
        display.textContent = '1';
        display.className = 'countdown-number pulse-pop';
        if (sub) sub.textContent = 'ATTENTION...';
        soundManager.playCountdownBeep(false);
      }
    }, 1700);

    // 1 -> GO !
    setTimeout(() => {
      if (!overlay.parentNode || gameState.currentMode === 'PAUSED') return;
      const display = overlay.querySelector('#countdown-display');
      const sub = overlay.querySelector('#countdown-sub');
      if (display) {
        display.textContent = 'GO !';
        display.className = 'countdown-number go-pop';
        if (sub) sub.textContent = 'PLEIN GAZ !';
        soundManager.playCountdownBeep(true);
      }
      gameState.triggerGo();
    }, 2550);

    // Disparition douce
    setTimeout(() => {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 400);
    }, 3200);
  }

  updateHUDScore(data) {
    const scoreVal = this.root.querySelector('#hud-score-val');
    const comboBadge = this.root.querySelector('#hud-combo-badge');
    const comboText = this.root.querySelector('#hud-combo-text');

    if (scoreVal) {
      const targetScore = data.score;
      if (this.currentScoreAnimated === undefined) this.currentScoreAnimated = 0;

      // Animation fluide du score numérique avec GSAP
      const scoreObj = { val: this.currentScoreAnimated };
      gsap.to(scoreObj, {
        val: targetScore,
        duration: 0.35,
        ease: "power2.out",
        onUpdate: () => {
          this.currentScoreAnimated = Math.round(scoreObj.val);
          scoreVal.textContent = this.currentScoreAnimated.toLocaleString('fr-FR');
        }
      });

      gsap.fromTo(scoreVal,
        { scale: 1.25, filter: "brightness(1.4)" },
        { scale: 1.0, filter: "brightness(1.0)", duration: 0.22, ease: "back.out(2)" }
      );
    }

    if (comboBadge && comboText) {
      if (data.combo > 1) {
        comboBadge.classList.add('active');
        comboText.textContent = `${data.comboTitle} x${data.combo}`;
        gsap.fromTo(comboBadge,
          { scale: 1.35, rotation: (Math.random() - 0.5) * 8 },
          { scale: 1.0, rotation: 0, duration: 0.32, ease: "elastic.out(1.2, 0.4)" }
        );
      } else {
        comboBadge.classList.remove('active');
      }
    }
  }

  // --- CONQUÊTE D'ASSAUT URBAIN APOCALYPTIQUE (CARNAGE CRUISE) ---
  triggerCarnageAssaultFinish(city, score, victims = 35) {
    if (this.assaultOverlay) {
      this.assaultOverlay.remove();
      this.assaultOverlay = null;
    }

    const currentIndex = CITIES.findIndex(c => c.id === city.id);
    const nextCity = (currentIndex >= 0 && currentIndex < CITIES.length - 1) ? CITIES[currentIndex + 1] : null;
    const isNextUnlocked = nextCity ? storage.isCityUnlocked(nextCity.id) : false;
    const isExterminated = storage.isCityExterminated(city.id);

    const overlay = document.createElement('div');
    overlay.className = 'finish-assault-overlay';
    this.assaultOverlay = overlay;
    this.activeModals.push(overlay);

    overlay.innerHTML = `
      <div class="finish-assault-card">
        <div class="finish-hazard-stripe top"></div>
        <div class="finish-assault-badge">⚠️ ASSAUT SECTORIEL TRIOMPHAL ⚠️</div>
        <div class="finish-assault-skull-row">
          <span class="skull-glow">💀</span>
          <span class="fire-glow">🔥</span>
          <span class="skull-glow">💀</span>
        </div>
        <div class="finish-assault-title">ZONE PURGÉE !</div>
        <div class="finish-assault-sub">SECTEUR METROPOLITAIN ÉPURÉ AU FEU</div>
        <div class="finish-assault-city">${city.countryFlag || '🌍'} ${city.name.toUpperCase()} (ASSERVIE)</div>
        <div class="finish-assault-metrics">
          <div class="fmetric-pill"><span class="fmetric-icon">💀</span> <strong>+${victims.toLocaleString('fr-FR')}</strong> NEUTRALISÉS</div>
          <div class="fmetric-pill"><span class="fmetric-icon">⚡</span> <strong>${score.toLocaleString('fr-FR')}</strong> PTS</div>
          <div class="fmetric-pill" id="assault-stars-pill"><span class="fmetric-icon">⭐</span> <strong id="assault-stars-text">★★★</strong></div>
        </div>
        <div class="finish-hazard-stripe bottom"></div>

        <!-- BANNIÈRE DE RETOUR AUTOMATIQUE CARTE (FORCÉ ET INSTANTANÉ) -->
        <div class="finish-auto-return-banner">
          <div class="auto-return-info-row">
            <span class="auto-return-sat-icon">🛰️</span>
            <span>RETOUR AUTOMATIQUE CARTE : <strong id="auto-return-sec" style="color: #00d2d3;">2.5s</strong></span>
          </div>
          <div class="auto-return-progress-track">
            <div class="auto-return-progress-fill" id="auto-return-progress"></div>
          </div>
        </div>

        <!-- ACTIONS HAUTE ERGONOMIE (RETOUR IMMÉDIAT OU CHOIX TACTIQUE) -->
        <div class="finish-assault-actions-stack">
          ${nextCity && isNextUnlocked ? `
            <button id="btn-assault-next-raid" class="btn-arcade btn-assault-hero-next">
              <span>💥 RAID SUIVANT : ${nextCity.name.toUpperCase()} ▶</span>
            </button>
          ` : ''}

          <button id="btn-assault-return-map" class="btn-arcade btn-assault-return-cta">
            <span>🛰️ RETOUR IMMÉDIAT À LA CARTE</span>
          </button>

          <div class="finish-assault-secondary-row">
            <button id="btn-assault-retry" class="btn-arcade btn-ghost">
              <span>🔄 REJOUER</span>
            </button>
            <button id="btn-assault-garage" class="btn-arcade btn-accent">
              <span>🪖 GARAGE</span>
            </button>
            ${!isExterminated ? `
              <button id="btn-assault-wmd" class="btn-arcade btn-danger-wmd">
                <span>☢️ NUCLÉAIRE</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    this.root.appendChild(overlay);

    let autoReturnRemainingMs = 2500;
    const autoReturnIntervalMs = 50;
    const autoReturnSecEl = overlay.querySelector('#auto-return-sec');
    const autoReturnProgressEl = overlay.querySelector('#auto-return-progress');

    let autoReturnTimer = setInterval(() => {
      autoReturnRemainingMs -= autoReturnIntervalMs;
      if (autoReturnSecEl) {
        autoReturnSecEl.textContent = `${Math.max(0, (autoReturnRemainingMs / 1000)).toFixed(1)}s`;
      }
      if (autoReturnProgressEl) {
        const pct = Math.max(0, Math.min(100, (autoReturnRemainingMs / 2500) * 100));
        autoReturnProgressEl.style.width = `${pct}%`;
      }
      if (autoReturnRemainingMs <= 0) {
        if (autoReturnTimer) {
          clearInterval(autoReturnTimer);
          autoReturnTimer = null;
        }
        onFinishAction(() => this.triggerReturnToMapCinematic(city));
      }
    }, autoReturnIntervalMs);

    const onFinishAction = (actionFn) => {
      if (autoReturnTimer) {
        clearInterval(autoReturnTimer);
        autoReturnTimer = null;
      }
      soundManager.playClick();
      overlay.remove();
      this.assaultOverlay = null;
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      actionFn();
    };

    const assaultReturnBtn = overlay.querySelector('#btn-assault-return-map');
    if (assaultReturnBtn) {
      const handleReturn = (e) => {
        if (e && e.type === 'touchstart') e.preventDefault();
        onFinishAction(() => this.triggerReturnToMapCinematic(city));
      };
      assaultReturnBtn.addEventListener('touchstart', handleReturn, { passive: false });
      assaultReturnBtn.addEventListener('click', handleReturn);
    }

    const assaultNextBtn = overlay.querySelector('#btn-assault-next-raid');
    if (assaultNextBtn && nextCity) {
      const handleNext = (e) => {
        if (e && e.type === 'touchstart') e.preventDefault();
        onFinishAction(() => {
          gameState.selectCity(nextCity.id);
          this.selectedMapCity = nextCity;
          if (this.onAction) this.onAction('START_RUN', nextCity);
        });
      };
      assaultNextBtn.addEventListener('touchstart', handleNext, { passive: false });
      assaultNextBtn.addEventListener('click', handleNext);
    }

    const assaultRetryBtn = overlay.querySelector('#btn-assault-retry');
    if (assaultRetryBtn) {
      const handleRetry = (e) => {
        if (e && e.type === 'touchstart') e.preventDefault();
        onFinishAction(() => {
          if (this.onAction) this.onAction('START_RUN', city);
        });
      };
      assaultRetryBtn.addEventListener('touchstart', handleRetry, { passive: false });
      assaultRetryBtn.addEventListener('click', handleRetry);
    }

    const assaultGarageBtn = overlay.querySelector('#btn-assault-garage');
    if (assaultGarageBtn) {
      const handleGarage = (e) => {
        if (e && e.type === 'touchstart') e.preventDefault();
        onFinishAction(() => {
          this.previousScreen = 'MAP';
          this.setScreen('GARAGE');
        });
      };
      assaultGarageBtn.addEventListener('touchstart', handleGarage, { passive: false });
      assaultGarageBtn.addEventListener('click', handleGarage);
    }

    const assaultWmdBtn = overlay.querySelector('#btn-assault-wmd');
    if (assaultWmdBtn) {
      const handleWmd = (e) => {
        if (e && e.type === 'touchstart') e.preventDefault();
        onFinishAction(() => {
          this.showWmdStrikeModal(city);
        });
      };
      assaultWmdBtn.addEventListener('touchstart', handleWmd, { passive: false });
      assaultWmdBtn.addEventListener('click', handleWmd);
    }

    const card = overlay.querySelector('.finish-assault-card');
    if (card) {
      gsap.fromTo(card,
        { scale: 0.25, opacity: 0, rotation: -3 },
        { scale: 1.04, opacity: 1, rotation: 0, duration: 0.44, ease: "back.out(2.2)", onComplete: () => {
          gsap.to(card, { scale: 1.0, duration: 0.16 });
        }}
      );
    }

    this.spawnCarnageEmbersShower();
    // AUCUN TIMEOUT DE DISPARITION : LA CARTE RESTE VISIBLE JUSQU'À CE QUE LE JOUEUR CLIQUE UN BOUTON !
  }

  // Pluie de braises ardentes, de cendres incandescentes et d'étincelles de guerre
  spawnCarnageEmbersShower() {
    const colors = ['#ff4757', '#ffa502', '#fffa65', '#ff3838', '#eb4d4b', '#ffffff'];
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
    this.root.appendChild(container);

    for (let i = 0; i < 55; i++) {
      const p = document.createElement('div');
      const size = 5 + Math.random() * 8;
      const color = colors[Math.floor(Math.random() * colors.length)];
      p.style.cssText = `
        position: absolute;
        width: ${size}px; height: ${size}px;
        background: radial-gradient(circle, ${color} 0%, transparent 80%);
        left: ${5 + Math.random() * 90}%;
        top: -15px;
        border-radius: 50%;
        box-shadow: 0 0 10px ${color};
      `;
      container.appendChild(p);

      gsap.to(p, {
        y: window.innerHeight + 30,
        x: (Math.random() - 0.5) * 180,
        rotation: (Math.random() - 0.5) * 540,
        duration: 1.2 + Math.random() * 1.1,
        delay: Math.random() * 0.45,
        ease: "power1.out"
      });
    }

    setTimeout(() => container.remove(), 3000);
  }

  // --- TRANSITION CINÉMATIQUE SATELLITE FLUIDE VERS LA CARTE DU MONDE (KH-12 ORBITAL) ---
  triggerReturnToMapCinematic(targetCity) {
    this.isReturningToMap = true;
    if (this.assaultOverlay) {
      this.assaultOverlay.remove();
      this.assaultOverlay = null;
    }
    this.closeActiveModals();

    // Arrêt strict et complet de tous les sons de gameplay persistants
    soundManager.stopAllGameplaySounds();

    const overlay = document.createElement('div');
    overlay.className = 'return-map-cinematic';
    overlay.innerHTML = `
      <div class="return-map-hud">
        <div class="return-map-recon-header">
          <span class="recon-sat-icon">🛰️</span>
          <div>
            <div class="recon-sub">SATELLITE RECON KH-12 CRYSTAL • ALT 380 KM</div>
            <div class="recon-title">RETOUR AU QUARTIER GÉNÉRAL STRATÉGIQUE</div>
          </div>
        </div>
        <div class="return-map-target-card">
          <div class="target-flag-large">${targetCity?.countryFlag || '🌍'}</div>
          <div class="target-details">
            <span class="target-label">LOCALISATION TACTIQUE</span>
            <span class="target-city-name">${targetCity ? targetCity.name.toUpperCase() : 'EUROPE CENTRALE'}</span>
            <span class="target-coords">${targetCity ? `${targetCity.mapCoords.x}°E / ${targetCity.mapCoords.y}°N` : 'COORDS SATELLITE'}</span>
          </div>
        </div>
        <div class="recon-radar-scan">
          <div class="recon-radar-sweep"></div>
          <span class="recon-status-text">🛰️ SYNCHRONISATION GÉO-SPATIALE EN COURS...</span>
        </div>
      </div>
    `;

    this.root.appendChild(overlay);

    soundManager.playCountdownBeep(true);
    Haptic.tap();

    const hudCard = overlay.querySelector('.return-map-hud');
    if (hudCard) {
      gsap.fromTo(hudCard,
        { scale: 0.8, opacity: 0 },
        { scale: 1.0, opacity: 1, duration: 0.35, ease: "power2.out" }
      );
    }

    setTimeout(() => {
      this.isReturningToMap = false;
      gameState.currentMode = 'MAP';
      soundManager.stopAllGameplaySounds();
      this.currentScreen = 'MAP';
      this.render();
      soundManager.switchMusicTrack('MENU');

      const mapEl = this.root.querySelector('.screen-map');
      if (mapEl) {
        gsap.fromTo(mapEl,
          { scale: 1.15, opacity: 0.2, filter: 'blur(8px)' },
          { scale: 1.0, opacity: 1.0, filter: 'blur(0px)', duration: 0.45, ease: "power2.out" }
        );
      }

      gsap.to(overlay, {
        opacity: 0,
        duration: 0.35,
        ease: "power2.in",
        onComplete: () => {
          overlay.remove();
          if (targetCity) {
            const targetPin = document.querySelector(`.city-pin[data-city-id="${targetCity.id}"]`);
            if (targetPin) this.triggerCityPinRipple(targetPin);
          }
        }
      });
    }, 550);
  }

  spawnFloatingCombatText(text, subtext = '', color = '#ffd32a', xPct = 50, yPct = 42) {
    let container = this.root.querySelector('.hud-fct-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'hud-fct-container';
      this.root.appendChild(container);
    }

    const fct = document.createElement('div');
    fct.className = 'fct-popup';
    fct.style.left = `${xPct + (Math.random() - 0.5) * 12}%`;
    fct.style.top = `${yPct + (Math.random() - 0.5) * 6}%`;
    fct.style.borderColor = color;
    fct.innerHTML = `
      <div class="fct-main-text" style="color: ${color}; text-shadow: 0 0 6px ${color}88, 0 2px 4px #000;">${text}</div>
      ${subtext ? `<div class="fct-sub-badge" style="background: ${color}; color: #000;">${subtext}</div>` : ''}
    `;

    container.appendChild(fct);

    const randomRot = (Math.random() - 0.5) * 14;
    const driftX = (Math.random() - 0.5) * 24;

    gsap.fromTo(fct,
      { scale: 0.25, opacity: 0, y: 15, rotation: randomRot * 1.5 },
      {
        scale: 1.05,
        opacity: 1,
        y: -20,
        x: driftX * 0.4,
        rotation: randomRot,
        duration: 0.22,
        ease: "back.out(2.2)",
        onComplete: () => {
          gsap.to(fct, {
            scale: 0.88,
            opacity: 0,
            y: -65,
            x: driftX,
            rotation: randomRot * 0.5,
            duration: 0.5,
            ease: "power2.in",
            onComplete: () => {
              try { fct.remove(); } catch (e) {}
            }
          });
        }
      }
    );

    // Effet d'impulsion visuelle sur le badge de score
    const scoreVal = this.root.querySelector('#hud-score-val');
    if (scoreVal) {
      gsap.fromTo(scoreVal,
        { scale: 1.18, color: color },
        { scale: 1.0, color: '#fffa65', duration: 0.25, ease: "back.out(2)" }
      );
    }
  }

  triggerCrashPenaltyUI(penalty) {
    // 1. Flash d'impact rouge sang sur l'écran
    const flash = document.createElement('div');
    flash.className = 'hud-penalty-flash';
    this.root.appendChild(flash);
    setTimeout(() => flash.remove(), 450);

    // 2. Pop-up pénalité de score rouge cartoon
    const pop = document.createElement('div');
    pop.className = 'hud-penalty-popup';
    pop.innerHTML = `<span>💥 -${penalty} PTS !</span>`;
    this.root.appendChild(pop);
    setTimeout(() => pop.remove(), 1100);

    // 3. Score clignotant rouge dans l'en-tête
    const scoreVal = this.root.querySelector('#hud-score-val');
    if (scoreVal) {
      scoreVal.style.color = '#ff4757';
      scoreVal.style.textShadow = '0 0 18px #ff4757';
      scoreVal.style.transform = 'scale(1.28)';
      setTimeout(() => {
        if (scoreVal) {
          scoreVal.style.color = '';
          scoreVal.style.textShadow = '';
          scoreVal.style.transform = '';
        }
      }, 550);
    }
  }

  triggerPedestrianCarnageFlash() {
    if (this.carnageFlashActive) return; // Anti-empilement : ne jamais saturer l'écran de rouge !
    this.carnageFlashActive = true;
    const flash = document.createElement('div');
    flash.className = 'hud-carnage-flash';
    this.root.appendChild(flash);
    setTimeout(() => {
      try { flash.remove(); } catch (e) {}
      this.carnageFlashActive = false;
    }, 200);
  }

  resetHUDCombo() {
    const comboBadge = this.root.querySelector('#hud-combo-badge');
    if (comboBadge) comboBadge.classList.remove('active');
  }

  updateHUDStats(data) {
    const speedVal = this.root.querySelector('#hud-speed-val');
    const speedGauge = this.root.querySelector('#hud-speed-gauge');
    const progressFill = this.root.querySelector('#hud-progress-fill');
    const progressPct = this.root.querySelector('#hud-progress-pct');
    const scoreVal = this.root.querySelector('#hud-score-val');
    const targetRemaining = this.root.querySelector('#hud-target-remaining');

    if (speedVal) speedVal.textContent = data.speed;
    if (speedGauge) {
      const pct = Math.min(100, Math.floor((data.speed / 160) * 100));
      speedGauge.style.width = `${pct}%`;
    }
    if (progressFill) {
      const pct = Math.min(100, Math.floor(data.progressRatio * 100));
      progressFill.style.width = `${pct}%`;
      if (progressPct) progressPct.textContent = `${pct}%`;

      // Dès que 100% est atteint : afficher le bouton d'extraction immédiate vers la carte
      const returnMapBtn = this.root.querySelector('#btn-hud-return-map-100');
      if (pct >= 100 || data.progressRatio >= 1.0) {
        progressFill.style.background = 'linear-gradient(90deg, #2ed573, #10ac84, #fffa65)';
        progressFill.style.boxShadow = '0 0 12px rgba(46, 213, 115, 0.7)';
        if (progressPct) {
          progressPct.textContent = '100% ✔';
          progressPct.style.color = '#fffa65';
          progressPct.style.fontWeight = '950';
        }
        if (returnMapBtn && returnMapBtn.style.display === 'none') {
          returnMapBtn.style.display = 'inline-flex';
          gsap.fromTo(returnMapBtn,
            { scale: 0.2, opacity: 0, x: 20 },
            { scale: 1.0, opacity: 1, x: 0, duration: 0.45, ease: "back.out(2.2)" }
          );
          soundManager.playVictory();
          Haptic.success();
        }
        const objCard = this.root.querySelector('#hud-objective-card');
        if (objCard) {
          objCard.classList.add('objective-100-complete');
          objCard.title = 'Objectif 100% atteint ! Cliquez pour retourner à la carte';
        }
      }
    }
    // Score dynamique au volant
    if (scoreVal) {
      scoreVal.textContent = data.score.toLocaleString('fr-FR');
    }

    // Gestion dynamique des objectifs Worldmageddon (Approche Cataclysme -> Explosion -> Fuite)
    const cityName = this.root.querySelector('#hud-city-name');
    const targetPts = this.root.querySelector('#hud-target-pts');
    const cPhase = data.cataclysmPhase || data.nuclearPhase;
    const cTimer = (data.cataclysmEscapeTimer !== undefined) ? data.cataclysmEscapeTimer : data.nuclearEscapeTimer;
    const dType = data.disasterType || (data.nuclearPhase ? 'NUCLEAR' : 'STREET');

    if (cPhase === 'ESCAPE') {
      if (cityName) {
        if (dType === 'NUCLEAR') cityName.innerHTML = `<span style="color: #ff4757; font-weight: 900;">🚨 ÉVACUEZ L'ONDE DE CHOC !</span>`;
        else if (dType === 'DAM') cityName.innerHTML = `<span style="color: #00d2d3; font-weight: 900;">🌊 FUYEZ LE DÉLUGE !</span>`;
        else if (dType === 'MOUNTAIN') cityName.innerHTML = `<span style="color: #feca57; font-weight: 900;">🏔️ FUYEZ L'AVALANCHE !</span>`;
        else cityName.innerHTML = `<span style="color: #ff4757; font-weight: 900;">🚨 ÉVACUEZ !</span>`;
      }
      if (targetPts && cTimer !== undefined) {
        targetPts.innerHTML = `<span style="color: #ffd32a; font-weight: 900;">⏱️ ${cTimer.toFixed(1)}s</span>`;
      }
    } else if (cPhase === 'APPROACH') {
      const distToCore = Math.max(0, 600 - data.distance);
      if (cityName) {
        if (dType === 'NUCLEAR') cityName.innerHTML = `<span style="color: #2ed573; font-weight: 900;">🎯 DÉTRUIRE RÉACTEUR</span>`;
        else if (dType === 'DAM') cityName.innerHTML = `<span style="color: #00cec9; font-weight: 900;">🎯 EXPLOSER LE BARRAGE</span>`;
        else if (dType === 'MOUNTAIN') cityName.innerHTML = `<span style="color: #feca57; font-weight: 900;">🎯 EXPLOSER LA MONTAGNE</span>`;
      }
      if (targetPts) {
        const icon = (dType === 'NUCLEAR') ? '☢️' : (dType === 'DAM' ? '🌊' : '🏔️');
        targetPts.innerHTML = `<span style="color: #2ed573;">${icon} ${distToCore}m</span>`;
      }
    } else {
      if (cityName) {
        const currentCity = gameState.selectedCity;
        cityName.textContent = `${currentCity.emblem || '📍'} ${currentCity.name.toUpperCase()}`;
      }
      if (targetPts) {
        targetPts.textContent = `🎯 ${(data.targetScore || gameState.selectedCity.targetScore || 2500).toLocaleString('fr-FR')} PTS`;
      }
    }

    if (targetRemaining) {
      const diff = Math.max(0, data.targetScore - data.score);
      if (diff === 0) {
        targetRemaining.innerHTML = '<span style="color: #2ed573; font-weight: 900;">★ OBJECTIF ATTEINT !</span>';
      } else {
        targetRemaining.textContent = `Reste : ${diff.toLocaleString('fr-FR')} pts`;
      }
    }

    // Mise à jour du compteur de carnage / extermination
    const killsVal = this.root.querySelector('#hud-kills-val');
    const quotaVal = this.root.querySelector('#hud-quota-val');
    if (killsVal && data.kills !== undefined) {
      killsVal.textContent = data.kills;
    }
    if (quotaVal && data.killQuota !== undefined) {
      quotaVal.textContent = data.killQuota;
    }
    // Mise à jour de la jauge et des boutons Frein/Arrêt & Nitro/Boisson Énergétique
    const brakeBtn = this.root.querySelector('#btn-hud-brake');
    const brakeLabel = this.root.querySelector('#hud-brake-label');
    const brakeIcon = this.root.querySelector('#hud-brake-icon');
    const nitroFill = this.root.querySelector('#hud-nitro-fill');
    const nitroSub = this.root.querySelector('#hud-nitro-sub');
    const nitroBtn = this.root.querySelector('#btn-hud-nitro');
    const nitroLabel = this.root.querySelector('#hud-nitro-label');
    const nitroIcon = this.root.querySelector('#hud-nitro-icon');

    const equippedBikeId = storage.getEquippedBike() || gameState.selectedBike?.id || 'tank';
    const isFootOrHorse = (equippedBikeId === 'cheval' || equippedBikeId === 'run_ak47' || equippedBikeId === 'run_chainsaw');
    const defaultLabel = isFootOrHorse ? 'BOISSON ÉNERGÉTIQUE' : 'NITRO';
    const readyLabel = isFootOrHorse ? 'BOISSON ÉNERGÉTIQUE' : 'NITRO';

    if (brakeBtn) {
      brakeBtn.classList.toggle('mode-homme', isFootOrHorse);
      brakeBtn.classList.toggle('mode-engin', !isFootOrHorse);
    }
    if (brakeIcon) {
      brakeIcon.textContent = isFootOrHorse ? '✋' : '🛑';
    }
    if (brakeLabel) {
      brakeLabel.textContent = isFootOrHorse ? 'ARRÊT' : 'FREIN';
    }

    if (nitroBtn) {
      nitroBtn.classList.toggle('btn-energy-drink', isFootOrHorse);
      nitroBtn.classList.toggle('mode-homme', isFootOrHorse);
      nitroBtn.classList.toggle('mode-engin', !isFootOrHorse);
    }
    if (nitroIcon) {
      nitroIcon.textContent = isFootOrHorse ? '🥤' : '🔥';
    }

    if (isFootOrHorse) {
      const cans = (data.energyCans !== undefined) ? data.energyCans : (gameState.energyDrinkCans || 0);
      if (data.isNitroActive) {
        if (nitroBtn) {
          nitroBtn.classList.add('active');
          nitroBtn.classList.remove('ready');
        }
        if (nitroSub) nitroSub.textContent = `BOOST ${data.nitroTimer.toFixed(1)}s`;
        if (nitroLabel) nitroLabel.textContent = 'BOISSON ÉNERGÉTIQUE';
        if (nitroFill) nitroFill.style.width = `${Math.round((data.nitroTimer / 5.0) * 100)}%`;
      } else {
        if (nitroBtn) nitroBtn.classList.remove('active');
        if (cans > 0) {
          if (nitroBtn) nitroBtn.classList.add('ready');
          if (nitroSub) nitroSub.textContent = `${cans} DISPO`;
          if (nitroLabel) nitroLabel.textContent = 'BOISSON ÉNERGÉTIQUE';
          if (nitroFill) nitroFill.style.width = '100%';
        } else {
          if (nitroBtn) nitroBtn.classList.remove('ready');
          if (nitroSub) nitroSub.textContent = '0 (ÉPUISÉ)';
          if (nitroLabel) nitroLabel.textContent = 'BOISSON ÉNERGÉTIQUE';
          if (nitroFill) nitroFill.style.width = '0%';
        }
      }
    } else if (nitroFill && data.nitroGauge !== undefined) {
      nitroFill.style.width = `${data.nitroGauge}%`;
      if (data.isNitroActive) {
        if (nitroBtn) {
          nitroBtn.classList.add('active');
          nitroBtn.classList.remove('ready');
        }
        if (nitroSub) nitroSub.textContent = `BOOST ${data.nitroTimer.toFixed(1)}s`;
        if (nitroLabel) nitroLabel.textContent = 'NITRO';
      } else {
        if (nitroBtn) nitroBtn.classList.remove('active');
        if (data.nitroGauge >= 100) {
          if (nitroBtn) nitroBtn.classList.add('ready');
          if (nitroSub) nitroSub.textContent = 'PRÊT !';
          if (nitroLabel) nitroLabel.textContent = readyLabel;
        } else {
          if (nitroBtn) nitroBtn.classList.remove('ready');
          if (nitroSub) nitroSub.textContent = `${data.nitroGauge}%`;
          if (nitroLabel) nitroLabel.textContent = defaultLabel;
        }
      }
    }
  }

  showTrafficLightWarning(streetName) {
    soundManager.playCrashPenalty();
    let toast = this.root.querySelector('.hud-traffic-warning-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'hud-traffic-warning-toast';
      this.root.appendChild(toast);
    }
    toast.innerHTML = `
      <div class="traffic-toast-inner">
        <div class="traffic-toast-icon-wrap">
          <span class="traffic-toast-icon">🚨</span>
        </div>
        <div class="traffic-toast-text">
          <div class="traffic-toast-top-tag">⚠️ DANGER CARREFOUR</div>
          <div class="traffic-toast-title">FEU ROUGE : ${streetName.toUpperCase()}</div>
          <div class="traffic-toast-sub">ARRÊT AU STOP = <strong>+250 PTS</strong> • FRANCHISSEZ À PLEIN RÉGIME !</div>
        </div>
      </div>
    `;
    toast.classList.add('visible');
    clearTimeout(this.trafficToastTimer);
    this.trafficToastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 3200);
  }
  showProfileModal() {
    soundManager.playClick();
    this.closeActiveModals();

    const overlay = document.createElement('div');
    overlay.id = 'modal-profile-screen';
    overlay.className = 'modal-overlay interactive';
    this.activeModals.push(overlay);

    const title = storage.getPlayerTitle();
    const unlockedCount = storage.data.unlockedCities.length;
    const exterminatedCount = (storage.data.exterminatedCities || []).length;
    const totalStars = storage.getTotalStars();
    const wmProgress = storage.getWorldmageddonProgress();
    const currentCoins = storage.data.coins || 0;
    const steerModes = [
      { id: 'DYNAMIC', label: 'DYNAMIQUE' },
      { id: 'HIGH', label: 'HAUTE' },
      { id: 'NORMAL', label: 'NORMALE' }
    ];
    const currentSteer = storage.data.settings.steerSensitivity || 'DYNAMIC';
    const currentSteerLabel = (steerModes.find(m => m.id === currentSteer) || steerModes[0]).label;

    overlay.innerHTML = `
      <div class="modal-card profile-modal-card" style="max-width: 480px; max-height: 90vh; overflow-y: auto; text-align: left; padding: 16px;">
        
        <!-- EN-TÊTE PROFIL & OPTIONS UNIFIÉ -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #ffd700; padding-bottom: 10px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #eb4d4b, #f0932b); display: flex; align-items: center; justify-content: center; font-size: 1.7rem; border: 2px solid #ffd700; box-shadow: 0 0 14px rgba(255, 215, 0, 0.4);">
              👤
            </div>
            <div>
              <h2 style="margin: 0; font-size: 1.2rem; font-weight: 950; color: #ffffff; letter-spacing: 0.5px;">PROFIL & OPTIONS</h2>
              <div style="background: rgba(255, 215, 0, 0.15); border: 1px solid #ffd700; color: #ffd700; font-size: 0.72rem; font-weight: 900; padding: 2px 8px; border-radius: 8px; display: inline-block; margin-top: 3px;">
                ${wmProgress.rankIcon} ${title} • ${wmProgress.rank}
              </div>
            </div>
          </div>
          <button id="btn-close-profile" class="btn-round-action" style="background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.3); color: #fff; width: 34px; height: 34px;">✕</button>
        </div>

        <!-- SECTION 1 : PARAMÈTRES AUDIO, VIBRATIONS & DIRECTION -->
        <div style="background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 12px; margin-bottom: 12px;">
          <div style="font-size: 0.75rem; color: #ced6e0; font-weight: 900; letter-spacing: 0.8px; margin-bottom: 8px;">
            ⚙️ PARAMÈTRES AUDIO & COMMANDES
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button id="btn-toggle-music" class="btn-arcade" style="padding: 10px 8px; font-size: 0.76rem; background: ${soundManager.isMutedMusic ? 'rgba(80,80,80,0.4)' : 'linear-gradient(135deg, #0984e3, #6c5ce7)'};">
              🎵 MUSIQUE : ${soundManager.isMutedMusic ? 'OFF 🔇' : 'ON 🔊'}
            </button>
            <button id="btn-toggle-sfx" class="btn-arcade" style="padding: 10px 8px; font-size: 0.76rem; background: ${soundManager.isMutedSfx ? 'rgba(80,80,80,0.4)' : 'linear-gradient(135deg, #00cec9, #0984e3)'};">
              🔊 EFFETS : ${soundManager.isMutedSfx ? 'OFF 🔇' : 'ON 🔊'}
            </button>
            <button id="btn-toggle-haptic" class="btn-arcade" style="padding: 10px 8px; font-size: 0.76rem; background: ${Haptic.enabled ? 'linear-gradient(135deg, #2ed573, #26de81)' : 'rgba(80,80,80,0.4)'};">
              📳 VIBRATIONS : ${Haptic.enabled ? 'ON ✅' : 'OFF ❌'}
            </button>
            <button id="btn-toggle-steer" class="btn-arcade" style="padding: 10px 8px; font-size: 0.76rem; background: linear-gradient(135deg, #e67e22, #f39c12);">
              🎯 DIRECTION : ${currentSteerLabel}
            </button>
          </div>
        </div>

        <!-- SECTION 2 : BILAN DE CAMPAGNE -->
        <div style="background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(0, 206, 201, 0.45); border-radius: 12px; padding: 12px; margin-bottom: 12px;">
          <div style="font-size: 0.75rem; color: #00cec9; font-weight: 900; letter-spacing: 0.8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
            <span>📊 PROGRESSION DE CAMPAGNE</span>
            <span style="color: #fffa65;">${wmProgress.totalKills.toLocaleString('fr-FR')} VICTIMES</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px; text-align: center;">
              <span style="font-size: 0.68rem; color: #a4b0be; display: block; font-weight: 800;">VILLES DÉBLOQUÉES</span>
              <strong style="font-size: 1.05rem; color: #2ed573; font-weight: 950;">${unlockedCount} / ${CITIES.length}</strong>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px; text-align: center;">
              <span style="font-size: 0.68rem; color: #a4b0be; display: block; font-weight: 800;">VILLES ANÉANTIES</span>
              <strong style="font-size: 1.05rem; color: #ff4757; font-weight: 950;">${exterminatedCount} / ${CITIES.length}</strong>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px; text-align: center;">
              <span style="font-size: 0.68rem; color: #a4b0be; display: block; font-weight: 800;">ÉTOILES GAGNÉES</span>
              <strong style="font-size: 1.05rem; color: #ffd700; font-weight: 950;">${totalStars} / ${CITIES.length * 3} ⭐</strong>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px; text-align: center;">
              <span style="font-size: 0.68rem; color: #a4b0be; display: block; font-weight: 800;">TRÉSORERIE</span>
              <strong style="font-size: 1.05rem; color: #ffd32a; font-weight: 950;">🪙 ${currentCoins.toLocaleString('fr-FR')}</strong>
            </div>
          </div>
        </div>

        <!-- SECTION 3 : SAUVEGARDE, RÉINITIALISATION & MENTIONS LÉGALES -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">
          <button id="btn-profile-cloud" class="btn-arcade" style="padding: 11px; font-size: 0.82rem; background: linear-gradient(135deg, #0984e3, #00cec9);">
            💾 SAUVEGARDE & TRANSFERT DE PROGRESSION
          </button>

          <button id="btn-profile-reset-campagne" class="btn-arcade" style="padding: 10px; font-size: 0.78rem; background: rgba(255, 71, 87, 0.15); border: 1.5px solid #ff4757; color: #ff7675;">
            🔄 RÉINITIALISER LA PROGRESSION
          </button>

          <button id="btn-profile-legal" class="btn-arcade btn-ghost" style="padding: 9px; font-size: 0.75rem;">
            ℹ️ MENTIONS LÉGALES & CONFIDENTIALITÉ
          </button>
        </div>

        <button id="btn-profile-close-bottom" class="btn-arcade btn-secondary" style="width: 100%; padding: 11px;">
          FERMER
        </button>
      </div>
    `;

    this.root.appendChild(overlay);

    const syncSplashAudioIcon = () => {
      const isAnyAudio = !soundManager.isMutedMusic || !soundManager.isMutedSfx;
      const iconEl = document.getElementById('splash-audio-icon');
      const btnEl = document.getElementById('btn-splash-audio');
      if (iconEl) iconEl.textContent = isAnyAudio ? '🔊' : '🔇';
      if (btnEl) btnEl.title = isAnyAudio ? 'Couper le Son' : 'Activer le Son';
    };

    // Événements boutons Paramètres
    overlay.querySelector('#btn-toggle-music')?.addEventListener('click', () => {
      soundManager.toggleMusic();
      const btn = overlay.querySelector('#btn-toggle-music');
      if (btn) {
        btn.textContent = `🎵 MUSIQUE : ${soundManager.isMutedMusic ? 'OFF 🔇' : 'ON 🔊'}`;
        btn.style.background = soundManager.isMutedMusic ? 'rgba(80,80,80,0.4)' : 'linear-gradient(135deg, #0984e3, #6c5ce7)';
      }
      syncSplashAudioIcon();
    });

    overlay.querySelector('#btn-toggle-sfx')?.addEventListener('click', () => {
      soundManager.toggleSfx();
      if (!soundManager.isMutedSfx) soundManager.playClick('default');
      const btn = overlay.querySelector('#btn-toggle-sfx');
      if (btn) {
        btn.textContent = `🔊 EFFETS : ${soundManager.isMutedSfx ? 'OFF 🔇' : 'ON 🔊'}`;
        btn.style.background = soundManager.isMutedSfx ? 'rgba(80,80,80,0.4)' : 'linear-gradient(135deg, #00cec9, #0984e3)';
      }
      syncSplashAudioIcon();
    });

    overlay.querySelector('#btn-toggle-haptic')?.addEventListener('click', () => {
      Haptic.enabled = !Haptic.enabled;
      if (Haptic.enabled) Haptic.tap();
      const btn = overlay.querySelector('#btn-toggle-haptic');
      if (btn) {
        btn.textContent = `📳 VIBRATIONS : ${Haptic.enabled ? 'ON ✅' : 'OFF ❌'}`;
        btn.style.background = Haptic.enabled ? 'linear-gradient(135deg, #2ed573, #26de81)' : 'rgba(80,80,80,0.4)';
      }
    });

    overlay.querySelector('#btn-toggle-steer')?.addEventListener('click', () => {
      soundManager.playClick('default');
      const cur = storage.data.settings.steerSensitivity || 'DYNAMIC';
      const idx = steerModes.findIndex(m => m.id === cur);
      const next = steerModes[(idx + 1) % steerModes.length];
      storage.updateSettings({ steerSensitivity: next.id });
      const btn = overlay.querySelector('#btn-toggle-steer');
      if (btn) {
        btn.textContent = `🎯 DIRECTION : ${next.label}`;
      }
    });

    overlay.querySelector('#btn-profile-reset-campagne')?.addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.showResetProgressionModal();
    });

    overlay.querySelector('#btn-profile-cloud')?.addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.showCloudSaveModal();
    });

    overlay.querySelector('#btn-profile-legal')?.addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.showLegalModal();
    });

    const closeProfile = () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
    };
    overlay.querySelector('#btn-close-profile')?.addEventListener('click', closeProfile);
    overlay.querySelector('#btn-profile-close-bottom')?.addEventListener('click', closeProfile);

    const card = overlay.querySelector('.modal-card');
    if (card) {
      gsap.fromTo(card,
        { scale: 0.85, opacity: 0, y: 25 },
        { scale: 1.0, opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.8)" }
      );
    }
  }

  // --- 6. MODALE DE CONFIRMATION DE QUITTER ---
  showQuitConfirmationModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    this.activeModals.push(overlay);

    overlay.innerHTML = `
      <div class="modal-card">
        <h2 class="modal-title">QUITTER LE JEU ?</h2>
        <p style="text-align: center; font-size: 0.9rem; color: #ced6e0;">
          Voulez-vous vraiment quitter CarnageCruise ? Toute votre progression est bien sauvegardée.
        </p>

        <div class="modal-actions" style="margin-top: 10px;">
          <button id="btn-cancel-quit" class="btn-arcade btn-secondary">
            ANNULER
          </button>
          <button id="btn-confirm-quit" class="btn-arcade btn-ghost" style="color: #ff4757; border-color: #ff4757;">
            QUITTER
          </button>
        </div>
      </div>
    `;

    overlay.querySelector('#btn-cancel-quit').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
    });

    overlay.querySelector('#btn-confirm-quit').addEventListener('click', async () => {
      soundManager.destroy();
      try {
        await App.exitApp();
      } catch (e) {
        if (window.Capacitor?.Plugins?.App) {
          window.Capacitor.Plugins.App.exitApp();
        } else {
          window.close();
        }
      }
    });

    this.root.appendChild(overlay);

    const pauseCard = overlay.querySelector('.modal-card');
    if (pauseCard) {
      gsap.fromTo(pauseCard,
        { scale: 0.8, opacity: 0, y: 30 },
        { scale: 1.0, opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.8)" }
      );
    }
  }

  // --- 7. MODALE DE RÉSULTATS ---
  showResultsModal(data) {
    if (this.isReturningToMap) return;

    if (this.assaultOverlay && document.body.contains(this.assaultOverlay)) {
      // Si la carte triomphale d'assaut est active, on met à jour ses métriques au lieu d'ouvrir une modale doublon
      const starsText = this.assaultOverlay.querySelector('#assault-stars-text');
      if (starsText) {
        starsText.textContent = '★'.repeat(data.stars || 1) + '☆'.repeat(3 - (data.stars || 1));
      }
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    this.activeModals.push(overlay);

    const starsHtml = '★'.repeat(data.stars) + '☆'.repeat(3 - data.stars);
    const currentCityId = (data.city ? data.city.id : gameState.selectedCity?.id);
    const currentCityObj = CITIES.find(c => c.id === currentCityId) || gameState.selectedCity;
    const isAlreadyExterminated = storage.isCityExterminated(currentCityObj.id);
    const currentIndex = CITIES.findIndex(c => c.id === currentCityId);
    const nextCity = (currentIndex >= 0 && currentIndex < CITIES.length - 1) ? CITIES[currentIndex + 1] : null;
    const isNextUnlocked = nextCity && (storage.isCityUnlocked(nextCity.id) || (data.newlyUnlockedCity && data.newlyUnlockedCity.id === nextCity.id));

    overlay.innerHTML = `
      <div class="modal-card">
        <h2 class="modal-title">${data.stars >= 1 ? '💀 ASSAUT VALIDÉ • ZONE PURGÉE !' : '⚠️ SECTEUR CONTESTÉ'}</h2>

        <div class="stars-awarded">
          ${starsHtml}
        </div>

        <div class="results-stats">
          <div class="result-row">
            <span>Score Final :</span>
            <span style="color: #fffa65;">${data.score} pts ${data.isNewBest ? '🏆 NOUVEAU RECORD !' : ''}</span>
          </div>
          <div class="result-row">
            <span>Personnes Heurtées :</span>
            <span>${data.interactions}</span>
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
          <div class="result-row" style="background: rgba(255, 71, 87, 0.15); border: 1px solid rgba(255, 71, 87, 0.35); padding: 6px 10px; border-radius: 8px; margin-top: 6px;">
            <span style="color: #ff4757; font-weight: 800;">💀 Extermination Étape :</span>
            <span style="color: #fffa65; font-weight: 800;">+${(data.runVictims || data.kills || 35000).toLocaleString('fr-FR')} Humains</span>
          </div>
          <div class="result-row" style="font-size: 0.8rem; color: #a4b0be; padding: 2px 4px;">
            <span>🌍 Total Worldmageddon :</span>
            <span style="color: #2ed573; font-weight: 800;">${(data.worldTotal || 0).toLocaleString('fr-FR')} / 8 000 000 000</span>
          </div>
        </div>

        ${data.newlyUnlockedCity ? `
          <div style="background: rgba(46, 213, 115, 0.2); border: 1px solid #2ed573; padding: 10px; border-radius: 14px; text-align: center;">
            <strong style="color: #2ed573;">✨ NOUVELLE VILLE DÉBLOQUÉE !</strong>
            <p style="font-size: 0.85rem; margin-top: 4px;">Vous pouvez maintenant attaquer <strong>${data.newlyUnlockedCity.name}</strong> !</p>
          </div>
        ` : ''}

        <div class="results-actions-primary-dock" style="display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: 14px;">
          ${nextCity && isNextUnlocked ? `
            <button id="btn-results-next" class="btn-arcade" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #2ed573, #10ac84); font-size: 1.05rem; font-weight: 950; box-shadow: 0 4px 18px rgba(46, 213, 115, 0.5); border: 2px solid #7bed9f; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>💥 RAID SUIVANT : ${nextCity.name.toUpperCase()}</span>
            </button>
          ` : ''}

          <!-- BOUTON RETOUR SATELLITE À LA CARTE : HÉROS PRIORITAIRE, TRANSITION CINÉMATIQUE FLUIDE -->
          <button id="btn-results-map" class="btn-arcade" style="width: 100%; padding: 13px; background: linear-gradient(135deg, #3742fa, #2f3542); font-size: 1.02rem; font-weight: 950; border: 2px solid #70a1ff; box-shadow: 0 4px 18px rgba(55, 66, 250, 0.45); display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>🛰️ RETOUR SATELLITE À LA CARTE</span>
          </button>
        </div>

        <div class="results-actions-secondary-row" style="display: flex; gap: 8px; width: 100%; margin-top: 8px;">
          <button id="btn-results-retry" class="btn-arcade btn-ghost" style="flex: 1; padding: 10px; font-size: 0.85rem;">
            <span>🔄 REJOUER</span>
          </button>
          <button id="btn-results-garage" class="btn-arcade btn-accent" style="flex: 1; padding: 10px; font-size: 0.85rem;">
            <span>🪖 GARAGE</span>
          </button>
          ${!isAlreadyExterminated ? `
            <button id="btn-results-wmd-exterminate" class="btn-arcade" style="flex: 1.2; padding: 10px; font-size: 0.82rem; background: rgba(235, 77, 75, 0.25); border: 1.5px solid #ff7675; color: #ff7675;">
              <span>☢️ NUCLÉAIRE</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;

    const btnWmdResults = overlay.querySelector('#btn-results-wmd-exterminate');
    if (btnWmdResults) {
      btnWmdResults.addEventListener('click', () => {
        soundManager.playClick();
        overlay.remove();
        this.activeModals = this.activeModals.filter(m => m !== overlay);
        this.showWmdStrikeModal(currentCityObj);
      });
    }

    const btnNext = overlay.querySelector('#btn-results-next');
    if (btnNext && nextCity) {
      btnNext.addEventListener('click', () => {
        soundManager.playClick();
        overlay.remove();
        this.activeModals = this.activeModals.filter(m => m !== overlay);
        gameState.selectCity(nextCity.id);
        this.selectedMapCity = nextCity;
        if (this.onAction) this.onAction('START_RUN', nextCity);
      });
    }

    overlay.querySelector('#btn-results-retry').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      if (this.onAction) this.onAction('START_RUN', gameState.selectedCity);
    });

    overlay.querySelector('#btn-results-map').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      let targetCity = currentCityObj;
      if (data.newlyUnlockedCity) {
        this.selectedMapCity = data.newlyUnlockedCity;
        gameState.selectCity(data.newlyUnlockedCity.id);
        targetCity = data.newlyUnlockedCity;
      } else if (nextCity && isNextUnlocked) {
        this.selectedMapCity = nextCity;
        gameState.selectCity(nextCity.id);
        targetCity = nextCity;
      }
      this.triggerReturnToMapCinematic(targetCity);
    });

    overlay.querySelector('#btn-results-garage').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      if (data.newlyUnlockedCity) {
        this.selectedMapCity = data.newlyUnlockedCity;
        gameState.selectCity(data.newlyUnlockedCity.id);
      } else if (nextCity && isNextUnlocked) {
        this.selectedMapCity = nextCity;
        gameState.selectCity(nextCity.id);
      }
      this.previousScreen = 'MAP';
      this.setScreen('GARAGE');
    });

    this.root.appendChild(overlay);

    const modalCard = overlay.querySelector('.modal-card');
    if (modalCard) {
      gsap.fromTo(modalCard,
        { scale: 0.72, opacity: 0, y: 35 },
        { scale: 1.0, opacity: 1, y: 0, duration: 0.42, ease: "back.out(1.8)" }
      );
      gsap.from(modalCard.querySelectorAll('.result-row'), {
        x: -25,
        opacity: 0,
        stagger: 0.05,
        duration: 0.28,
        ease: "power2.out",
        delay: 0.12
      });
      const starsEl = modalCard.querySelector('.stars-awarded');
      if (starsEl) {
        gsap.from(starsEl, {
          scale: 0.2,
          opacity: 0,
          duration: 0.45,
          ease: "elastic.out(1.2, 0.4)",
          delay: 0.1
        });
      }
    }
  }

  // --- 8. MODALE DE PAUSE & CHANGEMENT D'ENGIN EN DIRECT ---
  showPauseModal() {
    // Éviter d'empiler plusieurs modales de pause
    const existingPause = this.root.querySelector('.pause-modal-overlay');
    if (existingPause) return;

    // Supprimer tout compte à rebours résiduel pour éviter un conflit d'état
    const existingCountdown = this.root.querySelector('.hud-countdown-overlay');
    if (existingCountdown) existingCountdown.remove();

    if (this.onAction) {
      this.onAction('PAUSE');
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay pause-modal-overlay interactive';
    overlay.dataset.isPauseModal = 'true';
    this.activeModals.push(overlay);

    const equippedBikeId = (storage && typeof storage.getEquippedBike === 'function' ? storage.getEquippedBike() : null)
      || gameState.selectedBike?.id
      || 'tank';

    let unlockedBikes = BIKES;
    try {
      if (storage && typeof storage.isBikeUnlocked === 'function') {
        const filtered = BIKES.filter(b => storage.isBikeUnlocked(b.id));
        if (filtered.length > 0) unlockedBikes = filtered;
      }
    } catch (err) {
      unlockedBikes = BIKES;
    }

    const bikeGridHtml = unlockedBikes.map(b => {
      const isEquipped = b.id === equippedBikeId;
      return `
        <button type="button" class="pause-bike-item ${isEquipped ? 'equipped' : ''}" data-bike-id="${b.id}" title="Déployer ${b.name}">
          <span class="pause-bike-icon">${b.icon}</span>
          <span class="pause-bike-name">${b.name}</span>
          ${isEquipped ? '<span class="pause-bike-active-dot">ACTIF</span>' : ''}
        </button>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="modal-card pause-modal-enhanced">
        <div class="pause-modal-header">
          <div class="pause-modal-title-badge">
            <svg class="pause-modal-svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <rect x="5.5" y="4.5" width="4.5" height="15" rx="2.2" fill="currentColor" />
              <rect x="14" y="4.5" width="4.5" height="15" rx="2.2" fill="currentColor" />
            </svg>
            <h2 class="modal-title" style="margin: 0;">PAUSE TACTIQUE</h2>
          </div>
          <button type="button" id="btn-pause-close-x" class="pause-modal-close-x" title="Reprendre la course" aria-label="Reprendre">✕</button>
        </div>

        <div class="pause-vehicle-switcher">
          <div class="pause-switcher-header">
            <span>⚡ CHANGER D'ENGIN EN COURSE</span>
            <span class="pause-switcher-sub">Déploiement immédiat</span>
          </div>
          <div class="pause-bike-grid">
            ${bikeGridHtml}
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" id="btn-pause-resume" class="btn-arcade">
            ▶️ REPRENDRE LA COURSE
          </button>
          <button type="button" id="btn-pause-garage" class="btn-arcade btn-secondary">
            🪖 GARAGE & ARSENAL COMPLET
          </button>
          <button type="button" id="btn-pause-restart" class="btn-arcade btn-accent">
            🔄 RECOMMENCER L'ÉTAPE
          </button>
          <button type="button" id="btn-pause-map" class="btn-arcade btn-ghost">
            🛰️ RETOUR SATELLITE À LA CARTE
          </button>
        </div>
      </div>
    `;

    const closeAndResume = () => {
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      if (this.onAction) this.onAction('RESUME');
    };

    // Clic sur l'arrière-plan sombre ou sur la croix pour reprendre immédiatement
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        soundManager.playClick();
        closeAndResume();
      }
    });

    const closeXBtn = overlay.querySelector('#btn-pause-close-x');
    if (closeXBtn) {
      closeXBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        soundManager.playClick();
        closeAndResume();
      });
    }

    // Changement d'engin instantané en pleine course
    overlay.querySelectorAll('.pause-bike-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bikeId = btn.getAttribute('data-bike-id');
        const bikeObj = BIKES.find(b => b.id === bikeId);
        if (!bikeObj) return;
        soundManager.playClick('hero');
        storage.equipBike(bikeObj.id);
        gameState.selectBike(bikeObj.id);
        if (this.onAction) {
          this.onAction('CHANGE_BIKE_IN_GAME', bikeObj);
        }
        overlay.remove();
        this.activeModals = this.activeModals.filter(m => m !== overlay);
        // Rafraîchir le HUD pour mettre à jour le bouton d'arme / nitro et l'icône de l'engin sans relancer le compte à rebours
        gameState.currentMode = 'PLAYING';
        this.root.innerHTML = '';
        this.renderHUDScreen();
        this.updateHUDScore({
          score: gameState.score,
          combo: gameState.combo,
          comboTitle: 'COMBO'
        });
        if (this.onAction) {
          this.onAction('RESUME');
        }
        this.showToastUnlock({ name: `${bikeObj.icon} ${bikeObj.name.toUpperCase()} DÉPLOYÉ !` });
      });
    });

    overlay.querySelector('#btn-pause-resume').addEventListener('click', (e) => {
      e.stopPropagation();
      soundManager.playClick();
      closeAndResume();
    });

    overlay.querySelector('#btn-pause-garage').addEventListener('click', (e) => {
      e.stopPropagation();
      soundManager.playClick('garage');
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.previousScreen = 'MAP';
      this.setScreen('GARAGE');
    });

    overlay.querySelector('#btn-pause-restart').addEventListener('click', (e) => {
      e.stopPropagation();
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      if (this.onAction) this.onAction('START_RUN', gameState.selectedCity);
    });

    overlay.querySelector('#btn-pause-map').addEventListener('click', (e) => {
      e.stopPropagation();
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.triggerReturnToMapCinematic(gameState.selectedCity);
    });

    this.root.appendChild(overlay);

    const pauseCard = overlay.querySelector('.modal-card');
    if (pauseCard) {
      gsap.fromTo(pauseCard,
        { scale: 0.88, opacity: 0, y: 20 },
        { scale: 1.0, opacity: 1, y: 0, duration: 0.28, ease: "back.out(1.6)" }
      );
    }
  }

  // --- 9. MODALE DE PARAMÈTRES ---
  showSettingsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    this.activeModals.push(overlay);

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
          <div class="result-row" style="align-items: center;">
            <span>Sensibilité Direction :</span>
            <button id="toggle-steer-sens" class="btn-arcade btn-accent" style="padding: 6px 14px; font-size: 0.85rem; font-weight: 900;">
              ${(storage.data.settings?.steerSensitivity || 'DYNAMIC') === 'HIGH' ? '⚡ ÉLEVÉE' : ((storage.data.settings?.steerSensitivity || 'DYNAMIC') === 'NORMAL' ? '🔹 NORMALE' : '🔥 DYNAMIQUE')}
            </button>
          </div>
        </div>

        <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
          <button id="btn-settings-cloud" class="btn-arcade" style="width: 100%; margin-bottom: 10px; background: linear-gradient(135deg, #4285F4, #34A853); font-size: 0.85rem;">
            ☁️ COMPTE GOOGLE & SAUVEGARDE CLOUD
          </button>
          <div style="font-size: 0.78rem; color: #a4b0be; margin-bottom: 8px;">
            CarnageCruise Arcade 3D ${FULL_VERSION}<br>
            ${COPYRIGHT_NOTICE}
          </div>
          <button id="btn-settings-legal" class="btn-legal-link" style="font-size: 0.8rem;">
            📜 Mentions Légales & Version
          </button>
          <div style="margin-top: 6px;">
            <button id="btn-settings-cookies" class="btn-legal-link" style="font-size: 0.8rem; color: #00cec9;">
              🍪 Préférences Cookies & Publicités Google Ads
            </button>
          </div>
        </div>

        <!-- Section Réinitialisation des Scores demandée par le joueur -->
        <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.12);">
          <button id="btn-settings-reset-scores" class="btn-arcade" style="width: 100%; background: rgba(235, 77, 75, 0.2); border: 1.5px solid #ff7675; color: #ff7675; font-size: 0.85rem; font-weight: 900; padding: 11px;">
            <span>🔄 RÉINITIALISER LES SCORES DES ÉTAPES</span>
          </button>
        </div>

        <button id="btn-settings-close" class="btn-arcade" style="margin-top: 14px;">
          VALIDER
        </button>
      </div>
    `;

    overlay.querySelector('#btn-settings-reset-scores')?.addEventListener('click', () => {
      soundManager.playClick();
      this.showResetScoresConfirmationModal();
    });

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

    overlay.querySelector('#toggle-steer-sens')?.addEventListener('click', (e) => {
      soundManager.playClick();
      const current = storage.data.settings.steerSensitivity || 'DYNAMIC';
      const order = ['DYNAMIC', 'HIGH', 'NORMAL'];
      const next = order[(order.indexOf(current) + 1) % order.length];
      if (!storage.data.settings) storage.data.settings = {};
      storage.data.settings.steerSensitivity = next;
      storage.save();
      const label = next === 'HIGH' ? '⚡ ÉLEVÉE' : (next === 'NORMAL' ? '🔹 NORMALE' : '🔥 DYNAMIQUE');
      e.target.textContent = label;
      Haptic.tap();
    });

    overlay.querySelector('#btn-settings-cloud')?.addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.showCloudSaveModal();
    });

    overlay.querySelector('#btn-settings-legal').addEventListener('click', () => {
      soundManager.playClick();
      this.showLegalModal();
    });

    overlay.querySelector('#btn-settings-cookies').addEventListener('click', () => {
      soundManager.playClick();
      cookieConsentManager.showConsentModal(true);
    });

    overlay.querySelector('#btn-settings-close').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
    });

    this.root.appendChild(overlay);

    const pauseCard = overlay.querySelector('.modal-card');
    if (pauseCard) {
      gsap.fromTo(pauseCard,
        { scale: 0.8, opacity: 0, y: 30 },
        { scale: 1.0, opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.8)" }
      );
    }
  }

  // --- MODALE CONFIRMATION RESET SCORES ---
  showResetScoresConfirmationModal() {
    soundManager.playClick();
    const existing = document.getElementById('modal-reset-scores-confirm');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-reset-scores-confirm';
    modal.className = 'tactical-modal-overlay';
    modal.innerHTML = `
      <div class="tactical-modal-card" style="max-width: 440px; text-align: center; border-color: #ff7675;">
        <div style="font-size: 2.6rem; margin-bottom: 8px;">🔄</div>
        <h3 style="color: #fffa65; font-size: 1.25rem; font-weight: 950; margin: 0 0 10px 0;">RÉINITIALISER LES SCORES ?</h3>
        <p style="font-size: 0.85rem; color: #ced6e0; line-height: 1.5; margin: 0 0 18px 0;">
          Cette action remettra à zéro les records de points et étoiles de toutes les villes.<br>
          <strong style="color: #2ed573;">Vos bolides, améliorations et pièces d'or restent conservés.</strong>
        </p>
        <div style="display: flex; gap: 10px;">
          <button id="btn-cancel-reset-scores" class="btn-arcade btn-secondary" style="flex: 1; padding: 12px;">
            <span>ANNULER</span>
          </button>
          <button id="btn-confirm-reset-scores" class="btn-arcade" style="flex: 1.2; padding: 12px; background: linear-gradient(135deg, #eb4d4b, #c0392b); border-color: #ff7675; color: #fff; font-weight: 950;">
            <span>💥 CONFIRMER LE RESET</span>
          </button>
        </div>
      </div>
    `;

    this.root.appendChild(modal);

    modal.querySelector('#btn-cancel-reset-scores').addEventListener('click', () => {
      soundManager.playClick();
      modal.remove();
    });

    modal.querySelector('#btn-confirm-reset-scores').addEventListener('click', () => {
      storage.resetScores();
      soundManager.playExplosion();
      Haptic.warning();
      modal.remove();
      this.closeActiveModals();
      this.showToastUnlock({ name: '🔄 Scores des étapes réinitialisés avec succès !' });
      this.render();
    });
  }

  // --- 10. MODALE MENTIONS LÉGALES & COPYRIGHT EOMEDIA 2026 ---
  showLegalModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    this.activeModals.push(overlay);

    overlay.innerHTML = `
      <div class="modal-card" style="max-height: 85vh; overflow-y: auto; text-align: left;">
        <h2 class="modal-title" style="text-align: center;">MENTIONS LÉGALES & POLITIQUE DE CONFIDENTIALITÉ</h2>

        <div style="font-size: 0.82rem; line-height: 1.5; color: #ced6e0; display: flex; flex-direction: column; gap: 10px; margin: 12px 0;">
          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
            <strong style="color: #f1c40f;">Éditeur & Développeur :</strong><br>
            <strong>EOMedia</strong> — Tous droits réservés © 2026.<br>
            Version installée : <strong style="color: #2ed573;">${FULL_VERSION}</strong> (${RELEASE_NAME}) <span style="background: #ff4757; color: #fff; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; vertical-align: middle;">CANAL BETA</span><br>
            Contact éditeur : support@eomedia.fr
          </div>

          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
            <strong style="color: #38ada9;">Jeu & Fiction Burlesque Worldmageddon :</strong><br>
            <em>CarnageCruise Arcade 3D</em> est une œuvre de fiction d'action satirique, humoristique et parodique.
            Le scénario de dépopulation mondiale relève de la caricature de série B et du jeu vidéo d'arcade rétro.
            Toute ressemblance avec des personnes réelles, des incidents ou des marques existantes est purement fortuite.
            Le jeu encourage la prudence et le respect strict du Code de la Route dans la vie réelle.
          </div>

          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
            <strong style="color: #2ed573;">Protection des Données (RGPD & ePrivacy) :</strong><br>
            Le jeu s'exécute en local sur votre appareil Android. Les scores et progression sont stockés sur votre terminal.
            La synchronisation Google Play Games Cloud Save utilise les API officielles Google pour enregistrer votre sauvegarde chiffrée sur votre compte Google personnel.
          </div>

          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
            <strong style="color: #00cec9;">Publicités Google AdMob & Cookies :</strong><br>
            Les annonces publicitaires sont gérées par Google AdMob conformément au Règlement Général sur la Protection des Données (RGPD) et aux règles de consentement de l'UE. Vous pouvez modifier vos choix publicitaires à tout moment dans les options.
          </div>

          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
            <strong style="color: #e056fd;">Propriété Intellectuelle :</strong><br>
            L'ensemble des modèles 3D, textures, interfaces utilisateur, algorithmes procéduraux, effets sonores WebAudio et univers visuels sont la propriété exclusive d'<strong>EOMedia 2026</strong>.
          </div>
        </div>

        <button id="btn-legal-close" class="btn-arcade" style="width: 100%; margin-top: 10px;">
          J'AI COMPRIS
        </button>
      </div>
    `;

    overlay.querySelector('#btn-legal-close').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
    });

    this.root.appendChild(overlay);

    const pauseCard = overlay.querySelector('.modal-card');
    if (pauseCard) {
      gsap.fromTo(pauseCard,
        { scale: 0.8, opacity: 0, y: 30 },
        { scale: 1.0, opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.8)" }
      );
    }
  }

  // --- 11. DOSSIER D'EXTERMINATION MONDIALE (WORLDMAGEDDON) ---
  showWorldmageddonModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    this.activeModals.push(overlay);

    const wm = storage.getWorldmageddonProgress();
    const cityCount = CITIES.length;
    const completedCities = Object.values(storage.data.cityScores).filter(c => c.completed).length;

    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 480px; max-height: 88vh; overflow-y: auto; text-align: left;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #ff4757; padding-bottom: 8px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 2rem;">💀</span>
            <div>
              <h2 style="margin: 0; font-size: 1.35rem; color: #ff4757; font-weight: 900; letter-spacing: 1px;">DOSSIER WORLDMAGEDDON</h2>
              <div style="font-size: 0.75rem; color: #a4b0be;">PLAN D'EXTERMINATION MONDIALE</div>
            </div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.75rem; color: #2ed573; background: rgba(46, 213, 115, 0.15); border: 1px solid #2ed573; padding: 2px 8px; border-radius: 8px; font-weight: 800;">
              ${wm.rankIcon} ${wm.rank}
            </span>
          </div>
        </div>

        <!-- Grande Jauge de Dépopulation Mondiale -->
        <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 12px; padding: 12px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 800; margin-bottom: 6px;">
            <span style="color: #ff4757;">HUMANITÉ ÉRADIQUÉE :</span>
            <span style="color: #fffa65; font-family: monospace;">${wm.totalKills.toLocaleString('fr-FR')} (${wm.percentage}%)</span>
          </div>
          <div style="width: 100%; height: 14px; background: rgba(255, 255, 255, 0.1); border-radius: 7px; overflow: hidden; position: relative;">
            <div style="width: ${Math.max(1, Math.min(100, parseFloat(wm.percentage) * 10))}%; height: 100%; background: linear-gradient(90deg, #ff4757, #ff6b81, #ffa502); box-shadow: 0 0 10px rgba(255, 71, 87, 0.8);"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #a4b0be; margin-top: 6px;">
            <span>0 (Départ)</span>
            <span style="color: #00cec9;">${wm.remaining.toLocaleString('fr-FR')} RESTANTS</span>
            <span>8 Milliards</span>
          </div>
        </div>

        <!-- Les 4 Vecteurs d'Extermination -->
        <h3 style="font-size: 0.92rem; color: #fff; margin: 10px 0 8px 0; display: flex; align-items: center; gap: 6px;">
          <span>⚡</span> BILAN PAR VECTEUR DE DESTRUCTION
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          <div style="background: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 10px; padding: 8px;">
            <div style="font-size: 0.75rem; color: #ff6b81; font-weight: 800;">🩸 MASSACRES DE RUE</div>
            <div style="font-size: 1.05rem; font-weight: 900; color: #fff; font-family: monospace; margin-top: 2px;">
              ${wm.byVector.street.toLocaleString('fr-FR')}
            </div>
            <div style="font-size: 0.68rem; color: #ced6e0;">Piétons & Carambolages</div>
          </div>
          <div style="background: rgba(46, 213, 115, 0.1); border: 1px solid rgba(46, 213, 115, 0.3); border-radius: 10px; padding: 8px;">
            <div style="font-size: 0.75rem; color: #2ed573; font-weight: 800;">☢️ CENTRALES NUCLÉAIRES</div>
            <div style="font-size: 1.05rem; font-weight: 900; color: #fff; font-family: monospace; margin-top: 2px;">
              ${wm.byVector.nuclear.toLocaleString('fr-FR')}
            </div>
            <div style="font-size: 0.68rem; color: #ced6e0;">Surchauffes & Éruptions</div>
          </div>
          <div style="background: rgba(0, 206, 201, 0.1); border: 1px solid rgba(0, 206, 201, 0.3); border-radius: 10px; padding: 8px;">
            <div style="font-size: 0.75rem; color: #00cec9; font-weight: 800;">🌊 RUPTURES DE BARRAGES</div>
            <div style="font-size: 1.05rem; font-weight: 900; color: #fff; font-family: monospace; margin-top: 2px;">
              ${wm.byVector.dam.toLocaleString('fr-FR')}
            </div>
            <div style="font-size: 0.68rem; color: #ced6e0;">Submersion & Déluges</div>
          </div>
          <div style="background: rgba(254, 202, 87, 0.1); border: 1px solid rgba(254, 202, 87, 0.3); border-radius: 10px; padding: 8px;">
            <div style="font-size: 0.75rem; color: #feca57; font-weight: 800;">🏔️ ÉBOULEMENTS MONTAGNE</div>
            <div style="font-size: 1.05rem; font-weight: 900; color: #fff; font-family: monospace; margin-top: 2px;">
              ${wm.byVector.mountain.toLocaleString('fr-FR')}
            </div>
            <div style="font-size: 0.68rem; color: #ced6e0;">Avalanches & Roches</div>
          </div>
        </div>

        <!-- Conquête des Territoires -->
        <div style="background: rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 10px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 800;">
            <span style="color: #ffd32a;">🗺️ ÉTAPES DÉPEUPLÉES :</span>
            <span style="color: #2ed573;">${completedCities} / ${cityCount} VILLES</span>
          </div>
        </div>

        <button id="btn-close-worldmageddon" class="btn-arcade" style="width: 100%;">
          FERMER LE DOSSIER
        </button>
      </div>
    `;

    overlay.querySelector('#btn-close-worldmageddon').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
    });

    this.root.appendChild(overlay);

    const pauseCard = overlay.querySelector('.modal-card');
    if (pauseCard) {
      gsap.fromTo(pauseCard,
        { scale: 0.8, opacity: 0, y: 30 },
        { scale: 1.0, opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.8)" }
      );
    }
  }

  // --- 12. MODALE SIMPLIFIÉE DE SAUVEGARDE & TRANSFERT DE PROGRESSION ---
  showCloudSaveModal() {
    this.closeActiveModals();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay interactive';
    this.activeModals.push(overlay);

    const saveCode = storage.exportSaveString();
    const unlockedCount = storage.data.unlockedCities.length;
    const totalStars = storage.getTotalStars();
    const coins = storage.data.coins || 0;

    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 440px; max-height: 88vh; overflow-y: auto; text-align: left; padding: 18px;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #00cec9; padding-bottom: 10px; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.6rem;">💾</span>
            <div>
              <h2 style="margin: 0; font-size: 1.15rem; color: #fff; font-weight: 950;">SAUVEGARDE & TRANSFERT</h2>
              <div style="font-size: 0.72rem; color: #2ed573; font-weight: 800;">● SAUVEGARDE AUTO ACTIVE SUR CET APPAREIL</div>
            </div>
          </div>
          <button id="btn-close-cloud-top" class="btn-round-action" style="width: 32px; height: 32px;">✕</button>
        </div>

        <!-- Résumé de la sauvegarde actuelle -->
        <div style="background: rgba(46, 213, 115, 0.1); border: 1px solid rgba(46, 213, 115, 0.4); border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; font-size: 0.8rem; color: #ced6e0;">
          ✅ Votre progression est enregistrée automatiquement après chaque course :<br>
          <strong style="color: #fff;">${unlockedCount} villes • ${totalStars} ⭐ • 🪙 ${coins.toLocaleString('fr-FR')} pièces</strong>
        </div>

        <!-- 1. Exporter / Copier son code de sauvegarde -->
        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 10px; padding: 12px; margin-bottom: 12px;">
          <div style="font-size: 0.76rem; color: #ffd32a; font-weight: 900; margin-bottom: 6px;">
            📤 1. COPIER MON CODE DE SAUVEGARDE
          </div>
          <p style="font-size: 0.74rem; color: #a4b0be; margin: 0 0 8px 0;">
            Copiez ce code pour conserver une copie de secours ou transférer votre partie sur un autre téléphone :
          </p>
          <input id="input-export-code" type="text" readonly value="${saveCode}" style="width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.45); border: 1px solid #4a5568; color: #00cec9; border-radius: 8px; padding: 8px 10px; font-family: monospace; font-size: 0.75rem; margin-bottom: 8px;" />
          <button id="btn-export-save" class="btn-arcade" style="width: 100%; padding: 10px; font-size: 0.82rem; background: linear-gradient(135deg, #0984e3, #00cec9);">
            📋 COPIER LE CODE DANS LE PRESSE-PAPIER
          </button>
        </div>

        <!-- 2. Importer / Restaurer un code -->
        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 10px; padding: 12px; margin-bottom: 14px;">
          <div style="font-size: 0.76rem; color: #ff9f1a; font-weight: 900; margin-bottom: 6px;">
            📥 2. RESTAURER UN CODE DE SAUVEGARDE
          </div>
          <input id="input-import-code" type="text" placeholder="Collez votre code de sauvegarde ici..." style="width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.45); border: 1px solid #4a5568; color: #fff; border-radius: 8px; padding: 9px 10px; font-family: monospace; font-size: 0.78rem; margin-bottom: 8px;" />
          <div id="save-modal-feedback" style="font-size: 0.76rem; font-weight: 800; min-height: 18px; margin-bottom: 6px; color: #2ed573;"></div>
          <button id="btn-import-save" class="btn-arcade btn-accent" style="width: 100%; padding: 10px; font-size: 0.82rem;">
            📥 CHARGER CE CODE
          </button>
        </div>

        <button id="btn-close-cloud-save" class="btn-arcade btn-secondary" style="width: 100%; padding: 11px;">
          RETOUR AU PROFIL
        </button>
      </div>
    `;

    const feedbackEl = overlay.querySelector('#save-modal-feedback');
    const exportInput = overlay.querySelector('#input-export-code');

    overlay.querySelector('#btn-export-save')?.addEventListener('click', () => {
      soundManager.playClick();
      if (exportInput) {
        exportInput.focus();
        exportInput.select();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(saveCode).then(() => {
          if (feedbackEl) {
            feedbackEl.style.color = '#2ed573';
            feedbackEl.textContent = '✅ Code copié dans le presse-papier !';
          }
          this.showToastUnlock({ name: '📋 Code de sauvegarde copié !' });
        }).catch(() => {
          try { document.execCommand('copy'); } catch (e) {}
          if (feedbackEl) {
            feedbackEl.style.color = '#2ed573';
            feedbackEl.textContent = '✅ Code sélectionné (prêt à copier) !';
          }
        });
      } else {
        try { document.execCommand('copy'); } catch (e) {}
        if (feedbackEl) {
          feedbackEl.style.color = '#2ed573';
          feedbackEl.textContent = '✅ Code sélectionné !';
        }
      }
    });

    overlay.querySelector('#btn-import-save')?.addEventListener('click', () => {
      soundManager.playClick();
      const importInput = overlay.querySelector('#input-import-code');
      const code = (importInput?.value || '').trim();
      if (!code) {
        if (feedbackEl) {
          feedbackEl.style.color = '#ff4757';
          feedbackEl.textContent = '⚠️ Veuillez coller un code de sauvegarde valide.';
        }
        return;
      }
      const res = storage.importSaveString(code);
      if (res.success) {
        soundManager.playCoin();
        if (feedbackEl) {
          feedbackEl.style.color = '#2ed573';
          feedbackEl.textContent = '✅ Sauvegarde restaurée avec succès !';
        }
        this.showToastUnlock({ name: '✅ Sauvegarde restaurée !' });
        setTimeout(() => {
          overlay.remove();
          this.activeModals = this.activeModals.filter(m => m !== overlay);
          this.render();
        }, 700);
      } else {
        if (feedbackEl) {
          feedbackEl.style.color = '#ff4757';
          feedbackEl.textContent = '❌ ' + (res.reason || 'Code invalide.');
        }
      }
    });

    const closeSaveModal = () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.showProfileModal();
    };

    overlay.querySelector('#btn-close-cloud-save')?.addEventListener('click', closeSaveModal);
    overlay.querySelector('#btn-close-cloud-top')?.addEventListener('click', closeSaveModal);

    this.root.appendChild(overlay);

    const pauseCard = overlay.querySelector('.modal-card');
    if (pauseCard) {
      gsap.fromTo(pauseCard,
        { scale: 0.85, opacity: 0, y: 25 },
        { scale: 1.0, opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.8)" }
      );
    }
  }

  showCoinsCollectedNotification(coins, title = 'BUTIN ENCAISSÉ !', subtext = '') {
    soundManager.playCoin();
    Haptic.success();

    const banner = document.createElement('div');
    banner.className = 'golden-coin-collect-banner';
    banner.style.cssText = `
      position: absolute;
      top: 32px;
      left: 50%;
      background: linear-gradient(145deg, rgba(20, 16, 26, 0.94), rgba(12, 10, 16, 0.98));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #ffffff;
      padding: 10px 22px;
      border-radius: 20px;
      box-shadow: 0 10px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 215, 0, 0.35);
      border: 1.5px solid #ffd700;
      z-index: 10000;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 12px;
      white-space: nowrap;
    `;

    banner.innerHTML = `
      <div style="width: 38px; height: 38px; border-radius: 50%; background: radial-gradient(circle, #ffeaa7 0%, #fdcb6e 60%, #e17055 100%); display: flex; align-items: center; justify-content: center; font-size: 1.35rem; box-shadow: 0 0 12px rgba(255, 215, 0, 0.6); flex-shrink: 0;">🪙</div>
      <div style="display: flex; flex-direction: column;">
        <div style="font-size: 0.68rem; font-weight: 850; letter-spacing: 1.5px; color: #ffd700; text-transform: uppercase;">
          ${title}
        </div>
        <div style="font-size: 1.15rem; font-weight: 950; color: #ffffff; font-family: monospace; letter-spacing: 0.8px; text-shadow: 0 0 10px rgba(255, 215, 0, 0.4);">
          +${coins.toLocaleString('fr-FR')} <span style="font-size: 0.8rem; color: #ffeaa7;">CRÉDITS</span>
        </div>
        ${subtext ? `<div style="font-size: 0.66rem; font-weight: 700; color: #a4b0be; letter-spacing: 0.4px;">${subtext}</div>` : ''}
      </div>
    `;

    this.root.appendChild(banner);

    gsap.fromTo(banner,
      { y: -90, scale: 0.6, opacity: 0, xPercent: -50 },
      {
        y: 0,
        scale: 1.0,
        opacity: 1,
        xPercent: -50,
        duration: 0.45,
        ease: "back.out(2.4)",
        onComplete: () => {
          gsap.to(banner, {
            y: -60,
            scale: 0.85,
            opacity: 0,
            delay: 2.4,
            duration: 0.35,
            ease: "power2.in",
            onComplete: () => {
              try { banner.remove(); } catch (e) {}
            }
          });
        }
      }
    );
  }

  showToastUnlock(data) {
    const toast = document.createElement('div');
    const isExtermOrClosed = (data.name || '').includes('☠️') || (data.name || '').toLowerCase().includes('condamné') || (data.name || '').toLowerCase().includes('fermée');

    toast.style.cssText = `
      position: absolute;
      top: 32px;
      left: 50%;
      background: ${isExtermOrClosed ? 'linear-gradient(135deg, #eb4d4b, #2b1115)' : 'linear-gradient(135deg, #2ed573, #1e90ff)'};
      color: #fff;
      padding: 12px 22px;
      border-radius: 28px;
      font-weight: 900;
      font-size: 0.88rem;
      line-height: 1.35;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      text-align: center;
      max-width: 90vw;
      width: max-content;
      box-sizing: border-box;
      white-space: normal;
      word-break: break-word;
      box-shadow: ${isExtermOrClosed ? '0 10px 30px rgba(255, 71, 87, 0.7), 0 0 20px rgba(235, 77, 75, 0.5)' : '0 10px 30px rgba(46, 213, 115, 0.55), 0 0 20px rgba(30, 144, 255, 0.45)'};
      border: 2px solid ${isExtermOrClosed ? '#ff4757' : 'rgba(255, 255, 255, 0.65)'};
      z-index: 10000;
      pointer-events: none;
    `;
    toast.innerHTML = isExtermOrClosed ? `${data.name || 'Zone Condamnée'}` : `✨ ${data.name || 'Débloqué'} !`;
    this.root.appendChild(toast);

    gsap.fromTo(toast,
      { y: -75, scale: 0.7, opacity: 0, xPercent: -50 },
      {
        y: 0,
        scale: 1.0,
        opacity: 1,
        xPercent: -50,
        duration: 0.45,
        ease: "back.out(2.2)",
        onComplete: () => {
          gsap.to(toast, {
            y: -50,
            scale: 0.88,
            opacity: 0,
            delay: 2.2,
            duration: 0.35,
            ease: "power2.in",
            onComplete: () => {
              try { toast.remove(); } catch (e) {}
            }
          });
        }
      }
    );
  }

  renderDailyMissionsPanel() {
    const missions = dailyMissions.list();
    const allClaimed = dailyMissions.allClaimed();
    const rows = missions.map(m => {
      const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
      const done = m.progress >= m.target;
      const claimable = done && !m.claimed;
      return `
        <div class="daily-mission-row ${m.claimed ? 'claimed' : ''} ${claimable ? 'claimable' : ''}">
          <div class="daily-mission-label">${m.label}</div>
          <div class="daily-mission-bar"><div class="daily-mission-fill" style="width:${pct}%"></div></div>
          <div class="daily-mission-meta">
            <span class="daily-mission-progress">${Math.min(m.progress, m.target)}/${m.target}</span>
            ${claimable ? `<button class="daily-mission-claim" data-slot="${m.slot}">+${m.reward} 🪙</button>` : (m.claimed ? '<span class="daily-mission-done">✓</span>' : `<span class="daily-mission-reward">+${m.reward} 🪙</span>`)}
          </div>
        </div>
      `;
    }).join('');
    return `
      <div class="daily-missions-panel">
        <div class="daily-missions-header">
          <span class="daily-missions-title">🎯 MISSIONS DU JOUR</span>
          ${allClaimed ? '<span class="daily-missions-all">TOUT RÉCLAMÉ !</span>' : ''}
        </div>
        ${rows}
      </div>
    `;
  }
}

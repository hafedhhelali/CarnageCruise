/**
 * Motormageddon - Gestionnaire d'Interface Utilisateur (UIManager)
 * Carte réaliste de France avec effets de transition cinématique,
 * Section Profil joueur, Système de freinage HUD, Gestionnaire de bouton retour Android,
 * et correction de la navigation du Garage.
 */

import { gameState, CITIES, BIKES } from '../core/GameState.js';
import { storage } from '../core/Storage.js';
import { soundManager } from '../audio/SoundManager.js';
import { App } from '@capacitor/app';
import { FULL_VERSION, APP_VERSION, COPYRIGHT_NOTICE, RELEASE_NAME, IS_BETA } from '../core/Version.js';
import { REAL_COUNTRY_PATHS, REAL_TOUR_ROUTE_PATH } from './EuropeMapData.js';
import { adManager } from '../services/AdManager.js';

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
      if (topModal && topModal.parentNode) {
        topModal.remove();
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
      // En jeu : afficher le menu de pause
      this.showPauseModal();
      return;
    }

    // Si on est sur l'écran d'accueil principal : demander confirmation pour quitter
    if (this.currentScreen === 'SPLASH') {
      this.showQuitConfirmationModal();
    }
  }

  setScreen(screenName) {
    if (this.currentScreen !== screenName) {
      this.previousScreen = this.currentScreen;
    }
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
      <div class="splash-badge-version">${IS_BETA ? '<span class="badge-beta-pill">BETA</span>' : ''}${FULL_VERSION}</div>

      <div class="logo-container">
        <h1 class="game-title">MOTORMAGEDDON</h1>
        <div class="game-subtitle">★ ARCADE 3D RACER ★</div>
      </div>

      <div class="splash-footer">
        <button id="btn-splash-play" class="btn-arcade btn-play-pulse">
          <span>🚀 JOUER</span>
        </button>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
          <button id="btn-splash-profile" class="btn-arcade btn-accent" style="font-size: 0.95rem; padding: 10px 18px;">
            <span>👤 PROFIL</span>
          </button>
          <button id="btn-splash-garage" class="btn-arcade btn-secondary" style="font-size: 0.95rem; padding: 10px 18px;">
            <span>🏍️ GARAGE</span>
          </button>
          <button id="btn-splash-settings" class="btn-arcade btn-ghost" style="font-size: 0.95rem; padding: 10px 16px;">
            <span>⚙️ OPTIONS</span>
          </button>
        </div>

        <div class="splash-legal">
          <span>${COPYRIGHT_NOTICE}</span>
          <button id="btn-splash-legal" class="btn-legal-link">Mentions Légales & Version</button>
        </div>
      </div>
    `;

    splash.querySelector('#btn-splash-play').addEventListener('click', () => {
      soundManager.playClick();
      soundManager.resumeContext();
      this.setScreen('MAP');
    });

    splash.querySelector('#btn-splash-profile').addEventListener('click', () => {
      soundManager.playClick();
      this.showProfileModal();
    });

    splash.querySelector('#btn-splash-garage').addEventListener('click', () => {
      soundManager.playClick();
      this.previousScreen = 'SPLASH';
      this.setScreen('GARAGE');
    });

    splash.querySelector('#btn-splash-settings').addEventListener('click', () => {
      soundManager.playClick();
      this.showSettingsModal();
    });

    splash.querySelector('#btn-splash-legal').addEventListener('click', () => {
      soundManager.playClick();
      this.showLegalModal();
    });

    this.root.appendChild(splash);
  }

  // --- 2. CARTE RÉALISTE DE FRANCE & EFFETS DE TRANSITION ---
  renderMapScreen() {
    const mapScreen = document.createElement('div');
    mapScreen.className = 'screen-map interactive';

    const coins = storage.data.coins;
    const totalStars = storage.getTotalStars();

    mapScreen.innerHTML = `
      <div class="map-header">
        <button id="btn-map-back" class="btn-round-action" title="Retour Accueil">
          <span>🏠</span>
        </button>
        <div class="map-header-center">
          <h2 class="map-title" style="margin: 0; font-size: 1.35rem; color: #fffa65; letter-spacing: 1px;">ÉTAPES D'EUROPE</h2>
          <span class="map-stars-badge">★ ${totalStars} / ${CITIES.length * 3} ÉTOILES</span>
        </div>
        <div class="map-header-right">
          <button id="btn-map-garage" class="btn-round-action btn-garage-glow" title="Accéder au Garage">
            <span>🏍️</span>
          </button>
          <div class="currency-pill clickable" id="btn-header-ad-coins" title="Cadeau Sponsor : +20 Pièces d'or">
            <span>🪙 ${coins}</span>
            <span class="currency-ad-gift-tag">🎁 +20</span>
          </div>
        </div>
      </div>

      <!-- CARTE D'EUROPE ET BASSIN MÉDITERRANÉEN HAUTE-FIDÉLITÉ AVEC ZOOM INTERACTIF -->
      <div class="europe-map-scroll-viewport" id="europe-viewport">
        <!-- Contrôles de zoom intégrés à l'intérieur du cadre de carte (aucun masquage du titre) -->
        <div class="map-zoom-controls">
          <button id="btn-zoom-in" class="btn-zoom" title="Agrandir la carte (Zoom +)">➕</button>
          <span class="zoom-level-badge" id="zoom-badge">${Math.round(this.mapZoom * 100)}%</span>
          <button id="btn-zoom-out" class="btn-zoom" title="Réduire la carte (Zoom -)">➖</button>
          <button id="btn-zoom-reset" class="btn-zoom" title="Recentrer">🎯</button>
        </div>

        <div class="europe-map-canvas-container" id="europe-canvas">
          <svg class="europe-svg" viewBox="0 -320 1060 1480" preserveAspectRatio="none">
            <defs>
              <!-- Dégradé de relief européen : Verts luxuriants, ocres et sommets -->
              <linearGradient id="franceLuxury" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#1b4d3e" />
                <stop offset="35%" stop-color="#163e32" />
                <stop offset="70%" stop-color="#102e24" />
                <stop offset="100%" stop-color="#0a1d17" />
              </linearGradient>

              <!-- Dégradé des pays frontaliers -->
              <linearGradient id="neighborCountryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#182330" />
                <stop offset="100%" stop-color="#0e1722" />
              </linearGradient>

              <!-- Dégradé des océans et mers européennes -->
              <radialGradient id="oceanShading" cx="50%" cy="50%" r="75%">
                <stop offset="0%" stop-color="#0e2439" />
                <stop offset="55%" stop-color="#091827" />
                <stop offset="100%" stop-color="#03080e" />
              </radialGradient>

              <!-- Dégradé Méditerranée Bleu Saphir Lumineux -->
              <linearGradient id="mediterraneanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#006266" />
                <stop offset="50%" stop-color="#1289a7" />
                <stop offset="100%" stop-color="#0652dd" />
              </linearGradient>

              <!-- Filtre néon doré éclatant pour le tracé du Tour -->
              <filter id="glowTourRoute" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <!-- Halo côtier turquoise -->
              <filter id="coastalGlow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#00cec9" flood-opacity="0.35" />
              </filter>
            </defs>

            <!-- Fond Océanique / Mers Européennes & Méditerranée -->
            <rect width="100%" height="100%" fill="url(#oceanShading)" />

            <!-- Rides marines de l'Atlantique, Manche et Méditerranée -->
            <path d="M 60 480 Q 95 470 130 480 T 200 480" fill="none" stroke="#00cec9" stroke-width="1.4" opacity="0.25" />
            <path d="M 120 220 Q 155 210 190 220 T 260 220" fill="none" stroke="#00cec9" stroke-width="1.4" opacity="0.25" />
            <path d="M 520 740 Q 555 730 590 740 T 660 740" fill="none" stroke="#00cec9" stroke-width="1.4" opacity="0.25" />
            <path d="M 480 840 Q 520 830 570 840 T 660 840" fill="none" stroke="#00d2d3" stroke-width="1.6" opacity="0.3" />
            <path d="M 380 890 Q 430 880 480 890 T 580 890" fill="none" stroke="#00d2d3" stroke-width="1.6" opacity="0.3" />

            <!-- Rose des sables / Boussole nautique d'époque dans l'Atlantique -->
            <g transform="translate(110, 410) scale(0.9)" opacity="0.6">
              <circle cx="0" cy="0" r="34" fill="none" stroke="#ffd700" stroke-width="1.4" stroke-dasharray="4,4" />
              <polygon points="0,-42 8,-10 0,0 -8,-10" fill="#ffd700" />
              <polygon points="0,42 8,10 0,0 -8,10" fill="#e17055" />
              <polygon points="42,0 10,8 0,0 10,-8" fill="#a4b0be" />
              <polygon points="-42,0 -10,8 0,0 -10,-8" fill="#a4b0be" />
              <text x="-5" y="-48" fill="#ffd700" font-size="12" font-weight="900">N</text>
            </g>

            <!-- ================= GÉOGRAPHIE RÉALISTE DE L'EUROPE & BASSIN MÉDITERRANÉEN (100% SIG RÉELLE) ================= -->

            <!-- 1. ROYAUME-UNI 🇬🇧 & IRLANDE 🇮🇪 -->
            <path class="country-ireland" filter="url(#coastalGlow)" d="${REAL_COUNTRY_PATHS.IRL.d}" fill="url(#neighborCountryGrad)" stroke="#2ed573" stroke-width="1.8" opacity="0.8" />
            <path class="country-uk" filter="url(#coastalGlow)" d="${REAL_COUNTRY_PATHS.GBR.d}" fill="url(#neighborCountryGrad)" stroke="#38ada9" stroke-width="2.2" />
            <text x="90" y="10" fill="#2ed573" font-size="12" font-weight="900" letter-spacing="1">IRLANDE 🇮🇪</text>
            <text x="290" y="20" fill="#74b9ff" font-size="13" font-weight="900" letter-spacing="1.2">ROYAUME-UNI 🇬🇧</text>

            <!-- 2. BENELUX (BELGIQUE 🇧🇪 & PAYS-BAS 🇳🇱) -->
            <path class="country-netherlands" filter="url(#coastalGlow)" d="${REAL_COUNTRY_PATHS.NLD.d}" fill="url(#neighborCountryGrad)" stroke="#38ada9" stroke-width="1.8" />
            <path class="country-benelux" filter="url(#coastalGlow)" d="${REAL_COUNTRY_PATHS.BEL.d}" fill="url(#neighborCountryGrad)" stroke="#38ada9" stroke-width="2.2" />
            <text x="510" y="160" fill="#74b9ff" font-size="12" font-weight="900" letter-spacing="1">BELGIQUE 🇧🇪</text>

            <!-- 3. ALLEMAGNE 🇩🇪 -->
            <path class="country-germany" filter="url(#coastalGlow)" d="${REAL_COUNTRY_PATHS.DEU.d}" fill="url(#neighborCountryGrad)" stroke="#2c3e50" stroke-width="2.0" />
            <text x="720" y="180" fill="#74b9ff" font-size="13" font-weight="900" letter-spacing="1.2">ALLEMAGNE 🇩🇪</text>

            <!-- 4. SUISSE 🇨🇭 -->
            <path class="country-switzerland" filter="url(#coastalGlow)" d="${REAL_COUNTRY_PATHS.CHE.d}" fill="url(#neighborCountryGrad)" stroke="#38ada9" stroke-width="2.0" />
            <text x="610" y="400" fill="#74b9ff" font-size="12" font-weight="900" letter-spacing="1">SUISSE 🇨🇭</text>

            <!-- 5. FRANCE MÉTROPOLITAINE & CORSE (100% GÉOGRAPHIE SIG RÉELLE) 🇫🇷 -->
            <path class="france-mainland" filter="url(#coastalGlow)" d="${REAL_COUNTRY_PATHS.FRA.d}" fill="url(#franceLuxury)" stroke="#00cec9" stroke-width="2.8" />
            <text x="430" y="380" fill="#00cec9" font-size="18" font-weight="900" letter-spacing="3" opacity="0.5">FRANCE 🇫🇷</text>
            <text x="690" y="620" fill="#00cec9" font-size="10" font-weight="900">CORSE 🇫🇷</text>

            <!-- 6. PÉNINSULE IBÉRIQUE : PORTUGAL 🇵🇹 ET ESPAGNE 🇪🇸 -->
            <path class="country-portugal" filter="url(#coastalGlow)" d="${REAL_COUNTRY_PATHS.PRT.d}" fill="url(#neighborCountryGrad)" stroke="#2ed573" stroke-width="2.2" />
            <text x="80" y="760" fill="#2ed573" font-size="12" font-weight="900" letter-spacing="1.5">PORTUGAL 🇵🇹</text>

            <path class="country-spain" filter="url(#coastalGlow)" d="${REAL_COUNTRY_PATHS.ESP.d}" fill="url(#neighborCountryGrad)" stroke="#e74c3c" stroke-width="2.4" />
            <text x="260" y="760" fill="#74b9ff" font-size="15" font-weight="900" letter-spacing="2">ESPAGNE 🇪🇸</text>
            <text x="280" y="725" fill="#ffd700" font-size="11" font-weight="900">MADRID 👑</text>
            <text x="490" y="660" fill="#ff7675" font-size="11" font-weight="900">BARCELONE</text>

            <!-- 7. ITALIE 🇮🇹 (DU NORD AU SUD, ROME, NAPLES ET SICILE) -->
            <path class="country-italy" filter="url(#coastalGlow)" d="${REAL_COUNTRY_PATHS.ITA.d}" fill="url(#neighborCountryGrad)" stroke="#38ada9" stroke-width="2.4" />
            <text x="770" y="520" fill="#74b9ff" font-size="14" font-weight="900" letter-spacing="1.5">ITALIE 🇮🇹</text>
            <text x="770" y="625" fill="#ffd700" font-size="11" font-weight="900">ROME 🏛️</text>
            <text x="830" y="705" fill="#ff7675" font-size="11" font-weight="900">NAPOLI 🌋</text>

            <!-- 8. AFRIQUE DU NORD : MAROC 🇲🇦, ALGÉRIE 🇩🇿 ET TUNISIE 🇹🇳 (CÔTE SUD MÉDITERRANÉENNE) -->
            <path class="country-morocco" filter="url(#coastalGlow)" d="${REAL_COUNTRY_PATHS.MAR.d}" fill="url(#neighborCountryGrad)" stroke="#e67e22" stroke-width="2.0" opacity="0.8" />
            <path class="country-algeria" filter="url(#coastalGlow)" d="${REAL_COUNTRY_PATHS.DZA.d}" fill="url(#neighborCountryGrad)" stroke="#2ed573" stroke-width="2.5" />
            <text x="410" y="990" fill="#2ed573" font-size="15" font-weight="900" letter-spacing="2">ALGÉRIE 🇩🇿 (ALGER & ANNABA)</text>

            <path class="country-tunisia" filter="url(#coastalGlow)" d="${REAL_COUNTRY_PATHS.TUN.d}" fill="url(#neighborCountryGrad)" stroke="#ff4757" stroke-width="2.4" />
            <text x="710" y="980" fill="#ff4757" font-size="14" font-weight="900" letter-spacing="2">TUNISIE 🇹🇳 (TUNIS)</text>

            <!-- Mer Méditerranée -->
            <text x="470" y="790" fill="#00cec9" font-size="14" font-weight="900" letter-spacing="4" opacity="0.45">MER MÉDITERRANÉE</text>

            <!-- Tracé Lumineux Officiel du Grand Tour (Néon Or Éclatant reliant les 22 étapes) -->
            <path class="tour-route-glow" d="${REAL_TOUR_ROUTE_PATH}" fill="none" stroke="#ffd700" stroke-width="4.2" stroke-dasharray="10,6" opacity="0.9" filter="url(#glowTourRoute)" />
          </svg>

          <!-- SVG Overlay pour ligne active animée lors des déplacements -->
          <svg class="travel-line-overlay" viewBox="0 -320 1060 1480" preserveAspectRatio="none">
            <line id="travel-active-line" x1="0" y1="0" x2="0" y2="0" stroke="#ffd700" stroke-width="5" stroke-dasharray="10,7" opacity="0" filter="url(#glowTourRoute)" />
          </svg>

          <!-- Jeton Motard Voyageur Animé se déplaçant d'une ville à une autre -->
          <div class="moto-traveler" id="moto-traveler" style="left: 44.8%; top: 40.2%;">
            <div class="moto-traveler-icon">🏍️</div>
            <div class="moto-traveler-exhaust">💨</div>
          </div>

          <!-- Pins interactifs des 20 villes d'Europe et Méditerranée avec médaillons 3D et drapeaux -->
          ${CITIES.map((city, idx) => {
            const unlocked = storage.isCityUnlocked(city.id);
            const isSelected = this.selectedMapCity.id === city.id;

            return `
              <div class="city-pin ${unlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}"
                   data-city-id="${city.id}"
                   style="left: ${city.mapCoords.x}%; top: ${city.mapCoords.y}%;">
                <div class="city-pulse-ring"></div>
                <div class="city-pin-dot">
                  <span class="pin-badge-idx">${idx + 1}</span>
                  <span class="pin-emblem-icon">${unlocked ? (city.countryFlag || city.emblem || '★') : '🔒'}</span>
                </div>
                <div class="city-pin-label">
                  ${city.name}
                </div>
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
    this.mapZoom = Math.max(0.65, Math.min(2.8, this.mapZoom || 1.0));

    const clampPan = (targetX, targetY, zoom) => {
      if (!viewportEl) return { x: targetX, y: targetY };
      const vw = viewportEl.clientWidth || 360;
      const vh = viewportEl.clientHeight || 400;
      const effectiveW = 1060 * zoom;
      const effectiveH = 1480 * zoom;

      let minX, maxX;
      if (effectiveW <= vw) {
        minX = maxX = (vw - effectiveW) / 2;
      } else {
        minX = vw - effectiveW - 30;
        maxX = 30;
      }

      let minY, maxY;
      if (effectiveH <= vh) {
        minY = maxY = (vh - effectiveH) / 2;
      } else {
        minY = vh - effectiveH - 30;
        maxY = 30;
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
      const cityPxX = (city.mapCoords.x / 100) * 1060;
      const cityPxY = (city.mapCoords.y / 100) * 1480;
      const targetPanX = vw / 2 - cityPxX * this.mapZoom;
      const targetPanY = vh / 2 - cityPxY * this.mapZoom;
      const clamped = clampPan(targetPanX, targetPanY, this.mapZoom);
      panX = clamped.x;
      panY = clamped.y;
      applyTransform(animate, animate ? 420 : 0);
    };

    const zoomAtPoint = (newZoom, focalX, focalY, animate = false) => {
      const oldZoom = this.mapZoom;
      const clampedZoom = Math.max(0.65, Math.min(2.8, newZoom));
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

    mapScreen.querySelector('#btn-zoom-in')?.addEventListener('click', () => {
      soundManager.playClick();
      const rect = viewportEl.getBoundingClientRect();
      zoomAtPoint(this.mapZoom + 0.3, rect.width / 2, rect.height / 2, true);
    });
    mapScreen.querySelector('#btn-zoom-out')?.addEventListener('click', () => {
      soundManager.playClick();
      const rect = viewportEl.getBoundingClientRect();
      zoomAtPoint(this.mapZoom - 0.3, rect.width / 2, rect.height / 2, true);
    });
    mapScreen.querySelector('#btn-zoom-reset')?.addEventListener('click', () => {
      soundManager.playClick();
      this.mapZoom = 1.0;
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
          isDragging = true;
          lastTouchX = e.touches[0].clientX;
          lastTouchY = e.touches[0].clientY;
        }
      }, { passive: false });

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
        } else if (isDragging && e.touches.length === 1) {
          e.preventDefault();
          const dx = e.touches[0].clientX - lastTouchX;
          const dy = e.touches[0].clientY - lastTouchY;
          lastTouchX = e.touches[0].clientX;
          lastTouchY = e.touches[0].clientY;

          const clamped = clampPan(panX + dx, panY + dy, this.mapZoom);
          panX = clamped.x;
          panY = clamped.y;
          applyTransform(false);
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

      // Déclenchement de l'effet de déplacement animé si la ville est différente
      if (previousCity && previousCity.id !== city.id) {
        soundManager.playTravelWhoosh();

        const traveler = mapScreen.querySelector('#moto-traveler');
        const travelLine = mapScreen.querySelector('#travel-active-line');

        if (traveler) {
          const fromCoords = previousCity.mapCoords;
          const toCoords = city.mapCoords;

          const angle = Math.atan2(toCoords.y - fromCoords.y, toCoords.x - fromCoords.x) * (180 / Math.PI);
          traveler.classList.add('traveling');
          traveler.style.transform = `translate(-50%, -50%) rotate(${angle > 90 || angle < -90 ? '180deg scaleY(-1)' : `${angle}deg`})`;
          traveler.style.left = `${toCoords.x}%`;
          traveler.style.top = `${toCoords.y}%`;

          if (travelLine) {
            travelLine.setAttribute('x1', (fromCoords.x / 100) * 1060);
            travelLine.setAttribute('y1', (fromCoords.y / 100) * 1480 - 320);
            travelLine.setAttribute('x2', (toCoords.x / 100) * 1060);
            travelLine.setAttribute('y2', (toCoords.y / 100) * 1480 - 320);
            travelLine.setAttribute('opacity', '1');
            setTimeout(() => travelLine.setAttribute('opacity', '0'), 700);
          }

          setTimeout(() => {
            traveler.classList.remove('traveling');
            traveler.style.transform = 'translate(-50%, -50%) scale(1.2)';
            setTimeout(() => traveler.style.transform = 'translate(-50%, -50%) scale(1)', 150);
          }, 600);
        }
      }

      this.selectedMapCity = city;
      pins.forEach(p => p.classList.toggle('selected', p.getAttribute('data-city-id') === cityId));

      // Centrer automatiquement et fluidement sur la ville sélectionnée
      centerOnCity(city, true);

      const targetPin = mapScreen.querySelector(`.city-pin[data-city-id="${cityId}"]`);
      if (targetPin) {
        setTimeout(() => this.triggerCityPinRipple(targetPin), 300);
      }

      this.updateCityDetail(mapScreen.querySelector('#city-detail'));
    };

    pins.forEach(pin => {
      pin.addEventListener('click', () => {
        updateSelection(pin.getAttribute('data-city-id'));
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

    const headerAdBtn = mapScreen.querySelector('#btn-header-ad-coins');
    if (headerAdBtn) {
      headerAdBtn.addEventListener('click', () => {
        adManager.showRewardedAd('COINS', () => {
          this.render();
        });
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
    const city = this.selectedMapCity;
    const stageIndex = CITIES.findIndex(c => c.id === city.id) + 1;
    const unlocked = storage.isCityUnlocked(city.id);
    const cityData = storage.getCityData(city.id);

    const starsHtml = '★'.repeat(cityData.stars) + '☆'.repeat(3 - cityData.stars);

    detailCard.innerHTML = `
      <div class="city-detail-header">
        <div>
          <span class="city-detail-name">${city.countryFlag || ''} ${city.name}</span>
          <span class="city-tag">ÉTAPE ${stageIndex} / ${CITIES.length} • ${city.country || 'Europe'}</span>
          <div style="font-size: 0.82rem; color: #fffa65; font-weight: 800; margin-top: 3px;">
            🏛️ Monument : <strong>${city.monument || 'Monument Historique'}</strong>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">${city.subtitle}</div>
        </div>
        <div class="city-stars">${starsHtml}</div>
      </div>

      <p class="city-description">${city.description}</p>

      <div class="city-target-info">
        <span>🏆 Record : <strong>${cityData.bestScore} pts</strong></span>
        <span>💀 Cible Carnage : <strong>${city.killQuota || 30} Victimes</strong></span>
      </div>

      <div class="city-detail-actions">
        ${unlocked ? `
          <button id="btn-launch-city" class="btn-arcade btn-play-pulse btn-action-launch">
            <span>🚀 EXTERMINER • ÉTAPE ${stageIndex} : ${city.name.toUpperCase()}</span>
          </button>
          <button id="btn-city-ad-coins" class="btn-ad-gift" title="Cadeau Sponsor : Obtenir +20 Pièces d'or">
            <span class="ad-gift-top">🎁 🪙</span>
            <span class="ad-gift-val">+20</span>
          </button>
        ` : `
          <button class="btn-arcade btn-action-locked" disabled>
            <span>🔒 BLOQUÉ (${city.unlockScoreRequired.toLocaleString('fr-FR')} PTS REQUIS)</span>
          </button>
          <button id="btn-city-ad-coins" class="btn-ad-gift" title="Cadeau Sponsor : Obtenir +20 Pièces d'or">
            <span class="ad-gift-top">🎁 🪙</span>
            <span class="ad-gift-val">+20</span>
          </button>
        `}
      </div>
    `;

    const cityAdBtn = detailCard.querySelector('#btn-city-ad-coins');
    if (cityAdBtn) {
      cityAdBtn.addEventListener('click', () => {
        adManager.showRewardedAd('COINS', () => {
          this.render();
        });
      });
    }

    if (unlocked) {
      const launchBtn = detailCard.querySelector('#btn-launch-city');
      if (launchBtn) {
        launchBtn.addEventListener('click', () => {
          soundManager.playClick();
          gameState.selectCity(city.id);
          // Publicité interstitielle lors du passage vers une ville
          adManager.showCityTransitionAd(city, () => {
            this.triggerCityEntryCinematic(city);
          });
        });
      }
    }
  }

  triggerCityEntryCinematic(city) {
    // Effet cinématique de zoom et distorsion lors de l'entrée dans la ville avec monument
    const overlay = document.createElement('div');
    overlay.className = 'city-entry-transition';
    overlay.innerHTML = `
      <div class="city-entry-content">
        <div class="entry-sub">BIENVENUE EN ${city.country ? city.country.toUpperCase() : 'EUROPE'} • GRAND TOUR</div>
        <div class="entry-title">${city.countryFlag || ''} ${city.name.toUpperCase()}</div>
        <div class="entry-tagline" style="color: #ffd700; font-weight: 800; margin-top: 4px;">🏛️ ${city.monument || city.subtitle}</div>
        <div style="font-size: 0.88rem; color: #ced6e0; margin-top: 4px;">${city.subtitle}</div>
      </div>
    `;
    this.root.appendChild(overlay);

    soundManager.playVictory();

    setTimeout(() => {
      overlay.classList.add('fade-out');
      if (this.onAction) this.onAction('START_RUN', city);
      setTimeout(() => overlay.remove(), 400);
    }, 1100);
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
          <button id="btn-garage-ad-coins" class="currency-ad-tag" title="Regarder un spot pour +20 Pièces">
            <span>📺 +20 🪙</span>
          </button>
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

    // Bouton de publicité dans le header du garage pour +20 pièces
    const garageAdBtn = garage.querySelector('#btn-garage-ad-coins');
    if (garageAdBtn) {
      garageAdBtn.addEventListener('click', () => {
        adManager.showRewardedAd('COINS', () => {
          this.render();
        });
      });
    }

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
          <button id="btn-garage-ad-quick" class="btn-arcade btn-ad-coins" style="width: 100%; margin-top: 8px; padding: 10px; font-size: 0.92rem;">
            📺 PIÈCES INSUFFISANTES ? REGARDER PUB (+20 🪙)
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

      const quickAdBtn = container.querySelector('#btn-garage-ad-quick');
      if (quickAdBtn) {
        quickAdBtn.addEventListener('click', () => {
          adManager.showRewardedAd('COINS', () => {
            this.render();
          });
        });
      }
    }
  }

  // --- 4. HUD DE GAMEPLAY AVEC FREIN, SCORE DYNAMIQUE ET COMPTE À REBOURS ---
  renderHUDScreen() {
    const hud = document.createElement('div');
    hud.className = 'screen-hud';

    const equippedBikeId = storage.getEquippedBike();
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
    }

    hud.innerHTML = `
      <div class="hud-top-bar">
        <!-- Badge Score Lumineux Arcade -->
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

        <!-- Grande Carte d'Objectif et de Progression de l'Étape -->
        <div class="progress-objective-card">
          <div class="objective-header-row">
            <span class="city-target-title" id="hud-city-name">${gameState.selectedCity.emblem || '📍'} ${gameState.selectedCity.name.toUpperCase()}</span>
            <span class="objective-target-pts" id="hud-target-pts">🎯 ${gameState.selectedCity.targetScore.toLocaleString('fr-FR')} PTS</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" id="hud-progress-fill"></div>
            <span class="progress-pct-text" id="hud-progress-pct">0%</span>
          </div>
          <span class="objective-status-sub" id="hud-target-remaining">
            Roulez et percutez pour débloquer la suite !
          </span>
        </div>

        <!-- Bouton Pause Chrome -->
        <button class="btn-icon-pause" id="btn-hud-pause" title="Mettre en pause">
          ⏸️
        </button>
      </div>

      <div class="hud-bottom-controls">
        <!-- Pédale de Frein ergonomique à gauche (pouce gauche) -->
        <button class="btn-pedal-brake" id="btn-hud-brake" title="Maintenir la pédale pour freiner / stopper">
          <div class="pedal-grip-ridges"></div>
          <span class="pedal-icon">🛑</span>
          <span class="pedal-label">FREIN</span>
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
          <div class="hud-carnage-badge" id="hud-carnage-badge" title="Victimes exterminées / Objectif de carnage">
            <span class="carnage-icon">💀</span>
            <span class="carnage-count" id="hud-kills-val">${gameState.killsCount || 0}</span>
            <span class="carnage-sep">/</span>
            <span class="carnage-quota" id="hud-quota-val">${gameState.selectedCity.killQuota || 30}</span>
          </div>
        </div>

        <!-- Groupe de commandes droit ergonomique (Nitro + Pub + Arme/Klaxon) -->
        <div class="hud-right-cluster">
          <div class="hud-nitro-group">
            <button class="btn-nitro-pedal" id="btn-hud-nitro" title="Activer le Nitro Boost 5s (Touche Espace / Shift)">
              <div class="nitro-fill-track">
                <div class="nitro-fill-bar" id="hud-nitro-fill" style="width: 0%;"></div>
              </div>
              <span class="nitro-icon">⚡</span>
              <span class="nitro-label" id="hud-nitro-label">NITRO</span>
              <span class="nitro-sub" id="hud-nitro-sub">0%</span>
            </button>
            <button class="btn-nitro-ad-refill" id="btn-hud-nitro-ad" title="Recharger immédiatement le Nitro avec un spot publicitaire">
              <span>📺 RECHARGE</span>
            </button>
          </div>

          <!-- Bouton d'Attaque / Frappe / Tir / Klaxon (pouce droit) -->
          <button class="btn-horn-pedal ${isWeapon ? 'btn-attack-pedal' : ''}" id="btn-hud-horn" title="${actionTitle}">
            <span class="horn-icon">${actionIcon}</span>
            <span class="horn-label">${actionLabel}</span>
          </button>
        </div>
      </div>

      <div class="touch-hint">
        ← Glissez pour braquer | FREIN pour stopper | ${isWeapon ? `${actionIcon} ${actionLabel} pour FRAPPER !` : '📢 KLAXON'} | ⚡ NITRO →
      </div>
    `;

    // Gestion du bouton de frein
    const brakeBtn = hud.querySelector('#btn-hud-brake');
    const startBraking = () => {
      gameState.setBraking(true);
      brakeBtn.classList.add('active');
    };
    const stopBraking = () => {
      gameState.setBraking(false);
      brakeBtn.classList.remove('active');
    };

    brakeBtn.addEventListener('pointerdown', startBraking);
    brakeBtn.addEventListener('pointerup', stopBraking);
    brakeBtn.addEventListener('pointerleave', stopBraking);
    brakeBtn.addEventListener('pointercancel', stopBraking);

    // Gestion du bouton Nitro 5 secondes
    const nitroBtn = hud.querySelector('#btn-hud-nitro');
    if (nitroBtn) {
      nitroBtn.addEventListener('click', () => {
        const ok = gameState.activateNitro();
        if (ok) {
          if (this.onAction) this.onAction('NITRO');
        }
      });
    }

    // Gestion de la recharge instantanée Nitro par publicité
    const nitroAdBtn = hud.querySelector('#btn-hud-nitro-ad');
    if (nitroAdBtn) {
      nitroAdBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        adManager.showRewardedAd('NITRO', () => {
          gameState.refillNitro();
          soundManager.playPowerUp();
          this.showToastUnlock({ name: '⚡ NITRO RECHARGÉ À 100% !' });
        });
      });
    }

    hud.querySelector('#btn-hud-pause').addEventListener('click', () => {
      soundManager.playClick();
      if (this.onAction) this.onAction('PAUSE');
      this.showPauseModal();
    });

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
      scoreVal.textContent = data.score.toLocaleString('fr-FR');
      scoreVal.style.transform = 'scale(1.18)';
      setTimeout(() => { if (scoreVal) scoreVal.style.transform = 'scale(1)'; }, 110);
    }

    if (comboBadge && comboText) {
      if (data.combo > 1) {
        comboBadge.classList.add('active');
        comboText.textContent = `${data.comboTitle} x${data.combo}`;
      } else {
        comboBadge.classList.remove('active');
      }
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
    }
    // Score dynamique au volant
    if (scoreVal) {
      scoreVal.textContent = data.score.toLocaleString('fr-FR');
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
    // Mise à jour de la jauge et du bouton Nitro 5 secondes
    const nitroFill = this.root.querySelector('#hud-nitro-fill');
    const nitroSub = this.root.querySelector('#hud-nitro-sub');
    const nitroBtn = this.root.querySelector('#btn-hud-nitro');
    const nitroLabel = this.root.querySelector('#hud-nitro-label');

    if (nitroFill && data.nitroGauge !== undefined) {
      nitroFill.style.width = `${data.nitroGauge}%`;
      if (data.isNitroActive) {
        if (nitroBtn) {
          nitroBtn.classList.add('active');
          nitroBtn.classList.remove('ready');
        }
        if (nitroSub) nitroSub.textContent = `${data.nitroTimer.toFixed(1)}s`;
        if (nitroLabel) nitroLabel.textContent = 'BOOST !';
      } else {
        if (nitroBtn) nitroBtn.classList.remove('active');
        if (data.nitroGauge >= 100) {
          if (nitroBtn) nitroBtn.classList.add('ready');
          if (nitroSub) nitroSub.textContent = 'PRÊT !';
          if (nitroLabel) nitroLabel.textContent = 'NITRO (5s)';
        } else {
          if (nitroBtn) nitroBtn.classList.remove('ready');
          if (nitroSub) nitroSub.textContent = `${data.nitroGauge}%`;
          if (nitroLabel) nitroLabel.textContent = 'NITRO';
        }
      }
    }
  }

  showTrafficLightWarning(streetName) {
    let toast = this.root.querySelector('.hud-traffic-warning-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'hud-traffic-warning-toast';
      this.root.appendChild(toast);
    }
    toast.innerHTML = `
      <div class="traffic-toast-inner">
        <span class="traffic-toast-icon">🚦</span>
        <div class="traffic-toast-text">
          <div class="traffic-toast-title">FEU ROUGE EN APPROCHE !</div>
          <div class="traffic-toast-sub">${streetName} • Arrête-toi au stop pour +250 pts !</div>
        </div>
      </div>
    `;
    toast.classList.add('visible');
    clearTimeout(this.trafficToastTimer);
    this.trafficToastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 3000);
  }
  showProfileModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    this.activeModals.push(overlay);

    const stats = storage.data.stats;
    const title = storage.getPlayerTitle();
    const unlockedCount = storage.data.unlockedCities.length;
    const totalStars = storage.getTotalStars();

    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 440px;">
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 4px;">
          <div style="width: 58px; height: 58px; border-radius: 50%; background: linear-gradient(135deg, #ff4757, #ffa502); display: flex; align-items: center; justify-content: center; font-size: 2rem;">
            🏍️
          </div>
          <div>
            <h2 style="font-size: 1.4rem; font-weight: 900; color: #fff;">${storage.data.playerName}</h2>
            <div style="background: rgba(255, 71, 87, 0.2); border: 1px solid #ff4757; color: #ff6b81; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 10px; display: inline-block;">
              ${title}
            </div>
          </div>
        </div>

        <div class="results-stats">
          <div class="result-row">
            <span>🏆 Score Cumulé Total :</span>
            <span style="color: #fffa65;">${stats.totalScore || 0} pts</span>
          </div>
          <div class="result-row">
            <span>🤸 Personnes Heurtées :</span>
            <span style="color: #ff4757;">${stats.totalInteractions || 0}</span>
          </div>
          <div class="result-row">
            <span>🔓 Villes Débloquées :</span>
            <span style="color: #2ed573;">${unlockedCount} / ${CITIES.length}</span>
          </div>
          <div class="result-row">
            <span>⭐ Étoiles Collectées :</span>
            <span style="color: var(--gold);">${totalStars} / ${CITIES.length * 3}</span>
          </div>
          <div class="result-row">
            <span>🛣️ Distance Parcourue :</span>
            <span>${((stats.totalDistance || 0) / 1000).toFixed(1)} km</span>
          </div>
          <div class="result-row">
            <span>🏁 Parties Jouées :</span>
            <span>${stats.totalRuns || 0}</span>
          </div>
          <div class="result-row">
            <span>🔥 Combo Record :</span>
            <span>x${stats.maxCombo || 1}</span>
          </div>
        </div>

        <h3 style="font-size: 0.9rem; font-weight: 800; color: #ced6e0; margin-top: 4px;">ÉTAPES HOMOLOGUÉES</h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; max-height: 120px; overflow-y: auto;">
          ${CITIES.map(c => {
            const unl = storage.isCityUnlocked(c.id);
            const data = storage.getCityData(c.id);
            return `
              <div style="background: rgba(255,255,255,0.06); padding: 6px; border-radius: 10px; text-align: center; font-size: 0.75rem;">
                <div style="font-weight: 800; color: ${unl ? '#fff' : '#747d8c'};">${c.name}</div>
                <div style="color: var(--gold); font-size: 0.7rem;">${unl ? '★'.repeat(data.stars) : '🔒'}</div>
              </div>
            `;
          }).join('')}
        </div>

        <button id="btn-close-profile" class="btn-arcade" style="margin-top: 8px;">
          FERMER
        </button>
      </div>
    `;

    overlay.querySelector('#btn-close-profile').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
    });

    this.root.appendChild(overlay);
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
          Voulez-vous vraiment quitter Motormageddon ? Toute votre progression est bien sauvegardée.
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
  }

  // --- 7. MODALE DE RÉSULTATS ---
  showResultsModal(data) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    this.activeModals.push(overlay);

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
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      if (this.onAction) this.onAction('START_RUN', gameState.selectedCity);
    });

    overlay.querySelector('#btn-results-map').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.setScreen('MAP');
    });

    overlay.querySelector('#btn-results-garage').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.previousScreen = 'MAP';
      this.setScreen('GARAGE');
    });

    this.root.appendChild(overlay);
  }

  // --- 8. MODALE DE PAUSE ---
  showPauseModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    this.activeModals.push(overlay);

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
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      if (this.onAction) this.onAction('RESUME');
    });

    overlay.querySelector('#btn-pause-restart').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      if (this.onAction) this.onAction('START_RUN', gameState.selectedCity);
    });

    overlay.querySelector('#btn-pause-map').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      gameState.currentMode = 'MAP';
      soundManager.stopEngine();
      this.setScreen('MAP');
    });

    this.root.appendChild(overlay);
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
        </div>

        <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
          <div style="font-size: 0.78rem; color: #a4b0be; margin-bottom: 8px;">
            Motormageddon Arcade 3D ${FULL_VERSION}<br>
            ${COPYRIGHT_NOTICE}
          </div>
          <button id="btn-settings-legal" class="btn-legal-link" style="font-size: 0.8rem;">
            📜 Mentions Légales & Version
          </button>
        </div>

        <button id="btn-settings-close" class="btn-arcade" style="margin-top: 14px;">
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

    overlay.querySelector('#btn-settings-legal').addEventListener('click', () => {
      soundManager.playClick();
      this.showLegalModal();
    });

    overlay.querySelector('#btn-settings-close').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
    });

    this.root.appendChild(overlay);
  }

  // --- 10. MODALE MENTIONS LÉGALES & COPYRIGHT EOMEDIA 2026 ---
  showLegalModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    this.activeModals.push(overlay);

    overlay.innerHTML = `
      <div class="modal-card" style="max-height: 85vh; overflow-y: auto; text-align: left;">
        <h2 class="modal-title" style="text-align: center;">MENTIONS LÉGALES</h2>

        <div style="font-size: 0.82rem; line-height: 1.5; color: #ced6e0; display: flex; flex-direction: column; gap: 10px; margin: 12px 0;">
          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
            <strong style="color: #f1c40f;">Éditeur & Développeur :</strong><br>
            <strong>EOMedia</strong> — Tous droits réservés © 2026.<br>
            Version installée : <strong style="color: #2ed573;">${FULL_VERSION}</strong> (${RELEASE_NAME}) <span style="background: #ff4757; color: #fff; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; vertical-align: middle;">CANAL BETA</span><br>
            Contact éditeur : support@eomedia.fr
          </div>

          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
            <strong style="color: #38ada9;">Jeu & Fiction Burlesque :</strong><br>
            <em>Motormageddon Arcade 3D</em> est une œuvre de fiction d'action humoristique et parodique.
            Toute ressemblance avec des personnes réelles, des incidents ou des marques existantes est purement fortuite.
            Le jeu encourage la prudence et le respect strict du Code de la Route dans la vie réelle.
          </div>

          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
            <strong style="color: #2ed573;">Protection des Données (RGPD / Confidentialité) :</strong><br>
            Le jeu s'exécute intégralement en local sur votre appareil Android.
            <strong>Aucune donnée personnelle</strong>, identifiant publicitaire, traceur ou géolocalisation n'est collecté ni transmis à des tiers.
            Vos scores et vos préférences sont conservés exclusivement sur votre appareil.
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
  }

  showToastUnlock(data) {
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
    toast.innerHTML = `✨ ${data.name || 'Débloqué'} !`;
    this.root.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

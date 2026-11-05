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

export class UIManager {
  constructor(rootElement, onActionCallback) {
    this.root = rootElement;
    this.onAction = onActionCallback;

    this.currentScreen = 'SPLASH'; // SPLASH, MAP, GARAGE, HUD
    this.previousScreen = 'SPLASH';
    this.selectedMapCity = gameState.selectedCity;
    this.selectedGarageBike = gameState.selectedBike;
    this.activeModals = []; // Pile des modales actives pour le bouton retour

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
          <div class="currency-pill">
            <span>🪙 ${coins}</span>
          </div>
        </div>
      </div>

      <!-- CARTE D'EUROPE ET BASSIN MÉDITERRANÉEN HAUTE-FIDÉLITÉ AVEC ZOOM INTERACTIF -->
      <div class="map-zoom-controls">
        <button id="btn-zoom-in" class="btn-zoom" title="Agrandir la carte (Zoom +)">➕</button>
        <span class="zoom-level-badge" id="zoom-badge">${Math.round(this.mapZoom * 100)}%</span>
        <button id="btn-zoom-out" class="btn-zoom" title="Réduire la carte (Zoom -)">➖</button>
        <button id="btn-zoom-reset" class="btn-zoom" title="Recentrer">🎯</button>
      </div>

      <div class="europe-map-scroll-viewport" id="europe-viewport">
        <div class="europe-map-canvas-container" id="europe-canvas">
          <svg class="europe-svg" viewBox="0 0 960 1100" preserveAspectRatio="none">
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

            <!-- ================= GÉOGRAPHIE RÉALISTE DE L'EUROPE & BASSIN MÉDITERRANÉEN ================= -->

            <!-- 1. ROYAUME-UNI (GRANDE-BRETAGNE / ANGLETERRE) AVEC LONDRES 🇬🇧 -->
            <path class="country-uk" filter="url(#coastalGlow)" d="
              M 160 30
              C 220 25, 290 35, 340 50
              C 380 65, 410 90, 430 130
              C 435 155, 395 180, 360 185
              C 320 190, 290 170, 250 180
              C 210 190, 160 170, 120 180
              C 90 160, 110 120, 130 90
              C 145 70, 150 45, 160 30 Z
            " fill="url(#neighborCountryGrad)" stroke="#38ada9" stroke-width="2.5" />
            <text x="240" y="90" fill="#74b9ff" font-size="13" font-weight="900" letter-spacing="1.2">ROYAUME-UNI 🇬🇧</text>
            <!-- Tamise (Thames) -->
            <path d="M 280 145 Q 330 135 365 138 Q 400 135 425 142" fill="none" stroke="#00cec9" stroke-width="2.2" opacity="0.6" />

            <!-- 2. BELGIQUE & PAYS-BAS AVEC BRUXELLES 🇧🇪 -->
            <path class="country-benelux" filter="url(#coastalGlow)" d="
              M 480 95
              C 520 85, 570 95, 600 115
              C 625 135, 630 175, 615 205
              C 590 230, 545 225, 510 220
              C 485 200, 470 160, 465 130
              C 460 110, 470 100, 480 95 Z
            " fill="url(#neighborCountryGrad)" stroke="#38ada9" stroke-width="2.5" />
            <text x="500" y="145" fill="#74b9ff" font-size="13" font-weight="900" letter-spacing="1">BELGIQUE 🇧🇪</text>

            <!-- 3. ALLEMAGNE AU-DELÀ DU RHIN 🇩🇪 -->
            <path class="country-germany" filter="url(#coastalGlow)" d="
              M 630 175
              C 670 165, 750 170, 800 190
              C 840 215, 870 270, 860 330
              C 840 370, 780 380, 740 370
              C 710 350, 690 300, 670 260
              C 650 220, 640 190, 630 175 Z
            " fill="url(#neighborCountryGrad)" stroke="#2c3e50" stroke-width="2.2" />
            <text x="730" y="240" fill="#74b9ff" font-size="13" font-weight="900" letter-spacing="1.2">ALLEMAGNE 🇩🇪</text>

            <!-- 4. SUISSE AVEC GENÈVE & ALPES 🇨🇭 -->
            <path class="country-switzerland" filter="url(#coastalGlow)" d="
              M 640 370
              C 680 360, 740 370, 760 395
              C 775 425, 760 460, 730 475
              C 690 485, 640 475, 610 455
              C 595 435, 610 390, 640 370 Z
            " fill="url(#neighborCountryGrad)" stroke="#38ada9" stroke-width="2.4" />
            <text x="655" y="420" fill="#74b9ff" font-size="13" font-weight="900" letter-spacing="1">SUISSE 🇨🇭</text>
            <ellipse cx="612" cy="438" rx="14" ry="7" fill="#00cec9" opacity="0.8" />

            <!-- 5. FRANCE MÉTROPOLITAINE HAUTE FIDÉLITÉ (COEUR DU GRAND TOUR) 🇫🇷 -->
            <path class="france-mainland" filter="url(#coastalGlow)" d="
              M 440 215
              C 460 215, 490 225, 520 235
              C 560 250, 600 240, 630 270
              C 665 305, 680 330, 685 365
              C 690 400, 655 435, 670 475
              C 685 510, 650 545, 645 580
              C 635 615, 660 655, 625 700
              C 595 735, 550 755, 525 780
              C 485 785, 440 770, 395 790
              C 350 805, 300 785, 265 770
              C 225 755, 210 705, 190 685
              C 170 665, 120 635, 105 600
              C 90 565, 110 525, 95 485
              C 80 445, 60 430, 50 400
              C 45 365, 80 345, 110 340
              C 145 330, 175 350, 210 335
              C 240 320, 255 295, 290 280
              C 325 265, 350 225, 385 218
              C 400 215, 420 215, 440 215 Z
            " fill="url(#franceLuxury)" stroke="#00cec9" stroke-width="3.2" />
            <text x="390" y="460" fill="#00cec9" font-size="18" font-weight="900" letter-spacing="3" opacity="0.45">FRANCE 🇫🇷</text>

            <!-- Île de Corse -->
            <path d="M 680 680 C 695 670, 710 690, 705 735 C 690 770, 675 765, 665 730 Z"
                  fill="url(#franceLuxury)" stroke="#00cec9" stroke-width="2.5" filter="url(#coastalGlow)" />
            <text x="668" y="780" fill="#00cec9" font-size="10" font-weight="900">CORSE 🇫🇷</text>

            <!-- 6. ESPAGNE & CATALOGNE AVEC BARCELONE 🇪🇸 (RÉALISME GÉOGRAPHIQUE ACCRU) -->
            <path class="country-spain" filter="url(#coastalGlow)" d="
              M 190 685
              C 260 685, 330 695, 400 700
              C 440 705, 460 735, 440 770
              C 420 810, 390 850, 340 860
              C 270 870, 190 860, 140 840
              C 100 810, 110 740, 140 710
              C 160 695, 175 685, 190 685 Z
            " fill="url(#neighborCountryGrad)" stroke="#38ada9" stroke-width="2.8" />
            <text x="230" y="770" fill="#74b9ff" font-size="15" font-weight="900" letter-spacing="2">ESPAGNE 🇪🇸</text>
            <text x="365" y="730" fill="#ffd700" font-size="11" font-weight="900">CATALOGNE • BARCELONE</text>
            <!-- Îles Baléares (Majorque, Minorque, Ibiza) -->
            <ellipse cx="460" cy="800" rx="14" ry="8" fill="url(#neighborCountryGrad)" stroke="#38ada9" stroke-width="1.8" />
            <ellipse cx="485" cy="785" rx="9" ry="5" fill="url(#neighborCountryGrad)" stroke="#38ada9" stroke-width="1.8" />

            <!-- 7. ITALIE DU NORD, DU SUD (ROME & NAPLES) ET BOTTE ITALIENNE 🇮🇹 -->
            <path class="country-italy" filter="url(#coastalGlow)" d="
              M 730 475
              C 770 465, 840 480, 890 515
              C 920 545, 925 590, 895 640
              C 870 680, 835 710, 810 755
              C 785 800, 770 845, 750 860
              C 730 875, 720 860, 730 830
              C 740 800, 755 765, 745 730
              C 735 695, 715 670, 710 630
              C 705 580, 715 520, 730 475 Z
            " fill="url(#neighborCountryGrad)" stroke="#38ada9" stroke-width="2.8" />
            <text x="785" y="540" fill="#74b9ff" font-size="14" font-weight="900" letter-spacing="1.5">ITALIE 🇮🇹</text>
            <text x="715" y="660" fill="#ffd700" font-size="11" font-weight="900">ROME 🏛️</text>
            <text x="765" y="715" fill="#ff7675" font-size="11" font-weight="900">NAPOLI & VÉSUVE 🌋</text>

            <!-- Vésuve (Cône volcanique rougeoyant) -->
            <polygon points="768,705 763,712 773,712" fill="#d63031" />
            <circle cx="768" cy="704" r="2.5" fill="#fdcb6e" />

            <!-- Île de Sicile 🇮🇹 -->
            <path d="
              M 690 850
              C 740 835, 790 845, 780 875
              C 760 900, 720 895, 685 870
              C 675 860, 680 855, 690 850 Z
            " fill="url(#neighborCountryGrad)" stroke="#38ada9" stroke-width="2.2" filter="url(#coastalGlow)" />
            <text x="715" y="872" fill="#74b9ff" font-size="10" font-weight="900">SICILE 🇮🇹</text>

            <!-- 8. AFRIQUE DU NORD : ALGÉRIE 🇩🇿 ET TUNISIE 🇹🇳 (CÔTE SUD MÉDITERRANÉENNE) -->
            <path class="country-north-africa" filter="url(#coastalGlow)" d="
              M 260 1020
              C 330 960, 420 950, 520 955
              C 620 960, 700 940, 750 965
              C 790 985, 810 1030, 800 1100
              L 260 1100 Z
            " fill="url(#neighborCountryGrad)" stroke="#2ed573" stroke-width="3.0" />
            <text x="410" y="1010" fill="#2ed573" font-size="16" font-weight="900" letter-spacing="2.5">ALGÉRIE 🇩🇿 (ALGER & ANNABA)</text>
            <text x="710" y="995" fill="#ff4757" font-size="15" font-weight="900" letter-spacing="2">TUNISIE 🇹🇳 (TUNIS)</text>

            <!-- Mer Méditerranée (Vagues bleues décoratives) -->
            <text x="460" y="860" fill="#00cec9" font-size="14" font-weight="900" letter-spacing="4" opacity="0.45">MER MÉDITERRANÉE</text>

            <!-- Tracé Lumineux Officiel du Grand Tour (Néon Or Éclatant reliant les 20 villes) -->
            <path class="tour-route-glow" d="
              M 442 308
              L 518 198
              L 326 154
              L 250 352
              L 307 528
              L 384 704
              L 451 572
              L 528 616
              L 614 605
              L 710 528
              L 605 484
              L 643 484
              L 586 506
              L 528 484
              L 653 286
              L 720 704
              L 768 770
              L 710 968
              L 576 979
              L 432 990
              Z
            " fill="none" stroke="#ffd700" stroke-width="4.2" stroke-dasharray="10,6" opacity="0.9" filter="url(#glowTourRoute)" />
          </svg>

          <!-- SVG Overlay pour ligne active animée lors des déplacements -->
          <svg class="travel-line-overlay" viewBox="0 0 960 1100" preserveAspectRatio="none">
            <line id="travel-active-line" x1="0" y1="0" x2="0" y2="0" stroke="#ffd700" stroke-width="5" stroke-dasharray="10,7" opacity="0" filter="url(#glowTourRoute)" />
          </svg>

          <!-- Jeton Motard Voyageur Animé se déplaçant d'une ville à une autre -->
          <div class="moto-traveler" id="moto-traveler" style="left: 46%; top: 28%;">
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

    // Gestion du Zoom Interactif (Agrandir / Réduire / Recentrer)
    const canvasContainer = mapScreen.querySelector('#europe-canvas');
    const zoomBadge = mapScreen.querySelector('#zoom-badge');
    const applyZoom = (newZoom) => {
      this.mapZoom = Math.max(0.65, Math.min(2.4, newZoom));
      if (canvasContainer) {
        canvasContainer.style.transform = `scale(${this.mapZoom})`;
        canvasContainer.style.transformOrigin = 'top left';
      }
      if (zoomBadge) {
        zoomBadge.textContent = `${Math.round(this.mapZoom * 100)}%`;
      }
    };

    mapScreen.querySelector('#btn-zoom-in')?.addEventListener('click', () => {
      soundManager.playClick();
      applyZoom(this.mapZoom + 0.25);
    });
    mapScreen.querySelector('#btn-zoom-out')?.addEventListener('click', () => {
      soundManager.playClick();
      applyZoom(this.mapZoom - 0.25);
    });
    mapScreen.querySelector('#btn-zoom-reset')?.addEventListener('click', () => {
      soundManager.playClick();
      applyZoom(1.0);
    });

    const viewportEl = mapScreen.querySelector('#europe-viewport');
    if (viewportEl) {
      viewportEl.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        applyZoom(this.mapZoom + delta);
      }, { passive: false });
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
            travelLine.setAttribute('x1', (fromCoords.x / 100) * 960);
            travelLine.setAttribute('y1', (fromCoords.y / 100) * 1100);
            travelLine.setAttribute('x2', (toCoords.x / 100) * 960);
            travelLine.setAttribute('y2', (toCoords.y / 100) * 1100);
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

      // Centrer automatiquement le viewport scrollable sur la ville sélectionnée
      const viewport = mapScreen.querySelector('#europe-viewport');
      if (viewport) {
        const targetPxX = (city.mapCoords.x / 100) * 960 * this.mapZoom;
        const targetPxY = (city.mapCoords.y / 100) * 1100 * this.mapZoom;
        viewport.scrollTo({
          left: Math.max(0, Math.min(960 * this.mapZoom - viewport.clientWidth, targetPxX - viewport.clientWidth / 2)),
          top: Math.max(0, Math.min(1100 * this.mapZoom - viewport.clientHeight, targetPxY - viewport.clientHeight / 2)),
          behavior: 'smooth'
        });
      }

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

    this.root.appendChild(mapScreen);
    this.updateCityDetail(mapScreen.querySelector('#city-detail'));

    // Centrage initial de la vue sur la ville sélectionnée
    setTimeout(() => {
      const viewport = mapScreen.querySelector('#europe-viewport');
      if (viewport && this.selectedMapCity) {
        const targetPxX = (this.selectedMapCity.mapCoords.x / 100) * 960;
        const targetPxY = (this.selectedMapCity.mapCoords.y / 100) * 1100;
        viewport.scrollTo({
          left: Math.max(0, Math.min(960 - viewport.clientWidth, targetPxX - viewport.clientWidth / 2)),
          top: Math.max(0, Math.min(1100 - viewport.clientHeight, targetPxY - viewport.clientHeight / 2)),
          behavior: 'auto'
        });
      }
    }, 50);
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
        <span>🎯 Objectif Étape : <strong>${city.targetScore} pts</strong></span>
      </div>

      <div class="city-detail-actions">
        ${unlocked ? `
          <button id="btn-launch-city" class="btn-arcade btn-play-pulse btn-action-launch">
            <span>🚀 DÉPART • ÉTAPE ${stageIndex} : ${city.name.toUpperCase()}</span>
          </button>
        ` : `
          <button class="btn-arcade btn-action-locked" disabled>
            <span>🔒 BLOQUÉ (${city.unlockScoreRequired.toLocaleString('fr-FR')} PTS REQUIS)</span>
          </button>
        `}
      </div>
    `;

    if (unlocked) {
      const launchBtn = detailCard.querySelector('#btn-launch-city');
      if (launchBtn) {
        launchBtn.addEventListener('click', () => {
          soundManager.playClick();
          gameState.selectCity(city.id);
          this.triggerCityEntryCinematic(city);
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
        <div class="currency-badge currency-pill">
          <span>🪙 ${coins}</span>
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
      container.querySelector('#btn-buy-bike').addEventListener('click', () => {
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

  // --- 4. HUD DE GAMEPLAY AVEC FREIN, SCORE DYNAMIQUE ET COMPTE À REBOURS ---
  renderHUDScreen() {
    const hud = document.createElement('div');
    hud.className = 'screen-hud';

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

        <!-- Compteur de vitesse moderne centré (dégagé et lisible) -->
        <div class="speedometer-center">
          <div class="speed-dial">
            <span class="speed-value" id="hud-speed-val">0</span>
            <span class="speed-unit">KM/H</span>
          </div>
          <div class="speed-track-gauge">
            <div class="speed-fill-gauge" id="hud-speed-gauge"></div>
          </div>
        </div>

        <!-- Bouton Nitro Boost 5s avec jauge rechargeable (pouce droit / Espace) -->
        <button class="btn-nitro-pedal" id="btn-hud-nitro" title="Activer le Nitro Boost 5s (Touche Espace / Shift)">
          <div class="nitro-fill-track">
            <div class="nitro-fill-bar" id="hud-nitro-fill" style="width: 0%;"></div>
          </div>
          <span class="nitro-icon">⚡</span>
          <span class="nitro-label" id="hud-nitro-label">NITRO</span>
          <span class="nitro-sub" id="hud-nitro-sub">0%</span>
        </button>

        <!-- Bouton Klaxon ergonomique à droite (pouce droit) -->
        <button class="btn-horn-pedal" id="btn-hud-horn" title="Klaxonner !">
          <span class="horn-icon">📢</span>
          <span class="horn-label">KLAXON</span>
        </button>
      </div>

      <div class="touch-hint">
        ← Glissez pour braquer | FREIN pour stopper | ⚡ NITRO (5s) →
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

    hud.querySelector('#btn-hud-pause').addEventListener('click', () => {
      soundManager.playClick();
      if (this.onAction) this.onAction('PAUSE');
      this.showPauseModal();
    });

    hud.querySelector('#btn-hud-horn').addEventListener('click', () => {
      soundManager.playHorn(storage.getEquippedBike());
      if (this.onAction) this.onAction('HORN');
    });

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

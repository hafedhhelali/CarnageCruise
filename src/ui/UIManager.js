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
import { cookieConsentManager } from '../services/CookieConsentManager.js';
import { tycoonManager, TYCOON_BUILDINGS, RESEARCH_NODES } from '../core/TycoonManager.js';

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
      // Si la course est terminée ou en mode résultats, retour direct à la carte
      if (gameState.isGameOver || gameState.currentMode === 'RESULTS') {
        this.setScreen('MAP');
        return;
      }
      // En jeu : afficher le menu de pause
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
    const isMusicOn = storage.data.settings.music;

    splash.innerHTML = `
      <!-- En-tête supérieur ergonomique avec statuts, pièces, étoiles et toggle audio -->
      <div class="splash-header-bar">
        <div class="splash-badge-version">
          ${IS_BETA ? '<span class="badge-beta-pill">BETA</span>' : ''}
          <span class="badge-version-text">${FULL_VERSION}</span>
        </div>
        <div class="splash-header-right">
          <div class="currency-pill clickable" id="splash-gift-coins" title="Cadeau Sponsor : +20 Pièces d'or">
            <span>🪙 ${coins}</span>
            <span class="currency-ad-gift-tag">🎁 +20</span>
          </div>
          <div class="stars-pill" title="Total d'étoiles gagnées">
            <span>★ ${totalStars}</span>
          </div>
          <button id="btn-splash-audio" class="btn-round-action btn-audio-quick" title="${isMusicOn ? 'Couper la Musique' : 'Activer la Musique'}">
            <span>${isMusicOn ? '🔊' : '🔇'}</span>
          </button>
        </div>
      </div>

      <!-- Hero Titre & Logo Arcade Stylisé 3D -->
      <div class="logo-container">
        <div class="logo-glow-ring"></div>
        <h1 class="game-title">MOTORMAGEDDON</h1>
        <div class="game-subtitle">⚡ CARNAGE URBAIN & COURSES D'ASSAUT ⚡</div>
      </div>

      <!-- Carte d'Aperçu du Véhicule Équipé (Accès Rapide Garage) -->
      <div class="splash-vehicle-card clickable" id="btn-splash-quick-garage" title="Personnaliser et équiper dans le Garage">
        <div class="vehicle-card-badge">VÉHICULE PRÊT AU DÉPART</div>
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
          <span class="hero-play-label">LANCER LA COURSE</span>
          <span class="hero-play-arrow">▶</span>
        </button>

        <!-- Grille 2 Colonnes Tactile Ergonomique -->
        <div class="splash-action-grid">
          <button id="btn-splash-garage" class="btn-arcade btn-secondary btn-touch-target">
            <span class="btn-icon">🪖</span>
            <span class="btn-label">GARAGE & ARSENAL</span>
          </button>
          <button id="btn-splash-tycoon" class="btn-arcade btn-accent btn-touch-target">
            <span class="btn-icon">🏭</span>
            <span class="btn-label">EMPIRE TYCOON</span>
          </button>
        </div>

        <!-- Ligne d'Utilitaires Secondaires -->
        <div class="splash-utility-row">
          <button id="btn-splash-cloud" class="btn-arcade btn-ghost btn-sm-utility" title="Sauvegarde Google Play Games">
            <span>☁️ CLOUD</span>
          </button>
          <button id="btn-splash-profile" class="btn-arcade btn-accent btn-sm-utility">
            <span>👤 PROFIL</span>
          </button>
          <button id="btn-splash-settings" class="btn-arcade btn-ghost btn-sm-utility">
            <span>⚙️ OPTIONS</span>
          </button>
          <button id="btn-splash-legal" class="btn-arcade btn-ghost btn-sm-utility">
            <span>ℹ️ INFOS</span>
          </button>
        </div>

        <div class="splash-legal">
          <span>${COPYRIGHT_NOTICE}</span>
        </div>
      </div>
    `;

    splash.querySelector('#btn-splash-play').addEventListener('click', () => {
      soundManager.playClick('hero');
      soundManager.resumeContext();
      soundManager.switchMusicTrack('MENU');
      this.setScreen('MAP');
    });

    splash.querySelector('#btn-splash-tycoon')?.addEventListener('click', () => {
      soundManager.playClick();
      soundManager.resumeContext();
      this.showTycoonModal();
    });

    splash.querySelector('#btn-splash-garage')?.addEventListener('click', () => {
      soundManager.playClick('garage');
      this.previousScreen = 'SPLASH';
      this.setScreen('GARAGE');
    });

    splash.querySelector('#btn-splash-quick-garage')?.addEventListener('click', () => {
      soundManager.playClick('garage');
      this.previousScreen = 'SPLASH';
      this.setScreen('GARAGE');
    });

    splash.querySelector('#btn-splash-cloud')?.addEventListener('click', () => {
      soundManager.playClick('default');
      this.showCloudSaveModal();
    });

    splash.querySelector('#btn-splash-profile').addEventListener('click', () => {
      soundManager.playClick('default');
      this.showProfileModal();
    });

    splash.querySelector('#btn-splash-settings').addEventListener('click', () => {
      soundManager.playClick('default');
      this.showSettingsModal();
    });

    splash.querySelector('#btn-splash-legal').addEventListener('click', () => {
      soundManager.playClick('default');
      this.showLegalModal();
    });

    splash.querySelector('#splash-gift-coins')?.addEventListener('click', () => {
      adManager.showRewardedAd('COINS', () => {
        storage.addCoins(20);
        soundManager.playCashRegister();
        this.render();
      });
    });

    splash.querySelector('#btn-splash-audio')?.addEventListener('click', () => {
      const nextMusicState = !storage.data.settings.music;
      soundManager.toggleMusic(nextMusicState);
      soundManager.playClick('default');
      this.render();
    });

    this.root.appendChild(splash);
  }

  // --- 2. CARTE RÉALISTE DE FRANCE & EFFETS DE TRANSITION ---
  renderMapScreen() {
    const mapScreen = document.createElement('div');
    mapScreen.className = 'screen-map interactive';

    const coins = storage.data.coins;
    const totalStars = storage.getTotalStars();
    const wmProgress = storage.getWorldmageddonProgress();
    // Rangée 1 & 2 : En-tête de commande tactique
    const currentBikeId = storage.getEquippedBike() || gameState.selectedBike?.id || 'tank';
    const currentBike = BIKES.find(b => b.id === currentBikeId) || BIKES[0];

    mapScreen.innerHTML = `
      <!-- EN-TÊTE STABLE SANS PERTURBATIONS VISUELLES : 2 RANGÉES ÉPURÉES -->
      <div class="map-header-redesign">
        <!-- Rangée 1 : Navigation, Raccourci Engin & Récompense Google Ads -->
        <div class="map-top-bar">
          <button id="btn-map-back" class="map-top-btn" title="Retour Accueil">
            <span class="top-btn-icon">🏠</span>
            <span class="top-btn-text">ACCUEIL</span>
          </button>

          <!-- RACCOURCI ENGIN PRINCIPAL FIXE ET LISIBLE -->
          <button id="btn-quick-vehicle-select" class="map-quick-vehicle-btn" title="Changer d'Engin d'Assaut">
            <span class="quick-veh-icon-pill">${currentBike.icon || '🪖'}</span>
            <div class="quick-veh-text-pill">
              <span class="quick-veh-label">VÉHICULE D'ASSAUT</span>
              <span class="quick-veh-title">${currentBike.shortName || currentBike.name} ▾</span>
            </div>
          </button>

          <div class="currency-pill clickable" id="btn-header-ad-coins" title="Google Ads : +20 Pièces d'or">
            <span>🪙 ${coins}</span>
            <span class="currency-ad-gift-tag">🎁 +20</span>
          </div>
        </div>

        <!-- Rangée 2 : Dossier Stratégique Worldmageddon + QG Tycoon + Reset -->
        <div class="map-sub-bar">
          <div class="worldmageddon-strip clickable" id="btn-open-worldmageddon" title="Dossier Stratégique Worldmageddon">
            <div class="wm-strip-badge">
              <span class="wm-strip-skull">💀</span>
              <div class="wm-strip-texts">
                <span class="wm-strip-title">WORLDMAGEDDON</span>
                <span class="wm-strip-rank">${wmProgress.rank}</span>
              </div>
            </div>
            <div class="wm-strip-stats">
              <span class="wm-strip-count">${wmProgress.totalKills.toLocaleString('fr-FR')} <small style="color:#a4b0be;">/ 8Mds</small></span>
              <span class="wm-strip-pct">${wmProgress.percentage}%</span>
            </div>
          </div>

          <div class="map-strip-actions">
            <button id="btn-open-tycoon" class="map-pill-action pill-tycoon-action" title="QG Empire Clandestin">
              <span>🏭 TYCOON</span>
            </button>
            <button id="btn-reset-progression" class="map-pill-action pill-reset-action" title="Réinitialiser l'avancement">
              <span>🔄</span>
            </button>
          </div>
        </div>
      </div>

      <!-- CARTE D'EUROPE ET BASSIN MÉDITERRANÉEN HAUTE-FIDÉLITÉ AVEC ZOOM INTERACTIF -->
      <div class="europe-map-scroll-viewport" id="europe-viewport">
        <!-- CONTRÔLES DE ZOOM FLOTTANTS (EN BAS À DROITE, SANS AUCUNE SUPERPOSITION) -->
        <div class="map-zoom-controls-floating">
          <button id="btn-zoom-in" class="btn-zoom" title="Agrandir (Zoom +)">➕</button>
          <span class="zoom-level-badge" id="zoom-badge">${Math.round(this.mapZoom * 100)}%</span>
          <button id="btn-zoom-out" class="btn-zoom" title="Réduire (Zoom -)">➖</button>
          <button id="btn-zoom-reset" class="btn-zoom" title="Recentrer">🎯</button>
        </div>

        <!-- BOUTONS FLOTTANTS DE NAVIGATION RAPIDE ENTRE LES CIBLES DU GRAND TOUR -->
        <button id="map-float-prev-city" class="map-city-nav-floating left" title="Cité précédente (◀)">◀</button>
        <button id="map-float-next-city" class="map-city-nav-floating right" title="Cité suivante (▶)">▶</button>

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
          <div class="moto-traveler" id="moto-traveler" style="left: ${this.selectedMapCity ? this.selectedMapCity.mapCoords.x : 44.8}%; top: ${this.selectedMapCity ? this.selectedMapCity.mapCoords.y : 40.2}%;">
            <div class="moto-traveler-icon">🏍️</div>
            <div class="moto-traveler-exhaust">💨</div>
          </div>

          <!-- Pins interactifs des 20 villes d'Europe et Méditerranée avec médaillons 3D et drapeaux -->
          <!-- Pins interactifs des villes d'Europe et Méditerranée -->
          ${CITIES.map((city, idx) => {
            const unlocked = storage.isCityUnlocked(city.id);
            const isExterminated = storage.isCityExterminated(city.id);
            const isSelected = this.selectedMapCity.id === city.id;

            return `
              <div class="city-pin ${unlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''} ${isExterminated ? 'exterminated-pin' : ''}"
                   data-city-id="${city.id}"
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
      const effectiveW = 1060 * zoom;
      const effectiveH = 1480 * zoom;

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
    const zoomControls = mapScreen.querySelector('.map-zoom-controls-floating');
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

    mapScreen.querySelector('#btn-open-worldmageddon')?.addEventListener('click', () => {
      soundManager.playClick();
      this.showWorldmageddonModal();
    });

    mapScreen.querySelector('#btn-open-tycoon')?.addEventListener('click', () => {
      soundManager.playClick();
      this.showTycoonModal();
    });

    mapScreen.querySelector('#btn-reset-progression')?.addEventListener('click', () => {
      this.showResetProgressionModal();
    });

    mapScreen.querySelector('#btn-quick-vehicle-select')?.addEventListener('click', () => {
      this.showQuickVehicleModal();
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

    // Navigation séquentielle fluide entre les villes (◀ / ▶)
    const navigateCity = (direction) => {
      soundManager.playClick();
      const currentId = this.selectedMapCity ? this.selectedMapCity.id : CITIES[0].id;
      let idx = CITIES.findIndex(c => c.id === currentId);
      if (idx === -1) idx = 0;
      const nextIdx = (idx + direction + CITIES.length) % CITIES.length;
      updateSelection(CITIES[nextIdx].id);
    };
    this.navigateMapCity = navigateCity;

    mapScreen.querySelector('#map-float-prev-city')?.addEventListener('click', (e) => {
      e?.stopPropagation();
      navigateCity(-1);
    });
    mapScreen.querySelector('#map-float-next-city')?.addEventListener('click', (e) => {
      e?.stopPropagation();
      navigateCity(1);
    });

    const handleCityAction = (cityId) => {
      const city = CITIES.find(c => c.id === cityId);
      if (!city) return;

      const isAlreadySelected = (this.selectedMapCity && this.selectedMapCity.id === cityId);

      if (isAlreadySelected) {
        if (storage.isCityExterminated(city.id)) {
          soundManager.playCrash();
          this.showToastUnlock({ name: '☠️ VILLE FERMÉE : Accès définitivement condamné suite à l\'extermination totale !' });
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
    if (!detailCard) return;
    const city = this.selectedMapCity;
    if (!city) return;

    const currentBikeId = storage.getEquippedBike() || gameState.selectedBike?.id || 'tank';
    const currentBike = BIKES.find(b => b.id === currentBikeId) || BIKES[0];

    const stageIndex = CITIES.findIndex(c => c.id === city.id) + 1;
    const unlocked = storage.isCityUnlocked(city.id);
    const isExterminated = storage.isCityExterminated(city.id);
    const cityData = storage.getCityData(city.id);

    const starsHtml = isExterminated ? '★★★' : ('★'.repeat(cityData.stars) + '☆'.repeat(3 - cityData.stars));

    if (isExterminated) {
      detailCard.innerHTML = `
        <!-- BARRE DE NAVIGATION FLUIDE ENTRE LES ÉTAPES DU GRAND TOUR -->
        <div class="city-nav-bar">
          <button id="btn-card-prev-city" class="btn-city-nav" title="Étape précédente">
            ◀ <span class="nav-btn-text">PRÉCÉDENTE</span>
          </button>
          <div class="city-nav-info">
            <span class="city-nav-step">CIBLE #${stageIndex} / ${CITIES.length}</span>
            <span class="city-nav-title">${city.countryFlag || '🌍'} ${city.name.toUpperCase()}</span>
          </div>
          <button id="btn-card-next-city" class="btn-city-nav" title="Étape suivante">
            <span class="nav-btn-text">SUIVANTE</span> ▶
          </button>
        </div>

        <div class="city-detail-header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="city-detail-name" style="color: #ff4757;">☠️ ${city.countryFlag || '🌍'} ${city.name.toUpperCase()}</span>
              <span class="city-target-rank-pill pill-rank-closed">ZONE ANÉANTIE</span>
            </div>
            <span class="city-tag tag-closed">☠️ Ville Exterminée & Scellée</span>
            <div style="font-size: 0.82rem; color: #ff7675; font-weight: 800; margin-top: 3px;">
              🏛️ Ruines : <strong>${city.monument || 'Zone Urbaine'} (Pulvérisé)</strong>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0;">
            <div class="city-stars" style="color: #ff4757;">★★★</div>
            <span class="badge-status-closed">FERMÉE</span>
          </div>
        </div>

        <p class="city-description desc-closed">
          Cette métropole a été entièrement anéantie par une frappe d'extermination massive. Tout signe de vie a été balayé. Périmètre scellé militairement et accès terrestre définitivement condamné.
        </p>

        <div class="city-target-info target-info-closed">
          <span>💀 Bilan Fatal : <strong style="color: #ff4757;">+${(city.population || city.exterminationTarget || 500000).toLocaleString('fr-FR')} victimes</strong></span>
          <span style="color: #2ed573;">Statut : <strong>CONQUIS & DÉTRUIT</strong></span>
        </div>

        <div class="city-detail-actions-vertical">
          <button class="btn-arcade btn-action-locked" disabled style="width: 100%; padding: 13px; background: #1e272e; color: #ff7675; border-color: #ff4757; font-weight: 900; white-space: nowrap; letter-spacing: 0.5px;">
            <span>☠️ VILLE FERMÉE (ACCÈS CONDAMNÉ)</span>
          </button>
          <button id="btn-city-ad-coins" class="btn-ad-strip" title="Cadeau Sponsor : Obtenir +20 Pièces d'or">
            <span class="ad-strip-left">🎁 <strong>BONUS GOOGLE ADS : +20 PIÈCES D'OR</strong></span>
            <span class="ad-strip-action">RÉCUPÉRER ▶</span>
          </button>
        </div>
      `;
    } else {
      detailCard.innerHTML = `
        <!-- BARRE DE NAVIGATION FLUIDE ENTRE LES ÉTAPES DU GRAND TOUR -->
        <div class="city-nav-bar">
          <button id="btn-card-prev-city" class="btn-city-nav" title="Étape précédente">
            ◀ <span class="nav-btn-text">PRÉCÉDENTE</span>
          </button>
          <div class="city-nav-info">
            <span class="city-nav-step">CIBLE #${stageIndex} / ${CITIES.length}</span>
            <span class="city-nav-title">${city.countryFlag || '🌍'} ${city.name.toUpperCase()}</span>
          </div>
          <button id="btn-card-next-city" class="btn-city-nav" title="Étape suivante">
            <span class="nav-btn-text">SUIVANTE</span> ▶
          </button>
        </div>

        <div class="city-detail-header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="city-detail-name">${city.countryFlag || '🌍'} ${city.name.toUpperCase()}</span>
              <span class="city-target-rank-pill">CIBLE #${stageIndex}</span>
            </div>
            <span class="city-tag">${city.country || 'Europe'} • ${city.typeTag || 'Métropole Européenne'}</span>
            <div style="font-size: 0.82rem; color: #fffa65; font-weight: 800; margin-top: 3px;">
              🏛️ Monument : <strong>${city.monument || 'Monument Historique'}</strong>
            </div>
            <div style="font-size: 0.78rem; color: #ced6e0; margin-top: 2px;">${city.subtitle}</div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0;">
            <div class="city-stars">${starsHtml}</div>
            ${unlocked ? '<span class="badge-status-active">▶ ACTIVE</span>' : '<span class="badge-status-locked">🔒 VERROUILLÉ</span>'}
          </div>
        </div>

        <p class="city-description">${city.description}</p>

        <div class="city-target-info">
          <span>🏆 Record : <strong>${cityData.bestScore} pts</strong></span>
          <span>💀 Population Cible : <strong style="color: #fffa65;">+${(city.population || city.exterminationTarget || 500000).toLocaleString('fr-FR')} âmes</strong></span>
        </div>

        <div class="city-detail-actions-vertical">
          <!-- RACCOURCI ENGIN HYPER VISIBLE SUR LA FICHE VILLE -->
          <button id="btn-city-vehicle-shortcut" class="btn-city-vehicle-banner" title="Changer d'engin ou d'arsenal">
            <span class="veh-banner-left">
              <span class="veh-banner-icon">${currentBike.icon || '🪖'}</span>
              <span class="veh-banner-text">
                <small style="color: #ffd32a; font-size: 0.62rem; font-weight: 900; letter-spacing: 0.5px;">VÉHICULE ACTIF</small>
                <strong style="color: #fff; font-size: 0.85rem;">${currentBike.shortName || currentBike.name}</strong>
              </span>
            </span>
            <span class="veh-banner-action">CHANGER ▾</span>
          </button>

          <!-- BOUTON ENTRÉE PRINCIPAL HYPER VISIBLE ET NON AMBIGU -->
          ${unlocked ? `
            <button id="btn-enter-city-race" class="btn-arcade btn-enter-city-hero" title="Entrer dans ${city.name} et lancer la course">
              <span class="btn-enter-hero-icon">🏁</span>
              <div class="btn-enter-hero-texts">
                <span class="btn-enter-hero-title">▶ ENTRER DANS LA VILLE : ${city.name.toUpperCase()}</span>
                <span class="btn-enter-hero-desc">DÉMARRER LA COURSE AU SOL • OBJECTIF : ${city.targetScore.toLocaleString('fr-FR')} PTS</span>
              </div>
              <span class="btn-enter-hero-badge">JOUER ▶</span>
            </button>

            <div class="city-secondary-actions-row">
              <button id="btn-wmd-city" class="btn-arcade btn-wmd-strike-secondary" title="Exterminer avec armes de destruction massive">
                <span>💀 EXTERMINER (ADM)</span>
              </button>
              <button id="btn-city-ad-coins" class="btn-arcade btn-ad-coins-secondary" title="Bonus Google Ads : +20 Pièces d'or">
                <span>🎁 GOOGLE ADS (+20 🪙)</span>
              </button>
            </div>
          ` : `
            <button class="btn-arcade btn-enter-city-locked" disabled>
              <span class="btn-enter-hero-icon">🔒</span>
              <div class="btn-enter-hero-texts">
                <span class="btn-enter-hero-title">🔒 VILLE VERROUILLÉE</span>
                <span class="btn-enter-hero-desc">${city.unlockScoreRequired.toLocaleString('fr-FR')} POINTS REQUIS POUR DÉBLOQUER CETTE CITÉ</span>
              </div>
              <span class="btn-enter-hero-badge">BLOQUÉ</span>
            </button>
            <button id="btn-city-ad-coins" class="btn-ad-strip" title="Cadeau Sponsor : Obtenir +20 Pièces d'or">
              <span class="ad-strip-left">🎁 <strong>BONUS GOOGLE ADS : +20 PIÈCES D'OR</strong></span>
              <span class="ad-strip-action">RÉCUPÉRER ▶</span>
            </button>
          `}
        </div>
      `;
    }

    // Gestionnaires de navigation de carrousel de ville
    detailCard.querySelector('#btn-card-prev-city')?.addEventListener('click', (e) => {
      e?.stopPropagation();
      if (this.navigateMapCity) this.navigateMapCity(-1);
    });
    detailCard.querySelector('#btn-card-next-city')?.addEventListener('click', (e) => {
      e?.stopPropagation();
      if (this.navigateMapCity) this.navigateMapCity(1);
    });

    const cityVehBtn = detailCard.querySelector('#btn-city-vehicle-shortcut');
    if (cityVehBtn) {
      cityVehBtn.addEventListener('click', () => {
        this.showQuickVehicleModal();
      });
    }

    const cityAdBtn = detailCard.querySelector('#btn-city-ad-coins');
    if (cityAdBtn) {
      cityAdBtn.addEventListener('click', () => {
        adManager.showRewardedAd('COINS', () => {
          this.render();
        });
      });
    }

    if (unlocked && !isExterminated) {
      const launchRun = () => {
        soundManager.playClick();
        gameState.selectCity(city.id);
        this.triggerCityEntryCinematic(city);
      };

      const launchBtn = detailCard.querySelector('#btn-enter-city-race') || detailCard.querySelector('#btn-launch-city');
      if (launchBtn) launchBtn.addEventListener('click', launchRun);

      const headerBtn = detailCard.querySelector('#btn-detail-header-launch');
      if (headerBtn) headerBtn.addEventListener('click', launchRun);

      const wmdBtn = detailCard.querySelector('#btn-wmd-city');
      if (wmdBtn) {
        wmdBtn.addEventListener('click', () => {
          this.showWmdStrikeModal(city);
        });
      }
    }
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
          <div style="text-align: right;">
            <div style="font-size: 0.68rem; color: ${weaponColor}; font-weight: 950; letter-spacing: 0.8px;" id="wmd-status-phase">T-03 : ACQUISITION</div>
            <div style="font-size: 0.78rem; font-family: monospace; color: #fffa65; font-weight: 900;">POP : ${(victimPop).toLocaleString('fr-FR')}</div>
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
              <span style="font-size: 0.76rem; color: #ff4757; font-weight: 950;" id="wmd-telemetry-destruction">DÉSTRUCTION : 0%</span>
            </div>

            <div style="display: flex; align-items: baseline; justify-content: space-between;">
              <div id="wmd-live-counter" style="font-size: 1.85rem; font-weight: 950; color: #fffa65; font-family: monospace; letter-spacing: 1px; text-shadow: 0 0 18px rgba(255, 250, 101, 0.85);">
                0 VICTIMES
              </div>
              <span id="wmd-live-rate" style="font-size: 0.82rem; color: #ff7675; font-weight: 900;">0 âmes/sec</span>
            </div>

            <!-- Jauge d'anéantissement urbain -->
            <div style="width: 100%; height: 9px; background: rgba(255, 255, 255, 0.12); border-radius: 5px; overflow: hidden;">
              <div id="wmd-live-progress" style="width: 0%; height: 100%; background: linear-gradient(90deg, #fffa65, #ff4757, #b71540); transition: width 0.08s linear;"></div>
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

    // Initialisation et boucle de rendu du Canvas Tactique Plein Écran (60 FPS)
    const canvas = overlay.querySelector('#wmd-tactical-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resizeCanvas();

    const w = window.innerWidth;
    const h = window.innerHeight;
    const centerX = w / 2;
    const centerY = h / 2;

    // 1. GÉNÉRATION DE LA TOPOGRAPHIE URBAINE SATELLITE (Fleuve, Ponts, Rues, 600 Points Thermiques)
    const riverPoints = [];
    for (let py = 0; py <= h + 40; py += 30) {
      const rx = (w * 0.32) + Math.sin(py * 0.007) * (w * 0.14) + Math.cos(py * 0.015) * 25;
      riverPoints.push({ x: rx, y: py });
    }

    const thermalDots = [];
    for (let i = 0; i < 550; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.58) * (Math.min(w, h) * 0.48);
      thermalDots.push({
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        baseColor: (Math.random() < 0.35) ? '#fffa65' : '#2ed573',
        size: 1.2 + Math.random() * 2.2,
        alive: true
      });
    }

    // 2. VÉHICULES CIRCULANT SUR LA CARTE SATELLITE
    const satVehicles = [];
    for (let v = 0; v < 36; v++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 40 + Math.random() * (Math.min(w, h) * 0.42);
      satVehicles.push({
        angle: ang,
        radius: rad,
        speed: (0.15 + Math.random() * 0.3) * (Math.random() < 0.5 ? 1 : -1),
        color: (Math.random() < 0.5) ? '#ffffff' : '#fffa65'
      });
    }

    // 3. PARTICULES ET IMPACTS SELON L'ARME
    const particles = [];
    const spawnParticle = (x, y, vx, vy, color, size, life, decay, type = 'spark') => {
      particles.push({ x, y, vx, vy, color, size, life, maxLife: life, decay, type });
    };

    // Pour Carpet Bombing : 32 impacts étalés le long du couloir de vol
    const carpetStrikes = [];
    if (weaponType === 'CARPET') {
      for (let s = 0; s < 32; s++) {
        const ang = -0.32 + (Math.random() - 0.5) * 0.25;
        const dist = -w * 0.52 + (s / 32) * (w * 1.04);
        carpetStrikes.push({
          x: centerX + Math.cos(ang) * dist + (Math.random() - 0.5) * 55,
          y: centerY + Math.sin(ang) * dist + (Math.random() - 0.5) * 45,
          delay: 1.6 + (s * 0.09),
          exploded: false,
          radius: 0
        });
      }
    }

    // Pour Laser Orbital : arcs de foudre EMP
    const empArcs = [];
    const createEmpArc = () => {
      const pts = [{ x: centerX, y: centerY }];
      let curX = centerX;
      let curY = centerY;
      const angle = Math.random() * Math.PI * 2;
      const length = 50 + Math.random() * (Math.min(w, h) * 0.45);
      const steps = 7 + Math.floor(Math.random() * 5);
      for (let step = 1; step <= steps; step++) {
        const segLen = length / steps;
        curX += Math.cos(angle) * segLen + (Math.random() - 0.5) * 28;
        curY += Math.sin(angle) * segLen + (Math.random() - 0.5) * 28;
        pts.push({ x: curX, y: curY });
      }
      return { pts, life: 1.0 };
    };

    // Pour Aérosol Bio : nuages de gaz toxique en expansion
    const bioGasPuffs = [];
    if (weaponType === 'BIO') {
      for (let g = 0; g < 42; g++) {
        bioGasPuffs.push({
          x: centerX + (Math.random() - 0.5) * 50,
          y: centerY + (Math.random() - 0.5) * 50,
          vx: (Math.random() - 0.5) * 2.2,
          vy: (Math.random() - 0.5) * 2.2,
          radius: 16 + Math.random() * 24,
          targetRadius: 55 + Math.random() * 95,
          opacity: 0
        });
      }
    }

    let startTime = performance.now();
    let simPhase = 'APPROACH';
    let shockwaveRadius = 0;
    let shockwaveMaxRadius = Math.hypot(w, h) * 0.75;
    let cameraShake = 0;
    let animFrameId = null;

    const impactBanner = overlay.querySelector('#wmd-impact-banner');
    const statusPhaseEl = overlay.querySelector('#wmd-status-phase');
    const liveCounterEl = overlay.querySelector('#wmd-live-counter');
    const liveRateEl = overlay.querySelector('#wmd-live-rate');
    const liveProgressEl = overlay.querySelector('#wmd-live-progress');
    const destrEl = overlay.querySelector('#wmd-telemetry-destruction');
    const radTempEl = overlay.querySelector('#wmd-rad-temp');
    const screenFlash = overlay.querySelector('#wmd-screen-flash');
    const confirmBtn = overlay.querySelector('#btn-wmd-confirm-close');

    // Audio initial d'approche
    soundManager.playCountdownBeep(false);
    setTimeout(() => soundManager.playCountdownBeep(false), 550);
    setTimeout(() => soundManager.playCountdownBeep(true), 1100);

    let hasDetonated = false;
    let hasCompleted = false;

    const renderFrame = (now) => {
      const elapsed = (now - startTime) / 1000;

      // 1. PHASE D'APPROCHE (0s - 1.8s)
      if (elapsed < 1.8) {
        simPhase = 'APPROACH';
        const remainingT = Math.max(0, 1.8 - elapsed).toFixed(1);
        statusPhaseEl.textContent = `T-${remainingT}s : ACQUISITION`;

        if (weaponType === 'NUKE') {
          impactBanner.textContent = `☢️ TRAJECTOIRE ICBM HYPERSONIQUE T-${remainingT}s`;
        } else if (weaponType === 'CARPET') {
          impactBanner.textContent = `✈️ ESCADRILLE B-52 EN RASE-MOTTES T-${remainingT}s`;
        } else if (weaponType === 'ORBITAL') {
          impactBanner.textContent = `🛰️ SYNCHRONISATION FAISCEAU IONIQUE T-${remainingT}s`;
        } else if (weaponType === 'BIO') {
          impactBanner.textContent = `☣️ DISPERSION NEURO-TOXIQUE T-${remainingT}s`;
        }
      }
      // 2. PHASE DE DÉTONATION & IMPACT (1.8s - 5.0s)
      else if (elapsed >= 1.8 && !hasCompleted) {
        simPhase = 'DETONATION';
        if (!hasDetonated) {
          hasDetonated = true;
          if (screenFlash) {
            screenFlash.classList.add('flash-active');
            setTimeout(() => screenFlash.classList.remove('flash-active'), 800);
          }

          if (navigator.vibrate) {
            navigator.vibrate([250, 100, 400, 120, 700]);
          }

          cameraShake = (weaponType === 'NUKE' ? 24 : (weaponType === 'CARPET' ? 16 : (weaponType === 'ORBITAL' ? 18 : 10)));

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

          // Particules explosives initiales à haute énergie
          for (let p = 0; p < 180; p++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 2.0 + Math.random() * 11.0;
            spawnParticle(centerX, centerY, Math.cos(ang) * spd, Math.sin(ang) * spd, (p % 2 === 0 ? weaponColor : '#fffa65'), 2 + Math.random() * 5, 1.0 + Math.random() * 1.0, 0.018);
          }
        }

        const detTime = elapsed - 1.8;
        const detDuration = 2.8;
        const detProgress = Math.min(1.0, detTime / detDuration);

        shockwaveRadius = detProgress * shockwaveMaxRadius;

        const currentCasualties = Math.floor(victimPop * Math.pow(detProgress, 0.65));
        liveCounterEl.textContent = `+${currentCasualties.toLocaleString('fr-FR')} VICTIMES`;
        liveRateEl.textContent = `+${Math.floor(victimPop / 2.2).toLocaleString('fr-FR')} /s`;
        liveProgressEl.style.width = `${(detProgress * 100).toFixed(0)}%`;
        destrEl.textContent = `DÉSTRUCTION : ${(detProgress * 100).toFixed(0)}%`;
        radTempEl.textContent = `${Math.floor(22 + detProgress * 5200)} °C`;

        impactBanner.textContent = `💥 ANÉANTISSEMENT DÉFINITIF EN COURS...`;
        statusPhaseEl.textContent = `EXTINCTION : ${(detProgress * 100).toFixed(0)}%`;

        if (cameraShake > 0) cameraShake *= 0.93;

        if (detProgress >= 1.0) {
          hasCompleted = true;
          simPhase = 'EXTERMINATED';

          liveCounterEl.textContent = `+${victimPop.toLocaleString('fr-FR')} VICTIMES (TOTAL)`;
          liveRateEl.textContent = `EXTINCTION 100%`;
          liveProgressEl.style.width = '100%';
          destrEl.textContent = `DÉSTRUCTION : 100%`;
          radTempEl.textContent = `5 240 °C`;
          statusPhaseEl.textContent = `☠️ VILLE EXTERMINÉE`;
          impactBanner.textContent = `☠️ CITÉ ENTIÈRE PULVÉRISÉE & SCÈLLÉE !`;
          impactBanner.style.borderColor = '#ff4757';
          impactBanner.style.color = '#ff7675';

          soundManager.playEvilLaugh();
          soundManager.playVictory();

          if (confirmBtn) {
            confirmBtn.style.opacity = '1';
            confirmBtn.style.pointerEvents = 'auto';
            confirmBtn.innerHTML = `<span>☠️ SCELLER ET CONDAMNER ${city.name.toUpperCase()} DÉFINITIVEMENT ▶</span>`;
          }
        }
      }

      // --- RENDU CANVAS 2D TACTIQUE HAUTE DÉFINITION PLEIN ÉCRAN ---
      ctx.save();
      ctx.scale(dpr, dpr);

      // Secousse caméra (Screen Shake)
      if (cameraShake > 0.4) {
        const shakeX = (Math.random() - 0.5) * cameraShake;
        const shakeY = (Math.random() - 0.5) * cameraShake;
        ctx.translate(shakeX, shakeY);
      }

      // 1. Fond satellite sombre
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      // 2. Tracé du fleuve / plan d'eau métropolitain
      ctx.strokeStyle = '#0a1d37';
      ctx.lineWidth = 36;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      riverPoints.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Berges lumineuses
      ctx.strokeStyle = 'rgba(0, 206, 201, 0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 3. Grille de rues & boulevards urbains
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1.2;
      const gridSize = 42;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Grands boulevards radiaux
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 2.5;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(a) * Math.max(w, h), centerY + Math.sin(a) * Math.max(w, h));
        ctx.stroke();
      }

      // Ponts au-dessus du fleuve
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 4;
      riverPoints.forEach((pt, idx) => {
        if (idx % 4 === 0) {
          ctx.beginPath();
          ctx.moveTo(pt.x - 24, pt.y);
          ctx.lineTo(pt.x + 24, pt.y);
          ctx.stroke();
        }
      });

      // 4. Cercles concentriques radar de télémétrie militaire
      ctx.strokeStyle = 'rgba(0, 206, 201, 0.22)';
      ctx.lineWidth = 1;
      [50, 110, 180, 270, 380].forEach(r => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Balayage radar tournant
      const sweepAngle = elapsed * 1.8;
      ctx.strokeStyle = 'rgba(0, 206, 201, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(sweepAngle) * 380, centerY + Math.sin(sweepAngle) * 380);
      ctx.stroke();

      // 5. Circulation automobile sur la carte
      satVehicles.forEach(v => {
        v.angle += v.speed * (1 / 60);
        const vx = centerX + Math.cos(v.angle) * v.radius;
        const vy = centerY + Math.sin(v.angle) * v.radius;
        ctx.fillStyle = v.color;
        ctx.beginPath();
        ctx.arc(vx, vy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // 6. Points thermiques de population civile
      for (let p of thermalDots) {
        if (!p.alive) continue;
        const dFromCenter = Math.hypot(p.x - centerX, p.y - centerY);

        if (simPhase === 'DETONATION' || simPhase === 'EXTERMINATED') {
          let shouldVaporize = (dFromCenter <= shockwaveRadius);

          if (weaponType === 'CARPET') {
            for (let strike of carpetStrikes) {
              if (strike.exploded && Math.hypot(p.x - strike.x, p.y - strike.y) < strike.radius) {
                shouldVaporize = true;
                break;
              }
            }
          }

          if (shouldVaporize) {
            p.alive = false;
            if (Math.random() < 0.28) {
              spawnParticle(p.x, p.y, (Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 2.5, weaponColor, 1.8, 0.6, 0.03);
            }
            continue;
          }
        }

        ctx.fillStyle = (weaponType === 'BIO' && simPhase === 'DETONATION' && dFromCenter < shockwaveRadius * 1.15) ? '#a29bfe' : p.baseColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // =========================================================================
      // RENDU SPÉCIFIQUE PAR ARME : 4 ANIMATIONS TOTALEMENT DISTINCTES ET SUBLIMES
      // =========================================================================

      // --- 1. NUKE : ICBM PLONGEANT + CHAMPIGNON ATOMIQUE 3D VOLUMÉTRIQUE ---
      if (weaponType === 'NUKE') {
        if (simPhase === 'APPROACH') {
          const t = elapsed / 1.8;
          const missileX = w * 0.98 + (centerX - w * 0.98) * t;
          const missileY = -30 + (centerY - (-30)) * t;

          // Traînée de flammes supersoniques
          const tailGrad = ctx.createLinearGradient(w * 0.98, -30, missileX, missileY);
          tailGrad.addColorStop(0, 'rgba(255, 71, 87, 0.1)');
          tailGrad.addColorStop(0.7, 'rgba(255, 159, 67, 0.85)');
          tailGrad.addColorStop(1, '#ffffff');

          ctx.strokeStyle = tailGrad;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(w * 0.98, -30);
          ctx.lineTo(missileX, missileY);
          ctx.stroke();

          // Tête d'ogive MIRV
          ctx.fillStyle = '#fffa65';
          ctx.beginPath();
          ctx.arc(missileX, missileY, 6, 0, Math.PI * 2);
          ctx.fill();

          // Réticule nucléaire tournant au centre
          const rot = elapsed * 3.5;
          ctx.strokeStyle = '#ff3838';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 46, rot, rot + Math.PI * 1.4);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(centerX, centerY, 62, -rot, -rot + Math.PI);
          ctx.stroke();
        } else if (simPhase === 'DETONATION' || simPhase === 'EXTERMINATED') {
          // Double onde de choc blanche supersonique
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(centerX, centerY, shockwaveRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#ff4757';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(centerX, centerY, Math.max(0, shockwaveRadius - 18), 0, Math.PI * 2);
          ctx.stroke();

          // Halo thermique incandescent
          const blastR = Math.min(shockwaveRadius, Math.max(w, h));
          const nukeGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, blastR);
          nukeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
          nukeGrad.addColorStop(0.2, 'rgba(255, 250, 101, 0.92)');
          nukeGrad.addColorStop(0.48, 'rgba(235, 77, 75, 0.75)');
          nukeGrad.addColorStop(0.8, 'rgba(183, 21, 64, 0.4)');
          nukeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = nukeGrad;
          ctx.beginPath();
          ctx.arc(centerX, centerY, blastR, 0, Math.PI * 2);
          ctx.fill();

          // Champignon atomique volumétrique à plusieurs lobes
          const capY = centerY - shockwaveRadius * 0.38;
          const capR = shockwaveRadius * 0.52;

          // Chapeau central
          const capGrad = ctx.createRadialGradient(centerX, capY, 0, centerX, capY, capR);
          capGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          capGrad.addColorStop(0.35, 'rgba(255, 159, 67, 0.88)');
          capGrad.addColorStop(0.7, 'rgba(45, 52, 54, 0.9)');
          capGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = capGrad;
          ctx.beginPath();
          ctx.arc(centerX, capY, capR, 0, Math.PI * 2);
          ctx.fill();

          // Lobes latéraux de fumée turbulente
          [-capR * 0.45, capR * 0.45].forEach(lx => {
            const lobeGrad = ctx.createRadialGradient(centerX + lx, capY + 8, 0, centerX + lx, capY + 8, capR * 0.65);
            lobeGrad.addColorStop(0, 'rgba(235, 77, 75, 0.85)');
            lobeGrad.addColorStop(0.6, 'rgba(45, 52, 54, 0.85)');
            lobeGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = lobeGrad;
            ctx.beginPath();
            ctx.arc(centerX + lx, capY + 8, capR * 0.65, 0, Math.PI * 2);
            ctx.fill();
          });

          // Colonne / pied de feu et fumée montant dans le ciel
          const colGrad = ctx.createLinearGradient(centerX - capR * 0.28, centerY, centerX + capR * 0.28, centerY);
          colGrad.addColorStop(0, 'rgba(45, 52, 54, 0.85)');
          colGrad.addColorStop(0.5, 'rgba(255, 250, 101, 0.95)');
          colGrad.addColorStop(1, 'rgba(45, 52, 54, 0.85)');
          ctx.fillStyle = colGrad;
          ctx.fillRect(centerX - capR * 0.22, capY, capR * 0.44, centerY - capY);
        }
      }

      // --- 2. CARPET : FORMATION B-52 + CASCADE DE 32 EXPLOSIONS RHYTHMIQUES ---
      else if (weaponType === 'CARPET') {
        if (simPhase === 'APPROACH') {
          const t = elapsed / 1.8;
          const fleetX = -100 + (w + 200) * t;
          const fleetY = 60 + t * 45;

          [-40, 0, 40].forEach((offsetY, idx) => {
            const bx = fleetX - idx * 35;
            const by = fleetY + offsetY;

            // Silhouette réaliste de bombardier B-52
            ctx.fillStyle = '#1e272e';
            ctx.beginPath();
            ctx.moveTo(bx + 26, by);
            ctx.lineTo(bx - 20, by - 24);
            ctx.lineTo(bx - 12, by - 6);
            ctx.lineTo(bx - 32, by);
            ctx.lineTo(bx - 12, by + 6);
            ctx.lineTo(bx - 20, by + 24);
            ctx.closePath();
            ctx.fill();

            // Double traînée de condensation des réacteurs
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.lineWidth = 2;
            [-8, 8].forEach(engY => {
              ctx.beginPath();
              ctx.moveTo(bx - 14, by + engY);
              ctx.lineTo(bx - 110, by + engY);
              ctx.stroke();
            });

            // Feux de navigation clignotants
            ctx.fillStyle = (Math.floor(elapsed * 7) % 2 === 0) ? '#ff4757' : '#2ed573';
            ctx.beginPath();
            ctx.arc(bx - 18, by - 22, 2.5, 0, Math.PI * 2);
            ctx.arc(bx - 18, by + 22, 2.5, 0, Math.PI * 2);
            ctx.fill();
          });
        } else if (simPhase === 'DETONATION' || simPhase === 'EXTERMINATED') {
          carpetStrikes.forEach(strike => {
            if (elapsed >= strike.delay) {
              if (!strike.exploded) {
                strike.exploded = true;
                cameraShake = Math.max(cameraShake, 11);
                soundManager.playExplosion();
                for (let p = 0; p < 24; p++) {
                  const ang = Math.random() * Math.PI * 2;
                  const spd = 0.8 + Math.random() * 5.5;
                  spawnParticle(strike.x, strike.y, Math.cos(ang) * spd, Math.sin(ang) * spd, '#ff9f43', 2.5, 0.7, 0.025);
                }
              }

              strike.radius = Math.min(80, strike.radius + 2.4);
              const expGrad = ctx.createRadialGradient(strike.x, strike.y, 0, strike.x, strike.y, strike.radius);
              expGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
              expGrad.addColorStop(0.3, 'rgba(255, 159, 67, 0.85)');
              expGrad.addColorStop(0.7, 'rgba(235, 77, 75, 0.55)');
              expGrad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = expGrad;
              ctx.beginPath();
              ctx.arc(strike.x, strike.y, strike.radius, 0, Math.PI * 2);
              ctx.fill();

              // Cratère noir persistant
              ctx.fillStyle = 'rgba(20, 24, 30, 0.65)';
              ctx.beginPath();
              ctx.arc(strike.x, strike.y, strike.radius * 0.45, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }
      }

      // --- 3. ORBITAL : FAISCEAU IONIQUE PULSAR CYBRONIQUE DU STRATOSPHÈRE ---
      else if (weaponType === 'ORBITAL') {
        if (simPhase === 'APPROACH') {
          // 4 faisceaux de ciblage convergents
          const t = elapsed / 1.8;
          ctx.strokeStyle = 'rgba(0, 206, 201, 0.8)';
          ctx.lineWidth = 2.5;
          const corners = [[0, 0], [w, 0], [0, h], [w, h]];
          corners.forEach(c => {
            ctx.beginPath();
            ctx.moveTo(c[0], c[1]);
            ctx.lineTo(centerX + (Math.random() - 0.5) * 6, centerY + (Math.random() - 0.5) * 6);
            ctx.stroke();
          });

          // Réticule cybernétique rotatif
          ctx.strokeStyle = '#00cec9';
          ctx.lineWidth = 2;
          ctx.strokeRect(centerX - 42, centerY - 42, 84, 84);
          ctx.beginPath();
          ctx.arc(centerX, centerY, 24 + Math.sin(elapsed * 12) * 8, 0, Math.PI * 2);
          ctx.stroke();
        } else if (simPhase === 'DETONATION' || simPhase === 'EXTERMINATED') {
          // Colonne de rayon laser ionique vertical géant
          const beamWidth = Math.max(16, 60 * (1.0 - Math.min(1.0, (elapsed - 1.8) / 2.6)));
          const beamGrad = ctx.createLinearGradient(centerX - beamWidth, 0, centerX + beamWidth, 0);
          beamGrad.addColorStop(0, 'rgba(0, 206, 201, 0.05)');
          beamGrad.addColorStop(0.3, 'rgba(0, 206, 201, 0.95)');
          beamGrad.addColorStop(0.5, '#ffffff');
          beamGrad.addColorStop(0.7, 'rgba(0, 206, 201, 0.95)');
          beamGrad.addColorStop(1, 'rgba(0, 206, 201, 0.05)');
          ctx.fillStyle = beamGrad;
          ctx.fillRect(centerX - beamWidth, 0, beamWidth * 2, h);

          // Anneaux d'ondes de choc EMP bleus
          ctx.strokeStyle = '#00cec9';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(centerX, centerY, shockwaveRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Éclairs électriques EMP branchés
          if (Math.random() < 0.5) empArcs.push(createEmpArc());
          for (let a = empArcs.length - 1; a >= 0; a--) {
            const arc = empArcs[a];
            arc.life -= 0.07;
            if (arc.life <= 0) {
              empArcs.splice(a, 1);
              continue;
            }
            ctx.strokeStyle = `rgba(129, 236, 236, ${arc.life})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(arc.pts[0].x, arc.pts[0].y);
            for (let pt of arc.pts) ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
          }
        }
      }

      // --- 4. BIO : DISPERSION D'AÉROSOL TOXIQUE TURBULENT & CONVULSIONS ---
      else if (weaponType === 'BIO') {
        if (simPhase === 'APPROACH') {
          const t = elapsed / 1.8;
          const dropPositions = [
            [centerX, centerY - 80],
            [centerX + 80, centerY],
            [centerX, centerY + 80],
            [centerX - 80, centerY]
          ];

          dropPositions.forEach(dp => {
            const curY = -30 + (dp[1] - (-30)) * t;
            ctx.fillStyle = '#2ed573';
            ctx.beginPath();
            ctx.arc(dp[0], curY, 8, 0, Math.PI * 2);
            ctx.fill();

            // Parachute en dôme
            ctx.strokeStyle = '#a4b0be';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(dp[0], curY - 14, 12, Math.PI, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(dp[0] - 12, curY - 14);
            ctx.lineTo(dp[0], curY);
            ctx.moveTo(dp[0] + 12, curY - 14);
            ctx.lineTo(dp[0], curY);
            ctx.stroke();
          });
        } else if (simPhase === 'DETONATION' || simPhase === 'EXTERMINATED') {
          bioGasPuffs.forEach(puff => {
            puff.x += puff.vx;
            puff.y += puff.vy;
            puff.radius = Math.min(puff.targetRadius, puff.radius + 0.85);
            puff.opacity = Math.min(0.72, puff.opacity + 0.025);

            const gasGrad = ctx.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.radius);
            gasGrad.addColorStop(0, `rgba(46, 213, 115, ${puff.opacity})`);
            gasGrad.addColorStop(0.5, `rgba(38, 222, 129, ${puff.opacity * 0.75})`);
            gasGrad.addColorStop(0.8, `rgba(16, 172, 132, ${puff.opacity * 0.45})`);
            gasGrad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = gasGrad;
            ctx.beginPath();
            ctx.arc(puff.x, puff.y, puff.radius, 0, Math.PI * 2);
            ctx.fill();
          });

          // Symbole Biohazard pulsant au centre
          const bioScale = 1.0 + Math.sin(elapsed * 9) * 0.18;
          ctx.font = `${Math.round(44 * bioScale)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('☣️', centerX, centerY);
        }
      }

      // Rendu des particules volantes
      for (let i = particles.length - 1; i >= 0; i--) {
        const bp = particles[i];
        bp.x += bp.vx;
        bp.y += bp.vy;
        bp.life -= bp.decay;

        if (bp.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = bp.life / bp.maxLife;
        ctx.fillStyle = bp.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, bp.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Monument central ou crâne d'extermination
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (simPhase === 'EXTERMINATED' || (simPhase === 'DETONATION' && shockwaveRadius > 50)) {
        ctx.fillText('☠️', centerX, centerY);
      } else {
        ctx.fillText(city.countryFlag || '🏛️', centerX, centerY);
      }

      ctx.restore();

      animFrameId = requestAnimationFrame(renderFrame);
    };

    animFrameId = requestAnimationFrame(renderFrame);

    // Handler de clôture définitive
    const handleClose = () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      storage.markCityExterminated(city.id, victimPop);
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.render();
      this.showToastUnlock({ name: `☠️ ${city.name.toUpperCase()} EST DÉSORMAIS EXTERMINÉE ET FERMÉE DÉFINITIVEMENT !` });
    };

    confirmBtn?.addEventListener('click', handleClose);
  }

  triggerCityEntryCinematic(city) {
    if (this.isEnteringCity) return;
    this.isEnteringCity = true;

    // Nettoyer toute transition orpheline préalable
    document.querySelectorAll('.city-entry-transition').forEach(el => el.remove());

    // Effet cinématique fluide d'entrée dans la ville avec monument
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

        <!-- Carte d'Objectif et de Progression Compacte (Épurée & Aérée) -->
        <div class="progress-objective-compact" id="hud-objective-card">
          <div class="objective-header-row">
            <span class="city-target-title" id="hud-city-name">${gameState.selectedCity.isNuclearMission ? '☢️ ' + gameState.selectedCity.name.toUpperCase() : (gameState.selectedCity.emblem || '📍') + ' ' + gameState.selectedCity.name.toUpperCase()}</span>
            <span class="objective-target-pts" id="hud-target-pts">🎯 ${gameState.selectedCity.targetScore.toLocaleString('fr-FR')} PTS</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" id="hud-progress-fill"></div>
            <span class="progress-pct-text" id="hud-progress-pct">0%</span>
          </div>
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

          ${isWeapon ? `
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

        <h3 style="font-size: 0.9rem; font-weight: 800; color: #ced6e0; margin-top: 4px;">CIBLES & VILLES EXTERMINÉES</h3>
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

        <button id="btn-profile-cloud" class="btn-arcade" style="width: 100%; margin-top: 10px; background: linear-gradient(135deg, #4285F4, #34A853); font-size: 0.85rem;">
          ☁️ SAUVEGARDE CLOUD & COMPTE GOOGLE
        </button>

        <button id="btn-close-profile" class="btn-arcade btn-secondary" style="margin-top: 8px;">
          FERMER
        </button>
      </div>
    `;

    overlay.querySelector('#btn-profile-cloud')?.addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.showCloudSaveModal();
    });

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
    const currentCityId = (data.city ? data.city.id : gameState.selectedCity?.id);
    const currentCityObj = CITIES.find(c => c.id === currentCityId) || gameState.selectedCity;
    const isAlreadyExterminated = storage.isCityExterminated(currentCityObj.id);
    const currentIndex = CITIES.findIndex(c => c.id === currentCityId);
    const nextCity = (currentIndex >= 0 && currentIndex < CITIES.length - 1) ? CITIES[currentIndex + 1] : null;
    const isNextUnlocked = nextCity && (storage.isCityUnlocked(nextCity.id) || (data.newlyUnlockedCity && data.newlyUnlockedCity.id === nextCity.id));

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
            <p style="font-size: 0.85rem; margin-top: 4px;">Vous pouvez maintenant explorer <strong>${data.newlyUnlockedCity.name}</strong> !</p>
          </div>
        ` : ''}

        <div class="modal-actions">
          ${!isAlreadyExterminated ? `
            <button id="btn-results-wmd-exterminate" class="btn-arcade btn-wmd-results" style="background: linear-gradient(135deg, #eb4d4b, #b71540); border: 2px solid #ff4757; box-shadow: 0 4px 18px rgba(235, 77, 75, 0.55); font-weight: 900; color: #fff; padding: 12px;">
              💀 EXTERMINER ${currentCityObj.name.toUpperCase()} (ARME DE DESTRUCTION MASSIVE)
            </button>
          ` : ''}
          ${nextCity && isNextUnlocked ? `
            <button id="btn-results-next" class="btn-arcade" style="background: linear-gradient(135deg, #2ed573, #10ac84); font-size: 1.05rem; box-shadow: 0 4px 16px rgba(46, 213, 115, 0.4); border: 2px solid #7bed9f;">
              ▶ ÉTAPE SUIVANTE : ${nextCity.name.toUpperCase()}
            </button>
          ` : ''}
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
      if (data.newlyUnlockedCity) {
        this.selectedMapCity = data.newlyUnlockedCity;
        gameState.selectCity(data.newlyUnlockedCity.id);
      } else if (nextCity && isNextUnlocked) {
        this.selectedMapCity = nextCity;
        gameState.selectCity(nextCity.id);
      }
      this.setScreen('MAP');
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
          <button id="btn-settings-cloud" class="btn-arcade" style="width: 100%; margin-bottom: 10px; background: linear-gradient(135deg, #4285F4, #34A853); font-size: 0.85rem;">
            ☁️ COMPTE GOOGLE & SAUVEGARDE CLOUD
          </button>
          <div style="font-size: 0.78rem; color: #a4b0be; margin-bottom: 8px;">
            Motormageddon Arcade 3D ${FULL_VERSION}<br>
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
            <em>Motormageddon Arcade 3D</em> est une œuvre de fiction d'action satirique, humoristique et parodique.
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
  }

  // --- 12. MODALE COMPTE GOOGLE & SAUVEGARDE CLOUD (GOOGLE PLAY GAMES) ---
  showCloudSaveModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    this.activeModals.push(overlay);

    const account = storage.data.googleAccount || {};
    const isConn = !!account.isConnected;

    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 460px; max-height: 85vh; overflow-y: auto; text-align: left;">
        <div style="display: flex; align-items: center; gap: 10px; border-bottom: 2px solid #4285F4; padding-bottom: 8px; margin-bottom: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
            🎮
          </div>
          <div>
            <h2 style="margin: 0; font-size: 1.3rem; color: #fff; font-weight: 900;">SAUVEGARDE & COMPTE GOOGLE</h2>
            <div style="font-size: 0.75rem; color: #4285F4; font-weight: 800;">GOOGLE PLAY GAMES CLOUD SAVE</div>
          </div>
        </div>

        <!-- État du Compte Google -->
        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid ${isConn ? '#2ed573' : '#4285F4'}; border-radius: 12px; padding: 12px; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">${isConn ? '🟢' : '⚪'}</span>
              <strong style="color: ${isConn ? '#2ed573' : '#a4b0be'}; font-size: 0.9rem;">
                ${isConn ? 'Compte Google Connecté' : 'Aucun Compte Connecté'}
              </strong>
            </div>
            ${isConn ? `<span style="font-size: 0.72rem; color: #fffa65; font-family: monospace;">${account.cloudSaveId || 'GPLAY-SYNC'}</span>` : ''}
          </div>

          ${isConn ? `
            <div style="font-size: 0.82rem; color: #ced6e0; line-height: 1.5; margin-bottom: 10px;">
              👤 <strong>${account.displayName}</strong><br>
              📧 <span style="color: #74b9ff;">${account.email}</span><br>
              ⏱️ Dernière synchronisation cloud : <strong style="color: #2ed573;">${account.lastCloudSync ? new Date(account.lastCloudSync).toLocaleString('fr-FR') : 'À l\'instant'}</strong>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="btn-sync-cloud-now" class="btn-arcade" style="flex: 1; padding: 8px 12px; font-size: 0.82rem; background: linear-gradient(135deg, #4285F4, #34A853);">
                ☁️ SYNCHRONISER CLOUD
              </button>
              <button id="btn-disconnect-google" class="btn-arcade btn-ghost" style="padding: 8px 12px; font-size: 0.82rem;">
                DÉCONNECTER
              </button>
            </div>
          ` : `
            <p style="font-size: 0.8rem; color: #ced6e0; line-height: 1.4; margin-bottom: 12px;">
              Connectez votre compte <strong>Google Play Games</strong> pour sauvegarder automatiquement votre progression, vos scores Worldmageddon, vos véhicules débloqués et vos pièces d'or sur le cloud Google sécurisé.
            </p>
            <button id="btn-connect-google" class="btn-arcade" style="width: 100%; padding: 10px 14px; font-size: 0.9rem; background: #ffffff; color: #2d3436; font-weight: 900; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span style="font-weight: 900; color: #4285F4; font-size: 1.1rem;">G</span> SE CONNECTER AVEC GOOGLE
            </button>
          `}
        </div>

        <!-- Sauvegarde Locale & Export/Import -->
        <h3 style="font-size: 0.88rem; color: #ffd32a; margin: 12px 0 6px 0;">💾 OUTILS DE SAUVEGARDE MANUELLE</h3>
        <div style="display: flex; gap: 8px; margin-bottom: 14px;">
          <button id="btn-export-save" class="btn-arcade btn-secondary" style="flex: 1; padding: 8px; font-size: 0.8rem;">
            📤 EXPORTER (CODE)
          </button>
          <button id="btn-import-save" class="btn-arcade btn-accent" style="flex: 1; padding: 8px; font-size: 0.8rem;">
            📥 IMPORTER
          </button>
        </div>

        <button id="btn-close-cloud-save" class="btn-arcade" style="width: 100%;">
          FERMER
        </button>
      </div>
    `;

    overlay.querySelector('#btn-connect-google')?.addEventListener('click', () => {
      soundManager.playClick();
      storage.connectGoogleAccount('pilote.worldmageddon@gmail.com', 'Commander ' + (storage.data.playerName || 'Worldmageddon'));
      soundManager.playCoin();
      this.showToastUnlock({ name: '✅ Connecté à Google Play Games !' });
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.showCloudSaveModal();
    });

    overlay.querySelector('#btn-disconnect-google')?.addEventListener('click', () => {
      soundManager.playClick();
      storage.disconnectGoogleAccount();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.showCloudSaveModal();
    });

    overlay.querySelector('#btn-sync-cloud-now')?.addEventListener('click', () => {
      soundManager.playClick();
      const res = storage.syncCloudSave();
      if (res.success) {
        soundManager.playCoin();
        this.showToastUnlock({ name: '☁️ Sauvegarde Cloud synchronisée !' });
        overlay.remove();
        this.activeModals = this.activeModals.filter(m => m !== overlay);
        this.showCloudSaveModal();
      }
    });

    overlay.querySelector('#btn-export-save')?.addEventListener('click', () => {
      soundManager.playClick();
      const code = storage.exportSaveString();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
          alert('Code de sauvegarde copié dans le presse-papier !');
        }).catch(() => {
          prompt('Votre code de sauvegarde :', code);
        });
      } else {
        prompt('Votre code de sauvegarde :', code);
      }
    });

    overlay.querySelector('#btn-import-save')?.addEventListener('click', () => {
      soundManager.playClick();
      const code = prompt('Collez votre code de sauvegarde :');
      if (code) {
        const res = storage.importSaveString(code);
        if (res.success) {
          alert('Sauvegarde restaurée avec succès !');
          location.reload();
        } else {
          alert('Erreur : ' + res.reason);
        }
      }
    });

    overlay.querySelector('#btn-close-cloud-save').addEventListener('click', () => {
      soundManager.playClick();
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
    });

    this.root.appendChild(overlay);
  }

  // --- QG EMPIRE TYCOON WORLDMAGEDDON (IDLE ARCADE TYCOON) ---

  showTycoonModal() {
    this.closeActiveModals();
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop interactive';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(10, 12, 18, 0.94);
      backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center;
      z-index: 9999; padding: 14px;
    `;
    this.activeModals.push(overlay);

    const renderTycoonContent = () => {
      const rates = tycoonManager.getTotalRates();
      const currentCoins = storage.data.coins || 0;
      const wmProgress = storage.getWorldmageddonProgress();

      overlay.innerHTML = `
        <div class="modal-card" style="max-width: 520px; width: 100%; max-height: 92vh; overflow-y: auto; background: #151824; border: 2px solid #ffd32a; border-radius: 16px; padding: 16px; color: #fff; box-shadow: 0 0 35px rgba(255, 211, 42, 0.35);">
          <!-- EN-TÊTE DU QG TYCOON -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 211, 42, 0.3); padding-bottom: 10px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.6rem;">🏭</span>
              <div>
                <h2 style="margin: 0; font-size: 1.15rem; color: #ffd32a; font-weight: 900; letter-spacing: 0.5px;">QG EMPIRE WORLDMAGEDDON</h2>
                <span style="font-size: 0.72rem; color: #2ed573; font-weight: 700;">★ PRODUCTION CLANDESTINE ACTIVE (IDLE)</span>
              </div>
            </div>
            <button id="btn-close-tycoon" class="btn-round-action" style="background: rgba(255, 71, 87, 0.2); border-color: #ff4757; color: #ff4757; width: 34px; height: 34px;">✕</button>
          </div>

          <!-- TABLEAU DE BORD DE RENTABILITÉ DOUBLE DEVISE -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div style="background: rgba(30, 39, 46, 0.8); border: 1px solid #ffd32a; border-radius: 10px; padding: 10px; text-align: center;">
              <div style="font-size: 0.72rem; color: #ced6e0; font-weight: 700;">TRÉSORERIE LIQUIDE</div>
              <div style="font-size: 1.25rem; font-weight: 900; color: #ffd32a; margin: 3px 0;">🪙 ${currentCoins.toLocaleString('fr-FR')}</div>
              <div style="font-size: 0.75rem; color: #2ed573; font-weight: 800;">+${rates.cashPerSec.toLocaleString('fr-FR')} $/s</div>
            </div>
            <div style="background: rgba(30, 39, 46, 0.8); border: 1px solid #ff4757; border-radius: 10px; padding: 10px; text-align: center;">
              <div style="font-size: 0.72rem; color: #ced6e0; font-weight: 700;">EXTINCTION MONDIALE</div>
              <div style="font-size: 1.25rem; font-weight: 900; color: #ff4757; margin: 3px 0;">☠️ ${wmProgress.totalKills.toLocaleString('fr-FR')}</div>
              <div style="font-size: 0.75rem; color: #ff6b81; font-weight: 800;">+${rates.killsPerSec.toLocaleString('fr-FR')} cibles/s</div>
            </div>
          </div>

          <!-- SYNERGIE DE COURSE & BONUS ÉTOILES -->
          <div style="background: rgba(0, 206, 201, 0.12); border: 1px dashed #00cec9; border-radius: 8px; padding: 6px 12px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; font-size: 0.76rem;">
            <span style="color: #81ecec;">⭐ Synergie Grand Tour d'Europe :</span>
            <strong style="color: #00cec9; font-weight: 900;">+${rates.starBonusPct}% Rendement Global</strong>
          </div>

          <!-- BOUTON INTERACTIF TURBO BOOST TAP -->
          <div style="position: relative; margin-bottom: 14px;">
            <button id="btn-turbo-boost-tap" class="tycoon-boost-tap-btn">
              <span>⚡</span> <span>TURBO FRAPPE (TAP !)</span> <span style="font-size: 0.82rem; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 6px;">+${Math.max(10, Math.floor(rates.cashPerSec * 2))} 🪙</span>
            </button>
          </div>

          <!-- BOUTONS D'ACCÈS RAPIDE : RECHERCHE R&D -->
          <div style="display: flex; gap: 8px; margin-bottom: 14px;">
            <button id="btn-open-research-modal" class="btn-arcade" style="flex: 1; padding: 8px 12px; font-size: 0.82rem; background: linear-gradient(135deg, #0984e3, #6c5ce7);">
              🔬 ARBRE DE RECHERCHE R&D
            </button>
          </div>

          <!-- LISTE DES 6 INFRASTRUCTURES CLANDESTINES -->
          <h3 style="margin: 0 0 10px 0; font-size: 0.85rem; color: #fffa65; letter-spacing: 0.5px;">🏢 INFRASTRUCTURES D'EXTINCTION GLOBALE</h3>
          <div class="tycoon-buildings-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${TYCOON_BUILDINGS.map(b => {
              const lvl = tycoonManager.getBuildingLevel(b.id);
              const cost = tycoonManager.getUpgradeCost(b.id);
              const bRates = tycoonManager.getBuildingRates(b.id);
              const canAfford = currentCoins >= cost;

              return `
                <div class="tycoon-card" style="background: rgba(26, 32, 44, 0.85); border: 1px solid ${lvl > 0 ? '#ffd32a' : '#4a5568'}; border-radius: 10px; padding: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                    <div style="font-size: 1.8rem; background: rgba(0,0,0,0.3); border-radius: 8px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">${b.icon}</div>
                    <div style="flex: 1;">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <strong style="font-size: 0.85rem; color: ${lvl > 0 ? '#fff' : '#a0aec0'};">${b.name}</strong>
                        <span style="font-size: 0.72rem; color: #ffd32a; font-weight: 800; background: rgba(255, 211, 42, 0.15); padding: 1px 6px; border-radius: 6px;">Niv. ${lvl}</span>
                      </div>
                      <div style="font-size: 0.7rem; color: #a4b0be; margin-top: 2px;">${b.tag}</div>
                      ${lvl > 0 ? `
                        <div style="font-size: 0.72rem; color: #2ed573; font-weight: 700; margin-top: 2px;">
                          +${bRates.cashPerSec.toLocaleString('fr-FR')} $/s • <span style="color: #ff7675;">+${bRates.killsPerSec.toLocaleString('fr-FR')} cibles/s</span>
                        </div>
                      ` : `
                        <div style="font-size: 0.7rem; color: #e17055; font-weight: 700; margin-top: 2px;">Inactif • Acheter pour débloquer</div>
                      `}
                    </div>
                  </div>
                  <button class="btn-arcade btn-upgrade-building" data-b-id="${b.id}" style="padding: 7px 12px; font-size: 0.78rem; min-width: 95px; background: ${canAfford ? 'linear-gradient(135deg, #2ed573, #26de81)' : 'rgba(100, 110, 120, 0.3)'}; color: ${canAfford ? '#fff' : '#888'};" ${canAfford ? '' : 'disabled'}>
                    ${lvl === 0 ? 'DÉBLOQUER' : 'AMÉLIORER'}<br>
                    <span style="font-size: 0.7rem; font-weight: 900;">🪙 ${cost.toLocaleString('fr-FR')}</span>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // Handlers
      overlay.querySelector('#btn-close-tycoon')?.addEventListener('click', () => {
        soundManager.playClick();
        overlay.remove();
        this.activeModals = this.activeModals.filter(m => m !== overlay);
      });

      overlay.querySelector('#btn-open-research-modal')?.addEventListener('click', () => {
        soundManager.playClick();
        this.showResearchModal();
      });

      overlay.querySelectorAll('.btn-upgrade-building').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const bId = e.currentTarget.getAttribute('data-b-id');
          const res = tycoonManager.upgradeBuilding(bId);
          if (res.success) {
            soundManager.playCoin();
            renderTycoonContent();
          }
        });
      });

      // Turbo Boost Tap
      const tapBtn = overlay.querySelector('#btn-turbo-boost-tap');
      if (tapBtn) {
        tapBtn.addEventListener('click', (e) => {
          soundManager.playClick();
          const tapGain = Math.max(10, Math.floor(rates.cashPerSec * 2));
          storage.addCoins(tapGain);
          storage.recordCataclysmKill(Math.max(1, Math.floor(rates.killsPerSec)), 'STREET');

          const floatEl = document.createElement('div');
          floatEl.className = 'floating-cash-text';
          floatEl.textContent = `+${tapGain} 🪙`;
          const rect = tapBtn.getBoundingClientRect();
          floatEl.style.left = `${rect.left + rect.width / 2}px`;
          floatEl.style.top = `${rect.top}px`;
          document.body.appendChild(floatEl);
          setTimeout(() => floatEl.remove(), 850);

          renderTycoonContent();
        });
      }
    };

    renderTycoonContent();
    this.root.appendChild(overlay);
  }

  showResearchModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop interactive';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(10, 12, 18, 0.94);
      backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center;
      z-index: 10000; padding: 14px;
    `;
    this.activeModals.push(overlay);

    const renderResearch = () => {
      const currentCoins = storage.data.coins || 0;
      overlay.innerHTML = `
        <div class="modal-card" style="max-width: 480px; width: 100%; max-height: 88vh; overflow-y: auto; background: #151824; border: 2px solid #00d2d3; border-radius: 16px; padding: 16px; color: #fff;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0, 210, 211, 0.3); padding-bottom: 8px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.5rem;">🔬</span>
              <div>
                <h2 style="margin: 0; font-size: 1.1rem; color: #00d2d3;">ARBRE DE RECHERCHE R&D</h2>
                <span style="font-size: 0.72rem; color: #a4b0be;">🪙 ${currentCoins.toLocaleString('fr-FR')} Pièces disponibles</span>
              </div>
            </div>
            <button id="btn-close-research" class="btn-round-action" style="width: 32px; height: 32px;">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${RESEARCH_NODES.map(node => {
              const unlocked = tycoonManager.isResearchUnlocked(node.id);
              const canAfford = currentCoins >= node.cost;

              return `
                <div style="background: rgba(26, 32, 44, 0.85); border: 1px solid ${unlocked ? '#2ed573' : (canAfford ? '#00d2d3' : '#4a5568')}; border-radius: 10px; padding: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                    <div style="font-size: 1.6rem;">${node.icon}</div>
                    <div>
                      <strong style="font-size: 0.84rem; color: ${unlocked ? '#2ed573' : '#fff'};">${node.name}</strong>
                      <div style="font-size: 0.7rem; color: #a4b0be; margin-top: 2px;">${node.desc}</div>
                    </div>
                  </div>
                  <div>
                    ${unlocked ? `
                      <span style="font-size: 0.75rem; color: #2ed573; font-weight: 900; background: rgba(46, 213, 115, 0.15); padding: 4px 10px; border-radius: 6px;">ACTIVÉ ✅</span>
                    ` : `
                      <button class="btn-arcade btn-buy-research" data-tech-id="${node.id}" style="padding: 6px 12px; font-size: 0.78rem; background: ${canAfford ? 'linear-gradient(135deg, #0984e3, #00cec9)' : 'rgba(100,110,120,0.3)'};" ${canAfford ? '' : 'disabled'}>
                        RECHERCHER<br>
                        <span style="font-size: 0.7rem; font-weight: 900;">🪙 ${node.cost.toLocaleString('fr-FR')}</span>
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      overlay.querySelector('#btn-close-research')?.addEventListener('click', () => {
        soundManager.playClick();
        overlay.remove();
        this.activeModals = this.activeModals.filter(m => m !== overlay);
      });

      overlay.querySelectorAll('.btn-buy-research').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const techId = e.currentTarget.getAttribute('data-tech-id');
          const res = tycoonManager.unlockResearch(techId);
          if (res.success) {
            soundManager.playCoin();
            renderResearch();
          }
        });
      });
    };

    renderResearch();
    this.root.appendChild(overlay);
  }

  showOfflineReportModal(earnings) {
    if (!earnings) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop interactive';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(8, 10, 15, 0.95);
      backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center;
      z-index: 10001; padding: 14px;
    `;
    this.activeModals.push(overlay);

    const minutesAway = Math.max(1, Math.round(earnings.creditedSeconds / 60));

    overlay.innerHTML = `
      <div class="modal-card double-btn-pulse" style="max-width: 440px; width: 100%; background: #151824; border: 2px solid #2ed573; border-radius: 18px; padding: 20px; text-align: center; color: #fff; box-shadow: 0 0 40px rgba(46, 213, 115, 0.4);">
        <div style="font-size: 2.4rem; margin-bottom: 6px;">🛰️</div>
        <div style="font-size: 0.75rem; color: #2ed573; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">TRANSMISSION DU COMMANDEMENT</div>
        <h2 style="font-size: 1.25rem; color: #ffd32a; margin: 4px 0 12px 0;">RAPPORT DE CRISE HORS-LIGNE</h2>
        
        <p style="font-size: 0.82rem; color: #ced6e0; line-height: 1.4; margin-bottom: 14px;">
          Pendant vos <strong>${minutesAway} minutes</strong> d'absence, vos infrastructures clandestines ont continué le sabotage mondial sans relâche :
        </p>

        <div style="background: rgba(30, 39, 46, 0.9); border: 1px solid #ffd32a; border-radius: 12px; padding: 12px; margin-bottom: 16px;">
          <div style="font-size: 1.5rem; font-weight: 900; color: #ffd32a;">+${earnings.cashEarned.toLocaleString('fr-FR')} 🪙</div>
          <div style="font-size: 0.75rem; color: #a4b0be; margin-bottom: 8px;">Crédits Noirs récoltés</div>
          <div style="font-size: 1.35rem; font-weight: 900; color: #ff4757;">+${earnings.killsEarned.toLocaleString('fr-FR')} ☠️</div>
          <div style="font-size: 0.75rem; color: #a4b0be;">Cibles mondiales anéanties</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button id="btn-offline-double" class="btn-arcade double-btn-pulse" style="width: 100%; padding: 12px; font-size: 0.92rem; background: linear-gradient(135deg, #ffd32a, #ff9f43); color: #1e272e; font-weight: 900;">
            🎬 DOUBLER X2 LE BUTIN (SPONSOR)
          </button>
          <button id="btn-offline-collect" class="btn-arcade" style="width: 100%; padding: 10px; font-size: 0.82rem; background: #2ed573; color: #fff;">
            💰 RÉCOLTER (1X)
          </button>
        </div>
      </div>
    `;

    overlay.querySelector('#btn-offline-collect')?.addEventListener('click', () => {
      soundManager.playCoin();
      tycoonManager.collectOfflineEarnings(earnings, false);
      overlay.remove();
      this.activeModals = this.activeModals.filter(m => m !== overlay);
      this.showToastUnlock({ name: `💰 +${earnings.cashEarned} Pièces encaissées !` });
    });

    overlay.querySelector('#btn-offline-double')?.addEventListener('click', () => {
      soundManager.playClick();
      adManager.showRewardedAd(() => {
        soundManager.playCoin();
        tycoonManager.collectOfflineEarnings(earnings, true);
        overlay.remove();
        this.activeModals = this.activeModals.filter(m => m !== overlay);
        this.showToastUnlock({ name: `🔥 DOUBLÉ : +${earnings.cashEarned * 2} Pièces & +${earnings.killsEarned * 2} Cibles !` });
      });
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

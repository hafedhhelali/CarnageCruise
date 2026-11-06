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
          <button id="btn-splash-nuclear" class="btn-arcade btn-nuclear-launch btn-touch-target">
            <span class="btn-icon">☢️</span>
            <span class="btn-label">ÉPREUVES NUCLÉAIRES</span>
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

    splash.querySelector('#btn-splash-nuclear').addEventListener('click', () => {
      soundManager.playClick('nuclear');
      soundManager.resumeContext();
      const nuc = CITIES.find(c => c.isNuclearMission);
      if (nuc) {
        gameState.selectCity(nuc.id);
        this.selectedMapCity = nuc;
      }
      this.setScreen('MAP');
    });

    splash.querySelector('#btn-splash-garage').addEventListener('click', () => {
      soundManager.playClick('garage');
      this.previousScreen = 'SPLASH';
      this.setScreen('GARAGE');
    });

    splash.querySelector('#btn-splash-quick-garage').addEventListener('click', () => {
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

      <!-- BANDEAU HAUT-DE-GAMME WORLDMAGEDDON : EXTERMINATION MONDIALE -->
      <div class="worldmageddon-header-bar clickable" id="btn-open-worldmageddon" style="cursor: pointer; background: linear-gradient(90deg, #1e272e, #2d3436, #1e272e); border-bottom: 2px solid #ff4757; padding: 7px 12px; display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; font-weight: 800; color: #ffffff; z-index: 10;">
        <span style="color: #ff4757; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.1rem;">💀</span>
          <strong>WORLDMAGEDDON</strong>
          <span style="font-size: 0.72rem; color: #badc58; background: rgba(186, 220, 88, 0.15); border: 1px solid #badc58; padding: 1px 6px; border-radius: 6px;">${wmProgress.rank}</span>
        </span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #fffa65; font-family: monospace; font-size: 0.85rem;">
            ${wmProgress.totalKills.toLocaleString('fr-FR')} <span style="font-size: 0.7rem; color: #a4b0be;">/ 8Mds</span>
          </span>
          <span style="font-size: 0.72rem; color: #ff7675; font-weight: 900;">${wmProgress.percentage}%</span>
          <span style="font-size: 0.75rem; color: #74b9ff;">📊 DOSSIER ▶</span>
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
          <button id="btn-filter-nuclear" class="btn-nuclear-shortcut" title="Voir les Centrales Nucléaires">☢️ NUCLÉAIRE</button>
          <button id="btn-filter-dam" class="btn-nuclear-shortcut" style="background: rgba(0, 206, 201, 0.25); border-color: #00cec9; color: #00cec9;" title="Voir les Barrages & Déluges">🌊 BARRAGE</button>
          <button id="btn-filter-mountain" class="btn-nuclear-shortcut" style="background: rgba(254, 202, 87, 0.25); border-color: #feca57; color: #feca57;" title="Voir les Éboulements de Montagne">🏔️ MONTAGNE</button>
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
          <div class="moto-traveler" id="moto-traveler" style="left: ${this.selectedMapCity ? this.selectedMapCity.mapCoords.x : 44.8}%; top: ${this.selectedMapCity ? this.selectedMapCity.mapCoords.y : 40.2}%;">
            <div class="moto-traveler-icon">🏍️</div>
            <div class="moto-traveler-exhaust">💨</div>
          </div>

          <!-- Pins interactifs des 20 villes d'Europe et Méditerranée avec médaillons 3D et drapeaux -->
          ${CITIES.map((city, idx) => {
            const unlocked = storage.isCityUnlocked(city.id);
            const isSelected = this.selectedMapCity.id === city.id;
            const isNuclear = !!city.isNuclearMission;

            return `
              <div class="city-pin ${unlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''} ${isNuclear ? 'nuclear-pin' : ''}"
                   data-city-id="${city.id}"
                   style="left: ${city.mapCoords.x}%; top: ${city.mapCoords.y}%;">
                <div class="city-pulse-ring"></div>
                <div class="city-pin-dot">
                  <span class="pin-badge-idx">${isNuclear ? '☢️' : (idx + 1)}</span>
                  <span class="pin-emblem-icon">${unlocked ? (isNuclear ? '☣️' : (city.countryFlag || city.emblem || '★')) : '🔒'}</span>
                </div>
                <div class="city-pin-label">
                  ${city.name}
                </div>
                ${isSelected ? '<div class="city-pin-enter-pill">▶ ENTRER</div>' : ''}
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

    mapScreen.querySelector('#btn-open-worldmageddon')?.addEventListener('click', () => {
      soundManager.playClick();
      this.showWorldmageddonModal();
    });

    let nucCycleIdx = 0;
    mapScreen.querySelector('#btn-filter-nuclear')?.addEventListener('click', () => {
      const nuclearCities = CITIES.filter(c => c.isNuclearMission || c.disasterType === 'NUCLEAR');
      if (nuclearCities.length > 0) {
        const nextNuc = nuclearCities[nucCycleIdx % nuclearCities.length];
        nucCycleIdx++;
        this.selectedMapCity = nextNuc;
        gameState.selectCity(nextNuc.id);
        this.updateCityDetail(mapScreen.querySelector('#city-detail'));
        centerOnCity(nextNuc, true);
        soundManager.playGeigerClick();
      }
    });

    let damCycleIdx = 0;
    mapScreen.querySelector('#btn-filter-dam')?.addEventListener('click', () => {
      const damCities = CITIES.filter(c => c.isDamMission || c.disasterType === 'DAM');
      if (damCities.length > 0) {
        const nextDam = damCities[damCycleIdx % damCities.length];
        damCycleIdx++;
        this.selectedMapCity = nextDam;
        gameState.selectCity(nextDam.id);
        this.updateCityDetail(mapScreen.querySelector('#city-detail'));
        centerOnCity(nextDam, true);
        soundManager.playWaterRush();
      }
    });

    let mtnCycleIdx = 0;
    mapScreen.querySelector('#btn-filter-mountain')?.addEventListener('click', () => {
      const mtnCities = CITIES.filter(c => c.isMountainMission || c.disasterType === 'MOUNTAIN');
      if (mtnCities.length > 0) {
        const nextMtn = mtnCities[mtnCycleIdx % mtnCities.length];
        mtnCycleIdx++;
        this.selectedMapCity = nextMtn;
        gameState.selectCity(nextMtn.id);
        this.updateCityDetail(mapScreen.querySelector('#city-detail'));
        centerOnCity(nextMtn, true);
        soundManager.playRockAvalanche();
      }
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
      pins.forEach(p => {
        const isCurrent = p.getAttribute('data-city-id') === cityId;
        p.classList.toggle('selected', isCurrent);
        const existingPill = p.querySelector('.city-pin-enter-pill');
        if (isCurrent && !existingPill) {
          const pill = document.createElement('div');
          pill.className = 'city-pin-enter-pill';
          pill.textContent = '▶ ENTRER';
          p.appendChild(pill);
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

    const handleCityAction = (cityId) => {
      const city = CITIES.find(c => c.id === cityId);
      if (!city) return;

      const isAlreadySelected = (this.selectedMapCity && this.selectedMapCity.id === cityId);

      if (isAlreadySelected) {
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
    const city = this.selectedMapCity;
    const stageIndex = CITIES.findIndex(c => c.id === city.id) + 1;
    const unlocked = storage.isCityUnlocked(city.id);
    const cityData = storage.getCityData(city.id);

    const starsHtml = '★'.repeat(cityData.stars) + '☆'.repeat(3 - cityData.stars);

    const dType = city.disasterType || (city.isNuclearMission ? 'NUCLEAR' : (city.isDamMission ? 'DAM' : (city.isMountainMission ? 'MOUNTAIN' : 'STREET')));
    let disasterBadge = '';
    if (dType === 'NUCLEAR') {
      disasterBadge = `<span style="background: rgba(46, 213, 115, 0.2); border: 1px solid #2ed573; color: #2ed573; font-size: 0.75rem; padding: 2px 8px; border-radius: 8px; font-weight: 800;">☢️ CATACLYSME : RÉACTEUR NUCLÉAIRE</span>`;
    } else if (dType === 'DAM') {
      disasterBadge = `<span style="background: rgba(0, 206, 201, 0.2); border: 1px solid #00cec9; color: #00cec9; font-size: 0.75rem; padding: 2px 8px; border-radius: 8px; font-weight: 800;">🌊 CATACLYSME : RUPTURE DE BARRAGE & DÉLUGE</span>`;
    } else if (dType === 'MOUNTAIN') {
      disasterBadge = `<span style="background: rgba(254, 202, 87, 0.2); border: 1px solid #feca57; color: #feca57; font-size: 0.75rem; padding: 2px 8px; border-radius: 8px; font-weight: 800;">🏔️ CATACLYSME : ÉBOULEMENT DE MONTAGNE</span>`;
    } else {
      disasterBadge = `<span style="background: rgba(255, 71, 87, 0.2); border: 1px solid #ff4757; color: #ff4757; font-size: 0.75rem; padding: 2px 8px; border-radius: 8px; font-weight: 800;">🩸 EXTERMINATION : CARNAGE DE RUE</span>`;
    }

    detailCard.innerHTML = `
      <div class="city-detail-header clickable" id="btn-detail-header-launch" style="cursor: pointer;" title="Appuyez pour lancer la course">
        <div>
          <span class="city-detail-name">${city.countryFlag || ''} ${city.name}</span>
          <div style="margin: 3px 0;">${disasterBadge}</div>
          <span class="city-tag">ÉTAPE ${stageIndex} / ${CITIES.length} • ${city.country || 'Europe'}</span>
          <div style="font-size: 0.82rem; color: #fffa65; font-weight: 800; margin-top: 3px;">
            🏛️ Monument : <strong>${city.monument || 'Monument Historique'}</strong>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">${city.subtitle}</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          <div class="city-stars">${starsHtml}</div>
          ${unlocked ? '<span style="font-size: 0.72rem; color: #2ed573; font-weight: 800; background: rgba(46, 213, 115, 0.15); padding: 2px 6px; border-radius: 6px;">▶ JOUER</span>' : ''}
        </div>
      </div>

      <p class="city-description">${city.description}</p>

      <div class="city-target-info">
        <span>🏆 Record : <strong>${cityData.bestScore} pts</strong></span>
        <span>💀 Pertes Monde : <strong style="color: #fffa65;">+${(city.exterminationTarget || 35000).toLocaleString('fr-FR')} Humains</strong></span>
      </div>

      <div class="city-detail-actions">
        ${unlocked ? `
          <button id="btn-launch-city" class="btn-arcade btn-play-pulse btn-action-launch">
            <span>▶ ENTRER DANS ${city.name.toUpperCase()} (LANCER LA COURSE)</span>
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
      const launchRun = () => {
        soundManager.playClick();
        gameState.selectCity(city.id);
        this.triggerCityEntryCinematic(city);
      };

      const launchBtn = detailCard.querySelector('#btn-launch-city');
      if (launchBtn) launchBtn.addEventListener('click', launchRun);

      const headerBtn = detailCard.querySelector('#btn-detail-header-launch');
      if (headerBtn) headerBtn.addEventListener('click', launchRun);
    }
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

          <!-- Bouton d'Attaque / Frappe / Tir / Klaxon (pouce droit) -->
          <button class="btn-horn-pedal ${isWeapon ? 'btn-attack-pedal' : ''}" id="btn-hud-horn" title="${actionTitle}">
            <span class="horn-icon">${actionIcon}</span>
            <span class="horn-label">${actionLabel}</span>
          </button>
        </div>
      </div>

      <div class="touch-hint auto-fade" id="hud-touch-hint">
        ← Glissez pour braquer | FREIN pour stopper | ${isWeapon ? `${actionIcon} ${actionLabel} pour FRAPPER !` : '📢 KLAXON'} | ⚡ NITRO →
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
    const flash = document.createElement('div');
    flash.className = 'hud-carnage-flash';
    this.root.appendChild(flash);
    setTimeout(() => {
      try { flash.remove(); } catch (e) {}
    }, 380);
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

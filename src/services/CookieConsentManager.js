/**
 * Carnage Cruise - Gestionnaire de Consentement Cookies & Google Ads (RGPD, ePrivacy & Google CMP)
 * Conforme à la politique de consentement de l'Union Européenne (Google EU User Consent Policy)
 * et support complet de Google Consent Mode v2.
 */

import { soundManager } from '../audio/SoundManager.js';

const PRIMARY_STORAGE_KEY = 'carnage_cruise_cookie_consent_v1';
const LEGACY_STORAGE_KEY = 'motormageddon_cookie_consent_v1';

export class CookieConsentManager {
  constructor() {
    this.consent = this.loadConsent();
    this.initGoogleConsentModeDefaults();
  }

  loadConsent() {
    try {
      let stored = localStorage.getItem(PRIMARY_STORAGE_KEY);
      if (!stored) {
        stored = localStorage.getItem(LEGACY_STORAGE_KEY);
      }
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Erreur lecture consentement cookie', e);
    }
    return null;
  }

  saveConsent(consentObj) {
    this.consent = {
      ...consentObj,
      timestamp: new Date().toISOString()
    };
    try {
      localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(this.consent));
    } catch (e) {}

    this.applyConsentToGoogle(this.consent);
  }

  hasAnswered() {
    return this.consent !== null;
  }

  isAdsConsentGranted() {
    return this.consent && this.consent.ads === true;
  }

  isAnalyticsConsentGranted() {
    return this.consent && this.consent.analytics === true;
  }

  /**
   * Initialise les paramètres par défaut de Google Consent Mode v2 (Denied par défaut avant choix)
   */
  initGoogleConsentModeDefaults() {
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = window.gtag || gtag;

    if (!this.hasAnswered()) {
      window.gtag('consent', 'default', {
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied',
        'analytics_storage': 'denied',
        'wait_for_update': 500
      });
    } else {
      this.applyConsentToGoogle(this.consent);
    }
  }

  /**
   * Met à jour dynamiquement Google Consent Mode v2 selon le choix de l'utilisateur
   */
  applyConsentToGoogle(consent) {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'ad_storage': consent.ads ? 'granted' : 'denied',
        'ad_user_data': consent.ads ? 'granted' : 'denied',
        'ad_personalization': consent.ads ? 'granted' : 'denied',
        'analytics_storage': consent.analytics ? 'granted' : 'denied'
      });
    }

    // Si le consentement aux publicités est accordé, initialiser le script Google Adsense s'il n'est pas déjà injecté
    if (consent.ads) {
      this.injectGoogleAdsScript();
    }
  }

  /**
   * Injection sécurisée du SDK Google Ads / AdSense
   */
  injectGoogleAdsScript(publisherId = 'ca-pub-0000000000000000') {
    if (document.getElementById('google-adsense-script')) return;

    try {
      const script = document.createElement('script');
      script.id = 'google-adsense-script';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
      document.head.appendChild(script);
    } catch (e) {
      console.warn('Impossible d’injecter le script Google Ads', e);
    }
  }

  /**
   * Affiche la modale de consentement aux cookies et publicités Google Ads
   * @param {boolean} isManual - true si ouvert depuis les options/paramètres
   */
  showConsentModal(isManual = false, onComplete = null) {
    const existing = document.getElementById('cookie-consent-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'cookie-consent-modal';
    overlay.className = 'modal-overlay cookie-consent-overlay';

    overlay.innerHTML = `
      <div class="modal-card cookie-modal-card">
        <div class="cookie-modal-header">
          <span class="cookie-icon">🍪</span>
          <h2 class="modal-title" style="margin: 0; font-size: 1.25rem;">COOKIES & PUBLICITÉS GOOGLE</h2>
        </div>

        <p class="cookie-text">
          Nous respectons votre vie privée. Carnage Cruise utilise des cookies et le stockage local strictement nécessaires 
          au bon fonctionnement du jeu (sauvegarde de vos bolides, records, et progression de course). 
          Avec votre accord, nous et nos partenaires tiers (notamment <strong>Google Ads & AdSense</strong>) utilisons également des 
          cookies et identifiants publicitaires pour mesurer l'audience et diffuser des publicités adaptées permettant de vous offrir 
          des récompenses gratuites (+20 Pièces d'or, recharges Nitro).
        </p>

        <div class="cookie-toggles-container" id="cookie-custom-panel" style="display: none;">
          <div class="cookie-toggle-row">
            <div class="cookie-toggle-label">
              <strong>Cookies Essentiels (Sauvegarde & Jeu)</strong>
              <small>Nécessaires pour mémoriser votre progression, motos et scores (non désactivable).</small>
            </div>
            <span class="cookie-badge-mandatory">OBLIGATOIRE</span>
          </div>

          <div class="cookie-toggle-row">
            <div class="cookie-toggle-label">
              <strong>Publicités Google & Mesure d'Audience</strong>
              <small>Permet la personnalisation des annonces Google Ads et la rétribution de récompenses.</small>
            </div>
            <label class="cookie-switch">
              <input type="checkbox" id="chk-cookie-ads" checked>
              <span class="cookie-slider"></span>
            </label>
          </div>
        </div>

        <div class="cookie-actions-row">
          <button id="btn-cookie-accept-all" class="btn-arcade btn-primary">
            TOUT ACCEPTER
          </button>
          <button id="btn-cookie-refuse-non-essential" class="btn-arcade btn-ghost">
            REFUSER LES NON-ESSENTIELS
          </button>
          <button id="btn-cookie-customize" class="btn-legal-link" style="margin-top: 6px;">
            ⚙️ Personnaliser mes choix
          </button>
        </div>

        <div class="cookie-footer-legal">
          Conformité RGPD, ePrivacy & Google EU User Consent Policy. 
          Vous pouvez modifier vos choix à tout moment dans le menu <strong>OPTIONS</strong>.
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const customPanel = overlay.querySelector('#cookie-custom-panel');
    const chkAds = overlay.querySelector('#chk-cookie-ads');
    const btnCustomize = overlay.querySelector('#btn-cookie-customize');

    btnCustomize.addEventListener('click', () => {
      soundManager.playClick();
      if (customPanel.style.display === 'none') {
        customPanel.style.display = 'block';
        btnCustomize.textContent = '▲ Masquer les détails';
      } else {
        customPanel.style.display = 'none';
        btnCustomize.textContent = '⚙️ Personnaliser mes choix';
      }
    });

    const closeAndFinish = (consentChoice) => {
      soundManager.playClick();
      this.saveConsent(consentChoice);
      overlay.remove();
      if (onComplete) onComplete(consentChoice);
    };

    overlay.querySelector('#btn-cookie-accept-all').addEventListener('click', () => {
      closeAndFinish({ essential: true, ads: true, analytics: true });
    });

    overlay.querySelector('#btn-cookie-refuse-non-essential').addEventListener('click', () => {
      closeAndFinish({ essential: true, ads: false, analytics: false });
    });

    // Si panneau personnalisé ouvert, le bouton tout accepter prend en compte la case cochée
    chkAds.addEventListener('change', () => {
      const isChecked = chkAds.checked;
      overlay.querySelector('#btn-cookie-accept-all').textContent = isChecked ? 'VALIDER MES CHOIX' : 'ENREGISTRER';
    });
  }
}

export const cookieConsentManager = new CookieConsentManager();

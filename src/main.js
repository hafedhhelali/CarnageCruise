/**
 * Carnage Cruise - Point d'Entrée Principal du Jeu
 * Intégration du moteur 3D, physique de conduite avec virages, feux et carrefours,
 * freinage complet avec arrêt/reprise, collisions burlesques et célébration d'arrivée.
 */

import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { gameState, CITIES } from './core/GameState.js';
import { storage } from './core/Storage.js';
import { dailyMissions, loginStreak } from './core/DailyMissions.js';
import { soundManager } from './audio/SoundManager.js';
import { Bike } from './entities/Bike.js';
import { CharacterSystem } from './entities/Characters.js';
import { Environment } from './entities/Environment.js';
import { ParticleSystem } from './entities/Particles.js';
import { IntersectionManager } from './entities/Intersections.js';
import { ProjectileManager } from './entities/Projectiles.js';
import { Traffic } from './entities/Traffic.js';
import { PigeonSystem } from './entities/Pigeons.js';
import { SkidMarks } from './gfx/SkidMarks.js';
import { WeatherSystem } from './gfx/WeatherSystem.js';
import { modelBank } from './gfx/ModelBank.js';
import { UIManager } from './ui/UIManager.js';
import { Haptic } from './services/HapticFeedback.js';
import * as TWEEN from '@tweenjs/tween.js';
import './ui/style.css';

class GameApp {
  constructor() {
    try {
      this.canvas = document.getElementById('webgl-canvas');
      this.uiRoot = document.getElementById('ui-root');

      if (!this.canvas) {
        throw new Error('Canvas #webgl-canvas not found in DOM');
      }

      // 1. Initialiser le moteur 3D
      this.engine = new Engine(this.canvas);
      modelBank.preloadAll();

    // 2. Initialiser les entités
    this.bike = new Bike(this.engine.scene);
    this.characters = new CharacterSystem(this.engine.scene);
    this.environment = new Environment(this.engine.scene);
    this.particles = new ParticleSystem(this.engine.scene);
    this.traffic = new Traffic(this.engine.scene, this.particles);
    this.pigeons = new PigeonSystem(this.engine.scene);
    this.intersections = new IntersectionManager(this.engine.scene);
    this.projectiles = new ProjectileManager(this.engine.scene, this.particles, soundManager, this.engine);
    this.skidMarks = new SkidMarks(this.engine.scene);
    this.weatherSystem = new WeatherSystem(this.engine.scene);
    this._bossRamCooldown = 0;
    this._stormLightningTimer = 6.0;

    // Abonnement des missions quotidiennes aux événements de jeu
    gameState.subscribe((event, payload) => {
      try {
        if (event === 'kill_updated') dailyMissions.onKill();
        if (event === 'score_updated' && payload) {
          if (payload.combo) dailyMissions.onBestCombo(payload.combo);
          if (payload.itemType === 'near_miss') dailyMissions.onNearMiss();
          if (payload.coinsEarned) dailyMissions.onCoins(payload.coinsEarned);
        }
        if (event === 'nitro_activated') dailyMissions.onNitro();
        if (event === 'run_ended' && payload) {
          dailyMissions.onRunComplete();
          dailyMissions.onCoins(payload.coinsEarned || 0);
          dailyMissions.onBestCombo(payload.maxCombo || 0);
          dailyMissions.onDistance(payload.distance || 0);
          dailyMissions.onKillStreak(payload.kills || 0);
        }
      } catch (e) {
        console.error('[App] dailyMissions event error:', e);
      }
    });

    // 3. État des contrôles et de la course
    this.steerInput = 0;
    this.touchStartX = null;
    this.isPointerDown = false;
    this.keys = { left: false, right: false, brake: false };
    this.hasCrossedFinish = false;

    // 4. Initialiser l'interface utilisateur
    this.ui = new UIManager(this.uiRoot, (action, payload) => this.handleUIAction(action, payload));

    // Claim automatique du calendrier de connexion au lancement
    try {
      if (loginStreak.canClaim()) {
        const reward = loginStreak.claim();
        if (reward && this.ui) {
          this.ui.showToastUnlock({ name: `🎁 JOUR ${reward.day}/7 : +${reward.coins} PIÈCES D'OR !` });
        }
      }
    } catch (e) {
      console.warn('[App] loginStreak error:', e);
    }

    // 5. Configurer la première ville
    this.setupCity(gameState.selectedCity);

    // 6. Connecter les entrées tactiles et clavier
    this.bindInputEvents();
    this._applyStoredSettings();

    // 7. Horloge d'animation Three.js & vecteurs réutilisables (zéro allocation par frame)
    this.clock = new THREE.Clock();
    this._tmpPos = new THREE.Vector3();
    this._tmpDir = new THREE.Vector3(0, 0.65, -1);
    this._boundLoop = this.loop.bind(this);

    // Démarrer la boucle principale à 60 FPS
    requestAnimationFrame(this._boundLoop);

    // Poignée de débogage (dev) : inspection du pipeline de rendu dans la console
    window.__mm = { app: this, engine: this.engine, sound: soundManager };
    } catch (e) {
      console.error('[CarnageCruise] Constructor error:', e);
    }
  }

  _applyStoredSettings() {
    const s = storage.data.settings || {};
    if (this.engine && this.engine.applyQualitySettings) {
      this.engine.applyQualitySettings(s.graphicsQuality || 'AUTO', s.cameraShake !== false);
    }
    if (this.particles && this.particles.setQualityTier && this.engine) {
      this.particles.setQualityTier(this.engine.perfTier || 0);
    }
    if (this.weatherSystem && this.weatherSystem.setQualityFactor) {
      const q = s.graphicsQuality === 'ECO' ? 0.3 : (s.graphicsQuality === 'HIGH' ? 1.0 : 1.0);
      this.weatherSystem.setQualityFactor(q);
    }
  }

  setupCity(cityDef) {
    if (gameState.isRuinsMode) {
      this.isNightRun = false;
      this.engine.applyRuinsAtmosphere();
      if (this.environment.setNightMode) this.environment.setNightMode(false);
      if (this.bike.setNightMode) this.bike.setNightMode(false);
      if (this.traffic && this.traffic.setNightMode) this.traffic.setNightMode(false);
      if (this.environment.setChallengeMode) this.environment.setChallengeMode('STANDARD');
      if (this.weatherSystem && this.weatherSystem.setBiome) {
        const weatherInfo = this.weatherSystem.setBiome(cityDef, true, false, false);
        if (this.environment.setWeatherWetness && weatherInfo) {
          this.environment.setWeatherWetness(weatherInfo.wetness);
        }
        if (this.characters && this.characters.setRainMode) {
          this.characters.setRainMode(false);
        }
      }
      this.environment.setCity(cityDef, null, true);
      this.characters.reset();
      if (this.traffic) this.traffic.reset();
      if (this.projectiles) this.projectiles.reset();
      this.intersections.reset();
      return;
    }

    const presets = ['DAY_CLEAR', 'GOLDEN_DUSK', 'OVERCAST_WET', 'NIGHT_NEON'];
    let preset = presets[Math.floor(Math.random() * presets.length)];
    if (gameState.challengeMode === 'EXTREME_STORM') {
      preset = Math.random() < 0.5 ? 'OVERCAST_WET' : 'NIGHT_NEON';
    }
    this.isNightRun = preset === 'NIGHT_NEON';

    if (this.engine.applyAtmospherePreset) {
      this.engine.applyAtmospherePreset(cityDef, preset);
    } else {
      this.engine.applyCityAtmosphere(cityDef);
      this.engine.applyNightAtmosphere(this.isNightRun);
    }

    if (this.environment.setNightMode) this.environment.setNightMode(this.isNightRun);
    if (this.bike.setNightMode) this.bike.setNightMode(this.isNightRun);
    if (this.traffic && this.traffic.setNightMode) this.traffic.setNightMode(this.isNightRun);

    if (this.weatherSystem && this.weatherSystem.setBiome) {
      const weatherInfo = this.weatherSystem.setBiome(
        cityDef,
        false,
        this.isNightRun,
        gameState.challengeMode === 'EXTREME_STORM'
      );
      if (this.environment.setWeatherWetness && weatherInfo) {
        this.environment.setWeatherWetness(weatherInfo.wetness);
      }
      if (this.characters && this.characters.setRainMode) {
        this.characters.setRainMode(weatherInfo?.type === 'RAIN');
      }
    }
    if (this.environment.setChallengeMode) {
      this.environment.setChallengeMode(gameState.challengeMode || 'STANDARD');
    }

    this.environment.setCity(cityDef, null, false);
    this.characters.reset();
    if (this.traffic) this.traffic.reset();
    if (this.projectiles) this.projectiles.reset();
    this.intersections.reset();
  }

  bindInputEvents() {
    // --- CONTRÔLES TACTILES MOBILES (TOUCH & POINTER) ---
    window.addEventListener('pointerdown', (e) => {
      soundManager.resumeContext();
      // Ne pas relancer la musique si l'utilisateur appuie sur le bouton Son de l'accueil
      if (!e.target.closest('#btn-splash-audio') && !soundManager.isMutedMusic && storage.data.settings.music && !soundManager.musicPlaying && (gameState.currentMode === 'SPLASH' || gameState.currentMode === 'MAP' || gameState.currentMode === 'GARAGE')) {
        soundManager.startMusic('MENU');
      }

      // Ignorer la conduite si clic sur une interface interactive ou bouton
      if (e.target.closest('.interactive') || e.target.closest('button')) return;
      if ((storage.data.settings?.controlMode || 'swipe') === 'buttons') return;

      this.isPointerDown = true;
      this._steerPointerId = e.pointerId;
      this.touchStartX = e.clientX;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown || gameState.currentMode !== 'PLAYING') return;
      if (this._steerPointerId !== null && e.pointerId !== this._steerPointerId) return;
      if (gameState.isBraking) {
        this.steerInput = 0;
        return;
      }

      const deltaX = e.clientX - this.touchStartX;
      if (Math.abs(deltaX) < 3.5) {
        this.steerInput = 0;
        return;
      }
      // Sensibilité directionnelle droite/gauche rehaussée et optimisée mobile (~+50% de réactivité)
      const settingMode = storage.data.settings?.steerSensitivity || 'DYNAMIC';
      const sensitivityMultiplier = settingMode === 'HIGH' ? 1.35 : (settingMode === 'NORMAL' ? 0.95 : 1.18);
      const baseSensitivity = 0.0068; // Réponse instantanée au pouce sans dépasser le bord d'écran
      const sensitivity = baseSensitivity * sensitivityMultiplier;
      this.steerInput = Math.max(-1.0, Math.min(1.0, deltaX * sensitivity));
    });

    const endPointer = (e) => {
      if (this._steerPointerId !== null && e && e.pointerId !== this._steerPointerId) return;
      this.isPointerDown = false;
      this._steerPointerId = null;
      this.touchStartX = null;
      this.steerInput = 0;
    };

    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);

    // --- CONTRÔLES CLAVIER (TEST & DESKTOP) ---
    window.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyQ') {
        this.keys.left = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.keys.right = true;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.keys.brake = true;
        gameState.setBraking(true);
      } else if (e.code === 'KeyF' || e.code === 'KeyX' || e.code === 'KeyE' || e.code === 'ControlLeft' || e.code === 'ControlRight') {
        this.executePlayerAttack();
      } else if (e.code === 'Space' || e.code === 'KeyN' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        const activated = gameState.activateNitro();
        if (!activated) {
          this.executePlayerAttack();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyQ') {
        this.keys.left = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.keys.right = false;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.keys.brake = false;
        gameState.setBraking(false);
      }
    });
  }

  handleUIAction(action, payload) {
    try {
      if (action === 'START_RUN') {
        const city = (payload && payload.city) ? payload.city : (payload || gameState.selectedCity);
        const challengeMode = (payload && payload.challengeMode) || gameState.challengeMode || 'STANDARD';
        if (city && city.id) {
          gameState.selectCity(city.id);
        }
        gameState.challengeMode = gameState.isRuinsMode ? 'STANDARD' : challengeMode;

        // Équipement et reconstruction immédiate de l'engin sélectionné
        if (this.bike.reset) this.bike.reset();
        this.keys.left = false;
        this.keys.right = false;
        this.steerInput = 0;
        this.isPointerDown = false;
        this._pursuitSpawnTimer = 0;
        this._policeHitCooldown = 0;
        const equippedBikeId = gameState.selectedBike?.id || storage.getEquippedBike() || 'tank';
        this.bike.buildCurrentBike(equippedBikeId);

        if (this.skidMarks && this.skidMarks.reset) this.skidMarks.reset();
        if (this.weatherSystem && this.weatherSystem.reset) this.weatherSystem.reset();
        this._bossRamCooldown = 0;
        this._stormLightningTimer = 6.0;

        this.setupCity(gameState.selectedCity);

        if (this.bike && this.bike.mesh) {
          this.bike.mesh.position.set(0, 0, 0);
          this.bike.mesh.rotation.set(0, 0, 0);
        }
        this.bike.x = 0;
        this.bike.z = 0;
        this.bike.jumpAltitude = 0;
        this.bike.jumpVelocity = 0;
        this.bike.pitchAngle = 0;
        this.bike.isCrashed = false;
        this.bike.crashTimer = 0;
        this.hasCrossedFinish = false;

        if (this.characters) this.characters.reset();
        if (this.pigeons) this.pigeons.reset(0);
        if (this.intersections) this.intersections.reset();
        if (this.particles) this.particles.reset();

        this.policePursuitActive = (gameState.challengeMode === 'POLICE_PURSUIT') && !(gameState.selectedBike && gameState.selectedBike.isFlyingCraft);
        this._crimeHeatCount = 0;
        this._nextPursuitRoadblockZ = 420;

        if (gameState.isRuinsMode) {
          soundManager.stopMusic();
          soundManager.playGeigerClick();
          if (this.intersections) this.intersections.reset();
          if (this.traffic) this.traffic.reset();
          if (this.ui) {
            this.ui.showToastUnlock({ name: '🏚️ BALLADE LIBRE — RUINES DE LA VILLE ANÉANTIE' });
          }
        } else {
          if (this.isNightRun && this.ui) {
            this.ui.showToastUnlock({ name: '🌙 COURSE DE NUIT — PLEINS PHARES !' });
          }
          if (gameState.challengeMode === 'CONVOY_BOSS' && this.traffic && this.traffic.spawnConvoyBoss) {
            this.traffic.spawnConvoyBoss(this.bike.z + 65, (z) => this.environment.getRoadCenterX(z));
          } else if (gameState.challengeMode === 'MANHUNT' && this.traffic && this.traffic.spawnPoliceRoadblock) {
            [120, 380, 720, 1100, 1550, 2050, 2600, 3200].forEach(zOffset => {
              this.traffic.spawnPoliceRoadblock(this.bike.z + zOffset, (z) => this.environment.getRoadCenterX(z));
            });
          } else if (gameState.challengeMode === 'POLICE_PURSUIT' && this.traffic) {
            if (this.traffic.spawnPursuitCruiser) {
              this.traffic.spawnPursuitCruiser(this.bike.z + 75, -2.5);
            }
          }
        }

        gameState.startRun(gameState.selectedCity?.id, gameState.challengeMode);
      } else if (action === 'EXIT_RUINS' || action === 'RETURN_MAP') {
        gameState.isRuinsMode = false;
        gameState.challengeMode = 'STANDARD';
        gameState.currentMode = 'MAP';
        if (this.skidMarks && this.skidMarks.reset) this.skidMarks.reset();
        if (this.weatherSystem && this.weatherSystem.reset) this.weatherSystem.reset();
        if (this.bike) {
          this.bike.speed = 0;
          this.bike.targetSpeed = 0;
          this.bike.x = 0;
          this.bike.z = 0;
        }
        soundManager.stopAllGameplaySounds();
        soundManager.stopEngine();
        if (storage.data.settings.music) soundManager.startMusic('MENU');
        this.setupCity(gameState.selectedCity);
        this.ui.setScreen('MAP');
      } else if (action === 'PAUSE') {
        gameState.currentMode = 'PAUSED';
        this.isPointerDown = false;
        this.steerInput = 0;
        gameState.setBraking(false);
        soundManager.pauseGameplayAudio();
      } else if (action === 'RESUME') {
        gameState.currentMode = 'PLAYING';
        if (gameState.selectedBike) {
          gameState.targetSpeed = gameState.isRuinsMode ? 7.0 : gameState.selectedBike.maxSpeed;
        }
        const isNonMotorized = gameState.selectedBike && ['run_ak47', 'run_chainsaw', 'cheval'].includes(gameState.selectedBike.id);
        if (gameState.selectedBike) {
          soundManager.lastVehicleId = gameState.selectedBike.id;
          soundManager.wasEnginePlaying = !isNonMotorized;
        }
        soundManager.resumeGameplayAudio();
        if (isNonMotorized) {
          soundManager.stopEngine();
        } else {
          soundManager.startEngine(gameState.selectedBike?.id);
        }
      } else if (action === 'CHANGE_BIKE_IN_GAME') {
        const bikeObj = payload;
        const bikeId = (bikeObj && bikeObj.id) ? bikeObj.id : (typeof bikeObj === 'string' ? bikeObj : storage.getEquippedBike());
        if (bikeId) {
          storage.equipBike(bikeId);
          gameState.selectBike(bikeId);
          if (gameState.selectedBike) {
            gameState.targetSpeed = gameState.isRuinsMode ? 7.0 : gameState.selectedBike.maxSpeed;
          }
          const prevX = this.bike.x;
          const prevZ = this.bike.z;
          const prevWorldX = this.bike.mesh.position.x;
          this.bike.buildCurrentBike(bikeId);
          this.bike.buildRider();
          this.bike.x = prevX;
          this.bike.z = prevZ;
          this.bike.isCrashed = false;
          this.bike.mesh.position.x = prevWorldX;
          this.bike.mesh.position.z = prevZ;
          const isNonMotorized = ['run_ak47', 'run_chainsaw', 'cheval'].includes(bikeId);
          soundManager.lastVehicleId = bikeId;
          soundManager.wasEnginePlaying = !isNonMotorized;
          if (isNonMotorized) {
            soundManager.stopEngine();
          } else if (gameState.currentMode === 'PLAYING') {
            soundManager.startEngine(bikeId);
          }
        }
      } else if (action === 'PREVIEW_BIKE' || action === 'BIKE_EQUIPPED') {
        const bikeId = (payload && payload.id) ? payload.id : payload;
        this.bike.buildCurrentBike(bikeId);
        this.bike.buildRider();
      } else if (action === 'COLOR_CHANGED') {
        const bikeId = (payload && payload.bikeId) ? payload.bikeId : null;
        this.bike.buildCurrentBike(bikeId);
        this.bike.buildRider();
      } else if (action === 'ATTACK') {
        this.executePlayerAttack();
      } else if (action === 'STEER_BUTTON') {
        if (!this.buttonSteer) this.buttonSteer = { left: false, right: false };
        if (payload && payload.dir === 'left') this.buttonSteer.left = !!payload.active;
        if (payload && payload.dir === 'right') this.buttonSteer.right = !!payload.active;
      } else if (action === 'SETTINGS_CHANGED') {
        this._applyStoredSettings();
      }
    } catch (err) {
      console.error('[GameApp] Erreur critique lors de handleUIAction:', action, err);
      if (action === 'START_RUN') {
        try {
          gameState.startRun();
        } catch (e) {
          console.error('[GameApp] Fallback startRun failed:', e);
        }
      }
    }
  }

  executePlayerAttack() {
    if (gameState.currentMode !== 'PLAYING') return;
    const attack = this.bike.triggerAttack();
    if (!attack) return;

    if (attack.type === 'horn') {
      // 1. Onde de choc sonore visuelle dorée qui se propage vers l'avant
      this.particles.spawnShockwave(this.bike.mesh.position, 0xffd32a);

      // 2. Alerte et panique des piétons situés dans le rayon du klaxon (24m)
      const panickedCount = this.characters.triggerHornAlert(this.bike.mesh.position, attack.range);

      // 3. Réaction des véhicules de circulation (accélération pour dégager la voie)
      if (this.traffic) {
        this.traffic.vehicles.forEach(v => {
          if (v.userData.active && Math.abs(v.position.z - this.bike.z) < 28) {
            v.userData.speed += 4.0;
          }
        });
      }

      if (panickedCount > 0) {
        const bonusPts = 75 * panickedCount;
        gameState.score += bonusPts;
        const burstPos = new THREE.Vector3(
          this.bike.mesh.position.x,
          this.bike.mesh.position.y + 1.2,
          this.bike.mesh.position.z + 4.0
        );
        this.particles.spawnComicBurst(burstPos, bonusPts, gameState.combo);
        soundManager.playCoin();
      }
      return;
    }

    if (attack.type === 'cannon') {
      const bikeZ = this.bike.z;
      const bikeX = this.bike.mesh.position.x;
      const muzzlePos = new THREE.Vector3(bikeX, this.bike.mesh.position.y + 0.95, bikeZ + 2.8);
      // Tir physique réel d'obus 120mm propulsé en avant dans l'espace 3D !
      this.projectiles.spawnTankShell(muzzlePos);
      return;
    }

    if (attack.type === 'torpedo') {
      const bikeZ = this.bike.z;
      const bikeX = this.bike.mesh.position.x;
      const bikeY = this.bike.mesh.position.y;
      const launchPosL = new THREE.Vector3(bikeX - 1.2, bikeY + 0.45, bikeZ + 2.2);
      const launchPosR = new THREE.Vector3(bikeX + 1.2, bikeY + 0.45, bikeZ + 2.2);
      if (this.projectiles.spawnTwinTorpedoes) {
        this.projectiles.spawnTwinTorpedoes(launchPosL, launchPosR);
      }
      return;
    }

    if (attack.type === 'missile' || attack.type === 'ice_missile') {
      const bikeZ = this.bike.z;
      const bikeX = this.bike.mesh.position.x;
      const bikeY = this.bike.mesh.position.y;
      const launchPosL = new THREE.Vector3(bikeX - 1.8, bikeY + 0.4, bikeZ + 2.2);
      const launchPosR = new THREE.Vector3(bikeX + 1.8, bikeY + 0.4, bikeZ + 2.2);
      // Doubles missiles propulsés en avant avec traînées de fumée !
      this.projectiles.spawnTwinMissiles(launchPosL, launchPosR);
      return;
    }

    if (attack.type === 'plasma_emp') {
      const bikeZ = this.bike.z;
      const bikeX = this.bike.mesh.position.x;
      const muzzlePos = new THREE.Vector3(bikeX, this.bike.mesh.position.y + 1.1, bikeZ + 2.4);
      // Orbe de plasma ionique EMP propulsé en avant !
      this.projectiles.spawnPlasmaOrb(muzzlePos);
      return;
    }

    if (attack.type === 'flamethrower') {
      const bikeZ = this.bike.z;
      const bikeX = this.bike.mesh.position.x;
      const bikeY = this.bike.mesh.position.y;

      // Gerbe de flammes continues projetées vers l'avant
      for (let f = 1; f <= 5; f++) {
        const fPos = new THREE.Vector3(bikeX + (Math.random() - 0.5) * 1.5, bikeY + 0.5, bikeZ + f * 5.0);
        this.particles.spawnShockwave(fPos, 0xff793f);
        this.particles.spawnCannonBlast(fPos);
      }
      this.engine.triggerCameraShake(0.45);

      if (this.traffic) {
        this.traffic.vehicles.forEach(v => {
          if (v.userData.active && !v.userData.isCrashed) {
            const vZ = v.position.z - bikeZ;
            const vX = Math.abs(v.position.x - bikeX);
            if (vZ > 1.5 && vZ < attack.range && vX < attack.radius) {
              if (v.userData.isConvoyBoss) {
                this.damageConvoyBoss(v, 20, v.position);
              } else {
                this.traffic.blowUpVehicle(v, this.bike.mesh.position);
                gameState.score += 1200;
                this.particles.spawnComicBurst(v.position, 1200, gameState.combo);
                if (this.ui) this.ui.spawnFloatingCombatText('+1200', 'INFERNO !', '#ff9f43', 50, 38);
                Haptic.impactHeavy();
              }
            }
          }
        });
      }

      this.characters.characters.forEach(char => {
        if (!char.group.visible || char.isFlying) return;
        const dZ = char.group.position.z - bikeZ;
        const dX = Math.abs(char.group.position.x - bikeX);
        if (dZ > 1.0 && dZ < attack.range && dX < attack.radius) {
          this.characters.triggerSlapstickFlight(char, bikeX, 45);
          this.particles.spawnBloodBurst(char.group.position);
          this.ui.triggerPedestrianCarnageFlash();
          if (this.ui) this.ui.spawnFloatingCombatText('+800', 'TORCHÉ !', '#ff5252', 50, 42);
          gameState.recordKill(800, 'WEAPON_FLAMETHROWER', char.typeDef.category);
          Haptic.carnage();
        }
      });
      return;
    }

    if (attack.type === 'shotgun') {
      const bikeZ = this.bike.z;
      const bikeX = this.bike.mesh.position.x;
      if (this.bike.spawnTracerBurst) this.bike.spawnTracerBurst();
      if (this.particles.spawnDirectionalSparks) {
        this.particles.spawnDirectionalSparks(new THREE.Vector3(bikeX, this.bike.mesh.position.y + 0.9, bikeZ + 2.0), new THREE.Vector3(0, 0.15, 1), 10, 0xfffa65);
      }
      this.particles.spawnShockwave(new THREE.Vector3(bikeX, this.bike.mesh.position.y + 0.8, bikeZ + 2.0), 0xfffa65, 2.2);
      this.engine.triggerCameraShake(0.45);

      if (this.traffic) {
        this.traffic.vehicles.forEach(v => {
          if (v.userData.active && !v.userData.isCrashed) {
            const vZ = v.position.z - bikeZ;
            const vX = Math.abs(v.position.x - bikeX);
            if (vZ > 1.5 && vZ < attack.range && vX < attack.radius) {
              if (v.userData.isConvoyBoss) {
                this.damageConvoyBoss(v, 20, v.position);
              } else {
                this.traffic.blowUpVehicle(v, this.bike.mesh.position);
                gameState.score += 1100;
                this.particles.spawnComicBurst(v.position, 1100, gameState.combo);
                soundManager.playCrash();
                if (this.ui) this.ui.spawnFloatingCombatText('+1100', 'BLAST !', '#ffd32a', 50, 38);
                Haptic.impactHeavy();
              }
            }
          }
        });
      }

      this.characters.characters.forEach(char => {
        if (!char.group.visible || char.isFlying) return;
        const dZ = char.group.position.z - bikeZ;
        const dX = Math.abs(char.group.position.x - bikeX);
        if (dZ > 1.0 && dZ < attack.range && dX < attack.radius) {
          this.characters.triggerSlapstickFlight(char, bikeX, 48);
          this.particles.spawnBloodBurst(char.group.position);
          this.ui.triggerPedestrianCarnageFlash();
          if (this.ui) this.ui.spawnFloatingCombatText('+750', 'HEADSHOT !', '#ff5252', 50, 42);
          gameState.recordKill(750, 'WEAPON_SHOTGUN', char.typeDef.category);
          Haptic.carnage();
        }
      });
      return;
    }

    if (attack.type === 'crusher') {
      const bikeZ = this.bike.z;
      const bikeX = this.bike.mesh.position.x;
      this.particles.spawnShockwave(this.bike.mesh.position, 0xffd32a);
      this.engine.triggerCameraShake(0.7);

      if (this.traffic) {
        this.traffic.vehicles.forEach(v => {
          if (v.userData.active && !v.userData.isCrashed) {
            const vZ = v.position.z - bikeZ;
            const vX = Math.abs(v.position.x - bikeX);
            if (vZ > 1.0 && vZ < attack.range && vX < attack.radius) {
              if (v.userData.isConvoyBoss) {
                this.damageConvoyBoss(v, 25, v.position);
              } else {
                this.traffic.blowUpVehicle(v, this.bike.mesh.position);
                gameState.score += 1600;
                this.particles.spawnComicBurst(v.position, 1600, gameState.combo);
                soundManager.playCrash();
                if (this.ui) this.ui.spawnFloatingCombatText('+1600', 'ÉCRASÉ !', '#f368e0', 50, 38);
                Haptic.impactHeavy();
              }
            }
          }
        });
      }
      return;
    }

    // Détection d'impact sur les piétons, véhicules et mobiliers situés dans l'arc d'attaque
    const bikeZ = this.bike.z;
    const bikeX = this.bike.mesh.position.x;
    let hitCount = 0;
    const isMeleeOrFirearm = ['chain', 'whip', 'axe', 'chainsaw', 'shoot', 'uzi'].includes(attack.type);

    if (isMeleeOrFirearm) {
      const fxOrigin = new THREE.Vector3(bikeX, this.bike.mesh.position.y + 0.8, bikeZ + 1.8);
      const fxColor = (attack.type === 'chain' || attack.type === 'whip') ? 0xffa502 : (attack.type === 'chainsaw' || attack.type === 'axe') ? 0xff4757 : 0xfffa65;
      this.particles.spawnShockwave(fxOrigin, fxColor, 2.0);
      if (this.particles.spawnDirectionalSparks) {
        this.particles.spawnDirectionalSparks(fxOrigin, new THREE.Vector3(0, 0.5, 1), 10);
      }

      if (this.traffic && this.traffic.vehicles) {
        this.traffic.vehicles.forEach(v => {
          if (v.userData && v.userData.active && !v.userData.isCrashed) {
            const vZ = v.position.z - bikeZ;
            const vX = Math.abs(v.position.x - bikeX);
            if (vZ > 0.5 && vZ < attack.range && vX < attack.radius) {
              if (v.userData.isConvoyBoss) {
                this.damageConvoyBoss(v, 22, v.position);
              } else {
                this.traffic.blowUpVehicle(v, this.bike.mesh.position);
                const vPts = attack.type === 'chain' ? 950 : 850;
                gameState.score += vPts;
                this.particles.spawnComicBurst(v.position, vPts, gameState.combo);
                if (this.particles.spawnDirectionalSparks) {
                  this.particles.spawnDirectionalSparks(v.position, new THREE.Vector3(0, 0.8, -1), 12);
                }
                soundManager.playCrash();
                if (this.ui) {
                  this.ui.spawnFloatingCombatText(`+${vPts}`, attack.type === 'chain' ? 'CHAÎNE ! ⛓️' : 'FRACAS !', '#ffa502', 50, 22);
                }
                Haptic.impactHeavy();
              }
              hitCount++;
            }
          }
        });
      }

      if (this.environment && this.environment.chunks) {
        this.environment.chunks.forEach(chunk => {
          if (chunk.userData && chunk.userData.props) {
            chunk.userData.props.forEach(prop => {
              if (!prop.visible || prop.userData.isHit || prop.userData.isStuntRamp || prop.userData.isAerialRing || prop.userData.isSlalomGate) return;
              const pType = prop.userData.type || '';
              if (pType !== 'lamp' && !pType.startsWith('stall_')) return;
              const worldZ = chunk.position.z + prop.position.z;
              const worldX = chunk.position.x + prop.position.x;
              const pZ = worldZ - bikeZ;
              const pX = Math.abs(worldX - bikeX);
              if (pZ > 0.5 && pZ < attack.range && pX < attack.radius) {
                prop.userData.isHit = true;
                dailyMissions.onPropSmash();
                const propPos = new THREE.Vector3(worldX, 1.2, worldZ);
                this.particles.spawnPropShatter(propPos, pType.startsWith('stall_') ? 'wood' : 'lamp');
                if (this.particles.spawnDirectionalSparks) {
                  this.particles.spawnDirectionalSparks(propPos, new THREE.Vector3(0, 0.7, -1), 10);
                }
                prop.position.y += 2.2;
                prop.rotation.x = Math.PI * 0.85;
                prop.rotation.z = (prop.position.x > 0 ? 1 : -1) * 1.2;
                setTimeout(() => { prop.visible = false; }, 550);
                gameState.score += 220;
                soundManager.playPropSmash();
                hitCount++;
              }
            });
          }
        });
      }
    }

    this.characters.characters.forEach(char => {
      if (!char.group.visible || char.isFlying) return;
      const dZ = char.group.position.z - bikeZ;
      const dX = Math.abs(char.group.position.x - bikeX);

      if (dZ > 0.5 && dZ < attack.range && dX < attack.radius) {
        this.characters.triggerSlapstickFlight(char, bikeX, 38);
        hitCount++;

        // Effets visuels & sonores d'impact burlesque et sadique
        this.engine.triggerCameraShake(0.45);
        const pts = attack.type === 'shoot' ? 500 : 450;
        this.particles.spawnComicBurst(char.group.position, pts, gameState.combo);
        this.particles.spawnBloodBurst(char.group.position);
        gameState.recordKill(pts, 'WEAPON_' + attack.type.toUpperCase(), char.typeDef.category);
      }
    });

    if (hitCount > 0) {
      soundManager.playCoin();
    }
  }

  triggerCityCataclysm() {
    if (gameState.cataclysmDetonated) return;
    const type = gameState.disasterType;
    gameState.triggerCataclysm();

    const landmarkPos = new THREE.Vector3(0, 10, 615);

    if (type === 'NUCLEAR') {
      this.particles.spawnNuclearBlast(landmarkPos);
      if (this.environment) this.environment.destroyNuclearPlant();
      this.engine.triggerCameraShake(0.85);
      if (this.ui) {
        this.ui.showToastUnlock({ name: '⚠️ CŒUR ATOMIQUE EN EXPLOSION ! FUIS IMMÉDIATEMENT !' });
      }
    } else if (type === 'DAM') {
      this.particles.spawnDamBlast(landmarkPos);
      if (this.environment) this.environment.destroyDam();
      this.engine.triggerCameraShake(0.95);
      if (this.ui) {
        this.ui.showToastUnlock({ name: '🌊 BARRAGE PULVÉRISÉ ! LE DÉLUGE ENGLOUTIT LA VILLE !' });
      }
    } else if (type === 'MOUNTAIN') {
      this.particles.spawnMountainBlast(landmarkPos);
      if (this.environment) this.environment.destroyMountain();
      this.engine.triggerCameraShake(1.0);
      if (this.ui) {
        this.ui.showToastUnlock({ name: '🏔️ MONTAGNE ÉBOULÉE ! AVALANCHE SISMIQUE SUR LA CITÉ !' });
      }
    }
  }

  triggerNuclearCataclysm() {
    this.triggerCityCataclysm();
  }

  /**
   * Applique des dégâts au Boss du Convoi Blindé, largue des caisses tous les 25% PV
   * et déclenche la miniature d'explosion nucléaire +8000 pts à la destruction.
   */
  damageConvoyBoss(boss, amount, hitPos) {
    if (!boss || gameState.challengeMode !== 'CONVOY_BOSS') return;
    const cs = gameState.challengeState;
    if (!cs || cs.defeated) return;

    cs.bossHp = Math.max(0, (cs.bossHp ?? 100) - amount);
    boss.userData.hp = cs.bossHp;
    if (this.particles.spawnDirectionalSparks && hitPos) {
      this._tmpDir.set(0, 0.8, -1);
      this.particles.spawnDirectionalSparks(hitPos, this._tmpDir, 14);
    }
    this.engine.triggerCameraShake(0.45);
    soundManager.playCrash();

    const expectedStages = Math.floor((100 - cs.bossHp) / 25);
    while ((cs.stagesDropped || 0) < expectedStages && cs.bossHp > 0) {
      cs.stagesDropped = (cs.stagesDropped || 0) + 1;
      this.particles.spawnCrashBurst(boss.position);
      if (this.ui) {
        this.ui.spawnFloatingCombatText('📦 CAISSE LARGUÉE !', `BOSS ${cs.bossHp}% PV`, '#ffa502', 50, 34);
      }
    }

    if (cs.bossHp <= 0 && !cs.defeated) {
      cs.defeated = true;
      if (this.traffic && this.traffic.blowUpVehicle) {
        this.traffic.blowUpVehicle(boss, this.bike.mesh.position);
      }
      if (this.particles.spawnNuclearBlast) {
        this.particles.spawnNuclearBlast(boss.position, 0.45);
      }
      if (!cs.defeatScoreAwarded) {
        gameState.score += 8000;
        cs.defeatScoreAwarded = true;
      }
      if (this.engine.triggerHitStop) {
        this.engine.triggerHitStop(0.06, 0.08);
      }
      this.engine.triggerCameraShake(0.95);
      soundManager.playExplosion();
      if (this.ui) {
        this.ui.spawnFloatingCombatText('+8000', 'CONVOI DÉTRUIT ! 💥', '#ff4757', 50, 35);
      }
      Haptic.impactHeavy();
    }
  }

  /**
   * Met à jour la poursuite policière (mode POLICE_PURSUIT ou déclenchée dès les premiers accidents)
   */
  updatePolicePursuit(simDelta, isFlyingCraft) {
    if (!this.traffic || isFlyingCraft || this.hasCrossedFinish) return;
    if (!gameState.challengeState) gameState.challengeState = { shieldHp: 3 };
    const cs = gameState.challengeState;
    if (cs.shieldHp === undefined) cs.shieldHp = 3;

    const bid = this.bike.currentBikeId;
    const isHeavyOrFast = ['tank', 'rouleau', 'rad_rover', 'bat_moto', 'moto_tron', 'dragster'].includes(bid);
    const maxCops = isHeavyOrFast ? 2 : 1; // Nombre réduit d'intercepteurs en poursuite

    let activeCopsCount = 0;
    const vehiclesList = this.traffic.vehicles || [];
    for (let i = 0; i < vehiclesList.length; i++) {
      const v = vehiclesList[i];
      if (v.userData && v.userData.isPursuitPolice && v.userData.active && !v.userData.isCrashed) activeCopsCount++;
    }
    this._pursuitSpawnTimer = (this._pursuitSpawnTimer || 0) - simDelta;
    if (activeCopsCount < maxCops && this._pursuitSpawnTimer <= 0 && this.traffic.spawnPursuitCruiser) {
      this._pursuitSpawnTimer = 4.5;
      const fromBehind = Math.random() < 0.5;
      const zSpawn = fromBehind ? (this.bike.z - 14) : (this.bike.z + 32);
      const laneX = (Math.random() < 0.5 ? -2.4 : 2.4);
      const initSpeed = fromBehind ? Math.max(gameState.speed + 10.0, 26.0) : Math.max(8.0, gameState.speed * 0.55);
      const useHeavySwat = isHeavyOrFast && Math.random() < 0.5;
      this.traffic.spawnPursuitCruiser(zSpawn, laneX, initSpeed, useHeavySwat);
    }

    // Barrages de police espacés pendant la poursuite
    if (this.policePursuitActive && this.traffic.spawnPoliceRoadblock) {
      if (!this._nextPursuitRoadblockZ) this._nextPursuitRoadblockZ = this.bike.z + 360;
      if (this.bike.z + 130 >= this._nextPursuitRoadblockZ) {
        this.traffic.spawnPoliceRoadblock(this._nextPursuitRoadblockZ);
        this._nextPursuitRoadblockZ += 420;
      }
    }

    const canSmashPolice = gameState.isNitroActive || this.bike.isInvulnerable() ||
      ['tank', 'rouleau', 'rad_rover', 'bat_moto', 'moto_tron'].includes(bid);

    this._policeHitCooldown = Math.max(0, (this._policeHitCooldown || 0) - simDelta);

    for (const cop of (this.traffic.vehicles || [])) {
      if (!cop.userData || !cop.userData.isPursuitPolice || !cop.userData.active || cop.userData.isCrashed) continue;
      const dZ = Math.abs(this.bike.z - cop.position.z);
      const dX = Math.abs(this.bike.mesh.position.x - cop.position.x);

      if (dZ < 2.6 && dX < 1.8) {
        if (canSmashPolice) {
          cs.policeDestroyed = (cs.policeDestroyed || 0) + 1;
          cs.wantedLevel = Math.min(5, (cs.wantedLevel || 2) + 1);
          if (this.traffic.blowUpVehicle) this.traffic.blowUpVehicle(cop, this.bike.mesh.position);
          if (this.bike.triggerChassisJolt) this.bike.triggerChassisJolt(0.08, -0.05, -0.9);
          if (this.particles.spawnDirectionalSparks) {
            this._tmpDir.set(0, 0.8, -1);
            this.particles.spawnDirectionalSparks(cop.position, this._tmpDir, 14);
          }
          if (this.particles.spawnGlassShatter) this.particles.spawnGlassShatter(cop.position);
          gameState.score += 750;
          soundManager.playCrash();
          if (this.ui) this.ui.spawnFloatingCombatText('+750', 'INTERCEPTEUR ÉCRASÉ ! 💥', '#38bdf8', 50, 38);
          Haptic.impactHeavy();
        } else if (this._policeHitCooldown <= 0) {
          this._policeHitCooldown = 1.4;
          const hitDirX = cop.position.x >= this.bike.mesh.position.x ? 1 : -1;
          if (this.traffic.triggerCrash) {
            this.traffic.triggerCrash(cop, gameState.speed, hitDirX);
          } else {
            cop.userData.isCrashed = true;
            cop.userData.active = false;
          }
          cs.shieldHp = Math.max(0, (cs.shieldHp ?? 3) - 1);
          gameState.speed = Math.max(3.5, gameState.speed * 0.48);
          if (this.bike.triggerChassisJolt) {
            const sideImp = cop.position.x >= this.bike.mesh.position.x ? -1 : 1;
            this.bike.triggerChassisJolt(sideImp * 0.22, 0.12, -2.0);
          }
          if (this.particles.spawnDirectionalSparks) this.particles.spawnDirectionalSparks(this.bike.mesh.position, new THREE.Vector3(0, 0.8, -1), 12);
          soundManager.playCrash();
          Haptic.impactHeavy();
          if (cs.shieldHp <= 0) {
            cs.shieldHp = 3;
            gameState.score = Math.max(0, gameState.score - 400);
            if (this.ui) this.ui.spawnFloatingCombatText('-400 PTS', '💥 BOUCLIER BRISÉ !', '#ff4757', 50, 35);
            this.bike.triggerCrash();
          } else {
            if (this.ui) this.ui.spawnFloatingCombatText('ESQUIVE RATÉE !', `🚔 BOUCLIER ${cs.shieldHp}/3`, '#ff4757', 50, 35);
          }
        }
      } else if (!cop.userData.dodged && dZ < 3.6 && dX >= 1.8 && dX < 3.5 && this.bike.z > cop.position.z - 0.5) {
        cop.userData.dodged = true;
        cs.dodgesCount = (cs.dodgesCount || 0) + 1;
        gameState.score += 350;
        soundManager.playNearMiss();
        if (this.ui) this.ui.spawnFloatingCombatText('+350', 'ESQUIVE POLICE ! 💨', '#38bdf8', 50, 38);
        Haptic.tap();
      }
    }

    for (const rb of (this.traffic.roadblocks || [])) {
      if (!rb.userData || !rb.userData.active || rb.userData.cleared) continue;
      const dZ = Math.abs(this.bike.z - rb.position.z);
      const relX = Math.abs(this.bike.mesh.position.x - rb.position.x);
      if (dZ < 2.2 && relX >= 1.65 && relX <= 4.75) {
        rb.userData.cleared = true;
        if (canSmashPolice) {
          cs.policeDestroyed = (cs.policeDestroyed || 0) + 1;
          if (this.traffic.blowUpVehicle) this.traffic.blowUpVehicle(rb, this.bike.mesh.position);
          gameState.score += 650;
          soundManager.playCrash();
          if (this.ui) this.ui.spawnFloatingCombatText('+650', 'BARRAGE PULVÉRISÉ !', '#38bdf8', 50, 38);
          Haptic.impactHeavy();
        } else {
          cs.shieldHp = Math.max(0, (cs.shieldHp ?? 3) - 1);
          gameState.speed = Math.max(3.5, gameState.speed * 0.45);
          if (this.bike.triggerChassisJolt) this.bike.triggerChassisJolt(0.24, 0.14, -2.2);
          soundManager.playCrash();
          if (this.ui) this.ui.spawnFloatingCombatText('BARRAGE HEURTÉ !', `🚔 BOUCLIER ${cs.shieldHp}/3`, '#ff4757', 50, 35);
          if (cs.shieldHp <= 0) {
            cs.shieldHp = 3;
            gameState.score = Math.max(0, gameState.score - 400);
            this.bike.triggerCrash();
            if (this.ui) this.ui.spawnFloatingCombatText('-400 PTS', 'BARRAGE HEURTÉ !', '#ff4757', 50, 34);
          }
        }
      } else if (this.bike.z > rb.position.z + 2.8) {
        rb.userData.cleared = true;
        cs.dodgesCount = (cs.dodgesCount || 0) + 1;
        gameState.score += 450;
        soundManager.playNearMiss();
        if (this.ui) this.ui.spawnFloatingCombatText('+450', 'BARRAGE ESQUIVÉ ! 💨', '#38bdf8', 50, 38);
      }
    }
  }

  /**
   * Déclenche la poursuite policière dès les premiers accidents / infractions
   */
  triggerPolicePursuitIfCrime(reason = 'ACCIDENT') {
    if (this.policePursuitActive || gameState.isRuinsMode || this.hasCrossedFinish) return;
    if (this.bike && (this.bike.currentBikeId === 'aero_jet' || this.bike.isFlyingEscape)) return;
    this._crimeHeatCount = (this._crimeHeatCount || 0) + 1;
    if (this._crimeHeatCount >= 4) {
      this.policePursuitActive = true;
      if (!gameState.challengeState) gameState.challengeState = {};
      if (gameState.challengeState.shieldHp === undefined) {
        gameState.challengeState.shieldHp = 3;
      }
      if (this.traffic && this.traffic.spawnPursuitCruiser && this.environment) {
        const zAhead = this.bike.z + 28;
        const isHeavyOrFast = ['tank', 'rouleau', 'rad_rover', 'bat_moto', 'moto_tron', 'dragster'].includes(this.bike.currentBikeId);
        this.traffic.spawnPursuitCruiser(zAhead, 2.2, Math.max(8.0, gameState.speed * 0.55), isHeavyOrFast);
      }
      soundManager.switchMusicTrack('PURSUIT');
      if (this.ui) {
        this.ui.spawnFloatingCombatText('🚨 POLICE !', `${reason} — POURSUITE LANCÉE !`, '#38bdf8', 50, 26);
      }
    }
  }

  /**
   * Arrestation immédiate : arrêt du véhicule, son de prison et transfert direct en cellule
   */
  triggerPoliceArrest() {
    // Mode Poursuite Only : l'arrestation et la prison sont désactivées.
    gameState.isArrested = false;
    if (gameState.challengeState) {
      gameState.challengeState.shieldHp = 3;
      gameState.challengeState.bustedProgress = 0;
    }
    gameState.score = Math.max(0, gameState.score - 400);
    if (this.ui) this.ui.spawnFloatingCombatText('-400 PTS', '💥 BOUCLIER BRISÉ !', '#ff4757', 50, 35);
    if (this.bike) this.bike.triggerCrash();
  }

  /**
   * Met à jour les mécaniques et collisions spécifiques aux Épreuves Spéciales.
   */
  updateChallengeHooks(simDelta, currentSpeed, isFlyingCraft) {
    const mode = gameState.challengeMode;
    if (this.policePursuitActive && mode !== 'POLICE_PURSUIT' && !gameState.isRuinsMode) {
      this.updatePolicePursuit(simDelta, isFlyingCraft);
    }
    if (!mode || mode === 'STANDARD' || gameState.isRuinsMode) return;
    const cs = gameState.challengeState || {};

    if (this._bossRamCooldown > 0) {
      this._bossRamCooldown = Math.max(0, this._bossRamCooldown - simDelta);
    }

    if (mode === 'CONVOY_BOSS' && this.traffic && !cs.defeated) {
      const boss = this.traffic.bossTruck;
      if (boss && boss.visible && boss.userData && boss.userData.active && !boss.userData.isCrashed && !isFlyingCraft) {
        const dZ = Math.abs(boss.position.z - this.bike.z);
        const dX = Math.abs(boss.position.x - this.bike.mesh.position.x);
        if (dZ < 4.2 && dX < 2.1 && this._bossRamCooldown <= 0) {
          this._bossRamCooldown = 0.6;
          const canRam = gameState.isNitroActive || this.bike.isInvulnerable() || this.bike.currentBikeId === 'tank' || this.bike.currentBikeId === 'rouleau';
          if (canRam) {
            this.damageConvoyBoss(boss, 25, boss.position);
            if (this.engine.triggerHitStop) this.engine.triggerHitStop(0.045, 0.08);
            const pushDir = this.bike.mesh.position.x >= boss.position.x ? 1 : -1;
            this.bike.x = THREE.MathUtils.clamp(this.bike.x + pushDir * 1.4, -6.7, 6.7);
          } else {
            const crashed = this.bike.triggerCrash();
            if (crashed) {
              if (this.engine.triggerHitStop) this.engine.triggerHitStop(0.045, 0.08);
              if (this.particles.spawnDirectionalSparks) {
                this.particles.spawnDirectionalSparks(this.bike.mesh.position, new THREE.Vector3(0, 0.8, -1), 14);
              }
              soundManager.playCrash();
              gameState.applyVehicleCrashPenalty(300);
            }
          }
        }
      }
    } else if (mode === 'SLALOM_CHRONO' && this.environment && this.environment.chunks) {
      for (let c = 0; c < this.environment.chunks.length; c++) {
        const chunk = this.environment.chunks[c];
        const props = chunk.userData && chunk.userData.props;
        if (!props) continue;
        for (let p = 0; p < props.length; p++) {
          const gate = props[p];
          if (!gate.userData || !gate.userData.isSlalomGate || gate.userData.gatePassed || !gate.visible) continue;
          const gateZ = chunk.position.z + gate.position.z;
          const gateX = chunk.position.x + gate.position.x;
          if (Math.abs(this.bike.z - gateZ) < 2.4 && Math.abs(this.bike.mesh.position.x - gateX) < 2.6) {
            gate.userData.gatePassed = true;
            cs.timeLeft = (cs.timeLeft || 0) + 3.5;
            cs.gatesPassed = (cs.gatesPassed || 0) + 1;
            cs.gateStreak = (cs.gateStreak || 0) + 1;
            gameState.score += 400;
            gameState.chargeNitro(15);
            soundManager.playNearMiss();
            if (this.particles.spawnComicBurst) {
              this.particles.spawnComicBurst(this.bike.mesh.position, 400, gameState.combo);
            }
            if (this.ui) {
              this.ui.spawnFloatingCombatText('+3.5s / +400', `PORTIQUE ${cs.gatesPassed} ! ⏱️`, '#00d2d3', 50, 38);
            }
            Haptic.tap();
          }
        }
      }
    } else if (mode === 'MANHUNT' && this.traffic && this.traffic.roadblocks && !isFlyingCraft) {
      for (const rb of this.traffic.roadblocks) {
        if (!rb.userData || !rb.userData.active || rb.userData.cleared) continue;
        const dZ = Math.abs(this.bike.z - rb.position.z);
        const dX = Math.abs(this.bike.mesh.position.x - rb.position.x);
        if (dZ < 2.2 && dX >= 1.65 && dX <= 4.75) {
          rb.userData.cleared = true;
          const canSmash = gameState.isNitroActive || this.bike.isInvulnerable() || this.bike.currentBikeId === 'tank' || this.bike.currentBikeId === 'rouleau';
          if (canSmash) {
            cs.roadblocksCleared = (cs.roadblocksCleared || 0) + 1;
            cs.wantedLevel = Math.min(5, (cs.wantedLevel || 1) + 1);
            if (this.traffic.blowUpVehicle) this.traffic.blowUpVehicle(rb, this.bike.mesh.position);
            if (this.engine.triggerHitStop) this.engine.triggerHitStop(0.045, 0.08);
            if (this.particles.spawnDirectionalSparks) {
              this.particles.spawnDirectionalSparks(rb.position, new THREE.Vector3(0, 0.8, -1), 16);
            }
            if (this.particles.spawnGlassShatter) this.particles.spawnGlassShatter(rb.position);
            gameState.score += 650;
            soundManager.playCrash();
            if (this.ui) {
              this.ui.spawnFloatingCombatText('+650', `BARRAGE PULVÉRISÉ ! ★${cs.wantedLevel}`, '#5352ed', 50, 38);
            }
            Haptic.impactHeavy();
          } else {
            cs.shieldHp = Math.max(0, (cs.shieldHp ?? 3) - 1);
            this.bike.triggerCrash();
            if (this.engine.triggerHitStop) this.engine.triggerHitStop(0.045, 0.08);
            if (this.particles.spawnDirectionalSparks) {
              this.particles.spawnDirectionalSparks(this.bike.mesh.position, new THREE.Vector3(0, 0.8, -1), 16);
            }
            if (this.particles.spawnGlassShatter) this.particles.spawnGlassShatter(rb.position);
            soundManager.playCrash();
            if (this.ui) {
              this.ui.spawnFloatingCombatText('BOUCLIER -1', `🛡️ ${cs.shieldHp}/3`, '#ff4757', 50, 35);
            }
            Haptic.impactHeavy();
            if (cs.shieldHp <= 0) {
              cs.shieldHp = 3;
              gameState.score = Math.max(0, gameState.score - 400);
              if (this.ui) this.ui.spawnFloatingCombatText('-400 PTS', 'CHOC BARRAGE !', '#ff4757', 50, 34);
            }
          }
        } else if (this.bike.z > rb.position.z + 2.8) {
          rb.userData.cleared = true;
          cs.roadblocksCleared = (cs.roadblocksCleared || 0) + 1;
          cs.wantedLevel = Math.min(5, (cs.wantedLevel || 1) + 1);
          gameState.score += 500;
          soundManager.playNearMiss();
          if (this.ui) {
            this.ui.spawnFloatingCombatText('+500', `BARRAGE FRANCHI ! ★${cs.wantedLevel}`, '#5352ed', 50, 38);
          }
          Haptic.tap();
        }
      }
    } else if (mode === 'POLICE_PURSUIT' && this.traffic && !isFlyingCraft) {
      this.updatePolicePursuit(simDelta, isFlyingCraft);
    } else if (mode === 'STUNT_RAMPS' && this.environment && !isFlyingCraft) {
      if (this.environment.chunks) {
        for (const chunk of this.environment.chunks) {
          if (!chunk.userData || !chunk.userData.props) continue;
          for (const prop of chunk.userData.props) {
            if (!prop.userData) continue;
            const worldZ = chunk.position.z + prop.position.z;
            const worldX = chunk.position.x + prop.position.x;

            const zTol = Math.max(3.5, currentSpeed * simDelta * 0.65);
            if (prop.userData.isStuntRamp && !prop.userData.isHit &&
                Math.abs(this.bike.z - worldZ) < zTol && Math.abs(this.bike.mesh.position.x - worldX) < 2.8) {
              prop.userData.isHit = true;
              if (this.bike.triggerMegaRampJump) {
                this.bike.triggerMegaRampJump(currentSpeed);
              } else {
                this.bike.triggerSpeedBumpJump(currentSpeed * 1.4);
              }
              cs.jumpsLanded = (cs.jumpsLanded || 0) + 1;
              soundManager.playSpeedBumpBoingFwump(1.35);
              if (this.particles.spawnDirectionalSparks) {
                this._tmpDir.set(0, 1, -0.5);
                this.particles.spawnDirectionalSparks(this._tmpPos.set(worldX, 0.5, worldZ), this._tmpDir, 14);
              }
              this.engine.triggerCameraShake(0.35);
              if (this.ui) {
                this.ui.spawnFloatingCombatText('MÉGA SAUT !', '🛫 AIR TIME !', '#ffa502', 50, 22);
              }
              Haptic.impactHeavy();
            } else if (prop.userData.isAerialRing && !prop.userData.ringCollected &&
                Math.abs(this.bike.z - worldZ) < zTol && Math.abs(this.bike.mesh.position.x - worldX) < 3.4 &&
                this.bike.jumpAltitude > 0.45) {
              prop.userData.ringCollected = true;
              prop.visible = false;
              gameState.score += 1500;
              gameState.chargeNitro(35);
              cs.ringsCollected = (cs.ringsCollected || 0) + 1;
              if (this.engine.triggerHitStop) this.engine.triggerHitStop(0.11, 0.45);
              if (this.particles.spawnShockwave) this.particles.spawnShockwave(this._tmpPos.set(worldX, 3.0, worldZ), 0x38bdf8, 4.2);
              cs.stuntPoints = (cs.stuntPoints || 0) + 1500;
              soundManager.playCoin();
              if (this.ui) {
                this.ui.spawnFloatingCombatText('+1500 / +35% NITRO', 'ANNEAU AÉRIEN ! ⭕', '#ffd32a', 50, 22);
              }
              Haptic.impactLight();
            }
          }
        }
      }
    } else if (mode === 'EXTREME_STORM') {
      if (Math.abs(cs.windForce || 0) > 0.01 && !this.bike.isCrashed) {
        this.bike.x = THREE.MathUtils.clamp(this.bike.x + cs.windForce * simDelta, -6.7, 6.7);
      }
      if (cs.warningJustStarted) {
        cs.warningJustStarted = false;
        const dirLabel = (cs.nextWindDir || 1) > 0 ? 'RAFALE DROITE ➡️' : '⬅️ RAFALE GAUCHE';
        if (this.ui) {
          this.ui.spawnFloatingCombatText('⚠️ VENT VIOLENT', dirLabel, '#1e90ff', 50, 32);
        }
      }
      if (cs.gustJustStarted) {
        cs.gustJustStarted = false;
        if (this.engine.triggerLightningFlash) this.engine.triggerLightningFlash();
      }
      this._stormLightningTimer -= simDelta;
      if (this._stormLightningTimer <= 0) {
        this._stormLightningTimer = 5.0 + Math.random() * 4.5;
        if (this.engine.triggerLightningFlash) this.engine.triggerLightningFlash();
      }
    }
  }

  loop() {
    requestAnimationFrame(this._boundLoop);

    try {
      const rawDelta = Math.min(this.clock.getDelta(), 0.05); // Sécurité contre les sauts de frame / freezes
      if (gameState.currentMode === 'PLAYING' && this.engine.updatePerformanceGovernor) {
        const perfTier = this.engine.updatePerformanceGovernor(rawDelta);
        if (perfTier !== this._lastPerfTier) {
          this._lastPerfTier = perfTier;
          if (this.weatherSystem && this.weatherSystem.setQualityFactor) {
            this.weatherSystem.setQualityFactor(perfTier === 0 ? 1.0 : (perfTier === 1 ? 0.55 : 0.3));
          }
        }
      }
      if (this.engine.updateTimeScale) this.engine.updateTimeScale(rawDelta);
    const timeScale = this.engine.getTimeScale ? this.engine.getTimeScale() : 1.0;
    const delta = rawDelta * timeScale;
    TWEEN.update();

    // Calcul du braquage final (tactile, boutons ou clavier) — verrouillé à 0 pendant le freinage / arrêt
    let currentSteer = this.steerInput;
    if (this.keys.left || this.buttonSteer?.left) currentSteer = -1.0;
    else if (this.keys.right || this.buttonSteer?.right) currentSteer = 1.0;
    if (gameState.isBraking) {
      this.steerInput = 0;
      if (this.buttonSteer) { this.buttonSteer.left = false; this.buttonSteer.right = false; }
      currentSteer = 0;
    }

    if (gameState.currentMode === 'PLAYING') {
      const isFlyingCraft = this.bike.currentBikeId === 'aero_jet' || this.bike.isFlyingEscape;

      // 1. Calcul de la vitesse effective avec gestion de l'accident et du freinage
      let currentSpeed = gameState.speed;
      if (this.bike.isCrashed) {
        currentSpeed = 0;
      }

      // 2. Déplacement de la moto vers l'avant selon la vitesse réelle
      this.bike.z += currentSpeed * delta;

      // 3. Suivi fluide de la courbure de la route (zéro dérapage en crabe ni rotation brusque)
      const roadCenterX = this.environment.getRoadCenterX(this.bike.z);
      const roadAngle = this.environment.getRoadAngle(this.bike.z);

      // 4. Physique de direction, suspension et inclinaison naturelle
      this.bike.update(delta, currentSteer, currentSpeed, roadAngle);
      this.bike.mesh.position.x = roadCenterX + this.bike.x;
      this.bike.mesh.position.z = this.bike.z;
      this.bike.mesh.rotation.y = roadAngle * 0.28 - (this.bike.smoothedSteer || 0) * 0.18;

      // 4b. EFFETS DE SURFACE : montée de trottoir, atterrissage de saut & frottement aux murs
      const bikeAbsX = Math.abs(this.bike.x);
      const onSidewalkNow = bikeAbsX > 5.4;
      if (onSidewalkNow !== this._wasOnSidewalk) {
        this._wasOnSidewalk = onSidewalkNow;
        if (onSidewalkNow && currentSpeed > 4 && !isFlyingCraft) {
          const curbPos = new THREE.Vector3(this.bike.mesh.position.x, 0.12, this.bike.z);
          if (this.particles.spawnDirectionalSparks) {
            this.particles.spawnDirectionalSparks(curbPos, new THREE.Vector3(0, 0.6, -1), 10);
          }
          this.engine.triggerCameraShake(0.06);
          Haptic.impactLight();
        }
      }

      if (this.bike.justLandedIntensity > 0) {
        const landIntensity = this.bike.justLandedIntensity;
        this.bike.justLandedIntensity = 0;
        const landPos = new THREE.Vector3(this.bike.mesh.position.x, 0.12, this.bike.z);
        if (this.particles.spawnSkidSmoke) {
          this.particles.spawnSkidSmoke(landPos);
        }
        if (this.particles.spawnDirectionalSparks) {
          this.particles.spawnDirectionalSparks(landPos, new THREE.Vector3(0, 0.45, -1), landIntensity >= 1.0 ? 14 : 8);
        }
        this.engine.triggerCameraShake(0.16 * landIntensity);
        Haptic.impactMedium();
      }

      // Frottement réaliste contre les murs latéraux (|x| >= 7.25m) — dépend du véhicule
      if (bikeAbsX >= 7.25 && currentSpeed > 2.5 && !isFlyingCraft && !this.bike.isCrashed) {
        const side = Math.sign(this.bike.x);
        const bid = this.bike.currentBikeId;
        const isHeavyArmor = (bid === 'tank' || bid === 'rouleau' || bid === 'rad_rover');
        const isHover = (bid === 'hovercraft');
        const isHorse = (bid === 'cheval');

        // Décélération par frottement selon la masse/type du véhicule
        const frictionRate = isHeavyArmor ? 0.12 : (isHover ? 0.24 : (isHorse ? 0.55 : 0.42));
        gameState.speed = Math.max(2.0, gameState.speed * Math.max(0.5, 1.0 - frictionRate * delta));
        this.bike.x = side * 7.25;

        this._wallScrapeTimer = (this._wallScrapeTimer || 0) - delta;
        if (this._wallScrapeTimer <= 0) {
          this._wallScrapeTimer = isHeavyArmor ? 0.09 : 0.12;
          const wallPos = new THREE.Vector3(
            this.bike.mesh.position.x + side * 0.58,
            0.45 + Math.random() * 0.4,
            this.bike.z - 0.2 + Math.random() * 0.6
          );
          if (isHorse) {
            if (this.particles.spawnSkidSmoke) this.particles.spawnSkidSmoke(new THREE.Vector3(wallPos.x, 0.1, wallPos.z));
            this.bike.x -= side * 0.28;
            soundManager.playCurbMount();
          } else {
            const sparkColor = isHover ? 0x00d2d3 : (isHeavyArmor ? 0xff793f : 0xffd32a);
            const sparkCount = isHeavyArmor ? 12 : 8;
            if (this.particles.spawnDirectionalSparks) {
              this.particles.spawnDirectionalSparks(wallPos, new THREE.Vector3(-side * 0.75, 0.45, -1), sparkCount, sparkColor);
            } else {
              this.particles.spawnSparks(wallPos, sparkCount, sparkColor);
            }
            if (this.particles.spawnSkidSmoke) {
              this.particles.spawnSkidSmoke(new THREE.Vector3(wallPos.x, 0.1, wallPos.z));
            }
            soundManager.playWallScrape(side);
          }
          if (this.bike.triggerChassisJolt) {
            this.bike.triggerChassisJolt(-side * (isHeavyArmor ? 0.04 : 0.08), -0.02, -0.45);
          }
          this.engine.triggerCameraShake(0.015);
        }

        // Inclinaison de frottement réaliste le long du mur
        const scrapeTilt = isHeavyArmor ? 0.06 : 0.13;
        this.bike.mesh.rotation.z = THREE.MathUtils.lerp(
          this.bike.mesh.rotation.z, side * scrapeTilt, delta * 8
        );
      } else if (!this.bike.isCrashed) {
        this.bike.mesh.rotation.z = THREE.MathUtils.lerp(this.bike.mesh.rotation.z, 0, delta * 10);
      }

      // 5. Son moteur réactif (ronronnement ralenti à l'arrêt, accélération dynamique)
      const isNonMotorized = ['run_ak47', 'run_chainsaw', 'cheval'].includes(this.bike.currentBikeId);
      if (!this.hasCrossedFinish) {
        if (gameState.currentMode === 'PLAYING' && !isNonMotorized) {
          soundManager.updateEngine(currentSpeed / 20.0);
        }

        // Modulation d'intensité dynamique de la musique sadique (CALM, TENSION, COMBO)
        if (gameState.isNitroActive || gameState.combo >= 3 || currentSpeed > 24) {
          soundManager.setSadisticIntensity('COMBO');
        } else if (currentSpeed > 7) {
          soundManager.setSadisticIntensity('TENSION');
        } else {
          soundManager.setSadisticIntensity('CALM');
        }
      }

      // 6. Fumée d'échappement et fumée de dérapage au freinage (uniquement engins motorisés)
      if (!isNonMotorized) {
        if (currentSpeed > 1.0 && Math.random() < 0.38) {
          this.particles.spawnExhaustSmoke(this.bike.getExhaustPosition(), currentSpeed / 20.0);
        }
        if (gameState.isBraking && currentSpeed > 3.5) {
          this.particles.spawnSkidSmoke(this.bike.mesh.position);
        }
      }

      // 6b. Traces de gomme (skidMarks) & Météo dynamique
      if (this.skidMarks && this.skidMarks.emit && !isFlyingCraft && !isNonMotorized && currentSpeed > 5 &&
          (gameState.isBraking || (Math.abs(currentSteer) > 0.65 && currentSpeed > 16))) {
        const rearPos = new THREE.Vector3(this.bike.mesh.position.x, 0.04, this.bike.z - 0.65);
        this.skidMarks.emit(rearPos, this.bike.mesh.rotation.y, gameState.isBraking ? 0.9 : 0.55);
      }
      if (this.weatherSystem && this.weatherSystem.update) {
        this.weatherSystem.update(delta, this.bike.z, currentSpeed);
        if (this.weatherSystem.mode === 'RAIN' && currentSpeed > 8 && !isFlyingCraft && Math.random() < 0.22) {
          if (this.particles && this.particles.spawnDirectionalSparks) {
            const splashPos = new THREE.Vector3(this.bike.mesh.position.x, 0.12, this.bike.z - 0.8);
            this.particles.spawnDirectionalSparks(splashPos, new THREE.Vector3(0, 0.65, -1), 3, 0xbae6fd);
          }
        }
      }

      // 7. Génération et recyclage du monde 3D
      this.environment.update(this.bike.z, delta);

      // 8. Ambiance Spécifique Ruines ou Gameplay Vivant Normal
      if (gameState.isRuinsMode) {
        // En mode Ruines : Cité anéantie sans survivant, pas de piétons vivants ni de trafic
        if (Math.random() < 0.03) soundManager.playGeigerClick();
        if (Math.random() < 0.28 && this.particles) {
          this._tmpPos.set(
            this.bike.mesh.position.x + (Math.random() - 0.5) * 16,
            Math.random() * 3.5 + 0.4,
            this.bike.z + (Math.random() - 0.5) * 22
          );
          this.particles.spawnSparks(this._tmpPos, 2, Math.random() < 0.35 ? 0xff4757 : 0x7f8c8d);
        }
      } else {
        // 8a. Gestion des piétons (Trottoirs & Passages Piétons), collisions burlesques et frôlements (near-miss)
        this.characters.update(
          delta,
          this.bike.z,
          this.bike.mesh.position.x,
          currentSpeed,
          (hitChar) => {
            // Si le joueur est en vol (Aero-Jet à 38m) ou invulnérable, aucun choc direct au sol
            if (isFlyingCraft || this.bike.isInvulnerable()) return;

            // Calcul des bonus de position (Trottoir ou Passage piéton)
            let bonusPts = hitChar.typeDef.points;
            let categoryLabel = hitChar.typeDef.type;
            if (hitChar.isOnSidewalk) {
              bonusPts += 200;
              categoryLabel = 'TROTTOIR_CARNAGE';
            } else if (hitChar.isCrossing) {
              bonusPts += 250;
              categoryLabel = 'PASSAGE_PIETON';
            }

            // Impact cartoon équilibré !
            this.engine.triggerCameraShake(0.38);
            this.particles.spawnComicBurst(hitChar.group.position, bonusPts, gameState.combo);
            this.particles.spawnBloodBurst(hitChar.group.position);
            if (this.ui) {
              this.ui.triggerPedestrianCarnageFlash();
              const subLabel = hitChar.isOnSidewalk ? 'TROTTOIR !' : (hitChar.isCrossing ? 'PASSAGE CLOUTÉ !' : 'STRIKE !');
              this.ui.spawnFloatingCombatText(`+${bonusPts}`, subLabel, '#ff4757', 50, 42);
            }
            Haptic.impactLight();
            gameState.recordKill(bonusPts, categoryLabel, hitChar.typeDef.category);
            this.triggerPolicePursuitIfCrime('DÉLIT DE FUITE');

            // Si série de carnages ou choc sur piéton, dépêcher l'ambulance d'urgence !
            if (this.traffic && (gameState.combo >= 2 || Math.random() < 0.4)) {
              this.traffic.spawnEmergencyAmbulance(this.bike.z, (z) => this.environment.getRoadCenterX(z));
            }
          },
          this._roadCenterFn || (this._roadCenterFn = (z) => this.environment.getRoadCenterX(z)),
          (nearChar) => {
            // Frôlement / Near-Miss à pleine vitesse (ignoré en plein vol dans le ciel)
            if (isFlyingCraft || this.bike.isInvulnerable()) return;
            gameState.addNearMiss();
            this.particles.spawnComicBurst(nearChar.group.position, 75, gameState.combo);
            if (this.ui) this.ui.spawnFloatingCombatText('+75', 'FRÔLEMENT !', '#ffd32a', 45, 55);
            Haptic.tap();
          },
          this.bike.isInvulnerable()
        );

        // 8b. Circulation routière (Véhicules, Taxis, Fourgons, Autobus)
        if (this.traffic) {
          this.traffic.update(
            delta,
            this.bike.z,
            this.bike.mesh.position.x,
            currentSpeed,
            this._roadCenterFn || (this._roadCenterFn = (z) => this.environment.getRoadCenterX(z)),
            (car, isPlayerInvuln) => {
              if (isFlyingCraft) return; // En vol dans les airs, la circulation au sol ne heurte pas le jet
              if (isPlayerInvuln || gameState.isNitroActive || this.bike.currentBikeId === 'rouleau' || this.bike.currentBikeId === 'tank') {
                // Carambolage royal ! La voiture vole en éclats
                if (this.engine.triggerHitStop) this.engine.triggerHitStop(0.045, 0.08);
                this.engine.triggerCameraShake(0.65);
                soundManager.playCrash();
                this.particles.spawnCrashBurst(car.position);
                if (this.particles.spawnDirectionalSparks) {
                  this._tmpDir.set(0, 0.8, -1);
                  this.particles.spawnDirectionalSparks(car.position, this._tmpDir, 16);
                }
                if (this.particles.spawnGlassShatter) this.particles.spawnGlassShatter(car.position);
                gameState.recordKill(280, 'CARAMBOLAGE', 'car');
                this.particles.spawnComicBurst(car.position, 280, gameState.combo);
                if (this.ui) this.ui.spawnFloatingCombatText('+280', 'WRECKAGE !', '#ffa502', 50, 40);
                Haptic.impactHeavy();
                this.triggerPolicePursuitIfCrime('CARAMBOLAGE');
              } else {
                this.triggerPolicePursuitIfCrime('ACCIDENT');
                // Collision avec un véhicule de circulation
                const crashed = this.bike.triggerCrash();
                if (crashed) {
                  if (this.engine.triggerHitStop) this.engine.triggerHitStop(0.045, 0.08);
                  this.engine.triggerCameraShake(0.75);
                  soundManager.playCrash();
                  soundManager.playPenaltyBuzzer();
                  this.particles.spawnCrashBurst(this.bike.mesh.position);
                  if (this.particles.spawnDirectionalSparks) {
                    this.particles.spawnDirectionalSparks(car.position, new THREE.Vector3(0, 0.8, -1), 16);
                  }
                  if (this.particles.spawnGlassShatter) this.particles.spawnGlassShatter(car.position);
                  gameState.applyVehicleCrashPenalty(300);
                  if (this.ui) {
                    this.ui.triggerCrashPenaltyUI(300);
                    this.ui.spawnFloatingCombatText('-300', 'CRASH !', '#eb4d4b', 50, 35);
                  }
                  Haptic.impactHeavy();
                }
              }
            },
            this.bike.isInvulnerable()
          );
        }
      }

      // 8c. Détection d'impact des balles traçantes (Tir AK-47 & Armes à feu)
      if (this.bike.bulletPool) {
        this.bike.bulletPool.forEach(b => {
          if (!b.userData.active) return;

          // Impact des balles sur les piétons
          this.characters.characters.forEach(char => {
            if (!char.group.visible || char.isFlying) return;
            const dZ = Math.abs(char.group.position.z - b.position.z);
            const dX = Math.abs(char.group.position.x - b.position.x);
            if (dZ < 1.4 && dX < 1.25) {
              b.userData.active = false;
              b.visible = false;
              this.characters.triggerSlapstickFlight(char, this.bike.mesh.position.x, 42);
              this.particles.spawnComicBurst(char.group.position, 220, gameState.combo);
              this.particles.spawnBloodBurst(char.group.position);
              gameState.recordKill(220, 'WEAPON_SHOOT', char.typeDef.category);
            }
          });

          // Impact des balles sur les véhicules de circulation & Boss Convoi
          if (this.traffic) {
            if (this.traffic.bossTruck && this.traffic.bossTruck.visible && this.traffic.bossTruck.userData?.active) {
              const boss = this.traffic.bossTruck;
              if (Math.abs(boss.position.z - b.position.z) < 4.5 && Math.abs(boss.position.x - b.position.x) < 2.4) {
                b.userData.active = false;
                b.visible = false;
                this.damageConvoyBoss(boss, 10, b.position);
              }
            }
            this.traffic.vehicles.forEach(v => {
              if (!v.visible || v.userData.isCrashed) return;
              const isBoss = !!(v.userData && v.userData.isConvoyBoss);
              const dZ = Math.abs(v.position.z - b.position.z);
              const dX = Math.abs(v.position.x - b.position.x);
              if (dZ < (isBoss ? 4.5 : 2.4) && dX < (isBoss ? 2.2 : 1.4)) {
                b.userData.active = false;
                b.visible = false;
                if (isBoss) {
                  this.damageConvoyBoss(v, 10, b.position);
                } else {
                  this.traffic.triggerCrash(v, 28, (b.position.x > v.position.x ? 1 : -1));
                  this.particles.spawnCrashBurst(v.position);
                  gameState.score += 180;
                  this.particles.spawnComicBurst(v.position, 180, gameState.combo);
                }
              }
            });
          }
        });
      }

      // 8d. Collisions avec le mobilier urbain et stands de rue (Poteaux, Arbres, Primeurs, Bouquinistes, Chariots) sur trottoir
      const isFootOnly = ['run_ak47', 'run_chainsaw'].includes(this.bike.currentBikeId);
      if (!isFlyingCraft && this.environment.chunks) {
        this.environment.chunks.forEach(chunk => {
          if (chunk.userData && chunk.userData.props) {
            chunk.userData.props.forEach(prop => {
              if (!prop.visible || prop.userData.isHit || prop.userData.isStuntRamp || prop.userData.isAerialRing || prop.userData.isSlalomGate) return;
              const worldZ = chunk.position.z + prop.position.z;
              const worldX = chunk.position.x + prop.position.x;
              const dZ = Math.abs(worldZ - this.bike.z);
              const dX = Math.abs(worldX - this.bike.mesh.position.x);

              const isStall = prop.userData.type && prop.userData.type.startsWith('stall_');
              const hitRadiusZ = isStall ? 2.1 : 1.8;
              const hitRadiusX = isStall ? 1.6 : 1.35;

              if (dZ < hitRadiusZ && dX < hitRadiusX) {
                const propType = prop.userData.type || 'lamp';
                // Un homme seul à pied ne peut pas déraciner un arbre ou abattre un poteau
                if (isFootOnly && (propType === 'tree' || propType === 'lamp')) {
                  const nowMs = performance.now();
                  if (!prop.userData.lastBounceAt || nowMs - prop.userData.lastBounceAt > 450) {
                    prop.userData.lastBounceAt = nowMs;
                    const pushDir = (this.bike.mesh.position.x >= worldX) ? 1 : -1;
                    this.bike.x += pushDir * 1.4;
                    gameState.speed *= 0.35;
                    this.engine.triggerCameraShake(0.28);
                    Haptic.impactMedium();
                    if (this.ui) {
                      this.ui.spawnFloatingCombatText('', '💥 OBSTACLE SOLIDE !', '#ffa502', 50, 38);
                    }
                  }
                  return;
                }

                prop.userData.isHit = true;
                dailyMissions.onPropSmash();

                const propPos = new THREE.Vector3(worldX, 1.2, worldZ);

                if (isStall) {
                  this.engine.triggerCameraShake(0.65);
                  const sType = prop.userData.type;

                  if (sType === 'stall_primeur') {
                    soundManager.playMarketStallCrash('primeur');
                    Haptic.impactHeavy();
                    this.particles.spawnFruitSplatter(propPos);
                    this.particles.spawnPropShatter(propPos, 'wood');
                    if (!gameState.isRuinsMode) {
                      gameState.score += 260;
                      this.particles.spawnComicBurst(propPos, 260, gameState.combo);
                      if (this.ui) this.ui.spawnFloatingCombatText('+260', 'PRIMEUR DÉVASTÉ ! 🍎🍊', '#ff4757', 52, 42);
                    }
                  } else if (sType === 'stall_bouquiniste') {
                    soundManager.playMarketStallCrash('books');
                    Haptic.impactMedium();
                    this.particles.spawnBookFlutter(propPos);
                    this.particles.spawnPropShatter(propPos, 'wood');
                    if (!gameState.isRuinsMode) {
                      gameState.score += 280;
                      this.particles.spawnComicBurst(propPos, 280, gameState.combo);
                      if (this.ui) this.ui.spawnFloatingCombatText('+280', 'BOUQUINISTE PULVÉRISÉ ! 📚📖', '#70a1ff', 52, 42);
                    }
                  } else if (sType === 'stall_streetfood') {
                    soundManager.playMarketStallCrash('cart');
                    Haptic.impactHeavy();
                    this.particles.spawnCartCrash(propPos);
                    this.particles.spawnPropShatter(propPos, 'metal');
                    if (!gameState.isRuinsMode) {
                      gameState.score += 320;
                      this.particles.spawnComicBurst(propPos, 320, gameState.combo);
                      if (this.ui) this.ui.spawnFloatingCombatText('+320', 'CHARIOT RENVERSÉ ! 🍦🌭', '#ffa502', 54, 44);
                    }
                  } else if (sType === 'stall_fleuriste') {
                    soundManager.playMarketStallCrash('flowers');
                    Haptic.impactMedium();
                    this.particles.spawnFlowerBurst(propPos);
                    this.particles.spawnPropShatter(propPos, 'terracotta');
                    if (!gameState.isRuinsMode) {
                      gameState.score += 250;
                      this.particles.spawnComicBurst(propPos, 250, gameState.combo);
                      if (this.ui) this.ui.spawnFloatingCombatText('+250', 'FLEURS AU VENT ! 💐🌸', '#ff6b81', 52, 42);
                    }
                  }

                  // Éjection dynamique réaliste du stand
                  prop.position.y += 2.5;
                  prop.rotation.x = Math.PI * 0.88;
                  prop.rotation.z = (prop.position.x > 0 ? 1 : -1) * 1.35;
                  setTimeout(() => { prop.visible = false; }, 550);

                } else {
                  this.engine.triggerCameraShake(0.03);
                  if (this.bike.triggerChassisJolt) {
                    const impactSide = prop.position.x >= this.bike.mesh.position.x ? -1 : 1;
                    this.bike.triggerChassisJolt(impactSide * 0.14, 0.09, -1.6);
                  }
                  const bid = this.bike.currentBikeId;
                  const isHeavyArmor = (bid === 'tank' || bid === 'rouleau' || bid === 'rad_rover');
                  const slowFactor = isHeavyArmor ? 0.95 : (prop.userData.type === 'terrace' ? 0.85 : 0.90);
                  gameState.speed = Math.max(2.0, gameState.speed * slowFactor);

                  soundManager.playPropSmash();
                  Haptic.impactLight();
                  this.triggerPolicePursuitIfCrime('VANDALISME');

                  this.particles.spawnPropShatter(propPos, prop.userData.type || 'lamp');
                  if (prop.userData.type === 'lamp') {
                    if (this.engine.triggerHitStop) this.engine.triggerHitStop(0.045, 0.08);
                    if (this.particles.spawnDirectionalSparks) {
                      this.particles.spawnDirectionalSparks(propPos, new THREE.Vector3(0, 0.7, -1), 12);
                    }
                    if (this.particles.spawnGlassShatter) this.particles.spawnGlassShatter(propPos);
                  }

                  // Basculement physique progressif avec gravité et rebond (recyclé avec le chunk)
                  const fallSide = prop.position.x > this.bike.mesh.position.x ? 1 : -1;
                  const forwardSpeed = Math.max(6.0, gameState.speed * 0.42);
                  prop.userData.fallAnim = {
                    vx: fallSide * (2.2 + Math.random() * 1.4),
                    vy: 2.6 + Math.random() * 1.2,
                    vz: forwardSpeed,
                    rotVelX: 3.8 + Math.random() * 1.2,
                    rotVelZ: -fallSide * (2.4 + Math.random() * 0.8),
                    groundY: 0.14,
                    bounced: false,
                    settled: false
                  };

                  if (!gameState.isRuinsMode) {
                    if (prop.userData.type === 'lamp') {
                      gameState.score += 180;
                      this.particles.spawnComicBurst(propPos, 180, gameState.combo);
                      if (this.ui) this.ui.spawnFloatingCombatText('+180', 'LAMPADAIRE BROYÉ !', '#fffa65', 50, 40);
                    } else if (prop.userData.type === 'tree') {
                      gameState.score += 200;
                      this.particles.spawnComicBurst(propPos, 200, gameState.combo);
                      if (this.ui) this.ui.spawnFloatingCombatText('+200', 'ARBRE DÉRACINÉ !', '#2ed573', 50, 40);
                    } else if (prop.userData.type === 'terrace') {
                      gameState.score += 300;
                      this.particles.spawnComicBurst(propPos, 300, gameState.combo);
                      if (this.ui) this.ui.spawnFloatingCombatText('+300', 'TERRASSE PULVÉRISÉE !', '#ff9f43', 50, 40);
                    }
                  }
                }
              }
            });
          }
        });
      }

      // 9. Gestion des carrefours réalistes, feux et verbalisations (désactivés en plein vol et en mode ballade ruines)
      if (!isFlyingCraft && !gameState.isRuinsMode && !(this.environment && this.environment.isCataclysmMission)) {
        this.intersections.update(
          delta,
          this.bike.z,
          this.bike.mesh.position.x,
          currentSpeed,
          (streetName) => {
            // Verbalisation immédiate pour feu rouge grillé : Réduction du score !
            const penalty = 450;
            gameState.score = Math.max(0, gameState.score - penalty);
            if (storage.recordRedLightRun) storage.recordRedLightRun();
            else if (storage.recordCrashRecovery) storage.recordCrashRecovery(true);
            soundManager.playRedLightViolation();
            this.engine.triggerCameraShake(0.4);
            Haptic.impactHeavy();
            if (this.ui) {
              this.ui.triggerCrashPenaltyUI(penalty);
              this.ui.spawnFloatingCombatText(`-${penalty} PTS`, `PV DRESSÉ ! 🚨 (${streetName || 'FEU ROUGE'})`, '#ff3838', 50, 36);
            }
            this.triggerPolicePursuitIfCrime('FEU ROUGE GRILLÉ');
          },
          (streetName) => {
            // Bonus de civisme : Arrêt parfait au feu rouge avant de repartir !
            gameState.score += 250;
            soundManager.playCoin();
          },
          (z) => this.environment.getRoadCenterX(z),
          (z) => this.environment.getRoadAngle(z),
          (streetName) => {
            if (this.ui) this.ui.showTrafficLightWarning(streetName);
          },
          (crossingCar) => {
            if (isFlyingCraft) return;
            const isSuper = this.bike.isInvulnerable() || gameState.isNitroActive || this.bike.currentBikeId === 'tank' || this.bike.currentBikeId === 'rouleau';
            if (isSuper) {
              // T-BONE CARAMBOLAGE ROYAL ! La voiture transversale est pulvérisée et voltige dans les airs
              crossingCar.isWrecked = true;
              crossingCar.vy = 12.0 + Math.random() * 5.0;
              crossingCar.vx = (crossingCar.velX || 20) * 0.4 + (Math.random() - 0.5) * 12.0;
              crossingCar.rotX = 6.0;
              crossingCar.rotY = 8.0;
              this.engine.triggerCameraShake(0.85);
              if (this.engine.triggerHitStop) this.engine.triggerHitStop(0.045, 0.08);
              soundManager.playCrash();
              soundManager.playExplosion();
              this.particles.spawnCrashBurst(crossingCar.mesh.position);
              if (this.particles.spawnDirectionalSparks) {
                this.particles.spawnDirectionalSparks(crossingCar.mesh.position, new THREE.Vector3(0, 0.8, -1), 16);
              }
              if (this.particles.spawnGlassShatter) this.particles.spawnGlassShatter(crossingCar.mesh.position);
              gameState.recordKill(450, 'CARAMBOLAGE T-BONE', 'car');
              this.particles.spawnComicBurst(crossingCar.mesh.position, 450, gameState.combo);
              if (this.ui) this.ui.spawnFloatingCombatText('+450', 'T-BONE CARAMBOLAGE ! 💥', '#ff9f43', 50, 42);
              Haptic.impactHeavy();
            } else {
              // Accident transversal violent au carrefour !
              const crashed = this.bike.triggerCrash();
              if (crashed) {
                if (this.engine.triggerHitStop) this.engine.triggerHitStop(0.045, 0.08);
                this.engine.triggerCameraShake(0.9);
                soundManager.playCrash();
                soundManager.playPenaltyBuzzer();
                this.particles.spawnCrashBurst(this.bike.mesh.position);
                if (this.particles.spawnDirectionalSparks) {
                  this.particles.spawnDirectionalSparks(crossingCar.mesh.position, new THREE.Vector3(0, 0.8, -1), 16);
                }
                if (this.particles.spawnGlassShatter) this.particles.spawnGlassShatter(crossingCar.mesh.position);
                gameState.applyVehicleCrashPenalty(350);
                if (this.ui) {
                  this.ui.triggerCrashPenaltyUI(350);
                  this.ui.spawnFloatingCombatText('-350', 'T-BONE ACCIDENT ! 🚨', '#eb4d4b', 50, 36);
                }
                Haptic.impactHeavy();
              }
            }
          },
          (crossingCar) => {
            if (isFlyingCraft) return;
            // Frôlage transversal audacieux (Near-Miss)
            gameState.score += 500;
            soundManager.playSpeedBumpBoingFwump(1.4);
            if (this.particles.spawnSparks) {
              this.particles.spawnSparks(new THREE.Vector3(this.bike.mesh.position.x, 0.4, this.bike.z), 12, 0x00cec9);
            }
            if (this.ui) this.ui.spawnFloatingCombatText('+500', 'FRÔLAGE EXTRÊME ! 🔥', '#00cec9', 50, 38);
            Haptic.impactLight();
          }
        );

        // 9a-bis. Feux tricolores des carrefours touchables et destructibles selon l'engin
        if (this.intersections && this.intersections.intersections && !isFlyingCraft && this.bike.jumpAltitude < 1.8) {
          const bid = this.bike.currentBikeId;
          const isHeavyOrNitro = gameState.isNitroActive || this.bike.isInvulnerable() ||
            ['tank', 'rouleau', 'rad_rover', 'bat_moto', 'moto_tron'].includes(bid);

          for (const inter of this.intersections.intersections) {
            [inter.tlLeft, inter.tlRight].forEach(tl => {
              if (!tl || tl.isHit) return;
              const worldX = inter.group.position.x + tl.group.position.x;
              const worldZ = inter.group.position.z + tl.group.position.z;
              if (Math.abs(this.bike.z - worldZ) < 1.65 && Math.abs(this.bike.mesh.position.x - worldX) < 1.35) {
                tl.isHit = true;
                const fallSide = worldX > this.bike.mesh.position.x ? 1 : -1;
                const hitPos = new THREE.Vector3(worldX, 1.2, worldZ);

                tl.fallAnim = {
                  vx: fallSide * (isHeavyOrNitro ? 5.0 : 2.2),
                  vy: isHeavyOrNitro ? 4.5 : 2.4,
                  vz: Math.max(7.0, gameState.speed * (isHeavyOrNitro ? 0.65 : 0.35)),
                  rotVelX: isHeavyOrNitro ? 5.8 : 3.6,
                  rotVelZ: -fallSide * 2.8,
                  groundY: 0.14,
                  bounced: false,
                  settled: false
                };

                soundManager.playPropSmash();
                if (this.particles.spawnDirectionalSparks) {
                  this.particles.spawnDirectionalSparks(hitPos, new THREE.Vector3(0, 0.7, -1), 14);
                }
                if (this.particles.spawnGlassShatter) this.particles.spawnGlassShatter(hitPos);

                if (isHeavyOrNitro) {
                  gameState.speed = Math.max(2.0, gameState.speed * 0.96);
                  if (this.bike.triggerChassisJolt) this.bike.triggerChassisJolt(-fallSide * 0.06, 0.04, -0.7);
                  gameState.score += 250;
                  if (this.ui) this.ui.spawnFloatingCombatText('+250', 'FEU PULVÉRISÉ ! 🚦', '#ffa502', 50, 38);
                } else {
                  gameState.speed = Math.max(2.0, gameState.speed * 0.78);
                  if (this.bike.triggerChassisJolt) this.bike.triggerChassisJolt(-fallSide * 0.18, 0.12, -1.9);
                  gameState.score += 150;
                  if (this.ui) this.ui.spawnFloatingCombatText('+150', 'FEU RENVERSÉ ! 🚦', '#ff6b6b', 50, 38);
                }
                Haptic.impactLight();
                this.triggerPolicePursuitIfCrime('FEU DÉTRUIT');
              }
            });
          }
        }

        // 9b. Franchissement des dos d'âne / ralentisseurs 3D (saut dynamique de l'engin & bonus Air Time)
        if (this.environment.speedBumps) {
          for (let bump of this.environment.speedBumps) {
            if (bump.mesh && !bump.mesh.visible) continue;
            const worldZ = bump.chunk ? (bump.chunk.position.z + bump.localZ) : (bump.z || 0);
            if (!bump.hit && Math.abs(this.bike.z - worldZ) < 1.8) {
              bump.hit = true;
              this.bike.triggerSpeedBumpJump(currentSpeed);

              // Effet sonore dynamique cartoon à ressort "BOING-FWUMP"
              soundManager.playSpeedBumpBoingFwump(Math.min(1.4, 0.6 + currentSpeed / 30));

              // Effet visuel 3D : gerbe d'étincelles et poussière sous le châssis
              const bumpPos = new THREE.Vector3(this.bike.mesh.position.x, 0.15, this.bike.z);
              if (this.particles.spawnSparks) this.particles.spawnSparks(bumpPos, 14, 0x00cec9);
              if (this.particles.spawnExhaustSmoke) this.particles.spawnExhaustSmoke(bumpPos, 1.2);
              // Poussière de contact au sol (latérale, feeling de choc franc)
              if (this.particles.spawnSkidSmoke) {
                this.particles.spawnSkidSmoke(bumpPos);
                this.particles.spawnSkidSmoke(new THREE.Vector3(bumpPos.x - 0.6, 0.1, bumpPos.z));
                this.particles.spawnSkidSmoke(new THREE.Vector3(bumpPos.x + 0.6, 0.1, bumpPos.z));
              }
              this.engine.triggerCameraShake(Math.min(0.3, 0.1 + currentSpeed / 60));

              if (currentSpeed > 8.0) {
                const airPts = Math.round(100 + (currentSpeed * 5));
                gameState.score += airPts;
                this.particles.spawnComicBurst(
                  new THREE.Vector3(this.bike.mesh.position.x, this.bike.mesh.position.y + 1.4, this.bike.z + 1.2),
                  airPts,
                  gameState.combo
                );
                this.engine.triggerCameraShake(Math.min(0.65, 0.35 + (currentSpeed / 45)));
                if (this.ui) this.ui.spawnFloatingCombatText(`+${airPts}`, 'AIR TIME ! 🚀', '#00cec9', 50, 42);
                dailyMissions.onAirTime();
                Haptic.impactLight();
              }
            }
          }
        }
      }

      // 9c. Gestion des projectiles physiques 3D (Obus 120mm, Missiles, Plasma EMP)
      if (this.projectiles) {
        this.projectiles.update(delta, this.bike.z, this.traffic, this.characters, this.environment, gameState, this.ui);
      }

      // 10. Particules, étoiles et lignes de vitesse
      this.particles.update(delta, this.bike.z, currentSpeed, this.bike.mesh.position.x, gameState.isNitroActive);

      // 10b. Pigeons parisiens vivants : Picorent et s'envolent au passage de la moto
      if (!isFlyingCraft) {
        this.pigeons.update(
          delta,
          this.bike.z,
          this.bike.mesh.position,
          currentSpeed,
          (z) => this.environment.getRoadCenterX(z),
          (pigeon) => {
            soundManager.playPigeonFlutter();
            this.particles.spawnComicBurst(pigeon.position, 150, gameState.combo);
            gameState.score += 150;
          }
        );
      }

      // 10c. Détection Cataclysme Worldmageddon : Approcher le monument, exploser, s'enfuir
      if (gameState.disasterType !== 'STREET') {
        if (gameState.cataclysmPhase === 'APPROACH' && this.bike.z >= 580) {
          this.triggerCityCataclysm();
        } else if (gameState.cataclysmPhase === 'APPROACH' && this.bike.z > 350) {
          if (gameState.disasterType === 'NUCLEAR' && Math.random() < 0.08) soundManager.playGeigerClick();
          else if (gameState.disasterType === 'DAM' && Math.random() < 0.05) soundManager.playWaterRush();
          else if (gameState.disasterType === 'MOUNTAIN' && Math.random() < 0.05) soundManager.playRockAvalanche();
        }
      }

      // 10d. Mécaniques et collisions des 5 Épreuves Spéciales
      this.updateChallengeHooks(delta, currentSpeed, isFlyingCraft);

      // 11. Caméra dynamique poursuite gameplay
      const lookAheadRoadX = this.environment.getRoadCenterX(this.bike.z + 18.0) + this.bike.x * 0.7;
      this.engine.updateCameraGameplay(delta, this.bike.mesh.position, currentSpeed, lookAheadRoadX, roadAngle, gameState.isNitroActive);

      // 12. Mise à jour de l'état de course (accélération, décélération, combo, vitesse arrêtée lors d'un crash)
      gameState.update(delta, this.bike.isCrashed, this.bike.jumpAltitude > 0.35);

      // 13. Conquête de la zone d'assaut urbain (Périmètre purgé au feu - Fin de l'épreuve)
      if (!gameState.isRuinsMode && !this.hasCrossedFinish && (this.bike.z >= this.environment.finishDistance || (this.bike.z / this.environment.finishDistance) >= 1.0)) {
        this.hasCrossedFinish = true;
        gameState.speed = 0;
        gameState.targetSpeed = 0;

        // Arrêt immédiat et définitif de tous les sons de gameplay persistants
        soundManager.stopAllGameplaySounds();
        soundManager.playVictory();
        Haptic.carnage();
        this.particles.spawnCannonBlast(this.bike.mesh.position, 8);
        this.engine.triggerDynamicLight(this.bike.mesh.position, 0xff3838, 30, 0.9);

        // Clôture visuelle et triomphale de la zone (Assaut sectoriel d'abord pour éviter tout doublon de modale)
        if (this.ui) {
          this.ui.triggerCarnageAssaultFinish(gameState.selectedCity, gameState.score, gameState.killsCount || 35);
        }

        // Clôture officielle de l'épreuve
        gameState.endRun();
      }
    } else if (gameState.currentMode === 'COUNTDOWN') {
      // MODE COMPTE À REBOURS : Moto strictement à l'arrêt sur la ligne de départ
      const roadCenterX = this.environment.getRoadCenterX(this.bike.z);
      const roadAngle = this.environment.getRoadAngle(this.bike.z);

      this.bike.update(delta, 0, 0);
      this.bike.mesh.position.x = roadCenterX + this.bike.x;
      this.bike.mesh.position.z = this.bike.z;
      this.bike.mesh.rotation.y = roadAngle;

      if (!['run_ak47', 'run_chainsaw', 'cheval'].includes(this.bike.currentBikeId)) {
        soundManager.updateEngine(0.08); // Ralenti moteur doux à l'arrêt
      }
      this.environment.update(this.bike.z, delta);
      this.particles.update(delta, this.bike.z, 0);
      this.engine.updateCameraGameplay(delta, this.bike.mesh.position, 0);
    } else {
      // Modes SPLASH, MENU, GARAGE, PAUSE : Caméra cinématique 360°
      this.engine.updateCameraCinematic(delta, this.bike.mesh.position);
      this.particles.update(delta, this.bike.z, 0);
    }

    // Rendu Three.js
    this.engine.render();
    } catch (loopErr) {
      console.error('[CarnageCruise] Loop error:', loopErr);
    }
  }
}

// Lancement automatique fiable dès que le DOM est prêt
function boot() {
  try {
    new GameApp();
  } catch (e) {
    console.error('[CarnageCruise] Boot Error:', e);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

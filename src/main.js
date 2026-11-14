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

    // 2. Initialiser les entités
    this.bike = new Bike(this.engine.scene);
    this.characters = new CharacterSystem(this.engine.scene);
    this.environment = new Environment(this.engine.scene);
    this.particles = new ParticleSystem(this.engine.scene);
    this.traffic = new Traffic(this.engine.scene, this.particles);
    this.pigeons = new PigeonSystem(this.engine.scene);
    this.intersections = new IntersectionManager(this.engine.scene);
    this.projectiles = new ProjectileManager(this.engine.scene, this.particles, soundManager, this.engine);

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

    // 7. Horloge d'animation Three.js
    this.clock = new THREE.Clock();

    // Démarrer la boucle principale à 60 FPS
    requestAnimationFrame((t) => this.loop(t));

    // Poignée de débogage (dev) : inspection du pipeline de rendu dans la console
    window.__mm = { app: this, engine: this.engine, sound: soundManager };
    } catch (e) {
      console.error('[CarnageCruise] Constructor error:', e);
    }
  }

  setupCity(cityDef) {
    if (gameState.isRuinsMode) {
      this.engine.applyRuinsAtmosphere();
      this.environment.setCity(cityDef, null, true);
      this.characters.reset();
      if (this.traffic) this.traffic.reset();
      if (this.projectiles) this.projectiles.reset();
      this.intersections.reset();
      return;
    }

    this.engine.applyCityAtmosphere(cityDef);
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

      this.isPointerDown = true;
      this.touchStartX = e.clientX;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown || gameState.currentMode !== 'PLAYING') return;

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

    const endPointer = () => {
      this.isPointerDown = false;
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
        const city = payload || gameState.selectedCity;
        if (city && city.id) {
          gameState.selectCity(city.id);
        }

        // Équipement et reconstruction immédiate de l'engin sélectionné
        const equippedBikeId = gameState.selectedBike?.id || storage.getEquippedBike() || 'tank';
        this.bike.buildCurrentBike(equippedBikeId);
        this.bike.buildRider();

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

        if (gameState.isRuinsMode) {
          soundManager.stopMusic();
          soundManager.playGeigerClick();
          if (this.intersections) this.intersections.reset();
          if (this.traffic) this.traffic.reset();
          if (this.ui) {
            this.ui.showToastUnlock({ name: '🏚️ BALLADE LIBRE — RUINES DE LA VILLE ANÉANTIE' });
          }
        } else {
          // MODE NUIT ALÉATOIRE (~35% des runs) : bascule l'ambiance 3D après
          // l'atmosphère de la ville — phares, réverbères et fenêtres en vedette
          this.isNightRun = Math.random() < 0.35;
          this.engine.applyNightAtmosphere(this.isNightRun);
          if (this.traffic && this.traffic.setNightMode) this.traffic.setNightMode(this.isNightRun);
          if (this.isNightRun && this.ui) {
            this.ui.showToastUnlock({ name: '🌙 COURSE DE NUIT — PLEINS PHARES !' });
          }
        }

        gameState.startRun();
      } else if (action === 'EXIT_RUINS' || action === 'RETURN_MAP') {
        gameState.isRuinsMode = false;
        gameState.currentMode = 'MAP';
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
        soundManager.stopEngine();
      } else if (action === 'RESUME') {
        gameState.currentMode = 'PLAYING';
        soundManager.startEngine();
      } else if (action === 'CHANGE_BIKE_IN_GAME') {
        const bikeObj = payload;
        const bikeId = (bikeObj && bikeObj.id) ? bikeObj.id : (typeof bikeObj === 'string' ? bikeObj : storage.getEquippedBike());
        if (bikeId) {
          storage.equipBike(bikeId);
          gameState.selectBike(bikeId);
          const prevX = this.bike.x;
          const prevZ = this.bike.z;
          const prevWorldX = this.bike.mesh.position.x;
          this.bike.buildCurrentBike(bikeId);
          this.bike.buildRider();
          this.bike.x = prevX;
          this.bike.z = prevZ;
          this.bike.mesh.position.x = prevWorldX;
          this.bike.mesh.position.z = prevZ;
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

    if (attack.type === 'missile' || attack.type === 'torpedo' || attack.type === 'ice_missile') {
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
              this.traffic.blowUpVehicle(v, this.bike.mesh.position);
              gameState.score += 1200;
              this.particles.spawnComicBurst(v.position, 1200, gameState.combo);
              if (this.ui) this.ui.spawnFloatingCombatText('+1200', 'INFERNO !', '#ff9f43', 50, 38);
              Haptic.impactHeavy();
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
      this.particles.spawnShockwave(new THREE.Vector3(bikeX, this.bike.mesh.position.y + 0.8, bikeZ + 2.0), 0xfffa65);
      this.engine.triggerCameraShake(0.55);

      if (this.traffic) {
        this.traffic.vehicles.forEach(v => {
          if (v.userData.active && !v.userData.isCrashed) {
            const vZ = v.position.z - bikeZ;
            const vX = Math.abs(v.position.x - bikeX);
            if (vZ > 1.5 && vZ < attack.range && vX < attack.radius) {
              this.traffic.blowUpVehicle(v, this.bike.mesh.position);
              gameState.score += 1100;
              this.particles.spawnComicBurst(v.position, 1100, gameState.combo);
              soundManager.playCrash();
              if (this.ui) this.ui.spawnFloatingCombatText('+1100', 'BLAST !', '#ffd32a', 50, 38);
              Haptic.impactHeavy();
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
              this.traffic.blowUpVehicle(v, this.bike.mesh.position);
              gameState.score += 1600;
              this.particles.spawnComicBurst(v.position, 1600, gameState.combo);
              soundManager.playCrash();
              if (this.ui) this.ui.spawnFloatingCombatText('+1600', 'ÉCRASÉ !', '#f368e0', 50, 38);
              Haptic.impactHeavy();
            }
          }
        });
      }
      return;
    }

    // Détection d'impact sur les piétons situés dans l'arc d'attaque
    const bikeZ = this.bike.z;
    const bikeX = this.bike.mesh.position.x;
    let hitCount = 0;

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

  loop() {
    requestAnimationFrame(() => this.loop());

    const delta = Math.min(this.clock.getDelta(), 0.1); // Sécurité contre les sauts de frame
    TWEEN.update();

    // Calcul du braquage final (tactile ou clavier)
    let currentSteer = this.steerInput;
    if (this.keys.left) currentSteer = -1.0;
    else if (this.keys.right) currentSteer = 1.0;

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

      // 4b. EFFETS DE SURFACE : montée de trottoir & frôlement des façades
      // Montée sur le trottoir (|x| > 4.25m) : gerbe d'étincelles de bordure,
      // poussière, micro-secousse caméra et retour haptique à l'impact
      const bikeAbsX = Math.abs(this.bike.x);
      const onSidewalkNow = bikeAbsX > 4.25;
      if (onSidewalkNow !== this._wasOnSidewalk) {
        this._wasOnSidewalk = onSidewalkNow;
        if (onSidewalkNow && currentSpeed > 4 && !isFlyingCraft) {
          const curbPos = new THREE.Vector3(this.bike.mesh.position.x, 0.12, this.bike.z);
          this.particles.spawnSparks(curbPos, 10, 0xb2bec3);
          // Dérapage prononcé : 4 volutes de fumée épaisses le long du trottoir
          if (this.particles.spawnSkidSmoke) {
            for (let i = 0; i < 4; i++) {
              this.particles.spawnSkidSmoke(new THREE.Vector3(
                this.bike.mesh.position.x + (Math.random() - 0.5) * 0.6,
                0.1, this.bike.z - i * 0.6
              ));
            }
          }
          this.engine.triggerCameraShake(0.15);
          Haptic.impactLight();
        }
      }

      // Frôlement des façades (proche de la bordure extrême |x| > 5.45m) :
      // gerbe d'étincelles continue le long du mur + grincement régulier
      if (bikeAbsX > 5.45 && currentSpeed > 6 && !isFlyingCraft && !this.bike.isCrashed) {
        this._wallScrapeTimer = (this._wallScrapeTimer || 0) - delta;
        if (this._wallScrapeTimer <= 0) {
          this._wallScrapeTimer = 0.14;
          const side = Math.sign(this.bike.x);
          const wallPos = new THREE.Vector3(
            this.bike.mesh.position.x + side * 0.55,
            0.45 + Math.random() * 0.5,
            this.bike.z - 0.3 + Math.random() * 0.8
          );
          this.particles.spawnSparks(wallPos, 6, 0xffd32a);
          if (this.particles.spawnSkidSmoke) {
            this.particles.spawnSkidSmoke(new THREE.Vector3(wallPos.x, 0.1, wallPos.z));
          }
          soundManager.playWallScrape(side);
          this.engine.triggerCameraShake(0.06);
        }
        // Inclinaison visuelle de la moto vers le mur (frottement)
        const side = Math.sign(this.bike.x);
        this.bike.mesh.rotation.z = THREE.MathUtils.lerp(
          this.bike.mesh.rotation.z, side * 0.12, delta * 8
        );
      } else {
        // Récupération de l'inclinaison
        this.bike.mesh.rotation.z = THREE.MathUtils.lerp(this.bike.mesh.rotation.z, 0, delta * 10);
      }

      // 5. Son moteur réactif (ronronnement ralenti à l'arrêt, accélération dynamique)
      if (!this.hasCrossedFinish) {
        soundManager.updateEngine(currentSpeed / 20.0);

        // Modulation d'intensité dynamique de la musique sadique (CALM, TENSION, COMBO)
        if (gameState.isNitroActive || gameState.combo >= 3 || currentSpeed > 24) {
          soundManager.setSadisticIntensity('COMBO');
        } else if (currentSpeed > 7) {
          soundManager.setSadisticIntensity('TENSION');
        } else {
          soundManager.setSadisticIntensity('CALM');
        }
      }

      // 6. Fumée d'échappement et fumée de dérapage au freinage
      if (currentSpeed > 1.0) {
        this.particles.spawnExhaustSmoke(this.bike.getExhaustPosition(), currentSpeed / 20.0);
      }
      if (gameState.isBraking && currentSpeed > 3.5) {
        this.particles.spawnSkidSmoke(this.bike.mesh.position);
      }

      // 7. Génération et recyclage du monde 3D
      this.environment.update(this.bike.z, delta);

      // 8. Ambiance Spécifique Ruines ou Gameplay Vivant Normal
      if (gameState.isRuinsMode) {
        // En mode Ruines : Cité anéantie sans survivant, pas de piétons vivants ni de trafic
        if (Math.random() < 0.03) soundManager.playGeigerClick();
        if (Math.random() < 0.28 && this.particles) {
          const sparkPos = new THREE.Vector3(
            this.bike.x + (Math.random() - 0.5) * 16,
            Math.random() * 3.5 + 0.4,
            this.bike.z + (Math.random() - 0.5) * 22
          );
          this.particles.spawnSpark(sparkPos, Math.random() < 0.35 ? 0xff4757 : 0x7f8c8d);
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

            // Si série de carnages ou choc sur piéton, dépêcher l'ambulance d'urgence !
            if (this.traffic && (gameState.combo >= 2 || Math.random() < 0.4)) {
              this.traffic.spawnEmergencyAmbulance(this.bike.z, (z) => this.environment.getRoadCenterX(z));
            }
          },
          (z) => this.environment.getRoadCenterX(z),
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
            (z) => this.environment.getRoadCenterX(z),
            (car, isPlayerInvuln) => {
              if (isFlyingCraft) return; // En vol dans les airs, la circulation au sol ne heurte pas le jet
              if (isPlayerInvuln || gameState.isNitroActive || this.bike.currentBikeId === 'rouleau' || this.bike.currentBikeId === 'tank') {
                // Carambolage royal ! La voiture vole en éclats
                this.engine.triggerCameraShake(0.65);
                soundManager.playCrash();
                this.particles.spawnCrashBurst(car.position);
                gameState.recordKill(280, 'CARAMBOLAGE', 'car');
                this.particles.spawnComicBurst(car.position, 280, gameState.combo);
                if (this.ui) this.ui.spawnFloatingCombatText('+280', 'WRECKAGE !', '#ffa502', 50, 40);
                Haptic.impactHeavy();
              } else {
                // Collision avec un véhicule de circulation
                const crashed = this.bike.triggerCrash();
                if (crashed) {
                  this.engine.triggerCameraShake(0.75);
                  soundManager.playCrash();
                  soundManager.playPenaltyBuzzer();
                  this.particles.spawnCrashBurst(this.bike.mesh.position);
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

          // Impact des balles sur les véhicules de circulation
          if (this.traffic) {
            this.traffic.vehicles.forEach(v => {
              if (!v.visible || v.userData.isCrashed) return;
              const dZ = Math.abs(v.position.z - b.position.z);
              const dX = Math.abs(v.position.x - b.position.x);
              if (dZ < 2.4 && dX < 1.4) {
                b.userData.active = false;
                b.visible = false;
                this.traffic.triggerCrash(v, 28, (b.position.x > v.position.x ? 1 : -1));
                this.particles.spawnCrashBurst(v.position);
                gameState.score += 180;
                this.particles.spawnComicBurst(v.position, 180, gameState.combo);
              }
            });
          }
        });
      }

      // 8d. Collisions avec le mobilier urbain et stands de rue (Poteaux, Arbres, Primeurs, Bouquinistes, Chariots) sur trottoir
      if (!isFlyingCraft && this.environment.chunks) {
        this.environment.chunks.forEach(chunk => {
          if (chunk.userData && chunk.userData.props) {
            chunk.userData.props.forEach(prop => {
              if (!prop.visible || prop.userData.isHit) return;
              const worldZ = chunk.position.z + prop.position.z;
              const worldX = chunk.position.x + prop.position.x;
              const dZ = Math.abs(worldZ - this.bike.z);
              const dX = Math.abs(worldX - this.bike.mesh.position.x);

              const isStall = prop.userData.type && prop.userData.type.startsWith('stall_');
              const hitRadiusZ = isStall ? 2.1 : 1.8;
              const hitRadiusX = isStall ? 1.6 : 1.35;

              if (dZ < hitRadiusZ && dX < hitRadiusX) {
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
                  this.engine.triggerCameraShake(0.52);
                  soundManager.playPropSmash();
                  Haptic.impactLight();

                  this.particles.spawnPropShatter(propPos, prop.userData.type || 'lamp');

                  // Animation physique d'éjection et fracas de l'objet
                  prop.position.y += 2.2;
                  prop.rotation.x = Math.PI * 0.85;
                  prop.rotation.z = (prop.position.x > 0 ? 1 : -1) * 1.2;
                  setTimeout(() => { prop.visible = false; }, 550);

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
      if (!isFlyingCraft && !gameState.isRuinsMode) {
        this.intersections.update(
          delta,
          this.bike.z,
          this.bike.mesh.position.x,
          currentSpeed,
          (streetName) => {
            // Verbalisation immédiate pour feu rouge grillé : Réduction du score !
            const penalty = 450;
            gameState.score = Math.max(0, gameState.score - penalty);
            storage.recordRedLightRun();
            soundManager.playRedLightViolation();
            this.engine.triggerCameraShake(0.4);
            Haptic.impactHeavy();
            if (this.ui) {
              this.ui.triggerCrashPenaltyUI(penalty);
              this.ui.spawnFloatingCombatText(`-${penalty} PTS`, `PV DRESSÉ ! 🚨 (${streetName || 'FEU ROUGE'})`, '#ff3838', 50, 36);
            }
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
              soundManager.playCrash();
              soundManager.playExplosion();
              this.particles.spawnCrashBurst(crossingCar.mesh.position);
              gameState.recordKill(450, 'CARAMBOLAGE T-BONE', 'car');
              this.particles.spawnComicBurst(crossingCar.mesh.position, 450, gameState.combo);
              if (this.ui) this.ui.spawnFloatingCombatText('+450', 'T-BONE CARAMBOLAGE ! 💥', '#ff9f43', 50, 42);
              Haptic.impactHeavy();
            } else {
              // Accident transversal violent au carrefour !
              const crashed = this.bike.triggerCrash();
              if (crashed) {
                this.engine.triggerCameraShake(0.9);
                soundManager.playCrash();
                soundManager.playPenaltyBuzzer();
                this.particles.spawnCrashBurst(this.bike.mesh.position);
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

        // 9b. Franchissement des dos d'âne / ralentisseurs 3D (saut dynamique de l'engin & bonus Air Time)
        if (this.environment.speedBumps) {
          for (let bump of this.environment.speedBumps) {
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

      // 11. Caméra dynamique en poursuite douce avec anticipation de la courbe routière
      const lookAheadRoadX = this.environment.getRoadCenterX(this.bike.z + 18.0) + this.bike.x * 0.7;
      this.engine.updateCameraGameplay(delta, this.bike.mesh.position, currentSpeed, lookAheadRoadX, roadAngle);

      // 12. Mise à jour de l'état de course (accélération, décélération, combo, vitesse arrêtée lors d'un crash)
      gameState.update(delta, this.bike.isCrashed);

      // 13. Conquête de la zone d'assaut urbain (Périmètre purgé au feu - Fin de l'épreuve)
      if (!gameState.isRuinsMode && !this.hasCrossedFinish && (this.bike.z >= this.environment.finishDistance || (this.bike.z / this.environment.finishDistance) >= 1.0)) {
        this.hasCrossedFinish = true;
        this.bike.speed = 0; // Arrêt net du bolide

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

      soundManager.updateEngine(0.08); // Ralenti moteur doux à l'arrêt
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

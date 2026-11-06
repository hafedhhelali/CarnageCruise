/**
 * Motormageddon - Point d'Entrée Principal du Jeu
 * Intégration du moteur 3D, physique de conduite avec virages, feux et carrefours,
 * freinage complet avec arrêt/reprise, collisions burlesques et célébration d'arrivée.
 */

import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { gameState, CITIES } from './core/GameState.js';
import { storage } from './core/Storage.js';
import { soundManager } from './audio/SoundManager.js';
import { Bike } from './entities/Bike.js';
import { CharacterSystem } from './entities/Characters.js';
import { Environment } from './entities/Environment.js';
import { ParticleSystem } from './entities/Particles.js';
import { IntersectionManager } from './entities/Intersections.js';
import { Traffic } from './entities/Traffic.js';
import { UIManager } from './ui/UIManager.js';
import * as TWEEN from '@tweenjs/tween.js';

class GameApp {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.uiRoot = document.getElementById('ui-root');

    // 1. Initialiser le moteur 3D
    this.engine = new Engine(this.canvas);

    // 2. Initialiser les entités
    this.bike = new Bike(this.engine.scene);
    this.characters = new CharacterSystem(this.engine.scene);
    this.environment = new Environment(this.engine.scene);
    this.traffic = new Traffic(this.engine.scene);
    this.particles = new ParticleSystem(this.engine.scene);
    this.intersections = new IntersectionManager(this.engine.scene);

    // 3. État des contrôles et de la course
    this.steerInput = 0;
    this.touchStartX = null;
    this.isPointerDown = false;
    this.keys = { left: false, right: false, brake: false };
    this.hasCrossedFinish = false;

    // 4. Initialiser l'interface utilisateur
    this.ui = new UIManager(this.uiRoot, (action, payload) => this.handleUIAction(action, payload));

    // 5. Configurer la première ville
    this.setupCity(gameState.selectedCity);

    // 6. Connecter les entrées tactiles et clavier
    this.bindInputEvents();

    // 7. Horloge d'animation Three.js
    this.clock = new THREE.Clock();

    // Démarrer la boucle principale à 60 FPS
    requestAnimationFrame((t) => this.loop(t));
  }

  setupCity(cityDef) {
    this.engine.applyCityAtmosphere(cityDef);
    this.environment.setCity(cityDef);
    this.characters.reset();
    if (this.traffic) this.traffic.reset();
    this.intersections.reset();
  }

  bindInputEvents() {
    // --- CONTRÔLES TACTILES MOBILES (TOUCH & POINTER) ---
    window.addEventListener('pointerdown', (e) => {
      soundManager.resumeContext();
      if (storage.data.settings.music && !soundManager.musicPlaying && (gameState.currentMode === 'SPLASH' || gameState.currentMode === 'MAP' || gameState.currentMode === 'GARAGE')) {
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
      if (Math.abs(deltaX) < 4) {
        this.steerInput = 0;
        return;
      }
      const sensitivity = 0.0045; // Pilotage souple, précis et non brutal
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
    if (action === 'START_RUN') {
      const city = payload;
      this.setupCity(city);
      this.bike.mesh.position.set(0, 0, 0);
      this.bike.x = 0;
      this.bike.z = 0;
      this.bike.isCrashed = false;
      this.bike.crashTimer = 0;
      this.hasCrossedFinish = false;
      this.characters.reset();
      this.intersections.reset();
      this.particles.reset();
      gameState.startRun();
    } else if (action === 'PAUSE') {
      gameState.currentMode = 'PAUSED';
      soundManager.stopEngine();
    } else if (action === 'RESUME') {
      gameState.currentMode = 'PLAYING';
      soundManager.startEngine();
    } else if (action === 'PREVIEW_BIKE' || action === 'BIKE_EQUIPPED') {
      const bikeId = (payload && payload.id) ? payload.id : payload;
      this.bike.buildCurrentBike(bikeId);
    } else if (action === 'COLOR_CHANGED') {
      const bikeId = (payload && payload.bikeId) ? payload.bikeId : null;
      this.bike.buildCurrentBike(bikeId);
    } else if (action === 'HORN' || action === 'ATTACK') {
      this.executePlayerAttack();
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

      // 1. Déflagration d'obus et onde de choc au frein de bouche du canon 120mm
      this.particles.spawnShockwave(muzzlePos, 0xff793f);
      this.particles.spawnCannonBlast(muzzlePos);
      this.engine.triggerCameraShake(0.72);

      let hits = 0;

      // 2. Pulvérisation des voitures sur la trajectoire du tir
      if (this.traffic) {
        this.traffic.vehicles.forEach(v => {
          if (v.userData.active && !v.userData.isCrashed) {
            const vZ = v.position.z - bikeZ;
            const vX = Math.abs(v.position.x - bikeX);
            if (vZ > 1.2 && vZ < attack.range && vX < attack.radius) {
              this.traffic.blowUpVehicle(v, this.bike.mesh.position);
              this.particles.spawnCannonBlast(v.position);
              const carPts = 1500;
              gameState.score += carPts;
              this.particles.spawnComicBurst(v.position, carPts, gameState.combo);
              soundManager.playCrash();
              hits++;
            }
          }
        });
      }

      // 3. Déflagration d'obus sur les piétons
      this.characters.characters.forEach(char => {
        if (!char.group.visible || char.isFlying) return;
        const dZ = char.group.position.z - bikeZ;
        const dX = Math.abs(char.group.position.x - bikeX);
        if (dZ > 1.0 && dZ < attack.range && dX < attack.radius) {
          this.characters.triggerSlapstickFlight(char, bikeX, 48);
          this.particles.spawnCannonBlast(char.group.position);
          this.particles.spawnBloodBurst(char.group.position);
          this.ui.triggerPedestrianCarnageFlash();
          gameState.recordKill(850, 'WEAPON_CANNON', char.typeDef.category);
          hits++;
        }
      });

      // 4. Dégâts collatéraux sur le mobilier urbain
      this.environment.chunks.forEach(chunk => {
        if (chunk.userData && chunk.userData.props) {
          chunk.userData.props.forEach(prop => {
            if (prop.userData.isHit) return;
            const worldZ = chunk.position.z + prop.position.z;
            const worldX = chunk.position.x + prop.position.x;
            const pZ = worldZ - bikeZ;
            const pX = Math.abs(worldX - bikeX);
            if (pZ > 1.0 && pZ < attack.range && pX < attack.radius) {
              prop.userData.isHit = true;
              prop.rotation.z = (prop.position.x > 0 ? 1 : -1) * 1.1;
              this.particles.spawnCannonBlast(new THREE.Vector3(worldX, 1.0, worldZ));
              soundManager.playPropSmash();
            }
          });
        }
      });

      if (hits > 0) {
        soundManager.playCoin();
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

  loop() {
    requestAnimationFrame(() => this.loop());

    const delta = Math.min(this.clock.getDelta(), 0.1); // Sécurité contre les sauts de frame
    TWEEN.update();

    // Calcul du braquage final (tactile ou clavier)
    let currentSteer = this.steerInput;
    if (this.keys.left) currentSteer = -1.0;
    else if (this.keys.right) currentSteer = 1.0;

    if (gameState.currentMode === 'PLAYING') {
      // 1. Calcul de la vitesse effective avec gestion de l'accident et du freinage
      let currentSpeed = gameState.speed;
      if (this.bike.isCrashed) {
        currentSpeed = 0;
      }

      // 2. Déplacement de la moto vers l'avant selon la vitesse réelle
      this.bike.z += currentSpeed * delta;

      // 3. Suivi de la courbure de la route (virages gauche/droite réalistes)
      const roadCenterX = this.environment.getRoadCenterX(this.bike.z);
      const roadAngle = this.environment.getRoadAngle(this.bike.z);

      // 4. Physique de direction, suspension et inclinaison
      this.bike.update(delta, currentSteer, currentSpeed);
      this.bike.mesh.position.x = roadCenterX + this.bike.x;
      this.bike.mesh.position.z = this.bike.z;
      this.bike.mesh.rotation.y = roadAngle;

      // 5. Son moteur réactif (ronronnement ralenti à l'arrêt, accélération dynamique)
      soundManager.updateEngine(currentSpeed / 20.0);

      // 6. Fumée d'échappement et fumée de dérapage au freinage
      if (currentSpeed > 1.0) {
        this.particles.spawnExhaustSmoke(this.bike.getExhaustPosition(), currentSpeed / 20.0);
      }
      if (gameState.isBraking && currentSpeed > 3.5) {
        this.particles.spawnSkidSmoke(this.bike.mesh.position);
      }

      // 7. Génération et recyclage du monde 3D
      this.environment.update(this.bike.z, delta);

      // 8. Gestion des piétons (Trottoirs & Passages Piétons), collisions burlesques et frôlements (near-miss)
      this.characters.update(
        delta,
        this.bike.z,
        this.bike.mesh.position.x,
        currentSpeed,
        (hitChar) => {
          // Suite à un accident, quand le bolide clignote (invulnérable), impossible de heurter qui que ce soit !
          if (this.bike.isInvulnerable()) return;

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
          if (this.ui) this.ui.triggerPedestrianCarnageFlash();
          gameState.recordKill(bonusPts, categoryLabel, hitChar.typeDef.category);

          // Si série de carnages ou choc sur piéton, dépêcher l'ambulance d'urgence !
          if (this.traffic && (gameState.combo >= 2 || Math.random() < 0.4)) {
            this.traffic.spawnEmergencyAmbulance(this.bike.z, (z) => this.environment.getRoadCenterX(z));
          }
        },
        (z) => this.environment.getRoadCenterX(z),
        (nearChar) => {
          // Frôlement / Near-Miss à pleine vitesse !
          if (this.bike.isInvulnerable()) return;
          gameState.addNearMiss();
          this.particles.spawnComicBurst(nearChar.group.position, 75, gameState.combo);
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
            if (isPlayerInvuln || gameState.isNitroActive || this.bike.currentBikeId === 'rouleau' || this.bike.currentBikeId === 'tank' || this.bike.currentBikeId === 'aero_jet') {
              // Carambolage royal ! La voiture vole en éclats
              this.engine.triggerCameraShake(0.65);
              soundManager.playCrash();
              this.particles.spawnCrashBurst(car.position);
              gameState.score += 500;
              gameState.recordKill(500, 'CARAMBOLAGE', 'car');
              this.particles.spawnComicBurst(car.position, 500, gameState.combo);
            } else {
              // Collision avec un véhicule de circulation
              const crashed = this.bike.triggerCrash();
              if (crashed) {
                this.engine.triggerCameraShake(0.75);
                soundManager.playCrash();
                soundManager.playPenaltyBuzzer();
                this.particles.spawnCrashBurst(this.bike.mesh.position);
                gameState.applyVehicleCrashPenalty(300);
                if (this.ui) this.ui.triggerCrashPenaltyUI(300);
              }
            }
          },
          this.bike.isInvulnerable()
        );
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
              this.particles.spawnComicBurst(char.group.position, 500, gameState.combo);
              this.particles.spawnBloodBurst(char.group.position);
              gameState.recordKill(500, 'WEAPON_SHOOT', char.typeDef.category);
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
                gameState.score += 350;
                this.particles.spawnComicBurst(v.position, 350, gameState.combo);
              }
            });
          }
        });
      }

      // 8d. Collisions avec le mobilier urbain (Poteaux, Arbres, Terrasses) sur trottoir
      if (this.environment.chunks) {
        this.environment.chunks.forEach(chunk => {
          if (chunk.userData && chunk.userData.props) {
            chunk.userData.props.forEach(prop => {
              if (prop.userData.isHit) return;
              const worldZ = chunk.position.z + prop.position.z;
              const worldX = chunk.position.x + prop.position.x;
              const dZ = Math.abs(worldZ - this.bike.z);
              const dX = Math.abs(worldX - this.bike.mesh.position.x);

              if (dZ < 1.8 && dX < 1.35) {
                prop.userData.isHit = true;
                this.engine.triggerCameraShake(0.5);

                if (prop.userData.type === 'lamp') {
                  soundManager.playPropSmash();
                  prop.rotation.z = (prop.position.x > 0 ? 1 : -1) * 0.9;
                  this.particles.spawnCrashBurst(new THREE.Vector3(worldX, 2.0, worldZ));
                  gameState.score += 180;
                  this.particles.spawnComicBurst(new THREE.Vector3(worldX, 2.0, worldZ), 180, gameState.combo);
                } else if (prop.userData.type === 'tree') {
                  soundManager.playPropSmash();
                  prop.rotation.z = (Math.random() - 0.5) * 0.35;
                  this.particles.spawnExhaustSmoke(new THREE.Vector3(worldX, 3.0, worldZ), 3.0);
                  gameState.score += 200;
                  this.particles.spawnComicBurst(new THREE.Vector3(worldX, 2.5, worldZ), 200, gameState.combo);
                } else if (prop.userData.type === 'terrace') {
                  soundManager.playPropSmash();
                  prop.position.y += 2.2;
                  prop.rotation.x = Math.PI * 0.8;
                  this.particles.spawnCrashBurst(new THREE.Vector3(worldX, 1.0, worldZ));
                  gameState.score += 300;
                  this.particles.spawnComicBurst(new THREE.Vector3(worldX, 1.5, worldZ), 300, gameState.combo);
                }
              }
            });
          }
        });
      }

      // 9. Gestion des carrefours réalistes, feux et trafic transversal
      this.intersections.update(
        delta,
        this.bike.z,
        this.bike.mesh.position.x,
        currentSpeed,
        (crossingCar) => {
          // Suite à un accident, quand le bolide clignote (invulnérable), impossible d'être heurté !
          if (this.bike.isInvulnerable()) return;

          const crashed = this.bike.triggerCrash();
          if (crashed) {
            this.engine.triggerCameraShake(0.75);
            soundManager.playCrash();
            soundManager.playPenaltyBuzzer();
            this.particles.spawnCrashBurst(this.bike.mesh.position);
            gameState.applyVehicleCrashPenalty(350);
            storage.recordRedLightRun();
            if (this.ui) this.ui.triggerCrashPenaltyUI(350);
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
        }
      );

      // 10. Particules, étoiles et lignes de vitesse
      this.particles.update(delta, this.bike.z, currentSpeed);

      // 11. Caméra dynamique en poursuite douce
      this.engine.updateCameraGameplay(delta, this.bike.mesh.position, currentSpeed);

      // 12. Mise à jour de l'état de course (accélération, décélération, combo, vitesse arrêtée lors d'un crash)
      gameState.update(delta, this.bike.isCrashed);

      // 13. Franchissement de la ligne d'arrivée
      if (!this.hasCrossedFinish && this.bike.z >= this.environment.finishDistance) {
        this.hasCrossedFinish = true;
        soundManager.playVictory();
        this.particles.spawnVictoryConfetti(this.bike.mesh.position);

        setTimeout(() => {
          gameState.endRun();
        }, 1200);
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

// Lancement automatique dès que le DOM est prêt
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});

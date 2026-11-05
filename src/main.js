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
import { UIManager } from './ui/UIManager.js';

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
    this.intersections.reset();
  }

  bindInputEvents() {
    // --- CONTRÔLES TACTILES MOBILES (TOUCH & POINTER) ---
    window.addEventListener('pointerdown', (e) => {
      // Ignorer si clic sur une interface interactive ou bouton
      if (e.target.closest('.interactive') || e.target.closest('button')) return;

      this.isPointerDown = true;
      this.touchStartX = e.clientX;
      soundManager.resumeContext();
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
      } else if (e.code === 'Space') {
        soundManager.playHorn();
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
      this.bike.buildCurrentBike();
    } else if (action === 'COLOR_CHANGED') {
      this.bike.buildCurrentBike();
    }
  }

  loop() {
    requestAnimationFrame(() => this.loop());

    const delta = Math.min(this.clock.getDelta(), 0.1); // Sécurité contre les sauts de frame

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

      // 6. Fumée d'échappement (uniquement quand la moto roule)
      if (currentSpeed > 1.0) {
        this.particles.spawnExhaustSmoke(this.bike.getExhaustPosition(), currentSpeed / 20.0);
      }

      // 7. Génération et recyclage du monde 3D
      this.environment.update(this.bike.z);

      // 8. Gestion des piétons, poussettes, papys et collisions burlesques avec sang
      this.characters.update(
        delta,
        this.bike.z,
        this.bike.mesh.position.x,
        currentSpeed,
        (hitChar) => {
          // Impact cartoon équilibré !
          this.engine.triggerCameraShake(0.35);
          this.particles.spawnComicBurst(hitChar.group.position, hitChar.typeDef.points, gameState.combo);
          this.particles.spawnBloodBurst(hitChar.group.position);
          gameState.addInteraction(hitChar.typeDef.points, hitChar.typeDef.type);
        },
        (z) => this.environment.getRoadCenterX(z)
      );

      // 9. Gestion des carrefours, ronds-points, feux grillés et collisions transversales
      this.intersections.update(
        delta,
        this.bike.z,
        this.bike.mesh.position.x,
        currentSpeed,
        (crossingCar) => {
          // Collision suite à un feu rouge grillé !
          const crashed = this.bike.triggerCrash();
          if (crashed) {
            this.engine.triggerCameraShake(0.65);
            soundManager.playCrash();
            this.particles.spawnCrashBurst(this.bike.mesh.position);
            gameState.speed = 0;
            storage.recordRedLightRun();
          }
        },
        (z) => this.environment.getRoadCenterX(z),
        (z) => this.environment.getRoadAngle(z)
      );

      // 10. Particules, étoiles et lignes de vitesse
      this.particles.update(delta, this.bike.z, currentSpeed);

      // 11. Caméra dynamique en poursuite douce
      this.engine.updateCameraGameplay(delta, this.bike.mesh.position, currentSpeed);

      // 12. Mise à jour de l'état de course (accélération, décélération, combo)
      gameState.update(delta);

      // 13. Franchissement de la ligne d'arrivée
      if (!this.hasCrossedFinish && this.bike.z >= this.environment.finishDistance) {
        this.hasCrossedFinish = true;
        soundManager.playVictory();
        this.particles.spawnVictoryConfetti(this.bike.mesh.position);

        setTimeout(() => {
          gameState.endRun();
        }, 1200);
      }
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

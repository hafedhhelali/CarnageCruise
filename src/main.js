/**
 * Motormageddon - Point d'Entrée Principal du Jeu
 * Intégration du moteur 3D, physique, contrôles tactiles mobiles, sons et boucle de jeu.
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

    // 3. État des contrôles
    this.steerInput = 0;
    this.touchStartX = null;
    this.isPointerDown = false;
    this.keys = { left: false, right: false };

    // 4. Initialiser l'interface utilisateur
    this.ui = new UIManager(this.uiRoot, (action, payload) => this.handleUIAction(action, payload));

    // 5. Configurer la première ville (Paris)
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
  }

  bindInputEvents() {
    // --- CONTRÔLES TACTILES MOBILES (TOUCH & POINTER) ---
    window.addEventListener('pointerdown', (e) => {
      // Ignorer si clic sur une interface interactive
      if (e.target.closest('.interactive') || e.target.closest('button')) return;

      this.isPointerDown = true;
      this.touchStartX = e.clientX;
      soundManager.resumeContext();
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown || gameState.currentMode !== 'PLAYING') return;

      const deltaX = e.clientX - this.touchStartX;
      const sensitivity = 0.007; // Réactivité fluide tactile
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
      } else if (e.code === 'Space') {
        soundManager.playHorn();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyQ') {
        this.keys.left = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.keys.right = false;
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
      this.characters.reset();
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
      // 1. Déplacement de la moto vers l'avant
      const bikeSpeed = gameState.selectedBike.maxSpeed;
      gameState.speed = bikeSpeed;
      this.bike.z += bikeSpeed * delta;
      this.bike.mesh.position.z = this.bike.z;

      // 2. Physique de direction et inclinaison
      this.bike.update(delta, currentSteer, bikeSpeed);

      // 3. Son moteur réactif
      soundManager.updateEngine(bikeSpeed / 20.0);

      // 4. Fumée d'échappement
      this.particles.spawnExhaustSmoke(this.bike.getExhaustPosition(), bikeSpeed / 20.0);

      // 5. Génération & recyclage de l'environnement infini
      this.environment.update(this.bike.z);

      // 6. Gestion des personnages et collisions burlesques
      this.characters.update(
        delta,
        this.bike.z,
        this.bike.x,
        bikeSpeed,
        (hitChar) => {
          // Collision burlesque réussie !
          this.engine.triggerCameraShake(0.35);
          this.particles.spawnComicBurst(hitChar.group.position, hitChar.typeDef.points, gameState.combo);
          gameState.addInteraction(hitChar.typeDef.points, hitChar.typeDef.type);
        }
      );

      // 7. Particules et lignes de vitesse
      this.particles.update(delta, this.bike.z, bikeSpeed);

      // 8. Caméra arcade en poursuite dynamique
      this.engine.updateCameraGameplay(delta, this.bike.mesh.position, bikeSpeed);

      // 9. Mise à jour de l'état de course
      gameState.update(delta);

      // Condition de fin d'étape : franchissement de la distance ou du temps
      if (gameState.distance >= 1200) {
        gameState.endRun();
      }
    } else {
      // Modes SPLASH, MENU, GARAGE, PAUSE : Caméra cinématique 360° autour du bolide
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

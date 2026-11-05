/**
 * Motormageddon - Système de Circulation Urbaine 3D Haute-Fidélité (Trafic Réduit & Graphismes Luxueux)
 * Véhicules modélisés avec carrosseries métallisées réalistes, reflets vernis, vitrages fumés,
 * phares LED DRL avec halos, feux arrière néon, jantes alliage 3D et physique de carambolage.
 * Trafic équilibré et aéré : 2 à 3 voitures maximum à l'écran avec large distance de sécurité.
 */

import * as THREE from 'three';
import { soundManager } from '../audio/SoundManager.js';

export class Traffic {
  constructor(scene) {
    this.scene = scene;
    this.vehicles = [];
    this.vehiclePoolSize = 4; // Trafic réduit à 4 véhicules dans le pool
    this.maxActiveVehicles = 2; // Au maximum 2 véhicules simultanément sur la route
    this.container = new THREE.Group();
    this.scene.add(this.container);

    // Géométries partagées optimisées
    this.sharedGeos = {
      wheelTire: new THREE.CylinderGeometry(0.36, 0.36, 0.24, 18),
      wheelRim: new THREE.CylinderGeometry(0.24, 0.24, 0.25, 10),
      wheelCap: new THREE.SphereGeometry(0.08, 8, 8),
      headlightLens: new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12),
      taillightBar: new THREE.BoxGeometry(0.42, 0.08, 0.04),
      lightBeam: new THREE.ConeGeometry(1.6, 12.0, 10, 1, true),
      underglow: new THREE.PlaneGeometry(2.2, 4.4)
    };

    // Matériaux PBR de qualité supérieure (vernis automobile & chrome miroir)
    this.sharedMats = {
      rubber: new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.85, metalness: 0.1 }),
      rim: new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.95, roughness: 0.12 }),
      brakeCaliper: new THREE.MeshStandardMaterial({ color: 0xff3838, roughness: 0.3, metalness: 0.6 }),
      tintedGlass: new THREE.MeshStandardMaterial({
        color: 0x111927,
        roughness: 0.05,
        metalness: 0.9,
        transparent: true,
        opacity: 0.82
      }),
      headlightLED: new THREE.MeshStandardMaterial({
        color: 0xfffa65,
        emissive: 0xfffa65,
        emissiveIntensity: 1.2,
        roughness: 0.1
      }),
      taillightLED: new THREE.MeshStandardMaterial({
        color: 0xff1744,
        emissive: 0xff1744,
        emissiveIntensity: 1.0,
        roughness: 0.1
      }),
      chromeTrim: new THREE.MeshStandardMaterial({
        color: 0xf5f6fa,
        metalness: 0.96,
        roughness: 0.08
      }),
      beam: new THREE.MeshBasicMaterial({
        color: 0xfffa65,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        side: THREE.DoubleSide
      }),
      underglowMat: new THREE.MeshBasicMaterial({
        color: 0x00d2d3,
        transparent: true,
        opacity: 0.22,
        depthWrite: false
      })
    };

    this.initPool();
  }

  initPool() {
    const types = ['supercar', 'taxi_luxe', 'sedan_prestige', 'suv_urban'];
    for (let i = 0; i < this.vehiclePoolSize; i++) {
      const type = types[i % types.length];
      const vehicle = this.createHighFidelityVehicle(type, i);
      vehicle.userData = {
        type: type,
        active: false,
        speed: 18 + Math.random() * 6,
        lane: (i % 2 === 0 ? 1 : -1) * 2.2, // Voie droite (+2.2m) ou voie gauche (-2.2m)
        isCrashed: false,
        crashVelX: 0,
        crashVelY: 0,
        crashVelZ: 0,
        crashSpinX: 0,
        crashSpinY: 0,
        crashSpinZ: 0
      };
      vehicle.visible = false;
      this.vehicles.push(vehicle);
      this.container.add(vehicle);
    }
  }

  createHighFidelityVehicle(type, index) {
    const group = new THREE.Group();

    // Palettes de peintures métallisées nacrées élégantes
    const metallicColors = [0x0984e3, 0xd63031, 0x2d3436, 0x6c5ce7, 0x00b894, 0xe17055];
    const carColor = type === 'taxi_luxe' ? 0xf1c40f : metallicColors[index % metallicColors.length];

    const carPaint = new THREE.MeshStandardMaterial({
      color: carColor,
      metalness: 0.86,
      roughness: 0.18
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: type === 'taxi_luxe' ? 0x1e272e : carColor,
      metalness: 0.88,
      roughness: 0.15
    });

    if (type === 'supercar') {
      // 1. SUPERCAR ITALIENNE SURBAISSÉE (LIGNES ÉPURÉES & AÉRODYNAMISME)
      // Châssis profilé en flèche
      const chassisGeo = new THREE.BoxGeometry(2.05, 0.46, 4.7);
      const chassis = new THREE.Mesh(chassisGeo, carPaint);
      chassis.position.y = 0.42;
      chassis.castShadow = true;
      group.add(chassis);

      // Nez plongeant aérodynamique
      const noseGeo = new THREE.ConeGeometry(1.0, 1.2, 4);
      const nose = new THREE.Mesh(noseGeo, carPaint);
      nose.rotation.x = -Math.PI / 2;
      nose.rotation.y = Math.PI / 4;
      nose.position.set(0, 0.38, 2.6);
      group.add(nose);

      // Cockpit profilé avec vitrages teintés
      const cabinGeo = new THREE.BoxGeometry(1.62, 0.48, 2.2);
      const cabin = new THREE.Mesh(cabinGeo, roofMat);
      cabin.position.set(0, 0.82, -0.2);
      cabin.castShadow = true;
      group.add(cabin);

      // Pare-brise avant profilé
      const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.7), this.sharedMats.tintedGlass);
      windshield.position.set(0, 0.82, 0.95);
      windshield.rotation.x = -Math.PI / 3.6;
      group.add(windshield);

      // Aileron arrière en carbone avec mats
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.06, 0.38), this.sharedMats.rim);
      wing.position.set(0, 0.96, -2.15);
      const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.1), this.sharedMats.rim);
      strutL.position.set(-0.6, 0.84, -2.15);
      const strutR = strutL.clone();
      strutR.position.x = 0.6;
      group.add(wing, strutL, strutR);

      // Double sortie d'échappement chromée
      for (let s of [-0.35, 0.35]) {
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.3, 10), this.sharedMats.chromeTrim);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(s, 0.3, -2.36);
        group.add(exhaust);
      }

    } else if (type === 'taxi_luxe') {
      // 2. TAXI PARISIEN HAUT DE GAMME (STYLE MERCEDES CLASSE E)
      const bodyGeo = new THREE.BoxGeometry(1.92, 0.68, 4.6);
      const body = new THREE.Mesh(bodyGeo, carPaint);
      body.position.y = 0.58;
      body.castShadow = true;
      group.add(body);

      const cabinGeo = new THREE.BoxGeometry(1.72, 0.62, 2.5);
      const cabin = new THREE.Mesh(cabinGeo, roofMat);
      cabin.position.set(0, 1.15, -0.15);
      cabin.castShadow = true;
      group.add(cabin);

      // Pare-brise et lunette arrière
      const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 0.72), this.sharedMats.tintedGlass);
      windshield.position.set(0, 1.15, 1.15);
      windshield.rotation.x = -Math.PI / 4.2;
      const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 0.72), this.sharedMats.tintedGlass);
      rearGlass.position.set(0, 1.15, -1.45);
      rearGlass.rotation.x = Math.PI / 4.2;
      group.add(windshield, rearGlass);

      // Calandre chromée avant luxueuse
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.38, 0.08), this.sharedMats.chromeTrim);
      grille.position.set(0, 0.58, 2.32);
      group.add(grille);

      // Enseigne lumineuse de toit "TAXI PARISIEN"
      const signBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.22), this.sharedMats.rim);
      signBase.position.set(0, 1.48, -0.2);
      const signGlow = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.18), this.sharedMats.headlightLED);
      signGlow.position.set(0, 1.58, -0.2);
      group.add(signBase, signGlow);

    } else if (type === 'suv_urban') {
      // 3. SUV CITADIN ROBUSTE & ÉLÉGANT
      const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.82, 4.5), carPaint);
      lowerBody.position.y = 0.65;
      lowerBody.castShadow = true;
      group.add(lowerBody);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.72, 2.7), roofMat);
      cabin.position.set(0, 1.32, -0.15);
      cabin.castShadow = true;
      group.add(cabin);

      // Barres de toit chromées
      for (let s of [-0.75, 0.75]) {
        const roofRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 2.4), this.sharedMats.chromeTrim);
        roofRail.position.set(s, 1.72, -0.15);
        group.add(roofRail);
      }

      // Vitrages
      const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.8), this.sharedMats.tintedGlass);
      windshield.position.set(0, 1.32, 1.25);
      windshield.rotation.x = -Math.PI / 4.6;
      group.add(windshield);

    } else {
      // 4. BERLINE PRESTIGE ALLEMANDE
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.65, 4.65), carPaint);
      body.position.y = 0.56;
      body.castShadow = true;
      group.add(body);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.6, 2.4), roofMat);
      cabin.position.set(0, 1.12, -0.15);
      cabin.castShadow = true;
      group.add(cabin);

      const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.7), this.sharedMats.tintedGlass);
      windshield.position.set(0, 1.12, 1.1);
      windshield.rotation.x = -Math.PI / 4.2;
      group.add(windshield);
    }

    // 4 Roues sportives avec jantes alliage 3D & étriers de frein
    const wheelPositions = [
      [-1.0, 0.36, 1.35],
      [1.0, 0.36, 1.35],
      [-1.0, 0.36, -1.35],
      [1.0, 0.36, -1.35]
    ];
    group.userData.wheelMeshes = [];

    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wx, wy, wz);

      const tire = new THREE.Mesh(this.sharedGeos.wheelTire, this.sharedMats.rubber);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;

      const rim = new THREE.Mesh(this.sharedGeos.wheelRim, this.sharedMats.rim);
      rim.rotation.z = Math.PI / 2;

      // Étriers de frein sport rouge vif visibles
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.08), this.sharedMats.brakeCaliper);
      caliper.position.set(wx > 0 ? -0.06 : 0.06, 0.12, 0.08);

      wheelGroup.add(tire, rim, caliper);
      group.add(wheelGroup);
      group.userData.wheelMeshes.push(wheelGroup);
    });

    // Phares avant LED DRL étincelants
    for (let s of [-0.72, 0.72]) {
      const headlight = new THREE.Mesh(this.sharedGeos.headlightLens, this.sharedMats.headlightLED);
      headlight.rotation.x = Math.PI / 2;
      headlight.position.set(s, 0.58, 2.34);
      group.add(headlight);
    }

    // Feux arrière LED horizontaux éclatants
    for (let s of [-0.68, 0.68]) {
      const taillight = new THREE.Mesh(this.sharedGeos.taillightBar, this.sharedMats.taillightLED);
      taillight.position.set(s, 0.62, -2.34);
      group.add(taillight);
    }

    // Faisceaux lumineux sur la chaussée
    for (let s of [-0.68, 0.68]) {
      const beam = new THREE.Mesh(this.sharedGeos.lightBeam, this.sharedMats.beam);
      beam.rotation.x = Math.PI / 2;
      beam.position.set(s, 0.45, 7.5);
      group.add(beam);
    }

    // Rétroprojecteur au sol (halo néon subtil)
    const underglow = new THREE.Mesh(this.sharedGeos.underglow, this.sharedMats.underglowMat);
    underglow.rotation.x = -Math.PI / 2;
    underglow.position.y = 0.04;
    group.add(underglow);

    return group;
  }

  reset() {
    this.vehicles.forEach(v => {
      v.visible = false;
      v.userData.active = false;
      v.userData.isCrashed = false;
    });
  }

  spawnAhead(playerZ, roadCurveFunc) {
    // Compter les véhicules déjà actifs
    const activeCount = this.vehicles.filter(v => v.userData.active).length;
    if (activeCount >= this.maxActiveVehicles) return;

    // Plage d'apparition aérée et lointaine pour ne pas étouffer le joueur
    const minZ = playerZ + 85;
    const maxZ = playerZ + 240;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (!v.userData.active && (!v.visible || v.position.z < playerZ - 30)) {
        // Vérifier qu'aucun autre véhicule n'est trop proche de ce nouveau point
        const candidateZ = minZ + Math.random() * (maxZ - minZ);
        const tooClose = this.vehicles.some(other => other.userData.active && Math.abs(other.position.z - candidateZ) < 65);
        if (tooClose) continue;

        const curveX = roadCurveFunc ? roadCurveFunc(candidateZ) : 0;
        const laneX = v.userData.lane;

        v.position.set(curveX + laneX, 0, candidateZ);
        v.rotation.set(0, 0, 0);
        v.visible = true;
        v.userData.active = true;
        v.userData.isCrashed = false;
        v.userData.speed = 16 + Math.random() * 7;
        break; // On ne fait apparaître qu'un véhicule à la fois
      }
    }
  }

  triggerCrash(vehicle, bikeSpeed, hitDirectionX = 1) {
    vehicle.userData.isCrashed = true;
    vehicle.userData.active = false;
    soundManager.playCrash();

    // Carambolage burlesque et spectaculaire
    vehicle.userData.crashVelX = hitDirectionX * (8.5 + Math.random() * 6.0);
    vehicle.userData.crashVelY = 9.5 + Math.random() * 5.0;
    vehicle.userData.crashVelZ = (bikeSpeed * 0.45) + (Math.random() * 8.0);

    vehicle.userData.crashSpinX = (Math.random() - 0.5) * 14.0;
    vehicle.userData.crashSpinY = (Math.random() - 0.5) * 16.0;
    vehicle.userData.crashSpinZ = hitDirectionX * (9.0 + Math.random() * 6.0);
  }

  update(delta, playerZ, bikeX, bikeSpeed, roadCurveFunc, onVehicleCollision, isPlayerInvulnerable = false) {
    this.spawnAhead(playerZ, roadCurveFunc);

    this.vehicles.forEach(v => {
      if (!v.visible) return;

      // 1. Véhicule en vol balistique après carambolage
      if (v.userData.isCrashed) {
        v.position.x += v.userData.crashVelX * delta;
        v.position.y += v.userData.crashVelY * delta;
        v.position.z += v.userData.crashVelZ * delta;

        v.userData.crashVelY -= 19.0 * delta; // Gravité

        v.rotation.x += v.userData.crashSpinX * delta;
        v.rotation.y += v.userData.crashSpinY * delta;
        v.rotation.z += v.userData.crashSpinZ * delta;

        if (v.position.y <= 0) {
          v.position.y = 0;
          v.userData.isCrashed = false;
          v.visible = false;
        }
        return;
      }

      // 2. Véhicule actif circulant dans sa voie
      if (v.userData.active) {
        // Avancement selon sa vitesse
        v.position.z += v.userData.speed * delta;

        // Rotation synchronisée des roues 3D
        if (v.userData.wheelMeshes) {
          const spinSpeed = v.userData.speed * delta * 2.8;
          v.userData.wheelMeshes.forEach(w => {
            w.children.forEach(part => {
              part.rotation.x += spinSpeed;
            });
          });
        }

        // Suivre la trajectoire de la route en restant dans sa voie (+2.2m ou -2.2m)
        const curveX = roadCurveFunc ? roadCurveFunc(v.position.z) : 0;
        const targetX = curveX + v.userData.lane;
        v.position.x += (targetX - v.position.x) * delta * 5.0;

        // Orientation naturelle avec la courbure
        const aheadX = roadCurveFunc ? roadCurveFunc(v.position.z + 3.0) : 0;
        v.rotation.y = (aheadX - curveX) * 0.32;

        // Détection de collision physique avec le bolide du joueur
        const dZ = Math.abs(v.position.z - playerZ);
        const dX = Math.abs(v.position.x - bikeX);

        if (dZ < 3.0 && dX < 1.65) {
          const hitDirX = bikeX < v.position.x ? 1 : -1;
          this.triggerCrash(v, bikeSpeed, hitDirX);
          if (onVehicleCollision) {
            onVehicleCollision(v, isPlayerInvulnerable);
          }
        }

        // Recycler si dépassé loin derrière le joueur
        if (v.position.z < playerZ - 35) {
          v.visible = false;
          v.userData.active = false;
        }
      }
    });
  }
}

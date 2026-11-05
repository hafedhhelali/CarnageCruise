/**
 * Motormageddon - Système de Circulation Urbaine 3D Réaliste (Trafic Actif)
 * Voitures, taxis, fourgons et autobus circulant sur les voies de circulation,
 * avec phares avant, feux arrière de freinage, dépassements, et collisions spectaculaires.
 */

import * as THREE from 'three';
import { soundManager } from '../audio/SoundManager.js';

export class Traffic {
  constructor(scene) {
    this.scene = scene;
    this.vehicles = [];
    this.vehiclePoolSize = 10;
    this.container = new THREE.Group();
    this.scene.add(this.container);

    this.sharedGeos = {
      wheel: new THREE.CylinderGeometry(0.35, 0.35, 0.24, 12),
      wheelRim: new THREE.CylinderGeometry(0.22, 0.22, 0.25, 8),
      headlight: new THREE.CircleGeometry(0.14, 8),
      taillight: new THREE.PlaneGeometry(0.24, 0.12),
      lightBeam: new THREE.ConeGeometry(1.4, 8.0, 8, 1, true)
    };

    this.sharedMats = {
      rubber: new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
      rim: new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.85, roughness: 0.2 }),
      glass: new THREE.MeshToonMaterial({ color: 0x22313f, transparent: true, opacity: 0.85 }),
      headlightOn: new THREE.MeshBasicMaterial({ color: 0xfffa65 }),
      taillightNormal: new THREE.MeshBasicMaterial({ color: 0xeb4d4b }),
      taillightBrake: new THREE.MeshBasicMaterial({ color: 0xff0000 }),
      beam: new THREE.MeshBasicMaterial({
        color: 0xfff9c4,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    };

    this.initPool();
  }

  initPool() {
    const types = ['sedan', 'taxi', 'van', 'bus', 'sport'];
    for (let i = 0; i < this.vehiclePoolSize; i++) {
      const type = types[i % types.length];
      const vehicle = this.createVehicleMesh(type);
      vehicle.userData = {
        type: type,
        active: false,
        speed: 14 + Math.random() * 8,
        lane: (i % 2 === 0 ? 1 : -1) * 2.1, // Voie droite (+2.1m) ou voie gauche (-2.1m)
        isCrashed: false,
        crashVelX: 0,
        crashVelY: 0,
        crashVelZ: 0,
        crashSpinX: 0,
        crashSpinY: 0,
        crashSpinZ: 0,
        brakeTime: 0
      };
      vehicle.visible = false;
      this.vehicles.push(vehicle);
      this.container.add(vehicle);
    }
  }

  createVehicleMesh(type) {
    const group = new THREE.Group();
    const bodyMatPalette = [0x2980b9, 0xc0392b, 0x27ae60, 0x8e44ad, 0xd35400, 0x2c3e50, 0xbdc3c7];
    const bodyColor = type === 'taxi' ? 0xf1c40f : bodyMatPalette[Math.floor(Math.random() * bodyMatPalette.length)];
    const bodyMat = new THREE.MeshToonMaterial({ color: bodyColor, roughness: 0.35, metalness: 0.25 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.9, roughness: 0.15 });

    if (type === 'sedan') {
      // 1. BERLINE EUROPÉENNE MODERNE
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 4.4), bodyMat);
      chassis.position.y = 0.55;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.3), bodyMat);
      cabin.position.set(0, 1.1, -0.2);
      const windShieldF = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.65), this.sharedMats.glass);
      windShieldF.position.set(0, 1.1, 0.96);
      windShieldF.rotation.x = -Math.PI / 4.2;
      const windShieldR = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.65), this.sharedMats.glass);
      windShieldR.position.set(0, 1.1, -1.36);
      windShieldR.rotation.x = Math.PI / 4.2;
      group.add(chassis, cabin, windShieldF, windShieldR);

    } else if (type === 'taxi') {
      // 2. TAXI PARISIEN / EUROPÉEN AVEC ENSEIGNE LUMINEUSE
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 4.3), bodyMat);
      chassis.position.y = 0.55;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.6, 2.4), bodyMat);
      cabin.position.set(0, 1.1, -0.15);

      // Enseigne lumineuse "TAXI" sur le toit
      const signMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.25), signMat);
      sign.position.set(0, 1.48, -0.2);
      group.add(chassis, cabin, sign);

    } else if (type === 'van') {
      // 3. FOURGON DE LIVRAISON (STYLE LA POSTE / EXPRESS)
      const vanMat = new THREE.MeshToonMaterial({ color: 0xf5f6fa, roughness: 0.5 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 4.6), vanMat);
      body.position.y = 1.0;
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.5, 0.9), vanMat);
      hood.position.set(0, 0.6, 2.2);
      const windShield = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.7), this.sharedMats.glass);
      windShield.position.set(0, 1.15, 1.76);
      windShield.rotation.x = -0.25;
      group.add(body, hood, windShield);

    } else if (type === 'bus') {
      // 4. AUTOBUS URBAIN RATP / TRANSIT
      const busMat = new THREE.MeshToonMaterial({ color: 0x00cec9, roughness: 0.4 });
      const busRoofMat = new THREE.MeshToonMaterial({ color: 0xffffff });
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 7.8), busMat);
      body.position.y = 1.35;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.25, 7.85), busRoofMat);
      roof.position.y = 2.38;

      // Bandeau de vitres latérales
      const sideGlassL = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 0.75), this.sharedMats.glass);
      sideGlassL.position.set(-1.21, 1.5, 0);
      sideGlassL.rotation.y = -Math.PI / 2;
      const sideGlassR = sideGlassL.clone();
      sideGlassR.position.x = 1.21;
      sideGlassR.rotation.y = Math.PI / 2;
      const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), this.sharedMats.glass);
      frontGlass.position.set(0, 1.55, 3.91);
      group.add(body, roof, sideGlassL, sideGlassR, frontGlass);

    } else {
      // 5. COUPÉ SPORT SURBAISSÉ
      const sportMat = new THREE.MeshToonMaterial({ color: 0xd63031, roughness: 0.2, metalness: 0.4 });
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 4.6), sportMat);
      chassis.position.y = 0.45;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 2.1), bodyMat);
      cabin.position.set(0, 0.9, -0.3);
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.35), chromeMat);
      spoiler.position.set(0, 0.95, -2.1);
      group.add(chassis, cabin, spoiler);
    }

    // 4 Roues en alliage
    const wheelOffsets = [
      [-0.95, 0.35, 1.3],
      [0.95, 0.35, 1.3],
      [-0.95, 0.35, -1.3],
      [0.95, 0.35, -1.3]
    ];
    wheelOffsets.forEach(([wx, wy, wz]) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wx, wy, wz);
      const tire = new THREE.Mesh(this.sharedGeos.wheel, this.sharedMats.rubber);
      tire.rotation.z = Math.PI / 2;
      const rim = new THREE.Mesh(this.sharedGeos.wheelRim, this.sharedMats.rim);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(tire, rim);
      group.add(wheelGroup);
    });

    // Phares avant blancs
    const headL = new THREE.Mesh(this.sharedGeos.headlight, this.sharedMats.headlightOn);
    headL.position.set(-0.68, 0.58, 2.22);
    const headR = headL.clone();
    headR.position.x = 0.68;
    group.add(headL, headR);

    // Faisceaux lumineux sur la chaussée
    const beamL = new THREE.Mesh(this.sharedGeos.lightBeam, this.sharedMats.beam);
    beamL.rotation.x = Math.PI / 2;
    beamL.position.set(-0.68, 0.5, 6.0);
    const beamR = beamL.clone();
    beamR.position.x = 0.68;
    group.add(beamL, beamR);

    // Feux arrière rouges
    const tailL = new THREE.Mesh(this.sharedGeos.taillight, this.sharedMats.taillightNormal);
    tailL.position.set(-0.7, 0.65, -2.22);
    tailL.rotation.y = Math.PI;
    const tailR = tailL.clone();
    tailR.position.x = 0.7;
    group.add(tailL, tailR);
    group.userData.taillights = [tailL, tailR];

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
    const minZ = playerZ + 50;
    const maxZ = playerZ + 220;

    this.vehicles.forEach((v, idx) => {
      if (!v.userData.active && (!v.visible || v.position.z < playerZ - 30)) {
        const newZ = minZ + Math.random() * (maxZ - minZ);
        const curveX = roadCurveFunc ? roadCurveFunc(newZ) : 0;
        const laneX = v.userData.lane;

        v.position.set(curveX + laneX, 0, newZ);
        v.rotation.set(0, 0, 0);
        v.visible = true;
        v.userData.active = true;
        v.userData.isCrashed = false;
        v.userData.speed = 13 + Math.random() * 9;
      }
    });
  }

  triggerCrash(vehicle, bikeSpeed, hitDirectionX = 1) {
    vehicle.userData.isCrashed = true;
    vehicle.userData.active = false;
    soundManager.playCrash();

    // Projection et carambolage spectaculaire
    vehicle.userData.crashVelX = hitDirectionX * (7.0 + Math.random() * 6.0);
    vehicle.userData.crashVelY = 8.5 + Math.random() * 6.0;
    vehicle.userData.crashVelZ = (bikeSpeed * 0.5) + (Math.random() * 10.0);

    vehicle.userData.crashSpinX = (Math.random() - 0.5) * 12.0;
    vehicle.userData.crashSpinY = (Math.random() - 0.5) * 15.0;
    vehicle.userData.crashSpinZ = hitDirectionX * (8.0 + Math.random() * 6.0);
  }

  update(delta, playerZ, bikeX, bikeSpeed, roadCurveFunc, onVehicleCollision, isPlayerInvulnerable = false) {
    this.spawnAhead(playerZ, roadCurveFunc);

    this.vehicles.forEach(v => {
      if (!v.visible) return;

      // 1. Véhicule en l'air après carambolage
      if (v.userData.isCrashed) {
        v.position.x += v.userData.crashVelX * delta;
        v.position.y += v.userData.crashVelY * delta;
        v.position.z += v.userData.crashVelZ * delta;

        v.userData.crashVelY -= 18.0 * delta; // Gravité

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

      // 2. Véhicule actif circulant
      if (v.userData.active) {
        // Avancement selon sa vitesse
        v.position.z += v.userData.speed * delta;

        // Suivre la courbure de la route en restant dans sa voie
        const curveX = roadCurveFunc ? roadCurveFunc(v.position.z) : 0;
        const targetX = curveX + v.userData.lane;
        v.position.x += (targetX - v.position.x) * delta * 5.0;

        // Légère orientation avec la route
        const aheadX = roadCurveFunc ? roadCurveFunc(v.position.z + 2.0) : 0;
        v.rotation.y = (aheadX - curveX) * 0.35;

        // Détection de collision avec la moto du joueur
        const dZ = Math.abs(v.position.z - playerZ);
        const dX = Math.abs(v.position.x - bikeX);

        if (dZ < 3.2 && dX < 1.7) {
          const hitDirX = bikeX < v.position.x ? 1 : -1;
          this.triggerCrash(v, bikeSpeed, hitDirX);
          if (onVehicleCollision) {
            onVehicleCollision(v, isPlayerInvulnerable);
          }
        }

        // Recycler si dépassé loin derrière
        if (v.position.z < playerZ - 40) {
          v.visible = false;
          v.userData.active = false;
        }
      }
    });
  }
}

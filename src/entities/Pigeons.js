/**
 * Carnage Cruise - Système de Pigeons Urbains 3D Vivants (Flocks & Décollage Dynamique)
 * Pigeons parisiens réalistes : Picorent le bitume et les trottoirs en battant de la tête,
 * et décollent en panique dans un froufrou d'ailes spectaculaire à l'approche du bolide !
 */

import * as THREE from 'three';
import { soundManager } from '../audio/SoundManager.js';

export class PigeonSystem {
  constructor(scene) {
    this.scene = scene;
    this.pigeons = [];
    this.flockCount = 8;
    this.pigeonsPerFlock = 4;
    this.totalPigeons = this.flockCount * this.pigeonsPerFlock;
    this.container = new THREE.Group();
    this.scene.add(this.container);

    this.sharedGeos = {
      body: new THREE.SphereGeometry(0.16, 10, 8),
      neck: new THREE.CylinderGeometry(0.08, 0.12, 0.14, 8),
      head: new THREE.SphereGeometry(0.09, 8, 8),
      beak: new THREE.ConeGeometry(0.035, 0.09, 6),
      wing: new THREE.BoxGeometry(0.03, 0.18, 0.32),
      tail: new THREE.BoxGeometry(0.12, 0.02, 0.18),
      eye: new THREE.SphereGeometry(0.02, 6, 6)
    };

    this.sharedMats = {
      body: new THREE.MeshStandardMaterial({ color: 0x636e72, roughness: 0.7, metalness: 0.1 }),
      iridescentNeck: new THREE.MeshStandardMaterial({
        color: 0x00cec9,
        emissive: 0x6c5ce7,
        emissiveIntensity: 0.3,
        roughness: 0.4
      }),
      head: new THREE.MeshStandardMaterial({ color: 0x747d8c, roughness: 0.6 }),
      beak: new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.5 }),
      wing: new THREE.MeshStandardMaterial({ color: 0x4b6584, roughness: 0.7 }),
      tail: new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.8 }),
      eye: new THREE.MeshBasicMaterial({ color: 0xe17055 })
    };

    this.initPool();
  }

  initPool() {
    for (let i = 0; i < this.totalPigeons; i++) {
      const pigeon = this.createPigeonMesh();
      Object.assign(pigeon.userData, {
        flockId: Math.floor(i / this.pigeonsPerFlock),
        indexInFlock: i % this.pigeonsPerFlock,
        active: false,
        isFlying: false,
        hasFlappedAudio: false,
        peckPhase: Math.random() * Math.PI * 2,
        wingPhase: 0,
        baseY: 0.05,
        velX: 0,
        velY: 0,
        velZ: 0,
        rotY: Math.random() * Math.PI * 2
      });
      pigeon.visible = false;
      this.pigeons.push(pigeon);
      this.container.add(pigeon);
    }
  }

  createPigeonMesh() {
    const group = new THREE.Group();
    group.scale.setScalar(0.9);

    // Corps rebondi gris ardoise
    const body = new THREE.Mesh(this.sharedGeos.body, this.sharedMats.body);
    body.position.y = 0.14;
    body.scale.set(1.0, 0.85, 1.25);
    group.add(body);

    // Cou irisé (vert/violet chatoyant)
    const neck = new THREE.Mesh(this.sharedGeos.neck, this.sharedMats.iridescentNeck);
    neck.position.set(0, 0.22, 0.14);
    neck.rotation.x = -0.3;
    group.add(neck);

    // Tête avec bec et yeux
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.28, 0.18);

    const head = new THREE.Mesh(this.sharedGeos.head, this.sharedMats.head);
    headGroup.add(head);

    const beak = new THREE.Mesh(this.sharedGeos.beak, this.sharedMats.beak);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, -0.01, 0.11);
    headGroup.add(beak);

    for (let s of [-0.07, 0.07]) {
      const eye = new THREE.Mesh(this.sharedGeos.eye, this.sharedMats.eye);
      eye.position.set(s, 0.02, 0.05);
      headGroup.add(eye);
    }

    group.add(headGroup);

    // Deux ailes articulées repliées le long du corps
    const wingLGroup = new THREE.Group();
    wingLGroup.position.set(-0.16, 0.16, 0);
    const wingL = new THREE.Mesh(this.sharedGeos.wing, this.sharedMats.wing);
    wingL.position.set(-0.02, 0, -0.04);
    wingLGroup.add(wingL);

    const wingRGroup = new THREE.Group();
    wingRGroup.position.set(0.16, 0.16, 0);
    const wingR = new THREE.Mesh(this.sharedGeos.wing, this.sharedMats.wing);
    wingR.position.set(0.02, 0, -0.04);
    wingRGroup.add(wingR);

    group.add(wingLGroup, wingRGroup);

    // Plumes de queue
    const tail = new THREE.Mesh(this.sharedGeos.tail, this.sharedMats.tail);
    tail.position.set(0, 0.14, -0.22);
    tail.rotation.x = 0.2;
    group.add(tail);

    group.userData.headGroup = headGroup;
    group.userData.wingL = wingLGroup;
    group.userData.wingR = wingRGroup;

    return group;
  }

  reset(playerZ = 0) {
    this.pigeons.forEach((p, idx) => {
      const flockId = p.userData.flockId;
      const flockBaseZ = playerZ + 70 + (flockId * 150);
      const side = (flockId % 2 === 0 ? 1 : -1);
      // Répartis sur le trottoir ou sur la chaussée
      const isRoad = (flockId % 3 === 0);
      const posX = isRoad ? (side * (1.2 + (p.userData.indexInFlock * 0.6))) : (side * (4.2 + (p.userData.indexInFlock * 0.5)));
      const posZ = flockBaseZ + (p.userData.indexInFlock * 1.4) + (Math.random() - 0.5) * 1.5;
      const posY = isRoad ? 0.02 : 0.25;

      p.position.set(posX, posY, posZ);
      p.rotation.set(0, Math.random() * Math.PI * 2, 0);
      p.userData.baseY = posY;
      p.userData.active = true;
      p.userData.isFlying = false;
      p.userData.hasFlappedAudio = false;
      p.userData.velX = 0;
      p.userData.velY = 0;
      p.userData.velZ = 0;
      p.visible = true;

      if (p.userData.wingL) p.userData.wingL.rotation.set(0, 0, 0);
      if (p.userData.wingR) p.userData.wingR.rotation.set(0, 0, 0);
      if (p.userData.headGroup) p.userData.headGroup.rotation.set(0, 0, 0);
    });
  }

  update(delta, playerZ, bikePos, bikeSpeed, roadCurveFunc, onPigeonHit) {
    this.pigeons.forEach(p => {
      if (!p.visible) return;

      // 1. Recyclage des pigeons dépassés
      if (p.position.z < playerZ - 25) {
        // Replacer le pigeon plus loin devant
        const highestZ = Math.max(...this.pigeons.map(pg => pg.position.z));
        const newFlockZ = Math.max(playerZ + 80, highestZ + 80 + Math.random() * 50);
        const side = Math.random() > 0.5 ? 1 : -1;
        const isRoad = Math.random() > 0.6;
        const curveX = roadCurveFunc ? roadCurveFunc(newFlockZ) : 0;
        const posX = curveX + (isRoad ? side * 1.5 : side * 4.8) + (Math.random() - 0.5) * 1.2;

        p.position.set(posX, isRoad ? 0.02 : 0.25, newFlockZ);
        p.userData.baseY = isRoad ? 0.02 : 0.25;
        p.userData.active = true;
        p.userData.isFlying = false;
        p.userData.hasFlappedAudio = false;
        p.userData.velX = 0;
        p.userData.velY = 0;
        p.userData.velZ = 0;
        p.rotation.set(0, Math.random() * Math.PI * 2, 0);
        return;
      }

      const distZ = p.position.z - bikePos.z;
      const distX = Math.abs(p.position.x - bikePos.x);
      const dist = Math.sqrt(distZ * distZ + distX * distX);

      // 2. Déclenchement de l'envol en panique si la moto ou le véhicule approche (< 14m)
      if (!p.userData.isFlying && distZ > -1.5 && dist < 14.0 && bikeSpeed > 2.0) {
        p.userData.isFlying = true;
        const fleeX = (p.position.x >= bikePos.x ? 1 : -1) * (3.5 + Math.random() * 3.5);
        p.userData.velX = fleeX;
        p.userData.velY = 4.8 + Math.random() * 2.8;
        p.userData.velZ = -(3.0 + Math.random() * 4.0);

        if (!p.userData.hasFlappedAudio) {
          p.userData.hasFlappedAudio = true;
          soundManager.playPigeonFlutter();
        }
      }

      // 3. Animation selon l'état (Au sol à picorer vs En plein vol battant des ailes)
      if (p.userData.isFlying) {
        // Trajectoire d'envol vers le ciel et les toits
        p.position.x += p.userData.velX * delta;
        p.position.y += p.userData.velY * delta;
        p.position.z += p.userData.velZ * delta;

        // Ralentissement ascendant doux
        p.userData.velY = Math.max(1.2, p.userData.velY - 1.5 * delta);

        // Battements d'ailes ultra rapides (30Hz)
        p.userData.wingPhase += delta * 32.0;
        const flapAngle = Math.sin(p.userData.wingPhase) * 0.95;
        if (p.userData.wingL) p.userData.wingL.rotation.z = flapAngle;
        if (p.userData.wingR) p.userData.wingR.rotation.z = -flapAngle;

        // Orientation vers la trajectoire de vol
        p.rotation.y = Math.atan2(p.userData.velX, -p.userData.velZ);
        p.rotation.x = -0.35; // Légèrement cabré vers le haut

        // Si le pigeon monte très haut (> 18m), le cacher
        if (p.position.y > 18.0) {
          p.visible = false;
        }
      } else {
        // Au sol : hochements de tête réalistes pour picorer le bitume
        p.userData.peckPhase += delta * 9.0;
        const peckAngle = Math.max(0, Math.sin(p.userData.peckPhase)) * 0.42;
        if (p.userData.headGroup) p.userData.headGroup.rotation.x = peckAngle;

        // Petits pas saccadés occasionnels
        p.position.z += Math.cos(p.userData.rotY) * 0.25 * delta;
        p.position.x += Math.sin(p.userData.rotY) * 0.25 * delta;
      }

      // 4. Collision avec le joueur
      if (distZ >= -0.5 && distZ <= 1.8 && distX <= 1.4 && p.position.y < 1.8) {
        p.visible = false;
        if (onPigeonHit) {
          onPigeonHit(p);
        }
      }
    });
  }
}

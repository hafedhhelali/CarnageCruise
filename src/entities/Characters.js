/**
 * Motormageddon - Système de Personnages 3D Cartoon et Collisions Burlesques
 * Piétons variés (personnes âgées, poussettes, groupes, touristes) et physique burlesque modérée.
 */

import * as THREE from 'three';

const CHARACTER_TYPES = [
  {
    type: 'parisian',
    name: 'Parisien Pressé',
    points: 150,
    bodyColor: 0x2c3e50,
    pantsColor: 0x34495e,
    hatColor: 0x111111,
    hasBaguette: true,
    scale: 1.0,
    speed: 1.2
  },
  {
    type: 'tourist',
    name: 'Touriste Égaré',
    points: 120,
    bodyColor: 0xff7675,
    pantsColor: 0xfab1a0,
    hatColor: 0xfdcb6e,
    hasCamera: true,
    scale: 0.95,
    speed: 0.8
  },
  {
    type: 'papy',
    name: 'Papy et sa Canne',
    points: 160,
    bodyColor: 0x795548, // Gilet marron tweed
    pantsColor: 0x5d4037,
    hatColor: 0x424242, // Casquette plate
    hasCane: true,
    scale: 0.9,
    speed: 0.5
  },
  {
    type: 'poussette',
    name: 'Parent et sa Poussette',
    points: 240,
    bodyColor: 0x16a085, // Veste turquoise
    pantsColor: 0x2c3e50,
    hatColor: null,
    hasStroller: true,
    scale: 1.0,
    speed: 0.9
  },
  {
    type: 'group',
    name: 'Groupe de Flâneurs',
    points: 300,
    bodyColor: 0x8e44ad,
    pantsColor: 0x2980b9,
    hatColor: 0xe67e22,
    isGroup: true,
    scale: 1.0,
    speed: 0.7
  },
  {
    type: 'businessman',
    name: 'Trader en Retard',
    points: 180,
    bodyColor: 0x1e272e,
    pantsColor: 0x1e272e,
    tieColor: 0xe74c3c,
    hasBriefcase: true,
    scale: 1.05,
    speed: 1.8
  },
  {
    type: 'jogger',
    name: 'Jogger Fluorescent',
    points: 200,
    bodyColor: 0x00cec9,
    pantsColor: 0x0984e3,
    hatColor: 0xff007f,
    isJogging: true,
    scale: 1.0,
    speed: 3.2
  },
  {
    type: 'waiter',
    name: 'Garçon de Café',
    points: 220,
    bodyColor: 0xf5f6fa,
    vestColor: 0x2f3640,
    pantsColor: 0x2f3640,
    hasTray: true,
    scale: 0.98,
    speed: 1.1
  },
  {
    type: 'grandma',
    name: 'Mamie et son Caddie',
    points: 140,
    bodyColor: 0x9b59b6,
    pantsColor: 0x8e44ad,
    hatColor: 0xbdc3c7,
    hasCaddy: true,
    scale: 0.88,
    speed: 0.6
  }
];

export class CharacterSystem {
  constructor(scene) {
    this.scene = scene;
    this.poolSize = 28;
    this.characters = [];
    this.materialsCache = {};

    this.initPool();
  }

  getMaterial(color, roughness = 0.5) {
    const key = `${color}_${roughness}`;
    if (!this.materialsCache[key]) {
      this.materialsCache[key] = new THREE.MeshToonMaterial({
        color,
        roughness
      });
    }
    return this.materialsCache[key];
  }

  initPool() {
    const skinMat = this.getMaterial(0xffdbac);

    for (let i = 0; i < this.poolSize; i++) {
      const typeDef = CHARACTER_TYPES[i % CHARACTER_TYPES.length];
      const charGroup = new THREE.Group();

      // Torse
      const torsoGeo = new THREE.BoxGeometry(0.35, 0.45, 0.22);
      const torsoMat = this.getMaterial(typeDef.bodyColor);
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      torso.position.y = 0.85;
      torso.castShadow = true;
      charGroup.add(torso);

      // Détails torse
      if (typeDef.hasTray) {
        const vestGeo = new THREE.BoxGeometry(0.37, 0.4, 0.23);
        const vest = new THREE.Mesh(vestGeo, this.getMaterial(typeDef.vestColor));
        vest.position.y = 0.83;
        charGroup.add(vest);
      } else if (typeDef.tieColor) {
        const tieGeo = new THREE.BoxGeometry(0.08, 0.28, 0.04);
        const tie = new THREE.Mesh(tieGeo, this.getMaterial(typeDef.tieColor));
        tie.position.set(0, 0.85, 0.12);
        charGroup.add(tie);
      }

      // Tête
      const headGroup = new THREE.Group();
      headGroup.position.y = 1.25;

      const headGeo = new THREE.SphereGeometry(0.16, 10, 8);
      const head = new THREE.Mesh(headGeo, skinMat);
      headGroup.add(head);

      // Chapeaux et coiffures
      if (typeDef.hatColor) {
        if (typeDef.isJogging) {
          const bandGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.06, 10);
          const band = new THREE.Mesh(bandGeo, this.getMaterial(typeDef.hatColor));
          band.position.y = 0.04;
          headGroup.add(band);
        } else if (typeDef.hasCane) {
          // Casquette de grand-père
          const capGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.08, 10);
          const cap = new THREE.Mesh(capGeo, this.getMaterial(typeDef.hatColor));
          cap.position.y = 0.12;
          headGroup.add(cap);
        } else if (typeDef.hasCamera) {
          const bobGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.1, 10);
          const bob = new THREE.Mesh(bobGeo, this.getMaterial(typeDef.hatColor));
          bob.position.y = 0.12;
          headGroup.add(bob);
        } else if (typeDef.hasBaguette) {
          const beretGeo = new THREE.CylinderGeometry(0.22, 0.16, 0.06, 10);
          const beret = new THREE.Mesh(beretGeo, this.getMaterial(typeDef.hatColor));
          beret.position.y = 0.14;
          beret.rotation.z = 0.12;
          headGroup.add(beret);
        } else if (typeDef.hasCaddy) {
          const bunGeo = new THREE.SphereGeometry(0.08, 8, 8);
          const bun = new THREE.Mesh(bunGeo, this.getMaterial(typeDef.hatColor));
          bun.position.set(0, 0.14, -0.1);
          headGroup.add(bun);
        }
      }

      // Yeux expressifs
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const eyeGeo = new THREE.SphereGeometry(0.03, 6, 6);
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-0.06, 0.02, 0.14);
      const eyeR = eyeL.clone();
      eyeR.position.set(0.06, 0.02, 0.14);
      headGroup.add(eyeL);
      headGroup.add(eyeR);

      charGroup.add(headGroup);

      // Jambes
      const legGeo = new THREE.BoxGeometry(0.12, 0.45, 0.14);
      const pantsMat = this.getMaterial(typeDef.pantsColor);

      const legL = new THREE.Mesh(legGeo, pantsMat);
      legL.position.set(-0.1, 0.4, 0);
      legL.castShadow = true;
      charGroup.add(legL);

      const legR = new THREE.Mesh(legGeo, pantsMat);
      legR.position.set(0.1, 0.4, 0);
      legR.castShadow = true;
      charGroup.add(legR);

      // Bras
      const armGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
      const armL = new THREE.Mesh(armGeo, torsoMat);
      armL.position.set(-0.24, 0.8, 0);
      charGroup.add(armL);

      const armR = new THREE.Mesh(armGeo, torsoMat);
      armR.position.set(0.24, 0.8, 0);
      charGroup.add(armR);

      // Accessoires spécifiques
      let propMesh = null;
      if (typeDef.hasCane) {
        // Canne de marche courbée
        const caneGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.85, 6);
        const caneMat = this.getMaterial(0x4e342e);
        propMesh = new THREE.Mesh(caneGeo, caneMat);
        propMesh.position.set(0.26, 0.45, 0.2);
        charGroup.add(propMesh);
      } else if (typeDef.hasStroller) {
        // Poussette de bébé 3D stylisée
        const strollerGroup = new THREE.Group();
        strollerGroup.position.set(0, 0, 0.7);

        // Châssis poussette
        const frameMat = this.getMaterial(0x34495e);
        const seatMat = this.getMaterial(0xe74c3c); // Poussette rouge vif
        const bassinet = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.65), seatMat);
        bassinet.position.set(0, 0.45, 0);
        strollerGroup.add(bassinet);

        // Capote pare-soleil
        const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.46, 8, 1, false, 0, Math.PI), seatMat);
        canopy.rotation.z = Math.PI / 2;
        canopy.position.set(0, 0.65, -0.15);
        strollerGroup.add(canopy);

        // Guidon poussette
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), frameMat);
        handle.rotation.z = Math.PI / 2;
        handle.position.set(0, 0.85, -0.35);
        strollerGroup.add(handle);

        // 4 Petites roues
        const wheelGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8);
        const wheelMat = this.getMaterial(0x111111);
        [[-0.24, 0.1, 0.25], [0.24, 0.1, 0.25], [-0.24, 0.1, -0.25], [0.24, 0.1, -0.25]].forEach(pos => {
          const w = new THREE.Mesh(wheelGeo, wheelMat);
          w.rotation.z = Math.PI / 2;
          w.position.set(pos[0], pos[1], pos[2]);
          strollerGroup.add(w);
        });

        propMesh = strollerGroup;
        charGroup.add(strollerGroup);
      } else if (typeDef.isGroup) {
        // Deuxième et troisième silhouette pour former un groupe de personnes
        const buddyMat1 = this.getMaterial(0x27ae60);
        const buddy1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.7, 0.2), buddyMat1);
        buddy1.position.set(-0.55, 0.75, 0.1);
        charGroup.add(buddy1);

        const buddyHead1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), skinMat);
        buddyHead1.position.set(-0.55, 1.2, 0.1);
        charGroup.add(buddyHead1);

        const buddyMat2 = this.getMaterial(0xe67e22);
        const buddy2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.75, 0.2), buddyMat2);
        buddy2.position.set(0.55, 0.75, -0.1);
        charGroup.add(buddy2);

        const buddyHead2 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), skinMat);
        buddyHead2.position.set(0.55, 1.25, -0.1);
        charGroup.add(buddyHead2);
      } else if (typeDef.hasBaguette) {
        const bagGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6);
        const bagMat = this.getMaterial(0xd4a373);
        propMesh = new THREE.Mesh(bagGeo, bagMat);
        propMesh.rotation.x = Math.PI / 2.5;
        propMesh.position.set(0.26, 0.78, 0.1);
        charGroup.add(propMesh);
      } else if (typeDef.hasTray) {
        const trayGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12);
        const trayMat = this.getMaterial(0xbdc3c7);
        propMesh = new THREE.Mesh(trayGeo, trayMat);
        propMesh.position.set(0, 0.85, 0.3);

        const cupGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.06, 8);
        const cup = new THREE.Mesh(cupGeo, this.getMaterial(0xffffff));
        cup.position.y = 0.04;
        propMesh.add(cup);
        charGroup.add(propMesh);
      } else if (typeDef.hasBriefcase) {
        const caseGeo = new THREE.BoxGeometry(0.08, 0.22, 0.3);
        const caseMat = this.getMaterial(0x6d4c41);
        propMesh = new THREE.Mesh(caseGeo, caseMat);
        propMesh.position.set(0.28, 0.55, 0);
        charGroup.add(propMesh);
      } else if (typeDef.hasCamera) {
        const camGeo = new THREE.BoxGeometry(0.12, 0.08, 0.08);
        const camMat = this.getMaterial(0x2d3436);
        propMesh = new THREE.Mesh(camGeo, camMat);
        propMesh.position.set(0, 0.88, 0.2);
        charGroup.add(propMesh);
      }

      charGroup.scale.setScalar(typeDef.scale);
      this.scene.add(charGroup);

      this.characters.push({
        group: charGroup,
        typeDef,
        legL,
        legR,
        armL,
        armR,
        headGroup,
        propMesh,
        active: false,
        isFlying: false,
        flyVelX: 0,
        flyVelY: 0,
        flyVelZ: 0,
        flySpinX: 0,
        flySpinY: 0,
        flySpinZ: 0,
        walkPhase: Math.random() * Math.PI * 2,
        walkDirection: (Math.random() > 0.5 ? 1 : -1)
      });
    }
  }

  spawnAhead(playerZ, roadCurveFunc) {
    this.characters.forEach((char, idx) => {
      if (!char.active || char.group.position.z < playerZ - 20) {
        const spawnDistance = 40 + (idx * 4.5) + Math.random() * 8;
        const targetZ = playerZ + spawnDistance;

        const isCrossing = Math.random() < 0.45;
        let targetX = 0;
        if (isCrossing) {
          targetX = (Math.random() - 0.5) * 5.0;
        } else {
          targetX = (Math.random() > 0.5 ? 1 : -1) * (2.8 + Math.random() * 1.4);
        }

        const roadCenterX = roadCurveFunc ? roadCurveFunc(targetZ) : 0;
        char.group.position.set(roadCenterX + targetX, 0, targetZ);
        char.group.rotation.set(0, (Math.random() - 0.5) * 0.4, 0);
        char.active = true;
        char.isFlying = false;
        char.group.visible = true;

        char.legL.rotation.set(0, 0, 0);
        char.legR.rotation.set(0, 0, 0);
        char.armL.rotation.set(0, 0, 0);
        char.armR.rotation.set(0, 0, 0);
        char.headGroup.rotation.set(0, 0, 0);
      }
    });
  }

  triggerSlapstickFlight(char, bikeX, bikeSpeed) {
    char.isFlying = true;
    char.active = false;

    // Projection équilibrée et agréable (pas exagérée) : 4 à 6m de haut
    const dirX = char.group.position.x > bikeX ? 1 : -1;
    char.flyVelX = dirX * (2.2 + Math.random() * 2.5);
    char.flyVelY = 5.2 + Math.random() * 2.8; // Rebond comique modéré
    char.flyVelZ = (bikeSpeed * 0.25) + (Math.random() * 2.0);

    // Rotations comiques légères
    char.flySpinX = (Math.random() - 0.5) * 7.0;
    char.flySpinY = (Math.random() - 0.5) * 8.0;
    char.flySpinZ = dirX * (4.0 + Math.random() * 4.0);
  }

  update(delta, playerZ, bikeX, bikeSpeed, onCollision, roadCurveFunc) {
    this.spawnAhead(playerZ, roadCurveFunc);

    const BIKE_COLLISION_RADIUS = 1.1;

    this.characters.forEach(char => {
      if (!char.group.visible) return;

      if (char.isFlying) {
        char.group.position.x += char.flyVelX * delta;
        char.group.position.y += char.flyVelY * delta;
        char.group.position.z += char.flyVelZ * delta;

        // Gravité
        char.flyVelY -= 15.0 * delta;

        char.group.rotation.x += char.flySpinX * delta;
        char.group.rotation.y += char.flySpinY * delta;
        char.group.rotation.z += char.flySpinZ * delta;

        if (char.group.position.y <= 0) {
          char.group.position.y = 0;
          char.isFlying = false;
          char.group.visible = false;
        }
        return;
      }

      if (char.active) {
        char.walkPhase += delta * (char.typeDef.isJogging ? 11.0 : 5.0);
        const legAngle = Math.sin(char.walkPhase) * 0.55;
        char.legL.rotation.x = legAngle;
        char.legR.rotation.x = -legAngle;
        char.armL.rotation.x = -legAngle * 0.7;
        char.armR.rotation.x = legAngle * 0.7;

        char.group.position.x += char.walkDirection * char.typeDef.speed * delta * 0.35;
        if (Math.abs(char.group.position.x) > 4.2) {
          char.walkDirection *= -1;
          char.group.rotation.y = char.walkDirection > 0 ? 0 : Math.PI;
        }

        const distZ = char.group.position.z - playerZ;
        const distX = Math.abs(char.group.position.x - bikeX);

        if (distZ > 0 && distZ < 6.0 && distX < 2.0) {
          char.armL.rotation.x = 2.4;
          char.armR.rotation.x = 2.4;
        }

        if (Math.abs(distZ) < BIKE_COLLISION_RADIUS && distX < BIKE_COLLISION_RADIUS) {
          this.triggerSlapstickFlight(char, bikeX, bikeSpeed);
          if (onCollision) {
            onCollision(char);
          }
        }
      }
    });
  }

  reset() {
    this.characters.forEach(char => {
      char.active = false;
      char.isFlying = false;
      char.group.visible = false;
      char.group.position.set(0, 0, -100);
      char.headGroup.scale.set(1, 1, 1);
    });
  }
}

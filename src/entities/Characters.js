/**
 * Motormageddon - Système de Personnages 3D Cartoon et Collisions Burlesques
 * Génère des piétons variés avec démarches animées et envols comiques spectaculaires.
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
    bodyColor: 0xff7675, // Chemise hawaïenne corail
    pantsColor: 0xfab1a0, // Short clair
    hatColor: 0xfdcb6e, // Chapeau de paille
    hasCamera: true,
    scale: 0.95,
    speed: 0.8
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
    bodyColor: 0x00cec9, // Néon cyan
    pantsColor: 0x0984e3,
    hatColor: 0xff007f, // Bandeau fluo
    isJogging: true,
    scale: 1.0,
    speed: 3.2
  },
  {
    type: 'waiter',
    name: 'Garçon de Café',
    points: 220,
    bodyColor: 0xf5f6fa, // Chemise blanche
    vestColor: 0x2f3640, // Gilet noir
    pantsColor: 0x2f3640,
    hasTray: true,
    scale: 0.98,
    speed: 1.1
  },
  {
    type: 'grandma',
    name: 'Mamie et son Caddie',
    points: 140,
    bodyColor: 0x9b59b6, // Gilet lilas
    pantsColor: 0x8e44ad,
    hatColor: 0xbdc3c7, // Chignon argenté
    hasCaddy: true,
    scale: 0.88,
    speed: 0.6
  }
];

export class CharacterSystem {
  constructor(scene) {
    this.scene = scene;
    this.poolSize = 24;
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

      // Détails torse (Gilet de serveur, cravate)
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

      // Chapeau ou coiffure
      if (typeDef.hatColor) {
        if (typeDef.isJogging) {
          // Bandeau fluo
          const bandGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.06, 10);
          const band = new THREE.Mesh(bandGeo, this.getMaterial(typeDef.hatColor));
          band.position.y = 0.04;
          headGroup.add(band);
        } else if (typeDef.hasCamera) {
          // Bob de touriste
          const bobGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.1, 10);
          const bob = new THREE.Mesh(bobGeo, this.getMaterial(typeDef.hatColor));
          bob.position.y = 0.12;
          headGroup.add(bob);
        } else if (typeDef.hasBaguette) {
          // Béret noir
          const beretGeo = new THREE.CylinderGeometry(0.22, 0.16, 0.06, 10);
          const beret = new THREE.Mesh(beretGeo, this.getMaterial(typeDef.hatColor));
          beret.position.y = 0.14;
          beret.rotation.z = 0.12;
          headGroup.add(beret);
        } else if (typeDef.hasCaddy) {
          // Chignon mamie
          const bunGeo = new THREE.SphereGeometry(0.08, 8, 8);
          const bun = new THREE.Mesh(bunGeo, this.getMaterial(typeDef.hatColor));
          bun.position.set(0, 0.14, -0.1);
          headGroup.add(bun);
        }
      }

      // Yeux expressifs cartoon
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const eyeGeo = new THREE.SphereGeometry(0.03, 6, 6);
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-0.06, 0.02, 0.14);
      const eyeR = eyeL.clone();
      eyeR.position.set(0.06, 0.02, 0.14);
      headGroup.add(eyeL);
      headGroup.add(eyeR);

      charGroup.add(headGroup);

      // Jambes articulées
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

      // Accessoire tenu en main
      let propMesh = null;
      if (typeDef.hasBaguette) {
        // La fameuse baguette de pain dorée
        const bagGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6);
        const bagMat = this.getMaterial(0xd4a373);
        propMesh = new THREE.Mesh(bagGeo, bagMat);
        propMesh.rotation.x = Math.PI / 2.5;
        propMesh.position.set(0.26, 0.78, 0.1);
        charGroup.add(propMesh);
      } else if (typeDef.hasTray) {
        // Plateau de garçon de café avec tasse
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
        // Mallette en cuir
        const caseGeo = new THREE.BoxGeometry(0.08, 0.22, 0.3);
        const caseMat = this.getMaterial(0x6d4c41);
        propMesh = new THREE.Mesh(caseGeo, caseMat);
        propMesh.position.set(0.28, 0.55, 0);
        charGroup.add(propMesh);
      } else if (typeDef.hasCamera) {
        // Appareil photo touriste
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

  spawnAhead(playerZ) {
    // Activer et recycler les piétons trop loin derrière ou inactifs
    this.characters.forEach((char, idx) => {
      if (!char.active || char.group.position.z < playerZ - 20) {
        // Spawner devant le joueur entre 40 et 140 mètres
        const spawnDistance = 45 + (idx * 5) + Math.random() * 10;
        const targetZ = playerZ + spawnDistance;

        // Position latérale : trottoirs (-3.8m / +3.8m) ou passage piéton / rue (-2.5m à +2.5m)
        const isCrossing = Math.random() < 0.45;
        let targetX = 0;
        if (isCrossing) {
          targetX = (Math.random() - 0.5) * 5.0;
        } else {
          // Sur le bord / trottoir
          targetX = (Math.random() > 0.5 ? 1 : -1) * (2.8 + Math.random() * 1.4);
        }

        char.group.position.set(targetX, 0, targetZ);
        char.group.rotation.set(0, (Math.random() - 0.5) * 0.4, 0);
        char.active = true;
        char.isFlying = false;
        char.group.visible = true;

        // Reset poses
        char.legL.rotation.set(0, 0, 0);
        char.legR.rotation.set(0, 0, 0);
        char.armL.rotation.set(0, 0, 0);
        char.armR.rotation.set(0, 0, 0);
        char.headGroup.rotation.set(0, 0, 0);
        if (char.propMesh) char.propMesh.rotation.set(0, 0, 0);
      }
    });
  }

  triggerSlapstickFlight(char, bikeX, bikeSpeed) {
    char.isFlying = true;
    char.active = false; // Ne collisionne plus

    // Vitesse de projection comique cartoon vers les étoiles
    const dirX = char.group.position.x > bikeX ? 1 : -1;
    char.flyVelX = dirX * (4.0 + Math.random() * 5.0);
    char.flyVelY = 12.0 + Math.random() * 7.0; // Projection verticale haute
    char.flyVelZ = (bikeSpeed * 0.4) + (Math.random() * 4.0); // Propulsion en avant

    // Rotations de cabriole acrobatique
    char.flySpinX = (Math.random() - 0.5) * 18.0;
    char.flySpinY = (Math.random() - 0.5) * 22.0;
    char.flySpinZ = dirX * (10.0 + Math.random() * 12.0);

    // Yeux effarés comiques
    char.headGroup.scale.set(1.4, 1.4, 1.4);
  }

  update(delta, playerZ, bikeX, bikeSpeed, onCollision) {
    this.spawnAhead(playerZ);

    const BIKE_COLLISION_RADIUS = 1.1;

    this.characters.forEach(char => {
      if (!char.group.visible) return;

      if (char.isFlying) {
        // Physique cartoon de catapulte dans les airs
        char.group.position.x += char.flyVelX * delta;
        char.group.position.y += char.flyVelY * delta;
        char.group.position.z += char.flyVelZ * delta;

        // Gravité cartoon exagérée
        char.flyVelY -= 22.0 * delta;

        // Vrilles et saltos
        char.group.rotation.x += char.flySpinX * delta;
        char.group.rotation.y += char.flySpinY * delta;
        char.group.rotation.z += char.flySpinZ * delta;

        // Écartement comique des bras et jambes
        char.armL.rotation.z = -2.2;
        char.armR.rotation.z = 2.2;
        char.legL.rotation.z = -1.2;
        char.legR.rotation.z = 1.2;

        // Si le personnage retombe au sol après son grand saut
        if (char.group.position.y <= 0) {
          char.group.position.y = 0;
          char.isFlying = false;
          char.group.visible = false; // Disparaît après son vol comique
        }
        return;
      }

      if (char.active) {
        // Animation de marche ou jogging
        char.walkPhase += delta * (char.typeDef.isJogging ? 11.0 : 6.0);
        const legAngle = Math.sin(char.walkPhase) * 0.65;
        char.legL.rotation.x = legAngle;
        char.legR.rotation.x = -legAngle;
        char.armL.rotation.x = -legAngle * 0.8;
        char.armR.rotation.x = legAngle * 0.8;

        // Déplacement léger en travers de la rue
        char.group.position.x += char.walkDirection * char.typeDef.speed * delta * 0.4;
        if (Math.abs(char.group.position.x) > 4.2) {
          char.walkDirection *= -1;
          char.group.rotation.y = char.walkDirection > 0 ? 0 : Math.PI;
        }

        // Réaction comique de panique si la moto est proche
        const distZ = char.group.position.z - playerZ;
        const distX = Math.abs(char.group.position.x - bikeX);

        if (distZ > 0 && distZ < 8.0 && distX < 2.5) {
          // Panique : bras levés au ciel !
          char.armL.rotation.x = 2.8;
          char.armR.rotation.x = 2.8;
          char.headGroup.position.y = 1.35 + Math.sin(char.walkPhase * 2) * 0.08;
        }

        // Détection de collision burlesque avec la moto
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

/**
 * Motormageddon - Système de Personnages 3D Cartoon Haute Définition
 * Piétons détaillés (Enfants, Vieux, Femmes, Hommes), animations de marche expressives,
 * et IA de fuite paniquée : quand la moto approche, ils crient, agitent les bras et tentent de s'enfuir vers le trottoir !
 */

import * as THREE from 'three';

export const CHARACTER_TYPES = [
  {
    type: 'parisian',
    name: 'Parisien Pressé',
    category: 'man',
    points: 150,
    bodyColor: 0x2c3e50,
    pantsColor: 0x34495e,
    hatColor: 0x111111,
    hasBaguette: true,
    scale: 1.0,
    speed: 1.3
  },
  {
    type: 'chic_woman',
    name: 'Parisienne Chic',
    category: 'woman',
    points: 170,
    bodyColor: 0xe84393, // Chemisier fuchsia
    pantsColor: 0x2d3436, // Jupe/pantalon chic
    hatColor: 0xfdcb6e,  // Chapeau de paille / coiffure dorée
    hasHandbag: true,
    scale: 0.96,
    speed: 1.1
  },
  {
    type: 'papy',
    name: 'Papy et sa Canne',
    category: 'elderly',
    points: 160,
    bodyColor: 0x795548, // Tweed marron
    pantsColor: 0x4e342e,
    hatColor: 0x424242,  // Casquette feutre
    hasCane: true,
    scale: 0.9,
    speed: 0.65
  },
  {
    type: 'child_scooter',
    name: 'Enfant en Trottinette',
    category: 'child',
    points: 210,
    bodyColor: 0x0984e3, // T-shirt bleu vif
    pantsColor: 0xff7675, // Short corail
    hatColor: 0xff4757,  // Casquette à l'envers
    hasScooter: true,
    scale: 0.78,
    speed: 2.2
  },
  {
    type: 'poussette',
    name: 'Parent & Poussette',
    category: 'child',
    points: 240,
    bodyColor: 0x16a085, // Veste turquoise
    pantsColor: 0x2c3e50,
    hatColor: null,
    hasStroller: true,
    scale: 1.0,
    speed: 0.95
  },
  {
    type: 'grandma',
    name: 'Mamie & son Caddie',
    category: 'elderly',
    points: 150,
    bodyColor: 0x8e44ad, // Cardigan violet
    pantsColor: 0x6c5ce7,
    hatColor: 0xbdc3c7,  // Chignon argenté
    hasCaddy: true,
    scale: 0.88,
    speed: 0.6
  },
  {
    type: 'tourist_woman',
    name: 'Touriste Flâneuse',
    category: 'woman',
    points: 130,
    bodyColor: 0x00cec9, // Robe estivale turquoise
    pantsColor: 0x55efc4,
    hatColor: 0xff7675,
    hasCamera: true,
    scale: 0.94,
    speed: 0.85
  },
  {
    type: 'businessman',
    name: 'Trader en Retard',
    category: 'man',
    points: 180,
    bodyColor: 0x1e272e,
    pantsColor: 0x1e272e,
    tieColor: 0xe74c3c,
    hasBriefcase: true,
    scale: 1.05,
    speed: 1.8
  },
  {
    type: 'waiter',
    name: 'Garçon de Café',
    category: 'man',
    points: 220,
    bodyColor: 0xf5f6fa,
    vestColor: 0x2f3640,
    pantsColor: 0x2f3640,
    hasTray: true,
    scale: 0.98,
    speed: 1.2
  },
  {
    type: 'group',
    name: 'Groupe d\'Amis',
    category: 'man',
    points: 320,
    bodyColor: 0xf39c12,
    pantsColor: 0x2980b9,
    hatColor: 0x27ae60,
    isGroup: true,
    scale: 1.0,
    speed: 0.75
  }
];

export class CharacterSystem {
  constructor(scene) {
    this.scene = scene;
    this.poolSize = 30;
    this.characters = [];
    this.materialsCache = {};

    this.initPool();
  }

  getMaterial(color, roughness = 0.4) {
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
    const shoeMat = this.getMaterial(0x1e272e);

    for (let i = 0; i < this.poolSize; i++) {
      const typeDef = CHARACTER_TYPES[i % CHARACTER_TYPES.length];
      const charGroup = new THREE.Group();
      charGroup.scale.setScalar(typeDef.scale);

      // 1. Torse et vêtements
      const torsoGeo = new THREE.BoxGeometry(0.36, 0.48, 0.24);
      const torsoMat = this.getMaterial(typeDef.bodyColor);
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      torso.position.y = 0.88;
      torso.castShadow = true;
      charGroup.add(torso);

      // Détails torse (Gilet garçon de café, cravate trader, col)
      if (typeDef.hasTray) {
        const vestGeo = new THREE.BoxGeometry(0.38, 0.44, 0.25);
        const vest = new THREE.Mesh(vestGeo, this.getMaterial(typeDef.vestColor));
        vest.position.y = 0.86;
        charGroup.add(vest);
      } else if (typeDef.tieColor) {
        const tieGeo = new THREE.BoxGeometry(0.08, 0.32, 0.04);
        const tie = new THREE.Mesh(tieGeo, this.getMaterial(typeDef.tieColor));
        tie.position.set(0, 0.88, 0.13);
        charGroup.add(tie);
      }

      // 2. Tête détaillée et coiffure
      const headGroup = new THREE.Group();
      headGroup.position.y = 1.30;

      const headGeo = new THREE.SphereGeometry(0.17, 12, 10);
      const head = new THREE.Mesh(headGeo, skinMat);
      headGroup.add(head);

      // Chapeaux, chignons et coiffures selon le type
      if (typeDef.hatColor) {
        if (typeDef.hasCane) {
          // Casquette feutre de grand-père
          const capGeo = new THREE.CylinderGeometry(0.23, 0.19, 0.08, 12);
          const cap = new THREE.Mesh(capGeo, this.getMaterial(typeDef.hatColor));
          cap.position.y = 0.13;
          headGroup.add(cap);

          // Visière
          const visorGeo = new THREE.BoxGeometry(0.24, 0.03, 0.12);
          const visor = new THREE.Mesh(visorGeo, this.getMaterial(typeDef.hatColor));
          visor.position.set(0, 0.1, 0.14);
          headGroup.add(visor);
        } else if (typeDef.hasScooter) {
          // Casquette à l'envers d'enfant
          const capGeo = new THREE.SphereGeometry(0.18, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
          const cap = new THREE.Mesh(capGeo, this.getMaterial(typeDef.hatColor));
          cap.position.y = 0.04;
          headGroup.add(cap);
        } else if (typeDef.hasHandbag) {
          // Chevelure volumineuse femme chic
          const hairGeo = new THREE.SphereGeometry(0.20, 10, 8);
          const hair = new THREE.Mesh(hairGeo, this.getMaterial(typeDef.hatColor));
          hair.position.set(0, 0.03, -0.04);
          headGroup.add(hair);
        } else if (typeDef.hasBaguette) {
          // Béret classique parisien penché
          const beretGeo = new THREE.CylinderGeometry(0.23, 0.17, 0.07, 12);
          const beret = new THREE.Mesh(beretGeo, this.getMaterial(typeDef.hatColor));
          beret.position.set(0.04, 0.15, 0);
          beret.rotation.z = 0.15;
          headGroup.add(beret);
        } else if (typeDef.hasCaddy) {
          // Chignon mamie
          const bunGeo = new THREE.SphereGeometry(0.1, 8, 8);
          const bun = new THREE.Mesh(bunGeo, this.getMaterial(typeDef.hatColor));
          bun.position.set(0, 0.15, -0.12);
          headGroup.add(bun);
        }
      }

      // Yeux expressifs avec bouche cartoon
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const eyeGeo = new THREE.SphereGeometry(0.032, 6, 6);
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-0.065, 0.02, 0.15);
      const eyeR = eyeL.clone();
      eyeR.position.set(0.065, 0.02, 0.15);
      headGroup.add(eyeL);
      headGroup.add(eyeR);

      // Petite bouche ouverte comique (qui s'ouvre en cri lors de la panique)
      const mouthGeo = new THREE.SphereGeometry(0.028, 6, 6);
      const mouthMat = new THREE.MeshBasicMaterial({ color: 0x990000 });
      const mouth = new THREE.Mesh(mouthGeo, mouthMat);
      mouth.position.set(0, -0.06, 0.14);
      mouth.scale.set(1.2, 0.8, 0.6);
      headGroup.add(mouth);

      charGroup.add(headGroup);

      // 3. Jambes articulées avec chaussures
      const pantsMat = this.getMaterial(typeDef.pantsColor);

      const legLGroup = new THREE.Group();
      legLGroup.position.set(-0.11, 0.65, 0);
      const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.46, 0.15), pantsMat);
      legLMesh.position.y = -0.23;
      legLMesh.castShadow = true;
      legLGroup.add(legLMesh);
      const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), shoeMat);
      shoeL.position.set(0, -0.44, 0.04);
      legLGroup.add(shoeL);
      charGroup.add(legLGroup);

      const legRGroup = new THREE.Group();
      legRGroup.position.set(0.11, 0.65, 0);
      const legRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.46, 0.15), pantsMat);
      legRMesh.position.y = -0.23;
      legRMesh.castShadow = true;
      legRGroup.add(legRMesh);
      const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), shoeMat);
      shoeR.position.set(0, -0.44, 0.04);
      legRGroup.add(shoeR);
      charGroup.add(legRGroup);

      // 4. Bras articulés
      const armLGroup = new THREE.Group();
      armLGroup.position.set(-0.25, 1.05, 0);
      const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 0.11), torsoMat);
      armLMesh.position.y = -0.21;
      armLGroup.add(armLMesh);
      const handL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), skinMat);
      handL.position.y = -0.42;
      armLGroup.add(handL);
      charGroup.add(armLGroup);

      const armRGroup = new THREE.Group();
      armRGroup.position.set(0.25, 1.05, 0);
      const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 0.11), torsoMat);
      armRMesh.position.y = -0.21;
      armRGroup.add(armRMesh);
      const handR = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), skinMat);
      handR.position.y = -0.42;
      armRGroup.add(handR);
      charGroup.add(armRGroup);

      // 5. Accessoires 3D spécifiques
      let propMesh = null;
      if (typeDef.hasCane) {
        // Canne de marche courbée
        const caneGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.85, 6);
        propMesh = new THREE.Mesh(caneGeo, this.getMaterial(0x4e342e));
        propMesh.position.set(0.28, 0.45, 0.22);
        charGroup.add(propMesh);
      } else if (typeDef.hasScooter) {
        // Trottinette sous l'enfant
        const scGroup = new THREE.Group();
        const deck = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.75), this.getMaterial(0xff4757));
        deck.position.set(0, 0.05, 0);
        scGroup.add(deck);

        const tBar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65, 6), this.getMaterial(0xdcdde1));
        tBar.position.set(0, 0.35, 0.32);
        scGroup.add(tBar);
        charGroup.add(scGroup);
        propMesh = scGroup;
      } else if (typeDef.hasHandbag) {
        // Sac à main stylé
        const bagGeo = new THREE.BoxGeometry(0.18, 0.18, 0.08);
        propMesh = new THREE.Mesh(bagGeo, this.getMaterial(0x2d3436));
        propMesh.position.set(0.32, 0.55, 0.05);
        charGroup.add(propMesh);
      } else if (typeDef.hasStroller) {
        // Poussette de bébé 3D
        const strollerGroup = new THREE.Group();
        strollerGroup.position.set(0, 0, 0.75);
        const frameMat = this.getMaterial(0x34495e);

        const basin = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 0.85), this.getMaterial(0x0984e3));
        basin.position.y = 0.48;
        strollerGroup.add(basin);

        const hood = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.getMaterial(0x00cec9));
        hood.position.set(0, 0.65, 0.2);
        strollerGroup.add(hood);

        // Bébé cartoon visible dans la poussette
        const babyHead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), skinMat);
        babyHead.position.set(0, 0.58, 0.12);
        strollerGroup.add(babyHead);

        // 4 Roues de la poussette
        const wMat = this.getMaterial(0x111111);
        [[-0.35, 0.14, -0.32], [0.35, 0.14, -0.32], [-0.35, 0.14, 0.32], [0.35, 0.14, 0.32]].forEach(p => {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 8), wMat);
          w.rotation.z = Math.PI / 2;
          w.position.set(p[0], p[1], p[2]);
          strollerGroup.add(w);
        });

        charGroup.add(strollerGroup);
        propMesh = strollerGroup;
      } else if (typeDef.hasBaguette) {
        // Baguette de pain dorée
        const bagGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.75, 8);
        propMesh = new THREE.Mesh(bagGeo, this.getMaterial(0xe58e26));
        propMesh.rotation.x = Math.PI / 3;
        propMesh.position.set(-0.28, 0.65, 0.18);
        charGroup.add(propMesh);
      } else if (typeDef.hasCaddy) {
        // Caddie de courses rouge
        const caddyGroup = new THREE.Group();
        caddyGroup.position.set(0.38, 0.42, 0.18);
        const basket = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.55, 0.38), this.getMaterial(0xe74c3c));
        caddyGroup.add(basket);
        charGroup.add(caddyGroup);
        propMesh = caddyGroup;
      }

      this.scene.add(charGroup);
      charGroup.visible = false;

      this.characters.push({
        group: charGroup,
        typeDef,
        category: typeDef.category || 'man',
        legL: legLGroup,
        legR: legRGroup,
        armL: armLGroup,
        armR: armRGroup,
        headGroup,
        mouth,
        propMesh,
        active: false,
        isFlying: false,
        isFleeing: false,
        fleeDirectionX: 0,
        fleeTimer: 0,
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
        const spawnDistance = 42 + (idx * 4.8) + Math.random() * 8;
        const targetZ = playerZ + spawnDistance;

        const isCrossing = Math.random() < 0.55;
        let targetX = 0;
        if (isCrossing) {
          targetX = (Math.random() - 0.5) * 5.2;
        } else {
          targetX = (Math.random() > 0.5 ? 1 : -1) * (2.8 + Math.random() * 1.5);
        }

        const roadCenterX = roadCurveFunc ? roadCurveFunc(targetZ) : 0;
        char.group.position.set(roadCenterX + targetX, 0, targetZ);
        char.group.rotation.set(0, (Math.random() - 0.5) * 0.4, 0);
        char.active = true;
        char.isFlying = false;
        char.isFleeing = false;
        char.fleeTimer = 0;
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
    char.isFleeing = false;

    // Projection burlesque équilibrée : 4 à 6m de haut
    const dirX = char.group.position.x > bikeX ? 1 : -1;
    char.flyVelX = dirX * (2.4 + Math.random() * 2.6);
    char.flyVelY = 5.4 + Math.random() * 2.8;
    char.flyVelZ = (bikeSpeed * 0.28) + (Math.random() * 2.0);

    // Rotations comiques en vol
    char.flySpinX = (Math.random() - 0.5) * 7.5;
    char.flySpinY = (Math.random() - 0.5) * 8.5;
    char.flySpinZ = dirX * (4.2 + Math.random() * 4.0);
  }

  update(delta, playerZ, bikeX, bikeSpeed, onCollision, roadCurveFunc) {
    this.spawnAhead(playerZ, roadCurveFunc);

    const BIKE_COLLISION_RADIUS = 1.15;

    this.characters.forEach(char => {
      if (!char.group.visible) return;

      // 1. Chute et vol burlesque après impact
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

      // 2. Piéton actif sur la chaussée / trottoir
      if (char.active) {
        const distZ = char.group.position.z - playerZ;
        const distX = Math.abs(char.group.position.x - bikeX);

        // --- NOUVEAUTÉ : IA DE FUITE PANIQUÉE ("ILS TENTENT DE S'ENFUIR !") ---
        // Quand la moto approche à moins de 26m et sur une trajectoire dangereuse
        if (distZ > 0 && distZ < 26.0 && distX < 3.8) {
          char.isFleeing = true;
          char.fleeTimer += delta;

          // Ils choisissent le trottoir le plus proche pour s'échapper
          if (char.fleeDirectionX === 0) {
            char.fleeDirectionX = char.group.position.x >= bikeX ? 1 : -1;
          }

          // Sprint frénétique vers le trottoir
          const sprintSpeed = char.typeDef.speed * 2.8;
          char.group.position.x += char.fleeDirectionX * sprintSpeed * delta;

          // Orientation du regard terrifié vers la direction de fuite
          char.group.rotation.y = char.fleeDirectionX > 0 ? Math.PI / 2 : -Math.PI / 2;

          // Animation de panique comique : bras levés au ciel agités frénétiquement
          char.walkPhase += delta * 18.0; // Foulées ultra rapides
          char.armL.rotation.x = 2.4 + Math.sin(char.fleeTimer * 24.0) * 0.45;
          char.armR.rotation.x = 2.4 + Math.cos(char.fleeTimer * 24.0) * 0.45;
          char.headGroup.rotation.y = (char.fleeDirectionX > 0 ? -0.4 : 0.4) + Math.sin(char.fleeTimer * 16.0) * 0.25;

          // Foulées rapides
          const legAngle = Math.sin(char.walkPhase) * 0.85;
          char.legL.rotation.x = legAngle;
          char.legR.rotation.x = -legAngle;

          // Si le piéton a réussi à atteindre le trottoir hors de portée (> 4.8m)
          if (Math.abs(char.group.position.x) > 4.8) {
            // Sauvé ! Il saute de soulagement sur le trottoir
            char.armL.rotation.x = 0;
            char.armR.rotation.x = 0;
          }
        } else {
          // Marche normale de flâneur
          char.isFleeing = false;
          char.fleeDirectionX = 0;

          char.walkPhase += delta * 5.5;
          const legAngle = Math.sin(char.walkPhase) * 0.55;
          char.legL.rotation.x = legAngle;
          char.legR.rotation.x = -legAngle;
          char.armL.rotation.x = -legAngle * 0.65;
          char.armR.rotation.x = legAngle * 0.65;
          char.headGroup.rotation.y = 0;

          // Déplacement régulier traversant
          char.group.position.x += char.walkDirection * char.typeDef.speed * delta * 0.45;
          if (Math.abs(char.group.position.x) > 4.2) {
            char.walkDirection *= -1;
            char.group.rotation.y = char.walkDirection > 0 ? 0 : Math.PI;
          }
        }

        // 3. Détection de collision physique avec la moto
        if (distZ > 0 && distZ < BIKE_COLLISION_RADIUS && distX < BIKE_COLLISION_RADIUS) {
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
      char.isFleeing = false;
      char.group.visible = false;
    });
  }
}

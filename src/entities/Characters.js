/**
 * Motormageddon - Système de Personnages 3D Cartoon Haute Définition (Graphismes & Animations Experts)
 * Piétons vivants et expressifs : Yeux cartoon brillants, bouches animées (cri de terreur), sourcils expressifs,
 * démarches uniques, IA de panique hystérique (bras moulinant en l'air, tête jetée en arrière vers la moto),
 * et voltige burlesque avec étoiles de vertige tournantes (dizzy stars) à l'impact.
 */

import * as THREE from 'three';
import { textureFactory } from '../gfx/TextureFactory.js';

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
    bodyColor: 0xe84393, // Chemisier fuchsia éclatant
    pantsColor: 0x2d3436, // Jupe/pantalon chic
    hatColor: 0xfdcb6e,  // Coiffure dorée stylée
    hasHandbag: true,
    scale: 0.96,
    speed: 1.1
  },
  {
    type: 'papy',
    name: 'Papy et sa Canne',
    category: 'elderly',
    points: 160,
    bodyColor: 0x795548, // Veste tweed marron
    pantsColor: 0x4e342e,
    hatColor: 0x576574,  // Casquette feutre
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
    hatColor: 0xff4757,  // Casquette rouge à l'envers
    hasScooter: true,
    scale: 0.78,
    speed: 2.2
  },
  {
    type: 'poussette',
    name: 'Parent & Poussette',
    category: 'child',
    points: 240,
    bodyColor: 0x10ac84, // Parka turquoise
    pantsColor: 0x222f3e,
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
    hatColor: 0xc8d6e5,  // Chignon gris perle
    hasCaddy: true,
    scale: 0.88,
    speed: 0.6
  },
  {
    type: 'tourist_woman',
    name: 'Touriste Flâneuse',
    category: 'woman',
    points: 130,
    bodyColor: 0x00d2d3, // Robe menthe
    pantsColor: 0x1dd1a1,
    hatColor: 0xff9ff3,
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
    tieColor: 0xff3838,
    scale: 1.02,
    speed: 1.45
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

  getMaterial(color, roughness = 0.35) {
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
    const skinMat = this.getMaterial(0xffdbac, 0.4);
    const shoeMat = this.getMaterial(0x1e272e, 0.5);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
    const starGoldMat = new THREE.MeshBasicMaterial({ color: 0xffd32a });
    const shadowTex = textureFactory.getContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });

    for (let i = 0; i < this.poolSize; i++) {
      const typeDef = CHARACTER_TYPES[i % CHARACTER_TYPES.length];
      const charGroup = new THREE.Group();
      charGroup.scale.setScalar(typeDef.scale);

      // 0. Ombre de contact au sol (ancre le piéton sur le bitume)
      const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = 0.02;
      charGroup.add(shadowMesh);

      // 1. Torse cartoon stylisé
      const torsoGeo = new THREE.BoxGeometry(0.38, 0.48, 0.25);
      const torsoMat = this.getMaterial(typeDef.bodyColor);
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      torso.position.y = 0.88;
      torso.castShadow = true;
      charGroup.add(torso);

      // Détails torse (gilet, cravate rouge, col)
      if (typeDef.hasTray) {
        const vestGeo = new THREE.BoxGeometry(0.40, 0.45, 0.27);
        const vest = new THREE.Mesh(vestGeo, this.getMaterial(typeDef.vestColor));
        vest.position.y = 0.86;
        charGroup.add(vest);
      } else if (typeDef.tieColor) {
        const tieGeo = new THREE.BoxGeometry(0.09, 0.34, 0.04);
        const tie = new THREE.Mesh(tieGeo, this.getMaterial(typeDef.tieColor));
        tie.position.set(0, 0.88, 0.14);
        charGroup.add(tie);
      }

      // 2. Tête cartoon expressive avec traits complets
      const headGroup = new THREE.Group();
      headGroup.position.y = 1.30;

      const headGeo = new THREE.SphereGeometry(0.18, 12, 10);
      const head = new THREE.Mesh(headGeo, skinMat);
      headGroup.add(head);

      // Coiffure ou couvre-chef
      if (typeDef.hatColor) {
        if (typeDef.hasCane) {
          // Casquette feutre papy
          const capGeo = new THREE.CylinderGeometry(0.23, 0.19, 0.08, 12);
          const cap = new THREE.Mesh(capGeo, this.getMaterial(typeDef.hatColor));
          cap.position.y = 0.14;
          headGroup.add(cap);
          const visorGeo = new THREE.BoxGeometry(0.24, 0.03, 0.13);
          const visor = new THREE.Mesh(visorGeo, this.getMaterial(typeDef.hatColor));
          visor.position.set(0, 0.11, 0.15);
          headGroup.add(visor);
        } else if (typeDef.hasScooter) {
          // Casquette enfant à l'envers
          const capGeo = new THREE.SphereGeometry(0.19, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
          const cap = new THREE.Mesh(capGeo, this.getMaterial(typeDef.hatColor));
          cap.position.y = 0.05;
          headGroup.add(cap);
        } else if (typeDef.hasHandbag) {
          // Chevelure volumineuse stylée
          const hairGeo = new THREE.SphereGeometry(0.21, 10, 8);
          const hair = new THREE.Mesh(hairGeo, this.getMaterial(typeDef.hatColor));
          hair.position.set(0, 0.04, -0.04);
          headGroup.add(hair);
        } else if (typeDef.hasBaguette) {
          // Béret parisien penché
          const beretGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.07, 12);
          const beret = new THREE.Mesh(beretGeo, this.getMaterial(typeDef.hatColor));
          beret.position.set(0.04, 0.16, 0);
          beret.rotation.z = 0.16;
          headGroup.add(beret);
        } else if (typeDef.hasCaddy) {
          // Chignon mamie
          const bunGeo = new THREE.SphereGeometry(0.11, 8, 8);
          const bun = new THREE.Mesh(bunGeo, this.getMaterial(typeDef.hatColor));
          bun.position.set(0, 0.16, -0.13);
          headGroup.add(bun);
        }
      }

      // --- VISAGE EXPRESSIF CARTOON ---
      // Yeux blancs avec reflets
      const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
      const pupilGeo = new THREE.SphereGeometry(0.024, 6, 6);

      const eyeL = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      eyeL.position.set(-0.065, 0.03, 0.16);
      eyeL.scale.set(1.0, 1.25, 0.6);
      const pupilL = new THREE.Mesh(pupilGeo, eyePupilMat);
      pupilL.position.set(-0.065, 0.03, 0.19);
      headGroup.add(eyeL, pupilL);

      const eyeR = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      eyeR.position.set(0.065, 0.03, 0.16);
      eyeR.scale.set(1.0, 1.25, 0.6);
      const pupilR = new THREE.Mesh(pupilGeo, eyePupilMat);
      pupilR.position.set(0.065, 0.03, 0.19);
      headGroup.add(eyeR, pupilR);

      // Sourcils expressifs
      const browGeo = new THREE.BoxGeometry(0.07, 0.02, 0.03);
      const browMat = this.getMaterial(0x2f3640);
      const browL = new THREE.Mesh(browGeo, browMat);
      browL.position.set(-0.065, 0.09, 0.16);
      browL.rotation.z = -0.15;
      const browR = new THREE.Mesh(browGeo, browMat);
      browR.position.set(0.065, 0.09, 0.16);
      browR.rotation.z = 0.15;
      headGroup.add(browL, browR);

      // Bouche animée (s'ouvre en grand cri "O" lors de la panique)
      const mouthGeo = new THREE.SphereGeometry(0.035, 8, 8);
      const mouth = new THREE.Mesh(mouthGeo, mouthMat);
      mouth.position.set(0, -0.06, 0.16);
      mouth.scale.set(1.1, 0.6, 0.5);
      headGroup.add(mouth);

      // Étoiles de vertige (Dizzy Stars) au-dessus de la tête lors de l'envol
      const dizzyGroup = new THREE.Group();
      dizzyGroup.position.set(0, 0.32, 0);
      dizzyGroup.visible = false;
      for (let s = 0; s < 3; s++) {
        const star = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), starGoldMat);
        const ang = (s / 3) * Math.PI * 2;
        star.position.set(Math.cos(ang) * 0.25, 0, Math.sin(ang) * 0.25);
        dizzyGroup.add(star);
      }
      headGroup.add(dizzyGroup);

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

      // 4. Bras articulés avec mains
      const armLGroup = new THREE.Group();
      armLGroup.position.set(-0.25, 1.05, 0);
      const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 0.11), torsoMat);
      armLMesh.position.y = -0.21;
      armLGroup.add(armLMesh);
      const handL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), skinMat);
      handL.position.y = -0.42;
      armLGroup.add(handL);
      charGroup.add(armLGroup);

      const armRGroup = new THREE.Group();
      armRGroup.position.set(0.25, 1.05, 0);
      const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 0.11), torsoMat);
      armRMesh.position.y = -0.21;
      armRGroup.add(armRMesh);
      const handR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), skinMat);
      handR.position.y = -0.42;
      armRGroup.add(handR);
      charGroup.add(armRGroup);

      // 5. Accessoires 3D
      let propMesh = null;
      if (typeDef.hasCane) {
        const caneGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.85, 6);
        propMesh = new THREE.Mesh(caneGeo, this.getMaterial(0x4e342e));
        propMesh.position.set(0.28, 0.45, 0.22);
        charGroup.add(propMesh);
      } else if (typeDef.hasScooter) {
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
        const bagGeo = new THREE.BoxGeometry(0.14, 0.18, 0.08);
        propMesh = new THREE.Mesh(bagGeo, this.getMaterial(0x6c5ce7));
        propMesh.position.set(0.28, 0.65, 0.08);
        charGroup.add(propMesh);
      } else if (typeDef.hasBaguette) {
        const baguetteGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.62, 8);
        propMesh = new THREE.Mesh(baguetteGeo, this.getMaterial(0xd3a356));
        baguetteGeo.rotateZ(Math.PI / 2.8);
        propMesh.position.set(-0.24, 0.85, 0.12);
        charGroup.add(propMesh);
      } else if (typeDef.hasCaddy) {
        const caddyGroup = new THREE.Group();
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.25), this.getMaterial(0xe17055));
        bag.position.set(0, 0.35, 0);
        caddyGroup.add(bag);
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), this.getMaterial(0x2d3436));
        handle.position.set(0, 0.65, -0.05);
        caddyGroup.add(handle);
        caddyGroup.position.set(0.32, 0, 0.1);
        charGroup.add(caddyGroup);
        propMesh = caddyGroup;
      } else if (typeDef.hasStroller) {
        const stroller = new THREE.Group();
        const pram = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.68), this.getMaterial(0x0984e3));
        pram.position.set(0, 0.42, 0.5);
        stroller.add(pram);
        charGroup.add(stroller);
        propMesh = stroller;
      }

      charGroup.visible = false;
      this.scene.add(charGroup);

      this.characters.push({
        id: i,
        group: charGroup,
        typeDef,
        headGroup,
        mouth,
        dizzyGroup,
        browL,
        browR,
        legL: legLGroup,
        legR: legRGroup,
        armL: armLGroup,
        armR: armRGroup,
        propMesh,
        active: false,
        isFlying: false,
        isFleeing: false,
        hasNearMissed: false,
        fleeDirectionX: 0,
        fleeTimer: 0,
        walkPhase: Math.random() * Math.PI * 2,
        walkDirection: (i % 2 === 0) ? 1 : -1,
        flyVelX: 0,
        flyVelY: 0,
        flyVelZ: 0,
        flySpinX: 0,
        flySpinY: 0,
        flySpinZ: 0
      });
    }
  }

  reset() {
    this.characters.forEach(char => {
      char.active = false;
      char.isFlying = false;
      char.isFleeing = false;
      char.hasNearMissed = false;
      char.group.visible = false;
      char.group.position.set(0, -100, 0);
      char.group.rotation.set(0, 0, 0);
      if (char.dizzyGroup) char.dizzyGroup.visible = false;
      if (char.mouth) char.mouth.scale.set(1.1, 0.6, 0.5);
    });
  }

  spawnAhead(playerZ, roadCurveFunc) {
    const minZ = playerZ + 40;
    const maxZ = playerZ + 160;

    this.characters.forEach(char => {
      if (!char.group.visible || char.group.position.z < playerZ - 20) {
        const newZ = minZ + Math.random() * (maxZ - minZ);
        const curveX = roadCurveFunc ? roadCurveFunc(newZ) : 0;
        const laneOffset = (Math.random() - 0.5) * 6.4;

        char.group.position.set(curveX + laneOffset, 0, newZ);
        char.group.rotation.set(0, char.walkDirection > 0 ? 0 : Math.PI, 0);
        char.active = true;
        char.isFlying = false;
        char.isFleeing = false;
        char.hasNearMissed = false;
        char.fleeTimer = 0;
        char.group.visible = true;

        if (char.dizzyGroup) char.dizzyGroup.visible = false;
        if (char.mouth) char.mouth.scale.set(1.1, 0.6, 0.5);

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

    if (char.dizzyGroup) {
      char.dizzyGroup.visible = true;
    }
    if (char.mouth) {
      char.mouth.scale.set(2.2, 2.0, 1.4); // Bouche béante de cri
    }

    // Projection burlesque spectaculaire : 4.5 à 6.5m de hauteur
    const dirX = char.group.position.x > bikeX ? 1 : -1;
    char.flyVelX = dirX * (2.8 + Math.random() * 3.0);
    char.flyVelY = 6.2 + Math.random() * 3.2;
    char.flyVelZ = (bikeSpeed * 0.3) + (Math.random() * 2.5);

    // Rotations comiques en vol
    char.flySpinX = (Math.random() - 0.5) * 8.5;
    char.flySpinY = (Math.random() - 0.5) * 9.5;
    char.flySpinZ = dirX * (4.8 + Math.random() * 4.5);
  }

  update(delta, playerZ, bikeX, bikeSpeed, onCollision, roadCurveFunc, onNearMiss, isInvulnerable = false) {
    this.spawnAhead(playerZ, roadCurveFunc);

    this.characters.forEach(char => {
      if (!char.group.visible) return;

      // 1. Chute et voltige burlesque après choc
      if (char.isFlying) {
        char.group.position.x += char.flyVelX * delta;
        char.group.position.y += char.flyVelY * delta;
        char.group.position.z += char.flyVelZ * delta;

        // Gravité dynamique
        char.flyVelY -= 15.5 * delta;

        char.group.rotation.x += char.flySpinX * delta;
        char.group.rotation.y += char.flySpinY * delta;
        char.group.rotation.z += char.flySpinZ * delta;

        // Rotation des étoiles de vertige
        if (char.dizzyGroup && char.dizzyGroup.visible) {
          char.dizzyGroup.rotation.y += delta * 15.0;
        }

        if (char.group.position.y <= 0) {
          char.group.position.y = 0;
          char.isFlying = false;
          char.group.visible = false;
          if (char.dizzyGroup) char.dizzyGroup.visible = false;
        }
        return;
      }

      // 2. Piéton actif sur la chaussée / trottoir
      if (char.active) {
        const distZ = char.group.position.z - playerZ;
        const distX = Math.abs(char.group.position.x - bikeX);

        // --- IA DE FUITE PANIQUÉE HYSTÉRIQUE ---
        if (distZ > 0 && distZ < 22.0 && distX < 3.4) {
          char.isFleeing = true;
          char.fleeTimer += delta;

          if (char.fleeDirectionX === 0) {
            char.fleeDirectionX = char.group.position.x >= bikeX ? 1 : -1;
          }

          // Sprint rapide vers le bord
          const sprintSpeed = char.typeDef.speed * 2.4;
          char.group.position.x += char.fleeDirectionX * sprintSpeed * delta;

          // Orientation vers la fuite
          char.group.rotation.y = char.fleeDirectionX > 0 ? Math.PI / 2 : -Math.PI / 2;

          // Animation de panique : bras en l'air qui moulinent, tête tournée en arrière
          char.walkPhase += delta * 18.0;
          char.armL.rotation.x = 2.5 + Math.sin(char.fleeTimer * 24.0) * 0.7;
          char.armR.rotation.x = 2.5 + Math.cos(char.fleeTimer * 24.0) * 0.7;
          
          // Regard terrifié en arrière vers le bolide qui arrive
          char.headGroup.rotation.y = (char.fleeDirectionX > 0 ? -0.55 : 0.55) + Math.sin(char.fleeTimer * 18.0) * 0.2;
          
          // Bouche ouverte de cri
          if (char.mouth) {
            char.mouth.scale.set(1.8, 1.6, 1.2);
          }

          // Foulées de sprint
          const legAngle = Math.sin(char.walkPhase) * 1.05;
          char.legL.rotation.x = legAngle;
          char.legR.rotation.x = -legAngle;

          if (Math.abs(char.group.position.x) > 4.8) {
            char.armL.rotation.x = 0;
            char.armR.rotation.x = 0;
            if (char.mouth) char.mouth.scale.set(1.1, 0.6, 0.5);
          }
        } else {
          // Marche normale décontractée
          char.isFleeing = false;
          char.fleeDirectionX = 0;

          if (char.mouth) {
            char.mouth.scale.set(1.1, 0.6, 0.5);
          }

          char.walkPhase += delta * 5.8;
          const legAngle = Math.sin(char.walkPhase) * 0.55;
          char.legL.rotation.x = legAngle;
          char.legR.rotation.x = -legAngle;
          char.armL.rotation.x = -legAngle * 0.65;
          char.armR.rotation.x = legAngle * 0.65;
          char.headGroup.rotation.y = 0;

          char.group.position.x += char.walkDirection * char.typeDef.speed * delta * 0.45;
          if (Math.abs(char.group.position.x) > 4.2) {
            char.walkDirection *= -1;
            char.group.rotation.y = char.walkDirection > 0 ? 0 : Math.PI;
          }
        }

        // 3. Détection de collision physique balayée (SWEPT COLLISION anti-tunneling)
        const frameTravel = Math.max(1.85, (bikeSpeed * delta) + 0.85);
        const inZCollisionZone = (distZ >= -1.0 && distZ <= frameTravel);
        const inXCollisionZone = (distX <= 1.75);

        if (!isInvulnerable && inZCollisionZone && inXCollisionZone) {
          this.triggerSlapstickFlight(char, bikeX, bikeSpeed);
          if (onCollision) {
            onCollision(char);
          }
        } else if (!isInvulnerable && !char.hasNearMissed && inZCollisionZone && distX > 1.75 && distX < 3.0) {
          char.hasNearMissed = true;
          if (onNearMiss) {
            onNearMiss(char);
          }
        }
      }
    });
  }
}

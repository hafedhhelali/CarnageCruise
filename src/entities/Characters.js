/**
 * Carnage Cruise - Système de Personnages 3D Cartoon Haute Définition (Graphismes & Animations Experts)
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
    points: 105,
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
    points: 119,
    bodyColor: 0xe84393, // Chemisier fuchsia éclatant
    pantsColor: 0x2d3436, // Jupe/pantalon chic
    hatColor: 0xfdcb6e,  // Coiffure dorée stylée
    hasHandbag: true,
    scale: 0.96,
    speed: 1.1
  },
  {
    type: 'papy',
    name: 'Papy & Canne en Bois',
    category: 'elderly',
    points: 133,
    bodyColor: 0x795548, // Veste tweed marron
    pantsColor: 0x4e342e,
    hatColor: 0x576574,  // Casquette feutre
    hasCane: true,
    scale: 0.9,
    speed: 0.65
  },
  {
    type: 'papy_chic',
    name: 'Vieux Gentilhomme à Canne',
    category: 'elderly',
    points: 154,
    bodyColor: 0x2f3542, // Redingote grise
    pantsColor: 0x57606f,
    hatColor: 0x1e272e,  // Chapeau melon
    hasCane: true,
    hasBowtie: true,
    scale: 0.93,
    speed: 0.58
  },
  {
    type: 'grandma_cane',
    name: 'Mamie & Canne Fleurie',
    category: 'elderly',
    points: 130,
    bodyColor: 0xa29bfe, // Châle mauve
    pantsColor: 0x6c5ce7,
    hatColor: 0xdfe4ea,  // Chignon argenté
    hasCane: true,
    scale: 0.86,
    speed: 0.55
  },
  {
    type: 'poussette',
    name: 'Parent & Poussette',
    category: 'stroller',
    points: 182,
    bodyColor: 0x10ac84, // Parka turquoise
    pantsColor: 0x222f3e,
    hatColor: 0xffa502,
    hasStroller: true,
    isDoubleStroller: false,
    scale: 1.0,
    speed: 0.95
  },
  {
    type: 'poussette_twins',
    name: 'Maman & Poussette Jumeaux',
    category: 'stroller',
    points: 238,
    bodyColor: 0xff6b81, // Veste rose corail
    pantsColor: 0x57606f,
    hatColor: 0xfffa65,
    hasStroller: true,
    isDoubleStroller: true,
    scale: 1.0,
    speed: 0.88
  },
  {
    type: 'child_scooter',
    name: 'Enfant en Trottinette',
    category: 'child',
    points: 147,
    bodyColor: 0x0984e3, // T-shirt bleu vif
    pantsColor: 0xff7675, // Short corail
    hatColor: 0xff4757,  // Casquette rouge à l'envers
    hasScooter: true,
    scale: 0.78,
    speed: 2.2
  },
  {
    type: 'grandma',
    name: 'Mamie & son Caddie',
    category: 'elderly',
    points: 105,
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
    points: 91,
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
    points: 126,
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
    points: 154,
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
    points: 224,
    bodyColor: 0xf39c12,
    pantsColor: 0x2980b9,
    hatColor: 0x27ae60,
    isGroup: true,
    scale: 1.0,
    speed: 0.75
  },
  {
    type: 'dog',
    name: 'Chien Fidèle 🐕',
    category: 'dog',
    points: 147,
    bodyColor: 0xd35400, // Pelage roux caramel
    collarColor: 0xe74c3c,
    scale: 0.62,
    speed: 1.8,
    isPet: true
  },
  {
    type: 'cat',
    name: 'Chat Agile 🐈',
    category: 'cat',
    points: 161,
    bodyColor: 0x2d3436, // Pelage noir soyeux
    scale: 0.52,
    speed: 1.9,
    isPet: true
  },
  {
    type: 'monkey',
    name: 'Singe Farceur 🐒',
    category: 'monkey',
    points: 203,
    bodyColor: 0x795548, // Brun
    faceColor: 0xffdbac,
    fezColor: 0xc0392b,
    scale: 0.60,
    speed: 2.2,
    isPet: true
  }
];

export class CharacterSystem {
  constructor(scene) {
    this.scene = scene;
    this.poolSize = 50; // Foule dense pour l'épreuve d'extermination de la population mondiale
    this.characters = [];
    this.materialsCache = {};
    // Palette cel-shading partagée (crêtes d'ombre cartoon concertées)
    this.toonGradient = textureFactory.getToonGradientMap();

    this.initPool();
  }

  getMaterial(color, roughness = 0.35) {
    const key = `${color}_${roughness}`;
    if (!this.materialsCache[key]) {
      // NB : MeshToonMaterial ignore 'roughness' — on la conserve pour la clé de cache,
      // et on garantit une couleur valide (cel-shading 4 bandes partagé)
      this.materialsCache[key] = new THREE.MeshToonMaterial({
        color: color === undefined || color === null ? 0xf5f6fa : color,
        gradientMap: this.toonGradient
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
    const woodCaneMat = this.getMaterial(0x4a2511, 0.25);
    const goldFerruleMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.88, roughness: 0.2 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.85, roughness: 0.15 });
    const rubberMat = this.getMaterial(0x111111, 0.8);
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

      // 1. Torse cartoon stylisé & cou anatomique
      const torsoGroup = new THREE.Group();
      torsoGroup.position.y = 0.88;

      const torsoGeo = new THREE.BoxGeometry(0.38, 0.48, 0.25);
      const torsoMat = this.getMaterial(typeDef.bodyColor);
      const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
      torsoMesh.castShadow = true;
      torsoGroup.add(torsoMesh);

      // Cou reliant torse et tête
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.14, 8), skinMat);
      neck.position.y = 0.28;
      torsoGroup.add(neck);

      // Posture voûtée et dos courbé pour les personnes âgées
      const isElderly = typeDef.category === 'elderly' || typeDef.hasCane;
      if (isElderly) {
        torsoGroup.rotation.x = 0.22;
        // Boutons de gilet en tweed
        for (let b = 0; b < 3; b++) {
          const btn = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), this.getMaterial(0x2d1810));
          btn.position.set(0, 0.14 - (b * 0.12), 0.135);
          torsoGroup.add(btn);
        }
      }

      // Détails torse (cravate, gilet de serveur, nœud papillon)
      if (typeDef.hasTray) {
        const vestGeo = new THREE.BoxGeometry(0.40, 0.45, 0.27);
        const vest = new THREE.Mesh(vestGeo, this.getMaterial(typeDef.vestColor));
        vest.position.y = -0.02;
        torsoGroup.add(vest);
      } else if (typeDef.hasBowtie) {
        const bow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04), this.getMaterial(0xd63031));
        bow.position.set(0, 0.24, 0.14);
        torsoGroup.add(bow);
      } else if (typeDef.tieColor) {
        const tieGeo = new THREE.BoxGeometry(0.09, 0.34, 0.04);
        const tie = new THREE.Mesh(tieGeo, this.getMaterial(typeDef.tieColor));
        tie.position.set(0, 0.0, 0.14);
        torsoGroup.add(tie);
      }

      charGroup.add(torsoGroup);

      // 2. Tête cartoon expressive avec traits complets
      const headGroup = new THREE.Group();
      if (isElderly) {
        headGroup.position.set(0, 1.25, 0.12);
        headGroup.rotation.x = -0.1;
      } else {
        headGroup.position.y = 1.30;
      }

      const headGeo = new THREE.SphereGeometry(0.18, 12, 10);
      const head = new THREE.Mesh(headGeo, skinMat);
      headGroup.add(head);

      // Couvre-chef / Coiffure
      if (typeDef.hatColor) {
        if (typeDef.type === 'papy_chic') {
          // Chapeau melon anglais noir élégant
          const bowlerCrown = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.getMaterial(typeDef.hatColor));
          bowlerCrown.position.y = 0.12;
          headGroup.add(bowlerCrown);
          const bowlerBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 14), this.getMaterial(typeDef.hatColor));
          bowlerBrim.position.y = 0.12;
          headGroup.add(bowlerBrim);
        } else if (typeDef.hasCane && typeDef.type.includes('papy')) {
          // Casquette feutre papy en tweed
          const capGeo = new THREE.CylinderGeometry(0.23, 0.19, 0.08, 12);
          const cap = new THREE.Mesh(capGeo, this.getMaterial(typeDef.hatColor));
          cap.position.y = 0.14;
          headGroup.add(cap);
          const visorGeo = new THREE.BoxGeometry(0.24, 0.03, 0.13);
          const visor = new THREE.Mesh(visorGeo, this.getMaterial(typeDef.hatColor));
          visor.position.set(0, 0.11, 0.15);
          headGroup.add(visor);
        } else if (typeDef.type === 'grandma_cane' || typeDef.hasCaddy) {
          // Chignon argenté mamie avec épingle
          const bunGeo = new THREE.SphereGeometry(0.12, 10, 8);
          const bun = new THREE.Mesh(bunGeo, this.getMaterial(typeDef.hatColor));
          bun.position.set(0, 0.16, -0.13);
          headGroup.add(bun);
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
        } else if (typeDef.hasStroller) {
          // Bonnet chaud parent
          const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.getMaterial(typeDef.hatColor));
          beanie.position.y = 0.08;
          headGroup.add(beanie);
        }
      }

      // --- VISAGE EXPRESSIF & ACCESSOIRES DU VISAGE ---
      // Lunettes de lecture rondes dorées pour toutes les personnes âgées
      if (isElderly) {
        const lensGeo = new THREE.TorusGeometry(0.045, 0.007, 6, 12);
        const lensL = new THREE.Mesh(lensGeo, goldFerruleMat);
        lensL.position.set(-0.065, 0.03, 0.17);
        const lensR = new THREE.Mesh(lensGeo, goldFerruleMat);
        lensR.position.set(0.065, 0.03, 0.17);
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.008), goldFerruleMat);
        bridge.position.set(0, 0.035, 0.17);
        headGroup.add(lensL, lensR, bridge);

        // Moustache blanche fournie pour papy
        if (typeDef.type.includes('papy')) {
          const stacheMat = this.getMaterial(0xecf0f1);
          const stacheL = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 6), stacheMat);
          stacheL.rotation.z = Math.PI / 2.3;
          stacheL.position.set(-0.05, -0.03, 0.18);
          const stacheR = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 6), stacheMat);
          stacheR.rotation.z = -Math.PI / 2.3;
          stacheR.position.set(0.05, -0.03, 0.18);
          headGroup.add(stacheL, stacheR);
        }
      }

      // Yeux blancs avec pupilles vives
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
      const browMat = this.getMaterial(isElderly ? 0xdfe4ea : 0x2f3640);
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

      // 5. Accessoires 3D Haut De Gamme (Cannes réalistes & Poussettes complètes)
      let propMesh = null;
      let caneGroup = null;
      let strollerGroup = null;
      let strollerWheels = [];

      if (typeDef.hasCane) {
        // --- CANNE DE MARCHE RÉALISTE AVEC CROSSE EN BOIS COURBÉE ET BAGUE D'OR ---
        caneGroup = new THREE.Group();
        caneGroup.position.set(0.08, -0.38, 0.06);

        // Fût de la canne en bois foncé
        const caneShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.82, 8), woodCaneMat);
        caneShaft.position.set(0, -0.24, 0);
        caneGroup.add(caneShaft);

        // Crosse de canne courbée en demi-cercle (ergonomique)
        const caneHandle = new THREE.Mesh(
          new THREE.TorusGeometry(0.065, 0.018, 8, 14, Math.PI * 1.15),
          woodCaneMat
        );
        caneHandle.rotation.z = Math.PI / 2;
        caneHandle.rotation.y = Math.PI / 2;
        caneHandle.position.set(0, 0.16, 0.04);
        caneGroup.add(caneHandle);

        // Bague dorée d'apparat
        const goldBand = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 8), goldFerruleMat);
        goldBand.position.set(0, 0.15, 0);
        caneGroup.add(goldBand);

        // Embout antidérapant en caoutchouc au sol
        const rubberTip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.035, 8), rubberMat);
        rubberTip.position.set(0, -0.65, 0);
        caneGroup.add(rubberTip);

        armRGroup.add(caneGroup);
        propMesh = caneGroup;
      } else if (typeDef.hasStroller) {
        // --- POUSSETTE 3D COMPLÈTE & DÉTAILLÉE AVEC 4 ROUES, BÉBÉ, TÉTINE ET PARE-SOLEIL ---
        strollerGroup = new THREE.Group();
        strollerGroup.position.set(0, 0, 0.62);

        // 1. Châssis tubulaire en chrome
        const strutL = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 8), chromeMat);
        strutL.position.set(-0.25, 0.45, 0);
        strutL.rotation.x = -0.42;
        const strutR = strutL.clone();
        strutR.position.x = 0.25;
        strollerGroup.add(strutL, strutR);

        // Poignée / Guidon ergonomique poussé par le parent
        const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.54, 8), chromeMat);
        handleBar.rotation.z = Math.PI / 2;
        handleBar.position.set(0, 0.82, -0.22);
        strollerGroup.add(handleBar);

        // Grip mousse noir
        const gripL = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.18, 8), rubberMat);
        gripL.rotation.z = Math.PI / 2;
        gripL.position.set(-0.16, 0.82, -0.22);
        const gripR = gripL.clone();
        gripR.position.x = 0.16;
        strollerGroup.add(gripL, gripR);

        // 2. Quatre roues réalistes (2 avant petites, 2 arrière plus grandes)
        const wheelHubMat = this.getMaterial(0xffffff);

        const createStrollerWheel = (x, z, r, w) => {
          const wGroup = new THREE.Group();
          wGroup.position.set(x, r, z);

          const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 12), rubberMat);
          tire.rotation.z = Math.PI / 2;
          wGroup.add(tire);

          const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w * 1.08, 10), wheelHubMat);
          hub.rotation.z = Math.PI / 2;
          wGroup.add(hub);

          strollerGroup.add(wGroup);
          strollerWheels.push(wGroup);
          return wGroup;
        };

        createStrollerWheel(-0.24, 0.28, 0.08, 0.04);
        createStrollerWheel(0.24, 0.28, 0.08, 0.04);
        createStrollerWheel(-0.25, -0.22, 0.12, 0.05);
        createStrollerWheel(0.25, -0.22, 0.12, 0.05);

        // 3. Nacelle / Bassinet molletonné
        const bassinetMat = this.getMaterial(typeDef.isDoubleStroller ? 0xff4757 : 0x0984e3, 0.3);
        const bassinetGeo = new THREE.BoxGeometry(typeDef.isDoubleStroller ? 0.72 : 0.46, 0.28, 0.68);
        const bassinet = new THREE.Mesh(bassinetGeo, bassinetMat);
        bassinet.position.set(0, 0.38, 0.04);
        bassinet.castShadow = true;
        strollerGroup.add(bassinet);

        // 4. Capote pare-soleil arrondie repliable
        const hoodGeo = new THREE.SphereGeometry(typeDef.isDoubleStroller ? 0.38 : 0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const hoodMat = this.getMaterial(typeDef.isDoubleStroller ? 0xff6b81 : 0x00cec9, 0.3);
        const hood = new THREE.Mesh(hoodGeo, hoodMat);
        hood.position.set(0, 0.48, -0.06);
        hood.rotation.x = -Math.PI / 4;
        strollerGroup.add(hood);

        // 5. Bébé mignon dans la poussette (tête cartoon + bonnet + tétine + couverture)
        const babySkinMat = this.getMaterial(0xffdbac);
        const babyBeanieMat = this.getMaterial(0xfffa65);
        const blanketMat = this.getMaterial(typeDef.isDoubleStroller ? 0xa29bfe : 0x7bed9f);
        const pacifierMat = this.getMaterial(0xff4757);

        const createBaby = (xOffset) => {
          const baby = new THREE.Group();
          baby.position.set(xOffset, 0.42, 0.08);

          const bHead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), babySkinMat);
          baby.add(bHead);

          // Bonnet à pompon
          const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), babyBeanieMat);
          beanie.rotation.x = -0.3;
          beanie.position.y = 0.02;
          baby.add(beanie);

          const pompon = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), this.getMaterial(0xffffff));
          pompon.position.set(0, 0.13, -0.04);
          baby.add(pompon);

          // Tétine / Sucette
          const pacifier = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.009, 6, 10), pacifierMat);
          pacifier.position.set(0, -0.03, 0.095);
          baby.add(pacifier);

          strollerGroup.add(baby);
        };

        if (typeDef.isDoubleStroller) {
          createBaby(-0.16);
          createBaby(0.16);
        } else {
          createBaby(0);
        }

        // Couverture douillette
        const blanket = new THREE.Mesh(new THREE.BoxGeometry(typeDef.isDoubleStroller ? 0.68 : 0.42, 0.08, 0.42), blanketMat);
        blanket.position.set(0, 0.42, 0.16);
        strollerGroup.add(blanket);

        charGroup.add(strollerGroup);
        propMesh = strollerGroup;
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
      }

      charGroup.visible = false;
      this.scene.add(charGroup);

      this.characters.push({
        id: i,
        group: charGroup,
        typeDef,
        torso: torsoGroup,
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
        caneGroup,
        strollerGroup,
        strollerWheels,
        active: false,
        isFlying: false,
        isFleeing: false,
        isHornPanicked: false,
        hornPanicTimer: 0,
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
      char.isHornPanicked = false;
      char.hornPanicTimer = 0;
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
    const maxZ = playerZ + 170;

    this.characters.forEach((char, idx) => {
      if (!char.group.visible || char.group.position.z < playerZ - 20) {
        const newZ = minZ + Math.random() * (maxZ - minZ);
        const curveX = roadCurveFunc ? roadCurveFunc(newZ) : 0;

        // 70% sur le trottoir, 30% traversent sur les passages piéton
        const isCrosser = (idx % 3 === 0);
        char.isCrossing = isCrosser;
        char.isOnSidewalk = !isCrosser;

        if (isCrosser) {
          // Piéton traversant EXCLUSIVEMENT sur les passages piétons zébrés des carrefours (Z = 95 + k*160 ± 8.0m)
          let nearestInterZ = Math.max(95, Math.round((newZ - 95) / 160) * 160 + 95);
          if (nearestInterZ - 8.0 < playerZ + 28) {
            nearestInterZ += 160;
          }
          const crosswalkSideOffset = (idx % 2 === 0) ? -8.0 : 8.0;
          const crosswalkZ = nearestInterZ + crosswalkSideOffset;
          const crossCurveX = roadCurveFunc ? roadCurveFunc(crosswalkZ) : 0;
          const startSide = Math.random() > 0.5 ? 1 : -1;
          const startProgress = (Math.random() - 0.5) * 6.5; // Répartis sur la largeur du passage clouté
          char.crossDirection = -startSide;
          char.crosswalkZ = crosswalkZ;
          char.group.position.set(crossCurveX + startProgress, 0.02, crosswalkZ);
          char.group.rotation.set(0, char.crossDirection > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
        } else {
          // Piéton marchant strictement le long du trottoir (gauche ou droite, jamais sur la chaussée)
          const side = (idx % 2 === 0 ? 1 : -1);
          const sidewalkOffset = side * (4.85 + Math.random() * 1.45);
          char.sidewalkSide = side;
          char.walkDirection = Math.random() > 0.5 ? 1 : -1;
          char.group.position.set(curveX + sidewalkOffset, 0.25, newZ);
          char.group.rotation.set(0, char.walkDirection > 0 ? 0 : Math.PI, 0);
        }

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
        if (char.strollerGroup) char.strollerGroup.rotation.set(0, 0, 0);
        if (char.caneGroup) char.caneGroup.rotation.set(0, 0, 0);
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
      char.mouth.scale.set(2.8, 2.4, 1.8); // Bouche béante de cri d'effroi
    }

    // Bras et jambes désarticulés en l'air (ragdoll comique)
    char.armL.rotation.x = (Math.random() - 0.5) * Math.PI;
    char.armR.rotation.x = (Math.random() - 0.5) * Math.PI;
    char.legL.rotation.z = (Math.random() - 0.5) * 1.2;
    char.legR.rotation.z = (Math.random() - 0.5) * 1.2;

    if (char.strollerGroup) {
      char.strollerGroup.rotation.x = -1.2 + (Math.random() - 0.5) * 0.8;
      char.strollerGroup.rotation.z = (Math.random() - 0.5) * 1.5;
    }
    if (char.caneGroup) {
      char.caneGroup.rotation.z = (Math.random() - 0.5) * Math.PI;
    }

    // Projection burlesque spectaculaire : 7 à 11m de hauteur avec voltige
    const dirX = char.group.position.x > bikeX ? 1 : -1;
    char.flyVelX = dirX * (4.2 + Math.random() * 4.5);
    char.flyVelY = 8.5 + Math.random() * 4.2;
    char.flyVelZ = (bikeSpeed * 0.45) + (Math.random() * 3.8);

    // Rotations folles et vrilles en vol
    char.flySpinX = (Math.random() - 0.5) * 16.0;
    char.flySpinY = (Math.random() - 0.5) * 18.0;
    char.flySpinZ = dirX * (8.0 + Math.random() * 8.0);
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

        // Décompte de la panique au klaxon
        if (char.hornPanicTimer > 0) {
          char.hornPanicTimer -= delta;
          if (char.hornPanicTimer <= 0) {
            char.isHornPanicked = false;
          }
        }

        // --- RÈGLE DE FUITE : NE S'ENFUIT JAMAIS À L'ARRÊT OU AU FREINAGE ---
        // Si le véhicule est à l'arrêt ou roule au pas (vitesse <= 3.5 m/s), les piétons ne s'enfuient pas
        // et poursuivent leur marche sereinement. Ils ne fuient qu'à vive allure (> 3.5 m/s) ou au coup de klaxon !
        const shouldFlee = (char.isHornPanicked && char.hornPanicTimer > 0) ||
                           (bikeSpeed > 3.5 && distZ > 0 && distZ < 22.0 && distX < 3.4);

        if (shouldFlee) {
          char.isFleeing = true;
          char.fleeTimer += delta;
          const fleeCurveX = roadCurveFunc ? roadCurveFunc(char.group.position.z) : 0;

          if (char.isOnSidewalk) {
            // Un piéton sur le trottoir fuit TOUJOURS vers l'extérieur du trottoir, jamais vers le milieu de la route !
            char.fleeDirectionX = char.sidewalkSide || (char.group.position.x >= fleeCurveX ? 1 : -1);
          } else if (char.fleeDirectionX === 0) {
            char.fleeDirectionX = char.group.position.x >= bikeX ? 1 : -1;
          }

          // Sprint rapide vers le bord
          const sprintSpeed = char.typeDef.speed * 2.4;
          char.group.position.x += char.fleeDirectionX * sprintSpeed * delta;
          if (char.isOnSidewalk) {
            const side = char.sidewalkSide || 1;
            const relX = (char.group.position.x - fleeCurveX) * side;
            const clampedRelX = Math.max(4.75, Math.min(6.75, relX));
            char.group.position.x = fleeCurveX + side * clampedRelX;
          } else if (char.crosswalkZ !== undefined) {
            char.group.position.z = char.crosswalkZ;
          }

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

          if (Math.abs(char.group.position.x - fleeCurveX) > 4.8) {
            char.armL.rotation.x = 0;
            char.armR.rotation.x = 0;
            if (char.mouth) char.mouth.scale.set(1.1, 0.6, 0.5);
          }
        } else {
          // Marche normale décontractée avec animations spécifiques aux rôles
          char.isFleeing = false;
          char.fleeDirectionX = 0;

          if (char.mouth) {
            char.mouth.scale.set(1.1, 0.6, 0.5);
          }

          char.walkPhase += delta * 5.8;
          const legAngle = Math.sin(char.walkPhase) * 0.55;
          char.legL.rotation.x = legAngle;
          char.legR.rotation.x = -legAngle;
          char.headGroup.rotation.y = 0;

          if (char.typeDef.hasStroller) {
            // Parent poussant la poussette : les 2 bras fermement posés sur la poignée
            char.armL.rotation.x = -0.72 + Math.sin(char.walkPhase) * 0.05;
            char.armR.rotation.x = -0.72 - Math.sin(char.walkPhase) * 0.05;

            // Rotation synchronisée des 4 roues de poussette sur le bitume
            if (char.strollerWheels && char.strollerWheels.length > 0) {
              const wheelSpin = delta * 15.0;
              char.strollerWheels.forEach(w => {
                w.rotation.x += wheelSpin;
              });
            }
          } else if (char.typeDef.hasCane) {
            // Démarche claudicante du vieux : la canne tape le sol en cadence
            const hobble = Math.sin(char.walkPhase);
            if (char.torso) char.torso.rotation.z = hobble * 0.08;
            char.headGroup.rotation.z = -hobble * 0.06;
            // Bras droit avançant la canne pour la planter
            char.armR.rotation.x = -0.38 + Math.max(0, hobble) * 0.42;
            char.armL.rotation.x = -hobble * 0.35;
          } else {
            // Balancement classique des bras
            char.armL.rotation.x = -legAngle * 0.65;
            char.armR.rotation.x = legAngle * 0.65;
            if (char.torso) char.torso.rotation.z = 0;
            char.headGroup.rotation.z = 0;
          }

          if (char.isCrossing) {
            // Traverse la chaussée EXCLUSIVEMENT sur le passage piéton du carrefour : TOUJOURS aligné dans le sens de la marche !
            if (char.crosswalkZ !== undefined) {
              char.group.position.z = char.crosswalkZ;
            }
            char.group.position.x += char.crossDirection * char.typeDef.speed * delta * 1.1;
            char.group.position.y = 0.02;
            const curveX = roadCurveFunc ? roadCurveFunc(char.group.position.z) : 0;
            // Quand il atteint l'autre trottoir, demi-tour sur le passage piéton
            if (Math.abs(char.group.position.x - curveX) > 5.3) {
              char.crossDirection *= -1;
              char.group.position.x = curveX + Math.sign(char.group.position.x - curveX) * 5.3;
            }
            // Strictement orienté dans la direction du pas (+X = PI/2, -X = -PI/2) : ZÉRO marche arrière
            char.group.rotation.y = char.crossDirection > 0 ? Math.PI / 2 : -Math.PI / 2;
          } else {
            // Marche strictement le long de son trottoir à altitude 0.25m (ne traverse jamais la route)
            char.group.position.z += char.walkDirection * char.typeDef.speed * delta * 0.85;
            char.group.position.y = 0.25;
            const curveX = roadCurveFunc ? roadCurveFunc(char.group.position.z) : 0;
            const side = char.sidewalkSide || (char.group.position.x >= curveX ? 1 : -1);
            char.sidewalkSide = side;
            char.group.position.x = curveX + side * 5.2;
            // Strictement orienté dans le sens de marche le long du trottoir (+Z = 0, -Z = PI)
            char.group.rotation.y = char.walkDirection > 0 ? 0 : Math.PI;
          }
        }

        // 3. Détection de collision physique balayée (SWEPT COLLISION anti-tunneling)
        const frameTravel = Math.max(1.85, (bikeSpeed * delta) + 0.85);
        const inZCollisionZone = (distZ >= -1.0 && distZ <= frameTravel);
        const inXCollisionZone = (distX <= 1.85);

        if (!isInvulnerable && inZCollisionZone && inXCollisionZone) {
          this.triggerSlapstickFlight(char, bikeX, bikeSpeed);
          if (onCollision) {
            onCollision(char);
          }
        } else if (!isInvulnerable && !char.hasNearMissed && inZCollisionZone && distX > 1.85 && distX < 3.2) {
          char.hasNearMissed = true;
          if (onNearMiss) {
            onNearMiss(char);
          }
        }
      }
    });
  }

  /**
   * Déclenche la panique des piétons en avant suite à un coup de klaxon
   */
  triggerHornAlert(bikePos, radius = 22.0) {
    let count = 0;
    this.characters.forEach(char => {
      if (!char.group.visible || char.isFlying) return;
      const dZ = char.group.position.z - bikePos.z;
      const dX = Math.abs(char.group.position.x - bikePos.x);
      const dist = Math.sqrt(dZ * dZ + dX * dX);

      if (dZ > -2.0 && dist < radius) {
        char.isHornPanicked = true;
        char.hornPanicTimer = 2.5; // 2.5 secondes de panique
        char.fleeDirectionX = char.group.position.x >= bikePos.x ? 1 : -1;
        count++;
      }
    });
    return count;
  }
}

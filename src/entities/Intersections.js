/**
 * Carnage Cruise - Système de Carrefours Urbains Français Haute Fidélité
 * Grands carrefours réalistes avec voies perpendiculaires, trottoirs arrondis en granit,
 * feux tricolores français (mât, visières, répétiteur bas deux-roues), passages piétons zébrés,
 * barrières parisiennes Croix de Saint-André, plaques de rues bleues et trafic transversal dynamique.
 */

import * as THREE from 'three';
import { textureFactory } from '../gfx/TextureFactory.js';

const STREET_NAMES = [
  'BD SAINT-GERMAIN',
  'AVENUE DES CHAMPS-ÉLYSÉES',
  'RUE DE RIVOLI',
  'BOULEVARD VOLTAIRE',
  'AVENUE MONTAIGNE',
  'BOULEVARD HAUSSMANN',
  'PLACE DE LA BASTILLE',
  'QUAI DES ORFÈVRES'
];

// Couleurs des optiques de feu tricolore : teintes saturées mais SOUS le seuil
// de bloom (1.25) — un feu crédible visible, sans halo parasite sur le passage piéton.
let RED_ON_CACHE = null, RED_OFF_CACHE = null;
let ORANGE_ON_CACHE = null, ORANGE_OFF_CACHE = null;
let GREEN_ON_CACHE = null, GREEN_OFF_CACHE = null;
function getLampColors() {
  if (!RED_ON_CACHE) {
    RED_ON_CACHE = new THREE.Color(1.0, 0.12, 0.18);
    RED_OFF_CACHE = new THREE.Color(0.27, 0.07, 0.07);
    ORANGE_ON_CACHE = new THREE.Color(1.0, 0.55, 0.08);
    ORANGE_OFF_CACHE = new THREE.Color(0.27, 0.13, 0.0);
    GREEN_ON_CACHE = new THREE.Color(0.18, 1.0, 0.24);
    GREEN_OFF_CACHE = new THREE.Color(0.02, 0.23, 0.03);
  }
  return {
    RED_ON: RED_ON_CACHE, RED_OFF: RED_OFF_CACHE,
    ORANGE_ON: ORANGE_ON_CACHE, ORANGE_OFF: ORANGE_OFF_CACHE,
    GREEN_ON: GREEN_ON_CACHE, GREEN_OFF: GREEN_OFF_CACHE
  };
}

export class IntersectionManager {
  constructor(scene) {
    this.scene = scene;
    this.container = new THREE.Group();
    this.scene.add(this.container);

    this.intersections = [];
    this.crossingCars = [];
    this.nextSpawnZ = 95; // Premier grand carrefour à 95m
    this.spawnInterval = 160; // Espacement régulier et équilibré
    this.streetNameIndex = 0;
  }

  // --- CRÉATION DU MÂT DE FEUX TRICOLORES FRANÇAIS RÉALISTE ---
  createTrafficLightMesh(isLeft = true) {
    const group = new THREE.Group();

    // 1. Mât principal en acier laqué gris anthracite
    const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 5.2, 10);
    const poleMat = new THREE.MeshToonMaterial({ color: 0x2d3436 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.6;
    group.add(pole);

    // 2. Crosse / potence surplombant la chaussée
    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.rotation.z = isLeft ? -Math.PI / 2.8 : Math.PI / 2.8;
    arm.position.set(isLeft ? 0.9 : -0.9, 4.8, 0);
    group.add(arm);

    // 3. Boîtier principal supérieur (3 feux verticaux)
    const boxGeo = new THREE.BoxGeometry(0.44, 1.45, 0.44);
    const boxMat = new THREE.MeshToonMaterial({ color: 0x1e272e });
    const mainBox = new THREE.Mesh(boxGeo, boxMat);
    mainBox.position.set(isLeft ? 1.7 : -1.7, 4.3, 0);
    group.add(mainBox);

    // Visières pare-soleil incurvées au-dessus de chaque feu
    const visorMat = new THREE.MeshToonMaterial({ color: 0x111111 });
    [-0.45, 0, 0.45].forEach(yOff => {
      const visorGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.16, 8, 1, true, 0, Math.PI);
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.rotation.x = Math.PI / 2;
      visor.position.set(isLeft ? 1.7 : -1.7, 4.3 + yOff + 0.1, 0.22);
      group.add(visor);
    });

    // 4. Optiques principales (Rouge, Orange, Vert) — couleurs HDR > 1.0
    // pour déclencher le halo UnrealBloom quand le feu est actif
    const lampGeo = new THREE.SphereGeometry(0.13, 10, 8);
    const redMat = new THREE.MeshBasicMaterial({ color: 0x441111 });
    const orangeMat = new THREE.MeshBasicMaterial({ color: 0x442200 });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x243b2a });
    // État initial verts HDR
    greenMat.color.setRGB(0.5, 2.4, 0.6);

    const lampRed = new THREE.Mesh(lampGeo, redMat);
    lampRed.position.set(isLeft ? 1.7 : -1.7, 4.75, 0.22);
    group.add(lampRed);

    const lampOrange = new THREE.Mesh(lampGeo, orangeMat);
    lampOrange.position.set(isLeft ? 1.7 : -1.7, 4.3, 0.22);
    group.add(lampOrange);

    const lampGreen = new THREE.Mesh(lampGeo, greenMat);
    lampGreen.position.set(isLeft ? 1.7 : -1.7, 3.85, 0.22);
    group.add(lampGreen);

    // 5. Répétiteur bas pour motos/vélos (caractéristique française)
    const repBoxGeo = new THREE.BoxGeometry(0.24, 0.65, 0.24);
    const repBox = new THREE.Mesh(repBoxGeo, boxMat);
    repBox.position.set(isLeft ? 0.25 : -0.25, 1.6, 0);
    group.add(repBox);

    const repRed = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), redMat);
    repRed.position.set(isLeft ? 0.25 : -0.25, 1.8, 0.13);
    group.add(repRed);

    const repOrange = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), orangeMat);
    repOrange.position.set(isLeft ? 0.25 : -0.25, 1.6, 0.13);
    group.add(repOrange);

    const repGreen = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), greenMat);
    repGreen.position.set(isLeft ? 0.25 : -0.25, 1.4, 0.13);
    group.add(repGreen);

    // 6. Plaque de rue émaillée bleue parisienne avec liseré blanc
    const streetPlateGeo = new THREE.BoxGeometry(1.2, 0.38, 0.05);
    const plateMat = new THREE.MeshToonMaterial({ color: 0x0c2461 });
    const streetPlate = new THREE.Mesh(streetPlateGeo, plateMat);
    streetPlate.position.set(isLeft ? 0.4 : -0.4, 2.7, 0.1);
    group.add(streetPlate);

    // Bordure blanche de la plaque
    const plateBorderGeo = new THREE.BoxGeometry(1.26, 0.44, 0.03);
    const plateBorderMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const plateBorder = new THREE.Mesh(plateBorderGeo, plateBorderMat);
    plateBorder.position.set(isLeft ? 0.4 : -0.4, 2.7, 0.08);
    group.add(plateBorder);

    return {
      group,
      lampRed,
      lampOrange,
      lampGreen,
      repRed,
      repOrange,
      repGreen,
      state: 'GREEN'
    };
  }

  // --- PORTIQUE GÉANT LUMINEUX AU-DESSUS DE LA VOIE DU CARREFOUR ---
  createOverheadGantryMesh() {
    const gantry = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.85, roughness: 0.25 });
    const signBlueMat = new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.35 });
    const signBorderMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.5 });

    // 1. Deux poteaux tubulaires profilés en acier anthracite
    const postGeo = new THREE.CylinderGeometry(0.14, 0.16, 6.2, 12);
    const postL = new THREE.Mesh(postGeo, postMat);
    postL.position.set(-6.2, 3.1, 0);
    const postR = new THREE.Mesh(postGeo, postMat);
    postR.position.set(6.2, 3.1, 0);
    gantry.add(postL, postR);

    // 2. Traverse supérieure profilée avec platelage
    const beamGeo = new THREE.BoxGeometry(12.8, 0.38, 0.42);
    const beam = new THREE.Mesh(beamGeo, postMat);
    beam.position.set(0, 5.7, 0);
    gantry.add(beam);

    // 3. Panneaux de signalisation routière européens bleu & blanc
    // Panneau Gauche : ⬆ CENTRE-VILLE
    const signLeft = new THREE.Group();
    signLeft.position.set(-2.8, 4.8, 0.25);
    const plateL = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.25, 0.08), signBlueMat);
    const borderL = new THREE.Mesh(new THREE.BoxGeometry(4.32, 1.35, 0.04), signBorderMat);
    borderL.position.z = -0.02;
    const arrowStem = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.1), signBorderMat);
    arrowStem.position.set(-1.6, 0, 0.06);
    const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.4, 3), signBorderMat);
    arrowHead.position.set(-1.6, 0.35, 0.06);
    signLeft.add(borderL, plateL, arrowStem, arrowHead);

    // Panneau Droit : ➡ PÉRIPHÉRIQUE / ROCADE
    const signRight = new THREE.Group();
    signRight.position.set(2.8, 4.8, 0.25);
    const plateR = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.25, 0.08), signBlueMat);
    const borderR = new THREE.Mesh(new THREE.BoxGeometry(4.32, 1.35, 0.04), signBorderMat);
    borderR.position.z = -0.02;
    const arrowStemR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.1), signBorderMat);
    arrowStemR.position.set(1.5, 0, 0.06);
    const arrowHeadR = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.35, 3), signBorderMat);
    arrowHeadR.rotation.z = -Math.PI / 2;
    arrowHeadR.position.set(1.8, 0, 0.06);
    signRight.add(borderR, plateR, arrowStemR, arrowHeadR);

    gantry.add(signLeft, signRight);

    // 4. Boîtier central de feux suspendu au-dessus des voies
    const centerBox = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.7, 0.42), boxMat);
    centerBox.position.set(0, 4.2, 0.1);
    gantry.add(centerBox);

    // Optiques 3D LED (Rouge, Orange, Vert)
    const lampGeo = new THREE.SphereGeometry(0.18, 12, 10);
    const lampRed = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xff2d55 }));
    lampRed.position.set(0, 4.75, 0.32);
    const lampOrange = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0x442200 }));
    lampOrange.position.set(0, 4.2, 0.32);
    const lampGreen = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0x004400 }));
    lampGreen.position.set(0, 3.65, 0.32);
    gantry.add(lampRed, lampOrange, lampGreen);

    // Visières pare-soleil incurvées
    const visorMat = new THREE.MeshToonMaterial({ color: 0x111111 });
    [4.75, 4.2, 3.65].forEach(y => {
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 8, 1, true, 0, Math.PI), visorMat);
      visor.rotation.x = Math.PI / 2;
      visor.position.set(0, y + 0.1, 0.32);
      gantry.add(visor);
    });

    const dummyBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), new THREE.MeshBasicMaterial({ visible: false }));
    gantry.add(dummyBeacon);

    return {
      group: gantry,
      lampRed,
      lampOrange,
      lampGreen,
      beacon: dummyBeacon
    };
  }

  // --- CRÉATION DE BARRIÈRE PIÉTONNE PARISIENNE TYPE CROIX DE SAINT-ANDRÉ ---
  createSaintAndreBarrierMesh() {
    const bGroup = new THREE.Group();
    const barMat = new THREE.MeshToonMaterial({ color: 0x1e372f }); // Vert impérial parisien

    // Deux poteaux verticaux
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), barMat);
    p1.position.set(-0.8, 0.55, 0);
    bGroup.add(p1);

    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), barMat);
    p2.position.set(0.8, 0.55, 0);
    bGroup.add(p2);

    // Main courante supérieure
    const railTop = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 8), barMat);
    railTop.rotation.z = Math.PI / 2;
    railTop.position.set(0, 1.05, 0);
    bGroup.add(railTop);

    // Croix en X
    const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.2, 0.03), barMat);
    cross1.rotation.z = Math.PI / 3.8;
    cross1.position.set(0, 0.55, 0);
    bGroup.add(cross1);

    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.2, 0.03), barMat);
    cross2.rotation.z = -Math.PI / 3.8;
    cross2.position.set(0, 0.55, 0);
    bGroup.add(cross2);

    return bGroup;
  }

  // --- CRÉATION DE CANDÉLABRE URBAIN RÉALISTE ---
  createStreetLampMesh() {
    const lampGroup = new THREE.Group();
    const ironMat = new THREE.MeshToonMaterial({ color: 0x242a30 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff1d0 });

    // Socle
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.7, 8), ironMat);
    base.position.y = 0.35;
    lampGroup.add(base);

    // Mât élancé
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.8, 8), ironMat);
    post.position.y = 2.5;
    lampGroup.add(post);

    // Crosse arquée
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), ironMat);
    arm.rotation.z = 0.45;
    arm.position.set(-0.25, 4.5, 0);
    lampGroup.add(arm);

    // Chapeau de lanterne
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.15, 6), ironMat);
    cap.position.set(-0.5, 4.65, 0);
    lampGroup.add(cap);

    // Corps de lanterne
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.28, 6), glowMat);
    lantern.position.set(-0.5, 4.45, 0);
    lampGroup.add(lantern);

    return lampGroup;
  }

  // --- MODÈLES DE VÉHICULES TRANSVERSAUX HAUTE FIDÉLITÉ (GT, SUV, BERLINE, TAXI) ---
  createCrossingCarMesh(type = 'taxi') {
    const carGroup = new THREE.Group();

    // Matières contenues : finit les blobs de reflets lumineux sur les carrosseries
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, metalness: 0.9, roughness: 0.25 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.16 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.3 });
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xff3838, roughness: 0.25, metalness: 0.6 });

    let bodyColor = 0xf39c12; // Jaune ambré taxi
    if (type === 'van') bodyColor = 0x3b82f6; // Bleu saphir SUV
    if (type === 'compact') bodyColor = 0xeb4d4b; // Rouge carmin GT sport
    if (type === 'berline') bodyColor = 0x1e272e; // Noir onyx berline

    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      metalness: 0.55,
      roughness: 0.32
    });

    // 1. Châssis principal sculpté selon le type
    const isSUV = (type === 'van');
    const isGT = (type === 'compact');
    const chassisL = isGT ? 4.2 : (isSUV ? 4.4 : 4.6);
    const chassisH = isGT ? 0.58 : (isSUV ? 0.82 : 0.66);
    const chassisW = isSUV ? 2.1 : 1.95;
    const chassisY = isSUV ? 0.82 : 0.62;

    const chassisGeo = new THREE.BoxGeometry(chassisL, chassisH, chassisW);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = chassisY;
    chassis.castShadow = true;
    carGroup.add(chassis);

    // Calandre avant chromée
    const grilleH = isSUV ? 0.48 : 0.32;
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.14, grilleH, 1.4), chromeMat);
    grille.position.set(chassisL / 2 + 0.02, chassisY, 0);
    carGroup.add(grille);

    // 2. Habitacle et vitrage profilé
    const cabinL = isGT ? 2.2 : (isSUV ? 2.7 : 2.5);
    const cabinH = isGT ? 0.68 : (isSUV ? 0.88 : 0.78);
    const cabinW = chassisW * 0.88;
    const cabinX = isGT ? -0.32 : -0.15;
    const cabinY = chassisY + (chassisH / 2) + (cabinH / 2);

    const cabinGeo = new THREE.BoxGeometry(cabinL, cabinH, cabinW);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(cabinX, cabinY, 0);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Vitrage teinté réfléchissant
    const winGeo = new THREE.BoxGeometry(cabinL + 0.04, cabinH * 0.85, cabinW + 0.04);
    const win = new THREE.Mesh(winGeo, glassMat);
    win.position.set(cabinX, cabinY, 0);
    carGroup.add(win);

    // Si GT Sport : Aileron arrière aérodynamique & diffuseur carbone
    if (isGT) {
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 1.8), wingMat);
      wing.position.set(-chassisL / 2 + 0.15, chassisY + 0.58, 0);
      const postW1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.06), wingMat);
      postW1.position.set(-chassisL / 2 + 0.15, chassisY + 0.44, 0.6);
      const postW2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.06), wingMat);
      postW2.position.set(-chassisL / 2 + 0.15, chassisY + 0.44, -0.6);
      carGroup.add(wing, postW1, postW2);
    }

    // Si SUV : Barres de toit argentées et plaques de protection
    if (isSUV) {
      const railMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.9, roughness: 0.2 });
      [-0.75, 0.75].forEach(zSide => {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), railMat);
        rail.rotation.z = Math.PI / 2;
        rail.position.set(cabinX, cabinY + (cabinH / 2) + 0.06, zSide);
        carGroup.add(rail);
      });
    }

    // Si Taxi : enseigne de toit lumineuse bicolore "TAXI PARISIEN"
    if (type === 'taxi') {
      const taxiSign = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.24, 0.38), new THREE.MeshBasicMaterial({ color: 0xfffa65 }));
      taxiSign.position.set(cabinX, cabinY + (cabinH / 2) + 0.16, 0);
      const statusLight = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: 0x2ed573 }));
      statusLight.position.set(cabinX, cabinY + (cabinH / 2) + 0.32, 0);
      carGroup.add(taxiSign, statusLight);
    }

    // 3. 4 Roues en alliage d'aluminium avec jantes bâtons et étriers rouges
    const wheels = [];
    const wheelR = isSUV ? 0.44 : 0.36;
    const wheelY = isSUV ? 0.44 : 0.36;
    const wheelPositions = [
      [-chassisL * 0.32, wheelY, chassisW * 0.52],
      [chassisL * 0.32, wheelY, chassisW * 0.52],
      [-chassisL * 0.32, wheelY, -chassisW * 0.52],
      [chassisL * 0.32, wheelY, -chassisW * 0.52]
    ];

    wheelPositions.forEach(pos => {
      const wGroup = new THREE.Group();
      wGroup.position.set(pos[0], pos[1], pos[2]);

      const tireGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.28, 14);
      const tire = new THREE.Mesh(tireGeo, rubberMat);
      tire.rotation.x = Math.PI / 2;
      wGroup.add(tire);

      const rimGeo = new THREE.CylinderGeometry(wheelR * 0.65, wheelR * 0.65, 0.29, 10);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = Math.PI / 2;
      wGroup.add(rim);

      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.12), caliperMat);
      caliper.position.set(0, wheelR * 0.4, 0);
      wGroup.add(caliper);

      carGroup.add(wGroup);
      wheels.push(wGroup);
    });

    carGroup.userData.wheels = wheels;

    // 4. Optiques avant LED et bande de feux arrière avec faisceaux volumétriques
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });

    const lightGeo = new THREE.BoxGeometry(0.12, 0.16, 0.36);
    const lightL = new THREE.Mesh(lightGeo, headMat);
    lightL.position.set(chassisL / 2 + 0.02, chassisY + 0.12, chassisW * 0.32);
    const lightR = new THREE.Mesh(lightGeo, headMat);
    lightR.position.set(chassisL / 2 + 0.02, chassisY + 0.12, -chassisW * 0.32);
    carGroup.add(lightL, lightR);



    // Barre LED rouge continue à l'arrière
    const lightbar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, chassisW * 0.85), tailMat);
    lightbar.position.set(-chassisL / 2 - 0.02, chassisY + 0.12, 0);
    carGroup.add(lightbar);

    // 5. Ombre de contact au sol
    const shadowTex = textureFactory.getContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.7), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    carGroup.add(shadow);

    carGroup.userData = { wheels, type };
    return carGroup;
  }

  // --- GÉNÉRATION D'UN GRAND CARREFOUR URBAIN FRANÇAIS RÉALISTE ---
  spawnIntersection(zPos, roadCurveFunc = null, roadAngleFunc = null) {
    const nodeGroup = new THREE.Group();
    const curveX = roadCurveFunc ? roadCurveFunc(zPos) : 0;
    const curveAngle = roadAngleFunc ? roadAngleFunc(zPos) : 0;

    nodeGroup.position.set(curveX, 0, zPos);
    nodeGroup.rotation.y = curveAngle;

    // 1. Chaussée transversale large (Avenue perpendiculaire prolongée 96m x 18m)
    const crossRoadGeo = new THREE.PlaneGeometry(96, 18);
    const crossRoadMat = new THREE.MeshToonMaterial({ color: 0x222a35 });
    const crossRoad = new THREE.Mesh(crossRoadGeo, crossRoadMat);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.y = 0.02;
    crossRoad.receiveShadow = true;
    nodeGroup.add(crossRoad);

    // Ligne centrale discontinue jaune/blanche sur l'avenue transversale
    const crossCenterLineMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.85 });
    for (let cX = -44; cX <= 44; cX += 4.5) {
      if (Math.abs(cX) < 6.0) continue; // Laisser le centre du carrefour ouvert
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.3), crossCenterLineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(cX, 0.025, 0);
      nodeGroup.add(dash);
    }

    // 1b. Immeubles et façades haussmanniennes longeant l'avenue perpendiculaire
    // Les voitures traversent entre de vrais immeubles au lieu de surgir du vide !
    const crossBldgColors = [0xdfd5c6, 0xeee3d3, 0xd4c5b3, 0xc8b8a6, 0xede4d3];
    const roofMat = new THREE.MeshToonMaterial({ color: 0x2f3542 });
    const shopColors = [0x800020, 0x1e372f, 0x0c2461, 0xb33939];
    const shopWindowMat = new THREE.MeshBasicMaterial({ color: 0xffe6a2, transparent: true, opacity: 0.85 });
    const crossSidewalkMat = new THREE.MeshToonMaterial({ color: 0x95a5a6 });
    const crossCurbMat = new THREE.MeshToonMaterial({ color: 0xdcdde1 });

    [-1, 1].forEach(zSide => {
      const bldgZ = zSide * 15.5;
      const walkZ = zSide * 10.0;
      const curbZ = zSide * 8.6;

      // Trottoirs continus de l'avenue transversale
      [-29.5, 29.5].forEach(walkX => {
        const walkMesh = new THREE.Mesh(new THREE.BoxGeometry(30, 0.32, 2.8), crossSidewalkMat);
        walkMesh.position.set(walkX, 0.16, walkZ);
        nodeGroup.add(walkMesh);

        const curbMesh = new THREE.Mesh(new THREE.BoxGeometry(30, 0.36, 0.3), crossCurbMat);
        curbMesh.position.set(walkX, 0.18, curbZ);
        nodeGroup.add(curbMesh);
      });

      // Alignement de 6 immeubles haussmanniens de chaque côté
      [-39, -30, -21, 21, 30, 39].forEach((bX, idx) => {
        const bHeight = 11.0 + ((idx * 3 + Math.abs(bX)) % 6);
        const bMat = new THREE.MeshToonMaterial({ color: crossBldgColors[(idx + Math.abs(bX)) % crossBldgColors.length] });
        const bldg = new THREE.Mesh(new THREE.BoxGeometry(8.4, bHeight, 8.5), bMat);
        bldg.position.set(bX, bHeight / 2, bldgZ);
        nodeGroup.add(bldg);

        // Toit mansardé en zinc
        const roof = new THREE.Mesh(new THREE.BoxGeometry(8.3, 2.6, 8.4), roofMat);
        roof.position.set(bX, bHeight + 1.3, bldgZ);
        nodeGroup.add(roof);

        // Auvent de boutique rez-de-chaussée
        const awningMat = new THREE.MeshToonMaterial({ color: shopColors[(idx + 2) % shopColors.length] });
        const awning = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.4, 1.4), awningMat);
        awning.rotation.x = zSide > 0 ? -0.25 : 0.25;
        awning.position.set(bX, 2.6, bldgZ - (zSide * 4.4));
        nodeGroup.add(awning);

        // Vitrine chaleureuse de commerce
        const shopWin = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.0), shopWindowMat);
        shopWin.rotation.y = zSide > 0 ? Math.PI : 0;
        shopWin.position.set(bX, 1.2, bldgZ - (zSide * 4.26));
        nodeGroup.add(shopWin);
      });

      // Candélabres sur l'avenue perpendiculaire
      [-35, -23, 23, 35].forEach(lampX => {
        const cLamp = this.createStreetLampMesh();
        cLamp.position.set(lampX, 0.32, walkZ);
        nodeGroup.add(cLamp);
      });
    });

    // 2. 4 Trottoirs d'angles arrondis réalistes en granit gris clair avec chanfrein
    const sidewalkMat = new THREE.MeshToonMaterial({ color: 0x95a5a6 });
    const cornerOffsets = [
      { x: -14.5, z: -14.5, rot: 0 },
      { x: 14.5, z: -14.5, rot: Math.PI / 2 },
      { x: 14.5, z: 14.5, rot: Math.PI },
      { x: -14.5, z: 14.5, rot: -Math.PI / 2 }
    ];

    cornerOffsets.forEach(pos => {
      // Dalle de trottoir d'angle surélevée
      const cornerGeo = new THREE.BoxGeometry(15, 0.32, 13);
      const corner = new THREE.Mesh(cornerGeo, sidewalkMat);
      corner.position.set(pos.x, 0.16, pos.z);
      nodeGroup.add(corner);

      // Bordure biseautée
      const curbGeo = new THREE.BoxGeometry(15.2, 0.36, 0.4);
      const curbMat = new THREE.MeshToonMaterial({ color: 0xdcdde1 });
      const curbZ = new THREE.Mesh(curbGeo, curbMat);
      curbZ.position.set(pos.x, 0.18, pos.z > 0 ? pos.z - 6.5 : pos.z + 6.5);
      nodeGroup.add(curbZ);

      // Barrières Croix de Saint-André sur les angles
      const barrier = this.createSaintAndreBarrierMesh();
      barrier.position.set(pos.x > 0 ? pos.x - 5.5 : pos.x + 5.5, 0.32, pos.z > 0 ? pos.z - 5.5 : pos.z + 5.5);
      nodeGroup.add(barrier);

      // Candélabre d'éclairage urbain
      const lamp = this.createStreetLampMesh();
      lamp.position.set(pos.x > 0 ? pos.x - 3.5 : pos.x + 3.5, 0.32, pos.z > 0 ? pos.z - 4.5 : pos.z + 4.5);
      nodeGroup.add(lamp);
    });

    // 3. Lignes blanches continues d'arrêt (Stop Line) avant chaque passage piéton
    const stopLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stopLineSouth = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 0.55), stopLineMat);
    stopLineSouth.rotation.x = -Math.PI / 2;
    stopLineSouth.position.set(0, 0.03, -8.6);
    nodeGroup.add(stopLineSouth);

    const stopLineNorth = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 0.55), stopLineMat);
    stopLineNorth.rotation.x = -Math.PI / 2;
    stopLineNorth.position.set(0, 0.03, 8.6);
    nodeGroup.add(stopLineNorth);

    // 4. Passages piétons zébrés normalisés sur les 4 branches du carrefour
    const stripeGeo = new THREE.PlaneGeometry(0.55, 3.8);

    // Passages piétons Nord et Sud (traversée de la voie principale)
    for (let s = -4.2; s <= 4.2; s += 0.95) {
      const zSouth = new THREE.Mesh(stripeGeo, stopLineMat);
      zSouth.rotation.x = -Math.PI / 2;
      zSouth.position.set(s, 0.026, -9.8);
      nodeGroup.add(zSouth);

      const zNorth = new THREE.Mesh(stripeGeo, stopLineMat);
      zNorth.rotation.x = -Math.PI / 2;
      zNorth.position.set(s, 0.026, 9.8);
      nodeGroup.add(zNorth);
    }

    // Passages piétons Est et Ouest (traversée de l'avenue perpendiculaire)
    const stripeCrossGeo = new THREE.PlaneGeometry(3.8, 0.55);
    for (let s = -6.5; s <= 6.5; s += 1.1) {
      const zWest = new THREE.Mesh(stripeCrossGeo, stopLineMat);
      zWest.rotation.x = -Math.PI / 2;
      zWest.position.set(-6.8, 0.026, s);
      nodeGroup.add(zWest);

      const zEast = new THREE.Mesh(stripeCrossGeo, stopLineMat);
      zEast.rotation.x = -Math.PI / 2;
      zEast.position.set(6.8, 0.026, s);
      nodeGroup.add(zEast);
    }

    // 5. Mâts de Feux Tricolores réalistes (gauche et droite)
    const tlLeft = this.createTrafficLightMesh(true);
    tlLeft.group.position.set(-5.6, 0, -8.6);
    nodeGroup.add(tlLeft.group);

    const tlRight = this.createTrafficLightMesh(false);
    tlRight.group.position.set(5.6, 0, -8.6);
    nodeGroup.add(tlRight.group);

    // 6. Portique monumental au-dessus des voies avec signalisation européenne et feux
    const overheadGantry = this.createOverheadGantryMesh();
    overheadGantry.group.position.set(0, 0, -8.6);
    nodeGroup.add(overheadGantry.group);

    const streetName = STREET_NAMES[this.streetNameIndex % STREET_NAMES.length];
    this.streetNameIndex++;

    this.intersections.push({
      group: nodeGroup,
      z: zPos,
      curveX,
      streetName,
      tlLeft,
      tlRight,
      overheadGantry,
      state: 'GREEN', // Démarre au vert, passe à l'orange/rouge à l'approche
      timeInState: 0,
      stoppedProperly: false,
      bonusAwarded: false,
      triggeredCrossingCars: false,
      passed: false
    });

    this.container.add(nodeGroup);
  }

  setLightState(inter, state) {
    inter.state = state;
    const isRed = state === 'RED';
    const isOrange = state === 'ORANGE';
    const isGreen = state === 'GREEN';

    // Couleurs HDR (> 1.0) pour les optiques actives : le bloom arcade
    // déclenche un halo néon authentique ; les optiques inactives restent éteintes.
    // Constantes de module : zéro allocation par transition d'état.
    const { RED_ON, RED_OFF, ORANGE_ON, ORANGE_OFF, GREEN_ON, GREEN_OFF } = getLampColors();

    [inter.tlLeft, inter.tlRight].forEach(tl => {
      if (!tl) return;
      tl.lampRed.material.color.copy(isRed ? RED_ON : RED_OFF);
      tl.lampOrange.material.color.copy(isOrange ? ORANGE_ON : ORANGE_OFF);
      tl.lampGreen.material.color.copy(isGreen ? GREEN_ON : GREEN_OFF);

      tl.repRed.material.color.copy(isRed ? RED_ON : RED_OFF);
      tl.repOrange.material.color.copy(isOrange ? ORANGE_ON : ORANGE_OFF);
      tl.repGreen.material.color.copy(isGreen ? GREEN_ON : GREEN_OFF);
    });

    if (inter.overheadGantry) {
      inter.overheadGantry.lampRed.material.color.copy(isRed ? RED_ON : RED_OFF);
      inter.overheadGantry.lampOrange.material.color.copy(isOrange ? ORANGE_ON : ORANGE_OFF);
      inter.overheadGantry.lampGreen.material.color.copy(isGreen ? GREEN_ON : GREEN_OFF);
      if (inter.overheadGantry.beacon) {
        inter.overheadGantry.beacon.visible = isRed || isOrange;
      }
    }
  }

  update(delta, playerZ, bikeX, bikeSpeed, onRedLightViolation, onStopAtRedLightBonus, roadCurveFunc = null, roadAngleFunc = null, onApproachingRedLight = null, onCrossingCarCollision = null, onCrossingNearMiss = null) {
    // Génération continue des carrefours réalistes
    if (this.nextSpawnZ < playerZ + 260) {
      this.spawnIntersection(this.nextSpawnZ, roadCurveFunc, roadAngleFunc);
      this.nextSpawnZ += this.spawnInterval;
    }

    // Gestion de chaque carrefour
    this.intersections.forEach(inter => {
      const distToPlayer = inter.z - playerZ;
      inter.timeInState += delta;

      // 1. Cycle des feux tricolores réaliste lors de l'approche du joueur
      if (distToPlayer > 0 && distToPlayer < 75 && distToPlayer > 42 && inter.state === 'GREEN') {
        // Le feu passe à l'ORANGE
        this.setLightState(inter, 'ORANGE');
        inter.timeInState = 0;
      } else if (distToPlayer > 0 && distToPlayer <= 42 && inter.state === 'ORANGE' && inter.timeInState > 0.8) {
        // Le feu passe au ROUGE
        this.setLightState(inter, 'RED');
        inter.timeInState = 0;
        if (onApproachingRedLight && !inter.warnedToast) {
          inter.warnedToast = true;
          onApproachingRedLight(inter.streetName);
        }
      }

      // 2. Déclenchement de la circulation transversale au carrefour
      if (distToPlayer < 35 && distToPlayer > -18 && !inter.triggeredCrossingCars) {
        inter.triggeredCrossingCars = true;

        // Générer 2 véhicules transversaux en cascade (Circulation fluide sans accident de croisement)
        const count = 2;
        for (let c = 0; c < count; c++) {
          const carTypes = ['taxi', 'van', 'compact', 'berline'];
          const type = carTypes[(c + Math.floor(Math.random() * carTypes.length)) % carTypes.length];
          const carMesh = this.createCrossingCarMesh(type);

          const fromLeft = c % 2 === 0;
          const startX = fromLeft ? -32 - (c * 14) : 32 + (c * 14);
          const speedMag = 22.0 + Math.random() * 6.0;
          const speedX = fromLeft ? speedMag : -speedMag;
          const zOffset = (c === 0 ? -2.2 : 2.2);

          const curveX = roadCurveFunc ? roadCurveFunc(inter.z) : 0;
          carMesh.position.set(curveX + startX, 0, inter.z + zOffset);
          carMesh.rotation.y = fromLeft ? 0 : Math.PI;

          this.container.add(carMesh);
          const carEntry = {
            mesh: carMesh,
            velX: speedX,
            z: inter.z + zOffset,
            active: true,
            fromLeft,
            curveX
          };
          this.crossingCars.push(carEntry);
        }
      }

      // 3. Détection de respect du feu rouge par le joueur (Arrêt propre avant la ligne de stop)
      if (inter.state === 'RED' && distToPlayer > 0 && distToPlayer < 12.0) {
        if (bikeSpeed < 3.0 && !inter.bonusAwarded) {
          inter.stoppedProperly = true;
          inter.bonusAwarded = true;
          if (onStopAtRedLightBonus) {
            onStopAtRedLightBonus(inter.streetName);
          }
        }
      }

      // Si le joueur s'est arrêté proprement et attend, le feu repasse au vert après 2.5s
      if (inter.state === 'RED' && inter.timeInState > 2.8) {
        this.setLightState(inter, 'GREEN');
      }

      // Si le joueur franchit le feu rouge sans arrêt complet préalable : VERBALISATION & RÉDUCTION DU SCORE !
      if (inter.state === 'RED' && !inter.stoppedProperly && !inter.ticketIssued && distToPlayer < -1.0 && distToPlayer > -18.0) {
        inter.ticketIssued = true;
        if (onRedLightViolation) {
          onRedLightViolation(inter.streetName);
        }
      }

      // Nettoyage des carrefours dépassés
      if (inter.z < playerZ - 90) {
        this.container.remove(inter.group);
      }
    });

    // 4. Déplacement, voltige physique et collisions des véhicules transversaux
    for (let i = this.crossingCars.length - 1; i >= 0; i--) {
      const car = this.crossingCars[i];
      if (!car.active) continue;

      if (car.isWrecked) {
        // Physique de voltige / projection spectaculaire en cas de carambolage T-Bone
        car.mesh.position.y += car.vy * delta;
        car.mesh.position.x += (car.vx || 0) * delta;
        car.vy -= 26 * delta; // Gravité
        car.mesh.rotation.x += (car.rotX || 5) * delta;
        car.mesh.rotation.y += (car.rotY || 7) * delta;
        car.mesh.rotation.z += (car.rotZ || 4) * delta;
        car.wreckTimer = (car.wreckTimer || 0) + delta;

        if (car.mesh.position.y < -3 || car.wreckTimer > 2.2) {
          this.container.remove(car.mesh);
          this.crossingCars.splice(i, 1);
        }
        continue;
      }

      car.mesh.position.x += car.velX * delta;

      // Faire tourner les roues des voitures transversales
      if (car.mesh.userData && car.mesh.userData.wheels) {
        car.mesh.userData.wheels.forEach(w => {
          w.children[0].rotation.y += delta * 18;
        });
      }

      // Détection d'interaction avec le joueur (Carambolage T-Bone ou Frôlage)
      const carWorldX = car.mesh.position.x;
      const dx = Math.abs(bikeX - carWorldX);
      const dz = Math.abs(playerZ - car.z);

      if (dx < 2.5 && dz < 2.2 && !car.collisionHandled) {
        car.collisionHandled = true;
        if (onCrossingCarCollision) {
          onCrossingCarCollision(car);
        }
      } else if (dx < 4.4 && dz < 3.2 && !car.nearMissAwarded && !car.collisionHandled) {
        car.nearMissAwarded = true;
        if (onCrossingNearMiss) {
          onCrossingNearMiss(car);
        }
      }

      // Supprimer quand la voiture sort du champ
      if (Math.abs(car.mesh.position.x) > 48) {
        this.container.remove(car.mesh);
        this.crossingCars.splice(i, 1);
      }
    }
  }

  reset() {
    while (this.container.children.length > 0) {
      this.container.remove(this.container.children[0]);
    }
    this.intersections = [];
    this.crossingCars = [];
    this.nextSpawnZ = 95;
    this.streetNameIndex = 0;
  }
}

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

  // --- CRÉATION DU PORTIQUE DE FEUX TRICOLORES FRANÇAIS HAUTE FIDÉLITÉ (MÂT + POTENCE SURPLOMBANTE + PLAQUE DE RUE LISIBLE) ---
  createTrafficLightMesh(isLeft = true, streetName = 'BD SAINT-GERMAIN') {
    const group = new THREE.Group();
    const sign = isLeft ? 1 : -1;
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.42, metalness: 0.65 });
    const trimGoldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.85 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5, metalness: 0.4 });

    // 1. Socle octogonal en fonte ciselée ancré dans le trottoir (zéro flottement)
    const baseGeo = new THREE.CylinderGeometry(0.22, 0.30, 0.75, 10);
    const base = new THREE.Mesh(baseGeo, poleMat);
    base.position.y = 0.35;
    group.add(base);

    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10), trimGoldMat);
    baseRing.position.y = 0.72;
    group.add(baseRing);

    // 2. Mât principal élancé avec potence horizontale surplombant la voie
    const poleGeo = new THREE.CylinderGeometry(0.09, 0.13, 4.9, 10);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.45;
    group.add(pole);

    // Potence en console (Cantilever arm) s'avançant au-dessus de la chaussée
    const armLen = 2.35;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, armLen, 8), poleMat);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(sign * (armLen / 2), 4.72, 0);
    group.add(arm);

    // Gousset de renfort diagonal sous la potence
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6), poleMat);
    strut.rotation.z = sign * (Math.PI / 4);
    strut.position.set(sign * 0.42, 4.35, 0);
    group.add(strut);

    // 3. Boîtier principal latéral à hauteur d'œil (3 feux verticaux + cadre contrasté blanc/anthracite)
    const boxX = sign * 0.28;
    const backplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 1.48, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 })
    );
    backplate.position.set(boxX, 3.0, -0.14);
    group.add(backplate);

    const mainBox = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.36, 0.38), boxMat);
    mainBox.position.set(boxX, 3.0, 0);
    group.add(mainBox);

    // Visières pare-soleil incurvées au-dessus de chaque feu
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.6 });
    [-0.42, 0, 0.42].forEach(yOff => {
      const visorGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.16, 10, 1, true, 0, Math.PI);
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.rotation.x = Math.PI / 2;
      visor.position.set(boxX, 3.0 + yOff + 0.08, 0.22);
      group.add(visor);
    });

    // 4. Optiques principales + Répétiteur haut sur potence (partagent le même matériau dynamique par couleur)
    const lampGeo = new THREE.SphereGeometry(0.13, 12, 10);
    const redMat = new THREE.MeshBasicMaterial({ color: 0x441111 });
    const orangeMat = new THREE.MeshBasicMaterial({ color: 0x442200 });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x243b2a });
    greenMat.color.setRGB(0.18, 1.0, 0.24);

    const lampRed = new THREE.Mesh(lampGeo, redMat);
    lampRed.position.set(boxX, 3.42, 0.20);
    const lampOrange = new THREE.Mesh(lampGeo, orangeMat);
    lampOrange.position.set(boxX, 3.0, 0.20);
    const lampGreen = new THREE.Mesh(lampGeo, greenMat);
    lampGreen.position.set(boxX, 2.58, 0.20);
    group.add(lampRed, lampOrange, lampGreen);

    // 4b. Boîtier supérieur suspendu sur la potence (haute visibilité de loin)
    const overheadX = sign * 1.85;
    const overBackplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 1.42, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 })
    );
    overBackplate.position.set(overheadX, 4.55, -0.14);
    const overBox = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.30, 0.36), boxMat);
    overBox.position.set(overheadX, 4.55, 0);
    const overRed = new THREE.Mesh(lampGeo, redMat);
    overRed.position.set(overheadX, 4.95, 0.19);
    const overOrange = new THREE.Mesh(lampGeo, orangeMat);
    overOrange.position.set(overheadX, 4.55, 0.19);
    const overGreen = new THREE.Mesh(lampGeo, greenMat);
    overGreen.position.set(overheadX, 4.15, 0.19);
    group.add(overBackplate, overBox, overRed, overOrange, overGreen);

    // 5. Répétiteur bas pour deux-roues (spécificité urbaine française)
    const repBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.62, 0.24), boxMat);
    repBox.position.set(sign * 0.2, 1.38, 0);
    group.add(repBox);

    const repRed = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), redMat);
    repRed.position.set(sign * 0.2, 1.56, 0.13);
    const repOrange = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), orangeMat);
    repOrange.position.set(sign * 0.2, 1.38, 0.13);
    const repGreen = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), greenMat);
    repGreen.position.set(sign * 0.2, 1.20, 0.13);
    group.add(repRed, repOrange, repGreen);

    // 6. Plaque de rue émaillée haute définition avec vrai texte lisible
    const plateTex = textureFactory.getStreetPlateTexture(streetName);
    const plateMat = new THREE.MeshStandardMaterial({
      map: plateTex,
      roughness: 0.35,
      metalness: 0.15
    });
    const streetPlate = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.38, 0.06), plateMat);
    streetPlate.position.set(sign * 0.65, 2.08, 0.10);
    group.add(streetPlate);

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

  // --- PORTIQUE SUSPENDU DISCRET AVEC FEUX DE SIGNALISATION DU CARREFOUR ---
  // Élimine définitivement les panneaux autoroutiers géants blancs qui brillent et aveuglent
  createOverheadGantryMesh() {
    const gantry = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.8, roughness: 0.4 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.6 });

    // 1. Deux poteaux tubulaires discrets en acier anthracite
    const postGeo = new THREE.CylinderGeometry(0.1, 0.12, 5.8, 10);
    const postL = new THREE.Mesh(postGeo, postMat);
    postL.position.set(-5.6, 2.9, 0);
    const postR = new THREE.Mesh(postGeo, postMat);
    postR.position.set(5.6, 2.9, 0);
    gantry.add(postL, postR);

    // 2. Traverse supérieure fine en treillis d'acier
    const beamGeo = new THREE.BoxGeometry(11.4, 0.22, 0.26);
    const beam = new THREE.Mesh(beamGeo, postMat);
    beam.position.set(0, 5.4, 0);
    gantry.add(beam);

    // 3. Boîtier central de feux suspendu au-dessus des voies (format urbain discret)
    const centerBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.4, 0.35), boxMat);
    centerBox.position.set(0, 4.3, 0.1);
    gantry.add(centerBox);

    // Optiques LED calibrées (Rouge, Orange, Vert) — zéro éblouissement
    const lampGeo = new THREE.SphereGeometry(0.14, 10, 8);
    const lampRed = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xff2d55 }));
    lampRed.position.set(0, 4.75, 0.28);
    const lampOrange = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0x442200 }));
    lampOrange.position.set(0, 4.3, 0.28);
    const lampGreen = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0x004400 }));
    lampGreen.position.set(0, 3.85, 0.28);
    gantry.add(lampRed, lampOrange, lampGreen);

    // Visières pare-soleil incurvées
    const visorMat = new THREE.MeshToonMaterial({ color: 0x111111 });
    [4.75, 4.3, 3.85].forEach(y => {
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 8, 1, true, 0, Math.PI), visorMat);
      visor.rotation.x = Math.PI / 2;
      visor.position.set(0, y + 0.08, 0.28);
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

  // --- CRÉATION DE CANDÉLABRE URBAIN RÉALISTE ANCRÉ AU SOL ---
  createStreetLampMesh() {
    const lampGroup = new THREE.Group();
    const ironMat = new THREE.MeshToonMaterial({ color: 0x242a30 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff1d0 });

    // Socle ancré dans le trottoir
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.65, 8), ironMat);
    base.position.y = 0.25;
    lampGroup.add(base);

    // Mât à hauteur urbaine réaliste
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.2, 8), ironMat);
    post.position.y = 1.75;
    lampGroup.add(post);

    // Crosse horizontale reliant physiquement le mât à la lanterne
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), ironMat);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(-0.24, 3.35, 0);
    lampGroup.add(arm);

    // Chapeau de lanterne solidaire de la crosse
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.15, 6), ironMat);
    cap.position.set(-0.42, 3.42, 0);
    lampGroup.add(cap);

    // Corps de lanterne
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.28, 6), glowMat);
    lantern.position.set(-0.42, 3.22, 0);
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

  // --- GÉNÉRATION D'UN GRAND CARREFOUR URBAIN FRANÇAIS HAUTE FIDÉLITÉ (AVENUE TRANSVERSALE HD, ROTONDES D'ANGLE & BOX-JUNCTION) ---
  spawnIntersection(zPos, roadCurveFunc = null, roadAngleFunc = null) {
    const nodeGroup = new THREE.Group();
    const curveX = roadCurveFunc ? roadCurveFunc(zPos) : 0;
    const curveAngle = roadAngleFunc ? roadAngleFunc(zPos) : 0;

    nodeGroup.position.set(curveX, 0, zPos);
    nodeGroup.rotation.y = curveAngle;

    const streetName = STREET_NAMES[this.streetNameIndex % STREET_NAMES.length];
    this.streetNameIndex++;

    // Matériaux partagés / mémoïsés haute définition
    const roadTex = textureFactory.getRoadTexture();
    const crossRoadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.84,
      metalness: 0.06,
      polygonOffset: true,
      polygonOffsetFactor: -1
    });

    const boxTex = textureFactory.getIntersectionBoxTexture();
    const boxJunctionMat = new THREE.MeshStandardMaterial({
      map: boxTex,
      roughness: 0.80,
      metalness: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: -2
    });

    const sidewalkTex = textureFactory.getSidewalkTexture();
    const crossSidewalkMat = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.88,
      metalness: 0.05
    });
    const graniteCurbMat = new THREE.MeshStandardMaterial({ color: 0x8d99ae, roughness: 0.65, metalness: 0.1 });
    const darkIronMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.4, metalness: 0.75 });
    const zincRoofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.45 });
    const goldAccentMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.85 });
    const stopLineMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9, metalness: 0.0 });

    // 1. Dalle centrale Box-Junction (coeur du croisement 10.6m x 17.6m sans conflit de textures)
    const centerPlaza = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 17.6), boxJunctionMat);
    centerPlaza.rotation.x = -Math.PI / 2;
    centerPlaza.position.y = 0.024;
    centerPlaza.receiveShadow = true;
    nodeGroup.add(centerPlaza);

    // 1b. Deux bras de l'avenue perpendiculaire (Ouest & Est) avec bitume HD orienté à 90°
    [-28.5, 28.5].forEach(armX => {
      const armRoad = new THREE.Mesh(new THREE.PlaneGeometry(16.8, 46.8), crossRoadMat);
      armRoad.rotation.x = -Math.PI / 2;
      armRoad.rotation.z = Math.PI / 2;
      armRoad.position.set(armX, 0.02, 0);
      armRoad.receiveShadow = true;
      nodeGroup.add(armRoad);
    });

    // 1c. Terre-pleins centraux directionnels en granit sur l'avenue transversale (avec balises lumineuses et arbres)
    [-16.5, 16.5].forEach(islandX => {
      const islandGroup = new THREE.Group();
      islandGroup.position.set(islandX, 0, 0);

      const islandBase = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.24, 1.3), graniteCurbMat);
      islandBase.position.y = 0.12;
      islandGroup.add(islandBase);

      // Extrémités semi-circulaires de l'îlot
      [-4.25, 4.25].forEach(endX => {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.24, 12), graniteCurbMat);
        cap.position.set(endX, 0.12, 0);
        islandGroup.add(cap);
      });

      // Borne lumineuse directionnelle (tête de refuge ambrée/cyan) côté carrefour
      const bollardX = islandX < 0 ? 3.8 : -3.8;
      const bollardPost = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.75, 10), darkIronMat);
      bollardPost.position.set(bollardX, 0.55, 0);
      const bollardGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.17, 0.28, 10),
        new THREE.MeshBasicMaterial({ color: 0x00f2fe })
      );
      bollardGlow.position.set(bollardX, 0.82, 0);
      islandGroup.add(bollardPost, bollardGlow);

      nodeGroup.add(islandGroup);
    });

    // 2. 4 Esplanades d'angles arrondies en granit & pavés (ZÉRO TROU entre le trottoir principal et l'avenue !)
    // La chaussée principale va de x = -4.2 à +4.2 ; la chaussée transversale va de z = -8.4 à +8.4.
    const cornerSigns = [
      { sx: -1, sz: -1 },
      { sx: 1, sz: -1 },
      { sx: 1, sz: 1 },
      { sx: -1, sz: 1 }
    ];

    const facadeMats = [0, 1, 2, 3].map(v => {
      const cols = ['#e8dfd1', '#dfe4ea', '#e2d4c4', '#d8e2dc'];
      return new THREE.MeshStandardMaterial({
        map: textureFactory.getHaussmannFacadeTexture(cols[v], '#334155', v),
        roughness: 0.78,
        metalness: 0.06
      });
    });
    const stoneWallMat = new THREE.MeshStandardMaterial({ color: 0xe5dec9, roughness: 0.82, metalness: 0.05 });

    cornerSigns.forEach((c, cIdx) => {
      const { sx, sz } = c;

      // 2a. Trottoir continu le long de l'avenue transversale (de |x| = 6.2m jusqu'à |x| = 50m, z = ±11.2m)
      const walkMesh = new THREE.Mesh(new THREE.BoxGeometry(44.0, 0.26, 5.6), crossSidewalkMat);
      walkMesh.position.set(sx * 28.2, 0.13, sz * 11.2);
      walkMesh.receiveShadow = true;
      nodeGroup.add(walkMesh);

      const curbMesh = new THREE.Mesh(new THREE.BoxGeometry(44.0, 0.30, 0.28), graniteCurbMat);
      curbMesh.position.set(sx * 28.2, 0.15, sz * 8.45);
      nodeGroup.add(curbMesh);

      // 2b. Museau d'angle arrondi en granit (relie x = ±4.2m et z = ±8.4m sans aucun vide géométrique)
      const bullnose = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.26, 16), crossSidewalkMat);
      bullnose.position.set(sx * 6.6, 0.13, sz * 10.8);
      nodeGroup.add(bullnose);

      const bullnoseCurb = new THREE.Mesh(new THREE.CylinderGeometry(2.48, 2.48, 0.29, 16, 1, true), graniteCurbMat);
      bullnoseCurb.position.set(sx * 6.6, 0.145, sz * 10.8);
      nodeGroup.add(bullnoseCurb);

      // Dalle de jonction intérieure pour boucher l'angle entre x = 4.2..7.8 et z = 8.4..14.0
      const cornerFill = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.26, 5.6), crossSidewalkMat);
      cornerFill.position.set(sx * 6.3, 0.13, sz * 11.2);
      nodeGroup.add(cornerFill);

      // 2c. Potelets parisiens en fonte avec anneau doré & barrière Croix de Saint-André sur le pan coupé
      for (let b = 0; b < 3; b++) {
        const ang = (b / 2) * (Math.PI / 2);
        const bx = sx * (6.6 - Math.cos(ang) * 2.15);
        const bz = sz * (10.8 - Math.sin(ang) * 2.15);
        const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.88, 8), darkIronMat);
        bollard.position.set(bx, 0.56, bz);
        const topBall = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), goldAccentMat);
        topBall.position.set(bx, 1.02, bz);
        nodeGroup.add(bollard, topBall);
      }

      const barrier = this.createSaintAndreBarrierMesh();
      barrier.position.set(sx * 9.5, 0.26, sz * 8.75);
      nodeGroup.add(barrier);

      // Candélabre d'angle ancré sur le trottoir
      const cornerLamp = this.createStreetLampMesh();
      cornerLamp.position.set(sx * 8.2, 0.13, sz * 10.2);
      nodeGroup.add(cornerLamp);

      // 2d. GRAND IMMEUBLE D'ANGLE À ROTONDE HAUSSMANNIENNE & COUPOLE EN ZINC
      const rotundaGroup = new THREE.Group();
      const rotX = sx * 12.2;
      const rotZ = sz * 16.6;
      rotundaGroup.position.set(rotX, 0, rotZ);

      const towerH = 16.5;
      // Tour cylindrique d'angle (Rotonde)
      const towerBody = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, towerH, 16), stoneWallMat);
      towerBody.position.set(-sx * 2.2, towerH / 2, -sz * 2.2);
      towerBody.castShadow = true;
      rotundaGroup.add(towerBody);

      // Anneaux de balcons filants en fer forgé autour de la rotonde
      [4.5, 8.8, 13.0].forEach(by => {
        const ringBalc = new THREE.Mesh(new THREE.CylinderGeometry(4.05, 4.05, 0.42, 16), darkIronMat);
        ringBalc.position.set(-sx * 2.2, by, -sz * 2.2);
        rotundaGroup.add(ringBalc);
      });

      // Dôme en zinc nervuré au sommet de la rotonde + lanterneau doré
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(3.75, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        zincRoofMat
      );
      dome.position.set(-sx * 2.2, towerH, -sz * 2.2);
      dome.scale.set(1, 1.15, 1);
      rotundaGroup.add(dome);

      const lanternBase = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 1.8, 10), zincRoofMat);
      lanternBase.position.set(-sx * 2.2, towerH + 4.3, -sz * 2.2);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.8, 8), goldAccentMat);
      spire.position.set(-sx * 2.2, towerH + 6.4, -sz * 2.2);
      rotundaGroup.add(lanternBase, spire);

      // Corps de bâtiment principal attenant à la rotonde avec vraies textures de façade HD
      const wingMat = facadeMats[cIdx % facadeMats.length];
      const wingBox = new THREE.Mesh(new THREE.BoxGeometry(10.5, towerH - 0.5, 9.2), stoneWallMat);
      wingBox.position.set(sx * 2.2, (towerH - 0.5) / 2, 0);
      wingBox.castShadow = true;
      rotundaGroup.add(wingBox);

      const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(10.2, 2.6, 8.9), zincRoofMat);
      wingRoof.position.set(sx * 2.2, towerH + 0.8, 0);
      rotundaGroup.add(wingRoof);

      // Façade texturée donnant sur l'avenue transversale
      const wingFacadeZ = new THREE.Mesh(new THREE.PlaneGeometry(10.4, towerH - 0.5), wingMat);
      wingFacadeZ.position.set(sx * 2.2, (towerH - 0.5) / 2, -sz * 4.66);
      wingFacadeZ.rotation.y = sz > 0 ? Math.PI : 0;
      rotundaGroup.add(wingFacadeZ);

      // Façade texturée donnant sur l'artère principale
      const wingFacadeX = new THREE.Mesh(new THREE.PlaneGeometry(9.1, towerH - 0.5), wingMat);
      wingFacadeX.position.set(-sx * 3.12, (towerH - 0.5) / 2, 0);
      wingFacadeX.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      rotundaGroup.add(wingFacadeX);

      nodeGroup.add(rotundaGroup);
    });

    // 2e. Alignement d'immeubles texturés et d'arbres le long de l'avenue perpendiculaire
    [-1, 1].forEach(zSide => {
      const bldgZ = zSide * 17.5;
      const walkZ = zSide * 10.4;

      [-39, -27.5, 27.5, 39].forEach((bX, idx) => {
        const bHeight = 14.0 + ((idx * 3 + Math.abs(bX)) % 5);
        const bWidth = 10.8;
        const bDepth = 9.0;
        const fMat = facadeMats[(idx + (zSide > 0 ? 1 : 0)) % facadeMats.length];

        const bldg = new THREE.Mesh(new THREE.BoxGeometry(bWidth, bHeight, bDepth), stoneWallMat);
        bldg.position.set(bX, bHeight / 2, bldgZ);
        bldg.castShadow = true;
        nodeGroup.add(bldg);

        // Façade HD orientée vers l'avenue transversale
        const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(bWidth - 0.1, bHeight), fMat);
        facePlane.position.set(bX, bHeight / 2, bldgZ - zSide * (bDepth / 2 + 0.06));
        facePlane.rotation.y = zSide > 0 ? Math.PI : 0;
        nodeGroup.add(facePlane);

        // Toiture mansardée en zinc
        const roof = new THREE.Mesh(new THREE.BoxGeometry(bWidth - 0.3, 2.5, bDepth - 0.3), zincRoofMat);
        roof.position.set(bX, bHeight + 1.25, bldgZ);
        nodeGroup.add(roof);
      });

      // Candélabres sur l'avenue perpendiculaire
      [-34, -21, 21, 34].forEach(lampX => {
        const cLamp = this.createStreetLampMesh();
        cLamp.position.set(lampX, 0.13, walkZ);
        nodeGroup.add(cLamp);
      });
    });

    // 3. Lignes blanches continues d'arrêt (Stop Line) avant chaque passage piéton
    const stopLineSouth = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 0.50), stopLineMat);
    stopLineSouth.rotation.x = -Math.PI / 2;
    stopLineSouth.position.set(0, 0.028, -8.8);
    nodeGroup.add(stopLineSouth);

    const stopLineNorth = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 0.50), stopLineMat);
    stopLineNorth.rotation.x = -Math.PI / 2;
    stopLineNorth.position.set(0, 0.028, 8.8);
    nodeGroup.add(stopLineNorth);

    // 4. Passages piétons zébrés haute visibilité sur les 4 branches du carrefour
    const stripeGeo = new THREE.PlaneGeometry(0.52, 3.4);
    for (let s = -3.6; s <= 3.6; s += 0.9) {
      const zSouth = new THREE.Mesh(stripeGeo, stopLineMat);
      zSouth.rotation.x = -Math.PI / 2;
      zSouth.position.set(s, 0.027, -10.8);
      nodeGroup.add(zSouth);

      const zNorth = new THREE.Mesh(stripeGeo, stopLineMat);
      zNorth.rotation.x = -Math.PI / 2;
      zNorth.position.set(s, 0.027, 10.8);
      nodeGroup.add(zNorth);
    }

    const stripeCrossGeo = new THREE.PlaneGeometry(3.4, 0.52);
    for (let s = -6.8; s <= 6.8; s += 1.05) {
      if (Math.abs(s) < 1.0) continue; // Ouverture au niveau de l'îlot central
      const zWest = new THREE.Mesh(stripeCrossGeo, stopLineMat);
      zWest.rotation.x = -Math.PI / 2;
      zWest.position.set(-7.2, 0.027, s);
      nodeGroup.add(zWest);

      const zEast = new THREE.Mesh(stripeCrossGeo, stopLineMat);
      zEast.rotation.x = -Math.PI / 2;
      zEast.position.set(7.2, 0.027, s);
      nodeGroup.add(zEast);
    }

    // 5. Portiques de Feux Tricolores français avec potence surplombante et plaque de rue lisible
    const tlLeft = this.createTrafficLightMesh(true, streetName);
    tlLeft.group.position.set(-4.65, 0, -8.8);
    nodeGroup.add(tlLeft.group);

    const tlRight = this.createTrafficLightMesh(false, streetName);
    tlRight.group.position.set(4.65, 0, -8.8);
    nodeGroup.add(tlRight.group);

    const overheadGantry = this.createOverheadGantryMesh();
    overheadGantry.group.visible = false;

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

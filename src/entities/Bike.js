/**
 * Motormageddon - Modélisation 3D et Physique Arcade de la Moto et du Pilote
 * Comprend 4 modèles de motos détaillées, le pilote cartoon articulé, et la dynamique de conduite.
 */

import * as THREE from 'three';
import { storage } from '../core/Storage.js';

export class Bike {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.bikeModelGroup = new THREE.Group();
    this.riderGroup = new THREE.Group();

    this.mesh.add(this.bikeModelGroup);
    this.mesh.add(this.riderGroup);
    this.scene.add(this.mesh);

    // Roues animées
    this.wheels = [];
    this.frontFork = null;
    this.riderHead = null;
    this.riderTorso = null;
    this.riderArmL = null;
    this.riderArmR = null;

    // Propriétés de pilotage
    this.x = 0;
    this.z = 0;
    this.targetX = 0;
    this.smoothedSteer = 0;
    this.currentLean = 0;
    this.targetLean = 0;
    this.bouncePhase = 0;
    this.currentBikeId = 'scooter';

    // État de crash et relèvement comique
    this.isCrashed = false;
    this.crashTimer = 0;
    this.crashDuration = 1.8;
    this.invulnerableTimer = 0;

    this.buildCurrentBike();
    this.buildRider();
  }

  buildCurrentBike(previewBikeId = null) {
    // Nettoyer l'ancien modèle
    while (this.bikeModelGroup.children.length > 0) {
      const obj = this.bikeModelGroup.children[0];
      this.bikeModelGroup.remove(obj);
    }
    this.wheels = [];
    this.frontFork = null;

    const bikeId = previewBikeId || storage.getEquippedBike() || 'scooter';
    this.currentBikeId = bikeId;
    const bodyColorHex = storage.getBikeColor(bikeId);
    const bodyMaterial = new THREE.MeshToonMaterial({
      color: bodyColorHex,
      roughness: 0.3,
      metalness: 0.2
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      metalness: 0.85,
      roughness: 0.15
    });

    const rubberMaterial = new THREE.MeshLambertMaterial({
      color: 0x1f1f1f
    });

    const leatherMaterial = new THREE.MeshLambertMaterial({
      color: 0x5c3a21
    });

    const lampMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff4cc
    });

    if (bikeId === 'scooter') {
      this.buildScooter(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else if (bikeId === 'sport') {
      this.buildSportBike(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else if (bikeId === 'chopper') {
      this.buildChopper(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else if (bikeId === 'trike') {
      this.buildTrike(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else if (bikeId === 'dragster') {
      this.buildDragster(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else if (bikeId === 'diablo') {
      this.buildDiablo(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else if (bikeId === 'ravageur') {
      this.buildRavageur(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    }
  }

  createWheel(radius, width, rubberMat, chromeMat) {
    const wheelGroup = new THREE.Group();

    // Pneu
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 18);
    const tire = new THREE.Mesh(tireGeo, rubberMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Jante
    const rimGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, width * 1.05, 12);
    const rim = new THREE.Mesh(rimGeo, chromeMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    // Rayons / Bâtons
    const spokeGeo = new THREE.BoxGeometry(radius * 1.2, width * 1.1, 0.05);
    const spoke1 = new THREE.Mesh(spokeGeo, chromeMat);
    const spoke2 = new THREE.Mesh(spokeGeo, chromeMat);
    spoke2.rotation.y = Math.PI / 2;
    wheelGroup.add(spoke1);
    wheelGroup.add(spoke2);

    return wheelGroup;
  }

  buildScooter(bodyMat, chromeMat, rubberMat, leatherMat, lampMat) {
    // Roue arrière
    const rearWheel = this.createWheel(0.32, 0.18, rubberMat, chromeMat);
    rearWheel.position.set(0, 0.32, -0.65);
    this.bikeModelGroup.add(rearWheel);
    this.wheels.push(rearWheel);

    // Carrosserie galbée arrière
    const rearBodyGeo = new THREE.BoxGeometry(0.55, 0.45, 0.85);
    const rearBody = new THREE.Mesh(rearBodyGeo, bodyMat);
    rearBody.position.set(0, 0.55, -0.45);
    rearBody.castShadow = true;
    this.bikeModelGroup.add(rearBody);

    // Selle en cuir biplace rétro
    const seatGeo = new THREE.BoxGeometry(0.42, 0.14, 0.7);
    const seat = new THREE.Mesh(seatGeo, leatherMat);
    seat.position.set(0, 0.84, -0.4);
    seat.castShadow = true;
    this.bikeModelGroup.add(seat);

    // Tablier avant protecteur (style Vespa)
    const apronGeo = new THREE.BoxGeometry(0.65, 0.75, 0.1);
    const apron = new THREE.Mesh(apronGeo, bodyMat);
    apron.position.set(0, 0.7, 0.35);
    apron.rotation.x = -0.15;
    apron.castShadow = true;
    this.bikeModelGroup.add(apron);

    // Plancher cale-pieds
    const floorGeo = new THREE.BoxGeometry(0.45, 0.06, 0.6);
    const floor = new THREE.Mesh(floorGeo, rubberMat);
    floor.position.set(0, 0.32, -0.05);
    this.bikeModelGroup.add(floor);

    // Fourche avant et guidon
    const forkGroup = new THREE.Group();
    forkGroup.position.set(0, 0.32, 0.65);

    const frontWheel = this.createWheel(0.32, 0.18, rubberMat, chromeMat);
    forkGroup.add(frontWheel);
    this.wheels.push(frontWheel);

    const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8);
    const stem = new THREE.Mesh(stemGeo, chromeMat);
    stem.position.set(0, 0.45, 0);
    stem.rotation.x = -0.12;
    forkGroup.add(stem);

    // Guidon
    const handleGeo = new THREE.BoxGeometry(0.7, 0.05, 0.05);
    const handle = new THREE.Mesh(handleGeo, chromeMat);
    handle.position.set(0, 0.85, -0.05);
    forkGroup.add(handle);

    // Poignées
    const gripGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8);
    const gripL = new THREE.Mesh(gripGeo, rubberMat);
    gripL.rotation.z = Math.PI / 2;
    gripL.position.set(-0.35, 0.85, -0.05);
    const gripR = gripL.clone();
    gripR.position.set(0.35, 0.85, -0.05);
    forkGroup.add(gripL);
    forkGroup.add(gripR);

    // Phare rond avant
    const lampGeo = new THREE.SphereGeometry(0.12, 12, 8);
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(0, 0.88, 0.05);
    forkGroup.add(lamp);

    // Rétroviseurs chromés
    const mirrorGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10);
    const mirrorL = new THREE.Mesh(mirrorGeo, chromeMat);
    mirrorL.rotation.x = Math.PI / 2;
    mirrorL.position.set(-0.32, 1.02, -0.05);
    forkGroup.add(mirrorL);

    const mirrorR = mirrorL.clone();
    mirrorR.position.set(0.32, 1.02, -0.05);
    forkGroup.add(mirrorR);

    this.frontFork = forkGroup;
    this.bikeModelGroup.add(forkGroup);

    // Échappement discret
    const exhaustGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8);
    const exhaust = new THREE.Mesh(exhaustGeo, chromeMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0.25, 0.28, -0.6);
    this.bikeModelGroup.add(exhaust);
  }

  buildSportBike(bodyMat, chromeMat, rubberMat, leatherMat, lampMat) {
    // Roue arrière plus large
    const rearWheel = this.createWheel(0.36, 0.26, rubberMat, chromeMat);
    rearWheel.position.set(0, 0.36, -0.75);
    this.bikeModelGroup.add(rearWheel);
    this.wheels.push(rearWheel);

    // Carénage profilé et réservoir
    const tankGeo = new THREE.BoxGeometry(0.48, 0.35, 0.7);
    const tank = new THREE.Mesh(tankGeo, bodyMat);
    tank.position.set(0, 0.72, 0.05);
    tank.rotation.x = 0.15;
    tank.castShadow = true;
    this.bikeModelGroup.add(tank);

    // Selle de course monoposte surélevée
    const seatGeo = new THREE.BoxGeometry(0.35, 0.12, 0.55);
    const seat = new THREE.Mesh(seatGeo, leatherMat);
    seat.position.set(0, 0.86, -0.4);
    seat.rotation.x = 0.1;
    seat.castShadow = true;
    this.bikeModelGroup.add(seat);

    // Coque arrière effilée
    const cowlGeo = new THREE.ConeGeometry(0.24, 0.6, 4);
    const cowl = new THREE.Mesh(cowlGeo, bodyMat);
    cowl.rotation.x = -Math.PI / 2;
    cowl.position.set(0, 0.9, -0.75);
    this.bikeModelGroup.add(cowl);

    // Bloc moteur central apparent
    const engineGeo = new THREE.BoxGeometry(0.42, 0.38, 0.5);
    const engine = new THREE.Mesh(engineGeo, chromeMat);
    engine.position.set(0, 0.45, -0.15);
    this.bikeModelGroup.add(engine);

    // Double pot d'échappement racing relevé
    const pipeGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.7, 8);
    const pipe = new THREE.Mesh(pipeGeo, chromeMat);
    pipe.rotation.x = 1.25;
    pipe.position.set(0.24, 0.55, -0.65);
    this.bikeModelGroup.add(pipe);

    // Fourche avant inversée
    const forkGroup = new THREE.Group();
    forkGroup.position.set(0, 0.36, 0.75);

    const frontWheel = this.createWheel(0.36, 0.22, rubberMat, chromeMat);
    forkGroup.add(frontWheel);
    this.wheels.push(frontWheel);

    const forkTubeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8);
    const forkL = new THREE.Mesh(forkTubeGeo, chromeMat);
    forkL.position.set(-0.14, 0.45, 0);
    forkL.rotation.x = -0.25;
    const forkR = forkL.clone();
    forkR.position.set(0.14, 0.45, 0);
    forkGroup.add(forkL);
    forkGroup.add(forkR);

    // Bulle aérodynamique et optiques doubles
    const noseGeo = new THREE.BoxGeometry(0.42, 0.3, 0.4);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.set(0, 0.8, -0.05);
    forkGroup.add(nose);

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.04), lampMat);
    eyeL.position.set(-0.12, 0.78, 0.16);
    const eyeR = eyeL.clone();
    eyeR.position.set(0.12, 0.78, 0.16);
    forkGroup.add(eyeL);
    forkGroup.add(eyeR);

    this.frontFork = forkGroup;
    this.bikeModelGroup.add(forkGroup);
  }

  buildChopper(bodyMat, chromeMat, rubberMat, leatherMat, lampMat) {
    // Roue arrière ultra large
    const rearWheel = this.createWheel(0.38, 0.32, rubberMat, chromeMat);
    rearWheel.position.set(0, 0.38, -0.85);
    this.bikeModelGroup.add(rearWheel);
    this.wheels.push(rearWheel);

    // Cadre bas
    const frameGeo = new THREE.BoxGeometry(0.35, 0.15, 1.2);
    const frame = new THREE.Mesh(frameGeo, bodyMat);
    frame.position.set(0, 0.35, -0.2);
    this.bikeModelGroup.add(frame);

    // Moteur V-Twin massif chromé
    const vTwinGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    const vTwin = new THREE.Mesh(vTwinGeo, chromeMat);
    vTwin.position.set(0, 0.5, -0.15);
    this.bikeModelGroup.add(vTwin);

    // Réservoir "Goutte d'eau"
    const tankGeo = new THREE.SphereGeometry(0.28, 12, 8);
    tankGeo.scale(0.8, 0.7, 1.4);
    const tank = new THREE.Mesh(tankGeo, bodyMat);
    tank.position.set(0, 0.8, 0.15);
    tank.castShadow = true;
    this.bikeModelGroup.add(tank);

    // Selle basse creusée avec dossier passager
    const seatGeo = new THREE.BoxGeometry(0.35, 0.12, 0.45);
    const seat = new THREE.Mesh(seatGeo, leatherMat);
    seat.position.set(0, 0.58, -0.45);
    this.bikeModelGroup.add(seat);

    const sissyBarGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6);
    const sissyBar = new THREE.Mesh(sissyBarGeo, chromeMat);
    sissyBar.position.set(0, 0.95, -0.8);
    this.bikeModelGroup.add(sissyBar);

    // Échappements "Straight Pipes" chromés
    const exhaustGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.1, 8);
    const exhaust = new THREE.Mesh(exhaustGeo, chromeMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0.24, 0.3, -0.45);
    this.bikeModelGroup.add(exhaust);

    // Grande roue avant à rayons et longue fourche râteau
    const forkGroup = new THREE.Group();
    forkGroup.position.set(0, 0.45, 1.05);

    const frontWheel = this.createWheel(0.45, 0.15, rubberMat, chromeMat);
    forkGroup.add(frontWheel);
    this.wheels.push(frontWheel);

    const forkStemGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8);
    const forkL = new THREE.Mesh(forkStemGeo, chromeMat);
    forkL.position.set(-0.16, 0.6, -0.3);
    forkL.rotation.x = -0.55;
    const forkR = forkL.clone();
    forkR.position.set(0.16, 0.6, -0.3);
    forkGroup.add(forkL);
    forkGroup.add(forkR);

    // Guidon "Ape Hanger" très haut
    const apeGeo = new THREE.BoxGeometry(0.85, 0.04, 0.04);
    const ape = new THREE.Mesh(apeGeo, chromeMat);
    ape.position.set(0, 1.35, -0.55);
    forkGroup.add(ape);

    // Phare chromé
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), lampMat);
    lamp.position.set(0, 0.85, -0.2);
    forkGroup.add(lamp);

    this.frontFork = forkGroup;
    this.bikeModelGroup.add(forkGroup);
  }

  buildTrike(bodyMat, chromeMat, rubberMat, leatherMat, lampMat) {
    // Deux roues arrière massives
    const rearWheelL = this.createWheel(0.42, 0.35, rubberMat, chromeMat);
    rearWheelL.position.set(-0.55, 0.42, -0.85);
    const rearWheelR = this.createWheel(0.42, 0.35, rubberMat, chromeMat);
    rearWheelR.position.set(0.55, 0.42, -0.85);
    this.bikeModelGroup.add(rearWheelL);
    this.bikeModelGroup.add(rearWheelR);
    this.wheels.push(rearWheelL, rearWheelR);

    // Essieu arrière chromé
    const axleGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8);
    const axle = new THREE.Mesh(axleGeo, chromeMat);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, 0.42, -0.85);
    this.bikeModelGroup.add(axle);

    // Aileron arrière Monster
    const spoilerGeo = new THREE.BoxGeometry(1.4, 0.08, 0.3);
    const spoiler = new THREE.Mesh(spoilerGeo, bodyMat);
    spoiler.position.set(0, 1.15, -1.05);
    this.bikeModelGroup.add(spoiler);

    // Châssis large
    const bodyGeo = new THREE.BoxGeometry(0.85, 0.5, 1.1);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.6, -0.35);
    body.castShadow = true;
    this.bikeModelGroup.add(body);

    // Siège baquet grand confort
    const seatGeo = new THREE.BoxGeometry(0.55, 0.2, 0.65);
    const seat = new THREE.Mesh(seatGeo, leatherMat);
    seat.position.set(0, 0.75, -0.3);
    this.bikeModelGroup.add(seat);

    // Fourche avant musclée
    const forkGroup = new THREE.Group();
    forkGroup.position.set(0, 0.4, 0.85);

    const frontWheel = this.createWheel(0.4, 0.22, rubberMat, chromeMat);
    forkGroup.add(frontWheel);
    this.wheels.push(frontWheel);

    const forkStemGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.1, 8);
    const forkL = new THREE.Mesh(forkStemGeo, chromeMat);
    forkL.position.set(-0.18, 0.5, -0.15);
    forkL.rotation.x = -0.3;
    const forkR = forkL.clone();
    forkR.position.set(0.18, 0.5, -0.15);
    forkGroup.add(forkL);
    forkGroup.add(forkR);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.05), chromeMat);
    handle.position.set(0, 1.05, -0.28);
    forkGroup.add(handle);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), lampMat);
    lamp.position.set(0, 0.85, 0.02);
    forkGroup.add(lamp);

    this.frontFork = forkGroup;
    this.bikeModelGroup.add(forkGroup);
  }

  // --- MODÈLES HARD & BADASS ADDITIONNELS ---
  buildDragster(bodyMat, chromeMat, rubberMat, leatherMat, lampMat) {
    // 1. Pneu dragster slick XXL à l'arrière (diamètre 1.1m, largeur 0.6m)
    const rearWheel = this.createWheel(0.55, 0.58, rubberMat, chromeMat);
    rearWheel.position.set(0, 0.55, -1.05);
    this.bikeModelGroup.add(rearWheel);
    this.wheels.push(rearWheel);

    // Bras oscillant étiré racing
    const swingarmGeo = new THREE.BoxGeometry(0.68, 0.12, 1.3);
    const swingarm = new THREE.Mesh(swingarmGeo, chromeMat);
    swingarm.position.set(0, 0.55, -0.65);
    this.bikeModelGroup.add(swingarm);

    // 2. Châssis tubulaire bas et profilé
    const frameGeo = new THREE.BoxGeometry(0.42, 0.22, 1.6);
    const frame = new THREE.Mesh(frameGeo, bodyMat);
    frame.position.set(0, 0.45, -0.1);
    this.bikeModelGroup.add(frame);

    // 3. Moteur V8 suralimenté massif
    const v8Block = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.6), chromeMat);
    v8Block.position.set(0, 0.62, -0.15);
    this.bikeModelGroup.add(v8Block);

    // Blower / Écope d'admission géante sur le dessus
    const blower = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.45), new THREE.MeshStandardMaterial({ color: 0xd63031, metalness: 0.8 }));
    blower.position.set(0, 0.95, -0.15);
    this.bikeModelGroup.add(blower);

    // 4. Échappements Zoomies latéraux relevés à 45° cracheurs de feu
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6b00 });
    for (let s of [-1, 1]) {
      const zoomie = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.65, 8), chromeMat);
      zoomie.position.set(s * 0.34, 0.72, -0.25);
      zoomie.rotation.z = s * -0.45;
      zoomie.rotation.x = -0.3;
      this.bikeModelGroup.add(zoomie);

      const flameTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), flameMat);
      flameTip.position.set(s * 0.44, 0.95, -0.32);
      flameTip.rotation.z = s * -0.45;
      this.bikeModelGroup.add(flameTip);
    }

    // 5. Bonbonne de Nitro (NOS) bleue sur le flanc
    const nosMat = new THREE.MeshStandardMaterial({ color: 0x0984e3, metalness: 0.7, roughness: 0.2 });
    const nosBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 10), nosMat);
    nosBottle.position.set(-0.25, 0.68, 0.25);
    nosBottle.rotation.x = 0.5;
    this.bikeModelGroup.add(nosBottle);

    // 6. Selle dragster plate ultra-basse avec cale-dos
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.48), leatherMat);
    seat.position.set(0, 0.62, -0.58);
    this.bikeModelGroup.add(seat);

    // 7. Roue avant dragster fine et guidon bracelets bas
    const forkGroup = new THREE.Group();
    forkGroup.position.set(0, 0.38, 0.95);

    const frontWheel = this.createWheel(0.38, 0.12, rubberMat, chromeMat);
    forkGroup.add(frontWheel);
    this.wheels.push(frontWheel);

    const forkStems = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8), chromeMat);
    forkStems.position.set(0, 0.45, -0.15);
    forkStems.rotation.x = -0.4;
    forkGroup.add(forkStems);

    const clipons = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.04), chromeMat);
    clipons.position.set(0, 0.82, -0.28);
    forkGroup.add(clipons);

    const dragLamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), lampMat);
    dragLamp.position.set(0, 0.72, 0.05);
    forkGroup.add(dragLamp);

    this.frontFork = forkGroup;
    this.bikeModelGroup.add(forkGroup);
  }

  buildDiablo(bodyMat, chromeMat, rubberMat, leatherMat, lampMat) {
    // 1. Roue arrière sportive large avec jante rouge
    const redAlloyMat = new THREE.MeshStandardMaterial({ color: 0xd63031, metalness: 0.85, roughness: 0.2 });
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.5 });

    const rearWheel = this.createWheel(0.42, 0.28, rubberMat, redAlloyMat);
    rearWheel.position.set(0, 0.42, -0.75);
    this.bikeModelGroup.add(rearWheel);
    this.wheels.push(rearWheel);

    // 2. Cadre treillis tubulaire rouge agressif
    const trellisGeo = new THREE.BoxGeometry(0.42, 0.38, 0.95);
    const trellis = new THREE.Mesh(trellisGeo, redAlloyMat);
    trellis.position.set(0, 0.55, -0.05);
    this.bikeModelGroup.add(trellis);

    // Moteur noir mat compact
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.4, 0.5), carbonMat);
    engine.position.set(0, 0.5, -0.1);
    this.bikeModelGroup.add(engine);

    // 3. Réservoir anguleux musclé avec prises d'air
    const tankGeo = new THREE.BoxGeometry(0.48, 0.32, 0.7);
    const tank = new THREE.Mesh(tankGeo, bodyMat);
    tank.position.set(0, 0.82, 0.15);
    this.bikeModelGroup.add(tank);

    // Ailerons aérodynamiques latéraux (Winglets MotoGP)
    for (let s of [-1, 1]) {
      const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.18), carbonMat);
      winglet.position.set(s * 0.32, 0.8, 0.35);
      winglet.rotation.z = s * -0.25;
      this.bikeModelGroup.add(winglet);
    }

    // 4. Double pot carbone sous la selle relevé
    for (let s of [-1, 1]) {
      const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.5, 8), carbonMat);
      muffler.position.set(s * 0.12, 0.75, -0.7);
      muffler.rotation.x = -0.45;
      this.bikeModelGroup.add(muffler);
    }

    // Selle solo race alcantara
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.35), leatherMat);
    seat.position.set(0, 0.72, -0.32);
    this.bikeModelGroup.add(seat);

    // 5. Train avant avec fourche inversée or
    const goldForkMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.9, roughness: 0.15 });
    const forkGroup = new THREE.Group();
    forkGroup.position.set(0, 0.42, 0.78);

    const frontWheel = this.createWheel(0.42, 0.18, rubberMat, redAlloyMat);
    forkGroup.add(frontWheel);
    this.wheels.push(frontWheel);

    for (let s of [-1, 1]) {
      const invertedFork = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 8), goldForkMat);
      invertedFork.position.set(s * 0.16, 0.42, -0.1);
      invertedFork.rotation.x = -0.28;
      forkGroup.add(invertedFork);
    }

    // Regard LED agressif double optique
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.15), lampMat);
    headlight.position.set(0, 0.78, 0.05);
    forkGroup.add(headlight);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.04), carbonMat);
    handle.position.set(0, 0.88, -0.16);
    forkGroup.add(handle);

    this.frontFork = forkGroup;
    this.bikeModelGroup.add(forkGroup);
  }

  buildRavageur(bodyMat, chromeMat, rubberMat, leatherMat, lampMat) {
    // 1. Roues à crampons tout-terrain géantes (Enduro / Rallye Raid)
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.8, roughness: 0.3 });
    const knobbyMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    const rearWheel = this.createWheel(0.48, 0.26, knobbyMat, steelMat);
    rearWheel.position.set(0, 0.48, -0.78);
    this.bikeModelGroup.add(rearWheel);
    this.wheels.push(rearWheel);

    // 2. Châssis rehaussé avec sabot moteur blindé
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 1.2), bodyMat);
    frame.position.set(0, 0.65, -0.1);
    this.bikeModelGroup.add(frame);

    const skidPlate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.7), steelMat);
    skidPlate.position.set(0, 0.42, 0.0);
    this.bikeModelGroup.add(skidPlate);

    // 3. Pare-buffles / Arceaux de protection tubulaires cage
    for (let s of [-1, 1]) {
      const cage = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.5), steelMat);
      cage.position.set(s * 0.28, 0.7, 0.1);
      this.bikeModelGroup.add(cage);
    }

    // 4. Échappement rallye haut passant sous la selle
    const rallyExhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.8, 8), steelMat);
    rallyExhaust.position.set(0.24, 0.85, -0.45);
    rallyExhaust.rotation.x = Math.PI / 2.3;
    this.bikeModelGroup.add(rallyExhaust);

    // Selle longue rallye étroite
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.75), leatherMat);
    seat.position.set(0, 0.88, -0.3);
    this.bikeModelGroup.add(seat);

    // 5. Train avant rehaussé grand débattement avec soufflets de fourche
    const forkGroup = new THREE.Group();
    forkGroup.position.set(0, 0.48, 0.82);

    const frontWheel = this.createWheel(0.48, 0.18, knobbyMat, steelMat);
    forkGroup.add(frontWheel);
    this.wheels.push(frontWheel);

    for (let s of [-1, 1]) {
      const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8), steelMat);
      fork.position.set(s * 0.16, 0.52, -0.12);
      fork.rotation.x = -0.32;
      forkGroup.add(fork);
    }

    // Double phare rond protégé par une grille
    for (let s of [-1, 1]) {
      const rallyLamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), lampMat);
      rallyLamp.position.set(s * 0.12, 0.98, 0.05);
      forkGroup.add(rallyLamp);
    }

    // Guidon large tout-terrain avec protège-mains
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.05, 0.05), steelMat);
    handle.position.set(0, 1.15, -0.22);
    forkGroup.add(handle);

    for (let s of [-1, 1]) {
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), bodyMat);
      guard.position.set(s * 0.44, 1.15, -0.18);
      forkGroup.add(guard);
    }

    this.frontFork = forkGroup;
    this.bikeModelGroup.add(forkGroup);
  }

  buildRider() {
    // Nettoyer
    while (this.riderGroup.children.length > 0) {
      this.riderGroup.remove(this.riderGroup.children[0]);
    }

    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffccaa });
    const jacketMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1a252f });
    const shoesMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const beretMat = new THREE.MeshLambertMaterial({ color: 0x9b111e }); // Rouge béret français

    // Bassin & Torse
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.9, -0.25);

    const torsoGeo = new THREE.BoxGeometry(0.38, 0.45, 0.24);
    const torso = new THREE.Mesh(torsoGeo, jacketMat);
    torso.position.set(0, 0.22, 0);
    torso.castShadow = true;
    torsoGroup.add(torso);

    // Écharpe rouge qui flotte
    const scarfGeo = new THREE.BoxGeometry(0.3, 0.1, 0.28);
    const scarf = new THREE.Mesh(scarfGeo, beretMat);
    scarf.position.set(0, 0.44, 0);
    torsoGroup.add(scarf);

    // Tête cartoon
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.65, 0.05);

    const headGeo = new THREE.SphereGeometry(0.18, 12, 10);
    const head = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(head);

    // Lunettes de soleil d'aviateur rétro
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const glassL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.03), glassMat);
    glassL.position.set(-0.07, 0.03, 0.16);
    const glassR = glassL.clone();
    glassR.position.set(0.07, 0.03, 0.16);
    headGroup.add(glassL);
    headGroup.add(glassR);

    // Béret français avec houppette
    const beretGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.08, 12);
    const beret = new THREE.Mesh(beretGeo, beretMat);
    beret.position.set(0, 0.15, -0.02);
    beret.rotation.z = -0.15; // Légèrement penché avec style
    headGroup.add(beret);

    const pompomGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const pompom = new THREE.Mesh(pompomGeo, beretMat);
    pompom.position.set(-0.03, 0.2, -0.02);
    headGroup.add(pompom);

    torsoGroup.add(headGroup);
    this.riderHead = headGroup;
    this.riderTorso = torsoGroup;

    // Bras gauche et droit tenant le guidon
    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8);

    const armL = new THREE.Mesh(armGeo, jacketMat);
    armL.position.set(-0.25, 0.2, 0.2);
    armL.rotation.x = Math.PI / 3.2;
    armL.rotation.z = -0.25;
    torsoGroup.add(armL);
    this.riderArmL = armL;

    const armR = new THREE.Mesh(armGeo, jacketMat);
    armR.position.set(0.25, 0.2, 0.2);
    armR.rotation.x = Math.PI / 3.2;
    armR.rotation.z = 0.25;
    torsoGroup.add(armR);
    this.riderArmR = armR;

    // Jambes repliées vers les cale-pieds
    const legGeo = new THREE.BoxGeometry(0.12, 0.4, 0.14);
    const legL = new THREE.Mesh(legGeo, pantsMat);
    legL.position.set(-0.18, 0.55, -0.05);
    legL.rotation.x = -0.5;
    this.riderGroup.add(legL);

    const legR = legL.clone();
    legR.position.set(0.18, 0.55, -0.05);
    this.riderGroup.add(legR);

    // Chaussures
    const shoeGeo = new THREE.BoxGeometry(0.12, 0.1, 0.2);
    const shoeL = new THREE.Mesh(shoeGeo, shoesMat);
    shoeL.position.set(-0.18, 0.38, 0.1);
    this.riderGroup.add(shoeL);

    const shoeR = shoeL.clone();
    shoeR.position.set(0.18, 0.38, 0.1);
    this.riderGroup.add(shoeR);

    this.riderGroup.add(torsoGroup);
  }

  triggerCrash() {
    if (this.isCrashed || this.invulnerableTimer > 0) return false;
    this.isCrashed = true;
    this.crashTimer = 0;
    return true;
  }

  update(delta, steerInput, speed) {
    // Gestion de l'invulnérabilité clignotante après relèvement
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      const flash = Math.floor(this.invulnerableTimer * 12) % 2 === 0;
      this.mesh.visible = flash;
      if (this.invulnerableTimer <= 0) {
        this.mesh.visible = true;
      }
    }

    // Gestion de l'accident comique et relèvement
    if (this.isCrashed) {
      this.crashTimer += delta;
      const progress = this.crashTimer / this.crashDuration;

      if (progress < 0.35) {
        // Phase 1 : Chute cartoon sur le flanc
        this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, 1.45, delta * 12);
        this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, 0.1, delta * 8);
        if (this.riderTorso) {
          this.riderTorso.rotation.x = -0.8;
          this.riderTorso.rotation.z = -0.6;
        }
      } else if (progress < 0.7) {
        // Phase 2 : Le pilote s'assied et secoue la tête comiquement ("étourdi")
        this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, 1.2, delta * 6);
        if (this.riderHead) {
          this.riderHead.rotation.y = Math.sin(this.crashTimer * 20) * 0.7; // Secoue la tête de gauche à droite
          this.riderHead.rotation.z = Math.cos(this.crashTimer * 15) * 0.3;
        }
        if (this.riderTorso) {
          this.riderTorso.rotation.x = 0.5;
        }
      } else if (progress < 1.0) {
        // Phase 3 : Le pilote se redresse d'un bond élastique, moto redressée !
        const spring = Math.sin((progress - 0.7) / 0.3 * Math.PI);
        this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, 0, delta * 14);
        this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, spring * 0.4, delta * 10);
        if (this.riderTorso) {
          this.riderTorso.rotation.x = THREE.MathUtils.lerp(this.riderTorso.rotation.x, 0.25, delta * 12);
          this.riderTorso.rotation.z = THREE.MathUtils.lerp(this.riderTorso.rotation.z, 0, delta * 12);
        }
        if (this.riderHead) {
          this.riderHead.rotation.y = THREE.MathUtils.lerp(this.riderHead.rotation.y, 0, delta * 12);
        }
      } else {
        // Relèvement terminé ! On repart
        this.isCrashed = false;
        this.crashTimer = 0;
        this.mesh.rotation.z = 0;
        this.mesh.position.y = 0;
        this.invulnerableTimer = 2.0; // 2 secondes d'immunité clignotante
        if (this.riderHead) this.riderHead.rotation.set(0, 0, 0);
      }
      return;
    }

    // --- CONTRÔLE NORMAL DIRECTIONNEL PROGRESSIF & AMORTI ---
    // Filtrage doux pour éliminer les à-coups et secousses brutales
    this.smoothedSteer += (steerInput - this.smoothedSteer) * Math.min(1.0, delta * 7.5);

    // Vitesse latérale modérée et agréable (8.2 m/s max avec amorti fluide)
    const ROAD_WIDTH = 4.2;
    this.x -= this.smoothedSteer * 8.2 * delta;
    this.x = Math.max(-ROAD_WIDTH, Math.min(ROAD_WIDTH, this.x));

    // Inclinaison douce du bolide (angle réaliste et progressif d'environ 18°)
    this.targetLean = this.smoothedSteer * 0.32;
    this.currentLean += (this.targetLean - this.currentLean) * Math.min(1.0, delta * 6.5);

    // Positionnement et rotation de la moto
    this.mesh.position.x = this.x;
    this.mesh.rotation.z = 0;

    // Légère suspension / rebond vivant sur la route
    this.bouncePhase += delta * (speed * 0.8 + 2.0);
    const suspensionBounce = Math.sin(this.bouncePhase) * 0.02;
    this.mesh.position.y = suspensionBounce;

    // Inclinaison du châssis
    this.bikeModelGroup.rotation.z = this.currentLean;

    // Orientation de la fourche avant
    if (this.frontFork) {
      this.frontFork.rotation.y = this.smoothedSteer * 0.25;
    }

    // Animation du pilote (le pilote compense avec souplesse l'angle de la moto)
    if (this.riderTorso) {
      this.riderTorso.rotation.z = this.currentLean * 0.75;
      this.riderTorso.rotation.x = 0.25 + Math.sin(this.bouncePhase * 2) * 0.03;
    }
    if (this.riderHead) {
      this.riderHead.rotation.y = this.smoothedSteer * 0.28;
      this.riderHead.rotation.z = -this.currentLean * 0.4;
    }

    // Rotation des roues selon la vitesse
    const wheelAngularSpeed = (speed / 0.35) * delta;
    this.wheels.forEach(w => {
      w.rotation.x += wheelAngularSpeed;
    });
  }

  getExhaustPosition() {
    const pos = new THREE.Vector3();
    pos.set(this.mesh.position.x + 0.2, this.mesh.position.y + 0.3, this.mesh.position.z - 0.7);
    return pos;
  }
}

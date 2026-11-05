/**
 * Motormageddon - Modélisation 3D et Physique Arcade de la Moto et du Pilote
 * Comprend 4 modèles de motos détaillées, le pilote cartoon articulé, et la dynamique de conduite.
 */

import * as THREE from 'three';
import { storage } from '../core/Storage.js';
import { gameState } from '../core/GameState.js';
import { soundManager } from '../audio/SoundManager.js';
import { textureFactory } from '../gfx/TextureFactory.js';

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
    this.runnerLegL = null;
    this.runnerLegR = null;

    // Propriétés de pilotage
    this.x = 0;
    this.z = 0;
    this.targetX = 0;
    this.smoothedSteer = 0;
    this.currentLean = 0;
    this.targetLean = 0;
    this.bouncePhase = 0;
    this.currentBikeId = 'scooter';
    this.lastWhipSnap = 0;

    // État de crash et relèvement comique
    this.isCrashed = false;
    this.crashTimer = 0;
    this.crashDuration = 1.8;
    this.invulnerableTimer = 0;

    // Disque d'ombre de contact douce au sol sous le bolide (ancre le véhicule au sol)
    const shadowTex = textureFactory.getContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });
    this.contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.4), shadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.025;
    this.mesh.add(this.contactShadow);

    // Flammes Nitro (propulseurs NOS bleus éclatants)
    this.nitroFlames = new THREE.Group();
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3, transparent: true, opacity: 0.9 });
    const flameCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });

    const createFlameJet = (xOffset) => {
      const jet = new THREE.Group();
      jet.position.set(xOffset, 0.45, -1.2);

      const outerCone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 8), flameMat);
      outerCone.rotation.x = -Math.PI / 2;
      outerCone.position.z = -0.45;

      const innerCone = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.6, 6), flameCoreMat);
      innerCone.rotation.x = -Math.PI / 2;
      innerCone.position.z = -0.3;

      jet.add(outerCone);
      jet.add(innerCone);
      return jet;
    };

    this.flameL = createFlameJet(-0.28);
    this.flameR = createFlameJet(0.28);
    this.nitroFlames.add(this.flameL, this.flameR);
    this.nitroFlames.visible = false;
    this.mesh.add(this.nitroFlames);

    // Pool de balles traçantes 3D à grande vitesse (Kalachnikov AK-47 & Tir)
    this.bulletPool = [];
    this.bulletGroup = new THREE.Group();
    this.scene.add(this.bulletGroup);
    const bulletGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
    for (let b = 0; b < 16; b++) {
      const bullet = new THREE.Mesh(bulletGeo, bulletMat);
      bullet.rotation.x = Math.PI / 2;
      bullet.visible = false;
      bullet.userData = { active: false, speedZ: 175 };
      this.bulletPool.push(bullet);
      this.bulletGroup.add(bullet);
    }

    // Arc de balayage tranchant de la hache (Swoosh Trail rougeoyant)
    const slashGeo = new THREE.RingGeometry(1.0, 2.2, 16, 1, 0, Math.PI * 0.7);
    const slashMat = new THREE.MeshBasicMaterial({
      color: 0xff3838,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.axeSlashTrail = new THREE.Mesh(slashGeo, slashMat);
    this.axeSlashTrail.rotation.x = -Math.PI / 2;
    this.axeSlashTrail.position.set(0.2, 0.6, 0.8);
    this.mesh.add(this.axeSlashTrail);

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
    this.horseGroup = null;
    this.frontRoller = null;
    this.carSteeringWheel = null;

    const bikeId = previewBikeId || storage.getEquippedBike() || 'scooter';
    this.currentBikeId = bikeId;
    const bodyColorHex = storage.getBikeColor(bikeId);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: bodyColorHex,
      roughness: 0.18,
      metalness: 0.82
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f6fa,
      metalness: 0.96,
      roughness: 0.08
    });

    const rubberMaterial = new THREE.MeshStandardMaterial({
      color: 0x181818,
      roughness: 0.85,
      metalness: 0.1
    });

    const leatherMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a2810,
      roughness: 0.65,
      metalness: 0.05
    });

    const lampMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff9c4,
      emissive: 0xfffa65,
      emissiveIntensity: 0.85,
      roughness: 0.1
    });

    if (bikeId === 'scooter') {
      this.buildScooter(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else if (bikeId === 'chopper') {
      this.buildChopper(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else if (bikeId === 'decapotable') {
      this.buildDecapotable(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else if (bikeId === 'trottinette_hache') {
      this.buildTrottinetteHache(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else if (bikeId === 'cheval') {
      this.buildCheval(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else if (bikeId === 'run_ak47') {
      this.buildRunner('ak47', bodyMaterial, chromeMaterial);
    } else if (bikeId === 'run_chainsaw') {
      this.buildRunner('chainsaw', bodyMaterial, chromeMaterial);
    } else if (bikeId === 'rouleau') {
      this.buildRouleau(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else if (bikeId === 'dragster') {
      this.buildDragster(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else if (bikeId === 'tank') {
      this.buildTank(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else if (bikeId === 'aero_jet') {
      this.buildAeroJet(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    } else {
      // Fallback
      this.buildScooter(bodyMaterial, chromeMaterial, rubberMaterial, leatherMaterial, lampMaterial);
    }

    this.buildRider();
  }

  createWheel(radius, width, rubberMat, chromeMat) {
    const wheelGroup = new THREE.Group();

    // 1. Pneu sculpté avec profil arrondi et flanc épais
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
    const tire = new THREE.Mesh(tireGeo, rubberMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Épaulement arrondi du pneu
    const treadGeo = new THREE.TorusGeometry(radius * 0.94, width * 0.38, 8, 24);
    const treadL = new THREE.Mesh(treadGeo, rubberMat);
    treadL.rotation.y = Math.PI / 2;
    treadL.position.x = -width * 0.22;
    const treadR = treadL.clone();
    treadR.position.x = width * 0.22;
    wheelGroup.add(treadL, treadR);

    // 2. Jante aluminium / chrome à gorge profonde
    const rimGeo = new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, width * 1.02, 18);
    const rim = new THREE.Mesh(rimGeo, chromeMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    // Rebord de jante usiné
    const lipGeo = new THREE.TorusGeometry(radius * 0.68, width * 0.08, 6, 20);
    const lipL = new THREE.Mesh(lipGeo, chromeMat);
    lipL.rotation.y = Math.PI / 2;
    lipL.position.x = -width * 0.51;
    const lipR = lipL.clone();
    lipR.position.x = width * 0.51;
    wheelGroup.add(lipL, lipR);

    // 3. Disque de frein en acier perforé
    const discMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
    const discGeo = new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, width * 0.16, 16);
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.z = Math.PI / 2;
    disc.position.x = width * 0.32;
    wheelGroup.add(disc);

    // Étrier de frein rouge Brembo haute performance
    const caliperMat = new THREE.MeshToonMaterial({ color: 0xe74c3c });
    const caliper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.38, radius * 0.26, radius * 0.2), caliperMat);
    caliper.position.set(width * 0.32, radius * 0.35, 0);
    wheelGroup.add(caliper);

    // 4. Bâtons de jante sport en étoile à 5 branches doubles
    for (let s = 0; s < 5; s++) {
      const ang = (s / 5) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(width * 0.95, radius * 0.64, 0.035), chromeMat);
      spoke.position.set(0, Math.cos(ang) * (radius * 0.32), Math.sin(ang) * (radius * 0.32));
      spoke.rotation.x = -ang;
      wheelGroup.add(spoke);
    }

    // 5. Moyeu central chromé
    const hubNut = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.14, radius * 0.14, width * 1.15, 8), chromeMat);
    hubNut.rotation.z = Math.PI / 2;
    wheelGroup.add(hubNut);

    return wheelGroup;
  }

  buildScooter(bodyMat, chromeMat, rubberMat, leatherMat, lampMat) {
    // Roue arrière sport
    const rearWheel = this.createWheel(0.32, 0.18, rubberMat, chromeMat);
    rearWheel.position.set(0, 0.32, -0.65);
    this.bikeModelGroup.add(rearWheel);
    this.wheels.push(rearWheel);

    // Carrosserie galbée arrière avec ailes galbées Vespa
    const rearBodyGeo = new THREE.BoxGeometry(0.55, 0.45, 0.85);
    const rearBody = new THREE.Mesh(rearBodyGeo, bodyMat);
    rearBody.position.set(0, 0.55, -0.45);
    rearBody.castShadow = true;
    this.bikeModelGroup.add(rearBody);

    // Ailes arrière galbées arrondies
    for (let s of [-1, 1]) {
      const cowlGeo = new THREE.SphereGeometry(0.24, 10, 8);
      cowlGeo.scale(0.5, 0.9, 1.6);
      const cowl = new THREE.Mesh(cowlGeo, bodyMat);
      cowl.position.set(s * 0.28, 0.52, -0.45);
      this.bikeModelGroup.add(cowl);

      // Baguette chromée latérale sur chaque aile
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.7), chromeMat);
      stripe.position.set(s * 0.34, 0.52, -0.45);
      this.bikeModelGroup.add(stripe);
    }

    // Feu arrière rouge rubis rétro
    const rubyMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c });
    const tailLamp = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), rubyMat);
    tailLamp.position.set(0, 0.65, -0.88);
    this.bikeModelGroup.add(tailLamp);

    // Porte-bagages chromé arrière avec malle en cuir rétro
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.28), chromeMat);
    rack.position.set(0, 0.82, -0.82);
    this.bikeModelGroup.add(rack);

    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.22), leatherMat);
    trunk.position.set(0, 0.94, -0.82);
    this.bikeModelGroup.add(trunk);

    // Boucles dorées de la malle
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
    for (let s of [-0.1, 0.1]) {
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.02), goldMat);
      buckle.position.set(s, 0.94, -0.7);
      this.bikeModelGroup.add(buckle);
    }

    // Selle en cuir biplace rétro avec surpiqûres
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

    // Baguette et insigne central de tablier
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.04), chromeMat);
    crest.position.set(0, 0.72, 0.42);
    crest.rotation.x = -0.15;
    this.bikeModelGroup.add(crest);

    // Plancher cale-pieds avec lattes antidérapantes
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

    // Guidon caréné
    const handleGeo = new THREE.BoxGeometry(0.7, 0.05, 0.05);
    const handle = new THREE.Mesh(handleGeo, chromeMat);
    handle.position.set(0, 0.85, -0.05);
    forkGroup.add(handle);

    // Poignées ergonomiques
    const gripGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8);
    const gripL = new THREE.Mesh(gripGeo, rubberMat);
    gripL.rotation.z = Math.PI / 2;
    gripL.position.set(-0.35, 0.85, -0.05);
    const gripR = gripL.clone();
    gripR.position.set(0.35, 0.85, -0.05);
    forkGroup.add(gripL, gripR);

    // Phare rond avant avec bague chromée
    const lampBezel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 16), chromeMat);
    lampBezel.position.set(0, 0.88, 0.07);
    forkGroup.add(lampBezel);

    const lampGeo = new THREE.SphereGeometry(0.11, 12, 8);
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(0, 0.88, 0.05);
    forkGroup.add(lamp);

    // Rétroviseurs chromés arrondis
    const mirrorGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.02, 12);
    const mirrorL = new THREE.Mesh(mirrorGeo, chromeMat);
    mirrorL.rotation.x = Math.PI / 2;
    mirrorL.position.set(-0.32, 1.02, -0.05);
    forkGroup.add(mirrorL);

    const mirrorR = mirrorL.clone();
    mirrorR.position.set(0.32, 1.02, -0.05);
    forkGroup.add(mirrorR);

    this.frontFork = forkGroup;
    this.bikeModelGroup.add(forkGroup);

    // Échappement chromé avec silencieux conique
    const exhaustGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.55, 8);
    const exhaust = new THREE.Mesh(exhaustGeo, chromeMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0.26, 0.28, -0.6);
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

  // --- MONTURE PUR-SANG : ÉTALON DU GRAND TOUR AVEC FOUET ---
  buildCheval(bodyMat, chromeMat, rubberMat, leatherMat, lampMat) {
    this.horseGroup = new THREE.Group();
    this.horseLegs = [];

    // Matériau de robe du cheval (auburn / alezan / bai ou couleur custom)
    const coatMat = bodyMat;
    const darkHorseMat = new THREE.MeshToonMaterial({ color: 0x2d1810 }); // Crinière, queue et sabots
    const hoofMat = new THREE.MeshToonMaterial({ color: 0x111111 });

    // 1. Corps / Flanc du cheval (tonneau galbé)
    const bodyGeo = new THREE.CylinderGeometry(0.38, 0.44, 1.45, 12);
    const body = new THREE.Mesh(bodyGeo, coatMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0.88, 0.05);
    body.castShadow = true;
    this.horseGroup.add(body);

    // Croupe arrondie à l'arrière
    const rump = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), coatMat);
    rump.position.set(0, 0.9, -0.65);
    this.horseGroup.add(rump);

    // Poitrail musclé à l'avant
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.43, 10, 10), coatMat);
    chest.position.set(0, 0.92, 0.7);
    this.horseGroup.add(chest);

    // 2. Encolure relevée et fière
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.75, 10), coatMat);
    neck.position.set(0, 1.35, 0.85);
    neck.rotation.x = -Math.PI / 4.5;
    this.horseGroup.add(neck);

    // Crinière noire flottante
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.18), darkHorseMat);
    mane.position.set(0, 1.42, 0.74);
    mane.rotation.x = -Math.PI / 4.5;
    this.horseGroup.add(mane);

    // 3. Tête sculptée avec chanfrein et oreilles dressées
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.62, 1.15);

    const headUpper = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.4), coatMat);
    headGroup.add(headUpper);

    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.3), darkHorseMat);
    muzzle.position.set(0, -0.06, 0.26);
    headGroup.add(muzzle);

    // Oreilles dressées
    const earGeo = new THREE.ConeGeometry(0.06, 0.16, 4);
    const earL = new THREE.Mesh(earGeo, coatMat);
    earL.position.set(-0.1, 0.22, -0.08);
    const earR = earL.clone();
    earR.position.set(0.1, 0.22, -0.08);
    headGroup.add(earL, earR);

    // Yeux cartoon
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat);
    eyeL.position.set(-0.14, 0.08, 0.06);
    const eyeR = eyeL.clone();
    eyeR.position.set(0.14, 0.08, 0.06);
    headGroup.add(eyeL, eyeR);

    this.horseGroup.add(headGroup);

    // 4. Queue fluide à l'arrière
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.95, -0.95);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.75, 8), darkHorseMat);
    tailMesh.position.set(0, -0.32, -0.1);
    tailMesh.rotation.x = -0.3;
    tailGroup.add(tailMesh);
    this.horseGroup.add(tailGroup);
    this.horseTail = tailGroup;

    // 5. Selle en cuir & Étriers dorés
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.52), leatherMat);
    saddle.position.set(0, 1.25, -0.05);
    this.horseGroup.add(saddle);

    const stirrupMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const stirrupL = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 10), stirrupMat);
    stirrupL.position.set(-0.28, 0.78, -0.05);
    const stirrupR = stirrupL.clone();
    stirrupR.position.set(0.28, 0.78, -0.05);
    this.horseGroup.add(stirrupL, stirrupR);

    // 6. Les 4 Membres articulés pour le galop (Avant-G / Avant-D / Arrière-G / Arrière-D)
    const legGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.85, 8);
    const hoofGeo = new THREE.CylinderGeometry(0.08, 0.095, 0.14, 8);

    const createHorseLeg = (x, z) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(x, 0.82, z);

      const legMesh = new THREE.Mesh(legGeo, coatMat);
      legMesh.position.y = -0.42;
      legPivot.add(legMesh);

      const hoof = new THREE.Mesh(hoofGeo, hoofMat);
      hoof.position.y = -0.8;
      legPivot.add(hoof);

      this.horseGroup.add(legPivot);
      this.horseLegs.push(legPivot);
      return legPivot;
    };

    this.horseLegFL = createHorseLeg(-0.24, 0.52);
    this.horseLegFR = createHorseLeg(0.24, 0.52);
    this.horseLegBL = createHorseLeg(-0.24, -0.52);
    this.horseLegBR = createHorseLeg(0.24, -0.52);

    this.bikeModelGroup.add(this.horseGroup);
  }

  // --- ROULEAU COMPRESSEUR INDUSTRIEL 50 TONNES ---
  buildRouleau(bodyMat, chromeMat, rubberMat, leatherMat, lampMat) {
    const rollerGroup = new THREE.Group();

    // 1. Rouleau avant broyeur cylindrique d'acier massif (50T)
    const drumMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, metalness: 0.9, roughness: 0.25 });
    const drumGeo = new THREE.CylinderGeometry(0.68, 0.68, 2.3, 24);
    const drum = new THREE.Mesh(drumGeo, drumMat);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 0.68, 1.25);
    drum.castShadow = true;
    rollerGroup.add(drum);
    this.frontRoller = drum;

    // Bras de fourche lourde du rouleau
    const frameMat = new THREE.MeshToonMaterial({ color: 0x1e272e });
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 1.4), frameMat);
    armL.position.set(-1.22, 0.68, 0.6);
    const armR = armL.clone();
    armR.position.set(1.22, 0.68, 0.6);
    rollerGroup.add(armL, armR);

    // 2. Châssis industriel lourd en acier peint
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 2.2), bodyMat);
    chassis.position.set(0, 0.85, -0.4);
    chassis.castShadow = true;
    rollerGroup.add(chassis);

    // Bandes de sécurité hachurées jaune/noir (Caution)
    const cautionMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.12), cautionMat);
    bumper.position.set(0, 0.45, -1.52);
    rollerGroup.add(bumper);

    // 3. Deux énormes roues arrière à crampons de chantier
    const rearWheelL = this.createWheel(0.65, 0.55, rubberMat, chromeMat);
    rearWheelL.position.set(-1.08, 0.65, -0.85);
    const rearWheelR = this.createWheel(0.65, 0.55, rubberMat, chromeMat);
    rearWheelR.position.set(1.08, 0.65, -0.85);
    rollerGroup.add(rearWheelL, rearWheelR);

    // 4. Cabine de conduite avec arceau de sécurité ROPS & toit
    const pillarMat = new THREE.MeshToonMaterial({ color: 0x111111 });
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), pillarMat);
    p1.position.set(-0.7, 1.7, -0.1);
    const p2 = p1.clone();
    p2.position.set(0.7, 1.7, -0.1);
    const p3 = p1.clone();
    p3.position.set(-0.7, 1.7, -0.9);
    const p4 = p1.clone();
    p4.position.set(0.7, 1.7, -0.9);
    rollerGroup.add(p1, p2, p3, p4);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.2), bodyMat);
    roof.position.set(0, 2.3, -0.5);
    rollerGroup.add(roof);

    // Gyrophare orange clignotant au sommet
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 8), new THREE.MeshBasicMaterial({ color: 0xffa502 }));
    beacon.position.set(0, 2.42, -0.5);
    rollerGroup.add(beacon);

    // Cheminée d'échappement diesel verticale
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8), chromeMat);
    exhaust.position.set(-0.75, 1.6, 0.45);
    rollerGroup.add(exhaust);

    this.bikeModelGroup.add(rollerGroup);
  }

  // --- VOITURE DÉCAPOTABLE SPORT ROUGE RÉTRO ---
  buildDecapotable(bodyMat, chromeMat, rubberMat, leatherMat, lampMat) {
    const carGroup = new THREE.Group();

    // 1. Quatre roues sport indépendantes
    const frontL = this.createWheel(0.38, 0.22, rubberMat, chromeMat);
    frontL.position.set(-0.82, 0.38, 0.95);
    const frontR = this.createWheel(0.38, 0.22, rubberMat, chromeMat);
    frontR.position.set(0.82, 0.38, 0.95);
    const rearL = this.createWheel(0.40, 0.26, rubberMat, chromeMat);
    rearL.position.set(-0.84, 0.40, -0.95);
    const rearR = this.createWheel(0.40, 0.26, rubberMat, chromeMat);
    rearR.position.set(0.84, 0.40, -0.95);
    carGroup.add(frontL, frontR, rearL, rearR);
    this.wheels.push(frontL, frontR, rearL, rearR);

    // 2. Châssis / Carrosserie profilée décapotable
    const bodyBase = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.42, 2.7), bodyMat);
    bodyBase.position.set(0, 0.52, 0);
    bodyBase.castShadow = true;
    carGroup.add(bodyBase);

    // Capot avant incliné
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.25, 1.15), bodyMat);
    hood.position.set(0, 0.68, 0.72);
    hood.rotation.x = -0.08;
    carGroup.add(hood);

    // Calandre chromée rétro
    const grill = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.28, 0.08), chromeMat);
    grill.position.set(0, 0.52, 1.36);
    carGroup.add(grill);

    // Pare-chocs avant chromé avec butoirs
    const bumperF = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.12, 0.1), chromeMat);
    bumperF.position.set(0, 0.38, 1.4);
    carGroup.add(bumperF);

    // Phares ronds vintage
    const hlL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), lampMat);
    hlL.rotation.x = Math.PI / 2;
    hlL.position.set(-0.58, 0.64, 1.35);
    const hlR = hlL.clone();
    hlR.position.set(0.58, 0.64, 1.35);
    carGroup.add(hlL, hlR);

    // Pare-brise panoramique incliné
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x81ecec, transparent: true, opacity: 0.55 });
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.38, 0.04), glassMat);
    windshield.position.set(0, 0.95, 0.22);
    windshield.rotation.x = -0.38;
    carGroup.add(windshield);

    // Cadre chromé du pare-brise
    const wsFrame = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.04, 0.04), chromeMat);
    wsFrame.position.set(0, 1.12, 0.16);
    carGroup.add(wsFrame);

    // Cockpit & Sièges baquets cuir
    const seatL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.55), leatherMat);
    seatL.position.set(-0.35, 0.65, -0.32);
    const seatR = seatL.clone();
    seatR.position.set(0.35, 0.65, -0.32);
    carGroup.add(seatL, seatR);

    // Tableau de bord & Volant chromé sport
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 0.3), bodyMat);
    dash.position.set(0, 0.75, 0.1);
    carGroup.add(dash);

    // 3 Compteurs ronds chromés sur la planche de bord
    const gaugeDialMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let g of [-0.25, 0, 0.25]) {
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 10), chromeMat);
      bezel.rotation.x = Math.PI / 2.8;
      bezel.position.set(g, 0.85, 0.16);
      carGroup.add(bezel);
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.022, 10), gaugeDialMat);
      dial.rotation.x = Math.PI / 2.8;
      dial.position.set(g, 0.85, 0.165);
      carGroup.add(dial);
    }

    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(0, 0.88, 0.02);
    wheelGroup.rotation.x = -Math.PI / 4.2;
    const steerRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 14), chromeMat);
    wheelGroup.add(steerRim);

    // 3 Branches sportives du volant
    for (let s = 0; s < 3; s++) {
      const ang = (s / 3) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.015), chromeMat);
      spoke.position.set(Math.cos(ang) * 0.08, Math.sin(ang) * 0.08, 0);
      spoke.rotation.z = ang - Math.PI / 2;
      wheelGroup.add(spoke);
    }
    const hornCenter = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), leatherMat);
    wheelGroup.add(hornCenter);

    carGroup.add(wheelGroup);
    this.carSteeringWheel = wheelGroup;

    // Arrière profilé avec double échappement chromé
    const bumperR = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.12, 0.1), chromeMat);
    bumperR.position.set(0, 0.4, -1.38);
    carGroup.add(bumperR);

    // Feux arrière ogives chromées avec cabochon rouge rubis
    const rubyMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });
    for (let s of [-0.62, 0.62]) {
      const finLightHousing = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 8), chromeMat);
      finLightHousing.rotation.x = Math.PI / 2;
      finLightHousing.position.set(s, 0.65, -1.35);
      carGroup.add(finLightHousing);

      const finRuby = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), rubyMat);
      finRuby.position.set(s, 0.65, -1.45);
      carGroup.add(finRuby);
    }

    const exL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), chromeMat);
    exL.rotation.x = Math.PI / 2;
    exL.position.set(-0.35, 0.38, -1.45);
    const exR = exL.clone();
    exR.position.set(0.35, 0.38, -1.45);
    carGroup.add(exL, exR);

    this.bikeModelGroup.add(carGroup);
  }

  // --- TROTTINETTE AVEC DOUBLE HACHE DE GUERRE & NÉON UNDERGLOW ---
  buildTrottinetteHache(bodyMat, chromeMat, rubberMat, leatherMat, lampMat) {
    const scootGroup = new THREE.Group();

    // 1. Deck / Plateau fin en aluminium anodisé
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x222f3e, metalness: 0.7, roughness: 0.3 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 1.45), deckMat);
    deck.position.set(0, 0.24, -0.1);
    deck.castShadow = true;
    scootGroup.add(deck);

    // Néon sous châssis (Underglow cyan électrique futuriste)
    const underglowMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.85 });
    const underglow = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 1.35), underglowMat);
    underglow.position.set(0, 0.18, -0.1);
    scootGroup.add(underglow);

    // Grip de skateboard noir antidérapant
    const gripMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 1.2), gripMat);
    grip.position.set(0, 0.29, -0.1);
    scootGroup.add(grip);

    // 2. Petites roues vives avant et arrière
    const frontWheel = this.createWheel(0.18, 0.1, rubberMat, chromeMat);
    frontWheel.position.set(0, 0.18, 0.68);
    const rearWheel = this.createWheel(0.18, 0.1, rubberMat, chromeMat);
    rearWheel.position.set(0, 0.18, -0.78);
    scootGroup.add(frontWheel, rearWheel);
    this.wheels.push(frontWheel, rearWheel);

    // Garde-boue arrière avec frein au pied
    const fender = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.28), bodyMat);
    fender.position.set(0, 0.32, -0.76);
    scootGroup.add(fender);

    // 3. Colonne de direction télescopique & Guidon en T
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.15, 8), chromeMat);
    stem.position.set(0, 0.78, 0.62);
    stem.rotation.x = -0.14;
    scootGroup.add(stem);

    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 8), chromeMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.32, 0.54);
    scootGroup.add(bar);

    // Phare LED urbain
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), lampMat);
    led.position.set(0, 1.25, 0.62);
    scootGroup.add(led);

    this.bikeModelGroup.add(scootGroup);
  }

  // --- CHAR D'ASSAUT DE GUERRE AMX-TITAN & CANON 120MM ---
  buildTank(bodyMat, chromeMat, rubberMat, leatherMat, lampMat) {
    this.tankWheels = [];

    const camoMat = new THREE.MeshStandardMaterial({
      color: 0x3d4f36,
      roughness: 0.75,
      metalness: 0.35
    });
    const armorPlateMat = new THREE.MeshStandardMaterial({
      color: 0x2d3728,
      roughness: 0.8,
      metalness: 0.4
    });
    const treadMat = new THREE.MeshStandardMaterial({
      color: 0x1b1f23,
      roughness: 0.9,
      metalness: 0.65
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x222f3e,
      roughness: 0.5,
      metalness: 0.7
    });

    const tankGroup = new THREE.Group();

    // 1. CHÂSSIS INFÉRIEUR & BLINDAGE CENTRAL
    const hullGeo = new THREE.BoxGeometry(1.6, 0.48, 2.6);
    const hull = new THREE.Mesh(hullGeo, camoMat);
    hull.position.y = 0.42;
    hull.castShadow = true;
    hull.receiveShadow = true;
    tankGroup.add(hull);

    // Glacis avant incliné (blindage frontal)
    const glacisGeo = new THREE.BoxGeometry(1.58, 0.22, 0.8);
    const glacis = new THREE.Mesh(glacisGeo, armorPlateMat);
    glacis.position.set(0, 0.52, 1.35);
    glacis.rotation.x = 0.45;
    tankGroup.add(glacis);

    // 2. CHENILLES GAUCHE & DROITE AVEC GALETS ROTATIFS
    const createTrackSide = (side) => {
      const trackGroup = new THREE.Group();
      trackGroup.position.set(side * 0.95, 0.35, 0);

      // Bande de chenille en caoutchouc armé
      const beltGeo = new THREE.BoxGeometry(0.38, 0.5, 2.8);
      const belt = new THREE.Mesh(beltGeo, treadMat);
      trackGroup.add(belt);

      // Galets de roulement rotatifs (5 galets par côté)
      for (let i = -2; i <= 2; i++) {
        const wheel = this.createWheel(0.24, 0.28, rubberMat, rimMat);
        wheel.position.set(0, -0.06, i * 0.62);
        this.tankWheels.push(wheel);
        trackGroup.add(wheel);
      }

      // Barbotin avant et poulie de tension arrière
      const sprocketF = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 12), rimMat);
      sprocketF.rotation.z = Math.PI / 2;
      sprocketF.position.set(0, 0.12, 1.32);
      const sprocketR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 12), rimMat);
      sprocketR.rotation.z = Math.PI / 2;
      sprocketR.position.set(0, 0.12, -1.32);
      trackGroup.add(sprocketF, sprocketR);

      // Garde-boue blindé au-dessus de la chenille
      const fender = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 2.9), armorPlateMat);
      fender.position.set(0, 0.28, 0);
      trackGroup.add(fender);

      return trackGroup;
    };

    tankGroup.add(createTrackSide(-1));
    tankGroup.add(createTrackSide(1));

    // 3. TOURELLE BLINDÉE DU CHAR
    this.tankTurret = new THREE.Group();
    this.tankTurret.position.set(0, 0.72, -0.05);

    // Corps anguleux de la tourelle
    const turretGeo = new THREE.BoxGeometry(1.3, 0.44, 1.5);
    const turret = new THREE.Mesh(turretGeo, camoMat);
    turret.position.y = 0.22;
    turret.castShadow = true;
    this.tankTurret.add(turret);

    // Écoutille supérieure circulaire du commandant
    const hatchRing = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.12, 16), armorPlateMat);
    hatchRing.position.set(0, 0.46, -0.15);
    this.tankTurret.add(hatchRing);

    // Mitrailleuse coaxiale / de toit cal .50
    const mgGroup = new THREE.Group();
    mgGroup.position.set(0.38, 0.52, -0.05);
    const mgBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.35), rimMat);
    const mgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), chromeMat);
    mgBarrel.rotation.x = Math.PI / 2;
    mgBarrel.position.set(0, 0.02, 0.25);
    mgGroup.add(mgBody, mgBarrel);
    this.tankTurret.add(mgGroup);

    // 4. CANON 120MM PUISSANT AVEC FREIN DE BOUCHE
    this.tankBarrel = new THREE.Group();
    this.tankBarrel.position.set(0, 0.24, 0.75);

    // Masque de canon blindé (mantlet)
    const mantlet = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 0.3), armorPlateMat);
    this.tankBarrel.add(mantlet);

    // Tube du canon long 120mm
    const barrelGeo = new THREE.CylinderGeometry(0.075, 0.09, 1.9, 16);
    const barrel = new THREE.Mesh(barrelGeo, chromeMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, 0.95);
    barrel.castShadow = true;
    this.tankBarrel.add(barrel);

    // Frein de bouche percé au bout du canon
    const muzzleGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.32, 12);
    const muzzle = new THREE.Mesh(muzzleGeo, armorPlateMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0, 1.95);
    this.tankBarrel.add(muzzle);

    this.tankTurret.add(this.tankBarrel);
    tankGroup.add(this.tankTurret);

    // 5. PHARES TACTIQUES AVANT & POTS D'ÉCHAPPEMENT
    const lightL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.14), lampMat);
    lightL.position.set(-0.6, 0.56, 1.35);
    const lightR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.14), lampMat);
    lightR.position.set(0.6, 0.56, 1.35);
    tankGroup.add(lightL, lightR);

    // Échappements arrières
    const exhaustL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), rimMat);
    exhaustL.position.set(-0.55, 0.55, -1.35);
    const exhaustR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), rimMat);
    exhaustR.position.set(0.55, 0.55, -1.35);
    tankGroup.add(exhaustL, exhaustR);

    this.bikeModelGroup.add(tankGroup);
  }

  // --- ENGIN VOLANT D'ÉVASION : AÉRO-JET NUCLÉAIRE SUB-ORBITAL ---
  buildAeroJet(bodyMat, chromeMat, rubberMat, leatherMat, lampMat) {
    const jetGroup = new THREE.Group();

    // 1. Fuselage profilé aérodynamique en titane
    const fuselageGeo = new THREE.CylinderGeometry(0.28, 0.52, 2.8, 12);
    const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.set(0, 0.55, 0);
    fuselage.castShadow = true;
    jetGroup.add(fuselage);

    // Nez pointu supersonique avant
    const noseGeo = new THREE.ConeGeometry(0.28, 0.85, 12);
    const nose = new THREE.Mesh(noseGeo, chromeMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 0.55, 1.82);
    jetGroup.add(nose);

    // 2. Ailes Delta en flèche avec winglets verticaux
    const wingGeo = new THREE.BoxGeometry(2.8, 0.06, 1.4);
    const wings = new THREE.Mesh(wingGeo, bodyMat);
    wings.position.set(0, 0.52, -0.2);
    jetGroup.add(wings);

    // Ailerons verticaux / Winglets avec feux de navigation
    const navRedMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });
    const navGreenMat = new THREE.MeshBasicMaterial({ color: 0x2ed573 });

    const wlGeo = new THREE.BoxGeometry(0.06, 0.55, 0.45);
    const wingletL = new THREE.Mesh(wlGeo, chromeMat);
    wingletL.position.set(-1.38, 0.75, -0.4);
    const lightL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), navRedMat);
    lightL.position.set(-1.38, 1.02, -0.4);
    jetGroup.add(wingletL, lightL);

    const wingletR = new THREE.Mesh(wlGeo, chromeMat);
    wingletR.position.set(1.38, 0.75, -0.4);
    const lightR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), navGreenMat);
    lightR.position.set(1.38, 1.02, -0.4);
    jetGroup.add(wingletR, lightR);

    // 3. Verrière de cockpit panoramique étanche
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x81ecec,
      transparent: true,
      opacity: 0.65,
      metalness: 0.9,
      roughness: 0.1
    });
    const canopyGeo = new THREE.SphereGeometry(0.35, 14, 10);
    canopyGeo.scale(0.8, 0.7, 1.8);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.82, 0.35);
    jetGroup.add(canopy);

    // 4. Double Réacteur à Fusion Nucléaire avec flammes permanentes
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.9, roughness: 0.2 });
    const thrusterFlameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
    const thrusterCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let s of [-0.28, 0.28]) {
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.55, 12), nozzleMat);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(s, 0.55, -1.45);
      jetGroup.add(nozzle);

      // Flamme de post-combustion à fusion continue
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.85, 8), thrusterFlameMat);
      plume.rotation.x = -Math.PI / 2;
      plume.position.set(s, 0.55, -2.05);
      const plumeCore = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 6), thrusterCoreMat);
      plumeCore.rotation.x = -Math.PI / 2;
      plumeCore.position.set(s, 0.55, -1.9);
      jetGroup.add(plume, plumeCore);
    }

    // 5. Patins d'atterrissage aérodynamiques rétractables
    const skidMat = new THREE.MeshStandardMaterial({ color: 0x57606f, metalness: 0.8 });
    for (let s of [-0.65, 0.65]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 1.6), skidMat);
      skid.position.set(s, 0.15, -0.1);
      const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), skidMat);
      leg1.position.set(s, 0.32, 0.35);
      const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), skidMat);
      leg2.position.set(s, 0.32, -0.45);
      jetGroup.add(skid, leg1, leg2);
    }

    this.bikeModelGroup.add(jetGroup);
    this.jetGroup = jetGroup;
  }

  // --- SPRINTEUR À PIED (AVEC AK-47 OU TRONÇONNEUSE) ---
  buildRunner(weaponType, bodyMat, chromeMat) {
    this.runnerWeaponType = weaponType;
    // Aucun véhicule mécanique n'est ajouté au sol : le sprinteur est à pied
  }

  buildRider() {
    // Nettoyer
    while (this.riderGroup.children.length > 0) {
      this.riderGroup.remove(this.riderGroup.children[0]);
    }
    this.runnerLegL = null;
    this.runnerLegR = null;

    const isNuclear = gameState.selectedCity?.isNuclearMission || this.currentBikeId === 'aero_jet';
    const hazmatYellowMat = new THREE.MeshToonMaterial({ color: 0xffe600, roughness: 0.3 });
    const hazmatVisorMat = new THREE.MeshStandardMaterial({ color: 0x81ecec, transparent: true, opacity: 0.8, metalness: 0.9, roughness: 0.1 });
    const hazmatBlackMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffccaa });
    const jacketMat = isNuclear ? hazmatYellowMat : new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    const pantsMat = isNuclear ? hazmatYellowMat : new THREE.MeshLambertMaterial({ color: 0x1a252f });
    const shoesMat = isNuclear ? hazmatBlackMat : new THREE.MeshLambertMaterial({ color: 0x111111 });
    const beretMat = new THREE.MeshLambertMaterial({ color: 0x9b111e }); // Rouge béret français
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.2 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.85, roughness: 0.25 });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x5a2d0c });

    const isCar = this.currentBikeId === 'decapotable';
    const isTank = this.currentBikeId === 'tank';
    const isScoot = this.currentBikeId === 'trottinette_hache';
    const isRunner = this.currentBikeId === 'run_ak47' || this.currentBikeId === 'run_chainsaw';
    const isHorse = this.currentBikeId === 'cheval';
    const isJet = this.currentBikeId === 'aero_jet';

    // Bassin & Torse
    const torsoGroup = new THREE.Group();
    if (isCar) {
      torsoGroup.position.set(-0.35, 0.68, -0.28);
    } else if (isTank) {
      torsoGroup.position.set(0, 0.98, -0.2);
    } else if (isScoot) {
      torsoGroup.position.set(0, 0.85, -0.15);
    } else if (isRunner) {
      torsoGroup.position.set(0, 0.78, 0);
    } else if (isJet) {
      torsoGroup.position.set(0, 0.62, 0.12);
    } else {
      torsoGroup.position.set(0, 0.9, -0.25);
    }

    const torsoGeo = new THREE.BoxGeometry(0.38, 0.45, 0.24);
    const torso = new THREE.Mesh(torsoGeo, jacketMat);
    torso.position.set(0, 0.22, 0);
    torso.castShadow = true;
    torsoGroup.add(torso);

    if (isNuclear) {
      // --- ÉQUIPEMENT SPÉCIAL COMBINAISON NBC ANTIRADIATION ---
      // Double bouteille d'oxygène / décontamination dans le dos
      const tankL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.44, 8), hazmatYellowMat);
      tankL.position.set(-0.11, 0.22, -0.18);
      const tankR = tankL.clone();
      tankR.position.x = 0.11;
      torsoGroup.add(tankL, tankR);

      // Manomètre et régulateur de pression
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.85, roughness: 0.2 });
      const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 8), chromeMat);
      gauge.rotation.x = Math.PI / 2;
      gauge.position.set(0.11, 0.42, -0.14);
      torsoGroup.add(gauge);

      // Harnais de poitrine noir avec insigne de radiation ☢️
      const harness = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.04), hazmatBlackMat);
      harness.position.set(0, 0.26, 0.13);
      torsoGroup.add(harness);
    } else {
      // Écharpe rouge qui flotte avec pan arrière animé au vent
      const scarfGeo = new THREE.BoxGeometry(0.3, 0.1, 0.28);
      const scarf = new THREE.Mesh(scarfGeo, beretMat);
      scarf.position.set(0, 0.44, 0);
      torsoGroup.add(scarf);

      const scarfTailGeo = new THREE.BoxGeometry(0.12, 0.05, 0.38);
      const scarfTail = new THREE.Mesh(scarfTailGeo, beretMat);
      scarfTail.position.set(0.08, 0.42, -0.24);
      scarfTail.rotation.x = -0.35;
      torsoGroup.add(scarfTail);
      this.scarfTail = scarfTail;
    }

    // Tête cartoon
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.65, 0.05);

    const headGeo = new THREE.SphereGeometry(0.18, 12, 10);
    const head = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(head);

    if (isNuclear) {
      // Casque hermétique intégral NBC jaune vif
      const helmetGeo = new THREE.SphereGeometry(0.22, 14, 12);
      const helmet = new THREE.Mesh(helmetGeo, hazmatYellowMat);
      helmet.position.set(0, 0.02, 0);
      headGroup.add(helmet);

      // Visière panoramique étanche dorée/cyan
      const visorGeo = new THREE.SphereGeometry(0.19, 12, 10, 0, Math.PI, 0, Math.PI / 2);
      const visor = new THREE.Mesh(visorGeo, hazmatVisorMat);
      visor.rotation.x = -Math.PI / 2;
      visor.position.set(0, 0.02, 0.05);
      headGroup.add(visor);

      // Cartouches de masque à gaz à double filtre respiratoire
      for (let s of [-0.14, 0.14]) {
        const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 8), hazmatBlackMat);
        canister.rotation.z = Math.PI / 2;
        canister.position.set(s, -0.06, 0.14);
        headGroup.add(canister);
      }
    } else if (isTank) {
      // Casque de combat blindé vert armée avec casque audio et lunettes tactiques
      const tankHelmetMat = new THREE.MeshStandardMaterial({ color: 0x2d3728, roughness: 0.7, metalness: 0.4 });
      const helmetGeo = new THREE.SphereGeometry(0.22, 14, 12);
      const helmet = new THREE.Mesh(helmetGeo, tankHelmetMat);
      helmet.position.set(0, 0.04, 0);
      headGroup.add(helmet);

      // Casque audio de communication radio
      const commMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
      const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8), commMat);
      earL.rotation.z = Math.PI / 2;
      earL.position.set(-0.19, 0.02, 0);
      const earR = earL.clone();
      earR.position.set(0.19, 0.02, 0);
      headGroup.add(earL, earR);

      // Lunettes de protection tactiques
      const goggleMat = new THREE.MeshBasicMaterial({ color: 0x1e272e });
      const goggleL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.03), goggleMat);
      goggleL.position.set(-0.07, 0.04, 0.17);
      const goggleR = goggleL.clone();
      goggleR.position.set(0.07, 0.04, 0.17);
      headGroup.add(goggleL, goggleR);
    } else {
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
      beret.rotation.z = -0.15;
      headGroup.add(beret);

      const pompomGeo = new THREE.SphereGeometry(0.03, 6, 6);
      const pompom = new THREE.Mesh(pompomGeo, beretMat);
      pompom.position.set(-0.03, 0.2, -0.02);
      headGroup.add(pompom);
    }

    torsoGroup.add(headGroup);
    this.riderHead = headGroup;
    this.riderTorso = torsoGroup;

    // Bras gauche et droit
    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8);
    const armL = new THREE.Mesh(armGeo, jacketMat);
    const armR = new THREE.Mesh(armGeo, jacketMat);
    this.riderWhip = null;

    if (isJet) {
      // Bras tenant le joystick de vol et les commandes du vaisseau d'évasion
      armL.position.set(-0.24, 0.16, 0.24);
      armL.rotation.x = Math.PI / 2.5;
      armL.rotation.z = 0.15;
      armR.position.set(0.24, 0.16, 0.24);
      armR.rotation.x = Math.PI / 2.5;
      armR.rotation.z = -0.15;
      torsoGroup.add(armL, armR);
    } else if (isTank) {
      // Commandant de char tenant le rebord de l'écoutille et la mitrailleuse de toit
      armL.position.set(-0.24, 0.18, 0.22);
      armL.rotation.x = Math.PI / 2.6;
      armL.rotation.z = -0.15;
      armR.position.set(0.24, 0.18, 0.22);
      armR.rotation.x = Math.PI / 2.6;
      armR.rotation.z = 0.15;
      torsoGroup.add(armL, armR);
    } else if (isHorse) {
      // Bras gauche tient les rênes
      armL.position.set(-0.25, 0.2, 0.2);
      armL.rotation.x = Math.PI / 3.2;
      armL.rotation.z = -0.25;
      torsoGroup.add(armL);

      // Bras droit brandit haut le FOUET de maître
      armR.position.set(0.3, 0.32, 0.05);
      armR.rotation.x = -Math.PI / 3.2;
      armR.rotation.z = Math.PI / 4.5;
      torsoGroup.add(armR);

      // --- GRAND FOUET DE MAÎTRE (CUIR TRESSÉ, VIROLE D'OR & MÈCHE ÉCARLATE) ---
      const whipGroup = new THREE.Group();
      whipGroup.position.set(0.42, 0.48, 0.08);
      whipGroup.rotation.x = -Math.PI / 4;
      whipGroup.rotation.z = Math.PI / 5;

      // Manche ergonomique en cuir noir tressé
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.032, 0.58, 8), new THREE.MeshToonMaterial({ color: 0x1a1a1a }));
      whipGroup.add(handle);

      // Pommeau lourd sphérique en or (virole de contrepoids)
      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), goldMat);
      pommel.position.y = -0.3;
      whipGroup.add(pommel);

      // Bague supérieure dorée
      const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8), goldMat);
      ferrule.position.y = 0.29;
      whipGroup.add(ferrule);

      // Lanière souple incurvée du FOUET en 4 segments effilés
      const lashMat = new THREE.MeshStandardMaterial({ color: 0x3d1c06, roughness: 0.5 });
      const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.016, 0.38, 6), lashMat);
      seg1.position.set(0.06, 0.46, 0);
      seg1.rotation.z = -0.35;

      const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.011, 0.38, 6), lashMat);
      seg2.position.set(0.18, 0.78, 0);
      seg2.rotation.z = -0.7;

      const seg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.007, 0.35, 6), lashMat);
      seg3.position.set(0.38, 1.02, 0);
      seg3.rotation.z = -1.15;

      const seg4 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.003, 0.28, 4), lashMat);
      seg4.position.set(0.62, 1.15, 0);
      seg4.rotation.z = -1.55;

      whipGroup.add(seg1, seg2, seg3, seg4);

      // Mèche écarlate (Cracker rouge sang claquant au bout du FOUET)
      const cracker = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff3838 }));
      cracker.position.set(0.76, 1.16, 0);
      whipGroup.add(cracker);

      torsoGroup.add(whipGroup);
      this.riderWhip = whipGroup;

    } else if (isCar) {
      // Pilote de décapotable tenant le volant des deux mains
      armL.position.set(-0.24, 0.16, 0.28);
      armL.rotation.x = Math.PI / 2.6;
      armL.rotation.z = 0.15;
      armR.position.set(0.24, 0.16, 0.28);
      armR.rotation.x = Math.PI / 2.6;
      armR.rotation.z = -0.15;
      torsoGroup.add(armL, armR);

    } else if (isScoot) {
      // Main gauche sur le guidon de la trottinette
      armL.position.set(-0.25, 0.2, 0.24);
      armL.rotation.x = Math.PI / 2.8;
      armL.rotation.z = -0.2;
      torsoGroup.add(armL);

      // Bras droit brandissant la Double Hache de Guerre viking
      armR.position.set(0.28, 0.28, 0.1);
      armR.rotation.x = -Math.PI / 3.4;
      armR.rotation.z = Math.PI / 4.2;
      torsoGroup.add(armR);

      // --- DOUBLE HACHE DE GUERRE BERSERKER ---
      const axeGroup = new THREE.Group();
      axeGroup.position.set(0.38, 0.45, 0.12);
      axeGroup.rotation.x = -Math.PI / 4;
      axeGroup.rotation.z = Math.PI / 6;

      // Manche en bois de frêne avec lanières de cuir
      const axeShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.95, 8), woodMat);
      axeGroup.add(axeShaft);

      // Tête d'acier centrale avec pointe d'estoc
      const headCenter = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), steelMat);
      headCenter.position.y = 0.35;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 6), steelMat);
      spike.position.y = 0.48;
      axeGroup.add(headCenter, spike);

      // Lame avant en croissant tranchant (bord rouge sang)
      const bladeGeo = new THREE.BoxGeometry(0.42, 0.32, 0.03);
      const bladeFront = new THREE.Mesh(bladeGeo, steelMat);
      bladeFront.position.set(0.22, 0.35, 0);
      bladeFront.rotation.z = 0.1;
      const bladeBack = new THREE.Mesh(bladeGeo, steelMat);
      bladeBack.position.set(-0.22, 0.35, 0);
      bladeBack.rotation.z = -0.1;
      axeGroup.add(bladeFront, bladeBack);

      torsoGroup.add(axeGroup);
      this.riderAxe = axeGroup;

    } else if (this.currentBikeId === 'run_ak47') {
      // Sprinteur tenant une Kalachnikov AK-47 à deux mains
      armL.position.set(-0.2, 0.16, 0.22);
      armL.rotation.x = Math.PI / 2.8;
      armL.rotation.z = 0.3;
      armR.position.set(0.22, 0.16, 0.15);
      armR.rotation.x = Math.PI / 2.4;
      armR.rotation.z = -0.35;
      torsoGroup.add(armL, armR);

      // --- KALACHNIKOV AK-47 3D ---
      const akGroup = new THREE.Group();
      akGroup.position.set(0.04, 0.18, 0.32);
      akGroup.rotation.y = -0.25;

      // Boîte de culasse / Corps en acier bruni
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.42), steelMat);
      akGroup.add(receiver);

      // Crosse en bois d'orme
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.32), woodMat);
      stock.position.set(0, -0.04, -0.32);
      akGroup.add(stock);

      // Garde-main en bois
      const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.24), woodMat);
      handguard.position.set(0, 0.01, 0.28);
      akGroup.add(handguard);

      // Canon & Guidon d'acier
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 6), steelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, 0.52);
      akGroup.add(barrel);

      // Flamme de bouche de tir (Muzzle Flash AK-47)
      const muzzleFlash = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.35, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd32a, transparent: true, opacity: 0 })
      );
      muzzleFlash.rotation.x = Math.PI / 2;
      muzzleFlash.position.set(0, 0.02, 0.85);
      akGroup.add(muzzleFlash);
      this.akMuzzleFlash = muzzleFlash;

      // Chargeur banane courbé 30 coups
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.12), steelMat);
      mag.position.set(0, -0.16, 0.1);
      mag.rotation.x = -0.3;
      akGroup.add(mag);

      torsoGroup.add(akGroup);
      this.riderAk = akGroup;

    } else if (this.currentBikeId === 'run_chainsaw') {
      // Sprinteur tenant une tronçonneuse d'assaut
      armL.position.set(-0.24, 0.18, 0.2);
      armL.rotation.x = Math.PI / 2.4;
      armL.rotation.z = 0.2;
      armR.position.set(0.24, 0.18, 0.15);
      armR.rotation.x = Math.PI / 2.2;
      armR.rotation.z = -0.2;
      torsoGroup.add(armL, armR);

      // --- TRONÇONNEUSE VROMBISSANTE 3D ---
      const csGroup = new THREE.Group();
      csGroup.position.set(0, 0.18, 0.35);
      this.riderChainsaw = csGroup;

      // Bloc moteur orange de tronçonneuse
      const orangeMat = new THREE.MeshToonMaterial({ color: 0xff6b01 });
      const motor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.35), orangeMat);
      csGroup.add(motor);

      // Poignée supérieure métallique
      const csHandle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12), steelMat);
      csHandle.rotation.x = Math.PI / 2;
      csHandle.position.set(0, 0.14, 0);
      csGroup.add(csHandle);

      // Guide-chaîne chromé long et fin
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.65), steelMat);
      bar.position.set(0, 0, 0.46);
      csGroup.add(bar);

      // Dents de coupe métalliques
      const teethMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.62), teethMat);
      teeth.position.set(0, 0, 0.46);
      csGroup.add(teeth);

      torsoGroup.add(csGroup);

    } else {
      // Standard guidon de moto (scooter, chopper, etc.)
      armL.position.set(-0.25, 0.2, 0.2);
      armL.rotation.x = Math.PI / 3.2;
      armL.rotation.z = -0.25;
      armR.position.set(0.25, 0.2, 0.2);
      armR.rotation.x = Math.PI / 3.2;
      armR.rotation.z = 0.25;
      torsoGroup.add(armL, armR);
    }

    this.riderArmL = armL;
    this.riderArmR = armR;

    // --- JAMBES & CHAUSSURES DU PILOTE / COUREUR ---
    if (isRunner) {
      // Pour les coureurs à pied : jambes articulées au bassin pour animation de sprint rapide
      const legGeo = new THREE.BoxGeometry(0.12, 0.45, 0.14);
      const shoeGeo = new THREE.BoxGeometry(0.13, 0.11, 0.24);

      const createRunnerLeg = (x) => {
        const pivot = new THREE.Group();
        pivot.position.set(x, 0.75, 0);

        const leg = new THREE.Mesh(legGeo, pantsMat);
        leg.position.y = -0.22;
        pivot.add(leg);

        const shoe = new THREE.Mesh(shoeGeo, shoesMat);
        shoe.position.set(0, -0.46, 0.05);
        pivot.add(shoe);

        this.riderGroup.add(pivot);
        return pivot;
      };

      this.runnerLegL = createRunnerLeg(-0.16);
      this.runnerLegR = createRunnerLeg(0.16);

    } else if (isCar) {
      // Dans la décapotable : jambes allongées vers l'avant sous le tableau de bord
      const legGeo = new THREE.BoxGeometry(0.12, 0.48, 0.14);
      const shoeGeo = new THREE.BoxGeometry(0.12, 0.1, 0.2);

      const legL = new THREE.Mesh(legGeo, pantsMat);
      legL.position.set(-0.48, 0.42, 0.02);
      legL.rotation.x = -1.2;
      const legR = new THREE.Mesh(legGeo, pantsMat);
      legR.position.set(-0.22, 0.42, 0.02);
      legR.rotation.x = -1.2;
      this.riderGroup.add(legL, legR);

      const shoeL = new THREE.Mesh(shoeGeo, shoesMat);
      shoeL.position.set(-0.48, 0.32, 0.38);
      const shoeR = shoeL.clone();
      shoeR.position.set(-0.22, 0.32, 0.38);
      this.riderGroup.add(shoeL, shoeR);

    } else if (isScoot) {
      // Sur la trottinette : debout sur le deck
      const legGeo = new THREE.BoxGeometry(0.12, 0.52, 0.14);
      const shoeGeo = new THREE.BoxGeometry(0.12, 0.1, 0.22);

      const legL = new THREE.Mesh(legGeo, pantsMat);
      legL.position.set(-0.1, 0.56, -0.05);
      const legR = new THREE.Mesh(legGeo, pantsMat);
      legR.position.set(0.1, 0.56, -0.25);
      this.riderGroup.add(legL, legR);

      const shoeL = new THREE.Mesh(shoeGeo, shoesMat);
      shoeL.position.set(-0.1, 0.34, 0);
      const shoeR = shoeL.clone();
      shoeR.position.set(0.1, 0.34, -0.2);
      this.riderGroup.add(shoeL, shoeR);

    } else if (isTank) {
      // Commandant dans la tourelle : jambes protégées à l'intérieur de la caisse blindée
    } else {
      // Moto classique & cheval : jambes repliées
      const legGeo = new THREE.BoxGeometry(0.12, 0.4, 0.14);
      const shoeGeo = new THREE.BoxGeometry(0.12, 0.1, 0.2);

      const legL = new THREE.Mesh(legGeo, pantsMat);
      legL.position.set(-0.18, 0.55, -0.05);
      legL.rotation.x = -0.5;
      this.riderGroup.add(legL);

      const legR = legL.clone();
      legR.position.set(0.18, 0.55, -0.05);
      this.riderGroup.add(legR);

      const shoeL = new THREE.Mesh(shoeGeo, shoesMat);
      shoeL.position.set(-0.18, 0.38, 0.1);
      this.riderGroup.add(shoeL);

      const shoeR = shoeL.clone();
      shoeR.position.set(0.18, 0.38, 0.1);
      this.riderGroup.add(shoeR);
    }

    this.riderGroup.add(torsoGroup);
  }

  isInvulnerable() {
    return this.isCrashed || this.invulnerableTimer > 0;
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
          this.riderHead.rotation.y = Math.sin(this.crashTimer * 20) * 0.7;
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
    this.smoothedSteer += (steerInput - this.smoothedSteer) * Math.min(1.0, delta * 7.5);

    // Largeur étendue : Chaussée (-4.2 à +4.2) + Trottoirs (-6.0 à +6.0)
    // Permet de rouler confortablement sur le trottoir sans heurter les façades de bâtiments (8.5m)
    const MAX_WIDTH = 6.0;
    this.x -= this.smoothedSteer * 8.6 * delta;
    this.x = Math.max(-MAX_WIDTH, Math.min(MAX_WIDTH, this.x));

    // Détection de montée sur le trottoir (|x| > 4.25m)
    const onSidewalk = Math.abs(this.x) > 4.25;
    if (onSidewalk && !this.wasOnSidewalk) {
      soundManager.playCurbMount();
    }
    this.wasOnSidewalk = onSidewalk;

    this.targetLean = this.smoothedSteer * 0.32;
    this.currentLean += (this.targetLean - this.currentLean) * Math.min(1.0, delta * 6.5);

    // Positionnement et rotation du bolide
    this.mesh.position.x = this.x;
    this.mesh.rotation.z = 0;

    // Suspension / rebond + Dénivellation du trottoir (+0.25m) ou Vol
    this.bouncePhase += delta * (speed * 0.8 + 2.0);
    const suspensionBounce = Math.sin(this.bouncePhase) * 0.02;
    const baseAltitude = this.isFlyingEscape || this.currentBikeId === 'aero_jet' ? 38.0 : (onSidewalk ? 0.25 : 0.0);
    this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, baseAltitude + suspensionBounce, delta * 8.0);

    // Inclinaison du châssis (atténuée pour la décapotable 4 roues)
    if (this.currentBikeId === 'decapotable') {
      this.bikeModelGroup.rotation.z = this.currentLean * 0.35;
      if (this.carSteeringWheel) {
        this.carSteeringWheel.rotation.z = -this.smoothedSteer * 1.2;
      }
    } else {
      this.bikeModelGroup.rotation.z = this.currentLean;
    }

    // Orientation de la fourche avant
    if (this.frontFork) {
      this.frontFork.rotation.y = this.smoothedSteer * 0.25;
    }

    // Animation du pilote
    if (this.riderTorso) {
      this.riderTorso.rotation.z = this.currentLean * 0.75;
      this.riderTorso.rotation.x = 0.25 + Math.sin(this.bouncePhase * 2) * 0.03;
    }
    if (this.riderHead) {
      this.riderHead.rotation.y = this.smoothedSteer * 0.28;
      this.riderHead.rotation.z = -this.currentLean * 0.4;
    }
    if (this.scarfTail) {
      this.scarfTail.rotation.x = -0.35 + Math.sin(this.bouncePhase * 3.5) * 0.22;
      this.scarfTail.rotation.y = Math.cos(this.bouncePhase * 2.8) * 0.18;
    }

    // Rotation des roues selon la vitesse
    const wheelAngularSpeed = (speed / 0.35) * delta;
    this.wheels.forEach(w => {
      w.rotation.x += wheelAngularSpeed;
    });

    // --- ANIMATION DE L'ÉTALON PUR-SANG & DU FOUET CINGLANT ---
    if (this.currentBikeId === 'cheval') {
      const gallopCycle = this.bouncePhase * 3.2;
      if (this.horseLegFL) this.horseLegFL.rotation.x = Math.sin(gallopCycle) * 0.55;
      if (this.horseLegFR) this.horseLegFR.rotation.x = -Math.sin(gallopCycle) * 0.55;
      if (this.horseLegBL) this.horseLegBL.rotation.x = -Math.sin(gallopCycle) * 0.5;
      if (this.horseLegBR) this.horseLegBR.rotation.x = Math.sin(gallopCycle) * 0.5;
      if (this.horseTail) this.horseTail.rotation.z = Math.sin(gallopCycle * 0.6) * 0.35;
      if (this.horseGroup) this.horseGroup.position.y = Math.abs(Math.sin(gallopCycle)) * 0.08;

      // Claquement périodique réaliste du FOUET avec son
      if (this.riderWhip) {
        const whipCycle = Math.sin(this.bouncePhase * 1.8);
        this.riderWhip.rotation.x = -Math.PI / 4 + whipCycle * 0.45;
        this.riderWhip.rotation.z = Math.PI / 5 + Math.cos(this.bouncePhase * 1.8) * 0.2;
        if (whipCycle > 0.94 && (!this.lastWhipSnap || Date.now() - this.lastWhipSnap > 1400)) {
          this.lastWhipSnap = Date.now();
          soundManager.playWhipCrack();
        }
      }
    }

    // --- ANIMATION DU SPRINTEUR À PIED (AK-47 / TRONÇONNEUSE) ---
    if (this.currentBikeId === 'run_ak47' || this.currentBikeId === 'run_chainsaw') {
      const runCycle = this.bouncePhase * 4.2;
      if (this.runnerLegL) this.runnerLegL.rotation.x = Math.sin(runCycle) * 0.8;
      if (this.runnerLegR) this.runnerLegR.rotation.x = -Math.sin(runCycle) * 0.8;
      this.mesh.position.y = Math.abs(Math.sin(runCycle)) * 0.09;
    }

    // Animation du rouleau compresseur 50 Tonnes
    if (this.currentBikeId === 'rouleau' && this.frontRoller) {
      this.frontRoller.rotation.x -= (speed / 0.68) * delta;
    }

    // --- ANIMATION DU CHAR D'ASSAUT AMX-TITAN & CANON 120MM ---
    if (this.currentBikeId === 'tank') {
      if (this.tankWheels && this.tankWheels.length > 0) {
        this.tankWheels.forEach(w => {
          w.rotation.x += (speed / 0.3) * delta;
        });
      }
      if (this.tankRecoil > 0) {
        this.tankRecoil = Math.max(0, this.tankRecoil - delta * 3.5);
        if (this.tankBarrel) {
          this.tankBarrel.position.z = 0.75 - this.tankRecoil * 0.42;
        }
      }
      if (this.tankTurret) {
        this.tankTurret.rotation.y = -lateralInput * 0.12;
      }
    }

    // --- GESTION VISUELLE DYNAMIQUE DU NITRO 5 SECONDES ---
    if (gameState && gameState.isNitroActive) {
      this.nitroFlames.visible = true;
      const jitterZ = 1.0 + Math.random() * 0.45;
      const jitterX = 1.0 + Math.random() * 0.25;
      this.flameL.scale.set(jitterX, jitterX, jitterZ);
      this.flameR.scale.set(jitterX, jitterX, jitterZ);
    } else {
      this.nitroFlames.visible = false;
    }

    // --- GESTION DES BALLES TRAÇANTES AK-47 ---
    if (this.bulletPool) {
      this.bulletPool.forEach(b => {
        if (b.userData.active) {
          b.position.z += b.userData.speedZ * delta;
          if (b.position.z > this.mesh.position.z + 70.0) {
            b.userData.active = false;
            b.visible = false;
          }
        }
      });
    }

    // --- GESTION DES ANIMATIONS D'ATTAQUE (FOUET, HACHE, AK-47, TRONÇONNEUSE) ---
    if (this.isAttacking) {
      this.attackTimer -= delta;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        if (this.akMuzzleFlash) this.akMuzzleFlash.material.opacity = 0;
        if (this.axeSlashTrail) this.axeSlashTrail.material.opacity = 0;
        // Rétablir la posture normale des bras
        if (this.riderArmR) {
          this.riderArmR.rotation.set(0, 0, 0);
        }
        if (this.riderTorso) {
          this.riderTorso.rotation.y = 0;
        }
      } else {
        const attackProgress = 1 - (this.attackTimer / 0.42);

        // 1. Coup de FOUET cinglant (Armement ample puis claquement supersonique)
        if (this.attackType === 'whip') {
          const lashAngle = Math.sin(attackProgress * Math.PI);
          if (this.riderArmR) {
            this.riderArmR.rotation.x = -Math.PI / 3.2 - (1 - attackProgress) * 1.4 + attackProgress * 2.2;
            this.riderArmR.rotation.z = Math.PI / 4.5 - lashAngle * 1.1;
          }
          if (this.riderWhip) {
            this.riderWhip.rotation.x = -Math.PI / 4 - lashAngle * 2.4;
            this.riderWhip.rotation.z = Math.PI / 5 - lashAngle * 1.8;
          }
        }

        // 2. Balayage violent à la HACHE (Véritable coup de taille avec le bras et le torse)
        if (this.attackType === 'axe') {
          const chopSwing = Math.sin(attackProgress * Math.PI);
          if (this.riderArmR) {
            // Le bras s'élève haut en arrière puis s'abat en tranchant
            this.riderArmR.rotation.x = -Math.PI / 3.4 - (1 - attackProgress) * 1.6 + attackProgress * 2.5;
            this.riderArmR.rotation.y = -chopSwing * 1.3;
            this.riderArmR.rotation.z = Math.PI / 4.2 - chopSwing * 1.1;
          }
          if (this.riderTorso) {
            this.riderTorso.rotation.y = -chopSwing * 0.55;
          }
          if (this.riderAxe) {
            this.riderAxe.rotation.z = Math.PI / 6 - chopSwing * 2.8;
            this.riderAxe.rotation.x = -Math.PI / 4 + chopSwing * 1.9;
          }
          if (this.axeSlashTrail) {
            this.axeSlashTrail.material.opacity = Math.sin(attackProgress * Math.PI) * 0.9;
            this.axeSlashTrail.rotation.z = -attackProgress * 2.2;
          }
        }

        // 3. Rafale AK-47 avec recul violent du torse et flamme de tir (Muzzle Flash)
        if (this.attackType === 'shoot') {
          const recoil = Math.sin(attackProgress * Math.PI * 8) * 0.18;
          if (this.riderAk) {
            this.riderAk.position.z = 0.32 - Math.max(0, recoil);
            this.riderAk.rotation.x = -recoil * 0.9;
          }
          if (this.riderArmR) {
            this.riderArmR.rotation.x = Math.PI / 2.4 - recoil * 1.1;
          }
          if (this.riderTorso) {
            this.riderTorso.rotation.x = 0.25 - recoil * 0.5;
          }
          if (this.akMuzzleFlash) {
            this.akMuzzleFlash.material.opacity = Math.random() > 0.15 ? 0.95 : 0.05;
            this.akMuzzleFlash.scale.setScalar(1.0 + Math.random() * 0.9);
          }
        }

        // 4. Estoc & vrombissement de la TRONÇONNEUSE
        if (this.attackType === 'chainsaw' && this.riderChainsaw) {
          const thrust = Math.sin(attackProgress * Math.PI) * 0.45;
          this.riderChainsaw.position.z = 0.35 + thrust;
          this.riderChainsaw.position.x = (Math.random() - 0.5) * 0.08;
          if (this.riderTorso) {
            this.riderTorso.rotation.y = (Math.random() - 0.5) * 0.15;
          }
        }
      }
    }
  }

  spawnTracerBurst() {
    const muzzleX = this.mesh.position.x + 0.35;
    const muzzleY = this.mesh.position.y + 1.1;
    const muzzleZ = this.mesh.position.z + 1.4;

    let spawned = 0;
    for (let i = 0; i < this.bulletPool.length && spawned < 5; i++) {
      const b = this.bulletPool[i];
      if (!b.userData.active) {
        b.position.set(muzzleX + (Math.random() - 0.5) * 0.25, muzzleY + (Math.random() - 0.5) * 0.15, muzzleZ + spawned * 2.4);
        b.userData.active = true;
        b.visible = true;
        spawned++;
      }
    }
  }

  triggerAttack() {
    if (this.currentBikeId === 'cheval') {
      this.isAttacking = true;
      this.attackTimer = 0.38;
      this.attackType = 'whip';
      soundManager.playWhipCrack();
      return { type: 'whip', range: 9.5, radius: 3.0 };
    } else if (this.currentBikeId === 'trottinette_hache') {
      this.isAttacking = true;
      this.attackTimer = 0.42;
      this.attackType = 'axe';
      soundManager.playAxeSlash();
      return { type: 'axe', range: 8.5, radius: 3.6 };
    } else if (this.currentBikeId === 'run_ak47') {
      this.isAttacking = true;
      this.attackTimer = 0.36;
      this.attackType = 'shoot';
      soundManager.playAk47Burst();
      this.spawnTracerBurst();
      return { type: 'shoot', range: 45.0, radius: 3.2 };
    } else if (this.currentBikeId === 'run_chainsaw') {
      this.isAttacking = true;
      this.attackTimer = 0.45;
      this.attackType = 'chainsaw';
      soundManager.playChainsawRev();
      return { type: 'chainsaw', range: 8.0, radius: 3.0 };
    } else if (this.currentBikeId === 'tank') {
      this.isAttacking = true;
      this.attackTimer = 0.55;
      this.attackType = 'cannon';
      this.tankRecoil = 1.0;
      soundManager.playTankCannon();
      return { type: 'cannon', range: 85.0, radius: 5.2, isExplosive: true };
    } else if (this.currentBikeId === 'rouleau') {
      soundManager.playSteamrollerHorn();
      return { type: 'horn', range: 25.0, radius: 5.5 };
    } else {
      // Scooter, Chopper, Décapotable, Dragster, Aéro-Jet : Puissant Klaxon bi-ton italien/français !
      soundManager.playHorn(this.currentBikeId);
      return { type: 'horn', range: 24.0, radius: 5.0 };
    }
  }

  getExhaustPosition() {
    const pos = new THREE.Vector3();
    pos.set(this.mesh.position.x + 0.2, this.mesh.position.y + 0.3, this.mesh.position.z - 0.7);
    return pos;
  }
}

/**
 * Motormageddon - Système de Circulation Urbaine 3D Haute-Fidélité (Trafic Réduit & Graphismes Luxueux)
 * Véhicules modélisés avec carrosseries métallisées réalistes, reflets vernis, vitrages fumés,
 * phares LED DRL avec halos, feux arrière néon, jantes alliage 3D et physique de carambolage.
 * Trafic équilibré et aéré : 2 à 3 voitures maximum à l'écran avec large distance de sécurité.
 */

import * as THREE from 'three';
import { soundManager } from '../audio/SoundManager.js';

export class Traffic {
  constructor(scene, particles = null) {
    this.scene = scene;
    this.particles = particles;
    this.vehicles = [];
    this.vehiclePoolSize = 4; // Trafic réduit à 4 véhicules dans le pool
    this.maxActiveVehicles = 2; // Au maximum 2 véhicules simultanément sur la route
    this.container = new THREE.Group();
    this.scene.add(this.container);

    // Géométries partagées optimisées
    this.sharedGeos = {
      wheelTire: new THREE.CylinderGeometry(0.36, 0.36, 0.24, 18),
      wheelRim: new THREE.CylinderGeometry(0.24, 0.24, 0.25, 10),
      wheelCap: new THREE.SphereGeometry(0.08, 8, 8),
      headlightLens: new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12),
      taillightBar: new THREE.BoxGeometry(0.42, 0.08, 0.04),
      lightBeam: new THREE.ConeGeometry(1.6, 12.0, 10, 1, true),
      underglow: new THREE.PlaneGeometry(2.2, 4.4)
    };

    // Matériaux PBR de qualité supérieure (vernis automobile & chrome miroir)
    this.sharedMats = {
      rubber: new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.85, metalness: 0.1 }),
      rim: new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.95, roughness: 0.12 }),
      brakeCaliper: new THREE.MeshStandardMaterial({ color: 0xff3838, roughness: 0.3, metalness: 0.6 }),
      tintedGlass: new THREE.MeshStandardMaterial({
        color: 0x111927,
        roughness: 0.05,
        metalness: 0.9,
        transparent: true,
        opacity: 0.82
      }),
      headlightLED: new THREE.MeshStandardMaterial({
        color: 0xfffa65,
        emissive: 0xfffa65,
        emissiveIntensity: 1.2,
        roughness: 0.1
      }),
      taillightLED: new THREE.MeshStandardMaterial({
        color: 0xff1744,
        emissive: 0xff1744,
        emissiveIntensity: 1.0,
        roughness: 0.1
      }),
      chromeTrim: new THREE.MeshStandardMaterial({
        color: 0xf5f6fa,
        metalness: 0.96,
        roughness: 0.08
      }),
      beam: new THREE.MeshBasicMaterial({
        color: 0xfffa65,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        side: THREE.DoubleSide
      }),
      underglowMat: new THREE.MeshBasicMaterial({
        color: 0x00d2d3,
        transparent: true,
        opacity: 0.22,
        depthWrite: false
      })
    };

    this.initPool();

    // Initialiser l'ambulance d'urgence après avoir défini les géométries et matériaux partagés
    this.ambulance = this.createAmbulance();
    this.container.add(this.ambulance);
  }

  initPool() {
    const types = ['supercar', 'taxi_luxe', 'sedan_prestige', 'suv_urban'];
    for (let i = 0; i < this.vehiclePoolSize; i++) {
      const type = types[i % types.length];
      const vehicle = this.createHighFidelityVehicle(type, i);
      vehicle.userData = {
        type: type,
        active: false,
        speed: 18 + Math.random() * 6,
        lane: (i % 2 === 0 ? 1 : -1) * 2.2, // Voie droite (+2.2m) ou voie gauche (-2.2m)
        isCrashed: false,
        crashVelX: 0,
        crashVelY: 0,
        crashVelZ: 0,
        crashSpinX: 0,
        crashSpinY: 0,
        crashSpinZ: 0
      };
      vehicle.visible = false;
      this.vehicles.push(vehicle);
      this.container.add(vehicle);
    }
  }

  createHighFidelityVehicle(type, index) {
    const group = new THREE.Group();

    // Palettes de peintures métallisées nacrées de prestige
    const metallicColors = [0x0984e3, 0xd63031, 0x2d3436, 0x6c5ce7, 0x00b894, 0xe17055, 0x1e3799];
    const carColor = type === 'taxi_luxe' ? 0xf1c40f : metallicColors[index % metallicColors.length];

    const carPaint = new THREE.MeshStandardMaterial({
      color: carColor,
      metalness: 0.88,
      roughness: 0.16
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: (type === 'taxi_luxe' || type === 'supercar') ? 0x111620 : carColor,
      metalness: 0.90,
      roughness: 0.12
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x1e272e,
      roughness: 0.6,
      metalness: 0.4
    });

    if (type === 'supercar') {
      // 1. HYPERCAR CYBER-GT SURBAISSÉE & AÉRODYNAMIQUE
      // Châssis principal profilé
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.38, 4.6), carPaint);
      chassis.position.y = 0.38;
      chassis.castShadow = true;
      group.add(chassis);

      // Capot plongeant sculpté
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 1.4), carPaint);
      hood.position.set(0, 0.46, 1.4);
      hood.rotation.x = 0.08;
      group.add(hood);

      // Lame avant aérodynamique (Front Splitter Carbone)
      const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.06, 0.5), darkTrimMat);
      splitter.position.set(0, 0.22, 2.25);
      group.add(splitter);

      // Cockpit profilé avec verrière panoramique fumée
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.44, 2.1), this.sharedMats.tintedGlass);
      canopy.position.set(0, 0.76, -0.15);
      canopy.castShadow = true;
      group.add(canopy);

      // Toit profilé en carbone
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.3), roofMat);
      roof.position.set(0, 0.96, -0.2);
      group.add(roof);

      // Prises d'air latérales moteur central
      for (let s of [-0.98, 0.98]) {
        const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.7), darkTrimMat);
        scoop.position.set(s, 0.46, -0.3);
        group.add(scoop);
      }

      // Aileron arrière sport en carbone avec deux montants
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.06, 0.38), darkTrimMat);
      wing.position.set(0, 0.88, -2.15);
      for (let s of [-0.55, 0.55]) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.1), this.sharedMats.rim);
        strut.position.set(s, 0.76, -2.15);
        group.add(strut);
      }
      group.add(wing);

      // Diffuseur arrière & double sortie d'échappement centrale chromée
      const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 0.3), darkTrimMat);
      diffuser.position.set(0, 0.25, -2.25);
      group.add(diffuser);

      for (let s of [-0.18, 0.18]) {
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 12), this.sharedMats.chromeTrim);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(s, 0.28, -2.36);
        group.add(exhaust);
      }

      // Rétroviseurs profilés
      for (let s of [-1.02, 1.02]) {
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), carPaint);
        mirror.position.set(s, 0.68, 0.6);
        group.add(mirror);
      }

    } else if (type === 'taxi_luxe') {
      // 2. TAXI PARISIEN HAUT DE GAMME (BI-TON JAUNE ÉLÉGANT & TOIT NOIR LAQUÉ)
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.62, 4.65), carPaint);
      body.position.y = 0.55;
      body.castShadow = true;
      group.add(body);

      // Capot avant légèrement fuyant
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.12, 1.3), carPaint);
      hood.position.set(0, 0.72, 1.45);
      hood.rotation.x = 0.06;
      group.add(hood);

      // Habitacle spacieux avec vitrage teinté et montants laqués
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.62, 2.5), roofMat);
      cabin.position.set(0, 1.12, -0.15);
      cabin.castShadow = true;
      group.add(cabin);

      // Vitrages latéraux et pare-brises avant/arrière
      const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.64, 0.72), this.sharedMats.tintedGlass);
      windshield.position.set(0, 1.12, 1.15);
      windshield.rotation.x = -Math.PI / 4.4;
      const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.64, 0.72), this.sharedMats.tintedGlass);
      rearGlass.position.set(0, 1.12, -1.45);
      rearGlass.rotation.x = Math.PI / 4.4;
      group.add(windshield, rearGlass);

      // Calandre chromée prestige avec lamelles
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.38, 0.08), this.sharedMats.chromeTrim);
      grille.position.set(0, 0.55, 2.34);
      group.add(grille);

      // Enseigne lumineuse de toit "TAXI PARISIEN" rétroéclairée
      const signBase = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 0.2), this.sharedMats.chromeTrim);
      signBase.position.set(0, 1.45, -0.2);
      const signGlow = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.15, 0.16), this.sharedMats.headlightLED);
      signGlow.position.set(0, 1.54, -0.2);
      group.add(signBase, signGlow);

      // Rétroviseurs chromés
      for (let s of [-0.98, 0.98]) {
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.12), this.sharedMats.chromeTrim);
        mirror.position.set(s, 0.92, 0.75);
        group.add(mirror);
      }

    } else if (type === 'suv_urban') {
      // 3. SUV CITADIN ROBUSTE & SPORTIF
      const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.75, 4.6), carPaint);
      lowerBody.position.y = 0.65;
      lowerBody.castShadow = true;
      group.add(lowerBody);

      // Sabot de protection noir et passages de roues robustes
      const skidPlate = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 4.65), darkTrimMat);
      skidPlate.position.y = 0.32;
      group.add(skidPlate);

      // Pavillon & vitrages surélevés
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.72, 2.7), roofMat);
      cabin.position.set(0, 1.34, -0.15);
      cabin.castShadow = true;
      group.add(cabin);

      // Barres de toit aérodynamiques chromées
      for (let s of [-0.78, 0.78]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.4), this.sharedMats.chromeTrim);
        rail.position.set(s, 1.74, -0.15);
        group.add(rail);
      }

      // Vitrages
      const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.82), this.sharedMats.tintedGlass);
      windshield.position.set(0, 1.34, 1.25);
      windshield.rotation.x = -Math.PI / 4.6;
      group.add(windshield);

      // Double sortie d'échappement sportive
      for (let s of [-0.65, 0.65]) {
        const exhaust = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.15), this.sharedMats.chromeTrim);
        exhaust.position.set(s, 0.35, -2.32);
        group.add(exhaust);
      }

    } else {
      // 4. BERLINE ALLEMANDE DE PRESTIGE (GRAN COUPE SPORTIF)
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.62, 4.7), carPaint);
      body.position.y = 0.55;
      body.castShadow = true;
      group.add(body);

      // Capot élégant à nervures
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.12, 1.4), carPaint);
      hood.position.set(0, 0.7, 1.45);
      hood.rotation.x = 0.05;
      group.add(hood);

      // Ligne de toit fuyante fastback
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.6, 2.5), roofMat);
      cabin.position.set(0, 1.12, -0.15);
      cabin.castShadow = true;
      group.add(cabin);

      const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.68, 0.72), this.sharedMats.tintedGlass);
      windshield.position.set(0, 1.12, 1.14);
      windshield.rotation.x = -Math.PI / 4.2;
      group.add(windshield);

      // Calandre double sport chromée
      for (let s of [-0.32, 0.32]) {
        const kidney = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.08), this.sharedMats.chromeTrim);
        kidney.position.set(s, 0.56, 2.36);
        group.add(kidney);
      }

      // Rétroviseurs sport
      for (let s of [-1.0, 1.0]) {
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), carPaint);
        mirror.position.set(s, 0.88, 0.7);
        group.add(mirror);
      }
    }

    // 4 Roues sportives avec jantes alliage 3D & étriers de frein
    const wheelPositions = [
      [-1.0, 0.36, 1.35],
      [1.0, 0.36, 1.35],
      [-1.0, 0.36, -1.35],
      [1.0, 0.36, -1.35]
    ];
    group.userData.wheelMeshes = [];

    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wx, wy, wz);

      const tire = new THREE.Mesh(this.sharedGeos.wheelTire, this.sharedMats.rubber);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;

      const rim = new THREE.Mesh(this.sharedGeos.wheelRim, this.sharedMats.rim);
      rim.rotation.z = Math.PI / 2;

      // Étriers de frein sport rouge vif visibles
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.08), this.sharedMats.brakeCaliper);
      caliper.position.set(wx > 0 ? -0.06 : 0.06, 0.12, 0.08);

      wheelGroup.add(tire, rim, caliper);
      group.add(wheelGroup);
      group.userData.wheelMeshes.push(wheelGroup);
    });

    // Phares avant LED DRL étincelants
    for (let s of [-0.72, 0.72]) {
      const headlight = new THREE.Mesh(this.sharedGeos.headlightLens, this.sharedMats.headlightLED);
      headlight.rotation.x = Math.PI / 2;
      headlight.position.set(s, 0.58, 2.34);
      group.add(headlight);
    }

    // Feux arrière LED horizontaux éclatants
    for (let s of [-0.68, 0.68]) {
      const taillight = new THREE.Mesh(this.sharedGeos.taillightBar, this.sharedMats.taillightLED);
      taillight.position.set(s, 0.62, -2.34);
      group.add(taillight);
    }

    // Faisceaux lumineux sur la chaussée
    for (let s of [-0.68, 0.68]) {
      const beam = new THREE.Mesh(this.sharedGeos.lightBeam, this.sharedMats.beam);
      beam.rotation.x = Math.PI / 2;
      beam.position.set(s, 0.45, 7.5);
      group.add(beam);
    }

    // Rétroprojecteur au sol (halo néon subtil)
    const underglow = new THREE.Mesh(this.sharedGeos.underglow, this.sharedMats.underglowMat);
    underglow.rotation.x = -Math.PI / 2;
    underglow.position.y = 0.04;
    group.add(underglow);

    return group;
  }

  // --- AMBULANCE D'URGENCE RAPIDE AVEC GYROPHARES & SIRENE ---
  createAmbulance() {
    const group = new THREE.Group();
    group.userData = {
      active: false,
      speed: 25.0,
      lane: -2.2,
      wheelMeshes: [],
      strobeLights: [],
      strobeTimer: 0
    };

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.25, metalness: 0.1 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.1, metalness: 0.9 });
    const redCrossMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });
    const strobeBlueMat = new THREE.MeshBasicMaterial({ color: 0x0984e3 });
    const strobeRedMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });

    // Caisse principale d'ambulance
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.8, 4.6), bodyMat);
    box.position.y = 1.25;
    box.castShadow = true;
    group.add(box);

    // Cabine avant
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.35, 1.5), bodyMat);
    cabin.position.set(0, 0.95, 2.2);
    group.add(cabin);

    // Pare-brise
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 0.1), glassMat);
    windshield.position.set(0, 1.15, 2.92);
    windshield.rotation.x = 0.28;
    group.add(windshield);

    // Croix rouge sur les deux côtés
    for (let side of [-1.06, 1.06]) {
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.75), redCrossMat);
      crossH.position.set(side, 1.4, 0);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, 0.22), redCrossMat);
      crossV.position.set(side, 1.4, 0);
      group.add(crossH, crossV);
    }

    // Rampe de gyrophares LED sur le toit
    const lightbar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.35), new THREE.MeshStandardMaterial({ color: 0x2f3640 }));
    lightbar.position.set(0, 2.24, 1.2);
    group.add(lightbar);

    const strobeBlue = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.18, 0.3), strobeBlueMat);
    strobeBlue.position.set(-0.45, 2.25, 1.2);
    const strobeRed = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.18, 0.3), strobeRedMat);
    strobeRed.position.set(0.45, 2.25, 1.2);
    group.add(strobeBlue, strobeRed);
    group.userData.strobeLights = [strobeBlue, strobeRed];

    // 4 Roues
    const wheelPositions = [
      { x: -1.02, y: 0.38, z: 1.6 },
      { x: 1.02, y: 0.38, z: 1.6 },
      { x: -1.02, y: 0.38, z: -1.4 },
      { x: 1.02, y: 0.38, z: -1.4 }
    ];
    wheelPositions.forEach(p => {
      const wGroup = new THREE.Group();
      wGroup.position.set(p.x, p.y, p.z);
      const tire = new THREE.Mesh(this.sharedGeos.wheelTire, this.sharedMats.rubber);
      tire.rotation.z = Math.PI / 2;
      wGroup.add(tire);
      group.add(wGroup);
      group.userData.wheelMeshes.push(wGroup);
    });

    group.visible = false;
    return group;
  }

  spawnEmergencyAmbulance(playerZ, roadCurveFunc) {
    if (this.ambulance.userData.active) return;
    const spawnZ = playerZ + 85 + Math.random() * 35;
    const curveX = roadCurveFunc ? roadCurveFunc(spawnZ) : 0;
    const side = Math.random() > 0.5 ? 2.2 : -2.2;
    this.ambulance.position.set(curveX + side, 0, spawnZ);
    this.ambulance.rotation.set(0, 0, 0);
    this.ambulance.visible = true;
    this.ambulance.userData.active = true;
    this.ambulance.userData.speed = 25.0;
    this.ambulance.userData.lane = side;
  }

  // Pulvérisation d'un véhicule par obus de char
  blowUpVehicle(v, hitOrigin) {
    if (!v || v.userData.isCrashed) return;
    v.userData.isCrashed = true;
    v.userData.active = false;
    v.userData.crashVelY = 16.0 + Math.random() * 8.0;
    v.userData.crashVelX = (v.position.x >= hitOrigin.x ? 1 : -1) * (12.0 + Math.random() * 6.0);
    v.userData.crashVelZ = 14.0 + Math.random() * 10.0;
    v.userData.crashSpinX = (Math.random() - 0.5) * 16.0;
    v.userData.crashSpinY = 8.0 + Math.random() * 8.0;
    v.userData.crashSpinZ = (Math.random() - 0.5) * 12.0;
  }

  reset() {
    this.vehicles.forEach(v => {
      v.visible = false;
      v.userData.active = false;
      v.userData.isCrashed = false;
    });
    if (this.ambulance) {
      this.ambulance.visible = false;
      this.ambulance.userData.active = false;
    }
  }

  spawnAhead(playerZ, roadCurveFunc) {
    // Compter les véhicules déjà actifs
    const activeCount = this.vehicles.filter(v => v.userData.active).length;
    if (activeCount >= this.maxActiveVehicles) return;

    // Plage d'apparition aérée et lointaine pour ne pas étouffer le joueur
    const minZ = playerZ + 85;
    const maxZ = playerZ + 240;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (!v.userData.active && (!v.visible || v.position.z < playerZ - 30)) {
        // Vérifier qu'aucun autre véhicule n'est trop proche de ce nouveau point
        const candidateZ = minZ + Math.random() * (maxZ - minZ);
        const tooClose = this.vehicles.some(other => other.userData.active && Math.abs(other.position.z - candidateZ) < 65);
        if (tooClose) continue;

        const curveX = roadCurveFunc ? roadCurveFunc(candidateZ) : 0;
        const laneX = v.userData.lane;

        v.position.set(curveX + laneX, 0, candidateZ);
        v.rotation.set(0, 0, 0);
        v.visible = true;
        v.userData.active = true;
        v.userData.isCrashed = false;
        v.userData.speed = 16 + Math.random() * 7;
        break; // On ne fait apparaître qu'un véhicule à la fois
      }
    }
  }

  triggerCrash(vehicle, bikeSpeed, hitDirectionX = 1) {
    vehicle.userData.isCrashed = true;
    vehicle.userData.active = false;
    soundManager.playCrash();

    // Carambolage burlesque et spectaculaire
    vehicle.userData.crashVelX = hitDirectionX * (8.5 + Math.random() * 6.0);
    vehicle.userData.crashVelY = 9.5 + Math.random() * 5.0;
    vehicle.userData.crashVelZ = (bikeSpeed * 0.45) + (Math.random() * 8.0);

    vehicle.userData.crashSpinX = (Math.random() - 0.5) * 14.0;
    vehicle.userData.crashSpinY = (Math.random() - 0.5) * 16.0;
    vehicle.userData.crashSpinZ = hitDirectionX * (9.0 + Math.random() * 6.0);
  }

  update(delta, playerZ, bikeX, bikeSpeed, roadCurveFunc, onVehicleCollision, isPlayerInvulnerable = false) {
    this.spawnAhead(playerZ, roadCurveFunc);

    this.vehicles.forEach(v => {
      if (!v.visible) return;

      // 1. Véhicule en vol balistique après carambolage
      if (v.userData.isCrashed) {
        v.position.x += v.userData.crashVelX * delta;
        v.position.y += v.userData.crashVelY * delta;
        v.position.z += v.userData.crashVelZ * delta;

        v.userData.crashVelY -= 19.0 * delta; // Gravité

        v.rotation.x += v.userData.crashSpinX * delta;
        v.rotation.y += v.userData.crashSpinY * delta;
        v.rotation.z += v.userData.crashSpinZ * delta;

        // Traînée de fumée et étincelles pendant le vol balistique
        if (Math.random() < 0.45 && this.particles) {
          this.particles.spawnExhaustSmoke(v.position, 2.2);
          if (Math.random() < 0.3) this.particles.spawnSparks(v.position, 2, 0xff793f);
        }

        if (v.position.y <= 0) {
          v.position.y = 0;
          v.userData.isCrashed = false;
          v.visible = false;
          // Crash violent et débris au sol
          if (this.particles) {
            this.particles.spawnCrashBurst(v.position);
            this.particles.spawnShockwave(v.position, 0xff793f);
          }
          if (soundManager?.playCrash) soundManager.playCrash();
        }
        return;
      }

      // 2. Véhicule actif circulant dans sa voie
      if (v.userData.active) {
        // Avancement selon sa vitesse
        v.position.z += v.userData.speed * delta;

        // Rotation synchronisée des roues 3D
        if (v.userData.wheelMeshes) {
          const spinSpeed = v.userData.speed * delta * 2.8;
          v.userData.wheelMeshes.forEach(w => {
            w.children.forEach(part => {
              part.rotation.x += spinSpeed;
            });
          });
        }

        // Suivre la trajectoire de la route en restant dans sa voie (+2.2m ou -2.2m)
        const curveX = roadCurveFunc ? roadCurveFunc(v.position.z) : 0;
        const targetX = curveX + v.userData.lane;
        v.position.x += (targetX - v.position.x) * delta * 5.0;

        // Orientation naturelle avec la courbure
        const aheadX = roadCurveFunc ? roadCurveFunc(v.position.z + 3.0) : 0;
        v.rotation.y = (aheadX - curveX) * 0.32;

        // Détection de collision physique avec le bolide du joueur
        const dZ = Math.abs(v.position.z - playerZ);
        const dX = Math.abs(v.position.x - bikeX);

        if (dZ < 3.0 && dX < 1.65) {
          const hitDirX = bikeX < v.position.x ? 1 : -1;
          this.triggerCrash(v, bikeSpeed, hitDirX);
          if (onVehicleCollision) {
            onVehicleCollision(v, isPlayerInvulnerable);
          }
        }

        // Recycler si dépassé loin derrière le joueur
        if (v.position.z < playerZ - 35) {
          v.visible = false;
          v.userData.active = false;
        }
      }
    });

    // 3. Animation et déplacement de l'ambulance d'urgence
    if (this.ambulance && this.ambulance.userData.active) {
      const amb = this.ambulance;
      amb.position.z += amb.userData.speed * delta;
      const curveX = roadCurveFunc ? roadCurveFunc(amb.position.z) : 0;
      amb.position.x += (curveX + amb.userData.lane - amb.position.x) * delta * 5.0;

      // Clignotement alternatif des gyrophares bleu et rouge
      amb.userData.strobeTimer = (amb.userData.strobeTimer || 0) + delta;
      if (amb.userData.strobeLights && amb.userData.strobeLights.length === 2) {
        const toggle = Math.sin(amb.userData.strobeTimer * 22.0) > 0;
        amb.userData.strobeLights[0].visible = toggle;
        amb.userData.strobeLights[1].visible = !toggle;
      }

      // Roues qui tournent
      if (amb.userData.wheelMeshes) {
        amb.userData.wheelMeshes.forEach(w => {
          w.children.forEach(part => part.rotation.x += delta * 25.0);
        });
      }

      if (amb.position.z < playerZ - 45 || amb.position.z > playerZ + 280) {
        amb.visible = false;
        amb.userData.active = false;
      }
    }
  }
}

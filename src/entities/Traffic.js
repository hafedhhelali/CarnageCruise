/**
 * Carnage Cruise - Système de Circulation Urbaine 3D Haute-Fidélité (Trafic Réduit & Graphismes Luxueux)
 * Véhicules modélisés avec carrosseries métallisées réalistes, reflets vernis, vitrages fumés,
 * phares LED DRL avec halos, feux arrière néon, jantes alliage 3D et physique de carambolage.
 * Trafic équilibré et aéré : 2 à 3 voitures maximum à l'écran avec large distance de sécurité.
 */

import * as THREE from 'three';
import { soundManager } from '../audio/SoundManager.js';
import { modelBank } from '../gfx/ModelBank.js';

export class Traffic {
  constructor(scene, particles = null) {
    this.scene = scene;
    this.particles = particles;
    this.vehicles = [];
    this.vehiclePoolSize = 4; // Trafic réduit à 4 véhicules dans le pool
    this.maxActiveVehicles = 2; // Au maximum 2 véhicules simultanément sur la route
    this.container = new THREE.Group();
    this.scene.add(this.container);

    const makeChassisGeo = (pts, width) => {
      const s = new THREE.Shape();
      s.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
      s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, {
        depth: width,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.06,
        bevelSegments: 2
      });
      geo.translate(0, 0, -width / 2);
      geo.rotateY(-Math.PI / 2);
      geo.computeVertexNormals();
      return geo;
    };

    // Géométries partagées optimisées
    this.sharedGeos = {
      chassisSupercar: makeChassisGeo([
        [-2.25, 0.24], [-2.18, 0.72], [-1.25, 0.80], [-0.68, 1.08],
        [0.35, 1.08], [1.05, 0.72], [2.20, 0.48], [2.28, 0.26]
      ], 1.92),
      chassisSedan: makeChassisGeo([
        [-2.30, 0.30], [-2.22, 0.84], [-1.52, 0.90], [-0.95, 1.40],
        [0.45, 1.40], [1.12, 0.90], [2.22, 0.78], [2.32, 0.36]
      ], 1.82),
      chassisSUV: makeChassisGeo([
        [-2.25, 0.34], [-2.18, 1.56], [-0.90, 1.64], [0.75, 1.62],
        [1.26, 1.04], [2.20, 0.96], [2.28, 0.42]
      ], 1.92),
      chassisAmbulance: makeChassisGeo([
        [-2.32, 0.36], [-2.28, 2.02], [0.85, 2.02], [1.18, 1.48],
        [2.12, 1.18], [2.26, 0.46]
      ], 1.98),
      wheelTire: new THREE.CylinderGeometry(0.36, 0.36, 0.24, 18),
      wheelRim: new THREE.CylinderGeometry(0.24, 0.24, 0.25, 10),
      wheelCap: new THREE.SphereGeometry(0.08, 8, 8),
      headlightLens: new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12),
      taillightBar: new THREE.BoxGeometry(0.42, 0.08, 0.04),
      lightBeam: new THREE.ConeGeometry(1.3, 5.6, 10, 1, true),
      underglow: new THREE.PlaneGeometry(2.2, 4.4)
    };

    // Matériaux PBR de qualité supérieure (vernis automobile & chrome miroir)
    this.sharedMats = {
      rubber: new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.85, metalness: 0.1 }),
      rim: new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.85, roughness: 0.3, envMapIntensity: 0.7 }),
      brakeCaliper: new THREE.MeshStandardMaterial({ color: 0xff3838, roughness: 0.3, metalness: 0.6 }),
      tintedGlass: new THREE.MeshStandardMaterial({
        color: 0x0b1220,
        roughness: 0.14,
        metalness: 1.0,
        envMapIntensity: 0.6 // Reflet crédible et calme : plus de blob blanc « bizarre »
      }),
      headlightLED: new THREE.MeshStandardMaterial({
        color: 0xfffa65,
        emissive: 0xfffa65,
        emissiveIntensity: 1.6,
        roughness: 0.1
      }),
      taillightLED: new THREE.MeshStandardMaterial({
        color: 0xff1744,
        emissive: 0xff1744,
        emissiveIntensity: 1.6,
        roughness: 0.1
      }),
      chromeTrim: new THREE.MeshStandardMaterial({
        color: 0xf5f6fa,
        metalness: 0.9,
        roughness: 0.22,
        envMapIntensity: 0.6 // Chrome doux : reflet réel sans bloc lumineux parasite
      }),
      beam: new THREE.MeshBasicMaterial({
        color: 0xfff3b0,
        transparent: true,
        opacity: 0.1,
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

    // Boss de convoi et barrages de police (modes Défi)
    this.bossTruck = null;
    this.roadblocks = [];
    this._initPoliceAssets();
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
        lane: (i % 2 === 0 ? 1 : -1) * 2.7, // Voie droite (+2.7m) ou voie gauche (-2.7m)
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

  /**
   * Maps a traffic vehicle type/index to its .glb asset key and target footprint.
   */
  resolveGlbModelSpec(type, colorHex = 0) {
    if (type === 'motorcycle') {
      return { name: 'vehicle-motorcycle', width: 0.95, height: 1.2, length: 2.1 };
    }
    const typeModelMap = {
      taxi_luxe: 'vehicle-truck-yellow',
      supercar: 'vehicle-truck-red',
      sedan_prestige: 'vehicle-truck-purple',
      suv_urban: 'vehicle-truck-green'
    };
    const truckModels = [
      'vehicle-truck-green',
      'vehicle-truck-red',
      'vehicle-truck-yellow',
      'vehicle-truck-purple'
    ];
    const idx = typeof colorHex === 'number' && colorHex >= 0 ? Math.floor(colorHex) : 0;
    const name = typeModelMap[type] || truckModels[idx % truckModels.length];
    return { name, width: 1.95, height: 1.7, length: 4.2 };
  }

  /**
   * Attaches HDR-blooming headlights, taillights, road light cones, and underglow.
   */
  attachVehicleLights(group, isMotorcycle = false) {
    if (isMotorcycle) {
      const headlight = new THREE.Mesh(this.sharedGeos.headlightLens, this.sharedMats.headlightLED);
      headlight.rotation.x = Math.PI / 2;
      headlight.position.set(0, 0.72, 1.05);
      group.add(headlight);

      const taillight = new THREE.Mesh(this.sharedGeos.taillightBar, this.sharedMats.taillightLED);
      taillight.scale.set(0.55, 1, 1);
      taillight.position.set(0, 0.72, -1.05);
      group.add(taillight);

      const beam = new THREE.Mesh(this.sharedGeos.lightBeam, this.sharedMats.beam);
      beam.rotation.x = -Math.PI / 2;
      beam.position.set(0, 0.52, 3.85);
      group.add(beam);

      const underglow = new THREE.Mesh(this.sharedGeos.underglow, this.sharedMats.underglowMat);
      underglow.rotation.x = -Math.PI / 2;
      underglow.scale.set(0.5, 0.5, 1);
      underglow.position.y = 0.04;
      group.add(underglow);
      return;
    }

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

    // Faisceaux lumineux sur la chaussée : cône étroit à la lampe qui s'élargit
    // au loin (apex ARRIÈRE via -π/2, base large à ~8m) — fini le triangle inversé
    for (let s of [-0.68, 0.68]) {
      const beam = new THREE.Mesh(this.sharedGeos.lightBeam, this.sharedMats.beam);
      beam.rotation.x = -Math.PI / 2;
      beam.position.set(s, 0.52, 5.1);
      group.add(beam);
    }

    // Rétroprojecteur au sol (halo néon subtil)
    const underglow = new THREE.Mesh(this.sharedGeos.underglow, this.sharedMats.underglowMat);
    underglow.rotation.x = -Math.PI / 2;
    underglow.position.y = 0.04;
    group.add(underglow);
  }

  createHighFidelityVehicle(type, colorHex = 0) {
    const group = new THREE.Group();
    const isMotorcycle = type === 'motorcycle';
    // Flotte PBR unifiée et sculptée (plus de substitution GLB blanche/disparate)
    group.userData.isGlb = false;

    // Palettes de peintures satinées riches (jamais de blanc délavé)
    const metallicColors = [0x1d4ed8, 0xdc2626, 0x334155, 0x6d28d9, 0x059669, 0xea580c, 0x1e3a8a];
    const index = typeof colorHex === 'number' ? colorHex : 0;
    const carColor = type === 'taxi_luxe'
      ? 0xeab308
      : (index > 0xff ? index : metallicColors[Math.abs(Math.floor(index)) % metallicColors.length]);

    const carPaint = new THREE.MeshStandardMaterial({
      color: carColor,
      metalness: 0.42,
      roughness: 0.34,
      envMapIntensity: 0.45
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: (type === 'taxi_luxe' || type === 'supercar') ? 0x111620 : carColor,
      metalness: 0.45,
      roughness: 0.35,
      envMapIntensity: 0.45 // Toit mat : finit l'effet blob lumineux sur carrosserie sombre
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x1e272e,
      roughness: 0.6,
      metalness: 0.4
    });

    if (type === 'supercar') {
      // 1. HYPERCAR CYBER-GT SURBAISSÉE & AÉRODYNAMIQUE (profil biseauté)
      const chassis = new THREE.Mesh(this.sharedGeos.chassisSupercar, carPaint);
      chassis.castShadow = true;
      group.add(chassis);

      // Lame avant aérodynamique (Front Splitter Carbone)
      const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.06, 0.5), darkTrimMat);
      splitter.position.set(0, 0.22, 2.25);
      group.add(splitter);

      // Verrière panoramique fumée
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.28, 1.65), this.sharedMats.tintedGlass);
      canopy.position.set(0, 0.88, -0.15);
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
      // 2. TAXI PARISIEN PROPORTIONNÉ
      const body = new THREE.Mesh(this.sharedGeos.chassisSedan, carPaint);
      group.add(body);

      const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.36, 1.72), this.sharedMats.tintedGlass);
      cabinGlass.position.set(0, 1.10, -0.22);
      group.add(cabinGlass);

      const roofCap = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.08, 1.42), roofMat);
      roofCap.position.set(0, 1.41, -0.22);
      group.add(roofCap);

      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.30, 0.08), darkTrimMat);
      grille.position.set(0, 0.52, 2.31);
      group.add(grille);

      const signBase = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.05, 0.20), darkTrimMat);
      signBase.position.set(0, 1.47, -0.2);
      const signGlow = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.14, 0.16), this.sharedMats.headlightLED);
      signGlow.position.set(0, 1.56, -0.2);
      group.add(signBase, signGlow);

      for (let s of [-0.94, 0.94]) {
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.11), darkTrimMat);
        mirror.position.set(s, 0.90, 0.68);
        group.add(mirror);
      }

    } else if (type === 'suv_urban') {
      // 3. SUV CITADIN ROBUSTE & PROPORTIONNÉ
      const lowerBody = new THREE.Mesh(this.sharedGeos.chassisSUV, carPaint);
      group.add(lowerBody);

      const skidPlate = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.16, 4.38), darkTrimMat);
      skidPlate.position.y = 0.32;
      group.add(skidPlate);

      const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.42, 2.08), this.sharedMats.tintedGlass);
      cabinGlass.position.set(0, 1.30, -0.18);
      group.add(cabinGlass);

      for (let s of [-0.72, 0.72]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.2), darkTrimMat);
        rail.position.set(s, 1.66, -0.15);
        group.add(rail);
      }

    } else {
      // 4. BERLINE SPORTIVE PROPORTIONNÉE
      const body = new THREE.Mesh(this.sharedGeos.chassisSedan, carPaint);
      group.add(body);

      const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.36, 1.72), this.sharedMats.tintedGlass);
      cabinGlass.position.set(0, 1.10, -0.22);
      group.add(cabinGlass);

      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.28, 0.08), darkTrimMat);
      grille.position.set(0, 0.52, 2.31);
      group.add(grille);

      for (let s of [-0.94, 0.94]) {
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.11), carPaint);
        mirror.position.set(s, 0.88, 0.68);
        group.add(mirror);
      }
    }

    // 4 Roues alignées sans dépassement ni étriers superflus
    const wheelPositions = [
      [-0.90, 0.36, 1.35],
      [0.90, 0.36, 1.35],
      [-0.90, 0.36, -1.35],
      [0.90, 0.36, -1.35]
    ];
    group.userData.wheelMeshes = [];

    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wx, wy, wz);

      const tire = new THREE.Mesh(this.sharedGeos.wheelTire, this.sharedMats.rubber);
      tire.rotation.z = Math.PI / 2;

      const rim = new THREE.Mesh(this.sharedGeos.wheelRim, this.sharedMats.rim);
      rim.rotation.z = Math.PI / 2;

      wheelGroup.add(tire, rim);
      group.add(wheelGroup);
      group.userData.wheelMeshes.push(wheelGroup);
    });

    this.attachVehicleLights(group, isMotorcycle);

    return group;
  }

  // --- AMBULANCE D'URGENCE RAPIDE AVEC GYROPHARES & SIRENE ---
  createAmbulance() {
    const group = new THREE.Group();
    group.userData = {
      active: false,
      speed: 25.0,
      lane: -2.7,
      wheelMeshes: [],
      strobeLights: [],
      strobeTimer: 0
    };

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.25, metalness: 0.1 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.1, metalness: 0.9 });
    const redCrossMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });
    const strobeBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0984e3,
      emissive: 0x0984e3,
      emissiveIntensity: 2.0,
      roughness: 0.15
    });
    const strobeRedMat = new THREE.MeshStandardMaterial({
      color: 0xff4757,
      emissive: 0xff4757,
      emissiveIntensity: 2.0,
      roughness: 0.15
    });

    // Caisse & cabine profilées d'ambulance (ExtrudeGeometry biseautée)
    const box = new THREE.Mesh(this.sharedGeos.chassisAmbulance, bodyMat);
    box.castShadow = true;
    group.add(box);

    // Pare-brise
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.68, 0.1), glassMat);
    windshield.position.set(0, 1.48, 1.24);
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
    const side = Math.random() > 0.5 ? 2.7 : -2.7;
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

  /**
   * Mode nuit : optiques et faisceaux rehaussés (elles deviennent la source
   * lumineuse principale avec réverbères et fenêtres éclairées).
   */
  setNightMode(night = false) {
    this.isNight = !!night;
    if (this.sharedMats) {
      this.sharedMats.beam.opacity = night ? 0.22 : 0.1;
      this.sharedMats.underglowMat.opacity = night ? 0.3 : 0.22;
      this.sharedMats.headlightLED.emissiveIntensity = night ? 1.85 : 1.6;
      this.sharedMats.taillightLED.emissiveIntensity = night ? 1.75 : 1.6;
    }
  }

  reset() {
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      if (v.userData && v.userData.isPursuitPolice) {
        this.container.remove(v);
        this.vehicles.splice(i, 1);
      } else {
        v.visible = false;
        v.userData.active = false;
        v.userData.isCrashed = false;
      }
    }
    if (this.ambulance) {
      this.ambulance.visible = false;
      this.ambulance.userData.active = false;
    }
    if (this.bossTruck) {
      this.bossTruck.visible = false;
      this.bossTruck.userData.active = false;
      this.bossTruck.userData.hp = this.bossTruck.userData.maxHp || 100;
    }
    if (this.roadblocks && this.roadblocks.length > 0) {
      this.roadblocks.forEach(rb => this.container.remove(rb));
      this.roadblocks = [];
    }
  }

  /**
   * Fait apparaître le camion blindé du Boss de convoi (mode CONVOY_BOSS)
   */
  spawnConvoyBoss(zPos = 120, roadCurveFunc = null) {
    if (!this.bossTruck) {
      const group = new THREE.Group();
      const armorMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.45, metalness: 0.72 });
      const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.5, metalness: 0.6 });
      const hazardMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.25 });
      const strobeMat = new THREE.MeshStandardMaterial({
        color: 0xff2e43,
        emissive: 0xff2e43,
        emissiveIntensity: 2.2,
        roughness: 0.15
      });

      // Caisson blindé arrière
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.35, 6.2), armorMat);
      cargo.position.set(0, 1.72, -1.2);
      cargo.castShadow = true;
      group.add(cargo);

      // Bandes de blindage latérales
      for (const sx of [-1.3, 1.3]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 5.8), hazardMat);
        rib.position.set(sx, 1.25, -1.2);
        group.add(rib);
      }

      // Cabine blindée avant + pare-buffle
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.1, 2.3), armorMat);
      cab.position.set(0, 1.58, 3.05);
      cab.castShadow = true;
      group.add(cab);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.48, 0.12), this.sharedMats.tintedGlass);
      visor.position.set(0, 1.92, 4.2);
      group.add(visor);

      const ramBumper = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.65, 0.45), trimMat);
      ramBumper.position.set(0, 0.68, 4.35);
      group.add(ramBumper);

      // Gyrophare stroboscopique rouge sur le toit
      const strobe = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.24, 0.35), strobeMat);
      strobe.position.set(0, 2.78, 3.0);
      group.add(strobe);

      // 6 roues lourdes
      const wheelMeshes = [];
      [
        [-1.32, 0.46, 3.1], [1.32, 0.46, 3.1],
        [-1.32, 0.46, -0.4], [1.32, 0.46, -0.4],
        [-1.32, 0.46, -3.1], [1.32, 0.46, -3.1]
      ].forEach(([wx, wy, wz]) => {
        const wg = new THREE.Group();
        wg.position.set(wx, wy, wz);
        const tire = new THREE.Mesh(this.sharedGeos.wheelTire, this.sharedMats.rubber);
        tire.scale.set(1.28, 1.28, 1.28);
        tire.rotation.z = Math.PI / 2;
        const rim = new THREE.Mesh(this.sharedGeos.wheelRim, this.sharedMats.rim);
        rim.scale.set(1.28, 1.28, 1.28);
        rim.rotation.z = Math.PI / 2;
        wg.add(tire, rim);
        group.add(wg);
        wheelMeshes.push(wg);
      });

      group.userData = {
        isBossTruck: true,
        isConvoyBoss: true,
        active: true,
        hp: 100,
        maxHp: 100,
        speed: 23.5,
        lane: 0,
        wheelMeshes,
        bossStrobe: strobe,
        strobeTimer: 0
      };

      this.bossTruck = group;
      this.container.add(group);
    }

    const bossX = roadCurveFunc ? roadCurveFunc(zPos) : 0;
    this.bossTruck.position.set(bossX, 0, zPos);
    this.bossTruck.rotation.set(0, 0, 0);
    this.bossTruck.visible = true;
    this.bossTruck.userData.active = true;
    this.bossTruck.userData.hp = 100;
    this.bossTruck.userData.maxHp = 100;
    return this.bossTruck;
  }

  /**
   * Initialise et met en cache les matériaux & géométries partagés de la Police (zéro lag GPU)
   */
  _initPoliceAssets() {
    if (this._policeAssets) return this._policeAssets;
    const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const makePaint = (hex, rough, metal, cc = 0.9) => isMobile
      ? new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal })
      : new THREE.MeshPhysicalMaterial({ color: hex, roughness: rough, metalness: metal, clearcoat: cc, clearcoatRoughness: 0.12 });
    this._policeAssets = {
      navy: makePaint(0x0a142e, 0.22, 0.55, 0.9),
      white: makePaint(0xf8fafc, 0.24, 0.15, 0.85),
      stripe: new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.5, roughness: 0.3 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 }),
      bumper: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.85 }),
      tire: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85, metalness: 0.1 }),
      rim: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.9 }),
      glass: this.sharedMats.tintedGlass,
      headlight: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3cc, emissiveIntensity: 2.5, roughness: 0.1 }),
      taillight: new THREE.MeshStandardMaterial({ color: 0xff2e43, emissive: 0xff2e43, emissiveIntensity: 2.0, roughness: 0.2 }),
      strobeBlue: new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0ea5e9, emissiveIntensity: 3.0, roughness: 0.15 }),
      strobeRed: new THREE.MeshStandardMaterial({ color: 0xff3838, emissive: 0xff3838, emissiveIntensity: 3.0, roughness: 0.15 }),
      beam: new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
      lowerGeo: new THREE.BoxGeometry(1.94, 0.52, 4.35),
      hoodGeo: new THREE.BoxGeometry(1.86, 0.24, 1.45),
      doorGeo: new THREE.BoxGeometry(1.98, 0.48, 1.65),
      cabinGeo: new THREE.BoxGeometry(1.74, 0.52, 1.85),
      roofGeo: new THREE.BoxGeometry(1.70, 0.08, 1.45),
      stripeGeo: new THREE.BoxGeometry(2.0, 0.10, 3.8),
      spoilerGeo: new THREE.BoxGeometry(1.76, 0.08, 0.28),
      pushBarGeo: new THREE.BoxGeometry(1.62, 0.36, 0.22),
      lightGeo: new THREE.BoxGeometry(0.36, 0.14, 0.08),
      barBaseGeo: new THREE.BoxGeometry(1.28, 0.09, 0.24),
      strobeGeo: new THREE.BoxGeometry(0.54, 0.14, 0.22),
      wheelGeo: new THREE.CylinderGeometry(0.35, 0.35, 0.26, 10),
      rimGeo: new THREE.CylinderGeometry(0.20, 0.20, 0.28, 6),
      beamGeo: new THREE.PlaneGeometry(2.6, 8.0),
      // Assets partagés pour unités SWAT lourdes et cinématique d'arrestation armée (zéro allocation à chaud)
      swatArmor: makePaint(0x090d16, 0.38, 0.65, 0.35),
      gunMetal: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.9 }),
      copUniform: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65 }),
      copPants: new THREE.MeshStandardMaterial({ color: 0x090e1a, roughness: 0.75 }),
      driverCoat: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 }),
      driverPants: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 }),
      skin: new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.6 }),
      swatBodyGeo: new THREE.BoxGeometry(2.25, 1.15, 4.95),
      swatCabGeo: new THREE.BoxGeometry(2.12, 0.68, 2.85),
      swatRamGeo: new THREE.BoxGeometry(2.15, 0.56, 0.32),
      personLegGeo: new THREE.CapsuleGeometry(0.09, 0.34, 4, 8),
      personShinGeo: new THREE.CapsuleGeometry(0.075, 0.34, 4, 8),
      personBootGeo: new THREE.BoxGeometry(0.14, 0.10, 0.24),
      personTorsoGeo: new THREE.CapsuleGeometry(0.19, 0.38, 4, 10),
      personVestGeo: new THREE.BoxGeometry(0.44, 0.42, 0.30),
      personHeadGeo: new THREE.SphereGeometry(0.15, 12, 10),
      personArmGeo: new THREE.CapsuleGeometry(0.065, 0.24, 4, 8),
      personCapGeo: new THREE.CylinderGeometry(0.17, 0.16, 0.11, 10),
      personBadgeGeo: new THREE.BoxGeometry(0.08, 0.08, 0.04),
      rifleBodyGeo: new THREE.BoxGeometry(0.08, 0.12, 0.68),
      rifleBarrelGeo: new THREE.BoxGeometry(0.04, 0.04, 0.36),
      cuffGeo: new THREE.TorusGeometry(0.07, 0.018, 6, 12),
      doorPanelGeo: new THREE.BoxGeometry(0.08, 0.68, 1.05),
      groundStrobeGeo: new THREE.CircleGeometry(2.6, 14),
      groundStrobeBlueMat: new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.26, depthWrite: false, blending: THREE.AdditiveBlending }),
      groundStrobeRedMat: new THREE.MeshBasicMaterial({ color: 0xff3838, transparent: true, opacity: 0.26, depthWrite: false, blending: THREE.AdditiveBlending })
    };
    this._policeAssets.wheelGeo.rotateZ(Math.PI / 2);
    this._policeAssets.rimGeo.rotateZ(Math.PI / 2);
    return this._policeAssets;
  }

  /**
   * Construit un Intercepteur de Police sculpté haute fidélité (chassisSedan ExtrudeGeometry profilé, 4 roues alliage, clearcoat, pare-buffle, gyrophares)
   */
  _buildPoliceCruiserMesh() {
    const a = this._initPoliceAssets();
    const car = new THREE.Group();
    const strobes = [];
    const wheelMeshes = [];

    const body = new THREE.Mesh(this.sharedGeos.chassisSedan, a.navy);
    car.add(body);

    const doors = new THREE.Mesh(a.doorGeo, a.white);
    doors.scale.set(0.95, 0.92, 0.92);
    doors.position.set(0, 0.58, -0.1);
    const roof = new THREE.Mesh(a.roofGeo, a.white);
    roof.position.set(0, 1.43, -0.22);
    const stripe = new THREE.Mesh(a.stripeGeo, a.stripe);
    stripe.scale.set(0.94, 0.85, 0.85);
    stripe.position.set(0, 0.55, 0);
    const pushBar = new THREE.Mesh(a.pushBarGeo, a.bumper);
    pushBar.position.set(0, 0.44, 2.34);
    car.add(doors, roof, stripe, pushBar);

    [
      [-0.94, 0.36, 1.36],
      [0.94, 0.36, 1.36],
      [-0.94, 0.36, -1.36],
      [0.94, 0.36, -1.36]
    ].forEach(([wx, wy, wz]) => {
      const wg = new THREE.Group();
      wg.position.set(wx, wy, wz);
      const tire = new THREE.Mesh(a.wheelGeo, a.tire);
      const rim = new THREE.Mesh(a.rimGeo, a.rim);
      wg.add(tire, rim);
      car.add(wg);
      wheelMeshes.push(wg);
    });

    [-0.64, 0.64].forEach(lx => {
      const hl = new THREE.Mesh(a.lightGeo, a.headlight);
      hl.position.set(lx, 0.56, 2.26);
      const tl = new THREE.Mesh(a.lightGeo, a.taillight);
      tl.position.set(lx, 0.62, -2.26);
      car.add(hl, tl);
    });

    const barBase = new THREE.Mesh(a.barBaseGeo, a.bumper);
    barBase.position.set(0, 1.48, -0.22);
    const sBlue = new THREE.Mesh(a.strobeGeo, a.strobeBlue);
    sBlue.position.set(-0.32, 1.54, -0.22);
    const sRed = new THREE.Mesh(a.strobeGeo, a.strobeRed);
    sRed.position.set(0.32, 1.54, -0.22);
    car.add(barBase, sBlue, sRed);
    strobes.push(sBlue, sRed);

    return { car, strobes, wheelMeshes };
  }

  /**
   * Fait apparaître un barrage de police (2 patrouilleurs bleu nuit/blanc en biais + couloir d'esquive balisé)
   */
  spawnPoliceRoadblock(zPos = 140, roadCurveFunc = null) {
    const rbGroup = new THREE.Group();
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.45, roughness: 0.4, metalness: 0.6 });
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, emissive: 0xff4500, emissiveIntensity: 0.75, roughness: 0.35 });
    const coneGeo = new THREE.ConeGeometry(0.18, 0.52, 8);

    const strobes = [];
    [
      { xOff: -3.25, angleY: 0.42 },
      { xOff: 3.25, angleY: -0.42 }
    ].forEach(({ xOff, angleY }) => {
      const { car, strobes: carStrobes } = this._buildPoliceCruiserMesh();
      car.position.set(xOff, 0, 0);
      car.rotation.y = angleY;
      rbGroup.add(car);
      strobes.push(...carStrobes);
    });

    // Cônes lumineux d'esquive délimitant le passage central (réaliste & lisible à haute vitesse)
    [-1.45, 1.45].forEach(cx => {
      [-1.4, 0.8].forEach(cz => {
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.set(cx, 0.26, cz);
        rbGroup.add(cone);
      });
    });

    // Bande de herse partielle sur un côté pour laisser un couloir d'esquive propre
    const spikeStrip = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.10, 0.36), spikeMat);
    spikeStrip.position.set(0, 0.05, 0.45);
    rbGroup.add(spikeStrip);

    const curveX = roadCurveFunc ? roadCurveFunc(zPos) : 0;
    rbGroup.position.set(curveX, 0, zPos);
    rbGroup.userData = {
      isRoadblock: true,
      active: true,
      isHit: false,
      strobes,
      strobeTimer: 0
    };

    this.container.add(rbGroup);
    this.roadblocks.push(rbGroup);
    return rbGroup;
  }

  /**
   * Construit un 4x4 Blindé Tactique SWAT sculpté (chassisSUV profilé) pour bloquer les véhicules puissants
   */
  _buildHeavySwatMesh() {
    const a = this._initPoliceAssets();
    const car = new THREE.Group();
    const strobes = [];
    const wheelMeshes = [];

    const body = new THREE.Mesh(this.sharedGeos.chassisSUV, a.swatArmor);
    body.scale.set(1.12, 1.15, 1.10);
    car.add(body);

    const stripe = new THREE.Mesh(a.stripeGeo, a.stripe);
    stripe.scale.set(1.11, 1.2, 1.05);
    stripe.position.set(0, 0.78, 0);
    const ram = new THREE.Mesh(a.swatRamGeo, a.bumper);
    ram.position.set(0, 0.56, 2.55);
    car.add(stripe, ram);

    [
      [-1.12, 0.44, 1.55],
      [1.12, 0.44, 1.55],
      [-1.12, 0.44, -1.55],
      [1.12, 0.44, -1.55]
    ].forEach(([wx, wy, wz]) => {
      const wg = new THREE.Group();
      wg.position.set(wx, wy, wz);
      const tire = new THREE.Mesh(a.wheelGeo, a.tire);
      tire.scale.set(1.25, 1.25, 1.25);
      const rim = new THREE.Mesh(a.rimGeo, a.rim);
      rim.scale.set(1.25, 1.25, 1.25);
      wg.add(tire, rim);
      car.add(wg);
      wheelMeshes.push(wg);
    });

    [-0.75, 0.75].forEach(lx => {
      const hl = new THREE.Mesh(a.lightGeo, a.headlight);
      hl.position.set(lx, 0.88, 2.49);
      const tl = new THREE.Mesh(a.lightGeo, a.taillight);
      tl.position.set(lx, 0.92, -2.49);
      car.add(hl, tl);
    });

    const barBase = new THREE.Mesh(a.barBaseGeo, a.bumper);
    barBase.position.set(0, 2.08, 0.25);
    const sBlue = new THREE.Mesh(a.strobeGeo, a.strobeBlue);
    sBlue.position.set(-0.34, 2.15, 0.25);
    const sRed = new THREE.Mesh(a.strobeGeo, a.strobeRed);
    sRed.position.set(0.34, 2.15, 0.25);
    car.add(barBase, sBlue, sRed);
    strobes.push(sBlue, sRed);

    return { car, strobes, wheelMeshes };
  }

  /**
   * Fait apparaître un intercepteur de police (ou un 4x4 Blindé SWAT si véhicule puissant)
   */
  spawnPursuitCruiser(zPos, laneX = 0, initialSpeed = 16.0, isHeavySwat = false) {
    const a = this._initPoliceAssets();
    const { car, strobes, wheelMeshes } = isHeavySwat
      ? this._buildHeavySwatMesh()
      : this._buildPoliceCruiserMesh();
    const beam = new THREE.Mesh(a.beamGeo, a.beam);
    beam.rotation.x = -Math.PI / 2;
    beam.position.set(0, 0.04, 6.0);
    car.add(beam);

    car.position.set(laneX, 0, zPos);
    car.userData = {
      active: true,
      isPursuitPolice: true,
      isHeavySwat,
      laneOffset: laneX,
      targetLaneOffset: laneX,
      laneTimer: 1.0 + Math.random() * 0.7,
      speed: initialSpeed,
      isHit: false,
      dodged: false,
      strobes,
      wheelMeshes,
      strobeTimer: Math.random() * 2.0
    };

    this.container.add(car);
    this.vehicles.push(car);
    return car;
  }

  /**
   * Simulation complète 3D d'arrestation réaliste en 4 étapes :
   * 1) Dérapage & coupure de route en V avec halos gyrophares au sol
   * 2) Ouverture des portières & déploiement des policiers armés (gilets, carabines, démarche articulée)
   * 3) Sortie du chauffeur, mains derrière la tête, mise à genoux & menottage métallique
   * 4) Verrouillage & transfert en cellule
   */
  spawnArrestCinematic(playerPos, roadCurveX = 0) {
    const a = this._initPoliceAssets();
    const cineGroup = new THREE.Group();
    cineGroup.position.set(playerPos.x, 0, playerPos.z);

    // 1. Voitures de police (Intercepteur + 4x4 SWAT) avec portières ouvrantes + halos au sol
    const { car: copCar1, strobes: strobes1, wheelMeshes: wheels1 } = this._buildPoliceCruiserMesh();
    const { car: copCar2, strobes: strobes2, wheelMeshes: wheels2 } = this._buildHeavySwatMesh();
    const allStrobes = [...strobes1, ...strobes2];
    const relRoadX = Math.max(-2.4, Math.min(2.4, roadCurveX - playerPos.x));

    const doorPivot1 = new THREE.Group();
    doorPivot1.position.set(-0.92, 0.72, 0.45);
    const doorMesh1 = new THREE.Mesh(a.doorPanelGeo, a.white);
    doorMesh1.position.set(0, 0, -0.52);
    doorPivot1.add(doorMesh1);
    copCar1.add(doorPivot1);

    const doorPivot2 = new THREE.Group();
    doorPivot2.position.set(1.06, 0.92, 0.55);
    const doorMesh2 = new THREE.Mesh(a.doorPanelGeo, a.swatArmor);
    doorMesh2.position.set(0, 0, -0.52);
    doorPivot2.add(doorMesh2);
    copCar2.add(doorPivot2);

    const groundHaloBlue = new THREE.Mesh(a.groundStrobeGeo, a.groundStrobeBlueMat);
    groundHaloBlue.rotation.x = -Math.PI / 2;
    groundHaloBlue.position.set(relRoadX + 1.4, 0.04, 4.6);
    const groundHaloRed = new THREE.Mesh(a.groundStrobeGeo, a.groundStrobeRedMat);
    groundHaloRed.rotation.x = -Math.PI / 2;
    groundHaloRed.position.set(relRoadX - 1.9, 0.04, 5.0);
    cineGroup.add(groundHaloBlue, groundHaloRed);

    // Projecteur d'hélicoptère de police balayant la scène depuis le ciel
    const heliSpotMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const heliSpot = new THREE.Mesh(new THREE.ConeGeometry(3.4, 15.0, 14, 1, true), heliSpotMat);
    heliSpot.position.set(-0.9, 7.5, 1.0);
    cineGroup.add(heliSpot);

    copCar1.position.set(relRoadX + 3.6, 0, 16.5);
    copCar2.position.set(relRoadX - 3.8, 0, 18.0);
    cineGroup.add(copCar1, copCar2);

    // Helper silhouette humaine 3D articulée (hanches, genoux, bottes, épaules, coudes, gilet, arme, menottes)
    const buildArticulatedPerson = (isCop) => {
      const p = new THREE.Group();
      const coatMat = isCop ? a.copUniform : a.driverCoat;
      const pantsMat = isCop ? a.copPants : a.driverPants;

      const bodyPivot = new THREE.Group();
      p.add(bodyPivot);

      // Jambes 2 segments (cuisse -> genou -> tibia -> botte) pour vraie marche & mise à genoux
      const makeLeg = (xOff) => {
        const hip = new THREE.Group();
        hip.position.set(xOff, 0.86, 0);
        const thigh = new THREE.Mesh(a.personLegGeo, pantsMat);
        thigh.position.set(0, -0.21, 0);
        const knee = new THREE.Group();
        knee.position.set(0, -0.43, 0);
        const shin = new THREE.Mesh(a.personShinGeo, pantsMat);
        shin.position.set(0, -0.20, 0);
        const boot = new THREE.Mesh(a.personBootGeo, a.gunMetal);
        boot.position.set(0, -0.39, 0.05);
        knee.add(shin, boot);
        hip.add(thigh, knee);
        bodyPivot.add(hip);
        return { hip, knee };
      };
      const legL = makeLeg(-0.13);
      const legR = makeLeg(0.13);

      const torso = new THREE.Mesh(a.personTorsoGeo, coatMat);
      torso.position.set(0, 1.18, 0);
      bodyPivot.add(torso);

      const head = new THREE.Mesh(a.personHeadGeo, a.skin);
      head.position.set(0, 1.62, 0);
      bodyPivot.add(head);

      const makeArm = (xOff) => {
        const shoulder = new THREE.Group();
        shoulder.position.set(xOff, 1.40, 0);
        const upper = new THREE.Mesh(a.personArmGeo, coatMat);
        upper.position.set(0, -0.15, 0);
        const elbow = new THREE.Group();
        elbow.position.set(0, -0.31, 0);
        const lower = new THREE.Mesh(a.personArmGeo, coatMat);
        lower.position.set(0, -0.15, 0);
        elbow.add(lower);
        shoulder.add(upper, elbow);
        bodyPivot.add(shoulder);
        return { shoulder, elbow };
      };
      const armL = makeArm(-0.27);
      const armR = makeArm(0.27);

      let cuffs = null;
      let rifleGroup = null;
      if (isCop) {
        const vest = new THREE.Mesh(a.personVestGeo, a.bumper);
        vest.position.set(0, 1.18, 0);
        const cap = new THREE.Mesh(a.personCapGeo, a.copUniform);
        cap.position.set(0, 1.75, 0);
        const badge = new THREE.Mesh(a.personBadgeGeo, a.gold);
        badge.position.set(0, 1.25, 0.16);
        rifleGroup = new THREE.Group();
        const rifleBody = new THREE.Mesh(a.rifleBodyGeo, a.gunMetal);
        rifleBody.position.set(0, -0.22, 0.28);
        const rifleBarrel = new THREE.Mesh(a.rifleBarrelGeo, a.gunMetal);
        rifleBarrel.position.set(0, -0.20, 0.72);
        const laserBeam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.01, 2.1, 6),
          a.strobeRed
        );
        laserBeam.rotation.x = Math.PI / 2;
        laserBeam.position.set(0, -0.20, 1.85);
        rifleGroup.add(rifleBody, rifleBarrel, laserBeam);
        armR.elbow.add(rifleGroup);
        bodyPivot.add(vest, cap, badge);
      } else {
        cuffs = new THREE.Mesh(a.cuffGeo, a.rim);
        cuffs.position.set(0, 1.38, -0.16);
        cuffs.visible = false;
        bodyPivot.add(cuffs);
      }

      p.userData = { bodyPivot, armL, armR, legL, legR, head, cuffs, rifleGroup };
      return p;
    };

    const cop1 = buildArticulatedPerson(true);
    cop1.scale.setScalar(1.18);
    cop1.position.set(relRoadX + 1.1, 0, 4.3);
    cop1.rotation.y = Math.PI;
    cop1.visible = false;

    const cop2 = buildArticulatedPerson(true);
    cop2.scale.setScalar(1.18);
    cop2.position.set(relRoadX - 1.7, 0, 4.7);
    cop2.rotation.y = Math.PI;
    cop2.visible = false;

    const driver = buildArticulatedPerson(false);
    driver.scale.setScalar(1.18);
    driver.position.set(-0.9, 0, 0.3);
    driver.rotation.y = 0;
    driver.visible = false;

    cineGroup.add(cop1, cop2, driver);
    this.container.add(cineGroup);

    let elapsed = 0;
    return {
      group: cineGroup,
      update: (dt) => {
        elapsed += dt;

        // Étape 1 (0.0 -> 1.0s) : Dérapage contrôlé & coupure de route en V
        const carT = Math.min(1, elapsed / 1.0);
        const easeOut = 1 - Math.pow(1 - carT, 3);
        copCar1.position.z = THREE.MathUtils.lerp(16.5, 4.7, easeOut);
        copCar1.position.x = THREE.MathUtils.lerp(relRoadX + 3.6, relRoadX + 1.55, easeOut);
        copCar1.rotation.y = THREE.MathUtils.lerp(-0.15, -0.72, easeOut);
        copCar1.rotation.z = Math.sin(carT * Math.PI) * 0.08;

        copCar2.position.z = THREE.MathUtils.lerp(18.0, 5.2, easeOut);
        copCar2.position.x = THREE.MathUtils.lerp(relRoadX - 3.8, relRoadX - 2.05, easeOut);
        copCar2.rotation.y = THREE.MathUtils.lerp(0.15, 0.58, easeOut);
        copCar2.rotation.z = -Math.sin(carT * Math.PI) * 0.07;

        if (carT < 1) {
          [...wheels1, ...wheels2].forEach(w => w.children.forEach(pt => { pt.rotation.x += dt * 22 * (1 - carT); }));
        }

        // Étape 2 (1.0 -> 2.4s) : Portières s'ouvrent, policiers armés descendent et avancent en joue
        const doorT = Math.min(1, Math.max(0, (elapsed - 0.9) / 0.45));
        doorPivot1.rotation.y = -doorT * 1.05;
        doorPivot2.rotation.y = doorT * 1.05;

        if (elapsed >= 1.15) {
          cop1.visible = true;
          cop2.visible = true;
          const walkT = Math.min(1, (elapsed - 1.15) / 1.2);
          cop1.position.z = THREE.MathUtils.lerp(4.3, 2.05, walkT);
          cop1.position.x = THREE.MathUtils.lerp(relRoadX + 1.1, -0.35, walkT);
          cop2.position.z = THREE.MathUtils.lerp(4.7, 2.15, walkT);
          cop2.position.x = THREE.MathUtils.lerp(relRoadX - 1.7, -2.05, walkT);

          const gait = walkT < 1 ? Math.sin(elapsed * 11) : 0;
          [cop1, cop2].forEach(c => {
            c.userData.legL.hip.rotation.x = gait * 0.55;
            c.userData.legL.knee.rotation.x = Math.max(0, -gait) * 0.55;
            c.userData.legR.hip.rotation.x = -gait * 0.55;
            c.userData.legR.knee.rotation.x = Math.max(0, gait) * 0.55;
            c.userData.armR.shoulder.rotation.x = -1.35;
            c.userData.armR.elbow.rotation.x = -0.35;
            c.userData.armL.shoulder.rotation.x = -1.15;
            c.userData.armL.elbow.rotation.x = -0.55;
          });
        }

        // Étape 3 (2.4 -> 4.3s) : Chauffeur sort, mains derrière la tête, se met à genoux, menottage
        if (elapsed >= 2.4) {
          driver.visible = true;
          const exitT = Math.min(1, (elapsed - 2.4) / 0.65);
          driver.position.x = THREE.MathUtils.lerp(-0.85, -1.35, exitT);
          driver.rotation.y = THREE.MathUtils.lerp(0.4, 0.0, exitT);

          const handsT = Math.min(1, Math.max(0, (elapsed - 2.6) / 0.7));
          driver.userData.armL.shoulder.rotation.z = -handsT * 2.15;
          driver.userData.armR.shoulder.rotation.z = handsT * 2.15;
          driver.userData.armL.elbow.rotation.z = -handsT * 1.35;
          driver.userData.armR.elbow.rotation.z = handsT * 1.35;

          // Mise à genoux réaliste avec flexion hanches + genoux
          const kneelT = Math.min(1, Math.max(0, (elapsed - 3.2) / 0.65));
          driver.userData.bodyPivot.position.y = -kneelT * 0.42;
          driver.userData.legL.hip.rotation.x = -kneelT * 1.25;
          driver.userData.legL.knee.rotation.x = kneelT * 1.45;
          driver.userData.legR.hip.rotation.x = -kneelT * 1.25;
          driver.userData.legR.knee.rotation.x = kneelT * 1.45;

          // Policier 1 s'approche derrière le chauffeur et pose les menottes
          const cuffT = Math.min(1, Math.max(0, (elapsed - 3.55) / 0.75));
          if (cuffT > 0) {
            cop1.position.z = THREE.MathUtils.lerp(2.05, 0.82, cuffT);
            cop1.position.x = THREE.MathUtils.lerp(-0.35, -1.15, cuffT);
            cop1.userData.bodyPivot.position.y = -cuffT * 0.18;
            if (cuffT > 0.7 && driver.userData.cuffs) {
              driver.userData.cuffs.visible = true;
            }
          }
        }

        // Halos gyrophares alternés doux + balayage projecteur hélico
        const pulse = Math.sin(elapsed * 14.0) > 0;
        allStrobes.forEach((s, idx) => { s.visible = (idx % 2 === 0) ? pulse : !pulse; });
        groundHaloBlue.visible = pulse;
        groundHaloRed.visible = !pulse;
        heliSpot.position.x = -0.9 + Math.sin(elapsed * 2.2) * 0.75;
        heliSpot.rotation.z = Math.sin(elapsed * 2.2) * 0.08;
      },
      dispose: () => {
        this.container.remove(cineGroup);
      }
    };
  }

  spawnAhead(playerZ, roadCurveFunc) {
    // Compter les véhicules déjà actifs sans allouer de tableau
    let activeCount = 0;
    for (let i = 0; i < this.vehicles.length; i++) {
      if (this.vehicles[i].userData.active) activeCount++;
    }
    if (activeCount >= this.maxActiveVehicles) return;

    // Plage d'apparition aérée et lointaine pour ne pas étouffer le joueur
    const minZ = playerZ + 85;
    const maxZ = playerZ + 240;

    for (let i = 0; i < this.vehicles.length; i++) {
      let v = this.vehicles[i];
      if (v.userData.isPursuitPolice) continue;
      if (!v.userData.active && (!v.visible || v.position.z < playerZ - 30)) {
        // Vérifier qu'aucun autre véhicule n'est trop proche de ce nouveau point
        const candidateZ = minZ + Math.random() * (maxZ - minZ);
        const tooClose = this.vehicles.some(other => other.userData.active && Math.abs(other.position.z - candidateZ) < 65);
        if (tooClose) continue;

        // Upgrade lazy-loaded .glb model when modelBank finishes async loading
        // Garder notre flotte PBR unifiée (pas de substitution GLB blanche/brute en cours de route)

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

    let needsPurge = false;
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
          if (v.userData.isPursuitPolice) {
            this.container.remove(v);
            needsPurge = true;
          }
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
        // Poursuite policière active : ajuste sa vitesse pour rattraper, bloquer et arrêter le joueur (jamais fuir au loin !)
        if (v.userData.isPursuitPolice) {
          const dzRel = v.position.z - playerZ;
          let targetCopSpeed = bikeSpeed;
          if (dzRel < 1.5) {
            targetCopSpeed = Math.max(bikeSpeed + 10.5, 26.0); // Rattrape par derrière
          } else if (dzRel > 22.0) {
            targetCopSpeed = Math.max(6.0, bikeSpeed * 0.45); // Ralentit devant pour couper la route
          } else {
            targetCopSpeed = Math.max(9.0, bikeSpeed * 0.88); // Reste à portée d'interception
          }
          v.userData.speed = THREE.MathUtils.lerp(v.userData.speed || bikeSpeed, targetCopSpeed, Math.min(1.0, delta * 3.5));
        }
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

        // Suivre la trajectoire de la route en restant dans sa voie (+2.7m ou -2.7m)
        const curveX = roadCurveFunc ? roadCurveFunc(v.position.z) : 0;
        if (v.userData.isPursuitPolice) {
          v.userData.laneTimer = (v.userData.laneTimer || 0) - delta;
          if (v.userData.laneTimer <= 0) {
            v.userData.laneTimer = 1.0 + Math.random() * 0.8;
            const relX = bikeX - curveX;
            v.userData.targetLaneOffset = THREE.MathUtils.clamp(relX + (Math.random() - 0.5) * 1.4, -4.4, 4.4);
          }
          const prevLane = v.userData.laneOffset || 0;
          const laneDamp = 1.0 - Math.exp(-3.2 * delta);
          v.userData.laneOffset = THREE.MathUtils.lerp(prevLane, v.userData.targetLaneOffset || 0, laneDamp);
          v.position.x = curveX + v.userData.laneOffset;
          const latVel = (prevLane - v.userData.laneOffset) / Math.max(delta, 0.001);
          const targetRollZ = THREE.MathUtils.clamp(latVel * 0.045, -0.14, 0.14);
          v.rotation.z = THREE.MathUtils.lerp(v.rotation.z, targetRollZ, 1.0 - Math.exp(-10.0 * delta));

          v.userData.strobeTimer = (v.userData.strobeTimer || 0) + delta;
          const toggle = Math.sin(v.userData.strobeTimer * 26.0) > 0;
          if (v.userData.strobes) {
            v.userData.strobes.forEach((s, idx) => { s.visible = (idx % 2 === 0) ? toggle : !toggle; });
          }
        } else {
          const targetX = curveX + v.userData.lane;
          v.position.x = targetX;
        }

        // Orientation naturelle exactement sur la tangente de la courbure
        const aheadX = roadCurveFunc ? roadCurveFunc(v.position.z + 3.0) : 0;
        const targetRotY = Math.atan2(aheadX - curveX, 3.0);
        v.rotation.y += (targetRotY - v.rotation.y) * Math.min(1.0, delta * 12.0);

        // Détection de collision physique avec le bolide du joueur (sauf poursuite gérée dans main.js)
        if (!v.userData.isPursuitPolice) {
          const dZ = Math.abs(v.position.z - playerZ);
          const dX = Math.abs(v.position.x - bikeX);

          if (dZ < 3.0 && dX < 1.65) {
            const hitDirX = bikeX < v.position.x ? 1 : -1;
            this.triggerCrash(v, bikeSpeed, hitDirX);
            if (onVehicleCollision) {
              onVehicleCollision(v, isPlayerInvulnerable);
            }
          }
        }

        // Recycler si dépassé loin derrière le joueur
        if (v.position.z < playerZ - 35) {
          v.visible = false;
          v.userData.active = false;
          if (v.userData.isPursuitPolice) {
            this.container.remove(v);
            needsPurge = true;
          }
        }
      }
    });

    // Purger les anciens intercepteurs de police désactivés uniquement si nécessaire (zéro allocation par frame)
    if (needsPurge) {
      this.vehicles = this.vehicles.filter(v => !(v.userData && v.userData.isPursuitPolice && !v.userData.active && !v.userData.isCrashed));
    }

    // 3. Animation et déplacement de l'ambulance d'urgence
    if (this.ambulance && this.ambulance.userData.active) {
      const amb = this.ambulance;
      amb.position.z += amb.userData.speed * delta;
      const curveX = roadCurveFunc ? roadCurveFunc(amb.position.z) : 0;
      const aheadX = roadCurveFunc ? roadCurveFunc(amb.position.z + 3.0) : 0;
      amb.position.x = curveX + amb.userData.lane;
      amb.rotation.y = Math.atan2(aheadX - curveX, 3.0);

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

    // 4. Animation et déplacement du Boss de convoi (CONVOY_BOSS)
    if (this.bossTruck && this.bossTruck.userData.active) {
      const boss = this.bossTruck;
      boss.position.z += boss.userData.speed * delta;
      const curveX = roadCurveFunc ? roadCurveFunc(boss.position.z) : 0;
      const aheadX = roadCurveFunc ? roadCurveFunc(boss.position.z + 3.0) : 0;
      boss.position.x = curveX + (boss.userData.lane || 0);
      boss.rotation.y = Math.atan2(aheadX - curveX, 3.0);

      boss.userData.strobeTimer = (boss.userData.strobeTimer || 0) + delta;
      if (boss.userData.bossStrobe) {
        boss.userData.bossStrobe.visible = Math.sin(boss.userData.strobeTimer * 18.0) > 0;
      }
      if (boss.userData.wheelMeshes) {
        boss.userData.wheelMeshes.forEach(w => {
          w.children.forEach(part => part.rotation.x += delta * 22.0);
        });
      }
      if (boss.userData.hp <= 0) {
        boss.visible = false;
        boss.userData.active = false;
      }
    }

    // 5. Barrages de police (MANHUNT / POURSUITE) : éjection physique si heurté, gyrophares + alignement courbe + recyclage
    if (this.roadblocks && this.roadblocks.length > 0) {
      for (let i = this.roadblocks.length - 1; i >= 0; i--) {
        const rb = this.roadblocks[i];
        if (rb.userData.isCrashed) {
          rb.userData.crashVelY -= 28.0 * delta;
          rb.position.x += (rb.userData.crashVelX || 0) * delta;
          rb.position.y += (rb.userData.crashVelY || 0) * delta;
          rb.position.z += (rb.userData.crashVelZ || 0) * delta;
          rb.rotation.x += (rb.userData.crashSpinX || 0) * delta;
          rb.rotation.y += (rb.userData.crashSpinY || 0) * delta;
          rb.rotation.z += (rb.userData.crashSpinZ || 0) * delta;
          if (rb.position.y < -6) {
            rb.visible = false;
            this.container.remove(rb);
            this.roadblocks.splice(i, 1);
          }
          continue;
        }
        if (!rb.userData.active) continue;

        const curveX = roadCurveFunc ? roadCurveFunc(rb.position.z) : 0;
        const aheadX = roadCurveFunc ? roadCurveFunc(rb.position.z + 3.0) : 0;
        rb.position.x = curveX;
        rb.rotation.y = Math.atan2(aheadX - curveX, 3.0);

        rb.userData.strobeTimer = (rb.userData.strobeTimer || 0) + delta;
        const toggle = Math.sin(rb.userData.strobeTimer * 24.0) > 0;
        if (rb.userData.strobes) {
          rb.userData.strobes.forEach((s, idx) => {
            s.visible = (idx % 2 === 0) ? toggle : !toggle;
          });
        }

        if (rb.position.z < playerZ - 35) {
          rb.userData.active = false;
          rb.visible = false;
          this.container.remove(rb);
          this.roadblocks.splice(i, 1);
        }
      }
    }
  }
}

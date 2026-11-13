/**
 * Carnage Cruise - Générateur d'Environnements Urbains 3D Français
 * Génération de rues courbées (virages gauche/droite), carrefours, mobilier urbain,
 * et Arche spectaculaire de Ligne d'Arrivée avec effets de victoire.
 */

import * as THREE from 'three';
import { textureFactory } from '../gfx/TextureFactory.js';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.cityTheme = null;
    this.chunks = [];
    this.chunkLength = 60; // 60 mètres par tronçon
    this.totalChunks = 6;
    this.landmark = null;
    this.finishArch = null;
    this.finishDistance = 1400; // Courses réduites et rythmées à 1400 mètres pour un rythme arcade intense
    this.finishReached = false;
    this.animTime = 0;
    this.animatedFlags = [];

    this.container = new THREE.Group();
    this.scene.add(this.container);

    // Géométries partagées
    this.sharedGeos = {
      road: new THREE.PlaneGeometry(8.4, this.chunkLength),
      sidewalk: new THREE.BoxGeometry(3.5, 0.25, this.chunkLength),
      curb: new THREE.BoxGeometry(0.15, 0.3, this.chunkLength),
      stripe: new THREE.PlaneGeometry(0.2, 3.5),
      crosswalkStripe: new THREE.PlaneGeometry(0.5, 3.0),
      table: new THREE.CylinderGeometry(0.5, 0.5, 0.04, 10),
      tableLeg: new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6),
      parasol: new THREE.ConeGeometry(1.2, 0.45, 8),
      parasolPole: new THREE.CylinderGeometry(0.04, 0.04, 2.0, 6),
      treeTrunk: new THREE.CylinderGeometry(0.16, 0.22, 1.8, 6),
      // Feuillage organique : icosphère perturbée (silhouette touffue crédible
      // au lieu d'une sphère facettée « ampoule »)
      treeFoliage: (() => {
        const g = new THREE.IcosahedronGeometry(1.2, 1);
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const n = 0.82 + Math.random() * 0.38;
          pos.setXYZ(i, pos.getX(i) * n, pos.getY(i) * n * 0.9, pos.getZ(i) * n);
        }
        g.computeVertexNormals();
        return g;
      })(),
      palmTrunk: new THREE.CylinderGeometry(0.18, 0.26, 4.0, 6),
      palmLeaf: new THREE.BoxGeometry(0.3, 0.05, 2.2),
      lampBase: new THREE.CylinderGeometry(0.18, 0.24, 0.7, 8),
      lampPost: new THREE.CylinderGeometry(0.06, 0.09, 3.6, 8),
      lampArm: new THREE.CylinderGeometry(0.04, 0.04, 0.65, 6),
      lampCap: new THREE.ConeGeometry(0.22, 0.14, 6),
      lampBulb: new THREE.CylinderGeometry(0.14, 0.10, 0.26, 6),
      mailbox: new THREE.BoxGeometry(0.4, 0.7, 0.35),
      romanColumn: new THREE.CylinderGeometry(0.28, 0.32, 4.2, 8),
      romanCapital: new THREE.BoxGeometry(0.85, 0.35, 0.85),
      amphora: new THREE.CylinderGeometry(0.22, 0.15, 0.9, 8),
      amphoraBelly: new THREE.SphereGeometry(0.35, 8, 8),
      balconyBase: new THREE.BoxGeometry(0.5, 0.1, 3.2),
      balconyRailing: new THREE.BoxGeometry(0.08, 0.55, 3.2),
      storeSign: new THREE.BoxGeometry(2.4, 0.45, 0.12),
      // Stands de rue (primeurs, bouquinistes, marchand ambulant, fleuriste)
      stallCrate: new THREE.BoxGeometry(0.55, 0.22, 0.4),
      stallCounter: new THREE.BoxGeometry(1.0, 0.76, 1.8),
      stallAwning: new THREE.BoxGeometry(1.2, 0.06, 2.0),
      stallAwningPole: new THREE.CylinderGeometry(0.025, 0.025, 1.9, 6),
      stallWheel: new THREE.CylinderGeometry(0.32, 0.32, 0.06, 12),
      stallCloche: new THREE.SphereGeometry(0.18, 8, 8),
      bookRow: new THREE.BoxGeometry(0.24, 0.35, 1.8),
      flowerBucket: new THREE.CylinderGeometry(0.16, 0.11, 0.42, 8)
    };
    this.sharedMats = null;
  }

  initSharedMaterials(cityDef) {
    if (this.isRuinsMode) {
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.95, metalness: 0.05 });
      const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x221a16, roughness: 0.95, metalness: 0.05 });
      const curbMat = new THREE.MeshStandardMaterial({ color: 0x2e2522, roughness: 0.9 });
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0x3d3835, roughness: 0.95, opacity: 0.35, transparent: true });

      this.sharedMats = {
        road: roadMat,
        sidewalk: sidewalkMat,
        curb: curbMat,
        stripe: stripeMat,
        mast: new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: 0.85 }),
        roof: new THREE.MeshToonMaterial({ color: 0x121214, gradientMap: textureFactory.getToonGradientMap() }),
        buildingPalette: [0x161618, 0x202023, 0x1b1312, 0x271d1a, 0x2f2420, 0x111113].map(c =>
          new THREE.MeshToonMaterial({ color: c, gradientMap: textureFactory.getToonGradientMap() })
        ),
        rubbleMat: new THREE.MeshStandardMaterial({ color: 0x2d2d30, roughness: 0.95 }),
        wreckMat: new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.92, metalness: 0.35 }),
        craterRimMat: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.98 }),
        craterMagmaMat: new THREE.MeshBasicMaterial({ color: 0xff3838 })
      };
      return;
    }

    let roadMat, sidewalkMat, curbMat, stripeMat;

    // Toutes les étapes sont des villes authentiques avec routes en bitume haute fidélité
    const roadTex = textureFactory.getRoadTexture();
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(1, this.chunkLength / 14);

    const sidewalkTex = textureFactory.getSidewalkTexture();
    sidewalkTex.wrapS = THREE.RepeatWrapping;
    sidewalkTex.wrapT = THREE.RepeatWrapping;
    sidewalkTex.repeat.set(1.5, this.chunkLength / 4);

    roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.85,
      metalness: 0.05
    });
    sidewalkMat = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.9,
      metalness: 0.05
    });
    curbMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.7 });
    // Marquage routier ÉCLAIRÉ : un blanc non éclairé (MeshBasic) devient un patch
    // lumineux flottant sur le bitume. Un standard matériau reçoit lumière, ombres
    // et brume comme le reste de la chaussée (calibrage anti « lumière bizarre »).
    stripeMat = new THREE.MeshStandardMaterial({ color: 0xf1f3f5, roughness: 0.85, metalness: 0.0 });

    const hexColorStr = '#' + (cityDef.buildingColors?.[0] || 0xdfe4ea).toString(16).padStart(6, '0');
    const roofColorStr = '#' + (cityDef.roofColor || 0x576574).toString(16).padStart(6, '0');
    const facadeTex = textureFactory.getHaussmannFacadeTexture(hexColorStr, roofColorStr);

    const awningTexRed = textureFactory.getAwningTexture('#e74c3c');
    const awningTexBlue = textureFactory.getAwningTexture('#2980b9');

    this.sharedMats = {
      road: roadMat,
      sidewalk: sidewalkMat,
      curb: curbMat,
      stripe: stripeMat,
      redLight: new THREE.MeshBasicMaterial({ color: 0xff3838 }),
      amberLight: new THREE.MeshBasicMaterial({ color: 0x57606f }),
      greenLight: new THREE.MeshBasicMaterial({ color: 0x2f3542 }),
      mast: new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.5, metalness: 0.2 }),
      trafficBox: new THREE.MeshToonMaterial({ color: 0x1e272e, gradientMap: textureFactory.getToonGradientMap() }),
      roof: new THREE.MeshToonMaterial({ color: cityDef.roofColor || 0x576574, gradientMap: textureFactory.getToonGradientMap() }),
      buildingPalette: (cityDef.buildingColors || [0xdfe4ea, 0xced6e0]).map(c =>
        new THREE.MeshToonMaterial({ color: c, gradientMap: textureFactory.getToonGradientMap() })
      ),
      facade: new THREE.MeshStandardMaterial({
        map: facadeTex,
        roughness: 0.8,
        metalness: 0.05
      }),
      awningRed: new THREE.MeshStandardMaterial({
        map: awningTexRed,
        roughness: 0.7
      }),
      awningBlue: new THREE.MeshStandardMaterial({
        map: awningTexBlue,
        roughness: 0.7
      }),
      balcony: new THREE.MeshStandardMaterial({
        color: 0x2d3436,
        metalness: 0.8,
        roughness: 0.25
      }),
      storeSign: new THREE.MeshStandardMaterial({
        color: cityDef.accentColor || 0xff4757,
        emissive: cityDef.accentColor || 0xff4757,
        emissiveIntensity: 0.35,
        roughness: 0.4
      }),
      storeSigns: Array.from({ length: 10 }, (_, i) => new THREE.MeshStandardMaterial({
        map: textureFactory.getStoreSignTexture(cityDef.id || 'paris', i),
        roughness: 0.4,
        emissive: 0xffffff,
        emissiveIntensity: 0.12
      })),
      foliage1: new THREE.MeshToonMaterial({ color: 0x27ae60, gradientMap: textureFactory.getToonGradientMap() }),
      foliage2: new THREE.MeshToonMaterial({ color: 0x1e8449, gradientMap: textureFactory.getToonGradientMap() }),
      wood: new THREE.MeshToonMaterial({ color: 0x5d4037, gradientMap: textureFactory.getToonGradientMap() }),
      lamp: new THREE.MeshToonMaterial({ color: 0x2d3740, gradientMap: textureFactory.getToonGradientMap() }),
      lampBulb: new THREE.MeshBasicMaterial({ color: 0xfff1d0 }),
      yellow: new THREE.MeshToonMaterial({ color: 0xf1c40f, gradientMap: textureFactory.getToonGradientMap() }),
      marble: new THREE.MeshToonMaterial({ color: 0xf5f6fa, gradientMap: textureFactory.getToonGradientMap() }),
      terracotta: new THREE.MeshToonMaterial({ color: 0xd35400, gradientMap: textureFactory.getToonGradientMap() }),
      lawn: new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.85 }),
      fence: new THREE.MeshStandardMaterial({ color: 0x1e372f, roughness: 0.5, metalness: 0.5 }),
      granite: new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.8 }),
      fountainWater: new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.2, metalness: 0.3 }),
      flower1: new THREE.MeshStandardMaterial({ color: 0xe84393, roughness: 0.7 }),
      flower2: new THREE.MeshStandardMaterial({ color: 0xfdcb6e, roughness: 0.7 }),
      plaza: new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.8 }),
      bronzeStatue: new THREE.MeshStandardMaterial({ color: 0x4a3728, metalness: 0.75, roughness: 0.35 }),
      benchWood: new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 }),
      metalCart: new THREE.MeshStandardMaterial({ color: 0x10ac84, roughness: 0.35, metalness: 0.5 }),
      metalZinc: new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.4, metalness: 0.6 }),
      chromeCloche: new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.2, metalness: 0.9 }),
      fruitApple: new THREE.MeshToonMaterial({ color: 0xe74c3c, gradientMap: textureFactory.getToonGradientMap() }),
      fruitOrange: new THREE.MeshToonMaterial({ color: 0xe67e22, gradientMap: textureFactory.getToonGradientMap() }),
      fruitLemon: new THREE.MeshToonMaterial({ color: 0xf1c40f, gradientMap: textureFactory.getToonGradientMap() }),
      flowerRed: new THREE.MeshToonMaterial({ color: 0xff4757, gradientMap: textureFactory.getToonGradientMap() }),
      flowerYellow: new THREE.MeshToonMaterial({ color: 0xfffa65, gradientMap: textureFactory.getToonGradientMap() }),
      flowerPurple: new THREE.MeshToonMaterial({ color: 0xa55eea, gradientMap: textureFactory.getToonGradientMap() }),
      bookCovers: new THREE.MeshToonMaterial({ color: 0x2c3e50, gradientMap: textureFactory.getToonGradientMap() }),
      chalkboard: new THREE.MeshStandardMaterial({ color: 0x222f3e, roughness: 0.9 })
    };
  }

  setCity(cityDef, finishDistance = null, isRuins = false) {
    this.isRuinsMode = !!isRuins || !!cityDef.isRuinsMode;
    this.cityTheme = cityDef;
    this.disasterType = cityDef.disasterType || (cityDef.isNuclearMission ? 'NUCLEAR' : (cityDef.isDamMission ? 'DAM' : (cityDef.isMountainMission ? 'MOUNTAIN' : 'STREET')));
    this.isCataclysmMission = this.disasterType !== 'STREET';
    this.isNuclearMission = this.disasterType === 'NUCLEAR' || !!cityDef.isNuclearMission;
    this.isDamMission = this.disasterType === 'DAM' || !!cityDef.isDamMission;
    this.isMountainMission = this.disasterType === 'MOUNTAIN' || !!cityDef.isMountainMission;
    this.delugeActive = false;
    this.delugeZ = 600;
    this.avalancheActive = false;
    this.mountainBoulders = [];
    this.speedBumps = [];

    if (finishDistance) {
      this.finishDistance = finishDistance;
    } else if (this.isCataclysmMission) {
      this.finishDistance = 1350;
    } else {
      this.finishDistance = 1400; // Trajets raccourcis à 1400m
    }
    this.finishReached = false;
    this.animatedFlags = [];

    // Matériaux partagés et optimisés pour le GPU
    this.initSharedMaterials(cityDef);

    // Nettoyer la scène
    while (this.container.children.length > 0) {
      this.container.remove(this.container.children[0]);
    }
    this.chunks = [];

    // Monument lointain
    this.createCityLandmark(cityDef);

    // Initialiser les tronçons avec virages doux
    for (let i = 0; i < this.totalChunks; i++) {
      const zOffset = i * this.chunkLength;
      const chunk = this.createStreetChunk(zOffset, i);
      this.chunks.push(chunk);
      this.container.add(chunk);
    }

    // Créer l'Arche de Ligne d'Arrivée
    this.createFinishArch(this.finishDistance);
  }

  // Calcul mathématique de la courbure de la rue selon Z (virages gauche/droite)
  getRoadCenterX(z) {
    // Villes à route droite (désert, autoroute) : pas de virages
    if (this.cityTheme && this.cityTheme.roadStraight) return 0;
    // Ondulation sinusoïdale douce de boulevard (+/- 1.8m)
    return Math.sin(z * 0.012) * 1.8 + Math.sin(z * 0.005) * 1.2;
  }

  getRoadAngle(z) {
    // Dérivée de la courbure pour orienter la moto et la caméra dans les virages
    const delta = 1.0;
    const x1 = this.getRoadCenterX(z - delta);
    const x2 = this.getRoadCenterX(z + delta);
    return Math.atan2(x2 - x1, delta * 2);
  }

  createCityLandmark(cityDef) {
    if (this.landmark) {
      this.scene.remove(this.landmark);
      this.landmark = null;
    }

    const lmGroup = new THREE.Group();
    const cityId = cityDef.id;

    if (cityDef.isNuclearMission) {
      // --- CENTRALE NUCLÉAIRE & TOURS DE REFROIDISSEMENT GÉANTES (AU CENTRE À Z = 600) ---
      const nucGroup = new THREE.Group();
      nucGroup.position.set(0, 0, 600);

      const concreteMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.9, metalness: 0.1 });
      const reactorMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.7, metalness: 0.2 });
      const hazardGlowMat = new THREE.MeshBasicMaterial({ color: 0x2ed573 });
      const beaconRedMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });
      const corePulsingMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });

      // Tour de refroidissement Gauche (-24m)
      const tower1 = new THREE.Mesh(new THREE.CylinderGeometry(14, 22, 54, 24, 1, true), concreteMat);
      tower1.position.set(-24, 27, 0);
      nucGroup.add(tower1);

      // Tour de refroidissement Droite (+24m)
      const tower2 = new THREE.Mesh(new THREE.CylinderGeometry(14, 22, 54, 24, 1, true), concreteMat);
      tower2.position.set(24, 27, 0);
      nucGroup.add(tower2);

      // Panaches de vapeur radioactive verte / blanche
      const steamMat = new THREE.MeshBasicMaterial({ color: 0x7bed9f, transparent: true, opacity: 0.55 });
      const steam1 = new THREE.Mesh(new THREE.SphereGeometry(16, 12, 12), steamMat);
      steam1.position.set(-24, 62, 0);
      steam1.scale.set(1.1, 1.8, 1.1);
      const steam2 = new THREE.Mesh(new THREE.SphereGeometry(16, 12, 12), steamMat);
      steam2.position.set(24, 62, 0);
      steam2.scale.set(1.1, 1.8, 1.1);
      nucGroup.add(steam1, steam2);

      // Barrières de sécurité périmétrique
      const gateGroup = new THREE.Group();
      gateGroup.position.set(0, 0, -25);
      const gatePillarL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.5, 0.8), concreteMat);
      gatePillarL.position.set(-4.5, 2.25, 0);
      const gatePillarR = gatePillarL.clone();
      gatePillarR.position.x = 4.5;
      const barrierBar = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xff3838 }));
      barrierBar.position.set(0, 1.6, 0);
      gateGroup.add(gatePillarL, gatePillarR, barrierBar);
      nucGroup.add(gateGroup);

      // Dôme du réacteur nucléaire (Bâtiment réacteur EPR au centre)
      const domeGroup = new THREE.Group();
      domeGroup.position.set(0, 0, 20); // z = 620
      const baseBuilding = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 18, 20), reactorMat);
      baseBuilding.position.y = 9;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(15, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2), reactorMat);
      dome.position.y = 18;
      
      // Balise d'alerte rouge au sommet du dôme
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), beaconRedMat);
      beacon.position.y = 33.5;
      domeGroup.add(baseBuilding, dome, beacon);

      // Cœur radioactif central incandescent
      const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(5.0, 16, 16), corePulsingMat);
      coreMesh.position.set(0, 12, 0);
      domeGroup.add(coreMesh);

      // Symbole radioactif géant ☢️
      const radCore = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.4, 16), hazardGlowMat);
      radCore.position.set(0, 14, 15.2);
      radCore.rotation.x = Math.PI / 2;
      domeGroup.add(radCore);

      nucGroup.add(domeGroup);
      this.nuclearTowers = [tower1, tower2];
      this.nuclearSteam = [steam1, steam2];
      this.nuclearGate = gateGroup;
      this.nuclearReactorGroup = domeGroup;
      this.nuclearCoreMesh = coreMesh;
      lmGroup.add(nucGroup);
    } else if (this.isDamMission || cityDef.disasterType === 'DAM') {
      // --- MÉGA-BARRAGE HYDROÉLECTRIQUE VOÛTE (AU CENTRE À Z = 600) ---
      const damGroup = new THREE.Group();
      damGroup.position.set(0, 0, 600);

      const concreteMat = new THREE.MeshStandardMaterial({ color: 0x8395a7, roughness: 0.85, metalness: 0.15 });
      const damGateMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.4, metalness: 0.6 });
      const waterSurfaceMat = new THREE.MeshBasicMaterial({ color: 0x0984e3, transparent: true, opacity: 0.85 });
      const foamWaterMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3, transparent: true, opacity: 0.9 });
      const beaconYellowMat = new THREE.MeshBasicMaterial({ color: 0xfeca57 });

      // 1. Mur voûté principal gauche (-17m) et droit (+17m)
      const wallL = new THREE.Mesh(new THREE.BoxGeometry(28, 42, 12), concreteMat);
      wallL.position.set(-17, 21, 0);
      wallL.rotation.y = 0.08;
      const wallR = new THREE.Mesh(new THREE.BoxGeometry(28, 42, 12), concreteMat);
      wallR.position.set(17, 21, 0);
      wallR.rotation.y = -0.08;
      damGroup.add(wallL, wallR);

      // 2. Section centrale de rupture (vannes hydroélectriques)
      const centerSection = new THREE.Group();
      centerSection.position.set(0, 18, 0);
      const gateL = new THREE.Mesh(new THREE.BoxGeometry(5.5, 24, 6), damGateMat);
      gateL.position.x = -3.5;
      const gateR = new THREE.Mesh(new THREE.BoxGeometry(5.5, 24, 6), damGateMat);
      gateR.position.x = 3.5;
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 8), concreteMat);
      lintel.position.y = 14;
      centerSection.add(gateL, gateR, lintel);
      damGroup.add(centerSection);

      // 3. Déversoir de crue & écume torrentielle
      const chute = new THREE.Mesh(new THREE.BoxGeometry(14, 2, 28), foamWaterMat);
      chute.position.set(0, 4, -12);
      chute.rotation.x = 0.28;
      damGroup.add(chute);

      // 4. Balises d'alerte clignotantes sur la crête
      const beaconL = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), beaconYellowMat);
      beaconL.position.set(-18, 43, 0);
      const beaconR = beaconL.clone();
      beaconR.position.x = 18;
      damGroup.add(beaconL, beaconR);

      // 5. Retenue d'eau gigantesque en amont
      const reservoir = new THREE.Mesh(new THREE.PlaneGeometry(80, 120), waterSurfaceMat);
      reservoir.position.set(0, 38, 55);
      reservoir.rotation.x = -Math.PI / 2;
      damGroup.add(reservoir);

      // 6. Mur du Déluge Déferlant (initialement invisible/au repos)
      const floodGroup = new THREE.Group();
      floodGroup.position.set(0, 0, -5);
      floodGroup.visible = false;
      const waveMesh = new THREE.Mesh(new THREE.CylinderGeometry(18, 22, 14, 20, 1, false, 0, Math.PI), foamWaterMat);
      waveMesh.rotation.z = Math.PI / 2;
      waveMesh.rotation.y = -Math.PI / 2;
      waveMesh.scale.set(1.4, 1.8, 1.2);
      floodGroup.add(waveMesh);
      damGroup.add(floodGroup);

      this.damGroup = damGroup;
      this.damWallL = wallL;
      this.damWallR = wallR;
      this.damCenter = centerSection;
      this.damChute = chute;
      this.damFloodGroup = floodGroup;
      lmGroup.add(damGroup);
    } else if (this.isMountainMission || cityDef.disasterType === 'MOUNTAIN') {
      // --- PAROI ROCHEUSE SISMIQUE & AVALANCHE (AU CENTRE À Z = 600) ---
      const mtnGroup = new THREE.Group();
      mtnGroup.position.set(0, 0, 600);

      const rockMat = new THREE.MeshStandardMaterial({ color: 0x576574, roughness: 0.95, metalness: 0.1 });
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xf1f2f6, roughness: 0.3, metalness: 0.05 });
      const boulderMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.9 });
      const pylonMat = new THREE.MeshStandardMaterial({ color: 0xff4757, roughness: 0.5 });
      const redLightMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });

      // 1. Falaise colossale gauche et droite
      const cliffL = new THREE.Mesh(new THREE.ConeGeometry(32, 75, 5), rockMat);
      cliffL.position.set(-28, 37.5, 0);
      cliffL.rotation.y = 0.4;
      const snowCapL = new THREE.Mesh(new THREE.ConeGeometry(18, 30, 5), snowMat);
      snowCapL.position.set(-28, 60, 0);
      mtnGroup.add(cliffL, snowCapL);

      const cliffR = new THREE.Mesh(new THREE.ConeGeometry(32, 75, 5), rockMat);
      cliffR.position.set(28, 37.5, 0);
      cliffR.rotation.y = -0.3;
      const snowCapR = new THREE.Mesh(new THREE.ConeGeometry(18, 30, 5), snowMat);
      snowCapR.position.set(28, 60, 0);
      mtnGroup.add(cliffR, snowCapR);

      // 2. Pic central surplombant la route (l'objectif destructible)
      const centerPeak = new THREE.Group();
      centerPeak.position.set(0, 48, -4);
      const peakRock = new THREE.Mesh(new THREE.DodecahedronGeometry(18, 1), rockMat);
      peakRock.scale.set(1.5, 1.8, 1.2);
      const peakSnow = new THREE.Mesh(new THREE.ConeGeometry(12, 18, 6), snowMat);
      peakSnow.position.y = 14;
      centerPeak.add(peakRock, peakSnow);
      mtnGroup.add(centerPeak);

      // 3. Pylônes de dynamitage sismique
      const pylonL = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 14, 6), pylonMat);
      pylonL.position.set(-9, 16, -6);
      const beaconPylonL = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), redLightMat);
      beaconPylonL.position.set(-9, 23.5, -6);
      const pylonR = pylonL.clone();
      pylonR.position.x = 9;
      const beaconPylonR = beaconPylonL.clone();
      beaconPylonR.position.x = 9;
      mtnGroup.add(pylonL, beaconPylonL, pylonR, beaconPylonR);

      // 4. Blocs de roche suspendus prêts à dévaler lors de l'avalanche
      const boulders = [];
      const boulderOffsets = [
        { x: -7, y: 32, z: -2, s: 3.8 },
        { x: 5, y: 36, z: -3, s: 4.5 },
        { x: -12, y: 26, z: -4, s: 3.2 },
        { x: 10, y: 28, z: -5, s: 4.0 },
        { x: 0, y: 40, z: -2, s: 5.2 }
      ];
      boulderOffsets.forEach(bDef => {
        const bMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(bDef.s, 0), boulderMat);
        bMesh.position.set(bDef.x, bDef.y, bDef.z);
        mtnGroup.add(bMesh);
        boulders.push({
          mesh: bMesh,
          initialY: bDef.y,
          speed: 18.0 + Math.random() * 12.0,
          rotSpeed: 3.0 + Math.random() * 4.0
        });
      });

      this.mountainGroup = mtnGroup;
      this.mountainCenter = centerPeak;
      this.mountainBoulders = boulders;
      lmGroup.add(mtnGroup);
    } else if (cityId === 'paris') {
      // 1. TOUR EIFFEL MONUMENTALE
      const eiffelMat = new THREE.MeshStandardMaterial({ color: 0x5a4d41, metalness: 0.5, roughness: 0.5 });
      const platMat = new THREE.MeshToonMaterial({ color: 0x3d352e });
      
      const eiffel = new THREE.Group();
      eiffel.position.set(34, 0, 240);
      
      // 4 Piliers évasés
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 4.5, 28, 4), eiffelMat);
      p1.position.set(-8, 14, -8);
      p1.rotation.z = -0.15;
      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 4.5, 28, 4), eiffelMat);
      p2.position.set(8, 14, -8);
      p2.rotation.z = 0.15;
      const p3 = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 4.5, 28, 4), eiffelMat);
      p3.position.set(-8, 14, 8);
      p3.rotation.z = -0.15;
      const p4 = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 4.5, 28, 4), eiffelMat);
      p4.position.set(8, 14, 8);
      p4.rotation.z = 0.15;
      eiffel.add(p1, p2, p3, p4);

      // Plateforme 1
      const plat1 = new THREE.Mesh(new THREE.BoxGeometry(20, 3, 20), platMat);
      plat1.position.y = 28;
      eiffel.add(plat1);

      // Étage 2
      const mid = new THREE.Mesh(new THREE.ConeGeometry(8, 38, 4), eiffelMat);
      mid.position.y = 48;
      eiffel.add(mid);

      // Plateforme 2
      const plat2 = new THREE.Mesh(new THREE.BoxGeometry(11, 2, 11), platMat);
      plat2.position.y = 67;
      eiffel.add(plat2);

      // Flèche terminale & Phare
      const topSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 3.2, 42, 6), eiffelMat);
      topSpire.position.y = 88;
      eiffel.add(topSpire);

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfffa65 }));
      beacon.position.y = 110;
      eiffel.add(beacon);

      lmGroup.add(eiffel);

      // ARC DE TRIOMPHE sur le côté gauche
      const archMat = new THREE.MeshToonMaterial({ color: 0xecd5b3 });
      const arch = new THREE.Group();
      arch.position.set(-36, 0, 220);
      const pillarL = new THREE.Mesh(new THREE.BoxGeometry(7, 24, 12), archMat);
      pillarL.position.set(-8, 12, 0);
      const pillarR = new THREE.Mesh(new THREE.BoxGeometry(7, 24, 12), archMat);
      pillarR.position.set(8, 12, 0);
      const archTop = new THREE.Mesh(new THREE.BoxGeometry(26, 9, 14), archMat);
      archTop.position.set(0, 28.5, 0);
      arch.add(pillarL, pillarR, archTop);
      lmGroup.add(arch);

    } else if (cityId === 'londres') {
      // BIG BEN (ELIZABETH TOWER) & CABINE TÉLÉPHONIQUE
      const brickMat = new THREE.MeshToonMaterial({ color: 0xb9770e });
      const stoneMat = new THREE.MeshToonMaterial({ color: 0xdfe4ea });
      const dialMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
      const roofMat = new THREE.MeshToonMaterial({ color: 0x1e272e });

      const tower = new THREE.Group();
      tower.position.set(32, 0, 230);

      // Fût de la tour
      const body = new THREE.Mesh(new THREE.BoxGeometry(14, 65, 14), brickMat);
      body.position.y = 32.5;
      tower.add(body);

      // Horloge à 4 cadrans
      const clockBox = new THREE.Mesh(new THREE.BoxGeometry(16, 14, 16), stoneMat);
      clockBox.position.y = 72;
      tower.add(clockBox);

      // Cadrans lumineux
      for (let rot = 0; rot < 4; rot++) {
        const dial = new THREE.Mesh(new THREE.CircleGeometry(4.2, 16), dialMat);
        dial.rotation.y = rot * (Math.PI / 2);
        dial.position.set(
          Math.sin(rot * (Math.PI / 2)) * 8.1,
          72,
          Math.cos(rot * (Math.PI / 2)) * 8.1
        );
        tower.add(dial);
      }

      // Toit pyramidal et beffroi
      const roof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 26, 4), roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 92;
      tower.add(roof);

      // Flèche or
      const goldSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.2, 14, 6), new THREE.MeshBasicMaterial({ color: 0xffd700 }));
      goldSpire.position.y = 110;
      tower.add(goldSpire);

      lmGroup.add(tower);

      // Cabine téléphonique rouge anglaise sur le trottoir
      const phoneBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6.2, 2.4), new THREE.MeshToonMaterial({ color: 0xff4757 }));
      phoneBox.position.set(-9, 3.1, 190);
      lmGroup.add(phoneBox);

    } else if (cityId === 'bruxelles') {
      // L'ATOMIUM (9 sphères géantes connectées en cristal / chrome)
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.9, roughness: 0.1 });
      const tubeMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, metalness: 0.8, roughness: 0.2 });

      const atomium = new THREE.Group();
      atomium.position.set(34, 45, 240);

      const sphereGeo = new THREE.SphereGeometry(5.2, 14, 14);
      const spherePositions = [
        [0, 0, 0], // Centre
        [-16, -16, -16], [16, -16, -16], [-16, 16, -16], [16, 16, -16], // 4 coins bas
        [-16, -16, 16], [16, -16, 16], [-16, 16, 16], [16, 16, 16], // 4 coins haut
        [0, 24, 0] // Sphère zénithale
      ];

      spherePositions.forEach(pos => {
        const sphere = new THREE.Mesh(sphereGeo, chromeMat);
        sphere.position.set(pos[0], pos[1], pos[2]);
        atomium.add(sphere);

        // Tubes de liaison vers le centre
        const tubeGeo = new THREE.CylinderGeometry(1.2, 1.2, Math.hypot(pos[0], pos[1], pos[2]), 8);
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.set(pos[0] / 2, pos[1] / 2, pos[2] / 2);
        tube.lookAt(pos[0], pos[1], pos[2]);
        atomium.add(tube);
      });

      lmGroup.add(atomium);

    } else if (cityId === 'barcelone') {
      // LA SAGRADA FAMÍLIA (Tours élancées paraboliques & mosaïques)
      const stoneMat = new THREE.MeshToonMaterial({ color: 0xe58e26 });
      const mosaicMat = new THREE.MeshBasicMaterial({ color: 0xf6b93b });
      const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

      const sagrada = new THREE.Group();
      sagrada.position.set(34, 0, 240);

      const bodyBase = new THREE.Mesh(new THREE.BoxGeometry(32, 28, 20), stoneMat);
      bodyBase.position.y = 14;
      sagrada.add(bodyBase);

      // 4 Tours paraboliques
      const towerOffsets = [-10, -3.5, 3.5, 10];
      towerOffsets.forEach((xOff, idx) => {
        const height = (idx === 1 || idx === 2) ? 68 : 58;
        const tower = new THREE.Mesh(new THREE.ConeGeometry(3.6, height, 10), stoneMat);
        tower.position.set(xOff, 28 + height / 2, 0);
        sagrada.add(tower);

        // Clocheton en mosaïque
        const pinn = new THREE.Mesh(new THREE.SphereGeometry(2.0, 8, 8), mosaicMat);
        pinn.position.set(xOff, 28 + height + 1.5, 0);
        sagrada.add(pinn);
      });

      // Croix gaudienne
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8, 1.2), crossMat);
      crossV.position.set(0, 104, 0);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 1.2), crossMat);
      crossH.position.set(0, 104, 0);
      sagrada.add(crossV, crossH);

      lmGroup.add(sagrada);

    } else if (cityId === 'milan') {
      // DUOMO DI MILANO (Cathédrale en marbre blanc éclatant et pinacles)
      const marbleMat = new THREE.MeshToonMaterial({ color: 0xf5f6fa });
      const goldMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

      const duomo = new THREE.Group();
      duomo.position.set(34, 0, 235);

      const nave = new THREE.Mesh(new THREE.BoxGeometry(36, 32, 22), marbleMat);
      nave.position.y = 16;
      duomo.add(nave);

      const roofFront = new THREE.Mesh(new THREE.ConeGeometry(18, 18, 4), marbleMat);
      roofFront.rotation.y = Math.PI / 4;
      roofFront.position.y = 41;
      duomo.add(roofFront);

      // Forêt de pinacles gothiques
      for (let i = -16; i <= 16; i += 4) {
        const pin = new THREE.Mesh(new THREE.ConeGeometry(0.8, 14, 4), marbleMat);
        pin.position.set(i, 38, 10);
        duomo.add(pin);
      }

      // Grande flèche centrale et Madonnina d'or
      const mainSpire = new THREE.Mesh(new THREE.ConeGeometry(2.8, 38, 6), marbleMat);
      mainSpire.position.set(0, 64, 0);
      duomo.add(mainSpire);

      const madonnina = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), goldMat);
      madonnina.position.set(0, 84, 0);
      duomo.add(madonnina);

      lmGroup.add(duomo);

    } else if (cityId === 'geneve') {
      // LE JET D'EAU DE GENÈVE (140m panache d'eau blanche sur le lac Léman)
      const waterPlumeMat = new THREE.MeshBasicMaterial({ color: 0xdff9fb, transparent: true, opacity: 0.85 });
      const sprayMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const lakeMat = new THREE.MeshBasicMaterial({ color: 0x0984e3 });

      const jetGroup = new THREE.Group();
      jetGroup.position.set(30, 0, 230);

      // Nappe du Lac Léman
      const lake = new THREE.Mesh(new THREE.PlaneGeometry(350, 220), lakeMat);
      lake.rotation.x = -Math.PI / 2;
      lake.position.set(0, 0.1, 0);
      jetGroup.add(lake);

      // Jet d'eau vertical géant (120 unités)
      const plume = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 4.5, 110, 12), waterPlumeMat);
      plume.position.set(0, 55, 0);
      jetGroup.add(plume);

      // Éventail d'embruns au sommet
      const spray = new THREE.Mesh(new THREE.ConeGeometry(8.5, 24, 10), sprayMat);
      spray.rotation.x = Math.PI;
      spray.position.set(0, 115, 0);
      jetGroup.add(spray);

      lmGroup.add(jetGroup);

    } else if (cityId === 'strasbourg') {
      // CATHÉDRALE EN GRÈS ROSE (Flèche asymétrique gothique)
      const pinkSandMat = new THREE.MeshToonMaterial({ color: 0xc0392b });
      const tower = new THREE.Group();
      tower.position.set(32, 0, 230);

      const body = new THREE.Mesh(new THREE.BoxGeometry(22, 45, 18), pinkSandMat);
      body.position.y = 22.5;
      tower.add(body);

      const spire = new THREE.Mesh(new THREE.ConeGeometry(5.5, 62, 8), pinkSandMat);
      spire.position.set(5.5, 76, 0);
      tower.add(spire);

      lmGroup.add(tower);

    } else if (cityId === 'chamonix') {
      // MONT-BLANC & AIGUILLE DU MIDI (Sommets enneigés et téléphérique)
      const snowMat = new THREE.MeshToonMaterial({ color: 0xffffff });
      const rockMat = new THREE.MeshToonMaterial({ color: 0x57606f });
      const peakGroup = new THREE.Group();
      peakGroup.position.set(35, 0, 240);

      const montBlanc = new THREE.Mesh(new THREE.ConeGeometry(45, 80, 8), snowMat);
      montBlanc.position.set(0, 40, 0);
      peakGroup.add(montBlanc);

      const needle = new THREE.Mesh(new THREE.ConeGeometry(12, 100, 6), rockMat);
      needle.position.set(-22, 50, 10);
      peakGroup.add(needle);

      // Télécabine rouge suspendue
      const cableCar = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 2.5), new THREE.MeshToonMaterial({ color: 0xff4757 }));
      cableCar.position.set(-12, 58, 8);
      peakGroup.add(cableCar);

      lmGroup.add(peakGroup);

    } else if (cityId === 'millau') {
      // GRAND VIADUC DE MILLAU (Pylônes et haubans)
      const viaductMat = new THREE.MeshToonMaterial({ color: 0xf1f2f6 });
      const viaduct = new THREE.Group();
      viaduct.position.set(30, 0, 230);

      for (let p = -30; p <= 30; p += 30) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(2, 4.5, 65, 8), viaductMat);
        pillar.position.set(p, 32.5, 0);
        const pylon = new THREE.Mesh(new THREE.ConeGeometry(1.6, 35, 4), viaductMat);
        pylon.position.set(p, 82.5, 0);
        viaduct.add(pillar, pylon);
      }
      const deck = new THREE.Mesh(new THREE.BoxGeometry(90, 3, 8), viaductMat);
      deck.position.set(0, 65, 0);
      viaduct.add(deck);

      lmGroup.add(viaduct);

    } else if (cityId === 'marseille' || cityId === 'nice') {
      // NOTRE-DAME DE LA GARDE / NEGRESCO SUR FOND DE MER BLEUE
      const seaMat = new THREE.MeshBasicMaterial({ color: 0x0077be });
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(450, 320), seaMat);
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(-80, -0.2, 200);
      lmGroup.add(sea);

      const sail1 = new THREE.Mesh(new THREE.ConeGeometry(3.5, 14, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      sail1.position.set(-50, 7, 210);
      const sail2 = new THREE.Mesh(new THREE.ConeGeometry(2.8, 11, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      sail2.position.set(-75, 5.5, 185);
      lmGroup.add(sail1, sail2);

      const palaceMat = new THREE.MeshToonMaterial({ color: 0xffffff });
      const domeMat = new THREE.MeshToonMaterial({ color: cityId === 'nice' ? 0xff6b81 : 0xffd700 });
      const palace = new THREE.Group();
      palace.position.set(34, 0, 230);
      const mainBuilding = new THREE.Mesh(new THREE.BoxGeometry(32, 26, 18), palaceMat);
      mainBuilding.position.y = 13;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(8.5, 16, 16), domeMat);
      dome.position.set(0, 28, 0);
      palace.add(mainBuilding, dome);
      lmGroup.add(palace);

    } else if (cityId === 'madrid') {
      // PUERTA DE ALCALÁ & PALAIS DE CIBELES (Monument néo-classique en granit royal)
      const graniteMat = new THREE.MeshToonMaterial({ color: 0xdcdde1 });
      const goldMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
      const redMat = new THREE.MeshToonMaterial({ color: 0xc0392b });
      const waterMat = new THREE.MeshBasicMaterial({ color: 0x00cec9 });

      const puerta = new THREE.Group();
      puerta.position.set(34, 0, 235);

      const baseAlcala = new THREE.Mesh(new THREE.BoxGeometry(46, 22, 10), graniteMat);
      baseAlcala.position.y = 11;
      puerta.add(baseAlcala);

      for (let s of [-12, 0, 12]) {
        const archVoid = new THREE.Mesh(new THREE.BoxGeometry(6.5, 14, 10.4), new THREE.MeshBasicMaterial({ color: 0x1e272e }));
        archVoid.position.set(s, 7, 0);
        puerta.add(archVoid);
      }

      const attique = new THREE.Mesh(new THREE.BoxGeometry(32, 7, 9), graniteMat);
      attique.position.y = 25.5;
      puerta.add(attique);

      const royalShield = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 1.2, 8), goldMat);
      royalShield.rotation.x = Math.PI / 2;
      royalShield.position.set(0, 31, 4.6);
      puerta.add(royalShield);

      for (let sx of [-12, -4, 4, 12]) {
        const statue = new THREE.Mesh(new THREE.ConeGeometry(1.2, 5, 5), graniteMat);
        statue.position.set(sx, 31.5, 0);
        puerta.add(statue);
      }

      const fountainBasin = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 1.5, 16), graniteMat);
      fountainBasin.position.set(0, 0.75, 16);
      const fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 0.4, 16), waterMat);
      fountainWater.position.set(0, 1.3, 16);
      puerta.add(fountainBasin, fountainWater);

      for (let side of [-20, 20]) {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 28, 6), graniteMat);
        mast.position.set(side, 14, 12);
        const flag = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.5, 0.1), redMat);
        flag.position.set(side + 2.3, 24, 12);
        puerta.add(mast, flag);
      }

      lmGroup.add(puerta);

    } else if (cityId === 'lisbonne') {
      // TOUR DE BELÉM & TRAMWAY JAUNE n°28 SUR LE TAGE (Style manuélin portugais)
      const stoneMat = new THREE.MeshToonMaterial({ color: 0xf5f6fa });
      const riverMat = new THREE.MeshBasicMaterial({ color: 0x0984e3 });
      const roofMat = new THREE.MeshToonMaterial({ color: 0xd35400 });
      const tramYellowMat = new THREE.MeshToonMaterial({ color: 0xf1c40f });
      const tramCreamMat = new THREE.MeshToonMaterial({ color: 0xfffae6 });

      const lisbonGroup = new THREE.Group();
      lisbonGroup.position.set(32, 0, 230);

      const river = new THREE.Mesh(new THREE.PlaneGeometry(350, 220), riverMat);
      river.rotation.x = -Math.PI / 2;
      river.position.set(0, 0.1, 0);
      lisbonGroup.add(river);

      const bastion = new THREE.Mesh(new THREE.BoxGeometry(26, 10, 32), stoneMat);
      bastion.position.set(0, 5, 0);
      lisbonGroup.add(bastion);

      const cornerOffsets = [[-13, -16], [13, -16], [-13, 16], [13, 16]];
      cornerOffsets.forEach(([cx, cz]) => {
        const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.2, 8, 8), stoneMat);
        turret.position.set(cx, 11, cz);
        const turretDome = new THREE.Mesh(new THREE.SphereGeometry(1.7, 8, 8), stoneMat);
        turretDome.position.set(cx, 15, cz);
        lisbonGroup.add(turret, turretDome);
      });

      const donjon = new THREE.Mesh(new THREE.BoxGeometry(16, 28, 16), stoneMat);
      donjon.position.set(0, 22, -6);
      lisbonGroup.add(donjon);

      const loggia = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 4), stoneMat);
      loggia.position.set(0, 26, 2.5);
      lisbonGroup.add(loggia);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 10, 4), roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, 41, -6);
      lisbonGroup.add(roof);

      const tram = new THREE.Group();
      tram.position.set(-16, 2.2, 38);
      const tramBody = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.4, 9.5), tramYellowMat);
      tramBody.position.y = 1.7;
      const tramRoof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 9.8), tramCreamMat);
      tramRoof.position.y = 3.6;
      const pantograph = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6), new THREE.MeshBasicMaterial({ color: 0x2d3436 }));
      pantograph.position.set(0, 4.8, 0);
      pantograph.rotation.z = 0.3;
      tram.add(tramBody, tramRoof, pantograph);
      lisbonGroup.add(tram);

      lmGroup.add(lisbonGroup);

    } else if (cityId === 'rome') {
      // LE COLISÉE FLAVIER (Amphithéâtre impérial géant en travertin romain ocre)
      const travertineMat = new THREE.MeshToonMaterial({ color: 0xecd5b3 });
      const darkInterior = new THREE.MeshBasicMaterial({ color: 0x2d3436 });

      const colosseum = new THREE.Group();
      colosseum.position.set(34, 0, 235);

      const baseCol = new THREE.Mesh(new THREE.CylinderGeometry(28, 30, 28, 24, 1, true), travertineMat);
      baseCol.position.y = 14;
      colosseum.add(baseCol);

      const arena = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 2, 24), darkInterior);
      arena.position.y = 1;
      colosseum.add(arena);

      for (let rot = 0; rot < 16; rot++) {
        const ang = (rot / 16) * Math.PI * 2;
        const archPillar = new THREE.Mesh(new THREE.BoxGeometry(2.5, 26, 3), travertineMat);
        archPillar.position.set(Math.cos(ang) * 28.5, 13, Math.sin(ang) * 28.5);
        archPillar.lookAt(0, 13, 0);
        colosseum.add(archPillar);
      }

      const topAttic = new THREE.Mesh(new THREE.CylinderGeometry(27.8, 28, 12, 16, 1, true, 0, Math.PI * 1.2), travertineMat);
      topAttic.position.y = 33;
      colosseum.add(topAttic);

      for (let c of [-14, 14]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 22, 8), travertineMat);
        col.position.set(c, 11, 35);
        const capital = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, 3.2), travertineMat);
        capital.position.set(c, 22.5, 35);
        colosseum.add(col, capital);
      }

      lmGroup.add(colosseum);

    } else if (cityId === 'napoli') {
      // LE MONT VÉSUVE AVEC CRATÈRE FUMANT & CASTEL DELL'OVO
      const rockMat = new THREE.MeshToonMaterial({ color: 0x485460 });
      const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });
      const smokeMat = new THREE.MeshBasicMaterial({ color: 0xdfe4ea, transparent: true, opacity: 0.75 });
      const bayMat = new THREE.MeshBasicMaterial({ color: 0x0652dd });
      const fortMat = new THREE.MeshToonMaterial({ color: 0xf7d794 });

      const vesuvius = new THREE.Group();
      vesuvius.position.set(36, 0, 240);

      const bay = new THREE.Mesh(new THREE.PlaneGeometry(350, 220), bayMat);
      bay.rotation.x = -Math.PI / 2;
      bay.position.set(0, 0.1, 0);
      vesuvius.add(bay);

      const cone = new THREE.Mesh(new THREE.ConeGeometry(68, 80, 16, 1, true), rockMat);
      cone.position.set(0, 40, -20);
      vesuvius.add(cone);

      const crater = new THREE.Mesh(new THREE.CylinderGeometry(14, 18, 5, 16), rockMat);
      crater.position.set(0, 78, -20);
      const lava = new THREE.Mesh(new THREE.CircleGeometry(12, 16), lavaMat);
      lava.rotation.x = -Math.PI / 2;
      lava.position.set(0, 79, -20);
      vesuvius.add(crater, lava);

      for (let s = 0; s < 4; s++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(6 + s * 3.5, 8, 8), smokeMat);
        puff.position.set(Math.sin(s) * 4, 86 + s * 10, -20 + s * 3);
        vesuvius.add(puff);
      }

      const castle = new THREE.Group();
      castle.position.set(-20, 0, 32);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(22, 14, 18), fortMat);
      wall.position.y = 7;
      const keep = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.5, 20, 8), fortMat);
      keep.position.set(8, 10, 6);
      castle.add(wall, keep);
      vesuvius.add(castle);

      lmGroup.add(vesuvius);

    } else if (cityId === 'tunis') {
      // GRANDE MOSQUÉE ZITOUNA (Minaret Mauresque & Arcades de Sidi Bou Saïd)
      const stoneMat = new THREE.MeshToonMaterial({ color: 0xf7d794 });
      const whiteMat = new THREE.MeshToonMaterial({ color: 0xffffff });
      const blueMat = new THREE.MeshToonMaterial({ color: 0x0abde3 });
      const goldMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

      const tunisGroup = new THREE.Group();
      tunisGroup.position.set(34, 0, 235);

      const minaretBody = new THREE.Mesh(new THREE.BoxGeometry(11, 44, 11), stoneMat);
      minaretBody.position.y = 22;
      tunisGroup.add(minaretBody);

      const balcony = new THREE.Mesh(new THREE.BoxGeometry(13, 3, 13), stoneMat);
      balcony.position.y = 44.5;
      tunisGroup.add(balcony);

      const topLantern = new THREE.Mesh(new THREE.BoxGeometry(6.5, 12, 6.5), stoneMat);
      topLantern.position.y = 51;
      tunisGroup.add(topLantern);

      const dome = new THREE.Mesh(new THREE.SphereGeometry(3.8, 12, 12), whiteMat);
      dome.position.y = 57.5;
      tunisGroup.add(dome);

      for (let b = 0; b < 3; b++) {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.8 - b * 0.2, 8, 8), goldMat);
        sphere.position.y = 61 + b * 1.4;
        tunisGroup.add(sphere);
      }

      for (let h = -24; h <= 24; h += 24) {
        const house = new THREE.Group();
        house.position.set(h, 0, 18);
        const houseMesh = new THREE.Mesh(new THREE.BoxGeometry(18, 12, 14), whiteMat);
        houseMesh.position.y = 6;
        const blueDoor = new THREE.Mesh(new THREE.BoxGeometry(3.5, 6, 0.4), blueMat);
        blueDoor.position.set(0, 3, 7.2);
        house.add(houseMesh, blueDoor);
        tunisGroup.add(house);
      }

      lmGroup.add(tunisGroup);

    } else if (cityId === 'alger') {
      // MAQAM ECHAHID (Mémorial du Martyr à 3 Palmes Géantes & Baie d'Alger la Blanche)
      const concreteMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.3, metalness: 0.1 });
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });
      const seaMat = new THREE.MeshBasicMaterial({ color: 0x10ac84 });

      const algerGroup = new THREE.Group();
      algerGroup.position.set(34, 0, 235);

      const bay = new THREE.Mesh(new THREE.PlaneGeometry(350, 220), seaMat);
      bay.rotation.x = -Math.PI / 2;
      bay.position.set(0, 0.1, 0);
      algerGroup.add(bay);

      for (let p = 0; p < 3; p++) {
        const angle = (p / 3) * Math.PI * 2;
        const palmGroup = new THREE.Group();
        palmGroup.rotation.y = angle;

        const palmBlade = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 5.5, 78, 8), concreteMat);
        palmBlade.position.set(9, 39, 0);
        palmBlade.rotation.z = -0.16;
        palmGroup.add(palmBlade);

        algerGroup.add(palmGroup);
      }

      const zenithDome = new THREE.Mesh(new THREE.SphereGeometry(6.5, 16, 16), concreteMat);
      zenithDome.position.y = 76;
      algerGroup.add(zenithDome);

      const eternalFlame = new THREE.Mesh(new THREE.ConeGeometry(2.5, 9, 8), flameMat);
      eternalFlame.position.y = 8;
      algerGroup.add(eternalFlame);

      const casbahBase = new THREE.Mesh(new THREE.BoxGeometry(38, 7, 38), new THREE.MeshToonMaterial({ color: 0xffffff }));
      casbahBase.position.y = 3.5;
      algerGroup.add(casbahBase);

      lmGroup.add(algerGroup);

    } else if (cityId === 'annaba') {
      // BASILIQUE SAINT-AUGUSTIN D'HIPPONE (Style romano-byzantin et mauresque)
      const marbleMat = new THREE.MeshToonMaterial({ color: 0xf5f6fa });
      const domeTurquoiseMat = new THREE.MeshToonMaterial({ color: 0x00cec9 });
      const redMarbleMat = new THREE.MeshToonMaterial({ color: 0xb33939 });
      const seaMat = new THREE.MeshBasicMaterial({ color: 0x0984e3 });

      const annabaGroup = new THREE.Group();
      annabaGroup.position.set(34, 0, 235);

      const sea = new THREE.Mesh(new THREE.PlaneGeometry(350, 220), seaMat);
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(0, 0.1, 0);
      annabaGroup.add(sea);

      const hill = new THREE.Mesh(new THREE.ConeGeometry(55, 24, 16), new THREE.MeshToonMaterial({ color: 0x2ed573 }));
      hill.position.y = 12;
      annabaGroup.add(hill);

      const basilicaNave = new THREE.Mesh(new THREE.BoxGeometry(32, 22, 22), marbleMat);
      basilicaNave.position.set(0, 35, 0);
      annabaGroup.add(basilicaNave);

      const centralDome = new THREE.Mesh(new THREE.SphereGeometry(9.5, 16, 16), domeTurquoiseMat);
      centralDome.position.set(0, 48, 0);
      annabaGroup.add(centralDome);

      const bellTower = new THREE.Mesh(new THREE.BoxGeometry(7, 38, 7), redMarbleMat);
      bellTower.position.set(-18, 43, 8);
      const bellDome = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 10), domeTurquoiseMat);
      bellDome.position.set(-18, 63, 8);
      annabaGroup.add(bellTower, bellDome);

      lmGroup.add(annabaGroup);

    } else {
      // MONUMENT D'ÉLÉGANCE CLASSIQUE / BEFFROI
      const classicMat = new THREE.MeshToonMaterial({ color: 0xdcdde1 });
      const spire = new THREE.Mesh(new THREE.ConeGeometry(9, 75, 6), classicMat);
      spire.position.set(32, 37.5, 235);
      lmGroup.add(spire);
    }

    this.landmark = lmGroup;
    this.scene.add(lmGroup);
  }

  createFinishArch(zPos) {
    if (this.finishArch) {
      this.container.remove(this.finishArch);
    }

    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, zPos);

    // Structure de treillis métallique
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, metalness: 0.8, roughness: 0.2 });

    // Poteau gauche et droite
    const pillarGeo = new THREE.BoxGeometry(0.8, 6.0, 0.8);
    const pillarL = new THREE.Mesh(pillarGeo, trussMat);
    pillarL.position.set(-4.8, 3.0, 0);
    archGroup.add(pillarL);

    const pillarR = new THREE.Mesh(pillarGeo, trussMat);
    pillarR.position.set(4.8, 3.0, 0);
    archGroup.add(pillarR);

    // Poutre transversale
    const beamGeo = new THREE.BoxGeometry(11.2, 1.4, 0.9);
    const beam = new THREE.Mesh(beamGeo, trussMat);
    beam.position.set(0, 5.8, 0);
    archGroup.add(beam);

    // Banderole damier ARRIVÉE / FINISH
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 512;
    bannerCanvas.height = 128;
    const ctx = bannerCanvas.getContext('2d');

    // Fond damier noir et blanc
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#000000';
    for (let x = 0; x < 512; x += 32) {
      for (let y = 0; y < 128; y += 32) {
        if ((x / 32 + y / 32) % 2 === 0) {
          ctx.fillRect(x, y, 32, 32);
        }
      }
    }

    // Bande rouge centrale avec texte
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(0, 36, 512, 56);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ ARRIVÉE / FINISH ★', 256, 64);

    const bannerTexture = new THREE.CanvasTexture(bannerCanvas);
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTexture });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.3), bannerMat);
    banner.position.set(0, 5.8, 0.48);
    archGroup.add(banner);

    // Ligne au sol à damier
    const groundLineMat = new THREE.MeshBasicMaterial({ map: bannerTexture });
    const groundLine = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.0), groundLineMat);
    groundLine.rotation.x = -Math.PI / 2;
    groundLine.position.set(0, 0.03, 0);
    archGroup.add(groundLine);

    // Drapeaux français tricolores au sommet
    const flagMatB = new THREE.MeshBasicMaterial({ color: 0x0055a5 });
    const flagMatW = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const flagMatR = new THREE.MeshBasicMaterial({ color: 0xef4135 });

    [[-4.5, 6.8], [4.5, 6.8], [0, 6.8]].forEach(pos => {
      const flagGroup = new THREE.Group();
      flagGroup.position.set(pos[0], pos[1], 0);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), trussMat);
      pole.position.y = 0.8;
      flagGroup.add(pole);

      const f1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.6), flagMatB);
      f1.position.set(0.15, 1.2, 0);
      const f2 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.6), flagMatW);
      f2.position.set(0.45, 1.2, 0);
      const f3 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.6), flagMatR);
      f3.position.set(0.75, 1.2, 0);
      flagGroup.add(f1, f2, f3);

      flagGroup.userData = { seed: Math.random() * Math.PI * 2 };
      this.animatedFlags.push(flagGroup);
      archGroup.add(flagGroup);
    });

    this.finishArch = archGroup;
    this.container.add(archGroup);
  }

  createStreetChunk(zPos, index = 0) {
    const chunk = new THREE.Group();
    chunk.userData = { props: [] };
    const curveX = this.getRoadCenterX(zPos);
    const curveAngle = this.getRoadAngle(zPos);

    chunk.position.set(curveX, 0, zPos);
    chunk.rotation.y = curveAngle;

    const roadMat = this.sharedMats?.road || new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 });
    const sidewalkMat = this.sharedMats?.sidewalk || new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.05 });
    const curbMat = this.sharedMats?.curb || new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.6 });
    const stripeMat = this.sharedMats?.stripe || new THREE.MeshStandardMaterial({ color: 0xf1f3f5, roughness: 0.85 });

    // Chaussée
    const road = new THREE.Mesh(this.sharedGeos.road, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    chunk.add(road);

    // Bandes blanches centrales (uniquement en mode urbain classique, bitume brut fracturé en ruines)
    if (!this.isRuinsMode) {
      const numStripes = Math.floor(this.chunkLength / 7);
      for (let i = 0; i < numStripes; i++) {
        const stripe = new THREE.Mesh(this.sharedGeos.stripe, stripeMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(0, 0.01, -this.chunkLength / 2 + i * 7 + 3.5);
        chunk.add(stripe);
      }
    }

    // Passage piéton tous les 60m avec FEUX TRICOLORES (Uniquement en course classique, ZÉRO feux en ruines !)
    if (!this.isCataclysmMission && !this.isRuinsMode && Math.abs(zPos) % 60 === 0) {
      for (let s = -3.2; s <= 3.2; s += 0.9) {
        const cw = new THREE.Mesh(this.sharedGeos.crosswalkStripe, stripeMat);
        cw.rotation.x = -Math.PI / 2;
        cw.position.set(s, 0.015, 0);
        chunk.add(cw);
      }

      // Feux tricolores (Feu rouge piétons/voitures)
      const createTrafficLight = (side) => {
        const tlGroup = new THREE.Group();
        tlGroup.position.set(side * 4.35, 0, 1.8);
        tlGroup.userData = { type: 'lamp', isHit: false };

        // Mât gris anthracite
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.6, 8), this.sharedMats?.mast || new THREE.MeshStandardMaterial({ color: 0x2d3436 }));
        mast.position.y = 2.3;
        tlGroup.add(mast);

        // Boîtier noir à 3 feux
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 0.32), this.sharedMats?.trafficBox || new THREE.MeshToonMaterial({ color: 0x1e272e }));
        box.position.set(0, 3.8, 0);
        tlGroup.add(box);

        // Feu ROUGE éclatant au sommet (Interdit aux véhicules quand piétons traversent)
        const redLight = new THREE.Mesh(new THREE.CircleGeometry(0.12, 10), this.sharedMats?.redLight || new THREE.MeshBasicMaterial({ color: 0xff3838 }));
        redLight.position.set(0, 4.15, -0.17);
        redLight.rotation.y = Math.PI;

        // Feu ORANGE
        const amberLight = new THREE.Mesh(new THREE.CircleGeometry(0.1, 8), this.sharedMats?.amberLight || new THREE.MeshBasicMaterial({ color: 0x57606f }));
        amberLight.position.set(0, 3.8, -0.17);
        amberLight.rotation.y = Math.PI;

        // Feu VERT
        const greenLight = new THREE.Mesh(new THREE.CircleGeometry(0.1, 8), this.sharedMats?.greenLight || new THREE.MeshBasicMaterial({ color: 0x2f3542 }));
        greenLight.position.set(0, 3.45, -0.17);
        greenLight.rotation.y = Math.PI;

        tlGroup.add(redLight, amberLight, greenLight);
        chunk.userData.props.push(tlGroup);
        return tlGroup;
      };

      chunk.add(createTrafficLight(-1));
      chunk.add(createTrafficLight(1));
    }

    // Trottoirs gauche et droite avec dégagement TOTAL au carrefour (zéro trottoir barrant l'avenue perpendiculaire !)
    const nearestInterZ = Math.round((zPos - 95) / 160) * 160 + 95;
    const interLocalZ = nearestInterZ - zPos;
    const hasIntersection = (interLocalZ >= -39.5 && interLocalZ <= 39.5);

    const addSidewalkSegment = (centerZ, length) => {
      if (length <= 0.6) return;
      const walkGeo = new THREE.BoxGeometry(3.5, 0.25, length);
      const curbGeo = new THREE.BoxGeometry(0.15, 0.3, length);

      const sL = new THREE.Mesh(walkGeo, sidewalkMat);
      sL.position.set(-5.95, 0.125, centerZ);
      const cL = new THREE.Mesh(curbGeo, curbMat);
      cL.position.set(-4.25, 0.15, centerZ);

      const sR = new THREE.Mesh(walkGeo, sidewalkMat);
      sR.position.set(5.95, 0.125, centerZ);
      const cR = new THREE.Mesh(curbGeo, curbMat);
      cR.position.set(4.25, 0.15, centerZ);

      chunk.add(sL, cL, sR, cR);
    };

    if (hasIntersection) {
      const openStart = Math.max(-30, interLocalZ - 9.5);
      const openEnd = Math.min(30, interLocalZ + 9.5);

      // Segment avant le carrefour
      if (openStart > -29.5) {
        const len1 = openStart - (-30);
        addSidewalkSegment(-30 + len1 / 2, len1);
      }
      // Segment après le carrefour
      if (openEnd < 29.5) {
        const len2 = 30 - openEnd;
        addSidewalkSegment(openEnd + len2 / 2, len2);
      }
      // Entre openStart et openEnd : AUCUN TROTTOIR NI BORDURE, chaussée transversale parfaitement ouverte et plane !
    } else {
      const sidewalkL = new THREE.Mesh(this.sharedGeos.sidewalk, sidewalkMat);
      sidewalkL.position.set(-5.95, 0.125, 0);
      const curbL = new THREE.Mesh(this.sharedGeos.curb, curbMat);
      curbL.position.set(-4.25, 0.15, 0);

      const sidewalkR = new THREE.Mesh(this.sharedGeos.sidewalk, sidewalkMat);
      sidewalkR.position.set(5.95, 0.125, 0);
      const curbR = new THREE.Mesh(this.sharedGeos.curb, curbMat);
      curbR.position.set(4.25, 0.15, 0);

      chunk.add(sidewalkL, curbL, sidewalkR, curbR);
    }

    // Bâtiments : Décombres effondrés en mode Ruines, Architecture vivante en course classique
    if (this.isRuinsMode) {
      this.populateRuinsBuildings(chunk, -1);
      this.populateRuinsBuildings(chunk, 1);
    } else {
      this.populateBuildings(chunk, -1);
      this.populateBuildings(chunk, 1);
    }

    // Ralentisseur / Dos d'âne 3D (Uniquement en course urbaine normale)
    if (!this.isRuinsMode && !this.isCataclysmMission) {
      const relBump = ((zPos - 35) % 160 + 160) % 160;
      if (relBump < 20 && zPos > 40) {
        this.addSpeedBump(chunk, 0);
      }
    }

    // Accessoires urbains et décombres
    this.populateStreetProps(chunk);

    return chunk;
  }

  addSpeedBump(chunk, localZ) {
    const bumpGroup = new THREE.Group();
    bumpGroup.position.set(0, 0, localZ);

    // 1. Corps trapézoïdal du ralentisseur (dos d'âne asphalté surélevé de 18cm)
    const bumpGeo = new THREE.BoxGeometry(8.4, 0.18, 2.6);
    const bumpMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.85 });
    const bumpMesh = new THREE.Mesh(bumpGeo, bumpMat);
    bumpMesh.position.y = 0.09;
    bumpMesh.receiveShadow = true;
    bumpGroup.add(bumpMesh);

    // 2. Bandes blanches plates au sol (marquage officiel discret, ИclairИ comme le bitume)
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf1f3f5, transparent: true, opacity: 0.85, roughness: 0.85 });
    for (let x = -3.6; x <= 3.6; x += 1.2) {
      const stripeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 1.8), stripeMat);
      stripeMesh.rotation.x = -Math.PI / 2;
      stripeMesh.position.set(x, 0.19, 0);
      bumpGroup.add(stripeMesh);
    }

    // 3. Panneau routier officiel circulaire 30 km/h sur le trottoir
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.85, roughness: 0.2 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8), poleMat);
    pole.position.set(-4.5, 1.2, 0);
    bumpGroup.add(pole);

    const signBorder = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 16), new THREE.MeshStandardMaterial({ color: 0xe74c3c }));
    signBorder.rotation.z = Math.PI / 2;
    signBorder.position.set(-4.5, 2.15, 0);
    bumpGroup.add(signBorder);

    const signCore = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    signCore.rotation.z = Math.PI / 2;
    signCore.position.set(-4.5, 2.15, 0);
    bumpGroup.add(signCore);

    chunk.add(bumpGroup);

    // Enregistrer le dos d'âne pour la détection dynamique de saut de suspension
    if (!this.speedBumps) this.speedBumps = [];
    this.speedBumps.push({
      chunk: chunk,
      localZ: localZ,
      length: 2.8,
      height: 0.24,
      hit: false
    });
  }

  populateBuildings(chunk, side) {
    if (this.isRuinsMode) {
      this.populateRuinsBuildings(chunk, side);
      return;
    }

    const xBase = side * 8.5;
    let currentZ = -this.chunkLength / 2;

    const buildingMatPalette = this.sharedMats?.buildingPalette || this.cityTheme.buildingColors.map(c =>
      new THREE.MeshToonMaterial({ color: c })
    );
    const roofMat = this.sharedMats?.roof || new THREE.MeshToonMaterial({ color: this.cityTheme.roofColor });
    const facadeMat = this.sharedMats?.facade || new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.05 });
    const awningMat = side > 0 ? (this.sharedMats?.awningRed || new THREE.MeshStandardMaterial({ roughness: 0.7 })) : (this.sharedMats?.awningBlue || new THREE.MeshStandardMaterial({ roughness: 0.7 }));
    const balconyMat = this.sharedMats?.balcony || new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.8, roughness: 0.25 });
    const storeSignMat = (this.sharedMats?.storeSigns && this.sharedMats.storeSigns.length)
      ? this.sharedMats.storeSigns[Math.abs(Math.floor(currentZ / 8.5)) % this.sharedMats.storeSigns.length]
      : (this.sharedMats?.storeSign || new THREE.MeshStandardMaterial({ color: 0xff4757, roughness: 0.4 }));

    while (currentZ < this.chunkLength / 2) {
      const bWidth = 8.5 + Math.random() * 5.0;
      const bHeight = 13.0 + Math.random() * 14.0;
      const bDepth = 10.0;

      // LAISSER UN CARREFOUR TOTALEMENT OUVERT POUR CHAQUE INTERSECTION
      // Intersections régulières à Z = 95 + k * 160 (95, 255, 415, 575, ...)
      const bMinZ = chunk.position.z + currentZ;
      const bMaxZ = bMinZ + bWidth;
      const nearestInterZ = Math.round((bMinZ - 95) / 160) * 160 + 95;
      if (bMaxZ >= nearestInterZ - 17 && bMinZ <= nearestInterZ + 17) {
        // En plein couloir transversal : sauter totalement l'intersection pour laisser circuler le trafic transversal sans heurter de mur !
        currentZ = (nearestInterZ + 17.5) - chunk.position.z;
        continue;
      }

      // Diversité architecturale & urbaine : Squares publics verdoyants & Esplanades avec statues commémoratives
      const parcelRand = Math.random();
      if (!this.isCataclysmMission && parcelRand < 0.15 && bWidth >= 9.0) {
        this.createUrbanSquare(chunk, side, xBase, currentZ, bWidth, bDepth);
        currentZ += bWidth;
        continue;
      } else if (!this.isCataclysmMission && parcelRand < 0.26 && bWidth >= 9.0) {
        this.createUrbanMonument(chunk, side, xBase, currentZ, bWidth, bDepth);
        currentZ += bWidth;
        continue;
      }

      const randomMat = buildingMatPalette[Math.floor(Math.random() * buildingMatPalette.length)];
      const bGeo = new THREE.BoxGeometry(bDepth, bHeight, bWidth);
      const bMesh = new THREE.Mesh(bGeo, randomMat);
      bMesh.position.set(xBase + side * (bDepth / 2), bHeight / 2, currentZ + bWidth / 2);
      bMesh.castShadow = true;
      chunk.add(bMesh);

      // Toiture haussmannienne zinc ou classique
      if (this.cityTheme.id === 'paris') {
        const roofGeo = new THREE.BoxGeometry(bDepth * 0.92, 2.8, bWidth);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(xBase + side * (bDepth / 2), bHeight + 1.4, currentZ + bWidth / 2);
        chunk.add(roof);
      } else {
        const roofGeo = new THREE.BoxGeometry(bDepth + 0.4, 0.7, bWidth + 0.4);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(xBase + side * (bDepth / 2), bHeight + 0.35, currentZ + bWidth / 2);
        chunk.add(roof);
      }

      // Façade Haussmannienne HD avec fenêtres détaillées, corniches et commerce
      const facadeMesh = new THREE.Mesh(new THREE.PlaneGeometry(bWidth, bHeight), facadeMat);
      facadeMesh.position.set(xBase - side * 0.08, bHeight / 2, currentZ + bWidth / 2);
      facadeMesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      chunk.add(facadeMesh);

      // Balcons filants 3D en fer forgé haussmannien
      const balconyY1 = 4.2;
      const balconyY2 = 7.8;
      [balconyY1, balconyY2].forEach(by => {
        if (by < bHeight - 1.5) {
          const balcBBox = new THREE.Mesh(this.sharedGeos.balconyBase, balconyMat);
          balcBBox.position.set(xBase - side * 0.45, by, currentZ + bWidth / 2);
          chunk.add(balcBBox);

          const balcRail = new THREE.Mesh(this.sharedGeos.balconyRailing, balconyMat);
          balcRail.position.set(xBase - side * 0.75, by + 0.35, currentZ + bWidth / 2);
          chunk.add(balcRail);
        }
      });

      // Store banne de bistrot ou boutique avec texture rayée réaliste
      if (Math.random() < 0.75) {
        const awningGeo = new THREE.BoxGeometry(1.8, 0.35, bWidth * 0.75);
        const awning = new THREE.Mesh(awningGeo, awningMat);
        awning.rotation.z = side * 0.35;
        awning.position.set(xBase - side * 0.7, 3.2, currentZ + bWidth / 2);
        chunk.add(awning);

        // Enseigne chic lumineuse au-dessus du store
        const signMesh = new THREE.Mesh(this.sharedGeos.storeSign, storeSignMat);
        signMesh.position.set(xBase - side * 0.65, 3.8, currentZ + bWidth / 2);
        signMesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        chunk.add(signMesh);
      }

      currentZ += bWidth;
    }
  }

  // --- CRÉATION DE JARDINS PUBLICS & SQUARES URBAINS ---
  createUrbanSquare(chunk, side, xBase, currentZ, bWidth, bDepth = 10.0) {
    const squareGroup = new THREE.Group();
    const centerZ = currentZ + bWidth / 2;
    const centerX = xBase + side * (bDepth / 2);
    squareGroup.position.set(centerX, 0, centerZ);

    const lawnMat = this.sharedMats?.lawn || new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.85 });
    const fenceMat = this.sharedMats?.fence || new THREE.MeshStandardMaterial({ color: 0x1e372f, roughness: 0.5, metalness: 0.5 });
    const stoneMat = this.sharedMats?.granite || new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.8 });
    const waterMat = this.sharedMats?.fountainWater || new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.2, metalness: 0.3 });
    const flowerMat1 = this.sharedMats?.flower1 || new THREE.MeshStandardMaterial({ color: 0xe84393, roughness: 0.7 });
    const flowerMat2 = this.sharedMats?.flower2 || new THREE.MeshStandardMaterial({ color: 0xfdcb6e, roughness: 0.7 });
    const benchWoodMat = this.sharedMats?.benchWood || new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 });

    // 1. Dalle de pelouse verdoyante
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(bDepth, 0.22, bWidth), lawnMat);
    lawn.position.y = 0.11;
    lawn.receiveShadow = true;
    squareGroup.add(lawn);

    // 2. Grille décorative en fer forgé le long de la rue (avec ouverture centrale)
    const fenceFrontZ = (bWidth / 2) - 0.4;
    [-fenceFrontZ * 0.65, fenceFrontZ * 0.65].forEach(fz => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, bWidth * 0.35), fenceMat);
      rail.position.set(-side * (bDepth / 2 - 0.2), 0.55, fz);
      squareGroup.add(rail);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8), fenceMat);
      post.position.set(-side * (bDepth / 2 - 0.2), 0.65, fz);
      squareGroup.add(post);
    });

    // 3. Fontaine circulaire centrale en pierre sculptée
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.5, 16), stoneMat);
    basin.position.set(0, 0.35, 0);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.08, 16), waterMat);
    water.position.set(0, 0.54, 0);
    const fountainCol = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.3, 12), stoneMat);
    fountainCol.position.set(0, 1.05, 0);
    const upperBasin = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.26, 12), stoneMat);
    upperBasin.position.set(0, 1.6, 0);
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 8), stoneMat);
    finial.position.set(0, 1.95, 0);
    squareGroup.add(basin, water, fountainCol, upperBasin, finial);

    // 4. Deux massifs de fleurs colorées
    [-bWidth * 0.3, bWidth * 0.3].forEach((fz, i) => {
      const bed = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.22, 10), i % 2 === 0 ? flowerMat1 : flowerMat2);
      bed.position.set(-side * 1.5, 0.22, fz);
      squareGroup.add(bed);
    });

    // 5. Bancs de parc parisiens en fonte et bois
    [-bWidth * 0.26, bWidth * 0.26].forEach(bz => {
      const bench = new THREE.Group();
      bench.position.set(side * 1.6, 0.11, bz);
      bench.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 1.6), benchWoodMat);
      seat.position.y = 0.4;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 1.6), benchWoodMat);
      back.position.set(-0.2, 0.62, 0);
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.4, 0.08), fenceMat);
      leg1.position.set(0, 0.2, -0.6);
      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.4, 0.08), fenceMat);
      leg2.position.set(0, 0.2, 0.6);
      bench.add(seat, back, leg1, leg2);
      squareGroup.add(bench);
    });

    chunk.add(squareGroup);
  }

  // --- CRÉATION DE PLACES MONUMENTALES AVEC STATUES COMMÉMORATIVES ---
  createUrbanMonument(chunk, side, xBase, currentZ, bWidth, bDepth = 10.0) {
    const monGroup = new THREE.Group();
    const centerZ = currentZ + bWidth / 2;
    const centerX = xBase + side * (bDepth / 2);
    monGroup.position.set(centerX, 0, centerZ);

    const plazaMat = this.sharedMats?.plaza || new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.8 });
    const graniteMat = this.sharedMats?.granite || new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.7 });
    const bronzeMat = this.sharedMats?.bronzeStatue || new THREE.MeshStandardMaterial({ color: 0x4a3728, metalness: 0.75, roughness: 0.35 });
    const goldMat = this.sharedMats?.yellow || new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.85, roughness: 0.25 });

    // 1. Esplanade pavée surélevée
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(bDepth, 0.22, bWidth), plazaMat);
    plaza.position.y = 0.11;
    plaza.receiveShadow = true;
    monGroup.add(plaza);

    // 2. Piédestal à degrés en granit
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.32, 3.4), graniteMat);
    step1.position.y = 0.32;
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.38, 2.6), graniteMat);
    step2.position.y = 0.65;
    const pedestalShaft = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.0, 1.9), graniteMat);
    pedestalShaft.position.y = 1.8;
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.24, 2.3), graniteMat);
    cornice.position.y = 2.92;

    // Plaque commémorative dorée sur la face visible depuis la rue
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 1.1), goldMat);
    plaque.position.set(-side * 0.98, 1.85, 0);
    monGroup.add(step1, step2, pedestalShaft, cornice, plaque);

    // 3. Statue en bronze héroïque sculptée
    const statueGroup = new THREE.Group();
    statueGroup.position.set(0, 3.05, 0);
    statueGroup.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.0, 0.42), bronzeMat);
    torso.position.y = 0.95;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), bronzeMat);
    head.position.y = 1.7;
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.22), bronzeMat);
    cape.position.set(0, 0.85, -0.22);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.85, 8), bronzeMat);
    armL.position.set(-0.46, 0.95, 0.1);
    armL.rotation.z = 0.35;
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 1.0, 8), bronzeMat);
    armR.position.set(0.46, 1.25, 0.28);
    armR.rotation.x = -0.45;
    armR.rotation.z = -0.45;
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), goldMat);
    sword.position.set(0.7, 1.8, 0.45);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.32), bronzeMat);
    legs.position.y = 0.35;

    statueGroup.add(torso, head, cape, armL, armR, sword, legs);
    monGroup.add(statueGroup);

    chunk.add(monGroup);
  }

  populateRuinsBuildings(chunk, side) {
    const xBase = side * 8.5;
    let currentZ = -this.chunkLength / 2;
    const buildingPalette = this.sharedMats?.buildingPalette || [new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.95 })];
    const rubbleMat = this.sharedMats?.rubbleMat || new THREE.MeshStandardMaterial({ color: 0x2d2d30, roughness: 0.95 });

    while (currentZ < this.chunkLength / 2) {
      const bWidth = 7.0 + Math.random() * 5.0;

      // Dégagement net des carrefours
      const bMinZ = chunk.position.z + currentZ;
      const bMaxZ = bMinZ + bWidth;
      const nearestInterZ = Math.round((bMinZ - 95) / 160) * 160 + 95;
      if (bMaxZ >= nearestInterZ - 17 && bMinZ <= nearestInterZ + 17) {
        currentZ = (nearestInterZ + 17.5) - chunk.position.z;
        continue;
      }

      const bHeight = 3.5 + Math.random() * 8.5; // Bâtiments effondrés de hauteur inégale
      const bDepth = 9.5;

      const randomMat = buildingPalette[Math.floor(Math.random() * buildingPalette.length)];
      const bGeo = new THREE.BoxGeometry(bDepth, bHeight, bWidth);
      const bMesh = new THREE.Mesh(bGeo, randomMat);

      // Inclinaison et effondrement asymétrique réaliste
      bMesh.rotation.z = side * (0.04 + Math.random() * 0.12);
      bMesh.rotation.x = (Math.random() - 0.5) * 0.12;
      bMesh.position.set(xBase + side * (bDepth / 2), bHeight / 2 - 0.2, currentZ + bWidth / 2);
      bMesh.castShadow = true;
      chunk.add(bMesh);

      // Piles d'éboulis et blocs de béton fissurés sur le trottoir
      for (let r = 0; r < 2; r++) {
        const rubbleSize = 0.6 + Math.random() * 0.7;
        const rubble = new THREE.Mesh(new THREE.BoxGeometry(rubbleSize, rubbleSize * 0.5, rubbleSize), rubbleMat);
        rubble.position.set(xBase - side * (1.2 + Math.random() * 1.6), 0.2, currentZ + Math.random() * bWidth);
        rubble.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
        chunk.add(rubble);
      }

      currentZ += bWidth;
    }
  }

  // --- CRÉATION DE JARDINS PUBLICS & SQUARES URBAINS ---
  createUrbanSquare(chunk, side, xBase, currentZ, bWidth, bDepth = 10.0) {
    const squareGroup = new THREE.Group();
    const centerZ = currentZ + bWidth / 2;
    const centerX = xBase + side * (bDepth / 2);
    squareGroup.position.set(centerX, 0, centerZ);

    const lawnMat = this.sharedMats?.lawn || new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.85 });
    const fenceMat = this.sharedMats?.fence || new THREE.MeshStandardMaterial({ color: 0x1e372f, roughness: 0.5, metalness: 0.5 });
    const stoneMat = this.sharedMats?.granite || new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.8 });
    const waterMat = this.sharedMats?.fountainWater || new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.2, metalness: 0.3 });
    const flowerMat1 = this.sharedMats?.flower1 || new THREE.MeshStandardMaterial({ color: 0xe84393, roughness: 0.7 });
    const flowerMat2 = this.sharedMats?.flower2 || new THREE.MeshStandardMaterial({ color: 0xfdcb6e, roughness: 0.7 });
    const benchWoodMat = this.sharedMats?.benchWood || new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 });

    // 1. Dalle de pelouse verdoyante
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(bDepth, 0.22, bWidth), lawnMat);
    lawn.position.y = 0.11;
    lawn.receiveShadow = true;
    squareGroup.add(lawn);

    // 2. Grille décorative en fer forgé le long de la rue (avec ouverture centrale)
    const fenceFrontZ = (bWidth / 2) - 0.4;
    [-fenceFrontZ * 0.65, fenceFrontZ * 0.65].forEach(fz => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, bWidth * 0.35), fenceMat);
      rail.position.set(-side * (bDepth / 2 - 0.2), 0.55, fz);
      squareGroup.add(rail);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8), fenceMat);
      post.position.set(-side * (bDepth / 2 - 0.2), 0.65, fz);
      squareGroup.add(post);
    });

    // 3. Fontaine circulaire centrale en pierre sculptée
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.5, 16), stoneMat);
    basin.position.set(0, 0.35, 0);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.08, 16), waterMat);
    water.position.set(0, 0.54, 0);
    const fountainCol = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.3, 12), stoneMat);
    fountainCol.position.set(0, 1.05, 0);
    const upperBasin = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.26, 12), stoneMat);
    upperBasin.position.set(0, 1.6, 0);
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 8), stoneMat);
    finial.position.set(0, 1.95, 0);
    squareGroup.add(basin, water, fountainCol, upperBasin, finial);

    // 4. Deux massifs de fleurs colorées
    [-bWidth * 0.3, bWidth * 0.3].forEach((fz, i) => {
      const bed = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.22, 10), i % 2 === 0 ? flowerMat1 : flowerMat2);
      bed.position.set(-side * 1.5, 0.22, fz);
      squareGroup.add(bed);
    });

    // 5. Bancs de parc parisiens en fonte et bois
    [-bWidth * 0.26, bWidth * 0.26].forEach(bz => {
      const bench = new THREE.Group();
      bench.position.set(side * 1.6, 0.11, bz);
      bench.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 1.6), benchWoodMat);
      seat.position.y = 0.4;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 1.6), benchWoodMat);
      back.position.set(-0.2, 0.62, 0);
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.4, 0.08), fenceMat);
      leg1.position.set(0, 0.2, -0.6);
      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.4, 0.08), fenceMat);
      leg2.position.set(0, 0.2, 0.6);
      bench.add(seat, back, leg1, leg2);
      squareGroup.add(bench);
    });

    chunk.add(squareGroup);
  }

  // --- CRÉATION DE PLACES MONUMENTALES AVEC STATUES COMMÉMORATIVES ---
  createUrbanMonument(chunk, side, xBase, currentZ, bWidth, bDepth = 10.0) {
    const monGroup = new THREE.Group();
    const centerZ = currentZ + bWidth / 2;
    const centerX = xBase + side * (bDepth / 2);
    monGroup.position.set(centerX, 0, centerZ);

    const plazaMat = this.sharedMats?.plaza || new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.8 });
    const graniteMat = this.sharedMats?.granite || new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.7 });
    const bronzeMat = this.sharedMats?.bronzeStatue || new THREE.MeshStandardMaterial({ color: 0x4a3728, metalness: 0.75, roughness: 0.35 });
    const goldMat = this.sharedMats?.yellow || new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.85, roughness: 0.25 });

    // 1. Esplanade pavée surélevée
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(bDepth, 0.22, bWidth), plazaMat);
    plaza.position.y = 0.11;
    plaza.receiveShadow = true;
    monGroup.add(plaza);

    // 2. Piédestal à degrés en granit
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.32, 3.4), graniteMat);
    step1.position.y = 0.32;
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.38, 2.6), graniteMat);
    step2.position.y = 0.65;
    const pedestalShaft = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.0, 1.9), graniteMat);
    pedestalShaft.position.y = 1.8;
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.24, 2.3), graniteMat);
    cornice.position.y = 2.92;

    // Plaque commémorative dorée sur la face visible depuis la rue
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 1.1), goldMat);
    plaque.position.set(-side * 0.98, 1.85, 0);
    monGroup.add(step1, step2, pedestalShaft, cornice, plaque);

    // 3. Statue en bronze héroïque sculptée
    const statueGroup = new THREE.Group();
    statueGroup.position.set(0, 3.05, 0);
    statueGroup.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.0, 0.42), bronzeMat);
    torso.position.y = 0.95;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), bronzeMat);
    head.position.y = 1.7;
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.22), bronzeMat);
    cape.position.set(0, 0.85, -0.22);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.85, 8), bronzeMat);
    armL.position.set(-0.46, 0.95, 0.1);
    armL.rotation.z = 0.35;
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 1.0, 8), bronzeMat);
    armR.position.set(0.46, 1.25, 0.28);
    armR.rotation.x = -0.45;
    armR.rotation.z = -0.45;
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), goldMat);
    sword.position.set(0.7, 1.8, 0.45);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.32), bronzeMat);
    legs.position.y = 0.35;

    statueGroup.add(torso, head, cape, armL, armR, sword, legs);
    monGroup.add(statueGroup);

    chunk.add(monGroup);
  }

  populateRuinsProps(chunk) {
    // 1. Cratères d'impact sur la chaussée avec cœur magmatique incandescent
    [-16, 10].forEach((z, idx) => {
      const craterGroup = new THREE.Group();
      const craterX = (idx % 2 === 0 ? -1.6 : 1.6) + (Math.random() - 0.5) * 1.0;
      craterGroup.position.set(craterX, 0.015, z);

      const rim = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.7, 12), this.sharedMats?.craterRimMat || new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.98 }));
      rim.rotation.x = -Math.PI / 2;
      craterGroup.add(rim);

      const core = new THREE.Mesh(new THREE.CircleGeometry(0.8, 12), this.sharedMats?.craterMagmaMat || new THREE.MeshBasicMaterial({ color: 0xff3838 }));
      core.rotation.x = -Math.PI / 2;
      core.position.y = 0.005;
      craterGroup.add(core);

      chunk.add(craterGroup);
    });

    // 2. Épaves calcinées et renversées
    [-22, 14].forEach((z, idx) => {
      const side = (idx % 2 === 0 ? 1 : -1);
      const wreckGroup = new THREE.Group();
      wreckGroup.position.set(side * 4.5, 0.35, z);
      wreckGroup.rotation.z = side * (0.35 + Math.random() * 0.4);
      wreckGroup.rotation.y = (Math.random() - 0.5) * 0.8;

      const wreckMat = this.sharedMats?.wreckMat || new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.92, metalness: 0.35 });
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 3.2), wreckMat);
      wreckGroup.add(chassis);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 1.5), wreckMat);
      cabin.position.set(0, 0.45, -0.2);
      wreckGroup.add(cabin);

      const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 8);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.95 });
      [-0.8, 0.8].forEach(wx => {
        [-0.9, 0.9].forEach(wz => {
          const wheel = new THREE.Mesh(wheelGeo, wheelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wx, -0.15, wz);
          wreckGroup.add(wheel);
        });
      });

      chunk.add(wreckGroup);
    });

    // 3. Mâts et lampadaires tordus
    [-6].forEach(z => {
      const lampGroup = new THREE.Group();
      lampGroup.position.set(-4.5, 0, z);
      lampGroup.rotation.z = -0.52;
      lampGroup.rotation.y = 0.25;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.8, 6), this.sharedMats?.mast || new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: 0.85 }));
      mast.position.y = 1.9;
      lampGroup.add(mast);
      chunk.add(lampGroup);
    });
  }

  // --- CRÉATION DE STANDS DE RUE RÉALISTES & PITTORESQUES (PRIMEURS, BOUQUINISTES, STREET FOOD, FLEURISTES) ---
  createMarketStall(chunk, side, z, stallType = 'stall_primeur') {
    const stallGroup = new THREE.Group();
    // Position sur la moitié avant du trottoir, face à la rue (largeur chaussée = 8.4m, trottoir = 3.5m)
    const xPos = side * 4.8;
    stallGroup.position.set(xPos, 0, z);
    // Légère orientation vers la rue pour une excellente visibilité par le pilote
    stallGroup.rotation.y = side > 0 ? -Math.PI / 2 + 0.12 : Math.PI / 2 - 0.12;

    const woodMat = this.sharedMats?.wood || new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.85 });
    const lampMat = this.sharedMats?.lamp || new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.7 });

    if (stallType === 'stall_primeur') {
      stallGroup.userData = { type: 'stall_primeur', isHit: false, initialY: 0, initialRot: stallGroup.rotation.clone() };

      // 1. Table de marché en bois
      const table = new THREE.Mesh(this.sharedGeos.stallCounter, woodMat);
      table.position.y = 0.38;
      stallGroup.add(table);

      // 2. Cagettes de fruits inclinées vers l'avant
      const appleMat = this.sharedMats?.fruitApple || new THREE.MeshToonMaterial({ color: 0xe74c3c });
      const orangeMat = this.sharedMats?.fruitOrange || new THREE.MeshToonMaterial({ color: 0xe67e22 });
      const lemonMat = this.sharedMats?.fruitLemon || new THREE.MeshToonMaterial({ color: 0xf1c40f });
      const crateMat = this.sharedMats?.benchWood || woodMat;

      [-0.55, 0, 0.55].forEach((zOff, i) => {
        const crateFront = new THREE.Mesh(this.sharedGeos.stallCrate, crateMat);
        crateFront.position.set(-0.15, 0.85, zOff);
        crateFront.rotation.z = -0.32;
        stallGroup.add(crateFront);

        const fMat = i === 0 ? appleMat : (i === 1 ? orangeMat : lemonMat);
        for (let fx = -0.15; fx <= 0.15; fx += 0.15) {
          for (let fz = -0.12; fz <= 0.12; fz += 0.12) {
            const fruit = new THREE.Mesh(this.sharedGeos.amphoraBelly, fMat);
            fruit.scale.set(0.26, 0.26, 0.26);
            fruit.position.set(-0.15 + fx * 0.5, 0.96, zOff + fz);
            stallGroup.add(fruit);
          }
        }
      });

      // 3. Poteaux fins et auvent rayé protecteur
      [[-0.45, -0.85], [-0.45, 0.85], [0.45, -0.85], [0.45, 0.85]].forEach(([px, pz]) => {
        const pole = new THREE.Mesh(this.sharedGeos.stallAwningPole, lampMat);
        pole.position.set(px, 1.25, pz);
        stallGroup.add(pole);
      });

      const awningTex = textureFactory.getAwningTexture('#e74c3c');
      const awningMat = new THREE.MeshStandardMaterial({ map: awningTex, roughness: 0.7 });
      const awning = new THREE.Mesh(this.sharedGeos.stallAwning, awningMat);
      awning.position.set(0, 2.15, 0);
      awning.rotation.z = -0.15;
      stallGroup.add(awning);

      // 4. Ardoise de prix
      const slateMat = this.sharedMats?.chalkboard || new THREE.MeshStandardMaterial({ color: 0x222f3e, roughness: 0.9 });
      const slate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.04), slateMat);
      slate.position.set(-0.52, 0.65, 0.6);
      slate.rotation.y = 0.2;
      stallGroup.add(slate);

    } else if (stallType === 'stall_bouquiniste') {
      stallGroup.userData = { type: 'stall_bouquiniste', isHit: false, initialY: 0, initialRot: stallGroup.rotation.clone() };

      // Meuble / Boîte de bouquiniste vert sombre
      const bouquinisteMat = new THREE.MeshStandardMaterial({ color: 0x1b4332, roughness: 0.8 });
      const trough = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 2.0), bouquinisteMat);
      trough.position.y = 0.8;
      stallGroup.add(trough);

      // Piètement en tréteaux fer forgé
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.08), lampMat);
      leg1.position.set(0, 0.4, -0.75);
      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.08), lampMat);
      leg2.position.set(0, 0.4, 0.75);
      stallGroup.add(leg1, leg2);

      // Couvercle relevé typique avec tige de maintien
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 2.0), bouquinisteMat);
      lid.position.set(0.32, 1.35, 0);
      lid.rotation.z = -Math.PI / 3;
      const propStay = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), lampMat);
      propStay.position.set(0.18, 1.25, -0.85);
      stallGroup.add(lid, propStay);

      // Rangées de livres colorés
      const bookMat = this.sharedMats?.bookCovers || new THREE.MeshToonMaterial({ color: 0x2c3e50 });
      const pageMat = this.sharedMats?.marble || new THREE.MeshToonMaterial({ color: 0xf5f6fa });
      [-0.18, 0.12].forEach((xOff) => {
        const row = new THREE.Mesh(this.sharedGeos.bookRow, bookMat);
        row.position.set(xOff, 1.05, 0);
        const pages = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 1.76), pageMat);
        pages.position.set(xOff, 1.22, 0);
        stallGroup.add(row, pages);
      });

    } else if (stallType === 'stall_streetfood') {
      stallGroup.userData = { type: 'stall_streetfood', isHit: false, initialY: 0, initialRot: stallGroup.rotation.clone() };

      // Chariot ambulant rétro (street food, glaces, crêpes)
      const cartBodyMat = this.sharedMats?.metalCart || new THREE.MeshStandardMaterial({ color: 0x10ac84, roughness: 0.35 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.72, 1.5), cartBodyMat);
      body.position.y = 0.65;
      stallGroup.add(body);

      // Comptoir inox brillant
      const steelMat = this.sharedMats?.chromeCloche || new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.2, metalness: 0.9 });
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.06, 1.56), steelMat);
      top.position.y = 1.03;
      stallGroup.add(top);

      // Cloches gastronormes argentées
      [-0.4, 0.1, 0.4].forEach(zOff => {
        const cloche = new THREE.Mesh(this.sharedGeos.stallCloche, steelMat);
        cloche.position.set(0, 1.15, zOff);
        stallGroup.add(cloche);
      });

      // 2 Grandes roues à rayons rétro
      const wheelMat = lampMat;
      [-0.5, 0.5].forEach(zOff => {
        const wheel = new THREE.Mesh(this.sharedGeos.stallWheel, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(-0.46, 0.32, zOff);
        stallGroup.add(wheel);
      });

      // Poignée de poussée en métal chromé
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), steelMat);
      handle.position.set(0, 1.05, 0.88);
      stallGroup.add(handle);

      // Grand parasol de marchand ambulant
      const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6), woodMat);
      umbrellaPole.position.set(0, 1.35, 0);
      const umbrellaTex = textureFactory.getAwningTexture('#f39c12');
      const umbrellaMat = new THREE.MeshStandardMaterial({ map: umbrellaTex, roughness: 0.65 });
      const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.45, 8), umbrellaMat);
      umbrella.position.set(0, 2.45, 0);
      stallGroup.add(umbrellaPole, umbrella);

    } else if (stallType === 'stall_fleuriste') {
      stallGroup.userData = { type: 'stall_fleuriste', isHit: false, initialY: 0, initialRot: stallGroup.rotation.clone() };

      // Étagère fleuriste 3 niveaux en bois
      [0.35, 0.65, 0.95].forEach((yStep, idx) => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 1.8), woodMat);
        shelf.position.set(-0.25 + idx * 0.22, yStep, 0);
        stallGroup.add(shelf);
      });

      // Seaux en zinc et pots en terre cuite remplis de fleurs éclatantes
      const zincMat = this.sharedMats?.metalZinc || new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.4 });
      const flowerMats = [
        this.sharedMats?.flowerRed || new THREE.MeshToonMaterial({ color: 0xff4757 }),
        this.sharedMats?.flowerYellow || new THREE.MeshToonMaterial({ color: 0xfffa65 }),
        this.sharedMats?.flowerPurple || new THREE.MeshToonMaterial({ color: 0xa55eea })
      ];

      [-0.55, 0, 0.55].forEach((zOff, i) => {
        const bucket = new THREE.Mesh(this.sharedGeos.flowerBucket, zincMat);
        bucket.position.set(-0.15, 0.6, zOff);
        stallGroup.add(bucket);

        const bouquet = new THREE.Mesh(this.sharedGeos.amphoraBelly, flowerMats[i % 3]);
        bouquet.scale.set(0.42, 0.35, 0.42);
        bouquet.position.set(-0.15, 0.95, zOff);
        stallGroup.add(bouquet);

        const pot = new THREE.Mesh(this.sharedGeos.amphora, this.sharedMats?.terracotta || woodMat);
        pot.scale.set(0.6, 0.6, 0.6);
        pot.position.set(0.15, 1.15, zOff);
        const topBouquet = new THREE.Mesh(this.sharedGeos.amphoraBelly, flowerMats[(i + 1) % 3]);
        topBouquet.scale.set(0.32, 0.28, 0.32);
        topBouquet.position.set(0.15, 1.45, zOff);
        stallGroup.add(pot, topBouquet);
      });

      // Auvent léger au-dessus du stand
      const flowerAwningTex = textureFactory.getAwningTexture('#27ae60');
      const flowerAwningMat = new THREE.MeshStandardMaterial({ map: flowerAwningTex, roughness: 0.7 });
      const awning = new THREE.Mesh(this.sharedGeos.stallAwning, flowerAwningMat);
      awning.position.set(0, 2.2, 0);
      awning.rotation.z = -0.18;
      const pole = new THREE.Mesh(this.sharedGeos.stallAwningPole, lampMat);
      pole.position.set(0, 1.3, -0.85);
      const pole2 = new THREE.Mesh(this.sharedGeos.stallAwningPole, lampMat);
      pole2.position.set(0, 1.3, 0.85);
      stallGroup.add(awning, pole, pole2);
    }

    chunk.add(stallGroup);
    chunk.userData.props.push(stallGroup);
  }

  populateStreetProps(chunk) {
    if (this.isRuinsMode) {
      this.populateRuinsProps(chunk);
      return;
    }

    if (this.isDamMission) {
      // --- ACCESSOIRES FLUVIAUX : BOUÉES DE NAVIGATION JAUNES & BALISES ---
      const buoyMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.4 });
      const buoyLightMat = new THREE.MeshBasicMaterial({ color: 0xffa502 });
      [-18, 6].forEach((z, idx) => {
        const side = idx % 2 === 0 ? 1 : -1;
        const buoyGroup = new THREE.Group();
        buoyGroup.position.set(side * 4.6, 0.4, z);
        const floatMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, 0.6, 10), buoyMat);
        const lightMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), buoyLightMat);
        lightMesh.position.y = 0.55;
        buoyGroup.add(floatMesh, lightMesh);
        buoyGroup.userData = { type: 'lamp', isHit: false };
        chunk.add(buoyGroup);
        chunk.userData.props.push(buoyGroup);
      });
      return;
    }

    if (this.isNuclearMission) {
      // --- ACCESSOIRES NUCLÉAIRES : FÛTS DE DÉCHETS RADIOACTIFS 200L & FLUIDE VERT ---
      const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.6 });
      const toxicGreenMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
      [-16, 8].forEach((z, idx) => {
        const side = idx % 2 === 0 ? 1 : -1;
        const barrelGroup = new THREE.Group();
        barrelGroup.position.set(side * 4.6, 0, z);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.95, 10), barrelMat);
        barrel.position.y = 0.48;
        const drip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), toxicGreenMat);
        drip.position.set(0.15, 0.96, 0);
        barrelGroup.add(barrel, drip);
        barrelGroup.userData = { type: 'tree', isHit: false };
        chunk.add(barrelGroup);
        chunk.userData.props.push(barrelGroup);
      });
      return;
    }

    if (this.isMountainMission) {
      // --- ACCESSOIRES MONTAGNE : SAPINS ENNEIGÉS & BALISES DE PISTE DE SKI ---
      const pineWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1b });
      const pineNeedleMat = new THREE.MeshStandardMaterial({ color: 0x1e3728 });
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa });
      [-20, -5, 12].forEach((z, idx) => {
        const side = idx % 2 === 0 ? 1 : -1;
        const pine = new THREE.Group();
        pine.position.set(side * 4.8, 0, z);
        pine.userData = { type: 'tree', isHit: false };
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.4, 6), pineWoodMat);
        trunk.position.y = 0.7;
        const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 6), pineNeedleMat);
        cone1.position.y = 2.0;
        const cone2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.8, 6), pineNeedleMat);
        cone2.position.y = 3.2;
        const snowTop = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.0, 6), snowMat);
        snowTop.position.y = 3.9;
        pine.add(trunk, cone1, cone2, snowTop);
        chunk.add(pine);
        chunk.userData.props.push(pine);
      });
      return;
    }

    const isRiviera = (this.cityTheme.id === 'nice' || this.cityTheme.id === 'marseille');
    const isMed = ['nice', 'marseille', 'barcelone', 'madrid', 'lisbonne', 'rome', 'napoli', 'tunis', 'annaba', 'alger'].includes(this.cityTheme.id);
    const isItaly = (this.cityTheme.id === 'rome' || this.cityTheme.id === 'napoli' || this.cityTheme.id === 'milan');
    const isIberia = (this.cityTheme.id === 'barcelone' || this.cityTheme.id === 'madrid' || this.cityTheme.id === 'lisbonne');
    const isMaghreb = (this.cityTheme.id === 'tunis' || this.cityTheme.id === 'alger' || this.cityTheme.id === 'annaba');

    // Réemploi strict du pool de matériaux partagés (zéro instanciation par chunk,
    // zéro compilation shader redondante, zéro fuite progressive sur setCity)
    const foliageMat1 = this.sharedMats.foliage1;
    const foliageMat2 = this.sharedMats.foliage2;
    const woodMat = this.sharedMats.wood;
    const lampMat = this.sharedMats.lamp;
    const glowMat = this.sharedMats.lampBulb;
    const yellowMat = this.sharedMats.yellow || (this.sharedMats.yellow = new THREE.MeshToonMaterial({ color: 0xf1c40f, gradientMap: textureFactory.getToonGradientMap() }));
    const marbleMat = this.sharedMats.marble || (this.sharedMats.marble = new THREE.MeshToonMaterial({ color: 0xf5f6fa, gradientMap: textureFactory.getToonGradientMap() }));
    const terracottaMat = this.sharedMats.terracotta || (this.sharedMats.terracotta = new THREE.MeshToonMaterial({ color: 0xd35400, gradientMap: textureFactory.getToonGradientMap() }));

    const propPositionsZ = [-22, -11, 4, 18];

    propPositionsZ.forEach((z, idx) => {
      const side = (idx % 2 === 0 ? 1 : -1);
      const xSidewalk = side * 5.2;

      // Réverbère haussmannien élégant et sobre
      const lamp = new THREE.Group();
      lamp.position.set(side * 4.6, 0, z);
      lamp.userData = { type: 'lamp', isHit: false };

      // 1. Socle cannelé en fonte
      const baseMesh = new THREE.Mesh(this.sharedGeos.lampBase, lampMat);
      baseMesh.position.y = 0.35;
      lamp.add(baseMesh);

      // 2. Colonne fuselée
      const pole = new THREE.Mesh(this.sharedGeos.lampPost, lampMat);
      pole.position.y = 2.4;
      lamp.add(pole);

      // 3. Crosse courbée en col de cygne surplombant le trottoir
      const arm = new THREE.Mesh(this.sharedGeos.lampArm, lampMat);
      arm.rotation.z = side > 0 ? 0.45 : -0.45;
      arm.position.set(-side * 0.22, 4.3, 0);
      lamp.add(arm);

      // 4. Lanterne parisienne avec chapeau en fonte et diffuseur chaud
      const cap = new THREE.Mesh(this.sharedGeos.lampCap, lampMat);
      cap.position.set(-side * 0.45, 4.45, 0);
      lamp.add(cap);

      const bulb = new THREE.Mesh(this.sharedGeos.lampBulb, glowMat);
      bulb.position.set(-side * 0.45, 4.25, 0);
      lamp.add(bulb);

      chunk.add(lamp);
      chunk.userData.props.push(lamp);

      // Spécificités par Pays / Région au trottoir (sans objets verts bizarres sur les côtés de la rue)
      if (idx === 0) {
        if (isItaly) {
          // Colonne antique romaine sculptée avec amphore en terre cuite
          const colGroup = new THREE.Group();
          colGroup.position.set(xSidewalk + side * 0.3, 0, z + 2);
          colGroup.userData = { type: 'lamp', isHit: false };
          const colShaft = new THREE.Mesh(this.sharedGeos.romanColumn, marbleMat);
          colShaft.position.y = 2.1;
          const colCap = new THREE.Mesh(this.sharedGeos.romanCapital, marbleMat);
          colCap.position.y = 4.3;
          const amphora = new THREE.Group();
          amphora.position.set(-side * 0.6, 0.5, 0);
          const aBody = new THREE.Mesh(this.sharedGeos.amphoraBelly, terracottaMat);
          aBody.position.y = 0.35;
          const aNeck = new THREE.Mesh(this.sharedGeos.amphora, terracottaMat);
          aNeck.position.y = 0.55;
          amphora.add(aBody, aNeck);
          colGroup.add(colShaft, colCap, amphora);
          chunk.add(colGroup);
          chunk.userData.props.push(colGroup);
        } else if (isMaghreb) {
          // Terracotta amphore géante et palmette d'oasis
          const oaseGroup = new THREE.Group();
          oaseGroup.position.set(xSidewalk + side * 0.3, 0, z + 2);
          oaseGroup.userData = { type: 'lamp', isHit: false };
          const aBody = new THREE.Mesh(this.sharedGeos.amphoraBelly, terracottaMat);
          aBody.scale.set(1.4, 1.4, 1.4);
          aBody.position.y = 0.55;
          const aNeck = new THREE.Mesh(this.sharedGeos.amphora, terracottaMat);
          aNeck.scale.set(1.4, 1.4, 1.4);
          aNeck.position.y = 0.9;
          oaseGroup.add(aBody, aNeck);
          chunk.add(oaseGroup);
          chunk.userData.props.push(oaseGroup);
        } else {
          // Mobilier de trottoir authentique & diversifié selon la ville (bancs en fonte, boîtes postales nationales)
          const propGroup = new THREE.Group();
          propGroup.position.set(xSidewalk + side * 0.4, 0, z + 2);

          if (idx === 0) {
            // Boîte postale aux couleurs officielles du pays
            const isUK = ['londres', 'dublin', 'newcastle'].includes(this.cityTheme.id);
            const isNordic = ['reykjavik', 'oslo', 'stockholm', 'copenhague', 'helsinki'].includes(this.cityTheme.id);
            const boxColor = isUK ? 0xd63031 : (isNordic ? 0x0984e3 : 0xf1c40f);
            const mailMat = new THREE.MeshToonMaterial({ color: boxColor });
            const postPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), lampMat);
            postPillar.position.y = 0.4;
            const mailBox = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.55, 0.32), mailMat);
            mailBox.position.y = 0.95;
            propGroup.add(postPillar, mailBox);
          } else {
            // Banc de repos élégant en bois et fonte
            const benchMat = this.sharedMats?.benchWood || new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 });
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 1.4), benchMat);
            seat.position.y = 0.38;
            const back = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.38, 1.4), benchMat);
            back.position.set(-side * 0.18, 0.58, 0);
            const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.07), lampMat);
            leg1.position.set(0, 0.19, -0.55);
            const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.07), lampMat);
            leg2.position.set(0, 0.19, 0.55);
            propGroup.add(seat, back, leg1, leg2);
          }

          chunk.add(propGroup);
          chunk.userData.props.push(propGroup);
        }
      }
    });

    // 5. Stand de rue authentique et pittoresque (primeurs, bouquinistes, marchand ambulant, fleuriste)
    // Placé sur le trottoir le long de la rue avec alternance et variété
    const stallTypes = ['stall_primeur', 'stall_bouquiniste', 'stall_streetfood', 'stall_fleuriste'];
    const chunkHash = Math.abs(Math.round(chunk.position.z / 60));
    const stallType = stallTypes[chunkHash % stallTypes.length];
    const stallSide = (chunkHash % 2 === 0) ? 1 : -1;
    this.createMarketStall(chunk, stallSide, 8, stallType);
  }

  update(playerZ, delta = 0.016) {
    this.animTime += delta;
    this.animatedFlags.forEach(f => {
      f.rotation.y = Math.sin(this.animTime * 4.5 + f.userData.seed) * 0.28;
    });

    const threshold = playerZ - this.chunkLength;

    this.chunks.forEach(chunk => {
      if (chunk.position.z + this.chunkLength < threshold) {
        const furthestZ = Math.max(...this.chunks.map(c => c.position.z));
        const newZ = furthestZ + this.chunkLength;
        const newX = this.getRoadCenterX(newZ);
        const newAngle = this.getRoadAngle(newZ);

        chunk.position.set(newX, 0, newZ);
        chunk.rotation.y = newAngle;

        // Réinitialiser les dos d'âne du chunk recyclé
        if (this.speedBumps) {
          this.speedBumps.forEach(b => {
            if (b.chunk === chunk) b.hit = false;
          });
        }

        // Réinitialiser les accessoires urbains (feux tricolores, lampadaires, arbres, stands de rue)
        // afin d'éliminer définitivement les feux couchés ou stands invisibles après recyclage !
        if (chunk.userData && chunk.userData.props) {
          chunk.userData.props.forEach(prop => {
            prop.userData.isHit = false;
            prop.visible = true;
            if (prop.userData.initialY !== undefined) {
              prop.position.y = prop.userData.initialY;
            }
            if (prop.userData.initialRot) {
              prop.rotation.copy(prop.userData.initialRot);
            } else {
              prop.rotation.set(0, 0, 0);
            }
          });
        }
      }
    });

    // Animation du Déluge Aquatique (Tsunami déferlant vers l'avant)
    if (this.delugeActive && this.damFloodGroup) {
      this.delugeZ -= delta * 46.0;
      this.damFloodGroup.position.z = (this.delugeZ - 600);
      this.damFloodGroup.rotation.x = Math.sin(this.animTime * 6.0) * 0.15;
    }

    // Animation de l'Éboulement & Avalanche de Roches
    if (this.avalancheActive && this.mountainBoulders) {
      this.mountainBoulders.forEach(b => {
        if (b.mesh) {
          b.mesh.position.y = Math.max(1.5, b.mesh.position.y - delta * 22.0);
          b.mesh.position.z -= delta * b.speed;
          b.mesh.rotation.x += delta * b.rotSpeed;
          b.mesh.rotation.y += delta * (b.rotSpeed * 0.7);
        }
      });
    }

    if (this.landmark && !this.isCataclysmMission) {
      this.landmark.position.z = playerZ + 180;
    }
  }

  destroyNuclearPlant() {
    if (this.nuclearTowers) {
      if (this.nuclearTowers[0]) {
        this.nuclearTowers[0].rotation.z = -0.35;
        this.nuclearTowers[0].rotation.x = 0.2;
        this.nuclearTowers[0].position.y = 15;
      }
      if (this.nuclearTowers[1]) {
        this.nuclearTowers[1].rotation.z = 0.35;
        this.nuclearTowers[1].rotation.x = -0.2;
        this.nuclearTowers[1].position.y = 15;
      }
    }
    if (this.nuclearSteam) {
      this.nuclearSteam.forEach(s => {
        if (s) {
          s.scale.set(3.5, 4.5, 3.5);
          if (s.material && s.material.color) s.material.color.setHex(0xff4757);
        }
      });
    }
    if (this.nuclearGate) {
      this.nuclearGate.rotation.y = 1.4;
      this.nuclearGate.position.y = -0.5;
    }
    if (this.nuclearReactorGroup) {
      this.nuclearReactorGroup.scale.set(1.2, 0.4, 1.2);
      this.nuclearReactorGroup.position.y = -2;
    }
    if (this.nuclearCoreMesh) {
      this.nuclearCoreMesh.scale.set(4, 4, 4);
      if (this.nuclearCoreMesh.material && this.nuclearCoreMesh.material.color) {
        this.nuclearCoreMesh.material.color.setHex(0xff3838);
      }
    }
  }

  destroyDam() {
    if (this.damCenter) {
      this.damCenter.position.y = -6; // Effondrement des vannes
      this.damCenter.rotation.x = 0.5;
    }
    if (this.damWallL) {
      this.damWallL.rotation.z = -0.32;
      this.damWallL.position.x = -22;
    }
    if (this.damWallR) {
      this.damWallR.rotation.z = 0.32;
      this.damWallR.position.x = 22;
    }
    if (this.damChute) {
      this.damChute.scale.set(2.8, 3.5, 2.2);
    }
    if (this.damFloodGroup) {
      this.damFloodGroup.visible = true;
      this.delugeActive = true;
      this.delugeZ = 600;
    }
  }

  destroyMountain() {
    if (this.mountainCenter) {
      this.mountainCenter.position.y -= 14;
      this.mountainCenter.rotation.z = 0.45;
      this.mountainCenter.rotation.x = 0.3;
    }
    this.avalancheActive = true;
  }
}

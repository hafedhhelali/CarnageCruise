/**
 * Motormageddon - Générateur d'Environnements Urbains 3D Français
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
      treeFoliage: new THREE.SphereGeometry(1.2, 7, 6),
      palmTrunk: new THREE.CylinderGeometry(0.18, 0.26, 4.0, 6),
      palmLeaf: new THREE.BoxGeometry(0.3, 0.05, 2.2),
      lampPost: new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6),
      lampBulb: new THREE.SphereGeometry(0.2, 8, 8),
      mailbox: new THREE.BoxGeometry(0.4, 0.7, 0.35),
      romanColumn: new THREE.CylinderGeometry(0.28, 0.32, 4.2, 8),
      romanCapital: new THREE.BoxGeometry(0.85, 0.35, 0.85),
      amphora: new THREE.CylinderGeometry(0.22, 0.15, 0.9, 8),
      amphoraBelly: new THREE.SphereGeometry(0.35, 8, 8)
    };
  }

  setCity(cityDef, finishDistance = null) {
    this.cityTheme = cityDef;
    if (finishDistance) {
      this.finishDistance = finishDistance;
    } else if (cityDef.isNuclearMission) {
      this.finishDistance = 1350;
    } else {
      this.finishDistance = 1400; // Trajets raccourcis à 1400m
    }
    this.finishReached = false;
    this.animatedFlags = [];

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
      this.nuclearReactorGroup = domeGroup;
      this.nuclearCoreMesh = coreMesh;
      lmGroup.add(nucGroup);
    } else if (cityId === 'paris') {
      // 1. TOUR EIFFEL MONUMENTALE
      const eiffelMat = new THREE.MeshToonMaterial({ color: 0x5a4d41, metalness: 0.5, roughness: 0.5 });
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
      const graniteMat = new THREE.MeshToonMaterial({ color: 0xdcdde1, roughness: 0.6 });
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
      const stoneMat = new THREE.MeshToonMaterial({ color: 0xf5f6fa, roughness: 0.5 });
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
      const travertineMat = new THREE.MeshToonMaterial({ color: 0xecd5b3, roughness: 0.7 });
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
      const rockMat = new THREE.MeshToonMaterial({ color: 0x485460, roughness: 0.9 });
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
      const stoneMat = new THREE.MeshToonMaterial({ color: 0xf7d794, roughness: 0.6 });
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
      const marbleMat = new THREE.MeshToonMaterial({ color: 0xf5f6fa, roughness: 0.5 });
      const domeTurquoiseMat = new THREE.MeshToonMaterial({ color: 0x00cec9, roughness: 0.3 });
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

    // Asphalte texturé HD avec vibreurs de course et traces de pneus
    const roadTex = textureFactory.getRoadTexture().clone();
    roadTex.repeat.set(1, this.chunkLength / 14);
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.85,
      metalness: 0.05
    });

    // Pavés parisiens biseautés HD
    const sidewalkTex = textureFactory.getSidewalkTexture().clone();
    sidewalkTex.repeat.set(1.5, this.chunkLength / 4);
    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.7,
      metalness: 0.05
    });

    const curbMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.6 });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Chaussée
    const road = new THREE.Mesh(this.sharedGeos.road, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    chunk.add(road);

    // Bandes blanches centrales
    const numStripes = Math.floor(this.chunkLength / 7);
    for (let i = 0; i < numStripes; i++) {
      const stripe = new THREE.Mesh(this.sharedGeos.stripe, stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.01, -this.chunkLength / 2 + i * 7 + 3.5);
      chunk.add(stripe);
    }

    // Passage piéton tous les 60m avec FEUX TRICOLORES RÉALISTES
    if (Math.abs(zPos) % 60 === 0) {
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
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.6, 8), new THREE.MeshStandardMaterial({ color: 0x2d3436 }));
        mast.position.y = 2.3;
        tlGroup.add(mast);

        // Boîtier noir à 3 feux
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 0.32), new THREE.MeshToonMaterial({ color: 0x1e272e }));
        box.position.set(0, 3.8, 0);
        tlGroup.add(box);

        // Feu ROUGE éclatant au sommet (Interdit aux véhicules quand piétons traversent)
        const redLight = new THREE.Mesh(new THREE.CircleGeometry(0.12, 10), new THREE.MeshBasicMaterial({ color: 0xff3838 }));
        redLight.position.set(0, 4.15, -0.17);
        redLight.rotation.y = Math.PI;

        // Feu ORANGE
        const amberLight = new THREE.Mesh(new THREE.CircleGeometry(0.1, 8), new THREE.MeshBasicMaterial({ color: 0x57606f }));
        amberLight.position.set(0, 3.8, -0.17);
        amberLight.rotation.y = Math.PI;

        // Feu VERT
        const greenLight = new THREE.Mesh(new THREE.CircleGeometry(0.1, 8), new THREE.MeshBasicMaterial({ color: 0x2f3542 }));
        greenLight.position.set(0, 3.45, -0.17);
        greenLight.rotation.y = Math.PI;

        tlGroup.add(redLight, amberLight, greenLight);
        chunk.userData.props.push(tlGroup);
        return tlGroup;
      };

      chunk.add(createTrafficLight(-1));
      chunk.add(createTrafficLight(1));
    }

    // Trottoirs gauche et droite
    const sidewalkL = new THREE.Mesh(this.sharedGeos.sidewalk, sidewalkMat);
    sidewalkL.position.set(-5.95, 0.125, 0);
    chunk.add(sidewalkL);

    const curbL = new THREE.Mesh(this.sharedGeos.curb, curbMat);
    curbL.position.set(-4.25, 0.15, 0);
    chunk.add(curbL);

    const sidewalkR = new THREE.Mesh(this.sharedGeos.sidewalk, sidewalkMat);
    sidewalkR.position.set(5.95, 0.125, 0);
    chunk.add(sidewalkR);

    const curbR = new THREE.Mesh(this.sharedGeos.curb, curbMat);
    curbR.position.set(4.25, 0.15, 0);
    chunk.add(curbR);

    // Bâtiments
    this.populateBuildings(chunk, -1);
    this.populateBuildings(chunk, 1);

    // Accessoires urbains et terrasses
    this.populateStreetProps(chunk);

    return chunk;
  }

  populateBuildings(chunk, side) {
    const xBase = side * 8.5;
    let currentZ = -this.chunkLength / 2;

    const buildingMatPalette = this.cityTheme.buildingColors.map(c =>
      new THREE.MeshToonMaterial({ color: c, roughness: 0.4 })
    );
    const roofMat = new THREE.MeshToonMaterial({ color: this.cityTheme.roofColor, roughness: 0.3 });
    const darkWinMat = new THREE.MeshBasicMaterial({ color: 0x1e272e });
    const litWinMat = new THREE.MeshBasicMaterial({ color: 0xfff2a3 }); // Fenêtres chaleureuses illuminées
    const balconyMat = new THREE.MeshToonMaterial({ color: 0x2d3436, metalness: 0.5 });
    const awningMats = [
      new THREE.MeshToonMaterial({ color: 0xc0392b }),
      new THREE.MeshToonMaterial({ color: 0x27ae60 }),
      new THREE.MeshToonMaterial({ color: 0x2980b9 }),
      new THREE.MeshToonMaterial({ color: 0xf39c12 })
    ];

    while (currentZ < this.chunkLength / 2) {
      const bWidth = 8.5 + Math.random() * 5.0;
      const bHeight = 13.0 + Math.random() * 14.0;
      const bDepth = 10.0;

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
      const hexColorStr = '#' + (this.cityTheme.buildingColors[0] || 0xdfe4ea).toString(16).padStart(6, '0');
      const roofColorStr = '#' + (this.cityTheme.roofColor || 0x576574).toString(16).padStart(6, '0');
      const facadeTex = textureFactory.getHaussmannFacadeTexture(hexColorStr, roofColorStr);
      const facadeMat = new THREE.MeshStandardMaterial({
        map: facadeTex,
        roughness: 0.8,
        metalness: 0.05
      });
      const facadeMesh = new THREE.Mesh(new THREE.PlaneGeometry(bWidth, bHeight), facadeMat);
      facadeMesh.position.set(xBase - side * 0.08, bHeight / 2, currentZ + bWidth / 2);
      facadeMesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      chunk.add(facadeMesh);

      // Store banne de bistrot ou boutique avec texture rayée réaliste
      if (Math.random() < 0.75) {
        const awningTex = textureFactory.getAwningTexture(side > 0 ? '#e74c3c' : '#2980b9');
        const awningMat = new THREE.MeshStandardMaterial({
          map: awningTex,
          roughness: 0.7
        });
        const awningGeo = new THREE.BoxGeometry(1.8, 0.35, bWidth * 0.75);
        const awning = new THREE.Mesh(awningGeo, awningMat);
        awning.rotation.z = side * 0.35;
        awning.position.set(xBase - side * 0.7, 3.2, currentZ + bWidth / 2);
        chunk.add(awning);
      }

      currentZ += bWidth;
    }
  }

  populateStreetProps(chunk) {
    const isRiviera = (this.cityTheme.id === 'nice' || this.cityTheme.id === 'marseille');
    const isMed = ['nice', 'marseille', 'barcelone', 'madrid', 'lisbonne', 'rome', 'napoli', 'tunis', 'annaba', 'alger'].includes(this.cityTheme.id);
    const isItaly = (this.cityTheme.id === 'rome' || this.cityTheme.id === 'napoli' || this.cityTheme.id === 'milan');
    const isIberia = (this.cityTheme.id === 'barcelone' || this.cityTheme.id === 'madrid' || this.cityTheme.id === 'lisbonne');
    const isMaghreb = (this.cityTheme.id === 'tunis' || this.cityTheme.id === 'alger' || this.cityTheme.id === 'annaba');

    const foliageMat1 = new THREE.MeshToonMaterial({ color: (isRiviera || isMed) ? 0x27ae60 : 0x2ecc71 });
    const foliageMat2 = new THREE.MeshToonMaterial({ color: (isRiviera || isMed) ? 0x1e8449 : 0x27ae60 });
    const woodMat = new THREE.MeshToonMaterial({ color: 0x5d4037 });
    const lampMat = new THREE.MeshToonMaterial({ color: 0x263238 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
    const yellowMat = new THREE.MeshToonMaterial({ color: 0xf1c40f });
    const marbleMat = new THREE.MeshToonMaterial({ color: 0xf5f6fa });
    const terracottaMat = new THREE.MeshToonMaterial({ color: 0xd35400 });

    const propPositionsZ = [-22, -11, 4, 18];

    propPositionsZ.forEach((z, idx) => {
      const side = (idx % 2 === 0 ? 1 : -1);
      const xSidewalk = side * 5.2;

      // Réverbère parisien ou lanterne méditerranéenne
      const lamp = new THREE.Group();
      lamp.position.set(side * 4.6, 0, z);
      lamp.userData = { type: 'lamp', isHit: false };

      const pole = new THREE.Mesh(this.sharedGeos.lampPost, lampMat);
      pole.position.y = 2.1;
      lamp.add(pole);

      const bulb = new THREE.Mesh(this.sharedGeos.lampBulb, glowMat);
      bulb.position.set(-side * 0.4, 4.0, 0);
      lamp.add(bulb);
      chunk.add(lamp);
      chunk.userData.props.push(lamp);

      // Végétation volumétrique riche
      if (idx % 2 === 1) {
        if (isRiviera || isMed) {
          const palm = new THREE.Group();
          palm.position.set(xSidewalk, 0, z + 5);
          palm.userData = { type: 'tree', isHit: false };

          const trunk = new THREE.Mesh(this.sharedGeos.palmTrunk, woodMat);
          trunk.position.y = 2.0;
          palm.add(trunk);

          for (let l = 0; l < 6; l++) {
            const leaf = new THREE.Mesh(this.sharedGeos.palmLeaf, foliageMat1);
            leaf.position.set(0, 4.0, 0);
            leaf.rotation.y = (l * Math.PI) / 3;
            leaf.rotation.z = 0.55;
            palm.add(leaf);
          }
          chunk.add(palm);
          chunk.userData.props.push(palm);
        } else {
          // Arbre étagé touffu cartoon (multi-sphères volumétriques)
          const tree = new THREE.Group();
          tree.position.set(xSidewalk, 0, z + 5);
          tree.userData = { type: 'tree', isHit: false };

          const trunk = new THREE.Mesh(this.sharedGeos.treeTrunk, woodMat);
          trunk.position.y = 0.9;
          tree.add(trunk);

          const fol1 = new THREE.Mesh(this.sharedGeos.treeFoliage, foliageMat1);
          fol1.position.set(0, 2.3, 0);
          const fol2 = new THREE.Mesh(this.sharedGeos.treeFoliage, foliageMat2);
          fol2.scale.set(0.85, 0.85, 0.85);
          fol2.position.set(0.3, 2.8, -0.2);
          tree.add(fol1, fol2);

          chunk.add(tree);
          chunk.userData.props.push(tree);
        }
      }

      // Spécificités par Pays / Région au trottoir
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
          // Terrasse de bistrot / tapas bar
          const terrace = new THREE.Group();
          terrace.position.set(xSidewalk + side * 0.4, 0, z + 2);
          terrace.userData = { type: 'terrace', isHit: false };

          const tableLeg = new THREE.Mesh(this.sharedGeos.tableLeg, lampMat);
          tableLeg.position.y = 0.35;
          terrace.add(tableLeg);

          const tableTop = new THREE.Mesh(this.sharedGeos.table, woodMat);
          tableTop.position.y = 0.7;
          terrace.add(tableTop);

          const parasolPole = new THREE.Mesh(this.sharedGeos.parasolPole, lampMat);
          parasolPole.position.set(0.3, 1.0, 0);
          terrace.add(parasolPole);

          const parasolColor = isIberia ? (side > 0 ? 0xf1c40f : 0xe74c3c) : 0xe74c3c;
          const parasol = new THREE.Mesh(this.sharedGeos.parasol, new THREE.MeshToonMaterial({ color: parasolColor }));
          parasol.position.set(0.3, 2.1, 0);
          terrace.add(parasol);
          chunk.add(terrace);
          chunk.userData.props.push(terrace);
        }
      }

      // Colonne Morris ou boîte aux lettres
      if (idx === 2) {
        // Colonne Morris parisienne
        const morris = new THREE.Group();
        morris.position.set(side * 4.9, 0, z - 3);
        const colBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.4, 12), lampMat);
        colBase.position.y = 0.2;
        const colBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.0, 12), new THREE.MeshBasicMaterial({ color: 0x006266 }));
        colBody.position.y = 1.4;
        const colRoof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.6, 12), lampMat);
        colRoof.position.y = 2.7;
        morris.add(colBase, colBody, colRoof);
        chunk.add(morris);
      }
    });
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

        // Réinitialiser les accessoires urbains (feux tricolores, lampadaires, arbres)
        // afin d'éliminer définitivement les feux rouges inclinés ou couchés après recyclage !
        if (chunk.userData && chunk.userData.props) {
          chunk.userData.props.forEach(prop => {
            prop.userData.isHit = false;
            prop.rotation.set(0, 0, 0);
          });
        }
      }
    });

    if (this.landmark) {
      this.landmark.position.z = playerZ + 180;
    }
  }
}

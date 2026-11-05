/**
 * Motormageddon - Générateur d'Environnements Urbains 3D Français
 * Génération de rues courbées (virages gauche/droite), carrefours, mobilier urbain,
 * et Arche spectaculaire de Ligne d'Arrivée avec effets de victoire.
 */

import * as THREE from 'three';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.cityTheme = null;
    this.chunks = [];
    this.chunkLength = 60; // 60 mètres par tronçon
    this.totalChunks = 6;
    this.landmark = null;
    this.finishArch = null;
    this.finishDistance = 1000; // Arrivée à 1000 mètres
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
      mailbox: new THREE.BoxGeometry(0.4, 0.7, 0.35)
    };
  }

  setCity(cityDef, finishDistance = 1000) {
    this.cityTheme = cityDef;
    this.finishDistance = finishDistance;
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

    if (cityId === 'paris') {
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
    const curveX = this.getRoadCenterX(zPos);
    const curveAngle = this.getRoadAngle(zPos);

    chunk.position.set(curveX, 0, zPos);
    chunk.rotation.y = curveAngle;

    const roadMat = new THREE.MeshToonMaterial({ color: this.cityTheme.roadColor });
    const sidewalkMat = new THREE.MeshToonMaterial({ color: 0xd8d4cb });
    const curbMat = new THREE.MeshToonMaterial({ color: 0x9e9e9e });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });

    // Chaussée
    const road = new THREE.Mesh(this.sharedGeos.road, roadMat);
    road.rotation.x = -Math.PI / 2;
    chunk.add(road);

    // Bandes blanches centrales
    const numStripes = Math.floor(this.chunkLength / 7);
    for (let i = 0; i < numStripes; i++) {
      const stripe = new THREE.Mesh(this.sharedGeos.stripe, stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.01, -this.chunkLength / 2 + i * 7 + 3.5);
      chunk.add(stripe);
    }

    // Passage piéton tous les 2 tronçons
    if (Math.abs(zPos) % (this.chunkLength * 2) === 0) {
      for (let s = -3.2; s <= 3.2; s += 0.9) {
        const cw = new THREE.Mesh(this.sharedGeos.crosswalkStripe, stripeMat);
        cw.rotation.x = -Math.PI / 2;
        cw.position.set(s, 0.015, 0);
        chunk.add(cw);
      }
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

      // Fenêtres vivantes (alternance jour/nuit avec lumières d'intérieur) et balcons en fer forgé
      const floors = Math.floor(bHeight / 3.2);
      for (let f = 1; f < floors; f++) {
        const winY = f * 3.2;
        const hasBalcony = (f === 2 || f === 4); // Étage noble haussmannien

        for (let w = -bWidth / 2 + 1.8; w < bWidth / 2 - 1.0; w += 2.6) {
          const isLit = Math.random() < 0.45;
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.45, 1.05), isLit ? litWinMat : darkWinMat);
          win.position.set(xBase - side * 0.06, winY, currentZ + bWidth / 2 + w);
          chunk.add(win);

          // Garde-corps de balcon stylisé
          if (hasBalcony) {
            const balc = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 1.25), balconyMat);
            balc.position.set(xBase - side * 0.18, winY - 0.5, currentZ + bWidth / 2 + w);
            chunk.add(balc);
          }
        }
      }

      // Store banne de bistrot ou boutique
      if (Math.random() < 0.7) {
        const awningMat = awningMats[Math.floor(Math.random() * awningMats.length)];
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
    const foliageMat1 = new THREE.MeshToonMaterial({ color: isRiviera ? 0x27ae60 : 0x2ecc71 });
    const foliageMat2 = new THREE.MeshToonMaterial({ color: isRiviera ? 0x1e8449 : 0x27ae60 });
    const woodMat = new THREE.MeshToonMaterial({ color: 0x5d4037 });
    const lampMat = new THREE.MeshToonMaterial({ color: 0x263238 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
    const yellowMat = new THREE.MeshToonMaterial({ color: 0xf1c40f });

    const propPositionsZ = [-22, -11, 4, 18];

    propPositionsZ.forEach((z, idx) => {
      const side = (idx % 2 === 0 ? 1 : -1);
      const xSidewalk = side * 5.2;

      // Réverbère parisien avec lanterne brillante
      const lamp = new THREE.Group();
      lamp.position.set(side * 4.6, 0, z);

      const pole = new THREE.Mesh(this.sharedGeos.lampPost, lampMat);
      pole.position.y = 2.1;
      lamp.add(pole);

      const bulb = new THREE.Mesh(this.sharedGeos.lampBulb, glowMat);
      bulb.position.set(-side * 0.4, 4.0, 0);
      lamp.add(bulb);
      chunk.add(lamp);

      // Végétation volumétrique riche
      if (idx % 2 === 1) {
        if (isRiviera) {
          const palm = new THREE.Group();
          palm.position.set(xSidewalk, 0, z + 5);

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
        } else {
          // Arbre étagé touffu cartoon (multi-sphères volumétriques)
          const tree = new THREE.Group();
          tree.position.set(xSidewalk, 0, z + 5);

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
        }
      }

      // Terrasse de bistrot
      if (idx === 0) {
        const terrace = new THREE.Group();
        terrace.position.set(xSidewalk + side * 0.4, 0, z + 2);

        const tableLeg = new THREE.Mesh(this.sharedGeos.tableLeg, lampMat);
        tableLeg.position.y = 0.35;
        terrace.add(tableLeg);

        const tableTop = new THREE.Mesh(this.sharedGeos.table, woodMat);
        tableTop.position.y = 0.7;
        terrace.add(tableTop);

        const parasolPole = new THREE.Mesh(this.sharedGeos.parasolPole, lampMat);
        parasolPole.position.set(0.3, 1.0, 0);
        terrace.add(parasolPole);

        const parasol = new THREE.Mesh(this.sharedGeos.parasol, new THREE.MeshToonMaterial({ color: 0xe74c3c }));
        parasol.position.set(0.3, 2.1, 0);
        terrace.add(parasol);
        chunk.add(terrace);
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
      }
    });

    if (this.landmark) {
      this.landmark.position.z = playerZ + 180;
    }
  }
}

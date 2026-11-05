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

    if (cityDef.id === 'paris') {
      const eiffelMat = new THREE.MeshToonMaterial({ color: 0x5a4d41 });
      const base = new THREE.Mesh(new THREE.ConeGeometry(18, 50, 4), eiffelMat);
      base.position.set(28, 25, 260);
      const top = new THREE.Mesh(new THREE.ConeGeometry(6, 60, 4), eiffelMat);
      top.position.set(28, 70, 260);
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.5, 20, 6), eiffelMat);
      spire.position.set(28, 110, 260);
      lmGroup.add(base);
      lmGroup.add(top);
      lmGroup.add(spire);
    } else if (cityDef.id === 'marseille' || cityDef.id === 'nice') {
      const seaMat = new THREE.MeshBasicMaterial({ color: 0x0077be });
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 300), seaMat);
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(-100, -0.5, 180);
      lmGroup.add(sea);

      const sail = new THREE.Mesh(new THREE.ConeGeometry(4, 12, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      sail.position.set(-50, 6, 200);
      lmGroup.add(sail);
    } else {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(10, 75, 6), new THREE.MeshToonMaterial({ color: 0x616161 }));
      spire.position.set(30, 37.5, 240);
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
      new THREE.MeshToonMaterial({ color: c })
    );
    const roofMat = new THREE.MeshToonMaterial({ color: this.cityTheme.roofColor });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x22313f });
    const awningMats = [
      new THREE.MeshToonMaterial({ color: 0xc0392b }),
      new THREE.MeshToonMaterial({ color: 0x27ae60 }),
      new THREE.MeshToonMaterial({ color: 0x2980b9 })
    ];

    while (currentZ < this.chunkLength / 2) {
      const bWidth = 8.0 + Math.random() * 5.0;
      const bHeight = 12.0 + Math.random() * 14.0;
      const bDepth = 10.0;

      const randomMat = buildingMatPalette[Math.floor(Math.random() * buildingMatPalette.length)];
      const bGeo = new THREE.BoxGeometry(bDepth, bHeight, bWidth);
      const bMesh = new THREE.Mesh(bGeo, randomMat);
      bMesh.position.set(xBase + side * (bDepth / 2), bHeight / 2, currentZ + bWidth / 2);
      bMesh.castShadow = true;
      chunk.add(bMesh);

      if (this.cityTheme.id === 'paris') {
        const roofGeo = new THREE.BoxGeometry(bDepth * 0.9, 2.5, bWidth);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(xBase + side * (bDepth / 2), bHeight + 1.25, currentZ + bWidth / 2);
        chunk.add(roof);
      } else {
        const roofGeo = new THREE.BoxGeometry(bDepth + 0.4, 0.6, bWidth + 0.4);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(xBase + side * (bDepth / 2), bHeight + 0.3, currentZ + bWidth / 2);
        chunk.add(roof);
      }

      // Fenêtres
      const floors = Math.floor(bHeight / 3.2);
      for (let f = 1; f < floors; f++) {
        const winY = f * 3.2;
        for (let w = -bWidth / 2 + 1.8; w < bWidth / 2 - 1.0; w += 2.6) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 1.0), windowMat);
          win.position.set(xBase - side * 0.05, winY, currentZ + bWidth / 2 + w);
          chunk.add(win);
        }
      }

      // Store banne
      if (Math.random() < 0.65) {
        const awningMat = awningMats[Math.floor(Math.random() * awningMats.length)];
        const awningGeo = new THREE.BoxGeometry(1.6, 0.3, bWidth * 0.7);
        const awning = new THREE.Mesh(awningGeo, awningMat);
        awning.rotation.z = side * 0.35;
        awning.position.set(xBase - side * 0.6, 3.2, currentZ + bWidth / 2);
        chunk.add(awning);
      }

      currentZ += bWidth;
    }
  }

  populateStreetProps(chunk) {
    const isRiviera = (this.cityTheme.id === 'nice' || this.cityTheme.id === 'marseille');
    const foliageMat = new THREE.MeshToonMaterial({ color: isRiviera ? 0x2e7d32 : 0x388e3c });
    const woodMat = new THREE.MeshToonMaterial({ color: 0x5d4037 });
    const lampMat = new THREE.MeshToonMaterial({ color: 0x263238 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
    const yellowMat = new THREE.MeshToonMaterial({ color: 0xf1c40f });

    const propPositionsZ = [-22, -11, 4, 18];

    propPositionsZ.forEach((z, idx) => {
      const side = (idx % 2 === 0 ? 1 : -1);
      const xSidewalk = side * 5.2;

      // Réverbère
      const lamp = new THREE.Group();
      lamp.position.set(side * 4.6, 0, z);

      const pole = new THREE.Mesh(this.sharedGeos.lampPost, lampMat);
      pole.position.y = 2.1;
      lamp.add(pole);

      const bulb = new THREE.Mesh(this.sharedGeos.lampBulb, glowMat);
      bulb.position.set(-side * 0.4, 4.0, 0);
      lamp.add(bulb);
      chunk.add(lamp);

      // Végétation
      if (idx % 2 === 1) {
        if (isRiviera) {
          const palm = new THREE.Group();
          palm.position.set(xSidewalk, 0, z + 5);

          const trunk = new THREE.Mesh(this.sharedGeos.palmTrunk, woodMat);
          trunk.position.y = 2.0;
          palm.add(trunk);

          for (let l = 0; l < 6; l++) {
            const leaf = new THREE.Mesh(this.sharedGeos.palmLeaf, foliageMat);
            leaf.position.set(0, 4.0, 0);
            leaf.rotation.y = (l * Math.PI) / 3;
            leaf.rotation.z = 0.55;
            palm.add(leaf);
          }
          chunk.add(palm);
        } else {
          const tree = new THREE.Group();
          tree.position.set(xSidewalk, 0, z + 5);

          const trunk = new THREE.Mesh(this.sharedGeos.treeTrunk, woodMat);
          trunk.position.y = 0.9;
          tree.add(trunk);

          const foliage = new THREE.Mesh(this.sharedGeos.treeFoliage, foliageMat);
          foliage.position.y = 2.4;
          tree.add(foliage);
          chunk.add(tree);
        }
      }

      // Terrasse
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

      // Boîte aux lettres
      if (idx === 2) {
        const mb = new THREE.Mesh(this.sharedGeos.mailbox, yellowMat);
        mb.position.set(side * 4.9, 0.45, z - 3);
        chunk.add(mb);
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

/**
 * Motormageddon - Générateur d'Environnements Urbains 3D Français
 * Génération infinie et modulaire des villes avec architecture typique, commerces, terrasses et mobilier urbain.
 */

import * as THREE from 'three';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.cityTheme = null;
    this.chunks = [];
    this.chunkLength = 60; // Longueur d'un tronçon de rue
    this.totalChunks = 5;  // 300 mètres de rue toujours visible
    this.landmark = null;

    this.container = new THREE.Group();
    this.scene.add(this.container);

    // Cache géométries et matériaux réutilisables pour 60 FPS constants
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

  setCity(cityDef) {
    this.cityTheme = cityDef;

    // Nettoyer l'ancien décor
    while (this.container.children.length > 0) {
      const child = this.container.children[0];
      this.container.remove(child);
    }
    this.chunks = [];

    // Créer le monument lointain selon la ville
    this.createCityLandmark(cityDef);

    // Initialiser les tronçons de rue
    for (let i = 0; i < this.totalChunks; i++) {
      const zOffset = i * this.chunkLength;
      const chunk = this.createStreetChunk(zOffset);
      this.chunks.push(chunk);
      this.container.add(chunk);
    }
  }

  createCityLandmark(cityDef) {
    if (this.landmark) {
      this.scene.remove(this.landmark);
      this.landmark = null;
    }

    const lmGroup = new THREE.Group();

    if (cityDef.id === 'paris') {
      // Silhouette de la Tour Eiffel majestueuse sur l'horizon
      const eiffelMat = new THREE.MeshToonMaterial({ color: 0x5a4d41 });
      const baseGeo = new THREE.ConeGeometry(18, 50, 4);
      const base = new THREE.Mesh(baseGeo, eiffelMat);
      base.position.set(28, 25, 260);

      const topGeo = new THREE.ConeGeometry(6, 60, 4);
      const top = new THREE.Mesh(topGeo, eiffelMat);
      top.position.set(28, 70, 260);

      const spireGeo = new THREE.CylinderGeometry(0.5, 1.5, 20, 6);
      const spire = new THREE.Mesh(spireGeo, eiffelMat);
      spire.position.set(28, 110, 260);

      lmGroup.add(base);
      lmGroup.add(top);
      lmGroup.add(spire);
    } else if (cityDef.id === 'marseille' || cityDef.id === 'nice') {
      // Silhouette maritime & collines de la côte méditerranéenne
      const seaMat = new THREE.MeshBasicMaterial({ color: 0x0077be });
      const seaGeo = new THREE.PlaneGeometry(400, 300);
      const sea = new THREE.Mesh(seaGeo, seaMat);
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(-100, -0.5, 180);
      lmGroup.add(sea);

      // Voilier blanc sur la mer
      const boatMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const sailGeo = new THREE.ConeGeometry(4, 12, 3);
      const sail = new THREE.Mesh(sailGeo, boatMat);
      sail.position.set(-50, 6, 200);
      lmGroup.add(sail);
    } else {
      // Cathédrale ou beffroi stylisé
      const monuMat = new THREE.MeshToonMaterial({ color: 0x616161 });
      const spire = new THREE.Mesh(new THREE.ConeGeometry(10, 75, 6), monuMat);
      spire.position.set(30, 37.5, 240);
      lmGroup.add(spire);
    }

    this.landmark = lmGroup;
    this.scene.add(lmGroup);
  }

  createStreetChunk(zPos) {
    const chunk = new THREE.Group();
    chunk.position.z = zPos;

    const roadMat = new THREE.MeshToonMaterial({ color: this.cityTheme.roadColor });
    const sidewalkMat = new THREE.MeshToonMaterial({ color: 0xd8d4cb });
    const curbMat = new THREE.MeshToonMaterial({ color: 0x9e9e9e });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });

    // Chaussée
    const road = new THREE.Mesh(this.sharedGeos.road, roadMat);
    road.rotation.x = -Math.PI / 2;
    chunk.add(road);

    // Bandes blanches discontinues au centre
    const numStripes = Math.floor(this.chunkLength / 7);
    for (let i = 0; i < numStripes; i++) {
      const stripe = new THREE.Mesh(this.sharedGeos.stripe, stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.01, -this.chunkLength / 2 + i * 7 + 3.5);
      chunk.add(stripe);
    }

    // Passage piéton tous les 2 chunks
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

    // Bâtiments et commerces typiques de chaque côté
    this.populateBuildings(chunk, -1); // Côté gauche
    this.populateBuildings(chunk, 1);  // Côté droit

    // Décorations urbaines (terrasses, arbres, réverbères, boîtes postales)
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
      new THREE.MeshToonMaterial({ color: 0xc0392b }), // Rouge bistrot
      new THREE.MeshToonMaterial({ color: 0x27ae60 }), // Vert brasserie
      new THREE.MeshToonMaterial({ color: 0x2980b9 })  // Bleu café
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

      // Toiture typique
      if (this.cityTheme.id === 'paris') {
        // Mansarde parisienne ardoise
        const roofGeo = new THREE.BoxGeometry(bDepth * 0.9, 2.5, bWidth);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(xBase + side * (bDepth / 2), bHeight + 1.25, currentZ + bWidth / 2);
        chunk.add(roof);
      } else {
        // Toit en tuiles génoise du sud
        const roofGeo = new THREE.BoxGeometry(bDepth + 0.4, 0.6, bWidth + 0.4);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(xBase + side * (bDepth / 2), bHeight + 0.3, currentZ + bWidth / 2);
        chunk.add(roof);
      }

      // Fenêtres alignées
      const floors = Math.floor(bHeight / 3.2);
      for (let f = 1; f < floors; f++) {
        const winY = f * 3.2;
        for (let w = -bWidth / 2 + 1.8; w < bWidth / 2 - 1.0; w += 2.6) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 1.0), windowMat);
          win.position.set(xBase - side * 0.05, winY, currentZ + bWidth / 2 + w);
          chunk.add(win);
        }
      }

      // Store banne de café / boulangerie au rez-de-chaussée
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
    const yellowMat = new THREE.MeshToonMaterial({ color: 0xf1c40f }); // Jaune La Poste

    // Disposer des accessoires le long du tronçon
    const propPositionsZ = [-22, -11, 4, 18];

    propPositionsZ.forEach((z, idx) => {
      const side = (idx % 2 === 0 ? 1 : -1);
      const xSidewalk = side * 5.2;

      // Réverbère parisien ou lampadaire
      const lamp = new THREE.Group();
      lamp.position.set(side * 4.6, 0, z);

      const pole = new THREE.Mesh(this.sharedGeos.lampPost, lampMat);
      pole.position.y = 2.1;
      lamp.add(pole);

      const bulb = new THREE.Mesh(this.sharedGeos.lampBulb, glowMat);
      bulb.position.set(-side * 0.4, 4.0, 0);
      lamp.add(bulb);

      chunk.add(lamp);

      // Végétation : Palmier pour Nice/Marseille ou Arbre urbain taillé pour Paris/Lyon/Bordeaux
      if (idx % 2 === 1) {
        if (isRiviera) {
          // Palmier de la Côte d'Azur
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
          // Arbre de boulevard haussmannien
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

      // Terrasse de bistrot français (petite table ronde + parasol)
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

        const parasolMat = new THREE.MeshToonMaterial({ color: 0xe74c3c });
        const parasol = new THREE.Mesh(this.sharedGeos.parasol, parasolMat);
        parasol.position.set(0.3, 2.1, 0);
        terrace.add(parasol);

        chunk.add(terrace);
      }

      // Boîte aux lettres jaune La Poste
      if (idx === 2) {
        const mb = new THREE.Mesh(this.sharedGeos.mailbox, yellowMat);
        mb.position.set(side * 4.9, 0.45, z - 3);
        chunk.add(mb);
      }
    });
  }

  update(playerZ) {
    // Recycler les chunks derrière le joueur pour avancer infiniment
    const threshold = playerZ - this.chunkLength;

    this.chunks.forEach(chunk => {
      if (chunk.position.z + this.chunkLength < threshold) {
        // Déplacer ce chunk tout au bout
        const furthestZ = Math.max(...this.chunks.map(c => c.position.z));
        chunk.position.z = furthestZ + this.chunkLength;
      }
    });

    // Avancer le monument de fond pour créer un effet de parallaxe grandiose
    if (this.landmark) {
      this.landmark.position.z = playerZ + 180;
    }
  }
}

/**
 * Motormageddon - Système de Carrefours & Vrais Ronds-Points Français Haute Fidélité
 * Ronds-points authentiques avec anneaux giratoires, îlots monumentaux, signalisation et véhicules en rotation.
 * Carrefours avec feux tricolores intelligents, trafic transversal et simulation d'accident comique.
 */

import * as THREE from 'three';

export class IntersectionManager {
  constructor(scene) {
    this.scene = scene;
    this.container = new THREE.Group();
    this.scene.add(this.container);

    this.intersections = [];
    this.crossingCars = [];
    this.roundaboutCars = [];
    this.nextSpawnZ = 90; // Premier carrefour à 90m
    this.spawnInterval = 145; // Intervalle équilibré
  }

  createTrafficLightMesh() {
    const group = new THREE.Group();

    // Poteau métallique gris anthracite
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 4.6, 8);
    const poleMat = new THREE.MeshToonMaterial({ color: 0x2d3436 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.3;
    group.add(pole);

    // Boîtier des feux avec visières pare-soleil
    const boxGeo = new THREE.BoxGeometry(0.42, 1.35, 0.42);
    const boxMat = new THREE.MeshToonMaterial({ color: 0x1e272e });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, 3.85, 0);
    group.add(box);

    // 3 Optiques : Rouge, Orange, Vert
    const lampGeo = new THREE.SphereGeometry(0.12, 10, 8);

    const redMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });
    const orangeMat = new THREE.MeshBasicMaterial({ color: 0x442200 });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x004400 });

    const lampRed = new THREE.Mesh(lampGeo, redMat);
    lampRed.position.set(0, 4.3, 0.2);
    group.add(lampRed);

    const lampOrange = new THREE.Mesh(lampGeo, orangeMat);
    lampOrange.position.set(0, 3.85, 0.2);
    group.add(lampOrange);

    const lampGreen = new THREE.Mesh(lampGeo, greenMat);
    lampGreen.position.set(0, 3.4, 0.2);
    group.add(lampGreen);

    // Panneau de signalisation fixé au poteau
    const signGeo = new THREE.PlaneGeometry(0.5, 0.5);
    const signMat = new THREE.MeshBasicMaterial({ color: 0xf5f6fa });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 2.3, 0.12);
    group.add(sign);

    return {
      group,
      lampRed,
      lampOrange,
      lampGreen,
      redMat,
      orangeMat,
      greenMat,
      state: 'RED'
    };
  }

  createGiratoireSignMesh() {
    const signGroup = new THREE.Group();

    // Poteau blanc
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8);
    const poleMat = new THREE.MeshToonMaterial({ color: 0xdcdde1 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.25;
    signGroup.add(pole);

    // Panneau rond bleu officiel "Sens giratoire obligatoire" (B21f)
    const discGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 16);
    const discMat = new THREE.MeshToonMaterial({ color: 0x0984e3 });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = Math.PI / 2;
    disc.position.y = 2.2;
    signGroup.add(disc);

    // Flèches blanches en boucle
    const arrowGeo = new THREE.RingGeometry(0.18, 0.28, 16);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.set(0, 2.2, 0.03);
    signGroup.add(arrow);

    return signGroup;
  }

  createCrossingCarMesh(type = 'taxi') {
    const carGroup = new THREE.Group();

    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.8, roughness: 0.2 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x1e272e });
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    let bodyColor = 0x0984e3; // Bleu taxi parisien
    if (type === 'van') bodyColor = 0xf5f6fa; // Blanc livraison
    if (type === 'compact') bodyColor = 0xe74c3c; // Rouge vif sport
    if (type === 'deudeuche') bodyColor = 0x6ab04c; // Vert rétro 2CV

    const bodyMat = new THREE.MeshToonMaterial({ color: bodyColor, roughness: 0.3 });

    // Châssis principal
    const chassisGeo = new THREE.BoxGeometry(4.2, 0.85, 1.95);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.65;
    chassis.castShadow = true;
    carGroup.add(chassis);

    // Habitacle profilé
    const cabinGeo = new THREE.BoxGeometry(2.3, 0.85, 1.75);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(-0.2, 1.45, 0);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Vitrage teinté
    const winGeo = new THREE.BoxGeometry(2.35, 0.72, 1.8);
    const win = new THREE.Mesh(winGeo, glassMat);
    win.position.set(-0.2, 1.45, 0);
    carGroup.add(win);

    // Enseigne lumineuse "TAXI" sur le toit si c'est un taxi
    if (type === 'taxi') {
      const taxiSignGeo = new THREE.BoxGeometry(0.7, 0.22, 0.35);
      const taxiSignMat = new THREE.MeshBasicMaterial({ color: 0xffd32a });
      const taxiSign = new THREE.Mesh(taxiSignGeo, taxiSignMat);
      taxiSign.position.set(-0.2, 2.0, 0);
      carGroup.add(taxiSign);
    }

    // 4 Roues avec jantes
    const wheels = [];
    const wheelPositions = [
      [-1.3, 0.35, 0.95],
      [1.3, 0.35, 0.95],
      [-1.3, 0.35, -0.95],
      [1.3, 0.35, -0.95]
    ];

    wheelPositions.forEach(pos => {
      const wGroup = new THREE.Group();
      wGroup.position.set(pos[0], pos[1], pos[2]);

      const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
      const tire = new THREE.Mesh(tireGeo, wheelMat);
      tire.rotation.x = Math.PI / 2;
      wGroup.add(tire);

      const capGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.26, 8);
      const cap = new THREE.Mesh(capGeo, chromeMat);
      cap.rotation.x = Math.PI / 2;
      wGroup.add(cap);

      carGroup.add(wGroup);
      wheels.push(wGroup);
    });

    // Phares avant jaunes vintage & feux arrière rouges
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });

    const lightGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const lightL = new THREE.Mesh(lightGeo, headMat);
    lightL.position.set(2.1, 0.7, 0.65);
    const lightR = new THREE.Mesh(lightGeo, headMat);
    lightR.position.set(2.1, 0.7, -0.65);
    carGroup.add(lightL);
    carGroup.add(lightR);

    const tailL = new THREE.Mesh(lightGeo, tailMat);
    tailL.position.set(-2.1, 0.7, 0.65);
    const tailR = new THREE.Mesh(lightGeo, tailMat);
    tailR.position.set(-2.1, 0.7, -0.65);
    carGroup.add(tailL);
    carGroup.add(tailR);

    carGroup.userData = { wheels, type };
    return carGroup;
  }

  // --- CRÉATION D'UN VRAI ROND-POINT MONUMENTAL FRANÇAIS ---
  createRealRoundaboutMesh() {
    const rbGroup = new THREE.Group();

    // 1. Anneau giratoire en asphalte large (diamètre ~24 mètres)
    const ringGeo = new THREE.RingGeometry(4.8, 12.0, 36);
    const ringMat = new THREE.MeshToonMaterial({ color: 0x222f3e });
    const ringRoad = new THREE.Mesh(ringGeo, ringMat);
    ringRoad.rotation.x = -Math.PI / 2;
    ringRoad.position.y = 0.02;
    ringRoad.receiveShadow = true;
    rbGroup.add(ringRoad);

    // 2. Ligne circulaire pointillée au milieu de l'anneau giratoire
    const dashRingGeo = new THREE.RingGeometry(8.2, 8.45, 36);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    const dashRing = new THREE.Mesh(dashRingGeo, dashMat);
    dashRing.rotation.x = -Math.PI / 2;
    dashRing.position.y = 0.025;
    rbGroup.add(dashRing);

    // 3. Bordure biseautée bicolore rouge et blanche tout autour de l'îlot central
    const curbOuterGeo = new THREE.CylinderGeometry(4.85, 5.0, 0.28, 36);
    const curbOuterMat = new THREE.MeshToonMaterial({ color: 0xdcdde1 });
    const curbOuter = new THREE.Mesh(curbOuterGeo, curbOuterMat);
    curbOuter.position.y = 0.14;
    rbGroup.add(curbOuter);

    // 4. Îlot central surélevé avec pelouse soignée
    const islandGeo = new THREE.CylinderGeometry(4.75, 4.75, 0.35, 32);
    const islandMat = new THREE.MeshToonMaterial({ color: 0x2ed573 });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = 0.22;
    rbGroup.add(island);

    // 5. Massif floral coloré (fleurs tricolores françaises rouge, blanc, bleu)
    const flowerColors = [0x0984e3, 0xffffff, 0xff4757, 0xf1c40f];
    for (let f = 0; f < 16; f++) {
      const angle = (f / 16) * Math.PI * 2;
      const fRadius = 3.6 + (f % 2) * 0.4;
      const flowerGeo = new THREE.SphereGeometry(0.22, 6, 6);
      const flowerMat = new THREE.MeshToonMaterial({ color: flowerColors[f % flowerColors.length] });
      const flower = new THREE.Mesh(flowerGeo, flowerMat);
      flower.position.set(Math.cos(angle) * fRadius, 0.42, Math.sin(angle) * fRadius);
      rbGroup.add(flower);
    }

    // 6. Monument central monumental : Fontaine classique à colonnade ou obélisque
    const monumentBaseGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.8, 16);
    const stoneMat = new THREE.MeshToonMaterial({ color: 0xa4b0be });
    const monumentBase = new THREE.Mesh(monumentBaseGeo, stoneMat);
    monumentBase.position.y = 0.65;
    rbGroup.add(monumentBase);

    // Vasque de la fontaine
    const basinGeo = new THREE.CylinderGeometry(1.8, 1.4, 0.4, 16);
    const basin = new THREE.Mesh(basinGeo, stoneMat);
    basin.position.y = 1.25;
    rbGroup.add(basin);

    // Eau turquoise de la fontaine
    const waterGeo = new THREE.CylinderGeometry(1.65, 1.65, 0.05, 16);
    const waterMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3, transparent: true, opacity: 0.85 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 1.46;
    rbGroup.add(water);

    // Colonne & Statue / Jet d'eau central
    const obeliskGeo = new THREE.ConeGeometry(0.45, 3.8, 4);
    const obeliskMat = new THREE.MeshToonMaterial({ color: 0x747d8c });
    const obelisk = new THREE.Mesh(obeliskGeo, obeliskMat);
    obelisk.position.y = 3.4;
    rbGroup.add(obelisk);

    // 7. Panneaux de signalisation officiels à l'entrée et aux abords
    const signEntry = this.createGiratoireSignMesh();
    signEntry.position.set(-5.6, 0, -12.5);
    rbGroup.add(signEntry);

    const signExit = this.createGiratoireSignMesh();
    signExit.position.set(5.6, 0, 12.5);
    signExit.rotation.y = Math.PI;
    rbGroup.add(signExit);

    return rbGroup;
  }

  spawnIntersection(zPos, isRoundabout = false, roadCurveFunc = null, roadAngleFunc = null) {
    const nodeGroup = new THREE.Group();
    const curveX = roadCurveFunc ? roadCurveFunc(zPos) : 0;
    const curveAngle = roadAngleFunc ? roadAngleFunc(zPos) : 0;

    nodeGroup.position.set(curveX, 0, zPos);
    nodeGroup.rotation.y = curveAngle;

    if (isRoundabout) {
      // 1. CRÉATION DU VRAI ROND-POINT
      const rbMesh = this.createRealRoundaboutMesh();
      nodeGroup.add(rbMesh);

      // Générer 2 véhicules circulant en continu dans le rond-point
      const car1 = this.createCrossingCarMesh('deudeuche');
      const car2 = this.createCrossingCarMesh('compact');

      nodeGroup.add(car1);
      nodeGroup.add(car2);

      const rotatingCars = [
        {
          mesh: car1,
          angle: 0.8,
          radius: 8.2,
          speed: 1.15 // Vitesse angulaire (rad/s)
        },
        {
          mesh: car2,
          angle: 3.9,
          radius: 8.2,
          speed: 1.25
        }
      ];

      this.intersections.push({
        group: nodeGroup,
        z: zPos,
        curveX,
        isRoundabout: true,
        rotatingCars,
        passed: false
      });
    } else {
      // 2. CARREFOUR AVEC FEUX TRICOLORES & AVENUE TRANSVERSALE
      // Chaussée transversale large (croisement est-ouest d'une grande avenue)
      const crossRoadGeo = new THREE.PlaneGeometry(42, 14);
      const crossRoadMat = new THREE.MeshToonMaterial({ color: 0x2f3640 });
      const crossRoad = new THREE.Mesh(crossRoadGeo, crossRoadMat);
      crossRoad.rotation.x = -Math.PI / 2;
      crossRoad.position.y = 0.02;
      nodeGroup.add(crossRoad);

      // Ligne d'arrêt blanche continue
      const stopLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const stopLine = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 0.5), stopLineMat);
      stopLine.rotation.x = -Math.PI / 2;
      stopLine.position.set(0, 0.03, -7.2);
      nodeGroup.add(stopLine);

      // Passages piétons zébrés des 2 côtés du carrefour
      const stripeGeo = new THREE.PlaneGeometry(0.5, 3.2);
      for (let s = -3.6; s <= 3.6; s += 0.9) {
        const zebra1 = new THREE.Mesh(stripeGeo, stopLineMat);
        zebra1.rotation.x = -Math.PI / 2;
        zebra1.position.set(s, 0.025, -8.2);
        nodeGroup.add(zebra1);

        const zebra2 = new THREE.Mesh(stripeGeo, stopLineMat);
        zebra2.rotation.x = -Math.PI / 2;
        zebra2.position.set(s, 0.025, 8.2);
        nodeGroup.add(zebra2);
      }

      // Feux tricolores (gauche et droite)
      const tlLeft = this.createTrafficLightMesh();
      tlLeft.group.position.set(-4.9, 0, -7.2);
      tlLeft.group.rotation.y = 0;
      nodeGroup.add(tlLeft.group);

      const tlRight = this.createTrafficLightMesh();
      tlRight.group.position.set(4.9, 0, -7.2);
      tlRight.group.rotation.y = Math.PI;
      nodeGroup.add(tlRight.group);

      this.intersections.push({
        group: nodeGroup,
        z: zPos,
        curveX,
        isRoundabout: false,
        trafficLight: tlLeft,
        trafficLightR: tlRight,
        state: 'RED',
        triggeredCar: false,
        passed: false
      });
    }

    this.container.add(nodeGroup);
  }

  update(delta, playerZ, bikeX, bikeSpeed, onCollisionWithCar, roadCurveFunc = null, roadAngleFunc = null) {
    // Génération continue des carrefours et vrais ronds-points
    if (this.nextSpawnZ < playerZ + 250) {
      const isRoundabout = Math.random() < 0.4; // 40% de ronds-points spectaculaires
      this.spawnIntersection(this.nextSpawnZ, isRoundabout, roadCurveFunc, roadAngleFunc);
      this.nextSpawnZ += this.spawnInterval;
    }

    // Gestion de chaque intersection
    this.intersections.forEach(inter => {
      const distToPlayer = inter.z - playerZ;

      // 1. Mise à jour des voitures en rotation continue dans le vrai rond-point
      if (inter.isRoundabout && inter.rotatingCars) {
        inter.rotatingCars.forEach(car => {
          car.angle += car.speed * delta;
          const localX = Math.cos(car.angle) * car.radius;
          const localZ = Math.sin(car.angle) * car.radius;

          car.mesh.position.set(localX, 0, localZ);
          // Orientation tangentielle le long du cercle (sens giratoire)
          car.mesh.rotation.y = -car.angle + Math.PI / 2;

          // Faire tourner les roues
          if (car.mesh.userData && car.mesh.userData.wheels) {
            car.mesh.userData.wheels.forEach(w => {
              w.children[0].rotation.y += delta * 15;
            });
          }

          // Détecter collision si le joueur tente de couper le rond-point
          const worldCarX = inter.group.position.x + localX;
          const worldCarZ = inter.z + localZ;
          const distX = Math.abs(worldCarX - bikeX);
          const distZ = Math.abs(worldCarZ - playerZ);

          if (distZ < 2.2 && distX < 2.0) {
            if (onCollisionWithCar) {
              onCollisionWithCar(car.mesh);
            }
          }
        });

        // Détection de collision avec l'îlot central si le joueur fonce tout droit sans contourner
        const distToIsland = Math.hypot(bikeX - inter.group.position.x, playerZ - inter.z);
        if (distToIsland < 4.8) {
          if (onCollisionWithCar) {
            onCollisionWithCar(inter.group);
          }
        }
      }

      // 2. Gestion du feu tricolore au carrefour
      if (!inter.isRoundabout && inter.trafficLight) {
        if (distToPlayer > 0 && distToPlayer < 50) {
          inter.state = 'RED';
          inter.trafficLight.lampRed.material.color.setHex(0xff0000);
          inter.trafficLight.lampOrange.material.color.setHex(0x331100);
          inter.trafficLight.lampGreen.material.color.setHex(0x003300);
        }

        // Si le joueur franchit la ligne d'arrêt alors que le feu est ROUGE ("Grille le feu")
        if (!inter.triggeredCar && distToPlayer < 2.0 && distToPlayer > -16.0 && inter.state === 'RED') {
          inter.triggeredCar = true;

          // Déclencher un véhicule transversal aléatoire
          const carTypes = ['taxi', 'van', 'compact'];
          const type = carTypes[Math.floor(Math.random() * carTypes.length)];
          const carMesh = this.createCrossingCarMesh(type);

          const fromLeft = Math.random() < 0.5;
          const startOffset = fromLeft ? -24 : 24;
          const speedX = fromLeft ? (24.0 + Math.random() * 8.0) : -(24.0 + Math.random() * 8.0);
          const curveX = roadCurveFunc ? roadCurveFunc(inter.z) : 0;

          carMesh.position.set(curveX + startOffset, 0, inter.z);
          carMesh.rotation.y = fromLeft ? 0 : Math.PI;
          this.container.add(carMesh);

          this.crossingCars.push({
            mesh: carMesh,
            velX: speedX,
            z: inter.z,
            active: true
          });
        }
      }

      // Nettoyage si trop loin derrière
      if (inter.z < playerZ - 90) {
        this.container.remove(inter.group);
      }
    });

    // Mettre à jour les voitures transversales et détecter collision avec la moto
    const BIKE_CAR_RADIUS_Z = 2.4;
    const BIKE_CAR_RADIUS_X = 2.2;

    for (let i = this.crossingCars.length - 1; i >= 0; i--) {
      const car = this.crossingCars[i];
      if (!car.active) continue;

      car.mesh.position.x += car.velX * delta;

      // Faire tourner les roues des voitures transversales
      if (car.mesh.userData && car.mesh.userData.wheels) {
        car.mesh.userData.wheels.forEach(w => {
          w.children[0].rotation.y += delta * 18;
        });
      }

      const distX = Math.abs(car.mesh.position.x - bikeX);
      const distZ = Math.abs(car.z - playerZ);

      // Collision burlesque percutante !
      if (distZ < BIKE_CAR_RADIUS_Z && distX < BIKE_CAR_RADIUS_X) {
        car.active = false;
        if (onCollisionWithCar) {
          onCollisionWithCar(car);
        }
      }

      // Supprimer si sortie de champ
      if (Math.abs(car.mesh.position.x) > 35) {
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
    this.roundaboutCars = [];
    this.nextSpawnZ = 90;
  }
}

/**
 * Motormageddon - Système de Carrefours, Ronds-points, Feux Tricolores et Trafic Transversal
 * Détecte les feux grillés, génère des véhicules aléatoires en croisement et gère les collisions.
 */

import * as THREE from 'three';

export class IntersectionManager {
  constructor(scene) {
    this.scene = scene;
    this.container = new THREE.Group();
    this.scene.add(this.container);

    this.intersections = [];
    this.crossingCars = [];
    this.nextSpawnZ = 90; // Premier carrefour à 90m
    this.spawnInterval = 140; // Tous les 140m
  }

  createTrafficLightMesh() {
    const group = new THREE.Group();

    // Poteau métallique
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 4.5, 8);
    const poleMat = new THREE.MeshToonMaterial({ color: 0x2d3436 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.25;
    group.add(pole);

    // Boîtier des feux
    const boxGeo = new THREE.BoxGeometry(0.4, 1.2, 0.4);
    const boxMat = new THREE.MeshToonMaterial({ color: 0x1e272e });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, 3.8, 0);
    group.add(box);

    // 3 Optiques : Rouge, Orange, Vert
    const lampGeo = new THREE.SphereGeometry(0.12, 10, 8);

    const redMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });
    const orangeMat = new THREE.MeshBasicMaterial({ color: 0x442200 }); // Éteint au départ
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x004400 });

    const lampRed = new THREE.Mesh(lampGeo, redMat);
    lampRed.position.set(0, 4.2, 0.18);
    group.add(lampRed);

    const lampOrange = new THREE.Mesh(lampGeo, orangeMat);
    lampOrange.position.set(0, 3.8, 0.18);
    group.add(lampOrange);

    const lampGreen = new THREE.Mesh(lampGeo, greenMat);
    lampGreen.position.set(0, 3.4, 0.18);
    group.add(lampGreen);

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

  createCrossingCarMesh(type = 'taxi') {
    const carGroup = new THREE.Group();

    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.2 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x1e272e });
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    let bodyColor = 0x0984e3; // Bleu taxi
    if (type === 'van') bodyColor = 0xf5f6fa; // Blanc livraison
    if (type === 'compact') bodyColor = 0xe74c3c; // Rouge vif

    const bodyMat = new THREE.MeshToonMaterial({ color: bodyColor, roughness: 0.3 });

    // Châssis principal
    const chassisGeo = new THREE.BoxGeometry(4.2, 0.9, 1.9);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.65;
    chassis.castShadow = true;
    carGroup.add(chassis);

    // Habitacle
    const cabinGeo = new THREE.BoxGeometry(2.2, 0.85, 1.7);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(-0.2, 1.45, 0);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Pare-brise et vitres
    const winGeo = new THREE.BoxGeometry(2.25, 0.7, 1.75);
    const win = new THREE.Mesh(winGeo, glassMat);
    win.position.set(-0.2, 1.45, 0);
    carGroup.add(win);

    // Enseigne TAXI lumineuse si taxi
    if (type === 'taxi') {
      const taxiSignMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.3), taxiSignMat);
      sign.position.set(-0.2, 1.98, 0);
      carGroup.add(sign);
    }

    // 4 Roues
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 12);
    const wheelPositions = [
      [-1.3, 0.36, -0.95],
      [1.3, 0.36, -0.95],
      [-1.3, 0.36, 0.95],
      [1.3, 0.36, 0.95]
    ];
    wheelPositions.forEach(pos => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(pos[0], pos[1], pos[2]);
      carGroup.add(w);
    });

    // Phares avant
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4 });
    const lightL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.3), lightMat);
    lightL.position.set(2.1, 0.75, -0.6);
    const lightR = lightL.clone();
    lightR.position.set(2.1, 0.75, 0.6);
    carGroup.add(lightL);
    carGroup.add(lightR);

    return carGroup;
  }

  spawnIntersection(zPos, isRoundabout = false, roadCurveFunc = null, roadAngleFunc = null) {
    const nodeGroup = new THREE.Group();
    const curveX = roadCurveFunc ? roadCurveFunc(zPos) : 0;
    const curveAngle = roadAngleFunc ? roadAngleFunc(zPos) : 0;

    nodeGroup.position.set(curveX, 0, zPos);
    nodeGroup.rotation.y = curveAngle;

    if (isRoundabout) {
      // 1. ROND-POINT
      // Chaussée élargie pour le rond-point
      const roadGeo = new THREE.RingGeometry(3.5, 9.0, 24);
      const roadMat = new THREE.MeshToonMaterial({ color: 0x2d3436 });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.y = 0.02;
      nodeGroup.add(road);

      // Îlot central surélevé avec pelouse verte
      const islandGeo = new THREE.CylinderGeometry(3.2, 3.4, 0.4, 20);
      const islandMat = new THREE.MeshToonMaterial({ color: 0x27ae60 });
      const island = new THREE.Mesh(islandGeo, islandMat);
      island.position.y = 0.2;
      nodeGroup.add(island);

      // Fontaine ou palmier au centre du rond-point
      const palmTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.35, 5.0, 6),
        new THREE.MeshToonMaterial({ color: 0x5d4037 })
      );
      palmTrunk.position.y = 2.5;
      island.add(palmTrunk);

      const leafMat = new THREE.MeshToonMaterial({ color: 0x2ecc71 });
      for (let l = 0; l < 8; l++) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 3.0), leafMat);
        leaf.position.y = 5.0;
        leaf.rotation.y = (l * Math.PI) / 4;
        leaf.rotation.z = 0.55;
        island.add(leaf);
      }

      this.intersections.push({
        group: nodeGroup,
        z: zPos,
        isRoundabout: true,
        passed: false
      });
    } else {
      // 2. CARREFOUR AVEC FEUX TRICOLORES
      // Route transversale (croisement est-ouest)
      const crossRoadGeo = new THREE.PlaneGeometry(36, 12);
      const crossRoadMat = new THREE.MeshToonMaterial({ color: 0x303841 });
      const crossRoad = new THREE.Mesh(crossRoadGeo, crossRoadMat);
      crossRoad.rotation.x = -Math.PI / 2;
      crossRoad.position.y = 0.02;
      nodeGroup.add(crossRoad);

      // Ligne d'arrêt blanche
      const stopLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const stopLine = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 0.5), stopLineMat);
      stopLine.rotation.x = -Math.PI / 2;
      stopLine.position.set(0, 0.03, -6.5);
      nodeGroup.add(stopLine);

      // Feux tricolores (gauche et droite)
      const tlLeft = this.createTrafficLightMesh();
      tlLeft.group.position.set(-4.8, 0, -6.5);
      tlLeft.group.rotation.y = 0;
      nodeGroup.add(tlLeft.group);

      const tlRight = this.createTrafficLightMesh();
      tlRight.group.position.set(4.8, 0, -6.5);
      tlRight.group.rotation.y = Math.PI;
      nodeGroup.add(tlRight.group);

      this.intersections.push({
        group: nodeGroup,
        z: zPos,
        isRoundabout: false,
        trafficLight: tlLeft,
        trafficLightR: tlRight,
        state: 'RED', // Rouge par défaut quand le joueur arrive
        triggeredCar: false,
        passed: false
      });
    }

    this.container.add(nodeGroup);
  }

  update(delta, playerZ, bikeX, bikeSpeed, onCollisionWithCar, roadCurveFunc = null, roadAngleFunc = null) {
    // Génération continue des carrefours et ronds-points
    if (this.nextSpawnZ < playerZ + 250) {
      const isRoundabout = Math.random() < 0.35; // 35% de ronds-points
      this.spawnIntersection(this.nextSpawnZ, isRoundabout, roadCurveFunc, roadAngleFunc);
      this.nextSpawnZ += this.spawnInterval;
    }

    // Gestion des carrefours existants
    this.intersections.forEach(inter => {
      const distToPlayer = inter.z - playerZ;

      // Animation du feu de circulation : passe au rouge quand on approche !
      if (!inter.isRoundabout && inter.trafficLight) {
        if (distToPlayer > 0 && distToPlayer < 45) {
          // Le feu passe au rouge pour tester le joueur !
          inter.state = 'RED';
          inter.trafficLight.lampRed.material.color.setHex(0xff0000);
          inter.trafficLight.lampOrange.material.color.setHex(0x331100);
          inter.trafficLight.lampGreen.material.color.setHex(0x003300);
        }

        // Si le joueur franchit la ligne d'arrêt alors que le feu est ROUGE ("Grille le feu")
        if (!inter.triggeredCar && distToPlayer < 2.0 && distToPlayer > -15.0 && inter.state === 'RED') {
          inter.triggeredCar = true;

          // Déclencher un véhicule transversal aléatoire qui grille la priorité !
          const carTypes = ['taxi', 'van', 'compact'];
          const type = carTypes[Math.floor(Math.random() * carTypes.length)];
          const carMesh = this.createCrossingCarMesh(type);

          // Vient de la gauche (-22m) ou de la droite (+22m)
          const fromLeft = Math.random() < 0.5;
          const startOffset = fromLeft ? -22 : 22;
          const speedX = fromLeft ? (22.0 + Math.random() * 8.0) : -(22.0 + Math.random() * 8.0);
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
      if (inter.z < playerZ - 80) {
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

      const distX = Math.abs(car.mesh.position.x - bikeX);
      const distZ = Math.abs(car.z - playerZ);

      // Collision avec le véhicule en croisement !
      if (distZ < BIKE_CAR_RADIUS_Z && distX < BIKE_CAR_RADIUS_X) {
        car.active = false;
        if (onCollisionWithCar) {
          onCollisionWithCar(car);
        }
      }

      // Supprimer si sortie de champ
      if (Math.abs(car.mesh.position.x) > 30) {
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
    this.nextSpawnZ = 90;
  }
}

/**
 * Motormageddon - Système de Carrefours Urbains Français Haute Fidélité
 * Grands carrefours réalistes avec voies perpendiculaires, trottoirs arrondis en granit,
 * feux tricolores français (mât, visières, répétiteur bas deux-roues), passages piétons zébrés,
 * barrières parisiennes Croix de Saint-André, plaques de rues bleues et trafic transversal dynamique.
 */

import * as THREE from 'three';

const STREET_NAMES = [
  'BD SAINT-GERMAIN',
  'AVENUE DES CHAMPS-ÉLYSÉES',
  'RUE DE RIVOLI',
  'BOULEVARD VOLTAIRE',
  'AVENUE MONTAIGNE',
  'BOULEVARD HAUSSMANN',
  'PLACE DE LA BASTILLE',
  'QUAI DES ORFÈVRES'
];

export class IntersectionManager {
  constructor(scene) {
    this.scene = scene;
    this.container = new THREE.Group();
    this.scene.add(this.container);

    this.intersections = [];
    this.crossingCars = [];
    this.nextSpawnZ = 95; // Premier grand carrefour à 95m
    this.spawnInterval = 160; // Espacement régulier et équilibré
    this.streetNameIndex = 0;
  }

  // --- CRÉATION DU MÂT DE FEUX TRICOLORES FRANÇAIS RÉALISTE ---
  createTrafficLightMesh(isLeft = true) {
    const group = new THREE.Group();

    // 1. Mât principal en acier laqué gris anthracite
    const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 5.2, 10);
    const poleMat = new THREE.MeshToonMaterial({ color: 0x2d3436 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.6;
    group.add(pole);

    // 2. Crosse / potence surplombant la chaussée
    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.rotation.z = isLeft ? -Math.PI / 2.8 : Math.PI / 2.8;
    arm.position.set(isLeft ? 0.9 : -0.9, 4.8, 0);
    group.add(arm);

    // 3. Boîtier principal supérieur (3 feux verticaux)
    const boxGeo = new THREE.BoxGeometry(0.44, 1.45, 0.44);
    const boxMat = new THREE.MeshToonMaterial({ color: 0x1e272e });
    const mainBox = new THREE.Mesh(boxGeo, boxMat);
    mainBox.position.set(isLeft ? 1.7 : -1.7, 4.3, 0);
    group.add(mainBox);

    // Visières pare-soleil incurvées au-dessus de chaque feu
    const visorMat = new THREE.MeshToonMaterial({ color: 0x111111 });
    [-0.45, 0, 0.45].forEach(yOff => {
      const visorGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.16, 8, 1, true, 0, Math.PI);
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.rotation.x = Math.PI / 2;
      visor.position.set(isLeft ? 1.7 : -1.7, 4.3 + yOff + 0.1, 0.22);
      group.add(visor);
    });

    // 4. Optiques principales (Rouge, Orange, Vert)
    const lampGeo = new THREE.SphereGeometry(0.13, 10, 8);
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff2d55 });
    const orangeMat = new THREE.MeshBasicMaterial({ color: 0x442200 });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x004400 });

    const lampRed = new THREE.Mesh(lampGeo, redMat);
    lampRed.position.set(isLeft ? 1.7 : -1.7, 4.75, 0.22);
    group.add(lampRed);

    const lampOrange = new THREE.Mesh(lampGeo, orangeMat);
    lampOrange.position.set(isLeft ? 1.7 : -1.7, 4.3, 0.22);
    group.add(lampOrange);

    const lampGreen = new THREE.Mesh(lampGeo, greenMat);
    lampGreen.position.set(isLeft ? 1.7 : -1.7, 3.85, 0.22);
    group.add(lampGreen);

    // 5. Répétiteur bas pour motos/vélos (caractéristique française)
    const repBoxGeo = new THREE.BoxGeometry(0.24, 0.65, 0.24);
    const repBox = new THREE.Mesh(repBoxGeo, boxMat);
    repBox.position.set(isLeft ? 0.25 : -0.25, 1.6, 0);
    group.add(repBox);

    const repRed = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), redMat);
    repRed.position.set(isLeft ? 0.25 : -0.25, 1.8, 0.13);
    group.add(repRed);

    const repOrange = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), orangeMat);
    repOrange.position.set(isLeft ? 0.25 : -0.25, 1.6, 0.13);
    group.add(repOrange);

    const repGreen = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), greenMat);
    repGreen.position.set(isLeft ? 0.25 : -0.25, 1.4, 0.13);
    group.add(repGreen);

    // 6. Plaque de rue émaillée bleue parisienne avec liseré blanc
    const streetPlateGeo = new THREE.BoxGeometry(1.2, 0.38, 0.05);
    const plateMat = new THREE.MeshToonMaterial({ color: 0x0c2461 });
    const streetPlate = new THREE.Mesh(streetPlateGeo, plateMat);
    streetPlate.position.set(isLeft ? 0.4 : -0.4, 2.7, 0.1);
    group.add(streetPlate);

    // Bordure blanche de la plaque
    const plateBorderGeo = new THREE.BoxGeometry(1.26, 0.44, 0.03);
    const plateBorderMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const plateBorder = new THREE.Mesh(plateBorderGeo, plateBorderMat);
    plateBorder.position.set(isLeft ? 0.4 : -0.4, 2.7, 0.08);
    group.add(plateBorder);

    return {
      group,
      lampRed,
      lampOrange,
      lampGreen,
      repRed,
      repOrange,
      repGreen,
      state: 'GREEN'
    };
  }

  // --- CRÉATION DE BARRIÈRE PIÉTONNE PARISIENNE TYPE CROIX DE SAINT-ANDRÉ ---
  createSaintAndreBarrierMesh() {
    const bGroup = new THREE.Group();
    const barMat = new THREE.MeshToonMaterial({ color: 0x1e372f }); // Vert impérial parisien

    // Deux poteaux verticaux
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), barMat);
    p1.position.set(-0.8, 0.55, 0);
    bGroup.add(p1);

    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), barMat);
    p2.position.set(0.8, 0.55, 0);
    bGroup.add(p2);

    // Main courante supérieure
    const railTop = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 8), barMat);
    railTop.rotation.z = Math.PI / 2;
    railTop.position.set(0, 1.05, 0);
    bGroup.add(railTop);

    // Croix en X
    const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.2, 0.03), barMat);
    cross1.rotation.z = Math.PI / 3.8;
    cross1.position.set(0, 0.55, 0);
    bGroup.add(cross1);

    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.2, 0.03), barMat);
    cross2.rotation.z = -Math.PI / 3.8;
    cross2.position.set(0, 0.55, 0);
    bGroup.add(cross2);

    return bGroup;
  }

  // --- CRÉATION DE CANDÉLABRE URBAIN RÉALISTE ---
  createStreetLampMesh() {
    const lampGroup = new THREE.Group();
    const ironMat = new THREE.MeshToonMaterial({ color: 0x2f3542 });

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 5.8, 8), ironMat);
    post.position.y = 2.9;
    lampGroup.add(post);

    const globeGeo = new THREE.SphereGeometry(0.25, 10, 8);
    const globeMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    globe.position.set(0, 5.7, 0);
    lampGroup.add(globe);

    return lampGroup;
  }

  // --- MODÈLES DE VÉHICULES TRANSVERSAUX FRANÇAIS ---
  createCrossingCarMesh(type = 'taxi') {
    const carGroup = new THREE.Group();

    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.85, roughness: 0.15 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x1e272e });
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    let bodyColor = 0x0984e3; // Bleu taxi parisien
    if (type === 'van') bodyColor = 0xf5f6fa; // Blanc utilitaire livraison
    if (type === 'compact') bodyColor = 0xe74c3c; // Rouge sport compact
    if (type === 'berline') bodyColor = 0x2c3e50; // Berline classe

    const bodyMat = new THREE.MeshToonMaterial({ color: bodyColor, roughness: 0.35 });

    // Châssis profilé
    const chassisGeo = new THREE.BoxGeometry(4.3, 0.88, 1.95);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.68;
    chassis.castShadow = true;
    carGroup.add(chassis);

    // Habitacle
    const cabinGeo = new THREE.BoxGeometry(2.4, 0.88, 1.75);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(-0.2, 1.48, 0);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Vitrage teinté
    const winGeo = new THREE.BoxGeometry(2.45, 0.74, 1.8);
    const win = new THREE.Mesh(winGeo, glassMat);
    win.position.set(-0.2, 1.48, 0);
    carGroup.add(win);

    // Si Taxi : enseigne de toit lumineuse bicolore "TAXI"
    if (type === 'taxi') {
      const taxiSignGeo = new THREE.BoxGeometry(0.85, 0.26, 0.35);
      const taxiSignMat = new THREE.MeshBasicMaterial({ color: 0xffd32a });
      const taxiSign = new THREE.Mesh(taxiSignGeo, taxiSignMat);
      taxiSign.position.set(-0.2, 2.05, 0);
      carGroup.add(taxiSign);

      const lightR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: 0x00d2d3 }));
      lightR.position.set(-0.2, 2.22, 0);
      carGroup.add(lightR);
    }

    // Si Camionnette : grand caisson arrière de livraison
    if (type === 'van') {
      const vanBoxGeo = new THREE.BoxGeometry(2.2, 1.3, 1.92);
      const vanBox = new THREE.Mesh(vanBoxGeo, bodyMat);
      vanBox.position.set(-1.0, 1.35, 0);
      carGroup.add(vanBox);
    }

    // 4 Roues tournantes
    const wheels = [];
    const wheelPositions = [
      [-1.35, 0.38, 0.96],
      [1.35, 0.38, 0.96],
      [-1.35, 0.38, -0.96],
      [1.35, 0.38, -0.96]
    ];

    wheelPositions.forEach(pos => {
      const wGroup = new THREE.Group();
      wGroup.position.set(pos[0], pos[1], pos[2]);

      const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12);
      const tire = new THREE.Mesh(tireGeo, wheelMat);
      tire.rotation.x = Math.PI / 2;
      wGroup.add(tire);

      const capGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.29, 8);
      const cap = new THREE.Mesh(capGeo, chromeMat);
      cap.rotation.x = Math.PI / 2;
      wGroup.add(cap);

      carGroup.add(wGroup);
      wheels.push(wGroup);
    });

    // Phares avant puissants et feux arrière rouges
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });

    const lightGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const lightL = new THREE.Mesh(lightGeo, headMat);
    lightL.position.set(2.15, 0.72, 0.65);
    const lightR = new THREE.Mesh(lightGeo, headMat);
    lightR.position.set(2.15, 0.72, -0.65);
    carGroup.add(lightL);
    carGroup.add(lightR);

    const tailL = new THREE.Mesh(lightGeo, tailMat);
    tailL.position.set(-2.15, 0.72, 0.65);
    const tailR = new THREE.Mesh(lightGeo, tailMat);
    tailR.position.set(-2.15, 0.72, -0.65);
    carGroup.add(tailL);
    carGroup.add(tailR);

    carGroup.userData = { wheels, type };
    return carGroup;
  }

  // --- GÉNÉRATION D'UN GRAND CARREFOUR URBAIN FRANÇAIS RÉALISTE ---
  spawnIntersection(zPos, roadCurveFunc = null, roadAngleFunc = null) {
    const nodeGroup = new THREE.Group();
    const curveX = roadCurveFunc ? roadCurveFunc(zPos) : 0;
    const curveAngle = roadAngleFunc ? roadAngleFunc(zPos) : 0;

    nodeGroup.position.set(curveX, 0, zPos);
    nodeGroup.rotation.y = curveAngle;

    // 1. Chaussée transversale large (Avenue croisée 52m de long x 16m de large)
    const crossRoadGeo = new THREE.PlaneGeometry(54, 16);
    const crossRoadMat = new THREE.MeshToonMaterial({ color: 0x222a35 });
    const crossRoad = new THREE.Mesh(crossRoadGeo, crossRoadMat);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.y = 0.02;
    crossRoad.receiveShadow = true;
    nodeGroup.add(crossRoad);

    // Ligne centrale discontinue jaune/blanche sur l'avenue transversale
    const crossCenterLineMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.85 });
    for (let cX = -24; cX <= 24; cX += 4.5) {
      if (Math.abs(cX) < 6.0) continue; // Laisser le centre du carrefour ouvert
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.3), crossCenterLineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(cX, 0.025, 0);
      nodeGroup.add(dash);
    }

    // 2. 4 Trottoirs d'angles arrondis réalistes en granit gris clair avec chanfrein
    const sidewalkMat = new THREE.MeshToonMaterial({ color: 0x95a5a6 });
    const cornerOffsets = [
      { x: -14.5, z: -14.5, rot: 0 },
      { x: 14.5, z: -14.5, rot: Math.PI / 2 },
      { x: 14.5, z: 14.5, rot: Math.PI },
      { x: -14.5, z: 14.5, rot: -Math.PI / 2 }
    ];

    cornerOffsets.forEach(pos => {
      // Dalle de trottoir d'angle surélevée
      const cornerGeo = new THREE.BoxGeometry(15, 0.32, 13);
      const corner = new THREE.Mesh(cornerGeo, sidewalkMat);
      corner.position.set(pos.x, 0.16, pos.z);
      nodeGroup.add(corner);

      // Bordure biseautée
      const curbGeo = new THREE.BoxGeometry(15.2, 0.36, 0.4);
      const curbMat = new THREE.MeshToonMaterial({ color: 0xdcdde1 });
      const curbZ = new THREE.Mesh(curbGeo, curbMat);
      curbZ.position.set(pos.x, 0.18, pos.z > 0 ? pos.z - 6.5 : pos.z + 6.5);
      nodeGroup.add(curbZ);

      // Barrières Croix de Saint-André sur les angles
      const barrier = this.createSaintAndreBarrierMesh();
      barrier.position.set(pos.x > 0 ? pos.x - 5.5 : pos.x + 5.5, 0.32, pos.z > 0 ? pos.z - 5.5 : pos.z + 5.5);
      nodeGroup.add(barrier);

      // Candélabre d'éclairage urbain
      const lamp = this.createStreetLampMesh();
      lamp.position.set(pos.x > 0 ? pos.x - 3.5 : pos.x + 3.5, 0.32, pos.z > 0 ? pos.z - 4.5 : pos.z + 4.5);
      nodeGroup.add(lamp);
    });

    // 3. Lignes blanches continues d'arrêt (Stop Line) avant chaque passage piéton
    const stopLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stopLineSouth = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 0.55), stopLineMat);
    stopLineSouth.rotation.x = -Math.PI / 2;
    stopLineSouth.position.set(0, 0.03, -8.6);
    nodeGroup.add(stopLineSouth);

    const stopLineNorth = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 0.55), stopLineMat);
    stopLineNorth.rotation.x = -Math.PI / 2;
    stopLineNorth.position.set(0, 0.03, 8.6);
    nodeGroup.add(stopLineNorth);

    // 4. Passages piétons zébrés normalisés sur les 4 branches du carrefour
    const stripeGeo = new THREE.PlaneGeometry(0.55, 3.8);

    // Passages piétons Nord et Sud (traversée de la voie principale)
    for (let s = -4.2; s <= 4.2; s += 0.95) {
      const zSouth = new THREE.Mesh(stripeGeo, stopLineMat);
      zSouth.rotation.x = -Math.PI / 2;
      zSouth.position.set(s, 0.026, -9.8);
      nodeGroup.add(zSouth);

      const zNorth = new THREE.Mesh(stripeGeo, stopLineMat);
      zNorth.rotation.x = -Math.PI / 2;
      zNorth.position.set(s, 0.026, 9.8);
      nodeGroup.add(zNorth);
    }

    // Passages piétons Est et Ouest (traversée de l'avenue perpendiculaire)
    const stripeCrossGeo = new THREE.PlaneGeometry(3.8, 0.55);
    for (let s = -6.5; s <= 6.5; s += 1.1) {
      const zWest = new THREE.Mesh(stripeCrossGeo, stopLineMat);
      zWest.rotation.x = -Math.PI / 2;
      zWest.position.set(-6.8, 0.026, s);
      nodeGroup.add(zWest);

      const zEast = new THREE.Mesh(stripeCrossGeo, stopLineMat);
      zEast.rotation.x = -Math.PI / 2;
      zEast.position.set(6.8, 0.026, s);
      nodeGroup.add(zEast);
    }

    // 5. Mâts de Feux Tricolores réalistes (gauche et droite)
    const tlLeft = this.createTrafficLightMesh(true);
    tlLeft.group.position.set(-5.6, 0, -8.6);
    nodeGroup.add(tlLeft.group);

    const tlRight = this.createTrafficLightMesh(false);
    tlRight.group.position.set(5.6, 0, -8.6);
    nodeGroup.add(tlRight.group);

    const streetName = STREET_NAMES[this.streetNameIndex % STREET_NAMES.length];
    this.streetNameIndex++;

    this.intersections.push({
      group: nodeGroup,
      z: zPos,
      curveX,
      streetName,
      tlLeft,
      tlRight,
      state: 'GREEN', // Démarre au vert, passe à l'orange/rouge à l'approche
      timeInState: 0,
      stoppedProperly: false,
      bonusAwarded: false,
      triggeredCrossingCars: false,
      passed: false
    });

    this.container.add(nodeGroup);
  }

  setLightState(inter, state) {
    inter.state = state;
    const isRed = state === 'RED';
    const isOrange = state === 'ORANGE';
    const isGreen = state === 'GREEN';

    [inter.tlLeft, inter.tlRight].forEach(tl => {
      if (!tl) return;
      tl.lampRed.material.color.setHex(isRed ? 0xff2d55 : 0x441111);
      tl.lampOrange.material.color.setHex(isOrange ? 0xff9f1a : 0x442200);
      tl.lampGreen.material.color.setHex(isGreen ? 0x2ed573 : 0x004400);

      tl.repRed.material.color.setHex(isRed ? 0xff2d55 : 0x441111);
      tl.repOrange.material.color.setHex(isOrange ? 0xff9f1a : 0x442200);
      tl.repGreen.material.color.setHex(isGreen ? 0x2ed573 : 0x004400);
    });
  }

  update(delta, playerZ, bikeX, bikeSpeed, onCollisionWithCar, onStopAtRedLightBonus, roadCurveFunc = null, roadAngleFunc = null) {
    // Génération continue des carrefours réalistes
    if (this.nextSpawnZ < playerZ + 260) {
      this.spawnIntersection(this.nextSpawnZ, roadCurveFunc, roadAngleFunc);
      this.nextSpawnZ += this.spawnInterval;
    }

    // Gestion de chaque carrefour
    this.intersections.forEach(inter => {
      const distToPlayer = inter.z - playerZ;
      inter.timeInState += delta;

      // 1. Cycle des feux tricolores réaliste lors de l'approche du joueur
      if (distToPlayer > 0 && distToPlayer < 75 && distToPlayer > 42 && inter.state === 'GREEN') {
        // Le feu passe à l'ORANGE
        this.setLightState(inter, 'ORANGE');
        inter.timeInState = 0;
      } else if (distToPlayer > 0 && distToPlayer <= 42 && inter.state === 'ORANGE' && inter.timeInState > 0.8) {
        // Le feu passe au ROUGE
        this.setLightState(inter, 'RED');
        inter.timeInState = 0;
      }

      // 2. Déclenchement de la circulation transversale au carrefour
      if (distToPlayer < 35 && distToPlayer > -18 && !inter.triggeredCrossingCars) {
        inter.triggeredCrossingCars = true;

        // Générer 2 à 3 véhicules transversaux en cascade
        const count = 2;
        for (let c = 0; c < count; c++) {
          const carTypes = ['taxi', 'van', 'compact', 'berline'];
          const type = carTypes[(c + Math.floor(Math.random() * carTypes.length)) % carTypes.length];
          const carMesh = this.createCrossingCarMesh(type);

          const fromLeft = c % 2 === 0;
          const startX = fromLeft ? -32 - (c * 14) : 32 + (c * 14);
          const speedX = fromLeft ? (22.0 + Math.random() * 6.0) : -(22.0 + Math.random() * 6.0);
          const zOffset = (c === 0 ? -2.2 : 2.2);

          const curveX = roadCurveFunc ? roadCurveFunc(inter.z) : 0;
          carMesh.position.set(curveX + startX, 0, inter.z + zOffset);
          carMesh.rotation.y = fromLeft ? 0 : Math.PI;

          this.container.add(carMesh);
          this.crossingCars.push({
            mesh: carMesh,
            velX: speedX,
            z: inter.z + zOffset,
            active: true
          });
        }
      }

      // 3. Détection de respect du feu rouge par le joueur (Arrêt propre avant la ligne de stop)
      if (inter.state === 'RED' && distToPlayer > 0 && distToPlayer < 12.0) {
        if (bikeSpeed < 3.0 && !inter.bonusAwarded) {
          inter.stoppedProperly = true;
          inter.bonusAwarded = true;
          if (onStopAtRedLightBonus) {
            onStopAtRedLightBonus(inter.streetName);
          }
        }
      }

      // Si le joueur s'est arrêté proprement et attend, le feu repasse au vert après 2.5s
      if (inter.state === 'RED' && inter.timeInState > 2.8) {
        this.setLightState(inter, 'GREEN');
      }

      // Nettoyage des carrefours dépassés
      if (inter.z < playerZ - 90) {
        this.container.remove(inter.group);
      }
    });

    // 4. Déplacement des véhicules transversaux et détection de collision
    const COLLISION_RADIUS_Z = 2.4;
    const COLLISION_RADIUS_X = 2.3;

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

      // Collision burlesque percutante si le joueur a grillé le feu rouge !
      if (distZ < COLLISION_RADIUS_Z && distX < COLLISION_RADIUS_X) {
        car.active = false;
        if (onCollisionWithCar) {
          onCollisionWithCar(car);
        }
      }

      // Supprimer quand la voiture sort du champ
      if (Math.abs(car.mesh.position.x) > 42) {
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
    this.nextSpawnZ = 95;
    this.streetNameIndex = 0;
  }
}

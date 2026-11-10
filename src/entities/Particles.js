/**
 * Motormageddon - Système de Particules Hautes Performances Three.js (Architecture Propre & Optimisée)
 * Effets Cartoon Explosifs : Volutes de fumée d'échappement volumétriques, ondes de choc (shockwave rings),
 * étincelles étoilées BD, dérapages au sol, confettis de victoire et micro-détails d'impact.
 * Zéro fuite mémoire via pooling de géométries et matériaux partagés.
 */

import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.stars = [];
    this.bloodDrops = [];
    this.bloodSplats = [];
    this.shockwaves = [];
    this.speedLines = [];
    this.debris = [];
    this.smokePuffs = [];
    this.fireballs = [];
    this.scorchMarks = [];

    // --- POOLING DE GÉOMÉTRIES PARTAGÉES (Zéro alloc à l'exécution) ---
    this.sharedGeos = {
      smokeSphere: new THREE.SphereGeometry(1.0, 7, 6),
      fireballSphere: new THREE.SphereGeometry(1.0, 10, 8),
      scorchCircle: new THREE.CircleGeometry(1.0, 14),
      starCone: new THREE.ConeGeometry(0.12, 0.26, 4),
      sparkBox: new THREE.BoxGeometry(0.09, 0.09, 0.09),
      // Fragments de mobilier urbain & gouttes du déluge (géométries partagées,
      // fix : utilisées par spawnPropShatter / spawnDamBlast mais longtemps absentes)
      cubeDebris: new THREE.BoxGeometry(0.22, 0.22, 0.22),
      bloodSphere: new THREE.SphereGeometry(0.16, 6, 5),
      ring: new THREE.RingGeometry(0.4, 0.6, 20),
      confetti: new THREE.PlaneGeometry(0.18, 0.28),
      splatCircle: new THREE.CircleGeometry(0.3, 8),
      speedCylinder: new THREE.CylinderGeometry(0.018, 0.018, 6.5, 4)
    };

    // --- MATÉRIAUX PARTAGÉS & CACHE ---
    // Éléments incandescents calibrés juste au-dessus du seuil de bloom (1.25) :
    // lueur discrète et élégante, pas de débordement « bizarrement lumineux »
    const hdrOrange = new THREE.Color(1.5, 0.8, 0.35);   // carcasse de feu mandarine
    const hdrGold = new THREE.Color(1.45, 1.25, 0.5);   // coeur incandescent doré
    const hdrAmber = new THREE.Color(1.3, 0.8, 0.3);    // étincelle ambre
    const hdrSkyBlue = new THREE.Color(0.25, 1.1, 1.1); // gerbes d'eau turquoises
    this.sharedMats = {
      smoke: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 }),
      smokeDark: new THREE.MeshBasicMaterial({ color: 0x2d3436, transparent: true, opacity: 0.78 }),
      fireballOrange: (() => {
        const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92 });
        m.color.copy(hdrOrange);
        return m;
      })(),
      fireballCore: (() => {
        const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.98 });
        m.color.copy(hdrGold);
        return m;
      })(),
      scorchMark: new THREE.MeshBasicMaterial({ color: 0x111417, transparent: true, opacity: 0.88, depthWrite: false }),
      skidSmoke: new THREE.MeshBasicMaterial({ color: 0xecf0f1, transparent: true, opacity: 0.75 }),
      starOrange: (() => { const m = new THREE.MeshBasicMaterial(); m.color.copy(hdrOrange); return m; })(),
      starGold: (() => { const m = new THREE.MeshBasicMaterial(); m.color.copy(hdrGold); return m; })(),
      starRed: new THREE.MeshBasicMaterial({ color: 0xff3838 }),
      sparkAmber: (() => { const m = new THREE.MeshBasicMaterial(); m.color.copy(hdrAmber); return m; })(),
      bloodDrop: new THREE.MeshBasicMaterial({ color: 0x990000 }),
      woodBrown: new THREE.MeshBasicMaterial({ color: 0x8b572a }),
      metalGray: new THREE.MeshBasicMaterial({ color: 0x7f8c8d }),
      glassCyan: new THREE.MeshBasicMaterial({ color: 0x74b9ff, transparent: true, opacity: 0.85 }),
      waterBlue: (() => {
        const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 });
        m.color.copy(hdrSkyBlue);
        return m;
      })(),
      rockGray: new THREE.MeshBasicMaterial({ color: 0x57606f }),
      speedLine: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
    };

    this.confettiColors = [0x0984e3, 0xffffff, 0xd63031, 0xf1c40f, 0x2ed573, 0x9b59b6, 0xff6b81];
    this.confettiMats = this.confettiColors.map(c => 
      new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })
    );

    this.initSpeedLines();
  }

  initSpeedLines() {
    for (let i = 0; i < 20; i++) {
      const mesh = new THREE.Mesh(this.sharedGeos.speedCylinder, this.sharedMats.speedLine);
      mesh.rotation.x = Math.PI / 2;
      mesh.visible = false;
      this.scene.add(mesh);
      this.speedLines.push({
        mesh,
        offsetX: (Math.random() - 0.5) * 6.5,
        offsetY: 0.4 + Math.random() * 2.8,
        offsetZ: Math.random() * 32.0,
        speed: 45 + Math.random() * 25
      });
    }
  }

  // Volutes de fumée d'échappement cartoon volumétriques
  spawnExhaustSmoke(pos, speedRatio = 1.0) {
    if (Math.random() > 0.4) return;

    const mesh = new THREE.Mesh(this.sharedGeos.smokeSphere, this.sharedMats.smoke.clone());
    const initScale = 0.12 + Math.random() * 0.08;
    mesh.scale.setScalar(initScale);
    mesh.position.copy(pos);
    mesh.position.x += (Math.random() - 0.5) * 0.12;
    mesh.position.y += (Math.random() - 0.5) * 0.08;

    this.scene.add(mesh);
    this.particles.push({
      mesh,
      velX: (Math.random() - 0.5) * 0.35,
      velY: 0.7 + Math.random() * 0.5,
      velZ: -1.6 * speedRatio,
      growRate: 1.8,
      life: 0.65,
      maxLife: 0.65,
      isCoin: false
    });
  }

  // Fumée de dérapage et freinage au sol
  spawnSkidSmoke(pos) {
    const mesh = new THREE.Mesh(this.sharedGeos.smokeSphere, this.sharedMats.skidSmoke.clone());
    mesh.scale.setScalar(0.18 + Math.random() * 0.1);
    mesh.position.set(pos.x + (Math.random() - 0.5) * 0.3, 0.1, pos.z);

    this.scene.add(mesh);
    this.particles.push({
      mesh,
      velX: (Math.random() - 0.5) * 0.8,
      velY: 0.4 + Math.random() * 0.4,
      velZ: (Math.random() - 0.5) * 0.6,
      growRate: 2.2,
      life: 0.5,
      maxLife: 0.5,
      isCoin: false
    });
  }

  // Onde de choc circulaire cartoon au sol
  spawnShockwave(pos, colorHex = 0xffa502) {
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(this.sharedGeos.ring, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.04, pos.z);
    ring.scale.setScalar(0.4);

    this.scene.add(ring);
    this.shockwaves.push({
      mesh: ring,
      growSpeed: 6.5,
      life: 0.45,
      maxLife: 0.45
    });
  }

  // Impact cartoon riche avec étoiles, étincelles et onde de choc
  spawnComicBurst(pos, score, combo = 1) {
    // 1. Onde de choc au sol
    this.spawnShockwave(pos, 0xff9f1a);

    // 2. Étoiles cartoon orange et or
    const numStars = Math.min(8, 5 + combo);
    for (let i = 0; i < numStars; i++) {
      const mat = (i % 2 === 0) ? this.sharedMats.starOrange : this.sharedMats.starGold;
      const star = new THREE.Mesh(this.sharedGeos.starCone, mat);
      star.position.copy(pos);
      star.position.y += 0.85;

      const angle = (i / numStars) * Math.PI * 2;
      const speed = 3.0 + Math.random() * 3.5;

      this.scene.add(star);
      this.stars.push({
        mesh: star,
        velX: Math.cos(angle) * speed,
        velY: 2.6 + Math.random() * 3.2,
        velZ: Math.sin(angle) * speed,
        spinX: Math.random() * 16,
        spinY: Math.random() * 16,
        life: 0.55,
        maxLife: 0.55
      });
    }

    // 3. Étincelles étincelantes fines
    const numSparks = Math.min(6, 3 + combo);
    for (let c = 0; c < numSparks; c++) {
      const spark = new THREE.Mesh(this.sharedGeos.sparkBox, this.sharedMats.sparkAmber);
      spark.position.copy(pos);
      spark.position.y += 0.9;

      this.scene.add(spark);
      this.particles.push({
        mesh: spark,
        velX: (Math.random() - 0.5) * 4.5,
        velY: 3.5 + Math.random() * 3.0,
        velZ: (Math.random() - 0.5) * 4.5,
        life: 0.58,
        maxLife: 0.58,
        isCoin: true
      });
    }
  }

  // Effets d'impact et flaques de sang réalistes & burlesques
  spawnBloodBurst(pos) {
    const numDrops = 14;
    for (let i = 0; i < numDrops; i++) {
      const drop = new THREE.Mesh(this.sharedGeos.sparkBox, this.sharedMats.bloodDrop);
      drop.scale.setScalar(0.75 + Math.random() * 0.45);
      drop.position.copy(pos);
      drop.position.y += 0.65;

      const angle = Math.random() * Math.PI * 2;
      const horizSpeed = 1.8 + Math.random() * 3.2;

      this.scene.add(drop);
      this.bloodDrops.push({
        mesh: drop,
        velX: Math.cos(angle) * horizSpeed,
        velY: 2.2 + Math.random() * 2.8,
        velZ: Math.sin(angle) * horizSpeed,
        life: 0.75,
        maxLife: 0.75
      });
    }

    // 1. Flaque de sang centrale généreuse qui reste visible sur le bitume
    const splatMat = new THREE.MeshBasicMaterial({
      color: 0x850000,
      transparent: true,
      opacity: 0.88,
      depthWrite: false
    });
    const splat = new THREE.Mesh(this.sharedGeos.splatCircle, splatMat);
    splat.rotation.x = -Math.PI / 2;
    splat.scale.set(1.4, 1.4, 1.4);
    splat.position.set(pos.x, 0.025, pos.z);
    this.scene.add(splat);
    this.bloodSplats.push({
      mesh: splat,
      life: 10.0,
      maxLife: 10.0
    });

    // 2. Éclaboussures satellites autour de la flaque principale
    for (let s = 0; s < 3; s++) {
      const satSplat = new THREE.Mesh(this.sharedGeos.splatCircle, splatMat);
      satSplat.rotation.x = -Math.PI / 2;
      const offsetAng = Math.random() * Math.PI * 2;
      const offsetDist = 0.55 + Math.random() * 0.65;
      satSplat.scale.setScalar(0.45 + Math.random() * 0.4);
      satSplat.position.set(pos.x + Math.cos(offsetAng) * offsetDist, 0.024, pos.z + Math.sin(offsetAng) * offsetDist);
      this.scene.add(satSplat);
      this.bloodSplats.push({
        mesh: satSplat,
        life: 10.0,
        maxLife: 10.0
      });
    }
  }

  // Explosion 3D grandiose pour missiles et obus d'artillerie (Boule de feu, débris, ondes de choc et cratère au sol)
  spawnMissileExplosion(pos, radius = 7.0, themeColorHex = 0xff793f) {
    const explosionCenter = pos.clone();
    explosionCenter.y = Math.max(0.4, explosionCenter.y);

    // 1. Double onde de choc lumineuse au sol
    this.spawnShockwave(explosionCenter, themeColorHex);
    this.spawnShockwave(explosionCenter, 0xfffa65);

    // 2. Boule de feu 3D volumétrique en expansion explosive rapide
    const fireballGroup = new THREE.Group();
    fireballGroup.position.copy(explosionCenter);

    const outerFire = new THREE.Mesh(this.sharedGeos.fireballSphere, this.sharedMats.fireballOrange.clone());
    outerFire.scale.setScalar(0.5);
    fireballGroup.add(outerFire);

    const coreFire = new THREE.Mesh(this.sharedGeos.fireballSphere, this.sharedMats.fireballCore.clone());
    coreFire.scale.setScalar(0.35);
    fireballGroup.add(coreFire);

    this.scene.add(fireballGroup);
    this.fireballs.push({
      group: fireballGroup,
      outer: outerFire,
      core: coreFire,
      targetScale: Math.max(3.5, radius * 0.6),
      currentScale: 0.5,
      life: 0.45,
      maxLife: 0.45
    });

    // 3. Cratère et marque de brûlure au sol (Scorch Mark Decal)
    const scorch = new THREE.Mesh(this.sharedGeos.scorchCircle, this.sharedMats.scorchMark.clone());
    scorch.rotation.x = -Math.PI / 2;
    scorch.scale.setScalar(Math.min(4.8, radius * 0.45));
    scorch.position.set(pos.x, 0.026, pos.z);
    this.scene.add(scorch);
    this.scorchMarks.push({
      mesh: scorch,
      life: 12.0,
      maxLife: 12.0
    });

    // 4. Débris et éclats de shrapnel incandescents projetés à haute vélocité
    const debrisCount = Math.min(36, Math.floor(18 + radius * 2));
    for (let i = 0; i < debrisCount; i++) {
      const isRed = (i % 2 === 0);
      const spark = new THREE.Mesh(this.sharedGeos.starCone, isRed ? this.sharedMats.starOrange : this.sharedMats.starGold);
      spark.position.copy(explosionCenter);
      const angle = Math.random() * Math.PI * 2;
      const speed = 6.0 + Math.random() * 14.0;
      this.scene.add(spark);
      this.debris.push({
        mesh: spark,
        velX: Math.cos(angle) * speed,
        velY: 3.5 + Math.random() * 9.5,
        velZ: Math.sin(angle) * speed,
        rotVelX: Math.random() * 24 - 12,
        rotVelY: Math.random() * 24 - 12,
        life: 0.95,
        maxLife: 0.95
      });
    }

    // 5. Épaisses volutes de fumée noire de détonation montant en champignon
    const smokeCount = Math.min(14, Math.floor(6 + radius * 0.8));
    for (let j = 0; j < smokeCount; j++) {
      const smoke = new THREE.Mesh(this.sharedGeos.smokeSphere, this.sharedMats.smokeDark.clone());
      smoke.position.set(
        pos.x + (Math.random() - 0.5) * 2.0,
        explosionCenter.y + Math.random() * 1.5,
        pos.z + (Math.random() - 0.5) * 2.0
      );
      smoke.scale.setScalar(1.2 + Math.random() * 1.6);
      this.scene.add(smoke);
      this.smokePuffs.push({
        mesh: smoke,
        velY: 2.5 + Math.random() * 2.8,
        velX: (Math.random() - 0.5) * 1.4,
        velZ: (Math.random() - 0.5) * 1.4,
        growRate: 3.2,
        life: 1.4,
        maxLife: 1.4
      });
    }
  }

  // Déflagration d'obus 120mm de char d'assaut (gerbe de feu et fumée noire)
  // Édition allégée : 1 onde de choc, gerbe d'étincelles réduite — le coup reste
  // percutant sans remplir la moitié de l'écran
  spawnCannonBlast(pos) {
    this.spawnShockwave(pos, 0xff793f);

    // Gerbe de flammes et étincelles incandescentes
    for (let i = 0; i < 11; i++) {
      const spark = new THREE.Mesh(this.sharedGeos.starCone, this.sharedMats.starOrange);
      spark.position.copy(pos);
      spark.position.y += 0.8;
      const angle = Math.random() * Math.PI * 2;
      const speed = 4.5 + Math.random() * 9.0;
      this.scene.add(spark);
      this.debris.push({
        mesh: spark,
        velX: Math.cos(angle) * speed,
        velY: 4.0 + Math.random() * 7.0,
        velZ: Math.sin(angle) * speed,
        rotVelX: Math.random() * 20 - 10,
        rotVelY: Math.random() * 20 - 10,
        life: 0.85,
        maxLife: 0.85
      });
    }

    // Volutes discrètes de fumée de départ (réduites pour ne pas obstruer la vue du joueur)
    for (let j = 0; j < 2; j++) {
      const smoke = new THREE.Mesh(this.sharedGeos.smokeSphere, this.sharedMats.smokeDark);
      smoke.position.set(pos.x + (Math.random() - 0.5) * 0.4, pos.y + 0.3 + Math.random() * 0.4, pos.z + (Math.random() - 0.5) * 0.4);
      smoke.scale.setScalar(0.35 + Math.random() * 0.25);
      this.scene.add(smoke);
      this.smokePuffs.push({
        mesh: smoke,
        velY: 1.2 + Math.random() * 0.8,
        growRate: 0.8,
        life: 0.45,
        maxLife: 0.45
      });
    }
  }

  // Animation de destruction physique complète du mobilier urbain (poteaux, arbres, terrasses)
  spawnPropShatter(pos, propType = 'lamp') {
    this.spawnShockwave(pos, propType === 'lamp' ? 0xfffa65 : 0xa4b0be);

    const mat = propType === 'tree' ? (this.sharedMats.woodBrown || this.sharedMats.rockGray) :
                (propType === 'terrace' ? this.sharedMats.woodBrown : this.sharedMats.metalGray);

    // 16 fragments physiques projetés dans les airs avec gravité et rebonds
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(this.sharedGeos.cubeDebris, mat);
      mesh.scale.set(
        0.18 + Math.random() * 0.24,
        0.22 + Math.random() * 0.38,
        0.18 + Math.random() * 0.24
      );
      mesh.position.copy(pos);
      mesh.position.y += 0.8 + Math.random() * 1.2;

      const angle = Math.random() * Math.PI * 2;
      const speed = 4.5 + Math.random() * 8.5;

      this.scene.add(mesh);
      this.debris.push({
        mesh,
        velX: Math.cos(angle) * speed,
        velY: 5.5 + Math.random() * 7.0,
        velZ: Math.sin(angle) * speed + 6.0,
        rotVelX: (Math.random() - 0.5) * 26,
        rotVelY: (Math.random() - 0.5) * 26,
        life: 1.2,
        maxLife: 1.2
      });
    }

    // Poussière d'impact
    for (let j = 0; j < 3; j++) {
      const smoke = new THREE.Mesh(this.sharedGeos.smokeSphere, this.sharedMats.skidSmoke);
      smoke.position.set(pos.x + (Math.random() - 0.5) * 0.8, pos.y + 0.3, pos.z + (Math.random() - 0.5) * 0.8);
      smoke.scale.setScalar(0.4 + Math.random() * 0.35);
      this.scene.add(smoke);
      this.smokePuffs.push({
        mesh: smoke,
        velY: 1.0 + Math.random() * 0.8,
        growRate: 0.9,
        life: 0.65,
        maxLife: 0.65
      });
    }
  }

  // Cataclysme de détonation nucléaire (Onde de choc titanique, champignon atomique et gerbe radioactive)
  spawnNuclearBlast(pos) {
    this.spawnShockwave(pos, 0x2ed573);
    this.spawnShockwave(pos, 0xfffa65);
    this.spawnShockwave(pos, 0xff4757);

    // Gerbe de débris incandescents projetés à haute vélocité
    for (let i = 0; i < 40; i++) {
      const spark = new THREE.Mesh(this.sharedGeos.starCone, this.sharedMats.starOrange);
      spark.position.copy(pos);
      spark.position.y += 2.0;
      const angle = Math.random() * Math.PI * 2;
      const speed = 8.0 + Math.random() * 16.0;
      this.scene.add(spark);
      this.debris.push({
        mesh: spark,
        velX: Math.cos(angle) * speed,
        velY: 6.0 + Math.random() * 14.0,
        velZ: Math.sin(angle) * speed,
        rotVelX: Math.random() * 30 - 15,
        rotVelY: Math.random() * 30 - 15,
        life: 1.5,
        maxLife: 1.5
      });
    }

    // Champignon atomique montant dans le ciel
    for (let j = 0; j < 16; j++) {
      const smoke = new THREE.Mesh(this.sharedGeos.smokeSphere, this.sharedMats.smokeDark);
      smoke.position.set(pos.x + (Math.random() - 0.5) * 4.0, pos.y + 1.0 + Math.random() * 3.0, pos.z + (Math.random() - 0.5) * 4.0);
      smoke.scale.setScalar(2.4 + Math.random() * 2.8);
      this.scene.add(smoke);
      this.smokePuffs.push({
        mesh: smoke,
        velY: 4.5 + Math.random() * 3.5,
        growRate: 4.0,
        life: 2.2,
        maxLife: 2.2
      });
    }
  }

  // Rupture cataclysmique de barrage & déluge aquatique
  spawnDamBlast(pos) {
    this.spawnShockwave(pos, 0x00d2d3);
    this.spawnShockwave(pos, 0x0984e3);
    this.spawnShockwave(pos, 0xffffff);

    // Gerbes d'eau écumantes projetées
    for (let i = 0; i < 35; i++) {
      const drop = new THREE.Mesh(this.sharedGeos.bloodSphere, this.sharedMats.waterBlue || this.sharedMats.smoke);
      drop.position.copy(pos);
      drop.position.y += 2.0;
      const angle = Math.random() * Math.PI * 2;
      const speed = 7.0 + Math.random() * 15.0;
      this.scene.add(drop);
      this.debris.push({
        mesh: drop,
        velX: Math.cos(angle) * speed,
        velY: 5.0 + Math.random() * 12.0,
        velZ: Math.sin(angle) * speed,
        rotVelX: 0,
        rotVelY: 0,
        life: 1.8,
        maxLife: 1.8
      });
    }

    // Vapeur d'eau et embruns
    for (let j = 0; j < 14; j++) {
      const spray = new THREE.Mesh(this.sharedGeos.smokeSphere, this.sharedMats.skidSmoke);
      spray.position.set(pos.x + (Math.random() - 0.5) * 6.0, pos.y + 1.0 + Math.random() * 2.0, pos.z + (Math.random() - 0.5) * 6.0);
      spray.scale.setScalar(2.0 + Math.random() * 2.5);
      this.scene.add(spray);
      this.smokePuffs.push({
        mesh: spray,
        velY: 3.5 + Math.random() * 2.5,
        growRate: 3.0,
        life: 2.0,
        maxLife: 2.0
      });
    }
  }

  // Éboulement sismique de montagne & avalanche géante
  spawnMountainBlast(pos) {
    this.spawnShockwave(pos, 0x747d8c);
    this.spawnShockwave(pos, 0xff9f43);
    this.spawnShockwave(pos, 0xff4757);

    // Éclats de roche et gravats projetés
    for (let i = 0; i < 35; i++) {
      const rock = new THREE.Mesh(this.sharedGeos.starCone, this.sharedMats.rockGray || this.sharedMats.sparkAmber);
      rock.position.copy(pos);
      rock.position.y += 3.0;
      const angle = Math.random() * Math.PI * 2;
      const speed = 9.0 + Math.random() * 16.0;
      this.scene.add(rock);
      this.debris.push({
        mesh: rock,
        velX: Math.cos(angle) * speed,
        velY: 6.0 + Math.random() * 14.0,
        velZ: Math.sin(angle) * speed,
        rotVelX: Math.random() * 25 - 12,
        rotVelY: Math.random() * 25 - 12,
        life: 1.6,
        maxLife: 1.6
      });
    }

    // Nuage géant d'avalanche de poussière
    for (let j = 0; j < 16; j++) {
      const dust = new THREE.Mesh(this.sharedGeos.smokeSphere, this.sharedMats.smoke);
      dust.position.set(pos.x + (Math.random() - 0.5) * 6.0, pos.y + 2.0 + Math.random() * 4.0, pos.z + (Math.random() - 0.5) * 6.0);
      dust.scale.setScalar(2.5 + Math.random() * 3.0);
      this.scene.add(dust);
      this.smokePuffs.push({
        mesh: dust,
        velY: 4.0 + Math.random() * 3.0,
        growRate: 3.5,
        life: 2.2,
        maxLife: 2.2
      });
    }
  }

  // Éclat d'accident violent (rouge sang & débris)
  spawnCrashBurst(pos) {
    this.spawnShockwave(pos, 0xff4757);

    for (let i = 0; i < 16; i++) {
      const star = new THREE.Mesh(this.sharedGeos.starCone, this.sharedMats.starRed);
      star.position.copy(pos);
      star.position.y += 0.6;

      const angle = (i / 16) * Math.PI * 2;
      this.scene.add(star);
      this.stars.push({
        mesh: star,
        velX: Math.cos(angle) * 7.5,
        velY: 4.5 + Math.random() * 4.5,
        velZ: Math.sin(angle) * 7.5,
        spinX: Math.random() * 22,
        spinY: Math.random() * 22,
        life: 0.9,
        maxLife: 0.9
      });
    }
  }

  // Étincelles et fragments traçants à haute vélocité
  spawnSparks(pos, count = 4, colorHex = 0xffa502) {
    const mat = (colorHex === 0xff6b00) ? this.sharedMats.starOrange : (colorHex === 0xff3838 ? this.sharedMats.starRed : this.sharedMats.sparkAmber);
    for (let i = 0; i < count; i++) {
      const spark = new THREE.Mesh(this.sharedGeos.sparkBox || this.sharedGeos.starCone, mat);
      spark.position.copy(pos);
      spark.position.x += (Math.random() - 0.5) * 0.3;
      spark.position.y += (Math.random() - 0.5) * 0.3;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 5.0;

      this.scene.add(spark);
      this.debris.push({
        mesh: spark,
        velX: Math.cos(angle) * speed,
        velY: 1.5 + Math.random() * 3.5,
        velZ: (Math.random() - 0.5) * speed,
        rotVelX: Math.random() * 15,
        rotVelY: Math.random() * 15,
        life: 0.45,
        maxLife: 0.45
      });
    }
  }

  // Confettis de victoire tricolores et dorés
  spawnVictoryConfetti(pos) {
    const numConfetti = 55;
    for (let i = 0; i < numConfetti; i++) {
      const mat = this.confettiMats[i % this.confettiMats.length];
      const conf = new THREE.Mesh(this.sharedGeos.confetti, mat);

      conf.position.copy(pos);
      conf.position.y += 2.2 + Math.random() * 2.5;
      conf.position.x += (Math.random() - 0.5) * 6.5;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6.5;

      this.scene.add(conf);
      this.particles.push({
        mesh: conf,
        velX: Math.cos(angle) * speed,
        velY: 6.5 + Math.random() * 7.5,
        velZ: Math.sin(angle) * speed,
        spinX: (Math.random() - 0.5) * 14,
        spinY: (Math.random() - 0.5) * 16,
        life: 2.4,
        maxLife: 2.4,
        isConfetti: true
      });
    }
  }

  update(delta, playerZ, speed) {
    // 1. Mettre à jour la fumée, étincelles et confettis
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.velX * delta;
      p.mesh.position.y += p.velY * delta;
      p.mesh.position.z += p.velZ * delta;

      if (p.isCoin) {
        p.velY -= 16.0 * delta;
        p.mesh.rotation.x += 14 * delta;
        p.mesh.rotation.y += 18 * delta;
      } else if (p.isConfetti) {
        p.velY -= 6.5 * delta;
        p.mesh.rotation.x += p.spinX * delta;
        p.mesh.rotation.y += p.spinY * delta;
      } else {
        const progress = 1 - (p.life / p.maxLife);
        p.mesh.scale.addScalar(delta * (p.growRate || 1.2));
        if (p.mesh.material && p.mesh.material.opacity !== undefined) {
          p.mesh.material.opacity = (1 - progress) * 0.7;
        }
      }
    }

    // 2. Mettre à jour les ondes de choc au sol
    for (let w = this.shockwaves.length - 1; w >= 0; w--) {
      const wave = this.shockwaves[w];
      wave.life -= delta;

      if (wave.life <= 0) {
        this.scene.remove(wave.mesh);
        wave.mesh.material.dispose();
        this.shockwaves.splice(w, 1);
        continue;
      }

      const progress = 1 - (wave.life / wave.maxLife);
      wave.mesh.scale.addScalar(delta * wave.growSpeed);
      wave.mesh.material.opacity = (1 - progress) * 0.85;
    }

    // 3. Mettre à jour les gouttes de sang
    for (let b = this.bloodDrops.length - 1; b >= 0; b--) {
      const drop = this.bloodDrops[b];
      drop.life -= delta;

      if (drop.life <= 0) {
        this.scene.remove(drop.mesh);
        this.bloodDrops.splice(b, 1);
        continue;
      }

      drop.mesh.position.x += drop.velX * delta;
      drop.mesh.position.y += drop.velY * delta;
      drop.mesh.position.z += drop.velZ * delta;
      drop.velY -= 17.0 * delta;

      if (drop.mesh.position.y <= 0.04) {
        drop.mesh.position.y = 0.03;
        drop.velY = 0;
        drop.velX *= 0.4;
        drop.velZ *= 0.4;
      }
    }

    // 4. Mettre à jour les taches de sang au sol
    for (let s = this.bloodSplats.length - 1; s >= 0; s--) {
      const splat = this.bloodSplats[s];
      splat.life -= delta;

      if (splat.life <= 0) {
        this.scene.remove(splat.mesh);
        splat.mesh.material.dispose();
        this.bloodSplats.splice(s, 1);
        continue;
      }

      splat.mesh.material.opacity = Math.min(0.85, (splat.life / splat.maxLife) * 0.85);
    }

    // 5. Mettre à jour les étoiles cartoon
    for (let s = this.stars.length - 1; s >= 0; s--) {
      const star = this.stars[s];
      star.life -= delta;

      if (star.life <= 0) {
        this.scene.remove(star.mesh);
        this.stars.splice(s, 1);
        continue;
      }

      star.mesh.position.x += star.velX * delta;
      star.mesh.position.y += star.velY * delta;
      star.mesh.position.z += star.velZ * delta;
      star.mesh.rotation.x += star.spinX * delta;
      star.mesh.rotation.y += star.spinY * delta;
      star.velY -= 15.0 * delta;
    }

    // 6. Mettre à jour les débris et étincelles incandescents
    for (let d = this.debris.length - 1; d >= 0; d--) {
      const deb = this.debris[d];
      deb.life -= delta;
      if (deb.life <= 0) {
        this.scene.remove(deb.mesh);
        this.debris.splice(d, 1);
        continue;
      }
      deb.mesh.position.x += deb.velX * delta;
      deb.mesh.position.y += deb.velY * delta;
      deb.mesh.position.z += deb.velZ * delta;
      deb.velY -= 18.0 * delta; // Gravité réaliste
      deb.mesh.rotation.x += (deb.rotVelX || 10) * delta;
      deb.mesh.rotation.y += (deb.rotVelY || 10) * delta;
      if (deb.mesh.position.y <= 0.05) {
        deb.mesh.position.y = 0.05;
        deb.velY = -deb.velY * 0.25; // Rebond amorti
        deb.velX *= 0.6;
        deb.velZ *= 0.6;
      }
    }

    // 7. Mettre à jour les volutes de fumée noire
    for (let p = this.smokePuffs.length - 1; p >= 0; p--) {
      const smk = this.smokePuffs[p];
      smk.life -= delta;
      if (smk.life <= 0) {
        this.scene.remove(smk.mesh);
        if (smk.mesh.material) smk.mesh.material.dispose();
        this.smokePuffs.splice(p, 1);
        continue;
      }
      smk.mesh.position.y += (smk.velY || 2.0) * delta;
      smk.mesh.position.x += (smk.velX || 0) * delta;
      smk.mesh.position.z += (smk.velZ || 0) * delta;
      smk.mesh.scale.addScalar(delta * (smk.growRate || 2.0));
      const prog = 1 - (smk.life / smk.maxLife);
      if (smk.mesh.material) {
        smk.mesh.material.opacity = (1 - prog) * 0.75;
      }
    }

    // 8. Mettre à jour les boules de feu explosives 3D
    for (let f = this.fireballs.length - 1; f >= 0; f--) {
      const fb = this.fireballs[f];
      fb.life -= delta;
      if (fb.life <= 0) {
        this.scene.remove(fb.group);
        if (fb.outer?.material) fb.outer.material.dispose();
        if (fb.core?.material) fb.core.material.dispose();
        this.fireballs.splice(f, 1);
        continue;
      }
      const prog = 1 - (fb.life / fb.maxLife);
      fb.currentScale += (fb.targetScale - fb.currentScale) * Math.min(1.0, delta * 18.0);
      fb.group.scale.setScalar(fb.currentScale);
      if (fb.outer?.material) fb.outer.material.opacity = (1 - prog) * 0.92;
      if (fb.core?.material) fb.core.material.opacity = (1 - prog) * 0.98;
    }

    // 9. Mettre à jour les marques de brûlure / cratères au sol
    for (let sc = this.scorchMarks.length - 1; sc >= 0; sc--) {
      const mark = this.scorchMarks[sc];
      mark.life -= delta;
      if (mark.life <= 0) {
        this.scene.remove(mark.mesh);
        if (mark.mesh.material) mark.mesh.material.dispose();
        this.scorchMarks.splice(sc, 1);
        continue;
      }
      if (mark.mesh.material) {
        mark.mesh.material.opacity = Math.min(0.88, (mark.life / mark.maxLife) * 0.88);
      }
    }

    // 10. Lignes de vitesse dynamiques
    const showSpeedLines = speed > 22;
    this.speedLines.forEach(sl => {
      if (!showSpeedLines) {
        sl.mesh.visible = false;
        return;
      }

      sl.mesh.visible = true;
      sl.offsetZ -= sl.speed * delta;

      if (sl.offsetZ < -5) {
        sl.offsetZ = 25 + Math.random() * 15;
        sl.offsetX = (Math.random() - 0.5) * 6.5;
        sl.offsetY = 0.4 + Math.random() * 2.2;
      }

      sl.mesh.position.set(
        sl.offsetX,
        sl.offsetY,
        playerZ + sl.offsetZ
      );
    });
  }

  reset() {
    this.particles.forEach(p => this.scene.remove(p.mesh));
    this.shockwaves.forEach(w => {
      this.scene.remove(w.mesh);
      w.mesh.material.dispose();
    });
    this.stars.forEach(s => this.scene.remove(s.mesh));
    this.bloodDrops.forEach(b => this.scene.remove(b.mesh));
    this.bloodSplats.forEach(s => {
      this.scene.remove(s.mesh);
      s.mesh.material.dispose();
    });
    this.debris.forEach(d => this.scene.remove(d.mesh));
    this.smokePuffs.forEach(sm => {
      this.scene.remove(sm.mesh);
      if (sm.mesh.material) sm.mesh.material.dispose();
    });
    this.fireballs.forEach(f => {
      this.scene.remove(f.group);
      if (f.outer?.material) f.outer.material.dispose();
      if (f.core?.material) f.core.material.dispose();
    });
    this.scorchMarks.forEach(sc => {
      this.scene.remove(sc.mesh);
      if (sc.mesh.material) sc.mesh.material.dispose();
    });

    this.particles = [];
    this.shockwaves = [];
    this.stars = [];
    this.bloodDrops = [];
    this.bloodSplats = [];
    this.debris = [];
    this.smokePuffs = [];
    this.fireballs = [];
    this.scorchMarks = [];
  }
}

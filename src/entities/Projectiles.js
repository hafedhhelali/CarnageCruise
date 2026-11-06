/**
 * Motormageddon - ProjectileManager
 * Gestionnaire physique de projectiles 3D haute performance (60 FPS)
 * Obus d'artillerie 120mm pour char, missiles supersoniques, torpilles vortex,
 * boules de plasma ionique EMP, jets de flammes et cartouches de calibre lourd.
 */

import * as THREE from 'three';

export class ProjectileManager {
  constructor(scene, particles, soundManager, engine) {
    this.scene = scene;
    this.particles = particles;
    this.soundManager = soundManager;
    this.engine = engine;

    this.container = new THREE.Group();
    this.container.name = 'projectile_manager_container';
    this.scene.add(this.container);

    this.projectiles = [];

    // Matériaux partagés réutilisables (zéro GC churn)
    this.sharedMats = {
      brassShell: new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.92,
        roughness: 0.18
      }),
      shellTip: new THREE.MeshStandardMaterial({
        color: 0x2d3436,
        metalness: 0.8,
        roughness: 0.3
      }),
      rocketBody: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.5,
        roughness: 0.25
      }),
      rocketFin: new THREE.MeshStandardMaterial({
        color: 0xe74c3c,
        metalness: 0.4,
        roughness: 0.3
      }),
      plasmaOrb: new THREE.MeshBasicMaterial({
        color: 0x00d2d3,
        transparent: true,
        opacity: 0.85
      }),
      plasmaCore: new THREE.MeshBasicMaterial({
        color: 0xffffff
      }),
      flameJet: new THREE.MeshBasicMaterial({
        color: 0xff793f,
        transparent: true,
        opacity: 0.8
      }),
      tracerMat: new THREE.MeshBasicMaterial({
        color: 0xfffa65
      })
    };

    // Géométries partagées
    this.sharedGeos = {
      shellCylinder: new THREE.CylinderGeometry(0.12, 0.12, 0.75, 10),
      shellCone: new THREE.ConeGeometry(0.12, 0.38, 10),
      rocketCylinder: new THREE.CylinderGeometry(0.09, 0.09, 0.9, 8),
      rocketNose: new THREE.ConeGeometry(0.09, 0.28, 8),
      rocketFin: new THREE.BoxGeometry(0.02, 0.2, 0.2),
      plasmaSphere: new THREE.SphereGeometry(0.38, 10, 8),
      plasmaCoreSphere: new THREE.SphereGeometry(0.2, 8, 8),
      tracerGeo: new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6)
    };
  }

  /**
   * Crée un obus 120mm réaliste pour le Char AMX-Titan
   */
  create120mmShellMesh() {
    const group = new THREE.Group();

    // Corps de l'obus en laiton étincelant
    const body = new THREE.Mesh(this.sharedGeos.shellCylinder, this.sharedMats.brassShell);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // Ogive perforante balistique en acier trempé
    const tip = new THREE.Mesh(this.sharedGeos.shellCone, this.sharedMats.shellTip);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.55;
    group.add(tip);

    // Flamme de culot de propulsion arrière
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff793f, transparent: true, opacity: 0.9 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 6), flameMat);
    flame.rotation.x = -Math.PI / 2;
    flame.position.z = -0.55;
    group.add(flame);

    group.userData.flame = flame;
    return group;
  }

  /**
   * Crée un missile supersonique avec ailerons rouges pour l'Aéro-Jet
   */
  createMissileMesh() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(this.sharedGeos.rocketCylinder, this.sharedMats.rocketBody);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const nose = new THREE.Mesh(this.sharedGeos.rocketNose, this.sharedMats.rocketFin);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.58;
    group.add(nose);

    // 4 ailerons stabilisateurs arrière
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(this.sharedGeos.rocketFin, this.sharedMats.rocketFin);
      fin.position.set(
        Math.cos((i * Math.PI) / 2) * 0.12,
        Math.sin((i * Math.PI) / 2) * 0.12,
        -0.35
      );
      group.add(fin);
    }

    const flameMat = new THREE.MeshBasicMaterial({ color: 0xfffa65, transparent: true, opacity: 0.9 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 6), flameMat);
    flame.rotation.x = -Math.PI / 2;
    flame.position.z = -0.65;
    group.add(flame);

    group.userData.flame = flame;
    return group;
  }

  /**
   * Crée un orbe de plasma ionique EMP pour le Blindé NRBC 8x8
   */
  createPlasmaOrbMesh() {
    const group = new THREE.Group();
    const outer = new THREE.Mesh(this.sharedGeos.plasmaSphere, this.sharedMats.plasmaOrb);
    const core = new THREE.Mesh(this.sharedGeos.plasmaCoreSphere, this.sharedMats.plasmaCore);
    group.add(outer, core);
    return group;
  }

  /**
   * Lance un obus d'artillerie 120mm depuis le canon du char
   */
  spawnTankShell(muzzlePos, direction = 1) {
    const mesh = this.create120mmShellMesh();
    mesh.position.copy(muzzlePos);
    this.container.add(mesh);

    this.projectiles.push({
      type: '120mm_shell',
      mesh,
      speedZ: 130.0, // Vitesse supersonique en avant
      velX: 0,
      startX: muzzlePos.x,
      startZ: muzzlePos.z,
      maxDistance: 95.0,
      damageRadius: 5.5,
      points: 1500,
      trailTimer: 0,
      isExplosive: true
    });

    // Éclair et onde de choc au départ du coup
    this.particles.spawnShockwave(muzzlePos, 0xff793f);
    this.particles.spawnCannonBlast(muzzlePos);
    this.engine.triggerCameraShake(0.65);
    this.soundManager.playTankCannon();
  }

  /**
   * Lance une salve de doubles missiles pour l'Aéro-Jet
   */
  spawnTwinMissiles(posL, posR) {
    [posL, posR].forEach((pos, idx) => {
      const mesh = this.createMissileMesh();
      mesh.position.copy(pos);
      this.container.add(mesh);

      this.projectiles.push({
        type: 'missile',
        mesh,
        speedZ: 140.0,
        velX: (idx === 0 ? -1.2 : 1.2), // Légère divergence balistique
        startX: pos.x,
        startZ: pos.z,
        maxDistance: 110.0,
        damageRadius: 7.0,
        points: 1800,
        trailTimer: 0,
        isExplosive: true
      });
    });

    this.engine.triggerCameraShake(0.5);
    this.soundManager.playRocketMissile();
  }

  /**
   * Lance un orbe EMP ionique pour le Rover NRBC 8x8
   */
  spawnPlasmaOrb(muzzlePos) {
    const mesh = this.createPlasmaOrbMesh();
    mesh.position.copy(muzzlePos);
    this.container.add(mesh);

    this.projectiles.push({
      type: 'plasma_emp',
      mesh,
      speedZ: 105.0,
      velX: 0,
      startX: muzzlePos.x,
      startZ: muzzlePos.z,
      maxDistance: 85.0,
      damageRadius: 6.5,
      points: 1600,
      trailTimer: 0,
      isExplosive: true
    });

    this.particles.spawnShockwave(muzzlePos, 0x00d2d3);
    this.engine.triggerCameraShake(0.4);
    this.soundManager.playGeigerClick();
  }

  /**
   * Met à jour tous les projectiles actifs et résout les impacts
   */
  update(delta, playerZ, traffic, characters, environment, gameState, ui) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // 1. Déplacement physique en avant dans l'espace 3D
      p.mesh.position.z += p.speedZ * delta;
      p.mesh.position.x += p.velX * delta;

      // Animation rotationnelle de l'obus / missile sur son axe
      p.mesh.rotation.z += delta * 15;

      // 2. Particules de traînée de fumée et feu
      p.trailTimer += delta;
      if (p.trailTimer > 0.035) {
        p.trailTimer = 0;
        const trailPos = p.mesh.position.clone();
        trailPos.z -= 0.6;
        if (p.type === '120mm_shell') {
          this.particles.spawnSparks(trailPos, 2, 0xff793f);
        } else if (p.type === 'missile') {
          this.particles.spawnSparks(trailPos, 3, 0xffffff);
        } else if (p.type === 'plasma_emp') {
          this.particles.spawnShockwave(trailPos, 0x00cec9);
        }
      }

      const pPos = p.mesh.position;
      const traveledDist = pPos.z - p.startZ;

      let hitOccurred = false;

      // 3. Test d'impact sur les véhicules de circulation
      if (traffic && traffic.vehicles) {
        for (let v of traffic.vehicles) {
          if (!v.userData.active || v.userData.isCrashed) continue;
          const distZ = Math.abs(v.position.z - pPos.z);
          const distX = Math.abs(v.position.x - pPos.x);

          if (distZ < 3.2 && distX < p.damageRadius) {
            traffic.blowUpVehicle(v, pPos);
            gameState.score += p.points;
            this.particles.spawnComicBurst(v.position, p.points, gameState.combo);
            this.soundManager.playCrash();
            hitOccurred = true;
            break;
          }
        }
      }

      // 4. Test d'impact sur les piétons
      if (!hitOccurred && characters && characters.pedestrians) {
        for (let char of characters.pedestrians) {
          if (!char.group.visible || char.isFlying) continue;
          const distZ = Math.abs(char.group.position.z - pPos.z);
          const distX = Math.abs(char.group.position.x - pPos.x);

          if (distZ < 2.5 && distX < p.damageRadius) {
            characters.triggerSlapstickFlight(char, pPos.x, 52);
            this.particles.spawnBloodBurst(char.group.position);
            ui.triggerPedestrianCarnageFlash();
            gameState.recordKill(850, 'PROJECTILE_' + p.type.toUpperCase(), char.typeDef.category);
            hitOccurred = true;
            break;
          }
        }
      }

      // 5. Explosion à l'impact ou au terme de la portée maximale
      if (hitOccurred || traveledDist >= p.maxDistance) {
        this.particles.spawnCannonBlast(pPos);
        this.particles.spawnShockwave(pPos, 0xff793f);
        this.engine.triggerCameraShake(0.7);
        this.soundManager.playExplosion();

        // Nettoyage de la scène
        this.container.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  reset() {
    while (this.container.children.length > 0) {
      this.container.remove(this.container.children[0]);
    }
    this.projectiles = [];
  }
}

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
    this.engine.triggerDynamicLight(muzzlePos, 0xffa502, 5.5, 0.24);
    this.soundManager.playTankCannon();
  }

  /**
   * Lance une salve de doubles missiles pour l'Aéro-Jet orientés vers le sol
   */
  spawnTwinMissiles(posL, posR) {
    [posL, posR].forEach((pos, idx) => {
      const mesh = this.createMissileMesh();
      mesh.position.copy(pos);
      mesh.rotation.x = 0.28; // Incliné en piqué vers la rue et les passants
      this.container.add(mesh);

      this.projectiles.push({
        type: 'missile',
        mesh,
        speedZ: 130.0,
        velX: (idx === 0 ? -1.0 : 1.0), // Légère divergence balistique
        velY: -5.8, // Trajectoire descendante en piqué vers les passants au sol !
        startX: pos.x,
        startZ: pos.z,
        maxDistance: 120.0,
        damageRadius: 8.5,
        points: 1800,
        trailTimer: 0,
        isExplosive: true
      });
    });

    this.engine.triggerCameraShake(0.5);
    this.engine.triggerDynamicLight(posL, 0xffd32a, 4.2, 0.20);
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
   * Déclenche une détonation explosive de zone (AoE) hyper-spectaculaire
   * avec fauchage physique réel et zéro écran rouge aveuglant
   */
  detonate(p, hitPos, traffic, characters, environment, gameState) {
    const blastRadius = p.damageRadius || 8.5;
    const themeColor = (p.type === 'plasma_emp') ? 0x00cec9 : 0xff793f;

    // 1. Visuel d'explosion 3D grandiose (boule de feu + onde de choc + cratère au sol + débris + fumée)
    if (this.particles?.spawnMissileExplosion) {
      this.particles.spawnMissileExplosion(hitPos, blastRadius, themeColor);
    } else if (this.particles?.spawnCannonBlast) {
      this.particles.spawnCannonBlast(hitPos);
    }

    // 2. Rendu sonore & Secousse de caméra percutante mais propre
    if (this.soundManager?.playExplosion) {
      this.soundManager.playExplosion();
    } else if (this.soundManager?.playCrash) {
      this.soundManager.playCrash();
    }
    if (this.engine?.triggerCameraShake) {
      this.engine.triggerCameraShake(0.68);
    }
    if (this.engine?.triggerDynamicLight) {
      this.engine.triggerDynamicLight(hitPos, themeColor, 6.8, 0.36);
    }

    // 3. Fauchage de zone (AoE) sur TOUS les véhicules de circulation à portée
    if (traffic && traffic.vehicles) {
      traffic.vehicles.forEach(v => {
        if (!v.userData || !v.userData.active || v.userData.isCrashed) return;
        const dist = Math.hypot(v.position.x - hitPos.x, v.position.z - hitPos.z);
        if (dist <= blastRadius) {
          traffic.blowUpVehicle(v, hitPos);
          if (gameState) gameState.score = (gameState.score || 0) + p.points;
          if (this.particles?.spawnComicBurst) {
            this.particles.spawnComicBurst(v.position, p.points, gameState?.combo || 1);
          }
        }
      });
    }

    // 4. Fauchage de zone (AoE) sur TOUS les piétons au sol à portée
    const pedList = characters?.characters || characters?.pedestrians;
    if (pedList && Array.isArray(pedList)) {
      pedList.forEach(char => {
        if (!char.group || !char.group.visible || char.isFlying) return;
        const dist = Math.hypot(char.group.position.x - hitPos.x, char.group.position.z - hitPos.z);
        if (dist <= blastRadius) {
          characters.triggerSlapstickFlight(char, hitPos.x, 56);
          if (this.particles?.spawnBloodBurst) {
            this.particles.spawnBloodBurst(char.group.position);
          }
          if (gameState?.recordKill) {
            gameState.recordKill(850, 'PROJECTILE_' + p.type.toUpperCase(), char.typeDef?.category || 'default');
          }
        }
      });
    }

    // 5. Destruction des objets de décor urbain à portée (lampadaires, arbres, terrasses)
    if (environment?.chunks) {
      environment.chunks.forEach(chunk => {
        if (chunk.userData && chunk.userData.props) {
          chunk.userData.props.forEach(prop => {
            if (prop.userData.isHit) return;
            const worldZ = chunk.position.z + prop.position.z;
            const worldX = chunk.position.x + prop.position.x;
            const dist = Math.hypot(worldX - hitPos.x, worldZ - hitPos.z);
            if (dist <= blastRadius) {
              prop.userData.isHit = true;
              if (prop.userData.type === 'lamp') {
                prop.rotation.z = (prop.position.x > 0 ? 1 : -1) * 0.95;
                if (this.particles?.spawnCrashBurst) this.particles.spawnCrashBurst(new THREE.Vector3(worldX, 2.0, worldZ));
              } else if (prop.userData.type === 'tree') {
                prop.rotation.z = (Math.random() - 0.5) * 0.5;
              } else if (prop.userData.type === 'terrace') {
                prop.position.y += 2.5;
                prop.rotation.x = Math.PI * 0.8;
                if (this.particles?.spawnCrashBurst) this.particles.spawnCrashBurst(new THREE.Vector3(worldX, 1.0, worldZ));
              }
            }
          });
        }
      });
    }
  }

  /**
   * Met à jour tous les projectiles actifs et résout les impacts
   */
  update(delta, playerZ, traffic, characters, environment, gameState, ui) {
    try {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        if (!p || !p.mesh) {
          this.projectiles.splice(i, 1);
          continue;
        }

        // 1. Déplacement physique en avant et plongée vers le sol dans l'espace 3D
        p.mesh.position.z += p.speedZ * delta;
        p.mesh.position.x += (p.velX || 0) * delta;
        if (p.velY) {
          p.mesh.position.y = Math.max(0.2, p.mesh.position.y + p.velY * delta);
          p.mesh.rotation.x = 0.28; // Tête pointée vers le bitume
        }

        // Animation rotationnelle de l'obus / missile sur son axe & pulsation de flamme
        p.mesh.rotation.z += delta * 15;
        if (p.mesh.userData.flame) {
          const flameFlicker = 1.0 + Math.sin(Date.now() * 0.045) * 0.25;
          p.mesh.userData.flame.scale.set(flameFlicker, flameFlicker, flameFlicker);
        }

        // 2. Particules de traînée de fumée et feu
        p.trailTimer = (p.trailTimer || 0) + delta;
        if (p.trailTimer > 0.035) {
          p.trailTimer = 0;
          const trailPos = p.mesh.position.clone();
          trailPos.z -= 0.6;
          if (this.particles) {
            if (p.type === '120mm_shell') {
              if (this.particles.spawnSparks) this.particles.spawnSparks(trailPos, 2, 0xff793f);
              if (this.particles.spawnExhaustSmoke) this.particles.spawnExhaustSmoke(trailPos, 1.0);
            } else if (p.type === 'missile') {
              if (this.particles.spawnExhaustSmoke) this.particles.spawnExhaustSmoke(trailPos, 1.2);
              if (this.particles.spawnSparks) this.particles.spawnSparks(trailPos, 2, 0xffd32a);
            } else if (p.type === 'plasma_emp') {
              if (this.particles.spawnShockwave) this.particles.spawnShockwave(trailPos, 0x00cec9);
            }
          }
        }

        const pPos = p.mesh.position;
        const traveledDist = pPos.z - p.startZ;

        let hitOccurred = false;

        // 2b. Détection d'impact direct sur la chaussée pour les tirs plongeants
        if (p.velY && p.mesh.position.y <= 0.35) {
          hitOccurred = true;
        }

        // 3. Test de collision directe avec un véhicule
        if (!hitOccurred && traffic && traffic.vehicles) {
          for (let v of traffic.vehicles) {
            if (!v.userData || !v.userData.active || v.userData.isCrashed) continue;
            if (Math.abs(v.position.z - pPos.z) < 2.8 && Math.abs(v.position.x - pPos.x) < 2.2) {
              hitOccurred = true;
              break;
            }
          }
        }

        // 4. Test de collision directe avec un piéton
        if (!hitOccurred) {
          const pedList = characters?.characters || characters?.pedestrians;
          if (pedList && Array.isArray(pedList)) {
            for (let char of pedList) {
              if (!char.group || !char.group.visible || char.isFlying) continue;
              if (Math.abs(char.group.position.z - pPos.z) < 2.2 && Math.abs(char.group.position.x - pPos.x) < 1.8) {
                hitOccurred = true;
                break;
              }
            }
          }
        }

        // 5. Détonation explosive de zone (AoE) à l'impact ou au terme de la portée maximale
        if (hitOccurred || traveledDist >= p.maxDistance) {
          this.detonate(p, pPos.clone(), traffic, characters, environment, gameState);

          // Nettoyage de la scène
          try {
            this.container.remove(p.mesh);
          } catch (e) {}
          this.projectiles.splice(i, 1);
        }
      }
    } catch (err) {
      console.error('[ProjectileManager] Erreur dans update:', err);
    }
  }

  reset() {
    while (this.container.children.length > 0) {
      this.container.remove(this.container.children[0]);
    }
    this.projectiles = [];
  }
}

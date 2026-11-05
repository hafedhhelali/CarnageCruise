/**
 * Motormageddon - Système de Particules Hautes Performances Three.js
 * Fumée d'échappement, gerbe comique de pièces et d'étoiles, éclaboussures de sang cartoon,
 * débris de collision, et confettis de victoire.
 */

import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.stars = [];
    this.bloodDrops = [];
    this.bloodSplats = [];
    this.speedLines = [];

    this.initSpeedLines();
  }

  initSpeedLines() {
    // Lignes de vitesse qui fusent autour de la moto
    const lineGeo = new THREE.CylinderGeometry(0.015, 0.015, 6.0, 4);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35
    });

    for (let i = 0; i < 18; i++) {
      const mesh = new THREE.Mesh(lineGeo, lineMat);
      mesh.rotation.x = Math.PI / 2;
      mesh.visible = false;
      this.scene.add(mesh);
      this.speedLines.push({
        mesh,
        offsetX: (Math.random() - 0.5) * 6.0,
        offsetY: 0.3 + Math.random() * 2.5,
        offsetZ: Math.random() * 30.0,
        speed: 40 + Math.random() * 20
      });
    }
  }

  spawnExhaustSmoke(pos, speedRatio) {
    if (Math.random() > 0.45) return;

    const size = 0.12 + Math.random() * 0.1;
    const smokeGeo = new THREE.SphereGeometry(size, 6, 6);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xdcdde1,
      transparent: true,
      opacity: 0.6
    });

    const mesh = new THREE.Mesh(smokeGeo, smokeMat);
    mesh.position.copy(pos);
    mesh.position.x += (Math.random() - 0.5) * 0.15;
    mesh.position.y += (Math.random() - 0.5) * 0.1;

    this.scene.add(mesh);
    this.particles.push({
      mesh,
      velX: (Math.random() - 0.5) * 0.4,
      velY: 0.8 + Math.random() * 0.6,
      velZ: -1.5 * (speedRatio || 1.0),
      growRate: 1.2,
      life: 0.6,
      maxLife: 0.6,
      isCoin: false
    });
  }

  spawnBloodBurst(pos) {
    const bloodColors = [0x990000, 0xbb1111];

    // Quelques gouttes cartoon légères et discrètes (non exagéré)
    const numDrops = 6;
    for (let i = 0; i < numDrops; i++) {
      const size = 0.06 + Math.random() * 0.05;
      const bloodGeo = new THREE.SphereGeometry(size, 6, 6);
      const bloodMat = new THREE.MeshBasicMaterial({
        color: bloodColors[Math.floor(Math.random() * bloodColors.length)]
      });
      const drop = new THREE.Mesh(bloodGeo, bloodMat);
      drop.position.copy(pos);
      drop.position.y += 0.6;

      const angle = Math.random() * Math.PI * 2;
      const horizSpeed = 1.2 + Math.random() * 2.0;

      this.scene.add(drop);
      this.bloodDrops.push({
        mesh: drop,
        velX: Math.cos(angle) * horizSpeed,
        velY: 1.5 + Math.random() * 2.0,
        velZ: Math.sin(angle) * horizSpeed,
        life: 0.6,
        maxLife: 0.6
      });
    }

    // Une petite tache discrète au sol
    const splatGeo = new THREE.CircleGeometry(0.28, 8);
    const splatMat = new THREE.MeshBasicMaterial({
      color: 0x8b0000,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });
    const splat = new THREE.Mesh(splatGeo, splatMat);
    splat.rotation.x = -Math.PI / 2;
    splat.position.set(pos.x, 0.02, pos.z);
    this.scene.add(splat);
    this.bloodSplats.push({
      mesh: splat,
      life: 2.5,
      maxLife: 2.5
    });
  }

  spawnCrashBurst(pos) {
    // Éclat d'accident : nuage d'impact et étoiles de choc
    for (let i = 0; i < 14; i++) {
      const starGeo = new THREE.ConeGeometry(0.2, 0.4, 4);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.copy(pos);
      star.position.y += 0.5;

      const angle = (i / 14) * Math.PI * 2;
      this.scene.add(star);
      this.stars.push({
        mesh: star,
        velX: Math.cos(angle) * 7.0,
        velY: 4.0 + Math.random() * 4.0,
        velZ: Math.sin(angle) * 7.0,
        spinX: Math.random() * 20,
        spinY: Math.random() * 20,
        life: 1.0,
        maxLife: 1.0
      });
    }
  }

  spawnComicBurst(pos, score, combo) {
    // 1. Étoiles cartoon dorées qui tournoient
    const numStars = 8;
    for (let i = 0; i < numStars; i++) {
      const starGeo = new THREE.ConeGeometry(0.18, 0.35, 4);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.copy(pos);
      star.position.y += 1.0;

      const angle = (i / numStars) * Math.PI * 2;
      const speed = 4.0 + Math.random() * 4.0;

      this.scene.add(star);
      this.stars.push({
        mesh: star,
        velX: Math.cos(angle) * speed,
        velY: 3.5 + Math.random() * 5.0,
        velZ: Math.sin(angle) * speed,
        spinX: Math.random() * 15,
        spinY: Math.random() * 15,
        life: 0.8,
        maxLife: 0.8
      });
    }

    // 2. Pièces d'or qui giclent comiquement
    const numCoins = Math.min(8, 2 + combo);
    for (let c = 0; c < numCoins; c++) {
      const coinGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.04, 8);
      const coinMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.position.copy(pos);
      coin.position.y += 1.2;

      this.scene.add(coin);
      this.particles.push({
        mesh: coin,
        velX: (Math.random() - 0.5) * 6.0,
        velY: 5.0 + Math.random() * 4.0,
        velZ: (Math.random() - 0.5) * 6.0,
        life: 1.0,
        maxLife: 1.0,
        isCoin: true
      });
    }
  }

  spawnVictoryConfetti(pos) {
    const colors = [0x0984e3, 0xffffff, 0xd63031, 0xf1c40f, 0x2ed573, 0x9b59b6];
    const numConfetti = 45;
    for (let i = 0; i < numConfetti; i++) {
      const color = colors[i % colors.length];
      const confGeo = new THREE.PlaneGeometry(0.18, 0.28);
      const confMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const conf = new THREE.Mesh(confGeo, confMat);

      conf.position.copy(pos);
      conf.position.y += 2.0 + Math.random() * 2.0;
      conf.position.x += (Math.random() - 0.5) * 6.0;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 6.0;

      this.scene.add(conf);
      this.particles.push({
        mesh: conf,
        velX: Math.cos(angle) * speed,
        velY: 6.0 + Math.random() * 7.0,
        velZ: Math.sin(angle) * speed,
        spinX: (Math.random() - 0.5) * 12,
        spinY: (Math.random() - 0.5) * 15,
        life: 2.2,
        maxLife: 2.2,
        isConfetti: true
      });
    }
  }

  update(delta, playerZ, speed) {
    // Mettre à jour la fumée, pièces et confettis
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.velX * delta;
      p.mesh.position.y += p.velY * delta;
      p.mesh.position.z += p.velZ * delta;

      if (p.isCoin) {
        p.velY -= 15.0 * delta;
        p.mesh.rotation.x += 12 * delta;
        p.mesh.rotation.y += 15 * delta;
      } else if (p.isConfetti) {
        p.velY -= 6.0 * delta; // Chute douce des confettis
        p.mesh.rotation.x += p.spinX * delta;
        p.mesh.rotation.y += p.spinY * delta;
      } else {
        const progress = 1 - (p.life / p.maxLife);
        p.mesh.scale.addScalar(delta * (p.growRate || 1.0));
        p.mesh.material.opacity = (1 - progress) * 0.6;
      }
    }

    // Mettre à jour les gouttes de sang
    for (let b = this.bloodDrops.length - 1; b >= 0; b--) {
      const drop = this.bloodDrops[b];
      drop.life -= delta;

      if (drop.life <= 0) {
        this.scene.remove(drop.mesh);
        drop.mesh.geometry.dispose();
        drop.mesh.material.dispose();
        this.bloodDrops.splice(b, 1);
        continue;
      }

      drop.mesh.position.x += drop.velX * delta;
      drop.mesh.position.y += drop.velY * delta;
      drop.mesh.position.z += drop.velZ * delta;
      drop.velY -= 16.0 * delta;

      if (drop.mesh.position.y <= 0.05) {
        drop.mesh.position.y = 0.03;
        drop.velY = 0;
        drop.velX *= 0.5;
        drop.velZ *= 0.5;
      }
    }

    // Mettre à jour les taches de sang au sol
    for (let s = this.bloodSplats.length - 1; s >= 0; s--) {
      const splat = this.bloodSplats[s];
      splat.life -= delta;

      if (splat.life <= 0) {
        this.scene.remove(splat.mesh);
        splat.mesh.geometry.dispose();
        splat.mesh.material.dispose();
        this.bloodSplats.splice(s, 1);
        continue;
      }

      splat.mesh.material.opacity = Math.min(0.85, (splat.life / splat.maxLife) * 0.85);
    }

    // Mettre à jour les étoiles cartoon
    for (let s = this.stars.length - 1; s >= 0; s--) {
      const star = this.stars[s];
      star.life -= delta;

      if (star.life <= 0) {
        this.scene.remove(star.mesh);
        star.mesh.geometry.dispose();
        star.mesh.material.dispose();
        this.stars.splice(s, 1);
        continue;
      }

      star.mesh.position.x += star.velX * delta;
      star.mesh.position.y += star.velY * delta;
      star.mesh.position.z += star.velZ * delta;

      star.mesh.rotation.x += star.spinX * delta;
      star.mesh.rotation.y += star.spinY * delta;

      star.velY -= 14.0 * delta;
    }

    // Lignes de vitesse dynamiques
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
        sl.offsetX = (Math.random() - 0.5) * 6.0;
        sl.offsetY = 0.3 + Math.random() * 2.0;
      }

      sl.mesh.position.set(
        sl.offsetX,
        sl.offsetY,
        playerZ + sl.offsetZ
      );
    });
  }

  reset() {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    });
    this.stars.forEach(s => {
      this.scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
    });
    this.bloodDrops.forEach(b => {
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
    });
    this.bloodSplats.forEach(s => {
      this.scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
    });
    this.particles = [];
    this.stars = [];
    this.bloodDrops = [];
    this.bloodSplats = [];
  }
}

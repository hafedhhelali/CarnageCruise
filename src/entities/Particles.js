/**
 * Motormageddon - Système de Particules et Effets Visuels Spectaculaires
 * Fumée d'échappement, étoiles de collision comique, pièces d'or, lignes de vitesse.
 */

import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.stars = [];
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

    for (let i = 0; i < 20; i++) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = Math.PI / 2;
      line.position.set(
        (Math.random() - 0.5) * 12.0,
        1.0 + Math.random() * 4.0,
        Math.random() * 60.0
      );
      this.speedLines.push(line);
      this.scene.add(line);
    }
  }

  spawnExhaustSmoke(pos, speedRatio) {
    if (Math.random() > 0.45) return;

    const size = 0.12 + Math.random() * 0.1;
    const geo = new THREE.SphereGeometry(size, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 0.6
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.x += (Math.random() - 0.5) * 0.08;
    mesh.position.y += (Math.random() - 0.5) * 0.08;

    this.scene.add(mesh);

    this.particles.push({
      mesh,
      velX: (Math.random() - 0.5) * 0.4,
      velY: 0.4 + Math.random() * 0.5,
      velZ: -1.0 - Math.random() * 1.5,
      life: 0.6,
      maxLife: 0.6,
      growRate: 1.8
    });
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

  update(delta, playerZ, speed) {
    // Mettre à jour la fumée et pièces
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
        p.velY -= 15.0 * delta; // Gravité des pièces
        p.mesh.rotation.x += 12 * delta;
        p.mesh.rotation.y += 15 * delta;
      } else {
        // Fumée grandit et s'estompe
        const progress = 1 - (p.life / p.maxLife);
        p.mesh.scale.addScalar(delta * (p.growRate || 1.0));
        p.mesh.material.opacity = (1 - progress) * 0.6;
      }
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
      star.velY -= 12.0 * delta;

      star.mesh.rotation.x += star.spinX * delta;
      star.mesh.rotation.y += star.spinY * delta;

      const starProgress = star.life / star.maxLife;
      star.mesh.scale.setScalar(starProgress);
    }

    // Lignes de vitesse dynamiques
    const lineSpeed = speed * 1.5;
    this.speedLines.forEach(line => {
      line.position.z -= lineSpeed * delta;
      if (line.position.z < playerZ - 10) {
        line.position.z = playerZ + 50 + Math.random() * 20;
        line.position.x = (Math.random() - 0.5) * 12.0;
        line.position.y = 1.0 + Math.random() * 4.0;
      }
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
    this.particles = [];
    this.stars = [];
  }
}

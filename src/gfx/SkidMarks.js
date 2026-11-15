/**
 * Carnage Cruise - Système de Traces de Pneus (SkidMarks)
 * Ring-buffer InstancedMesh haute performance : zéro allocation par frame.
 */

import * as THREE from 'three';
import { textureFactory } from './TextureFactory.js';

export class SkidMarks {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    const isMobile = typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    this.maxMarks = isMobile ? 160 : 240;
    this.cursor = 0;

    this.geometry = new THREE.PlaneGeometry(0.22, 1.0);
    this.geometry.rotateX(-Math.PI / 2);

    this._ownsTexture = false;
    let tex = typeof textureFactory.getSkidMarkTexture === 'function'
      ? textureFactory.getSkidMarkTexture()
      : null;

    if (!tex && typeof document !== 'undefined') {
      tex = this._createFallbackTexture();
      this._ownsTexture = true;
    }
    this._texture = tex;

    this.material = new THREE.MeshBasicMaterial({
      map: tex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.maxMarks);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.name = 'SkidMarksPool';

    // Objets réutilisables (zéro allocation par frame)
    this._dummyPos = new THREE.Vector3();
    this._dummyQuat = new THREE.Quaternion();
    this._dummyScale = new THREE.Vector3();
    this._dummyMat = new THREE.Matrix4();
    this._upAxis = new THREE.Vector3(0, 1, 0);
    this._tmpColor = new THREE.Color(1, 1, 1);

    this.reset();
    if (this.scene) {
      this.scene.add(this.mesh);
    }
  }

  _createFallbackTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0.0, 'rgba(18, 18, 22, 0.0)');
    grad.addColorStop(0.2, 'rgba(18, 18, 22, 0.85)');
    grad.addColorStop(0.8, 'rgba(18, 18, 22, 0.85)');
    grad.addColorStop(1.0, 'rgba(18, 18, 22, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(2, 0, 10, 64);
    ctx.fillRect(20, 0, 10, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Émet une trace de pneu au sol dans le ring-buffer.
   * @param {THREE.Vector3|{x:number,y?:number,z:number}} worldPos
   * @param {number} yaw
   * @param {number} length
   * @param {number} intensity
   */
  emit(worldPos, yaw = 0, length = 1.0, intensity = 0.65) {
    if (!worldPos) return;
    this._dummyPos.set(worldPos.x, (worldPos.y || 0) + 0.025, worldPos.z);
    this._dummyQuat.setFromAxisAngle(this._upAxis, yaw);
    this._dummyScale.set(1.0, 1.0, Math.max(0.25, length));
    this._dummyMat.compose(this._dummyPos, this._dummyQuat, this._dummyScale);

    this.mesh.setMatrixAt(this.cursor, this._dummyMat);

    const shade = THREE.MathUtils.clamp(intensity, 0.15, 1.0);
    this._tmpColor.setRGB(shade, shade, shade);
    this.mesh.setColorAt(this.cursor, this._tmpColor);

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }

    this.cursor = (this.cursor + 1) % this.maxMarks;
  }

  /**
   * Masque toutes les traces actives sans réallouer le buffer.
   */
  reset() {
    this._dummyPos.set(0, -100, 0);
    this._dummyQuat.identity();
    this._dummyScale.set(0, 0, 0);
    this._dummyMat.compose(this._dummyPos, this._dummyQuat, this._dummyScale);
    this._tmpColor.setRGB(1, 1, 1);

    for (let i = 0; i < this.maxMarks; i++) {
      this.mesh.setMatrixAt(i, this._dummyMat);
      this.mesh.setColorAt(i, this._tmpColor);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    this.cursor = 0;
  }

  dispose() {
    if (this.scene && this.mesh) {
      this.scene.remove(this.mesh);
    }
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    if (this._ownsTexture && this._texture) {
      this._texture.dispose();
    }
    if (this.mesh && typeof this.mesh.dispose === 'function') {
      this.mesh.dispose();
    }
  }
}

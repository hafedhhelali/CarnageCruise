/**
 * Damped angular spring chain for secondary motion (scarves, horse tails, whips, antennas).
 * Zero per-frame heap allocations.
 */
export class SpringChain {
  /**
   * @param {import('three').Object3D[]} bones
   * @param {object} [opts]
   */
  constructor(bones = [], opts = {}) {
    this.bones = bones;
    this.stiffness = opts.stiffness ?? 68;
    this.damping = opts.damping ?? 11;
    this.windStrength = opts.windStrength ?? 0.035;
    this.maxAngle = opts.maxAngle ?? 0.72;
    this.anglesX = new Float32Array(bones.length);
    this.anglesZ = new Float32Array(bones.length);
    this.velX = new Float32Array(bones.length);
    this.velZ = new Float32Array(bones.length);
    this.time = 0;
  }

  update(delta, speed = 0, steerInput = 0) {
    const dt = Math.min(delta, 0.04);
    this.time += dt;
    const speedFactor = Math.min(1.5, Math.max(0, speed) * this.windStrength);

    for (let i = 0; i < this.bones.length; i++) {
      const bone = this.bones[i];
      if (!bone) continue;
      const lag = 1 + i * 0.35;
      const flutter = Math.sin(this.time * (9.5 + i * 2.1) - i * 0.9) * (0.06 + speedFactor * 0.16);
      const targetX = -speedFactor * 0.38 * lag + flutter;
      const targetZ = -steerInput * 0.24 * lag + Math.cos(this.time * 7.2 - i * 0.8) * (0.04 + speedFactor * 0.08);

      const ax = (targetX - this.anglesX[i]) * this.stiffness - this.velX[i] * this.damping;
      const az = (targetZ - this.anglesZ[i]) * this.stiffness - this.velZ[i] * this.damping;

      this.velX[i] += ax * dt;
      this.velZ[i] += az * dt;

      this.anglesX[i] = Math.max(-this.maxAngle, Math.min(this.maxAngle, this.anglesX[i] + this.velX[i] * dt));
      this.anglesZ[i] = Math.max(-this.maxAngle, Math.min(this.maxAngle, this.anglesZ[i] + this.velZ[i] * dt));

      bone.rotation.x = this.anglesX[i];
      bone.rotation.z = this.anglesZ[i];
    }
  }
}

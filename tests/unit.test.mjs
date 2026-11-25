import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal browser-global stubs for pure Node unit testing
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
globalThis.window.addEventListener = globalThis.window.addEventListener || (() => {});
globalThis.window.removeEventListener = globalThis.window.removeEventListener || (() => {});
if (typeof globalThis.localStorage === 'undefined') {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k)
  };
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    addEventListener: () => {},
    createElement: () => ({ getContext: () => null, style: {} })
  };
}

import { getRoadCenterX, getRoadAngle, getSidewalkLift, INTERSECTION_FIRST_Z, INTERSECTION_SPACING } from '../src/entities/RoadCurve.js';
import { SpringChain } from '../src/anim/SpringChain.js';
import { SampleBank } from '../src/audio/SampleBank.js';

test('RoadCurve: zero derivative at every intersection Z = 95 + k*160', () => {
  for (let k = 0; k < 12; k++) {
    const z = INTERSECTION_FIRST_Z + k * INTERSECTION_SPACING;
    const angle = getRoadAngle(z, false);
    assert.ok(Math.abs(angle) < 1e-4, `Expected straight intersection at Z=${z}, got angle=${angle}`);
  }
});

test('RoadCurve: roadStraight overrides curvature to 0', () => {
  assert.equal(getRoadCenterX(240, true), 0);
  assert.equal(getRoadAngle(240, true), 0);
});

test('RoadCurve: sidewalk lift smoothly transitions between 4.75m and 6.05m', () => {
  assert.equal(getSidewalkLift(2.0), 0);
  assert.equal(getSidewalkLift(6.5), 0.25);
  assert.ok(getSidewalkLift(5.4) > 0 && getSidewalkLift(5.4) < 0.25);
});

test('SpringChain: updates bone rotations without NaN or throwing', () => {
  const bone = { rotation: { x: 0, y: 0, z: 0 } };
  const chain = new SpringChain([bone], { stiffness: 75, damping: 10 });
  for (let i = 0; i < 60; i++) {
    chain.update(0.016, 35, 0.8);
  }
  assert.ok(Number.isFinite(bone.rotation.x));
  assert.ok(Number.isFinite(bone.rotation.z));
});

test('SampleBank.play returns false when cached buffer is null (preserves procedural fallback)', () => {
  const fakeSm = { ctx: { currentTime: 0 }, isDestroyed: false, getUiOutput: () => ({}) };
  const sb = new SampleBank(fakeSm);
  for (let i = 1; i <= 5; i++) {
    sb.buffers.set(`interface/click_00${i}.ogg`, null);
  }
  const played = sb.play('click', { uiBus: true });
  assert.equal(played, false);
});

test('Storage.recordRedLightRun exists and increments redLightsRun safely', async () => {
  const { storage } = await import('../src/core/Storage.js');
  const before = storage.data.stats.redLightsRun || 0;
  assert.equal(typeof storage.recordRedLightRun, 'function');
  storage.recordRedLightRun();
  assert.equal(storage.data.stats.redLightsRun, before + 1);
});

test('GameState endRun transitions currentMode to RESULTS and zeroes speed', async () => {
  const { gameState } = await import('../src/core/GameState.js');
  gameState.startRun('paris', 'STANDARD');
  gameState.currentMode = 'PLAYING';
  gameState.speed = 25;
  gameState.endRun();
  assert.equal(gameState.currentMode, 'RESULTS');
  assert.equal(gameState.speed, 0);
  assert.equal(gameState.targetSpeed, 0);
});

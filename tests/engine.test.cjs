const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEngine, SETTINGS } = require('../engine.js');
function arrive(e) { assert.equal(e.advance(), true); assert.equal(e.advance(), false); e.tick(SETTINGS.walkMs); }
function settle(e) { e.tick(SETTINGS.settleMs); }
function route(e) {
  e.start(); arrive(e); e.interact('close'); settle(e);
  arrive(e); e.interact('fake-close'); e.interact('claim'); e.interact('decline'); e.interact('decline'); settle(e);
  arrive(e); e.interact('verify'); e.interact('return-task'); settle(e); e.tick(SETTINGS.submitMs);
}
test('A title screen and repeated clicks cannot advance the route', () => {
  const e = createEngine(); assert.equal(e.advance(), false); assert.equal(e.interact('close'), false);
  e.start(); arrive(e); assert.equal(e.snapshot().ad, 'gift'); assert.equal(e.advance(), false);
  e.interact('claim'); assert.equal(e.snapshot().nodes, 0); e.interact('close'); assert.equal(e.snapshot().nodes, 1);
});
test('The large false close keeps the ad open; claiming leads to two refusals', () => {
  const e = createEngine(); e.start(); arrive(e); e.interact('close'); settle(e); arrive(e);
  e.interact('fake-close'); assert.equal(e.snapshot().ad, 'falseClose'); assert.equal(e.snapshot().nodes, 1);
  e.interact('claim'); assert.equal(e.snapshot().ad, 'retention');
  e.interact('decline'); assert.equal(e.snapshot().nodes, 1);
  e.interact('keep'); assert.equal(e.snapshot().adStep, 0);
  e.interact('decline'); e.interact('decline'); assert.equal(e.snapshot().nodes, 2);
});
test('The small true close dismisses the ad directly, before or after the decoy', () => {
  for (const clickDecoy of [false, true]) {
    const e = createEngine(); e.start(); arrive(e); e.interact('close'); settle(e); arrive(e);
    if (clickDecoy) e.interact('fake-close');
    assert.equal(e.interact('real-close'), true);
    assert.equal(e.snapshot().ad, null); assert.equal(e.snapshot().nodes, 2);
    assert.equal(e.snapshot().seen.includes('retention'), false);
    settle(e); assert.equal(e.snapshot().phase, 'ready'); assert.equal(e.advance(), true);
  }
});
test('Verification does not subscribe or bypass the original task', () => {
  const e = createEngine(); route(e);
  assert.deepEqual(e.snapshot().seen, ['gift', 'falseClose', 'retention', 'verification', 'forced']);
  assert.equal(e.snapshot().nodes, 3); assert.equal(e.snapshot().phase, 'receiving');
});
test('12 seconds of reception expire while 18 seconds of advertising remain', () => {
  const e = createEngine(); route(e); e.interact('blocked-close');
  assert.equal(e.snapshot().status, 'playing');
  e.tick(SETTINGS.receiveMs);
  assert.equal(e.snapshot().status, 'ended'); assert.equal(e.snapshot().reason, 'window');
  assert.equal(e.snapshot().sponsoredMs, 18000); assert.equal(e.snapshot().interactions, 8);
  const before = e.snapshot(); e.tick(100000); e.interact('blocked-close'); assert.deepEqual(e.snapshot(), before);
});
test('Pause freezes both clocks and all advertisement interactions', () => {
  const e = createEngine(); route(e); e.tick(1500); e.pause(true); const before = e.snapshot();
  e.tick(60000); assert.equal(e.interact('blocked-close'), false); assert.equal(e.advance(), false); assert.deepEqual(e.snapshot(), before);
  e.pause(false); e.tick(1000); assert.equal(e.snapshot().receiveMs, before.receiveMs - 1000);
});
test('Walking, settling and submitting respect chronological timer boundaries', () => {
  const e = createEngine(); e.start(); e.advance(); e.tick(SETTINGS.walkMs + 300);
  assert.equal(e.snapshot().ad, 'gift'); assert.equal(e.snapshot().journeyMs, SETTINGS.journeyMs - SETTINGS.walkMs - 300);
  e.interact('close'); e.tick(SETTINGS.settleMs + 1000); assert.equal(e.snapshot().phase, 'ready');
});
test('Inactivity ends coherently and replay resets all ephemeral records', () => {
  const e = createEngine(); e.start(); arrive(e); e.tick(SETTINGS.journeyMs);
  assert.equal(e.snapshot().status, 'ended'); assert.equal(e.snapshot().reason, 'journey');
  e.start(); assert.equal(e.snapshot().nodes, 0); assert.equal(e.snapshot().stones, 0); assert.equal(e.snapshot().interactions, 0);
  assert.deepEqual(e.snapshot().seen, []); assert.equal(e.snapshot().journeyMs, SETTINGS.journeyMs);
});
test('Snapshots do not expose mutable internal collections', () => {
  const e = createEngine(); const s = e.snapshot(); s.seen.push('forced'); s.config.receiveMs = 0;
  assert.deepEqual(e.snapshot().seen, []); assert.equal(e.snapshot().config.receiveMs, SETTINGS.receiveMs);
});

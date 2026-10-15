const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEngine, SETTINGS } = require('../engine.js');
function arrive(e) { assert.equal(e.advance(), true); assert.equal(e.advance(), false); e.tick(SETTINGS.walkMs); }
function settle(e) { e.tick(SETTINGS.settleMs); }
function secondAd(e) { e.start(); arrive(e); e.interact('close'); settle(e); arrive(e); }
function verificationAd(e) { secondAd(e); e.interact('real-close'); settle(e); arrive(e); }
function route(e) {
  e.start(); arrive(e); e.interact('close'); settle(e);
  arrive(e); e.interact('fake-close'); e.interact('decline'); e.interact('decline'); settle(e);
  arrive(e); e.interact('verify'); e.interact('return-task'); settle(e); e.tick(SETTINGS.submitMs);
}
test('A title screen and repeated clicks cannot advance the route', () => {
  const e = createEngine(); assert.equal(e.advance(), false); assert.equal(e.interact('close'), false);
  e.start(); arrive(e); assert.equal(e.snapshot().ad, 'gift'); assert.equal(e.advance(), false);
  e.interact('claim'); assert.equal(e.snapshot().nodes, 0); e.interact('close'); assert.equal(e.snapshot().nodes, 1);
});
test('Claiming a gift produces a receipt; closing an offer does not claim it', () => {
  const e = createEngine(); e.start(); arrive(e);
  assert.equal(e.interact('return-task'), false);
  e.interact('claim'); assert.equal(e.snapshot().adStep, 1); assert.equal(e.snapshot().giftClaimed, true);
  assert.equal(e.snapshot().ad, 'gift'); assert.equal(e.snapshot().nodes, 0);
  const receipt = e.snapshot(); assert.equal(e.interact('claim'), false); assert.deepEqual(e.snapshot(), receipt);
  e.interact('return-task'); assert.equal(e.snapshot().nodes, 1); assert.equal(e.snapshot().ad, null);
  e.start(); arrive(e); e.interact('close'); assert.equal(e.snapshot().giftClaimed, false);
});
test('Claiming acceleration reaches its receipt, never the abandonment question', () => {
  const e = createEngine(); secondAd(e);
  assert.equal(e.interact('return-task'), false);
  e.interact('claim'); assert.equal(e.snapshot().ad, 'falseClose'); assert.equal(e.snapshot().adStep, 1);
  assert.equal(e.snapshot().accelerationClaimed, true); assert.equal(e.snapshot().seen.includes('retention'), false);
  const receipt = e.snapshot(); assert.equal(e.interact('claim'), false); assert.deepEqual(e.snapshot(), receipt);
  e.interact('return-task'); assert.equal(e.snapshot().nodes, 2); assert.equal(e.snapshot().ad, null);
});
test('The large false close opens retention; refusing twice returns without claiming', () => {
  const e = createEngine(); secondAd(e); e.interact('fake-close');
  assert.equal(e.snapshot().ad, 'retention'); assert.equal(e.snapshot().nodes, 1);
  e.interact('decline'); assert.equal(e.snapshot().adStep, 1); assert.equal(e.snapshot().nodes, 1);
  e.interact('decline'); assert.equal(e.snapshot().nodes, 2); assert.equal(e.snapshot().ad, null);
  assert.equal(e.snapshot().accelerationClaimed, false);
});
test('Keeping the benefit exits either retention step into a claimed receipt', () => {
  for (const declineFirst of [false, true]) {
    const e = createEngine(); secondAd(e); e.interact('fake-close');
    if (declineFirst) e.interact('decline');
    e.interact('keep'); assert.equal(e.snapshot().ad, 'falseClose'); assert.equal(e.snapshot().adStep, 1);
    assert.equal(e.snapshot().accelerationClaimed, true); assert.equal(e.snapshot().nodes, 1);
    assert.equal(e.interact('keep'), false);
    e.interact('return-task'); assert.equal(e.snapshot().nodes, 2);
  }
});
test('Abandoning an already claimed benefit clears it', () => {
  const e = createEngine(); secondAd(e); e.interact('claim'); e.interact('fake-close');
  e.interact('decline'); e.interact('decline'); assert.equal(e.snapshot().accelerationClaimed, false);
});
test('The small true close dismisses the offer or receipt directly', () => {
  for (const claimFirst of [false, true]) {
    const e = createEngine(); secondAd(e);
    if (claimFirst) e.interact('claim');
    assert.equal(e.interact('real-close'), true);
    assert.equal(e.snapshot().ad, null); assert.equal(e.snapshot().nodes, 2);
    assert.equal(e.snapshot().seen.includes('retention'), false);
    assert.equal(e.snapshot().accelerationClaimed, claimFirst);
    settle(e); assert.equal(e.snapshot().phase, 'ready'); assert.equal(e.advance(), true);
  }
});
test('Skipping verification returns without recording consent', () => {
  for (const openOptions of [false, true]) {
    const e = createEngine(); verificationAd(e);
    assert.equal(e.interact('consent'), false); assert.equal(e.interact('toggle', false), false);
    if (openOptions) e.interact('verify');
    e.interact('return-task'); assert.equal(e.snapshot().nodes, 3);
    assert.equal(e.snapshot().serviceConfirmed, false); assert.equal(e.snapshot().verificationComplete, false);
  }
});
test('Confirmation honors the checkbox and produces a distinct terminal receipt', () => {
  for (const selected of [false, true]) {
    const e = createEngine(); verificationAd(e); e.interact('verify');
    assert.equal(e.interact('verify'), false); assert.equal(e.interact('toggle'), false);
    e.interact('toggle', !selected); e.interact('toggle', selected);
    assert.equal(e.snapshot().serviceSelected, selected);
    e.interact('consent'); assert.equal(e.snapshot().ad, 'verification'); assert.equal(e.snapshot().adStep, 2);
    assert.equal(e.snapshot().serviceConfirmed, selected); assert.equal(e.snapshot().verificationComplete, true);
    assert.equal(e.snapshot().nodes, 2);
    const receipt = e.snapshot();
    assert.equal(e.interact('consent'), false); assert.equal(e.interact('toggle', !selected), false);
    assert.equal(e.interact('verify'), false); assert.deepEqual(e.snapshot(), receipt);
    e.interact('return-task'); assert.equal(e.snapshot().nodes, 3); assert.equal(e.snapshot().ad, null);
  }
});
test('The original route reaches the final sponsored interruption', () => {
  const e = createEngine(); route(e);
  assert.deepEqual(e.snapshot().seen, ['gift', 'falseClose', 'retention', 'verification', 'forced']);
  assert.equal(e.snapshot().nodes, 3); assert.equal(e.snapshot().phase, 'receiving');
});
test('12 seconds of reception expire while 18 seconds of advertising remain', () => {
  const e = createEngine(); route(e); e.interact('blocked-close');
  assert.equal(e.snapshot().status, 'playing');
  e.tick(SETTINGS.receiveMs);
  assert.equal(e.snapshot().status, 'ended'); assert.equal(e.snapshot().reason, 'window');
  assert.equal(e.snapshot().sponsoredMs, 18000); assert.equal(e.snapshot().interactions, 7);
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
test('Replay and reset clear all claimed benefits and service choices', () => {
  const e = createEngine(); e.start(); arrive(e); e.interact('claim'); e.interact('return-task'); settle(e);
  arrive(e); e.interact('claim'); e.interact('return-task'); settle(e);
  arrive(e); e.interact('verify'); e.interact('consent');
  assert.equal(e.snapshot().giftClaimed, true); assert.equal(e.snapshot().accelerationClaimed, true);
  assert.equal(e.snapshot().serviceConfirmed, true);
  e.start();
  for (const key of ['giftClaimed', 'accelerationClaimed', 'serviceConfirmed', 'verificationComplete']) assert.equal(e.snapshot()[key], false);
  assert.equal(e.snapshot().serviceSelected, true);
  e.reset(); assert.equal(e.snapshot().status, 'title'); assert.equal(e.snapshot().ad, null);
});
test('Snapshots do not expose mutable internal collections', () => {
  const e = createEngine(); const s = e.snapshot(); s.seen.push('forced'); s.config.receiveMs = 0;
  assert.deepEqual(e.snapshot().seen, []); assert.equal(e.snapshot().config.receiveMs, SETTINGS.receiveMs);
});

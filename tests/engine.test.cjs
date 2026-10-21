const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEngine, SETTINGS } = require('../engine.js');
function arrive(e) { assert.equal(e.advance(), true); assert.equal(e.advance(), false); e.tick(SETTINGS.walkMs); }
function settle(e) { e.tick(SETTINGS.settleMs); }
function secondAd(e) { e.start(); arrive(e); e.interact('close'); settle(e); arrive(e); }
function verificationAd(e) { secondAd(e); e.interact('real-close'); settle(e); arrive(e); }
function route(e) {
  e.start(); arrive(e); e.interact('close'); settle(e);
  arrive(e); e.interact('fake-close'); e.interact('decline'); e.interact('decline'); e.interact('decline'); settle(e);
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
test('The large false close opens a service offer; declining leads to retention', () => {
  const e = createEngine(); secondAd(e); e.interact('fake-close');
  assert.equal(e.snapshot().ad, 'purchase'); assert.equal(e.snapshot().nodes, 1);
  assert.equal(e.snapshot().priorityPurchased, false); assert.equal(e.interact('return-task'), false);
  e.interact('decline');
  assert.equal(e.snapshot().ad, 'retention'); assert.equal(e.snapshot().nodes, 1);
  e.interact('decline'); assert.equal(e.snapshot().adStep, 1); assert.equal(e.snapshot().nodes, 1);
  e.interact('decline'); assert.equal(e.snapshot().nodes, 2); assert.equal(e.snapshot().ad, null);
  assert.equal(e.snapshot().accelerationClaimed, false);
  assert.equal(e.snapshot().priorityPurchased, false);
});
test('Opening a purchase offer never buys; purchasing produces one receipt and resets cleanly', () => {
  for (const claimFirst of [false, true]) {
    const e = createEngine(); secondAd(e);
    if (claimFirst) e.interact('claim');
    e.interact('fake-close'); assert.equal(e.snapshot().ad, 'purchase');
    assert.equal(e.snapshot().priorityPurchased, false);
    e.pause(true); const paused = e.snapshot(); assert.equal(e.interact('purchase'), false); assert.deepEqual(e.snapshot(), paused);
    e.pause(false); assert.equal(e.interact('purchase'), true);
    assert.equal(e.snapshot().ad, 'purchase'); assert.equal(e.snapshot().adStep, 1);
    assert.equal(e.snapshot().priorityPurchased, true); assert.equal(e.snapshot().nodes, 1);
    const receipt = e.snapshot(); assert.equal(e.interact('purchase'), false); assert.equal(e.interact('decline'), false); assert.deepEqual(e.snapshot(), receipt);
    e.interact('return-task'); assert.equal(e.snapshot().nodes, 2); assert.equal(e.snapshot().ad, null);
    e.start(); assert.equal(e.snapshot().priorityPurchased, false);
    secondAd(e); e.interact('fake-close'); e.interact('purchase'); e.reset(); assert.equal(e.snapshot().priorityPurchased, false);
  }
});
test('The purchase page true close exits directly from either the offer or receipt', () => {
  for (const buyFirst of [false, true]) {
    const e = createEngine(); secondAd(e); e.interact('fake-close');
    if (buyFirst) e.interact('purchase');
    assert.equal(e.interact('real-close'), true); assert.equal(e.snapshot().ad, null); assert.equal(e.snapshot().nodes, 2);
    assert.equal(e.snapshot().priorityPurchased, buyFirst); assert.equal(e.snapshot().seen.includes('retention'), false);
  }
});
test('Keeping the benefit exits either retention step into a claimed receipt', () => {
  for (const declineFirst of [false, true]) {
    const e = createEngine(); secondAd(e); e.interact('fake-close'); e.interact('decline');
    if (declineFirst) e.interact('decline');
    e.interact('keep'); assert.equal(e.snapshot().ad, 'falseClose'); assert.equal(e.snapshot().adStep, 1);
    assert.equal(e.snapshot().accelerationClaimed, true); assert.equal(e.snapshot().nodes, 1);
    assert.equal(e.snapshot().priorityPurchased, false);
    assert.equal(e.interact('keep'), false);
    e.interact('return-task'); assert.equal(e.snapshot().nodes, 2);
  }
});
test('Abandoning an already claimed benefit clears it', () => {
  const e = createEngine(); secondAd(e); e.interact('claim'); e.interact('fake-close');
  e.interact('decline'); e.interact('decline'); e.interact('decline'); assert.equal(e.snapshot().accelerationClaimed, false);
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
function activatePass(e) { e.interact('claim-pass'); e.interact('activate-pass'); }
function finishRound(e) {
  const kind = e.snapshot().passageRound % 3;
  if (kind === 0) { e.interact('hold-start'); e.tick(SETTINGS.holdMs); }
  else if (kind === 1) for (let n = 0; n < 3; n++) e.interact('light-' + n);
  else { e.interact('start-check'); e.tick(SETTINGS.checkMs); }
}
test('The route reaches one continuous passage flow instead of the compulsory film', () => {
  const e = createEngine(); route(e);
  assert.deepEqual(e.snapshot().seen, ['gift', 'falseClose', 'purchase', 'retention', 'verification', 'passage']);
  assert.equal(e.snapshot().nodes, 3); assert.equal(e.snapshot().phase, 'passage');
  assert.equal(e.snapshot().passagePermille, 995);
  e.interact('claim-pass'); assert.equal(e.snapshot().adStep, 1); assert.equal(e.snapshot().passagePermille, 997);
  assert.equal(e.interact('claim-pass'), false); e.interact('activate-pass'); assert.equal(e.snapshot().adStep, 2);
});
test('Each completed task preserves a remainder through many subdivisions', () => {
  const e = createEngine({ journeyMs: 1000000000 }); route(e); activatePass(e);
  for (let round = 0; round < 100; round++) {
    assert.equal(e.snapshot().passageRound, round); assert.equal(e.snapshot().adStep, 2);
    finishRound(e); assert.equal(e.snapshot().adStep, 3); assert.equal(e.snapshot().passagePermille, 999);
    assert.equal(e.snapshot().status, 'playing'); assert.equal(e.interact('claim-pass'), false);
    e.interact('continue-pass'); assert.equal(e.snapshot().passageTaskMs, 0); assert.equal(e.snapshot().passageLights, 0);
  }
  assert.equal(e.snapshot().seen.filter(x => x === 'passage').length, 1);
});
test('Hold progress persists, repeats are rejected, and pause releases the held input', () => {
  const e = createEngine(); route(e); activatePass(e);
  assert.equal(e.interact('light-0'), false); assert.equal(e.interact('start-check'), false);
  e.interact('hold-start'); assert.equal(e.interact('hold-start'), false); e.tick(600);
  e.pause(true); const before = e.snapshot(); e.tick(60000);
  assert.equal(e.interact('hold-pulse'), false); assert.deepEqual(e.snapshot(), before);
  e.pause(false); e.tick(1000); assert.equal(e.snapshot().passageTaskMs, 600);
  assert.equal(e.snapshot().journeyMs, before.journeyMs - 1000);
  e.interact('hold-start'); e.tick(SETTINGS.holdMs - 600); assert.equal(e.snapshot().adStep, 3);
});
test('Repeated clicks provide an alternative to holding, and light choices count once', () => {
  const e = createEngine(); route(e); activatePass(e);
  for (let n = 0; n < 4; n++) assert.equal(e.interact('hold-pulse'), true);
  assert.equal(e.snapshot().adStep, 3); assert.equal(e.interact('hold-pulse'), false);
  e.interact('continue-pass'); assert.equal(e.interact('hold-start'), false);
  e.interact('light-2'); assert.equal(e.interact('light-2'), false); assert.equal(e.snapshot().passageLights, 4);
  e.interact('light-0'); e.interact('light-1'); assert.equal(e.snapshot().adStep, 3);
});
test('A timed check freezes during pause and completes once after resuming', () => {
  const e = createEngine(); route(e); activatePass(e);
  finishRound(e); e.interact('continue-pass'); finishRound(e); e.interact('continue-pass');
  e.interact('start-check'); assert.equal(e.interact('start-check'), false); e.tick(800);
  e.pause(true); const before = e.snapshot(); e.tick(30000); assert.deepEqual(e.snapshot(), before);
  e.pause(false); e.tick(SETTINGS.checkMs - 800); assert.equal(e.snapshot().adStep, 3);
  assert.equal(e.snapshot().passageRunning, false);
});
test('True close saves each passage screen and can reopen without adding a node', () => {
  const e = createEngine(); route(e);
  for (let step = 0; step < 4; step++) {
    assert.equal(e.snapshot().adStep, step);
    e.interact('close-pass'); assert.equal(e.snapshot().ad, null); assert.equal(e.snapshot().phase, 'waiting');
    e.tick(200); assert.equal(e.advance(), true); assert.equal(e.snapshot().adStep, step); assert.equal(e.snapshot().nodes, 3);
    if (step === 0) e.interact('claim-pass');
    if (step === 1) e.interact('activate-pass');
    if (step === 2) finishRound(e);
  }
});
test('Closing an active check preserves partial progress but requires starting it again', () => {
  const e = createEngine(); route(e); activatePass(e);
  finishRound(e); e.interact('continue-pass'); finishRound(e); e.interact('continue-pass');
  e.interact('start-check'); e.tick(500); e.interact('close-pass'); e.tick(3000); e.advance(); e.tick(2000);
  assert.equal(e.snapshot().passageTaskMs, 500); assert.equal(e.snapshot().passageRunning, false);
  e.interact('start-check'); e.tick(SETTINGS.checkMs - 500); assert.equal(e.snapshot().adStep, 3);
});
test('A purchase from the last task returns to that task or its own completion receipt', () => {
  for (const exit of ['decline', 'real-close', 'return-task']) {
    const e = createEngine(); route(e); activatePass(e); e.interact('hold-pulse');
    e.interact('passage-offer'); assert.equal(e.snapshot().purchaseOrigin, 'passage');
    if (exit === 'return-task') e.interact('purchase');
    e.interact(exit); assert.equal(e.snapshot().ad, 'passage'); assert.equal(e.snapshot().nodes, 3);
    assert.equal(e.snapshot().adStep, exit === 'return-task' ? 3 : 2);
    assert.equal(e.snapshot().priorityApplied, exit === 'return-task');
    assert.equal(e.snapshot().passageTaskMs, SETTINGS.holdMs / 4);
  }
});
test('An earlier purchase supplies exactly one local completion, while the goal remains pending', () => {
  const e = createEngine(); secondAd(e); e.interact('fake-close'); e.interact('purchase'); e.interact('return-task'); settle(e);
  arrive(e); e.interact('return-task'); settle(e); e.tick(SETTINGS.submitMs); activatePass(e);
  assert.equal(e.interact('use-priority'), true); assert.equal(e.snapshot().adStep, 3);
  assert.equal(e.snapshot().passagePaidRound, true); assert.equal(e.snapshot().passagePermille, 999);
  e.interact('continue-pass'); assert.equal(e.interact('use-priority'), false); assert.equal(e.interact('passage-offer'), false);
  e.start(); assert.equal(e.snapshot().priorityApplied, false); assert.equal(e.snapshot().passageRound, 0);
});
test('The journey deadline ends every final task, hidden card, and purchase screen coherently', () => {
  for (const screen of ['hold', 'hidden', 'purchase', 'receipt', 'check']) {
    const e = createEngine(); route(e); activatePass(e);
    if (screen === 'hidden') e.interact('close-pass');
    else if (screen === 'purchase') e.interact('passage-offer');
    else if (screen === 'receipt') finishRound(e);
    else if (screen === 'check') { finishRound(e); e.interact('continue-pass'); finishRound(e); e.interact('continue-pass'); e.interact('start-check'); }
    else e.interact('hold-start');
    e.tick(e.snapshot().journeyMs); assert.equal(e.snapshot().status, 'ended'); assert.equal(e.snapshot().reason, 'journey');
    assert.equal(e.snapshot().ad, null); assert.equal(e.snapshot().passageHolding, false); assert.equal(e.snapshot().passageRunning, false);
    const before = e.snapshot(); e.interact('continue-pass'); e.tick(10000); assert.deepEqual(e.snapshot(), before);
  }
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
  const e = createEngine(); const s = e.snapshot(); s.seen.push('forced'); s.config.holdMs = 0;
  assert.deepEqual(e.snapshot().seen, []); assert.equal(e.snapshot().config.holdMs, SETTINGS.holdMs);
});

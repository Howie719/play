const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Engine = require('../engine.js');
const source = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
const page = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

// Run the real UI handlers with a small DOM/clock adapter. This verifies rendered
// states and event wiring; real-browser checks remain responsible for layout.
function app({ reducedMotion = false } = {}) {
  const nodes = new Map(), events = {}, windowEvents = {}, timers = new Map();
  let now = 0, raf = [], timerId = 0, engine, draws = 0;
  const document = { hidden: false, activeElement: null, addEventListener: (name, fn) => { events[name] = fn; } };
  function element(id, attrs = '', parent = null) {
    const el = { id, parent, isConnected: true, hidden: /\bhidden\b/.test(attrs), inert: false, disabled: false,
      checked: /\bchecked\b/.test(attrs), dataset: {}, style: { setProperty(name, value) { this[name] = value; } },
      textContent: '', lang: '', handlers: {}, buttons: [], dynamic: [], tagName: 'BUTTON',
      setAttribute(name, value) { this[name] = value; },
      classList: { values: new Set(), add(x) { this.values.add(x); }, remove(x) { this.values.delete(x); } },
      addEventListener(name, fn) { this.handlers[name] = fn; },
      closest(selector) {
        if (selector === '[data-action]') return this.dataset.action ? this : null;
        for (let p = this; p; p = p.parent) if (p.hidden || p.inert) return p;
        return null;
      },
      focus() { if (this.isConnected && !this.disabled && !this.closest('[hidden], [inert]')) document.activeElement = this; },
      contains(other) { for (let p = other; p; p = p.parent) if (p === this) return true; return false; },
      querySelector(selector) { return selector === '.ad' ? this.region : null; },
      querySelectorAll() { return this.id === 'pause-overlay' ? [get('resume'), get('return-home')] : this.buttons; },
      getContext() { return { setTransform() {} }; }
    };
    let html = '';
    Object.defineProperty(el, 'innerHTML', { get: () => html, set(value) {
      html = value; for (const child of this.dynamic) child.isConnected = false;
      this.dynamic = []; this.buttons = []; this.region = null;
      if (!value) return;
      this.region = element('ad-region', '', this); this.dynamic.push(this.region);
      for (const match of value.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) this.dynamic.push(element(match[1], match[0], this.region));
      for (const match of value.matchAll(/<button\b([^>]*?)data-action="([^"]+)"([^>]*)>([\s\S]*?)<\/button>/g)) {
        const attrs = match[1] + match[3], id = attrs.match(/\bid="([^"]+)"/)?.[1];
        const button = element(id || `action-${match[2]}`, attrs, this.region);
        button.dataset.action = match[2]; button.textContent = match[4].replace(/<[^>]+>/g, '');
        this.buttons.push(button); this.dynamic.push(button);
      }
    } });
    if (id) nodes.set(id, el);
    return el;
  }
  const body = element('body'); body.dataset = {}; document.body = body; document.activeElement = body;
  for (const match of page.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) element(match[1], match[0], body);
  const get = id => { assert.ok(nodes.has(id), `Unknown DOM id: ${id}`); return nodes.get(id); };
  for (const id of ['intro', 'journey', 'ending']) get(id).parent = get('main');
  for (const [child, parent] of Object.entries({ enter: 'intro', advance: 'journey', replay: 'ending', pause: 'masthead', resume: 'pause-overlay', 'return-home': 'pause-overlay' })) get(child).parent = get(parent);
  document.getElementById = get; document.createElement = () => element('');
  const window = { innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    matchMedia: () => ({ matches: reducedMotion }), addEventListener: (name, fn) => { windowEvents[name] = fn; } };
  for (const key of ['AudioContext', 'webkitAudioContext']) Object.defineProperty(window, key, { get() { throw new Error('The silent edition must not initialize audio.'); } });
  const context = { window, document, performance: { now: () => now },
    ThresholdEngine: { createEngine() { engine = Engine.createEngine(); return engine; } },
    ThresholdScene: { createRenderer: () => ({ draw() { draws++; } }) },
    requestAnimationFrame: fn => { raf.push(fn); },
    setTimeout: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id)
  };
  vm.runInNewContext(source, context, { filename: 'game.js' });
  const api = {
    get, state: () => engine.snapshot(), draws: () => draws,
    step(ms = 16) {
      now += ms; const callbacks = raf; raf = []; callbacks.forEach(fn => fn(now));
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); }
    },
    click(id) { const el = get(id); assert.equal(el.disabled, false); assert.equal(el.closest('[hidden], [inert]'), null); el.focus(); el.handlers.click({ target: el }); },
    action(action) {
      const button = get('ad-host').buttons.find(el => el.dataset.action === action);
      assert.ok(button, `No rendered button for ${action}`); assert.equal(button.disabled, false); button.focus(); get('ad-host').handlers.click({ target: button });
    },
    key(key, repeat = false, shiftKey = false) { events.keydown({ key, code: key === ' ' ? 'Space' : key, repeat, shiftKey, preventDefault() {} }); },
    keyUp(key) { events.keyup({ key }); },
    pointer(action) { const button = get('ad-host').buttons.find(el => el.dataset.action === action); get('ad-host').handlers.pointerdown({ target: button, button: 0, preventDefault() {} }); },
    release() { events.pointerup(); },
    cancel() { events.pointercancel(); },
    hidden(value) { document.hidden = value; events.visibilitychange(); },
    resize() { windowEvents.resize(); },
    checkbox(checked) { const input = get('consent-check'); input.checked = checked; get('ad-host').handlers.change({ target: input }); },
    html: () => get('ad-host').innerHTML,
    heading: () => get('ad-host').innerHTML.match(/<h3[^>]*>([^<]*)<\/h3>/)?.[1],
    focus: () => document.activeElement.id
  };
  return api;
}
function start(a) { a.click('enter'); a.step(1800); a.step(); }
function arrive(a) { a.click('advance'); a.step(Engine.SETTINGS.walkMs); a.step(); }
function settle(a) { a.step(Engine.SETTINGS.settleMs); a.step(); }
function toVerification(a) { start(a); arrive(a); a.action('close'); settle(a); arrive(a); a.action('real-close'); settle(a); arrive(a); }
function toPassage(a) { toVerification(a); a.action('return-task'); settle(a); a.step(Engine.SETTINGS.submitMs); a.action('claim-pass'); a.action('activate-pass'); }

test('Begin preserves the clock until the transition ends; reduced motion starts directly', () => {
  const a = app(); a.click('enter'); a.step(900);
  assert.equal(a.state().journeyMs, Engine.SETTINGS.journeyMs); assert.equal(a.get('advance').disabled, true);
  a.step(900); assert.equal(a.get('intro').hidden, true); assert.equal(a.get('advance').disabled, false);
  a.step(100); assert.equal(a.state().journeyMs, Engine.SETTINGS.journeyMs - 100);
  const reduced = app({ reducedMotion: true }); reduced.click('enter');
  assert.equal(reduced.get('intro').hidden, true); assert.equal(reduced.get('advance').disabled, false);
});

test('Actual claim buttons render receipts instead of abandonment questions', () => {
  const a = app(); start(a); arrive(a); a.action('claim');
  assert.equal(a.heading(), '通行礼已领取'); assert.doesNotMatch(a.html(), /data-action="claim"/);
  a.action('return-task'); settle(a); assert.equal(a.focus(), 'advance'); arrive(a); a.action('claim');
  assert.equal(a.heading(), '加速资格已领取'); assert.doesNotMatch(a.html(), /确认放弃|免费领取加速/);
  a.action('fake-close'); assert.equal(a.heading(), '解锁优享通行');
  a.action('decline'); assert.equal(a.heading(), '确认放弃通行加速？');
  a.action('decline'); assert.equal(a.heading(), '最后确认一次');
  a.action('keep'); assert.equal(a.heading(), '加速资格已领取');
  a.action('real-close'); settle(a); assert.equal(a.get('ad-host').hidden, true); assert.equal(a.focus(), 'advance');
});

test('The false-close purchase page distinguishes opening, purchasing, and closing', () => {
  for (const buyFirst of [false, true]) {
    const a = app(); start(a); arrive(a); a.action('close'); settle(a); arrive(a); a.action('fake-close');
    assert.equal(a.heading(), '解锁优享通行'); assert.equal(a.state().priorityPurchased, false);
    assert.match(a.html(), /立即开通 · ¥9.90/); assert.match(a.html(), /不会产生真实扣费/);
    if (buyFirst) {
      a.action('purchase'); assert.equal(a.heading(), '优享通行已开通');
      assert.equal(a.state().priorityPurchased, true); assert.doesNotMatch(a.html(), /data-action="purchase"|data-action="decline"/);
      a.action('return-task');
    } else a.action('real-close');
    settle(a); assert.equal(a.get('ad-host').hidden, true); assert.equal(a.focus(), 'advance');
    assert.equal(a.state().nodes, 2);
  }
});

test('The checkbox and confirmation handlers render different, final results', () => {
  for (const selected of [false, true]) {
    const a = app(); toVerification(a); a.action('verify'); a.checkbox(selected); a.action('consent');
    assert.equal(a.heading(), selected ? '持续通行服务已开启' : '基础校验已完成');
    assert.equal(a.html().includes('已跳过持续通行服务'), !selected);
    assert.doesNotMatch(a.html(), /data-action="consent"|id="consent-check"/);
    a.action('return-task'); settle(a); a.step(Engine.SETTINGS.submitMs);
    assert.equal(a.heading(), '仅差一份入场凭证'); assert.match(a.html(), /99.5/);
    a.step(a.state().journeyMs);
    assert.equal(a.get('ending').hidden, false); assert.equal(a.get('masthead').hidden, true);
    assert.equal(a.get('ad-host').innerHTML, ''); assert.equal(a.get('toast').textContent, '');
    a.click('replay'); assert.equal(a.state().nodes, 0); assert.equal(a.get('ending').hidden, true);
  }
});

test('Pointer hold, keyboard hold, lights, and timed checks update the real interface', () => {
  const a = app(); toPassage(a);
  a.pointer('hold-pulse'); a.step(600); assert.equal(a.get('passage-task-percent').textContent, '30%');
  a.cancel(); a.step(800); assert.equal(a.state().passageTaskMs, 600);
  a.get('passage-hold').focus(); a.key(' '); a.step(Engine.SETTINGS.holdMs - 600); a.keyUp(' ');
  assert.equal(a.heading(), '本轮进度已入账'); assert.match(a.html(), /确认 90%/); assert.match(a.html(), /99.9/);
  a.action('continue-pass'); assert.equal(a.heading(), '仅差最后一点');
  assert.match(a.html(), /上一格剩余的 10% 已展开/);
  a.action('light-0'); a.step(); assert.equal(a.get('passage-light-0').disabled, true); assert.equal(a.focus(), 'passage-light-1');
  assert.throws(() => a.action('light-0'));
  a.action('light-1'); a.action('light-2'); a.action('continue-pass'); a.action('start-check');
  assert.equal(a.get('passage-check').disabled, true); a.step(Engine.SETTINGS.checkMs);
  assert.equal(a.heading(), '本轮进度已入账'); a.action('continue-pass');
  for (let n = 0; n < 4; n++) a.action('hold-pulse');
  assert.match(a.html(), /额外补正已到账/); assert.match(a.html(), /确认 99%/);
});

test('The final purchase returns to its saved task and gives a distinct local completion', () => {
  const a = app(); toPassage(a); a.action('hold-pulse'); a.action('passage-offer');
  assert.match(a.html(), /补齐本轮剩余进度/); a.action('decline');
  assert.equal(a.heading(), '激活最后一格'); assert.equal(a.state().passageTaskMs, Engine.SETTINGS.holdMs / 4);
  a.action('passage-offer'); a.action('purchase'); assert.equal(a.heading(), '优享通行已开通');
  assert.match(a.html(), /补齐本轮，继续确认/); a.action('return-task');
  assert.equal(a.heading(), '本轮进度已入账'); assert.match(a.html(), /优享资格已补齐本轮/);
  assert.match(a.html(), /10 \/ 10/); assert.match(a.html(), /99.9/);
  a.action('continue-pass'); assert.doesNotMatch(a.html(), /data-action="passage-offer"|data-action="use-priority"/);
});

test('Closing the final card restores a usable Continue and reopening preserves progress', () => {
  const a = app(); toPassage(a); a.action('hold-pulse'); const taskMs = a.state().passageTaskMs;
  a.action('close-pass'); a.step(); assert.equal(a.get('ad-host').hidden, true);
  assert.equal(a.get('advance-label').textContent, 'Continue'); assert.equal(a.get('advance').disabled, false); assert.equal(a.focus(), 'advance');
  a.click('advance'); assert.equal(a.heading(), '激活最后一格'); assert.equal(a.state().passageTaskMs, taskMs);
  a.pointer('hold-pulse'); a.click('pause'); const before = a.state(); a.step(10000); assert.deepEqual(a.state(), before);
  a.click('resume'); a.step(1000); assert.equal(a.state().passageTaskMs, taskMs);
  a.step(a.state().journeyMs); assert.equal(a.get('ending').hidden, false);
  a.click('replay'); assert.equal(a.state().passageRound, 0); assert.equal(a.state().passageTaskMs, 0);
});

test('Holding Escape pauses once; paused scenes do not keep drawing, except after resize', () => {
  const a = app(); start(a); a.key('Escape'); a.step(); const paused = a.state(), draws = a.draws();
  a.key('Escape', true); a.step(10000);
  assert.deepEqual(a.state(), paused); assert.equal(a.draws(), draws); assert.equal(a.get('pause-overlay').hidden, false);
  a.key('Tab', false, true); assert.equal(a.focus(), 'return-home'); a.key('Tab'); assert.equal(a.focus(), 'resume');
  a.resize(); a.step(); assert.equal(a.draws(), draws + 1); assert.deepEqual(a.state(), paused);
  a.click('resume'); a.step(100); assert.equal(a.state().paused, false); assert.equal(a.state().journeyMs, paused.journeyMs - 100);
  a.click('pause'); a.click('return-home'); a.step();
  assert.equal(a.get('intro').hidden, false); assert.equal(a.focus(), 'enter'); assert.equal(a.state().status, 'title');
});

test('Hiding the page freezes time and requires an explicit resume', () => {
  const a = app(); start(a); arrive(a); a.hidden(true); const paused = a.state(); a.step(60000);
  a.hidden(false); a.step(5000); assert.deepEqual(a.state(), paused);
  assert.equal(a.get('pause-overlay').hidden, false); a.click('resume'); a.step(100);
  assert.equal(a.state().journeyMs, paused.journeyMs - 100);
});

test('The silent edition has no audio button or audio script dependency', () => {
  assert.doesNotMatch(page, /id="sound"|sound-word|<audio\b/i);
  assert.doesNotMatch(source, /AudioContext|createOscillator|toggleSound/);
  const a = app(); start(a); arrive(a); a.action('claim'); a.click('pause'); a.click('return-home');
  assert.equal(a.state().status, 'title');
});

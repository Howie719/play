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
      textContent: '', lang: '', handlers: {}, buttons: [], dynamic: [],
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
      for (const match of value.matchAll(/<button\b[^>]*data-action="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)) {
        const button = element(`action-${match[1]}`, '', this.region);
        button.dataset.action = match[1]; button.textContent = match[2].replace(/<[^>]+>/g, '');
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
      assert.ok(button, `No rendered button for ${action}`); button.focus(); get('ad-host').handlers.click({ target: button });
    },
    key(key, repeat = false, shiftKey = false) { events.keydown({ key, code: key === ' ' ? 'Space' : key, repeat, shiftKey, preventDefault() {} }); },
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
  a.action('fake-close'); assert.equal(a.heading(), '确认放弃通行加速？');
  a.action('decline'); assert.equal(a.heading(), '最后确认一次');
  a.action('keep'); assert.equal(a.heading(), '加速资格已领取');
  a.action('real-close'); settle(a); assert.equal(a.get('ad-host').hidden, true); assert.equal(a.focus(), 'advance');
});

test('The checkbox and confirmation handlers render different, final results', () => {
  for (const selected of [false, true]) {
    const a = app(); toVerification(a); a.action('verify'); a.checkbox(selected); a.action('consent');
    assert.equal(a.heading(), selected ? '持续通行服务已开启' : '通行校验已完成');
    assert.equal(a.html().includes('已跳过持续通行服务'), !selected);
    assert.doesNotMatch(a.html(), /data-action="consent"|id="consent-check"/);
    a.action('return-task'); settle(a); a.step(Engine.SETTINGS.submitMs); a.action('blocked-close');
    assert.equal(a.get('toast').lang, 'zh-Hans'); assert.match(a.get('toast').textContent, /仍需观看/);
    a.step(Engine.SETTINGS.receiveMs);
    assert.equal(a.get('ending').hidden, false); assert.equal(a.get('masthead').hidden, true);
    assert.equal(a.get('ad-host').innerHTML, ''); assert.equal(a.get('toast').textContent, '');
    a.click('replay'); assert.equal(a.state().nodes, 0); assert.equal(a.get('ending').hidden, true);
  }
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

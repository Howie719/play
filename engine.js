(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ThresholdEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SETTINGS = Object.freeze({ journeyMs: 160000, receiveMs: 12000, sponsoredMs: 30000, walkMs: 2100, settleMs: 850, submitMs: 2400 });
  function createEngine(overrides = {}) {
    const config = { ...SETTINGS, ...overrides };
    let state;
    function reset() {
      state = { status: 'title', phase: 'ready', paused: false, nodes: 0, stones: 0, interactions: 0,
        seen: [], ad: null, adStep: 0, phaseMs: 0, journeyMs: config.journeyMs,
        receiveMs: config.receiveMs, sponsoredMs: config.sponsoredMs, reason: null, revision: 0,
        giftClaimed: false, accelerationClaimed: false, serviceSelected: true, serviceConfirmed: false, verificationComplete: false };
      return snapshot();
    }
    function changed() { state.revision++; }
    function snapshot() { return { ...state, seen: [...state.seen], config: { ...config } }; }
    function showAd(type) {
      state.phase = type === 'forced' ? 'receiving' : 'ad';
      state.ad = type; state.adStep = 0;
      if (!state.seen.includes(type)) state.seen.push(type);
      changed();
    }
    function finish(reason) {
      state.status = 'ended'; state.phase = 'ended'; state.ad = null;
      state.reason = reason; state.paused = false; changed();
    }
    function completeNode() {
      state.nodes++; state.ad = null; state.adStep = 0;
      state.phase = 'arrival'; state.phaseMs = config.settleMs; changed();
    }
    function start() {
      reset(); state.status = 'playing'; changed(); return snapshot();
    }
    function pause(value) {
      if (state.status !== 'playing') return false;
      state.paused = Boolean(value); changed(); return true;
    }
    function advance() {
      if (state.status !== 'playing' || state.paused || state.phase !== 'ready' || state.nodes >= 3) return false;
      state.phase = 'walking'; state.phaseMs = config.walkMs; changed(); return true;
    }
    function interact(action, value) {
      if (state.status !== 'playing' || state.paused || !state.ad) return false;
      const allowed = {
        gift: state.adStep === 0 ? ['claim', 'close'] : ['return-task', 'close'],
        falseClose: state.adStep === 0 ? ['fake-close', 'claim', 'real-close'] : ['fake-close', 'return-task', 'real-close'],
        retention: ['keep', 'decline'],
        verification: [['verify', 'return-task'], ['toggle', 'return-task', 'consent'], ['return-task']][state.adStep],
        forced: ['blocked-close']
      };
      if (!allowed[state.ad].includes(action)) return false;
      if (action === 'toggle' && typeof value !== 'boolean') return false;
      state.interactions++; state.stones++; changed();
      switch (state.ad) {
        case 'gift':
          if (action === 'claim') { state.giftClaimed = true; state.adStep = 1; }
          else completeNode();
          break;
        case 'falseClose':
          if (action === 'real-close' || action === 'return-task') completeNode();
          else if (action === 'claim') { state.accelerationClaimed = true; state.adStep = 1; }
          else showAd('retention');
          break;
        case 'retention':
          if (action === 'keep') { state.accelerationClaimed = true; showAd('falseClose'); state.adStep = 1; }
          else if (state.adStep === 0) state.adStep = 1;
          else { state.accelerationClaimed = false; completeNode(); }
          changed(); break;
        case 'verification':
          if (action === 'return-task') completeNode();
          else if (action === 'verify') { state.adStep = 1; changed(); }
          else if (action === 'toggle') state.serviceSelected = value;
          else if (action === 'consent') {
            state.serviceConfirmed = state.serviceSelected; state.verificationComplete = true;
            state.adStep = 2; changed();
          }
          break;
      }
      return true;
    }
    function tick(ms) {
      if (!Number.isFinite(ms) || ms <= 0 || state.status !== 'playing' || state.paused) return snapshot();
      let remaining = ms;
      // Process boundaries in chronological order, even after a delayed frame.
      while (remaining > 0 && state.status === 'playing') {
        const timed = ['walking', 'arrival', 'submitting'].includes(state.phase);
        let step = Math.min(remaining, state.journeyMs);
        if (timed) step = Math.min(step, state.phaseMs);
        if (state.phase === 'receiving') step = Math.min(step, state.receiveMs);
        state.journeyMs = Math.max(0, state.journeyMs - step);
        if (timed) state.phaseMs = Math.max(0, state.phaseMs - step);
        if (state.phase === 'receiving') {
          state.receiveMs = Math.max(0, state.receiveMs - step);
          state.sponsoredMs = Math.max(0, state.sponsoredMs - step);
        }
        remaining -= step;
        if (state.journeyMs === 0) { finish('journey'); break; }
        if (state.phase === 'receiving' && state.receiveMs === 0) { finish('window'); break; }
        if (timed && state.phaseMs === 0) {
          if (state.phase === 'walking') showAd(['gift', 'falseClose', 'verification'][state.nodes]);
          else if (state.phase === 'arrival') {
            state.phase = state.nodes === 3 ? 'submitting' : 'ready';
            state.phaseMs = state.nodes === 3 ? config.submitMs : 0; changed();
          } else showAd('forced');
        }
        if (step === 0 && !timed) break;
      }
      return snapshot();
    }
    reset();
    return { config, reset, start, pause, advance, interact, tick, snapshot };
  }
  return { SETTINGS, createEngine };
});

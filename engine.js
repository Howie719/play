(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ThresholdEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SETTINGS = Object.freeze({ journeyMs: 160000, walkMs: 2100, settleMs: 850, submitMs: 2400, holdMs: 1800, checkMs: 2400 });
  function createEngine(overrides = {}) {
    const config = { ...SETTINGS, ...overrides };
    let state;
    function reset() {
      state = { status: 'title', phase: 'ready', paused: false, nodes: 0, stones: 0, interactions: 0,
        seen: [], ad: null, adStep: 0, phaseMs: 0, journeyMs: config.journeyMs,
        reason: null, revision: 0, giftClaimed: false, accelerationClaimed: false, priorityPurchased: false,
        serviceSelected: true, serviceConfirmed: false, verificationComplete: false,
        passagePermille: 980, passageRound: 0, passageStep: 0, passageTaskMs: 0, passageHolding: false,
        passageRunning: false, passageLights: 0, passagePaidRound: false, passagePreviousCredit: 0, priorityApplied: false, purchaseOrigin: null };
      return snapshot();
    }
    function changed() { state.revision++; }
    function snapshot() { return { ...state, seen: [...state.seen], config: { ...config } }; }
    function showAd(type) {
      state.phase = type === 'passage' || (type === 'purchase' && state.purchaseOrigin === 'passage') ? 'passage' : 'ad';
      state.ad = type; state.adStep = 0;
      if (!state.seen.includes(type)) state.seen.push(type);
      changed();
    }
    function finish(reason) {
      state.status = 'ended'; state.phase = 'ended'; state.ad = null;
      state.reason = reason; state.paused = false; stopTask(); changed();
    }
    function stopTask() { state.passageHolding = false; state.passageRunning = false; }
    function taskKind() { return ['hold', 'lights', 'check'][state.passageRound % 3]; }
    function taskLimit() { return taskKind() === 'hold' ? config.holdMs : config.checkMs; }
    function completeTask(paid = false) {
      stopTask(); state.passagePaidRound = paid; state.passagePermille = 999;
      state.adStep = 3; state.passageStep = 3; changed();
    }
    function returnFromPurchase() {
      const purchased = state.adStep === 1;
      state.purchaseOrigin = null; showAd('passage'); state.adStep = 2;
      if (purchased) { state.priorityApplied = true; completeTask(true); }
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
      state.paused = Boolean(value);
      if (state.paused) state.passageHolding = false;
      changed(); return true;
    }
    function advance() {
      if (state.status !== 'playing' || state.paused) return false;
      if (state.phase === 'waiting') { showAd('passage'); state.adStep = state.passageStep; return true; }
      if (state.phase !== 'ready' || state.nodes >= 3) return false;
      state.phase = 'walking'; state.phaseMs = config.walkMs; changed(); return true;
    }
    function interact(action, value) {
      if (state.status !== 'playing' || state.paused || !state.ad) return false;
      const allowed = {
        gift: state.adStep === 0 ? ['claim', 'close'] : ['return-task', 'close'],
        falseClose: state.adStep === 0 ? ['fake-close', 'claim', 'real-close'] : ['fake-close', 'return-task', 'real-close'],
        purchase: state.adStep === 0 ? ['purchase', 'decline', 'real-close'] : ['return-task', 'real-close'],
        retention: ['keep', 'decline'],
        verification: [['verify', 'return-task'], ['toggle', 'return-task', 'consent'], ['return-task']][state.adStep],
        passage: [
          ['claim-pass', 'close-pass'], ['activate-pass', 'close-pass'],
          ['hold-start', 'hold-stop', 'hold-pulse', 'light-0', 'light-1', 'light-2', 'start-check', 'passage-offer', 'use-priority', 'close-pass'],
          ['continue-pass', 'close-pass']
        ][state.adStep]
      };
      if (!allowed[state.ad].includes(action)) return false;
      if (action === 'toggle' && typeof value !== 'boolean') return false;
      if (state.ad === 'passage' && state.adStep === 2) {
        if (action === 'hold-start' && (taskKind() !== 'hold' || state.passageHolding)) return false;
        if (action === 'hold-pulse' && taskKind() !== 'hold') return false;
        if (action === 'hold-stop' && !state.passageHolding) return false;
        if (action.startsWith('light-') && (taskKind() !== 'lights' || (state.passageLights & (1 << Number(action.slice(-1)))))) return false;
        if (action === 'start-check' && (taskKind() !== 'check' || state.passageRunning)) return false;
        if (action === 'use-priority' && (!state.priorityPurchased || state.priorityApplied)) return false;
        if (action === 'passage-offer' && (state.priorityPurchased || state.priorityApplied)) return false;
      }
      state.interactions++; state.stones++; changed();
      switch (state.ad) {
        case 'gift':
          if (action === 'claim') { state.giftClaimed = true; state.adStep = 1; }
          else completeNode();
          break;
        case 'falseClose':
          if (action === 'real-close' || action === 'return-task') completeNode();
          else if (action === 'claim') { state.accelerationClaimed = true; state.adStep = 1; }
          else { state.purchaseOrigin = null; showAd('purchase'); }
          break;
        case 'purchase':
          if (action === 'purchase') { state.priorityPurchased = true; state.adStep = 1; }
          else if (state.purchaseOrigin === 'passage') returnFromPurchase();
          else if (action === 'decline') showAd('retention');
          else completeNode();
          break;
        case 'retention':
          if (action === 'keep') { state.accelerationClaimed = true; showAd('falseClose'); state.adStep = 1; }
          else if (state.adStep === 0) state.adStep = 1;
          else { state.accelerationClaimed = false; completeNode(); }
          changed(); break;
        case 'verification':
          if (action === 'return-task') completeNode();
          else if (action === 'verify') { state.adStep = 1; state.passagePermille = 990; changed(); }
          else if (action === 'toggle') state.serviceSelected = value;
          else if (action === 'consent') {
            state.serviceConfirmed = state.serviceSelected; state.verificationComplete = true;
            state.adStep = 2; state.passagePermille = 995; changed();
          }
          break;
        case 'passage':
          if (action === 'claim-pass') { state.adStep = 1; state.passagePermille = 997; }
          else if (action === 'activate-pass') { state.adStep = 2; state.passageStep = 2; }
          else if (action === 'close-pass') { state.passageStep = state.adStep; stopTask(); state.ad = null; state.phase = 'waiting'; }
          else if (action === 'hold-start') state.passageHolding = true;
          else if (action === 'hold-stop') state.passageHolding = false;
          else if (action === 'hold-pulse') {
            state.passageTaskMs = Math.min(config.holdMs, state.passageTaskMs + config.holdMs / 4);
            if (state.passageTaskMs >= config.holdMs) completeTask();
          }
          else if (action.startsWith('light-')) {
            state.passageLights |= 1 << Number(action.slice(-1));
            if (state.passageLights === 7) completeTask();
          } else if (action === 'start-check') state.passageRunning = true;
          else if (action === 'continue-pass') {
            state.passagePreviousCredit = state.passagePaidRound ? 100 : state.passageRound % 4 === 3 ? 99 : 90;
            state.passageRound++; state.passageTaskMs = 0; state.passageLights = 0; state.passagePaidRound = false;
            state.adStep = 2; state.passageStep = 2;
          } else if (action === 'passage-offer') {
            stopTask(); state.purchaseOrigin = 'passage'; showAd('purchase');
          } else if (action === 'use-priority') { state.priorityApplied = true; completeTask(true); }
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
        const taskTimed = state.ad === 'passage' && state.adStep === 2 && (state.passageHolding || state.passageRunning);
        let step = Math.min(remaining, state.journeyMs);
        if (timed) step = Math.min(step, state.phaseMs);
        if (taskTimed) step = Math.min(step, taskLimit() - state.passageTaskMs);
        state.journeyMs = Math.max(0, state.journeyMs - step);
        if (timed) state.phaseMs = Math.max(0, state.phaseMs - step);
        if (taskTimed) state.passageTaskMs += step;
        remaining -= step;
        if (state.journeyMs === 0) { finish('journey'); break; }
        if (taskTimed && state.passageTaskMs >= taskLimit()) completeTask();
        if (timed && state.phaseMs === 0) {
          if (state.phase === 'walking') showAd(['gift', 'falseClose', 'verification'][state.nodes]);
          else if (state.phase === 'arrival') {
            state.phase = state.nodes === 3 ? 'submitting' : 'ready';
            state.phaseMs = state.nodes === 3 ? config.submitMs : 0; changed();
          } else { state.passagePermille = 995; showAd('passage'); }
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

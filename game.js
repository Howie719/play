(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const engine = ThresholdEngine.createEngine();
  const renderer = ThresholdScene.createRenderer({ createCanvas: (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; } });
  const canvas = $('hall'), ctx = canvas.getContext('2d', { alpha: false });
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = window.innerWidth, height = window.innerHeight, dpr = 1, state = engine.snapshot();
  let last = performance.now(), lastDraw = 0, visualTime = 0, travel = 0, pointerX = 0, adKey = '', currentPhase = '', status = '';
  let toastTimer, activeLayer = null, previousFocus = null;
  let closing = 0, aperture = 0, entrance = 1, entering = false;
  const entryDuration = 1800;
  function format(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
  function toast(message, language = 'en') {
    clearTimeout(toastTimer); $('toast').lang = language; $('toast').textContent = message; $('toast').classList.add('visible');
    toastTimer = setTimeout(clearToast, 2800);
  }
  function clearToast() {
    clearTimeout(toastTimer);
    $('toast').classList.remove('visible'); $('toast').textContent = ''; $('toast').lang = 'en';
  }
  function focusNext(el) { if (el) requestAnimationFrame(() => { if (el.isConnected && !el.disabled && !el.closest('[hidden], [inert]')) el.focus({ preventScroll: true }); }); }
  function syncNow() { state = engine.snapshot(); render(); }
  function hideLayers(restore = true) {
    $('pause-overlay').hidden = true; activeLayer = null;
    if (restore) focusNext(previousFocus && previousFocus.isConnected ? previousFocus : $('advance'));
  }
  function pauseGame() {
    if (state.status !== 'playing' || activeLayer) return;
    previousFocus = document.activeElement; engine.pause(true); activeLayer = 'pause'; $('pause-overlay').hidden = false;
    syncNow(); focusNext($('resume'));
  }
  function resumeGame() { hideLayers(); engine.pause(false); last = performance.now(); syncNow(); }
  function goHome() {
    hideLayers(false); clearToast(); engine.reset(); entering = false; entrance = 0; document.body.style.setProperty('--entry-progress', '1'); travel = 0; closing = 0; aperture = 0; adKey = ''; currentPhase = ''; syncNow(); focusNext($('enter'));
  }
  function start() {
    if (entering) return;
    const fromTitle = state.status === 'title';
    hideLayers(false); clearToast(); engine.start();
    travel = 0; closing = 0; aperture = 0; adKey = ''; currentPhase = '';
    entrance = fromTitle && !motionQuery.matches ? 0 : 1; entering = entrance < 1;
    document.body.style.setProperty('--entry-progress', String(entrance));
    // Keep visualTime: the opening and its slow motion belong to the same space.
    last = performance.now(); syncNow();
    if (!entering) focusNext($('advance'));
  }
  function advance() { if (!entering && engine.advance()) syncNow(); }
  const closeButton = action => `<button class="ad-close" data-action="${action}" aria-label="${action === 'fake-close' ? '广告内的叉号按钮' : '关闭此广告'}"><span aria-hidden="true">×</span></button>`;
  const templates = {
    gift: () => `<div class="ad ad-gift" role="region" aria-labelledby="ad-title" tabindex="-1">${closeButton('close')}<p class="ad-kind">门内生活 · 新客专享</p><div class="gift-badge" aria-hidden="true">${state.adStep ? '领取<br>成功' : '仅限<br>此刻'}</div><h3 class="ad-title" id="ad-title">${state.adStep ? '通行礼已领取' : '进门先领通行礼'}</h3><p class="ad-desc">${state.adStep ? '88 点已记入本次通行礼。' : '恭喜你！一份心意已送达'}</p><div class="coupon"><span>${state.adStep ? '领取成功 · 本次有效' : '你的专属通行好礼'}</span><strong>88</strong><i>点</i><small>${state.adStep ? '好礼已收下，前方仍有一段路。' : '距离更好的生活，只差一次点击'}</small></div><button class="ad-primary" data-action="${state.adStep ? 'return-task' : 'claim'}">${state.adStep ? '收下好礼，继续前往' : '立即领取'}</button><p class="ad-fine">赞助内容 · 仅用于游戏内模拟</p></div>`,
    falseClose: () => `<div class="ad ad-speed" role="region" aria-labelledby="ad-title" tabindex="-1"><button class="ad-close ad-close-small" data-action="real-close" aria-label="关闭此广告"><span aria-hidden="true">×</span></button><button class="ad-close-fake" data-action="fake-close" aria-label="广告内的大号关闭按钮"><span aria-hidden="true">×</span><small>关闭</small></button><div class="ad-topline"><span>门内加速服务</span><em>赞助</em></div><div class="speed-glyph" aria-hidden="true">${state.adStep ? '✓' : '≫'}</div><h3 id="ad-title">${state.adStep ? '加速资格已领取' : '距离抵达，只差一步'}</h3><p class="ad-desc">${state.adStep ? '资格已为你保留，请继续完成余下通行流程。' : '让等待更短，让抵达更近。'}</p><button class="ad-primary" data-action="${state.adStep ? 'return-task' : 'claim'}">${state.adStep ? '继续前往 →' : '免费领取加速 →'}</button><p class="ad-fine">赞助内容 · 仅用于游戏内模拟</p></div>`,
    purchase: () => `<div class="ad ad-purchase" role="region" aria-labelledby="ad-title" tabindex="-1">${closeButton('real-close')}<p class="ad-kind">门内优享 · 专属服务</p><h3 class="ad-title" id="ad-title">${state.adStep ? '优享通行已开通' : '解锁优享通行'}</h3><p class="ad-desc">${state.adStep ? '本次模拟开通已完成，请继续前往入口。' : '专属入口，为你的抵达预留一步。'}</p><div class="purchase-plan"><span>${state.adStep ? '开通成功 · 本次有效' : '优享通行 · 单次服务'}</span><strong><small>¥</small>9.90</strong><p>优先排队 · 专属通道</p></div><button class="ad-primary" data-action="${state.adStep ? 'return-task' : 'purchase'}">${state.adStep ? '完成开通，继续前往' : '立即开通 · ¥9.90'}</button>${state.adStep ? '' : '<button class="actual-close" data-action="decline">暂不开通</button>'}<p class="ad-fine">游戏内模拟服务 · 不会产生真实扣费</p></div>`,
    retention: () => `<div class="ad ad-retention" role="region" aria-labelledby="ad-title" tabindex="-1"><p class="ad-topline"><span>通行权益提醒</span><em>赞助内容</em></p><div class="retention-icon" aria-hidden="true">!</div><h3 class="ad-title" id="ad-title">${state.adStep ? '最后确认一次' : '确认放弃通行加速？'}</h3><p class="ad-desc">${state.adStep ? '现在离开，你将继续独自等待。' : '无需开通优享服务，你仍可保留免费加速资格。'}</p><p class="retention-count">${state.adStep ? 'CONFIRMATION 02 / 02' : 'CONFIRMATION 01 / 02'}</p><button class="ad-primary" data-action="keep">保留我的权益</button><button class="actual-close" data-action="decline">${state.adStep ? '确认放弃，继续原任务' : '放弃权益'}</button></div>`,
    verification: () => {
      const complete = state.adStep === 2;
      const title = complete ? (state.serviceConfirmed ? '持续通行服务已开启' : '通行校验已完成') : (state.adStep ? '持续通行服务' : '通行校验');
      const description = complete ? (state.serviceConfirmed ? '已记录你的选择，通行校验已完成。' : '已跳过持续通行服务，通行校验已完成。') : (state.adStep ? '为下一次抵达，提前准备。' : '门已感知到你的到来。<br>请完成最后一步，继续通行。');
      return `<div class="ad ad-verify" role="region" aria-labelledby="ad-title" tabindex="-1"><div class="ad-topline"><span>ARCHIVE / 07</span><em>赞助内容</em></div><h3 class="ad-title" id="ad-title">${title}</h3><p class="ad-desc">${description}</p><div class="verify-code"><i aria-hidden="true">${complete ? '✓' : state.adStep ? '∞' : 'Ⅲ'}</i><div>ACCESS PROTOCOL<br>${complete ? 'VERIFICATION COMPLETE' : state.adStep ? 'CONTINUOUS SERVICE' : 'AWAITING VERIFICATION'}</div></div>${complete ? '<button class="ad-primary" data-action="return-task">完成校验，继续前往</button><p class="ad-fine">赞助内容 · 仅用于游戏内模拟</p>' : state.adStep ? `<label class="consent-row"><input id="consent-check" type="checkbox" ${state.serviceSelected ? 'checked' : ''}><div>开通持续通行服务<span>这是游戏内的模拟选项</span></div></label><button class="ad-primary" data-action="consent">确认并继续</button>` : '<button class="ad-primary" data-action="verify">继续校验 →</button>'}${complete ? '' : '<button class="actual-close" data-action="return-task">返回原任务</button>'}</div>`;
    },
    forced: () => `<div class="ad ad-forced" role="region" aria-labelledby="ad-title" tabindex="-1"><div class="forced-status"><div><p>必须完整观看</p><strong id="sponsor-seconds">30s</strong></div><div class="reception"><p>入口开放倒计时</p><strong id="receive-seconds">12s</strong></div></div><div class="sponsor-film"><small>MENNEI / SPONSORED FILM</small><div class="film-door" aria-hidden="true"></div><p id="ad-title">为你开启更远的门</p></div><div class="forced-playback"><span>完整观看后，即可进入</span><span id="playback-position">00:00 / 00:30</span></div><div class="ad-progress"><i id="ad-bar"></i></div><p class="forced-copy">你已到达。进入之前，请先看完这段赞助内容。</p><button class="blocked-close" data-action="blocked-close">播放结束后可关闭 ×</button></div>`
  };
  function renderAd() {
    const key = `${state.ad || ''}:${state.adStep}`;
    $('ad-host').hidden = !state.ad; $('ad-backdrop').hidden = !state.ad;
    if (key === adKey) return;
    clearToast();
    const oldAd = adKey.split(':')[0]; adKey = key;
    $('ad-host').innerHTML = state.ad ? templates[state.ad]() : '';
    if (state.ad) {
      focusNext($('ad-host').querySelector('.ad'));
    } else if (oldAd) {
      clearToast();
      focusNext(state.status === 'ended' ? $('replay') : $('advance'));
    }
  }
  function render() {
    if (status !== state.status) {
      status = state.status; document.body.dataset.screen = status;
      $('masthead').hidden = status !== 'playing';
      $('journey').hidden = status !== 'playing'; $('ending').hidden = status !== 'ended';
      if (status === 'ended') {
        clearToast();
        focusNext($('replay'));
      }
    }
    $('intro').hidden = status !== 'title' && !entering;
    $('intro').inert = entering;
    $('enter').disabled = entering;
    document.body.dataset.entering = String(entering);
    const remaining = format(state.journeyMs);
    if ($('journey-time').textContent !== remaining) $('journey-time').textContent = remaining;
    document.body.dataset.paused = String(!!activeLayer || state.paused);
    document.body.dataset.ad = String(!!state.ad);
    $('main').inert = !!activeLayer || !!state.ad;
    $('masthead').inert = !!activeLayer || entering;
    $('journey').inert = entering;
    $('ad-host').inert = !!activeLayer;
    $('narrative').hidden = state.phase !== 'ready';
    const phase = state.phase + ':' + state.nodes + ':' + entering;
    if (phase !== currentPhase) {
      const arrived = currentPhase.startsWith('arrival:') && state.phase === 'ready';
      currentPhase = phase;
      $('advance').disabled = state.phase !== 'ready' || entering;
      $('advance-label').textContent = ['Approach', 'Continue', 'Enter'][Math.min(2, state.nodes)];
      $('narrative-line').textContent = ['There is an opening.', 'A little further.', 'Just one more step.'][Math.min(2, state.nodes)];
      $('phase-copy').textContent = state.phase === 'submitting' ? 'The opening is here.' : '';
      if (arrived) focusNext($('advance'));
    }
    renderAd();
    if (state.ad === 'forced') {
      $('sponsor-seconds').textContent = Math.ceil(state.sponsoredMs / 1000) + 's';
      $('receive-seconds').textContent = Math.ceil(state.receiveMs / 1000) + 's';
      $('playback-position').textContent = format(state.config.sponsoredMs - state.sponsoredMs) + ' / ' + format(state.config.sponsoredMs);
      $('ad-bar').style.width = `${100 * (1 - state.sponsoredMs / state.config.sponsoredMs)}%`;
    }
  }
  $('ad-host').addEventListener('click', event => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const action = button.dataset.action;
    if (!engine.interact(action)) return;
    state = engine.snapshot();
    render();
    if (action === 'blocked-close') toast(`仍需观看 ${Math.ceil(state.sponsoredMs / 1000)} 秒。`, 'zh-Hans');
  });
  $('ad-host').addEventListener('change', event => {
    if (event.target.id !== 'consent-check') return;
    if (engine.interact('toggle', event.target.checked)) { state = engine.snapshot(); render(); }
  });
  $('enter').addEventListener('click', start); $('replay').addEventListener('click', start); $('advance').addEventListener('click', advance);
  $('pause').addEventListener('click', () => activeLayer === 'pause' ? resumeGame() : pauseGame());
  $('resume').addEventListener('click', resumeGame); $('return-home').addEventListener('click', goHome);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (event.repeat) return;
      if (activeLayer === 'pause') resumeGame(); else pauseGame();
      return;
    }
    if (event.key === 'Tab' && activeLayer) {
      const box = $('pause-overlay');
      const elements = [...box.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')];
      if (!elements.length) return;
      const first = elements[0], end = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) { event.preventDefault(); end.focus(); }
      else if (!event.shiftKey && (document.activeElement === end || !box.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      return;
    }
    if (event.code === 'Space' && !event.repeat && !activeLayer && state.status === 'playing' && state.phase === 'ready' && !/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(document.activeElement.tagName)) {
      event.preventDefault(); advance();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.status === 'playing' && !activeLayer) pauseGame();
    last = performance.now();
  });
  function resize() {
    width = window.innerWidth; height = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2000000 / (width * height)));
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); lastDraw = 0;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', event => { if (!activeLayer && !state.paused) pointerX = event.pointerType === 'mouse' ? event.clientX / width - .5 : 0; }, { passive: true });
  function frame(now) {
    const dt = Math.max(0, now - last); last = now;
    if (!document.hidden) {
      if (!activeLayer && !state.paused) visualTime += Math.min(dt, 120);
      if (entering) {
        if (!activeLayer && !state.paused) {
          entrance = motionQuery.matches ? 1 : Math.min(1, entrance + dt / entryDuration);
          document.body.style.setProperty('--entry-progress', entrance.toFixed(4));
          if (entrance === 1) {
            entering = false; syncNow(); focusNext($('advance'));
          }
        }
      } else if (state.status === 'playing' && !state.paused && !activeLayer) state = engine.tick(dt);
      let target = state.nodes;
      if (state.phase === 'walking' && !motionQuery.matches) target += 1 - state.phaseMs / state.config.walkMs;
      else if (state.phase === 'ad') target += 1;
      const smoothing = motionQuery.matches ? 1 : Math.min(1, dt / 250);
      if (!state.paused && !activeLayer) {
        travel += (target - travel) * smoothing;
        if (state.status === 'ended') closing = motionQuery.matches ? 1 : Math.min(1, closing + Math.min(dt, 120) / 1700);
        else {
          const opening = ['submitting', 'receiving'].includes(state.phase) ? 1 : 0;
          aperture += (opening - aperture) * (motionQuery.matches ? 1 : Math.min(1, dt / 650));
        }
      }
      const frozen = !!activeLayer || state.paused;
      if (lastDraw === 0 || (!frozen && now - lastDraw >= (motionQuery.matches ? 180 : 33))) {
        renderer.draw(ctx, { width, height, time: visualTime, travel, screen: state.status, ended: state.status === 'ended', aperture, closing, entrance, reducedMotion: motionQuery.matches, pointerX });
        lastDraw = now; render();
      }
    }
    requestAnimationFrame(frame);
  }
  resize(); render(); requestAnimationFrame(frame);
})();

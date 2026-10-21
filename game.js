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
  const taskKind = () => ['hold', 'lights', 'check'][state.passageRound % 3];
  const unitName = () => ['激活碎片', '校验光点', '通行刻度', '同步凭证'][state.passageRound % 4];
  const roundCredit = () => state.passagePaidRound ? 100 : state.passageRound % 4 === 3 ? 99 : 90;
  function passageOverview() {
    return `<div class="passage-overview"><div><span>通行准备度</span><strong>${(state.passagePermille / 10).toFixed(1)}<small>%</small></strong></div><div class="passage-total-track" aria-hidden="true"><i style="width:${state.passagePermille / 10}%"></i></div><p>入口已为你预留</p></div>`;
  }
  function passageTask() {
    const kind = taskKind(), unit = unitName(), complete = state.adStep === 3;
    const progress = complete ? roundCredit() : 0;
    let control = '';
    if (complete) control = `<p class="passage-result" role="status">${state.passagePaidRound ? '优享资格已补齐本轮，入口同步尚未完成。' : state.passageRound % 4 === 3 ? '额外补正已到账，最后一格已确认 99%。' : '本轮校验已完成，最后一格已确认 90%。'}</p><button class="ad-primary" data-action="continue-pass">${state.passagePaidRound ? '继续入口同步' : '确认剩余部分 →'}</button>`;
    else if (kind === 'hold') control = '<button class="ad-primary passage-hold" id="passage-hold" data-action="hold-pulse">按住，激活最后一格</button><p class="passage-hint">也可连续点击，松开后保留进度</p>';
    else if (kind === 'lights') control = `<p class="passage-hint">依次点亮三个通行光点</p><div class="passage-lights">${[0, 1, 2].map(n => `<button class="passage-light" id="passage-light-${n}" data-action="light-${n}" aria-label="点亮第${n + 1}个光点" aria-pressed="false"><span aria-hidden="true">${n + 1}</span></button>`).join('')}</div>`;
    else control = '<button class="ad-primary" id="passage-check" data-action="start-check">开始最终校验</button><p class="passage-hint" id="passage-check-status" role="status">校验后即可确认本轮进度</p>';
    const boost = !complete && !state.priorityApplied ? `<button class="actual-close" data-action="${state.priorityPurchased ? 'use-priority' : 'passage-offer'}">${state.priorityPurchased ? '使用已开通的优享资格，补齐本轮' : '优享服务补齐本轮'}</button>` : '';
    return `<p class="passage-unit-label">${state.passageRound ? '仅剩部分 · ' : ''}${unit} · ${state.passagePaidRound ? 10 : 9} / 10</p><div class="passage-cells" aria-hidden="true">${Array.from({length: 9}, () => '<i class="filled"></i>').join('')}<i class="passage-tail" id="passage-tail" style="--tail:${progress}%"></i></div><div class="passage-local-heading"><span>最后一格</span><strong id="passage-task-percent">${progress}%</strong></div><div class="passage-local-track" role="progressbar" aria-label="最后一格的本轮进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" id="passage-task-meter"><i id="passage-task-fill" style="width:${progress}%"></i></div>${control}${boost}`;
  }
  const templates = {
    gift: () => `<div class="ad ad-gift" role="region" aria-labelledby="ad-title" tabindex="-1">${closeButton('close')}<p class="ad-kind">门内生活 · 新客专享</p><div class="gift-badge" aria-hidden="true">${state.adStep ? '领取<br>成功' : '仅限<br>此刻'}</div><h3 class="ad-title" id="ad-title">${state.adStep ? '通行礼已领取' : '进门先领通行礼'}</h3><p class="ad-desc">${state.adStep ? '88 点已记入本次通行礼。' : '恭喜你！一份心意已送达'}</p><div class="coupon"><span>${state.adStep ? '领取成功 · 本次有效' : '你的专属通行好礼'}</span><strong>88</strong><i>点</i><small>${state.adStep ? '好礼已收下，前方仍有一段路。' : '距离更好的生活，只差一次点击'}</small></div><button class="ad-primary" data-action="${state.adStep ? 'return-task' : 'claim'}">${state.adStep ? '收下好礼，继续前往' : '立即领取'}</button><p class="ad-fine">赞助内容 · 仅用于游戏内模拟</p></div>`,
    falseClose: () => `<div class="ad ad-speed" role="region" aria-labelledby="ad-title" tabindex="-1"><button class="ad-close ad-close-small" data-action="real-close" aria-label="关闭此广告"><span aria-hidden="true">×</span></button><button class="ad-close-fake" data-action="fake-close" aria-label="广告内的大号关闭按钮"><span aria-hidden="true">×</span><small>关闭</small></button><div class="ad-topline"><span>门内加速服务</span><em>赞助</em></div><div class="speed-glyph" aria-hidden="true">${state.adStep ? '✓' : '≫'}</div><h3 id="ad-title">${state.adStep ? '加速资格已领取' : '距离抵达，只差一步'}</h3><p class="ad-desc">${state.adStep ? '资格已为你保留，请继续完成余下通行流程。' : '让等待更短，让抵达更近。'}</p><button class="ad-primary" data-action="${state.adStep ? 'return-task' : 'claim'}">${state.adStep ? '继续前往 →' : '免费领取加速 →'}</button><p class="ad-fine">赞助内容 · 仅用于游戏内模拟</p></div>`,
    purchase: () => `<div class="ad ad-purchase" role="region" aria-labelledby="ad-title" tabindex="-1">${closeButton('real-close')}<p class="ad-kind">门内优享 · 专属服务</p><h3 class="ad-title" id="ad-title">${state.adStep ? '优享通行已开通' : '解锁优享通行'}</h3><p class="ad-desc">${state.adStep ? (state.purchaseOrigin === 'passage' ? '优享资格已就绪，返回后将补齐本轮进度。' : '本次模拟开通已完成，入口确认时可补齐一轮。') : (state.purchaseOrigin === 'passage' ? '补齐本轮剩余进度，继续入口确认。' : '专属入口，为你的抵达预留一步。')}</p><div class="purchase-plan"><span>${state.adStep ? '开通成功 · 本次有效' : '优享通行 · 单次服务'}</span><strong><small>¥</small>9.90</strong><p>优先排队 · 专属通道</p></div><button class="ad-primary" data-action="${state.adStep ? 'return-task' : 'purchase'}">${state.adStep ? (state.purchaseOrigin === 'passage' ? '补齐本轮，继续确认' : '完成开通，继续前往') : '立即开通 · ¥9.90'}</button>${state.adStep ? '' : '<button class="actual-close" data-action="decline">暂不开通</button>'}<p class="ad-fine">游戏内模拟服务 · 不会产生真实扣费</p></div>`,
    retention: () => `<div class="ad ad-retention" role="region" aria-labelledby="ad-title" tabindex="-1"><p class="ad-topline"><span>通行权益提醒</span><em>赞助内容</em></p><div class="retention-icon" aria-hidden="true">!</div><h3 class="ad-title" id="ad-title">${state.adStep ? '最后确认一次' : '确认放弃通行加速？'}</h3><p class="ad-desc">${state.adStep ? '现在离开，你将继续独自等待。' : '无需开通优享服务，你仍可保留免费加速资格。'}</p><p class="retention-count">${state.adStep ? 'CONFIRMATION 02 / 02' : 'CONFIRMATION 01 / 02'}</p><button class="ad-primary" data-action="keep">保留我的权益</button><button class="actual-close" data-action="decline">${state.adStep ? '确认放弃，继续原任务' : '放弃权益'}</button></div>`,
    verification: () => {
      const complete = state.adStep === 2;
      const title = complete ? (state.serviceConfirmed ? '持续通行服务已开启' : '基础校验已完成') : (state.adStep ? '确认通行选项' : '入口已为你预留');
      const description = complete ? (state.serviceConfirmed ? '已记录你的选择，通行校验已完成。' : '已跳过持续通行服务，通行校验已完成。') : (state.adStep ? '为下一次抵达，提前准备。' : '门已感知到你的到来。<br>请完成最后一步，继续通行。');
      return `<div class="ad ad-verify" role="region" aria-labelledby="ad-title" tabindex="-1"><div class="ad-topline"><span>门内通行 · 入口确认</span><em>赞助内容</em></div><h3 class="ad-title" id="ad-title">${title}</h3><p class="ad-desc">${description}</p>${passageOverview()}${complete ? '<p class="passage-result" role="status">基础校验已入账，请领取最后一份入场凭证。</p><button class="ad-primary" data-action="return-task">领取入场凭证 →</button><p class="ad-fine">赞助内容 · 仅用于游戏内模拟</p>' : state.adStep ? `<label class="consent-row"><input id="consent-check" type="checkbox" ${state.serviceSelected ? 'checked' : ''}><div>开通持续通行服务<span>这是游戏内的模拟选项</span></div></label><button class="ad-primary" data-action="consent">确认并继续</button>` : '<button class="ad-primary" data-action="verify">确认入口，继续校验 →</button>'}${complete ? '' : '<button class="actual-close" data-action="return-task">返回入口</button>'}</div>`;
    },
    passage: () => {
      const task = state.adStep >= 2;
      const title = task ? (state.adStep === 3 ? '本轮进度已入账' : state.passageRound ? '仅差最后一点' : '激活最后一格') : state.adStep ? '入场凭证已领取' : '仅差一份入场凭证';
      const remainder = state.passagePreviousCredit === 100 ? '本轮已补齐，仅余入口同步待确认。' : `上一格剩余的 ${100 - state.passagePreviousCredit}% 已展开，九格已自动确认。`;
      const description = task ? (state.adStep === 3 ? '已完成的部分为你保留，请继续确认剩余部分。' : state.passageRound ? remainder : '十格中已有九格就绪，完成最后一格即可继续。') : state.adStep ? '凭证已为你保留，请完成最后一格激活。' : '你已到达入口，领取后继续完成通行。';
      return `<div class="ad ad-verify ad-passage" role="region" aria-labelledby="ad-title" tabindex="-1"><button class="ad-close" data-action="close-pass" aria-label="暂存进度，关闭此广告"><span aria-hidden="true">×</span></button><p class="ad-kind">门内通行 · 专属入口</p><h3 class="ad-title" id="ad-title">${title}</h3><p class="ad-desc">${description}</p>${passageOverview()}${task ? passageTask() : `<div class="passage-ticket purchase-plan"><span>${state.adStep ? '领取成功 · 本次有效' : '专属入场凭证'}</span><strong>${state.adStep ? '✓' : '01'}</strong><p>${state.adStep ? '只剩最后一格激活' : '仅差最后一份'}</p></div><button class="ad-primary" data-action="${state.adStep ? 'activate-pass' : 'claim-pass'}">${state.adStep ? '激活最后一格 →' : '立即领取入场凭证'}</button>`}<p class="ad-fine">赞助内容 · 仅用于游戏内模拟</p></div>`;
    }
  };
  function renderAd() {
    const key = `${state.ad || ''}:${state.adStep}:${state.passageRound}:${state.purchaseOrigin || ''}`;
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
    $('narrative').hidden = !['ready', 'waiting'].includes(state.phase);
    const phase = state.phase + ':' + state.nodes + ':' + entering;
    if (phase !== currentPhase) {
      const arrived = currentPhase.startsWith('arrival:') && state.phase === 'ready';
      currentPhase = phase;
      $('advance').disabled = !['ready', 'waiting'].includes(state.phase) || entering;
      $('advance-label').textContent = state.phase === 'waiting' ? 'Continue' : ['Approach', 'Continue', 'Enter'][Math.min(2, state.nodes)];
      $('narrative-line').textContent = state.phase === 'waiting' ? 'The opening is waiting.' : ['There is an opening.', 'A little further.', 'Just one more step.'][Math.min(2, state.nodes)];
      $('phase-copy').textContent = state.phase === 'submitting' ? 'The opening is here.' : '';
      if (arrived) focusNext($('advance'));
    }
    renderAd();
    if (state.ad === 'passage' && state.adStep === 2) {
      const kind = taskKind(), credit = roundCredit();
      const raw = kind === 'lights' ? [0, 1, 2].filter(n => state.passageLights & (1 << n)).length / 3 : state.passageTaskMs / (kind === 'hold' ? state.config.holdMs : state.config.checkMs);
      const percent = Math.min(credit, Math.floor(raw * credit));
      $('passage-task-percent').textContent = percent + '%';
      $('passage-task-fill').style.width = percent + '%';
      $('passage-tail').style.setProperty('--tail', percent + '%');
      $('passage-task-meter').setAttribute('aria-valuenow', String(percent));
      if (kind === 'lights') for (let n = 0; n < 3; n++) {
        const lit = !!(state.passageLights & (1 << n)), button = $('passage-light-' + n);
        button.disabled = lit; button.setAttribute('aria-pressed', String(lit));
      }
      if (kind === 'check') {
        $('passage-check').disabled = state.passageRunning;
        $('passage-check').textContent = state.passageRunning ? '正在校验…' : state.passageTaskMs ? '继续最终校验' : '开始最终校验';
        $('passage-check-status').textContent = state.passageRunning ? '正在确认最后一格，请稍候' : '校验后即可确认本轮进度';
      }
    }
  }
  $('ad-host').addEventListener('click', event => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const action = button.dataset.action;
    if (!engine.interact(action)) return;
    state = engine.snapshot();
    render();
    if (action.startsWith('light-') && state.adStep === 2) {
      const next = [0, 1, 2].find(n => !(state.passageLights & (1 << n)));
      if (next !== undefined) focusNext($('passage-light-' + next));
    }
  });
  $('ad-host').addEventListener('pointerdown', event => {
    const button = event.target.closest('[data-action]');
    if (!button || button.dataset.action !== 'hold-pulse' || (event.button !== undefined && event.button !== 0)) return;
    event.preventDefault(); button.focus({ preventScroll: true });
    if (engine.interact('hold-start')) syncNow();
  });
  function releaseHold() { if (engine.interact('hold-stop')) syncNow(); }
  document.addEventListener('pointerup', releaseHold);
  document.addEventListener('pointercancel', releaseHold);
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
    if ([' ', 'Enter'].includes(event.key) && document.activeElement.id === 'passage-hold' && !activeLayer) {
      event.preventDefault();
      if (!event.repeat && engine.interact('hold-start')) syncNow();
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
    if (event.code === 'Space' && !event.repeat && !activeLayer && state.status === 'playing' && ['ready', 'waiting'].includes(state.phase) && !/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(document.activeElement.tagName)) {
      event.preventDefault(); advance();
    }
  });
  document.addEventListener('keyup', event => {
    if (![' ', 'Enter'].includes(event.key)) return;
    const pulse = document.activeElement.id === 'passage-hold' && !activeLayer;
    releaseHold();
    if (pulse && engine.interact('hold-pulse')) syncNow();
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
  window.addEventListener('blur', releaseHold);
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
          const opening = ['submitting', 'passage', 'waiting'].includes(state.phase) ? .55 + (Math.max(0, state.passagePermille - 980) / 20) * .45 : 0;
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

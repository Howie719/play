(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ThresholdScene = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const mix = (a, b, t) => a + (b - a) * t;
  function rng(seed) { return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; }; }
  function geometry(width, height) {
    const w = width / height * 1000;
    return { w, h: 1000, x: w * (w > 1150 ? .665 : .52), sx: Math.max(.54, Math.min(1, w / 1300)), scale: height / 1000 };
  }
  function slot(g, index) {
    const side = index % 2 ? 1 : -1;
    const row = Math.floor(index / 2) % 4;
    const col = Math.floor(index / 8) % 3;
    const d = (205 + col * 157) * g.sx;
    const w = (64 + col * 17) * g.sx;
    return { x: g.x + side * d - w / 2, y: 260 + row * 100 - col * 29, w, h: 72 + col * 9 };
  }
  function createRenderer({ createCanvas } = {}) {
    let texture;
    if (createCanvas) {
      texture = createCanvas(180, 240); texture.width = 180; texture.height = 240;
      const t = texture.getContext('2d'), r = rng(731);
      t.fillStyle = '#83938c'; t.fillRect(0, 0, 180, 240);
      for (let i = 0; i < 2400; i++) {
        const v = Math.floor(70 + r() * 130);
        t.fillStyle = `rgba(${v},${v},${v},${r() * .19})`;
        t.fillRect(r() * 180, r() * 240, .3 + r() * 2, 1 + r() * 5);
      }
      for (let i = 0; i < 90; i++) {
        t.fillStyle = 'rgba(11,24,20,.08)'; t.fillRect(r() * 180, r() * 240, .3 + r() * .8, 4 + r() * 50);
      }
    }
    function drawArchitecture(ctx, options) {
      const { width, height, time = 0, travel = 0, stones = 0, ended = false, receiving = false, motion = true, pointerX = 0 } = options;
      const g = geometry(width, height), { w, h, x, sx } = g;
      const t = motion ? time / 1000 : 0;
      const light = ended ? .065 : .93 + (motion ? Math.sin(t * .31) * .035 : 0);
      const zoom = 1 + Math.max(0, Math.min(3, travel)) * .048;
      ctx.save(); ctx.clearRect(0, 0, width, height); ctx.scale(g.scale, g.scale);
      const poly = (pts, fill, stroke, lw = 1) => {
        ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
      };
      const rect = (a, b, c, d, fill) => { ctx.fillStyle = fill; ctx.fillRect(a, b, c, d); };
      const line = (a, b, c, d, color, lw = 1) => {
        ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
      };
      const label = (text, a, b, size = 8, color = '#68786b', align = 'left') => {
        ctx.fillStyle = color; ctx.font = `${size}px monospace`; ctx.textAlign = align; ctx.fillText(text, a, b);
      };
      const grad = ctx.createLinearGradient(0, 0, 0, 1000);
      grad.addColorStop(0, '#081511'); grad.addColorStop(.45, '#123b32'); grad.addColorStop(1, '#071610');
      rect(0, 0, w, h, grad);
      ctx.translate(x + pointerX * 4, 560); ctx.scale(zoom, zoom); ctx.translate(-x, -560);
      // A monumental chamber assembled from shallow, paper-like planes.
      const wall = ctx.createLinearGradient(x - 600, 0, x + 600, 0);
      wall.addColorStop(0, '#0c211b'); wall.addColorStop(.5, '#254d41'); wall.addColorStop(1, '#0b221b');
      rect(x - 700 * sx, -200, 1400 * sx, 920, wall);
      for (let j = 0; j < 11; j++) line(x - 700 * sx, j * 75, x + 700 * sx, j * 75, 'rgba(1,9,5,.38)', 2);
      for (let j = -7; j <= 7; j++) line(x + j * 94 * sx, 0, x + j * 94 * sx, 735, 'rgba(3,14,8,.34)', 1.2);
      // Control-room grids: the system is running before anyone arrives.
      const r = rng(78);
      for (const side of [-1, 1]) for (let col = 0; col < 9; col++) for (let row = 0; row < 6; row++) {
        const px = x + side * (225 + col * 48) * sx, py = 210 + row * 57 + col * 6;
        rect(px - 16 * sx, py, 32 * sx, 39, '#081c15');
        rect(px - 14 * sx, py + 2, 28 * sx, 34, `rgba(80,126,99,${.08 + r() * .13})`);
        for (let k = 0; k < 4; k++) line(px - 10 * sx, py + 8 + k * 5, px + (r() * 16 - 6) * sx, py + 8 + k * 5, 'rgba(130,158,124,.2)', .6);
        rect(px + 6 * sx, py + 32, 2, 2, r() > .8 ? '#b19e5c' : '#365f46');
      }
      // Turrell-like light field, contained inside an engineered frame.
      const aura = ctx.createRadialGradient(x, 400, 0, x, 400, 500);
      aura.addColorStop(0, `rgba(146,214,174,${.22 * light})`); aura.addColorStop(.5, `rgba(81,153,121,${.1 * light})`); aura.addColorStop(1, 'rgba(31,74,55,0)');
      rect(x - 550, -100, 1100, 1100, aura);
      // The back portal and its successive thick stone reveals.
      const stone = ctx.createLinearGradient(x - 200 * sx, 100, x + 230 * sx, 700);
      stone.addColorStop(0, '#53705a'); stone.addColorStop(.32, '#2a4938'); stone.addColorStop(1, '#152c20');
      const aperture = ctx.createLinearGradient(x - 70 * sx, 0, x + 70 * sx, 0);
      aperture.addColorStop(0, '#164336'); aperture.addColorStop(.45, ended ? '#14271c' : '#90cbb8'); aperture.addColorStop(.5, ended ? '#193624' : '#dceadd'); aperture.addColorStop(.57, ended ? '#10281c' : '#9dd3be'); aperture.addColorStop(1, '#245341');
      rect(x - 165 * sx, 132, 330 * sx, 568, '#06150d');
      rect(x - 151 * sx, 142, 302 * sx, 551, stone);
      poly([[x - 151 * sx, 142], [x - 115 * sx, 178], [x - 115 * sx, 690], [x - 151 * sx, 693]], '#5a735b');
      poly([[x + 151 * sx, 142], [x + 115 * sx, 178], [x + 115 * sx, 690], [x + 151 * sx, 693]], '#102d1c');
      rect(x - 113 * sx, 179, 226 * sx, 509, '#071b12');
      rect(x - 95 * sx, 199, 190 * sx, 489, '#2c503d');
      rect(x - 79 * sx, 217, 158 * sx, 468, aperture);
      // Glass specimen box: the message is visible but held behind a surface.
      ctx.save(); ctx.globalAlpha = ended ? .06 : .2;
      poly([[x - 91 * sx, 206], [x - 67 * sx, 224], [x - 67 * sx, 689], [x - 91 * sx, 709]], '#86c8af', '#9ec5aa', 1);
      poly([[x + 91 * sx, 206], [x + 67 * sx, 224], [x + 67 * sx, 689], [x + 91 * sx, 709]], '#75bda8', '#9ec5aa', 1);
      rect(x - 67 * sx, 224, 134 * sx, 465, '#7baf95');
      line(x - 91 * sx, 206, x + 91 * sx, 206, '#e3e4c0', 1); ctx.restore();
      const gap = ended ? 1.3 : (receiving ? 40 : 16) + Math.min(3, travel) * 4;
      rect(x - gap * sx / 2, 236, gap * sx, 450, ended ? '#2d4731' : '#dce9c5');
      ctx.save(); ctx.globalAlpha = .18 * light;
      const stripGlow = ctx.createLinearGradient(x - 90 * sx, 0, x + 90 * sx, 0);
      stripGlow.addColorStop(0, 'rgba(193,232,193,0)'); stripGlow.addColorStop(.5, '#d8efcc'); stripGlow.addColorStop(1, 'rgba(193,232,193,0)');
      rect(x - 90 * sx, 238, 180 * sx, 470, stripGlow); ctx.restore();
      // An instrument circle, kept as a spatial measuring device rather than a logo.
      ctx.save(); ctx.strokeStyle = 'rgba(181,167,109,.35)'; ctx.lineWidth = .85;
      ctx.beginPath(); ctx.ellipse(x, 330, 187 * sx, 187, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, 330, 202 * sx, 202, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 64; i++) {
        const a = i / 64 * Math.PI * 2 + (motion ? t * .002 : 0), l = i % 8 === 0 ? 12 : 4;
        line(x + Math.cos(a) * 192 * sx, 330 + Math.sin(a) * 192, x + Math.cos(a) * (192 + l) * sx, 330 + Math.sin(a) * (192 + l), 'rgba(187,169,107,.36)', .7);
      }
      ctx.restore();
      label('A R C H I V E   0 7', x, 110, 9, '#849274', 'center');
      // Ceiling coffers and receding monumental columns.
      const depths = [1, .72, .51, .355, .245, .17];
      for (let j = depths.length - 1; j >= 0; j--) {
        const d = depths[j], bottom = 608 + 520 * d, top = 608 - 1740 * d;
        const left = x - 820 * d * sx, right = x + 820 * d * sx, wid = (95 * d + 14) * sx;
        poly([[left, top], [right, top], [right - 24 * sx * d, top + 40 * d], [left + 24 * sx * d, top + 40 * d]], '#263b2b', 'rgba(135,155,112,.12)');
        for (const side of [-1, 1]) {
          const center = x + side * 820 * d * sx, a = center - wid / 2, b = center + wid / 2;
          const front = ctx.createLinearGradient(a, 0, b, 0);
          front.addColorStop(0, side < 0 ? '#1b3023' : '#304831'); front.addColorStop(.3, side < 0 ? '#3b5137' : '#263d29'); front.addColorStop(1, '#0b1c11');
          rect(a, top, wid, bottom - top, front);
          poly([[side < 0 ? b : a, top], [side < 0 ? b + 31 * d * sx : a - 31 * d * sx, top + 28 * d], [side < 0 ? b + 31 * d * sx : a - 31 * d * sx, bottom - 20 * d], [side < 0 ? b : a, bottom]], side < 0 ? '#122b1c' : '#1d3a25');
          line(side < 0 ? b : a, top, side < 0 ? b : a, bottom, 'rgba(137,163,117,.25)', 1.3);
          for (let k = 0; k < 3; k++) line(a + wid * (.18 + k * .25), top, a + wid * (.18 + k * .25), bottom, 'rgba(3,14,7,.3)', .6);
          for (let yy = Math.max(0, top + 92); yy < bottom; yy += 130 * Math.max(.35, d)) line(a, yy, b, yy, 'rgba(4,18,9,.33)', 1);
          if (texture) { ctx.save(); ctx.globalAlpha = .14; ctx.fillStyle = ctx.createPattern(texture, 'repeat'); ctx.fillRect(a, top, wid, bottom - top); ctx.restore(); }
          rect(a - 7 * d * sx, bottom - 15 * d, wid + 14 * d * sx, 18 * d, '#172c1c');
          line(a - 7 * d * sx, bottom - 15 * d, b + 7 * d * sx, bottom - 15 * d, 'rgba(106,134,92,.24)', 1);
        }
      }
      // Reflecting floor: broad heavy slabs, not a neon grid.
      const floor = ctx.createLinearGradient(0, 668, 0, 1000);
      floor.addColorStop(0, '#173327'); floor.addColorStop(.35, '#152a1e'); floor.addColorStop(1, '#0b1810');
      poly([[x - 170 * sx, 681], [x + 170 * sx, 681], [w + 500, 1200], [-500, 1200]], floor);
      for (let i = -10; i <= 10; i++) line(x + i * 22 * sx, 680, x + i * 260 * sx, 1150, 'rgba(117,138,97,.14)', 1.2);
      for (const yy of [701, 730, 770, 831, 929, 1080]) line(-100, yy, w + 100, yy, 'rgba(106,130,90,.18)', 1.2);
      const reflection = ctx.createLinearGradient(0, 682, 0, 1090);
      reflection.addColorStop(0, `rgba(198,225,168,${.29 * light})`); reflection.addColorStop(.5, `rgba(142,175,124,${.07 * light})`); reflection.addColorStop(1, 'rgba(119,148,107,0)');
      poly([[x - 24 * sx, 682], [x + 24 * sx, 682], [x + 250 * sx, 1100], [x - 270 * sx, 1100]], reflection);
      const fr = rng(112);
      for (let i = 0; i < 100; i++) {
        const yy = 690 + fr() * 310, spread = (yy - 670) * .8 * sx;
        line(x - spread * fr(), yy, x + spread * fr(), yy, `rgba(158,192,140,${.025 * light})`, 1 + fr() * 2);
      }
      // Three shallow thresholds in the same chamber.
      for (let i = 0; i < 3; i++) {
        const yy = 936 - i * 87, span = (270 - i * 64) * sx;
        line(x - span, yy, x + span, yy, 'rgba(182,160,103,.36)', 1.2);
        label(['I', 'II', 'III'][i], x - span - 14, yy + 4, 9, '#918863', 'right');
      }
      // Sponsor fragments occupy the architecture after each interaction.
      const maxSlots = 24;
      for (let i = 0; i < Math.min(stones, maxSlots); i++) {
        const p = slot(g, i), value = i % 4;
        const glow = ctx.createRadialGradient(p.x + p.w / 2, p.y + p.h / 2, 0, p.x + p.w / 2, p.y + p.h / 2, p.w * 1.8);
        glow.addColorStop(0, 'rgba(180,124,51,.17)'); glow.addColorStop(1, 'rgba(132,88,32,0)');
        rect(p.x - p.w, p.y - p.w, p.w * 3, p.h + p.w * 2, glow);
        rect(p.x - 4, p.y - 4, p.w + 8, p.h + 8, '#08160e');
        const tile = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
        tile.addColorStop(0, '#6b6542'); tile.addColorStop(1, '#313b24');
        rect(p.x, p.y, p.w, p.h, tile);
        line(p.x + 3, p.y + 3, p.x + p.w - 3, p.y + 3, '#a99b5a', .7);
        label('SPONSORED', p.x + 6, p.y + 13, 4.6, '#d4bd79');
        label(['+ 88', 'CONTINUE', 'CONFIRMED', 'THANK YOU'][value], p.x + p.w / 2, p.y + p.h * .53, Math.max(5, 9 * sx), '#e0d39b', 'center');
        for (let k = 0; k < 3; k++) line(p.x + 6, p.y + p.h - 17 + k * 4, p.x + p.w - 6 - (k % 2) * 8, p.y + p.h - 17 + k * 4, 'rgba(204,187,127,.32)', .6);
      }
      // A small warm body in a cold display system.
      const actorY = 760, actorX = x + 4 * sx;
      ctx.save(); ctx.globalAlpha = .42;
      poly([[actorX - 5, actorY], [actorX + 7, actorY], [actorX + 27, 838], [actorX - 17, 838]], '#020904'); ctx.restore();
      ctx.fillStyle = '#070e08'; ctx.beginPath(); ctx.ellipse(actorX, actorY - 39, 4.2, 5.4, -.16, 0, Math.PI * 2); ctx.fill();
      poly([[actorX - 4, actorY - 34], [actorX + 3, actorY - 34], [actorX + 7, actorY - 19], [actorX + 4, actorY - 14], [actorX - 5, actorY - 15], [actorX - 6, actorY - 25]], '#0a120a');
      line(actorX - 3, actorY - 15, actorX - 4, actorY, '#071108', 2.8);
      line(actorX + 2, actorY - 15, actorX + 4, actorY, '#071108', 2.8);
      line(actorX + 3, actorY - 31, actorX + 11, actorY - 23, '#131b0e', 2.2);
      rect(actorX + 8, actorY - 25, 6, 4, '#c8b17b');
      const breathe = ended ? .25 : .65 + Math.sin(t * 1.25) * .1;
      const warmth = ctx.createRadialGradient(actorX + 4, actorY - 25, 0, actorX + 4, actorY - 25, 18);
      warmth.addColorStop(0, `rgba(230,168,95,${breathe * .24})`); warmth.addColorStop(1, 'rgba(230,168,95,0)');
      rect(actorX - 16, actorY - 45, 40, 40, warmth);
      line(actorX + 2, actorY - 42, actorX + 6, actorY - 20, `rgba(199,197,132,${.5 * light})`, .8);
      // Foreground empty consoles establish a measurable human scale.
      for (const side of [-1, 1]) {
        const cx = x + side * 760 * sx;
        poly([[cx - 160 * sx, 830], [cx + 135 * sx, 830], [cx + 100 * sx, 1000], [cx - 205 * sx, 1000]], '#12291c', '#3a4a2e');
        poly([[cx - 160 * sx, 830], [cx + 135 * sx, 830], [cx + 103 * sx, 874], [cx - 174 * sx, 874]], '#3e5138');
        for (let i = 0; i < 8; i++) {
          rect(cx - 130 * sx + i * 29 * sx, 842, 16 * sx, 13, '#081b10');
          rect(cx - 126 * sx + i * 29 * sx, 845, 8 * sx, 3, '#7e9060');
        }
      }
      // Falling dust is slower than the interface that interrupts it.
      const dust = rng(51);
      for (let i = 0; i < 90; i++) {
        const dx = dust() * w, dy = (dust() * 1000 + t * (1 + dust() * 2)) % 1000, a = dust() * .13;
        ctx.fillStyle = `rgba(231,225,169,${a})`; ctx.beginPath(); ctx.arc(dx + Math.sin(t * .1 + i) * 3, dy, .3 + dust() * .8, 0, Math.PI * 2); ctx.fill();
      }
      if (ended) label('THANK YOU FOR YOUR PARTICIPATION', x, 809, 7, '#a89e68', 'center');
      // Atmospheric haze softens depth; it does not hide the structure.
      const mist = ctx.createLinearGradient(0, 500, 0, 890);
      mist.addColorStop(0, 'rgba(87,128,97,0)'); mist.addColorStop(.5, `rgba(86,126,91,${ended ? .025 : .085})`); mist.addColorStop(1, 'rgba(17,38,22,0)');
      rect(-100, 500, w + 200, 390, mist);
      ctx.restore();
    }
    // Architecture is rebuilt only when its content changes. Frames animate a
    // cached image, a few dust motes, and the camera instead of all 108 gauges.
    let background, backgroundKey = '';
    function draw(ctx, options) {
      if (!createCanvas) { drawArchitecture(ctx, options); return; }
      const { width, height, travel = 0, stones = 0, ended = false, receiving = false, time = 0, motion = true, pointerX = 0 } = options;
      const pixelRatio = Math.max(1, ctx.getTransform().a || 1);
      const key = `${width}:${height}:${pixelRatio}:${Math.min(stones, 24)}:${ended}:${receiving}`;
      if (!background || key !== backgroundKey) {
        background = createCanvas(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
        background.width = Math.round(width * pixelRatio); background.height = Math.round(height * pixelRatio);
        const bg = background.getContext('2d'); bg.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        drawArchitecture(bg, { width, height, travel: 0, stones, ended, receiving, time: 0, motion: false });
        backgroundKey = key;
      }
      const g = geometry(width, height), zoom = 1 + Math.max(0, Math.min(3, travel)) * .048;
      ctx.save(); ctx.clearRect(0, 0, width, height);
      ctx.translate(g.x * g.scale + (motion ? pointerX * 4 * g.scale : 0), 560 * g.scale);
      ctx.scale(zoom, zoom); ctx.translate(-g.x * g.scale, -560 * g.scale);
      ctx.drawImage(background, 0, 0, background.width, background.height, 0, 0, width, height);
      if (motion && !ended) {
        const ax = (g.x + 4 * g.sx) * g.scale, ay = 735 * g.scale, radius = 18 * g.scale;
        const breath = ctx.createRadialGradient(ax, ay, 0, ax, ay, radius);
        breath.addColorStop(0, `rgba(231,171,95,${.025 + Math.sin(time / 800) * .012})`);
        breath.addColorStop(1, 'rgba(231,171,95,0)');
        ctx.fillStyle = breath; ctx.fillRect(ax - radius, ay - radius, radius * 2, radius * 2);
      }
      if (motion) {
        const dust = rng(129), t = time / 1000;
        for (let i = 0; i < 38; i++) {
          const px = dust() * width, py = (dust() * height + t * (.5 + dust())) % height;
          ctx.fillStyle = `rgba(233,229,189,${.025 + dust() * .1})`;
          ctx.beginPath(); ctx.arc(px, py, .25 + dust() * .5, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }
    function getSlot(width, height, index, travel = 0) {
      const g = geometry(width, height), p = slot(g, index % 24), z = 1 + Math.min(3, travel) * .048;
      return { x: (g.x + (p.x + p.w / 2 - g.x) * z) * g.scale, y: (560 + (p.y + p.h / 2 - 560) * z) * g.scale,
        w: p.w * g.scale * z, h: p.h * g.scale * z };
    }
    return { draw, getSlot };
  }
  return { createRenderer, geometry };
});

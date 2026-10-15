(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ThresholdScene = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function createRenderer({ createCanvas }) {
    let backdrop, backdropKey = '';
    function path(ctx, points, fill, stroke, lineWidth = 1) {
      ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
    }
    function line(ctx, a, b, alpha, weight = .7) {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = weight; ctx.stroke();
    }
    function draw(ctx, options) {
      const { width: w, height: h, travel = 0, time = 0, ended = false, aperture = 0, closing = 0, entrance = 1, screen = 'playing', reducedMotion = false, pointerX = 0 } = options;
      const key = `${w}:${h}`;
      if (key !== backdropKey) {
        backdropKey = key; backdrop = createCanvas(Math.ceil(w), Math.ceil(h));
        const b = backdrop.getContext('2d');
        const g = b.createRadialGradient(w * .5, h * .43, 0, w * .5, h * .43, Math.max(w, h) * .64);
        g.addColorStop(0, '#171717'); g.addColorStop(.44, '#090909'); g.addColorStop(1, '#020202');
        b.fillStyle = g; b.fillRect(0, 0, w, h);
      }
      ctx.drawImage(backdrop, 0, 0, w, h);
      const entry = screen === 'title' ? 0 : clamp(entrance, 0, 1);
      const reveal = entry * entry * (3 - 2 * entry);
      const curtain = clamp((reveal - .18) / .82, 0, 1);
      const t = reducedMotion ? 0 : time * .001;
      const camera = reveal * .75 + clamp(travel, 0, 3) * 2.25;
      const breath = reducedMotion ? 0 : Math.sin(t * .24) * .014;
      const cx = w * .5 + (reducedMotion ? 0 : pointerX * Math.min(w * .012, 12));
      const cy = h * (.48 + breath * .18);
      // Keep the side curtains inside a tall, narrow viewport as well.
      const focal = Math.min(h, w * 1.6) * (1.03 + breath);
      const p = (x, y, z) => ({ x: cx + x * focal / (z - camera), y: cy + y * focal / (z - camera) });
      const shut = ended ? (reducedMotion ? 1 : clamp(closing, 0, 1)) : 0;
      const light = 1 - shut * .83;
      const architecture = .25 + reveal * .75;
      ctx.save();
      // Dark architectural planes and a perspective reflection of the aperture.
      path(ctx, [p(-4, 2.8, 1 + camera), p(4, 2.8, 1 + camera), p(4, 2.8, 25), p(-4, 2.8, 25)], '#0c0c0c');
      path(ctx, [p(-4, -10, 1 + camera), p(-4, 2.8, 1 + camera), p(-4, 2.8, 25), p(-4, -10, 25)], '#080808');
      path(ctx, [p(4, -10, 1 + camera), p(4, 2.8, 1 + camera), p(4, 2.8, 25), p(4, -10, 25)], '#050505');
      const spread = (.1 + reveal * .24 + travel * .045 + aperture * .38) * (1 - shut) ** 2;
      const sill = p(0, 2.8, 24);
      const floorLight = ctx.createLinearGradient(0, sill.y, 0, h);
      floorLight.addColorStop(0, `rgba(255,255,255,${.19 * light})`);
      floorLight.addColorStop(1, 'rgba(255,255,255,0)');
      path(ctx, [p(-spread, 2.8, 24), p(spread, 2.8, 24), p(spread * 1.8, 2.8, camera + 2), p(-spread * 1.8, 2.8, camera + 2)], floorLight);
      // Structural ribs move with the viewer rather than sliding in screen space.
      for (let i = 15; i >= 0; i--) {
        const z = 3.5 + i * 1.32;
        if (z - camera < 1.6) continue;
        const a = (.055 + (i / 15) * .15) * architecture * light;
        const q = [p(-4, 2.8, z), p(-4, -10, z), p(4, -10, z), p(4, 2.8, z)];
        ctx.beginPath(); q.forEach((v, k) => k ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y));
        ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = i % 4 === 0 ? 1.3 : .65; ctx.stroke();
        line(ctx, q[0], q[3], a * .5);
        if (i % 3 === 0) {
          line(ctx, p(-3.92, -10, z), p(-3.92, 2.8, z), a * .8);
          line(ctx, p(3.92, -10, z), p(3.92, 2.8, z), a * .8);
        }
      }
      // Two overlapping curtains, with phase offsets. No textures or particle loop.
      if (curtain > 0) {
        for (let side = -1; side <= 1; side += 2) {
          for (let layer = 0; layer < 2; layer++) {
            const z = 15.6 + layer * 2.1;
            const drift = Math.sin(t * (.19 + layer * .035) + side * 1.6) * .22;
            const base = side * (2.55 + layer * .15) + drift;
            const top = -6.5 + side * .8;
            for (let n = 0; n < 40; n++) {
              const u = n / 39;
              const x = base + side * u * 2.05;
              const fold = Math.sin(u * Math.PI) * .34;
              line(ctx, p(x, top + u * 1.4, z + fold), p(x + side * .16, 2.75, z + fold), (.09 + .09 * Math.sin(u * Math.PI)) * light * curtain, .6);
            }
          }
        }
      }
      // Nested reveals replace costly bloom filters and full-screen effects.
      for (let i = 5; i > 0; i--) {
        const pad = i * .12;
        path(ctx, [p(-spread - pad, -7.5 - pad, 24), p(spread + pad, -7.5 - pad, 24), p(spread + pad, 2.8, 24), p(-spread - pad, 2.8, 24)], null, `rgba(255,255,255,${(.025 + (6 - i) * .008) * light})`, .7);
      }
      const door = [p(-spread, -7.5, 24), p(spread, -7.5, 24), p(spread, 2.8, 24), p(-spread, 2.8, 24)];
      if (spread > .001) path(ctx, door, '#f7f7f7');
      if (!ended && reveal > 0) {
        ctx.save(); ctx.globalAlpha = reveal;
        const face = ctx.createLinearGradient(door[0].x, 0, door[1].x, 0);
        face.addColorStop(0, '#979797'); face.addColorStop(.4, '#f9f9f9'); face.addColorStop(1, '#ffffff');
        path(ctx, door, face);
        const edge = -spread + (Math.sin(t * .21) * .5 + .5) * spread * 1.4;
        line(ctx, p(edge, -7.5, 24), p(edge, 2.8, 24), .38, .8);
        ctx.restore();
      }
      for (const x of [-3.2, -2, -.95, .95, 2, 3.2]) line(ctx, p(x, 2.8, 24), p(x, 2.8, camera + 1.2), .075 * architecture * light);
      path(ctx, [{ x: 0, y: 0 }, { x: w * .045, y: 0 }, { x: w * .045, y: h }, { x: 0, y: h }], '#030303');
      path(ctx, [{ x: w * .965, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: w * .965, y: h }], '#030303');
      ctx.restore();
    }
    return { draw };
  }
  return { createRenderer };
});

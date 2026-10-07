/* ==========================================================
   Dino Game — cenários (deserto, floresta, oceano, neve, espaço)
   Cada cenário tem paleta de dia e de noite, camadas de fundo
   com parallax, obstáculos de chão, um inimigo voador e
   partículas de ambiente. Tudo desenhado proceduralmente.
   ========================================================== */
(function () {
  'use strict';
  const DG = (window.DG = window.DG || {});
  const { hash, ellipse, roundRect, rgba, shade } = DG.util;

  // Largura lógica variável: 900 no computador, menor no celular em pé.
  let W = 900;
  const H = 280, GROUND = 244;
  function setWidth(w) { W = Math.round(w); }
  const TAU = Math.PI * 2;

  function fs(ctx, fill, stroke, lw) {
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  const mod = (a, b) => ((a % b) + b) % b;

  /** Desenha uma camada repetida de elementos (parallax). */
  function repeat(ctx, offset, spacing, from, to, fn) {
    const start = Math.floor((offset + from) / spacing) - 1;
    const end = Math.ceil((offset + to) / spacing) + 1;
    for (let i = start; i <= end; i++) fn(i * spacing - offset, i, hash(i * 1.37 + spacing));
  }

  /** Silhueta ondulada (dunas, colinas). */
  function wave(ctx, offset, base, amp, freq, color, seed) {
    ctx.beginPath();
    ctx.moveTo(0, GROUND + 2);
    for (let x = 0; x <= W; x += 10) {
      const X = x + offset;
      const y = base - (Math.sin(X * freq + seed) * amp + Math.sin(X * freq * 2.3 + seed * 2) * amp * 0.45 + amp);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, GROUND + 2);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
  }

  function clouds(ctx, view, color, count, yMin, yMax, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.9 : alpha;
    const span = W + 300;
    for (let i = 0; i < count; i++) {
      const x = mod(hash(i + 3) * span - view.cloud * (0.6 + hash(i + 9) * 0.6), span) - 150;
      const y = yMin + hash(i + 17) * (yMax - yMin);
      const s = 0.7 + hash(i + 23) * 0.7;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, 26 * s, 9 * s, 0, 0, TAU);
      ctx.ellipse(x - 14 * s, y + 2 * s, 14 * s, 7 * s, 0, 0, TAU);
      ctx.ellipse(x + 10 * s, y - 5 * s, 15 * s, 10 * s, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function stars(ctx, view, alpha, count) {
    if (alpha <= 0.01) return;
    ctx.save();
    for (let i = 0; i < (count || 70); i++) {
      const x = mod(hash(i * 3.1) * W - view.cloud * 0.08, W);
      const y = hash(i * 7.7) * (GROUND - 70);
      const tw = 0.55 + 0.45 * Math.sin(view.t * (1 + hash(i) * 2) + i);
      const r = hash(i * 5.3) > 0.85 ? 1.6 : 0.9;
      ctx.globalAlpha = alpha * tw;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, r, r);
    }
    ctx.restore();
  }

  function sunMoon(ctx, view, pal, x, y) {
    const n = view.n;
    if (n < 0.99) {
      ctx.save();
      ctx.globalAlpha = 1 - n;
      const g = ctx.createRadialGradient(x, y, 8, x, y, 70);
      g.addColorStop(0, rgba(pal.sun, 0.55)); g.addColorStop(1, rgba(pal.sun, 0));
      ctx.fillStyle = g; ctx.fillRect(x - 70, y - 70, 140, 140);
      ellipse(ctx, x, y, 24, 24); ctx.fillStyle = pal.sun; ctx.fill();
      ctx.restore();
    }
    if (n > 0.01) {
      ctx.save();
      ctx.globalAlpha = n;
      const mx = x - 40, my = y + 6;
      const g = ctx.createRadialGradient(mx, my, 6, mx, my, 55);
      g.addColorStop(0, 'rgba(255,250,220,0.35)'); g.addColorStop(1, 'rgba(255,250,220,0)');
      ctx.fillStyle = g; ctx.fillRect(mx - 55, my - 55, 110, 110);
      ellipse(ctx, mx, my, 17, 17); ctx.fillStyle = '#f6f1d3'; ctx.fill();
      ctx.globalAlpha = n * 0.25; ctx.fillStyle = '#c9c2a0';
      ellipse(ctx, mx - 5, my - 3, 3.5, 3.5); ctx.fill();
      ellipse(ctx, mx + 5, my + 5, 2.5, 2.5); ctx.fill();
      ellipse(ctx, mx + 2, my - 8, 2, 2); ctx.fill();
      ctx.restore();
    }
  }

  /* ======================================================
     Obstáculos reutilizáveis
     ====================================================== */
  function cactus(ctx, x, y, w, h, pal, seed) {
    const tw = w * 0.42, tx = x + (w - tw) / 2;
    const ol = pal.obsShade;
    // braços
    const armY = y - h * (0.45 + seed * 0.2);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [side, up] of [[-1, 0.25 + seed * 0.1], [1, 0.35 - seed * 0.1]]) {
      const ax = side < 0 ? x + 2 : x + w - 2;
      ctx.strokeStyle = ol; ctx.lineWidth = tw * 0.62 + 3;
      ctx.beginPath(); ctx.moveTo(tx + tw / 2, armY); ctx.lineTo(ax, armY); ctx.lineTo(ax, armY - h * up); ctx.stroke();
      ctx.strokeStyle = pal.obs; ctx.lineWidth = tw * 0.62;
      ctx.beginPath(); ctx.moveTo(tx + tw / 2, armY); ctx.lineTo(ax, armY); ctx.lineTo(ax, armY - h * up); ctx.stroke();
    }
    roundRect(ctx, tx, y - h, tw, h + 2, tw / 2); fs(ctx, pal.obs, ol, 2);
    ctx.strokeStyle = shade(pal.obs, -0.18); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(tx + tw / 2, y - h + 5); ctx.lineTo(tx + tw / 2, y - 2); ctx.stroke();
    if (seed > 0.55) { // florzinha
      ellipse(ctx, tx + tw / 2, y - h + 1, 3.2, 2.6); ctx.fillStyle = pal.obsAccent; ctx.fill();
    }
  }

  function vulture(ctx, x, y, f, pal) {
    const flap = Math.sin(f * TAU);
    ctx.lineJoin = 'round';
    // asa de trás
    ctx.beginPath(); ctx.moveTo(x + 16, y + 10); ctx.lineTo(x + 6, y + 10 - flap * 14); ctx.lineTo(x + 26, y + 9); ctx.closePath(); fs(ctx, shade(pal.flyer, -0.2), shade(pal.flyer, -0.5), 1.5);
    ellipse(ctx, x + 22, y + 12, 15, 6.5); fs(ctx, pal.flyer, shade(pal.flyer, -0.5), 1.6);
    ellipse(ctx, x + 6, y + 9, 5, 4.5); fs(ctx, pal.flyerAccent, shade(pal.flyer, -0.5), 1.4);
    ctx.beginPath(); ctx.moveTo(x + 1.5, y + 8); ctx.lineTo(x - 5, y + 11); ctx.lineTo(x + 2, y + 12); ctx.closePath(); fs(ctx, '#f4a23a', null);
    ellipse(ctx, x + 5, y + 7.5, 1.2, 1.2); ctx.fillStyle = '#1b1b24'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 36, y + 10); ctx.lineTo(x + 44, y + 7); ctx.lineTo(x + 44, y + 15); ctx.closePath(); fs(ctx, pal.flyer, shade(pal.flyer, -0.5), 1.4);
    // asa da frente
    ctx.beginPath(); ctx.moveTo(x + 14, y + 11); ctx.quadraticCurveTo(x + 20, y + 11 - flap * 22, x + 34, y + 11 - flap * 18); ctx.lineTo(x + 28, y + 13); ctx.closePath(); fs(ctx, pal.flyer, shade(pal.flyer, -0.5), 1.6);
  }

  function bird(ctx, x, y, f, pal) {
    const flap = Math.sin(f * TAU);
    const ol = shade(pal.flyer, -0.5);
    ellipse(ctx, x + 20, y + 12, 13, 8); fs(ctx, pal.flyer, ol, 1.6);
    ellipse(ctx, x + 22, y + 15, 8, 4.5); ctx.fillStyle = shade(pal.flyer, 0.5); ctx.fill();
    ellipse(ctx, x + 8, y + 8, 6.5, 6); fs(ctx, pal.flyer, ol, 1.6);
    ctx.beginPath(); ctx.moveTo(x + 2.5, y + 7); ctx.lineTo(x - 4, y + 9); ctx.lineTo(x + 2.5, y + 11); ctx.closePath(); fs(ctx, pal.flyerAccent, null);
    ellipse(ctx, x + 6.5, y + 6.5, 1.3, 1.3); ctx.fillStyle = '#1b1b24'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 32, y + 10); ctx.lineTo(x + 42, y + 5); ctx.lineTo(x + 40, y + 15); ctx.closePath(); fs(ctx, pal.flyer, ol, 1.4);
    ctx.beginPath(); ctx.moveTo(x + 14, y + 10); ctx.quadraticCurveTo(x + 22, y + 8 - flap * 20, x + 32, y + 6 - flap * 16); ctx.quadraticCurveTo(x + 26, y + 12, x + 18, y + 13); ctx.closePath(); fs(ctx, shade(pal.flyer, -0.12), ol, 1.5);
  }

  /* ======================================================
     Cenários
     ====================================================== */
  const THEMES = {};

  /* ---------------- Deserto ---------------- */
  THEMES.desert = {
    label: 'Deserto', desc: 'Dunas, cactos e abutres sob o sol',
    day: {
      skyTop: '#f7b267', skyBottom: '#fde4c3', sun: '#fff1b8',
      far: '#f0bd84', farShade: '#e9a96a', mid: '#e3a05f', midShade: '#cf8748',
      ground: '#efc890', groundTop: '#c98a4b', groundDetail: '#d6a160',
      obs: '#58a05f', obsShade: '#2f6a3b', obsAccent: '#ff6f91',
      flyer: '#7a5a43', flyerAccent: '#f2d0a4', cloud: '#fff6ea', hud: '#6b4426',
    },
    night: {
      skyTop: '#11163a', skyBottom: '#3b2f63', sun: '#fff1b8',
      far: '#3a335f', farShade: '#312b55', mid: '#463b6b', midShade: '#3b315f',
      ground: '#5a4c74', groundTop: '#382d53', groundDetail: '#4a3e66',
      obs: '#3f8a6c', obsShade: '#1f4d3d', obsAccent: '#d08ac7',
      flyer: '#2c2347', flyerAccent: '#b7a0dd', cloud: '#4a4576', hud: '#ece6ff',
    },
    sky(ctx, pal, v) { stars(ctx, v, v.n); sunMoon(ctx, v, pal, W - 140, 62); },
    far(ctx, pal, v) {
      // pirâmides distantes
      repeat(ctx, v.far * 0.5, 520, 0, W, (x, i, r) => {
        if (r < 0.45) return;
        const s = 40 + r * 40, bx = x + r * 200;
        ctx.beginPath(); ctx.moveTo(bx - s, GROUND - 40); ctx.lineTo(bx, GROUND - 40 - s * 0.9); ctx.lineTo(bx + s, GROUND - 40); ctx.closePath();
        ctx.fillStyle = pal.farShade; ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx, GROUND - 40 - s * 0.9); ctx.lineTo(bx + s, GROUND - 40); ctx.lineTo(bx + s * 0.25, GROUND - 40); ctx.closePath();
        ctx.fillStyle = shade(pal.farShade, -0.08); ctx.fill();
      });
      wave(ctx, v.far, GROUND - 30, 12, 0.006, pal.far, 1);
    },
    clouds: { count: 5, y: [30, 110], alpha: 0.75 },
    mid(ctx, pal, v) { wave(ctx, v.mid, GROUND - 6, 10, 0.011, pal.mid, 4); },
    groundDeco(ctx, pal, x, r) {
      if (r < 0.35) { ctx.fillStyle = pal.groundDetail; ctx.fillRect(x, GROUND + 8 + r * 40, 2 + r * 8, 2); }
      else if (r < 0.5) { ellipse(ctx, x, GROUND + 14 + r * 30, 2.5, 1.6); ctx.fillStyle = pal.groundTop; ctx.fill(); }
    },
    obstacles: [
      { id: 'cactusS', w: 18, h: 36, max: 3, draw: cactus },
      { id: 'cactusL', w: 26, h: 52, max: 2, draw: cactus },
      {
        id: 'rock', w: 38, h: 22, max: 1,
        draw(ctx, x, y, w, h, pal) {
          ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.quadraticCurveTo(x + 2, y - h * 0.8, x + w * 0.35, y - h); ctx.quadraticCurveTo(x + w * 0.75, y - h * 1.05, x + w, y + 1); ctx.closePath();
          fs(ctx, '#b98b6a', '#6d4c37', 2);
          ellipse(ctx, x + w * 0.35, y - h * 0.6, 5, 3); ctx.fillStyle = '#d0a382'; ctx.fill();
        },
      },
    ],
    flyer: { w: 44, h: 24, label: 'abutre', draw: vulture },
    ambient(ctx, pal, v) {
      // grãos de areia ao vento
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = pal.groundTop;
      for (let i = 0; i < 18; i++) {
        const x = mod(hash(i) * W - v.t * (120 + hash(i + 1) * 160), W);
        const y = GROUND - 10 - hash(i + 2) * 60 + Math.sin(v.t * 3 + i) * 4;
        ctx.fillRect(x, y, 3, 1);
      }
      ctx.restore();
    },
  };

  /* ---------------- Floresta ---------------- */
  THEMES.forest = {
    label: 'Floresta', desc: 'Árvores, cogumelos e pássaros',
    day: {
      skyTop: '#7cc8f2', skyBottom: '#e2f5ff', sun: '#fff4c2',
      far: '#a7d7a0', farShade: '#8cc58a', mid: '#4f9a5d', midShade: '#3d7f4b',
      ground: '#7a5232', groundTop: '#5bb04f', groundDetail: '#5f3f25',
      obs: '#8b5a2b', obsShade: '#4f3016', obsAccent: '#e84a5f',
      flyer: '#3d6aa8', flyerAccent: '#f4a261', cloud: '#ffffff', hud: '#24452c',
    },
    night: {
      skyTop: '#07141f', skyBottom: '#183544', sun: '#fff4c2',
      far: '#1b3436', farShade: '#162c2e', mid: '#13291f', midShade: '#0e1f17',
      ground: '#3a281b', groundTop: '#24503a', groundDetail: '#2a1c12',
      obs: '#6a4524', obsShade: '#2d1b0b', obsAccent: '#c9445a',
      flyer: '#2a3f66', flyerAccent: '#d08a4c', cloud: '#2a4256', hud: '#d8f3dc',
    },
    sky(ctx, pal, v) { stars(ctx, v, v.n); sunMoon(ctx, v, pal, W - 160, 58); },
    far(ctx, pal, v) {
      wave(ctx, v.far, GROUND - 46, 18, 0.005, pal.farShade, 2);
      wave(ctx, v.far * 1.4, GROUND - 26, 14, 0.008, pal.far, 7);
    },
    clouds: { count: 6, y: [24, 100], alpha: 0.9 },
    mid(ctx, pal, v) {
      repeat(ctx, v.mid, 46, 0, W, (x, i, r) => {
        const h = 40 + r * 50, bx = x + r * 20;
        ctx.fillStyle = shade(pal.midShade, -0.25); ctx.fillRect(bx - 2, GROUND - 14, 4, 14);
        if (r > 0.5) { // pinheiro
          for (let k = 0; k < 3; k++) {
            const ky = GROUND - 10 - k * h * 0.25, kw = (h * 0.3) * (1 - k * 0.22);
            ctx.beginPath(); ctx.moveTo(bx - kw, ky); ctx.lineTo(bx, ky - h * 0.42); ctx.lineTo(bx + kw, ky); ctx.closePath();
            ctx.fillStyle = k % 2 ? pal.mid : pal.midShade; ctx.fill();
          }
        } else { // árvore redonda
          ellipse(ctx, bx, GROUND - 14 - h * 0.35, h * 0.28, h * 0.32); ctx.fillStyle = pal.mid; ctx.fill();
          ellipse(ctx, bx + h * 0.08, GROUND - 12 - h * 0.3, h * 0.18, h * 0.2); ctx.fillStyle = pal.midShade; ctx.fill();
        }
      });
    },
    groundDeco(ctx, pal, x, r) {
      if (r < 0.4) { ellipse(ctx, x, GROUND + 12 + r * 50, 2 + r * 4, 1.5); ctx.fillStyle = pal.groundDetail; ctx.fill(); }
      else if (r < 0.6) { // tufos de grama
        ctx.strokeStyle = pal.groundTop; ctx.lineWidth = 1.6; ctx.beginPath();
        ctx.moveTo(x, GROUND); ctx.lineTo(x - 2, GROUND - 5); ctx.moveTo(x + 2, GROUND); ctx.lineTo(x + 3, GROUND - 6); ctx.stroke();
      } else if (r > 0.94) {
        ellipse(ctx, x, GROUND - 2, 2, 2); ctx.fillStyle = r > 0.97 ? '#ffd166' : '#ff8fab'; ctx.fill();
      }
    },
    obstacles: [
      {
        id: 'stump', w: 26, h: 32, max: 2,
        draw(ctx, x, y, w, h, pal, r) {
          roundRect(ctx, x + 2, y - h, w - 4, h + 2, 3); fs(ctx, pal.obs, pal.obsShade, 2);
          ellipse(ctx, x + w / 2, y - h, (w - 4) / 2, 4.5); fs(ctx, '#e0b07a', pal.obsShade, 1.8);
          ellipse(ctx, x + w / 2, y - h, (w - 4) / 4, 2); ctx.strokeStyle = '#b07d4f'; ctx.lineWidth = 1; ctx.stroke();
          ctx.strokeStyle = shade(pal.obs, -0.25); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(x + 8, y - h + 8); ctx.lineTo(x + 8, y - 4); ctx.moveTo(x + w - 9, y - h + 12); ctx.lineTo(x + w - 9, y - 6); ctx.stroke();
          if (r > 0.5) { ellipse(ctx, x + w - 4, y - 6, 4, 3); fs(ctx, '#7bc96f', '#3d7f4b', 1); }
        },
      },
      {
        id: 'mushroom', w: 22, h: 30, max: 3,
        draw(ctx, x, y, w, h, pal, r) {
          roundRect(ctx, x + w * 0.32, y - h * 0.6, w * 0.36, h * 0.6 + 2, 3); fs(ctx, '#f6ecd9', '#8c7a63', 1.6);
          ctx.beginPath(); ctx.ellipse(x + w / 2, y - h * 0.55, w / 2, h * 0.45, 0, Math.PI, 0); ctx.closePath();
          fs(ctx, r > 0.6 ? '#f4a261' : pal.obsAccent, shade(pal.obsAccent, -0.5), 2);
          ctx.fillStyle = '#ffffff';
          for (const [dx, dy, rr] of [[-0.25, 0.75, 2.6], [0.15, 0.9, 2], [0.28, 0.65, 2.2]]) { ellipse(ctx, x + w / 2 + dx * w, y - h * dy, rr, rr * 0.8); ctx.fill(); }
        },
      },
      {
        id: 'bush', w: 36, h: 40, max: 1,
        draw(ctx, x, y, w, h, pal) {
          const g = '#3f8a46', gd = '#1f4d26';
          ctx.beginPath();
          ctx.arc(x + w * 0.3, y - h * 0.38, h * 0.38, Math.PI * 0.8, Math.PI * 1.9);
          ctx.arc(x + w * 0.6, y - h * 0.6, h * 0.4, Math.PI * 1.1, Math.PI * 2.1);
          ctx.arc(x + w * 0.78, y - h * 0.3, h * 0.3, Math.PI * 1.5, Math.PI * 2.4);
          ctx.lineTo(x + w, y + 1); ctx.lineTo(x, y + 1); ctx.closePath();
          fs(ctx, g, gd, 2);
          ctx.fillStyle = '#d7263d';
          for (const [dx, dy] of [[0.3, 0.5], [0.55, 0.75], [0.7, 0.4], [0.45, 0.3]]) { ellipse(ctx, x + w * dx, y - h * dy, 2.2, 2.2); ctx.fill(); }
          ctx.strokeStyle = gd; ctx.lineWidth = 1.4;
          for (const [dx, dy, a] of [[0.12, 0.6, -2.4], [0.5, 1.02, -1.6], [0.95, 0.55, -0.6]]) {
            ctx.beginPath(); ctx.moveTo(x + w * dx, y - h * dy); ctx.lineTo(x + w * dx + Math.cos(a) * 5, y - h * dy + Math.sin(a) * 5); ctx.stroke();
          }
        },
      },
    ],
    flyer: { w: 44, h: 24, label: 'pássaro', draw: bird },
    ambient(ctx, pal, v) {
      ctx.save();
      if (v.n > 0.05) { // vaga-lumes
        for (let i = 0; i < 16; i++) {
          const x = mod(hash(i + 40) * W - v.mid * 0.5 + Math.sin(v.t + i) * 12, W);
          const y = GROUND - 20 - hash(i + 41) * 120 + Math.cos(v.t * 1.3 + i) * 8;
          const a = v.n * (0.4 + 0.6 * Math.max(0, Math.sin(v.t * 2 + i * 1.7)));
          const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
          g.addColorStop(0, `rgba(230,255,140,${a})`); g.addColorStop(1, 'rgba(230,255,140,0)');
          ctx.fillStyle = g; ctx.fillRect(x - 7, y - 7, 14, 14);
        }
      }
      if (v.n < 0.95) { // folhas caindo
        ctx.globalAlpha = 1 - v.n;
        for (let i = 0; i < 7; i++) {
          const x = mod(hash(i + 60) * W - v.t * 60 - v.mid * 0.6, W);
          const y = mod(hash(i + 61) * GROUND + v.t * 30, GROUND);
          ctx.save(); ctx.translate(x, y); ctx.rotate(v.t * 2 + i);
          ellipse(ctx, 0, 0, 4, 2); ctx.fillStyle = i % 2 ? '#f4a261' : '#90be6d'; ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();
    },
  };

  /* ---------------- Oceano ---------------- */
  THEMES.ocean = {
    label: 'Oceano', desc: 'Fundo do mar com corais e águas-vivas',
    day: {
      skyTop: '#86e3ff', skyBottom: '#1384bf', sun: '#ffffff',
      far: '#1a6f9c', farShade: '#155f88', mid: '#1f9e7a', midShade: '#167a5e',
      ground: '#f3d9a2', groundTop: '#d8b26c', groundDetail: '#e2c084',
      obs: '#ff7b6b', obsShade: '#a33a2f', obsAccent: '#6a3d9a',
      flyer: '#f7a6d8', flyerAccent: '#ffd6ef', cloud: '#ffffff', hud: '#063954',
    },
    night: {
      skyTop: '#0b3b5e', skyBottom: '#03121f', sun: '#ffffff',
      far: '#062a40', farShade: '#052236', mid: '#0a4a3e', midShade: '#073a30',
      ground: '#4f5a74', groundTop: '#384260', groundDetail: '#5f6a86',
      obs: '#ff5e8a', obsShade: '#7a1f3d', obsAccent: '#9b5de5',
      flyer: '#7cf2ff', flyerAccent: '#d6fbff', cloud: '#0b3b5e', hud: '#c9f2ff',
    },
    sky(ctx, pal, v) {
      // raios de luz
      ctx.save();
      ctx.globalAlpha = 0.16 * (1 - v.n * 0.7);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) {
        const x = mod(hash(i + 70) * W - v.cloud * 0.15, W + 200) - 100 + Math.sin(v.t * 0.5 + i) * 10;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 120, GROUND); ctx.lineTo(x + 60, GROUND); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      // superfície ondulando
      ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, 6 + Math.sin(x * 0.04 + v.t * 2) * 3);
      ctx.stroke(); ctx.restore();
    },
    far(ctx, pal, v) {
      repeat(ctx, v.far * 0.6, 180, 0, W, (x, i, r) => {
        const h = 40 + r * 70;
        ctx.beginPath(); ctx.moveTo(x - 30, GROUND); ctx.quadraticCurveTo(x - 20, GROUND - h, x + 10, GROUND - h * 0.9); ctx.quadraticCurveTo(x + 40, GROUND - h * 0.6, x + 50, GROUND); ctx.closePath();
        ctx.fillStyle = pal.farShade; ctx.fill();
      });
      wave(ctx, v.far, GROUND - 22, 10, 0.009, pal.far, 3);
    },
    mid(ctx, pal, v) {
      repeat(ctx, v.mid, 34, 0, W, (x, i, r) => {
        if (r < 0.35) return;
        const h = 24 + r * 46;
        ctx.strokeStyle = r > 0.7 ? pal.mid : pal.midShade; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, GROUND);
        for (let k = 1; k <= 6; k++) ctx.lineTo(x + Math.sin(v.t * 1.6 + k * 0.9 + i) * (k * 0.9), GROUND - (h * k) / 6);
        ctx.stroke();
      });
    },
    groundDeco(ctx, pal, x, r) {
      if (r < 0.3) { ellipse(ctx, x, GROUND + 10 + r * 60, 2 + r * 4, 1.4); ctx.fillStyle = pal.groundDetail; ctx.fill(); }
      else if (r > 0.93) { // conchinha
        ctx.beginPath(); ctx.arc(x, GROUND + 4, 4, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#ffb4a2'; ctx.fill();
      } else if (r > 0.88) { // estrela-do-mar
        ctx.save(); ctx.translate(x, GROUND + 14); ctx.fillStyle = '#ff9f1c'; ctx.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 1.8 : 4.5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        ctx.fill(); ctx.restore();
      }
    },
    obstacles: [
      {
        id: 'coral', w: 26, h: 44, max: 2,
        draw(ctx, x, y, w, h, pal, r) {
          const col = r > 0.5 ? pal.obs : '#ff9f43', ol = shade(col, -0.55);
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          const branches = [[0.5, 0, 0.5, 1], [0.5, 0.4, 0.1, 0.75], [0.5, 0.55, 0.9, 0.85], [0.2, 0.65, 0.05, 0.9]];
          for (const [lw, c] of [[8, ol], [5, col]]) {
            ctx.strokeStyle = c; ctx.lineWidth = lw;
            for (const [x1, y1, x2, y2] of branches) { ctx.beginPath(); ctx.moveTo(x + w * x1, y - h * y1); ctx.lineTo(x + w * x2, y - h * y2); ctx.stroke(); }
          }
          ctx.fillStyle = shade(col, 0.4);
          for (const [x2, y2] of branches.map((b) => [b[2], b[3]])) { ellipse(ctx, x + w * x2, y - h * y2, 1.4, 1.4); ctx.fill(); }
        },
      },
      {
        id: 'urchin', w: 26, h: 22, max: 3,
        draw(ctx, x, y, w, h, pal) {
          const cx = x + w / 2, cy = y - h * 0.45;
          ctx.strokeStyle = shade(pal.obsAccent, -0.3); ctx.lineWidth = 1.6;
          for (let k = 0; k < 14; k++) {
            const a = Math.PI + (k / 13) * Math.PI;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * w * 0.55, cy + Math.sin(a) * h * 0.95); ctx.stroke();
          }
          ctx.beginPath(); ctx.ellipse(cx, y, w * 0.38, h * 0.6, 0, Math.PI, 0); ctx.closePath(); fs(ctx, pal.obsAccent, shade(pal.obsAccent, -0.5), 1.6);
        },
      },
      {
        id: 'anemone', w: 34, h: 30, max: 1,
        draw(ctx, x, y, w, h, pal, r) {
          ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.quadraticCurveTo(x + 2, y - h * 0.6, x + w * 0.4, y - h * 0.62); ctx.quadraticCurveTo(x + w * 0.9, y - h * 0.65, x + w, y + 1); ctx.closePath();
          fs(ctx, '#8d99ae', '#4a5568', 2);
          ctx.lineCap = 'round';
          for (let k = 0; k < 7; k++) {
            const bx = x + w * (0.2 + k * 0.1), sway = Math.sin(performance.now() / 300 + k) * 2;
            ctx.strokeStyle = '#ff70a6'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(bx, y - h * 0.58); ctx.lineTo(bx + sway, y - h); ctx.stroke();
          }
        },
      },
    ],
    flyer: {
      w: 30, h: 38, label: 'água-viva',
      draw(ctx, x, y, f, pal) {
        const pulse = Math.sin(f * TAU) * 2;
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.beginPath(); ctx.ellipse(x + 15, y + 12, 14 + pulse * 0.5, 11 - pulse * 0.4, 0, Math.PI, 0); ctx.quadraticCurveTo(x + 15, y + 16, x + 1 - pulse * 0.5, y + 12); ctx.closePath();
        fs(ctx, pal.flyer, shade(pal.flyer, -0.45), 1.6);
        ellipse(ctx, x + 10, y + 5, 3, 2); ctx.fillStyle = pal.flyerAccent; ctx.fill();
        ctx.strokeStyle = pal.flyer; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (let k = 0; k < 4; k++) {
          const tx = x + 6 + k * 6; ctx.beginPath(); ctx.moveTo(tx, y + 14);
          for (let s = 1; s <= 4; s++) ctx.lineTo(tx + Math.sin(f * TAU + s + k) * 2.5, y + 14 + s * 6);
          ctx.stroke();
        }
        ctx.restore();
      },
    },
    ambient(ctx, pal, v) {
      ctx.save();
      for (let i = 0; i < 22; i++) {
        const x = mod(hash(i + 80) * W - v.mid * 0.4 + Math.sin(v.t * 2 + i) * 5, W);
        const y = mod(GROUND - hash(i + 81) * GROUND - v.t * (25 + hash(i) * 30), GROUND);
        const r = 1.5 + hash(i + 82) * 3;
        ctx.globalAlpha = 0.5; ellipse(ctx, x, y, r, r); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff'; ctx.fillRect(x - r * 0.4, y - r * 0.5, 1, 1);
      }
      if (v.n > 0.05) { // plâncton bioluminescente
        for (let i = 0; i < 30; i++) {
          const x = mod(hash(i + 90) * W - v.mid * 0.7, W), y = GROUND - hash(i + 91) * 200;
          ctx.globalAlpha = v.n * (0.3 + 0.7 * Math.max(0, Math.sin(v.t * 3 + i))); ctx.fillStyle = '#7cf2ff'; ctx.fillRect(x, y, 2, 2);
        }
      }
      ctx.restore();
    },
  };

  /* ---------------- Neve ---------------- */
  THEMES.snow = {
    label: 'Neve', desc: 'Montanhas geladas e bonecos de neve',
    day: {
      skyTop: '#9fcff4', skyBottom: '#eef7ff', sun: '#fffbe0',
      far: '#c9d9ec', farShade: '#b0c6e0', mid: '#4f8a7b', midShade: '#3c6f62',
      ground: '#fbfdff', groundTop: '#c4dcf0', groundDetail: '#dce9f6',
      obs: '#a8e0ff', obsShade: '#4f8db8', obsAccent: '#ff8c42',
      flyer: '#4d7cc9', flyerAccent: '#ffd166', cloud: '#ffffff', hud: '#2a4766',
    },
    night: {
      skyTop: '#07122b', skyBottom: '#22335e', sun: '#fffbe0',
      far: '#33456e', farShade: '#2a3a60', mid: '#1f3b44', midShade: '#172e36',
      ground: '#9fb3d1', groundTop: '#6f86ab', groundDetail: '#8aa0c2',
      obs: '#7fbfe6', obsShade: '#2c5a80', obsAccent: '#e07a3a',
      flyer: '#c8d6f0', flyerAccent: '#ffd166', cloud: '#3a4b78', hud: '#e3eeff',
    },
    sky(ctx, pal, v) {
      stars(ctx, v, v.n);
      if (v.n > 0.05) { // aurora boreal
        ctx.save(); ctx.globalAlpha = v.n * 0.55;
        for (let b = 0; b < 3; b++) {
          const g = ctx.createLinearGradient(0, 20, 0, 140);
          g.addColorStop(0, 'rgba(120,255,190,0)'); g.addColorStop(0.5, b === 1 ? 'rgba(150,120,255,0.55)' : 'rgba(120,255,190,0.6)'); g.addColorStop(1, 'rgba(120,255,190,0)');
          ctx.fillStyle = g; ctx.beginPath();
          for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 40 + b * 18 + Math.sin(x * 0.01 + v.t * 0.6 + b) * 18);
          for (let x = W; x >= 0; x -= 20) ctx.lineTo(x, 100 + b * 18 + Math.sin(x * 0.012 + v.t * 0.5 + b * 2) * 14);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      sunMoon(ctx, v, pal, W - 130, 60);
    },
    far(ctx, pal, v) {
      repeat(ctx, v.far * 0.6, 150, 0, W, (x, i, r) => {
        const h = 70 + r * 80, bw = 110 + r * 40;
        ctx.beginPath(); ctx.moveTo(x - bw / 2, GROUND); ctx.lineTo(x, GROUND - h); ctx.lineTo(x + bw / 2, GROUND); ctx.closePath();
        ctx.fillStyle = r > 0.5 ? pal.far : pal.farShade; ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - bw * 0.14, GROUND - h * 0.72); ctx.lineTo(x, GROUND - h); ctx.lineTo(x + bw * 0.14, GROUND - h * 0.72);
        ctx.lineTo(x + bw * 0.05, GROUND - h * 0.66); ctx.lineTo(x - bw * 0.03, GROUND - h * 0.74); ctx.closePath();
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1;
      });
    },
    clouds: { count: 4, y: [26, 90], alpha: 0.85 },
    mid(ctx, pal, v) {
      repeat(ctx, v.mid, 60, 0, W, (x, i, r) => {
        if (r < 0.3) return;
        const h = 36 + r * 40, bx = x + r * 30;
        for (let k = 0; k < 3; k++) {
          const ky = GROUND - 4 - k * h * 0.24, kw = h * 0.3 * (1 - k * 0.22);
          ctx.beginPath(); ctx.moveTo(bx - kw, ky); ctx.lineTo(bx, ky - h * 0.4); ctx.lineTo(bx + kw, ky); ctx.closePath();
          ctx.fillStyle = pal.mid; ctx.fill();
          ctx.beginPath(); ctx.moveTo(bx - kw * 0.5, ky - h * 0.2); ctx.lineTo(bx, ky - h * 0.4); ctx.lineTo(bx + kw * 0.5, ky - h * 0.2); ctx.closePath();
          ctx.fillStyle = '#ffffff'; ctx.fill();
        }
      });
    },
    groundDeco(ctx, pal, x, r) {
      if (r < 0.35) { ellipse(ctx, x, GROUND + 12 + r * 50, 4 + r * 8, 1.6); ctx.fillStyle = pal.groundDetail; ctx.fill(); }
    },
    obstacles: [
      {
        id: 'snowman', w: 26, h: 46, max: 1,
        draw(ctx, x, y, w, h, pal) {
          const cx = x + w / 2, ol = '#8fa9c4';
          ellipse(ctx, cx, y - 11, 12.5, 11.5); fs(ctx, '#ffffff', ol, 1.8);
          ellipse(ctx, cx, y - 28, 9.5, 8.5); fs(ctx, '#ffffff', ol, 1.8);
          ellipse(ctx, cx, y - 40, 7, 6.5); fs(ctx, '#ffffff', ol, 1.8);
          ctx.fillStyle = '#2b2d42'; ellipse(ctx, cx - 4, y - 42, 1, 1); ctx.fill(); ellipse(ctx, cx + 1, y - 42, 1, 1); ctx.fill();
          ellipse(ctx, cx, y - 28, 1.1, 1.1); ctx.fill(); ellipse(ctx, cx, y - 23, 1.1, 1.1); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx, y - 40); ctx.lineTo(cx - 9, y - 38.5); ctx.lineTo(cx, y - 38); ctx.closePath(); ctx.fillStyle = pal.obsAccent; ctx.fill();
          ctx.fillStyle = '#e63946'; ctx.fillRect(cx - 7, y - 35.5, 14, 3); ctx.fillRect(cx + 2, y - 35, 3, 7);
          ctx.strokeStyle = '#7a5232'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(cx + 8, y - 29); ctx.lineTo(cx + 15, y - 36); ctx.moveTo(cx - 8, y - 29); ctx.lineTo(cx - 14, y - 33); ctx.stroke();
        },
      },
      {
        id: 'ice', w: 22, h: 26, max: 3,
        draw(ctx, x, y, w, h, pal, r) {
          roundRect(ctx, x + 1, y - h, w - 2, h + 1, 3); fs(ctx, pal.obs, pal.obsShade, 2);
          ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(x + 4, y - h + 3); ctx.lineTo(x + 9, y - h + 3); ctx.lineTo(x + 4, y - h + 12); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + w - 6, y - 5); ctx.lineTo(x + w - 10, y - 12); ctx.stroke();
          roundRect(ctx, x, y - h - 2, w, 5, 2.5); ctx.fillStyle = '#ffffff'; ctx.fill();
        },
      },
      {
        id: 'pine', w: 28, h: 48, max: 2,
        draw(ctx, x, y, w, h, pal) {
          const cx = x + w / 2;
          ctx.fillStyle = '#7a5232'; ctx.fillRect(cx - 3, y - 8, 6, 9);
          for (let k = 0; k < 3; k++) {
            const ky = y - 6 - k * 12, kw = (w / 2) * (1 - k * 0.2);
            ctx.beginPath(); ctx.moveTo(cx - kw, ky); ctx.lineTo(cx, ky - 20); ctx.lineTo(cx + kw, ky); ctx.closePath(); fs(ctx, '#2f7a5f', '#1a4a39', 1.8);
            ctx.beginPath(); ctx.moveTo(cx - kw * 0.55, ky - 9); ctx.lineTo(cx, ky - 20); ctx.lineTo(cx + kw * 0.55, ky - 9); ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill();
          }
        },
      },
    ],
    flyer: {
      w: 44, h: 24, label: 'coruja',
      draw(ctx, x, y, f, pal) { bird(ctx, x, y, f, pal); },
    },
    ambient(ctx, pal, v) {
      ctx.save(); ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 45; i++) {
        const sp = 20 + hash(i + 100) * 40;
        const x = mod(hash(i + 101) * W - v.t * 25 - v.mid * 0.3 + Math.sin(v.t + i) * 10, W);
        const y = mod(hash(i + 102) * H + v.t * sp, H);
        const r = 1 + hash(i + 103) * 2;
        ctx.globalAlpha = 0.85; ellipse(ctx, x, y, r, r); ctx.fill();
      }
      ctx.restore();
    },
  };

  /* ---------------- Espaço ---------------- */
  THEMES.space = {
    label: 'Espaço', desc: 'Superfície lunar, cristais e OVNIs',
    day: {
      skyTop: '#5b46c9', skyBottom: '#f3a6c8', sun: '#ffe08a',
      far: '#8b7fd1', farShade: '#7a6cc2', mid: '#a493d6', midShade: '#8e7dc6',
      ground: '#d3cde6', groundTop: '#9c95bd', groundDetail: '#b7b0d2',
      obs: '#7cf2ff', obsShade: '#2a7f99', obsAccent: '#c77dff',
      flyer: '#b8c0cc', flyerAccent: '#7cf2ff', cloud: '#ffffff', hud: '#2b1f66',
    },
    night: {
      skyTop: '#03041a', skyBottom: '#1d1145', sun: '#ffe08a',
      far: '#2a2063', farShade: '#221a55', mid: '#3a2d78', midShade: '#2f2468',
      ground: '#6b6589', groundTop: '#4a4468', groundDetail: '#5a547a',
      obs: '#4fe3ff', obsShade: '#145a73', obsAccent: '#b15cff',
      flyer: '#8f99a8', flyerAccent: '#4fe3ff', cloud: '#2a2063', hud: '#e4dcff',
    },
    sky(ctx, pal, v) {
      stars(ctx, v, Math.max(0.35, v.n), 90);
      // planeta com anel
      const px = W - 200 - mod(v.cloud * 0.03, W + 300), py = 70;
      ctx.save();
      ellipse(ctx, px, py, 38, 38);
      const g = ctx.createLinearGradient(px - 38, py - 38, px + 38, py + 38);
      g.addColorStop(0, '#ffb86b'); g.addColorStop(1, '#e05780'); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(px, py, 62, 13, -0.3, 0, TAU); ctx.stroke();
      ctx.restore();
      // estrela cadente
      const cyc = mod(v.t, 7);
      if (cyc < 0.8) {
        const k = cyc / 0.8, sx = 200 + k * 260, sy = 30 + k * 70;
        ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 40, sy - 11); ctx.stroke(); ctx.restore();
      }
    },
    far(ctx, pal, v) {
      wave(ctx, v.far, GROUND - 40, 16, 0.007, pal.farShade, 5);
      repeat(ctx, v.far, 260, 0, W, (x, i, r) => {
        if (r < 0.5) return;
        const h = 50 + r * 40;
        ctx.beginPath(); ctx.moveTo(x - 14, GROUND - 30); ctx.lineTo(x - 5, GROUND - 30 - h); ctx.lineTo(x + 4, GROUND - 30 - h * 0.8); ctx.lineTo(x + 14, GROUND - 30); ctx.closePath();
        ctx.fillStyle = pal.far; ctx.fill();
      });
    },
    mid(ctx, pal, v) {
      wave(ctx, v.mid, GROUND - 8, 8, 0.013, pal.mid, 9);
      repeat(ctx, v.mid, 120, 0, W, (x, i, r) => {
        ellipse(ctx, x + r * 40, GROUND - 8 - r * 6, 10 + r * 10, 3); ctx.fillStyle = pal.midShade; ctx.fill();
      });
    },
    groundDeco(ctx, pal, x, r) {
      if (r < 0.18) { ellipse(ctx, x, GROUND + 12 + r * 80, 6 + r * 20, 2.5 + r * 6); ctx.fillStyle = pal.groundDetail; ctx.fill(); ctx.strokeStyle = pal.groundTop; ctx.lineWidth = 1; ctx.stroke(); }
      else if (r < 0.35) { ctx.fillStyle = pal.groundTop; ctx.fillRect(x, GROUND + 6 + r * 50, 2, 2); }
    },
    obstacles: [
      {
        id: 'crystal', w: 20, h: 40, max: 3,
        draw(ctx, x, y, w, h, pal, r) {
          const col = r > 0.5 ? pal.obs : pal.obsAccent, ol = shade(col, -0.55);
          const shards = [[0.5, 1, 0.22], [0.2, 0.62, 0.16], [0.8, 0.7, 0.16]];
          for (const [cx, hh, ww] of shards) {
            const bx = x + w * cx, top = y - h * hh;
            ctx.beginPath(); ctx.moveTo(bx - w * ww, y + 1); ctx.lineTo(bx - w * ww, top + 6); ctx.lineTo(bx, top); ctx.lineTo(bx + w * ww, top + 6); ctx.lineTo(bx + w * ww, y + 1); ctx.closePath();
            fs(ctx, col, ol, 1.6);
            ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(bx - w * ww * 0.5, top + 7, 1.6, (y - top) * 0.5);
          }
        },
      },
      {
        id: 'moonrock', w: 34, h: 24, max: 2,
        draw(ctx, x, y, w, h, pal) {
          ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x + 3, y - h * 0.7); ctx.lineTo(x + w * 0.4, y - h); ctx.lineTo(x + w * 0.8, y - h * 0.85); ctx.lineTo(x + w, y + 1); ctx.closePath();
          fs(ctx, '#8f88ab', '#4a4468', 2);
          ellipse(ctx, x + w * 0.45, y - h * 0.5, 4, 2.6); ctx.fillStyle = '#76709a'; ctx.fill();
          ellipse(ctx, x + w * 0.75, y - h * 0.3, 2.5, 1.7); ctx.fill();
        },
      },
      {
        id: 'alien', w: 24, h: 48, max: 2,
        draw(ctx, x, y, w, h, pal, r) {
          const col = '#8ac926', ol = '#3e5c12';
          ctx.lineCap = 'round';
          for (const [lw, c] of [[9, ol], [6, col]]) {
            ctx.strokeStyle = c; ctx.lineWidth = lw;
            ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.quadraticCurveTo(x + w * 0.2, y - h * 0.5, x + w / 2, y - h + 8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + w * 0.38, y - h * 0.45); ctx.quadraticCurveTo(x + w, y - h * 0.5, x + w * 0.9, y - h * 0.75); ctx.stroke();
          }
          for (const [ex, ey] of [[0.5, 1], [0.9, 0.78]]) {
            ellipse(ctx, x + w * ex, y - h * ey + 6, 4, 4); fs(ctx, '#ffffff', ol, 1.2);
            ellipse(ctx, x + w * ex + 1, y - h * ey + 6, 1.8, 1.8); ctx.fillStyle = '#1b1b24'; ctx.fill();
          }
        },
      },
    ],
    flyer: {
      w: 44, h: 26, label: 'OVNI',
      draw(ctx, x, y, f, pal) {
        const bob = Math.sin(f * TAU) * 1.5;
        ctx.save(); ctx.translate(0, bob);
        ctx.beginPath(); ctx.ellipse(x + 22, y + 9, 10, 9, 0, Math.PI, 0); ctx.closePath();
        ctx.fillStyle = rgba(pal.flyerAccent, 0.75); ctx.fill(); ctx.strokeStyle = shade(pal.flyerAccent, -0.4); ctx.lineWidth = 1.4; ctx.stroke();
        ellipse(ctx, x + 22, y + 9, 3.5, 3.5); ctx.fillStyle = '#8ac926'; ctx.fill();
        ellipse(ctx, x + 22, y + 15, 22, 6.5); fs(ctx, pal.flyer, shade(pal.flyer, -0.5), 1.8);
        const cols = ['#ffd166', '#ff5d8f', '#06d6a0'];
        for (let k = 0; k < 4; k++) { ellipse(ctx, x + 8 + k * 9.5, y + 16, 1.8, 1.8); ctx.fillStyle = cols[(k + Math.floor(f * 6)) % 3]; ctx.fill(); }
        ctx.restore();
      },
    },
    ambient(ctx, pal, v) {
      ctx.save(); ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 12; i++) {
        const x = mod(hash(i + 120) * W - v.t * 15, W), y = hash(i + 121) * GROUND;
        ctx.globalAlpha = 0.25 + 0.25 * Math.sin(v.t * 2 + i); ctx.fillRect(x, y, 1.5, 1.5);
      }
      ctx.restore();
    },
  };

  const THEME_ORDER = ['desert', 'forest', 'ocean', 'snow', 'space'];

  /* ======================================================
     Renderização da cena
     ====================================================== */
  function palette(theme, n) { return DG.util.mixPalette(theme.day, theme.night, n); }

  function drawBackground(ctx, theme, pal, v) {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, pal.skyTop); g.addColorStop(1, pal.skyBottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    theme.sky(ctx, pal, v);
    theme.far(ctx, pal, v);
    if (theme.clouds) clouds(ctx, v, pal.cloud, theme.clouds.count, theme.clouds.y[0], theme.clouds.y[1], theme.clouds.alpha * (1 - v.n * 0.5));
    theme.mid(ctx, pal, v);
  }

  function drawGround(ctx, theme, pal, v) {
    ctx.fillStyle = pal.ground; ctx.fillRect(0, GROUND, W, H - GROUND);
    const gg = ctx.createLinearGradient(0, GROUND, 0, H);
    gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = gg; ctx.fillRect(0, GROUND, W, H - GROUND);
    repeat(ctx, v.ground, 17, 0, W, (x, i, r) => theme.groundDeco(ctx, pal, x + r * 10, r));
    ctx.fillStyle = pal.groundTop; ctx.fillRect(0, GROUND - 1, W, 3);
  }

  /** Desenha um obstáculo; `o.s` é a escala (padrão 1). */
  function drawObstacle(ctx, theme, pal, o) {
    const s = o.s || 1;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(s, s);
    if (o.flyer) theme.flyer.draw(ctx, 0, 0, o.frame, pal);
    else {
      const kind = theme.obstacles.find((k) => k.id === o.kind) || theme.obstacles[0];
      for (let i = 0; i < o.count; i++) kind.draw(ctx, i * kind.w, 0, kind.w, kind.h, pal, hash(o.seed + i * 7.1));
    }
    ctx.restore();
  }

  /** Desenha uma prévia estática do cenário (usada nos cartões de seleção). */
  function drawPreview(ctx, themeId, night, t) {
    const prevW = W;
    W = 900;
    try { return _drawPreview(ctx, themeId, night, t); } finally { W = prevW; }
  }
  function _drawPreview(ctx, themeId, night, t) {
    const theme = THEMES[themeId];
    const n = night ? 1 : 0;
    const pal = palette(theme, n);
    const v = { t: t || 0, far: 0, mid: 0, ground: 0, cloud: 0, n };
    drawBackground(ctx, theme, pal, v);
    drawGround(ctx, theme, pal, v);
    const k0 = theme.obstacles[0], k1 = theme.obstacles[1];
    drawObstacle(ctx, theme, pal, { kind: k0.id, x: 560, y: GROUND, count: Math.min(2, k0.max), seed: 3 });
    drawObstacle(ctx, theme, pal, { kind: k1.id, x: 760, y: GROUND, count: 1, seed: 8 });
    drawObstacle(ctx, theme, pal, { flyer: true, x: 400, y: GROUND - 120, frame: 0.2 });
    theme.ambient(ctx, pal, v);
    return pal;
  }

  DG.themes = {
    get W() { return W; }, setWidth, H, GROUND, THEMES, THEME_ORDER,
    palette, drawBackground, drawGround, drawObstacle, drawPreview,
  };
})();

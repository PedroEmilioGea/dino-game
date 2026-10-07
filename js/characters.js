/* ==========================================================
   Dino Game — personagens e acessórios
   Todos os personagens são desenhados em vetor (canvas) numa
   "caixa" de 60 px de altura, com o chão em y = 60 e olhando
   para a direita. Os acessórios usam pontos de ancoragem
   (cabeça, olho, corpo, pescoço e pés), então qualquer
   acessório funciona em qualquer personagem.
   ========================================================== */
(function () {
  'use strict';
  const DG = (window.DG = window.DG || {});
  const { shade, ellipse, roundRect } = DG.util;
  const TAU = Math.PI * 2;
  const GROUND = 60;

  /* ---------------- Espécies ---------------- */
  const SPECIES = {
    dino: {
      label: 'Dino', defaultName: 'Rex', color: '#5fa35a',
      body: { cx: 24, cy: 38, rx: 14, ry: 13 },
      head: { x: 39, y: 17, rx: 13, ry: 10 },
      duck: { dy: 9, hx: 11, hy: 18 },
      hip: 0.55, legW: 6,
    },
    cat: {
      label: 'Gato', defaultName: 'Mia', color: '#e8a04a',
      body: { cx: 24, cy: 40, rx: 12, ry: 12 },
      head: { x: 36, y: 22, rx: 11, ry: 10 },
      duck: { dy: 8, hx: 9, hy: 15 },
      hip: 0.55, legW: 5,
    },
    dog: {
      label: 'Cachorro', defaultName: 'Thor', color: '#b07d4f',
      body: { cx: 24, cy: 39, rx: 13, ry: 12 },
      head: { x: 36, y: 21, rx: 11, ry: 10 },
      duck: { dy: 8, hx: 9, hy: 15 },
      hip: 0.55, legW: 6,
    },
    bunny: {
      label: 'Coelho', defaultName: 'Pipoca', color: '#ece6e1',
      body: { cx: 24, cy: 42, rx: 12, ry: 11 },
      head: { x: 35, y: 26, rx: 10, ry: 9 },
      duck: { dy: 7, hx: 9, hy: 13 },
      hip: 0.55, legW: 6,
    },
    penguin: {
      label: 'Pinguim', defaultName: 'Pingo', color: '#2d3142',
      body: { cx: 25, cy: 37, rx: 14, ry: 18 },
      head: { x: 30, y: 16, rx: 11, ry: 10 },
      duck: { dy: 11, hx: 10, hy: 22 },
      hip: 0.82, legW: 5,
    },
    fox: {
      label: 'Raposa', defaultName: 'Ruivo', color: '#e8752a',
      body: { cx: 24, cy: 39, rx: 12, ry: 12 },
      head: { x: 36, y: 21, rx: 11, ry: 10 },
      duck: { dy: 8, hx: 9, hy: 15 },
      hip: 0.55, legW: 5,
    },
  };
  const SPECIES_ORDER = ['dino', 'cat', 'dog', 'bunny', 'penguin', 'fox'];

  const BODY_COLORS = ['#5fa35a', '#2a9d8f', '#4d7cc9', '#8e6bbf', '#e87ea1', '#d9534f',
    '#e8752a', '#e8a04a', '#e8c547', '#b07d4f', '#8a8f98', '#2d3142', '#ece6e1'];
  const ACC_COLORS = ['#e63946', '#f4a261', '#ffd166', '#06d6a0', '#118ab2', '#7b2cbf',
    '#ff70a6', '#ffffff', '#2b2d42', '#8d6e63'];

  /* ---------------- Acessórios ---------------- */
  const ACCESSORIES = {
    hat: {
      label: 'Chapéu', colorLabel: 'Cor do chapéu',
      options: [
        ['none', 'Nenhum'], ['cap', 'Boné'], ['tophat', 'Cartola'], ['crown', 'Coroa'],
        ['cowboy', 'Cowboy'], ['beanie', 'Gorro'], ['party', 'Festa'], ['bow', 'Laço'], ['viking', 'Viking'],
      ],
    },
    glasses: {
      label: 'Óculos', colorLabel: 'Cor dos óculos',
      options: [
        ['none', 'Nenhum'], ['sun', 'Escuros'], ['round', 'Redondos'], ['nerd', 'Nerd'],
        ['star', 'Estrela'], ['mask', 'Máscara'],
      ],
    },
    outfit: {
      label: 'Roupa', colorLabel: 'Cor da roupa',
      options: [
        ['none', 'Nenhuma'], ['tshirt', 'Camiseta'], ['stripes', 'Listrada'], ['vest', 'Colete'],
        ['cape', 'Capa'], ['scarf', 'Cachecol'], ['bowtie', 'Gravatinha'], ['tie', 'Gravata'],
      ],
    },
    shoes: {
      label: 'Calçado', colorLabel: 'Cor do calçado',
      options: [
        ['none', 'Descalço'], ['sneakers', 'Tênis'], ['hightop', 'Cano alto'], ['boots', 'Botas'], ['skates', 'Patins'],
      ],
    },
  };

  function defaultProfile(id) {
    const s = SPECIES[id];
    return {
      name: s.defaultName, color: s.color,
      hat: 'none', hatColor: '#e63946',
      glasses: 'none', glassesColor: '#2b2d42',
      outfit: 'none', outfitColor: '#118ab2',
      shoes: 'none', shoesColor: '#e63946',
    };
  }

  /* ---------------- Pose / geometria ---------------- */
  function computePose(spec, state, phase) {
    const duck = state === 'duck';
    const body = Object.assign({}, spec.body);
    const head = Object.assign({}, spec.head);
    if (duck) {
      body.cy += spec.duck.dy; body.rx *= 1.22; body.ry *= 0.7; body.cx += 2;
      head.x += spec.duck.hx; head.y += spec.duck.hy;
    }
    const running = state === 'run' || duck;
    const bob = running ? -Math.abs(Math.sin(phase * TAU)) * 2 : 0;
    body.cy += bob; head.y += bob;
    if (state === 'dead') { head.y += 1; }

    const hipY = body.cy + body.ry * spec.hip;
    const len = GROUND - hipY;
    const feet = [];
    for (let i = 0; i < 2; i++) {
      const hipX = body.cx + (i ? 5 : -4);
      let a = 0, L = len, lift = 0;
      if (running) {
        const p = phase * TAU + (i ? 0 : Math.PI);
        a = Math.sin(p) * (duck ? 0.55 : 0.75);
        lift = Math.max(0, Math.cos(p)) * 4;
      } else if (state === 'jump') {
        a = i ? 0.5 : -0.3; L = len * 0.82;
      } else if (state === 'dead') {
        a = i ? 0.25 : -0.15;
      }
      feet.push({ hx: hipX, hy: hipY, x: hipX + Math.sin(a) * L, y: hipY + Math.cos(a) * L - lift });
    }
    const eye = { x: head.x + head.rx * 0.38, y: head.y - head.ry * 0.18 };
    const neck = { x: head.x - head.rx * 0.45, y: head.y + head.ry * 0.85 };
    return { body, head, feet, eye, neck, duck, state, phase };
  }

  /** Retângulos de colisão (coordenadas locais, chão em y=60). */
  function hitboxes(speciesId, state) {
    const spec = SPECIES[speciesId] || SPECIES.dino;
    const P = computePose(spec, state === 'duck' ? 'duck' : 'idle', 0);
    const h = P.head, b = P.body;
    const boxes = [
      { x: h.x - h.rx * 0.75, y: h.y - h.ry * 0.75, w: h.rx * 1.6, h: h.ry * 1.5 },
      { x: b.cx - b.rx * 0.8, y: b.cy - b.ry * 0.75, w: b.rx * 1.6, h: GROUND - (b.cy - b.ry * 0.75) - 2 },
    ];
    // orelhas compridas do coelho também contam (justiça entre personagens)
    if (speciesId === 'bunny' && state !== 'duck') boxes.push({ x: h.x - 6, y: h.y - h.ry - 12, w: 9, h: 12 });
    return boxes;
  }

  /* ---------------- Funções de desenho base ---------------- */
  function fillStroke(ctx, fill, stroke, lw) {
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function drawLeg(ctx, f, c, w) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = c.outline; ctx.lineWidth = w + 3;
    ctx.beginPath(); ctx.moveTo(f.hx, f.hy); ctx.lineTo(f.x, f.y - 1); ctx.stroke();
    ctx.strokeStyle = c.leg; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(f.hx, f.hy); ctx.lineTo(f.x, f.y - 1); ctx.stroke();
  }

  function drawFoot(ctx, f, c, id) {
    const col = id === 'penguin' ? '#f4a23a' : c.leg;
    ellipse(ctx, f.x + 3, f.y - 2, 5.5, 3);
    fillStroke(ctx, col, c.outline, 1.6);
  }

  function drawEye(ctx, P, c, blink) {
    const { x, y } = P.eye;
    if (P.state === 'dead') {
      ctx.strokeStyle = c.outline; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 2.6, y - 2.6); ctx.lineTo(x + 2.6, y + 2.6);
      ctx.moveTo(x + 2.6, y - 2.6); ctx.lineTo(x - 2.6, y + 2.6);
      ctx.stroke();
      return;
    }
    if (blink) {
      ctx.strokeStyle = c.outline; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.stroke();
      return;
    }
    ellipse(ctx, x, y, 3.4, 3.6); fillStroke(ctx, '#ffffff', c.outline, 1.2);
    ellipse(ctx, x + 1, y + 0.3, 1.9, 2.2); ctx.fillStyle = '#1b1b24'; ctx.fill();
    ellipse(ctx, x + 1.6, y - 0.6, 0.7, 0.7); ctx.fillStyle = '#ffffff'; ctx.fill();
  }

  /* ---------------- Detalhes por espécie ---------------- */
  const PARTS = {
    dino: {
      tail(ctx, P, c) {
        const b = P.body, w = Math.sin(P.phase * TAU) * 2;
        ctx.beginPath();
        ctx.moveTo(b.cx - b.rx * 0.4, b.cy - b.ry * 0.7);
        ctx.quadraticCurveTo(b.cx - b.rx * 1.3, b.cy - b.ry * 0.6, 1, b.cy - 11 + w);
        ctx.quadraticCurveTo(b.cx - b.rx * 1.1, b.cy + b.ry * 0.2, b.cx - b.rx * 0.3, b.cy + b.ry * 0.6);
        ctx.closePath();
        fillStroke(ctx, c.main, c.outline);
      },
      back(ctx, P, c) {
        const b = P.body;
        ctx.fillStyle = c.accent; ctx.strokeStyle = c.outline; ctx.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) {
          const a = -Math.PI * (0.55 + i * 0.13);
          const x = b.cx + Math.cos(a) * b.rx * 0.98, y = b.cy + Math.sin(a) * b.ry * 0.98;
          ctx.beginPath(); ctx.moveTo(x - 3, y + 1); ctx.lineTo(x - 1, y - 5); ctx.lineTo(x + 3, y + 1); ctx.closePath();
          ctx.fill(); ctx.stroke();
        }
      },
      head(ctx, P, c) {
        const h = P.head, b = P.body;
        // pescoço
        ctx.beginPath();
        ctx.moveTo(b.cx + b.rx * 0.2, b.cy - b.ry * 0.8);
        ctx.lineTo(h.x - h.rx * 0.7, h.y);
        ctx.lineTo(h.x - h.rx * 0.1, h.y + h.ry * 0.9);
        ctx.lineTo(b.cx + b.rx * 0.9, b.cy - b.ry * 0.1);
        ctx.closePath(); fillStroke(ctx, c.main, null);
        roundRect(ctx, h.x - h.rx, h.y - h.ry, h.rx * 2, h.ry * 2, 7);
        fillStroke(ctx, c.main, c.outline);
        // boca
        ctx.strokeStyle = c.outline; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(h.x + h.rx * 0.95, h.y + h.ry * 0.45); ctx.lineTo(h.x + h.rx * 0.05, h.y + h.ry * 0.45); ctx.stroke();
        // dentinhos
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 2; i++) {
          const tx = h.x + h.rx * (0.55 - i * 0.35);
          ctx.beginPath(); ctx.moveTo(tx, h.y + h.ry * 0.45); ctx.lineTo(tx + 2, h.y + h.ry * 0.45); ctx.lineTo(tx + 1, h.y + h.ry * 0.75); ctx.fill();
        }
        // narina
        ellipse(ctx, h.x + h.rx * 0.8, h.y - h.ry * 0.35, 1, 0.8); ctx.fillStyle = c.outline; ctx.fill();
      },
      arm(ctx, P, c) {
        const b = P.body, sw = Math.sin(P.phase * TAU) * 1.5;
        ctx.lineCap = 'round'; ctx.strokeStyle = c.outline; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(b.cx + b.rx * 0.6, b.cy); ctx.lineTo(b.cx + b.rx * 0.95, b.cy + 4 + sw); ctx.stroke();
        ctx.strokeStyle = c.main; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(b.cx + b.rx * 0.6, b.cy); ctx.lineTo(b.cx + b.rx * 0.95, b.cy + 4 + sw); ctx.stroke();
      },
    },

    cat: {
      tail(ctx, P, c) {
        const b = P.body, w = Math.sin(P.phase * TAU) * 3;
        const sx = b.cx - b.rx * 0.8, sy = b.cy + b.ry * 0.1;
        ctx.lineCap = 'round';
        for (const [col, lw] of [[c.outline, 7], [c.main, 4]]) {
          ctx.strokeStyle = col; ctx.lineWidth = lw;
          ctx.beginPath(); ctx.moveTo(sx, sy);
          ctx.bezierCurveTo(sx - 12, sy, sx - 8, sy - 18 + w, sx - 14, sy - 22 + w);
          ctx.stroke();
        }
      },
      head(ctx, P, c) {
        const h = P.head;
        for (const dx of [-0.55, 0.25]) {
          ctx.beginPath();
          ctx.moveTo(h.x + h.rx * (dx - 0.3), h.y - h.ry * 0.6);
          ctx.lineTo(h.x + h.rx * (dx + 0.05), h.y - h.ry * 1.55);
          ctx.lineTo(h.x + h.rx * (dx + 0.45), h.y - h.ry * 0.7);
          ctx.closePath(); fillStroke(ctx, c.main, c.outline);
          ctx.beginPath();
          ctx.moveTo(h.x + h.rx * (dx - 0.12), h.y - h.ry * 0.75);
          ctx.lineTo(h.x + h.rx * (dx + 0.05), h.y - h.ry * 1.25);
          ctx.lineTo(h.x + h.rx * (dx + 0.25), h.y - h.ry * 0.8);
          ctx.fillStyle = '#f7a8b8'; ctx.fill();
        }
        ellipse(ctx, h.x, h.y, h.rx, h.ry); fillStroke(ctx, c.main, c.outline);
        ellipse(ctx, h.x + h.rx * 0.55, h.y + h.ry * 0.35, h.rx * 0.45, h.ry * 0.38); ctx.fillStyle = c.belly; ctx.fill();
        // nariz e bigodes
        ellipse(ctx, h.x + h.rx * 0.92, h.y + h.ry * 0.12, 1.6, 1.2); ctx.fillStyle = '#e86a8a'; ctx.fill();
        ctx.strokeStyle = c.outline; ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(h.x + h.rx * 0.6, h.y + h.ry * 0.35); ctx.lineTo(h.x + h.rx * 1.45, h.y + h.ry * 0.15);
        ctx.moveTo(h.x + h.rx * 0.6, h.y + h.ry * 0.45); ctx.lineTo(h.x + h.rx * 1.45, h.y + h.ry * 0.6);
        ctx.stroke();
      },
      arm: armSimple,
    },

    dog: {
      tail(ctx, P, c) {
        const b = P.body, w = Math.sin(P.phase * TAU * 2) * 4;
        const sx = b.cx - b.rx * 0.85, sy = b.cy - b.ry * 0.2;
        ctx.lineCap = 'round';
        for (const [col, lw] of [[c.outline, 7], [c.main, 4]]) {
          ctx.strokeStyle = col; ctx.lineWidth = lw;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - 8, sy - 4, sx - 7 + w, sy - 13); ctx.stroke();
        }
      },
      head(ctx, P, c) {
        const h = P.head;
        ellipse(ctx, h.x, h.y, h.rx, h.ry); fillStroke(ctx, c.main, c.outline);
        // focinho
        ellipse(ctx, h.x + h.rx * 0.85, h.y + h.ry * 0.3, h.rx * 0.55, h.ry * 0.42); fillStroke(ctx, c.belly, c.outline, 1.5);
        ellipse(ctx, h.x + h.rx * 1.3, h.y + h.ry * 0.12, 2.2, 1.7); ctx.fillStyle = '#1b1b24'; ctx.fill();
        if (P.state === 'run' || P.state === 'duck') {
          ellipse(ctx, h.x + h.rx * 0.95, h.y + h.ry * 0.85, 2, 3); fillStroke(ctx, '#ef6f8a', c.outline, 1);
        }
        // orelha caída
        const sw = (P.state === 'run' || P.state === 'duck') ? Math.sin(P.phase * TAU) * 0.15 : 0;
        ellipse(ctx, h.x - h.rx * 0.35, h.y + h.ry * 0.05, h.rx * 0.32, h.ry * 0.75, 0.35 + sw);
        fillStroke(ctx, c.dark, c.outline, 1.5);
      },
      arm: armSimple,
    },

    bunny: {
      tail(ctx, P, c) {
        const b = P.body;
        ellipse(ctx, b.cx - b.rx * 0.95, b.cy - b.ry * 0.05, 5, 5); fillStroke(ctx, '#ffffff', c.outline, 1.5);
      },
      head(ctx, P, c) {
        const h = P.head;
        const back = P.duck ? 0.9 : (P.state === 'jump' ? 0.5 : 0.18 + Math.sin(P.phase * TAU) * 0.05);
        for (const [dx, extra] of [[-0.35, 0.15], [0.1, 0]]) {
          ctx.save();
          ctx.translate(h.x + h.rx * dx, h.y - h.ry * 0.6);
          ctx.rotate(-back - extra);
          ellipse(ctx, 0, -10, 3.6, 10); fillStroke(ctx, c.main, c.outline);
          ellipse(ctx, 0, -10, 1.8, 7); ctx.fillStyle = '#f7a8b8'; ctx.fill();
          ctx.restore();
        }
        ellipse(ctx, h.x, h.y, h.rx, h.ry); fillStroke(ctx, c.main, c.outline);
        ellipse(ctx, h.x + h.rx * 0.95, h.y + h.ry * 0.1, 1.6, 1.3); ctx.fillStyle = '#e86a8a'; ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = c.outline; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.rect(h.x + h.rx * 0.62, h.y + h.ry * 0.5, 2.6, 3.2); ctx.fill(); ctx.stroke();
        ellipse(ctx, h.x + h.rx * 0.25, h.y + h.ry * 0.38, 2.4, 1.5); ctx.fillStyle = 'rgba(255,120,150,0.45)'; ctx.fill();
      },
      arm: armSimple,
    },

    penguin: {
      tail(ctx, P, c) {
        const b = P.body;
        ctx.beginPath();
        ctx.moveTo(b.cx - b.rx * 0.7, b.cy + b.ry * 0.5);
        ctx.lineTo(b.cx - b.rx * 1.25, b.cy + b.ry * 0.85);
        ctx.lineTo(b.cx - b.rx * 0.5, b.cy + b.ry * 0.8);
        ctx.closePath(); fillStroke(ctx, c.main, c.outline);
      },
      belly(ctx, P, c) {
        const b = P.body;
        ellipse(ctx, b.cx + b.rx * 0.3, b.cy + b.ry * 0.12, b.rx * 0.68, b.ry * 0.8); ctx.fillStyle = '#f8f8f4'; ctx.fill();
      },
      head(ctx, P, c) {
        const h = P.head;
        ellipse(ctx, h.x, h.y, h.rx, h.ry); fillStroke(ctx, c.main, c.outline);
        ellipse(ctx, h.x + h.rx * 0.35, h.y + h.ry * 0.05, h.rx * 0.55, h.ry * 0.6); ctx.fillStyle = '#f8f8f4'; ctx.fill();
        // bico
        ctx.beginPath();
        ctx.moveTo(h.x + h.rx * 0.8, h.y - h.ry * 0.05);
        ctx.lineTo(h.x + h.rx * 1.45, h.y + h.ry * 0.25);
        ctx.lineTo(h.x + h.rx * 0.8, h.y + h.ry * 0.5);
        ctx.closePath(); fillStroke(ctx, '#f4a23a', shade('#f4a23a', -0.5), 1.2);
        ellipse(ctx, h.x + h.rx * 0.2, h.y + h.ry * 0.5, 2.2, 1.3); ctx.fillStyle = 'rgba(255,120,150,0.5)'; ctx.fill();
      },
      arm(ctx, P, c) {
        const b = P.body;
        const flap = (P.state === 'jump') ? -0.9 : (P.state === 'run' || P.duck) ? Math.sin(P.phase * TAU) * 0.35 : 0;
        ctx.save();
        ctx.translate(b.cx - b.rx * 0.1, b.cy - b.ry * 0.35);
        ctx.rotate(0.25 + flap);
        ellipse(ctx, 0, 8, 3.8, 10); fillStroke(ctx, shade(c.main, -0.15), c.outline);
        ctx.restore();
      },
    },

    fox: {
      tail(ctx, P, c) {
        const b = P.body, w = Math.sin(P.phase * TAU) * 0.12;
        ctx.save();
        ctx.translate(b.cx - b.rx * 0.8, b.cy + b.ry * 0.05);
        ctx.rotate(-0.5 + w);
        ellipse(ctx, -11, 0, 12, 6); fillStroke(ctx, c.main, c.outline);
        ellipse(ctx, -19, 0, 4.5, 4.2); ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.restore();
      },
      head(ctx, P, c) {
        const h = P.head;
        for (const dx of [-0.55, 0.2]) {
          ctx.beginPath();
          ctx.moveTo(h.x + h.rx * (dx - 0.3), h.y - h.ry * 0.55);
          ctx.lineTo(h.x + h.rx * (dx + 0.05), h.y - h.ry * 1.75);
          ctx.lineTo(h.x + h.rx * (dx + 0.45), h.y - h.ry * 0.65);
          ctx.closePath(); fillStroke(ctx, c.main, c.outline);
          ctx.beginPath();
          ctx.moveTo(h.x + h.rx * (dx - 0.07), h.y - h.ry * 1.25);
          ctx.lineTo(h.x + h.rx * (dx + 0.05), h.y - h.ry * 1.72);
          ctx.lineTo(h.x + h.rx * (dx + 0.2), h.y - h.ry * 1.25);
          ctx.fillStyle = '#2b2d42'; ctx.fill();
        }
        ellipse(ctx, h.x, h.y, h.rx, h.ry); fillStroke(ctx, c.main, c.outline);
        // focinho pontudo
        ctx.beginPath();
        ctx.moveTo(h.x + h.rx * 0.1, h.y + h.ry * 0.05);
        ctx.quadraticCurveTo(h.x + h.rx * 1.2, h.y - h.ry * 0.05, h.x + h.rx * 1.55, h.y + h.ry * 0.25);
        ctx.quadraticCurveTo(h.x + h.rx * 1.0, h.y + h.ry * 0.95, h.x + h.rx * 0.05, h.y + h.ry * 0.8);
        ctx.closePath(); fillStroke(ctx, '#ffffff', c.outline, 1.5);
        ellipse(ctx, h.x + h.rx * 1.5, h.y + h.ry * 0.22, 1.8, 1.5); ctx.fillStyle = '#1b1b24'; ctx.fill();
      },
      arm: armSimple,
    },
  };

  function armSimple(ctx, P, c) {
    const b = P.body, sw = (P.state === 'run' || P.duck) ? Math.sin(P.phase * TAU + Math.PI) * 3 : (P.state === 'jump' ? -3 : 0);
    ctx.lineCap = 'round';
    for (const [col, lw] of [[c.outline, 6], [c.main, 3.5]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(b.cx + b.rx * 0.45, b.cy - b.ry * 0.25); ctx.lineTo(b.cx + b.rx * 0.85 + sw * 0.4, b.cy + b.ry * 0.35 + sw); ctx.stroke();
    }
  }

  /* ---------------- Acessórios: desenho ---------------- */
  function drawHat(ctx, P, type, col) {
    if (type === 'none') return;
    const h = P.head;
    const x = h.x - h.rx * 0.05, y = h.y - h.ry * 0.78, w = h.rx * 1.75;
    const ol = shade(col, -0.6);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(P.duck ? 0.12 : -0.06);
    ctx.lineJoin = 'round';
    switch (type) {
      case 'cap': {
        ctx.beginPath(); ctx.arc(0, 1, w * 0.5, Math.PI, 0); ctx.closePath(); fillStroke(ctx, col, ol, 1.6);
        ellipse(ctx, w * 0.55, 1, w * 0.36, 2.4); fillStroke(ctx, shade(col, -0.2), ol, 1.4);
        ellipse(ctx, 0, 1 - w * 0.5, 1.8, 1.4); ctx.fillStyle = shade(col, -0.3); ctx.fill();
        break;
      }
      case 'tophat': {
        roundRect(ctx, -w * 0.36, -w * 0.95, w * 0.72, w * 0.95, 2); fillStroke(ctx, col, ol, 1.6);
        ctx.fillStyle = col === '#e63946' ? '#2b2d42' : '#e63946';
        ctx.fillRect(-w * 0.36 + 1, -w * 0.28, w * 0.72 - 2, 3.5);
        ellipse(ctx, 0, 0.5, w * 0.62, 2.6); fillStroke(ctx, col, ol, 1.6);
        break;
      }
      case 'crown': {
        const gw = w * 0.42, gh = w * 0.55;
        ctx.beginPath();
        ctx.moveTo(-gw, 1); ctx.lineTo(-gw, -gh * 0.6); ctx.lineTo(-gw * 0.5, -gh * 0.2); ctx.lineTo(0, -gh);
        ctx.lineTo(gw * 0.5, -gh * 0.2); ctx.lineTo(gw, -gh * 0.6); ctx.lineTo(gw, 1); ctx.closePath();
        fillStroke(ctx, col === '#ffffff' ? '#ffd166' : col, ol, 1.4);
        for (const [gx, gc] of [[-gw * 0.55, '#e63946'], [0, '#118ab2'], [gw * 0.55, '#06d6a0']]) {
          ellipse(ctx, gx, -2.5, 1.8, 1.8); ctx.fillStyle = gc; ctx.fill();
        }
        break;
      }
      case 'cowboy': {
        ctx.beginPath();
        ctx.moveTo(-w * 0.32, 0); ctx.quadraticCurveTo(-w * 0.36, -w * 0.62, 0, -w * 0.55);
        ctx.quadraticCurveTo(w * 0.36, -w * 0.62, w * 0.32, 0); ctx.closePath(); fillStroke(ctx, col, ol, 1.6);
        ctx.fillStyle = shade(col, -0.35); ctx.fillRect(-w * 0.31, -4.5, w * 0.62, 3);
        ctx.beginPath();
        ctx.moveTo(-w * 0.85, -4); ctx.quadraticCurveTo(-w * 0.6, 3, 0, 2.5); ctx.quadraticCurveTo(w * 0.6, 3, w * 0.85, -4);
        ctx.quadraticCurveTo(w * 0.6, 0, 0, -0.5); ctx.quadraticCurveTo(-w * 0.6, 0, -w * 0.85, -4); ctx.closePath();
        fillStroke(ctx, col, ol, 1.4);
        break;
      }
      case 'beanie': {
        ctx.beginPath(); ctx.ellipse(0, 2, w * 0.54, w * 0.55, 0, Math.PI, 0); ctx.closePath(); fillStroke(ctx, col, ol, 1.6);
        ctx.strokeStyle = shade(col, -0.25); ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * w * 0.15, -1); ctx.lineTo(i * w * 0.12, -w * 0.4); ctx.stroke(); }
        roundRect(ctx, -w * 0.58, -2, w * 1.16, 5, 2); fillStroke(ctx, shade(col, -0.2), ol, 1.4);
        ellipse(ctx, 0, -w * 0.55 + 1, 3.6, 3.6); fillStroke(ctx, '#ffffff', ol, 1.2);
        break;
      }
      case 'party': {
        ctx.save();
        ctx.beginPath(); ctx.moveTo(-w * 0.32, 1); ctx.lineTo(w * 0.32, 1); ctx.lineTo(w * 0.05, -w * 1.05); ctx.closePath();
        fillStroke(ctx, col, ol, 1.4);
        ctx.clip();
        ctx.fillStyle = col === '#ffd166' ? '#e63946' : '#ffd166';
        for (let i = 0; i < 4; i++) { ctx.fillRect(-w, -i * w * 0.28 - 2, w * 2, 2.6); }
        ctx.restore();
        ellipse(ctx, w * 0.05, -w * 1.05, 2.8, 2.8); fillStroke(ctx, '#ffffff', ol, 1);
        break;
      }
      case 'bow': {
        ctx.translate(w * 0.25, -1);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, -6); ctx.lineTo(-8, 6); ctx.closePath(); fillStroke(ctx, col, ol, 1.3);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, -6); ctx.lineTo(8, 6); ctx.closePath(); fillStroke(ctx, col, ol, 1.3);
        ellipse(ctx, 0, 0, 2.6, 2.6); fillStroke(ctx, shade(col, -0.2), ol, 1.2);
        break;
      }
      case 'viking': {
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * w * 0.4, -2); ctx.quadraticCurveTo(s * w * 0.85, -4, s * w * 0.75, -w * 0.75);
          ctx.quadraticCurveTo(s * w * 0.65, -w * 0.3, s * w * 0.3, -w * 0.2); ctx.closePath();
          fillStroke(ctx, '#f6efe0', '#6b5d4f', 1.3);
        }
        ctx.beginPath(); ctx.arc(0, 2, w * 0.5, Math.PI, 0); ctx.closePath(); fillStroke(ctx, col, ol, 1.6);
        ctx.fillStyle = shade(col, -0.3); ctx.fillRect(-w * 0.5, -1, w, 3);
        ctx.fillRect(-1.2, -w * 0.48, 2.4, w * 0.48);
        break;
      }
    }
    ctx.restore();
  }

  function drawGlasses(ctx, P, type, col) {
    if (type === 'none' || P.state === 'dead') return;
    const { x, y } = P.eye, h = P.head;
    const backX = h.x - h.rx * 0.55;
    const ol = shade(col, -0.5);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const arm = (yy) => { ctx.strokeStyle = col === '#ffffff' ? '#8a8f98' : col; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 4, yy); ctx.lineTo(backX, yy - 1); ctx.stroke(); };
    switch (type) {
      case 'sun': {
        arm(y - 1.5);
        roundRect(ctx, x - 4.6, y - 3.6, 10, 6.6, 2.6); fillStroke(ctx, '#15151d', col, 1.5);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 2.5, y - 1.5); ctx.lineTo(x - 0.5, y - 2.6); ctx.stroke();
        break;
      }
      case 'round': {
        arm(y - 1);
        ellipse(ctx, x + 0.3, y, 4.8, 4.8); ctx.fillStyle = 'rgba(200,235,255,0.25)'; ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke();
        break;
      }
      case 'nerd': {
        arm(y - 2);
        ctx.strokeStyle = col; ctx.lineWidth = 2.6;
        roundRect(ctx, x - 4.8, y - 4, 10, 8, 1.5); ctx.fillStyle = 'rgba(200,235,255,0.2)'; ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 4.5, y - 1, 2, 2);
        break;
      }
      case 'star': {
        arm(y - 1);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 2.6 : 6;
          ctx.lineTo(x + 0.5 + Math.cos(a) * r, y + 0.4 + Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = ol; ctx.lineWidth = 1; ctx.stroke();
        ellipse(ctx, x + 0.8, y + 0.3, 1.5, 1.7); ctx.fillStyle = '#1b1b24'; ctx.fill();
        break;
      }
      case 'mask': {
        const flow = Math.sin(P.phase * Math.PI * 2) * 2;
        ctx.fillStyle = col; ctx.strokeStyle = ol; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(backX - 2, y - 2); ctx.lineTo(backX - 11, y - 5 + flow); ctx.lineTo(backX - 9, y + 1 + flow); ctx.closePath(); ctx.fill(); ctx.stroke();
        roundRect(ctx, backX - 2, y - 3.6, (x + 6) - (backX - 2), 7.2, 3); ctx.fill(); ctx.stroke();
        ellipse(ctx, x + 0.6, y, 2.6, 2.4); ctx.fillStyle = '#ffffff'; ctx.fill();
        ellipse(ctx, x + 1.2, y + 0.2, 1.3, 1.4); ctx.fillStyle = '#1b1b24'; ctx.fill();
        break;
      }
    }
    ctx.restore();
  }

  function drawOutfitBack(ctx, P, type, col) {
    if (type !== 'cape') return;
    const b = P.body, n = P.neck;
    const wave = Math.sin(P.phase * TAU) * 3;
    const run = (P.state === 'run' || P.duck) ? 1 : 0.4;
    ctx.beginPath();
    ctx.moveTo(n.x + 2, n.y - 1);
    ctx.quadraticCurveTo(b.cx - b.rx * 1.2, b.cy - b.ry * 0.9 - 4 * run, b.cx - b.rx * (1.3 + run * 0.7), b.cy + b.ry * 0.3 + wave);
    ctx.lineTo(b.cx - b.rx * (0.9 + run * 0.4), b.cy + b.ry * 0.85 - wave * 0.5);
    ctx.quadraticCurveTo(b.cx - b.rx * 0.3, b.cy, n.x + 4, n.y + 3);
    ctx.closePath();
    fillStroke(ctx, col, shade(col, -0.55), 1.6);
  }

  function drawOutfitFront(ctx, P, type, col, c) {
    if (type === 'none' || type === 'cape') return;
    const b = P.body, n = P.neck;
    const ol = shade(col, -0.55);
    if (type === 'tshirt' || type === 'stripes' || type === 'vest') {
      ctx.save();
      ellipse(ctx, b.cx, b.cy, b.rx - 0.5, b.ry - 0.5); ctx.clip();
      const top = b.cy - b.ry * 0.95, bottom = b.cy + b.ry * 0.5;
      if (type === 'vest') {
        ctx.fillStyle = col; ctx.fillRect(b.cx - b.rx, top, b.rx * 1.25, bottom - top);
        ctx.fillStyle = shade(col, -0.25);
        for (let i = 0; i < 2; i++) { ellipse(ctx, b.cx + b.rx * 0.1, top + 8 + i * 6, 1, 1); ctx.fill(); }
      } else {
        ctx.fillStyle = col; ctx.fillRect(b.cx - b.rx, top, b.rx * 2, bottom - top);
        if (type === 'stripes') {
          ctx.fillStyle = col === '#ffffff' ? '#2b2d42' : '#ffffff';
          for (let yy = top + 3; yy < bottom; yy += 6) ctx.fillRect(b.cx - b.rx, yy, b.rx * 2, 2.4);
        } else {
          // estrelinha no peito
          ctx.fillStyle = col === '#ffd166' ? '#e63946' : '#ffd166';
          const sx = b.cx + b.rx * 0.35, sy = b.cy - b.ry * 0.15;
          ctx.beginPath();
          for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.4 : 3.2; ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
          ctx.fill();
        }
      }
      ctx.strokeStyle = ol; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(b.cx - b.rx, bottom); ctx.lineTo(b.cx + b.rx, bottom); ctx.stroke();
      ctx.restore();
      ellipse(ctx, b.cx, b.cy, b.rx, b.ry); ctx.strokeStyle = c.outline; ctx.lineWidth = 2; ctx.stroke();
      return;
    }
  }

  function drawNeckwear(ctx, P, type, col) {
    const n = P.neck, ol = shade(col, -0.55);
    if (type === 'scarf') {
      const flow = Math.sin(P.phase * TAU) * 2.5;
      ctx.beginPath();
      ctx.moveTo(n.x - 1, n.y); ctx.lineTo(n.x - 13, n.y + 1 + flow); ctx.lineTo(n.x - 12, n.y + 6 + flow); ctx.lineTo(n.x + 1, n.y + 4); ctx.closePath();
      fillStroke(ctx, col, ol, 1.3);
      roundRect(ctx, n.x - 6, n.y - 3, 15, 7, 3.4); fillStroke(ctx, col, ol, 1.4);
      ctx.fillStyle = col === '#ffffff' ? '#e63946' : '#ffffff';
      ctx.fillRect(n.x - 2, n.y - 2.5, 2, 6); ctx.fillRect(n.x + 3, n.y - 2.5, 2, 6);
    } else if (type === 'bowtie') {
      const x = n.x + 6, y = n.y + 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y - 4); ctx.lineTo(x - 5, y + 4); ctx.closePath(); fillStroke(ctx, col, ol, 1.2);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 5, y - 4); ctx.lineTo(x + 5, y + 4); ctx.closePath(); fillStroke(ctx, col, ol, 1.2);
      ellipse(ctx, x, y, 1.8, 1.8); fillStroke(ctx, shade(col, -0.2), ol, 1);
    } else if (type === 'tie') {
      const x = n.x + 7, y = n.y + 1;
      ctx.beginPath(); ctx.moveTo(x - 2.5, y); ctx.lineTo(x + 2.5, y); ctx.lineTo(x + 1.5, y + 3); ctx.lineTo(x - 1.5, y + 3); ctx.closePath(); fillStroke(ctx, col, ol, 1.1);
      ctx.beginPath(); ctx.moveTo(x - 1.5, y + 3); ctx.lineTo(x + 1.5, y + 3); ctx.lineTo(x + 3, y + 13); ctx.lineTo(x, y + 16); ctx.lineTo(x - 3, y + 13); ctx.closePath(); fillStroke(ctx, col, ol, 1.1);
    }
  }

  function drawShoe(ctx, f, type, col) {
    const x = f.x, y = f.y, ol = shade(col, -0.6);
    ctx.lineJoin = 'round';
    switch (type) {
      case 'sneakers':
        roundRect(ctx, x - 4, y - 7, 13, 7, 3.4); fillStroke(ctx, col, ol, 1.4);
        roundRect(ctx, x - 4.5, y - 2.4, 14, 2.8, 1.2); fillStroke(ctx, '#ffffff', ol, 1);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x - 1, y - 4.5); ctx.lineTo(x + 4, y - 6); ctx.stroke();
        break;
      case 'hightop':
        roundRect(ctx, x - 4, y - 12, 7.5, 10, 2); fillStroke(ctx, col, ol, 1.4);
        roundRect(ctx, x - 4, y - 6.5, 13, 6.5, 3.2); fillStroke(ctx, col, ol, 1.4);
        roundRect(ctx, x + 4, y - 5.5, 5, 4, 2); ctx.fillStyle = '#ffffff'; ctx.fill();
        roundRect(ctx, x - 4.5, y - 2.4, 14, 2.8, 1.2); fillStroke(ctx, '#ffffff', ol, 1);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.9;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 2, y - 10 + i * 2.6); ctx.lineTo(x + 2, y - 10 + i * 2.6); ctx.stroke(); }
        break;
      case 'boots':
        roundRect(ctx, x - 4.5, y - 13, 8.5, 12, 2); fillStroke(ctx, col, ol, 1.4);
        roundRect(ctx, x - 4.5, y - 6.5, 13.5, 6.5, 3); fillStroke(ctx, col, ol, 1.4);
        ctx.fillStyle = shade(col, -0.35); ctx.fillRect(x - 4.5, y - 2, 13.5, 2);
        ctx.fillRect(x - 4.5, y - 13, 8.5, 2.4);
        break;
      case 'skates':
        roundRect(ctx, x - 4, y - 12, 12, 9, 3); fillStroke(ctx, col, ol, 1.4);
        ctx.fillStyle = '#9aa3ad'; ctx.fillRect(x - 4, y - 4, 12, 1.8);
        for (const wx of [x - 1.5, x + 5.5]) { ellipse(ctx, wx, y - 1, 2.4, 2.4); fillStroke(ctx, '#ffd166', '#6b5d4f', 1); }
        break;
    }
  }

  /* ---------------- Desenho principal ---------------- */
  /**
   * Desenha um personagem.
   * @param ctx contexto 2D
   * @param x,y posição do canto inferior esquerdo (pés no chão)
   * @param opts { species, profile, state, phase, scale, blink }
   */
  function draw(ctx, x, y, opts) {
    const id = SPECIES[opts.species] ? opts.species : 'dino';
    const spec = SPECIES[id], parts = PARTS[id];
    const prof = Object.assign(defaultProfile(id), opts.profile || {});
    const state = opts.state || 'idle';
    const P = computePose(spec, state, opts.phase || 0);
    const main = prof.color;
    const c = {
      main,
      outline: shade(main, -0.62),
      belly: shade(main, 0.62),
      leg: shade(main, -0.12),
      dark: shade(main, -0.32),
      accent: shade(main, -0.28),
    };
    const s = opts.scale || 1;
    ctx.save();
    ctx.translate(x, y - GROUND * s);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';

    drawOutfitBack(ctx, P, prof.outfit, prof.outfitColor);
    parts.tail(ctx, P, c);
    // perna de trás
    drawLeg(ctx, P.feet[0], c, spec.legW);
    if (prof.shoes !== 'none') drawShoe(ctx, P.feet[0], prof.shoes, shade(prof.shoesColor, -0.12));
    else drawFoot(ctx, P.feet[0], c, id);
    // corpo
    if (parts.back) parts.back(ctx, P, c);
    ellipse(ctx, P.body.cx, P.body.cy, P.body.rx, P.body.ry);
    fillStroke(ctx, main, c.outline);
    ctx.save();
    ellipse(ctx, P.body.cx, P.body.cy, P.body.rx - 1, P.body.ry - 1); ctx.clip();
    if (parts.belly) parts.belly(ctx, P, c);
    else { ellipse(ctx, P.body.cx + P.body.rx * 0.45, P.body.cy + P.body.ry * 0.25, P.body.rx * 0.6, P.body.ry * 0.7); ctx.fillStyle = c.belly; ctx.fill(); }
    ctx.restore();
    drawOutfitFront(ctx, P, prof.outfit, prof.outfitColor, c);
    // perna da frente
    drawLeg(ctx, P.feet[1], c, spec.legW);
    if (prof.shoes !== 'none') drawShoe(ctx, P.feet[1], prof.shoes, prof.shoesColor);
    else drawFoot(ctx, P.feet[1], c, id);
    // cabeça
    if (id !== 'dino') drawNeckwear(ctx, P, prof.outfit, prof.outfitColor);
    parts.head(ctx, P, c);
    if (id === 'dino') drawNeckwear(ctx, P, prof.outfit, prof.outfitColor);
    parts.arm(ctx, P, c);
    drawEye(ctx, P, c, opts.blink);
    drawGlasses(ctx, P, prof.glasses, prof.glassesColor);
    drawHat(ctx, P, prof.hat, prof.hatColor);
    ctx.restore();
    return P;
  }

  /** Ponto mais alto do personagem (para posicionar a etiqueta de nome). */
  function topOf(speciesId, state, profile) {
    const spec = SPECIES[speciesId] || SPECIES.dino;
    const P = computePose(spec, state, 0);
    let top = P.head.y - P.head.ry;
    if (speciesId === 'bunny' && state !== 'duck') top -= 16;
    if (speciesId === 'cat' || speciesId === 'fox') top -= P.head.ry * 0.7;
    if (profile && profile.hat && profile.hat !== 'none') top = Math.min(top, P.head.y - P.head.ry - (profile.hat === 'tophat' || profile.hat === 'party' ? 20 : 10));
    return { top, x: P.head.x };
  }

  DG.characters = {
    GROUND, SPECIES, SPECIES_ORDER, BODY_COLORS, ACC_COLORS, ACCESSORIES,
    defaultProfile, draw, hitboxes, topOf,
  };
})();

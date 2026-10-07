/* ==========================================================
   Dino Game — utilitários compartilhados
   ========================================================== */
(function () {
  'use strict';
  const DG = (window.DG = window.DG || {});

  /** Converte "#rgb"/"#rrggbb" em [r,g,b]. */
  function hexToRgb(hex) {
    let c = String(hex).replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const n = parseInt(c, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(r, g, b) {
    const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + h(r) + h(g) + h(b);
  }

  /** Clareia (amt > 0) ou escurece (amt < 0) uma cor. amt entre -1 e 1. */
  function shade(hex, amt) {
    let [r, g, b] = hexToRgb(hex);
    if (amt < 0) {
      r *= 1 + amt; g *= 1 + amt; b *= 1 + amt;
    } else {
      r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt;
    }
    return rgbToHex(r, g, b);
  }

  /** Interpola duas cores hex. */
  function mix(a, b, t) {
    if (t <= 0) return a;
    if (t >= 1) return b;
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }

  /** Interpola paletas inteiras (objetos com cores hex). */
  function mixPalette(a, b, t) {
    if (t <= 0) return a;
    if (t >= 1) return b;
    const out = {};
    for (const k in a) {
      const va = a[k], vb = b[k];
      if (typeof va === 'string' && va[0] === '#' && typeof vb === 'string') out[k] = mix(va, vb, t);
      else if (typeof va === 'number' && typeof vb === 'number') out[k] = va + (vb - va) * t;
      else out[k] = t < 0.5 ? va : vb;
    }
    return out;
  }

  function rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }

  /** Hash determinístico 0..1 (para cenários procedurais). */
  function hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function ellipse(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2);
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /** Nome amigável de uma tecla (KeyboardEvent.code). */
  const KEY_NAMES = {
    Space: 'Espaço', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Enter: 'Enter', Escape: 'Esc', ShiftLeft: 'Shift', ShiftRight: 'Shift Dir.',
    ControlLeft: 'Ctrl', ControlRight: 'Ctrl Dir.', AltLeft: 'Alt', AltRight: 'Alt Gr',
    Tab: 'Tab', Backspace: 'Backspace', CapsLock: 'Caps Lock',
  };
  function keyName(code) {
    if (!code) return '—';
    if (KEY_NAMES[code]) return KEY_NAMES[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
    return code;
  }

  DG.util = { hexToRgb, rgbToHex, shade, mix, mixPalette, rgba, hash, ellipse, roundRect, rand, randInt, pick, clamp, keyName };
})();

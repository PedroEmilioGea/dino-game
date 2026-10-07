/* ==========================================================
   Dino Game — efeitos sonoros sintetizados (Web Audio)
   Nenhum arquivo de áudio é necessário: tudo é gerado na hora.
   ========================================================== */
(function () {
  'use strict';
  const DG = (window.DG = window.DG || {});
  let ctx = null;

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime + (delay || 0);
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol || 0.08, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  const sfx = {
    enabled: true,
    unlock() { ac(); },
    jump() { if (this.enabled) tone(520, 0.12, 'square', 0.06, 880); },
    point() { if (this.enabled) { tone(880, 0.08, 'square', 0.05); tone(1320, 0.12, 'square', 0.05, null, 0.09); } },
    hit() { if (this.enabled) { tone(220, 0.25, 'sawtooth', 0.08, 70); tone(110, 0.3, 'square', 0.05, 55, 0.05); } },
    click() { if (this.enabled) tone(660, 0.05, 'triangle', 0.05); },
    record() { if (this.enabled) [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.05, null, i * 0.11)); },
  };

  DG.sfx = sfx;
})();

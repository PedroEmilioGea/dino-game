/* ==========================================================
   Dino Game — configurações salvas (localStorage)
   ========================================================== */
(function () {
  'use strict';
  const DG = (window.DG = window.DG || {});
  const KEY = 'dinogame.save.v1';

  const DEFAULT_KEYS = { jump: 'Space', jump2: 'ArrowUp', duck: 'ArrowDown', pause: 'KeyP' };

  function defaults() {
    const profiles = {};
    for (const id of DG.characters.SPECIES_ORDER) profiles[id] = DG.characters.defaultProfile(id);
    return {
      species: 'dino',
      profiles,
      scene: 'desert',
      speed: 'normal',
      dayNight: true,
      uiTheme: 'system', // light | dark | system
      sound: true,
      nameTag: true,
      keys: Object.assign({}, DEFAULT_KEYS),
      scores: [],
    };
  }

  function load() {
    const base = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return base;
      const data = JSON.parse(raw);
      const out = Object.assign(base, data);
      out.keys = Object.assign({}, DEFAULT_KEYS, data.keys || {});
      out.profiles = base.profiles;
      for (const id of DG.characters.SPECIES_ORDER) {
        out.profiles[id] = Object.assign(DG.characters.defaultProfile(id), (data.profiles || {})[id] || {});
      }
      if (!Array.isArray(out.scores)) out.scores = [];
      return out;
    } catch (e) {
      return base;
    }
  }

  const store = {
    data: null,
    DEFAULT_KEYS,
    init() { this.data = load(); return this.data; },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* armazenamento indisponível */ }
    },
    profile() { return this.data.profiles[this.data.species]; },
    hiScore() { return this.data.scores.reduce((m, s) => Math.max(m, s.score), 0); },
    /** Registra uma pontuação; retorna a posição (1..10) ou 0. */
    addScore(entry) {
      const list = this.data.scores.slice();
      list.push(entry);
      list.sort((a, b) => b.score - a.score);
      this.data.scores = list.slice(0, 10);
      this.save();
      const idx = this.data.scores.indexOf(entry);
      return idx >= 0 ? idx + 1 : 0;
    },
    resetScores() { this.data.scores = []; this.save(); },
    resetAll() { this.data = defaults(); this.save(); },
  };

  DG.store = store;
})();

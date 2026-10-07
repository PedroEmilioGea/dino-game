/* ==========================================================
   Dino Game — motor do jogo
   Física em passo fixo (60 Hz), geração de obstáculos,
   colisão, pontuação, ciclo dia/noite e renderização.
   ========================================================== */
(function () {
  'use strict';
  const DG = (window.DG = window.DG || {});
  const U = DG.util;
  const CH = DG.characters;
  const TH = DG.themes;
  const { W, H, GROUND } = TH;

  const SPEEDS = {
    slow: { label: 'Lento', desc: 'Para aquecer', base: 6.5, max: 11, accel: 0.0011 },
    normal: { label: 'Normal', desc: 'Como no Chrome', base: 8, max: 13.5, accel: 0.0015 },
    fast: { label: 'Rápido', desc: 'Reflexos afiados', base: 10, max: 16, accel: 0.0019 },
    insane: { label: 'Insano', desc: 'Boa sorte!', base: 12.5, max: 19, accel: 0.0024 },
  };
  const SPEED_ORDER = ['slow', 'normal', 'fast', 'insane'];

  const PHYS = { gravity: 0.8, jumpV: -13.6, cutV: -6.5, fastFall: 1.8 };
  const PLAYER_X = 70;
  const S = 1.2; // escala visual de personagem e obstáculos
  const STEP = 1 / 60;
  const NIGHT_EVERY = 700;

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  class Game {
    constructor(canvas, hooks) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.hooks = hooks || {};
      this.state = 'ready';
      this.debug = false;
      this.t = 0;
      this.view = { t: 0, far: 0, mid: 0, ground: 0, cloud: 0, n: 0 };
      this.baseNight = false;
      this.dust = [];
      this.applySettings();
      this.reset();
      this.resize();
      this._last = performance.now();
      this._acc = 0;
      this._loop = this._loop.bind(this);
      window.addEventListener('resize', () => this.resize());
      requestAnimationFrame(this._loop);
    }

    /* ---------- configuração ---------- */
    applySettings() {
      const d = DG.store.data;
      this.speciesId = d.species;
      this.profile = d.profiles[d.species];
      this.theme = TH.THEMES[d.scene] || TH.THEMES.desert;
      this.speedCfg = SPEEDS[d.speed] || SPEEDS.normal;
      this.dayNight = d.dayNight;
      this.nameTag = d.nameTag;
      this._hb = {
        stand: CH.hitboxes(this.speciesId, 'stand'),
        duck: CH.hitboxes(this.speciesId, 'duck'),
      };
      if (this.state !== 'running') this.speed = this.speedCfg.base;
    }

    setBaseNight(isDark) {
      this.baseNight = !!isDark;
      if (this.state !== 'running') this.view.n = this.targetNight();
    }

    targetNight() {
      let night = this.baseNight;
      if (this.dayNight && this.state !== 'ready' && Math.floor(this.score / NIGHT_EVERY) % 2 === 1) night = !night;
      return night ? 1 : 0;
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const scale = Math.max(0.2, (rect.width / W) * dpr);
      this.canvas.width = Math.round(W * scale);
      this.canvas.height = Math.round(H * scale);
      this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
      this.render();
    }

    /* ---------- ciclo de vida ---------- */
    reset() {
      this.obstacles = [];
      this.dust = [];
      this.score = 0;
      this.distance = 0;
      this.speed = this.speedCfg.base;
      this.spawnDist = 520;
      this.flash = 0;
      this.lastMilestone = 0;
      this.player = { y: 0, vy: 0, onGround: true, ducking: false, holdJump: false, fastFall: false, phase: 0 };
      this.blink = 0;
      this.overAt = 0;
      this.view.n = this.targetNight();
    }

    setState(s, info) {
      this.state = s;
      if (this.hooks.onState) this.hooks.onState(s, info || {});
    }

    start() {
      if (this.state === 'running') return;
      if (this.state === 'over') this.reset();
      DG.sfx.unlock();
      this.setState('running');
    }

    pause() { if (this.state === 'running') this.setState('paused'); }
    resume() { if (this.state === 'paused') { this._last = performance.now(); this.setState('running'); } }
    togglePause() { if (this.state === 'running') this.pause(); else if (this.state === 'paused') this.resume(); }

    toReady() { this.reset(); this.setState('ready'); }

    canRestart() { return this.state === 'over' && performance.now() - this.overAt > 450; }

    /* ---------- entrada ---------- */
    pressJump() {
      if (this.state === 'ready') { this.start(); this._jump(); return; }
      if (this.state === 'over') { if (this.canRestart()) { this.reset(); this.start(); } return; }
      if (this.state === 'paused') { this.resume(); return; }
      if (this.state === 'running') this._jump();
    }
    releaseJump() {
      const p = this.player;
      p.holdJump = false;
      if (!p.onGround && p.vy < PHYS.cutV) p.vy = PHYS.cutV;
    }
    _jump() {
      const p = this.player;
      p.holdJump = true;
      if (p.onGround) {
        p.vy = PHYS.jumpV;
        p.onGround = false;
        p.ducking = false;
        DG.sfx.jump();
      }
    }
    setDuck(on) {
      const p = this.player;
      if (this.state === 'ready' && on) { this.start(); }
      if (this.state !== 'running' && this.state !== 'ready') return;
      p.ducking = on && p.onGround;
      p.fastFall = on && !p.onGround;
      p.wantDuck = on;
    }

    /* ---------- loop ---------- */
    _loop(now) {
      let dt = (now - this._last) / 1000;
      this._last = now;
      if (dt > 0.25) dt = 0.25;
      this._acc += dt;
      let steps = 0;
      while (this._acc >= STEP && steps < 6) { this.step(); this._acc -= STEP; steps++; }
      if (steps === 6) this._acc = 0;
      this.render();
      requestAnimationFrame(this._loop);
    }

    step() {
      this.t += STEP;
      const v = this.view;
      v.t = this.t;
      const p = this.player;

      // dia/noite suave
      const target = this.targetNight();
      v.n += (target - v.n) * 0.03;
      if (Math.abs(target - v.n) < 0.002) v.n = target;

      if (this.state !== 'running') {
        if (this.state === 'ready') {
          v.cloud += 0.25;
          this.blink = (this.t % 3.2) < 0.14 ? 1 : 0;
        }
        this._updateDust();
        return;
      }

      // velocidade e distância
      const sp = this.speed;
      this.speed = Math.min(this.speedCfg.max, this.speed + this.speedCfg.accel);
      this.distance += sp;
      v.far += sp * 0.12; v.mid += sp * 0.4; v.ground += sp; v.cloud += sp * 0.22;
      this.score = Math.floor(this.distance * 0.025);
      const milestone = Math.floor(this.score / 100);
      if (milestone > this.lastMilestone) {
        this.lastMilestone = milestone;
        this.flash = 60;
        DG.sfx.point();
      }
      if (this.flash > 0) this.flash--;

      // jogador
      if (!p.onGround) {
        p.vy += PHYS.gravity + (p.fastFall ? PHYS.fastFall : 0);
        p.y += p.vy;
        if (p.y >= 0) {
          p.y = 0; p.vy = 0; p.onGround = true; p.fastFall = false;
          p.ducking = !!p.wantDuck;
          this._puff(8);
        }
      }
      p.phase = (p.phase + 0.0105 * sp) % 1;
      if (p.onGround && Math.random() < 0.18) this._puff(1);

      // obstáculos
      this.spawnDist -= sp;
      if (this.spawnDist <= 0) this._spawn();
      for (const o of this.obstacles) {
        o.x -= sp + (o.flyer ? o.vx : 0);
        if (o.flyer) o.frame = (o.frame + 0.035) % 1;
      }
      this.obstacles = this.obstacles.filter((o) => o.x + o.w > -60);

      this._updateDust();

      // colisão
      const pBoxes = this._playerBoxes();
      for (const o of this.obstacles) {
        if (o.x > PLAYER_X + 100) continue;
        for (const ob of this._obstacleBoxes(o)) {
          for (const pb of pBoxes) {
            if (overlap(pb, ob)) { this._gameOver(); return; }
          }
        }
      }
    }

    _spawn() {
      const th = this.theme, sp = this.speed, cfg = this.speedCfg;
      let o;
      if (this.score > 180 && Math.random() < 0.24) {
        const lift = U.pick([10, 44, 44, 86]);
        const fh = th.flyer.h * S;
        o = { flyer: true, s: S, x: W + 20, y: GROUND - lift - fh, bottom: GROUND - lift, w: th.flyer.w * S, h: fh, frame: Math.random(), vx: U.rand(0.2, 1.1) };
      } else {
        const kind = U.pick(th.obstacles);
        const cap = sp > cfg.base + 1.6 ? kind.max : Math.min(kind.max, sp > cfg.base + 0.7 ? 2 : 1);
        const count = U.randInt(1, cap);
        o = { kind: kind.id, s: S, x: W + 20, y: GROUND, w: kind.w * count * S, h: kind.h * S, kw: kind.w * S, count, seed: Math.random() * 1000 };
      }
      this.obstacles.push(o);
      const minGap = sp * 34 + 70;
      this.spawnDist = o.w + U.rand(minGap, minGap * 1.85);
    }

    _playerBoxes() {
      const p = this.player;
      const boxes = p.ducking ? this._hb.duck : this._hb.stand;
      const ox = PLAYER_X, oy = GROUND + p.y - CH.GROUND * S;
      return boxes.map((b) => ({ x: b.x * S + ox, y: b.y * S + oy, w: b.w * S, h: b.h * S }));
    }

    _obstacleBoxes(o) {
      if (o.flyer) return [{ x: o.x + 6, y: o.y + 5, w: o.w - 12, h: o.h - 10 }];
      const out = [];
      for (let i = 0; i < o.count; i++) out.push({ x: o.x + i * o.kw + 3, y: o.y - o.h + 4, w: o.kw - 6, h: o.h - 4 });
      return out;
    }

    _puff(n) {
      for (let i = 0; i < n; i++) {
        this.dust.push({
          x: PLAYER_X + 22 + U.rand(-6, 12), y: GROUND - 2,
          vx: -U.rand(0.5, 2.2) - (this.state === 'running' ? this.speed * 0.15 : 0), vy: -U.rand(0.2, 1.4),
          r: U.rand(1.5, 3.5), life: 1,
        });
      }
    }

    _updateDust() {
      for (const d of this.dust) { d.x += d.vx; d.y += d.vy; d.vy += 0.05; d.life -= 0.035; }
      this.dust = this.dust.filter((d) => d.life > 0);
    }

    _gameOver() {
      DG.sfx.hit();
      this.overAt = performance.now();
      const prof = this.profile;
      const prevBest = DG.store.hiScore();
      const entry = {
        name: prof.name || CH.SPECIES[this.speciesId].defaultName,
        species: this.speciesId, scene: DG.store.data.scene, speed: DG.store.data.speed,
        score: this.score, date: new Date().toISOString(),
      };
      const rank = this.score > 0 ? DG.store.addScore(entry) : 0;
      const isBest = this.score > prevBest && this.score > 0;
      if (isBest) setTimeout(() => DG.sfx.record(), 350);
      this.setState('over', { score: this.score, rank, isBest });
    }

    /* ---------- renderização ---------- */
    render() {
      const ctx = this.ctx, v = this.view, th = this.theme;
      const pal = TH.palette(th, v.n);
      this.pal = pal;
      TH.drawBackground(ctx, th, pal, v);
      TH.drawGround(ctx, th, pal, v);
      for (const o of this.obstacles) TH.drawObstacle(ctx, th, pal, o);

      // poeira
      ctx.save();
      for (const d of this.dust) {
        ctx.globalAlpha = Math.max(0, d.life) * 0.6;
        U.ellipse(ctx, d.x, d.y, d.r, d.r);
        ctx.fillStyle = pal.groundTop; ctx.fill();
      }
      ctx.restore();

      // jogador
      const p = this.player;
      let state = 'run';
      if (this.state === 'over') state = 'dead';
      else if (this.state === 'ready') state = 'idle';
      else if (!p.onGround) state = 'jump';
      else if (p.ducking) state = 'duck';
      const feetY = GROUND + p.y;
      // sombra
      ctx.save();
      ctx.globalAlpha = 0.18 * Math.max(0.2, 1 + p.y / 120);
      U.ellipse(ctx, PLAYER_X + 31, GROUND + 1, 19 * Math.max(0.4, 1 + p.y / 160), 3);
      ctx.fillStyle = '#000000'; ctx.fill();
      ctx.restore();
      CH.draw(ctx, PLAYER_X, feetY, {
        species: this.speciesId, profile: this.profile, state,
        phase: p.phase, blink: this.blink, scale: S,
      });
      if (this.nameTag && this.profile.name) this._drawNameTag(ctx, state, feetY, pal);

      th.ambient(ctx, pal, v);
      this._drawHud(ctx, pal);

      if (this.debug) {
        ctx.save(); ctx.strokeStyle = 'red'; ctx.lineWidth = 1;
        for (const b of this._playerBoxes()) ctx.strokeRect(b.x, b.y, b.w, b.h);
        for (const o of this.obstacles) for (const b of this._obstacleBoxes(o)) ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.restore();
      }
    }

    _drawNameTag(ctx, state, feetY, pal) {
      const info = CH.topOf(this.speciesId, state === 'duck' ? 'duck' : 'idle', this.profile);
      const name = this.profile.name;
      ctx.save();
      ctx.font = '600 11px "Nunito", system-ui, sans-serif';
      const tw = ctx.measureText(name).width + 14;
      const x = PLAYER_X + 31 - tw / 2, y = feetY + (info.top - CH.GROUND) * S - 22;
      U.roundRect(ctx, x, y, tw, 16, 8);
      ctx.fillStyle = U.rgba(pal.hud, 0.78); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + tw / 2 - 4, y + 16); ctx.lineTo(x + tw / 2 + 4, y + 16); ctx.lineTo(x + tw / 2, y + 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = v_isDark(pal.hud) ? '#ffffff' : '#111111';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(name, x + tw / 2, y + 8.5);
      ctx.restore();
    }

    _drawHud(ctx, pal) {
      const pad = (n) => String(Math.min(99999, n)).padStart(5, '0');
      ctx.save();
      ctx.font = '13px "Press Start 2P", ui-monospace, monospace';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'right';
      ctx.fillStyle = pal.hud;
      const hi = Math.max(DG.store.hiScore(), this.score);
      const showScore = !(this.flash > 0 && Math.floor(this.flash / 8) % 2 === 0);
      if (showScore) ctx.fillText(pad(this.score), W - 18, 16);
      ctx.globalAlpha = 0.65;
      ctx.fillText('HI ' + pad(hi), W - 18 - 92, 16);
      ctx.restore();
    }
  }

  function v_isDark(hex) {
    const [r, g, b] = U.hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 < 140;
  }

  DG.Game = Game;
  DG.SPEEDS = SPEEDS;
  DG.SPEED_ORDER = SPEED_ORDER;
  DG.PLAYER_X = PLAYER_X;
})();

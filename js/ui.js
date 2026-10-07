/* ==========================================================
   Dino Game — interface (menus, personalização, controles)
   ========================================================== */
(function () {
  'use strict';
  const DG = window.DG;
  const U = DG.util, CH = DG.characters, TH = DG.themes;
  const store = DG.store;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const sceneDlgOpen = () => $('#dlgScene') && $('#dlgScene').open;

  store.init();
  const data = store.data;
  DG.sfx.enabled = data.sound;

  /* ---------- Canvas com alta resolução ---------- */
  function hiDPI(canvas, w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  /** Miniatura de um personagem centralizada num canvas quadrado. */
  function drawThumb(canvas, species, profile, opts) {
    const size = (opts && opts.size) || 64;
    const ctx = hiDPI(canvas, size, size);
    ctx.clearRect(0, 0, size, size);
    const s = size / 76;
    CH.draw(ctx, (size - 56 * s) / 2 + 2 * s, size - 6 * s, {
      species, profile, state: (opts && opts.state) || 'idle', phase: 0.15, scale: s,
    });
  }

  /* ---------- Tema claro/escuro ---------- */
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function resolvedTheme() {
    if (data.uiTheme === 'system') return mq && mq.matches ? 'dark' : 'light';
    return data.uiTheme;
  }
  function applyTheme() {
    const t = resolvedTheme();
    document.documentElement.setAttribute('data-theme', t);
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#11121a' : '#f6f2ea');
    if (game) game.setBaseNight(t === 'dark');
    $$('#themeSeg button').forEach((b) => b.classList.toggle('active', b.dataset.val === data.uiTheme));
    if (sceneDlgOpen()) renderSceneCards();
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', () => data.uiTheme === 'system' && applyTheme());

  /* ---------- Jogo ---------- */
  const stage = $('#stage');
  const overlay = $('#overlay');
  let game = null;
  game = new DG.Game($('#game'), {
    onState(state, info) {
      overlay.dataset.state = state === 'running' ? 'none' : state;
      stage.classList.toggle('running', state === 'running');
      if (state === 'over') {
        $('#ovScore').textContent = String(info.score).padStart(5, '0');
        const badge = $('#ovBadge');
        badge.className = 'badge';
        if (info.isBest) { badge.textContent = '🏆 Novo recorde!'; badge.hidden = false; }
        else if (info.rank > 0 && info.rank <= 10) { badge.textContent = `#${info.rank} no ranking`; badge.classList.add('silver'); badge.hidden = false; }
        else badge.hidden = true;
        updateDock();
      }
      if (state === 'running' && document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    },
  });
  DG.game = game;
  applyTheme();

  /* ---------- Teclado ---------- */
  let capturing = null; // ação sendo reconfigurada
  const anyDialogOpen = () => $$('dialog[open]').length > 0;
  const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

  window.addEventListener('keydown', (e) => {
    if (capturing) { handleCapture(e); return; }
    if (anyDialogOpen() || isTyping(e.target)) return;
    const k = data.keys;
    if (e.code === k.jump || e.code === k.jump2) {
      e.preventDefault();
      if (!e.repeat) game.pressJump();
    } else if (e.code === k.duck) {
      e.preventDefault();
      game.setDuck(true);
    } else if (e.code === k.pause || (e.code === 'Escape' && (game.state === 'running' || game.state === 'paused'))) {
      e.preventDefault();
      if (!e.repeat) game.togglePause();
    } else if (e.code === 'Enter' && (game.state === 'over' || game.state === 'ready')) {
      e.preventDefault();
      game.pressJump();
    }
  }, true);

  window.addEventListener('keyup', (e) => {
    if (capturing || anyDialogOpen() || isTyping(e.target)) return;
    const k = data.keys;
    if (e.code === k.jump || e.code === k.jump2) { e.preventDefault(); game.releaseJump(); }
    else if (e.code === k.duck) { e.preventDefault(); game.setDuck(false); }
  }, true);

  document.addEventListener('visibilitychange', () => { if (document.hidden) game.pause(); });
  window.addEventListener('blur', () => game.pause());

  /* ---------- Toque / mouse no palco ---------- */
  const canvasEl = $('#game');
  let touchStartY = null;
  canvasEl.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    touchStartY = e.clientY;
    if (e.pointerType === 'touch') buzz();
    if (game.state === 'paused') { game.resume(); return; }
    game.pressJump();
  });
  canvasEl.addEventListener('pointermove', (e) => {
    if (touchStartY != null && e.clientY - touchStartY > 28) game.setDuck(true);
  });
  const endPointer = () => { if (touchStartY != null) { game.releaseJump(); game.setDuck(false); touchStartY = null; } };
  canvasEl.addEventListener('pointerup', endPointer);
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  canvasEl.addEventListener('pointercancel', endPointer);
  canvasEl.addEventListener('pointerleave', endPointer);

  function holdButton(btn, down, up) {
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); btn.classList.add('pressed'); btn.setPointerCapture && btn.setPointerCapture(e.pointerId); down(); });
    const end = () => { btn.classList.remove('pressed'); up(); };
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  const buzz = () => { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* sem vibração */ } };
  holdButton($('#tJump'), () => { buzz(); game.pressJump(); }, () => game.releaseJump());
  holdButton($('#tDuck'), () => game.setDuck(true), () => game.setDuck(false));

  $('#btnStart').addEventListener('click', () => { game.start(); });
  // tocar em qualquer parte do painel também começa / reinicia
  $('.ov-ready').addEventListener('click', () => game.start());
  $('.ov-over').addEventListener('click', (e) => { if (e.target.closest('button')) return; if (game.canRestart()) { game.reset(); game.start(); } });
  $('#btnPause').addEventListener('click', () => game.pause());
  $('#btnResume').addEventListener('click', () => game.resume());
  $('#btnRestartPause').addEventListener('click', () => { game.reset(); game.start(); });
  $('#btnRestart').addEventListener('click', () => { game.reset(); game.start(); });

  /* ---------- Tela cheia (celular) ---------- */
  const root = document.documentElement;
  const fsSupported = !!(root.requestFullscreen || root.webkitRequestFullscreen) && (document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const btnFull = $('#btnFull');
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  if (fsSupported && isCoarse) btnFull.hidden = false;
  btnFull.addEventListener('click', async () => {
    try {
      if (fsElement()) {
        await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        await (root.requestFullscreen || root.webkitRequestFullscreen).call(root, { navigationUI: 'hide' });
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }
    } catch (e) { toast('Tela cheia não disponível neste navegador'); }
  });
  const onFsChange = () => { btnFull.classList.toggle('on', !!fsElement()); setTimeout(() => game.resize(), 120); };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  window.addEventListener('orientationchange', () => setTimeout(() => game.resize(), 200));

  /* ---------- Cabeçalho ---------- */
  function updateSoundBtn() { $('#btnSound').classList.toggle('off', !data.sound); }
  $('#btnSound').addEventListener('click', () => {
    data.sound = !data.sound; DG.sfx.enabled = data.sound; store.save(); updateSoundBtn();
    $('#optSound').checked = data.sound;
    toast(data.sound ? 'Som ligado' : 'Som desligado');
  });
  $('#btnTheme').addEventListener('click', () => {
    data.uiTheme = resolvedTheme() === 'dark' ? 'light' : 'dark';
    store.save(); applyTheme();
  });

  function drawBrand() {
    const c = $('#brandIcon');
    const ctx = hiDPI(c, 48, 48);
    ctx.clearRect(0, 0, 48, 48);
    CH.draw(ctx, 3, 50, { species: data.species, profile: store.profile(), state: 'idle', phase: 0, scale: 0.72 });
  }

  /* ---------- Dock e dica ---------- */
  function updateDock() {
    const prof = store.profile();
    $('#dockChar').textContent = `${prof.name || '—'} · ${CH.SPECIES[data.species].label}`;
    $('#dockScene').textContent = `${TH.THEMES[data.scene].label} · ${DG.SPEEDS[data.speed].label}`;
    $('#dockScores').textContent = `Recorde ${String(store.hiScore()).padStart(5, '0')}`;
    const temaTxt = data.uiTheme === 'system' ? 'auto' : (data.uiTheme === 'dark' ? 'escuro' : 'claro');
    $('#dockSettings').textContent = isCoarse ? `Tema ${temaTxt} · som ${data.sound ? 'ligado' : 'desligado'}` : `Pular: ${U.keyName(data.keys.jump)} · Tema ${temaTxt}`;
    const k = data.keys;
    $('#hint').innerHTML =
      `<kbd class="key sm">${U.keyName(k.jump)}</kbd> / <kbd class="key sm">${U.keyName(k.jump2)}</kbd> pular (segure para pular mais alto) · ` +
      `<kbd class="key sm">${U.keyName(k.duck)}</kbd> abaixar / cair rápido · <kbd class="key sm">${U.keyName(k.pause)}</kbd> pausar`;
    $$('[data-key]').forEach((el) => { el.textContent = U.keyName(k[el.dataset.key]); });
    $$('[data-key-label]').forEach((el) => { el.textContent = U.keyName(k[el.dataset.keyLabel]); });
    drawBrand();
  }

  function applyAndRefresh() {
    store.save();
    game.applySettings();
    if (game.state !== 'running') game.render();
    updateDock();
  }

  /* ---------- Diálogos ---------- */
  function openDialog(id) {
    if (game.state === 'running') game.pause();
    const dlg = document.getElementById(id);
    if (id === 'dlgChar') buildChar();
    if (id === 'dlgScene') buildScene();
    if (id === 'dlgSettings') buildSettings();
    if (id === 'dlgScores') buildScores();
    dlg.showModal();
    DG.sfx.click();
  }
  $$('[data-open]').forEach((b) => b.addEventListener('click', () => openDialog(b.dataset.open)));
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); // clique fora fecha
    d.addEventListener('close', () => {
      if (capturing) stopCapture();
      if (d.id === 'dlgChar') stopPreview();
      if (game.state === 'over' || game.state === 'ready') game.toReady();
      updateDock();
    });
  });
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

  function playNow(dlgId) {
    document.getElementById(dlgId).close();
    game.toReady();
    setTimeout(() => game.start(), 60);
  }
  $('#btnCharPlay').addEventListener('click', () => playNow('dlgChar'));
  $('#btnScenePlay').addEventListener('click', () => playNow('dlgScene'));

  /* ==========================================================
     Personagem
     ========================================================== */
  let accTab = 'hat';
  let previewPose = 'run';
  let previewRAF = 0;

  function buildChar() {
    const prof = store.profile();
    $('#charName').value = prof.name;
    // espécies
    const sg = $('#speciesGrid');
    sg.innerHTML = '';
    for (const id of CH.SPECIES_ORDER) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'species-card' + (id === data.species ? ' active' : '');
      b.innerHTML = `<canvas></canvas><span>${data.profiles[id].name || CH.SPECIES[id].label}</span><small class="muted" style="margin:0">${CH.SPECIES[id].label}</small>`;
      drawThumb(b.querySelector('canvas'), id, data.profiles[id]);
      b.addEventListener('click', () => {
        data.species = id; DG.sfx.click(); applyAndRefresh(); buildChar();
      });
      sg.appendChild(b);
    }
    // cor do corpo
    buildSwatches($('#bodyColors'), CH.BODY_COLORS, prof.color, (c) => { store.profile().color = c; onCharChange(); });
    // abas de acessórios
    const tabs = $('#accTabs');
    tabs.innerHTML = '';
    for (const key of Object.keys(CH.ACCESSORIES)) {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab');
      b.className = key === accTab ? 'active' : '';
      b.innerHTML = CH.ACCESSORIES[key].label + (prof[key] !== 'none' ? '<span class="dot"></span>' : '');
      b.addEventListener('click', () => { accTab = key; buildChar(); });
      tabs.appendChild(b);
    }
    buildAccGrid();
    startPreview();
  }

  function buildAccGrid() {
    const prof = store.profile();
    const grid = $('#accGrid');
    grid.innerHTML = '';
    for (const [val, label] of CH.ACCESSORIES[accTab].options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'acc-card' + (prof[accTab] === val ? ' active' : '');
      b.innerHTML = `<canvas></canvas><span>${label}</span>`;
      const p = Object.assign({}, prof, { [accTab]: val });
      drawThumb(b.querySelector('canvas'), data.species, p, { state: 'idle' });
      b.addEventListener('click', () => { store.profile()[accTab] = val; DG.sfx.click(); onCharChange(true); });
      grid.appendChild(b);
    }
    const colKey = accTab + 'Color';
    $('#accColorLabel').textContent = CH.ACCESSORIES[accTab].colorLabel;
    $('.acc-color').classList.toggle('disabled', prof[accTab] === 'none');
    buildSwatches($('#accColors'), CH.ACC_COLORS, prof[colKey], (c) => { store.profile()[colKey] = c; onCharChange(true); });
  }

  function buildSwatches(container, colors, current, onPick) {
    container.innerHTML = '';
    const list = colors.includes(current) ? colors : colors.concat([current]);
    for (const c of list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (c.toLowerCase() === String(current).toLowerCase() ? ' active' : '');
      b.style.background = c;
      b.title = c;
      b.setAttribute('aria-label', 'Cor ' + c);
      b.addEventListener('click', () => { onPick(c); });
      container.appendChild(b);
    }
    // cor personalizada
    const wrap = document.createElement('label');
    wrap.className = 'swatch swatch-custom';
    wrap.title = 'Cor personalizada';
    const inp = document.createElement('input');
    inp.type = 'color'; inp.value = /^#[0-9a-f]{6}$/i.test(current) ? current : '#888888';
    inp.addEventListener('input', () => onPick(inp.value));
    inp.addEventListener('change', () => onPick(inp.value));
    wrap.appendChild(inp);
    container.appendChild(wrap);
  }

  let rebuildTimer = 0;
  function onCharChange(accOnly) {
    store.save();
    game.applySettings();
    updateDock();
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => { if (accOnly) { buildAccGrid(); refreshTabsDots(); refreshSpeciesThumbs(); } else buildChar(); }, 30);
  }
  function refreshTabsDots() {
    const prof = store.profile();
    const keys = Object.keys(CH.ACCESSORIES);
    $$('#accTabs button').forEach((b, i) => { b.innerHTML = CH.ACCESSORIES[keys[i]].label + (prof[keys[i]] !== 'none' ? '<span class="dot"></span>' : ''); });
  }
  function refreshSpeciesThumbs() {
    $$('#speciesGrid .species-card').forEach((b, i) => {
      const id = CH.SPECIES_ORDER[i];
      drawThumb(b.querySelector('canvas'), id, data.profiles[id]);
    });
  }

  $('#charName').addEventListener('input', (e) => {
    store.profile().name = e.target.value.trim().slice(0, 14);
    store.save(); game.applySettings(); updateDock();
    const card = $('#speciesGrid .species-card.active span');
    if (card) card.textContent = store.profile().name || CH.SPECIES[data.species].label;
  });
  $('#charName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });

  $('#btnRandom').addEventListener('click', () => {
    const p = store.profile();
    const pickOpt = (k) => U.pick(CH.ACCESSORIES[k].options.map((o) => o[0]));
    p.color = U.pick(CH.BODY_COLORS);
    for (const k of Object.keys(CH.ACCESSORIES)) { p[k] = Math.random() < 0.75 ? pickOpt(k) : 'none'; p[k + 'Color'] = U.pick(CH.ACC_COLORS); }
    DG.sfx.click();
    onCharChange();
  });
  $('#btnResetChar').addEventListener('click', () => {
    const name = store.profile().name;
    data.profiles[data.species] = Object.assign(CH.defaultProfile(data.species), { name });
    onCharChange();
  });

  $$('.pose-btns button').forEach((b) => b.addEventListener('click', () => {
    previewPose = b.dataset.pose;
    $$('.pose-btns button').forEach((x) => x.classList.toggle('active', x === b));
  }));

  function startPreview() {
    if (previewRAF) return;
    const canvas = $('#charPreview');
    const ctx = hiDPI(canvas, 320, 260);
    let phase = 0, t = 0;
    const loop = () => {
      t += 1 / 60;
      phase = (phase + 0.07) % 1;
      const dark = resolvedTheme() === 'dark';
      // fundo: mini cenário
      const theme = TH.THEMES[data.scene];
      const pal = TH.palette(theme, dark ? 1 : 0);
      const g = ctx.createLinearGradient(0, 0, 0, 260);
      g.addColorStop(0, pal.skyTop); g.addColorStop(1, pal.skyBottom);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 260);
      ctx.fillStyle = pal.ground; ctx.fillRect(0, 210, 320, 50);
      ctx.fillStyle = pal.groundTop; ctx.fillRect(0, 208, 320, 3);
      ctx.fillStyle = pal.groundDetail;
      for (let i = 0; i < 12; i++) {
        const x = ((i * 37 - t * (previewPose === 'idle' ? 0 : 90)) % 330 + 330) % 330 - 10;
        ctx.fillRect(x, 222 + (i % 3) * 10, 8, 2);
      }
      let y = 210;
      let pose = previewPose;
      if (pose === 'jump') { const k = (t * 1.2) % 1; y = 210 - Math.sin(k * Math.PI) * 50; }
      // sombra
      ctx.save(); ctx.globalAlpha = 0.18; U.ellipse(ctx, 160, 211, 46, 6); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
      const prof = store.profile();
      const blink = pose === 'idle' && (t % 3) < 0.15;
      CH.draw(ctx, 160 - 28 * 2.7 + 4, y, { species: data.species, profile: prof, state: pose, phase, scale: 2.7, blink });
      // nome
      if (prof.name) {
        ctx.save();
        ctx.font = '800 15px Nunito, system-ui, sans-serif';
        const tw = ctx.measureText(prof.name).width + 22;
        U.roundRect(ctx, 160 - tw / 2, 14, tw, 26, 13);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(prof.name, 160, 27.5);
        ctx.restore();
      }
      previewRAF = requestAnimationFrame(loop);
    };
    previewRAF = requestAnimationFrame(loop);
  }
  function stopPreview() { cancelAnimationFrame(previewRAF); previewRAF = 0; }

  /* ==========================================================
     Cenário
     ========================================================== */
  function renderSceneCards() {
    const dark = resolvedTheme() === 'dark';
    $$('#sceneGrid .scene-card').forEach((card) => {
      const c = card.querySelector('canvas');
      const ctx = hiDPI(c, 300, 93);
      ctx.save(); ctx.scale(300 / 900, 93 / TH.H);
      TH.drawPreview(ctx, card.dataset.id, dark, 1.3);
      ctx.restore();
    });
  }

  function buildScene() {
    const grid = $('#sceneGrid');
    grid.innerHTML = '';
    for (const id of TH.THEME_ORDER) {
      const th = TH.THEMES[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = id;
      b.className = 'scene-card' + (id === data.scene ? ' active' : '');
      b.innerHTML = `<canvas></canvas><span class="sc-txt"><b>${th.label}</b><small>${th.desc}</small></span>`;
      b.addEventListener('click', () => {
        data.scene = id; DG.sfx.click();
        $$('#sceneGrid .scene-card').forEach((x) => x.classList.toggle('active', x === b));
        applyAndRefresh();
      });
      grid.appendChild(b);
    }
    renderSceneCards();

    const seg = $('#speedSeg');
    seg.innerHTML = '';
    DG.SPEED_ORDER.forEach((id, i) => {
      const s = DG.SPEEDS[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = id === data.speed ? 'active' : '';
      const bars = [0, 1, 2, 3].map((k) => `<i class="${k <= i ? 'on' : ''}" style="height:${4 + k * 2.6}px"></i>`).join('');
      b.innerHTML = `<span class="speed-bars">${bars}</span>${s.label}<small>${s.desc}</small>`;
      b.addEventListener('click', () => {
        data.speed = id; DG.sfx.click();
        $$('#speedSeg button').forEach((x) => x.classList.toggle('active', x === b));
        applyAndRefresh();
      });
      seg.appendChild(b);
    });
    $('#optDayNight').checked = data.dayNight;
  }
  $('#optDayNight').addEventListener('change', (e) => { data.dayNight = e.target.checked; applyAndRefresh(); });

  /* ==========================================================
     Configurações
     ========================================================== */
  const KEY_ACTIONS = [
    ['jump', 'Pular', 'Tecla principal de pulo'],
    ['jump2', 'Pular (alternativa)', 'Segunda tecla de pulo'],
    ['duck', 'Abaixar', 'Abaixa no chão e cai rápido no ar'],
    ['pause', 'Pausar', 'Pausa e continua o jogo (Esc também)'],
  ];
  const RESERVED = ['Escape', 'Tab', 'MetaLeft', 'MetaRight', 'F5', 'F12'];

  function buildSettings() {
    const list = $('#keyList');
    list.innerHTML = '';
    for (const [action, label, sub] of KEY_ACTIONS) {
      const row = document.createElement('div');
      row.className = 'key-row';
      row.innerHTML = `<span>${label}<small>${sub}</small></span><button type="button" class="key-btn" data-action="${action}">${U.keyName(data.keys[action])}</button>`;
      row.querySelector('button').addEventListener('click', (e) => startCapture(action, e.currentTarget));
      list.appendChild(row);
    }
    $$('#themeSeg button').forEach((b) => b.classList.toggle('active', b.dataset.val === data.uiTheme));
    $('#optSound').checked = data.sound;
    $('#optNameTag').checked = data.nameTag;
    resetConfirm($('#btnClearScores'), 'Apagar recordes');
    resetConfirm($('#btnResetAll'), 'Restaurar tudo');
  }

  function startCapture(action, btn) {
    stopCapture();
    capturing = { action, btn };
    btn.classList.add('listening');
    btn.textContent = 'Pressione…';
  }
  function stopCapture() {
    if (!capturing) return;
    capturing.btn.classList.remove('listening');
    capturing.btn.textContent = U.keyName(data.keys[capturing.action]);
    capturing = null;
  }
  function handleCapture(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.code === 'Escape') { stopCapture(); return; }
    if (RESERVED.includes(e.code) || !e.code) { toast('Essa tecla não pode ser usada'); return; }
    const { action } = capturing;
    const old = data.keys[action];
    // se a tecla já é usada em outra ação, troca as duas
    for (const k of Object.keys(data.keys)) if (k !== action && data.keys[k] === e.code) { data.keys[k] = old; toast(`Teclas trocadas: ${U.keyName(e.code)} ↔ ${U.keyName(old)}`); }
    data.keys[action] = e.code;
    store.save();
    capturing.btn.classList.remove('listening');
    capturing = null;
    buildSettings();
    updateDock();
    DG.sfx.click();
  }
  $('#btnKeysDefault').addEventListener('click', () => {
    data.keys = Object.assign({}, store.DEFAULT_KEYS); store.save(); buildSettings(); updateDock(); toast('Teclas restauradas');
  });
  $$('#themeSeg button').forEach((b) => b.addEventListener('click', () => {
    data.uiTheme = b.dataset.val; store.save(); applyTheme(); updateDock();
  }));
  $('#optSound').addEventListener('change', (e) => { data.sound = e.target.checked; DG.sfx.enabled = data.sound; store.save(); updateSoundBtn(); });
  $('#optNameTag').addEventListener('change', (e) => { data.nameTag = e.target.checked; applyAndRefresh(); });

  function resetConfirm(btn, label) { btn.classList.remove('confirm'); btn.textContent = label; btn.dataset.armed = ''; }
  function confirmClick(btn, label, action) {
    btn.addEventListener('click', () => {
      if (btn.dataset.armed) { action(); resetConfirm(btn, label); return; }
      btn.dataset.armed = '1'; btn.classList.add('confirm'); btn.textContent = 'Clique para confirmar';
      setTimeout(() => resetConfirm(btn, label), 3000);
    });
  }
  confirmClick($('#btnClearScores'), 'Apagar recordes', () => { store.resetScores(); updateDock(); game.render(); toast('Recordes apagados'); });
  confirmClick($('#btnResetAll'), 'Restaurar tudo', () => {
    store.resetAll();
    Object.assign(data, store.data);
    store.data = data;
    DG.sfx.enabled = data.sound; updateSoundBtn();
    applyTheme(); applyAndRefresh(); buildSettings();
    toast('Tudo restaurado');
  });

  /* ==========================================================
     Recordes
     ========================================================== */
  function buildScores() {
    const box = $('#scoreList');
    const list = data.scores;
    if (!list.length) {
      box.innerHTML = '<div class="empty">Nenhum recorde ainda.<br>Bora correr! 🏃</div>';
      return;
    }
    const fmt = (iso) => { try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); } catch (e) { return ''; } };
    const rows = list.map((s, i) => {
      const pos = i < 3 ? `<span class="medal m${i + 1}">${i + 1}</span>` : `${i + 1}º`;
      const th = TH.THEMES[s.scene] ? TH.THEMES[s.scene].label : '';
      const sp = DG.SPEEDS[s.speed] ? DG.SPEEDS[s.speed].label : '';
      return `<tr><td class="pos">${pos}</td><td><div class="who"><canvas data-sp="${s.species}"></canvas><div>${escapeHtml(s.name)}<div class="meta">${th} · ${sp} · ${fmt(s.date)}</div></div></div></td><td class="num">${String(s.score).padStart(5, '0')}</td></tr>`;
    }).join('');
    box.innerHTML = `<table class="score-table"><thead><tr><th></th><th>Jogador</th><th class="num">Pontos</th></tr></thead><tbody>${rows}</tbody></table>`;
    $$('canvas[data-sp]', box).forEach((c) => drawThumb(c, c.dataset.sp, data.profiles[c.dataset.sp], { size: 36 }));
  }
  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

  /* ---------- Toast ---------- */
  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  /* ---------- Início ---------- */
  updateSoundBtn();
  updateDock();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { game.render(); drawBrand(); });
})();

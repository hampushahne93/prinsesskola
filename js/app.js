/* =========================================================
   Multiskolan – meny + "skapa din gubbe"
   ========================================================= */
(function () {
  const data = Save.load();
  const $ = id => document.getElementById(id);

  /* ---------- Val i designern ---------- */
  const OPT = {
    skin: ['#f7dcc8', '#eec1a1', '#dca37c', '#bf8459', '#8d5534', '#5e3620'],
    hair: [
      { id: 'kort', label: 'Kort', ic: '✂️' },
      { id: 'snaggad', label: 'Snaggad', ic: '🪒' },
      { id: 'lang', label: 'Långt', ic: '👸' },
      { id: 'page', label: 'Page', ic: '💁' },
      { id: 'hastsvans', label: 'Hästsvans', ic: '🐴' },
      { id: 'tofsar', label: 'Tofsar', ic: '🎀' },
      { id: 'knut', label: 'Knut', ic: '🍩' },
      { id: 'lockigt', label: 'Lockigt', ic: '🌀' }
    ],
    hairColor: ['#1b1310', '#3b2316', '#6a4026', '#a8733f', '#e3c27a', '#b3471f', '#ff5ccf', '#3ee8ff', '#8a5cff'],
    eyes: ['#5b3a1e', '#8a5a2b', '#2f6db5', '#3f8a4a', '#7a8a99'],
    top: [
      { id: 'tshirt', label: 'T-shirt', ic: '👕' },
      { id: 'langarm', label: 'Långärmad', ic: '👚' },
      { id: 'hoodie', label: 'Hoodie', ic: '🧥' },
      { id: 'linne', label: 'Linne', ic: '🎽' },
      { id: 'klanning', label: 'Klänning', ic: '👗' }
    ],
    bottom: [
      { id: 'byxor', label: 'Byxor', ic: '👖' },
      { id: 'shorts', label: 'Shorts', ic: '🩳' },
      { id: 'kjol', label: 'Kjol', ic: '💃' }
    ],
    cloth: ['#ff5ccf', '#3ee8ff', '#8dff5a', '#ffd84a', '#ff7a3d', '#8a5cff', '#e23b4e', '#2f6db5', '#ffffff', '#2a2f45']
  };
  const DEFAULT_LOOK = {
    tjej: { skin: '#eec1a1', hair: 'lang', hairColor: '#a8733f', eyes: '#2f6db5', top: 'tshirt', topColor: '#ff5ccf', bottom: 'kjol', bottomColor: '#8a5cff', shoes: '#ffffff' },
    kille: { skin: '#eec1a1', hair: 'kort', hairColor: '#6a4026', eyes: '#5b3a1e', top: 'hoodie', topColor: '#3ee8ff', bottom: 'byxor', bottomColor: '#2a2f45', shoes: '#e23b4e' }
  };
  const TABS = [
    { id: 'kropp', ic: '🧍', label: 'Kropp', focus: 'body' },
    { id: 'har', ic: '💇', label: 'Hår', focus: 'head' },
    { id: 'ogon', ic: '👀', label: 'Ögon', focus: 'eyes' },
    { id: 'troja', ic: '👕', label: 'Tröja', focus: 'top' },
    { id: 'byxor', ic: '👖', label: 'Byxor', focus: 'bottom' },
    { id: 'skor', ic: '👟', label: 'Skor', focus: 'shoes' }
  ];

  /* ---------- Ljud ---------- */
  let ac;
  function tone(freq, dur = .15, type = 'sine', vol = .08, when = 0) {
    if (!data.settings.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t = ac.currentTime + when;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + .02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + .02);
    } catch (e) {}
  }
  const notes = [523, 659, 784];
  const chime = () => { tone(784, .12, 'sine', .07); tone(1047, .18, 'sine', .06, .08); };
  const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', .08, i * .1));
  const pop = () => tone(660 + Math.random() * 200, .1, 'sine', .06);

  const soundBtn = $('sound');
  const paintSound = () => soundBtn.textContent = data.settings.sound ? '🔊' : '🔇';
  paintSound();
  soundBtn.onclick = () => { Save.update(d => d.settings.sound = !d.settings.sound); paintSound(); chime(); };

  /* ---------- Titel ---------- */
  const colors = ['#ff5ccf', '#3ee8ff', '#8dff5a', '#ffd84a'];
  'MULTISKOLAN'.split('').forEach((ch, i) => {
    const s = document.createElement('span');
    s.textContent = ch;
    s.style.color = colors[i % colors.length];
    s.style.animationDelay = (i * 0.12) + 's';
    $('title').appendChild(s);
  });

  /* ---------- Stjärnfält ---------- */
  const cv = $('stars'), ctx = cv.getContext('2d');
  let W, H, speed = 1, targetSpeed = 1;
  const stars = [];
  function resize() { W = cv.width = innerWidth * devicePixelRatio; H = cv.height = innerHeight * devicePixelRatio; }
  addEventListener('resize', resize); resize();
  const starColors = ['#ffffff', '#ffffff', '#ffd84a', '#3ee8ff', '#ff5ccf'];
  for (let i = 0; i < 220; i++) stars.push({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + .5,
    v: Math.random() * .00025 + .00008, t: Math.random() * Math.PI * 2,
    c: starColors[Math.floor(Math.random() * starColors.length)]
  });
  (function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.x -= s.v * speed; s.t += .04;
      if (s.x < 0) { s.x = 1; s.y = Math.random(); }
      const a = .55 + Math.sin(s.t) * .45;
      ctx.globalAlpha = a; ctx.fillStyle = s.c;
      const r = s.r * devicePixelRatio;
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, r, 0, Math.PI * 2); ctx.fill();
      if (speed > 3) { ctx.globalAlpha = a * .5; ctx.fillRect(s.x * W, s.y * H - r / 2, s.v * speed * W * 6, r); }
    }
    ctx.globalAlpha = 1;
    speed += (targetSpeed - speed) * .06;
    requestAnimationFrame(draw);
  })();

  /* ---------- Gnistor ---------- */
  function sparks(x, y, n = 10) {
    const sym = ['⭐', '✨', '💫', '🌟'];
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = 'spark'; s.textContent = sym[i % sym.length];
      s.style.left = x + 'px'; s.style.top = y + 'px';
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
      s.style.setProperty('--dx', Math.cos(a) * d + 'px');
      s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 950);
    }
  }

  /* =========================================================
     MENY
     ========================================================= */
  const robot = $('robot'), bubble = $('bubble');
  const defaultSay = () => data.player ? `Hej ${data.player.name}! Vad vill du lära dig idag?` : 'Hej! Vad vill du lära dig idag?';
  const say = t => bubble.textContent = t;
  function happy(el = robot) { el.classList.remove('happy'); void el.getBoundingClientRect(); el.classList.add('happy'); }
  robot.addEventListener('click', () => {
    const n = data.player ? data.player.name : '';
    const lines = ['Pip pip! Jag heter Bip!', 'Tryck på ett kort så kör vi!', `Du är jätteduktig${n ? ', ' + n : ''}!`, 'Rymden är full av bokstäver!'];
    say(lines[Math.floor(Math.random() * lines.length)]); happy(); fanfare();
  });

  const cards = [...document.querySelectorAll('.card')];
  const overlay = $('overlay'), panel = $('panel');
  let sel = -1;
  function select(i, sound = true) {
    sel = (i + cards.length) % cards.length;
    cards.forEach((c, j) => c.classList.toggle('sel', j === sel));
    say(cards[sel].dataset.say);
    if (sound) tone(notes[sel], .18, 'sine', .07);
  }
  cards.forEach((c, i) => {
    c.addEventListener('mouseenter', () => select(i));
    c.addEventListener('focus', () => select(i, false));
    c.addEventListener('mouseleave', () => { c.classList.remove('sel'); say(defaultSay()); });
    c.addEventListener('click', e => {
      const r = c.getBoundingClientRect();
      sparks(e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2);
      launch(i);
    });
  });
  function launch(i) {
    const c = cards[i];
    $('panelTitle').textContent = c.dataset.name;
    panel.style.setProperty('--c', getComputedStyle(c).getPropertyValue('--c'));
    fanfare(); happy();
    targetSpeed = 25;
    setTimeout(() => overlay.classList.add('show'), 300);
  }
  function closeOverlay() { overlay.classList.remove('show'); targetSpeed = 1; chime(); say(defaultSay()); }
  $('back').onclick = closeOverlay;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });

  function showMenu() {
    document.body.classList.remove('onboarding');
    $('playerName').textContent = '👤 ' + data.player.name;
    $('player').classList.add('show');
    say(defaultSay());
  }
  $('editAvatar').onclick = () => { chime(); openDesigner(true); };

  /* =========================================================
     SKAPA DIN GUBBE
     ========================================================= */
  // Bip-robot i guidens steg
  document.querySelectorAll('.botslot').forEach(slot => {
    const r = robot.cloneNode(true);
    r.removeAttribute('id');
    r.addEventListener('click', () => { happy(r); fanfare(); });
    slot.replaceWith(r);
  });

  const steps = ['welcome', 'gender', 'name', 'design'];
  function goStep(name) {
    steps.forEach(s => $('step-' + s).classList.toggle('active', s === name));
    const i = steps.indexOf(name);
    [...$('dots').children].forEach((d, j) => d.classList.toggle('on', j <= i));
    $('dots').style.display = name === 'design' ? 'none' : 'flex';
  }

  const draft = { gender: null, name: '', look: null, editing: false };

  $('btnStart').onclick = e => { sparks(e.clientX, e.clientY); fanfare(); goStep('gender'); preload3D(); };
  document.querySelectorAll('.gcard').forEach(b => b.onclick = e => {
    sparks(e.clientX, e.clientY);
    tone(b.dataset.gender === 'tjej' ? 784 : 523, .2, 'sine', .08);
    draft.gender = b.dataset.gender;
    draft.look = { ...DEFAULT_LOOK[draft.gender] };
    goStep('name');
    setTimeout(() => $('nameInput').focus(), 300);
  });
  $('btnBackGender').onclick = () => { chime(); goStep('gender'); };

  const nameInput = $('nameInput');
  nameInput.addEventListener('input', () => {
    $('btnName').disabled = !nameInput.value.trim();
    if (nameInput.value) pop();
  });
  const submitName = () => {
    const v = nameInput.value.trim();
    if (!v) return;
    draft.name = v.charAt(0).toUpperCase() + v.slice(1);
    fanfare();
    openDesigner(false);
  };
  $('btnName').onclick = submitName;
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });

  /* ---------- 3D ---------- */
  let stage = null, stagePromise = null;
  function preload3D() {
    if (!stagePromise) stagePromise = import('./avatar.js').catch(err => { console.error(err); return null; });
    return stagePromise;
  }
  async function ensureStage() {
    if (stage) return stage;
    const mod = await preload3D();
    if (!mod) {
      $('loader').innerHTML = '<div>😕 3D-gubben kunde inte laddas.<br>Kolla internet och ladda om sidan.</div>';
      return null;
    }
    stage = mod.createStage($('avatarCanvas'));
    $('loader').classList.add('hide');
    return stage;
  }
  function refresh(bounce = true) {
    if (!stage) return;
    stage.setLook(draft.look, draft.gender);
    if (bounce) stage.bounce();
  }

  /* ---------- Designerns flikar ---------- */
  let tab = 'kropp';
  function renderTabs() {
    $('tabs').innerHTML = '';
    TABS.forEach(t => {
      const b = document.createElement('button');
      b.className = 'tab' + (t.id === tab ? ' on' : '');
      b.innerHTML = `<span>${t.ic}</span><small>${t.label}</small>`;
      b.onclick = () => { tab = t.id; tone(700, .08, 'sine', .05); renderTabs(); renderOpts(); stage && stage.focus(t.focus); };
      $('tabs').appendChild(b);
    });
  }
  function h4(text) { const h = document.createElement('h4'); h.textContent = text; return h; }
  function styleGrid(list, key) {
    const g = document.createElement('div');
    g.className = 'styles';
    list.forEach(o => {
      const b = document.createElement('button');
      b.className = 'style' + (draft.look[key] === o.id ? ' on' : '');
      b.innerHTML = `<span class="ic">${o.ic}</span>${o.label}`;
      b.onclick = () => { draft.look[key] = o.id; pop(); refresh(); renderOpts(); };
      g.appendChild(b);
    });
    return g;
  }
  function swatches(list, key) {
    const g = document.createElement('div');
    g.className = 'swatches';
    list.forEach(c => {
      const b = document.createElement('button');
      b.className = 'sw' + (draft.look[key] === c ? ' on' : '');
      b.style.background = c;
      b.setAttribute('aria-label', c);
      b.onclick = () => { draft.look[key] = c; pop(); refresh(); renderOpts(); };
      g.appendChild(b);
    });
    return g;
  }
  function renderOpts() {
    const o = $('opts');
    o.innerHTML = '';
    if (tab === 'kropp') {
      o.append(h4('Tjej eller kille'));
      o.append(styleGrid([{ id: 'tjej', label: 'Tjej', ic: '👧' }, { id: 'kille', label: 'Kille', ic: '👦' }].map(x => x), '__gender'));
      // Gender-knapparna styr draft.gender i stället för look
      o.querySelectorAll('.style').forEach((b, i) => {
        const g = i === 0 ? 'tjej' : 'kille';
        b.classList.toggle('on', draft.gender === g);
        b.onclick = () => { draft.gender = g; pop(); refresh(); renderOpts(); };
      });
      o.append(h4('Hudfärg'), swatches(OPT.skin, 'skin'));
    } else if (tab === 'har') {
      o.append(h4('Frisyr'), styleGrid(OPT.hair, 'hair'), h4('Hårfärg'), swatches(OPT.hairColor, 'hairColor'));
    } else if (tab === 'ogon') {
      o.append(h4('Ögonfärg'), swatches(OPT.eyes, 'eyes'));
    } else if (tab === 'troja') {
      o.append(h4('Tröja'), styleGrid(OPT.top, 'top'), h4('Färg'), swatches(OPT.cloth, 'topColor'));
    } else if (tab === 'byxor') {
      if (draft.look.top === 'klanning') {
        const n = document.createElement('div');
        n.className = 'note';
        n.textContent = '👗 Klänningen täcker benen. Välj en annan tröja om du vill byta byxor.';
        o.append(h4('Byxor'), n);
      } else {
        o.append(h4('Byxor'), styleGrid(OPT.bottom, 'bottom'), h4('Färg'), swatches(OPT.cloth, 'bottomColor'));
      }
    } else if (tab === 'skor') {
      o.append(h4('Skofärg'), swatches(OPT.cloth, 'shoes'));
    }
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  $('btnRandom').onclick = e => {
    sparks(e.clientX, e.clientY, 6);
    Object.assign(draft.look, {
      skin: pick(OPT.skin), hair: pick(OPT.hair).id, hairColor: pick(OPT.hairColor), eyes: pick(OPT.eyes),
      top: pick(OPT.top).id, topColor: pick(OPT.cloth), bottom: pick(OPT.bottom).id, bottomColor: pick(OPT.cloth), shoes: pick(OPT.cloth)
    });
    fanfare(); refresh(); renderOpts();
  };
  $('btnDone').onclick = e => {
    sparks(e.clientX, e.clientY, 14);
    Save.update(d => {
      d.player = {
        name: draft.name,
        gender: draft.gender,
        look: { ...draft.look },
        createdAt: (d.player && d.player.createdAt) || new Date().toISOString()
      };
    });
    fanfare();
    $('cheer').textContent = `Snyggt, ${draft.name}! 🎉`;
    $('cheer').classList.add('show');
    if (stage) { stage.focus('body'); stage.wave(2.2); }
    setTimeout(() => {
      $('cheer').classList.remove('show');
      showMenu();
    }, 2400);
  };

  async function openDesigner(editing) {
    draft.editing = editing;
    if (editing && data.player) {
      draft.name = data.player.name;
      draft.gender = data.player.gender;
      draft.look = { ...DEFAULT_LOOK[draft.gender], ...data.player.look };
    }
    document.body.classList.add('onboarding');
    $('hello').textContent = editing ? `Ändra din gubbe, ${draft.name}!` : `Designa din gubbe, ${draft.name}!`;
    tab = 'kropp';
    renderTabs();
    renderOpts();
    goStep('design');
    const s = await ensureStage();
    if (s) { refresh(false); s.focus('body'); s.wave(1.6); }
  }

  /* ---------- Start ---------- */
  if (data.player) {
    showMenu();
    preload3D();          // så att "Ändra gubbe" går snabbt
  } else {
    document.body.classList.add('onboarding');
    goStep('welcome');
    preload3D();
  }

  /* ---------- Tangentbord ---------- */
  addEventListener('keydown', e => {
    if (document.body.classList.contains('onboarding')) return;
    if (overlay.classList.contains('show')) {
      if (['Escape', 'Enter', ' ', 'Backspace'].includes(e.key)) { e.preventDefault(); closeOverlay(); }
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'd') select(sel + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'a') select(sel < 0 ? 0 : sel - 1);
    else if ((e.key === 'Enter' || e.key === ' ') && sel >= 0) { e.preventDefault(); launch(sel); }
  });
})();

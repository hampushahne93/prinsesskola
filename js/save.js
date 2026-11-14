/* =========================================================
   Multiskolan – sparsystem
   - All data ligger under EN fast nyckel som aldrig byter namn.
   - Ny kod fyller på saknade fält, den skriver aldrig över
     befintliga framsteg med tomma värden.
   - Gamla sparformat uppgraderas (och en backup sparas först).
   - Är sparfilen trasig sparas en backup innan något görs.
   ========================================================= */
(function () {
  const KEY = 'multiskolan-save';
  const VERSION = 2;

  function defaults() {
    return {
      version: VERSION,
      players: [],             // [{ id, name, gender, look, progress, createdAt }]
      activeId: null,
      settings: { sound: true }
    };
  }
  const emptyProgress = () => ({ abc: {}, matte: {}, ord: {} });
  const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

  // Lägger in sparad data ovanpå standardvärdena (sparad data vinner alltid)
  function merge(base, saved) {
    if (!isObj(saved)) return base;
    for (const k of Object.keys(saved)) {
      if (isObj(base[k]) && isObj(saved[k])) merge(base[k], saved[k]);
      else if (saved[k] !== undefined) base[k] = saved[k];
    }
    return base;
  }

  function migrate(d, raw) {
    // v1 -> v2: en spelare blir en lista med spelare, framstegen följer med
    if ((d.version || 1) < 2) {
      if (raw) { try { localStorage.setItem(KEY + '-v1-backup', raw); } catch (e) {} }
      if (d.player && !d.players.length) {
        d.players.push({
          id: uid(),
          name: d.player.name,
          gender: d.player.gender,
          look: d.player.look,
          createdAt: d.player.createdAt || new Date().toISOString(),
          progress: merge(emptyProgress(), d.progress || {})
        });
        d.activeId = d.players[0].id;
      }
      delete d.player;
      delete d.progress;
    }
    if (!Array.isArray(d.players)) d.players = [];
    d.players.forEach(p => { p.progress = merge(emptyProgress(), p.progress || {}); });
    if (d.activeId && !d.players.some(p => p.id === d.activeId)) d.activeId = null;
    d.version = VERSION;
    return d;
  }

  let cache = null;

  function load() {
    if (cache) return cache;
    let raw = null, saved = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (raw) {
      try { saved = JSON.parse(raw); }
      catch (e) {
        try { localStorage.setItem(KEY + '-backup-' + Date.now(), raw); } catch (e2) {}
      }
    }
    const wasVersion = saved && saved.version;
    cache = migrate(merge(defaults(), saved || {}), raw);
    if (saved && wasVersion !== VERSION) save();
    return cache;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cache)); return true; }
    catch (e) { return false; }
  }

  function update(fn) { load(); fn(cache); return save(); }

  /* ---------- Spelare ---------- */
  const players = () => load().players;
  const get = id => players().find(p => p.id === id) || null;
  const active = () => get(load().activeId);
  function addPlayer({ name, gender, look }) {
    const p = { id: uid(), name, gender, look, createdAt: new Date().toISOString(), progress: emptyProgress() };
    update(d => { d.players.push(p); d.activeId = p.id; });
    return p;
  }
  function updatePlayer(id, fn) { update(() => { const p = get(id); if (p) fn(p); }); }
  function removePlayer(id) {
    update(d => {
      d.players = d.players.filter(p => p.id !== id);
      if (d.activeId === id) d.activeId = null;
    });
  }
  function setActive(id) { update(d => { d.activeId = id; }); }

  window.Save = { load, save, update, KEY, players, get, active, addPlayer, updatePlayer, removePlayer, setActive };
})();

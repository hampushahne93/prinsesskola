/* =========================================================
   Multiskolan – sparsystem
   - All data ligger under EN fast nyckel som aldrig byter namn.
   - Ny kod fyller på saknade fält, den skriver aldrig över
     befintliga framsteg med tomma värden.
   - Är sparfilen trasig sparas en backup innan något görs.
   ========================================================= */
(function () {
  const KEY = 'multiskolan-save';
  const VERSION = 1;

  function defaults() {
    return {
      version: VERSION,
      player: null,            // { name, gender, look, createdAt }
      progress: { abc: {}, matte: {}, ord: {} },
      settings: { sound: true }
    };
  }

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

  // Här läggs uppgraderingar in när sparformatet ändras i framtiden
  function migrate(d) {
    // if (d.version < 2) { ... }
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
    cache = migrate(merge(defaults(), saved || {}));
    return cache;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cache)); return true; }
    catch (e) { return false; }
  }

  function update(fn) { load(); fn(cache); return save(); }

  window.Save = { load, save, update, KEY };
})();

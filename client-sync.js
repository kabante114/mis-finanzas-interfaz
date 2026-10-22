/* Same-origin state client. No credentials, providers or framework dependencies. */
(function (root) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const accounts = ['Goodsabank', 'Revolut'];
  const configKeys = ['theme', 'accent', 'brand', 'catEmoji', 'privacy',
    'evoMetric', 'evoGran', 'compGran', 'widgets'];
  const widgetIds = ['kpis', 'evolucion', 'reparto', 'composicion', 'topcomercios', 'historial'];
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const number = value => typeof value === 'number' && Number.isFinite(value);
  const text = value => typeof value === 'string' && value.length <= 10000;
  function requireThat(ok) { if (!ok) throw new Error('Estado no válido; no se han aplicado datos.'); }
  function cleanConfig(cfg) {
    requireThat(object(cfg));
    const result = {};
    for (const key of configKeys) if (Object.hasOwn(cfg, key)) result[key] = clone(cfg[key]);
    if ('theme' in result) requireThat(['teal', 'midnight', 'violet', 'light'].includes(result.theme));
    if ('accent' in result) requireThat(/^#[0-9a-f]{6}$/i.test(result.accent));
    if ('brand' in result) requireThat(text(result.brand) && result.brand.length <= 32);
    for (const key of ['privacy', 'catEmoji']) if (key in result) requireThat(typeof result[key] === 'boolean');
    for (const key of ['evoGran', 'compGran']) if (key in result) requireThat(['day', 'week', 'month', 'year'].includes(result[key]));
    if ('evoMetric' in result) requireThat(text(result.evoMetric));
    if ('widgets' in result) {
      requireThat(Array.isArray(result.widgets) && result.widgets.length <= widgetIds.length);
      const seen = new Set();
      result.widgets = result.widgets.map(w => {
        requireThat(object(w) && widgetIds.includes(w.id) && !seen.has(w.id) && [0, 1].includes(w.v) && ['s', 'm', 'l', 'xl'].includes(w.s));
        seen.add(w.id); return {id: w.id, v: w.v, s: w.s};
      });
    }
    return result;
  }
  function emptyState() {
    return {tx: [], bal: {Goodsabank: 0, Revolut: 0}, budget: {}, overrides: {}, inv: [], cfg: {}, rules: [{type: 'fallback', in: 'Sin clasificar (+)', out: 'Sin clasificar (-)'}]};
  }
  function validateRules(rules) {
    requireThat(Array.isArray(rules) && rules.length <= 1000);
    const fields = {rawType: ['values', 'cat'], exact: ['values', 'cat'], startswith: ['values', 'cat'],
      kw: ['values', 'cat'], amount: ['concepts', 'maxAmount', 'cat'], bizum: ['food', 'transport', 'in', 'out'],
      transfer: ['prefixes', 'contains', 'in', 'out'], fallback: ['in', 'out']};
    return rules.map(rule => {
      requireThat(object(rule) && Object.hasOwn(fields, rule.type));
      const result = {type: rule.type};
      for (const key of [...fields[rule.type], ...(rule.type === 'kw' ? ['posCat'] : [])]) {
        if (key === 'posCat' && !(key in rule)) continue;
        const value = rule[key];
        if (['values', 'concepts', 'food', 'transport', 'prefixes', 'contains'].includes(key)) requireThat(Array.isArray(value) && value.length <= 1000 && value.every(text));
        else if (key === 'maxAmount') requireThat(number(value));
        else requireThat(text(value));
        result[key] = clone(value);
      }
      return result;
    });
  }
  function validateState(input) {
    requireThat(object(input));
    const {tx, bal, budget, overrides, inv, cfg} = input;
    requireThat(Array.isArray(tx) && object(bal) && object(budget) && object(overrides) && Array.isArray(inv));
    requireThat(Object.keys(bal).length === 2 && accounts.every(a => number(bal[a])));
    const result = {tx: tx.map(t => {
      requireThat(object(t) && accounts.includes(t.account) && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && text(t.concept) && number(t.amount)
        && text(t.currency) && text(t.rawType) && (t.balance === null || number(t.balance)) && text(t.cat));
      return {account: t.account, date: t.date, concept: t.concept, amount: t.amount,
        currency: t.currency, rawType: t.rawType, balance: t.balance, cat: t.cat};
    }), bal: clone(bal), budget: {}, overrides: {}, inv: inv.map(x => {
      requireThat(object(x) && text(x.name) && ['Cripto', 'Forex / Trading', 'Fondos / Roboadvisor', 'Fondos / ETF', 'Acciones / ETF', 'Depósito', 'Otro', 'Fondos', 'Acciones'].includes(x.type) && number(x.in) && number(x.now));
      const item = {name: x.name, type: x.type, in: x.in, now: x.now};
      for (const key of ['sym', 'cg']) if (key in x) { requireThat(text(x[key]) && /^[a-z0-9-]*$/i.test(x[key])); item[key] = x[key]; }
      if ('qty' in x) { requireThat(number(x.qty)); item.qty = x.qty; }
      return item;
    }), cfg: cleanConfig(cfg)};
    for (const [key, value] of Object.entries(budget)) { requireThat(text(key) && number(value) && !['__proto__', 'constructor', 'prototype'].includes(key)); result.budget[key] = value; }
    for (const [key, value] of Object.entries(overrides)) { requireThat(text(key) && text(value) && !['__proto__', 'constructor', 'prototype'].includes(key)); result.overrides[key] = value; }
    if (Object.hasOwn(input, 'rules')) result.rules = validateRules(input.rules);
    return result;
  }
  function envelope(data) {
    requireThat(object(data) && Number.isSafeInteger(data.revision) && data.revision >= 0 && Object.hasOwn(data, 'state'));
    return {revision: data.revision, state: data.state === null ? emptyState() : validateState(data.state)};
  }
  function create(options) {
    const request = options.fetch || root.fetch.bind(root);
    const storage = options.storage || root.localStorage;
    const delay = options.delay === undefined ? 500 : options.delay;
    const status = options.status || (() => {});
    const lock = options.lock || (() => {});
    const CACHE = 'finweb_cache_v1', BACKUP = 'finweb_recovery_v1';
    let revision = null, dirty = false, ready = false, busy = false, conflict = false, generation = 0, timer, stopped = false;
    const controller = new AbortController();
    let recovery = null;
    function tell(message) { status(message, {ready, busy, dirty, conflict, revision}); }
    function cache(state) {
      try { storage.setItem(CACHE, JSON.stringify({revision, dirty, state})); }
      catch (_) { tell('Aviso: no se pudo guardar la copia local. Exporta un respaldo.'); }
    }
    function preserve() {
      recovery = {revision, state: validateState(options.getState()), savedAt: new Date().toISOString()};
      // A failed backup must abort destructive reload rather than erase unsaved work.
      storage.setItem(BACKUP, JSON.stringify(recovery));
      return clone(recovery);
    }
    async function get() {
      const response = await request('/api/state', {credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers: {'Accept': 'application/json'}});
      if (!response.ok) throw new Error('No se pudo cargar el servidor (' + response.status + ').');
      return envelope(await response.json());
    }
    function install(remote) {
      if (stopped) return;
      options.applyState(clone(remote.state)); revision = remote.revision; dirty = false; conflict = false; ready = true;
      cache(remote.state); lock(false); tell('Sincronizado · revisión ' + revision);
    }
    async function start() {
      if (stopped) return;
      ready = false; lock(true); tell('Cargando estado privado del servidor…'); busy = true;
      try {
        const remote = await get();
        const raw = storage.getItem(CACHE);
        if (raw) {
          let saved; try { saved = JSON.parse(raw); } catch (_) { throw new Error('Caché local ilegible: consérvala antes de continuar.'); }
          if (saved.dirty) {
            const state = validateState(saved.state);
            requireThat(Number.isSafeInteger(saved.revision) && saved.revision >= 0);
            options.applyState(clone(state)); revision = saved.revision; dirty = true; ready = true; conflict = true;
            lock(true); tell('Hay cambios locales pendientes. Exporta respaldo o carga el remoto conservando copia.'); return;
          }
        }
        install(remote);
      } catch (error) { lock(true); tell(error.message || 'No se pudo validar el estado.'); }
      finally { busy = false; }
    }
    function changed() {
      if (stopped || !ready || conflict) return;
      dirty = true; generation++; cache(validateState(options.getState())); tell('Cambios locales pendientes…');
      clearTimeout(timer); timer = setTimeout(flush, delay);
    }
    async function flush() {
      if (!ready || !dirty || busy || conflict) return;
      clearTimeout(timer);
      busy = true; lock(true); const sending = generation;
      try {
        const state = validateState(options.getState()); cache(state);
        const response = await request('/api/state', {method: 'PUT', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
          headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}, body: JSON.stringify({baseRevision: revision, state})});
        if (stopped) return;
        if (response.status === 409) {
          conflict = true; preserve(); tell('Conflicto: el servidor cambió. Tu copia local está conservada; no se ha fusionado.'); return;
        }
        if (!response.ok) throw new Error('No se pudo guardar (' + response.status + ').');
        const remote = envelope(await response.json());
        requireThat(remote.revision > revision);
        revision = remote.revision;
        if (sending === generation) install(remote);
        else { dirty = true; cache(validateState(options.getState())); tell('Quedan cambios pendientes…'); clearTimeout(timer); timer = setTimeout(flush, delay); }
      } catch (error) {
        // The server may have accepted a PUT whose response was lost: retry with the same
        // baseRevision. CAS then forces an explicit conflict, never a blind overwrite.
        tell((error.message || 'Error de sincronización.') + ' Copia local pendiente; reintenta o exporta.');
      } finally { busy = false; lock(stopped || conflict); }
    }
    async function refresh() {
      if (stopped) return;
      if (dirty || conflict) { tell('Hay cambios locales: no se recarga automáticamente.'); return; }
      if (busy) return;
      if (!ready) return start();
      busy = true; lock(true);
      try { install(await get()); }
      catch (error) { ready = false; lock(true); tell(error.message); }
      finally { busy = false; }
    }
    async function resolveRemote() {
      if (busy || stopped) return;
      clearTimeout(timer); busy = true; lock(true);
      try { preserve(); const remote = await get(); install(remote); }
      catch (error) { tell('No se recargó: ' + error.message); }
      finally { busy = false; lock(!ready || conflict); }
    }
    function backup() { return {revision, state: validateState(options.getState()), recovery}; }
    function stop() { stopped = true; ready = false; clearTimeout(timer); controller.abort(); recovery = null; lock(true); }
    return {start, changed, flush, refresh, resolveRemote, backup, stop,
      inspect: () => ({revision, dirty, ready, conflict, busy})};
  }
  root.FinanceState = {create, validateState, cleanConfig, emptyState};
})(typeof window === 'undefined' ? globalThis : window);

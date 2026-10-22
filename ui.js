/* UI-only enhancement. No state, authentication, calculation or persistence access. */
(() => {
  'use strict';
  function init() {
    const app = document.getElementById('financeApp');
    const originalNav = document.getElementById('nav');
    if (!app || !originalNav || document.getElementById('uiSidebar')) return;
    const ns = 'http://www.w3.org/2000/svg';
    const paths = {
      dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
      cuentas: 'M4 5h14v4H4a2 2 0 0 1 0-4Zm0 4v10h16V9H4Zm12 4h4',
      categorias: 'M3 3h8l10 10-8 8L3 11V3Zm4 4h.01',
      presupuesto: 'M21 12a9 9 0 1 1-9-9m5 0v7h7M12 8v4l3 3',
      inversion: 'm3 17 6-6 4 4 8-10m-6 0h6v6',
      movimientos: 'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
      comparar: 'M5 20V9m7 11V4m7 16v-7M3 20h18',
      ajustes: 'M4 7h16M4 17h16M8 4v6m8 4v6',
      plus: 'M12 5v14M5 12h14',
      eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
      upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
      theme: 'M12 3a9 9 0 1 0 9 9c-5 3-12-4-9-9Z',
      brand: 'M5 20v-6m7 6V9m7 11V4'
    };
    const labels = { dashboard: 'Resumen', cuentas: 'Cuentas', categorias: 'Categorías', presupuesto: 'Presupuesto', inversion: 'Inversión', movimientos: 'Movimientos', comparar: 'Comparar', ajustes: 'Ajustes' };
    const descriptions = {
      dashboard: 'Tu situación financiera, de un vistazo.', cuentas: 'Saldos y evolución de tus cuentas.',
      categorias: 'Entiende cómo se distribuyen tus gastos.', presupuesto: 'Planifica y sigue tus límites mensuales.',
      inversion: 'Aportaciones, cartera y evolución.', movimientos: 'Consulta y organiza tus movimientos.',
      comparar: 'Analiza las diferencias entre periodos.', ajustes: 'Personaliza tu espacio y gestiona tus datos.'
    };
    function icon(name) {
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.7');
      svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
      svg.classList.add('ui-icon');
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', paths[name] || paths.dashboard); svg.append(path); return svg;
    }
    function el(tag, className, text) {
      const node = document.createElement(tag); if (className) node.className = className;
      if (text) node.textContent = text; return node;
    }
    const originals = [...originalNav.querySelectorAll('button[data-t]')];
    if (!originals.length) return;
    const sidebar = el('aside', 'ui-sidebar'); sidebar.id = 'uiSidebar';
    const brand = el('div', 'ui-brand'); const mark = el('span', 'ui-brand-mark');
    mark.append(icon('brand')); brand.append(mark, document.createTextNode('Mis Finanzas'));
    const sideLinks = el('nav', 'ui-side-links'); sideLinks.setAttribute('aria-label', 'Navegación principal');
    const bottom = el('nav', 'ui-bottomnav'); bottom.id = 'uiBottomnav';
    bottom.setAttribute('aria-label', 'Secciones. Desliza para ver todas');
    const proxies = [];
    for (const original of originals) {
      const key = original.dataset.t;
      for (const container of [sideLinks, bottom]) {
        const button = el('button', 'ui-nav-button'); button.type = 'button';
        button.dataset.uiTarget = key;
        button.setAttribute('aria-controls', key);
        button.append(icon(key), el('span', '', labels[key] || original.textContent.trim()));
        button.addEventListener('click', () => {
          if (app.hidden || app.inert || original.disabled) return;
          original.click(); sync();
        });
        container.append(button); proxies.push({button, original});
      }
    }
    const footer = el('div', 'ui-sidebar-footer');
    const themeButton = el('button', 'btn ui-theme-switch'); themeButton.type = 'button';
    const mobileTheme = el('button', 'btn ui-icon-button'); mobileTheme.type = 'button';
    const root = document.documentElement;
    const preferred = window.matchMedia('(prefers-color-scheme: dark)');
    let manualTheme = false;
    function setTheme(dark) {
      root.dataset.uiTheme = dark ? 'dark' : 'light';
      themeButton.replaceChildren(icon('theme'), document.createTextNode(dark ? 'Cambiar a claro' : 'Cambiar a oscuro'));
      mobileTheme.replaceChildren(icon('theme'));
      for (const b of [themeButton, mobileTheme]) {
        b.setAttribute('aria-label', dark ? 'Activar tema claro' : 'Activar tema oscuro');
        b.setAttribute('title', b.getAttribute('aria-label'));
      }
    }
    for (const button of [themeButton, mobileTheme]) button.addEventListener('click', () => {
      manualTheme = true; setTheme(root.dataset.uiTheme !== 'dark');
    });
    preferred.addEventListener?.('change', e => { if (!manualTheme) setTheme(e.matches); });
    setTheme(preferred.matches);
    footer.append(themeButton, el('p', '', 'Tu espacio financiero personal.'));
    sidebar.append(brand, el('p', 'ui-nav-caption', 'Espacio personal'), sideLinks, footer);
    app.prepend(sidebar); app.append(bottom);
    const heading = el('div', 'ui-page-heading');
    const title = el('h2'); const description = el('p'); heading.append(title, description);
    originalNav.after(heading);
    const actions = [['addBtn','plus','Añadir movimiento','Añadir'],['privBtn','eye','Ocultar o mostrar importes',''],['uploadBtn','upload','Actualizar movimientos','Actualizar'],['settingsBtn','ajustes','Abrir ajustes','']];
    // Existing button elements and listeners are retained; only their presentation changes.
    function decorateActions() {
      for (const [id, glyph, label, text] of actions) {
        const button = document.getElementById(id);
        if (!button || button.querySelector('.ui-icon')) continue;
        button.replaceChildren(icon(glyph)); if (text) button.append(el('span', 'ui-action-label', text));
        button.setAttribute('aria-label', label); button.title = label;
        if (!text) button.classList.add('ui-icon-button');
      }
    }
    decorateActions(); document.querySelector('#financeApp .hbtns')?.append(mobileTheme);
    // Remove decorative emoji only from heading text, never from values or data labels.
    for (const heading of document.querySelectorAll('#financeApp h2,.modal h2')) {
      for (const node of heading.childNodes) if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = node.textContent.replace(/\p{Extended_Pictographic}\uFE0F?\s*/gu, '');
      }
    }
    for (const [id, label] of [['dFrom','Desde'],['dTo','Hasta'],['monthSel','Saltar a un mes'],['quarterSel','Saltar a un trimestre'],['search','Buscar concepto'],['catSearch','Filtrar categoría']]) {
      const control = document.getElementById(id); if (control && !control.hasAttribute('aria-label')) control.setAttribute('aria-label', label);
    }
    function sync() {
      for (const {button, original} of proxies) {
        if (original.classList.contains('active')) button.setAttribute('aria-current','page');
        else button.removeAttribute('aria-current');
        button.disabled = original.disabled || app.inert || app.hidden;
      }
      const active = originals.find(b => b.classList.contains('active'));
      const key = active?.dataset.t;
      const nextTitle = labels[key] || active?.textContent.trim() || 'Mis Finanzas';
      if (title.textContent !== nextTitle) title.textContent = nextTitle;
      const nextDescription = descriptions[key] || '';
      if (description.textContent !== nextDescription) description.textContent = nextDescription;
      decorateActions();
    }
    new MutationObserver(sync).observe(originalNav, {subtree:true,attributes:true,attributeFilter:['class','disabled']});
    new MutationObserver(sync).observe(app, {attributes:true,attributeFilter:['hidden','inert']});
    const headerActions = document.querySelector('#financeApp .hbtns');
    if (headerActions) new MutationObserver(decorateActions).observe(headerActions, {subtree:true,childList:true});
    document.body.classList.add('ui-enhanced'); sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();

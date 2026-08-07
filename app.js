'use strict';

const STORAGE_KEY = 'qualitySummaryData_v2';
const LEGACY_STORAGE_KEY = 'qualitySummaryData_v1';
const initialState = { clients: [], parts: [], defects: [], records: [] };
let state = loadState();
let charts = {};
let selectedClientId = null;
let selectedPartId = null;

const $ = (id) => document.getElementById(id);
const number = (value) => new Intl.NumberFormat('es-MX').format(Number(value) || 0);
const percent = (value) => `${(Number(value) || 0).toFixed(2)}%`;
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));

function loadState() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (current) return normalizeState(current);

    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (legacy) {
      const migrated = migrateLegacyState(legacy);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (error) {
    console.warn('No fue posible leer la base local:', error);
  }
  return structuredClone(initialState);
}

function normalizeState(raw) {
  return {
    clients: Array.isArray(raw.clients) ? raw.clients : [],
    parts: Array.isArray(raw.parts) ? raw.parts : [],
    defects: Array.isArray(raw.defects) ? raw.defects : [],
    records: Array.isArray(raw.records) ? raw.records : []
  };
}

function migrateLegacyState(legacy) {
  const clients = (legacy.businessUnits || []).map(x => ({ id: x.id, name: x.name, code: x.code || '' }));
  const parts = (legacy.parts || []).map(x => ({ ...x, clientId: x.clientId || x.businessUnitId || '' }));
  const records = (legacy.records || []).map(x => ({ ...x, clientId: x.clientId || x.businessUnitId || '' }));
  return { clients, parts, defects: legacy.defects || [], records };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  $('storageStatus').textContent = 'Base local activa';
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2300);
}

function getClient(id) { return state.clients.find(x => x.id === id); }
function getPart(id) { return state.parts.find(x => x.id === id); }
function getDefect(id) { return state.defects.find(x => x.id === id); }

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

function calculateMetrics(records) {
  const produced = records.reduce((sum, r) => sum + Number(r.produced || 0), 0);
  const scrap = records.reduce((sum, r) => sum + Number(r.scrap || 0), 0);
  return {
    produced,
    scrap,
    scrapRate: produced ? (scrap / produced) * 100 : 0,
    ppm: produced ? (scrap / produced) * 1_000_000 : 0
  };
}

function populateSelect(select, items, placeholder, labelFn) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` + items.map(item => `<option value="${item.id}">${escapeHtml(labelFn(item))}</option>`).join('');
  if ([...select.options].some(o => o.value === current)) select.value = current;
}

function partsForClient(clientId) {
  return state.parts.filter(p => !clientId || p.clientId === clientId).sort((a,b) => a.number.localeCompare(b.number));
}

function defectsForPart(partId) {
  return state.defects.filter(d => d.partId === partId).sort((a,b) => `${a.code}${a.name}`.localeCompare(`${b.code}${b.name}`));
}

function populateSelects() {
  const clients = [...state.clients].sort((a,b) => a.name.localeCompare(b.name));
  populateSelect($('filterClient'), clients, 'Todos', x => x.name);
  populateSelect($('recordClient'), clients, 'Seleccionar cliente', x => x.name);
  populateSelect($('partClient'), clients, 'Seleccionar cliente', x => x.name);
  populateSelect($('defectClient'), clients, 'Seleccionar cliente', x => x.name);

  updateFilterParts();
  updateCaptureParts();
  updateCatalogParts();
}

function updateFilterParts() {
  const clientId = $('filterClient').value;
  populateSelect($('filterPartNumber'), partsForClient(clientId), 'Todos', p => p.number);
}

function updateCaptureParts() {
  const clientId = $('recordClient').value;
  const parts = partsForClient(clientId);
  populateSelect($('recordPartNumber'), parts, parts.length ? 'Seleccionar número de parte' : 'Sin números de parte', p => p.number);
  updateCaptureDefects();
}

function updateCaptureDefects() {
  const partId = $('recordPartNumber').value;
  const defects = defectsForPart(partId);
  populateSelect($('recordDefect'), defects, defects.length ? 'Seleccionar defecto' : 'Sin defectos configurados', d => `${d.code} · ${d.name}`);
}

function updateCatalogParts() {
  const clientId = $('defectClient').value;
  const parts = partsForClient(clientId);
  populateSelect($('defectPartNumber'), parts, parts.length ? 'Seleccionar número de parte' : 'Sin números de parte', p => p.number);
}

function filteredRecords() {
  const start = $('filterStart').value;
  const end = $('filterEnd').value;
  const clientId = $('filterClient').value;
  const partId = $('filterPartNumber').value;
  return state.records.filter(r =>
    (!start || r.date >= start) &&
    (!end || r.date <= end) &&
    (!clientId || r.clientId === clientId) &&
    (!partId || r.partId === partId)
  );
}

function defectRowsForRecords(records) {
  const grouped = groupBy(records.filter(r => Number(r.scrap) > 0), r => r.defectId || 'uncategorized');
  return Object.entries(grouped).map(([id, rows]) => ({
    id,
    name: getDefect(id)?.name || 'Sin clasificar',
    code: getDefect(id)?.code || 'N/A',
    qty: rows.reduce((sum, r) => sum + Number(r.scrap || 0), 0)
  })).sort((a,b) => b.qty - a.qty);
}

function renderAll() {
  populateSelects();
  renderDashboard();
  renderClients();
  renderParts();
  renderDefectCatalog();
  renderHistory();
}

function renderDashboard() {
  const records = filteredRecords();
  const metrics = calculateMetrics(records);
  const defectRows = defectRowsForRecords(records);
  const top = defectRows[0];

  $('kpiProduction').textContent = number(metrics.produced);
  $('kpiScrap').textContent = percent(metrics.scrapRate);
  $('kpiScrapQty').textContent = `${number(metrics.scrap)} piezas`;
  $('kpiPpm').textContent = number(Math.round(metrics.ppm));
  $('kpiTopDefect').textContent = top?.name || 'Sin datos';
  $('kpiTopDefectShare').textContent = `${top && metrics.scrap ? ((top.qty / metrics.scrap) * 100).toFixed(1) : 0}% del scrap`;

  renderPartSummary(records);
  renderTopProducts(records);
  renderCharts(records, defectRows);
}

function renderPartSummary(records) {
  const grouped = groupBy(records, r => r.partId);
  const rows = Object.entries(grouped).map(([partId, recs]) => {
    const part = getPart(partId);
    const metrics = calculateMetrics(recs);
    const top = defectRowsForRecords(recs)[0];
    return { part, metrics, top };
  }).sort((a,b) => b.metrics.scrap - a.metrics.scrap);

  $('partSummaryBody').innerHTML = rows.length ? rows.map(row => `
    <tr>
      <td><strong>${escapeHtml(row.part?.number || 'N/D')}</strong></td>
      <td>${escapeHtml(getClient(row.part?.clientId)?.name || 'N/D')}</td>
      <td>${number(row.metrics.produced)}</td>
      <td>${number(row.metrics.scrap)}</td>
      <td class="${row.metrics.scrapRate ? 'metric-bad' : ''}">${percent(row.metrics.scrapRate)}</td>
      <td>${number(Math.round(row.metrics.ppm))}</td>
      <td>${escapeHtml(row.top?.name || '—')}</td>
    </tr>`).join('') : '<tr><td colspan="7" class="empty">No hay datos para los filtros seleccionados.</td></tr>';
}

function renderTopProducts(records) {
  const grouped = groupBy(records, r => r.partId);
  const rows = Object.entries(grouped).map(([partId, recs]) => ({
    part: getPart(partId),
    metrics: calculateMetrics(recs),
    defects: defectRowsForRecords(recs).slice(0, 3)
  })).sort((a,b) => b.metrics.scrap - a.metrics.scrap).slice(0, 3);

  $('topProductsGrid').innerHTML = rows.length ? rows.map((row, index) => `
    <article class="product-loss-card">
      <div class="rank">RANK ${index + 1}</div>
      <h4>${escapeHtml(row.part?.number || 'N/D')}</h4>
      <div class="client-name">${escapeHtml(getClient(row.part?.clientId)?.name || 'N/D')}</div>
      <div class="product-loss-metric"><div><span>Scrap generado</span><strong>${number(row.metrics.scrap)}</strong></div><div><span>Scrap %</span><strong>${percent(row.metrics.scrapRate)}</strong></div></div>
      <div class="defect-mini-list">
        ${row.defects.length ? row.defects.map((d, i) => `<div class="defect-mini-row"><span>${i + 1}. ${escapeHtml(d.name)}</span><strong>${number(d.qty)}</strong></div>`).join('') : '<div class="defect-mini-row"><span>Sin defectos clasificados</span><strong>—</strong></div>'}
      </div>
    </article>`).join('') : '<div class="empty-card">Captura información de producción y scrap para generar el Top 3 automáticamente.</div>';
}

function makeChart(id, config) {
  if (typeof Chart === 'undefined') return false;
  const canvas = $(id);
  if (!canvas) return false;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(canvas, config);
  return true;
}

function renderCharts(records, defectRows) {
  if (typeof Chart === 'undefined') {
    $('chartFallback').hidden = false;
    return;
  }
  $('chartFallback').hidden = true;

  const byDate = groupBy(records, r => r.date);
  const dates = Object.keys(byDate).sort();
  const gridColor = '#e4e8ee';
  const textColor = '#687386';

  const common = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: textColor }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } }
    }
  };

  makeChart('scrapTrendChart', {
    type: 'line',
    data: { labels: dates, datasets: [{ label: 'Scrap %', data: dates.map(d => calculateMetrics(byDate[d]).scrapRate), borderColor: '#EC6B1E', backgroundColor: 'rgba(236,107,30,.08)', fill: true, tension: .25, pointRadius: 2, borderWidth: 2 }] },
    options: common
  });

  makeChart('ppmTrendChart', {
    type: 'line',
    data: { labels: dates, datasets: [{ label: 'PPM', data: dates.map(d => calculateMetrics(byDate[d]).ppm), borderColor: '#143980', backgroundColor: 'rgba(20,57,128,.07)', fill: true, tension: .25, pointRadius: 2, borderWidth: 2 }] },
    options: common
  });

  const totalScrap = defectRows.reduce((sum, row) => sum + row.qty, 0);
  let cumulative = 0;
  makeChart('paretoChart', {
    data: {
      labels: defectRows.map(x => x.name),
      datasets: [
        { type: 'bar', label: 'Scrap', data: defectRows.map(x => x.qty), yAxisID: 'y', backgroundColor: '#143980' },
        { type: 'line', label: 'Acumulado %', data: defectRows.map(x => { cumulative += x.qty; return totalScrap ? (cumulative / totalScrap) * 100 : 0; }), yAxisID: 'y1', borderColor: '#EC6B1E', backgroundColor: '#EC6B1E', tension: .2, pointRadius: 3, borderWidth: 2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 14 } } },
      scales: {
        x: { ticks: { color: textColor }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
        y1: { beginAtZero: true, max: 100, position: 'right', ticks: { color: textColor, callback: v => `${v}%` }, grid: { drawOnChartArea: false } }
      }
    }
  });
}

function renderClients() {
  const query = $('clientSearch').value.trim().toLowerCase();
  const clients = [...state.clients].sort((a,b) => a.name.localeCompare(b.name)).filter(c => `${c.name} ${c.code || ''}`.toLowerCase().includes(query));
  $('clientCount').textContent = state.clients.length;

  $('clientList').innerHTML = clients.length ? clients.map(client => {
    const partCount = state.parts.filter(p => p.clientId === client.id).length;
    return `<button type="button" class="entity-row ${selectedClientId === client.id ? 'active' : ''}" data-select-client="${client.id}"><span><strong>${escapeHtml(client.name)}</strong><small>${escapeHtml(client.code || 'Sin código')}</small></span><span class="entity-count">${partCount}</span></button>`;
  }).join('') : '<div class="empty">Sin clientes registrados.</div>';

  renderClientDetail();
}

function renderClientDetail() {
  const client = getClient(selectedClientId);
  $('clientEmptyState').hidden = !!client;
  $('clientDetail').hidden = !client;
  if (!client) return;

  const parts = state.parts.filter(p => p.clientId === client.id);
  const records = state.records.filter(r => r.clientId === client.id);
  const metrics = calculateMetrics(records);

  $('clientDetailName').textContent = client.name;
  $('clientDetailCode').textContent = client.code || 'Sin código asignado';
  $('clientDetailParts').textContent = number(parts.length);
  $('clientDetailProduction').textContent = number(metrics.produced);
  $('clientDetailScrap').textContent = percent(metrics.scrapRate);
  $('clientDetailPpm').textContent = number(Math.round(metrics.ppm));

  $('clientPartsList').innerHTML = parts.length ? parts.sort((a,b) => a.number.localeCompare(b.number)).map(part => {
    const m = calculateMetrics(state.records.filter(r => r.partId === part.id));
    return `<div class="detail-list-row"><div><strong>${escapeHtml(part.number)}</strong><br><small>${escapeHtml(part.description || 'Sin descripción')} · Scrap ${percent(m.scrapRate)}</small></div><button type="button" data-open-part="${part.id}">Abrir ficha →</button></div>`;
  }).join('') : '<div class="empty">Este cliente todavía no tiene números de parte.</div>';
}

function renderParts() {
  const query = $('partSearch').value.trim().toLowerCase();
  const parts = [...state.parts].sort((a,b) => a.number.localeCompare(b.number)).filter(p => `${p.number} ${p.description || ''} ${getClient(p.clientId)?.name || ''}`.toLowerCase().includes(query));
  $('partCount').textContent = state.parts.length;

  $('partList').innerHTML = parts.length ? parts.map(part => {
    const defectCount = state.defects.filter(d => d.partId === part.id).length;
    return `<button type="button" class="entity-row ${selectedPartId === part.id ? 'active' : ''}" data-select-part="${part.id}"><span><strong>${escapeHtml(part.number)}</strong><small>${escapeHtml(getClient(part.clientId)?.name || 'Sin cliente')} · ${escapeHtml(part.description || 'Sin descripción')}</small></span><span class="entity-count">${defectCount}</span></button>`;
  }).join('') : '<div class="empty">Sin números de parte registrados.</div>';

  renderPartDetail();
}

function renderPartDetail() {
  const part = getPart(selectedPartId);
  $('partEmptyState').hidden = !!part;
  $('partDetail').hidden = !part;
  if (!part) return;

  const records = state.records.filter(r => r.partId === part.id);
  const metrics = calculateMetrics(records);
  const defects = defectRowsForRecords(records);
  const configured = defectsForPart(part.id);

  $('partDetailNumber').textContent = part.number;
  $('partDetailDescription').textContent = part.description || 'Sin descripción';
  $('partDetailClient').textContent = getClient(part.clientId)?.name || 'N/D';
  $('partDetailProduction').textContent = number(metrics.produced);
  $('partDetailScrapQty').textContent = number(metrics.scrap);
  $('partDetailScrapRate').textContent = percent(metrics.scrapRate);
  $('partDetailPpm').textContent = number(Math.round(metrics.ppm));

  const qtyMap = Object.fromEntries(defects.map(d => [d.id, d.qty]));
  $('partDefectList').innerHTML = configured.length ? configured.map(d => `<div class="detail-list-row"><div><strong>${escapeHtml(d.code)} · ${escapeHtml(d.name)}</strong><br><small>${escapeHtml(d.category || 'Sin categoría')}</small></div><strong>${number(qtyMap[d.id] || 0)} scrap</strong></div>`).join('') : '<div class="empty">Este producto todavía no tiene defectos configurados.</div>';
}

function renderDefectCatalog() {
  const query = $('defectSearch').value.trim().toLowerCase();
  const rows = [...state.defects].filter(d => {
    const part = getPart(d.partId);
    const client = getClient(part?.clientId);
    return `${d.code} ${d.name} ${d.category || ''} ${part?.number || ''} ${client?.name || ''}`.toLowerCase().includes(query);
  }).sort((a,b) => (getPart(a.partId)?.number || '').localeCompare(getPart(b.partId)?.number || '') || a.code.localeCompare(b.code));

  $('defectTableBody').innerHTML = rows.length ? rows.map(d => {
    const part = getPart(d.partId);
    return `<tr><td><strong>${escapeHtml(d.code)}</strong></td><td>${escapeHtml(d.name)}</td><td>${escapeHtml(d.category || '—')}</td><td>${escapeHtml(part?.number || 'N/D')}</td><td>${escapeHtml(getClient(part?.clientId)?.name || 'N/D')}</td><td><button class="icon-btn" data-delete-defect="${d.id}" title="Eliminar">×</button></td></tr>`;
  }).join('') : '<tr><td colspan="6" class="empty">No hay defectos en el catálogo.</td></tr>';
}

function renderHistory() {
  const query = $('historySearch').value.trim().toLowerCase();
  const rows = [...state.records].sort((a,b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`)).filter(r => {
    const part = getPart(r.partId);
    const client = getClient(r.clientId);
    const defect = getDefect(r.defectId);
    return `${r.date} ${client?.name || ''} ${part?.number || ''} ${defect?.name || ''} ${r.operation || ''}`.toLowerCase().includes(query);
  });

  $('recordsBody').innerHTML = rows.length ? rows.map(r => {
    const metrics = calculateMetrics([r]);
    return `<tr><td>${r.date}</td><td>${escapeHtml(r.shift)}</td><td>${escapeHtml(getClient(r.clientId)?.name || 'N/D')}</td><td><strong>${escapeHtml(getPart(r.partId)?.number || 'N/D')}</strong></td><td>${number(r.produced)}</td><td>${number(r.scrap)}</td><td>${percent(metrics.scrapRate)}</td><td>${number(Math.round(metrics.ppm))}</td><td>${escapeHtml(getDefect(r.defectId)?.name || '—')}</td><td>${escapeHtml(r.operation || '—')}</td><td><button class="icon-btn" data-delete-record="${r.id}" title="Eliminar">×</button></td></tr>`;
  }).join('') : '<tr><td colspan="11" class="empty">No hay registros capturados.</td></tr>';
}

function exportExcel() {
  if (!state.records.length) return toast('No hay registros para exportar.');

  const detail = state.records.map(r => {
    const m = calculateMetrics([r]);
    const part = getPart(r.partId);
    const defect = getDefect(r.defectId);
    return {
      Fecha: r.date,
      Turno: r.shift,
      Cliente: getClient(r.clientId)?.name || '',
      'Número de parte': part?.number || '',
      Producción: r.produced,
      Scrap: r.scrap,
      'Scrap %': m.scrapRate,
      PPM: Math.round(m.ppm),
      'Código defecto': defect?.code || '',
      Defecto: defect?.name || '',
      Categoría: defect?.category || '',
      Operación: r.operation || '',
      Comentarios: r.notes || ''
    };
  });

  const summary = Object.entries(groupBy(state.records, r => r.partId)).map(([partId, recs]) => {
    const part = getPart(partId);
    const m = calculateMetrics(recs);
    return {
      Cliente: getClient(part?.clientId)?.name || '',
      'Número de parte': part?.number || '',
      Descripción: part?.description || '',
      Producción: m.produced,
      Scrap: m.scrap,
      'Scrap %': m.scrapRate,
      PPM: Math.round(m.ppm)
    };
  });

  if (typeof XLSX !== 'undefined') {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), 'Historial');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Resumen por NP');
    XLSX.writeFile(wb, `Quality_Summary_${today()}.xlsx`, { compression: true });
    return;
  }

  const headers = Object.keys(detail[0]);
  const csv = [headers.join(','), ...detail.map(row => headers.map(h => `"${String(row[h] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Quality_Summary_${today()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast('Excel no estaba disponible; se exportó CSV.');
}

function loadDemo() {
  if ((state.clients.length || state.records.length) && !confirm('Esto reemplazará los datos actuales por información demo.')) return;

  const c1 = uid(), c2 = uid(), c3 = uid();
  const p1 = uid(), p2 = uid(), p3 = uid(), p4 = uid();
  const d1 = uid(), d2 = uid(), d3 = uid(), d4 = uid(), d5 = uid(), d6 = uid(), d7 = uid();

  state = {
    clients: [
      { id: c1, name: 'SPX', code: 'SPX' },
      { id: c2, name: 'Schneider Electric', code: 'SE' },
      { id: c3, name: 'Stillwell', code: 'STW' }
    ],
    parts: [
      { id: p1, clientId: c1, number: '871276PSP', description: 'Drive Shaft' },
      { id: p2, clientId: c1, number: '272285PD4', description: 'Machined Component' },
      { id: p3, clientId: c2, number: 'GHD12273AA', description: 'Housing' },
      { id: p4, clientId: c3, number: 'CB40515', description: 'Machined Casting' }
    ],
    defects: [
      { id: d1, partId: p1, code: 'D01', name: 'Runout fuera de especificación', category: 'Dimensional' },
      { id: d2, partId: p1, code: 'D02', name: 'Rebaba en keyway', category: 'Visual' },
      { id: d3, partId: p1, code: 'D03', name: 'Daño superficial', category: 'Visual' },
      { id: d4, partId: p2, code: 'D01', name: 'Diámetro sobremedida', category: 'Dimensional' },
      { id: d5, partId: p2, code: 'D02', name: 'Rosca dañada', category: 'Rosca' },
      { id: d6, partId: p3, code: 'D01', name: 'Rosca fuera de especificación', category: 'Rosca' },
      { id: d7, partId: p4, code: 'D01', name: 'Porosidad', category: 'Material' }
    ],
    records: []
  };

  const base = new Date();
  for (let i = 20; i >= 0; i--) {
    const dt = new Date(base);
    dt.setDate(base.getDate() - i);
    const date = dt.toISOString().slice(0, 10);
    state.records.push(
      { id: uid(), date, shift: '1', clientId: c1, partId: p1, produced: 900 + Math.round(Math.random()*300), scrap: 4 + Math.round(Math.random()*10), defectId: [d1,d1,d2,d3][Math.floor(Math.random()*4)], operation: 'OP30', notes: '' },
      { id: uid(), date, shift: '2', clientId: c1, partId: p2, produced: 650 + Math.round(Math.random()*220), scrap: 2 + Math.round(Math.random()*7), defectId: Math.random() > .35 ? d4 : d5, operation: 'OP20', notes: '' },
      { id: uid(), date, shift: '1', clientId: c2, partId: p3, produced: 500 + Math.round(Math.random()*170), scrap: 1 + Math.round(Math.random()*5), defectId: d6, operation: 'Roscado', notes: '' },
      { id: uid(), date, shift: '2', clientId: c3, partId: p4, produced: 420 + Math.round(Math.random()*140), scrap: Math.round(Math.random()*5), defectId: d7, operation: 'OP10', notes: '' }
    );
  }

  selectedClientId = c1;
  selectedPartId = p1;
  saveState();
  renderAll();
  toast('Datos demo cargados.');
}

function switchView(view, title) {
  document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.view === view));
  document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
  const target = $(`${view}View`);
  if (target) target.classList.add('active');
  $('pageTitle').textContent = title || view;
}

function initEvents() {
  document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view, btn.dataset.title || btn.textContent.trim())));

  $('filterClient').addEventListener('change', () => { updateFilterParts(); renderDashboard(); });
  $('filterPartNumber').addEventListener('change', renderDashboard);
  $('filterStart').addEventListener('change', renderDashboard);
  $('filterEnd').addEventListener('change', renderDashboard);
  $('clearFiltersBtn').addEventListener('click', () => {
    ['filterStart','filterEnd','filterClient','filterPartNumber'].forEach(id => $(id).value = '');
    updateFilterParts();
    renderDashboard();
  });

  $('recordClient').addEventListener('change', updateCaptureParts);
  $('recordPartNumber').addEventListener('change', updateCaptureDefects);
  $('defectClient').addEventListener('change', updateCatalogParts);

  $('exportBtn').addEventListener('click', exportExcel);
  $('loadDemoBtn').addEventListener('click', loadDemo);

  $('clientForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('clientName').value.trim();
    const code = $('clientCode').value.trim();
    if (state.clients.some(x => x.name.toLowerCase() === name.toLowerCase())) return toast('El cliente ya existe.');
    const client = { id: uid(), name, code };
    state.clients.push(client);
    selectedClientId = client.id;
    e.target.reset();
    saveState();
    renderAll();
    toast('Cliente creado.');
  });

  $('partForm').addEventListener('submit', e => {
    e.preventDefault();
    const clientId = $('partClient').value;
    const partNumber = $('partNumberName').value.trim();
    if (!clientId) return toast('Selecciona un cliente.');
    if (state.parts.some(x => x.number.toLowerCase() === partNumber.toLowerCase() && x.clientId === clientId)) return toast('Ese número de parte ya existe para el cliente.');
    const part = { id: uid(), clientId, number: partNumber, description: $('partDescription').value.trim() };
    state.parts.push(part);
    selectedPartId = part.id;
    selectedClientId = clientId;
    e.target.reset();
    saveState();
    renderAll();
    toast('Número de parte creado.');
  });

  $('defectForm').addEventListener('submit', e => {
    e.preventDefault();
    const partId = $('defectPartNumber').value;
    if (!partId) return toast('Selecciona un número de parte.');
    const code = $('defectCode').value.trim();
    if (state.defects.some(d => d.partId === partId && d.code.toLowerCase() === code.toLowerCase())) return toast('Ese código de defecto ya existe para el NP.');
    state.defects.push({ id: uid(), partId, code, name: $('defectName').value.trim(), category: $('defectCategory').value });
    e.target.reset();
    $('defectClient').value = getPart(partId)?.clientId || '';
    updateCatalogParts();
    $('defectPartNumber').value = partId;
    saveState();
    renderAll();
    toast('Defecto agregado.');
  });

  $('productionForm').addEventListener('submit', e => {
    e.preventDefault();
    const clientId = $('recordClient').value;
    const partId = $('recordPartNumber').value;
    const produced = Number($('recordProduced').value);
    const scrap = Number($('recordScrap').value);
    if (!clientId || !partId) return toast('Selecciona cliente y número de parte.');
    if (scrap > produced) return toast('El scrap no puede ser mayor que la producción.');
    if (scrap > 0 && !$('recordDefect').value) return toast('Selecciona el defecto asociado al scrap.');

    state.records.push({
      id: uid(),
      date: $('recordDate').value,
      shift: $('recordShift').value,
      clientId,
      partId,
      produced,
      scrap,
      defectId: $('recordDefect').value,
      operation: $('recordOperation').value.trim(),
      notes: $('recordNotes').value.trim()
    });

    saveState();
    e.target.reset();
    $('recordDate').value = today();
    $('recordScrap').value = 0;
    populateSelects();
    renderAll();
    toast('Registro guardado.');
  });

  $('clientSearch').addEventListener('input', renderClients);
  $('partSearch').addEventListener('input', renderParts);
  $('defectSearch').addEventListener('input', renderDefectCatalog);
  $('historySearch').addEventListener('input', renderHistory);

  $('clientAddPartBtn').addEventListener('click', () => {
    if (!selectedClientId) return;
    switchView('parts', 'Números de Parte');
    $('partClient').value = selectedClientId;
    $('partNumberName').focus();
  });

  $('partAddDefectBtn').addEventListener('click', () => {
    const part = getPart(selectedPartId);
    if (!part) return;
    switchView('catalog', 'Catálogo');
    $('defectClient').value = part.clientId;
    updateCatalogParts();
    $('defectPartNumber').value = part.id;
    $('defectCode').focus();
  });

  $('deleteClientBtn').addEventListener('click', () => {
    const client = getClient(selectedClientId);
    if (!client) return;
    if (state.parts.some(p => p.clientId === client.id)) return toast('El cliente tiene números de parte. Elimínalos primero.');
    if (!confirm(`¿Eliminar el cliente ${client.name}?`)) return;
    state.clients = state.clients.filter(c => c.id !== client.id);
    selectedClientId = null;
    saveState(); renderAll(); toast('Cliente eliminado.');
  });

  $('deletePartBtn').addEventListener('click', () => {
    const part = getPart(selectedPartId);
    if (!part) return;
    if (state.records.some(r => r.partId === part.id)) return toast('El NP tiene registros históricos y no puede eliminarse.');
    if (!confirm(`¿Eliminar el NP ${part.number} y sus defectos?`)) return;
    state.defects = state.defects.filter(d => d.partId !== part.id);
    state.parts = state.parts.filter(p => p.id !== part.id);
    selectedPartId = null;
    saveState(); renderAll(); toast('Número de parte eliminado.');
  });

  $('clearDataBtn').addEventListener('click', () => {
    if (!state.records.length) return toast('No hay registros para eliminar.');
    if (!confirm('¿Eliminar todo el historial de producción y scrap? Los clientes, NP y defectos se conservarán.')) return;
    state.records = [];
    saveState(); renderAll(); toast('Historial eliminado.');
  });

  document.addEventListener('click', e => {
    const clientBtn = e.target.closest('[data-select-client]');
    if (clientBtn) {
      selectedClientId = clientBtn.dataset.selectClient;
      renderClients();
      return;
    }

    const partBtn = e.target.closest('[data-select-part]');
    if (partBtn) {
      selectedPartId = partBtn.dataset.selectPart;
      renderParts();
      return;
    }

    const openPartBtn = e.target.closest('[data-open-part]');
    if (openPartBtn) {
      selectedPartId = openPartBtn.dataset.openPart;
      switchView('parts', 'Números de Parte');
      renderParts();
      return;
    }

    const deleteDefectBtn = e.target.closest('[data-delete-defect]');
    if (deleteDefectBtn) {
      const id = deleteDefectBtn.dataset.deleteDefect;
      if (state.records.some(r => r.defectId === id)) return toast('El defecto está ligado al historial y no puede eliminarse.');
      state.defects = state.defects.filter(d => d.id !== id);
      saveState(); renderAll(); toast('Defecto eliminado.');
      return;
    }

    const deleteRecordBtn = e.target.closest('[data-delete-record]');
    if (deleteRecordBtn) {
      if (!confirm('¿Eliminar este registro?')) return;
      state.records = state.records.filter(r => r.id !== deleteRecordBtn.dataset.deleteRecord);
      saveState(); renderAll(); toast('Registro eliminado.');
    }
  });
}

function init() {
  $('recordDate').value = today();
  selectedClientId = state.clients[0]?.id || null;
  selectedPartId = state.parts[0]?.id || null;
  initEvents();
  renderAll();
}

init();

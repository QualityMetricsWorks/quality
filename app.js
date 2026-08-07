'use strict';

const APP_VERSION = 'Beta 0.1';
const STORAGE_KEY = 'qualitySummaryData_beta01';
const initialState = { businessUnits: [], parts: [], defects: [], records: [] };
let state = loadState();
let charts = {};
let toastTimer;

const $ = (id) => document.getElementById(id);
const formatNumber = (value) => new Intl.NumberFormat('es-MX').format(Number(value) || 0);
const formatPercent = (value) => `${(Number(value) || 0).toFixed(2)}%`;
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
  ? globalThis.crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clone = (value) => JSON.parse(JSON.stringify(value));
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...clone(initialState), ...JSON.parse(stored) } : clone(initialState);
  } catch (error) {
    console.warn('No fue posible leer el almacenamiento local.', error);
    return clone(initialState);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setStorageStatus('Datos guardados localmente', 'ok');
  } catch (error) {
    console.error('No fue posible guardar los datos.', error);
    setStorageStatus('Error de almacenamiento', 'error');
    toast('No fue posible guardar en este navegador.', 'error');
  }
}

function setStorageStatus(text, status = 'idle') {
  const label = $('storageStatus');
  const dot = document.querySelector('.status-dot');
  if (label) label.textContent = text;
  if (dot) dot.dataset.status = status;
}

function toast(message, type = 'success') {
  const el = $('toast');
  if (!el) return;
  clearTimeout(toastTimer);
  el.textContent = message;
  el.dataset.type = type;
  el.classList.add('show');
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function getBusinessUnit(id) { return state.businessUnits.find((item) => item.id === id); }
function getPart(id) { return state.parts.find((item) => item.id === id); }
function getDefect(id) { return state.defects.find((item) => item.id === id); }

function calculateMetrics(records) {
  const produced = records.reduce((sum, record) => sum + Number(record.produced || 0), 0);
  const scrap = records.reduce((sum, record) => sum + Number(record.scrap || 0), 0);
  return {
    produced,
    scrap,
    scrapRate: produced ? (scrap / produced) * 100 : 0,
    ppm: produced ? (scrap / produced) * 1_000_000 : 0,
    yieldRate: produced ? ((produced - scrap) / produced) * 100 : 0
  };
}

function groupBy(records, keyFn) {
  return records.reduce((groups, record) => {
    const key = keyFn(record);
    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
    return groups;
  }, {});
}

function filteredRecords() {
  const start = $('filterStart').value;
  const end = $('filterEnd').value;
  const businessUnitId = $('filterBusinessUnit').value;
  const partId = $('filterPartNumber').value;

  return state.records.filter((record) => (
    (!start || record.date >= start) &&
    (!end || record.date <= end) &&
    (!businessUnitId || record.businessUnitId === businessUnitId) &&
    (!partId || record.partId === partId)
  ));
}

function populateSelect(select, items, placeholder, labelFn, required = false) {
  if (!select) return;
  const currentValue = select.value;
  const placeholderOption = `<option value="">${escapeHtml(placeholder)}</option>`;
  const options = items.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(labelFn(item))}</option>`).join('');
  select.innerHTML = placeholderOption + options;
  if ([...select.options].some((option) => option.value === currentValue)) select.value = currentValue;
  if (required && !select.value && items.length === 1) select.value = items[0].id;
}

function populateSelects() {
  const businessUnits = [...state.businessUnits].sort((a, b) => a.name.localeCompare(b.name));
  const allParts = [...state.parts].sort((a, b) => a.number.localeCompare(b.number));

  populateSelect($('filterBusinessUnit'), businessUnits, 'Todas las unidades', (item) => item.name);
  populateSelect($('recordBusinessUnit'), businessUnits, 'Seleccionar unidad', (item) => item.name, true);
  populateSelect($('partBusinessUnit'), businessUnits, 'Seleccionar unidad', (item) => item.name, true);

  updatePartSelects(allParts);
  populateSelect($('defectPartNumber'), allParts, 'Seleccionar número de parte', (item) => `${item.number} · ${getBusinessUnit(item.businessUnitId)?.name || ''}`, true);
  updateRecordDefects();
}

function updatePartSelects(allParts = [...state.parts]) {
  const selectedBusinessUnit = $('recordBusinessUnit').value;
  const recordParts = selectedBusinessUnit
    ? allParts.filter((part) => part.businessUnitId === selectedBusinessUnit)
    : allParts;

  populateSelect($('filterPartNumber'), allParts, 'Todos los números de parte', (item) => `${item.number} · ${getBusinessUnit(item.businessUnitId)?.name || ''}`);
  populateSelect($('recordPartNumber'), recordParts, recordParts.length ? 'Seleccionar número de parte' : 'Sin NP configurados', (item) => item.number, true);
}

function updateRecordDefects() {
  const partId = $('recordPartNumber').value;
  const defects = state.defects.filter((defect) => defect.partId === partId);
  populateSelect(
    $('recordDefect'),
    defects,
    defects.length ? 'Seleccionar defecto' : 'Sin defectos configurados',
    (defect) => `${defect.code} · ${defect.name}`
  );
}

function renderAll() {
  populateSelects();
  renderCatalogs();
  renderRecords();
  renderDashboard();
  updateEmptyState();
}

function updateEmptyState() {
  const captureButton = $('productionForm')?.querySelector('[type="submit"]');
  if (captureButton) {
    const ready = state.businessUnits.length && state.parts.length;
    captureButton.disabled = !ready;
    captureButton.title = ready ? '' : 'Primero registra una unidad de negocio y un número de parte.';
  }
}

function renderDashboard() {
  const records = filteredRecords();
  const metrics = calculateMetrics(records);

  $('kpiProduction').textContent = formatNumber(metrics.produced);
  $('kpiScrap').textContent = formatPercent(metrics.scrapRate);
  $('kpiScrapQty').textContent = `${formatNumber(metrics.scrap)} piezas rechazadas`;
  $('kpiPpm').textContent = formatNumber(Math.round(metrics.ppm));
  if ($('kpiYield')) $('kpiYield').textContent = formatPercent(metrics.yieldRate);

  const defectGroups = groupBy(records.filter((record) => Number(record.scrap) > 0), (record) => record.defectId || 'uncategorized');
  const defectRows = Object.entries(defectGroups)
    .map(([id, rows]) => ({
      id,
      name: getDefect(id)?.name || 'Sin clasificar',
      code: getDefect(id)?.code || 'N/D',
      qty: rows.reduce((sum, row) => sum + Number(row.scrap || 0), 0)
    }))
    .sort((a, b) => b.qty - a.qty);

  const topDefect = defectRows[0];
  $('kpiTopDefect').textContent = topDefect?.name || 'Sin datos';
  $('kpiTopDefectShare').textContent = `${topDefect && metrics.scrap ? ((topDefect.qty / metrics.scrap) * 100).toFixed(1) : 0}% del scrap total`;

  renderPartSummary(records);
  renderParetoTable(defectRows, metrics.scrap);
  renderCharts(records, defectRows);
}

function renderPartSummary(records) {
  const grouped = groupBy(records, (record) => record.partId);
  const rows = Object.entries(grouped).map(([partId, partRecords]) => {
    const part = getPart(partId);
    const metrics = calculateMetrics(partRecords);
    const defectGroups = groupBy(partRecords.filter((record) => Number(record.scrap) > 0), (record) => record.defectId || 'uncategorized');
    const topDefect = Object.entries(defectGroups)
      .map(([id, items]) => ({
        name: getDefect(id)?.name || 'Sin clasificar',
        qty: items.reduce((sum, item) => sum + Number(item.scrap || 0), 0)
      }))
      .sort((a, b) => b.qty - a.qty)[0];

    return { part, metrics, topDefect };
  }).sort((a, b) => b.metrics.scrapRate - a.metrics.scrapRate);

  $('partSummaryBody').innerHTML = rows.length
    ? rows.map(({ part, metrics, topDefect }) => `
      <tr>
        <td><span class="part-number">${escapeHtml(part?.number || 'N/D')}</span></td>
        <td>${escapeHtml(getBusinessUnit(part?.businessUnitId)?.name || 'N/D')}</td>
        <td>${formatNumber(metrics.produced)}</td>
        <td>${formatNumber(metrics.scrap)}</td>
        <td><span class="metric-pill ${metrics.scrapRate > 0 ? 'metric-pill--bad' : 'metric-pill--good'}">${formatPercent(metrics.scrapRate)}</span></td>
        <td>${formatNumber(Math.round(metrics.ppm))}</td>
        <td>${escapeHtml(topDefect?.name || '—')}</td>
      </tr>`).join('')
    : '<tr><td colspan="7" class="empty">No hay datos para los filtros seleccionados.</td></tr>';
}

function renderParetoTable(defectRows, totalScrap) {
  const body = $('paretoBody');
  if (!body) return;
  let cumulative = 0;
  body.innerHTML = defectRows.length
    ? defectRows.map((row, index) => {
      cumulative += row.qty;
      const contribution = totalScrap ? (row.qty / totalScrap) * 100 : 0;
      const cumulativePercentage = totalScrap ? (cumulative / totalScrap) * 100 : 0;
      return `<tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(row.code)}</strong></td>
        <td>${escapeHtml(row.name)}</td>
        <td>${formatNumber(row.qty)}</td>
        <td>${formatPercent(contribution)}</td>
        <td>${formatPercent(cumulativePercentage)}</td>
        <td><span class="metric-pill ${cumulativePercentage <= 80 ? 'metric-pill--warning' : 'metric-pill--neutral'}">${cumulativePercentage <= 80 ? 'Prioridad' : 'Secundario'}</span></td>
      </tr>`;
    }).join('')
    : '<tr><td colspan="7" class="empty">Captura scrap para generar el análisis Pareto.</td></tr>';
}

function chartAvailable() {
  return typeof globalThis.Chart !== 'undefined';
}

function makeChart(id, config) {
  const canvas = $(id);
  if (!canvas || !chartAvailable()) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(canvas, config);
}

function renderCharts(records, defectRows) {
  const fallback = $('chartFallback');
  if (!chartAvailable()) {
    if (fallback) fallback.hidden = false;
    return;
  }
  if (fallback) fallback.hidden = true;

  Chart.defaults.font.family = 'Inter, Arial, sans-serif';
  Chart.defaults.color = '#526171';
  const palette = ['#143980', '#EC6B1E', '#006732', '#697785', '#9B3A2F', '#D7A017'];

  const byDate = groupBy(records, (record) => record.date);
  const dates = Object.keys(byDate).sort();
  makeChart('trendChart', {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        { label: 'Scrap %', data: dates.map((date) => calculateMetrics(byDate[date]).scrapRate), yAxisID: 'y', borderColor: palette[1], backgroundColor: 'rgba(236,107,30,.12)', fill: true, tension: .28, pointRadius: 3 },
        { label: 'PPM', data: dates.map((date) => calculateMetrics(byDate[date]).ppm), yAxisID: 'y1', borderColor: palette[0], backgroundColor: palette[0], tension: .28, pointRadius: 3 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Scrap %' }, grid: { color: '#E3E8ED' } },
        y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'PPM' } },
        x: { grid: { display: false } }
      }
    }
  });

  const totalScrap = defectRows.reduce((sum, row) => sum + row.qty, 0);
  let cumulative = 0;
  makeChart('paretoChart', {
    data: {
      labels: defectRows.map((row) => row.name),
      datasets: [
        { type: 'bar', label: 'Scrap', data: defectRows.map((row) => row.qty), yAxisID: 'y', backgroundColor: palette[1], borderRadius: 2 },
        { type: 'line', label: 'Acumulado %', data: defectRows.map((row) => { cumulative += row.qty; return totalScrap ? (cumulative / totalScrap) * 100 : 0; }), yAxisID: 'y1', borderColor: palette[0], backgroundColor: palette[0], tension: .2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#E3E8ED' } },
        y1: { beginAtZero: true, max: 100, position: 'right', grid: { drawOnChartArea: false } },
        x: { grid: { display: false }, ticks: { maxRotation: 30, minRotation: 0 } }
      }
    }
  });

  const byBusinessUnit = groupBy(records, (record) => record.businessUnitId);
  const unitRows = Object.entries(byBusinessUnit)
    .map(([id, unitRecords]) => ({ name: getBusinessUnit(id)?.name || 'N/D', scrap: calculateMetrics(unitRecords).scrap }))
    .sort((a, b) => b.scrap - a.scrap);

  makeChart('businessUnitChart', {
    type: 'doughnut',
    data: {
      labels: unitRows.map((row) => row.name),
      datasets: [{ data: unitRows.map((row) => row.scrap), backgroundColor: palette, borderColor: '#FFFFFF', borderWidth: 3 }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom' } } }
  });
}

function renderCatalogs() {
  $('businessUnitList').innerHTML = state.businessUnits.length
    ? state.businessUnits.map((item) => `<li><span><strong>${escapeHtml(item.name)}</strong></span><button class="icon-btn" type="button" aria-label="Eliminar unidad" data-delete-bu="${item.id}">×</button></li>`).join('')
    : '<li class="catalog-empty">Sin unidades registradas</li>';

  $('partList').innerHTML = state.parts.length
    ? state.parts.map((item) => `<li><span><strong>${escapeHtml(item.number)}</strong><br><small>${escapeHtml(getBusinessUnit(item.businessUnitId)?.name || '')}${item.description ? ` · ${escapeHtml(item.description)}` : ''}</small></span><button class="icon-btn" type="button" aria-label="Eliminar número de parte" data-delete-part="${item.id}">×</button></li>`).join('')
    : '<li class="catalog-empty">Sin números de parte</li>';

  $('defectList').innerHTML = state.defects.length
    ? state.defects.map((item) => `<li><span><strong>${escapeHtml(item.code)} · ${escapeHtml(item.name)}</strong><br><small>${escapeHtml(getPart(item.partId)?.number || '')}</small></span><button class="icon-btn" type="button" aria-label="Eliminar defecto" data-delete-defect="${item.id}">×</button></li>`).join('')
    : '<li class="catalog-empty">Sin defectos configurados</li>';
}

function renderRecords() {
  const rows = [...state.records].sort((a, b) => b.date.localeCompare(a.date));
  $('recordsBody').innerHTML = rows.length
    ? rows.map((record) => `<tr>
      <td>${escapeHtml(record.date)}</td>
      <td>T${escapeHtml(record.shift)}</td>
      <td>${escapeHtml(getBusinessUnit(record.businessUnitId)?.name || 'N/D')}</td>
      <td><span class="part-number">${escapeHtml(getPart(record.partId)?.number || 'N/D')}</span></td>
      <td>${formatNumber(record.produced)}</td>
      <td>${formatNumber(record.scrap)}</td>
      <td>${escapeHtml(getDefect(record.defectId)?.name || '—')}</td>
      <td>${escapeHtml(record.operation || '—')}</td>
      <td><button class="icon-btn" type="button" aria-label="Eliminar registro" data-delete-record="${record.id}">×</button></td>
    </tr>`).join('')
    : '<tr><td colspan="9" class="empty">No hay registros capturados.</td></tr>';
}

function exportExcel() {
  if (!state.records.length) return toast('No hay registros para exportar.', 'warning');
  if (typeof globalThis.XLSX === 'undefined') return exportCsvFallback();

  const detail = state.records.map((record) => {
    const metrics = calculateMetrics([record]);
    return {
      Fecha: record.date,
      Turno: record.shift,
      'Unidad de negocio': getBusinessUnit(record.businessUnitId)?.name || '',
      'Número de parte': getPart(record.partId)?.number || '',
      Producción: record.produced,
      Scrap: record.scrap,
      'Scrap %': metrics.scrapRate,
      PPM: Math.round(metrics.ppm),
      'Código de defecto': getDefect(record.defectId)?.code || '',
      Defecto: getDefect(record.defectId)?.name || '',
      Operación: record.operation || '',
      Comentarios: record.notes || ''
    };
  });

  const summaryGroups = groupBy(state.records, (record) => record.partId);
  const summary = Object.entries(summaryGroups).map(([id, records]) => {
    const part = getPart(id);
    const metrics = calculateMetrics(records);
    return {
      'Unidad de negocio': getBusinessUnit(part?.businessUnitId)?.name || '',
      'Número de parte': part?.number || '',
      Producción: metrics.produced,
      Scrap: metrics.scrap,
      'Scrap %': metrics.scrapRate,
      PPM: Math.round(metrics.ppm),
      Yield: metrics.yieldRate
    };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detail), 'Registros');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), 'Resumen por NP');
  XLSX.writeFile(workbook, `Quality_Summary_${today()}.xlsx`, { compression: true });
  toast('Excel generado correctamente.');
}

function exportCsvFallback() {
  const headers = ['Fecha', 'Turno', 'Unidad de negocio', 'Número de parte', 'Producción', 'Scrap', 'Scrap %', 'PPM', 'Defecto', 'Operación', 'Comentarios'];
  const lines = state.records.map((record) => {
    const metrics = calculateMetrics([record]);
    return [record.date, record.shift, getBusinessUnit(record.businessUnitId)?.name || '', getPart(record.partId)?.number || '', record.produced, record.scrap, metrics.scrapRate.toFixed(4), Math.round(metrics.ppm), getDefect(record.defectId)?.name || '', record.operation || '', record.notes || '']
      .map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',');
  });
  const blob = new Blob([`\uFEFF${headers.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Quality_Summary_${today()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast('La librería Excel no cargó; se exportó CSV.', 'warning');
}

function loadDemo() {
  if (state.records.length && !confirm('Esto reemplazará los datos actuales por información demo. ¿Continuar?')) return;
  const bu1 = uid(); const bu2 = uid();
  const p1 = uid(); const p2 = uid(); const p3 = uid();
  const d1 = uid(); const d2 = uid(); const d3 = uid(); const d4 = uid();

  state = {
    businessUnits: [{ id: bu1, name: 'SPX' }, { id: bu2, name: 'Schneider Electric' }],
    parts: [
      { id: p1, businessUnitId: bu1, number: '871276PSP', description: 'Drive Shaft' },
      { id: p2, businessUnitId: bu1, number: '272285PD4', description: 'Machined Component' },
      { id: p3, businessUnitId: bu2, number: 'GHD12273AA', description: 'Housing' }
    ],
    defects: [
      { id: d1, partId: p1, code: 'D01', name: 'Runout fuera de especificación' },
      { id: d2, partId: p1, code: 'D02', name: 'Rebaba en keyway' },
      { id: d3, partId: p2, code: 'D01', name: 'Diámetro sobremedida' },
      { id: d4, partId: p3, code: 'D01', name: 'Rosca dañada' }
    ],
    records: []
  };

  const base = new Date();
  for (let i = 13; i >= 0; i -= 1) {
    const dateValue = new Date(base);
    dateValue.setDate(base.getDate() - i);
    const date = dateValue.toISOString().slice(0, 10);
    state.records.push(
      { id: uid(), date, shift: '1', businessUnitId: bu1, partId: p1, produced: 900 + Math.round(Math.random() * 250), scrap: 4 + Math.round(Math.random() * 8), defectId: Math.random() > .45 ? d1 : d2, operation: 'OP30', notes: '' },
      { id: uid(), date, shift: '2', businessUnitId: bu1, partId: p2, produced: 650 + Math.round(Math.random() * 200), scrap: 2 + Math.round(Math.random() * 5), defectId: d3, operation: 'OP20', notes: '' },
      { id: uid(), date, shift: '1', businessUnitId: bu2, partId: p3, produced: 500 + Math.round(Math.random() * 150), scrap: 1 + Math.round(Math.random() * 4), defectId: d4, operation: 'Roscado', notes: '' }
    );
  }

  saveState();
  renderAll();
  toast('Datos demo cargados.');
}

function switchView(viewName, button) {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
  button.classList.add('active');
  $(`${viewName}View`).classList.add('active');
  $('pageTitle').textContent = button.dataset.title || button.textContent.trim();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (viewName === 'dashboard') setTimeout(renderDashboard, 60);
}

function initEvents() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view, button));
  });

  ['filterStart', 'filterEnd', 'filterBusinessUnit', 'filterPartNumber'].forEach((id) => {
    $(id).addEventListener('change', renderDashboard);
  });

  $('clearFiltersBtn').addEventListener('click', () => {
    ['filterStart', 'filterEnd', 'filterBusinessUnit', 'filterPartNumber'].forEach((id) => { $(id).value = ''; });
    renderDashboard();
  });

  $('recordBusinessUnit').addEventListener('change', () => {
    updatePartSelects();
    updateRecordDefects();
  });
  $('recordPartNumber').addEventListener('change', updateRecordDefects);
  $('exportBtn').addEventListener('click', exportExcel);
  $('loadDemoBtn').addEventListener('click', loadDemo);

  $('businessUnitForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('businessUnitName').value.trim();
    if (!name) return toast('Escribe el nombre de la unidad.', 'warning');
    if (state.businessUnits.some((item) => item.name.toLowerCase() === name.toLowerCase())) return toast('La unidad ya existe.', 'warning');
    state.businessUnits.push({ id: uid(), name });
    event.target.reset();
    saveState(); renderAll(); toast('Unidad de negocio agregada.');
  });

  $('partForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const businessUnitId = $('partBusinessUnit').value;
    const partNumber = $('partNumberName').value.trim();
    if (!businessUnitId) return toast('Selecciona una unidad de negocio.', 'warning');
    if (!partNumber) return toast('Escribe el número de parte.', 'warning');
    if (state.parts.some((item) => item.number.toLowerCase() === partNumber.toLowerCase())) return toast('El número de parte ya existe.', 'warning');
    state.parts.push({ id: uid(), businessUnitId, number: partNumber, description: $('partDescription').value.trim() });
    event.target.reset();
    saveState(); renderAll(); toast('Número de parte agregado.');
  });

  $('defectForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const partId = $('defectPartNumber').value;
    const code = $('defectCode').value.trim();
    const name = $('defectName').value.trim();
    if (!partId) return toast('Selecciona un número de parte.', 'warning');
    if (!code || !name) return toast('Completa el código y nombre del defecto.', 'warning');
    if (state.defects.some((item) => item.partId === partId && item.code.toLowerCase() === code.toLowerCase())) return toast('Ese código ya existe para el NP.', 'warning');
    state.defects.push({ id: uid(), partId, code, name });
    event.target.reset();
    saveState(); renderAll(); toast('Defecto agregado al catálogo.');
  });

  $('productionForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const produced = Number($('recordProduced').value);
    const scrap = Number($('recordScrap').value);
    const businessUnitId = $('recordBusinessUnit').value;
    const partId = $('recordPartNumber').value;

    if (!businessUnitId || !partId) return toast('Selecciona la unidad y el número de parte.', 'warning');
    if (!Number.isFinite(produced) || produced <= 0) return toast('La producción debe ser mayor a cero.', 'warning');
    if (!Number.isFinite(scrap) || scrap < 0) return toast('La cantidad de scrap no es válida.', 'warning');
    if (scrap > produced) return toast('El scrap no puede ser mayor que la producción.', 'error');
    if (scrap > 0 && !$('recordDefect').value) return toast('Selecciona un defecto para registrar scrap.', 'warning');

    state.records.push({
      id: uid(), date: $('recordDate').value || today(), shift: $('recordShift').value,
      businessUnitId, partId, produced, scrap, defectId: $('recordDefect').value,
      operation: $('recordOperation').value.trim(), notes: $('recordNotes').value.trim()
    });

    saveState();
    event.target.reset();
    $('recordDate').value = today();
    $('recordScrap').value = 0;
    populateSelects();
    renderRecords();
    renderDashboard();
    toast('Registro guardado correctamente.');
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete-bu],[data-delete-part],[data-delete-defect],[data-delete-record]');
    if (!button) return;

    if (button.dataset.deleteBu) {
      if (state.parts.some((item) => item.businessUnitId === button.dataset.deleteBu)) return toast('Elimina primero los NP relacionados.', 'warning');
      state.businessUnits = state.businessUnits.filter((item) => item.id !== button.dataset.deleteBu);
    }
    if (button.dataset.deletePart) {
      if (state.records.some((item) => item.partId === button.dataset.deletePart)) return toast('No puedes eliminar un NP con registros.', 'warning');
      state.defects = state.defects.filter((item) => item.partId !== button.dataset.deletePart);
      state.parts = state.parts.filter((item) => item.id !== button.dataset.deletePart);
    }
    if (button.dataset.deleteDefect) {
      if (state.records.some((item) => item.defectId === button.dataset.deleteDefect)) return toast('No puedes eliminar un defecto utilizado.', 'warning');
      state.defects = state.defects.filter((item) => item.id !== button.dataset.deleteDefect);
    }
    if (button.dataset.deleteRecord) {
      if (!confirm('¿Eliminar este registro?')) return;
      state.records = state.records.filter((item) => item.id !== button.dataset.deleteRecord);
    }

    saveState(); renderAll(); toast('Elemento eliminado.');
  });

  $('clearDataBtn').addEventListener('click', () => {
    if (!state.records.length) return toast('No hay registros para eliminar.', 'warning');
    if (confirm('¿Eliminar todos los registros de producción y scrap? Los catálogos se conservarán.')) {
      state.records = [];
      saveState(); renderAll(); toast('Registros eliminados.');
    }
  });
}

function init() {
  try {
    $('recordDate').value = today();
    if ($('appVersion')) $('appVersion').textContent = APP_VERSION;
    initEvents();
    renderAll();
    setStorageStatus('Datos guardados localmente', 'ok');
  } catch (error) {
    console.error('Error al iniciar Quality Summary:', error);
    setStorageStatus('Error de inicialización', 'error');
    toast('El portal encontró un error. Abre la consola para ver el detalle.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', init);

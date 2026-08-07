‘use strict’;

const STORAGE_KEY = ‘qualitySummaryData_v1’; const initialState = {
businessUnits: [], parts: [], defects: [], records: [] }; let state =
loadState(); let charts = {};

const $ = (id) => document.getElementById(id); const number = (value) =>
new Intl.NumberFormat(‘es-MX’).format(value || 0); const percent =
(value) => ${(value || 0).toFixed(2)}%; const today = () => new
Date().toISOString().slice(0, 10); const uid = () => crypto.randomUUID ?
crypto.randomUUID() : ${Date.now()}-${Math.random()};

function loadState() { try { return
JSON.parse(localStorage.getItem(STORAGE_KEY)) ||
structuredClone(initialState); } catch { return
structuredClone(initialState); } } function saveState() {
localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } function
toast(message) { const el = $(‘toast’); el.textContent = message;
el.classList.add(‘show’); setTimeout(() => el.classList.remove(‘show’),
2200); } function getBusinessUnit(id) { return
state.businessUnits.find(x => x.id === id); } function getPart(id) {
return state.parts.find(x => x.id === id); } function getDefect(id) {
return state.defects.find(x => x.id === id); }

function calculateMetrics(records) { const produced =
records.reduce((sum, r) => sum + Number(r.produced), 0); const scrap =
records.reduce((sum, r) => sum + Number(r.scrap), 0); return { produced,
scrap, scrapRate: produced ? (scrap / produced) * 100 : 0, ppm: produced
? (scrap / produced) * 1_000_000 : 0 }; }

function filteredRecords() { const start = $(‘filterStart’).value, end =
$(‘filterEnd’).value; const bu = $(‘filterBusinessUnit’).value, part =
$(‘filterPartNumber’).value; return state.records.filter(r => (!start ||
r.date >= start) && (!end || r.date <= end) && (!bu || r.businessUnitId
=== bu) && (!part || r.partId === part)); }

function groupBy(records, keyFn) { return records.reduce((acc, item) =>
{ const key = keyFn(item); (acc[key] ||= []).push(item); return acc; },
{}); }

function renderAll() { populateSelects(); renderCatalogs();
renderRecords(); renderDashboard(); }

function populateSelect(select, items, placeholder, labelFn) { const
current = select.value; select.innerHTML =
<option value="">${placeholder}</option> + items.map(item =>
<option value="${item.id}">${labelFn(item)}</option>).join(’’); if
([…select.options].some(o => o.value === current)) select.value =
current; }

function populateSelects() { const bus =
[…state.businessUnits].sort((a,b) => a.name.localeCompare(b.name));
const parts = […state.parts].sort((a,b) =>
a.number.localeCompare(b.number));
[‘filterBusinessUnit’,‘recordBusinessUnit’,‘partBusinessUnit’].forEach(id
=>
populateSelect((id), bus, id =  =  = ′filterBusinessUnit′?′Todas′ : ′Seleccionarunidad′, x =  > x.name)); [′filterPartNumber′, ′recordPartNumber′, ′defectPartNumber′].forEach(id =  > populateSelect((id),
parts, id === ‘filterPartNumber’ ? ‘Todos’ : ‘Seleccionar NP’, x =>
${x.number} · ${getBusinessUnit(x.businessUnitId)?.name || ''}));
updateRecordDefects(); }

function updateRecordDefects() { const partId =
(′recordPartNumber′).value; constdefects = state.defects.filter(d =  > d.partId =  =  = partId); populateSelect((‘recordDefect’),
defects, defects.length ? ‘Seleccionar defecto’ : ‘Sin defectos
configurados’, d => ${d.code} · ${d.name}); }

function renderDashboard() { const records = filteredRecords(); const m
= calculateMetrics(records); $(‘kpiProduction’).textContent =
number(m.produced); $(‘kpiScrap’).textContent = percent(m.scrapRate);
$('kpiScrapQty').textContent = `${number(m.scrap)} piezas`;
$(‘kpiPpm’).textContent = number(Math.round(m.ppm));

const byDefect = groupBy(records.filter(r => r.scrap > 0), r =>
r.defectId || ‘uncategorized’); const defectRows =
Object.entries(byDefect).map(([id, rows]) => ({ id, name:
getDefect(id)?.name || ‘Sin clasificar’, qty: rows.reduce((s,r) => s +
Number(r.scrap),0) })).sort((a,b) => b.qty-a.qty); const top =
defectRows[0]; $(‘kpiTopDefect’).textContent = top?.name || ‘Sin datos’;
$('kpiTopDefectShare').textContent = `${top && m.scrap ?
((top.qty/m.scrap)*100).toFixed(1) : 0}% del scrap`;

renderPartSummary(records); renderCharts(records, defectRows); }

function renderPartSummary(records) { const grouped = groupBy(records, r
=> r.partId); const rows = Object.entries(grouped).map(([partId, recs])
=> { const part = getPart(partId), m = calculateMetrics(recs); const
defects = groupBy(recs.filter(r=>r.scrap>0), r=>r.defectId ||
‘uncategorized’); const top = Object.entries(defects).map(([id,
x])=>({name:getDefect(id)?.name || ‘Sin
clasificar’,qty:x.reduce((s,r)=>s+Number(r.scrap),0)})).sort((a,b)=>b.qty-a.qty)[0];
return { part, m, top }; }).sort((a,b)=>b.m.scrapRate-a.m.scrapRate);
$('partSummaryBody').innerHTML = rows.length ? rows.map(x => `<tr><td><strong>${x.part?.number
|| ‘N/D’}
getBusinessUnit(x.part?.businessUnitId)?.name||′N/D′ < /td >  < td>{number(x.m.produced)}
${number(x.m.scrap)}</td><td class="${x.m.scrapRate ?
‘metric-bad’:’’}“>percent(x.m.scrapRate) < /td >  < td>{number(Math.round(x.m.ppm))}
${x.top?.name || ‘—’}
`).join(’‘) :’
No hay datos para los filtros seleccionados.
’; }

function makeChart(id, config) { if (charts[id]) charts[id].destroy();
charts[id] = new Chart($(id), config); } function renderCharts(records,
defectRows) { const byDate = groupBy(records, r => r.date); const dates
= Object.keys(byDate).sort(); makeChart(‘trendChart’, { type:‘line’,
data:{ labels:dates, datasets:[{label:‘Scrap
%’,data:dates.map(d=>calculateMetrics(byDate[d]).scrapRate),yAxisID:‘y’},{label:‘PPM’,data:dates.map(d=>calculateMetrics(byDate[d]).ppm),yAxisID:‘y1’}]},
options:{responsive:true,maintainAspectRatio:false,interaction:{mode:‘index’,intersect:false},scales:{y:{beginAtZero:true,title:{display:true,text:‘Scrap
%’}},y1:{beginAtZero:true,position:‘right’,grid:{drawOnChartArea:false},title:{display:true,text:‘PPM’}}}}
});

const totalScrap = defectRows.reduce((s,x)=>s+x.qty,0); let
cumulative=0; makeChart(‘paretoChart’, {
data:{labels:defectRows.map(x=>x.name),datasets:[{type:‘bar’,label:‘Scrap’,data:defectRows.map(x=>x.qty),yAxisID:‘y’},{type:‘line’,label:‘Acumulado
%’,data:defectRows.map(x=>{cumulative+=x.qty;return
totalScrap?(cumulative/totalScrap)*100:0}),yAxisID:‘y1’}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true},y1:{beginAtZero:true,max:100,position:‘right’,grid:{drawOnChartArea:false}}}}
});

const byBu = groupBy(records, r => r.businessUnitId); const buRows =
Object.entries(byBu).map(([id,recs])=>({name:getBusinessUnit(id)?.name||‘N/D’,scrap:calculateMetrics(recs).scrap})).sort((a,b)=>b.scrap-a.scrap);
makeChart(‘businessUnitChart’,
{type:‘doughnut’,data:{labels:buRows.map(x=>x.name),datasets:[{data:buRows.map(x=>x.scrap)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:‘bottom’}}}});
}

function renderCatalogs() {
$('businessUnitList').innerHTML = state.businessUnits.map(x=>`<li><span><strong>${x.name}×
).join('') || '<li>Sin unidades registradas</li>';   $('partList').innerHTML = state.parts.map(x=>
x.number < /strong >  < br >  < small>{getBusinessUnit(x.businessUnitId)?.name
|| ’’}
${x.description ? '· '+x.description : ''}</small></span><button class="icon-btn" data-delete-part="${x.id}“>×
).join('') || '<li>Sin números de parte</li>';   $('defectList').innerHTML = state.defects.map(x=>
${x.code} ·
x.name < /strong >  < br >  < small>{getPart(x.partId)?.number || ’’}×
`).join(’‘) ||’
Sin defectos configurados
’; }

function renderRecords() { const rows =
[…state.records].sort((a,b)=>b.date.localeCompare(a.date));
$('recordsBody').innerHTML = rows.length ? rows.map(r=>`<tr><td>${r.date}
r.shift < /td >  < td>{getBusinessUnit(r.businessUnitId)?.name||‘N/D’}
getPart(r.partId)?.number||′N/D′ < /td >  < td>{number(r.produced)}
number(r.scrap) < /td >  < td>{getDefect(r.defectId)?.name||‘—’}
${r.operation||'—'}</td><td><button class="icon-btn" data-delete-record="${r.id}“>×
`).join(’‘) :’
No hay registros capturados.
’; }

function exportExcel() { if (!state.records.length) return toast(‘No hay
registros para exportar.’); const detail = state.records.map(r => {
const m=calculateMetrics([r]); return
{Fecha:r.date,Turno:r.shift,‘Unidad de
negocio’:getBusinessUnit(r.businessUnitId)?.name||’‘, ’Número de
parte’:getPart(r.partId)?.number||’‘,Producción:r.produced,Scrap:r.scrap,’Scrap
%’:m.scrapRate,PPM:Math.round(m.ppm),Defecto:getDefect(r.defectId)?.name||’‘,Código:getDefect(r.defectId)?.code||’‘,Operación:r.operation||’‘,Comentarios:r.notes||’‘};
}); const summaryGroups = groupBy(state.records, r=>r.partId); const
summary = Object.entries(summaryGroups).map(([id,recs])=>{const
part=getPart(id),m=calculateMetrics(recs);return {’Unidad de
negocio’:getBusinessUnit(part?.businessUnitId)?.name||’‘,’Número de
parte’:part?.number||’‘,Producción:m.produced,Scrap:m.scrap,’Scrap
%’:m.scrapRate,PPM:Math.round(m.ppm)};}); const
wb=XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(detail),‘Registros’);
XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(summary),‘Resumen
por NP’);
XLSX.writeFile(wb,Quality_Summary_${today()}.xlsx,{compression:true}); }

function loadDemo() { if (state.records.length && !confirm(‘Esto
reemplazará los datos actuales por información demo.’)) return; const
bu1=uid(),bu2=uid(),p1=uid(),p2=uid(),p3=uid(),d1=uid(),d2=uid(),d3=uid(),d4=uid();
state={businessUnits:[{id:bu1,name:‘SPX’},{id:bu2,name:‘Schneider
Electric’}],parts:[{id:p1,businessUnitId:bu1,number:‘871276PSP’,description:‘Drive
Shaft’},{id:p2,businessUnitId:bu1,number:‘272285PD4’,description:‘Machined
Component’},{id:p3,businessUnitId:bu2,number:‘GHD12273AA’,description:‘Housing’}],defects:[{id:d1,partId:p1,code:‘D01’,name:‘Runout
fuera de especificación’},{id:d2,partId:p1,code:‘D02’,name:‘Rebaba en
keyway’},{id:d3,partId:p2,code:‘D01’,name:‘Diámetro
sobremedida’},{id:d4,partId:p3,code:‘D01’,name:‘Rosca
dañada’}],records:[]}; const base=new Date(); for(let
i=13;i>=0;i–){const dt=new Date(base);dt.setDate(base.getDate()-i);const
date=dt.toISOString().slice(0,10);state.records.push({id:uid(),date,shift:‘1’,businessUnitId:bu1,partId:p1,produced:900+Math.round(Math.random()250),scrap:Math.round(Math.random()10),defectId:Math.random()>.45?d1:d2,operation:‘OP30’,notes:’‘},{id:uid(),date,shift:’2’,businessUnitId:bu1,partId:p2,produced:650+Math.round(Math.random()200),scrap:Math.round(Math.random()6),defectId:d3,operation:‘OP20’,notes:’‘},{id:uid(),date,shift:’1’,businessUnitId:bu2,partId:p3,produced:500+Math.round(Math.random()150),scrap:Math.round(Math.random()4),defectId:d4,operation:‘Roscado’,notes:’‘});}
saveState();renderAll();toast(’Datos demo cargados.’); }

function initEvents() {
document.querySelectorAll(‘.nav-item’).forEach(btn=>btn.addEventListener(‘click’,()=>{document.querySelectorAll(‘.nav-item’).forEach(x=>x.classList.remove(‘active’));document.querySelectorAll(‘.view’).forEach(x=>x.classList.remove(‘active’));btn.classList.add(‘active’);$(`${btn.dataset.view}View`).classList.add(‘active’);$('pageTitle').textContent=btn.textContent;}));
  ['filterStart','filterEnd','filterBusinessUnit','filterPartNumber'].forEach(id=>$(id).addEventListener(‘change’,renderDashboard));
$('clearFiltersBtn').addEventListener('click',()=>{['filterStart','filterEnd','filterBusinessUnit','filterPartNumber'].forEach(id=>$(id).value=’‘);renderDashboard();});
$(’recordPartNumber’).addEventListener(‘change’,updateRecordDefects);
$(‘exportBtn’).addEventListener(‘click’,exportExcel);
$(‘loadDemoBtn’).addEventListener(‘click’,loadDemo);

$('businessUnitForm').addEventListener('submit',e=>{e.preventDefault();const name=$(‘businessUnitName’).value.trim();if(state.businessUnits.some(x=>x.name.toLowerCase()===name.toLowerCase()))return
toast(‘La unidad ya
existe.’);state.businessUnits.push({id:uid(),name});e.target.reset();saveState();renderAll();toast(‘Unidad
agregada.’);});
$('partForm').addEventListener('submit',e=>{e.preventDefault();const numberValue=$(‘partNumberName’).value.trim();if(state.parts.some(x=>x.number.toLowerCase()===numberValue.toLowerCase()))return
toast(‘El número de parte ya
existe.’);state.parts.push({id:uid(),businessUnitId:(′partBusinessUnit′).value, number : numberValue, description:(‘partDescription’).value.trim()});e.target.reset();saveState();renderAll();toast(‘Número
de parte agregado.’);});
$('defectForm').addEventListener('submit',e=>{e.preventDefault();state.defects.push({id:uid(),partId:$(‘defectPartNumber’).value,code:(′defectCode′).value.trim(), name:(‘defectName’).value.trim()});e.target.reset();saveState();renderAll();toast(‘Defecto
agregado.’);});
$('productionForm').addEventListener('submit',e=>{e.preventDefault();const produced=Number($(‘recordProduced’).value),scrap=Number($('recordScrap').value);if(scrap>produced)return toast('El scrap no puede ser mayor que la producción.');if(scrap>0&&!$(‘recordDefect’).value)return
toast(‘Selecciona un defecto para el
scrap.’);state.records.push({id:uid(),date:(′recordDate′).value, shift:(‘recordShift’).value,businessUnitId:(′recordBusinessUnit′).value, partId:(‘recordPartNumber’).value,produced,scrap,defectId:(′recordDefect′).value, operation:(‘recordOperation’).value.trim(),notes:$('recordNotes').value.trim()});saveState();e.target.reset();$(‘recordDate’).value=today();$(‘recordScrap’).value=0;renderAll();toast(‘Registro
guardado.’);});

document.addEventListener(‘click’,e=>{const
b=e.target.closest(‘[data-delete-bu],[data-delete-part],[data-delete-defect],[data-delete-record]’);if(!b)return;if(b.dataset.deleteBu){if(state.parts.some(x=>x.businessUnitId===b.dataset.deleteBu))return
toast(‘Elimina primero los NP
relacionados.’);state.businessUnits=state.businessUnits.filter(x=>x.id!==b.dataset.deleteBu);}if(b.dataset.deletePart){if(state.records.some(x=>x.partId===b.dataset.deletePart))return
toast(‘No puedes eliminar un NP con
registros.’);state.defects=state.defects.filter(x=>x.partId!==b.dataset.deletePart);state.parts=state.parts.filter(x=>x.id!==b.dataset.deletePart);}if(b.dataset.deleteDefect){if(state.records.some(x=>x.defectId===b.dataset.deleteDefect))return
toast(‘No puedes eliminar un defecto
utilizado.’);state.defects=state.defects.filter(x=>x.id!==b.dataset.deleteDefect);}if(b.dataset.deleteRecord)state.records=state.records.filter(x=>x.id!==b.dataset.deleteRecord);saveState();renderAll();});
$(‘clearDataBtn’).addEventListener(‘click’,()=>{if(confirm(‘¿Eliminar
todos los registros de producción y
scrap?’)){state.records=[];saveState();renderAll();toast(‘Registros
eliminados.’);}}); }

function init() { $(‘recordDate’).value=today(); initEvents();
renderAll(); } init();

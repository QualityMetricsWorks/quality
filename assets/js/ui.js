import {$,number,money,percent,esc,dispositionLabel} from './utils.js';
import {state,getClient,getPart,getOperation,getDefect,getRun,partsForClient,operationsForPart,defectsForPart,eventsForRun} from './state.js';
import {metricsForRuns,filteredRuns,defectPareto,topProducts,scrapQtyForRun,copqForEvent} from './metrics.js';
let charts={};
export function populateSelect(el,items,placeholder,label){if(!el)return;const v=el.value;el.innerHTML=`<option value="">${esc(placeholder)}</option>`+items.map(x=>`<option value="${x.id}">${esc(label(x))}</option>`).join('');if([...el.options].some(o=>o.value===v))el.value=v}
export function renderAll(){renderSelects();renderDashboard();renderClients();renderParts();renderCatalog();renderHistory();renderRunScrapEvents()}
export function renderSelects(){
 const clientSelects=['filterClient','runClient','partClient','defectClient'];clientSelects.forEach(id=>populateSelect($(id),state.clients,id==='filterClient'?'Todos los clientes':'Selecciona cliente',x=>x.code?`${x.code} · ${x.name}`:x.name));
 updateFilterParts();updateRunParts();updateDefectParts();populateRunSelect();
}
export function updateFilterParts(){populateSelect($('filterPartNumber'),partsForClient($('filterClient')?.value),'Todos los NP',x=>x.number)}
export function updateRunParts(){populateSelect($('runPart'),partsForClient($('runClient')?.value),'Selecciona NP',x=>x.number);updateRunOperations()}
export function updateRunOperations(){populateSelect($('runOperation'),operationsForPart($('runPart')?.value),'Selecciona operación',x=>`${x.code} · ${x.name}`)}
export function updateDefectParts(){populateSelect($('defectPartNumber'),partsForClient($('defectClient')?.value),'Selecciona NP',x=>x.number);updateDefectOperations()}
export function updateDefectOperations(){populateSelect($('defectOperation'),operationsForPart($('defectPartNumber')?.value),'Todas / general',x=>`${x.code} · ${x.name}`)}
export function populateRunSelect(){
 const el=$('scrapRun');if(!el)return;const recent=[...state.runs].sort((a,b)=>`${b.date}${b.createdAt||''}`.localeCompare(`${a.date}${a.createdAt||''}`)).slice(0,100);
 populateSelect(el,recent,'Selecciona corrida',r=>`${r.date} · ${getClient(r.clientId)?.name||'—'} · ${getPart(r.partId)?.number||'—'} · ${getOperation(r.operationId)?.code||'—'} · ${number(r.produced)} pzas`);
 updateScrapDefects();
}
export function updateScrapDefects(){
 const run=getRun($('scrapRun')?.value);populateSelect($('scrapDefect'),run?defectsForPart(run.partId,run.operationId):[],'Selecciona defecto',x=>`${x.code} · ${x.name}`);
 const sum=$('selectedRunSummary');if(!sum)return;if(!run){sum.textContent='Selecciona una corrida de producción.';return}
 const m=metricsForRuns([run]);sum.textContent=`${run.date} · ${getClient(run.clientId)?.name||'—'} · ${getPart(run.partId)?.number||'—'} · ${getOperation(run.operationId)?.code||'—'} · Producción ${number(run.produced)} · Scrap ${number(m.scrap)} · Yield ${percent(m.yieldRate)}`;
 renderRunScrapEvents();
}
function activeRuns(){return filteredRuns({start:$('filterStart')?.value,end:$('filterEnd')?.value,clientId:$('filterClient')?.value,partId:$('filterPartNumber')?.value})}
export function renderDashboard(){
 const runs=activeRuns(),m=metricsForRuns(runs);$('kpiProduction').textContent=number(m.produced);$('kpiScrap').textContent=percent(m.scrapRate);$('kpiScrapQty').textContent=`${number(m.scrap)} piezas`;$('kpiPpm').textContent=number(Math.round(m.ppm));$('kpiYield').textContent=percent(m.yieldRate);$('kpiCopq').textContent=money(m.copq,'USD');
 renderCharts(runs);renderTopProducts(runs);
}
function daily(runs){const map=new Map();runs.forEach(r=>{const a=map.get(r.date)||[];a.push(r);map.set(r.date,a)});return [...map].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,rs])=>({date,...metricsForRuns(rs)}))}
function chart(id,cfg){if(!window.Chart)return;if(charts[id])charts[id].destroy();const ctx=$(id);if(ctx)charts[id]=new Chart(ctx,cfg)}
function lineConfig(labels,data,label,format='number'){return{type:'line',data:{labels,datasets:[{label,data,borderColor:'#143980',backgroundColor:'rgba(20,57,128,.08)',fill:true,tension:.25,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true}}}}}
function renderCharts(runs){
 const d=daily(runs),labels=d.map(x=>x.date);chart('scrapTrendChart',lineConfig(labels,d.map(x=>x.scrapRate),'Scrap %'));chart('ppmTrendChart',lineConfig(labels,d.map(x=>x.ppm),'PPM'));chart('yieldTrendChart',lineConfig(labels,d.map(x=>x.yieldRate),'Yield'));chart('copqTrendChart',lineConfig(labels,d.map(x=>x.copq),'COPQ'));
 const p=defectPareto(runs),total=p.reduce((s,x)=>s+x.qty,0);let cum=0;chart('paretoChart',{data:{labels:p.map(x=>x.name),datasets:[{type:'bar',label:'Scrap',data:p.map(x=>x.qty),backgroundColor:'#143980',yAxisID:'y'},{type:'line',label:'Acumulado %',data:p.map(x=>{cum+=x.qty;return total?cum/total*100:0}),borderColor:'#EC6B1E',backgroundColor:'#EC6B1E',yAxisID:'y1'}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true},y1:{beginAtZero:true,max:100,position:'right',grid:{drawOnChartArea:false}}}}})
}
function renderTopProducts(runs){
 const el=$('topProductsGrid');const tops=topProducts(runs);el.innerHTML=tops.length?tops.map((t,i)=>{const p=getPart(t.partId),pr=defectPareto(t.runs).slice(0,3);return `<div class="top-product"><span class="rank">RANK ${i+1}</span><h4>${esc(p?.number||'—')}</h4><small>${esc(getClient(p?.clientId)?.name||'—')}</small><div class="metrics"><div><span>SCRAP</span><strong>${number(t.scrap)}</strong></div><div><span>YIELD</span><strong>${percent(t.yieldRate)}</strong></div><div><span>COPQ</span><strong>${money(t.copq,p?.currency||'USD')}</strong></div></div>${pr.map((x,j)=>`<div class="entity-item"><small>${j+1}. ${esc(x.name)}</small><strong>${number(x.qty)}</strong></div>`).join('')}</div>`}).join(''):'<div class="empty-state">Sin datos para el periodo seleccionado.</div>';
}
export function renderClients(){
 $('clientCount').textContent=state.clients.length;const q=($('clientSearch')?.value||'').toLowerCase();const list=state.clients.filter(x=>`${x.name} ${x.code}`.toLowerCase().includes(q));$('clientList').innerHTML=list.map(c=>`<button class="entity-item ${c.id===state.selectedClientId?'active':''}" data-client-id="${c.id}"><span><strong>${esc(c.name)}</strong><small>${esc(c.code||'Sin código')}</small></span><span>›</span></button>`).join('');
 renderClientDetail();
}
export function renderClientDetail(){
 const c=getClient(state.selectedClientId),empty=$('clientEmptyState'),detail=$('clientDetail');if(!c){empty.hidden=false;detail.hidden=true;return}empty.hidden=true;detail.hidden=false;$('clientDetailName').textContent=c.name;$('clientDetailCode').textContent=c.code||'Sin código';
 const ps=partsForClient(c.id),rs=state.runs.filter(r=>r.clientId===c.id),m=metricsForRuns(rs);$('clientDetailParts').textContent=ps.length;$('clientDetailProduction').textContent=number(m.produced);$('clientDetailScrap').textContent=number(m.scrap);$('clientDetailPpm').textContent=number(Math.round(m.ppm));
 $('clientPartsList').innerHTML=ps.map(p=>`<button class="entity-item" data-open-part="${p.id}"><span><strong>${esc(p.number)}</strong><small>${esc(p.description||'Sin descripción')}</small></span><span>›</span></button>`).join('')||'<div class="empty-state">Sin números de parte.</div>';
}
export function renderParts(){
 $('partCount').textContent=state.parts.length;const q=($('partSearch')?.value||'').toLowerCase();$('partList').innerHTML=state.parts.filter(p=>`${p.number} ${p.description} ${getClient(p.clientId)?.name}`.toLowerCase().includes(q)).map(p=>`<button class="entity-item ${p.id===state.selectedPartId?'active':''}" data-part-id="${p.id}"><span><strong>${esc(p.number)}</strong><small>${esc(getClient(p.clientId)?.name||'—')} · ${esc(p.description||'')}</small></span><span>›</span></button>`).join('');renderPartDetail();
}
export function renderPartDetail(){
 const p=getPart(state.selectedPartId),empty=$('partEmptyState'),detail=$('partDetail');if(!p){empty.hidden=false;detail.hidden=true;return}empty.hidden=true;detail.hidden=false;$('partDetailNumber').textContent=p.number;$('partDetailDescription').textContent=p.description||'Sin descripción';$('partDetailClient').textContent=getClient(p.clientId)?.name||'—';$('partDetailCost').textContent=money(p.costPerPiece,p.currency);
 const rs=state.runs.filter(r=>r.partId===p.id),m=metricsForRuns(rs);$('partDetailProduction').textContent=number(m.produced);$('partDetailScrapQty').textContent=number(m.scrap);$('partDetailYield').textContent=percent(m.yieldRate);$('partDetailCopq').textContent=money(m.copq,p.currency);
 $('partOperationList').innerHTML=operationsForPart(p.id).map(o=>`<div class="entity-item"><span><strong>${esc(o.code)}</strong><small>${esc(o.name)}</small></span><button class="icon-btn" data-delete-operation="${o.id}">×</button></div>`).join('')||'<div class="empty-state">Sin operaciones.</div>';
 $('partDefectList').innerHTML=defectsForPart(p.id).map(d=>`<div class="entity-item"><span><strong>${esc(d.code)} · ${esc(d.name)}</strong><small>${esc(getOperation(d.operationId)?.code||'General')} · ${esc(d.category||'')}</small></span></div>`).join('')||'<div class="empty-state">Sin defectos.</div>';
 $('partProductionList').innerHTML=rs.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20).map(r=>`<div class="entity-item"><span><strong>${r.date} · ${esc(getOperation(r.operationId)?.code||'—')}</strong><small>${number(r.produced)} piezas · ${esc(r.machine||'Sin máquina')}</small></span><strong>${percent(metricsForRuns([r]).yieldRate)}</strong></div>`).join('')||'<div class="empty-state">Sin producción.</div>';
 const ev=state.scrapEvents.filter(e=>getRun(e.runId)?.partId===p.id);$('partScrapList').innerHTML=ev.slice(0,30).map(e=>`<div class="entity-item"><span><strong>${esc(getDefect(e.defectId)?.name||'—')}</strong><small>${esc(dispositionLabel(e.disposition))}</small></span><strong>${number(e.quantity)}</strong></div>`).join('')||'<div class="empty-state">Sin eventos.</div>';
}
export function renderCatalog(){
 const q=($('defectSearch')?.value||'').toLowerCase();const rows=state.defects.filter(d=>`${d.code} ${d.name} ${d.category} ${getPart(d.partId)?.number}`.toLowerCase().includes(q));$('defectTableBody').innerHTML=rows.map(d=>{const p=getPart(d.partId);return `<tr><td>${esc(getClient(p?.clientId)?.name||'—')}</td><td>${esc(p?.number||'—')}</td><td>${esc(getOperation(d.operationId)?.code||'General')}</td><td>${esc(d.code)}</td><td>${esc(d.name)}</td><td>${esc(d.category||'—')}</td><td><button class="icon-btn" data-delete-defect="${d.id}">×</button></td></tr>`}).join('')||'<tr><td colspan="7" class="empty-state">Sin defectos.</td></tr>';
}
export function renderHistory(){
 const qp=($('productionHistorySearch')?.value||'').toLowerCase();const rs=state.runs.filter(r=>`${r.date} ${getClient(r.clientId)?.name} ${getPart(r.partId)?.number} ${getOperation(r.operationId)?.code} ${r.machine}`.toLowerCase().includes(qp));$('productionHistoryBody').innerHTML=rs.map(r=>{const m=metricsForRuns([r]);return `<tr><td>${r.date}</td><td>${esc(r.shift)}</td><td>${esc(getClient(r.clientId)?.name||'—')}</td><td>${esc(getPart(r.partId)?.number||'—')}</td><td>${esc(getOperation(r.operationId)?.code||'—')}</td><td>${esc(r.machine||'—')}</td><td>${number(r.produced)}</td><td class="${m.scrap?'metric-bad':''}">${number(m.scrap)}</td><td>${percent(m.yieldRate)}</td><td><button class="icon-btn" data-delete-run="${r.id}">×</button></td></tr>`}).join('')||'<tr><td colspan="10" class="empty-state">Sin producción.</td></tr>';
 const qs=($('scrapHistorySearch')?.value||'').toLowerCase();const es=state.scrapEvents.filter(e=>{const r=getRun(e.runId);return `${r?.date} ${getClient(r?.clientId)?.name} ${getPart(r?.partId)?.number} ${getDefect(e.defectId)?.name} ${e.disposition}`.toLowerCase().includes(qs)});$('scrapHistoryBody').innerHTML=es.map(e=>{const r=getRun(e.runId),p=getPart(r?.partId);return `<tr><td>${r?.date||'—'}</td><td>${esc(getClient(r?.clientId)?.name||'—')}</td><td>${esc(p?.number||'—')}</td><td>${esc(getOperation(r?.operationId)?.code||'—')}</td><td>${esc(getDefect(e.defectId)?.name||'—')}</td><td>${number(e.quantity)}</td><td>${esc(dispositionLabel(e.disposition))}</td><td>${money(copqForEvent(e),p?.currency||'USD')}</td><td><button class="icon-btn" data-delete-scrap="${e.id}">×</button></td></tr>`}).join('')||'<tr><td colspan="9" class="empty-state">Sin eventos.</td></tr>';
}
export function renderRunScrapEvents(){
 const runId=$('scrapRun')?.value,body=$('runScrapEventsBody');if(!body)return;body.innerHTML=eventsForRun(runId).map(e=>`<tr><td>${esc(getDefect(e.defectId)?.name||'—')}</td><td>${number(e.quantity)}</td><td>${esc(dispositionLabel(e.disposition))}</td><td>${money(copqForEvent(e),getPart(getRun(e.runId)?.partId)?.currency||'USD')}</td><td><button class="icon-btn" data-delete-scrap="${e.id}">×</button></td></tr>`).join('')||'<tr><td colspan="5" class="empty-state">Sin eventos para esta corrida.</td></tr>';
}

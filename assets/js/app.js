import {$,toast} from './utils.js';
import {state,getClient,getPart,getRun} from './state.js';
import * as api from './db.js';
import * as ui from './ui.js';
import {metricsForRuns,copqForEvent} from './metrics.js';
import {initTraceability,renderBarcode,printBarcode} from './traceability.js';
import {initI18n,applyLanguage} from './i18n.js';

let db;
const canWrite=()=>['admin','editor','operator'].includes(state.role);

function setView(view){
 document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
 $(`${view}View`)?.classList.add('active');
 document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
 $('exportBtn').hidden=view!=='history';
 $('pageTitle').textContent=({dashboard:'Dashboard',capture:'Captura',clients:'Clientes',parts:'Números de Parte',machines:'Máquinas',personnel:'Personal',catalog:'Catálogo',runs:'Corridas',history:'Historial',settings:'Configuración'})[view]||view;
}
async function reload(msg='Sistema Actualizado'){
 await api.loadAll();ui.renderAll();applyLanguage();$('storageStatus').textContent='Sistema Actualizado';if(msg)toast(msg);
}
async function run(fn,msg='Guardado correctamente'){
 try{$('storageStatus').textContent='Sincronizando…';await fn();await reload(msg)}
 catch(e){console.error(e);$('storageStatus').textContent='Error';toast(e.message||'Error')}
}

function bindTabs(){
 document.querySelectorAll('.dashboard-tab[data-dashboard-tab]').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('[data-dashboard-tab]').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('[data-dashboard-panel]').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');document.querySelector(`[data-dashboard-panel="${b.dataset.dashboardTab}"]`)?.classList.add('active');
  document.querySelector('.maintenance-filter').hidden=b.dataset.dashboardTab!=='maintenance';ui.renderDashboard();
 }));
 document.querySelectorAll('[data-catalog-tab]').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('[data-catalog-tab]').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('[data-catalog-panel]').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');document.querySelector(`[data-catalog-panel="${b.dataset.catalogTab}"]`)?.classList.add('active');
 }));
 document.querySelectorAll('.history-tab').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.history-tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.history-panel').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');document.querySelector(`[data-history-panel="${b.dataset.historyTab}"]`)?.classList.add('active');
 }));
 document.querySelectorAll('.detail-tab').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.detail-tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.part-tab-panel').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');document.querySelector(`[data-part-panel="${b.dataset.partTab}"]`)?.classList.add('active');
  if(b.dataset.partTab==='cycle-times')ui.renderCycleTimes();
 }));
}

function resetQualityCapture(){
 $('scrapMatchForm').reset();$('scrapEventForm').reset();$('scrapRun').value='';$('matchedRunsList').innerHTML='';$('selectedRunSummary').textContent='Completa los datos para localizar la corrida.';ui.renderSelects();
}
function resetDowntimeCapture(){
 $('downtimeMatchForm').reset();$('downtimeEventForm').reset();$('downtimeRun').value='';$('matchedDowntimeRunsList').innerHTML='';$('selectedDowntimeRunSummary').textContent='Completa los datos para localizar la corrida.';ui.renderSelects();
}

function initEvents(){
 document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
 $('refreshDataBtn').addEventListener('click',()=>reload());
 $('signOutBtn').addEventListener('click',()=>db.auth.signOut());
 bindTabs();

 $('clearFiltersBtn').addEventListener('click',()=>{['filterStart','filterEnd','filterClient','filterPartNumber','filterMachine'].forEach(id=>$(id).value='');$('filterPeriod').value='current';applyPeriod('current');ui.updateFilterParts();ui.renderDashboard()});
 ['filterStart','filterEnd','filterPartNumber','filterMachine'].forEach(id=>$(id).addEventListener('change',ui.renderDashboard));
 $('filterClient').addEventListener('change',()=>{ui.updateFilterParts();ui.renderDashboard()});
 $('filterPeriod').addEventListener('change',()=>{applyPeriod($('filterPeriod').value);ui.renderDashboard()});

 // Quality capture
 $('scrapClient').addEventListener('change',ui.updateScrapParts);
 $('scrapPart').addEventListener('change',ui.updateScrapOperations);
 ['scrapOperation','scrapMachine'].forEach(id=>$(id).addEventListener('change',ui.findMatchingRuns));
 $('scrapLot').addEventListener('input',ui.findMatchingRuns);
 $('findProductionBtn').addEventListener('click',ui.findMatchingRuns);
 $('cancelScrapBtn').addEventListener('click',()=>{resetQualityCapture();toast('Captura de calidad cancelada')});
 $('scrapEventForm').addEventListener('submit',e=>{
  e.preventDefault();if(!canWrite())return toast('Tu rol es de solo lectura.');
  const runObj=getRun($('scrapRun').value),qty=Number($('scrapQuantity').value);
  const existing=state.scrapEvents.filter(x=>x.runId===runObj?.id).reduce((s,x)=>s+Number(x.quantity||0),0);
  if(!runObj)return toast('Selecciona una corrida.');
  if(existing+qty>runObj.produced)return toast('La suma de eventos no puede exceder la producción.');
  run(()=>api.insertScrapEvent({runId:runObj.id,defectId:$('scrapDefect').value,quantity:qty,disposition:$('scrapDisposition').value,extraCost:Number($('scrapExtraCost').value||0),reason:$('scrapReason').value.trim(),notes:$('scrapNotes').value.trim()}),'Evento de calidad registrado').then(()=>{$('scrapQuantity').value='';$('scrapExtraCost').value='0';$('scrapReason').value='';$('scrapNotes').value=''});
 });

 // Independent downtime capture
 $('downtimeClient').addEventListener('change',ui.updateDowntimeParts);
 $('downtimePart').addEventListener('change',ui.updateDowntimeOperations);
 ['downtimeOperation','downtimeMachine'].forEach(id=>$(id).addEventListener('change',ui.findDowntimeMatchingRuns));
 $('downtimeLot').addEventListener('input',ui.findDowntimeMatchingRuns);
 $('findDowntimeRunBtn').addEventListener('click',ui.findDowntimeMatchingRuns);
 $('manualDowntimeReason').addEventListener('change',()=>{const r=state.downtimeReasons.find(x=>x.id===$('manualDowntimeReason').value);if(r)$('manualDowntimeType').value=r.downtimeType||'unplanned'});
 $('cancelDowntimeBtn').addEventListener('click',()=>{resetDowntimeCapture();toast('Captura de tiempo muerto cancelada')});
 $('downtimeEventForm').addEventListener('submit',e=>{
  e.preventDefault();if(!canWrite())return toast('Tu rol es de solo lectura.');
  const runObj=getRun($('downtimeRun').value);if(!runObj)return toast('Selecciona una corrida.');
  const item={reasonId:$('manualDowntimeReason').value,minutes:Number($('manualDowntimeMinutes').value),eventType:$('manualDowntimeType').value,notes:$('manualDowntimeNotes').value.trim()};
  if(!item.reasonId||item.minutes<=0)return toast('Selecciona motivo y minutos.');
  run(()=>api.insertDowntimeEvents(runObj.id,[item]),'Tiempo muerto registrado').then(()=>{$('manualDowntimeMinutes').value='';$('manualDowntimeNotes').value=''});
 });

 // Shift settings
 $('shiftForm').addEventListener('submit',e=>{e.preventDefault();if(state.role!=='admin')return toast('Solo administrador.');run(()=>api.upsertShift({code:$('shiftCode').value.trim().toUpperCase(),name:$('shiftName').value.trim(),startTime:$('shiftStart').value,endTime:$('shiftEnd').value,breakMinutes:Number($('shiftBreakMinutes').value||0)}),'Turno actualizado').then(()=>e.target.reset())});

 // Masters
 $('clientForm').addEventListener('submit',e=>{e.preventDefault();run(()=>api.insertClient({name:$('clientName').value.trim(),code:$('clientCode').value.trim()})).then(()=>e.target.reset())});
 $('partForm').addEventListener('submit',e=>{e.preventDefault();run(()=>api.insertPart({clientId:$('partClient').value,number:$('partNumberName').value.trim(),description:$('partDescription').value.trim(),costPerPiece:Number($('partCost').value||0),currency:$('partCurrency').value})).then(()=>e.target.reset())});
 $('partEditForm').addEventListener('submit',e=>{e.preventDefault();if(!state.selectedPartId)return;run(()=>api.updatePart(state.selectedPartId,{description:$('editPartDescription').value.trim(),costPerPiece:Number($('editPartCost').value||0),currency:$('editPartCurrency').value})).then(()=>{$('partEditForm').hidden=true})});
 $('editPartBtn').addEventListener('click',()=>{$('partEditForm').hidden=false});
 $('cancelPartEditBtn').addEventListener('click',()=>{$('partEditForm').hidden=true});

 $('partMachineForm').addEventListener('submit',e=>{e.preventDefault();if(!state.selectedPartId||!$('partMachineSelect').value)return;run(()=>api.linkPartMachine(state.selectedPartId,$('partMachineSelect').value))});
 $('cycleTimeForm').addEventListener('submit',e=>{e.preventDefault();if(!state.selectedPartId)return;run(()=>api.upsertCycleTime({partId:state.selectedPartId,operationId:$('cycleTimeOperation').value,machineId:$('cycleTimeMachine').value,idealCycleSeconds:Number($('cycleTimeSeconds').value)}),'Tiempo ciclo actualizado').then(()=>{$('cycleTimeSeconds').value=''})});
 $('cancelCycleTimeBtn').addEventListener('click',()=>{$('cycleTimeForm').reset();ui.renderCycleTimes()});

 $('machineForm').addEventListener('submit',e=>{e.preventDefault();run(()=>api.insertMachine({code:$('machineCode').value.trim(),name:$('machineName').value.trim()})).then(()=>e.target.reset())});
 $('personnelForm').addEventListener('submit',e=>{e.preventDefault();run(()=>api.insertPersonnel({employeeNo:$('personnelEmployeeNo').value.trim(),fullName:$('personnelName').value.trim(),role:$('personnelRole').value})).then(()=>e.target.reset())});
 $('operationForm').addEventListener('submit',e=>{e.preventDefault();if(!state.selectedPartId)return toast('Selecciona un NP.');run(()=>api.insertOperation({partId:state.selectedPartId,code:$('operationCode').value.trim(),name:$('operationName').value.trim()})).then(()=>e.target.reset())});
 $('defectForm').addEventListener('submit',e=>{e.preventDefault();run(()=>api.insertDefect({partId:$('defectPartNumber').value,operationId:$('defectOperation').value,code:$('defectCode').value.trim(),name:$('defectName').value.trim(),category:$('defectCategory').value})).then(()=>{e.target.reset();ui.renderSelects()})});
 $('downtimeReasonForm').addEventListener('submit',e=>{e.preventDefault();run(()=>api.insertDowntimeReason({code:$('downtimeCode').value.trim(),name:$('downtimeName').value.trim(),category:$('downtimeCategory').value,downtimeType:$('downtimeType').value})).then(()=>e.target.reset())});

 // Searches
 $('clientSearch').addEventListener('input',ui.renderClients);$('partSearch').addEventListener('input',ui.renderParts);$('machineSearch').addEventListener('input',ui.renderMachines);$('personnelSearch').addEventListener('input',ui.renderPersonnel);$('defectSearch').addEventListener('input',ui.renderCatalog);$('downtimeSearch').addEventListener('input',ui.renderDowntimeCatalog);$('runSearch').addEventListener('input',ui.renderRuns);$('productionHistorySearch').addEventListener('input',ui.renderHistory);$('scrapHistorySearch').addEventListener('input',ui.renderHistory);
 document.querySelectorAll('.form-cancel-btn').forEach(b=>b.addEventListener('click',()=>b.closest('form')?.reset()));

 document.body.addEventListener('click',e=>{
  const t=e.target.closest('[data-client-id],[data-part-id],[data-run-id],[data-open-part],[data-machine-id],[data-personnel-id],[data-match-run],[data-match-downtime-run],[data-unlink-machine],[data-delete-operation],[data-delete-defect],[data-delete-run],[data-delete-scrap],[data-delete-downtime-reason],[data-delete-cycle-time],[data-delete-shift]');
  if(!t)return;
  if(t.dataset.clientId){state.selectedClientId=t.dataset.clientId;ui.renderClients()}
  if(t.dataset.runId){state.selectedRunId=t.dataset.runId;ui.renderRuns();applyLanguage()}
  if(t.dataset.partId){state.selectedPartId=t.dataset.partId;ui.renderParts()}
  if(t.dataset.openPart){state.selectedPartId=t.dataset.openPart;setView('parts');ui.renderParts()}
  if(t.dataset.machineId){state.selectedMachineId=t.dataset.machineId;ui.renderMachines()}
  if(t.dataset.personnelId){state.selectedPersonnelId=t.dataset.personnelId;ui.renderPersonnel()}
  if(t.dataset.matchRun){$('scrapRun').value=t.dataset.matchRun;ui.updateScrapDefects();ui.findMatchingRuns()}
  if(t.dataset.matchDowntimeRun){$('downtimeRun').value=t.dataset.matchDowntimeRun;ui.renderSelectedDowntimeRun();ui.findDowntimeMatchingRuns()}
  if(t.dataset.unlinkMachine&&confirm('¿Desvincular máquina de este NP?'))run(()=>api.unlinkPartMachine(state.selectedPartId,t.dataset.unlinkMachine));
  if(t.dataset.deleteOperation&&confirm('¿Eliminar operación?'))run(()=>api.deleteOperation(t.dataset.deleteOperation));
  if(t.dataset.deleteDefect&&confirm('¿Eliminar defecto?'))run(()=>api.deleteDefect(t.dataset.deleteDefect));
  if(t.dataset.deleteRun&&confirm('¿Eliminar corrida y sus eventos?'))run(()=>api.deleteRun(t.dataset.deleteRun));
  if(t.dataset.deleteScrap&&confirm('¿Eliminar evento?'))run(()=>api.deleteScrapEvent(t.dataset.deleteScrap));
  if(t.dataset.deleteDowntimeReason&&confirm('¿Desactivar motivo de paro?'))run(()=>api.deleteDowntimeReason(t.dataset.deleteDowntimeReason));
  if(t.dataset.deleteCycleTime&&confirm('¿Eliminar este tiempo ciclo?'))run(()=>api.deleteCycleTime(t.dataset.deleteCycleTime),'Tiempo ciclo eliminado');
  if(t.dataset.deleteShift&&confirm('¿Desactivar este turno?'))run(()=>api.deactivateShift(t.dataset.deleteShift),'Turno desactivado');
 });

 $('deleteClientBtn').addEventListener('click',()=>{if(state.selectedClientId&&confirm('¿Eliminar cliente?'))run(()=>api.deleteClient(state.selectedClientId))});
 $('deletePartBtn').addEventListener('click',()=>{if(state.selectedPartId&&confirm('¿Eliminar número de parte?'))run(()=>api.deletePart(state.selectedPartId))});
 $('deleteMachineBtn').addEventListener('click',()=>{if(state.selectedMachineId&&confirm('¿Eliminar máquina?'))run(()=>api.deleteMachine(state.selectedMachineId))});
 $('deletePersonnelBtn').addEventListener('click',()=>{if(state.selectedPersonnelId&&confirm('¿Desactivar personal?'))run(()=>api.deactivatePersonnel(state.selectedPersonnelId))});
 $('printBarcodeBtn').addEventListener('click',printBarcode);
 $('clientAddPartBtn').addEventListener('click',()=>{setView('parts');$('partClient').value=state.selectedClientId||''});
 $('partAddDefectBtn').addEventListener('click',()=>{setView('catalog');const p=getPart(state.selectedPartId);$('defectClient').value=p?.clientId||'';ui.updateDefectParts();$('defectPartNumber').value=p?.id||'';ui.updateDefectOperations()});
 $('exportBtn').addEventListener('click',exportExcel);
 $('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('authMessage').textContent='';const {error}=await db.auth.signInWithPassword({email:$('loginEmail').value,password:$('loginPassword').value});if(error)$('authMessage').textContent=error.message});
}

function exportExcel(){
 if(!window.XLSX)return toast('La librería de Excel no está disponible.');
 const production=state.runs.map(r=>{const m=metricsForRuns([r]);return{Fecha:r.date,Turno:r.shift,Cliente:getClient(r.clientId)?.name,NP:getPart(r.partId)?.number,Operacion:state.operations.find(x=>x.id===r.operationId)?.code,Maquina:state.machines.find(x=>x.id===r.machineId)?.code,Produccion:r.produced,Scrap:m.scrap,Yield:m.yieldRate,PPM:m.ppm,COPQ:m.copq}});
 const quality=state.scrapEvents.map(e=>{const r=getRun(e.runId),p=getPart(r?.partId);return{Fecha:r?.date,Cliente:getClient(r?.clientId)?.name,NP:p?.number,Defecto:state.defects.find(x=>x.id===e.defectId)?.name,Cantidad:e.quantity,Disposicion:e.disposition,COPQ:copqForEvent(e)}});
 const downtime=state.downtimeEvents.map(e=>{const r=getRun(e.runId),reason=state.downtimeReasons.find(x=>x.id===e.reasonId);return{Fecha:r?.date,Cliente:getClient(r?.clientId)?.name,NP:getPart(r?.partId)?.number,Maquina:state.machines.find(x=>x.id===r?.machineId)?.code,Paro:reason?.name,Tipo:reason?.downtimeType,Minutos:e.minutes}});
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(production),'Produccion');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(quality),'Calidad');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(downtime),'Mantenimiento');XLSX.writeFile(wb,'GUVEL_General_System_v1.0.1.xlsx');
}

async function startSession(user){
 try{await api.loadIdentity(user);await api.loadAll();$('authOverlay').classList.add('hidden');$('companyContext').textContent=state.companyName;$('userEmail').textContent=user.email;$('storageStatus').textContent='Sistema Actualizado';document.querySelectorAll('.admin-only').forEach(x=>x.hidden=state.role!=='admin');ui.renderAll();applyLanguage()}
 catch(e){console.error(e);toast(e.message);$('authOverlay').classList.remove('hidden')}
}
function iso(d){return d.toISOString().slice(0,10)}
function applyPeriod(v){
 const now=new Date(),s=new Date(now),e=new Date(now);if(v==='custom')return;
 if(v==='current')s.setDate(1);
 else if(v==='previous_day'){s.setDate(now.getDate()-1);e.setDate(now.getDate()-1)}
 else if(v==='previous_week'){const day=(now.getDay()+6)%7;e.setDate(now.getDate()-day-1);s.setTime(e.getTime());s.setDate(e.getDate()-6)}
 else if(v==='previous_month'){s.setMonth(now.getMonth()-1,1);e.setDate(0)}
 else if(v==='previous_quarter'){const q=Math.floor(now.getMonth()/3);s.setMonth((q-1)*3,1);e.setMonth(q*3,0)}
 else if(v==='previous_half'){const half=now.getMonth()<6?0:1;s.setFullYear(half?now.getFullYear():now.getFullYear()-1);s.setMonth(half?0:6,1);e.setFullYear(s.getFullYear());e.setMonth(s.getMonth()+6,0)}
 else if(v==='previous_year'){s.setFullYear(now.getFullYear()-1,0,1);e.setFullYear(now.getFullYear()-1,11,31)}
 $('filterStart').value=iso(s);$('filterEnd').value=iso(e)
}
async function init(){
 db=api.initDb();initI18n();initEvents();window.GUVEL_RENDER_BARCODE=renderBarcode;initTraceability(()=>reload('Producción registrada'));applyPeriod('current');
 const {data:{session}}=await db.auth.getSession();if(session?.user)await startSession(session.user);
 db.auth.onAuthStateChange(async(event,session)=>{if(event==='SIGNED_OUT'){$('authOverlay').classList.remove('hidden');location.reload()}else if(session?.user)await startSession(session.user)});
}
init();

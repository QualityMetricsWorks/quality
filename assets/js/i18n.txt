const dictionaries={
 es:{},
 en:{
  "Dashboard":"Dashboard","Captura":"Capture","Clientes":"Customers","Números de Parte":"Part Numbers","Máquinas":"Machines","Personal":"Personnel","Catálogo":"Catalog","Historial":"History","Corridas":"Runs","Configuración":"Settings",
  "General":"General","Producción":"Production","Calidad":"Quality","Mantenimiento":"Maintenance",
  "Gestión General Operativo":"General Operations Management",
  "Actualizar":"Refresh","Exportar Excel":"Export Excel","Sistema Actualizado":"System Updated","Sincronizando…":"Syncing…","Conectando…":"Connecting…",
  "Escaneo de Producción":"Production Scan","Capturar Calidad":"Capture Quality","Capturar Tiempo Muerto":"Capture Downtime",
  "Número de Parte":"Part Number","Operación":"Operation","Máquina":"Machine","Supervisor":"Supervisor","Operador":"Operator","Lote":"Lot","Cantidad":"Quantity","Turno":"Shift",
  "Defecto":"Defect","Defectos":"Defects","Paros":"Downtime Reasons","Tiempo Muerto":"Downtime","Tiempo Muerto":"Downtime",
  "Guardar":"Save","Guardar CT":"Save CT","Guardar turno":"Save Shift","Agregar":"Add","Cancelar":"Cancel","Salir":"Exit","Eliminar":"Delete","Editar":"Edit","Continuar":"Continue","Atrás":"Back",
  "Buscar corrida":"Find Run","Registrar paro":"Register Downtime","Registrar Calidad":"Register Quality","Agregar evento":"Add Event","Confirmar producción":"Confirm Production",
  "Producción registrada":"Production registered","Calidad":"Quality","Tiempos Muertos":"Downtime","Eventos de Calidad":"Quality Events",
  "Corridas de Producción":"Production Runs","Trazabilidad":"Traceability","Production Run":"Production Run",
  "Selecciona una corrida para consultar su trazabilidad completa.":"Select a run to view its complete traceability.",
  "Cada corrida concentra la trazabilidad de producción, calidad, mantenimiento, máquina, lote y personal.":"Each run consolidates production, quality, maintenance, machine, lot and personnel traceability.",
  "Cliente":"Customer","Número de Parte":"Part Number","CT Ideal":"Ideal CT","Registrado":"Recorded","Completado":"Completed","Estado":"Status",
  "Tiempo planificado":"Planned time","Planeado":"Planned","No planeado":"Unplanned","Planned":"Planned","Unplanned":"Unplanned",
  "Periodo":"Period","Todos los clientes":"All customers","Todas las máquinas":"All machines","Todos los NP":"All PNs",
  "Semana anterior":"Previous week","Día anterior":"Previous day","Mes anterior":"Previous month","Trimestre anterior":"Previous quarter","Semestre anterior":"Previous half-year","Año anterior":"Previous year","Personalizado":"Custom",
  "Desde":"From","Hasta":"To","Buscar…":"Search…","Buscar cliente…":"Search customer…","Buscar número de parte…":"Search part number…","Buscar máquina…":"Search machine…","Buscar personal…":"Search personnel…",
  "Iniciar sesión":"Sign in","Correo":"Email","Contraseña":"Password","Ingresar":"Sign in","Acceso seguro":"Secure access",
  "Configuración Operativa":"Operational Settings","Turnos":"Shifts","Cómo calcula GUVEL":"How GUVEL Calculates",
  "Disponibilidad":"Availability","Desempeño de Producción":"Production Performance","OEE y Desempeño":"OEE & Performance",
  "Scrap por defecto":"Scrap by Defect","Scrap por Número de Parte":"Scrap by Part Number","Pareto por defecto":"Pareto by Defect","Pareto por Número de Parte":"Pareto by Part Number",
  "Paros por motivo":"Downtime by Reason","Paros por máquina":"Downtime by Machine","Pareto de paros":"Downtime Pareto","Pareto por máquina":"Machine Pareto",
  "Historial de Producción":"Production History","Historial de Scrap":"Quality History","Historial de Tiempos Muertos":"Downtime History",
  "Código de barras del Número de Parte":"Part Number Barcode","Imprimir etiqueta":"Print Label","Tiempos Ciclo":"Cycle Times","Operaciones":"Operations"
 }
};
let current=localStorage.getItem('guvel_language')||'es';
const originalText=new WeakMap(),originalPlaceholder=new WeakMap(),originalTitle=new WeakMap();

function translateTextNode(node,lang){
 const raw=(originalText.get(node)??node.nodeValue);if(!originalText.has(node))originalText.set(node,raw);
 const trimmed=raw.trim();if(!trimmed)return;
 const translated=lang==='en'?dictionaries.en[trimmed]:trimmed;
 if(translated!==undefined){
  const lead=raw.match(/^\s*/)?.[0]||'',trail=raw.match(/\s*$/)?.[0]||'';
  node.nodeValue=lead+translated+trail;
 }else node.nodeValue=raw;
}
function walk(root,lang){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let n;while(n=walker.nextNode()){
  if(n.parentElement?.closest('script,style,svg'))continue;
  translateTextNode(n,lang);
 }
 root.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{
  if(!originalPlaceholder.has(el))originalPlaceholder.set(el,el.placeholder);
  const es=originalPlaceholder.get(el);el.placeholder=lang==='en'?(dictionaries.en[es]||es):es;
 });
 root.querySelectorAll('[title]').forEach(el=>{
  if(!originalTitle.has(el))originalTitle.set(el,el.title);
  const es=originalTitle.get(el);el.title=lang==='en'?(dictionaries.en[es]||es):es;
 });
}
export function applyLanguage(lang=current){
 current=lang;localStorage.setItem('guvel_language',lang);document.documentElement.lang=lang;
 walk(document.body,lang);
 document.querySelectorAll('.lang-btn').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang));
}
export function initI18n(){
 document.querySelectorAll('.lang-btn').forEach(b=>b.addEventListener('click',()=>applyLanguage(b.dataset.lang)));
 const obs=new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes)if(n.nodeType===1)walk(n,current)});
 obs.observe(document.body,{childList:true,subtree:true});
 applyLanguage(current);
}
export const getLanguage=()=>current;

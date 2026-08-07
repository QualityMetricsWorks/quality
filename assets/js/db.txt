import {state} from './state.js';
let db=null;
export function client(){return db}
export function initDb(){
 const cfg=window.QUALITY_SUMMARY_CONFIG;
 if(!cfg?.supabaseUrl||!cfg?.supabasePublishableKey)throw new Error('Falta configurar Supabase.');
 db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
 return db;
}
export async function loadIdentity(user){
 state.user=user;
 const {data:p,error}=await db.from('profiles').select('company_id,role,display_name').eq('user_id',user.id).single();
 if(error)throw new Error('Usuario sin perfil/empresa. Ejecuta el bootstrap.');
 state.companyId=p.company_id;state.role=p.role||'viewer';
 const {data:c,error:ce}=await db.from('companies').select('name').eq('id',state.companyId).single();if(ce)throw ce;
 state.companyName=c?.name||'Organización';
}
export async function loadAll(){
 const [c,p,o,d,r,s]=await Promise.all([
  db.from('clients').select('*').order('name'),
  db.from('part_numbers').select('*').order('number'),
  db.from('operations').select('*').order('code'),
  db.from('defects').select('*').order('code'),
  db.from('production_runs').select('*').order('run_date',{ascending:false}),
  db.from('scrap_events').select('*').order('created_at',{ascending:false})
 ]);
 const err=[c,p,o,d,r,s].find(x=>x.error)?.error;if(err)throw err;
 state.clients=c.data.map(x=>({id:x.id,name:x.name,code:x.code||''}));
 state.parts=p.data.map(x=>({id:x.id,clientId:x.client_id,number:x.number,description:x.description||'',costPerPiece:Number(x.cost_per_piece||0),currency:x.currency||'USD'}));
 state.operations=o.data.map(x=>({id:x.id,partId:x.part_id,code:x.code,name:x.name}));
 state.defects=d.data.map(x=>({id:x.id,partId:x.part_id,operationId:x.operation_id||'',code:x.code,name:x.name,category:x.category||''}));
 state.runs=r.data.map(x=>({id:x.id,date:x.run_date,shift:x.shift,clientId:x.client_id,partId:x.part_id,operationId:x.operation_id,machine:x.machine||'',produced:Number(x.produced||0),plannedMinutes:Number(x.planned_minutes||0),notes:x.notes||'',createdAt:x.created_at}));
 state.scrapEvents=s.data.map(x=>({id:x.id,runId:x.production_run_id,defectId:x.defect_id,quantity:Number(x.quantity||0),disposition:x.disposition,reason:x.reason||'',extraCost:Number(x.extra_cost||0),notes:x.notes||'',createdAt:x.created_at}));
 state.selectedClientId=state.selectedClientId||state.clients[0]?.id||null;state.selectedPartId=state.selectedPartId||state.parts[0]?.id||null;
}
const common=()=>({company_id:state.companyId});
export async function insertClient(x){return check(await db.from('clients').insert({...common(),name:x.name,code:x.code||null}).select().single())}
export async function deleteClient(id){check(await db.from('clients').delete().eq('id',id))}
export async function insertPart(x){return check(await db.from('part_numbers').insert({...common(),client_id:x.clientId,number:x.number,description:x.description||null,cost_per_piece:x.costPerPiece||0,currency:x.currency||'USD'}).select().single())}
export async function deletePart(id){check(await db.from('part_numbers').delete().eq('id',id))}
export async function insertOperation(x){return check(await db.from('operations').insert({...common(),part_id:x.partId,code:x.code,name:x.name}).select().single())}
export async function deleteOperation(id){check(await db.from('operations').delete().eq('id',id))}
export async function insertDefect(x){return check(await db.from('defects').insert({...common(),part_id:x.partId,operation_id:x.operationId||null,code:x.code,name:x.name,category:x.category||null}).select().single())}
export async function deleteDefect(id){check(await db.from('defects').delete().eq('id',id))}
export async function insertRun(x){return check(await db.from('production_runs').insert({...common(),run_date:x.date,shift:x.shift,client_id:x.clientId,part_id:x.partId,operation_id:x.operationId,machine:x.machine||null,produced:x.produced,planned_minutes:x.plannedMinutes||null,notes:x.notes||null}).select().single())}
export async function deleteRun(id){check(await db.from('production_runs').delete().eq('id',id))}
export async function insertScrapEvent(x){return check(await db.from('scrap_events').insert({...common(),production_run_id:x.runId,defect_id:x.defectId,quantity:x.quantity,disposition:x.disposition,reason:x.reason||null,extra_cost:x.extraCost||0,notes:x.notes||null}).select().single())}
export async function deleteScrapEvent(id){check(await db.from('scrap_events').delete().eq('id',id))}
function check(res){if(res.error)throw res.error;return res.data}

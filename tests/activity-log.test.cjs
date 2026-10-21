require('../scripts/register-typescript.cjs');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync, readdirSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const previousCwd = process.cwd();
const temp = mkdtempSync(path.join(os.tmpdir(), 'overwatch-activity-'));
process.chdir(temp);
let pool = null;
let signedIn = true;
const original = Module._load;
let activity;
let emailCandidates=[{id:'mail-candidate',email:'fixture@example.invalid',role:'operator',cohortId:'september'}];
const delivered=[];
let savedTemplates=[];let configQueue=Promise.resolve();
Module._load = function(name, ...args) {
  if (name === './careers-db') return { getCareersPool: () => pool };
  if (name === './careers-auth' || name === '@/lib/careers-auth') return { authenticated: async () => signedIn, sameOrigin: request => request.headers.get('origin') === new URL(request.url).origin };
  if (name === './gate-auth') return { gateAuthorized: async () => false };
  if (name === '@/lib/admin-activity') return activity;
  if (name === '@/lib/careers-db') return { getCareersPool:()=>pool };
  if (name === '@/lib/careers-store') return {exclusive:fn=>{const result=configQueue.then(fn);configQueue=result.catch(()=>{});return result;}};
  if (name === '@/lib/careers-config-store') return {getSystemConfig:async()=>savedTemplates,setSystemConfig:async(_,value)=>{savedTemplates=value;return value}};
  if (name === './careers-store') return { getApplications: async()=>emailCandidates };
  if (name === './careers-config-store') return { getSystemConfig:async()=>({senderName:'Recruitment',replyToEmail:'fixture@example.invalid'}) };
  if (name === 'nodemailer') return { createTransport:()=>({sendMail:async options=>{delivered.push(options);return {messageId:'fake-smtp-id'}}}) };
  return original.call(this, name, ...args);
};
activity = require(path.join(root, 'src/lib/admin-activity.ts'));
const route = require(path.join(root, 'src/app/api/admin/activity/route.ts'));
after(() => { Module._load = original; process.chdir(previousCwd); rmSync(temp, { recursive: true, force: true }); });
const request = (endpoint, body, method='POST') => new Request('http://localhost:3100'+endpoint, { method, headers:{origin:'http://localhost:3100','Content-Type':'application/json'}, ...(body === undefined ? {} : {body:JSON.stringify(body)}) });

test('nested credentials, signed links and binaries are redacted while message content and attachment names survive', () => {
  const value = activity.redactActivity({password:'never-store', nested:{ nextPhaseToken:'abc', pin:'9999' }, subject:'Interview', textContent:'Hello applicant', htmlContent:'<a href="https://example.test/careers/next-phase/secret?choice=yes">yes</a><a href="/?otl=private&amp;token=private2">book</a><img src="data:image/png;base64,YWJj"/>', attachmentNames:['Terms.pdf'], attachment:[{content:'private'}] });
  const json=JSON.stringify(value);
  for (const secret of ['never-store','9999','private2','?otl=private','/next-phase/secret','YWJj']) assert.equal(json.includes(secret),false,secret);
  assert.equal(value.textContent,'Hello applicant'); assert.deepEqual(value.attachmentNames,['Terms.pdf']);
});
test('concurrent event writes are append-only and pagination neither skips nor duplicates matching events', async () => {
  const entries=await Promise.all(Array.from({length:75},(_,i)=>activity.recordActivity({action:'Change '+i,outcome:'succeeded',section:'testing',roleId:'test-role',cohortId:'test-cycle',details:{number:i}})));
  assert.equal(new Set(entries.map(e=>e.id)).size,75);
  const ids=[]; let before;
  do { const page=await activity.listActivity({section:'testing',roleId:'test-role',cohortId:'test-cycle',limit:13,before}); ids.push(...page.events.map(e=>e.id)); before=page.nextCursor; } while(before);
  assert.equal(ids.length,75); assert.equal(new Set(ids).size,75);
  assert.equal((await activity.listActivity({roleId:'different'})).events.length,0);
});
test('request journal preserves body for the handler and correlates before/result with the correct actor', async () => {
  const req=request('/api/admin/careers/custom-broadcast',{roleId:'operator',cohortId:'september',subject:'Test message',message:'Full text',password:'secret'});
  const res=await activity.auditRequest(req,async()=>{const body=await req.json();assert.equal(body.message,'Full text');return Response.json({sentCount:2,failedCount:1});});
  assert.equal(res.status,200);
  const rows=(await activity.listActivity({section:'communications',roleId:'operator'})).events;
  assert.equal(rows.length,1);
  const start=await activity.getActivity((await activity.getActivity(rows[0].id)).details.startId); assert.equal(start.actor,'Administrator (shared account)');
  assert.equal((await activity.getActivity(start.id)).details.request.password,'[REDACTED]');
  const done=rows.find(e=>e.outcome==='succeeded'); assert.equal((await activity.getActivity(done.id)).details.result.failedCount,1);
});
test('handler errors and rejected requests are recorded as failed, not successful',async()=>{
  const r=await activity.auditRequest(request('/api/admin/settings',{}),async()=>Response.json({error:'Invalid data'},{status:400}));assert.equal(r.status,400);
  await assert.rejects(activity.auditRequest(request('/api/admin/settings',{}),async()=>{throw Error('internal') }),/internal/);
  const rows=(await activity.listActivity({section:'settings'})).events;
  assert.equal(rows.filter(e=>e.outcome==='failed').length,2);
});
test('journal storage failure blocks side effects; completion failure preserves a successful response to avoid duplicate sends',async()=>{
  let calls=0;
  pool={query:async()=>{throw Error('offline')}};
  const blocked=await activity.auditRequest(request('/api/admin/settings',{}),async()=>{calls++;return Response.json({success:true})});
  assert.equal(blocked.status,503); assert.equal(calls,0);
  let inserts=0;
  pool={query:async sql=>{if(sql.startsWith('INSERT INTO admin_activity_events') && ++inserts>1)throw Error('completion offline');return {rows:[]}}};
  const result=await activity.auditRequest(request('/api/admin/settings',{}),async()=>{calls++;return Response.json({success:true})});
  assert.equal(result.status,200); assert.equal(calls,1); assert.ok(result.headers.get('x-activity-log-warning'));
  pool=null;
});
test('communication evidence retains full content and failure outcome before a failed delivery',async()=>{
  await assert.rejects(activity.auditChange('Communication delivery',{subject:'Offer details',textContent:'Full message\nSecond line',htmlContent:'<b>Full message</b>',to:[{email:'fixture@example.invalid'}]},async()=>{throw Error('provider offline')},{section:'communications',entityId:'candidate',roleId:'operator'}),/provider offline/);
  const rows=(await activity.listActivity({entityId:'candidate'})).events;
  const done=rows.find(e=>e.outcome==='failed');const start=await activity.getActivity((await activity.getActivity(done.id)).details.startId);
  assert.equal((await activity.getActivity(start.id)).details.textContent,'Full message\nSecond line');assert.equal((await activity.getActivity(done.id)).details.startId,start.id);
  assert.deepEqual(activity.changedValues({status:'shortlisted',score:0},{status:'tested',score:0}),{status:{before:'shortlisted',after:'tested'}});
});
test('log API rejects unauthenticated access, cross-origin telemetry, invalid cursors and forged action payloads',async()=>{
  signedIn=false;assert.equal((await route.GET(request('/api/admin/activity',undefined,'GET'))).status,401);
  signedIn=true;assert.equal((await route.GET(request('/api/admin/activity?before=bad',undefined,'GET'))).status,400);
  assert.equal((await route.POST(new Request('http://localhost:3100/api/admin/activity',{method:'POST',headers:{origin:'https://other.invalid','Content-Type':'application/json'},body:JSON.stringify({path:'/admin/settings'})}))).status,403);
  assert.equal((await route.POST(request('/api/admin/activity',{action:'Candidate deleted',outcome:'succeeded'}))).status,400);
  const res=await route.GET(request('/api/admin/activity?section=communications',undefined,'GET'));assert.equal(res.status,200);
  const data=await res.json();assert.ok(data.events.length);
  const detail=await(await route.GET(request('/api/admin/activity?id='+data.events[0].id,undefined,'GET'))).json();assert.ok(detail.event);
});
test('all admin and candidate mutation routes have server-side journaling; heartbeat polls are excluded',()=>{
  const visit=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?visit(path.join(dir,e.name)):e.name==='route.ts'?[path.join(dir,e.name)]:[]);
  for(const file of [...visit(path.join(root,'src/app/api/admin')),...visit(path.join(root,'src/app/api/careers')),...visit(path.join(root,'src/app/api/gate'))]){
    if(file.includes(path.join('admin','presence'))||file.includes(path.join('admin','activity')))continue;
    const source=readFileSync(file,'utf8');for(const method of ['POST','PATCH','PUT','DELETE'])if(source.includes('export async function '+method+'('))assert.match(source,new RegExp('export async function '+method+'\\(request: Request\\) \\{\\s*return auditRequest'),file+' '+method);
  }
});

test('the actual central email function journals message content and candidate scope without contacting a real mail provider',async()=>{
  const keys=['EMAIL_PROVIDER','FALLBACK_SMTP_USER','FALLBACK_SMTP_PASS','BREVO_API_KEY','BREVO_API_KEY_BACKUP','BREVO_API_KEY_SECONDARY'];
  const before=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  process.env.EMAIL_PROVIDER='gmail';process.env.FALLBACK_SMTP_USER='fixture@example.invalid';process.env.FALLBACK_SMTP_PASS='not-a-real-secret';
  delete process.env.BREVO_API_KEY;delete process.env.BREVO_API_KEY_BACKUP;delete process.env.BREVO_API_KEY_SECONDARY;
  try {
    const mail=require(path.join(root,'src/lib/careers-email.ts'));
    const result=await mail.sendTransactionalEmail({to:[{email:'fixture@example.invalid',name:'Fixture'}],subject:'Message content proof',textContent:'Full content for history',htmlContent:'<p>Full content for history</p>'});
    assert.equal(result.success,true);assert.equal(delivered.length,1);
    const rows=(await activity.listActivity({entityId:'mail-candidate'})).events;
    assert.equal(rows.length,1);assert.ok(rows.every(row=>row.roleId==='operator'&&row.cohortId==='september'&&row.section==='communications'));
    const start=await activity.getActivity((await activity.getActivity(rows[0].id)).details.startId);
    assert.equal(start.details.subject,'Message content proof');assert.equal(start.details.htmlContent,'<p>Full content for history</p>');
    emailCandidates.push({...emailCandidates[0],id:'duplicate-email-record',role:'different-role',cohortId:'different-cycle'});
    await mail.sendTransactionalEmail({to:[{email:'fixture@example.invalid',name:'Fixture'}],subject:'Individual identity proof',textContent:'Only this profile',htmlContent:'<p>Only this profile</p>'},'mail-candidate');
    assert.equal((await activity.listActivity({entityId:'duplicate-email-record'})).events.length,0);
    const selected=(await activity.listActivity({entityId:'mail-candidate'})).events;
    assert.equal(selected.length,2);assert.ok(selected.every(row=>row.roleId==='operator'&&row.cohortId==='september'));
  } finally {for(const key of keys){if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key]}}
});

test('shared communication templates retain content, import idempotently and serialize concurrent saves',async()=>{
  const templates=require(path.join(root,'src/app/api/admin/careers/templates/route.ts'));
  const a={id:'tpl-a',title:'A',subject:'Subject A',body:'Full template content',createdAt:new Date().toISOString()};
  const b={...a,id:'tpl-b',title:'B',subject:'Subject B'};
  const change=(action,template)=>templates.PATCH(request('/api/admin/careers/templates',{action,template}));
  const results=await Promise.all([change('save',a),change('save',b)]);assert.ok(results.every(r=>r.status===200));assert.equal(savedTemplates.length,2);
  await change('import',{...a,body:'Stale browser content'});assert.equal(savedTemplates.find(t=>t.id==='tpl-a').body,'Full template content');
  await change('delete',a);assert.deepEqual(savedTemplates.map(t=>t.id),['tpl-b']);
  assert.equal((await change('save',{...a,body:22})).status,400);
  const rows=(await activity.listActivity({section:'communications'})).events;
  assert.ok(rows.some(row=>row.action.includes('/templates')));
});
test('browser export requests are explicitly labelled and cannot forge a server change record',async()=>{
  assert.equal((await route.POST(request('/api/admin/activity',{kind:'export',path:'/admin/recruitment/candidates',count:4}))).status,200);
  assert.equal((await route.POST(request('/api/admin/activity',{kind:'export',path:'/admin/recruitment/candidates',count:-1}))).status,400);
  assert.equal((await route.POST(request('/api/admin/activity',{kind:'candidate_deleted',path:'/admin/recruitment/candidates'}))).status,400);
  const row=(await activity.listActivity({section:'candidates'})).events.find(row=>row.action==='CSV export requested');
  assert.equal((await activity.getActivity(row.id)).details.recordCount,4);
});

test('CV access is discoverable in candidate history and CCTV role aliases share the same history',async()=>{
  const res=await activity.auditRequest(request('/api/admin/cv?id=cv-candidate',undefined,'GET'),async()=>new Response('fixture',{headers:{'Content-Type':'application/pdf'}}));assert.equal(res.status,200);
  const rows=(await activity.listActivity({entityId:'cv-candidate'})).events;assert.equal(rows.length,1);
  await activity.recordActivity({action:'Alias change',outcome:'succeeded',section:'roles',roleId:'cctv'});
  assert.ok((await activity.listActivity({roleId:'cctv_operator'})).events.some(row=>row.action==='Alias change'));
});

test('Supabase-only production storage journals events, filters summaries and saves individual templates without overwriting concurrent template IDs',async()=>{
  const originalFetch=global.fetch;
  const envKeys=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];const envBefore=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
  process.env.SUPABASE_URL='https://storage.fixture.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-secret';
  const eventRows=new Map(),templates=new Map(),queries=[];
  global.fetch=async(input,init={})=>{
    const url=new URL(input);queries.push(url);const method=init.method||'GET';
    assert.equal(new Headers(init.headers).get('apikey'),'fixture-secret');
    if(url.pathname.endsWith('/admin_activity_events')){
      if(method==='POST'){const row=JSON.parse(init.body);eventRows.set(row.id,row);return new Response(null,{status:201})}
      const id=url.searchParams.get('id')?.replace('eq.','');
      if(id)return Response.json(eventRows.has(id)?[{data:eventRows.get(id).data}]:[]);
      return Response.json([...eventRows.values()].map(row=>{const summary={...row.data};delete summary.details;return summary}));
    }
    assert.ok(url.pathname.endsWith('/admin_communication_templates'));
    const id=url.searchParams.get('id')?.replace('eq.','');
    if(method==='DELETE'){templates.delete(id);return new Response(null,{status:204})}
    if(method==='POST'){const row=JSON.parse(init.body);if(!new Headers(init.headers).get('Prefer').includes('ignore-duplicates')||!templates.has(row.id))templates.set(row.id,row);return new Response(null,{status:201})}
    return Response.json(id?(templates.has(id)?[{data:templates.get(id).data}]:[]):[...templates.values()].map(row=>({data:row.data})));
  };
  try {
    const event=await activity.recordActivity({action:'REST change',outcome:'succeeded',roleId:'cctv',cohortId:'rest-cycle',details:{password:'not-saved',message:'Preserved'}});
    assert.equal((await activity.getActivity(event.id)).details.password,'[REDACTED]');
    await activity.listActivity({roleId:'cctv_operator',cohortId:'rest-cycle',before:Buffer.from(JSON.stringify({timestamp:event.timestamp,id:event.id})).toString('base64url')});
    const query=queries.find(url=>url.searchParams.get('data->>roleId'));
    assert.equal(query.searchParams.get('data->>roleId'),'in.(cctv,cctv_operator)');assert.equal(query.searchParams.get('data->>cohortId'),'eq.rest-cycle');assert.ok(query.searchParams.get('and').includes('timestamp.lt.'));
    const route=require(path.join(root,'src/app/api/admin/careers/templates/route.ts'));
    const a={id:'rest-a',title:'REST A',subject:'A',body:'Full content',createdAt:new Date().toISOString()},b={...a,id:'rest-b'};
    const change=(action,template)=>route.PATCH(request('/api/admin/careers/templates',{action,template}));
    assert.equal((await change('save',a)).status,200);assert.equal((await change('save',b)).status,200);
    await change('import',{...a,body:'Stale'});assert.equal(templates.get(a.id).data.body,'Full content');
    await change('delete',a);assert.deepEqual([...templates.keys()],['rest-b']);
  } finally {global.fetch=originalFetch;for(const key of envKeys){if(envBefore[key]===undefined)delete process.env[key];else process.env[key]=envBefore[key]}}
});

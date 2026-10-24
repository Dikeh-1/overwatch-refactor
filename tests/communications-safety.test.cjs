require('../scripts/register-typescript.cjs');
const {test,after}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path');
const root=path.resolve(__dirname,'..'),original=Module._load,originalFetch=global.fetch;
const keys=['BREVO_API_KEY','BREVO_API_KEY_BACKUP','EMAIL_PROVIDER','FALLBACK_SMTP_USER','FALLBACK_SMTP_PASS','ZOHO_MAIL_ACCESS_TOKEN','ZOHO_MAIL_REFRESH_TOKEN'];
const before=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
let signedIn=true;const rows=new Map();
const store={getMail:async id=>rows.get(id),listMail:async scope=>[...rows.values()].filter(row=>!scope||row.scope===scope),storeMailAttachments:async value=>value,hydrateMailAttachments:async value=>value||[],putMail:async(item,version)=>{if((rows.get(item.id)?.version||0)!==version)throw Error('MAIL_CONFLICT');const row={...item,version:version+1};rows.set(item.id,row);return row;}};
Module._load=function(name,...args){
 if(name==='./admin-activity')return {auditChange:async(_action,_details,fn)=>fn()};
 if(name==='./careers-config-store')return {getSystemConfig:async()=>({senderName:'Recruitment'})};
 if(name==='@/lib/careers-auth')return {authenticated:async()=>signedIn,sameOrigin:r=>r.headers.get('origin')===new URL(r.url).origin};
 if(name==='@/lib/communication-mail-store'||name==='./communication-mail-store')return store;
 if(name.startsWith('@/lib/'))return original.call(this,path.join(root,'src',name.slice(2)),...args);
 return original.call(this,name,...args);
};
const email=require('../src/lib/careers-email.ts'),drafts=require('../src/app/api/admin/careers/mail/route.ts'),incoming=require('../src/app/api/admin/careers/mail/incoming/route.ts');
Module._load=original;
after(()=>{global.fetch=originalFetch;for(const key of keys){if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];}});
const request=(data,origin='http://localhost:3100')=>new Request('http://localhost:3100/api/admin/careers/mail',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
const payload={sender:{email:'personal@example.invalid',name:'Personal'},to:[{email:'fixture@example.invalid',name:'Fixture'}],subject:'Fixture',textContent:'Fixture',htmlContent:'<p>Fixture</p>'};
test('both Brevo connections rotate with no-reply sender; definitive quota rejection fails over but an ambiguous send never retries',async()=>{
 process.env.BREVO_API_KEY='primary';process.env.BREVO_API_KEY_BACKUP='secondary';process.env.EMAIL_PROVIDER='gmail';process.env.FALLBACK_SMTP_USER='personal@example.invalid';process.env.FALLBACK_SMTP_PASS='fixture';
 const seen=[];let mode='ok';global.fetch=async(url,options)=>{assert.equal(url,'https://api.brevo.com/v3/smtp/email');const body=JSON.parse(options.body);assert.equal(body.sender.email,'noreply@overwatchmoz.com');if(!body.attachment?.length)assert.ok(!Object.hasOwn(body,'attachment'));assert.equal(body.replyTo.email,'info@overwatchmoz.com');seen.push(options.headers['api-key']);if(mode==='quota'&&seen.length===1)return new Response('credits exhausted',{status:402});if(mode==='ambiguous')throw Error('Network timeout');return Response.json({messageId:'fixture'})};
 await email.sendTransactionalEmail({...payload,attachment:[]});await email.sendTransactionalEmail(payload);assert.deepEqual(new Set(seen),new Set(['primary','secondary']));
 mode='quota';seen.length=0;await email.sendTransactionalEmail(payload);assert.equal(seen.length,2);
 mode='ambiguous';seen.length=0;await assert.rejects(email.sendTransactionalEmail(payload),/Network timeout/);assert.equal(seen.length,1);
 delete process.env.BREVO_API_KEY;delete process.env.BREVO_API_KEY_BACKUP;await assert.rejects(email.sendTransactionalEmail(payload),/Personal SMTP delivery is disabled/);
});
test('private drafts reject unauthenticated and cross-origin requests, isolate scopes and prevent stale or sent message overwrites',async()=>{
 const data={id:'fixture-draft',scope:'cycle:operator:bulk',version:0,data:{subject:'Subject',messageBody:'Body',attachments:[]}};
 signedIn=false;assert.equal((await drafts.GET(new Request('http://localhost:3100/api/admin/careers/mail'))).status,401);assert.equal((await drafts.POST(request(data))).status,403);signedIn=true;
 assert.equal((await drafts.POST(request(data,'https://other.invalid'))).status,403);
 assert.equal((await drafts.POST(request(data))).status,200);assert.equal((await drafts.POST(request(data))).status,409);
 assert.equal((await drafts.POST(request({...data,action:'load',scope:'other'}))).status,404);
 assert.equal((await drafts.POST(request({...data,version:1,data:{...data.data,messageBody:'Updated'}}))).status,200);
 rows.get(data.id).data.status='queued';assert.equal((await drafts.POST(request({...data,version:2}))).status,409);
 assert.equal(rows.get(data.id).data.messageBody,'Updated');
});
test('incoming mail is honest when disconnected and refuses another mailbox even with a valid token',async()=>{
 delete process.env.ZOHO_MAIL_ACCESS_TOKEN;delete process.env.ZOHO_MAIL_REFRESH_TOKEN;
 let result=await incoming.GET(new Request('http://localhost:3100/api/admin/careers/mail/incoming'));assert.equal((await result.json()).connected,false);
 process.env.ZOHO_MAIL_ACCESS_TOKEN='fixture';global.fetch=async()=>Response.json({status:{code:200},data:[{primaryEmailAddress:'other@example.invalid',accountId:'123'}]});
 result=await incoming.GET(new Request('http://localhost:3100/api/admin/careers/mail/incoming'));assert.equal(result.status,503);assert.match((await result.json()).error,/does not contain info/);
});

test('Incoming verifies the comercial mailbox alias and scopes message search and content to info recipients',async()=>{
 process.env.ZOHO_MAIL_ACCESS_TOKEN='fixture';let verifiedAlias=true,recipient='info@overwatchmoz.com';const paths=[];
 global.fetch=async(input)=>{const url=new URL(input);paths.push(url);let data;
 if(url.pathname==='/api/accounts')data=[{primaryEmailAddress:'comercial@overwatchmoz.com',accountId:'123'}];
 else if(url.pathname==='/api/accounts/123')data={emailAddress:[{mailId:'info@overwatchmoz.com',isConfirmed:verifiedAlias}]};
 else if(url.pathname.endsWith('/messages/search')){assert.equal(url.searchParams.get('searchKey'),'to:info@overwatchmoz.com::or:cc:info@overwatchmoz.com');data=[{messageId:'456',folderId:'789',subject:'Fixture',fromAddress:'fixture@example.invalid',summary:'Summary',receivedTime:String(Date.now())}]}
 else if(url.pathname.endsWith('/details'))data={toAddress:recipient,ccAddress:''};
 else if(url.pathname.endsWith('/content'))data={content:'<p>Hello</p><script>bad</script>'};else throw Error('Unexpected endpoint');
 return Response.json({status:{code:200},data});};
 const base='http://localhost:3100/api/admin/careers/mail/incoming';
 let response=await incoming.GET(new Request(base));assert.equal(response.status,200);assert.equal((await response.json()).items.length,1);
 response=await incoming.GET(new Request(base+'?messageId=456&folderId=789'));assert.equal(response.status,200);assert.equal((await response.json()).body,'<p>Hello</p>');
 recipient='commercial-only@example.invalid';paths.length=0;response=await incoming.GET(new Request(base+'?messageId=456&folderId=789'));assert.equal(response.status,404);assert.ok(!paths.some(url=>url.pathname.endsWith('/content')));
 verifiedAlias=false;response=await incoming.GET(new Request(base));assert.equal(response.status,503);
});


test('outbox removal is scope checked, cancels queued mail and never removes an active delivery',async()=>{
 const scope='cycle:operator:bulk';
 for(const [id,status,mailScope] of [['queued-removal','queued',scope],['sending-guard','sending',scope],['other-cycle','queued','other']])rows.set(id,{id,kind:'outbox',scope:mailScope,version:1,data:{status}});
 const response=await drafts.POST(request({action:'delete',scope,ids:['queued-removal','sending-guard','other-cycle']}));
 assert.equal(response.status,200);const result=await response.json();assert.deepEqual(result.deleted,['queued-removal']);assert.equal(result.blocked.length,2);
 assert.equal(rows.get('queued-removal').data.status,'deleted');assert.equal(rows.get('sending-guard').data.status,'sending');assert.equal(rows.get('other-cycle').data.status,'queued');
});


test('a queued parent campaign is cancellable while sent and in-flight recipients remain protected',async()=>{
 const scope='campaign-cancel-scope',id='cancel-parent';
 const child=(id,status)=>({id,kind:'outbox',scope,version:1,data:{status,campaignId:'cancel-parent'}});
 const queued=child('cancel-queued','queued'),sent=child('cancel-sent','sent'),sending=child('cancel-sending','sending');
 for(const row of [queued,sent,sending])rows.set(row.id,row);
 rows.set(id,{id,kind:'draft',scope,version:1,data:{status:'queued',queuedItems:[queued,sent,sending]}});
 let response=await drafts.POST(request({action:'delete',scope:'wrong-cycle',ids:[id]}));assert.deepEqual((await response.json()).deleted,[]);
 response=await drafts.POST(request({action:'delete',scope,ids:[id]}));assert.equal(response.status,200);assert.deepEqual((await response.json()).deleted,[id]);
 assert.equal(rows.get(id).data.status,'cancelled');assert.equal(rows.get(queued.id).data.status,'deleted');assert.equal(rows.get(sent.id).data.status,'sent');assert.equal(rows.get(sending.id).data.status,'sending');
});

test('mailbox read reconciles completed campaign envelopes and does not invent completion for missing recipients',async()=>{
 const scope='campaign-projection';const child={id:'project-child',kind:'outbox',scope,version:1,data:{campaignId:'project-parent',status:'deleted'}};
 rows.set(child.id,child);rows.set('project-parent',{id:'project-parent',kind:'draft',scope,version:1,data:{status:'queued',queuedItems:[child]}});
 rows.set('missing-parent',{id:'missing-parent',kind:'draft',scope,version:1,data:{status:'queued',queuedItems:[{...child,id:'missing-child'}]}});
 const response=await drafts.GET(new Request('http://localhost:3100/api/admin/careers/mail?scope='+scope));const items=(await response.json()).items;
 assert.equal(items.find(row=>row.id==='project-parent').data.status,'completed');assert.equal(items.find(row=>row.id==='missing-parent').data.status,'queued');
 assert.equal(rows.get('project-parent').data.status,'queued','GET reconciliation is read-only');
});


test('outbox retry supports both individual and bulk failed/skipped deliveries and reopens completed parent campaign',async()=>{
 const scope='retry-bulk-scope';
 rows.set('retry-parent',{id:'retry-parent',kind:'draft',scope,version:1,data:{status:'completed'}});
 rows.set('fail-1',{id:'fail-1',kind:'outbox',scope,version:1,data:{status:'failed',error:'SMTP timeout',campaignId:'retry-parent'}});
 rows.set('fail-2',{id:'fail-2',kind:'outbox',scope,version:1,data:{status:'skipped',error:'Temporarily skipped',campaignId:'retry-parent'}});
 rows.set('already-sent',{id:'already-sent',kind:'outbox',scope,version:1,data:{status:'sent',campaignId:'retry-parent'}});
 const res=await drafts.POST(request({action:'retry',scope,ids:['fail-1','fail-2','already-sent']}));
 assert.equal(res.status,200);
 const body=await res.json();
 assert.deepEqual(body.retried,['fail-1','fail-2']);
 assert.deepEqual(body.blocked,['already-sent']);
 assert.equal(rows.get('fail-1').data.status,'queued');
 assert.equal(rows.get('fail-2').data.status,'queued');
 assert.equal(rows.get('already-sent').data.status,'sent');
 assert.equal(rows.get('retry-parent').data.status,'queued');
});

test('draft deletion removes draft messages and marks them deleted while isolating scope',async()=>{
 const scope='draft-delete-scope';
 rows.set('active-draft',{id:'active-draft',kind:'draft',scope,version:1,data:{status:'draft',subject:'Draft To Delete'}});
 rows.set('other-draft',{id:'other-draft',kind:'draft',scope:'other-scope',version:1,data:{status:'draft',subject:'Other Draft'}});
 const res=await drafts.POST(request({action:'delete',scope,ids:['active-draft','other-draft']}));
 assert.equal(res.status,200);
 const body=await res.json();
 assert.deepEqual(body.deleted,['active-draft']);
 assert.deepEqual(body.blocked,['other-draft']);
 assert.equal(rows.get('active-draft').data.status,'deleted');
 assert.equal(rows.get('other-draft').data.status,'draft');
});

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
 if(name==='@/lib/communication-mail-store')return store;
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
 const seen=[];let mode='ok';global.fetch=async(url,options)=>{assert.equal(url,'https://api.brevo.com/v3/smtp/email');const body=JSON.parse(options.body);assert.equal(body.sender.email,'noreply@overwatchmoz.com');assert.equal(body.replyTo.email,'info@overwatchmoz.com');seen.push(options.headers['api-key']);if(mode==='quota'&&seen.length===1)return new Response('credits exhausted',{status:402});if(mode==='ambiguous')throw Error('Network timeout');return Response.json({messageId:'fixture'})};
 await email.sendTransactionalEmail(payload);await email.sendTransactionalEmail(payload);assert.deepEqual(new Set(seen),new Set(['primary','secondary']));
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

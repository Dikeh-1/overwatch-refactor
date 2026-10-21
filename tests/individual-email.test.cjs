require('../scripts/register-typescript.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module');
const workflow=require('../src/lib/careers-workflow.ts');
const applications=[{id:'one',name:'One',email:'one@example.invalid',role:'cctv',cohortId:'september',status:'not_advancing',communications:[]},{id:'two',name:'Two',email:'two@example.invalid',role:'manager',cohortId:'october',status:'new',communications:[]}];
const delivered=[],updated=[];let fail=false,historyFails=false;
const original=Module._load;
Module._load=function(name,...args){
 if(name==='@/lib/admin-activity')return{auditRequest:async(_,fn)=>fn()};
 if(name==='@/lib/careers-auth')return{authenticated:async()=>true,sameOrigin:()=>true};
 if(name==='@/lib/careers-workflow')return workflow;
 if(name==='@/lib/site-config')return{siteContact:{email:'fixture@example.invalid',address:{pt:'Fixture address'},whatsappNumber:'000000000'}};
 if(name==='@/lib/careers-store')return{updateApplication:async(id,patch)=>{if(historyFails)throw Error('History unavailable');updated.push({id,patch});return{...applications.find(a=>a.id===id),...patch}}};
 if(name==='@/lib/careers-email')return{sendTransactionalEmail:async mail=>{if(fail)throw Error('Fixture delivery failed');delivered.push(mail)}};
 if(name==='@/lib/careers-workspace-store')return{getRecruitmentWorkspaceData:async()=>({applications,roles:[{id:'cctv',en:'CCTV Operator',pt:'Operadora de CCTV'}],cohorts:[{id:'september',roleId:'cctv'}]})};
 return original.call(this,name,...args);
};
const route=require('../src/app/api/admin/careers/custom-broadcast/route.ts');Module._load=original;
const request=extra=>new Request('http://localhost/api/admin/careers/custom-broadcast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audienceFilter:'individual',candidateId:'one',candidateEmail:'two@example.invalid',cohortId:'september',roleId:'cctv',locale:'en',subject:'Application update',message:'Hello {{candidate_name}}, regarding {{role_title}}.',includeBookingButton:false,...extra})});
test('individual email sends only to the selected archived-cycle candidate and preserves message history',async()=>{
 const response=await route.POST(request());assert.equal(response.status,200);const data=await response.json();assert.equal(data.sentCount,1);assert.equal(delivered.length,1);assert.equal(delivered[0].to[0].email,'one@example.invalid');assert.match(delivered[0].textContent,/CCTV Operator/);assert.equal(updated[0].id,'one');assert.match(updated[0].patch.communications[0].bodySnippet,/Hello One/);assert.equal(updated[0].patch.status,undefined);
});
test('individual email cannot cross cohort or role and reports delivery failure accurately',async()=>{
 assert.equal((await route.POST(request({candidateId:'two'}))).status,400);
 assert.equal((await route.POST(request({roleId:'manager'}))).status,400);
 fail=true;const response=await(await route.POST(request())).json();assert.equal(response.sentCount,0);assert.equal(response.failedCount,1);assert.equal(updated.at(-1).patch.communications[0].status,'failed');assert.equal(delivered.length,1);
});
test('a history write failure after delivery never reports the sent email as failed',async()=>{
 fail=false;historyFails=true;
 const response=await(await route.POST(request())).json();
 assert.equal(response.sentCount,1);assert.equal(response.failedCount,0);assert.deepEqual(response.historyWarnings,['one']);assert.equal(delivered.length,2);
});

require('../scripts/register-typescript.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module');
const content=require('../src/lib/communication-content.ts');
const {validateReservation}=require('../src/lib/careers-booking-rules.ts');

test('preview and mail safely preserve lists, quotes, formatting and the positioned personal booking button',()=>{
 const candidate={id:'fixture-one',role:'cctv',name:'A <script>bad</script> $&',testSlot:'2026-12-01 - 09:30'};
 const html=content.renderStudioMessage('<p>Hello {{candidate_name}}</p><ul><li>First</li></ul><p>{{booking_link}}</p><blockquote>Quote</blockquote><ol><li>Last</li></ol><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',candidate,'Operator','en',true);
 assert.match(html,/<ul><li>First/);assert.match(html,/<blockquote>Quote/);assert.match(html,/<ol><li>Last/);
 assert.ok(html.indexOf('data-booking-button')>html.indexOf('<ul>'));assert.ok(html.indexOf('data-booking-button')<html.indexOf('<blockquote>'));
 assert.match(html,/\/en\/careers\/test-invite\/fixture-one/);assert.match(html,/A &lt;script&gt;bad&lt;\/script&gt; \$&/);assert.doesNotMatch(html,/<script|javascript:/);
 assert.doesNotMatch(content.renderStudioMessage('{{booking_link}}',candidate,'Operator','en',false),/href=/);
 assert.match(content.candidateVariables('{{test_slot}}',candidate,'Operator','en'),/09:30/);
 assert.match(content.candidateVariables('{{test_slot}}',{...candidate,testSlot:undefined},'Operator','en'),/Not booked yet/);
});

test('moving the booking button preserves message content and maintains exactly one token',()=>{
 const body='<p>First</p><p>{{booking_link}}</p><p>Second</p>';
 const moved=content.moveBookingToken(body,0);assert.ok(moved.indexOf('{{booking_link}}')<moved.indexOf('First'));
 assert.equal((moved.match(/\{\{booking_link\}\}/g)||[]).length,1);assert.match(moved,/Second/);
 const plain=content.moveBookingToken('One\n\n{{booking_link}}\n\nTwo',0);assert.match(plain,/^\{\{booking_link\}\}/);assert.match(plain,/Two/);
});

test('equal slot labels in another role or cycle do not consume this cycle capacity',()=>{
 const candidate={id:'one',role:'cctv',cohortId:'sept',status:'test_invited',invitedAt:'2026-01-01'};
 const slot='2026-12-01 - 09:30', config={slots:[slot],quota:1}, at=new Date('2026-01-01');
 assert.equal(validateReservation(candidate,slot,config,[{...candidate,id:'other',role:'manager',testSlot:slot},{...candidate,id:'older',cohortId:'oct',testSlot:slot}],at).status,'test_booked');
 assert.throws(()=>validateReservation(candidate,slot,config,[{...candidate,id:'same',role:'cctv_operator',testSlot:slot}],at),/SLOT_FULL/);
});

const rows=new Map(), applications=new Map(), sent=[];let providerFails=false,historyFails=false,sendDelay=0,activeSends=0,peakSends=0;
const store={
 getMail:async id=>structuredClone(rows.get(id)||null),
 hydrateMailAttachments:async items=>items||[],
 insertMailBatch:async items=>{for(const item of items)if(!rows.has(item.id))await store.putMail(item,0)},
 listMail:async(scope,kind,status)=>[...rows.values()].filter(row=>(!scope||row.scope===scope)&&(!kind||row.kind===kind)&&(!status||row.data.status===status)).map(row=>structuredClone(row)),
 putMail:async(item,version)=>{const current=rows.get(item.id);if((current?.version||0)!==version)throw Error('MAIL_CONFLICT');const row=structuredClone({...item,version:version+1,updated_at:new Date().toISOString()});rows.set(row.id,row);return structuredClone(row);}
};
const original=Module._load;
Module._load=function(name,...args){
 if(name==='./careers-workspace-store')return {getRecruitmentWorkspaceData:async()=>({applications:[...applications.values()]})};
 if(name==='./communication-mail-store')return store;
 if(name==='./careers-email')return {sendTransactionalEmail:async mail=>{if(providerFails)throw Error('Fixture provider failure');activeSends++;peakSends=Math.max(peakSends,activeSends);try{if(sendDelay)await new Promise(resolve=>setTimeout(resolve,sendDelay));sent.push(mail);return {success:true,messageId:'<fixture>'}}finally{activeSends--}}};
 if(name==='./careers-store')return {getApplication:async id=>structuredClone(applications.get(id)||null),updateApplication:async(id,patch)=>{if(historyFails)throw Error('Fixture history failure');applications.set(id,{...applications.get(id),...patch});return applications.get(id)}};
 if(name==='./careers-campaign-store')return {getRoleDefinitions:async()=>[]};
 return original.call(this,name,...args);
};
const delivery=require('../src/lib/communication-delivery.ts');Module._load=original;
test('durable queue claims are exclusive, personalize only the intended applicant and do not resend a completed campaign',async()=>{
 rows.clear();sent.length=0;
 const candidate={id:'one',name:'One',role:'cctv',cohortId:'sept',email:'one@example.invalid',status:'test_invited',invitedAt:'2026-01-01'};applications.set(candidate.id,candidate);
 const item=await delivery.enqueueStudioMail(candidate,{subject:'Hello {{name}}',messageBody:'One message',roleTitle:'Operator',locale:'en'},'scope','campaign');
 await Promise.all([delivery.deliverQueuedItem(item),delivery.deliverQueuedItem(item)]);
 assert.equal(sent.length,1);assert.equal(sent[0].to[0].email,'one@example.invalid');assert.equal(sent[0].subject,'Hello One');
 assert.equal((await store.getMail(item.id)).data.status,'sent');
 await delivery.deliverQueuedItem(await delivery.enqueueStudioMail(candidate,{},'scope','campaign'));assert.equal(sent.length,1);
});
test('booking follow-up is armed only after delivery and sends once using the actual chosen slot',async()=>{
 rows.clear();sent.length=0;applications.clear();
 const candidate={id:'two',name:'Two',role:'cctv',cohortId:'sept',email:'two@example.invalid',status:'test_invited',invitedAt:'2026-01-01'};applications.set(candidate.id,candidate);
 const item=await delivery.enqueueStudioMail(candidate,{subject:'Invitation',messageBody:'Book now',roleTitle:'Operator',locale:'en',includeBookingButton:true,followUp:{trigger:'booking_confirmed',subject:'Booked {{test_slot}}',message:'Hello {{name}}, see you at {{test_slot}}.'}},'scope','invitation');
 await delivery.deliverQueuedItem(item);
 const rule=await store.getMail(delivery.deliveryId('booking-follow-up:two'));assert.equal(rule.data.status,'waiting_for_booking');
 const booked={...applications.get('two'),testSlot:'2026-12-01 - 09:30',testBookedAt:'2026-11-01T00:00:00Z',status:'test_booked'};applications.set('two',booked);
 await Promise.all([delivery.bookingFollowUp(booked),delivery.bookingFollowUp(booked)]).catch(error=>{assert.match(error.message,/MAIL_CONFLICT/)});
 assert.equal(sent.length,2);assert.match(sent[1].subject,/09:30/);assert.doesNotMatch(sent[1].subject,/Not booked|confirmed/);
 await delivery.bookingFollowUp(booked);assert.equal(sent.length,2);
});
test('delivery failure stays in Outbox; history failure after successful delivery never permits an automatic duplicate',async()=>{
 rows.clear();sent.length=0;providerFails=true;
 const candidate=applications.get('two');const item=await delivery.enqueueStudioMail(candidate,{subject:'Update',messageBody:'Body',roleTitle:'Operator',locale:'en'},'scope','failed');
 await delivery.deliverQueuedItem(item);assert.equal((await store.getMail(item.id)).data.status,'failed');assert.equal(sent.length,0);
 providerFails=false;historyFails=true;
 const another=await delivery.enqueueStudioMail(candidate,{subject:'Update',messageBody:'Body',roleTitle:'Operator',locale:'en'},'scope','history');await delivery.deliverQueuedItem(another);
 const outcome=await store.getMail(another.id);assert.equal(outcome.data.status,'sent');assert.equal(outcome.data.requiresReview,true);
 await delivery.deliverQueuedItem(outcome);assert.equal(sent.length,1);historyFails=false;
});

test('Portuguese mail retains the original letterhead without repeating its subject in the body',()=>{
 const {renderOfficialMail}=require('../src/lib/communication-renderer.ts');
 const candidate={id:'fixture',name:'Applicant',role:'cctv',testSlot:'2026-12-01 - 09:30'};
 const mail=renderOfficialMail({candidate,subject:'Only in subject',message:'<p>Olá {{candidate_name}}</p>{{booking_link}}',roleTitle:'Operadora de CCTV',includeBookingButton:true});
 assert.equal(mail.subject,'Only in subject');assert.doesNotMatch(mail.html,/Only in subject|Recruitment team|Choose your test/);
 for(const label of ['COMUNICAÇÃO OFICIAL · PROCESSO DE RECRUTAMENTO','Departamento de Recursos Humanos','Equipa de Recrutamento','Escolher data e hora do teste','REF: COM-'])assert.ok(mail.html.includes(label),label);
 assert.match(mail.html,/logo-white.png/);assert.match(mail.text,/\/pt\/careers\/test-invite\/fixture/);
});

test('queue resume recovers frozen recipients after interruption and completes a campaign without duplicates',async()=>{
 rows.clear();sent.length=0;applications.clear();
 const candidate={id:'frozen-one',name:'Frozen',role:'cctv',cohortId:'sept',email:'frozen@example.invalid',status:'test_invited'};applications.set(candidate.id,candidate);
 const campaign='frozen-campaign',scope='frozen-scope';
 const queued={id:delivery.deliveryId(`${campaign}:${candidate.id}`),kind:'outbox',scope,data:{contentId:campaign,candidateId:candidate.id,roleId:candidate.role,cohortId:candidate.cohortId,recipient:candidate.email,campaignId:campaign,locale:'pt',roleTitle:'Operadora de CCTV',includeBookingButton:false,status:'queued',deliveryId:'fixture-delivery'}};
 await store.putMail({id:campaign,kind:'draft',scope,data:{status:'queued',queuedItems:[queued],subject:'Olá {{candidate_name}}',messageBody:'Mensagem congelada',attachments:[]}},0);
 await delivery.processStudioQueue(scope,campaign);assert.equal(sent.length,1);assert.equal(sent[0].subject,'Olá Frozen');assert.equal((await store.getMail(campaign)).data.status,'sent');
 await delivery.processStudioQueue(scope,campaign);assert.equal(sent.length,1);
});
test('nested quotes and lists remain complete when moving the preview booking button',()=>{
 const body='<blockquote><p>One</p><ul><li>Two</li></ul></blockquote><p>End</p>';
 const blocks=content.messageBlocks(body);assert.equal(blocks.length,2);assert.equal(blocks[0],'<blockquote><p>One</p><ul><li>Two</li></ul></blockquote>');
 assert.doesNotMatch(content.renderStudioMessage(content.moveBookingToken(body,1),{id:'fixture',name:'Fixture',role:'cctv'},'Operadora','pt',true),/&lt;\/blockquote/);
});


test('concurrent resume requests share one five-email worker and never resurrect cancelled deliveries',async()=>{
 rows.clear();sent.length=0;applications.clear();sendDelay=10;peakSends=0;
 const scope='batch-five';
 for(let index=0;index<11;index++) {
  const candidate={id:`batch-${index}`,name:`Fixture ${index}`,role:'cctv',cohortId:'sept',email:`batch-${index}@example.invalid`,status:'test_invited'};
  applications.set(candidate.id,candidate);
  const item=await delivery.enqueueStudioMail(candidate,{subject:'Subject',messageBody:'Body',includeBookingButton:false},scope,'batch-campaign');
  if(index===10)await store.putMail({...item,data:{...item.data,status:'deleted'}},item.version);
 }
 await Promise.all([delivery.processStudioQueue(scope),delivery.processStudioQueue(scope)]);
 assert.equal(sent.length,10);assert.equal(peakSends,5);assert.equal((await store.getMail(delivery.deliveryId('batch-campaign:batch-10'))).data.status,'deleted');
 await delivery.processStudioQueue(scope);assert.equal(sent.length,10);sendDelay=0;
});

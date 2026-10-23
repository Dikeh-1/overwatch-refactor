const { test, after } = require('node:test');
const assert = require('node:assert/strict');
require('../scripts/register-typescript.cjs');
const { readProviderMessage } = require('../src/lib/communication-provider-history.ts');
const previousFetch = global.fetch, previousKey = process.env.BREVO_API_KEY;
after(() => { global.fetch = previousFetch; if(previousKey === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = previousKey; });
test('provider history recovers exact original body and delivery/open/click evidence without sending', async () => {
 process.env.BREVO_API_KEY='fixture'; let ambiguous=false, wrongRecipient=false; const paths=[];
 const record={recipient:'candidate@example.invalid',subject:'Original subject',sentAt:'2026-10-22T12:00:00Z'};
 const message={uuid:'provider-history-123',messageId:'<fixture>',subject:record.subject,date:record.sentAt};
 global.fetch=async(url,options)=>{ assert.equal(options.method,undefined); paths.push(new URL(url).pathname); if(new URL(url).searchParams.has('endDate'))assert.ok(new URL(url).searchParams.get('endDate')<=new Date().toISOString().slice(0,10)); if(url.includes('/statistics/events')) return Response.json({events:[{messageId:'<fixture>',email:record.recipient,event:'click',date:record.sentAt,link:'https://www.overwatchmoz.com/pt/careers/test-invite/fixture'}]});
 if(new URL(url).pathname.endsWith('/smtp/emails'))return Response.json({transactionalEmails:ambiguous?[message,message]:[message]});
 return Response.json({email:wrongRecipient?'other@example.invalid':record.recipient,subject:record.subject,body:'<p>Actual historical content</p>',events:[{name:'delivered',time:record.sentAt},{name:'opened',time:record.sentAt},{name:'delivered',time:record.sentAt}]}); };
 let result=await readProviderMessage(record);assert.match(result.htmlContent,/Actual historical/);assert.ok(result.events.some(row=>row.name==='opened'));assert.ok(result.events.some(row=>row.name==='click'&&row.link));assert.equal(result.events.filter(row=>row.name==='delivered').length,1);
 ambiguous=true;paths.length=0; result=await readProviderMessage(record); assert.equal(result.htmlContent,undefined); assert.ok(paths.every(path=>path.endsWith('/smtp/emails')));
 ambiguous=false;wrongRecipient=true;result=await readProviderMessage(record);assert.equal(result.htmlContent,undefined);
});

require('../scripts/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const original = Module._load;
const adminSettings = require("../src/lib/admin-settings.ts");
const apps = new Map();
let emails = 0;
let stored = { senderName: 'Recruitment', replyToEmail: 'qa@example.invalid' };
let slots = { slots: ['2026-12-01T10:00'], quota: 15 };
const store = {
  getApplication: async id => apps.get(id),
  updateApplication: async (id, patch) => { const a = { ...apps.get(id), ...patch }; apps.set(id,a); return a; },
};
Module._load = function(name,...args) {
  if (name === "@/lib/admin-activity") return { auditRequest: async (_, handler) => handler() };
  const mocks = {
    '@/lib/careers-auth': { authenticated: async () => true, sameOrigin: r => r.headers.get('origin') === 'http://localhost:3100' },
    '@/lib/careers-store': store,
    '@/lib/careers-email': { sendRetractionEmail: async () => { emails++; }, sendDisqualificationEmail: async () => { emails++; } },
    '@/lib/careers-screening': { screenCandidate: () => ({}) },
    '@/lib/admin-settings': adminSettings,
    '@/lib/careers-config-store': {
      getConfiguredTestSlots: async () => slots, setConfiguredTestSlots: async s => { slots=s; },
      getSystemConfig: async () => stored, setSystemConfig: async (_,s) => { stored=s; },
    },
  };
  return Object.hasOwn(mocks,name) ? mocks[name] : original.call(this,name,...args);
};
const restore = require('../src/app/api/admin/careers/restore/route.ts');
const disqualify = require('../src/app/api/admin/careers/disqualify/route.ts');
const settings = require('../src/app/api/admin/settings/route.ts');
Module._load = original;
const request = (body, origin='http://localhost:3100') => new Request('http://localhost:3100/api/admin/settings', { method:'POST', headers:{origin,'Content-Type':'application/json'}, body:JSON.stringify(body) });
test('restoration rejects arbitrary stages and implicit mass selection', async () => {
  assert.equal((await restore.POST(request({ targetStatus:'hired', ids:['candidate-1'] }))).status,400);
  assert.equal((await restore.POST(request({ restoreAllArchivedWomen:true }))).status,400);
  assert.equal(emails,0);
});
test('restoration preserves historical bookings and ignores already active applicants', async () => {
  apps.set('candidate-1',{ id:'candidate-1',status:'archived',testSlot:'2026-09-20',testBookedAt:'2026-09-01' });
  apps.set('candidate-2',{ id:'candidate-2',status:'hired' });
  const res=await restore.POST(request({ ids:['candidate-1','candidate-2'], sendApologyEmail:false }));
  assert.equal(res.status,200);
  assert.equal(apps.get('candidate-1').testSlot,'2026-09-20');
  assert.equal(apps.get('candidate-2').status,'hired');
  assert.equal(emails,0);
});
test('disqualification deduplicates IDs and records an explicit terminal decision', async () => {
  apps.set('candidate-3',{id:'candidate-3',status:'shortlisted'});
  const res=await disqualify.POST(request({ ids:['candidate-3','candidate-3'],sendEmail:false }));
  assert.equal((await res.json()).count,1);
  assert.equal(apps.get('candidate-3').status,'disqualified');
  assert.equal(apps.get('candidate-3').activityLog.length,1);
});
test('settings round-trip persists values and preserves the configured schedule', async () => {
  const res=await settings.POST(request({senderName:'New Recruitment',replyToEmail:'new@example.invalid',quota:23}));
  assert.equal(res.status,200);
  const saved=await (await settings.GET()).json();
  assert.equal(saved.senderName,'New Recruitment');
  assert.equal(saved.quota,23);
  assert.deepEqual(slots.slots,['2026-12-01T10:00']);
  assert.equal((await settings.POST(request({quota:0}))).status,400);
  assert.equal((await settings.POST(request({},'https://other.invalid'))).status,403);
});

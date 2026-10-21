require('../scripts/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const workflow = require('../src/lib/careers-workflow.ts');
let target;
let members;
let saved;
function reset() {
  target = { id:'september',roleId:'cctv',name:'September',status:'closed',openedAt:'2026-09-01',stages:[],screeningRules:[] };
  members = [{id:'one',role:'cctv',cohortId:'september',testSlot:'past',status:'tested'}, {id:'two',role:'cctv',cohortId:'september',testSlot:'past',attendanceStatus:'absent',status:'tested'}, {id:'outside',role:'technical',cohortId:'october',testSlot:'past'}];
  saved = null;
}
const original = Module._load;
Module._load = function(name,...args) {
  if(name==='@/lib/careers-auth') return { authenticated: async()=>true, sameOrigin:r=>r.headers.get('origin')==='http://localhost:3100' };
  if(name==='@/lib/careers-workflow') return workflow;
  if(name==='@/lib/careers-workspace-store') return { getRecruitmentWorkspaceData: async()=>({roles:[],cohorts:[target],applications:members}) };
  if(name==='@/lib/careers-campaign-store') return { getAllCohorts:async()=>[target],saveCohort:async c=>{saved=c;target=c;return c;} };
  return original.call(this,name,...args);
};
const route = require('../src/app/api/admin/careers/archive/route.ts');
Module._load=original;
const request=(patch={},origin='http://localhost:3100')=>new Request('http://localhost:3100/api/admin/careers/archive',{method:'PATCH',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({action:'confirm_historical_attendance',cohortId:'september',expectedBookingCount:2,...patch})});
test('historical confirmation refuses conflicting counts and requires explicit correction of old absences',async()=>{
  reset();
  assert.equal((await route.PATCH(request({expectedBookingCount:3,overrideRecordedAbsences:true}))).status,409);
  assert.equal((await route.PATCH(request())).status,409);
  assert.equal(saved,null);
});
test('historical confirmation freezes exactly one cohort membership and preserves absence audit data',async()=>{
  reset();
  const result=await route.PATCH(request({overrideRecordedAbsences:true}));
  assert.equal(result.status,200);
  assert.deepEqual(saved.historicalAttendance.applicationIds,['one','two']);
  assert.deepEqual(saved.historicalAttendance.previousAbsenceIds,['two']);
  assert.equal(members[1].attendanceStatus,'absent');
  assert.equal(members[0].attendedAt,undefined);
  members.push({id:'later',role:'cctv',cohortId:'september',testSlot:'new'});
  const second=await(await route.PATCH(request({expectedBookingCount:3,overrideRecordedAbsences:true}))).json();
  assert.equal(second.alreadyConfirmed,true);
  assert.equal(second.confirmedCount,2);
});
test('historical confirmation cannot apply to active/unassigned cycles or cross-origin requests',async()=>{
  reset(); target.status='active';
  assert.equal((await route.PATCH(request({overrideRecordedAbsences:true}))).status,400);
  target.status='closed';target.unassigned=true;
  assert.equal((await route.PATCH(request({overrideRecordedAbsences:true}))).status,400);
  assert.equal((await route.PATCH(request({},'https://untrusted.invalid'))).status,403);
  assert.equal(saved,null);
});

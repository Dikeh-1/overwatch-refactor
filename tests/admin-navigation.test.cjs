require('../scripts/register-typescript.cjs');
const {test}=require('node:test'), assert=require('node:assert/strict');
const {adminParent,adminReturnTarget,adminCommunicationsTarget,candidateProfileTarget}=require('../src/lib/admin-navigation.ts');
test('profile back returns to the exact archive cycle, stage and filters',()=>{
 const params=new URLSearchParams('cohortId=september&view=applications&metric=nextPhase&role=cctv');
 const profile=new URL(candidateProfileTarget('candidate','/admin/recruitment/archive',params),'https://fixture.invalid');
 assert.equal(adminParent(profile.pathname,profile.searchParams),'/admin/recruitment/archive?cohortId=september&view=applications&metric=nextPhase&role=cctv');
 assert.equal(adminCommunicationsTarget(profile.pathname,profile.searchParams),'/admin/recruitment/archive?cohortId=september&view=communications');
});
test('back has safe destinations for direct entry and rejects external return URLs',()=>{
 for(const value of ['https://evil.invalid','//evil.invalid','/administrator','/admin\\evil','/admin\n/evil']) assert.equal(adminReturnTarget(value),null);
 assert.equal(adminParent('/admin/recruitment/archive',new URLSearchParams('cohortId=september')),'/admin/recruitment/archive');
 assert.equal(adminParent('/admin/settings',new URLSearchParams()),'/admin');
 assert.equal(adminParent('/admin/recruitment/candidates/id',new URLSearchParams('cohortId=september')),'/admin/recruitment/archive?cohortId=september&view=applications');
});

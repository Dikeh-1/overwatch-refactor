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
const {isAdminHome}=require('../src/lib/admin-navigation.ts');
test('home has no back loop, while a role workspace keeps its back navigation',()=>{
 for(const path of ['/admin','/admin/overview','/admin/recruitment']) assert.equal(isAdminHome(path,new URLSearchParams()),true);
 assert.equal(isAdminHome('/admin/recruitment',new URLSearchParams('scope=all&role=all')),true);
 assert.equal(isAdminHome('/admin/recruitment',new URLSearchParams('role=cctv')),false);
 assert.equal(isAdminHome('/admin/recruitment/archive',new URLSearchParams()),false);
});
test('archive hierarchy drops stage filters before returning to all cycles',()=>{
 const path='/admin/recruitment/archive';
 const overview=adminParent(path,new URLSearchParams('cohortId=september&view=testing&metric=booked'));
 assert.equal(overview,path+'?cohortId=september');
 assert.equal(adminParent(path,new URL(overview,'https://fixture.invalid').searchParams),path);
});

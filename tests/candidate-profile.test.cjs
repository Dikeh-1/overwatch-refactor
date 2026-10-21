require('../scripts/register-typescript.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path'),fs=require('node:fs'),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..');
const original=Module._load;
const previous=require.extensions['.tsx'];
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
Module._load=function(name,...args){
  if(name==='next/navigation')return {useRouter:()=>({}),useSearchParams:()=>new URLSearchParams()};
  if(name==='next/link')return ({href,children,...props})=>React.createElement('a',{href,...props},children);
  if(name==='../shell/AdminLanguageContext')return {useAdminLanguage:()=>({lang:'en'})};
  if(name==='./CommunicationsView')return {CommunicationsView:()=>null};
  if(name==='../DocxViewer'||name.includes('/ui/CelebrationOverlay')||name.includes('/ui/OverwatchOrbitLoader'))return ()=>null;
  if(name.startsWith('@/lib/'))return original.call(this,path.join(root,'src',name.slice(2)),...args);
  return original.call(this,name,...args);
};
const {CandidateProfileView}=require('../src/components/admin/recruitment/CandidateProfileView.tsx');
Module._load=original;
if(previous)require.extensions['.tsx']=previous;else delete require.extensions['.tsx'];
const base={id:'fixture',name:'Fixture Applicant',email:'fixture@example.invalid',whatsapp:'',createdAt:'2026-09-01',locale:'en',status:'interest_confirmed',cvName:'',cvType:'',cvSize:0,grade12:'yes',shifts:'yes',experience:'yes',ai:'yes'};
const props=a=>({candidate:a,roles:[],onStatusChange:async()=>{},onArchive:async()=>{},onDelete:async()=>{}});
test('CCO screening results never select the technical-manager profile or installation checklist',()=>{
  const result={passedMandatory:true,preferredScore:1,preferredTotal:1,matchPercentage:100,failedReasons:[],details:[{key:'grade12',label:'Grade 12 High School Completion',mandatory:true,passed:true}]};
  const html=renderToStaticMarkup(React.createElement(CandidateProfileView,props({...base,role:'cctv',screeningResult:result,technicalData:{}})));
  assert.match(html,/Qualification Checklist/);assert.match(html,/Grade 12 High School Completion/);
  assert.doesNotMatch(html,/Technical Screening &amp; Competencies|Practical CCTV Installation|NVR \/ DVR Configuration|Mandatory Requirements Missing/);
  const manager=renderToStaticMarkup(React.createElement(CandidateProfileView,props({...base,role:'cctv_technical_manager'})));
  assert.match(manager,/Technical Screening &amp; Competencies/);assert.match(manager,/Practical CCTV Installation/);
});

test('documented attendance, a zero score and configured English criteria agree with the archive',()=>{
  const a={...base,role:'cctv',testScore:0,historicalAttendanceConfirmed:true,attendanceStatus:'present',screeningResult:{passedMandatory:true,preferredScore:0,preferredTotal:0,matchPercentage:0,failedReasons:[],details:[{key:'grade12',label:'Conclusão da 12.ª Classe',mandatory:true,passed:true}]}};
  const options={...props(a),roles:[{id:'cctv',en:'CCTV Operator',pt:'Operadora de CCTV',open:false,screeningRules:[{field:'grade12',labelEn:'Grade 12 completion',labelPt:'Conclusão da 12.ª Classe'}]}]};
  const html=renderToStaticMarkup(React.createElement(CandidateProfileView,options));
  assert.match(html,/Present \(documented\)/);assert.match(html,/Recorded Score:.*?0%/s);assert.match(html,/Grade 12 completion/);assert.doesNotMatch(html,/Conclusão da 12/);
});

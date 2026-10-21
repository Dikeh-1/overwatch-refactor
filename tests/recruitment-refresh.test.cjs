require('../scripts/register-typescript.cjs');
const { test }=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');
const effects=[];
const originalLoad=Module._load;
Module._load=function(name,...args){return name==='react'?{useRef:value=>({current:value}),useEffect:effect=>effects.push(effect)}:originalLoad.call(this,name,...args);};
const {useRecruitmentRefresh}=require('../src/components/admin/hooks/useRecruitmentRefresh.ts');
Module._load=originalLoad;
test('visible recruitment views refresh on focus/interval, suppress overlapping work and stop after cleanup',async()=>{
  const old={window:global.window,document:global.document,setInterval:global.setInterval,clearInterval:global.clearInterval};
  let tick,intervalCleared=false,release;
  let calls=0,lastSignal;
  global.window=new EventTarget();
  global.document=new EventTarget();document.hidden=false;
  global.setInterval=(callback,delay)=>{assert.equal(delay,30000);tick=callback;return 123;};
  global.clearInterval=id=>{assert.equal(id,123);intervalCleared=true;};
  try{
    useRecruitmentRefresh(signal=>{calls++;lastSignal=signal;return new Promise(resolve=>{release=resolve;});});
    effects[0]();const cleanup=effects[1]();
    assert.equal(calls,0);
    tick();assert.equal(calls,1);
    window.dispatchEvent(new Event('focus'));assert.equal(calls,1);
    release();await Promise.resolve();await Promise.resolve();
    document.hidden=true;tick();assert.equal(calls,1);
    document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));assert.equal(calls,2);
    cleanup();assert.equal(lastSignal.aborted,true);assert.equal(intervalCleared,true);
    release();await Promise.resolve();await Promise.resolve();
    window.dispatchEvent(new Event('focus'));tick();assert.equal(calls,2);
  }finally{for(const [key,value] of Object.entries(old)){if(value===undefined)delete global[key];else global[key]=value;}}
});

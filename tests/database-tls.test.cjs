require('../scripts/register-typescript.cjs');
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {X509Certificate}=require('node:crypto');
const ConnectionParameters=require('pg/lib/connection-parameters');
const Module=require('node:module');
let options;
const original=Module._load;
Module._load=function(name,...args){
  if(name==='pg')return {Pool:class {constructor(config){options=config;}}};
  return original.call(this,name,...args);
};
const {getCareersPool}=require('../src/lib/careers-db.ts');
const {SUPABASE_DATABASE_CA}=require('../src/lib/careers-db-ca.ts');
Module._load=original;
after(()=>{delete globalThis.overwatchCareersPool;process.env.NODE_ENV='test';delete process.env.DATABASE_URL;});
const reset=()=>{delete globalThis.overwatchCareersPool;options=undefined;process.env.NODE_ENV='development';};

test('database connections verify server certificates using the provider CA',()=>{
  reset();process.env.DATABASE_URL='postgresql://fixture:fixture@aws-0-eu-west-2.pooler.supabase.com:6543/postgres';
  getCareersPool();
  assert.equal(options.ssl.rejectUnauthorized,true);
  assert.ok(options.ssl.ca.includes(SUPABASE_DATABASE_CA));
  const cert=new X509Certificate(SUPABASE_DATABASE_CA);
  assert.equal(cert.ca,true);
  assert.ok(Date.parse(cert.validTo)>Date.now());
  assert.equal(cert.fingerprint256,'80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA');
});

test('connection-string options cannot override verification or load arbitrary certificate files',()=>{
  reset();process.env.DATABASE_URL='postgresql://fixture:fixture@aws-0-eu-west-2.pooler.supabase.com:5432/postgres?ssl=no-verify&sslmode=no-verify&sslcert=private-file&sslkey=private-key&sslrootcert=untrusted-file&uselibpqcompat=true&application_name=fixture';
  getCareersPool();
  const connection=new ConnectionParameters(options);
  assert.equal(connection.ssl.rejectUnauthorized,true);
  assert.equal(connection.port,6543);
  assert.equal(connection.application_name,'fixture');
  assert.ok(connection.ssl.ca.includes(SUPABASE_DATABASE_CA));
  for(const key of ['ssl','sslmode','sslcert','sslkey','sslrootcert','uselibpqcompat'])assert.equal(new URL(options.connectionString).searchParams.has(key),false);
});

test('invalid URLs fail closed and test runtimes remain disconnected',()=>{
  reset();process.env.DATABASE_URL='not a database URL';
  assert.throws(getCareersPool,/DATABASE_URL_INVALID/);
  process.env.NODE_ENV='test';
  assert.equal(getCareersPool(),null);
  assert.equal(options,undefined);
});

test('an unconfigured runtime never falls back to a built-in database credential',()=>{
  reset();for(const key of ['DATABASE_URL','POSTGRES_URL','POSTGRES_PRISMA_URL','POSTGRES_URL_NON_POOLING'])delete process.env[key];
  assert.equal(getCareersPool(),null);assert.equal(options,undefined);
});

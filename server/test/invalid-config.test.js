import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import request from 'supertest';
process.env.DATA_DIR=mkdtempSync(path.join(tmpdir(),'sql-invalid-config-'));
process.env.NODE_ENV='test';process.env.GOOGLE_CLIENT_ID='invalid.apps.googleusercontent.com';process.env.GOOGLE_CLIENT_SECRET='invalid-secret';process.env.GOOGLE_CALLBACK_URL='http://localhost:5000/api/auth/google/callback';process.env.OPENAI_API_KEY='deliberately-invalid-key';
const {app}=await import('../src/app.js');
const {appDb}=await import('../src/database.js');
const {challenges}=await import('../src/challenges.js');
const agent=request.agent(app);
after(()=>{appDb.close();rmSync(process.env.DATA_DIR,{recursive:true,force:true});});
test('invalid optional credentials do not prevent local signup, SQL, Coach or Interview',async()=>{
  assert.equal((await request(app).get('/api/health')).status,200);
  assert.equal((await request(app).get('/api/auth/me')).body.googleEnabled,true);
  assert.equal((await agent.post('/api/auth/register').send({name:'Invalid config learner',email:'invalid-config@example.test',password:'Testing2026!'})).status,200);
  assert.equal((await agent.post('/api/sql/execute').send({sql:'SELECT * FROM employees'})).body.success,true);
  const realFetch=globalThis.fetch;
  globalThis.fetch=async()=>({ok:false,status:401});
  try {assert.equal((await agent.post('/api/coach').send({action:'explain',text:'SELECT * FROM employees'})).body.provider,'Local Coach');}
  finally{globalThis.fetch=realFetch;}
  const oauth=await agent.get('/api/auth/google');assert.equal(oauth.status,302);assert.match(oauth.headers.location,/accounts.google.com/);
  const rejected=await agent.get('/api/auth/google/callback?error=access_denied');assert.equal(rejected.status,302);assert.equal(rejected.headers.location,'http://localhost:5173/login?error=google');
  assert.equal((await agent.get('/api/auth/me')).body.user.name,'Invalid config learner');
  const start=(await agent.post('/api/interview/challenges/salary-filter/start').send({})).body;
  const result=(await agent.post('/api/interview/challenges/salary-filter/submit').send({attemptId:start.attempt.id,sql:challenges[0].solution})).body;
  assert.equal(result.correct,true);assert.equal(result.passed,4);
  await agent.post('/api/auth/logout').send({});
  assert.equal((await agent.post('/api/auth/login').send({email:'invalid-config@example.test',password:'Testing2026!'})).status,200);
});

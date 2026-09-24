import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createServer as httpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
if(!existsSync('node_modules/vite/bin/vite.js')) { console.error('Dependencies are missing. Run npm run setup first.'); process.exit(1); }
try { const {default:Database}=await import('better-sqlite3'); const db=new Database(':memory:'); db.close(); }
catch { console.error('SQLite native module is incompatible with this Node version. Run npm run setup to rebuild a clean install.'); process.exit(1); }
await import('dotenv/config');
async function free(port) { await new Promise((resolve,reject)=>{const probe=createServer();probe.once('error',error=>reject(Object.assign(new Error(`Port ${port}: ${error.code}. ${error.code==='EACCES'?'Windows may reserve this port.':'Run npm run stop or close the application using this port.'}`),{code:error.code})));probe.listen(port,'127.0.0.1',()=>probe.close(resolve));}); }
let apiPort=Number(process.env.PORT || 5000), uiPort=Number(process.env.FRONTEND_PORT || 5173);
try { await free(apiPort); await free(uiPort); }
catch(e) {
  if(e.code!=='EACCES' || process.env.PORT || process.env.FRONTEND_PORT) {console.error(e.message);process.exit(1);}
  console.log('Windows reserved the default port range. Using API 15000 and frontend 15173.');
  apiPort=15000;uiPort=15173;
  try {await free(apiPort);await free(uiPort);}catch(error){console.error(error.message);process.exit(1);}
}
const childEnv={...process.env,PORT:String(apiPort),FRONTEND_PORT:String(uiPort),CLIENT_URL:process.env.CLIENT_URL || `http://localhost:${uiPort}`};
mkdirSync('.demo',{recursive:true});
const secret=randomBytes(32).toString('hex'), children=[];
let stopping=false;
function stop(code=0) {
  if(stopping)return; stopping=true;
  for(const child of children) child.kill('SIGTERM');
  rmSync('.demo/control.json',{force:true});
  control.close();
  setTimeout(()=>{for(const child of children)child.kill('SIGKILL');process.exit(code);},1200);
}
const control=httpServer((req,res)=>{
  if(req.method!=='POST' || req.url!=='/stop' || req.headers.authorization!==`Bearer ${secret}`) {res.writeHead(403).end();return;}
  res.end('Stopping demo.'); stop();
});
await new Promise(resolve=>control.listen(0,'127.0.0.1',resolve));
writeFileSync('.demo/control.json',JSON.stringify({port:control.address().port,secret}),{mode:0o600});
for(const args of [['server/src/server.js'],['node_modules/vite/bin/vite.js','--config','client/vite.config.js']]) {
  const child=spawn(process.execPath,args,{stdio:'inherit',cwd:root,env:childEnv});children.push(child);
  child.on('exit',code=>{if(!stopping){console.error('A demo service stopped. Review the error above.');stop(code || 1);}});
  child.on('error',()=>stop(1));
}
async function healthy(url) { try { return (await fetch(url,{signal:AbortSignal.timeout(800)})).ok; } catch{return false;} }
let ready=false;
for(let i=0;i<60 && !stopping;i++) {
  if(await healthy(`http://127.0.0.1:${apiPort}/api/health`) && await healthy(`http://127.0.0.1:${uiPort}`)) {ready=true;break;}
  await new Promise(resolve=>setTimeout(resolve,500));
}
if(!ready && !stopping){console.error('Startup timed out. Check ports, SQLite install and server output.');stop(1);}
if(ready)console.log(`\nDemo ready: http://localhost:${uiPort}\nAPI health: http://localhost:${apiPort}/api/health\nLogin: demo@example.test / Playground2026!\nStop: Ctrl+C or npm run stop\nReset practice data: use Reset workspace in the app.\n`);
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());

import { existsSync, renameSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
if(!process.argv.includes('--confirm')) {console.log('Reset backs up ALL local accounts, sessions and workspaces. Stop the demo first, then run npm run reset -- --confirm. For one workspace use the app’s Reset workspace button.');process.exit(0);}
for(const port of [5000,5173,15000,15173]) {
  try {await new Promise((resolve,reject)=>{const s=createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});}
  catch(error){if(error.code==='EACCES')continue;console.error('Stop the demo with npm run stop before resetting.');process.exit(1);}
}
const root=path.resolve('server'), source=path.resolve(root,'data');
if(path.dirname(source)!==root)throw new Error('Unsafe reset target.');
if(existsSync(source)) {
  const destination=path.resolve('.demo','backups','data-'+new Date().toISOString().replace(/[:.]/g,'-'));
  mkdirSync(path.dirname(destination),{recursive:true}); renameSync(source,destination);
  console.log('Previous data preserved in '+destination);
}
console.log('Reset ready. Run npm run demo to initialize fresh data.');

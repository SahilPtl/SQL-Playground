import { spawnSync } from 'node:child_process';
const npm = process.env.npm_execpath;
if (!npm) { console.error('Run this using npm run setup.'); process.exit(1); }
console.log(`Installing locked dependencies using Node ${process.versions.node}…`);
const installed = spawnSync(process.execPath,[npm,'ci','--fetch-retries=1','--fetch-timeout=30000'],{stdio:'inherit',env:process.env});
if(installed.status!==0) process.exit(installed.status || 1);
try { const {default:Database}=await import('better-sqlite3'); const db=new Database(':memory:'); db.close(); }
catch { console.error('SQLite native module could not load. Use Node 24 LTS and run npm run setup again.'); process.exit(1); }
console.log('Setup complete. No .env file or credentials are required. Run npm run demo.');

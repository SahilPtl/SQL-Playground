import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const busy = new Set();
let active = 0;
export async function execute(task, ownerKey) {
  if (busy.has(ownerKey)) throw Object.assign(new Error('A query is already running. Please wait.'), {status:409});
  if (active >= 4) throw Object.assign(new Error('Query capacity reached. Try again shortly.'), {status:429});
  busy.add(ownerKey); active++;
  try {
    return await new Promise((resolve, reject) => {
      // Child sees no OAuth, OpenAI, session secrets or application DB connection.
      const child = fork(fileURLToPath(new URL('./query-worker.js', import.meta.url)), [], {
        execArgv:['--max-old-space-size=96'], env:{PATH:process.env.PATH, SystemRoot:process.env.SystemRoot || ''},
        stdio:['ignore','ignore','ignore','ipc'], serialization:'advanced'
      });
      let answer, failure, timedOut = false;
      const statements = [];
      const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, task.action === 'grade' ? 4000 : 2500);
      child.on('message', m => { if (m.type === 'result') answer=m.data; if(m.type==='statement') statements.push(m.data); if(m.type==='error') failure=m.message; });
      child.on('error', () => { failure='Unable to launch SQL worker.'; });
      child.on('exit', () => {
        clearTimeout(timer);
        if (timedOut && task.action === 'execute') resolve({success:false,statements,error:{statement:statements.length+1,message:'Query time limit exceeded. Completed earlier statements remain committed; the interrupted statement is rolled back.'},schemaChanged:true});
        else if (timedOut) reject(Object.assign(new Error('Query time limit exceeded.'), {status:408}));
        else if (failure || !answer) reject(Object.assign(new Error(failure || 'SQL worker stopped unexpectedly.'), {status:400}));
        else resolve(answer);
      });
      child.send(task);
    });
  } finally { busy.delete(ownerKey); active--; }
}

import { Router } from 'express';
import { appDb } from './database.js';
import { challenges, publicChallenge } from './challenges.js';
import { execute } from './executor.js';
export const interviewRouter = Router();
const getChallenge = id => challenges.find(c=>c.id===id);
interviewRouter.get('/challenges',(req,res) => res.json({challenges:challenges.map(publicChallenge)}));
interviewRouter.get('/progress',(req,res) => {
  const attempts = appDb.prepare('SELECT id,challenge_id,started_at,deadline,submitted_at,score,passed_tests,total_tests,status,elapsed_seconds FROM interview_attempts WHERE user_id=? ORDER BY id DESC LIMIT 100').all(req.user.id);
  res.json({attempts});
});
interviewRouter.get('/challenges/:id',async (req,res) => {
  const challenge = getChallenge(req.params.id);
  if (!challenge) return res.status(404).json({error:'Challenge not found.'});
  const schema = await execute({action:'schema'},req.user.id);
  const attempt = appDb.prepare("SELECT * FROM interview_attempts WHERE user_id=? AND challenge_id=? AND status='active' ORDER BY id DESC LIMIT 1").get(req.user.id,challenge.id);
  res.json({challenge:publicChallenge(challenge),schema,attempt:attempt || null,serverNow:Date.now()});
});
interviewRouter.post('/challenges/:id/start',(req,res) => {
  const c = getChallenge(req.params.id);
  if (!c) return res.status(404).json({error:'Challenge not found.'});
  // Starting another challenge closes older active timers for this account.
  const now = Date.now();
  const id = appDb.transaction(() => {
    appDb.prepare("UPDATE interview_attempts SET status='abandoned' WHERE user_id=? AND status='active'").run(req.user.id);
    return appDb.prepare('INSERT INTO interview_attempts(user_id,challenge_id,started_at,deadline) VALUES(?,?,?,?)').run(req.user.id,c.id,now,now+c.durationSeconds*1000).lastInsertRowid;
  })();
  res.status(201).json({attempt:appDb.prepare('SELECT * FROM interview_attempts WHERE id=?').get(id),serverNow:now});
});
function activeAttempt(req,res) {
  const attempt = appDb.prepare('SELECT * FROM interview_attempts WHERE id=? AND user_id=? AND challenge_id=?').get(Number(req.body.attemptId)||0,req.user.id,req.params.id);
  if (!attempt || attempt.status!=='active') { res.status(409).json({error:'Start a new attempt before running or submitting.'}); return null; }
  if (Date.now()>=attempt.deadline) {
    appDb.prepare("UPDATE interview_attempts SET status='expired',submitted_at=?,score=0 WHERE id=?").run(Date.now(),attempt.id);
    res.status(409).json({error:'Time expired. Restart the challenge to try again.'}); return null;
  }
  return attempt;
}
interviewRouter.post('/challenges/:id/run',async (req,res) => {
  if (!activeAttempt(req,res)) return;
  res.json(await execute({action:'execute',sql:req.body.sql,readOnly:true},req.user.id));
});
interviewRouter.post('/challenges/:id/submit',async (req,res) => {
  const attempt = activeAttempt(req,res);
  if (!attempt) return;
  const submittedAt = Date.now();
  // Claim once before awaiting: concurrent submissions cannot grade twice.
  const claimed = appDb.prepare("UPDATE interview_attempts SET status='grading' WHERE id=? AND status='active'").run(attempt.id).changes;
  if (!claimed) return res.status(409).json({error:'This attempt is already being submitted.'});
  try {
    const result = await execute({action:'grade',challengeId:req.params.id,sql:req.body.sql},req.user.id);
    const elapsed = Math.floor((submittedAt-attempt.started_at)/1000);
    const duration = (attempt.deadline-attempt.started_at)/1000;
    const score = Math.round(80*result.passed/result.total) + (result.correct ? Math.floor(20*Math.max(0,1-elapsed/duration)) : 0);
    appDb.prepare("UPDATE interview_attempts SET status=?,submitted_at=?,score=?,passed_tests=?,elapsed_seconds=? WHERE id=?").run(result.correct?'passed':'failed',submittedAt,score,result.passed,elapsed,attempt.id);
    res.json({...result,score,elapsedSeconds:elapsed,status:result.correct?'passed':'failed'});
  } catch {
    appDb.prepare("UPDATE interview_attempts SET status='failed',submitted_at=?,elapsed_seconds=? WHERE id=?").run(submittedAt,Math.floor((submittedAt-attempt.started_at)/1000),attempt.id);
    res.json({passed:0,total:4,correct:false,score:0,status:'failed',message:'Submission did not pass within the execution limits. No hidden data is shown.'});
  }
});

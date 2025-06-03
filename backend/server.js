// server.js using CommonJS (require) syntax

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pg = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const { Pool } = pg;
const pool = new Pool();

// Helper: run SQL and log execution
async function runAndLog(userId, sql, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(sql, params);
    const duration = Date.now() - start;
    await pool.query(
      'INSERT INTO query_logs(user_id, sql_text, succeeded, duration_ms) VALUES($1,$2,true,$3)',
      [userId, sql, duration]
    );
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    await pool.query(
      'INSERT INTO query_logs(user_id, sql_text, succeeded, error_message, duration_ms) VALUES($1,$2,false,$3,$4)',
      [userId, sql, err.message, duration]
    );
    throw err;
  }
}

// CRUD endpoints for users
app.post('/api/users', async (req, res) => {
  const { username, password_hash } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO users(username,password_hash) VALUES($1,$2) RETURNING id,username,created_at',
    [username, password_hash]
  );
  res.status(201).json(rows[0]);
});

app.get('/api/users/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id,username,created_at FROM users WHERE id=$1',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

app.put('/api/users/:id', async (req, res) => {
  const { password_hash } = req.body;
  const { rows } = await pool.query(
    'UPDATE users SET password_hash=$1 WHERE id=$2 RETURNING id,username,created_at',
    [password_hash, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

app.delete('/api/users/:id', async (req, res) => {
  await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// Endpoint to run arbitrary SQL (playground)
app.post('/api/run-query', async (req, res) => {
  const { userId, sql } = req.body;
  try {
    const result = await runAndLog(userId, sql);
    res.json({
      columns: result.fields.map(f => f.name),
      rows: result.rows
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// (Optional) Fetch recent query logs for a user
app.get('/api/logs/:userId', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM query_logs WHERE user_id=$1 ORDER BY ran_at DESC LIMIT 50',
    [req.params.userId]
  );
  res.json(rows);
});

// Start the server
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

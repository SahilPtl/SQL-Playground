-- Application tables

-- Store user accounts
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT    UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Log every query a user runs
CREATE TABLE IF NOT EXISTS query_logs (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
  sql_text       TEXT    NOT NULL,
  succeeded      BOOLEAN NOT NULL,
  error_message  TEXT,
  duration_ms    INTEGER,
  ran_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Sample sandbox tables

CREATE TABLE IF NOT EXISTS products (
  id           SERIAL PRIMARY KEY,
  name         TEXT    NOT NULL,
  price_cents  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id         SERIAL PRIMARY KEY,
  full_name  TEXT    NOT NULL,
  email      TEXT    UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id           SERIAL PRIMARY KEY,
  customer_id  INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  product_id   INTEGER REFERENCES products(id) NOT NULL,
  quantity     INTEGER NOT NULL,
  ordered_at   TIMESTAMPTZ DEFAULT NOW()
);
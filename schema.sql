CREATE TABLE IF NOT EXISTS sarees (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL,
  type           TEXT    NOT NULL,
  price          INTEGER NOT NULL,
  original_price INTEGER,
  badge          TEXT,
  image_url      TEXT    NOT NULL,
  wa_message     TEXT,
  sort_order     INTEGER DEFAULT 0,
  is_active      INTEGER DEFAULT 1,
  created_at     TEXT    DEFAULT (datetime('now'))
);

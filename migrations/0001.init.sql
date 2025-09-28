CREATE TABLE IF NOT EXISTS beers (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  image_path TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS host_prefs (
  host TEXT NOT NULL CHECK (host IN ('ruda','marek')),
  beer_id TEXT NOT NULL,
  like INTEGER NOT NULL CHECK (like IN (0,1)),
  PRIMARY KEY (host, beer_id),
  FOREIGN KEY (beer_id) REFERENCES beers(id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  score_ruda INTEGER NOT NULL CHECK (score_ruda BETWEEN 0 AND 100),
  score_marek INTEGER NOT NULL CHECK (score_marek BETWEEN 0 AND 100),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sub_ruda ON submissions(score_ruda DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_sub_marek ON submissions(score_marek DESC, created_at ASC);

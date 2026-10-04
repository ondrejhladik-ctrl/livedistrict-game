// The SQLite database behind the leaderboard (node:sqlite, built into Node 22.13+).
//   players: one row per player – nickname and e-mail are unique (case-insensitive),
//            only a hash of the player's token is stored; best = their best score,
//            runs = how many of their runs counted
//   runs:    the runs being driven right now (timed by the server) and the refused
//            ones (score not possible in that time – admin.js flagged). A run that
//            counted is deleted when it ends, so the table stays small however
//            many runs are played.
'use strict';
const { DatabaseSync } = require('node:sqlite');

const TEST_EMAILS = '%@loadtest.invalid';            // players made by loadtest.js / test.js

function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;          -- safe with WAL, much faster writes
    PRAGMA busy_timeout = 5000;           -- admin.js may touch the file while the server runs
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS players (
      id          INTEGER PRIMARY KEY,
      nickname    TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
      token_hash  TEXT NOT NULL UNIQUE,
      consent_at  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      best        INTEGER NOT NULL DEFAULT 0,
      best_at     TEXT,
      runs        INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS players_best ON players (best DESC, best_at);
    CREATE TABLE IF NOT EXISTS runs (
      id          TEXT PRIMARY KEY,
      player_id   INTEGER NOT NULL REFERENCES players (id) ON DELETE CASCADE,
      started_at  INTEGER NOT NULL,
      finished_at INTEGER,
      score       INTEGER,
      plausible   INTEGER
    );
    CREATE INDEX IF NOT EXISTS runs_player ON runs (player_id);
  `);
  migrate(db);
  db.exec(`
    CREATE INDEX IF NOT EXISTS runs_open ON runs (started_at) WHERE finished_at IS NULL;
    CREATE INDEX IF NOT EXISTS runs_refused ON runs (finished_at) WHERE plausible = 0;
  `);

  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const out = fn(); db.exec('COMMIT'); return out; }
    catch (e) { try { db.exec('ROLLBACK'); } catch { /* already rolled back */ } throw e; }
  }

  const q = sql => db.prepare(sql);
  const s = {
    byToken: q('SELECT id, nickname, best FROM players WHERE token_hash = ?'),
    byEmail: q('SELECT id, nickname FROM players WHERE email = ?'),
    byNick: q('SELECT id FROM players WHERE nickname = ?'),
    add: q('INSERT INTO players (nickname, email, token_hash, consent_at) VALUES (?, ?, ?, ?)'),
    token: q('UPDATE players SET token_hash = ? WHERE id = ?'),
    addRun: q('INSERT INTO runs (id, player_id, started_at) VALUES (?, ?, ?)'),
    run: q('SELECT player_id, started_at, finished_at FROM runs WHERE id = ?'),
    dropRun: q('DELETE FROM runs WHERE id = ?'),
    counted: q('UPDATE players SET runs = runs + 1 WHERE id = ?'),
    best: q('UPDATE players SET best = ?, best_at = ? WHERE id = ? AND best < ?'),
    refuse: q('UPDATE runs SET finished_at = ?, score = ?, plausible = 0 WHERE id = ?'),
    dropOpen: q('DELETE FROM runs WHERE finished_at IS NULL AND started_at < ?'),
    ranking: q('SELECT id, nickname, best, best_at FROM players WHERE best > 0 ORDER BY best DESC, best_at ASC, id ASC'),
    version: q('PRAGMA data_version'),
    ping: q('SELECT 1 AS ok'),
    // admin.js only – these include e-mails
    winners: q('SELECT nickname, email, best, best_at FROM players WHERE best > 0 ORDER BY best DESC, best_at ASC, id ASC LIMIT ?'),
    del: q('DELETE FROM players WHERE email = ?'),
    delTest: q('DELETE FROM players WHERE email LIKE ?'),
    count: q('SELECT COUNT(*) AS n FROM players'),
    stats: q(`SELECT (SELECT COUNT(*) FROM players) AS players,
                     (SELECT COUNT(*) FROM players WHERE best > 0) AS ranked,
                     (SELECT COALESCE(SUM(runs), 0) FROM players) AS runs,
                     (SELECT COUNT(*) FROM runs WHERE finished_at IS NULL AND started_at > ?) AS driving,
                     (SELECT COUNT(*) FROM runs WHERE plausible = 0) AS refused,
                     (SELECT COALESCE(MAX(best), 0) FROM players) AS best,
                     (SELECT COUNT(*) FROM players WHERE email LIKE ?) AS test`),
    flagged: q(`SELECT p.nickname, p.email, r.score, (r.finished_at - r.started_at) / 1000.0 AS seconds
                FROM runs r JOIN players p ON p.id = r.player_id WHERE r.plausible = 0 ORDER BY r.finished_at DESC LIMIT ?`),
  };
  let version = s.version.get().data_version;

  return {
    playerByTokenHash: h => s.byToken.get(h),
    playerByEmail: e => s.byEmail.get(e),
    playerByNickname: n => s.byNick.get(n),
    addPlayer: (nickname, email, tokenHash, consentAt) => s.add.run(nickname, email, tokenHash, consentAt),
    setToken: (id, tokenHash) => s.token.run(tokenHash, id),
    addRun: (id, playerId, startedAt) => s.addRun.run(id, playerId, startedAt),
    run: id => s.run.get(id),
    // a run that counted: out of runs, counted in players, maybe their new best
    // (returns true when it was – checked in the database, so never lowered)
    countRun: (id, playerId, score, at) => transaction(() => {
      s.dropRun.run(id);
      s.counted.run(playerId);
      return Number(s.best.run(score, at, playerId, score).changes) > 0;
    }),
    // a run whose score was not possible in that time: kept for admin.js flagged
    refuseRun: (id, at, score) => s.refuse.run(at, score, id),
    dropOldRuns: before => Number(s.dropOpen.run(before).changes),
    rankingRows: () => s.ranking.all(),
    // has another process (admin.js) changed the database since the last call?
    changedElsewhere() {
      const v = s.version.get().data_version, changed = v !== version;
      version = v;
      return changed;
    },
    ping: () => s.ping.get().ok === 1,
    close: () => db.close(),
    // admin.js only – these include e-mails
    winners: n => s.winners.all(n),
    deleteByEmail: e => Number(s.del.run(e.toLowerCase()).changes),
    deleteTestPlayers: () => Number(s.delTest.run(TEST_EMAILS).changes),
    count: () => s.count.get().n,
    stats: () => s.stats.get(Date.now() - 10 * 60_000, TEST_EMAILS),
    flagged: n => s.flagged.all(n),
    // a consistent copy of the whole database (safe while the server runs)
    backupTo: file => db.exec(`VACUUM INTO '${String(file).replace(/'/g, "''")}'`),
  };
}

// databases from the first version kept every finished run for ever: count the
// ones that counted into players.runs and drop them (the refused ones stay)
function migrate(db) {
  const hasRuns = () => db.prepare('PRAGMA table_info(players)').all().some(c => c.name === 'runs');
  if (hasRuns()) return;
  db.exec('BEGIN IMMEDIATE');
  try {
    if (!hasRuns()) db.exec(`
      ALTER TABLE players ADD COLUMN runs INTEGER NOT NULL DEFAULT 0;
      UPDATE players SET runs = (SELECT COUNT(*) FROM runs r WHERE r.player_id = players.id AND r.plausible = 1);
      DELETE FROM runs WHERE finished_at IS NOT NULL AND plausible = 1;
    `);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

module.exports = { openDb };

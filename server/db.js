// The SQLite database behind the leaderboard (node:sqlite, built into Node 22.13+).
//   players: one row per player – nickname and e-mail are unique (case-insensitive),
//            only a hash of the player's token is stored, best = their best score
//   runs:    every started run, timed by the server; flagged when the score was
//            not possible in that time
'use strict';
const { DatabaseSync } = require('node:sqlite');

function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;          -- safe with WAL, much faster writes
    PRAGMA busy_timeout = 5000;           -- admin.js may touch the file while the server runs
    CREATE TABLE IF NOT EXISTS players (
      id          INTEGER PRIMARY KEY,
      nickname    TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
      token_hash  TEXT NOT NULL UNIQUE,
      consent_at  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      best        INTEGER NOT NULL DEFAULT 0,
      best_at     TEXT
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
  db.exec('PRAGMA foreign_keys = ON;');
  const q = sql => db.prepare(sql);

  const s = {
    byToken: q('SELECT * FROM players WHERE token_hash = ?'),
    byEmail: q('SELECT * FROM players WHERE email = ?'),
    byNick: q('SELECT * FROM players WHERE nickname = ?'),
    add: q('INSERT INTO players (nickname, email, token_hash, consent_at) VALUES (?, ?, ?, ?)'),
    token: q('UPDATE players SET token_hash = ? WHERE id = ?'),
    best: q('UPDATE players SET best = ?, best_at = ? WHERE id = ?'),
    addRun: q('INSERT INTO runs (id, player_id, started_at) VALUES (?, ?, ?)'),
    run: q('SELECT * FROM runs WHERE id = ?'),
    finish: q('UPDATE runs SET finished_at = ?, score = ?, plausible = ? WHERE id = ?'),
    dropRuns: q('DELETE FROM runs WHERE finished_at IS NULL AND started_at < ?'),
    top: q('SELECT nickname, best FROM players WHERE best > 0 ORDER BY best DESC, best_at ASC, id ASC LIMIT ?'),
    // rank = 1 + players with a better score (or the same score reached earlier)
    rank: q(`SELECT 1 + COUNT(*) AS rank FROM players p, players me
             WHERE me.id = ? AND p.best > 0 AND (p.best > ? OR (p.best = ? AND p.best_at < me.best_at))`),
    winners: q('SELECT nickname, email, best, best_at FROM players WHERE best > 0 ORDER BY best DESC, best_at ASC, id ASC LIMIT ?'),
    del: q('DELETE FROM players WHERE email = ?'),
    count: q('SELECT COUNT(*) AS n FROM players'),
    flagged: q(`SELECT p.nickname, p.email, r.score, (r.finished_at - r.started_at) / 1000.0 AS seconds
                FROM runs r JOIN players p ON p.id = r.player_id WHERE r.plausible = 0 ORDER BY r.finished_at DESC LIMIT ?`),
  };

  return {
    playerByTokenHash: h => s.byToken.get(h),
    playerByEmail: e => s.byEmail.get(e),
    playerByNickname: n => s.byNick.get(n),
    addPlayer: (nickname, email, tokenHash, consentAt) => s.add.run(nickname, email, tokenHash, consentAt),
    setToken: (id, tokenHash) => s.token.run(tokenHash, id),
    setBest: (id, best, at) => s.best.run(best, at, id),
    addRun: (id, playerId, startedAt) => s.addRun.run(id, playerId, startedAt),
    run: id => s.run.get(id),
    finishRun: (id, at, score, plausible) => s.finish.run(at, score, plausible ? 1 : 0, id),
    dropOldRuns: before => s.dropRuns.run(before),
    top: n => s.top.all(n),
    rankOf: (best, id) => s.rank.get(id, best, best).rank,
    // admin only (admin.js) – these include e-mails
    winners: n => s.winners.all(n),
    deleteByEmail: e => s.del.run(e.toLowerCase()).changes,
    count: () => s.count.get().n,
    flagged: n => s.flagged.all(n),
    // a consistent copy of the whole database (safe while the server runs)
    backupTo: file => db.exec(`VACUUM INTO '${String(file).replace(/'/g, "''")}'`),
  };
}

module.exports = { openDb };

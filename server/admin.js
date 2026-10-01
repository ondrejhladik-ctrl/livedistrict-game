// Admin tool – run on the server, next to the database. E-mails are only
// available here, never through the web API.
//
//   node admin.js top 10              best players with e-mails (CSV) – the winners
//   node admin.js delete email@x.cz   delete a player and all their data (GDPR request)
//   node admin.js flagged 20          refused runs (score impossible in that time)
//   node admin.js count               number of registered players
//   node admin.js backup zaloha.db    copy of the database (works while the server runs)
'use strict';
const path = require('node:path');
const { openDb } = require('./db');

const db = openDb(process.env.DB_PATH || path.join(__dirname, 'leaderboard.db'));
const [cmd, arg] = process.argv.slice(2);
const csv = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);

switch (cmd) {
  case 'top': {
    console.log('rank,nickname,email,score,reached_at');
    db.winners(Number(arg) || 10).forEach((p, i) =>
      console.log([i + 1, p.nickname, p.email, p.best, p.best_at].map(csv).join(',')));
    break;
  }
  case 'delete': {
    if (!arg) { console.error('Usage: node admin.js delete email@example.com'); process.exit(1); }
    const n = db.deleteByEmail(arg);
    console.log(n ? `Deleted ${arg} and their runs.` : `No player with e-mail ${arg}.`);
    break;
  }
  case 'flagged': {
    console.log('nickname,email,score,seconds');
    db.flagged(Number(arg) || 20).forEach(r => console.log([r.nickname, r.email, r.score, r.seconds.toFixed(1)].map(csv).join(',')));
    break;
  }
  case 'backup': {
    if (!arg) { console.error('Usage: node admin.js backup zaloha.db'); process.exit(1); }
    db.backupTo(arg);
    console.log('Saved ' + arg);
    break;
  }
  case 'count':
    console.log(db.count());
    break;
  default:
    console.log('Commands: top [n] | delete <email> | flagged [n] | count | backup <file>');
}

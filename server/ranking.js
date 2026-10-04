// The leaderboard in memory: every player with a score, best first. A player's
// rank is then a binary search. (Counting the better players in the database for
// every request took 0.35 ms with 10 000 players and 8.5 ms with 100 000 – far
// too slow for thousands of game-over screens a second.)
// The database stays the source of truth: the list is loaded from it at start
// and again whenever another process (admin.js) changes it.
// Order: the better score first; the same score – who reached it first; then who
// signed up first (the same as ORDER BY best DESC, best_at, id in the database).
'use strict';

const TOP_MAX = 50;                                   // the longest top list the API gives
const ahead = (a, b) => a.best !== b.best ? a.best > b.best : a.at !== b.at ? a.at < b.at : a.id < b.id;

class Ranking {
  constructor() { this.load([]); }

  // rows: { id, nickname, best, best_at } of every player with a score
  load(rows) {
    this.list = rows.map(r => ({ id: r.id, nickname: r.nickname, best: r.best, at: r.best_at || '' }));
    for (let i = 1; i < this.list.length; i++) {      // (the database sorts them already – make sure)
      if (!ahead(this.list[i - 1], this.list[i])) { this.list.sort((a, b) => (ahead(a, b) ? -1 : 1)); break; }
    }
    this.byId = new Map(this.list.map(e => [e.id, e]));
    this.topList = null;
  }

  get size() { return this.list.length; }

  // index of the first entry that is not ahead of e (for an entry in the list: its own index)
  position(e) {
    let lo = 0, hi = this.list.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (ahead(this.list[mid], e)) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  // a player's new best score (at: ISO time it was reached)
  set(id, nickname, best, at) {
    this.remove(id);
    const e = { id, nickname, best, at: at || '' }, i = this.position(e);
    this.list.splice(i, 0, e);
    this.byId.set(id, e);
    if (i < TOP_MAX) this.topList = null;
  }

  remove(id) {
    const e = this.byId.get(id);
    if (!e) return;
    let i = this.position(e);
    if (this.list[i] !== e) i = this.list.indexOf(e);   // (cannot happen – but never remove the wrong one)
    this.list.splice(i, 1);
    this.byId.delete(id);
    if (i < TOP_MAX) this.topList = null;
  }

  // 1 = the best; null = no score yet
  rank(id) {
    const e = this.byId.get(id);
    return e ? this.position(e) + 1 : null;
  }

  // the best n (at most TOP_MAX) as { rank, nickname, score }
  top(n) {
    if (!this.topList) this.topList = this.list.slice(0, TOP_MAX).map((e, i) => ({ rank: i + 1, nickname: e.nickname, score: e.best }));
    return this.topList.slice(0, n);
  }
}

module.exports = { Ranking, TOP_MAX };

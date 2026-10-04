// Leaderboard server for Žižkov Night Run.
// Plain Node (22.13+ / 24) – no dependencies: node:http + node:sqlite.
//
//   POST /api/register            { nickname, email, consent }  → { token, nickname }
//   POST /api/runs                (Bearer token)                → { runId }
//   POST /api/runs/:id/finish     (Bearer token) { score }      → { best, rank }
//   GET  /api/leaderboard?limit=10 (Bearer token optional)      → { top: [{ rank, nickname, score }], me }
//   GET  /api/health
//
// E-mails never leave the server through the API – only nickname + score are
// public. Winners are exported on the server with admin.js.
//
// The game runs in the player's browser, so a score can be faked. The server
// therefore times every run itself and refuses scores that could not have been
// driven in that time (see MAX_METERS_PER_S).
//
// Made for thousands of players at once: everyone's rank is kept in memory
// (ranking.js), the database only does short indexed lookups and small writes,
// and a restart (an update) lets the open requests finish first.
//
// Settings (environment variables):
//   PORT             default 3000
//   HOST             default: all interfaces; 127.0.0.1 behind Caddy (see deploy/)
//   DB_PATH          default ./leaderboard.db (next to this file)
//   ALLOWED_ORIGINS  comma separated, default: the GitHub Pages site + local testing
//   TRUST_PROXY      "1" when running behind Caddy / nginx: the client's IP is taken from
//                    X-Real-IP, or else the last X-Forwarded-For entry (the one the proxy added)
//   LIMIT_REGISTER   sign-ups per IP per 10 minutes, default 300 (phone networks and event
//                    Wi-Fi put thousands of people behind one IP – keep it generous)
//   LIMIT_REQUESTS   requests per IP per minute, default 6000
//   LIMIT_RUNS       runs per player per minute, default 20
'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { openDb } = require('./db');
const { Ranking, TOP_MAX } = require('./ranking');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || undefined;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'leaderboard.db');
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://ondrejhladik-ctrl.github.io,http://localhost:8080,http://127.0.0.1:8080,null').split(',').map(s => s.trim()).filter(Boolean);
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const LIMIT_REGISTER = Number(process.env.LIMIT_REGISTER) || 300;
const LIMIT_REQUESTS = Number(process.env.LIMIT_REQUESTS) || 6000;
const LIMIT_RUNS = Number(process.env.LIMIT_RUNS) || 20;

// the game's top speed was 34 road units/s × 4 m per unit = 136 m/s (now 27.2, so
// the check is loose); the score is metres driven (+ bonuses, off at the moment).
const MAX_METERS_PER_S = 136 * 1.1, SCORE_SLACK = 100;
const MAX_SCORE = 10_000_000;
const RUN_MAX_AGE_MS = 6 * 3600 * 1000;           // unfinished runs older than this are dropped
const CHANGE_CHECK_MS = 5000;                      // how often to look whether admin.js changed the database

const db = openDb(DB_PATH);
const ranking = new Ranking();
function loadRanking(why) {
  const t = Date.now();
  ranking.load(db.rankingRows());
  console.log(`Ranking ${why}: ${ranking.size} players with a score (${Date.now() - t} ms)`);
}
loadRanking('loaded');

// ---------- helpers ----------
const now = () => Date.now();
const hash = token => crypto.createHash('sha256').update(token).digest('hex');
const NICK_RE = /^[\p{L}\p{N} _.\-]{2,16}$/u;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

function send(res, status, body, origin) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (origin) Object.assign(headers, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '7200',               // the browser asks (OPTIONS) once in 2 hours, not before every call
    'Vary': 'Origin',
  });
  res.writeHead(status, headers);
  res.end(body === null ? '' : JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > 4096) { reject(new HttpError(413, 'too_large', 'Request too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new HttpError(400, 'bad_json', 'Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function clientIp(req) {
  if (TRUST_PROXY) {
    const real = req.headers['x-real-ip'];
    if (real) return real.trim();
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return fwd.split(',').pop().trim();     // (the first entries may be made up by the client)
  }
  return req.socket.remoteAddress || '?';
}

// simple in-memory rate limits: a counter per key and time window (constant
// work per request, also for one IP shared by thousands of phone users)
const hits = new Map();                               // key → { start, count }
function limit(key, max, windowMs) {
  const t = now();
  let h = hits.get(key);
  if (!h || t - h.start >= windowMs) { h = { start: t, count: 0 }; hits.set(key, h); }
  if (++h.count > max) throw new HttpError(429, 'rate_limited', 'Too many requests, try again later');
}
setInterval(() => {                                   // forget old counters, drop abandoned runs
  const t = now();
  for (const [k, h] of hits) if (t - h.start > 15 * 60_000) hits.delete(k);
  db.dropOldRuns(t - RUN_MAX_AGE_MS);
}, 10 * 60_000).unref();
setInterval(() => {                                   // admin.js deleted a player…: read the ranking again
  if (db.changedElsewhere()) loadRanking('reloaded (the database was changed by another process)');
}, CHANGE_CHECK_MS).unref();

function playerOrNull(req) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
  return (m && db.playerByTokenHash(hash(m[1]))) || null;
}
function player(req) {
  const p = playerOrNull(req);
  if (!p) throw new HttpError(401, 'unauthorized', 'Unknown player – register again');
  return p;
}

// ---------- routes ----------
// After the last await everything runs in one go (node:sqlite is synchronous), so
// two requests of one player can never mix their reads and writes.
async function register(req) {
  limit('register:' + clientIp(req), LIMIT_REGISTER, 10 * 60_000);
  const body = await readJson(req);
  const nickname = String(body.nickname || '').trim().replace(/\s+/g, ' ');
  const email = String(body.email || '').trim().toLowerCase();
  if (!NICK_RE.test(nickname)) throw new HttpError(400, 'bad_nickname', 'Nickname: 2–16 letters, digits, space . _ -');
  if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, 'bad_email', 'Invalid e-mail');
  if (body.consent !== true) throw new HttpError(400, 'no_consent', 'Consent is required');

  const token = crypto.randomBytes(32).toString('hex');
  const byEmail = db.playerByEmail(email);
  if (byEmail) {
    // the same player on another device: e-mail + their nickname sign them in again
    if (byEmail.nickname.toLowerCase() !== nickname.toLowerCase())
      throw new HttpError(409, 'email_taken', 'This e-mail is registered with another nickname');
    db.setToken(byEmail.id, hash(token));
    return { token, nickname: byEmail.nickname };
  }
  if (db.playerByNickname(nickname)) throw new HttpError(409, 'nickname_taken', 'Nickname is taken');
  db.addPlayer(nickname, email, hash(token), new Date().toISOString());
  return { token, nickname };
}

function startRun(req) {
  const p = player(req);
  limit('run:' + p.id, LIMIT_RUNS, 60_000);
  const runId = crypto.randomBytes(16).toString('hex');
  db.addRun(runId, p.id, now());
  return { runId };
}

async function finishRun(req, runId) {
  const body = await readJson(req);
  const p = player(req);
  const score = body.score;
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) throw new HttpError(400, 'bad_score', 'Invalid score');
  const run = db.run(runId);
  if (!run || run.player_id !== p.id) throw new HttpError(404, 'no_run', 'Unknown run');
  if (run.finished_at) throw new HttpError(409, 'run_finished', 'Run already finished');
  const t = now(), seconds = (t - run.started_at) / 1000;
  if (score > seconds * MAX_METERS_PER_S + SCORE_SLACK) {
    db.refuseRun(runId, t, score);
    throw new HttpError(422, 'implausible', 'Score not possible in that time');
  }
  const at = new Date(t).toISOString();
  if (db.countRun(runId, p.id, score, at)) ranking.set(p.id, p.nickname, score, at);
  return { best: Math.max(score, p.best), rank: ranking.rank(p.id) };
}

function leaderboard(req, url) {
  const n = Math.min(TOP_MAX, Math.max(1, Math.floor(Number(url.searchParams.get('limit'))) || 10));
  const p = req.headers.authorization ? playerOrNull(req) : null;       // unknown token: just no "me"
  return { top: ranking.top(n), me: p ? { nickname: p.nickname, best: p.best, rank: ranking.rank(p.id) } : null };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : null;
  try {
    if (req.method === 'OPTIONS') return send(res, 204, null, allowed);
    limit('ip:' + clientIp(req), LIMIT_REQUESTS, 60_000);
    let url;
    try { url = new URL(req.url, 'http://x'); } catch { throw new HttpError(400, 'bad_url', 'Bad URL'); }
    const p = url.pathname;
    let out;
    if (req.method === 'GET' && p === '/api/health') out = { ok: db.ping() };
    else if (req.method === 'GET' && p === '/api/leaderboard') out = leaderboard(req, url);
    else if (req.method === 'POST' && p === '/api/register') out = await register(req);
    else if (req.method === 'POST' && p === '/api/runs') out = startRun(req);
    else if (req.method === 'POST' && /^\/api\/runs\/[a-f0-9]{32}\/finish$/.test(p)) out = await finishRun(req, p.split('/')[3]);
    else throw new HttpError(404, 'not_found', 'Not found');
    send(res, 200, out, allowed);
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    if (res.headersSent || res.destroyed) return;
    const status = e instanceof HttpError ? e.status : 500;
    send(res, status, { error: e.code || 'server_error', message: e instanceof HttpError ? e.message : 'Server error' }, allowed);
  }
});
// Idle connections stay open longer than the proxy keeps them (Caddy: 60 s), so
// it never sends a request into a connection that is just being closed. A request
// itself has to arrive quickly (slow or stuck clients are cut off).
server.keepAliveTimeout = 75_000;
server.headersTimeout = 20_000;
server.requestTimeout = 30_000;

server.listen({ port: PORT, host: HOST, backlog: 4096 }, () =>
  console.log(`Leaderboard server on ${HOST || '*'}:${server.address().port}, database ${DB_PATH}, ` +
    `proxy ${TRUST_PROXY ? 'trusted' : 'not trusted'}, limits: ${LIMIT_REQUESTS} requests/min and ` +
    `${LIMIT_REGISTER} sign-ups/10 min per IP, ${LIMIT_RUNS} runs/min per player`));

// stop (systemctl stop / restart, Ctrl+C): no new connections, the open requests
// are answered, then the database is closed cleanly
let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`${signal}: stopping…`);
  const done = () => { try { db.close(); } catch { /* closed already */ } console.log('Stopped.'); process.exit(0); };
  server.close(done);
  server.closeIdleConnections();
  setTimeout(done, 8000).unref();                     // a request still hanging after 8 s: stop anyway
}
process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));

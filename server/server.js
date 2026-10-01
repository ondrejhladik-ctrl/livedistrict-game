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
// Settings (environment variables):
//   PORT             default 3000
//   DB_PATH          default ./leaderboard.db (next to this file)
//   ALLOWED_ORIGINS  comma separated, default: the GitHub Pages site + local testing
//   TRUST_PROXY      "1" when running behind Caddy / nginx (client IP from X-Forwarded-For)
//   LIMIT_REGISTER   sign-ups per IP per 10 minutes, default 200 (phone networks put
//                    thousands of people behind one IP – keep it generous)
//   LIMIT_REQUESTS   requests per IP per minute, default 3000
'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { openDb } = require('./db');

const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://ondrejhladik-ctrl.github.io,http://localhost:8080,http://127.0.0.1:8080,null').split(',').map(s => s.trim());
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const LIMIT_REGISTER = Number(process.env.LIMIT_REGISTER) || 200;
const LIMIT_REQUESTS = Number(process.env.LIMIT_REQUESTS) || 3000;
const BOARD_CACHE_MS = 2000;                        // the top list is cached this long (thousands of game-over screens)

// the game's top speed is 34 road units/s × 4 m per unit = 136 m/s; the score is
// metres driven (+ bonuses, off at the moment). A little slack for timing.
const MAX_METERS_PER_S = 136 * 1.1, SCORE_SLACK = 100;
const MAX_SCORE = 10_000_000;
const RUN_MAX_AGE_MS = 6 * 3600 * 1000;           // unfinished runs older than this are dropped

const db = openDb(process.env.DB_PATH || path.join(__dirname, 'leaderboard.db'));

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
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return req.headers['x-forwarded-for'].split(',')[0].trim();
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
  for (const [k, h] of hits) if (t - h.start > 3600_000) hits.delete(k);
  db.dropOldRuns(t - RUN_MAX_AGE_MS);
}, 10 * 60_000).unref();

function player(req) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
  const p = m && db.playerByTokenHash(hash(m[1]));
  if (!p) throw new HttpError(401, 'unauthorized', 'Unknown player – register again');
  return p;
}

// ---------- routes ----------
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

async function startRun(req) {
  const p = player(req);
  limit('run:' + p.id, 20, 60_000);
  const runId = crypto.randomBytes(16).toString('hex');
  db.addRun(runId, p.id, now());
  return { runId };
}

async function finishRun(req, runId) {
  const p = player(req);
  const body = await readJson(req);
  const score = body.score;
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) throw new HttpError(400, 'bad_score', 'Invalid score');
  const run = db.run(runId);
  if (!run || run.player_id !== p.id) throw new HttpError(404, 'no_run', 'Unknown run');
  if (run.finished_at) throw new HttpError(409, 'run_finished', 'Run already finished');
  const t = now(), seconds = (t - run.started_at) / 1000;
  const plausible = score <= seconds * MAX_METERS_PER_S + SCORE_SLACK;
  db.finishRun(runId, t, score, plausible);
  if (!plausible) throw new HttpError(422, 'implausible', 'Score not possible in that time');
  if (score > p.best) { db.setBest(p.id, score, new Date(t).toISOString()); boardCache.clear(); }
  const best = Math.max(score, p.best);
  return { best, rank: db.rankOf(best, p.id) };
}

const boardCache = new Map();                          // limit → { at, top }
function leaderboard(req, url) {
  const n = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10));
  let cached = boardCache.get(n);
  if (!cached || now() - cached.at > BOARD_CACHE_MS) {
    cached = { at: now(), top: db.top(n).map((r, i) => ({ rank: i + 1, nickname: r.nickname, score: r.best })) };
    boardCache.set(n, cached);
  }
  const top = cached.top;
  let me = null;
  if (req.headers.authorization) {
    try {
      const p = player(req);
      me = { nickname: p.nickname, best: p.best, rank: p.best > 0 ? db.rankOf(p.best, p.id) : null };
    } catch { /* unknown token: just no "me" */ }
  }
  return { top, me };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : null;
  try {
    if (req.method === 'OPTIONS') return send(res, 204, null, allowed);
    limit('ip:' + clientIp(req), LIMIT_REQUESTS, 60_000);
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    let out;
    if (req.method === 'GET' && p === '/api/health') out = { ok: true };
    else if (req.method === 'GET' && p === '/api/leaderboard') out = leaderboard(req, url);
    else if (req.method === 'POST' && p === '/api/register') out = await register(req);
    else if (req.method === 'POST' && p === '/api/runs') out = await startRun(req);
    else if (req.method === 'POST' && /^\/api\/runs\/[a-f0-9]{32}\/finish$/.test(p)) out = await finishRun(req, p.split('/')[3]);
    else throw new HttpError(404, 'not_found', 'Not found');
    send(res, 200, out, allowed);
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    const status = e instanceof HttpError ? e.status : 500;
    send(res, status, { error: e.code || 'server_error', message: e instanceof HttpError ? e.message : 'Server error' }, allowed);
  }
});

server.listen(PORT, () => console.log(`Leaderboard server on :${PORT}`));

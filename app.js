'use strict';
const VERSION = '0.4.0';
const KEY = 'ukulele_kids_v1';

/* 頭像刻意避開弦的動物（狗、貓、魚、青蛙）和節奏動物（大象、兔子、烏龜），以免小朋友混淆 */
const ANIMALS = ['🦁', '🐼', '🐨', '🐵', '🦊', '🐯', '🐧', '🦄', '🐻', '🦉', '🐷', '🐮'];
const TINTS = ['#ffd6e0', '#d9e8ff', '#e3d9ff', '#ffe2c4', '#d5f2e3', '#fff0b3'];
const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const STICKERS = ['🌟', '🍓', '🚀', '🌈', '🍦', '🎈'];

/* 四條弦：畫面由左到右是第 4 弦到第 1 弦 */
const STRINGS = [
  { note: 'G', hz: 392.00, color: '#3d7fe0', ink: '#fff', cname: '藍色', animal: '🐶', aname: '小狗' },
  { note: 'C', hz: 261.63, color: '#2b2b2b', ink: '#fff', cname: '黑色', animal: '🐈‍⬛', aname: '黑貓' },
  { note: 'E', hz: 329.63, color: '#8fce1e', ink: '#1d2b00', cname: '綠色', animal: '🐸', aname: '青蛙' },
  { note: 'A', hz: 440.00, color: '#e5484d', ink: '#fff', cname: '紅色', animal: '🦀', aname: '螃蟹' },
];
/* 老師貼的數字貼紙（簡譜 1–6）預設位置：[弦, 格]，0 格＝不按 */
const DEFAULT_NOTES = { 1: [1, 0], 2: [1, 2], 3: [2, 0], 4: [2, 1], 5: [2, 3], 6: [3, 0] };
const OPEN = STRINGS.map(s => s.hz);
const CHORD_C = [392.00, 261.63, 329.63, 523.25];

/* 目前做好的關卡（之後的階段會繼續往後加） */
const LEVELS = [
  { icon: '🏠', name: '出發島', skill: '數字 Do Re Mi', say: '數字 Do Re Mi' },
  { icon: '🌈', name: '彩虹島', skill: 'C 和弦', say: 'C 和弦' },
  { icon: '🐘', name: '大象島', skill: 'Am 和弦（A 小和弦）', say: 'A 小和弦' },
  { icon: '☀️', name: '太陽島', skill: '換和弦：C 和 Am', say: '換和弦' },
];
const MAX_LEVEL = LEVELS.length - 1;

const $ = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dayStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ================= 資料：只存在這台裝置 ================= */
let memOnly = false;
const fresh = () => ({ v: 4, kids: [], settings: { classDay: null, minutes: 15, split: false, maxNum: 4, notes: JSON.parse(JSON.stringify(DEFAULT_NOTES)) }, meta: { createdAt: new Date().toISOString(), updatedAt: null, lastExport: null, micOk: null } });
function normalize(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.kids)) return null;
  const o = fresh(), old = !(d.v >= 4);
  o.kids = d.kids.filter(k => k && typeof k.id === 'string').slice(0, 6).map((k, i) => {
    const days = {}, stars = {};
    if (k.days && typeof k.days === 'object') for (const [dt, v] of Object.entries(k.days)) if (/^\d{4}-\d\d-\d\d$/.test(dt) && v) days[dt] = { sticker: STICKERS.includes(v.sticker) ? v.sticker : STICKERS[0], n: Math.max(1, v.n | 0) };
    if (k.stars && typeof k.stars === 'object') for (const [lv, v] of Object.entries(k.stars)) if (v && typeof v === 'object') { stars[lv] = {}; for (const [dt, n] of Object.entries(v)) if ([1, 2, 3].includes(n)) stars[lv][dt] = n; }
    return {
      id: k.id, name: String(k.name || '').slice(0, 12), animal: ANIMALS.includes(k.animal) ? k.animal : ANIMALS[i],
      tint: TINTS.includes(k.tint) ? k.tint : TINTS[i % TINTS.length], createdAt: k.createdAt || new Date().toISOString(),
      level: !old && Number.isInteger(k.level) ? Math.min(MAX_LEVEL, Math.max(0, k.level)) : 0, days, stars: old ? {} : stars,
      warm: { lv: Math.min(3, Math.max(0, (k.warm && k.warm.lv) | 0)), ok: Math.max(0, (k.warm && k.warm.ok) | 0) },
      n: Number.isInteger(k.n) && k.n >= 0 ? k.n : 0,
      rhythm: { lv: Math.min(5, Math.max(0, (k.rhythm && k.rhythm.lv) | 0)), streak: Math.max(0, (k.rhythm && k.rhythm.streak) | 0) },
      solfa: { step: Math.min(3, Math.max(0, (k.solfa && k.solfa.step) | 0)), ok: Math.max(0, (k.solfa && k.solfa.ok) | 0) },
      stage: Object.fromEntries(Object.entries(!old && k.stage && typeof k.stage === 'object' ? k.stage : {}).filter(([a, b]) => /^\d$/.test(a) && [0, 1, 2].includes(b))),
    };
  });
  const s = d.settings || {};
  o.settings.classDay = Number.isInteger(s.classDay) && s.classDay >= 0 && s.classDay <= 6 ? s.classDay : null;
  o.settings.minutes = [10, 15].includes(s.minutes) ? s.minutes : 15;
  o.settings.split = !!s.split;
  o.settings.maxNum = [4, 5, 6].includes(s.maxNum) ? s.maxNum : 4;
  for (let n = 1; n <= 6; n++) { const p = s.notes && s.notes[n]; if (Array.isArray(p) && [0, 1, 2, 3].includes(p[0]) && Number.isInteger(p[1]) && p[1] >= 0 && p[1] <= 7) o.settings.notes[n] = [p[0], p[1]]; }
  Object.assign(o.meta, d.meta && typeof d.meta === 'object' ? d.meta : {});
  return o;
}
function load() { try { return normalize(JSON.parse(localStorage.getItem(KEY))) || fresh(); } catch (e) { memOnly = true; return fresh(); } }
let DB = load();
function save() { DB.meta.updatedAt = new Date().toISOString(); try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { memOnly = true; } }
let persisted = null;
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(p => { persisted = p; }).catch(() => {});
const kidOf = id => DB.kids.find(k => k.id === id);
const threeStarDays = (k, lv) => Object.values(k.stars[lv] || {}).filter(n => n === 3).length;

/* ================= 環境 ================= */
const standalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const secure = () => window.isSecureContext;

/* ================= 聲音 ================= */
let AC = null;
function audio() { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state !== 'running') AC.resume().catch(() => {}); return AC; }
function tone(freq, t, dur, gain, type) {
  const ac = audio(), o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'triangle'; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .012); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + .05);
}
function ding(freqs, gap) { try { const t = audio().currentTime; (freqs || [784, 1047]).forEach((f, i) => tone(f, t + i * (gap === undefined ? .11 : gap), .4, .22)); } catch (e) {} }
function click(t, hi) { try { tone(hi ? 1500 : 1000, t, .05, .12, 'square'); } catch (e) {} }

/* 撥弦音色（Karplus-Strong），每個音高算一次後快取 */
const PLUCKS = {};
function pluckBuffer(freq) {
  const ac = audio(), key = Math.round(freq * 10);
  if (PLUCKS[key]) return PLUCKS[key];
  const sr = ac.sampleRate, N = Math.floor(sr * 1.4), buf = ac.createBuffer(1, N, sr), d = buf.getChannelData(0), P = Math.max(2, Math.round(sr / freq)), ring = new Float32Array(P);
  for (let i = 0; i < P; i++) ring[i] = Math.random() * 2 - 1;
  for (let i = 1; i < P; i++) ring[i] = (ring[i] + ring[i - 1]) * .5;
  for (let i = 0; i < N; i++) { const j = i % P; d[i] = ring[j]; ring[j] = (ring[j] + ring[(j + 1) % P]) * .5 * .994; }
  buf.trueHz = sr / P; /* 週期只能是整數個取樣，實際音高會差一點，播放時用速度補回來 */
  return (PLUCKS[key] = buf);
}
function pluck(freq, t, gain) {
  try {
    const ac = audio(), s = ac.createBufferSource(), g = ac.createGain();
    const t0 = t || ac.currentTime;
    s.buffer = pluckBuffer(freq); s.playbackRate.value = freq / s.buffer.trueHz;
    /* 示範音在 0.9 秒內收掉，小朋友跟著彈時，麥克風才不會還聽到 App 自己的聲音 */
    g.gain.setValueAtTime(gain === undefined ? .5 : gain, t0); g.gain.setTargetAtTime(0, t0 + .55, .08);
    s.connect(g).connect(ac.destination); s.start(t || ac.currentTime);
  } catch (e) {}
}
function strum(freqs, t, gain) { const t0 = t || audio().currentTime; freqs.forEach((f, i) => pluck(f, t0 + i * .022, gain === undefined ? .32 : gain)); }

/* ================= 語音 ================= */
let VOICE = null;
function pickVoice() { if (!('speechSynthesis' in window)) return; const v = speechSynthesis.getVoices(); VOICE = v.find(x => /zh[-_]TW/i.test(x.lang)) || v.find(x => /^zh/i.test(x.lang)) || null; }
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
let speaking = 0;
function say(text) {
  if (!('speechSynthesis' in window)) return 0;
  const est = 700 + text.length * 300;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text), id = ++speaking;
    u.lang = 'zh-TW'; if (VOICE) u.voice = VOICE; u.rate = .85; u.pitch = 1.15;
    u.onend = u.onerror = () => { if (speaking === id) speaking = 0; };
    setTimeout(() => { if (speaking === id) speaking = 0; }, est + 2500); /* iPad 有時不會回報唸完，用時間保底 */
    speechSynthesis.speak(u);
  } catch (e) { speaking = 0; }
  return est;
}
function hush() { speaking = 0; if ('speechSynthesis' in window) try { speechSynthesis.cancel(); } catch (e) {} }
function toast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); }

/* ================= 麥克風 =================
   iPad Safari 的兩個注意事項：
   1. 分析節點要接到輸出端（這裡用音量 0 的節點）才會真的收到資料。
   2. 權限視窗跳出後 AudioContext 可能被暫停，取得麥克風後要再 resume 一次。 */
let MIC = null;
const MIC_BOOST = 8;
async function micOpen() {
  if (MIC) return MIC;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const ac = audio();
  try { await ac.resume(); } catch (e) {}
  const src = ac.createMediaStreamSource(stream), an = ac.createAnalyser(), mute = ac.createGain(), boost = ac.createGain();
  an.fftSize = 2048; an.smoothingTimeConstant = 0; mute.gain.value = 0;
  boost.gain.value = MIC_BOOST; /* iPad 關掉回音消除後收音很小聲，先放大再分析 */
  src.connect(boost); boost.connect(an); an.connect(mute); mute.connect(ac.destination);
  const buf = new Float32Array(an.fftSize);
  const m = { rms: 0, peak: 0, floor: .002, gate: 0, deafUntil: 0, mutes: [], muteEnd: 0, lastHit: 0, nHits: 0, trackMuted: false, lost: false, hits: [], silentFrames: 0, frames: 0, sr: ac.sampleRate, buf, raf: 0 };
  let prev = 0;
  const tick = () => {
    if (ac.state !== 'running') ac.resume().catch(() => {});
    an.getFloatTimeDomainData(buf);
    let s = 0, any = false;
    for (let i = buf.length - 512; i < buf.length; i++) { s += buf[i] * buf[i]; if (buf[i] !== 0) any = true; }
    const rms = Math.sqrt(s / 512), now = performance.now();
    m.frames++; m.silentFrames = any ? 0 : m.silentFrames + 1;
    m.rms = rms; if (rms > m.peak) m.peak = rms;
    m.floor = rms < m.floor ? m.floor * .9 + rms * .1 : m.floor * .998 + rms * .002; /* 環境音量：往下跟得快，往上跟得慢 */
    const thr = Math.max(.006, m.floor * 3, m.gate);
    while (m.mutes.length && now > m.mutes[0][1]) m.muteEnd = m.mutes.shift()[1];
    const muted = now < m.deafUntil || (m.mutes.length && now >= m.mutes[0][0]);
    if (!muted) {
      if (rms > thr && rms > prev * 1.4 && now - m.lastHit > 230) {
        /* 剛離開靜音區就偵測到：小朋友是在節拍聲響的那一瞬間彈的，時間往前算 */
        const at = now - m.muteEnd < 45 ? m.muteEnd - 90 : now;
        m.lastHit = now; m.nHits++; m.hits.push(at); if (m.hits.length > 200) m.hits.shift();
      }
      prev = prev * .6 + rms * .4;
    }
    m.raf = requestAnimationFrame(tick);
  };
  m.pitch = () => (performance.now() > m.deafUntil && m.rms > Math.max(.004, m.floor * 2.5)) ? detectPitch(buf, m.sr) : 0;
  m.dead = () => m.frames > 40 && m.silentFrames > 40; /* 有權限卻完全沒有資料 */
  const track = stream.getAudioTracks()[0];
  if (track) { track.onmute = () => { m.trackMuted = true; }; track.onunmute = () => { m.trackMuted = false; }; track.onended = () => { m.lost = true; }; }
  m.stop = () => { cancelAnimationFrame(m.raf); stream.getTracks().forEach(t => t.stop()); try { src.disconnect(); boost.disconnect(); an.disconnect(); mute.disconnect(); } catch (e) {} };
  tick();
  MIC = m;
  return m;
}
function micStop() { if (MIC) { MIC.stop(); MIC = null; } }
const micCapable = () => secure() && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

/* ================= 圖：直的琴頸 ================= */
/* hi：要亮起來的弦（0–3）；dots：[[弦, 格]]；frets：畫幾格 */
function neckSVG(o) {
  o = o || {}; const frets = o.frets || 4, hi = o.hi, dots = o.dots || [], W = 220, top = 104, fh = 62, H = top + frets * fh + 14, xs = [35, 85, 135, 185];
  let s = `<svg class="neck" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<rect x="14" y="${top}" width="${W - 28}" height="${frets * fh}" rx="8" fill="#e9cfa3"/>`;
  s += `<rect x="10" y="${top - 8}" width="${W - 20}" height="10" rx="4" fill="#fff8e7" stroke="#3b2f2f" stroke-width="2"/>`;
  for (let f = 1; f <= frets; f++) s += `<line x1="14" x2="${W - 14}" y1="${top + f * fh}" y2="${top + f * fh}" stroke="#8a7768" stroke-width="4"/>`;
  STRINGS.forEach((st, i) => {
    const on = hi === undefined || hi === null || hi === i;
    s += `<line x1="${xs[i]}" x2="${xs[i]}" y1="${top - 48}" y2="${H - 8}" stroke="${st.color}" stroke-width="${hi === i ? 9 : 5}" opacity="${on ? 1 : .28}" stroke-linecap="round"/>`;
    s += `<text x="${xs[i]}" y="40" font-size="${hi === i ? 44 : 32}" text-anchor="middle" opacity="${on ? 1 : .3}">${st.animal}</text>`;
  });
  /* 和弦的圓點只用顏色，不寫數字：數字只留給老師的 Do Re Mi 貼紙 */
  dots.forEach(([st, f]) => { s += `<circle cx="${xs[st]}" cy="${top + (f - .5) * fh}" r="22" fill="${STRINGS[st].color}" stroke="#fff" stroke-width="5"/>`; });
  if (o.stickers) for (let n = 1; n <= 6; n++) {
    const [st, f] = DB.settings.notes[n], cy = f === 0 ? top - 30 : top + (f - .5) * fh, on = o.hiNum === n, c = STRINGS[st];
    s += `<circle cx="${xs[st]}" cy="${cy}" r="${on ? 25 : 18}" fill="${c.color}" stroke="${on ? '#ff9f1c' : '#fff'}" stroke-width="${on ? 7 : 3}" opacity="${o.hiNum && !on ? .45 : 1}"/><text x="${xs[st]}" y="${cy + (on ? 11 : 8)}" font-size="${on ? 30 : 22}" font-weight="900" text-anchor="middle" fill="${c.ink}" opacity="${o.hiNum && !on ? .45 : 1}">${n}</text>`;
  }
  return s + '</svg>';
}

/* ================= 畫面切換 ================= */
let VIEW = 'home', ARG = null, SESSION = null;
function go(v, a) {
  if (SESSION) { SESSION.alive = false; SESSION = null; }
  micStop(); hush(); cancelAnimationFrame(go.raf);
  VIEW = v; ARG = a === undefined ? null : a; render(); window.scrollTo(0, 0);
}
function render() { ({ home: vHome, kid: vKid, gate: vGate, parent: vParent, edit: vEdit, tuner: vTuner }[VIEW] || vHome)(); }

/* ---------- 首頁：選頭像 ---------- */
function vHome() {
  const needInstall = isIOS() && !standalone();
  $.innerHTML = `<div class="top"><span></span><button class="round gear" id="pg" aria-label="家長模式">⚙️</button></div>
  <div class="mid"><div class="logo">🎶🏝️</div>
  ${DB.kids.length ? `<div class="kids">${DB.kids.map(k => `<button class="kid" data-id="${k.id}" style="background:${k.tint}"><span class="face">${k.animal}</span><span class="nm">${esc(k.name)}</span></button>`).join('')}</div>`
    : `<div class="banner"><b>給家長：</b>還沒有小朋友的資料。請點右上角的 ⚙️ 進入家長模式，新增小朋友並選一個動物頭像。</div>`}
  ${needInstall ? `<div class="banner"><b>給家長：</b>請先把這個網頁加到主畫面再開始設定。<br>在 Safari 按分享按鈕 <b>⬆️</b>，選「<b>加入主畫面</b>」，之後都從主畫面的圖示打開。<br>在 Safari 裡建立的資料<b>不會</b>帶到主畫面的 App 裡。</div>` : ''}
  </div>`;
  document.getElementById('pg').onclick = () => go('gate');
  $.querySelectorAll('.kid').forEach(b => b.onclick = () => { ding(); go('kid', b.dataset.id); });
}

/* ---------- 小朋友首頁：小島、這週的貼紙、開始 ---------- */
function weekHTML(k) {
  const now = new Date(), out = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); const ds = dayStr(d), e = k.days[ds]; out.push(`<div class="${i === 0 ? 'today' : ''}">${e ? e.sticker : ''}</div>`); }
  return `<div class="week">${out.join('')}</div>`;
}
function vKid() {
  const k = kidOf(ARG); if (!k) return go('home');
  $.innerHTML = `<div class="top"><button class="round" id="bk" aria-label="回首頁">🏠</button><span></span></div>
  <div class="mid"><div class="mid2 pop">${k.animal}</div>
  <div class="isles">${LEVELS.map((l, i) => `<span class="${i === k.level ? 'cur' : i < k.level ? 'open' : ''}">${l.icon}</span>`).join('')}</div>
  <button class="play" id="st" aria-label="開始"><svg viewBox="0 0 100 100"><path d="M18 8 L92 50 L18 92 Z" fill="#fff" stroke="#fff" stroke-width="10" stroke-linejoin="round"/></svg></button>
  ${weekHTML(k)}</div>`;
  document.getElementById('bk').onclick = () => go('home');
  document.getElementById('st').onclick = () => { audio(); ding([523, 659, 784]); startSession(k.id); };
}

/* ================= 每日練習 =================
   流程：暖身 → 節奏（每次都做，各自慢慢加難）→ 今天的本領（由小島決定主題）→ 有時間才唱唱彈彈 → 貼紙 */
const CANCEL = { cancel: true }, SKIP = { skip: true };
const FRUITS = ['🖐', '🐘', '⭐', '🎵', '🎁'];
/* 每段幾回：[暖身, 節奏, 本領]，依家長設定的分鐘數；開始時還可以選少一回或多一回。唱歌看剩下的時間 */
const ROUNDS = { 15: [2, 3, 5], 10: [2, 2, 4], 7: [1, 2, 3] };
const stage = () => document.getElementById('stage');
function check(tok) { if (!tok.alive) throw CANCEL; if (tok.skip) throw SKIP; }
async function sleep(tok, ms) { const end = performance.now() + ms; for (;;) { check(tok); const left = end - performance.now(); if (left <= 0) return; await new Promise(r => setTimeout(r, Math.min(60, left))); } }
async function until(tok, fn, maxMs) { const end = performance.now() + (maxMs || 1e12); for (;;) { check(tok); const v = fn(); if (v) return v; if (performance.now() > end) return null; await new Promise(r => setTimeout(r, 40)); } }
async function tell(tok, text) { const est = say(text); if (!est) return sleep(tok, 600); await sleep(tok, 250); await until(tok, () => !speaking, est + 2500); await sleep(tok, 150); }
function show(html) { stage().innerHTML = html; }
const pick = a => a[Math.floor(Math.random() * a.length)];
const big = (e, id) => `<div class="huge"${id ? ` id="${id}"` : ''}>${e}</div>`;
function bounce(id) { const e = document.getElementById(id || 'el'); if (e) { e.classList.remove('jump'); void e.offsetWidth; e.classList.add('jump'); } }
/* 顯示一個大按鈕並等小朋友按 */
async function tapNext(tok, html, label, maxMs) {
  show(`${html}<button class="ok" id="okb" aria-label="${label || '下一步'}">▶️</button>`);
  let hit = false; document.getElementById('okb').onclick = () => { hit = true; ding([880], 0); };
  return until(tok, () => hit, maxMs);
}
function deaf(ms) { if (MIC) MIC.deafUntil = performance.now() + ms; }
const YES = '<button class="ok small" id="yes" aria-label="彈好了">👍</button>';

/* ---------- 收音指示：畫面上方一直顯示 ----------
   麥克風圖示亮起＝App 正在聽；綠色條＝收到的音量；⭕＝聽到而且是對的；❌＝聽到但不是要的音或沒對上拍子 */
let LISTEN = 0, JUDGE = null;
function judge(ok) { JUDGE = { ok, t: performance.now() }; }
function hudLoop(tok) {
  const f = () => {
    if (!tok.alive) return;
    const hud = document.getElementById('hud'), ic = document.getElementById('hic'), lv = document.getElementById('hlv'), jd = document.getElementById('hjd');
    if (hud) {
      const now = performance.now();
      if (!MIC) { ic.textContent = '🚫'; lv.style.width = '0'; hud.className = 'hud off'; }
      else {
        const paused = MIC.lost || MIC.trackMuted || MIC.dead(), hearing = LISTEN > 0 && now > MIC.deafUntil && !(MIC.mutes.length && now >= MIC.mutes[0][0]);
        ic.textContent = paused ? '⏸️' : '🎤'; hud.className = 'hud' + (paused ? ' off' : hearing ? ' on' : '');
        lv.style.width = paused ? '0' : Math.min(100, MIC.rms * 250) + '%';
      }
      const fresh = JUDGE && now - JUDGE.t < 900; jd.textContent = fresh ? (JUDGE.ok ? '⭕' : '❌') : ''; jd.className = fresh ? (JUDGE.ok ? 'jo' : 'jx') : '';
    }
    requestAnimationFrame(f);
  };
  f();
}
/* 等小朋友彈出指定的音；沒有麥克風或一直沒偵測到時，可以按 👍 通過 */
async function hearNote(tok, hz, maxMs) {
  let ok = false, streak = 0, wrong = 0, lastX = 0; const b = document.getElementById('yes'); if (b) b.onclick = () => { ok = true; };
  const h0 = MIC ? MIC.nHits : 0; /* 上一個音的餘音不算錯：要有新的一下撥弦，才會判成 ❌ */
  LISTEN++;
  try {
    return await until(tok, () => {
      if (ok) return 'tap';
      if (MIC) {
        const f = MIC.pitch();
        if (f && Math.abs(centsOff(f, hz)) < 70) { wrong = 0; if (++streak >= 2) { judge(true); return 'heard'; } }
        else if (f) { streak = 0; if (MIC.nHits > h0 && ++wrong >= 4 && performance.now() - lastX > 1200) { judge(false); lastX = performance.now(); wrong = 0; } }
      }
      return null;
    }, maxMs);
  } finally { LISTEN--; }
}
/* 依序彈出一串音。同一個音連續兩次時，要等到新的一下才算。onStep(i) 用來更新畫面。回傳彈對幾個 */
async function hearSeq(tok, hzs, onStep) {
  let good = 0;
  for (let i = 0; i < hzs.length; i++) {
    if (onStep) onStep(i);
    if (i > 0 && MIC && Math.abs(centsOff(hzs[i], hzs[i - 1])) < 50) { const c = MIC.nHits; await until(tok, () => MIC.nHits > c, 1800); }
    const r = await hearNote(tok, hzs[i], 8000);
    if (r) { good++; tone(1319, audio().currentTime, .18, .12); deaf(250); await sleep(tok, 260); }
    else { pluck(hzs[i]); deaf(950); await sleep(tok, 1200); }
  }
  if (onStep) onStep(hzs.length);
  return good;
}
/* 回數圓點 */
function setRounds(n, done) { const r = document.getElementById('rds'); if (r) r.innerHTML = n ? Array.from({ length: n }, (_, i) => `<i class="${i < done ? 'done' : i === done ? 'now' : ''}"></i>`).join('') : ''; }
const ORD = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
async function runRounds(tok, n, fn) {
  for (let i = 0; i < n; i++) {
    setRounds(n, i);
    if (MIC && MIC.lost) { micStop(); try { await micOpen(); } catch (e) {} } /* 麥克風被系統收走時，重新打開 */
    if (i > 0) { show(big('👉')); await tell(tok, i === n - 1 ? '最後一回！' : `第${ORD[i] || i + 1}回`); }
    await fn(i, n);
  }
  setRounds(n, n);
}

async function startSession(kidId) {
  if (SESSION) SESSION.alive = false;
  micStop(); hush(); LISTEN = 0; JUDGE = null;
  const tok = { alive: true, skip: false }; SESSION = tok; VIEW = 'session'; ARG = kidId;
  const k = kidOf(kidId), lv = LEVELS[k.level];
  $.innerHTML = `<div class="bar"><button class="round xs" id="quit" aria-label="離開">✖️</button><div class="fruits" id="fr">${FRUITS.map(f => `<span>${f}</span>`).join('')}</div><button class="round xs" id="skip" aria-label="跳到下一段">⏭️</button></div>
    <div class="sub"><div class="hud" id="hud"><span id="hic">🎤</span><div class="meter"><i id="hlv"></i></div><span id="hjd"></span></div><div class="rds" id="rds"></div></div><div id="stage"></div>`;
  document.getElementById('quit').onclick = () => { if (confirm('要結束今天的練習嗎？')) go('kid', kidId); };
  document.getElementById('skip').onclick = () => { tok.skip = true; };
  const mark = i => document.getElementById('fr').querySelectorAll('span').forEach((s, j) => { s.className = j < i ? 'done' : j === i ? 'now' : ''; });
  const mins = DB.settings.split ? 7 : DB.settings.minutes;
  hudLoop(tok);
  try {
    mark(-1); document.getElementById('skip').style.visibility = 'hidden';
    /* 一開始先選今天的份量 */
    let adj = null;
    show(`<div class="mid2">${k.animal}</div><div class="choice"><button data-a="-1"><span>🐢</span><small>少一回</small></button><button data-a="0"><span>🙂</span><small>正常</small></button><button data-a="1"><span>🚀</span><small>多一回</small></button></div>
      <p class="hint">給家長：每一段的回數。前三段做完還有時間，才會進入唱唱彈彈。<br>上方的 🎤 是收音指示：綠色條是收到的音量，⭕ 是聽到而且彈對，❌ 是聽到但不對。</p>`);
    stage().querySelectorAll('[data-a]').forEach(b => b.onclick = () => { adj = +b.dataset.a; audio(); ding(); });
    if (micCapable()) micOpen().then(() => { DB.meta.micOk = true; save(); }).catch(() => { DB.meta.micOk = false; save(); });
    say(`嗨，${k.name || '小朋友'}！今天想練多少？選一個吧！`);
    await until(tok, () => adj !== null);
    const counts = ROUNDS[mins].map(n => Math.max(1, n + adj));
    const t0 = performance.now(), budget = mins * 60000;
    document.getElementById('skip').style.visibility = '';
    if (MIC && MIC.dead()) { await tapNext(tok, big('👆'), '按一下', 15000); audio(); await sleep(tok, 400); }
    /* 預告今天的內容 */
    show(`<div class="plan">${FRUITS.map((f, i) => `<span id="p${i}">${i === 2 ? lv.icon : f}</span>`).join('')}</div>`);
    const lit = i => { const e = document.getElementById('p' + i); if (e) e.classList.add('on'); };
    lit(0); await tell(tok, '今天先暖身，'); lit(1); await tell(tok, '再跟大象玩節奏，'); lit(2); await tell(tok, `然後是今天的本領，${lv.say}。`); lit(3); await tell(tok, '有時間的話，再來唱唱彈彈，'); lit(4); await tell(tok, '最後選貼紙。拿好你的烏克麗麗，開始囉！');
    const segs = [segWarm, segBeat, segSkill];
    for (let i = 0; i < segs.length; i++) {
      mark(i); tok.skip = false; setRounds(0, 0);
      try { await segs[i](tok, k, counts[i]); } catch (e) { if (e !== SKIP) throw e; hush(); if (MIC) MIC.mutes = []; LISTEN = 0; }
    }
    /* 前三段做完還有時間，才唱唱彈彈；一直唱到時間用完 */
    tok.skip = false; tok.sang = 0; setRounds(0, 0);
    if (budget - (performance.now() - t0) > 30000) {
      mark(3);
      try { await segSong(tok, k, () => performance.now() - t0 >= budget); } catch (e) { if (e !== SKIP) throw e; hush(); if (MIC) MIC.mutes = []; LISTEN = 0; }
    }
    mark(4); tok.skip = false; setRounds(0, 0);
    k.n++; save();
    await segSticker(tok, k);
    if (tok.alive) go('kid', kidId);
  } catch (e) { if (e !== CANCEL) { console.error(e); if (tok.alive) go('kid', kidId); } }
}

/* ---------- 共用的小活動 ---------- */
async function strumCount(tok, n, html) {
  show(`${html}<div class="dots">${Array.from({ length: n }, (_, i) => `<div class="dot" id="d${i}"></div>`).join('')}</div>${YES}`);
  let got = 0, tapped = false; document.getElementById('yes').onclick = () => { tapped = true; };
  if (MIC) MIC.hits.length = 0; deaf(300); LISTEN++;
  try {
    await until(tok, () => {
      if (tapped) return true;
      if (MIC) while (got < n && MIC.hits.length > got) { const d = document.getElementById('d' + got); if (d) { d.classList.add('on'); d.textContent = '🎵'; } judge(true); tone(660 + got * 60, audio().currentTime, .15, .1); got++; }
      return got >= n;
    }, 20000);
  } finally { LISTEN--; }
  ding(); await sleep(tok, 700);
}
const sName = i => `${STRINGS[i].cname}的${STRINGS[i].aname}弦`;
/* 找弦：count 題；blind＝不給顏色，只聽聲音。回傳是否全部答對 */
async function findStrings(tok, count, blind) {
  let last = -1, good = 0;
  for (let n = 0; n < count; n++) {
    let i; do { i = Math.floor(Math.random() * 4); } while (i === last); last = i;
    const st = STRINGS[i];
    show(`<div class="mid2" id="an">${blind ? '❓' : st.animal}</div>${neckSVG({ hi: blind ? undefined : i, frets: 2 })}${YES}`);
    if (blind) await tell(tok, '聽聽看，是哪一條？'); else await tell(tok, `${st.aname}弦`);
    let got = null;
    for (let t = 0; t < 2 && !got; t++) { pluck(st.hz); deaf(950); got = await hearNote(tok, st.hz, 7000); if (!got && t === 0) await tell(tok, '再聽一次'); }
    show(`<div class="mid2 pop">${got ? '🎉' : st.animal}</div>${neckSVG({ hi: i, frets: 2 })}`);
    if (got) { good++; ding(); } else await tell(tok, `是${st.aname}弦`);
    await sleep(tok, 800);
  }
  return good === count;
}
/* 回聲：App 先撥幾條弦，小朋友照順序撥。回傳是否全部答對 */
async function echoStrings(tok, len, order) {
  const seq = order || []; if (!order) for (let j = 0; j < len; j++) { let i; do { i = Math.floor(Math.random() * 4); } while (j > 0 && i === seq[j - 1]); seq.push(i); }
  const row = on => `<div class="seq">${seq.map((s, j) => `<span class="${j < on ? 'done' : j === on ? 'now' : ''}">${STRINGS[s].animal}</span>`).join('')}</div>`;
  show(`${big('👂')}${row(-1)}`); await tell(tok, '先聽我彈。');
  deaf(seq.length * 800 + 600);
  for (let j = 0; j < seq.length; j++) { show(`${row(j)}${neckSVG({ hi: seq[j], frets: 2 })}`); pluck(STRINGS[seq[j]].hz); await sleep(tok, 800); }
  await sleep(tok, 500); await tell(tok, '換你！');
  const good = await hearSeq(tok, seq.map(s => STRINGS[s].hz), j => { if (j < seq.length) show(`${row(j)}${neckSVG({ hi: seq[j], frets: 2 })}${YES}`); });
  show(`${big(good === seq.length ? '🎉' : '👍')}${row(seq.length)}`); ding(); await sleep(tok, 900);
  return good === seq.length;
}

/* ---------- 1. 暖身：三種輪流，難度自己慢慢往上 ---------- */
const HAND_GAMES = [
  { say: '數手指！一、二、三、四、五！', frames: ['☝️', '✌️', '🤟', '🖖', '🖐'], ms: 900, reps: 2 },
  { say: '握緊拳頭，再用力張開！握緊，張開！', frames: ['✊', '🖐'], ms: 1000, reps: 4 },
  { say: '兩隻手甩一甩，把手指甩鬆鬆！', frames: ['👋', '🙌'], ms: 500, reps: 6 },
  { say: '大拇指碰碰每一根手指：食指、中指、無名指、小指！', frames: ['👌', '🤏', '🤌', '👌'], ms: 1100, reps: 2 },
  { say: '手指在腿上彈鋼琴，叮叮咚咚！', frames: ['🎹', '🖐', '🎹', '🤚'], ms: 600, reps: 4 },
];
const WARM_NAMES = ['看顏色找弦、回聲 2 個音', '最後一回只聽聲音、回聲 3 個音', '全部只聽聲音、回聲 3 個音', '只聽聲音、回聲 4 個音'];
async function handGame(tok, g) {
  show(big(g.frames[0], 'el')); say(g.say); await sleep(tok, 600);
  for (let r = 0; r < g.reps; r++) for (const f of g.frames) { const e = document.getElementById('el'); if (e) e.textContent = f; bounce(); await sleep(tok, g.ms); }
  await until(tok, () => !speaking, 4000);
}
async function segWarm(tok, k, n) {
  const kind = k.n % 3, w = k.warm.lv, start = k.n % HAND_GAMES.length; let all = true;
  if (kind === 0) { await tell(tok, '先讓手指暖身！'); await runRounds(tok, Math.max(2, n), i => handGame(tok, HAND_GAMES[(start + i) % HAND_GAMES.length])); return; }
  await handGame(tok, HAND_GAMES[start]);
  if (kind === 1) { await tell(tok, '找找看，是哪一條弦？聽到聲音，就撥那一條！'); await runRounds(tok, n, async (i, m) => { if (!await findStrings(tok, w >= 3 ? 3 : 2, w >= 2 || (w >= 1 && i === m - 1))) all = false; }); }
  else { await tell(tok, '回聲遊戲！我彈什麼，你就彈什麼。'); await runRounds(tok, n, async () => { if (!await echoStrings(tok, 2 + (w >= 1) + (w >= 3))) all = false; }); }
  /* 全部答對累積兩次，暖身就升一級 */
  if (all) { k.warm.ok++; if (k.warm.ok >= 2 && w < 3) { k.warm.lv++; k.warm.ok = 0; show(`${big('🖐')}<div class="stars3">🎉</div>`); ding([523, 659, 784, 1047, 1319]); await tell(tok, '暖身升級了！下次會難一點點喔！'); } }
  save();
}

/* ---------- 2. 節奏：六個階梯，自動升級 ---------- */
/* on：一小節（4 拍）裡要彈的位置；echo＝App 先拍、小朋友照著拍 */
const RHYTHMS = [
  { name: '大象拍（慢）', icon: '🐘', bpm: 60, pats: [[0, 1, 2, 3]], say: '大象跳一下，你就一下。' },
  { name: '大象拍（快一點）', icon: '🐘', bpm: [72, 84], pats: [[0, 1, 2, 3]], say: '大象走快一點囉！' },
  { name: '停一拍', icon: '🙊', bpm: 66, pats: [[0, 1, 2], [0, 1, 3], [0, 2, 3]], say: '看到小猴子摀嘴巴，那一拍要停，不要出聲。' },
  { name: '烏龜拍', icon: '🐢', bpm: 66, pats: [[0, 2]], say: '烏龜走很慢，兩拍才一下。' },
  { name: '模仿節奏', icon: '👂', bpm: 66, echo: true, pats: [[0, 1, 3], [0, 2, 3], [0, 1, 2], [0, 2]], say: '先聽我拍一次，再換你拍一樣的。' },
  { name: '兔子拍', icon: '🐰', bpm: 60, pats: [[0, .5, 1, 1.5, 2, 2.5, 3, 3.5]], say: '兔子跳很快，一拍跳兩下：下、上、下、上。' },
];
function clap(t) { try { const ac = audio(), N = Math.floor(ac.sampleRate * .05), b = ac.createBuffer(1, N, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < N; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (N / 5)); const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; g.gain.value = .5; s.connect(g).connect(ac.destination); s.start(t); } catch (e) {} }
const patStrip = (on, icon) => `<div class="strip">${on.some(x => x % 1) ? [0, 1, 2, 3].map(() => `<span>${icon}${icon}</span>`).join('') : [0, 1, 2, 3].map(b => `<span>${on.includes(b) ? icon === '🙊' || icon === '👂' ? '🐘' : icon : icon === '🐢' ? '➖' : '🙊'}</span>`).join('')}</div>`;
/* 回傳 1–3 顆星。o：{bpm, on, icon, echo, bars, action, cards}；cards＝每一小節要按的和弦，會顯示圖卡 */
async function beatRound(tok, o) {
  const bpm = o.bpm || 66, spb = 60 / bpm, ac = audio(), on = o.on || [0, 1, 2, 3];
  const bars = o.echo ? ['app', 'kid', 'app', 'kid'] : Array(o.cards ? o.cards.length : o.bars || 2).fill('kid'), beats = bars.length * 4;
  const top = o.cards ? `<div id="bc">${chordCard(CHORDS[o.cards[0]], false, 3)}</div>` : `<div class="mid2" id="el">${o.icon || '🐘'}</div>${patStrip(on, o.icon || '🐘')}`;
  show(`${top}<div class="count" id="cnt"></div><div class="beats" id="bt">${bars.map(w => [0, 1, 2, 3].map(() => `<i class="${w === 'app' ? 'app' : ''}"></i>`).join('')).join('')}</div>${o.action && !o.cards ? `<div class="mid2">${o.action}</div>` : ''}`);
  const t0 = ac.currentTime + .35, p0 = performance.now() + 350, want = [];
  for (let i = 0; i < 4; i++) click(t0 + i * spb, true);
  for (let i = 0; i < beats; i++) click(t0 + (4 + i) * spb, false);
  const mutes = []; for (let i = 0; i < 4 + beats; i++) { const bt = p0 + i * spb * 1000; mutes.push([bt - 20, bt + 150]); }
  bars.forEach((w, bi) => on.forEach(x => {
    const beat = 4 + bi * 4 + x;
    if (w === 'app') { clap(t0 + beat * spb); const pt = p0 + beat * spb * 1000; mutes.push([pt - 20, pt + 170]); } else want.push(p0 + beat * spb * 1000);
  }));
  /* 節拍聲和示範聲會從喇叭傳進麥克風，所以每一聲前後短暫不聽 */
  if (MIC) { MIC.gate = 0; MIC.mutes = mutes.sort((a, b) => a[0] - b[0]); }
  const gap = on.length > 1 ? Math.min(...on.slice(1).map((x, j) => x - on[j])) : 4, win = Math.min(320, gap * spb * 1000 * .42);
  const inTime = h => want.some(w => Math.abs(h - (w + 50)) < win);
  /* 每聽到一下，就在收音指示顯示有沒有對上拍子 */
  let seen = MIC ? MIC.nHits : 0;
  const watch = setInterval(() => { if (MIC && MIC.nHits > seen) { seen = MIC.nHits; const h = MIC.hits[MIC.hits.length - 1]; if (h > p0 + 3.5 * spb * 1000) judge(inTime(h)); } }, 50);
  try {
    for (let i = 0; i < 4; i++) { await sleep(tok, p0 + i * spb * 1000 - performance.now()); const c = document.getElementById('cnt'); if (c) c.textContent = i + 1; }
    await sleep(tok, p0 + 3.5 * spb * 1000 - performance.now());
    if (MIC) MIC.hits.length = 0; LISTEN++;
    const dots = document.getElementById('bt').children;
    for (let i = 0; i < beats; i++) {
      await sleep(tok, p0 + (4 + i) * spb * 1000 - performance.now());
      const c = document.getElementById('cnt'); if (c) c.textContent = '';
      const bi = Math.floor(i / 4), e = document.getElementById('el');
      if (e && o.echo) e.textContent = bars[bi] === 'app' ? '👂' : '👏';
      else if (e) e.textContent = on.includes(i % 4) || on.some(x => x % 1) ? (o.icon === '🙊' ? '🐘' : o.icon || '🐘') : o.icon === '🐢' ? '➖' : '🙊';
      /* 換和弦：在上一小節的最後一拍就先換圖卡，讓小朋友來得及準備 */
      if (o.cards && i % 4 === 3 && bi + 1 < bars.length && o.cards[bi + 1] !== o.cards[bi]) { const bc = document.getElementById('bc'); if (bc) { bc.innerHTML = chordCard(CHORDS[o.cards[bi + 1]], false, 3); bc.classList.remove('pop'); void bc.offsetWidth; bc.classList.add('pop'); } }
      bounce(o.cards ? 'bc' : 'el'); if (dots[i]) dots[i].classList.add('on');
    }
    await sleep(tok, spb * 700);
  } finally { clearInterval(watch); LISTEN = Math.max(0, LISTEN - 1); }
  let hit = 0;
  /* 5 歲小朋友的標準放寬：前後約 0.3 秒內都算跟上，跟上一半就是三顆星 */
  if (MIC) { want.forEach(w => { if (MIC.hits.some(h => Math.abs(h - (w + 50)) < win)) hit++; }); MIC.mutes = []; }
  const stars = !MIC ? 3 : hit >= want.length * .5 ? 3 : hit >= want.length * .25 ? 2 : 1;
  show(`${big(o.icon || '🐘')}<div class="stars3 pop">${'⭐'.repeat(stars)}</div>`);
  ding(stars === 3 ? [523, 659, 784, 1047] : [659, 784]);
  await sleep(tok, 1500);
  return stars;
}
async function rhythmRound(tok, k, lvIdx, strumming) {
  const r = RHYTHMS[lvIdx], bpm = Array.isArray(r.bpm) ? pick(r.bpm) : r.bpm;
  show(`${big(r.icon)}<div class="mid2">${strumming ? '🎸' : '👏'}</div>`);
  await tell(tok, `${r.say}${strumming ? '這次用刷琴的。' : '這次用拍手的。'}`);
  return beatRound(tok, { bpm, on: pick(r.pats), icon: r.icon, echo: r.echo, action: strumming ? '🎸' : '👏' });
}
async function segBeat(tok, k, n) {
  const top = k.rhythm.lv; let ups = 0;
  await tell(tok, '節奏時間！聽到四聲之後才開始喔。');
  await runRounds(tok, n, async i => {
    /* 大多練目前的階梯，偶爾回頭玩舊的；拍手和刷琴輪流 */
    const lvIdx = top > 0 && i > 0 && (i === n - 1 || Math.random() < .3) ? Math.floor(Math.random() * top) : top;
    const stars = await rhythmRound(tok, k, lvIdx, i % 2 === 1);
    if (lvIdx === top && stars === 3 && ups < 2) { ups++; k.rhythm.streak++; }
  });
  if (k.rhythm.streak >= 4 && k.rhythm.lv < RHYTHMS.length - 1) {
    k.rhythm.lv++; k.rhythm.streak = 0;
    show(`${big(RHYTHMS[k.rhythm.lv].icon)}<div class="stars3">🎉</div>`); ding([523, 659, 784, 1047, 1319]); await tell(tok, '節奏升級了！明天有新的節奏喔！');
  }
  save();
}

/* ---------- 數字 Do Re Mi（老師貼的貼紙） ---------- */
const SOLFA = ['', '兜', '瑞', '咪', '發', '搜', '啦'], NUM_ZH = ['', '一', '二', '三', '四', '五', '六'];
const noteHz = n => { const [s, f] = DB.settings.notes[n]; return STRINGS[s].hz * Math.pow(2, f / 12); };
const numBadge = (n, cls) => { const st = STRINGS[DB.settings.notes[n][0]]; return `<span class="num ${cls || ''}" style="background:${st.color};color:${st.ink}">${n}</span>`; };
const maxNum = () => DB.settings.maxNum;
const upTo = sets => sets.filter(s => Math.max(...s) <= maxNum());
/* 四種玩法各自的題目；只會出現老師已經教過的數字 */
const NUM_SETS = [
  [[1, 2], [3, 4], [1, 3], [2, 4], [1, 2, 3, 4], [3, 4, 5], [1, 5], [4, 5, 6], [1, 6]],
  [[1, 2, 3], [3, 2, 1], [1, 2, 3, 4], [4, 3, 2, 1], [1, 3, 2, 4], [1, 2, 3, 4, 5], [5, 4, 3, 2, 1], [1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1]],
  [[1, 3], [2, 4], [1, 4], [1, 2, 3], [3, 5], [1, 5], [1, 6], [5, 6]],
  [[3, 2, 1, 2, 3, 3, 3], [3, 2, 1, 3, 2, 1], [1, 2, 3, 1, 1, 2, 3, 1], [1, 1, 2, 2, 3, 3, 4], [4, 3, 2, 1, 2, 3, 4], [5, 3, 3, 4, 2, 2], [1, 2, 3, 4, 5, 5, 5], [1, 1, 5, 5, 6, 6, 5], [4, 4, 3, 3, 2, 2, 1]],
];
const NUM_PLAY = ['認識數字', '爬樓梯', '聽音猜數字', '小旋律'];
async function solfaRound(tok, step, nums) {
  const row = on => `<div class="seq">${nums.map((n, j) => numBadge(n, j < on ? 'done' : j === on ? 'now' : '')).join('')}</div>`;
  const neck = n => neckSVG({ stickers: true, hiNum: n, frets: 3 });
  if (step === 0) { /* 一個一個認識 */
    let good = 0;
    for (const n of nums) {
      show(`<div class="seq">${numBadge(n, 'now big')}</div>${neck(n)}${YES}`);
      await tell(tok, `${NUM_ZH[n]}，${SOLFA[n]}。`); pluck(noteHz(n)); deaf(950); await sleep(tok, 1100);
      await tell(tok, '找到這個數字的貼紙，撥撥看！');
      if (await hearNote(tok, noteHz(n), 9000)) { good++; ding(); await sleep(tok, 600); }
    }
    return good === nums.length;
  }
  if (step === 2) { /* 只聽聲音猜 */
    let good = 0;
    for (const n of nums) {
      show(`<div class="seq"><span class="num now big" style="background:#bbb;color:#fff">？</span></div>${neck(0)}${YES}`);
      await tell(tok, '聽聽看，這是哪一個數字？'); let got = null;
      for (let t = 0; t < 2 && !got; t++) { pluck(noteHz(n)); deaf(950); got = await hearNote(tok, noteHz(n), 7000); if (!got && t === 0) await tell(tok, '再聽一次'); }
      show(`<div class="seq">${numBadge(n, 'now big')}</div>${neck(n)}`); if (got) { good++; ding(); }
      await tell(tok, `是${NUM_ZH[n]}，${SOLFA[n]}。`);
    }
    return good === nums.length;
  }
  /* 爬樓梯、小旋律：先聽一次，再照著彈 */
  show(`${big('👂')}${row(-1)}`); await tell(tok, step === 1 ? '先聽我彈，一個一個照順序。' : '先聽我彈這一句。');
  deaf(nums.length * 650 + 600);
  for (let j = 0; j < nums.length; j++) { show(`${row(j)}${neck(nums[j])}`); pluck(noteHz(nums[j])); await sleep(tok, 650); }
  await sleep(tok, 500); await tell(tok, '換你！');
  const good = await hearSeq(tok, nums.map(noteHz), j => { if (j < nums.length) show(`${row(j)}${neck(nums[j])}${YES}`); });
  show(`${big(good === nums.length ? '🎉' : '👍')}${row(nums.length)}`); ding(); await sleep(tok, 900);
  return good === nums.length;
}
/* 產生一回數字練習：step＝玩法，seed 用來每天換題目 */
const numRound = (step, seed) => async tok => { const sets = upTo(NUM_SETS[step]); await solfaRound(tok, step, sets[seed % sets.length]); };

/* ---------- 和弦 ---------- */
const CHORDS = {
  C: { name: 'C 和弦', icon: '🌈', dots: [[3, 3]], freqs: [392.00, 261.63, 329.63, 523.25], s: 3, hz: 523.25, open: 440.00, how: '用無名指，按住紅色螃蟹弦的第三格' },
  Am: { name: 'A 小和弦', icon: '🐘', dots: [[0, 2]], freqs: [440.00, 261.63, 329.63, 440.00], s: 0, hz: 440.00, open: 392.00, how: '用中指，按住藍色小狗弦的第二格' },
};
const chordCard = (ch, hide, frets) => `<div class="mid2">${ch.icon}</div>${hide ? '<div class="huge">🙈</div>' : neckSVG({ dots: ch.dots, frets: frets || 4 })}`;
const T = {
  intro: ch => async tok => { show(chordCard(ch)); await tell(tok, `今天學${ch.name}。聽聽看它的聲音。`); strum(ch.freqs); await sleep(tok, 1500); say(`${ch.how}。按在格子裡面，靠近下面那條線。`); await tapNext(tok, chordCard(ch), '按好了', 40000); },
  press: (ch, hide) => async tok => {
    show(chordCard(ch, hide) + YES); await tell(tok, `${hide ? '不看圖卡，' : ''}按好${ch.name}，撥一下${sName(ch.s)}，聽聽看。`);
    if (await hearNote(tok, ch.hz, 9000)) { ding(); await sleep(tok, 500); } else { show(chordCard(ch)); await tell(tok, `${ch.how}，再用力一點。`); }
  },
  onOff: (ch, times) => async tok => {
    await tell(tok, '按下去，放開，按下去，放開。看到圓點就按，圓點不見就放開。每次都撥一下。');
    for (let i = 0; i < times * 2; i++) {
      const press = i % 2 === 0;
      show(`<div class="mid2">${press ? ch.icon : '👐'}</div>${neckSVG({ dots: press ? ch.dots : [], hi: press ? undefined : ch.s })}${YES}`);
      if (await hearNote(tok, press ? ch.hz : ch.open, 7000)) { tone(1319, audio().currentTime, .18, .12); deaf(250); await sleep(tok, 350); }
    }
    ding();
  },
  beat: (ch, bpm, bars) => async tok => { show(chordCard(ch)); await tell(tok, `按好${ch.name}，跟著拍子刷。`); await beatRound(tok, { bpm, cards: Array(bars || 1).fill(ch === CHORDS.C ? 'C' : 'Am'), icon: ch.icon }); },
  shake: ch => async tok => { show(big('👋')); await tell(tok, '手放開，甩一甩。'); await T.press(ch)(tok); },
  /* 換和弦：一個一個確認 */
  swap: times => async tok => {
    await tell(tok, '換和弦練習。看圖卡，換一個和弦，撥一下。慢慢來沒關係。');
    for (let i = 0; i < times * 2; i++) { const ch = i % 2 ? CHORDS.Am : CHORDS.C; show(chordCard(ch) + YES); if (await hearNote(tok, ch.hz, 9000)) { tone(1319, audio().currentTime, .18, .12); deaf(250); await sleep(tok, 350); } }
    ding();
  },
  swapBeat: (bpm, cards) => async tok => { show(chordCard(CHORDS[cards[0]])); await tell(tok, '跟著拍子刷。圖卡換了，和弦就要跟著換。'); await beatRound(tok, { bpm, cards, icon: '☀️' }); },
};
const chordIsland = ch => [
  [T.intro(ch), T.press(ch), T.press(ch), T.beat(ch, 60, 1), T.shake(ch)],
  [T.onOff(ch, 2), T.beat(ch, 60, 1), T.onOff(ch, 3), T.beat(ch, 60, 2), T.press(ch)],
  [T.press(ch, true), T.onOff(ch, 3), T.beat(ch, 72, 2), T.press(ch, true), T.beat(ch, 84, 2)],
];
/* 每座島三個階段（學、練、挑戰），每個階段是一串「回」；回數比較多時從頭輪。seed 讓題目每天不同 */
const ISLANDS = [
  /* 0 出發島：數字 Do Re Mi */
  seed => [
    [numRound(0, seed), numRound(0, seed + 1), numRound(1, seed), numRound(0, seed + 2), numRound(1, seed + 2)],
    [numRound(1, seed), numRound(2, seed), numRound(1, seed + 1), numRound(3, seed), numRound(2, seed + 1)],
    [numRound(3, seed), numRound(2, seed + 2), numRound(3, seed + 1), numRound(1, seed + 3), numRound(3, seed + 2)],
  ],
  /* 1 彩虹島：C 和弦 */
  () => chordIsland(CHORDS.C),
  /* 2 大象島：Am 和弦 */
  () => chordIsland(CHORDS.Am),
  /* 3 太陽島：C 和 Am 互換 */
  () => [
    [T.press(CHORDS.C), T.press(CHORDS.Am), T.swap(2), T.swapBeat(60, ['C', 'C', 'Am', 'Am']), T.swap(2)],
    [T.swap(3), T.swapBeat(60, ['C', 'C', 'Am', 'Am']), T.swapBeat(66, ['C', 'Am', 'C', 'Am']), T.swap(3), T.swapBeat(66, ['Am', 'Am', 'C', 'C'])],
    [T.swapBeat(72, ['C', 'Am', 'C', 'Am']), T.press(CHORDS.Am, true), T.swapBeat(80, ['C', 'Am', 'C', 'Am']), T.press(CHORDS.C, true), T.swapBeat(72, ['Am', 'C', 'Am', 'C'])],
  ],
];
const STAGE_NAMES = ['學', '練', '挑戰'];
async function segSkill(tok, k, n) {
  const lv = LEVELS[k.level], st = Math.min(2, k.stage[k.level] || 0), list = ISLANDS[k.level](k.n)[st];
  /* 到了和弦的小島，先用一到兩回複習數字，再進今天的主題 */
  const review = k.level === 0 ? 0 : n >= 4 ? 2 : 1, main = Math.max(1, n - review);
  if (review) { show(big('🔢')); await tell(tok, '先複習數字 Do Re Mi。'); }
  else { show(big(lv.icon)); ding([659, 784, 988]); await tell(tok, `今天的本領：${lv.say}！`); }
  await runRounds(tok, review + main, async i => {
    if (i < review) return numRound([1, 3, 2][(k.n + i) % 3], k.n + i)(tok);
    if (review && i === review) { show(big(lv.icon)); ding([659, 784, 988]); await tell(tok, `今天的本領：${lv.say}！`); }
    const j = i - review;
    /* 大象島以後，每三次練習有一次用最後一回複習上一座島的和弦 */
    if (k.level >= 2 && k.n % 3 === 2 && j === main - 1 && main > 1) { show(big(LEVELS[k.level - 1].icon)); await tell(tok, `回去${LEVELS[k.level - 1].name}玩一下！`); return pick(ISLANDS[k.level - 1](k.n)[1])(tok); }
    return list[j % list.length](tok);
  });
}

/* ---------- 4. 唱唱彈彈：有時間才進來 ---------- */
/* 出發島：數字歌，[數字, 拍數]；max＝這首歌用到的最大數字 */
const NUM_SONGS = [
  { name: '瑪莉有隻小綿羊', icon: '🐑', max: 3, notes: [[3, 1], [2, 1], [1, 1], [2, 1], [3, 1], [3, 1], [3, 2], [2, 1], [2, 1], [2, 2], [3, 1], [3, 1], [3, 2]] },
  { name: '熱十字麵包', icon: '🥐', max: 3, notes: [[3, 1], [2, 1], [1, 2], [3, 1], [2, 1], [1, 2], [1, 1], [1, 1], [2, 1], [2, 1], [3, 1], [2, 1], [1, 2]] },
  { name: '樓梯歌', icon: '🪜', max: 4, notes: [[1, 1], [2, 1], [3, 1], [4, 1], [4, 1], [3, 1], [2, 1], [1, 1], [1, 1], [3, 1], [2, 1], [4, 1], [3, 1], [2, 1], [1, 2]] },
  { name: '兩隻老虎', icon: '🐯', max: 5, notes: [[1, 1], [2, 1], [3, 1], [1, 1], [1, 1], [2, 1], [3, 1], [1, 1], [3, 1], [4, 1], [5, 2], [3, 1], [4, 1], [5, 2]] },
  { name: '小蜜蜂', icon: '🐝', max: 5, notes: [[5, 1], [3, 1], [3, 2], [4, 1], [2, 1], [2, 2], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [5, 1], [5, 2]] },
  { name: '小星星', icon: '⭐', max: 6, notes: [[1, 1], [1, 1], [5, 1], [5, 1], [6, 1], [6, 1], [5, 2], [4, 1], [4, 1], [3, 1], [3, 1], [2, 1], [2, 1], [1, 2]] },
];
/* 數字歌：先聽 App 彈一次，再跟著亮起來的數字自己彈 */
async function numberSong(tok, song) {
  const bpm = 54, spb = 60 / bpm, ac = audio(), starts = []; let b = 0; for (const [, len] of song.notes) { starts.push(b); b += len; } const total = b;
  const got = song.notes.map(() => false);
  const row = on => `<div class="seq small">${song.notes.map(([n], j) => numBadge(n, j === on ? 'now' : got[j] ? 'done' : j < on ? 'past' : '')).join('')}</div>`;
  const draw = on => show(`${row(on)}${on >= 0 && on < song.notes.length ? neckSVG({ stickers: true, hiNum: song.notes[on][0], frets: 3 }) : big(song.icon)}`);
  draw(-1); await tell(tok, `${song.name}。先聽我彈一次，看數字。`);
  deaf(total * spb * 1000 + 800); let p0 = performance.now() + 300, t0 = ac.currentTime + .3;
  song.notes.forEach(([n], j) => pluck(noteHz(n), t0 + starts[j] * spb));
  for (let j = 0; j < song.notes.length; j++) { await sleep(tok, p0 + starts[j] * spb * 1000 - performance.now()); draw(j); }
  await sleep(tok, song.notes[song.notes.length - 1][1] * spb * 1000);
  draw(-1); await tell(tok, '換你！聽到四聲之後，跟著亮起來的數字彈。');
  show(`${row(-1)}<div class="count" id="cnt"></div>`);
  p0 = performance.now() + 350; t0 = ac.currentTime + .35;
  for (let i = 0; i < 4; i++) click(t0 + i * spb, true);
  for (let i = 0; i < total; i++) click(t0 + (4 + i) * spb, false);
  for (let i = 0; i < 4; i++) { await sleep(tok, p0 + i * spb * 1000 - performance.now()); const c = document.getElementById('cnt'); if (c) c.textContent = i + 1; }
  LISTEN++;
  try {
    let cur = -1, streak = 0;
    const end = p0 + (4 + total) * spb * 1000;
    while (performance.now() < end) {
      /* 每個音提早四分之一拍開始算，彈得稍微早一點也接受 */
      const beat = (performance.now() - p0) / (spb * 1000) - 4 + .25; let j = -1; for (let x = 0; x < starts.length; x++) if (beat >= starts[x]) j = x;
      if (j !== cur) { cur = j; streak = 0; if (j >= 0) draw(j); }
      if (MIC && j >= 0 && !got[j]) { const f = MIC.pitch(); if (f && Math.abs(centsOff(f, noteHz(song.notes[j][0]))) < 70) { if (++streak >= 2) { got[j] = true; judge(true); draw(j); } } else if (f) streak = 0; }
      await sleep(tok, 40);
    }
  } finally { LISTEN = Math.max(0, LISTEN - 1); }
  const hit = got.filter(Boolean).length, stars = !MIC ? 3 : hit >= got.length * .6 ? 3 : hit >= got.length * .3 ? 2 : 1;
  show(`${big(song.icon)}${row(-1)}<div class="stars3 pop">${'⭐'.repeat(stars)}</div>`); ding(stars === 3 ? [523, 659, 784, 1047] : [659, 784]); await sleep(tok, 1800);
}
/* 和弦歌：[MIDI 音高, 拍數]；bars＝每一小節的和弦，沒寫就整首用 chord */
const SONGS = [
  { id: 'open', name: '彩虹小曲', bpm: 76, icon: '🎠', chord: 'C', notes: [[64, 1], [64, 1], [67, 1], [67, 1], [69, 1], [69, 1], [67, 2], [64, 1], [64, 1], [62, 1], [62, 1], [60, 4], [67, 1], [67, 1], [69, 1], [69, 1], [72, 1], [69, 1], [67, 2], [64, 1], [67, 1], [64, 1], [62, 1], [60, 4]] },
  { id: 'tigers', name: '兩隻老虎', bpm: 84, icon: '🐯', chord: 'C', lyric: '兩隻老虎，兩隻老虎，跑得快，跑得快。一隻沒有耳朵，一隻沒有尾巴，真奇怪，真奇怪。',
    notes: [[60, 1], [62, 1], [64, 1], [60, 1], [60, 1], [62, 1], [64, 1], [60, 1], [64, 1], [65, 1], [67, 2], [64, 1], [65, 1], [67, 2], [67, .5], [69, .5], [67, .5], [65, .5], [64, 1], [60, 1], [67, .5], [69, .5], [67, .5], [65, .5], [64, 1], [60, 1], [60, 1], [55, 1], [60, 2], [60, 1], [55, 1], [60, 2]] },
  { id: 'row', name: '划船歌', bpm: 66, icon: '🚣', chord: 'C', lyric: '划、划、划小船，輕輕順水流。快樂地、快樂地、快樂地、快樂地，人生像場夢。',
    notes: [[60, 1], [60, 1], [60, 2 / 3], [62, 1 / 3], [64, 1], [64, 2 / 3], [62, 1 / 3], [64, 2 / 3], [65, 1 / 3], [67, 2], [72, 1 / 3], [72, 1 / 3], [72, 1 / 3], [67, 1 / 3], [67, 1 / 3], [67, 1 / 3], [64, 1 / 3], [64, 1 / 3], [64, 1 / 3], [60, 1 / 3], [60, 1 / 3], [60, 1 / 3], [67, 2 / 3], [65, 1 / 3], [64, 2 / 3], [62, 1 / 3], [60, 2]] },
  { id: 'moon', name: '月亮小曲', bpm: 72, icon: '🌙', chord: 'Am', notes: [[69, 1], [72, 1], [76, 1], [72, 1], [69, 1], [72, 1], [76, 2], [76, 1], [74, 1], [72, 1], [71, 1], [69, 4], [69, 1], [72, 1], [76, 1], [72, 1], [69, 1], [72, 1], [76, 2], [76, 1], [74, 1], [72, 1], [71, 1], [69, 4]] },
  { id: 'hide', name: '捉迷藏', bpm: 70, icon: '🙈', bars: ['C', 'C', 'Am', 'Am', 'C', 'C', 'Am', 'Am'], notes: [[60, 1], [64, 1], [67, 1], [64, 1], [60, 1], [64, 1], [67, 2], [69, 1], [72, 1], [76, 1], [72, 1], [69, 1], [72, 1], [76, 2], [67, 1], [64, 1], [60, 1], [64, 1], [67, 1], [64, 1], [60, 2], [76, 1], [72, 1], [69, 1], [72, 1], [69, 4]] },
];
/* 各島可以選的歌 */
const SONG_MENU = [[], ['open', 'tigers', 'row'], ['moon', 'tigers', 'open'], ['hide', 'moon', 'row']];
const SONG_MODES = [
  { id: 'follow', icon: '🎵', say: '圖案跳一下，你就刷一下。可以一起唱喔！' },
  { id: 'freeze', icon: '🛑', say: '木頭人遊戲！音樂停下來，看到紅色的牌子，手就要停住不能動！' },
  { id: 'solo', icon: '🎤', say: '換你當主角！後面音樂會變小聲，你要自己繼續刷，不要停。' },
  { id: 'fast', icon: '🚀', say: '這次會比較快，跟好喔！' },
];
const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
async function playSong(tok, song, mode) {
  const bpm = song.bpm * (mode.id === 'fast' ? 1.18 : 1), spb = 60 / bpm, ac = audio();
  const total = Math.round(song.notes.reduce((s, n) => s + n[1], 0)), chordAt = i => CHORDS[song.bars ? song.bars[Math.min(song.bars.length - 1, Math.floor(i / 4))] : song.chord];
  show(`<div class="mid2" id="el">${song.icon}</div><div class="count" id="cnt"></div><div id="bc">${chordCard(chordAt(0), false, 3)}</div>${song.lyric ? `<p class="hint">${song.lyric}</p>` : ''}`);
  /* 木頭人：在樂句之間插入兩拍的停頓 */
  const stops = mode.id === 'freeze' ? [8, 16, 24].filter(b => b < total).sort(() => Math.random() - .5).slice(0, 2) : [];
  const shift = b => b + stops.filter(s => s <= b).length * 2, t0 = ac.currentTime + .35, p0 = performance.now() + 350;
  for (let i = 0; i < 4; i++) click(t0 + i * spb, true);
  let b = 0; for (const [m, len] of song.notes) { const quiet = mode.id === 'solo' && b >= total / 2; tone(midiHz(m), t0 + (4 + shift(b)) * spb, len * spb * .95, quiet ? .03 : .2, 'triangle'); b += len; }
  const plan = []; for (let i = 0; i < total; i++) { plan[shift(i)] = i; strum(chordAt(i).freqs, t0 + (4 + shift(i)) * spb, mode.id === 'solo' && i >= total / 2 ? .03 : .1); }
  const len = total + stops.length * 2; let shown = chordAt(0);
  for (let i = 0; i < 4 + len; i++) {
    await sleep(tok, p0 + i * spb * 1000 - performance.now());
    const c = document.getElementById('cnt'), e = document.getElementById('el'), bi = plan[i - 4];
    if (c) c.textContent = i < 4 ? i + 1 : '';
    if (i >= 4 && e) { const stop = bi === undefined; e.textContent = stop ? '🛑' : mode.id === 'solo' && bi >= total / 2 ? '🎤' : song.icon; if (!stop) bounce(); }
    /* 換和弦的歌：提早一拍換圖卡 */
    if (bi !== undefined && bi + 1 < total && chordAt(bi + 1) !== shown) { shown = chordAt(bi + 1); const bc = document.getElementById('bc'); if (bc) { bc.innerHTML = chordCard(shown, false, 3); bc.classList.remove('pop'); void bc.offsetWidth; bc.classList.add('pop'); } }
  }
  await sleep(tok, spb * 1200);
}
async function segSong(tok, k, timeIsUp) {
  const numbers = k.level === 0, menu = numbers ? NUM_SONGS.filter(s => s.max <= maxNum()) : SONG_MENU[k.level].map(id => SONGS.find(s => s.id === id));
  show(big('🎵')); ding([659, 784, 988, 1175]);
  await tell(tok, numbers ? '還有時間！來唱唱彈彈，用數字彈一首歌。' : `還有時間！來唱唱彈彈，用${LEVELS[k.level].say}伴奏。`);
  let i = 0;
  while (i < 4 && !(i > 0 && timeIsUp())) {
    setRounds(i + 1, i);
    const opts = [0, 1, 2].map(j => menu[(k.n + i + j) % menu.length]).filter((s, j, a) => a.indexOf(s) === j); let song = null;
    show(`<div class="choice">${opts.map((s, j) => `<button data-s="${j}"><span>${s.icon}</span></button>`).join('')}</div>`);
    stage().querySelectorAll('[data-s]').forEach(b => b.onclick = () => { song = opts[+b.dataset.s]; ding(); });
    say('想彈哪一首？選一個！');
    if (!await until(tok, () => song, 20000)) song = opts[0];
    if (numbers) await numberSong(tok, song);
    else {
      const mode = SONG_MODES[(k.n + i) % SONG_MODES.length];
      show(`${big(song.icon)}<div class="mid2">${mode.icon}</div>`); await tell(tok, `${song.name}。${mode.say}`);
      await playSong(tok, song, mode); ding([523, 659, 784]);
      show(`${big(song.icon)}<div class="stars3 pop">👏👏👏</div>`); await sleep(tok, 1200);
    }
    i++; tok.sang = i;
  }
}

/* ---------- 5. 貼紙時間 ---------- */
async function segSticker(tok, k) {
  const skipBtn = document.getElementById('skip'); if (skipBtn) skipBtn.style.visibility = 'hidden';
  let chosen = null;
  show(`<div class="stickers">${STICKERS.map(s => `<button data-s="${s}">${s}</button>`).join('')}</div>`);
  stage().querySelectorAll('[data-s]').forEach(b => b.onclick = () => { chosen = b.dataset.s; });
  const lv = k.level;
  say(`今天練完了！你做了暖身、節奏，練了${LEVELS[lv].say}${tok.sang ? '，還唱唱彈彈' : ''}。你好棒！選一張貼紙吧！`);
  await until(tok, () => chosen);
  const d = today(), prev = k.days[d];
  k.days[d] = { sticker: chosen, n: prev ? prev.n + 1 : 1 }; save();
  ding([523, 659, 784, 1047]);
  const cur = (k.stars[lv] || {})[d] || 0;
  show(`<div class="huge pop">${chosen}</div>${weekHTML(k)}<button class="ok" id="home" aria-label="完成">🏠</button>
    <div class="rate"><p class="hint" style="margin:0 0 8px">給家長：今天的本領「${LEVELS[lv].skill}」（${STAGE_NAMES[Math.min(2, k.stage[lv] || 0)]}）練得如何？<b>長按</b>星星評分</p>
    <div class="row">${[1, 2, 3].map(n => `<button data-r="${n}" class="${cur === n ? 'sel' : ''}">${'⭐'.repeat(n)}</button>`).join('')}</div><p class="small" id="rt"></p></div>`);
  let done = false, leveled = false, staged = false;
  document.getElementById('home').onclick = () => { done = true; };
  stage().querySelectorAll('[data-r]').forEach(b => {
    let t = 0; const n = +b.dataset.r, stop = () => clearTimeout(t);
    b.onpointerdown = () => { t = setTimeout(() => {
      k.stars[lv] = k.stars[lv] || {}; k.stars[lv][d] = n;
      stage().querySelectorAll('[data-r]').forEach(x => x.classList.toggle('sel', x === b)); ding([880], 0);
      const got = threeStarDays(k, lv), rt = document.getElementById('rt');
      /* 三顆星：同一座島先從「學」進到「練」、再到「挑戰」；累積 3 天三顆星就開下一座島 */
      if (n === 3 && !staged && (k.stage[lv] || 0) < 2) { k.stage[lv] = (k.stage[lv] || 0) + 1; staged = true; }
      if (got >= 3 && k.level === lv && lv < MAX_LEVEL) { k.level = lv + 1; leveled = true; rt.textContent = `已經有 3 天拿到三顆星，下一座小島「${LEVELS[lv + 1].name}」打開了！`; }
      else rt.textContent = `已評分。${staged ? `明天進入「${STAGE_NAMES[k.stage[lv]]}」階段。` : ''}${lv < MAX_LEVEL ? `三顆星的天數：${got} / 3，滿 3 天就會打開下一座小島。` : ''}`;
      save();
    }, 600); };
    b.onpointerup = b.onpointerleave = b.onpointercancel = stop;
  });
  say('明天見！');
  await until(tok, () => done);
  if (leveled) { show(`<div class="huge pop">${LEVELS[k.level].icon}</div><div class="stars3">🎉🎉🎉</div>`); ding([523, 659, 784, 1047, 1319]); await tell(tok, '哇！新的小島打開了！'); }
}

/* ================= 家長閘門：一題加法 ================= */
function vGate() {
  const a = 6 + Math.floor(Math.random() * 4), b = 4 + Math.floor(Math.random() * 5), ans = String(a + b); let typed = '';
  $.innerHTML = `<div class="top"><button class="round" id="bk" aria-label="回首頁">🏠</button><span></span></div>
  <div class="mid"><div class="hint">家長請回答，才能進入家長模式</div><div class="gate">${a} + ${b} = <span id="in">？</span></div>
  <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, ''].map(n => n === '' ? '<span></span>' : `<button data-n="${n}">${n}</button>`).join('')}</div></div>`;
  document.getElementById('bk').onclick = () => go('home'); const out = document.getElementById('in');
  $.querySelectorAll('.pad button').forEach(btn => btn.onclick = () => {
    const n = btn.dataset.n; typed = n === '⌫' ? typed.slice(0, -1) : (typed + n).slice(0, 2); out.textContent = typed || '？';
    if (typed.length === ans.length) { if (typed === ans) go('parent'); else { typed = ''; setTimeout(() => { out.textContent = '？'; }, 350); } }
  });
}

/* ================= 家長模式 ================= */
function checks() {
  const c = [];
  c.push(secure() ? ['✅', '安全連線（https）', '可以使用麥克風。'] : ['⚠️', '不是安全連線', '目前的網址不是 https，麥克風無法使用。']);
  if (standalone()) c.push(['✅', '已從主畫面開啟', '資料會保存在這個 App 裡。']);
  else if (isIOS()) c.push(['⚠️', '尚未加入主畫面', '在 Safari 按分享按鈕 ⬆️，選「加入主畫面」，之後都從主畫面的圖示打開。現在在 Safari 建立的資料不會帶過去，建議加入主畫面後再新增小朋友。']);
  else c.push(['ℹ️', '目前是在瀏覽器裡開啟', '在 iPad 上請加入主畫面使用。電腦上可以直接用。']);
  c.push(memOnly ? ['⚠️', '這個瀏覽器無法儲存資料', '可能是私密瀏覽模式。關閉後資料會消失。'] : persisted ? ['✅', '資料保存', '瀏覽器已同意長期保存資料。'] : ['ℹ️', '資料保存', '資料存在這台裝置裡。請定期用下方的「備份」匯出。']);
  c.push(DB.meta.micOk === true ? ['✅', '麥克風', '上次測試成功。iPad 每次開啟 App 可能會再問一次，請選「允許」。'] : DB.meta.micOk === false ? ['⚠️', '麥克風', '上次測試沒有收到聲音。請按「測試麥克風」再試一次。沒有麥克風也能練習，只是要自己按 👍。'] : ['⬜', '麥克風', '還沒測試過。']);
  c.push(!('speechSynthesis' in window) ? ['⚠️', '語音', '這個瀏覽器不支援語音朗讀。'] : VOICE ? ['✅', '中文語音', `使用「${esc(VOICE.name)}」。`] : ['⬜', '中文語音', '還沒找到中文語音，請按「試聽語音」確認聽得到。']);
  c.push(DB.kids.length ? ['✅', '小朋友資料', `已建立 ${DB.kids.length} 位。`] : ['⬜', '小朋友資料', '請在下方新增。']);
  c.push(DB.settings.classDay !== null ? ['✅', '上課日', `每週${DAYS[DB.settings.classDay]}。`] : ['⬜', '上課日', '請在下方選擇每週上課是星期幾。']);
  return c;
}
function vParent() {
  const s = DB.settings, le = DB.meta.lastExport;
  $.innerHTML = `<div class="parent"><div class="top"><h1>家長模式</h1><button class="btn ghost" id="bk">回小朋友畫面</button></div>
  <div class="card"><div class="row"><button class="btn" id="tn">🎵 調音器</button><span class="small">每次練習前，先幫小朋友把琴調好。</span></div></div>
  <h2>設定檢查</h2><div class="card">${checks().map(c => `<div class="chk"><span class="ic">${c[0]}</span><div><b>${c[1]}</b><small>${c[2]}</small></div></div>`).join('')}
   <div class="row" style="margin-top:12px"><button class="btn sm" id="tm">測試麥克風</button><button class="btn sm" id="tv">試聽語音</button></div>
   <div id="mt" hidden><div class="meter"><i id="ml"></i></div></div><p class="small" id="tr" style="margin:8px 0 0"></p></div>
  <h2>小朋友</h2><div class="card">${DB.kids.map(k => `<div class="krow"><span class="f" style="background:${k.tint}">${k.animal}</span><span class="n">${esc(k.name) || '（未命名）'}<br><span class="small" style="font-weight:400">${LEVELS[k.level].icon} ${LEVELS[k.level].name}（${STAGE_NAMES[Math.min(2, k.stage[k.level] || 0)]}）　練習了 ${Object.keys(k.days).length} 天<br>節奏：${RHYTHMS[k.rhythm.lv].icon} ${RHYTHMS[k.rhythm.lv].name}　暖身：${WARM_NAMES[k.warm.lv]}</span></span><button class="btn ghost sm" data-e="${k.id}">修改</button></div>`).join('') || '<p class="small" style="margin:0 0 10px">還沒有小朋友。</p>'}
   ${DB.kids.length < 6 ? '<button class="btn" id="add" style="margin-top:8px">新增小朋友</button>' : ''}</div>
  <h2>每週上課日</h2><div class="card"><div class="seg" id="cd">${DAYS.map((d, i) => `<button data-d="${i}" class="${s.classDay === i ? 'sel' : ''}">${d}</button>`).join('')}<button data-d="x" class="${s.classDay === null ? 'sel' : ''}">沒有固定</button></div>
   <p class="small" style="margin:10px 0 0">之後每日練習的內容會依上課日安排：上課後複習新內容，上課前把歌完整彈一遍。</p></div>
  <h2>每天練習多久</h2><div class="card"><div class="seg" id="mn"><button data-m="10" class="${s.minutes === 10 && !s.split ? 'sel' : ''}">10 分鐘</button><button data-m="15" class="${s.minutes === 15 && !s.split ? 'sel' : ''}">15 分鐘</button><button data-m="s" class="${s.split ? 'sel' : ''}">早晚各 7 分鐘</button></div></div>
  <h2>老師教到數字幾</h2><div class="card"><div class="seg" id="mx">${[4, 5, 6].map(n => `<button data-x="${n}" class="${s.maxNum === n ? 'sel' : ''}">1 到 ${n}</button>`).join('')}</div>
   <p class="small" style="margin:10px 0 0">數字練習和數字歌只會出現到這個數字。老師教了新的數字再往上調。</p></div>
  <h2>數字貼紙的位置（Do Re Mi）</h2><div class="card"><p class="small" style="margin-top:0">老師在琴上貼的數字 1–6。預設是最常見的位置，和老師貼的不一樣時再改。「不按」代表貼在琴頭、直接撥空弦。</p>
   ${[1, 2, 3, 4, 5, 6].map(n => `<div class="row" style="margin:6px 0"><span class="num" style="background:${STRINGS[s.notes[n][0]].color};color:${STRINGS[s.notes[n][0]].ink}">${n}</span>
    <select data-ns="${n}">${STRINGS.map((st, i) => `<option value="${i}" ${s.notes[n][0] === i ? 'selected' : ''}>${st.cname}${st.aname}弦（${st.note}）</option>`).join('')}</select>
    <select data-nf="${n}">${[0, 1, 2, 3, 4, 5].map(f => `<option value="${f}" ${s.notes[n][1] === f ? 'selected' : ''}>${f ? `第 ${f} 格` : '不按'}</option>`).join('')}</select></div>`).join('')}
   <button class="btn ghost sm" id="nr" style="margin-top:8px">恢復預設</button></div>
  <h2>備份</h2><div class="card"><p class="small" style="margin-top:0">資料只存在這台裝置，不會上傳。請定期匯出，存到「檔案」App 或 iCloud。${le ? `<br>上次匯出：${le.slice(0, 10)}` : '<br>還沒有匯出過。'}</p>
   <div class="row"><button class="btn" id="ex">匯出備份</button><button class="btn ghost" id="im">從備份還原</button><input type="file" id="fi" accept="application/json,.json" hidden></div></div>
  <p class="small" style="text-align:center">版本 ${VERSION}　<a href="#" id="up">檢查更新</a></p></div>`;
  const b = id => document.getElementById(id);
  b('bk').onclick = () => go('home'); b('tn').onclick = () => { audio(); go('tuner'); };
  if (b('add')) b('add').onclick = () => go('edit', null);
  $.querySelectorAll('[data-e]').forEach(x => x.onclick = () => go('edit', x.dataset.e));
  b('cd').querySelectorAll('button').forEach(x => x.onclick = () => { DB.settings.classDay = x.dataset.d === 'x' ? null : +x.dataset.d; save(); vParent(); });
  b('mn').querySelectorAll('button').forEach(x => x.onclick = () => { if (x.dataset.m === 's') { DB.settings.split = true; DB.settings.minutes = 15; } else { DB.settings.split = false; DB.settings.minutes = +x.dataset.m; } save(); vParent(); });
  $.querySelectorAll('[data-ns],[data-nf]').forEach(x => x.onchange = () => { const n = x.dataset.ns || x.dataset.nf; DB.settings.notes[n][x.dataset.ns ? 0 : 1] = +x.value; save(); vParent(); });
  b('mx').querySelectorAll('button').forEach(x => x.onclick = () => { DB.settings.maxNum = +x.dataset.x; save(); vParent(); });
  b('nr').onclick = () => { DB.settings.notes = JSON.parse(JSON.stringify(DEFAULT_NOTES)); save(); vParent(); };
  b('tv').onclick = () => { audio(); ding(); say('你好，我是烏克麗麗小島，我們一起來練習吧！'); b('tr').textContent = '有聽到「叮」和中文語音嗎？沒有的話請檢查靜音開關和音量。'; };
  b('tm').onclick = async () => {
    audio(); micStop(); b('mt').hidden = false; b('tr').textContent = '請對著 iPad 說話或刷一下琴，看綠色的條有沒有動（測 6 秒）…';
    if (!micCapable()) { b('tr').textContent = '這個網址不能使用麥克風，請用 https:// 開頭的網址打開。'; return; }
    let m; try { m = await micOpen(); } catch (e) { DB.meta.micOk = false; save(); b('tr').textContent = '沒有取得麥克風權限。請在跳出的視窗選「允許」，或到 iPad 的「設定 → Safari → 麥克風」改成「允許」。'; return; }
    const end = performance.now() + 6000;
    const loop = () => {
      if (VIEW !== 'parent' || MIC !== m) return;
      const bar = b('ml'); if (bar) bar.style.width = Math.min(100, m.rms * 250) + '%';
      if (performance.now() < end) { go.raf = requestAnimationFrame(loop); return; }
      const ok = m.peak > .02, info = `（狀態 ${AC.state}，最大音量 ${m.peak.toFixed(3)}（已放大 ${MIC_BOOST} 倍），取樣率 ${m.sr}${m.dead() ? '，沒有任何資料' : ''}）`;
      micStop(); DB.meta.micOk = ok; save(); vParent(); b('tr').textContent = (ok ? '麥克風正常，有收到聲音。' : '沒有收到聲音。請再按一次「測試麥克風」；如果還是不行，請把下面括號裡的文字告訴 Claude。') + info;
    };
    loop();
  };
  b('ex').onclick = exportData; b('im').onclick = () => b('fi').click();
  b('fi').onchange = e => {
    const f = e.target.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { let d = null; try { d = normalize(JSON.parse(r.result)); } catch (err) {} if (!d) return toast('這不是有效的備份檔'); if (confirm(`備份裡有 ${d.kids.length} 位小朋友的資料。\n還原後會取代目前的資料，確定嗎？`)) { DB = d; save(); vParent(); toast('已還原'); } };
    r.readAsText(f); e.target.value = '';
  };
  b('up').onclick = async e => { e.preventDefault(); try { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update(); } catch (err) {} location.reload(); };
}
async function exportData() {
  DB.meta.lastExport = new Date().toISOString(); save();
  const name = `ukulele-backup-${DB.meta.lastExport.slice(0, 10)}.json`, text = JSON.stringify(DB, null, 1);
  try { const f = new File([text], name, { type: 'application/json' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); vParent(); return; } } catch (e) { if (e && e.name === 'AbortError') { vParent(); return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); vParent(); toast('已匯出');
}

/* ---------- 調音器 ---------- */
function vTuner() {
  $.innerHTML = `<div class="parent"><div class="top"><h1>調音器</h1><button class="btn ghost" id="bk">返回</button></div>
  <div class="card"><p class="small" style="margin-top:0">一次撥一條弦，讓黑色指針對準中間的綠線。按下面的按鈕可以聽標準音。</p>
   <div class="tread" id="rd">請撥一條弦</div><div class="needle"><i id="nd"></i></div><p class="small" id="tip">&nbsp;</p>
   <div class="tuner">${STRINGS.map((s, i) => `<button data-i="${i}" style="background:${s.color};color:${s.ink}"><small>${s.animal}</small>${s.note}</button>`).join('')}</div>
   <p class="small" id="ms" style="margin-bottom:0"></p></div>
  <div class="card small">抱琴時由上到下是：${STRINGS.map(x => `${x.animal} ${x.note}（${x.cname}）`).join('、')}。顏色和老師貼的貼紙一樣。新的弦和小琴很容易走音，建議每次練習前都調一次。</div></div>`;
  const b = id => document.getElementById(id);
  b('bk').onclick = () => go('parent');
  $.querySelectorAll('[data-i]').forEach(x => x.onclick = () => { const s = STRINGS[+x.dataset.i]; pluck(s.hz, undefined, .6); deaf(950); });
  if (!micCapable()) { b('ms').textContent = '這個網址不能使用麥克風，只能用按鈕聽標準音來調。'; return; }
  micOpen().then(m => {
    let hold = 0;
    const loop = () => {
      if (VIEW !== 'tuner' || MIC !== m) return;
      const f = m.pitch();
      if (f) {
        let best = 0; STRINGS.forEach((s, i) => { if (Math.abs(centsOff(f, s.hz)) < Math.abs(centsOff(f, STRINGS[best].hz))) best = i; });
        const s = STRINGS[best], c = centsOff(f, s.hz);
        if (Math.abs(c) < 250) {
          hold = performance.now();
          b('rd').innerHTML = `${s.animal} ${s.note} 弦`; b('nd').style.left = (50 + Math.max(-48, Math.min(48, c * .48))) + '%';
          b('nd').style.background = Math.abs(c) < 8 ? '#35b56a' : '#3b2f2f';
          b('tip').textContent = Math.abs(c) < 8 ? '剛剛好！' : c < 0 ? '太低了，把弦鈕轉緊一點。' : '太高了，把弦鈕放鬆一點。';
        }
      } else if (performance.now() - hold > 2500) { b('rd').textContent = '請撥一條弦'; b('tip').innerHTML = '&nbsp;'; }
      go.raf = requestAnimationFrame(loop);
    };
    loop();
  }).catch(() => { b('ms').textContent = '沒有取得麥克風權限，只能用按鈕聽標準音來調。'; });
}

/* ---------- 新增／修改小朋友 ---------- */
function vEdit() {
  const cur = ARG ? kidOf(ARG) : null, used = DB.kids.filter(k => !cur || k.id !== cur.id).map(k => k.animal);
  let animal = cur ? cur.animal : ANIMALS.find(a => !used.includes(a)), level = cur ? cur.level : 0;
  $.innerHTML = `<div class="parent"><div class="top"><h1>${cur ? '修改小朋友' : '新增小朋友'}</h1><button class="btn ghost" id="bk">取消</button></div>
  <h2>名字或小名</h2><input type="text" id="nm" maxlength="12" value="${cur ? esc(cur.name) : ''}" placeholder="例如：小安" autocomplete="off">
  <p class="small">名字只存在這台裝置，用來讓語音打招呼。</p>
  <h2>選一個動物頭像</h2><p class="small" style="margin:0">小朋友點自己的動物就能進入。已經被選走的動物不能重複。</p>
  <div class="pick" id="pk">${ANIMALS.map(a => `<button data-a="${a}" class="${a === animal ? 'sel' : ''}" ${used.includes(a) ? 'disabled style="opacity:.25"' : ''}>${a}</button>`).join('')}</div>
  <h2>現在在哪一座小島</h2><p class="small" style="margin:0 0 10px">一般會自動前進（同一項本領有 3 天拿到三顆星）。老師已經教到後面的話，可以直接選。</p>
  <div class="seg" id="lv">${LEVELS.map((l, i) => `<button data-l="${i}" class="${i === level ? 'sel' : ''}">${l.icon} ${l.name}</button>`).join('')}</div>
  <p class="small" id="ls">${LEVELS[level].skill}</p>
  <div class="row" style="margin-top:18px"><button class="btn" id="sv">儲存</button>${cur ? '<button class="btn danger" id="dl">刪除這位小朋友</button>' : ''}</div></div>`;
  const b = id => document.getElementById(id);
  b('bk').onclick = () => go('parent');
  b('pk').querySelectorAll('button:not([disabled])').forEach(x => x.onclick = () => { animal = x.dataset.a; b('pk').querySelectorAll('button').forEach(y => y.classList.toggle('sel', y === x)); });
  b('lv').querySelectorAll('button').forEach(x => x.onclick = () => { level = +x.dataset.l; b('lv').querySelectorAll('button').forEach(y => y.classList.toggle('sel', y === x)); b('ls').textContent = LEVELS[level].skill; });
  b('sv').onclick = () => {
    const name = b('nm').value.trim().slice(0, 12); if (!name) { toast('請輸入名字或小名'); return; }
    if (cur) { cur.name = name; cur.animal = animal; cur.level = level; }
    else { const tint = TINTS.find(t => !DB.kids.some(k => k.tint === t)) || TINTS[DB.kids.length % TINTS.length]; DB.kids.push({ id: 'k' + Date.now().toString(36), name, animal, tint, createdAt: new Date().toISOString(), level, days: {}, stars: {}, n: 0, rhythm: { lv: 0, streak: 0 }, warm: { lv: 0, ok: 0 }, solfa: { step: 0, ok: 0 }, stage: {} }); }
    save(); go('parent');
  };
  if (cur) b('dl').onclick = () => { if (confirm(`確定刪除「${cur.name}」嗎？這位小朋友的紀錄會一起刪除，無法復原。`)) { DB.kids = DB.kids.filter(k => k.id !== cur.id); save(); go('parent'); } };
}

document.addEventListener('visibilitychange', () => { if (document.hidden && (VIEW === 'session' || VIEW === 'tuner')) go(VIEW === 'session' ? 'kid' : 'parent', ARG); });
if ('serviceWorker' in navigator && secure()) navigator.serviceWorker.register('sw.js').catch(() => {});
render();

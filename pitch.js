/* 音高偵測（YIN 的簡化版）。buf 至少要有 n + sr/180 + 2 個取樣。回傳 Hz，偵測不到回傳 0。 */
function detectPitch(buf, sr) {
  const n = 1024, minL = Math.floor(sr / 720), maxL = Math.ceil(sr / 180);
  if (buf.length < n + maxL + 2) return 0;
  const d = new Float32Array(maxL + 2);
  let run = 0;
  for (let L = 1; L <= maxL + 1; L++) {
    let s = 0;
    for (let i = 0; i < n; i++) { const x = buf[i] - buf[i + L]; s += x * x; }
    run += s;
    d[L] = run ? s * L / run : 1;
  }
  let best = -1;
  for (let L = minL; L <= maxL; L++) {
    if (d[L] < 0.15 && d[L] < d[L - 1] && d[L] <= d[L + 1]) { best = L; break; }
  }
  if (best < 0) return 0;
  const a = d[best - 1], b = d[best], c = d[best + 1], den = a - 2 * b + c;
  const tau = best + (den ? 0.5 * (a - c) / den : 0);
  return sr / tau;
}
/* 兩個頻率相差幾音分（100 音分＝一個半音） */
function centsOff(f, target) { return 1200 * Math.log2(f / target); }
if (typeof module !== 'undefined') module.exports = { detectPitch, centsOff };

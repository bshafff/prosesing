// ========== LAPORAN MANAJEMEN (ringkas, untuk WA & presentasi layar) ==========
const MG = { GREEN: '#2d5016', GH1: '#2d5016', GH2: '#94a3b8', OK: '#16a34a', WARN: '#d97706', BAD: '#dc2626', INK: '#0f172a', MUTE: '#64748b', LINE: '#e2e8f0', BG: '#f8fafc' };
const MG_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MG_CAUSES = [
  ['crack', 'Cracking'], ['poli', 'Polinasi'], ['hpt', 'HPT'], ['bruise', 'Bruise'],
  ['overripe', 'Overripe'], ['kuning', 'Buah Kuning'], ['frozen', 'Frozen <11 gr'], ['albino', 'Albino']
];

function mgN(n, d) { d = d === undefined ? 2 : d; return Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function mgP(n, d) { return mgN(n, d === undefined ? 1 : d) + '%'; }
function mgParse(s) { return new Date(s + 'T12:00:00'); }
function mgYmd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function mgAdd(s, days) { const d = mgParse(s); d.setDate(d.getDate() + days); return mgYmd(d); }
function mgMonday(s) { const d = mgParse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return mgYmd(d); }
function mgLong(s) { const d = mgParse(s); return d.getDate() + ' ' + MG_BULAN[d.getMonth()] + ' ' + d.getFullYear(); }
function mgShort(s) { return s.substring(8, 10) + '/' + s.substring(5, 7); }
function mgEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function mgDaysBetween(a, b) { return Math.round((mgParse(b) - mgParse(a)) / 86400000) + 1; }

// ---------- Kontrol periode ----------
function mgToggleInputs() {
  const j = document.getElementById('mgmt-jenis').value;
  const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
  show('mgmt-w-tgl', j === 'mingguan' || j === '2mingguan');
  show('mgmt-w-bulan', j === 'bulanan');
  show('mgmt-w-dari', j === 'custom');
  show('mgmt-w-sampai', j === 'custom');
}

function mgOnChange() { mgToggleInputs(); renderLaporanMgmt(); }

function mgRange() {
  const j = document.getElementById('mgmt-jenis').value;
  const today = mgYmd(new Date());
  let start, end, pstart, pend, label;
  if (j === 'bulanan') {
    const bln = document.getElementById('mgmt-bulan').value || today.substring(0, 7);
    const [y, m] = bln.split('-').map(Number);
    start = bln + '-01';
    end = bln + '-' + String(new Date(y, m, 0).getDate()).padStart(2, '0');
    const pd = new Date(y, m - 2, 1);
    const pbln = pd.getFullYear() + '-' + String(pd.getMonth() + 1).padStart(2, '0');
    pstart = pbln + '-01';
    pend = pbln + '-' + String(new Date(pd.getFullYear(), pd.getMonth() + 1, 0).getDate()).padStart(2, '0');
    label = 'Bulanan · ' + MG_BULAN[m - 1] + ' ' + y;
  } else if (j === 'custom') {
    start = document.getElementById('mgmt-dari').value || mgAdd(today, -6);
    end = document.getElementById('mgmt-sampai').value || today;
    if (start > end) { const t = start; start = end; end = t; }
    const len = mgDaysBetween(start, end);
    pend = mgAdd(start, -1); pstart = mgAdd(pend, -(len - 1));
    label = mgLong(start) + ' – ' + mgLong(end);
  } else {
    const ref = document.getElementById('mgmt-tgl').value || today;
    const mon = mgMonday(ref);
    if (j === '2mingguan') {
      start = mgAdd(mon, -7); end = mgAdd(mon, 5);
      pstart = mgAdd(start, -14); pend = mgAdd(end, -14);
      label = '2 Minggu · ' + mgLong(start) + ' – ' + mgLong(end);
    } else {
      start = mon; end = mgAdd(mon, 5);
      pstart = mgAdd(start, -7); pend = mgAdd(end, -7);
      label = 'Mingguan · ' + mgLong(start) + ' – ' + mgLong(end);
    }
  }
  return { jenis: j, start, end, pstart, pend, label };
}

// ---------- Hitung data ----------
function mgMetrics(start, end) {
  const all = readArrayRaw(nativeStorage.getItem(PANEN_STORAGE_KEY));
  const alok = buildAlokasiGlobal(all);
  const zero = () => ({ panen: 0, rej: 0, kirimGrade: 0, rejKirim: 0, pack: 0, cause: { crack: 0, poli: 0, hpt: 0, bruise: 0, overripe: 0, kuning: 0, frozen: 0, albino: 0 } });
  const M = { g1: zero(), g2: zero(), all: zero(), days: {} };
  all.filter(x => x.tgl && x.tgl >= start && x.tgl <= end).forEach(x => {
    const day = M.days[x.tgl] || (M.days[x.tgl] = { panen: 0, kirim: 0, rej: 0 });
    const own = (Number(x.k_frozen) || 0) + (Number(x.k_rfresh) || 0);
    if (x.gh === 'GLOBAL') { M.all.rejKirim += own; day.kirim += own; return; }
    const key = x.gh === 'GH 2' ? 'g2' : (x.gh === 'GH 1' ? 'g1' : null);
    if (!key) return;
    const n = k => Number(x[k]) || 0;
    const rk = n('rk_crack') + n('rk_poli') + n('rk_hpt');
    const cat = {
      crack: n('rk_crack') + n('rp_crack'), poli: n('rk_poli') + n('rp_poli'), hpt: n('rk_hpt') + n('rp_hpt'),
      bruise: n('rp_bruise'), overripe: n('rp_overripe'), kuning: n('rp_kuning'), frozen: n('rp_frozen'), albino: n('rp_albino')
    };
    const rej = Object.values(cat).reduce((a, b) => a + b, 0);
    const panen = n('p_hatsu') + n('p_gradea') + n('p_gradeb') + rk;
    const kg = n('k_hatsu') + n('k_a11') + n('k_a15');
    const a = alok(x);
    const rejKirim = own + a.k_frozen + a.k_rfresh;
    const pack = n('m_hatsu') + n('m_a11') + n('m_a15');
    [M[key], M.all].forEach(t => {
      t.panen += panen; t.rej += rej; t.kirimGrade += kg; t.pack += pack;
      Object.keys(cat).forEach(c => { t.cause[c] += cat[c]; });
    });
    M[key].rejKirim += rejKirim;
    M.all.rejKirim += own;
    day.panen += panen; day.rej += rej; day.kirim += kg + own;
  });
  ['g1', 'g2', 'all'].forEach(k => {
    const t = M[k];
    t.kirim = t.kirimGrade + t.rejKirim;
    t.rateKirim = t.panen > 0 ? t.kirim / t.panen * 100 : 0;
    t.rateRej = t.panen > 0 ? t.rej / t.panen * 100 : 0;
  });
  return M;
}

function mgHyoshii(start, end) {
  const hy = readArrayRaw(nativeStorage.getItem(HYOSHII_STORAGE_KEY)).filter(x => x.tgl && x.tgl >= start && x.tgl <= end);
  if (!hy.length) return null;
  const dates = new Set(hy.map(x => x.tgl));
  const n = (o, k) => Number(o[k]) || 0;
  const R = { hatsu: 0, a11: 0, a15: 0, reject: 0, pHatsu: 0, pA11: 0, pA15: 0, rjHatsu: 0, rjA11: 0, rjA15: 0 };
  const ket = [];
  hy.forEach(x => {
    R.hatsu += n(x, 'hk_hatsu'); R.a11 += n(x, 'hk_a11'); R.a15 += n(x, 'hk_a15');
    R.reject += n(x, 'hk_reject') + n(x, 'hk_rfresh') + n(x, 'hk_frozen');
    R.pHatsu += n(x, 'hp_hatsu'); R.pA11 += n(x, 'hp_a11'); R.pA15 += n(x, 'hp_a15');
    R.rjHatsu += n(x, 'hr_hatsu'); R.rjA11 += n(x, 'hr_a11'); R.rjA15 += n(x, 'hr_a15');
    if (x.h_ket) ket.push({ tgl: x.tgl, ket: x.h_ket });
  });
  const S = { hatsu: 0, a11: 0, a15: 0, reject: 0, pHatsu: 0, pA11: 0, pA15: 0 };
  readArrayRaw(nativeStorage.getItem(PANEN_STORAGE_KEY)).filter(x => dates.has(x.tgl)).forEach(x => {
    S.hatsu += n(x, 'k_hatsu'); S.a11 += n(x, 'k_a11'); S.a15 += n(x, 'k_a15');
    S.reject += n(x, 'k_rfresh') + n(x, 'k_frozen');
    S.pHatsu += n(x, 'm_hatsu'); S.pA11 += n(x, 'm_a11'); S.pA15 += n(x, 'm_a15');
  });
  R.total = R.hatsu + R.a11 + R.a15 + R.reject;
  S.total = S.hatsu + S.a11 + S.a15 + S.reject;
  R.pTotal = R.pHatsu + R.pA11 + R.pA15; S.pTotal = S.pHatsu + S.pA11 + S.pA15;
  R.rjTotal = R.rjHatsu + R.rjA11 + R.rjA15;
  const pct = S.total > 0 ? R.total / S.total * 100 : 0;
  ket.sort((a, b) => a.tgl.localeCompare(b.tgl));
  return { recv: R, sent: S, pct, ket, hari: dates.size };
}

// ---------- Komponen visual ----------
function mgDelta(cur, prev, goodUp, unit) {
  if (prev === null || prev === undefined || !isFinite(prev) || prev === 0) return `<span style="color:${MG.MUTE};">belum ada pembanding</span>`;
  const diff = unit === 'poin' ? cur - prev : (cur - prev) / prev * 100;
  if (Math.abs(diff) < 0.05) return `<span style="color:${MG.MUTE};">= sama dgn sebelumnya</span>`;
  const up = diff > 0, good = up === goodUp;
  const txt = unit === 'poin' ? mgN(Math.abs(diff), 2) + ' poin' : mgN(Math.abs(diff), 1) + '%';
  return `<span style="color:${good ? MG.OK : MG.BAD};font-weight:700;">${up ? '▲' : '▼'} ${txt}</span> <span style="color:${MG.MUTE};">vs sebelumnya</span>`;
}

function mgKpi(label, value, sub, delta, accent) {
  return `<td style="width:25%;padding:0 5px;vertical-align:top;">
    <div style="background:#fff;border:1px solid ${MG.LINE};border-top:4px solid ${accent};border-radius:10px;padding:12px 12px 10px;">
      <div style="font-size:11px;font-weight:700;color:${MG.MUTE};text-transform:uppercase;letter-spacing:0.4px;">${label}</div>
      <div style="font-size:26px;font-weight:800;color:${MG.INK};line-height:1.2;margin-top:4px;">${value}</div>
      <div style="font-size:11.5px;color:${MG.MUTE};margin-top:2px;">${sub}</div>
      <div style="font-size:11.5px;margin-top:6px;">${delta}</div>
    </div></td>`;
}

function mgSection(title, inner) {
  return `<div style="margin-top:14px;background:#fff;border:1px solid ${MG.LINE};border-radius:10px;padding:14px 16px;">
    <div style="font-size:14px;font-weight:800;color:${MG.GREEN};margin-bottom:10px;">${title}</div>${inner}</div>`;
}

function mgLineChart(labels, series, opts) {
  opts = opts || {};
  const W = 440, H = 190, L = 46, R = 12, T = 14, B = 26;
  const n = labels.length;
  if (!n) return `<div style="color:${MG.MUTE};font-size:12px;">Belum ada data</div>`;
  let max = Math.max(...series.flatMap(s => s.values), opts.target || 0, 0.0001) * 1.12;
  const x = i => n === 1 ? (L + (W - L - R) / 2) : L + (W - L - R) * i / (n - 1);
  const y = v => T + (H - T - B) * (1 - v / max);
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;">`;
  for (let g = 0; g <= 4; g++) {
    const v = max * g / 4, yy = y(v);
    svg += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="${MG.LINE}" stroke-width="1"/>`;
    svg += `<text x="${L - 6}" y="${yy + 3}" font-size="9.5" fill="${MG.MUTE}" text-anchor="end">${mgN(v, opts.dec === undefined ? 0 : opts.dec)}</text>`;
  }
  const step = Math.max(1, Math.ceil(n / 8));
  labels.forEach((lb, i) => { if (i % step === 0 || i === n - 1) svg += `<text x="${x(i)}" y="${H - 8}" font-size="9.5" fill="${MG.MUTE}" text-anchor="middle">${lb}</text>`; });
  if (opts.target) {
    const yt = y(opts.target);
    svg += `<line x1="${L}" y1="${yt}" x2="${W - R}" y2="${yt}" stroke="${MG.BAD}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    svg += `<text x="${W - R}" y="${yt - 4}" font-size="9.5" fill="${MG.BAD}" text-anchor="end" font-weight="700">Target ${mgN(opts.target, 0)}%</text>`;
  }
  series.forEach(s => {
    const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (n <= 16) s.values.forEach((v, i) => { svg += `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${s.color}"/>`; });
  });
  svg += '</svg>';
  const legend = series.length > 1 ? `<div style="font-size:11px;color:${MG.MUTE};margin-top:2px;">${series.map(s => `<span style="display:inline-block;width:10px;height:10px;background:${s.color};border-radius:2px;margin-right:4px;"></span>${s.name}`).join('&nbsp;&nbsp;&nbsp;')}</div>` : '';
  return svg + legend;
}

function mgBuckets(M) {
  const dates = Object.keys(M.days).sort();
  const weekly = dates.length > 35;
  const map = new Map();
  dates.forEach(d => {
    const key = weekly ? mgMonday(d) : d;
    const b = map.get(key) || { panen: 0, kirim: 0, rej: 0 };
    b.panen += M.days[d].panen; b.kirim += M.days[d].kirim; b.rej += M.days[d].rej;
    map.set(key, b);
  });
  const keys = [...map.keys()].sort();
  return { labels: keys.map(mgShort), panen: keys.map(k => map.get(k).panen), kirim: keys.map(k => map.get(k).kirim), rate: keys.map(k => { const b = map.get(k); return b.panen > 0 ? b.rej / b.panen * 100 : 0; }), weekly };
}

// ---------- Render ----------
function renderLaporanMgmt() {
  const host = document.getElementById('mgmt-report');
  if (!host) return;
  const jenisEl = document.getElementById('mgmt-jenis');
  if (!document.getElementById('mgmt-tgl').value) document.getElementById('mgmt-tgl').value = mgYmd(new Date());
  if (!document.getElementById('mgmt-bulan').value) document.getElementById('mgmt-bulan').value = mgYmd(new Date()).substring(0, 7);
  if (!document.getElementById('mgmt-dari').value) document.getElementById('mgmt-dari').value = mgAdd(mgYmd(new Date()), -6);
  if (!document.getElementById('mgmt-sampai').value) document.getElementById('mgmt-sampai').value = mgYmd(new Date());
  const tEl = document.getElementById('mgmt-target');
  if (!tEl.value) tEl.value = localStorage.getItem('awb_mgmt_target') || '10';
  const target = parseFloat(tEl.value) || 10;
  try { localStorage.setItem('awb_mgmt_target', String(target)); } catch (e) { /* abaikan */ }
  mgToggleInputs();

  const rg = mgRange();
  const M = mgMetrics(rg.start, rg.end), P = mgMetrics(rg.pstart, rg.pend);
  const A = M.all, PA = P.all;
  const hy = mgHyoshii(rg.start, rg.end), phy = mgHyoshii(rg.pstart, rg.pend);

  if (A.panen <= 0 && !hy) {
    host.innerHTML = `<div style="padding:28px;text-align:center;color:${MG.MUTE};background:#fff;border:1px solid ${MG.LINE};border-radius:10px;">Belum ada data panen pada periode <b>${rg.label}</b>.</div>`;
    return;
  }

  // status reject rate
  const rr = A.rateRej;
  const rrStatus = rr <= target ? ['✓ Sesuai target', MG.OK] : (rr <= target * 1.25 ? ['⚠ Perlu perhatian', MG.WARN] : ['✗ Di atas target', MG.BAD]);

  // ringkasan otomatis
  const bullets = [];
  const pctDiff = (c, p) => (p > 0 ? (c - p) / p * 100 : null);
  const dP = pctDiff(A.panen, PA.panen);
  bullets.push(`Total panen <b>${mgN(A.panen)} kg</b>${dP === null ? '' : ` (${dP >= 0 ? 'naik' : 'turun'} ${mgN(Math.abs(dP), 1)}% dari periode sebelumnya)`}; terkirim <b>${mgP(A.rateKirim)}</b> dari panen.`);
  const dRate = PA.panen > 0 ? rr - PA.rateRej : null;
  bullets.push(`Reject rate <b>${mgP(rr, 2)}</b> — ${rr <= target ? 'masih di bawah' : 'di atas'} target ${mgN(target, 0)}%${dRate === null ? '' : `, ${dRate > 0 ? 'naik' : 'turun'} ${mgN(Math.abs(dRate), 2)} poin dari periode sebelumnya`}.`);
  const causes = MG_CAUSES.map(([k, nm]) => ({ nm, v: A.cause[k] })).filter(c => c.v > 0).sort((a, b) => b.v - a.v);
  if (causes.length && A.rej > 0) {
    const c2 = causes[1] ? ` dan ${causes[1].nm} (${mgP(causes[1].v / A.rej * 100, 0)})` : '';
    bullets.push(`Penyebab reject terbesar: <b>${causes[0].nm}</b> (${mgP(causes[0].v / A.rej * 100, 0)})${c2}.`);
  }
  if (M.g1.panen > 0 && M.g2.panen > 0) {
    const hi = M.g1.rateRej >= M.g2.rateRej ? ['GH 1', M.g1, 'GH 2', M.g2] : ['GH 2', M.g2, 'GH 1', M.g1];
    bullets.push(`Reject rate <b>${hi[0]}</b> lebih tinggi (${mgP(hi[1].rateRej, 2)} vs ${mgP(hi[3].rateRej, 2)} di ${hi[2]}).`);
  }
  if (hy) {
    const susut = hy.sent.total - hy.recv.total;
    bullets.push(`Diterima Hyoshii <b>${mgP(hy.pct, 2)}</b> dari yang dikirim (${susut >= 0 ? 'selisih kurang ' : 'selisih lebih '}${mgN(Math.abs(susut))} kg); reject pack Hyoshii <b>${hy.recv.rjTotal} pack</b>.`);
  }

  // KPI
  const kpis = '<table style="width:100%;border-collapse:separate;border-spacing:0;margin:0 -5px;"><tr>'
    + mgKpi('Total Panen', mgN(A.panen) + ' <span style="font-size:13px;font-weight:700;">kg</span>', `${mgN(A.pack, 0)} pack terkirim`, mgDelta(A.panen, PA.panen, true), MG.GREEN)
    + mgKpi('Terkirim', mgP(A.rateKirim), `${mgN(A.kirim)} kg dari panen`, mgDelta(A.rateKirim, PA.panen > 0 ? PA.rateKirim : null, true, 'poin'), MG.GREEN)
    + mgKpi('Reject Rate', `<span style="color:${rrStatus[1]};">${mgP(rr, 2)}</span>`, `<span style="color:${rrStatus[1]};font-weight:700;">${rrStatus[0]}</span> · target ≤ ${mgN(target, 0)}%`, mgDelta(rr, PA.panen > 0 ? PA.rateRej : null, false, 'poin'), rrStatus[1])
    + mgKpi('Diterima Hyoshii', hy ? mgP(hy.pct, 2) : '–', hy ? `${mgN(hy.recv.total)} dari ${mgN(hy.sent.total)} kg` : 'belum ada data Hyoshii', hy && phy ? mgDelta(hy.pct, phy.pct, true, 'poin') : `<span style="color:${MG.MUTE};">belum ada pembanding</span>`, MG.GREEN)
    + '</tr></table>';

  // GH table
  const th = (t, a) => `<th style="padding:7px 8px;font-size:11px;text-align:${a || 'right'};background:${MG.BG};color:${MG.MUTE};border-bottom:2px solid ${MG.LINE};">${t}</th>`;
  const td = (t, b, c) => `<td style="padding:7px 8px;font-size:12.5px;text-align:right;border-bottom:1px solid ${MG.LINE};${b ? 'font-weight:800;' : ''}${c ? 'color:' + c + ';' : ''}">${t}</td>`;
  const tdl = t => `<td style="padding:7px 8px;font-size:12.5px;text-align:left;border-bottom:1px solid ${MG.LINE};color:${MG.MUTE};">${t}</td>`;
  const rrCol = v => (v <= target ? MG.OK : (v <= target * 1.25 ? MG.WARN : MG.BAD));
  const ghRow = (lbl, f, bold, colorFn) => `<tr>${tdl(lbl)}${td(f(M.g1), bold, colorFn && colorFn(M.g1))}${td(f(M.g2), bold, colorFn && colorFn(M.g2))}${td(f(A), true, colorFn && colorFn(A))}</tr>`;
  const ghTable = `<table style="width:100%;border-collapse:collapse;"><thead><tr>${th('', 'left')}${th('GH 1')}${th('GH 2')}${th('Gabungan')}</tr></thead><tbody>
    ${ghRow('Panen (kg)', t => mgN(t.panen))}
    ${ghRow('Terkirim (kg)', t => mgN(t.kirim))}
    ${ghRow('% Terkirim', t => mgP(t.rateKirim))}
    ${ghRow('Reject (kg)', t => mgN(t.rej))}
    ${ghRow('Reject Rate', t => mgP(t.rateRej, 2), true, t => (t.panen > 0 ? rrCol(t.rateRej) : null))}
  </tbody></table>
  <div style="font-size:10.5px;color:${MG.MUTE};margin-top:6px;">Reject Fresh/Frozen yang tercampur GH dibagi otomatis ke GH 1 &amp; GH 2.</div>`;

  // trend
  const bk = mgBuckets(M);
  const chartPanen = mgLineChart(bk.labels, [{ name: 'Panen (kg)', color: MG.GREEN, values: bk.panen }, { name: 'Terkirim (kg)', color: MG.GH2, values: bk.kirim }]);
  const chartRate = mgLineChart(bk.labels, [{ name: 'Reject rate (%)', color: MG.BAD, values: bk.rate }], { target, dec: 1 });
  const trend = `<table style="width:100%;border-collapse:separate;border-spacing:0;"><tr>
    <td style="width:50%;padding-right:10px;vertical-align:top;"><div style="font-size:12px;font-weight:700;color:${MG.INK};margin-bottom:4px;">Panen vs Terkirim${bk.weekly ? ' (per minggu)' : ' (per hari)'}</div>${chartPanen}</td>
    <td style="width:50%;padding-left:10px;vertical-align:top;"><div style="font-size:12px;font-weight:700;color:${MG.INK};margin-bottom:4px;">Reject Rate${bk.weekly ? ' (per minggu)' : ' (per hari)'}</div>${chartRate}</td></tr></table>`;

  // causes
  const maxShare = Math.max(1, ...MG_CAUSES.flatMap(([k]) => [M.g1.rej > 0 ? M.g1.cause[k] / M.g1.rej * 100 : 0, M.g2.rej > 0 ? M.g2.cause[k] / M.g2.rej * 100 : 0]));
  const bar = (v, tot, color) => {
    const share = tot > 0 ? v / tot * 100 : 0;
    return `<div style="margin:2px 0;"><span style="display:inline-block;height:11px;border-radius:3px;background:${color};width:${Math.max(share / maxShare * 62, v > 0 ? 1 : 0)}%;vertical-align:middle;"></span> <span style="font-size:11px;color:${MG.INK};vertical-align:middle;">${v > 0 ? mgN(v) + ' kg · ' + mgP(share, 0) : '–'}</span></div>`;
  };
  const causeRows = MG_CAUSES.map(([k, nm]) => ({ k, nm, tot: M.g1.cause[k] + M.g2.cause[k] })).filter(c => c.tot > 0).sort((a, b) => b.tot - a.tot)
    .map(c => `<tr><td style="padding:5px 6px;font-size:12px;font-weight:700;color:${MG.INK};width:20%;border-bottom:1px solid ${MG.LINE};">${c.nm}</td>
      <td style="padding:3px 6px;border-bottom:1px solid ${MG.LINE};">${bar(M.g1.cause[c.k], M.g1.rej, MG.GH1)}${bar(M.g2.cause[c.k], M.g2.rej, MG.GH2)}</td></tr>`).join('');
  const causeHtml = causeRows
    ? `<div style="font-size:11px;color:${MG.MUTE};margin-bottom:6px;"><span style="display:inline-block;width:10px;height:10px;background:${MG.GH1};border-radius:2px;margin-right:4px;"></span>GH 1 (${mgN(M.g1.rej)} kg)&nbsp;&nbsp;&nbsp;<span style="display:inline-block;width:10px;height:10px;background:${MG.GH2};border-radius:2px;margin-right:4px;"></span>GH 2 (${mgN(M.g2.rej)} kg) · persentase = porsi dari total reject tiap GH</div><table style="width:100%;border-collapse:collapse;">${causeRows}</table>`
    : `<div style="color:${MG.MUTE};font-size:12px;">Belum ada data reject</div>`;

  // Hyoshii
  let hyHtml = '';
  if (hy) {
    const R = hy.recv, S = hy.sent;
    const selCell = (r, s, d) => { const v = r - s; const c = v < 0 ? MG.BAD : (v > 0 ? MG.OK : MG.MUTE); return td((v > 0 ? '+' : '') + mgN(v, d), true, c); };
    const kgRow = (nm, s, r, b) => `<tr>${tdl(nm)}${td(mgN(s), b)}${td(mgN(r), b)}${selCell(r, s, 2)}</tr>`;
    const pkRow = (nm, s, r, rj, b) => `<tr>${tdl(nm)}${td(mgN(s, 0), b)}${td(mgN(r, 0), b)}${selCell(r, s, 0)}${td(rj === null ? '' : (rj ? mgN(rj, 0) : '–'), b)}</tr>`;
    hyHtml = `<table style="width:100%;border-collapse:separate;border-spacing:0;"><tr>
      <td style="width:50%;padding-right:10px;vertical-align:top;"><table style="width:100%;border-collapse:collapse;"><thead><tr>${th('Berat (kg)', 'left')}${th('Kita Kirim')}${th('Diterima')}${th('Selisih')}</tr></thead><tbody>
        ${kgRow('Hatsuhana', S.hatsu, R.hatsu)}${kgRow('Grade A', S.a11, R.a11)}${kgRow('Grade B', S.a15, R.a15)}${kgRow('Reject', S.reject, R.reject)}${kgRow('Total', S.total, R.total, true)}</tbody></table></td>
      <td style="width:50%;padding-left:10px;vertical-align:top;"><table style="width:100%;border-collapse:collapse;"><thead><tr>${th('Pack', 'left')}${th('Kita Kirim')}${th('Diterima')}${th('Selisih')}${th('Reject')}</tr></thead><tbody>
        ${pkRow('Hatsuhana', S.pHatsu, R.pHatsu, R.rjHatsu)}${pkRow('Grade A', S.pA11, R.pA11, R.rjA11)}${pkRow('Grade B', S.pA15, R.pA15, R.rjA15)}${pkRow('Total', S.pTotal, R.pTotal, R.rjTotal, true)}</tbody></table></td></tr></table>`;
    if (hy.ket.length) {
      const items = hy.ket.slice(-5).map(k => `<li style="margin:2px 0;"><b>${mgShort(k.tgl)}</b> — ${mgEsc(k.ket)}</li>`).join('');
      hyHtml += `<div style="margin-top:8px;font-size:11.5px;color:${MG.INK};"><b>Keterangan reject:</b><ul style="margin:4px 0 0 18px;padding:0;">${items}</ul></div>`;
    }
    hyHtml += `<div style="font-size:10.5px;color:${MG.MUTE};margin-top:6px;">Dihitung dari ${hy.hari} hari pengiriman yang sudah ada data Hyoshii-nya.</div>`;
  } else {
    hyHtml = `<div style="color:${MG.MUTE};font-size:12px;">Belum ada data “Diterima Hyoshii” pada periode ini.</div>`;
  }

  const now = new Date();
  const stamp = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  host.innerHTML = `<div id="mgmt-canvas" style="background:${MG.BG};font-family:'Segoe UI',Roboto,Arial,sans-serif;color:${MG.INK};padding:0 0 14px;">
    <div style="background:${MG.GREEN};color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;">
      <table style="width:100%;border-collapse:collapse;"><tr>
        <td style="vertical-align:middle;"><div style="font-size:20px;font-weight:800;color:#ffffff;">Laporan Kinerja Panen &amp; Pengiriman</div>
          <div style="font-size:13px;color:#bbf7d0;margin-top:3px;">${rg.label}</div></td>
        <td style="text-align:right;vertical-align:middle;font-size:13px;font-weight:700;color:#bbf7d0;">PT. Agri Wangi Berry</td></tr></table>
    </div>
    <div style="padding:14px 14px 0;">
      <div style="background:#fff;border:1px solid ${MG.LINE};border-left:5px solid ${MG.GREEN};border-radius:10px;padding:12px 16px;">
        <div style="font-size:13px;font-weight:800;color:${MG.GREEN};margin-bottom:6px;">Ringkasan</div>
        <ul style="margin:0 0 0 18px;padding:0;font-size:13px;line-height:1.55;">${bullets.map(b => `<li style="margin:2px 0;">${b}</li>`).join('')}</ul>
      </div>
      <div style="margin-top:12px;">${kpis}</div>
      ${mgSection('Perbandingan GH 1 vs GH 2', ghTable)}
      ${mgSection('Tren', trend)}
      ${mgSection('Penyebab Reject per GH', causeHtml)}
      ${mgSection('Pengiriman ke Hyoshii: Kirim vs Diterima', hyHtml)}
      <div style="text-align:center;font-size:10.5px;color:${MG.MUTE};margin-top:12px;">Dibuat otomatis oleh aplikasi Processing AWB · ${stamp} · pembanding: ${mgLong(rg.pstart)} – ${mgLong(rg.pend)}</div>
    </div></div>`;
  mgApplyZoom();
}

// ---------- Layar penuh (presentasi) & gambar ----------
function mgApplyZoom() {
  const c = document.getElementById('mgmt-canvas');
  if (!c) return;
  const fs = document.fullscreenElement && document.fullscreenElement.id === 'mgmt-report-wrap';
  c.style.zoom = fs ? String(Math.min(1.8, Math.max(1, window.innerWidth / 1000))) : '';
  c.style.maxWidth = fs ? 'none' : '';
}

function mgFullscreen() {
  const el = document.getElementById('mgmt-report-wrap');
  if (!el) return;
  if (document.fullscreenElement) { document.exitFullscreen(); return; }
  if (el.requestFullscreen) el.requestFullscreen().catch(() => showToast('Layar penuh tidak didukung di perangkat ini', 'error'));
  else showToast('Layar penuh tidak didukung di perangkat ini', 'error');
}
document.addEventListener('fullscreenchange', () => { try { mgApplyZoom(); } catch (e) { /* abaikan */ } });

function mgLoadH2C() {
  return new Promise((resolve, reject) => {
    if (typeof html2canvas !== 'undefined') return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Gagal memuat library gambar. Cek koneksi internet.'));
    document.head.appendChild(s);
  });
}

async function mgSaveImage() {
  const src = document.getElementById('mgmt-canvas');
  if (!src) { showToast('Laporan belum tampil', 'error'); return; }
  const btn = document.getElementById('mgmt-btn-img');
  const label = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Membuat gambar...'; }
  let wrap = null;
  try {
    await mgLoadH2C();
    wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:1000px;background:#f8fafc;';
    const clone = src.cloneNode(true);
    clone.style.zoom = ''; clone.style.maxWidth = 'none';
    wrap.appendChild(clone);
    document.body.appendChild(wrap);
    await new Promise(r => setTimeout(r, 120));
    const canvas = await html2canvas(wrap, { scale: 2, backgroundColor: '#f8fafc', useCORS: true, scrollX: 0, scrollY: 0 });
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    const rg = mgRange();
    const fname = `Laporan_Manajemen_${rg.start}_sd_${rg.end}.png`;
    const file = new File([blob], fname, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Laporan Kinerja Panen & Pengiriman' }); showToast('✅ Gambar siap dibagikan'); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const link = document.createElement('a');
    link.download = fname; link.href = URL.createObjectURL(blob);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 3000);
    showToast('✅ Gambar laporan tersimpan');
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Gagal membuat gambar', 'error');
  } finally {
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    if (btn) { btn.disabled = false; btn.innerHTML = label; }
  }
}

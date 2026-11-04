// ========== ESTIMASI vs AKTUAL ==========
// Estimasi disimpan lokal (localStorage) per tanggal. Aktual dibaca dari data panen yang sudah ada.
const ESTIMASI_STORAGE_KEY = 'estimasi_awb_v1';
let estPending = [];

const EST_GRADE = {
  hatsu: { e: 'e_hatsu',  p: 'p_hatsu',  k: 'k_hatsu', pk: 'pk_hatsu',  m: 'm_hatsu' },
  a:     { e: 'e_gradea', p: 'p_gradea', k: 'k_a11',   pk: 'pk_gradea', m: 'm_a11' },
  b:     { e: 'e_gradeb', p: 'p_gradeb', k: 'k_a15',   pk: 'pk_gradeb', m: 'm_a15' }
};
const EST_FIELDS = ['e_hatsu', 'e_gradea', 'e_gradeb', 'e_frozen', 'pk_hatsu', 'pk_gradea', 'pk_gradeb'];

function estLoad() {
  try { const x = JSON.parse(localStorage.getItem(ESTIMASI_STORAGE_KEY) || '[]'); return Array.isArray(x) ? x : []; }
  catch (e) { return []; }
}
function estSave(arr) { localStorage.setItem(ESTIMASI_STORAGE_KEY, JSON.stringify(arr)); }

// ---------- tanggal ----------
function estYmd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function estParseYmd(s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function estLabel(ymd) {
  return estParseYmd(ymd).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
}
function estMonday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Senin = 0
  x.setDate(x.getDate() - day);
  return x;
}

function estShortcut(kind) {
  const today = new Date();
  let from, to;
  if (kind === 'minggu-ini') { from = estMonday(today); to = new Date(from); to.setDate(to.getDate() + 6); }
  else if (kind === 'minggu-lalu') { from = estMonday(today); from.setDate(from.getDate() - 7); to = new Date(from); to.setDate(to.getDate() + 6); }
  else { to = new Date(today); from = new Date(today); from.setDate(from.getDate() - 6); }
  document.getElementById('est-dari').value = estYmd(from);
  document.getElementById('est-sampai').value = estYmd(to);
  renderEstimasi();
}

function initEstimasi() {
  const d = document.getElementById('est-dari');
  if (d && !d.value) estShortcut('minggu-ini');
}

function estToggleImport() {
  const c = document.getElementById('est-import-card');
  if (c) c.style.display = c.style.display === 'none' ? 'block' : 'none';
}

// ---------- parsing tempel dari Sheet ----------
function estNum(v) {
  v = String(v == null ? '' : v).trim().replace(/\s/g, '');
  if (!v) return 0;
  if (v.includes(',') && v.includes('.')) v = v.replace(/,/g, '');
  else if (v.includes(',')) v = v.replace(',', '.');
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function estSplitLine(line) {
  return (line.indexOf('\t') >= 0 ? line.split('\t') : line.trim().split(/\s+/)).map(c => c.trim());
}

function estParseDateCell(cell, fmt) {
  const s = String(cell || '').trim();
  let m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return null;
  let a = parseInt(m[1], 10), b = parseInt(m[2], 10), y = parseInt(m[3], 10);
  if (y < 100) y += 2000;
  const mo = fmt === 'dmy' ? b : a;
  const da = fmt === 'dmy' ? a : b;
  if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;
  return y + '-' + String(mo).padStart(2, '0') + '-' + String(da).padStart(2, '0');
}

function estDetectFmt(lines) {
  let dmy = false, mdy = false;
  lines.forEach(l => {
    const first = estSplitLine(l)[0] || '';
    const m = first.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (!m) return;
    if (parseInt(m[1], 10) > 12) dmy = true;
    if (parseInt(m[2], 10) > 12) mdy = true;
  });
  if (dmy && !mdy) return 'dmy';
  return 'mdy';
}

function estParsePaste() {
  const text = document.getElementById('est-paste').value || '';
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) { showToast('Tempel datanya dulu!', 'error'); return; }

  let fmt = document.getElementById('est-datefmt').value;
  const auto = fmt === 'auto';
  if (auto) fmt = estDetectFmt(lines);

  const rows = [];
  let skipped = 0;
  lines.forEach(l => {
    const cells = estSplitLine(l);
    const tgl = estParseDateCell(cells[0], fmt);
    if (!tgl) return; // header / baris total
    let rest = cells.slice(1);
    let warn = false;
    if (l.indexOf('\t') < 0) {
      // teks hasil OCR / spasi: ambil token angka saja, 7 terakhir = kolom data (Valve & simbol diabaikan)
      const nums = rest.filter(c => /^[\d.,]+$/.test(c));
      if (nums.length < 4) { skipped++; return; }
      warn = nums.length < 7;
      rest = nums.length >= 7 ? nums.slice(-7) : nums;
    } else {
      if (rest.length >= 8) rest = rest.slice(1); // buang kolom Valve
      if (rest.every(c => c === '' || c == null)) { skipped++; return; } // baris kosong (mis. libur)
    }
    const rec = { tgl: tgl };
    EST_FIELDS.forEach((f, i) => { rec[f] = estNum(rest[i]); });
    if (warn) rec._warn = true;
    rows.push(rec);
  });

  estPending = rows;
  const pv = document.getElementById('est-preview');
  const wrap = document.getElementById('est-save-wrap');
  if (!rows.length) {
    pv.innerHTML = '<div style="color:#dc2626;">Tidak ada baris tanggal yang terbaca. Pastikan blok disalin dari kolom Tanggal.</div>';
    wrap.style.display = 'none';
    return;
  }
  const inp = (i, f, v, w) => `<input type="number" step="any" value="${v}" oninput="estEditPending(${i},'${f}',this.value)" style="width:${w}px;padding:4px;border:1px solid #d1d5db;border-radius:6px;text-align:right;">`;
  const nWarn = rows.filter(r => r._warn).length;
  pv.innerHTML = `
    <div style="font-size:0.85rem;margin-bottom:0.5rem;line-height:1.5;">
      <b>${rows.length}</b> hari terbaca${skipped ? `, ${skipped} baris kosong dilewati` : ''}.
      Format tanggal: <b>${fmt === 'dmy' ? 'Hari/Bulan/Tahun' : 'Bulan/Hari/Tahun'}</b>${auto ? ' (otomatis)' : ''}.
      <b>Cek angkanya</b> — kolom bisa diubah langsung sebelum disimpan.
      ${nWarn ? `<br><span style="color:#b45309;font-weight:700;">⚠️ ${nWarn} baris kuning datanya kurang lengkap, mohon dicek.</span>` : ''}
    </div>
    <div class="table-container"><table>
      <thead><tr><th>Tanggal</th><th class="text-right">Hatsu</th><th class="text-right">A</th><th class="text-right">B</th><th class="text-right">Frozen</th><th class="text-right">Pk Hatsu</th><th class="text-right">Pk A</th><th class="text-right">Pk B</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr${r._warn ? ' style="background:#fef9c3;"' : ''}>
        <td style="white-space:nowrap;"><input type="date" value="${r.tgl}" onchange="estEditPending(${i},'tgl',this.value)" style="padding:4px;border:1px solid #d1d5db;border-radius:6px;"> <small style="color:#6b7280;">${estLabel(r.tgl).split(',')[0]}</small></td>
        ${EST_FIELDS.map(f => `<td class="text-right">${inp(i, f, r[f], f.startsWith('pk_') ? 70 : 62)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  wrap.style.display = 'flex';
}

function estSavePaste() {
  if (!estPending.length) { showToast('Belum ada data. Klik Cek Hasil dulu.', 'error'); return; }
  const db = estLoad();
  estPending.forEach(r => {
    const i = db.findIndex(x => x.tgl === r.tgl);
    if (i >= 0) db[i] = r; else db.push(r);
  });
  estSave(db);
  const n = estPending.length;
  // arahkan periode ke rentang yang baru ditempel
  const dates = estPending.map(r => r.tgl).sort();
  document.getElementById('est-dari').value = dates[0];
  document.getElementById('est-sampai').value = dates[dates.length - 1];
  estPending = [];
  document.getElementById('est-paste').value = '';
  document.getElementById('est-preview').innerHTML = '';
  document.getElementById('est-save-wrap').style.display = 'none';
  document.getElementById('est-import-card').style.display = 'none';
  showToast('✅ Estimasi ' + n + ' hari tersimpan!');
  renderEstimasi();
}

function estClearRange() {
  const dari = document.getElementById('est-dari').value;
  const sampai = document.getElementById('est-sampai').value;
  if (!dari || !sampai) return;
  const db = estLoad();
  const keep = db.filter(x => x.tgl < dari || x.tgl > sampai);
  const n = db.length - keep.length;
  if (!n) { showToast('Tidak ada estimasi di periode ini.', 'error'); return; }
  if (!confirm('Hapus estimasi ' + n + ' hari di periode ini? (Data aktual tidak terhapus)')) return;
  estSave(keep);
  showToast('✅ Estimasi periode ini dihapus');
  renderEstimasi();
}

// ---------- hitung ----------
function estGradeKeys() {
  const g = document.getElementById('est-grade').value;
  return g === 'all' ? ['hatsu', 'a', 'b'] : [g];
}
function estSum(rec, field, grades) {
  if (!rec) return 0;
  return grades.reduce((a, g) => a + (rec[EST_GRADE[g][field]] || 0), 0);
}

function estBuildRows() {
  const dari = document.getElementById('est-dari').value;
  const sampai = document.getElementById('est-sampai').value;
  if (!dari || !sampai || dari > sampai) return [];
  const grades = estGradeKeys();

  const est = {};
  estLoad().forEach(x => { est[x.tgl] = x; });

  // aktual: jumlahkan GH 1 + GH 2 per tanggal; frozen dari GLOBAL
  const act = {};
  JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]').forEach(x => {
    if (!x.tgl || x.tgl < dari || x.tgl > sampai) return;
    const a = act[x.tgl] || (act[x.tgl] = { p_hatsu: 0, p_gradea: 0, p_gradeb: 0, k_hatsu: 0, k_a11: 0, k_a15: 0, m_hatsu: 0, m_a11: 0, m_a15: 0, k_frozen: 0 });
    if (x.gh === 'GLOBAL') { a.k_frozen += x.k_frozen || 0; return; }
    ['p_hatsu', 'p_gradea', 'p_gradeb', 'k_hatsu', 'k_a11', 'k_a15', 'm_hatsu', 'm_a11', 'm_a15'].forEach(k => { a[k] += x[k] || 0; });
  });

  const rows = [];
  const cur = estParseYmd(dari), end = estParseYmd(sampai);
  for (let i = 0; cur <= end && i < 62; i++, cur.setDate(cur.getDate() + 1)) {
    const tgl = estYmd(cur);
    const e = est[tgl] || null, a = act[tgl] || null;
    const hasEst = !!e;
    const hasAct = !!a && ['p_hatsu', 'p_gradea', 'p_gradeb', 'k_hatsu', 'k_a11', 'k_a15', 'm_hatsu', 'm_a11', 'm_a15'].some(k => a[k] > 0);
    const r = {
      tgl, hasEst, hasAct,
      estPanen: estSum(e, 'e', grades), aktPanen: estSum(a, 'p', grades),
      kirim: estSum(a, 'k', grades),
      estPack: estSum(e, 'pk', grades), aktPack: estSum(a, 'm', grades),
      estFrozen: e ? (e.e_frozen || 0) : 0, aktFrozen: a ? (a.k_frozen || 0) : 0
    };
    rows.push(r);
  }
  return rows;
}

function estFmt(n, d) { return (n || 0).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function estPctBadge(pct) {
  const col = pct >= 100 ? '#16a34a' : (pct >= 90 ? '#d97706' : '#dc2626');
  return `<span style="color:${col};font-weight:800;">${pct.toFixed(1)}%</span>`;
}

function estCard(title, akt, est, unit, dec, sub) {
  const diff = akt - est;
  const pct = est > 0 ? akt / est * 100 : 0;
  const col = diff >= 0 ? '#16a34a' : '#dc2626';
  return `<div style="background:#fff;border:1.5px solid #e5e7eb;border-radius:10px;padding:0.875rem;">
    <div style="font-size:0.7rem;font-weight:800;color:#6b7280;text-transform:uppercase;">${title}</div>
    <div style="font-size:1.35rem;font-weight:800;color:#111;margin:0.25rem 0;">${estFmt(akt, dec)} <small style="font-size:0.75rem;color:#6b7280;">${unit}</small></div>
    <div style="font-size:0.8rem;color:#555;">Estimasi: <b>${estFmt(est, dec)}</b> ${unit}</div>
    <div style="font-size:0.8rem;margin-top:0.25rem;">Selisih: <b style="color:${col};">${diff >= 0 ? '+' : ''}${estFmt(diff, dec)}</b> · ${est > 0 ? estPctBadge(pct) : '-'}</div>
    ${sub ? `<div style="font-size:0.72rem;color:#6b7280;margin-top:0.35rem;">${sub}</div>` : ''}
  </div>`;
}

// ---------- render ----------
function renderEstimasi() {
  const body = document.getElementById('est-table-body');
  if (!body) return;
  const rows = estBuildRows();

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="13" class="text-center" style="color:#999;">Pilih periode</td></tr>';
    document.getElementById('est-summary').innerHTML = '';
    document.getElementById('est-chart').innerHTML = '';
    return;
  }

  // dibandingkan hanya untuk hari yang punya estimasi DAN aktual
  const cmp = rows.filter(r => r.hasEst && r.hasAct);
  const T = { estPanen: 0, aktPanen: 0, kirim: 0, estPack: 0, aktPack: 0, estFrozen: 0, aktFrozen: 0 };
  cmp.forEach(r => { Object.keys(T).forEach(k => { T[k] += r[k]; }); });
  const sisaEst = rows.filter(r => r.hasEst && !r.hasAct).reduce((a, r) => a + r.estPanen, 0);
  const totalEst = rows.filter(r => r.hasEst).reduce((a, r) => a + r.estPanen, 0);
  const nEst = rows.filter(r => r.hasEst).length;

  const kgpEst = T.estPack > 0 ? T.estPanen / T.estPack : 0;
  const kgpAkt = T.aktPack > 0 ? T.kirim / T.aktPack : 0;

  const sum = document.getElementById('est-summary');
  if (!nEst) {
    sum.innerHTML = '<div class="card" style="color:#666;">Belum ada estimasi di periode ini. Klik <b>📋 Tempel Estimasi</b> di kanan atas untuk memasukkan dari Sheet.</div>';
  } else {
    sum.innerHTML = `
      <div style="font-size:0.8rem;color:#666;margin:0 0.25rem 0.5rem;">Dibandingkan: <b>${cmp.length}</b> hari yang sudah ada data aktual dari <b>${nEst}</b> hari berestimasi
        · Estimasi satu periode penuh <b>${estFmt(totalEst, 1)}</b> Kg${sisaEst > 0 ? ` · belum terpakai <b>${estFmt(sisaEst, 1)}</b> Kg` : ''}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:0.75rem;margin-bottom:1rem;">
        ${estCard('Panen', T.aktPanen, T.estPanen, 'Kg', 1, 'Kirim aktual: ' + estFmt(T.kirim, 1) + ' Kg')}
        ${estCard('Pack', T.aktPack, T.estPack, 'pack', 0, '')}
        ${estCard('Kg per Pack', kgpAkt, kgpEst, 'Kg', 3, 'Aktual = kirim ÷ pack · Estimasi = panen ÷ pack')}
        ${estCard('Frozen', T.aktFrozen, T.estFrozen, 'Kg', 1, 'Aktual = reject frozen dikirim')}
      </div>`;
  }

  // tabel
  let html = rows.map(r => {
    const dPanen = r.aktPanen - r.estPanen;
    const dPack = r.aktPack - r.estPack;
    const both = r.hasEst && r.hasAct;
    const kgpE = r.estPack > 0 ? r.estPanen / r.estPack : 0;
    const kgpA = r.aktPack > 0 ? r.kirim / r.aktPack : 0;
    const dash = '<span style="color:#cbd5e1;">–</span>';
    const col = v => v >= 0 ? '#16a34a' : '#dc2626';
    return `<tr>
      <td style="white-space:nowrap;"><b>${estLabel(r.tgl)}</b></td>
      <td class="text-right">${r.hasEst ? estFmt(r.estPanen, 1) : dash}</td>
      <td class="text-right">${r.hasAct ? estFmt(r.aktPanen, 1) : dash}</td>
      <td class="text-right" style="color:${col(dPanen)};font-weight:700;">${both ? (dPanen >= 0 ? '+' : '') + estFmt(dPanen, 1) : dash}</td>
      <td class="text-right">${both && r.estPanen > 0 ? estPctBadge(r.aktPanen / r.estPanen * 100) : dash}</td>
      <td class="text-right">${r.hasAct ? estFmt(r.kirim, 1) : dash}</td>
      <td class="text-right">${r.hasEst ? estFmt(r.estPack, 0) : dash}</td>
      <td class="text-right">${r.hasAct ? estFmt(r.aktPack, 0) : dash}</td>
      <td class="text-right" style="color:${col(dPack)};font-weight:700;">${both ? (dPack >= 0 ? '+' : '') + estFmt(dPack, 0) : dash}</td>
      <td class="text-right">${r.hasEst && kgpE > 0 ? estFmt(kgpE, 3) : dash}</td>
      <td class="text-right">${r.hasAct && kgpA > 0 ? estFmt(kgpA, 3) : dash}</td>
      <td class="text-right">${r.hasEst ? estFmt(r.estFrozen, 1) : dash}</td>
      <td class="text-right">${r.hasAct || r.aktFrozen > 0 ? estFmt(r.aktFrozen, 1) : dash}</td>
    </tr>`;
  }).join('');
  if (cmp.length) {
    const dP = T.aktPanen - T.estPanen, dK = T.aktPack - T.estPack;
    html += `<tr style="background:#f3f4f6;font-weight:800;">
      <td>TOTAL (${cmp.length} hari)</td>
      <td class="text-right">${estFmt(T.estPanen, 1)}</td><td class="text-right">${estFmt(T.aktPanen, 1)}</td>
      <td class="text-right">${dP >= 0 ? '+' : ''}${estFmt(dP, 1)}</td>
      <td class="text-right">${T.estPanen > 0 ? estPctBadge(T.aktPanen / T.estPanen * 100) : '-'}</td>
      <td class="text-right">${estFmt(T.kirim, 1)}</td>
      <td class="text-right">${estFmt(T.estPack, 0)}</td><td class="text-right">${estFmt(T.aktPack, 0)}</td>
      <td class="text-right">${dK >= 0 ? '+' : ''}${estFmt(dK, 0)}</td>
      <td class="text-right">${kgpEst > 0 ? estFmt(kgpEst, 3) : '–'}</td><td class="text-right">${kgpAkt > 0 ? estFmt(kgpAkt, 3) : '–'}</td>
      <td class="text-right">${estFmt(T.estFrozen, 1)}</td><td class="text-right">${estFmt(T.aktFrozen, 1)}</td>
    </tr>`;
  }
  body.innerHTML = html;

  estRenderChart(rows);
}

function estRenderChart(rows) {
  const el = document.getElementById('est-chart');
  const metric = document.getElementById('est-chart-metric').value;
  const data = rows.map(r => ({
    tgl: r.tgl,
    est: r.hasEst ? (metric === 'panen' ? r.estPanen : r.estPack) : null,
    akt: r.hasAct ? (metric === 'panen' ? r.aktPanen : r.aktPack) : null
  }));
  if (!data.some(d => d.est !== null || d.akt !== null)) { el.innerHTML = '<div style="color:#999;padding:1rem;">Belum ada data untuk grafik</div>'; return; }

  const dec = metric === 'panen' ? 0 : 0;
  const max = Math.max(1, ...data.map(d => Math.max(d.est || 0, d.akt || 0)));
  const slot = 44, W = Math.max(320, data.length * slot + 30), H = 220, top = 20, bottom = 34, ch = H - top - bottom;
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:none;">`;
  svg += `<line x1="10" y1="${top + ch}" x2="${W - 10}" y2="${top + ch}" stroke="#d1d5db"/>`;
  data.forEach((d, i) => {
    const x0 = 15 + i * slot;
    const bw = 15;
    const draw = (v, off, color) => {
      if (v === null) return '';
      const h = Math.max(1, v / max * ch);
      return `<rect x="${x0 + off}" y="${top + ch - h}" width="${bw}" height="${h}" fill="${color}" rx="2"/>` +
             `<text x="${x0 + off + bw / 2}" y="${top + ch - h - 3}" font-size="8" text-anchor="middle" fill="#374151">${Math.round(v)}</text>`;
    };
    svg += draw(d.est, 0, '#94a3b8') + draw(d.akt, bw + 2, '#16a34a');
    const dd = estParseYmd(d.tgl);
    svg += `<text x="${x0 + bw}" y="${H - 18}" font-size="9" text-anchor="middle" fill="#6b7280">${dd.getDate()}/${dd.getMonth() + 1}</text>`;
    svg += `<text x="${x0 + bw}" y="${H - 7}" font-size="8" text-anchor="middle" fill="#9ca3af">${dd.toLocaleDateString('id-ID', { weekday: 'short' })}</text>`;
  });
  svg += '</svg>';
  el.innerHTML = svg;
}

function estEditPending(i, field, val) {
  if (!estPending[i]) return;
  estPending[i][field] = field === 'tgl' ? val : estNum(val);
  if (field !== 'tgl') delete estPending[i]._warn;
}

// ---------- baca dari screenshot (OCR) ----------
const EST_TESS_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';

function estLoadTesseract() {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve();
    const sc = document.createElement('script');
    sc.src = EST_TESS_URL;
    sc.onload = () => resolve();
    sc.onerror = () => reject(new Error('Gagal memuat pembaca gambar. Pastikan internet aktif.'));
    document.head.appendChild(sc);
  });
}

function estOcrStatus(msg, isErr) {
  const el = document.getElementById('est-ocr-status');
  if (!el) return;
  el.textContent = msg || '';
  el.style.color = isErr ? '#dc2626' : '#555';
}

async function estOcrFile(file) {
  if (!file) return;
  try {
    estOcrStatus('Memuat pembaca gambar (butuh internet, pertama kali agak lama)...');
    await estLoadTesseract();
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => { if (m.status === 'recognizing text') estOcrStatus('Membaca gambar... ' + Math.round((m.progress || 0) * 100) + '%'); }
    });
    await worker.setParameters({ tessedit_pageseg_mode: '4', preserve_interword_spaces: '1' });
    const res = await worker.recognize(file);
    await worker.terminate();
    document.getElementById('est-paste').value = res.data.text;
    estOcrStatus('Selesai. Cek hasilnya di bawah, perbaiki kalau ada angka yang salah.');
    estParsePaste();
  } catch (e) {
    estOcrStatus(String(e && e.message ? e.message : e), true);
  }
}

function estOnPickImage(input) {
  const f = input.files && input.files[0];
  input.value = '';
  estOcrFile(f);
}

// tempel gambar (Ctrl+V) langsung di kotak tempel
function estHandlePaste(ev) {
  const items = (ev.clipboardData && ev.clipboardData.items) || [];
  for (const it of items) {
    if (it.type && it.type.indexOf('image') === 0) {
      ev.preventDefault();
      estOcrFile(it.getAsFile());
      return;
    }
  }
}

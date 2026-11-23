// ========== DATA DITERIMA HYOSHII ==========
// 1 record = 1 tanggal kirim (satu kesatuan, tidak dipisah GH)
const HY_NUM_ALL = ['hk_hatsu', 'hk_a11', 'hk_a15', 'hk_rfresh', 'hk_frozen', 'hp_hatsu', 'hp_a11', 'hp_a15', 'hr_sampel', 'hr_qc', 'hr_lain'];

function hyEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function hyDb() { return readArrayRaw(nativeStorage.getItem(HYOSHII_STORAGE_KEY)); }
function hySaveDb(arr) { localStorage.setItem(HYOSHII_STORAGE_KEY, JSON.stringify(arr)); }
function hyFmtTgl(t) { return String(t || '').split('-').reverse().join('/'); }
function hyN(v, d) { return (Number(v) || 0).toFixed(d === undefined ? 2 : d); }
function hySigned(v, d) {
  const n = Math.round((Number(v) || 0) * 100) / 100;
  if (n === 0) return '0';
  return (n > 0 ? '+' : '') + n.toFixed(d === undefined ? 2 : d);
}
function hySelColor(v) { const n = Math.round((Number(v) || 0) * 100) / 100; return n < 0 ? '#dc2626' : (n > 0 ? '#16a34a' : '#64748b'); }

// Data yang KITA kirim (Rekap Panen) pada tanggal tsb: total semua GH + reject fresh/frozen
function hySent(tgl) {
  const s = { k_hatsu: 0, k_a11: 0, k_a15: 0, k_rfresh: 0, k_frozen: 0, m_hatsu: 0, m_a11: 0, m_a15: 0 };
  readArrayRaw(nativeStorage.getItem(PANEN_STORAGE_KEY)).forEach(x => {
    if (x.tgl !== tgl) return;
    Object.keys(s).forEach(k => { s[k] += Number(x[k]) || 0; });
  });
  return s;
}

function hyFormVals() {
  const g = id => num((document.getElementById(id) || {}).value);
  return {
    hk_hatsu: g('hy-hk-hatsu'), hk_a11: g('hy-hk-a11'), hk_a15: g('hy-hk-a15'), hk_rfresh: g('hy-hk-rfresh'), hk_frozen: g('hy-hk-frozen'),
    hp_hatsu: g('hy-hp-hatsu'), hp_a11: g('hy-hp-a11'), hp_a15: g('hy-hp-a15'),
    hr_sampel: g('hy-hr-sampel'), hr_qc: g('hy-hr-qc'), hr_lain: g('hy-hr-lain'),
    h_ket: ((document.getElementById('hy-ket') || {}).value || '').trim()
  };
}

function hySetForm(rec) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = (v === undefined || v === null || v === 0) ? '' : v; };
  const r = rec || {};
  set('hy-hk-hatsu', r.hk_hatsu); set('hy-hk-a11', r.hk_a11); set('hy-hk-a15', r.hk_a15); set('hy-hk-rfresh', r.hk_rfresh); set('hy-hk-frozen', r.hk_frozen);
  set('hy-hp-hatsu', r.hp_hatsu); set('hy-hp-a11', r.hp_a11); set('hy-hp-a15', r.hp_a15);
  set('hy-hr-sampel', r.hr_sampel); set('hy-hr-qc', r.hr_qc); set('hy-hr-lain', r.hr_lain);
  const ket = document.getElementById('hy-ket'); if (ket) ket.value = r.h_ket || '';
}

function hyOnKeyChange() { hyLoadForm(); }

function hyLoadForm() {
  const tgl = document.getElementById('hy-tgl').value;
  const rec = hyDb().find(x => x.tgl === tgl);
  hySetForm(rec);
  const st = document.getElementById('hy-status');
  if (st) { st.textContent = rec ? '✓ sudah ada data (akan ditimpa)' : 'belum ada data'; st.className = 'pn-status ' + (rec ? 'ok' : 'empty'); }
  const del = document.getElementById('hy-btn-del');
  if (del) del.style.display = rec ? 'inline-flex' : 'none';
  hyUpdateCompare();
}

function hyUpdateCompare() {
  const box = document.getElementById('hy-compare');
  if (!box) return;
  const s = hySent(document.getElementById('hy-tgl').value);
  const v = hyFormVals();
  const row = (lbl, kirim, terima, isPack, bold) => {
    const sel = terima - kirim;
    const f = x => isPack ? Math.round(x) : hyN(x);
    return `<tr${bold ? ' style="font-weight:700;"' : ''}><td>${lbl}</td><td class="text-right">${f(kirim)}</td><td class="text-right">${f(terima)}</td><td class="text-right" style="font-weight:700;color:${hySelColor(sel)};">${hySigned(sel, isPack ? 0 : 2)}</td></tr>`;
  };
  const sentKg = s.k_hatsu + s.k_a11 + s.k_a15 + s.k_rfresh + s.k_frozen, recvKg = v.hk_hatsu + v.hk_a11 + v.hk_a15 + v.hk_rfresh + v.hk_frozen;
  const sentPack = s.m_hatsu + s.m_a11 + s.m_a15, recvPack = v.hp_hatsu + v.hp_a11 + v.hp_a15;
  let html = `<table class="recap-table" style="min-width:0;width:100%;"><thead><tr><th class="th-base">Berat (kg)</th><th class="th-kirim">Kita Kirim</th><th class="th-hy">Diterima</th><th class="th-hysel">Selisih</th></tr></thead><tbody>
    ${row('Hatsuhana', s.k_hatsu, v.hk_hatsu)}${row('Grade A', s.k_a11, v.hk_a11)}${row('Grade B', s.k_a15, v.hk_a15)}
    ${row('Reject Fresh', s.k_rfresh, v.hk_rfresh)}${row('Reject Frozen', s.k_frozen, v.hk_frozen)}${row('Total', sentKg, recvKg, false, true)}</tbody></table>`;
  html += `<table class="recap-table" style="min-width:0;width:100%;margin-top:0.5rem;"><thead><tr><th class="th-base">Pack</th><th class="th-mika">Kita Kirim</th><th class="th-hy">Diterima</th><th class="th-hysel">Selisih</th></tr></thead><tbody>
    ${row('Hatsuhana', s.m_hatsu, v.hp_hatsu, true)}${row('Grade A', s.m_a11, v.hp_a11, true)}${row('Grade B', s.m_a15, v.hp_a15, true)}${row('Total', sentPack, recvPack, true, true)}</tbody></table>`;
  const hilang = sentPack - recvPack, rej = v.hr_sampel + v.hr_qc + v.hr_lain;
  if (sentPack > 0 || recvPack > 0) {
    if (hilang === rej) html += `<div class="info-box" style="margin-top:0.5rem;">✓ Selisih pack <b>${hilang}</b> sama dengan total reject tercatat (<b>${rej}</b>).</div>`;
    else html += `<div class="warn-box" style="margin-top:0.5rem;">⚠️ Pack kurang <b>${hilang}</b>, tapi reject (sampel + QC + lainnya) tercatat <b>${rej}</b>. Cek lagi jumlah atau alasan rejectnya.</div>`;
  }
  box.innerHTML = html;
}

function hySimpan() {
  const tgl = document.getElementById('hy-tgl').value;
  if (!tgl) { showToast('Pilih tanggal dulu', 'error'); return; }
  const v = hyFormVals();
  const rec = { id: null, tgl };
  HY_NUM_ALL.forEach(k => { rec[k] = v[k]; });
  rec.h_ket = v.h_ket;
  if (!HY_NUM_ALL.some(k => rec[k] > 0) && !rec.h_ket) { showToast('Isi minimal 1 data!', 'error'); return; }
  const db = hyDb();
  const idx = db.findIndex(x => x.tgl === tgl);
  if (idx >= 0) { rec.id = db[idx].id; db[idx] = rec; } else { rec.id = generateId(); db.push(rec); }
  hySaveDb(db);
  showToast('✅ Data Hyoshii tersimpan');
  hyLoadForm();
  renderHyoshii();
  try { updateDashboard(); } catch (e) { /* abaikan */ }
}

function hyHapusForm() {
  const rec = hyDb().find(x => x.tgl === document.getElementById('hy-tgl').value);
  if (rec) hyHapus(rec.id);
}

function hyHapus(id) {
  if (!confirm('Hapus data Hyoshii ini?')) return;
  hySaveDb(hyDb().filter(x => String(x.id) !== String(id)));
  showToast('🗑️ Data dihapus');
  hyLoadForm();
  renderHyoshii();
  try { updateDashboard(); } catch (e) { /* abaikan */ }
}

function hyEdit(id) {
  const rec = hyDb().find(x => String(x.id) === String(id));
  if (!rec) return;
  document.getElementById('hy-tgl').value = rec.tgl;
  hyLoadForm();
  window.scrollTo(0, 0);
}

function renderHyoshii() {
  const body = document.getElementById('hy-hist-body');
  if (!body) return;
  const bulanEl = document.getElementById('hy-hist-bulan');
  const bulan = bulanEl ? bulanEl.value : '';
  const db = hyDb().filter(x => !bulan || (x.tgl || '').startsWith(bulan)).sort((a, b) => b.tgl.localeCompare(a.tgl));
  const foot = document.getElementById('hy-hist-foot');
  if (!db.length) { body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;">Belum ada data pada bulan ini</td></tr>'; foot.innerHTML = ''; return; }
  const T = { kgS: 0, kgR: 0, pkS: 0, pkR: 0, rej: 0 };
  body.innerHTML = db.map(x => {
    const s = hySent(x.tgl);
    const kgS = s.k_hatsu + s.k_a11 + s.k_a15 + s.k_rfresh + s.k_frozen;
    const kgR = (x.hk_hatsu || 0) + (x.hk_a11 || 0) + (x.hk_a15 || 0) + (x.hk_rfresh || 0) + (x.hk_frozen || 0);
    const pkS = s.m_hatsu + s.m_a11 + s.m_a15, pkR = (x.hp_hatsu || 0) + (x.hp_a11 || 0) + (x.hp_a15 || 0);
    const rej = (x.hr_sampel || 0) + (x.hr_qc || 0) + (x.hr_lain || 0);
    T.kgS += kgS; T.kgR += kgR; T.pkS += pkS; T.pkR += pkR; T.rej += rej;
    const ketRej = [x.hr_sampel ? 'Sampel ' + x.hr_sampel : '', x.hr_qc ? 'QC ' + x.hr_qc : '', x.hr_lain ? 'Lain ' + x.hr_lain : ''].filter(Boolean).join(', ');
    return `<tr>
      <td style="white-space:nowrap;"><button class="btn btn-sm btn-secondary" onclick="hyEdit('${x.id}')" title="Edit">✏</button> <button class="btn btn-sm btn-danger" onclick="hyHapus('${x.id}')" title="Hapus">🗑️</button></td>
      <td>${hyFmtTgl(x.tgl)}</td>
      <td class="text-right">${hyN(kgR)}</td>
      <td class="text-right" style="font-weight:700;color:${hySelColor(kgR - kgS)};">${hySigned(kgR - kgS)}</td>
      <td class="text-right">${Math.round(pkR)}</td>
      <td class="text-right" style="font-weight:700;color:${hySelColor(pkR - pkS)};">${hySigned(pkR - pkS, 0)}</td>
      <td style="font-size:0.8rem;">${rej ? rej + ' (' + ketRej + ')' : '-'}${x.h_ket ? '<br><small style="color:#666;">' + hyEsc(x.h_ket) + '</small>' : ''}</td>
    </tr>`;
  }).join('');
  const c = 'background:#2d5016;color:#fff;font-weight:bold;text-align:right;';
  foot.innerHTML = `<tr><td colspan="2" style="${c}text-align:center;">TOTAL</td><td style="${c}">${hyN(T.kgR)}</td><td style="${c}">${hySigned(T.kgR - T.kgS)}</td><td style="${c}">${Math.round(T.pkR)}</td><td style="${c}">${hySigned(T.pkR - T.pkS, 0)}</td><td style="${c}">${T.rej}</td></tr>`;
}

function initHyoshii() {
  const today = new Date().toISOString().split('T')[0];
  const t = document.getElementById('hy-tgl'); if (t && !t.value) t.value = today;
  const b = document.getElementById('hy-hist-bulan'); if (b && !b.value) b.value = today.substring(0, 7);
  hyLoadForm();
  renderHyoshii();
}

// ========== IMPORT EXCEL / CSV ==========
const HY_MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, aug: 8, ags: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12 };

function hyParseDate(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return isNaN(v) ? '' : v.toISOString().slice(0, 10);
  if (typeof v === 'number' || /^\d{5}(\.\d+)?$/.test(String(v).trim())) {
    const n = Number(v);
    if (n > 20000 && n < 80000) return new Date(Math.round((n - 25569) * 86400000)).toISOString().slice(0, 10);
    return '';
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
  if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})/);
  if (m && HY_MONTHS[m[2].slice(0, 3).toLowerCase()]) return `${m[3]}-${String(HY_MONTHS[m[2].slice(0, 3).toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

function hyNumCell(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim().replace(/\s/g, '');
  if (s === '' || s === '/' || s === '-') return 0;
  const n = parseFloat(s.includes(',') && !s.includes('.') ? s.replace(',', '.') : s.replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function xlsxCellText(cell) {
  let v = cell.value;
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map(t => t.text).join('');
    if (v.result !== undefined && v.result !== null) return v.result instanceof Date ? v.result.toISOString().slice(0, 10) : String(v.result);
    if (v.text !== undefined) return String(v.text);
    return '';
  }
  return String(v);
}

function xlsxToGrid(ws) {
  const grid = [];
  ws.eachRow({ includeEmpty: true }, (row, rn) => {
    const arr = [];
    for (let c = 1; c <= Math.max(ws.columnCount, 1); c++) arr.push(xlsxCellText(row.getCell(c)).trim());
    grid[rn - 1] = arr;
  });
  for (let i = 0; i < grid.length; i++) if (!grid[i]) grid[i] = [];
  return grid;
}

// Klasifikasi kolom dari teks grup (baris judul) + teks header
function hyClassify(group, header) {
  const g = String(group || '').toUpperCase(), h = String(header || '').toLowerCase().trim();
  if (/^(tanggal|tgl|date)$/.test(h)) return 'tgl';
  if (/^(gh|greenhouse|lokasi)$/.test(h)) return 'gh_skip';
  if (/^(ket|keterangan|catatan)/.test(h)) return 'h_ket';
  const grade = /hatsu/.test(h) ? 'hatsu' : /fresh/.test(h) ? 'rfresh' : /frozen/.test(h) ? 'frozen' : /(grade\s*a|^a$|a11|hy11)/.test(h) ? 'a11' : /(grade\s*b|^b$|a15|hy15)/.test(h) ? 'a15' : '';
  if (/REJECT/.test(g) && !/DITERIMA/.test(g)) {
    if (/sampel|sample/.test(h)) return 'hr_sampel';
    if (/qc/.test(h)) return 'hr_qc';
    if (/lain|other|kurang|rusak/.test(h)) return 'hr_lain';
    return '';
  }
  if (/DITERIMA/.test(g) && /PACK/.test(g) && grade && !/^(frozen|rfresh)$/.test(grade)) return 'hp_' + grade;
  if (/DITERIMA/.test(g) && /(BOBOT|BERAT|KG)/.test(g) && grade) return 'hk_' + grade;
  return '';
}

// Baca worksheet (format template ATAU format spreadsheet rekap Hyoshii) -> baris datar (key template)
function hyParseSheet(ws) {
  const grid = xlsxToGrid(ws);
  // Format datar (header sudah berupa key: tgl, gh, hk_hatsu, ...)
  const first = (grid[0] || []).map(x => x.toLowerCase());
  if (first.includes('tgl') && first.includes('hk_hatsu')) {
    return grid.slice(1).filter(r => r.some(c => c !== '')).map(r => { const o = {}; first.forEach((h, i) => { if (h) o[h] = r[i] || ''; }); return o; });
  }
  // Cari baris header: baris dengan >=2 sel "Hatsu..."
  let hr = -1;
  for (let i = 0; i < grid.length && i < 30; i++) {
    if ((grid[i] || []).filter(c => /^hatsu/i.test(c)).length >= 2) { hr = i; break; }
  }
  if (hr < 0) throw new Error('Header tidak ditemukan. Pakai template (tombol Download Template) atau pastikan ada kolom "Hatsuhana / Grade A / Grade B".');
  const ncol = Math.max(...grid.map(r => r.length));
  const colKey = [];
  let tglCol = -1, ketCol = -1;
  for (let c = 0; c < ncol; c++) {
    const header = (grid[hr] || [])[c] || '';
    let group = '';
    for (let r = hr - 1; r >= Math.max(0, hr - 3); r--) {
      const t = (grid[r] || [])[c] || '';
      if (t && !/^(kg|pack|pcs)$/i.test(t)) { group = t; break; }
    }
    let key = hyClassify(group, header);
    if (!key && !header) key = hyClassify(group, group); // judul tunggal (mis. Tanggal / GH / Keterangan)
    if (!key) {
      for (let r = hr - 1; r >= 0; r--) { const k = hyClassify('', (grid[r] || [])[c] || ''); if (k === 'tgl' || k === 'h_ket') { key = k; break; } }
    }
    if (key === 'tgl' && tglCol < 0) tglCol = c;
    else if (key === 'h_ket' && ketCol < 0) ketCol = c;
    else if (/^h[kpr]_/.test(key) && !colKey.some(x => x && x.key === key)) colKey[c] = { key };
  }
  if (tglCol < 0) { // cari kolom dengan paling banyak tanggal valid
    let best = -1, bestN = 0;
    for (let c = 0; c < ncol; c++) { const n = grid.slice(hr + 1).filter(r => hyParseDate(r[c])).length; if (n > bestN) { bestN = n; best = c; } }
    tglCol = best;
  }
  if (tglCol < 0) throw new Error('Kolom tanggal tidak ditemukan. Beri judul kolom "Tanggal".');
  const found = colKey.filter(Boolean).map(x => x.key);
  if (!found.some(k => /^h[kp]_/.test(k))) throw new Error('Kolom "diterima Hyoshii" tidak ditemukan. Judul grup harus mengandung kata DITERIMA (mis. "BOBOT PENGIRIMAN YANG DITERIMA HYOSHII").');
  const out = [];
  grid.slice(hr + 1).forEach(r => {
    const tgl = hyParseDate(r[tglCol]);
    if (!tgl) return;
    const o = { tgl, h_ket: ketCol >= 0 ? r[ketCol] : '' };
    colKey.forEach((ck, c) => { if (ck) o[ck.key] = hyNumCell(r[c]); });
    out.push(o);
  });
  return out;
}

// Baris datar -> record per tanggal (baris dengan tanggal sama dijumlahkan, mis. GH 1 + GH 2)
function hyRowsToRecords(rows) {
  const map = new Map();
  rows.forEach(r => {
    const tgl = hyParseDate(r.tgl);
    if (!tgl) return;
    const vals = {}; HY_NUM_ALL.forEach(k => { vals[k] = hyNumCell(r[k]); });
    const ket = String(r.h_ket || '').trim();
    if (!HY_NUM_ALL.some(k => vals[k] !== 0) && !ket) return;
    const rec = map.get(tgl) || Object.assign({ id: null, tgl, h_ket: '' }, Object.fromEntries(HY_NUM_ALL.map(k => [k, 0])));
    HY_NUM_ALL.forEach(k => { rec[k] = Math.round((rec[k] + vals[k]) * 100) / 100; });
    if (ket) rec.h_ket = rec.h_ket ? rec.h_ket + '; ' + ket : ket;
    map.set(tgl, rec);
  });
  return [...map.values()];
}

function hyPreviewInfo() {
  const recs = hyRowsToRecords(importState.rows);
  const tg = recs.map(x => x.tgl).sort();
  return `<div class="info-box">Akan jadi <b>${recs.length} record</b> Hyoshii${tg.length ? ` · ${hyFmtTgl(tg[0])} s/d ${hyFmtTgl(tg[tg.length - 1])}` : ''} . Data tanggal yang sudah ada akan <b>ditimpa</b>.</div>`;
}

function hyExecuteImport() {
  const recs = hyRowsToRecords(importState.rows);
  if (!recs.length) { showToast('Tidak ada baris valid.', 'error'); return; }
  const shouldClear = document.getElementById('import-clear').checked;
  __bulkMode = true;
  try {
    let db = shouldClear ? [] : hyDb();
    if (shouldClear) {
      suppressSync = true; nativeStorage.setItem(HYOSHII_STORAGE_KEY, JSON.stringify([])); suppressSync = false;
      queueMutation('hyoshii', 'clear', '__clear__');
    }
    recs.forEach(rec => {
      const i = db.findIndex(x => x.tgl === rec.tgl);
      if (i >= 0) db[i] = Object.assign({}, rec, { id: db[i].id }); else db.push(rec);
    });
    const used = new Set();
    db = db.map(rec => ensureValidId(rec, used));
    hySaveDb(db);
    recs.forEach(rec => { const f = db.find(x => x.tgl === rec.tgl); if (f) queueMutation('hyoshii', 'upsert', f); });
    renderHyoshii(); hyLoadForm();
    try { updateDashboard(); } catch (e) { /* abaikan */ }
    updateSyncStatus();
    showToast(`✅ ${recs.length} data Hyoshii berhasil di-import!`);
    closeImportModal();
  } catch (err) {
    console.error(err);
    showToast('Gagal import: ' + err.message, 'error');
  }
  __bulkMode = false;
  if (isAuthenticated && currentScriptUrl()) setTimeout(() => syncQueue(true), 500);
}

async function hyDownloadTemplate() {
  try { await loadExcelJS(); } catch (e) { showToast(e.message, 'error'); return; }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Diterima Hyoshii');
  const thin = { style: 'thin', color: { argb: 'FFCBD5E1' } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const hdr = (cell, text, argb) => {
    cell.value = text; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.border = border;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  };
  ws.mergeCells(1, 1, 1, 13);
  ws.getCell(1, 1).value = 'Template Import — Data Diterima Hyoshii (1 baris = 1 tanggal; isi mulai baris 4, jangan ubah judul kolom)';
  ws.getCell(1, 1).font = { italic: true, color: { argb: 'FF475569' } };
  ws.mergeCells(2, 1, 3, 1); hdr(ws.getCell(2, 1), 'Tanggal', 'FF2D5016');
  ws.mergeCells(2, 2, 2, 6); hdr(ws.getCell(2, 2), 'BOBOT PENGIRIMAN YANG DITERIMA HYOSHII (kg)', 'FF2F4F9F');
  ['Hatsuhana', 'Grade A', 'Grade B', 'Reject Fresh', 'Reject Frozen'].forEach((t, i) => hdr(ws.getCell(3, 2 + i), t, 'FF2F4F9F'));
  ws.mergeCells(2, 7, 2, 9); hdr(ws.getCell(2, 7), 'TOTAL PACK YANG DITERIMA HYOSHII (pack)', 'FF4F46E5');
  ['Hatsuhana', 'Grade A', 'Grade B'].forEach((t, i) => hdr(ws.getCell(3, 7 + i), t, 'FF4F46E5'));
  ws.mergeCells(2, 10, 2, 12); hdr(ws.getCell(2, 10), 'REJECT HYOSHII (pack)', 'FFB45309');
  ['Sampel', 'Tidak Lolos QC', 'Lainnya'].forEach((t, i) => hdr(ws.getCell(3, 10 + i), t, 'FFB45309'));
  ws.mergeCells(2, 13, 3, 13); hdr(ws.getCell(2, 13), 'Keterangan', 'FF475569');
  const sample = [['2026-11-18', 83.1, 64.0, 20.4, 14.4, 0, 478, 283, 86, 1, 0, 0, 'contoh: 1 pack sampel'], ['2026-11-19', 71.9, 60.1, 22.2, 22.6, 0, 416, 267, 94, 0, 0, 0, '']];
  sample.forEach((row, ri) => row.forEach((v, ci) => {
    const cell = ws.getCell(4 + ri, 1 + ci);
    cell.value = ci === 0 ? new Date(v + 'T00:00:00Z') : v; cell.border = border;
    if (ci === 0) cell.numFmt = 'dd/mm/yyyy';
  }));
  ws.getColumn(1).width = 13;
  for (let c = 2; c <= 12; c++) ws.getColumn(c).width = 13;
  ws.getColumn(13).width = 34; ws.getRow(3).height = 24;
  ws.views = [{ state: 'frozen', ySplit: 3, xSplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  link.download = 'template_diterima_hyoshii.xlsx';
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 3000);
  showToast('📄 Template didownload');
}

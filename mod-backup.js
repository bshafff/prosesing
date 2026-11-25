// ========== BACKUP & PULIHKAN ==========
// 1) Snapshot otomatis (IndexedDB) sebelum data lokal ditimpa / dihapus, plus snapshot harian
// 2) Unduh semua data (JSON)  3) Pulihkan dari file / snapshot  4) Backup Google Sheet ke Google Drive (Apps Script)
const BK_APP = 'awb-processing';
const BK_KEEP = 8;
const BK_DL_KEY = 'awb_last_backup_dl';
const BK_DAILY_KEY = 'awb_last_auto_snapshot';

function bkKeys() {
  return [['lks', LKS_STORAGE_KEY], ['panen', PANEN_STORAGE_KEY], ['kemasan', KEMASAN_STORAGE_KEY], ['hyoshii', HYOSHII_STORAGE_KEY], ['populasi', POPULASI_STORAGE_KEY]];
}
const BK_LABEL = { lks: 'LKS', panen: 'Panen', kemasan: 'Kemasan', hyoshii: 'Diterima Hyoshii', populasi: 'Jumlah Tanaman' };

function bkCollect() {
  const data = {};
  bkKeys().forEach(([type, key]) => { data[type] = readArrayRaw(nativeStorage.getItem(key)); });
  return { app: BK_APP, version: (typeof SYNC_CONFIG !== 'undefined' ? SYNC_CONFIG.VERSION : ''), createdAt: new Date().toISOString(), data };
}
function bkCounts(payload) {
  const d = (payload && payload.data) || {};
  return Object.keys(BK_LABEL).map(t => ({ type: t, n: Array.isArray(d[t]) ? d[t].length : 0 }));
}
function bkHash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return String(h); }
function bkFmt(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// ---------- IndexedDB ----------
function bkOpen() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('IndexedDB tidak tersedia'));
    const req = indexedDB.open('awb_backup', 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('snaps', { keyPath: 'id', autoIncrement: true }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function bkTx(mode, fn) {
  return bkOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction('snaps', mode);
    const store = tx.objectStore('snaps');
    const out = fn(store);
    tx.oncomplete = () => { db.close(); resolve(out && out.result !== undefined ? out.result : out); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}
async function bkList() {
  const rows = await new Promise((resolve, reject) => {
    bkOpen().then(db => {
      const req = db.transaction('snaps', 'readonly').objectStore('snaps').getAll();
      req.onsuccess = () => { db.close(); resolve(req.result || []); };
      req.onerror = () => { db.close(); reject(req.error); };
    }).catch(reject);
  });
  return rows.sort((a, b) => (b.ts - a.ts) || (b.id - a.id)); // terbaru dulu (id menjadi penentu kalau waktunya sama)
}

// Data diambil SEKARANG (sinkron); penyimpanannya async. Tidak pernah melempar error.
function bkSnapshotSafe(reason, opts) {
  opts = opts || {};
  try {
    const payload = bkCollect();
    const json = JSON.stringify(payload.data);
    if (!bkCounts(payload).some(c => c.n > 0)) return Promise.resolve(false); // tidak ada data, tidak perlu
    const hash = bkHash(json);
    return bkList().then(list => {
      if (!opts.force && list[0] && list[0].hash === hash) return false; // sama dengan snapshot terakhir
      return bkTx('readwrite', store => { store.add({ ts: Date.now(), reason, hash, payload }); })
        .then(() => bkList()).then(all => {
          const extra = all.slice(BK_KEEP);
          if (!extra.length) return true;
          return bkTx('readwrite', store => { extra.forEach(r => store.delete(r.id)); }).then(() => true);
        });
    }).catch(err => { console.warn('snapshot gagal:', err); return false; });
  } catch (err) { console.warn('snapshot gagal:', err); return Promise.resolve(false); }
}

// ---------- Unduh ----------
function bkDownload() {
  const payload = bkCollect();
  const total = bkCounts(payload).reduce((a, c) => a + c.n, 0);
  if (!total) { showToast('Belum ada data untuk di-backup', 'error'); return; }
  const d = new Date();
  const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '_' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `backup_awb_processing_${stamp}.json`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 3000);
  try { localStorage.setItem(BK_DL_KEY, String(Date.now())); } catch (e) { /* abaikan */ }
  showToast('✅ Backup diunduh (' + total + ' data)');
  renderBackup();
}

// ---------- Pulihkan ----------
function bkRerender() {
  const call = f => { try { f(); } catch (e) { console.warn('render:', e); } };
  call(() => renderTableLks());
  call(() => renderTablePanen());
  call(() => { if (typeof renderHyoshii === 'function') { renderHyoshii(); hyLoadForm(); } });
  call(() => { if (typeof renderPopulasi === 'function') renderPopulasi(); });
  call(() => recalculateStockKemasan());
  call(() => { renderKemasanForms(); renderKemasanTables(); });
  call(() => updateDashboard());
  call(() => updateSyncStatus());
}

async function bkRestore(payload, label) {
  if (!payload || payload.app !== BK_APP || !payload.data || typeof payload.data !== 'object') { showToast('File bukan backup aplikasi ini', 'error'); return; }
  const counts = bkCounts(payload);
  const ringkas = counts.map(c => `• ${BK_LABEL[c.type]}: ${c.n}`).join('\n');
  if (!confirm(`Pulihkan data dari ${label}?\n\n${ringkas}\n\nData saat ini akan DIGANTI dengan isi backup ini (dan ikut menimpa Google Sheet saat sinkron). Salinan data saat ini disimpan dulu sebagai snapshot.`)) return;
  await bkSnapshotSafe('Sebelum pulihkan backup', { force: true });
  __bulkMode = true;
  try {
    bkKeys().forEach(([type, key]) => {
      if (!Array.isArray(payload.data[type])) return; // tipe yang tidak ada di backup dibiarkan
      const used = new Set();
      const arr = payload.data[type].map(rec => ensureValidId(rec, used));
      localStorage.setItem(key, JSON.stringify(arr));
    });
    bkRerender();
    showToast('✅ Data berhasil dipulihkan');
  } catch (err) {
    console.error(err);
    showToast('Gagal memulihkan: ' + err.message, 'error');
  }
  __bulkMode = false;
  if (isAuthenticated && currentScriptUrl()) setTimeout(() => syncQueue(true), 500);
  renderBackup();
}

function bkRestoreFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let obj = null;
    try { obj = JSON.parse(String(reader.result)); } catch (e) { showToast('File tidak bisa dibaca (bukan JSON)', 'error'); input.value = ''; return; }
    input.value = '';
    bkRestore(obj, 'file “' + file.name + '”');
  };
  reader.readAsText(file);
}

async function bkRestoreSnap(id) {
  try {
    const rows = await bkList();
    const snap = rows.find(r => r.id === id);
    if (!snap) { showToast('Snapshot tidak ditemukan', 'error'); return; }
    bkRestore(snap.payload, 'snapshot ' + bkFmt(snap.ts));
  } catch (e) { showToast('Gagal membaca snapshot', 'error'); }
}

async function bkDeleteSnap(id) {
  if (!confirm('Hapus snapshot ini?')) return;
  try { await bkTx('readwrite', store => { store.delete(id); }); } catch (e) { /* abaikan */ }
  renderBackup();
}

async function bkSnapshotNow() {
  const ok = await bkSnapshotSafe('Manual', { force: true });
  showToast(ok ? '✅ Snapshot tersimpan di perangkat ini' : 'Tidak ada data / snapshot gagal', ok ? undefined : 'error');
  renderBackup();
}

// ---------- Backup Google Sheet ke Google Drive (butuh Code.gs v1.6) ----------
async function bkDriveBackup() {
  if (!isAuthenticated || !currentScriptUrl()) { showToast('Hubungkan ke Google Sheet dulu', 'error'); return; }
  const btn = document.getElementById('bk-btn-drive');
  const label = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Membuat salinan di Drive...'; }
  try {
    const res = await jsonpRequest({ action: 'backup' }, 120000);
    if (!res || !res.ok) throw new Error(res && res.error ? res.error : 'Gagal');
    try { localStorage.setItem('awb_last_drive_backup', String(Date.now())); } catch (e) { /* abaikan */ }
    showToast('✅ Salinan Sheet tersimpan di Google Drive: ' + (res.name || ''));
  } catch (err) {
    showToast('Backup Drive gagal: ' + (err.message || err) + ' (pastikan Code.gs v1.6 sudah di-deploy)', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = label; }
    renderBackup();
  }
}

// ---------- Tampilan ----------
function bkDaysSince(key) {
  const t = parseInt(localStorage.getItem(key) || '0', 10);
  return t ? Math.floor((Date.now() - t) / 86400000) : null;
}

function renderBackupHomeHint() {
  const el = document.getElementById('bk-home-sub');
  if (!el) return;
  const d = bkDaysSince(BK_DL_KEY);
  if (d === null) { el.innerHTML = '<span style="color:#dc2626;font-weight:700;">Belum pernah diunduh</span> · amankan data Anda'; }
  else if (d >= 7) { el.innerHTML = `<span style="color:#d97706;font-weight:700;">${d} hari</span> sejak backup terakhir diunduh`; }
  else { el.textContent = d === 0 ? 'Backup terakhir diunduh hari ini' : `Backup terakhir diunduh ${d} hari lalu`; }
}

async function renderBackup() {
  renderBackupHomeHint();
  const host = document.getElementById('bk-body');
  if (!host) return;
  const cur = bkCounts(bkCollect());
  const dl = bkDaysSince(BK_DL_KEY), dr = bkDaysSince('awb_last_drive_backup');
  const dlTxt = dl === null ? '<span style="color:#dc2626;">belum pernah</span>' : (dl === 0 ? 'hari ini' : dl + ' hari lalu');
  const drTxt = dr === null ? 'belum pernah dari aplikasi' : (dr === 0 ? 'hari ini' : dr + ' hari lalu');
  document.getElementById('bk-status').innerHTML = `<div style="font-size:0.85rem;line-height:1.7;">
    <b>Data di perangkat ini:</b> ${cur.map(c => `${BK_LABEL[c.type]} <b>${c.n}</b>`).join(' · ')}<br>
    <b>Terakhir diunduh:</b> ${dlTxt} &nbsp;·&nbsp; <b>Salinan Drive (dari app):</b> ${drTxt}</div>`;
  let rows = [];
  try { rows = await bkList(); } catch (e) { rows = []; }
  const list = document.getElementById('bk-snaps');
  list.innerHTML = rows.length ? rows.map(r => {
    const c = bkCounts(r.payload).map(x => `${BK_LABEL[x.type]} ${x.n}`).join(', ');
    return `<tr><td style="white-space:nowrap;">${bkFmt(r.ts)}</td><td>${r.reason}</td><td style="font-size:0.75rem;color:#666;">${c}</td>
      <td style="white-space:nowrap;"><button class="btn btn-sm btn-secondary" onclick="bkRestoreSnap(${r.id})">↩ Pulihkan</button> <button class="btn btn-sm btn-danger" onclick="bkDeleteSnap(${r.id})">🗑️</button></td></tr>`;
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#999;">Belum ada snapshot</td></tr>';
}

function initBackup() {
  renderBackupHomeHint();
  // snapshot harian otomatis (cukup sekali per 24 jam, dan hanya kalau data berubah)
  const last = parseInt(localStorage.getItem(BK_DAILY_KEY) || '0', 10);
  if (Date.now() - last > 86400000) {
    setTimeout(() => { bkSnapshotSafe('Otomatis harian').then(() => { try { localStorage.setItem(BK_DAILY_KEY, String(Date.now())); } catch (e) { /* abaikan */ } }); }, 4000);
  }
  // pengingat unduh backup (maks 1x sehari)
  const d = bkDaysSince(BK_DL_KEY);
  const remindTs = parseInt(localStorage.getItem('awb_backup_remind') || '0', 10);
  if ((d === null || d >= 7) && Date.now() - remindTs > 86400000 && bkCounts(bkCollect()).some(c => c.n > 0)) {
    setTimeout(() => { showToast('💾 ' + (d === null ? 'Data belum pernah di-backup.' : d + ' hari belum unduh backup.') + ' Buka menu Backup & Pulihkan.'); try { localStorage.setItem('awb_backup_remind', String(Date.now())); } catch (e) { /* abaikan */ } }, 6000);
  }
}

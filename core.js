// ========== STORAGE KEYS ==========
const LKS_STORAGE_KEY = 'lks_awb_v1';
const PANEN_STORAGE_KEY = 'panen_awb_v1';
const KEMASAN_STORAGE_KEY = 'kemasan_awb_v1';

// ========== KONFIGURASI AUTO-CONNECT ==========
// GANTI BARIS DI BAWAH dengan URL Web App Apps Script kamu (yang diakhiri /exec)
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyIDEcwqyXqyfB6cuJGer5bcphJ4bCWDBRAMBd432Nalz_uXEMWwphLNduxkKgDOtZq_A/exec';

// ========== HELPER: ID GENERATOR (FIXED) ==========
let __idCounter = 0;
function generateId() {
  __idCounter = (__idCounter + 1) % 1000;
  return String(Date.now()) + String(__idCounter).padStart(3, '0');
}

function ensureValidId(rec, usedIds) {
  usedIds = usedIds || new Set();
  const id = String(rec.id || '');
  if (id.length === 16 && !usedIds.has(id)) {
    usedIds.add(id);
    return rec;
  }
  let newId, attempts = 0;
  do {
    newId = generateId();
    attempts++;
  } while (usedIds.has(newId) && attempts < 100);
  usedIds.add(newId);
  return { ...rec, id: newId };
}

// ========== HELPERS ==========
function ghOf(item) { return item && item.gh === 'GH 2' ? 'GH 2' : 'GH 1'; }
function filterGh(arr, gh) { return (!gh || gh === 'all') ? arr : arr.filter(x => ghOf(x) === gh); }
function dashGh() { const el = document.getElementById('dashboard-gh'); return el ? el.value : 'all'; }
function weekGh() { const el = document.getElementById('minggu-gh'); return el ? el.value : 'all'; }
function ghLabelOf(v) { return (!v || v === 'all') ? 'Semua GH' : v; }

function mergeByTgl(arr) {
  const m = new Map();
  arr.forEach(it => {
    if (!m.has(it.tgl)) { m.set(it.tgl, { ...it }); return; }
    const t = m.get(it.tgl);
    Object.keys(it).forEach(k => { if (typeof it[k] === 'number' && k !== 'id') t[k] = (t[k] || 0) + it[k]; });
  });
  return [...m.values()];
}

function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function numOrNull(v) {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function formatBulanIndo(ym) {
  if (!ym) return '-';
  const [y, m] = ym.split('-');
  const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${namaBulan[parseInt(m, 10) - 1]} ${y}`;
}

const masterJenisKemasan = [
  { name: 'Hatsu', std: 200, badge: 'hatsu' },
  { name: 'Grade A', std: 200, badge: 'gradea' },
  { name: 'Grade B', std: 300, badge: 'gradeb' }
];

let currentStockStateKemasan = {
  'Hatsu': { gudang: 0, processing: 0 },
  'Grade A': { gudang: 0, processing: 0 },
  'Grade B': { gudang: 0, processing: 0 }
};

let currentAksesoris = { layer: 0, sleeve: 0, stiker: 0, netfoam: 0 };

function rejMika(it) {
  if (!it) return 0;
  return (it.reject || 0) + (it.rejectTutup || 0) + (it.rejectAlas || 0);
}

function opnameVal(v) { return (typeof v === 'number' && !isNaN(v)) ? v : null; }

// ========== OFFLINE + SHEETS SYNC ==========
const SYNC_CONFIG = { API_KEY: 'AWB_PROCESSING_2026', VERSION: '1.3.0' };

function getEffectiveUrl() {
  return localStorage.getItem('awb_script_url') || DEFAULT_SCRIPT_URL || '';
}

let scriptUrl = getEffectiveUrl();
let isAuthenticated = localStorage.getItem('awb_sync_auth') !== '0' && !!scriptUrl;

function currentScriptUrl() { return scriptUrl; }

function handleAuthClick() {
  if (isAuthenticated) {
    isAuthenticated = false;
    localStorage.setItem('awb_sync_auth', '0');
    updateSyncStatus();
    showToast('Koneksi Google Sheet diputus. Klik Connect lagi untuk menyambung.');
    return;
  }
  const existingCustomUrl = localStorage.getItem('awb_script_url');
  let url;
  if (DEFAULT_SCRIPT_URL && !existingCustomUrl) {
    url = DEFAULT_SCRIPT_URL;
    if (!confirm('Sambung ke Google Sheet default?\n\n' + url)) return;
  } else {
    url = prompt('URL Web App Apps Script (/exec):\n(Who has access = Anyone)', existingCustomUrl || DEFAULT_SCRIPT_URL || '');
    if (!url || !url.trim()) return;
    url = url.trim().replace(/\/$/, '');
  }
  if (url.indexOf('/exec') < 0) { showToast('URL harus mengandung /exec', 'error'); return; }
  scriptUrl = url;
  if (url !== DEFAULT_SCRIPT_URL) {
    localStorage.setItem('awb_script_url', url);
  } else {
    localStorage.removeItem('awb_script_url');
  }
  isAuthenticated = true;
  localStorage.setItem('awb_sync_auth', '1');
  updateSyncStatus();
  showToast('✓ Tersambung — sinkronisasi...');
  syncQueue(true).then(() => {
    if (getSyncQueue().length === 0) pullFromSheet();
    else showToast('Sync belum tuntas, pull dibatalkan otomatis', 'error');
  });
}

const SYNC_QUEUE_KEY = 'awb_sync_queue_v1';
const SYNC_MIGRATION_KEY = 'awb_sync_migration_v1';
const SYNC_LAST_KEY = 'awb_sync_last_v1';
let syncBusy = false;
let suppressSync = false;
let __bulkMode = false;

const nativeStorage = {
  getItem: localStorage.getItem.bind(localStorage),
  setItem: localStorage.setItem.bind(localStorage),
  removeItem: localStorage.removeItem.bind(localStorage)
};

function syncTypeFromKey(key) {
  if (key === LKS_STORAGE_KEY) return 'lks';
  if (key === PANEN_STORAGE_KEY) return 'panen';
  if (key === KEMASAN_STORAGE_KEY) return 'kemasan';
  return null;
}

function readArrayRaw(raw) {
  try { const x = JSON.parse(raw || '[]'); return Array.isArray(x) ? x : []; }
  catch { return []; }
}

function getSyncQueue() { return readArrayRaw(nativeStorage.getItem(SYNC_QUEUE_KEY)); }

function saveSyncQueue(queue) {
  nativeStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  updateSyncStatus();
  if (isAuthenticated && !syncBusy && !__bulkMode && queue.length > 0) syncQueue();
}

function queueMutation(type, action, recordOrId) {
  if (!type || suppressSync) return;
  let queue = getSyncQueue();
  const id = typeof recordOrId === 'object' ? String(recordOrId.id) : String(recordOrId);
  queue = queue.filter(x => !(x.type === type && String(x.id) === id));
  if (action === 'clear') {
    queue = queue.filter(x => x.type !== type);
    queue.push({ type, action: 'clear', id: '__clear__', queuedAt: Date.now() });
  } else if (action === 'delete') {
    queue.push({ type, action: 'delete', id, queuedAt: Date.now() });
  } else if (action === 'upsert') {
    queue.push({ type, action: 'upsert', id, record: recordOrId, queuedAt: Date.now() });
  }
  saveSyncQueue(queue);
}

function diffAndQueue(type, oldRaw, newRaw) {
  if (suppressSync) return;
  const oldArr = readArrayRaw(oldRaw);
  const newArr = readArrayRaw(newRaw);
  const oldMap = new Map(oldArr.map(x => [String(x.id), x]));
  const newMap = new Map(newArr.map(x => [String(x.id), x]));
  newMap.forEach((record, id) => {
    const old = oldMap.get(id);
    if (!old || JSON.stringify(old) !== JSON.stringify(record)) queueMutation(type, 'upsert', record);
  });
  oldMap.forEach((_, id) => { if (!newMap.has(id)) queueMutation(type, 'delete', id); });
}

localStorage.setItem = function(key, value) {
  const type = syncTypeFromKey(key);
  const oldRaw = type ? nativeStorage.getItem(key) : null;
  nativeStorage.setItem(key, value);
  if (type) diffAndQueue(type, oldRaw, value);
};

localStorage.removeItem = function(key) {
  const type = syncTypeFromKey(key);
  const oldRaw = type ? nativeStorage.getItem(key) : null;
  nativeStorage.removeItem(key);
  if (type && !suppressSync) {
    if (type === 'kemasan') queueMutation(type, 'clear', '__clear__');
    else readArrayRaw(oldRaw).forEach(record => queueMutation(type, 'delete', String(record.id)));
  }
  if (type) updateSyncStatus();
};

function base64Utf8Encode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

function jsonpRequest(params, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    if (!currentScriptUrl() || currentScriptUrl().indexOf('/exec') < 0) {
      reject(new Error('Belum Connect Sheets.'));
      return;
    }
    const callback = 'awbJsonp_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    let timer;
    const cleanup = () => { clearTimeout(timer); delete window[callback]; script.remove(); };
    window[callback] = data => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error('Gagal menghubungi Apps Script.')); };
    const query = new URLSearchParams({ ...params, callback, key: SYNC_CONFIG.API_KEY }).toString();
    script.src = currentScriptUrl() + (currentScriptUrl().includes('?') ? '&' : '?') + query;
    timer = setTimeout(() => { cleanup(); reject(new Error('Timeout sinkronisasi.')); }, timeoutMs);
    document.body.appendChild(script);
  });
}

async function syncQueue(manual) {
  if (!isAuthenticated || !currentScriptUrl()) {
    if (manual) showToast('Tekan "Connect Sheets" dulu.', 'error');
    return;
  }
  if (syncBusy || !navigator.onLine) {
    if (manual && !navigator.onLine) showToast('Sedang offline.', 'error');
    return;
  }
  const initialQueue = getSyncQueue();
  if (!initialQueue.length) {
    updateSyncStatus();
    if (manual) showToast('Tidak ada perubahan untuk disync');
    return;
  }
  syncBusy = true;
  updateSyncStatus('syncing');
  const BATCH_SIZE = 5, MAX_RETRY = 3;
  let totalProcessed = 0;
  try {
    while (true) {
      const current = getSyncQueue();
      if (!current.length) break;
      const batch = current.slice(0, BATCH_SIZE);
      const remaining = current.slice(BATCH_SIZE);
      let success = false, lastErr = null;
      for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
        try {
          const result = await jsonpRequest({ action: 'writeBatch', payload: base64Utf8Encode({ items: batch }) }, 60000);
          if (!result || !result.ok) throw new Error((result && result.error) ? result.error : 'Server menolak data.');
          success = true; break;
        } catch (err) {
          lastErr = err;
          if (attempt < MAX_RETRY) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        }
      }
      if (!success) throw lastErr || new Error('Batch gagal.');
      totalProcessed += batch.length;
      saveSyncQueue(remaining);
      nativeStorage.setItem(SYNC_LAST_KEY, new Date().toISOString());
      await new Promise(r => setTimeout(r, 1000));
    }
    updateSyncStatus();
    if (manual) showToast(`✓ Sinkronisasi selesai (${totalProcessed} data)`);
  } catch (err) {
    console.error(err);
    updateSyncStatus('error', err.message);
    if (manual) showToast('Sync gagal: ' + err.message, 'error');
  } finally { syncBusy = false; }
}

async function pullFromSheet() {
  if (!isAuthenticated || !currentScriptUrl()) { showToast('Tekan "Connect Sheets" dulu.', 'error'); return; }
  if (!navigator.onLine) { showToast('Sedang offline.', 'error'); return; }
  if (!confirm('Muat dari Google Sheet akan MENIMPA data lokal. Lanjutkan?')) return;
  if (getSyncQueue().length) await syncQueue();
  if (getSyncQueue().length) return;
  try {
    updateSyncStatus('syncing');
    const result = await jsonpRequest({ action: 'pull' });
    if (!result || !result.ok) throw new Error(result && result.error ? result.error : 'Gagal pull.');
    suppressSync = true;
    Object.entries(result.data || {}).forEach(([type, records]) => {
      const key = type === 'lks' ? LKS_STORAGE_KEY : type === 'panen' ? PANEN_STORAGE_KEY : KEMASAN_STORAGE_KEY;
      nativeStorage.setItem(key, JSON.stringify(Array.isArray(records) ? records : []));
    });
    suppressSync = false;
    nativeStorage.setItem(SYNC_MIGRATION_KEY, '1');
    renderTableLks(); renderTablePanen();
    recalculateStockKemasan(); renderKemasanForms(); renderKemasanTables(); updateDashboard();
    updateSyncStatus();
  } catch (err) {
    suppressSync = false;
    console.error(err);
    updateSyncStatus('error', err.message);
  }
}

function migrateExistingLocalData() {
  if (nativeStorage.getItem(SYNC_MIGRATION_KEY)) return;
  const sources = [['lks', LKS_STORAGE_KEY], ['panen', PANEN_STORAGE_KEY], ['kemasan', KEMASAN_STORAGE_KEY]];
  const all = [];
  sources.forEach(([type, key]) => {
    readArrayRaw(nativeStorage.getItem(key)).forEach(record => {
      all.push({ type, action: 'upsert', id: String(record.id), record, queuedAt: Date.now() });
    });
  });
  if (all.length) {
    const existing = readArrayRaw(nativeStorage.getItem(SYNC_QUEUE_KEY));
    const seen = new Set(existing.map(x => x.type + ':' + String(x.id)));
    const merged = existing.concat(all.filter(x => !seen.has(x.type + ':' + String(x.id))));
    nativeStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(merged));
  }
  nativeStorage.setItem(SYNC_MIGRATION_KEY, '1');
  updateSyncStatus();
}

function updateSyncStatus(mode, msg) {
  const st = document.getElementById('sync-status');
  const authBtn = document.getElementById('authBtn');
  const pushBtn = document.getElementById('pushBtn');
  const pullBtn = document.getElementById('pullBtn');
  if (!st || !authBtn) return;
  const authed = isAuthenticated && !!currentScriptUrl();
  const pending = getSyncQueue().length;
  if (authed) {
    pushBtn.style.display = pullBtn.style.display = 'inline-flex';
    authBtn.textContent = 'Putuskan';
    authBtn.className = 'btn btn-logout';
  } else {
    pushBtn.style.display = pullBtn.style.display = 'none';
    authBtn.textContent = '☁️ Connect Sheets';
    authBtn.className = 'btn btn-primary';
  }
  st.className = 'auth-status';
  if (!navigator.onLine) {
    st.classList.add('error');
    st.textContent = pending ? `✗ Offline — ${pending} perubahan menunggu` : '✗ Offline';
    return;
  }
  if (mode === 'syncing') { st.classList.add('syncing'); st.textContent = `⟳ Sinkronisasi... (${pending} antrean)`; return; }
  if (mode === 'error') { st.classList.add('error'); st.textContent = '✗ ' + (msg || 'Sync gagal'); return; }
  if (!authed) { st.textContent = 'Belum terhubung ke Google Sheet'; return; }
  st.classList.add('ok');
  st.textContent = pending ? `✓ Terhubung — ${pending} perubahan menunggu Sync` : '✓ Terhubung — Sheet sync aktif';
}

window.addEventListener('online', () => { updateSyncStatus(); if (isAuthenticated) syncQueue(); });
window.addEventListener('offline', () => updateSyncStatus());

// ========== NAVIGATION ==========
function openModule(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}
function goHome() { openModule('home'); }

function showKemasanSubTab(subId, btn) {
  document.querySelectorAll('.k-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(subId).classList.add('active');
  btn.classList.add('active');
}

function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + (type === 'error' ? 'toast-error' : 'toast-success');
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ========== IMPORT CSV ==========
let importState = { type: null, rows: [] };

function parseCSV(text) {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commas = (firstLine.match(/,/g) || []).length;
  const semis  = (firstLine.match(/;/g) || []).length;
  const delim  = semis > commas ? ';' : ',';
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = '';
        if (row.some(x => x !== '')) rows.push(row);
        row = [];
      } else cur += c;
    }
  }
  if (cur !== '' || row.length) { row.push(cur); if (row.some(x => x !== '')) rows.push(row); }
  return rows;
}

function openImportModal(type) {
  importState = { type, rows: [] };
  document.getElementById('import-file').value = '';
  document.getElementById('import-clear').checked = false;
  document.getElementById('import-preview').innerHTML = '';
  const titles = { lks: '📝 LKS', panen: '🌾 Panen', kemasan: '📦 Kemasan' };
  document.getElementById('import-title').textContent = '📥 Import CSV — ' + titles[type];
  const infos = {
    lks: `<b>Format kolom:</b> <code>tanggal, nama, grade, kegiatan, material, jobTambahan, perbantuan, jenisPerbantuan, keterangan</code><br>Multi-kegiatan/material dipisah dengan <b>|</b> (pipe).`,
    panen: `<b>Format kolom:</b> <code>tgl, p_hatsu, p_gradea, p_gradeb, rk_*, rp_*, k_*, m_*, t_*</code><br>1 baris = 1 tanggal. Kolom kosong akan dianggap 0.`,
    kemasan: `<b>Kolom utama:</b> <code>tgl, name, masuk, bongkarDus, aktualPcs, kirim, tamu, reject, ketTamu, ketReject</code><br>Kolom <code>reject</code> = PCS mika reject.<br>Kolom tambahan: <code>netfoamBall, netfoamPotong, netfoamTerpakai, layerSiap, layerPakai, sleeveSiap, sleevePakai, stikerMasuk, stikerPakai</code><br><b>Koreksi stok fisik (opsional):</b> <code>netfoamOpname, layerOpname, sleeveOpname, stikerOpname</code>`
  };
  document.getElementById('import-info').innerHTML = infos[type];
  document.getElementById('modal-import').classList.add('show');
}

function closeImportModal() {
  document.getElementById('modal-import').classList.remove('show');
  importState = { type: null, rows: [] };
}

function downloadTemplate() {
  const t = importState.type;
  let csv = '', filename = '';
  if (t === 'panen') {
    csv = 'tgl,p_hatsu,p_gradea,p_gradeb,rk_crack,rk_poli,rk_hpt,rp_crack,rp_poli,rp_hpt,rp_bruise,rp_overripe,rp_kuning,rp_frozen,k_hatsu,k_a11,k_a15,k_frozen,m_hatsu,m_a11,m_a15,t_curah,t_hatsu,t_a11,t_a15,t_ket,gh\n';
    csv += '2026-04-01,10.5,5.2,3,0,0,0,0,0,0,0,0,0,0,8,4,2,0,40,20,10,0,0,0,0,,GH 1\n';
    csv += '2026-04-02,12,6,4,0.5,0,0,0.2,0,0,0,0,0,0,10,5,3,0,50,25,15,0,0,0,0,,GH 2\n';
    filename = 'template_panen.csv';
  } else if (t === 'lks') {
    csv = 'tanggal,nama,grade,kegiatan,material,jobTambahan,perbantuan,jenisPerbantuan,keterangan\n';
    csv += '2026-04-01,Astrin Julianti Kusmawan,Hatsuhana,Packing Grade Hatsuhana|Persiapan Mika,Mika Grade Hatsuhana|Lakban,,,,\n';
    filename = 'template_lks.csv';
  } else if (t === 'kemasan') {
    csv = 'tgl,name,masuk,bongkarDus,aktualPcs,kirim,tamu,reject,ketTamu,ketReject,netfoamBall,netfoamPotong,netfoamTerpakai,netfoamOpname,layerSiap,layerPakai,layerOpname,sleeveSiap,sleevePakai,sleeveOpname,stikerMasuk,stikerPakai,stikerOpname\n';
    csv += '2026-04-01,Hatsu,0,5,1000,500,0,0,,,0,1000,500,,,,,,,,900,500,\n';
    filename = 'template_kemasan.csv';
  }
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('📄 Template didownload');
}

function previewImport() {
  const file = document.getElementById('import-file').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const text = String(ev.target.result).replace(/^\ufeff/, '');
    const rows = parseCSV(text);
    if (rows.length < 2) {
      document.getElementById('import-preview').innerHTML = '<div class="warn-box">File kosong atau tidak ada baris data.</div>';
      importState.rows = [];
      return;
    }
    const headers = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1).filter(r => r.some(c => String(c).trim() !== ''));
    importState.rows = dataRows.map(r => {
      const o = {};
      headers.forEach((h, i) => o[h] = String(r[i] ?? '').trim());
      return o;
    });
    let html = `<div class="info-box"><b>${importState.rows.length} baris</b> siap di-import. Preview 5 baris pertama:</div>`;
    html += '<div style="overflow-x:auto;font-size:0.75rem;"><table style="width:100%;"><thead><tr>';
    headers.forEach(h => html += `<th style="padding:4px;font-size:0.7rem;background:#2d5016;">${h}</th>`);
    html += '</tr></thead><tbody>';
    importState.rows.slice(0, 5).forEach(r => {
      html += '<tr>';
      headers.forEach(h => html += `<td style="padding:4px;font-size:0.7rem;white-space:nowrap;">${r[h] || ''}</td>`);
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    document.getElementById('import-preview').innerHTML = html;
  };
  reader.readAsText(file);
}

function buildPanenRecord(r) {
  return {
    id: generateId(), tgl: r.tgl, gh: /2/.test(String(r.gh || '')) ? 'GH 2' : 'GH 1',
    p_hatsu: num(r.p_hatsu), p_gradea: num(r.p_gradea), p_gradeb: num(r.p_gradeb),
    rk_crack: num(r.rk_crack), rk_poli: num(r.rk_poli), rk_hpt: num(r.rk_hpt),
    rp_crack: num(r.rp_crack), rp_poli: num(r.rp_poli), rp_hpt: num(r.rp_hpt),
    rp_bruise: num(r.rp_bruise), rp_overripe: num(r.rp_overripe), rp_kuning: num(r.rp_kuning), rp_frozen: num(r.rp_frozen),
    k_hatsu: num(r.k_hatsu), k_a11: num(r.k_a11), k_a15: num(r.k_a15), k_frozen: num(r.k_frozen),
    m_hatsu: num(r.m_hatsu), m_a11: num(r.m_a11), m_a15: num(r.m_a15),
    t_curah: num(r.t_curah), t_hatsu: num(r.t_hatsu), t_a11: num(r.t_a11), t_a15: num(r.t_a15),
    t_ket: r.t_ket || ''
  };
}

function buildLksRecord(r) {
  const kegs = String(r.kegiatan || '').split('|').map(s => s.trim()).filter(Boolean);
  const mats = String(r.material || '').split('|').map(s => s.trim()).filter(Boolean);
  return {
    id: generateId(),
    tanggal: r.tanggal, nama: r.nama, grade: r.grade || '',
    kegiatan: kegs.map(k => ({ kegiatan: k, hasil: '', ket: '' })),
    jobTambahan: r.jobTambahan || '',
    perbantuan: r.perbantuan || '',
    jenisPerbantuan: r.jenisPerbantuan || '',
    material: mats.map(m => ({ material: m, jumlah: 1, satuan: 'pcs' })),
    keterangan: r.keterangan || ''
  };
}

function normKemasanName(v) {
  const k = String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['hatsu', 'hatsuhana'].includes(k)) return 'Hatsu';
  if (['gradea', 'a', 'a11', 'hy11'].includes(k)) return 'Grade A';
  if (['gradeb', 'b', 'a15', 'hy15'].includes(k)) return 'Grade B';
  return null;
}

function emptyKemasanItem(name, std) {
  return {
    name, std,
    masuk: 0, bongkarDus: 0, standarPcs: 0, aktualPcs: 0, selisih: 0,
    kirim: 0, tamu: 0, ketTamu: '',
    reject: 0, rejectTutup: 0, rejectAlas: 0, ketReject: '',
    netfoamBall: 0, netfoamPotong: 0, netfoamTerpakai: 0, netfoamAkhir: 0,
    layerSiap: 0, layerPakai: 0, layerAkhir: 0, layerOpname: null,
    sleeveSiap: 0, sleevePakai: 0, sleeveAkhir: 0, sleeveOpname: null,
    netfoamOpname: null,
    stikerMasuk: 0, stikerPakai: 0, stikerOpname: null
  };
}

function executeImport() {
  if (!importState.rows.length) { showToast('Pilih file CSV dulu!', 'error'); return; }
  const type = importState.type;
  const key = type === 'lks' ? LKS_STORAGE_KEY : type === 'panen' ? PANEN_STORAGE_KEY : KEMASAN_STORAGE_KEY;
  const shouldClear = document.getElementById('import-clear').checked;
  let db = readArrayRaw(nativeStorage.getItem(key));
  if (shouldClear) db = [];
  
  __bulkMode = true;
  
  let count = 0;
  try {
    if (type === 'panen') {
      importState.rows.forEach(r => {
        if (!r.tgl) return;
        db.push(buildPanenRecord(r));
        count++;
      });
    } else if (type === 'lks') {
      importState.rows.forEach(r => {
        if (!r.tanggal || !r.nama) return;
        db.push(buildLksRecord(r));
        count++;
      });
    } else if (type === 'kemasan') {
      const grouped = new Map();
      importState.rows.forEach(r => {
        const nm = normKemasanName(r.name);
        if (!r.tgl || !nm) return;
        const std = nm === 'Grade B' ? 300 : 200;
        if (!grouped.has(r.tgl)) grouped.set(r.tgl, { id: generateId(), tgl: r.tgl, items: [] });
        const entry = grouped.get(r.tgl);
        if (entry.items.find(x => x.name === nm)) return;
        const bongkar = num(r.bongkarDus);
        const aktual = num(r.aktualPcs);
        const rejectVal = num(r.reject);
        const rejTutupVal = num(r.rejectTutup) || rejectVal;
        const rejAlasVal = num(r.rejectAlas);
        entry.items.push({
          ...emptyKemasanItem(nm, std),
          masuk: num(r.masuk),
          bongkarDus: bongkar,
          standarPcs: bongkar * std,
          aktualPcs: aktual,
          selisih: aktual - bongkar * std,
          kirim: num(r.kirim),
          tamu: num(r.tamu),
          reject: 0,
          rejectTutup: rejTutupVal,
          rejectAlas: rejAlasVal,
          ketTamu: r.ketTamu || '',
          ketReject: r.ketReject || '',
          netfoamBall: num(r.netfoamBall),
          netfoamPotong: num(r.netfoamPotong),
          netfoamTerpakai: num(r.netfoamTerpakai),
          netfoamAkhir: num(r.netfoamPotong) - num(r.netfoamTerpakai),
          netfoamOpname: numOrNull(r.netfoamOpname),
          layerSiap: num(r.layerSiap),
          layerPakai: num(r.layerPakai),
          layerAkhir: num(r.layerSiap) - num(r.layerPakai),
          layerOpname: numOrNull(r.layerOpname),
          sleeveSiap: num(r.sleeveSiap),
          sleevePakai: num(r.sleevePakai),
          sleeveAkhir: num(r.sleeveSiap) - num(r.sleevePakai),
          sleeveOpname: numOrNull(r.sleeveOpname),
          stikerMasuk: num(r.stikerMasuk),
          stikerPakai: num(r.stikerPakai),
          stikerOpname: numOrNull(r.stikerOpname)
        });
      });
      grouped.forEach(entry => {
        masterJenisKemasan.forEach(m => {
          if (!entry.items.find(x => x.name === m.name)) entry.items.push(emptyKemasanItem(m.name, m.std));
        });
        entry.items.sort((x, y) =>
          masterJenisKemasan.findIndex(m => m.name === x.name) - masterJenisKemasan.findIndex(m => m.name === y.name));
        db.push(entry);
        count++;
      });
    }
    
    if (count === 0) { showToast('Tidak ada baris valid untuk di-import.', 'error'); __bulkMode = false; return; }
    
    const usedIds = new Set();
    db = db.map(rec => ensureValidId(rec, usedIds));
    
    if (shouldClear) {
      suppressSync = true;
      nativeStorage.setItem(key, JSON.stringify([]));
      suppressSync = false;
      queueMutation(type, 'clear', '__clear__');
    }
    localStorage.setItem(key, JSON.stringify(db));
    
    if (count > 0) {
      const newRecords = shouldClear ? db : db.slice(-count);
      newRecords.forEach(rec => queueMutation(type, 'upsert', rec));
    }
    
    if (type === 'lks') renderTableLks();
    else if (type === 'panen') renderTablePanen();
    else { recalculateStockKemasan(); renderKemasanForms(); renderKemasanTables(); }
    updateDashboard();
    updateSyncStatus();
    showToast(`✅ ${count} baris berhasil di-import!`);
    
    if (isAuthenticated && currentScriptUrl()) {
      __bulkMode = false;
      setTimeout(() => syncQueue(true), 500);
    } else {
      __bulkMode = false;
      showToast('Tekan "Connect Sheets" lalu Sync untuk kirim ke Google Sheet');
    }
    closeImportModal();
  } catch (err) {
    __bulkMode = false;
    console.error(err);
    showToast('Gagal import: ' + err.message, 'error');
  }
}

function regenerateAllIds() {
  const types = [
    { type: 'panen', key: PANEN_STORAGE_KEY },
    { type: 'kemasan', key: KEMASAN_STORAGE_KEY },
    { type: 'lks', key: LKS_STORAGE_KEY }
  ];
  types.forEach(({ type, key }) => {
    const data = readArrayRaw(nativeStorage.getItem(key));
    if (!data.length) { console.log(`${type}: kosong`); return; }
    const usedIds = new Set();
    const fixed = data.map(rec => ensureValidId(rec, usedIds));
    const lengths = {};
    fixed.forEach(x => {
      const l = String(x.id).length;
      lengths[l] = (lengths[l] || 0) + 1;
    });
    localStorage.setItem(key, JSON.stringify(fixed));
    console.log(`${type}: ${fixed.length} record · ID:`, lengths);
  });
  console.log('✅ Selesai. Silakan reload halaman.');
}

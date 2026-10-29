// ========== REKAP PANEN MODULE ==========
let panenCurrentPage = 1;
const PANEN_PER_PAGE = 10;

function getValP(id) { 
  const el = document.getElementById(id);
  return el ? (parseFloat(el.value) || 0) : 0;
}

function hitungAllPanen() {
  const setTxt = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  // Total Panen GH1 + GH2
  const totRkBun = getValP('rk-crack-gh1') + getValP('rk-poli-gh1') + getValP('rk-hpt-gh1') + 
                   getValP('rk-crack-gh2') + getValP('rk-poli-gh2') + getValP('rk-hpt-gh2');
  setTxt('calc-total-rk', totRkBun.toFixed(2) + ' Kg');

  // Total Reject Processing GH1 + GH2
  let totRPros = 0;
  ['rp-crack', 'rp-poli', 'rp-hpt', 'rp-bruise', 'rp-overripe', 'rp-kuning', 'rp-frozen'].forEach(key => {
    totRPros += getValP(key + '-gh1') + getValP(key + '-gh2');
  });
  setTxt('calc-total-rp', totRPros.toFixed(2) + ' Kg');

  // Grand Total Reject
  const grandTotalReject = totRkBun + totRPros;
  setTxt('calc-grand-total-r', grandTotalReject.toFixed(2) + ' Kg');

  // Total Panen Keseluruhan
  const totalPanen = getValP('p-hatsu-gh1') + getValP('p-gradea-gh1') + getValP('p-gradeb-gh1') +
                     getValP('p-hatsu-gh2') + getValP('p-gradea-gh2') + getValP('p-gradeb-gh2') + totRkBun;
  setTxt('calc-total-panen', totalPanen.toFixed(2) + ' Kg');

  // Reject Rate
  const rejectRate = totalPanen > 0 ? (grandTotalReject / totalPanen * 100) : 0;
  setTxt('calc-reject-rate', rejectRate.toFixed(2) + '%');

  // Total Pengiriman GH1 + GH2
  const totalKirim = getValP('k-hatsu-gh1') + getValP('k-a11-gh1') + getValP('k-a15-gh1') +
                     getValP('k-hatsu-gh2') + getValP('k-a11-gh2') + getValP('k-a15-gh2');
  const rateKirim = totalPanen > 0 ? (totalKirim / totalPanen * 100) : 0;
  setTxt('calc-total-kirim', totalKirim.toFixed(2) + ' Kg');
  setTxt('calc-rate-kirim', rateKirim.toFixed(2) + '%');

  // Total Mika GH1 + GH2
  const totalMika = getValP('m-hatsu-gh1') + getValP('m-a11-gh1') + getValP('m-a15-gh1') +
                    getValP('m-hatsu-gh2') + getValP('m-a11-gh2') + getValP('m-a15-gh2');
  setTxt('calc-total-mika', totalMika + ' Pcs');
}

// ========== SIMPAN DATA ==========
function simpanDataPanen() {
  const tgl = document.getElementById('panen-tgl').value;
  if (!tgl) { showToast('Pilih tanggal panen!', 'error'); return; }

  let db = JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]');
  let savedCount = 0;

  // --- PROSES GH 1 ---
  const gh1Data = {
    p_hatsu: getValP('p-hatsu-gh1'), p_gradea: getValP('p-gradea-gh1'), p_gradeb: getValP('p-gradeb-gh1'),
    rk_crack: getValP('rk-crack-gh1'), rk_poli: getValP('rk-poli-gh1'), rk_hpt: getValP('rk-hpt-gh1'),
    rp_crack: getValP('rp-crack-gh1'), rp_poli: getValP('rp-poli-gh1'), rp_hpt: getValP('rp-hpt-gh1'),
    rp_bruise: getValP('rp-bruise-gh1'), rp_overripe: getValP('rp-overripe-gh1'), rp_kuning: getValP('rp-kuning-gh1'), rp_frozen: getValP('rp-frozen-gh1'),
    k_hatsu: getValP('k-hatsu-gh1'), k_a11: getValP('k-a11-gh1'), k_a15: getValP('k-a15-gh1'),
    m_hatsu: getValP('m-hatsu-gh1'), m_a11: getValP('m-a11-gh1'), m_a15: getValP('m-a15-gh1')
  };
  
  if (Object.values(gh1Data).some(v => v > 0)) {
    db.push({
      id: generateId(), tgl: tgl, gh: 'GH 1', ...gh1Data,
      k_frozen: 0, t_curah: 0, t_hatsu: 0, t_a11: 0, t_a15: 0, t_ket: ''
    });
    savedCount++;
  }

  // --- PROSES GH 2 ---
  const gh2Data = {
    p_hatsu: getValP('p-hatsu-gh2'), p_gradea: getValP('p-gradea-gh2'), p_gradeb: getValP('p-gradeb-gh2'),
    rk_crack: getValP('rk-crack-gh2'), rk_poli: getValP('rk-poli-gh2'), rk_hpt: getValP('rk-hpt-gh2'),
    rp_crack: getValP('rp-crack-gh2'), rp_poli: getValP('rp-poli-gh2'), rp_hpt: getValP('rp-hpt-gh2'),
    rp_bruise: getValP('rp-bruise-gh2'), rp_overripe: getValP('rp-overripe-gh2'), rp_kuning: getValP('rp-kuning-gh2'), rp_frozen: getValP('rp-frozen-gh2'),
    k_hatsu: getValP('k-hatsu-gh2'), k_a11: getValP('k-a11-gh2'), k_a15: getValP('k-a15-gh2'),
    m_hatsu: getValP('m-hatsu-gh2'), m_a11: getValP('m-a11-gh2'), m_a15: getValP('m-a15-gh2')
  };

  if (Object.values(gh2Data).some(v => v > 0)) {
    db.push({
      id: generateId(), tgl: tgl, gh: 'GH 2', ...gh2Data,
      k_frozen: 0, t_curah: 0, t_hatsu: 0, t_a11: 0, t_a15: 0, t_ket: ''
    });
    savedCount++;
  }

  // --- PROSES GLOBAL ---
  const globalData = {
    k_frozen: getValP('k-frozen'),
    t_curah: getValP('t-curah'), t_hatsu: getValP('t-hatsu'), t_a11: getValP('t-a11'), t_a15: getValP('t-a15'), t_ket: document.getElementById('t-ket').value
  };

  if (Object.entries(globalData).some(([k, v]) => k === 't_ket' ? v !== '' : v > 0)) {
    db.push({
      id: generateId(), tgl: tgl, gh: 'GLOBAL',
      p_hatsu: 0, p_gradea: 0, p_gradeb: 0, rk_crack: 0, rk_poli: 0, rk_hpt: 0,
      rp_crack: 0, rp_poli: 0, rp_hpt: 0, rp_bruise: 0, rp_overripe: 0, rp_kuning: 0, rp_frozen: 0,
      k_hatsu: 0, k_a11: 0, k_a15: 0, m_hatsu: 0, m_a11: 0, m_a15: 0,
      ...globalData
    });
    savedCount++;
  }

  if (savedCount === 0) {
    showToast('Isi minimal 1 data panen!', 'error');
    return;
  }

  // Simpan ke LocalStorage (Otomatis masuk antrean Sync)
  localStorage.setItem(PANEN_STORAGE_KEY, JSON.stringify(db));
  
  // Paksa kirim ke Sheet saat itu juga
  if (isAuthenticated && currentScriptUrl()) {
    syncQueue(true);
  }

  showToast(`✅ ${savedCount} Data panen (GH 1/GH 2/Global) berhasil disimpan!`);
  resetFormPanen();
  renderTablePanen();
  updateDashboard();
}

function resetFormPanen() {
  document.querySelectorAll('#panen input[type="number"]').forEach(i => i.value = '');
  document.querySelectorAll('#panen input[type="text"]').forEach(i => i.value = '');
  document.getElementById('panen-tgl').value = new Date().toISOString().split('T')[0];
  hitungAllPanen();
}

function panenResetPage() { panenCurrentPage = 1; renderTablePanen(); }
function panenGoToPage(p) { panenCurrentPage = p; renderTablePanen(); }

// ========== RENDER TABEL (Sama seperti sebelumnya) ==========
function renderTablePanen() {
  const histEl = document.getElementById('panen-hist-gh');
  const tbody = document.getElementById('tabel-panen-body');
  const paginationEl = document.getElementById('panen-pagination');
  if (!tbody) return;

  const db = filterGh(JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]'), histEl ? histEl.value : 'all');

  if (db.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center" style="color: #999;">Belum ada data</td></tr>';
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  db.sort((a, b) => new Date(b.tgl) - new Date(a.tgl));

  const totalPages = Math.ceil(db.length / PANEN_PER_PAGE);
  if (panenCurrentPage > totalPages) panenCurrentPage = totalPages;
  if (panenCurrentPage < 1) panenCurrentPage = 1;

  const startIdx = (panenCurrentPage - 1) * PANEN_PER_PAGE;
  const pageData = db.slice(startIdx, startIdx + PANEN_PER_PAGE);

  tbody.innerHTML = pageData.map(item => {
    const isGlobal = item.gh === 'GLOBAL';
    const totPanen = item.p_hatsu + item.p_gradea + item.p_gradeb + item.rk_crack + item.rk_poli + item.rk_hpt;
    const totKirim = item.k_hatsu + item.k_a11 + item.k_a15 + (item.k_frozen || 0);
    const grandReject = item.rk_crack + item.rk_poli + item.rk_hpt
      + item.rp_crack + item.rp_poli + item.rp_hpt
      + item.rp_bruise + item.rp_overripe + (item.rp_kuning || 0) + item.rp_frozen;
    const rejRate = totPanen > 0 ? (grandReject / totPanen * 100) : 0;
    const totMika = item.m_hatsu + item.m_a11 + item.m_a15;

    return `
      <tr>
        <td style="white-space:nowrap;">
          <button class="btn btn-sm btn-secondary" onclick="editDataPanen('${item.id}')" title="Edit">✏</button>
          <button class="btn btn-sm btn-success" onclick="openWAModalFromHistory('${item.id}')" title="Format WA" style="margin-top:2px;">📋</button>
          <button class="btn btn-sm btn-info" onclick="openGraphicModalFromHistory('${item.id}')" title="Format Grafik" style="margin-top:2px; background:#0284c7; color:white;">📊</button>
          <button class="btn btn-sm btn-danger" onclick="hapusDataPanen('${item.id}')" title="Hapus" style="margin-top:2px;">🗑️</button>
        </td>
        <td>${item.tgl}</td>
        <td><b>${isGlobal ? '🌐 GLOBAL' : ghOf(item)}</b></td>
        <td class="text-right">${isGlobal ? '-' : item.p_hatsu.toFixed(2)}</td>
        <td class="text-right">${isGlobal ? '-' : item.p_gradea.toFixed(2)}</td>
        <td class="text-right">${isGlobal ? '-' : item.p_gradeb.toFixed(2)}</td>
        <td class="text-right"><strong>${isGlobal ? '-' : totPanen.toFixed(2)}</strong></td>
        <td class="text-right"><strong>${isGlobal ? item.k_frozen.toFixed(2) + ' (Frozen)' : totKirim.toFixed(2)}</strong></td>
        <td class="text-right">${isGlobal ? '-' : grandReject.toFixed(2)}</td>
        <td class="text-right">${isGlobal ? '-' : rejRate.toFixed(2) + '%'}</td>
        <td class="text-right"><strong>${isGlobal ? '-' : totMika}</strong></td>
      </tr>
    `;
  }).join('');

  if (paginationEl) {
    const from = startIdx + 1;
    const to = Math.min(startIdx + PANEN_PER_PAGE, db.length);
    let pageBtns = '';
    for (let p = 1; p <= totalPages; p++) {
      pageBtns += `<button class="btn btn-sm ${p === panenCurrentPage ? 'btn-primary' : 'btn-secondary'}" onclick="panenGoToPage(${p})" style="min-width:36px;">${p}</button>`;
    }
    paginationEl.innerHTML = `
      <div style="font-size:0.85rem;color:#666;">Menampilkan <b>${from}</b>–<b>${to}</b> dari <b>${db.length}</b> data</div>
      <div style="display:flex;gap:0.35rem;align-items:center;">${pageBtns}</div>
    `;
  }
}

// Sisa fungsi WA, Grafik, Edit, Hapus tetap sama
// (Biarkan fungsi WA, Grafik, Edit modal, dan Hapus yang sudah ada di file kamu, tidak perlu diubah)

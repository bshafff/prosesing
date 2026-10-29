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

  localStorage.setItem(PANEN_STORAGE_KEY, JSON.stringify(db));
  
  if (isAuthenticated && currentScriptUrl()) {
    syncQueue(true);
  }

  showToast(`✅ ${savedCount} Data panen berhasil disimpan!`);
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

// ========== RENDER TABEL ==========
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
    const totPanen = (item.p_hatsu || 0) + (item.p_gradea || 0) + (item.p_gradeb || 0) + (item.rk_crack || 0) + (item.rk_poli || 0) + (item.rk_hpt || 0);
    const totKirim = (item.k_hatsu || 0) + (item.k_a11 || 0) + (item.k_a15 || 0) + (item.k_frozen || 0);
    const grandReject = (item.rk_crack || 0) + (item.rk_poli || 0) + (item.rk_hpt || 0)
      + (item.rp_crack || 0) + (item.rp_poli || 0) + (item.rp_hpt || 0)
      + (item.rp_bruise || 0) + (item.rp_overripe || 0) + (item.rp_kuning || 0) + (item.rp_frozen || 0);
    const rejRate = totPanen > 0 ? (grandReject / totPanen * 100) : 0;
    const totMika = (item.m_hatsu || 0) + (item.m_a11 || 0) + (item.m_a15 || 0);

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
        <td class="text-right">${isGlobal ? '-' : (item.p_hatsu || 0).toFixed(2)}</td>
        <td class="text-right">${isGlobal ? '-' : (item.p_gradea || 0).toFixed(2)}</td>
        <td class="text-right">${isGlobal ? '-' : (item.p_gradeb || 0).toFixed(2)}</td>
        <td class="text-right"><strong>${isGlobal ? '-' : totPanen.toFixed(2)}</strong></td>
        <td class="text-right"><strong>${isGlobal ? item.k_frozen.toFixed(2) + ' (Frozen)' : totKirim.toFixed(2)}</strong></td>
        <td class="text-right">${isGlobal ? '-' : grandReject.toFixed(2)}</td>
        <td class="text-right">${isGlobal ? '-' : rejRate.toFixed(2) + '%'}</td>
        <td class="text-right"><strong>${isGlobal ? '-' : totMika}</strong></td>
      </tr>
    `;
  }).join('');

  // LOGIKA PAGINASI BARU (1 2 ... 10 11 12 ... 22)
  if (paginationEl) {
    const from = startIdx + 1;
    const to = Math.min(startIdx + PANEN_PER_PAGE, db.length);
    let pageBtns = '';

    // Tombol Prev
    pageBtns += `<button class="btn btn-sm ${panenCurrentPage === 1 ? 'btn-secondary' : 'btn-primary'}" onclick="panenGoToPage(${panenCurrentPage - 1})" ${panenCurrentPage === 1 ? 'disabled' : ''} style="min-width:36px;">&lt;</button>`;

    let startPage = Math.max(1, panenCurrentPage - 2);
    let endPage = Math.min(totalPages, panenCurrentPage + 2);

    if (startPage > 1) {
      pageBtns += `<button class="btn btn-sm btn-secondary" onclick="panenGoToPage(1)" style="min-width:36px;">1</button>`;
      if (startPage > 2) pageBtns += `<span style="color:#666; padding:0 4px;">...</span>`;
    }

    for (let p = startPage; p <= endPage; p++) {
      pageBtns += `<button class="btn btn-sm ${p === panenCurrentPage ? 'btn-primary' : 'btn-secondary'}" onclick="panenGoToPage(${p})" style="min-width:36px;">${p}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pageBtns += `<span style="color:#666; padding:0 4px;">...</span>`;
      pageBtns += `<button class="btn btn-sm btn-secondary" onclick="panenGoToPage(${totalPages})" style="min-width:36px;">${totalPages}</button>`;
    }

    // Tombol Next
    pageBtns += `<button class="btn btn-sm ${panenCurrentPage === totalPages ? 'btn-secondary' : 'btn-primary'}" onclick="panenGoToPage(${panenCurrentPage + 1})" ${panenCurrentPage === totalPages ? 'disabled' : ''} style="min-width:36px;">&gt;</button>`;

    paginationEl.innerHTML = `
      <div style="font-size:0.85rem;color:#666;margin-bottom:0.5rem;">Menampilkan <b>${from}</b>–<b>${to}</b> dari <b>${db.length}</b> data</div>
      <div style="display:flex;gap:0.35rem;align-items:center;flex-wrap:wrap;">${pageBtns}</div>
    `;
  }
}

// ========== EDIT MODAL ==========
function editDataPanen(id) {
  const db = JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]');
  const item = db.find(x => String(x.id) === String(id));
  if (!item) return;
  window.editingPanenId = id;
  window.editingLksId = null;
  const body = document.getElementById('modal-edit-panen-body');
  if (!body) return;
  
  const isGlobal = item.gh === 'GLOBAL';
  document.getElementById('modal-edit-panen').querySelector('.modal-header').textContent = isGlobal ? '✏️ Edit Data Global' : '✏️ Edit Data Panen';

  let html = `
    <div class="input-group"><label>Tanggal</label><input type="date" id="edit-p-tgl" value="${item.tgl}"></div>
    <div class="input-group"><label>Greenhouse</label><select id="edit-p-gh"><option value="GH 1" ${item.gh === 'GH 1' ? 'selected' : ''}>GH 1</option><option value="GH 2" ${item.gh === 'GH 2' ? 'selected' : ''}>GH 2</option><option value="GLOBAL" ${isGlobal ? 'selected' : ''}>🌐 GLOBAL (Frozen & Tamu)</option></select></div>
  `;

  if (!isGlobal) {
    html += `
      <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
      <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;margin-bottom:0.75rem;">🌾 Panen</div>
      <div class="input-group"><label>Panen Hatsu (Kg)</label><input type="number" step="0.01" id="edit-p-hatsu" value="${item.p_hatsu || 0}"></div>
      <div class="input-group"><label>Panen Grade A (Kg)</label><input type="number" step="0.01" id="edit-p-gradea" value="${item.p_gradea || 0}"></div>
      <div class="input-group"><label>Panen Grade B (Kg)</label><input type="number" step="0.01" id="edit-p-gradeb" value="${item.p_gradeb || 0}"></div>

      <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
      <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;margin-bottom:0.75rem;">🍃 Reject Kebun</div>
      <div class="input-group"><label>Cracking (Kg)</label><input type="number" step="0.01" id="edit-rk-crack" value="${item.rk_crack || 0}"></div>
      <div class="input-group"><label>Polinasi (Kg)</label><input type="number" step="0.01" id="edit-rk-poli" value="${item.rk_poli || 0}"></div>
      <div class="input-group"><label>HPT (Kg)</label><input type="number" step="0.01" id="edit-rk-hpt" value="${item.rk_hpt || 0}"></div>

      <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
      <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;margin-bottom:0.75rem;">🏭 Reject Processing</div>
      <div class="input-group"><label>Cracking (Kg)</label><input type="number" step="0.01" id="edit-rp-crack" value="${item.rp_crack || 0}"></div>
      <div class="input-group"><label>Polinasi (Kg)</label><input type="number" step="0.01" id="edit-rp-poli" value="${item.rp_poli || 0}"></div>
      <div class="input-group"><label>HPT (Kg)</label><input type="number" step="0.01" id="edit-rp-hpt" value="${item.rp_hpt || 0}"></div>
      <div class="input-group"><label>Bruise (Kg)</label><input type="number" step="0.01" id="edit-rp-bruise" value="${item.rp_bruise || 0}"></div>
      <div class="input-group"><label>Overripe (Kg)</label><input type="number" step="0.01" id="edit-rp-overripe" value="${item.rp_overripe || 0}"></div>
      <div class="input-group"><label>Buah Kuning <80% (Kg)</label><input type="number" step="0.01" id="edit-rp-kuning" value="${item.rp_kuning || 0}"></div>
      <div class="input-group"><label>Frozen <11 gr (Kg)</label><input type="number" step="0.01" id="edit-rp-frozen" value="${item.rp_frozen || 0}"></div>

      <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
      <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;margin-bottom:0.75rem;">📦 Berat Pengiriman</div>
      <div class="input-group"><label>Kirim Hatsu (Kg)</label><input type="number" step="0.01" id="edit-k-hatsu" value="${item.k_hatsu || 0}"></div>
      <div class="input-group"><label>Kirim A11 (Kg)</label><input type="number" step="0.01" id="edit-k-a11" value="${item.k_a11 || 0}"></div>
      <div class="input-group"><label>Kirim A15 (Kg)</label><input type="number" step="0.01" id="edit-k-a15" value="${item.k_a15 || 0}"></div>

      <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
      <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;margin-bottom:0.75rem;">🍓 Jumlah Pengiriman (Mika)</div>
      <div class="input-group"><label>Mika Hatsu (Pcs)</label><input type="number" id="edit-m-hatsu" value="${item.m_hatsu || 0}"></div>
      <div class="input-group"><label>Mika A11 (Pcs)</label><input type="number" id="edit-m-a11" value="${item.m_a11 || 0}"></div>
      <div class="input-group"><label>Mika A15 (Pcs)</label><input type="number" id="edit-m-a15" value="${item.m_a15 || 0}"></div>
    `;
  } else {
    html += `
      <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
      <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;margin-bottom:0.75rem;">❄️ Frozen & Tamu (Global)</div>
      <div class="input-group"><label>Total Frozen (Kg)</label><input type="number" step="0.01" id="edit-k-frozen" value="${item.k_frozen || 0}"></div>
      
      <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
      <div class="input-group"><label>Tamu Curah (Kg)</label><input type="number" step="0.01" id="edit-t-curah" value="${item.t_curah || 0}"></div>
      <div class="input-group"><label>Tamu Hatsu (Pcs)</label><input type="number" id="edit-t-hatsu" value="${item.t_hatsu || 0}"></div>
      <div class="input-group"><label>Tamu A11 (Pcs)</label><input type="number" id="edit-t-a11" value="${item.t_a11 || 0}"></div>
      <div class="input-group"><label>Tamu A15 (Pcs)</label><input type="number" id="edit-t-a15" value="${item.t_a15 || 0}"></div>
      <div class="input-group"><label>Keterangan Tamu</label><input type="text" id="edit-t-ket" value="${(item.t_ket || '').replace(/"/g, '&quot;')}"></div>
    `;
  }

  body.innerHTML = html;
  document.getElementById('modal-edit-panen').classList.add('show');
}

function closeModalEditPanen() {
  document.getElementById('modal-edit-panen').classList.remove('show');
  window.editingLksId = null;
  window.editingPanenId = null;
}

function saveEditPanen() {
  if (window.editingLksId) { saveEditLks(); return; }
  if (!window.editingPanenId) return;
  const db = JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]');
  const idx = db.findIndex(x => String(x.id) === String(window.editingPanenId));
  if (idx === -1) return;
  
  const g = id => { const el = document.getElementById(id); return el ? parseFloat(el.value || 0) : 0; };
  const gInt = id => { const el = document.getElementById(id); return el ? (parseInt(el.value || 0) || 0) : 0; };
  const gStr = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  
  const gh = gStr('edit-p-gh');
  const isGlobal = gh === 'GLOBAL';

  db[idx] = {
    ...db[idx],
    tgl: gStr('edit-p-tgl'),
    gh: gh,
    p_hatsu: isGlobal ? 0 : g('edit-p-hatsu'),
    p_gradea: isGlobal ? 0 : g('edit-p-gradea'),
    p_gradeb: isGlobal ? 0 : g('edit-p-gradeb'),
    rk_crack: isGlobal ? 0 : g('edit-rk-crack'),
    rk_poli: isGlobal ? 0 : g('edit-rk-poli'),
    rk_hpt: isGlobal ? 0 : g('edit-rk-hpt'),
    rp_crack: isGlobal ? 0 : g('edit-rp-crack'),
    rp_poli: isGlobal ? 0 : g('edit-rp-poli'),
    rp_hpt: isGlobal ? 0 : g('edit-rp-hpt'),
    rp_bruise: isGlobal ? 0 : g('edit-rp-bruise'),
    rp_overripe: isGlobal ? 0 : g('edit-rp-overripe'),
    rp_kuning: isGlobal ? 0 : g('edit-rp-kuning'),
    rp_frozen: isGlobal ? 0 : g('edit-rp-frozen'),
    k_hatsu: isGlobal ? 0 : g('edit-k-hatsu'),
    k_a11: isGlobal ? 0 : g('edit-k-a11'),
    k_a15: isGlobal ? 0 : g('edit-k-a15'),
    m_hatsu: isGlobal ? 0 : gInt('edit-m-hatsu'),
    m_a11: isGlobal ? 0 : gInt('edit-m-a11'),
    m_a15: isGlobal ? 0 : gInt('edit-m-a15'),
    k_frozen: g('edit-k-frozen'),
    t_curah: g('edit-t-curah'),
    t_hatsu: gInt('edit-t-hatsu'),
    t_a11: gInt('edit-t-a11'),
    t_a15: gInt('edit-t-a15'),
    t_ket: gStr('edit-t-ket')
  };
  
  localStorage.setItem(PANEN_STORAGE_KEY, JSON.stringify(db));
  showToast('✅ Data berhasil diupdate!');
  closeModalEditPanen();
  renderTablePanen();
  updateDashboard();
}

function hapusDataPanen(id) {
  if (!confirm('Yakin hapus data ini?')) return;
  const db = JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]');
  const filtered = db.filter(x => String(x.id) !== String(id));
  localStorage.setItem(PANEN_STORAGE_KEY, JSON.stringify(filtered));
  showToast('✅ Data berhasil dihapus!');
  renderTablePanen();
  updateDashboard();
}

// ========== FORMAT WA & GRAFIK ==========
// (Fungsi generateWAText, openWAModal, openGraphicModal, dll tetap ada di file kamu)

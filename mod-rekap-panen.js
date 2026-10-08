// ========== REKAP PANEN MODULE ==========
function getValP(id) { return parseFloat(document.getElementById(id).value) || 0; }

function hitungAllPanen() {
  const totRkBun = getValP('rk-crack') + getValP('rk-poli') + getValP('rk-hpt');
  document.getElementById('calc-total-rk').textContent = totRkBun.toFixed(2) + ' Kg';

  const totRPros = getValP('rp-crack') + getValP('rp-poli') + getValP('rp-hpt') + getValP('rp-bruise') + getValP('rp-overripe') + getValP('rp-frozen');
  document.getElementById('calc-total-rp').textContent = totRPros.toFixed(2) + ' Kg';

  const grandTotalReject = totRkBun + totRPros;
  const totalPanen = getValP('p-hatsu') + getValP('p-gradea') + getValP('p-gradeb') + totRkBun;
  document.getElementById('calc-total-panen').textContent = totalPanen.toFixed(2) + ' Kg';

  const rejectRate = totalPanen > 0 ? (grandTotalReject / totalPanen * 100) : 0;
  document.getElementById('calc-grand-total-r').textContent = grandTotalReject.toFixed(2) + ' Kg';
  document.getElementById('calc-reject-rate').textContent = rejectRate.toFixed(2) + '%';

  const totalKirim = getValP('k-hatsu') + getValP('k-a11') + getValP('k-a15') + getValP('k-frozen');
  const rateKirim = totalPanen > 0 ? (totalKirim / totalPanen * 100) : 0;
  document.getElementById('calc-total-kirim').textContent = totalKirim.toFixed(2) + ' Kg';
  document.getElementById('calc-rate-kirim').textContent = rateKirim.toFixed(2) + '%';

  const totalMika = parseInt(document.getElementById('m-hatsu').value || 0) + parseInt(document.getElementById('m-a11').value || 0) + parseInt(document.getElementById('m-a15').value || 0);
  document.getElementById('calc-total-mika').textContent = totalMika + ' Pcs';
}

function simpanDataPanen() {
  const tgl = document.getElementById('panen-tgl').value;
  if (!tgl) { showToast('Pilih tanggal panen terlebih dahulu!', 'error'); return; }
  const entry = {
    id: generateId(), tgl: tgl, gh: document.getElementById('panen-gh').value || 'GH 1',
    p_hatsu: getValP('p-hatsu'), p_gradea: getValP('p-gradea'), p_gradeb: getValP('p-gradeb'),
    rk_crack: getValP('rk-crack'), rk_poli: getValP('rk-poli'), rk_hpt: getValP('rk-hpt'),
    rp_crack: getValP('rp-crack'), rp_poli: getValP('rp-poli'), rp_hpt: getValP('rp-hpt'),
    rp_bruise: getValP('rp-bruise'), rp_overripe: getValP('rp-overripe'), rp_frozen: getValP('rp-frozen'),
    k_hatsu: getValP('k-hatsu'), k_a11: getValP('k-a11'), k_a15: getValP('k-a15'), k_frozen: getValP('k-frozen'),
    m_hatsu: parseInt(document.getElementById('m-hatsu').value || 0),
    m_a11: parseInt(document.getElementById('m-a11').value || 0),
    m_a15: parseInt(document.getElementById('m-a15').value || 0),
    t_curah: getValP('t-curah'),
    t_hatsu: parseInt(document.getElementById('t-hatsu').value || 0),
    t_a11: parseInt(document.getElementById('t-a11').value || 0),
    t_a15: parseInt(document.getElementById('t-a15').value || 0),
    t_ket: document.getElementById('t-ket').value || ''
  };
  let db = JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]');
  db.push(entry);
  localStorage.setItem(PANEN_STORAGE_KEY, JSON.stringify(db));
  showToast('✅ Data panen berhasil disimpan!');
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

function renderTablePanen() {
  const histEl = document.getElementById('panen-hist-gh');
  const tbody = document.getElementById('tabel-panen-body');
  if (!tbody) return;
  const db = filterGh(JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]'), histEl ? histEl.value : 'all');
  if (db.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center" style="color: #999;">Belum ada data</td></tr>';
    return;
  }
  db.sort((a, b) => new Date(b.tgl) - new Date(a.tgl));
  tbody.innerHTML = db.map(item => {
    const totPanen = item.p_hatsu + item.p_gradea + item.p_gradeb + item.rk_crack + item.rk_poli + item.rk_hpt;
    const totKirim = item.k_hatsu + item.k_a11 + item.k_a15 + (item.k_frozen || 0);
    const grandReject = item.rk_crack + item.rk_poli + item.rk_hpt + item.rp_crack + item.rp_poli + item.rp_hpt + item.rp_bruise + item.rp_overripe + item.rp_frozen;
    const rejRate = totPanen > 0 ? (grandReject / totPanen * 100) : 0;
    const totMika = item.m_hatsu + item.m_a11 + item.m_a15;
    return `
      <tr>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="editDataPanen('${item.id}')">✏</button>
          <button class="btn btn-sm btn-danger" onclick="hapusDataPanen('${item.id}')">🗑️</button>
        </td>
        <td>${item.tgl}</td>
        <td>${ghOf(item)}</td>
        <td class="text-right">${item.p_hatsu.toFixed(2)}</td>
        <td class="text-right">${item.p_gradea.toFixed(2)}</td>
        <td class="text-right">${item.p_gradeb.toFixed(2)}</td>
        <td class="text-right"><strong>${totPanen.toFixed(2)}</strong></td>
        <td class="text-right"><strong>${totKirim.toFixed(2)}</strong></td>
        <td class="text-right">${grandReject.toFixed(2)}</td>
        <td class="text-right">${rejRate.toFixed(2)}%</td>
        <td class="text-right"><strong>${totMika}</strong></td>
      </tr>
    `;
  }).join('');
}

function editDataPanen(id) {
  const db = JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]');
  const item = db.find(x => String(x.id) === String(id));
  if (!item) return;
  window.editingPanenId = id;
  window.editingLksId = null;
  const body = document.getElementById('modal-edit-panen-body');
  document.getElementById('modal-edit-panen').querySelector('.modal-header').textContent = '✏️ Edit Data Panen';
  body.innerHTML = `
    <div class="input-group"><label>Tanggal</label><input type="date" id="edit-p-tgl" value="${item.tgl}"></div>
    <div class="input-group"><label>Greenhouse</label><select id="edit-p-gh"><option value="GH 1" ${ghOf(item) === 'GH 1' ? 'selected' : ''}>GH 1</option><option value="GH 2" ${ghOf(item) === 'GH 2' ? 'selected' : ''}>GH 2</option></select></div>
    <div class="input-group"><label>Panen Hatsu (Kg)</label><input type="number" step="0.01" id="edit-p-hatsu" value="${item.p_hatsu}"></div>
    <div class="input-group"><label>Panen Grade A (Kg)</label><input type="number" step="0.01" id="edit-p-gradea" value="${item.p_gradea}"></div>
    <div class="input-group"><label>Panen Grade B (Kg)</label><input type="number" step="0.01" id="edit-p-gradeb" value="${item.p_gradeb}"></div>
    <hr>
    <div class="input-group"><label>Kirim Hatsu (Kg)</label><input type="number" step="0.01" id="edit-k-hatsu" value="${item.k_hatsu}"></div>
    <div class="input-group"><label>Kirim A11 (Kg)</label><input type="number" step="0.01" id="edit-k-a11" value="${item.k_a11}"></div>
    <div class="input-group"><label>Kirim A15 (Kg)</label><input type="number" step="0.01" id="edit-k-a15" value="${item.k_a15}"></div>
    <div class="input-group"><label>Kirim Frozen (Kg)</label><input type="number" step="0.01" id="edit-k-frozen" value="${item.k_frozen || 0}"></div>
    <hr>
    <div class="input-group"><label>Mika Hatsu (Pcs)</label><input type="number" id="edit-m-hatsu" value="${item.m_hatsu}"></div>
    <div class="input-group"><label>Mika A11 (Pcs)</label><input type="number" id="edit-m-a11" value="${item.m_a11}"></div>
    <div class="input-group"><label>Mika A15 (Pcs)</label><input type="number" id="edit-m-a15" value="${item.m_a15}"></div>
    <hr>
    <div class="input-group"><label>Keterangan Tamu & Sampel</label><input type="text" id="edit-t-ket" value="${item.t_ket || ''}"></div>
  `;
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
  db[idx] = {
    ...db[idx],
    tgl: document.getElementById('edit-p-tgl').value,
    gh: document.getElementById('edit-p-gh').value,
    p_hatsu: parseFloat(document.getElementById('edit-p-hatsu').value || 0),
    p_gradea: parseFloat(document.getElementById('edit-p-gradea').value || 0),
    p_gradeb: parseFloat(document.getElementById('edit-p-gradeb').value || 0),
    k_hatsu: parseFloat(document.getElementById('edit-k-hatsu').value || 0),
    k_a11: parseFloat(document.getElementById('edit-k-a11').value || 0),
    k_a15: parseFloat(document.getElementById('edit-k-a15').value || 0),
    k_frozen: parseFloat(document.getElementById('edit-k-frozen').value || 0),
    m_hatsu: parseInt(document.getElementById('edit-m-hatsu').value || 0),
    m_a11: parseInt(document.getElementById('edit-m-a11').value || 0),
    m_a15: parseInt(document.getElementById('edit-m-a15').value || 0),
    t_ket: document.getElementById('edit-t-ket') ? document.getElementById('edit-t-ket').value : (db[idx].t_ket || '')
  };
  localStorage.setItem(PANEN_STORAGE_KEY, JSON.stringify(db));
  showToast('✅ Data panen berhasil diupdate!');
  closeModalEditPanen();
  renderTablePanen();
  updateDashboard();
}

function hapusDataPanen(id) {
  if (!confirm('Yakin hapus data panen ini?')) return;
  const db = JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]');
  const filtered = db.filter(x => String(x.id) !== String(id));
  localStorage.setItem(PANEN_STORAGE_KEY, JSON.stringify(filtered));
  showToast('✅ Data panen berhasil dihapus!');
  renderTablePanen();
  updateDashboard();
}

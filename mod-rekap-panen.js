// ========== REKAP PANEN MODULE ==========
let panenCurrentPage = 1;
const PANEN_PER_PAGE = 10;

function getValP(id) { return parseFloat(document.getElementById(id).value) || 0; }

function hitungAllPanen() {
  const totRkBun = getValP('rk-crack') + getValP('rk-poli') + getValP('rk-hpt');
  document.getElementById('calc-total-rk').textContent = totRkBun.toFixed(2) + ' Kg';

  const totRPros = getValP('rp-crack') + getValP('rp-poli') + getValP('rp-hpt') + getValP('rp-bruise') + getValP('rp-overripe') + getValP('rp-kuning') + getValP('rp-frozen');
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

// ========== FORMAT WA ==========
function formatTanggalPanjang(ymd) {
  if (!ymd) return '-';
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${parseInt(parts[2], 10)} ${bulan[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
}

function fmtKg(n) {
  const v = parseFloat(n) || 0;
  return v.toFixed(2).replace('.', ',');
}

function fmtInt(n) {
  return String(parseInt(n, 10) || 0);
}

function generateWATextFromItem(item) {
  const tgl = item.tgl || '';
  const tglFmt = formatTanggalPanjang(tgl);

  const p_hatsu = parseFloat(item.p_hatsu) || 0;
  const p_gradea = parseFloat(item.p_gradea) || 0;
  const p_gradeb = parseFloat(item.p_gradeb) || 0;
  const totalGradePanen = p_hatsu + p_gradea + p_gradeb;

  const rk_crack = parseFloat(item.rk_crack) || 0;
  const rk_poli = parseFloat(item.rk_poli) || 0;
  const rk_hpt = parseFloat(item.rk_hpt) || 0;
  const rkTotal = rk_crack + rk_poli + rk_hpt;
  const totalPanen = totalGradePanen + rkTotal;

  const k_hatsu = parseFloat(item.k_hatsu) || 0;
  const k_a11 = parseFloat(item.k_a11) || 0;
  const k_a15 = parseFloat(item.k_a15) || 0;
  const k_frozen = parseFloat(item.k_frozen) || 0;
  const totalGradeKirim = k_hatsu + k_a11 + k_a15;
  const totalKirim = totalGradeKirim + k_frozen;

  const m_hatsu = parseInt(item.m_hatsu) || 0;
  const m_a11 = parseInt(item.m_a11) || 0;
  const m_a15 = parseInt(item.m_a15) || 0;
  const totalPack = m_hatsu + m_a11 + m_a15;

  const rp_crack = parseFloat(item.rp_crack) || 0;
  const rp_poli = parseFloat(item.rp_poli) || 0;
  const rp_hpt = parseFloat(item.rp_hpt) || 0;
  const rp_bruise = parseFloat(item.rp_bruise) || 0;
  const rp_overripe = parseFloat(item.rp_overripe) || 0;
  const rp_kuning = parseFloat(item.rp_kuning) || 0;
  const rp_frozen = parseFloat(item.rp_frozen) || 0;
  const rpTotal = rp_crack + rp_poli + rp_hpt + rp_bruise + rp_overripe + rp_kuning + rp_frozen;

  let t = '';
  t += `*Data Panen*\n*${tglFmt}*\n\n`;
  t += `Hatsuhana : ${fmtKg(p_hatsu)} kg\n`;
  t += `Grade A : ${fmtKg(p_gradea)} kg\n`;
  t += `Grade B : ${fmtKg(p_gradeb)} kg\n`;
  t += `*Total Grade* : ${fmtKg(totalGradePanen)} kg\n\n`;
  t += `Reject : ${fmtKg(rkTotal)} kg\n`;
  t += `*Total Panen* : ${fmtKg(totalPanen)} kg\n\n`;

  t += `*Data Pengiriman*\n*${tglFmt}*\n\n`;
  t += `*Berat*\n`;
  t += `Hatsuhana : ${fmtKg(k_hatsu)} kg\n`;
  t += `Grade A : ${fmtKg(k_a11)} kg\n`;
  t += `Grade B : ${fmtKg(k_a15)} kg\n`;
  t += `*Total Grade* : ${fmtKg(totalGradeKirim)} kg\n\n`;
  t += `Frozen : ${fmtKg(k_frozen)} kg\n`;
  t += `*Total Kirim* : ${fmtKg(totalKirim)} kg\n\n`;

  t += `*Pack*\n`;
  t += `Hatsuhana : ${fmtInt(m_hatsu)}\n`;
  t += `Grade A : ${fmtInt(m_a11)}\n`;
  t += `Grade B : ${fmtInt(m_a15)}\n`;
  t += `*Total Pack*: ${fmtInt(totalPack)}\n\n`;

  t += `*Data Reject Harian*\n*${tglFmt}*\n\n`;
  t += `Cracking : ${fmtKg(rp_crack)} kg\n`;
  t += `Polinasi : ${fmtKg(rp_poli)} kg\n`;
  t += `HPT : ${fmtKg(rp_hpt)} kg\n`;
  t += `Bruise : ${fmtKg(rp_bruise)} kg\n`;
  t += `Overripe : ${fmtKg(rp_overripe)} kg\n`;
  t += `Buah Kuning (<80%) : ${fmtKg(rp_kuning)} kg\n`;
  t += `Frozen (<11 gr) : ${fmtKg(rp_frozen)} kg\n\n`;
  t += `*Total Reject* : ${fmtKg(rpTotal)} kg`;

  return t;
}

function generateWAText() {
  const item = {
    tgl: document.getElementById('panen-tgl').value,
    p_hatsu: getValP('p-hatsu'),
    p_gradea: getValP('p-gradea'),
    p_gradeb: getValP('p-gradeb'),
    rk_crack: getValP('rk-crack'),
    rk_poli: getValP('rk-poli'),
    rk_hpt: getValP('rk-hpt'),
    rp_crack: getValP('rp-crack'),
    rp_poli: getValP('rp-poli'),
    rp_hpt: getValP('rp-hpt'),
    rp_bruise: getValP('rp-bruise'),
    rp_overripe: getValP('rp-overripe'),
    rp_kuning: getValP('rp-kuning'),
    rp_frozen: getValP('rp-frozen'),
    k_hatsu: getValP('k-hatsu'),
    k_a11: getValP('k-a11'),
    k_a15: getValP('k-a15'),
    k_frozen: getValP('k-frozen'),
    m_hatsu: parseInt(document.getElementById('m-hatsu').value || 0, 10),
    m_a11: parseInt(document.getElementById('m-a11').value || 0, 10),
    m_a15: parseInt(document.getElementById('m-a15').value || 0, 10)
  };
  return generateWATextFromItem(item);
}

function openWAModal() {
  const tgl = document.getElementById('panen-tgl').value;
  if (!tgl) { showToast('Isi tanggal panen dulu!', 'error'); return; }

  const text = generateWAText();
  const ta = document.getElementById('wa-text-preview');
  if (ta) ta.value = text;

  const header = document.querySelector('#modal-wa .modal-header');
  if (header) header.textContent = '📋 Format WA';

  document.getElementById('modal-wa').classList.add('show');
}

function openWAModalFromHistory(id) {
  const db = JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]');
  const item = db.find(x => String(x.id) === String(id));
  if (!item) { showToast('Data tidak ditemukan', 'error'); return; }

  const text = generateWATextFromItem(item);
  const ta = document.getElementById('wa-text-preview');
  if (ta) ta.value = text;

  const header = document.querySelector('#modal-wa .modal-header');
  if (header) header.textContent = `📋 Format WA — ${item.tgl} (${ghOf(item)})`;

  document.getElementById('modal-wa').classList.add('show');
}

function closeWAModal() {
  document.getElementById('modal-wa').classList.remove('show');
}

async function copyWAText() {
  const ta = document.getElementById('wa-text-preview');
  if (!ta) return;
  const text = ta.value;
  try {
    await navigator.clipboard.writeText(text);
    showToast('✅ Tersalin! Buka WA & paste.');
  } catch (err) {
    ta.removeAttribute('readonly');
    ta.select();
    ta.setSelectionRange(0, 99999);
    try {
      document.execCommand('copy');
      showToast('✅ Tersalin! Buka WA & paste.');
    } catch (e2) {
      showToast('Gagal copy, silakan select manual lalu Ctrl+C', 'error');
    }
    ta.setAttribute('readonly', 'readonly');
  }
}

// ========== SIMPAN ==========
function simpanDataPanen() {
  const tgl = document.getElementById('panen-tgl').value;
  if (!tgl) { showToast('Pilih tanggal panen terlebih dahulu!', 'error'); return; }
  const entry = {
    id: generateId(), tgl: tgl, gh: document.getElementById('panen-gh').value || 'GH 1',
    p_hatsu: getValP('p-hatsu'), p_gradea: getValP('p-gradea'), p_gradeb: getValP('p-gradeb'),
    rk_crack: getValP('rk-crack'), rk_poli: getValP('rk-poli'), rk_hpt: getValP('rk-hpt'),
    rp_crack: getValP('rp-crack'), rp_poli: getValP('rp-poli'), rp_hpt: getValP('rp-hpt'),
    rp_bruise: getValP('rp-bruise'), rp_overripe: getValP('rp-overripe'), rp_kuning: getValP('rp-kuning'), rp_frozen: getValP('rp-frozen'),
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

function panenResetPage() {
  panenCurrentPage = 1;
  renderTablePanen();
}

function panenGoToPage(p) {
  panenCurrentPage = p;
  renderTablePanen();
}

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
    const totPanen = item.p_hatsu + item.p_gradea + item.p_gradeb + item.rk_crack + item.rk_poli + item.rk_hpt;
    const totKirim = item.k_hatsu + item.k_a11 + item.k_a15 + (item.k_frozen || 0);
    const grandReject = item.rk_crack + item.rk_poli + item.rk_hpt
      + item.rp_crack + item.rp_poli + item.rp_hpt
      + item.rp_bruise + item.rp_overripe + (item.rp_kuning || 0) + item.rp_frozen;
    const rejRate = totPanen > 0 ? (grandReject / totPanen * 100) : 0;
    const totMika = item.m_hatsu + item.m_a11 + item.m_a15;
    return `
      <tr>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="editDataPanen('${item.id}')" title="Edit">✏</button>
          <button class="btn btn-sm btn-success" onclick="openWAModalFromHistory('${item.id}')" title="Format WA" style="margin-top:2px;">📋</button>
          <button class="btn btn-sm btn-danger" onclick="hapusDataPanen('${item.id}')" title="Hapus" style="margin-top:2px;">🗑️</button>
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

  if (paginationEl) {
    const from = startIdx + 1;
    const to = Math.min(startIdx + PANEN_PER_PAGE, db.length);

    let pageBtns = '';
    const maxShow = 5;
    let startPage = Math.max(1, panenCurrentPage - Math.floor(maxShow / 2));
    let endPage = Math.min(totalPages, startPage + maxShow - 1);
    if (endPage - startPage + 1 < maxShow) startPage = Math.max(1, endPage - maxShow + 1);

    if (startPage > 1) {
      pageBtns += `<button class="btn btn-sm btn-secondary" onclick="panenGoToPage(1)">«</button>`;
    }
    if (panenCurrentPage > 1) {
      pageBtns += `<button class="btn btn-sm btn-secondary" onclick="panenGoToPage(${panenCurrentPage - 1})">‹ Prev</button>`;
    }
    for (let p = startPage; p <= endPage; p++) {
      const active = p === panenCurrentPage;
      pageBtns += `<button class="btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}" onclick="panenGoToPage(${p})" style="min-width:36px;">${p}</button>`;
    }
    if (panenCurrentPage < totalPages) {
      pageBtns += `<button class="btn btn-sm btn-secondary" onclick="panenGoToPage(${panenCurrentPage + 1})">Next ›</button>`;
    }
    if (endPage < totalPages) {
      pageBtns += `<button class="btn btn-sm btn-secondary" onclick="panenGoToPage(${totalPages})">»</button>`;
    }

    paginationEl.innerHTML = `
      <div style="font-size:0.85rem;color:#666;">
        Menampilkan <b>${from}</b>–<b>${to}</b> dari <b>${db.length}</b> data
      </div>
      <div style="display:flex;gap:0.35rem;align-items:center;flex-wrap:wrap;">${pageBtns}</div>
    `;
  }
}

// ========== EDIT MODAL (LENGKAP) ==========
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

    <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
    <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.75rem;">🌾 Panen</div>

    <div class="input-group"><label>Panen Hatsu (Kg)</label><input type="number" step="0.01" id="edit-p-hatsu" value="${item.p_hatsu}"></div>
    <div class="input-group"><label>Panen Grade A (Kg)</label><input type="number" step="0.01" id="edit-p-gradea" value="${item.p_gradea}"></div>
    <div class="input-group"><label>Panen Grade B (Kg)</label><input type="number" step="0.01" id="edit-p-gradeb" value="${item.p_gradeb}"></div>

    <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
    <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.75rem;">🍃 Reject Kebun</div>

    <div class="input-group"><label>Cracking (Kg)</label><input type="number" step="0.01" id="edit-rk-crack" value="${item.rk_crack || 0}"></div>
    <div class="input-group"><label>Polinasi (Kg)</label><input type="number" step="0.01" id="edit-rk-poli" value="${item.rk_poli || 0}"></div>
    <div class="input-group"><label>HPT (Kg)</label><input type="number" step="0.01" id="edit-rk-hpt" value="${item.rk_hpt || 0}"></div>

    <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
    <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.75rem;">🏭 Reject Processing</div>

    <div class="input-group"><label>Cracking (Kg)</label><input type="number" step="0.01" id="edit-rp-crack" value="${item.rp_crack || 0}"></div>
    <div class="input-group"><label>Polinasi (Kg)</label><input type="number" step="0.01" id="edit-rp-poli" value="${item.rp_poli || 0}"></div>
    <div class="input-group"><label>HPT (Kg)</label><input type="number" step="0.01" id="edit-rp-hpt" value="${item.rp_hpt || 0}"></div>
    <div class="input-group"><label>Bruise (Kg)</label><input type="number" step="0.01" id="edit-rp-bruise" value="${item.rp_bruise || 0}"></div>
    <div class="input-group"><label>Overripe (Kg)</label><input type="number" step="0.01" id="edit-rp-overripe" value="${item.rp_overripe || 0}"></div>
    <div class="input-group"><label>Buah Kuning &lt;80% (Kg)</label><input type="number" step="0.01" id="edit-rp-kuning" value="${item.rp_kuning || 0}"></div>
    <div class="input-group"><label>Frozen &lt;11 gr (Kg)</label><input type="number" step="0.01" id="edit-rp-frozen" value="${item.rp_frozen || 0}"></div>

    <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
    <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.75rem;">📦 Berat Pengiriman</div>

    <div class="input-group"><label>Kirim Hatsu (Kg)</label><input type="number" step="0.01" id="edit-k-hatsu" value="${item.k_hatsu}"></div>
    <div class="input-group"><label>Kirim A11 (Kg)</label><input type="number" step="0.01" id="edit-k-a11" value="${item.k_a11}"></div>
    <div class="input-group"><label>Kirim A15 (Kg)</label><input type="number" step="0.01" id="edit-k-a15" value="${item.k_a15}"></div>
    <div class="input-group"><label>Kirim Frozen (Kg)</label><input type="number" step="0.01" id="edit-k-frozen" value="${item.k_frozen || 0}"></div>

    <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
    <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.75rem;">🍓 Jumlah Pengiriman (Mika / Pcs)</div>

    <div class="input-group"><label>Mika Hatsu (Pcs)</label><input type="number" id="edit-m-hatsu" value="${item.m_hatsu}"></div>
    <div class="input-group"><label>Mika A11 (Pcs)</label><input type="number" id="edit-m-a11" value="${item.m_a11}"></div>
    <div class="input-group"><label>Mika A15 (Pcs)</label><input type="number" id="edit-m-a15" value="${item.m_a15}"></div>

    <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
    <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.75rem;">🎁 Tamu & Sampel</div>

    <div class="input-group"><label>Curah (Kg)</label><input type="number" step="0.01" id="edit-t-curah" value="${item.t_curah || 0}"></div>
    <div class="input-group"><label>Mika Hatsu (Pcs)</label><input type="number" id="edit-t-hatsu" value="${item.t_hatsu || 0}"></div>
    <div class="input-group"><label>Mika A11 (Pcs)</label><input type="number" id="edit-t-a11" value="${item.t_a11 || 0}"></div>
    <div class="input-group"><label>Mika A15 (Pcs)</label><input type="number" id="edit-t-a15" value="${item.t_a15 || 0}"></div>
    <div class="input-group"><label>Keterangan Tamu & Sampel</label><input type="text" id="edit-t-ket" value="${(item.t_ket || '').replace(/"/g, '&quot;')}"></div>
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
  const g = id => {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value || 0) : 0;
  };
  const gInt = id => {
    const el = document.getElementById(id);
    return el ? (parseInt(el.value || 0) || 0) : 0;
  };
  const gStr = id => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };
  db[idx] = {
    ...db[idx],
    tgl: gStr('edit-p-tgl'),
    gh: gStr('edit-p-gh') || 'GH 1',

    // Panen
    p_hatsu: g('edit-p-hatsu'),
    p_gradea: g('edit-p-gradea'),
    p_gradeb: g('edit-p-gradeb'),

    // Reject Kebun
    rk_crack: g('edit-rk-crack'),
    rk_poli: g('edit-rk-poli'),
    rk_hpt: g('edit-rk-hpt'),

    // Reject Processing
    rp_crack: g('edit-rp-crack'),
    rp_poli: g('edit-rp-poli'),
    rp_hpt: g('edit-rp-hpt'),
    rp_bruise: g('edit-rp-bruise'),
    rp_overripe: g('edit-rp-overripe'),
    rp_kuning: g('edit-rp-kuning'),
    rp_frozen: g('edit-rp-frozen'),

    // Pengiriman
    k_hatsu: g('edit-k-hatsu'),
    k_a11: g('edit-k-a11'),
    k_a15: g('edit-k-a15'),
    k_frozen: g('edit-k-frozen'),

    // Mika
    m_hatsu: gInt('edit-m-hatsu'),
    m_a11: gInt('edit-m-a11'),
    m_a15: gInt('edit-m-a15'),

    // Tamu & Sampel
    t_curah: g('edit-t-curah'),
    t_hatsu: gInt('edit-t-hatsu'),
    t_a11: gInt('edit-t-a11'),
    t_a15: gInt('edit-t-a15'),
    t_ket: gStr('edit-t-ket')
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

// ========== LKS MODULE ==========
function toggleManualKegiatan(selectEl) {
  const card = selectEl.closest('.activity-card');
  const manualInput = card.querySelector('[data-kegiatan-manual]');
  if (selectEl.value === 'Lainnya') {
    manualInput.style.display = 'block';
    manualInput.required = true;
    manualInput.focus();
  } else {
    manualInput.style.display = 'none';
    manualInput.required = false;
    manualInput.value = '';
  }
}

function toggleManualMaterial(selectEl) {
  const card = selectEl.closest('.material-card');
  const manualInput = card.querySelector('[data-material-manual]');
  if (selectEl.value === 'Lainnya') {
    manualInput.style.display = 'block';
    manualInput.required = true;
    manualInput.focus();
  } else {
    manualInput.style.display = 'none';
    manualInput.required = false;
    manualInput.value = '';
  }
}

function addLksActivity() {
  const list = document.getElementById('lks-activity-list');
  const idx = list.children.length + 1;
  const div = document.createElement('div');
  div.className = 'activity-card';
  div.style.cssText = 'background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.875rem; margin-bottom: 0.625rem;';
  div.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.625rem;">
      <span class="activity-num" style="font-size: 0.75rem; font-weight: 700; color: #2d5016; background: #e8f5e9; padding: 0.25rem 0.5rem; border-radius: 6px;">Kegiatan #${idx}</span>
      <button type="button" class="btn btn-sm btn-danger" onclick="removeLksActivity(this)">Hapus</button>
    </div>
    <div class="input-group">
      <label class="required">Kegiatan</label>
      <select data-kegiatan-select onchange="toggleManualKegiatan(this)" required>
        <option value="">Pilih kegiatan...</option>
        <option value="Packing Grade Hatsuhana">Packing Grade Hatsuhana</option>
        <option value="Packing Grade A">Packing Grade A</option>
        <option value="Packing Grade B">Packing Grade B</option>
        <option value="Loading Buah">Loading Buah</option>
        <option value="Perbantuan">Perbantuan</option>
        <option value="Persiapan Mika">Persiapan Mika</option>
        <option value="Persiapan Netfoam">Persiapan Netfoam</option>
        <option value="Persiapan Sleeve">Persiapan Sleeve</option>
        <option value="Lainnya">Lainnya (Tulis Manual)</option>
      </select>
      <input type="text" data-kegiatan-manual placeholder="Tulis nama kegiatan manual..." style="display:none; margin-top:0.5rem;">
    </div>
    <div class="row-2">
      <div class="input-group"><label>Hasil (pcs)</label><input type="number" data-hasil min="0" step="1" placeholder="Opsional"></div>
      <div class="input-group"><label>Keterangan</label><input type="text" data-ket placeholder="Opsional"></div>
    </div>
  `;
  list.appendChild(div);
}

function removeLksActivity(btn) {
  const list = document.getElementById('lks-activity-list');
  if (list.children.length <= 1) { showToast('Minimal 1 kegiatan!', 'error'); return; }
  btn.closest('.activity-card').remove();
  Array.from(list.children).forEach((card, i) => {
    card.querySelector('.activity-num').textContent = 'Kegiatan #' + (i + 1);
  });
}

function addLksMaterial() {
  const list = document.getElementById('lks-material-list');
  const idx = list.children.length + 1;
  const div = document.createElement('div');
  div.className = 'material-card';
  div.style.cssText = 'background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.875rem; margin-bottom: 0.625rem;';
  div.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.625rem;">
      <span class="material-num" style="font-size: 0.75rem; font-weight: 700; color: #2d5016; background: #e8f5e9; padding: 0.25rem 0.5rem; border-radius: 6px;">Material #${idx}</span>
      <button type="button" class="btn btn-sm btn-danger" onclick="removeLksMaterial(this)">Hapus</button>
    </div>
    <div class="input-group">
      <label class="required">Nama Material</label>
      <select data-material-select onchange="toggleManualMaterial(this)" required>
        <option value="">Pilih material...</option>
        <option value="Mika Grade Hatsuhana">Mika Grade Hatsuhana</option>
        <option value="Mika Grade A11">Mika Grade A11</option>
        <option value="Mika Grade A15">Mika Grade A15</option>
        <option value="Lakban">Lakban</option>
        <option value="Lainnya">Lainnya (Tulis Manual)</option>
      </select>
      <input type="text" data-material-manual placeholder="Tulis nama material manual..." style="display:none; margin-top:0.5rem;">
    </div>
    <div class="row-2">
      <div class="input-group"><label class="required">Jumlah</label><input type="number" data-qty min="0" step="0.1" placeholder="0" required></div>
      <div class="input-group"><label>Satuan</label><input type="text" data-satuan placeholder="pcs/kg/box" value="pcs"></div>
    </div>
  `;
  list.appendChild(div);
}

function removeLksMaterial(btn) { btn.closest('.material-card').remove(); }

function collectLksData() {
  const kegiatan = [];
  document.querySelectorAll('#lks-activity-list .activity-card').forEach(card => {
    const selectVal = card.querySelector('[data-kegiatan-select]') ? card.querySelector('[data-kegiatan-select]').value : '';
    const manualVal = card.querySelector('[data-kegiatan-manual]') ? card.querySelector('[data-kegiatan-manual]').value : '';
    const k = selectVal === 'Lainnya' ? manualVal : selectVal;
    if (k) kegiatan.push({ kegiatan: k, hasil: card.querySelector('[data-hasil]').value, ket: card.querySelector('[data-ket]').value });
  });
  const material = [];
  document.querySelectorAll('#lks-material-list .material-card').forEach(card => {
    const selectVal = card.querySelector('[data-material-select]') ? card.querySelector('[data-material-select]').value : '';
    const manualVal = card.querySelector('[data-material-manual]') ? card.querySelector('[data-material-manual]').value : '';
    const m = selectVal === 'Lainnya' ? manualVal : selectVal;
    const q = card.querySelector('[data-qty]').value;
    if (m && q) material.push({ material: m, jumlah: q, satuan: card.querySelector('[data-satuan]').value });
  });
  return {
    tanggal: document.getElementById('lks-tanggal').value,
    nama: document.getElementById('lks-nama').value,
    grade: document.getElementById('lks-grade').value,
    kegiatan: kegiatan,
    jobTambahan: document.getElementById('lks-jobTambahan').value,
    perbantuan: document.getElementById('lks-perbantuan').value,
    jenisPerbantuan: document.getElementById('lks-jenisPerbantuan').value,
    material: material,
    keterangan: document.getElementById('lks-keterangan').value
  };
}

function simpanDataLks() {
  const data = collectLksData();
  if (!data.tanggal || !data.nama || !data.grade) { showToast('Isi Tanggal, Nama Pekerja, dan Grade!', 'error'); return; }
  if (!data.kegiatan || data.kegiatan.length === 0 || !data.kegiatan[0].kegiatan) { showToast('Isi minimal 1 kegiatan!', 'error'); return; }
  const entry = { id: generateId(), ...data };
  let db = JSON.parse(localStorage.getItem(LKS_STORAGE_KEY) || '[]');
  db.push(entry);
  localStorage.setItem(LKS_STORAGE_KEY, JSON.stringify(db));
  showToast('✅ LKS berhasil disimpan!');
  resetFormLks();
  renderTableLks();
  updateDashboard();
}

function resetFormLks() {
  document.getElementById('lks-tanggal').value = new Date().toISOString().split('T')[0];
  document.getElementById('lks-nama').value = '';
  document.getElementById('lks-grade').value = '';
  document.getElementById('lks-jobTambahan').value = '';
  document.getElementById('lks-perbantuan').value = '';
  document.getElementById('lks-jenisPerbantuan').value = '';
  document.getElementById('lks-keterangan').value = '';
  document.getElementById('lks-activity-list').innerHTML = `
    <div class="activity-card" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.875rem; margin-bottom: 0.625rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.625rem;">
        <span class="activity-num" style="font-size: 0.75rem; font-weight: 700; color: #2d5016; background: #e8f5e9; padding: 0.25rem 0.5rem; border-radius: 6px;">Kegiatan #1</span>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeLksActivity(this)">Hapus</button>
      </div>
      <div class="input-group">
        <label class="required">Kegiatan</label>
        <select data-kegiatan-select onchange="toggleManualKegiatan(this)" required>
          <option value="">Pilih kegiatan...</option>
          <option value="Packing Grade Hatsuhana">Packing Grade Hatsuhana</option>
          <option value="Packing Grade A">Packing Grade A</option>
          <option value="Packing Grade B">Packing Grade B</option>
          <option value="Loading Buah">Loading Buah</option>
          <option value="Perbantuan">Perbantuan</option>
          <option value="Persiapan Mika">Persiapan Mika</option>
          <option value="Persiapan Netfoam">Persiapan Netfoam</option>
          <option value="Persiapan Sleeve">Persiapan Sleeve</option>
          <option value="Lainnya">Lainnya (Tulis Manual)</option>
        </select>
        <input type="text" data-kegiatan-manual placeholder="Tulis nama kegiatan manual..." style="display:none; margin-top:0.5rem;">
      </div>
      <div class="row-2">
        <div class="input-group"><label>Hasil (pcs)</label><input type="number" data-hasil min="0" step="1" placeholder="Opsional"></div>
        <div class="input-group"><label>Keterangan</label><input type="text" data-ket placeholder="Opsional"></div>
      </div>
    </div>
  `;
  document.getElementById('lks-material-list').innerHTML = `
    <div class="material-card" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.875rem; margin-bottom: 0.625rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.625rem;">
        <span class="material-num" style="font-size: 0.75rem; font-weight: 700; color: #2d5016; background: #e8f5e9; padding: 0.25rem 0.5rem; border-radius: 6px;">Material #1</span>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeLksMaterial(this)">Hapus</button>
      </div>
      <div class="input-group">
        <label class="required">Nama Material</label>
        <select data-material-select onchange="toggleManualMaterial(this)" required>
          <option value="">Pilih material...</option>
          <option value="Mika Grade Hatsuhana">Mika Grade Hatsuhana</option>
          <option value="Mika Grade A11">Mika Grade A11</option>
          <option value="Mika Grade A15">Mika Grade A15</option>
          <option value="Lakban">Lakban</option>
          <option value="Lainnya">Lainnya (Tulis Manual)</option>
        </select>
        <input type="text" data-material-manual placeholder="Tulis nama material manual..." style="display:none; margin-top:0.5rem;">
      </div>
      <div class="row-2">
        <div class="input-group"><label class="required">Jumlah</label><input type="number" data-qty min="0" step="0.1" placeholder="0" required></div>
        <div class="input-group"><label>Satuan</label><input type="text" data-satuan placeholder="pcs/kg/box" value="pcs"></div>
      </div>
    </div>
  `;
}

function renderTableLks() {
  const db = JSON.parse(localStorage.getItem(LKS_STORAGE_KEY) || '[]');
  const tbody = document.getElementById('tabel-lks-body');
  if (!tbody) return;
  if (db.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: #999;">Belum ada data</td></tr>';
    return;
  }
  db.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  tbody.innerHTML = db.map(item => {
    const kegiatanList = item.kegiatan ? item.kegiatan.map(k => k.kegiatan).join(', ') : '-';
    const materialList = item.material ? item.material.map(m => m.material).join(', ') : '-';
    return `
      <tr>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="editDataLks('${item.id}')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="hapusDataLks('${item.id}')">🗑️</button>
        </td>
        <td>${item.tanggal}</td>
        <td>${item.nama}</td>
        <td>${item.grade}</td>
        <td><small>${kegiatanList}</small></td>
        <td><small>${materialList}</small></td>
      </tr>
    `;
  }).join('');
}

function editDataLks(id) {
  const db = JSON.parse(localStorage.getItem(LKS_STORAGE_KEY) || '[]');
  const item = db.find(x => String(x.id) === String(id));
  if (!item) return;
  window.editingLksId = id;
  window.editingPanenId = null;
  const body = document.getElementById('modal-edit-panen-body');
  const namaList = ['Astrin Julianti Kusmawan','Mianti Fatma Kusmawan','Resa Yolandari','Santi Susanti','Tanti Agustina','Zahra Agesty Rainiztan'];
  body.innerHTML = `
    <div class="input-group"><label>Tanggal</label><input type="date" id="edit-lks-tgl" value="${item.tanggal}"></div>
    <div class="input-group"><label>Nama Pekerja</label>
      <select id="edit-lks-nama">
        ${namaList.map(n => `<option value="${n}" ${item.nama === n ? 'selected' : ''}>${n}</option>`).join('')}
        ${!namaList.includes(item.nama) && item.nama ? `<option value="${item.nama}" selected>${item.nama}</option>` : ''}
      </select>
    </div>
    <div class="input-group"><label>Grade Pekerja</label>
      <select id="edit-lks-grade">
        <option value="Hatsuhana" ${item.grade === 'Hatsuhana' ? 'selected' : ''}>Hatsuhana</option>
        <option value="Grade A" ${item.grade === 'Grade A' ? 'selected' : ''}>Grade A</option>
        <option value="Grade B" ${item.grade === 'Grade B' ? 'selected' : ''}>Grade B</option>
      </select>
    </div>
    <hr>
    <div class="input-group"><label>Kegiatan (Satu per baris)</label>
      <textarea id="edit-lks-kegiatan" style="padding: 0.875rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.9rem;">${item.kegiatan ? item.kegiatan.map(k => k.kegiatan).join('\n') : ''}</textarea>
    </div>
    <div class="input-group"><label>Material (Satu per baris)</label>
      <textarea id="edit-lks-material" style="padding: 0.875rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.9rem;">${item.material ? item.material.map(m => m.material).join('\n') : ''}</textarea>
    </div>
    <hr>
    <div class="input-group"><label>Keterangan</label><textarea id="edit-lks-ket" style="padding: 0.875rem; border: 1.5px solid #d1d5db; border-radius: 8px; min-height: 60px;">${item.keterangan || ''}</textarea></div>
  `;
  document.getElementById('modal-edit-panen').querySelector('.modal-header').textContent = '✏️ Edit Data LKS';
  document.getElementById('modal-edit-panen').classList.add('show');
}

function hapusDataLks(id) {
  if (!confirm('Yakin hapus LKS ini?')) return;
  const db = JSON.parse(localStorage.getItem(LKS_STORAGE_KEY) || '[]');
  const filtered = db.filter(x => String(x.id) !== String(id));
  localStorage.setItem(LKS_STORAGE_KEY, JSON.stringify(filtered));
  showToast('✅ LKS berhasil dihapus!');
  renderTableLks();
  updateDashboard();
}

function saveEditLks() {
  if (!window.editingLksId) return;
  const db = JSON.parse(localStorage.getItem(LKS_STORAGE_KEY) || '[]');
  const idx = db.findIndex(x => String(x.id) === String(window.editingLksId));
  if (idx === -1) return;
  db[idx] = {
    id: window.editingLksId,
    tanggal: document.getElementById('edit-lks-tgl').value,
    nama: document.getElementById('edit-lks-nama').value,
    grade: document.getElementById('edit-lks-grade').value,
    kegiatan: document.getElementById('edit-lks-kegiatan').value.split('\n').map(k => ({ kegiatan: k.trim(), hasil: '', ket: '' })).filter(k => k.kegiatan),
    jobTambahan: db[idx].jobTambahan || '',
    perbantuan: db[idx].perbantuan || '',
    jenisPerbantuan: db[idx].jenisPerbantuan || '',
    material: document.getElementById('edit-lks-material').value.split('\n').map(m => ({ material: m.trim(), jumlah: 1, satuan: 'pcs' })).filter(m => m.material),
    keterangan: document.getElementById('edit-lks-ket').value
  };
  localStorage.setItem(LKS_STORAGE_KEY, JSON.stringify(db));
  showToast('✅ LKS berhasil diupdate!');
  closeModalEditPanen();
  renderTableLks();
  updateDashboard();
}

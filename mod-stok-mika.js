// ========== STOK MIKA / KEMASAN MODULE ==========
function recalculateStockKemasan() {
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]');
  const accum = {};
  masterJenisKemasan.forEach(m => { accum[m.name] = { gudang: 0, processing: 0, keluar: 0, reject: 0 }; });
  const sorted = [...db].sort((a, b) => new Date(a.tgl) - new Date(b.tgl));
  sorted.forEach(entry => {
    if (entry.items && Array.isArray(entry.items)) {
      entry.items.forEach(item => {
        if (accum[item.name]) {
          accum[item.name].gudang += (item.masuk || 0) - (item.bongkarDus || 0);
          const totalOut = (item.kirim || 0) + (item.tamu || 0);
          const totalRej = rejMika(item);
          accum[item.name].processing += (item.aktualPcs || 0) - totalOut - totalRej;
          accum[item.name].keluar += totalOut;
          accum[item.name].reject += totalRej;
        }
      });
    }
  });
  masterJenisKemasan.forEach(m => {
    currentStockStateKemasan[m.name] = {
      gudang: Math.max(0, accum[m.name].gudang),
      processing: Math.max(0, accum[m.name].processing)
    };
  });
  let totGudang = 0, totProc = 0, totKeluar = 0, totRej = 0;
  let summaryHtml = '';
  masterJenisKemasan.forEach(m => {
    const a = accum[m.name];
    const totAkhir = a.processing;
    totGudang += a.gudang; totProc += a.processing; totKeluar += a.keluar; totRej += a.reject;
    summaryHtml += `<tr>
      <td><strong><span class="badge ${m.badge}">${m.name}</span></strong></td>
      <td class="text-right">${a.gudang} Dus</td>
      <td class="text-right">${a.processing} Pcs</td>
      <td class="text-right"><strong>${totAkhir} Pcs</strong></td>
      <td class="text-right">${a.keluar} Pcs</td>
      <td class="text-right" style="color:#dc2626;">${a.reject} Pcs</td>
    </tr>`;
  });
  const sumBody = document.getElementById('tbl-summary-body');
  if (sumBody) sumBody.innerHTML = summaryHtml;
  const elGdg = document.getElementById('k-stat-gudang');
  const elProc = document.getElementById('k-stat-processing');
  const elKel = document.getElementById('k-stat-keluar');
  const elRej = document.getElementById('k-stat-reject');
  if (elGdg) elGdg.textContent = totGudang;
  if (elProc) elProc.textContent = totProc;
  if (elKel) elKel.textContent = totKeluar;
  if (elRej) elRej.textContent = totRej;
  const tl = computeMikaTimeline();
  const last = tl[tl.length - 1];
  currentAksesoris = last
    ? { layer: last.layer, sleeve: last.sleeve, stiker: last.stiker, netfoam: last.netfoam }
    : { layer: 0, sleeve: 0, stiker: 0, netfoam: 0 };
}

function getOpname(id) {
  const el = document.getElementById(id);
  if (!el || el.value === '') return null;
  const n = parseFloat(el.value);
  return isNaN(n) ? null : n;
}

function akhirAks(awal, masuk, pakai, opId) {
  const op = getOpname(opId);
  return op !== null ? op : (awal + masuk - pakai);
}

function getValK(id) {
  const el = document.getElementById(id);
  return el ? (parseFloat(el.value) || 0) : 0;
}

function stikerCardHtml() {
  const acc = currentAksesoris;
  return `
    <div class="card" id="card-stiker">
      <div class="card-title">🏷️ Stok Stiker</div>
      <div class="info-box">Stok Stiker saat ini: <b>${acc.stiker}</b> Pcs</div>
      <div class="row-2">
        <div class="input-group"><label>Stiker Masuk (Pcs)</label><input type="number" id="stiker-masuk" placeholder="0" oninput="hitungStiker()"></div>
        <div class="input-group"><label>Stiker Terpakai (Pcs)</label><input type="number" id="stiker-pakai" placeholder="0" oninput="hitungStiker()"></div>
      </div>
      <div class="row-2">
        <div class="input-group"><label>Stok Akhir Stiker (Pcs)</label><input readonly id="stiker-akhir" value="${acc.stiker}"></div>
        <div class="input-group"><label>Koreksi Stok Fisik (opsional)</label><input type="number" id="stiker-opname" placeholder="Isi hanya jika beda" oninput="hitungStiker()"></div>
      </div>
    </div>
  `;
}

function hitungStiker() {
  const el = document.getElementById('stiker-akhir');
  if (el) el.value = akhirAks(currentAksesoris.stiker, getValK('stiker-masuk'), getValK('stiker-pakai'), 'stiker-opname');
}

function renderKemasanForms() {
  const formWrap = document.getElementById('forms-kemasan');
  if (!formWrap) return;
  const html = masterJenisKemasan.map((item, i) => {
    const gAwal = currentStockStateKemasan[item.name].gudang;
    const pAwal = currentStockStateKemasan[item.name].processing;
    const acc = currentAksesoris;
    const isHatsu = item.name.includes('Hatsu');
    const hatsuExtraForm = isHatsu ? `
      <div class="sub-title">🧽 6. Stok Netfoam Hatsuhana</div>
      <div class="info-box">Stok Netfoam Potong saat ini: <b>${acc.netfoam}</b> Pcs</div>
      <div class="row-2">
        <div class="input-group"><label>Netfoam Masuk (Ball)</label><input type="number" id="netfoam-ball-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
        <div class="input-group"><label>Netfoam Dipotong (Pcs)</label><input type="number" id="netfoam-potong-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
      </div>
      <div class="row-2">
        <div class="input-group"><label>Netfoam Terpakai (Pcs)</label><input type="number" id="netfoam-terpakai-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
        <div class="input-group"><label>Stok Akhir Netfoam Potong (Pcs)</label><input readonly id="netfoam-akhir-${i}" value="${acc.netfoam}"></div>
      </div>
      <div class="input-group"><label>Koreksi Stok Fisik Netfoam (opsional)</label><input type="number" id="netfoam-opname-${i}" placeholder="Isi hanya jika stok fisik beda dengan hitungan" oninput="hitungKemasan(${i})"></div>
    ` : '';
    const isGradeA = item.name.includes('Grade A') || item.name.includes('A11');
    const layerExtraForm = isGradeA ? `
      <div class="sub-title">📄 6. Stok Layer A11</div>
      <div class="info-box">Stok Layer saat ini: <b>${acc.layer}</b> Pcs</div>
      <div class="row-3">
        <div class="input-group"><label>Layer Disiapkan (Pcs)</label><input type="number" id="layer-siap-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
        <div class="input-group"><label>Layer Terpakai (Pcs)</label><input type="number" id="layer-pakai-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
        <div class="input-group"><label>Stok Akhir Layer (Pcs)</label><input readonly id="layer-akhir-${i}" value="${acc.layer}"></div>
      </div>
      <div class="input-group"><label>Koreksi Stok Fisik Layer (opsional)</label><input type="number" id="layer-opname-${i}" placeholder="Isi hanya jika stok fisik beda dengan hitungan" oninput="hitungKemasan(${i})"></div>
    ` : '';
    const isGradeB = item.name.includes('Grade B');
    const sleeveExtraForm = isGradeB ? `
      <div class="sub-title">📄 6. Stok Sleeve Grade B</div>
      <div class="info-box">Stok Sleeve saat ini: <b>${acc.sleeve}</b> Pcs</div>
      <div class="row-3">
        <div class="input-group"><label>Sleeve Disiapkan (Pcs)</label><input type="number" id="sleeve-siap-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
        <div class="input-group"><label>Sleeve Terpakai (Pcs)</label><input type="number" id="sleeve-pakai-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
        <div class="input-group"><label>Stok Akhir Sleeve (Pcs)</label><input readonly id="sleeve-akhir-${i}" value="${acc.sleeve}"></div>
      </div>
      <div class="input-group"><label>Koreksi Stok Fisik Sleeve (opsional)</label><input type="number" id="sleeve-opname-${i}" placeholder="Isi hanya jika stok fisik beda dengan hitungan" oninput="hitungKemasan(${i})"></div>
    ` : '';
    return `
      <div class="card" id="card-kemasan-${i}">
        <div class="card-title">📦 Mika ${item.name} <span class="badge ${item.badge}">Std: ${item.std} Pcs/Dus</span></div>
        <div class="info-box">Stok Awal Fisik Saat Ini: Gudang <b>${gAwal}</b> Dus Utuh | Processing <b>${pAwal}</b> PCS</div>
        <div class="sub-title">📦 1. Stok Gudang — Dus Belum Dibongkar</div>
        <div class="row-2">
          <div class="input-group"><label>Kemasan Masuk (Dus)</label><input type="number" id="masuk-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
          <div class="input-group"><label>Dus Dibongkar Hari Ini</label><input type="number" id="bongkar-dus-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
        </div>
        <div class="row-2">
          <div class="input-group"><label>Stok Gudang Awal</label><input readonly value="${gAwal}"></div>
          <div class="input-group"><label>Stok Gudang Akhir (Est.)</label><input readonly id="gudang-akhir-${i}" value="${gAwal}"></div>
        </div>
        <div class="sub-title">🔧 2. Bongkar Kemasan ke Processing</div>
        <div class="warn-box">Standar acuan ${item.std} pcs/dus. Jumlah PCS aktual hasil bongkar akan otomatis masuk ke stok Processing.</div>
        <div class="row-2">
          <div class="input-group"><label>Standar PCS (Dus × ${item.std})</label><input readonly id="standar-pcs-${i}" value="0"></div>
          <div class="input-group"><label class="required">PCS Aktual Hasil Bongkar</label><input type="number" id="aktual-pcs-${i}" placeholder="Masukkan pcs aktual" oninput="hitungKemasan(${i})"></div>
        </div>
        <div class="info-box" id="info-selisih-${i}" style="background: #f8fafc; border-left-color: #64748b; color: #334155;">Selisih bongkar: <b>0 pcs</b></div>
        <div class="sub-title">🏭 3. Ruang Processing — PCS Siap Packing</div>
        <div class="row-3">
          <div class="input-group"><label>Processing Awal</label><input readonly value="${pAwal}"></div>
          <div class="input-group"><label>Hasil Bongkar (Aktual)</label><input readonly id="pcs-bongkar-display-${i}" value="0"></div>
          <div class="input-group"><label>Processing Akhir (Est.)</label><input readonly id="processing-akhir-${i}" value="${pAwal}"></div>
        </div>
        <div class="sub-title">📤 4. Pengeluaran Hari Ini</div>
        <div class="row-2">
          <div class="input-group"><label>Kirim Packing (PCS)</label><input type="number" id="kirim-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
          <div class="input-group"><label>Mika Tamu / Sample (PCS)</label><input type="number" id="tamu-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
        </div>
        <div class="input-group"><label>Keterangan Tamu / Sample</label><input type="text" id="ket-tamu-${i}" placeholder="Contoh: Demo customer / kunjungan dinas"></div>
        <div class="sub-title">❌ 5. Reject Mika Hari Ini</div>
        <div class="info-box" style="background:#fef2f2;border-left-color:#dc2626;color:#991b1b;">
          Reject Mika otomatis <b>mengurangi stok Processing</b> (sama seperti Kirim Packing & Mika Tamu).
        </div>
        <div class="input-group"><label>Reject Mika (PCS)</label><input type="number" id="reject-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
        <div class="input-group"><label>Keterangan Reject</label><input type="text" id="ket-reject-${i}" placeholder="Contoh: Sobek, pecah, kotor, atau cacat pabrik"></div>
        ${hatsuExtraForm}
        ${layerExtraForm}
        ${sleeveExtraForm}
      </div>
    `;
  }).join('');
  formWrap.innerHTML = html + stikerCardHtml();
}

function hitungKemasan(i) {
  const item = masterJenisKemasan[i];
  const gAwal = currentStockStateKemasan[item.name].gudang;
  const pAwal = currentStockStateKemasan[item.name].processing;
  const masuk = getValK(`masuk-${i}`);
  const bongkarDus = getValK(`bongkar-dus-${i}`);
  const gAkhir = gAwal + masuk - bongkarDus;
  document.getElementById(`gudang-akhir-${i}`).value = Math.max(0, gAkhir);
  const stdPcs = bongkarDus * item.std;
  document.getElementById(`standar-pcs-${i}`).value = stdPcs;
  const aktualPcs = getValK(`aktual-pcs-${i}`);
  document.getElementById(`pcs-bongkar-display-${i}`).value = aktualPcs;
  const selisih = aktualPcs - stdPcs;
  const infoEl = document.getElementById(`info-selisih-${i}`);
  if (bongkarDus > 0 || aktualPcs > 0) {
    if (selisih < 0) {
      infoEl.style.cssText = 'background: #fef2f2; border-left-color: #dc2626; color: #991b1b;';
      infoEl.innerHTML = `Selisih bongkar: <b class="kurang">${selisih} pcs</b> (Kurang dari standar)`;
    } else if (selisih > 0) {
      infoEl.style.cssText = 'background: #eff6ff; border-left-color: #2563eb; color: #1e40af;';
      infoEl.innerHTML = `Selisih bongkar: <b class="lebih">+${selisih} pcs</b> (Lebih dari standar)`;
    } else {
      infoEl.style.cssText = 'background: #f0fdf4; border-left-color: #16a34a; color: #166534;';
      infoEl.innerHTML = `Selisih bongkar: <b class="sesuai">0 pcs</b> (Sesuai standar)`;
    }
  } else {
    infoEl.style.cssText = 'background: #f8fafc; border-left-color: #64748b; color: #334155;';
    infoEl.innerHTML = `Selisih bongkar: <b>0 pcs</b>`;
  }
  const kirim = getValK(`kirim-${i}`);
  const tamu = getValK(`tamu-${i}`);
  const rej = getValK(`reject-${i}`);
  const pAkhir = pAwal + aktualPcs - kirim - tamu - rej;
  document.getElementById(`processing-akhir-${i}`).value = Math.max(0, pAkhir);
  if (item.name.includes('Hatsu')) {
    const el = document.getElementById(`netfoam-akhir-${i}`);
    if (el) el.value = akhirAks(currentAksesoris.netfoam, getValK(`netfoam-potong-${i}`), getValK(`netfoam-terpakai-${i}`), `netfoam-opname-${i}`);
    hitungStiker();
  }
  if (item.name.includes('Grade A') || item.name.includes('A11')) {
    const el = document.getElementById(`layer-akhir-${i}`);
    if (el) el.value = akhirAks(currentAksesoris.layer, getValK(`layer-siap-${i}`), getValK(`layer-pakai-${i}`), `layer-opname-${i}`);
  }
  if (item.name.includes('Grade B')) {
    const el = document.getElementById(`sleeve-akhir-${i}`);
    if (el) el.value = akhirAks(currentAksesoris.sleeve, getValK(`sleeve-siap-${i}`), getValK(`sleeve-pakai-${i}`), `sleeve-opname-${i}`);
  }
}

function simpanDataKemasan() {
  const tgl = document.getElementById('kemasan-tgl').value;
  if (!tgl) { showToast('Pilih tanggal transaksi kemasan!', 'error'); return; }
  const items = masterJenisKemasan.map((m, i) => ({
    name: m.name, std: m.std,
    masuk: getValK(`masuk-${i}`),
    bongkarDus: getValK(`bongkar-dus-${i}`),
    standarPcs: getValK(`bongkar-dus-${i}`) * m.std,
    aktualPcs: getValK(`aktual-pcs-${i}`),
    selisih: getValK(`aktual-pcs-${i}`) - (getValK(`bongkar-dus-${i}`) * m.std),
    kirim: getValK(`kirim-${i}`),
    tamu: getValK(`tamu-${i}`),
    ketTamu: document.getElementById(`ket-tamu-${i}`) ? document.getElementById(`ket-tamu-${i}`).value : '',
    reject: getValK(`reject-${i}`),
    ketReject: document.getElementById(`ket-reject-${i}`) ? document.getElementById(`ket-reject-${i}`).value : '',
    netfoamBall: getValK(`netfoam-ball-${i}`),
    netfoamPotong: getValK(`netfoam-potong-${i}`),
    netfoamTerpakai: getValK(`netfoam-terpakai-${i}`),
    netfoamAkhir: getValK(`netfoam-potong-${i}`) - getValK(`netfoam-terpakai-${i}`),
    layerSiap: getValK(`layer-siap-${i}`),
    layerPakai: getValK(`layer-pakai-${i}`),
    layerAkhir: getValK(`layer-siap-${i}`) - getValK(`layer-pakai-${i}`),
    layerOpname: getOpname(`layer-opname-${i}`),
    sleeveSiap: getValK(`sleeve-siap-${i}`),
    sleevePakai: getValK(`sleeve-pakai-${i}`),
    sleeveAkhir: getValK(`sleeve-siap-${i}`) - getValK(`sleeve-pakai-${i}`),
    sleeveOpname: getOpname(`sleeve-opname-${i}`),
    netfoamOpname: getOpname(`netfoam-opname-${i}`),
    stikerMasuk: i === 0 ? getValK('stiker-masuk') : 0,
    stikerPakai: i === 0 ? getValK('stiker-pakai') : 0,
    stikerOpname: i === 0 ? getOpname('stiker-opname') : null
  }));
  const hasData = items.some(x =>
    x.masuk > 0 || x.bongkarDus > 0 || x.aktualPcs > 0 || x.kirim > 0 || x.tamu > 0 ||
    x.reject > 0 || x.netfoamBall > 0 || x.netfoamPotong > 0 || x.netfoamTerpakai > 0 ||
    x.layerSiap > 0 || x.layerPakai > 0 || x.sleeveSiap > 0 || x.sleevePakai > 0 || x.stikerMasuk > 0 || x.stikerPakai > 0 ||
    x.netfoamOpname !== null || x.layerOpname !== null || x.sleeveOpname !== null || x.stikerOpname !== null
  );
  if (!hasData) { showToast('Isi minimal 1 data transaksi kemasan!', 'error'); return; }
  const entry = { id: generateId(), tgl, items };
  let db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]');
  db.push(entry);
  localStorage.setItem(KEMASAN_STORAGE_KEY, JSON.stringify(db));
  showToast('✅ Data kemasan berhasil disimpan!');
  recalculateStockKemasan();
  renderKemasanForms();
  renderKemasanTables();
  updateDashboard();
}

function resetFormKemasan() {
  document.getElementById('kemasan-tgl').value = new Date().toISOString().split('T')[0];
  renderKemasanForms();
}

function renderKemasanTables() {
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]');
  const varBody = document.getElementById('tbl-variance-body');
  if (varBody) {
    const varRows = [];
    [...db].sort((a, b) => new Date(b.tgl) - new Date(a.tgl)).forEach(entry => {
      if (entry.items) {
        entry.items.forEach(it => {
          if (it.bongkarDus > 0 || it.aktualPcs > 0) {
            let statusBadge = '<span class="sesuai">Sesuai</span>';
            if (it.selisih < 0) statusBadge = `<span class="kurang">Kurang (${it.selisih})</span>`;
            if (it.selisih > 0) statusBadge = `<span class="lebih">Lebih (+${it.selisih})</span>`;
            varRows.push(`<tr>
              <td>${entry.tgl}</td>
              <td><b>${it.name}</b></td>
              <td class="text-right">${it.bongkarDus}</td>
              <td class="text-right">${it.standarPcs}</td>
              <td class="text-right">${it.aktualPcs}</td>
              <td class="text-right">${it.selisih > 0 ? '+' + it.selisih : it.selisih}</td>
              <td>${statusBadge}</td>
            </tr>`);
          }
        });
      }
    });
    varBody.innerHTML = varRows.length ? varRows.join('') : '<tr><td colspan="7" class="text-center" style="color: #999;">Belum ada data selisih bongkar</td></tr>';
  }

  const histBody = document.getElementById('tbl-kemasan-history-body');
  if (histBody) {
    if (!db.length) {
      histBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: #999;">Belum ada history</td></tr>';
    } else {
      histBody.innerHTML = db.map(entry => {
        const itemMap = {};
        if (entry.items) entry.items.forEach(x => itemMap[x.name] = x);
        const h = itemMap['Hatsu'] || {};
        const a = itemMap['Grade A'] || {};
        const b = itemMap['Grade B'] || {};
        return `<tr>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="editKemasanHistory('${entry.id}')">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="hapusKemasanHistory('${entry.id}')">🗑️</button>
          </td>
          <td>${entry.tgl}</td>
          <td>G:${h.masuk || 0}/${h.bongkarDus || 0}D | P:${h.aktualPcs || 0}Pcs</td>
          <td>G:${a.masuk || 0}/${a.bongkarDus || 0}D | P:${a.aktualPcs || 0}Pcs</td>
          <td>G:${b.masuk || 0}/${b.bongkarDus || 0}D | P:${b.aktualPcs || 0}Pcs</td>
          <td><small>Kirim: ${(h.kirim || 0) + (a.kirim || 0) + (b.kirim || 0)} | Rej: ${rejMika(h) + rejMika(a) + rejMika(b)}</small></td>
        </tr>`;
      }).join('');
    }
  }
  renderKemasanMonthly();
}

function renderKemasanMonthly() {
  const filterEl = document.getElementById('filter-bulan-kemasan');
  if (!filterEl) return;
  const filterBulan = filterEl.value;
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]');
  const filtered = db.filter(e => e.tgl.startsWith(filterBulan));
  const mBody = document.getElementById('tbl-monthly-body');
  const mRows = [];
  const statsPerJenis = {
    'Hatsu': { dus: 0, std: 0, akt: 0, sel: 0 },
    'Grade A': { dus: 0, std: 0, akt: 0, sel: 0 },
    'Grade B': { dus: 0, std: 0, akt: 0, sel: 0 }
  };
  filtered.forEach(entry => {
    if (entry.items) {
      entry.items.forEach(it => {
        if (it.bongkarDus > 0 || it.aktualPcs > 0) {
          if (statsPerJenis[it.name]) {
            statsPerJenis[it.name].dus += it.bongkarDus;
            statsPerJenis[it.name].std += it.standarPcs;
            statsPerJenis[it.name].akt += it.aktualPcs;
            statsPerJenis[it.name].sel += it.selisih;
          }
          let statusBadge = '<span class="sesuai">Sesuai</span>';
          if (it.selisih < 0) statusBadge = `<span class="kurang">Kurang (${it.selisih})</span>`;
          if (it.selisih > 0) statusBadge = `<span class="lebih">Lebih (+${it.selisih})</span>`;
          mRows.push(`<tr>
            <td>${entry.tgl}</td>
            <td><b>${it.name}</b></td>
            <td class="text-right">${it.bongkarDus}</td>
            <td class="text-right">${it.standarPcs}</td>
            <td class="text-right">${it.aktualPcs}</td>
            <td class="text-right">${it.selisih > 0 ? '+' + it.selisih : it.selisih}</td>
            <td>${statusBadge}</td>
          </tr>`);
        }
      });
    }
  });
  if (mBody) mBody.innerHTML = mRows.length ? mRows.join('') : '<tr><td colspan="7" class="text-center" style="color: #999;">Belum ada data selisih bulan ini</td></tr>';
  const cardsEl = document.getElementById('cards-rekap-jenis');
  if (cardsEl) {
    cardsEl.innerHTML = masterJenisKemasan.map(m => {
      const st = statsPerJenis[m.name];
      const cls = st.sel < 0 ? 'red' : st.sel > 0 ? 'blue' : 'green';
      return `
        <div class="stat-card ${cls}">
          <div class="stat-label">Mika ${m.name}</div>
          <div class="stat-value" style="font-size: 1.5rem;">${st.sel > 0 ? '+' + st.sel : st.sel} <small style="font-size: 0.8rem;">Pcs Selisih</small></div>
          <div class="stat-meta">Total Bongkar: ${st.dus} Dus (${st.akt} Pcs)</div>
        </div>
      `;
    }).join('');
  }
}

function exportKemasanCSV() {
  const filterBulan = document.getElementById('filter-bulan-kemasan').value;
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]');
  const filtered = db.filter(e => e.tgl.startsWith(filterBulan));
  if (!filtered.length) { showToast('Tidak ada data kemasan untuk diexport!', 'error'); return; }
  let csv = 'Tanggal,Jenis Grade,Bongkar (Dus),Standar (Pcs),Aktual (Pcs),Selisih (Pcs)\n';
  filtered.forEach(entry => {
    if (entry.items) {
      entry.items.forEach(it => {
        if (it.bongkarDus > 0 || it.aktualPcs > 0) {
          csv += `"${entry.tgl}","${it.name}",${it.bongkarDus},${it.standarPcs},${it.aktualPcs},${it.selisih}\n`;
        }
      });
    }
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `Rekap_Selisih_Kemasan_${filterBulan}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('📥 Berhasil mendownload CSV!');
}

function hapusKemasanHistory(id) {
  if (!confirm('Yakin hapus transaksi kemasan ini?')) return;
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]');
  const filtered = db.filter(x => String(x.id) !== String(id));
  localStorage.setItem(KEMASAN_STORAGE_KEY, JSON.stringify(filtered));
  showToast('✅ Transaksi kemasan berhasil dihapus!');
  recalculateStockKemasan();
  renderKemasanForms();
  renderKemasanTables();
  updateDashboard();
}

function hapusSemuaHistoryKemasan() {
  if (!confirm('⚠️ HATI-HATI! Yakin mau hapus SEMUA history transaksi kemasan?')) return;
  localStorage.removeItem(KEMASAN_STORAGE_KEY);
  showToast('✅ Semua history kemasan dibersihkan!');
  recalculateStockKemasan();
  renderKemasanForms();
  renderKemasanTables();
  updateDashboard();
}

const AKS_EDIT_FIELDS = {
  'Hatsu': [['netfoamPotong', 'Netfoam Dipotong'], ['netfoamTerpakai', 'Netfoam Terpakai'], ['stikerMasuk', 'Stiker Masuk'], ['stikerPakai', 'Stiker Terpakai']],
  'Grade A': [['layerSiap', 'Layer Disiapkan'], ['layerPakai', 'Layer Terpakai']],
  'Grade B': [['sleeveSiap', 'Sleeve Disiapkan'], ['sleevePakai', 'Sleeve Terpakai']]
};

function editKemasanHistory(id) {
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]');
  const entry = db.find(x => String(x.id) === String(id));
  if (!entry) return;
  window.editingKemasanId = id;
  const body = document.getElementById('modal-edit-kemasan-body');
  let html = `<div class="input-group"><label>Tanggal</label><input type="date" id="edit-k-tgl" value="${entry.tgl}"></div>`;
  entry.items.forEach((it, idx) => {
    html += `
      <div style="border: 1px solid #e5e7eb; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.75rem; background: #fafafa;">
        <strong>Mika ${it.name}</strong>
        <div class="row-2" style="margin-top: 0.5rem;">
          <div class="input-group"><label>Masuk (Dus)</label><input type="number" id="edit-masuk-${idx}" value="${it.masuk || 0}"></div>
          <div class="input-group"><label>Bongkar (Dus)</label><input type="number" id="edit-bongkar-${idx}" value="${it.bongkarDus || 0}"></div>
        </div>
        <div class="row-2">
          <div class="input-group"><label>Aktual (Pcs)</label><input type="number" id="edit-aktual-${idx}" value="${it.aktualPcs || 0}"></div>
          <div class="input-group"><label>Kirim (Pcs)</label><input type="number" id="edit-kirim-${idx}" value="${it.kirim || 0}"></div>
        </div>
        <div class="row-2">
          <div class="input-group"><label>Reject Mika (Pcs)</label><input type="number" id="edit-reject-${idx}" value="${rejMika(it)}"></div>
        </div>
        <div class="row-2">
          ${(AKS_EDIT_FIELDS[it.name] || []).map(([f, lbl]) =>
            `<div class="input-group"><label>${lbl} (Pcs)</label><input type="number" id="edit-aks-${idx}-${f}" value="${it[f] || 0}"></div>`).join('')}
        </div>
      </div>
    `;
  });
  body.innerHTML = html;
  document.getElementById('modal-edit-kemasan').classList.add('show');
}

function closeModalEditKemasan() {
  document.getElementById('modal-edit-kemasan').classList.remove('show');
  window.editingKemasanId = null;
}

function saveEditKemasan() {
  if (!window.editingKemasanId) return;
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]');
  const idx = db.findIndex(x => String(x.id) === String(window.editingKemasanId));
  if (idx === -1) return;
  const tgl = document.getElementById('edit-k-tgl').value;
  const updatedItems = masterJenisKemasan.map((m, i) => {
    const masuk = parseFloat(document.getElementById(`edit-masuk-${i}`).value || 0);
    const bongkar = parseFloat(document.getElementById(`edit-bongkar-${i}`).value || 0);
    const aktual = parseFloat(document.getElementById(`edit-aktual-${i}`).value || 0);
    const kirim = parseFloat(document.getElementById(`edit-kirim-${i}`).value || 0);
    const reject = parseFloat((document.getElementById(`edit-reject-${i}`) || {}).value || 0);
    const stdPcs = bongkar * m.std;
    const aksEdit = {};
    (AKS_EDIT_FIELDS[m.name] || []).forEach(([f]) => {
      const el = document.getElementById(`edit-aks-${i}-${f}`);
      if (el) aksEdit[f] = parseFloat(el.value || 0);
    });
    const base = { ...db[idx].items[i] };
    delete base.rejectTutup;
    delete base.rejectAlas;
    return {
      ...base,
      masuk, bongkarDus: bongkar, standarPcs: stdPcs, aktualPcs: aktual,
      selisih: aktual - stdPcs, kirim, reject, ...aksEdit
    };
  });
  db[idx] = { id: window.editingKemasanId, tgl, items: updatedItems };
  localStorage.setItem(KEMASAN_STORAGE_KEY, JSON.stringify(db));
  showToast('✅ Transaksi kemasan diupdate!');
  closeModalEditKemasan();
  recalculateStockKemasan();
  renderKemasanForms();
  renderKemasanTables();
  updateDashboard();
}

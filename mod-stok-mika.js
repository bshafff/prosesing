// ========== STOK MIKA / KEMASAN MODULE ==========

// Konversi default per item aksesoris
const AKS_KONVERSI = {
  layer: 100,    // 1 dus = 100 pcs
  sleeve: 100,   // 1 dus = 100 pcs
  stiker: 136,   // 1 lembar = 136 pcs
  netfoam: 1800  // 1 ball = 1800 potong
};

function defaultAksState() {
  return {
    layer: { gudang: 0, proc: 0 },
    sleeve: { gudang: 0, proc: 0 },
    stiker: { gudang: 0, proc: 0 },
    netfoam: { ball: 0, proc: 0 }
  };
}

function recalculateStockKemasan() {
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]');
  const accum = {};
  masterJenisKemasan.forEach(m => { accum[m.name] = { gudang: 0, processing: 0, keluar: 0, reject: 0 }; });
  const aks = defaultAksState();

  const sorted = [...db].sort((a, b) => new Date(a.tgl) - new Date(b.tgl));
  sorted.forEach(entry => {
    if (!entry.items || !Array.isArray(entry.items)) return;
    entry.items.forEach(item => {
      if (accum[item.name]) {
        accum[item.name].gudang += (item.masuk || 0) - (item.bongkarDus || 0);
        const totalOut = (item.kirim || 0) + (item.tamu || 0);
        const totalRej = rejMika(item);
        const opname = (typeof item.processingOpname === 'number' && !isNaN(item.processingOpname))
          ? item.processingOpname : null;
        if (opname !== null) {
          accum[item.name].processing = opname;
        } else {
          accum[item.name].processing += (item.aktualPcs || 0) - totalOut - totalRej;
        }
        accum[item.name].keluar += totalOut;
        accum[item.name].reject += totalRej;
      }

      // --- Netfoam & Stiker (khusus Hatsu) ---
      if (item.name === 'Hatsu') {
        const nMasukBall = item.netfoamMasukBall || 0;
        const nPotongBall = item.netfoamPotongBall || 0;
        const nAktualPcs = (item.netfoamAktualPcs != null) ? item.netfoamAktualPcs
                          : (item.netfoamPotong || 0);
        const nPakai = (item.netfoamPakai != null) ? item.netfoamPakai
                     : (item.netfoamTerpakai || 0);
        const nOpname = (typeof item.netfoamOpname === 'number') ? item.netfoamOpname : null;
        aks.netfoam.ball += nMasukBall - nPotongBall;
        if (nOpname !== null) {
          aks.netfoam.proc = nOpname;
        } else {
          aks.netfoam.proc += nAktualPcs - nPakai;
        }

        const sMasukLembar = (item.stikerMasukLembar != null) ? item.stikerMasukLembar
                            : (item.stikerMasuk || 0);
        const sBongkarLembar = item.stikerBongkarLembar || 0;
        const sAktualPcs = (item.stikerAktualPcs != null) ? item.stikerAktualPcs
                         : (sBongkarLembar * AKS_KONVERSI.stiker);
        const sPakai = item.stikerPakai || 0;
        const sOpname = (typeof item.stikerOpname === 'number') ? item.stikerOpname : null;
        aks.stiker.gudang += sMasukLembar - sBongkarLembar;
        if (sOpname !== null) {
          aks.stiker.proc = sOpname;
        } else {
          // FIX: hapus syarat — selalu kurangi terpakai
          aks.stiker.proc += sAktualPcs - sPakai;
        }
      }

      // --- Layer (khusus Grade A) ---
      if (item.name === 'Grade A') {
        const lMasukDus = item.layerMasukDus || 0;
        const lBongkarDus = item.layerBongkarDus || 0;
        const lAktualPcs = (item.layerAktualPcs != null) ? item.layerAktualPcs
                         : (item.layerSiap || 0);
        const lPakai = item.layerPakai || 0;
        const lOpname = (typeof item.layerOpname === 'number') ? item.layerOpname : null;
        aks.layer.gudang += lMasukDus - lBongkarDus;
        if (lOpname !== null) {
          aks.layer.proc = lOpname;
        } else {
          aks.layer.proc += lAktualPcs - lPakai;
        }
      }

      // --- Sleeve (khusus Grade B) ---
      if (item.name === 'Grade B') {
        const slMasukDus = item.sleeveMasukDus || 0;
        const slBongkarDus = item.sleeveBongkarDus || 0;
        const slAktualPcs = (item.sleeveAktualPcs != null) ? item.sleeveAktualPcs
                          : (item.sleeveSiap || 0);
        const slPakai = item.sleevePakai || 0;
        const slOpname = (typeof item.sleeveOpname === 'number') ? item.sleeveOpname : null;
        aks.sleeve.gudang += slMasukDus - slBongkarDus;
        if (slOpname !== null) {
          aks.sleeve.proc = slOpname;
        } else {
          aks.sleeve.proc += slAktualPcs - slPakai;
        }
      }
    });
  });

  masterJenisKemasan.forEach(m => {
    currentStockStateKemasan[m.name] = {
      gudang: Math.max(0, accum[m.name].gudang),
      processing: Math.max(0, accum[m.name].processing)
    };
  });

  currentAksesoris = {
    layer: { gudang: Math.max(0, aks.layer.gudang), proc: Math.max(0, aks.layer.proc) },
    sleeve: { gudang: Math.max(0, aks.sleeve.gudang), proc: Math.max(0, aks.sleeve.proc) },
    stiker: { gudang: Math.max(0, aks.stiker.gudang), proc: Math.max(0, aks.stiker.proc) },
    netfoam: { ball: Math.max(0, aks.netfoam.ball), proc: Math.max(0, aks.netfoam.proc) }
  };

  // Render summary mika
  let totGudang = 0, totProc = 0, totKeluar = 0, totRej = 0;
  let summaryHtml = '';
  masterJenisKemasan.forEach(m => {
    const a = accum[m.name];
    const estimasiPcs = a.gudang * m.std;
    const totalAkhir = estimasiPcs + a.processing;
    totGudang += a.gudang; totProc += a.processing; totKeluar += a.keluar; totRej += a.reject;
    summaryHtml += `<tr>
      <td><strong><span class="badge ${m.badge}">${m.name}</span></strong></td>
      <td class="text-right">${a.gudang} Dus</td>
      <td class="text-right">${estimasiPcs.toLocaleString('id-ID')} Pcs</td>
      <td class="text-right">${a.processing.toLocaleString('id-ID')} Pcs</td>
      <td class="text-right"><strong>${totalAkhir.toLocaleString('id-ID')} Pcs</strong></td>
      <td class="text-right" style="color:#dc2626;">${a.reject} Pcs</td>
    </tr>`;
  });
  const sumBody = document.getElementById('tbl-summary-body');
  if (sumBody) sumBody.innerHTML = summaryHtml;

  // Render summary aksesoris
  const aksBody = document.getElementById('tbl-aks-body');
  if (aksBody) {
    const aksList = [
      { label: 'Layer A11', badge: 'gradea', gudang: currentAksesoris.layer.gudang, satuan: 'Dus', konversi: AKS_KONVERSI.layer, proc: currentAksesoris.layer.proc },
      { label: 'Sleeve', badge: 'gradeb', gudang: currentAksesoris.sleeve.gudang, satuan: 'Dus', konversi: AKS_KONVERSI.sleeve, proc: currentAksesoris.sleeve.proc },
      { label: 'Stiker', badge: 'hatsu', gudang: currentAksesoris.stiker.gudang, satuan: 'Lembar', konversi: AKS_KONVERSI.stiker, proc: currentAksesoris.stiker.proc },
      { label: 'Netfoam', badge: 'hatsu', gudang: currentAksesoris.netfoam.ball, satuan: 'Ball', konversi: AKS_KONVERSI.netfoam, proc: currentAksesoris.netfoam.proc }
    ];
    aksBody.innerHTML = aksList.map(a => {
      const estimasi = a.gudang * a.konversi;
      const totalAkhir = estimasi + a.proc;
      return `<tr>
        <td><strong><span class="badge ${a.badge}">${a.label}</span></strong></td>
        <td class="text-right">${a.gudang} ${a.satuan}</td>
        <td class="text-right">${estimasi.toLocaleString('id-ID')} Pcs</td>
        <td class="text-right">${a.proc.toLocaleString('id-ID')} Pcs</td>
        <td class="text-right"><strong>${totalAkhir.toLocaleString('id-ID')} Pcs</strong></td>
      </tr>`;
    }).join('');
  }

  const elGdg = document.getElementById('k-stat-gudang');
  const elProc = document.getElementById('k-stat-processing');
  const elKel = document.getElementById('k-stat-keluar');
  const elRej = document.getElementById('k-stat-reject');
  if (elGdg) elGdg.textContent = totGudang;
  if (elProc) elProc.textContent = totProc;
  if (elKel) elKel.textContent = totKeluar;
  if (elRej) elRej.textContent = totRej;
}

function getOpname(id) {
  const el = document.getElementById(id);
  if (!el || el.value === '') return null;
  const n = parseFloat(el.value);
  return isNaN(n) ? null : n;
}

function getValK(id) {
  const el = document.getElementById(id);
  return el ? (parseFloat(el.value) || 0) : 0;
}

// ========== HTML BUILDER: AKSESORIS ==========
function netfoamCardHtml() {
  const a = currentAksesoris.netfoam;
  return `
    <div class="sub-title">🧽 6. Stok Netfoam Hatsuhana <span class="badge hatsu">1 Ball = ${AKS_KONVERSI.netfoam} Potong</span></div>
    <div class="info-box">Stok Ball: <b>${a.ball}</b> Ball | Stok Potong: <b>${a.proc}</b> Pcs</div>

    <div class="row-2">
      <div class="input-group"><label>Netfoam Masuk (Ball)</label><input type="number" id="netfoam-masuk-ball" placeholder="0" oninput="hitungKemasan(0)"></div>
      <div class="input-group"><label>Netfoam Dipotong (Ball)</label><input type="number" id="netfoam-potong-ball" placeholder="0" oninput="hitungKemasan(0)"></div>
    </div>
    <div class="row-2">
      <div class="input-group"><label>Stok Ball Awal</label><input readonly value="${a.ball}"></div>
      <div class="input-group"><label>Stok Ball Akhir (Est.)</label><input readonly id="netfoam-ball-akhir"></div>
    </div>

    <div class="row-2">
      <div class="input-group"><label>Standar Potong (Ball × ${AKS_KONVERSI.netfoam})</label><input readonly id="netfoam-standar-pcs"></div>
      <div class="input-group"><label>Aktual Potong (Pcs)</label><input type="number" id="netfoam-aktual-pcs" placeholder="0 = pakai standar" oninput="hitungKemasan(0)"></div>
    </div>

    <div class="row-2">
      <div class="input-group"><label>Potong Awal</label><input readonly value="${a.proc}"></div>
      <div class="input-group"><label>Netfoam Terpakai (Pcs)</label><input type="number" id="netfoam-pakai" placeholder="0" oninput="hitungKemasan(0)"></div>
    </div>
    <div class="input-group"><label>Potong Akhir (Est.)</label><input readonly id="netfoam-proc-akhir"></div>

    <div class="input-group" style="background:#f0fdf4;padding:0.75rem;border-radius:8px;border-left:3px solid #16a34a;">
      <label style="color:#166534;font-weight:700;">🔧 Koreksi Stok Fisik Potong (Pcs)</label>
      <input type="number" id="netfoam-opname" placeholder="Kosongkan kalau sesuai hitungan" oninput="hitungKemasan(0)">
    </div>
  `;
}

function layerCardHtml() {
  const a = currentAksesoris.layer;
  return `
    <div class="sub-title">📄 6. Stok Layer A11 <span class="badge gradea">1 Dus = ${AKS_KONVERSI.layer} Pcs</span></div>
    <div class="info-box">Stok Gudang: <b>${a.gudang}</b> Dus (${a.gudang * AKS_KONVERSI.layer} Pcs) | Stok Processing: <b>${a.proc}</b> Pcs</div>

    <div class="row-2">
      <div class="input-group"><label>Layer Masuk (Dus)</label><input type="number" id="layer-masuk-dus" placeholder="0" oninput="hitungKemasan(1)"></div>
      <div class="input-group"><label>Layer Dibongkar (Dus)</label><input type="number" id="layer-bongkar-dus" placeholder="0" oninput="hitungKemasan(1)"></div>
    </div>
    <div class="row-2">
      <div class="input-group"><label>Stok Gudang Awal</label><input readonly value="${a.gudang}"></div>
      <div class="input-group"><label>Stok Gudang Akhir (Est.)</label><input readonly id="layer-gudang-akhir"></div>
    </div>

    <div class="row-2">
      <div class="input-group"><label>Standar Pcs (Dus × ${AKS_KONVERSI.layer})</label><input readonly id="layer-standar-pcs"></div>
      <div class="input-group"><label>Pcs Aktual Bongkar</label><input type="number" id="layer-aktual-pcs" placeholder="0 = pakai standar" oninput="hitungKemasan(1)"></div>
    </div>

    <div class="row-2">
      <div class="input-group"><label>Processing Awal</label><input readonly value="${a.proc}"></div>
      <div class="input-group"><label>Layer Terpakai (Pcs)</label><input type="number" id="layer-pakai" placeholder="0" oninput="hitungKemasan(1)"></div>
    </div>
    <div class="input-group"><label>Processing Akhir (Est.)</label><input readonly id="layer-proc-akhir"></div>

    <div class="input-group" style="background:#f0fdf4;padding:0.75rem;border-radius:8px;border-left:3px solid #16a34a;">
      <label style="color:#166534;font-weight:700;">🔧 Koreksi Stok Fisik Processing (Pcs)</label>
      <input type="number" id="layer-opname" placeholder="Kosongkan kalau sesuai hitungan" oninput="hitungKemasan(1)">
    </div>
  `;
}

function sleeveCardHtml() {
  const a = currentAksesoris.sleeve;
  return `
    <div class="sub-title">📄 6. Stok Sleeve Grade B <span class="badge gradeb">1 Dus = ${AKS_KONVERSI.sleeve} Pcs</span></div>
    <div class="info-box">Stok Gudang: <b>${a.gudang}</b> Dus (${a.gudang * AKS_KONVERSI.sleeve} Pcs) | Stok Processing: <b>${a.proc}</b> Pcs</div>

    <div class="row-2">
      <div class="input-group"><label>Sleeve Masuk (Dus)</label><input type="number" id="sleeve-masuk-dus" placeholder="0" oninput="hitungKemasan(2)"></div>
      <div class="input-group"><label>Sleeve Dibongkar (Dus)</label><input type="number" id="sleeve-bongkar-dus" placeholder="0" oninput="hitungKemasan(2)"></div>
    </div>
    <div class="row-2">
      <div class="input-group"><label>Stok Gudang Awal</label><input readonly value="${a.gudang}"></div>
      <div class="input-group"><label>Stok Gudang Akhir (Est.)</label><input readonly id="sleeve-gudang-akhir"></div>
    </div>

    <div class="row-2">
      <div class="input-group"><label>Standar Pcs (Dus × ${AKS_KONVERSI.sleeve})</label><input readonly id="sleeve-standar-pcs"></div>
      <div class="input-group"><label>Pcs Aktual Bongkar</label><input type="number" id="sleeve-aktual-pcs" placeholder="0 = pakai standar" oninput="hitungKemasan(2)"></div>
    </div>

    <div class="row-2">
      <div class="input-group"><label>Processing Awal</label><input readonly value="${a.proc}"></div>
      <div class="input-group"><label>Sleeve Terpakai (Pcs)</label><input type="number" id="sleeve-pakai" placeholder="0" oninput="hitungKemasan(2)"></div>
    </div>
    <div class="input-group"><label>Processing Akhir (Est.)</label><input readonly id="sleeve-proc-akhir"></div>

    <div class="input-group" style="background:#f0fdf4;padding:0.75rem;border-radius:8px;border-left:3px solid #16a34a;">
      <label style="color:#166534;font-weight:700;">🔧 Koreksi Stok Fisik Processing (Pcs)</label>
      <input type="number" id="sleeve-opname" placeholder="Kosongkan kalau sesuai hitungan" oninput="hitungKemasan(2)">
    </div>
  `;
}

function stikerCardHtml() {
  const a = currentAksesoris.stiker;
  return `
    <div class="card">
      <div class="card-title">🏷️ Stok Stiker <span class="badge info">1 Lembar = ${AKS_KONVERSI.stiker} Pcs</span></div>
      <div class="info-box">Stok Gudang: <b>${a.gudang}</b> Lembar (${a.gudang * AKS_KONVERSI.stiker} Pcs) | Stok Processing: <b>${a.proc}</b> Pcs</div>

      <div class="sub-title">📦 1. Stok Gudang (Lembar Belum Dipakai)</div>
      <div class="row-2">
        <div class="input-group"><label>Stiker Masuk (Lembar)</label><input type="number" id="stiker-masuk-lembar" placeholder="0" oninput="hitungKemasan(0)"></div>
        <div class="input-group"><label>Stiker Ditempel (Lembar)</label><input type="number" id="stiker-bongkar-lembar" placeholder="0" oninput="hitungKemasan(0)"></div>
      </div>
      <div class="row-2">
        <div class="input-group"><label>Stok Gudang Awal</label><input readonly value="${a.gudang}"></div>
        <div class="input-group"><label>Stok Gudang Akhir (Est.)</label><input readonly id="stiker-gudang-akhir"></div>
      </div>

      <div class="sub-title">🔧 2. Bongkar Lembar ke Processing</div>
      <div class="row-2">
        <div class="input-group"><label>Standar Pcs (Lembar × ${AKS_KONVERSI.stiker})</label><input readonly id="stiker-standar-pcs"></div>
        <div class="input-group"><label>Pcs Aktual</label><input type="number" id="stiker-aktual-pcs" placeholder="0 = pakai standar" oninput="hitungKemasan(0)"></div>
      </div>

      <div class="sub-title">🏭 3. Stok Processing (Pcs Siap Pakai)</div>
      <div class="row-2">
        <div class="input-group"><label>Processing Awal</label><input readonly value="${a.proc}"></div>
        <div class="input-group"><label>Stiker Terpakai (Pcs)</label><input type="number" id="stiker-pakai" placeholder="0" oninput="hitungKemasan(0)"></div>
      </div>
      <div class="input-group"><label>Processing Akhir (Est.)</label><input readonly id="stiker-proc-akhir"></div>

      <div class="input-group" style="background:#f0fdf4;padding:0.75rem;border-radius:8px;border-left:3px solid #16a34a;">
        <label style="color:#166534;font-weight:700;">🔧 Koreksi Stok Fisik Processing (Pcs)</label>
        <input type="number" id="stiker-opname" placeholder="Kosongkan kalau sesuai hitungan" oninput="hitungKemasan(0)">
      </div>
    </div>
  `;
}

// ========== BUILD MIKA FORM ==========
function buildMikaForm(item, i) {
  const gAwal = currentStockStateKemasan[item.name].gudang;
  const pAwal = currentStockStateKemasan[item.name].processing;
  const isHatsu = item.name.includes('Hatsu');
  const isGradeA = item.name.includes('Grade A') || item.name.includes('A11');
  const isGradeB = item.name.includes('Grade B');

  const extraForm = isHatsu ? netfoamCardHtml()
                  : isGradeA ? layerCardHtml()
                  : isGradeB ? sleeveCardHtml()
                  : '';

  return `
    <div class="card">
      <div class="card-title">📦 Mika ${item.name} <span class="badge ${item.badge}">Std: ${item.std} Pcs/Dus</span></div>
      <div class="info-box">Stok Awal: Gudang <b>${gAwal}</b> Dus | Processing <b>${pAwal}</b> Pcs</div>

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
      <div class="row-2">
        <div class="input-group"><label>Standar PCS (Dus × ${item.std})</label><input readonly id="standar-pcs-${i}" value="0"></div>
        <div class="input-group"><label class="required">PCS Aktual Bongkar</label><input type="number" id="aktual-pcs-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
      </div>
      <div class="info-box" id="info-selisih-${i}" style="background: #f8fafc; border-left-color: #64748b; color: #334155;">Selisih bongkar: <b>0 pcs</b></div>

      <div class="sub-title">🏭 3. Ruang Processing — PCS Siap Packing</div>
      <div class="row-3">
        <div class="input-group"><label>Processing Awal</label><input readonly value="${pAwal}"></div>
        <div class="input-group"><label>Hasil Bongkar</label><input readonly id="pcs-bongkar-display-${i}" value="0"></div>
        <div class="input-group"><label>Processing Akhir (Est.)</label><input readonly id="processing-akhir-${i}" value="${pAwal}"></div>
      </div>
      <div class="input-group" style="background:#f0fdf4;padding:0.75rem;border-radius:8px;border-left:3px solid #16a34a;margin-top:0.75rem;">
        <label style="color:#166534;font-weight:700;">🔧 Koreksi Stok Fisik Processing (Pcs)</label>
        <input type="number" id="processing-opname-${i}" placeholder="Kosongkan kalau sesuai" oninput="hitungKemasan(${i})">
      </div>

      <div class="sub-title">📤 4. Pengeluaran Hari Ini</div>
      <div class="row-2">
        <div class="input-group"><label>Kirim Packing (PCS)</label><input type="number" id="kirim-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
        <div class="input-group"><label>Mika Tamu / Sample (PCS)</label><input type="number" id="tamu-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
      </div>
      <div class="input-group"><label>Keterangan Tamu / Sample</label><input type="text" id="ket-tamu-${i}" placeholder="Contoh: Demo customer"></div>

      <div class="sub-title">❌ 5. Reject Mika Hari Ini</div>
      <div class="input-group"><label>Reject Mika (PCS)</label><input type="number" id="reject-${i}" placeholder="0" oninput="hitungKemasan(${i})"></div>
      <div class="input-group"><label>Keterangan Reject</label><input type="text" id="ket-reject-${i}" placeholder="Contoh: Sobek, pecah"></div>

      ${extraForm}
    </div>
  `;
}

function renderKemasanForms() {
  const hatsuPanel = document.getElementById('input-panel-hatsu');
  const gradeAPanel = document.getElementById('input-panel-gradea');
  const gradeBPanel = document.getElementById('input-panel-gradeb');
  const stikerPanel = document.getElementById('input-panel-stiker');

  if (!hatsuPanel) return;

  hatsuPanel.innerHTML = buildMikaForm(masterJenisKemasan[0], 0);
  gradeAPanel.innerHTML = buildMikaForm(masterJenisKemasan[1], 1);
  gradeBPanel.innerHTML = buildMikaForm(masterJenisKemasan[2], 2);
  stikerPanel.innerHTML = stikerCardHtml();
}

function showInputKemasanTab(tab, btn) {
  document.querySelectorAll('#forms-kemasan .input-kemasan-panel').forEach(p => p.style.display = 'none');
  const map = {
    hatsu: 'input-panel-hatsu',
    gradea: 'input-panel-gradea',
    gradeb: 'input-panel-gradeb',
    stiker: 'input-panel-stiker'
  };
  const panel = document.getElementById(map[tab]);
  if (panel) panel.style.display = 'block';
  document.querySelectorAll('#input-kemasan-tabs .sub-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ========== HITUNG ==========
function hitungKemasan(i) {
  const item = masterJenisKemasan[i];
  const gAwal = currentStockStateKemasan[item.name].gudang;
  const pAwal = currentStockStateKemasan[item.name].processing;

  const masuk = getValK(`masuk-${i}`);
  const bongkarDus = getValK(`bongkar-dus-${i}`);
  const gAkhir = gAwal + masuk - bongkarDus;
  const gEl = document.getElementById(`gudang-akhir-${i}`);
  if (gEl) gEl.value = Math.max(0, gAkhir);

  const stdPcs = bongkarDus * item.std;
  const stdEl = document.getElementById(`standar-pcs-${i}`);
  if (stdEl) stdEl.value = stdPcs;

  const aktualPcs = getValK(`aktual-pcs-${i}`);
  const bongkarDisp = document.getElementById(`pcs-bongkar-display-${i}`);
  if (bongkarDisp) bongkarDisp.value = aktualPcs;

  const selisih = aktualPcs - stdPcs;
  const infoEl = document.getElementById(`info-selisih-${i}`);
  if (infoEl) {
    if (bongkarDus > 0 || aktualPcs > 0) {
      if (selisih < 0) {
        infoEl.style.cssText = 'background:#fef2f2;border-left-color:#dc2626;color:#991b1b;';
        infoEl.innerHTML = `Selisih bongkar: <b class="kurang">${selisih} pcs</b> (Kurang)`;
      } else if (selisih > 0) {
        infoEl.style.cssText = 'background:#eff6ff;border-left-color:#2563eb;color:#1e40af;';
        infoEl.innerHTML = `Selisih bongkar: <b class="lebih">+${selisih} pcs</b> (Lebih)`;
      } else {
        infoEl.style.cssText = 'background:#f0fdf4;border-left-color:#16a34a;color:#166534;';
        infoEl.innerHTML = `Selisih bongkar: <b class="sesuai">0 pcs</b> (Sesuai)`;
      }
    } else {
      infoEl.style.cssText = 'background:#f8fafc;border-left-color:#64748b;color:#334155;';
      infoEl.innerHTML = `Selisih bongkar: <b>0 pcs</b>`;
    }
  }

  const kirim = getValK(`kirim-${i}`);
  const tamu = getValK(`tamu-${i}`);
  const rej = getValK(`reject-${i}`);
  const pAkhirNormal = pAwal + aktualPcs - kirim - tamu - rej;
  const opnameEl = document.getElementById(`processing-opname-${i}`);
  const opnameValue = opnameEl && opnameEl.value !== '' ? parseFloat(opnameEl.value) : null;
  const pAkhirFinal = (opnameValue !== null && !isNaN(opnameValue)) ? opnameValue : pAkhirNormal;
  const procAkhirEl = document.getElementById(`processing-akhir-${i}`);
  if (procAkhirEl) procAkhirEl.value = Math.max(0, pAkhirFinal);

  if (item.name === 'Hatsu') {
    // Netfoam
    const nAwal = currentAksesoris.netfoam;
    const nMasukBall = getValK('netfoam-masuk-ball');
    const nPotongBall = getValK('netfoam-potong-ball');
    const nBallAkhir = nAwal.ball + nMasukBall - nPotongBall;
    const nBallEl = document.getElementById('netfoam-ball-akhir');
    if (nBallEl) nBallEl.value = Math.max(0, nBallAkhir);

    const nStd = nPotongBall * AKS_KONVERSI.netfoam;
    const nStdEl = document.getElementById('netfoam-standar-pcs');
    if (nStdEl) nStdEl.value = nStd;

    const nAktualInput = getValK('netfoam-aktual-pcs');
    const nAktualPcs = nAktualInput > 0 ? nAktualInput : nStd;
    const nPakai = getValK('netfoam-pakai');
    const nOpname = getOpname('netfoam-opname');
    const nProcNormal = nAwal.proc + nAktualPcs - nPakai;
    const nProcFinal = (nOpname !== null) ? nOpname : nProcNormal;
    const nProcEl = document.getElementById('netfoam-proc-akhir');
    if (nProcEl) nProcEl.value = Math.max(0, nProcFinal);

    // Stiker
    const sAwal = currentAksesoris.stiker;
    const sMasukLembar = getValK('stiker-masuk-lembar');
    const sDitempelLembar = getValK('stiker-bongkar-lembar');
    const sGudangAkhir = sAwal.gudang + sMasukLembar - sDitempelLembar;
    const sGudangEl = document.getElementById('stiker-gudang-akhir');
    if (sGudangEl) sGudangEl.value = Math.max(0, sGudangAkhir);

    const sStd = sDitempelLembar * AKS_KONVERSI.stiker;
    const sStdEl = document.getElementById('stiker-standar-pcs');
    if (sStdEl) sStdEl.value = sStd;

    const sAktualInput = getValK('stiker-aktual-pcs');
    const sAktualPcs = sAktualInput > 0 ? sAktualInput : sStd;
    const sPakai = getValK('stiker-pakai');
    const sOpname = getOpname('stiker-opname');
    const sProcNormal = sAwal.proc + sAktualPcs - sPakai;
    const sProcFinal = (sOpname !== null) ? sOpname : sProcNormal;
    const sProcEl = document.getElementById('stiker-proc-akhir');
    if (sProcEl) sProcEl.value = Math.max(0, sProcFinal);
  }

  if (item.name === 'Grade A') {
    const lAwal = currentAksesoris.layer;
    const lMasukDus = getValK('layer-masuk-dus');
    const lBongkarDus = getValK('layer-bongkar-dus');
    const lGudangAkhir = lAwal.gudang + lMasukDus - lBongkarDus;
    const lGudangEl = document.getElementById('layer-gudang-akhir');
    if (lGudangEl) lGudangEl.value = Math.max(0, lGudangAkhir);

    const lStd = lBongkarDus * AKS_KONVERSI.layer;
    const lStdEl = document.getElementById('layer-standar-pcs');
    if (lStdEl) lStdEl.value = lStd;

    const lAktualInput = getValK('layer-aktual-pcs');
    const lAktualPcs = lAktualInput > 0 ? lAktualInput : lStd;
    const lPakai = getValK('layer-pakai');
    const lOpname = getOpname('layer-opname');
    const lProcNormal = lAwal.proc + lAktualPcs - lPakai;
    const lProcFinal = (lOpname !== null) ? lOpname : lProcNormal;
    const lProcEl = document.getElementById('layer-proc-akhir');
    if (lProcEl) lProcEl.value = Math.max(0, lProcFinal);
  }

  if (item.name === 'Grade B') {
    const slAwal = currentAksesoris.sleeve;
    const slMasukDus = getValK('sleeve-masuk-dus');
    const slBongkarDus = getValK('sleeve-bongkar-dus');
    const slGudangAkhir = slAwal.gudang + slMasukDus - slBongkarDus;
    const slGudangEl = document.getElementById('sleeve-gudang-akhir');
    if (slGudangEl) slGudangEl.value = Math.max(0, slGudangAkhir);

    const slStd = slBongkarDus * AKS_KONVERSI.sleeve;
    const slStdEl = document.getElementById('sleeve-standar-pcs');
    if (slStdEl) slStdEl.value = slStd;

    const slAktualInput = getValK('sleeve-aktual-pcs');
    const slAktualPcs = slAktualInput > 0 ? slAktualInput : slStd;
    const slPakai = getValK('sleeve-pakai');
    const slOpname = getOpname('sleeve-opname');
    const slProcNormal = slAwal.proc + slAktualPcs - slPakai;
    const slProcFinal = (slOpname !== null) ? slOpname : slProcNormal;
    const slProcEl = document.getElementById('sleeve-proc-akhir');
    if (slProcEl) slProcEl.value = Math.max(0, slProcFinal);
  }
}

// ========== SIMPAN ==========
function simpanDataKemasan() {
  const tgl = document.getElementById('kemasan-tgl').value;
  if (!tgl) { showToast('Pilih tanggal!', 'error'); return; }

  const items = masterJenisKemasan.map((m, i) => {
    const isHatsu = m.name.includes('Hatsu');
    const isGradeA = m.name.includes('Grade A');
    const isGradeB = m.name.includes('Grade B');

    const item = {
      name: m.name, std: m.std,
      masuk: getValK(`masuk-${i}`),
      bongkarDus: getValK(`bongkar-dus-${i}`),
      standarPcs: getValK(`bongkar-dus-${i}`) * m.std,
      aktualPcs: getValK(`aktual-pcs-${i}`),
      selisih: getValK(`aktual-pcs-${i}`) - (getValK(`bongkar-dus-${i}`) * m.std),
      kirim: getValK(`kirim-${i}`),
      tamu: getValK(`tamu-${i}`),
      ketTamu: (document.getElementById(`ket-tamu-${i}`) || {}).value || '',
      reject: getValK(`reject-${i}`),
      ketReject: (document.getElementById(`ket-reject-${i}`) || {}).value || '',
      processingOpname: getOpname(`processing-opname-${i}`)
    };

    if (isHatsu) {
      item.netfoamMasukBall = getValK('netfoam-masuk-ball');
      item.netfoamPotongBall = getValK('netfoam-potong-ball');
      item.netfoamStandarPcs = getValK('netfoam-potong-ball') * AKS_KONVERSI.netfoam;
      item.netfoamAktualPcs = getValK('netfoam-aktual-pcs');
      item.netfoamPakai = getValK('netfoam-pakai');
      item.netfoamOpname = getOpname('netfoam-opname');

      item.stikerMasukLembar = getValK('stiker-masuk-lembar');
      item.stikerBongkarLembar = getValK('stiker-bongkar-lembar');
      item.stikerStandarPcs = getValK('stiker-bongkar-lembar') * AKS_KONVERSI.stiker;
      item.stikerAktualPcs = getValK('stiker-aktual-pcs');
      item.stikerPakai = getValK('stiker-pakai');
      item.stikerOpname = getOpname('stiker-opname');
    }
    if (isGradeA) {
      item.layerMasukDus = getValK('layer-masuk-dus');
      item.layerBongkarDus = getValK('layer-bongkar-dus');
      item.layerStandarPcs = getValK('layer-bongkar-dus') * AKS_KONVERSI.layer;
      item.layerAktualPcs = getValK('layer-aktual-pcs');
      item.layerPakai = getValK('layer-pakai');
      item.layerOpname = getOpname('layer-opname');
    }
    if (isGradeB) {
      item.sleeveMasukDus = getValK('sleeve-masuk-dus');
      item.sleeveBongkarDus = getValK('sleeve-bongkar-dus');
      item.sleeveStandarPcs = getValK('sleeve-bongkar-dus') * AKS_KONVERSI.sleeve;
      item.sleeveAktualPcs = getValK('sleeve-aktual-pcs');
      item.sleevePakai = getValK('sleeve-pakai');
      item.sleeveOpname = getOpname('sleeve-opname');
    }
    return item;
  });

  const hasData = items.some(x =>
    x.masuk > 0 || x.bongkarDus > 0 || x.aktualPcs > 0 || x.kirim > 0 || x.tamu > 0 ||
    x.reject > 0 || x.processingOpname !== null ||
    (x.netfoamMasukBall > 0 || x.netfoamPotongBall > 0 || x.netfoamAktualPcs > 0 || x.netfoamPakai > 0 || x.netfoamOpname !== null) ||
    (x.stikerMasukLembar > 0 || x.stikerBongkarLembar > 0 || x.stikerAktualPcs > 0 || x.stikerPakai > 0 || x.stikerOpname !== null) ||
    (x.layerMasukDus > 0 || x.layerBongkarDus > 0 || x.layerAktualPcs > 0 || x.layerPakai > 0 || x.layerOpname !== null) ||
    (x.sleeveMasukDus > 0 || x.sleeveBongkarDus > 0 || x.sleeveAktualPcs > 0 || x.sleevePakai > 0 || x.sleeveOpname !== null)
  );
  if (!hasData) { showToast('Isi minimal 1 data!', 'error'); return; }

  const entry = { id: generateId(), tgl, items };
  let db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]');
  db.push(entry);
  localStorage.setItem(KEMASAN_STORAGE_KEY, JSON.stringify(db));
  showToast('✅ Data kemasan tersimpan!');
  recalculateStockKemasan();
  renderKemasanForms();
  renderKemasanTables();
  updateDashboard();
}

function resetFormKemasan() {
  document.getElementById('kemasan-tgl').value = new Date().toISOString().split('T')[0];
  renderKemasanForms();
}

// ========== TABEL ==========
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
    varBody.innerHTML = varRows.length ? varRows.join('') : '<tr><td colspan="7" class="text-center" style="color:#999;">Belum ada data selisih bongkar</td></tr>';
  }

  const histBody = document.getElementById('tbl-kemasan-history-body');
  if (histBody) {
    if (!db.length) {
      histBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:#999;">Belum ada history</td></tr>';
    } else {
      histBody.innerHTML = [...db].sort((a, b) => b.tgl.localeCompare(a.tgl)).map(entry => {
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
}

function hapusKemasanHistory(id) {
  if (!confirm('Yakin hapus transaksi ini?')) return;
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]');
  const filtered = db.filter(x => String(x.id) !== String(id));
  localStorage.setItem(KEMASAN_STORAGE_KEY, JSON.stringify(filtered));
  showToast('✅ Transaksi dihapus!');
  recalculateStockKemasan();
  renderKemasanForms();
  renderKemasanTables();
  updateDashboard();
}

function hapusSemuaHistoryKemasan() {
  if (!confirm('⚠️ Yakin hapus SEMUA history?')) return;
  localStorage.removeItem(KEMASAN_STORAGE_KEY);
  showToast('✅ Semua history dibersihkan!');
  recalculateStockKemasan();
  renderKemasanForms();
  renderKemasanTables();
  updateDashboard();
}

// ========== EDIT MODAL ==========
const AKS_EDIT_FIELDS = {
  'Hatsu': [
    ['netfoamMasukBall', 'Netfoam Masuk (Ball)'],
    ['netfoamPotongBall', 'Netfoam Dipotong (Ball)'],
    ['netfoamAktualPcs', 'Potong Aktual (Pcs)'],
    ['netfoamPakai', 'Netfoam Terpakai (Pcs)'],
    ['netfoamOpname', 'Koreksi Fisik Netfoam (Pcs)']
  ],
  'Grade A': [
    ['layerMasukDus', 'Layer Masuk (Dus)'],
    ['layerBongkarDus', 'Layer Dibongkar (Dus)'],
    ['layerAktualPcs', 'Pcs Aktual Bongkar'],
    ['layerPakai', 'Layer Terpakai (Pcs)'],
    ['layerOpname', 'Koreksi Fisik Layer (Pcs)']
  ],
  'Grade B': [
    ['sleeveMasukDus', 'Sleeve Masuk (Dus)'],
    ['sleeveBongkarDus', 'Sleeve Dibongkar (Dus)'],
    ['sleeveAktualPcs', 'Pcs Aktual Bongkar'],
    ['sleevePakai', 'Sleeve Terpakai (Pcs)'],
    ['sleeveOpname', 'Koreksi Fisik Sleeve (Pcs)']
  ]
};

function editKemasanHistory(id) {
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]');
  const entry = db.find(x => String(x.id) === String(id));
  if (!entry) return;
  window.editingKemasanId = id;
  const body = document.getElementById('modal-edit-kemasan-body');
  let html = `<div class="input-group"><label>Tanggal</label><input type="date" id="edit-k-tgl" value="${entry.tgl}"></div>`;

  entry.items.forEach((it, idx) => {
    const rejVal = rejMika(it);
    html += `
      <div style="border:1px solid #e5e7eb;padding:0.75rem;border-radius:8px;margin-bottom:0.75rem;background:#fafafa;">
        <strong>Mika ${it.name}</strong>
        <div class="row-2" style="margin-top:0.5rem;">
          <div class="input-group"><label>Masuk (Dus)</label><input type="number" id="edit-masuk-${idx}" value="${it.masuk || 0}"></div>
          <div class="input-group"><label>Bongkar (Dus)</label><input type="number" id="edit-bongkar-${idx}" value="${it.bongkarDus || 0}"></div>
        </div>
        <div class="row-2">
          <div class="input-group"><label>Aktual (Pcs)</label><input type="number" id="edit-aktual-${idx}" value="${it.aktualPcs || 0}"></div>
          <div class="input-group"><label>Kirim (Pcs)</label><input type="number" id="edit-kirim-${idx}" value="${it.kirim || 0}"></div>
        </div>
        <div class="row-2">
          <div class="input-group"><label>Reject (Pcs)</label><input type="number" id="edit-reject-${idx}" value="${rejVal}"></div>
          <div class="input-group"><label>Koreksi Fisik Mika (Pcs)</label><input type="number" id="edit-processing-opname-${idx}" placeholder="Kosongkan kalau sesuai" value="${it.processingOpname != null ? it.processingOpname : ''}"></div>
        </div>
        ${(AKS_EDIT_FIELDS[it.name] || []).map(([f, lbl]) => {
          let v = it[f];
          if (v == null) {
            if (f === 'layerAktualPcs') v = it.layerSiap;
            else if (f === 'sleeveAktualPcs') v = it.sleeveSiap;
            else if (f === 'netfoamAktualPcs') v = it.netfoamPotong;
            else if (f === 'netfoamPakai') v = it.netfoamTerpakai;
          }
          return `<div class="input-group"><label>${lbl}</label><input type="number" id="edit-aks-${idx}-${f}" value="${v != null ? v : ''}"></div>`;
        }).join('')}
      </div>
    `;
  });

  // Stiker (standalone, dari Hatsu)
  const hatsuItem = entry.items.find(x => x.name === 'Hatsu') || {};
  html += `
    <div style="border:1px solid #e5e7eb;padding:0.75rem;border-radius:8px;margin-bottom:0.75rem;background:#f3e8ff;">
      <strong>🏷️ Stiker</strong>
      <div class="row-2" style="margin-top:0.5rem;">
        <div class="input-group"><label>Masuk (Lembar)</label><input type="number" id="edit-stiker-masuk-lembar" value="${hatsuItem.stikerMasukLembar != null ? hatsuItem.stikerMasukLembar : (hatsuItem.stikerMasuk || 0)}"></div>
        <div class="input-group"><label>Ditempel (Lembar)</label><input type="number" id="edit-stiker-bongkar-lembar" value="${hatsuItem.stikerBongkarLembar || 0}"></div>
      </div>
      <div class="row-2">
        <div class="input-group"><label>Aktual (Pcs)</label><input type="number" id="edit-stiker-aktual-pcs" value="${hatsuItem.stikerAktualPcs || 0}"></div>
        <div class="input-group"><label>Terpakai (Pcs)</label><input type="number" id="edit-stiker-pakai" value="${hatsuItem.stikerPakai || 0}"></div>
      </div>
      <div class="input-group"><label>Koreksi Fisik (Pcs)</label><input type="number" id="edit-stiker-opname" placeholder="Kosongkan kalau sesuai" value="${hatsuItem.stikerOpname != null ? hatsuItem.stikerOpname : ''}"></div>
    </div>
  `;

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
    const old = db[idx].items[i] || {};

    const masuk = parseFloat((document.getElementById(`edit-masuk-${i}`) || {}).value || 0);
    const bongkar = parseFloat((document.getElementById(`edit-bongkar-${i}`) || {}).value || 0);
    const aktual = parseFloat((document.getElementById(`edit-aktual-${i}`) || {}).value || 0);
    const kirim = parseFloat((document.getElementById(`edit-kirim-${i}`) || {}).value || 0);
    const reject = parseFloat((document.getElementById(`edit-reject-${i}`) || {}).value || 0);
    const opnameEl = document.getElementById(`edit-processing-opname-${i}`);
    const processingOpname = opnameEl && opnameEl.value !== '' ? parseFloat(opnameEl.value) : null;
    const stdPcs = bongkar * m.std;

    const item = {
      ...old,
      name: m.name, std: m.std,
      masuk, bongkarDus: bongkar, standarPcs: stdPcs, aktualPcs: aktual,
      selisih: aktual - stdPcs, kirim, reject, processingOpname
    };

    (AKS_EDIT_FIELDS[m.name] || []).forEach(([f]) => {
      const el = document.getElementById(`edit-aks-${i}-${f}`);
      if (el) {
        item[f] = el.value !== '' ? parseFloat(el.value) : null;
      }
    });

    delete item.rejectTutup;
    delete item.rejectAlas;
    delete item.layerSiap;
    delete item.sleeveSiap;
    delete item.netfoamPotong;
    delete item.netfoamTerpakai;
    delete item.stikerMasuk;
    delete item.stikerPakai;

    return item;
  });

  // Stiker → simpan ke items[0] (Hatsu)
  const hatsuIdx = masterJenisKemasan.findIndex(m => m.name === 'Hatsu');
  if (hatsuIdx >= 0) {
    const sMasuk = parseFloat((document.getElementById('edit-stiker-masuk-lembar') || {}).value || 0);
    const sBongkar = parseFloat((document.getElementById('edit-stiker-bongkar-lembar') || {}).value || 0);
    const sAktual = parseFloat((document.getElementById('edit-stiker-aktual-pcs') || {}).value || 0);
    const sPakai = parseFloat((document.getElementById('edit-stiker-pakai') || {}).value || 0);
    const sOpEl = document.getElementById('edit-stiker-opname');
    const sOpname = sOpEl && sOpEl.value !== '' ? parseFloat(sOpEl.value) : null;
    updatedItems[hatsuIdx].stikerMasukLembar = sMasuk;
    updatedItems[hatsuIdx].stikerBongkarLembar = sBongkar;
    updatedItems[hatsuIdx].stikerStandarPcs = sBongkar * AKS_KONVERSI.stiker;
    updatedItems[hatsuIdx].stikerAktualPcs = sAktual;
    updatedItems[hatsuIdx].stikerPakai = sPakai;
    updatedItems[hatsuIdx].stikerOpname = sOpname;
  }

  db[idx] = { id: window.editingKemasanId, tgl, items: updatedItems };
  localStorage.setItem(KEMASAN_STORAGE_KEY, JSON.stringify(db));
  showToast('✅ Transaksi diupdate!');
  closeModalEditKemasan();
  recalculateStockKemasan();
  renderKemasanForms();
  renderKemasanTables();
  updateDashboard();
}

// ========== DASHBOARD MIKA MODULE ==========

function formatTanggalIndo(ymd) {
  if (!ymd) return '-';
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  const [y, m, d] = parts;
  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${parseInt(d, 10)} ${bulan[parseInt(m, 10) - 1]} ${y}`;
}

function getMikaPeriod() {
  const modeEl = document.getElementById('mika-filter-mode');
  const mode = modeEl ? modeEl.value : 'single';
  const todayYMD = new Date().toISOString().substring(0, 10);
  const todayYM = todayYMD.substring(0, 7);

  if (mode === 'range-month') {
    const dari = (document.getElementById('mika-dari-bulan') || {}).value || todayYM;
    const sampai = (document.getElementById('mika-sampai-bulan') || {}).value || todayYM;
    const [y2, m2] = sampai.split('-').map(Number);
    const lastDay = new Date(y2, m2, 0).getDate();
    const label = dari === sampai
      ? formatBulanIndo(dari)
      : `${formatBulanIndo(dari)} – ${formatBulanIndo(sampai)}`;
    return { from: `${dari}-01`, to: `${sampai}-${String(lastDay).padStart(2, '0')}`, label, mode };
  }
  if (mode === 'range-date') {
    const dari = (document.getElementById('mika-dari-tgl') || {}).value || todayYMD;
    const sampai = (document.getElementById('mika-sampai-tgl') || {}).value || todayYMD;
    const label = dari === sampai ? formatTanggalIndo(dari) : `${formatTanggalIndo(dari)} – ${formatTanggalIndo(sampai)}`;
    return { from: dari, to: sampai, label, mode };
  }
  const bulan = (document.getElementById('mika-bulan') || {}).value || todayYM;
  const [y, m] = bulan.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${bulan}-01`, to: `${bulan}-${String(lastDay).padStart(2, '0')}`, label: formatBulanIndo(bulan), mode: 'single' };
}

function onMikaFilterModeChange() {
  const modeEl = document.getElementById('mika-filter-mode');
  const mode = modeEl ? modeEl.value : 'single';
  const elSingle = document.getElementById('mika-filter-single');
  const elRangeM = document.getElementById('mika-filter-range-month');
  const elRangeD = document.getElementById('mika-filter-range-date');
  if (elSingle) elSingle.style.display = mode === 'single' ? 'grid' : 'none';
  if (elRangeM) elRangeM.style.display = mode === 'range-month' ? 'grid' : 'none';
  if (elRangeD) elRangeD.style.display = mode === 'range-date' ? 'grid' : 'none';
  renderMikaDashboard();
}

function setMikaBulanIni() {
  const modeEl = document.getElementById('mika-filter-mode');
  const bulanEl = document.getElementById('mika-bulan');
  if (modeEl) modeEl.value = 'single';
  if (bulanEl) bulanEl.value = new Date().toISOString().substring(0, 7);
  onMikaFilterModeChange();
}

function computeMikaTimeline() {
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]')
    .filter(e => e && e.tgl && Array.isArray(e.items))
    .sort((a, b) => a.tgl.localeCompare(b.tgl) || String(a.id).localeCompare(String(b.id)));

  const names = masterJenisKemasan.map(m => m.name);
  const st = {
    gudang: {}, proc: {},
    layer: { gudang: 0, proc: 0 },
    sleeve: { gudang: 0, proc: 0 },
    stiker: { gudang: 0, proc: 0 },
    netfoam: { ball: 0, proc: 0 }
  };
  names.forEach(n => { st.gudang[n] = 0; st.proc[n] = 0; });

  const byDate = new Map();
  db.forEach(e => { if (!byDate.has(e.tgl)) byDate.set(e.tgl, []); byDate.get(e.tgl).push(e); });
  const snaps = [];

  byDate.forEach((entries, tgl) => {
    let keluar = 0, reject = 0;
    const rejectBy = {};
    names.forEach(n => { rejectBy[n] = 0; });

    entries.forEach(entry => {
      entry.items.forEach(it => {
        if (!(it.name in st.proc)) return;
        st.gudang[it.name] += (it.masuk || 0) - (it.bongkarDus || 0);
        const out = (it.kirim || 0) + (it.tamu || 0);
        const rej = rejMika(it);
        const opnameVal = (typeof it.processingOpname === 'number' && !isNaN(it.processingOpname))
          ? it.processingOpname : null;
        if (opnameVal !== null) st.proc[it.name] = opnameVal;
        else st.proc[it.name] += (it.aktualPcs || 0) - out - rej;
        keluar += out; reject += rej; rejectBy[it.name] += rej;

        if (it.name === 'Hatsu') {
          const nMasukBall = it.netfoamMasukBall || 0;
          const nPotongBall = it.netfoamPotongBall || 0;
          const nAktualPcs = (it.netfoamAktualPcs != null) ? it.netfoamAktualPcs : (it.netfoamPotong || 0);
          const nPakai = (it.netfoamPakai != null) ? it.netfoamPakai : (it.netfoamTerpakai || 0);
          const nOpname = (typeof it.netfoamOpname === 'number') ? it.netfoamOpname : null;
          st.netfoam.ball += nMasukBall - nPotongBall;
          if (nOpname !== null) st.netfoam.proc = nOpname;
          else st.netfoam.proc += nAktualPcs - nPakai;

          const sMasukLembar = (it.stikerMasukLembar != null) ? it.stikerMasukLembar : (it.stikerMasuk || 0);
          const sBongkarLembar = it.stikerBongkarLembar || 0;
          const sAktualPcs = (it.stikerAktualPcs != null) ? it.stikerAktualPcs : (sBongkarLembar * AKS_KONVERSI.stiker);
          const sPakai = it.stikerPakai || 0;
          const sOpname = (typeof it.stikerOpname === 'number') ? it.stikerOpname : null;
          st.stiker.gudang += sMasukLembar - sBongkarLembar;
          if (sOpname !== null) st.stiker.proc = sOpname;
          else st.stiker.proc += sAktualPcs - sPakai;
        }
        if (it.name === 'Grade A') {
          const lMasukDus = it.layerMasukDus || 0;
          const lBongkarDus = it.layerBongkarDus || 0;
          const lAktualPcs = (it.layerAktualPcs != null) ? it.layerAktualPcs : (it.layerSiap || 0);
          const lPakai = it.layerPakai || 0;
          const lOpname = (typeof it.layerOpname === 'number') ? it.layerOpname : null;
          st.layer.gudang += lMasukDus - lBongkarDus;
          if (lOpname !== null) st.layer.proc = lOpname;
          else st.layer.proc += lAktualPcs - lPakai;
        }
        if (it.name === 'Grade B') {
          const slMasukDus = it.sleeveMasukDus || 0;
          const slBongkarDus = it.sleeveBongkarDus || 0;
          const slAktualPcs = (it.sleeveAktualPcs != null) ? it.sleeveAktualPcs : (it.sleeveSiap || 0);
          const slPakai = it.sleevePakai || 0;
          const slOpname = (typeof it.sleeveOpname === 'number') ? it.sleeveOpname : null;
          st.sleeve.gudang += slMasukDus - slBongkarDus;
          if (slOpname !== null) st.sleeve.proc = slOpname;
          else st.sleeve.proc += slAktualPcs - slPakai;
        }
      });
    });

    snaps.push({
      tgl, keluar, reject, rejectBy,
      proc: { ...st.proc }, gudang: { ...st.gudang },
      layer: { ...st.layer }, sleeve: { ...st.sleeve },
      stiker: { ...st.stiker }, netfoam: { ...st.netfoam }
    });
  });
  return snaps;
}

function renderMikaDashboard() {
  const todayYMD = new Date().toISOString().substring(0, 10);
  const todayYM = todayYMD.substring(0, 7);

  const setIfEmpty = (id, val) => { const el = document.getElementById(id); if (el && !el.value) el.value = val; };
  setIfEmpty('mika-bulan', todayYM);
  setIfEmpty('mika-dari-bulan', todayYM);
  setIfEmpty('mika-sampai-bulan', todayYM);
  setIfEmpty('mika-dari-tgl', todayYMD);
  setIfEmpty('mika-sampai-tgl', todayYMD);

  const period = getMikaPeriod();
  const timeline = computeMikaTimeline();
  const inPeriod = timeline.filter(x => x.tgl >= period.from && x.tgl <= period.to);

  const infoEl = document.getElementById('mika-period-info');
  if (infoEl) {
    infoEl.innerHTML = `Menampilkan data: <b>${period.label}</b> · ${inPeriod.length} hari transaksi`;
  }

  const periodeLabelEl = document.getElementById('mika-monthly-periode-label');
  if (periodeLabelEl) periodeLabelEl.value = period.label;

  const fmt = n => Number(n || 0).toLocaleString('id-ID');
  const cell = n => n < 0 ? `<span class="neg">${fmt(n)}</span>` : fmt(n);

  const upToPeriod = timeline.filter(x => x.tgl <= period.to);
  const before = timeline.filter(x => x.tgl < period.from);
  const opening = before.length ? before[before.length - 1] : null;
  const latest = upToPeriod.length ? upToPeriod[upToPeriod.length - 1] : null;

  const cardsEl = document.getElementById('mika-latest-cards');
  const titleEl = document.getElementById('mika-latest-title');
  const warnEl = document.getElementById('mika-warning');

  if (!latest) {
    titleEl.textContent = '📋 Stok Kemasan Terakhir';
    cardsEl.innerHTML = '<div style="color:#999;padding:0.5rem;">Belum ada data kemasan.</div>';
    warnEl.innerHTML = '';
  } else {
    titleEl.textContent = `📋 Stok Kemasan per ${latest.tgl}`;
    const items = [
      { label: 'Hatsu', val: latest.proc['Hatsu'], cls: 'blue', meta: `Gudang ${fmt(Math.max(0, latest.gudang['Hatsu']))} dus` },
      { label: 'Hy 11 (Grade A)', val: latest.proc['Grade A'], cls: 'green', meta: `Gudang ${fmt(Math.max(0, latest.gudang['Grade A']))} dus` },
      { label: 'Hy 15 (Grade B)', val: latest.proc['Grade B'], cls: 'orange', meta: `Gudang ${fmt(Math.max(0, latest.gudang['Grade B']))} dus` },
      { label: 'Layer', val: latest.layer.proc, cls: 'purple', meta: `Gudang ${fmt(Math.max(0, latest.layer.gudang))} dus` },
      { label: 'Sleeve', val: latest.sleeve.proc, cls: 'orange', meta: `Gudang ${fmt(Math.max(0, latest.sleeve.gudang))} dus` },
      { label: 'Stiker', val: latest.stiker.proc, cls: 'blue', meta: `Gudang ${fmt(Math.max(0, latest.stiker.gudang))} lembar` },
      { label: 'Netfoam', val: latest.netfoam.proc, cls: 'green', meta: `Ball ${fmt(Math.max(0, latest.netfoam.ball))}` }
    ];
    cardsEl.innerHTML = items.map(x => `
      <div class="stat-card ${x.cls}">
        <div class="stat-label">${x.label}</div>
        <div class="stat-value">${cell(x.val)}</div>
        <div class="stat-meta">${x.meta}</div>
      </div>`).join('');
    const minus = items.filter(x => x.val < 0).map(x => x.label);
    warnEl.innerHTML = minus.length
      ? `<div class="warn-box" style="margin-top:0.5rem;">⚠️ Stok minus: <b>${minus.join(', ')}</b>.</div>`
      : '';
  }

  const body = document.getElementById('mika-daily-body');
  if (!inPeriod.length) {
    body.innerHTML = '<tr><td colspan="14" style="text-align:center;color:#999;padding:1rem;">Belum ada data pada periode ini</td></tr>';
  } else {
    const row = (label, x, isOpening) => {
      const total = x.proc['Hatsu'] + x.proc['Grade A'] + x.proc['Grade B'];
      return `<tr>
        <td class="tgl-col ${isOpening ? 'row-awal' : ''}">${label}</td>
        <td>${cell(x.proc['Hatsu'])}</td>
        <td>${cell(x.proc['Grade A'])}</td>
        <td>${cell(x.proc['Grade B'])}</td>
        <td class="col-total">${cell(total)}</td>
        <td>${cell(x.layer.proc)}</td>
        <td>${cell(x.sleeve.proc)}</td>
        <td>${cell(x.stiker.proc)}</td>
        <td>${cell(x.netfoam.proc)}</td>
        <td>${fmt(Math.max(0, x.gudang['Hatsu']))}</td>
        <td>${fmt(Math.max(0, x.gudang['Grade A']))}</td>
        <td>${fmt(Math.max(0, x.gudang['Grade B']))}</td>
        <td>${isOpening ? '-' : fmt(x.keluar)}</td>
        <td>${isOpening ? '-' : fmt(x.reject)}</td>
      </tr>`;
    };
    let html = '';
    if (opening) html += row('Stok awal periode', opening, true);
    html += inPeriod.map(x => row(x.tgl.substring(8) + '/' + x.tgl.substring(5, 7), x, false)).join('');
    body.innerHTML = html;
  }

  renderMikaRejectTamu(period);
  renderMikaKPI(period);
  renderMikaMasukDetail(period);
  renderMikaRejectDetail(period);
  renderMikaMonthly(period);
}

function renderMikaRejectTamu(period) {
  const kemasanDb = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]');
  const panenDb = JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]');

  const reject = { 'Hatsu': 0, 'Grade A': 0, 'Grade B': 0 };
  kemasanDb.forEach(entry => {
    if (!entry.tgl || entry.tgl < period.from || entry.tgl > period.to) return;
    if (!Array.isArray(entry.items)) return;
    entry.items.forEach(it => {
      if (reject[it.name] !== undefined) reject[it.name] += rejMika(it);
    });
  });
  const totalReject = reject['Hatsu'] + reject['Grade A'] + reject['Grade B'];

  const rejectEl = document.getElementById('mika-reject-cards');
  if (rejectEl) {
    if (totalReject === 0) {
      rejectEl.innerHTML = '<div style="color:#16a34a;padding:0.5rem;font-weight:600;">✓ Tidak ada reject</div>';
    } else {
      rejectEl.innerHTML = `
        <div class="stat-card red"><div class="stat-label">TOTAL REJECT</div><div class="stat-value">${totalReject.toLocaleString('id-ID')}</div><div class="stat-meta">Pcs</div></div>
        <div class="stat-card blue"><div class="stat-label">Hatsu</div><div class="stat-value">${reject['Hatsu'].toLocaleString('id-ID')}</div><div class="stat-meta">Pcs</div></div>
        <div class="stat-card green"><div class="stat-label">Grade A</div><div class="stat-value">${reject['Grade A'].toLocaleString('id-ID')}</div><div class="stat-meta">Pcs</div></div>
        <div class="stat-card orange"><div class="stat-label">Grade B</div><div class="stat-value">${reject['Grade B'].toLocaleString('id-ID')}</div><div class="stat-meta">Pcs</div></div>
      `;
    }
  }

  const tamuPanen = { 'Hatsu': 0, 'Grade A': 0, 'Grade B': 0 };
  let curahKg = 0;
  panenDb.forEach(item => {
    if (!item.tgl || item.tgl < period.from || item.tgl > period.to) return;
    tamuPanen['Hatsu']   += item.t_hatsu || 0;
    tamuPanen['Grade A'] += item.t_a11   || 0;
    tamuPanen['Grade B'] += item.t_a15   || 0;
    curahKg              += item.t_curah || 0;
  });

  const tamuKemasan = { 'Hatsu': 0, 'Grade A': 0, 'Grade B': 0 };
  kemasanDb.forEach(entry => {
    if (!entry.tgl || entry.tgl < period.from || entry.tgl > period.to) return;
    if (!Array.isArray(entry.items)) return;
    entry.items.forEach(it => {
      if (tamuKemasan[it.name] !== undefined) tamuKemasan[it.name] += (it.tamu || 0);
    });
  });

  const totalTamuPanen = tamuPanen['Hatsu'] + tamuPanen['Grade A'] + tamuPanen['Grade B'];
  const totalTamuKemasan = tamuKemasan['Hatsu'] + tamuKemasan['Grade A'] + tamuKemasan['Grade B'];
  const pakaiPanen = totalTamuPanen > 0;
  const tamu = pakaiPanen ? tamuPanen : tamuKemasan;
  const tamuSource = pakaiPanen ? 'Form Panen' : (totalTamuKemasan > 0 ? 'Form Stok Kemasan' : '—');
  const totalTamu = tamu['Hatsu'] + tamu['Grade A'] + tamu['Grade B'];

  const tamuEl = document.getElementById('mika-tamu-cards');
  if (tamuEl) {
    if (totalTamu === 0 && curahKg === 0) {
      tamuEl.innerHTML = '<div style="color:#999;padding:0.5rem;">Belum ada data tamu</div>';
    } else {
      tamuEl.innerHTML = `
        <div class="stat-card purple"><div class="stat-label">TOTAL TAMU (PCS)</div><div class="stat-value">${totalTamu.toLocaleString('id-ID')}</div><div class="stat-meta">Sumber: ${tamuSource}</div></div>
        <div class="stat-card orange"><div class="stat-label">TAMU CURAH</div><div class="stat-value">${curahKg.toFixed(2)}</div><div class="stat-meta">Kg · dari Panen</div></div>
        <div class="stat-card blue"><div class="stat-label">Hatsu</div><div class="stat-value">${tamu['Hatsu'].toLocaleString('id-ID')}</div><div class="stat-meta">Pcs</div></div>
        <div class="stat-card green"><div class="stat-label">Grade A</div><div class="stat-value">${tamu['Grade A'].toLocaleString('id-ID')}</div><div class="stat-meta">Pcs</div></div>
        <div class="stat-card orange"><div class="stat-label">Grade B</div><div class="stat-value">${tamu['Grade B'].toLocaleString('id-ID')}</div><div class="stat-meta">Pcs</div></div>
      `;
    }
  }
}

function renderMikaKPI(period) {
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]')
    .filter(e => e && e.tgl && e.tgl >= period.from && e.tgl <= period.to && Array.isArray(e.items));

  const totals = {};
  masterJenisKemasan.forEach(m => {
    totals[m.name] = { masukDus: 0, bongkarDus: 0, pcsBongkar: 0, kirim: 0, tamu: 0, reject: 0 };
  });

  db.forEach(entry => {
    entry.items.forEach(it => {
      const t = totals[it.name];
      if (!t) return;
      t.masukDus += it.masuk || 0;
      t.bongkarDus += it.bongkarDus || 0;
      t.pcsBongkar += it.aktualPcs || 0;
      t.kirim += it.kirim || 0;
      t.tamu += it.tamu || 0;
      t.reject += rejMika(it);
    });
  });

  const sum = (key) => Object.values(totals).reduce((a, t) => a + t[key], 0);
  const fmt = n => Number(n || 0).toLocaleString('id-ID');

  const cardsEl = document.getElementById('mika-kpi-cards');
  if (cardsEl) {
    cardsEl.innerHTML = `
      <div class="stat-card blue"><div class="stat-label">Total Kemasan Masuk</div><div class="stat-value">${fmt(sum('masukDus'))}</div><div class="stat-meta">Dus</div></div>
      <div class="stat-card orange"><div class="stat-label">Total Dibongkar</div><div class="stat-value">${fmt(sum('bongkarDus'))}</div><div class="stat-meta">Dus · ${fmt(sum('pcsBongkar'))} Pcs</div></div>
      <div class="stat-card green"><div class="stat-label">Total Kirim Packing</div><div class="stat-value">${fmt(sum('kirim'))}</div><div class="stat-meta">Pcs</div></div>
      <div class="stat-card purple"><div class="stat-label">Total Mika Tamu</div><div class="stat-value">${fmt(sum('tamu'))}</div><div class="stat-meta">Pcs</div></div>
      <div class="stat-card red"><div class="stat-label">Total Reject</div><div class="stat-value">${fmt(sum('reject'))}</div><div class="stat-meta">Pcs</div></div>
      <div class="stat-card"><div class="stat-label">Hari Transaksi</div><div class="stat-value">${db.length}</div><div class="stat-meta">Hari</div></div>
    `;
  }

  const tbody = document.getElementById('mika-kpi-table-body');
  if (!tbody) return;

  const rowsHtml = masterJenisKemasan.map(m => {
    const t = totals[m.name];
    return `<tr>
      <td><span class="badge ${m.badge}">${m.name}</span></td>
      <td class="text-right">${fmt(t.masukDus)}</td>
      <td class="text-right">${fmt(t.bongkarDus)}</td>
      <td class="text-right">${fmt(t.pcsBongkar)}</td>
      <td class="text-right">${fmt(t.kirim)}</td>
      <td class="text-right">${fmt(t.tamu)}</td>
      <td class="text-right" style="color:#dc2626;">${fmt(t.reject)}</td>
    </tr>`;
  }).join('');

  const totalRow = `<tr style="background:#f0fdf4;font-weight:800;">
    <td>TOTAL</td>
    <td class="text-right">${fmt(sum('masukDus'))}</td>
    <td class="text-right">${fmt(sum('bongkarDus'))}</td>
    <td class="text-right">${fmt(sum('pcsBongkar'))}</td>
    <td class="text-right">${fmt(sum('kirim'))}</td>
    <td class="text-right">${fmt(sum('tamu'))}</td>
    <td class="text-right" style="color:#dc2626;">${fmt(sum('reject'))}</td>
  </tr>`;

  tbody.innerHTML = rowsHtml + totalRow;
}

// ========== DETAIL KEMASAN MASUK ==========
function getMikaMasukPerTanggal(period) {
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]')
    .filter(e => e && e.tgl && e.tgl >= period.from && e.tgl <= period.to && Array.isArray(e.items))
    .sort((a, b) => a.tgl.localeCompare(b.tgl));

  const byDate = new Map();
  db.forEach(entry => {
    entry.items.forEach(it => {
      // Ambil field masuk per grade
      let hatsu = 0, gradeA = 0, gradeB = 0, layer = 0, sleeve = 0, stiker = 0, netfoam = 0;
      if (it.name === 'Hatsu') {
        hatsu = it.masuk || 0;
        stiker = (it.stikerMasukLembar != null) ? it.stikerMasukLembar : (it.stikerMasuk || 0);
        netfoam = it.netfoamMasukBall || 0;
      } else if (it.name === 'Grade A') {
        gradeA = it.masuk || 0;
        layer = it.layerMasukDus || 0;
      } else if (it.name === 'Grade B') {
        gradeB = it.masuk || 0;
        sleeve = it.sleeveMasukDus || 0;
      }
      if (hatsu || gradeA || gradeB || layer || sleeve || stiker || netfoam) {
        if (!byDate.has(entry.tgl)) byDate.set(entry.tgl, { tgl: entry.tgl, hatsu: 0, gradeA: 0, gradeB: 0, layer: 0, sleeve: 0, stiker: 0, netfoam: 0 });
        const r = byDate.get(entry.tgl);
        r.hatsu += hatsu;
        r.gradeA += gradeA;
        r.gradeB += gradeB;
        r.layer += layer;
        r.sleeve += sleeve;
        r.stiker += stiker;
        r.netfoam += netfoam;
      }
    });
  });

  return [...byDate.values()].sort((a, b) => a.tgl.localeCompare(b.tgl));
}

function renderMikaMasukDetail(period) {
  const data = getMikaMasukPerTanggal(period);
  const tbody = document.getElementById('mika-masuk-detail-body');
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="color:#999;">Belum ada data masuk pada periode ini</td></tr>';
    return;
  }

  const fmt = n => Number(n || 0).toLocaleString('id-ID');
  const totals = { hatsu: 0, gradeA: 0, gradeB: 0, layer: 0, sleeve: 0, stiker: 0, netfoam: 0 };

  let html = data.map(r => {
    totals.hatsu += r.hatsu;
    totals.gradeA += r.gradeA;
    totals.gradeB += r.gradeB;
    totals.layer += r.layer;
    totals.sleeve += r.sleeve;
    totals.stiker += r.stiker;
    totals.netfoam += r.netfoam;
    const [y, m, d] = r.tgl.split('-');
    return `<tr>
      <td>${d}/${m}/${y}</td>
      <td class="text-right">${r.hatsu ? fmt(r.hatsu) : ''}</td>
      <td class="text-right">${r.gradeA ? fmt(r.gradeA) : ''}</td>
      <td class="text-right">${r.gradeB ? fmt(r.gradeB) : ''}</td>
      <td class="text-right">${r.layer ? fmt(r.layer) : ''}</td>
      <td class="text-right">${r.sleeve ? fmt(r.sleeve) : ''}</td>
      <td class="text-right">${r.stiker ? fmt(r.stiker) : ''}</td>
      <td class="text-right">${r.netfoam ? fmt(r.netfoam) : ''}</td>
    </tr>`;
  }).join('');

  html += `<tr style="background:#f0fdf4;font-weight:800;">
    <td>TOTAL</td>
    <td class="text-right">${fmt(totals.hatsu)}</td>
    <td class="text-right">${fmt(totals.gradeA)}</td>
    <td class="text-right">${fmt(totals.gradeB)}</td>
    <td class="text-right">${fmt(totals.layer)}</td>
    <td class="text-right">${fmt(totals.sleeve)}</td>
    <td class="text-right">${fmt(totals.stiker)}</td>
    <td class="text-right">${fmt(totals.netfoam)}</td>
  </tr>`;

  tbody.innerHTML = html;
}

function downloadMikaMasukCSV() {
  const period = getMikaPeriod();
  if (!period.from || !period.to) { showToast('Pilih periode!', 'error'); return; }
  const data = getMikaMasukPerTanggal(period);
  if (!data.length) { showToast('Tidak ada data masuk!', 'error'); return; }

  const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  let csv = '';
  csv += 'DETAIL KEMASAN MASUK - ' + period.label + '\n';
  csv += 'PT. Agri Wangi Berry - Processing\n';
  csv += 'Periode: ' + period.from + ' s.d. ' + period.to + '\n\n';
  csv += ['Tanggal','Hatsu (Dus)','Grade A (Dus)','Grade B (Dus)','Layer (Dus)','Sleeve (Dus)','Stiker (Lembar)','Netfoam (Ball)'].join(',') + '\n';

  const totals = { hatsu: 0, gradeA: 0, gradeB: 0, layer: 0, sleeve: 0, stiker: 0, netfoam: 0 };
  data.forEach(r => {
    totals.hatsu += r.hatsu; totals.gradeA += r.gradeA; totals.gradeB += r.gradeB;
    totals.layer += r.layer; totals.sleeve += r.sleeve; totals.stiker += r.stiker; totals.netfoam += r.netfoam;
    const [y, m, d] = r.tgl.split('-');
    csv += [q(`${d}/${m}/${y}`), r.hatsu, r.gradeA, r.gradeB, r.layer, r.sleeve, r.stiker, r.netfoam].join(',') + '\n';
  });
  csv += '\n';
  csv += [q('TOTAL'), totals.hatsu, totals.gradeA, totals.gradeB, totals.layer, totals.sleeve, totals.stiker, totals.netfoam].join(',') + '\n';

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `Kemasan_Masuk_${period.from}_to_${period.to}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 3000);
  showToast(`📥 Download kemasan masuk (${data.length} baris)`);
}

// ========== DETAIL REJECT ==========
function getMikaRejectPerTanggal(period) {
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]')
    .filter(e => e && e.tgl && e.tgl >= period.from && e.tgl <= period.to && Array.isArray(e.items))
    .sort((a, b) => a.tgl.localeCompare(b.tgl));

  const byDate = new Map();
  db.forEach(entry => {
    let hatsu = 0, gradeA = 0, gradeB = 0;
    entry.items.forEach(it => {
      const rej = rejMika(it);
      if (!rej) return;
      if (it.name === 'Hatsu') hatsu += rej;
      else if (it.name === 'Grade A') gradeA += rej;
      else if (it.name === 'Grade B') gradeB += rej;
    });
    if (hatsu || gradeA || gradeB) {
      if (!byDate.has(entry.tgl)) byDate.set(entry.tgl, { tgl: entry.tgl, hatsu: 0, gradeA: 0, gradeB: 0 });
      const r = byDate.get(entry.tgl);
      r.hatsu += hatsu;
      r.gradeA += gradeA;
      r.gradeB += gradeB;
    }
  });

  return [...byDate.values()].sort((a, b) => a.tgl.localeCompare(b.tgl));
}

function renderMikaRejectDetail(period) {
  const data = getMikaRejectPerTanggal(period);
  const tbody = document.getElementById('mika-reject-detail-body');
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color:#999;">Belum ada data reject pada periode ini</td></tr>';
    return;
  }

  const fmt = n => Number(n || 0).toLocaleString('id-ID');
  const totals = { hatsu: 0, gradeA: 0, gradeB: 0, total: 0 };

  let html = data.map(r => {
    const total = r.hatsu + r.gradeA + r.gradeB;
    totals.hatsu += r.hatsu;
    totals.gradeA += r.gradeA;
    totals.gradeB += r.gradeB;
    totals.total += total;
    const [y, m, d] = r.tgl.split('-');
    return `<tr>
      <td>${d}/${m}/${y}</td>
      <td class="text-right">${r.hatsu ? fmt(r.hatsu) : ''}</td>
      <td class="text-right">${r.gradeA ? fmt(r.gradeA) : ''}</td>
      <td class="text-right">${r.gradeB ? fmt(r.gradeB) : ''}</td>
      <td class="text-right" style="color:#dc2626;font-weight:700;">${fmt(total)}</td>
    </tr>`;
  }).join('');

  html += `<tr style="background:#fee2e2;font-weight:800;">
    <td>TOTAL</td>
    <td class="text-right">${fmt(totals.hatsu)}</td>
    <td class="text-right">${fmt(totals.gradeA)}</td>
    <td class="text-right">${fmt(totals.gradeB)}</td>
    <td class="text-right" style="color:#dc2626;">${fmt(totals.total)}</td>
  </tr>`;

  tbody.innerHTML = html;
}

function downloadMikaRejectCSV() {
  const period = getMikaPeriod();
  if (!period.from || !period.to) { showToast('Pilih periode!', 'error'); return; }
  const data = getMikaRejectPerTanggal(period);
  if (!data.length) { showToast('Tidak ada data reject!', 'error'); return; }

  const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  let csv = '';
  csv += 'DETAIL REJECT MIKA - ' + period.label + '\n';
  csv += 'PT. Agri Wangi Berry - Processing\n';
  csv += 'Periode: ' + period.from + ' s.d. ' + period.to + '\n\n';
  csv += ['Tanggal','Hatsu (Pcs)','Grade A (Pcs)','Grade B (Pcs)','Total Reject (Pcs)'].join(',') + '\n';

  const totals = { hatsu: 0, gradeA: 0, gradeB: 0, total: 0 };
  data.forEach(r => {
    const total = r.hatsu + r.gradeA + r.gradeB;
    totals.hatsu += r.hatsu; totals.gradeA += r.gradeA; totals.gradeB += r.gradeB; totals.total += total;
    const [y, m, d] = r.tgl.split('-');
    csv += [q(`${d}/${m}/${y}`), r.hatsu, r.gradeA, r.gradeB, total].join(',') + '\n';
  });
  csv += '\n';
  csv += [q('TOTAL'), totals.hatsu, totals.gradeA, totals.gradeB, totals.total].join(',') + '\n';

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `Reject_Mika_${period.from}_to_${period.to}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 3000);
  showToast(`📥 Download reject (${data.length} baris)`);
}

// ========== REKAP BULANAN (STOCK OPNAME) ==========
function renderMikaMonthly(period) {
  renderMikaMonthlyUsage(period);
  renderMikaMonthlySelisih(period);
}

function renderMikaMonthlyUsage(period) {
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]')
    .filter(e => e && e.tgl && Array.isArray(e.items))
    .sort((a, b) => a.tgl.localeCompare(b.tgl));

  const running = {};
  masterJenisKemasan.forEach(m => { running[m.name] = { gudangDus: 0, processing: 0, rejTotal: 0 }; });

  const rows = [];
  db.forEach(entry => {
    entry.items.forEach(it => {
      const r = running[it.name];
      if (!r) return;
      const std = it.std || 200;
      const masukDus = it.masuk || 0;
      const bongkarDus = it.bongkarDus || 0;
      const pcsBongkar = it.aktualPcs || 0;
      const kirim = it.kirim || 0;
      const tamu = it.tamu || 0;
      const rejHari = rejMika(it);
      const procSebelumKeluar = r.processing + pcsBongkar;

      r.gudangDus += masukDus - bongkarDus;
      const opnameVal = (typeof it.processingOpname === 'number' && !isNaN(it.processingOpname))
        ? it.processingOpname : null;
      if (opnameVal !== null) r.processing = opnameVal;
      else r.processing += pcsBongkar - kirim - tamu - rejHari;
      r.rejTotal += rejHari;

      if (entry.tgl >= period.from && entry.tgl <= period.to) {
        const totalKeluarHari = kirim + tamu + rejHari;
        const totalStokPcs = Math.max(0, r.processing);
        rows.push({
          tgl: entry.tgl, name: it.name, std,
          masukDus, masukPcs: masukDus * std,
          gudangDus: r.gudangDus, gudangPcs: r.gudangDus * std,
          bongkarDus, pcsBongkar,
          procPcs: procSebelumKeluar,
          totalKeluar: totalKeluarHari,
          kirim, tamu,
          rejHari, rejTotal: r.rejTotal,
          totalStokDus: Math.floor(totalStokPcs / std),
          totalStokPcs,
          opname: opnameVal,
          keterangan: it.ketReject || it.ketTamu || ''
        });
      }
    });
  });

  const tbody = document.getElementById('mika-monthly-usage-body');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;color:#999;padding:1rem;">Belum ada data pada periode ini</td></tr>';
    return;
  }

  const byTgl = new Map();
  rows.forEach(r => {
    if (!byTgl.has(r.tgl)) byTgl.set(r.tgl, []);
    byTgl.get(r.tgl).push(r);
  });

  const fmt = n => Number(n || 0).toLocaleString('id-ID');
  const bCls = name => name === 'Hatsu' ? 'hatsu' : name === 'Grade A' ? 'gradea' : 'gradeb';

  let html = '';
  byTgl.forEach((items, tgl) => {
    const [y, m, d] = tgl.split('-');
    const tglFmt = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
    const rowspan = items.length;
    items.forEach((r, idx) => {
      html += '<tr>';
      if (idx === 0) html += `<td class="tgl-col" rowspan="${rowspan}">${tglFmt}</td>`;
      html += `<td><span class="badge ${bCls(r.name)}">${r.name}</span></td>`;
      html += `<td>${r.masukDus ? fmt(r.masukDus) : ''}</td>`;
      html += `<td>${r.masukPcs ? fmt(r.masukPcs) : ''}</td>`;
      html += `<td>${fmt(r.gudangDus)}</td>`;
      html += `<td>${fmt(r.gudangPcs)}</td>`;
      html += `<td>${r.bongkarDus ? fmt(r.bongkarDus) : ''}</td>`;
      html += `<td>${r.pcsBongkar ? fmt(r.pcsBongkar) : ''}</td>`;
      html += `<td>${fmt(r.procPcs)}</td>`;
      html += `<td class="col-total">${r.totalKeluar ? fmt(r.totalKeluar) : ''}</td>`;
      html += `<td>${r.kirim ? fmt(r.kirim) : ''}</td>`;
      html += `<td>${r.tamu ? fmt(r.tamu) : ''}</td>`;
      html += `<td style="color:#dc2626;">${r.rejHari ? fmt(r.rejHari) : ''}</td>`;
      html += `<td style="color:#dc2626;">${fmt(r.rejTotal)}</td>`;
      html += `<td class="col-total">${fmt(r.totalStokDus)}</td>`;
      html += `<td class="col-total">${fmt(r.totalStokPcs)}</td>`;
      html += `<td style="white-space:normal;max-width:180px;font-size:0.7rem;">${r.keterangan || ''}${r.opname !== null ? `<br><b style="color:#166534;">📝 Koreksi: ${fmt(r.opname)} pcs</b>` : ''}</td>`;
      html += '</tr>';
    });
  });
  tbody.innerHTML = html;
}

function renderMikaMonthlySelisih(period) {
  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]');
  const filtered = db.filter(e => e.tgl >= period.from && e.tgl <= period.to);
  const mBody = document.getElementById('mika-monthly-detail-body');
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
  if (mBody) mBody.innerHTML = mRows.length ? mRows.join('') : '<tr><td colspan="7" class="text-center" style="color:#999;">Belum ada data selisih</td></tr>';
  const cardsEl = document.getElementById('mika-monthly-cards');
  if (cardsEl) {
    cardsEl.innerHTML = masterJenisKemasan.map(m => {
      const st = statsPerJenis[m.name];
      const cls = st.sel < 0 ? 'red' : st.sel > 0 ? 'blue' : 'green';
      return `<div class="stat-card ${cls}">
        <div class="stat-label">Mika ${m.name}</div>
        <div class="stat-value" style="font-size:1.5rem;">${st.sel > 0 ? '+' + st.sel : st.sel} <small style="font-size:0.8rem;">Pcs</small></div>
        <div class="stat-meta">Bongkar: ${st.dus} Dus (${st.akt} Pcs)</div>
      </div>`;
    }).join('');
  }
}

// ========== EXPORT CSV STOCK OPNAME ==========
function exportMikaCSV() {
  const period = getMikaPeriod();
  if (!period.from || !period.to) { showToast('Pilih periode!', 'error'); return; }

  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]')
    .filter(e => e && e.tgl && Array.isArray(e.items))
    .sort((a, b) => a.tgl.localeCompare(b.tgl));

  const running = {};
  masterJenisKemasan.forEach(m => { running[m.name] = { gudangDus: 0, processing: 0, rejTotal: 0 }; });

  const rows = [];
  db.forEach(entry => {
    entry.items.forEach(it => {
      const r = running[it.name];
      if (!r) return;
      const std = it.std || 200;
      const masukDus = it.masuk || 0;
      const bongkarDus = it.bongkarDus || 0;
      const pcsBongkar = it.aktualPcs || 0;
      const kirim = it.kirim || 0;
      const tamu = it.tamu || 0;
      const rejHari = rejMika(it);
      const procSebelumKeluar = r.processing + pcsBongkar;

      r.gudangDus += masukDus - bongkarDus;
      const opnameVal = (typeof it.processingOpname === 'number' && !isNaN(it.processingOpname))
        ? it.processingOpname : null;
      if (opnameVal !== null) r.processing = opnameVal;
      else r.processing += pcsBongkar - kirim - tamu - rejHari;
      r.rejTotal += rejHari;

      if (entry.tgl >= period.from && entry.tgl <= period.to) {
        const totalKeluarHari = kirim + tamu + rejHari;
        const totalStokPcs = Math.max(0, r.processing);
        let ket = it.ketReject || it.ketTamu || '';
        if (opnameVal !== null) ket = ket + (ket ? ' | ' : '') + '📝 Koreksi: ' + opnameVal + ' pcs';
        rows.push({
          tgl: entry.tgl, name: it.name, std,
          masukDus, masukPcs: masukDus * std,
          gudangDus: r.gudangDus, gudangPcs: r.gudangDus * std,
          bongkarDus, pcsBongkar,
          procPcs: procSebelumKeluar,
          totalKeluar: totalKeluarHari,
          kirim, tamu,
          rejHari, rejTotal: r.rejTotal,
          totalStokDus: Math.floor(totalStokPcs / std),
          totalStokPcs,
          keterangan: ket
        });
      }
    });
  });

  if (!rows.length) { showToast('Tidak ada data!', 'error'); return; }

  const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const n = v => Number(v || 0);

  const periodLabel = period.mode === 'single' ? period.from.substring(0, 7) : `${period.from} s.d. ${period.to}`;

  let csv = '';
  csv += 'STOCK OPNAME KEMASAN MIKA - ' + periodLabel + '\n';
  csv += 'PT. Agri Wangi Berry - Processing\n';
  csv += 'Periode: ' + period.label + '\n\n';
  csv += ['Tanggal','Jenis Kemasan','Masuk Dus','Masuk Pcs','Stok Gudang Dus','Stok Gudang Pcs','Bongkar Dus','Pcs Bongkar','Ruang Prosesing Pcs','Total Keluar','Kirim','Mika Tamu','Reject Hari Ini','Reject Total','Total Stok Dus','Total Stok Pcs','Keterangan'].join(',') + '\n';

  rows.forEach(r => {
    const [y, m, d] = r.tgl.split('-');
    const tglFmt = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
    csv += [
      q(tglFmt), q(r.name),
      n(r.masukDus), n(r.masukPcs),
      n(r.gudangDus), n(r.gudangPcs),
      n(r.bongkarDus), n(r.pcsBongkar), n(r.procPcs),
      n(r.totalKeluar),
      n(r.kirim), n(r.tamu),
      n(r.rejHari), n(r.rejTotal),
      n(r.totalStokDus), n(r.totalStokPcs),
      q(r.keterangan || '')
    ].join(',') + '\n';
  });

  const sum = k => rows.reduce((a, r) => a + (r[k] || 0), 0);
  csv += '\n';
  csv += [q('TOTAL'), q(''), n(sum('masukDus')), n(sum('masukPcs')), q(''), q(''), n(sum('bongkarDus')), n(sum('pcsBongkar')), q(''), n(sum('totalKeluar')), n(sum('kirim')), n(sum('tamu')), n(sum('rejHari')), q(''), q(''), n(sum('totalStokPcs')), q('')].join(',') + '\n';

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `Stock_Opname_Mika_${period.from}_to_${period.to}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 3000);
  showToast(`📥 Download (${rows.length} baris)`);
}

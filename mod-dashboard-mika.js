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
    .sort((a, b) => a.tgl.localeCompare(b.tgl) || (String(a.id).localeCompare(String(b.id))));
  const names = masterJenisKemasan.map(m => m.name);
  const st = { gudang: {}, proc: {}, layer: 0, sleeve: 0, stiker: 0, netfoam: 0 };
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
        st.proc[it.name] += (it.aktualPcs || 0) - out - rej;
        keluar += out; reject += rej; rejectBy[it.name] += rej;
        st.layer   += (it.layerSiap || 0)   - (it.layerPakai || 0);
        st.sleeve  += (it.sleeveSiap || 0)  - (it.sleevePakai || 0);
        st.stiker  += (it.stikerMasuk || 0) - (it.stikerPakai || 0);
        st.netfoam += (it.netfoamPotong || 0) - (it.netfoamTerpakai || 0);
      });
      entry.items.forEach(it => {
        ['layer', 'sleeve', 'stiker', 'netfoam'].forEach(k => {
          const o = opnameVal(it[k + 'Opname']);
          if (o !== null) st[k] = o;
        });
      });
    });
    snaps.push({
      tgl, keluar, reject, rejectBy,
      proc: { ...st.proc }, gudang: { ...st.gudang },
      layer: st.layer, sleeve: st.sleeve, stiker: st.stiker, netfoam: st.netfoam
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
      { label: 'Hatsu',  val: latest.proc['Hatsu'],   cls: 'blue',   meta: `Gudang ${fmt(Math.max(0, latest.gudang['Hatsu']))} dus · Reject hari itu ${fmt(latest.rejectBy['Hatsu'])}` },
      { label: 'Hy 11 (Grade A)', val: latest.proc['Grade A'], cls: 'green',  meta: `Gudang ${fmt(Math.max(0, latest.gudang['Grade A']))} dus · Reject hari itu ${fmt(latest.rejectBy['Grade A'])}` },
      { label: 'Hy 15 (Grade B)', val: latest.proc['Grade B'], cls: 'orange', meta: `Gudang ${fmt(Math.max(0, latest.gudang['Grade B']))} dus · Reject hari itu ${fmt(latest.rejectBy['Grade B'])}` },
      { label: 'Layer',  val: latest.layer,   cls: 'purple', meta: 'Pcs · untuk Grade A' },
      { label: 'Sleeve', val: latest.sleeve,  cls: 'orange', meta: 'Pcs · untuk Grade B' },
      { label: 'Stiker', val: latest.stiker,  cls: 'blue',   meta: 'Pcs' },
      { label: 'Netfoam', val: latest.netfoam, cls: 'green', meta: 'Pcs potong · untuk Hatsu' }
    ];
    cardsEl.innerHTML = items.map(x => `
      <div class="stat-card ${x.cls}">
        <div class="stat-label">${x.label}</div>
        <div class="stat-value">${cell(x.val)}</div>
        <div class="stat-meta">${x.meta}</div>
      </div>`).join('');
    const minus = items.filter(x => x.val < 0).map(x => x.label);
    warnEl.innerHTML = minus.length
      ? `<div class="warn-box" style="margin-top:0.5rem;">⚠️ Stok minus: <b>${minus.join(', ')}</b>. Cek input harian, atau isi <b>Koreksi Stok Fisik</b> di menu Stok Kemasan.</div>`
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
        <td>${cell(x.layer)}</td>
        <td>${cell(x.sleeve)}</td>
        <td>${cell(x.stiker)}</td>
        <td>${cell(x.netfoam)}</td>
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
  renderMikaChart(period);
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
      rejectEl.innerHTML = '<div style="color:#16a34a;padding:0.5rem;font-weight:600;">✓ Tidak ada reject pada periode ini</div>';
    } else {
      rejectEl.innerHTML = `
        <div class="stat-card red">
          <div class="stat-label">TOTAL REJECT</div>
          <div class="stat-value">${totalReject.toLocaleString('id-ID')}</div>
          <div class="stat-meta">Pcs Mika</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-label">Hatsu</div>
          <div class="stat-value">${reject['Hatsu'].toLocaleString('id-ID')}</div>
          <div class="stat-meta">Pcs</div>
        </div>
        <div class="stat-card green">
          <div class="stat-label">Grade A (Hy 11)</div>
          <div class="stat-value">${reject['Grade A'].toLocaleString('id-ID')}</div>
          <div class="stat-meta">Pcs</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-label">Grade B (Hy 15)</div>
          <div class="stat-value">${reject['Grade B'].toLocaleString('id-ID')}</div>
          <div class="stat-meta">Pcs</div>
        </div>
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

  const totalTamuPanen   = tamuPanen['Hatsu']   + tamuPanen['Grade A']   + tamuPanen['Grade B'];
  const totalTamuKemasan = tamuKemasan['Hatsu'] + tamuKemasan['Grade A'] + tamuKemasan['Grade B'];
  const pakaiPanen = totalTamuPanen > 0;
  const tamu = pakaiPanen ? tamuPanen : tamuKemasan;
  const tamuSource = pakaiPanen ? 'Form Panen' : (totalTamuKemasan > 0 ? 'Form Stok Kemasan' : '—');
  const totalTamu = tamu['Hatsu'] + tamu['Grade A'] + tamu['Grade B'];

  const tamuEl = document.getElementById('mika-tamu-cards');
  if (tamuEl) {
    if (totalTamu === 0 && curahKg === 0) {
      tamuEl.innerHTML = '<div style="color:#999;padding:0.5rem;">Belum ada data tamu pada periode ini</div>';
    } else {
      tamuEl.innerHTML = `
        <div class="stat-card purple">
          <div class="stat-label">TOTAL TAMU (PCS)</div>
          <div class="stat-value">${totalTamu.toLocaleString('id-ID')}</div>
          <div class="stat-meta">Sumber: ${tamuSource}</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-label">TAMU CURAH</div>
          <div class="stat-value">${curahKg.toFixed(2)}</div>
          <div class="stat-meta">Kg · dari Panen</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-label">Hatsu</div>
          <div class="stat-value">${tamu['Hatsu'].toLocaleString('id-ID')}</div>
          <div class="stat-meta">Pcs</div>
        </div>
        <div class="stat-card green">
          <div class="stat-label">Grade A (Hy 11)</div>
          <div class="stat-value">${tamu['Grade A'].toLocaleString('id-ID')}</div>
          <div class="stat-meta">Pcs</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-label">Grade B (Hy 15)</div>
          <div class="stat-value">${tamu['Grade B'].toLocaleString('id-ID')}</div>
          <div class="stat-meta">Pcs</div>
        </div>
      `;
    }
  }
}

// ========== KPI PERGERAKAN KEMASAN ==========
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
      <div class="stat-card blue">
        <div class="stat-label">Total Kemasan Masuk</div>
        <div class="stat-value">${fmt(sum('masukDus'))}</div>
        <div class="stat-meta">Dus · semua grade</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">Total Dibongkar</div>
        <div class="stat-value">${fmt(sum('bongkarDus'))}</div>
        <div class="stat-meta">Dus · ${fmt(sum('pcsBongkar'))} Pcs aktual</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Total Kirim Packing</div>
        <div class="stat-value">${fmt(sum('kirim'))}</div>
        <div class="stat-meta">Pcs mika</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-label">Total Mika Tamu</div>
        <div class="stat-value">${fmt(sum('tamu'))}</div>
        <div class="stat-meta">Pcs mika</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">Total Reject</div>
        <div class="stat-value">${fmt(sum('reject'))}</div>
        <div class="stat-meta">Pcs mika</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Hari Transaksi</div>
        <div class="stat-value">${db.length}</div>
        <div class="stat-meta">Hari dengan data</div>
      </div>
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

// ========== GRAFIK HARIAN KIRIM VS REJECT ==========
function renderMikaChart(period) {
  const el = document.getElementById('mika-chart-harian');
  if (!el) return;

  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]')
    .filter(e => e && e.tgl && e.tgl >= period.from && e.tgl <= period.to && Array.isArray(e.items));

  const byDate = new Map();
  db.forEach(entry => {
    if (!byDate.has(entry.tgl)) byDate.set(entry.tgl, { kirim: 0, reject: 0 });
    const d = byDate.get(entry.tgl);
    entry.items.forEach(it => {
      d.kirim += it.kirim || 0;
      d.reject += rejMika(it);
    });
  });

  const data = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([tgl, v]) => ({ tgl, ...v }));

  if (!data.length) {
    el.innerHTML = '<div style="text-align:center;color:#999;padding:2rem;">Belum ada data untuk grafik periode ini</div>';
    return;
  }

  const W = Math.max(600, data.length * 60);
  const H = 280;
  const padL = 55, padR = 20, padT = 20, padB = 60;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  let maxVal = 0;
  data.forEach(d => { maxVal = Math.max(maxVal, d.kirim, d.reject); });
  maxVal = Math.ceil((maxVal || 1) * 1.1);

  const slotW = chartW / data.length;
  const barW = Math.min(28, slotW / 3);

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" preserveAspectRatio="xMidYMid meet" style="min-width:${W}px;">`;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (chartH * i / 4);
    const val = maxVal * (1 - i / 4);
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e5e7eb"/>`;
    svg += `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#888">${val.toFixed(0)}</text>`;
  }

  data.forEach((d, i) => {
    const slotX = padL + (chartW * i / data.length);
    const xK = slotX + slotW / 2 - barW - 1;
    const xR = slotX + slotW / 2 + 1;
    const hK = (d.kirim / maxVal) * chartH;
    const hR = (d.reject / maxVal) * chartH;
    const yK = padT + chartH - hK;
    const yR = padT + chartH - hR;
    svg += `<rect x="${xK}" y="${yK}" width="${barW}" height="${hK}" fill="#2563eb" rx="2"><title>${d.tgl} · Kirim: ${d.kirim} Pcs</title></rect>`;
    svg += `<rect x="${xR}" y="${yR}" width="${barW}" height="${hR}" fill="#dc2626" rx="2"><title>${d.tgl} · Reject: ${d.reject} Pcs</title></rect>`;
    const dayLabel = d.tgl.substring(8, 10);
    const monthLabel = d.tgl.substring(5, 7);
    svg += `<text x="${slotX + slotW / 2}" y="${H - padB + 15}" text-anchor="middle" font-size="9" fill="#666">${dayLabel}/${monthLabel}</text>`;
  });

  svg += `<line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="#999"/>`;
  svg += `</svg>`;

  el.innerHTML = svg + `
    <div class="chart-legend">
      <span><span class="dot" style="background:#2563eb;"></span> Kirim (Pcs)</span>
      <span><span class="dot" style="background:#dc2626;"></span> Reject (Pcs)</span>
    </div>`;
}

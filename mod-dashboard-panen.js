// ========== DASHBOARD PANEN MODULE ==========
function setDashboardBulanIni() {
  const nowMonth = new Date().toISOString().substring(0, 7);
  document.getElementById('dashboard-bulan').value = nowMonth;
  const mg = document.getElementById('minggu-bulan');
  if (mg) mg.value = nowMonth;
  updateDashboard();
}

function onDashboardMonthChange() {
  const v = document.getElementById('dashboard-bulan').value;
  const mg = document.getElementById('minggu-bulan');
  if (mg) mg.value = v;
  updateDashboard();
}

function updateDashboard() {
  const bulanEl = document.getElementById('dashboard-bulan');
  if (!bulanEl) return;
  if (!bulanEl.value) bulanEl.value = new Date().toISOString().substring(0, 7);
  const selectedMonth = bulanEl.value;
  const infoEl = document.getElementById('dashboard-period-info');
  if (infoEl) infoEl.innerHTML = `Menampilkan data: <b>${formatBulanIndo(selectedMonth)}</b> · <b>${ghLabelOf(dashGh())}</b>`;
  const panenDb = filterGh(JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]'), dashGh());
  const filtered = panenDb.filter(x => x.tgl && x.tgl.startsWith(selectedMonth)).sort((a, b) => new Date(a.tgl) - new Date(b.tgl));
  const T = {
    p_hatsu: 0, p_gradea: 0, p_gradeb: 0, rk_total: 0, panen_total: 0,
    rk_crack: 0, rk_poli: 0, rk_hpt: 0,
    rp_crack: 0, rp_poli: 0, rp_hpt: 0, rp_bruise: 0, rp_overripe: 0, rp_kuning: 0, rp_frozen: 0, rej_total: 0,
    k_hatsu: 0, k_a11: 0, k_a15: 0, k_frozen: 0, kirim_total: 0,
    m_hatsu: 0, m_a11: 0, m_a15: 0, mika_total: 0
  };
  filtered.forEach(item => {
    const rk = (item.rk_crack || 0) + (item.rk_poli || 0) + (item.rk_hpt || 0);
    const rp = (item.rp_crack || 0) + (item.rp_poli || 0) + (item.rp_hpt || 0) + (item.rp_bruise || 0) + (item.rp_overripe || 0) + (item.rp_kuning || 0) + (item.rp_frozen || 0);
    T.p_hatsu += item.p_hatsu || 0;
    T.p_gradea += item.p_gradea || 0;
    T.p_gradeb += item.p_gradeb || 0;
    T.rk_total += rk;
    T.rk_crack += item.rk_crack || 0;
    T.rk_poli += item.rk_poli || 0;
    T.rk_hpt += item.rk_hpt || 0;
    T.panen_total += (item.p_hatsu || 0) + (item.p_gradea || 0) + (item.p_gradeb || 0) + rk;
    T.rp_crack += item.rp_crack || 0;
    T.rp_poli += item.rp_poli || 0;
    T.rp_hpt += item.rp_hpt || 0;
    T.rp_bruise += item.rp_bruise || 0;
    T.rp_overripe += item.rp_overripe || 0;
    T.rp_kuning += item.rp_kuning || 0;
    T.rp_frozen += item.rp_frozen || 0;
    T.rej_total += rk + rp;
    T.k_hatsu += item.k_hatsu || 0;
    T.k_a11 += item.k_a11 || 0;
    T.k_a15 += item.k_a15 || 0;
    T.k_frozen += item.k_frozen || 0;
    T.kirim_total += (item.k_hatsu || 0) + (item.k_a11 || 0) + (item.k_a15 || 0) + (item.k_frozen || 0);
    T.m_hatsu += item.m_hatsu || 0;
    T.m_a11 += item.m_a11 || 0;
    T.m_a15 += item.m_a15 || 0;
    T.mika_total += (item.m_hatsu || 0) + (item.m_a11 || 0) + (item.m_a15 || 0);
  });
  const rejectRate = T.panen_total > 0 ? (T.rej_total / T.panen_total * 100) : 0;
  const rateKirim = T.panen_total > 0 ? (T.kirim_total / T.panen_total * 100) : 0;
  document.getElementById('stat-panen').textContent = T.panen_total.toFixed(2);
  document.getElementById('stat-dikirim').textContent = T.kirim_total.toFixed(2);
  document.getElementById('stat-kirim').textContent = T.mika_total;
  document.getElementById('stat-rate-kirim').textContent = rateKirim.toFixed(2) + '%';
  const rejPacking = T.rej_total - T.rk_total;
  document.getElementById('stat-rej-total').textContent = T.rej_total.toFixed(2);
  document.getElementById('stat-rej-meta').textContent = `Kg · Kebun ${T.rk_total.toFixed(2)} | Packing ${rejPacking.toFixed(2)}`;
  let badgeClass = 'good', badgeMsg = '✓ Aman';
  if (rejectRate > 20) { badgeClass = 'bad'; badgeMsg = '⚠️ Tinggi'; }
  else if (rejectRate > 10) { badgeClass = 'warn'; badgeMsg = '⚠️ Perhatian'; }
  document.getElementById('stat-rej-rate').textContent = rejectRate.toFixed(2) + '%';
  document.getElementById('stat-rej-badge').innerHTML = T.panen_total > 0 ? `<span class="notif-badge ${badgeClass}">${badgeMsg}</span>` : '';
  const [selY2, selM2] = selectedMonth.split('-').map(Number);
  const prevDate = new Date(selY2, selM2 - 2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const nowD = new Date();
  const nowYM = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}`;
  const cutoffDay = (selectedMonth === nowYM) ? nowD.getDate() : 31;
  const cutoffLabel = (selectedMonth === nowYM) ? ` (s/d tgl ${cutoffDay})` : '';
  let pPanen = 0, pRej = 0, pCount = 0;
  panenDb.forEach(item => {
    if (!item.tgl || !item.tgl.startsWith(prevMonth)) return;
    if (parseInt(item.tgl.substring(8, 10), 10) > cutoffDay) return;
    const rk = (item.rk_crack || 0) + (item.rk_poli || 0) + (item.rk_hpt || 0);
    const rp = (item.rp_crack || 0) + (item.rp_poli || 0) + (item.rp_hpt || 0) + (item.rp_bruise || 0) + (item.rp_overripe || 0) + (item.rp_kuning || 0) + (item.rp_frozen || 0);
    pPanen += (item.p_hatsu || 0) + (item.p_gradea || 0) + (item.p_gradeb || 0) + rk;
    pRej += rk + rp;
    pCount++;
  });
  const dPanenEl = document.getElementById('stat-panen-delta');
  if (pCount === 0 || pPanen <= 0) {
    dPanenEl.className = 'stat-delta';
    dPanenEl.textContent = '– belum ada data bulan lalu';
  } else {
    const pct = (T.panen_total - pPanen) / pPanen * 100;
    dPanenEl.className = 'stat-delta ' + (pct > 0 ? 'up' : pct < 0 ? 'down' : '');
    dPanenEl.textContent = `${pct > 0 ? '▲' : pct < 0 ? '▼' : '='} ${Math.abs(pct).toFixed(1)}% vs bulan lalu${cutoffLabel}`;
  }
  const dRejEl = document.getElementById('stat-rej-rate-delta');
  if (pCount === 0 || pPanen <= 0) {
    dRejEl.className = 'stat-delta';
    dRejEl.textContent = '– belum ada data bulan lalu';
  } else {
    const pRate = pRej / pPanen * 100;
    const diff = rejectRate - pRate;
    dRejEl.className = 'stat-delta ' + (diff > 0 ? 'down' : diff < 0 ? 'up' : '');
    dRejEl.textContent = `${diff > 0 ? '▲' : diff < 0 ? '▼' : '='} ${Math.abs(diff).toFixed(2)} poin vs bulan lalu (${pRate.toFixed(2)}%)${cutoffLabel}`;
  }
  const tbody = document.getElementById('recap-body');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="25" style="text-align:center;color:#999;padding:1rem;">Belum ada data bulan ini</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(item => {
      const rk = (item.rk_crack || 0) + (item.rk_poli || 0) + (item.rk_hpt || 0);
      const panenTotal = (item.p_hatsu || 0) + (item.p_gradea || 0) + (item.p_gradeb || 0) + rk;
      const rpTotal = (item.rp_crack || 0) + (item.rp_poli || 0) + (item.rp_hpt || 0) + (item.rp_bruise || 0) + (item.rp_overripe || 0) + (item.rp_kuning || 0) + (item.rp_frozen || 0);
      const totalRej = rk + rpTotal;
      const rejRate = panenTotal > 0 ? (totalRej / panenTotal * 100) : 0;
      const kirimTotal = (item.k_hatsu || 0) + (item.k_a11 || 0) + (item.k_a15 || 0) + (item.k_frozen || 0);
      const rKirim = panenTotal > 0 ? (kirimTotal / panenTotal * 100) : 0;
      const mikaTotal = (item.m_hatsu || 0) + (item.m_a11 || 0) + (item.m_a15 || 0);
      const tglFmt = item.tgl.split('-').reverse().join('/');
      return `<tr>
        <td class="tgl-col">${tglFmt}${dashGh() === 'all' ? `<br><small style="color:#64748b;">${ghOf(item)}</small>` : ''}</td>
        <td>${(item.p_hatsu || 0).toFixed(2)}</td>
        <td>${(item.p_gradea || 0).toFixed(2)}</td>
        <td>${(item.p_gradeb || 0).toFixed(2)}</td>
        <td>${rk.toFixed(2)}</td>
        <td><strong>${panenTotal.toFixed(2)}</strong></td>
        <td>${(item.rp_crack || 0).toFixed(2)}</td>
        <td>${(item.rp_poli || 0).toFixed(2)}</td>
        <td>${(item.rp_hpt || 0).toFixed(2)}</td>
        <td>${(item.rp_bruise || 0).toFixed(2)}</td>
        <td>${(item.rp_overripe || 0).toFixed(2)}</td>
        <td>${(item.rp_kuning || 0).toFixed(2)}</td>
        <td>${(item.rp_frozen || 0).toFixed(2)}</td>
        <td>${totalRej.toFixed(2)}</td>
        <td class="reject-rate">${rejRate.toFixed(2)}%</td>
        <td>${(item.k_hatsu || 0).toFixed(2)}</td>
        <td>${(item.k_a11 || 0).toFixed(2)}</td>
        <td>${(item.k_a15 || 0).toFixed(2)}</td>
        <td>${(item.k_frozen || 0).toFixed(2)}</td>
        <td><strong>${kirimTotal.toFixed(2)}</strong></td>
        <td class="rate-kirim">${rKirim.toFixed(2)}%</td>
        <td>${item.m_hatsu || 0}</td>
        <td>${item.m_a11 || 0}</td>
        <td>${item.m_a15 || 0}</td>
        <td><strong>${mikaTotal}</strong></td>
      </tr>`;
    }).join('');
  }
  const n = filtered.length || 1;
  document.getElementById('recap-foot').innerHTML = `
    <tr>
      <td class="tgl-col">TOTAL</td>
      <td>${T.p_hatsu.toFixed(2)}</td>
      <td>${T.p_gradea.toFixed(2)}</td>
      <td>${T.p_gradeb.toFixed(2)}</td>
      <td>${T.rk_total.toFixed(2)}</td>
      <td>${T.panen_total.toFixed(2)}</td>
      <td>${T.rp_crack.toFixed(2)}</td>
      <td>${T.rp_poli.toFixed(2)}</td>
      <td>${T.rp_hpt.toFixed(2)}</td>
      <td>${T.rp_bruise.toFixed(2)}</td>
      <td>${T.rp_overripe.toFixed(2)}</td>
      <td>${T.rp_kuning.toFixed(2)}</td>
      <td>${T.rp_frozen.toFixed(2)}</td>
      <td>${T.rej_total.toFixed(2)}</td>
      <td style="color:#fca5a5;">${rejectRate.toFixed(2)}%</td>
      <td>${T.k_hatsu.toFixed(2)}</td>
      <td>${T.k_a11.toFixed(2)}</td>
      <td>${T.k_a15.toFixed(2)}</td>
      <td>${T.k_frozen.toFixed(2)}</td>
      <td>${T.kirim_total.toFixed(2)}</td>
      <td style="color:#86efac;">${rateKirim.toFixed(2)}%</td>
      <td>${T.m_hatsu}</td>
      <td>${T.m_a11}</td>
      <td>${T.m_a15}</td>
      <td>${T.mika_total}</td>
    </tr>
    <tr style="background:#4b5563;">
      <td class="tgl-col">RATA-RATA</td>
      <td>${(T.p_hatsu / n).toFixed(2)}</td>
      <td>${(T.p_gradea / n).toFixed(2)}</td>
      <td>${(T.p_gradeb / n).toFixed(2)}</td>
      <td>${(T.rk_total / n).toFixed(2)}</td>
      <td>${(T.panen_total / n).toFixed(2)}</td>
      <td>${(T.rp_crack / n).toFixed(2)}</td>
      <td>${(T.rp_poli / n).toFixed(2)}</td>
      <td>${(T.rp_hpt / n).toFixed(2)}</td>
      <td>${(T.rp_bruise / n).toFixed(2)}</td>
      <td>${(T.rp_overripe / n).toFixed(2)}</td>
      <td>${(T.rp_kuning / n).toFixed(2)}</td>
      <td>${(T.rp_frozen / n).toFixed(2)}</td>
      <td>${(T.rej_total / n).toFixed(2)}</td>
      <td>${rejectRate.toFixed(2)}%</td>
      <td>${(T.k_hatsu / n).toFixed(2)}</td>
      <td>${(T.k_a11 / n).toFixed(2)}</td>
      <td>${(T.k_a15 / n).toFixed(2)}</td>
      <td>${(T.k_frozen / n).toFixed(2)}</td>
      <td>${(T.kirim_total / n).toFixed(2)}</td>
      <td>${rateKirim.toFixed(2)}%</td>
      <td>${(T.m_hatsu / n).toFixed(0)}</td>
      <td>${(T.m_a11 / n).toFixed(0)}</td>
      <td>${(T.m_a15 / n).toFixed(0)}</td>
      <td>${(T.mika_total / n).toFixed(0)}</td>
    </tr>
  `;
  renderChartPanenVsKirim(mergeByTgl(filtered));
  renderChartRejectPie(T);
  renderMikaDashboard();
  const mgEl = document.getElementById('minggu-bulan');
  if (mgEl && !mgEl.value) mgEl.value = selectedMonth;
  renderWeeklyPanen();
}

// ========== GRAFIK HARIAN ==========
function renderChartPanenVsKirim(data) {
  const el = document.getElementById('chart-main');
  if (!el) return;
  if (!data.length) {
    el.innerHTML = '<div style="text-align:center;color:#999;padding:2rem;">Belum ada data untuk grafik bulan ini</div>';
    return;
  }
  const W = Math.max(600, data.length * 70);
  const H = 280;
  const padL = 55, padR = 20, padT = 20, padB = 60;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  let maxVal = 0;
  data.forEach(d => {
    const panen = (d.p_hatsu || 0) + (d.p_gradea || 0) + (d.p_gradeb || 0) + (d.rk_crack || 0) + (d.rk_poli || 0) + (d.rk_hpt || 0);
    const kirim = (d.k_hatsu || 0) + (d.k_a11 || 0) + (d.k_a15 || 0) + (d.k_frozen || 0);
    maxVal = Math.max(maxVal, panen, kirim);
  });
  maxVal = maxVal || 1;
  maxVal = Math.ceil(maxVal * 1.1);
  const slotW = chartW / data.length;
  const barW = Math.min(30, slotW / 3);
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" preserveAspectRatio="xMidYMid meet" style="min-width:${W}px;">`;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (chartH * i / 4);
    const val = maxVal * (1 - i / 4);
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
    svg += `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#888">${val.toFixed(0)}</text>`;
  }
  data.forEach((d, i) => {
    const panen = (d.p_hatsu || 0) + (d.p_gradea || 0) + (d.p_gradeb || 0) + (d.rk_crack || 0) + (d.rk_poli || 0) + (d.rk_hpt || 0);
    const kirim = (d.k_hatsu || 0) + (d.k_a11 || 0) + (d.k_a15 || 0) + (d.k_frozen || 0);
    const slotX = padL + (chartW * i / data.length);
    const xP = slotX + slotW / 2 - barW - 1;
    const xK = slotX + slotW / 2 + 1;
    const hP = (panen / maxVal) * chartH;
    const hK = (kirim / maxVal) * chartH;
    const yP = padT + chartH - hP;
    const yK = padT + chartH - hK;
    svg += `<rect x="${xP}" y="${yP}" width="${barW}" height="${hP}" fill="#dc2626" rx="2"><title>${d.tgl} · Panen: ${panen.toFixed(2)} Kg</title></rect>`;
    svg += `<rect x="${xK}" y="${yK}" width="${barW}" height="${hK}" fill="#2563eb" rx="2"><title>${d.tgl} · Kirim: ${kirim.toFixed(2)} Kg</title></rect>`;
    const dayLabel = d.tgl.substring(8, 10);
    svg += `<text x="${slotX + slotW / 2}" y="${H - padB + 15}" text-anchor="middle" font-size="10" fill="#666">${dayLabel}</text>`;
  });
  svg += `<line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="#999" stroke-width="1"/>`;
  svg += `</svg>`;
  el.innerHTML = svg + `
    <div class="chart-legend">
      <span><span class="dot" style="background:#dc2626;"></span> Panen (Kg)</span>
      <span><span class="dot" style="background:#2563eb;"></span> Kirim (Kg)</span>
    </div>`;
}

function renderChartRejectPie(T) {
  const el = document.getElementById('chart-reject');
  if (!el) return;
  const total = T.rej_total;
  if (total <= 0) {
    el.innerHTML = '<div style="text-align:center;color:#16a34a;padding:2rem;font-weight:600;">✓ Tidak ada reject bulan ini</div>';
    return;
  }
  const segments = [
    { label: 'Cracking', value: (T.rk_crack || 0) + T.rp_crack, color: '#dc2626' },
    { label: 'Polinasi', value: (T.rk_poli || 0) + T.rp_poli, color: '#ea580c' },
    { label: 'HPT', value: (T.rk_hpt || 0) + T.rp_hpt, color: '#f59e0b' },
    { label: 'Bruise', value: T.rp_bruise, color: '#84cc16' },
    { label: 'Overripe', value: T.rp_overripe, color: '#0891b2' },
    { label: 'Buah Kuning <80%', value: T.rp_kuning, color: '#eab308' },
    { label: 'Frozen', value: T.rp_frozen, color: '#7c3aed' }
  ].filter(s => s.value > 0);
  if (!segments.length) {
    el.innerHTML = '<div style="text-align:center;color:#999;padding:2rem;">Tidak ada rincian reject</div>';
    return;
  }
  const W = 240, H = 240, cx = W / 2, cy = H / 2, R = 90;
  let startAngle = -Math.PI / 2;
  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:240px;height:240px;flex:none;">`;
  segments.forEach(s => {
    const angle = (s.value / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    if (angle >= Math.PI * 1.999) {
      svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${s.color}"/>`;
    } else {
      const x1 = cx + R * Math.cos(startAngle);
      const y1 = cy + R * Math.sin(startAngle);
      const x2 = cx + R * Math.cos(endAngle);
      const y2 = cy + R * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      svg += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${s.color}" stroke="white" stroke-width="2"><title>${s.label}: ${s.value.toFixed(2)} Kg (${(s.value / total * 100).toFixed(1)}%)</title></path>`;
    }
    startAngle = endAngle;
  });
  svg += `<circle cx="${cx}" cy="${cy}" r="50" fill="white"/>`;
  svg += `<text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="11" fill="#888" font-weight="600">TOTAL</text>`;
  svg += `<text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="16" fill="#dc2626" font-weight="800">${total.toFixed(1)}</text>`;
  svg += `<text x="${cx}" y="${cy + 27}" text-anchor="middle" font-size="10" fill="#999">Kg</text>`;
  svg += `</svg>`;
  const legend = segments.map(s =>
    `<span><span class="dot" style="background:${s.color};"></span> ${s.label}: <b>${s.value.toFixed(2)}</b> Kg (${(s.value / total * 100).toFixed(1)}%)</span>`
  ).join('');
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap;justify-content:center;">
      ${svg}
      <div class="chart-legend" style="flex-direction:column;gap:0.5rem;flex:1;min-width:200px;">${legend}</div>
    </div>`;
}

// ========== PERSEBARAN MINGGUAN ==========
const BULAN_SINGKAT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const WEEK_GRADES = [
  { key: 'hatsu',  label: 'Hatsuhana', color: '#dc2626' },
  { key: 'gradeA', label: 'Grade A',   color: '#16a34a' },
  { key: 'gradeB', label: 'Grade B',   color: '#ea580c' },
  { key: 'reject', label: 'Reject',    color: '#64748b' }
];
const WEEK_LEN = 6;

let weeklyExportData = null;

function formatYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function mondayOf(d) {
  const copy = new Date(d);
  const dow = copy.getDay();
  const back = (dow === 0) ? 6 : (dow - 1);
  copy.setDate(copy.getDate() - back);
  return copy;
}

function getWeekRanges(ym) {
  const [y, m] = ym.split('-').map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0);
  const firstMonday = mondayOf(monthStart);
  const out = [];
  let cursor = new Date(firstMonday);
  let idx = 1;
  while (cursor <= monthEnd) {
    const ws = new Date(cursor);
    const we = new Date(cursor);
    we.setDate(we.getDate() + (WEEK_LEN - 1));
    out.push({
      idx: idx++,
      startStr: formatYMD(ws),
      endStr: formatYMD(we),
      startDate: ws, endDate: we,
      sd: ws.getDate(), sm: ws.getMonth() + 1, sy: ws.getFullYear(),
      ed: we.getDate(), em: we.getMonth() + 1, ey: we.getFullYear(),
      days: WEEK_LEN
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}

function weekLabel(w) {
  const sm = BULAN_SINGKAT[w.sm - 1];
  const em = BULAN_SINGKAT[w.em - 1];
  if (w.sm === w.em && w.sy === w.ey) return `${w.sd}–${w.ed} ${sm} ${w.sy}`;
  if (w.sy === w.ey) return `${w.sd} ${sm} – ${w.ed} ${em} ${w.sy}`;
  return `${w.sd} ${sm} ${w.sy} – ${w.ed} ${em} ${w.ey}`;
}

function computeWeeklyPanenForMonth(ym) {
  const monthRanges = getWeekRanges(ym);
  if (!monthRanges.length) return [];
  const first = monthRanges[0];
  const prevStart = new Date(first.startDate);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(prevStart);
  prevEnd.setDate(prevEnd.getDate() + (WEEK_LEN - 1));
  const prevRange = {
    idx: 0,
    startStr: formatYMD(prevStart),
    endStr: formatYMD(prevEnd),
    startDate: prevStart, endDate: prevEnd,
    sd: prevStart.getDate(), sm: prevStart.getMonth() + 1, sy: prevStart.getFullYear(),
    ed: prevEnd.getDate(), em: prevEnd.getMonth() + 1, ey: prevEnd.getFullYear(),
    days: WEEK_LEN
  };
  const allRanges = [prevRange, ...monthRanges];
  const result = allRanges.map(w => ({
    ...w, hatsu: 0, gradeA: 0, gradeB: 0, reject: 0, total: 0, daysSet: new Set()
  }));
  const db = filterGh(JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]'), weekGh());
  db.forEach(item => {
    if (!item.tgl) return;
    const w = result.find(x => item.tgl >= x.startStr && item.tgl <= x.endStr);
    if (!w) return;
    w.hatsu  += item.p_hatsu  || 0;
    w.gradeA += item.p_gradea || 0;
    w.gradeB += item.p_gradeb || 0;
    w.reject += (item.rk_crack || 0) + (item.rk_poli || 0) + (item.rk_hpt || 0);
    w.daysSet.add(item.tgl);
  });
  result.forEach(w => {
    w.total = w.hatsu + w.gradeA + w.gradeB + w.reject;
    w.daysWithData = w.daysSet.size;
  });
  for (let i = 1; i < result.length; i++) {
    const w = result[i], p = result[i - 1];
    WEEK_GRADES.forEach(g => {
      const cv = w[g.key], pv = p[g.key];
      if (pv > 0) { w['d_' + g.key] = (cv - pv) / pv * 100; w['dnew_' + g.key] = false; }
      else if (cv > 0) { w['d_' + g.key] = null; w['dnew_' + g.key] = true; }
      else { w['d_' + g.key] = null; w['dnew_' + g.key] = false; }
    });
    if (p.total > 0) { w.d_total = (w.total - p.total) / p.total * 100; w.dnew_total = false; }
    else if (w.total > 0) { w.d_total = null; w.dnew_total = true; }
    else { w.d_total = null; w.dnew_total = false; }
  }
  return result.slice(1);
}

function linForecast(vals) {
  const n = vals.length;
  if (!n) return null;
  if (n === 1) return vals[0];
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  vals.forEach((y, i) => {
    const x = i + 1;
    sx += x; sy += y; sxy += x * y; sxx += x * x;
  });
  const denom = n * sxx - sx * sx;
  if (denom === 0) return vals[n - 1];
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return Math.max(0, slope * (n + 1) + intercept);
}

function renderWeeklyPanen() {
  const bulanEl = document.getElementById('minggu-bulan');
  if (!bulanEl) return;
  if (!bulanEl.value) bulanEl.value = new Date().toISOString().substring(0, 7);
  const ym = bulanEl.value;
  const filterEl = document.getElementById('minggu-filter');
  const filterVal = filterEl ? filterEl.value : 'all';

  const weeks = computeWeeklyPanenForMonth(ym);

  if (weeks.length) {
    document.getElementById('minggu-period-info').innerHTML =
      `<b>${ghLabelOf(weekGh())}</b> · Menampilkan minggu <b>(Senin–Sabtu)</b> yang beririsan dengan <b>${formatBulanIndo(ym)}</b> — ` +
      weeks.map(w => `Minggu ${w.idx}: <b>${weekLabel(w)}</b>`).join(' &nbsp;·&nbsp; ');
  } else {
    document.getElementById('minggu-period-info').textContent = 'Tidak ada minggu untuk bulan ini.';
  }

  renderWeeklyChart(weeks);

  const tbody = document.getElementById('weekly-body');
  const footEl = document.getElementById('weekly-foot');
  const noteEl = document.getElementById('weekly-forecast-note');

  if (!weeks.some(w => w.daysWithData > 0)) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;padding:1rem;">Belum ada data panen untuk periode ini</td></tr>';
    footEl.innerHTML = '';
    noteEl.innerHTML = '';
    weeklyExportData = null;
    return;
  }

  const totals = { hatsu: 0, gradeA: 0, gradeB: 0, reject: 0, total: 0 };
  weeks.forEach(w => {
    totals.hatsu += w.hatsu;
    totals.gradeA += w.gradeA;
    totals.gradeB += w.gradeB;
    totals.reject += w.reject;
    totals.total += w.total;
  });

  const shown = (filterVal === 'all') ? weeks : weeks.filter(w => String(w.idx) === filterVal);
  const list = shown.length ? shown : weeks;

  const deltaHtml = (d, isNew) => {
    if (isNew) return '<div class="wk-delta up">▲ baru</div>';
    if (d === null || d === undefined) return '<div class="wk-delta flat">–</div>';
    if (Math.abs(d) < 0.05) return '<div class="wk-delta flat">= 0.0%</div>';
    return `<div class="wk-delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}% vs minggu lalu</div>`;
  };

  const pctHtml = (v, total, label) => {
    if (total <= 0) return '<div class="wk-pct">0%</div>';
    return `<div class="wk-pct">${(v / total * 100).toFixed(1)}% ${label || 'dari total minggu'}</div>`;
  };

  tbody.innerHTML = list.map(w => `
    <tr>
      <td class="tgl-col">Minggu ${w.idx}</td>
      <td class="wk-periode">
        ${weekLabel(w)}<br>
        <small style="color:#94a3b8;">${w.days} hari · ${w.daysWithData} hari terisi data</small>
      </td>
      ${WEEK_GRADES.map(g =>
        `<td>
          <div class="wk-val">${w[g.key].toFixed(2)}</div>
          ${pctHtml(w[g.key], w.total)}
          ${deltaHtml(w['d_' + g.key], w['dnew_' + g.key])}
        </td>`
      ).join('')}
      <td class="col-total">
        <div class="wk-val">${w.total.toFixed(2)}</div>
        ${pctHtml(w.total, totals.total, 'dari total bulan')}
        ${deltaHtml(w.d_total, w.dnew_total)}
      </td>
    </tr>`).join('');

  const active = weeks.filter(w => w.daysWithData > 0);
  const lastActive = active[active.length - 1];

  const fcRate = {};
  WEEK_GRADES.forEach(g => {
    fcRate[g.key] = linForecast(active.map(w => w[g.key] / Math.max(1, w.daysWithData)));
  });
  const fcTotalRate = linForecast(active.map(w => w.total / Math.max(1, w.daysWithData)));

  const lastFull = {};
  WEEK_GRADES.forEach(g => {
    lastFull[g.key] = lastActive[g.key] / Math.max(1, lastActive.daysWithData) * WEEK_LEN;
  });
  lastFull.total = lastActive.total / Math.max(1, lastActive.daysWithData) * WEEK_LEN;

  const fcCell = (rate, lastVal, totalsKey) => {
    const isTotalCol = (totalsKey === 'total');
    const estWeekTotal = (fcTotalRate !== null && isFinite(fcTotalRate)) ? fcTotalRate * WEEK_LEN : 0;
    if (rate === null || !isFinite(rate)) return '<span style="opacity:.6;">–</span>';
    const est = rate * WEEK_LEN;
    let d = '';
    if (lastVal > 0) {
      const pct = (est - lastVal) / lastVal * 100;
      const col = pct > 0 ? '#86efac' : pct < 0 ? '#fecaca' : '#cbd5e1';
      d = `<div class="wk-delta" style="color:${col};">${pct > 0 ? '▲' : pct < 0 ? '▼' : '='} ${Math.abs(pct).toFixed(1)}% vs minggu lalu</div>`;
    }
    const base = isTotalCol ? totals.total : estWeekTotal;
    const lbl = isTotalCol ? 'dari total bulan' : 'dari total minggu';
    const share = base > 0 ? `<div class="wk-pct" style="color:#ccfbf1;">≈ ${(est / base * 100).toFixed(1)}% ${lbl}</div>` : '';
    return `<div class="wk-val">${est.toFixed(2)}</div>${share}${d}`;
  };

  footEl.innerHTML = `<tr>
    <td class="tgl-col" style="background:#0d9488;color:#fff;">🔮 Estimasi</td>
    <td class="wk-periode" style="background:#0d9488;color:#fff;">
      Minggu berikutnya<br><small style="color:#ccfbf1;">proyeksi ${WEEK_LEN} hari (Senin–Sabtu)</small>
    </td>
    ${WEEK_GRADES.map(g =>
      `<td style="background:#0d9488;color:#fff;">${fcCell(fcRate[g.key], lastFull[g.key], g.key)}</td>`
    ).join('')}
    <td style="background:#0d9488;color:#fff;">${fcCell(fcTotalRate, lastFull.total, 'total')}</td>
  </tr>`;

  const fcInfo = (rate, lastVal, totalsKey) => {
    if (rate === null || !isFinite(rate)) return { est: '', pct: '', delta: '' };
    const est = rate * WEEK_LEN;
    const isTot = (totalsKey === 'total');
    const base = isTot ? totals.total : (fcTotalRate !== null && isFinite(fcTotalRate) ? fcTotalRate * WEEK_LEN : 0);
    const pct = base > 0 ? `≈ ${(est / base * 100).toFixed(1)}% ${isTot ? 'dari total bulan' : 'dari total minggu'}` : '0%';
    let delta = '';
    if (lastVal > 0) {
      const d = (est - lastVal) / lastVal * 100;
      delta = `${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${Math.abs(d).toFixed(1)}% vs minggu lalu`;
    }
    return { est: est.toFixed(2), pct, delta };
  };
  weeklyExportData = {
    ym, weeks, totals, list,
    forecast: {
      cats: WEEK_GRADES.map(g => fcInfo(fcRate[g.key], lastFull[g.key], g.key)),
      total: fcInfo(fcTotalRate, lastFull.total, 'total')
    }
  };

  const usedDays = active.map(w => `M${w.idx}: ${w.daysWithData}/${w.days} hari`).join(' · ');
  noteEl.innerHTML = `<div class="warn-box" style="margin-top:1rem;">
    <b>📌 Catatan minggu:</b> Senin–Sabtu (6 hari). Minggu bisa lintas bulan, contoh: <b>28 Sep – 3 Okt</b> atau <b>31 Agu – 5 Sep</b>.<br>
    <b>📊 Cara baca persen:</b> tiap kategori (Hatsuhana, Grade A, Grade B, Reject) = % dari <b>total minggu itu sendiri</b> (Senin–Sabtu), jadi 4 kategori dalam satu minggu jumlahnya 100%. Total (Kg) = % dari total bulan. Reject = reject kebun (crack + poli + HPT), sama seperti total panen di rekap harian.<br>
    <b>🔮 Cara baca estimasi:</b> memakai tren linear dari rata-rata panen <b>per hari</b> tiap minggu, lalu dikali ${WEEK_LEN} hari.
    Jadi minggu yang baru terisi sebagian (misal baru 3 hari) tetap sebanding dan tidak menyeret angka turun.<br>
    Hari terisi per minggu → <b>${usedDays}</b>. Angka ini hanya perkiraan arah tren, bukan target panen.
  </div>`;
}

function weeklyDeltaText(d, isNew) {
  if (isNew) return '▲ baru';
  if (d === null || d === undefined) return '–';
  if (Math.abs(d) < 0.05) return '= 0.0%';
  return `${d > 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}% vs minggu lalu`;
}

function weeklyPctText(v, total, label) {
  if (total <= 0) return '0%';
  return `${(v / total * 100).toFixed(1)}% ${label}`;
}

function downloadWeeklyImage() {
  renderWeeklyPanen();
  const d = weeklyExportData;
  if (!d) { showToast('Belum ada data panen untuk bulan ini', 'error'); return; }
  const ghLabel = ghLabelOf(weekGh());

  const cols = [{ k: null, w: 78 }, { k: null, w: 158 }]
    .concat(WEEK_GRADES.map(g => ({ k: g.key, w: 172, label: g.label + ' (Kg)' })))
    .concat([{ k: 'total', w: 172, label: 'Total (Kg)' }]);
  const W = cols.reduce((a, c) => a + c.w, 0);
  const rowH = 64, headH = 34, topH = 86, noteH = 64;
  const rows = d.list;
  const H = topH + headH + rows.length * rowH + rowH + rowH + noteH;
  const sc = 2;
  const cv = document.createElement('canvas');
  cv.width = W * sc; cv.height = H * sc;
  const c = cv.getContext('2d');
  c.scale(sc, sc);
  const F = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  const txt = (t, x, y, o) => {
    o = o || {};
    c.font = `${o.b ? '700' : '400'} ${o.s || 12}px ${F}`;
    c.fillStyle = o.c || '#1a1a18';
    c.textAlign = o.a || 'left';
    c.textBaseline = 'middle';
    c.fillText(String(t), x, y);
  };
  const dcol = t => t.startsWith('▲') ? '#16a34a' : t.startsWith('▼') ? '#dc2626' : '#94a3b8';

  c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#2d5016'; c.fillRect(0, 0, W, topH);
  txt('Persebaran Panen per Minggu (Senin–Sabtu)', 16, 28, { b: 1, s: 18, c: '#fff' });
  txt(`${ghLabel} · ${formatBulanIndo(d.ym)} · Hatsuhana · Grade A · Grade B · Reject`, 16, 54, { s: 13, c: '#e2f0d9' });
  txt('PT. Agri Wangi Berry — Processing', 16, 72, { s: 11, c: '#bbd8a5' });

  let x = 0;
  c.fillStyle = '#e8f0e2'; c.fillRect(0, topH, W, headH);
  const heads = ['Minggu', 'Periode'].concat(cols.slice(2).map(z => z.label));
  cols.forEach((col, i) => {
    txt(heads[i], x + (i < 2 ? 10 : col.w / 2), topH + headH / 2, { b: 1, s: 12, c: '#2d5016', a: i < 2 ? 'left' : 'center' });
    x += col.w;
  });

  const drawRow = (y, label, periode, cells, bg, fg, sub) => {
    c.fillStyle = bg; c.fillRect(0, y, W, rowH);
    c.strokeStyle = '#e5e7eb'; c.beginPath(); c.moveTo(0, y + rowH); c.lineTo(W, y + rowH); c.stroke();
    let cx = 0;
    txt(label, 10, y + rowH / 2, { b: 1, s: 12, c: fg });
    cx += cols[0].w;
    periode.forEach((ln, i) => txt(ln, cx + 8, y + rowH / 2 + (i - (periode.length - 1) / 2) * 15, { s: 11, c: i ? sub : fg }));
    cx += cols[1].w;
    cells.forEach((cell, i) => {
      const col = cols[2 + i];
      const mid = cx + col.w / 2;
      txt(cell.kg, mid, y + 16, { b: 1, s: 14, c: fg, a: 'center' });
      txt(cell.pct, mid, y + 34, { s: 10.5, c: sub, a: 'center' });
      if (cell.delta) txt(cell.delta, mid, y + 50, { b: 1, s: 10.5, c: bg === '#0d9488' ? '#ccfbf1' : dcol(cell.delta), a: 'center' });
      cx += col.w;
    });
  };

  let y = topH + headH;
  rows.forEach((w, idx) => {
    const cells = WEEK_GRADES.map(g => ({
      kg: w[g.key].toFixed(2),
      pct: weeklyPctText(w[g.key], w.total, 'dari total minggu'),
      delta: weeklyDeltaText(w['d_' + g.key], w['dnew_' + g.key])
    }));
    cells.push({
      kg: w.total.toFixed(2),
      pct: weeklyPctText(w.total, d.totals.total, 'dari total bulan'),
      delta: weeklyDeltaText(w.d_total, w.dnew_total)
    });
    drawRow(y, `Minggu ${w.idx}`, [weekLabel(w), `${w.days} hari · ${w.daysWithData} terisi`], cells, idx % 2 ? '#f8faf7' : '#ffffff', '#1a1a18', '#64748b');
    y += rowH;
  });

  const tot = WEEK_GRADES.map(g => ({
    kg: d.totals[g.key].toFixed(2),
    pct: weeklyPctText(d.totals[g.key], d.totals.total, 'dari total bulan'), delta: ''
  }));
  tot.push({ kg: d.totals.total.toFixed(2), pct: '100.0% dari total bulan', delta: '' });
  drawRow(y, 'TOTAL', ['Seluruh minggu bulan ini'], tot, '#eff6ff', '#1e3a8a', '#64748b');
  y += rowH;

  const f = d.forecast;
  const fc = f.cats.concat([f.total]).map(z => ({ kg: z.est || '–', pct: z.pct || '', delta: z.delta || '' }));
  drawRow(y, 'Estimasi', ['Minggu berikutnya', `proyeksi ${WEEK_LEN} hari`], fc, '#0d9488', '#ffffff', '#ccfbf1');
  y += rowH;

  txt('Persen kategori = dari total minggu itu sendiri. Persen Total = dari total bulan. Reject = reject kebun.', 12, y + 18, { s: 10.5, c: '#64748b' });
  txt('Estimasi = tren linear rata-rata per hari × 6 hari, hanya perkiraan arah tren.', 12, y + 36, { s: 10.5, c: '#64748b' });
  txt('Dibuat ' + new Date().toLocaleString('id-ID'), 12, y + 52, { s: 10, c: '#94a3b8' });

  cv.toBlob(blob => {
    if (!blob) { showToast('Gagal membuat gambar', 'error'); return; }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `persebaran_panen_mingguan_${d.ym}_${ghLabel.replace(/\s/g, '').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    showToast('📸 Screenshot tersimpan');
  }, 'image/png');
}

function renderWeeklyChart(weeks) {
  const el = document.getElementById('chart-weekly');
  if (!el) return;
  if (!weeks.length || !weeks.some(w => w.daysWithData > 0)) {
    el.innerHTML = '<div style="text-align:center;color:#999;padding:2rem;">Belum ada data panen untuk grafik mingguan</div>';
    return;
  }
  const W = Math.max(560, weeks.length * 150);
  const H = 320;
  const padL = 58, padR = 20, padT = 24, padB = 92;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  let maxVal = 0;
  weeks.forEach(w => { maxVal = Math.max(maxVal, w.hatsu, w.gradeA, w.gradeB, w.reject); });
  maxVal = Math.ceil((maxVal || 1) * 1.18);
  const slotW = chartW / weeks.length;
  const barW = Math.min(22, slotW / 5.6);
  const groupW = barW * WEEK_GRADES.length + 4 * (WEEK_GRADES.length - 1);
  const mS = BULAN_SINGKAT;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" preserveAspectRatio="xMidYMid meet" style="min-width:${W}px;">`;
  for (let i = 0; i <= 4; i++) {
    const y = padT + chartH * i / 4;
    const val = maxVal * (1 - i / 4);
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e5e7eb"/>`;
    svg += `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#888">${val.toFixed(0)}</text>`;
  }
  weeks.forEach((w, i) => {
    const slotX = padL + chartW * i / weeks.length;
    const cx = slotX + slotW / 2;
    const x0 = cx - groupW / 2;
    WEEK_GRADES.forEach((g, gi) => {
      const val = w[g.key];
      const h = (val / maxVal) * chartH;
      const x = x0 + gi * (barW + 4);
      const y = padT + chartH - h;
      svg += `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(0, h)}" fill="${g.color}" rx="2"><title>Minggu ${w.idx} (${weekLabel(w)}) · ${g.label}: ${val.toFixed(2)} Kg</title></rect>`;
      if (val > 0) {
        svg += `<text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" font-size="8.5" fill="#555">${val.toFixed(0)}</text>`;
      }
    });
    svg += `<text x="${cx}" y="${H - padB + 18}" text-anchor="middle" font-size="11" font-weight="700" fill="#444">Minggu ${w.idx}</text>`;
    const label = (w.sm === w.em) ? `${w.sd}–${w.ed} ${mS[w.sm - 1]}` : `${w.sd} ${mS[w.sm - 1]}–${w.ed} ${mS[w.em - 1]}`;
    svg += `<text x="${cx}" y="${H - padB + 32}" text-anchor="middle" font-size="9.5" fill="#888">${label}</text>`;
    svg += `<text x="${cx}" y="${H - padB + 46}" text-anchor="middle" font-size="9" fill="#aaa">${w.daysWithData}/${w.days} hari</text>`;
  });
  svg += `<line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="#999"/>`;
  svg += `</svg>`;
  el.innerHTML = svg + `<div class="chart-legend">` +
    WEEK_GRADES.map(g => `<span><span class="dot" style="background:${g.color};"></span> ${g.label}</span>`).join('') +
    `</div>`;
}

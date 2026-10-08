// ========== DASHBOARD MIKA MODULE ==========
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

function setMikaBulanIni() {
  document.getElementById('mika-bulan').value = new Date().toISOString().substring(0, 7);
  renderMikaDashboard();
}

function renderMikaDashboard() {
  const bulanEl = document.getElementById('mika-bulan');
  if (!bulanEl) return;
  if (!bulanEl.value) bulanEl.value = new Date().toISOString().substring(0, 7);
  const month = bulanEl.value;
  document.getElementById('mika-period-info').innerHTML = `Menampilkan data: <b>${formatBulanIndo(month)}</b>`;
  const fmt = n => Number(n || 0).toLocaleString('id-ID');
  const cell = n => n < 0 ? `<span class="neg">${fmt(n)}</span>` : fmt(n);
  const timeline = computeMikaTimeline();
  const upToMonth = timeline.filter(x => x.tgl.substring(0, 7) <= month);
  const inMonth = timeline.filter(x => x.tgl.substring(0, 7) === month);
  const before = timeline.filter(x => x.tgl.substring(0, 7) < month);
  const opening = before.length ? before[before.length - 1] : null;
  const latest = upToMonth.length ? upToMonth[upToMonth.length - 1] : null;
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
  if (!inMonth.length) {
    body.innerHTML = '<tr><td colspan="14" style="text-align:center;color:#999;padding:1rem;">Belum ada data bulan ini</td></tr>';
    return;
  }
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
  if (opening) html += row('Stok awal bulan', opening, true);
  html += inMonth.map(x => row(x.tgl.substring(8) + '/' + x.tgl.substring(5, 7), x, false)).join('');
  body.innerHTML = html;
}

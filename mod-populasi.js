// ========== POPULASI TANAMAN & PRODUKTIVITAS ==========
// 1 record = jumlah tanaman 1 GH yang berlaku mulai tanggal tertentu: { id, gh, tgl, jumlah, ket }
function popDb() { return readArrayRaw(nativeStorage.getItem(POPULASI_STORAGE_KEY)); }
function popSaveDb(arr) { localStorage.setItem(POPULASI_STORAGE_KEY, JSON.stringify(arr)); }

// Jumlah tanaman GH pada tanggal tertentu (entri terakhir yang sudah berlaku; kalau belum ada, pakai entri paling awal)
function popAt(gh, date, list) {
  const arr = (list || popDb()).filter(x => x.gh === gh && x.tgl).sort((a, b) => a.tgl.localeCompare(b.tgl));
  if (!arr.length) return 0;
  let v = null;
  arr.forEach(x => { if (x.tgl <= date) v = Number(x.jumlah) || 0; });
  return v !== null ? v : (Number(arr[0].jumlah) || 0);
}

// Produktivitas periode: gram panen per tanaman (populasi = rata-rata pada hari-hari yang ada panennya)
function mgProduktivitas(start, end) {
  const pop = popDb();
  if (!pop.length) return null;
  const list = readArrayRaw(nativeStorage.getItem(PANEN_STORAGE_KEY)).filter(x => x.tgl && x.tgl >= start && x.tgl <= end && x.gh !== 'GLOBAL');
  const acc = { 'GH 1': { panen: 0, layak: 0, popByDate: {} }, 'GH 2': { panen: 0, layak: 0, popByDate: {} } };
  list.forEach(x => {
    const g = ghOf(x);
    if (!acc[g]) return;
    const n = k => Number(x[k]) || 0;
    const layak = n('p_hatsu') + n('p_gradea') + n('p_gradeb');
    const rk = n('rk_crack') + n('rk_poli') + n('rk_hpt');
    acc[g].panen += layak + rk;
    acc[g].layak += layak;
    if (layak + rk > 0) acc[g].popByDate[x.tgl] = popAt(g, x.tgl, pop);
  });
  const fin = a => {
    const ds = Object.keys(a.popByDate);
    const p = ds.length ? ds.reduce((s, d) => s + a.popByDate[d], 0) / ds.length : 0;
    return { panen: a.panen, layak: a.layak, pop: p, gpt: p > 0 ? a.panen * 1000 / p : 0, gptLayak: p > 0 ? a.layak * 1000 / p : 0 };
  };
  const g1 = fin(acc['GH 1']), g2 = fin(acc['GH 2']);
  const use = [g1, g2].filter(g => g.pop > 0 && g.panen > 0);
  const tp = use.reduce((s, g) => s + g.pop, 0), tpn = use.reduce((s, g) => s + g.panen, 0), tl = use.reduce((s, g) => s + g.layak, 0);
  const all = { panen: tpn, layak: tl, pop: tp, gpt: tp > 0 ? tpn * 1000 / tp : 0, gptLayak: tp > 0 ? tl * 1000 / tp : 0 };
  return { g1, g2, all };
}

// ---------- Form ----------
function popSimpan() {
  const gh = document.getElementById('pop-gh').value;
  const tgl = document.getElementById('pop-tgl').value;
  const jumlah = parseInt(document.getElementById('pop-jumlah').value, 10);
  const ket = (document.getElementById('pop-ket').value || '').trim();
  if (!tgl) { showToast('Isi tanggal berlaku dulu', 'error'); return; }
  if (!jumlah || jumlah <= 0) { showToast('Isi jumlah tanaman', 'error'); return; }
  const db = popDb();
  const editId = document.getElementById('pop-edit-id').value;
  let idx = editId ? db.findIndex(x => String(x.id) === String(editId)) : db.findIndex(x => x.gh === gh && x.tgl === tgl);
  const rec = { id: idx >= 0 ? db[idx].id : generateId(), gh, tgl, jumlah, ket };
  if (idx >= 0) db[idx] = rec; else db.push(rec);
  popSaveDb(db);
  popResetForm();
  showToast('✅ Jumlah tanaman tersimpan');
  renderPopulasi();
}

function popResetForm() {
  document.getElementById('pop-edit-id').value = '';
  document.getElementById('pop-jumlah').value = '';
  document.getElementById('pop-ket').value = '';
  const b = document.getElementById('pop-btn-batal'); if (b) b.style.display = 'none';
  const s = document.getElementById('pop-btn-simpan'); if (s) s.textContent = '💾 Simpan';
}

function popEdit(id) {
  const rec = popDb().find(x => String(x.id) === String(id));
  if (!rec) return;
  document.getElementById('pop-edit-id').value = rec.id;
  document.getElementById('pop-gh').value = rec.gh;
  document.getElementById('pop-tgl').value = rec.tgl;
  document.getElementById('pop-jumlah').value = rec.jumlah;
  document.getElementById('pop-ket').value = rec.ket || '';
  const b = document.getElementById('pop-btn-batal'); if (b) b.style.display = 'inline-flex';
  const s = document.getElementById('pop-btn-simpan'); if (s) s.textContent = '💾 Simpan Perubahan';
  const d = document.getElementById('pop-details'); if (d) d.open = true;
}

function popHapus(id) {
  if (!confirm('Hapus data jumlah tanaman ini?')) return;
  popSaveDb(popDb().filter(x => String(x.id) !== String(id)));
  showToast('🗑️ Data dihapus');
  renderPopulasi();
}

// ---------- Tampilan ----------
function renderPopulasi() {
  const body = document.getElementById('pop-result');
  if (!body) return;
  const tglEl = document.getElementById('pop-tgl');
  if (tglEl && !tglEl.value) tglEl.value = mgYmd(new Date());
  const dariEl = document.getElementById('dashboard-dari'), sampaiEl = document.getElementById('dashboard-sampai');
  const pop = popDb();

  // daftar entri
  const list = document.getElementById('pop-list');
  if (list) {
    const sorted = pop.slice().sort((a, b) => a.gh.localeCompare(b.gh) || b.tgl.localeCompare(a.tgl));
    list.innerHTML = sorted.length ? sorted.map(x => `<tr>
      <td><b>${mgEsc(x.gh)}</b></td><td>${mgShort(x.tgl)}/${x.tgl.substring(0, 4)}</td><td style="text-align:right;">${mgN(x.jumlah, 0)}</td><td style="font-size:0.8rem;color:#666;">${mgEsc(x.ket || '')}</td>
      <td style="white-space:nowrap;"><button class="btn btn-sm btn-secondary" onclick="popEdit('${x.id}')">✏</button> <button class="btn btn-sm btn-danger" onclick="popHapus('${x.id}')">🗑️</button></td></tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:#999;">Belum ada data jumlah tanaman</td></tr>';
  }
  const det = document.getElementById('pop-details');
  if (det && !det.dataset.init) { det.dataset.init = '1'; det.open = !pop.length; }

  if (!dariEl || !sampaiEl || !dariEl.value || !sampaiEl.value) return;
  let dari = dariEl.value, sampai = sampaiEl.value;
  if (dari > sampai) { const t = dari; dari = sampai; sampai = t; }
  const P = mgProduktivitas(dari, sampai);
  if (!P) {
    body.innerHTML = '<div class="info-box">Isi dulu <b>jumlah tanaman</b> tiap GH di bagian bawah kartu ini, lalu produktivitas (gram per tanaman) akan muncul otomatis.</div>';
    return;
  }
  // per bulan (dipakai untuk rata-rata & grafik)
  const months = [];
  let cur = new Date(dari.substring(0, 7) + '-01T12:00:00');
  const endM = sampai.substring(0, 7);
  while (mgYmd(cur).substring(0, 7) <= endM && months.length < 24) { months.push(mgYmd(cur).substring(0, 7)); cur.setMonth(cur.getMonth() + 1); }
  const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const mLabels = [], m1 = [], m2 = [], mAll = [];
  let partialLast = false;
  months.forEach((m, i) => {
    const [y, mo] = m.split('-').map(Number);
    const ms = m + '-01', me = m + '-' + String(new Date(y, mo, 0).getDate()).padStart(2, '0');
    const r = mgProduktivitas(ms < dari ? dari : ms, me > sampai ? sampai : me);
    const partial = (ms < dari) || (me > sampai);
    if (partial && i === months.length - 1) partialLast = true;
    mLabels.push(MN[mo - 1] + (partial && i === months.length - 1 ? '*' : ''));
    m1.push(r && r.g1.gpt > 0 ? r.g1.gpt : null);
    m2.push(r && r.g2.gpt > 0 ? r.g2.gpt : null);
    mAll.push(r && r.all.gpt > 0 ? r.all.gpt : null);
  });
  const avgOf = arr => { const v = arr.filter(x => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
  const perBulan = { 'GH 1': avgOf(m1), 'GH 2': avgOf(m2), 'Gabungan': avgOf(mAll) };
  const lastIdx = months.length - 1;
  const lastVal = { 'GH 1': m1[lastIdx], 'GH 2': m2[lastIdx], 'Gabungan': mAll[lastIdx] };

  const cols = [['GH 1', P.g1], ['GH 2', P.g2]].filter(([n, g]) => g.panen > 0 || g.pop > 0);
  if (cols.length > 1) cols.push(['Gabungan', P.all]);
  const td = (t, b) => `<td style="padding:7px 8px;text-align:right;border-bottom:1px solid #e2e8f0;${b ? 'font-weight:800;' : ''}">${t}</td>`;
  const tdl = t => `<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;">${t}</td>`;
  const th = t => `<th style="padding:7px 8px;text-align:right;background:#f8fafc;color:#64748b;font-size:0.8rem;border-bottom:2px solid #e2e8f0;">${t}</th>`;
  const row = (lbl, f, b) => `<tr>${tdl(lbl)}${cols.map(([n, g], i) => td(f(g, n), b || (i === cols.length - 1 && cols.length > 1))).join('')}</tr>`;
  const noPop = cols.filter(([n, g]) => g.panen > 0 && !(g.pop > 0)).map(([n]) => n);
  let html = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.9rem;"><thead><tr><th style="background:#f8fafc;border-bottom:2px solid #e2e8f0;"></th>${cols.map(([n]) => th(n)).join('')}</tr></thead><tbody>
    ${row('Panen total (kg)', g => mgN(g.panen))}
    ${row('Layak jual: Hatsu + A + B (kg)', g => mgN(g.layak))}
    ${row('Jumlah tanaman (rata-rata)', g => g.pop > 0 ? mgN(g.pop, 0) : '–')}
    ${months.length >= 2 ? row('Rata-rata per bulan (gram/tanaman)', (g, n) => perBulan[n] > 0 ? mgN(perBulan[n], 1) : '–', true) : ''}
    ${row(months.length >= 2 ? 'Bulan terakhir (gram/tanaman)' + (partialLast ? '*' : '') : 'Produktivitas (gram/tanaman)', (g, n) => months.length >= 2 ? (lastVal[n] > 0 ? mgN(lastVal[n], 1) : '–') : (g.gpt > 0 ? mgN(g.gpt, 1) : '–'), months.length < 2)}
    ${row('Akumulasi seluruh periode (gram/tanaman)', g => g.gpt > 0 ? mgN(g.gpt, 1) : '–')}
    ${row('Layak jual, akumulasi (gram/tanaman)', g => g.gptLayak > 0 ? mgN(g.gptLayak, 1) : '–')}
    </tbody></table></div>`;
  if (noPop.length) html += `<div class="warn-box" style="margin-top:0.5rem;">Jumlah tanaman ${noPop.join(' & ')} belum diisi, jadi produktivitasnya belum bisa dihitung.</div>`;

  if (months.length >= 2) {
    const series = [{ name: 'GH 1', color: MG.GH1, values: m1 }];
    if (m2.some(v => v !== null)) series.push({ name: 'GH 2', color: MG.GH2, values: m2 });
    html += `<div style="margin-top:0.9rem;font-weight:700;font-size:0.9rem;">Produktivitas per bulan (gram/tanaman)</div>` + mgLineChart(mLabels, series, { dec: 0 });
  }
  html += '<small style="color:#666;display:block;margin-top:0.4rem;">Panen total = grade Hatsu + A + B + reject kebun. Jumlah tanaman memakai data yang berlaku pada tiap hari panen. <b>Per bulan</b> = hasil satu bulan kalender; <b>akumulasi</b> = jumlah seluruh periode di Pengaturan (makin panjang periodenya makin besar, tidak bisa dibandingkan antar periode berbeda panjang). ' + (partialLast ? '* = bulan berjalan belum penuh, angkanya masih bertambah. ' : '') + 'Mengikuti periode di Pengaturan.</small>';
  body.innerHTML = html;
}

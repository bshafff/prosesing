// ========== PRESENTASI DIVISI PROSESING ==========
// Slide 1280x720 dibuat otomatis dari data aplikasi sesuai filter tanggal. Teks bisa diedit, gambar bisa ditempel,
// bisa tampil layar penuh (presentasi), simpan PNG per slide, atau unduh PPTX (satu slide = satu gambar, seperti presentasi IPM).
const PS = { slides: [], cur: 0, EDIT: {}, IMG: {}, KEY: '' };
const PS_C = { OLIVE: '#4b5a2b', HATSU: '#dc2626', A: '#16a34a', B: '#ea580c', REJ: '#64748b', GH1: '#2563eb', GH2: '#ea580c', INK: '#1f2937', MUTE: '#6b7280', LINE: '#e5e7eb' };
const PS_CAUSES = [['crack', 'Cracking', '#dc2626'], ['poli', 'Polinasi', '#ea580c'], ['hpt', 'HPT', '#f59e0b'], ['bruise', 'Bruise', '#84cc16'], ['overripe', 'Overripe', '#0891b2'], ['kuning', 'Buah Kuning', '#eab308'], ['frozen', 'Frozen <11 gr', '#7c3aed'], ['albino', 'Albino', '#db2777']];
const $ps = id => document.getElementById(id);

// ---------- Tanggal ----------
function psDow(s) { return (mgParse(s).getDay() + 6) % 7; } // 0 = Senin
function psDayMonth(s) { const d = mgParse(s); return d.getDate() + ' ' + MG_BULAN[d.getMonth()]; }

function psPreset(kind) {
  const today = mgYmd(new Date());
  let a, b;
  if (kind === 'hari') { a = b = today; }
  else if (kind === 'w0' || kind === 'w-1') { const mon = mgAdd(mgMonday(today), kind === 'w-1' ? -7 : 0); a = mon; b = mgAdd(mon, 5); }
  else if (kind === '2w') { const mon = mgMonday(today); a = mgAdd(mon, -7); b = mgAdd(mon, 5); }
  else if (kind === 'm-1') { const d = new Date(); const f = new Date(d.getFullYear(), d.getMonth() - 1, 1), l = new Date(d.getFullYear(), d.getMonth(), 0); a = mgYmd(f); b = mgYmd(l); }
  else { const d = new Date(); a = mgYmd(new Date(d.getFullYear(), d.getMonth(), 1)); b = mgYmd(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }
  $ps('ps-from').value = a; $ps('ps-to').value = b;
  psRender();
}

// ---------- Agregasi data ----------
function psZero() { return { ph: 0, pa: 0, pb: 0, rk: 0, rp: 0, kh: 0, ka: 0, kb: 0, rejKirim: 0, pack: 0, pkH: 0, pkA: 0, pkB: 0, c: { crack: 0, poli: 0, hpt: 0, bruise: 0, overripe: 0, kuning: 0, frozen: 0, albino: 0 } }; }
function psAdd(t, x, alk) {
  const n = k => Number(x[k]) || 0;
  const rk = n('rk_crack') + n('rk_poli') + n('rk_hpt');
  const rp = n('rp_crack') + n('rp_poli') + n('rp_hpt') + n('rp_bruise') + n('rp_overripe') + n('rp_kuning') + n('rp_frozen') + n('rp_albino');
  t.ph += n('p_hatsu'); t.pa += n('p_gradea'); t.pb += n('p_gradeb'); t.rk += rk; t.rp += rp;
  t.kh += n('k_hatsu'); t.ka += n('k_a11'); t.kb += n('k_a15');
  t.pkH += n('m_hatsu'); t.pkA += n('m_a11'); t.pkB += n('m_a15'); t.pack += n('m_hatsu') + n('m_a11') + n('m_a15');
  t.rejKirim += n('k_frozen') + n('k_rfresh') + (alk ? alk.k_frozen + alk.k_rfresh : 0);
  t.c.crack += n('rk_crack') + n('rp_crack'); t.c.poli += n('rk_poli') + n('rp_poli'); t.c.hpt += n('rk_hpt') + n('rp_hpt');
  t.c.bruise += n('rp_bruise'); t.c.overripe += n('rp_overripe'); t.c.kuning += n('rp_kuning'); t.c.frozen += n('rp_frozen'); t.c.albino += n('rp_albino');
}
function psSum(a, b) { const t = psZero(); [a, b].forEach(s => { ['ph', 'pa', 'pb', 'rk', 'rp', 'kh', 'ka', 'kb', 'rejKirim', 'pack', 'pkH', 'pkA', 'pkB'].forEach(k => { t[k] += s[k]; }); Object.keys(t.c).forEach(k => { t.c[k] += s.c[k]; }); }); return t; }
function psDerive(t) {
  t.panen = t.ph + t.pa + t.pb + t.rk; t.layak = t.ph + t.pa + t.pb; t.rej = t.rk + t.rp;
  t.kirimGrade = t.kh + t.ka + t.kb; t.kirim = t.kirimGrade + t.rejKirim;
  t.rateRej = t.panen > 0 ? t.rej / t.panen * 100 : 0; t.rateKirim = t.panen > 0 ? t.kirim / t.panen * 100 : 0;
  return t;
}

// Total GH 1, GH 2, gabungan + data per hari. Reject Fresh/Frozen global dibagi ke GH (buildAlokasiGlobal).
function psAgg(start, end) {
  const all = readArrayRaw(nativeStorage.getItem(PANEN_STORAGE_KEY));
  const alok = buildAlokasiGlobal(all);
  const T = { g1: psZero(), g2: psZero(), glob: 0, tamu: 0 };
  const days = {};
  all.filter(x => x.tgl && x.tgl >= start && x.tgl <= end).forEach(x => {
    const d = days[x.tgl] || (days[x.tgl] = { g1: psZero(), g2: psZero(), glob: 0 });
    if (x.gh === 'GLOBAL') { const r = (Number(x.k_frozen) || 0) + (Number(x.k_rfresh) || 0); T.glob += r; d.glob += r; T.tamu += (Number(x.t_curah) || 0) + (Number(x.t_hatsu) || 0) + (Number(x.t_a11) || 0) + (Number(x.t_a15) || 0); return; }
    const g = ghOf(x) === 'GH 2' ? 'g2' : (ghOf(x) === 'GH 1' ? 'g1' : null);
    if (!g) return;
    const a = alok(x);
    psAdd(T[g], x, a); psAdd(d[g], x, a);
  });
  T.all = psSum(T.g1, T.g2); // reject global sudah terbagi ke GH; sisanya (hari tanpa data GH) ditambahkan di bawah
  [T.g1, T.g2, T.all].forEach(psDerive);
  // reject global yang tidak terbagi (hari tanpa panen GH): ikut di gabungan
  const rawGlobal = T.glob; let allocated = 0;
  all.filter(x => x.tgl && x.tgl >= start && x.tgl <= end && x.gh !== 'GLOBAL').forEach(x => { const a = alok(x); allocated += a.k_frozen + a.k_rfresh; });
  T.all.rejKirim += Math.max(0, rawGlobal - allocated); psDerive(T.all);
  T.days = days;
  return T;
}

// Kelompokkan per hari (<= 14 hari) atau per minggu Senin–Sabtu
function psBuckets(T, start, end) {
  const dates = Object.keys(T.days).sort();
  const len = mgDaysBetween(start, end);
  const daily = len <= 14;
  const map = new Map();
  dates.forEach(d => {
    const key = daily ? d : mgMonday(d);
    const b = map.get(key) || { key, g1: psZero(), g2: psZero(), days: new Set() };
    b.g1 = psSum(b.g1, T.days[d].g1); b.g2 = psSum(b.g2, T.days[d].g2);
    const has = psDerive(psSum(T.days[d].g1, T.days[d].g2)).panen > 0;
    if (has) b.days.add(d);
    map.set(key, b);
  });
  const out = [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map(b => {
    b.all = psDerive(psSum(b.g1, b.g2)); psDerive(b.g1); psDerive(b.g2);
    if (daily) {
      b.l1 = mgShort(b.key); b.l2 = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][psDow(b.key)]; b.l3 = '';
    } else {
      const sat = mgAdd(b.key, 5); const wk = Math.ceil(mgParse(b.key).getDate() / 7);
      b.l1 = 'Minggu ' + wk; b.l2 = mgParse(b.key).getDate() + '–' + mgParse(sat).getDate() + ' ' + MG_BULAN[mgParse(sat).getMonth()]; b.l3 = b.days.size + '/6 hari';
    }
    return b;
  });
  return { list: out, daily };
}

// ---------- Komponen visual (SVG / HTML) ----------
function psEsc(s) { return mgEsc(s); }
function psBars(buckets, w, h) {
  const n = buckets.length;
  if (!n) return '<div class="ps-note">Belum ada data</div>';
  const series = [['Hatsuhana', PS_C.HATSU, b => b.all.ph], ['Grade A', PS_C.A, b => b.all.pa], ['Grade B', PS_C.B, b => b.all.pb], ['Reject Kebun', PS_C.REJ, b => b.all.rk]];
  const L = 56, R = 12, T = 22, B = 66;
  const maxV = Math.max(1, ...buckets.flatMap(b => series.map(s => s[2](b))));
  const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v))); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : m <= 7.5 ? 7.5 : 10) * p; };
  const max = nice(maxV * 1.1);
  const slot = (w - L - R) / n, bw = Math.min(46, slot / 5.2);
  const y = v => T + (h - T - B) * (1 - v / max);
  let svg = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block;font-family:Arial,Helvetica,sans-serif;">`;
  for (let g = 0; g <= 4; g++) { const yy = y(max * g / 4); svg += `<line x1="${L}" y1="${yy}" x2="${w - R}" y2="${yy}" stroke="#e5e7eb"/><text x="${L - 8}" y="${yy + 5}" font-size="14" fill="#6b7280" text-anchor="end">${mgN(max * g / 4, 0)}</text>`; }
  buckets.forEach((b, i) => {
    const cx = L + slot * (i + 0.5), x0 = cx - (series.length * bw + (series.length - 1) * 4) / 2;
    series.forEach((s, k) => {
      const v = s[2](b), x = x0 + k * (bw + 4);
      svg += `<rect x="${x}" y="${y(v)}" width="${bw}" height="${Math.max(0, y(0) - y(v))}" fill="${s[1]}" rx="2"/>`;
      if (n <= 6) svg += `<text x="${x + bw / 2}" y="${y(v) - 6}" font-size="${n <= 3 ? 17 : 14}" fill="#374151" text-anchor="middle">${mgN(v, 0)}</text>`;
    });
    svg += `<text x="${cx}" y="${h - 40}" font-size="${n <= 6 ? 19 : 15}" font-weight="700" fill="#111827" text-anchor="middle">${psEsc(b.l1)}</text>`;
    svg += `<text x="${cx}" y="${h - 21}" font-size="${n <= 6 ? 15 : 12}" fill="#6b7280" text-anchor="middle">${psEsc(b.l2)}</text>`;
    if (b.l3) svg += `<text x="${cx}" y="${h - 4}" font-size="${n <= 6 ? 14 : 11}" fill="#9ca3af" text-anchor="middle">${psEsc(b.l3)}</text>`;
  });
  svg += '</svg>';
  const leg = `<div class="ps-leg">${series.map(s => `<span><i style="background:${s[1]}"></i>${s[0]}</span>`).join('')}<span style="color:#9ca3af">(kg)</span></div>`;
  return svg + leg;
}

function psDonut(items, total, size) {
  const sw = size * 0.2, r = size / 2 - sw / 2 - 4, cx = size / 2, cy = size / 2;
  let acc = -Math.PI / 2, svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="font-family:Arial,Helvetica,sans-serif;">`;
  if (total <= 0) svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="${sw}"/>`;
  items.forEach(it => {
    if (it.v <= 0) return;
    const frac = it.v / total, a2 = acc + frac * 2 * Math.PI;
    if (frac >= 0.9999) svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${it.color}" stroke-width="${sw}"/>`;
    else {
      const x1 = cx + r * Math.cos(acc), y1 = cy + r * Math.sin(acc), x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      svg += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x2} ${y2}" fill="none" stroke="${it.color}" stroke-width="${sw}"/>`;
    }
    acc = a2;
  });
  svg += `<text x="${cx}" y="${cy - 6}" font-size="15" fill="#6b7280" text-anchor="middle" font-weight="700">TOTAL REJECT</text><text x="${cx}" y="${cy + 26}" font-size="34" fill="#dc2626" text-anchor="middle" font-weight="800">${mgN(total, 2)}</text><text x="${cx}" y="${cy + 48}" font-size="15" fill="#6b7280" text-anchor="middle">Kg</text></svg>`;
  return svg;
}

// ---------- Slide ----------
function psSlideHtml(title, inner) {
  return `<div class="ps-sl"><div class="ps-side"></div><img class="ps-leafR" src="./assets/leaf.png"><img class="ps-leafL" src="./assets/leaf.png"><img class="ps-logo" src="./assets/logo.png"><img class="ps-straw" src="./assets/strawberry.png"><div class="ps-hr"></div><div class="ps-ttl">${psEsc(title)}</div><div class="ps-ct">${inner}</div><div class="ps-nx">→</div></div>`;
}
function psEd(k, html, cls, ph) { const v = PS.EDIT[k] !== undefined ? PS.EDIT[k] : html; return `<div class="ps-ed ${cls || ''}" contenteditable="true" data-k="${k}" data-ph="${psEsc(ph || '')}">${v}</div>`; }
function psSlot(k, w, h, hint) {
  const img = PS.IMG[k];
  return `<div class="ps-imgslot ${img ? 'has' : ''}" data-k="${k}" style="width:${w}px;height:${h}px;">${img ? `<img src="${img}"><span class="ps-rm" data-rm="1">✕</span>` : `<div class="ps-ph">🖼️ ${psEsc(hint || 'Gambar')}<br><small>klik untuk pilih, atau arahkan kursor lalu Ctrl+V</small></div>`}</div>`;
}
function psDelta(cur, prev) {
  if (!(prev > 0)) return '<span style="color:#9ca3af">belum ada pembanding</span>';
  const d = (cur - prev) / prev * 100;
  if (Math.abs(d) < 0.05) return '<span style="color:#6b7280">= periode sebelumnya</span>';
  return `<span style="color:${d >= 0 ? '#166534' : '#b91c1c'};font-weight:700;">${d >= 0 ? '▲' : '▼'} ${mgN(Math.abs(d), 1)}%</span> <span style="color:#6b7280">vs periode sebelumnya</span>`;
}
function psDeltaPoin(cur, prev, goodUp) {
  if (prev === null || prev === undefined) return '<span style="color:#9ca3af">belum ada pembanding</span>';
  const d = cur - prev;
  if (Math.abs(d) < 0.005) return '<span style="color:#6b7280">= periode sebelumnya</span>';
  const good = (d > 0) === goodUp;
  return `<span style="color:${good ? '#166534' : '#b91c1c'};font-weight:700;">${d > 0 ? '▲' : '▼'} ${mgN(Math.abs(d), 2)} poin</span> <span style="color:#6b7280">vs periode sebelumnya</span>`;
}

function psBuildSlides(a, b) {
  const len = mgDaysBetween(a, b), pb = mgAdd(a, -1), pa = mgAdd(pb, -(len - 1));
  const T = psAgg(a, b), P = psAgg(pa, pb), A = T.all, PA = P.all;
  const target = parseFloat(localStorage.getItem('awb_mgmt_target') || '10') || 10;
  const hy = mgHyoshii(a, b), phy = mgHyoshii(pa, pb);
  const PR = typeof mgProduktivitas === 'function' ? mgProduktivitas(a, b) : null;
  const PPR = typeof mgProduktivitas === 'function' ? mgProduktivitas(pa, pb) : null;
  const periode = mgLong(a) + (a === b ? '' : ' – ' + mgLong(b));
  const per = `<div class="ps-per">Periode: ${periode}</div>`;
  const S = [];
  if (A.panen <= 0) return [['Presentasi Prosesing', `<div class="ps-note" style="font-size:26px;padding:80px 20px;">Belum ada data panen pada periode<br><b>${periode}</b></div>`]];
  const bk = psBuckets(T, a, b);

  // 1. Ringkasan kinerja
  const rr = A.rateRej, rrCls = rr <= target ? 'ok' : (rr <= target * 1.25 ? 'wp' : 'aw');
  const hasProd = !!(PR && PR.all.pop > 0);
  const kb = (lab, val, sub, cls) => `<td class="ps-kbc"><div class="ps-kb"><small>${lab}</small><b class="${cls || ''}">${val}</b><span>${sub}</span></div></td>`;
  S.push(['Ringkasan Kinerja', `<table class="ps-kp"><tr>
    ${kb('Total Panen', mgN(A.panen) + ' <em>kg</em>', psDelta(A.panen, PA.panen))}
    ${kb('Terkirim', mgP(A.rateKirim), mgN(A.kirimGrade) + ' kg grade + ' + mgN(A.rejKirim) + ' kg reject')}
    ${kb('Reject Rate', mgP(rr, 2), (rr <= target ? 'Sesuai target' : 'Di atas target') + ' ≤ ' + mgN(target, 0) + '% · tanpa HPT ' + mgP((A.rej - A.c.hpt) / A.panen * 100, 2), 'c-' + rrCls)}
    </tr><tr>
    ${kb('Diterima Hyoshii', hy ? mgP(hy.pct, 2) : '–', hy ? mgN(hy.recv.total) + ' dari ' + mgN(hy.sent.total) + ' kg dikirim' : 'belum ada data Hyoshii')}
    ${kb('Produktivitas', hasProd ? mgN(PR.all.gpt, 1) + ' <em>g/tanaman</em>' : '–', hasProd ? psDelta(PR.all.gpt, PPR && PPR.all.gpt) : 'isi jumlah tanaman di dashboard')}
    ${kb('Pack Terkirim', mgN(A.pack, 0), 'dari ' + Object.keys(T.days).filter(d => psDerive(psSum(T.days[d].g1, T.days[d].g2)).panen > 0).length + ' hari panen')}
    </tr></table>${per}`]);

  // 2. Alur panen sampai Hyoshii
  const bar = (lab, val, w, color, sub) => `<div class="ps-fl"><div class="ps-fl-l">${lab}</div><div class="ps-fl-b"><div style="width:${Math.max(2, w)}%;background:${color};"></div></div><div class="ps-fl-v">${val}<small>${sub || ''}</small></div></div>`;
  const pctOf = v => A.panen > 0 ? v / A.panen * 100 : 0;
  let flow = bar('Panen total', mgN(A.panen) + ' kg', 100, '#4b5a2b', 'grade + reject kebun')
    + bar('Layak jual', mgN(A.layak) + ' kg', pctOf(A.layak), '#16a34a', mgP(pctOf(A.layak)) + ' dari panen')
    + bar('Dikemas', mgN(A.kirimGrade) + ' kg', pctOf(A.kirimGrade), '#0891b2', mgN(A.pack, 0) + ' pack')
    + bar('Dikirim ke Hyoshii', mgN(A.kirim) + ' kg', pctOf(A.kirim), '#2563eb', mgP(A.rateKirim) + ' dari panen · termasuk reject ' + mgN(A.rejKirim) + ' kg');
  if (hy) flow += bar('Diterima Hyoshii', mgN(hy.recv.total) + ' kg', pctOf(hy.recv.total / (hy.sent.total || 1) * A.kirim), '#7c3aed', mgP(hy.pct, 2) + ' dari yang dikirim · ' + mgN(hy.recv.pTotal, 0) + ' pack');
  else flow += bar('Diterima Hyoshii', '–', 2, '#d1d5db', 'belum ada data Hyoshii');
  // Kurangnya ke mana? (panen total -> dikirim). Teks bisa diedit langsung di slide.
  const gap = A.panen - A.kirim, tamu = T.tamu || 0;
  const rkHpt = (() => { let v = 0; readArrayRaw(nativeStorage.getItem(PANEN_STORAGE_KEY)).forEach(x => { if (x.tgl && x.tgl >= a && x.tgl <= b && x.gh !== 'GLOBAL') v += Number(x.rk_hpt) || 0; }); return v; })();
  const rpHpt = Math.max(0, A.c.hpt - rkHpt);
  const rpNet = A.rp - A.rejKirim;
  const rest = gap - A.rk - rpNet - tamu;
  const sg = v => (v < 0 ? '−' : '') + mgN(Math.abs(v)) + ' kg';
  const why = `<div class="ps-why"><div class="ps-why-h">Kurangnya ke mana? Panen total → dikirim: selisih ${sg(gap)}</div>
    <div class="ps-why-r">• <b>Reject kebun</b> ${sg(A.rk)} <small>(termasuk HPT ${sg(rkHpt)})</small></div>
    <div class="ps-why-r">• <b>Reject prosesing</b> ${sg(A.rp)} <small>(termasuk HPT ${sg(rpHpt)}), dikurangi reject yang ikut dikirim ${sg(A.rejKirim)}</small></div>
    <div class="ps-why-r">• <b>Tamu / sampel</b> ${sg(tamu)}</div>
    <div class="ps-why-r">• <b>${rest < 0 ? 'Kelebihan (selisih stok antar-hari / pembulatan)' : 'Belum terjelaskan (loss / penimbangan)'}</b> ${sg(rest)}</div></div>`;
  const hyLine = hy ? `Dikirim vs diterima Hyoshii: ${(hy.recv.total - hy.sent.total >= 0 ? '+' : '−') + mgN(Math.abs(hy.recv.total - hy.sent.total))} kg · pack ${(hy.recv.pTotal - hy.sent.pTotal >= 0 ? '+' : '−') + mgN(Math.abs(hy.recv.pTotal - hy.sent.pTotal), 0)} · reject Hyoshii ${hy.recv.rjTotal} pack.` : '';
  S.push(['Alur Panen sampai Hyoshii', `<div class="ps-flow">${flow}</div>${why}${hyLine ? `<div class="ps-fn">${hyLine}</div>` : ''}${per}`]);

  // 3. Persebaran panen
  const rowsT = bk.list.map((x, i) => {
    const prev = bk.list[i - 1];
    const dl = prev && prev.all.panen > 0 ? (x.all.panen - prev.all.panen) / prev.all.panen * 100 : null;
    return `<tr><td>${psEsc(x.l1)}${x.l2 ? ' <small>' + psEsc(x.l2) + '</small>' : ''}</td><td class="r"><b>${mgN(x.all.panen)}</b></td><td class="r" style="color:${dl === null ? '#9ca3af' : (dl >= 0 ? '#166534' : '#b91c1c')}">${dl === null ? '–' : (dl >= 0 ? '▲ ' : '▼ ') + mgN(Math.abs(dl), 1) + '%'}</td><td class="r">${mgP(x.all.rateKirim)}</td><td class="r">${mgP(x.all.rateRej, 2)}</td></tr>`;
  });
  const showRows = rowsT.slice(-5).join('');
  S.push(['Persebaran Panen Farm AWB', `${psBars(bk.list.slice(-8), 892, 268)}<table class="ps-t sm" style="margin-top:4px;"><thead><tr><th>${bk.daily ? 'Hari' : 'Minggu'}</th><th class="r">Panen (kg)</th><th class="r">vs sebelumnya</th><th class="r">% Terkirim</th><th class="r">Reject Rate</th></tr></thead><tbody>${showRows}</tbody></table>`]);

  // 4. Recap panen & breakdown reject
  const g = (lab, ph, kk, pk, color) => `<tr><td style="color:${color};font-weight:700;">${lab}</td><td class="r">${mgN(ph)}</td><td class="r">${kk === null ? '–' : mgN(kk)}</td><td class="r">${kk === null || !(ph > 0) ? '–' : mgP(kk / ph * 100)}</td><td class="r">${pk === null ? '–' : mgN(pk, 0)}</td></tr>`;
  const recap = `<table class="ps-t sm"><thead><tr><th>Grade</th><th class="r">Panen (kg)</th><th class="r">Kirim (kg)</th><th class="r">% Kirim</th><th class="r">Pack</th></tr></thead><tbody>
    ${g('Hatsuhana', A.ph, A.kh, A.pkH, PS_C.HATSU)}${g('Grade A', A.pa, A.ka, A.pkA, PS_C.A)}${g('Grade B', A.pb, A.kb, A.pkB, PS_C.B)}
    ${g('Reject Kebun', A.rk, null, null, '#dc2626')}${g('Reject dikirim (Fresh/Frozen)', 0, A.rejKirim, null, '#7c3aed')}
    <tr class="tot"><td>TOTAL</td><td class="r">${mgN(A.panen)}</td><td class="r">${mgN(A.kirim)}</td><td class="r">${mgP(A.rateKirim)}</td><td class="r">${mgN(A.pack, 0)}</td></tr></tbody></table>`;
  const donutItems = PS_CAUSES.map(c => ({ name: c[1], color: c[2], v: A.c[c[0]] })).filter(i => i.v > 0).sort((x, y) => y.v - x.v);
  const legend = donutItems.map(i => `<div class="ps-lg"><i style="background:${i.color}"></i>${i.name}<b>${mgN(i.v)} kg</b><span>${mgP(A.rej > 0 ? i.v / A.rej * 100 : 0, 0)}</span></div>`).join('');
  const rateBox = (lab, v, cls) => `<div class="ps-rb ${cls}"><small>${lab}</small><b>${v}</b></div>`;
  S.push(['Recap Panen & Breakdown', `${recap}<table class="ps-two" style="margin-top:14px;"><tr><td style="width:270px;">${psDonut(donutItems, A.rej, 240)}</td><td style="padding-top:6px;">${legend}</td><td style="width:230px;">${rateBox('Reject Kebun', mgN(A.rk) + ' kg', 'g')}${rateBox('Reject Prosesing', mgN(A.rp) + ' kg', 'r')}${rateBox('Reject Rate', mgP(rr, 2), 'o')}</td></tr></table>`]);

  // 5. Breakdown reject per bulan (hanya kalau periode melewati >1 bulan)
  const months = [...new Set(Object.keys(T.days).map(d => d.substring(0, 7)))].sort();
  if (months.length >= 2) {
    const mrows = months.map(m => {
      const gg = { g1: psZero(), g2: psZero() };
      Object.keys(T.days).filter(d => d.startsWith(m)).forEach(d => { gg.g1 = psSum(gg.g1, T.days[d].g1); gg.g2 = psSum(gg.g2, T.days[d].g2); });
      const mm = Number(m.substring(5, 7));
      const cell = t => { psDerive(t); if (t.panen <= 0) return '<td colspan="2" class="c" style="color:#9ca3af">–</td>'; const top = PS_CAUSES.map(c => ({ n: c[1], v: t.c[c[0]] })).filter(x => x.v > 0).sort((x, y) => y.v - x.v).slice(0, 2); return `<td class="r"><b>${mgN(t.rej)} kg</b><br><small>${mgP(t.rateRej, 1)}</small></td><td>${top.map((x, i) => `${i + 1}. ${x.n} <small>(${mgP(t.rej > 0 ? x.v / t.rej * 100 : 0, 0)})</small>`).join('<br>')}</td>`; };
      return `<tr><td><b>${MG_BULAN[mm - 1]} ${m.substring(0, 4)}</b></td>${cell(gg.g1)}${cell(gg.g2)}</tr>`;
    }).join('');
    S.push(['Breakdown Reject per Bulan', `<table class="ps-t"><thead><tr><th>Bulan</th><th class="r" colspan="1">GH 1 Reject</th><th>Masalah Utama GH 1</th><th class="r">GH 2 Reject</th><th>Masalah Utama GH 2</th></tr></thead><tbody>${mrows}</tbody></table>${per}`]);
  }

  // 6. Tren reject per penyebab (GH 1 vs GH 2)
  if (bk.list.length >= 2) {
    const labels = bk.list.map(x => x.l1 + (bk.daily ? '' : ''));
    const charts = PS_CAUSES.filter(c => bk.list.some(x => x.g1.c[c[0]] + x.g2.c[c[0]] > 0)).slice(0, 6).map(c => {
      const v1 = bk.list.map(x => x.g1.panen > 0 ? x.g1.c[c[0]] / x.g1.panen * 100 : null), v2 = bk.list.map(x => x.g2.panen > 0 ? x.g2.c[c[0]] / x.g2.panen * 100 : null);
      const series = [{ name: 'GH 1', color: PS_C.GH1, values: v1 }]; if (v2.some(v => v !== null)) series.push({ name: 'GH 2', color: PS_C.GH2, values: v2 });
      return `<td class="ps-mc"><div class="ps-mct">Tren Reject ${c[1]} (% panen)</div>${mgLineChart(labels, series, { dec: 1, fs: 1.5 })}</td>`;
    });
    let rowsH = ''; for (let i = 0; i < charts.length; i += 3) rowsH += '<tr>' + charts.slice(i, i + 3).join('') + (charts.slice(i, i + 3).length < 3 ? '<td></td>'.repeat(3 - charts.slice(i, i + 3).length) : '') + '</tr>';
    S.push(['Tren Reject per Penyebab', `<table class="ps-mcg">${rowsH}</table>`]);
  }

  // 7. Pengiriman ke Hyoshii
  if (hy) {
    const R = hy.recv, Sn = hy.sent;
    const sel = (r, s, d) => { const v = r - s; return `<td class="r" style="font-weight:700;color:${v < 0 ? '#b91c1c' : (v > 0 ? '#166534' : '#6b7280')}">${(v > 0 ? '+' : '') + mgN(v, d)}</td>`; };
    const kr = (n, s, r, bold) => `<tr${bold ? ' class="tot"' : ''}><td>${n}</td><td class="r">${mgN(s)}</td><td class="r">${mgN(r)}</td>${sel(r, s, 2)}</tr>`;
    const pr = (n, s, r, rj, bold) => `<tr${bold ? ' class="tot"' : ''}><td>${n}</td><td class="r">${mgN(s, 0)}</td><td class="r">${mgN(r, 0)}</td>${sel(r, s, 0)}<td class="r">${rj ? mgN(rj, 0) : '–'}</td></tr>`;
    const chart = hy.byDate.length >= 2 ? (() => { const vals = hy.byDate.map(x => x.pct); const lo = Math.max(0, Math.floor(Math.min(...vals) - 1)), hi = Math.max(100, Math.ceil(Math.max(...vals))); return `<div class="ps-mct">Tren % diterima Hyoshii</div>` + mgLineChart(hy.byDate.map(x => mgShort(x.tgl)), [{ name: '% diterima', color: '#4b5a2b', values: vals }], { min: lo, max: hi, dec: 1, fs: 1.2 }); })() : '';
    const ket = hy.ket.length ? `<div class="ps-mct">Keterangan reject</div><ul class="ps-ul">${hy.ket.slice(-4).map(k => `<li><b>${mgShort(k.tgl)}</b> ${psEsc(k.ket)}</li>`).join('')}</ul>` : '<div class="ps-note" style="padding:6px 0;">Tidak ada keterangan reject.</div>';
    S.push(['Pengiriman ke Hyoshii', `<table class="ps-two"><tr><td style="width:430px;vertical-align:top;"><table class="ps-t sm"><thead><tr><th>Berat (kg)</th><th class="r">Kirim</th><th class="r">Diterima</th><th class="r">Selisih</th></tr></thead><tbody>${kr('Hatsuhana', Sn.hatsu, R.hatsu)}${kr('Grade A', Sn.a11, R.a11)}${kr('Grade B', Sn.a15, R.a15)}${kr('Reject', Sn.reject, R.reject)}${kr('Total', Sn.total, R.total, true)}</tbody></table></td>
      <td style="vertical-align:top;padding-left:16px;"><table class="ps-t sm"><thead><tr><th>Pack</th><th class="r">Kirim</th><th class="r">Diterima</th><th class="r">Selisih</th><th class="r">Reject</th></tr></thead><tbody>${pr('Hatsuhana', Sn.pHatsu, R.pHatsu, R.rjHatsu)}${pr('Grade A', Sn.pA11, R.pA11, R.rjA11)}${pr('Grade B', Sn.pA15, R.pA15, R.rjA15)}${pr('Total', Sn.pTotal, R.pTotal, R.rjTotal, true)}</tbody></table></td></tr></table>
      <table class="ps-two" style="margin-top:8px;"><tr><td style="width:440px;vertical-align:top;">${chart}</td><td style="vertical-align:top;padding-left:16px;">${ket}</td></tr></table>`]);
  } else {
    S.push(['Pengiriman ke Hyoshii', `<div class="ps-note" style="font-size:24px;padding:60px 10px;">Belum ada data “Diterima Hyoshii” pada periode ini.<br><small>Isi lewat menu Diterima Hyoshii di aplikasi.</small></div>${per}`]);
  }

  // 8. Pemakaian kemasan
  S.push(['Pemakaian Kemasan', psKemasanSlide(a, b) + per]);

  // 9. Catatan & tindak lanjut
  S.push(['Catatan & Tindak Lanjut', `<table class="ps-two"><tr>
    <td><div class="ps-apb"><span class="ps-pill">Temuan</span>${psEd('temuan', '', 'ps-big', 'Klik untuk menulis temuan…')}</div></td>
    <td><div class="ps-apb"><span class="ps-pill ps-pill2">Tindak Lanjut</span>${psEd('tl', '', 'ps-big', 'Klik untuk menulis tindak lanjut…')}</div></td></tr></table>`]);

  // 10. Dokumentasi
  S.push(['Dokumentasi', `<table class="ps-two"><tr><td>${psSlot('doc1', 280, 400, 'Foto 1')}</td><td>${psSlot('doc2', 280, 400, 'Foto 2')}</td><td>${psSlot('doc3', 280, 400, 'Foto 3')}</td></tr></table>`]);
  return S;
}

function psKemasanSlide(a, b) {
  const db = readArrayRaw(nativeStorage.getItem(KEMASAN_STORAGE_KEY)).filter(e => e.tgl && e.tgl >= a && e.tgl <= b);
  if (!db.length) return '<div class="ps-note" style="font-size:24px;padding:60px 10px;">Belum ada data kemasan pada periode ini.</div>';
  const acc = {}; masterJenisKemasan.forEach(m => { acc[m.name] = { masuk: 0, bongkar: 0, kirim: 0, tamu: 0, rej: 0 }; });
  const aks = { layer: { masuk: 0, pakai: 0 }, sleeve: { masuk: 0, pakai: 0 }, stiker: { masuk: 0, pakai: 0 }, netfoam: { masuk: 0, pakai: 0 } };
  db.forEach(e => (e.items || []).forEach(it => {
    const n = k => Number(it[k]) || 0;
    if (acc[it.name]) { acc[it.name].masuk += n('masuk'); acc[it.name].bongkar += n('bongkarDus'); acc[it.name].kirim += n('kirim'); acc[it.name].tamu += n('tamu'); acc[it.name].rej += rejMika(it); }
    aks.layer.masuk += n('layerMasukDus'); aks.layer.pakai += n('layerPakai');
    aks.sleeve.masuk += n('sleeveMasukDus'); aks.sleeve.pakai += n('sleevePakai');
    aks.stiker.masuk += (it.stikerMasukLembar != null ? n('stikerMasukLembar') : n('stikerMasuk')); aks.stiker.pakai += n('stikerPakai');
    aks.netfoam.masuk += n('netfoamMasukBall'); aks.netfoam.pakai += n('netfoamPakai');
  }));
  try { recalculateStockKemasan(); } catch (e) { /* abaikan */ }
  const st = currentStockStateKemasan || {}, ak = currentAksesoris || {};
  const f0 = v => mgN(v, 0);
  const mrows = masterJenisKemasan.map(m => { const x = acc[m.name], s = st[m.name] || { gudang: 0, processing: 0 }; return `<tr><td><b>Mika ${m.name}</b></td><td class="r">${f0(x.masuk)}</td><td class="r">${f0(x.kirim)}</td><td class="r">${f0(x.tamu)}</td><td class="r" style="color:#b91c1c">${f0(x.rej)}</td><td class="r">${f0(s.gudang)}</td><td class="r">${f0(s.processing)}</td></tr>`; }).join('');
  const arow = (nm, unit, x, s1, s2) => `<tr><td><b>${nm}</b></td><td class="r">${f0(x.masuk)} <small>${unit}</small></td><td class="r">${f0(x.pakai)}</td><td class="r">${f0(s1)}</td><td class="r">${f0(s2)}</td></tr>`;
  const a1 = ak.layer || {}, a2 = ak.sleeve || {}, a3 = ak.stiker || {}, a4 = ak.netfoam || {};
  return `<table class="ps-t sm"><thead><tr><th>Mika</th><th class="r">Masuk gudang (dus)</th><th class="r">Terpakai kirim (pcs)</th><th class="r">Tamu (pcs)</th><th class="r">Reject (pcs)</th><th class="r">Stok gudang (dus)</th><th class="r">Stok processing (pcs)</th></tr></thead><tbody>${mrows}</tbody></table>
    <table class="ps-t sm" style="margin-top:14px;"><thead><tr><th>Aksesoris</th><th class="r">Masuk periode</th><th class="r">Terpakai (pcs)</th><th class="r">Stok gudang</th><th class="r">Stok processing (pcs)</th></tr></thead><tbody>
    ${arow('Layer', 'dus', aks.layer, a1.gudang, a1.proc)}${arow('Sleeve', 'dus', aks.sleeve, a2.gudang, a2.proc)}${arow('Stiker', 'lembar', aks.stiker, a3.gudang, a3.proc)}${arow('Netfoam', 'ball', aks.netfoam, a4.ball, a4.proc)}</tbody></table>
    <div class="ps-fn">Stok = kondisi saat ini (bukan akhir periode). Gudang dalam dus/lembar/ball sesuai jenis, processing dalam pcs.</div>`;
}

// ---------- Semua teks slide bisa diedit ----------
// Setiap blok teks diberi kunci urut (slide + urutan). Hasil edit disimpan bersama teks aslinya;
// kalau data berubah (teks asli beda), edit lama diabaikan supaya angka tidak basi.
function psBlockChild(c) { return c.nodeType === 1 && (['DIV', 'TABLE', 'TBODY', 'THEAD', 'TFOOT', 'TR', 'TD', 'TH', 'UL', 'OL', 'LI', 'IMG', 'P'].includes(c.tagName) || c.tagName.toLowerCase() === 'svg'); }
function psWalk(node, fn) {
  if (node.nodeType !== 1 || node.tagName.toLowerCase() === 'svg') return;
  const cl = node.classList;
  if (cl.contains('ps-ed') || cl.contains('ps-imgslot') || cl.contains('ps-nx')) return;
  if (node.textContent.trim() && ![...node.children].some(psBlockChild)) { fn(node); return; }
  [...node.children].forEach(c => psWalk(c, fn));
}
function psAutoEdit() {
  const saved = PS.EDIT._a || {};
  $ps('ps-deck').querySelectorAll('.ps-item').forEach((it, si) => {
    let n = 0;
    const sl = it.querySelector('.ps-sl');
    ['.ps-ttl', '.ps-ct'].forEach(sel => { const root = sl.querySelector(sel); if (root) psWalk(root, el => {
      const key = 'a' + si + '_' + (n++);
      el.setAttribute('data-ak', key); el.setAttribute('data-orig', el.innerHTML);
      el.setAttribute('contenteditable', 'true'); el.setAttribute('spellcheck', 'false');
      const sv = saved[key]; if (sv && sv.o === el.innerHTML) el.innerHTML = sv.h;
    }); });
  });
}

// ---------- Render & tampilan ----------
let psPost = [];
function psRender() {
  let a = $ps('ps-from').value, b = $ps('ps-to').value;
  if (!a || !b) return;
  if (a > b) { [a, b] = [b, a]; $ps('ps-from').value = a; $ps('ps-to').value = b; }
  try { localStorage.setItem('ps_from', a); localStorage.setItem('ps_to', b); } catch (e) { /* abaikan */ }
  PS.KEY = a + '|' + b;
  try { PS.EDIT = JSON.parse(localStorage.getItem('pedit:' + PS.KEY) || '{}') || {}; } catch (e) { PS.EDIT = {}; }
  PS.IMG = {};
  ['doc1', 'doc2', 'doc3'].forEach(k => { try { const v = localStorage.getItem('pimg:' + PS.KEY + ':' + k); if (v) PS.IMG[k] = v; } catch (e) { /* abaikan */ } });
  try { PS.slides = psBuildSlides(a, b); } catch (err) { console.error(err); $ps('ps-deck').innerHTML = '<div class="card" style="text-align:center;color:#b91c1c;">Gagal membuat slide: ' + psEsc(err.message) + '</div>'; return; }
  $ps('ps-deck').innerHTML = PS.slides.map((s, i) => `<div class="ps-item" data-i="${i}"><div class="ps-cap"><span>Slide ${i + 1} · ${psEsc(s[0])}</span><button class="btn btn-sm btn-secondary" onclick="psSavePng(${i})">📷 PNG</button></div><div class="ps-sw">${psSlideHtml(s[0], s[1])}</div></div>`).join('');
  psAutoEdit();
  psFit();
}

function psFit() {
  const deck = $ps('ps-deck'); if (!deck) return;
  const pres = deck.classList.contains('pres');
  const avail = Math.min(innerWidth, 1000) - 24;
  deck.querySelectorAll('.ps-item').forEach(it => {
    const sw = it.querySelector('.ps-sw'), sl = it.querySelector('.ps-sl');
    const s = pres ? Math.min(innerWidth / 1280, innerHeight / 720) : Math.min(1, avail / 1280);
    sw.style.width = 1280 * s + 'px'; sw.style.height = 720 * s + 'px'; sl.style.transform = 'scale(' + s + ')';
  });
}
addEventListener('resize', () => { try { psFit(); } catch (e) { /* abaikan */ } });

function psShowCur() { $ps('ps-deck').querySelectorAll('.ps-item').forEach((it, i) => it.classList.toggle('act', i === PS.cur)); }
function psStart() {
  const dk = $ps('ps-deck'); dk.classList.add('pres'); PS.cur = 0; psShowCur();
  (dk.requestFullscreen || dk.webkitRequestFullscreen || function () { }).call(dk);
  psFit();
}
function psEnd() {
  const dk = $ps('ps-deck'); dk.classList.remove('pres');
  dk.querySelectorAll('.ps-item').forEach(i => i.classList.remove('act'));
  psFit(); if (document.fullscreenElement) document.exitFullscreen();
}
document.addEventListener('fullscreenchange', () => { const dk = $ps('ps-deck'); if (dk && !document.fullscreenElement && dk.classList.contains('pres')) psEnd(); });
document.addEventListener('keydown', e => {
  const dk = $ps('ps-deck'); if (!dk || !dk.classList.contains('pres')) return;
  if (e.key === 'Escape') { psEnd(); return; }
  if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { PS.cur = Math.min(PS.slides.length - 1, PS.cur + 1); psShowCur(); e.preventDefault(); }
  if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { PS.cur = Math.max(0, PS.cur - 1); psShowCur(); e.preventDefault(); }
});

function psResetEdits() {
  if (!confirm('Kembalikan semua teks slide periode ini ke teks asli (hasil edit manual dihapus)?')) return;
  delete PS.EDIT._a;
  try { localStorage.setItem('pedit:' + PS.KEY, JSON.stringify(PS.EDIT)); } catch (e) { /* abaikan */ }
  psRender(); psToast('Teks dikembalikan ke asli');
}
function psToast(m) { const t = $ps('ps-toast'); if (!t) return; t.textContent = m; t.style.display = 'block'; clearTimeout(psToast._t); psToast._t = setTimeout(() => { t.style.display = 'none'; }, 2600); }

// ---------- Edit teks & gambar ----------
let psCurSlot = null, psPick = null;
document.addEventListener('click', e => {
  const dk = $ps('ps-deck'); if (!dk || !dk.contains(e.target)) return;
  if (dk.classList.contains('pres')) { const x = e.clientX / innerWidth; PS.cur = x > .5 ? Math.min(PS.slides.length - 1, PS.cur + 1) : Math.max(0, PS.cur - 1); psShowCur(); return; }
  const s = e.target.closest('.ps-imgslot'); if (!s) return;
  if (e.target.dataset.rm) { delete PS.IMG[s.dataset.k]; try { localStorage.removeItem('pimg:' + PS.KEY + ':' + s.dataset.k); } catch (x) { /* abaikan */ } psRefreshSlot(s.dataset.k); return; }
  psPick = s.dataset.k; $ps('ps-file').value = ''; $ps('ps-file').click();
});
document.addEventListener('input', e => {
  const ak = e.target.closest && e.target.closest('[data-ak]');
  if (ak && $ps('ps-deck') && $ps('ps-deck').contains(ak)) {
    PS.EDIT._a = PS.EDIT._a || {};
    PS.EDIT._a[ak.dataset.ak] = { o: ak.getAttribute('data-orig'), h: ak.innerHTML };
    try { localStorage.setItem('pedit:' + PS.KEY, JSON.stringify(PS.EDIT)); } catch (x) { /* abaikan */ }
    return;
  }
  const el = e.target.closest && e.target.closest('.ps-ed'); if (!el || !$ps('ps-deck') || !$ps('ps-deck').contains(el)) return;
  PS.EDIT[el.dataset.k] = el.innerHTML;
  try { localStorage.setItem('pedit:' + PS.KEY, JSON.stringify(PS.EDIT)); } catch (x) { /* abaikan */ }
});
document.addEventListener('mouseover', e => { const s = e.target.closest && e.target.closest('.ps-imgslot'); if (s) psCurSlot = s.dataset.k; });
document.addEventListener('paste', e => {
  const dk = $ps('ps-deck'); if (!dk || !dk.offsetParent) return;
  const ed = e.target.closest && e.target.closest('.ps-ed,[data-ak]');
  const cd = e.clipboardData; if (!cd) return;
  const img = [...cd.items].find(i => i.type.startsWith('image/'));
  if (ed && !img) { e.preventDefault(); document.execCommand('insertText', false, cd.getData('text/plain')); return; }
  if (!img) return;
  let k = psCurSlot; if (!k) { const emp = dk.querySelector('.ps-imgslot:not(.has)'); k = emp && emp.dataset.k; }
  if (!k) { psToast('Arahkan kursor ke kotak gambar dulu'); return; }
  e.preventDefault(); psPutImg(k, img.getAsFile());
});
function psFileChosen() { const fl = $ps('ps-file').files[0]; if (fl && psPick) psPutImg(psPick, fl); }
function psPutImg(k, file) {
  const r = new FileReader();
  r.onload = () => { const im = new Image(); im.onload = () => {
    const m = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * m; c.height = im.height * m;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
    PS.IMG[k] = c.toDataURL('image/jpeg', .85);
    try { localStorage.setItem('pimg:' + PS.KEY + ':' + k, PS.IMG[k]); } catch (err) { psToast('Gambar tampil, tapi penyimpanan perangkat penuh (tidak tersimpan permanen)'); }
    psRefreshSlot(k);
  }; im.src = r.result; };
  r.readAsDataURL(file);
}
function psRefreshSlot(k) {
  document.querySelectorAll('.ps-imgslot[data-k="' + k + '"]').forEach(el => {
    const w = parseInt(el.style.width, 10), h = parseInt(el.style.height, 10);
    const ph = el.querySelector('.ps-ph'); const hint = ph ? ph.innerHTML.split('<br>')[0].replace('🖼️ ', '') : 'Gambar';
    const tmp = document.createElement('div'); tmp.innerHTML = psSlot(k, w, h, hint); el.replaceWith(tmp.firstElementChild);
  });
}

// ---------- Ekspor ----------
function psLoadScript(src, test) {
  return new Promise((resolve, reject) => {
    if (test()) return resolve();
    const s = document.createElement('script'); s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error('Gagal memuat library. Cek koneksi internet.'));
    document.head.appendChild(s);
  });
}
async function psSnap(i, scale) {
  await psLoadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', () => typeof html2canvas !== 'undefined');
  const el = $ps('ps-deck').querySelectorAll('.ps-item')[i].querySelector('.ps-sl');
  return html2canvas(el, { scale, backgroundColor: '#ffffff', useCORS: true, logging: false, onclone: doc => {
    doc.querySelectorAll('.ps-sw').forEach(w => { w.style.width = '1280px'; w.style.height = '720px'; w.style.overflow = 'visible'; w.style.boxShadow = 'none'; w.style.borderRadius = '0'; });
    doc.querySelectorAll('.ps-sl').forEach(s => { s.style.transform = 'none'; });
    doc.querySelectorAll('.ps-imgslot .ps-ph,.ps-imgslot .ps-rm').forEach(p => { p.style.display = 'none'; });
    doc.querySelectorAll('.ps-imgslot:not(.has)').forEach(p => { p.style.border = 'none'; p.style.background = 'transparent'; });
    doc.querySelectorAll('.ps-ed').forEach(p => { p.style.background = 'transparent'; });
    const st = doc.createElement('style'); st.textContent = '.ps-ed:empty::before{content:none!important}[data-ak]{background:transparent!important;outline:none!important}'; doc.head.appendChild(st);
  } });
}
async function psSavePng(i) {
  try {
    const cv = await psSnap(i, 2);
    const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'Prosesing-slide-' + String(i + 1).padStart(2, '0') + '.png';
    document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { psToast('Gagal membuat gambar: ' + e.message); }
}
async function psExportPptx() {
  const dk = $ps('ps-deck'); if (dk.classList.contains('pres')) psEnd();
  const btn = $ps('ps-btn-pptx'), old = btn.textContent; btn.disabled = true;
  try {
    await psLoadScript('https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js', () => typeof PptxGenJS !== 'undefined');
    const pres = new PptxGenJS(); pres.layout = 'LAYOUT_WIDE'; pres.title = 'Presentasi Prosesing AWB'; pres.company = 'PT. Agri Wangi Berry';
    for (let i = 0; i < PS.slides.length; i++) {
      btn.textContent = '⏳ Slide ' + (i + 1) + '/' + PS.slides.length;
      const cv = await psSnap(i, 1.5);
      pres.addSlide().addImage({ data: cv.toDataURL('image/jpeg', .92), x: 0, y: 0, w: 13.333, h: 7.5 });
    }
    await pres.writeFile({ fileName: 'Prosesing-AWB-' + $ps('ps-from').value + '_sd_' + $ps('ps-to').value + '.pptx' });
  } catch (e) { psToast('Gagal membuat PPTX: ' + e.message); }
  finally { btn.disabled = false; btn.textContent = old; }
}

function initPresentasi() {
  const f = $ps('ps-from'), t = $ps('ps-to');
  if (!f || !t) return;
  if (!f.value) {
    const sf = localStorage.getItem('ps_from'), st = localStorage.getItem('ps_to');
    if (sf && st) { f.value = sf; t.value = st; psRender(); } else psPreset('w-1');
  }
}

// ========== REKAP PANEN MODULE ==========
let panenCurrentPage = 1;
const PANEN_PER_PAGE = 10;

// STATE UNTUK MENYIMPAN KETIKAN FORM PER GH
let panenFormData = { 'GH 1': {}, 'GH 2': {}, 'GLOBAL': {} };

function saveCurrentFormToState() {
  const currentGh = document.getElementById('panen-gh').value;
  const formData = {};
  document.querySelectorAll('#panen input[type="number"], #panen input[type="text"]').forEach(input => {
    if (input.id && input.id !== 'panen-tgl') {
      formData[input.id] = input.value;
    }
  });
  panenFormData[currentGh] = formData;
}

function loadFormFromState(gh) {
  const formData = panenFormData[gh] || {};
  document.querySelectorAll('#panen input[type="number"], #panen input[type="text"]').forEach(input => {
    if (input.id && input.id !== 'panen-tgl') {
      input.value = formData[input.id] || '';
    }
  });
}

function setPanenGh(gh, btn) {
  // 1. Simpan ketikan dari tab yang sedang aktif
  saveCurrentFormToState();

  // 2. Ubah nilai hidden input
  const ghInput = document.getElementById('panen-gh');
  if (ghInput) ghInput.value = gh;

  // 3. Ubah class tab active
  const tabs = document.querySelectorAll('#panen-gh-tabs .gh-tab');
  tabs.forEach(t => t.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    tabs.forEach(t => {
      if (t.textContent.includes(gh === 'GLOBAL' ? 'Global' : gh)) t.classList.add('active');
    });
  }

  // 4. Munculkan ketikan dari tab yang dituju
  loadFormFromState(gh);

  // 5. Sesuaikan tampilan form & hitung ulang
  toggleFormPanen();
}

function toggleFormPanen() {
  const gh = document.getElementById('panen-gh').value;
  const formGh = document.getElementById('form-khusus-gh');
  const formGlobal = document.getElementById('form-global');
  
  if (gh === 'GLOBAL') {
    formGh.style.display = 'none';
    formGlobal.style.display = 'block';
  } else {
    formGh.style.display = 'block';
    formGlobal.style.display = 'none';
  }
  hitungAllPanen();
}

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

  const totalKirim = getValP('k-hatsu') + getValP('k-a11') + getValP('k-a15');
  const rateKirim = totalPanen > 0 ? (totalKirim / totalPanen * 100) : 0;
  document.getElementById('calc-total-kirim').textContent = totalKirim.toFixed(2) + ' Kg';
  document.getElementById('calc-rate-kirim').textContent = rateKirim.toFixed(2) + '%';

  const totalMika = parseInt(document.getElementById('m-hatsu').value || 0) + parseInt(document.getElementById('m-a11').value || 0) + parseInt(document.getElementById('m-a15').value || 0);
  document.getElementById('calc-total-mika').textContent = totalMika + ' Pcs';

  document.getElementById('calc-total-frozen-global').textContent = getValP('k-frozen').toFixed(2) + ' Kg';
}

// ========== FORMAT WA ==========
function formatTanggalPanjang(ymd) {
  if (!ymd) return '-';
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${parseInt(parts[2], 10)} ${bulan[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
}

function fmtKg(n) { return (parseFloat(n) || 0).toFixed(2).replace('.', ','); }
function fmtInt(n) { return String(parseInt(n, 10) || 0); }

function generateWATextFromItem(item) {
  const tgl = item.tgl || '';
  const tglFmt = formatTanggalPanjang(tgl);
  const ghLabel = item.gh === 'GLOBAL' ? ' (Global)' : ' (' + item.gh + ')';

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
  
  if (item.gh === 'GLOBAL') {
    t += `*Data Global (Frozen & Tamu)*\n*${tglFmt}*\n\n`;
    t += `Total Frozen : ${fmtKg(k_frozen)} kg\n\n`;
    t += `Tamu Curah : ${fmtKg(item.t_curah)} kg\n`;
    t += `Tamu Hatsu : ${fmtInt(item.t_hatsu)} pcs\n`;
    t += `Tamu A11 : ${fmtInt(item.t_a11)} pcs\n`;
    t += `Tamu A15 : ${fmtInt(item.t_a15)} pcs\n`;
    if (item.t_ket) t += `Ket: ${item.t_ket}\n`;
    return t;
  }

  t += `*Data Panen${ghLabel}*\n*${tglFmt}*\n\n`;
  t += `Hatsuhana : ${fmtKg(p_hatsu)} kg\n`;
  t += `Grade A : ${fmtKg(p_gradea)} kg\n`;
  t += `Grade B : ${fmtKg(p_gradeb)} kg\n`;
  t += `*Total Grade* : ${fmtKg(totalGradePanen)} kg\n\n`;
  t += `Reject : ${fmtKg(rkTotal)} kg\n`;
  t += `*Total Panen* : ${fmtKg(totalPanen)} kg\n\n`;

  t += `*Data Pengiriman${ghLabel}*\n*${tglFmt}*\n\n`;
  t += `*Berat*\n`;
  t += `Hatsuhana : ${fmtKg(k_hatsu)} kg\n`;
  t += `Grade A : ${fmtKg(k_a11)} kg\n`;
  t += `Grade B : ${fmtKg(k_a15)} kg\n`;
  t += `*Total Grade* : ${fmtKg(totalGradeKirim)} kg\n\n`;

  t += `*Pack*\n`;
  t += `Hatsuhana : ${fmtInt(m_hatsu)}\n`;
  t += `Grade A : ${fmtInt(m_a11)}\n`;
  t += `Grade B : ${fmtInt(m_a15)}\n`;
  t += `*Total Pack*: ${fmtInt(totalPack)}\n\n`;

  t += `*Data Reject Harian${ghLabel}*\n*${tglFmt}*\n\n`;
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
    gh: document.getElementById('panen-gh').value,
    p_hatsu: getValP('p-hatsu'), p_gradea: getValP('p-gradea'), p_gradeb: getValP('p-gradeb'),
    rk_crack: getValP('rk-crack'), rk_poli: getValP('rk-poli'), rk_hpt: getValP('rk-hpt'),
    rp_crack: getValP('rp-crack'), rp_poli: getValP('rp-poli'), rp_hpt: getValP('rp-hpt'),
    rp_bruise: getValP('rp-bruise'), rp_overripe: getValP('rp-overripe'), rp_kuning: getValP('rp-kuning'), rp_frozen: getValP('rp-frozen'),
    k_hatsu: getValP('k-hatsu'), k_a11: getValP('k-a11'), k_a15: getValP('k-a15'), k_frozen: getValP('k-frozen'),
    m_hatsu: parseInt(document.getElementById('m-hatsu').value || 0, 10),
    m_a11: parseInt(document.getElementById('m-a11').value || 0, 10),
    m_a15: parseInt(document.getElementById('m-a15').value || 0, 10),
    t_curah: getValP('t-curah'), t_hatsu: parseInt(document.getElementById('t-hatsu').value || 0), 
    t_a11: parseInt(document.getElementById('t-a11').value || 0), t_a15: parseInt(document.getElementById('t-a15').value || 0),
    t_ket: document.getElementById('t-ket').value
  };
  return generateWATextFromItem(item);
}

function openWAModal() {
  const tgl = document.getElementById('panen-tgl').value;
  if (!tgl) { showToast('Isi tanggal panen dulu!', 'error'); return; }
  const text = generateWAText();
  document.getElementById('wa-text-preview').value = text;
  document.getElementById('modal-wa').classList.add('show');
}

function openWAModalFromHistory(id) {
  const db = JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]');
  const item = db.find(x => String(x.id) === String(id));
  if (!item) { showToast('Data tidak ditemukan', 'error'); return; }
  const text = generateWATextFromItem(item);
  document.getElementById('wa-text-preview').value = text;
  document.getElementById('modal-wa').classList.add('show');
}

function closeWAModal() { document.getElementById('modal-wa').classList.remove('show'); }

async function copyWAText() {
  const ta = document.getElementById('wa-text-preview');
  try {
    await navigator.clipboard.writeText(ta.value);
    showToast('✅ Tersalin! Buka WA & paste.');
  } catch (err) {
    ta.select(); document.execCommand('copy');
    showToast('✅ Tersalin!');
  }
}

// ========== FORMAT GRAFIK (CANVAS) ==========
let generatedGraphicBlob = null;

function openGraphicModal() {
  const tgl = document.getElementById('panen-tgl').value;
  if (!tgl) { showToast('Isi tanggal panen dulu!', 'error'); return; }
  
  const gh = document.getElementById('panen-gh').value;
  if (gh === 'GLOBAL') { showToast('Format Grafik hanya untuk GH 1 & GH 2', 'error'); return; }

  const item = {
    tgl: tgl,
    gh: gh,
    p_hatsu: getValP('p-hatsu'), p_gradea: getValP('p-gradea'), p_gradeb: getValP('p-gradeb'),
    rk_crack: getValP('rk-crack'), rk_poli: getValP('rk-poli'), rk_hpt: getValP('rk-hpt'),
    rp_crack: getValP('rp-crack'), rp_poli: getValP('rp-poli'), rp_hpt: getValP('rp-hpt'),
    rp_bruise: getValP('rp-bruise'), rp_overripe: getValP('rp-overripe'), rp_kuning: getValP('rp-kuning'), rp_frozen: getValP('rp-frozen'),
    k_hatsu: getValP('k-hatsu'), k_a11: getValP('k-a11'), k_a15: getValP('k-a15'),
    m_hatsu: parseInt(document.getElementById('m-hatsu').value || 0, 10),
    m_a11: parseInt(document.getElementById('m-a11').value || 0, 10),
    m_a15: parseInt(document.getElementById('m-a15').value || 0, 10)
  };

  const dataURL = generateGraphicCanvas(item);
  document.getElementById('grafik-preview-img').src = dataURL;
  
  fetch(dataURL).then(res => res.blob()).then(blob => {
    generatedGraphicBlob = blob;
  });

  document.getElementById('modal-grafik').classList.add('show');
}

function openGraphicModalFromHistory(id) {
  const db = JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]');
  const item = db.find(x => String(x.id) === String(id));
  if (!item) { showToast('Data tidak ditemukan', 'error'); return; }
  if (item.gh === 'GLOBAL') { showToast('Format Grafik hanya untuk GH 1 & GH 2', 'error'); return; }

  const dataURL = generateGraphicCanvas(item);
  document.getElementById('grafik-preview-img').src = dataURL;
  
  fetch(dataURL).then(res => res.blob()).then(blob => {
    generatedGraphicBlob = blob;
  });

  document.getElementById('modal-grafik').classList.add('show');
}

function closeGraphicModal() {
  document.getElementById('modal-grafik').classList.remove('show');
  generatedGraphicBlob = null;
}

function downloadGraphic() {
  if (!generatedGraphicBlob) return;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(generatedGraphicBlob);
  link.download = `Laporan_Panen_${new Date().getTime()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  showToast('📸 Gambar berhasil disimpan');
}

function generateGraphicCanvas(item) {
  const W = 800;
  const H = 880;
  const sc = 2;
  const cv = document.createElement('canvas');
  cv.width = W * sc; cv.height = H * sc;
  const ctx = cv.getContext('2d');
  ctx.scale(sc, sc);

  const fillRect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const text = (t, x, y, size, color, align, bold) => {
    ctx.font = `${bold ? '700' : '400'} ${size}px system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(t), x, y);
  };
  const roundRect = (x, y, w, h, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.fill();
  };
  const drawPie = (cx, cy, r, parts) => {
    let start = -Math.PI / 2;
    const total = parts.reduce((a, p) => a + p.v, 0);
    if (total <= 0) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle = '#e5e7eb'; ctx.fill();
      return;
    }
    parts.forEach(p => {
      if (p.v <= 0) return;
      const angle = (p.v / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, start + angle);
      ctx.fillStyle = p.c; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      start += angle;
    });
  };

  const fmt = n => (parseFloat(n) || 0).toFixed(2).replace('.', ',');
  const tglFmt = formatTanggalPanjang(item.tgl);

  fillRect(0, 0, W, H, '#f8fafc');

  fillRect(0, 0, W, 100, '#2d5016');
  text('Laporan Harian Panen & Pengiriman', 40, 40, 24, '#ffffff', 'left', true);
  text(`${item.gh} • ${tglFmt}`, 40, 70, 16, '#bbf7d0', 'left');
  text('PT. Agri Wangi Berry', W - 40, 55, 14, '#86efac', 'right', true);

  const grX = 40, grY = 130, grW = 720, grH = 280;
  roundRect(grX, grY, grW, grH, 12, '#ffffff');
  text('Rincian Panen, Pengiriman & Pack', grX + 20, grY + 30, 16, '#2d5016', 'left', true);
  
  fillRect(grX + 20, grY + 60, grW - 40, 40, '#f1f5f9');
  text('Grade', grX + 40, grY + 80, 14, '#475569', 'left', true);
  text('Panen (Kg)', grX + 200, grY + 80, 14, '#475569', 'right', true);
  text('Kirim (Kg)', grX + 380, grY + 80, 14, '#475569', 'right', true);
  text('Pack (Pcs)', grX + 560, grY + 80, 14, '#475569', 'right', true);

  const rows = [
    { name: 'Hatsuhana', p: item.p_hatsu, k: item.k_hatsu, m: item.m_hatsu, color: '#1e40af' },
    { name: 'Grade A', p: item.p_gradea, k: item.k_a11, m: item.m_a11, color: '#15803d' },
    { name: 'Grade B', p: item.p_gradeb, k: item.k_a15, m: item.m_a15, color: '#b45309' }
  ];

  rows.forEach((row, i) => {
    const ry = grY + 100 + (i * 45);
    text(row.name, grX + 40, ry + 20, 14, row.color, 'left', true);
    text(fmt(row.p), grX + 200, ry + 20, 14, '#1e293b', 'right');
    text(fmt(row.k), grX + 380, ry + 20, 14, '#1e293b', 'right');
    text(row.m, grX + 560, ry + 20, 14, '#1e293b', 'right');
    ctx.beginPath(); ctx.moveTo(grX+20, ry+40); ctx.lineTo(grX+grW-20, ry+40); ctx.strokeStyle='#f1f5f9'; ctx.stroke();
  });

  const sumP = item.p_hatsu + item.p_gradea + item.p_gradeb;
  const sumK = item.k_hatsu + item.k_a11 + item.k_a15;
  const sumM = item.m_hatsu + item.m_a11 + item.m_a15;
  const ryTotal = grY + 100 + (3 * 45);
  text('TOTAL', grX + 40, ryTotal + 20, 14, '#0f172a', 'left', true);
  text(fmt(sumP), grX + 200, ryTotal + 20, 14, '#0f172a', 'right', true);
  text(fmt(sumK), grX + 380, ryTotal + 20, 14, '#0f172a', 'right', true);
  text(sumM, grX + 560, ryTotal + 20, 14, '#0f172a', 'right', true);

  // 4. SECTION REJECT
  const rjX = 40, rjY = 430, rjW = 350, rjH = 350;
  roundRect(rjX, rjY, rjW, rjH, 12, '#ffffff');
  text('Komposisi Reject', rjX + 20, rjY + 30, 16, '#2d5016', 'left', true);

  const rejects = [
    { label: 'Cracking', v: (item.rk_crack || 0) + item.rp_crack, c: '#dc2626' },
    { label: 'Polinasi', v: (item.rk_poli || 0) + item.rp_poli, c: '#ea580c' },
    { label: 'HPT', v: (item.rk_hpt || 0) + item.rp_hpt, c: '#f59e0b' },
    { label: 'Bruise', v: item.rp_bruise, c: '#84cc16' },
    { label: 'Overripe', v: item.rp_overripe, c: '#0891b2' },
    { label: 'Buah Kuning', v: item.rp_kuning, c: '#eab308' },
    { label: 'Frozen', v: item.rp_frozen, c: '#7c3aed' }
  ].filter(r => r.v > 0);
  
  const totalReject = rejects.reduce((a, r) => a + r.v, 0);

  const pieCx = rjX + 90;
  const pieCy = rjY + 170;
  const pieR = 80;
  drawPie(pieCx, pieCy, pieR, rejects);
  
  ctx.beginPath(); ctx.arc(pieCx, pieCy, 45, 0, Math.PI*2); ctx.fillStyle = '#ffffff'; ctx.fill();
  text('TOTAL', pieCx, pieCy - 15, 11, '#64748b', 'center', true);
  text(fmt(totalReject), pieCx, pieCy + 5, 16, '#dc2626', 'center', true);
  text('Kg', pieCx, pieCy + 22, 10, '#64748b', 'center');

  let lgY = rjY + 80;
  rejects.forEach(r => {
    fillRect(rjX + 190, lgY - 5, 10, 10, r.c);
    text(r.label, rjX + 210, lgY, 11, '#1e293b', 'left');
    text(fmt(r.v) + ' kg', rjX + 330, lgY, 11, '#1e293b', 'right', true);
    lgY += 22;
  });

  const smX = 410, smY = 430, smW = 350, smH = 350;
  roundRect(smX, smY, smW, smH, 12, '#ffffff');
  text('Ringkasan Reject & Rate', smX + 20, smY + 30, 16, '#2d5016', 'left', true);

  const rkTotal = (item.rk_crack||0) + (item.rk_poli||0) + (item.rk_hpt||0);
  const rpTotal = (item.rp_crack||0) + (item.rp_poli||0) + (item.rp_hpt||0) + (item.rp_bruise||0) + (item.rp_overripe||0) + (item.rp_kuning||0) + (item.rp_frozen||0);
  const totalPanenAsli = sumP + rkTotal;
  const rateReject = totalPanenAsli > 0 ? (totalReject / totalPanenAsli * 100) : 0;

  fillRect(smX + 20, smY + 70, smW - 40, 60, '#f0fdf4');
  text('Reject Kebun', smX + 40, smY + 90, 12, '#166534');
  text(fmt(rkTotal) + ' Kg', smX + 40, smY + 110, 18, '#166534', 'left', true);

  fillRect(smX + 20, smY + 150, smW - 40, 60, '#fef2f2');
  text('Reject Prosesing', smX + 40, smY + 170, 12, '#991b1b');
  text(fmt(rpTotal) + ' Kg', smX + 40, smY + 190, 18, '#991b1b', 'left', true);

  fillRect(smX + 20, smY + 230, smW - 40, 80, '#fff7ed');
  text('Reject Rate', smX + 40, smY + 255, 12, '#9a3412');
  text(rateReject.toFixed(2) + '%', smX + 40, smY + 285, 24, '#ea580c', 'left', true);

  text(`Dibuat pada: ${new Date().toLocaleString('id-ID')}`, W / 2, H - 30, 12, '#94a3b8', 'center');

  return cv.toDataURL('image/png');
}

// ========== SIMPAN DATA ==========
// ========== SIMPAN DATA ==========
function simpanDataPanen() {
  // Paksa simpan isi form yang sedang aktif ke state sebelum disave
  saveCurrentFormToState();

  const tgl = document.getElementById('panen-tgl').value;
  if (!tgl) { showToast('Pilih tanggal panen!', 'error'); return; }

  let db = JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]');
  let savedCount = 0;

  // Log data yang ada di memori untuk ngecek
  console.log("=== ISI MEMORI FORM PANEN ===", panenFormData);

  // Loop semua GH, simpan yang ada datanya
  ['GH 1', 'GH 2', 'GLOBAL'].forEach(gh => {
    const state = panenFormData[gh];
    if (!state) return;

    const getV = (id) => parseFloat(state[id]) || 0;
    const getI = (id) => parseInt(state[id]) || 0;
    const getS = (id) => state[id] || '';

    // Cek apakah ada data yang diisi
    let hasData = false;
    if (gh === 'GLOBAL') {
      hasData = getV('k-frozen') > 0 || getV('t-curah') > 0 || getI('t-hatsu') > 0 || getI('t-a11') > 0 || getI('t-a15') > 0 || getS('t-ket') !== '';
    } else {
      hasData = [
        'p-hatsu', 'p-gradea', 'p-gradeb',
        'rk-crack', 'rk-poli', 'rk-hpt',
        'rp-crack', 'rp-poli', 'rp-hpt', 'rp-bruise', 'rp-overripe', 'rp-kuning', 'rp-frozen',
        'k-hatsu', 'k-a11', 'k-a15',
        'm-hatsu', 'm-a11', 'm-a15'
      ].some(id => getV(id) > 0);
    }

    if (hasData) {
      console.log(`✅ Menyimpan data untuk: ${gh}`);
      
      const entry = {
        id: generateId(), tgl: tgl, gh: gh,
        p_hatsu: gh === 'GLOBAL' ? 0 : getV('p-hatsu'),
        p_gradea: gh === 'GLOBAL' ? 0 : getV('p-gradea'),
        p_gradeb: gh === 'GLOBAL' ? 0 : getV('p-gradeb'),
        rk_crack: gh === 'GLOBAL' ? 0 : getV('rk-crack'),
        rk_poli: gh === 'GLOBAL' ? 0 : getV('rk-poli'),
        rk_hpt: gh === 'GLOBAL' ? 0 : getV('rk-hpt'),
        rp_crack: gh === 'GLOBAL' ? 0 : getV('rp-crack'),
        rp_poli: gh === 'GLOBAL' ? 0 : getV('rp-poli'),
        rp_hpt: gh === 'GLOBAL' ? 0 : getV('rp-hpt'),
        rp_bruise: gh === 'GLOBAL' ? 0 : getV('rp-bruise'),
        rp_overripe: gh === 'GLOBAL' ? 0 : getV('rp-overripe'),
        rp_kuning: gh === 'GLOBAL' ? 0 : getV('rp-kuning'),
        rp_frozen: gh === 'GLOBAL' ? 0 : getV('rp-frozen'),
        k_hatsu: gh === 'GLOBAL' ? 0 : getV('k-hatsu'),
        k_a11: gh === 'GLOBAL' ? 0 : getV('k-a11'),
        k_a15: gh === 'GLOBAL' ? 0 : getV('k-a15'),
        k_frozen: gh === 'GLOBAL' ? getV('k-frozen') : 0,
        m_hatsu: gh === 'GLOBAL' ? 0 : getI('m-hatsu'),
        m_a11: gh === 'GLOBAL' ? 0 : getI('m-a11'),
        m_a15: gh === 'GLOBAL' ? 0 : getI('m-a15'),
        t_curah: gh === 'GLOBAL' ? getV('t-curah') : 0,
        t_hatsu: gh === 'GLOBAL' ? getI('t-hatsu') : 0,
        t_a11: gh === 'GLOBAL' ? getI('t-a11') : 0,
        t_a15: gh === 'GLOBAL' ? getI('t-a15') : 0,
        t_ket: gh === 'GLOBAL' ? getS('t-ket') : ''
      };
      db.push(entry);
      savedCount++;
    }
  });

  if (savedCount === 0) {
    showToast('Isi minimal 1 data panen!', 'error');
    return;
  }

  localStorage.setItem(PANEN_STORAGE_KEY, JSON.stringify(db));
  showToast(`✅ ${savedCount} Data panen berhasil disimpan!`);
  resetFormPanen();
  renderTablePanen();
  updateDashboard();
}

function resetFormPanen() {
  // Bersihkan ingatan sementara
  panenFormData = { 'GH 1': {}, 'GH 2': {}, 'GLOBAL': {} };

  // Bersihkan form di layar
  document.querySelectorAll('#panen input[type="number"]').forEach(i => i.value = '');
  document.querySelectorAll('#panen input[type="text"]').forEach(i => i.value = '');
  document.getElementById('panen-tgl').value = new Date().toISOString().split('T')[0];
  
  // Kembalikan ke tab awal
  const defaultTab = document.querySelector('#panen-gh-tabs .gh-tab');
  setPanenGh('GH 1', defaultTab);
}

function panenResetPage() { panenCurrentPage = 1; renderTablePanen(); }
function panenGoToPage(p) { panenCurrentPage = p; renderTablePanen(); }

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
    const isGlobal = item.gh === 'GLOBAL';
    const totPanen = item.p_hatsu + item.p_gradea + item.p_gradeb + item.rk_crack + item.rk_poli + item.rk_hpt;
    const totKirim = item.k_hatsu + item.k_a11 + item.k_a15 + (item.k_frozen || 0);
    const grandReject = item.rk_crack + item.rk_poli + item.rk_hpt
      + item.rp_crack + item.rp_poli + item.rp_hpt
      + item.rp_bruise + item.rp_overripe + (item.rp_kuning || 0) + item.rp_frozen;
    const rejRate = totPanen > 0 ? (grandReject / totPanen * 100) : 0;
    const totMika = item.m_hatsu + item.m_a11 + item.m_a15;

    return `
      <tr>
        <td style="white-space:nowrap;">
          <button class="btn btn-sm btn-secondary" onclick="editDataPanen('${item.id}')" title="Edit">✏</button>
          <button class="btn btn-sm btn-success" onclick="openWAModalFromHistory('${item.id}')" title="Format WA" style="margin-top:2px;">📋</button>
          <button class="btn btn-sm btn-info" onclick="openGraphicModalFromHistory('${item.id}')" title="Format Grafik" style="margin-top:2px; background:#0284c7; color:white;">📊</button>
          <button class="btn btn-sm btn-danger" onclick="hapusDataPanen('${item.id}')" title="Hapus" style="margin-top:2px;">🗑️</button>
        </td>
        <td>${item.tgl}</td>
        <td><b>${isGlobal ? '🌐 GLOBAL' : ghOf(item)}</b></td>
        <td class="text-right">${isGlobal ? '-' : item.p_hatsu.toFixed(2)}</td>
        <td class="text-right">${isGlobal ? '-' : item.p_gradea.toFixed(2)}</td>
        <td class="text-right">${isGlobal ? '-' : item.p_gradeb.toFixed(2)}</td>
        <td class="text-right"><strong>${isGlobal ? '-' : totPanen.toFixed(2)}</strong></td>
        <td class="text-right"><strong>${isGlobal ? item.k_frozen.toFixed(2) + ' (Frozen)' : totKirim.toFixed(2)}</strong></td>
        <td class="text-right">${isGlobal ? '-' : grandReject.toFixed(2)}</td>
        <td class="text-right">${isGlobal ? '-' : rejRate.toFixed(2) + '%'}</td>
        <td class="text-right"><strong>${isGlobal ? '-' : totMika}</strong></td>
      </tr>
    `;
  }).join('');

  if (paginationEl) {
    const from = startIdx + 1;
    const to = Math.min(startIdx + PANEN_PER_PAGE, db.length);
    let pageBtns = '';
    for (let p = 1; p <= totalPages; p++) {
      pageBtns += `<button class="btn btn-sm ${p === panenCurrentPage ? 'btn-primary' : 'btn-secondary'}" onclick="panenGoToPage(${p})" style="min-width:36px;">${p}</button>`;
    }
    paginationEl.innerHTML = `
      <div style="font-size:0.85rem;color:#666;">Menampilkan <b>${from}</b>–<b>${to}</b> dari <b>${db.length}</b> data</div>
      <div style="display:flex;gap:0.35rem;align-items:center;">${pageBtns}</div>
    `;
  }
}

// ========== EDIT MODAL ==========
function editDataPanen(id) {
  const db = JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]');
  const item = db.find(x => String(x.id) === String(id));
  if (!item) return;
  window.editingPanenId = id;
  window.editingLksId = null;
  const body = document.getElementById('modal-edit-panen-body');
  
  const isGlobal = item.gh === 'GLOBAL';
  document.getElementById('modal-edit-panen').querySelector('.modal-header').textContent = isGlobal ? '✏️ Edit Data Global' : '✏️ Edit Data Panen';

  let html = `
    <div class="input-group"><label>Tanggal</label><input type="date" id="edit-p-tgl" value="${item.tgl}"></div>
    <div class="input-group"><label>Greenhouse</label><select id="edit-p-gh"><option value="GH 1" ${item.gh === 'GH 1' ? 'selected' : ''}>GH 1</option><option value="GH 2" ${item.gh === 'GH 2' ? 'selected' : ''}>GH 2</option><option value="GLOBAL" ${isGlobal ? 'selected' : ''}>🌐 GLOBAL (Frozen & Tamu)</option></select></div>
  `;

  if (!isGlobal) {
    html += `
      <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
      <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;margin-bottom:0.75rem;">🌾 Panen</div>
      <div class="input-group"><label>Panen Hatsu (Kg)</label><input type="number" step="0.01" id="edit-p-hatsu" value="${item.p_hatsu}"></div>
      <div class="input-group"><label>Panen Grade A (Kg)</label><input type="number" step="0.01" id="edit-p-gradea" value="${item.p_gradea}"></div>
      <div class="input-group"><label>Panen Grade B (Kg)</label><input type="number" step="0.01" id="edit-p-gradeb" value="${item.p_gradeb}"></div>

      <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
      <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;margin-bottom:0.75rem;">🍃 Reject Kebun</div>
      <div class="input-group"><label>Cracking (Kg)</label><input type="number" step="0.01" id="edit-rk-crack" value="${item.rk_crack || 0}"></div>
      <div class="input-group"><label>Polinasi (Kg)</label><input type="number" step="0.01" id="edit-rk-poli" value="${item.rk_poli || 0}"></div>
      <div class="input-group"><label>HPT (Kg)</label><input type="number" step="0.01" id="edit-rk-hpt" value="${item.rk_hpt || 0}"></div>

      <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
      <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;margin-bottom:0.75rem;">🏭 Reject Processing</div>
      <div class="input-group"><label>Cracking (Kg)</label><input type="number" step="0.01" id="edit-rp-crack" value="${item.rp_crack || 0}"></div>
      <div class="input-group"><label>Polinasi (Kg)</label><input type="number" step="0.01" id="edit-rp-poli" value="${item.rp_poli || 0}"></div>
      <div class="input-group"><label>HPT (Kg)</label><input type="number" step="0.01" id="edit-rp-hpt" value="${item.rp_hpt || 0}"></div>
      <div class="input-group"><label>Bruise (Kg)</label><input type="number" step="0.01" id="edit-rp-bruise" value="${item.rp_bruise || 0}"></div>
      <div class="input-group"><label>Overripe (Kg)</label><input type="number" step="0.01" id="edit-rp-overripe" value="${item.rp_overripe || 0}"></div>
      <div class="input-group"><label>Buah Kuning <80% (Kg)</label><input type="number" step="0.01" id="edit-rp-kuning" value="${item.rp_kuning || 0}"></div>
      <div class="input-group"><label>Frozen <11 gr (Kg)</label><input type="number" step="0.01" id="edit-rp-frozen" value="${item.rp_frozen || 0}"></div>

      <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
      <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;margin-bottom:0.75rem;">📦 Berat Pengiriman</div>
      <div class="input-group"><label>Kirim Hatsu (Kg)</label><input type="number" step="0.01" id="edit-k-hatsu" value="${item.k_hatsu}"></div>
      <div class="input-group"><label>Kirim A11 (Kg)</label><input type="number" step="0.01" id="edit-k-a11" value="${item.k_a11}"></div>
      <div class="input-group"><label>Kirim A15 (Kg)</label><input type="number" step="0.01" id="edit-k-a15" value="${item.k_a15}"></div>

      <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
      <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;margin-bottom:0.75rem;">🍓 Jumlah Pengiriman (Mika)</div>
      <div class="input-group"><label>Mika Hatsu (Pcs)</label><input type="number" id="edit-m-hatsu" value="${item.m_hatsu}"></div>
      <div class="input-group"><label>Mika A11 (Pcs)</label><input type="number" id="edit-m-a11" value="${item.m_a11}"></div>
      <div class="input-group"><label>Mika A15 (Pcs)</label><input type="number" id="edit-m-a15" value="${item.m_a15}"></div>
    `;
  } else {
    html += `
      <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
      <div style="font-size:0.75rem;font-weight:800;color:#2d5016;text-transform:uppercase;margin-bottom:0.75rem;">❄️ Frozen & Tamu (Global)</div>
      <div class="input-group"><label>Total Frozen (Kg)</label><input type="number" step="0.01" id="edit-k-frozen" value="${item.k_frozen || 0}"></div>
      
      <hr style="border:0;border-top:2px solid #e5e7eb;margin:1rem 0;">
      <div class="input-group"><label>Tamu Curah (Kg)</label><input type="number" step="0.01" id="edit-t-curah" value="${item.t_curah || 0}"></div>
      <div class="input-group"><label>Tamu Hatsu (Pcs)</label><input type="number" id="edit-t-hatsu" value="${item.t_hatsu || 0}"></div>
      <div class="input-group"><label>Tamu A11 (Pcs)</label><input type="number" id="edit-t-a11" value="${item.t_a11 || 0}"></div>
      <div class="input-group"><label>Tamu A15 (Pcs)</label><input type="number" id="edit-t-a15" value="${item.t_a15 || 0}"></div>
      <div class="input-group"><label>Keterangan Tamu</label><input type="text" id="edit-t-ket" value="${(item.t_ket || '').replace(/"/g, '&quot;')}"></div>
    `;
  }

  body.innerHTML = html;
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
  
  const g = id => { const el = document.getElementById(id); return el ? parseFloat(el.value || 0) : 0; };
  const gInt = id => { const el = document.getElementById(id); return el ? (parseInt(el.value || 0) || 0) : 0; };
  const gStr = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  
  const gh = gStr('edit-p-gh');
  const isGlobal = gh === 'GLOBAL';

  db[idx] = {
    ...db[idx],
    tgl: gStr('edit-p-tgl'),
    gh: gh,
    p_hatsu: isGlobal ? 0 : g('edit-p-hatsu'),
    p_gradea: isGlobal ? 0 : g('edit-p-gradea'),
    p_gradeb: isGlobal ? 0 : g('edit-p-gradeb'),
    rk_crack: isGlobal ? 0 : g('edit-rk-crack'),
    rk_poli: isGlobal ? 0 : g('edit-rk-poli'),
    rk_hpt: isGlobal ? 0 : g('edit-rk-hpt'),
    rp_crack: isGlobal ? 0 : g('edit-rp-crack'),
    rp_poli: isGlobal ? 0 : g('edit-rp-poli'),
    rp_hpt: isGlobal ? 0 : g('edit-rp-hpt'),
    rp_bruise: isGlobal ? 0 : g('edit-rp-bruise'),
    rp_overripe: isGlobal ? 0 : g('edit-rp-overripe'),
    rp_kuning: isGlobal ? 0 : g('edit-rp-kuning'),
    rp_frozen: isGlobal ? 0 : g('edit-rp-frozen'),
    k_hatsu: isGlobal ? 0 : g('edit-k-hatsu'),
    k_a11: isGlobal ? 0 : g('edit-k-a11'),
    k_a15: isGlobal ? 0 : g('edit-k-a15'),
    m_hatsu: isGlobal ? 0 : gInt('edit-m-hatsu'),
    m_a11: isGlobal ? 0 : gInt('edit-m-a11'),
    m_a15: isGlobal ? 0 : gInt('edit-m-a15'),
    k_frozen: g('edit-k-frozen'),
    t_curah: g('edit-t-curah'),
    t_hatsu: gInt('edit-t-hatsu'),
    t_a11: gInt('edit-t-a11'),
    t_a15: gInt('edit-t-a15'),
    t_ket: gStr('edit-t-ket')
  };
  
  localStorage.setItem(PANEN_STORAGE_KEY, JSON.stringify(db));
  showToast('✅ Data berhasil diupdate!');
  closeModalEditPanen();
  renderTablePanen();
  updateDashboard();
}

function hapusDataPanen(id) {
  if (!confirm('Yakin hapus data ini?')) return;
  const db = JSON.parse(localStorage.getItem(PANEN_STORAGE_KEY) || '[]');
  const filtered = db.filter(x => String(x.id) !== String(id));
  localStorage.setItem(PANEN_STORAGE_KEY, JSON.stringify(filtered));
  showToast('✅ Data berhasil dihapus!');
  renderTablePanen();
  updateDashboard();
}

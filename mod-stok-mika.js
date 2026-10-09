function exportKemasanCSV() {
  const filterBulan = document.getElementById('filter-bulan-kemasan').value;
  if (!filterBulan) { showToast('Pilih bulan dulu!', 'error'); return; }

  const db = JSON.parse(localStorage.getItem(KEMASAN_STORAGE_KEY) || '[]')
    .filter(e => e && e.tgl && Array.isArray(e.items))
    .sort((a, b) => a.tgl.localeCompare(b.tgl));

  const running = {};
  masterJenisKemasan.forEach(m => {
    running[m.name] = { gudangDus: 0, processing: 0, rejTotal: 0 };
  });

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
      if (opnameVal !== null) {
        r.processing = opnameVal;
      } else {
        r.processing += pcsBongkar - kirim - tamu - rejHari;
      }
      r.rejTotal += rejHari;

      if (entry.tgl.startsWith(filterBulan)) {
        const totalKeluarHari = kirim + tamu + rejHari;
        const totalStokPcs = Math.max(0, r.processing);
        let ket = it.ketReject || it.ketTamu || '';
        if (opnameVal !== null) {
          ket = ket + (ket ? ' | ' : '') + '📝 Koreksi: ' + opnameVal + ' pcs';
        }
        rows.push({
          tgl: entry.tgl, name: it.name, std,
          masukDus, masukPcs: masukDus * std,
          gudangDus: r.gudangDus, gudangPcs: r.gudangDus * std,
          bongkarDus, pcsBongkar,
          procPcs: procSebelumKeluar,
          jumlahStok: totalKeluarHari,
          kirim, tamu,
          totalStokDus: Math.floor(totalStokPcs / std),
          totalStokPcs,
          rejHari, rejTotal: r.rejTotal,
          keterangan: ket
        });
      }
    });
  });

  if (!rows.length) {
    showToast('Tidak ada data stock opname untuk bulan ini!', 'error');
    return;
  }

  const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const n = v => Number(v || 0);

  let csv = '';
  csv += 'STOCK OPNAME KEMASAN MIKA - ' + filterBulan + '\n';
  csv += 'PT. Agri Wangi Berry - Processing\n\n';

  csv += [
    'Tanggal',
    'Jenis Kemasan',
    'Masuk Dus', 'Masuk Pcs',
    'Stok Gudang Dus', 'Stok Gudang Pcs',
    'Bongkar Dus', 'Pcs Bongkar', 'Ruang Prosesing Pcs',
    'Jumlah Stok',
    'Kirim', 'Mika Tamu',
    'Total Stok Dus', 'Total Stok Pcs',
    'Reject Hari Ini', 'Reject Total',
    'Keterangan'
  ].join(',') + '\n';

  rows.forEach(r => {
    const [y, m, d] = r.tgl.split('-');
    const tglFmt = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
    csv += [
      q(tglFmt),
      q(r.name),
      n(r.masukDus), n(r.masukPcs),
      n(r.gudangDus), n(r.gudangPcs),
      n(r.bongkarDus), n(r.pcsBongkar), n(r.procPcs),
      n(r.jumlahStok),
      n(r.kirim), n(r.tamu),
      n(r.totalStokDus), n(r.totalStokPcs),
      n(r.rejHari), n(r.rejTotal),
      q(r.keterangan || '')
    ].join(',') + '\n';
  });

  const sum = k => rows.reduce((a, r) => a + (r[k] || 0), 0);
  csv += '\n';
  csv += [
    q('TOTAL'), q(''),
    n(sum('masukDus')), n(sum('masukPcs')),
    q(''), q(''),
    n(sum('bongkarDus')), n(sum('pcsBongkar')), q(''),
    n(sum('jumlahStok')),
    n(sum('kirim')), n(sum('tamu')),
    q(''), n(sum('totalStokPcs')),
    n(sum('rejHari')), q(''),
    q('')
  ].join(',') + '\n';

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `Stock_Opname_Mika_${filterBulan}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 3000);

  showToast(`📥 Download Stock Opname ${filterBulan} (${rows.length} baris)`);
}

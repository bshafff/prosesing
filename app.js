// ========== APP BOOTSTRAP ==========
const VIEW_FILES = {
  'home': 'home.html',
  'lks': 'lks.html',
  'dashboard': 'dashboard-panen.html',
  'dash-mika': 'dashboard-mika.html',
  'panen': 'rekap-panen.html',
  'kemasan': 'stok-mika.html'
};

async function loadAllViews() {
  const container = document.getElementById('app-container');
  if (!container) return;
  const entries = Object.entries(VIEW_FILES);
  try {
    const texts = await Promise.all(entries.map(([_, f]) =>
      fetch('./' + f, { cache: 'no-cache' }).then(r => {
        if (!r.ok) throw new Error(`Gagal load ${f}: ${r.status}`);
        return r.text();
      })
    ));
    container.innerHTML = texts.join('\n');
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="card" style="color:#dc2626;">
      <b>Gagal memuat tampilan.</b><br>
      <small>${err.message}. Pastikan semua file .html berada di folder yang sama dengan index.html dan diakses melalui web server (bukan file://).</small>
    </div>`;
  }
}

async function initApp() {
  await loadAllViews();

  const today = new Date().toISOString().split('T')[0];
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

  setVal('lks-tanggal', today);
  setVal('panen-tgl', today);
  setVal('kemasan-tgl', today);
  setVal('filter-bulan-kemasan', today.substring(0, 7));
  setVal('dashboard-bulan', today.substring(0, 7));
  setVal('mika-bulan', today.substring(0, 7));
  setVal('minggu-bulan', today.substring(0, 7));

  try { renderTableLks(); } catch (e) { console.warn('renderTableLks:', e); }
  try { renderTablePanen(); } catch (e) { console.warn('renderTablePanen:', e); }
  try { recalculateStockKemasan(); } catch (e) { console.warn('recalculateStockKemasan:', e); }
  try { renderKemasanForms(); } catch (e) { console.warn('renderKemasanForms:', e); }
  try { renderKemasanTables(); } catch (e) { console.warn('renderKemasanTables:', e); }
  try { updateDashboard(); } catch (e) { console.warn('updateDashboard:', e); }

  updateSyncStatus();
  migrateExistingLocalData();

  if (isAuthenticated) syncQueue();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW gagal:', err));
  }
}

window.addEventListener('DOMContentLoaded', initApp);

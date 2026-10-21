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
  if (!container) {
    console.error('[VIEW] Container #app-container tidak ditemukan!');
    return;
  }
  const entries = Object.entries(VIEW_FILES);
  console.log('[VIEW] Loading', entries.length, 'file:', entries.map(e => e[1]).join(', '));

  const results = await Promise.allSettled(entries.map(([_, f]) =>
    fetch('./' + f, { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(t => ({ file: f, text: t }))
      .catch(e => ({ file: f, error: e.message }))
  ));

  const texts = results.map(r => {
    if (r.status === 'fulfilled' && r.value.error) {
      console.error('[VIEW] Gagal:', r.value.file, r.value.error);
      return `<div class="card" style="color:#dc2626;padding:1rem;">Gagal load <b>${r.value.file}</b>: ${r.value.error}</div>`;
    }
    if (r.status === 'fulfilled') return r.value.text;
    console.error('[VIEW] Promise rejected:', r.reason);
    return '';
  });

  container.innerHTML = texts.join('\n');
  console.log('[VIEW] Container sekarang punya', container.innerHTML.length, 'karakter');
}

// Bersihkan query ?v=... dari URL setelah update
if (window.location.search.includes('v=')) {
  window.history.replaceState(null, '', window.location.pathname + window.location.hash);
}

async function initApp() {
  console.log('[BOOT] AWB Init');

  // 1. Load semua views dulu (WAJIB jalan pertama)
  await loadAllViews();

  // 2. Set default tanggal
  const today = new Date().toISOString().split('T')[0];
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setVal('lks-tanggal', today);
  setVal('panen-tgl', today);
  setVal('kemasan-tgl', today);
  setVal('filter-bulan-kemasan', today.substring(0, 7));
  setVal('dashboard-bulan', today.substring(0, 7));
  setVal('mika-bulan', today.substring(0, 7));
  setVal('minggu-bulan', today.substring(0, 7));

  // 3. Init render data
  try { renderTableLks(); } catch (e) { console.warn('renderTableLks:', e); }
  try { renderTablePanen(); } catch (e) { console.warn('renderTablePanen:', e); }
  try { recalculateStockKemasan(); } catch (e) { console.warn('recalculateStockKemasan:', e); }
  try { renderKemasanForms(); } catch (e) { console.warn('renderKemasanForms:', e); }
  try { renderKemasanTables(); } catch (e) { console.warn('renderKemasanTables:', e); }
  try { updateDashboard(); } catch (e) { console.warn('updateDashboard:', e); }

  // 4. Sync & version
  updateSyncStatus();
  migrateExistingLocalData();
  checkVersion(false);
  startVersionCheckInterval();

  // 5. Init back button handler
  __initBackHandler();

  // 6. SELALU TAMPILKAN WELCOME SCREEN SAAT DIBUKA
  console.log('[BOOT] Menampilkan welcome screen');
  showWelcomeScreen();
  
  // Jalankan auto sync di background jika user sudah pernah connect sebelumnya
  if (isWelcomed()) {
    autoBootSync();
  }

  // 7. Register SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW gagal:', err));
  }
}

window.addEventListener('DOMContentLoaded', initApp);

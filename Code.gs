/**
 * Google Apps Script backend - Processing AWB PWA (v1.5)
 * v1.3: Anti-duplikat + ID auto plain text
 * v1.4: tambah tipe data 'hyoshii' (sheet HYOSHII) untuk menu "Diterima Hyoshii"
 * v1.5: tambah tipe data 'populasi' (sheet POPULASI) untuk jumlah tanaman per GH
 */

const CONFIG = {
  SPREADSHEET_ID: '16fVN4SMYWtz-NkM3mHSZeHIEjmNdZmW1L3I8rziKjfI',
  API_KEY: 'AWB_PROCESSING_2026',
  SHEETS: {
    lks: 'LKS',
    panen: 'PANEN',
    kemasan: 'KEMASAN',
    hyoshii: 'HYOSHII',
    populasi: 'POPULASI'
  },
  LOCK_TIMEOUT_MS: 60000
};

function doGet(e) {
  const callback = (e && e.parameter && e.parameter.callback) || '';
  try {
    if (!e || !e.parameter || e.parameter.key !== CONFIG.API_KEY) {
      return output({ ok: false, error: 'Unauthorized' }, callback);
    }

    const action = e.parameter.action || 'ping';

    if (action === 'ping') {
      return output({ ok: true, message: 'AWB Processing API aktif', version: '1.5.0' }, callback);
    }

    if (action === 'pull') {
      return output({ ok: true, data: pullAll() }, callback);
    }

    if (action === 'write') {
      const payload = decodePayload(e.parameter.payload || '');
      const result = handleWrite(payload);
      return output({ ok: true, ...result }, callback);
    }

    if (action === 'writeBatch') {
      const payload = decodePayload(e.parameter.payload || '');
      const result = handleWriteBatch(payload);
      return output({ ok: true, ...result }, callback);
    }

    if (action === 'cleanup') {
      const result = cleanupAllDuplicates();
      return output({ ok: true, ...result }, callback);
    }

    return output({ ok: false, error: 'Action tidak dikenal: ' + action }, callback);
  } catch (err) {
    return output({ ok: false, error: String(err && err.message ? err.message : err) }, callback);
  }
}

function output(data, callback) {
  const json = JSON.stringify(data);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function decodePayload(base64) {
  if (!base64) throw new Error('Payload kosong.');
  const bytes = Utilities.base64Decode(base64);
  const text = Utilities.newBlob(bytes).getDataAsString('UTF-8');
  return JSON.parse(text);
}

function getSpreadsheet() {
  if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID.indexOf('PASTE_') === 0) {
    throw new Error('SPREADSHEET_ID belum diisi.');
  }
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function ensureSheet(type) {
  const ss = getSpreadsheet();
  const name = CONFIG.SHEETS[type];
  if (!name) throw new Error('Tipe data tidak dikenal: ' + type);
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

// ============ HELPER: Normalisasi ID ============
// Menyamakan format ID dari Sheet (number) dengan ID dari PWA (string)
function normId(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') {
    return String(Math.round(v));
  }
  return String(v).trim();
}

function flattenObject(value, prefix, out) {
  out = out || {};
  prefix = prefix || '';

  if (value === null || value === undefined) {
    if (prefix) out[prefix] = '';
    return out;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      out[prefix] = '';
      return out;
    }
    value.forEach(function(item, index) {
      const key = prefix ? prefix + '_' + (index + 1) : String(index + 1);
      if (item !== null && typeof item === 'object') flattenObject(item, key, out);
      else out[key] = item;
    });
    return out;
  }

  if (typeof value === 'object') {
    Object.keys(value).forEach(function(key) {
      const next = prefix ? prefix + '_' + key : key;
      flattenObject(value[key], next, out);
    });
    return out;
  }

  out[prefix] = value;
  return out;
}

// FIX: Paksa kolom ID jadi Plain Text SEBELUM semua operasi
function forceIdColumnPlainText(sheet, headers) {
  const idColIndex = headers.indexOf('ID') + 1;
  if (idColIndex > 0 && sheet.getMaxRows() >= 2) {
    sheet.getRange(2, idColIndex, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
  }
}

function ensureHeaders(sheet, flatRecord) {
  const required = Object.keys(flatRecord);
  const lastCol = sheet.getLastColumn();
  let headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

  if (!headers.length || headers.every(function(h) { return h === ''; })) {
    headers = required;
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else {
    const missing = required.filter(function(h) { return headers.indexOf(h) === -1; });
    if (missing.length) {
      sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
      headers = headers.concat(missing);
    }
    sheet.setFrozenRows(1);
  }

  forceIdColumnPlainText(sheet, headers);
  return headers;
}

function findRowById(sheet, id, headers) {
  const idCol = headers.indexOf('ID') + 1;
  if (!idCol || sheet.getLastRow() < 2) return -1;
  const values = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1).getValues();
  const target = normId(id);
  for (let i = 0; i < values.length; i++) {
    if (normId(values[i][0]) === target) return i + 2;
  }
  return -1;
}

function rowFromFlat(flat, headers) {
  return headers.map(function(h) {
    const value = flat[h];
    return value === undefined || value === null ? '' : value;
  });
}

function handleWrite(payload) {
  if (!payload || !payload.type || !payload.action) throw new Error('Payload tidak lengkap.');
  const type = payload.type;
  const action = payload.action;
  const sheet = ensureSheet(type);

  if (action === 'clear') {
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      sheet.deleteRows(2, sheet.getMaxRows() - 1);
      sheet.insertRowsAfter(1, Math.max(1, 100));
    }
    return { action: 'clear', type: type };
  }

  if (action === 'delete') {
    const headers = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    const row = findRowById(sheet, payload.id, headers);
    if (row > 0) sheet.deleteRow(row);
    return { action: 'delete', type: type, id: payload.id };
  }

  if (action === 'upsert') {
    const record = payload.record;
    if (!record || record.id === undefined || record.id === null) throw new Error('Record tidak memiliki ID.');

    const flat = flattenObject(record);
    flat.ID = String(record.id);
    flat.Updated_At = new Date().toISOString();
    flat.Data_JSON = JSON.stringify(record);

    const headers = ensureHeaders(sheet, flat);
    const row = rowFromFlat(flat, headers);
    const existingRow = findRowById(sheet, record.id, headers);

    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, headers.length).setValues([row]);
      return { action: 'update', type: type, id: record.id };
    }

    sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
    return { action: 'insert', type: type, id: record.id };
  }

  throw new Error('Write action tidak dikenal: ' + action);
}

function handleWriteBatch(payload) {
  if (!payload || !Array.isArray(payload.items) || !payload.items.length) {
    throw new Error('Payload batch kosong.');
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);
  } catch (lockErr) {
    throw new Error('Server sedang sibuk. Coba lagi beberapa detik.');
  }

  try {
    // Otomatis mengikuti semua tipe di CONFIG.SHEETS (lks, panen, kemasan, hyoshii)
    const byType = {};
    Object.keys(CONFIG.SHEETS).forEach(function(t) { byType[t] = []; });
    payload.items.forEach(function(it) {
      if (it && it.type && byType[it.type]) byType[it.type].push(it);
    });

    let processed = 0;
    const details = [];

    Object.keys(byType).forEach(function(type) {
      if (!byType[type].length) return;
      const r = applyBatch(byType[type], type);
      processed += r.processed;
      details.push(r);
    });

    return { processed: processed, details: details };
  } finally {
    lock.releaseLock();
  }
}

function applyBatch(items, type) {
  const sheet = ensureSheet(type);
  let processed = 0;

  // 1) CLEAR
  const clears = items.filter(function(x) { return x.action === 'clear'; });
  if (clears.length) {
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      sheet.deleteRows(2, sheet.getMaxRows() - 1);
      sheet.insertRowsAfter(1, Math.max(1, 100));
    }
    processed += clears.length;
  }

  // 2) DELETE
  const deletes = items.filter(function(x) { return x.action === 'delete'; });
  if (deletes.length) {
    const lastCol = sheet.getLastColumn();
    const headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    const idCol = headers.indexOf('ID') + 1;

    if (idCol > 0 && sheet.getLastRow() >= 2) {
      const idValues = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1).getValues();
      const targetSet = {};
      deletes.forEach(function(d) { targetSet[normId(d.id)] = true; });

      const rowsToDelete = [];
      for (let i = 0; i < idValues.length; i++) {
        if (targetSet[normId(idValues[i][0])]) rowsToDelete.push(i + 2);
      }

      rowsToDelete.sort(function(a, b) { return b - a; }).forEach(function(r) {
        sheet.deleteRow(r);
      });
      processed += rowsToDelete.length;
    }
  }

  // 3) UPSERT
  const upserts = items.filter(function(x) { return x.action === 'upsert' && x.record; });

  if (upserts.length) {
    const flatList = [];
    upserts.forEach(function(u) {
      const rec = u.record;
      if (!rec || rec.id === undefined || rec.id === null) return;
      const flat = flattenObject(rec);
      flat.ID = String(rec.id);
      flat.Updated_At = new Date().toISOString();
      flat.Data_JSON = JSON.stringify(rec);
      flatList.push({ record: rec, flat: flat });
    });

    if (flatList.length) {
      const requiredSet = {};
      flatList.forEach(function(f) {
        Object.keys(f.flat).forEach(function(k) { requiredSet[k] = true; });
      });
      const requiredKeys = Object.keys(requiredSet);

      const lastCol = sheet.getLastColumn();
      let headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

      if (!headers.length || headers.every(function(h) { return h === ''; })) {
        headers = requiredKeys;
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
      } else {
        const missing = requiredKeys.filter(function(h) { return headers.indexOf(h) === -1; });
        if (missing.length) {
          sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
          headers = headers.concat(missing);
        }
        sheet.setFrozenRows(1);
      }

      // FIX: Paksa plain text SEBELUM lookup
      forceIdColumnPlainText(sheet, headers);

      const idCol = headers.indexOf('ID') + 1;
      const idToRow = {};
      if (idCol > 0 && sheet.getLastRow() >= 2) {
        const idValues = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1).getValues();
        for (let i = 0; i < idValues.length; i++) {
          idToRow[normId(idValues[i][0])] = i + 2;
        }
      }

      const updates = [];
      const inserts = [];
      const seenInBatch = {};

      flatList.forEach(function(f) {
        const rowData = headers.map(function(h) {
          const v = f.flat[h];
          return v === undefined || v === null ? '' : v;
        });
        const key = normId(f.record.id);

        // Skip kalau ID ini sudah ada di batch yang sama (anti dobel dalam 1 batch)
        if (seenInBatch[key]) return;
        seenInBatch[key] = true;

        if (idToRow[key]) {
          updates.push({ row: idToRow[key], data: rowData });
        } else {
          inserts.push(rowData);
        }
      });

      updates.forEach(function(u) {
        sheet.getRange(u.row, 1, 1, headers.length).setValues([u.data]);
      });

      if (inserts.length) {
        const startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, inserts.length, headers.length).setValues(inserts);
      }

      processed += flatList.length;
    }
  }

  return { type: type, processed: processed };
}

function pullAll() {
  const result = {};
  Object.keys(CONFIG.SHEETS).forEach(function(type) {
    result[type] = pullSheet(type);
  });
  return result;
}

function pullSheet(type) {
  const sheet = ensureSheet(type);
  if (sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const jsonCol = headers.indexOf('Data_JSON');
  if (jsonCol >= 0) {
    const values = sheet.getRange(2, jsonCol + 1, sheet.getLastRow() - 1, 1).getValues();
    return values.map(function(row) {
      try { return JSON.parse(row[0]); } catch (_) { return null; }
    }).filter(Boolean);
  }
  return [];
}

// ============ CLEANUP DUPLIKAT ============
function cleanupDuplicates(type) {
  const sheet = ensureSheet(type);
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1 || sheet.getLastRow() < 3) return { type: type, removed: 0 };

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const idCol = headers.indexOf('ID') + 1;
  if (idCol < 1) return { type: type, removed: 0, error: 'Kolom ID tidak ditemukan' };

  forceIdColumnPlainText(sheet, headers);

  const lastRow = sheet.getLastRow();
  const idValues = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();

  // Cari duplikat (simpan baris PERTAMA, hapus sisanya)
  const seen = {};
  const rowsToDelete = [];
  for (let i = 0; i < idValues.length; i++) {
    const key = normId(idValues[i][0]);
    if (!key) continue;
    if (seen[key]) {
      rowsToDelete.push(i + 2);
    } else {
      seen[key] = true;
    }
  }

  // Hapus dari bawah ke atas
  rowsToDelete.sort(function(a, b) { return b - a; }).forEach(function(r) {
    sheet.deleteRow(r);
  });

  return { type: type, removed: rowsToDelete.length };
}

function cleanupAllDuplicates() {
  const result = {};
  let totalRemoved = 0;
  Object.keys(CONFIG.SHEETS).forEach(function(type) {
    try {
      const r = cleanupDuplicates(type);
      result[type] = r;
      totalRemoved += r.removed || 0;
    } catch (err) {
      result[type] = { error: String(err.message || err) };
    }
  });
  return { totalRemoved: totalRemoved, details: result };
}

function setupSheets() {
  Object.keys(CONFIG.SHEETS).forEach(function(type) {
    ensureSheet(type);
  });
  return 'OK';
}

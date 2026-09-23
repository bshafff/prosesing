/**
 * Google Apps Script backend - Processing AWB PWA
 *
 * 1) Buat Google Spreadsheet kosong.
 * 2) Extensions > Apps Script.
 * 3) Tempel seluruh kode ini.
 * 4) Isi SPREADSHEET_ID dan API_KEY.
 * 5) Deploy > New deployment > Web app.
 *    Execute as: Me
 *    Who has access: Anyone
 * 6) Salin URL /exec ke index.html pada SYNC_CONFIG.APPS_SCRIPT_URL.
 */

const CONFIG = {
  SPREADSHEET_ID: 'PASTE_SPREADSHEET_ID_HERE',
  API_KEY: 'AWB_PROCESSING_2026',
  SHEETS: {
    lks: 'LKS',
    panen: 'PANEN',
    kemasan: 'KEMASAN'
  }
};

function doGet(e) {
  const callback = (e && e.parameter && e.parameter.callback) || '';
  try {
    if (!e || !e.parameter || e.parameter.key !== CONFIG.API_KEY) {
      return output({ ok: false, error: 'Unauthorized' }, callback);
    }

    const action = e.parameter.action || 'ping';

    if (action === 'ping') {
      return output({ ok: true, message: 'AWB Processing API aktif', version: '1.0.0' }, callback);
    }

    if (action === 'pull') {
      return output({ ok: true, data: pullAll() }, callback);
    }

    if (action === 'write') {
      const payload = decodePayload(e.parameter.payload || '');
      const result = handleWrite(payload);
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
    // callback hanya berasal dari browser aplikasi yang membuat nama alfanumerik/underscore.
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

function ensureHeaders(sheet, flatRecord) {
  const required = Object.keys(flatRecord);
  const lastCol = sheet.getLastColumn();
  let headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

  if (!headers.length || headers.every(function(h) { return h === ''; })) {
    headers = required;
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return headers;
  }

  const missing = required.filter(function(h) { return headers.indexOf(h) === -1; });
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
  }
  sheet.setFrozenRows(1);
  return headers;
}

function findRowById(sheet, id, headers) {
  const idCol = headers.indexOf('ID') + 1;
  if (!idCol || sheet.getLastRow() < 2) return -1;
  const values = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1).getValues();
  const target = String(id);
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === target) return i + 2;
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

function setupSheets() {
  Object.keys(CONFIG.SHEETS).forEach(function(type) {
    ensureSheet(type);
  });
  return 'OK';
}

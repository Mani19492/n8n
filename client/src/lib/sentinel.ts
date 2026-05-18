import * as XLSX from 'xlsx';

const N8N_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/forensic';
// e.g. http://localhost:5678/webhook/forensic
// Set in your .env:  VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/forensic

// ── 1. UPLOAD & PARSE EXCEL ─────────────────────────────────────
// Call this when user drops/selects the xlsx file.
// It parses the file in the browser, sends JSON to n8n.
// n8n returns ALL data needed for every view.

export async function uploadCDR(file: File, onProgress?: (msg: string) => void) {
  onProgress?.('Reading Excel file...');

  // Parse xlsx in browser using SheetJS
  const arrayBuffer = await file.arrayBuffer();
  const workbook    = XLSX.read(arrayBuffer, { type: 'array', raw: false });

  // JIO CDR files use sheet name "Mapping"
  const sheetName = workbook.SheetNames.includes('Mapping')
    ? 'Mapping'
    : workbook.SheetNames[0];

  const sheet   = workbook.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  // Each record = one row as an object with header keys:
  // { CdrNo, 'B Party', Date, Time, Duration, 'Call Type',
  //   'First Cell ID', 'First Cell ID Address', IMEI, IMSI,
  //   'Lat-Long-Azimuth (First CellID)', Location, ... }

  onProgress?.(`Parsed ${records.length} records. Sending to n8n...`);

  // Generate investigation ID on frontend
  const investigation_id = 'INV-' + Math.random().toString(36).slice(2,8).toUpperCase();

  const response = await fetch(N8N_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      action:           'ingest',
      investigation_id,
      title:            file.name.replace(/\.[^.]+$/, ''),
      filename:         file.name,
      records               // ← full rows array from SheetJS
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`n8n error ${response.status}: ${text}`);
  }

  const data = await response.json();

  // Register this session for cleanup on tab close
  registerSessionDestroy(investigation_id);

  onProgress?.('Done!');
  return data;
}


// ── 2. ASK SENTINEL AI ────────────────────────────────────────────
// Call this from the AI Insights chat box.

export async function askSentinel(investigationId: string, message: string) {
  const response = await fetch(N8N_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      action:           'ai-query',
      investigation_id: investigationId,
      message
    })
  });

  if (!response.ok) {
    throw new Error(`Sentinel error ${response.status}`);
  }

  const data = await response.json();
  return data.response; // ← string: Sentinel's markdown answer
}

// ── 3. DESTROY SESSION ────────────────────────────────────────────
// Deletes the Supabase row permanently.
// Call this when: user clicks "Close Case", or tab/window closes.
export async function destroySession(investigationId: string) {
  try {
    await fetch(N8N_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'destroy', investigation_id: investigationId })
    });
    sessionStorage.removeItem('sentinel_session');
    console.log('[SENTINEL] Session destroyed:', investigationId);
  } catch(e: any) {
    console.warn('[SENTINEL] Destroy failed (network):', e.message);
  }
}

// ── 4. AUTO-DESTROY ON TAB CLOSE ─────────────────────────────────
// Uses beacon API so it fires even when the tab is closing.
export function registerSessionDestroy(investigationId: string) {
  sessionStorage.setItem('sentinel_session', investigationId);

  window.addEventListener('beforeunload', () => {
    const id = sessionStorage.getItem('sentinel_session');
    if (!id) return;

    // sendBeacon is fire-and-forget, works on tab close
    const blob = new Blob(
      [JSON.stringify({ action: 'destroy', investigation_id: id })],
      { type: 'application/json' }
    );
    navigator.sendBeacon(N8N_URL, blob);
    sessionStorage.removeItem('sentinel_session');
  });
}

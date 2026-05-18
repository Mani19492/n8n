# SENTINEL — Complete Fix Guide
# Every issue diagnosed and fixed

---

## WHAT WAS BROKEN & WHY

### 1. "Forensic Engine Error: Reconstruction failed" on upload
**Cause:** The workflow used `n8n-nodes-base.csv` which cannot read `.xlsx` binary files
sent as multipart/form-data. The node expected raw CSV text.
**Fix:** Removed the CSV node entirely. The Parse Engine now reads `body.records[]`
(JSON) or falls back to items from upstream. Your frontend must convert the xlsx
to JSON before sending, OR send the file as FormData and parse it in n8n with
the Spreadsheet File node (see Frontend section below).

### 2. Raw Records / Tower Analysis / IMEI Mapping all blank
**Cause:** `Respond OK` only returned `{ success: true, investigation_id }`.
The frontend had no data to render.
**Fix:** `Respond Ingest` now returns the FULL payload:
`records_json`, `geo_json`, `comm_links`, `tower_analysis`,
`common_numbers`, `imei_mapping`, `anomalies`, `timeline_json`.

### 3. Map shows no markers / wrong location
**Cause:** Indian CDR files use column `"Lat-Long-Azimuth (First CellID)"`
with 3 space-separated values: `lat long azimuth`. The old code only
split on spaces but didn't validate India coordinate ranges.
**Fix:** Parser now splits on whitespace OR comma, takes first 2 tokens,
and validates lat (5–40) and long (60–100) for India. Invalid coords are
set to 0 and filtered out of `geo_json`.

### 4. AI Chat: "Error connecting to Sentinel Intelligence node"
**Cause (1):** The Supabase node used `operation: get` with `id` field,
but the stored `id` is a UUID while the frontend sends `investigation_id`
like `INV-ZHKT9P` — complete mismatch.
**Cause (2):** The Gemini credential wasn't connected properly.
**Fix:** Replaced Supabase node with HTTP Request node that queries by
`case_number=eq.CASE-INV-ZHKT9P` — always matches.

### 5. Supabase insert fails (total_records stays 0)
**Cause:** n8n Supabase node sends string values for UUID primary key,
but the schema had `id UUID DEFAULT gen_random_uuid()` and the node
tried to set it from a non-UUID string like `INV-XXXX`.
Also: `case_number UNIQUE` constraint caused failures on re-upload.
**Fix:** Parse engine now generates a real UUID for Supabase PK separately
from the short `investigation_id` shown in the UI. Supabase is now written
via HTTP Request with `Prefer: resolution=merge-duplicates` (upsert).

### 6. RLS blocking n8n writes
**Cause:** Old policies only allowed `authenticated` users. n8n uses the
`service_role` key which is a different role.
**Fix:** Schema adds explicit `service_role` policies so n8n can always
read/write regardless of auth state.

---

## SETUP STEPS (DO IN ORDER)

### Step 1: Run the fixed schema in Supabase
1. Go to Supabase Dashboard → SQL Editor → New Query
2. Paste contents of `schema-FIXED.sql`
3. Click Run
4. Verify the `investigations` table exists with TEXT columns for json fields

### Step 2: Get your Supabase Service Role Key
1. Supabase Dashboard → Project Settings → API
2. Copy the `service_role` key (secret — NOT the `anon` key)
3. You need this for n8n (it bypasses RLS)

### Step 3: Import the fixed n8n workflow
1. Open n8n → Workflows → Import from File
2. Select `n8n-sentinel-FIXED.json`
3. Set environment variables in n8n:
   - Settings → Environment Variables (or in docker-compose.yml):
   ```
   SUPABASE_URL=https://yourproject.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  (service_role key)
   ```
4. Open the `Gemini 1.5 Pro` node → connect your Gemini credential
   (add API key under Credentials → Google Gemini(PaLM) API)
5. Activate the workflow (toggle ON)
6. Copy the webhook URL: `http://localhost:5678/webhook/forensic`

### Step 4: Fix your frontend — how to send the file

The frontend must parse the xlsx BEFORE sending to n8n, OR send raw FormData.

**RECOMMENDED — Parse xlsx in frontend, send JSON:**
```javascript
import * as XLSX from 'xlsx';

async function uploadCDR(file) {
  // 1. Parse xlsx to JSON in browser
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const records = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  // 2. Send JSON to n8n
  const response = await fetch(`${N8N_WEBHOOK_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'ingest',
      investigation_id: generateShortId(), // or let n8n generate one
      title: file.name,
      filename: file.name,
      records: records   // ← array of row objects
    })
  });

  const data = await response.json();
  // data now contains:
  // data.records_json    → for Raw Records view
  // data.geo_json        → for Map markers
  // data.tower_analysis  → for Tower Analysis view
  // data.imei_mapping    → for IMEI Mapping view
  // data.common_numbers  → for Common Numbers view
  // data.comm_links      → for Relationship Graph
  // data.timeline_json   → for Timeline view
  // data.anomalies       → for anomaly count
  // data.risk_index      → for Risk Index
  return data;
}
```

**For AI Chat:**
```javascript
async function queryAI(investigationId, message) {
  const response = await fetch(`${N8N_WEBHOOK_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'ai-query',
      investigation_id: investigationId,
      message: message
    })
  });
  const data = await response.json();
  return data.response; // Sentinel's answer
}
```

### Step 5: Update docker-compose.yml
```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_CORS_ENABLED=true
      - N8N_CORS_ALLOWED_ORIGINS=*
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - N8N_ENV_VARIABLES_ALLOWLIST=SUPABASE_URL,SUPABASE_SERVICE_KEY,GEMINI_API_KEY
    volumes:
      - n8n_data:/home/node/.n8n
    restart: always
```

And your `.env` file:
```env
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # service_role key
GEMINI_API_KEY=AIzaSy...
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # anon key for frontend
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/forensic
```

---

## HOW THE FIXED FLOW WORKS

```
Frontend uploads xlsx
    → browser parses xlsx → JSON records array
    → POST /webhook/forensic  { action: "ingest", records: [...] }
    
n8n Route Action → INGEST path:
    Parse & Score CDR Records
      • reads records[] from body
      • generates real UUID for Supabase PK
      • parses lat/long from "lat long azimuth" format
      • builds geo_json, tower_analysis, imei_mapping,
        common_numbers, comm_links, timeline_json, anomalies
    ↓
    Save to Supabase (HTTP POST with upsert)
      • uses service_role key → bypasses RLS
      • case_number as unique key → no duplicate errors
    ↓
    Respond Ingest → returns FULL data payload to frontend

Frontend stores response → populates all views immediately
(no second fetch needed — all data is in the ingest response)

---

User types in AI Chat
    → POST /webhook/forensic  { action: "ai-query", investigation_id, message }
    
n8n Route Action → AI QUERY path:
    Fetch Investigation from Supabase (HTTP GET by case_number)
    ↓
    Prepare AI Context (parse all JSON fields, attach user message)
    ↓
    Sentinel AI Agent (Gemini 1.5 Pro)
      • full dataset injected into system prompt
      • answers from real CDR data
    ↓
    Respond AI → { success: true, response: "SENTINEL analysis..." }
```

---

## TESTING THE WORKFLOW

After activating in n8n, test with curl:

```bash
# Test ingest with sample data
curl -X POST http://localhost:5678/webhook/forensic \
  -H "Content-Type: application/json" \
  -d '{
    "action": "ingest",
    "investigation_id": "INV-TEST1",
    "title": "Test CDR",
    "records": [
      {
        "CdrNo": "9876543210",
        "B Party": "9123456789",
        "Date": "2025-05-10",
        "Time": "02:30:00",
        "Duration": "720",
        "Call Type": "OUTGOING",
        "First Cell ID": "T-102",
        "First Cell ID Address": "Nagpur Tower",
        "Lat-Long-Azimuth (First CellID)": "21.1458 79.0882 120",
        "IMEI": "358240051111110"
      }
    ]
  }'

# Test AI chat
curl -X POST http://localhost:5678/webhook/forensic \
  -H "Content-Type: application/json" \
  -d '{
    "action": "ai-query",
    "investigation_id": "INV-TEST1",
    "message": "Give me a summary of this investigation"
  }'
```

# CYBER-CDR: Direct Intelligence Analysis Platform

A streamlined, enterprise-grade CDR analysis platform utilizing a serverless Supabase backend and a direct-to-n8n automation pipeline.

## 🏗️ Architecture

- **Frontend**: Next.js 14 + Tailwind CSS (Cybersecurity UI)
- **Database/Auth**: Supabase (Remote)
- **Automation Engine**: External n8n instance (Direct Webhook)

### Workflow Flow
`Frontend (Upload)` → `External n8n (http://localhost:5678)` → `Supabase (REST API)` → `Frontend (Visualization)`

## 🚀 Quick Start

### 1. External n8n Setup
Ensure your local n8n instance is running at `http://localhost:5678`.
1. Open n8n.
2. Import the workflow from `n8n/n8n-workflow.json`.
3. Set your Supabase environment variables in n8n (or as environment variables for the n8n process).

### 2. Frontend Setup
1. Create a `.env` file in the root (use `.env.example` as a template).
2. Configure your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_N8N_WEBHOOK_URL=http://localhost:5678/webhook/upload-cdr
   ```

### 3. Docker Deployment
The Docker setup now only manages the frontend for maximum agility.
```bash
docker-compose up --build
```

## 📂 Features

- **Direct Webhook Ingestion**: Files are streamed directly to n8n for high-speed processing.
- **Automated Intelligence**: Suspicious pattern detection (repeated contacts, long duration) handled via the n8n Code Node.
- **Futuristic Visualization**: Interactive ECharts and Mapbox integration for relationship and geo-mapping.
- **Enterprise Security**: Supabase Auth with RLS (Row Level Security).

---
**Developed for Professional Cyber Intelligence.**

# Cyber-CDR Intelligence Fusion Center: Platform Documentation

## Overview
The **Cyber-CDR Intelligence Fusion Center** is a high-performance forensic investigation platform designed for telecommunications data reconstruction and intelligence gathering. It enables investigators to ingest, analyze, and visualize complex Call Detail Records (CDR) and IP Detail Records (IPDR) through a unified, real-time interface.

---

## Technical Architecture

### 1. Frontend: The Operational Terminal
- **Framework**: React 19 + Vite 6
- **Styling**: Tailwind CSS for a premium "Cyber-Grid" aesthetic.
- **Animations**: Framer Motion for smooth transitions and interactive micro-animations.
- **Visualization Engines**:
  - **Cytoscape.js**: Powers the **Relationship Graph**, mapping links between communication nodes.
  - **React-Leaflet**: Powers **Geo Intelligence**, mapping cell tower locations and suspect movement patterns.
- **State & Routing**: React Router 7 for client-side navigation.

### 3. AI Intelligence: The Brain
- **Google Gemini 1.5 Pro/Flash**: Powers the analytical reasoning. Pro is used for complex forensic reports, while Flash handles real-time chat queries.
- **Agentic Workflow**: Utilizing n8n's AI Agent (LangChain) for tool-use and autonomous reasoning over datasets.

---

## Core Operational Modules

### A. Intelligence Fusion Dashboard (`/`)
The command center providing a high-level overview of global operations.
- **Live Sync Stats**: Real-time counters for Total Investigations, Active Forensics, and High-Risk Threats.
- **Intelligence Feed**: A searchable list of recent cases with status indicators.

### B. Forensic Ingestion Lab (`/upload`)
The entry point for new forensic data.
- **Reconstruction Engine**: Supports `.xlsx` and `.csv` CDR/IPDR files.
- **Zero-Touch Automation**: Uploading a file triggers an automatic ingestion pipeline that parses, scores, and visualizes data without manual triggers.

### C. Investigation Workspace (`/workspace/:id`)
A multi-modal environment for deep-dive analysis.
- **Overview View**: Combines geo-distribution maps, communication link graphs, and risk scoring.
- **Raw Records**: A high-performance table view for auditing individual communication events.
- **Geo Intelligence**: Full-screen interactive map for spatial analysis of tower hits.
- **Relationship Graph**: Interactive network topology showing how entities (MSISDNs, IMEIs) are connected.
- **AI Insights & Sentinel Chat**: A specialized interface for querying the dataset using natural language (AI Agent-driven).

### D. Sentinel AI Assistant
The platform features an integrated AI co-pilot upgraded to an **AI Agentic** model.
- **Natural Language Querying**: Ask "Show me all tower hits for suspect A near tower T-102."
- **Autonomous Tool Use**: The agent can look up database records, analyze tower patterns, and check IMEI conflicts autonomously.
- **Automated Summarization**: Automatically generates executive summaries and risk profiles.

---

## Data Flow & Functional Actions

1. **Ingestion**: Investigator uploads a CDR file via the **Forensic Ingestion Lab**.
2. **Processing**: Sent to the **Unified Webhook (`/forensic?action=ingest`)**. n8n parses records and calculates risk.
3. **Persistence**: n8n writes structured data into **JSONB columns** in Supabase for high-speed retrieval.
4. **Visualization**: The **Investigation Workspace** fetches data directly from the optimized JSONB fields.
5. **Intelligence Gathering**: Investigators interact with the **AI Agent** which uses tools to query the dataset.

---

## Key Features & Interactions
- **Premium Cyber-Grid Aesthetics**: High-performance UI with neon accents, dark mode, and glassmorphic layers.
- **High-Speed Rendering**: Optimized to handle 10,000+ communication records via JSONB storage.
- **Real-time Synchronization**: Instant updates from the backend processing engine.

---

> [!IMPORTANT]
> This platform requires the **n8n engine** to be active. Ensure the `GEMINI_API_KEY` is set in the environment to enable the Sentinel AI Agent.

## Infrastructure Requirements

### 1. Environment Variables (.env)
Add these keys to your project root `.env` file:
```env
GEMINI_API_KEY=AIzaSy...             # Your Google Gemini API key
NEXT_PUBLIC_SUPABASE_URL=https://...  # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...     # Your Supabase anon key
```

### 2. Database Schema (JSONB Optimized)
Ensure the `investigations` table has these high-performance columns:
- `records_json`: Full forensic record set in JSON format.
- `timeline_json`: Optimized event sequence for map playback.
- `geo_json`: Compressed coordinate data for spatial analysis.
- `ai_context`: Distilled intelligence for Agent consumption.
- `chat_memory`: Conversation state for the AI Agent.

## Unified Webhook Endpoint

| Endpoint | Method | Action Parameter | Purpose |
|---|---|---|---|
| `/forensic` | POST | `action=ingest` | Process CDR/IPDR file |
| `/forensic` | POST | `action=ai-query` | Chat with Sentinel AI Agent |
| `/forensic` | POST | `action=report` | Generate forensic report |

---

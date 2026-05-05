# CTI Dashboard

A Cyber Threat Intelligence platform that aggregates, searches, and analyzes threat data from multiple open-source feeds, with an AI-powered assistant backed by local inference.

## Stack

- **Frontend** - React + Vite + Ant Design
- **Backend** - FastAPI (Python)
- **Database** - Elasticsearch 8.13
- **AI** - Ollama (dolphin-llama3, local inference, uncensored)

## Features

- Intelligence search across all ingested CTI data
- Investigation board (drag-and-drop node graph)
- Timeline view of events
- Data ingestion from multiple threat feeds (OTX, VirusTotal, URLhaus, ThreatFox, MalwareBazaar, CISA KEV, NVD, CERT-FR, Feodo Tracker)
- AI chat assistant (CyberMind) with RAG
- Multi-conversation management with CLI-style commands (`/new`, `/ls`, `/select`, `/rename`, `/rm`)

## Setup

### 1. Clone

```bash
git clone https://github.com/MateoBusalli/CTI-Dashboard.git
cd CTI-Dashboard
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your API keys (keys can also be entered directly in the UI).

### 3. Start

```bash
docker compose up -d
```

On first boot:
- Elasticsearch initializes
- Ollama starts and automatically pulls `dolphin-llama3` (~4Gb once, then cached locally)
- The backend waits for both before starting
- The frontend is served at `http://localhost:5173`

## Ports

| Service       | Default |
|---------------|---------|
| Frontend      | 5173    |
| Backend API   | 8000    |
| Elasticsearch | 9200    |
| Ollama        | 11434   |

Override any port in `.env`.

## API keys

| Key               | Source                                 | Required |
|-------------------|----------------------------------------|----------|
| `OTX_API_KEY`     | https://otx.alienvault.com             | Optional |
| `VT_API_KEY`      | https://www.virustotal.com             | Optional |
| `ABUSE_CH_API_KEY`| https://abuse.ch                       | Optional |

Keys can be set in `.env` or entered per-request directly in the Data Sources panel.

## AI assistant

The chat assistant runs entirely locally via Ollama. It uses RAG to search Elasticsearch index before answering, so responses are grounded in the actual CTI data.

Available commands in the chat:

```
/new [name]         create a new conversation
/ls                 list all conversations
/select [id|name]   switch conversation
/rename [id] [name] rename a conversation
/rm [id ...]        delete one or more conversations (no args = current)
```
